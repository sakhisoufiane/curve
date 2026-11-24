/**
 * @module fileOpener
 */
const async = require('async');
const chardet = require('chardet');
const csv = require('fast-csv');
const fs = require('fs');
const LineByLineReader = require('line-by-line');
const path = require('path');
const XLSX = require('@e965/xlsx');
const XLSXExtract = require('xlsx-extract').XLSX;
const ExcelJS = require('exceljs');
const { exec } = require('child_process');

const AxfReader = require('./axfReader');
const { CrdReader } = require('./crd/crdReader');
const EdiReader = require('./ediReader');
const logger = require('./logger');
const TemplateMatcher = require('./templateMatcher');

const templateMatcher = new TemplateMatcher();

const txtFileExtensions = [
  '.txt',
  '.dat',
  '.tsv',
  '.020',
  '.021',
  '.022',
  '.200',
  '.210',
  '.220',
  '.301',
  '.302',
  '.303',
  '.304',
  '.crd',
  '.roy',
  '.gdf',
  '.tab',
];

// ******* Helper functions *******

/**
 * Takes in a worksheet extracted by XLSX library and returns an array of rows for this sheet.
 * Optionally stops on line defined in stopAtLine
 *
 * @param {object} worksheet - worksheet extracted by XLSX library
 * @param {number} [stopAtLine] - The line to stop on
 * @returns {array} The extracted data rows
 */
function arrayFromXlsRange(worksheet, stopAtLine, callback) {
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  const result = [];
  let row;
  let cell;
  let cellData;
  let R;
  let C;
  // check if the A cell on the row after the last row detected by decode_range contains anything
  if (worksheet[`A${range.e.r + 2}`]) {
    // if it is defined it means the file actually has more rows than have been detected and we would have missing rows in the output
    callback(new Error('Sheet contains more rows than have been decoded by decode_range'));
  } else {
    const endRow = !stopAtLine || range.e.r < stopAtLine ? range.e.r : stopAtLine - 1;
    const endCol = range.e.c < 200 ? range.e.c : 200;
    for (R = range.s.r; R <= endRow; R += 1) {
      row = [];
      for (C = range.s.c; C <= endCol; C += 1) {
        cell = worksheet[XLSX.utils.encode_cell({ c: C, r: parseInt(R, 10) })];
        cellData = cell && cell.t ? cell.v : '';
        row.push(cellData);
      }
      result.push(row);
    }
    callback(null, result);
  }
}

/**
 * For .xls, this function extracts data from the workbook object.
 * We call this when XLSX reader is set to dense: true, this is to make up for the different data structure
 *
 * @param {array} worksheet - worksheet extracted by XLSX library
 * @returns {array} The extracted data rows
 */
function arrayFromXlsDense(worksheet, callback) {
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  if (worksheet[`A${range.e.r + 2}`]) {
    return callback(new Error('Sheet contains more rows than have been decoded by decode_range'));
  }

  const result = [];

  for (const row of worksheet['!data']) {
    const formattedRow = [];

    for (const cell of row) {
      const cellData = cell && cell.t ? cell.v : '';
      formattedRow.push(cellData);
    }

    result.push(formattedRow);
  }

  return callback(null, result);
}

/**
 * Extracts one sheet from file using XLSXExtract library
 *
 * * Calls `callback(err, result)` with `result` containing the extracted data rows
 * * Calls `callback(err, result)` with an `err` message if an error occurs
 *
 * @param {string} file - File path to data file
 * @param {number} tab - Number of sheet to extract
 * @param {number} [maxRows] - Maximum number of lines to extract
 * @param {function(string, array[])} callback - A callback that handles the response
 */
function xlsxExtractSheet(file, tab, maxRows, callback) {
  let count = 0;
  const result = [];
  let callbackCalled = false;
  new XLSXExtract()
    .extract(file, { sheet_nr: tab + 1, include_empty_rows: true, round_floats: false })
    .on('row', (data) => {
      if (!(maxRows && count >= maxRows)) {
        count += 1;
        result.push(data);
      }
    })
    .on('error', (err) => {
      logger.error(err);
      if (!callbackCalled) {
        callbackCalled = true;
        callback(new Error('There was an error reading the Excel file. Check file is valid.'));
      }
    })
    .on('end', () => {
      if (!callbackCalled) {
        callbackCalled = true;
        callback(null, result);
      }
    });
}

/**
 * Extracts the desired results from the Sales Data, according to *startingLine* and *startingColumn*
 *
 * @param {array[]} data - Sales Data
 * @param {number} startingLine - Starting line to extract from (first line = 0)
 * @param {number} startingColumn - Starting column to extract from (first column = 0)
 * @returns {array[]} Array of extracted data rows as arrays
 */
function extractResults(data, startingLine, startingColumn) {
  if (startingLine && startingLine > 0) data.splice(0, startingLine);
  if (startingColumn && startingColumn > 0) {
    data.forEach((row) => {
      row.splice(0, startingColumn);
    });
  }
  return data;
}

