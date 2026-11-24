import {
  CISAC_APPROVED_COUNTRIES_COUNT,
  CISAC_APPROVED_COUNTRIES_CODES,
  AREA_CODES,
  CONTINENT_CODES,
} from './territories';
import TerritoryHelper from '../territoryHelper';

type CollectionShares = { mechanicalCollection: number; performanceCollection: number };

type ParticipantObject = {
  id?: string;
  name?: string;
  shares?: Record<string, CollectionShares>;
  territoryCollection?: Record<string, CollectionShares>;
};

type ParticipantRole = 'Publisher' | 'Composer';

type TerritoryLines = {
  includes: number[];
  excludes: number[];
};

type TerritoriesToGroupsParams = {
  participant: ParticipantObject;
  chainTerritories: (string | string[])[];
  allChainTerritories: string[][];
  workTerritories: string[];
  participantTerritories: string[];
  isExtraPublisher: boolean;
  role: ParticipantRole;
  deliveryTerritory: string[];
};

// 80% of CISAC countries triggers world flip (160 of 201)
const WORLD_THRESHOLD = Math.floor(CISAC_APPROVED_COUNTRIES_COUNT * 0.8);

/**
 * @description Check if a territory code represents World
 */
export function isWorldCode(code: string): boolean {
  return code === AREA_CODES.WW || code === AREA_CODES.World;
}

/**
 * @description Check if an array contains a World indicator
 */
export function hasWorldIndicator(territories: string[]): boolean {
  return territories.some(isWorldCode);
}

/**
 * @description Filter to only valid CISAC-approved country codes
 */
export function filterValidCisacTerritories(territories: string[]): string[] {
  return territories.filter((t) => CISAC_APPROVED_COUNTRIES_CODES.includes(t));
}

/**
 * @description Convert ISO codes to CISAC numeric codes, removing any invalid entries
 */
export function toNumericCisacCodes(codes: string[]): number[] {
  return codes.map((t) => TerritoryHelper.convertIsoToCisacTerritoryCode(t)).filter((t): t is number => t !== null);
}

/**
 * @description Expand continent/world codes to ISO country codes
 */
export function expandTerritoryCode(code: string): string[] {
  return TerritoryHelper.continentToTerritoryCodes(code);
}

/**
 * @description Intersect chain territories with comparison territories, expanding World/continent codes.
 * @returns List of valid ISO codes that appear in both sets.
 */
export function getTerritoriesFromChainAndWork(
  chainTerritories: string | string[],
  comparisonTerritories: string[]
): string[] {
  const chain = Array.isArray(chainTerritories) ? chainTerritories.flat() : [chainTerritories];

  const chainHasWorld = hasWorldIndicator(chain);
  const comparisonHasWorld = hasWorldIndicator(comparisonTerritories);

  // World + full list = all CISAC codes
  if (chainHasWorld && comparisonTerritories.length >= CISAC_APPROVED_COUNTRIES_COUNT) {
    return CISAC_APPROVED_COUNTRIES_CODES;
  }
  if (comparisonHasWorld && chain.length >= CISAC_APPROVED_COUNTRIES_COUNT) {
    return CISAC_APPROVED_COUNTRIES_CODES;
  }

  // Array intersection
  if (Array.isArray(chainTerritories)) {
    const valid = chain.filter((t) => comparisonTerritories.includes(t));
    return valid.length >= CISAC_APPROVED_COUNTRIES_COUNT ? CISAC_APPROVED_COUNTRIES_CODES : valid;
  }

  // Single World code
  if (isWorldCode(chainTerritories) && comparisonTerritories.length >= CISAC_APPROVED_COUNTRIES_COUNT) {
    return CISAC_APPROVED_COUNTRIES_CODES;
  }

  // Continent match check
  for (const continent of CONTINENT_CODES) {
    if (chainTerritories === continent) {
      const codes = expandTerritoryCode(continent);
      if ([...codes].sort().join() === [...comparisonTerritories].sort().join()) {
        return codes.filter((t) => comparisonTerritories.includes(t));
      }
    }
  }

  return expandTerritoryCode(chainTerritories).filter((t) => comparisonTerritories.includes(t));
}

/**
 * @description For Publishers, calculate excludes from other specific chains. Only applies when the publisher has non-uniform shares.
 */
