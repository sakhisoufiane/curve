/* eslint-disable no-continue */
/* eslint-disable no-param-reassign */
/* eslint-disable radix */
const { isEqual, uniq } = require('lodash');

const CwrUtils = require('./utils');
const { continentToTerritoryCodes, territoryInContinent } = require('../territoryHelper');
const Publisher = require('./publisher');

/**
 * Takes rights chains and separates the different chains that have different chains below associated with the same admin at the top
 *
 * @method
 * @param {array} rightsChains - The original rights chains
 * @returns {array} Returns an array of rights chains
 */
function separateSpecificChains(rightsChains) {
  // Loop through the chains
  const output = rightsChains.map((territoryLevel) => {
    let chains = [];
    // Loop through the items on the chain
    if (Array.isArray(territoryLevel.children)) {
      territoryLevel.children.forEach((child) => {
        // Add children to publishers if it doesn't exist
        if (child && child.publisher) {
          child.children = child.children ?? [];
        }
        // Get separate children chains
        const returnedChains = chainToSeparateChains(child);
        // Add returned chains to output
        chains = chains.concat(returnedChains);
      });
    }
    // Update children to outputted chains
    territoryLevel.children = chains;
    return territoryLevel;
  });
  return output;
}

function totalChainValues(chainValues) {
  // Get Pro Ratas from Chain Values
  const mappedChainValues = {};
  const keys = Object.keys(chainValues).sort((itemA, itemB) => itemB.length - itemA.length);
  // Loop through value
  keys.forEach((chainValueA) => {
    // Loop through a second time to identify any chains that are a child of Chain A
    keys.forEach((chainValueB) => {
      if (
        // Check it's a child, included in the string, without being the same, as is from the next level down
        (chainValueB.includes(chainValueA) &&
          chainValueB !== chainValueA &&
          chainValueB.length === chainValueA.length + 24) ||
        // Or it is the first element, but that element is the original publisher
        (chainValueB === chainValueA &&
          chainValues[chainValueB] &&
          chainValues[chainValueB].mechanicalCollection &&
          chainValues[chainValueB].mechanicalOwnership)
      ) {
        const mappedChain = chainValues[chainValueB];
        // Add to the totals - summing all values into a new summed object
        mappedChainValues[chainValueA] = mappedChainValues[chainValueA] || {
          mechanicalCollection: 0,
          mechanicalOwnership: 0,
          performanceOwnership: 0,
          performanceCollection: 0,
        };
        mappedChainValues[chainValueA].mechanicalCollection += mappedChain.mechanicalCollection;
        mappedChainValues[chainValueA].mechanicalOwnership += mappedChain.mechanicalOwnership;
        mappedChainValues[chainValueA].performanceOwnership += mappedChain.performanceOwnership;
        mappedChainValues[chainValueA].performanceCollection += mappedChain.performanceCollection;
      }
    });
  });
  return mappedChainValues;
}

/**
 * Takes rights chain and separates the different chains that have different chains below associated with the same admin at the top
 *
 * @method
 * @param {object} chain - The original rights chains
 * @param {string} parentId - The ID of the previous level
 * @returns {array} Returns an array of rights chains
 */
function chainToSeparateChains(chain, parentId) {
  const items = {};
  const chainValues = {};
  const chainObject = {};
  // eslint-disable-next-line no-param-reassign
  chain = chain || {};
  // Update chains into objects of IDs for rebuilding
  let chainId = parentId ? `${parentId}` : '';
  chainId += chain.composerId ? chain.composerId : chain.publisherId;
  items[chainId] = chain;
  if (Array.isArray(chain.children)) {
    chainObject[chainId] = objectFromChildren(chainValues, items, chain.children, chain, chainId);
  }
  const chainTotalValues = totalChainValues(chainValues);
  // Once we have chains, need to rebuild
  return chainChildrenToArray(chainObject, items, chainTotalValues);
}

