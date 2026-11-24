require('dotenv').config();
require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Report = require('../models/report');
const Client = require('../models/client');

const command = process.argv[2];

if (command === 'report') {
  const reportId = process.argv[3];
  if (reportId) {
    logger.debug(`\nFlushing old filter onto new filters array for report: ${reportId}\n`);
    processReports({ _id: reportId }, (err) => {
      if (err) {
        console.error(err);
        process.exit(-1);
      } else {
        logger.debug('---- PROCESS COMPLETE ----\n');
        process.exit(-1);
      }
    });
  } else {
    logger.debug('\nNo Report ID passed as an argument');
    logger.debug('Usage: node reportsFlushToNewFiltersArray.js report <reportId>\n');
    process.exit(-1);
  }
} else if (command === 'client') {
  const clientId = process.argv[3];
  if (clientId) {
    logger.debug(`\nFlushing old filter onto new filters array for client: ${clientId}\n`);
    Client.findById(clientId, (err, client) => {
      if (client) {
        processReports({ clientId: client._id.toString() }, (err) => {
          if (err) {
            logger.error(err);
            process.exit(-1);
          } else {
            logger.debug('---- PROCESS COMPLETE ----\n');
            process.exit(-1);
          }
        });
      } else {
        logger.error(err || `\nClient ${clientId} not found\n`);
        process.exit(-1);
      }
    });
  } else {
    logger.debug('\nNo Client ID passed as an argument');
    logger.debug('Usage: node reportsFlushToNewFiltersArray.js client <clientId>\n');
    process.exit(-1);
  }
} else if (command === 'all-reports-in-entire-database') {
  processReports({}, (err) => {
    if (err) {
      logger.error(err);
      process.exit(-1);
    } else {
      logger.debug('---- PROCESS COMPLETE ----\n');
      process.exit(-1);
    }
  });
} else {
  logger.debug('\n'
    + 'Usage: node reportsFlushToNewFiltersArray.js <command>\n\n'
    + 'where <command> is one of\n'
    + '   report <id>\n'
    + '   client <id>\n'
    + '   all-reports-in-entire-database');
  process.exit(-1);
}

function processReports(query, callback) {
  Report.find(query, (err, reports) => {
    if (reports && reports.length > 0) {
      async.each(reports, (report, cb) => {
        if (report && report.filter) {
          let filterClean;
          Object.keys(report.filter).forEach((field) => {
            const value = report.filter[field];
            if (value !== '' && Array.isArray(value) && value.length !== 0) {
              filterClean = filterClean || {};
              filterClean[field] = value;
            }
          });
          if (filterClean) { report.filters = [filterClean]; }
          report.save((err, savedReport) => {
            if (err) {
              cb(err);
            } else {
              logger.debug(`Successfully flushed filter to filters array for report '${savedReport.name}'`);
              // logger.debug("filters", savedReport.filters);
              cb();
            }
          });
        } else {
          cb(new Error(`no filter found for report '${report.name}'`));
        }
      }, callback);
    } else {
      callback(err || new Error('No reports found'));
    }
  });
}
