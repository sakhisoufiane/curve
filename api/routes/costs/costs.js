const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('mongodb');
const async = require('async');
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const appRootDir = require('app-root-dir').get();
const Cost = require('../../models/cost');
const Payee = require('../../models/payee');
const historyModelUser = require('../../libs/historyModelUser');
const CostsController = require('../../controllers/costs');
const { CSVRawExport } = require('../../libs/mongodb-export');
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

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'sales' })) {
      const paginationParams = {
        page: Page.valueOrDefault(query.page, 1),
        limit: Page.valueOrDefault(query.limit, 25),
        sort: Page.sortOrDefault(query.orderBy, query.orderDir),
        populate: ['releaseIds', 'trackIds', 'contractIds'],
      };
      Cost.paginate(paramsToFilterField(query, curveUser), paginationParams, (err, result) => {
        if (err) {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        } else {
          res.status(200).json({ costs: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
        }
      });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .post('/export', (req, res) => {
    const { curveUser, body } = req;
    if (['View', 'Edit'].includes(curveUser.rights?.[curveUser.clientId]?.sales)) {
      if (body?.ids?.length) {
        Cost.sendExport({ clientId: curveUser.clientId, _id: { $in: body.ids } }, curveUser);
      } else {
        Cost.sendExport(paramsToFilterField(body.filter, curveUser), curveUser);
      }

      res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
    } else {
      return res.status(403).json({ message: 'Forbidden' });
    }
  })

  .post('/raw-export', async (req, res) => {
    const { curveUser, body } = req;
    const sync = body.sync === true;

    if (curveUser.clientId && ['View', 'Edit'].includes(curveUser.rights?.[curveUser.clientId]?.sales)) {
      const filter = paramsToFilterField(body.filter || {}, curveUser);

      if (sync) {
        try {
          const result = await CSVRawExport({ curveUser, collectionName: 'costs', filter, sync: true });
          res.status(200).json(result);
        } catch (err) {
          logger.error(err);
          res.status(500).json({ message: 'Export failed', error: err.message });
        }
      } else {
        CSVRawExport({ curveUser, collectionName: 'costs', filter });
        res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
      }
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .post('/archive_many', (req, res) => {
    const { curveUser, body } = req;
    if (curveUser.rights?.[curveUser.clientId]?.sales === 'Edit') {
      const ids = body.ids.map((id) => new ObjectId(id));
      const { archived } = body;
      logger.info(`${archived ? 'Archiving' : 'Unarchiving'} Many Costs:`, ids);
      Cost.updateMany({ clientId: curveUser.clientId, _id: { $in: ids } }, { $set: { archived } }, { timestamps: false })
        .then((result) => {
          res.status(200).json({ message: `Costs successfully ${archived ? 'archived' : 'unarchived'}.` });
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: err.message });
        });
    } else {
      return res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;

    Cost.findById(params.id)
      .then(async (cost) => {
        if (!cost) {
          res.status(404).json({ message: `Could not find Cost with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'sales', document: cost, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (cost) {
          cost.patches
            .find({ ref: cost._id })
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
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/filter_options', async (req, res) => {
    const { curveUser } = req;
    if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'sales' })) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    try {
      const filterOptions = await CostsController.getFilterOptions({ clientId: curveUser.clientId });
      return res.status(200).json(filterOptions);
    } catch (err) {
      logger.error('Failed to retrieve all cost target periods:', err);
      return res.status(500).json({ message: 'Internal Error' });
    }
  })

  .get('/:id', (req, res) => {
    const { curveUser, params } = req;

    Cost.findById(params.id)
      .populate('createdBy', 'email')
      .populate('lastModifiedBy', 'email')
      .then(async (cost) => {
        if (!cost) {
          res.status(404).json({ message: `Could not find Cost with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'sales', document: cost, clientOnly: true })) {
          return res.status(403).json({ message: 'Forbidden' });
        } else if (cost.file) {
          fileManager.publicS3Link(cost.file, (publicLink) => {
            cost.publicLink = publicLink;
            res.status(200).json(cost);
          });
        } else {
          res.status(200).json(cost);
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .put('/:id', (req, res) => {
    const { curveUser, params, body } = req;

    const validation = CostsController.validateParams(body);
    if (!validation.success) {
      return res.status(400).json({ message: validation.errors });
    }

    Cost.findById(params.id)
      .then(async (foundCost) => {
        if (!foundCost) {
          res.status(404).json({ message: `Could not find Cost with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: foundCost, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          delete body.clientId;
          delete body.publicLink;
          delete body.clientId;
          // eslint-disable-next-line guard-for-in
          for (const i in body) { foundCost[i] = body[i]; }

          foundCost.lastModifiedBy = curveUser.id;
          // Update Costs
          foundCost.save()
            .then((cost) => {
              res.status(200).json(cost);
            })
            .catch((err) => {
              logger.error(err);
              return res.status(500).json({ message: err.message });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .delete('/bulk', (req, res) => {
    const { curveUser, body } = req;

    if (!curveUser.clientId || curveUser?.rights?.[curveUser?.clientId]?.sales !== 'Edit') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (!body?.ids?.length) { return res.status(404).json({ message: 'Could not find Costs' }); }

    const ids = body.ids.map((id) => new ObjectId(id));
    const errors = [];
    let deletedCount = 0;
    // Retrieves docs for deletion and delete each document individually so that we can store the data in patches collections for recalculation filters
    Cost.find({ clientId: curveUser.clientId, _id: { $in: ids } })
      .then((costs) => {
        async.eachLimit(costs, 10, (cost, cb) => {
          UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'sales', document: cost, clientOnly: true })
            .then((forbidden) => {
              if (!forbidden) {
                cost.deleteOne()
                  .then(() => {
                    deletedCount += 1;
                    cb();
                  })
                  .catch((err) => {
                    logger.error(err);
                    err = err.toString().substring(7, err.toString().length);
                    // Check if association error or internal
                    errors.push({
                      cost: cost.name,
                      errors: (err.includes('"link"')) ? JSON.parse(err) : [{ message: 'Internal error, please try again' }],
                    });
                    cb();
                  });
              } else {
                cb();
              }
            });
        }, () => {
          const status = (errors.length > 0) ? 201 : 200;
          res.status(status).json({ deletedCount, errors });
        });
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .delete('/:id', (req, res) => {
    const { curveUser, params } = req;

    Cost.findById(params.id)
      .then(async (cost) => {
        if (!cost) {
          res.status(404).json({ message: `Could not find Cost with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: cost, clientOnly: true })) {
          return res.status(403).json({ message: 'Forbidden' });
        } else {
          cost.deleteOne()
            .then(() => {
              res.status(200).json(cost);
            })
            .catch((err) => {
              logger.error(err);
              err = err.toString().substring(7, err.toString().length);
              const response = (err.includes('"link"')) ? JSON.parse(err) : [{ message: 'Internal error, please try again' }];
              res.status(201).json(response);
            });
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
    body.createdBy = curveUser.id;
    body.lastModifiedBy = curveUser.id;
    delete body.publicLink;

    const validation = CostsController.validateParams(body);
    if (!validation.success) {
      return res.status(400).json({ message: validation.errors });
    }

    const cost = new Cost(body);

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: cost, clientOnly: true })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    cost.save()
      .then((cost) => {
        res.status(200).json(cost);
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: err.message });
      });
  })

  .post('/import', upload.single('file'), (req, res) => {
    const { curveUser, file } = req;

    if (!curveUser.clientId || curveUser?.rights?.[curveUser?.clientId]?.sales !== 'Edit') { return res.status(403).json({ message: 'Forbidden' }); }

    if (!file) { return res.status(400).json({ errors: ['Requires a file to be uploaded'] }); }

    Cost.importFromExcel(file, curveUser);
    res.status(200).json({ message: 'Costs are importing, and a report will be sent to you shortly.' });
  })

  .put('/:id/upload', (req, res) => {
    const { curveUser, params, body } = req;

    // Write to S3
    Cost.findById(params.id)
      .then(async (cost) => {
        if (!cost) {
          // @Arjun: This should be a 404 no?
          res.status(500).json({ message: `Could not find Cost with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: cost, clientOnly: true })) {
          return res.status(403).json({ message: 'Forbidden' });
        } else {
          // Get upload credentials
          fileManager.getUploaderCredentials(`costs/${cost._id.toString()}/${Date.now()}/`, body, (data) => {
            data.completePath = `/costs/${cost._id.toString()}/upload_complete`;
            data.fileName = body.filename;
            res.status(200).jsonp(data);
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .put('/:id/upload_complete', (req, res) => {
    const { curveUser, params, body } = req;

    // Write to S3
    Cost.findById(params.id)
      .then(async (cost) => {
        if (!cost) {
          res.status(500).json({ message: `Could not find Cost with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: cost, clientOnly: true })) {
          return res.status(403).json({ message: 'Forbidden' });
        } else {
          cost.files.push({ key: body.key });
          cost.save()
            .then(() => {
              Cost.findById(params.id)
                .then((cost) => {
                  res.status(200).json({ type: 'Complete', message: 'The file is successfully uploaded', files: cost.files, version: cost.__v });
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json({ message: err.message || 'Internal error, please try again' });
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
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .delete('/:id/file/:key', (req, res) => {
    const { curveUser, params } = req;

    Cost.findById(params.id)
      .then(async (cost) => {
        if (!cost) {
          res.status(404).json({ message: `Could not find Cost with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: cost, clientOnly: true })) {
          return res.status(403).json({ message: 'Forbidden' });
        } else {
          let { files } = cost;
          files = files.filter((file) => {
            if (file.key.replace(/\//g, '-') !== params.key) {
              return file;
            }
            fileManager.deleteFromS3(file.key, () => {
              logger.info(`S3 file deleted with key${file.key}`);
            });
          });
          cost.files = files;
          cost.save()
            .then(() => {
              res.status(200).json({ type: 'Complete', message: 'The file is successfully deleted', files: cost.files });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.message || 'Internal error, please try again' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  });

function paramsToFilterField(inputParams, user) {
  const params = Cost.paramsToFilterField(inputParams, user);
  return applyDateFilters(inputParams, params);
}

module.exports = router;
