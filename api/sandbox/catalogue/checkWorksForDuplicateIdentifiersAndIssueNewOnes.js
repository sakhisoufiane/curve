/**
 * Category: Works
 * Description: This script needs updated before use. It does not update the identifierNo
 *
 * 
 * Autor: 
 * 
 * Tickets using this script:
 * 
 */
require('dotenv').config();
require('../models/db');
const async = require('async');
const appRootDir = require('app-root-dir').get();
const WriteCsv = require('../libs/writeCsv');
const Work = require('../models/work');
const Client = require('../models/client');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const border = '**************';
const changedWorks = [];
const log = (message) => logger.info(`${border} ${message} ${border}`);
const logErr = (message) => logger.error(`${border} ${message} ${border}`);
let foundDuplicates = false;

// checks all clients works in parallel for duplicate identifiers
const checkWorksForDuplicateIdentifiersAndIssueNewOnes = async (clients) => {
  log(`Checking ${clients.length} Publising Clients Works for duplicate Identifiers`);
  await async.eachLimit(clients, 100, async (client) => {
    const worksWithDuplicates = await checkForDuplicates(client._id.toString());
    if (worksWithDuplicates && worksWithDuplicates.length) {
      await processDuplicateWorks(client, worksWithDuplicates); // if duplicates are found - process
    };
  });
  if (!foundDuplicates) {
    log('No duplicate Identifiers found across all Publishing Clients` Works')
  }
};

// takes array of duplicates and processes one by one to ensure further duplicates are not created
const processDuplicateWorks = async (client, worksWithDuplicates) => {
  foundDuplicates = true;
  log(`Found ${worksWithDuplicates.length} works with duplicates for Client:`);
  await async.eachSeries(worksWithDuplicates, async (workWithDuplicateIdentifier) => {
    const foundWork = await Work.findOne({ clientId: client._id, _id: workWithDuplicateIdentifier.id.toString() });
      await issueIdentifier(client, foundWork, 1); // issue new identifier for all works with duplicates
    }
  );
};

/*
Processes individual Work depending on Client set up and Work fields 
SCENARIOS
1. Prefix and identifierNo - Identifier should be the prefix + highest identifierNo + increment until unique identifier found
2. Prefix but no identifierNo - Identfier should be prefix + increment until unique identifier found
3. No prefix but identifierNo - Identifier should be highest identifierNo + increment
4. No prefix and no identifierNo - Identifier should be highest identifier + increment
*/
const issueIdentifier = async (client, work, increment) => {
  let identifierToUse;
  if (client.identifierPrefix && work.identifierNo) { 
    const workHighestIdentfierNo = await findHighestNoToUse(work, 'identifierNo');
    identifierToUse = `${client.identifierPrefix}${workHighestIdentfierNo.identifierNo + increment}`;
  }
  else if (client.identifierPrefix) { 
    const workHighestIdentifier = await findHighestNoToUse(work, 'identifier');
    const numFromHighestIdentifier = parseInt(workHighestIdentifier?.identifier.replace(client.identifierPrefix, '')); // remove prefix to get highest number
    identifierToUse = `${client.identifierPrefix}${numFromHighestIdentifier + increment || increment}`;
  }
  else if (work.identifierNo) { 
    const workWithHighestIdentfierNo = await findHighestNoToUse(work, 'identifierNo');
    identifierToUse = workWithHighestIdentfierNo.identifierNo + increment || increment;
  }
  else { 
    const workWithnextHighestIdentifier = await findHighestNoToUse(work, 'identifier');
    const numberOfHighestIdentifier = parseInt(workWithnextHighestIdentifier.identifier); // some identifiers have letters regardless of no prefix
    identifierToUse = numberOfHighestIdentifier + increment || increment;
  }
  await checkNextSteps(work, client, identifierToUse, increment);
};

// Helper function to get highest identifier or identifierNo
const findHighestNoToUse = async (work, field) => {
  const highestId = await Work.findOne({ clientId: work.clientId }, { [field]: 1 }).sort({ [field]: -1 });
  return highestId;
};

// Checks whether Work exists with proposed identifierToUse
const checkNextSteps = async (work, client, identifierToUse, increment) => {
  const existingWork = await Work.findOne({clientId: work.clientId, identifier: identifierToUse});
  if (existingWork) {
    log(`Existing Work with Identifier ${identifierToUse}, trying again with ${increment + 1}`)
    await issueIdentifier(client, work, increment + 1); // process again until unique identifier 
  } else {
    await updateWork(work, identifierToUse);
  }
}

// Update Work since identifierToUse is unique for the client
const updateWork = async (work, identifierToUse) => {
  const initialIdentifier = work.identifier;
  const updatedWork = await Work.findByIdAndUpdate(work._id, { $set: { identifier: identifierToUse } }, { timestamps: false, new: true });
  if (updatedWork) {
    changedWorks.push({ workId: work._id, workTitle: work.title, initialIdentifier: initialIdentifier, newIdentifier: identifierToUse });
  } else {
    logErr(`Error Updating Work: ${work._id}`);
  }
};

const prepareReport = () => {
  const outputLocation = `${appRootDir}/tmp/updatedWorksIdentifiers.csv`;
  const csvWriter = new WriteCsv({
    headers: ['WORK ID', 'WORK TITLE', 'INITIAL IDENTIFIER', 'NEW IDENTIFIER'],
    outputLocation,
  });
  const outputData = changedWorks.map((line) => {
    return [line.workId, line.workTitle, line.initialIdentifier, line.newIdentifier];
  });
  csvWriter.addData(outputData, () => {
    csvWriter.write((err, fileLocation) => {
      if (err) {
        logErr(`Error Writing CSV Report: ${err}`);
      } else {
        log(`Script complete. Report: ${fileLocation}`);
        process.exit(0);
      }
    });
  });
};

// aggregation to check for duplicate identifiers
const checkForDuplicates = async (clientId) => {
  const query = [
    {
      $match: {
        clientId: clientId,
        identifier: {
          $nin: [null, ''],
        },
      },
    },
    {
      $group: {
        _id: {
          identifier: '$identifier',
          clientId: '$clientId',
        },
        count: {
          $sum: 1,
        },
        workIds: {
          $addToSet: '$_id',
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
        workIds: 1,
        identifier: '$_id.identifier', // Include the identifier in the result
      },
    },
    {
      $unwind: '$workIds',
    },
    {
      $group: {
        _id: null, // don't need to group by any key, hence using null.
        allWorkIds: {
          $push: {
            id: '$workIds',
            identifier: '$identifier', // Keep the identifier associated with the workIds
          },
        },
      },
    },
    {
      $project: {
        _id: 0, // Exclude the _id field
        allWorkIds: 1,
      },
    },
  ];

  const results = await Work.aggregate(query);
  return results[0]?.allWorkIds;
};

const runScript = async () => {
  const clients = await Client.find({ clientType: 'Publisher' }, { _id: 1, name: 1, identifierPrefix: 1, identifierStartFrom: 1 });
  await checkWorksForDuplicateIdentifiersAndIssueNewOnes(clients);
  prepareReport();
};

runScript().catch((err) => {
  logErr(`ERROR: ${err}`)
});