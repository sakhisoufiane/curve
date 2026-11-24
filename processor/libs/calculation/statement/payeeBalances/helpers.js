const fs = require('fs');
const { eachLimit } = require('async');
const sanitize = require('sanitize-filename');
const appRootDir = require('app-root-dir').get();
const { logger, fileManager, utils } = require('@curveroyaltysystems/platform-shared-utils');

const Statement = require('../../../../models/statement');

const PayeeTransaction = require('../../../../models/payeeTransaction');
const ContractController = require('../../../../controllers/contract');

const PayeeBalanceStatementHelpers = this;

/**
 * Create an array of associated Contract objects, these get listed on the Statement PDF
 *
 * @param {*} params.contracts - Array of Contract objects associated with the Payee
 * @param {*} params.period - Mongo Document for Period
 * @param {*} params.payee - Mongo Document for Payee
 * @returns {Promise<Array{ share: Number, name: String, total: String, originalCurrency: String, currency: String, condition: String, didPayeeBalanceConditionMet: { included: Boolean, reason: String } }>} Array of Contract objects
 */
PayeeBalanceStatementHelpers.getContractTransfers = async ({ contracts, period, payee }) => {
  const contractTransfers = [];

  await eachLimit(contracts, 10, async (contract) => {
    const statement = await Statement
      .findOne({ clientId: period.clientId, contractId: contract._id.toString(), periodId: period._id.toString() })
      .select('_id')
      .catch(logger.error);

    if (!statement) return; // If no statement, then no transactions were ever transferred

    const transactions = await PayeeTransaction
      .find({
        clientId: period.clientId,
        payeeId: payee._id.toString(),
        periodId: period._id.toString(),
        statementId: statement._id.toString(),
      })
      .select('_id originalCurrency currency amountInPayeeCurrency')
      .catch(logger.error);

    // If no transactions, then we default the transaction total to 0
    let transactionTotal = transactions?.reduce((acc, transaction) => acc + (transaction?.amountInPayeeCurrency || 0), 0) || 0;

    // This is the share set against the contract, how much of the contract balance is transferred to the Payee
    const share = contract.payees.find((contractPayee) => contractPayee.payeeId === payee._id.toString())?.percentage || 0;

    // This returns an Object which specifies where each contract should sit on the PDF.
    // If the contract did not reach it's condition it will be displayed on the second page
    const payeeBalanceConditionResult = didPayeeBalanceConditionMet({ transactions, condition: contract.payeeBalanceCondition });

    if (!payeeBalanceConditionResult.included) {
      // If the contract did not reach it's condition, we need to calculate the closing balance of the contract and save that as the transaction total
      const contractClosingBalance = await ContractController.balanceAtDate({ contract, date: period.endDate });
      transactionTotal = contractClosingBalance;
    }

    contractTransfers.push({
      share,
      name: contract.name,
      total: transactionTotal,
      originalCurrency: transactions?.[0]?.originalCurrency,
      currency: transactions?.[0]?.currency,
      condition: contract.payeeBalanceCondition,
      didPayeeBalanceConditionMet: payeeBalanceConditionResult,
    });
  });

  contractTransfers.sort((a, b) => b.total - a.total);

  return contractTransfers;
};

/**
 * Fetches the logo from the client, this usually get downloaded in the main process
 *
 * @param {*} params.client - Mongo Document for Client
 * @returns {String} Local file path to the logo
 */
PayeeBalanceStatementHelpers.getLogo = ({ client }) => {
  if (!client.logo) return;

  const splitLogo = client.logo.split('/');
  const localLogoLocation = `${appRootDir}/tmp/${sanitize(splitLogo[splitLogo.length - 1])}`;

  if (fs.existsSync(localLogoLocation)) return localLogoLocation;

  return new Promise((resolve, _) => {
    fileManager.downloadFromS3(client.logo, process.env.S3_bucket, (err, localLogo) => {
      if (err) {
        logger.error(err);
        logger.error('Logo could not download from S3');
      } else {
        resolve(localLogo);
      }
    });
  });
};

/**
 * Uploads the Payee PDF to S3
 * @param {*} params.filePath - Local file path to the PDF
 * @param {*} params.payee - Mongo Document for Payee
 * @param {*} params.period - Mongo Document for Period
 * @param {*} params.statementName - Name of the PDF
 *
 * @returns {Promise<String>} S3 Key where the PDF is stored
 */
PayeeBalanceStatementHelpers.uploadFile = ({ filePath, payee, period, statementName }) => {
  const s3WriteKey = `statements/${payee._id.toString()}/${utils.safeName(statementName)}.pdf`;

  return new Promise((resolve, _) => {
    fileManager.uploadToS3(s3WriteKey, filePath, (err, key) => {
      if (err) {
        logger.error(err);
      } else {
        resolve(key);
      }
    });
  });
};

/**
 * Returns an Object which specifies where each contract should sit on the PDF. Included or Excluded sections
 * This is based on the Payee Balance Condition set against the Contract
 *
 * @param {*} params.transactions - Array of PayeeTransaction objects
 * @param {*} params.condition - String which specifies the Payee Balance Condition set against the Contract
 * @returns {Object{ included: Boolean, reason: String }} Object which specifies where each contract should sit on the PDF
 */
const didPayeeBalanceConditionMet = ({ condition, transactions }) => {
  if (condition === 'Never') return { included: false, reason: 'Contract Balance is set to Never transfer to this Payee' };
  // If the condition is set to 'When Positive' and there are payee transactions against the contract, then the transfer was successful
  if (condition === 'When Positive' && !transactions?.length) return { included: false, reason: 'Contract Balance is below the minium threshold: 0' };
  // The only other condition which could be set it 'Always' which will always get included on the main page of the PDF
  return { included: true };
};

module.exports = PayeeBalanceStatementHelpers;
