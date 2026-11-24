const moment = require('moment');
const { eachLimit } = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Payee = require('../../../../models/payee');
const Client = require('../../../../models/client');
const Contract = require('../../../../models/contract');
const PayeeTransaction = require('../../../../models/payeeTransaction');

const PayeePDF = require('../../../statements/payeeStandardPdf');
const PayeeController = require('../../../../controllers/payee');
const { getContractTransfers, getLogo, uploadFile } = require('./helpers');

const PayeeBalanceStatements = this;

/**
 * Creates PDF Statements for Payee, for a particular Period
 *
 * @param {*} params.period - Mongo Document for Period
 * @param {*} params.contract - Mongo Document for Contract, used for running a Statement
 * @param {*} params.statement - Mongo Document for Statement, used for reprocessing a Statement
 * @param {*} params.lastId - Last Payee Id from previous run, used for pagination
 *
 * @returns {Promise<void>}
 */
PayeeBalanceStatements.createStatements = async ({ period, contract, lastId }) => {
  if (!period && !contract) throw new Error('Period AND/OR Contract is required to run Payee Balances');

  const client = await Client.findById(period.clientId).select('logo email payeeSummaryText').catch(logger.error);
  if (!client) throw new Error('No client Found');

  const limit = 1000;

  const query = { clientId: period.clientId, payeeBalanceCurrency: { $exists: true } };
  if (contract?.payees?.length) { query._id = { $in: contract.payees.map((contract) => contract.payeeId) }; } // When reprocessing a Statement, add payeeIds to query

  if (lastId) { query._id = { $gt: lastId }; } // Pagination, we only process 1000 payees at a time

  const payees = await Payee
    .find(query)
    .select('_id name clientId address minPayout openingBalance payeeBalanceCurrency selfBillingTaxRate autoPayment statements')
    .sort({ _id: 1 })
    .limit(limit)
    .catch(logger.error);

  if (!payees?.length) {
    logger.info(`${period._id.toString()} | Payee Payments | No payees found`);
    return;
  }

  const periodStartDate = moment.utc(period.startDate).format();
  const periodEndDate = moment.utc(period.endDate).format();

  logger.info(`${period._id.toString()} | Payee Statements | Processing ${payees.length} payees`);

  await eachLimit(payees, 100, async (payee) => {
    // Get Contracts for Payee
    const contracts = await Contract
      .find({ clientId: period.clientId, 'payees.payeeId': payee._id.toString(), active: true, accountingPeriod: period.accountingPeriodType })
      .select('_id clientId name payees openingBalance payeeBalanceCondition payeeBalanceCurrency selfBillingTaxRate minPayout autoPayment')
      .catch(logger.error);

    if (!contracts?.length) return; // If no contracts  are found for this period, no need to create a statement

    // Get Payee Data for statements
    const openingBalance = await PayeeController.balanceAtDate({ payee, date: periodStartDate });
    const closingBalance = await PayeeController.balanceAtDate({ payee, date: periodEndDate });

    // Get Contract Transfers
    const contractTransfers = await getContractTransfers({ contracts, period, payee });

    // Get Tax Transaction
    const taxTransaction = await PayeeTransaction
      .findOne({
        clientId: payee.clientId,
        payeeId: payee._id.toString(),
        periodId: period._id.toString(), // Non User created Tax Transaction
        userCreated: false,
        type: 'Tax',
      })
      .select('amountInPayeeCurrency')
      .catch(logger.error);

    // Get Payment
    const payment = await PayeeTransaction
      .findOne({
        clientId: payee.clientId,
        payeeId: payee._id.toString(),
        periodId: period._id.toString(),
        userCreated: false, // This could change if we want to distinguish between user created and system created payments
        type: 'Payment',
      })
      .select('amountInPayeeCurrency')
      .catch(logger.error);

    // Other Transactions
    const otherTransactions = await PayeeTransaction
      .find({
        clientId: payee.clientId,
        payeeId: payee._id.toString(),
        date: { $gte: periodStartDate, $lte: periodEndDate },
        userCreated: true, // User Created Transactions ['Advance', 'Payment', 'Tax', 'Royalties', 'Other']
      })
      .catch(logger.error);

    // Get Logo
    const logo = await getLogo({ client });

    // Create PDF
    const filePath = await PayeePDF
      .create({
        logo,
        payee,
        client,
        period,
        payment,
        openingBalance,
        closingBalance,
        contractTransfers,
        otherTransactions,
        taxTransaction: taxTransaction?.amountInPayeeCurrency || 0,
      })
      .catch(logger.error);

    // TODO this currently overwrite previous statement due to the periodId?
    const statementName = `${period.year} - ${period.accountingPeriod}: ${payee.name}`;

    // Upload to S3
    const s3Key = await uploadFile({ filePath, client, payee, period, statementName });

    // Update Payee with Statement
    const statement = {
      name: statementName,
      s3Key,
      status: 'Pending',
      periodId: period._id.toString(),
      balance: closingBalance,
      date: periodEndDate,
    };

    await Payee.findByIdAndUpdate(payee._id, { $set: { [`statements.${[period._id.toString()]}`]: statement } }).catch(logger.error);
  });

  if (payees.length === limit) {
    await PayeeBalanceStatements.createStatements({ period, contract, lastId: payees[limit - 1]._id.toString() });
  }
};

module.exports = PayeeBalanceStatements;
