const { logger, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const { AtlasSearch, WorkController, Projection, Page, Utils, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('mongodb');
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');

const router = express.Router();
const parseUrlencoded = bodyParser.urlencoded({ extended: true, limit: '50mb', parameterLimit: 100000 });
const appRootDir = require('app-root-dir').get();
const async = require('async');
const apiHelper = require('../../libs/apiHelper');
const workController = require('../../controllers/work');

const UnmappedWork = require('../../models/unmappedWork');
const Work = require('../../models/work');
const Payee = require('../../models/payee');
const Client = require('../../models/client');
const User = require('../../models/user');
const Task = require('../../models/task');
const DeliveryPartner = require('../../models/deliveryPartner');
const DeliveredWork = require('../../models/deliveredWork');
const DeliverySchedule = require('../../models/deliverySchedule');
const CwrDelivery = require('../../models/cwrDelivery');
const DeliveryLog = require('../../models/deliveryLog');
const TerritoryGroup = require('../../models/territoryGroup');
const Notification = require('../../models/notification');
const historyModelUser = require('../../libs/historyModelUser');
const DeliveryLogController = require('../../controllers/deliveryLog');
const { updateCatalogueIdentifiers } = require('../../processes/updateCatalogueIdentifiers/updateCatalogueIdentifiers');
const { CSVRawExport } = require('../../libs/mongodb-export');

const DuplicateWorks = require('../../libs/duplicates/works');

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
  .get('/', async (req, res) => {
    workController.getWorks({ query: req.query, curveUser: req.curveUser, res });
  })

  .get('/deliveryStatuses', async (req, res) => {
    const { curveUser, query } = req;

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
      const paginationParams = {
        page: Page.valueOrDefault(query?.filter?.page, 1),
        limit: Page.valueOrDefault(query?.filter?.limit, 25),
        sort: Page.sortOrDefault(query?.worksPagination?.orderBy, query?.worksPagination?.orderDir),
      };
      WorkController.deliveryStatuses({ DeliverySchedule, Work, CwrDelivery, DeliveryPartner, TerritoryGroup, req, paginationParams })
        .then((statuses) => {
          res.status(200).json(statuses);
        })
        .catch((error) => {
          logger.error(error);
          res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team' });
        });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .post('/exportDeliveryStatuses', async (req, res) => {
    if (req.curveUser.clientId) {
      WorkController.exportDeliveryStatuses({ Client, Notification, DeliveryPartner, DeliverySchedule, Work, CwrDelivery, TerritoryGroup, req });
      res.status(200).json();
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .post('/export', async (req, res) => {
    try {
      if (!req.curveUser?.clientId || !UserAccess.allowReadAccessToAll({ user: req.curveUser, type: 'catalogue' })) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      await workController.exportWorks({ curveUser: req.curveUser, body: req.body });
      return res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
    } catch (err) {
      logger.error(err);
      if (err?.code) return res.status(err.code).json({ message: err.message });
      return res.status(500).json({ message: 'Internal error, please try again' });
    }
  })

  .post('/raw-export', async (req, res) => {
    if (!req.curveUser?.clientId || !UserAccess.allowReadAccessToAll({ user: req.curveUser, type: 'catalogue' })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    try {
      const { body, curveUser } = req;
      const sync = body.sync === true;

      const sanitisedFilter = WorkController.sanitiseFilter(body.ids?.length ? { ids: body.ids } : body.filter);
      const { aggregation } = await AtlasSearch.buildSearchAggregation({ Payee, filterInput: sanitisedFilter, user: curveUser, params: WorkController.workSearchParams });
      const customCursor = await Work.aggregate(aggregation).allowDiskUse(true).cursor();

      if (sync) {
        const result = await CSVRawExport({ curveUser, collectionName: 'works', customCursor, sync: true });
        return res.status(200).json(result);
      }

      CSVRawExport({ curveUser, collectionName: 'works', customCursor });
      return res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: err.message || 'Internal error, please try again' });
    }
  })

  .post('/export_validation_errors', async (req, res) => {
    if (!req.curveUser?.clientId || !UserAccess.allowReadAccessToAll({ user: req.curveUser, type: 'catalogue' })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { body, curveUser } = req;
    try {
      const sanitisedFilter = WorkController.sanitiseFilter(body.ids?.length ? { ids: body.ids } : body.filter);
      workController.runValidationExport({ curveUser, filter: sanitisedFilter });
      res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
    } catch (err) {
      logger.error(err);
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .post('/create_delivery', async (req, res) => {
    if (req.curveUser?.rights?.[req.curveUser?.clientId]?.catalogue !== 'Edit') { return res.status(403).json({ message: 'Forbidden' }); }

    try {
      let workIds = [];
      if (req.body.ids && req.body.ids.length !== 0) {
        workIds = req.body.ids;
      } else {
        const searchParams = {
          ...WorkController.workSearchParams, // start with initial work search params
          project: {
            _id: 1,
          },
        };
        const result = await Utils.atlasSearch({ Payee, Model: Work, query: req.body.filter, user: req.curveUser, params: searchParams });
        workIds = result.docs.map((work) => work._id);
      }
      Work.createDelivery({ _id: { $in: workIds } }, req.curveUser, (err, delivery) => {
        if (err) {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        } else {
          res.status(200).json(delivery);
        }
      });
    } catch (err) {
      logger.error(err);
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  /**
   * @api {post} /works/create_many Create multiple Works
   * @apiGroup works
   *
   * @apiUse TokenParams
   * @apiBody {object[]} works - Works to create
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    "created": [0, 1, 3, 4],
   *    "failed": [2, 5, 6]
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   */
  .post('/create_many', async (req, res) => {
    WorkController.createMany({ Payee, Work, UnmappedWork, req })
      .then((data) => {
        if (data.status === 200) {
          res.status(200).json(data.response);
        } else {
          res.status(data.status).json(data.response);
        }
      })
      .catch((error) => {
        logger.error(error);
        res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
      });
  })
  .post('/get_works', async (req, res) => {
    workController.getWorks({ query: req.body, curveUser: req.curveUser, res });
  })

  .get('/duplicates', async (req, res) => {
    const { curveUser, query } = req;
    try {
      if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const works = await DuplicateWorks.getDuplicateWorks({ clientId: curveUser.clientId, query });
      res.status(200).json(works);
    } catch (e) {
      logger.error(e);
      res.status(500).json({ message: 'Internal error, please try again' });
    }
  })

  .get('/:id/history', async (req, res) => {
    const { curveUser, params } = req;
    Work.findById(params.id)
      .then(async (work) => {
        if (!work) {
          res.status(404).json({ message: `Could not find Work with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: work, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (work) {
          work.patches
            .find({ ref: work._id })
            .populate('author', 'email')
            .then((patches) => {
              historyModelUser.addModifiedBy(patches, (err, patches) => {
                if (err) {
                  res.status(500).json({ message: 'Internal error, please try again' });
                } else {
                  res.status(200).json({ modelHistory: patches });
                }
              });
            })
            .catch((err) => {
              res.status(500).json({ message: 'Internal error, please try again' });
              logger.error(`Error finding work patches with work id '${params.id}': ${err}`);
            });
        } else {
          res.status(500).json({ message: 'Internal error, please try again' });
          logger.error(`/${params.id}/history error.`);
        }
      })
      .catch((err) => {
        res.status(500).json({ message: 'Internal error, please try again' });
        logger.error(`Error finding work by id '${params.id}': ${err}`);
      });
  })

  .get('/:id/deliveries', async (req, res) => {
    const { curveUser, params, query } = req;

    try {
      const work = await Work.findById(params.id);
      if (!work) {
        return res.status(404).json({ message: `Could not find Work with ID ${params.id}` });
      }

      if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: work, clientOnly: true })) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      let deliveries = await WorkController.getSingleWorkDeliveries({ DeliveryPartner, DeliverySchedule, work });

      if (query.showLogs === 'true') {
        const deliveryPartnerIds = deliveries.map(({ deliveryPartner }) => deliveryPartner._id);
        const deliveryLogs = await DeliveryLogController.getUsingPartnerIds({ deliveryPartnerIds, work, user: curveUser });
        deliveries = deliveries.map((delivery) => {
          const deliveryLog = deliveryLogs.find(({ deliveryPartnerId }) => deliveryPartnerId._id.toString() === delivery.deliveryPartner._id.toString());
          delivery.logs = deliveryLog?.log ?? [];
          return delivery;
        });
      }

      return res.status(200).json({ deliveries });
    } catch (error) {
      logger.error(error);
      res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
    }
  })

  .get('/:id/deliveries_from_merged_works', async (req, res) => {
    const { curveUser, params } = req;
    try {
      const work = await Work.findById(params.id);
      if (!work) return res.status(404).json({ message: `Could not find Work with ID ${params.id}` });
      if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: work, clientOnly: true })) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const deliveries = await workController.getDeliveriesFromMergedWorks(work);
      return res.status(200).json({ deliveries });
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Internal error, please try again' });
    }
  })

  .get('/:id', (req, res) => {
    const { curveUser, params } = req;
    Work.findById(params.id)
      .select(Projection.getFields('work', 'editPage'))
      .then(async (work) => {
        if (!work) {
          res.status(404).json({ message: `Could not find Work with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: work, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (work) {
          // Populate Composer and Publisher Ids on the chain
          work.populateIpChain(async () => {
            // Format the populated contractIds on sales rights to keep the original contractId field.
            work = await Work.formatPopulatedRights(work);
            res.status(200).json(work);
          });
        } else {
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        res.status(500).json({ message: 'Internal error, please try again' });
        logger.error(`Error finding work by id '${params.id}': ${err}`);
      });
  })

  .post('/flushContracts', async (req, res) => {
    if (req.curveUser?.rights?.[req.curveUser?.clientId]?.catalogue !== 'Edit') { return res.status(403).json({ message: 'Forbidden' }); }

    try {
      const client = await Client.findById(req.curveUser?.clientId);
      if (client) {
        const user = await User.findById(req.curveUser?.id);
        if (user) {
          const filter = req.body?.ids?.length > 0 ? { ids: req.body.ids } : WorkController.paramsToFilterField(req.body.filter, req.curveUser);
          const count = await Task.countDocuments({
            name: { $in: ['Flushing Contracts to Works'] },
            clientId: client._id.toString(),
            status: { $in: ['Pending', 'In Progress'] },
            'value.clientId': client._id.toString(),
          });
          if (!count) {
            TaskHelpers.createTaskAndSendMessage(Task, {
              name: 'Flushing Contracts to Works',
              clientId: client._id,
              clientName: client.name,
              email: user.email,
              value: { clientId: client._id.toString(), filter },
            })
              .then(() => {
                res.status(200).json({ message: 'Flushing contracts from Ip Chains, you will be notified when this is complete.' });
              })
              .catch((err) => {
                res.status(500).json({ message: 'Could not create task and send SQS message' });
              });
          } else {
            res.status(500).json({ message: 'This task is already running - please wait until it has completed before running again' });
          }
        } else {
          res.status(404).json({ message: 'Could not find user' });
        }
      }
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Task Errored' });
    }
  })

  .put('/:id', (req, res) => {
    const { curveUser, params, body } = req;

    Work.findById(params.id, Projection.getFields('work', 'editPage'))
      .then(async (foundWork) => {
        if (!foundWork) {
          res.status(404).json({ message: `Could not find Work with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundWork, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          delete body.clientId;
          delete body.deliveries;
          // eslint-disable-next-line guard-for-in
          for (const i in body) { foundWork[i] = body[i]; }
          // Remove workLanguage if not present in the data
          if (!body.workLanguage) { foundWork.workLanguage = null; }

          if (foundWork.alternateTitles?.length > 0) {
            foundWork.alternateTitles = foundWork.alternateTitles.filter((title) => Object.keys(title).length);
          }

          // Update Work Record
          foundWork.lastModifiedBy = curveUser.id;
          foundWork.save()
            .then((work) => {
              // Populate Composer and Publisher Ids on the chain
              work.populateIpChain(async () => {
                // Format the populated contractIds on sales rights to keep the original contractId field.
                work = await Work.formatPopulatedRights(work);
                res.status(200).json(work);
              });
            })
            .catch((err) => {
              logger.error(`Error updating work with id '${params.id}': ${err}`);
              res.status(500).json({ message: err?.message || 'Internal error, please try again' });
            });
        }
      }).catch((err) => {
        logger.error(`Error updating work with id '${params.id}': ${err}`);
        res.status(500).json({ message: err?.message || 'Internal error, please try again' });
      });
  })

  .put('/:id/approve', async (req, res) => {
    const { curveUser, params } = req;

    const foundWork = await Work.findById(params.id, Projection.getFields('work', 'editPage'))
      .catch((error) => {
        logger.error(`Error finding work by id '${params.id}': ${error}`);
        // Response will send via the next block so no response needed here
      });

    if (!foundWork) {
      res.status(404).json({ message: `Could not find Work with ID ${params.id}` });
    } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundWork, clientOnly: true })) {
      res.status(403).json({ message: 'Forbidden' });
    } else if (foundWork) {
      foundWork.approve(curveUser.id).then((approvedWork) => {
        if (approvedWork?.approvalStatus === 'Approved') {
          res.status(200).json({ message: 'Work Approved', approvedDate: approvedWork.approvedDate, approvalStatus: approvedWork.approvalStatus });
        } else {
          res.status(500).json({
            message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.',
          });
        }
      }).catch((error) => {
        logger.error(error);
        res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
      });
    } else {
      res.status(500).json({ message: 'Internal error, please try again' });
    }
  })

  .put('/:id/update_deliveries', async (req, res) => {
    const { curveUser, params, body } = req;

    const foundWork = await Work.findById(params.id)
      .catch((error) => {
        logger.error(`Error finding work by id '${params.id}': ${error}`);
        // Response will send via the next block so no response needed here
      });

    if (!foundWork) {
      res.status(404).json({ message: `Could not find Work with ID ${params.id}` });
    } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundWork, clientOnly: true })) {
      res.status(403).json({ message: 'Forbidden' });
    } else if (foundWork) {
      WorkController.updateDeliveryStatus({ DeliverySchedule, DeliveredWork, DeliveryLog, work: foundWork, deliveries: body.deliveries })
        .then(() => {
          res.status(200).json({ message: 'Delivery status updated' });
        })
        .catch((error) => {
          logger.error(error);
          res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
        });
    } else {
      res.status(500).json({ message: 'Internal error, please try again' });
    }
  })

  .post('/approve_many', (req, res) => {
    const { curveUser, body } = req;

    const { ids } = body;
    if (Array.isArray(ids)) {
      const approved = [];
      const failed = [];
      // Loop through works in series to ensure they are created and validated one by one
      async.eachLimit(ids, 10, async (id) => {
        const foundWork = await Work.findById(id, Projection.getFields('work', 'editPage'));
        if (!foundWork) {
          failed.push(id);
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundWork, clientOnly: true })) {
          failed.push(id);
        } else {
          const approvedWork = await foundWork.approve(curveUser.id).catch((error) => {
            logger.error(error);
            failed.push(id);
          });
          if (approvedWork?.approvalStatus === 'Approved') {
            approved.push(id);
          } else {
            failed.push(id);
          }
        }
      }, (eachErr) => {
        if (eachErr) {
          return res.status(500).json({
            message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.',
          });
        }
        // return a list of both approved works and failed work indexes
        const response = {
          approved,
          failed,
        };
        res.status(200).json(response);
      });
    } else {
      return res.status(500).json({
        message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.',
      });
    }
  })

  .put('/:id/toggle_hold', async (req, res) => {
    const { curveUser, params } = req;

    const foundWork = await Work.findById(params.id, Projection.getFields('work', 'editPage'))
      .catch((error) => {
        logger.error(`Error finding work by id '${params.id}': ${error}`);
        // Response will send via the next block so no response needed here
      });

    if (!foundWork) {
      res.status(404).json({ message: `Could not find Work with ID ${params.id}` });
    } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundWork, clientOnly: true })) {
      res.status(403).json({ message: 'Forbidden' });
    } else if (foundWork) {
      foundWork.toggleHold(curveUser.id).then((onHold) => {
        res.status(200).json({ message: 'Hold status updated' });
      }).catch((error) => {
        logger.error(error);
        res.status(500).json({ message: error });
      });
    } else {
      res.status(500).json({ message: 'Internal error, please try again' });
    }
  })

  .post('/hold_many', (req, res) => {
    const { curveUser, body } = req;

    const { ids } = body;
    if (Array.isArray(ids)) {
      const putOnHold = [];
      const failed = [];
      // Loop through works in series to ensure they are created and validated one by one
      async.eachLimit(ids, 10, async (id) => {
        const foundWork = await Work.findById(id, Projection.getFields('work', 'editPage'));
        if (!foundWork) {
          failed.push(id);
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundWork, clientOnly: true })) {
          failed.push(id);
        } else if (foundWork && !foundWork.onHold) {
          const onHold = await foundWork.toggleHold(curveUser.id).catch((error) => {
            logger.error(error);
            failed.push(id);
          });
          if (onHold) {
            putOnHold.push(id);
          }
        } else {
          failed.push(id);
        }
      }, (eachErr) => {
        if (eachErr) {
          return res.status(500).json({
            message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.',
          });
        }
        // return a list of both putOnHold works and failed work indexes
        const response = {
          putOnHold,
          failed,
        };
        res.status(200).json(response);
      });
    } else {
      return res.status(500).json({
        message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.',
      });
    }
  })

  .post('/resume_many', (req, res) => {
    const { curveUser, body } = req;

    const { ids } = body;
    if (Array.isArray(ids)) {
      const resumed = [];
      const failed = [];
      // Loop through works in series to ensure they are created and validated one by one
      async.eachLimit(ids, 10, async (id) => {
        const foundWork = await Work.findById(id, Projection.getFields('work', 'editPage'));
        if (!foundWork) {
          failed.push(id);
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundWork, clientOnly: true })) {
          failed.push(id);
        } else if (foundWork && foundWork.onHold) {
          const onHold = await foundWork.toggleHold(curveUser.id).catch((error) => {
            logger.error(error);
            failed.push(id);
          });
          if (!onHold) {
            resumed.push(id);
          }
        } else {
          failed.push(id);
        }
      }, (eachErr) => {
        if (eachErr) {
          return res.status(500).json({
            message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.',
          });
        }
        // return a list of both resumed works and failed work indexes
        const response = {
          resumed,
          failed,
        };
        res.status(200).json(response);
      });
    } else {
      return res.status(500).json({
        message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.',
      });
    }
  })

  .delete('/', async (req, res) => {
    const { curveUser, body } = req;
    if (curveUser?.rights?.[req.curveUser?.clientId]?.catalogue !== 'Edit' && !req.curveUser.internal) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (!body.ids?.length) return res.status(404).json({ message: 'Could not find Works' });
    try {
      const { code, message } = await workController.deleteWorks({
        clientId: curveUser.clientId,
        deleteType: body.type,
        ids: body.ids,
      });
      res.status(code).json(message);
    } catch (err) {
      logger.error(err);
      res.status(err?.code ?? 500).json({ message: err?.message ?? 'Internal error, please try again' });
    }
  })

  .post('/', parseUrlencoded, async (req, res) => {
    const { curveUser, body } = req;

    delete body.createdAt;
    delete body.partyNo;
    delete body.deliveries;
    delete body.deliveredTo;
    body.clientId = curveUser.clientId;
    body.createdBy = curveUser.id;
    body.lastModifiedBy = curveUser.id;
    body._creationType = body.creationType ?? 'standard';
    delete body.creationType;

    const work = new Work(body);
    work._creationType = body._creationType;

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: work, clientOnly: true })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    work.save()
      .then(async (savedWork) => {
        if (body.unmappedWorkIds?.length > 0) {
          await UnmappedWork.updateMany({ _id: { $in: body.unmappedWorkIds } }, { $set: { workId: work._id.toString(), complete: true } }).catch(logger.error);
        }
        res.status(200).json(savedWork);
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: err.message });
      });
  })

  .post('/import', upload.single('file'), (req, res) => {
    const overwriteBlanks = req.query.overwriteBlanks === 'true';

    const { curveUser, file } = req;

    if (!file) { return res.status(400).json({ errors: ['Requires a file to be uploaded'] }); }

    Work.importFromExcel(file, curveUser, overwriteBlanks);
    res.status(200).json({ message: 'Works are importing, and a report will be sent to you shortly.' });
  })

  .post('/updateMainIdentifiers', upload.single('file'), async (req, res) => {
    const { curveUser, file } = req;
    if (!file) { return res.status(400).json({ errors: ['Requires a file to be uploaded'] }); }
    if (curveUser.internal) {
      updateCatalogueIdentifiers({ clientId: curveUser.clientId, file, catalogueName: 'Works', curveUser });
      res.status(200).json({ message: "We're updating the Main Identifiers, a report will be sent to you shortly." });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .post('/bulk_include', (req, res) => {
    if (!req.body.ids?.length) { return res.status(500).json({ message: 'A list of Work IDs is required' }); }

    const ids = req.body.ids.filter((id) => (id.length === 24 && ObjectId.isValid(id)));
    Work.find({ clientId: req.curveUser.clientId, _id: { $in: ids } }, 'title')
      .then((works) => {
        res.status(200).json(works);
      })
      .catch((error) => {
        logger.error(error);
        res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
      });
  })

  .post('/bulk_update_deliveries', (req, res) => {
    if (!req.body.deliveryPartnerIds?.length) { return res.status(500).json({ message: 'A list of partner IDs is required' }); }
    if (!req.body.deliveryStatus) { return res.status(500).json({ message: 'A delivery status is required' }); }

    WorkController.bulkUpdateDeliveryStatus({ Work, Payee, DeliveryLog, DeliveredWork, DeliverySchedule, req })
      .then(() => {
        res.status(200).json({ message: 'Updated status successfully' });
      })
      .catch((error) => {
        logger.error(error);
        res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
      });
  })

  .post('/redeliver_workids', (req, res) => {
    if (!req.body.workIds?.length) { return res.status(500).json({ message: 'A list of work IDs is required' }); }
    if (!req.body.deliveryPartnerId) { return res.status(500).json({ message: 'A delivery partner is required' }); }

    WorkController.redeliverWorkIds({ Payee, Work, DeliverySchedule, req })
      .then(() => {
        res.status(200).json({ message: 'Updated status successfully' });
      })
      .catch((error) => {
        logger.error(error);
        res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
      });
  })

  .post('/update_works_with_filter', (req, res) => {
    if (!req.body.deliveryPartnerId) { return res.status(500).json({ message: 'A delivery partner is required' }); }

    WorkController.updateWorksWithFilter({ Work, Payee, CwrDelivery, DeliveryPartner, TerritoryGroup, DeliverySchedule, DeliveredWork, DeliveryLog, Notification, req });

    res.status(200).json({ message: 'Update in progress' });
  })

  .post('/significant_update_check/:id', (req, res) => {
    Work.findById(req.params.id).then((work) => {
      const significantUpdateChanges = WorkController.significantUpdateCheck({ work: req.body, oldWork: work });
      res.status(200).json({ significantUpdateChanges });
    }).catch((error) => {
      logger.error(error);
      res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
    });
  })

  .get('/:id/source', async (req, res) => {
    const { curveUser, params } = req;

    try {
      const workSource = await workController.getWorkSource({ curveUser, workId: params.id });
      return res.status(200).json(workSource);
    } catch (err) {
      apiHelper.errorHandler(err, res);
    }
  })

  .post('/duplicates/overview', async (req, res) => {
    const { curveUser, body } = req;
    try {
      if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) return res.status(403).json({ message: 'Forbidden' });
      const mergeData = await DuplicateWorks.getMergeOverview({
        clientId: curveUser.clientId,
        primaryWorkId: body?.primaryWorkId,
        duplicateWorks: body?.duplicateWorks,
      });
      return res.status(200).json(mergeData);
    } catch (e) {
      logger.error(e);
      if (e?.code) return res.status(e.code).json({ message: e.message });
      return res.status(500).json({ message: 'Internal error, please try again' });
    }
  })

  .post('/duplicates/merge', async (req, res) => {
    const { curveUser, body } = req;
    try {
      if (curveUser?.rights?.[curveUser?.clientId]?.catalogue !== 'Edit' && !curveUser?.internal) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      await DuplicateWorks.mergeWorks({
        clientId: curveUser.clientId,
        userId: curveUser.id,
        primaryWorkId: body?.primaryWorkId,
        mergeData: body?.data,
        deleteWorkIds: body?.deleteWorkIds,
        blacklistedDuplicateIds: body?.blacklistedDuplicateIds,
      });
      return res.status(200).json({ message: 'Works updated successfully' });
    } catch (e) {
      if (e?.code) return res.status(e.code).json({ message: e.message });
      logger.error(e);
      return res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
    }
  });

module.exports = router;
