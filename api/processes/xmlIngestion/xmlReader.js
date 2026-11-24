const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const fs = require('fs');
const async = require('async');
const xml2js = require('xml2js');
const handleErnDefaultFile = require('./handleErnDefaultFile');
const handleErn43File = require('./handleErn43File');

const parser = new xml2js.Parser();

const getReleases = (xmlFiles, howToIngestOtherIdsOnImport, callback) => {
  const xmlReader = this;
  // Setup array to store releases
  const releasesToImport = [];
  // Loop through files
  async.eachSeries(xmlFiles, (file, cb) => {
    if (fs.existsSync(file)) {
      // Read file
      fs.readFile(file, (err, data) => {
        // Parse Data
        parser.parseString(data, (err, result) => {
          if (err) {
            // Handle Error
            logger.error('DDEX Ingestion: Errored in reading XML');
            logger.error(err);
            cb(err);
          } else if (result) {
            const message = result['ern:NewReleaseMessage'] || result['ernm:NewReleaseMessage'];
            const ns = message?.$?.['xmlns:ern'] || message?.$?.['xmlns:ernm'];
            if (ns?.endsWith('43')) {
              handleErn43File({ result, releasesToImport, howToIngestOtherIdsOnImport });
            } else {
              handleErnDefaultFile({ result, releasesToImport, howToIngestOtherIdsOnImport });
            }
            cb();
          } else {
            cb();
          }
        });
      });
    } else {
      logger.error(`DDEX Ingestion: File doesn't exist at ${file}`);
      cb(new Error("File doesn't exist"));
    }
  }, (err) => {
    // Return any errors and releases
    callback(err, releasesToImport);
  });
};

module.exports = {
  getReleases,
};
