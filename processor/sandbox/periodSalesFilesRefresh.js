require('../models/db');
const Period = require('../models/period');
const CalculateSales = require('../libs/calculation/period/calculateSales');

Period.findById('65a161f1dfb6a53d9e0ff065', (err, period) => {
  CalculateSales.updateSalesFilesReportedStatus(period, (errSFR) => {
    console.log(err);
    console.log('Complete');
  });
});
