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
let allContainsInvaidNameReport = [];
let allContainsInvaidName = [];
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
  Composer.aggregate(aggregation, (err, data) => {
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
        Composer.find(filter).sort({ createdAt: 1 }).exec((err, composers) => {
          if (err) {
            duplicateCb(err);
            return;
          }

          let count = 0;
          async.eachSeries(composers, (composer, cb) => {
            count += 1;
            if (count > 1) {
              const oldName = composer.name;
              let newName = composer.name + ' '.repeat(count);
              Composer.countDocuments({ _id: { $ne: composer._id }, clientId: composer.clientId, name: newName }, (err, countNames) => {
                if (!countNames) {
                  composer.name = newName;
                } else {
                  composer.name = newName + countNames;
                }
                Composer.findByIdAndUpdate(composer._id, { $set: { name: composer.name } }, { timestamps: false }, (err) => {
                  allContainsInvaidName.push({ clientName: client.name, composer: composer.name, name: oldName, newName: composer.name })
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
    const outputLocation = `${appRootDir}/tmp/flushComposerName.csv`;
    if (save === 'true') {
      const writer = new WriteCsv({ headers: ['client', 'composer', 'name', 'newName'], outputLocation });
      const outputData = allContainsInvaidName.map((line) => [line.clientName, line.composer, line.name, line.newName]);
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
