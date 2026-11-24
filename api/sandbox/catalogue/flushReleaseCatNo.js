require('dotenv').config();
require('../models/db');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const appRootDir = require('app-root-dir').get();
const WriteCsv = require('../libs/writeCsv');
const Release = require('../models/release');
const Client = require('../models/client')

const limit = 1000;
let count = 0;
let allContainsInvaidCatNoReport = [];
let allContainsInvaidCatNo = [];
let save = 'false';

function runRelease(client, save, callback) {
  const aggregation = [
    {
      $match: {
        clientId: client._id.toString(),
        catNo: { $ne: null, $ne: "" },
      },
    },
    {
      $group: {
        _id: {
          catNo: { $toLower: "$catNo" },
          clientId: "$clientId",
        },
        // group by catNo
        count: {
          $sum: 1,
        },
        // count the number of documents
        catNo: {
          $first: "$catNo",
        }, // include the catNo field in the result using the $first operator
      },
    },
    {
      $match: {
        count: {
          $gt: 1,
        }, // filter the groups to only include those with a count greater than 1
        catNo: { $ne: null},
      },
    },
    {
      $project: {
        // exclude the _id field from the result
        _id: 1,
        catNo: 1,
        // include the catNo field in the result
        count: 1, // include the count field in the result
      },
    },
  ];
  Release.aggregate(aggregation, {allowDiskUse : true }, (err, data) => {
    if (err) {
      callback(err);
      return;
    }

    const combinedArray = allContainsInvaidCatNoReport.concat(data);
    allContainsInvaidCatNoReport = combinedArray;

    if (data && data.length && save && save === 'true') {
      async.eachSeries(data, (duplicate, duplicateCb) => {
        const regex = new RegExp(duplicate.catNo, 'i');
        const regexCatNo = { $regex: regex };
        filter = { clientId: client._id.toString(), catNo: regexCatNo };
        Release.find(filter).sort({ createdAt: 1 }).exec((err, releases) => {
          if (err) {
            duplicateCb(err);
            return;
          }

          let count = 0;
          async.eachSeries(releases, (release, cb) => {
            count += 1;
            if (count > 1) {
              const oldCatNo = release.catNo;
              let newCatNo = release.catNo + ' '.repeat(count);
              Release.countDocuments({ _id: { $ne: release._id }, clientId: release.clientId, catNo: newCatNo }, (err, countCatNos) => {
                if (!countCatNos) {
                  release.catNo = newCatNo;
                } else {
                  release.catNo = newCatNo + countCatNos;
                }
                Release.findByIdAndUpdate(release._id, { $set: { catNo: release.catNo } }, { timestamps: false }, (err) => {
                  allContainsInvaidCatNo.push({ clientName: client.name, release: release.title, catNo: oldCatNo, newCatNo: release.catNo })
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
              console.log(`${duplicate.catNo} - Done`);
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
          console.log('>>>>>> processing Releases  <<<<<<');
          count = 0;
          runRelease(client, save, cb);
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
    const outputLocation = `${appRootDir}/tmp/flushReleaseCatNo.csv`;
    if (save === 'true') {
      const writer = new WriteCsv({ headers: ['client', 'release', 'catNo', 'newCatNo'], outputLocation });
      const outputData = allContainsInvaidCatNo.map((line) => [line.clientName, line.release, line.catNo, line.newCatNo]);
      writer.addData(outputData, () => {
        writer.write((err, location) => {
          console.log(location);
          console.log('Complete');
          process.exit(-1); 
        });
      });
    } else {
      const writer = new WriteCsv({ headers: ['client', 'count', 'catNo'], outputLocation });
      const outputData = allContainsInvaidCatNoReport.map((line) => [line._id.clientId, line.count, line.catNo]);
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
