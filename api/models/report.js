const { logger, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { Report: { name, schema } } = require('@curveroyaltysystems/models');
const modelHistory = require('../libs/modelHistory');
const Task = require('./task');
const Client = require('./client');

const reportSchema = schema;

reportSchema.plugin(modelHistory, { mongoose, name: 'reportPatches' });
reportSchema.plugin(mongoosePaginate);

reportSchema.post('save', (err, savedReport, next) => {
  // Handle error messages
  if (err) {
    errorMessages(err, (err, newError) => {
      next(new Error(newError));
    });
  } else {
    next();
  }
});

/**
 * Formats an error message to a human readable format.
 *
 * Calls callback(null, newMessages) with the formatted error [newMessages].
 *
 * @method
 * @param {object} err - The error to format.
 * @param {function(string)} callback - The callback that handles the response.
 */
function errorMessages(err, callback) {
  if (err && err.message) {
    const splitErrors = err.message.split(',');
    const newMessages = splitErrors.map((message) => {
      if (message.includes('name: Path `name` is required')) {
        return 'Name is required';
      }
      if (message.includes('table: Path `table` is required')) {
        return 'Dataset is required';
      }
      return message;
    }).join(', ');
    callback(null, newMessages);
  } else {
    callback();
  }
}

reportSchema.methods.exportFixedReport = function (email, callback) {
  const report = this;
  Client.findById(report.clientId)
    .then(async (client) => {
      if (client) {
        const count = await Task.countDocuments({
          name: 'Fixed Report', clientId: report.clientId, status: { $in: ['Pending', 'In Progress'] }, 'value.reportId': report._id.toString(),
        });
        if (!count) {
          TaskHelpers.createTaskAndSendMessage(Task, {
            name: 'Fixed Report',
            clientId: report.clientId,
            clientName: client.name,
            email,
            value: {
              reportId: report._id.toString(),
            },
          })
            .then(() => {
              callback();
            })
            .catch(callback);
        } else {
          callback(new Error('This task is already running - please wait until it has completed before running again'));
        }
      } else {
        callback('Client not found');
      }
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};

const Report = mongoose.model(name, reportSchema);

module.exports = Report;
