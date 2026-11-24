/* eslint-disable global-require */
const { eachLimit } = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { Page } = require('@curveroyaltysystems/curve-shared-logic');
const Transaction = require('../../models/transaction');
const Contract = require('../../models/contract');
const Payee = require('../../models/payee');
const Client = require('../../models/client');
const PayeeTransaction = require('../../models/payeeTransaction');

const ContractController = this;

/**
 * Formats payees depending on the conditions applied and validates payee splits percentage
 *
 * @param {Object} contract - Contract Object from Mongo
 */
ContractController.formatPayees = async function ({ contract }) {
  const Payee = require('../../models/payee');

  delete contract.payeeId;

  const client = await Client.findById(contract.clientId, 'features clientType').catch(logger.error);
  if (!client?.features.payeeBalances) { contract.payeeBalanceCondition = 'Never'; } // If feature flag is off, always default to Never

  if (contract.payeeBalanceCondition === 'Never') {
    // When condition is Never, there should only ever be ONE object in payees array
    const payeeId = contract.payees?.[0]?.payeeId;

    // Confirm payee belongs to the client
    if (payeeId) {
      const foundPayee = await Payee.findOne({ clientId: contract.clientId, _id: payeeId }).catch(logger.error);
      if (!foundPayee) throw new Error('Payee does not exist');

      // Check if there are transactions associated with this payee and contract, if so condition cannot be Never
      const transactionsCount = await PayeeTransaction.countDocuments({ clientId: contract.clientId, payeeId: foundPayee._id.toString(), contractId: contract._id.toString() }).catch(logger.error);
      if (transactionsCount) throw new Error('Payee has transactions associated, Payee Balance Condition cannot be "Never"');
    }

    contract.payees = payeeId ? [{ payeeId, percentage: 100 }] : [];
    return;
  }

  if (contract.payeeBalanceCondition === 'Always' && contract.type === 'Profit Share') {
    throw new Error('Payee Balance Condition cannot be "Always" for Profit Share Classic contracts');
  }

  // Validation for ['Always', 'When Positive'] Payee Setup
  if (contract.payees?.length) {
    // Check if there are duplicate payee.payeeIds
    const payeeIds = contract.payees.map(({ payeeId }) => payeeId);
    if (new Set(payeeIds).size !== payeeIds.length) throw new Error('Duplicate Payee IDs found in Payee Split');

    // Validate Percentage Total
    const totalShare = contract.payees.reduce((total, payee) => total + payee.percentage, 0);
    if (Math.round(totalShare) !== 100) throw new Error('Total Payee Split Percentage must be 100%');

    // Validate Payees Relation to Client
    const payees = await Payee.find({ clientId: contract.clientId, _id: { $in: contract.payees.map(({ payeeId }) => payeeId) } }, 'payeeBalanceCurrency').catch(logger.error);
    if (payees.length !== contract.payees.length) throw new Error('One or more payees do not exist');

    // Validate every Payee has a currency
    if (payees.some((payee) => !payee.payeeBalanceCurrency)) throw new Error('One or more payees do not have a Payee Balance Currency set');
  }

  // These fields don't need to be active, as it will be configured on the payee level with this setup
  if (client.clientType !== 'Distributor') {
    contract.selfBilling = false;
    contract.feesInvoice = false;
    contract.deductWithholding = false;
  }

  // When using payee balances for any type of client, autoPayment should be disabled
  // This will always happen at Payee Level
  contract.autoPayment = false;
  contract.autoPaymentConditions = [];
};

/**
 * Format and validate imported payees
 *
 * @param {Object} params.contract - Contract Object from Mongo
 * @param {Array} params.importedPayees - All imported payees from XLSX
 * @param {Object} params.client - Client Object from Mongo
 * @param {Number} params.index - Index of current row being processed
 * @Returns {Array} result.payees - Formatted and validated payees ready to be saved against contract
 * @Returns {Array} result.payeeErrors - Validation errors for payees
 */
ContractController.processPayeeBalances = async ({ contract, importedPayees, overwriteBlanks, client, index }) => {
  const Payee = require('../../models/payee');

  const errors = [];
  const payees = overwriteBlanks ? [] : contract.payees.map((payee) => payee);

  await eachLimit(importedPayees, 50, async (payee) => {
    if (payee.contractName !== contract.name) return;

    const foundPayee = await Payee.findOne({ clientId: client._id.toString(), name: payee.payeeName }).catch(logger.error);

    if (!foundPayee) {
      errors.push(`Payees - Line ${index + 3}: Payee ${payee.payeeName} does not exist`);
      return;
    }

    // Updating existing payee
    const existingIndex = payees.findIndex((payee) => payee.payeeId === foundPayee._id.toString());

    if (existingIndex > -1) {
      payees[existingIndex] = { payeeId: foundPayee._id.toString(), percentage: payee.percentage };
      return;
    }

    // If new payee just push
    payees.push({ payeeId: foundPayee._id.toString(), percentage: payee.percentage });
  });

  return { payees, payeeErrors: errors };
};

/**
 * Returns the total escalations for a contract
 *
 * @param {Object} contract - Contract
 */
