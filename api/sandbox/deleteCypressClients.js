require('dotenv').config();
require('../models/db');
const { logger, crossEnvironmentConfig } = require('@curveroyaltysystems/platform-shared-utils');
const Client = require('../models/client');
const User = require('../models/user');
const deleteClients = require('../processes/deleteClients')

const run = async () => {
    const query = { cypressClient: true };
    const logText = 'Deleting Cypress Clients - ';
    
    const countClients = await Client.countDocuments(query);
    const countUsers = await User.countDocuments({ cypressUser: true });
    
    
    logger.debug(`Deleting ${countClients} clients..`);
    const { productionUri, stagingUri } = crossEnvironmentConfig;
    await deleteClients(stagingUri, query, logText).catch(logger.error);
    
    logger.debug(`Deleting ${countUsers} users..`);
    await User.deleteMany({ cypressUser: true });
    console.log('Done');
    process.exit(0);
};


run();