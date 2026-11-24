require('dotenv').config();
require('../models/db');
const async = require('async');
const appRootDir = require('app-root-dir').get();

const { fileOpener } = require('@curveroyaltysystems/platform-shared-utils');
const WriteCsv = require('../libs/writeCsv');
const Payee = require('../models/payee');
const Client = require('../models/client');

const filePath = `${appRootDir}/tmp/verifyEncryptionSampleData.csv`;

function runLoad(callback) {
  console.log('------ loading sample data from clients and payees ------');
  const writer = new WriteCsv({
    headers: ['count', 'clientId', 'ftpPassword', 'payeeId', 'contactEmail', 'bankName'],
    outputLocation: filePath,
  });  
  count = 0;
  async.waterfall([
    (waterfallCb) => {
    Client.find({}, { name: 1, ftpPassword: 1 }).sort({ name: 1 }).exec(waterfallCb);
    },
    (clients, waterfallCb) => {
      async.eachSeries(clients, (client, eachCb) => {
        console.log(`processing client: ${client.name} ----`);
        Payee.findOne({clientId: client._id}, (payeeErr, payee) => {
          if (payeeErr) {
            eachCb(payeeErr);
          } else if (payee) {
            count += 1;
            const data = [{
              'count': count,
              'clientId': client._id.toString(),
              'ftpPassword': client?.ftpPassword?.replace(",", ""),
              'payeeId': payee._id.toString(),
              'contactEmail': payee.contactEmail,
              'bankName': payee?.bankName?.replace(",", ""),
            }]
            writer.addData(data, eachCb);
          } else {
            eachCb();
          }
        });
      }, waterfallCb);
    },
    (waterfallCb) => {
      writer.write(waterfallCb);
    },
  ], callback);
}

function runVerify(callback) {
  console.log('------ verifying sample data from CSV file ------');
  async.waterfall([
    (waterfallCb) => {
      fileOpener.extractData(filePath, {}, (err, totalTabs, data) => {
        waterfallCb(err, data);
      });
    },
    (data, waterfallCb) => {
      data.shift();
      async.eachSeries(data, (row, eachCb) => {
        const clientId = row[1];
        Client.findById(clientId, { name: 1, ftpPassword: 1 }, (clientErr, client) => {
          if (clientErr) {
            eachCb(clientErr);
          } else if (!client) {
            console.log(`\x1b[44m\x1b[36m client ${clientId} not found \x1b[0m`);
            eachCb();
          } else {
            console.log(`processing client: ${client.name} ----`);
            const ftpPassword = client?.ftpPassword?.replace(",", "");
            if (ftpPassword && ftpPassword !== row[2]) {
              console.log(`\x1b[41m\x1b[37m client ${clientId} ftpPassword does not match verification data \x1b[0m`);
            }
            const payeeId = row[3];
            Payee.findById(payeeId, (payeeErr, payee) => {
              if (payeeErr) {
                eachCb(payeeErr);
              } else if (!payee) {
                console.log(`\x1b[44m\x1b[36m payee ${payeeId} not found \x1b[0m`);
                eachCb();
              } else {
                console.log(`processing payee: ${payee.name} ----`);
                const contactEmail = payee.contactEmail;
                if (contactEmail && contactEmail !== row[4]) {
                  console.log(`\x1b[41m\x1b[37m payee ${payeeId} contactEmail does not match verification data \x1b[0m`);
                }
                const bankName = payee?.bankName?.replace(",", "");
                if (bankName && bankName !== row[5]) {
                  console.log(`\x1b[41m\x1b[37m payee ${payeeId} bankName does not match verification data \x1b[0m`);
                }
                eachCb();
              }
            });
          }
        });
      }, waterfallCb); 
    },
    (waterfallCb) => {
      console.log(`\x1b[42m\x1b[37m remember to delete local test data \x1b[0m`);
      waterfallCb();
    },
  ], callback);
}

async.waterfall([
  (waterfallCb) => {
    if (process.argv[2]) {
      if (process.argv[2] === '--load') {
        runLoad(waterfallCb);
      } else if (process.argv[2] === '--verify') {
        runVerify(waterfallCb);
      } else {
        waterfallCb('Invalid parameter')
      }
    } else {
      waterfallCb('Please use either --load to load all sample data to CSV file or --verify to verify the CSV file data matches database data')
    }
  },
], (err) => {
  if (err) { console.log(err); }
  else {
    console.log('Complete');
  }
  process.exit(-1);
});


  
  