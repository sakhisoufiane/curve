/* eslint-disable consistent-return */
/* eslint-disable max-len */
/* eslint-disable no-await-in-loop */
// Live URLs
// const iframeUrl = 'https://ui2.tipalti.com/payeedashboard/home?';
// const payeeApiUrl = 'https://api.tipalti.com/v9/payeefunctions.asmx';
// const payerApiUrl = 'https://api.tipalti.com/v9/payerfunctions.asmx';
// const ipnApiUrl = https://console.tipalti.com/notif/ipn.aspx;
// Sandbox URLs
// const iframeUrl = 'https://ui2.sandbox.tipalti.com/payeedashboard/home?';
// const payeeApiUrl = 'https://api.sandbox.tipalti.com/v9/payeefunctions.asmx';
// const payerApiUrl = 'https://api.sandbox.tipalti.com/v9/payerfunctions.asmx';
// const ipnApiUrl = https://console.sandbox.tipalti.com/notif/ipn.aspx;
const Tipalti = this;
const moment = require('moment');
const crypto = require('crypto');
const xml2js = require('xml2js');
const axios = require('axios');
const Soap = require('./soap');
const logger = require('../logger');

const parser = new xml2js.Parser();

const iframeUrl = process.env.tipaltiIframeUrl || 'https://ui2.sandbox.tipalti.com/payeedashboard/home?';
const payeeApiUrl = process.env.tipaltiPayeeUrl || 'https://api.sandbox.tipalti.com/v11/payeefunctions.asmx';
const payerApiUrl = process.env.tipaltiPayerUrl || 'https://api.sandbox.tipalti.com/v11/payerfunctions.asmx';
const ipnApiUrl = process.env.tipaltiIpnUrl || 'https://console.sandbox.tipalti.com/notif/ipn.aspx';

Tipalti.getIframeAuthentication = (payee, payerName, apiKey) => {
  // Tipalti documentation:  https://support.tipalti.com/Content/Topics/Development/iFrames/IframeAuthentication.htm
  // Construct query
  const query = `payer=${encodeURIComponent(payerName)}&idap=${payee.paymentProviders?.tipalti?.payeeId || payee._id.toString()}&ts=${moment().format('X')}`;
  // Construct the authentication url
  const authentication = `${iframeUrl}${query}&hashkey=${createHashedKey(query, apiKey)}`;

  return authentication;
};

Tipalti.getPayeePayableStatus = async (payee, payerName, apiKey, paymentAmount) => {
  // Tipalti documentation:  https://support.tipalti.com/Content/Topics/Development/APIs/PayeeAPI/GetPayeeDetails/PayeePayable/Intro.htm
  // Default amount to 1000 if not passed to the function.
  const amount = paymentAmount || 1000;
  // Make the request to Tipalti
  const timestamp = moment().format('X');
  const key = createHashedKey(`${payerName}${payee.tipaltiPayeeId || payee._id.toString()}${timestamp}${amount}`, apiKey);
  const endpoint = { name: 'PayeePayable' };
  const body = { payerName, idap: payee.tipaltiPayeeId, timestamp, key, amount };
  const response = await Soap.send(payeeApiUrl, endpoint, body);
  // If no response return error ans set payable to false
  if (!response?.data) { return { payable: false, reason: 'Failed to retrieve the payee\'s payable status from Tipalti. Please try again or contact support' }; }
  // Parse response from tipalti
  logger.debug(response.data);
  const parsedResponse = await parser.parseStringPromise(response.data);
  const payable = parsedResponse?.['soap:Envelope']?.['soap:Body']?.[0]?.PayeePayableResponse?.[0]?.PayeePayableResult?.[0]?.b?.[0] === 'true';
  const reason = payeePayableHumanReadableReason(parsedResponse?.['soap:Envelope']?.['soap:Body']?.[0]?.PayeePayableResponse?.[0]?.PayeePayableResult?.[0]?.s?.[0]);

  return { payable, reason };
};

Tipalti.processBatchOfPayments = async (paymentGroupTitle, payments, payerName, apiKey) => {
  // Tipalti documentation: https://support.tipalti.com/Content/Topics/Development/APIs/PayerAPI/PaymentsAndFees/ProcessPayments/Intro.htm
  // Create payment batches based on Tipalti's limit
  const batches = createPaymentBatches(payments);
  // Make the request to Tipalti
  const timeStamp = moment().format('X');
  const key = createHashedKey(`${payerName}${timeStamp}${paymentGroupTitle}`, apiKey);
  const endpoint = { name: 'ProcessPayments' };
  // Process each batch individually
  for (const tipaltiPaymentsOrders of batches) {
    const body = { payerName, paymentGroupTitle, tipaltiPaymentsOrders, timeStamp, key };
    const response = await Soap.send(payerApiUrl, endpoint, body);
    await updatePaymentsStatus(tipaltiPaymentsOrders, response.data);
  }
  // Merge all batches into one array
  const TipaltiPayments = batches.reduce((flatten, arr) => [...flatten, ...arr]);
  return TipaltiPayments;
};

