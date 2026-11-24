require('dotenv').config();
require('../../../../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Work = require('../../../../models/work');
const Client = require('../../../../models/client');

const limit = 50000;
let count = 0;

function runWork(client, lastId, total, callback) {
  const filter = { clientId: client._id, valid: true };
  if (lastId) {
    filter._id = { $gt: lastId };
  }
  Work.find(filter)
    .sort({ _id: 1 })
    .limit(limit)
    .then((works) => {
      async.eachLimit(works, 50, (work, cb) => {
        if (!work) { return cb(); }

        count += 1;
        work.checkValidationErrors(() => {
          lastId = work._id;
          if (!work.valid) {
            logger.error(`${work._id} turned invalid`);
            Work.findByIdAndUpdate(work._id, { $set: { valid: work.valid, validationErrors: work.validationErrors } }, { timestamps: false })
              .then((foundWork) => {
                cb(null, foundWork);
              })
              .catch((err) => {
                logger.error(`Error updating work ${work._id} to invalid`, err);
                cb(err);
              });
          } else {
            cb();
          }
        });
      }, (err) => {
        logger.debug(`${count}/${works.length + total}`);
        if (works && works.length === limit) {
          runWork(client, lastId, total + limit, callback);
        } else {
          callback();
        }
      });
    })
    .catch((err) => {
      logger.error(`Error processing works for client ${client._id}`, err);
      callback(err);
    });
}

const flushWorksIPChainValidation = (clientId, callback) => {
  async.waterfall([
    (waterfallCb) => {
      if (clientId) {
        waterfallCb(null, { _id: clientId });
      } else {
        waterfallCb('Please provide a client id, or use --all to flush through ALl clients');
      }
    },
    (clientFilter, waterfallCb) => {
      Client.find(clientFilter, { name: 1 })
        .sort({ name: 1 })
        .then((clients) => {
          waterfallCb(null, clients);
        })
        .catch((err) => {
          logger.error('Error finding clients', err);
          waterfallCb(err);
        });
    },
    (clients, waterfallCb) => {
      async.eachSeries(clients, (client, eachCb) => {
        logger.debug(`---- processing client: ${client.name} ----`);
        count = 0;
        runWork(client, null, 0, eachCb);
      }, waterfallCb);
    },
  ], (err) => {
    if (err) {
      callback(err);
    } else {
      callback();
    }
  });
};

module.exports = { flushWorksIPChainValidation };
