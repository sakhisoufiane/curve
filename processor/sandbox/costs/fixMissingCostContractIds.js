/* eslint-disable no-await-in-loop */
require('../../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Cost = require('../../models/cost');
const Release = require('../../models/release');
const Track = require('../../models/track');

// This script was designed to be ran on the Future Classic client
// But it can work on any client just by changing this ID
// -- Future Classic
const clientId = '63990c3e4dd275cb59fe0a92';

const force = process.argv.includes('--force') ?? false;

// Extra duplicate Cost IDs we've found via a report
// They have slightly different fields to the main query used in this script
// They should be marked as Reported
const costIds = [
  '66be9229f91be19b0cde9a8a',
  '66be9229f91be19b0cde9a8c',
  '66be92e57db38061b3bf0d90',
  '66be92e57db38061b3bf0d92',
  '66be92e57db38061b3bf0d94',
  '66be92e57db38061b3bf0d96',
  '66be92e57db38061b3bf0d98',
  '66be92e57db38061b3bf0d9a',
  '66be92e57db38061b3bf0d9c',
  '66be92e57db38061b3bf0d9e',
  '66be92e67db38061b3bf11c0',
  '66bf954371755a8f46f90b59',
  '673299374637325ba94dc9b7',
  '673299374637325ba94dc9b9',
  '673299374637325ba94dc9bb',
  '673299374637325ba94dc9bd',
  '673299374637325ba94dc9bf',
  '673299374637325ba94dc9c1',
  '673299374637325ba94dc9c3',
  '673299374637325ba94dc9c5',
  '673299374637325ba94dc9c7',
  '673299374637325ba94dc9c9',
  '673299374637325ba94dc9cb',
  '673299374637325ba94dc9cd',
  '673299374637325ba94dc9cf',
  '673299374637325ba94dc9d1',
  '673299374637325ba94dc9d3',
  '673299374637325ba94dc9d5',
  '673299374637325ba94dc9d7',
  '673299374637325ba94dc9d9',
  '673299374637325ba94dc9db',
  '673299374637325ba94dc9dd',
  '673299374637325ba94dc9df',
  '673299374637325ba94dc9e1',
  '673299374637325ba94dc9e3',
  '673299374637325ba94dc9e5',
  '673299374637325ba94dc9e7',
  '673299374637325ba94dc9e9',
  '673299374637325ba94dcdd7',
  '673299374637325ba94dcdd9',
  '67abed6bd7115be04ce9f098',
  '67abed6bd7115be04ce9f09a',
  '67abed6bd7115be04ce9f09c',
  '67abed6bd7115be04ce9f09e',
  '67abed6bd7115be04ce9f0a0',
  '67abed6bd7115be04ce9f0a4',
  '67abed6bd7115be04ce9f0a7',
  '67abed6bd7115be04ce9f0aa',
  '67abed6bd7115be04ce9f0b6',
  '67abed6bd7115be04ce9f0b9',
  '67abed6bd7115be04ce9f0bc',
  '67abed6bd7115be04ce9f0bf',
  '67abed6bd7115be04ce9f0c1',
  '67abed6bd7115be04ce9f0c3',
  '67abed6bd7115be04ce9f0c5',
  '67abed6bd7115be04ce9f0ca',
  '67abed6bd7115be04ce9f0d4',
  '67abed6bd7115be04ce9f0d6',
  '67abed6bd7115be04ce9f0d8',
  '67abed6bd7115be04ce9f0da',
  '67abed6bd7115be04ce9f0de',
  '67abed6bd7115be04ce9f0e0',
  '67abed6bd7115be04ce9f448',
  '67ad2ce73421241bc30a5fa2',
  '67ad2ce73421241bc30a5fa4',
  '67ad2ce73421241bc30a5fa6',
  '67ad2ce73421241bc30a5fa8',
  '67ad2ce73421241bc30a5fce',
  '67ad2ce73421241bc30a5fd0',
  '67ad2ce73421241bc30a5fd2',
  '67ad2ce73421241bc30a5fd4',
  '67ad2ce73421241bc30a5ffa',
  '67ad2ce73421241bc30a608a',
  '67ad2ce73421241bc30a608c',
  '67ad2ce73421241bc30a608e',
  '67ad2ce73421241bc30a6148',
  '67ad2ce73421241bc30a61a2',
  '67ad2ce73421241bc30a61d2',
  '6812d0877e1897d833cd09bb',
  '6812d0877e1897d833cd09f9',
  '6812d0877e1897d833cd09fc',
  '6812d0877e1897d833cd09ff',
  '6812d0877e1897d833cd0aba',
  '6812d0877e1897d833cd0ae3',
  '6812d0877e1897d833cd0ae6',
  '6812d0877e1897d833cd0ae9',
  '6812d0877e1897d833cd0aec',
  '6812d0877e1897d833cd0aef',
  '6812d0877e1897d833cd0b46',
  '6812d0877e1897d833cd0b49',
  '6812d0877e1897d833cd0b4c',
  '6812d0877e1897d833cd0b4f',
  '6812d0877e1897d833cd0bbe',
  '6812d0877e1897d833cd0c79',
  '6812d0877e1897d833cd0c88',
  '6812d0877e1897d833cd0c8b',
  '6812d0877e1897d833cd0c8e',
  '6812d0877e1897d833cd0ce5',
  '6812d0877e1897d833cd0d02',
  '6812d0877e1897d833cd0d05',
  '6812d0877e1897d833cd0d58',
  '6812d0877e1897d833cd0d96',
  '68194307c6b6568107e31286',
  '68194307c6b6568107e31288',
  '68194307c6b6568107e3128a',
  '68194307c6b6568107e3128c',
  '68194307c6b6568107e31374',
  '68194307c6b6568107e31386',
  '68194307c6b6568107e31450',
  '68194307c6b6568107e31492',
  '68194307c6b6568107e31496',
  '68194307c6b6568107e314a6',
  '68194307c6b6568107e314aa',
  '68194307c6b6568107e314ae',
  '68194307c6b6568107e314b2',
  '68194307c6b6568107e314b6',
  '67b9eed5d111e64092128547',
  '673299374637325ba94dcddf',
  '67b9eed5d111e6409212853b',
  '67b9eed5d111e6409212853f',
  '67b9eed5d111e64092128543',
  '67b9eed5d111e6409212854b',
  '67b9eed5d111e6409212854f',
  '67b9eed5d111e64092128553',
  '67b9eed5d111e6409212855b',
  '67b9eed5d111e6409212855f',
  '67b9eed5d111e64092128563',
  '67b9eed5d111e64092128567',
  '67b9eed5d111e6409212856b',
  '67b9eed5d111e6409212856f',
  '67b9eed5d111e64092128573',
  '67b9eed5d111e64092128577',
  '67b9eed5d111e6409212857b',
  '67b9eed5d111e6409212857f',
  '67b9eed5d111e64092128583',
  '67b9eed5d111e64092128537',
  '67b9eed5d111e640921285b9',
  '67b9eed5d111e640921284f7',
  '67b9eed5d111e640921284fb',
  '67b9eed5d111e640921284ff',
  '67b9eed5d111e64092128503',
  '67b9eed5d111e64092128507',
  '67b9eed5d111e6409212850b',
  '67b9eed5d111e6409212850f',
  '67b9eed5d111e64092128513',
  '67b9eed5d111e64092128517',
  '67b9eed5d111e6409212851b',
  '67b9eed5d111e6409212851f',
  '67b9eed5d111e64092128523',
  '67b9eed5d111e64092128527',
  '67b9eed5d111e6409212852b',
  '67b9eed5d111e6409212852f',
  '67b9eed5d111e64092128533',
  '67b9eed5d111e64092128557',
  '67b9eed5d111e64092128587',
  '67b9eed5d111e6409212858b',
  '67b9eed5d111e6409212858f',
  '67b9eed5d111e64092128593',
  '67b9eed5d111e64092128597',
  '67b9eed5d111e6409212859d',
  '67b9eed5d111e640921285a1',
  '67b9eed5d111e640921285a5',
  '67b9eed5d111e640921285a9',
  '67b9eed5d111e640921285ad',
  '67b9eed5d111e640921285b1',
  '67b9eed5d111e640921285b5',
];

async function main() {
  await fixCompletedCosts();
  await fixUnreportedCosts();
  logger.debug('Finished');
  process.exit();
}

async function fixCompletedCosts() {
  const costs = await Cost.find({
    clientId,
    calculationContractIds: { $size: 0 },
    reportedStatus: 'Complete',
    periodIds: { $exists: true, $ne: [] },
  });
  logger.debug('Reported Costs (with no contracts):', costs.length);

  if (costs.length === 0) {
    logger.debug('No costs to fix');
    logger.debug('Finished');
    return process.exit();
  }

  for (const cost of costs) {
    logger.debug('Fixing Cost...', cost._id.toString(), cost.name);
    if (cost.releaseIds?.length > 0) {
      const releases = await Release.find({ _id: { $in: cost.releaseIds } });
      for (const release of releases) {
        for (const costRight of release.costsRights) {
          if (costRight.contractId && !cost.calculationContractIds.includes(costRight.contractId)) {
            cost.calculationContractIds.push(costRight.contractId);
          }
        }
      }
    }
    if (cost.trackIds?.length > 0) {
      const tracks = await Track.find({ _id: { $in: cost.trackIds } });
      for (const track of tracks) {
        for (const costRight of track.costsRights) {
          if (costRight.contractId && !cost.calculationContractIds.includes(costRight.contractId)) {
            cost.calculationContractIds.push(costRight.contractId);
          }
        }
      }
    }
    if (cost.contractIds?.length > 0) {
      cost.calculationContractIds.push(...cost.contractIds);
    }
    // This is overwritten by a model hook (another issue), so we need to make sure it's correct again here
    cost.reportedStatus = 'Complete';
    logger.debug('Updated calculationContractIds:', cost.calculationContractIds.length);
  }

  logger.debug('Saving updated costs...');
  if (force) {
    await Cost.bulkSave(costs);
  } else {
    logger.debug('[SAFE MODE] No updated performed. Use --force to update Costs:', costs.length);
  }
}

async function fixUnreportedCosts() {
  const costs = await Cost.find({
    clientId,
    _id: { $in: costIds },
  });
  logger.debug('Unreported Costs (with no contracts):', costs.length);

  if (costs.length === 0) {
    logger.debug('No costs to fix');
    logger.debug('Finished');
    return process.exit();
  }

  for (const cost of costs) {
    logger.debug('Fixing Cost...', cost._id.toString(), cost.name);
    if (cost.releaseIds?.length > 0) {
      const releases = await Release.find({ _id: { $in: cost.releaseIds } });
      for (const release of releases) {
        for (const costRight of release.costsRights) {
          if (costRight.contractId && !cost.calculationContractIds.includes(costRight.contractId)) {
            cost.calculationContractIds.push(costRight.contractId);
          }
        }
      }
    }
    if (cost.trackIds?.length > 0) {
      const tracks = await Track.find({ _id: { $in: cost.trackIds } });
      for (const track of tracks) {
        for (const costRight of track.costsRights) {
          if (costRight.contractId && !cost.calculationContractIds.includes(costRight.contractId)) {
            cost.calculationContractIds.push(costRight.contractId);
          }
        }
      }
    }
    if (cost.contractIds?.length > 0) {
      cost.calculationContractIds.push(...cost.contractIds);
    }
    // This is overwritten by a model hook (another issue), so we need to make sure it's correct again here
    cost.reportedStatus = 'Complete';
    logger.debug('Updated calculationContractIds:', cost.calculationContractIds.length);
  }

  logger.debug('Saving updated costs...');
  if (force) {
    await Cost.bulkSave(costs);
  } else {
    logger.debug('[SAFE MODE] No updated performed. Use --force to update Costs:', costs.length);
  }
}

main();
