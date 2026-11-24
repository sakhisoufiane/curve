/*
Description: A script to update territories from single country to territoryCodes object
Start Time: 
End Time: 
Time To Run On Staging: 
Ticket No: CUR-2663
Category: Publishing, Works
Author: Marco Giuliani
*/
require('dotenv').config();
require('../models/db');
const async = require('async');
const { ObjectId } = require('@curveroyaltysystems/models/mongoose').Types;
const appRootDir = require('app-root-dir').get();
const WriteCsv = require('../libs/writeCsv');
const Work = require('../models/work');
const Client = require('../models/client')

const limit = 1000;
const TerritoryIPChains = [];
let count = 0;

function runWork(client, lastId, total, save, callback) {
  const filter = { clientId: client._id };
  if (lastId) {
    // if processing another batch, ensure you start after the last work in previous batch.
    filter._id = { $gt: lastId };
  }
  // query all elements from Works and sort by _id
  Work.find(filter, { _id: 1, title: 1, rightsChain: 1 }).sort({ _id: 1 }).limit(limit).exec((err, works) => {
    async.eachLimit(works, 500, (work, cb) => {
      count += 1;
      lastId = work._id;
      // Do the validation of Work territories and update the territory where required
      let update = false;
      work.rightsChain.map((chain) => {
        if (chain?.territory && !ObjectId.isValid(chain?.territory) && !(chain?.territory.toLowerCase() === 'world' || chain?.territory.toLowerCase() === 'ww' || chain?.territory === 'specific')) {
          update = true;
          console.log(`(${work._id})${work.title} - ${chain?.territory}`);
          const newTerritory = continentToTerritories(chain.territory)
          TerritoryIPChains.push(
            { client: client.name, workId: work._id, title: work.title, territory: chain.territory, newTerritory: newTerritory.join('-') }
          );
          chain.territoryCodes = {
            name: newTerritory.join(','),
            codes: newTerritory,
          };
          chain.territory = "specific";
        }
      });
      if (update && save  && save === 'true') {
        Work.findByIdAndUpdate(work._id, { $set: { rightsChain: work.rightsChain } }, { new: true, select: '_id', timestamps: false }, (err) => {
          cb();
        });
      } else {
        cb();
      }
    }, (err) => {
      // should we go get the next 'limit' documents
      if (works && works.length === limit) {
        runWork(client, lastId, total + limit, save, callback);
      } else {
        callback();
      }
    });
  });
}

const continentToTerritories = function (territory) {
  if (territory === 'Africa') {
    return ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SH', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW'];
  } if (territory === 'Americas') {
    return ['AW', 'CW', 'AI', 'AG', 'AR', 'BS', 'BB', 'BZ', 'BM', 'BO', 'BQ', 'BR', 'VG', 'CA', 'KY', 'CL', 'CO', 'CR', 'CU', 'CW', 'DM', 'DO', 'EC', 'SV', 'FK', 'GF', 'GL', 'GD', 'GP', 'GT', 'GY', 'HT', 'HN', 'JM', 'MQ', 'MX', 'MS', 'AN', 'NI', 'PA', 'PY', 'PE', 'PR', 'BL', 'KN', 'LC', 'MF', 'PM', 'VC', 'SR', 'TT', 'TC', 'US', 'UY', 'VE', 'VI', 'SX'];
  } if (territory === 'Asia') {
    return ['AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE', 'HK', 'IN', 'ID', 'IR', 'IQ', 'IL', 'JP', 'JO', 'KZ', 'KP', 'KR', 'KW', 'KG', 'LA', 'LB', 'MO', 'MY', 'MV', 'MN', 'MM', 'NP', 'OM', 'PK', 'PS', 'PH', 'QA', 'SA', 'SG', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL', 'TR', 'TM', 'AE', 'UZ', 'VN', 'YE'];
  } if (territory === 'Europe') {
    return ['AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FO', 'FI', 'FR', 'DE', 'GI', 'GR', 'GG', 'VA', 'HU', 'IS', 'IE', 'IM', 'IT', 'JE', 'LV', 'LI', 'LT', 'LU', 'MK', 'MT', 'MD', 'MC', 'ME', 'XK', 'NL', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SJ', 'SE', 'CH', 'UA', 'GB', 'AX'];
  } if (territory === 'Oceania') {
    return ['AS', 'AQ', 'AU', 'BV', 'IO', 'CX', 'CC', 'CK', 'FJ', 'PF', 'TF', 'GU', 'HM', 'KI', 'MH', 'FM', 'NR', 'NC', 'NZ', 'NU', 'NF', 'MP', 'PW', 'PG', 'PN', 'SB', 'GS', 'TK', 'TO', 'TV', 'UM', 'VU', 'WF', 'WS'];
  } if (Array.isArray(territory)) {
    return territory;
  }
  return [territory];
};

async.waterfall([
  (waterfallCb) => {
    const startTime = new Date();
    console.log(`------ Start: ${startTime} ------`); 
    if (process.argv[2]) {
      if (process.argv[2] === '--all') {
        console.log('------ processing ALL clients ------');
        const filter = {};
        waterfallCb(null, filter);
      } else {
        waterfallCb(null, { _id: process.argv[2] });
      }
    } else {
      waterfallCb('Please provide a client id, or use --all to flush through All Works')
    }
  },
  (clientFilter, waterfallCb) => {
    Client.find(clientFilter, { name: 1 }).sort({ name: 1 }).exec(waterfallCb);
  },
  (clients, waterfallCb) => {
    let clientsCount = 0;
    async.eachLimit(clients, 5, (client, eachCb) => {
      const save = (process.argv[3]) ? process.argv[3] : 'false';
      async.waterfall([
        (cb) => {
          count = 0;
          runWork(client, null, 0, save, cb);
        },
      ], (err) => {
        clientsCount += 1;
        process.stdout.write(`\rProcessed client ${clientsCount}/${clients.length}`);
        eachCb(err);
      });

    }, waterfallCb);
  },
], (err) => {
  if (err) { 
    console.log(err);
  } else {
    const outputLocation = `${appRootDir}/tmp/flushWorkIPChainsTerritories.csv`;
    const writer = new WriteCsv({ headers: ['client', 'work', 'title', 'territory', 'new territory'], outputLocation });
    const outputData = TerritoryIPChains.map((line) => [line.client, line.workId, line.title, line.territory, line.newTerritory]);
    writer.addData(outputData, () => {
      writer.write((err, location) => {
        console.log(location);
        console.log('Complete');
        const endTime = new Date();
        console.log(`------ End: ${endTime} ------`); 
        process.exit(-1); 
      });
    });
  }
});