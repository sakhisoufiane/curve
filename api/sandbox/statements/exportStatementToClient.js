require('dotenv').config();
require('../models/db');

const async = require('async');
const Statement = require('../models/statement');
const Client = require('../models/client');

// Set vars
const statementId = ''; // statement id to export
const targetClientId = ''; // clientId to export to
const curveUser = {
  id: '', // used to send email and set createdBy
  clientId: '' // used for notifications
};

if (statementId && targetClientId && curveUser.id && curveUser.clientId ) {
  async.waterfall([
    function (cb) {
      Client.findById(targetClientId, (err, targetClient) => {
        cb(null, targetClient);
      });
    },
    function (targetClient, cb) {
      Statement.findById(statementId, (err, statement) => {
        statement.exportToClient(targetClient, curveUser);
        cb();
      });
    },
  ], (err) => {
    if (err) {
      console.error('err: ', err);
    } else {
      console.log(`Royalties exporting to client ${targetClientId}`);
    }
  })  
} else {
  console.error('Please set statementId, targetClientId and curveUser');
  process.exit(-1);
}
