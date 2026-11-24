const fs = require('fs');
const { logger, fileManager, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('@curveroyaltysystems/models/mongoose').Types;
const _ = require('lodash');
const { Parser } = require('json2csv');
const { throwError } = require('../../libs/errors');
const config = require('../../config.json');

const Import = require('../../models/import');
const ImportPartner = require('../../models/importPartner');
const TerritoryGroup = require('../../models/territoryGroup');
const Client = require('../../models/client');
const User = require('../../models/user');
const Task = require('../../models/task');

const getImportFilter = ({ query, curveUser }) => {
  const params = {};

  if (curveUser.clientId) { params.clientId = curveUser.clientId; }

  if (query.text) {
    const regex = new RegExp(_.escapeRegExp(query.text), 'i');

    if (query.text.length === 24 && ObjectId.isValid(query.text)) {
      params.$or = [{ _id: query.text }, { name: { $regex: regex } }];
    } else {
      params.name = { $regex: regex };
    }
  }

  // Filter by transferring system query parameter
  params.transferringSystem = query.transferringSystem || { $nin: ['CWR', 'Catalogue Shipment'] };

  return params;
};

const messages = {
  processing: 'The file is currently processing, check back shortly',
  errorUploading: 'Error uploading the file',
  errorMapping: 'Error mapping template to Royaltor Rates file. Import File is saved but may not be matched to the template',
  complete: 'The file successfully uploaded',
  errorGeneric: 'Internal error, please try again',
};

const pullMappingValuesFromFile = (req, res, foundImport) => {
  let responded = false;

  setTimeout(() => {
    if (!responded) {
      responded = true;
      res.status(200).json({ type: 'Processing', message: messages.processing });
    }
  }, 30000);

  fileManager.downloadFromS3(req.body.key, process.env.S3_bucket, (error, localFile) => {
    if (error) {
      logger.error(error);
      responded = true;
      return res.status(500).json({ message: messages.errorUploading });
    }
    foundImport.pullMappingValues(localFile, config.counterpointTemplates.royaltorRates, (err) => {
      if (err) {
        logger.error(err);
        responded = true;
        return res.status(500).json({ message: messages.errorMapping });
      }
      fs.unlinkSync(localFile);
      foundImport.save()
        .then(() => {
          if (!responded) {
            responded = true;
            return res.status(200).json({ type: 'Complete', message: messages.complete });
          }
        })
        .catch((err) => {
          logger.error(err);
          responded = true;
          return res.status(500).json({ message: messages.errorGeneric });
        });
    });
  });
};

const pullMappingValuesFromProducts = (req, res, foundImport) => {
  let responded = false;
  setTimeout(() => {
    if (!responded) {
      responded = true;
      res.status(200).json({ type: 'Processing', message: messages.processing });
    }
  }, 30000);

  fileManager.downloadFromS3(req.body.key, process.env.S3_bucket, (error, localFile) => {
    if (error) {
      logger.error(error);
      responded = true;
      return res.status(500).json({ message: messages.errorUploading });
    }
    foundImport.pullMappingValues(localFile, config.counterpointTemplates.royaltorProducts, (err) => {
      if (err) {
        logger.error(err);
        responded = true;
        return res.status(500).json({ message: messages.errorMapping });
      }
      fs.unlinkSync(localFile);
      foundImport.save()
        .then(() => {
          if (!responded) {
            responded = true;
            return res.status(200).json({ type: 'Complete', message: messages.complete });
          }
        })
        .catch((err) => {
          logger.error(err);
          responded = true;
          return res.status(500).json({ message: messages.errorGeneric });
        });
    });
  });
};

const pullMappingValuesFromProductManager = (req, res, foundImport) => {
  let responded = false;

  setTimeout(() => {
    if (!responded) {
      responded = true;
      res.status(200).json({ type: 'Processing', message: messages.processing });
    }
  }, 30000);

  fileManager.downloadFromS3(req.body.key, process.env.S3_bucket, (error, localFile) => {
    if (error) {
      logger.error(error);
      responded = true;
      return res.status(500).json({ message: messages.errorUploading });
    }
    foundImport.pullMappingValues(localFile, config.counterpointTemplates.productManager, (err) => {
      if (err) {
        logger.error(err);
        responded = true;
        return res.status(500).json({ message: messages.errorMapping });
      }
      fs.unlinkSync(localFile);
      foundImport.save()
        .then(() => {
          if (!responded) {
            responded = true;
            return res.status(200).json({ type: 'Complete', message: messages.complete });
          }
        })
        .catch((err) => {
          logger.error(err);
          responded = true;
          return res.status(500).json({ message: messages.errorGeneric });
        });
    });
  });
};

const pullSr1MappingValuesFromFile = (req, res, foundImport) => {
  let responded = false;
  setTimeout(() => {
    if (!responded) {
      responded = true;
      res.status(200).json({ type: 'Processing', message: messages.processing });
    }
  }, 30000);

  fileManager.downloadFromS3(req.body.key, process.env.S3_bucket, (error, localFile) => {
    if (error) {
      logger.error(error);
      responded = true;
      return res.status(500).json({ message: messages.errorUploading });
    }
    foundImport.pullSr1PublishingValues((err) => {
      if (err) {
        logger.error(err);
        responded = true;
        return res.status(500).json({ message: messages.errorMapping });
      }
      fs.unlinkSync(localFile);
      foundImport.save()
        .then(() => {
          if (!responded) {
            responded = true;
            return res.status(200).json({ type: 'Complete', message: messages.complete });
          }
        })
        .catch((err) => {
          logger.error(err);
          responded = true;
          return res.status(500).json({ message: messages.errorGeneric });
        });
    });
  });
};

const cleanRatesValues = (body) => {
  if (body && body.mappings && body.mappings.publishingRates) {
    const result = {};
    Object.keys(body.mappings.publishingRates).forEach((key) => {
      const newKey = key.replace(/\./g, '');
      result[newKey] = body.mappings.publishingRates[key];
    });
    body.mappings.publishingRates = result;
  }
  return body;
};

const getImportPartnerSettings = async ({ importPartnerId }) => {
  const importPartner = await ImportPartner.findById(importPartnerId);

  const { defaults } = importPartner;

  // Lookup territories list from group id if populated
  if (defaults.territoryGroupId) {
    const territoryGroup = await TerritoryGroup.findById(defaults?.territoryGroupId);
    if (territoryGroup) {
      defaults.territories = territoryGroup.territories;
    }
  }

  return {
    territoryGroupId: defaults.territoryGroupId,
    territories: defaults.territories,
    claimingParty: {
      publisherId: defaults.claimingParty?.publisherId,
      contractType: defaults.claimingParty?.contractType,
    },
    setMainIdentifier: defaults.setMainIdentifier,
    setPublisherInterestedParty: defaults.setPublisherInterestedParty,
    setComposerInterestedParty: defaults.setComposerInterestedParty,
    ingestionTerritory: defaults.ingestionTerritory,
    catalogueGroups: defaults.catalogueGroups,
    contracts: defaults.contracts,
  };
};

const validateImportDelete = ({ foundImport }) => {
  const deleteNotAllowed = foundImport.ingestedPayees || foundImport.ingestedContracts || foundImport.ingestedReleases || foundImport.ingestedTracks || foundImport.ingestedWorks || foundImport.ingestedComposers || foundImport.ingestedPublishers;
  if (deleteNotAllowed) throwError({ code: 400, message: 'Import can not be deleted as it has been used to import data' });
};

const startCwrImport = async ({ importId, clientId, userId }) => {
  const [client, user] = await Promise.all([
    Client.findById(clientId, { name: 1 }).lean(),
    User.findById(userId, { email: 1 }).lean(),
  ]);

  if (!client) throw new Error(`Client not found: ${clientId}`);
  if (!user) throw new Error(`User not found: ${userId}`);

  await TaskHelpers.createTaskAndSendMessage(Task, {
    name: 'CWR Import',
    clientId,
    clientName: client.name,
    email: user.email,
    value: { importId },
  });
};

const exportErrors = async ({ curveUser, importId }) => {
  if (!curveUser.clientId) throwError({ code: 403, message: 'Forbidden' });

  const importObj = await Import.findById(importId);
  if (!importObj) throwError({ code: 404, message: `Could not find Import with ID ${importId}` });

  const fields = [{ label: 'Identifier', value: 'identifier' }, { label: 'Title', value: 'title' }, { label: 'Error', value: 'error' }];
  const json2csv = new Parser({ fields });
  const csv = json2csv.parse(importObj.errors);
  return csv;
};

module.exports = {
  getImportFilter,
  pullMappingValuesFromFile,
  pullMappingValuesFromProducts,
  pullMappingValuesFromProductManager,
  pullSr1MappingValuesFromFile,
  cleanRatesValues,
  getImportPartnerSettings,
  validateImportDelete,
  exportErrors,
  startCwrImport,
};
