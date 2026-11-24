const { LowerCaseString } = require('@curveroyaltysystems/curve-shared-logic');
const { isValidObjectId } = require('@curveroyaltysystems/models/mongoose');
const { uniq } = require('lodash');

const TerritoryGroup = require('../../models/territoryGroup');

// The chain item category
const ContractType = {
  Admin: 'Admin',
  SubPublisher: 'Sub Publisher',
  OriginalPublisher: 'Original Publisher',
  Acquirer: 'Acquirer',
  IncomeParticipant: 'Income Participant',
};

/**
 * Combine duplicate publishers on an ip chain, where they have different composers as children
 *
 * @method
 * @param {object} chain - The ip chain to combine.
 */
function combineDuplicatePublishers(chain) {
  const combined = {};
  for (const item of chain) {
    const paths = buildPaths(item);
    for (const path of paths) {
      // If a publisher and its children have already been merged, we can ignore the same publisher
      const alreadyIncluded = Object.keys(combined).some((key) => key.startsWith(path));
      if (combined[path]) {
        combined[path] = mergePublishers(combined[path], item);
      } else if (!alreadyIncluded) {
        combined[path] = item;
      }
    }
  }
  return Object.values(combined);
}

// Merge publishers together recursively and combine their lowest level composers
function mergePublishers(pub1, pub2) {
  if (!pub1) return pub2;
  if (!pub2) return pub1;

  const merged = { ...pub1, children: [] };
  const shareFields = ['mechanicalOwnership', 'mechanicalCollection', 'performanceOwnership', 'performanceCollection'];
  shareFields.forEach((field) => {
    if (merged[field] || pub2[field]) {
      merged[field] = (Number(merged[field]) || 0) + (Number(pub2[field]) || 0);
    }
  });
  const mergedChildren = {};
  (pub1.children ?? []).forEach((child) => { mergedChildren[buildUniqueComposerKey(child)] = child; });
  (pub2.children ?? []).forEach((child) => { mergedChildren[buildUniqueComposerKey(child)] = child; });

  Object.values(mergedChildren).forEach((child) => {
    const pub1Children = pub1.children.find((c) => buildUniqueComposerKey(c) === buildUniqueComposerKey(child));
    const pub2Children = pub2.children.find((c) => buildUniqueComposerKey(c) === buildUniqueComposerKey(child));
    const newChildren = mergePublishers(pub1Children, pub2Children);
    merged.children.push(newChildren);
  });

  return merged;
}

// Construct all chain paths for a publisher(s) -> composer
function buildPaths(chainItem, currentPath = '') {
  // Handle case where a publisher no children
  if (currentPath?.includes('Publisher') && !chainItem) return [currentPath];
  // If a composer is at the top level of a chain, build it's unique key, otherwise return the path to the nested composer
  if (chainItem.type === 'Composer') return currentPath ? [currentPath] : [buildUniqueComposerKey(chainItem)];
  const key = buildUniquePublisherKey(chainItem);
  const newPath = currentPath ? `${currentPath}/${key}` : key;
  // If a Publisher has no Composer child, return path
  if (chainItem.type === 'Publisher' && (!chainItem.children || (chainItem && chainItem?.children?.length === 0))) return [newPath];
  // If a Publisher has children, recursively search them and continue building paths
  if (chainItem.children && chainItem.children.length > 0) {
    const paths = [];
    chainItem.children.forEach((child) => paths.push(...buildPaths(child, newPath)));
    return uniq(paths);
  }
  return [];
}

// Build a unique key which represents a publisher in the chain
function buildUniquePublisherKey(publisher) {
  // If a publisher has an ID this takes priority over any name fields
  if (publisher.publisherId) {
    return [
      publisher.publisherId,
      publisher.type,
      publisher.contractType,
      publisher.controlled,
    ].join('_');
  }
  return [
    LowerCaseString(publisher.name),
    publisher.type,
    publisher.contractType,
    publisher.firstName,
    publisher.middleName,
    publisher.surname,
    publisher.caeNumber,
    publisher.controlled,
  ].join('_');
}

// Build a unique key which represents a composer in the chain
function buildUniqueComposerKey(composer) {
  return [
    composer.composerId,
    LowerCaseString(composer.name),
    composer.contractType,
  ].join('_');
}

// Check that controlled chains have an Original Publisher or Income Participant
function controlledByPublisherOrIncomeParticipant(chain, parent = null) {
  let valid = true;
  for (const item of chain) {
    // Top level controlled Composer is not allowed, must be controlled by a Publisher
    if (item.type === 'Composer' && item.controlled && !parent) {
      valid = false;
      break;
    }
    if (item.children?.length > 0) {
      // Recursively run all checks on all children of the chain
      const childrenValid = controlledByPublisherOrIncomeParticipant(item.children, item);
      if (!childrenValid) {
        valid = false;
        break;
      }
    }
    // Controlled chains must include an Original Publisher or Income Participant
    if (item.controlled && item.type === 'Publisher') {
      const publishers = countContractTypeInIpChainChildren(item, 'Publisher', [ContractType.OriginalPublisher, ContractType.IncomeParticipant], 0);
      if (publishers === 0) {
        valid = false;
        break;
      }
    }
  }
  return valid;
}

