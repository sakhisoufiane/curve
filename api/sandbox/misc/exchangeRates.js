require('dotenv').config();
require('../models/db');
const ExchangeRates = require('../libs/exchangeRates');

ExchangeRates([['USD', 'GBP'], ['USD', 'CAD'], ['CAD', 'GBP']]).then((output) => {
  console.log(output);
});

// { USD_GBP: 0.73615, USD_CAD: 1.270635, CAD_GBP: 0.579493 }