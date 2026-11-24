const express = require('express');

const { errorHandler } = require('../libs/apiHelper');
const { getImportPartner, getImportPartners, createImportPartner, updateImportPartner, deleteImportPartner } = require('../controllers/importPartner');

const router = express.Router();

router
  .get('/', async (req, res) => {
    const { curveUser, query } = req;

    try {
      const importPartners = await getImportPartners({ curveUser, query });
      return res.status(200).json(importPartners);
    } catch (err) {
      errorHandler(err, res);
    }
  })

  .get('/:id', async (req, res) => {
    const { curveUser, params } = req;

    try {
      const importPartner = await getImportPartner({ curveUser, importPartnerId: params.id });
      return res.status(200).json(importPartner);
    } catch (err) {
      errorHandler(err, res);
    }
  })

  .post('/', async (req, res) => {
    const { curveUser, body } = req;

    try {
      const importPartner = await createImportPartner({ curveUser, importPartner: body });
      return res.status(201).json(importPartner);
    } catch (err) {
      errorHandler(err, res);
    }
  })

  .put('/:id', async (req, res) => {
    const { curveUser, params, body } = req;

    try {
      const importPartner = await updateImportPartner({ curveUser, importPartnerId: params.id, importPartner: body });
      return res.status(200).json(importPartner);
    } catch (err) {
      errorHandler(err, res);
    }
  })

  .delete('/:id', async (req, res) => {
    const { curveUser, params } = req;

    try {
      await deleteImportPartner({ curveUser, importPartnerId: params.id });
      return res.status(200).json();
    } catch (err) {
      errorHandler(err, res);
    }
  });

module.exports = router;
