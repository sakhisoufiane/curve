const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { Projection, Page, Utils, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('mongodb');
const _ = require('lodash');
const express = require('express');
const appRootDir = require('app-root-dir').get();
const bodyParser = require('body-parser');
const async = require('async');
const multer = require('multer');
const ContractController = require('../../controllers/contracts');
const { CSVRawExport } = require('../../libs/mongodb-export');
const { applyDateFilters } = require('../../libs/dateFilters');
const Contract = require('../../models/contract');
const Release = require('../../models/release');
const Track = require('../../models/track');
const Work = require('../../models/work');
const Cost = require('../../models/cost');
const historyModelUser = require('../../libs/historyModelUser');
const SalesItemHelpers = require('../../libs/salesItemHelpers');
const { validateFileType, validateContentType } = require('../../libs/validateFileType');
const Payee = require('../../models/payee');
const ContractsImporter = require('../../libs/imports/contracts');
const { getContractStatus, getAtlasStatusFilter, getMongoStatusFilter } = require('../../libs/contractStatus');

const router = express.Router();
const parseJson = bodyParser.json({ limit: '50mb' });

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
  /**
     * @api {get} /contracts/ Get all Contracts
     * @apiGroup contracts
     *
     * @apiUse TokenParams
     * @apiParam {String} [text] - Filter on supplied text string
     * @apiParam {String} [payeeId] - Filter by PayeeId
     * @apiParam {String} [contractType] - Filter by Contract type
     * @apiParam {String[]} [ids] - Only return documents matching theser ids
     * @apiParam {Number} [page] - Page number to return
     * @apiParam {Number} [limit] - Number of items to return per page
     * @apiParam {String} [orderBy] - Column to order by
     * @apiParam {String} [orderDir] - Order direction ("asc", "desc")
     *
     * @apiSuccess {Object[]} contracts - Array of Contracts
     * @apiSuccess {Object} meta - Meta data
     * @apiSuccess {Number} meta.currentPage - Number of page returned
     * @apiSuccess {Number} meta.totalPages - Total number of pages
     * @apiSuccess {Number} meta.total - Number of Sales Templates for client
     * @apiSuccessExample {json} Success Response:
     *  HTTP/1.1 200 OK
     *  {
     *    "contracts": [
     *      {
     *        _id: "5e1494037f08d7395fd35511",
     *        name: "Contract 1",
     *        ...
     *      },
     *      {
     *        _id: "5e1494037f08d7395fd35585",
     *        name: "Contract 2",
     *        ...
     *      },
     *      ...
     *    ],
     *    "meta": {
     *      "currentPage": 1,
     *      "totalPages": 1,
     *      "total": 25
     *    }
     *  }
     *
     * @apiUse ErrorForbidden
     * @apiUse ErrorInternalServerError
     */
  .get('/', async (req, res) => {
    const { curveUser, query } = req;
    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'contracts', allowPayee: false })) {
      let total = 0; let result;
      if (query && query.text && query.autocomplete) {
        // Create contractIds from companyIds and add to contractIds
        query.contractIds = await Utils.combineContractAndCompanyIds({ Contract, inputParams: query, clientId: curveUser.clientId });
        // Run using Atlas Search
        logger.debug('Running contract query using Atlas Search');
        try {
          const searchParams = {
            searchIndex: 'contractAutocomplete',
            page: Page.valueOrDefault(query.page, 1),
            limit: Page.valueOrDefault(query.limit, 50),
            sortBy: query.orderBy,
            sortOrder: query.orderDir,
            project: Projection.getFields('contract', 'autocomplete'),
            filterItems: [
              { name: 'name', field: 'name', type: 'text' },
              { name: 'contractType', field: 'contractType', type: 'text' },
              { name: 'expiresAfter', field: 'endDate', type: 'after' },
              { name: 'expiresBefore', field: 'endDate', type: 'before' },
              {
                name: 'status',
                type: 'custom',
                handler: getAtlasStatusFilter,
              },
            ],
            textSearchFields: ['name'],
          };
          result = await Utils.atlasSearch({ Payee, Model: Contract, query, user: curveUser, params: searchParams });
          total = result?.total;
        } catch (err) {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      }
      if (total === 0) {
        logger.debug('Running contract query using normal Search');
        const paginationParams = {
          page: Page.valueOrDefault(query.page, 1),
          limit: Page.valueOrDefault(query.limit, 50),
          sort: Page.sortOrDefault(query.orderBy, query.orderDir),
          select: '_id name foreignId projectId contractType type contractCategories createdAt active payeeBalanceCondition payees accountingPeriod valid validationErrors updatedAt endDate collectionEndDate retentionPeriodEndDate crossContracts',
          populate: { path: 'payees.payeeId', model: 'Payee', select: 'name' },
        };
        Contract.paginate(await paramsToFilterField(query, curveUser), paginationParams, (err, result) => {
          if (err) {
            logger.error(err);
            res.status(500).json({ message: 'Internal error, please try again' });
          } else {
            res.status(200).json({
              contracts: Contract.addPayeeNameToContracts(result.docs).map((c) => ({
                ...c,
                status: getContractStatus(c),
              })),
              meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs },
            });
          }
        });
      } else {
        res.status(200).json({
          contracts: result.docs.map((c) => ({ ...c, status: getContractStatus(c) })),
          meta: { currentPage: 1, totalPages: result.totalPages, total: result.total },
        });
      }
    } else if (curveUser.payeeId) {
      query.payeeId = curveUser.payeeId;

      const paginationParams = {
        page: Page.valueOrDefault(query.page, 1),
        limit: Page.valueOrDefault(query.limit, 50),
        sort: Page.sortOrDefault(query.orderBy, query.orderDir),
        populate: { path: 'payees.payeeId', model: 'Payee', select: 'name' },
      };
      Contract.paginate(await paramsToFilterField(query, curveUser), paginationParams, (err, result) => {
        if (err) {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        } else {
          res.status(200).json({
            contracts: Contract.addPayeeNameToContracts(result.docs).map((c) => ({
              ...c,
              status: getContractStatus(c),
            })),
            meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs },
          });
        }
      });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  /**
   * @api {post} /contracts/export Export Contracts
   * @apiGroup contracts
   *
   * @apiUse TokenParams
   * @apiBody {String[]} ids - Contract IDs to export
   * @apiBody {Object} filter - Filter the Contracts to export
   * @apiBody {String} filter.text - Filter based on the supplied text string
   * @apiBody {String} clientType - Type of the Client doing exporting the contracts
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    message: "Your report will be sent to you via email shortly"
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   */
  .post('/export', async (req, res) => {
    const { curveUser, body } = req;
    if (curveUser.clientId && ['View', 'Edit'].includes(curveUser.rights?.[curveUser.clientId]?.contracts)) {
      const contractType = body?.filter?.contractType;
      const clientType = (body && body.clientType) ? body.clientType : null;
      if (body.ids && body.ids.length !== 0) {
        Contract.sendExport({ _id: { $in: body.ids } }, contractType, clientType, curveUser);
      } else {
        Contract.sendExport(await paramsToFilterField(body.filter, curveUser), contractType, clientType, curveUser);
      }
      res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  /**
   * @api {post} /contracts/raw-export Raw CSV Export of Contracts
   * @apiGroup contracts
   *
   * @apiUse TokenParams
   * @apiBody {Object} [filter] - Filter the Contracts to export
   * @apiBody {String} [filter.updatedAfter] - Filter contracts updated after this date (ISO 8601)
   * @apiBody {String} [filter.updatedBefore] - Filter contracts updated before this date (ISO 8601)
   * @apiBody {String} [filter.createdAfter] - Filter contracts created after this date (ISO 8601)
   * @apiBody {String} [filter.createdBefore] - Filter contracts created before this date (ISO 8601)
   * @apiBody {Boolean} [sync=false] - If true, wait for export and return CSV link; if false, send via email
   *
   * @apiSuccess {json} Success Response (async mode)
   * @apiSuccessExample {json} Success Response (async):
   *  HTTP/1.1 200 OK
   *  {
   *    message: "Your report will be sent to you via email shortly"
   *  }
   *
   * @apiSuccess {json} Success Response (sync mode)
   * @apiSuccessExample {json} Success Response (sync):
   *  HTTP/1.1 200 OK
   *  {
   *    csvPublicLink: "https://s3.amazonaws.com/..."
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   */
  .post('/raw-export', async (req, res) => {
    const { curveUser, body } = req;
    const sync = body.sync === true;

    if (curveUser.clientId && ['View', 'Edit'].includes(curveUser.rights?.[curveUser.clientId]?.contracts)) {
      const filter = await paramsToFilterField(body.filter || {}, curveUser);

      if (sync) {
        try {
          const result = await CSVRawExport({ curveUser, collectionName: 'contracts', filter, sync: true });
          res.status(200).json(result);
        } catch (err) {
          logger.error(err);
          res.status(500).json({ message: 'Export failed', error: err.message });
        }
      } else {
        CSVRawExport({ curveUser, collectionName: 'contracts', filter });
        res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
      }
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  /**
   * @api {get} /contracts/:id/history Get Contract's edit history
   * @apiGroup contracts
   *
   * @apiUse TokenParams
   * @apiParam {String} id - Contract ID
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    modelHistory: [
   *      {
   *        author: 'Author Name'
   *        ops: [{op: "replace", path: "/lastModifiedBy", value: "600ff2f8d497a0001b460d6d",…},…]
   *        ref: "5e1493ff7f08d7395fd354ef"
   *        timestamp: "2021-03-24T09:28:56.839Z"
   *        __v: 0
   *        _id: "605b0658770577c1ad08797e"
   *      },
   *      ...
   *    ]
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   * @apiError NotFound Could not find Contract with ID
   * @apiErrorExample {json} NotFound Response:
   *  HTTP/1.1 404 NotFound
   *  {
   *    message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
   *  }
   */
  .get('/:id/history', async (req, res) => {
    const { curveUser, params } = req;

    Contract.findById(params.id)
      .then(async (contract) => {
        if (!contract) {
          res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'contracts', document: contract, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          contract.patches.find({ ref: contract._id })
            .populate('author', 'email')
            .then((patches) => {
              logger.debug(patches);
              historyModelUser.addModifiedBy(patches, (err, updatedPatches) => {
                res.status(200).json({ modelHistory: updatedPatches });
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
        res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
      });
  })

  /**
   * @api {get} /contracts/:id/statuses Get Contract's statuses by Payee ID
   * @apiGroup contracts
   *
   * @apiUse TokenParams
   * @apiParam {String} id - Payee ID
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    statuses: [
   *      { name: 'Contract 1', balance: 999 },
   *      { name: 'Contract 2', balance: 1299 },
   *      ...
   *    ]
   *  }
   *
   * @apiUse ErrorInternalServerError
   */
  .get('/:id/statuses', async (req, res) => {
    const filter = { 'payees.payeeId': req.params.id };
    if (req.curveUser.clientId) { filter.clientId = req.curveUser.clientId; }

    if (!filter.clientId && req.curveUser.payeeId) {
      const payee = await Payee.findById(req.curveUser.payeeId, 'clientId');
      if (payee && payee.clientId) { filter.clientId = payee.clientId; }
    }

    if (filter.clientId) {
      Contract.find(filter)
        .then((contracts) => {
          const statuses = [];
          async.each(contracts, (contract, callback) => {
            contract.balanceAtDate(new Date(), {}, (err, balance) => {
              statuses.push({ name: contract.name, balance });
              callback();
            });
          }, (err) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            } else {
              res.status(200).json(statuses);
            }
          });
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  /**
   * @api {get} /contracts/:id/flush_labels_to_catalogue Flush Contract onto catalogue
   * @apiGroup contracts
   *
   * @apiUse TokenParams
   * @apiParam {String} id - Contract ID
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    message: "Flushing contracts onto catalogue"
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   * @apiError NotFound Could not find Contract with ID
   * @apiErrorExample {json} NotFound Response:
   *  HTTP/1.1 404 NotFound
   *  {
   *    message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
   *  }
   */
  .get('/:id/flush_labels_to_catalogue', async (req, res) => {
    const { curveUser, params } = req;

    Contract.findById(params.id)
      .then(async (contract) => {
        if (!contract) {
          res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: contract, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          contract.matchContractToLabels((err) => {
            if (err) { logger.info(err); }
          });
          res.status(200).json({ message: 'Flushing contracts onto catalogue' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
      });
  })

  /**
     * @api {get} /contracts/:id Get single Contract
     * @apiGroup contracts
     *
     * @apiUse TokenParams
     * @apiParam {String} id - Contract ID
     *
     * @apiSuccess {json} Success Response
     * @apiSuccessExample {json} Success Response:
     *  HTTP/1.1 200 OK
     *  {
     *    _id: "5e1494037f08d7395fd35511",
     *    name: 'Contract 1',
     *    ...
     *  }
     *
     * @apiUse ErrorForbidden
     * @apiUse ErrorInternalServerError
     * @apiError NotFound Could not find Contract with ID
     * @apiErrorExample {json} NotFound Response:
     *  HTTP/1.1 404 NotFound
     *  {
     *    message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
     *  }
     */
  .get('/:id', (req, res) => {
    const { curveUser, params } = req;

    const select = curveUser.payeeId ? 'name openingBalance clientId' : ''; // We only need the contract name for payee users

    Contract.findById(req.params.id)
      .select(select)
      .then(async (contract) => {
        const document = contract;
        if (!contract) {
          res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Contract, Payee, user: curveUser, operation: 'read', type: 'contracts', document, clientOnly: false })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          // Format the populated contractIds on cross contracts to keep the original contractId field.
          contract = await Contract.formatPopulatedRights(contract);
          contract = await ContractController.getEscalations({ contract });
          res.status(200).json(contract);
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
      });
  })

  /**
   * @api {get} /contracts/:id/releases Get a single Contract's Releases
   * @apiGroup contracts
   *
   * @apiUse TokenParams
   * @apiParam {String} id - Contract ID
   * @apiParam {Number} [page] - Page number to return
   * @apiParam {Number} [limit] - Number of items to return per page
   * @apiParam {String} [orderBy] - Column to order by
   * @apiParam {String} [orderDir] - Order direction ("asc", "desc")
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    "releases": [
   *      {
   *        _id: "5e1494037f08d7395fd35511",
   *        title: "Release 1",
   *        ...
   *      },
   *      {
   *        _id: "5e1494037f08d7395fd35585",
   *        title: "Release 2",
   *        ...
   *      },
   *      ...
   *    ],
   *    "meta": {
   *      "currentPage": 1,
   *      "totalPages": 1,
   *      "total": 25
   *    }
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   * @apiError NotFound Could not find Contract with ID
   * @apiErrorExample {json} NotFound Response:
   *  HTTP/1.1 404 NotFound
   *  {
   *    message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
   *  }
   */
  .get('/:id/releases', (req, res) => {
    const { curveUser, params, query } = req;

    Contract.findById(req.params.id)
      .then(async (contract) => {
        if (!contract) {
          res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'contracts', document: contract, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          const paginationParams = {
            page: Page.valueOrDefault(query.page, 1),
            limit: Page.valueOrDefault(query.limit, 25),
            sort: Page.sortOrDefault(query.orderBy, query.orderDir),
            select: '_id title artist catNo barcode format salesReturnsRights createdAt',
          };
          Release.paginate({
            $and: [
              { clientId: contract.clientId },
              { $or: [{ salesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } }, { costsRights: { $elemMatch: { contractId: contract._id.toString() } } }] },
            ],
          }, paginationParams, (err, result) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            } else {
              res.status(200).json({ releases: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
      });
  })

  /**
   * @api {get} /contracts/:id/tracks Get a single Contract's Tracks
   * @apiGroup contracts
   *
   * @apiUse TokenParams
   * @apiParam {String} id - Contract ID
   * @apiParam {Number} [page] - Page number to return
   * @apiParam {Number} [limit] - Number of items to return per page
   * @apiParam {String} [orderBy] - Column to order by
   * @apiParam {String} [orderDir] - Order direction ("asc", "desc")
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    "tracks": [
   *      {
   *        _id: "5e1494037f08d7395fd35511",
   *        title: "Release 1",
   *        ...
   *      },
   *      {
   *        _id: "5e1494037f08d7395fd35585",
   *        title: "Release 2",
   *        ...
   *      },
   *      ...
   *    ],
   *    "meta": {
   *      "currentPage": 1,
   *      "totalPages": 1,
   *      "total": 25
   *    }
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   * @apiError NotFound Could not find Contract with ID
   * @apiErrorExample {json} NotFound Response:
   *  HTTP/1.1 404 NotFound
   *  {
   *    message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
   *  }
   */
  .get('/:id/tracks', (req, res) => {
    const { curveUser, params, query } = req;

    Contract.findById(req.params.id)
      .then(async (contract) => {
        if (!contract) {
          res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'contracts', document: contract, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          const paginationParams = {
            page: Page.valueOrDefault(query.page, 1),
            limit: Page.valueOrDefault(query.limit, 25),
            sort: Page.sortOrDefault(query.orderBy, query.orderDir),
            select: '_id title artist isrc salesReturnsRights',
          };

          Track.paginate({
            $and: [
              { clientId: contract.clientId },
              { $or: [{ salesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } }, { costsRights: { $elemMatch: { contractId: contract._id.toString() } } }] },
            ],
          }, paginationParams, (err, result) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            } else {
              res.status(200).json({ tracks: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
      });
  })

  /**
   * @api {get} /contracts/:id/works Get a single Contract's Works
   * @apiGroup contracts
   *
   * @apiUse TokenParams
   * @apiParam {String} id - Contract ID
   * @apiParam {Number} [page] - Page number to return
   * @apiParam {Number} [limit] - Number of items to return per page
   * @apiParam {String} [orderBy] - Column to order by
   * @apiParam {String} [orderDir] - Order direction ("asc", "desc")
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    "works": [
   *      {
   *        _id: "5e1494037f08d7395fd35511",
   *        title: "Release 1",
   *        ...
   *      },
   *      {
   *        _id: "5e1494037f08d7395fd35585",
   *        title: "Release 2",
   *        ...
   *      },
   *      ...
   *    ],
   *    "meta": {
   *      "currentPage": 1,
   *      "totalPages": 1,
   *      "total": 25
   *    }
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   * @apiError NotFound Could not find Contract with ID
   * @apiErrorExample {json} NotFound Response:
   *  HTTP/1.1 404 NotFound
   *  {
   *    message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
   *  }
   */
  .get('/:id/works', (req, res) => {
    const { curveUser, params, query } = req;

    Contract.findById(req.params.id)
      .then(async (contract) => {
        if (!contract) {
          res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'contracts', document: contract, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          const paginationParams = {
            page: Page.valueOrDefault(query.page, 1),
            limit: Page.valueOrDefault(query.limit, 25),
            sort: Page.sortOrDefault(query.orderBy, query.orderDir),
          };
          Work.paginate({ $or: [{ salesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } }, { costsRights: { $elemMatch: { contractId: contract._id.toString() } } }] }, paginationParams, (err, result) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            } else {
              res.status(200).json({ works: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
      });
  })

  /**
   * @api {get} /contracts/:id/costs Get a single Contract's Costs
   * @apiGroup contracts
   *
   * @apiUse TokenParams
   * @apiParam {String} id - Contract ID
   * @apiParam {Number} [page] - Page number to return
   * @apiParam {Number} [limit] - Number of items to return per page
   * @apiParam {String} [orderBy] - Column to order by
   * @apiParam {String} [orderDir] - Order direction ("asc", "desc")
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    associatedReleaseIds: ["5e1494037f08d7395fd35586", "5e1494037f08d7395fd35587", ..],
   *    associatedTrackIds: ["5e1494037f08d7395fd35588", "5e1494037f08d7395fd35589", ..],
   *    "costs": [
   *      {
   *        _id: "5e1494037f08d7395fd35511",
   *        title: "Release 1",
   *        ...
   *      },
   *      {
   *        _id: "5e1494037f08d7395fd35585",
   *        title: "Release 2",
   *        ...
   *      },
   *      ...
   *    ],
   *    "meta": {
   *      "currentPage": 1,
   *      "totalPages": 1,
   *      "total": 25
   *    }
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   * @apiError NotFound Could not find Contract with ID
   * @apiErrorExample {json} NotFound Response:
   *  HTTP/1.1 404 NotFound
   *  {
   *    message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
   *  }
   */
  .get('/:id/costs', (req, res) => {
    const { curveUser, params, query } = req;
    Contract.findById(req.params.id)
      .then(async (contract) => {
        if (!contract) {
          res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Contract, Payee, user: curveUser, operation: 'read', type: 'contracts', document: contract, clientOnly: false })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          let associatedReleaseIds = [];
          let associatedTrackIds = [];
          async.parallel([
            function (cb) {
              contract.getAssociatedCostsReleaseIds((err, releasesIds) => {
                associatedReleaseIds = releasesIds;
                cb();
              });
            },
            function (cb) {
              contract.getAssociatedCostsTrackIds((err, tracksIds) => {
                associatedTrackIds = tracksIds;
                cb();
              });
            },
          ], () => {
            const paginationParams = {
              page: Page.valueOrDefault(query.page, 1),
              limit: Page.valueOrDefault(query.limit, 25),
              sort: Page.sortOrDefault(query.orderBy, query.orderDir),
            };

            Cost.paginate({
              $and: [
                { clientId: contract.clientId },
                { $or: [{ contractIds: contract._id }, { releaseIds: { $in: associatedReleaseIds } }, { trackIds: { $in: associatedTrackIds } }] },
              ],
            }, paginationParams, (err, result) => {
              if (err) {
                res.status(500).json({ message: 'Internal error, please try again' });
              } else {
                res.status(200).json({
                  associatedReleaseIds, associatedTrackIds, costs: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs },
                });
              }
            });
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
      });
  })

  /**
   * @api {get} /contracts/:id/transactions Get single Contract's transactions
   * @apiGroup contracts
   *
   * @apiUse TokenParams
   * @apiParam {String} id - Contract ID
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    transactions: [
   *      {
   *        amount: 10,
   *        _id: "5e39976b8864e10e7c1bb6a1",
   *        balance: 10,
   *        ...
   *      },
   *      {
   *        amount: 20,
   *        _id: "5e39976b8864e10e7c1bb6a2",
   *        balance: 20,
   *        ...
   *      },
   *      ...
   *    ]
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   * @apiError NotFound Could not find Contract with ID
   * @apiErrorExample {json} NotFound Response:
   *  HTTP/1.1 404 NotFound
   *  {
   *    message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
   *  }
   */
  .get('/:id/transactions', (req, res) => {
    const { curveUser, params, query } = req;
    const usePagination = !!query.page;

    Contract.findById(req.params.id)
      .then(async (contract) => {
        if (!contract) {
          res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Contract, Payee, user: curveUser, operation: 'read', type: 'contracts', document: contract, clientOnly: false })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (usePagination) {
          try {
            const result = await ContractController.getPaginatedTransactions({ contract, query });
            res.status(200).json(result);
          } catch (err) {
            logger.error(err);
            res.status(500).json({ message: 'Internal error, please try again' });
          }
        } else {
          contract.getAssociatedTransactions(new Date(), (err) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            } else {
              res.status(200).json({ transactions: contract.transactions });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
      });
  })

  /**
  * @api {get} /contracts/:id/future_transactions Get single Contract's future transactions
  * @apiGroup contracts
  *
  * @apiUse TokenParams
  * @apiParam {String} id - Contract ID
  *
  * @apiSuccess {json} Success Response
  * @apiSuccessExample {json} Success Response:
  *  HTTP/1.1 200 OK
  *  {
  *    transactions: [
  *      {
  *        amount: 10,
  *        _id: "5e39976b8864e10e7c1bb6a1",
  *        balance: 10,
  *        ...
  *      },
  *      {
  *        amount: 20,
  *        _id: "5e39976b8864e10e7c1bb6a2",
  *        balance: 20,
  *        ...
  *      },
  *      ...
  *    ]
  *  }
  *
  * @apiUse ErrorForbidden
  * @apiUse ErrorInternalServerError
  * @apiError NotFound Could not find Contract with ID
  * @apiErrorExample {json} NotFound Response:
  *  HTTP/1.1 404 NotFound
  *  {
  *    message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
  *  }
  */
  .get('/:id/future_transactions', (req, res) => {
    const { curveUser, params } = req;

    Contract.findById(req.params.id)
      .then(async (contract) => {
        if (!contract) {
          res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Contract, Payee, user: curveUser, operation: 'read', type: 'contracts', document: contract, clientOnly: false })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          contract.getFutureTransactions(new Date(), (err) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            } else {
              res.status(200).json({ transactions: contract.transactions });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
      });
  })

  .get('/:id/active_advances', async (req, res) => {
    const { curveUser, params, query } = req;
    try {
      const contract = await Contract.findById(params.id);
      if (!contract) {
        return res.status(404).json({
          message: `Could not find Contract with ID ${params.id}`,
        });
      }

      const validation = await ContractController.activeAdvancesValidateParams({
        contract,
        curveUser,
        dateParam: query.date,
      });

      if (validation.error) {
        const { status, message, response } = validation.error;
        return res.status(status).json(response || { message });
      }

      const activeAdvances = await ContractController.getActiveAdvances(contract, validation.pointInTime);

      return res.status(200).json({
        contractId: contract._id,
        pointInTime: validation.pointInTime.toISOString(),
        ...activeAdvances,
      });
    } catch (error) {
      logger.error(error);
      return res.status(500).json({
        message: `Internal error: ${error.message}, please try again`,
      });
    }
  })

  /**
  * @api {put} /contracts/:id/add_alias Add alias to a Contract
  * @apiGroup contracts
  *
  * @apiUse TokenParams
  * @apiParam {String} id - Contract ID
  * @apiBody {String[]} aliases - Array of aliases
  * @apiBody {String} alias - Single alias
  *
  * @apiSuccess {json} Success Response
  * @apiSuccessExample {json} Success Response:
  *  HTTP/1.1 200 OK
  *  {
  *    message: "Alias added"
  *  }
  *
  * @apiUse ErrorForbidden
  * @apiUse ErrorInternalServerError
  * @apiError NotFound Could not find Contract with ID
  * @apiErrorExample {json} NotFound Response:
  *  HTTP/1.1 404 NotFound
  *  {
  *    message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
  *  }
  */
  .put('/:id/add_alias', (req, res) => {
    const { curveUser, params, body } = req;

    Contract.findById(params.id)
      .then(async (foundContract) => {
        if (!foundContract) {
          res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: foundContract, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          if (body.aliases) { foundContract.aliases = foundContract.aliases.concat(body.aliases); }
          if (body.alias) { foundContract.aliases.push(body.alias); }
          foundContract.save()
            .then(() => {
              res.status(200).json({ message: 'Alias added' });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.message });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
      });
  })

  /**
    * @api {put} /contracts/:id Update single Contract
    * @apiGroup contracts
    *
    * @apiUse TokenParams
    * @apiParam {String} id - Contract ID
    * @apiBody {Object} body - Contract document
    *
    * @apiSuccess {json} Success Response
    * @apiSuccessExample {json} Success Response:
    *  HTTP/1.1 200 OK
    *  {
    *    _id: "5e1494037f08d7395fd35511",
    *    name: "Contract 1",
    *    ...
    *  }
    *
    * @apiUse ErrorForbidden
    * @apiUse ErrorInternalServerError
    * @apiError NotFound Could not find Contract with ID
    * @apiErrorExample {json} NotFound Response:
    *  HTTP/1.1 404 NotFound
    *  {
    *    message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
    *  }
    */
  .put('/:id', (req, res) => {
    const { curveUser, params, body } = req;

    Contract.findById(params.id)
      .then(async (foundContract) => {
        if (!foundContract) {
          res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: foundContract, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          // Prevent changes of client ID
          delete body.clientId;
          // Clean up term numbers
          body.salesTerms = Contract.cleanUpNumbersInArray(body.salesTerms, ['rate', 'unitRate', 'multiplier', 'reductionRate', 'reserve']);
          body.deductionsTerms = Contract.cleanUpNumbersInArray(body.deductionsTerms, ['rate', 'unitRate']);
          body.mechanicalTerms = Contract.cleanUpNumbersInArray(body.mechanicalTerms, ['rate', 'unitRate', 'reserve', 'minStatRate']);
          body.mechanicalContractTerms = Contract.cleanUpNumbersInArray(body.mechanicalContractTerms, ['rate', 'unitRate', 'reserve', 'minStatRate']);
          body.withholdingTaxTerms = Contract.cleanUpNumbersInArray(body.withholdingTaxTerms, ['rate', 'unitRate']);
          body.costsTerms = Contract.cleanUpNumbersInArray(body.costsTerms, ['rate']);
          body.reserves = Contract.cleanUpNumbersInArray(body.reserves, ['rate']);

          // Validate the ids in the cross contracts
          if (body.crossContracts?.length) {
            const isIdCorrect = body?.crossContracts.every(({ contractId }) => ObjectId.isValid(contractId));
            if (!isIdCorrect) {
              return res.status(400).json({ message: 'Invalid ID for cross contracts' });
            }
          }
          // Loop through and add fields
          // eslint-disable-next-line guard-for-in
          for (const i in body) { foundContract[i] = body[i]; }
          // Set last modified value
          foundContract.lastModifiedBy = curveUser.id;
          // Remove payeeId, companyId, currency & accountingPeriod if not present in the data
          if (!body.companyId) { foundContract.companyId = null; }
          if (!body.currency) { foundContract.currency = null; }
          if (!body.accountingPeriod) { foundContract.accountingPeriod = null; }
          // Update Contract Record
          foundContract.save()
            .then(async (contract) => {
              // Format the populated contractIds on cross contracts to keep the original contractId field.
              contract = await Contract.formatPopulatedRights(contract);
              res.status(200).json(contract);
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'An internal error occurred. Please contact support.' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
      });
  })

  /**
   * @api {delete} /contracts Delete single or bulk Contracts
   * @apiGroup contracts
   *
   * @apiUse TokenParams
   * @apiBody {String[]} ids - Contract IDs to delete
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    deletedCount: 1,
   *    n: 1,
   *    ok: 1,
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   * @apiError NotFound Could not find Contract with ID
   * @apiErrorExample {json} NotFound Response:
   *  HTTP/1.1 404 NotFound
   *  {
   *    message: "Could not find Contracts"
   *  }
   * @apiErrorExample {json} ReleaseAttachedToSalesFiles Response:
   *  HTTP/1.1 201 Created
   *  [
   *    {
   *      name: 'Sales File Name',
   *      link: 'sales/61376be268ecbc20f2f97952/edit'
   *    }
   *  ]
   */
  .delete('/', (req, res) => {
    const { curveUser, body } = req;
    if (curveUser?.rights?.[curveUser?.clientId]?.contracts !== 'Edit') { return res.status(403).json({ message: 'Forbidden' }); }

    if (!body?.ids?.length) { return res.status(404).json({ message: 'Could not find Contracts' }); }

    const params = {
      clientId: curveUser.clientId,
      idsToTest: body.ids,
      deletionType: body.type || 'multi',
      salesFilterField: 'contractId',
      costsFilterField: 'contractIds',
      logLabel: 'Contract',
    };

    SalesItemHelpers.checkDataBeforeDelete(Contract, params, (err, status, result) => {
      if (err) {
        return res.status(500).json({
          message: 'Internal error, please try again or contact support',
        });
      }
      if (status === 201) {
        const response = (params.deletionType === 'multi') ? `Some or all of these contracts are attached to ${result} which will need to be deleted first` : result;
        res.status(201).json(response);
      } else {
        res.status(200).json(result);
      }
    });
  })

  /**
    * @api {post} /contracts/ Create new Contract
    * @apiGroup contracts
    *
    * @apiUse TokenParams
    * @apiBody {Object} body - Contract document
    *
    * @apiSuccess {json} Success Response
    * @apiSuccessExample {json} Success Response:
    *  HTTP/1.1 200 OK
    *  {
    *    "_id": "5e1494037f08d7395fd35511",
    *    "name": "New Contract",
    *    ...
    *  }
    *
    * @apiUse ErrorForbidden
    * @apiUse ErrorInternalServerError
    */
  .post('/', parseJson, async (req, res) => {
    const { curveUser, body } = req;
    // Set system set values
    body.clientId = curveUser.clientId;
    body.createdBy = curveUser.id;
    body.lastModifiedBy = curveUser.id;
    // Clean up term numbers
    body.salesTerms = Contract.cleanUpNumbersInArray(body.salesTerms, ['rate', 'unitRate', 'multiplier', 'reductionRate', 'reserve']);
    body.deductionsTerms = Contract.cleanUpNumbersInArray(body.deductionsTerms, ['rate', 'unitRate']);
    body.mechanicalTerms = Contract.cleanUpNumbersInArray(body.mechanicalTerms, ['rate', 'unitRate', 'reserve']);
    body.mechanicalContractTerms = Contract.cleanUpNumbersInArray(body.mechanicalContractTerms, ['rate', 'unitRate', 'reserve']);
    body.withholdingTaxTerms = Contract.cleanUpNumbersInArray(body.withholdingTaxTerms, ['rate', 'unitRate']);
    body.costsTerms = Contract.cleanUpNumbersInArray(body.costsTerms, ['rate']);
    body.reserves = Contract.cleanUpNumbersInArray(body.reserves, ['rate']);
    if (body?.crossContracts?.length > 0) { body.crossContracts = Contract.cleanUpCrossContractValues(body.crossContracts); }
    // Clean up escalation tracker numerical values
    body.escalationTracking = Contract.cleanUpNumbersInDicObj(body.escalationTracking);

    // Validate the ids in the cross contracts
    if (body.crossContracts?.length) {
      const isIdCorrect = body?.crossContracts.every(({ contractId }) => ObjectId.isValid(contractId));
      if (!isIdCorrect) {
        return res.status(400).json({ message: 'Invalid ID for cross contracts' });
      }
    }

    // Create Contract
    const contract = new Contract(body);
    // Save
    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: contract, clientOnly: true })) {
      res.status(403).json({ message: 'Forbidden' });
    } else {
      contract.save()
        .then((contract) => {
          // Return contract
          res.status(200).json(contract);
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: err.message });
        });
    }
  })

  /**
* @api {put} /contracts/:id/upload Get S3 upload credentials for a Contract
* @apiGroup contracts
*
* @apiUse TokenParams
* @apiParam {String} id - Contract ID
* @apiBody {Object} body - file to import
*
* @apiSuccess {json} Success Response
* @apiSuccessExample {json} Success Response:
*  HTTP/1.1 200 OK
*  {
*    path: "path/file_to_upload.xlsx",
*    credentials:
*      {
*       url: "https://curve-royalties-staging.s3-eu-west-1.amazonaws.com/",
*       fields:
*       {
*         key: "contracts/5e1494037f08d7395fd35511/1616584064528/file_to_upload.xlsx",
*         AWSAccessKeyId: "VKfA4ARWVO35GXN451MT",
*         acl: "private",
*         policy: "eyJleHBpcmF0vW9uIjoiMjAyMS0wMy0yNFQxNjowNzo0NC41MzFaIiwiY29uZGl0aW9ucyI6W3siYnVja2V0IjoiY3VydmUtcm95YWx0aWVzLXN0YWdpbmcifSxbInN0YXJ0cy13aXRoIiwiJGtleSIsImNvbnRyYWN0cy81ZTE0OTQwMzdmMDhkNzM5NWZkMzU1ODQvMTYxNjU4NDA2NDUyOC9EYXRhRG9rdG9yIEZhaWxlZCBDaGVja3VwIC0gUmVsZWFzZXMgLSBUaHUgTWFyIDE4IDIwMjEgMTFfNThfNDAgR01UKzAxMDAgKEdNVCswMV8wMCkgLnhsc3giXSx7ImFjbCI6InByaXZhdGUifSx7InN1Y2Nlc3NfYWN0aW9uX3N0YXR1cyI6IjIwMSJ9LFsic3RhcnRzLXdpdGgiLCIkQ29udGVudC1UeXBlIiwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3Vt4W50LnNwcmVhZHNoZWV0bWwuc2hlZXQiXSxbImNvbnRlbnQtbGVuZ3RoLXJhbmdlIiwwLDEwMDAwNDg1NzYwYV19",
*         signature: "/fO0uxrzVuVtkKsACrX4Wv7CP+Q=",
*         Content-Type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
*         success_action_status:201
*        }
*       },
*       completePath: "/contracts/5e1494037f08d7395fd35511/upload_complete",
*       fileName: "file_to_upload.xlsx"
*      }
*  }
*
* @apiUse ErrorForbidden
* @apiUse ErrorInternalServerError
* @apiError NotFound Could not find Contract with ID
* @apiErrorExample {json} NotFound Response:
*  HTTP/1.1 404 NotFound
*  {
*    message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
*  }
* @apiError BadRequest No file uploaded
* @apiErrorExample {json} BadRequest Response:
*  HTTP/1.1 400 BadRequest
*  {
*    errors: ["Requires a file to be uploaded"]
*  }
*/
  .put('/:id/upload', (req, res) => {
    const { curveUser, params, body } = req;

    // Write to S3
    Contract.findById(params.id)
      .then(async (contract) => {
        if (!contract) {
          res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: contract, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (!(validateFileType({ filename: body.filename }) && validateContentType({ contentType: body.type }))) {
          res.status(422).json({ message: 'Invalid file type' });
        } else {
          // Get upload credentials
          fileManager.getUploaderCredentials(`contracts/${contract._id.toString()}/${Date.now()}/`, body, (data) => {
            data.completePath = `/contracts/${contract._id.toString()}/upload_complete`;
            data.fileName = body.filename;
            res.status(200).jsonp(data);
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
      });
  })

  /**
 * @api {post} /contracts/import Import Contracts
 * @apiGroup contracts
 *
 * @apiUse TokenParams
 * @apiBody {Object} body - file to import
 * @apiBody {String} overwriteBlanks - set to "true" to overwrite blank values
 * @apiBody {String} clientType - Client type
 * @apiBody {String} contractType - Contract type
 *
 * @apiSuccess {json} Success Response
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    message: "Contracts are importing, and a report will be sent to you shortly."
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorInternalServerError
 * @apiError BadRequest No file uploaded
 * @apiErrorExample {json} BadRequest Response:
 *  HTTP/1.1 400 BadRequest
 *  {
 *    errors: ["Requires a file to be uploaded"]
 *  }
 */
  .post('/import', upload.single('file'), (req, res) => {
    const { curveUser, query, file } = req;

    if (!file) { return res.status(400).json({ errors: ['Requires a file to be uploaded'] }); }

    const overwriteBlanks = req.query.overwriteBlanks === 'true';

    if (curveUser?.clientId && curveUser?.rights?.[curveUser?.clientId]?.contracts === 'Edit') {
      if (query?.clientType === 'Publisher') {
        ContractsImporter.import({ file, contractTemplateType: 'Publisher', curveUser, overwriteBlanks });
      } else if (query?.contractType === 'Mechanical') {
        ContractsImporter.import({ file, contractTemplateType: 'Mechanical', curveUser, overwriteBlanks });
      } else {
        ContractsImporter.import({ file, contractTemplateType: 'Standard', curveUser, overwriteBlanks });
      }
      res.status(200).json({ message: 'Contracts are importing, and a report will be sent to you shortly.' });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  /**
  * @api {post} /contracts/:id/upload_complete Save files against Contract on upload
  * @apiGroup contracts
  *
  * @apiUse TokenParams
  * @apiParam {String} id - Contract ID
  * @apiBody {Object} key - S3 key
  *
  * @apiSuccess {json} Success Response
  * @apiSuccessExample {json} Success Response:
  *  HTTP/1.1 200 OK
  *  {
  *   type: "Complete",
  *   message: "The file is successfully uploaded",
  *   files:
  *   [
  *     {
  *       key: "file1.xlsx",
  *       publicLink: "file 1 public link"
  *     },
  *     ...
  *   ]
  * }
  *
  * @apiUse ErrorForbidden
  * @apiUse ErrorInternalServerError
  * @apiError NotFound Could not find Contract with ID
  * @apiErrorExample {json} NotFound Response:
  *  HTTP/1.1 404 NotFound
  *  {
  *    message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
  *  }
  * @apiError BadRequest No file uploaded
  * @apiErrorExample {json} BadRequest Response:
  *  HTTP/1.1 400 BadRequest
  *  {
  *    errors: ["Requires a file to be uploaded"]
  *  }
  */
  .put('/:id/upload_complete', (req, res) => {
    const { curveUser, params, body } = req;

    // Write to S3
    Contract.findById(params.id)
      .then(async (contract) => {
        if (!contract) {
          res.status(500).json({ message: `Could not find Contract with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: contract, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          contract.files.push({ key: body.key });
          contract.save()
            .then(() => {
              Contract.findById(params.id)
                .then((contract) => {
                  res.status(200).json({
                    type: 'Complete', message: 'The file is successfully uploaded', files: contract.files, version: contract.__v,
                  });
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json({ message: 'Internal error, please try again' });
                });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.message || 'Error while saving file to contract, please try again' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: `Could not find Contract with ID ${params.id}` });
      });
  })

  /**
  * @api {delete} /contracts/:id/file/:key Delete a file from a Contract
  * @apiGroup contracts
  *
  * @apiUse TokenParams
  * @apiParam {String} id - Contract ID
  * @apiParam {Object} key - S3 key
  *
  * @apiSuccess {json} Success Response
  * @apiSuccessExample {json} Success Response:
  *  HTTP/1.1 200 OK
  *  {
  *   type: "Complete",
  *   message: "The file is successfully deleted",
  *   files:
  *   [
  *     {
  *       key: "file1.xlsx",
  *       publicLink: "file 1 public link"
  *     },
  *     ...
  *   ]
  * }
  *
  * @apiUse ErrorForbidden
  * @apiUse ErrorInternalServerError
  * @apiError NotFound Could not find Contract with ID
  * @apiErrorExample {json} NotFound Response:
  *  HTTP/1.1 404 NotFound
  *  {
  *    message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
  *  }
  */
  .delete('/:id/file/:key', (req, res) => {
    const { params, curveUser } = req;

    Contract.findById(params.id)
      .then(async (contract) => {
        if (!contract) {
          res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: contract, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          let { files } = contract;
          files = files.filter((file) => {
            if (file.key.replace(/\//g, '-') !== params.key) {
              return file;
            }
            fileManager.deleteFromS3(file.key, (errDelete) => {
              if (errDelete) {
                logger.error(`Error while deleting S3 file with key ${file.key}`, errDelete);
              } else {
                logger.info(`S3 file deleted with key ${file.key}`);
              }
            });
          });
          contract.files = files;
          contract.save()
            .then((contract) => {
              res.status(200).json({ type: 'Complete', message: 'The file is successfully deleted', files: contract.files });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.message || 'Error while saving file to contract, please try again' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find Contract with ID ${params.id}` });
      });
  });

async function paramsToFilterField(inputParams, user) {
  const params = {};
  if (user.clientId) { params.clientId = user.clientId; }
  // if (inputParams.payeeId) { params.payeeId = inputParams.payeeId; }
  // if contract type of "All" is supplied, don't add a contractType param to match all types
  if (!(inputParams.contractType === 'All' || inputParams.contractType === 'all')) {
    if (inputParams.contractType === 'Mechanical' || inputParams.contractType === 'mechanical') {
      params.contractType = 'Mechanical';
    } else {
      params.contractType = { $ne: 'Mechanical' };
    }
  }
  if (inputParams.valid === 'true' || inputParams.valid) { params.valid = true; }
  if (inputParams.valid === 'false' || inputParams.valid === false) { params.valid = false; }
  if (inputParams.contractCategories && inputParams.contractCategories.length > 0) { params.contractCategories = { $in: inputParams.contractCategories }; }
  if (inputParams.expiresAfter || inputParams.expiresBefore) { params.endDate = {}; }
  if (inputParams.expiresAfter) { params.endDate.$gte = new Date(inputParams.expiresAfter); }
  if (inputParams.expiresBefore) { params.endDate.$lte = new Date(inputParams.expiresBefore); }
  if (inputParams.companyIds && inputParams.companyIds.length > 0) { params.companyId = { $in: inputParams.companyIds }; }
  if (inputParams.accountingPeriod) { params.accountingPeriod = inputParams.accountingPeriod; }
  if (inputParams.ids) {
    inputParams.ids = inputParams.ids.map((id) => new ObjectId(id));
    params._id = { $in: inputParams.ids };
  }
  if (inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
    params.$or = [
      { name: { $regex: regex } },
      { labels: { $regex: regex } },
      { foreignId: { $regex: regex } },
      { projectId: { $regex: regex } },
      { aliases: { $regex: regex } },
    ];

    if (inputParams.text.length === 24 && ObjectId.isValid(inputParams.text)) {
      params.$or.push({ _id: inputParams.text });
    }
  }

  if (!params.clientId && user.payeeId) {
    const payee = await Payee.findById(user.payeeId, 'clientId').catch(logger.error);
    if (payee && payee.clientId) { params.clientId = payee.clientId; }
  }

  if (inputParams.payeeId) { params['payees.payeeId'] = inputParams.payeeId; }

  if (inputParams.status) {
    Object.assign(params, getMongoStatusFilter(inputParams.status));
  }

  return applyDateFilters(inputParams, params);
}

module.exports = router;
