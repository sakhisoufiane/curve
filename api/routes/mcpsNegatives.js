const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const appRootDir = require('app-root-dir').get();
const McpsNegative = require('../models/mcpsNegative');
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
      McpsNegative.paginate(McpsNegative.paramsToFilterField(query, curveUser), paginationParams, (err, result) => {
        // Handle find errors
        if (err) {
          logger.error(err);
          // Return internal error
          res.status(500).json({ message: 'Internal error, please try again' });
        } else {
          // Return result
          res.status(200).json({ mcpsNegatives: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
        }
      });
    } else {
      // Handle user forbidden
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;

    McpsNegative.findById(params.id)
      .then(async (mcpsNegative) => {
        if (!mcpsNegative) {
          res.status(404).json({ message: `Could not find McpsNegative with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: mcpsNegative, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          mcpsNegative.patches
            .find({ ref: mcpsNegative._id })
            .populate('author', 'email')
            .then((patches) => {
              res.status(200).json({ modelHistory: patches });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            });
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
    McpsNegative.findById(params.id)
      .populate('createdBy', 'email')
      .populate('lastModifiedBy', 'email')
      .then(async (mcpsNegative) => {
        // None found
        if (!mcpsNegative) {
          res.status(404).json({ message: `Could not find McpsNegative with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: mcpsNegative, clientOnly: true })) {
          // Check if forbidden
          res.status(403).json({ message: 'Forbidden' });
        } else {
          // Return item
          res.status(200).json(mcpsNegative);
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
    McpsNegative.findById(params.id)
      .then(async (foundMcpsNegative) => {
        // When no item is found
        if (!foundMcpsNegative) {
          res.status(404).json({ message: `Could not find McpsNegative with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: foundMcpsNegative, clientOnly: true })) {
          // Check if forbidden
          res.status(403).json({ message: 'Forbidden' });
        } else {
          // Update item
          // Retain original clientId on item
          delete body.clientId;
          // Loop through passed values and update against payee
          for (const i in body) {
            foundMcpsNegative[i] = body[i];
          }
          // Set last modified by
          foundMcpsNegative.lastModifiedBy = curveUser.id;
          foundMcpsNegative.save()
            .then((mcpsNegative) => {
              // Return updated item
              res.status(200).json(mcpsNegative);
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.message });
            });
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
    McpsNegative.findById(params.id)
      .then(async (mcpsNegative) => {
        // When no item is found
        if (!mcpsNegative) {
          res.status(404).json({ message: `Could not find McpsNegative with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: mcpsNegative, clientOnly: true })) {
          // Check if forbidden
          res.status(403).json({ message: 'Forbidden' });
        } else {
          // Delete item
          mcpsNegative.deleteOne()
            .then((mcpsNegative) => {
              res.status(200).json(mcpsNegative);
            })
            .catch((err) => {
              logger.error(err);
              err = err.toString().substring(7, err.toString().length).split(',');
              res.status(201).json(JSON.parse(err));
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .post('/import', upload.single('file'), (req, res) => {
    if (req.curveUser?.rights?.[req.curveUser?.clientId]?.periods !== 'Edit') { return res.status(403).json({ message: 'Forbidden' }); }

    if (!req.file) { return res.status(400).json({ errors: ['Requires a file to be uploaded'] }); }

    // Calls import function from model - acts asynchronously
    McpsNegative.importFromExcel(req.file, req.curveUser);
    // Returns positive response stating payees are importing
    res.status(200).json({ message: 'Payees are importing, and a report will be sent to you shortly.' });
  })

  .post('/export', (req, res) => {
    if (req.curveUser?.rights?.[req.curveUser?.clientId]?.periods === 'None') { return res.status(403).json({ message: 'Forbidden' }); }

    // Exports payees to excel - runs asynchronously
    // Only allow if client with edit credentials
    // When passed specific IDs
    if (req.body?.ids?.length) {
      McpsNegative.sendExport({ _id: { $in: req.body.ids } }, req.curveUser);
      // When IDs are not present, fall back to filter
    } else {
      McpsNegative.sendExport(McpsNegative.paramsToFilterField(req.body.filter, req.curveUser), req.curveUser);
    }
    // Return response, letting user know report with be sent via email
    res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
  })

  .post('/', parseUrlencoded, async (req, res) => {
    const { curveUser, body } = req;

    // Set clientId by the user
    body.clientId = curveUser.clientId;
    // Set createdBy and updatedBy to the user
    body.createdBy = curveUser.id;
    body.lastModifiedBy = curveUser.id;
    // Create new item
    const mcpsNegative = new McpsNegative(body);

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: mcpsNegative, clientOnly: true })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Save
    mcpsNegative.save()
      .then((mcpsNegative) => {
        // Return positive response
        res.status(200).json(mcpsNegative);
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: err.message || 'Internal error, please try again' });
      });
  });

module.exports = router;
