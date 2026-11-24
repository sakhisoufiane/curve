const getLinkedDataForOptions = async (clientId, options) => {
  const Contract = require('../../models/contract');
  const Publisher = require('../../models/publisher');

  const data = { ...options };
  if (data.linkedContracts.length) {
    const contractIds = data.linkedContracts.map(({ contractId }) => contractId);
    const contracts = await Contract.find({ clientId, _id: { $in: contractIds } });
    data.linkedContracts = data.linkedContracts.map((linkedContract) => {
      const contract = contracts.find((c) => c._id.toString() === linkedContract.contractId);
      return {
        ...linkedContract,
        contractName: contract ? contract.name : '',
      };
    });
  }

  return data;
};

module.exports = getLinkedDataForOptions;
