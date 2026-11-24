/* eslint-disable @typescript-eslint/no-var-requires */
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const { ObjectId } = require('mongodb');
const Release = require('../../../models/release.js');
const Track = require('../../../models/track.js');
const Work = require('../../../models/work.js');
const TerritoryGroup = require('../../../models/territoryGroup.js');
const ContractTermGroup = require('../../../models/contractTermGroup.js');

const SeparatedWithholdingTaxTerms = {
  get: async (contract) => {
    const terms = [];
    for (const obj of contract.withholdingTaxTerms || []) {
      if (obj) {
        // Releases
        if (obj.catalogueGroup) {
          const releases = await Release.find({ clientId: contract.clientId, catalogueGroups: obj.catalogueGroup }, { _id: 1 });
          obj.releaseIds = releases.map((release) => release._id.toString());
        }

        // Tracks
        if (obj.catalogueGroup) {
          const tracks = await Track.find({ clientId: contract.clientId, catalogueGroups: obj.catalogueGroup }, { _id: 1 });
          obj.trackIds = tracks.map((track) => track._id.toString());
        }

        // Works
        if (obj.catalogueGroup) {
          const works = await Work.find({ clientId: contract.clientId, catalogueGroups: obj.catalogueGroup }, { _id: 1 });
          obj.workIds = works.map((work) => work._id.toString());
        }
        
        // Territory Group
        if (obj && obj.territory && obj.territory.length === 24 && ObjectId.isValid(obj.territory)) {
          const territoryGroup = await TerritoryGroup.findOne({ _id: obj.territory });
          if (territoryGroup) {
            obj.territory = territoryGroup.territories;
          }
        }

        // Contract Term Group from channel
        if (obj && obj.channel && obj.channel.length === 24 && ObjectId.isValid(obj.channel)) {
          const contractTermGroup = await ContractTermGroup.findById(obj.channel);
          if (contractTermGroup) {
            obj.channel = contractTermGroup.items.filter(Boolean);
          }
        }

        // Contract Term Group from configuration
        if (obj && obj.configuration && obj.configuration.length === 24 && ObjectId.isValid(obj.configuration)) {
          const contractTermGroup = await ContractTermGroup.findById(obj.configuration);
          if (contractTermGroup) {
            obj.configuration = contractTermGroup.items.filter(Boolean);
          }
        }

        // Contract Term Group from priceCategory
        if (obj && obj.priceCategory && obj.priceCategory.length === 24 && ObjectId.isValid(obj.priceCategory)) {
          const contractTermGroup = await ContractTermGroup.findById(obj.priceCategory);
          if (contractTermGroup) {
            obj.priceCategory = contractTermGroup.items.filter(Boolean);
          }
        }

        // Contract Term Group from source
        if (obj && obj.source && obj.source.length === 24 && ObjectId.isValid(obj.source)) {
          const contractTermGroup = await ContractTermGroup.findById(obj.source);
          if (contractTermGroup) {
            obj.source = contractTermGroup.items.filter(Boolean);
          }
        }

        if (obj.catalogueGroup && obj.catalogueGroup !== 'All'
          && (!obj.releaseIds || (obj.releaseIds && obj.releaseIds.length === 0))
          && (!obj.trackIds || (obj.trackIds && obj.trackIds.length === 0))
          && (!obj.workIds || (obj.workIds && obj.workIds.length === 0))
        ) {
          // Don't add terms when object group exists but doesn't have any catalogue
          logger.info(`Not adding term due to no catalogue associated with group:${JSON.stringify(obj)}`);
        } else {
          terms.push(obj);
        }
      }
    }


    return terms;
  },
};

module.exports = SeparatedWithholdingTaxTerms;
