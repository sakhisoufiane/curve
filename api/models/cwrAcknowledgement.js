const { logger, fileManager, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const { DeliveredWorkController, DeliveryLogController, WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('mongodb');
const { CwrAcknowledgement: { name, schema } } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const async = require('async');
const appRootDir = require('app-root-dir').get();
const moment = require('moment');
const modelHistory = require('../libs/modelHistory');
const Work = require('./work');
const Client = require('./client');
const User = require('./user');
const Task = require('./task');
const Notification = require('./notification');
const CwrDelivery = require('./cwrDelivery');
const DeliveryLog = require('./deliveryLog');

const cwrAcknowledgementSchema = schema;

cwrAcknowledgementSchema.plugin(modelHistory, { mongoose, name: 'cwrAcknowledgementPatches' });
cwrAcknowledgementSchema.plugin(mongoosePaginate);

cwrAcknowledgementSchema.post('init', (cwrAcknowledgement) => {
  if (cwrAcknowledgement.file) {
    fileManager.publicS3Link(cwrAcknowledgement.file, (err, publicLink) => {
      cwrAcknowledgement.publicLink = publicLink;
    });
  }
});

cwrAcknowledgementSchema.methods.importAcknowledgementFile = async function ({ curveUser, adminUserEmails }) {
  let user;
  if (curveUser) {
    user = await User.findById(curveUser.id).select('email');
  }
  const cwrAcknowledgement = this;
  const client = await Client.findById(cwrAcknowledgement.clientId).select('name');
  const taskRunningAlready = await Task.countDocuments({ name: 'CWR Acknowledgement File Ingest', clientId: cwrAcknowledgement.clientId, status: { $in: ['Pending', 'In Progress'] }, 'value.cwrAcknowledgementId': cwrAcknowledgement._id.toString() });

  if (taskRunningAlready) { return logger.error('This acknowledgement file cannot be reingested as it is already in progress'); }

  cwrAcknowledgement.status = 'Queued';
  await cwrAcknowledgement.save();
  await TaskHelpers.createTaskAndSendMessage(Task, {
    name: 'CWR Acknowledgement File Ingest',
    clientId: cwrAcknowledgement.clientId,
    clientName: client.name,
    email: user?.email || adminUserEmails,
    value: {
      cwrAcknowledgementId: cwrAcknowledgement._id.toString(),
    },
  });
};

cwrAcknowledgementSchema.methods.worksFilter = async function (status, v1) {
  const DeliveredWork = require('./deliveredWork');
  const cwrAcknowledgement = this;
  const filter = { clientId: cwrAcknowledgement.clientId };
  if (status && status !== 'All') {
    if (v1 && v1 === 'true') {
      const workIdsByStatus = await DeliveredWorkController.getWorkIdsByStatus({ DeliveredWork, clientId: cwrAcknowledgement.clientId, cwrDeliveryId: cwrAcknowledgement.cwrDeliveryId, cwrAcknowledgementId: cwrAcknowledgement._id, status });
      filter._id = { $in: workIdsByStatus };
    } else {
      const workIdsByStatus = await DeliveryLogController.getWorkIdsByStatus({
        DeliveryLog,
        clientId: cwrAcknowledgement.clientId,
        cwrDeliveryId: cwrAcknowledgement.cwrDeliveryId,
        cwrAcknowledgementId: cwrAcknowledgement._id,
        deliveryPartnerId: cwrAcknowledgement.deliveryPartnerId,
        status });
      filter._id = { $in: workIdsByStatus };
    }
  } else {
    // Get works attached to the ACK
    const cwrWorkIds = cwrAcknowledgement.workIds.map((id) => new ObjectId(id));
    filter._id = { $in: cwrWorkIds };
  }

  return filter;
};

cwrAcknowledgementSchema.methods.export = function (status, v1, curveUser) {
  const DeliveredWork = require('./deliveredWork');
  const cwrAcknowledgement = this;
  let client;
  // Setup CSV
  const outputLocation = `${appRootDir}/tmp/Acknowledgement Export - ${moment().format('X')}.csv`;
  const writeCsv = new WriteCsv({ headers: ['Work ID', 'Work Title', 'Identifier', 'Source', 'Status', 'Detail'], outputLocation });
  async.waterfall([
    (cb) => {
      // Get Works
      cwrAcknowledgement.worksFilter(status, v1)
        .then((filter) => {
          Work.find(filter)
            .then((works) => {
              cb(null, works);
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        })
        .catch(cb);
    },
    (works, cb) => {
      const output = [];
      // Map works to CSV format
      async.eachLimit(works, 100, (work, workCb) => {
        const row = [work._id.toString(), work.title, work.identifier, cwrAcknowledgement.source];
        // Get delivery status/messages
        let status; let messages;
        const filter = { clientId: work.clientId, workId: work._id };
        if (cwrAcknowledgement.cwrDeliveryId) {
          filter.cwrDeliveryId = cwrAcknowledgement.cwrDeliveryId;
        } else {
          filter.cwrAcknowledgementId = cwrAcknowledgement._id;
        }
        DeliveredWorkController.getSingle({ DeliveredWork, filter, select: { status: 1, messages: 1 } })
          .then((delivery) => {
            status = delivery?.status;
            messages = delivery?.messages;

            // Map accepted, rejected or no participation values
            if (['Accepted', 'Registration Accepted', 'Transaction Accepted', 'Registration Accepted with Changes'].includes(status)) {
              row.push('Accepted');
            } else if (['Rejected', 'Claim Rejected', 'Conflict'].includes(status)) {
              row.push('Rejected');
            } else if (['Duplicate'].includes(status)) {
              row.push('Duplicate');
            } else if (['No Participation'].includes(status)) {
              row.push('No Participation');
            } else {
              row.push(status);
            }
            // Add Message
            if (messages) {
              row.push(messages.join(', '));
            }

            output.push(row);
            workCb();
          })
          .catch(workCb);
      }, (err) => {
        cb(err, output);
      });
    },
    (output, cb) => {
      // Write to CSV
      writeCsv.addData(output, (err) => {
        writeCsv.write((err) => {
          cb(err);
        });
      });
    },
    (cb) => {
      // Get client for notifications
      Client.findById(curveUser.clientId)
        .then((foundClient) => {
          client = foundClient;
          // Upload to S3
          fileManager.uploadToS3(`exports/${client.name} Acknowledgement Export ${moment().format('YYYYMMDDHHmmssSSS')}.${outputLocation.split('.').pop()}`, outputLocation, cb);
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    (key, cb) => {
      // Get Public link from S3
      fileManager.publicLink24Hours(key, cb);
    },
    (link, cb) => {
      // Create notification
      const generateOptions = {
        identifier: 'exportDownload',
        curveUser,
        client,
        subject: `Your Acknowledgement Export for ${client.name} is Ready to Download`,
        link,
      };
      Notification.generate('Acknowledgement Export Ready', `Your Acknowledgement Export for ${client.name} is Ready to Download`, link, curveUser, generateOptions, (err) => {
        cb(err);
      });
    },
  ], (err) => {
    // Handle errors
    if (err) {
      const generateOptions = {
        identifier: 'exportError',
        curveUser,
        client,
        subject: 'Your Acknowledgement Export Has Errored',
        error: err.message,
      };
      Notification.generate('Your Acknowledgement Export Has Errored', err.message, null, curveUser, generateOptions);
    }
  });
};

cwrAcknowledgementSchema.methods.reDeliverWorks = function (status, curveUser, callback) {
  const cwrAcknowledgement = this;
  let dateFormat = 'DD/MM/YYYY';
  let delivery;
  async.waterfall([
    // Get Client's date format
    function (cb) {
      Client.findById(curveUser.clientId, 'dateFormat')
        .then((client) => {
          if (client && client.dateFormat) { dateFormat = client.dateFormat; }
          cb();
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    // Get Delivery Name
    function (cb) {
      if (cwrAcknowledgement.cwrDeliveryId) {
        CwrDelivery.findById(cwrAcknowledgement.cwrDeliveryId)
          .then((cwrDelivery) => {
            if (cwrDelivery) { delivery = cwrDelivery; }
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      } else {
        cb();
      }
    },
    function (cb) {
      cwrAcknowledgement.worksFilter(status)
        .then((filter) => {
          cb(null, filter);
        })
        .catch(cb);
    },
    // Get Work Ids
    function (filter, cb) {
      Work.find(filter, '_id')
        .then((works) => {
          const workIds = works.map((work) => work._id);
          cb(null, workIds);
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    // Create Delivery
    function (workIds, cb) {
      const cwrDelivery = new CwrDelivery({
        name: `${delivery && delivery.name ? delivery.name : cwrAcknowledgement.name} Rejected - ${moment().format(dateFormat.toUpperCase())}`,
        territory: delivery && delivery.territory ? delivery.territory : 'WW',
        deliveryPartnerId: delivery && delivery.deliveryPartnerId ? delivery.deliveryPartnerId : (cwrAcknowledgement.deliveryPartnerId || null),
        cwrVersion: delivery && delivery.cwrVersion ? delivery.cwrVersion : null,
        outputFormat: delivery && delivery.outputFormat ? delivery.outputFormat : null,
        receivingParty: delivery && delivery.receivingParty ? delivery.receivingParty : null,
        clientId: curveUser.clientId,
        filterType: 'specific',
        filter: {
          workIds,
        },
      });
      cwrDelivery.save()
        .then((savedDelivery) => {
          cb(null, savedDelivery);
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
  ], callback);
};

const CwrAcknowledgement = mongoose.model(name, cwrAcknowledgementSchema);

module.exports = CwrAcknowledgement;