function objectFromChildren(chainValues, items, array, item, innerParentId) {
  const outputObject = {};
  // const proRataAmounts = cwr.proRataChildTotals(array);
  const totals = {
    mechanicalCollection: item.mechanicalCollection ? parseFloat(item.mechanicalCollection) : 0,
    mechanicalOwnership: item.mechanicalOwnership ? parseFloat(item.mechanicalOwnership) : 0,
    performanceOwnership: item.performanceOwnership ? parseFloat(item.performanceOwnership) : 0,
    performanceCollection: item.performanceCollection ? parseFloat(item.performanceCollection) : 0,
  };
  chainValues[innerParentId] = totals;
  // Loop through array and children of items to return output
  // eslint-disable-next-line no-shadow
  array.forEach((item, index) => {
    // Get ID
    let chainId = innerParentId ? `${innerParentId}` : '';
    const itemId = item.composerId ? item.composerId : item.publisherId;
    chainId += itemId;
    // Add to items
    items[chainId] = item;
    // Loop through children if they exist
    if (item.children && item.children.length > 0) {
      outputObject[itemId] = objectFromChildren(chainValues, items, item.children, item, chainId);
    } else {
      outputObject[itemId] = itemId;
    }
  });
  return outputObject;
}

function chainChildrenToArray(chainObject, items, chainTotals, parentId) {
  const output = [];
  if (typeof chainObject !== 'string') {
    // Loop through keys in chain object
    Object.keys(chainObject).forEach((id) => {
      let chainId = parentId ? `${parentId}` : '';
      chainId += id;
      if (items && items[chainId]) {
        // Check if any values from the child object
        let containsObject = false;
        if (typeof chainObject[id] === 'object') {
          Object.values(chainObject[id]).forEach((value) => {
            if (typeof value !== 'string') {
              containsObject = true;
            }
          });
        }
        if (containsObject) {
          // Get children
          const childItems = chainChildrenToArray(chainObject[id], items, chainTotals, chainId);
          // We add an item to the output for each item in the children - the recurring nature of this function means we get one item for each path in the object
          childItems.forEach((childItem) => {
            // Get copy of item
            const item = JSON.parse(JSON.stringify(items[chainId]));
            // Get multipliers using child chainId
            const total = chainTotals[chainId];
            // Multiply outputs - this skips the original publisher as that is when there is no collection party in the chain
            if (total && item.contractType !== 'Original Publisher') {
              let mechanicalMultiplier = childItem.mechanicalOwnership / total.mechanicalOwnership;
              mechanicalMultiplier = mechanicalMultiplier || 1;
              item.mechanicalCollection *= mechanicalMultiplier;
              let performanceMultiplier = childItem.performanceOwnership / total.performanceOwnership;
              performanceMultiplier = performanceMultiplier || 1;
              item.performanceCollection *= performanceMultiplier;
            }
            // Set children to the returned values from childItem
            item.children = [childItem];
            // Add to output
            output.push(item);
          });
        } else if (chainObject[id] && typeof chainObject[id] !== 'string') {
          // Doesn't contain object in the child, meaning it's composer level, so just include the items
          const children = Object.keys(chainObject[id]).map((childId) => {
            // Set ID
            const itemId = `${chainId}${childId}`;
            // Get copy of item
            const childItem = JSON.parse(JSON.stringify(items[itemId]));
            // Set children to the returned values from childItem
            childItem.children = null;
            // Return item
            return childItem;
          });
          // Get copy of item
          const item = JSON.parse(JSON.stringify(items[chainId]));
          // Get multipliers using child chainId
          const total = chainTotals[chainId];
          // Multiply outputs
          if (total && item.contractType !== 'Original Publisher') {
            item.mechanicalCollection /= total.mechanicalOwnership;
            // item.mechanicalOwnership *= multipliers.mechanicalOwnership;
            item.performanceCollection /= total.performanceOwnership;
            // item.performanceOwnership *= multipliers.performanceOwnership;
          }
          // Set children to the returned values from childItem
          item.children = children;
          // Add to output
          output.push(item);
        } else {
          // This is just an ID string
          // Get copy of item
          const item = JSON.parse(JSON.stringify(items[chainId]));
          // Set children to the returned values from childItem
          item.children = [items[chainObject[id]]];
          // Add to output
          output.push(item);
        }
      }
    });
  }
  return output;
}

/**
 * Takes rights chains and returns an object of descending rights
 *
 * @method
 * @param {array} rightsChains - The original rights chains
 * @returns {object} Returns an object of rights chains
 */
