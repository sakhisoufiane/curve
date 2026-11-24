const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');

const express = require('express');

const router = express.Router();
const bodyParser = require('body-parser');

const parseUrlencoded = bodyParser.urlencoded({ extended: false });
const _ = require('lodash');
const { ObjectId } = require('mongodb');
const historyModelUser = require('../libs/historyModelUser');
const ContractTermGroup = require('../models/contractTermGroup');
const Payee = require('../models/payee');

router
  .get('/', (req, res) => {
    const { curveUser, query } = req;

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'contracts' })) {
      const paginationParams = {
        page: Page.valueOrDefault(query.page, 1),
        limit: Page.valueOrDefault(query.limit, 25),
        sort: Page.sortOrDefault(query.orderBy, query.orderDir),
      };
      ContractTermGroup.paginate(paramsToFilterField(query, curveUser), paginationParams, (err, result) => {
        if (err) {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        } else {
          res.status(200).json({
            contractTermGroups: result.docs,
            meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs },
          });
        }
      });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;

    ContractTermGroup.findById(params.id)
      .then(async (contractTermGroup) => {
        if (!contractTermGroup) {
          res.status(404).json({ message: `Could not find ContractTermGroup with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: contractTermGroup, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          contractTermGroup.patches.find({ ref: contractTermGroup._id })
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
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find ContractTermGroup with ID ${params.id}` });
      });
  })

  .get('/:id', (req, res) => {
    const { curveUser, params } = req;

    ContractTermGroup.findById(params.id)
      .then(async (contractTermGroup) => {
        if (!contractTermGroup) {
          res.status(404).json({ message: `Could not find ContractTermGroup with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'contracts', document: contractTermGroup, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          res.status(200).json(contractTermGroup);
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find ContractTermGroup with ID ${params.id}` });
      });
  })

  .put('/:id', (req, res) => {
    const { curveUser, params, body } = req;

    ContractTermGroup.findById(params.id)
      .then(async (foundContractTermGroup) => {
        if (!foundContractTermGroup) {
          res.status(404).json({ message: `Could not find ContractTermGroup with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: foundContractTermGroup, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          delete body.clientId;
          // eslint-disable-next-line guard-for-in
          for (const i in body) { foundContractTermGroup[i] = body[i]; }
          foundContractTermGroup.save()
            .then((contractTermGroup) => {
              res.status(200).json(contractTermGroup);
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.message });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find ContractTermGroup with ID ${params.id}` });
      });
  })

  .delete('/:id', (req, res) => {
    const { curveUser, params } = req;

    ContractTermGroup.findById(new ObjectId(params.id))
      .then(async (contractTermGroup) => {
        if (!contractTermGroup) {
          res.status(404).json({ message: `Could not find ContractTermGroup with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: contractTermGroup, clientOnly: true })) {
          return res.status(403).json({ message: 'Forbidden' });
        } else {
          contractTermGroup.deleteOne()
            .then(() => {
              res.status(200).json(contractTermGroup);
            })
            .catch((removeErr) => {
              logger.error(`Deletion Errored on contractTermGroup ${params.id}`, removeErr);
              res.status(500).json({ message: 'Internal error, please try again' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find ContractTermGroup with ID ${params.id}` });
      });
  })

  .post('/', parseUrlencoded, async (req, res) => {
    const { curveUser, body } = req;

    body.clientId = curveUser.clientId;
    const contractTermGroup = new ContractTermGroup(body);

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: contractTermGroup, clientOnly: true })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    contractTermGroup.save()
      .then((savedContractTermGroup) => {
        res.status(200).json(contractTermGroup);
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

    if (inputParams.text.length === 24 && ObjectId.isValid(inputParams.text)) {
      params.$or = [{ _id: inputParams.text }, { name: { $regex: regex } }];
    } else {
      params.name = { $regex: regex };
    }
  }
  return params;
}

module.exports = router;
