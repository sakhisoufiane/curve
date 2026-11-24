require('dotenv').config();
require('../../../../models/db');
const async = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const SalesTemplate = require('../../../../models/salesTemplate');

const copyTemplatesToOtherClient = (copyFromClient, copyToClient, callback) => {
  SalesTemplate.find({ clientId: copyFromClient, archived: false })
    .then((templates) => {
      if (templates) {
        async.eachSeries(templates, (template, cb) => {
          logger.debug(`copying template: '${template.name}' from client ${copyFromClient} to client ${copyToClient}`);
          const copy = { ...template._doc };
          delete copy._id;
          delete copy.file;
          copy.clientId = copyToClient;
          const salesTemplate = new SalesTemplate(copy);
          salesTemplate.save()
            .then((savedSalesTemplate) => {
              cb(null, savedSalesTemplate);
            })
            .catch((saveErr) => {
              logger.error('Error saving template:', saveErr);
              cb(saveErr);
            });
        }, (eachErr) => {
          if (eachErr) {
            callback(eachErr);
          } else {
            logger.debug('Complete');
            callback();
          }
        });
      } else {
        logger.error('no templates found');
        callback();
      }
    })
    .catch((findErr) => {
      logger.error('Error finding templates:', findErr);
      callback(findErr);
    });
};
module.exports = { copyTemplatesToOtherClient };
