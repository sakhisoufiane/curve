const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');
const _ = require('lodash');
const bodyParser = require('body-parser');
const multer = require('multer');
const appRootDir = require('app-root-dir').get();
const { ObjectId } = require('@curveroyaltysystems/models/mongoose').Types;
const { BULK_SPLITS_RECORD_TYPE } = require('../libs/enums/bulkSplits');

const parseUrlencoded = bodyParser.urlencoded({ extended: false });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, `${appRootDir}/tmp/`);
  },
  filename(req, file, cb) {
    cb(null, `bulk_splits_import_${Date.now()}_${file.originalname}`);
  },
});

const upload = multer({ storage });

const Client = require('../models/client');
const Payee = require('../models/payee');
const Release = require('../models/release');
const TrackController = require('../controllers/track');
const { validateClient, validateFile } = require('../libs/validation');
const { bulkSplitsService } = require('../libs/splits');

const {
  mainController,
  exportsController,
  importController,
} = require('../controllers/fugav2');

const {
  getWhiteLabelStatements,
  getWhiteLabelStatement,
  formatRelease,
  createPayee,
  formatPayees,
  getPayeeStatus,
  getPayeeAssociatedTracks,
  getPayeeAssociatedReleases,
  deletePayee,
  updateTrackErrorToFugaId,
  getPeriods,
  getPeriod,
  getPeriodStatements,
  getStatement,
  publishAllStatements,
  emailAllStatements,
  emailSummary,
  updateBlockedStatus,
  getClientStatements,
  upsertTracks,
  getTrack,
  upsertReleases,
  getBulkSplitsById,
  getBulkSplits,
} = mainController;

const { exportTracks } = exportsController;
const { importTracks } = importController;

const router = express.Router();

