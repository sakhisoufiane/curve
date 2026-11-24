require('dotenv').config();
require('../../models/db');
const { eachLimit, eachSeries, timeout } = require('async');
const { logger, BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const Track = require('../../models/track');
const Client = require('../../models/client');
const importXlsx = require('../../libs/importXlsx');

// const path = '/Users/attilio/api/tmp/Test.xlsx'
const path = '/Users/attilio/api/tmp/Depuracion tracks curve - With New Track ID 20251111.xlsx'
const clientId = '64f09b957aa52d695e374f50'

function getXlsxData(path) {
  return new Promise((resolve, reject) => {
    importXlsx.getData(path, 0, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}
async function transferSalesOnTracks(path, clientId) {
  try {
    const data = await getXlsxData(path);
    const client = await Client.findById(clientId)
     const bigQuery = new BigQuery({
    datasetName: client.bigQueryDataset,
    inputTable: client.bigQuerySalesTable,
    outputTable: client.bigQueryPeriodSales,
    costsTable: client.bigQueryPeriodCosts,
  });
    console.log('Data:', data);
    data.shift(); 
    // console.log(data)
await eachLimit(data, 1, async (item) => {
  const isrc = item[1];
  const oldTrackId = item[7];
  const newTrackId = item[8];

  const track = await Track.findOne({ clientId, isrc, _id: oldTrackId });

  if (track) {
    console.log('Track Found', track.title);

    await new Promise((resolve, reject) => {
      bigQuery.updateData(
        bigQuery.inputTable,
        { trackId: oldTrackId },
        { trackId: newTrackId },
        (err, response) => (err ? reject(err) : resolve(response))
      );
    });

    await new Promise(r => setTimeout(r, 500)); // delay
  } else {
    console.log('Not found');
  }
});

console.log('complete!')
    // You can use data here safely
  } catch (err) {
    console.error('Error reading XLSX:', err);
  }
}

transferSalesOnTracks(path, clientId)