/**
 * Removes any unwanted characters from the Sales Data
 * * changes `="Text Data"` to `Text Data` (entire field only)
 * * changes `"Text Data"` to `Text Data` (entire field only)
 *
 * @param {array[]} data - Sales Data
 * @returns {array[]} Array of data rows as arrays with unwanted characters removed
 */
function removeUnwantedCharacters(data) {
  let dataNew;
  const regex = /^=?"(.*)"$/;
  if (Array.isArray(data)) {
    dataNew = data.map((row) => {
      if (Array.isArray(row)) {
        return row.map((field) => {
          if (field && typeof field === 'string' && field.match(regex)) {
            let fieldTrimmed = field.replace(regex, '$1'); // remove surrounding quotation marks
            fieldTrimmed = fieldTrimmed.replace(/""/g, '"'); // replace any double "" with single "
            return fieldTrimmed;
          }
          return field;
        });
      }
      return row;
    });
  }
  return dataNew;
}

/**
 * Separates array of strings into a data array split by character separators as defined in characterSeparators array
 *
 * * Calls `callback(err, array)` with `array` containing the data rows as arrays
 * * Calls `callback(err, array)` with an `err` message if an error occurs
 *
 * @param {array} data - Data array to process
 * @param {number[]} characterSeparators - Array containing length of each column to split by
 * @param {string} originalDelimiter - The delimiter used to originally split the file
 * @param {function(string, array[])} callback - A callback that handles the response
 */
function separateByCharacters(data, characterSeparators, originalDelimiter, callback) {
  try {
    const result = data.map((line) => {
      let thisLine = line.join(originalDelimiter);
      // var line = line.join('').replace(/ /g, "_"); @tom: is this required in API? Seems the Front End already adds the underscores instead of spaces? Have commented out for now.
      const output = [];
      characterSeparators.forEach((character) => {
        const thisCharacter = character || 0;
        output.push(thisLine.slice(0, thisCharacter));
        thisLine = thisLine.substring(thisCharacter);
      });
      output.push(thisLine);
      return output;
    });
    callback(null, result);
  } catch (err) {
    logger.error(err);
    callback(
      new Error(
        'There was an error in separating the file by the separator. Check the file and separator and try again.'
      )
    );
  }
}

