const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('mongodb');
const _ = require('lodash');

const { transactionParamsSchema } = require('./validators');

const Transaction = require('../../models/transaction');
const Contract = require('../../models/contract');
const Payee = require('../../models/payee');

const TransactionController = this;

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

function generateDeleteMessage({ total, count }) {
  if (total !== count) {
    return `${count}/${total} transactions partially deleted. Some transactions may not have been deleted because they are genereated by Curve.`;
  }

  return `${count}/${total} transactions successfully deleted`;
}

TransactionController.bulkDelete = async ({ ids, curveUser }) => {
  if (!ids) throw new Error('No Transaction IDs provided');

  const formattedIds = ids.split(/\r?\n|\r|\n/g).filter(onlyUnique);

  const validObjectIds = formattedIds.filter((id) => ObjectId.isValid(id));
  if (validObjectIds?.length === 0) throw new Error('Please provide valid Transaction IDs');

  logger.debug(`Bulk Delete Transactions - Searching for Transactions: ${validObjectIds.join(', ')}`);

  const transactions = await Transaction.find({ _id: { $in: validObjectIds }, clientId: curveUser.clientId }).catch(logger.error);
  if (transactions?.length === 0) throw new Error(`No Transactions found: ${validObjectIds.join(', ')}`);

  logger.debug(`Bulk Delete Transactions - Found ${transactions?.length} Transactions to Delete`);

  transactions.forEach(async (transaction) => {
    const forbidden = await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: transaction, clientOnly: true });
    if (forbidden) throw new Error('Forbidden');
  });

  const filteredTransactions = transactions.filter((transaction) => transaction.userCreated);
  if (filteredTransactions.length === 0) throw new Error('You cannot delete any Transactions generated from Curve');

  const filteredTransactionIds = transactions.filter((transaction) => transaction.userCreated).map(({ _id }) => _id);
  logger.info(`Bulk Delete Transactions: ${filteredTransactionIds.join(', ')} - Curve User: ${curveUser.id}`);
  await Transaction.deleteMany({ _id: { $in: filteredTransactionIds } }).catch(logger.error);

  // After deleting the transaction - update the related contract to ensure contract is recalculated on a partial period run
  const contractIds = filteredTransactions.map((transaction) => new ObjectId(transaction.contractId));
  if (contractIds.length) {
    logger.debug(`Updating Contract updatedAt field for: ${contractIds}`);
    await Contract.updateMany({ _id: { $in: contractIds } }, { $set: { updatedAt: new Date() } });
  }

  return generateDeleteMessage({ total: transactions.length, count: filteredTransactionIds.length });
};

TransactionController.export = async ({ curveUser, ids, filter }) => {
  if (!curveUser.clientId || curveUser.payeeId || !['View', 'Edit'].includes(curveUser.rights[curveUser.clientId].contracts)) {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }
  const exportFilter = { clientId: curveUser.clientId };
  if (ids.length === 0) {
    const contractFilter = paramsToFilterContractField(filter, curveUser);
    const contracts = await Contract.find(contractFilter, { _id: 1 }).lean();
    const contractIds = contracts.map((c) => c._id);
    exportFilter.contractId = { $in: contractIds };
  } else {
    exportFilter.contractId = { $in: ids };
  }
  return Transaction.sendExport(exportFilter, curveUser);
};

TransactionController.validateParams = (inputParams) => {
  const result = transactionParamsSchema.safeParse(inputParams);

  if (result.success) {
    return { errors: [], errored: false, success: true };
  }

  const errors = result.error.issues.map((issue) => issue.message);

  return { errors, errored: true, success: false };
};

function paramsToFilterContractField(inputParams, user) {
  const params = {};
  if (user.clientId) { params.clientId = user.clientId; }
  if (inputParams.payeeId) { params['payees.payeeId'] = inputParams.payeeId; }
  // if contract type of "All" is supplied, don't add a contractType param to match all types
  if (!(inputParams.contractType === 'All' || inputParams.contractType === 'all')) {
    if (inputParams.contractType === 'Mechanical' || inputParams.contractType === 'mechanical') {
      params.contractType = 'Mechanical';
    } else {
      params.contractType = { $ne: 'Mechanical' };
    }
  }
  if (inputParams.companyIds && inputParams.companyIds.length > 0) { params.companyId = { $in: inputParams.companyIds }; }
  if (inputParams.ids) {
    inputParams.ids = inputParams.ids.map((id) => new ObjectId(id));
    params._id = { $in: inputParams.ids };
  }
  if (inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
    params.$or = [{ name: { $regex: regex } }, { labels: { $regex: regex } }];

    if (inputParams.text.length === 24 && ObjectId.isValid(inputParams.text)) {
      params.$or.push({ _id: inputParams.text });
    }
  }
  if (inputParams.contractCategories && inputParams.contractCategories.length > 0) {
    params.contractCategories = { $in: inputParams.contractCategories };
  }
  if (inputParams.status) params.status = inputParams.status;
  if (inputParams.expiresAfter || inputParams.expiresBefore) params.endDate = {};
  if (inputParams.expiresAfter) params.endDate.$gte = new Date(inputParams.expiresAfter);
  if (inputParams.expiresBefore) params.endDate.$lte = new Date(inputParams.expiresBefore);
  if (inputParams.valid === 'true' || inputParams.valid) params.valid = true;
  if (inputParams.valid === 'false' || inputParams.valid === false) params.valid = false;
  return params;
}

module.exports = TransactionController;
