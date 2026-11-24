/* eslint-disable no-await-in-loop */
const { eachLimit, eachOfLimit } = require('async');
const { UserAccess, Exports, WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const { logger, fileManager, createXlsx } = require('@curveroyaltysystems/platform-shared-utils');
const Client = require('../../models/client');
const Payee = require('../../models/payee');
const PayeeTransaction = require('../../models/payeeTransaction');

const ImportXlsx = require('../../libs/importXlsx');
const Notification = require('../../models/notification');
const config = require('../../config.json');

const PayeeTransactionController = this;

/**
 * Returns associated transactions for a Payee
 *
 * @param {String} payeeId - Params.Id PayeeId
 * @param {Object} curveUser - Curve User Object
 * @returns {Array} - Returns array of objects containing transactions
 */
PayeeTransactionController.getTransactions = async ({ payeeId, curveUser }) => {
  const client = await Client.findById(curveUser.clientId, 'features').catch(logger.error);
  if (!client?.features?.payeeBalances) {
    const error = new Error('This client is not allowed to create payee transactions');
    error.code = 403;
    throw error;
  }

  const payee = await Payee.findById(payeeId).catch(logger.error);
  if (!payee) {
    const error = new Error('Couldn\'t find a Payee matching this ID');
    error.code = 404;
    throw error;
  }

  if (!curveUser.clientId && curveUser.payeeId !== payee._id.toString()) {
    const error = new Error('Forbidden');
    error.code = 403;
    throw error;
  }

  const transactions = await PayeeTransaction.find({ clientId: curveUser.clientId, payeeId }).catch(logger.error);
  const transactionWithBalances = getBalances({ transactions, payee });
  return transactionWithBalances;
};

const getBalances = ({ transactions, payee }) => {
  let balance = payee.openingBalance;

  const transactionsWithBalances = transactions.map((transaction) => {
    const object = transaction.toObject();
    object.balance = balance + object.amountInPayeeCurrency;
    balance += object.amountInPayeeCurrency;

    return object;
  });

  return transactionsWithBalances;
};

/**
 * Creates a transaction for a Payee
 *
 * @param {String} payeeId - Params.Id PayeeId
 * @param {Object} body - Body of the request
 * @param {Object} curveUser - Curve User Object
 * @returns {Object} - Returns created transaction object
 */
PayeeTransactionController.createTransaction = async ({ payeeId, body, curveUser }) => {
  const client = await Client.findById(curveUser.clientId, 'features').catch(logger.error);
  if (!client?.features?.payeeBalances) {
    const error = new Error('This client is not allowed to create payee transactions');
    error.code = 403;
    throw error;
  }

  const payee = await Payee.findById(payeeId).catch(logger.error);
  if (!payee) {
    const error = new Error('Couldn\'t find a Payee matching this ID');
    error.code = 404;
    throw error;
  }

  if (!payee.payeeBalanceCurrency) {
    const error = new Error('Payee Balance currency must be set before creating transactions');
    error.code = 400;
    throw error;
  }

  body.clientId = client._id.toString();
  body.payeeId = payee._id.toString();
  body.userCreated = true;
  body.published = true;
  body.originalCurrency = payee.payeeBalanceCurrency;
  body.currency = payee.payeeBalanceCurrency;

  const transaction = new PayeeTransaction(body);

  if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: transaction, clientOnly: true })) {
    const error = new Error('Forbidden');
    error.code = 403;
    throw error;
  }

  await transaction.save();
  return transaction;
};

/**
 * Updates a transaction for a Payee
 *
 * @param {String} transactionId - PayeeTransaction ID
 * @param {Object} body - Body of the request
 * @param {Object} curveUser - Curve User Object
 * @returns {Object} - Returns updated transaction object
 */