function rightsChainsToObject(rightsChains) {
  // Prepare output
  let output = {};
  if (rightsChains && Array.isArray(rightsChains)) {
    // Loop through headline rights chains
    rightsChains.forEach((rightsChain) => {
      let { territory } = rightsChain;
      const { territoryCodes } = rightsChain;
      // Ensure territory is an array - this previously had !Array.isArray with no params, check fallout of this
      if (!Array.isArray(territory)) {
        territory = territory === 'specific' ? [territoryCodes.codes] : [territory];
      }
      if (rightsChain.children) {
        // Loop through children on rights chain
        rightsChain.children.forEach((child) => {
          output = rightsChainChildToObject(output, child, territory);
        });
      }
    });
  }
  return output;
}

/**
 * Takes rights chain children and returns an object of descending rights
 *
 * @method
 * @param {object} output - Object of the output
 * @param {object} child - The item to be processed
 * @param {array} territory - Array of territories
 * @param {array} previousLayer - The previous layer to send through any previous publishers in the chain
 * @returns {object} Returns an object of rights chains
 */
function rightsChainChildToObject(output, child, territory, previousLayer) {
  // Get name
  let previousLayerName;
  if (!previousLayerName && previousLayer && previousLayer.publisher) {
    previousLayerName = buildPublisherNextLayerKey(previousLayer);
  }
  if (child && child.type === 'Publisher') {
    if (child.contractType === 'Original Publisher') {
      // Get name
      let { name } = child;
      if (!name && child.publisher) {
        name = child.publisher.name;
      }

      // Append the previous layer name to avoid losing duplicate nested (different paths but same publisher name) publishers
      if (previousLayer) name = `${name}:${previousLayer.name ?? previousLayer?.publisher.name}`;

      // Check if item exists (check controlled status as it's possible the publisher is both controlled and uncontrolled on one chain) or create blank doc
      if (output[name] && output[name].controlled !== child.controlled) {
        const isControlled = child.controlled ? 'controlled' : 'uncontrolled';
        name = `${name}: ${isControlled}`;
      }

      output[name] = output[name] || child;
      // Always include territories in totalTerritories - detailing all the territories used on a chain, not just the claimant
      output[name].totalTerritories = output[name].totalTerritories || [];
      output[name].totalTerritories = [].concat(output[name].totalTerritories, territory);
      // Set territories only when collecting
      output[name].territory = output[name].territory || [];
      if (
        (child.mechanicalCollection && parseFloat(child.mechanicalCollection) !== 0) ||
        (child.performanceCollection && parseFloat(child.performanceCollection) !== 0)
      ) {
        output[name].territory = [].concat(output[name].territory, territory);
        // Get territory ISO2s
        output[name].territory = output[name].territory.map((item) => continentToTerritoryCodes(item)).flat();
      }
      // Set collections per territory
      output[name].territoryCollection = output[name].territoryCollection || {};
      if (Array.isArray(territory)) {
        territory.forEach((terr) => {
          output[name].territoryCollection[terr] = {
            mechanicalCollection: child.mechanicalCollection,
            performanceCollection: child.performanceCollection,
          };
        });
      } else {
        output[name].territoryCollection[territory] = {
          mechanicalCollection: child.mechanicalCollection,
          performanceCollection: child.performanceCollection,
        };
      }
      if (previousLayer) {
        output[name].nextLayers = output[name].nextLayers || {};
        if (output[name].nextLayers[previousLayerName]) {
          CwrUtils.mergeChainLayers(output[name].nextLayers[previousLayerName], previousLayer);
        } else {
          output[name].nextLayers[previousLayerName] = previousLayer;
        }
      }
      delete child.children;
    } else {
      const { children } = child;
      // Create or add to previous layer
      if (previousLayer) {
        child.nextLayers = child.nextLayers || {};
        child.nextLayers[previousLayerName] = previousLayer;
      }
      // Always include territories in totalTerritories - detailing all the territories used on a chain, not just the claimant
      child.totalTerritories = child.totalTerritories || [];
      child.totalTerritories = [].concat(child.totalTerritories, territory);
      // Add territories when collection present
      child.territory = child.territory || [];
      if (
        (child.mechanicalCollection && parseFloat(child.mechanicalCollection) !== 0) ||
        (child.performanceCollection && parseFloat(child.performanceCollection) !== 0)
      ) {
        child.territory = [].concat(child.territory, territory);
        // Get territory ISO2s
        child.territory = child.territory.map((item) => continentToTerritoryCodes(item)).flat();
      }
      delete child.children;
      if (children) {
        // Loop through next layer
        children.forEach((nextChild) => {
          output = rightsChainChildToObject(output, nextChild, territory, child);
        });
      }
    }
  }
  return output;
}

