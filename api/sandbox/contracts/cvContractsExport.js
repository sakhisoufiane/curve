require('dotenv').config();
require('../models/db');
const moment = require('moment');
const Contract = require('../models/contract');

Contract.find({ clientId: '5a670a94add44416ebcd0f4e' }, (err, contracts) => {
  contracts.forEach((contract) => {
    console.log(contract.name, '|', contract.contractType, '|', moment(contract.createdAt).format('YYYY-MM-DD'));
  });
});