module.exports = {
  /**
   * Checks file extension, extracts tabulated data from the supplied file.
   *
   * * Calls `callback(err, totalTabs, data)`
   *   * `totalTabs` the number of tabs in the file
   *   * `data` containing the extracted data rows
   *   * `nextChunkStart` set to the start of the next chunk to read from the file (optional)
   * * Calls `callback(err)` with an `err` message if an error occurs
   *
   * @param {string} file - File path to data file
   * @param {object}  options - Used to pass options to function
   * @param {number}   options.tab - Number of tab to extract
   * @param {number}   [options.startingLine] - Starting line to extract from (first line = 0)
   * @param {number}   [options.startingColumn] - Starting column to extract from (first column = 0)
   * @param {number[]} [options.characterSeparators] - Array containing length of each column to split by
   * @param {string}   [options.delimiter] - Delimiter to use
   * @param {string}   [options.encoding] - Encoding type
   * @param {boolean}  [options.returnAllTabs] - Flag to set if all tabs in the file should be extracted
   * @param {number}   [options.maxRows] - Maximum number of lines to extract
   * @param {number}   [options.chunkStart] - Start line when reading a chunk of data only
   * @param {string}   [options.templatefileType] - Type of template being used for the sales file (only current usage: "CRD")
   * @param {function(Error, number, array[], [number])} callback - A callback that handles the response. Takes either an error, or the total tab count, an array of the extracted data, and the start point for the next batch
   */
  extractData(file, options, callback) {
    const fileOpener = this;
    if (fs.existsSync(file)) {
      async.waterfall(
        [
          function (cb) {
            fileOpener.detectExtension(file, cb);
          },
          function (type, cb) {
            // if no encoding was supplied, try to detect it from file
            if (!options.encoding) {
              fileOpener.detectEncoding(file, (err, encoding) => {
                options.encoding = encoding;
                cb(null, type);
              });
            } else {
              cb(null, type);
            }
          },
          function (type, cb) {
            logger.debug(type);
            fileOpener.readData(file, type, options, cb);
          },
          function (totalTabs, tabs, tabNames, nextChunkStart, cb) {
            if (tabs && tabs[0]) {
              const data = extractResults(tabs[0], options.startingLine, options.startingColumn, cb);
              if (options.characterSeparators) {
                const delimiter = determineDelimiter(options.delimiter, '\t');
                separateByCharacters(data, options.characterSeparators, delimiter, (err, data2) => {
                  cb(err, totalTabs, data2, nextChunkStart);
                });
              } else {
                cb(null, totalTabs, data, nextChunkStart);
              }
            } else {
              cb(
                new Error(
                  'No data was returned when reading the file. Check file is valid and if the template used is correct and pointing at the correct tab.'
                )
              );
            }
          },
          function (totalTabs, data, nextChunkStart, cb) {
            const dataNew = removeUnwantedCharacters(data);
            cb(null, totalTabs, dataNew, nextChunkStart);
          },
        ],
        callback
      );
    } else {
      logger.error('Local file is missing in fileOpener.extractData');
      callback(new Error('File does not exist'), null);
    }
  },

  /**
   * Extracts data and identifiers from file.
   *
   * * Calls `callback(err, output)` with `output` containing the extracted data rows, total tabs & identification
   * * Calls `callback(err, output)` with an `err` message if an error occurs
   *
   * @static
   * @see {@link templateMatcher}
   * @param {string} file - File path to data file
   * @param {object}  options - Used to pass options to function
   * @param {number}  options.tab - Number of tab to extract
   * @param {number}  options.headerRow - Position of header row (starting from 0)
   * @param {number}  options.startingLine - Line to start from (starting from 0)
   * @param {number}  options.startingColumn - Column to start from (starting from 0)
   * @param {string}  [options.delimiter] - Delimiter to use
   * @param {string}  [options.characterSeparators] - Character separators
   * @param {string}  [options.encoding] - Encoding type
   * @param {number}  [options.maxRows] - Maximum number of lines to extract
   * @param {string}  [options.templatefileType] - Type of template being used for the sales file (only current usage: "CRD")
   * @param {function(string, object)} callback - A callback that handles the response
   */
  extractDataAndIdentifiers(file, options, callback) {
    const fileOpener = this;
    const optionsForReadData = {
      tab: options.tab,
      delimiter: options.delimiter,
      encoding: options.encoding,
      templatefileType: options.templatefileType,
      maxRows: options.maxRows + options.startingLine,
    };
    if (fs.existsSync(file)) {
      async.waterfall(
        [
          function (cb) {
            fileOpener.detectExtension(file, cb);
          },
          function (type, cb) {
            // if no encoding was supplied, try to detect it from file
            if (!options.encoding) {
              fileOpener.detectEncoding(file, (err, encoding) => {
                optionsForReadData.encoding = encoding;
                cb(null, type);
              });
            } else {
              cb(null, type);
            }
          },
          function (type, cb) {
            fileOpener.readData(file, type, optionsForReadData, (err, totalTabs, tabs, tabNames, nextChunkStart) => {
              cb(err, totalTabs, tabs, type);
            });
          },
          function (totalTabs, tabs, type, cb) {
            let data = tabs[0]; // holds the data to be returned in the cb callbacks below
            const headerRowData = data[options.headerRow] || [];
            // reduce data to start at starting row and starting column
            if (options.startingLine > 0) data.splice(0, options.startingLine);
            if (options.startingColumn > 0) {
              headerRowData.splice(0, options.startingColumn);
              data.forEach((row) => {
                row.splice(0, options.startingColumn);
              });
            }
            data.unshift(headerRowData);
            data = removeUnwantedCharacters(data);

            if (!options.delimiter) {
              const identification = templateMatcher.buildIdentification(totalTabs, tabs[0]);
              cb(null, data, identification);
            } else {
              // if a delimiter is set for the template we need to read the data again without it to ensure that we generate the correct identification
              const optionsForReadData2 = { ...optionsForReadData };
              delete optionsForReadData2.delimiter;
              fileOpener.readData(
                file,
                type,
                optionsForReadData2,
                (err, totalTabs2, tabs2, tabNames, nextChunkStart) => {
                  if (err) {
                    cb(err);
                  } else {
                    const identification2 = templateMatcher.buildIdentification(totalTabs2, tabs2[0]);
                    cb(null, data, identification2);
                  }
                }
              );
            }
          },

          function (data, identification, cb) {
            if (options.characterSeparators) {
              const delimiter = determineDelimiter(options.delimiter, '\t');
              separateByCharacters(data, options.characterSeparators, delimiter, (err2, data2) => {
                cb(err2, data2, identification);
              });
            } else {
              cb(null, data, identification);
            }
          },
        ],
        callback
      );
    } else {
      callback('File does not exist');
    }
  },

  /**
   * Extracts identifiers from file.
   *
   * * Calls `callback(err, identifiers, tabNames)` with
   *   * `identifiers` containing the extracted identifiers
   *   * `tabNames` an array of all tab names if detected (only applicable to Excel files)
   * * Calls `callback(err, identifiers, tabNames)` with an `err` message if an error occurs
   *
   * @see {@link templateMatcher}
   * @param {string} file - File path to data file
   * @param {function(string, array, array)} callback - A callback that handles the response
   */
  extractIdentifiers(file, callback) {
    const fileOpener = this;
    if (fs.existsSync(file)) {
      async.waterfall(
        [
          function (cb) {
            fileOpener.detectExtension(file, cb);
          },
          function (type, cb) {
            fileOpener.detectEncoding(file, (err, encoding) => {
              cb(null, type, encoding);
            });
          },
          function (type, encoding, cb) {
            const options = { returnAllTabs: true, maxRows: 20, encoding };
            fileOpener.readData(file, type, options, cb);
          },
        ],
        (err, totalTabs, tabs, tabNames, nextChunkStart) => {
          if (err) callback(err);
          else {
            let identifiers = [];
            if (tabs) {
              identifiers = tabs.map((rows) => templateMatcher.buildIdentification(totalTabs, rows));
            }
            callback(null, identifiers, tabNames);
          }
        }
      );
    } else {
      logger.error('Local file is missing in fileOpener.extractIdentifiers');
      callback(new Error('File does not exist'), null);
    }
  },

  /**
   * Returns the extension of the supplied file.
   *
   * * Calls `callback(err, extension)` with the `extension` of the supplied file (e.g. ".xls")
   * * Calls `callback(err, extension)` with an `err` message if file extension doesn't match the list of allowed sales file extensions
   *
   * @param {string} file - File path to data file
   * @param {function(string, string)} callback - A callback that handles the response
   */
  detectExtension(file, callback) {
    if (typeof file === 'string') {
      let extension = path.extname(file);
      if (typeof extension === 'string') {
        extension = extension.toLowerCase();
      }
      if (txtFileExtensions.concat(['.csv', '.xls', '.xlsx', '.xlsb', '.axf']).includes(extension)) {
        callback(null, extension);
      } else {
        callback(new Error(`Unknown file type with extension of ${extension}`), null);
      }
    } else {
      callback(new Error('File does not exist'), null);
    }
  },

  /**
   * Checks the file type of the supplied file by calling `file "{filepath}"`
   *
   * * Calls `callback(err, fileType)` with `fileType` containing the fileType, if detected
   * * currently only checks for Text Files, or anything else that is out of the ordinary
   *
   * @param {string} file - File path to data file
   * @param {function(string)} callback - A callback that handles the response
   */
  detectFileType(file, callback) {
    let fileType;
    exec(`file "${file}"`, (err, output) => {
      if (err) {
        logger.error(`detectFileType Errored for file: ${file}`);
      }
      if (output && output.match(/(UTF-(8|16) Unicode text)|(ASCII text)|(filesystem data)|(Linux)/)) {
        fileType = 'txt';
      }
      callback(fileType);
    });
  },

  /**
   * Checks the encoding of the supplied file
   *
   * * Calls `callback(err, encoding)` with `encoding` containing the encoding, if detected - `err` is always returned as `null`, reserved for future use
   *
   * @param {string} file - File path to data file
   * @param {function(string)} callback - A callback that handles the response
   */
  detectEncoding(file, callback) {
    const stats = fs.statSync(file);
    // If the file is larger than >1mb use a smaller sample size to prevent performance issues
    // Otherwise read the whole file for better accuracy
    let sampleSize = stats.size > 1_000_000 ? 500_000 : null;
    // For really large files (>30mb) we have to use a larger sample size to correctly detect the encoding
    if (stats.size > 30_000_000) sampleSize = 1_000_000;
    chardet.detectFile(file, { sampleSize }).then((encoding) => {
      let encodingConverted;
      if (encoding === 'UTF-16LE') encodingConverted = 'utf16le';
      if (encoding === 'UTF-8') encodingConverted = 'utf8';
      if (encoding === 'ISO-8859-1') encodingConverted = 'latin1';
      if (!encodingConverted) {
        logger.error(`detected non-supported encoding '${encoding}' while reading file '${file}'`);
      }
      callback(null, encodingConverted);
    });
  },

  /**
   * According to file extension, calls relevant functions to extract data from file.
   *
   * * Calls `callback(err, totalTabs, tabs, sheetNames, nextChunkStart)` with
   *   * `tabs` containing the extracted data rows for all tabs (if returnAllTabs set to true)
   *   * `totalTabs` the number of tabs in the file
   *   * `sheetNames` an array of all tab names if detected (only applicable to Excel files)
   *   * `nextChunkStart` set to the start of the next chunk to read from the file (optional)
   * * Calls `callback(err, totalTabs, tabs, sheetNames)` with an `err` message if an error occurs
   *
   * @param {string} file - File path to data file
   * @param {string} type - file extension formatted as .ext
   * @param {object}  options - Used to pass options to function
   * @param {number}  options.tab - Number of tab to extract
   * @param {string}  [options.delimiter] - Delimiter to use
   * @param {string}  [options.encoding] - Encoding type
   * @param {boolean} [options.returnAllTabs] - Flag to set if all tabs in the file should be extracted
   * @param {number}  [options.maxRows] - Maximum number of lines to extract
   * @param {number}  [options.chunkStart] - Start line when reading a chunk of data only
   * @param {string}  [options.templatefileType] - Type of template being used for the sales file (only current usage: "CRD")
   * @param {function(string, number, array[], string[])} callback - A callback that handles the response
   */

  // @tom / @dite: should we used tabNames or sheetNames ? We are using both throughout fileOpener at the moment. Any preference?
  readData(file, type, options, callback) {
    const fileOpener = this;
    const { tab, encoding, returnAllTabs, maxRows, templatefileType, chunkStart } = options;
    let { delimiter } = options;
    if (type === '.xls' || type === '.xlsb' || type === '.xlsx') {
      // check if file is actually a text file saved with wrong extension
      fileOpener.detectFileType(file, (fileType) => {
        if (fileType === 'txt') {
          logger.info(`Identified file with ${type} extension as a plain text file: ${file}`);
          fileOpener.readTxtFile(file, delimiter, encoding, maxRows, chunkStart, (err, result, nextChunkStart) => {
            callback(err, 1, [result], [], nextChunkStart);
          });
        } else if (type === '.xls' || type === '.xlsb') {
          logger.debug(`Reading ${type} file`);
          fileOpener.readExcelFile(file, tab, returnAllTabs, maxRows, type, (err, totalTabs, tabs, sheetNames) => {
            if (err) {
              logger.error(`readExcelFile Errored for file: ${file}`);
              logger.error(err);
              logger.error('falling back to readXlsxFile()');
              fileOpener.readXlsxFile(file, tab, returnAllTabs, maxRows, callback);
            } else {
              callback(null, totalTabs, tabs, sheetNames, null);
            }
          });
        } else if (type === '.xlsx') {
          try {
            fileOpener.readExcelJs(file, tab, returnAllTabs, maxRows, (err, totalTabs, tabs, sheetNames) => {
              if (err) {
                logger.error(`readExcelJs Errored for file: ${file}`);
                logger.error(err);
                logger.error('falling back to readXlsxFile()');
                fileOpener.readXlsxFile(file, tab, returnAllTabs, maxRows, (err2, totalTabs2, tabs2, sheetNames2) => {
                  if (err2) {
                    logger.error(`readXlsxFile Errored for file: ${file}`);
                    logger.error(err2);
                    logger.error('falling back to readExcelFile()');
                    fileOpener.readExcelFile(file, tab, returnAllTabs, maxRows, type, callback);
                  } else {
                    callback(err2, totalTabs2, tabs2, sheetNames2, null);
                  }
                });
              } else {
                callback(err, totalTabs, tabs, sheetNames, null);
              }
            });
          } catch (e) {
            logger.error(`readExcelJs Errored for file: ${file}`);
            logger.error(e);
            logger.error('falling back to readXlsxFile()');
            fileOpener.readXlsxFile(file, tab, returnAllTabs, maxRows, callback);
          }
        }
      });
    } else if (templatefileType === 'CRD') {
      const crdReader = new CrdReader();
      crdReader
        .readCrdFile(file, encoding)
        .then((result) => {
          callback(null, 1, [result], [], null);
        })
        .catch((err) => {
          callback(err, 1, [], [], null);
        });
    } else if (type === '.csv') {
      fileOpener.readCsvFile(file, delimiter, encoding, maxRows, chunkStart, (err, data, nextChunkStart) => {
        if (err) {
          logger.error(`readCsvFile Errored for file: ${file}`);
          logger.error(err);
          logger.error('falling back to readTxtFile()');
          if (!delimiter) {
            delimiter = ',';
          }
          fileOpener.readTxtFile(
            file,
            delimiter,
            encoding,
            maxRows,
            chunkStart,
            (readTxtErr, readTxtData, readTxtNextChunkStart) => {
              callback(readTxtErr, 1, [readTxtData], [], readTxtNextChunkStart);
            }
          );
        } else {
          callback(null, 1, [data], [], nextChunkStart);
        }
      });
    } else if (type === '.txt' && file.includes('edi.txt')) {
      const ediReader = new EdiReader();
      ediReader.readEdiFile(file, encoding, (err, result) => {
        callback(err, 1, [result], [], null);
      });
    } else if (txtFileExtensions.includes(type)) {
      fileOpener.readTxtFile(file, delimiter, encoding, maxRows, chunkStart, (err, result, nextChunkStart) => {
        callback(err, 1, [result], [], nextChunkStart);
      });
    } else if (type === '.axf') {
      const axfReader = new AxfReader();
      axfReader.readAxfFile(file, encoding, (err, result) => {
        callback(err, 1, [result], [], null);
      });
    } else {
      callback(new Error(`Unknown file type with extension of ${type}`), null);
    }
  },

  /**
   * Extracts data and total tabs from Excel file using XLSX npm lib
   *
   * * Calls `callback(err, totalTabs, tabs, sheetNames)` with
   *   * `tabs` containing the extracted data rows for all tabs (if returnAllTabs set to true)
   *   * `totalTabs` the number of tabs in the file
   *   * `sheetNames` an array of all tab names if detected (only applicable to Excel files)
   * * Calls `callback(err, totalTabs, tabs, sheetNames)` with an `err` message if an error occurs
   *
   * @param {string} file - File path to data file
   * @param {number} tab - Number of tab to extract
   * @param {boolean} [returnAllTabs] - Flag to set if all tabs in the file should be extracted
   * @param {number} [maxRows] - Maximum number of lines to extract
   * @param {string} type - File Extension Type
   * @param {function(string, number, array[], string[])} callback - A callback that handles the response
   */
  readExcelFile(file, tab, returnAllTabs, maxRows, type, callback) {
    const fileOpener = this;
    logger.debug('Using readExcelFile');
    let callbackCalled = false;
    const stopAtLine = null;
    try {
      const thisTab = tab || 0;
      const options = maxRows ? { sheetRows: maxRows } : {};

      if (type === '.xls') {
        options.dense = true;
      }

      const workbook = XLSX.readFile(file, options);
      logger.debug('Completed reading file');
      const totalTabs = Array.isArray(workbook.SheetNames) ? workbook.SheetNames.length : 1;
      if (workbook && returnAllTabs) {
        async.mapSeries(
          workbook.SheetNames,
          (sheetName, cb) => {
            const worksheet = workbook.Sheets[sheetName];
            if (type === '.xls') {
              arrayFromXlsDense(worksheet, cb);
            } else {
              arrayFromXlsRange(worksheet, stopAtLine, cb);
            }
          },
          (err, results) => {
            if (!callbackCalled) {
              callbackCalled = true;
              callback(err, totalTabs, results, workbook.SheetNames, null);
            }
          }
        );
      } else if (workbook) {
        const worksheet = workbook.Sheets[workbook.SheetNames[thisTab]];
        if (type === '.xls') {
          arrayFromXlsDense(worksheet, (err, result) => {
            const results = [result];
            if (!callbackCalled) {
              callbackCalled = true;
              callback(err, totalTabs, results, workbook.SheetNames, null);
            }
          });
        } else {
          arrayFromXlsRange(worksheet, stopAtLine, (err, result) => {
            const results = [result];
            if (!callbackCalled) {
              callbackCalled = true;
              callback(err, totalTabs, results, workbook.SheetNames, null);
            }
          });
        }
      } else if (!callbackCalled) {
        callbackCalled = true;
        callback(new Error('Failed to read file successfully'));
      }
    } catch (err) {
      if (err.message === 'path must be a string or Buffer') {
        if (!callbackCalled) {
          callbackCalled = true;
          callback(new Error('File does not exist'));
        }
      } else if (err.message === 'row is not iterable' && type === '.xls') {
        if (!callbackCalled) {
          const newType = '.xlsb';
          logger.error(err);
          logger.info('Retrying read with arrayFromXlsRange...');
          fileOpener.readExcelFile(file, tab, returnAllTabs, maxRows, newType, callback);
        }
      } else {
        logger.error(err);
        if (!callbackCalled) {
          callbackCalled = true;
          callback(
            new Error(
              'There was an error reading the Excel file. Check file is valid and if the template used is correct and pointing at the correct tab.'
            )
          );
        }
      }
    }
  },

  /**
   * Extracts data and total tabs from Excel file using ExcelJS npm lib
   *
   * * Calls `callback(err, totalTabs, tabs, sheetNames)` with
   *   * `tabs` containing the extracted data rows for all tabs (if returnAllTabs set to true)
   *   * `totalTabs` the number of tabs in the file
   *   * `sheetNames` an array of all tab names if detected (only applicable to Excel files)
   * * Calls `callback(err, totalTabs, tabs, sheetNames)` with an `err` message if an error occurs
   *
   * @param {string} file - File path to data file
   * @param {number} tab - Number of tab to extract
   * @param {boolean} [returnAllTabs] - Flag to set if all tabs in the file should be extracted
   * @param {number} [maxRows] - Maximum number of lines to extract
   * @param {function(string, number, array[], string[])} callback - A callback that handles the response
   */
  readExcelJs(file, tab, returnAllTabs, maxRows, callback) {
    logger.debug('Using readExcelJs');
    let callbackCalled = false;
    // Setup stream
    let workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(file);
    workbookReader.read();
    // Setup returning values
    let results = [];
    let totalTabs = 0;
    let sheetNames = [];
    let sheetIds = [];
    let countCells = 0;
    let countCellsTypeString = 0;
    let containsStrings = false;
    workbookReader.on('worksheet', (worksheet) => {
      if (workbookReader.model) {
        // Increment total tabs
        totalTabs += 1;
        // Check sheet names exist and create if not - info is only available once worksheets are starting being read
        if (sheetNames.length === 0) {
          sheetNames = workbookReader.model.sheets.map((sheet) => sheet.name);
          sheetIds = workbookReader.model.sheets.map((sheet) => sheet.id); // using sheet ids for index matching below as worksheet.name is sometimes incorrect
        }
        // Check sheet should be returned
        const sheetIndex = sheetIds.indexOf(parseInt(worksheet.id, 10));

        if (returnAllTabs || sheetIndex === tab) {
          // Setup worksheet array
          results[sheetIndex] = [];
          worksheet.on('row', (row) => {
            const rowIndex = row._number - 1;
            if (!maxRows || rowIndex < maxRows) {
              // Remove first value, as is always a blank value due to it working on column nos instead of indexes
              if (row && row.values) {
                let values = row.values.slice(1, row.values.length);
                // Process the returned cells
                values = values.map((val, idx) => {
                  countCells += 1;
                  if (typeof val === 'string') {
                    countCellsTypeString += 1;
                    containsStrings = true;
                  }
                  // check if any cells contain an object (returned for formulas)
                  if (typeof val === 'object') {
                    // if there is a formula result return this
                    if (val.result !== undefined) {
                      return val.result;
                    }
                    // otherwise check result value exists in the value model at the same cell index
                    if (row._cells[idx] && row._cells[idx]._value && typeof row._cells[idx]._value.model === 'object') {
                      const { result } = row._cells[idx]._value.model;
                      // if there is a value return this otherwise return null
                      return result !== undefined ? result : null;
                    }
                    // any other case of type object, return null
                    return null;
                  }
                  return val;
                });
                results[sheetIndex][rowIndex] = values;
              }
            }
          });
        }
      }
    });

    // Manage any errors
    let error;
    workbookReader.on('error', (err) => {
      logger.error(err);
      error = err;
      // Clear workbookreader to manage memory
      workbookReader = null;
      if (!callbackCalled) {
        callbackCalled = true;
        callback(
          new Error(
            'No data was returned when reading the file. Check file is valid and if the template used is correct and pointing at the correct tab.'
          )
        );
      }
    });

    workbookReader.on('end', () => {
      // Clear workbookreader to manage memory
      workbookReader = null;
      // Remove any blanks from results, which will occur when we select another tab than 0
      results = results.filter(Boolean);
      // ensure each blank line in each sheet is returned as an empty array
      results = results.map((sheet) => Array.from(sheet, (row) => row || []));

      // Return callback on finish
      if (!callbackCalled) {
        callbackCalled = true;
        logger.debug(
          'Share of cells that contain strings: ',
          `${((countCellsTypeString / countCells) * 100).toFixed(2)}%`
        );
        if (!containsStrings) {
          callback(new Error('No strings contained in file. This file was likely not read correctly'));
        } else if (countCellsTypeString / countCells < 0.1) {
          callback(new Error('Less than 10% of cells contain strings. This file was likely not read correctly'));
        } else if (results.length > 0) {
          callback(error, totalTabs, results, sheetNames, null);
        } else {
          callback(
            new Error(
              'No data was returned when reading the file. Check file is valid and if the template used is correct and pointing at the correct tab.'
            )
          );
        }
      }
    });
  },

  /**
   * Extracts data and total tabs (only if countTabs is set to true) from Excel file using XLSXExtract npm lib
   *
   * * Calls `callback(err, totalTabs, tabs, sheetNames)` with
   *   * `tabs` containing the extracted data rows for all tabs (if returnAllTabs set to true)
   *   * `totalTabs` the number of tabs in the file
   *   * `sheetNames` an array of all tab names if detected (only applicable to Excel files)
   * * Calls `callback(err, totalTabs, tabs, sheetNames)` with an `err` message if an error occurs
   *
   * @param {string} file - File path to data file
   * @param {number} tab - Number of tab to extract
   * @param {boolean} [returnAllTabs] - Flag to set if all tabs in the file should be extracted
   * @param {number} [maxRows] - Maximum number of lines to extract
   * @param {function(string, number, array[], string[])} callback - A callback that handles the response
   */
  readXlsxFile(file, tab, returnAllTabs, maxRows, callback) {
    logger.debug('Using readXlsxFile');
    let callbackCalled = false;
    try {
      const thisTab = tab || 0;
      // count number of sheets (tabs)
      let totalTabs = 0;
      const tabNames = [];
      let continueWhilst = true;
      async.whilst(
        // count number of tabs
        (testCb) => {
          testCb(null, continueWhilst);
        },
        (iterCb) => {
          continueWhilst = false;
          new XLSXExtract()
            .extract(file, { sheet_nr: totalTabs + 1 })
            .on('sheet', (sheet) => {
              continueWhilst = true; // continue only if we have found a sheet
              totalTabs += 1;
              tabNames.push(sheet[0]);
            })
            .on('error', (err) => {
              logger.error(err);
              if (!callbackCalled) {
                callbackCalled = true;
                callback(
                  new Error(
                    'There was an error reading the Excel file. Check file is valid and if the template used is correct and pointing at the correct tab.'
                  )
                );
              }
            })
            .on('end', () => {
              iterCb();
            });
        },
        () => {
          if (returnAllTabs) {
            const tabs = [];
            let count = 0;
            async.whilst(
              (testCb) => {
                testCb(null, count < totalTabs);
              },
              (iterCb) => {
                xlsxExtractSheet(file, count, maxRows, (err, result) => {
                  if (err) {
                    logger.error(err);
                    iterCb(err);
                  } else {
                    tabs.push(result);
                    count += 1;
                    iterCb();
                  }
                });
              },
              (err) => {
                if (!callbackCalled) {
                  callbackCalled = true;
                  if (tabs.length > 0) {
                    callback(err, totalTabs, tabs, tabNames, null);
                  } else {
                    callback(
                      new Error(
                        'No data was returned when reading the file. Check file is valid and if the template used is correct and pointing at the correct tab.'
                      )
                    );
                  }
                }
              }
            );
          } else {
            xlsxExtractSheet(file, thisTab, maxRows, (err, result) => {
              if (err) {
                logger.error(err);
                if (!callbackCalled) {
                  callbackCalled = true;
                  callback(err);
                }
              } else if (!callbackCalled) {
                callbackCalled = true;
                // Return callback on finish
                if (result.length > 0) {
                  callback(null, totalTabs, [result], [], null);
                } else {
                  callback(
                    new Error(
                      'No data was returned when reading the file. Check file is valid and if the template used is correct and pointing at the correct tab.'
                    )
                  );
                }
              }
            });
          }
        }
      );
    } catch (err) {
      logger.error(err);
      if (!callbackCalled) {
        callbackCalled = true;
        callback(
          new Error(
            'There was an error reading the Excel file. Check file is valid and if the template used is correct and pointing at the correct tab.'
          )
        );
      }
    }
  },
  /**
   * Extracts data from CSV file using fast-csv npm lib
   *
   * * Calls `callback(err, result, nextChunkStart)` with `result` containing the extracted data rows and `nextChunkStart` set to the start of the next chunk to read from the file
   * * Calls `callback(err)` with an `err` message if an error occurs
   *
   * @param {string} file - File path to data file
   * @param {string} [delimiter] - Delimiter to use
   * @param {string} [encoding] - Encoding type
   * @param {number} [maxRows] - Maximum number of lines to extract
   * @param {number} [chunkStart] - Start line when reading a chunk of data only
   * @param {function(string, array)} callback - A callback that handles the response
   */
  readCsvFile(file, delimiter, encoding, maxRows, chunkStart, callback) {
    logger.debug('Using readCsvFile');
    try {
      const result = [];
      const options = encoding ? { encoding } : {};
      const stream = fs.createReadStream(file, options);
      const csvOptions = { delimiter: determineDelimiter(delimiter, ',') };
      const chunkSize = 2000000;

      csvOptions.maxRows = maxRows || chunkSize;
      if (chunkStart) {
        csvOptions.skipLines = chunkStart;
        logger.info(`readCsvFile: reading chunk starting at line ${chunkStart}`);
      }
      const startAtLine = chunkStart || 0;
      let nextLine = startAtLine;
      let callbackCalled = false;
      const csvStream = csv
        .parse(csvOptions)
        .on('data', (data) => {
          nextLine += 1;
          result.push(data);
        })
        .on('end', () => {
          const nextChunkStart = nextLine < startAtLine + chunkSize ? null : nextLine;
          if (!callbackCalled) {
            callbackCalled = true;
            callback(null, result, nextChunkStart);
          }
        })
        .on('error', (err) => {
          if (!callbackCalled) {
            callbackCalled = true;
            callback(err);
          }
        });
      stream.pipe(csvStream);
    } catch (err) {
      if (err.message === 'path must be a string or Buffer') {
        callback(new Error('File does not exist'));
      }
      callback(new Error('There was an error reading the CSV file. Check file is valid.'));
    }
  },

  /**
   * Extracts data from Text file using line-by-line npm lib
   *
   * * Calls `callback(err, result)` with `result` containing the extracted data rows
   * * Calls `callback(err, result)` with an `err` message if an error occurs
   *
   * @param {string} file - File path to data file
   * @param {string} [delimiter] - Delimiter to use
   * @param {string} [encoding] - Encoding type
   * @param {number} [maxRows] - Maximum number of lines to extract
   * @param {number} [chunkStart] - Start line when reading a chunk of data only
   * @param {function(string, array)} callback - A callback that handles the response
   */
  readTxtFile(file, delimiter, encoding, maxRows, chunkStart, callback) {
    logger.info('Using readTxtFile');
    try {
      const result = [];
      let count = 0;
      const startAtLine = chunkStart || 0;
      const chunkSize = 2000000;
      let nextChunkStart;
      if (chunkStart) {
        logger.info(`readTxtFile: reading chunk starting at line ${chunkStart}`);
      }
      const thisDelimiter = determineDelimiter(delimiter, '\t');
      const options = encoding ? { encoding } : {};
      const lineByLineReader = new LineByLineReader(file, options);
      logger.info('Line Reader Start');
      lineByLineReader
        .on('line', (line) => {
          if (count >= startAtLine && count < startAtLine + chunkSize) {
            const data = line.split(thisDelimiter);
            result.push(data);
          }
          if (count === startAtLine + chunkSize) {
            nextChunkStart = count + 0;
            lineByLineReader.end();
          }
          count += 1;
          if (maxRows && count > maxRows) {
            lineByLineReader.end();
          }
        })
        .on('error', (err) => {
          callback(err);
        })
        .on('end', () => {
          callback(null, result, nextChunkStart);
        });
    } catch (err) {
      if (err.message === 'path must be a string or Buffer') {
        callback(new Error('File does not exist'));
      }
      logger.error(err);
      callback(new Error('There was an error reading the Text file. Check file is valid.'));
    }
  },
};

/**
 * Translate the configured delimiter into the delimiter to use
 * @param {string} [delimiter] The configured delimiter
 * @param {string} defaultDelimiter The default delimiter to use if none is defined
 * @return {string} The delimiter to use
 */
const determineDelimiter = (delimiter, defaultDelimiter) => {
  if (delimiter === '\\t') return '\t';
  if (!delimiter) return defaultDelimiter;
  return delimiter;
};
