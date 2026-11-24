const { ObjectId } = require('mongodb');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const config = require('../../config.json');
const ImportXlsx = require('../../libs/importXlsx');
const Track = require('../../models/track');
const Release = require('../../models/release');
const Work = require('../../models/work');
const Notification = require('../../models/notification');
const Client = require('../../models/client');
const User = require('../../models/user');

async function updateCatalogueIdentifiers({ clientId, catalogueName, file, curveUser }) {
  const user = await User.findById(curveUser.id);
  let catalogue;
  let identifier;
  let model;
  const client = await Client.findById(clientId).select({ clientType: 1 });
  switch (catalogueName) {
    case 'Tracks':
      catalogue = client.clientType === 'Pro' ? config.importTemplates.versions.v2.track.tracks.columns : config.importTemplates.versions.lite.track.tracks.columns;
      identifier = 'isrc';
      model = Track;
      break;
    case 'Releases':
      catalogue = client.clientType === 'Pro' ? config.importTemplates.versions.v2.release.releases.columns : config.importTemplates.versions.lite.release.releases.columns;
      identifier = 'catNo';
      model = Release;
      break;
    case 'Works':
      catalogue = client.clientType === 'Pro' ? config.importTemplates.work : config.importTemplates.liteWork;
      identifier = 'identifier';
      model = Work;
      break;
    default:
      throw new Error(`Invalid catalogue name: ${catalogueName}`);
  }
  let existingItemCatalogue;
  try {
    const bulkUpdate = [];
    const data = await new Promise((resolve, reject) => {
      ImportXlsx.getDataByTemplate(file.path, catalogue, 0, 2, null, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
    logger.info(`${user?.email} - Updating ${identifier} for Client ${clientId} | Catalogue Ids:`, data?.map((item) => item._id).join(', '));

    // Check for duplicates on the file
    const identifierCount = {};
    for (const item of data) {
      const code = item[identifier];

      if (identifierCount[code]) {
        logger.info(`Duplicate found for code ${code}.`);
        throw new Error(`Duplicate found for code ${code}. Please check your import document does not contain duplicates!`);
      } else {
        identifierCount[code] = 1;
      }
    }
    // Check for duplicates in Curve
    for (const item of data) {
      try {
        // eslint-disable-next-line no-await-in-loop
        existingItemCatalogue = await model.findOne({ clientId, [identifier]: String(item[identifier]) });

        if (existingItemCatalogue) {
          throw new Error(`${identifier}: ${item[identifier]} already exists on ${existingItemCatalogue._id}`);
        }

        if (item._id) {
          bulkUpdate.push({
            updateOne: {
              filter: { _id: new ObjectId(item._id), clientId },
              update: { $set: { [identifier]: item[identifier], lastModified: curveUser.id } },
            },
          });
        } else {
          logger.warn(`Item missing _id: ${JSON.stringify(item)}`);
        }
      } catch (error) {
        logger.error(`Error in updating catalogue: ${error.message}`);
        throw new Error(`${identifier}: ${item[identifier]} already exists on ${existingItemCatalogue.id}`);
      }
    }

    if (bulkUpdate.length > 0) {
      await model.bulkWrite(bulkUpdate);
      curveUser.id = new ObjectId(curveUser.id);
      const generateOptions = {
        identifier: 'genericComplete',
        curveUser,
        client,
        subject: `Your ${catalogueName} ${identifier} have been updated, ${bulkUpdate.length} ${catalogueName} Updated`,
        file,
        count: bulkUpdate.length,
      };
      await new Promise((resolve, reject) => {
        Notification.generate(`${bulkUpdate.length} ${catalogueName} have been updated`, null, null, curveUser, generateOptions, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    } else {
    }
  } catch (err) {
    const generateOptions = {
      identifier: 'genericError',
      curveUser,
      client,
      subject: `Your ${catalogueName} ${identifier} update has Errored.`,
      mainText: `Your ${catalogueName} ${identifier} update has Errored.`,
      closingText: '',
      error: [`${err}`],
    };
    await new Promise((resolve, reject) => {
      Notification.generate(`Error updating ${catalogueName} identifiers:`, null, null, curveUser, generateOptions, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    logger.error(`Error updating catalogue identifiers: ${err.message}`, err);
  }
}

module.exports = { updateCatalogueIdentifiers };
