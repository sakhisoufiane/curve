const { TerritoryHelper } = require('@curveroyaltysystems/curve-shared-logic');

// Note: these old functions were copied over from API, and definitely need some refactoring at some point

const AllTerritories = [
  ...TerritoryHelper.allTerritories, 'WW', 'World', 'Europe', 'Asia', 'Oceania', 'Americas', 'Africa',
];

function mapChainTerritories({ chain, territoryGroupsById }) {
  if (!chain) return;
  if (AllTerritories.includes(chain.territory)) {
    return chain.territory;
  }
  if (chain.territory === 'specific') {
    return chain.territoryCodes.codes.join(';');
  }
  const territoryGroup = territoryGroupsById[chain.territory];
  if (territoryGroup) {
    return territoryGroup.name;
  }
}

function deconstructChain(level, row, chain) {
  let result = [];

  if (chain && chain.children) {
    chain.children.forEach((child, index) => {
      if (child) {
        // Create a new copy of the row on each child
        const rowCopy = JSON.parse(JSON.stringify(row));
        if (level === 1) {
          rowCopy.territory = chain.territory;
          rowCopy.tree = chain.territory;
        }

        // Track tree (for combining composer chains) and total levels
        if (child.type === 'Publisher') {
          if (level === 1) {
            rowCopy.tree += `/${index}_Publisher_${child.publisherId}`;
            rowCopy.chainIndex = index;
          } else {
            rowCopy.tree += `/Publisher_${child.publisherId}`;
          }
        } else if (child.type === 'Composer') {
          rowCopy.tree += '/Composer';
        }
        rowCopy.totalLevels = level;

        rowCopy[level] = {
          type: child.type,
          mechanicalOwnership: parseFloat(child.mechanicalOwnership || 0),
          performanceOwnership: parseFloat(child.performanceOwnership || 0),
          mechanicalCollection: parseFloat(child.mechanicalCollection || 0),
          performanceCollection: parseFloat(child.performanceCollection || 0),
          controlled: child.controlled,
          contractType: child.contractType,
          publisherId: child.publisherId,
          composerId: child.composerId,
        };

        result = result.concat(deconstructChain(level + 1, rowCopy, child));

        if (!child.children || child.children.length === 0) {
          result.push(rowCopy);
        }
      }
    });
  }

  return result;
}

function combineComposerChains(chains) {
  chains.forEach((chainA) => {
    const chainsToRemove = [];
    chains.forEach((chainB, index) => {
      if (chainA !== chainB && chainA.tree === chainB.tree) {
        // Add copy of the final element to the above chain
        chainA[chainA.totalLevels + 1] = JSON.parse(JSON.stringify(chainB[chainB.totalLevels]));
        // Updates total levels on the item
        chainA.totalLevels += 1;
        chainsToRemove.push(index);
      }
    });
    // Remove items in reverse order to keep items in same place if multiple removes are required
    chainsToRemove.sort((a, b) => a - b).reverse().forEach((index) => {
      chains.splice(index, 1);
    });
  });

  return chains;
}

function splitIpChainValues(chain) {
  chain.forEach((subChain) => {
    getTotalSubchainsPerformance(subChain);
  });

  const matchingChains = {};
  for (let i = 0; i < chain.length; i += 1) {
    for (let j = i + 1; j < chain.length; j += 1) {
      getMatchingChains(matchingChains, chain[i], chain[j]);
    }
  }

  for (const key in matchingChains) {
    if (matchingChains[key]) {
      const match = key.split('/');
      const territory = match[0];
      const level = match.length - 1;
      const publisher = match[level];
      const totalPerformance = matchingChains[key];
      chain.forEach((row) => {
        if (row.territory === territory && row[level]) {
          const publisherToCompareTo = level === 1 ? `${row.chainIndex}_${row[level].type}_${row[level].publisherId}` : `${row[level].type}_${row[level].publisherId}`;
          if (publisher === publisherToCompareTo) {
            const performanceRatio = (row[level].totalSubchainsPerformanceOwnership / totalPerformance) * 100;
            row[level].mechanicalOwnership = row[level].mechanicalOwnership ? Math.round(row[level].mechanicalOwnership * performanceRatio) / 100 : 0;
            row[level].performanceOwnership = row[level].performanceOwnership ? Math.round(row[level].performanceOwnership * performanceRatio) / 100 : 0;
            row[level].mechanicalCollection = row[level].mechanicalCollection ? Math.round(row[level].mechanicalCollection * performanceRatio) / 100 : 0;
            row[level].performanceCollection = row[level].performanceCollection ? Math.round(row[level].performanceCollection * performanceRatio) / 100 : 0;
          }
        }
      });
    }
  }
}

