/* eslint-disable no-loop-func */
/* eslint-disable no-continue */
import type { Model, HydratedDocument } from '@curveroyaltysystems/models/mongoose';
import type { Work as WorkSchema } from '@curveroyaltysystems/models/dist/work';
import type { TerritoryGroup as TerritoryGroupSchema } from '@curveroyaltysystems/models/dist/territoryGroup';
import { isValidObjectId } from '@curveroyaltysystems/models/mongoose';

import {
  sumValueInIpChainChildren,
  areAllChainChildrenControlled,
  checkChainsHaveTerritory,
  controlledByPublisherOrIncomeParticipant,
  sumContractTypeValueInIpChainChildren,
  countContractTypeInIpChainChildren,
  ContractType,
  getTerritoryGroupsFromDefaultChains,
  getTerritoryGroupsFromPartnerChains,
  ChainItem,
  PartnerRightsChain,
  RightsChain,
} from './rightsChain';

type TerritoryGroupModel = Model<TerritoryGroupSchema>;
type WorkInstance = HydratedDocument<WorkSchema & { _excludeIdsForValidation?: string[]; _creationType?: 'unmapped' }>;

// Work validation error messages
export const ErrorMessages = {
  NoControlledPublisher: 'Each controlled IP Chain must have an Original Publisher or Income Participant',
  NoOwnedSharesForPublisherTypes: 'Owned Shares cannot be assigned to Admin, Sub-Publishers or Income Participants',
  ChainRequiresTerritory: 'Each IP Chain requires at least one Territory',
  MechanicalOwnershipNot100: 'IP Chains total mechanical ownership should add up to 100%',
  PerformanceOwnershipNot100: 'IP Chains total performance ownership should add up to 100%',
  MechanicalCollectionNot100: 'IP Chains total mechanical collection should add up to 100%',
  PerformanceCollectionNot100: 'IP Chains total performance collection should add up to 100%',
  MissingControlledChain: 'At least one IP Chain has to be controlled',
  AllChildrenMustBeControlled: "All controlled IP Chain's children have to be controlled as well",
  MissingContractType: 'Category needs to be specified for each item in the chain',
  MissingComposerInControlledChain: 'Each controlled chain should contain a composer',
  ControlledComposerRequiresControlledPublisher:
    'Each controlled composer should be represented by a controlled publisher',
  PerformanceOwnershipGreaterThan50: 'Publisher performance ownership should be no greater than 50%',
  PerformanceCollectionGreaterThan50: 'Publisher performance collection should be no greater than 50%',
  CapacityNotInOrder: 'An Admin or Sub-Publisher must come before an Original Publisher',
  OriginalPublisherOrAcquirerRequiresOwnedShares:
    'An Original Publisher or Acquirer needs to have at least some owned shares',
  OriginalPublisherWithAcquirerMustBeZero: 'An Original Publisher owned shares should be zero when Acquirer present',
  AcquirerRequiresOriginalPublisherLink: 'An Acquirer needs to be linked to an Original publisher',
  MissingComposerFields: 'Composer is required in all Composer fields',
  MissingPublisherFields: 'Publisher is required in all Publisher fields',
  DuplicatePartnerChains: 'A Delivery Partner can only have one IP Chain assigned',
  EmptyChain: 'A Chain is currently empty. Please complete the chain or remove it',
  OverlappingTerritories: 'Overlapping territories found across IP Chains',
};

function doAllChainPublishersChildrenEndWithAComposer(baseTree: string, chain: ChainItem): string[] {
  let chainTrees: string[] = [];
  if (chain && chain.children && chain.children.length > 0) {
    chain.children.forEach((child) => {
      if (child && child.controlled) {
        const childTree = `${baseTree}/${child.type}`;
        if (child.children && child.children.length > 0) {
          chainTrees = chainTrees.concat(doAllChainPublishersChildrenEndWithAComposer(childTree, child));
        } else {
          chainTrees.push(childTree);
        }
      }
    });
  }
  return chainTrees;
}

function areAllControlledComposersControlled(chain: ChainItem): boolean {
  let foundUncontrolledControlledComposer = true;

  if (chain?.children) {
    chain.children.forEach((child) => {
      if (child?.type === 'Publisher' && child?.controlled === false) {
        child.children?.forEach((publisherChild) => {
          if (publisherChild.type === 'Composer' && publisherChild.controlled === true) {
            foundUncontrolledControlledComposer = false;
          }
        });
      }
      if (child?.type === 'Publisher') {
        if (!areAllControlledComposersControlled(child)) {
          foundUncontrolledControlledComposer = false;
        }
      }
    });
  }

  return foundUncontrolledControlledComposer;
}

function areAllIPChainAdminSubPubOwnedSharesZero(chain: ChainItem): boolean {
  let allSubPubOwnedSharesZero = true;
  if (
    chain?.type === 'Publisher' &&
    ((chain?.mechanicalOwnership ?? 0) > 0 || (chain?.performanceOwnership ?? 0) > 0) &&
    (chain.contractType === 'Admin' || chain.contractType === 'Sub Publisher')
  ) {
    allSubPubOwnedSharesZero = false;
  } else if (chain && chain.children && chain.children.length > 0) {
    chain.children.forEach((child) => {
      if (!areAllIPChainAdminSubPubOwnedSharesZero(child)) {
        allSubPubOwnedSharesZero = false;
      }
    });
  }
  return allSubPubOwnedSharesZero;
}

