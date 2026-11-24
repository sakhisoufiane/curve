require('../models/db');
const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const fs = require('fs');
const SalesFile = require('../models/salesFile');
const IngestSalesFile = require('../libs/salesIngestion/ingestSalesFile');
const appRootDir = require('app-root-dir').get();
const outputSchema = require('./platform/platformOutputSchema');

// Load sales file
SalesFile.findById(process.argv[2], (err, salesFile) => {
  // Call IngestSalesFile.ingestionProcessData
  IngestSalesFile.ingestionProcessData(salesFile, false, false, (err, result) => {
    if (err) {
      logger.error(err);
    }
    if (result) {
      // log full depth of object
      logger.debug(JSON.stringify(result, null, 2));
      // logger.debug(result);
      fileManager.publicLink7Days(result.key, (err, link) => {
        const output = {
          file: link,
          openingConfig: {
            tab: result.tab,
            startingColumn: result.startingColumn,
            startingLine: result.startingLine,
          },
          outputFormat: 'JSON',
          schema: outputSchema,
          template: result.template,
          config: [
            // Territory Mapping
            {
              type: 'Mapper',
              inputField: 'originalTerritory',
              outputField: 'territory',
              algorithm: 'Simple',
              mappings: 'territoryMappings',
            },
            {
              type: 'Mapper',
              inputField: 'originalConfiguration',
              outputField: 'configuration',
              algorithm: 'Simple',
              mappings: 'configurationMappings',
            },
            {
              type: 'Mapper',
              inputField: 'originalDistributionChannel',
              outputField: 'distributionChannel',
              algorithm: 'Simple',
              mappings: 'distributionChannelMappings',
            },
          ],
          mappings: {
            territoryMappings: result.catalogue.territories,
            configurationMappings: result.catalogue.configurations,
            distributionChannelMappings: result.catalogue.distributionChannels,
          }
        };
        logger.debug(output);
        // Write output to JSON file
        fs.writeFile(`${appRootDir}/tmp/output.json`, JSON.stringify(output, null, 2), (err) => {
          if (err) {
            logger.error(err);
          }
          logger.debug('The file has been saved!');
          process.exit();
        });
      });
    }
  });
});
