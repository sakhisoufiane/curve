const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');
const bodyParser = require('body-parser');
const { salesGroupHelpers } = require('../../libs/helpers/salesGroupHelpers');
const { salesHelpers } = require('../../libs/helpers/salesHelpers');
const { GENERIC_ERROR, FORBIDDEN_ERROR } = require('../constants');
const SalesGroup = require('../../models/salesGroup');
const Payee = require('../../models/payee');

const router = express.Router();
const parseUrlencoded = bodyParser.urlencoded({ extended: false });

router
  .get('/', async (req, res) => {
    const { curveUser, query } = req;
    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'sales' })) {
      const paginationParams = {
        page: Page.valueOrDefault(query.page, 1),
        limit: Page.valueOrDefault(query.limit, 25),
        sort: Page.sortOrDefault(query.orderBy, query.orderDir),
      };
      const result = await SalesGroup.paginate(salesGroupHelpers.paramsToFilterField(query, curveUser), paginationParams).catch((err) => {
        logger.error(err);
        res.status(500).json({ message: GENERIC_ERROR });
      });
      if (result) {
        res.status(200).json({ salesGroups: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
      }
    } else {
      res.status(403).json({ message: FORBIDDEN_ERROR });
    }
  })
  .get('/:id', (req, res) => {
    const { curveUser, params } = req;
    SalesGroup.findById(params.id).then(async (salesGroup) => {
      if (!salesGroup) {
        res.status(404).json({ message: `Could not find Group with ID ${params.id}` });
      } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'sales', document: salesGroup, clientOnly: true })) {
        res.status(403).json({ message: FORBIDDEN_ERROR });
      } else {
        res.status(200).json(salesGroup);
      }
    }).catch((err) => {
      logger.error(err);
      res.status(404).json({ message: `Could not find Group with ID ${params.id}` });
    });
  })
  .post('/', parseUrlencoded, async (req, res) => {
    const { curveUser, body } = req;
    body.clientId = curveUser.clientId;
    body.createdBy = curveUser.id;
    body.lastModifiedBy = curveUser.id;

    const salesGroup = new SalesGroup(body);

    if (!body.clientId || await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: salesGroup, clientOnly: true })) {
      return res.status(403).json({ message: FORBIDDEN_ERROR });
    }
    salesGroup.save().then((savedSalesGroup) => {
      res.status(200).json(savedSalesGroup);
    }).catch((err) => {
      logger.error(err);
      res.status(500).json({ message: GENERIC_ERROR });
    });
  })
  .post('/:id/add_multiple_sales_lines', async (req, res) => {
    const { curveUser, params, body } = req;
    try {
      const salesGroup = await SalesGroup.findById(params.id);
      if (!salesGroup) {
        res.status(404).json({ message: `Could not find Group with ID ${params.id}` });
      } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: salesGroup, clientOnly: true })) {
        res.status(403).json({ message: FORBIDDEN_ERROR });
      } else if (body.salesLineIds?.length) {
        try {
          const { totalAdded } = await salesGroupHelpers.addSalesLinesByIds({ salesLineIds: body.salesLineIds, salesGroup });
          res.status(200).json({ totalAdded });
        } catch (err) {
          logger.error(err);
          if (err.message === 'All sales lines must be in suspense to be resolved') {
            res.status(400).json({ message: err.message });
          } else {
            res.status(500).json({ message: GENERIC_ERROR });
          }
        }
      } else {
        res.status(400).json({ message: 'No sales lines selected' });
      }
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: GENERIC_ERROR });
    }
  })
  .post('/:id/add_filtered_sales_lines', async (req, res) => {
    const { curveUser, params, body } = req;
    if (!body.filter || Object.keys(body.filter)?.length === 0) {
      res.status(400).json({ message: 'No filters provided' });
    } else {
      try {
        const salesGroup = await SalesGroup.findById(params.id);
        if (!salesGroup) {
          res.status(404).json({ message: `Could not find Group with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: salesGroup, clientOnly: true })) {
          res.status(403).json({ message: FORBIDDEN_ERROR });
        } else {
          try {
            const filter = await salesHelpers.paramsToFilterField(curveUser.clientId, body.filter);
            const { totalAdded } = await salesGroupHelpers.addSalesLinesByFilter({ filter, salesGroup });
            res.status(200).json({ totalAdded });
          } catch (err) {
            logger.error(err);
            if (err.message === 'All sales lines must be in suspense to be resolved') {
              res.status(400).json({ message: err.message });
            } else if (err.message === 'No filtered sales lines to add to a Group') {
              res.status(400).json({ message: err.message });
            } else {
              res.status(500).json({ message: GENERIC_ERROR });
            }
          }
        }
      } catch (err) {
        logger.error(err);
        res.status(500).json({ message: GENERIC_ERROR });
      }
    }
  })
  .delete('/bulk', async (req, res) => {
    const { curveUser, body } = req;
    if (!UserAccess.allowWriteAccessToAll({ user: curveUser, type: 'sales' })) {
      return res.status(403).json({ message: FORBIDDEN_ERROR });
    }
    if (!body?.ids?.length) { return res.status(422).json({ message: 'Choose at least one group' }); }
    try {
      const { code, message, deletedCount, associations } = await salesGroupHelpers.deleteSalesGroups({ curveUser, ids: body.ids });
      res.status(code).json({ message, deletedCount, associations });
    } catch (err) {
      logger.error(`${curveUser.clientId} Error bulk deleting sales groups ${body?.ids}`, err);
      if (err?.code) return res.status(err.code).json({ message: err.message });
      res.status(500).json({ message: GENERIC_ERROR });
    }
  });

module.exports = router;
