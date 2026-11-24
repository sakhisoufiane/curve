const { logger, ExchangeRateLib } = require('@curveroyaltysystems/platform-shared-utils');
const express = require('express');

const Payee = require('../models/payee');
const Client = require('../models/client');
const Release = require('../models/release');
const Contract = require('../models/contract');
const ExchangeRate = require('../models/exchangeRate');
const ExchangeRatesController = require('../controllers/exchangeRates');

const router = express.Router();

router
  .get('/', (req, res) => {
    const { curveUser } = req;

    ExchangeRateLib.getExchangeRates({ clientId: curveUser?.clientId, Client, Contract, Payee, Release, ExchangeRate }).then((exchangeRates) => {
      res.status(200).json(exchangeRates);
    }).catch((error) => {
      logger.error(error);
      res.status(500).json({ message: 'There was an error in requesting the exchange rates' });
    });
  })

  .get('/historical', async (req, res) => {
    const { curveUser } = req;
    try {
      const exchangeRates = await ExchangeRatesController.getHistoricalExchangeRates({
        curveUser,
        Client,
        ExchangeRate,
        currencyCodes: req.query.currencyCodes,
        date: req.query.date,
      });
      return res.status(200).json(exchangeRates);
    } catch (err) {
      logger.error('Failed to retrieve historical exchange rates', err);
      return res.status(500).json({ message: 'There was an error requesting historical exchange rates' });
    }
  });

module.exports = router;
