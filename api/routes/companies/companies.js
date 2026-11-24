const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('mongodb');
const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const appRootDir = require('app-root-dir').get();
const multer = require('multer');
const Company = require('../../models/company');
const Contract = require('../../models/contract');
const Payee = require('../../models/payee');
const historyModelUser = require('../../libs/historyModelUser');
const { applyDateFilters } = require('../../libs/dateFilters');

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

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'contracts' })) {
      const paginationParams = {
        page: Page.valueOrDefault(query.page, 1),
        limit: Page.valueOrDefault(query.limit, 25),
        sort: Page.sortOrDefault(query.orderBy, query.orderDir),
      };
      Company.paginate(paramsToFilterField(query, curveUser), paginationParams, (err, result) => {
        if (err) {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        } else {
          res.status(200).json({ companies: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
        }
      });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;

    Company.findById(params.id)
      .then(async (company) => {
        if (!company) {
          res.status(404).json({ message: `Could not find Company with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'contracts', document: company, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          company.patches.find({ ref: company._id })
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
        res.status(404).json({ message: `Could not find Company with ID ${params.id}` });
      });
  })

  .get('/:id', (req, res) => {
    const { curveUser, params } = req;

    Company.findById(params.id)
      .populate('createdBy', 'email')
      .populate('lastModifiedBy', 'email')
      .then(async (company) => {
        if (!company) {
          res.status(404).json({ message: `Could not find Company with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'contracts', document: company, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          res.status(200).json(company);
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find Company with ID ${params.id}` });
      });
  })

  .put('/:id', (req, res) => {
    const { curveUser, params } = req;

    Company.findById(params.id)
      .then(async (foundCompany) => {
        if (!foundCompany) {
          res.status(404).json({ message: `Could not find Company with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: foundCompany, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          delete req.body.clientId;
          // eslint-disable-next-line guard-for-in
          for (const i in req.body) { foundCompany[i] = req.body[i]; }
          foundCompany.lastModifiedBy = req.curveUser.id;
          // Remove statementDesign if not present in the data
          if (!req.body.statementDesign) { foundCompany.statementDesign = null; }
          // Update Company Record
          foundCompany.save()
            .then((company) => {
              res.status(200).json(company);
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.message });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find Company with ID ${params.id}` });
      });
  })

  .delete('/:id', async (req, res) => {
    const { curveUser, params } = req;

    const company = await Company.findById(params.id).catch(logger.error);

    if (!company) { return res.status(404).json({ message: `Could not find Company with ID ${params.id}` }); }

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: company, clientOnly: true })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const contracts = await Contract.find({ clientId: curveUser.clientId, companyId: params.id }).catch(logger.error);
    if (contracts?.length) { return res.status(403).json({ message: 'Company is associated with contracts, so cannot be deleted. Remove the company from the contracts and try again.' }); }

    Company.deleteOne({ _id: params.id }).then(() => {
      res.status(200).json(company);
    }).catch((err) => {
      logger.error(err);
      res.status(500).json({ message: 'Internal error, please try again' });
    });
  })

  .post('/', parseUrlencoded, async (req, res) => {
    const { curveUser, body } = req;

    body.clientId = req.curveUser.clientId;
    body.createdBy = req.curveUser.id;
    body.lastModifiedBy = req.curveUser.id;

    const company = new Company(body);

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: company, clientOnly: true })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    company.save()
      .then((company) => {
        res.status(200).json(company);
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: err.message });
      });
  })

  .post('/:id/upload', upload.single('file'), (req, res) => {
    const { curveUser, params, file } = req;

    if (!file) { return res.status(400).json({ errors: ['Requires a file to be uploaded'] }); }

    // Write to S3
    Company.findById(params.id)
      .then(async (company) => {
        if (!company) {
          res.status(500).json({ message: `Could not find Company with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: company, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          fileManager.uploadToS3(`companies/${company._id.toString()}/${file.originalname}`, file.path, (err, key) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: 'There was an error uploading the file, please try again' });
            } else {
              company.logo = key;
              fileManager.publicS3Link(key, (link) => {
                company.publicLogo = link;
              });
              company.save()
                .then((savedCompany) => {
                  res.status(200).json(savedCompany);
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json({ message: err.message || 'There was an error saving the file, please try again' });
                });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: `Could not find Company with ID ${params.id}` });
      });
  });

function paramsToFilterField(inputParams, user) {
  let params = {};
  if (user.companyId && user.contractIds && user.contractIds.length > 0) {
    params = { $and: [{ clientId: user.clientId }, { $or: [{ 'salesReturnsRights.contractId': { $in: user.contractIds } }, { 'costsRights.contractId': { $in: user.contractIds } }] }] };
  } else if (user.clientId) {
    params = { clientId: user.clientId };
  }
  if (inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');

    if (inputParams.text.length === 24 && ObjectId.isValid(inputParams.text)) {
      params.$or = [{ _id: inputParams.text }, { name: { $regex: regex } }];
    } else {
      params.name = { $regex: regex };
    }
  }

  // Apply date filters using shared utility
  params = applyDateFilters(inputParams, params);

  return params;
}

module.exports = router;
