const { eachLimit } = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

require('../models/db');
const Contract = require('../models/contract');

let count = 0;

const flushPayees = async ({ lastId }) => {
  const limit = 1000;

  let query = { payeeId: { $exists: true } }
  if (lastId) { query._id = { $gt: lastId } }

  const contracts = await Contract.find(query).select('_id payeeId').sort({ _id: 1 }).limit(limit);

  if (!contracts?.length) {
    logger.debug('No Contracts To Process');
    return;
  }

  await eachLimit(contracts, 200, async (contract) => {
    const formattedContract = contract.toObject();

    if (!formattedContract.payeeId) return;

    const options = { timestamp: false }
    const update = { 
      $set: { 
        payees: [{ payeeId: formattedContract.payeeId, percentage: 100 }],
        payeeBalanceCondition: 'Never',
      },
      $unset: { payeeId: null },
    };

    await Contract.findByIdAndUpdate(formattedContract._id, update, options);

    count += 1;
    process.stdout.write(`\r⌛️ Processed ${count} Contracts ⌛️`)
  });

  if (contracts.length === limit) {
    await flushPayees({ lastId: contracts[contracts.length - 1]._id });
  } else {
    process.stdout.write(`\n`)
  }
}

// Staging Time (40,539 contracts) 14:13.337
console.time('Execution Time'); // Start the timer

flushPayees({ lastId: null }).then(() => {
  logger.info('Complete');
  logger.info(`Script Updated ${count} contracts`)
  console.timeEnd('Execution Time');

  process.exit(0);
}).catch((err) => {
  logger.error(err);
  console.timeEnd('Execution Time');

  process.exit(0);
});
