const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');
const Invoice = require('../models/invoice');
const Payee = require('../models/payee');

const router = express.Router();

router
  .get('/', (req, res) => {
    const { curveUser, query } = req;

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'contracts' })) {
      const paginationParams = {
        page: Page.valueOrDefault(query.page, 1),
        limit: Page.valueOrDefault(query.limit, 25),
        sort: Page.sortOrDefault(query.orderBy, query.orderDir),
      };
      // Find using passed params
      Invoice.paginate(Invoice.paramsToFilterField(query, curveUser), paginationParams, (err, result) => {
        // Handle find errors
        if (err) {
          logger.error(err);
          // Return internal error
          res.status(500).json({ message: 'Internal error, please try again' });
        } else {
          // Return result
          res.status(200).json({ invoices: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
        }
      });
    } else {
      // Handle user forbidden
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/:id', (req, res) => {
    const { curveUser, params } = req;

    // Find using ID
    Invoice.findById(params.id)
      .then(async (invoice) => {
        // None found
        if (!invoice) {
          res.status(404).json({ message: `Could not find Invoice with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: invoice, clientOnly: true })) {
          // Check if forbidden
          res.status(403).json({ message: 'Forbidden' });
        } else if (invoice) {
          // Return item
          res.status(200).json(invoice);
        } else {
          // Hand find errors
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  });

module.exports = router;
