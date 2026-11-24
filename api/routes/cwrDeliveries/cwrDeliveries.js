const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { CwrDeliveryController, Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const _ = require('lodash');
const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const appRootDir = require('app-root-dir').get();
const CwrDelivery = require('../../models/cwrDelivery');
const Payee = require('../../models/payee');
const historyModelUser = require('../../libs/historyModelUser');
const DeliveryController = require('../../controllers/cwrDelivery');

const parseUrlencoded = bodyParser.urlencoded({ extended: true });
const router = express.Router();

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, `${appRootDir}/tmp/`);
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router
  .get('/', (req, res) => {
    const { curveUser, query } = req;

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
      const paginationParams = {
        page: Page.valueOrDefault(query.page, 1),
        limit: Page.valueOrDefault(query.limit, 25),
        sort: Page.sortOrDefault(query.orderBy, query.orderDir),
      };
      CwrDelivery.paginate(paramsToFilterField(query, curveUser), paginationParams, (err, result) => {
        if (err) {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        } else {
          res.status(200).json({ cwrDeliveries: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
        }
      });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/specific_deliveries', async (req, res) => {
    let result = [];
    try {
      result = await CwrDeliveryController.getSpecificDeliveries({ req, CwrDelivery });
      res.status(200).json(result);
    } catch (err) {
      res.status(500).json({ message: 'Internal error, please try again' });
    }
  })

  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;

    CwrDelivery.findById(params.id)
      .then(async (cwrDelivery) => {
        if (!cwrDelivery) {
          res.status(404).json({ message: `Could not find CwrDelivery with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: cwrDelivery, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (cwrDelivery) {
          cwrDelivery.patches
            .find({ ref: cwrDelivery._id })
            .populate('author', 'email')
            .then((patches) => {
              historyModelUser.addModifiedBy(patches, (err, patches) => {
                res.status(200).json({ modelHistory: patches });
              });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            });
        } else {
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/export', (req, res) => {
    const { curveUser, params, query } = req;

    CwrDelivery.findById(params.id)
      .then(async (cwrDelivery) => {
        if (!cwrDelivery) {
          res.status(404).json({ message: `Could not find CwrDelivery with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: cwrDelivery, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (cwrDelivery) {
          const markWorksAsDelivered = query.markWorksAsDelivered === 'true';
          // Use new task only for CWR format (for now)
          if (cwrDelivery.outputFormat === 'CWR') {
            await DeliveryController.exportCwrDelivery({
              clientId: curveUser.clientId,
              userId: curveUser.id,
              cwrDeliveryId: params.id,
              markWorksAsDelivered,
            });
          } else {
            // When export is being treated like any other delivery, we need to set the status to In Progress
            if (markWorksAsDelivered) {
              cwrDelivery.status = 'In Progress';
              await cwrDelivery.save().catch(logger.error);
            }
            // TODO: Move to Processor as was done for CWR format above
            // This should run synchronously as an export could take some time.
            // A notification will be sent to the user
            DeliveryController.exportDelivery({
              delivery: cwrDelivery,
              curveUser: req.curveUser,
              markWorksAsDelivered,
            });
          }
          res.status(200).json(cwrDelivery);
        } else {
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .post('/:id/songlist/export', async (req, res) => {
    try {
      const { curveUser, params } = req;
      const delivery = await CwrDelivery.findById(params.id);
      if (!delivery) {
        return res.status(404).json({ message: `Could not find Cwr Delivery with ID ${params.id}` });
      }
      if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: delivery, clientOnly: true })) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      await DeliveryController.exportSonglist({ clientId: curveUser.clientId, userId: curveUser.id, cwrDeliveryId: params.id });
      res.status(200).json({ message: 'Songlist is exporting, and will be sent to you shortly.' });
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Internal error, please try again' });
    }
  })

  .get('/:id/deliver', (req, res) => {
    const { curveUser, params } = req;

    CwrDelivery.findById(params.id)
      .then(async (cwrDelivery) => {
        if (!cwrDelivery) {
          res.status(404).json({ message: `Could not find CwrDelivery with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: cwrDelivery, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (cwrDelivery) {
          cwrDelivery.deliver(curveUser, (err) => {
            if (err) {
              res.status(500).json({ message: err.message });
            } else {
              res.status(200).json(cwrDelivery);
            }
          });
        } else {
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/works', (req, res) => {
    const { curveUser, params, query } = req;

    CwrDelivery.findById(params.id)
      .then(async (cwrDelivery) => {
        if (!cwrDelivery) {
          res.status(404).json({ message: `Could not find CwrDelivery with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: cwrDelivery, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (cwrDelivery) {
          const paginationParams = {
            page: Page.valueOrDefault(query.worksPagination.page, 1),
            limit: Page.valueOrDefault(query.worksPagination.limit, 25),
            sort: Page.sortOrDefault(query.worksPagination.orderBy, query.worksPagination.orderDir),
          };
          cwrDelivery.filter.orderBy = query.worksPagination.orderBy;
          cwrDelivery.filter.orderDir = query.worksPagination.orderDir;
          cwrDelivery.works(cwrDelivery.filterType, cwrDelivery.filter, paginationParams, (err, result) => {
            if (err) {
              res.status(500).json({ message: 'Internal error, please try again' });
            } else {
              res.status(200).json(result);
            }
          });
        } else {
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/redeliver_works', (req, res) => {
    const { curveUser, params, query } = req;

    CwrDelivery.findById(params.id)
      .then(async (cwrDelivery) => {
        if (!cwrDelivery) {
          res.status(404).json({ message: `Could not find CwrDelivery with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: cwrDelivery, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (cwrDelivery) {
          cwrDelivery.reDeliverWorks(query.status, curveUser, (err, delivery) => {
            if (err || !delivery) {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            } else {
              res.status(200).json(delivery);
            }
          });
        } else {
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/export_works', (req, res) => {
    const { curveUser, params, query } = req;

    CwrDelivery.findById(params.id)
      .then(async (cwrDelivery) => {
        if (!cwrDelivery) {
          res.status(404).json({ message: `Could not find CwrDelivery with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: cwrDelivery, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (cwrDelivery) {
          cwrDelivery.exportWorks(query.status, true, curveUser);
          res.status(200).json({ message: 'Your export will be sent to you shortly' });
        } else {
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/flush_delivery_queued_status', (req, res) => {
    const FlushDeliveryQueuedStatus = require('../../processes/scheduledDeliveries/flushDeliveryQueuedStatus');

    if (req.curveUser?.rights?.[req.curveUser?.clientId]?.catalogue !== 'Edit') { return res.status(403).json({ message: 'Forbidden' }); }

    FlushDeliveryQueuedStatus
      .run({ clientId: req.curveUser.clientId })
      .then(() => {
        res.status(200).json({ message: 'Deliveries flushed' });
      })
      .catch(() => {
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/pre_delivery_notification', (req, res) => {
    const PreDeliveryNotification = require('../../processes/scheduledDeliveries/preDeliveryNotification');

    if (req.curveUser?.rights?.[req.curveUser?.clientId]?.catalogue !== 'Edit') { return res.status(403).json({ message: 'Forbidden' }); }

    PreDeliveryNotification
      .notify({ clientId: req.curveUser.clientId })
      .then(() => {
        res.status(200).json({ message: 'Clients notified' });
      })
      .catch(() => {
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/run_scheduled_deliveries', (req, res) => {
    const RunScheduledDeliveries = require('../../processes/scheduledDeliveries/runScheduledDeliveries');

    if (req.curveUser?.rights?.[req.curveUser?.clientId]?.catalogue !== 'Edit') { return res.status(403).json({ message: 'Forbidden' }); }

    RunScheduledDeliveries
      .run({ clientId: req.curveUser.clientId })
      .then(() => {
        res.status(200).json({ message: 'Deliveries run' });
      })
      .catch(() => {
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .post('/:id/importAcknowledgement', upload.single('file'), (req, res) => {
    const { curveUser, params, file } = req;

    if (!file) { return res.status(400).json({ errors: ['Requires a file to be uploaded'] }); }

    CwrDelivery.findById(params.id)
      .then(async (cwrDelivery) => {
        if (!cwrDelivery) {
          res.status(404).json({ message: `Could not find Delivery with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: cwrDelivery, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (cwrDelivery) {
          cwrDelivery.importAcknowledgementFile(file, curveUser);
          res.status(200).json({ message: 'Acknowledgement is importing, and a report will be sent to you shortly.' });
        } else {
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id', (req, res) => {
    const { curveUser, params } = req;

    CwrDelivery.findById(params.id)
      .then(async (cwrDelivery) => {
        if (!cwrDelivery) {
          res.status(404).json({ message: `Could not find Delivery with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: cwrDelivery, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (cwrDelivery) {
          res.status(200).json(cwrDelivery);
        } else {
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .put('/:id', (req, res) => {
    const { curveUser, params, body } = req;

    if (!body.territory) {
      return res.status(500).json({ message: 'A Territory is required' });
    }

    CwrDelivery.findById(params.id)
      .then(async (foundCwrDelivery) => {
        if (!foundCwrDelivery) {
          res.status(404).json({ message: `Could not find Delivery with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundCwrDelivery, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (foundCwrDelivery) {
          if (!body.receivingParty) { body.receivingParty = null; }
          if (!body.deliveryPartnerId) { body.deliveryPartnerId = null; }
          if (!body.deliveryProfileId) { body.deliveryProfileId = null; }
          if (!body.outputFormat) { body.outputFormat = null; }
          if (!body.cwrVersion) { body.cwrVersion = null; }
          CwrDelivery.findByIdAndUpdate(params.id, body, { new: true })
            .then((cwrDelivery) => {
              res.status(200).json(cwrDelivery);
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            });
        } else {
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .put('/:id/update_workids', async (req, res) => {
    const { params, body, curveUser } = req;

    CwrDeliveryController.updateWorkIds({ Payee, id: params.id, workIds: body.workIds, curveUser, CwrDelivery })
      .then((result) => {
        if (result.status === 200) {
          res.status(result.status).json({ message: `${req.body.workIds.length} Works successfully added to Delivery` });
        } else {
          res.status(result.status).json({ message: result.data.message });
        }
      })
      .catch((error) => {
        logger.error(error);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .delete('/:id', async (req, res) => {
    const { params, curveUser } = req;

    const foundCwrDelivery = await CwrDelivery.findById(params.id).catch(logger.error);
    if (!foundCwrDelivery) { return res.status(404).json({ message: `Could not find CWR Delivery: ${params.id}` }); }

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundCwrDelivery, clientOnly: true })) { return res.status(403).json({ message: 'Forbidden' }); }

    CwrDelivery.findByIdAndDelete(params.id)
      .then((cwrDelivery) => {
        if (!cwrDelivery) {
          res.status(404).json({ message: `Could not find Delivery with ID ${params.id}` });
        } else if (cwrDelivery) {
          res.status(200).json(cwrDelivery);
        } else {
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .post('/', parseUrlencoded, async (req, res) => {
    const { curveUser, body } = req;

    body.clientId = curveUser.clientId;
    const cwrDelivery = new CwrDelivery(body);

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: cwrDelivery, clientOnly: true })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    cwrDelivery.save()
      .then((cwrDelivery) => {
        res.status(200).json(cwrDelivery);
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: err.message });
      });
  });

function paramsToFilterField(inputParams, user) {
  const params = {};
  if (user.clientId) { params.clientId = user.clientId; }
  if (inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
    params.$or = [{ name: { $regex: regex } }, { fileName: { $regex: regex } }];
  }
  if (inputParams.deliveryPartnerId) {
    params.deliveryPartnerId = inputParams.deliveryPartnerId;
  }
  if (inputParams.status) {
    params.status = inputParams.status;
  }

  return params;
}

module.exports = router;
