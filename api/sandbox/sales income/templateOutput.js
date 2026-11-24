require('dotenv').config();
require('../models/db');
const SalesTemplate = require('../models/salesTemplate');

SalesTemplate.findById('5c6be845c3748e64306029ef', (err, salesTemplate) => {
  salesTemplate.subSources.forEach((subSource) => {
    console.log(`${subSource.map}|${subSource.name}`);
  });
});
