/*
Description: Extracts Sales File IDs from an excel file and removes them from DB
Time To Run (Staging): 00:00:45s
Ticket No: SUP-833
Category: Sales Files
Author: Joe Osborne
*/
require('dotenv').config();
require('../models/db');
const async = require('async');
const appRootDir = require('app-root-dir').get();
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const border = '********';
const log = (message) => { logger.info(`${border} ${message} ${border}`); }
const logErr = (message) => { logger.error(`${border} ${message} ${border}`); }
const { ObjectId } = require('mongodb');
const SalesFile = require('../models/salesFile');
const WriteCsv = require('../libs/writeCsv');
const ImportXlsx = require('../libs/importXlsx');

const config = [{ "key": "_id" }, { "key": "name" }, { "key": "duplicateTest" }, { "key": "invoiceNo" }, { "key": "targetPeriod" }, { "key": "source" }, { "key": "units" }, { "key": "gross" }, { "key": "net" }, { "key": "unmapped" },  { "key": "valid" },  { "key": "status" },  { "key": "archivedStatus" }]
const file = '/Users/joeosborne/Downloads/Exceleration Music Recordings Duplicate Sales File Report 20231201.xlsx';
const salesFileIds = [];

const deleteSalesFiles = () => {
  const dataForReport = [];

  ImportXlsx.getDataByTemplate(file, config, 0, 1, new Date(), async (err, salesFiles) => {
    salesFiles.forEach((salesFile) => {
      salesFileIds.push(ObjectId(salesFile._id));
    });
    log(`Extracted ${salesFileIds.length} from Excel file`);

    await async.eachLimit(salesFileIds, 10, async (saleFileId) => {
      const foundSalesFile = await SalesFile.findById(saleFileId);
      if (!foundSalesFile) {
        dataForReport.push({ status: 'NOT FOUND', id: saleFileId, error: '' });
      } else {
        foundSalesFile.deleteOne((errRemove) => {
          if (errRemove) {
            logErr(`Error deleting Sales File: ${saleFileId}`);
            dataForReport.push({ status: 'ERRORED', id: foundSalesFile._id, error: errRemove });
          } else {
            dataForReport.push({ status: 'DELETED', id: foundSalesFile._id, error: '' });
          }
        })
      }
    });
    await writeCsv(dataForReport);
  });
};

const writeCsv = async (dataForReport) => {
  const outputLocation = `${appRootDir}/tmp/deletedSalesFilesReport.csv`;
  const writer = new WriteCsv({ headers: ['STATUS', 'ID', 'ERROR'], outputLocation });
  const outputData = dataForReport.map((line) => [line.status, line.id, line.error]);
  writer.addData(outputData, () => {
    return new Promise((resolve, reject) => {
      writer.write((err, location) => {
        if (err) {
          logErr(`Error writing CSV: ${err}`);
          reject(err);
        } else {
          log(`Report complete: ${location}`);
          resolve();
          process.exit(-1); 
        }
      });
    });
  });
}


deleteSalesFiles();