function checkAllIPChildrenPublishersShares(item: ChainItem, total: number): number {
  if (item && item.performanceOwnership && item.type === 'Publisher') {
    total += parseFloat(String(item.performanceOwnership));
  }
  if (item && item.children && item.children.length > 0) {
    item.children.forEach((child) => {
      total = checkAllIPChildrenPublishersShares(child, total);
    });
  }
  return total;
}

function checkAllIPChildrenPublishersCollectionShares(item: ChainItem, total: number): number {
  if (item && item.performanceCollection && item.type === 'Publisher') {
    total += parseFloat(String(item.performanceCollection));
  }
  if (item && item.children && item.children.length > 0) {
    item.children.forEach((child) => {
      total = checkAllIPChildrenPublishersCollectionShares(child, total);
    });
  }
  return total;
}

function getChildPublishersCapacityTrees(baseTree: string, chain: ChainItem): string[] {
  let chainTrees: string[] = [];
  if (chain && chain.children && chain.children.length > 0) {
    chain.children.forEach((child) => {
      if (child && child.contractType) {
        const childTree = `${baseTree}/${child.contractType}`;
        if (child.children && child.children.length > 0) {
          chainTrees = chainTrees.concat(getChildPublishersCapacityTrees(childTree, child));
        } else {
          chainTrees.push(childTree);
        }
      }
    });
  }
  return chainTrees;
}

function doAllComposerFieldsContainComposer(chain: ChainItem): boolean {
  let allComposerFieldsContainComposer = true;
  if (chain?.type === 'Composer' && !chain.composerId && chain.composerId !== '') {
    allComposerFieldsContainComposer = false;
  }
  if (chain?.children && chain.children.length > 0) {
    chain.children.forEach((child) => {
      if (!doAllComposerFieldsContainComposer(child)) {
        allComposerFieldsContainComposer = false;
      }
    });
  }
  return allComposerFieldsContainComposer;
}

function doAllPublisherFieldsContainPublisher(chain: ChainItem): boolean {
  let allPublisherFieldsContainPublisher = true;
  if (chain?.type === 'Publisher' && !chain.publisherId && chain.publisherId !== '') {
    allPublisherFieldsContainPublisher = false;
  }
  if (chain?.children && chain.children.length > 0) {
    chain.children.forEach((child) => {
      if (!doAllPublisherFieldsContainPublisher(child)) {
        allPublisherFieldsContainPublisher = false;
      }
    });
  }
  return allPublisherFieldsContainPublisher;
}

export function hasDuplicatePartnerChains(partnerChains: PartnerRightsChain[]): boolean {
  if (!partnerChains || partnerChains?.length === 0) return false;
  const partnerIds = partnerChains.map((chain) => chain.deliveryPartnerId);
  const uniquePartnerIds = [...new Set(partnerIds)];
  return uniquePartnerIds.length !== partnerIds.length;
}

export function hasEmptyChains(chains: (RightsChain | PartnerRightsChain)[]): boolean | undefined {
  if (!chains || chains?.length === 0) return;
  const emptyChains = chains.filter((chain) => {
    const c = chain as RightsChain & PartnerRightsChain;
    return (
      (c.deliveryPartnerId && !c.rightsChain) ||
      c?.rightsChain?.length === 0 ||
      c?.children?.length === 0 ||
      c?.rightsChain?.some((item) => item?.children?.length === 0)
    );
  });
  return emptyChains.length > 0;
}

function recalculateIpChainsTotals(work: WorkInstance): void {
  const calculateChainTotals = (chain: ChainItem) => {
    chain.totalMechanicalOwnership = Math.round(sumValueInIpChainChildren(chain, 'mechanicalOwnership', 0) * 100) / 100;
    chain.totalPerformanceOwnership =
      Math.round(sumValueInIpChainChildren(chain, 'performanceOwnership', 0) * 100) / 100;
    chain.totalMechanicalCollection =
      Math.round(sumValueInIpChainChildren(chain, 'mechanicalCollection', 0) * 100) / 100;
    chain.totalPerformanceCollection =
      Math.round(sumValueInIpChainChildren(chain, 'performanceCollection', 0) * 100) / 100;
  };
  (work.rightsChain as ChainItem[]).forEach((chain) => {
    if (chain) calculateChainTotals(chain);
  });
  (work.partnerRightsChains as PartnerRightsChain[])?.forEach((partnerChain) => {
    partnerChain?.rightsChain?.forEach((chain) => {
      if (chain) calculateChainTotals(chain);
    });
  });
}

function doAllChainChildrenHaveCapacity(chain: ChainItem): boolean {
  let allItemsHaveCapacity = true;
  if (chain?.type && !chain?.contractType) {
    allItemsHaveCapacity = false;
  } else if (chain && chain.children && chain.children.length > 0) {
    chain.children.forEach((child) => {
      if (!doAllChainChildrenHaveCapacity(child)) {
        allItemsHaveCapacity = false;
      }
    });
  }
  return allItemsHaveCapacity;
}

function checkAllIPChainItemsHaveCapacity(work: WorkInstance): {
  allItemsHaveCapacity: boolean;
  allPartnerChainsHaveCapacity: boolean;
} {
  let allItemsHaveCapacity = true;
  let allPartnerChainsHaveCapacity = true;

  const checkChain = (chain: ChainItem, isDefaultChain = true) => {
    if (chain && chain.children && chain.children.length !== 0) {
      chain.children.forEach((child) => {
        if (child && child.type && !child.contractType) {
          if (isDefaultChain) allItemsHaveCapacity = false;
          else allPartnerChainsHaveCapacity = false;
        }
        if (child && child.children && child.children.length > 0) {
          if (!doAllChainChildrenHaveCapacity(child)) {
            if (isDefaultChain) allItemsHaveCapacity = false;
            else allPartnerChainsHaveCapacity = false;
          }
        }
      });
    }
  };

  (work.rightsChain as ChainItem[]).forEach((chain) => checkChain(chain));
  (work.partnerRightsChains as PartnerRightsChain[])?.forEach((partnerChain) => {
    partnerChain?.rightsChain?.forEach((chain) => checkChain(chain, false));
  });

  return { allItemsHaveCapacity, allPartnerChainsHaveCapacity };
}

