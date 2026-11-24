require("dotenv").config();
require("../models/db");
const Client = require("../models/client");
const SalesTemplate = require("../models/salesTemplate");
const { logger } = require("@curveroyaltysystems/platform-shared-utils");
const async = require("async");

const updateNullTypeOnSalesTemplates = () => {
  logger.info("********************************************************* FINDING ALL CLIENTS *********************************************************");
  Client.find({}, (err, clients) => {
    if (err) {
      logger.error(err);
      process.exit(-1);
    }
    async.eachLimit(clients, 10, (client, cb1) => {
        let count = 0;
        SalesTemplate.find({ clientId: client._id.toString() }, "_id fields", (err, salesTemplates) => {
            if (err) {
              logger.error(err);
              process.exit(-1);
            }
            async.eachLimit(salesTemplates, 50,(salesTemplate, cb2) => {
                count++;
                logger.info(`************************ PROCESSING SALES TEMPLATES IN BATCHES OF 50 - CURRENTLY PROCESSING BATCH ${count} FOR ${client.name} ************************`);
                let needsUpdate = false;
                const updatedFields = salesTemplate.fields.map(
                  (salesTemplateField) => {
                    if (salesTemplateField?.field && !salesTemplateField.type) {
                      needsUpdate = true;
                      for (const type in fieldTypes) {
                        if (fieldTypes[type].includes(salesTemplateField.field)) {
                          return {
                            ...salesTemplateField,
                            type: type,
                          };
                        }
                      }
                    }
                    return salesTemplateField;
                  }
                );
                if (needsUpdate) {
                  logger.info(`********************************************************* UPDATING SALES TEMPLATE ${salesTemplate._id} FOR ${client.name} *********************************************************`);
                  SalesTemplate.findByIdAndUpdate(salesTemplate._id,{ $set: { fields: updatedFields } },{ timestamps: false },(err) => {
                      if (err) {
                        logger.error(err);
                        process.exit(-1);
                      }
                      cb2();
                    }
                  );
                } else {
                  cb2();
                }
              },
              cb1
            );
          }
        );
      },
      () => {
        logger.info("✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅ PROCESS COMPLETE ✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅");
        process.exit(0);
      }
    );
  });
};

const fieldTypes = {
  String: [
    "barcode",
    "catNo",
    "catType",
    "configuration",
    "contractId",
    "contractIdentifier",
    "description",
    "distributionChannel",
    "episode",
    "exchangeRate",
    "grossAmount",
    "isrc",
    "iswc",
    "originalComposers",
    "originalConfiguration",
    "originalCurrency",
    "originalDistributionChannel",
    "originalIdentifier",
    "originalPositiveNegative",
    "originalPriceCategory",
    "originalReleaseArtist",
    "originalReleaseTitle",
    "originalTerritory",
    "originalTrackArtist",
    "originalTrackTitle",
    "originalWorkTitle",
    "priceCategory",
    "production",
    "releaseId",
    "songCode",
    "source",
    "subSource",
    "territory",
    "trackId",
    "tunecode",
    "workId",
    "Temp 1",
    "Temp 2",
    "Temp 3",
    "Temp 4",
    "Temp 5",
    "ignore",
    "party1",
    "party2",
    "party3",
    "party4",
    "party5",
    "party6",
    "party7",
    "party8",
    "party9",
  ],
  Number: [
    "duration",
    "multiplier",
    "netAmount",
    "perUnitRate",
    "proRataAmount",
    "units",
    "retailPrice",
    "returnGrossAmount",
    "returnNetAmount",
    "returnUnits",
    "salePrice",
    "sharePercentage",
    "discountAmount",
  ],
  Date: ["dateFrom", "dateTo", "saleDate", "transactionDate"],
};

updateNullTypeOnSalesTemplates();
