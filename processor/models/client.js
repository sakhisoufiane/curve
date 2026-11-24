const { encryption, configShared } = require('@curveroyaltysystems/platform-shared-utils');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Client: { name, schema } } = require('@curveroyaltysystems/models');

const clientSchema = schema;

clientSchema.pre('save', function (next) {
  if (!this.encryptionKey) {
    const key = encryption.encryptionUtils.createKey();
    this.encryptionKey = encryption.encryptionUtils.encryptKey(key);
  }
  next();
});

// Encryption plugin has to be inserted after all .pre('save') hooks and before all .post('save') hooks
clientSchema.plugin(encryption.encryptionPlugin, {
  encryptedFields: configShared.encryptedFields.client,
});

const Client = mongoose.model(name, clientSchema);

module.exports = Client;
