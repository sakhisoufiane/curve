require('./models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const SongList = require('./libs/songlist');

const deliveryId = process.argv[2] || '680b62adc71a2f5373089876';
const email = process.argv[3] || 'louis.bluhm@curveroyaltysystems.com';

logger.info(`deliveryId:${deliveryId}`);
logger.info(`email:${email}`);

async function main() {
  if (!deliveryId) {
    logger.error('No Delivery ID passed as an argument');
    process.exit(1);
  }
  try {
    console.time('createSongList');
    await SongList.createSongList({ deliveryId, email });
    console.timeEnd('createSongList');
    process.exit();
  } catch (err) {
    logger.error('Error creating songlist:', err);
    process.exit(1);
  }
}

main();
