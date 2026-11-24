/*
Description: Generates a CSV file that lists which Delivery Partners have duplicate names
Time to run: Staging: 3s
Ticket No: CURV-3395
Category: Delivery Partners
Author: Kassim Sachoo
*/

require("dotenv").config();
const appRootDir = require("app-root-dir").get();
require("../../models/db");
const { logger } = require("@curveroyaltysystems/platform-shared-utils");
const { WriteCsv } = require("@curveroyaltysystems/curve-shared-logic");
const DeliveryPartner = require("../../models/deliveryPartner");

const run = async () => {
  logger.info("Script retrieveDuplicatedPartnerNames started");
  try {
    const aggregation = [
      {
        $group: {
          _id: {
            name: "$name",
            clientId: {
              $toObjectId: "$clientId",
            },
          },
          count: {
            $sum: 1,
          },
          allIds: {
            $push: "$_id",
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
        $lookup: {
          from: "clients",
          localField: "_id.clientId",
          foreignField: "_id",
          as: "client",
        },
      },
      {
        $unwind: "$client",
      },
      {
        $unwind: "$allIds",
      },
      {
        $project: {
          _id: 0,
          clientName: "$client.name",
          clientId: {
            $toString: "$client._id",
          },
          partnerName: "$_id.name",
          partnerId: {
            $toString: "$allIds",
          },
        },
      },
    ];

    const results = await DeliveryPartner.aggregate(aggregation);
    const outputData = results.map(
      ({ clientName, clientId, partnerName, partnerId }) => [
        clientName,
        clientId,
        partnerName,
        partnerId,
      ]
    );

    const outputLocation = `${appRootDir}/tmp/duplicate-partner-names.csv`;
    const writer = new WriteCsv({
      headers: ["Client Name", "CLient ID", "Partner Name", "Partner ID"],
      outputLocation,
    });

    writer.addData(outputData, () => {
      writer.write((err, location) => {
        if (err) {
          console.error(err);
          throw err;
        }
        logger.info(
          `Script retrieveDuplicatedPartnerNames complete - file saved to ${location}`
        );
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error(error);
    process.exit(-1);
  }
};

run();
