const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const express = require('express');
const SpotifyController = require('../controllers/spotify');

const router = express.Router();

router
  .get('/search', (req, res) => {
    const { searchTerm, album, artist, label, type, page, limit } = req.query;
    SpotifyController
      .search({ searchTerm, album, artist, label, type, page, limit })
      .then((result) => res.status(200).json(result))
      .catch((error) => {
        logger.error(error);
        res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
      });
  })

  .post('/import', (req, res) => {
    if (!req.curveUser.clientId) { return res.status(403).json({ message: 'Forbidden' }); }

    const { items: data, searchTerm, album, artist, label, type, updateExistingItems } = req.body;
    SpotifyController.import({ data, searchTerm, album, artist, label, type, curveUser: req.curveUser, updateExistingItems }).catch((error) => logger.error(error));
    res.status(200).json({ result: 'Ok' });
  });

module.exports = router;
