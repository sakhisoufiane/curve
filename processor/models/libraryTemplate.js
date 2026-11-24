/**
 * @module libraryTemplate
 */
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { LibraryTemplate: { name, schema } } = require('@curveroyaltysystems/models');
const Client = require('./client');

/**
 * libraryTemplateSchema schema
 * @constructor libraryTemplateSchema
 */
const libraryTemplateSchema = schema;

/**
 * Returns the Tab Index of this Library Template
 *
 * @method
 * @returns {number} The Tab Index starting at 0
 */
libraryTemplateSchema.methods.tabIndex = function () {
  let index = 0;
  if (this.tab && this.tab > 0) {
    index = this.tab - 1;
  }
  return index;
};

/**
 * Returns the Starting Left Index (Column Index) of this Library Template
 *
 * @method
 * @returns {number} The Starting Left Index starting at 0
 */
libraryTemplateSchema.methods.startingLeftIndex = function () {
  let index = 0;
  if (this.startingLeft && this.startingLeft > 0) {
    index = this.startingLeft - 1;
  }
  return index;
};

/**
 * Returns the Starting Line Index of this Library Template
 *
 * @method
 * @returns {number} The Starting Line Index starting at 0
 */
libraryTemplateSchema.methods.startingLineIndex = function () {
  let index = 0;
  if (this.startingLine && this.startingLine > 0) {
    index = this.startingLine - 1;
  }
  return index;
};

/**
 * Creates a Sales Template from this Library Template
 *
 * * Calls `callback(err, salesTemplate)` with `salesTemplate` containing the Sales File document
 * * Calls `callback(err, salesTemplate)` with an `err` if an error occurs
 *
 * @param {object} clientId - The client id to add
 * @param {function(string, object)} callback - A callback that handles the response
 */
libraryTemplateSchema.methods.createSalesTemplate = function (clientId, callback) {
  const SalesTemplate = require('./salesTemplate');

  Client.findById(clientId)
    .then((client) => {
      if (client) {
        const copy = { ...this._doc };
        copy.libraryTemplateId = copy._id;
        delete copy._id;
        delete copy.createdAt;
        delete copy.updatedAt;

        // Only copy client mappings that are available for the client
        copy.distributionChannels = copy.distributionChannels.filter((distributionChannel) => client.distributionChannels.includes(distributionChannel.name));
        copy.configurations = copy.configurations.filter((configuration) => client.configurations.includes(configuration.name));
        copy.priceCategories = copy.priceCategories.filter((priceCategory) => client.priceCategories.includes(priceCategory.name));

        // Set client
        copy.clientId = clientId;
        delete copy.createdBy;
        delete copy.lastModifiedBy;
        const salesTemplate = new SalesTemplate(copy);
        salesTemplate.save()
          .then(() => {
            callback(null, salesTemplate);
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      } else {
        callback('Client not found');
      }
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};

const LibraryTemplate = mongoose.model(name, libraryTemplateSchema);

module.exports = LibraryTemplate;
