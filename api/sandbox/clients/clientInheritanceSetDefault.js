require('dotenv').config();
require('../../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Client = require('../../models/client');

// Number of clients to fetch and process at a time
const BATCH_SIZE = 50;

// Function to process a single batch of clients
async function processAllClients() {
    let skip = 0;
    let clients = [];

    do {
        try {
            clients = await Client.find({ inheritCatalogueFrom: { $exists: true, $ne: [] } })
                .skip(skip)
                .limit(BATCH_SIZE)
                .exec();

            if (clients.length === 0) {
                logger.info('All clients processed');
                break;
            }

            logger.info(`Processing ${clients.length} clients from skip ${skip}`);

            // Process the batch of clients
            for (const client of clients) {
                let updated = false;

                client.inheritCatalogueFrom.forEach((entry, index) => {
                    if (entry && typeof entry === 'object') {
                        client.inheritCatalogueFrom[index].transferPublishers = true;
                        client.inheritCatalogueFrom[index].transferComposers = true;
                        client.inheritCatalogueFrom[index].transferTracks = true;
                        client.inheritCatalogueFrom[index].transferReleases = true;
                        client.inheritCatalogueFrom[index].transferWorks = true;
                        updated = true;
                    } else {
                        logger.warn(`Skipping malformed entry at index ${index} for client ${client._id}`);
                    }
                });

                if (updated) {
                    try {
                        client.markModified('inheritCatalogueFrom');
                        await client.save();
                        logger.info(`Client ${client._id} updated successfully`);
                    } catch (saveErr) {
                        logger.error(`Error saving client ${client._id}:`, saveErr);
                    }
                }
            }

            skip += BATCH_SIZE;  // Move to the next batch
        } catch (err) {
            logger.error(`Error fetching or processing clients in iteration ${skip - BATCH_SIZE} - ${skip}, skipping to next batch:`, err);
            skip += BATCH_SIZE;
        }
    } while (clients.length > 0);
}

processAllClients();


