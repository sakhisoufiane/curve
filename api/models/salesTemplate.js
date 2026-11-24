/**
 * @module salesTemplate
 */
const { logger, fileOpener, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const fs = require('fs');
const async = require('async');
const { SalesTemplate } = require('@curveroyaltysystems/models');
const modelHistory = require('../libs/modelHistory');
const LibraryTemplate = require('./libraryTemplate');

const dir = `${__dirname}/../tmp/`;

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

const salesTemplateSchema = SalesTemplate.schema;

salesTemplateSchema.plugin(modelHistory, { mongoose, name: 'salesTemplatePatches' });
salesTemplateSchema.plugin(mongoosePaginate);

/**
 * Returns the Tab Index of this Sales Template
 *
 * @method
 * @returns {number} The Tab Index starting at 0
 */
salesTemplateSchema.methods.tabIndex = function () {
  let index = 0;
  if (this.tab && this.tab > 0) {
    index = this.tab - 1;
  }
  return index;
};

/**
 * Returns the Header Row Index of this Sales Template
 *
 * @method
 * @returns {number} The Header Row Index starting at 0
 */
salesTemplateSchema.methods.headerRowIndex = function () {
  let index = 0;
  if (this.headerRow && this.headerRow > 0) {
    index = this.headerRow - 1;
  }
  return index;
};

/**
 * Returns the Starting Left Index (Column Index) of this Sales Template
 *
 * @method
 * @returns {number} The Starting Left Index starting at 0
 */
salesTemplateSchema.methods.startingLeftIndex = function () {
  let index = 0;
  if (this.startingLeft && this.startingLeft > 0) {
    index = this.startingLeft - 1;
  }
  return index;
};

/**
 * Returns the Starting Line Index of this Sales Template
 *
 * @method
 * @returns {number} The Starting Line Index starting at 0
 */
salesTemplateSchema.methods.startingLineIndex = function () {
  let index = 0;
  if (this.startingLine && this.startingLine > 0) {
    index = this.startingLine - 1;
  }
  return index;
};

/**
 * Returns the Character Separators of this Sales Template
 *
 * @method
 * @returns {Number[]} Array of numbers containing the Character Separators
 */
salesTemplateSchema.methods.characterSeparators = function () {
  if (this.fileType === 'Character') {
    return this.fields.map((field) => field.characters);
  }
  return null;
};

/**
 * Adds this Sales Template to the Sales Template Library
 *
 * * Calls `callback(err, libraryTemplate)` with `libraryTemplate` containing the created Library Template document
 * * Calls `callback(err, libraryTemplate)` with an `err` message if an error occurs
 *
 * @param {object} curveUser - Curve User object containing the user id (used to add createdBy and lastModifiedBy properties to Library Template)
 * @param {function(string, object)} callback - A callback that handles the response
 */
salesTemplateSchema.methods.addToLibrary = function (curveUser, callback) {
  if (!curveUser) {
    callback(new Error('curveUser is required to be passed'));
  } else {
    const copy = { ...this._doc };
    delete copy._id;
    delete copy.createdAt;
    delete copy.updatedAt;
    delete copy.libraryTemplateId;
    copy.exampleLines = (copy.headerRow && Array.isArray(copy.exampleLines) && copy.exampleLines.length > 0) ? copy.exampleLines.slice(0, 1) : [];
    copy.published = false;
    copy.createdBy = curveUser.id;
    copy.lastModifiedBy = curveUser.id;
    const libraryTemplate = new LibraryTemplate(copy);
    libraryTemplate.save()
      .then((savedLibraryTemplate) => {
        callback(null, savedLibraryTemplate);
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  }
};

/**
 * Extracts Example Lines and Identifiers from the Example Sales Data File attached to this Sales Template
 *
 * * Calls `callback(err, salesTemplate)` with `salesTemplate` containing the updated Sales Template document
 * * Calls `callback(err, salesTemplate)` with an `err` message if an error occurs
 *
 * @param {function(string, object)} callback - A callback that handles the response
 */
salesTemplateSchema.methods.extractExamplesLinesAndIdentifiers = function (callback) {
  const salesTemplate = this;
  // Check file exists
  fileManager.getFileSize(salesTemplate.file, (errGetSize) => {
    if (errGetSize) {
      callback(errGetSize);
    } else {
      // Download file and set example lines
      fileManager.downloadFromS3(salesTemplate.file, process.env.S3_bucket, (errDownload, localFile) => {
        if (errDownload) {
          logger.error(errDownload);
          callback(errDownload);
        } else {
          try {
            const options = {
              tab: salesTemplate.tabIndex(),
              headerRow: salesTemplate.headerRowIndex(),
              startingLine: salesTemplate.startingLineIndex(),
              startingColumn: salesTemplate.startingLeftIndex(),
              delimiter: salesTemplate.delimiter,
              characterSeparators: salesTemplate.characterSeparators(),
              encoding: salesTemplate.encoding,
              maxRows: 20,
              templatefileType: salesTemplate.fileType,
            };
            fileOpener.extractDataAndIdentifiers(localFile, options, (errExtract, data, identification) => {
              if (errExtract) {
                logger.error(errExtract);
                callback(new Error('Error mapping template to sales file. Sales File is saved but may not be matched to the template'));
              } else if (data && identification) {
                fs.unlinkSync(localFile);
                // Add example lines
                salesTemplate.exampleLines = data.slice(0, 11);
                // add identification to template
                if (!salesTemplate.identification) {
                  // create salesTemplate.identification array if not defined
                  salesTemplate.identification = [];
                }
                salesTemplate.identification.push(identification);
                // Update Fields where length is different
                // @tom: This will not reduce fields if there are more columns in the added file than fields on the existing template.
                // ...@tom continued... But unsure if this is an issue or will be a rare occurrence
                salesTemplate.fields = salesTemplate.fields || [];
                async.forEachOf(salesTemplate.exampleLines[0], (ex, index, cb) => {
                  if (!salesTemplate.fields[index]) { salesTemplate.fields.push({ field: null, type: null }); }
                  cb();
                }, () => {
                  salesTemplate.save()
                    .then(() => {
                      callback(null, salesTemplate);
                    })
                    .catch((err) => {
                      logger.error(err);
                      callback(err);
                    });
                });
              } else {
                callback(null, salesTemplate);
              }
            });
          } catch (e) {
            callback(e);
          }
        }
      });
    }
  });
};

salesTemplateSchema.pre('deleteOne', { document: true, query: false }, function (next) {
  const SalesFile = require('./salesFile');
  // Get count of any sales files associated with this template
  SalesFile.countDocuments({ clientId: this.clientId, salesTemplateId: this._id.toString() })
    .then((count) => {
      if (count) {
        logger.error('Sales Template could not be deleted as it is in use on a sales file');
        next(new Error('Sales Template could not be deleted as it is in use on a sales file'));
      } else {
        next();
      }
    })
    .catch((err) => {
      logger.error(err);
      next(err);
    });
});

module.exports = mongoose.model(SalesTemplate.name, salesTemplateSchema);
