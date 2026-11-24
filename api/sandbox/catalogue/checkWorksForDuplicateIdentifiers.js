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
      $group: {
        _id: {
          identifier: "$identifier",
          clientId: "$clientId",
        },
        count: {
          $sum: 1,
        },
        identifier: {
          $first: "$identifier",
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

async function checkWorksForDuplicateIdentifiers() {
  let updatedReport = [];
  let totalDuplicates = 0;

  const clients = await Client.find({});

  async.eachLimit(
    clients,
    10,
    async (client) => {
      const worksWithDuplicateIdentifiersByClient =
        await findDuplicateIdentifiersByClient(client._id.toString());

      if (worksWithDuplicateIdentifiersByClient.length > 0) {
        worksWithDuplicateIdentifiersByClient.forEach((work) => {
          totalDuplicates += work.count;
        });
        logger.info(
          `>>>>>>>>>>>>>>>>>>>There are ${totalDuplicates} Works with duplicate Identifiers for ${client.name}<<<<<<<<<<<<<<<<<<<<<<`
        );

        for (const duplicateWorkIds of worksWithDuplicateIdentifiersByClient) {
          await async.eachLimit(
            duplicateWorkIds.workIds,
            100,
            async (workId) => {
              const foundWork = await Work.findById(workId);
              if (foundWork) {
                updatedReport.push({
                  client: client.name,
                  workId: foundWork._id,
                  work: foundWork.title,
                  identifier: foundWork.identifier,
                });
              }
            }
          );
        }
      }
    },
    () => {
      if (updatedReport.length > 0) {
        const outputLocation = `${appRootDir}/tmp/worksWithDuplicateIdentifiers.csv`;
        const writer = new WriteCsv({
          headers: ["CLIENT", "WORK ID", "WORK", "IDENTIFIER"],
          outputLocation,
        });
        const outputData = updatedReport.map((line) => {
          return [line.client, line.workId, line.work, line.identifier];
        });
        writer.addData(outputData, () => {
          writer.write((err, location) => {
            console.log(
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

checkWorksForDuplicateIdentifiers().catch((error) => {
  logger.error("Error updating Works with duplicates:", error);
});
