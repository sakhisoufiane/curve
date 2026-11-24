require('dotenv').config();
require('../models/db');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const appRootDir = require('app-root-dir').get();
const WriteCsv = require('../libs/writeCsv');
const Composer = require('../models/composer');
const Client = require('../models/client')

const limit = 1000;
let count = 0;
let allContainsInvaidPartyNoReport = [];
let allContainsInvaidPartyNo = [];
let save = 'false';

function runComposer(client, save, callback) {
  const aggregation = [
    {
      $match: {
        clientId: client._id.toString(),
      },
    },
    {
      $group: {
        _id: {
          partyNo: "$partyNo",
          clientId: "$clientId",
        },
        // group by partyNo
        count: {
          $sum: 1,
        },
        // count the number of documents
        partyNo: {
          $first: "$partyNo",
        }, // include the partyNo field in the result using the $first operator
      },
    },
    {
      $match: {
        count: {
          $gt: 1,
        }, // filter the groups to only include those with a count greater than 1
      },
    },
    {
      $project: {
        // exclude the _id field from the result
        _id: 1,
        partyNo: 1,
        // include the partyNo field in the result
        count: 1, // include the count field in the result
      },
    },
  ];
  Composer.aggregate(aggregation, (err, data) => {
    if (err) {
      callback(err);
      return;
    }

    const combinedArray = allContainsInvaidPartyNoReport.concat(data);
    allContainsInvaidPartyNoReport = combinedArray;

    if (data && data.length && save && save === 'true') {
      async.eachSeries(data, (duplicate, duplicateCb) => {
        filter = { clientId: client._id.toString(), partyNo: duplicate.partyNo };
        Composer.find(filter).sort({ createdAt: 1 }).exec((err, composers) => {
          if (err) {
            duplicateCb(err);
            return;
          }

          let count = 0;
          async.eachSeries(composers, (composer, cb) => {
            count += 1;
            if (count > 1) {
              const oldPartyNo = composer.partyNo;
              composer.partyNo = null;
              composer.issuePartyNo(() => {
                Composer.findByIdAndUpdate(composer._id, { $set: { partyNo: composer.partyNo } }, { timestamps: false }, (err) => {
                  allContainsInvaidPartyNo.push({ clientName: client.name, composer: composer.name, partyNo: oldPartyNo, newPartyNo: composer.partyNo })
                  cb();
                });
              });
            } else {
              cb();
            }
          }, (err) => {
            if (err) {
              console.log(err);
              duplicateCb();
            } else {
              console.log();
              console.log(`${duplicate.partyNo} - Done`);
              duplicateCb();
            }
          });
        });
      }, (err) => {
        if (err) {
          callback(err);
        } else {
          callback();
        }
      });
    } else {
      callback();
    }
  });
}

async.waterfall([
  (waterfallCb) => {
    if (process.argv[2]) {
      if (process.argv[2] === '--all') {
        console.log('------ processing ALL clients ------');
        const filter = {};
        waterfallCb(null, filter);
      } else {
        waterfallCb(null, { _id: process.argv[2] });
      }
    } else {
      waterfallCb('Please provide a client id, or use --all to flush through All Release validations')
    }
  },
  (clientFilter, waterfallCb) => {
    Client.find(clientFilter, { name: 1 }).sort({ name: 1 }).exec(waterfallCb);
  },
  (clients, waterfallCb) => {
    async.eachLimit(clients, 10, (client, eachCb) => {
      save = (process.argv[3]) ? process.argv[3] : 'false';
      console.log(`---- processing client: ${client.name} ----`);
      async.waterfall([
        (cb) => {
          console.log('>>>>>> processing Composers  <<<<<<');
          count = 0;
          runComposer(client, save, cb);
        },
      ], eachCb);

    }, waterfallCb);
  },
], (err) => {
  if (err) {
    console.log(err);
    process.exit(-1); 
  }
  else {
    const outputLocation = `${appRootDir}/tmp/flushComposerPartyNo.csv`;
    if (save === 'true') {
      const writer = new WriteCsv({ headers: ['client', 'composer', 'partyNo', 'newPartyNo'], outputLocation });
      const outputData = allContainsInvaidPartyNo.map((line) => [line.clientName, line.composer, line.partyNo, line.newPartyNo]);
      writer.addData(outputData, () => {
        writer.write((err, location) => {
          console.log(location);
          console.log('Complete');
          process.exit(-1); 
        });
      });
    } else {
      const writer = new WriteCsv({ headers: ['client', 'count', 'partyNo'], outputLocation });
      const outputData = allContainsInvaidPartyNoReport.map((line) => [line._id.clientId, line.count, line.partyNo]);
      writer.addData(outputData, () => {
        writer.write((err, location) => {
          console.log(location);
          console.log('Complete');
          process.exit(-1); 
        });
      });
    }
  }
});
