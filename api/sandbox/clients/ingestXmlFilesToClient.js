require('../../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();
const async = require('async');
const xmlReader = require('../../processes/xmlIngestion/xmlReader');
const dataIngest = require('../../processes/xmlIngestion/dataIngest');
const Client = require('../../models/client');

const xmlFiles = [
  `${appRootDir}/tmp/619364546590.xml`,
  // `${appRootDir}/tmp/826194357382.xml`,
];
const clientId = '6123f829c99222ac637eda5f'; // set to clientId

Client.findById(clientId, (err, client) => {
  async.waterfall([
    function (callback) {
      // Read XML
      xmlReader.getReleases(xmlFiles, 'Create new alias',callback);
    },
    function (releases, callback) {
      console.log('releases :', releases);
      // Get client labels
      // client.contractLabels((err, labelMappings) => {
      //   // Process imported releases
      //   dataIngest.ingest(releases, clientId, client.ftpImportDefaultDistributionChannel, labelMappings, client.setDefaultReleaseIdOnImport, client.ingestForeignIds, client.useBarcodeAsCatNoOnImport, callback);
      // });
    },
  ], (err) => {
    if (err) {
      logger.error('err: ', err);
    } else {
      logger.info('ingested');
      process.exit(-1);
    }
  });
});
