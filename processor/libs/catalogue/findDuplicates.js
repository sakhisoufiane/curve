/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
const { logger } = require('@curveroyaltysystems/logger');
const { chunk, capitalize } = require('lodash');

const Work = require('../../models/work');
const Composer = require('../../models/composer');
const Publisher = require('../../models/publisher');
const Notification = require('../../models/notification');
const Client = require('../../models/client');

// Constants for token weights (importance in similarity when comparing Works)
const TITLE_WEIGHT = 7; // HIGH weight
const ALT_TITLE_WEIGHT = 2; // MEDIUM weight
const COMPOSER_WEIGHT = 1; // LOW weight

// Similarity threshold for considering Works as duplicates
const SIMILARITY_THRESHOLD = 0.85;

// Batch size for bulk Work updates
const BULK_UPDATE_BATCH_SIZE = 500;

// Number of bands for Locality Sensitive Hashing (LSH)
const LSH_BANDS = 5;

/**
 * Find and process duplicate works for a specific client.
 * This function streams works from the database, tokenizes and hashes them,
 * groups them into buckets using Locality Sensitive Hashing (LSH),
 * compares them to find duplicates, and updates the works with potential duplicates.
 * @param {Object} params - Parameters for finding duplicate works.
 * @param {string} params.clientId - The ID of the client to find duplicates for.
 * @param {string} params.type - The type of entity to find duplicates for (e.g., "work", "composer", "publisher").
 * @returns {Promise<void>} - Resolves when the processing is complete.
 */