Tipalti.getPayerBalance = async (payerName, apiKey) => {
  // https://support.tipalti.com/Content/Topics/Development/APIs/PayerAPI/ProviderAccounts/GetBalances/Intro.htm
  const timestamp = moment().format('X');
  const key = createHashedKey(`${payerName}${timestamp}`, apiKey);
  const endpoint = { name: 'GetBalances' };
  const body = { payerName, timestamp, key };
  // Make the request to Tipalti
  const response = await Soap.send(payerApiUrl, endpoint, body);
  logger.debug(response.data);
  const parsedResponse = await parser.parseStringPromise(response.data);
  const balance = parsedResponse?.['soap:Envelope']?.['soap:Body']?.[0]?.GetBalancesResponse?.[0]?.GetBalancesResult?.[0]?.AccountInfos?.[0]?.TipaltiAccountInfo?.[0]?.Balance?.[0];
  const currency = parsedResponse?.['soap:Envelope']?.['soap:Body']?.[0]?.GetBalancesResponse?.[0]?.GetBalancesResult?.[0]?.AccountInfos?.[0]?.TipaltiAccountInfo?.[0]?.Currency?.[0];
  return { balance, currency };
};

Tipalti.acknowledgeIPN = async (request) => {
  // https://support.tipalti.com/Content/Topics/Development/IPNs/IpnProtocol.htm#ReadIPNContent
  const form = new URLSearchParams(request).toString();
  const config = { headers: { ContentType: 'application/x-www-form-urlencoded', ContentLength: form.length } };
  const response = await axios.post(ipnApiUrl, form, config).catch(logger.error);
  return response.data === 'VERIFIED';
};

Tipalti.getPaymentStatuses = async ({ payerName, apiKey, changedSince }) => {
  // https://support.tipalti.com/Content/Topics/Development/APIs/PayerAPI/PaymentsAndFees/GetUpdatedPayments/Intro.htm
  const timestamp = moment().format('X');
  const key = createHashedKey(`${payerName}${timestamp}`, apiKey);
  const endpoint = { name: 'GetUpdatedPayments' };
  const body = { payerName, timestamp, key, changedSince };
  // Make the request to Tipalti
  const response = await Soap.send(payerApiUrl, endpoint, body);
  logger.debug(response.data);
  const parsedResponse = await parser.parseStringPromise(response.data);
  const refCodes = parsedResponse?.['soap:Envelope']?.['soap:Body']?.[0]?.GetUpdatedPaymentsResponse?.[0]?.GetUpdatedPaymentsResult?.[0]?.ChangedPaymentOrdersRefCode?.[0]?.string;
  // If no payments have been updated since the last check, return.
  if (!Array.isArray(refCodes) || !refCodes?.length) return;

  const statuses = await Tipalti.getExtendedPaymentDetails({ payerName, apiKey, refCodes });
  return statuses;
};

Tipalti.getExtendedPaymentDetails = async ({ payerName, apiKey, refCodes }) => {
  // https://support.tipalti.com/Content/Topics/Development/APIs/PayeeAPI/GetPayeeDetails/GetExtendedPODetailsList/Intro.htm
  const timestamp = moment().format('X');
  const key = createHashedKey(`${payerName}${timestamp}`, apiKey);
  const endpoint = { name: 'GetExtendedPODetailsList' };
  const poRefCodes = refCodes.map((code) => ({ string: code }));
  const body = { payerName, timestamp, key, poRefCodes };
  // Make the request to Tipalti
  const response = await Soap.send(payeeApiUrl, endpoint, body);
  logger.debug(response?.data);
  const parsedResponse = await parser.parseStringPromise(response.data);
  return parsedResponse;
};

const updatePaymentsStatus = async (tipaltiPaymentsOrders, response) => {
  // If no response mark all payments in this batch as failed
  if (!response) {
    tipaltiPaymentsOrders.forEach((payment) => {
      payment.status = 'Error';
      payment.reason = 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team';
    });
    return;
  }
  // Check Line Results to see if there's any errors and update statuses
  logger.debug(response.data);
  const parsedResponse = await parser.parseStringPromise(response);
  const lineResults = parsedResponse?.['soap:Envelope']?.['soap:Body']?.[0]?.ProcessPaymentsResponse?.[0]?.ProcessPaymentsResult?.[0]?.linesResults?.[0]?.ExpandedLineResult;
  // If no lineResults mark all payments in this batch as failed
  if (!lineResults) {
    tipaltiPaymentsOrders.forEach((payment) => {
      payment.status = 'Error';
      payment.reason = 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team';
    });
    return;
  }
  lineResults.forEach((lineResult) => {
    const status = lineResult?.status?.[0];
    const message = lineResult?.message?.[0];
    const refCode = lineResult?.refCode?.[0];
    const paymentOrderStatus = lineResult?.paymentOrderStatus?.[0];
    // Update the payment status/reason
    tipaltiPaymentsOrders.forEach((payment) => {
      if (payment.TipaltiPaymentOrderItem.RefCode === refCode) {
        payment.status = status;
        payment.reason = message;
        payment.paymentOrderStatus = paymentOrderStatus;
      }
    });
  });
};
const createHashedKey = (query, apiKey) => {
  // Encrypt query with HMACSHA256 using the api key
  const hashkey = crypto.createHmac('SHA256', apiKey).update(query.toString('utf8')).digest('hex');
  return hashkey;
};

