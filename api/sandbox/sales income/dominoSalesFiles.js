require('dotenv').config();
require('../models/db');
const async = require('async');
const SalesFile = require('../models/salesFile');

SalesFile.distinct('_id', { clientId: '5d07759340fd0951e9f622bf' }, (err, ids) => {
  ids.forEach((id) => {
    console.log(id.toString());
  });
});