async function findDuplicates({ clientId, type, email }) {
  if (!clientId || !type) {
    throw new Error('Client ID and catalogue type must be specified');
  }
  logger.info('Searching catalogue for duplicate type:', type);

  const count = await getModelType(type).countDocuments({ clientId }).lean();
  logger.info(`Total ${type}s to process:`, count);
  if (count === 0) {
    logger.info(`No ${type}s found for client`);
    return;
  }

  logger.info(`Fetching ${type}s for client`);
  const cursor = FindDuplicates.getStreamedCatalogue(clientId, type);

  logger.info('Searching for duplicates...');
  const groups = await FindDuplicates.getDuplicateGroups(cursor, type);

  logger.info('Duplicates found:', groups.length);
  if (groups.length === 0) {
    logger.info('No duplicates found');
    return;
  }

  // Build batched bulk update operations
  const batchedOperations = FindDuplicates.buildBulkUpdateOperations(groups, clientId, type);
  logger.info('Total batch updates:', batchedOperations.length);

  // First remove all existing potential duplicates from the client entities
  logger.info('Clearing existing potential duplicates');
  await getModelType(type).updateMany({ clientId }, { potentialDuplicates: [], potentialDuplicatesCount: 0 });

  // Then perform bulk updates for each batch
  logger.info('Bulk updating potential duplicates');
  for (const batch of batchedOperations) {
    await getModelType(type).bulkWrite(batch);
  }

  if (email) {
    logger.info('Sending notification to user:', email);
    const client = await Client.findById(clientId);
    await new Promise((resolve, reject) => {
      const formattedType = capitalize(type);
      const name = `Find Duplicate ${formattedType}s`;
      const description = 'Catalogue processing complete';
      const options = {
        email,
        client,
        identifier: 'genericComplete',
        subject: name,
        mainText: `Catalogue for ${client.name} has been processed, and ${groups.length} potential duplicate ${formattedType}s have been found.`,
        link: `/#/catalogue/manage?type=${type}`,
      };
      Notification.generate(name, description, null, options, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  logger.info(`Duplicate ${type}s processing complete`);
}

/**
 * Get the model type based on the provided type string.
 * @param {string} type - The type of entity (e.g., "work", "composer", "publisher").
 * @returns {Composer|Publisher|Work} - The Mongoose model for the specified type.
 * @throws {Error} - If the type is unknown.
 */
function getModelType(type) {
  if (type === 'composer') return Composer;
  if (type === 'publisher') return Publisher;
  if (type === 'work') return Work;
  throw new Error(`Unknown type: ${type}`);
}

/**
 * Get a cursor for streaming catalogue for a specific client.
 * @param {string} clientId - The ID of the client to fetch catalogue for.
 * @param {string} type - The type of catalogue to fetch (e.g., "work", "composer", "publisher").
 * @returns {Cursor} - A MongoDB cursor for streaming the specific catalogue.
 */
function getStreamedCatalogue(clientId, type) {
  let fields = { _id: 1, title: 1, alternateTitles: 1, composer: 1, blacklistedDuplicateIds: 1 };
  if (type === 'composer' || type === 'publisher') {
    fields = {
      _id: 1,
      name: 1,
      caeWithoutLeadingZeroes: 1,
      firstName: 1,
      surname: 1,
      blacklistedDuplicateIds: 1,
    };
  }
  const cursor = getModelType(type).find({ clientId })
    .select(fields)
    .lean()
    .cursor();
  return cursor;
}

/**
 * Get duplicate groups by tokenizing, hashing, and comparing works.
 * @param {Cursor} cursor - MongoDB cursor for streaming works.
 * @returns {Promise<Array>} - Promise resolving to an array of duplicate work groups.
 */
async function getDuplicateGroups(cursor, type) {
  const buckets = [];
  const workMap = new Map();
  const seenPairs = new Set();
  const normalizeCache = new Map();
  const duplicates = [];

  logger.info(`Tokenizing and hashing ${type}s...`);
  let count = 0;

  // Tokenize, hash and add each work to similarity buckets
  for await (const work of cursor) {
    count += 1;
    const tokenFreq = FindDuplicates.tokenize(normalizeCache, work, type);
    const minhash = FindDuplicates.getMinHash(tokenFreq, 100);
    FindDuplicates.addToLSHBuckets(work, minhash, buckets, LSH_BANDS);
    workMap.set(work._id.toString(), { tokenFreq, blacklistedDuplicateIds: work?.blacklistedDuplicateIds ?? [] });
    if (count % 10_000 === 0) {
      logger.debug(`Processed ${type}s so far:`, count);
    }
  }

  normalizeCache.clear();
  cursor.destroy();

  logger.info('Comparing works within LSH buckets:', buckets.length);

  // Compare works within buckets
  for (const band of buckets) {
    for (const [_, entries] of band) {
      // Reset per bucket to reduce memory
      const localSeen = new Set();

      // Limit the number of pairs to compare in each bucket
      // Required for catalogue with very low variety of entities e.g. QA test accounts
      const MAX_LOCAL_SEEN = 5_000_000;
      let shouldSkip = false;

      // Compare each pair of works in the current bucket
      for (let i = 0; i < entries.length && !shouldSkip; i += 1) {
        for (let j = i + 1; j < entries.length; j += 1) {
          if (localSeen.size > MAX_LOCAL_SEEN) {
            logger.debug('Skipping rest of bucket due to excessive pair count');
            shouldSkip = true;
            break;
          }
          const id1 = entries[i].id;
          const id2 = entries[j].id;

          // Avoid comparing the same work or already seen pairs
          if (id1 === id2) continue;

          const key = [id1, id2].sort().join('-');
          if (localSeen.has(key)) continue;
          localSeen.add(key);

          const { tokenFreq: freqA, blacklistedDuplicateIds: blacklistA } = workMap.get(id1);
          const { tokenFreq: freqB, blacklistedDuplicateIds: blacklistB } = workMap.get(id2);

          const isBlacklisted = blacklistA.includes(id2) || blacklistB.includes(id1);
          if (isBlacklisted) continue;

          const similarity = FindDuplicates.jaccard(freqA, freqB);
          if (similarity >= SIMILARITY_THRESHOLD) {
            duplicates.push({ id1, id2, score: similarity });
          }
        }
      }
    }

    for (const [_, entries] of band) entries.length = 0;
    band.clear();
  }

  buckets.length = 0;
  workMap.clear();
  seenPairs.clear();

  logger.info('Building duplicate graph:', duplicates.length);

  // Group duplicates into clusters
  const graph = FindDuplicates.buildDuplicateGraph(duplicates);
  const groups = FindDuplicates.extractDuplicateGroups(graph);

  return groups;
}

/**
  * Normalize text by removing accents, non-alphanumeric characters, and converting to lowercase.
  * @param {Map} normalizeCache - Cache to store normalized text.
  * @param {string} text - The text to normalize.
  * @returns {Array} - Normalized tokens as an array.
 */
function normalizeText(normalizeCache, text) {
  if (typeof text !== 'string') text = String(text || '');
  if (normalizeCache.has(text)) return normalizeCache.get(text);

  // Remove accents + non-alphanumeric but keep ASCII letters/numbers/spaces only
  const normalized = text
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Split camelCase and PascalCase
    .replace(/ø/g, 'o') // Replace special characters (needs manually handling, no generic regex)
    .replace(/æ/g, 'ae')
    .replace(/ß/g, 'ss')
    .replace(/ł/g, 'l')
    .normalize('NFD') // Normalize to decompose characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // ASCII letters, numbers, space only
    .split(/\s+/)
    .filter(Boolean);

  normalizeCache.set(text, normalized);
  return normalized;
}

/**
  * Tokenize work data into frequency map.
  * @param {Map} normalizeCache - Cache to store normalized tokens.
  * @param {Object} work - The work object containing title, alternate titles, and composer.
  * @returns {Map} - Frequency map of tokens with their weights.
 */
function tokenize(normalizeCache, work, type) {
  const freq = new Map();

  const addTokens = (tokens, weight) => {
    for (const token of tokens) freq.set(token, (freq.get(token) || 0) + weight);
  };

  if (type === 'work') {
    if (work.title) addTokens(normalizeText(normalizeCache, work.title), TITLE_WEIGHT);
    if (Array.isArray(work.alternateTitles)) {
      for (const alt of work.alternateTitles) addTokens(normalizeText(normalizeCache, alt), ALT_TITLE_WEIGHT);
    }
    if (work.composer) addTokens(normalizeText(normalizeCache, work.composer), COMPOSER_WEIGHT);
  }
  if (type === 'composer' || type === 'publisher') {
    if (work.name) addTokens(normalizeText(normalizeCache, work.name), TITLE_WEIGHT);
    if (work.caeWithoutLeadingZeroes) addTokens(normalizeText(normalizeCache, work.caeWithoutLeadingZeroes), COMPOSER_WEIGHT);
    if (work.firstName) addTokens(normalizeText(normalizeCache, work.firstName), COMPOSER_WEIGHT);
    if (work.surname) addTokens(normalizeText(normalizeCache, work.surname), COMPOSER_WEIGHT);
  }

  return freq;
}

/**
 * Generate a MinHash signature for a frequency map.
 * @param {Map} freqMap - Frequency map of tokens.
 * @param {number} numHashes - Number of hash functions to use.
 * @returns {Array} - MinHash signature as an array of hashes.
 * @note Uses FNV-1a hash function for simplicity and speed.
 */
function getMinHash(freqMap, numHashes = 100) {
  const hashes = new Array(numHashes).fill(Infinity);
  // For each token with frequency, hash token + hashIndex multiple times per frequency weight
  for (const token of freqMap.keys()) {
    for (let i = 0; i < numHashes; i += 1) {
      const combined = token + i;
      // FNV-1a hash function is used to generate a hash for the token combined with the index
      const hash = FindDuplicates.fnv1a(combined);
      if (hash < hashes[i]) hashes[i] = hash;
    }
  }
  return hashes;
}

/**
 * FNV-1a hash function for strings.
 * @param {string} str - The string to hash.
 * @returns {number} - The FNV-1a hash of the string.
 * @note No built-in provided in Node, implemented manually.
 */
function fnv1a(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    // eslint-disable-next-line no-bitwise
    hash ^= str.charCodeAt(i);
    // eslint-disable-next-line no-bitwise
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  // eslint-disable-next-line no-bitwise
  return hash >>> 0;
}

/**
 * Add a work's MinHash to the LSH buckets.
 * @param {Object} work - The work object containing _id and minhash.
 * @param {Array} minhash - The MinHash signature of the work.
 * @param {Array} buckets - The LSH buckets to add the work to.
 * @param {number} bands - Number of bands to split the MinHash into.
 * @note Each band is a slice of the MinHash, and works are grouped by these bands.
 */
function addToLSHBuckets(work, minhash, buckets, bands = 5) {
  const rowsPerBand = Math.floor(minhash.length / bands);
  for (let b = 0; b < bands; b += 1) {
    const start = b * rowsPerBand;
    const end = start + rowsPerBand;
    const band = minhash.slice(start, end).join(',');
    if (!buckets[b]) buckets[b] = new Map();
    const bucket = buckets[b];
    if (!bucket.has(band)) bucket.set(band, []);
    bucket.get(band).push({ id: work._id.toString(), minhash });
  }
}

/**
 * Calculate Jaccard similarity between two frequency maps.
 * @param {Map} freqMapA - Frequency map of the first work.
 * @param {Map} freqMapB - Frequency map of the second work.
 * @returns {number} - Jaccard similarity score between 0 and 1.
 */
function jaccard(freqMapA, freqMapB) {
  const tokens = new Set([...freqMapA.keys(), ...freqMapB.keys()]);
  let intersection = 0;
  let union = 0;
  for (const token of tokens) {
    const aCount = freqMapA.get(token) || 0;
    const bCount = freqMapB.get(token) || 0;
    intersection += Math.min(aCount, bCount);
    union += Math.max(aCount, bCount);
  }
  return union === 0 ? 0 : intersection / union;
}

/**
 * Build a graph of duplicate works based on pairs of IDs.
 * @param {Array} pairs - Array of objects containing id1 and id2 of duplicate works.
 * @returns {Map} - A graph where each key is a work ID and the value is an object with the ID and its neighbors (duplicate IDs).
 */
function buildDuplicateGraph(pairs) {
  const graph = new Map();
  for (const { id1, id2 } of pairs) {
    if (id1 === id2) continue;

    if (!graph.has(id1)) graph.set(id1, { id: id1, neighbors: new Set() });
    if (!graph.has(id2)) graph.set(id2, { id: id2, neighbors: new Set() });

    graph.get(id1).neighbors.add(id2);
    graph.get(id2).neighbors.add(id1);
  }
  return graph;
}

/**
 * Extract groups of duplicate works from the graph.
 * @param {Map} graph - The graph of duplicate works.
 * @returns {Array} - An array of arrays, where each inner array contains IDs of duplicate works.
 * @note Uses DFS to find connected components in the graph.
 */
function extractDuplicateGroups(graph) {
  const visited = new Set();
  const groups = [];

  for (const id of graph.keys()) {
    if (visited.has(id)) continue;

    const group = [];
    const stack = [id];

    while (stack.length > 0) {
      const currentId = stack.pop();
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const currentNode = graph.get(currentId);
      group.push(currentId);

      for (const neighborId of currentNode.neighbors) {
        if (!visited.has(neighborId)) stack.push(neighborId);
      }
    }

    if (group.length > 1) groups.push(group);
  }

  return groups;
}

/**
 * Build bulk update operations for works with potential duplicates.
 * @param {Array} groups - Array of duplicate work groups.
 * @param {string} clientId - The ID of the client to update works for.
 * @param {number} batchSize - The size of each batch for bulk updates.
 * @returns {Array} - Array of bulk update operations.
 */
function buildBulkUpdateOperations(groups, clientId, type, batchSize = BULK_UPDATE_BATCH_SIZE) {
  if (!Array.isArray(groups) || groups.length === 0) return [];
  const operations = groups
    .map(([primaryId, ...dupeIds]) => {
      if (dupeIds.length === 0) return null;
      const operation = {
        updateOne: {
          filter: { _id: primaryId, clientId },
          update: {
            potentialDuplicates: dupeIds.map((dupeId) => {
              if (type === 'composer') return { composerId: dupeId };
              if (type === 'publisher') return { publisherId: dupeId };
              return { workId: dupeId };
            }),
            potentialDuplicatesCount: dupeIds.length,
          },
        },
      };
      return operation;
    })
    .filter(Boolean);
  if (operations.length === 0) return [];
  return chunk(operations, batchSize);
}

const FindDuplicates = {
  // Entry Point
  findDuplicates,

  // Internal functions
  getStreamedCatalogue,
  getDuplicateGroups,
  normalizeText,
  tokenize,
  getMinHash,
  fnv1a,
  addToLSHBuckets,
  jaccard,
  buildDuplicateGraph,
  extractDuplicateGroups,
  buildBulkUpdateOperations,
  getModelType,

  // Constants
  TITLE_WEIGHT,
  ALT_TITLE_WEIGHT,
  COMPOSER_WEIGHT,
};

module.exports = FindDuplicates;
