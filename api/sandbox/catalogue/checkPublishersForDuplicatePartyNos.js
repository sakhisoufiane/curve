require("dotenv").config();
require("../models/db");
const { logger } = require("@curveroyaltysystems/platform-shared-utils");
const Publisher = require("../models/publisher");
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

async function checkPublishersForDuplicatePartyNos() {
  let updatedReport = [];
  let totalDuplicates = 0;

  const clients = await Client.find({});

  async.eachLimit(
    clients,
    10,
    async (client) => {
      const publishersWithDuplicatePartyNosByClient =
        await findDuplicatePartyNosByClient(client._id.toString());

      if (publishersWithDuplicatePartyNosByClient.length > 0) {
        publishersWithDuplicatePartyNosByClient.forEach((publisher) => {
          totalDuplicates += publisher.count;
        });
        logger.info(
          `>>>>>>>>>>>>>>>>>>>There are ${totalDuplicates} Publishers with duplicate Party Numbers for ${client.name}<<<<<<<<<<<<<<<<<<<<<<`
        );

        for (const duplicatePublisherIds of publishersWithDuplicatePartyNosByClient) {
          await async.eachLimit(
            duplicatePublisherIds.publisherIds,
            100,
            async (publisherId) => {
              const foundPublisher = await Publisher.findById(publisherId);
              if (foundPublisher) {
                updatedReport.push({
                  client: client.name,
                  publisherId: foundPublisher._id,
                  publisher: foundPublisher.name,
                  partyNo: foundPublisher.partyNo,
                });
              }
            }
          );
        }
      }
    },
    () => {
      if (updatedReport.length > 0) {
        const outputLocation = `${appRootDir}/tmp/publishersWithDuplicatePartyNos.csv`;
        const writer = new WriteCsv({
          headers: ["CLIENT", "PUBLISHER ID", "PUBLISHER", "PARTY NUMBER"],
          outputLocation,
        });
        const outputData = updatedReport.map((line) => {
          return [line.client, line.publisherId, line.publisher, line.partyNo];
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

checkPublishersForDuplicatePartyNos().catch((error) => {
  logger.error("Error updating Publishers with duplicates:", error);
});