router
  // White Label
  .get('/suborg/:subOrgId/statements', async (req, res) => {
    try {
      if (!UserAccess.allowReadAccessToAll({ user: req.curveUser, type: 'periods' })) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const { clientId } = req.curveUser;
      const { subOrgId } = req.params;
      const statements = await getWhiteLabelStatements({ clientId, subOrgId, query: req.query });
      res.status(200).json(statements);
    } catch (err) {
      logger.error(err);
      res.status(err.code || 500).json({ code: err.cause, message: err.message, details: err.details });
    }
  })

  .get('/suborg/:subOrgId/statements/:id', async (req, res) => {
    try {
      if (!UserAccess.allowReadAccessToAll({ user: req.curveUser, type: 'periods' })) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const { clientId } = req.curveUser;
      const { subOrgId } = req.params;
      const statement = await getWhiteLabelStatement({ clientId, subOrgId, statementId: req.params.id });
      res.status(200).json(statement);
    } catch (err) {
      logger.error(err);
      res.status(err.code || 500).json({ code: err.cause, message: err.message, details: err.details });
    }
  })

  // Splits - Payees
  .get('/payees', async (req, res) => {
    const { clientId } = req.curveUser;
    if (!clientId || !ObjectId.isValid(clientId)) {
      return res.status(400).json({ code: 'INVALID_CLIENT_ID', message: 'Valid organisation ID required' });
    }

    if (!UserAccess.allowReadAccessToAll({ user: req.curveUser, type: 'contracts' })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Check client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(400).json({ code: 'CLIENT_NOT_FOUND', message: 'Organisation not found' });
    }

    const filter = { clientId };
    const paginationParams = {
      page: Page.valueOrDefault(req.query.page, 1),
      limit: Page.valueOrDefault(req.query.limit, 25),
      sort: Page.sortOrDefault(req.query.orderBy, req.query.orderDir),
      select: req.query.select || null,
    };
    Payee.paginate(filter, paginationParams, async (err, result) => {
      if (err) {
        logger.error(err);
        return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Error in getting Payees' });
      }
      const payees = await formatPayees(result.docs);
      res.status(200).json({
        payees,
        meta: {
          currentPage: paginationParams.page,
          totalPages: result.totalPages,
          total: result.totalDocs,
        },
      });
    });
  })

  .get('/payees/search', async (req, res) => {
    const { clientId } = req.curveUser;
    if (!clientId || !ObjectId.isValid(clientId)) {
      return res.status(400).json({ code: 'INVALID_CLIENT_ID', message: 'Valid organisation ID required' });
    }

    // Check client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(400).json({ code: 'CLIENT_NOT_FOUND', message: 'Organisation not found' });
    }

    if (!UserAccess.allowReadAccessToAll({ user: req.curveUser, type: 'contracts' })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // TODO: Switch this for typeahead
    const regex = new RegExp(_.escapeRegExp(req.query.text), 'i');
    const filter = { clientId, name: regex };
    const paginationParams = {
      page: Page.valueOrDefault(req.query.page, 1),
      limit: Page.valueOrDefault(req.query.limit, 25),
      sort: Page.sortOrDefault(req.query.orderBy, req.query.orderDir),
      select: req.query.select || null,
    };
    Payee.paginate(filter, paginationParams, async (err, result) => {
      if (err) {
        logger.error(err);
        return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Error in getting Payees' });
      }
      const payees = await formatPayees(result.docs);
      res.status(200).json({
        payees,
        meta: {
          currentPage: paginationParams.page,
          totalPages: result.totalPages,
          total: result.totalDocs,
        },
      });
    });
  })

  .get('/payees/:id', async (req, res) => {
    const { clientId } = req.curveUser;
    if (!clientId || !ObjectId.isValid(clientId)) {
      return res.status(400).json({ code: 'INVALID_CLIENT_ID', message: 'Valid organisation ID required' });
    }
    // Check client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ code: 'CLIENT_NOT_FOUND', message: 'Organisation not found' });
    }
    if (!req.params.id) {
      return res.status(400).json({ code: 'FIELDS_REQUIRED', message: 'Payee ID required' });
    }
    Payee.findById(req.params.id)
      .then(async (payee) => {
        if (!payee) {
          return res.status(404).json({ code: 'PAYEE_NOT_FOUND', message: `Payee not found with ID ${req.params.id}` });
        }
        if (payee.clientId !== clientId) {
          return res.status(403).json({ code: 'FORBIDDEN', message: 'Forbidden' });
        }

        if (await UserAccess.isUserForbidden({ Payee, user: req.curveUser, operation: 'read', type: 'contracts', document: payee, adminOnly: true, payeeOnly: true })) {
          return res.status(403).json({ message: 'Forbidden' });
        }

        const payeeStatus = await getPayeeStatus(payee);
        return res.status(200).json({
          _id: payee._id,
          name: payee.name,
          email: payee.email,
          associatedTracks: payeeStatus.tracks,
          associatedReleases: payeeStatus.releases,
          status: payeeStatus.status,
          createdAt: payee.createdAt,
          updatedAt: payee.updatedAt,
        });
      })
      .catch((err) => {
        logger.error(err);
        return res.status(500).json({ code: 'PAYEE_NOT_FOUND', message: 'Error finding Payee' });
      });
  })

  .put('/payees/:id', parseUrlencoded, async (req, res) => {
    const { clientId } = req.curveUser;
    if (!clientId || !ObjectId.isValid(clientId)) {
      return res.status(400).json({ code: 'INVALID_CLIENT_ID', message: 'Valid organisation ID required' });
    }
    // Check client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(400).json({ code: 'CLIENT_NOT_FOUND', message: 'Organisation not found' });
    }
    if (!req.params.id) {
      return res.status(400).json({ code: 'FIELDS_REQUIRED', message: 'Payee ID required' });
    }
    Payee.findById(req.params.id)
      .then(async (payee) => {
        if (!payee) {
          return res.status(404).json({ code: 'PAYEE_NOT_FOUND', message: `Payee not found with ID ${req.params.id}` });
        }
        if (payee.clientId !== clientId) {
          return res.status(403).json({ code: 'FORBIDDEN', message: 'Forbidden' });
        }

        if (await UserAccess.isUserForbidden({ Payee, user: req.curveUser, operation: 'write', type: 'contracts', document: payee, adminOnly: true, payeeOnly: true })) {
          return res.status(403).json({ message: 'Forbidden' });
        }

        const duplicatePayee = await Payee.findOne({ clientId, name: req.body.name }).select('_id');
        // Note: needs to first test if a duplicate exists then the comparison - don't shorten with ?
        if (duplicatePayee && duplicatePayee._id.toString() !== payee._id.toString()) {
          return res.status(409).json({ code: 'DUPLICATE_PAYEE_NAME', message: 'Payee name already exists' });
        }

        // Update payee details - only allow the update of the name currently
        if (req.body.name) {
          payee.name = req.body.name;
        }
        // Save payee
        payee.save()
          .then(async () => {
            const payeeStatus = await getPayeeStatus(payee);
            return res.status(200).json({
              _id: payee._id,
              name: payee.name,
              email: payee.email,
              associatedTracks: payeeStatus.tracks,
              associatedReleases: payeeStatus.releases,
              status: payeeStatus.status,
              createdAt: payee.createdAt,
              updatedAt: payee.updatedAt,
            });
          })
          .catch((saveErr) => {
            logger.error(saveErr);
            return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Error saving Payee' });
          });
      })
      .catch((err) => {
        logger.error(err);
        return res.status(500).json({ code: 'PAYEE_NOT_FOUND', message: 'Error finding Payee' });
      });
  })

  .delete('/payees/:id', async (req, res) => {
    const { clientId } = req.curveUser;
    if (!clientId || !ObjectId.isValid(clientId)) {
      return res.status(400).json({ code: 'INVALID_CLIENT_ID', message: 'Valid organisation ID required' });
    }
    // Check client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ code: 'CLIENT_NOT_FOUND', message: 'Organisation not found' });
    }
    if (!req.params.id) {
      return res.status(400).json({ code: 'FIELDS_REQUIRED', message: 'Payee ID required' });
    }
    Payee.findById(req.params.id)
      .then(async (payee) => {
        if (!payee) {
          return res.status(404).json({ code: 'PAYEE_NOT_FOUND', message: `Payee not found with ID ${req.params.id}` });
        }
        if (payee.clientId !== clientId) {
          return res.status(403).json({ code: 'FORBIDDEN', message: 'Forbidden' });
        }

        if (await UserAccess.isUserForbidden({ Payee, user: req.curveUser, operation: 'write', type: 'contracts', document: payee, adminOnly: true, payeeOnly: true })) {
          return res.status(403).json({ message: 'Forbidden' });
        }

        // Update payee details - only allow the update of the name currently
        const output = await deletePayee(payee);
        if (output?.status) {
          res.status(200).json({ message: output.message });
        } else {
          return res.status(500).json({ code: 'PAYEE_IN_USE', message: output.message, details: { trackIds: output.trackIds, releaseIds: output.releaseIds } });
        }
      })
      .catch((err) => {
        logger.error(err);
        return res.status(404).json({ code: 'PAYEE_NOT_FOUND', message: 'Error finding Payee' });
      });
  })

  .get('/payees/:id/tracks', async (req, res) => {
    const { clientId } = req.curveUser;
    if (!clientId || !ObjectId.isValid(clientId)) {
      return res.status(400).json({ code: 'INVALID_CLIENT_ID', message: 'Valid organisation ID required' });
    }
    // Check client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ code: 'CLIENT_NOT_FOUND', message: 'Organisation not found' });
    }
    if (!req.params.id) {
      return res.status(400).json({ code: 'FIELDS_REQUIRED', message: 'Payee ID required' });
    }

    if (!UserAccess.allowReadAccessToAll({ user: req.curveUser, type: 'catalogue', allowPayee: true })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const paginationParams = {
      page: Page.valueOrDefault(req.query.page, 1),
      limit: Page.valueOrDefault(req.query.limit, 25),
      sort: { _id: -1 },
    };

    Payee.findById(req.params.id)
      .then(async (payee) => {
        if (!payee) {
          return res.status(404).json({ code: 'PAYEE_NOT_FOUND', message: `Payee not found with ID ${req.params.id}` });
        }
        if (payee.clientId !== clientId) {
          return res.status(403).json({ code: 'FORBIDDEN', message: 'Forbidden' });
        }

        if (await UserAccess.isUserForbidden({ Payee, user: req.curveUser, operation: 'read', type: 'catalogue', document: payee, adminOnly: true, payeeOnly: true })) {
          return res.status(403).json({ message: 'Forbidden' });
        }

        const { tags, excludeTags } = req.query;
        getPayeeAssociatedTracks(payee, { tags, excludeTags }, paginationParams).then((data) => {
          res.status(200).json(data);
        }).catch((err) => {
          logger.error(err);
          res.status(500).json({ code: 'INTERNAL_ERROR', message: `Error getting Tracks for Payee ID: ${payee._id}` });
        });
      })
      .catch((err) => {
        logger.error(err);
        return res.status(404).json({ code: 'PAYEE_NOT_FOUND', message: 'Error finding Payee' });
      });
  })

  .get('/payees/:id/releases', async (req, res) => {
    const { clientId } = req.curveUser;
    if (!clientId || !ObjectId.isValid(clientId)) {
      return res.status(400).json({ code: 'INVALID_CLIENT_ID', message: 'Valid organisation ID required' });
    }
    // Check client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ code: 'CLIENT_NOT_FOUND', message: 'Organisation not found' });
    }
    if (!req.params.id) {
      return res.status(400).json({ code: 'FIELDS_REQUIRED', message: 'Payee ID required' });
    }
    if (!UserAccess.allowReadAccessToAll({ user: req.curveUser, type: 'catalogue', allowPayee: true })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    Payee.findById(req.params.id)
      .then(async (payee) => {
        if (!payee) {
          return res.status(404).json({ code: 'PAYEE_NOT_FOUND', message: `Payee not found with ID ${req.params.id}` });
        }
        if (payee.clientId !== clientId) {
          return res.status(403).json({ code: 'FORBIDDEN', message: 'Forbidden' });
        }
        if (await UserAccess.isUserForbidden({ Payee, user: req.curveUser, operation: 'read', type: 'catalogue', document: payee, adminOnly: true, payeeOnly: true })) {
          return res.status(403).json({ message: 'Forbidden' });
        }

        const releases = await getPayeeAssociatedReleases(payee, req.query.limit, req.query.offset);
        return res.status(200).json({ releases });
      })
      .catch((err) => {
        logger.error(err);
        return res.status(404).json({ code: 'PAYEE_NOT_FOUND', message: 'Error finding Payee' });
      });
  })

  .post('/payees', parseUrlencoded, async (req, res) => {
    try {
      const payee = await createPayee({ curveUser: req.curveUser, newPayee: req.body });
      return res.status(200).json({ _id: payee._id, name: payee.name, email: payee.email, createdAt: payee.createdAt, updatedAt: payee.updatedAt });
    } catch (err) {
      logger.error(err);
      return res.status(err.code || 500).json({ code: err.cause, message: err.message, details: err.details });
    }
  })

  // Splits - Catalogue
  .get('/tracks/:id', async (req, res) => {
    try {
      const { curveUser } = req;
      if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue', allowPayee: true })) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      if (!req.params.id) {
        return res.status(400).json({ code: 'FIELDS_REQUIRED', message: 'Track ID required' });
      }

      const trackId = ObjectId.isValid(req.params.id) ? req.params.id : null;
      const fugaId = !ObjectId.isValid(req.params.id) ? req.params.id : null;
      const track = await getTrack({ curveUser, trackId, fugaId });

      res.status(200).json(track);
    } catch (err) {
      logger.error(err);
      res.status(err.code || 500).json({ code: err.cause, message: err.message, details: err.details });
    }
  })

  .get('/bulkSplitsExport', async (req, res) => {
    try {
      const { query, curveUser } = req;
      if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue', allowPayee: false })) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const client = await Client.findById(curveUser.clientId);
      if (!client) {
        return res.status(404).json({ code: 'CLIENT_NOT_FOUND', message: 'Organisation not found' });
      }
      logger.info(`Starting bulk splits export for user ${curveUser.id}`);

      const result = await TrackController.searchTracks({
        query,
        curveUser,
        usePagination: false,
        selectFields: { _id: 1 }, // Get only ids to minimize memory consumption !
      });

      const totalCount = result?.docs?.length;
      if (totalCount === 0) {
        return res.status(200).json({
          totalCount: 0,
          message: 'Could not find any tracks matching the search criteria.',
        });
      }

      const bulkSplitsRecord = await bulkSplitsService.createRecord({
        curveUser,
        type: BULK_SPLITS_RECORD_TYPE.EXPORT,
        query,
      });

      setImmediate(async () => {
        const trackIds = result?.docs?.map((track) => track._id) || [];
        exportTracks({ trackIds, curveUser, bulkSplitsId: bulkSplitsRecord._id, client });
      });

      res.status(200).json({
        message: `Processing ${totalCount} tracks.`,
        bulkSplitsId: bulkSplitsRecord._id,
        totalCount,
      });
    } catch (error) {
      logger.error(error);
      res.status(error.code || 500).json({ code: error.cause, message: error.message });
    }
  })

  .post('/bulkSplitsImport', upload.single('file'), async (req, res) => {
    try {
      const { curveUser, query } = req;

      await validateClient(curveUser.clientId);

      if (!UserAccess.allowWriteAccessToAll({ user: curveUser, type: 'catalogue', allowPayee: false })) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      validateFile(req.file, ['.csv']);

      logger.info(`Starting bulk splits import for user ${curveUser.id}, file: ${req.file.originalname}`);

      const client = await Client.findById(curveUser.clientId);
      if (!client) {
        return res.status(404).json({ code: 'CLIENT_NOT_FOUND', message: 'Organisation not found' });
      }

      const bulkSplitsRecord = await bulkSplitsService.createRecord({
        curveUser,
        type: BULK_SPLITS_RECORD_TYPE.IMPORT,
        query,
      });

      setImmediate(async () => {
        logger.info(`Processing import file: ${req.file.path}`);
        importTracks({
          file: req.file,
          curveUser,
          client,
          bulkSplitsId: bulkSplitsRecord._id,
        });
      });

      res.status(200).json({
        message: `Processing import file: ${req.file.originalname}`,
        bulkSplitsId: bulkSplitsRecord._id,
        fileName: req.file.originalname,
      });
    } catch (err) {
      logger.error(err);
      res.status(err.code || 500).json({ code: err.cause, message: err.message, details: err.details });
    }
  })

  .post('/tracks', parseUrlencoded, async (req, res) => {
    try {
      const track = await upsertTracks({ curveUser: req.curveUser, trackData: req.body });
      return res.status(200).json(track);
    } catch (err) {
      if (err.message.includes('ISRC')) {
        const updateErrorMessage = await updateTrackErrorToFugaId(err.message);
        return res.status(err.code || 500).json({ code: 'DUPLICATE_ISRC', message: updateErrorMessage });
      }

      return res.status(err.code || 500).json({ code: err.cause || 'INTERNAL_ERROR', message: err.message, details: err.details });
    }
  })

  .get('/releases/:id', async (req, res) => {
    const { clientId } = req.curveUser;
    if (!clientId || !ObjectId.isValid(clientId)) {
      return res.status(400).json({ code: 'INVALID_CLIENT_ID', message: 'Valid organisation ID required' });
    }
    // Check client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ code: 'CLIENT_NOT_FOUND', message: 'Organisation not found' });
    }
    if (!req.params.id) {
      return res.status(400).json({ code: 'FIELDS_REQUIRED', message: 'Release ID required' });
    }
    Release.findOne({ clientId, fugaId: req.params.id })
      .then(async (release) => {
        if (!release) {
          return res.status(404).json({ code: 'RELEASE_NOT_FOUND', message: `Release not found with ID ${req.params.id}` });
        }
        if (release.clientId !== clientId) {
          return res.status(403).json({ code: 'FORBIDDEN', message: 'Forbidden' });
        }
        if (await UserAccess.isUserForbidden({ Payee, user: req.curveUser, operation: 'read', type: 'catalogue', document: release, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        }

        const output = await formatRelease(release);
        return res.status(200).json(output);
      })
      .catch((err) => {
        logger.error(err);
        return res.status(404).json({ code: 'RELEASE_NOT_FOUND', message: 'Error finding Release' });
      });
  })

  .post('/releases', parseUrlencoded, async (req, res) => {
    try {
      const release = await upsertReleases({ curveUser: req.curveUser, releaseData: req.body });
      return res.status(200).json(release);
    } catch (err) {
      if (err.message.includes('ISRC')) {
        const updateErrorMessage = await updateTrackErrorToFugaId(err.message);
        return res.status(err.code || 500).json({ code: err.cause || 'ITEM06', message: updateErrorMessage });
      }

      return res.status(err.code || 400).json({ code: err.cause || 'ITEM05', message: err.message, details: err.details });
    }
  })

  // Splits - Periods
  .get('/periods', async (req, res) => {
    try {
      if (!UserAccess.allowReadAccessToAll({ user: req.curveUser, type: 'periods' })) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const { clientId } = req.curveUser;
      const { periods, meta } = await getPeriods({ clientId, query: req.query });
      res.status(200).json({ periods, meta });
    } catch (err) {
      logger.error(err);
      res.status(err.code || 500).json({ code: err.cause, message: err.message, details: err.details });
    }
  })

  .get('/periods/:id', async (req, res) => {
    try {
      const { clientId } = req.curveUser;
      const { id: periodId } = req.params;
      const period = await getPeriod({ clientId, periodId, curveUser: req.curveUser });
      res.status(200).json(period);
    } catch (err) {
      logger.error(err);
      res.status(err.code || 500).json({ code: err.cause, message: err.message, details: err.details });
    }
  })

  .get('/periods/:id/statements', async (req, res) => {
    try {
      const { clientId } = req.curveUser;
      const { id: periodId } = req.params;
      const { statements, meta } = await getPeriodStatements({ clientId, periodId, query: req.query, curveUser: req.curveUser });
      res.status(200).json({ statements, meta });
    } catch (err) {
      logger.error(err);
      res.status(err.code || 500).json({ code: err.cause, message: err.message, details: err.details });
    }
  })

  .get('/client/statements/:id', async (req, res) => {
    try {
      if (!UserAccess.allowReadAccessToAll({ user: req.curveUser, type: 'periods' })) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const { clientId } = req.curveUser;
      const { id: statementId } = req.params;
      const statement = await getStatement({ clientId, statementId, query: req.query, curveUser: req.curveUser });
      res.status(200).json(statement);
    } catch (err) {
      logger.error(err);
      res.status(err.code || 500).json({ code: err.cause, message: err.message, details: err.details });
    }
  })

  .post('/periods/:id/publish_all_statements', async (req, res) => {
    try {
      if (!UserAccess.allowReadAccessToAll({ user: req.curveUser, type: 'periods' })) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const { clientId } = req.curveUser;
      const { id: periodId } = req.params;
      await publishAllStatements({ clientId, periodId, curveUser: req.curveUser });
      res.status(200).json({ message: 'Statements have all been published and sent to payees.' });
    } catch (err) {
      logger.error(err);
      res.status(err.code || 500).json({
        code: err.cause || 'STATEMENTS_PUBLISHING_FAILED',
        message: err.message,
        details: err.details,
      });
    }
  })

  .post('/periods/:id/email_all_statements', async (req, res) => {
    try {
      if (!UserAccess.allowReadAccessToAll({ user: req.curveUser, type: 'periods' })) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const { clientId } = req.curveUser;
      const { id: periodId } = req.params;
      const { emailAddresses } = req.body;
      await emailAllStatements({ clientId, periodId, emailAddresses, curveUser: req.curveUser });
      res.status(200).json({ message: 'The statements will be sent to you shortly.' });
    } catch (err) {
      logger.error(err);
      res.status(err.code || 500).json({
        code: err.cause || 'EMAIL_SENDING_FAILED',
        message: err.message,
        details: err.details,
      });
    }
  })

  .post('/periods/:id/email_summary', async (req, res) => {
    try {
      if (!UserAccess.allowReadAccessToAll({ user: req.curveUser, type: 'periods' })) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const { clientId } = req.curveUser;
      const { id: periodId } = req.params;
      const { emailAddresses } = req.body;
      await emailSummary({ clientId, periodId, emailAddresses, curveUser: req.curveUser });
      res.status(200).json({ message: 'The file will be sent to you shortly.' });
    } catch (err) {
      logger.error(err);
      res.status(err.code || 500).json({
        code: err.cause || 'EMAIL_SENDING_FAILED',
        message: err.message,
        details: err.details,
      });
    }
  })

  .put('/periods/:id', async (req, res) => {
    try {
      const { clientId } = req.curveUser;
      const { id: periodId } = req.params;
      const { blockedStatus, message } = req.body;
      const period = await updateBlockedStatus({ clientId, periodId, blockedStatus, curveUser: req.curveUser, message });
      res.status(200).json(period);
    } catch (err) {
      logger.error(err);
      res.status(err.code || 500).json({
        code: err.cause || 'EMAIL_SENDING_FAILED',
        message: err.message,
        details: err.details,
      });
    }
  })

  .get('/client/statements', async (req, res) => {
    try {
      if (!UserAccess.allowReadAccessToAll({ user: req.curveUser, type: 'periods' })) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const { clientId } = req.curveUser;
      const { statements, meta } = await getClientStatements({ clientId, query: req.query });
      res.status(200).json({ statements, meta });
    } catch (err) {
      logger.error(err);
      res.status(err.code || 500).json({ code: err.cause, message: err.message });
    }
  })

  .get('/bulkSplits/:id', async (req, res) => {
    try {
      const { curveUser } = req;
      const { id: bulkJobId } = req.params;

      if (!bulkJobId || !ObjectId.isValid(bulkJobId)) {
        return res.status(400).json({
          message: 'Valid bulk job ID required',
          details: { missingFields: ['bulkJobId'] },
          code: 'FIELDS_REQUIRED',
        });
      }

      if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue', allowPayee: false })) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const bulkJob = await getBulkSplitsById({ id: bulkJobId, clientId: curveUser.clientId });

      if (!bulkJob) {
        return res.status(404).json({
          message: `Bulk job with id: ${bulkJobId} not found`,
          code: 'BULK_JOB_NOT_FOUND',
        });
      }

      res.status(200).json(bulkJob);
    } catch (err) {
      logger.error(err);
      res.status(err.code || 500).json({ code: err.cause, message: err.message, details: err.details });
    }
  })

  .get('/bulkSplits', async (req, res) => {
    try {
      const { curveUser } = req;

      if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue', allowPayee: false })) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const { bulkSplits, meta } = await getBulkSplits({ clientId: curveUser.clientId, query: req.query });
      res.status(200).json({ bulkSplits, meta });
    } catch (err) {
      logger.error(err);
      res.status(err.code || 500).json({ code: err.cause, message: err.message, details: err.details });
    }
  });

module.exports = router;
