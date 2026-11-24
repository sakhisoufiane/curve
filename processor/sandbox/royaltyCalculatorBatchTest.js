const batchValues = {
  releaseId:
   ['5dc48ba5ba6086e1e72a1a19',
     '5e41f310019b49447306d594',
     '5dc48b29ba6086e1e72a1655',
     '5dc48b61ba6086e1e72a1877'],
  trackId: [],
  workId: [],
  contractId: [],
  catType: ['Release'],
  territory:
   ['GB',
     'US',
     'VN',
     'MX',
     'TH',
     'TW',
     'ID',
     'MY',
     'SG',
     'CA',
     'AU',
     'RU',
     'UA',
     'IT',
     'IN',
     'SE',
     'BE',
     'DE',
     'CZ',
     'FR'],
  distributionChannel: ['Licensing', 'Digital'],
  configuration: ['Download', 'Stream'],
  priceCategory: [],
  source: ['Because Music', 'iTunes', 'Warner AU'],
};

const salesFilter = {
  filter: {
    catType: 'Release',
    status: 'Complete',
    salesFileId:
     {
       $in:
        ['5e85374311bf7d39dd4af5ef',
          '5e8538511fa76f19013e8fac',
          '5e505cc8f2a4d05df1b6d1d8'],
     },
    releaseId:
     {
       $in:
        ['5dc48a97ba6086e1e72a11a5',
          '5dc48b29ba6086e1e72a1655',
          '5dc48b61ba6086e1e72a1877',
          '5dc48ba5ba6086e1e72a1a19',
          '5dc48bb6ba6086e1e72a1a55',
          '5dc48c5fba6086e1e72a1f92',
          '5e41f310019b49447306d594'],
     },
    $or:
     [{
       catType: 'Track',
       trackId:
          { $in: ['5dc48bf7ba6086e1e72a1c89', '5dc48bf7ba6086e1e72a1c8f'] },
     }],
  },
};

const RoyaltyCalculator = require('../libs/calculateSales/royaltyCalculator');

const royaltyCalc = new RoyaltyCalculator(null, null, null, null, null, null, null, null, null, null, null, null, null, [], [], null, null, null);
const result = royaltyCalc.salesFilterMatchesBatch(salesFilter, batchValues);
console.log(result);
