/* eslint-disable no-await-in-loop */
const { logger, fileManager, CurveError } = require('@curveroyaltysystems/platform-shared-utils');
const { UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('mongodb');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const appRootDir = require('app-root-dir').get();
const multer = require('multer');
const _ = require('lodash');
const historyModelUser = require('../../libs/historyModelUser');
const IgnitionExport = require('../../libs/ignitionExport');
const { applyDateFilters } = require('../../libs/dateFilters');
const { CSVRawExport } = require('../../libs/mongodb-export');
const SalesFile = require('../../models/salesFile');
const Payee = require('../../models/payee');
const SalesFileController = require('../../controllers/salesFile');

const router = express.Router();
const parseUrlencoded = bodyParser.urlencoded({ extended: false });

const storage = multer.diskStorage({
  destination(req, file, cb) { cb(null, `${appRootDir}/tmp/`); },
  filename(req, file, cb) { cb(null, `${Date.now()}-${file.originalname}`); },
});

const upload = multer({ storage });

const INTERNAL_ERROR = 'Internal error, please try again';
const FORBIDDEN_ERROR = 'Forbidden';
const GENERIC_ERROR = 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.';

router
  // Fetch data needed for bulk editing specified sales files
  // This must go before .get(/:id) otherwise it attempts to use that route first
  .get('/bulk_edit', async (req, res) => {
    const { curveUser, query } = req;
    if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'sales' })) {
      return res.status(403).json({ message: FORBIDDEN_ERROR });
    }
    try {
      const salesFiles = await SalesFileController.getBulkEditData({ curveUser, query });
      return res.status(200).json(salesFiles);
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: INTERNAL_ERROR });
    }
  })

  // This must go before .get(/:id) otherwise it attempts to use that route first
  .get('/filter_options', async (req, res) => {
    const { curveUser } = req;
    if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'sales' })) {
      return res.status(403).json({ message: FORBIDDEN_ERROR });
    }
    try {
      const filterOptions = await SalesFileController.getFilterOptions({ clientId: curveUser.clientId });
      return res.status(200).json(filterOptions);
    } catch (err) {
      logger.error('Failed to retrieve all sales file target periods:', err);
      return res.status(500).json({ message: INTERNAL_ERROR });
    }
  })

/**
 * @api {get} /salesFiles/ Get multiple Sales Files
 * @apiGroup salesFiles
 *
 * @apiUse TokenParams
 * @apiParam {String} [text] - Filter on supplied text string
 * @apiParam {String} [valid] - Filter on valid|invalid files ("true", "false")
 * @apiParam {String} [status] - Filter on status ("Setup", "Complete", "Ingesting", "Errored")
 * @apiParam {String} [reportedStatus] - Filter on reported status ("Fully Reported", "Partially Reported", "Unreported")
 * @apiParam {String} [archived] - Filter on archived|unarchived files ("true", "false")
 * @apiParam {Number} [page] - Page number to return
 * @apiParam {Number} [limit] - Number of items to return per page
 * @apiParam {String} [orderBy] - Column to order by
 * @apiParam {String} [orderDir] - Order direction ("asc", "desc")
 *
 * @apiSuccess {Object[]} salesFiles - Array of sales files
 * @apiSuccess {Object} meta - Meta data
 * @apiSuccess {Number} meta.currentPage - Number of page returned
 * @apiSuccess {Number} meta.totalPages - Total number of pages
 * @apiSuccess {Number} meta.total - Number of sales files for client
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "salesFiles": [
 *      {
 *        "_id": "5fff0b3f35c54f483cf1test",
 *        "name": "Sales File 1 Name",
 *        ...
 *      },
 *      {
 *        "_id": "5c54f483cf15fff0b3f3test",
 *        "name": "Sales File 2 Name",
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

    if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'sales' })) { return res.status(403).json({ message: FORBIDDEN_ERROR }); }

    SalesFileController.getSalesFiles({ curveUser, query }).then((salesFiles) => {
      res.status(200).json(salesFiles);
    }).catch((err) => {
      logger.error(err);
      res.status(500).json({ message: INTERNAL_ERROR });
    });
  })

/**
 * @api {post} /salesFiles/export/ Export multiple Sales Files
 * @apiGroup salesFiles
 *
 * @apiUse TokenParams
 * @apiBody {String[]} body.ids - Sales File ids
 *
 * @apiSuccess {String} message - Success message
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "message": "Your report will be sent to you via email shortly",
 *  }
 *
 * @apiUse ErrorForbidden
 */
  .post('/export', (req, res) => {
    const { curveUser, body } = req;
    if (curveUser.clientId) {
      if (body.ids?.length) {
        SalesFile.sendExport({ clientId: curveUser.clientId, _id: { $in: body.ids } }, curveUser);
      } else {
        SalesFile.sendExport(paramsToFilterField(body.filter, curveUser), curveUser);
      }
      res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
    } else {
      res.status(403).json({ message: FORBIDDEN_ERROR });
    }
  })

