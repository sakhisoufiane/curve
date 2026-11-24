const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('mongodb');
const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const appRootDir = require('app-root-dir').get();
const multer = require('multer');
const historyModelUser = require('../../libs/historyModelUser');
const Composer = require('../../models/composer');
const Payee = require('../../models/payee');
const ComposerController = require('../../controllers/composer');
const Contract = require('../../models/contract');
const getDuplicates = require('../../libs/duplicates/getDuplicates');
const getAvailableValuesFromComposers = require('../../libs/duplicates/getAvailableValuesFromDocs');
const getLinkedDataForOptions = require('../../libs/duplicates/getLinkedDataForOptions');
const getWorksControlledCount = require('../../libs/duplicates/getWorksControlledCount');
const { applyDateFilters } = require('../../libs/dateFilters');
const { CSVRawExport } = require('../../libs/mongodb-export');
const { removeLeadingZeros } = require('../../libs/helpers');

const parseUrlencoded = bodyParser.urlencoded({ extended: false });
const router = express.Router();

const storage = multer.diskStorage({
  destination(req, file, cb) { cb(null, `${appRootDir}/tmp/`); },
  filename(req, file, cb) { cb(null, `${Date.now()}-${file.originalname}`); },
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
      Composer.paginate(paramsToFilterField(query, curveUser), paginationParams, (err, result) => {
        if (err) {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        } else {
          res.status(200).json({ composers: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
        }
      });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/duplicates', async (req, res) => {
    const { curveUser, query } = req;

    try {
      if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) return res.status(403).json({ message: 'Forbidden' });

      const composers = await getDuplicates('composer', curveUser.clientId, query);
      res.json(composers);
    } catch (e) {
      logger.error(e);
      res.status(500).json({ message: 'Internal error, please try again' });
    }
  })

  .post('/export', (req, res) => {
    const { curveUser, body } = req;
    if (curveUser.clientId && ['View', 'Edit'].includes(curveUser.rights?.[curveUser.clientId]?.catalogue)) {
      if (body && body.clientType && body.clientType !== '') {
        if (body.ids && body.ids.length !== 0) {
          Composer.sendExport({ clientId: curveUser.clientId, _id: { $in: body.ids } }, body.clientType, curveUser);
        } else {
          Composer.sendExport(paramsToFilterField(body.filter, curveUser), body.clientType, curveUser);
        }
        res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
      } else {
        res.status(500).json({ message: 'Internal error, please try again' });
      }
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .post('/raw-export', async (req, res) => {
    const { curveUser, body } = req;
    const sync = body.sync === true;

    if (curveUser.clientId && ['View', 'Edit'].includes(curveUser.rights?.[curveUser.clientId]?.catalogue)) {
      const filter = body.ids?.length
        ? { clientId: curveUser.clientId, _id: { $in: body.ids } }
        : paramsToFilterField(body.filter || {}, curveUser);

      if (sync) {
        try {
          const result = await CSVRawExport({ curveUser, collectionName: 'composers', filter, sync: true });
          res.status(200).json(result);
        } catch (err) {
          logger.error(err);
          res.status(500).json({ message: 'Export failed', error: err.message });
        }
      } else {
        CSVRawExport({ curveUser, collectionName: 'composers', filter });
        res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
      }
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;

    Composer.findById(params.id)
      .then(async (composer) => {
        if (!composer) {
          res.status(404).json({ message: `Could not find Composer with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: composer, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          composer.patches.find({ ref: composer._id })
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
        res.status(404).json({ message: `Could not find Composer with ID ${params.id}` });
      });
  })

  .get('/:id', (req, res) => {
    const { curveUser, params } = req;

    Composer.findById(params.id)
      .then(async (composer) => {
        if (!composer) {
          res.status(404).json({ message: `Could not find Composer with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: composer, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          composer = await Composer.formatPopulatedRights(composer);
          res.status(200).json(composer);
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find Composer with ID ${params.id}` });
      });
  })

  .put('/:id', (req, res) => {
    const { curveUser, params, body } = req;

    Composer.findById(params.id)
      .then(async (foundComposer) => {
        if (!foundComposer) {
          res.status(404).json({ message: `Could not find Composer with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundComposer, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (foundComposer) {
          delete body.clientId;
          // eslint-disable-next-line guard-for-in
          for (const i in body) { foundComposer[i] = body[i]; }
          foundComposer.lastModifiedBy = curveUser.id;
          // Remove mainPro, mechanicalPro, performancePro & syncPro if not present in the data
          if (!body.mainPro) { foundComposer.mainPro = null; }
          if (!body.mechanicalPro) { foundComposer.mechanicalPro = null; }
          if (!body.performancePro) { foundComposer.performancePro = null; }
          if (!body.syncPro) { foundComposer.syncPro = null; }
          // Update Composer Record
          foundComposer.save()
            .then(async (composer) => {
              composer = await Composer.formatPopulatedRights(composer);
              res.status(200).json(composer);
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.message });
            });
        }
      })
      .catch((composerFindErr) => {
        logger.error(composerFindErr);
        res.status(404).json({ message: `Could not find Composer with ID ${params.id}` });
      });
  })

  /**
   * @api {delete} /composers Delete single or bulk Composers
   * @apiGroup composers
   *
   * @apiUse TokenParams
   * @apiBody {String[]} ids - Composer IDs to delete
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
   * @apiError NotFound Could not find Composer with ID
   * @apiErrorExample {json} NotFound Response:
   *  HTTP/1.1 404 NotFound
   *  {
   *    message: "Could not find Composers"
   *  }
   * @apiErrorExample {json} ComposerAttachedToWork Response:
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
    if (!body.ids?.length) return res.status(404).json({ message: 'Could not find Composers' });
    try {
      const { code, message } = await ComposerController.deleteComposers({
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
    const composer = new Composer(body);

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: composer, clientOnly: true })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    composer.save()
      .then(async (composer) => {
        res.status(200).json(composer);
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: err.message });
      });
  })

  .post('/import', parseUrlencoded, upload.single('file'), async (req, res) => {
    const { curveUser, body, file } = req;

    const overwriteBlanks = req.query.overwriteBlanks === 'true';

    if (!file) { return res.status(400).json({ errors: ['Requires a file to be uploaded'] }); }

    if (curveUser?.rights?.[curveUser?.clientId]?.catalogue !== 'Edit') { return res.status(403).json({ message: 'Forbidden' }); }

    if (body?.clientType !== 'Publisher') {
      Composer.importMechanicalFromExcel(file, curveUser, overwriteBlanks);
      res.status(200).json({ message: 'Composers are importing, and a report will be sent to you shortly.' });
    } else {
      Composer.importFromExcel(file, curveUser, overwriteBlanks);
      res.status(200).json({ message: 'Composers are importing, and a report will be sent to you shortly.' });
    }
  })

  .post('/duplicates/merge', async (req, res) => {
    try {
      const { curveUser, body } = req;

      if (curveUser?.rights?.[curveUser?.clientId]?.catalogue !== 'Edit') { return res.status(403).json({ message: 'Forbidden' }); }

      const errors = ComposerController.validateDuplicateMergeBody(body);
      if (errors.length) {
        return res.status(400).json({ errors });
      }

      let primaryComposer = await Composer.findOne({ _id: new ObjectId(req.body.primaryComposerId), clientId: curveUser.clientId });
      if (!primaryComposer) {
        return res.status(400).json({ message: 'Primary composer not found' });
      }

      let contracts = [];

      if (body.data.linkedContracts?.length) {
        contracts = await Contract.find({ clientId: primaryComposer.clientId, _id: { $in: body.data.linkedContracts.map(({ contractId }) => contractId) } });
        if (contracts.length !== body.data.linkedContracts.length) {
          return res.status(400).json({ message: 'Invalid contracts found' });
        }
      }

      if (body.deleteComposerIds?.length) {
        const totalComposersToDelete = await Composer.countDocuments({ clientId: curveUser.clientId, _id: { $in: body.deleteComposerIds.map((id) => new ObjectId(id)) } });
        if (totalComposersToDelete !== body.deleteComposerIds.length) {
          return res.status(400).json({ message: 'Invalid composer ids found for deletion' });
        }
      }

      primaryComposer = await ComposerController.setPrimaryComposerData(primaryComposer, body);

      if (body.deleteComposerIds?.length) {
        await ComposerController.findAndReplaceExistingComposerIds(primaryComposer, body.deleteComposerIds);
        await ComposerController.removeComposers(curveUser.clientId, body.deleteComposerIds);

        // Remove the deleted IDs
        primaryComposer.potentialDuplicates = primaryComposer.potentialDuplicates.filter(({ composerId }) => !req.body.deleteComposerIds.includes(composerId.toString()));
        await primaryComposer.save();
      }

      res.json({ message: 'Composers are merged' });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ message: 'There was an issue. Please try again' });
    }
  })

  .post('/duplicates/overview', async (req, res) => {
    const { curveUser, body } = req;
    try {
      if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) return res.status(403).json({ message: 'Forbidden' });
      const { primaryComposerId, duplicateComposers } = body;

      const composerIds = duplicateComposers.map((composer) => composer.id);

      if (!primaryComposerId) return res.status(400).json({ message: 'Please provide a primary composer id' });

      const primaryComposer = await Composer.findOne({ clientId: curveUser.clientId, _id: primaryComposerId });
      if (!primaryComposer) return res.status(400).json({ message: 'Please provide a valid primary composer id' });

      const composers = await Composer.find({ clientId: curveUser.clientId, _id: { $in: composerIds } });

      if (composers.length !== composerIds.length) {
        const missingComposers = composerIds.filter(
          (id) => !composers.some((composer) => composer._id.toString() === id),
        );
        return res.status(400).json({ message: `The following composer IDs do not exist: ${missingComposers.join(', ')}` });
      }

      const selectedComposers = composers
        .filter(({ _id }) => {
          const composer = duplicateComposers.find(({ id, selected }) => id === _id.toString() && selected);
          return composer;
        })
        // Ensure the Primary Composer is always first in this list so the default values are based on the users selection
        .sort((a, b) => {
          if (a._id.toString() === primaryComposerId) return -1;
          if (b._id.toString() === primaryComposerId) return 1;
          return 0;
        });

      const options = getAvailableValuesFromComposers('composer', selectedComposers);
      const optionsWithData = await getLinkedDataForOptions(curveUser.clientId, options);
      const worksCount = await getWorksControlledCount('composer', curveUser.clientId, composers);

      const transformedPublishers = composers.map((composer) => composer.toObject()).map((composer) => {
        const id = composer._id.toString();
        composer.worksCount = worksCount[id] || { controlled: 0, unControlled: 0 };
        return composer;
      });
      return res.json({ composers: transformedPublishers, options: optionsWithData });
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
    params.$or = [{ name: { $regex: regex } }, { interestedPartyId: { $regex: regex } }, { cae: { $regex: caeRegex } }];
    if (inputParams.text.length === 24 && ObjectId.isValid(inputParams.text)) {
      params.$or.push({ _id: inputParams.text });
    }
  }
  return applyDateFilters(inputParams, params);
}

module.exports = router;