const payeePayableHumanReadableReason = (errors = '') => {
  if (errors?.length === 0) { return ''; }
  // List of errors from tipalti: https://support.tipalti.com/Content/Topics/Development/APIs/PayeeAPI/GetPayeeDetails/PayeePayable/Intro.htm
  const mappings = {
    Address: 'The payee\'s address is invalid.',
    'Certificate of No U.S. Activities has expired': 'The payee\'s Certificate of No U.S. Activities has expired.',
    'Country is not supported': 'The payment country selected by the payee is not supported.',
    'Currency is not supported': 'The currency selected by the payee is not supported.',
    'Document uploaded by payee, but it hasn\'t been reviewed yet': 'The payee has uploaded the required document to the iFrame, but it has yet to be reviewed by the payer.',
    Hold: 'The payee has selected "Hold my payments" in the iFrame.',
    'Last payment failed': 'The payee\'s last payment transaction failed.',
    'Missing payment method details': 'Details about the payee\'s payment method are missing (i.e., the payee has not completed these fields in the iFrame).',
    'No documents provided for compliance review': 'The payee has not provided the required documents for compliance review.',
    'No PM': 'The payee has not selected a payment method in the iFrame.',
    'Paid amount not in range': 'The amount to be paid to the payee is not in the required range.',
    'Payee account is closed': 'The payee\'s account is closed (i.e., not active).',
    'Payee blocked': 'The payee has a status of "Blocked".',
    'Payee currency is not selected': 'The payee has not selected a payment currency in the iFrame.',
    'Payee is blocked by Tipalti': 'The payee was blocked by a Tipalti operator.',
    'Payee record is missing': 'The payee\'s review record is missing. For example, if there are existing payees and Tipalti then activates the payee review feature (which screens payees during registration in the iFrame), the existing payees will not have a review status because they have already registered in the iFrame.',
    'Payee record is pending payee update': 'The payer has requested that the payee update the information in the iFrame and the payee has not yet made the updates.',
    'Payee record is pending review': 'The updates the payee made in the iFrame are pending review by the payer.',
    'Payee record was declined': 'The updates the payee made in the iFrame have been declined by the payer.',
    'Payee suspended': 'The payee has a status of "Suspended".',
    'Payer ToS not signed': 'The payer\'s Terms of Service have not been signed.',
    'Pending Compliance Review': 'The payee is pending compliance review.',
    'Pending tax form approval': 'The payee\'s tax form is pending approval.',
    'PM is not supported': 'The payee\'s selected payment method is not supported.',
    'Required documents were not provided': 'The payee has not provided the required documents.',
    Tax: 'The payee\'s tax forms have not been received.',
    'Tax form document was uploaded by the payee, but has not been reviewed': 'The required tax form document has been uploaded by the payee, but has not yet been reviewed by the payer.',
    'Tax form documents have not been uploaded by payee': 'The payee has not uploaded the required tax form documents.',
    'Tax number was not entered': 'The payee has not entered a tax number in the iFrame.',
    'Tipalti ToS not signed': 'Tipalti\'s Terms of Service have not been signed.',
    'Validation for tax form failed': 'Validation of the payee\'s tax form has failed.',
    'VAT number was not entered': 'The payee has not entered a value-added tax (VAT) number in the iFrame.',
  };

  const humanReadableErrors = [];
  const originalErrors = errors.split(',');
  // Add mapping if there's one otherwise return the original error.
  originalErrors.forEach((error) => humanReadableErrors.push(mappings[error] || error));
  // Join errors in a new line each
  return humanReadableErrors.join('</br>');
};

const createPaymentBatches = (payments) => {
  // Tipalti has a limit of 250 payments per batch.
  const batchSize = 250;
  // Create payments batches
  const batches = payments.reduce((resultArray, item, index) => {
    const chunkIndex = Math.floor(index / batchSize);
    if (!resultArray[chunkIndex]) { resultArray[chunkIndex] = []; } // start a new chunk
    resultArray[chunkIndex].push(item);
    return resultArray;
  }, []);
  // Return the batches
  return batches;
};

module.exports = Tipalti;