/**
 * @api {get} /salesFiles/archive_many/ Archive multiple Sales Files
 * @apiGroup salesFiles
 *
 * @apiUse TokenParams
 * @apiQuery {String[]} ids - Sales File ids
 *
 * @apiSuccess {String} message - Success message
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "message": "Sale files successfully archived.",
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorInternalServerError
 */
  .get('/archive_many', (req, res) => {
    const { curveUser, query } = req;
    if (curveUser?.clientId && ['Edit'].includes(curveUser?.rights?.[curveUser?.clientId]?.sales)) {
      const ids = query.ids.map((id) => new ObjectId(id));
      logger.info('Archiving Many [SALES FILES]:', ids);
      SalesFile.updateMany({ clientId: curveUser.clientId, _id: { $in: ids } }, { $set: { archived: true } }, { timestamps: false })
        .then(() => {
          res.status(200).json({ message: 'Sale files successfully archived.' });
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: err.message });
        });
    } else {
      res.status(403).json({ message: FORBIDDEN_ERROR });
    }
  })

/**
 * @api {get} /salesFiles/unarchive_many/ Unarchive multiple Sales Files
 * @apiGroup salesFiles
 *
 * @apiUse TokenParams
 * @apiQuery {String[]} ids - Sales File ids
 *
 * @apiSuccess {String} message - Success message
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "message": "Sale files successfully unarchived.",
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorInternalServerError
 */
  .get('/unarchive_many', (req, res) => {
    const { curveUser, query } = req;
    if (curveUser?.clientId && ['Edit'].includes(curveUser?.rights?.[curveUser?.clientId]?.sales)) {
      const ids = query.ids.map((id) => new ObjectId(id));
      logger.info('Unarchiving Many:', ids);
      SalesFile.updateMany({ clientId: curveUser.clientId, _id: { $in: ids } }, { $set: { archived: false } }, { timestamps: false })
        .then(() => {
          res.status(200).json({ message: 'Sale files successfully unarchived.' });
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: err.message });
        });
    } else {
      res.status(403).json({ message: FORBIDDEN_ERROR });
    }
  })

/**
 * @api {get} /salesFiles/:id/history Get history for Sales File
 * @apiGroup salesFiles
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Sales File id
 *
 * @apiSuccess {Object[]} modelHistory - Array of update history entries
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "modelHistory":[
 *      {
 *        "ops": [
 *          {"op":"add","path":"/payeeCategories","value":[]},
 *          {"op":"add","path":"/name","value":"Payee 1"},
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
 * @apiUse ErrorSalesFileNotFound
 * @apiUse ErrorInternalServerError
 */
  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;
    SalesFile.findById(params.id)
      .then(async (salesFile) => {
        if (!salesFile) {
          res.status(404).json({ message: `Could not find SalesFile with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'sales', document: salesFile, clientOnly: true })) {
          res.status(403).json({ message: FORBIDDEN_ERROR });
        } else {
          salesFile.patches.find({ ref: salesFile._id })
            .populate('author', 'email')
            .then((patchesSalesFile) => {
              historyModelUser.addModifiedBy(patchesSalesFile, (errHistory, patchesHistory) => {
                res.status(200).json({ modelHistory: patchesHistory });
              });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: INTERNAL_ERROR });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: INTERNAL_ERROR });
      });
  })

/**
 * @api {get} /salesFiles/:id Get Sales File
 * @apiGroup salesFiles
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Sales File id
 *
 * @apiSuccess {Object} none - Sales File document
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "_id": "5fff0b3f35c54f483cf1test",
 *    "name": "Sales File Name",
 *    ...
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorSalesFileNotFound
 * @apiUse ErrorInternalServerError
 */
  .get('/:id', (req, res) => {
    const { curveUser, params } = req;
    SalesFile.findById(req.params.id)
      .then(async (salesFile) => {
        if (!salesFile) {
          res.status(404).json({ message: `Could not find Sales File with ID ${req.params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'sales', document: salesFile, clientOnly: true })) {
          res.status(403).json({ message: FORBIDDEN_ERROR });
        } else {
          SalesFileController.getSalesFile({ params, curveUser })
            .then((salesFile) => {
              res.status(200).json(salesFile);
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: INTERNAL_ERROR });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: INTERNAL_ERROR });
      });
  })

