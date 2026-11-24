const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Projection, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');
const bodyParser = require('body-parser');
const appRootDir = require('app-root-dir').get();
const multer = require('multer');
const historyModelUser = require('../../libs/historyModelUser');
const SalesItemHelpers = require('../../libs/salesItemHelpers');
const Track = require('../../models/track');
const UnmappedTrack = require('../../models/unmappedTrack');
const TrackController = require('../../controllers/track');
const Payee = require('../../models/payee');
const { updateCatalogueIdentifiers } = require('../../processes/updateCatalogueIdentifiers/updateCatalogueIdentifiers');
const { CSVRawExport } = require('../../libs/mongodb-export');

const router = express.Router();
const parseUrlencoded = bodyParser.urlencoded({ extended: true, limit: '50mb', parameterLimit: 100000 });

const storage = multer.diskStorage({
  destination(req, file, cb) { cb(null, `${appRootDir}/tmp/`); },
  filename(req, file, cb) { cb(null, `${Date.now()}-${file.originalname}`); },
});

const upload = multer({ storage });

router
  .get('/', async (req, res) => {
    const { query, curveUser } = req;

    if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue', allowPayee: true })) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    try {
      const result = await TrackController.searchTracks({ query, curveUser });
      res.status(200).json({ tracks: result?.docs, meta: { currentPage: result?.currentPage, totalPages: result?.totalPages, total: result?.total } });
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Internal error, please try again' });
    }
  })

  .post('/load-tracks-for-release', async (req, res) => {
    const { curveUser, body } = req;
    const query = body;
    if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue', allowPayee: true })) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    TrackController.searchTracks({ query, curveUser }).then((result) => {
      res.status(200).json({ tracks: result?.docs, meta: { currentPage: result?.currentPage, totalPages: result?.totalPages, total: result?.total } });
    }).catch((err) => {
      logger.error(err);
      res.status(500).json({ message: 'Internal error, please try again' });
    });
  })

  .post('/export', async (req, res) => {
    const { curveUser, query, body } = req;
    const exportTemplateVersion = query.exportTemplateVersion ? query.exportTemplateVersion : 'v1';
    if (curveUser.clientId) {
      if (body.ids?.length) {
        Track.sendExport({ clientId: curveUser.clientId, _id: { $in: body.ids } }, curveUser, exportTemplateVersion);
      } else {
        Track.sendExport(await TrackController.paramsToFilterField(body.filter, curveUser), curveUser, exportTemplateVersion);
      }
      res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .post('/raw-export', async (req, res) => {
    const { curveUser, body } = req;
    const sync = body.sync === true;

    if (curveUser.clientId) {
      const filter = body.ids?.length
        ? { clientId: curveUser.clientId, _id: { $in: body.ids } }
        : await TrackController.paramsToFilterField(body.filter || {}, curveUser);

      if (sync) {
        try {
          const result = await CSVRawExport({ curveUser, collectionName: 'tracks', filter, sync: true });
          res.status(200).json(result);
        } catch (err) {
          logger.error(err);
          res.status(500).json({ message: 'Export failed', error: err.message });
        }
      } else {
        CSVRawExport({ curveUser, collectionName: 'tracks', filter });
        res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
      }
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;
    Track.findById(params.id)
      .then(async (track) => {
        if (!track) {
          res.status(404).json({ message: `Could not find Track with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: track, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          track.patches.find({ ref: track._id })
            .populate('author', 'email')
            .then((patches) => {
              historyModelUser.addModifiedBy(patches, (err, patches) => {
                res.status(200).json({ modelHistory: patches });
              });
            })
            .catch((err) => {
              logger.error(err);
              res.status(404).json({ message: `Could not find Track Patch with track ID ${track._id}` });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find Track with ID ${params.id}` });
      });
  })
  .get('/:id', (req, res) => {
    const { curveUser, params } = req;
    Track.findById(params.id)
      .select(Projection.getFields('track', 'editPage'))
      .then(async (track) => {
        if (!track) {
          res.status(404).json({ message: `Could not find Track with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: track, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          // Format the populated contractIds on sales/costs rights to keep the original contractId field.
          track = await Track.formatPopulatedRights(track);
          res.status(200).json(track);
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find Track with ID ${params.id}` });
      });
  })

  .get('/:id/releases', (req, res) => {
    const { curveUser, params } = req;
    Track.findById(params.id)
      .populate('createdBy', 'email')
      .populate('lastModifiedBy', 'email')
      .then(async (track) => {
        if (!track) {
          res.status(404).json({ message: `Could not find Release with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: track, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          track.getReleases((err, releases) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            } else {
              logger.debug('Tracks:', releases);
              res.status(200).json({ releases });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find Release with ID ${params.id}` });
      });
  })

  .put('/:id/add_alias', (req, res) => {
    const { curveUser, params, body } = req;
    Track.findById(params.id)
      .then(async (track) => {
        if (!track) {
          res.status(404).json({ message: `Could not find Track with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: track, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          if (body.aliases) { track.aliases = track.aliases.concat(body.aliases); }
          if (body.alias) { track.aliases.push(body.alias); }
          track.lastModifiedBy = curveUser.id;
          track.save()
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
        res.status(404).json({ message: `Could not find Track with ID ${params.id}` });
      });
  })
  .put('/:id', (req, res) => {
    const { curveUser, params, body } = req;
    Track.findById(params.id, Projection.getFields('track', 'editPage'))
      .then(async (foundTrack) => {
        if (!foundTrack) {
          res.status(404).json({ message: `Could not find Track with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundTrack, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (foundTrack) {
          delete body.clientId;
          // eslint-disable-next-line guard-for-in
          for (const i in body) { foundTrack[i] = body[i]; }
          foundTrack.lastModifiedBy = curveUser.id;
          foundTrack.save()
            .then(async (track) => {
              // Format the populated contractIds on sales/costs rights to keep the original contractId field.
              track = await Track.formatPopulatedRights(track);
              res.status(200).json(track);
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.message });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find Track with ID ${params.id}` });
      });
  })

  .delete('/', (req, res) => {
    const { curveUser, body } = req;
    if (curveUser.clientId && ['Edit'].includes(curveUser?.rights?.[curveUser?.clientId]?.catalogue)) {
      if (body.ids && body.ids.length > 0) {
        const params = {
          clientId: curveUser.clientId,
          idsToTest: body.ids,
          deletionType: body.type || 'multi',
          salesFilterField: 'trackId',
          costsFilterField: 'trackIds',
          logLabel: 'Track',
        };
        SalesItemHelpers.checkDataBeforeDelete(Track, params, (err, status, result) => {
          if (err) {
            return res.status(500).json({
              message: 'Internal error, please try again or contact support',
            });
          }
          if (status === 201) {
            const response = (params.deletionType === 'multi') ? `Some or all of these tracks are attached to ${result} which will need to be deleted first` : result;
            res.status(201).json(response);
          } else {
            res.status(200).json(result);
          }
        });
      } else {
        res.status(404).json({ message: 'Could not find Tracks' });
      }
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .post('/', parseUrlencoded, async (req, res) => {
    const { curveUser, body } = req;
    body.clientId = curveUser.clientId;
    body.createdBy = curveUser.id;
    body.lastModifiedBy = curveUser.id;
    const track = new Track(body);
    if (curveUser.clientId && !await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: track, clientOnly: true })) {
      track.save()
        .then(async (newTrack) => {
          if (body.unmappedTrackId) {
            const unmappedTrack = await UnmappedTrack.findById(body.unmappedTrackId).catch(logger.error);

            if (unmappedTrack) {
              unmappedTrack.trackId = track._id.toString();
              unmappedTrack.complete = true;
              await unmappedTrack.save().catch(logger.error);
            }
          }
          res.status(200).json(track);
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: err.message });
        });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

/**
     * @api {post} /tracks/create_many Create multiple Tracks
     * @apiGroup tracks
     *
     * @apiUse TokenParams
     * @apiBody {object[]} tracks - Tracks to create
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

  .post('/create_many', (req, res) => {
    TrackController.createManyTracks(req).then((data) => {
      res.status(data.status).json(data.response);
    }).catch((error) => {
      logger.error(error);
      res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
    });
  })

  .post('/import', upload.single('file'), (req, res) => {
    const { curveUser, query, file } = req;
    if (!file) { return res.status(400).json({ errors: ['Requires a file to be uploaded'] }); }
    const overwriteBlanks = query.overwriteBlanks === 'true';
    const importTemplateVersion = query.importTemplateVersion ? query.importTemplateVersion : 'v1';
    if (curveUser.clientId && ['Edit'].includes(curveUser?.rights?.[curveUser?.clientId]?.catalogue)) {
      if (importTemplateVersion !== 'v2') {
        Track.importFromExcel(file, curveUser, overwriteBlanks);
      } else {
        Track.importFromExcelNew(file, curveUser, overwriteBlanks, importTemplateVersion);
      }
      res.status(200).json({ message: 'Tracks are importing, and a report will be sent to you shortly.' });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })
  .post('/updateIsrc', upload.single('file'), async (req, res) => {
    const { curveUser, file } = req;
    if (!file) { return res.status(400).json({ errors: ['Requires a file to be uploaded'] }); }
    if (curveUser.internal) {
      updateCatalogueIdentifiers({ clientId: curveUser.clientId, file, catalogueName: 'Tracks', curveUser });
      res.status(200).json({ message: "We're updating the ISRC, a report will be sent to you shortly." });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .post('/add_bulk_aliases', parseUrlencoded, (req, res) => {
    TrackController.addBulkAliases(req).then((data) => {
      res.status(data.status).json(data.response);
    }).catch((error) => {
      logger.error(error);
      res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
    });
  });

module.exports = router;
