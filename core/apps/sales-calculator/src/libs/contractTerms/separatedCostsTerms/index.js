/* eslint-disable @typescript-eslint/no-var-requires */

const { ObjectId } = require('mongodb');
const TerritoryGroup = require('../../../models/territoryGroup');
const ContractTermGroup = require('../../../models/contractTermGroup');

const SeparatedCostsTerms = {
  get: async (contract) => {
    const terms = [];

    for (const obj of contract.costsTerms || []) {
      if (obj) {

        if (obj && obj.territory && obj.territory.length === 24 && ObjectId.isValid(obj.territory)) {
          const territoryGroup = await TerritoryGroup.findOne({ _id: obj.territory });
          if (territoryGroup) {
            obj.territory = territoryGroup.territories;
          }
        }

        if (obj && obj.type && obj.type.length === 24 && ObjectId.isValid(obj.type)) {
          const contractTermGroup = await ContractTermGroup.findById(obj.type);
          if (contractTermGroup) {
            obj.type = contractTermGroup.items.filter(Boolean);
          }
        }

        terms.push(obj);
      }
    }

    return terms;
  },
};

module.exports = SeparatedCostsTerms;
