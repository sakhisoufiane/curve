// @ts-expect-error — no type declarations for curve-shared-logic
import { LowerCaseString } from '@curveroyaltysystems/curve-shared-logic';
import { isValidObjectId } from '@curveroyaltysystems/models/mongoose';
import { TerritoryGroup } from '../../../models';

export interface ChainNode {
  type?: string;
  name?: string;
  firstName?: string;
  middleName?: string;
  surname?: string;
  caeNumber?: string;
  controlled?: boolean | string;
  mechanicalOwnership?: number | string;
  mechanicalCollection?: number | string;
  performanceOwnership?: number | string;
  performanceCollection?: number | string;
  contractType?: string;
  children: ChainNode[];
  index?: number;
  publisherId?: string;
  composerId?: string;
}

interface RightsChainEntry {
  territory?: string;
  territoryCodes?: { codes?: string[] };
}

interface WorkForTerritoryGroups {
  clientId: string;
  rightsChain: RightsChainEntry[];
  partnerRightsChains: Array<{ rightsChain: RightsChainEntry[] }>;
}

const ContractType = {
  Admin: 'Admin',
  SubPublisher: 'Sub Publisher',
  OriginalPublisher: 'Original Publisher',
  Acquirer: 'Acquirer',
  IncomeParticipant: 'Income Participant',
};

function combineDuplicatePublishers(chain: ChainNode[]): ChainNode[] {
  const combined: Record<string, ChainNode> = {};
  for (const item of chain) {
    const paths = buildPaths(item);
    for (const path of paths) {
      const alreadyIncluded = Object.keys(combined).some((key) => key.startsWith(path));
      const existing = combined[path];
      if (existing) {
        combined[path] = mergePublishers(existing, item) ?? existing;
      } else if (!alreadyIncluded) {
        combined[path] = item;
      }
    }
  }
  return Object.values(combined);
}

function mergePublishers(pub1: ChainNode | undefined, pub2: ChainNode | undefined): ChainNode | undefined {
  if (!pub1) return pub2;
  if (!pub2) return pub1;

  const merged: Record<string, unknown> = { ...pub1, children: [] };
  const shareFields = ['mechanicalOwnership', 'mechanicalCollection', 'performanceOwnership', 'performanceCollection'];
  shareFields.forEach((field) => {
    const p1 = (pub1 as unknown as Record<string, unknown>)[field];
    const p2 = (pub2 as unknown as Record<string, unknown>)[field];
    if (p1 || p2) {
      merged[field] = (Number(p1) || 0) + (Number(p2) || 0);
    }
  });

  const mergedChildren: Record<string, ChainNode> = {};
  ((pub1.children as ChainNode[] | undefined) ?? []).forEach((child) => { mergedChildren[buildUniqueComposerKey(child)] = child; });
  ((pub2.children as ChainNode[] | undefined) ?? []).forEach((child) => { mergedChildren[buildUniqueComposerKey(child)] = child; });

  Object.values(mergedChildren).forEach((child) => {
    const pub1Child = pub1.children?.find((c) => buildUniqueComposerKey(c) === buildUniqueComposerKey(child));
    const pub2Child = pub2.children?.find((c) => buildUniqueComposerKey(c) === buildUniqueComposerKey(child));
    (merged.children as ChainNode[]).push(mergePublishers(pub1Child, pub2Child) as ChainNode);
  });

  return merged as unknown as ChainNode;
}

function buildPaths(chainItem: ChainNode | undefined, currentPath = ''): string[] {
  if (currentPath?.includes('Publisher') && !chainItem) return [currentPath];
  if (!chainItem) return [];
  if (chainItem.type === 'Composer') return currentPath ? [currentPath] : [buildUniqueComposerKey(chainItem)];
  const key = buildUniquePublisherKey(chainItem);
  const newPath = currentPath ? `${currentPath}/${key}` : key;
  if (chainItem.type === 'Publisher' && (!chainItem.children || chainItem.children.length === 0)) return [newPath];
  if (chainItem.children && chainItem.children.length > 0) {
    const paths: string[] = [];
    chainItem.children.forEach((child) => paths.push(...buildPaths(child, newPath)));
    return [...new Set(paths)];
  }
  return [];
}

