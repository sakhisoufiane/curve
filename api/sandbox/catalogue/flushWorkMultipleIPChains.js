/*
Description: A script to output an excel export of works that require chains split
Start Time: 
End Time: 
Time To Run On Staging: 
Ticket No: CUR-2663
Category: Publishing, Works
Author: Marco Giuliani
changes required: uncomment // Work.createExportXlsx(filter, client._id, eachCb); if you want to create file
*/
require('dotenv').config();
require('../models/db');
const async = require('async');
const appRootDir = require('app-root-dir').get();
const WriteCsv = require('../libs/writeCsv');
const Work = require('../models/work');
const Client = require('../models/client')

const limit = 1000;
const multipleIPChains = [];
let count = 0;

function runWork(client, lastId, total, save, callback) {
  const targetTypes = ['Original Publisher', 'Admin', 'Sub Publisher'];
  const filter = { clientId: client._id };
  if (lastId) {
    console.log(`Next ${limit} Batch.....`);
    // if processing another batch, ensure you start after the last work in previous batch.
    filter._id = { $gt: lastId };
  }
  // query all elements from Works and sort by _id - Should we include projection?
  Work.find(filter, { _id: 1, title: 1, rightsChain: 1 }).sort({ _id: 1 }).limit(limit).exec((err, works) => {
    async.eachLimit(works, 500, (work, cb) => {
      count += 1;
      lastId = work._id;
      let updateOrNot = false;
      // Check if work has multiple types at the same level
      updateOrNot = work.rightsChain.some((chain) => {
        const result = hasMultipleOfType(chain, targetTypes, 2, 0, work, client.name, work._id);
        return result.found;
      });
      if (updateOrNot) {
        const furtherPublishers = work.rightsChain.some((chain) => {
          const result = hasMultipleOfType(chain, targetTypes, 2, 0, work, client.name, work._id);
          return result.furtherPublishers === 'true';
        });
        let rightsChains = work.rightsChain;
        try {
          rightsChains = separateSpecificChains(work.rightsChain, furtherPublishers);
        } catch (e) {
          console.log(`Error work ${work.title}(${work._id}) ${client.name} - ${e}`);
        }
        if (updateOrNot && save && save === 'true') {
          Work.findByIdAndUpdate(work._id, { $set: { rightsChain: rightsChains } }, { new: true, select: '_id', timestamps: false }, (err, updatedWork) => {
            if (err) {
              console.log(err);
            }
            cb();
          });
        } else {
          cb(err);
        }
      } else {
        cb();
      }
    }, (err) => {
      // should we go get the next 'limit' documents
      if (works && works.length === limit) {
        runWork(client, lastId, total + limit, save, callback);
      } else {
        callback();
      }
    });
  });
}

function hasMultipleOfType(chain, targetTypes, minCount, level, work, client, workId) {
  if (!chain?.children || chain.children?.length === 0) {
    return { found: false, furtherPublishers: '' };
  }
  level++;
  let count = 0;

  for (const child of chain.children) {
    if (targetTypes.includes(child?.contractType) && child?.controlled && level !== 1) {
      count++;
      if (count >= minCount) {
        let returnValue = true;
        let furtherPublishers = '';
        let levelIssue = '';
        if (chain.children?.some((chainChild) => chainChild?.children?.length ? chainChild?.children[0]?.type === 'Publisher' : false )) {
          furtherPublishers = 'true';
        }
        if (level > 2) {
          levelIssue = 'true';
          furtherPublishers = 'true';
        }
        multipleIPChains.push({ client, workId, title: work.title, level, furtherPublishers, levelIssue, rightsChain: JSON.stringify(work?.rightsChain) });
        return { found: returnValue, furtherPublishers };
      }
    }
    const result = hasMultipleOfType(child, targetTypes, minCount, level, work, client, workId);
    if (result.found) {
      return result;
    }
  }

  return { found: false, furtherPublishers: '' };
}