PayeeTransactionController.updateTransaction = async ({ transactionId, body, curveUser }) => {
  const client = await Client.findById(curveUser.clientId, 'features').catch(logger.error);
  if (!client?.features?.payeeBalances) {
    const error = new Error('This client is not allowed to create payee transactions');
    error.code = 403;
    throw error;
  }

  const transaction = await PayeeTransaction.findById({ clientId: curveUser.clientId, _id: transactionId }).catch(logger.error);
  if (!transaction) {
    const error = new Error('Couldn\'t find a PayeeTransaction matching this ID');
    error.code = 404;
    throw error;
  }

  if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: transaction, clientOnly: true })) {
    const error = new Error('Forbidden');
    error.code = 403;
    throw error;
  }

  delete body._id;

  // eslint-disable-next-line guard-for-in
  for (const i in body) { transaction[i] = body[i]; }

  await transaction.save();
  return transaction;
};

/**
 * Removes a transaction for a Payee
 *
 * @param {String} transactionId - PayeeTransaction ID
 * @param {Object} curveUser - Curve User Object
 */
PayeeTransactionController.deleteTransaction = async ({ transactionId, curveUser }) => {
  const client = await Client.findById(curveUser.clientId, 'features').catch(logger.error);
  if (!client?.features?.payeeBalances) {
    const error = new Error('This client is not allowed to create payee transactions');
    error.code = 403;
    throw error;
  }

  const transaction = await PayeeTransaction.findById({ clientId: curveUser.clientId, _id: transactionId }).catch(logger.error);
  if (!transaction) {
    const error = new Error('Couldn\'t find a PayeeTransaction matching this ID');
    error.code = 404;
    throw error;
  }

  if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: transaction, clientOnly: true })) {
    const error = new Error('Forbidden');
    error.code = 403;
    throw error;
  }

  await transaction.deleteOne();
};

/**
 * Imports payee transactions
 *
 * @param {Object} file - Uploaded file object
 * @param {Object} curveUser - Curve User Object
 */
PayeeTransactionController.importPayeeTransactions = async ({ file, curveUser }) => {
  try {
    const client = await Client.findById(curveUser.clientId).lean();
    if (!client) throw new Error('Client not found');

    const dateFormat = client.dateFormat?.toUpperCase() || '';
    const data = await parseImportFile(file.path, config.importTemplates.payeeTransaction, dateFormat);
    const payees = await Payee.find({ clientId: curveUser.clientId }).select('name payeeBalanceCurrency').lean();
    const payeeMap = new Map(payees.map((p) => [p.name, p]));

    const errors = [];
    const validatedTransactions = [];

    await eachOfLimit(data, 5, async (row, index) => {
      const lineNumber = index + 3;
      const lineErrors = [];

      try {
        if (!row.name) lineErrors.push(`Line ${lineNumber}: Name is required`);
        if (!row.date) lineErrors.push(`Line ${lineNumber}: Date is required`);
        if (!row.payeeName) lineErrors.push(`Line ${lineNumber}: Payee Name is required`);

        if (row.payeeName) {
          const payee = payeeMap.get(row.payeeName);
          if (!payee) {
            lineErrors.push(`Line ${lineNumber}: Payee "${row.payeeName}" not found`);
          } else if (!payee.payeeBalanceCurrency) {
            lineErrors.push(`Line ${lineNumber}: Payee "${row.payeeName}" must have balance currency set`);
          }

          if (lineErrors.length === 0) {
            let payeeTransaction;
            if (row.id?.trim()) {
              payeeTransaction = await PayeeTransaction.findOne({ clientId: curveUser.clientId, _id: row.id });
              if (!payeeTransaction) {
                lineErrors.push(`Line ${lineNumber}: Transaction with ID "${row.id}" not found`);
              }
            } else {
              payeeTransaction = new PayeeTransaction({
                userCreated: true,
                clientId: curveUser.clientId,
                payeeId: payee._id.toString(),
                createdBy: curveUser.id,
                lastModifiedBy: curveUser.id,
              });
            }

            if (lineErrors.length === 0) {
              validatedTransactions.push({ payeeTransaction, row, payee, curveUser, lineNumber });
            }
          }
        }
      } catch (error) {
        logger.error(`Error processing line ${lineNumber}:`, error);
        lineErrors.push(`Line ${lineNumber}: ${error.message}`);
      }

      errors.push(...lineErrors);
    });

    let importedPayeeTransactions = [];
    let count = 0;

    if (errors.length === 0) {
      try {
        await eachLimit(validatedTransactions, 5, async (transactionData) => {
          const { payeeTransaction, row, payee, curveUser } = transactionData;
          await processPayeeTransaction(payeeTransaction, row, payee, curveUser);
          importedPayeeTransactions.push(payeeTransaction);
          count += 1;
        });
      } catch (error) {
        errors.push(`Import failed: ${error.message}`);
        count = 0;
        importedPayeeTransactions = [];
      }
    }

    await sendImportNotification({ file, client, curveUser, count, errors });

    return {
      success: errors.length === 0,
      count,
      errors,
      importedPayeeTransactions,
    };
  } catch (error) {
    logger.error('Payee transaction import error:', error);
    const client = await Client.findById(curveUser.clientId).lean();
    await sendErrorNotification({ client, curveUser, file, error });
    throw error;
  }
};

