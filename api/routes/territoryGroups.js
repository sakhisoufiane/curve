const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');

const router = express.Router();
const bodyParser = require('body-parser');

const parseUrlencoded = bodyParser.urlencoded({ extended: false });
const _ = require('lodash');
const { ObjectId } = require('mongodb');
const historyModelUser = require('../libs/historyModelUser');
const TerritoryGroup = require('../models/territoryGroup');
const Payee = require('../models/payee');
const TerritoryGroupController = require('../controllers/territoryGroup');

const INTERNAL_ERROR_MESSAGE = 'Internal error, please try again';
const FORBIDDEN_MESSAGE = 'Forbidden';
const INTERNAL_ERROR = { message: INTERNAL_ERROR_MESSAGE };
const FORBIDDEN = { message: FORBIDDEN_MESSAGE };

router
  .get('/', (req, res) => {
    const { curveUser, query } = req;

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
      const paginationParams = {
        page: Page.valueOrDefault(query.page, 1),
        limit: Page.valueOrDefault(query.limit, 25),
        sort: Page.sortOrDefault(query.orderBy, query.orderDir),
      };
      TerritoryGroup.paginate(paramsToFilterField(query, curveUser), paginationParams, (err, result) => {
        if (err) {
          logger.error(err);
          res.status(500).json(INTERNAL_ERROR);
        } else {
          res.status(200).json({ territoryGroups: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
        }
      });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;
    TerritoryGroup.findById(params.id)
      .then(async (territoryGroup) => {
        if (!territoryGroup) {
          res.status(404).json({ message: `Could not find TerritoryGroup with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: territoryGroup, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else {
          territoryGroup.patches.find({ ref: territoryGroup._id })
            .populate('author', 'email')
            .then((patches) => {
              historyModelUser.addModifiedBy(patches, (err, patches) => {
                res.status(200).json({ modelHistory: patches });
              });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json(INTERNAL_ERROR);
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

  .get('/:id', (req, res) => {
    const { curveUser, params } = req;
    TerritoryGroup.findById(params.id)
      .then(async (territoryGroup) => {
        if (!territoryGroup) {
          res.status(404).json({ message: `Could not find TerritoryGroup with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: territoryGroup, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else {
          res.status(200).json(territoryGroup);
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

  .put('/:id', (req, res) => {
    const { curveUser, params, body } = req;
    TerritoryGroup.findById(params.id)
      .then(async (foundTerritoryGroup) => {
        if (!foundTerritoryGroup) {
          res.status(404).json({ message: `Could not find TerritoryGroup with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundTerritoryGroup, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else {
          const validationErrors = TerritoryGroupController.validate(body);
          if (validationErrors.length) {
            return res.status(400).json({ message: 'Validation Errors', errors: validationErrors });
          }
          delete body.clientId;
          // eslint-disable-next-line guard-for-in
          for (const i in body) { foundTerritoryGroup[i] = body[i]; }
          foundTerritoryGroup.save()
            .then((updatedTerritoryGroup) => {
              res.status(200).json(updatedTerritoryGroup);
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.message || INTERNAL_ERROR_MESSAGE });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

  .delete('/:id', (req, res) => {
    const { curveUser, params } = req;
    TerritoryGroup.findById(params.id)
      .then(async (territoryGroup) => {
        if (!territoryGroup) {
          res.status(404).json({ message: `Could not find TerritoryGroup with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: territoryGroup, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else {
          territoryGroup.deleteOne()
            .then(() => {
              res.status(200).json(territoryGroup);
            })
            .catch((err) => {
              logger.error(`Deletion Errored on territoryGroup ${params.id}`, err);
              res.status(500).json(INTERNAL_ERROR);
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

  .post('/', parseUrlencoded, async (req, res) => {
    const { curveUser, body } = req;
    body.clientId = curveUser.clientId;
    const territoryGroup = new TerritoryGroup(body);

    if (!await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: territoryGroup, clientOnly: true })) {
      const validationErrors = TerritoryGroupController.validate(body);
      if (validationErrors.length) {
        return res.status(400).json({ message: 'Validation Errors', errors: validationErrors });
      }
      territoryGroup.save()
        .then((savedTerritoryGroup) => {
          res.status(200).json(savedTerritoryGroup);
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: err.message || INTERNAL_ERROR_MESSAGE });
        });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  });

function paramsToFilterField(inputParams, user) {
  const params = {};
  if (user.clientId) { params.clientId = user.clientId; }
  if (inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');

    if (inputParams.text.length === 24 && ObjectId.isValid(inputParams.text)) {
      params.$or = [{ _id: inputParams.text }, { name: { $regex: regex } }];
    } else {
      params.name = { $regex: regex };
    }
  }
  return params;
}

module.exports = router;