function checkAllIPChainPublishersEndWithAComposer(work: WorkInstance): {
  allPublishersEndWithComposers: boolean;
  allPartnerPublishersEndWithComposers: boolean;
} {
  const checkChains = (rightsChain: RightsChain[]) => {
    let trees: string[] = [];
    let allPublishersEndWithComposers = true;
    rightsChain?.forEach((chain) => {
      if (chain && chain.children && chain.children.length !== 0) {
        chain.children.forEach((child) => {
          if (child && child.controlled) {
            const baseTree = child.type ?? '';
            if (child.children && child.children.length > 0) {
              trees = trees.concat(doAllChainPublishersChildrenEndWithAComposer(baseTree, child));
            } else {
              trees.push(baseTree);
            }
          }
        });
      }
    });
    for (const tree of trees) {
      if (tree) {
        const parts = tree.split('/');
        if (parts[0] === 'Publisher' && parts[parts.length - 1] !== 'Composer') {
          allPublishersEndWithComposers = false;
          break;
        }
      }
    }
    return allPublishersEndWithComposers;
  };

  const allPublishersEndWithComposers = checkChains(work.rightsChain as RightsChain[]);

  let allPartnerPublishersEndWithComposers = true;
  for (const partnerChain of work.partnerRightsChains as PartnerRightsChain[]) {
    allPartnerPublishersEndWithComposers = checkChains(partnerChain.rightsChain);
    if (!allPartnerPublishersEndWithComposers) break;
  }

  return { allPublishersEndWithComposers, allPartnerPublishersEndWithComposers };
}

function checkIpChainsComposersAreLinkedControlledPublishers(work: WorkInstance): {
  controlledComposersChainsWithoutControlledPublisher: boolean;
  controlledPartnerChainsWithoutControlledPublisher: boolean;
} {
  let controlledComposersChainsWithoutControlledPublisher = false;
  let controlledPartnerChainsWithoutControlledPublisher = false;

  (work.rightsChain as ChainItem[]).forEach((chain) => {
    if (!areAllControlledComposersControlled(chain)) {
      controlledComposersChainsWithoutControlledPublisher = true;
    }
  });

  for (const partnerChain of work.partnerRightsChains as PartnerRightsChain[]) {
    if (partnerChain?.rightsChain && partnerChain?.rightsChain?.length) {
      for (const chain of partnerChain.rightsChain) {
        if (!areAllControlledComposersControlled(chain)) {
          controlledPartnerChainsWithoutControlledPublisher = true;
          break;
        }
      }
    }
  }

  return { controlledComposersChainsWithoutControlledPublisher, controlledPartnerChainsWithoutControlledPublisher };
}

function checkAllIPChainNonCopyrightHoldersOwnedShares(work: WorkInstance): {
  allIPChainNonCopyrightHoldersOwnedSharesZero: boolean;
  allPartnerChainNonCopyrightHoldersOwnedSharesZero: boolean;
} {
  let allIPChainNonCopyrightHoldersOwnedSharesZero = true;
  let allPartnerChainNonCopyrightHoldersOwnedSharesZero = true;

  for (const chain of work.rightsChain as ChainItem[]) {
    if (chain && chain.children && chain.children.length !== 0) {
      chain.children.forEach((child) => {
        if (
          child &&
          child.type === 'Publisher' &&
          (child.contractType === 'Admin' ||
            child.contractType === 'Sub Publisher' ||
            child.contractType === 'Income Participant')
        ) {
          if ((child?.mechanicalOwnership ?? 0) > 0 || (child?.performanceOwnership ?? 0) > 0) {
            allIPChainNonCopyrightHoldersOwnedSharesZero = false;
          }
        }
        if (child && child.children && child.children.length > 0) {
          if (!areAllIPChainAdminSubPubOwnedSharesZero(child)) {
            allIPChainNonCopyrightHoldersOwnedSharesZero = false;
          }
        }
      });
    }
  }

  for (const partnerChain of work.partnerRightsChains as PartnerRightsChain[]) {
    if (partnerChain?.rightsChain && partnerChain?.rightsChain?.length) {
      for (const chain of partnerChain.rightsChain) {
        if (chain && chain.children && chain.children.length !== 0) {
          chain.children.forEach((child) => {
            if (
              child &&
              child.type === 'Publisher' &&
              (child.contractType === 'Admin' ||
                child.contractType === 'Sub Publisher' ||
                child.contractType === 'Income Participant')
            ) {
              if ((child?.mechanicalOwnership ?? 0) > 0 || (child?.performanceOwnership ?? 0) > 0) {
                allPartnerChainNonCopyrightHoldersOwnedSharesZero = false;
              }
            }
            if (child && child.children && child.children.length > 0) {
              if (!areAllIPChainAdminSubPubOwnedSharesZero(child)) {
                allPartnerChainNonCopyrightHoldersOwnedSharesZero = false;
              }
            }
          });
        }
      }
    }
  }

  return { allIPChainNonCopyrightHoldersOwnedSharesZero, allPartnerChainNonCopyrightHoldersOwnedSharesZero };
}

