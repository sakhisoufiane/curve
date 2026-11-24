require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const WorksExport = require('../libs/works/export');

const clientId = process.argv[2] || '679bb25db9509c49782b2b1a';
const email = process.argv[3] || 'louis.bluhm@curveroyaltysystems.com';

logger.info('clientId', clientId);
logger.info('email', email);

async function main() {
  if (!clientId) {
    logger.error('No Client ID passed as an argument');
    process.exit(1);
  }
  try {
    // Add custom filter fields here, default is all Works within the Client
    const filter = {
      // text: '',
      // orderBy: 'title',
      // orderDir: 'asc',
      // createdAt: { $gte: new Date('2026-04-01') },
      // limit: 25,
      // participation: { symbol: '=' },
      // ownership: { symbol: '=' },
      // page: 1,
    };
    console.time('exportWorks');
    await WorksExport.exportWorks({ clientId, filter, email });
    console.timeEnd('exportWorks');
    process.exit();
  } catch (err) {
    logger.error('Error exporting works:', err);
    process.exit(1);
  }
}

main();
