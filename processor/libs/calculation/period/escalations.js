const Period = require('../../../models/period');
const Contract = require('../../../models/contract');
const Escalation = require('../../../models/escalation');

const Escalations = {
  getEscalationStartingFigures: async (period) => {
    const { recalculation } = period;
    // Get starting figures by summing up all escalations from previous periods.
    const filter = { clientId: period.clientId, startDate: { $lt: period.startDate } };
    // When dealing with a recalculation, only reset the escalations for the recalculated contracts
    if (recalculation.contractIds?.length || recalculation.salesFiles?.contractIds?.length) {
      let contractIds = [];

      if (recalculation.contractIds?.length) {
        contractIds = [...contractIds, ...recalculation.contractIds];
      }
      if (recalculation.salesFiles?.contractIds?.length) {
        contractIds = [...contractIds, ...recalculation.salesFiles.contractIds];
      }

      filter.contractId = { $in: contractIds };
    } else {
      // Otherwise get all the contracts the period is going to calculate
      const contractsFilter = { clientId: period.clientId, accountingPeriod: period.accountingPeriodType, active: true };
      contractsFilter.contractType = period.contractType === 'Mechanical' ? 'Mechanical' : { $ne: 'Mechanical' };
      const contractIds = (await Contract.find(contractsFilter).select('_id')).map((contract) => contract._id);
      filter.contractId = { $in: contractIds };
    }
    // Get contracts matching filter
    const contracts = await Contract.find({ clientId: filter.clientId, _id: filter.contractId }).select('escalationTracking');
    // Get starting escalation by contract
    const escalationsByContract = {};
    contracts.forEach((contract) => {
      escalationsByContract[contract._id.toString()] = {};
      if (contract.escalationTracking) {
        Object.keys(contract.escalationTracking).forEach((tracker) => {
          escalationsByContract[contract._id.toString()][tracker] = {
            units: contract.escalationTracking[tracker].startingUnits,
            gross: contract.escalationTracking[tracker].startingGross,
            net: contract.escalationTracking[tracker].startingNet,
          };
        });
      }
    });
    // Get total escalation per contract before the current period
    const escalations = await Escalation.find(filter);
    escalations.forEach((escalation) => {
      if (escalation.trackers) {
        // For each of the escalation trackers, add the escalations to the contracts object
        Object.keys(escalation.trackers).forEach((tracker) => {
          escalationsByContract[escalation.contractId][tracker] = escalationsByContract[escalation.contractId][tracker] || { units: 0, gross: 0, net: 0 };
          escalationsByContract[escalation.contractId][tracker].units += escalation.trackers[tracker].units;
          escalationsByContract[escalation.contractId][tracker].gross += escalation.trackers[tracker].gross;
          escalationsByContract[escalation.contractId][tracker].net += escalation.trackers[tracker].net;
        });
      }
    });

    // Format escalationsByContract and save against the period. This allows us to reuse to pre-refactoring logic with the new escalations collection.
    const escalationStartingFigures = [];
    Object.keys(escalationsByContract).forEach((contractId) => {
      escalationStartingFigures.push({ contractId, escalationTracking: escalationsByContract[contractId] });
    });
    // Save the starting figures against the period

    // logger.debug({ escalationStartingFigures });
    await Period.findByIdAndUpdate(period._id, { $set: { escalationStartingFigures } });
  },
};

module.exports = Escalations;
