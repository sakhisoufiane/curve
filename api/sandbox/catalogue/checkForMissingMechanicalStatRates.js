require('../models/db');
const moment = require('moment');
const { eachLimit } = require('async');
const appRootDir = require('app-root-dir').get();
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const WriteCsv = require('../libs/writeCsv');

const Client = require('../models/client');
const Contract = require('../models/contract');

function writeCSV({ writer }) {
  return new Promise((resolve, reject) => {
    writer.write((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function addData({ writer, data }) {
  return new Promise((resolve, reject) => {
    writer.addData(data, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

const scanClientContracts = async (clients) => {
  let count = 0;
  const clientsMissingStatRates = [];


  await eachLimit(clients, 100, async (client) => {
    count += 1;
    process.stdout.write(`\r⌛️ Scanned through ${count} of ${clients.length} Clients ⌛️`)

    const countQuery = { 
      clientId: client._id.toString(),
      $or: [
        { contractType: 'Mechanical' },
        { mechanicalTerms: { $not: { $size: 0 } } },
      ]
    };

    const contractCount = await Contract.countDocuments(countQuery);
    if (!contractCount) { return; }

    clientsMissingStatRates.push([ client._id.toString(), client.name ]);
  });

  console.log('\n')
  return clientsMissingStatRates;
}


const checkMissingStatRates = async () => {

  const headers = ['_id', 'name'];
  const outputLocation = `${appRootDir}/tmp/missing_state_rates_report.csv`;
  const writer = new WriteCsv({ headers, outputLocation });

  const queryUS = {
    $or: [
      {
        'usStatRates.minAmount': { $ne: 0.1270 }, 
      },
      {
        usStatRates: { $exists: false }, 
      },
    ]
  };

  const clients = await Client.find(queryUS, '_id name');
  if (!clients.length) throw new Error('Could not find any clients');

  logger.debug(`Scanning through ${clients.length} clients`);

  const clientsMissingStatRates = await scanClientContracts(clients);

  logger.debug('Adding data to writer...')
  await addData({ writer, data: clientsMissingStatRates })

  logger.debug('Writing CSV...')
  await writeCSV({ writer });

  logger.info(`🔎 Data written to CSV: ${outputLocation} 🔎`);
};

checkMissingStatRates().then(() => {
  logger.info('✅ Congrats Script Completed ✅')
  process.exit(0)
}).catch((err) => {
  logger.error('😭 🤬 Something went Wrong!!! 🤬 😭', err);
  process.exit(0)
});
