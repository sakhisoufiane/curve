/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

const {
  logger,
  fileOpener,
} = require('@curveroyaltysystems/platform-shared-utils');

const fs = require('fs');
const async = require('async');

const getDataByTemplate = (
  file,
  template,
  sheetIndex,
  removeRows,
  dateFormat,
  callback,
) => {
  if (!file && !template) {
    callback('A file and a template are required', null);
  } else if (!file) {
    callback('A file is required', null);
  } else if (!fs.existsSync(file)) {
    callback('The passed file does not exist', null);
  } else if (!template) {
    callback('A template is required', null);
  } else if (template instanceof Array !== true) {
    callback('The template must be an Array', null);
  } else {
    getData(file, sheetIndex, (err, data) => {
      data = data.filter(
        (dataArray, index) => dataArray.length !== 0 || index < removeRows,
      );
      if (err) {
        callback(err, null);
      } else if (!data || !data[0]) {
        callback('Template does not match');
      } else {
        // Set removeRows to zero if not passed
        removeRows = removeRows || 0;
        // Get first row index - requires a workaround for the work IP Chain tab, that the top row are the groupings and not the proper headers
        const firstRowIndex = data[1] && data[1][0] === 'Work ID' ? 1 : 0;
        // Remove any blank values from end of first row - uses remove rows to skip any header row issues like in Work template for IP Chain
        const firstRow = data[firstRowIndex].filter(
          (value) => value && value !== '',
        );
        if (firstRow.length != template.length) {
          logger.error(
            `Template does not match: ${firstRow.length} - ${template.length}`,
          );
          logger.error(firstRow.join(', '));
          callback('Template does not match');
        } else {
          const mappedData = [];
          // Remove header rows
          data.splice(0, removeRows);
          const originalData = JSON.parse(JSON.stringify(data)); // Clone original data
          data = JSON.parse(
            JSON.stringify(data)
              .replace(/[^\x20-\xFF\u0100-\u024F\u0370-\uDFFF]+/g, '')
              .replace(/_x000D_/g, ''),
          );
          async.eachSeries(
            data,
            (row, cb) => {
              mapDataToTemplate(row, template, dateFormat, (err, newData) => {
                if (err) {
                  logger.error(err);
                }
                mappedData.push(newData);
                cb(err);
              });
            },
            (err) => {
              if (err) {
                callback(err, null);
              } else {
                // Mark each row as modified or not to account for later Database query
                mappedData.forEach((row, index) => {
                  // Compare with original data
                  const isModified =
                    JSON.stringify(originalData[index]) !== JSON.stringify(row);
                  if (isModified) {
                    row.modified = true;
                    row.originalRow = originalData[index];
                  }
                });
                callback(null, mappedData);
              }
            },
          );
        }
      }
    });
  }
};
const getData = (file, sheetIndex, callback) => {
  if (!file) {
    callback('A file is required', null);
  } else if (!fs.existsSync(file)) {
    callback('The passed file does not exist', null);
  } else {
    try {
      const options = {
        tab: sheetIndex,
        startingLine: 0,
        startingColumn: 0,
      };
      fileOpener.extractData(file, options, (err, totalTabs, data) => {
        callback(err, data);
      });
    } catch (err) {
      logger.error(err);
      callback('Error opening file, the file format should be xlsx', null);
    }
  }
};

const mapDataToTemplate = async (data, template, dateFormat, callback) => {
  // Expects data to be array of values, and template in the format of [{ key: 'Some Key', type: 'Array', separator: ';' }]
  if (!data && !template) {
    callback('Data and a template is required', null);
  } else if (!data) {
    callback('Data is required', null);
  } else if (data instanceof Array !== true) {
    callback('Data must be an Array', null);
  } else if (!template) {
    callback('Template is required', null);
  } else if (template instanceof Array !== true) {
    callback('Template must be an Array', null);
  } else {
    const mappedData = {};
    async.forEachOf(
      template,
      (templateObject, index, cb) => {
        const value = data[index];
        if (!templateObject) {
          cb(
            'Template does not match, please check the template matches the current version',
          );
        } else if (templateObject.ignore) {
          // Field shoudln't be imported.
          cb();
        } else {
          if (templateObject.type == 'Boolean') {
            // Forces boolean values into being boolean
            if (
              value === true ||
              value === 'TRUE' ||
              value === 'true' ||
              value === 1 ||
              value === '1'
            ) {
              mappedData[templateObject.key] = true;
              // Check for falsey values, don't just assume
            } else if (
              value === false ||
              value === 'FALSE' ||
              value === 'false' ||
              value === 0 ||
              value === '0'
            ) {
              mappedData[templateObject.key] = false;
            }
          } else if (
            value &&
            typeof value === 'string' &&
            templateObject.type == 'Array' &&
            templateObject.separator
          ) {
            // Splits value by the separator, and trims and white space from subsequent values
            mappedData[templateObject.key] = value
              .split(templateObject.separator)
              .map(Function.prototype.call, String.prototype.trim)
              .filter(String);
          } else if (templateObject.type == 'Array') {
            // Forces value into array
            if (value) {
              mappedData[templateObject.key] = [value];
            } else {
              mappedData[templateObject.key] = [];
            }
          } else if (
            templateObject.type == 'Date' &&
            typeof value === 'string' &&
            value != ''
          ) {
            try {
              const splitDate = String(value).trim().split('/');
              const dateFromString =
                dateFormat && dateFormat === 'MM/DD/YYYY'
                  ? new Date(
                      Date.UTC(
                        splitDate[2],
                        parseInt(splitDate[0]) - 1,
                        splitDate[1],
                      ),
                    )
                  : new Date(
                      Date.UTC(
                        splitDate[2],
                        parseInt(splitDate[1]) - 1,
                        splitDate[0],
                      ),
                    );
              if (dateFromString instanceof Date && !isNaN(dateFromString)) {
                mappedData[templateObject.key] = dateFromString;
              }
            } catch (err) {
              logger.error(err);
            }
          } else if (
            templateObject.type == 'Date' &&
            typeof value === 'number'
          ) {
            try {
              const date = getJsDateFromExcel(value);
              if (date instanceof Date && !isNaN(date)) {
                mappedData[templateObject.key] = date;
              }
            } catch (err) {
              logger.error(err);
            }
          } else if (templateObject.type == 'Date' && value !== null) {
            try {
              const date = new Date(value);
              if (date instanceof Date && !isNaN(date)) {
                mappedData[templateObject.key] = date;
              }
            } catch (err) {
              logger.error(err);
            }
          } else if (typeof value === 'string') {
            // checks for null/undefined/empty
            if (value) {
              mappedData[templateObject.key] = value.trim();
            } else {
              mappedData[templateObject.key] = '';
            }
          } else {
            mappedData[templateObject.key] = value;
          }
          cb();
        }
      },
      (err) => {
        if (err) {
          callback(err, null);
        } else {
          callback(null, mappedData);
        }
      },
    );
  }
};

module.exports = { getDataByTemplate };