function buildPublisherNextLayerKey(publisher) {
  return `${publisher.publisher.name}${publisher.contractType}${publisher.performanceCollection}${publisher.mechanicalCollection}`;
}

function getPublisherSequenceKey({ partyNo, contractType, index, subPublished }) {
  if (subPublished) return `${partyNo}:${contractType}:${index + 1}`;
  return `${partyNo}:${contractType}`;
}

// Finds the right Publisher for a Composer based on the Interested Party No. and Publisher Sequence No.
function getPublisherFromComposer(composerData, publisher, publisherSequence) {
  if (!composerData.publishers) return null;
  return composerData.publishers.find((composerPublisher) => {
    const interestedPartyNoMatch = composerPublisher.interestedPartyNo === publisher.interestedPartyNo;
    // eslint-disable-next-line no-prototype-builtins
    if (!composerPublisher.hasOwnProperty('publisherSequence') || !composerPublisher?.publisherSequence) {
      return interestedPartyNoMatch;
    }
    return interestedPartyNoMatch && composerPublisher.publisherSequence === publisherSequence;
  });
}

// Find top-level single sub published Original Publishers from a rights chain object
function getSubPublishedOriginalPublishers(rightsChainObject) {
  const subPublishedInDifferentChain = [];
  const publisherChains = Object.keys(rightsChainObject);
  const singleOriginalPublishers = publisherChains.filter((chainLayerName) => {
    const { contractType } = rightsChainObject[chainLayerName];
    return !chainLayerName.includes(':') && contractType === Publisher.ContractType.OriginalPublisher;
  });
  for (const publisher of singleOriginalPublishers) {
    for (const chain of publisherChains) {
      if (publisher === chain) continue;
      const { nextLayers } = rightsChainObject[chain];
      const childContractTypes = nextLayers ? Object.values(nextLayers).map((p) => p.contractType) : [];
      if (chain.startsWith(publisher) && childContractTypes.includes(Publisher.ContractType.SubPublisher)) {
        subPublishedInDifferentChain.push(publisher);
      }
    }
  }
  return subPublishedInDifferentChain;
}

// Check if a publisher should be created for the specified current territory chain (when ingesting a CWR file)
function createPublisherForChain(publisherData, commonTerritories) {
  const commonTerritoryExists = commonTerritories ? !!commonTerritories.length : false;
  const includesPublisher = publisherData.includePublisher;
  const notSocietyPartyInterestedLine = publisherData.lineType !== 'SPU';
  const isOriginalPublisher = publisherData.publisherType === 'E';
  const isIncomeParticipant = publisherData.publisherType === 'PA';
  const isAdminPublisher = publisherData.publisherType === 'AM';
  const isSubPublisher = publisherData.publisherType === 'SE';

  const isPublisherForChain = commonTerritoryExists || includesPublisher || notSocietyPartyInterestedLine;

  // Any of these publisher types can start a Publisher chain
  const isValidPublisherType = isOriginalPublisher || isIncomeParticipant || isAdminPublisher || isSubPublisher;

  // Only include if the current territory chain is common with a publisher SPT row - OR it is an Admin with no Territory lines OR whenever its an Original publisher or Income Participant
  return isPublisherForChain || isValidPublisherType;
}