const parseImportFile = (filePath, template, dateFormat) => new Promise((resolve, reject) => {
  ImportXlsx.getDataByTemplate(filePath, template, 0, 2, dateFormat, (err, data) => {
    if (err) {
      if (err === 'Template does not match') {
        return reject(new Error('It appears the template does not match'));
      }
      return reject(err);
    }
    resolve(data);
  });
});

const processPayeeTransaction = async (payeeTransaction, row, payee, curveUser) => {
  payeeTransaction.name = row.name;
  payeeTransaction.amountInOriginalCurrency = parseFloat(row.originalAmount) || 0;
  payeeTransaction.amountInPayeeCurrency = parseFloat(row.originalCurrencyAmount) || payeeTransaction.amountInOriginalCurrency;
  payeeTransaction.type = row.type || 'Other';
  payeeTransaction.date = new Date(row.date);
  payeeTransaction.originalCurrency = row.originalCurrency || payee.payeeBalanceCurrency;
  payeeTransaction.currency = row.payeeBalanceCurrency || payee.payeeBalanceCurrency;
  payeeTransaction.published = row.published !== undefined ? Boolean(row.published) : true;
  payeeTransaction.lastModifiedBy = curveUser.id;

  await payeeTransaction.validate();
  await payeeTransaction.save();
};

const sendImportNotification = async ({ file, client, curveUser, count, errors }) => {
  const subject = errors.length > 0 ? 'Your Payee Transaction Import Has Errored' : 'Your Payee Transaction Import Has Completed';
  const message = errors.length > 0
    ? `${errors.length} errors in file ${file.originalname}`
    : `${count} Payee Transactions imported in file ${file.originalname}`;

  const generateOptions = {
    identifier: errors.length > 0 ? 'importError' : 'importComplete',
    curveUser,
    client,
    subject,
    file: file.originalname,
    count: errors.length === 0 ? count : undefined,
    error: errors.length > 0 ? errors : undefined,
  };

  await Notification.generate(subject, message, null, curveUser, generateOptions);
};

const sendErrorNotification = async ({ client, curveUser, file, error }) => {
  const subject = 'Your Payee Transaction Import Has Errored';
  const message = `Errors in file ${file.originalname}`;

  const generateOptions = {
    identifier: 'importError',
    curveUser,
    client,
    subject,
    file: file.originalname,
    error: [error.message],
  };

  await Notification.generate(subject, message, null, curveUser, generateOptions);
};

/**
   * Exports transactions for a specific Payee
   *
   * @param {Object} filter - Filter criteria for transactions
   * @param {Object} curveUser - Curve User Object
   */
