require("dotenv").config();
require("../models/db");
const { logger } = require("@curveroyaltysystems/platform-shared-utils");
const Work = require("../models/work");
const Client = require("../models/client");
const async = require("async");
const appRootDir = require("app-root-dir").get();
const WriteCsv = require("../libs/writeCsv");

async function findDuplicateIdentifiersByClient(clientId) {
  const query = [
    {
      $match: {
        clientId: clientId,
      },
    },
    {
      $unwind: "$societyIdentifiers",
    },
    {
      $group: {
        _id: {
          identifier: "$societyIdentifiers.identifier",
          society: "$societyIdentifiers.society",
          clientId: "$clientId",
        },
        count: {
          $sum: 1,
        },
        identifier: {
          $first: "$societyIdentifiers.identifier",
        },
        workIds: {
          $addToSet: "$_id",
        },
      },
    },
    {
      $match: {
        count: {
          $gt: 1,
        },
      },
    },
    {
      $project: {
        _id: 1,
        identifier: 1,
        count: 1,
        workIds: 1,
      },
    },
  ];
  const results = await Work.aggregate(query);
  return results;
}
async function checkWorksForDuplicateSocietyIdsAndClear() {
  const updatedReport = [];
  const clients = await Client.find({});

  async.eachLimit(
    clients,
    10,
    async (client) => {
      let totalDuplicates = 0;
      const worksWithDuplicateSocietyIdentifiersByClient =
        await findDuplicateIdentifiersByClient(client._id.toString());
      if (worksWithDuplicateSocietyIdentifiersByClient.length > 0) {
        worksWithDuplicateSocietyIdentifiersByClient.forEach((society) => {
          if (society._id.identifier !== "" && society._id.society !== "") {
            totalDuplicates += society.workIds.length;
          }
        });
        logger.info(
          `>>>>>>>>>>>>>>>>>>>There are ${totalDuplicates} Works with duplicate Society Identifiers for ${client.name}<<<<<<<<<<<<<<<<<<<<<<`
        );
        for (const duplicateSocietyIdentifiers of worksWithDuplicateSocietyIdentifiersByClient) {
          await async.eachLimit(
            duplicateSocietyIdentifiers.workIds,
            100,
            async (workId) => {
              const foundWork = await Work.findById(workId);
              if (foundWork) {
                foundWork.societyIdentifiers.forEach(
                  async (identifier, index) => {
                    const oldDuplicateIdentifier = identifier.identifier;
                    const oldDuplicateSociety = identifier.society;
                    if (
                      (identifier.identifier ===
                        duplicateSocietyIdentifiers.identifier &&
                        identifier.society ===
                          duplicateSocietyIdentifiers._id.society &&
                        duplicateSocietyIdentifiers.identifier !== "" &&
                        duplicateSocietyIdentifiers._id.society !== "") ||
                      (duplicateSocietyIdentifiers.identifier === null &&
                        identifier.society ===
                          duplicateSocietyIdentifiers._id.society) ||
                      (duplicateSocietyIdentifiers._id.society === null &&
                        identifier.identifier ===
                          duplicateSocietyIdentifiers.identifier)
                    ) {
                      logger.info(
                        `>>>>>>>>>>>>>>>>>>>Clearing Duplicate Society Identifiers on Work ${foundWork._id} - Client: ${client.name}<<<<<<<<<<<<<<<<<<<<<<`
                      );
                      identifier.society = "";
                      identifier.identifier = "";
                      updatedReport.push({
                        client: client.name,
                        workId: foundWork._id,
                        work: foundWork.title,
                        oldDuplicateIdentifier: oldDuplicateIdentifier,
                        oldDuplicateSociety: oldDuplicateSociety,
                        identifier: "",
                        society: "",
                        count: duplicateSocietyIdentifiers.count,
                      });
                      await Work.findByIdAndUpdate(
                        foundWork._id,
                        {
                          $set: {
                            [`societyIdentifiers.${index}.identifier`]: "",
                            [`societyIdentifiers.${index}.society`]: "",
                          },
                        },
                        { new: true, useFindAndModify: false }
                      );
                    }
                  }
                );
              }
            }
          );
        }
      }
    },
    () => {
      if (updatedReport.length > 0) {
        const outputLocation = `${appRootDir}/tmp/worksWithClearedSocietyIdentifiers.csv`;
        const writer = new WriteCsv({
          headers: [
            "CLIENT",
            "WORK ID",
            "WORK",
            "OLD DUPLICATE IDENTIFIER",
            "OLD DUPLICATE SOCIETY",
            "NEW IDENTIFIER",
            "NEW SOCIETY",
            "COUNT",
          ],
          outputLocation,
        });
        const outputData = updatedReport.map((line) => {
          return [
            line.client,
            line.workId,
            line.work,
            line.oldDuplicateIdentifier,
            line.oldDuplicateSociety,
            line.identifier,
            line.society,
            line.count,
          ];
        });
        writer.addData(outputData, () => {
          writer.write((err, location) => {
            logger.info(
              `>>>>>>>>>>>>>>>>>>>>File written to ${location}<<<<<<<<<<<<<<<<<<<<<<`
            );
            process.exit(-1);
          });
        });
      } else {
        process.exit();
      }
    }
  );
}

checkWorksForDuplicateSocietyIdsAndClear().catch((error) => {
  logger.error("Error running script:", error);
});
