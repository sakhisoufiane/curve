require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { runCwrImport } = require('../libs/cwr/import');

const importId = process.argv[2] || '69cd115c7996deb791a37d65';
const email = process.argv[3] || 'louis.bluhm@curveroyaltysystems.com';

logger.info('importId:', importId);
logger.info('email:', email);

async function main() {
  if (!importId) {
    logger.error('No Import ID passed as an argument');
    process.exit(1);
  }
  try {
    console.time('runCwrImport');
    await runCwrImport({ importId, email });
    console.timeEnd('runCwrImport');
    process.exit();
  } catch (err) {
    logger.error('Error running CWR import:', err);
    process.exit(1);
  }
}

main();
