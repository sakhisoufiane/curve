/*
Description: Add new US mechanical stat rates
Time To Run: 00:00:05s (Staging)
Ticket No: SUP-919
Category: Clients
Author: Marco Giuliani
*/
require('../../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Client = require('../../models/client');

const updateStatRates = async () => {
    const cutoffDate = new Date('2024-12-31T23:59:59.999Z');

    const newStatRate = {
      startDate: new Date('2025-01-01T00:00:00.000Z'), 
      minAmount: 0.1270, 
      perMinuteRate: 0.0245 
    };

  const result = await Client.updateMany(
    {
      'usStatRates.minAmount': { $ne: 0.1270 },
      'usStatRates': { 
        $not: { 
          $elemMatch: { 
            startDate: { $gt: cutoffDate } 
          } 
        } 
      }
    },
    { 
      $push: { 
        usStatRates: newStatRate
      } 
    }
  );
  logger.info(`${result.modifiedCount} client(s) updated.`); 
};

updateStatRates().then(() => {
  logger.info('Congrats Script Completed')
  process.exit(0)
}).catch((err) => {
  logger.error('Something went Wrong!!!', err);
  process.exit(0)
});
