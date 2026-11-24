const { logger } = require('@curveroyaltysystems/platform-shared-utils');
require('dotenv').config();
require('../models/db');
const async = require('async');
const CwrAcknowledgement = require('../models/cwrAcknowledgement');

const id = '60f598c8d5d4ad00252ce996';

CwrAcknowledgement.findById(id, (err, cwrAck) => {
  cwrAck.importAcknowledgementFile({ email: "tom.allen@metable.co" }, (err, res) => {
    logger.error(err);
    logger.info(res);
  });
});