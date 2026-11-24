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
let allContainsInvaidNameReport = [];
let allContainsInvaidName = [];
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
          name: { $toLower: "$name" },
          clientId: "$clientId",
        },
        // group by name
        count: {
          $sum: 1,
        },
        // count the number of documents
        name: {
          $first: "$name",
        }, // include the name field in the result using the $first operator
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
        name: 1,
        // include the name field in the result
        count: 1, // include the count field in the result
      },
    },
  ];
  Publisher.aggregate(aggregation, (err, data) => {
    if (err) {
      callback(err);
      return;
    }

    const combinedArray = allContainsInvaidNameReport.concat(data);
    allContainsInvaidNameReport = combinedArray;

    if (data && data.length && save && save === 'true') {
      async.eachSeries(data, (duplicate, duplicateCb) => {
        const regex = new RegExp(duplicate.name, 'i');
        const regexName = { $regex: regex };
        filter = { clientId: client._id.toString(), name: regexName };
        Publisher.find(filter).sort({ createdAt: 1 }).exec((err, publishers) => {
          if (err) {
            duplicateCb(err);
            return;
          }

          let count = 0;
          async.eachSeries(publishers, (publisher, cb) => {
            count += 1;
            if (count > 1) {
              const oldName = publisher.name;
              let newName = publisher.name + ' '.repeat(count);
              Publisher.countDocuments({ _id: { $ne: publisher._id }, clientId: publisher.clientId, name: newName }, (err, countNames) => {
                if (!countNames) {
                  publisher.name = newName;
                } else {
                  publisher.name = newName + countNames;
                }
                Publisher.findByIdAndUpdate(publisher._id, { $set: { name: publisher.name } }, { timestamps: false }, (err) => {
                  allContainsInvaidName.push({ clientName: client.name, publisher: publisher.name, name: oldName, newName: publisher.name })
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
              console.log(`${duplicate.name} - Done`);
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
    const outputLocation = `${appRootDir}/tmp/flushPublisherName.csv`;
    if (save === 'true') {
      const writer = new WriteCsv({ headers: ['client', 'publisher', 'name', 'newName'], outputLocation });
      const outputData = allContainsInvaidName.map((line) => [line.clientName, line.publisher, line.name, line.newName]);
      writer.addData(outputData, () => {
        writer.write((err, location) => {
          console.log(location);
          console.log('Complete');
          process.exit(-1); 
        });
      });
    } else {
      const writer = new WriteCsv({ headers: ['client', 'count', 'name'], outputLocation });
      const outputData = allContainsInvaidNameReport.map((line) => [line._id.clientId, line.count, line.name]);
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
