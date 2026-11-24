const { logger, fileManager, databaseUtils, configShared, encryption } = require('@curveroyaltysystems/platform-shared-utils');
const { UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');

const router = express.Router();
const bodyParser = require('body-parser');

const parseUrlencoded = bodyParser.urlencoded({ extended: false });
const appRootDir = require('app-root-dir').get();
const multer = require('multer');
const historyModelUser = require('../libs/historyModelUser');
const DeliveryPartner = require('../models/deliveryPartner');
const Payee = require('../models/payee');
const DeliveryPartnerController = require('../controllers/deliveryPartner');

const storage = multer.diskStorage({
  destination(req, file, cb) { cb(null, `${appRootDir}/tmp/`); },
  filename(req, file, cb) { cb(null, `${Date.now()}-${file.originalname}`); },
});
const upload = multer({ storage });

router
  .get('/', async (req, res) => {
    const { curveUser } = req;

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
      try {
        const result = await DeliveryPartnerController.getDeliveryPartners({ req }) || [];
        res.status(200).json(result);
      } catch (err) {
        res.status(500).json({ message: 'Internal error, please try again' });
      }
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/list', async (req, res) => {
    const { curveUser } = req;

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
      try {
        const result = await DeliveryPartnerController.getDeliveryPartnersList({ req }) || [];
        res.status(200).json(result);
      } catch (err) {
        res.status(500).json({ message: 'Internal error, please try again' });
      }
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;

    DeliveryPartner.findById(params.id)
      .then(async (deliveryPartner) => {
        if (!deliveryPartner) {
          res.status(404).json({ message: `Could not find DeliveryPartner with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: deliveryPartner, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (deliveryPartner) {
          deliveryPartner.patches
            .find({ ref: deliveryPartner._id })
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

  .get('/:id', (req, res) => {
    const { curveUser, params } = req;

    DeliveryPartner.findById(params.id)
      .then(async (deliveryPartner) => {
        if (!deliveryPartner) {
          res.status(404).json({ message: `Could not find DeliveryPartner with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: deliveryPartner, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (deliveryPartner) {
          res.status(200).json(deliveryPartner);
        } else {
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .post('/:id/ftp_key_file', upload.single('file'), async (req, res) => {
    const { curveUser, file } = req;

    if (!req.file) return res.status(400).json({ message: 'Requires a file to be uploaded' });

    const deliveryPartner = await DeliveryPartner.findById(req.params.id);
    if (!deliveryPartner) return res.status(404).json({ message: `Could not find Delivery Partner with ID ${req.params.id}` });

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: deliveryPartner, clientOnly: true })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    try {
      const savedDeliveryPartner = await DeliveryPartnerController.uploadFtpKeyfile({ deliveryPartner, file });
      return res.status(200).json({ message: 'File upload done', deliveryPartner: savedDeliveryPartner });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
    }
  })

  .delete('/:id/ftp_key_file', async (req, res) => {
    const { curveUser } = req;

    const deliveryPartner = await DeliveryPartner.findById(req.params.id);
    if (!deliveryPartner) return res.status(404).json({ message: `Could not find Delivery Partner with ID ${req.params.id}` });

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: deliveryPartner, clientOnly: true })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    try {
      const deletedKey = await DeliveryPartnerController.deleteFtpKeyFile({ key: deliveryPartner.ftpFileKey });
      return res.status(200).json({ message: 'File delete done', deletedKey });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
    }
  })

  .put('/:id', (req, res) => {
    const { curveUser, params, body } = req;

    DeliveryPartner.findById(params.id)
      .then(async (foundDeliveryPartner) => {
        if (!foundDeliveryPartner) {
          res.status(404).json({ message: `Could not find DeliveryPartner with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundDeliveryPartner, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (foundDeliveryPartner) {
          if (!body.splitElectionPRO) { body.splitElectionPRO = null; }
          if (!body.territory) { body.territory = null; }
          if (!body.receivingParty) { body.receivingParty = null; }
          Object.keys(body).forEach((key) => {
            foundDeliveryPartner[key] = body[key];
          });
          foundDeliveryPartner.save()
            .then((deliveryPartner) => {
              res.status(200).json(deliveryPartner);
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.showToUser ? err.message : 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
            });
        } else {
          res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .delete('/:id', async (req, res) => {
    const { curveUser, params } = req;

    const foundDeliveryPartner = await DeliveryPartner.findById(params.id).catch(logger.error);
    if (!foundDeliveryPartner) { return res.status(404).json({ message: `Could not find Delivery Partner: ${params.id}` }); }

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundDeliveryPartner, clientOnly: true })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const references = await DeliveryPartnerController.getTotalReferences(curveUser.clientId, foundDeliveryPartner._id.toString());
    if (references.length) {
      return res.status(400).json({ message: 'Delivery Partner referenced elsewhere', data: references });
    }

    DeliveryPartner.findOneAndDelete({ _id: params.id })
      .then((deliveryPartner) => {
        if (!deliveryPartner) {
          res.status(404).json({ message: `Could not find DeliveryPartner with ID ${params.id}` });
        } else if (deliveryPartner) {
          res.status(200).json(deliveryPartner);
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
    try {
      const { curveUser, body } = req;
      body.clientId = curveUser.clientId;
      const deliveryPartner = new DeliveryPartner(body);

      if (
        await UserAccess.isUserForbidden({
          Payee,
          user: curveUser,
          operation: 'write',
          type: 'catalogue',
          document: deliveryPartner,
          clientOnly: true,
        })
      ) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const result = await deliveryPartner.save();
      res.status(200).json(result);
    } catch (err) {
      logger.error(err);
      res.status(500)
        .json({
          message: err.showToUser
            ? err.message
            : "Unfortunately we couldn't complete your request. Please try again, or contact the support team.",
        });
    }
  });

module.exports = router;
