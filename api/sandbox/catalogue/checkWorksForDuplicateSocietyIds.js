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

async function checkWorksForDuplicateSocietyIds() {
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
          totalDuplicates += society.workIds.length;
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
                updatedReport.push({
                  client: client.name,
                  workId: foundWork._id,
                  work: foundWork.title,
                  identifier: duplicateSocietyIdentifiers.identifier,
                  society: duplicateSocietyIdentifiers._id.society,
                  count: duplicateSocietyIdentifiers.count,
                });
              }
            }
          );
        }
      }
    },
    () => {
      if (updatedReport.length > 0) {
        const outputLocation = `${appRootDir}/tmp/worksWithDuplicateSocietyIdentifiers.csv`;
        const writer = new WriteCsv({
          headers: [
            "CLIENT",
            "WORK ID",
            "WORK",
            "IDENTIFIER",
            "SOCIETY",
            "COUNT",
          ],
          outputLocation,
        });
        const outputData = updatedReport.map((line) => {
          return [
            line.client,
            line.workId,
            line.work,
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

checkWorksForDuplicateSocietyIds().catch((error) => {
  logger.error("Error running script:", error);
});
