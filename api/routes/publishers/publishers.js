const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('mongodb');
const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const appRootDir = require('app-root-dir').get();
const multer = require('multer');
const historyModelUser = require('../../libs/historyModelUser');
const CatalogueItemHelpers = require('../../libs/catalogueItemHelpers');
const Publisher = require('../../models/publisher');
const Payee = require('../../models/payee');
const { CSVRawExport } = require('../../libs/mongodb-export');
const PublisherController = require('../../controllers/publisher');
const Contract = require('../../models/contract');
const getDuplicates = require('../../libs/duplicates/getDuplicates');
const getAvailableValuesFromComposers = require('../../libs/duplicates/getAvailableValuesFromDocs');
const getLinkedDataForOptions = require('../../libs/duplicates/getLinkedDataForOptions');
const getWorksControlledCount = require('../../libs/duplicates/getWorksControlledCount');
const { removeLeadingZeros } = require('../../libs/helpers');

const parseUrlencoded = bodyParser.urlencoded({ extended: false });
const router = express.Router();

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

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
      const paginationParams = {
        page: Page.valueOrDefault(query.page, 1),
        limit: Page.valueOrDefault(query.limit, 25),
        sort: Page.sortOrDefault(query.orderBy, query.orderDir),
        select: 'name foreignId cae controlled linkedContracts createdAt updatedAt',
        populate: { path: 'linkedContracts.contractId', model: 'Contract', select: 'name' },
      };
      Publisher.paginate(paramsToFilterField(query, curveUser), paginationParams, (err, result) => {
        if (err) {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        } else {
          res.status(200).json({
            publishers: result.docs,
            meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs },
          });
        }
      });
    } else {
      return res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/duplicates', async (req, res) => {
    const { curveUser, query } = req;

    try {
      if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) return res.status(403).json({ message: 'Forbidden' });

      const publishers = await getDuplicates('publisher', curveUser.clientId, query);
      res.json(publishers);
    } catch (e) {
      logger.error(e);
      res.status(500).json({ message: 'Internal error, please try again' });
    }
  })

  .post('/export', (req, res) => {
    const { curveUser, body } = req;

    if (!curveUser.clientId || !body.clientType) { return res.status(403).json({ message: 'Forbidden' }); }

    if (body?.ids?.length) {
      Publisher.sendExport({ _id: { $in: body.ids } }, body.clientType, curveUser);
    } else {
      Publisher.sendExport(paramsToFilterField(body.filter, curveUser), body.clientType, curveUser);
    }
    res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
  })

  .post('/raw-export', async (req, res) => {
    const { curveUser, body } = req;
    const sync = body.sync === true;

    if (!curveUser.clientId || !body.clientType) { return res.status(403).json({ message: 'Forbidden' }); }

    const filter = body?.ids?.length
      ? { clientId: curveUser.clientId, _id: { $in: body.ids } }
      : paramsToFilterField(body.filter || {}, curveUser);

    if (sync) {
      try {
        const result = await CSVRawExport({ curveUser, collectionName: 'publishers', filter, sync: true });
        return res.status(200).json(result);
      } catch (error) {
        logger.error(error);
        return res.status(500).json({ message: 'Export failed', error: error.message });
      }
    } else {
      CSVRawExport({ curveUser, collectionName: 'publishers', filter }).catch((err) => {
        logger.error('Async raw-export failed:', err);
      });
      return res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
    }
  })

  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;
    Publisher.findById(params.id)
      .then(async (publisher) => {
        if (!publisher) {
          res.status(404).json({ message: `Could not find Publisher with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: publisher, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (publisher) {
          publisher.patches
            .find({ ref: publisher._id })
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
        res.status(404).json({ message: `Could not find Publisher with ID ${params.id}` });
      });
  })

  .get('/:id', (req, res) => {
    const { curveUser, params } = req;
    Publisher.findById(params.id)
      .then(async (publisher) => {
        if (!publisher) {
          res.status(404).json({ message: `Could not find Publisher with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: publisher, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (publisher) {
          publisher = await Publisher.formatPopulatedRights(publisher);
          res.status(200).json(publisher);
        } else {
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .put('/:id', (req, res) => {
    const { curveUser, params, body } = req;
    Publisher.findById(params.id)
      .then(async (foundPublisher) => {
        if (!foundPublisher) {
          res.status(404).json({ message: `Could not find Publisher with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundPublisher, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (foundPublisher) {
          delete body.clientId;
          // eslint-disable-next-line guard-for-in
          for (const i in body) {
            foundPublisher[i] = body[i];
          }
          foundPublisher.lastModifiedBy = curveUser.id;
          // Remove mainPro, mechanicalPro, performancePro & syncPro if not present in the data
          if (!body.mainPro) { foundPublisher.mainPro = null; }
          if (!body.mechanicalPro) { foundPublisher.mechanicalPro = null; }
          if (!body.performancePro) { foundPublisher.performancePro = null; }
          if (!body.syncPro) { foundPublisher.syncPro = null; }
          // Update Publisher Record
          foundPublisher.save()
            .then(async (publisher) => {
              publisher = await Publisher.formatPopulatedRights(publisher);
              res.status(200).json(publisher);
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.message });
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

  /**
   * @api {delete} /publishers Delete single or bulk Publishers
   * @apiGroup publishers
   *
   * @apiUse TokenParams
   * @apiBody {String[]} ids - Publisher IDs to delete
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
   * @apiError NotFound Could not find Publisher with ID
   * @apiErrorExample {json} NotFound Response:
   *  HTTP/1.1 404 NotFound
   *  {
   *    message: "Could not find Publishers"
   *  }
   * @apiErrorExample {json} PublisherAttachedToWork Response:
   *  HTTP/1.1 201 Created
   *  [
   *    {
   *      title: 'Work Title',
   *      link: 'works/61376be268ecbc20f2f97952/edit'
   *    }
   *  ]
   */
  .delete('/', async (req, res) => {
    const { curveUser, body } = req;
    if (!curveUser.clientId || !['Edit'].includes(curveUser.rights?.[curveUser.clientId]?.catalogue)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (!body.ids?.length) return res.status(404).json({ message: 'Could not find Publishers' });
    try {
      const { code, message } = await PublisherController.deletePublishers({
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
    body.clientId = curveUser.clientId;
    body.createdBy = curveUser.id;
    body.lastModifiedBy = curveUser.id;
    // if no territories selected on creation, remove territories property. This will result in all territories to be added on save
    if (Array.isArray(body.territories) && body.territories.length === 0) {
      delete body.territories;
    }
    const publisher = new Publisher(body);

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: publisher, clientOnly: true })) {
      res.status(403).json({ message: 'Forbidden' });
    } else {
      publisher.save()
        .then((publisher) => {
          res.status(200).json(publisher);
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: err.message });
        });
    }
  })

  .post('/import', upload.single('file'), (req, res) => {
    const overwriteBlanks = req.query.overwriteBlanks === 'true';
    if (req.curveUser.clientId && req.file && (!req.curveUser.rights || !req.curveUser.rights[req.curveUser.clientId] || req.curveUser.rights[req.curveUser.clientId].catalogue === 'Edit')) {
      if (req.body && req.body.clientType && req.body.clientType !== 'Publisher') {
        Publisher.importMechanicalFromExcel(req.file, req.curveUser, overwriteBlanks);
        res.status(200).json({ message: 'Publishers are importing, and a report will be sent to you shortly.' });
      } else {
        Publisher.importFromExcel(req.file, req.curveUser, overwriteBlanks);
        res.status(200).json({ message: 'Publishers are importing, and a report will be sent to you shortly.' });
      }
    } else if (req.curveUser.clientId && !req.file) {
      res.status(400).json({ errors: ['Requires a file to be uploaded'] });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })
  .post('/duplicates/merge', async (req, res) => {
    try {
      const { curveUser, body } = req;

      if (curveUser?.rights?.[curveUser?.clientId]?.catalogue !== 'Edit') { return res.status(403).json({ message: 'Forbidden' }); }

      const errors = PublisherController.validateDuplicateMergeBody(body);
      if (errors.length) {
        return res.status(400).json({ errors });
      }

      let primaryPublisher = await Publisher.findOne({ _id: new ObjectId(req.body.primaryPublisherId), clientId: curveUser.clientId });
      if (!primaryPublisher) {
        return res.status(400).json({ message: 'Primary publisher not found' });
      }

      let contracts = [];

      if (body.data.linkedContracts?.length) {
        contracts = await Contract.find({ clientId: primaryPublisher.clientId, _id: { $in: body.data.linkedContracts.map(({ contractId }) => contractId) } });
        if (contracts.length !== body.data.linkedContracts.length) {
          return res.status(400).json({ message: 'Invalid contracts found' });
        }
      }

      if (body.deletePublisherIds?.length) {
        const totalComposersToDelete = await Publisher.countDocuments({ clientId: curveUser.clientId, _id: { $in: body.deletePublisherIds.map((id) => new ObjectId(id)) } });
        if (totalComposersToDelete !== body.deletePublisherIds.length) {
          return res.status(400).json({ message: 'Invalid publisher ids found for deletion' });
        }
      }

      primaryPublisher = await PublisherController.setPrimaryPublisherData(primaryPublisher, body)
        .catch((err) => {
          logger.error('Error setting primary Publisher data:', err);
          throw err;
        });

      if (body.deletePublisherIds?.length) {
        await PublisherController.findAndReplaceExistingPublisherIds(primaryPublisher, body.deletePublisherIds);
        await PublisherController.removePublishers(curveUser.clientId, body.deletePublisherIds);

        // Remove the deleted IDs
        primaryPublisher.potentialDuplicates = primaryPublisher.potentialDuplicates.filter(({ publisherId }) => !req.body.deletePublisherIds.includes(publisherId.toString()));
        await primaryPublisher.save();
      }

      res.json({ message: 'Publishers are merged' });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ message: 'There was an issue. Please try again' });
    }
  })
  .post('/duplicates/overview', async (req, res) => {
    const { curveUser, body } = req;
    try {
      if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) return res.status(403).json({ message: 'Forbidden' });
      const { primaryPublisherId, duplicatePublishers } = body;

      const publisherIds = duplicatePublishers.map((composer) => composer.id);

      if (!primaryPublisherId) return res.status(400).json({ message: 'Please provide a primary publisher id' });

      const primaryPublisher = await Publisher.findOne({ clientId: curveUser.clientId, _id: primaryPublisherId });
      if (!primaryPublisher) return res.status(400).json({ message: 'Please provide a valid primary publisher id' });

      const publishers = await Publisher.find({ clientId: curveUser.clientId, _id: { $in: publisherIds } });

      if (publishers.length !== publisherIds.length) {
        const missingPublishers = publisherIds.filter(
          (id) => !publishers.some((publisher) => publisher._id.toString() === id),
        );
        return res.status(400).json({ message: `The following publisher IDs do not exist: ${missingPublishers.join(', ')}` });
      }

      const selectedPublishers = publishers
        .filter(({ _id }) => {
          const publisher = duplicatePublishers.find(({ id, selected }) => id === _id.toString() && selected);
          return publisher;
        })
      // Ensure the Primary Publisher is always first in this list so the default values are based on the users selection
        .sort((a, b) => {
          if (a._id.toString() === primaryPublisherId) return -1;
          if (b._id.toString() === primaryPublisherId) return 1;
          return 0;
        });

      const options = getAvailableValuesFromComposers('publisher', selectedPublishers);
      const optionsWithData = await getLinkedDataForOptions(curveUser.clientId, options);
      const worksCount = await getWorksControlledCount('publisher', curveUser.clientId, publishers);
      const transformedPublishers = publishers.map((publisher) => publisher.toObject()).map((publisher) => {
        const id = publisher._id.toString();
        publisher.worksCount = worksCount[id] || { controlled: 0, unControlled: 0 };
        return publisher;
      });

      return res.json({ publishers: transformedPublishers, options: optionsWithData });
    } catch (e) {
      logger.error(e);
      return res.status(500).json({ message: 'Internal error, please try again' });
    }
  });

function paramsToFilterField(inputParams, user) {
  const params = {};
  if (user.clientId) { params.clientId = user.clientId; }
  if (inputParams.ids) { params._id = { $in: inputParams.ids.map((id) => new ObjectId(id)) }; }
  if (inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
    const caeRegex = new RegExp(_.escapeRegExp(removeLeadingZeros({ value: inputParams.text })), 'i');
    params.$or = [{ name: { $regex: regex } }, { aliases: { $regex: regex } }, { interestedPartyId: { $regex: regex } }, { cae: { $regex: caeRegex } }];
    if (inputParams.text.length === 24 && ObjectId.isValid(inputParams.text)) {
      params.$or.push({ _id: inputParams.text });
    }
  }
  return params;
}

module.exports = router;