async.waterfall([
  (waterfallCb) => {
    const startTime = new Date();
    console.log(`------ Start: ${startTime} ------`); 
    if (process.argv[2]) {
      if (process.argv[2] === '--all') {
        console.log('------ processing ALL clients ------');
        const filter = {};
        waterfallCb(null, filter);
      } else {
        waterfallCb(null, { _id: process.argv[2] });
      }
    } else {
      waterfallCb('Please provide a client id, or use --all to flush through All Works')
    }
  },
  (clientFilter, waterfallCb) => {
    Client.find(clientFilter, { name: 1 }).sort({ name: 1 }).exec(waterfallCb);
  },
  (clients, waterfallCb) => {
    let clientsCount = 0;
    async.eachLimit(clients, 5, (client, eachCb) => {
      const save = (process.argv[3]) ? process.argv[3] : 'false';
      async.waterfall([
        (cb) => {
          count = 0;
          runWork(client, null, 0, save, cb);
        },
      ], (err) => {
        clientsCount += 1;
        process.stdout.write(`\rProcessed client ${clientsCount}/${clients.length}`);
        eachCb(err);
      });

    }, waterfallCb);
  },
], (err) => {
  if (err) { 
    console.log(err);
  } else {
    const outputLocation = `${appRootDir}/tmp/flushWorkMultipleIPChains.csv`;
    const writer = new WriteCsv({ headers: ['client', 'work', 'title', 'level', 'furtherPublishers', 'levelIssue', 'rightsChain'], outputLocation });
    const outputData = multipleIPChains.map((line) => [line.client, line.workId, line.title, line.level, line.furtherPublishers, line.levelIssue, line.rightsChain]);
    writer.addData(outputData, () => {
      writer.write((err, location) => {
        console.log(location);
        const endTime = new Date();
        console.log(`------ End: ${endTime} ------`);
        console.log('Complete');
        process.exit(-1); 
      });
    });
  }
});

/**
 * Takes rights chains and separates the different chains that have different chains below associated with the same admin at the top
 *
 * @method
 * @param {array} rightsChains - The original rights chains
 * @returns {array} Returns an array of rights chains
 */
const separateSpecificChains = function (rightsChains, furtherPublishers) {
  // const util = require('util');
  // console.log(util.inspect(rightsChains, false, null, true));
  // Loop through the chains
  const output = rightsChains.map((territoryLevel) => {
    let chains = [];
    // Loop through the items on the chain
    if (Array.isArray(territoryLevel?.children)) {
      territoryLevel.children.forEach((child) => {
        // Add children to publishers if it doesn't exist
        if (child && child.publisher) {
          child.children = child.children || [];
        }
        if (!child.children) {
          chains = chains.concat(child);
        } else {
          // Get separate children chains
          const returnedChains = chainToSeparateChains(child);
          // Add returned chains to output
          chains = chains.concat(returnedChains);
        }
      });
    }
    // Update children to outputted chains
    if (furtherPublishers) {
      chains = chains.map((chain) => {
        // only update controlled chains as complete
        if (chain.controlled) {
          calculateAndUpdateMechanicalCollection(chain);
          calculateAndUpdatePerformanceCollection(chain);
        }
        return chain;
      });
    }
    if (territoryLevel && territoryLevel.children) {
      territoryLevel.children = chains;
    }
    return territoryLevel;
  });
  return output;
};

/**
* Takes rights chain and separates the different chains that have different chains below associated with the same admin at the top
*
* @method
* @param {object} chain - The original rights chains
* @param {string} parentId - The ID of the previous level
* @returns {array} Returns an array of rights chains
*/
const chainToSeparateChains = function (chain, parentId) {
  const items = {};
  const chainValues = {};
  const chainObject = {};
  chain = chain || {};
  // Update chains into objects of IDs for rebuilding
  let chainId = parentId ? `${parentId}` : '';
  chainId += chain.composerId ? `${chain.composerId}-${chain.contractType}` : `${chain.publisherId}-${chain.contractType}`;
  items[chainId] = chain;
  if (Array.isArray(chain.children)) {
    chainObject[chainId] = objectFromChildren(chain.children, chain, chainId);
  }
  function objectFromChildren(array, item, innerParentId) {
    const outputObject = {};
    //const proRataAmounts = proRataChildTotals(array);
    //console.log(proRataAmounts);
    const totals = {
      contractType: item.contractType,
      mechanicalCollection: item.mechanicalCollection ? parseFloat(item.mechanicalCollection) : 0,
      mechanicalOwnership: item.mechanicalOwnership ? parseFloat(item.mechanicalOwnership) : 0,
      performanceOwnership: item.performanceOwnership ? parseFloat(item.performanceOwnership) : 0,
      performanceCollection: item.performanceCollection ? parseFloat(item.performanceCollection) : 0,
    };
    chainValues[innerParentId] = totals;
    // Loop through array and children of items to return output
    array.forEach((item, index) => {
      // Get ID
      let chainId = innerParentId ? `${innerParentId}` : '';
      const itemId = item?.composerId ? `${item.composerId}-${item.contractType}` : `${item.publisherId}-${item.contractType}`;
      chainId += itemId;
      // Add to items
      items[chainId] = item;
      // Loop through children if they exist
      if (item?.children && item?.children?.length > 0) {
        outputObject[itemId] = objectFromChildren(item.children, item, chainId);
      } else {
        outputObject[itemId] = itemId;
      }
    });
    return outputObject;
  }
  const totalChainValues = totalChainValuesFunc(chainValues);
  // Once we have chains, need to rebuild
  return chainChildrenToArray(chainObject, items, totalChainValues);
};

