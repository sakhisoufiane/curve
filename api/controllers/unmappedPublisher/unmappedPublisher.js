const _ = require('lodash');

const UnmappedPublisher = require('../../models/unmappedPublisher');
const Publisher = require('../../models/publisher');

const UnmappedPublisherController = this;

/**
 * Creates an error with an attached HTTP status code for use by the route layer.
 *
 * @param {string} message
 * @param {number} statusCode
 * @returns {Error}
 */
function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Maps an unrecognised publisher name to an existing Publisher document.
 * Adds the unmapped name as an alias on the target publisher (unless already present),
 * then marks the UnmappedPublisher record as complete.
 *
 * @param {string} unmappedPublisherId
 * @param {string} publisherId
 * @param {string} clientId
 * @returns {Promise<{ unmappedPublisher: object }>}
 */
UnmappedPublisherController.mapToExisting = async ({ unmappedPublisherId, publisherId, clientId }) => {
  const unmappedPublisher = await UnmappedPublisher.findOne({ _id: { $eq: unmappedPublisherId }, clientId: { $eq: clientId } });
  if (!unmappedPublisher) {
    throw createError('Could not find UnmappedPublisher with the given ID', 404);
  }

  const targetPublisher = await Publisher.findOne({ _id: { $eq: publisherId }, clientId: { $eq: clientId } });
  if (!targetPublisher) {
    throw createError('Could not find Publisher with the given ID', 404);
  }

  const aliasToAdd = unmappedPublisher.name;
  const aliasLower = aliasToAdd.toLowerCase();

  // Skip conflict check and $addToSet if the target already carries this name or alias
  const targetNameLower = (targetPublisher.lowerCaseName || targetPublisher.name || '').toLowerCase();
  const targetAliasesLower = (targetPublisher.aliases || []).map((a) => a.toLowerCase());
  const alreadyPresent = targetNameLower === aliasLower || targetAliasesLower.includes(aliasLower);

  if (!alreadyPresent) {
    // Validate alias uniqueness — no other publisher may already hold this name or alias
    const conflictingPublisher = await Publisher.findOne({
      clientId: { $eq: clientId },
      _id: { $ne: String(publisherId) },
      $or: [
        { aliases: { $regex: new RegExp(`^${_.escapeRegExp(aliasLower)}$`, 'i') } },
        { lowerCaseName: aliasLower },
      ],
    });

    if (conflictingPublisher) {
      throw createError(
        `Error: '${conflictingPublisher.name}' already has the alias '${aliasToAdd}'. Please select a different publisher or create a new one.`,
        409,
      );
    }

    await Publisher.findOneAndUpdate(
      { _id: { $eq: String(publisherId) }, clientId: { $eq: clientId } },
      { $addToSet: { aliases: aliasToAdd } },
    );
  }

  unmappedPublisher.publisherId = publisherId;
  unmappedPublisher.complete = true;
  await unmappedPublisher.save();

  return { unmappedPublisher };
};

/**
 * Creates a new Publisher document from an unrecognised publisher name, then marks
 * the UnmappedPublisher record as complete.
 *
 * @param {string} unmappedPublisherId
 * @param {string} clientId
 * @param {string} userId
 * @returns {Promise<{ publisher: object, unmappedPublisher: object }>}
 */
UnmappedPublisherController.createNew = async ({ unmappedPublisherId, clientId, userId }) => {
  const unmappedPublisher = await UnmappedPublisher.findOne({ _id: { $eq: unmappedPublisherId }, clientId: { $eq: clientId } });
  if (!unmappedPublisher) {
    throw createError('Could not find UnmappedPublisher with the given ID', 404);
  }

  const nameLower = unmappedPublisher.name.toLowerCase();

  // Prevent creation when a publisher with this primary name or alias already exists
  const existingPublisher = await Publisher.findOne({
    clientId: { $eq: clientId },
    $or: [
      { lowerCaseName: nameLower },
      { aliases: { $regex: new RegExp(`^${nameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
    ],
  });

  if (existingPublisher) {
    throw createError(
      `A publisher named '${unmappedPublisher.name}' already exists. Use the search box to map to it instead.`,
      409,
    );
  }

  const newPublisher = new Publisher({
    clientId,
    name: unmappedPublisher.name,
    lowerCaseName: nameLower,
    aliases: [],
    createdBy: userId,
    lastModifiedBy: userId,
  });

  const savedPublisher = await newPublisher.save();

  unmappedPublisher.publisherId = savedPublisher._id.toString();
  unmappedPublisher.complete = true;
  await unmappedPublisher.save();

  return { publisher: savedPublisher, unmappedPublisher };
};

/**
 * Converts query params to a MongoDB filter object for UnmappedPublisher queries.
 *
 * @param {object} inputParams - The query params from the request
 * @param {object} user - The authenticated user object
 * @returns {object} MongoDB filter
 */
UnmappedPublisherController.paramsToFilterField = (inputParams, user) => {
  const filter = {};

  if (user.clientId) { filter.clientId = user.clientId; }

  if (inputParams.salesFileId) { filter.salesFileId = inputParams.salesFileId; }
  if (Array.isArray(inputParams.salesFileIds) && inputParams.salesFileIds.length > 0) {
    filter.salesFileId = { $in: inputParams.salesFileIds };
  }

  if (inputParams.complete === 'true') { filter.complete = true; }
  if (inputParams.complete === 'false') { filter.complete = { $ne: true }; }

  if (inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
    filter.name = { $regex: regex };
  }

  return filter;
};

module.exports = UnmappedPublisherController;
