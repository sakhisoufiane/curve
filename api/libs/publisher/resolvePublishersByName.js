/* eslint-disable no-await-in-loop */
const PublisherController = require('../../controllers/publisher');

/**
 * Resolves an array of publisher names to their corresponding publisher IDs.
 *
 * Delegates to PublisherController.resolvePublisherByName for each name,
 * which matches case-insensitively against primary name and aliases.
 *
 * @param {Object} params
 * @param {string[]} params.publisherNames - Array of publisher name strings to resolve.
 * @param {string} params.clientId - The client ID to scope the lookup.
 * @returns {Promise<{ publisherIds: string[], errors: string[] }>}
 *   - publisherIds: Array of resolved publisher ID strings (in input order).
 *   - errors: Array of error messages for any names that could not be resolved.
 */
async function resolvePublishersByName({ publisherNames, clientId }) {
  const publisherIds = [];
  const errors = [];

  for (const name of publisherNames) {
    const trimmedName = name ? String(name).trim() : '';

    if (trimmedName) {
      const publisher = await PublisherController.resolvePublisherByName({ clientId, name: trimmedName });

      if (publisher) {
        publisherIds.push(publisher._id.toString());
      } else {
        errors.push(`Publisher '${trimmedName}' not found`);
      }
    }
  }

  return { publisherIds, errors };
}

module.exports = resolvePublishersByName;
