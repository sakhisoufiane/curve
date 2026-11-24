const express = require('express');
const IswcDeliveryController = require('../controllers/iswcDelivery');

const router = express.Router();

router
  .get('/', async (req, res) => {
    IswcDeliveryController.getIswcDeliveries({ req, res });
  })

  .get('/:id', async (req, res) => {
    IswcDeliveryController.getIswcDelivery({ req, res });
  })

  .get('/:id/works', async (req, res) => {
    IswcDeliveryController.getIswcDeliveryWorks({ req, res });
  })

  .get('/:id/export_works', async (req, res) => {
    IswcDeliveryController.getIswcDeliveryWorksExport({ req, res });
  })

  .get('/:id/deliver', async (req, res) => {
    IswcDeliveryController.deliverIswcDelivery({ req, res });
  })

  .put('/:id', async (req, res) => {
    IswcDeliveryController.updateIswcDelivery({ req, res });
  })

  .post('/', async (req, res) => {
    IswcDeliveryController.createIswcDelivery({ req, res });
  })

  .delete('/bulk', async (req, res) => {
    IswcDeliveryController.deleteBulkIswcDelivery({ req, res });
  })

  .delete('/:id', async (req, res) => {
    IswcDeliveryController.deleteIswcDelivery({ req, res });
  });

module.exports = router;
