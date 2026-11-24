const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const express = require('express');

const {
  createSubClient,
  createSplitPayee,
  linkTrackSplits,
  addSplitsTrack,
  updateSubClientSalesTerms,
  getSubClientBySubOrgId,
  getPayeesBySubClient,
} = require('../../controllers/subClient');

const router = express.Router();

router
/**
 * @api {post} / Create a SubClient
 * @apiGroup SubClients
 * @apiUse TokenParams
 *
 * @apiBody {object} subClient - Data required to create a subClient, payee, and contract:
 * {
 *   "name": "subclient1",
 *   "subOrgId": "12345",
 *   "salesTerms": {
 *     "territory": "WW",
 *     "catType": "All",
 *     "catalogueGroup": "All",
 *     "channel": "All",
 *     "configuration": "All",
 *     "priceCategory": "All",
 *     "source": "All",
 *     "type": "Net Receipts",
 *     "rate": 100
 *   }
 * }
 *
 * @apiSuccess {json} Response - The created SubClient details.
 * @apiSuccessExample {json} Success Response:
 * HTTP/1.1 200 OK
 * {
 *   "subClient": {
 *     "clientId": "id",
 *     "name": "subclient1",
 *     "subClientId": "12345",
 *     "_id": "id",
 *     "createdAt": "date",
 *     "updatedAt": "date",
 *     "__v": 0
 *   }
 * }
 */
  .post('/', async (req, res) => {
    try {
      const { curveUser, body } = req;
      body.clientId = curveUser.clientId;
      body.createdBy = curveUser.id;
      body.lastModifiedBy = curveUser.id;
      const subClient = await createSubClient({ curveUser: req.curveUser, newSubClient: req.body });
      return res.status(200).json({ subClient });
    } catch (err) {
      logger.error(err);
      return res.status(err.code || 500).json({ code: err.cause, message: err.message });
    }
  })

/**
 * @api {post} /:id/payee Create a SubClient splits Payee
 * @apiGroup SubClients
 * @apiUse TokenParams
 *
 * @apiBody {object} payee - Data required to create a payee:
 * {
 *   "name": "testPayee",
 *   "email": "test@test.com"
 * }
 *
 * @apiSuccess {json} Response - The created Payee details.
 * @apiSuccessExample {json} Success Response:
 * HTTP/1.1 200 OK
 * {
 *   "splitPayee": {
 *     "clientId": "id",
 *     "name": "testPayee",
 *       "email": "test@test.com",
 *       "openingBalance": 0,
 *       "minPayout": 0,
 *       "selfBilling": false,
 *       "autoPayment": false,
 *       "payeeCategories": [],
 *       "paymentProviders": {
 *           "tipalti": {
 *               "payeeId": ""
 *           },
 *           "wise": {
 *               "paymentFields": {},
 *               "recipientDetailsMethod": "manual"
 *           }
 *       },
 *       "valid": true,
 *       "validationErrors": [],
 *     "_id": "id",
 *     "createdAt": "date",
 *     "updatedAt": "date",
 *     "__v": 0
 *   }
 * }
 */
  .post('/:id/payee', async (req, res) => {
    try {
      const { curveUser, body, params } = req;
      body.clientId = curveUser.clientId;
      body.subOrgId = params.id;
      body.createdBy = curveUser.id;
      body.lastModifiedBy = curveUser.id;
      const splitPayee = await createSplitPayee({ curveUser: req.curveUser, payeeData: req.body });
      return res.status(200).json({ splitPayee });
    } catch (err) {
      logger.error(err);
      return res.status(err.code || 500).json({ code: err.cause, message: err.message });
    }
  })

/**
 * @api {post} /:id/link-track Link a track to a subClient
 * @apiGroup SubClients
 * @apiUse TokenParams
 *
 * @apiBody {object} fugaTrackId - track to link:
 * {
 *   "fugaTrackId": "12345",
 * }
 *
 * @apiSuccess {json} Response - The updated Track details.
 * @apiSuccessExample {json} Success Response:
 * HTTP/1.1 200 OK
 *{
 *    "track": {
 *        "_id": "",
 *        "clientId": "",
 *        "campaignIds": [],
 *        "title": "omar test",
 *        "aliases": [],
 *        "releaseIds": [],
 *        "workIds": [],
 *        "catalogueGroups": [],
 *        "mechanicalLicenses": [],
 *        "mechanicalContractIds": [],
 *        "reportMechanicals": true,
 *        "totalParticipation": 100,
 *        "createdBy": "",
 *        "lastModifiedBy": "",
 *        "valid": true,
 *        "mechanicalCalculationBasis": "Sale Date",
 *        "salesReturnsRights": [
 *            {
 *                "contractId": "",
 *                "percentage": 100,
 *                "_id": ""
 *            }
 *        ],
 *        "releaseSpecificSalesReturnsRights": [],
 *        "costsRights": [],
 *        "createdAt": "2024-12-16T11:09:41.406Z",
 *        "updatedAt": "2024-12-16T11:10:51.901Z",
 *        "statutoryRate": 0.124,
 *        "canadianStatutoryRate": 0.083,
 *        "__v": 1,
 *        "foreignId": ""
 *    }
 *}
 */
  .post('/:id/link-track', async (req, res) => {
    try {
      const { curveUser, body, params } = req;
      body.clientId = curveUser.clientId;
      body.subOrgId = params.id;
      body.createdBy = curveUser.id;
      body.lastModifiedBy = curveUser.id;
      const track = await linkTrackSplits({ curveUser: req.curveUser, linkTrackData: req.body });
      return res.status(200).json({ track });
    } catch (err) {
      logger.error(err);
      return res.status(err.code || 500).json({ code: err.cause, message: err.message });
    }
  })

