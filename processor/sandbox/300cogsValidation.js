require('../models/db');
const Client = require('../models/client');
const Release = require('../models/release');
const Track = require('../models/track');
const Period = require('../models/period');
const AccountingPeriod = require('../models/accountingPeriod');
const netsuiteCogs = require('../libs/accounting/netsuiteCogs');
const ObjectId = require('mongodb').ObjectId;
const async = require('async');
const { BigQuery, databaseUtils, logger } = require('@curveroyaltysystems/platform-shared-utils');

const isrcs = ['QMCE31801742', 'QMCE31801827', 'QMCE31801828', 'QMCE31801934', 'QMCE31801935', 'QMCE31801936', 'QMCE31801937', 'QMCE31801938', 'QMCE31801940', 'QMCE31801941', 'QMCE31801942', 'QMCE31801943', 'QMCE31801944', 'QMCE31801945', 'QMCE31801946', 'QMCE31801979', 'QMCE31802115', 'QMCE31802121', 'QMCE31892009', 'QMCE31902063', 'QMCE31902098', 'QMCE31902099', 'QMCE31902419', 'QMCE31902434', 'QMCE31902435', 'QMCE31992111', 'QMCE32000094', 'USAT21905056', 'USXYNWMELLY', 'UYAYNWME001'];
const catNos = ['814908026624', '810043680448', 'QMCE31892009', 'QMCE31902063', 'QMCE31902098', 'QMCE31902099', 'QMCE31902434', 'QMCE31902435', 'QMCE31992111', 'USAT21905056', '814908028727', '814908027140', '814908027195', '814908026372', '814908026068', '814908026075', '814908025771'];

async.parallel({
  trackIds: (cb) => {
    Track.find({ clientId: '5d9b4089eb5f3f79c6ffaf69', isrc: { $in: isrcs } }, (err, tracks) => {
      const trackIds = tracks.map(track => { return track._id.toString() });
      cb(null, trackIds);
    });
  },
  releaseIds: (cb) => {
    Release.find({ clientId: '5d9b4089eb5f3f79c6ffaf69', catNo: { $in: catNos } }, (err, releases) => {
      const releaseIds = releases.map(release => { return release._id.toString() });
      cb(null, releaseIds);
    });
  },
}, (err, result) => {
  AccountingPeriod.findById('614205803b361f070cbea024', (err, accountingPeriod) => {
    Client.findById(accountingPeriod.clientId, (err, client) => {
      Period.findById(accountingPeriod.periodId, 'salesFilesIds', (err, period) => {
        const filter = {
          salesFileId: { $in: period.salesFilesIds },
          $or: [
            { releaseId: { $in: result.releaseIds } },
            { trackId: { $in: result.trackIds } },
          ]
        };
        const selector = [
          { column: 'salesFileId', displayAs: 'salesFileId', isSelector: true, isGroupBy: true },
          { column: 'releaseId', displayAs: 'releaseId', isSelector: true, isGroupBy: true },
          { column: 'trackId', displayAs: 'trackId', isSelector: true, isGroupBy: true },
          { column: 'contractId', displayAs: 'contractId', isSelector: true, isGroupBy: true },
          { column: 'catType', displayAs: 'catType', isSelector: true, isGroupBy: true },
          { column: 'distributionChannel', displayAs: 'distributionChannel', isSelector: true, isGroupBy: true },
        ];
        const sumColumn = [
          { column: 'homeCurrencyGrossAmount', displayAs: 'homeCurrencyGrossAmount' },
          { column: 'homeCurrencyNetAmount', displayAs: 'homeCurrencyNetAmount' },
        ];
        const bigQueryOpts = databaseUtils.getBigQueryOpts(client);
        bigQueryOpts.accountingTable = client.bigQueryAccountingPeriodSales;
        const bigQuery = new BigQuery(bigQueryOpts);
        bigQuery.getAggregate(client.bigQuerySalesTable, selector, sumColumn, 'lines', filter, {}, (err, data) => {
          let output = { salesFiles: [], releaseIds: [], trackIds: [] };
          data.forEach((line) => {
            if (!output[line.distributionChannel]) {
              output[line.distributionChannel] = 0;
            }
            output[line.distributionChannel] += line.homeCurrencyNetAmount;
            if (!output.salesFiles.includes(line.salesFileId)) {
              output.salesFiles.push(line.salesFileId);
            }
            if (line.releaseId && !output.releaseIds.includes(line.releaseId)) {
              output.releaseIds.push(line.releaseId);
            }
            if (line.trackId && !output.trackIds.includes(line.trackId)) {
              output.trackIds.push(line.trackId);
            }
          });
          console.log(output);
        });
      });
    });
  });
});