/**
 * @api {put} /salesFiles/:id Save Sales File
 * @apiGroup salesFiles
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Sales File id
 * @apiBody {Object} body - Sales File document
 *
 * @apiSuccess {Object} none - Sales File document
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "_id": "5fff0b3f35c54f483cf1test",
 *    "name": "Sales File Name",
 *    ...
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorSalesFileNotFound
 * @apiUse ErrorInternalServerError
 */
  .put('/:id', (req, res) => {
    const { curveUser, params, body } = req;
    SalesFile.findById(params.id)
      .then(async (foundSalesFile) => {
        if (!foundSalesFile) {
          res.status(404).json({ message: `Could not find SalesFile with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: foundSalesFile, clientOnly: true })) {
          res.status(403).json({ message: FORBIDDEN_ERROR });
        } else {
          delete body.clientId;
          delete body.publicLink;
          delete body.exampleLines;
          delete body.duplicateSalesFileId;
          delete body.file; // S3 path is set at upload time and immutable thereafter

          SalesFile.findByIdAndUpdate(params.id, body, { new: true })
            .then((salesFile) => {
              if (salesFile.invalidFields.releases.length > 20) { salesFile.invalidFields.releases = salesFile.invalidFields.releases.slice(0, 19); }
              if (salesFile.invalidFields.tracks.length > 20) { salesFile.invalidFields.tracks = salesFile.invalidFields.tracks.slice(0, 19); }
              if (salesFile.invalidFields.works.length > 20) { salesFile.invalidFields.works = salesFile.invalidFields.works.slice(0, 19); }
              salesFile.cleanBulkIdentifiersFromTemplates();
              res.status(200).json(salesFile);
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: INTERNAL_ERROR });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: INTERNAL_ERROR });
      });
  })

/**
 * @api {delete} /salesFiles/bulk Delete multiple Sales Files
 * @apiGroup salesFiles
 *
 * @apiUse TokenParams
 * @apiBody {String[]} body.ids - Sales File ids
 *
 * @apiSuccess {String} message - Success message
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "message": "Sales Files are being deleted, you will be notified once it is complete"
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorSalesFileNotFound
 */
  .delete('/bulk', (req, res) => {
    const { curveUser, body } = req;
    if (!curveUser.payeeId && ['Edit'].includes(curveUser?.rights?.[curveUser?.clientId]?.sales)) {
      if (body.ids?.length) {
        // Turn IDs into ObjectIds
        const ids = body.ids.map((id) => new ObjectId(id));
        // Check files are not ingesting
        SalesFile.find({ clientId: curveUser.clientId, _id: { $in: ids }, status: { $nin: ['Waiting', 'Ingesting', 'Revalidating', 'Deleting'] }, locked: { $ne: true } }, '_id')
          .then((completedSalesFileIds) => {
            const completeIds = completedSalesFileIds.map((file) => file._id.toString());
            // Update status to deleting
            if (completeIds && completeIds.length > 0) {
              SalesFile.updateMany({ _id: { $in: completedSalesFileIds.map((file) => file._id) } }, { $set: { status: 'Deleting' } })
                .then(() => {
                  SalesFile.bulkDelete(completeIds, curveUser.clientId, curveUser, (err) => {
                    if (err) {
                      logger.error('Sales File Bulk Deletion Failed', completeIds);
                      logger.error(err);
                    }
                  });
                  if (body.ids.length === completeIds.length) {
                    res.status(200).json({ message: 'Selected Sales Files are being deleted. You will be notified when it has completed.' });
                  } else {
                    res.status(200).json({ message: 'Some selected Sales Files have successfully been sent for deletion. Locked Sales Files and Sales Files currently ingesting or deleting cannot be deleted. Please wait until their processes are complete and try again.' });
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json({ message: GENERIC_ERROR });
                });
            } else {
              res.status(405).json({ message: 'Could not delete the selected Sales Files as they are locked or currently ingesting or deleting.' });
            }
          })
          .catch((err) => {
            logger.error(err);
            res.status(500).json({ message: GENERIC_ERROR });
          });
      } else {
        res.status(404).json({ message: 'Could not find Sales Files' });
      }
    } else {
      res.status(403).json({ message: FORBIDDEN_ERROR });
    }
  })

/**
 * @api {delete} /salesFiles/:id Delete Sales File
 * @apiGroup salesFiles
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Sales File id
 *
 * @apiSuccess {Object} none - Sales File document
 * @apiSuccess {String} message - 201 Error message returned from salesFile.remove method
 *
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "_id": "5fff0b3f35c54f483cf1test",
 *    "name": "Sales File Name",
 *    ...
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorSalesFileNotFound
 * @apiUse ErrorInternalServerError
 */
  .delete('/:id', (req, res) => {
    const { curveUser, params } = req;
    SalesFile.findById(params.id)
      .then(async (salesFile) => {
        if (!salesFile) {
          res.status(404).json({ message: `Could not find Sales File with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: salesFile, clientOnly: true })) {
          res.status(403).json({ message: FORBIDDEN_ERROR });
        } else if (['Waiting', 'Ingesting', 'Revalidating', 'Deleting'].includes(salesFile.status)) {
          res.status(405).json({ message: 'Could not delete the selected Sales File as it is currently ingesting or deleting.' });
        } else if (salesFile.locked) {
          res.status(405).json({ message: 'Could not delete the selected Sales File as it is locked.' });
        } else {
          salesFile.deleteOne()
            .then(() => {
              res.status(200).json(salesFile);
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: GENERIC_ERROR });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: INTERNAL_ERROR });
      });
  })

