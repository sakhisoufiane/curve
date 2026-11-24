require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Statement = require('../models/statement');

Statement.find({ clientId: '5bc46730443a346b8ee8ceec', status: 'Processing' }, (err, statements) => {
  logger.error(err);
  async.eachSeries(statements, (statement, cb) => {
    logger.info(statement);
    statement.calculate(() => {
      cb();
    });
  }, (err) => {
    logger.info('Complete');
    process.exit(-1);
  });
});