function checkAllIPChainPerformanceOwnershipShares(work: WorkInstance): {
  allSharesBelow51: boolean;
  allPartnerSharesBelow51: boolean;
} {
  let allSharesBelow51 = true;
  let allPartnerSharesBelow51 = true;

  (work.rightsChain as ChainItem[]).forEach((chain) => {
    if (chain && Math.round(checkAllIPChildrenPublishersShares(chain, 0) * 100) / 100 > 50.06) {
      allSharesBelow51 = false;
    }
  });

  for (const partnerChain of work.partnerRightsChains as PartnerRightsChain[]) {
    if (partnerChain.rightsChain && partnerChain.rightsChain.length) {
      for (const chain of partnerChain.rightsChain) {
        if (chain && Math.round(checkAllIPChildrenPublishersShares(chain, 0) * 100) / 100 > 50.06) {
          allPartnerSharesBelow51 = false;
          break;
        }
      }
    }
  }

  return { allSharesBelow51, allPartnerSharesBelow51 };
}

function checkAllIPChainPerformanceCollectionShares(work: WorkInstance): {
  allCollectionSharesBelow51: boolean;
  allPartnerCollectionSharesBelow51: boolean;
} {
  let allCollectionSharesBelow51 = true;
  let allPartnerCollectionSharesBelow51 = true;

  (work.rightsChain as ChainItem[]).forEach((chain) => {
    if (chain && Math.round(checkAllIPChildrenPublishersCollectionShares(chain, 0) * 100) / 100 > 50.06) {
      allCollectionSharesBelow51 = false;
    }
  });

  for (const partnerChain of work.partnerRightsChains as PartnerRightsChain[]) {
    if (partnerChain.rightsChain && partnerChain.rightsChain.length) {
      for (const chain of partnerChain.rightsChain) {
        if (chain && Math.round(checkAllIPChildrenPublishersCollectionShares(chain, 0) * 100) / 100 > 50.06) {
          allPartnerCollectionSharesBelow51 = false;
          break;
        }
      }
    }
  }

  return { allCollectionSharesBelow51, allPartnerCollectionSharesBelow51 };
}

function checkPublishersCapacityOrder(work: WorkInstance): {
  allCapacitiesInOrder: boolean;
  allPartnerCapacitiesInOrder: boolean;
} {
  const checkChains = (rightsChain: RightsChain[]) => {
    let allCapacitiesInOrder = true;
    let chainTrees: string[] = [];
    rightsChain?.forEach((chain) => {
      if (chain && chain.children && chain.children.length !== 0) {
        chain.children.forEach((child) => {
          if (child && child.contractType) {
            const baseTree = child.contractType;
            if (child.children && child.children.length > 0) {
              chainTrees = chainTrees.concat(getChildPublishersCapacityTrees(baseTree, child));
            } else {
              chainTrees.push(baseTree);
            }
          }
        });
      }
    });
    for (const tree of chainTrees) {
      if (tree) {
        const parts = tree.split('/');
        const adminIndex = parts.indexOf('Admin');
        const subPublisherIndex = parts.indexOf('Sub Publisher');
        const originalPublisherIndex = parts.indexOf('Original Publisher');
        const incomeParticipantIndex = parts.indexOf('Income Participant');
        if (
          originalPublisherIndex !== -1 &&
          ((adminIndex !== -1 && adminIndex > originalPublisherIndex && adminIndex > incomeParticipantIndex) ||
            (subPublisherIndex !== -1 &&
              subPublisherIndex > originalPublisherIndex &&
              subPublisherIndex > incomeParticipantIndex))
        ) {
          allCapacitiesInOrder = false;
          break;
        }
      }
    }
    return allCapacitiesInOrder;
  };

  const allCapacitiesInOrder = checkChains(work.rightsChain as RightsChain[]);
  let allPartnerCapacitiesInOrder = true;
  for (const partnerChain of work.partnerRightsChains as PartnerRightsChain[]) {
    allPartnerCapacitiesInOrder = checkChains(partnerChain.rightsChain);
    if (!allPartnerCapacitiesInOrder) break;
  }

  return { allCapacitiesInOrder, allPartnerCapacitiesInOrder };
}

