const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');
const bodyParser = require('body-parser');
const Import = require('../../models/import');
const Payee = require('../../models/payee');
const historyModelUser = require('../../libs/historyModelUser');
const { throwError } = require('../../libs/errors');

const apiHelper = require('../../libs/apiHelper');
const { getImportFilter, pullMappingValuesFromFile, pullMappingValuesFromProducts, pullMappingValuesFromProductManager, pullSr1MappingValuesFromFile, cleanRatesValues, getImportPartnerSettings, validateImportDelete, exportErrors, startCwrImport } = require('../../controllers/import');
const { validateFilename } = require('./validation');

const router = express.Router();
const parseUrlencoded = bodyParser.urlencoded({ extended: false });

router
  .get('/', async (req, res) => {
    const { curveUser, query } = req;

    try {
      if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const paginationParams = apiHelper.getPaginationParams({ query, populate: { path: 'importPartnerId', model: 'ImportPartner', select: 'name' } });
      const result = await Import.paginate(getImportFilter({ query, curveUser }), paginationParams);

      res.status(200).json({ imports: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
    } catch (err) {
      apiHelper.errorHandler(err, res);
    }
  })

  .get('/source_imports', async (req, res) => {
    const { curveUser } = req;

    try {
      if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const imports = await Import.find(
        {
          clientId: curveUser.clientId,
          status: 'Complete',
          'counterpointFiles.publishingCatalogueExport': { $nin: [null, ''] },
        },
        { _id: 1, 'counterpointFiles.publishingCatalogueExport': 1 },
      ).lean();

      const filenames = imports
        .map((imp) => ({
          _id: imp._id,
          filename: imp.counterpointFiles.publishingCatalogueExport.split('/').pop(),
        }))
        .filter((f) => f.filename);

      res.status(200).json({ sourceImports: filenames });
    } catch (err) {
      apiHelper.errorHandler(err, res);
    }
  })

  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;

    Import.findById(params.id)
      .then(async (importObj) => {
        if (!importObj) {
          res.status(404).json({ message: `Could not find Import with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: importObj, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (importObj) {
          importObj.patches
            .find({ ref: importObj._id })
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
        } else {
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id', async (req, res) => {
    const { curveUser, params } = req;

    try {
      const importObj = await Import.findById(params.id).populate('importPartnerId').exec();
      if (!importObj) return res.status(404).json({ message: `Could not find Import with ID ${params.id}` });

      if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: importObj, clientOnly: true })) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      res.status(200).json(importObj);
    } catch (err) {
      apiHelper.errorHandler(err, res);
    }
  })

  .put('/:id', async (req, res) => {
    const { curveUser } = req;

    try {
      req.body = cleanRatesValues(req.body);
      logger.debug(req.body);

      const foundImport = await Import.findById(req.params.id);
      if (!foundImport) {
        return res.status(404).json({ message: `Could not find Import with ID ${req.params.id}` });
      }

      if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundImport, clientOnly: true })) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      if (req.body.transferringSystem === 'CWR') {
        const validationErrors = await validateFilename({ clientId: curveUser.clientId, filename: req.body.pendingFilename, excludeId: req.params.id });
        if (Object.keys(validationErrors).length) return res.status(422).json({ errors: validationErrors });
      }

      const importObj = await Import.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('importPartnerId').exec(); // (err, importObj) => {
      res.status(200).json(importObj);
    } catch (err) {
      apiHelper.errorHandler(err, res);
    }
  })

  .put('/:id/get_upload_credentials/:type', (req, res) => {
    const { curveUser, params, body } = req;

    if (!body?.filename) { return res.status(400).json({ errors: ['Requires a file to be uploaded'] }); }

    Import.findById(params.id)
      .then(async (foundImport) => {
        if (!foundImport) {
          res.status(500).json({ message: `Could not find Import with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundImport, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (foundImport) {
          // Get upload credentials
          fileManager.getUploaderCredentials(`imports/${foundImport._id.toString()}/${params.type}/`, body, (data) => {
            data.completePath = `/imports/${foundImport._id.toString()}/upload_complete/${params.type}`;
            logger.info(data);
            res.status(200).jsonp(data);
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .put('/:id/files_validation', (req, res) => {
    const { curveUser, params } = req;

    Import.findById(params.id)
      .then(async (foundImport) => {
        if (!foundImport) {
          // Should be 404 here no? Unless we are obfuscating the fact that the import doesn't exist
          res.status(500).json({ message: 'Internal error, please try again' });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundImport, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } if (foundImport.transferringSystem === 'Counterpoint Recordings') {
          foundImport.recordsFilesValidation((errors) => {
            res.status(200).json({ errors });
          });
        } else if (foundImport.transferringSystem === 'Counterpoint Publishing' || foundImport.transferringSystem === 'Linked Publishing' || foundImport.transferringSystem === 'Catalogue Shipment') {
          foundImport.publishingFilesValidation((errors) => {
            res.status(200).json({ errors });
          });
        } else if (foundImport.transferringSystem === 'SR1 Publishing') {
          foundImport.sr1PublishingFilesValidation((errors) => {
            res.status(200).json({ errors });
          });
        } else {
          res.status(200).json();
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .put('/:id/upload_complete/:type', (req, res) => {
    const { curveUser, params, body } = req;

    if (!body?.key) {
      return res.status(400).json({ errors: ['Requires a key to be supplied'] });
    }

    Import.findById(params.id)
      .then(async (foundImport) => {
        if (!foundImport) {
          res.status(500).json({ message: `Could not find Import with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundImport, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (foundImport) {
          // Set file path
          foundImport.counterpointFiles[params.type] = body.key;
          foundImport.save()
            .then(() => {
              try {
                if (params.type === 'royaltorRatesFile') {
                  pullMappingValuesFromFile(req, res, foundImport);
                } else if (params.type === 'royaltorProductsFile') {
                  pullMappingValuesFromProducts(req, res, foundImport);
                } else if (params.type === 'productManagerFile') {
                  pullMappingValuesFromProductManager(req, res, foundImport);
                } else if (foundImport.transferringSystem === 'SR1 Publishing' && params.type === 'publishingCatalogueExport') {
                  pullSr1MappingValuesFromFile(req, res, foundImport);
                } else {
                  res.status(200).json({ type: 'Complete', message: 'The file is successfully uploaded' });
                }
              } catch (err) { logger.error(err); }
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

  .put('/:id/start_ingestion', async (req, res) => {
    const { curveUser, params } = req;

    const importPartnerSupportedSystems = ['CWR', 'Catalogue Shipment'];

    try {
      const foundImport = await Import.findById(params.id);

      if (!foundImport) return res.status(404).json({ message: `Could not find Import with ID ${params.id}` });

      if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundImport, clientOnly: true })) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // Copy Import Partner settings to Import defaults
      if (importPartnerSupportedSystems.includes(foundImport.transferringSystem)) {
        const importSettings = await getImportPartnerSettings({ importPartnerId: foundImport.importPartnerId.toString() });
        foundImport.defaults = importSettings;
      }

      foundImport.status = 'Importing';
      await foundImport.save();

      switch (foundImport.transferringSystem) {
        case 'Counterpoint Recordings':
          foundImport.runImport(curveUser);
          break;
        case 'Counterpoint Publishing':
        case 'Linked Publishing':
          foundImport.runPublishingImport(curveUser);
          break;
        case 'SR1 Publishing':
          foundImport.runSr1PublishingImport(curveUser);
          break;
        case 'CWR':
          await startCwrImport({ importId: foundImport._id.toString(), clientId: curveUser.clientId, userId: curveUser.id });
          break;
        case 'Maestro 400 Catalogue Shipment':
          foundImport.runCsImport(curveUser);
          break;
        case 'Catalogue Shipment':
          foundImport.runCatalogueShipmentImport(curveUser);
          break;
        default:
          break;
      }

      res.status(200).json({ message: 'Your Ingestion Is Running' });
    } catch (err) {
      apiHelper.errorHandler(err, res);
    }
  })

  .delete('/:id', async (req, res) => {
    const { curveUser, params } = req;

    try {
      const foundImport = await Import.findById(params.id).catch(logger.error);
      if (!foundImport) { return res.status(404).json({ message: `Could not find Import with ID ${params.id}` }); }

      if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundImport, clientOnly: true })) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      validateImportDelete({ foundImport });

      const importObj = await Import.findByIdAndDelete(params.id);
      if (!importObj) {
        return res.status(404).json({ message: `Could not find Import with ID ${params.id}` });
      }

      res.status(200).json(importObj);
    } catch (err) {
      apiHelper.errorHandler(err, res);
    }
  })

  .post('/', parseUrlencoded, async (req, res) => {
    const { curveUser, body } = req;

    try {
      body.clientId = curveUser.clientId;

      if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      if (body.transferringSystem === 'CWR') {
        const validationErrors = await validateFilename({ clientId: curveUser.clientId, filename: body.pendingFilename });
        if (Object.keys(validationErrors).length) return res.status(422).json({ errors: validationErrors });
      }

      const importObj = new Import(body);
      await importObj.save();
      await Import.populate(importObj, { path: 'importPartnerId' });

      res.status(200).json(importObj);
    } catch (err) {
      apiHelper.errorHandler(err, res);
    }
  })

  .get('/:id/export_errors', async (req, res) => {
    const { curveUser, params } = req;

    try {
      if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
        throwError({ code: 403, message: 'Forbidden' });
      }

      const csv = await exportErrors({ curveUser, importId: params.id });
      res.header('Content-Type', 'text/csv');
      res.attachment(`Import Errors ${params.id}.csv`);
      return res.send(csv);
    } catch (err) {
      apiHelper.errorHandler(err, res);
    }
  });

module.exports = router;
