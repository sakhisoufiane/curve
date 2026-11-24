const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');

const router = express.Router();
const _ = require('lodash');
const { CSVRawExport } = require('../../libs/mongodb-export');
const { applyDateFilters } = require('../../libs/dateFilters');
const { INTERNAL_ERROR, FORBIDDEN_ERROR } = require('../constants');
const UnmappedTrack = require('../../models/unmappedTrack');
const Track = require('../../models/track');
const Payee = require('../../models/payee');
const UnmappedTrackController = require('../../controllers/unmappedTrack/unmappedTrack');

router
  .get('/', async (req, res) => {
    const { curveUser, query } = req;

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
      const paginationParams = {
        page: Page.valueOrDefault(query.page, 1),
        limit: Page.valueOrDefault(query.limit, 100),
        sort: Page.sortOrDefault(query.orderBy, query.orderDir),
      };
      const result = await UnmappedTrack.paginate(UnmappedTrackController.paramsToFilterField(query, curveUser), paginationParams).catch((err) => {
        logger.error(err);
        res.status(500).json({ message: INTERNAL_ERROR });
      });
      if (result) {
        res.status(200).json({ unmappedTracks: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
      }
    } else {
      res.status(403).json({ message: FORBIDDEN_ERROR });
    }
  })

  .get('/:id/history', async (req, res) => {
    const { curveUser, params } = req;

    const unmappedTrack = await UnmappedTrack.findById(params.id).catch(logger.error);

    if (!unmappedTrack) {
      res.status(404).json({ message: `Could not find UnmappedTrack with ID ${params.id}` });
    } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: unmappedTrack, clientOnly: true })) {
      res.status(403).json({ message: FORBIDDEN_ERROR });
    } else if (unmappedTrack) {
      unmappedTrack.patches.find({ ref: unmappedTrack._id })
        .populate('author', 'email')
        .then((patches) => {
          res.status(200).json({ modelHistory: patches });
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: INTERNAL_ERROR });
        });
    } else {
      res.status(500).json({ message: INTERNAL_ERROR });
    }
  })

  .get('/:id', async (req, res) => {
    const { curveUser, params } = req;

    const unmappedTrack = await UnmappedTrack.findById(params.id).catch(logger.error);

    if (!unmappedTrack) {
      res.status(404).json({ message: `Could not find UnmappedTrack with ID ${params.id}` });
    } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: unmappedTrack, clientOnly: true })) {
      res.status(403).json({ message: FORBIDDEN_ERROR });
    } else if (unmappedTrack) {
      res.status(200).json(unmappedTrack);
    } else {
      res.status(500).json({ message: INTERNAL_ERROR });
    }
  })

  .put('/:id', async (req, res) => {
    const { curveUser, params, body } = req;

    const foundUnmappedTrack = await UnmappedTrack.findById(params.id).catch(logger.error);

    if (!foundUnmappedTrack) {
      res.status(404).json({ message: `Could not find UnmappedTrack with ID ${params.id}` });
    } else if (foundUnmappedTrack) {
      if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundUnmappedTrack, clientOnly: true })) {
        return res.status(403).json({ message: FORBIDDEN_ERROR });
      }
      UnmappedTrack.findByIdAndUpdate(params.id, body, { new: true }).then((unmappedTrack) => {
        unmappedTrack.checkForCompletion(foundUnmappedTrack).then(() => {
          res.status(200).json(unmappedTrack);
        }).catch((err) => {
          logger.error(err);
          res.status(500).json({ message: INTERNAL_ERROR });
        });
      }).catch((err) => {
        logger.error(err);
        res.status(500).json({ message: INTERNAL_ERROR });
      });
    } else {
      res.status(500).json({ message: INTERNAL_ERROR });
    }
  })

  /**
  * @api {post} /unmappedTracksReleases/createTracks Create multiple Tracks from unmapped tracks
  * @apiGroup unmappedTracksReleases
  *
  * @apiUse TokenParams
  * @apiBody {object[]} tracks - Unmapped tracks to import
  *
  * @apiSuccess {json} Success Response
  * @apiSuccessExample {json} Success Response:
  *  HTTP/1.1 200 OK
  *  {
  *    "created": ['620d443dc93571d21e2c527a', '620d443dc93573d21e2c587a'],
  *    "failed": ['6033962f73f953000f5a0655']
  *  }
  *
  * @apiUse ErrorForbidden
  * @apiUse ErrorInternalServerError
  */
  .post('/create_tracks', async (req, res) => {
    if (req.curveUser?.rights?.[req.curveUser?.clientId]?.catalogue !== 'Edit') { return res.status(403).json({ message: FORBIDDEN_ERROR }); }

    const { clientId } = req.curveUser;
    const createdBy = req.curveUser.id;
    const lastModifiedBy = req.curveUser.id;
    const { tracks } = req.body;
    if (!Array.isArray(tracks)) {
      return res.status(500).json({
        message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.',
      });
    }

    Track.createTracks(clientId, createdBy, lastModifiedBy, tracks)
      .then((createdTracks) => {
        res.status(200).json(createdTracks);
      })
      .catch((error) => {
        res.status(500).json({ message: error });
      });
  })
  .post('/export', async (req, res) => {
    const { curveUser, body } = req;
    if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
      return res.status(403).json({ message: FORBIDDEN_ERROR });
    }

    await UnmappedTrackController.exportUnmappedTracks({ curveUser, body }).catch((err) => {
      logger.error(err);
      return res.status(500).json({ message: INTERNAL_ERROR });
    });

    res.status(200).json({ message: 'Export task created' });
  });

router.post('/raw-export', async (req, res) => {
  const { curveUser, body } = req;
  const sync = body.sync === true;

  if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
    return res.status(403).json({ message: FORBIDDEN_ERROR });
  }

  const filter = UnmappedTrackController.paramsToFilterField(body.filter || {}, curveUser);

  if (sync) {
    try {
      const result = await CSVRawExport({
        collectionName: 'unmappedtracks',
        filter,
        curveUser,
        sync: true,
      });
      return res.status(200).json(result);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ message: 'Export failed', error: error.message });
    }
  } else {
    CSVRawExport({ collectionName: 'unmappedtracks', filter, curveUser }).catch((err) => {
      logger.error('Async raw-export failed:', err);
    });
    return res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
  }
});

module.exports = router;
