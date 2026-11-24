const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('mongodb');
const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const historyModelUser = require('../libs/historyModelUser');
const LibraryTemplate = require('../models/libraryTemplate');
const SalesTemplate = require('../models/salesTemplate');
const Payee = require('../models/payee');

const router = express.Router();
const parseUrlencoded = bodyParser.urlencoded({ extended: false, limit: '50mb' });

const error500 = 'Internal error, please try again';
const error403 = 'Forbidden';

router
/**
 * @api {get} /salesTemplates/ Get multiple Sales Templates
 * @apiGroup salesTemplates
 *
 * @apiUse TokenParams
 * @apiParam {String} [text] - Filter on supplied text string
 * @apiParam {String} [source] - Filter on Sales Template source, e.g. "Apple"
 * @apiParam {String} [createdAfter] - Return only Sales Templates created after createdAfter date (JavaScript date)
 * @apiParam {String} [createdBefore] - Return only Sales Templates created before createdBefore date (JavaScript date)
 * @apiParam {String} [archived] - Filter on archived/unarchived Templates ("true", "false")
 * @apiParam {Number} [page] - Page number to return
 * @apiParam {Number} [limit] - Number of items to return per page
 * @apiParam {String} [orderBy] - Column to order by
 * @apiParam {String} [orderDir] - Order direction ("asc", "desc")
 *
 * @apiSuccess {Object[]} salesTemplates - Array of Sales Templates
 * @apiSuccess {Object} meta - Meta data
 * @apiSuccess {Number} meta.currentPage - Number of page returned
 * @apiSuccess {Number} meta.totalPages - Total number of pages
 * @apiSuccess {Number} meta.total - Number of Sales Templates for client
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "salesTemplates": [
 *      {
 *        "_id": "5fff0b3f35c54f483cf1test",
 *        "name": "Sales Template 1 Name",
 *        ...
 *      },
 *      {
 *        "_id": "5c54f483cf15fff0b3f3test",
 *        "name": "Sales Template 2 Name",
 *        ...
 *      },
 *    ],
 *    "meta": {
 *      "currentPage": 1,
 *      "totalPages": 1,
 *      "total": 23
 *    }
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorInternalServerError
 */
  .get('/', (req, res) => {
    const { curveUser, query } = req;

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'sales' })) {
      const paginationParams = {
        page: Page.valueOrDefault(query.page, 1),
        limit: Page.valueOrDefault(query.limit, 25),
        sort: Page.sortOrDefault(query.orderBy, query.orderDir),
        // TODO would be good to add select property to only return relevant details - e.g. select: "name source createdAt"
      };
      SalesTemplate.paginate(paramsToFilterField(query, curveUser), paginationParams, (err, result) => {
        if (err) {
          logger.error(err);
          res.status(500).json({ message: error500 });
        } else {
          res.status(200).json({ salesTemplates: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
        }
      });
    } else {
      res.status(403).json({ message: error403 });
    }
  })

/**
 * @api {get} /salesTemplates/archive_many/ Archive multiple Sales Templates
 * @apiGroup salesTemplates
 *
 * @apiUse TokenParams
 * @apiQuery {String[]} ids - Sales Template ids
 *
 * @apiSuccess {String} message - Success message
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "message": "Sale templates successfully archived.",
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorInternalServerError
 */
  .get('/archive_many', (req, res) => {
    const { curveUser, query } = req;
    const { archived } = query;
    if (curveUser.clientId && !curveUser.payeeId && curveUser.rights?.[curveUser.clientId]?.sales === 'Edit') {
      const ids = query.ids.map((id) => new ObjectId(id));
      logger.info('Archiving Many [TEMPLATES]:', ids);
      SalesTemplate.updateMany({ clientId: curveUser.clientId, _id: { $in: ids } }, { $set: { archived } })
        .then(() => {
          res.status(200).json({ message: 'Sale templates successfully archived.' });
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: err.message });
        });
    } else {
      res.status(403).json({ message: error403 });
    }
  })

