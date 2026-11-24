require('dotenv').config();
require('../models/db');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const appRootDir = require('app-root-dir').get();
const WriteCsv = require('../libs/writeCsv');
const Publisher = require('../models/publisher');
const Client = require('../models/client')

const limit = 1000;
let count = 0;
let allContainsInvaidPartyNoReport = [];
let allContainsInvaidPartyNo = [];
let save = 'false';

function runPublisher(client, save, callback) {
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
  Publisher.aggregate(aggregation, (err, data) => {
    if (err) {
      callback(err);
      return;
    }

    const combinedArray = allContainsInvaidPartyNoReport.concat(data);
    allContainsInvaidPartyNoReport = combinedArray;

    if (data && data.length && save && save === 'true') {
      async.eachSeries(data, (duplicate, duplicateCb) => {
        filter = { clientId: client._id.toString(), partyNo: duplicate.partyNo };
        Publisher.find(filter).sort({ createdAt: 1 }).exec((err, publishers) => {
          if (err) {
            duplicateCb(err);
            return;
          }

          let count = 0;
          async.eachSeries(publishers, (publisher, cb) => {
            count += 1;
            if (count > 1) {
              const oldPartyNo = publisher.partyNo;
              publisher.partyNo = null;
              publisher.issuePartyNo(() => {
                Publisher.findByIdAndUpdate(publisher._id, { $set: { partyNo: publisher.partyNo } }, { timestamps: false }, (err) => {
                  allContainsInvaidPartyNo.push({ clientName: client.name, publisher: publisher.name, partyNo: oldPartyNo, newPartyNo: publisher.partyNo })
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
          console.log('>>>>>> processing Publishers  <<<<<<');
          count = 0;
          runPublisher(client, save, cb);
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
    const outputLocation = `${appRootDir}/tmp/flushPublisherPartyNo.csv`;
    if (save === 'true') {
      const writer = new WriteCsv({ headers: ['client', 'publisher', 'partyNo', 'newPartyNo'], outputLocation });
      const outputData = allContainsInvaidPartyNo.map((line) => [line.clientName, line.publisher, line.partyNo, line.newPartyNo]);
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
