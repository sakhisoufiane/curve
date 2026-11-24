const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { DeliveredWorkController, DeliveryLogController, Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('mongodb');
const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const appRootDir = require('app-root-dir').get();
const multer = require('multer');
const CwrAcknowledgement = require('../models/cwrAcknowledgement');
const DeliveredWork = require('../models/deliveredWork');
const DeliveryLog = require('../models/deliveryLog');
const Payee = require('../models/payee');
const historyModelUser = require('../libs/historyModelUser');

const CwrAcknowledgementController = require('../controllers/cwrAcknowledgements');

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
        populate: { path: 'deliveryPartnerId', model: 'DeliveryPartner', select: 'name' },
      };
      CwrAcknowledgement.paginate(paramsToFilterField(query, curveUser), paginationParams, (err, result) => {
        if (err) {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        } else {
          res.status(200).json({ cwrAcknowledgements: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
        }
      });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  /**
   * @api {get} /cwrAcknowledgements/archive_many/ Archive multiple acknowledgements
   * @apiGroup cwrAcknowledgements
   *
   * @apiUse TokenParams
   * @apiQuery {String[]} ids - Sales File ids
   *
   * @apiSuccess {String} message - Success message
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    "message": "Acknowledgements successfully archived.",
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   */
  .get('/archive_many', (req, res) => {
    const { curveUser, query } = req;
    if (!curveUser?.clientId || curveUser?.rights?.[curveUser?.clientId]?.catalogue !== 'Edit') { return res.status(403).json({ message: 'Forbidden' }); }

    const ids = query.ids.map((id) => new ObjectId(id));
    logger.info('Archiving Many [ACKOWLEDGEMENTS]:', ids);
    CwrAcknowledgement.updateMany({ clientId: curveUser.clientId, _id: { $in: ids } }, { $set: { archived: true } }, { timestamps: false })
      .then(() => {
        res.status(200).json({ message: 'Acknowledgements successfully archived.' });
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: err.message });
      });
  })

  /**
   * @api {get} /cwrAcknowledgements/unarchive_many/ Unarchive multiple acknowledgements
   * @apiGroup cwrAcknowledgements
   *
   * @apiUse TokenParams
   * @apiQuery {String[]} ids - Sales File ids
   *
   * @apiSuccess {String} message - Success message
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    "message": "Acknowledgements successfully unarchived.",
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   */
  .get('/unarchive_many', (req, res) => {
    const { curveUser, query } = req;
    if (!curveUser?.clientId || curveUser?.rights?.[curveUser?.clientId]?.catalogue !== 'Edit') { return res.status(403).json({ message: 'Forbidden' }); }

    const ids = query.ids.map((id) => new ObjectId(id));
    logger.info('Unarchiving Many:', ids);
    CwrAcknowledgement.updateMany({ clientId: curveUser.clientId, _id: { $in: ids } }, { $set: { archived: false } }, { timestamps: false })
      .then(() => {
        res.status(200).json({ message: 'Acknowledgements successfully unarchived.' });
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: err.message });
      });
  })

  .post('/:id/importAcknowledgement', upload.single('file'), (req, res) => {
    const { curveUser, params } = req;

    CwrAcknowledgement.findById(params.id)
      .then(async (cwrAcknowledgement) => {
        if (!cwrAcknowledgement) {
          res.status(404).json({ message: `Could not find Delivery with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: cwrAcknowledgement, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          cwrAcknowledgement.importAcknowledgementFile({ curveUser });
          res.status(200).json({ message: 'Acknowledgement sent for ingestion.' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: err.message });
      });
  })

  .get('/:id/works', async (req, res) => {
    const { curveUser, params, query } = req;

    const cwrAcknowledgement = await CwrAcknowledgement.findById(params.id);
    if (!cwrAcknowledgement) { return res.status(404).json({ message: `Could not find CwrDelivery with ID ${params.id}` }); }

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: cwrAcknowledgement, clientOnly: true })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const paginationParams = {
      page: Page.valueOrDefault(query.page, 1),
      limit: Page.valueOrDefault(query.limit, 25),
      sort: Page.sortOrDefault(query.orderBy, query.orderDir),
      orderBy: query.orderBy,
      orderDir: query.orderDir,
    };

    DeliveryLogController
      .getAcknowledgementFileWorks({
        DeliveryLog, clientId: cwrAcknowledgement.clientId, cwrAcknowledgementId: cwrAcknowledgement._id, deliveryPartnerId: req.query.deliveryPartnerId, cwrDeliveryId: cwrAcknowledgement?.cwrDeliveryId, status: req.query.status, paginationParams,
      })
      .then((works) => {
        res.status(200).json(works);
      })
      .catch((error) => {
        logger.error(error);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/works_v1', async (req, res) => {
    const { curveUser, params, query } = req;

    const cwrAcknowledgement = await CwrAcknowledgement.findById(params.id);
    if (!cwrAcknowledgement) { return res.status(404).json({ message: `Could not find CwrDelivery with ID ${params.id}` }); }

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: cwrAcknowledgement, clientOnly: true })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const paginationParams = {
      page: Page.valueOrDefault(query.page, 1),
      limit: Page.valueOrDefault(query.limit, 25),
      sort: Page.sortOrDefault(query.orderBy, query.orderDir),
      orderBy: query.orderBy,
      orderDir: query.orderDir,
    };

    DeliveredWorkController
      .getAcknowledgementFileWorks({ DeliveredWork, clientId: cwrAcknowledgement.clientId, cwrAcknowledgementId: cwrAcknowledgement._id, cwrDeliveryId: cwrAcknowledgement?.cwrDeliveryId, status: req.query.status, paginationParams })
      .then((works) => {
        res.status(200).json(works);
      })
      .catch((error) => {
        logger.error(error);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/redeliver_works', (req, res) => {
    const { curveUser, params, query } = req;

    CwrAcknowledgement.findById(params.id)
      .then(async (cwrAcknowledgement) => {
        if (!cwrAcknowledgement) {
          res.status(404).json({ message: `Could not find CwrDelivery with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: cwrAcknowledgement, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          cwrAcknowledgement.reDeliverWorks(query.status, curveUser, (err, delivery) => {
            if (err || !delivery) {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            } else {
              res.status(200).json(delivery);
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: err.message });
      });
  })

  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;

    CwrAcknowledgement.findById(params.id)
      .then(async (cwrAcknowledgement) => {
        if (!cwrAcknowledgement) {
          res.status(404).json({ message: `Could not find Acknowledgement with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: cwrAcknowledgement, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          cwrAcknowledgement.patches
            .find({ ref: cwrAcknowledgement._id })
            .populate('author', 'email')
            .then((patches) => {
              historyModelUser.addModifiedBy(patches, (err, patches) => {
                res.status(200).json({ modelHistory: patches });
              });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.message });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: err.message });
      });
  })

  .get('/:id/export', (req, res) => {
    const { curveUser, params, query } = req;

    CwrAcknowledgement.findById(params.id)
      .then(async (cwrAcknowledgement) => {
        if (!cwrAcknowledgement) {
          res.status(404).json({ message: `Could not find CwrDelivery with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: cwrAcknowledgement, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          cwrAcknowledgement.export(query.paginationParams.status, query.v1, curveUser);
          res.status(200).json({ message: 'Your export will be sent to you shortly' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: err.message });
      });
  })

  .get('/:id', (req, res) => {
    const { curveUser, params } = req;

    CwrAcknowledgementController.getCwrAcknowledgement(params, curveUser).then((cwrAcknowledgement) => {
      res.status(200).json(cwrAcknowledgement);
    }).catch((err) => {
      logger.error(err);
      res.status(err?.status ?? 500).json({ message: err?.message ?? 'Internal error, please try again' });
    });
  })

  .put('/:id', (req, res) => {
    const { curveUser, params, body } = req;

    CwrAcknowledgement.findById(params.id)
      .then(async (foundCwrAcknowledgement) => {
        if (!foundCwrAcknowledgement) {
          res.status(404).json({ message: `Could not find Delivery with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundCwrAcknowledgement, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          CwrAcknowledgement.findByIdAndUpdate(params.id, body, { new: true })
            .then(() => {
              CwrAcknowledgementController.getCwrAcknowledgement(params, curveUser).then((cwrAcknowledgement) => {
                res.status(200).json(cwrAcknowledgement);
              }).catch((err) => {
                logger.error(err);
                res.status(500).json({ message: 'Internal error, please try again' });
              });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.message });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: err.message });
      });
  })

  .put('/:id/get_upload_credentials', (req, res) => {
    const { curveUser, params, body } = req;

    // Write to S3
    CwrAcknowledgement.findById(params.id)
      .then(async (cwrAcknowledgement) => {
        if (!cwrAcknowledgement) {
          // @Arjun: This should be a 404 no?
          res.status(500).json({ message: `Could not find CWR Acknowledgement with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: cwrAcknowledgement, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          // Get upload credentials
          fileManager.getUploaderCredentials(`cwrAcknowledgements/${cwrAcknowledgement._id.toString()}/`, body, (data) => {
            data.completePath = `/cwrAcknowledgements/${cwrAcknowledgement._id.toString()}/upload_complete`;
            res.status(200).jsonp(data);
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: err.message });
      });
  })

  .put('/:id/upload_complete', (req, res) => {
    const { curveUser, params, body } = req;

    // Write to S3
    CwrAcknowledgement.findById(params.id)
      .then(async (cwrAcknowledgement) => {
        if (!cwrAcknowledgement) {
          res.status(500).json({ message: `Could not find CWR Acknowledgement with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: cwrAcknowledgement, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          // Update key on Acknowledgement
          cwrAcknowledgement.file = body.key;
          cwrAcknowledgement.save()
            .then(() => {
              // Trigger ingestion of file
              cwrAcknowledgement.importAcknowledgementFile({ curveUser });
              res.status(200).json({ message: 'Acknowledgement sent for ingestion' });
            })
            .catch((err) => {
              logger.error('Error in saving CWR Acknowledgement');
              logger.error(err);
              res.status(500).json({ message: 'Error in updating CWR Acknowledgement' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: err.message });
      });
  })

  .delete('/:id', async (req, res) => {
    const { curveUser, params } = req;

    const foundCwrAcknowledgement = await CwrAcknowledgement.findById(params.id).catch(logger.error);
    if (!foundCwrAcknowledgement) { return res.status(404).json({ message: `Could not find CwrAcknowledgement: ${params.id}` }); }

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundCwrAcknowledgement, clientOnly: true })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (foundCwrAcknowledgement.status === 'Queued') {
      return res.status(200).json({ message: "You can't delete an acknowledgement that is processing. Wait for it to complete before trying again." });
    }

    CwrAcknowledgement.deleteOne({ _id: params.id })
      .then((result) => {
        if (result.deletedCount === 1) {
          return res.status(200).json({ message: 'CwrAcknowledgement deleted successfully' });
        }

        return res.status(404).json({ message: `Unable to delete CwrAcknowledgement with ID ${params.id}` });
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .post('/', parseUrlencoded, async (req, res) => {
    const { curveUser, body } = req;

    body.clientId = curveUser.clientId;
    const cwrAcknowledgement = new CwrAcknowledgement(body);

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: cwrAcknowledgement, clientOnly: true })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    cwrAcknowledgement.save()
      .then((cwrAcknowledgement) => {
        res.status(200).json(cwrAcknowledgement);
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .post('/:id/reingest', (req, res) => {
    const { curveUser, params, body } = req;
    body.clientId = req.curveUser.clientId;
    CwrAcknowledgement.findById(params.id)
      .then(async (cwrAcknowledgement) => {
        if (!cwrAcknowledgement) {
          res.status(404).json({ message: `Could not find CWR Acknowledgement with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: cwrAcknowledgement, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          cwrAcknowledgement.importAcknowledgementFile({ curveUser });
          res.status(200).json({ name: cwrAcknowledgement.name });
        }
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
    const filenameRegex = new RegExp(`(?<=/)[^/]*${_.escapeRegExp(inputParams.text)}[^/]*$`, 'i');
    params.$or = [{ name: { $regex: regex } }, { file: { $regex: filenameRegex } }];
  }
  if (inputParams.name) { params.name = inputParams.name; }
  if (inputParams.source) { params.source = inputParams.source; }
  if (inputParams.deliveryPartnerId) { params.deliveryPartnerId = inputParams.deliveryPartnerId; }
  if (inputParams.status === 'Archived') { params.archived = true; }
  if (inputParams.status === 'Unarchived') { params.archived = false; }
  if (inputParams.acknowledgementType && inputParams.acknowledgementType === 'ISWC') {
    params.acknowledgementType = 'ISWC';
  } else {
    params.acknowledgementType = { $ne: 'ISWC' };
  }
  return params;
}

module.exports = router;
