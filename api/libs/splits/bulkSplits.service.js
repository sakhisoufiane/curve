const BulkSplits = require('../../models/bulkSplits');
const { BULK_SPLITS_STATUS } = require('../enums');

async function createRecord({
  curveUser,
  type,
  query = {},
}) {
  const record = new BulkSplits({
    name: query.title || `Splits ${type} ${new Date().toISOString()}`,
    clientId: curveUser.clientId,
    organisationId: curveUser.clientId,
    errors: [],
    status: BULK_SPLITS_STATUS.PENDING,
    filter: query,
    fugaUserEmail: query.fugaUserEmail || '',
    updatedCount: 0,
    type,
    errorMessage: '',
    updatedBy: curveUser.id,
    file: '',
    errorFile: '',
  });

  return record.save();
}

async function markInProgress(recordId, clientId) {
  return BulkSplits.updateOne(
    { _id: recordId, clientId },
    {
      status: BULK_SPLITS_STATUS.IN_PROGRESS,
      updatedAt: new Date(),
    },
  );
}

async function markAsComplete({ recordId, clientId, fileData, errorFileData, updatedCount, totalCount }) {
  return BulkSplits.updateOne(
    { _id: recordId, clientId },

    {
      status: BULK_SPLITS_STATUS.COMPLETE,
      file: fileData.publicLink,
      fileKey: fileData.s3Key,
      errorFile: errorFileData.publicLink,
      errorFileKey: errorFileData.s3Key,
      count: totalCount,
      updatedCount,
      updatedAt: new Date(),
    },
  );
}

async function markAsErrored(recordId, clientId, { errorMessage, errorCause }) {
  return BulkSplits.updateOne(
    { _id: recordId, clientId },
    {
      status: BULK_SPLITS_STATUS.ERRORED,
      errorMessage: JSON.stringify({
        message: errorMessage,
        code: errorCause,
      }),
      updatedAt: new Date(),
    },
  );
}

module.exports = {
  createRecord,
  markInProgress,
  markAsComplete,
  markAsErrored,
};