/**
 * @api {get} /salesTemplates/:id/history Get history for Sales Template
 * @apiGroup salesTemplates
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Sales Template id
 *
 * @apiSuccess {Object[]} modelHistory - Array of update history entries
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "modelHistory":[
 *      {
 *        "ops": [
 *          {"op":"add","path":"/name","value":"Template 1"},
 *          {"op":"add","path":"/clientId","value":"5fff0b3f35c54f483cf1test"},
 *          {"op":"add","path":"/createdBy","value":"5f102d96774ddf120098test"},
 *          {"op":"add","path":"/lastModifiedBy","value":"5f102d96774ddf120098test"}
 *        ],
 *        "_id":"603d03d3e9ad836b5989test",
 *        "ref":"603d03d3e9ad836b5989test",
 *        "author":null,
 *        "timestamp":"2021-03-01T15:10:11.955Z",
 *        "__v":0
 *      }
 *    ]
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorSalesTemplateNotFound
 * @apiUse ErrorInternalServerError
 */
  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;
    SalesTemplate.findById(params.id)
      .then(async (salesTemplate) => {
        if (!salesTemplate) {
          res.status(404).json({ message: `Could not find SalesTemplate with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'sales', document: salesTemplate, clientOnly: true })) {
          res.status(403).json({ message: error403 });
        } else {
          salesTemplate.patches.find({ ref: salesTemplate._id })
            .populate('author', 'email')
            .then((patches) => {
              historyModelUser.addModifiedBy(patches, (errHistory, patchesHistory) => {
                res.status(200).json({ modelHistory: patchesHistory });
              });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: error500 });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: error500 });
      });
  })

/**
 * @api {get} /salesTemplates/:id Get Sales Template
 * @apiGroup salesTemplates
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Sales Template id
 *
 * @apiSuccess {Object} none - Sales Template document
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "_id": "5fff0b3f35c54f483cf1test",
 *    "name": "Sales Template Name",
 *    ...
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorSalesTemplateNotFound
 * @apiUse ErrorInternalServerError
 */
  .get('/:id', (req, res) => {
    const { curveUser, params } = req;
    SalesTemplate.findById(params.id)
      .populate('createdBy', 'email')
      .populate('lastModifiedBy', 'email')
      .then(async (salesTemplate) => {
        if (!salesTemplate) {
          res.status(404).json({ message: `Could not find SalesTemplate with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'sales', document: salesTemplate, clientOnly: true })) {
          res.status(403).json({ message: error403 });
        } else {
          res.status(200).json(salesTemplate);
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: error500 });
      });
  })

