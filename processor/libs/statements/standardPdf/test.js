const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Statement = require('./libs/standardStatement');

// TODO: Fix use from lambdaFunctions,
// var statement = new Statement({ logo: "tmp/Logo.jpg", contractType: "Profit Share", profitShareRate: 50, profitShareNetAmount: 100, openingBalance: -123.45, advance: -10000, runNo: 2, address: "Label Name\n11 Street Name\nThe Town \nEast Sussex\nBN1 1EJ", currencySymbol: "£", periodName: "January - June 2017", year: 2017, accountingPeriod: "H1", contractName: "An Artist's Name", netAmount: 4321.98, netCosts: 7654.94, netOutput: 6543.76, contactEmail: "tom.allen@metable.co", customText: "Please raise invoice to us at Curve Royalty Systems, 150 Tooley Street, London", analysis: { net: { distributionChannels: [{ type: "Digital", value: 7654.32 }, { type: "Physical", value: 8763 }], configurationByDistributionChannel: [{ value: 4015.570341909632, units: 1227964, configuration: "Premium Stream", distributionChannel: "Digital" }, { value: 1682072.809861411, units: 1375247, configuration: "Download", distributionChannel: "Digital" }], costs: [{ type: "Promo", value: 123.45 }, { type: "Manufacturing", value: 123.45 }, { type: "", value: 543.32 }] } }, transactions: [ { name: "One", value: 123 }, { name: "Two", value: -432 }, { name: "Three", type: "Advance", value: 123 } ] });
const statement = new Statement({
  statementType: 'Standard',
  statementDesign: 'Standard',
  s3WriteKey: 'statements/5c3b7f2f57d4a1be94400f24/2017 - H1 Butch Vig - Nevermind.pdf',
  accessKey: 'AKIAJ4P3SJWE4DPV7XHA',
  secretAccessKey: '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',
  region: 'eu-west-1',
  bucket: 'curve-royalties-production',
  logo: 'tmp/Logo.jpg',
  address: 'Curve Royalties\n150 Tooley Street\nLondon\nSE1 2TU\nUK\n123456789\n987654321',
  removeFooterImage: undefined,
  year: 2017,
  accountingPeriod: 'H1',
  periodName: 'H1 - 2017',
  contractName: 'Butch Vig - Nevermind',
  contractType: 'Profit Share',
  clientType: 'Label',
  analysis:
   {
     net:
      {
        costs: [],
        works: [],
        releases:
         [{
           type: 'NEVER001LP',
           title: 'Nevermind Changed and a really long title',
           units: 8,
           value: 64.301300000000005,
         },
         {
           type: 'NEVER001DD',
           title: 'Nevermind',
           units: 1011625,
           value: 1653856.0000000002,
         },
         {
           type: 'NEVER001', title: 'Nevermind and a really really r e a l l y really long title', units: 30, value: 2624.19,
         },
         {
           type: 'NEVER001LP',
           title: 'Nevermind Changed',
           units: 8,
           value: 69.301300000000005,
         },
         {
           type: 'NEVER001DD',
           title: 'Nevermind',
           units: 1011625,
           value: 1553856.0000000002,
         },
         {
           type: 'NEVER001', title: 'Nevermind', units: 30, value: 2621.19,
         },
         {
           type: 'NEVER001LP',
           title: 'Nevermind Changed',
           units: 8,
           value: 63.301300000000005,
         },
         {
           type: 'NEVER001DD',
           title: 'Nevermind',
           units: 1011625,
           value: 1553856.0000000002,
         },
         {
           type: 'NEVER001', title: 'Nevermind', units: 30, value: 4262.19,
         },
         {
           type: 'NEVER001LP',
           title: 'Nevermind Changed',
           units: 8,
           value: 636.301300000000005,
         },
         {
           type: 'NEVER001DD',
           title: 'Nevermind',
           units: 1011625,
           value: 15523856.0000000002,
         },
         {
           type: 'NEVER001', title: 'Nevermind', units: 30, value: 2362.19,
         }],
        configurations:
         [{ type: 'LP', units: 8, value: 63.301300000000005 },
           { type: 'Download', units: 5122092, value: 1566281.8430897922 },
           {
             type: 'Premium Stream',
             units: 12955982,
             value: 39165.622642432005,
           },
           { type: 'CD', units: 30, value: 262.19 }],
        sources:
         [{ type: 'Believe', units: 18078074, value: 1605447.465732224 },
           { type: 'Essential', units: 38, value: 325.4913 }],
        territories:
         [{ type: 'ZA', units: 79514, value: 240.36891366400002 },
           { type: 'AU', units: 78346, value: 236.83807769600003 },
           { type: 'CA', units: 15654, value: 47.321666304000004 },
           { type: 'GB', units: 2878154, value: 332334.64538720006 },
           { type: 'IT', units: 101514, value: 134663.11267712002 },
           { type: 'US', units: 2486818, value: 160366.131262336 },
           { type: 'IE', units: 2, value: 13.823 },
           { type: 'RU', units: 74473, value: 225.13009164800002 },
           { type: 'NL', units: 2550348, value: 179616.90592784 },
           { type: 'DE', units: 2987449, value: 382313.95792627207 },
           { type: 'BE', units: 2424364, value: 287602.983485184 },
           { type: 'FR', units: 2318699, value: 121815.55373260801 },
           { type: 'FI', units: 2082777, value: 6296.184884352001 }],
        configurationByDistributionChannel:
         [{
           distributionChannel: 'Physical',
           configuration: 'LP',
           units: 8,
           value: 63.301300000000005,
         },
         {
           distributionChannel: 'Digital',
           configuration: 'Premium Stream',
           units: 12955982,
           value: 39165.622642432005,
         },
         {
           distributionChannel: 'Digital',
           configuration: 'Download',
           units: 5122092,
           value: 1566281.8430897922,
         },
         {
           distributionChannel: 'Physical',
           configuration: 'CD',
           units: 30,
           value: 262.19,
         }],
        distributionChannels:
         [{ type: 'Digital', units: 18078074, value: 1605447.465732224 },
           { type: 'Physical', units: 38, value: 325.4913 }],
        tracks:
         [{
           type: 'GB7QY1700012',
           title: 'Something in the Way',
           units: 1296637,
           value: 3919.7025317120006,
         },
         {
           type: 'GB7QY1700011',
           title: 'On a Plain',
           units: 1412535,
           value: 4270.059404160001,
         },
         {
           type: 'GB7QY1700004',
           title: 'Breed',
           units: 1366953,
           value: 4132.266112128001,
         },
         {
           type: 'GB7QY1700003',
           title: 'Come as You Are',
           units: 1686778,
           value: 5099.089411328001,
         },
         {
           type: 'GB7QY1700001',
           title: 'Smells Like Teen Spirit',
           units: 1285271,
           value: 3885.343386496,
         },
         {
           type: 'GB7QY1700009',
           title: 'Lounge Act',
           units: 1295799,
           value: 3917.1692778240003,
         },
         {
           type: 'GB7QY1700002',
           title: 'In Bloom',
           units: 1481303,
           value: 4477.943417728,
         },
         {
           type: 'GB7QY1700006',
           title: 'Polly',
           units: 1336348,
           value: 4039.7479316480003,
         },
         {
           type: 'GB7QY1700005',
           title: 'Lithium',
           units: 1367033,
           value: 4132.507950208001,
         },
         {
           type: 'GB7QY1700008',
           title: 'Drain You',
           units: 1390462,
           value: 4203.3332549120005,
         },
         {
           type: 'GB7QY1700010',
           title: 'Stay Away',
           units: 1555744,
           value: 4702.976774144001,
         },
         {
           type: 'GB7QY1700007',
           title: 'Territorial Pissings',
           units: 1591586,
           value: 4811.326279936001,
         }],
        subSources:
         [{ type: 'Spotify', units: 4568965, value: 538950.013858304 },
           { type: 'iTunes', units: 4343534, value: 370416.755089792 },
           { type: 'Proper: HMV', units: 1, value: 4.9456 },
           {
             type: 'Proper Distribution',
             units: 22,
             value: 209.49980000000002,
           },
           { type: 'Deezer', units: 4808897, value: 682910.5637504001 },
           { type: 'Amazon', units: 11, value: 82.72 },
           {
             type: 'Apple Music',
             units: 4356678,
             value: 13170.133033728001,
           },
           { type: 'Windsong International', units: 2, value: 15.3014 },
           { type: 'Bertus', units: 2, value: 13.0245 }],
      },
   },
  homeCurrency: 'GBP',
  currencySymbol: '€',
  grossAmount: 1605772.9570322242,
  netAmount: 1605772.9570322242,
  grossCosts: 0,
  netCosts: 0,
  netOutput: 1605691.5842072242,
  reservesWithheld: 81.372825,
  reservesReleased: 0,
  offsetColour: undefined,
  contactEmail: 'tom@curveroyaltysystems.com',
  customText: 'This is the statement custom text',
  profitShareRate: 50,
  profitShareNetAmount: 1605691.5842072242,
  openingBalance: -5000,
  runNo: 7,
  advance: -100000,
  transactions: [{
    _id: '5c3b7eb7e4928216fce960d2', contractId: '59da571c96a95e61da9ee6e2', type: 'Other', name: 'Drugs Payment', date: '2017-02-14T00:00:00.000Z', amount: -2000000, clientId: '59da4fa608ca3f61f2051385', userCreated: true, createdAt: '2019-01-13T18:08:55.531Z', updatedAt: '2019-01-13T18:08:55.531Z', __v: 0, balance: -1995000,
  }, {
    _id: '5c3b7f3057d4a1be94400f29', statementId: '5c3b7f2f57d4a1be94400f24', clientId: '59da4fa608ca3f61f2051385', contractId: '59da571c96a95e61da9ee6e2', name: 'H1 - 2017 Sales', date: '2017-06-30T00:00:00.000Z', userCreated: false, amount: 1605772.9570322242, createdAt: '2019-01-13T18:10:56.959Z', updatedAt: '2019-01-13T18:10:56.959Z', __v: 0, balance: -389227.04296777584,
  }, {
    _id: '5c3b7f3157d4a1be94400f40', statementId: '5c3b7f2f57d4a1be94400f24', clientId: '59da4fa608ca3f61f2051385', contractId: '59da571c96a95e61da9ee6e2', name: 'H1 - 2017 Distribution Fees', amount: 0, date: '2017-06-30T00:00:00.000Z', userCreated: false, createdAt: '2019-01-13T18:10:57.082Z', updatedAt: '2019-01-13T18:10:57.082Z', __v: 0, balance: -389227.04296777584,
  }, {
    _id: '5c3b7f3157d4a1be94400f44', statementId: '5c3b7f2f57d4a1be94400f24', clientId: '59da4fa608ca3f61f2051385', contractId: '59da571c96a95e61da9ee6e2', name: 'H1 - 2017 Costs', amount: 0, date: '2017-06-30T00:00:00.000Z', userCreated: false, createdAt: '2019-01-13T18:10:57.106Z', updatedAt: '2019-01-13T18:10:57.106Z', __v: 0, balance: -389227.04296777584,
  }],
});
statement.create('test.pdf', (fileLocation) => {
  logger.debug(fileLocation);
});