ContractController.getEscalations = async ({ contract }) => {
  const Escalation = require('../../models/escalation');

  if (!contract) throw Error('A contract is required');

  if (!contract.escalationTracking) return contract;

  const escalations = await Escalation.find({ clientId: contract.clientId, contractId: contract._id });
  // For each escalation tracker, get the total figures from the escalations
  for (const tracker in contract.escalationTracking) {
    if (contract.escalationTracking[tracker]) {
      const contractTracker = {
        units: contract.escalationTracking[tracker].startingUnits,
        gross: contract.escalationTracking[tracker].startingGross,
        net: contract.escalationTracking[tracker].startingNet,
        startingUnits: contract.escalationTracking[tracker].startingUnits,
        startingGross: contract.escalationTracking[tracker].startingGross,
        startingNet: contract.escalationTracking[tracker].startingNet,
        escalationsAddedByPeriods: false,
      };
      for (const escalation of escalations) {
        if (escalation.trackers?.[tracker]) {
          if (!contractTracker.escalationsAddedByPeriods) { contractTracker.escalationsAddedByPeriods = true; }
          contractTracker.units += escalation.trackers[tracker].units || 0;
          contractTracker.gross += escalation.trackers[tracker].gross || 0;
          contractTracker.net += escalation.trackers[tracker].net || 0;
        }
      }
      contract.escalationTracking[tracker] = contractTracker;
    }
  }

  return contract;
};

ContractController.getPaginatedTransactions = async ({ contract, query, date = new Date() }) => {
  const CONTRACT_OPENING_BALANCE = contract.openingBalance || 0;
  const [filter, paginationParams] = getLookupParams(contract, query, date);

  const [priorSum, paginatedResult] = await Promise.all([
    getPriorSum(filter, paginationParams),
    Transaction.paginate(filter, paginationParams),
  ]);

  const { docs: transactions, totalDocs: total, totalPages } = paginatedResult;

  let balance = CONTRACT_OPENING_BALANCE + priorSum;

  const oldestToNewest = transactions.reverse();
  const transactionsWithBalance = oldestToNewest
    .map((transaction) => {
      balance += transaction.amount;
      return { ...transaction, balance };
    })
    .reverse();

  return {
    transactions: transactionsWithBalance,
    meta: {
      currentPage: paginationParams.page,
      totalPages,
      total,
    },
  };
};

async function getPriorSum(filter, paginationParams) {
  const skipToBeforeRequestedPage = paginationParams.page * paginationParams.limit;

  const result = await Transaction.aggregate([
    { $match: filter },
    { $sort: { date: -1 } },
    { $skip: skipToBeforeRequestedPage },
    { $group: { _id: null, sum: { $sum: '$amount' } } },
  ]);

  return result[0]?.sum || 0;
}

function getLookupParams(contract, query, date) {
  const page = Page.valueOrDefault(query.page, 1);
  const limit = Page.valueOrDefault(query.limit, 25);

  const filter = {
    clientId: contract.clientId.toString(),
    contractId: contract._id.toString(),
    date: { $lte: date },
  };

  if (contract.type === 'Profit Share' || contract.type === 'Profit Share - Flexible') {
    filter.isReserveRelease = { $ne: true };
    filter.isReserveWithholding = { $ne: true };
  }

  const paginationParams = {
    page,
    limit,
    sort: { date: -1 },
    lean: true,
  };

  return [filter, paginationParams];
}

ContractController.getActiveAdvances = async (contract, pointInTime) => {
  const transactions = await Transaction.find({
    clientId: contract.clientId,
    contractId: contract._id,
    date: { $lte: pointInTime },
  }, null, { sort: { date: 1 } }).lean();

  return ContractController.calculateUnrecoupedAdvances(contract.openingBalance || 0, transactions);
};

ContractController.calculateUnrecoupedAdvances = (openingBalance, transactions) => {
  let balance = openingBalance;
  let advancesInCycle = 0;
  let amountRecoupedInCycle = 0;
  let completedRecoupments = 0;

  for (const transaction of transactions) {
    const shouldCountTowardsRecoupment = transaction.amount > 0;

    if (transaction.type === 'Advance') {
      const isFullyRecouped = advancesInCycle > 0 && amountRecoupedInCycle >= advancesInCycle;

      if (isFullyRecouped) {
        completedRecoupments++;
        advancesInCycle = 0;
        amountRecoupedInCycle = 0;
      }

      // Positive advances are adjustments to the previously issued advance
      const isAdvanceAdjustment = transaction.amount > 0;
      advancesInCycle += isAdvanceAdjustment ? -transaction.amount : Math.abs(transaction.amount);
    } else if (shouldCountTowardsRecoupment) {
      amountRecoupedInCycle += transaction.amount;
    }

    balance += transaction.amount;
  }

  const recouped = Math.min(amountRecoupedInCycle, advancesInCycle);
  const isFullyRecouped = advancesInCycle > 0 && recouped >= advancesInCycle;

  if (isFullyRecouped) {
    completedRecoupments++;
  }

  return {
    overallBalance: balance,
    completedRecoupments,
    recoupment: {
      advancesIssued: advancesInCycle,
      amountRecouped: recouped,
      outstanding: isFullyRecouped ? 0 : advancesInCycle - recouped,
    },
  };
};

ContractController.activeAdvancesValidateParams = async ({ contract, curveUser, dateParam }) => {
  if (await UserAccess.isUserForbidden({
    Contract,
    Payee,
    user: curveUser,
    operation: 'read',
    type: 'contracts',
    document: contract,
    clientOnly: false,
  })) {
    return { error: { status: 403, message: 'Forbidden' } };
  }

  if (contract.type === 'Profit Share' || contract.type === 'Profit Share - Flexible') {
    return {
      error: {
        status: 400,
        message: 'Profit Share contracts do not track advance recoupment',
      },
    };
  }

  const pointInTime = dateParam ? new Date(dateParam) : new Date();
  if (dateParam && isNaN(pointInTime.getTime())) {
    return { error: { status: 400, message: 'Invalid date format' } };
  }

  return { pointInTime };
};

module.exports = ContractController;
