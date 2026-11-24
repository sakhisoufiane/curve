/**
 * Category: Works
 * Description: Update duplicate identifiers using the Work model issueIdentifier method
 * 
 * node sandbox/flushWorkIdentifier.js [clientID] [save]
 * params:
 * [clientID] = id of client to flush ir --all to do all clients
 * [save] = true or false if change to be committed to DB
 * 
 * Output is a report stored in /tmp/flushWorkIdentifier.csv
 * The report includes the identifier pre and post change
 * 
 * Autor: Marco G
 * 
 * Tickets using this script: SUP-510
 * 
 */
require('dotenv').config();
require('../models/db');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const appRootDir = require('app-root-dir').get();
const WriteCsv = require('../libs/writeCsv');
const Work = require('../models/work');
const Client = require('../models/client')

const limit = 1000;
let count = 0;
let now;
let allContainsInvaidIdentifierReport = [];
let allContainsInvaidIdentifier = [];
let save = 'false';

function runWork(client, save, callback) {
  const aggregation = [
    {
      $match: {
        clientId: client._id.toString(),
        identifier: { $ne: null, $ne: "" },
      },
    },
    {
      $group: {
        _id: {
          identifier: { $toLower: "$identifier" },
          clientId: "$clientId",
        },
        // group by identifier
        count: {
          $sum: 1,
        },
        // count the number of documents
        identifier: {
          $first: "$identifier",
        }, // include the identifier field in the result using the $first operator
      },
    },
    {
      $match: {
        count: {
          $gt: 1,
        }, // filter the groups to only include those with a count greater than 1
        identifier: { $ne: null},
      },
    },
    {
      $project: {
        // exclude the _id field from the result
        _id: 1,
        identifier: 1,
        // include the identifier field in the result
        count: 1, // include the count field in the result
      },
    },
  ];
  Work.aggregate(aggregation, (err, data) => {
    if (err) {
      callback(err);
      return;
    }

    const combinedArray = allContainsInvaidIdentifierReport.concat(data);
    allContainsInvaidIdentifierReport = combinedArray;

    if (data && data.length && save && save === 'true') {
      async.eachSeries(data, (duplicate, duplicateCb) => {
        const regex = new RegExp(duplicate.identifier, 'i');
        const regexIdentifier = { $regex: regex };
        filter = { clientId: client._id.toString(), identifier: regexIdentifier };
        Work.find(filter).sort({ createdAt: 1 }).exec((err, works) => {
          if (err) {
            duplicateCb(err);
            return;
          }

          let count = 0;
          async.eachSeries(works, async (work) => {
            count += 1;
            if (count > 1) {
              const oldIdentifier = work.identifier;
              while (true) {
                const claimed = await Client.findOneAndUpdate(
                  { _id: client._id, issueIdentifier: true },
                  [{
                    $set: {
                      identifierSequence: {
                        $max: [
                          { $add: [{ $ifNull: ['$identifierSequence', 0] }, 1] },
                          { $ifNull: ['$identifierStartFrom', 1] },
                        ],
                      },
                    },
                  }],
                  { new: true }
                );
                if (!claimed) break;
                const newIdentifier = claimed.identifierPrefix
                  ? `${claimed.identifierPrefix}${claimed.identifierSequence}`
                  : String(claimed.identifierSequence);
                const exists = await Work.findOne({ clientId: client._id.toString(), identifier: newIdentifier }).lean();
                if (!exists) {
                  await Work.findByIdAndUpdate(work._id, { $set: { identifier: newIdentifier, identifierNo: claimed.identifierSequence } }, { timestamps: false });
                  allContainsInvaidIdentifier.push({ clientName: client.name, work: work.title, identifier: oldIdentifier, newIdentifier });
                  break;
                }
              }
            }
          }, (err) => {
            if (err) {
              console.log(err);
              duplicateCb();
            } else {
              console.log();
              console.log(`${duplicate.identifier} - Done`);
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
    now = new Date();
    console.log('Start date and time:', now);
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
          console.log('>>>>>> processing Works  <<<<<<');
          count = 0;
          runWork(client, save, cb);
        },
      ], eachCb);

    }, waterfallCb);
  },
], (err) => {
  now = new Date();
  console.log('End date and time:', now);
  if (err) {
    console.log(err);
    process.exit(-1); 
  }
  else {
    const outputLocation = `${appRootDir}/tmp/flushWorkIdentifier.csv`;
    if (save === 'true') {
      const writer = new WriteCsv({ headers: ['client', 'work', 'identifier', 'newIdentifier'], outputLocation });
      const outputData = allContainsInvaidIdentifier.map((line) => [line.clientName, line.work, line.identifier, line.newIdentifier]);
      writer.addData(outputData, () => {
        writer.write((err, location) => {
          console.log(location);
          console.log('Complete');
          process.exit(-1); 
        });
      });
    } else {
      const writer = new WriteCsv({ headers: ['client', 'count', 'identifier'], outputLocation });
      const outputData = allContainsInvaidIdentifierReport.map((line) => [line._id.clientId, line.count, line.identifier]);
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