const totalChainValuesFunc = function (chainValues) {
  // Get Pro Ratas from Chain Values
  const mappedChainValues = {};
  const keys = Object.keys(chainValues).sort((itemA, itemB) => itemB.length - itemA.length);
  // Loop through value
  keys.forEach((chainValueA) => {
    // Loop through a second time to identify any chains that are a child of Chain A
    keys.forEach((chainValueB) => {
      if (
        // Check it's a child, included in the string, without being the same, as is from the next level down
        (chainValueB.includes(chainValueA) && chainValueB !== chainValueA && countOccurrences(chainValueB, '-') === (countOccurrences(chainValueA, '-') + 1))
        // Or it is the first element, but that element is the original publisher
        || (chainValueB === chainValueA && chainValues[chainValueB] && chainValues[chainValueB].mechanicalCollection && chainValues[chainValueB].mechanicalOwnership)) {
        const mappedChain = chainValues[chainValueB];
        // Add to the totals - summing all values into a new summed object
        mappedChainValues[chainValueA] = mappedChainValues[chainValueA] || { mechanicalCollection: 0, mechanicalOwnership: 0, performanceOwnership: 0, performanceCollection: 0 };
        mappedChainValues[chainValueA].mechanicalCollection += mappedChain.mechanicalCollection;
        mappedChainValues[chainValueA].mechanicalOwnership += mappedChain.mechanicalOwnership;
        mappedChainValues[chainValueA].performanceOwnership += mappedChain.performanceOwnership;
        mappedChainValues[chainValueA].performanceCollection += mappedChain.performanceCollection;
      }
    });
  });
  return mappedChainValues;
};

const countOccurrences = function (inputString, charToCount) {
  let count = 0;
  for (let i = 0; i < inputString.length; i++) {
      if (inputString.charAt(i) === charToCount) {
          count++;
      }
  }
  return count;
};

const chainChildrenToArray = function (chainObject, items, chainTotals, parentId) {
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
          // // Multiply outputs - Marco, Why would you do this? @Tom
          // if (total && item.contractType !== 'Original Publisher') {
          //   item.mechanicalCollection /= total.mechanicalOwnership;
          //   // item.mechanicalOwnership *= multipliers.mechanicalOwnership;
          //   item.performanceCollection /= total.performanceOwnership;
          //   // item.performanceOwnership *= multipliers.performanceOwnership;
          // }
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
};

const calculateMechanicalOwnershipTotal = function(chain) {
  let sum = 0;

  if (chain && chain.children && Array.isArray(chain.children)) {
    chain.children.forEach((child) => {
      if (child) {
        sum += parseFloat(child.mechanicalOwnership) || 0;
        sum += calculateMechanicalOwnershipTotal(child); // Recursively add child's children
      }
    });
  }

  return sum;
};

const calculatePerformanceOwnershipTotal = function(chain) {
  let sum = 0;

  if (chain && chain.children && Array.isArray(chain.children)) {
    chain.children.forEach((child) => {
      if (child) {
        sum += parseFloat(child.performanceOwnership) || 0;
        sum += calculatePerformanceOwnershipTotal(child); // Recursively add child's children
      }
    });
  }

  return sum;
};

const calculatePerformanceCollectionTotal = function(chain) {
  let sum = 0;

  if (chain && chain.children && Array.isArray(chain.children)) {
    chain.children.forEach((child) => {
      if (child) {
        sum += parseFloat(child.performanceCollection) || 0;
        sum += calculatePerformanceCollectionTotal(child); // Recursively add child's children
      }
    });
  }

  return sum;
};

const calculateMechanicalCollectionTotal = function(chain) {
  let sum = 0;

  if (chain && chain.children && Array.isArray(chain.children)) {
    chain.children.forEach((child) => {
      if (child) {
        sum += parseFloat(child.mechanicalCollection) || 0;
        sum += calculateMechanicalCollectionTotal(child); // Recursively add child's children
      }
    });
  }

  return sum;
};

const calculateAndUpdateMechanicalCollection = function(chain) {
  const ownMech = calculateMechanicalOwnershipTotal(chain);
  const colMech = calculateMechanicalCollectionTotal(chain); 
  chain.mechanicalCollection = Math.round((ownMech - colMech) * 1000) / 1000;
};

const calculateAndUpdatePerformanceCollection = function(chain) {
  const ownPerf = calculatePerformanceOwnershipTotal(chain);
  const colPerf = calculatePerformanceCollectionTotal(chain); 
  chain.performanceCollection = Math.round((ownPerf - colPerf) * 1000) / 1000;
};