/**
 * @api {post} /salesFiles/ Create Sales File
 * @apiGroup salesFiles
 *
 * @apiUse TokenParams
 * @apiBody {Object} body - Sales File document
 * @apiBody {Object} file - Text file containing actual sales data
 *
 * @apiSuccess {Object} none - Sales File document
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "_id": "5fff0b3f35c54f483cf1test",
 *    "name": "Sales File Name",
 *    ...
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorInternalServerError
 */
  .post('/', parseUrlencoded, upload.single('file'), async (req, res) => {
    const { curveUser, body, file } = req;

    body.clientId = curveUser.clientId;
    delete body.publicLink;
    delete body.file;
    const salesFile = new SalesFile(body);
    if (!await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: salesFile, clientOnly: true })) {
      salesFile.status = 'Setup';
      salesFile.save()
        .then((salesFileSaved) => {
          if (file) {
            // TODO: I believe file upload is only done via front end now, so this (and apiParam for file) could be removed if that's correct - see LibraryTemplates
            // Upload file to S3
            fileManager.uploadToS3(`saleFiles/${salesFileSaved._id}/${file.originalname}`, file.path, (errS3, key) => {
              if (errS3) {
                res.status(500).json({ message: INTERNAL_ERROR });
              } else {
                salesFileSaved.file = key;
                salesFileSaved.save()
                  .then((salesFileSaved2) => {
                    res.status(200).json(salesFileSaved2);
                  })
                  .catch((errSave) => {
                    logger.error(errSave);
                    res.status(500).json({ message: INTERNAL_ERROR });
                  });
              }
            });
          } else {
            res.status(200).json(salesFileSaved);
          }
        })
        .catch((errSave) => {
          logger.error(errSave);
          res.status(500).json({ message: INTERNAL_ERROR });
        });
    } else {
      res.status(403).json({ message: FORBIDDEN_ERROR });
    }
  })

