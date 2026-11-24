require('../models/db');
const SalesFile = require('../models/salesFile');
const platformSalesIngestion = require('../libs/platform/salesIngestion');

SalesFile.findById('62f4218a41742a1b664cf08c', (err, salesFile) => {
  platformSalesIngestion(salesFile, (err, response) => {
    console.log(response);
  });
});