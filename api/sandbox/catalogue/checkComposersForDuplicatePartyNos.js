require("dotenv").config();
require("../models/db");
const { logger } = require("@curveroyaltysystems/platform-shared-utils");
const Composer = require("../models/composer");
const Client = require("../models/client");
const async = require("async");
const appRootDir = require("app-root-dir").get();
const WriteCsv = require("../libs/writeCsv");

async function findDuplicatePartyNosByClient(clientId) {
  const query = [
    {
      $match: {
        clientId: clientId,
      },
    },
    {
      $group: {
        _id: {
          partyNo: "$partyNo",
          clientId: "$clientId",
        },
        count: {
          $sum: 1,
        },
        partyNo: {
          $first: "$partyNo",
        },
        composerIds: {
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
        partyNo: 1,
        count: 1,
        composerIds: 1,
      },
    },
  ];
  const results = await Composer.aggregate(query);
  return results;
}

async function checkComposersForDuplicatePartyNos() {
  let updatedReport = [];
  let totalDuplicates = 0;

  const clients = await Client.find({});

  async.eachLimit(
    clients,
    10,
    async (client) => {
      const composersWithDuplicatePartyNosByClient =
        await findDuplicatePartyNosByClient(client._id.toString());

      if (composersWithDuplicatePartyNosByClient.length > 0) {
        composersWithDuplicatePartyNosByClient.forEach((composer) => {
          totalDuplicates += composer.count;
        });
        logger.info(
          `>>>>>>>>>>>>>>>>>>>There are ${totalDuplicates} Composers with duplicate Party Numbers for ${client.name}<<<<<<<<<<<<<<<<<<<<<<`
        );

        for (const duplicateComposerIds of composersWithDuplicatePartyNosByClient) {
          await async.eachLimit(
            duplicateComposerIds.composerIds,
            100,
            async (composerId) => {
              const foundComposer = await Composer.findById(composerId);
              if (foundComposer) {
                updatedReport.push({
                  client: client.name,
                  composerId: foundComposer._id,
                  composer: foundComposer.name,
                  partyNo: foundComposer.partyNo,
                });
              }
            }
          );
        }
      }
    },
    () => {
      if (updatedReport.length > 0) {
        const outputLocation = `${appRootDir}/tmp/composersWithDuplicatePartyNos.csv`;
        const writer = new WriteCsv({
          headers: ["CLIENT", "COMPOSER ID", "COMPOSER", "PARTY NUMBER"],
          outputLocation,
        });
        const outputData = updatedReport.map((line) => {
          return [line.client, line.composerId, line.composer, line.partyNo];
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

checkComposersForDuplicatePartyNos().catch((error) => {
  logger.error("Error updating Composers with duplicates:", error);
});
