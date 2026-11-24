require('dotenv').config();
require('../../models/db');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { parallel, eachLimit, waterfall } = require('async');
const appRootDir = require('app-root-dir').get();
const WriteCsv = require('../../libs/writeCsv');
const Company = require('../../models/company');
const Client = require('../../models/client')

let errorFiles = [];
let save = 'false';

function runCompanyCheck(client, save, callback) {
  parallel([
    (parallelCb) => {
      if (client?.logo) {
        fileManager.downloadFromS3(client.logo, process.env.S3_bucket, (error, localFile) => {
          if (error) {
            errorFiles.push({ clientName: client.name, key: client.logo, company: client.name })
          }
          parallelCb();
        });
      } else {
        parallelCb();
      }
    },
    (parallelCb) => {
      Company.find({ clientId: client._id }, { name: 1, logo: 1}, (err, data) => {
        if (err) {
          parallelCb(err);
        }
        if (data && data.length) {
          eachLimit(data, 10, (checkCompany, checkCompanyCb) => {
            if (checkCompany?.logo) {
              fileManager.downloadFromS3(checkCompany.logo, process.env.S3_bucket, (error, localFile) => {
                if (error) {
                  errorFiles.push({ clientName: client.name, key: checkCompany.logo, company: checkCompany.name })
                }
                checkCompanyCb();
              });
            } else {
              checkCompanyCb();
            }
          }, (err) => {
            if (err) {
              parallelCb(err);
            } else {
              parallelCb();
            }
          });
        } else {
          parallelCb();
        }
      });
    },
  ], callback); 
}

waterfall([
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
      waterfallCb('Please provide a client id, or use --all to check through All client/company files')
    }
  },
  (clientFilter, waterfallCb) => {
    Client.find(clientFilter, { name: 1, logo: 1 }).sort({ name: 1 }).exec(waterfallCb);
  },
  (clients, waterfallCb) => {
    eachLimit(clients, 10, (client, eachCb) => {
      save = (process.argv[3]) ? process.argv[3] : 'false';
      console.log(`---- processing client: ${client.name} ----`);
      waterfall([
        (cb) => {
          console.log('>>>>>> checking Company files  <<<<<<');
          count = 0;
          runCompanyCheck(client, save, cb);
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
    const outputLocation = `${appRootDir}/tmp/checkCompanyFiles.csv`;
    const writer = new WriteCsv({ headers: ['client', 'key', 'company'], outputLocation });
    const outputData = errorFiles.map((line) => [line.clientName, line.key, line.company]);
    writer.addData(outputData, () => {
      writer.write((err, location) => {
        console.log(location);
        console.log('Complete');
        process.exit(-1); 
      });
    });
  }
});