/**
 * @api {put} /salesFiles/:id/get_upload_credentials Get upload credentials for Sales data file
 * @apiGroup salesFiles
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Sales File id
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
 *    "completePath": "/salesFiles/5fff0b3f35c54f483cf1test/upload_complete",
 *    "credentials": { ... },
 *    "path": "/salesFiles/5fff0b3f35c54f483cf1test/sales_file_name.xls"
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorSalesFileNotFound
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
    SalesFile.findById(params.id)
      .then(async (salesFile) => {
        if (!salesFile) {
          res.status(404).json({ message: `Could not find Sales File with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: salesFile, clientOnly: true })) {
          res.status(403).json({ message: FORBIDDEN_ERROR });
        } else {
          // Get upload credentials
          fileManager.getUploaderCredentials(`salesFiles/${salesFile._id.toString()}/`, body, (data) => {
            data.completePath = `/salesFiles/${salesFile._id.toString()}/upload_complete`;
            res.status(200).jsonp(data);
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: INTERNAL_ERROR });
      });
  })

/**
 * @api {put} /salesFiles/:id/get_additional_file_upload_credentials Get upload credentials for Financial File
 * @apiGroup salesFiles
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Sales File id
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
 *    "completePath": "/salesFiles/5fff0b3f35c54f483cf1test/additional_upload_complete",
 *    "credentials": { ... },
 *    "path": "/salesFiles/5fff0b3f35c54f483cf1test/additional_file_name.xls"
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorSalesFileNotFound
 * @apiUse ErrorInternalServerError
 * @apiError BadRequest File is missing
 * @apiErrorExample {json} BadRequest Response:
 *  HTTP/1.1 400 BadRequest
 *  {
 *    "errors": [ "Requires a file to be uploaded" ]
 *  }
 */
  .put('/:id/get_additional_file_upload_credentials', (req, res) => {
    const { curveUser, params, body } = req;

    // Write to S3
    SalesFile.findById(params.id)
      .then(async (salesFile) => {
        if (!salesFile) {
          res.status(404).json({ message: `Could not find Sales File with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: salesFile, clientOnly: true })) {
          res.status(403).json({ message: FORBIDDEN_ERROR });
        } else {
          // Get upload credentials
          fileManager.getUploaderCredentials(`salesFiles/${salesFile._id.toString()}/`, body, (data) => {
            data.completePath = `/salesFiles/${salesFile._id.toString()}/additional_upload_complete`;
            res.status(200).jsonp(data);
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: INTERNAL_ERROR });
      });
  })

/**
 * @api {put} /salesFiles/:id/upload_complete Add uploaded Sales File path to Sales File and [ingest]
 * @apiGroup salesFiles
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Sales File id
 * @apiBody {String} body.key - Path to S3 upload destination
 * @apiBody {Boolean} [ingest] - Ingest the sales file after save if this is set to true
 *
 * @apiSuccess {String} type - Success type
 * @apiSuccess {String} message - Success message
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "type": "Complete",
 *    "message": "The file is successfully uploaded"
 *  }
 * @apiSuccessExample {json} Success Ingest Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "message": "File sent for ingestion"
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorSalesFileNotFound
 * @apiUse ErrorInternalServerError
 * @apiError BadRequest File is missing
 * @apiErrorExample {json} BadRequest Response:
 *  HTTP/1.1 400 BadRequest
 *  {
 *    "errors": [ "Requires a file to be uploaded" ]
 *  }
 */
  .put('/:id/upload_complete', (req, res) => {
    const { curveUser, params, body } = req;

    // Write to S3
    SalesFile.findById(params.id)
      .then(async (salesFile) => {
        if (!salesFile) {
          res.status(404).json({ message: `Could not find SalesFile with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: salesFile, clientOnly: true })) {
          res.status(403).json({ message: FORBIDDEN_ERROR });
        } else {
          // TODO: If upload is only done via front end now, the below could be removed also?
          let responded = false;
          setTimeout(() => {
            if (!responded) {
              responded = true;
              res.status(200).json({ type: 'Processing', message: 'The file is currently processing, check back to the file shortly' });
            }
          }, 30000);
          // /TODO

          // Set file path
          salesFile.file = body.key;
          // TODO: customAdditionalFile should only be supplied to /additional_upload_complete/ I believe, so the line below could go?
          salesFile.customAdditionalFile = body.customAdditionalKey;
          salesFile.save()
            .then(() => {
              if (body.ingest) { // TODO should this check for "true" instead of boolean?
                responded = true;
                salesFile.createIngestTask(2, curveUser, (errTask) => {
                  if (errTask) {
                    logger.error(errTask);
                    res.status(500).json({ message: INTERNAL_ERROR });
                  } else {
                    res.status(200).json({ message: 'File sent for ingestion' });
                  }
                });
              } else {
                // Download file and set example lines
                fileManager.getFileSize(body.key, (errFileManager, size) => {
                  // Test if less than 100MB - don't do it if file is bigger than 100MB
                  if (size && size < 100000000) {
                    // Get example lines
                    fileManager.downloadFromS3(body.key, process.env.S3_bucket, (errDownload, localFile) => {
                      salesFile.mapTemplateToSalesFile(localFile, (errMapTemplate) => {
                        if (errMapTemplate) {
                          logger.error(errMapTemplate);
                          res.status(500).json({ message: 'Error mapping template to sales file. Sales File is saved but may not be matched to the template' });
                        } else {
                          fs.unlinkSync(localFile);
                          salesFile.save()
                            .then(() => {
                              if (!responded) {
                                responded = true;
                                res.status(200).json({ type: 'Complete', message: 'The file is successfully uploaded' });
                              }
                            })
                            .catch((err) => {
                              logger.error(err);
                              res.status(500).json({ message: INTERNAL_ERROR });
                            });
                        }
                      });
                    });
                  } else {
                    responded = true;
                    res.status(200).json({ type: 'Complete', message: 'The file is successfully uploaded' });
                  }
                });
              }
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: INTERNAL_ERROR });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: INTERNAL_ERROR });
      });
  })

