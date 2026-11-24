const express = require('express');
const IswcAcknowledgementController = require('../controllers/iswcAcknowledgement');

const router = express.Router();

router
  .get('/', async (req, res) => {
    IswcAcknowledgementController.getIswcAcknowledgements({ req, res });
  })

  .get('/:id/works', async (req, res) => {
    IswcAcknowledgementController.getIswcAcknowledgementWorks({ req, res });
  })

  .get('/:id', async (req, res) => {
    IswcAcknowledgementController.getIswcAcknowledgement({ req, res });
  })

  .delete('/bulk', async (req, res) => {
    IswcAcknowledgementController.deleteBulkIswcAcknowledgementy({ req, res });
  })

  .delete('/:id', async (req, res) => {
    IswcAcknowledgementController.deleteIswcAcknowledgement({ req, res });
  })

  .post('/export', async (req, res) => {
    IswcAcknowledgementController.exportIswcAcknowledgement({ req, res });
  });

module.exports = router;
