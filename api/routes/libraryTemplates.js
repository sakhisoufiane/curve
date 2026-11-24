const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { Page } = require('@curveroyaltysystems/curve-shared-logic');
const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const historyModelUser = require('../libs/historyModelUser');
const LibraryTemplate = require('../models/libraryTemplate');

const router = express.Router();
const parseUrlencoded = bodyParser.urlencoded({ extended: false, limit: '50mb' });

function paramsToFilterField(inputParams) {
  const params = {};
  if (inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
    params.name = { $regex: regex };
  }
  if (inputParams.clientType) { params.clientType = inputParams.clientType; }
  return params;
}

router
/**
 * @api {get} /libraryTemplates/ Get multiple Library Templates
 * @apiGroup libraryTemplates
 *
 * @apiUse TokenParams
 * @apiParam {String} [text] - Filter on supplied text string
 * @apiParam {Number} [page] - Page number to return
 * @apiParam {Number} [limit] - Number of items to return per page
 * @apiParam {String} [orderBy] - Column to order by
 * @apiParam {String} [orderDir] - Order direction ("asc", "desc")
 *
 * @apiSuccess {Object[]} libraryTemplates Array of Library Templates
 * @apiSuccess {Object} meta Meta data
 * @apiSuccess {Number} meta.currentPage Number of page returned
 * @apiSuccess {Number} meta.totalPages Total number of pages
 * @apiSuccess {Number} meta.total Number of Library Templates for client
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "libraryTemplates": [
 *      {
 *        "published": true,
 *        "_id": "45ee6e06013e9b5d0fa39c9f",
 *        "name": "Library Template 1 Name",
 *        "source": "Source 1",
 *        "createdAt": "2021-01-29T10:55:49.551Z"
 *      },
 *      {
 *        "published": "true",
 *        "_id": "e9b4d45ee6e006013fa39c77",
 *        "name": "Library Template 2 Name",
 *        "source": "Source 2",
 *        "createdAt": "2021-01-30T08:25:23.123Z"
 *      }
 *    ],
 *    "meta": {
 *      "currentPage": 1,
 *      "totalPages": 1,
 *      "total": 2
 *    }
 *  }
 *
 * @apiUse ErrorInternalServerError
 */
  .get('/', (req, res) => {
    const paginationParams = {
      page: Page.valueOrDefault(req.query.page, 1),
      limit: Page.valueOrDefault(req.query.limit, 25),
      sort: Page.sortOrDefault(req.query.orderBy, req.query.orderDir),
      select: 'name source createdAt published',
    };
    LibraryTemplate.paginate(paramsToFilterField(req.query), paginationParams, (err, result) => {
      if (err) {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      } else {
        res.status(200).json({ libraryTemplates: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
      }
    });
  })

/**
 * @api {get} /libraryTemplates/:id/history Get history for Library Template
 * @apiGroup libraryTemplates
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Library Template id
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
 * @apiUse ErrorForbiddenNotInternal
 * @apiUse ErrorSalesTemplateNotFound
 * @apiUse ErrorInternalServerError
 */
  .get('/:id/history', (req, res) => {
    if (!req.curveUser?.internal) { return res.status(403).json({ message: 'Forbidden' }); }

    LibraryTemplate.findById(req.params.id)
      .then((libraryTemplate) => {
        if (!libraryTemplate) {
          res.status(404).json({ message: `Could not find Library Template with ID ${req.params.id}` });
        } else {
          libraryTemplate.patches
            .find({ ref: libraryTemplate._id })
            .populate('author', 'email')
            .then((patchesLib) => {
              historyModelUser.addModifiedBy(patchesLib, (errPatches, patchesHistory) => {
                res.status(200).json({ modelHistory: patchesHistory });
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

/**
 * @api {get} /libraryTemplates/:id Get Library Template
 * @apiGroup libraryTemplates
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Library Template id
 *
 * @apiSuccess {Object} none - Library Template object
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "_id": "5fff0b3f35c54f483cf1test",
 *    "name": "Library Template Name",
 *    ...
 *  }
 *
 * @apiUse ErrorForbiddenNotInternal
 * @apiUse ErrorLibraryTemplateNotFound
 * @apiUse ErrorInternalServerError
 */
  .get('/:id', (req, res) => {
    if (!req.curveUser?.internal) { return res.status(403).json({ message: 'Forbidden' }); }

    LibraryTemplate.findById(req.params.id)
      .populate('createdBy', 'email')
      .populate('lastModifiedBy', 'email')
      .then((libraryTemplate) => {
        if (!libraryTemplate) {
          res.status(404).json({ message: `Could not find Library Template with ID ${req.params.id}` });
        } else {
          res.status(200).json(libraryTemplate);
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

/**
 * @api {put} /libraryTemplates/:id Save Library Template
 * @apiGroup libraryTemplates
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Library Template id
 * @apiBody {Object} body - Library Template object
 *
 * @apiSuccess {Object} none - Library Template object
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "_id": "5fff0b3f35c54f483cf1test",
 *    "name": "Library Template Name",
 *    ...
 *  }
 *
 * @apiUse ErrorForbiddenNotInternal
 * @apiUse ErrorLibraryTemplateNotFound
 * @apiUse ErrorInternalServerError
 */
  .put('/:id', (req, res) => {
    if (!req.curveUser?.internal) { return res.status(403).json({ message: 'Forbidden' }); }

    LibraryTemplate.findById(req.params.id)
      .then((foundLibraryTemplate) => {
        if (!foundLibraryTemplate) {
          res.status(404).json({ message: `Could not find Library Template with ID ${req.params.id}` });
        } else if (foundLibraryTemplate.userForbidden(req.curveUser)) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          req.body.lastModifiedBy = req.curveUser.id;
          LibraryTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .then((libraryTemplateUpdated) => {
              // We should allow exampleLines to be replaced when startingLine or delimiter has been changed
              const forceRebuildExampleLines = ((libraryTemplateUpdated.startingLine !== foundLibraryTemplate.startingLine) || (libraryTemplateUpdated.delimiter !== foundLibraryTemplate.delimiter));
              if ((libraryTemplateUpdated.exampleLines.length < 1 || forceRebuildExampleLines) && libraryTemplateUpdated.file) {
                libraryTemplateUpdated.extractExamplesLinesAndIdentifiers((errExtract, libraryTemplateExtracted) => {
                  if (errExtract) {
                    logger.error(errExtract);
                    res.status(500).json({ message: 'Error mapping template to sales file. Sales File is saved but may not be matched to the template' });
                  } else {
                    res.status(200).json(libraryTemplateExtracted);
                  }
                });
              } else {
                res.status(200).json(libraryTemplateUpdated);
              }
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

/**
 * @api {delete} /libraryTemplates/:id Delete Library Template
 * @apiGroup libraryTemplates
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Library Template id
 *
 * @apiSuccess {Object} none - Library Template object
 *
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "_id": "5fff0b3f35c54f483cf1test",
 *    "name": "Library Template Name",
 *    ...
 *  }
 *
 * @apiUse ErrorLibraryTemplateNotFound
 * @apiUse ErrorInternalServerError
 */
  .delete('/:id', (req, res) => {
    if (!req.curveUser?.internal) { return res.status(403).json({ message: 'Forbidden' }); }

    LibraryTemplate.findByIdAndDelete(req.params.id)
      .then((libraryTemplate) => {
        if (!libraryTemplate) {
          res.status(404).json({ message: `Could not find Library Template with ID ${req.params.id}` });
        } else {
          res.status(200).json(libraryTemplate);
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

/**
 * @api {post} /libraryTemplates/ Create Library Template
 * @apiGroup libraryTemplates
 *
 * @apiUse TokenParams
 * @apiBody {Object} body - Library Template object
 *
 * @apiSuccess {Object} none - Library Template object
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "_id": "5fff0b3f35c54f483cf1test",
 *    "name": "Library Template Name",
 *    ...
 *  }
 *
 * @apiUse ErrorInternalServerError
 */
  .post('/', parseUrlencoded, (req, res) => {
    if (!req.curveUser?.internal) { return res.status(403).json({ message: 'Forbidden' }); }

    req.body.createdBy = req.curveUser.id;
    req.body.lastModifiedBy = req.curveUser.id;
    const libraryTemplate = new LibraryTemplate(req.body);
    libraryTemplate.save()
      .then((libraryTemplateSaved) => {
        res.status(200).json(libraryTemplateSaved);
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

/**
 * @api {put} /libraryTemplates/:id/get_upload_credentials Get upload credentials for Sales data file
 * @apiGroup libraryTemplates
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Library Template id
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
 *    "completePath": "/libraryTemplates/5fff0b3f35c54f483cf1test/upload_complete",
 *    "credentials": { ... },
 *    "path": "/libraryTemplates/5fff0b3f35c54f483cf1test/sales_file_name.xls"
 *  }
 *
 * @apiUse ErrorLibraryTemplateNotFound
 * @apiError BadRequest - File is missing
 * @apiErrorExample {json} BadRequest Response:
 *  HTTP/1.1 400 BadRequest
 *  {
 *    "errors": [ "Requires a file to be uploaded" ]
 *  }
 */
  .put('/:id/get_upload_credentials', (req, res) => {
    if (!req.curveUser?.internal) { return res.status(403).json({ message: 'Forbidden' }); }

    // TODO need to check if file is supplied (400 Error already added above)
    LibraryTemplate.findById(req.params.id)
      .then((libraryTemplate) => {
        if (!libraryTemplate) {
          res.status(404).json({ message: `Could not find Library Template with ID ${req.params.id}` });
        } else {
          // Get upload credentials
          fileManager.getUploaderCredentials(`libraryTemplates/${libraryTemplate._id.toString()}/`, req.body, (data) => {
            data.completePath = `/libraryTemplates/${libraryTemplate._id.toString()}/upload_complete`;
            res.status(200).jsonp(data);
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

/**
 * @api {put} /libraryTemplates/:id/upload_complete Add uploaded Sales File path to Library Template
 * @apiGroup libraryTemplates
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Library Template id
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
 * @apiUse ErrorLibraryTemplateNotFound
 * @apiUse ErrorInternalServerError
 * @apiError BadRequest - File is missing
 * @apiErrorExample {json} BadRequest Response:
 *  HTTP/1.1 400 BadRequest
 *  {
 *    "errors": [ "Requires a file to be uploaded" ]
 *  }
 */
  .put('/:id/upload_complete', (req, res) => {
    if (!req.curveUser?.internal) { return res.status(403).json({ message: 'Forbidden' }); }
    // Write to S3
    LibraryTemplate.findById(req.params.id)
      .then((libraryTemplate) => {
        if (!libraryTemplate) {
          res.status(404).json({ message: `Could not find Library Template with ID ${req.params.id}` });
        } else {
        // Set file path
          libraryTemplate.file = req.body.key;
          libraryTemplate.extractExamplesLinesAndIdentifiers((errExtract, libraryTemplateExtracted) => {
            if (errExtract) {
              logger.error(errExtract);
              res.status(500).json({ message: 'Error mapping template to sales file. Sales File is saved but may not be matched to the template' });
            } else {
              res.status(200).json(libraryTemplateExtracted);
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  });

module.exports = router;