function getMatchingChains(matchingChains, chain1, chain2) {
  const chain1Tree = chain1.tree.split('/').filter((item) => item !== 'Composer');
  const chain2Tree = chain2.tree.split('/').filter((item) => item !== 'Composer');
  const totalIterations = chain1Tree.length < chain2Tree.length ? chain1Tree.length : chain2Tree.length;
  const chain1SubTree = [chain1Tree[0]];
  const chain2SubTree = [chain2Tree[0]];
  for (let i = 1; i < totalIterations; i += 1) {
    chain1SubTree.push(chain1Tree[i]);
    chain2SubTree.push(chain2Tree[i]);
    if (chain1SubTree.join('/') === chain2SubTree.join('/') && (!chain2.matches || chain2.matches.indexOf(chain2SubTree.join('/')) === -1)) {
      if (!matchingChains[chain1SubTree.join('/')]) {
        matchingChains[chain1SubTree.join('/')] = chain1[i]?.totalSubchainsPerformanceOwnership ? chain1[i].totalSubchainsPerformanceOwnership : 0;
      }
      // eslint-disable-next-line no-unsafe-optional-chaining
      matchingChains[chain1SubTree.join('/')] += chain2[i]?.totalSubchainsPerformanceOwnership ?? 0;
      if (!chain2.matches) {
        chain2.matches = [];
      }
      chain2.matches.push(chain2SubTree.join('/'));
    }
  }
}

function getTotalSubchainsPerformance(chain) {
  const totalIndexes = chain.totalLevels;
  for (let i = 1; i < totalIndexes + 1; i += 1) {
    chain[i].totalSubchainsPerformanceOwnership = 0;
    for (let j = i + 1; j < totalIndexes + 1; j += 1) {
      chain[i].totalSubchainsPerformanceOwnership += chain[j].performanceOwnership ? chain[j].performanceOwnership : 0;
    }
  }
}

function populateComposersPublishers(chains, composersById, publishersById) {
  for (const chain of chains) {
    const totalLevels = [];
    for (let index = 1; index < chain.totalLevels + 1; index += 1) {
      totalLevels.push(index);
    }
    for (const level of totalLevels) {
      if (chain[level] && chain[level].type === 'Publisher') {
        const publisher = publishersById[chain[level].publisherId];
        if (publisher) {
          chain[level].name = publisher.name;
          chain[level].cae = publisher.cae;
        }
      }
      if (chain[level] && chain[level].type === 'Composer') {
        const composer = composersById[chain[level].composerId];
        if (composer) {
          chain[level].name = composer.name;
          chain[level].firstName = composer.firstName;
          chain[level].middleNames = composer.middleNames;
          chain[level].surname = composer.surname;
          chain[level].cae = composer.cae;
        }
      }
    }
  }
}

function formatChains(work, chains) {
  const data = [];
  chains.map((chain) => {
    const row = [];
    row.push(
      ...[
        work._id.toString(),
        work.title,
        work.identifier,
        work.tunecode,
        chain.territory,
      ],
    );
    for (let index = 1; index < chain.totalLevels + 1; index += 1) {
      if (chain[index]) {
        row.push(
          ...[
            chain[index].type,
            chain[index].name,
            chain[index].firstName,
            chain[index].middleNames,
            chain[index].surname,
            chain[index].cae,
            chain[index].controlled ? chain[index].controlled : false,
            chain[index].mechanicalOwnership,
            chain[index].mechanicalCollection,
            chain[index].performanceOwnership,
            chain[index].performanceCollection,
            chain[index].contractType,
          ],
        );
      }
    }
    data.push(row);
  });
  return data;
}

module.exports = {
  mapChainTerritories,
  deconstructChain,
  combineComposerChains,
  splitIpChainValues,
  populateComposersPublishers,
  formatChains,
};
