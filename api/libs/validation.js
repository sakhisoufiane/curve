const { ObjectId } = require('@curveroyaltysystems/models/mongoose').Types;
const Client = require('../models/client');
const { throwError } = require('./errors');

const validateClient = async (clientId) => {
  if (!clientId || !ObjectId.isValid(clientId)) {
    throwError({
      message: 'Valid organisation ID required',
      code: 400,
      cause: 'INVALID_CLIENT_ID',
    });
  }

  const client = await Client.findById(clientId);
  if (!client) {
    throwError({
      message: 'Organisation not found',
      code: 404,
      cause: 'CLIENT_NOT_FOUND',
    });
  }

  return client;
};

const validateFile = (file, allowedExtensions) => {
  if (!file) {
    throwError({
      message: 'No file uploaded',
      code: 400,
      cause: 'FILE01',
    });
  }

  const fileName = file.originalname.toLowerCase();

  if (!hasValidExtension(fileName, allowedExtensions)) {
    const extensionList = allowedExtensions.join(', ');
    throwError({
      message: `Only ${extensionList} files are supported`,
      code: 400,
      cause: 'INVALID_FILE',
    });
  }
};

const hasValidExtension = (fileName, allowedExtensions) => allowedExtensions.some((ext) => fileName.endsWith(ext));

module.exports = {
  validateClient,
  validateFile,
};
