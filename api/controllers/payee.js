/* eslint-disable global-require */
/* eslint-disable no-await-in-loop */
const { eachLimit } = require('async');
const { UserAccess } = require('@curveroyaltysystems/curve-shared-logic');

const { logger, Wise, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const Client = require('../models/client');
const SubClient = require('../models/subClient');

const PayeeTransaction = require('../models/payeeTransaction');

const PayeeController = this;

PayeeController.createWiseRecipient = async ({ id, targetCurrency, wise }) => {
  const Payee = require('../models/payee');
  const payee = await Payee.findById(id);

  if (!payee) throw Error('Couldn\'t find a Payee matching this ID');
  logger.info(`Creating Wise recipient for payee ${payee._id.toString()}`);
  const { paymentProviders } = await Client.findById(payee.clientId, 'paymentProviders');
  const recipientDetails = {
    targetCurrency,
    profile: paymentProviders?.wise?.profileId,
    type: wise?.paymentMethod,
    accountHolderName: payee.name,
    details: Payee.escapeDotsFromWiseFields(wise?.paymentFields, false),
  };

  const recipient = await Wise
    .createRecipientAccount(paymentProviders?.wise?.apiKey, recipientDetails)
    .catch((error) => {
      const errMessage = error?.response?.errors?.[0]?.message;
      if (errMessage) {
        logger.error(errMessage);
        if (error.json.status === 422 && errMessage.includes('Please specify a valid')) {
          // Requirements returned by Wise API are incomplete, ask User to create directly on Wise
          const formattedError = new Error('We couldn\'t add this recipient to Wise. Please manually add a new recipient to your Wise account and link it to this Payee');
          formattedError.showToUser = true;
          throw formattedError;
        } else {
          const formattedError = new Error(errMessage);
          formattedError.showToUser = true;
          throw formattedError;
        }
      } else {
        throw Error(error);
      }
    });

  payee.paymentProviders.wise.recipientId = recipient.id;
  await payee.save();
};

PayeeController.getPaymentCurrency = async ({ payeeId, contractId, clientId }) => {
  const Contract = require('../models/contract');
  const contractFilter = contractId ? { _id: contractId } : { 'payees.payeeId': payeeId };
  const contract = await Contract.findOne(contractFilter).select('currency');

  // If the contract has a currency, and is not the Home Currency => return this currency as the Payee currency
  if (contract?.currency && contract?.currency !== 'Home Currency') return contract.currency;

  // If not, get the currency from the client
  const client = await Client.findById(clientId).select('homeCurrency');
  // If the client has a home currency, use that as the payment currency.
  if (client?.homeCurrency) return client.homeCurrency;

  // Else return null, and let the payment.
  return null;
};

/**
 * Returns associated statements for a Payee
 *
 * @param {String} payeeId - Params.Id PayeeId
 * @param {Object} curveUser - Curve User Object
 *
 * @returns {Array} - Returns array of objects containing statements
 */
PayeeController.getStatements = async ({ payeeId, curveUser }) => {
  const Payee = require('../models/payee');

  const client = await Client.findById(curveUser.clientId, 'features').catch(logger.error);
  if (!client?.features?.payeeBalances) {
    const error = new Error('This client is not allowed to create payee transactions');
    error.code = 403;
    throw error;
  }

  const payee = (await Payee.findById(payeeId).select('statements').catch(logger.error))?.toObject();
  if (!payee?.statements) {
    const error = new Error('Couldn\'t find a Payee matching this ID');
    error.code = 404;
    throw error;
  }

  if (!curveUser.clientId && curveUser.payeeId !== payee._id.toString()) {
    const error = new Error('Forbidden');
    error.code = 403;
    throw error;
  }

  const statements = await getPayeeStatementPublicKeys({ payee });
  return statements;
};

/**
 * Calculates the balance of a Payee at a given date
 *
 * @param {Object} Payee - Requesting Payee Object
 * @param {Date} date - Date to calculate the balance
 * @param {Boolean} publishedOnly - If true, only published transactions will be considered
 *
 * @returns {Number} - Returns the balance of the Payee at the given date
 */
PayeeController.balanceAtDate = async ({ payee, date, publishedOnly }) => {
  const openingBalance = payee.openingBalance || 0;

  const query = { clientId: payee.clientId, payeeId: payee._id.toString(), date: { $lte: date } };
  if (publishedOnly) query.published = true;

  const transactions = await PayeeTransaction.find(query).sort({ date: 1 });
  if (!transactions?.length) return openingBalance;

  const balance = transactions.reduce((acc, transaction) => transaction.amountInPayeeCurrency + acc, openingBalance);

  return balance;
};

PayeeController.getContractsAndTransactions = async ({ payeeId }) => {
  const Contract = require('../models/contract');
  const Transaction = require('../models/transaction');
  const Statement = require('../models/statement');
  const Payee = require('../models/payee');
  const Client = require('../models/client');
  // Sums up revenues for all periods
  const payee = await Payee.findById(payeeId);
  if (!payee) throw new Error('Payee not found');

  // Build result object
  const output = {
    payeeId: payee._id,
    payeeName: payee.name,
    totalRevenue: 0,
    contracts: [],
  };
  // Find Contracts associated with payee
  const contracts = await Contract.find({ clientId: payee.clientId, 'payees.payeeId': payee._id });
  const today = new Date();
  const yesterdayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const clientCurrency = await Client.findById(payee.clientId).select('homeCurrency');
  // Loop through all contracts,for each one find balance at Date
  for (const contract of contracts) {
    const contractObject = {
      contractId: contract._id,
      contractName: contract.name,
    };
    if (contract.subClientId) {
      contractObject.subClientId = contract.subClientId;
      const subclient = await SubClient.findById(contractObject.subClientId).select('name');
      contractObject.subclientName = subclient.name;
    }

    const transactionsArray = [];
    const currency = contract.currency === 'Home Currency' ? clientCurrency?.homeCurrency || contract.currency : contract.currency;
    contractObject.revenue = 0;
    contractObject.balance = 0;
    contractObject.currency = currency;

    const transactions = await Transaction.find({ contractId: contract._id, date: { $lte: yesterdayMidnight } });
    for (const transaction of transactions) {
      const { name, amount, type, date, statementId, isPayment } = transaction;
      const transactionObject = {};
      transactionObject._id = transaction._id;
      transactionObject.statementId = transaction.statementId;
      if (name) transactionObject.name = transaction.name;
      if (amount) transactionObject.amount = transaction.amount;
      if (type) transactionObject.type = transaction.type;
      if (date) transactionObject.date = transaction.date;

      // If the transaction has a statementId then we add the transaction's amount to the total revenue of the contract. ONLY if the statement Id exists!
      if (statementId) {
        transactionObject.statementId = statementId;
        const statement = await Statement.findById(statementId);
        if (statement.status === 'Published') {
          if (statement.type === 'Advance Recoupment') {
            contractObject.revenue -= transaction.amount;
            contractObject.balance -= transaction.amount;
            transactionsArray.push(transactionObject);
          } else {
            contractObject.revenue += transaction.amount;
            contractObject.balance += transaction.amount;
            transactionsArray.push(transactionObject);
          }
        }
        // We Need to check for payments separately here because when adding the payments up in the contractObject.
        // We don't want to also add the payment in the revenue of the contract
      } else {
        contractObject.balance += transaction.amount;
        transactionsArray.push(transactionObject);
      }
    }
    contractObject.transactions = transactionsArray;
    output.totalRevenue += contractObject.revenue;

    output.contracts.push(contractObject);
  }
  return output;
};
/**
 * Calculates a total of a given Payee Transaction type
 *
 * @param {String} type - Transaction Type ['Payment', 'Royalties', 'Advance', 'Other', 'Period Transfer']
 * @param {Object} dateRange - Date Range Object e.g. { $gte: new Date('2021-01-01'), $lte: new Date('2021-12-31') }
 * @param {Object} payee - Payee Object
 * @returns {Number} - Returns the total of the given type
 */
PayeeController.getTransactionTotals = async ({ type, dateRange, payee }) => {
  const match = {
    clientId: payee.clientId,
    payeeId: payee._id.toString(),
    date: dateRange,
    type,
  };

  if (type === 'Payment') { match.userCreated = true; }

  if (type === 'Auto Payment') {
    match.type = 'Payment';
    match.userCreated = false;
  }

  const periodTransfersTotal = await PayeeTransaction.aggregate([
    {
      $match: match,
    },
    {
      $group: {
        _id: `${type} Total`,
        total: { $sum: '$amountInPayeeCurrency' },
      },
    },
    {
      $sort: { date: 1 },
    },
  ]);

  return periodTransfersTotal?.[0]?.total || 0;
};

/**
 * Returns an array of Payee Statements with public keys
 *
 * @param {Object} payee - Payee Object
 * @param {Boolean} publishedOnly - If true, only published statements will be returned
 *
 * @returns {Array} - Returns an array of Payee Statements with public keys
 */
const getPayeeStatementPublicKeys = async ({ payee, publishedOnly }) => {
  const Period = require('../models/period');

  const statements = [];

  await eachLimit(Object.keys(payee.statements), 10, async (periodId) => {
    const statement = payee.statements[periodId];

    if (publishedOnly && statement.status !== 'Published') return;

    const period = await Period.findById(statement.periodId).select('name').catch(logger.error);

    const publicLink = await new Promise((resolve, _) => {
      fileManager.publicLink24Hours(statement.s3Key, (err, link) => {
        if (err) { logger.error(err); }
        resolve(link);
      });
    });

    statement.publicLink = publicLink;
    statement.periodName = period.name;
    statement.periodLink = `/#/periods/${periodId}/complete`;
    statements.push(statement);
  });

  return statements;
};

/**
 * Returns the balance of a Payee as well as the public keys of the statements
 *
 * @param {Object} curveUser - Curve User Object
 * @returns {Object} - Returns an object containing the balance and the statements
 */
PayeeController.getPayeeBalance = async ({ curveUser }) => {
  const Contract = require('../models/contract');
  const Payee = require('../models/payee');

  const payee = await Payee.findById(curveUser.payeeId).catch(logger.error);
  if (!payee) {
    const error = new Error('Couldn\'t find a Payee matching this ID');
    error.code = 404;
    throw error;
  }

  const isUserForbidden = await UserAccess
    .isUserForbidden({
      Contract,
      Payee,
      user: curveUser,
      operation: 'read',
      type: 'contracts',
      document: payee,
      adminOnly: true,
      payeeOnly: true,
    })
    .catch(logger.error);

  if (isUserForbidden) {
    const error = new Error('Forbidden');
    error.code = 403;
    throw error;
  }

  const balance = await PayeeController.balanceAtDate({ payee, date: new Date(), publishedOnly: true });
  const statements = payee.statements ? await getPayeeStatementPublicKeys({ payee, publishedOnly: true }) : [];

  return { balance, statements, payeeCurrency: payee.payeeBalanceCurrency };
};

module.exports = PayeeController;
