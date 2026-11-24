require("dotenv").config();
require("../models/db");
const { logger } = require("@curveroyaltysystems/platform-shared-utils");
const Composer = require("../models/composer");
const Publisher = require("../models/publisher");
const Client = require("../models/client");
const async = require("async");
const appRootDir = require("app-root-dir").get();
const WriteCsv = require("../libs/writeCsv");
const duplicatePublishersReport = [];
const duplicateComposersReport = [];

async function findDuplicates(model, type, clientId) {
  const query = [
    {
      $match: {
        clientId: clientId,
        cae: { $nin: [null, ""] },
      },
    },
    {
      $group: {
        _id: {
          cae: "$cae",
          clientId: "$clientId",
        },
        count: {
          $sum: 1,
        },
        cae: {
          $first: "$cae",
        },
        ids: {
          $addToSet: "$_id",
        },
        type: {
          $first: type,
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
        cae: 1,
        count: 1,
        ids: 1,
        type: 1,
      },
    },
  ];
  const results = await model.aggregate(query);
  return results;
}

async function prepareReport(duplicates, model, type, clientName) {
async.eachLimit(duplicates, 50, async (duplicate) => {
  const foundDuplicates = await model.find({ '_id': { $in: duplicate.ids } }); // one find for all publishers / composers, minimising db calls
  foundDuplicates.forEach(foundDuplicate => {
    if (type === "Publishers") {
      duplicatePublishersReport.push({
        type: type,
        client: clientName,
        id: foundDuplicate._id,
        name: foundDuplicate.name,
        cae: duplicate.cae,
        count: duplicate.count,
      });
    } else {
      duplicateComposersReport.push({
        type: type,
        client: clientName,
        id: foundDuplicate._id,
        name: foundDuplicate.name,
        cae: duplicate.cae,
        count: duplicate.count,
      });
    }
  });
})
}

function generateReport(duplicatesReport, type) {
  logger.info(`>>>>>>>>>>>>>>>>>>>>Generating ${type} report<<<<<<<<<<<<<<<<<<<<<<`);
  return new Promise((resolve, reject) => {
    if (duplicatesReport.length > 0) {
      const outputLocation = `${appRootDir}/tmp/${type}WithDuplicateCaes.csv`;
      const writer = new WriteCsv({
        headers: ["TYPE", "CLIENT", "ID", "NAME", "CAE", "COUNT"],
        outputLocation,
      });
      const outputData = duplicatesReport.map((line) => {
        return [line.type, line.client, line.id, line.name, `'${line.cae}`, line.count];
      });
      writer.addData(outputData, () => {
        writer.write((err, location) => {
          if (err) reject(err);
          logger.info(`>>>>>>>>>>>>>>>>>>>>File written to ${location}<<<<<<<<<<<<<<<<<<<<<<`);
          resolve();
        });
      });
    } else {
      resolve();
    }
  });
}

async function checkDuplicateCaes() {
  const clients = await Client.find();
  await async.eachLimit(clients, 10, async (client) => {
    const duplicatePublishers = await findDuplicates(Publisher,"Publisher", client._id.toString());
    const duplicateComposers = await findDuplicates(Composer, "Composer", client._id.toString());

    if (duplicateComposers.length > 0) {
      logger.info(`>>>>>>>>>>>>>>>>>>>>${duplicateComposers.length} Composers with duplicate CAE'S found for ${client.name}<<<<<<<<<<<<<<<<<<<<<<`);
      await prepareReport(duplicateComposers, Composer, "Composers", client.name);
    }

    if (duplicatePublishers.length > 0) {
      logger.info(`>>>>>>>>>>>>>>>>>>>>${duplicatePublishers.length} Publishers with duplicate CAE'S found for ${client.name}<<<<<<<<<<<<<<<<<<<<<<`);
      await prepareReport(duplicatePublishers, Publisher, "Publishers", client.name);
    }
  });

  Promise.all([
    generateReport(duplicatePublishersReport, "Publishers"),
    generateReport(duplicateComposersReport, "Composers")
  ]).then(() => process.exit());
}

checkDuplicateCaes().catch((err) => {
  logger.error(err);
})
