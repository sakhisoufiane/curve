/**
 * @module libraryTemplate
 */
const { logger, fileOpener, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { LibraryTemplate } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const fs = require('fs');
const async = require('async');
const modelHistory = require('../libs/modelHistory');

const dir = `${__dirname}/../tmp/`;

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

/**
 * libraryTemplateSchema schema
 * @constructor libraryTemplateSchema
 */
const libraryTemplateSchema = LibraryTemplate.schema;

libraryTemplateSchema.plugin(modelHistory, { mongoose, name: 'libraryTemplatePatches' });
libraryTemplateSchema.plugin(mongoosePaginate);

/**
 * Checks if the supplied user is forbidden to access Library Template data, either for reading or writing
 *
 * @method
 * @param {object} user - The user object
 * @param {string} readWrite - Supplied as either "read" or "write" to check for "read" or "write" access
 * @returns {boolean} Returns false if user is allowed access, true if not
 */
libraryTemplateSchema.methods.userForbidden = function (user) {
  if (!user.internal) {
    // Only available to a client
    return true;
  }
  return false;
};

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
 * Returns the Header Row Index of this Library Template
 *
 * @method
 * @returns {number} The Header Row Index starting at 0
 */
libraryTemplateSchema.methods.headerRowIndex = function () {
  let index = 0;
  if (this.headerRow && this.headerRow > 0) {
    index = this.headerRow - 1;
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
 * Returns the Character Separators of this Library Template
 *
 * @method
 * @returns {Number[]} Array of numbers containing the Character Separators
 */
libraryTemplateSchema.methods.characterSeparators = function () {
  if (this.fileType === 'Character') {
    return this.fields.map((field) => field.characters);
  }
  return null;
};

/**
 * Creates a Sales Template from this Library Template
 *
 * * Calls `callback(err, salesTemplate)` with `salesTemplate` containing the Sales File document
 * * Calls `callback(err, salesTemplate)` with an `err` message if an error occurs
 *
 * @param {object} curveUser - User object
 * @param {function(string, object)} callback - A callback that handles the response
 */
libraryTemplateSchema.methods.createSalesTemplate = function (curveUser, callback) {
  const Client = require('./client');
  const SalesTemplate = require('./salesTemplate');
  if (!curveUser) {
    callback(new Error('curveUser is required to be passed'));
  } else {
    Client.findById(curveUser.clientId)
      .then((client) => {
        if (client) {
          const copy = { ...this._doc };
          copy.libraryTemplateId = copy._id;
          delete copy._id;
          delete copy.createdAt;
          delete copy.updatedAt;
          copy.exampleLines = (copy.headerRow && Array.isArray(copy.exampleLines) && copy.exampleLines.length > 0) ? copy.exampleLines.slice(0, 1) : [];

          // Only copy client mappings that are available for the client
          copy.distributionChannels = copy.distributionChannels.filter((distributionChannel) => client.distributionChannels.includes(distributionChannel.name));
          copy.configurations = copy.configurations.filter((configuration) => client.configurations.includes(configuration.name));
          copy.priceCategories = copy.priceCategories.filter((priceCategory) => client.priceCategories.includes(priceCategory.name));

          // Set client
          copy.clientId = curveUser.clientId;
          copy.createdBy = curveUser.id;
          copy.lastModifiedBy = curveUser.id;
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
        callback(err || 'Client not found');
      });
  }
};

/**
 * Extracts Example Lines and Identifiers from the Example Sales Data File attached to this Library Template
 *
 * * Calls `callback(err, libraryTemplate)` with `libraryTemplate` containing the updated Sales Template document
 * * Calls `callback(err, libraryTemplate)` with an `err` message string if an error occurs
 *
 * @param {function(string, object)} callback - A callback that handles the response
 */
libraryTemplateSchema.methods.extractExamplesLinesAndIdentifiers = function (callback) {
  const libraryTemplate = this;
  // Check file exists
  fileManager.getFileSize(libraryTemplate.file, (errGetSize) => {
    if (errGetSize) {
      // @tom: should this not log and/or return the error?
      callback();
    } else {
      fileManager.downloadFromS3(libraryTemplate.file, process.env.S3_bucket, (errDownload, localFile) => {
        if (errDownload) {
          logger.error(errDownload);
          callback(errDownload);
        } else {
          const options = {
            tab: libraryTemplate.tabIndex(),
            headerRow: libraryTemplate.headerRowIndex(),
            startingLine: libraryTemplate.startingLineIndex(),
            startingColumn: libraryTemplate.startingLeftIndex(),
            delimiter: libraryTemplate.delimiter,
            characterSeparators: libraryTemplate.characterSeparators(),
            encoding: libraryTemplate.encoding,
            maxRows: 20,
            templatefileType: libraryTemplate.fileType,
          };
          fileOpener.extractDataAndIdentifiers(localFile, options, (errExtract, data, identification) => {
            if (errExtract) {
              logger.error(errExtract);
              callback(new Error('Error mapping template to sales file. Sales File is saved but may not be matched to the template'));
            } else if (data && identification) {
              fs.unlinkSync(localFile);
              // Add example lines
              libraryTemplate.exampleLines = data.slice(0, 11);
              // Add identification to template
              if (!libraryTemplate.identification) {
                // create libraryTemplate.identification array if not defined
                libraryTemplate.identification = [];
              }
              libraryTemplate.identification.push(identification);
              // Update Fields where length is different
              libraryTemplate.fields = libraryTemplate.fields || [];
              async.forEachOf(libraryTemplate.exampleLines[0], (ex, index, cb) => {
                if (!libraryTemplate.fields[index]) { libraryTemplate.fields.push({ field: null, type: null }); }
                cb();
              }, () => {
                libraryTemplate.save()
                  .then(() => {
                    callback(null, libraryTemplate);
                  })
                  .catch((err) => {
                    logger.error(err);
                    callback(err);
                  });
              });
            } else {
              callback(null, libraryTemplate);
            }
          });
        }
      });
    }
  });
};

module.exports = mongoose.model(LibraryTemplate.name, libraryTemplateSchema);
