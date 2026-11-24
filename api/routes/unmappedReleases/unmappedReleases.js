const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');

const router = express.Router();
const { CSVRawExport } = require('../../libs/mongodb-export');
const { INTERNAL_ERROR, FORBIDDEN_ERROR } = require('../constants');
const UnmappedRelease = require('../../models/unmappedRelease');
const Release = require('../../models/release');
const Payee = require('../../models/payee');
const UnmappedReleaseController = require('../../controllers/unmappedRelease/unmappedRelease');

router
  .get('/', async (req, res) => {
    const { curveUser, query } = req;

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
      const paginationParams = {
        page: Page.valueOrDefault(query.page, 1),
        limit: Page.valueOrDefault(query.limit, 100),
        sort: Page.sortOrDefault(query.orderBy, query.orderDir),
      };
      const result = await UnmappedRelease.paginate(UnmappedReleaseController.paramsToFilterField(query, curveUser), paginationParams).catch((err) => {
        logger.error(err);
        res.status(500).json({ message: INTERNAL_ERROR });
      });
      if (result) {
        res.status(200).json({ unmappedReleases: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
      }
    } else {
      res.status(403).json({ message: FORBIDDEN_ERROR });
    }
  })

  .get('/:id/history', async (req, res) => {
    const { curveUser, params } = req;

    const unmappedRelease = await UnmappedRelease.findById(params.id).catch(logger.error);

    if (!unmappedRelease) {
      res.status(404).json({ message: `Could not find UnmappedRelease with ID ${params.id}` });
    } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: unmappedRelease, clientOnly: true })) {
      res.status(403).json({ message: FORBIDDEN_ERROR });
    } else if (unmappedRelease) {
      unmappedRelease.patches.find({ ref: unmappedRelease._id })
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

    const unmappedRelease = await UnmappedRelease.findById(params.id).catch(logger.error);

    if (!unmappedRelease) {
      res.status(404).json({ message: `Could not find UnmappedRelease with ID ${params.id}` });
    } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: unmappedRelease, clientOnly: true })) {
      res.status(403).json({ message: FORBIDDEN_ERROR });
    } else if (unmappedRelease) {
      res.status(200).json(unmappedRelease);
    } else {
      res.status(500).json({ message: INTERNAL_ERROR });
    }
  })

  .put('/:id', async (req, res) => {
    const { curveUser, params, body } = req;

    const foundUnmappedRelease = await UnmappedRelease.findById(params.id).catch(logger.error);

    if (!foundUnmappedRelease) {
      res.status(404).json({ message: `Could not find UnmappedRelease with ID ${params.id}` });
    } else if (foundUnmappedRelease) {
      if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundUnmappedRelease, clientOnly: true })) {
        return res.status(403).json({ message: FORBIDDEN_ERROR });
      }

      UnmappedRelease.findByIdAndUpdate(params.id, body, { new: true }).then((unmappedRelease) => {
        unmappedRelease.checkForCompletion(foundUnmappedRelease).then(() => {
          res.status(200).json(unmappedRelease);
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
  * @api {post} /unmappedTracksReleases/createWorks Create multiple Works from unmapped works
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
  .post('/create_releases', async (req, res) => {
    if (req.curveUser?.rights?.[req.curveUser?.clientId]?.catalogue !== 'Edit') { return res.status(403).json({ message: FORBIDDEN_ERROR }); }

    const { clientId } = req.curveUser;
    const createdBy = req.curveUser.id;
    const lastModifiedBy = req.curveUser.id;
    const { releases } = req.body;

    if (!Array.isArray(releases)) {
      return res.status(500).json({
        message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.',
      });
    }

    Release.createReleases(clientId, createdBy, lastModifiedBy, releases)
      .then((createReleases) => {
        res.status(200).json(createReleases);
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

    await UnmappedReleaseController.exportUnmappedReleases({ curveUser, body }).catch((err) => {
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

  const filter = UnmappedReleaseController.paramsToFilterField(body.filter || {}, curveUser);

  if (sync) {
    try {
      const result = await CSVRawExport({ curveUser, collectionName: 'unmappedreleases', filter, sync: true });
      return res.status(200).json(result);
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: 'Export failed', error: err.message });
    }
  } else {
    CSVRawExport({ curveUser, collectionName: 'unmappedreleases', filter });
    return res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
  }
});

module.exports = router;
