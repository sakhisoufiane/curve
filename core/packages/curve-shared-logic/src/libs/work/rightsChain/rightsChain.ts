import type { Model, HydratedDocument } from '@curveroyaltysystems/models/mongoose';
import type { Work as WorkSchema } from '@curveroyaltysystems/models/dist/work';
import type { TerritoryGroup as TerritoryGroupSchema } from '@curveroyaltysystems/models/dist/territoryGroup';
import { isValidObjectId } from '@curveroyaltysystems/models/mongoose';

type TerritoryGroupModel = Model<TerritoryGroupSchema>;
type WorkInstance = HydratedDocument<WorkSchema & { _excludeIdsForValidation?: string[]; _creationType?: 'unmapped' }>;

export const ContractType = {
  Admin: 'Admin',
  SubPublisher: 'Sub Publisher',
  OriginalPublisher: 'Original Publisher',
  Acquirer: 'Acquirer',
  IncomeParticipant: 'Income Participant',
} as const;

export type RightsChain = {
  territory?: unknown;
  territoryCodes?: { codes?: unknown[] };
  children: ChainItem[];
};

// Generic chain item shape — these are untyped nested structures
export type ChainItem = {
  type?: string;
  controlled?: boolean;
  contractType?: string;
  children?: ChainItem[];
  composerId?: string;
  publisherId?: string;
  mechanicalOwnership?: number;
  performanceOwnership?: number;
  mechanicalCollection?: number;
  performanceCollection?: number;
  totalMechanicalOwnership?: number;
  totalPerformanceOwnership?: number;
  totalMechanicalCollection?: number;
  totalPerformanceCollection?: number;
  [key: string]: unknown;
};

export type PartnerRightsChain = {
  deliveryPartnerId?: unknown;
  rightsChain: RightsChain[];
};

/**
 * Sums up a specific field value across an IP chain and its children.
 */
export function sumValueInIpChainChildren(item: ChainItem, field: string, total: number): number {
  if (item && item[field]) {
    total += parseFloat(item[field] as string);
  }
  if (item && item.children && item.children.length > 0) {
    for (const child of item.children) {
      total = sumValueInIpChainChildren(child, field, total);
    }
  }
  return total;
}

/**
 * Checks if a controlled chain's children are all controlled.
 */
export function areAllChainChildrenControlled(chain: ChainItem): boolean {
  let allChildrenControlled = true;
  if (!chain || !chain.controlled) {
    allChildrenControlled = false;
  } else if (chain && chain.children && chain.children.length > 0) {
    for (const child of chain.children) {
      if (!areAllChainChildrenControlled(child)) {
        allChildrenControlled = false;
      }
    }
  }
  return allChildrenControlled;
}

/**
 * Checks that all rights chains have a territory set.
 */
export function checkChainsHaveTerritory(rightsChains: RightsChain[]): boolean {
  let valid = true;
  if (!rightsChains || rightsChains.length === 0) {
    valid = false;
  } else {
    for (const chain of rightsChains) {
      if (!chain?.territory) {
        valid = false;
        break;
      }
      if (
        chain.territory === 'specific' &&
        (!chain?.territoryCodes?.codes || chain?.territoryCodes?.codes?.length === 0)
      ) {
        valid = false;
        break;
      }
    }
  }
  return valid;
}

export function sumContractTypeValueInIpChainChildren(
  item: ChainItem,
  field: string,
  contractTypes: string[],
  total: number
): number {
  if (item && item[field] && contractTypes.includes(item.contractType ?? '')) {
    total += parseFloat(item[field] as string);
  }
  if (item && item.children && item.children.length > 0) {
    for (const child of item.children) {
      total = sumContractTypeValueInIpChainChildren(child, field, contractTypes, total);
    }
  }
  return total;
}

export function countContractTypeInIpChainChildren(
  item: ChainItem,
  type: string,
  contractTypes: string[],
  count: number
): number {
  if (item && item.type === type && contractTypes.includes(item.contractType ?? '')) {
    count += 1;
  }
  if (item && item.children && item.children.length > 0) {
    for (const child of item.children) {
      count = countContractTypeInIpChainChildren(child, type, contractTypes, count);
    }
  }
  return count;
}

/**
 * Checks that controlled chains have an Original Publisher or Income Participant.
 */
export function controlledByPublisherOrIncomeParticipant(chain: ChainItem[], parent: ChainItem | null = null): boolean {
  let valid = true;
  for (const item of chain) {
    // Top-level controlled Composer is not allowed — must be controlled by a Publisher
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
    // Controlled chains must include an Original Publisher or Income Participant
    if (item.controlled && item.type === 'Publisher') {
      const publishers = countContractTypeInIpChainChildren(
        item,
        'Publisher',
        [ContractType.OriginalPublisher, ContractType.IncomeParticipant],
        0
      );
      if (publishers === 0) {
        valid = false;
        break;
      }
    }
  }
  return valid;
}

/**
 * Retrieves territory groups from a work's default rights chain.
 */
export async function getTerritoryGroupsFromDefaultChains(work: WorkInstance, TerritoryGroup: TerritoryGroupModel) {
  const territoryGroupIds = (work.rightsChain as RightsChain[])
    .map((chain) => (isValidObjectId(chain.territory as string) ? chain.territory : null))
    .filter(Boolean);
  if (territoryGroupIds.length > 0) {
    return TerritoryGroup.find({ clientId: work.clientId, _id: { $in: territoryGroupIds } });
  }
  return [];
}

/**
 * Retrieves territory groups from a work's partner rights chains.
 */
export async function getTerritoryGroupsFromPartnerChains(work: WorkInstance, TerritoryGroup: TerritoryGroupModel) {
  const territoryGroupIds: unknown[] = [];
  for (const partnerChain of work.partnerRightsChains as Array<{ rightsChain: RightsChain[] }>) {
    for (const chain of partnerChain.rightsChain) {
      if (isValidObjectId(chain.territory as string)) {
        territoryGroupIds.push(chain.territory);
      }
    }
  }
  const uniqueTerritoryGroupIds = [...new Set(territoryGroupIds)];
  if (uniqueTerritoryGroupIds.length > 0) {
    return TerritoryGroup.find({ clientId: work.clientId, _id: { $in: uniqueTerritoryGroupIds } });
  }
  return [];
}
