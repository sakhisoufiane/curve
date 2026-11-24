const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const FixedReportController = require('./libs/fixedReports/fixedReportsController');

require('./models/db');

let reportId = '679a5d03430df22a5072a826';
let email = 'arjun@curveroyaltysystems.com';

if (process.argv[2]) { reportId = process.argv[2]; }
if (process.argv[3]) { email = process.argv[3]; }

FixedReportController.runFixedReport({ reportId, email }).then(() => {
  logger.info('Fixed Report Complete');
  process.exit(0);
}).catch((err) => {
  logger.error(err);
  process.exit(-1);
});

// node --max-old-space-size=16384 runFixedReportById.js
