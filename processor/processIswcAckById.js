require('dotenv').config();
require('./models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const IswcAcknowledgementController = require('./controllers/iswcAcknowledgement');

// const fileName = 'ISWCP_2024-05-30T16-36-56_315_BOA_312.json';
// const serverId = '6634cef5115b9ec669781e84';
// const clientId = '665efa18904109794f4b429f';

const fileName = 'ISWCP_2024-06-04T08-39-45_315_BOA_312.json';
const serverId = '665ef939af15570b7457ecd7';
const clientId = '5f8ef7fd6d763b001524c783';

if (clientId) {
  logger.info({ clientId });
  iswcAcknowledgment(fileName, serverId, clientId);
} else {
  logger.error('No clientId ID set');
  process.exit(-1);
}

async function iswcAcknowledgment(fileName, serverId, clientId) {
  if (fileName) {
    logger.info(`Digesting ISWC Acknowledgment: ${fileName}`);
    try {
      await IswcAcknowledgementController.digestAckFile({ fileName, serverId, clientId });
    } catch (err) {
      logger.error(err);
    }
  } else {
    logger.error('No ISWC Acknowledgment file name');
  }
}