function getSpecificExcludesFromOtherChains(params: {
  allChainTerritories: string[][];
  currentChainKey: string;
  role: ParticipantRole;
  isExtraPublisher: boolean;
  current: string[];
  hasUniformShares: boolean;
}): string[] {
  const { allChainTerritories, currentChainKey, role, isExtraPublisher, current, hasUniformShares } = params;

  // Only applies to primary Publishers with non-uniform shares
  if (isExtraPublisher || role !== 'Publisher' || hasUniformShares) return [];

  const normalizeEntry = (entry: string | string[]) => {
    const arr = Array.isArray(entry) ? entry.flat() : [String(entry)];
    const filtered = arr.filter((t) => !isWorldCode(t));
    return filterValidCisacTerritories([...new Set(filtered)]).sort();
  };

  const excludes = allChainTerritories
    .map((entry) => normalizeEntry(entry))
    .filter((arr) => {
      const isSelf = JSON.stringify(arr) === currentChainKey;
      const isSpecific = arr.length <= CISAC_APPROVED_COUNTRIES_COUNT / 2;
      return !isSelf && isSpecific;
    })
    .flat()
    .filter((t) => current.includes(t)); // Only exclude what's in our scope

  return [...new Set(excludes)];
}

/**
 * @description Get the share for a territory, with fallback to WW/World shares
 */
function getShareForTerritory(participant: ParticipantObject, iso: string): CollectionShares | undefined {
  return (
    participant?.territoryCollection?.[iso] ||
    participant?.shares?.[iso] ||
    participant?.territoryCollection?.[AREA_CODES.WW] ||
    participant?.territoryCollection?.[AREA_CODES.World] ||
    participant?.shares?.[AREA_CODES.WW] ||
    participant?.shares?.[AREA_CODES.World]
  );
}

/**
 * @description Check if a participant has explicit WW/World shares
 */
function hasExplicitWorldShareDefined(participant: ParticipantObject): boolean {
  return Boolean(
    participant?.territoryCollection?.[AREA_CODES.WW] ||
      participant?.territoryCollection?.[AREA_CODES.World] ||
      participant?.shares?.[AREA_CODES.WW] ||
      participant?.shares?.[AREA_CODES.World]
  );
}

/**
 * @description Group territories by their share values (mechanical_performance)
 * @param territories Array of territory ISO codes
 * @param participant Participant object containing share information
 * @returns Map of share keys to arrays of territory ISO codes
 */
function bucketTerritoriesByShare(territories: string[], participant: ParticipantObject): Map<string, string[]> {
  const buckets = new Map<string, string[]>();
  territories.forEach((iso) => {
    const share = getShareForTerritory(participant, iso);
    const key = share ? `${share.mechanicalCollection}_${share.performanceCollection}` : 'default';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(iso);
  });
  return buckets;
}

/**
 * @description Find the dominant share bucket (with the most territories)
 * @param buckets Map of share keys to arrays of territory ISO codes
 * @returns Object containing the dominant key and its associated ISO codes
 */
function findDominantBucket(buckets: Map<string, string[]>): { key: string; isos: string[] } {
  let dominantKey = '';
  let maxCount = -1;
  buckets.forEach((list, key) => {
    if (list.length > maxCount) {
      maxCount = list.length;
      dominantKey = key;
    }
  });
  return { key: dominantKey, isos: buckets.get(dominantKey) || [] };
}

/**
 * @description Find territories that have their own specific (non-World) chains
 * @param allChainTerritories Array of all territory chains
 * @returns Object containing a set of territories with their own chains and a boolean indicating if any were found
 */
function findTerritoriesWithOwnChains(allChainTerritories: string[][]): { territories: Set<string>; hasAny: boolean } {
  const territories = new Set<string>();
  let hasAny = false;

  allChainTerritories.forEach((chain) => {
    const arr = Array.isArray(chain) ? chain.flat() : [String(chain)];
    if (hasWorldIndicator(arr)) return;

    const filtered = filterValidCisacTerritories(arr);
    // Only consider small chains (not world-level lists)
    if (filtered.length <= CISAC_APPROVED_COUNTRIES_COUNT / 2 && filtered.length > 0) {
      hasAny = true;
      filtered.forEach((t) => territories.add(t));
    }
  });

  return { territories, hasAny };
}

/**
 * @description Check if a share bucket represents zero shares
 * @param key Share bucket key in the format "mechanical_performance"
 * @returns True if the bucket represents zero shares, false otherwise
 */
