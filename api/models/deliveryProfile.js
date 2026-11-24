const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { DeliveryProfile: { name, schema } } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const deliveryProfileSchema = schema;

deliveryProfileSchema.plugin(mongoosePaginate);

deliveryProfileSchema.pre('save', async function (next) {
  // Validate name is unique under client
  DeliveryProfile.countDocuments({ _id: { $ne: this._id }, clientId: this.clientId, name: this.name })
    .then((count) => {
      // Return error if count is greater than 0
      if (count > 0) {
        return next(new Error('Name is required to be unique'));
        // Else continue with saving
      }
      next();
    })
    .catch((err) => {
      logger.error(err);
      next(err);
    });
});

const DeliveryProfile = mongoose.model(name, deliveryProfileSchema);

module.exports = DeliveryProfile;
