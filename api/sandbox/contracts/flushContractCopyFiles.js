require('dotenv').config();
require('../models/db');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const appRootDir = require('app-root-dir').get();
const WriteCsv = require('../libs/writeCsv');
const Contract = require('../models/contract');
const Client = require('../models/client');

const limit = 1000;
let count = 0;
let allContainsInvaidFiles = [];

function runContract(client, lastId, total, save, containsInvaidFiles, callback) {
  const filter = { clientId: client._id };
  if (lastId) {
    // if processing another batch, ensure you start after the last release in previous batch.
    filter._id = { $gt: lastId };
  } else {
    containsInvaidFiles = [];
  }
  // query all elements from Contracts and sort by _id - Should we include projection?
  Contract.find(filter).sort({ _id: 1 }).limit(limit).exec((err, contracts) => {
    async.eachLimit(contracts, 50, (contract, cb) => {
      count += 1;
      process.stdout.write(`\r${count}/${contracts.length+total} - ${contract._id} - ${contract.name}`);
      lastId = contract._id;
      // Do the RegEx check of files for the ObjectId to see if its a valid contract file
      if (contract?.files?.length > 0) {
        const pattern = new RegExp(`/${contract._id}/`);
        const filteredFiles = contract.files.filter(file => !pattern.test(file.key));
        if (filteredFiles.length > 0) {
          // this contract is invalid
          let uniqueKeys = filteredFiles.reduce((acc, current) => {
            let contractId = current.key.match(/\/(.*?)\//)[1];
            const splitKey = current.key.toString().split("/");
            if (acc.indexOf(contractId) === -1) {
              acc.push({ contractId: splitKey[1], key: current.key, fileName: splitKey[3], timeStamp: splitKey[2] });
            }
            return acc;
          }, []);
          async.each(uniqueKeys, (uniqueKey, uniqueKeyCb) => {
            fileManager.getFileSize(uniqueKey.key, (errGetSize) => {
              const doesFileExist = (errGetSize) ? 'deleted' : 'exists';
              Contract.findById(uniqueKey.contractId, (err, originalContract) => {
                let originalContractName = '';
                if (originalContract?.name) {
                  originalContractName = `${originalContractName} ${originalContract.name}`;
                } else {
                  originalContractName = `${originalContractName} Not Found`;
                }
                containsInvaidFiles.push({ client: client.name, id: contract._id, contractName: contract.name, original: originalContractName, file: uniqueKey.key, exists: doesFileExist });
                if (save && save === 'true' && doesFileExist === 'exists') {
                  // need to decide what we are doing here
                  const contractFileId = contract._id.toString();
                  const destKey = `contracts/${contractFileId}/${uniqueKey.timeStamp}/${uniqueKey.fileName}`;
                  const options = {};
                  fileManager.copyS3File(encodeURIComponent(uniqueKey.key), destKey, options, (err) => {
                    if (err) {
                      uniqueKeyCb(err);
                    } else {
                      fileManager.publicS3Link(encodeURIComponent(destKey) , (err, url) => {
                        const fileToUpdate = contract.files.find(file => file.key === uniqueKey.key);
                        if (fileToUpdate) {
                          fileToUpdate.key = destKey;
                          fileToUpdate.publicLink = url;
                        }
                        uniqueKeyCb();
                      });
                    }
                  });
                } else {
                  uniqueKeyCb();
                }
              });
            });
          }, (err) => {
            if (err) { console.log(err) };
            Contract.findByIdAndUpdate(contract._id, { $set: { files: contract.files } }, { timestamps: false }, cb);
          });
        } else {
          cb();
        }
      } else {
        cb();
      }
    }, (err) => {
      if (err) { console.log(err) };
      // should we go get the next 'limit' documents
      if (contracts && contracts.length === limit) {
        runContract(client, lastId, total + limit, save, containsInvaidFiles, callback);
      } else {
        if (containsInvaidFiles?.length > 0) {
          const combinedArray = allContainsInvaidFiles.concat(containsInvaidFiles);
          allContainsInvaidFiles = combinedArray;
        }
        callback();
      }
    });
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
      waterfallCb('Please provide a client id, or use --all to flush through All copied Contracts')
    }
  },
  (clientFilter, waterfallCb) => {
    Client.find(clientFilter, { name: 1 }).sort({ name: 1 }).exec(waterfallCb);
  },
  (clients, waterfallCb) => {
    async.eachLimit(clients, 5, (client, eachCb) => {
      const save = (process.argv[3]) ? process.argv[3] : 'false';
      async.waterfall([
        (cb) => {
          console.log('>>>>>> processing copied Contract <<<<<<');
          count = 0;
          runContract(client, null, 0, save, null, cb);
        },
      ], eachCb);

    }, waterfallCb);
  },
], (err) => {
  if (err) { 
    console.log(err);
    process.exit(-1);
  } else {
    const outputLocation = `${appRootDir}/tmp/flushContractCopyFiles.csv`;
    const writer = new WriteCsv({ headers: ['client', 'id', 'contract', 'original', 'file', 'exists'], outputLocation });
    const outputData = allContainsInvaidFiles.map((line) => [line.client, line.id, line.contractName, line.original, line.file, line.exists]);
    writer.addData(outputData, () => {
      writer.write((err, location) => {
        console.log(location);
        console.log('Complete');
        process.exit(-1); 
      });
    });
  }
});
