const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { Invoice } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const invoiceSchema = Invoice.schema;

invoiceSchema.plugin(mongoosePaginate);

invoiceSchema.post('init', (invoice) => {
  if (invoice.file) {
    fileManager.publicS3Link(invoice.file, (err, publicLink) => {
      invoice.publicLink = publicLink;
    });
  }
});

invoiceSchema.statics.paramsToFilterField = function (inputParams, curveUser) {
  // Creates filter for find from inputParams
  // Prepare result
  let params = {};
  if (!curveUser) {
    throw (new Error('A curveUser is required'));
  } else if (curveUser && !curveUser.payeeId && !curveUser.clientId) {
    throw (new Error('curveUser is required to have one of clientId or payeeId'));
  } else {
    // If request coming from a payee
    if (curveUser.clientId) {
      params = { clientId: curveUser.clientId };
    }
    // When text value is passed
    if (inputParams && inputParams.text) {
      const regex = new RegExp(inputParams.text, 'i');
      params.name = { $regex: regex };
    }
    // Return object
    return params;
  }
};

module.exports = mongoose.model(Invoice.name, invoiceSchema);