PayeeTransactionController.exportTransactions = async ({ curveUser, ids, filter }) => {
  try {
    const exportFilter = { clientId: curveUser.clientId };
    if (ids.length === 0) {
      const payeeFilter = Payee.paramsToFilterField(filter, curveUser);
      const payees = await Payee.find(payeeFilter, { _id: 1 }).lean();
      const payeeIds = payees.map((p) => p._id);
      exportFilter.payeeId = { $in: payeeIds };
    } else {
      exportFilter.payeeId = { $in: ids };
    }
    const count = await PayeeTransaction.countDocuments(exportFilter);
    const client = await Client.findById(curveUser.clientId).lean();
    const dateFormat = client?.dateFormat ? `${client.dateFormat.toUpperCase()}` : '';

    let filePath;
    if (count > 10000) {
      const limit = 10000;
      filePath = `${appRootDir}/tmp/Payee Transaction Export - ${moment().format('X')}.csv`;
      const writer = new WriteCsv({ headers: ['id', 'name', 'originalAmount', 'originalCurrentAmount', 'periodId', 'type', 'date', 'originalCurrency', 'payeeBalanceCurrency', 'payeeName', 'published'], outputLocation: filePath });

      const totalRounds = Math.floor(count / limit);

      for (let round = 0; round <= totalRounds; round += 1) {
        try {
          const transactions = await PayeeTransaction.find(exportFilter)
            .sort({ date: 1, _id: 1 })
            .limit(limit)
            .skip(round * limit)
            .lean();

          const data = await convertPayeeTransactionsForExport(transactions, dateFormat);
          await new Promise((resolve, reject) => {
            writer.addData(data[0], (err) => (err ? reject(err) : resolve()));
          });
        } catch (err) {
          logger.error(err);
          throw err;
        }
      }

      await new Promise((resolve, reject) => {
        writer.write((err) => (err ? reject(err) : resolve()));
      });
    } else {
      const transactions = await PayeeTransaction.find(exportFilter).sort({ date: 1 }).lean();

      const data = await convertPayeeTransactionsForExport(transactions, dateFormat);

      const template = await Exports.getTemplate({ Client, templateName: 'payeeTransactions', clientId: curveUser.clientId });
      filePath = await new Promise((resolve, reject) => {
        createXlsx.createInTemplate(data, template, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      });
    }

    const key = `exports/${moment().format('YYYYMMDDHHmmssSSS')}.${filePath.split('.').pop()}`;

    await new Promise((resolve, reject) => {
      fileManager.uploadToS3(key, filePath, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    const link = await new Promise((resolve, reject) => {
      fileManager.publicLink24Hours(key, (err, url) => {
        if (err) reject(err);
        else resolve(url);
      });
    });

    const generateOptions = {
      identifier: 'exportDownload',
      curveUser,
      client,
      subject: `Your Payee Transactions Export for ${client.name} is Ready`,
      link,
    };

    await Notification.generate(
      'Payee Transactions Export Ready',
      `Your Payee Transactions Export for ${client.name} is Ready to Download`,
      link,
      curveUser,
      generateOptions,
    );
  } catch (error) {
    logger.error('Transaction export error:', error);

    const client = await Client.findById(curveUser.clientId).lean();
    const generateOptions = {
      identifier: 'exportError',
      curveUser,
      client,
      subject: `Your Payee Transactions Export for ${client.name} Has Errored`,
      error: error.message,
    };

    await Notification.generate(
      `Your Payee Transactions Export for ${client.name} Has Errored`,
      error.message,
      null,
      curveUser,
      generateOptions,
    );
  }
};

const convertPayeeTransactionsForExport = async (transactions, dateFormat) => {
  const payeeIds = [...new Set(transactions.map((t) => t.payeeId.toString()))];
  const payees = await Payee.find({ _id: { $in: payeeIds } }).select('name').lean();
  const payeeMap = new Map(payees.map((p) => [p._id.toString(), p.name]));

  const data = transactions.map((transaction) => [
    transaction._id.toString(),
    transaction.name,
    transaction.amountInOriginalCurrency,
    transaction.amountInPayeeCurrency,
    transaction.periodId,
    transaction.type,
    moment(transaction.date).format(dateFormat),
    transaction.originalCurrency,
    transaction.currency,
    payeeMap.get(transaction.payeeId.toString()) || '',
    transaction.published,
  ]);
  return [data];
};

module.exports = PayeeTransactionController;
