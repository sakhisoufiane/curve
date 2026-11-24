require("../models/db");
const { logger } = require("@curveroyaltysystems/platform-shared-utils");
const async = require("async");
const ImportXlsx = require("../libs/importXlsx");
const config = require("../config.json");
const SalesTemplate = require("../models/salesTemplate");
const filePath = "/Users/joeosborne/Downloads/Territory lookup  (1) (1).xlsx";
const salesTemplateId = "64497480ead70bac797feeaa"; // Moonbug Publishing salesTemplateId

const importMoonbugTerritoryMappings = (file) => {
  let saveCount = 0;
  const date = new Date();
  const template = [{ "key": "source" }, { "key": "ISO" }]
  logger.info(`>>>>>>>>>>>>>>>>>>>>>Attempting to get data from file: ${file}<<<<<<<<<<<<<<<<<<<<<`);
  async.waterfall(
    [
      function (cb) {
        ImportXlsx.getDataByTemplate(file, template, 0, 1, date, (err, territoryAndSourceMappings) => {
            if (err) {
              return cb(err);
            }
            logger.info(
              `>>>>>>>>>>>>>>>>>>>>>Imported ${territoryAndSourceMappings.length} Sources and corresponding ISO codes from file<<<<<<<<<<<<<<<<<<<<<`
            );
            cb(null, territoryAndSourceMappings);
          }
        );
      },

      function (territoryAndSourceMappings, cb) {
        async.eachLimit(territoryAndSourceMappings, 10, (terr, eachCb) => {
          SalesTemplate.findByIdAndUpdate(
              salesTemplateId,
              { $push: { territories: { map: terr.source, name: terr.ISO } } },
              { timestamps: false },
              (err, updatedSalesTemplate) => {
                  if (err) {
                      logger.error(`>>>>>>>>>>>>>>>>>>>>>Error updating sales template: ${err}<<<<<<<<<<<<<<<<<<<<<`);
                      return eachCb(err);
                  }
                  logger.info(`>>>>>>>>>>>>>>>>>>>>>Added mapping data: ${terr.source} - ${terr.ISO} to Sales Template: ${updatedSalesTemplate.name}<<<<<<<<<<<<<<<<<<<<<`);
                  saveCount++; 
                  eachCb();
              }
          );
      }, cb); 
    }
    ],
    (err) => {
      if (err) {
        logger.error(err);
      } else {
        logger.info(
          `******************************** IMPORT COMPLETE. ${saveCount} OBJECTS IMPORTED ********************************`
        );
      }
      process.exit(0);
    }
  );
};

importMoonbugTerritoryMappings(filePath);