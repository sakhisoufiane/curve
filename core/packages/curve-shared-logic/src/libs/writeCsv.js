/* eslint-disable no-shadow */
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
    const config = { headers: params.headers };
    if (params.separator) {
      config.separator = params.separator;
    }

    this.writer = csvWriter(config);
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
      throw new Error('Data must be an array');
    }
  };

  this.write = function (callback) {
    this.writer.end();
    this.writeStream.on('finish', (err) => {
      callback(err, writeCsv.outputLocation);
    });
  };

  // this.uploadToS3 = function (key, params, callback) {
  //   // Set AWS Credentials from request
  //   AWS.config = new AWS.Config();
  //   // Read saved file
  //   const fileBuffer = fs.readFileSync(this.outputLocation);
  //   const stats = fs.statSync(this.outputLocation);
  //   console.log(`File size: ${stats.size}`);
  //   // Upload to S3
  //   const s3 = new AWS.S3({
  //     accessKeyId: params.s3AccessKey,
  //     secretAccessKey: params.s3SecretKey,
  //     region: params.s3Region,
  //   });
  //   const s3Params = {
  //     Bucket: params.s3Bucket,
  //     Key: key,
  //     Body: fileBuffer,
  //   };
  //   console.log(s3Params);
  //   try {
  //     s3.putObject(s3Params, callback);
  //   } catch (err) {
  //     console.error(err);
  //     callback(err);
  //   }
  // };
}

module.exports = writeCsv;