function checkChainsHaveTerritory(rightsChains) {
  let valid = true;
  if (!rightsChains || rightsChains.length === 0) {
    valid = false;
  } else {
    for (const chain of rightsChains) {
      // Field doesn't exist at all (something went wrong)
      if (!chain?.territory) {
        valid = false;
        break;
      }
      // No specific territories selected
      if (chain.territory === 'specific' && (!chain?.territoryCodes?.codes || chain?.territoryCodes?.codes?.length === 0)) {
        valid = false;
        break;
      }
    }
  }
  return valid;
}

/**
 * Sums the total value of the ip chain children
 *
 * @method
 * @param {object} item - The work's ip chain.
 * @param {string} field - The work's ip chain field to sum up.
 * @param {string} contractTypes - The work's ip chain contractTypes to sum up.
 * @param {number} total - The initial total to add to.
 * @returns {number} total - the ip chain sum
 *
 */
function sumContractTypeValueInIpChainChildren(item, field, contractTypes, total) {
  if (item && item[field] && contractTypes.includes(item.contractType)) {
    total += parseFloat(item[field]);
  }
  if (item && item.children && item.children.length > 0) {
    item.children.forEach((child) => {
      total = sumContractTypeValueInIpChainChildren(child, field, contractTypes, total);
    });
  }
  return total;
}

/**
 * Counts the total of the ip chain children types
 *
 * @method
 * @param {object} item - The work's ip chain.
 * @param {string} type - The work's ip chain type to count up.
 * @param {string} contractTypes - The work's ip chain contractTypes to count up.
 * @param {number} count - The initial count to add to.
 * @returns {number} count - the ip chain count
 *
 */
function countContractTypeInIpChainChildren(item, type, contractTypes, count) {
  if (item && item.type === type && contractTypes.includes(item.contractType)) {
    count += 1;
  }
  if (item && item.children && item.children.length > 0) {
    item.children.forEach((child) => {
      count = countContractTypeInIpChainChildren(child, type, contractTypes, count);
    });
  }
  return count;
}

/**
 * Checks if a controlled chain's children are all controlled.
 *
 * @method
 * @param {object} chain - The chain to check.
 * @returns {boolean} allChildrenControlled - Returns true if all children all controlled
 *
 */
function areAllChainChildrenControlled(chain) {
  let allChildrenControlled = true;
  if (!chain || !chain.controlled) {
    allChildrenControlled = false;
  } else if (chain && chain.children && chain.children.length > 0) {
    chain.children.forEach((child) => {
      if (!areAllChainChildrenControlled(child)) { allChildrenControlled = false; }
    });
  }
  return allChildrenControlled;
}

/**
 * @description Sums up a specific field value across an IP chain and its children
 * @param {Object} item - The IP chain item to start from
 * @param {string} field - The field name to sum up
 * @param {number} total - The initial total value
 * @returns {number} total - The summed value of the specified field
 */
function sumValueInIpChainChildren(item, field, total) {
  if (item && item[field]) { total += parseFloat(item[field]); }
  if (item && item.children && item.children.length > 0) {
    item.children.forEach((child) => {
      total = sumValueInIpChainChildren(child, field, total);
    });
  }
  return total;
}

/**
 * @description Retrieves territory groups from a work's default rights chain
 * @param {Object} work - The work object containing the rights chain
 * @returns {Promise<Array>} - An array of territory group documents
 */
async function getTerritoryGroupsFromDefaultChains(work) {
  const territoryGroupIds = work.rightsChain
    .map((chain) => (isValidObjectId(chain.territory) ? chain.territory : null))
    .filter(Boolean);
  if (territoryGroupIds.length > 0) {
    return TerritoryGroup.find({ clientId: work.clientId, _id: { $in: territoryGroupIds } });
  }
  return [];
}

/**
 * @description Retrieves territory groups from a work's partner rights chains
 * @param {Object} work - The work object containing the partner rights chains
 * @returns {Promise<Array>} - An array of territory group documents
 */
async function getTerritoryGroupsFromPartnerChains(work) {
  const territoryGroupIds = [];
  for (const partnerChain of work.partnerRightsChains) {
    partnerChain.rightsChain.forEach((chain) => {
      if (isValidObjectId(chain.territory)) {
        territoryGroupIds.push(chain.territory);
      }
    });
  }
  const uniqueTerritoryGroupIds = uniq(territoryGroupIds);
  if (uniqueTerritoryGroupIds.length > 0) {
    return TerritoryGroup.find({ clientId: work.clientId, _id: { $in: uniqueTerritoryGroupIds } });
  }
  return [];
}

const ipChainUtils = {
  // Constants
  ContractType,

  // Functions
  combineDuplicatePublishers,
  controlledByPublisherOrIncomeParticipant,
  sumContractTypeValueInIpChainChildren,
  countContractTypeInIpChainChildren,
  checkChainsHaveTerritory,
  areAllChainChildrenControlled,
  sumValueInIpChainChildren,
  getTerritoryGroupsFromDefaultChains,
  getTerritoryGroupsFromPartnerChains,
};

module.exports = ipChainUtils;