/**
 * @api {post} /subclients/:id/split-track add subclients payee splits to a track
 * @apiGroup SubClients
 * @apiUse TokenParams
 *
 * @apiBody {string} fugaTrackId - The track ID.
 * @apiBody {Array} splits - List of split details:
 * [
 *   {
 *     "payeeId": "String",
 *     "percentage": Number
 *   },
 *   ...
 * ]
 *
 * @apiSuccess {json} Response - The updated Track Details.
 * @apiSuccessExample {json} Success Response:
 * HTTP/1.1 200 OK
 * {
 *   "id": "67d03cff4a858617d70b3656",
 *   "fugaId": "validFugaTrackId",
 *   "isrc": "test isrc",
 *   "title": "test title",
 *   "artist": "test artist",
 *   "version": "test version",
 *   "duration": null,
 *   "releases": [
 *     {
 *       "releaseId": "42d03cff4a858617d70b36e4",
 *       "name": "test release name"
 *     }
 *   ],
 *   "payeeCount": 1,
 *   "contracts": [
 *     {
 *       "payeeId": "67d03cff4a858617d70b31e2",
 *       "payeeName": "Payee 1",
 *       "payeeEmail": "",
 *       "percentage": 50
 *     }
 *   ]
 * }
 */
  .post('/:id/split-track', async (req, res) => {
    try {
      const { curveUser, body, params } = req;
      body.clientId = curveUser.clientId;
      body.subOrgId = params.id;
      body.createdBy = curveUser.id;
      body.lastModifiedBy = curveUser.id;
      const splitTrack = await addSplitsTrack({ curveUser, splitTrackData: req.body });
      return res.status(200).json({ splitTrack });
    } catch (err) {
      logger.error(err);
      return res.status(err.code || 500).json({ code: err.cause, message: err.message });
    }
  })

/**
 * @api {put} /subclients/:id/sales-terms Update Sales Terms
 * @apiGroup SubClients
 * @apiUse TokenParams
 *
 * @apiBody {Object} salesTerms - The new sales terms to apply.
 *
 * @apiSuccess {json} Response - Summary of the update.
 * @apiSuccessExample {json} Success Response:
 * HTTP/1.1 200 OK
 * {
 *   "subClientId": "subClientId",
 *   "updatedContracts": [contractid1, contractid2]
 * }
 */
  .put('/:id/sales-terms', async (req, res) => {
    try {
      const { body, params } = req;
      const subOrgId = params.id;
      const { salesTerms } = body;
      const result = await updateSubClientSalesTerms({ subOrgId, salesTerms });
      return res.status(200).json(result);
    } catch (err) {
      logger.error(err);
      return res.status(err.code || 500).json({ code: err.cause, message: err.message });
    }
  })

/**
 * @api {get} /subclients/:id Get SubClient by SubOrgId
 * @apiGroup SubClients
 * @apiUse TokenParams
 *
 * @apiParam {string} id - The SubOrgId of the SubClient.
 *
 * @apiSuccess {json} Response - SubClient Details including Sales Terms.
 * @apiSuccessExample {json} Success Response:
 * HTTP/1.1 200 OK
 * {
 *   "subClient": {
 *     "name": "SubClient Name",
 *     "clientId": "",
 *     "subOrgId": "12345",
 *     "salesTerms": [
 *       {
 *         "catType": "All",
 *         "catalogueGroup": "All",
 *         "territory": "WW",
 *         "channel": "All",
 *         "configuration": "All",
 *         "priceCategory": "All",
 *         "source": "All",
 *         "escalationTrackers": [],
 *         "type": "Net Receipts",
 *         "rate": 85,
 *         "escalations": []
 *       }
 *     ]
 *   }
 * }
 */
  .get('/:id', async (req, res) => {
    try {
      const { params } = req;
      const subOrgId = params.id;
      const result = await getSubClientBySubOrgId(subOrgId);
      return res.status(200).json({ subClient: result });
    } catch (err) {
      logger.error(err);
      return res.status(err.code || 500).json({ code: err.cause, message: err.message });
    }
  })

/**
 * @api {get} /subclients/:id/payees Get Unique Payees for SubClient
 * @apiGroup SubClients
 * @apiUse TokenParams
 *
 * @apiParam {string} id - The SubOrgId of the SubClient.
 * @apiQuery {string} search - (Optional) Text to filter payees by name.
 *
 * @apiSuccess {json} Response - List of unique payees for the SubClient.
 * @apiSuccessExample {json} Success Response:
 * HTTP/1.1 200 OK
 * {
 *   "payees": [
 *     { "name": "Payee1", "_id": "ObjectId1" },
 *     { "name": "Payee2", "_id": "ObjectId2" }
 *   ]
 * }
 */
  .get('/:id/payees', async (req, res) => {
    try {
      const { params, query } = req;
      const subOrgId = params.id;
      const search = query.search || '';
      const page = query.page || 1;
      const limit = query.limit || 25;
      const result = await getPayeesBySubClient({ subOrgId, search, page, limit });
      return res.status(200).json(result);
    } catch (err) {
      logger.error(err);
      return res.status(err.code || 500).json({ code: err.cause, message: err.message });
    }
  });

module.exports = router;
