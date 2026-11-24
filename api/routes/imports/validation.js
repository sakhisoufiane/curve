const Import = require('../../models/import');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function validateFilename({ clientId, filename, excludeId }) {
  const validationErrors = {};

  if (filename) {
    const query = { clientId, 'counterpointFiles.publishingCatalogueExport': { $regex: new RegExp(`/${escapeRegex(filename)}$`, 'i') } };
    if (excludeId) query._id = { $ne: excludeId };
    const filenameExists = await Import.findOne(query, { _id: 1 }).lean();
    if (filenameExists) validationErrors.filename = 'Filename already exists';
  }

  return validationErrors;
}

module.exports = { validateFilename };