function isZeroShareBucket(key: string): boolean {
  if (key === 'default') return false;
  const [m, p] = key.split('_').map(Number);
  return m === 0 && p === 0;
}

/**
 * @description Process non-dominant buckets in Broad Mode (exclude then re-include)
 */
function processNonDominantBucketsForBroadMode(params: {
  shareBuckets: Map<string, string[]>;
  dominantKey: string;
  territoriesWithOwnChain: Set<string>;
  hasAnySpecificChain: boolean;
  finalIncludes: string[];
  finalExcludes: string[];
}): void {
  const { shareBuckets, dominantKey, territoriesWithOwnChain, hasAnySpecificChain, finalIncludes, finalExcludes } =
    params;

  shareBuckets.forEach((bucketIsos, key) => {
    if (key === dominantKey || isZeroShareBucket(key)) return;

    const toProcess = hasAnySpecificChain ? bucketIsos.filter((iso) => territoriesWithOwnChain.has(iso)) : bucketIsos;

    if (toProcess.length > 0) {
      finalExcludes.push(...toProcess);
      finalIncludes.push(...toProcess);
    }
  });
}

/**
 * @description Establish the owned territory scope based on the participant's role and their associated territories.
 * @param territories Array of territory ISO codes
 * @param role Participant role (Publisher or Composer)
 * @param workTerritories Array of work territory ISO codes
 * @param participantTerritories Array of participant territory ISO codes
 * @returns Array of owned territory ISO codes
 */
function establishOwnedScope(
  territories: string[],
  role: ParticipantRole,
  workTerritories: string[],
  participantTerritories: string[]
): string[] {
  if (role === 'Publisher') {
    const ownedTerritories = getTerritoriesFromChainAndWork(territories, workTerritories);
    return getTerritoriesFromChainAndWork(ownedTerritories, participantTerritories);
  }
  // For Composers, only expand continent/world codes as already linked to the Publisher
  return territories.flatMap((t) => expandTerritoryCode(t)).filter((t) => CISAC_APPROVED_COUNTRIES_CODES.includes(t));
}

/**
 * @description Apply delivery filter to owned territories
 * @param ownedTerritories Array of owned territory ISO codes
 * @param deliveryTerritory Array of delivery territory ISO codes
 * @returns Object containing current and delivery ISO codes
 */
function applyDeliveryFilter(
  ownedTerritories: string[],
  deliveryTerritory: string[]
): { current: string[]; deliveryISOs: string[] } {
  const deliveryIsWorld = hasWorldIndicator(deliveryTerritory);
  const deliveryISOs = deliveryTerritory.flatMap((t) => (t in AREA_CODES ? expandTerritoryCode(t) : t));
  const current = deliveryIsWorld ? ownedTerritories : ownedTerritories.filter((t) => deliveryISOs.includes(t));
  return { current, deliveryISOs };
}

/**
 * @description Finalize the output by determining the included and excluded territories.
 * @param params Object containing the necessary parameters
 * @param params.finalIncludes Array of final included territory ISO codes
 * @param params.finalExcludes Array of final excluded territory ISO codes
 * @param params.allChainTerritories Array of all territory chains for comparison
 * @param params.deliveryISOs Array of delivery territory ISO codes
 * @param params.current Array of current territory ISO codes
 * @param params.isExtraPublisher Boolean indicating if the participant is an extra publisher
 * @param params.role Participant role (Publisher or Composer)
 * @returns TerritoryLines object with includes and excludes
 */
function reconcileTerritoryLines(params: {
  finalIncludes: string[];
  finalExcludes: string[];
  allChainTerritories: string[][];
  deliveryISOs: string[];
  current: string[];
  isExtraPublisher: boolean;
  role: ParticipantRole;
}): TerritoryLines {
  const { finalIncludes, finalExcludes, allChainTerritories, deliveryISOs, current, isExtraPublisher, role } = params;

  const isWorldOutput = finalIncludes.includes(AREA_CODES.WW);

  // For Publishers with World output, exclude territories from other chains not in our scope
  if (isWorldOutput && !isExtraPublisher && role === 'Publisher') {
    const otherChains = allChainTerritories.flat();
    finalExcludes.push(...otherChains.filter((t) => deliveryISOs.includes(t) && !current.includes(t)));
  }

  const uniqueExcludes = [...new Set(finalExcludes)].filter((t) => {
    if (isWorldOutput && t !== AREA_CODES.WW) return true;
    return !finalIncludes.includes(t);
  });

  return {
    // No sorting for includes to preserve order of addition, 2136 (WW) should always be first
    includes: toNumericCisacCodes([...new Set(finalIncludes)]),
    // Sorting for excludes for consistency and readability, does not impact logic like includes
    excludes: toNumericCisacCodes(uniqueExcludes).sort((a, b) => a - b),
  };
}

