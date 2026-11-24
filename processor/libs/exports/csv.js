// CSV utils for file exports
const { stringify } = require('csv-stringify/sync');
const { isValidObjectId } = require('@curveroyaltysystems/models/mongoose');
const fs = require('fs');

/**
 *
 * @param {WriteStream} csvStream - CSV filestream created with fs.createWriteStream
 * @description Promise function that closes and waits for a file stream to finish writing
 */
async function closeStream(csvStream) {
  const finished = new Promise((resolve, reject) => {
    const onFinish = () => {
      csvStream.removeListener('error', onError);
      resolve();
    };
    const onError = (err) => {
      csvStream.removeListener('finish', onFinish);
      reject(err);
    };
    csvStream.once('finish', onFinish);
    csvStream.once('error', onError);
  });
  csvStream.end();
  await finished;
}

/**
 *
 * @param {WriteStream} csvStream - CSV filestream created with fs.createWriteStream
 * @param {string[]} arrayLine - String array of CSV values e.g. ["one", "two", "three", ...]
 * @param {Object} options
 * @param {string} options.format - Type of delimiter, defaults to comma (UK Decimal Point)
 * @param {boolean} options.bom - Prepend Byte Order Mark (BOM) to the line (used when headers written)
 * @description Writes a formatted CSV line to a file stream, with a chosen delimiter ("," or ";")
 */
function writeCsvLine(csvStream, arrayLine, { format = null, bom = false } = {}) {
  // Handle all CSV string escape logic with csv-stringify library
  // Trying to handle all the escaping rules ourselves if difficult
  const delimiter = format === 'EU Decimal Comma' ? ';' : ',';
  const lineStr = stringify([arrayLine], {
    delimiter,
    bom,
    cast: {
      object: (value) => {
        // Convert DB ObjectIDs to their string form
        // Otherwise the ID has quotations around it when hitting the base case of these conditions
        if (isValidObjectId(value) && typeof value !== 'string') return value.toString();
        // This handles arrays as single stringified fields
        if (Array.isArray(value)) return value.join(',');
        return JSON.stringify(value);
      },
      boolean: (value) => (value ? 'TRUE' : 'FALSE'),
    },
  });
  csvStream.write(lineStr);
}

/**
 *
 * @param {string} filePath - Path to create the CSV file at
 * @param {string[]} headers - Array of header strings for the CSV file
 * @description Creates a writable CSV filestream with headers written
 * @returns {WriteStream} - The created writable CSV filestream
 */
function createStream(filePath, headers) {
  const stream = fs.createWriteStream(filePath);
  writeCsvLine(stream, headers, { bom: true });
  return stream;
}

module.exports = {
  closeStream,
  writeCsvLine,
  createStream,
};
