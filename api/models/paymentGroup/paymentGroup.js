/* eslint-disable global-require */
/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
const { logger, fileManager, createXlsx, Tipalti, Wise, CurvePay } = require('@curveroyaltysystems/platform-shared-utils');
const { Exports, WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const moment = require('moment');
const { ObjectId } = require('mongodb');
const appRootDir = require('app-root-dir').get();
const { eachLimit, waterfall, eachSeries } = require('async');
const { PaymentGroup: { name, schema } } = require('@curveroyaltysystems/models');
const config = require('../../config.json');
const modelHistory = require('../../libs/modelHistory');
const curvePaylib = require('../../libs/curvePay');

const Client = require('../client');
const Notification = require('../notification');
const Payment = require('../payment');

const paymentGroupSchema = schema;

paymentGroupSchema.plugin(modelHistory, { mongoose, name: 'paymentGroupPatches' });
paymentGroupSchema.plugin(mongoosePaginate);

paymentGroupSchema.pre('deleteOne', { document: true, query: false }, function (next) {
  const paymentGroup = this;
  Payment.countDocuments({ clientId: paymentGroup.clientId, paymentGroupId: paymentGroup._id.toString(), status: 'Paid' })
    .then((paidPayments) => {
      if (paidPayments) {
        const error = new Error('Could not delete as payments associated with this payment group have already been paid out.');
        error.showToUser = true;
        next(error);
      } else {
        Payment.find({ clientId: paymentGroup.clientId, paymentGroupId: paymentGroup._id.toString() })
          .then((payments) => {
            eachLimit(payments, 5, (payment, cb) => {
              payment.deleteTransactions = true;
              payment.deleteOne()
                .then(() => {
                  cb();
                })
                .catch((err) => {
                  logger.error(err);
                  cb(err);
                });
            }, next);
          })
          .catch((err) => {
            logger.error(err);
            next(err);
          });
      }
    })
    .catch((err) => {
      logger.error(err);
      next(err);
    });
});

// Import Payments
paymentGroupSchema.statics.importFromExcel = async function (paymentGroupId, file, curveUser) {
  const ImportXlsx = require('../../libs/importXlsx');

  const client = await Client.findById(curveUser.clientId);
  // get date format from client settings
  const dateFormat = client.dateFormat ? client.dateFormat.toUpperCase() : '';
  // Notification options
  const generateOptions = { curveUser, client, file: file.originalname };

  const data = await new Promise((resolve, reject) => {
    ImportXlsx.getDataByTemplate(file.path, config.importTemplates.payments, 0, 2, dateFormat, (error, data) => {
      if (error) reject(error);
      else resolve(data);
    });
  }).catch((error) => {
    logger.error(error);
    if (error === 'Template does not match') { error = 'It appears the template does not match'; }
    generateOptions.identifier = 'importError';
    generateOptions.subject = 'Your Payment Import Has Errored';
    generateOptions.error = [error];
    generateOptions.description = `${error} in file ${file.originalname}`;
  });

  if (data) {
    // Import payments
    const [errors, count, importedPayments] = await PaymentGroup.importPayments(paymentGroupId, data, client);
    if (errors && errors.length > 0) {
      // Send errors email
      logger.error(errors);
      generateOptions.identifier = 'importError';
      generateOptions.subject = 'Your Payment Import Has Errored';
      generateOptions.error = errors;
      generateOptions.description = `${errors.length} errors in file ${file.originalname}`;
    } else {
      // Didn't error, save.
      for (const importedPayment of importedPayments) {
        await importedPayment.save();
      }
      // Send success email
      generateOptions.identifier = 'importComplete';
      generateOptions.subject = 'Your Payment Import Has Completed';
      generateOptions.description = `${count} Payments imported in file ${file.originalname}`;
      generateOptions.count = count;
    }
  }

  // Send import notification
  Notification.generate(generateOptions.subject, generateOptions.description, null, curveUser, generateOptions);
};

paymentGroupSchema.statics.importPayments = async function (paymentGroupId, payments, client) {
  if (Object.prototype.toString.call(payments) !== '[object Array]') { throw Error('Data must be an Array'); }
  if (!client?._id) { throw Error('A Client ID must be passed'); }
  let count = 0; const importedPayments = []; const errors = [];
  for (const [index, payment] of payments.entries()) {
    if (isObjectPopulated(payment)) {
      const importedPayment = await PaymentGroup.importPayment(paymentGroupId, payment, client).catch((err) => { errors.push(`Line ${index + 3}: ${err.message}`); });
      if (importedPayment) { count += 1; importedPayments.push(importedPayment); }
    }
  }

  return [errors, count, importedPayments];
};

paymentGroupSchema.statics.importPayment = async function (paymentGroupId, data, client) {
  const Contract = require('../contract');
  const Payee = require('../payee');

  if (!data) { throw Error('Data does not match template'); }
  if (!data.name || data.name === '') { throw Error('Name must be passed'); }
  if (!data.amount || data.amount === '') { throw Error('Amount must be passed'); }
  if (!data.payeeId || data.payeeId === '') { throw Error('Payee must be passed'); }

  let payment;
  if (ObjectId.isValid(data._id)) { payment = await Payment.findOne({ clientId: client._id, _id: new ObjectId(data._id) }); }
  // Reject if payment is already paid
  if (payment?.status === 'Paid') { throw Error('This payment has already been paid and cannot be updated'); }
  // Reject if currency is being updated
  if (payment && payment.currency !== data.currency) { throw Error('Payment currency has been updated, which is not allowed'); }

  if (!payment) { payment = new Payment({ clientId: client._id, paymentGroupId, currency: data.currency }); }

  // Populate payment
  payment.name = data.name;
  payment.amount = data.amount;
  if (data.usRevenuePercentage || data.usRevenuePercentage === 0) { payment.usRevenuePercentage = data.usRevenuePercentage; }

  // Get contract
  if (data.contractId) {
    const contract = await Contract.findOne({ clientId: client._id, name: data.contractId });
    if (!contract) { throw Error(`Could not find contract with the name ${data.contractId}`); } else { payment.contractId = contract._id; }
  }
  // Get payee
  const payee = await Payee.findOne({ clientId: client._id, name: data.payeeId });
  if (!payee) { throw Error(`Could not find payee with the name ${data.payeeId}`); } else { payment.payeeId = payee._id; }
  // Validate payment
  await payment.validate();

  payment.withholdingTaxAmount = data.withholdingTaxAmount || 0;
  payment.withholdingTaxCurrency = data.withholdingTaxCurrency || '';

  return payment;
};

// Export Payments
paymentGroupSchema.statics.sendExport = async function (paymentGroupId, paymentIds, curveUser) {
  const filter = { clientId: curveUser.clientId, paymentGroupId };
  if (paymentIds?.length > 0) { filter._id = { $in: paymentIds }; }
  const count = await Payment.countDocuments(filter);
  // Get client
  const client = await Client.findById(curveUser.clientId);
  // Notification options
  const generateOptions = { curveUser, client };
  waterfall([
    (cb) => {
      // if > 10k, export to CSV
      if (count > 10000) { PaymentGroup.createExportCsv(filter, count, client, cb); } else { PaymentGroup.createExportXlsx(filter, curveUser.clientId, cb); }
    },
    (filePath, cb) => {
      logger.debug('Payments export - Uploading file');
      fileManager.uploadToS3(`exports/${client.name} Payments Export ${moment().format('YYYYMMDDHHmmssSSS')}.${filePath.split('.').pop()}`, filePath, cb);
    },
    (key, cb) => {
      fileManager.publicLink24Hours(key, cb);
    },
    (link, cb) => {
      generateOptions.identifier = 'exportDownload';
      generateOptions.subject = `Your Payments Export for ${client.name} is Ready to Download`;
      generateOptions.description = `Your Payments Export for ${client.name} is Ready to Download`;
      generateOptions.link = link;
      cb();
    },
  ], (err) => {
    if (err) {
      // Return error via email
      generateOptions.identifier = 'exportError';
      generateOptions.subject = `Your Payments Export for ${client.name}  Has Errored`;
      generateOptions.error = err.message;
      generateOptions.description = err.message;
      generateOptions.link = null;
    }

    Notification.generate(generateOptions.identifier === 'exportDownload' ? 'Payments Export Ready' : generateOptions.subject, generateOptions.description, generateOptions.link, curveUser, generateOptions);
  });
};

paymentGroupSchema.statics.createExportXlsx = async function (filter, clientId, callback) {
  const payments = await Payment.find(filter).sort({ date: 1 });
  const data = await PaymentGroup.convertForXlsx(payments);
  const template = await Exports.getTemplate({ Client, templateName: 'payment', clientId });
  createXlsx.createInTemplate(data, template, callback);
};

paymentGroupSchema.statics.convertForXlsx = async function (payments) {
  const Contract = require('../contract');
  const Statement = require('../statement');
  const Payee = require('../payee');

  const data = [];
  await eachLimit(payments, 100, async (payment) => {
    const contract = payment.contractId ? await Contract.findById(payment.contractId) : null;
    const payee = payment.payeeId ? await Payee.findById(payment.payeeId) : null;
    const statement = payment.statementId ? await Statement.findById(payment.statementId) : null;
    let paymentRef = '';
    if (payment.status === 'Paid') {
      switch (payment?.paymentDetails?.provider) {
        case 'Wise':
          paymentRef = payment?.paymentDetails?.uuid;
          break;
        case 'Curve Pay':
          paymentRef = payment?.uuid;
          break;
        case 'Tipalti':
          paymentRef = payment?.paymentDetails?.refCode;
          break;
        case 'Standard CSV':
          paymentRef = payment?.refCode;
          break;
        default:
          paymentRef = '';
      }
    }
    let selfBillingInvoiceNo = '';
    if (payment?.statementId && statement?.selfBillingInvoice) { selfBillingInvoiceNo = statement?.selfBillingInvoiceNo; }
    data.push([
      payment._id.toString(),
      payment.name,
      payment.currency,
      payment.amount,
      payment.usRevenuePercentage,
      contract?.name ? contract.name : '',
      payee?.name ? payee.name : '',
      payee?.supplierCode ? payee.supplierCode : '',
      selfBillingInvoiceNo,
      paymentRef,
      ...(payment?.paymentDetails?.provider === 'Curve Pay' ? [
        payment.paymentDetails.conversionRate,
        payment.paymentDetails.destinationCurrency,
        payment.paymentDetails.destinationAmount,
        payment.paymentDetails.paymentMethod,
        payment.paymentDetails.fees,
      ] : [null, null, null, null, null]),
      payee?.vatNo ?? '',
      statement?.name ?? '',
      payment.withholdingTaxAmount,
      payment.withholdingTaxCurrency,
      payment.createdAt.toISOString(),
      payment.updatedAt.toISOString(),
    ]);
  });

  return [data];
};

paymentGroupSchema.statics.createExportCsv = function (filter, count, client, callback) {
  const limit = 1000;
  const rounds = listFromNumber(Math.floor(count / limit));
  const standardOutput = `${appRootDir}/tmp/${client.name} Payments Export ${moment().format('YYYYMMDDHHmmssSSS')}.csv`;
  const writer = new WriteCsv({
    headers: [
      'ID', 'Name', 'Currency', 'Amount', 'US Revenue Percentage', 'Contract', 'Payee', 'Supplier Code', 'Self Billing Invoice Number', 'Payment Reference', 'Conversion Rate', 'Destination Currency',
      'Destination Amount', 'Payment Method', 'Fees', 'Payee Tax Number', 'Statement Name', 'Withholding Tax Amount', 'Withholding Tax Currency', 'Created At', 'Updated At'],
    outputLocation: standardOutput,
  });
  eachSeries(rounds, (round, loopCb) => {
    waterfall([
      async () => {
        logger.debug(`Payments CSV export - getting round  ${rounds.indexOf(round) + 1} of ${rounds.length} `);
        const payments = await Payment.find(filter).sort({ date: 1 }).limit(limit).skip(round * limit);
        return payments;
      },
      async (payments) => {
        const data = await PaymentGroup.convertForXlsx(payments);
        return data;
      },
      (data, cb) => {
        writer.addData(data[0], (err) => { cb(err, data); });
      },
    ], loopCb);
  }, (err) => {
    if (err) {
      callback(err);
    } else {
      logger.debug('Payments CSV export - writing to file');
      writer.write((err) => { callback(err, standardOutput); });
    }
  });

  function listFromNumber(number) {
    const list = [];
    for (let i = 0; i <= number; i += 1) { list.push(i); }
    return list;
  }
};

// Payments
paymentGroupSchema.methods.pay = async function (payments, curveUser) {
  const paymentGroup = this;
  // Get Client payment provider
  const { paymentProviders } = await Client.findById(paymentGroup.clientId, 'paymentProviders');
  // Proceed to payment based on the provider
  if (paymentProviders?.selectedPaymentProvider === 'Tipalti') {
    await paymentGroup.tipaltiPayment({ payments, payerName: paymentProviders?.tipalti?.payerName, paymentApiKey: paymentProviders?.tipalti?.apiKey, incomeType: paymentProviders?.tipalti?.incomeType, curveUser });
  } else if (paymentProviders?.selectedPaymentProvider === 'Wise') {
    await paymentGroup.wisePayment({
      payments,
      paymentApiKey: paymentProviders?.wise?.apiKey,
      wiseProfileId: paymentProviders?.wise?.profileId,
      autoPayment: paymentProviders?.wise?.autoPayment,
      feesPaidBy: paymentProviders?.wise?.feesPaidBy || 'client',
      curveUser,
    });
  } else if (paymentProviders?.selectedPaymentProvider === 'Curve Pay') {
    await paymentGroup.curvePayPayment({ payments, apiKey: paymentProviders?.curvePay?.apiKey, curveUser });
  } else {
    await paymentGroup.csvPaymentExport(payments, curveUser);
  }

  // Update payment group status
  await paymentGroup.updateStatus();
};

paymentGroupSchema.methods.curvePayPayment = async function ({ payments, apiKey, curveUser }) {
  const paymentGroup = this;
  const client = await Client.findById(paymentGroup.clientId, 'features homeCurrency');
  const generateOptions = { curveUser, client };

  const validPayments = await getValidPayments({ payments, options: { type: 'Curve Pay' }, apiKey });

  const totalPayments = payments.length;
  const invalidPaymentsCount = totalPayments - validPayments.length;

  if (validPayments.length === 0) {
    generateOptions.identifier = 'genericError';
    generateOptions.subject = 'No Valid Payments for Processing';
    generateOptions.description = 'All selected payments are invalid or have errors.';
    Notification.generate(generateOptions.subject, generateOptions.description, null, curveUser, generateOptions);
    return;
  }

  const response = await CurvePay.processBatchOfPayments({ payments: validPayments, apiKey, clientHomeCurrency: client?.homeCurrency });

  if (response.error) {
    generateOptions.identifier = 'genericError';
    generateOptions.closingText = '';
    generateOptions.error = response.details?.errors?.length ? response.details.errors : ['An unknown error occurred while processing payments. Please check your Curve Pay integration.'];
    generateOptions.subject = 'There Was an Issue with Your Payment Run';
    generateOptions.mainText = 'We encountered an issue while processing your payment run.';
    generateOptions.description = 'We encountered an issue while processing your payment run.';
  } else {
    await Promise.all(validPayments.map(async (payment) => {
      payment.error = null;
      payment.curvePayBatchId = response.batchId;
      payment.paymentDetails = {
        provider: 'Curve Pay',
        paymentDate: moment().format(),
        amount: payment.amount,
        currency: payment.currency,
        curvePayBatchId: response.payment_batch_id,
      };
      return payment.save();
    }));

    // All payments submitted
    generateOptions.identifier = 'genericComplete';
    generateOptions.subject = 'Your Payment Run Has Been Submitted';
    generateOptions.mainText = 'Your payment run has been successfully submitted and is now being processed.';
    generateOptions.description = 'Your payment run has been successfully submitted and is now being processed.';
  }

  if (invalidPaymentsCount > 0) {
    generateOptions.description += ` ${invalidPaymentsCount} payments were invalid and not processed.`;
  }

  Notification.generate(generateOptions.subject, generateOptions.description, null, curveUser, generateOptions);
};

paymentGroupSchema.methods.wisePayment = async function ({ payments, paymentApiKey, wiseProfileId, autoPayment, curveUser, feesPaidBy }) {
  const paymentGroup = this;
  // Get client's home currency
  const { homeCurrency } = await Client.findById(paymentGroup.clientId, 'homeCurrency');
  // Get list of valid payments.
  const options = { type: 'Wise', wiseProfileId, sourceCurrency: homeCurrency };
  const validPayments = await getValidPayments({ payments, options, apiKey: paymentApiKey, feesPaidBy });
  // Store total payments and total paid for the notfiication later on
  const originalPaymentsTotal = payments.length;
  let successfulPayments = 0;

  // Send batch of payments to Wise
  if (validPayments.length > 0) {
    const wisePayments = await Wise.processBatchOfPayments({ payments: validPayments, apiKey: paymentApiKey, autoPayment });
    // Update Payments statuses
    await eachLimit(wisePayments, 10, async (wisePayment) => {
      const payment = await Payment.findById(wisePayment._id);
      // When the payment has errored
      if (wisePayment.error) {
        logger.error(`Wise Payment ${payment._id} Errored: ${wisePayment.error}`);
        payment.error = wisePayment.error;
        if (wisePayment.fullError?.response?.errors) {
          const fullErrorMessages = wisePayment.fullError?.response?.errors.map((error) => error.message);
          payment.error = `${wisePayment.error} ${fullErrorMessages.join(' ')}`;
        }
        if (!payment.errorLogs) { payment.errorLogs = []; }
        payment.errorLogs.push(wisePayment.fullError);
      } else {
        // When the payment has been successfull
        logger.info(`Wise Payment ${payment._id} Successful`);
        // Clear any previous payment errors
        payment.error = null;
        const paymentDetails = { provider: 'Wise', paymentDate: moment().format(), uuid: payment.uuid, amount: payment.amount, currency: payment.currency, wiseTransferId: wisePayment.transferId };
        payment.paymentDetails = paymentDetails;
        successfulPayments += 1;
      }
      // Save payment
      await payment.save().catch(logger.error);
    });
  }

  // Notify the user
  logger.info(`Wise Payment: ${paymentGroup._id.toString()}: ${successfulPayments}/${originalPaymentsTotal} paid successfully`);
  const client = await Client.findById(paymentGroup.clientId);
  // Notification object
  const generateOptions = { curveUser, client };

  if (successfulPayments === originalPaymentsTotal) {
    // All payments paid
    generateOptions.identifier = 'genericComplete';
    generateOptions.subject = 'Payments Made Successfully';
    generateOptions.mainText = 'All payments successfully processed';
    generateOptions.description = 'All payments successfully processed';
  } else {
    // Get all payments matching filter to check why they errored
    const paymentIds = payments.map((payment) => payment._id);
    const erroredPayments = await Payment.find({ _id: { $in: paymentIds } });
    const errors = [];
    erroredPayments.forEach((payment) => {
      if (payment.status === 'Payment Error') {
        errors.push(`${payment.name}: ${payment.error || 'Error processing the payment'}`);
      } else if (payment.status === 'Missing Info') {
        errors.push(`${payment.name}: ${payment?.missingInfoReason || 'Missing payee info.'}`);
      }
    });

    if (successfulPayments === 0) {
      generateOptions.identifier = 'genericError';
      generateOptions.subject = 'Your Payments have errored';
      generateOptions.error = errors;
      generateOptions.mainText = 'All payments errored in processing. Please check Wise integration and Payee statuses before trying again.';
      generateOptions.description = 'All payments errored in processing. Please check Wise integration and Payee statuses before trying again.';
    } else {
      // Some paid but not the others
      generateOptions.identifier = 'genericError';
      generateOptions.subject = 'Payments partially successful';
      generateOptions.error = errors;
      generateOptions.mainText = 'Payments partially successful. Please check payment statuses for updates';
      generateOptions.description = 'Payments partially successful. Please check payment statuses for updates';
    }
  }
  // // Send notification to the user
  Notification.generate(generateOptions.subject, generateOptions.description, null, curveUser, generateOptions);
};

paymentGroupSchema.methods.tipaltiPayment = async function ({ payments, payerName, paymentApiKey, curveUser, incomeType = 'OtherIncome' }) {
  const paymentGroup = this;
  // Get list of valid payments.
  const options = { type: 'Tipalti' };
  const validPayments = await getValidPayments({ payments, options, incomeType, payerName, apiKey: paymentApiKey });
  // Store total payments and total paid for the notfiication later on
  const originalPaymentsTotal = payments.length;
  let successfulPayments = 0;

  // Send batch of payments to Tipalti
  if (validPayments.length > 0) {
    const tipaltiPayments = await Tipalti.processBatchOfPayments(paymentGroup.name, validPayments, payerName, paymentApiKey);
    // Update Payments statuses
    await eachLimit(tipaltiPayments, 10, async (tipaltiPayment) => {
      const payment = await Payment.findById(tipaltiPayment?.TipaltiPaymentOrderItem?.paymentId);
      // When the payment has errored
      if (tipaltiPayment?.status === 'Error') {
        // Clear any previous payment errors
        payment.error = null;
        logger.error(`Tipalti Payment ${payment._id} Errored: ${tipaltiPayment?.reason}`);
        payment.error = tipaltiPayment?.reason;
      } else if (tipaltiPayment?.status === 'OK' || tipaltiPayment?.paymentOrderStatus === 'Submitted') {
        // When the payment has been successfull
        logger.info(`Tipalti Payment ${payment._id} Successful`);
        // Clear any previous payment errors
        payment.error = null;
        const paymentDetails = { provider: 'Tipalti', paymentDate: moment().format(), tipaltiPayeeId: tipaltiPayment?.TipaltiPaymentOrderItem?.Idap, refCode: payment.refCode, amount: payment.amount, currency: payment.currency };
        payment.paymentDetails = paymentDetails;
        payment.paidAdditionalInfo = 'Payments submitted to Tipalti may require a manual approval';
        successfulPayments += 1;
      } else {
        // When an unknow Tipalti status is returned
        logger.info(`Tipalti Payment ${payment._id}: Unknown status '${tipaltiPayment?.status}': ${tipaltiPayment?.message}`);
      }
      // Save payment
      await payment.save().catch(logger.error);
    });
  }

  // Notify the user
  logger.info(`Tipalti Payment: ${paymentGroup._id.toString()}: ${successfulPayments}/${originalPaymentsTotal} paid successfully`);
  const client = await Client.findById(paymentGroup.clientId);
  // Notification object
  const generateOptions = { curveUser, client };

  if (successfulPayments === originalPaymentsTotal) {
    // All payments paid
    generateOptions.identifier = 'genericComplete';
    generateOptions.subject = 'Payments Made Successfully';
    generateOptions.mainText = 'All payments successfully processed';
    generateOptions.description = 'All payments successfully processed';
  } else {
    // Get all payments matching filter to check why they errored
    const paymentIds = payments.map((payment) => payment._id);
    const erroredPayments = await Payment.find({ _id: { $in: paymentIds } });
    const errors = [];
    erroredPayments.forEach((payment) => {
      if (payment.status === 'Payment Error') {
        errors.push(`${payment.name}: ${payment.error || 'Error processing the payment'}`);
      } else if (payment.status === 'Missing Info') {
        errors.push(`${payment.name}: ${payment?.missingInfoReason?.replaceAll('</br>', ' ') || 'Missing payee info.'}`);
      }
    });

    if (successfulPayments === 0) {
      generateOptions.identifier = 'genericError';
      generateOptions.subject = 'Your Payments have errored';
      generateOptions.error = errors;
      generateOptions.mainText = 'All payments errored in processing. Please check Tipalti integration and Payee statuses before trying again.';
      generateOptions.description = 'All payments errored in processing. Please check Tipalti integration and Payee statuses before trying again.';
    } else {
      // Some paid but not the others
      generateOptions.identifier = 'genericError';
      generateOptions.subject = 'Payments partially successful';
      generateOptions.error = errors;
      generateOptions.mainText = 'Payments partially successful. Please check payment statuses for updates';
      generateOptions.description = 'Payments partially successful. Please check payment statuses for updates';
    }
  }
  // Send notification to the user
  Notification.generate(generateOptions.subject, generateOptions.description, null, curveUser, generateOptions);
};

const getValidPayments = async ({ payments, options, payerName, apiKey, feesPaidBy, incomeType }) => {
  const Payee = require('../payee');

  const validPayments = [];
  let usedRefCodes = [];

  if (options.type === 'Tipalti') {
    // Check if the refCodes have already been used in Tipalti
    const refCodes = payments.map((payment) => payment.refCode).filter(Boolean);
    const tipaltiPaymentDetails = await Tipalti.getExtendedPaymentDetails({ payerName, apiKey, refCodes });
    const tipaltiRefCodesResponse = tipaltiPaymentDetails?.['soap:Envelope']?.['soap:Body']?.[0]?.GetExtendedPODetailsListResponse?.[0]?.GetExtendedPODetailsListResult?.[0]?.PaymentOrders?.[0]?.TipaltiExtendedPaymentOrderResponse;
    usedRefCodes = tipaltiRefCodesResponse?.map((payment) => (payment.Properties[0].KeyValuePair.find((element) => (element.Key[0] === 'RefCode'))?.Value?.[0]));
    usedRefCodes = usedRefCodes || [];
  }

  await eachLimit(payments, 10, async (payment) => {
    const payee = await Payee.findById(payment.payeeId);
    const { payable, reason } = await payee.isPayeePayable(payment.amount);
    // Skip this payment if the payee isn't payable.
    if (!payable) {
      // Remove any previous errors
      payment.error = null;
      // If the status or reason don't match what we have, update the payment.
      if (payment.status !== 'Missing Info' || payment.missingInfoReason !== reason) {
        payment.status = 'Missing Info';
        payment.missingInfoReason = reason;
      }
      // Update the payment.
      await payment.save().catch(logger.error);
      logger.error(`Skipping Payment ${payment._id} as its Payee isn't payable`);
      return;
    }

    if (options.type === 'Tipalti') {
      // Convert payments for Tipalti
      // Make sure the payment has a refCode
      if (!payment.refCode) {
        await payment.getUniqueRefCode();
        await payment.save().catch(logger.error);
      }
      // If refCode has already been used, error the payment
      if (usedRefCodes.includes(payment.refCode)) {
        logger.error(`Skipping Payment ${payment._id} as its refCode ${payment.refCode} has already been used in Tipalti`);
        payment.status = 'Payment Error';
        payment.error = 'The refCode has already been used with another Payment';
        await payment.save().catch(logger.error);
        return;
      }
      // eslint-disable-next-line max-len
      const tipaltiPayment = { TipaltiPaymentOrderItem: { RefCode: payment.refCode, paymentId: payment._id.toString(), Idap: payee.paymentProviders?.tipalti?.payeeId || payee._id.toString(), Amount: payment.amount, UsSource: payment.usRevenuePercentage, IgnoreThresholds: true, Currency: payment.currency } };
      if (incomeType) { tipaltiPayment.TipaltiPaymentOrderItem.IncomeType = incomeType.replaceAll('&', '&amp;'); }
      // add payment to the list of valid payments
      validPayments.push(tipaltiPayment);
    } else if (options.type === 'Wise') {
      // Make sure the payment has a transaction uuid
      if (!payment.uuid) {
        await payment.getUniqueUuid();
        await payment.save().catch(logger.error);
      }

      if (!payee.paymentProviders?.wise?.recipientId) {
        logger.error(`Skipping Payment ${payment._id} as its Payee isn't linked to a Wise Payee`);
        return;
      }
      // Make sure payment and Wise payee have the same currency
      const { recipientId } = payee.paymentProviders.wise;
      const recipient = await Wise.getSingleRecipient(recipientId, apiKey);
      if (!recipient?.currency) {
        logger.error(`Skipping Payment ${payment._id} as its Payee doesn't have a currency`);
        return;
      }
      const { currency } = recipient;
      if (currency !== payment.currency) {
        logger.info(`Converting Payment ${payment._id} from ${payment.currency} to ${currency}`);
        const [exchangeRate] = await Wise.getRate({ source: payment.currency, target: currency, apiKey });
        if (!exchangeRate?.rate) {
          logger.error(`Skipping Payment ${payment._id} as we couldn't get the rate`);
          return;
        }
        payment.name += `: ${payment.amount} ${payment.currency} @ ${exchangeRate.rate}`;
        payment.amount *= exchangeRate.rate;
        payment.currency = currency;
        payment.exchanged = true;

        await payment.save().catch(logger.error);
      }

      // Convert payments for Wise
      const wisePayment = {
        _id: payment._id,
        uuid: payment.uuid,
        profile: options.wiseProfileId,
        sourceCurrency: options.sourceCurrency,
        targetCurrency: payment.currency,
        targetAmount: payment.amount,
        feesPaidBy,
        accountHolderName: payee.name,
        recipientId,
      };
      // add payment to the list of valid payments
      validPayments.push(wisePayment);
    } else if (options.type === 'Curve Pay') {
      // **Curve Pay validation**
      if (!payment.uuid || payment.status === 'Payment Error') {
        await payment.getUniqueUuid();
        payment.errorLogs = payment.errorLogs || [];
        payment.errorLogs.push(`Payment was in error state, generating new UUID: ${payment.uuid}`);
        await payment.save().catch(logger.error);
      }
      validPayments.push(payment);
    }
  });

  // Return the list of valid payments
  return validPayments;
};

paymentGroupSchema.methods.csvPaymentExport = async function (payments, curveUser) {
  const Payee = require('../payee');

  const paymentGroup = this;
  const csvData = [];
  // Get client
  const client = await Client.findById(paymentGroup.clientId, 'name');
  for (const payment of payments) {
    // Remove any payment errors
    payment.error = null;
    // Get the payee
    const payee = await Payee.findById(payment.payeeId);
    // Skip if no payment details
    if (!payee || (!(payee.accountNo && payee.sortCode) && !payee.iban)) {
      logger.error(`Skipping Payment ${payment._id} as its Payee has no payment details`);
      // Save as missing details by removing any errors against it
      await payment.save().catch(logger.error);
      continue;
    }
    // Set the payment details
    const paymentDetails = { provider: 'Standard CSV', paymentDate: moment().format(), name: payee.name, amount: payment.amount, currency: payment.currency };
    if (payee.accountNo && payee.sortCode) {
      paymentDetails.accountNo = payee.accountNo;
      paymentDetails.sortCode = payee.sortCode;
    } else {
      paymentDetails.iban = payee.iban;
    }
    // Save details/date against payment
    payment.paymentDetails = paymentDetails;
    // Save payment
    await payment.save()
      .then(() => {
        csvData.push([payee.name, payee.paymentEmail, payee.bankName, payee.accountNo, payee.sortCode, payee.iban, payee.swiftCode, payee.supplierCode, payment.currency, payment.amount]);
      })
      .catch(logger.error);
  }
  // Notification object
  const generateOptions = { curveUser, client };
  // Create CSV if payments have been made
  if (csvData.length > 0) {
    const outputLocation = `${appRootDir}/tmp/${client.name} Payments Export ${moment().format('YYYYMMDDHHmmssSSS')}.csv`;
    const headers = ['Payee Name', 'Payment Email', 'Bank Name', 'Account No', 'Sort Code', 'IBAN', 'Swift Code', 'Supplier Code', 'Currency', 'Amount'];
    const writer = new WriteCsv({ headers, outputLocation });
    // Add data to csv
    await new Promise((resolve, reject) => { writer.addData(csvData, (err) => { if (err) { reject(err); } else { resolve(); } }); });
    // Write csv
    await new Promise((resolve, reject) => { writer.write((err) => { if (err) { reject(err); } else { resolve(); } }); });
    // Upload file to S3
    const s3Key = await new Promise((resolve, reject) => { fileManager.uploadToS3(`exports/${client.name} Payments Export ${moment().format('YYYYMMDDHHmmssSSS')}.csv`, outputLocation, (err, key) => { if (err) { reject(err); } else { resolve(key); } }); });
    // Get public link
    const publicLink = await new Promise((resolve, reject) => { fileManager.publicLink24Hours(s3Key, (err, link) => { if (err) { reject(err); } else { resolve(link); } }); });
    generateOptions.identifier = 'exportDownload';
    generateOptions.subject = `Your Payments Export for ${client.name} is Ready to Download`;
    generateOptions.description = `Your Payments Export for ${client.name} is Ready to Download`;
    generateOptions.link = publicLink;
  } else {
    // Return an error if no payment has been made
    generateOptions.identifier = 'exportError';
    generateOptions.subject = `Your Payments Export for ${client.name}  Has Errored`;
    generateOptions.error = 'No Payments have been made';
    generateOptions.description = 'Please verify that no payments have missing info or have been paid out already';
    generateOptions.link = null;
  }
  // Send notification to the user
  Notification.generate(generateOptions.identifier === 'exportDownload' ? 'Payments Export Ready' : generateOptions.subject, generateOptions.description, generateOptions.link, curveUser, generateOptions);
};

paymentGroupSchema.methods.getPayerBalance = async function () {
  const paymentGroup = this;
  // Get balance
  const { paymentProviders, homeCurrency } = await Client.findById(paymentGroup.clientId, 'paymentProviders homeCurrency');
  // Get the balance for Tipalti
  if (paymentProviders?.selectedPaymentProvider === 'Tipalti') {
    const { balance, currency } = await Tipalti.getPayerBalance(paymentProviders?.tipalti?.payerName, paymentProviders?.tipalti?.apiKey);
    logger.debug(`Returned balance for payment group ${paymentGroup._id.toString()}: ${balance} ${currency}`);
    return { balance, currency };
  }

  if (paymentProviders?.selectedPaymentProvider === 'Wise') {
    const { balance, currency } = await Wise.getPayerBalance(paymentProviders?.wise?.profileId, paymentProviders?.wise?.apiKey, homeCurrency);
    logger.debug(`Returned balance for payment group ${paymentGroup._id.toString()}: ${balance} ${currency}`);
    return { balance, currency };
  }

  // Throw an error if the client's payment provider doesn't support getting the balance
  const error = new Error('The selected payment provider doesn\'t support this feature');
  error.showToUser = true;
  error.status = 404;
  throw error;
};

paymentGroupSchema.methods.updateStatus = async function () {
  const paymentGroup = this;
  const payments = await Payment.find({ clientId: paymentGroup.clientId, paymentGroupId: paymentGroup._id.toString() });
  let paidPayments = 0;
  // Get total Paid payments
  payments.forEach((payment) => { if (payment.status === 'Paid') { paidPayments += 1; } });
  if (paidPayments === 0) {
    paymentGroup.status = 'Unpaid';
  } else if (paidPayments === payments.length) {
    paymentGroup.status = 'Fully Paid';
  } else {
    paymentGroup.status = 'Partially Paid';
  }

  await paymentGroup.save().catch(logger.error);
};

function isObjectPopulated(obj) {
  let objectPopulated = false;
  for (const key in obj) {
    if (obj[key] && obj[key] !== '') objectPopulated = true;
  }
  return objectPopulated;
}

const PaymentGroup = mongoose.model(name, paymentGroupSchema);

module.exports = PaymentGroup;
