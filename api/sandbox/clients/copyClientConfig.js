require('dotenv').config();
require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { eachLimit } = require('async');
const Client = require('../models/client');
const SalesTemplate = require('../models/salesTemplate');

// All Clients
const clients = ['61963d674f0ad8002863cf25', '619640cbf270aa0028e3baf0', '61963e4ba35e8600219eeeb8', '61963e7f7296d30021e717d3', '61963fc17296d30021e7189e', '61964046c75c8108d2318c9a', '61963ef4150d05001db13e76'];

function capitilize(string) {
  const words = string.toLowerCase().split(' ');
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

const updateTemplates = async (clientId) => {
  // No need to batch these as there won't be many per client
  const templates = await SalesTemplate.find({ clientId });
  if (!templates?.length) { throw new Error(`❌ ${clientId}: no templates to update ❌`); }

  await eachLimit(templates, 5, async (template) => {
    if (Array.isArray(template.configurations)) {
      // logger.debug(`ClientId: ${clientId} - Updating config ${template.configurations.length} mappings for ${template._id}`)
      for (configIndex in template.configurations) {
        template.configurations[configIndex].name = template.configurations[configIndex].name.toUpperCase();
      }
    }
    if (Array.isArray(template.distributionChannels)) {
      for (distIndex in template.distributionChannels) {
        // logger.debug(`ClientId: ${clientId} - Updating dist ${template.distributionChannels.length} mappings for ${template._id}`)
        template.distributionChannels[distIndex].name = template.distributionChannels[distIndex].name.toUpperCase();
      }
    }

    await template.save();
  });

}

const updateClient = async (clientIds) => {
  await eachLimit(clientIds, 5, async (clientId) => {
    const client = await Client.findById(clientId);
    if (!client) { throw new Error(`Client not found ${clientId}`) }

    // Clean config
    const configurations = client.configurations.map((config) => config.toUpperCase());
    // Clean dist
    const distributionChannels = client.distributionChannels.map((distributionChannel) => distributionChannel.toUpperCase());
    // Update main client
    const params = { configurations, distributionChannels }
    logger.debug(`Updating settings for ${client.name} - ${client._id}`)
    const updatedClient = await Client.findByIdAndUpdate(client._id, params);

    // Update templates
    logger.debug(`Updating templates for ${client.name} - ${client._id}`)
    await updateTemplates(updatedClient._id);
  });
}

// Run Script
updateClient(clients).then(() => {
  logger.info('✅ Clients Updated ✅');
  process.exit(0);
}).catch((err) => {
  logger.error(err);
  process.exit(0);
});