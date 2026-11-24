require('dotenv').config();
require('../../models/db');
const async = require('async');
const SalesFile = require('../../models/salesFile');

SalesFile.find({ clientId: '5d9b4089eb5f3f79c6ffaf69' }, (err, salesFiles) => {
  const outputs = {};
  salesFiles.forEach((salesFile) => {
    outputs[salesFile.salesAccountName] = outputs[salesFile.salesAccountName] || [];
    outputs[salesFile.salesAccountName].push(salesFile._id.toString());
  });
  console.log(outputs);
});
