const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Company: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');

const companySchema = schema;

companySchema.post('init', (company) => {
  if (company.logo) {
    fileManager.publicS3Link(company.logo, (err, link) => {
      company.publicLogo = link;
    });
  }
});

companySchema.plugin(mongoosePaginate);

const Company = mongoose.model(name, companySchema);

module.exports = Company;
