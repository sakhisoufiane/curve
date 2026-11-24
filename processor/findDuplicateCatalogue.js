require('./models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const FindDuplicates = require('./libs/catalogue');

const clientId = process.argv[2] || '61ba3c19fec82a05ecf1c1fa'; // Bailer
const type = process.argv[3] || 'work'; // "work" | "publisher" | "composer"
const email = process.argv[4] || 'louis.bluhm@curveroyaltysystems.com'; // Optional email for notifications

logger.info(`clientId:${clientId}`);

async function main() {
  if (!clientId) {
    logger.error('No Client ID passed as an argument');
    process.exit(1);
  }
  try {
    console.time('findDuplicateCatalogue');
    await FindDuplicates.findDuplicates({ clientId, type, email });
    console.timeEnd('findDuplicateCatalogue');
    process.exit();
  } catch (err) {
    logger.error('Error finding duplicate works:', err);
    process.exit(1);
  }
}

main();
