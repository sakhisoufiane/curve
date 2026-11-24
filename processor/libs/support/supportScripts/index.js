const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { waterfall } = require('async');
const { flushSalesFileStatus } = require('./suite/flushSalesFileReportedStatus');
const { flushWorksIPChainValidation } = require('./suite/flushWorksIPChainValidation');
const { deleteStatements } = require('./suite/deleteStatements');
const { copyTemplatesToOtherClient } = require('./suite/copyTemplatesToOtherClient');
const { recreateStatements } = require('./suite/recreateStatements');
const { addAppleSalesAltCalculationMonth } = require('./suite/addAppleSalesAltCalculationMonth');
const SendEmail = require('../../sendEmail');

const supportScriptModule = (taskId, script, scriptParams, email, callback) => {
  logger.debug(`Initialising supportScript module ${script} - ${scriptParams}`);

  waterfall([
    (cb) => {
      if (script === 'flushSalesReportedStatus') {
        // Set params
        const salesFilesId = scriptParams[0].value;

        logger.info(`Starting Script: ${script} - ${salesFilesId}`);
        flushSalesFileStatus(salesFilesId, (err) => {
          if (err) {
            return cb(err);
          }
          cb();
        });
      } else if (script === 'flushWorksIPChainValidation') {
        // Set params
        const clientId = scriptParams[0].value;

        logger.info(`Starting Script: ${script} - ${clientId}`);
        flushWorksIPChainValidation(clientId, (err) => {
          if (err) {
            return cb(err);
          }
          cb();
        });
      } else if (script === 'deleteStatements') {
        // Set params
        const statementIds = scriptParams[0].value;

        logger.info(`Starting Script: ${script} - ${statementIds}`);
        deleteStatements(statementIds, (err) => {
          if (err) {
            return cb(err);
          }
          cb();
        });
      } else if (script === 'copyTemplatesToOtherClient') {
        // Set params
        const copyFromClientId = scriptParams[0].value;
        const copyToClientId = scriptParams[1].value;

        logger.info(`Starting Script: ${script} - to ${copyFromClientId} to ${copyToClientId}`);
        copyTemplatesToOtherClient(copyFromClientId, copyToClientId, (err) => {
          if (err) {
            return cb();
          }
          cb();
        });
      } else if (script === 'recreateStatements') {
        // Set params
        const periodId = scriptParams[0].value;

        logger.info(`Starting Script: ${script} - ${periodId}`);
        recreateStatements(periodId, (err) => {
          if (err) {
            return cb(err);
          }
          cb();
        });
      } else if (script === 'addAppleSalesAltCalculationMonth') {
        const monthAndYear = scriptParams[0].value;

        logger.info(`Starting Script: ${script} - ${monthAndYear}`);
        addAppleSalesAltCalculationMonth(monthAndYear, (err) => {
          if (err) return cb(err);
          cb();
        });
      } else {
        logger.error('Could not find script');
        cb();
      }
    },
  ], (waterfallErr) => {
    if (waterfallErr) {
      SendEmail.scriptErrorEmail(script, email, (err) => {
        if (err) {
          logger.error(err);
        }
        callback(waterfallErr);
      });
    } else {
      SendEmail.scriptCompleteEmail(script, email, (err) => {
        if (err) {
          logger.error(err);
        }
        callback();
      });
    }
  });
};

module.exports = { supportScriptModule };
