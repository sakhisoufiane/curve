const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const express = require('express');

const FixedReportController = require('../controllers/fixedReport');

const router = express.Router();

router
  .get('/', (req, res) => {
    const { curveUser, query } = req;

    FixedReportController.getFixedReports({ query, curveUser }).then((reports) => {
      res.status(200).json(reports);
    }).catch((err) => {
      logger.error(err);
      res.status(500).json({ message: 'Could not load reports' });
    });
  })
  .get('/:id', (req, res) => {
    const { curveUser, params } = req;

    FixedReportController.getFixedReport({ id: params.id, curveUser }).then((report) => {
      res.status(200).json(report);
    }).catch((err) => {
      logger.error(err);
      res.status(500).json({ message: 'Could not load report' });
    });
  })
  .put('/:id', (req, res) => {
    const { curveUser, params, body } = req;

    if (!curveUser?.internal) { return res.status(403).json({ message: 'Forbidden' }); }

    FixedReportController.updateFixedReport({ id: params.id, body }).then((report) => {
      res.status(200).json(report);
    }).catch((err) => {
      logger.error(err);
      res.status(500).json({ message: 'Could update report' });
    });
  });

module.exports = router;
