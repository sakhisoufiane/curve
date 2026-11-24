const { ObjectId } = require('@curveroyaltysystems/models/mongoose').Types;
const _ = require('lodash');
const { throwError } = require('../libs/errors');
const apiHelper = require('../libs/apiHelper');
const Import = require('../models/import');
const ImportPartner = require('../models/importPartner');

const validateImportPartner = async ({ importPartnerId }) => {
  const messageNotFound = `Did not find an Import Partner matching this ID: ${importPartnerId}`;
  if (!importPartnerId || !ObjectId.isValid(importPartnerId.toString())) throwError({ message: messageNotFound, code: 404 });

  const importPartner = await ImportPartner.findById(importPartnerId).lean();
  if (!importPartner) throwError({ message: messageNotFound, code: 404 });

  return importPartner;
};

const getImportPartnersFilter = ({ curveUser, query }) => {
  const params = {};

  if (curveUser.clientId) { params.clientId = curveUser.clientId; }

  // Filter by transferring system query parameter
  if (query.transferringSystem) params.transferringSystem = query.transferringSystem;

  if (query.text) {
    const regex = new RegExp(_.escapeRegExp(query.text), 'i');

    if (query.text.length === 24 && ObjectId.isValid(query.text)) {
      params.$or = [{ _id: query.text }, { name: { $regex: regex } }];
    } else {
      params.name = { $regex: regex };
    }
  }

  return params;
};

const getImportPartners = async ({ curveUser, query }) => {
  apiHelper.checkReadAccessToCatalogue({ curveUser });

  const filter = getImportPartnersFilter({ curveUser, query });
  const paginationParams = apiHelper.getPaginationParams({ query, selectFields: '_id clientId name transferringSystem notes defaults setMainIdentifier ingestionTerritory createdAt' });
  const result = await ImportPartner.paginate(filter, paginationParams);
  result.pages = result?.totalPages;
  result.total = result?.totalDocs;

  return apiHelper.getFormattedMetadata({ data: result, dataName: 'importPartners' });
};

const getImportPartner = async ({ curveUser, importPartnerId }) => {
  apiHelper.checkReadAccessToCatalogue({ curveUser });

  return validateImportPartner({ importPartnerId });
};

const createImportPartner = async ({ curveUser, importPartner }) => {
  const newImportPartner = new ImportPartner({ ...importPartner, clientId: curveUser.clientId });
  await apiHelper.checkWriteAccessToCatalogue({ curveUser, document: newImportPartner.toObject() });

  return newImportPartner.save();
};

const updateImportPartner = async ({ curveUser, importPartnerId, importPartner }) => {
  await apiHelper.checkWriteAccessToCatalogue({ curveUser, document: importPartner });
  await validateImportPartner({ importPartnerId });

  return ImportPartner.findByIdAndUpdate(importPartnerId, importPartner, { new: true });
};

const deleteImportPartner = async ({ curveUser, importPartnerId }) => {
  const importPartner = await validateImportPartner({ importPartnerId });
  await apiHelper.checkWriteAccessToCatalogue({ curveUser, document: importPartner });

  const importCount = await Import.countDocuments({ importPartnerId });
  if (importCount > 0) throwError({ code: 400, message: 'Import Partner can not be deleted as it has been used on Imports' });

  return ImportPartner.findByIdAndDelete(importPartnerId);
};

module.exports = {
  getImportPartners,
  getImportPartner,
  createImportPartner,
  updateImportPartner,
  deleteImportPartner,
};