function checkOriginalPublisherAcquirerOwnedShares(work: WorkInstance): {
  allOriginalPublisherAcquirerOwnedShares: boolean;
  allOriginalPublisherWithAcquirerOwnedSharesZero: boolean;
  acquirerLinkedToOriginalPublisher: boolean;
  allPartnerOriginalPublisherAcquirerOwnedShares: boolean;
  allPartnerOriginalPublisherWithAcquirerOwnedSharesZero: boolean;
  partnerAcquirerLinkedToOriginalPublisher: boolean;
} {
  const checkChains = (rightsChain: RightsChain[]) => {
    const checks = {
      allOriginalPublisherAcquirerOwnedShares: true,
      allOriginalPublisherWithAcquirerOwnedSharesZero: true,
      acquirerLinkedToOriginalPublisher: true,
    };
    rightsChain?.forEach((chain) => {
      if (chain && chain.children && chain.children.length !== 0) {
        chain.children.forEach((child) => {
          if (child && child.controlled && child.children && child.children.length) {
            if (areAllChainChildrenControlled(child) && child.contractType !== ContractType.IncomeParticipant) {
              const publisherMechOwned =
                Math.round(
                  sumContractTypeValueInIpChainChildren(child, 'mechanicalOwnership', ['Original Publisher'], 0) * 100
                ) / 100;
              const acquirerMechOwned =
                Math.round(sumContractTypeValueInIpChainChildren(child, 'mechanicalOwnership', ['Acquirer'], 0) * 100) /
                100;
              const publisherPerfOwned =
                Math.round(
                  sumContractTypeValueInIpChainChildren(child, 'performanceOwnership', ['Original Publisher'], 0) * 100
                ) / 100;
              const acquirerPerfOwned =
                Math.round(
                  sumContractTypeValueInIpChainChildren(child, 'performanceOwnership', ['Acquirer'], 0) * 100
                ) / 100;
              const countOriginalPublishers = countContractTypeInIpChainChildren(
                child,
                'Publisher',
                ['Original Publisher'],
                0
              );
              const countAcquirer = countContractTypeInIpChainChildren(child, 'Publisher', ['Acquirer'], 0);
              if (publisherMechOwned + acquirerMechOwned + publisherPerfOwned + acquirerPerfOwned <= 0) {
                checks.allOriginalPublisherAcquirerOwnedShares = false;
              }
              if (countAcquirer > 0 && publisherMechOwned + publisherPerfOwned > 0) {
                checks.allOriginalPublisherWithAcquirerOwnedSharesZero = false;
              }
              if (countAcquirer > 0 && countOriginalPublishers === 0) {
                checks.acquirerLinkedToOriginalPublisher = false;
              }
            }
          }
        });
      }
    });
    return checks;
  };

  const defaultChain = checkChains(work.rightsChain as RightsChain[]);

  let allPartnerOriginalPublisherAcquirerOwnedShares = true;
  let allPartnerOriginalPublisherWithAcquirerOwnedSharesZero = true;
  let partnerAcquirerLinkedToOriginalPublisher = true;

  for (const partnerChain of work.partnerRightsChains as PartnerRightsChain[]) {
    const partnerChecks = checkChains(partnerChain.rightsChain);
    allPartnerOriginalPublisherAcquirerOwnedShares = partnerChecks.allOriginalPublisherAcquirerOwnedShares;
    allPartnerOriginalPublisherWithAcquirerOwnedSharesZero =
      partnerChecks.allOriginalPublisherWithAcquirerOwnedSharesZero;
    partnerAcquirerLinkedToOriginalPublisher = partnerChecks.acquirerLinkedToOriginalPublisher;
  }

  return {
    ...defaultChain,
    allPartnerOriginalPublisherAcquirerOwnedShares,
    allPartnerOriginalPublisherWithAcquirerOwnedSharesZero,
    partnerAcquirerLinkedToOriginalPublisher,
  };
}

function checkNoMissingComposers(work: WorkInstance): {
  allComposerFieldsContainComposer: boolean;
  allPartnerComposerFieldsContainComposer: boolean;
} {
  const checkChains = (rightsChain: RightsChain[]) => {
    let allComposerFieldsContainComposer = true;
    if (rightsChain && rightsChain.length) {
      for (const chain of rightsChain) {
        if (!doAllComposerFieldsContainComposer(chain)) {
          allComposerFieldsContainComposer = false;
          break;
        }
      }
    }
    return allComposerFieldsContainComposer;
  };

  const allComposerFieldsContainComposer = checkChains(work.rightsChain as RightsChain[]);
  let allPartnerComposerFieldsContainComposer = true;
  for (const partnerChain of work.partnerRightsChains as PartnerRightsChain[]) {
    allPartnerComposerFieldsContainComposer = checkChains(partnerChain.rightsChain);
    if (!allPartnerComposerFieldsContainComposer) break;
  }

  return { allComposerFieldsContainComposer, allPartnerComposerFieldsContainComposer };
}

function checkNoMissingPublishers(work: WorkInstance): {
  allPublisherFieldsContainPublisher: boolean;
  allPartnerPublisherFieldsContainPublisher: boolean;
} {
  const checkChains = (rightsChain: RightsChain[]) => {
    let allPublisherFieldsContainPublisher = true;
    if (rightsChain && rightsChain.length) {
      for (const chain of rightsChain) {
        if (!doAllPublisherFieldsContainPublisher(chain)) {
          allPublisherFieldsContainPublisher = false;
          break;
        }
      }
    }
    return allPublisherFieldsContainPublisher;
  };

  const allPublisherFieldsContainPublisher = checkChains(work.rightsChain as RightsChain[]);
  let allPartnerPublisherFieldsContainPublisher = true;
  for (const partnerChain of work.partnerRightsChains as PartnerRightsChain[]) {
    allPartnerPublisherFieldsContainPublisher = checkChains(partnerChain.rightsChain);
    if (!allPartnerPublisherFieldsContainPublisher) break;
  }

  return { allPublisherFieldsContainPublisher, allPartnerPublisherFieldsContainPublisher };
}

