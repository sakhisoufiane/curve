const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');
const multer = require('multer');
const appRootDir = require('app-root-dir').get();
const bodyParser = require('body-parser');
const McpsRetention = require('../models/mcpsRetention');
const Payee = require('../models/payee');

const router = express.Router();
const parseUrlencoded = bodyParser.urlencoded({ extended: false });

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
      // Find using passed params
      McpsRetention.paginate(McpsRetention.paramsToFilterField(query, curveUser), paginationParams, (err, result) => {
        // Handle find errors
        if (err) {
          logger.error(err);
          // Return internal error
          res.status(500).json({ message: 'Internal error, please try again' });
        } else {
          // Return result
          res.status(200).json({ mcpsRetentions: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
        }
      });
    } else {
      // Handle user forbidden
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;

    McpsRetention.findById(params.id)
      .then(async (mcpsRetention) => {
        if (!mcpsRetention) {
          res.status(404).json({ message: `Could not find McpsRetention with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: mcpsRetention, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (mcpsRetention) {
          mcpsRetention.patches
            .find({ ref: mcpsRetention._id })
            .populate('author', 'email')
            .then((patches) => {
              res.status(200).json({ modelHistory: patches });
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

    // Find using ID
    McpsRetention.findById(params.id)
      .populate('createdBy', 'email')
      .populate('lastModifiedBy', 'email')
      .then(async (mcpsRetention) => {
        // None found
        if (!mcpsRetention) {
          res.status(404).json({ message: `Could not find McpsRetention with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: mcpsRetention, clientOnly: true })) {
          // Check if forbidden
          res.status(403).json({ message: 'Forbidden' });
        } else if (mcpsRetention) {
          // Return item
          res.status(200).json(mcpsRetention);
        } else {
          // Hand find errors
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

    // Find using ID
    McpsRetention.findById(params.id)
      .then(async (foundMcpsRetention) => {
        // When no item is found
        if (!foundMcpsRetention) {
          res.status(404).json({ message: `Could not find McpsRetention with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: foundMcpsRetention, clientOnly: true })) {
          // Check if forbidden
          res.status(403).json({ message: 'Forbidden' });
        } else if (foundMcpsRetention) {
          // Update item
          // Retain original clientId on item
          delete body.clientId;
          // Loop through passed values and update against payee
          for (const i in body) {
            foundMcpsRetention[i] = body[i];
          }
          // Set last modified by
          foundMcpsRetention.lastModifiedBy = curveUser.id;
          foundMcpsRetention.save()
            .then((mcpsRetention) => {
              // Return updated item
              res.status(200).json(mcpsRetention);
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.message });
            });
        } else {
          // Handle find errors
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .delete('/:id', (req, res) => {
    const { curveUser, params } = req;

    // Deletes item
    // Find using ID
    McpsRetention.findById(params.id)
      .then(async (mcpsRetention) => {
        // When no item is found
        if (!mcpsRetention) {
          res.status(404).json({ message: `Could not find McpsRetention with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: mcpsRetention, clientOnly: true })) {
          // Check if forbidden
          res.status(403).json({ message: 'Forbidden' });
        } else if (mcpsRetention) {
          // Delete item
          mcpsRetention.deleteOne()
            .then(() => {
              // Return positive response
              res.status(200).json(mcpsRetention);
            })
            .catch((err) => {
              logger.error(err);
              err = err.toString().substring(7, err.toString().length).split(',');
              res.status(201).json(JSON.parse(err));
            });
        } else {
          // Handle find errors
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .post('/import', upload.single('file'), (req, res) => {
    // Imports a payee file - runs asynchronously
    // Only allow if client and file is present
    if (req.curveUser?.rights?.[req.curveUser?.clientId]?.periods === 'Edit') {
      // Calls import function from model - acts asynchronously
      McpsRetention.importFromExcel(req.file, req.curveUser);
      // Returns positive response stating payees are importing
      res.status(200).json({ message: 'Payees are importing, and a report will be sent to you shortly.' });
      // When file is missing
    } else if (req.curveUser.clientId && (!req.curveUser.rights || !req.curveUser.rights[req.curveUser.clientId] || req.curveUser.rights[req.curveUser.clientId].periods === 'Edit') && !req.file) {
      res.status(400).json({ errors: ['Requires a file to be uploaded'] });
      // When user does not have the correct rights
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .post('/export', (req, res) => {
    // Exports payees to excel - runs asynchronously
    // Only allow if client with edit credentials
    if (['View', 'Edit'].includes(req.curveUser?.rights?.[req.curveUser?.clientId]?.periods)) {
      // When passed specific IDs
      if (req.body.ids && req.body.ids.length !== 0) {
        McpsRetention.sendExport({ _id: { $in: req.body.ids } }, req.curveUser);
        // When IDs are not present, fall back to filter
      } else {
        McpsRetention.sendExport(McpsRetention.paramsToFilterField(req.body.filter, req.curveUser), req.curveUser);
      }
      // Return response, letting user know report with be sent via email
      res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
      // When not a client with correct user privileges
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .post('/', parseUrlencoded, async (req, res) => {
    const { curveUser, body } = req;

    // Creates new item
    // Set clientId by the user
    body.clientId = curveUser.clientId;
    // Set createdBy and updatedBy to the user
    body.createdBy = curveUser.id;
    body.lastModifiedBy = curveUser.id;
    // Create new item
    const mcpsRetention = new McpsRetention(body);

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: mcpsRetention, clientOnly: true })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Save
    mcpsRetention.save()
      .then((mcpsRetention) => {
        // Return positive response
        res.status(200).json(mcpsRetention);
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: err.message || 'Internal error, please try again' });
      });
  });

module.exports = router;
