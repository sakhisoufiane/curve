const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, Utils, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('mongodb');
const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const appRootDir = require('app-root-dir').get();
const async = require('async');
const multer = require('multer');
const historyModelUser = require('../../libs/historyModelUser');
const SalesItemHelpers = require('../../libs/salesItemHelpers');
const Release = require('../../models/release');
const Payee = require('../../models/payee');
const Contract = require('../../models/contract');
const UnmappedRelease = require('../../models/unmappedRelease');
const ReleaseController = require('../../controllers/release');
const { updateCatalogueIdentifiers } = require('../../processes/updateCatalogueIdentifiers/updateCatalogueIdentifiers');
const { CSVRawExport } = require('../../libs/mongodb-export');

const router = express.Router();
const parseUrlencoded = bodyParser.urlencoded({ extended: true, limit: '50mb', parameterLimit: 100000 });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, `${appRootDir}/tmp/`);
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

const INTERNAL_ERROR = { message: 'Internal error, please try again' };
const FORBIDDEN = { message: 'Forbidden' };

router
/**
   * @api {get} /releases/ Get all Releases
   * @apiGroup releases
   *
   * @apiUse TokenParams
   * @apiParam {String} [text] - Filter on supplied text string
   * @apiParam {String[]} [ids] - Filter by Release IDs
   * @apiParam {String[]} [catalogueGroups] - Filter by catalogue groups
   * @apiParam {String[]} [contractIds] - Filter by Contract IDs
   * @apiParam {Date} [createdAfter] - Filter by Release creation date
   * @apiParam {Date} [createdBefore] - Filter by Release creation date
   * @apiParam {Number} [page] - Page number to return
   * @apiParam {Number} [limit] - Number of items to return per page
   * @apiParam {String} [orderBy] - Column to order by
   * @apiParam {String} [orderDir] - Order direction ("asc", "desc")
   *
   * @apiSuccess {Object[]} releases - Array of Releases
   * @apiSuccess {Object} meta - Meta data
   * @apiSuccess {Number} meta.currentPage - Number of page returned
   * @apiSuccess {Number} meta.totalPages - Total number of pages
   * @apiSuccess {Number} meta.total - Total number of Releases
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    "releases": [
   *      {
   *        _id: "5e1494037f08d7395fd31111",
   *        title: "Release 1",
   *        ...
   *      },
   *      {
   *        _id: "5e1494037f08d7395fd31112",
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
   */
  .get('/', async (req, res) => {
    const { curveUser, query } = req;
    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue', allowPayee: true })) {
      // In the front-end the default sort value is title
      const orderBy = query.orderBy || 'title';

      if (query?.text) {
        // Create contractIds from companyIds and add to contractIds
        query.contractIds = await Utils.combineContractAndCompanyIds({ Contract, inputParams: query, clientId: curveUser.clientId });
        // Run using Atlas Search
        logger.debug('Running release query using Atlas Search');
        try {
          const searchParams = {
            searchIndex: 'releaseSearch',
            page: Page.valueOrDefault(query.page, 1),
            limit: Page.valueOrDefault(query.limit, 25),
            sortBy: orderBy,
            sortOrder: query.orderDir,
            project: {
              _id: 1,
              title: 1,
              artist: 1,
              catNo: 1,
              barcode: 1,
              releaseDate: 1,
              distributionChannel: 1,
              format: 1,
              foreignId: 1,
              createdAt: 1,
              totalParticipation: 1,
              valid: 1,
              validationErrors: 1,
              projectId: 1,
              updatedAt: 1,
            },
            filterItems: [
              { name: 'catalogueGroups', field: 'catalogueGroups', type: 'text' },
              { name: 'contractIds', field: 'salesReturnsRights.contractId', type: 'text' },
              { name: 'createdAfter', field: 'createdAt', type: 'after' },
              { name: 'createdBefore', field: 'createdAt', type: 'before' },
              { name: 'participation', field: 'totalParticipation', type: 'equalLessGreaterThan' },
              { name: 'ids', field: '_id', type: 'objectIds' },
              { name: 'valid', field: 'valid', type: 'boolean' },
              { name: 'label', field: 'label', type: 'wildcard' },
              { name: 'artist', field: 'artist', type: 'wildcard' },
              { name: 'distributionChannels', field: 'distributionChannel', type: 'text' },
              { name: 'formats', field: 'format', type: 'text' },
              { name: 'mechanicalContractIds', field: 'mechanicalContractIds', type: 'text' },
            ],
            payeeFilterFields: ['salesReturnsRights.contractId'],
            textSearchFields: ['title', 'version', 'artist', 'catNo', 'barcode', 'label', 'aliases', 'foreignId', 'projectId'],
          };
          const result = await Utils.atlasSearch({ Payee, Model: Release, query, user: curveUser, params: searchParams });
          res.status(200).json({ releases: result.docs, meta: { currentPage: searchParams.page, totalPages: result.totalPages, total: result.total } });
        } catch (err) {
          logger.error(err);
          res.status(500).json(INTERNAL_ERROR);
        }
      } else {
        // Run using usual filters
        logger.debug('Running release query using usual filters');
        const paginationParams = {
          page: Page.valueOrDefault(query.page, 1),
          limit: Page.valueOrDefault(query.limit, 25),
          sort: Page.sortOrDefault(orderBy, query.orderDir),
          select: '_id title artist catNo barcode releaseDate distributionChannel format createdAt totalParticipation valid label foreignId projectId updatedAt',
          allowDiskUse: true,
        };
        Release.paginate(await paramsToFilterField(query, curveUser), paginationParams, (err, result) => {
          if (err) {
            logger.error(err);
            res.status(500).json(INTERNAL_ERROR);
          } else {
            res.status(200).json({ releases: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
          }
        });
      }
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

  /**
   * @api {post} /releases/export Export Releases
   * @apiGroup releases
   *
   * @apiUse TokenParams
   * @apiBody {String[]} ids - Release IDs to export
   * @apiBody {Object} filter - Filter the Releases to export
   * @apiBody {String} [filter.text] - Filter based on the supplied text string
   * @apiBody {String[]} [filter.ids] - Filter by Release IDs
   * @apiBody {String[]} [filter.catalogueGroups] - Filter by catalogue groups
   * @apiBody {String[]} [filter.contractIds] - Filter by Contract IDs
   * @apiBody {Date} [filter.createdAfter] - Filter by Release creation date
   * @apiBody {Date} [filter.createdBefore] - Filter by Release creation date
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
    const exportTemplateVersion = req.query.exportTemplateVersion ? req.query.exportTemplateVersion : 'v1';
    if (curveUser.clientId && !curveUser.payeeId && ['Edit', 'View'].includes(curveUser.rights?.[curveUser.clientId]?.catalogue)) {
      if (body.ids?.length) {
        Release.sendExport({ clientId: curveUser.clientId, _id: { $in: body.ids } }, curveUser, exportTemplateVersion);
      } else {
        Release.sendExport(await paramsToFilterField(body.filter, curveUser), curveUser, exportTemplateVersion);
      }
      res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

  /**
   * @api {post} /releases/raw-export Raw CSV Export of Releases
   * @apiGroup releases
   *
   * @apiUse TokenParams
   * @apiBody {String[]} ids - Release IDs to export
   * @apiBody {Object} filter - Filter the Releases to export
   * @apiBody {String} [filter.text] - Filter based on the supplied text string
   * @apiBody {String[]} [filter.ids] - Filter by Release IDs
   * @apiBody {String[]} [filter.catalogueGroups] - Filter by catalogue groups
   * @apiBody {String[]} [filter.contractIds] - Filter by Contract IDs
   * @apiBody {Date} [filter.createdAfter] - Filter by Release creation date
   * @apiBody {Date} [filter.createdBefore] - Filter by Release creation date
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
  .post('/raw-export', async (req, res) => {
    const { curveUser, body } = req;
    const sync = body.sync === true;

    if (curveUser.clientId && !curveUser.payeeId && ['Edit', 'View'].includes(curveUser.rights?.[curveUser.clientId]?.catalogue)) {
      const filter = body.ids?.length
        ? { clientId: curveUser.clientId, _id: { $in: body.ids } }
        : await paramsToFilterField(body.filter || {}, curveUser);

      if (sync) {
        try {
          const result = await CSVRawExport({ curveUser, collectionName: 'releases', filter, sync: true });
          return res.status(200).json(result);
        } catch (error) {
          logger.error(error);
          return res.status(500).json({ message: 'Export failed', error: error.message });
        }
      } else {
        CSVRawExport({ curveUser, collectionName: 'releases', filter }).catch((err) => {
          logger.error('Async raw-export failed:', err);
        });
        return res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
      }
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

  /**
   * @api {get} /releases/:id/history Get Releases's edit history
   * @apiGroup releases
   *
   * @apiUse TokenParams
   * @apiParam {String} id - Release ID
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
   * @apiError NotFound Could not find Payee with ID
   * @apiErrorExample {json} NotFound Response:
   *  HTTP/1.1 404 NotFound
   *  {
   *    message: "Could not find Release with ID 5e1494037f08d7395fd31111"
   *  }
   */
  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;

    Release.findById(params.id)
      .then(async (release) => {
        if (!release) {
          res.status(404).json({ message: `Could not find Release with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: release, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else {
          release.patches.find({ ref: release._id })
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

/**
   * @api {get} /releases/:id Get single Release
   * @apiGroup releases
   *
   * @apiUse TokenParams
   * @apiParam {String} id - Release ID
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    _id: "5e1494037f08d7395fd35511",
   *    title: 'Release 1',
   *    ...
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   * @apiError NotFound Could not find Release with ID
   * @apiErrorExample {json} NotFound Response:
   *  HTTP/1.1 404 NotFound
   *  {
   *    message: "Could not find Release with ID 5e1494037f08d7395fd31111"
   *  }
   */
  .get('/:id', (req, res) => {
    const { curveUser, params } = req;
    Release.findById(params.id)
      .then(async (release) => {
        if (!release) {
          res.status(404).json({ message: `Could not find Release with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: release, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else {
          // Populate Composers, Publishers and Contracts on mechanical licenses.
          release.populateMechanicalLicenses(async () => {
            // Format the populated contractIds on sales/costs rights to keep the original contractId field.
            release = await Release.formatPopulatedRights(release);
            res.status(200).json(release);
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

  /**
   * @api {get} /releases/:id/tracks Get a Release's Tracks
   * @apiGroup releases
   *
   * @apiUse TokenParams
   * @apiParam {String} id - Release ID
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    tracks: [
   *      {
   *        _id: "5e1494037f08d7395fd35511",
   *        title: "Track 1",
   *      },
   *      {
   *        _id: "5e1494037f08d7395fd35512",
   *        title: "Track 2",
   *      },
   *      ...
   *    ]
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   * @apiError NotFound Could not find Release with ID
   * @apiErrorExample {json} NotFound Response:
   *  HTTP/1.1 404 NotFound
   *  {
   *    message: "Could not find Release with ID 5e1494037f08d7395fd31111"
   *  }
   */
  .get('/:id/tracks', (req, res) => {
    const { curveUser, params } = req;

    Release.findById(params.id)
      .populate('createdBy', 'email')
      .populate('lastModifiedBy', 'email')
      .then(async (release) => {
        if (!release) {
          res.status(404).json({ message: `Could not find Release with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: release, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else {
          release.getTracks((err, tracks) => {
            if (err) {
              logger.error(err);
              res.status(500).json(INTERNAL_ERROR);
            } else {
              res.status(200).json({ tracks });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

  /**
   * @api {get} /releases/:id/pro_rata_track_contracts Pro Rata sales and costs from the Tracks linked to the Release.
   * @apiGroup releases
   *
   * @apiUse TokenParams
   * @apiParam {String} id - Release ID
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    contracts: {
   *      salesReturnsRights: [
   *        { contractId: "5e1494037f08d7395fd31111", percentage: 10 },
   *        { contractId: "5e1494037f08d7395fd31112", percentage: 20 },
   *        ...
   *      ],
   *      costsRights: [
   *        { contractId: "5e1494037f08d7395fd31113", percentage: 30 },
   *        { contractId: "5e1494037f08d7395fd31114", percentage: 40 },
   *        ...
   *      ]
   *    }
  *   }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   * @apiError NotFound Could not find Release with ID
   * @apiErrorExample {json} NotFound Response:
   *  HTTP/1.1 404 NotFound
   *  {
   *    message: "Could not find Release with ID 5e1494037f08d7395fd31111"
   *  }
   */
  .get('/:id/pro_rata_track_contracts', (req, res) => {
    const { curveUser, params } = req;
    Release.findById(params.id)
      .then(async (release) => {
        if (!release) {
          res.status(404).json({ message: `Could not find Release with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: release, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else {
          // contracts object to be returned to client
          const contracts = {};
          // call proRataTrackContracts
          release.proRataTrackContracts((err, output) => {
            if (err) {
              logger.error(err);
              res.status(500).json(INTERNAL_ERROR);
            } else {
              // assign output to salesReturnsRights
              contracts.salesReturnsRights = output;
              // call proRataTrackCostContracts
              release.proRataTrackCostContracts((err, costOutput) => {
                // handle errors
                if (err) {
                  logger.error(err);
                  res.status(500).json(INTERNAL_ERROR);
                } else {
                  // assign output to costsRights
                  contracts.costsRights = costOutput;
                  // return contracts to client
                  res.status(200).json({ contracts });
                }
              });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

  /**
   * @api {get} /releases/:id/inherit_track_mechanicals Inherit mechanicals from linked Tracks
   * @apiGroup releases
   *
   * @apiUse TokenParams
   * @apiParam {String} id - Release ID
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *     release: {
   *        _id: "5e1494037f08d7395fd35511",
   *        title: 'Release 1',
   *        ...
   *     }
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   * @apiError NotFound Could not find Release with ID
   * @apiErrorExample {json} NotFound Response:
   *  HTTP/1.1 404 NotFound
   *  {
   *    message: "Could not find Release with ID 5e1494037f08d7395fd31111"
   *  }
   */
  .get('/:id/inherit_track_mechanicals', (req, res) => {
    const { curveUser, params } = req;
    Release.findById(params.id)
      .then(async (release) => {
        if (!release) {
          res.status(404).json({ message: `Could not find Release with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: release, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else {
          release.inheritTrackMechanicals((err, mechanicalLicenses) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: err.message });
            } else {
              res.status(200).json({ release });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

  /**
   * @api {post} /releases/pro_rata_contracts_from_tracks Pro Rata sales and costs from the Tracks for multiple Releases
   * @apiGroup releases
   *
   * @apiUse TokenParams
   * @apiBody {Object} filter - Filter the Releases
   * @apiBody {String} [filter.text] - Filter on supplied text string
   * @apiBody {String[]} [filter.ids] - Filter by Release IDs
   * @apiBody {String[]} [filter.catalogueGroups] - Filter by catalogue groups
   * @apiBody {String[]} [filter.contractIds] - Filter by Contract IDs
   * @apiBody {Date} [filter.createdAfter] - Filter by Release creation date
   * @apiBody {Date} [filter.createdBefore] - Filter by Release creation date
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *     message: "Pro Rata Contracts started. You will be notificed shortly once it has completed."
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   */
  .post('/pro_rata_contracts_from_tracks', async (req, res) => {
    const { curveUser, body } = req;
    if (curveUser.clientId && !curveUser.payeeId && curveUser.rights?.[curveUser.clientId]?.catalogue === 'Edit') {
      if (body.ids?.length) {
        // Process selected
        Release.proRataContractsFromTracks({ clientId: curveUser.clientId, _id: { $in: body.ids } }, curveUser, () => {});
      } else {
        // Process filtered or all
        Release.proRataContractsFromTracks(await paramsToFilterField(body.filter, curveUser), curveUser, () => {});
      }
      res.status(200).json({ message: 'Pro Rata Contracts started. You will be notificed shortly once it has completed.' });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

  /**
   * @api {post} /releases/inherit_mechanicals_from_tracks Inherit mechanicals from Tracks for multiple Releases
   * @apiGroup releases
   *
   * @apiUse TokenParams
   * @apiBody {Object} filter - Filter the Releases
   * @apiBody {String} [filter.text] - Filter on supplied text string
   * @apiBody {String[]} [filter.ids] - Filter by Release IDs
   * @apiBody {String[]} [filter.catalogueGroups] - Filter by catalogue groups
   * @apiBody {String[]} [filter.contractIds] - Filter by Contract IDs
   * @apiBody {Date} [filter.createdAfter] - Filter by Release creation date
   * @apiBody {Date} [filter.createdBefore] - Filter by Release creation date
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *     message: "Inherit Mechanicals started. You will be notificed shortly once it has completed."
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   */
  .post('/inherit_mechanicals_from_tracks', async (req, res) => {
    const { curveUser, body } = req;
    if (curveUser.clientId && !curveUser.payeeId && curveUser.rights?.[curveUser.clientId]?.catalogue === 'Edit') {
      if (body.ids?.length) {
        // Process selected
        Release.inheritMechanicalsFromTracks({ clientId: curveUser.clientId, _id: { $in: body.ids } }, curveUser, () => {});
      } else {
        // Process filtered or all
        Release.inheritMechanicalsFromTracks(await paramsToFilterField(body.filter, curveUser), curveUser, () => {});
      }
      res.status(200).json({ message: 'Inherit Mechanicals started. You will be notificed shortly once it has completed.' });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

  /**
   * @api {put} /releases/:id/add_alias Add aliases to a Release
   * @apiGroup releases
   *
   * @apiUse TokenParams
   * @apiParam {String} id - Release ID
   * @apiBody {String[]} aliases - Aliases to add to the Release
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *     message: "Alias added"
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   * @apiError NotFound Could not find Release with ID
   * @apiErrorExample {json} NotFound Response:
   *  HTTP/1.1 404 NotFound
   *  {
   *    message: "Could not find Release with ID 5e1494037f08d7395fd31111"
   *  }
   */
  .put('/:id/add_alias', (req, res) => {
    const { curveUser, params, body } = req;
    Release.findById(params.id)
      .then(async (release) => {
        if (!release) {
          res.status(404).json({ message: `Could not find Release with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: release, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else {
          if (body.aliases) { release.aliases = release.aliases.concat(body.aliases); }
          if (body.alias) { release.aliases.push(body.alias); }
          release.lastModifiedBy = curveUser.id;
          release.save()
            .then(() => {
              res.status(200).json({ message: 'Alias added' });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.message || 'Internal error, please try again' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

/**
  * @api {put} /releases/:id Update single Release
  * @apiGroup releases
  *
  * @apiUse TokenParams
  * @apiParam {String} id - Release ID
  * @apiBody {Object} body - Release document
  *
  * @apiSuccess {json} Success Response
  * @apiSuccessExample {json} Success Response:
  *  HTTP/1.1 200 OK
  *  {
  *    _id: "5e1494037f08d7395fd35511",
  *    title: "Release 1",
  *    ...
  *  }
  *
  * @apiUse ErrorForbidden
  * @apiUse ErrorInternalServerError
  * @apiError NotFound Could not find Release with ID
  * @apiErrorExample {json} NotFound Response:
  *  HTTP/1.1 404 NotFound
  *  {
  *    message: "Could not find Release with ID 5e1494037f08d7395fd31111"
  *  }
  */
  .put('/:id', (req, res) => {
    const { curveUser, params, body } = req;
    Release.findById(params.id)
      .then(async (foundRelease) => {
        if (!foundRelease) {
          res.status(404).json({ message: `Could not find Release with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundRelease, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else {
          delete body.clientId;
          // eslint-disable-next-line guard-for-in
          for (const i in body) { foundRelease[i] = body[i]; }
          // Remove distributionChannel, format & priceCategory if not present in the data
          if (!body.distributionChannel) { foundRelease.distributionChannel = null; }
          if (!body.format) { foundRelease.format = null; }
          if (!body.priceCategory) { foundRelease.priceCategory = null; }
          foundRelease.lastModifiedBy = curveUser.id;
          // Update Release Record
          foundRelease.save()
            .then((release) => {
              // Populate Composers, Publishers and Contracts on mechanical licenses.
              release.populateMechanicalLicenses(async () => {
                // Format the populated contractIds on sales/costs rights to keep the original contractId field.
                release = await Release.formatPopulatedRights(release);
                res.status(200).json(release);
              });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.message || 'Internal error, please try again' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

/**
 * @api {delete} /releases Delete single or bulk Releases
 * @apiGroup releases
 *
 * @apiUse TokenParams
 * @apiBody {String[]} ids - Release IDs to delete
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
 * @apiError NotFound Could not find Release with ID
 * @apiErrorExample {json} NotFound Response:
 *  HTTP/1.1 404 NotFound
 *  {
 *    message: "Could not find Releases"
 *  }
 * @apiError ReleaseAttachedToSalesFiles
 * @apiErrorExample {json} ReleaseAttachedToSalesFiles Response:
 *  HTTP/1.1 201 Created
 *  {
 *    message: "Some or all of these releases are attached to Sales Files which will need to be deleted first"
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
    if (curveUser.clientId && curveUser?.rights?.[curveUser?.clientId]?.catalogue === 'Edit') {
      if (body.ids?.length) {
        const params = {
          clientId: curveUser.clientId,
          idsToTest: body.ids,
          deletionType: body.type || 'multi',
          salesFilterField: 'releaseId',
          costsFilterField: 'releaseIds',
          logLabel: 'Release',
        };
        SalesItemHelpers.checkDataBeforeDelete(Release, params, (err, status, result) => {
          if (err) {
            return res.status(500).json({
              message: 'Internal error, please try again or contact support',
            });
          }
          if (status === 201) {
            const response = (params.deletionType === 'multi') ? `Some or all of these releases are attached to ${result} which will need to be deleted first` : result;
            res.status(201).json(response);
          } else {
            res.status(200).json(result);
          }
        });
      } else {
        res.status(404).json({ message: 'Could not find Releases' });
      }
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

/**
  * @api {post} /releases/ Create new Release
  * @apiGroup releases
  *
  * @apiUse TokenParams
  * @apiBody {Object} body - Release document
  *
  * @apiSuccess {json} Success Response
  * @apiSuccessExample {json} Success Response:
  *  HTTP/1.1 200 OK
  *  {
  *    "_id": "5e1494037f08d7395fd35511",
  *    "name": "New Release",
  *    ...
  *  }
  *
  * @apiUse ErrorForbidden
  * @apiUse ErrorInternalServerError
  */
  .post('/', parseUrlencoded, async (req, res) => {
    const { curveUser, body } = req;

    body.clientId = curveUser.clientId;
    body.createdBy = curveUser.id;
    body.lastModifiedBy = curveUser.id;
    const release = new Release(body);

    if (!await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: release, clientOnly: true })) {
      release.save()
        .then(async (release) => {
          if (body.unmappedReleaseId) {
            const unmappedRelease = await UnmappedRelease.findById(body.unmappedReleaseId).catch(logger.error);

            if (unmappedRelease) {
              unmappedRelease.releaseId = release._id.toString();
              unmappedRelease.complete = true;
              await unmappedRelease.save().catch(logger.error);
            }
          }
          res.status(200).json(release);
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: err.message || 'Internal error, please try again' });
        });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

  /**
  * @api {post} /releases/create_many Create multiple Releases
  * @apiGroup releases
  *
  * @apiUse TokenParams
  * @apiBody {object[]} releases - Releases to create
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
    const { curveUser, body } = req;
    const { clientId } = curveUser;
    const createdBy = curveUser.id;
    const lastModifiedBy = curveUser.id;
    const { releases } = body;
    if (Array.isArray(releases)) {
      const created = [];
      const failed = [];
      // Loop through releases in series to ensure they are created and validated one by one
      async.eachSeries(releases, async (release, cb) => {
        const newRelease = new Release({
          title: release.title,
          artist: release.artist,
          catNo: release.catNo,
          barcode: release.barcode,
          clientId,
          createdBy,
          lastModifiedBy,
        });
        if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: release, clientOnly: true })) {
          // save the newly created release
          newRelease.save()
            .then(async () => {
              if (release.unmappedReleaseId) {
                const unmappedRelease = await UnmappedRelease.findById(release.unmappedReleaseId).catch(logger.error);

                if (unmappedRelease) {
                  unmappedRelease.releaseId = newRelease._id.toString();
                  unmappedRelease.complete = true;
                  await unmappedRelease.save().catch(logger.error);
                }
              }
              // if saving is successful, add the index to the created array
              created.push(release.index);
              cb();
            })
            .catch((err) => {
              failed.push(release.index);
              cb();
            });
        } else {
          cb();
        }
      }, (eachErr) => {
        if (eachErr) {
          return res.status(500).json({
            message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.',
          });
        }
        // return a list of both created and failed release indexes
        const response = {
          created,
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

/**
 * @api {post} /releases/import Import Releases
 * @apiGroup releases
 *
 * @apiUse TokenParams
 * @apiBody {Object} body - file to import
 * @apiBody {String} overwriteBlanks - set to "true" to overwrite blank values
 *
 * @apiSuccess {json} Success Response
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    message: "Releases are importing, and a report will be sent to you shortly."
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
    const overwriteBlanks = query.overwriteBlanks === 'true';
    const importTemplateVersion = query.importTemplateVersion ? query.importTemplateVersion : 'v1';

    if (!file) { return res.status(400).json({ errors: ['Requires a file to be uploaded'] }); }

    if (curveUser.clientId && !curveUser.payeeId && file && curveUser.rights?.[curveUser.clientId]?.catalogue === 'Edit') {
      if (importTemplateVersion !== 'v2') {
        // Combined Template
        Release.importFromExcel(file, curveUser, overwriteBlanks);
      } else {
        // Separated Template
        Release.importFromExcelNew(file, curveUser, overwriteBlanks, importTemplateVersion);
      }
      res.status(200).json({ message: 'Releases are importing, and a report will be sent to you shortly.' });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })
  .post('/updateCatNo', upload.single('file'), async (req, res) => {
    const { curveUser, file } = req;
    if (!file) { return res.status(400).json({ errors: ['Requires a file to be uploaded'] }); }
    if (curveUser.internal) {
      updateCatalogueIdentifiers({ clientId: curveUser.clientId, file, catalogueName: 'Releases', curveUser });
      res.status(200).json({ message: "We're updating the ISRC, a report will be sent to you shortly." });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

/**
 * @api {post} /releases/add_bulk_aliases Add aliases to multiple Release based on a filter
 * @apiGroup releases
 *
 * @apiUse TokenParams
 * @apiBody {String[]} aliases - Releases aliases
 *
 * @apiSuccess {json} Success Response
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *     message: "Completed Adding Aliases to Releases"
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorInternalServerError
 * @apiError NotFound Could not find Release with ID
 * @apiErrorExample {json} NotFound Response:
 *  HTTP/1.1 404 NotFound
 *  {
 *    message: "Could not find Release with ID 5e1494037f08d7395fd31111"
 *  }
 * @apiError BadRequest No aliases passed
 * @apiErrorExample {json} BadRequest Response:
 *  HTTP/1.1 400 BadRequest
 *  {
 *    message: "Aliases are required to be passed"
 *  }
 */
  .post('/add_bulk_aliases', parseUrlencoded, (req, res) => {
    ReleaseController.addBulkAliases(req).then((data) => {
      res.status(data.status).json(data.response);
    }).catch((error) => {
      logger.error(error);
      res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
    });
  });

async function paramsToFilterField(inputParams, user) {
  let params = {};
  if (user.payeeId && user.contractIds && user.contractIds.length > 0) {
    params['salesReturnsRights.contractId'] = { $in: user.contractIds };
  } else if (user.payeeId) {
    params['salesReturnsRights.contractId'] = { $in: [] };
  } else if (user.clientId) {
    params = { clientId: user.clientId };
  } else {
    return null;
  }
  if (inputParams.ids) {
    inputParams.ids = inputParams.ids.map((id) => new ObjectId(id));
    params._id = { $in: inputParams.ids };
  }
  // Regex
  if (inputParams && inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
    params.$or = [
      { title: { $regex: regex } },
      { version: { $regex: regex } },
      { artist: { $regex: regex } },
      { catNo: { $regex: regex } },
      { barcode: { $regex: regex } },
      { label: { $regex: regex } },
      { aliases: { $regex: regex } },
      { foreignId: { $regex: regex } },
      { projectId: { $regex: regex } },
    ];
    if (inputParams.text.length === 24 && ObjectId.isValid(inputParams.text)) {
      params.$or.push({ _id: inputParams.text });
    }
  }
  // Create contractIds from companyIds and add to contractIds
  inputParams.contractIds = await Utils.combineContractAndCompanyIds({ Contract, inputParams, clientId: user.clientId });
  if (inputParams.catalogueGroups && inputParams.catalogueGroups.length > 0) { params.catalogueGroups = { $in: inputParams.catalogueGroups }; }
  if (inputParams.contractIds) { params['salesReturnsRights.contractId'] = { $in: inputParams.contractIds }; }
  if (inputParams.createdAfter || inputParams.createdBefore) { params.createdAt = {}; }
  if (inputParams.createdAfter) { params.createdAt.$gte = new Date(inputParams.createdAfter); }
  if (inputParams.createdBefore) { params.createdAt.$lte = new Date(inputParams.createdBefore); }
  if (inputParams.mechanicalContractIds?.length > 0) { params.mechanicalContractIds = { $in: inputParams.mechanicalContractIds }; }
  if (inputParams.valid === 'true' || inputParams.valid) { params.valid = true; }
  if (inputParams.valid === 'false' || inputParams.valid === false) { params.valid = false; }
  if (inputParams.label) {
    const regex = new RegExp(_.escapeRegExp(inputParams.label), 'i');
    params.label = { $regex: regex };
  }
  if (inputParams.artist) {
    const regex = new RegExp(_.escapeRegExp(inputParams.artist), 'i');
    params.artist = { $regex: regex };
  }
  if (inputParams.distributionChannels && inputParams.distributionChannels.length > 0) { params.distributionChannel = { $in: inputParams.distributionChannels }; }
  if (inputParams.formats && inputParams.formats.length > 0) { params.format = { $in: inputParams.formats }; }

  params = Utils.paramsToFilterParticipation(inputParams, params);
  return params;
}

module.exports = router;
