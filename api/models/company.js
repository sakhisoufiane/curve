const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { Company: { name, schema } } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const modelHistory = require('../libs/modelHistory');

const companySchema = schema;

companySchema.pre('save', function (next) {
  // Validate name is unique under client
  Company.countDocuments({ _id: { $ne: this._id }, clientId: this.clientId, name: this.name })
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
      // Maintain passing without error, should probably be changed
      next();
    });
});

companySchema.post('init', (company) => {
  if (company.logo) {
    fileManager.publicS3Link(company.logo, (err, link) => {
      company.publicLogo = link;
    });
  }
});

companySchema.plugin(modelHistory, { mongoose, name: 'companyPatches', useArchive: true, removePatches: true });
companySchema.plugin(mongoosePaginate);

const Company = mongoose.model(name, companySchema);

module.exports = Company;
