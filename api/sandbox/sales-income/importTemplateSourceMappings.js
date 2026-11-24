require("../../models/db");
const { logger } = require("@curveroyaltysystems/platform-shared-utils");
const async = require("async");
const ImportXlsx = require("../../libs/importXlsx");
const config = require("../../config.json");
const SalesTemplate = require("../../models/salesTemplate");
const filePath = "/Users/mgiul/Downloads/UMVD - Physical - Customer Mapping (1).xlsx";
const salesTemplateId = "6639406f43f2456d8ff9f252"; // salesTemplateId

const importTemplateMappings = (file) => {
  let saveCount = 0;
  const date = new Date();
  const template = [{ "key": "map" }, { "key": "name" }]
  logger.info(`>>>>>>>>>>>>>>>>>>>>>Attempting to get data from file: ${file}<<<<<<<<<<<<<<<<<<<<<`);
  async.waterfall(
    [
      function (cb) {
        ImportXlsx.getDataByTemplate(file, template, 0, 1, date, (err, sourceMappings) => {
            if (err) {
              return cb(err);
            }
            logger.info(
              `>>>>>>>>>>>>>>>>>>>>>Imported ${sourceMappings.length} Sources and corresponding data from file<<<<<<<<<<<<<<<<<<<<<`
            );
            cb(null, sourceMappings);
          }
        );
      },
      function (sourceMappings, cb) {
        SalesTemplate.findOne({ _id: salesTemplateId }, (err, existingTemplate) => {
          if (err) {
            return cb(err);
          }
          async.eachSeries(sourceMappings, (mappings, eachCb) => {
            const exists = existingTemplate.sources.some(existingSource => existingSource.map === mappings.map);
            if (!exists) {
              logger.info(`>>>>>>>>>>>>>>>>>>>>>Added mapping data: ${mappings.map} - ${mappings.name} to Sales Template: ${existingTemplate.name}<<<<<<<<<<<<<<<<<<<<<`);
              existingTemplate.sources.push({ map: mappings.map, name: mappings.name });
              saveCount++;
            } else {
              logger.info(`>>>>>>>>>>>>>>>>>>>>>Existing mapping data: ${mappings.map} - ${mappings.name} to Sales Template: ${existingTemplate.name}<<<<<<<<<<<<<<<<<<<<<`);
            }
            eachCb();
          }, (err) => {
            if (err) {
              return cb(err);
            }
            SalesTemplate.findByIdAndUpdate(
              salesTemplateId,
              { $set: { sources: existingTemplate.sources } },
              { timestamps: false },
              (err, updatedSalesTemplate) => {
                  if (err) {
                    logger.error(`>>>>>>>>>>>>>>>>>>>>>Error updating sales template: ${err}<<<<<<<<<<<<<<<<<<<<<`);
                    return cb(err);
                  }
                  logger.info(`>>>>>>>>>>>>>>>>>>>>>Added mapping data to Sales Template: ${updatedSalesTemplate.name}<<<<<<<<<<<<<<<<<<<<<`);
                  cb(null);
              }
            );
          });
        });
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

importTemplateMappings(filePath);