/**
 * @api {put} /salesFiles/:id/additional_upload_complete Add uploaded Financial File path to Sales File
 * @apiGroup salesFiles
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Sales File id
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
 * @apiUse ErrorForbidden
 * @apiUse ErrorSalesFileNotFound
 * @apiUse ErrorInternalServerError
 * @apiError BadRequest File is missing
 * @apiErrorExample {json} BadRequest Response:
 *  HTTP/1.1 400 BadRequest
 *  {
 *    "errors": [ "Requires a file to be uploaded" ]
 *  }
 */
  .put('/:id/additional_upload_complete', (req, res) => {
    const { curveUser, params, body } = req;

    // Write to S3
    SalesFile.findById(params.id)
      .then(async (salesFile) => {
        if (!salesFile) {
          res.status(404).json({ message: `Could not find SalesFile with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: salesFile, clientOnly: true })) {
          res.status(403).json({ message: FORBIDDEN_ERROR });
        } else {
          // Set file path
          salesFile.customAdditionalFile = body.key;
          salesFile.save()
            .then(() => {
              res.status(200).json({ type: 'Complete', message: 'The file is successfully uploaded' });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'There was an error saving the sales file' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: INTERNAL_ERROR });
      });
  })

/**
 * @api {post} /salesFiles/:id/ingest Trigger ingest task for Sales File
 * @apiGroup salesFiles
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Sales File id
 *
 * @apiSuccess {String} message - Success message
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "message": "File sent for ingestion"
 *  }
 * @apiUse ErrorForbidden
 * @apiUse ErrorSalesFileNotFound
 * @apiUse ErrorInternalServerError
 */
  .post('/:id/ingest', parseUrlencoded, (req, res) => {
    const { curveUser, params } = req;
    const { id } = params;

    SalesFileController.runIngestion(curveUser, id)
      .then(() => res.status(200).json({ message: 'File sent for ingestion' }))
      .catch((err) => {
        if (err instanceof CurveError) {
          res.status(parseInt(err.statusCode)).json({ message: err.userMessage });
        } else {
          logger.error(err);
          res.status(500).json({ message: err.userMessage });
        }
      });
  })

/**
 * @api {post} /salesFiles/bulk_ingest Trigger ingest task for multiple Sales Files
 * @apiGroup salesFiles
 *
 * @apiUse TokenParams
 * @apiBody {String[]} body.ids - Sales Files ids
 *
 * @apiSuccess {String} message - Success message
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "message": "Bulk ingestion of sales files triggered"
 *  }
 * @apiUse ErrorInternalServerError
 */
  .post('/bulk_ingest', parseUrlencoded, (req, res) => {
    const { curveUser, body } = req;

    if (curveUser.clientId && ['Edit'].includes(curveUser?.rights?.[curveUser?.clientId]?.sales)) {
      if (body.ids?.length) {
        SalesFile.bulkIngest(body.ids, curveUser, (err) => {
          if (err) {
            res.status(201).json({ message: err.message });
          } else {
            res.status(200).json({ message: 'Bulk ingestion of sales files triggered' });
          }
        });
      } else {
        res.status(500).json({ message: INTERNAL_ERROR });
      }
    } else {
      res.status(403).json({ message: FORBIDDEN_ERROR });
    }
  })

/**
 * @api {post} /salesFiles/bulk_revalidate Trigger revalidate task for multiple Sales Files
 * @apiGroup salesFiles
 *
 * @apiUse TokenParams
 * @apiBody {String[]} body.ids - Sales Files ids
 *
 * @apiSuccess {String} message - Success message
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "message": "Bulk revalidation of sales files triggered"
 *  }
 * @apiUse ErrorInternalServerError
 */
  .post('/bulk_revalidate', parseUrlencoded, (req, res) => {
    const { curveUser, body } = req;

    if (curveUser.clientId && ['Edit'].includes(curveUser?.rights?.[curveUser?.clientId]?.sales)) {
      if (body.ids?.length) {
        SalesFile.bulkRevalidate(body.ids, curveUser, (err) => {
          if (err) {
            res.status(201).json({ message: err.message });
          } else {
            res.status(200).json({ message: 'Bulk revalidation of sales files triggered' });
          }
        });
      } else {
        res.status(500).json({ message: INTERNAL_ERROR });
      }
    } else {
      res.status(403).json({ message: FORBIDDEN_ERROR });
    }
  })

/**
 * @api {post} /salesFiles/:id/revalidate Trigger revalidate task for Sales File
 * @apiGroup salesFiles
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Sales File id
 *
 * @apiSuccess {String} message - Success message
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "message": "File sent for revalidation"
 *  }
 * @apiUse ErrorSalesFileNotFound
 * @apiUse ErrorInternalServerError
 * @apiError (Error 404) NotFound Client could not be found
 * @apiErrorExample {json} NotFound Response:
 *  HTTP/1.1 404 Not Found
 *  {
 *    "message": "Client not found"
 *  }
 */
  .post('/:id/revalidate', parseUrlencoded, (req, res) => {
    const { curveUser, params } = req;
    SalesFile.findById(params.id)
      .then(async (salesFile) => {
        if (!salesFile) {
          res.status(404).json({ message: `Could not find SalesFile with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: salesFile, clientOnly: true })) {
          res.status(403).json({ message: FORBIDDEN_ERROR });
        } else {
          salesFile.createRevalidationTask(1, curveUser, (errSalesFileTask) => {
            if (errSalesFileTask) {
              if (errSalesFileTask.message === 'This sales file cannot be revalidated as it is already in progress') {
                res.status(201).json({ message: errSalesFileTask.message });
              } else {
                logger.error(errSalesFileTask);
                res.status(500).json({ message: INTERNAL_ERROR });
              }
            } else {
              res.status(200).json({ message: 'File sent for revalidation' });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: INTERNAL_ERROR });
      });
  })

  // ---------------------------------------------
  //
  // TODO: this does not seem to be used anymore?
  //
  // ---------------------------------------------
  .post('/:id/ingestion_complete', parseUrlencoded, (req, res) => {
    const { curveUser, params, body } = req;
    SalesFile.findById(params.id)
      .then(async (salesFile) => {
        if (!salesFile) {
          res.status(404).json({ message: `Could not find SalesFile with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: salesFile, clientOnly: true })) {
          res.status(403).json({ message: FORBIDDEN_ERROR });
        } else {
          salesFile.completeMessage = body.result;
          salesFile.units = body.result.units;
          salesFile.validationUnits = body.result.validationUnits;
          salesFile.netAmount = body.result.netAmount;
          salesFile.validationNetAmount = body.result.validationNetAmount;
          salesFile.homeCurrencyNetAmount = body.result.homeCurrencyNetAmount;
          salesFile.lines = body.result.lines;
          salesFile.validationLines = body.result.validationLines;
          salesFile.invalidLines = body.result.invalidLines;
          res.status(200).json({ message: 'Ingestion set to complete' });
          // Set file path
          salesFile.file = body.key;
          salesFile.save()
            .then(() => {
              // Download file and set example lines
              fileManager.getFileSize(body.key, (errGetFileSize, size) => {
                if (size && size < 20000000) {
                  fileManager.downloadFromS3(body.key, process.env.S3_bucket, (errDownload, localFile) => {
                    salesFile.mapTemplateToSalesFile(localFile, (errMapTemplate) => {
                      if (errMapTemplate) {
                        logger.error(errMapTemplate);
                        res.status(500).json({ message: 'Error mapping template to sales file. Sales File is saved but may not be matched to the template' });
                      } else {
                        fs.unlinkSync(localFile);
                        salesFile.save()
                          .then(() => {
                            res.status(200).json({ type: 'Complete', message: 'The file is successfully uploaded' });
                          })
                          .catch((err) => {
                            logger.error(err);
                            res.status(500).json({ message: INTERNAL_ERROR });
                          });
                      }
                    });
                  });
                } else {
                  res.status(200).json({ type: 'Complete', message: 'The file is successfully uploaded' });
                }
              });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: INTERNAL_ERROR });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: INTERNAL_ERROR });
      });
  })

/**
 * @api {get} /salesFiles/:id/ignition_export/ Export (Ignition) Sales File
 * @apiGroup salesFiles
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Sales File id
 *
 * @apiSuccess {String} message - Success message
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "message": "File being prepared to be sent",
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorSalesFileNotFound
 * @apiUse ErrorInternalServerError
 */
  .get('/:id/ignition_export', (req, res) => {
    const { curveUser, params } = req;
    SalesFile.findById(params.id)
      .then(async (foundSalesFile) => {
        if (!foundSalesFile) {
          res.status(404).json({ message: `Could not find SalesFile with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'sales', document: foundSalesFile, clientOnly: true })) {
          res.status(403).json({ message: FORBIDDEN_ERROR });
        } else {
          IgnitionExport(foundSalesFile, curveUser, () => { logger.info('Ignition Export Sent'); });
          // Do not wait for file to be sent for ingestion
          res.status(200).json({ message: 'File being prepared to be sent' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: INTERNAL_ERROR });
      });
  })

  .post('/bulk_edit', parseUrlencoded, async (req, res) => {
    if (!req?.body?.updates) return res.status(400).json({ message: 'No bulk update body found' });
    if (!req.body.updates?.ids || req.body.updates?.ids.length === 0) return res.status(400).json({ message: 'No Sales File ids specified' });

    try {
      // Check User rights to all Sales Files, throw a 403 error if no access to any of the files
      let forbidden = false;
      const batchedFileIds = _.chunk(req.body.updates.ids, 10);
      for (const batch of batchedFileIds) {
        if (forbidden) break;
        const salesFiles = await SalesFile.find({ clientId: req.curveUser.clientId, _id: batch }, 'clientId', { lean: true });
        for (const file of salesFiles) {
          forbidden = await UserAccess.isUserForbidden({
            Payee,
            user: req.curveUser,
            operation: 'write',
            type: 'sales',
            document: file,
            clientOnly: true,
          });
          if (forbidden) break;
        }
      }
      if (forbidden) {
        return res.status(403).json({ message: FORBIDDEN_ERROR });
      }

      await SalesFileController.bulkUpdate({ curveUser: req.curveUser, updates: req.body.updates });
      return res.status(200).json({ message: 'Sales files updated' });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: INTERNAL_ERROR });
    }
  })

  .post('/:id/process_financial_file', async (req, res) => {
    if (!req?.params?.id) return res.status(400).json({ message: 'No Sales File ID specified' });
    try {
      const [salesFile] = await SalesFile.find({ clientId: req.curveUser.clientId, _id: req.params.id }, 'clientId customAdditionalFile', { lean: true });
      if (!salesFile?.customAdditionalFile) {
        return res.status(400).json({ message: 'No Financial File found for the Sales File' });
      }
      const forbidden = await UserAccess.isUserForbidden({
        Payee,
        user: req.curveUser,
        operation: 'read',
        type: 'sales',
        document: salesFile,
        clientOnly: true,
      });
      if (forbidden) {
        return res.status(403).json({ message: FORBIDDEN_ERROR });
      }
      const data = await SalesFileController.processFinancialFile({
        clientId: req.curveUser.clientId,
        salesFileId: salesFile._id,
        financialFileKey: salesFile.customAdditionalFile,
      });
      return res.status(200).json(data);
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: INTERNAL_ERROR });
    }
  })

  .post('/raw-export', async (req, res) => {
    const { curveUser, body } = req;
    const sync = body.sync === true;

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'sales' })) {
      const filter = paramsToFilterField(body.filter || {}, curveUser);

      if (sync) {
        try {
          const result = await CSVRawExport({ curveUser, collectionName: 'salesfiles', filter, sync: true });
          res.status(200).json(result);
        } catch (err) {
          logger.error(err);
          res.status(500).json({ message: 'Export failed', error: err.message });
        }
      } else {
        CSVRawExport({ curveUser, collectionName: 'salesfiles', filter });
        res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
      }
    } else {
      res.status(403).json({ message: FORBIDDEN_ERROR });
    }
  });

function paramsToFilterField(inputParams, user) {
  const params = SalesFile.paramsToFilterField(inputParams, user);
  return applyDateFilters(inputParams, params);
}

module.exports = router;