/**
 * @api {put} /salesTemplates/:id Save Sales Template
 * @apiGroup salesTemplates
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Sales Template id
 * @apiBody {Object} body - Sales Template document
 *
 * @apiSuccess {Object} none - Sales Template document
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "_id": "5fff0b3f35c54f483cf1test",
 *    "name": "Sales Template Name",
 *    ...
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorSalesTemplateNotFound
 * @apiUse ErrorInternalServerError
 */
  .put('/:id', (req, res) => {
    const { curveUser, params, body } = req;
    SalesTemplate.findById(params.id)
      .then(async (foundSalesTemplate) => {
        if (!foundSalesTemplate) {
          res.status(404).json({ message: `Could not find SalesTemplate with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: foundSalesTemplate, clientOnly: true })) {
          res.status(403).json({ message: error403 });
        } else {
          delete body.clientId;
          body.lastModifiedBy = curveUser.id;
          if (!body.encoding) { body.encoding = null; }
          SalesTemplate.findByIdAndUpdate(params.id, body, { new: true })
            .then((salesTemplateUpdated) => {
              // We should allow exampleLines to be replaced when startingLine or delimiter has been changed
              const forceRebuildExampleLines = ((salesTemplateUpdated.startingLine !== foundSalesTemplate.startingLine) || (salesTemplateUpdated.delimiter !== foundSalesTemplate.delimiter));
              if ((salesTemplateUpdated.exampleLines.length < 1 || forceRebuildExampleLines) && salesTemplateUpdated.file) {
                salesTemplateUpdated.extractExamplesLinesAndIdentifiers((errExtract, salesTemplateExtracted) => {
                  if (errExtract) {
                    logger.error(errExtract);
                    res.status(500).json({ message: 'Error mapping template to sales file. Sales File is saved but may not be matched to the template' });
                  } else {
                    res.status(200).json(salesTemplateExtracted);
                  }
                });
              } else {
                res.status(200).json(salesTemplateUpdated);
              }
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: error500 });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: error500 });
      });
  })

/**
 * @api {delete} /salesTemplates/:id Delete Sales Template
 * @apiGroup salesTemplates
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Sales Template id
 *
 * @apiSuccess {Object} none - Sales Template document
 *
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "_id": "5fff0b3f35c54f483cf1test",
 *    "name": "Sales Template Name",
 *    ...
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorSalesTemplateNotFound
 * @apiUse ErrorInternalServerError
 */
  .delete('/:id', (req, res) => {
    const { curveUser, params } = req;
    SalesTemplate.findById(params.id)
      .then(async (salesTemplate) => {
        if (!salesTemplate) {
          res.status(404).json({ message: `Could not find Sales Template with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: salesTemplate, clientOnly: true })) {
          res.status(403).json({ message: error403 });
        } else {
          salesTemplate.deleteOne()
            .then(() => {
              res.status(200).json(salesTemplate);
            })
            .catch((err) => {
              logger.error(err);
              // Shouldn't we handle different errors here?
              res.status(201).json({ message: 'Sales Template could not be deleted as it is in use on a sales file' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: error500 });
      });
  })

/**
 * @api {post} /salesTemplates/create_from_library_template/:libraryTemplateId Create Sales Template from Library Template
 * @apiGroup salesTemplates
 *
 * @apiUse TokenParams
 * @apiParam {String} libraryTemplateId - Library Template id
 *
 * @apiSuccess {Object} none - Sales Template document
 *
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "_id": "5fff0b3f35c54f483cf1test",
 *    "name": "Sales Template Name",
 *    ...
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorLibraryTemplateNotFound
 * @apiUse ErrorInternalServerError
 */
  .post('/create_from_library_template/:libraryTemplateId', (req, res) => {
    const { curveUser, params } = req;
    if (!params.libraryTemplateId) { return res.status(400).json({ message: 'Requires a Library Template ID' }); }

    if (!curveUser.clientId || curveUser.payeeId) { return res.status(403).json({ message: error403 }); }

    LibraryTemplate.findById(params.libraryTemplateId)
      .then(async (libraryTemplate) => {
        if (!libraryTemplate) {
          res.status(404).json({ message: `Could not find Library Template with ID ${params.libraryTemplateId}` });
        } else {
          libraryTemplate.createSalesTemplate(curveUser, (errCreate, salesTemplate) => {
            if (errCreate) {
              logger.error(errCreate);
              res.status(500).json({ message: error500 });
            } else {
              res.status(200).json(salesTemplate);
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: error500 });
      });
  })

/**
 * @api {post} /salesTemplates/:id/add_to_library Create Library Template from Sales Template
 * @apiGroup salesTemplates
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Sales Template id
 *
 * @apiSuccess {Object} none - Library Template document
 *
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "_id": "5fff0b3f35c54f483cf1test",
 *    "name": "Library Template Name",
 *    ...
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorSalesTemplateNotFound
 * @apiUse ErrorInternalServerError
 */
  .post('/:id/add_to_library', (req, res) => {
    const { curveUser, params } = req;

    if (!params.id) { return res.status(400).json({ message: 'Requires a Sales Template ID' }); }

    if (!curveUser.clientId || curveUser.payeeId) { return res.status(403).json({ message: error403 }); }

    SalesTemplate.findById(params.id)
      .then(async (salesTemplate) => {
        if (!salesTemplate) {
          res.status(404).json({ message: `Could not find Sales Template with ID ${params.id}` });
        } else {
          salesTemplate.addToLibrary(curveUser, (errAdd, libraryTemplate) => {
            if (errAdd) {
              logger.error(errAdd);
              res.status(500).json({ message: error500 });
            } else {
              res.status(200).json(libraryTemplate);
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: error500 });
      });
  })

/**
 * @api {post} /salesTemplates/ Create Library Template
 * @apiGroup salesTemplates
 *
 * @apiUse TokenParams
 * @apiBody {Object} body - Sales Template document
 * @apiBody {Object} file - Text file containing example sales data
 *
 * @apiSuccess {Object} none - Sales Template document
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "_id": "5fff0b3f35c54f483cf1test",
 *    "name": "Sales Template Name",
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
    const salesTemplate = new SalesTemplate(body);
    if (!await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: salesTemplate, clientOnly: true })) {
      salesTemplate.save()
        .then((salesTemplateSaved) => {
          if (salesTemplateSaved.file) {
            salesTemplateSaved.extractExamplesLinesAndIdentifiers((errExtract, salesTemplateSaved2) => {
              if (errExtract) {
                logger.error(errExtract);
                res.status(500).json({ message: 'Error mapping template to sales file. Sales File is saved but may not be matched to the template' });
              } else {
                res.status(200).json(salesTemplateSaved2);
              }
            });
          } else {
            res.status(200).json(salesTemplateSaved);
          }
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: error500 });
        });
    } else {
      res.status(403).json({ message: error403 });
    }
  })

/**
 * @api {put} /salesTemplates/:id/get_upload_credentials Get upload credentials for Sales data file
 * @apiGroup salesTemplates
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Sales Template id
 * @apiBody {String} body.filename - Filename of file to upload
 * @apiBody {String} body.type - Type of file
 * @apiBody {String} body.lastModifiedBy - User Id
 *
 * @apiSuccess {String} completePath - API path to be called on successful file upload
 * @apiSuccess {Object} credentials - S3 paths and credentials
 * @apiSuccess {String} path - Path to S3 upload destination
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "completePath": "/salesTemplates/5fff0b3f35c54f483cf1test/upload_complete",
 *    "credentials": { ... },
 *    "path": "/salesTemplates/5fff0b3f35c54f483cf1test/sales_file_name.xls"
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorSalesTemplateNotFound
 * @apiUse ErrorInternalServerError
 * @apiError BadRequest - File is missing
 * @apiErrorExample {json} BadRequest Response:
 *  HTTP/1.1 400 BadRequest
 *  {
 *    "errors": [ "Requires a file to be uploaded" ]
 *  }
 */
  .put('/:id/get_upload_credentials', (req, res) => {
    const { curveUser, params, body } = req;

    // Write to S3
    SalesTemplate.findById(params.id)
      .then(async (salesTemplate) => {
        if (!salesTemplate) {
          res.status(404).json({ message: `Could not find Sales Template with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: salesTemplate, clientOnly: true })) {
          res.status(403).json({ message: error403 });
        } else {
          // Get upload credentials
          fileManager.getUploaderCredentials(`salesTemplates/${salesTemplate._id.toString()}/`, body, (data) => {
            data.completePath = `/salesTemplates/${salesTemplate._id.toString()}/upload_complete`;
            res.status(200).jsonp(data);
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: error500 });
      });
  })

/**
 * @api {put} /salesTemplates/:id/upload_complete Add uploaded Sales File path to Sales Template
 * @apiGroup salesTemplates
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Sales Template id
 * @apiBody {String} body.key - Path to S3 upload destination
  *
 * @apiSuccess {String} type - Success type
 * @apiSuccess {String} message - Success message
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "type": "Complete",
 *    "message": "The file is successfully uploaded"
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorSalesTemplateNotFound
 * @apiUse ErrorInternalServerError
 * @apiError BadRequest - File is missing
 * @apiErrorExample {json} BadRequest Response:
 *  HTTP/1.1 400 BadRequest
 *  {
 *    "errors": [ "Requires a file to be uploaded" ]
 *  }
 */
  .put('/:id/upload_complete', (req, res) => {
    const { curveUser, params, body } = req;

    // Write to S3
    SalesTemplate.findById(params.id)
      .then(async (salesTemplate) => {
        if (!salesTemplate) {
          res.status(404).json({ message: `Could not find Sales Template with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: salesTemplate, clientOnly: true })) {
          res.status(403).json({ message: error403 });
        } else {
          // Set file path
          salesTemplate.file = body.key;
          salesTemplate.extractExamplesLinesAndIdentifiers((errExtract, salesTemplateExtracted) => {
            if (errExtract) {
              logger.error(errExtract);
              res.status(500).json({ message: 'Error mapping template to sales file. Sales File is saved but may not be matched to the template' });
            } else {
              res.status(200).json(salesTemplateExtracted);
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: error500 });
      });
  });

function paramsToFilterField(inputParams, user) {
  const params = {};
  if (user.clientId) { params.clientId = user.clientId; }

  if (inputParams) {
    if (inputParams.text) {
      const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
      if (inputParams.text.length === 24 && ObjectId.isValid(inputParams.text)) {
        params.$or = [{ _id: inputParams.text }, { name: { $regex: regex } }];
      } else {
        params.name = { $regex: regex };
      }
    }

    // Test source for full/partial match
    if (inputParams.source) {
      const regex = new RegExp(inputParams.source, 'i');
      params.source = { $regex: regex };
    }

    // Test for archived status
    if (inputParams.archived) { params.archived = inputParams.archived; }
    if (inputParams.archived === 'false') { params.archived = { $ne: true }; }

    // Handle date filters
    if (inputParams.createdAfter || inputParams.createdBefore) { params.createdAt = {}; }
    if (inputParams.createdAfter) { params.createdAt.$gte = inputParams.createdAfter; }
    if (inputParams.createdBefore) { params.createdAt.$lte = inputParams.createdBefore; }
  }
  return params;
}
module.exports = router;
