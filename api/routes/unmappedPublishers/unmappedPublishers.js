const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');

const router = express.Router();
const { INTERNAL_ERROR, FORBIDDEN_ERROR } = require('../constants');
const UnmappedPublisher = require('../../models/unmappedPublisher');
const UnmappedPublisherController = require('../../controllers/unmappedPublisher');

/**
 * @api {get} /unmappedPublishers Get unmapped publishers
 * @apiGroup unmappedPublishers
 *
 * @apiUse TokenParams
 * @apiQuery {String} [salesFileId] Filter by sales file ID
 * @apiQuery {Boolean} [complete] Filter by completion status (true/false)
 * @apiQuery {String} [text] Text search against publisher name
 * @apiQuery {Number} [page] Page number (default: 1)
 * @apiQuery {Number} [limit] Results per page (default: 25)
 *
 * @apiSuccess {object[]} unmappedPublishers - Array of unmapped publisher records
 * @apiSuccess {object} meta - Pagination metadata
 */
router
  .get('/', async (req, res) => {
    const { curveUser, query } = req;

    if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
      return res.status(403).json({ message: FORBIDDEN_ERROR });
    }

    try {
      const paginationParams = {
        page: Page.valueOrDefault(query.page, 1),
        limit: Page.valueOrDefault(query.limit, 25),
        sort: Page.sortOrDefault(query.orderBy, query.orderDir),
      };

      const filter = UnmappedPublisherController.paramsToFilterField(query, curveUser);
      const result = await UnmappedPublisher.paginate(filter, paginationParams);

      return res.status(200).json({
        unmappedPublishers: result.docs,
        meta: {
          currentPage: paginationParams.page,
          totalPages: result.totalPages,
          total: result.totalDocs,
        },
      });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: INTERNAL_ERROR });
    }
  })

  /**
   * @api {post} /unmappedPublishers/map_to_existing Map unrecognized publisher name to an existing publisher
   * @apiGroup unmappedPublishers
   *
   * @apiUse TokenParams
   * @apiBody {String} unmappedPublisherId - ID of the UnmappedPublisher record to resolve
   * @apiBody {String} publisherId - ID of the existing Publisher to map to
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    "message": "Publisher mapped successfully",
   *    "unmappedPublisher": { ... }
   *  }
   *
   * @apiError {json} AliasConflict - The alias already exists on another publisher
   * @apiErrorExample {json} AliasConflict Response:
   *  HTTP/1.1 409 Conflict
   *  {
   *    "message": "Error: 'Publisher 1' already has the alias 'Publisher 2'. Please select a different publisher or create a new one."
   *  }
   */
  .post('/map_to_existing', async (req, res) => {
    const { curveUser, body } = req;

    if (!UserAccess.allowWriteAccessToAll({ user: curveUser, type: 'catalogue' })) {
      return res.status(403).json({ message: FORBIDDEN_ERROR });
    }

    const { unmappedPublisherId, publisherId } = body;

    if (!unmappedPublisherId || !publisherId) {
      return res.status(400).json({ message: 'unmappedPublisherId and publisherId are required' });
    }

    try {
      const result = await UnmappedPublisherController.mapToExisting({
        unmappedPublisherId,
        publisherId,
        clientId: curveUser.clientId,
      });
      return res.status(200).json({ message: 'Publisher mapped successfully', ...result });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      logger.error(`Error mapping unmapped publishers: ${curveUser.clientId}`, err);
      return res.status(500).json({ message: INTERNAL_ERROR });
    }
  })

  /**
   * @api {post} /unmappedPublishers/create_new Create a new publisher from an unrecognized name
   * @apiGroup unmappedPublishers
   *
   * @apiUse TokenParams
   * @apiBody {String} unmappedPublisherId - ID of the UnmappedPublisher record to resolve
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    "message": "Publisher created successfully",
   *    "publisher": { ... },
   *    "unmappedPublisher": { ... }
   *  }
   */
  .post('/create_new', async (req, res) => {
    const { curveUser, body } = req;

    if (!UserAccess.allowWriteAccessToAll({ user: curveUser, type: 'catalogue' })) {
      return res.status(403).json({ message: FORBIDDEN_ERROR });
    }

    const { unmappedPublisherId } = body;

    if (!unmappedPublisherId) {
      return res.status(400).json({ message: 'unmappedPublisherId is required' });
    }

    try {
      const result = await UnmappedPublisherController.createNew({
        unmappedPublisherId,
        clientId: curveUser.clientId,
        userId: curveUser.id,
      });
      return res.status(200).json({ message: 'Publisher created successfully', ...result });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      logger.error(`Error creating publisher from unmapped publisher: ${curveUser.clientId}`, err);
      return res.status(500).json({ message: INTERNAL_ERROR });
    }
  });

module.exports = router;
