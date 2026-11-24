// @ts-expect-error — no type declarations for curve-shared-logic
import { TerritoryHelper } from '@curveroyaltysystems/curve-shared-logic';

const AllTerritories: string[] = [
  ...TerritoryHelper.allTerritories, 'WW', 'World', 'Europe', 'Asia', 'Oceania', 'Americas', 'Africa',
];

export interface ChainNode {
  type: 'Composer' | 'Publisher';
  mechanicalOwnership: number;
  performanceOwnership: number;
  mechanicalCollection: number;
  performanceCollection: number;
  controlled: boolean;
  contractType: string;
  publisherId?: string;
  composerId?: string;
  name?: string;
  firstName?: string;
  middleNames?: string;
  surname?: string;
  cae?: string;
  totalSubchainsPerformanceOwnership?: number;
}

// Chain rows use dynamic numeric keys alongside named properties
export type ChainRow = {
  territory: string;
  tree: string;
  chainIndex?: number;
  totalLevels: number;
  matches?: string[];
  [key: number]: ChainNode;
};

interface RawChain {
  territory?: string;
  territoryCodes?: { codes: string[] };
  children?: RawChainChild[];
}

interface RawChainChild extends RawChain {
  type: 'Composer' | 'Publisher';
  mechanicalOwnership?: number | string;
  performanceOwnership?: number | string;
  mechanicalCollection?: number | string;
  performanceCollection?: number | string;
  controlled?: boolean;
  contractType?: string;
  publisherId?: string;
  composerId?: string;
}

interface TerritoryGroupDoc {
  name: string;
}

export function mapChainTerritories({
  chain,
  territoryGroupsById,
}: {
  chain: RawChain;
  territoryGroupsById: Record<string, TerritoryGroupDoc>;
}): string | undefined {
  if (!chain) return undefined;
  if (AllTerritories.includes(chain.territory ?? '')) return chain.territory;
  if (chain.territory === 'specific') return chain.territoryCodes?.codes.join(';');
  const territoryGroup = territoryGroupsById[chain.territory ?? ''];
  if (territoryGroup) return territoryGroup.name;
  return undefined;
}

export function deconstructChain(level: number, row: Partial<ChainRow>, chain: RawChain): ChainRow[] {
  let result: ChainRow[] = [];

  if (chain?.children) {
    chain.children.forEach((child, index) => {
      if (child) {
        const rowCopy = JSON.parse(JSON.stringify(row)) as ChainRow;
        if (level === 1) {
          rowCopy.territory = chain.territory ?? '';
          rowCopy.tree = chain.territory ?? '';
        }

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
          mechanicalOwnership: parseFloat(String(child.mechanicalOwnership ?? 0)),
          performanceOwnership: parseFloat(String(child.performanceOwnership ?? 0)),
          mechanicalCollection: parseFloat(String(child.mechanicalCollection ?? 0)),
          performanceCollection: parseFloat(String(child.performanceCollection ?? 0)),
          controlled: child.controlled ?? false,
          contractType: child.contractType ?? '',
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

export function combineComposerChains(chains: ChainRow[]): ChainRow[] {
  chains.forEach((chainA) => {
    const chainsToRemove: number[] = [];
    chains.forEach((chainB, index) => {
      if (chainA !== chainB && chainA.tree === chainB.tree) {
        chainA[chainA.totalLevels + 1] = JSON.parse(JSON.stringify(chainB[chainB.totalLevels]));
        chainA.totalLevels += 1;
        chainsToRemove.push(index);
      }
    });
    chainsToRemove
      .sort((a, b) => a - b)
      .reverse()
      .forEach((index) => {
        chains.splice(index, 1);
      });
  });

  return chains;
}

export function splitIpChainValues(chain: ChainRow[]): void {
  chain.forEach((subChain) => {
    getTotalSubchainsPerformance(subChain);
  });

  const matchingChains: Record<string, number> = {};
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
          const publisherToCompareTo =
            level === 1
              ? `${row.chainIndex}_${row[level].type}_${row[level].publisherId}`
              : `${row[level].type}_${row[level].publisherId}`;
          if (publisher === publisherToCompareTo) {
            const performanceRatio = (row[level].totalSubchainsPerformanceOwnership! / totalPerformance) * 100;
            row[level].mechanicalOwnership = row[level].mechanicalOwnership
              ? Math.round(row[level].mechanicalOwnership * performanceRatio) / 100
              : 0;
            row[level].performanceOwnership = row[level].performanceOwnership
              ? Math.round(row[level].performanceOwnership * performanceRatio) / 100
              : 0;
            row[level].mechanicalCollection = row[level].mechanicalCollection
              ? Math.round(row[level].mechanicalCollection * performanceRatio) / 100
              : 0;
            row[level].performanceCollection = row[level].performanceCollection
              ? Math.round(row[level].performanceCollection * performanceRatio) / 100
              : 0;
          }
        }
      });
    }
  }
}

