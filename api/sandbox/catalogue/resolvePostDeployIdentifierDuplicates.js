/*
Description: Post-deploy script to resolve any duplicate Main Identifiers created during the
             window between the initIdentifierSequences seed script running and the atomic
             issueIdentifier fix being deployed. Only touches works created after the seed
             script ran. Uses the atomic counter to stay in sync with identifierSequence.
Time To Run: varies by catalogue size
Category: Works
*/
require('dotenv').config();
require('../../models/db');
const appRootDir = require('app-root-dir').get();
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Work = require('../../models/work/work');
const Client = require('../../models/client');
const WriteCsv = require('../../libs/writeCsv');

// Hardcode to just before the seed script was run — only inspect works created after this
const CREATED_AFTER = new Date('2026-01-01T00:00:00.000Z'); // TODO: set to actual seed script run time

const border = '**************';
const changedWorks = [];
const log = (message) => logger.info(`${border} ${message} ${border}`);
const logErr = (message) => logger.error(`${border} ${message} ${border}`);

const checkForDuplicates = async (clientId) => {
  const results = await Work.aggregate([
    {
      $match: {
        clientId,
        identifier: { $nin: [null, ''] },
        createdAt: { $gt: CREATED_AFTER },
      },
    },
    {
      $group: {
        _id: '$identifier',
        count: { $sum: 1 },
        workIds: { $addToSet: '$_id' },
      },
    },
    {
      $match: { count: { $gt: 1 } },
    },
    {
      $unwind: '$workIds',
    },
    {
      $group: {
        _id: null,
        allWorkIds: { $push: { id: '$workIds', identifier: '$_id' } },
      },
    },
    {
      $project: { _id: 0, allWorkIds: 1 },
    },
  ]);
  return results[0]?.allWorkIds;
};

const claimNextIdentifier = async (client) => {
  const updated = await Client.findOneAndUpdate(
    { _id: client._id, issueIdentifier: true },
    [
      {
        $set: {
          identifierSequence: {
            $max: [
              { $add: [{ $ifNull: ['$identifierSequence', 0] }, 1] },
              { $ifNull: ['$identifierStartFrom', 1] },
            ],
          },
        },
      },
    ],
    { new: true }
  );
  return updated;
};

const processDuplicateWorks = async (client, worksWithDuplicates) => {
  log(`Found ${worksWithDuplicates.length} duplicate work(s) for client ${client._id}`);

  const seen = new Set();
  for (const { id, identifier } of worksWithDuplicates) {
    if (!seen.has(identifier)) {
      seen.add(identifier);
      continue; // keep the first occurrence, reassign subsequent ones
    }

    const work = await Work.findById(id);
    if (!work) {
      logErr(`Work ${id} not found, skipping`);
      continue;
    }

    const claimed = await claimNextIdentifier(client);
    if (!claimed) {
      logErr(`Could not claim identifier for work ${id}, skipping`);
      continue;
    }

    const newIdentifier = claimed.identifierPrefix
      ? `${claimed.identifierPrefix}${claimed.identifierSequence}`
      : String(claimed.identifierSequence);

    await Work.findByIdAndUpdate(
      work._id,
      { $set: { identifier: newIdentifier, identifierNo: claimed.identifierSequence } },
      { timestamps: false }
    );

    log(`Work ${work._id}: ${identifier} → ${newIdentifier}`);
    changedWorks.push({
      workId: work._id,
      workTitle: work.title,
      initialIdentifier: identifier,
      newIdentifier,
    });
  }
};

const prepareReport = () => {
  const outputLocation = `${appRootDir}/tmp/resolvedPostDeployIdentifierDuplicates.csv`;
  const csvWriter = new WriteCsv({
    headers: ['WORK ID', 'WORK TITLE', 'INITIAL IDENTIFIER', 'NEW IDENTIFIER'],
    outputLocation,
  });
  const outputData = changedWorks.map((line) => [
    line.workId,
    line.workTitle,
    line.initialIdentifier,
    line.newIdentifier,
  ]);
  csvWriter.addData(outputData, () => {
    csvWriter.write((err, fileLocation) => {
      if (err) {
        logErr(`Error writing CSV report: ${err}`);
      } else {
        log(`Script complete. Report: ${fileLocation}`);
        process.exit(0);
      }
    });
  });
};

const run = async () => {
  log(`Checking for duplicate identifiers on works created after ${CREATED_AFTER.toISOString()}`);

  const clients = await Client.find(
    { issueIdentifier: true },
    { _id: 1, identifierPrefix: 1, identifierStartFrom: 1 }
  ).lean();

  log(`Found ${clients.length} client(s) with issueIdentifier enabled`);

  for (const client of clients) {
    const duplicates = await checkForDuplicates(client._id.toString());
    if (duplicates?.length) {
      await processDuplicateWorks(client, duplicates);
    }
  }

  if (!changedWorks.length) {
    log('No duplicate identifiers found — nothing to do');
    process.exit(0);
  }

  prepareReport();
};

run().catch((err) => {
  logErr(`ERROR: ${err}`);
  process.exit(1);
});
