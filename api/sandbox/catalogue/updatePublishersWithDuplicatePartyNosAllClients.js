require("dotenv").config();
require("../models/db");
const { logger } = require("@curveroyaltysystems/platform-shared-utils");
const Publisher = require("../models/publisher");
const Client = require("../models/client");
const async = require("async");
const appRootDir = require("app-root-dir").get();
const WriteCsv = require("../libs/writeCsv");

async function findHighestPartyNo(client) {
  const highestPartyNo = await Publisher.find({ clientId: client._id })
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
        publisherIds: {
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
        publisherIds: 1,
      },
    },
  ];
  const results = await Publisher.aggregate(query);
  return results;
}

async function updatePublishersWithDuplicatePartyNosAllClients() {
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

      const publishersWithDuplicatePartyNosByClient =
        await findDuplicatePartyNosByClient(client._id.toString()).catch(
          (error) => {
            logger.error(
              `Error finding duplicate Party Numbers for client ${client.name}:`,
              error
            );
          }
        );

      publishersWithDuplicatePartyNosByClient.forEach((publisher) => {
        totalDuplicates += publisher.count;
      });
      logger.info(
        `>>>>>>>>>>>>>>>>>>>There are ${totalDuplicates} Publishers with duplicate Party Numbers for ${client.name}<<<<<<<<<<<<<<<<<<<<<<`
      );

      if (publishersWithDuplicatePartyNosByClient.length > 0) {
        for (const duplicatePublisherIds of publishersWithDuplicatePartyNosByClient) {
          await async.eachLimit(
            duplicatePublisherIds.publisherIds,
            100,
            async (publisherId) => {
              const foundPublisher = await Publisher.findById(publisherId);
              if (foundPublisher) {
                duplicatePartyNo = foundPublisher.partyNo;
                foundPublisher.partyNo = null;
                foundPublisher.partyNo = ++currentPartyNo;
                await Publisher.findByIdAndUpdate(
                  foundPublisher._id,
                  {
                    $set: {
                      partyNo: foundPublisher.partyNo,
                    },
                  },
                  { timestamps: false }
                )
                  .then(
                    updatedReport.push({
                      client: client.name,
                      publisherId: foundPublisher._id,
                      publisher: foundPublisher.name,
                      partyNo: foundPublisher.partyNo,
                      oldPartyNo: duplicatePartyNo,
                    })
                  )
                  .catch((error) => {
                    if (error) {
                      logger.error(
                        `Error updating Publisher with ID ${foundPublisher._id}:`,
                        error
                      );
                    }
                  });
                logger.info(
                  `>>>>>>>>>>>>>>>>>>>>Updated ${foundPublisher._id} to unique Party Number: ${foundPublisher.partyNo} for ${client.name}<<<<<<<<<<<<<<<<<<<<`
                );
              }
            }
          );
        }
      }
    },
    () => {
      if (updatedReport.length > 0) {
        const outputLocation = `${appRootDir}/tmp/updatePublishersWithDuplicatePartyNosAllClients.csv`;
        const writer = new WriteCsv({
          headers: [
            "CLIENT",
            "PUBLISHER ID",
            "PUBLISHER",
            "NEW PARTY NUMBER",
            "OLD PARTY NUMBER",
          ],
          outputLocation,
        });
        const outputData = updatedReport.map((line) => {
          return [
            line.client,
            line.publisherId,
            line.publisher,
            line.partyNo,
            line.oldPartyNo,
          ];
        });
        writer.addData(outputData, () => {
          writer.write((err, location) => {
            console.log(
              `>>>>>>>>>>>>>>>>>>>>File with updated Publishers written to ${location}<<<<<<<<<<<<<<<<<<<<<<`
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

updatePublishersWithDuplicatePartyNosAllClients().catch((error) => {
  logger.error(
    "Error updating Publishers with duplicate Party Numbers:",
    error
  );
});
