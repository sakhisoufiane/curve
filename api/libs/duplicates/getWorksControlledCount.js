const Work = require('../../models/work');

const getWorksControlledCount = async (type, clientId, catalogue = []) => {
  const usedIdsField = type === 'composer' ? 'usedComposerIds' : 'usedPublisherIds';
  const idField = type === 'composer' ? 'composerId' : 'publisherId';

  const validIds = new Set(catalogue.map(({ _id }) => _id.toString()));

  const works = await Work.find(
    { clientId, [usedIdsField]: { $in: [...validIds] } },
    { _id: 1, [usedIdsField]: 1, rightsChain: 1 },
  ).lean();

  const catalogueCount = {};

  works.forEach((work) => {
    if (work.rightsChain && work.rightsChain.length > 0) {
      work.rightsChain.forEach((chainNode) => traverseChain(chainNode, type, validIds, idField, catalogueCount));
    }
  });

  return catalogueCount;
};

const traverseChain = (node, type, validIds, idField, catalogueCount) => {
  if (node.type && node.type.toLowerCase() === (type === 'composer' ? 'composer' : 'publisher')
  ) {
    const id = node[idField];
    if (id && validIds.has(id)) {
      if (!catalogueCount[id]) {
        catalogueCount[id] = { controlled: 0, unControlled: 0 };
      }
      if (node.controlled) {
        catalogueCount[id].controlled += 1;
      } else {
        catalogueCount[id].unControlled += 1;
      }
    }
  }
  if (node.children && node.children.length > 0) {
    node.children.forEach((child) => traverseChain(child, type, validIds, idField, catalogueCount));
  }
};

module.exports = getWorksControlledCount;
