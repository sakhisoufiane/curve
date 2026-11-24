require('dotenv').config();
require('../models/db');
const SalesFile = require('../models/salesFile');

const GENERIC_ERROR_MESSAGE = 'This sales file failed to process due to an internal error. Please try revalidating, or contact support if the problem persists.';

const BQ_ERROR_FILTER = {
  'error.errors': { $exists: true },
  'error.errors.0.reason': { $exists: true },
};

const main = async () => {
  const completedWithError = await SalesFile.countDocuments({
    ...BQ_ERROR_FILTER,
    status: { $ne: 'Errored' },
  });

  const erroredWithBqError = await SalesFile.countDocuments({
    ...BQ_ERROR_FILTER,
    status: 'Errored',
  });

  console.log(`Complete (or other non-Errored) sales files with BQ error objects: ${completedWithError}`);
  console.log(`Errored sales files with BQ error objects: ${erroredWithBqError}`);
  console.log('---');
  console.log('DRY RUN - no changes made. Remove the return below to apply.');
  return;

  // Clear errors from non-Errored (e.g. Complete) sales files
  const clearResult = await SalesFile.updateMany(
    { ...BQ_ERROR_FILTER, status: { $ne: 'Errored' } },
    { $set: { error: null } },
  );
  console.log(`Cleared error from ${clearResult.modifiedCount} non-Errored sales files`);

  // Replace BQ error objects on Errored sales files with generic message
  const replaceResult = await SalesFile.updateMany(
    { ...BQ_ERROR_FILTER, status: 'Errored' },
    { $set: { error: GENERIC_ERROR_MESSAGE } },
  );
  console.log(`Replaced BQ error with generic message on ${replaceResult.modifiedCount} Errored sales files`);

  console.log('Done.');
};

main().catch(console.error);
