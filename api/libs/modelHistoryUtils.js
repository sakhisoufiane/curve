const { logger, encryption } = require('@curveroyaltysystems/platform-shared-utils');
const _ = require('lodash');

const Client = require('../models/client');

module.exports = {
  decryptPatches: async (patches, document, encryptedFields, isClientAdminUser) => {
    if (patches) {
      const encryptionKey = await encryption.encryptionUtils.getEncryptionKey(document, Client).catch((keyErr) => {
        logger.error(`Error while getting encryption key within modelHistoryUtils.decryptPatches, clientId: ${document.clientId}, document id: ${document._id}`, keyErr);
      });

      // Loop through patches
      for (const patch of patches) {
        patch.ops = patch.ops.map((entry) => {
          const pathDotNotation = entry.path?.substring(1).replaceAll('/', '.');
          const matches = encryptedFields.filter((field) => {
            // if the path contains the path of an encrypted field, we need to encrypt
            if (pathDotNotation.indexOf(field) === 0) {
              return true;
            }
            // if the encrypted field path contains the entry path, we need to check if value of this is an object and if the remainder of the encrypted field path is contained, and also encrypt
            if (field.indexOf(pathDotNotation) === 0) {
              const val = encryption.encryptionUtils.decryptField(entry.value, encryptionKey);
              if (val) {
                const subPath = field.substring(pathDotNotation.length + 1);
                const contained = _.get(val, subPath);
                return contained;
              }
            }
          });
          if (matches.length > 0) {
            // if not client admin user, we remove the entry (returning as null and removal dealt with in .filter after)
            if (!isClientAdminUser) {
              return false;
            // otherwise we decrypt the values
            }
            entry.value = encryption.encryptionUtils.decryptField(entry.value, encryptionKey);
            if (entry.originalValue) {
              entry.originalValue = encryption.encryptionUtils.decryptField(entry.originalValue, encryptionKey);
            }
          }
          return entry;
        }).filter(Boolean); // filter out any entries that have been set to null due to non-admin user
      }
      // remove any patches that contain no more ops (due to all of the ops entries having been removed for non-admin users)
      patches = patches.map((patch) => {
        if (patch.ops && patch.ops.length > 0) {
          return patch;
        }
      }).filter(Boolean);
    }
    return patches;
  },
};
