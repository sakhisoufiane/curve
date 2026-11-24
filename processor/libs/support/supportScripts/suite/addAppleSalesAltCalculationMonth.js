require('dotenv').config();
require('../../../../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const AppSettings = require('../../../../models/appSettings');

const addAppleSalesAltCalculationMonth = (monthAndYear, callback) => {
  AppSettings.findOne({})
    .then((appSetting) => {
      if (!appSetting) {
        logger.error('No app settings found');
        return callback('No app settings found');
      }

      appSetting.appleSalesAltCalculationMonths.push(monthAndYear);
      appSetting.save()
        .then((savedAppSettings) => {
          callback(null, savedAppSettings);
        })
        .catch((err) => {
          logger.error('Error saving AppSettings in addAppleSalesAltCalculationMonth:', err);
          callback(err);
        });

      // @Arjun: We are calling callback twice here no?
      callback();
    })
    .catch((err) => {
      logger.error('Error finding AppSettings in addAppleSalesAltCalculationMonth:', err);
      callback(err);
    });
};

module.exports = { addAppleSalesAltCalculationMonth };
