require('dotenv').config();
require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const TerritoryGroup = require('../models/territoryGroup');

// Helper
const organiseNewTerritoryGroups = ({ territoryGroups, toClientId }) => {
  const newTerritoryGroups = [];

  territoryGroups.forEach((territoryGroup) => {
    const fields = { clientId: toClientId, name: territoryGroup.name, territories: territoryGroup.territories };

    const newTerritoryGroup = new TerritoryGroup(fields);
    newTerritoryGroups.push(newTerritoryGroup);
  });

  return newTerritoryGroups;
}

// Main
const setTerrGroups = async ({ toClientId, fromClientId }) => {
  const territoryGroups = await TerritoryGroup.find({ clientId: fromClientId }).catch(logger.error);
  if (territoryGroups?.length === 0) throw new Error(`No Groups to copy over from ${fromClientId}`);

  const newClientTerritoryGroups = organiseNewTerritoryGroups({ territoryGroups, toClientId });

  logger.debug(`Attempting to copy over ${newClientTerritoryGroups.length} Territory Groups to client ${toClientId}`);
  await TerritoryGroup.insertMany(newClientTerritoryGroups);
};


const toClientId = '6446b857f98f015517d8f06a' // Cloud9 Music
const fromClientId = '6322de046c0fb934a5963194'; // Cloud9 - POC

// Call Method
setTerrGroups({ toClientId, fromClientId }).then(() => {
  logger.info('✅ Completed Copy Process ✅');
  process.exit(0);
}).catch((err) => {
  logger.error(err);
  process.exit(0);
})


