require('dotenv').config();
require('../models/db');
const Statement = require('../models/statement');
const Period = require('../models/period');
const Contract = require('../models/contract');
const async = require('async');
const fs = require('fs');
const appRootDir = require('app-root-dir').get();
const csv = require('csv-parser');
const { Upload } = require('@aws-sdk/lib-storage');
const { 
  S3Client,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');

const clientId = '5acc86007c07cb3a8b1a480c';

const rows = [];
fs.createReadStream(`${appRootDir}/tmp/Kartel Statements.csv`)
  .pipe(csv())
  .on('data', (row) => {
    rows.push(row);
  })
  .on('end', () => {
    go();
  });

const failedUpdates = [];

function go() {
  async.eachSeries(rows, (item, cb) => {
    const periodString = item.name.split(':')[0];
    const split = periodString.split(' - ');
    Period.findOne({ clientId, year: parseInt(split[0]), accountingPeriod: split[1] }, (err, period) => {
      if (period) {
        Contract.findOne({ clientId, foreignId: item.foreignId }, (err, contract) => {
          if (contract) {
            console.log({ periodId: period._id.toString(), contractId: contract._id.toString() });
            Statement.findOne({ periodId: period._id.toString(), contractId: contract._id.toString() }, (err, statement) => {
              if (statement) {
                updateFiles(statement, item, cb);
              } else {
                console.log(`Statement not found for ${item.statement}`);
                cb();
              }
            });
          } else {
            console.log(`Contract not found for ${item.foreignId}`);
            cb();
          }
        });
      } else {
        console.log(`Period not found for ${item.period}`);
        cb();
      }
    });
  });
}

function updateFiles(statement, item, callback) {
  console.log(statement.name);
  const pdfLocation = `statements/${statement._id.toString()}/${statement.name.replace(':', '')}.pdf`;
  const salesCsvLocation = `statements/${statement._id.toString()}/${statement.name.replace(':', '')} Sales Export.csv`;
  const costsCsvLocation = `statements/${statement._id.toString()}/${statement.name.replace(':', '')} Costs Export.csv`;
  const selfBillingLocation = `statements/${statement._id.toString()}/${statement.name.replace(':', '')} Self Billing Invoice.pdf`;
  const feesInvoiceLocation = `statements/${statement._id.toString()}/${statement.name.replace(':', '')} Fees Invoice.pdf`;
  async.waterfall([
    function (cb) {
      processFile(item.pdf, pdfLocation, (err) => {
        cb(err);
      });
    },
    function (cb) {
      processFile(item.salesCsv, salesCsvLocation, (err) => {
        cb(err);
      });
    },
    function (cb) {
      processFile(item.costsCsv, costsCsvLocation, (err) => {
        cb(err);
      });
    },
    function (cb) {
      processFile(item.selfBilling, selfBillingLocation, (err) => {
        cb(err);
      });
    },
    function (cb) {
      processFile(item.invoice, feesInvoiceLocation, (err) => {
        cb(err);
      });
    },
  ], (err) => {
    Statement.findByIdAndUpdate(statement._id, { $set: { pdf: pdfLocation, salesCsv: salesCsvLocation, costsCsv: costsCsvLocation, selfBillingInvoice: selfBillingLocation, feesInvoice: feesInvoiceLocation, allFilesZip: null, allFilesZipPublicLink: null, statementOfAccount: null, statementOfAccountPublicLink: null } }, callback);
  });
}

function processFile(mrcKey, curveKey, callback) {
  downloadFile(mrcKey, (err, localFile) => {
    if (localFile) {
      uploadFile(localFile, curveKey, callback);
    } else {
      callback();
    }
  });
}

function downloadFile(key, callback) {
  const AWSS3 = new S3Client({
    credentials: {
      accessKeyId: 'AKIAJI4ALOGNOIZKCXNA',
      secretAccessKey: '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',
    },
    region: 'eu-west-1',
  });
  const bucket = 'metable-mrc-dev';
  const keySplit = key.split('/');

  const localFile = `${appRootDir}/tmp/${keySplit[keySplit.length - 1]}`;
  const file = fs.createWriteStream(localFile);
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  AWSS3.send(command, (err, data) => {
    const stream = data.Body.pipe(file);
    stream.on('finish', () => {
      // Return local file
      callback(null, localFile);
    });
  });
}

function uploadFile(localPath, key, callback) {
  const upload = new Upload({
    client: new S3Client({
      credentials: {
        accessKeyId: process.env.S3_access_key,
        secretAccessKey: process.env.S3_secret_key,
      },
      region: process.env.S3_region,
    }),
    params: {
      Key: key,
      Bucket: process.env.S3_bucket,
      Body: localPath,
    },
  });

  upload.done()
      .then((data) => {
        console.log('done uploading');
        fs.unlink(localPath, (err) => {
          callback(err, data.Key);
        });
      })
      .catch((err) => {
        console.error('unable to upload:', err.stack);
        callback(err);
      });
}
