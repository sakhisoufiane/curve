require("dotenv").config();
require("../models/db");
const { logger } = require("@curveroyaltysystems/platform-shared-utils");
const Composer = require("../models/composer");
const Client = require("../models/client");
const async = require("async");
const appRootDir = require("app-root-dir").get();
const WriteCsv = require("../libs/writeCsv");

async function findHighestPartyNo(client) {
  const highestPartyNo = await Composer.find({ clientId: client._id })
    .sort({ partyNo: -1 })
    .limit(1);
  return highestPartyNo[0]?.partyNo || 0;
}

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

async function updateComposersWithDuplicatePartyNosAllClients() {
  let updatedReport = [];

  const clients = await Client.find({}).catch((error) => {
    logger.error("Error finding all clients:", error);
  });

  async.eachLimit(
    clients,
    10,
    async (client) => {
      let totalDuplicates = 0;
      let currentPartyNo = await findHighestPartyNo(client);

      const composersWithDuplicatePartyNosByClient =
        await findDuplicatePartyNosByClient(client._id.toString()).catch(
          (error) => {
            logger.error(
              `Error finding duplicate Party Numbers for client ${client.name}:`,
              error
            );
          }
        );

      composersWithDuplicatePartyNosByClient.forEach((composer) => {
        totalDuplicates += composer.count;
      });
      logger.info(
        `>>>>>>>>>>>>>>>>>>>There are ${totalDuplicates} Composers with duplicate Party Numbers for ${client.name}<<<<<<<<<<<<<<<<<<<<<<`
      );

      if (composersWithDuplicatePartyNosByClient.length > 0) {
        for (const duplicateComposerIds of composersWithDuplicatePartyNosByClient) {
          await async.eachLimit(
            duplicateComposerIds.composerIds,
            100,
            async (composerId) => {
              const foundComposer = await Composer.findById(composerId);
              if (foundComposer) {
                duplicatePartyNo = foundComposer.partyNo;
                foundComposer.partyNo = null;
                foundComposer.partyNo = ++currentPartyNo;
                await Composer.findByIdAndUpdate(
                  foundComposer._id,
                  {
                    $set: {
                      partyNo: foundComposer.partyNo,
                    },
                  },
                  { timestamps: false }
                )
                  .then(
                    updatedReport.push({
                      client: client.name,
                      composerId: foundComposer._id,
                      composer: foundComposer.name,
                      partyNo: foundComposer.partyNo,
                      oldPartyNo: duplicatePartyNo,
                    })
                  )
                  .catch((error) => {
                    if (error) {
                      logger.error(
                        `Error updating Composer with ID ${foundComposer._id}:`,
                        error
                      );
                    }
                  });
                logger.info(
                  `>>>>>>>>>>>>>>>>>>>>Updated ${foundComposer._id} to unique Party Number: ${foundComposer.partyNo} for ${client.name}<<<<<<<<<<<<<<<<<<<<`
                );
              }
            }
          );
        }
      }
    },
    () => {
      if (updatedReport.length > 0) {
        const outputLocation = `${appRootDir}/tmp/updateComposersWithDuplicatePartyNosAllClients.csv`;
        const writer = new WriteCsv({
          headers: [
            "CLIENT",
            "COMPOSER ID",
            "COMPOSER",
            "NEW PARTY NUMBER",
            "OLD PARTY NUMBER",
          ],
          outputLocation,
        });
        const outputData = updatedReport.map((line) => {
          return [
            line.client,
            line.composerId,
            line.composer,
            line.partyNo,
            line.oldPartyNo,
          ];
        });
        writer.addData(outputData, () => {
          writer.write((err, location) => {
            console.log(
              `>>>>>>>>>>>>>>>>>>>>File with updated Composers written to ${location}<<<<<<<<<<<<<<<<<<<<<<`
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

updateComposersWithDuplicatePartyNosAllClients().catch((error) => {
  logger.error("Error updating Composers with duplicate Party Numbers:", error);
});
