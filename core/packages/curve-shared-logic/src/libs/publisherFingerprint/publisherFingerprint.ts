import { ObjectId } from 'mongodb';

const SEPARATOR = ':';

/**
 * Validates that a value is a non-empty string and a valid MongoDB ObjectId.
 */
const isValidPublisherId = (id: unknown): boolean =>
  typeof id === 'string' && id.trim().length > 0 && ObjectId.isValid(id);

/**
 * Generates a fingerprint from an array of publisher IDs.
 *
 * The fingerprint is created by:
 * 1. Validating each ID is a non-empty, valid ObjectId
 * 2. Sorting the valid IDs in lexicographic order
 * 3. Joining them with a colon separator
 *
 * This ensures order-agnostic matching — the same set of publishers
 * will always produce the same fingerprint regardless of input order.
 *
 * @param publisherIds - Array of publisher ID strings
 * @returns The fingerprint string, or empty string if no valid IDs provided
 * @throws Error if any publisher ID is invalid
 */
export const generatePublisherFingerprint = (publisherIds: string[]): string => {
  if (!publisherIds || !Array.isArray(publisherIds) || publisherIds.length === 0) return '';

  const invalidIds = publisherIds.filter((id) => !isValidPublisherId(id));
  if (invalidIds.length > 0) {
    throw new Error(`Invalid publisher ID(s): ${invalidIds.map((id) => `${id}`).join(', ')}`);
  }

  return Array.from(new Set(publisherIds)).sort().join(SEPARATOR);
};

export default { generatePublisherFingerprint };