/**
 * @description Convert territory codes to CWR include/exclude groups based on participant and territory information.
 * @param params Object containing the necessary parameters
 * @param params.participant Participant object containing share and territory information
 * @param params.chainTerritories Array of territory chains (each chain can be a string or array of strings)
 * @param params.allChainTerritories Array of all territory chains for comparison
 * @param params.workTerritories Array of work territory ISO codes
 * @param params.participantTerritories Array of participant territory ISO codes
 * @param params.isExtraPublisher Boolean indicating if the participant is an extra publisher
 * @param params.role Participant role (Publisher or Composer)
 * @param params.deliveryTerritory Array of delivery territory ISO codes
 * @returns TerritoryLines object with includes and excludes
 */
export function territoriesToGroups(params: TerritoriesToGroupsParams): TerritoryLines {
  const {
    participant,
    chainTerritories,
    allChainTerritories,
    workTerritories,
    participantTerritories,
    isExtraPublisher,
    role,
    deliveryTerritory,
  } = params;

  const flatInput = [...new Set(chainTerritories.flat())];
  if (flatInput.length === 0) return { includes: [], excludes: [] };

  // Establish owned territory scope
  const ownedTerritories = establishOwnedScope(flatInput, role, workTerritories, participantTerritories);

  // Apply delivery filter
  const { current, deliveryISOs } = applyDeliveryFilter(ownedTerritories, deliveryTerritory);

  // Bucket territories by share
  const shareBuckets = bucketTerritoriesByShare(current, participant);
  const dominant = findDominantBucket(shareBuckets);
  const nonDefaultBuckets = [...shareBuckets.keys()].filter((k) => k !== 'default');
  const hasUniformShares = nonDefaultBuckets.length === 1;

  // Calculate external excludes for Publishers
  const validFlatInput = filterValidCisacTerritories(flatInput);
  const externalExcludes = getSpecificExcludesFromOtherChains({
    allChainTerritories,
    currentChainKey: JSON.stringify(validFlatInput.sort()),
    role,
    isExtraPublisher,
    current,
    hasUniformShares,
  });

  // Detect chain-specific territories
  const { territories: territoriesWithOwnChain, hasAny: hasAnySpecificChain } =
    findTerritoriesWithOwnChains(allChainTerritories);

  // Determine mode and process
  const hasExplicitWorldInput = hasWorldIndicator(flatInput);
  const hasExplicitWorldShare = hasExplicitWorldShareDefined(participant);
  const isMajorityWorld =
    dominant.isos.length >= WORLD_THRESHOLD ||
    (hasExplicitWorldShare && current.length >= CISAC_APPROVED_COUNTRIES_COUNT);

  const finalIncludes: string[] = [];
  const finalExcludes: string[] = [...externalExcludes];

  if (isMajorityWorld) {
    // BROAD MODE: Use World (2136) with carved exceptions
    finalIncludes.push(AREA_CODES.WW);

    // Add world gaps (territories outside our scope)
    const worldGaps = CISAC_APPROVED_COUNTRIES_CODES.filter((t) => !current.includes(t));
    finalExcludes.push(...worldGaps);

    // Handle non-dominant buckets
    if (hasExplicitWorldInput || hasExplicitWorldShare || hasAnySpecificChain) {
      processNonDominantBucketsForBroadMode({
        shareBuckets,
        dominantKey: dominant.key,
        territoriesWithOwnChain,
        hasAnySpecificChain,
        finalIncludes,
        finalExcludes,
      });
    }
  } else {
    // SEGMENTED MODE: Include each bucket's territories
    shareBuckets.forEach((bucketIsos) => {
      finalIncludes.push(...getTerritoriesFromChainAndWork(bucketIsos, workTerritories));
    });
  }

  // Finalise the includes/excludes lines and convert to CISAC numeric codes
  return reconcileTerritoryLines({
    finalIncludes,
    finalExcludes,
    allChainTerritories,
    deliveryISOs,
    current,
    isExtraPublisher,
    role,
  });
}