function getScoredTerritories(rightsChain, deliveryTerritories) {
  // Make sure territories are formatted the same way e.g. continent string to codes
  deliveryTerritories = deliveryTerritories
    .map((territory) => {
      const isContinent = typeof territory === 'string' && territory !== 'WW' && territory !== 'World';
      if (isContinent) {
        return continentToTerritoryCodes(territory);
      }
      return territory;
    })
    .flat();

  const inGroupScore = (chain, territory, baseScore) => {
    let score = baseScore;

    // If the territory is in another group that is more specific (less territories) then give it zero for the current chain
    const otherSmallerChains = rightsChain.filter(
      (otherChain) =>
        !isEqual(otherChain, chain) &&
        otherChain.territory?.length < chain.territory.length &&
        otherChain.territory?.includes(territory)
    );
    if (otherSmallerChains.length > 0) score = 0;

    // If the current chain is the most specific (in other chains but least territories included) give the current chain a higher score
    const otherChains = rightsChain.filter(
      (otherChain) => !isEqual(otherChain, chain) && chain.territory?.includes(territory)
    );
    if (otherChains.length > 0) {
      const [smallest] = otherChains.sort((a, b) => a.territory.length - b.territory.length);
      if (chain.territory.length < smallest.territory.length) {
        score += baseScore;
      }
    }

    chain.score += score;
  };

  const chainWithScores = rightsChain.map((chain) => {
    chain.score = 0;
    // Remove unsupported territories if any extra are included
    if (Array.isArray(chain.territory)) {
      chain.territory = CwrUtils.removeUnsupportedTerritories({ territories: chain.territory });
    }
    for (const territory of deliveryTerritories) {
      // Specific
      if (chain.territory === territory || isEqual(chain.territory, [territory])) chain.score += 1_000_000;
      // In group
      else if (Array.isArray(chain.territory) && chain.territory.includes(territory) && !chain.isTerritoryGroup)
        inGroupScore(chain, territory, 100_000);
      // In Territory group
      else if (Array.isArray(chain.territory) && chain.territory.includes(territory))
        inGroupScore(chain, territory, 100);
      // In continent
      else if (territoryInContinent(territory, chain.territory)) chain.score += 10;
      // Is all world
      else if ((!territory || territory === 'WW') && (chain.territory === 'World' || chain.territory === 'WW'))
        chain.score += 10_000;
      // If no other matches AND is all world
      else if (chain.territory === 'World' || chain.territory === 'WW') chain.score += 1;
    }
    return chain;
  });

  const validChains = chainWithScores
    .filter((c) => c.score)
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const worldTerritories = [];

  for (const deliveryTerritory of deliveryTerritories) {
    const chain = validChains.find((c) => c.territory.includes(deliveryTerritory));
    if (chain) {
      if (!chain.newTerritories) chain.newTerritories = [];
      chain.newTerritories.push(deliveryTerritory);
    }
    // If no matching chain found for the delivery territory, use WW instead
    if (!chain) worldTerritories.push(deliveryTerritory);
  }

  // If we have any leftover territories with no match AND an all world chain exists
  if (worldTerritories.length > 0) {
    const worldChain = validChains.find((c) => c.territory === 'WW');
    if (worldChain) {
      worldChain.newTerritories = worldTerritories;
      worldChain.territoryCodes = { name: worldTerritories.join(', '), codes: worldTerritories };
    }
  }

  // Make sure all the final territories arrays are correct
  const chainsWithMatchingTerritories = validChains
    .map((chain) => {
      chain.territory = chain.newTerritories;
      return chain;
    })
    .filter((chain) => chain.territory);

  return chainsWithMatchingTerritories;
}

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
  (pub1.children ?? []).forEach((child) => {
    mergedChildren[buildUniqueComposerKey(child)] = child;
  });
  (pub2.children ?? []).forEach((child) => {
    mergedChildren[buildUniqueComposerKey(child)] = child;
  });

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
  if (chainItem.type === 'Publisher' && (!chainItem.children || (chainItem && chainItem?.children?.length === 0)))
    return [newPath];
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
    return [publisher.publisherId, publisher.type, publisher.contractType, publisher.controlled].join('_');
  }
  return [
    publisher.name.toLowerCase(),
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
  return [composer.composerId, composer.name ? composer.name.toLowerCase() : '', composer.contractType].join('_');
}

module.exports = {
  separateSpecificChains,
  totalChainValues,
  chainToSeparateChains,
  chainChildrenToArray,
  rightsChainsToObject,
  buildPublisherNextLayerKey,
  getPublisherSequenceKey,
  getPublisherFromComposer,
  getSubPublishedOriginalPublishers,
  createPublisherForChain,
  getScoredTerritories,
  combineDuplicatePublishers,
};