function getMatchingChains(
  matchingChains: Record<string, number>,
  chain1: ChainRow,
  chain2: ChainRow,
): void {
  const chain1Tree = chain1.tree.split('/').filter((item) => item !== 'Composer');
  const chain2Tree = chain2.tree.split('/').filter((item) => item !== 'Composer');
  const totalIterations = Math.min(chain1Tree.length, chain2Tree.length);
  const chain1SubTree = [chain1Tree[0]];
  const chain2SubTree = [chain2Tree[0]];

  for (let i = 1; i < totalIterations; i += 1) {
    chain1SubTree.push(chain1Tree[i]);
    chain2SubTree.push(chain2Tree[i]);
    const subKey = chain1SubTree.join('/');
    if (
      subKey === chain2SubTree.join('/') &&
      (!chain2.matches || !chain2.matches.includes(chain2SubTree.join('/')))
    ) {
      if (!matchingChains[subKey]) {
        matchingChains[subKey] = chain1[i]?.totalSubchainsPerformanceOwnership ?? 0;
      }
      matchingChains[subKey] += chain2[i]?.totalSubchainsPerformanceOwnership ?? 0;
      if (!chain2.matches) chain2.matches = [];
      chain2.matches.push(chain2SubTree.join('/'));
    }
  }
}

function getTotalSubchainsPerformance(chain: ChainRow): void {
  const totalIndexes = chain.totalLevels;
  for (let i = 1; i < totalIndexes + 1; i += 1) {
    chain[i].totalSubchainsPerformanceOwnership = 0;
    for (let j = i + 1; j < totalIndexes + 1; j += 1) {
      chain[i].totalSubchainsPerformanceOwnership! += chain[j].performanceOwnership ?? 0;
    }
  }
}

interface ComposerDoc {
  name?: string;
  firstName?: string;
  middleNames?: string;
  surname?: string;
  cae?: string;
}

interface PublisherDoc {
  name?: string;
  cae?: string;
}

export function populateComposersPublishers(
  chains: ChainRow[],
  composersById: Record<string, ComposerDoc>,
  publishersById: Record<string, PublisherDoc>,
): void {
  for (const chain of chains) {
    for (let index = 1; index <= chain.totalLevels; index += 1) {
      if (chain[index]?.type === 'Publisher') {
        const publisher = publishersById[chain[index].publisherId ?? ''];
        if (publisher) {
          chain[index].name = publisher.name;
          chain[index].cae = publisher.cae;
        }
      }
      if (chain[index]?.type === 'Composer') {
        const composer = composersById[chain[index].composerId ?? ''];
        if (composer) {
          chain[index].name = composer.name;
          chain[index].firstName = composer.firstName;
          chain[index].middleNames = composer.middleNames;
          chain[index].surname = composer.surname;
          chain[index].cae = composer.cae;
        }
      }
    }
  }
}

type CsvRow = (string | number | boolean | null | undefined)[];

export function formatChains(work: Record<string, unknown>, chains: ChainRow[]): CsvRow[] {
  return chains.map((chain) => {
    const row: CsvRow = [
      String(work._id),
      work.title as string,
      work.identifier as string,
      work.tunecode as string,
      chain.territory,
    ];
    for (let index = 1; index <= chain.totalLevels; index += 1) {
      if (chain[index]) {
        row.push(
          chain[index].type,
          chain[index].name,
          chain[index].firstName,
          chain[index].middleNames,
          chain[index].surname,
          chain[index].cae,
          chain[index].controlled ?? false,
          chain[index].mechanicalOwnership,
          chain[index].mechanicalCollection,
          chain[index].performanceOwnership,
          chain[index].performanceCollection,
          chain[index].contractType,
        );
      }
    }
    return row;
  });
}