function buildUniquePublisherKey(publisher: ChainNode): string {
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

function buildUniqueComposerKey(composer: ChainNode): string {
  return [
    composer.composerId,
    LowerCaseString(composer.name),
    composer.contractType,
  ].join('_');
}

function controlledByPublisherOrIncomeParticipant(chain: ChainNode[], parent: ChainNode | null = null): boolean {
  let valid = true;
  for (const item of chain) {
    if (item.type === 'Composer' && item.controlled && !parent) {
      valid = false;
      break;
    }
    if (item.children && item.children.length > 0) {
      const childrenValid = controlledByPublisherOrIncomeParticipant(item.children, item);
      if (!childrenValid) {
        valid = false;
        break;
      }
    }
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

function checkChainsHaveTerritory(rightsChains: RightsChainEntry[] | null | undefined): boolean {
  let valid = true;
  if (!rightsChains || rightsChains.length === 0) {
    valid = false;
  } else {
    for (const chain of rightsChains) {
      if (!chain?.territory) {
        valid = false;
        break;
      }
      if (chain.territory === 'specific' && (!chain?.territoryCodes?.codes || chain?.territoryCodes?.codes?.length === 0)) {
        valid = false;
        break;
      }
    }
  }
  return valid;
}

function sumContractTypeValueInIpChainChildren(item: ChainNode, field: string, contractTypes: string[], total: number): number {
  const itemRecord = item as unknown as Record<string, unknown>;
  if (item && itemRecord[field] && contractTypes.includes(item.contractType ?? '')) {
    total += parseFloat(String(itemRecord[field]));
  }
  if (item && item.children && item.children.length > 0) {
    item.children.forEach((child) => {
      total = sumContractTypeValueInIpChainChildren(child, field, contractTypes, total);
    });
  }
  return total;
}

function countContractTypeInIpChainChildren(item: ChainNode, type: string, contractTypes: string[], count: number): number {
  if (item && item.type === type && contractTypes.includes(item.contractType ?? '')) {
    count += 1;
  }
  if (item && item.children && item.children.length > 0) {
    item.children.forEach((child) => {
      count = countContractTypeInIpChainChildren(child, type, contractTypes, count);
    });
  }
  return count;
}

function areAllChainChildrenControlled(chain: ChainNode | null | undefined): boolean {
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

function sumValueInIpChainChildren(item: ChainNode, field: string, total: number): number {
  const itemRecord = item as unknown as Record<string, unknown>;
  if (item && itemRecord[field]) { total += parseFloat(String(itemRecord[field])); }
  if (item && item.children && item.children.length > 0) {
    item.children.forEach((child) => {
      total = sumValueInIpChainChildren(child, field, total);
    });
  }
  return total;
}

async function getTerritoryGroupsFromDefaultChains(work: WorkForTerritoryGroups) {
  const territoryGroupIds = work.rightsChain
    .map((chain) => (isValidObjectId(chain.territory) ? chain.territory : null))
    .filter(Boolean);
  if (territoryGroupIds.length > 0) {
    return TerritoryGroup.find({ clientId: work.clientId, _id: { $in: territoryGroupIds } });
  }
  return [];
}

async function getTerritoryGroupsFromPartnerChains(work: WorkForTerritoryGroups) {
  const territoryGroupIds: string[] = [];
  for (const partnerChain of work.partnerRightsChains) {
    partnerChain.rightsChain.forEach((chain) => {
      if (isValidObjectId(chain.territory)) {
        territoryGroupIds.push(chain.territory!);
      }
    });
  }
  const uniqueTerritoryGroupIds = [...new Set(territoryGroupIds)];
  if (uniqueTerritoryGroupIds.length > 0) {
    return TerritoryGroup.find({ clientId: work.clientId, _id: { $in: uniqueTerritoryGroupIds } });
  }
  return [];
}

const ipChainUtils = {
  ContractType,
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

export default ipChainUtils;
