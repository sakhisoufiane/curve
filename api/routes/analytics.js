const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const express = require('express');

const router = express.Router();
const async = require('async');
const analytics = require('../libs/analytics');

router
  .post('/', (req, res) => {
    if (req.curveUser.clientId || req.curveUser.payeeId) {
      if (Array.isArray(req.body.filter) && Array.isArray(req.body.outputs)) {
        const { filter } = req.body;
        const { comparison } = req.body;
        const { outputs } = req.body;
        const options = {
          clientId: req.curveUser.clientId,
          payeeId: req.curveUser.payeeId,
        };
        async.parallel({
          analytics(paraCb) {
            analytics.getAnalytics(filter, outputs, options, paraCb);
          },
          comparison(paraCb) {
            if (Array.isArray(comparison)) {
              analytics.getAnalytics(comparison, outputs, options, paraCb);
            } else {
              paraCb(null, []);
            }
          },
        }, (err, totals) => {
          if (err) {
            logger.error(err);
            res.status(500).json({ message: 'Internal error, please try again' });
          } else {
            res.status(200).json(totals);
          }
        });
      } else {
        res.status(400).json({ errors: ["requires params 'filter' and 'outputs' to be supplied"] });
      }
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  });

module.exports = router;