// Standalone version of workSchema.methods.checkIpChainsAreControlled
function checkIpChainsAreControlled(work: WorkInstance): {
  hasAtLeastOneChainControlled: boolean;
  allControlledChainsHaveControlledChildren: boolean;
  hasAtLeastOnePartnerChainControlled: boolean;
  allControlledPartnerChainsHaveControlledChildren: boolean;
} {
  const checkChains = (rightsChain: RightsChain[]) => {
    const checks = {
      hasAtLeastOneChainControlled: false,
      allControlledChainsHaveControlledChildren: true,
    };
    rightsChain?.forEach((chain) => {
      if (chain && chain.children && chain.children.length !== 0) {
        chain.children.forEach((child) => {
          if (child && child.controlled) {
            checks.hasAtLeastOneChainControlled = true;
          }
          if (child && child.controlled && child.children && child.children.length > 0) {
            if (!areAllChainChildrenControlled(child)) {
              checks.allControlledChainsHaveControlledChildren = false;
            }
          }
        });
      }
    });
    return checks;
  };

  const defaultChain = checkChains(work.rightsChain as RightsChain[]);

  let hasAtLeastOnePartnerChainControlled = true;
  let allControlledPartnerChainsHaveControlledChildren = true;
  for (const partnerChain of work.partnerRightsChains as PartnerRightsChain[]) {
    const partnerCheck = checkChains(partnerChain.rightsChain);
    hasAtLeastOnePartnerChainControlled = partnerCheck.hasAtLeastOneChainControlled;
    allControlledPartnerChainsHaveControlledChildren = partnerCheck.allControlledChainsHaveControlledChildren;
  }

  return {
    hasAtLeastOneChainControlled: defaultChain.hasAtLeastOneChainControlled,
    allControlledChainsHaveControlledChildren: defaultChain.allControlledChainsHaveControlledChildren,
    hasAtLeastOnePartnerChainControlled,
    allControlledPartnerChainsHaveControlledChildren,
  };
}

export function checkForOverlappingTerritories(
  rightsChain: RightsChain[],
  territoryGroupsById: Record<string, { territories?: unknown[] }>
): string[] {
  const overlappingTerritories = new Set<string>();
  const territories = new Set<string>();

  for (const chain of rightsChain) {
    const isTerritoryGroup = isValidObjectId(chain.territory as string);
    if (chain.territory !== 'specific' && !isTerritoryGroup) continue;
    const territoryCodes = isTerritoryGroup
      ? ((territoryGroupsById[chain.territory as string]?.territories ?? []) as string[])
      : ((chain.territoryCodes?.codes ?? []) as string[]);

    for (const isoTerritoryCode of territoryCodes) {
      if (territories.has(isoTerritoryCode)) {
        overlappingTerritories.add(isoTerritoryCode);
        continue;
      }
      territories.add(isoTerritoryCode);
    }
  }
  return [...overlappingTerritories];
}

/**
 * Validate a work's rights chains and return any validation errors found.
 * TerritoryGroup is injected so this can be called outside of the API.
 */
