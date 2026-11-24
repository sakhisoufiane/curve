const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');

const router = express.Router();
const bodyParser = require('body-parser');

const parseUrlencoded = bodyParser.urlencoded({ extended: false });
const { eachSeries } = require('async');
const { INTERNAL_ERROR, FORBIDDEN_ERROR } = require('../constants');
const { CSVRawExport } = require('../../libs/mongodb-export');
const UnmappedWork = require('../../models/unmappedWork');
const Work = require('../../models/work');
const Payee = require('../../models/payee');
const Client = require('../../models/client');
const UnmappedWorkController = require('../../controllers/unmappedWork');

router
  .get('/', (req, res) => {
    const { curveUser, query } = req;

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
      const paginationParams = {
        page: Page.valueOrDefault(query.page, 1),
        limit: Page.valueOrDefault(query.limit, 25),
        sort: Page.sortOrDefault(query.orderBy, query.orderDir),
      };

      UnmappedWorkController.getAggregateUnmappedWorks({ paginationParams, req }).then((result) => {
        res.status(200).json(result);
      }).catch((err) => {
        logger.error(err);
        res.status(500).json({ message: INTERNAL_ERROR });
      });
    } else {
      res.status(403).json({ message: FORBIDDEN_ERROR });
    }
  })

  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;

    UnmappedWork.findById(params.id)
      .then(async (unmappedWork) => {
        if (!unmappedWork) {
          res.status(404).json({ message: `Could not find UnmappedWork with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: unmappedWork, clientOnly: true })) {
          res.status(403).json({ message: FORBIDDEN_ERROR });
        } else {
          unmappedWork.patches.find({ ref: unmappedWork._id })
            .populate('author', 'email')
            .then((patches) => {
              res.status(200).json({ modelHistory: patches });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: INTERNAL_ERROR });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: INTERNAL_ERROR });
      });
  })

  .get('/:id', (req, res) => {
    const { curveUser, params } = req;

    UnmappedWork.findById(params.id)
      .then(async (unmappedWork) => {
        if (!unmappedWork) {
          res.status(404).json({ message: `Could not find UnmappedWork with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: unmappedWork, clientOnly: true })) {
          res.status(403).json({ message: FORBIDDEN_ERROR });
        } else {
          res.status(200).json(unmappedWork);
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: INTERNAL_ERROR });
      });
  })

  .put('/', async (req, res) => {
    if (req.curveUser?.rights?.[req.curveUser?.clientId]?.catalogue !== 'Edit') { return res.status(403).json({ message: FORBIDDEN_ERROR }); }

    const aggregateUnmappedWork = req.body;
    const query = { _id: { $in: aggregateUnmappedWork.ids } };

    const unmappedWorks = await UnmappedWork.find(query).catch(logger.error);
    if (!unmappedWorks?.length) { return res.status(404).json({ message: 'Could not find associated Unmapped Works' }); }

    UnmappedWorkController.updateUnmappedWorks({ aggregateUnmappedWork, unmappedWorks }).then((updatedAggregateUnmappedWork) => {
      res.status(200).json(updatedAggregateUnmappedWork);
    }).catch((err) => {
      logger.error(err);
      res.status(500).json({ message: err.message });
    });
  })

  .post('/add_bulk_aliases', parseUrlencoded, (req, res) => {
    if (req.curveUser?.rights?.[req.curveUser?.clientId]?.catalogue !== 'Edit') { return res.status(403).json({ message: FORBIDDEN_ERROR }); }

    // Check aliases exist
    if (req.body.aliases) {
      UnmappedWorkController.addBulkAliases({ aliases: req.body.aliases, curveUser: req.curveUser }).then(() => {
        res.status(200).json({ message: 'Completed Adding Aliases to Works' });
      }).catch((err) => {
        logger.error(`Error adding bulk aliases: ${err}`);
        res.status(500).json({ message: INTERNAL_ERROR });
      });
    } else {
      res.status(400).json({ message: 'Aliases are required to be passed' });
    }
  })

  /**
  * @api {post} /unmappedWorks/createWorks Create multiple Works from unmapped works
  * @apiGroup unmappedWorks
  *
  * @apiUse TokenParams
  * @apiBody {object[]} works - Unmapped works to import
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
  .post('/create_works', async (req, res) => {
    if (req.curveUser?.rights?.[req.curveUser?.clientId]?.catalogue !== 'Edit') { return res.status(403).json({ message: FORBIDDEN_ERROR }); }

    const { clientId } = req.curveUser;
    const createdBy = req.curveUser.id;
    const lastModifiedBy = req.curveUser.id;
    const { works } = req.body;
    if (Array.isArray(works)) {
      // Fetch client settings to check if issueIdentifier is enabled
      const client = await Client.findById(clientId, 'issueIdentifier identifierPrefix identifierStartFrom')
        .lean()
        .catch((err) => {
          logger.error(`Error finding client in /create_works: ${err}`);
          return null;
        });

      const created = [];
      const failed = [];
      // Loop through works in series to ensure they are created and validated one by one
      eachSeries(works, (work, cb) => {
        const unmappedIdentifier = UnmappedWorkController.foundIdentifier(work);

        // Only set identifier if issueIdentifier is disabled
        // When undefined, Work model's pre-save hook will generate incremental identifier
        const workIdentifier = client?.issueIdentifier ? undefined : work._id.identifier;

        const newWork = new Work({
          title: work.title,
          composer: work.composer,
          foreignId: work.foreignId,
          identifier: workIdentifier,
          iswc: work.iswc,
          tunecode: work.tunecode,
          clientId,
          createdBy,
          lastModifiedBy,
          // and update the unmapped work
          societyIdentifiers: [{ society: work._id.source, identifier: unmappedIdentifier }],
        });

        newWork._creationType = 'unmapped';

        // save the newly created work
        newWork.save()
          .then((savedWork) => {
            // if saving is successful, add the work id to the unmapped work and set unmapped work to complete
            const set = { workId: savedWork._id.toString(), complete: true };
            // Query must match ALL 6 aggregation grouping fields to ensure we only mark the specific unmapped works as complete,
            // not other records with partial field matches (e.g., same identifier but different title)
            const query = {
              clientId: req.curveUser.clientId,
              identifier: work._id.identifier,
              iswc: work._id.iswc ?? work.iswc,
              tunecode: work._id.tunecode ?? work.tunecode,
              songcode: work._id.songcode ?? work.songcode,
              source: work._id.source,
              title: work._id.title ?? work.title,
            };
            UnmappedWork.updateMany(query, { $set: set })
              .then(() => {
                // if saving is successful, add the unmapped work id to the created array
                created.push(work.id);
                cb();
              })
              .catch((unmappedWorkErr) => {
                logger.error(`Error updating unmapped work ${work.id} after creating work ${savedWork._id}`);
                cb(unmappedWorkErr);
              });
          })
          .catch((err) => {
            logger.error(err);
            // if saving errors, add the unmapped work id to the failed array
            failed.push(work._id.identifier);
            cb();
          });
      }, (eachErr) => {
        if (eachErr) {
          return res.status(500).json({
            message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.',
          });
        }
        // return a list of both created works and failed work indexes
        const response = {
          created,
          failed,
        };
        res.status(200).json(response);
      });
    } else {
      return res.status(500).json({
        message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.',
      });
    }
  })
  .post('/export', async (req, res) => {
    const { curveUser, body } = req;
    if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
      return res.status(403).json({ message: FORBIDDEN_ERROR });
    }
    await UnmappedWorkController.exportUnmappedWorks({ curveUser, body }).catch((err) => {
      logger.error(err);
      return res.status(500).json({ message: INTERNAL_ERROR });
    });

    res.status(200).json({ message: 'Export task created' });
  })
  .post('/raw-export', async (req, res) => {
    const { curveUser, body } = req;
    const sync = body.sync === true;

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
      const filter = UnmappedWorkController.paramsToFilterField(body.filter || {}, curveUser);

      if (sync) {
        try {
          const result = await CSVRawExport({ curveUser, collectionName: 'unmappedworks', filter, sync: true });
          res.status(200).json(result);
        } catch (err) {
          logger.error(err);
          res.status(500).json({ message: 'Export failed', error: err.message });
        }
      } else {
        CSVRawExport({ curveUser, collectionName: 'unmappedworks', filter });
        res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
      }
    } else {
      res.status(403).json({ message: FORBIDDEN_ERROR });
    }
  });

module.exports = router;
