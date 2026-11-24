require('dotenv').config();
require('./models/db');

const { logger, fileManager, createZip, utils } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const async = require('async');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const fs = require('fs');
const Statement = require('./models/statement');

const createZipOfFiles = function (id) {
  logger.info(`${id} Creating Statement Zip`);
  Statement.findById(id)
    .then((statement) => {
      logger.info(statement);
      async.waterfall([
        function (cb) {
          const files = [];
          if (statement.salesCsv) { files.push(statement.salesCsv); }
          if (statement.costsCsv) { files.push(statement.costsCsv); }
          if (statement.pdf) { files.push(statement.pdf); }
          if (statement.statementOfAccount) { files.push(statement.statementOfAccount); }
          if (statement.selfBillingInvoice) { files.push(statement.selfBillingInvoice); }
          if (statement.feesInvoice) { files.push(statement.feesInvoice); }
          if (statement.customStatement) { files.push(statement.customStatement); }
          cb(null, files);
        },
        function (files, cb) {
          logger.info(files);
          const safeName = utils.safeName(statement.name);
          createZip.s3Files(files, process.env.S3_bucket, `${appRootDir}/tmp/${safeName} All Files ${moment().format('YYYYMMDDHHmmssSSS')}.zip`, (err, zipFile) => {
            if (err) {
              return cb(err);
            }
            fileManager.uploadToS3(`statements/${statement._id.toString()}/${safeName} All Files.zip`, zipFile, (err, key) => {
              fs.unlink(zipFile, () => {
                Statement.findByIdAndUpdate(statement._id, { $set: { allFilesZip: key } })
                  .then(() => {
                    cb();
                  })
                  .catch((err) => {
                    logger.error(err);
                    cb(err);
                  });
              });
            });
          });
        },
      ], () => {
        logger.info('Completed');
        process.exit(0);
      });
    })
    .catch((err) => {
      logger.error(err);
      process.exit(0);
    });
};

const statementId = process.argv[2] || 'x243198ed33fd9001d109751';
createZipOfFiles(new ObjectId(statementId));