export async function checkValidationErrors({
  work,
  TerritoryGroup,
}: {
  work: WorkInstance;
  TerritoryGroup: TerritoryGroupModel;
}): Promise<string[]> {
  const validationErrors: string[] = [];

  const checkPartnerChains = (fn: (rightsChain: RightsChain[]) => void) => {
    (work.partnerRightsChains as PartnerRightsChain[])?.forEach((partnerChain) => fn(partnerChain?.rightsChain));
  };

  const errorMessage = (message: string, isPartnerChain = false) =>
    isPartnerChain ? `Partner Chain: ${message}` : `Default Chain: ${message}`;

  // Check Title
  if (!work.title) validationErrors.push('Work title is required');

  // Check ISWC
  if (work.iswc) {
    const dashedFormat = /T-\d{9}-\d{1}$/;
    const compactFormat = /T\d{10}$/;
    if (!dashedFormat.test(work.iswc) && !compactFormat.test(work.iswc)) validationErrors.push('ISWC must be valid');
  }

  // Check Territories
  if (work.territories.length === 0) validationErrors.push('At least one territory needs to be selected');

  // Check every parent chain has a Territory selected
  if ((work.rightsChain as RightsChain[])?.length > 0) {
    if (!checkChainsHaveTerritory(work.rightsChain as RightsChain[])) {
      validationErrors.push(errorMessage(ErrorMessages.ChainRequiresTerritory));
    }
  }
  // Do the same check for partner chains
  checkPartnerChains((partnerChain) => {
    if (!checkChainsHaveTerritory(partnerChain)) {
      validationErrors.push(errorMessage(ErrorMessages.ChainRequiresTerritory, true));
    }
  });

  // Check Arrangement Type when Version Type is Modification
  if (work.versionType === 'Modification' && !work.arrangementType) {
    validationErrors.push('Arrangement Type is required');
  }

  // Check Lyric Adaption when Version Type is Modification
  if (work.versionType === 'Modification' && !work.lyricAdaptionType) {
    validationErrors.push('Lyric Adaption is required');
  }

  // Check IP Chains totals
  recalculateIpChainsTotals(work);

  const checkChain = (chain: ChainItem, isPartnerChain: boolean) => {
    if (chain) {
      if ((chain.totalMechanicalOwnership ?? 0) < 99.94 || (chain.totalMechanicalOwnership ?? 0) > 100.06) {
        validationErrors.push(errorMessage(ErrorMessages.MechanicalOwnershipNot100, isPartnerChain));
      }
      if ((chain.totalPerformanceOwnership ?? 0) < 99.94 || (chain.totalPerformanceOwnership ?? 0) > 100.06) {
        validationErrors.push(errorMessage(ErrorMessages.PerformanceOwnershipNot100, isPartnerChain));
      }
      if ((chain.totalMechanicalCollection ?? 0) < 99.94 || (chain.totalMechanicalCollection ?? 0) > 100.06) {
        validationErrors.push(errorMessage(ErrorMessages.MechanicalCollectionNot100, isPartnerChain));
      }
      if ((chain.totalPerformanceCollection ?? 0) < 99.94 || (chain.totalPerformanceCollection ?? 0) > 100.06) {
        validationErrors.push(errorMessage(ErrorMessages.PerformanceCollectionNot100, isPartnerChain));
      }
    }
  };

  (work.rightsChain as ChainItem[])?.forEach((chain) => checkChain(chain, false));
  checkPartnerChains((partnerChains) => partnerChains?.forEach((chain) => checkChain(chain, true)));

  // Partner Chains - Check each chain is complete and not empty (if any exist)
  if (hasEmptyChains(work.partnerRightsChains as PartnerRightsChain[])) {
    validationErrors.push(errorMessage(ErrorMessages.EmptyChain, true));
  }

  // Default Rights Chains - Check each chain is complete and not empty
  if (hasEmptyChains(work.rightsChain as RightsChain[])) {
    validationErrors.push(errorMessage(ErrorMessages.EmptyChain, false));
  }

  // Check controlled chains
  const {
    hasAtLeastOneChainControlled,
    allControlledChainsHaveControlledChildren,
    hasAtLeastOnePartnerChainControlled,
    allControlledPartnerChainsHaveControlledChildren,
  } = checkIpChainsAreControlled(work);

  // Default chain
  if (!hasAtLeastOneChainControlled) validationErrors.push(errorMessage(ErrorMessages.MissingControlledChain));
  if (!allControlledChainsHaveControlledChildren)
    validationErrors.push(errorMessage(ErrorMessages.AllChildrenMustBeControlled));

  // Partner chains
  if (!hasEmptyChains(work.partnerRightsChains as PartnerRightsChain[])) {
    if (!hasAtLeastOnePartnerChainControlled)
      validationErrors.push(errorMessage(ErrorMessages.MissingControlledChain, true));
    if (!allControlledPartnerChainsHaveControlledChildren)
      validationErrors.push(errorMessage(ErrorMessages.AllChildrenMustBeControlled, true));
  }

  // Check Rights Chains capacity
  const { allItemsHaveCapacity, allPartnerChainsHaveCapacity } = checkAllIPChainItemsHaveCapacity(work);

  if (!allItemsHaveCapacity) {
    validationErrors.push(errorMessage(ErrorMessages.MissingContractType));
  }
  if (!allPartnerChainsHaveCapacity) {
    validationErrors.push(errorMessage(ErrorMessages.MissingContractType, true));
  }

  // Check publishers end with composers
  const { allPublishersEndWithComposers, allPartnerPublishersEndWithComposers } =
    checkAllIPChainPublishersEndWithAComposer(work);

  if (!allPublishersEndWithComposers) {
    validationErrors.push(errorMessage(ErrorMessages.MissingComposerInControlledChain));
  }
  if (!allPartnerPublishersEndWithComposers) {
    validationErrors.push(errorMessage(ErrorMessages.MissingComposerInControlledChain, true));
  }

  // Check controlled composers have controlled publisher
  const { controlledComposersChainsWithoutControlledPublisher, controlledPartnerChainsWithoutControlledPublisher } =
    checkIpChainsComposersAreLinkedControlledPublishers(work);

  if (controlledComposersChainsWithoutControlledPublisher) {
    validationErrors.push(errorMessage(ErrorMessages.ControlledComposerRequiresControlledPublisher));
  }
  if (controlledPartnerChainsWithoutControlledPublisher) {
    validationErrors.push(errorMessage(ErrorMessages.ControlledComposerRequiresControlledPublisher, true));
  }

  // Check Owned Shares cannot be assigned to Admins, Sub-Publishers or Income Participants
  const { allIPChainNonCopyrightHoldersOwnedSharesZero, allPartnerChainNonCopyrightHoldersOwnedSharesZero } =
    checkAllIPChainNonCopyrightHoldersOwnedShares(work);

  if (!allIPChainNonCopyrightHoldersOwnedSharesZero) {
    validationErrors.push(errorMessage(ErrorMessages.NoOwnedSharesForPublisherTypes));
  }
  if (!allPartnerChainNonCopyrightHoldersOwnedSharesZero) {
    validationErrors.push(errorMessage(ErrorMessages.NoOwnedSharesForPublisherTypes, true));
  }

  // Check Performance Ownership shares
  const { allSharesBelow51, allPartnerSharesBelow51 } = checkAllIPChainPerformanceOwnershipShares(work);

  if (!allSharesBelow51) {
    validationErrors.push(errorMessage(ErrorMessages.PerformanceOwnershipGreaterThan50));
  }
  if (!allPartnerSharesBelow51) {
    validationErrors.push(errorMessage(ErrorMessages.PerformanceOwnershipGreaterThan50, true));
  }

  // Check Performance Collection shares
  const { allCollectionSharesBelow51, allPartnerCollectionSharesBelow51 } =
    checkAllIPChainPerformanceCollectionShares(work);

  if (!allCollectionSharesBelow51) {
    validationErrors.push(errorMessage(ErrorMessages.PerformanceCollectionGreaterThan50));
  }
  if (!allPartnerCollectionSharesBelow51) {
    validationErrors.push(errorMessage(ErrorMessages.PerformanceCollectionGreaterThan50, true));
  }

  // Check Publishers capacity order
  const { allCapacitiesInOrder, allPartnerCapacitiesInOrder } = checkPublishersCapacityOrder(work);

  if (!allCapacitiesInOrder) {
    validationErrors.push(errorMessage(ErrorMessages.CapacityNotInOrder));
  }
  if (!allPartnerCapacitiesInOrder) {
    validationErrors.push(errorMessage(ErrorMessages.CapacityNotInOrder, true));
  }

  // An Original Publisher or Income Participant needs to exist on a controlled chain
  for (const chain of work.rightsChain as RightsChain[]) {
    if (!controlledByPublisherOrIncomeParticipant(chain.children ?? [])) {
      validationErrors.push(errorMessage(ErrorMessages.NoControlledPublisher));
      break;
    }
  }
  // Do the same check for partner chains
  for (const partnerChain of work.partnerRightsChains as PartnerRightsChain[]) {
    if (partnerChain.rightsChain && partnerChain.rightsChain.length) {
      for (const chain of partnerChain.rightsChain) {
        if (!controlledByPublisherOrIncomeParticipant(chain.children ?? [])) {
          validationErrors.push(errorMessage(ErrorMessages.NoControlledPublisher, true));
          break;
        }
      }
    }
  }

  // An Original Publisher or Acquirer needs to have at least some owned shares
  const {
    allOriginalPublisherAcquirerOwnedShares,
    allOriginalPublisherWithAcquirerOwnedSharesZero,
    acquirerLinkedToOriginalPublisher,
    allPartnerOriginalPublisherAcquirerOwnedShares,
    allPartnerOriginalPublisherWithAcquirerOwnedSharesZero,
    partnerAcquirerLinkedToOriginalPublisher,
  } = checkOriginalPublisherAcquirerOwnedShares(work);

  // Default chain
  if (!allOriginalPublisherAcquirerOwnedShares)
    validationErrors.push(errorMessage(ErrorMessages.OriginalPublisherOrAcquirerRequiresOwnedShares));
  if (!allOriginalPublisherWithAcquirerOwnedSharesZero)
    validationErrors.push(errorMessage(ErrorMessages.OriginalPublisherWithAcquirerMustBeZero));
  if (!acquirerLinkedToOriginalPublisher)
    validationErrors.push(errorMessage(ErrorMessages.AcquirerRequiresOriginalPublisherLink));

  // Partner chains
  if (!allPartnerOriginalPublisherAcquirerOwnedShares)
    validationErrors.push(errorMessage(ErrorMessages.OriginalPublisherOrAcquirerRequiresOwnedShares, true));
  if (!allPartnerOriginalPublisherWithAcquirerOwnedSharesZero)
    validationErrors.push(errorMessage(ErrorMessages.OriginalPublisherWithAcquirerMustBeZero, true));
  if (!partnerAcquirerLinkedToOriginalPublisher)
    validationErrors.push(errorMessage(ErrorMessages.AcquirerRequiresOriginalPublisherLink, true));

  // Check no Composers are missing
  const { allComposerFieldsContainComposer, allPartnerComposerFieldsContainComposer } = checkNoMissingComposers(work);

  if (!allComposerFieldsContainComposer) {
    validationErrors.push(errorMessage(ErrorMessages.MissingComposerFields));
  }
  if (!allPartnerComposerFieldsContainComposer) {
    validationErrors.push(errorMessage(ErrorMessages.MissingComposerFields, true));
  }

  // Check no Publishers are missing
  const { allPublisherFieldsContainPublisher, allPartnerPublisherFieldsContainPublisher } =
    checkNoMissingPublishers(work);

  if (!allPublisherFieldsContainPublisher) {
    validationErrors.push(errorMessage(ErrorMessages.MissingPublisherFields));
  }
  if (!allPartnerPublisherFieldsContainPublisher) {
    validationErrors.push(errorMessage(ErrorMessages.MissingPublisherFields, true));
  }

  // Check for duplicate Partner Rights Chains
  if (hasDuplicatePartnerChains(work.partnerRightsChains as PartnerRightsChain[])) {
    validationErrors.push(errorMessage(ErrorMessages.DuplicatePartnerChains, true));
  }

  // Default Rights Chain
  const defaultTerritoryGroups = await getTerritoryGroupsFromDefaultChains(work, TerritoryGroup);
  const defaultTerritoryGroupsById = defaultTerritoryGroups.reduce(
    (acc, tg) => {
      acc[(tg._id as { toString(): string }).toString()] = tg as unknown as { territories?: unknown[] };
      return acc;
    },
    {} as Record<string, { territories?: unknown[] }>
  );
  const overlappingDefaultTerritories = checkForOverlappingTerritories(
    work.rightsChain as RightsChain[],
    defaultTerritoryGroupsById
  );
  if (overlappingDefaultTerritories.length > 0) {
    validationErrors.push(
      errorMessage(`${ErrorMessages.OverlappingTerritories} - ${overlappingDefaultTerritories.join(', ')}`, false)
    );
  }

  // Partner Rights Chains
  const partnerTerritoryGroups = await getTerritoryGroupsFromPartnerChains(work, TerritoryGroup);
  const partnerTerritoryGroupsById = partnerTerritoryGroups.reduce(
    (acc, tg) => {
      acc[(tg._id as { toString(): string }).toString()] = tg as unknown as { territories?: unknown[] };
      return acc;
    },
    {} as Record<string, { territories?: unknown[] }>
  );
  for (const partnerChain of work.partnerRightsChains as PartnerRightsChain[]) {
    const overlappingTerritories = checkForOverlappingTerritories(partnerChain.rightsChain, partnerTerritoryGroupsById);
    if (overlappingTerritories.length > 0) {
      validationErrors.push(
        errorMessage(`${ErrorMessages.OverlappingTerritories} - ${overlappingTerritories.join(', ')}`, true)
      );
    }
  }

  return validationErrors;
}

export default {
  checkValidationErrors,
  ErrorMessages,
};
