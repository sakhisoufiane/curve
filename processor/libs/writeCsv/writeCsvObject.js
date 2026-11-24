const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const fs = require('fs');
const csvWriter = require('csv-write-stream');

function writeCsv(params) {
  const writeCsv = this;

  this.prepareWriter = function () {
    // add BOM for Excel import to start of sheet
    // adding to the first header ensures this is only present in the csv if actual data rows have been added
    if (Array.isArray(params.headers)) {
      params.headers[0] = `\uFEFF${params.headers[0]}`;
    }

    const writerParams = { headers: params.headers };
    if (params.separator) { writerParams.separator = params.separator; }

    this.writer = csvWriter(writerParams);
    this.writeStream = fs.createWriteStream(this.outputLocation);
    this.writer.pipe(this.writeStream);
  };

  // Initialise csvWriter
  if (!params || !params.headers) {
    throw new Error('WriteCSV requires headers to be passed');
  } else {
    this.headers = params.headers;
    this.outputLocation = params.outputLocation;
    this.prepareWriter();
  }

  this.addData = function (data, callback) {
    if (Array.isArray(data)) {
      async.eachSeries(data, (line, cb) => {
        writeCsv.writer.write(line, cb);
      }, callback);
    } else {
      callback('Data must be an array');
    }
  };

  this.addRow = function (row, callback) {
    // Manage callback
    if (!callback) { callback = function () {}; }
    // Add row to CSV
    writeCsv.writer.write(row, callback);
  };

  this.write = function (callback) {
    this.writer.end();
    this.writeStream.on('finish', (err) => {
      callback(err, writeCsv.outputLocation);
    });
  };
}

module.exports = writeCsv;
