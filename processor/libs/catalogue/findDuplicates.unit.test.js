const { randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { chunk } = require('lodash');

const FindDuplicates = require('./findDuplicates');
const Work = require('../../models/work');
const Composer = require('../../models/composer');
const Publisher = require('../../models/publisher');
const { createMockCursor } = require('./testUtils');

jest.mock('lodash', () => ({ ...jest.requireActual('lodash'), chunk: jest.fn() }));

describe('FindDuplicates', () => {
  describe('buildBulkUpdateOperations', () => {
    const clientId = randomId();

    it('should return an empty array when given no groups', () => {
      // Act
      const result = FindDuplicates.buildBulkUpdateOperations([], clientId);
      // Assert
      expect(result).toEqual([]);
    });

    it('should build a single update operation for one group', () => {
      // Arrange
      const groups = [
        [
          'primary1',
          'dupe1',
          'dupe2',
        ],
      ];
      const expectedOps = [
        {
          updateOne: {
            filter: { _id: 'primary1', clientId },
            update: {
              potentialDuplicates: [
                { workId: 'dupe1' },
                { workId: 'dupe2' },
              ],
              potentialDuplicatesCount: 2,
            },
          },
        },
      ];
      chunk.mockReturnValue([expectedOps]);
      // Act
      const result = FindDuplicates.buildBulkUpdateOperations(groups, clientId);
      // Assert
      expect(result).toEqual([expectedOps]);
      expect(chunk).toHaveBeenCalledWith(expectedOps, 500);
    });

    it('should chunk operations into batches of specified size', () => {
      // Arrange
      const groups = [];
      for (let i = 0; i < 10; i += 1) {
        groups.push([
          `primary${i}`,
          `dupe${i}`,
          `dupe${i + 1}`,
          `dupe${i + 2}`,
        ]);
      }
      const expectedOps = groups.map(([primaryId, ...dupeIds]) => ({
        updateOne: {
          filter: { _id: primaryId, clientId },
          update: {
            potentialDuplicates: dupeIds.map((dupeId) => ({ workId: dupeId })),
            potentialDuplicatesCount: dupeIds.length,
          },
        },
      }));
      chunk.mockReturnValue([expectedOps]);
      // Act
      const result = FindDuplicates.buildBulkUpdateOperations(groups, clientId, 'work', 10);
      // Assert
      expect(result).toEqual([expectedOps]);
      expect(chunk).toHaveBeenCalledWith(expectedOps, 10);
    });

    it('should remove groups with no duplicates (no update needed)', () => {
      // Arrange
      const groups = [
        ['primaryAlone'],
        ['primaryWithDupes', 'dupe1', 'dupe2'],
      ];
      const expectedOps = [
        {
          updateOne: {
            filter: { _id: 'primaryWithDupes', clientId },
            update: {
              potentialDuplicates: groups.map((group) => group.slice(1)).flat().map((dupeId) => ({ workId: dupeId })),
              potentialDuplicatesCount: 2,
            },
          },
        },
      ];
      chunk.mockReturnValue([expectedOps]);
      // Act
      const result = FindDuplicates.buildBulkUpdateOperations(groups, clientId);
      // Assert
      expect(result).toEqual([expectedOps]);
      expect(chunk).toHaveBeenCalledWith(expectedOps, 500);
    });
  });

  describe('getStreamedCatalogue', () => {
    it('should call Work.find with the correct clientId', () => {
      const mockCursor = {};
      const clientId = randomId();

      const findMock = jest.fn().mockReturnThis();
      const selectMock = jest.fn().mockReturnThis();
      const leanMock = jest.fn().mockReturnThis();
      const cursorMock = jest.fn().mockReturnValue(mockCursor);

      // Mock the Work model chain
      Work.find = findMock;
      Work.find.mockReturnValue({ select: selectMock });
      selectMock.mockReturnValue({ lean: leanMock });
      leanMock.mockReturnValue({ cursor: cursorMock });

      const result = FindDuplicates.getStreamedCatalogue(clientId, 'work');

      expect(findMock).toHaveBeenCalledWith({ clientId });
      expect(selectMock).toHaveBeenCalledWith({ _id: 1, title: 1, alternateTitles: 1, composer: 1, blacklistedDuplicateIds: 1 });
      expect(leanMock).toHaveBeenCalled();
      expect(cursorMock).toHaveBeenCalled();
      expect(result).toBe(mockCursor);
    });
  });

  describe('normalizeText', () => {
    let normalizeCache;

    beforeEach(() => {
      normalizeCache = new Map();
    });

    it('should return cached value if text is in cache', () => {
      // Arrange
      const cachedText = 'cached';
      const cachedValue = ['cached'];
      normalizeCache.set(cachedText, cachedValue);
      // Act
      const result = FindDuplicates.normalizeText(normalizeCache, cachedText);
      // Assert
      expect(result).toBe(cachedValue);
    });

    it('should normalize accented and special characters', () => {
      // Arrange
      const input = 'Hëllø! – “Dança Kuduro” [Remix] ft. Lúcás Mártínez & DJ ★Star★';
      const expected = ['hello', 'danca', 'kuduro', 'remix', 'ft', 'lucas', 'martinez', 'dj', 'star'];
      // Act
      const result = FindDuplicates.normalizeText(normalizeCache, input);
      // Assert
      expect(result).toEqual(expected);
      expect(normalizeCache.get(input)).toEqual(expected);
    });

    it('should normalize special characters that must be converted to two-character tokens', () => {
      // Arrange
      const input = 'ø æ ß ł';
      const expected = ['o', 'ae', 'ss', 'l'];
      // Act
      const result = FindDuplicates.normalizeText(normalizeCache, input);
      // Assert
      expect(result).toEqual(expected);
      expect(normalizeCache.get(input)).toEqual(expected);
    });

    it('should handle non-string input and convert to string', () => {
      // Arrange
      const input = 42;
      // Act
      const result = FindDuplicates.normalizeText(normalizeCache, input);
      // Assert
      expect(result).toEqual(['42']);
      expect(normalizeCache.get('42')).toEqual(['42']);
    });

    it('should filter out empty tokens from excessive spaces', () => {
      // Arrange
      const input = 'Hello    world   ';
      const expected = ['hello', 'world'];
      // Act
      const result = FindDuplicates.normalizeText(normalizeCache, input);
      // Assert
      expect(result).toEqual(expected);
    });

    it('should handle non-english text', () => {
      // Arrange
      const input = 'GUO HENG QI (GUO ZI)';
      const expected = ['guo', 'heng', 'qi', 'guo', 'zi'];
      // Act
      const result = FindDuplicates.normalizeText(normalizeCache, input);
      // Assert
      expect(result).toEqual(expected);
    });

    it('should return an empty array for null or undefined input', () => {
      expect(FindDuplicates.normalizeText(normalizeCache, '')).toEqual([]);
      expect(FindDuplicates.normalizeText(normalizeCache, null)).toEqual([]);
      expect(FindDuplicates.normalizeText(normalizeCache, undefined)).toEqual([]);
    });
  });

  describe('tokenize', () => {
    let normalizeCache;

    beforeEach(() => {
      normalizeCache = new Map();
    });

    it('should return an empty map when work has no title, alternateTitles, or composer', () => {
      // Arrange
      const work = {};
      // Act
      const result = FindDuplicates.tokenize(normalizeCache, work, 'work');
      // Assert
      expect(result.size).toBe(0);
    });

    it('should add tokens from title with weight TITLE_WEIGHT', () => {
      // Arrange
      const work = { title: 'Untitled 09' };
      // Act
      const result = FindDuplicates.tokenize(normalizeCache, work, 'work');
      // Assert
      expect(result.get('untitled')).toBe(FindDuplicates.TITLE_WEIGHT);
      expect(result.get('09')).toBe(FindDuplicates.TITLE_WEIGHT);
    });

    it('should add tokens from alternateTitles with weight ALT_TITLE_WEIGHT', () => {
      // Arrange
      const work = { alternateTitles: ['009', 'Untitled Nine'] };
      // Act
      const result = FindDuplicates.tokenize(normalizeCache, work, 'work');
      // Assert
      expect(result.get('009')).toBe(FindDuplicates.ALT_TITLE_WEIGHT);
      expect(result.get('untitled')).toBe(FindDuplicates.ALT_TITLE_WEIGHT);
      expect(result.get('nine')).toBe(FindDuplicates.ALT_TITLE_WEIGHT);
    });

    it('should add tokens from composer with weight COMPOSER_WEIGHT', () => {
      // Arrange
      const work = { composer: 'Ludwig van Beethoven' };
      // Act
      const result = FindDuplicates.tokenize(normalizeCache, work, 'work');
      // Assert
      expect(result.get('ludwig')).toBe(FindDuplicates.COMPOSER_WEIGHT);
      expect(result.get('van')).toBe(FindDuplicates.COMPOSER_WEIGHT);
      expect(result.get('beethoven')).toBe(FindDuplicates.COMPOSER_WEIGHT);
    });

    it('should combine weights when tokens appear in multiple fields', () => {
      // Arrange
      const work = {
        title: 'Symphony No. 5',
        alternateTitles: ['Symphony Five'],
        composer: 'Beethoven',
      };
      // Act
      const result = FindDuplicates.tokenize(normalizeCache, work, 'work');
      // Assert
      // "symphony" appears in title and alternateTitles
      expect(result.get('symphony')).toBe(FindDuplicates.TITLE_WEIGHT + FindDuplicates.ALT_TITLE_WEIGHT);

      // "five" appears in alternateTitles and title (as "5" but number normalized)
      // Assuming "5" and "five" are different tokens, just check "five" from altTitles
      expect(result.get('five')).toBe(FindDuplicates.ALT_TITLE_WEIGHT);

      expect(result.get('no')).toBe(FindDuplicates.TITLE_WEIGHT);
      expect(result.get('beethoven')).toBe(FindDuplicates.COMPOSER_WEIGHT);
    });

    it('should handle empty alternateTitles array', () => {
      // Arrange
      const work = { title: 'Test', alternateTitles: [], composer: 'Composer' };
      // Act
      const result = FindDuplicates.tokenize(normalizeCache, work, 'work');
      // Assert
      expect(result.get('test')).toBe(FindDuplicates.TITLE_WEIGHT);
      expect(result.get('composer')).toBe(FindDuplicates.COMPOSER_WEIGHT);
    });

    it('should ignore non-array alternateTitles', () => {
      // Arrange
      const work = { alternateTitles: 'not-an-array' };
      // Act
      const result = FindDuplicates.tokenize(normalizeCache, work, 'work');
      // Assert
      expect(result.size).toBe(0);
    });
  });

  describe('fnv1a', () => {
    it('should return a number', () => {
      expect(typeof FindDuplicates.fnv1a('test')).toBe('number');
    });

    it('should produce a consistent hash for the same input', () => {
      // Arrange
      const input = 'consistent';
      // Act
      const hash1 = FindDuplicates.fnv1a(input);
      const hash2 = FindDuplicates.fnv1a(input);
      // Assert
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      // Act
      const hash1 = FindDuplicates.fnv1a('hello');
      const hash2 = FindDuplicates.fnv1a('world');
      // Assert
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      // Known FNV-1a hash for empty string is 2166136261
      expect(FindDuplicates.fnv1a('')).toBe(2166136261);
    });

    it('should handle strings with special characters', () => {
      // Arrange
      const input = 'Hëllø! – “Dança Kuduro” [Remix] ft. Lúcás Mártínez & DJ ★Star★';
      // Act
      const hash = FindDuplicates.fnv1a(input);
      // Assert
      expect(typeof hash).toBe('number');
    });

    it('should produce expected hashes for known inputs', () => {
      // Precomputed values for reference (32-bit unsigned)
      expect(FindDuplicates.fnv1a('foo')).toBe(2_851_307_223);
      expect(FindDuplicates.fnv1a('bar')).toBe(1_991_736_602);
    });
  });

  describe('jaccard', () => {
    it('should return 0 when both maps are empty', () => {
      const freqMapA = new Map();
      const freqMapB = new Map();
      expect(FindDuplicates.jaccard(freqMapA, freqMapB)).toBe(0);
    });

    it('should return 1 when both maps are identical', () => {
      const freqMapA = new Map([['a', 2], ['b', 3]]);
      const freqMapB = new Map([['a', 2], ['b', 3]]);
      expect(FindDuplicates.jaccard(freqMapA, freqMapB)).toBe(1);
    });

    it('should return 0 when maps have no overlapping tokens', () => {
      const freqMapA = new Map([['a', 1]]);
      const freqMapB = new Map([['b', 1]]);
      expect(FindDuplicates.jaccard(freqMapA, freqMapB)).toBe(0);
    });

    it('should compute correct similarity for partial overlap', () => {
      const freqMapA = new Map([['a', 3], ['b', 1]]);
      const freqMapB = new Map([['a', 1], ['b', 2], ['c', 4]]);

      // Intersection = min(3,1) + min(1,2) + min(0,4) = 1 + 1 + 0 = 2
      // Union = max(3,1) + max(1,2) + max(0,4) = 3 + 2 + 4 = 9
      // Jaccard = 2/9 ≈ 0.2222
      expect(FindDuplicates.jaccard(freqMapA, freqMapB)).toBeCloseTo(2 / 9);
    });

    it('should handle one empty map and one non-empty map', () => {
      const freqMapA = new Map();
      const freqMapB = new Map([['a', 1]]);
      expect(FindDuplicates.jaccard(freqMapA, freqMapB)).toBe(0);
    });

    it('should handle zero counts correctly (ignored)', () => {
      const freqMapA = new Map([['a', 0], ['b', 2]]);
      const freqMapB = new Map([['a', 1], ['b', 0]]);

      // Intersection: min(0,1)=0 + min(2,0)=0 = 0
      // Union: max(0,1)=1 + max(2,0)=2 = 3
      expect(FindDuplicates.jaccard(freqMapA, freqMapB)).toBeCloseTo(0);
    });
  });

  describe('getMinHash', () => {
    it('returns an array of default length (100) when numHashes is not provided', () => {
      // Arrange
      const map = new Map([['token1', 1]]);
      // Act
      const result = FindDuplicates.getMinHash(map);
      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(100);
    });

    it('returns an array of specified length when numHashes is provided', () => {
      // Arrange
      const map = new Map([['token1', 1]]);
      const numHashes = 10;
      // Act
      const result = FindDuplicates.getMinHash(map, numHashes);
      // Assert
      expect(result.length).toBe(numHashes);
    });

    it('produces the same signature for identical input', () => {
      // Arrange
      const makeMap = () => new Map([['a', 2], ['bb', 1]]);
      // Act
      const sig1 = FindDuplicates.getMinHash(makeMap(), 10);
      const sig2 = FindDuplicates.getMinHash(makeMap(), 10);
      // Assert
      expect(sig1).toEqual(sig2);
    });

    it('produces different signatures for different inputs', () => {
      // Arrange
      const map1 = new Map([['a', 1]]);
      const map2 = new Map([['b', 1]]);
      // Act
      const sig1 = FindDuplicates.getMinHash(map1, 10);
      const sig2 = FindDuplicates.getMinHash(map2, 10);
      // Assert
      expect(sig1).not.toEqual(sig2);
    });

    it('returns all Infinity for empty input map', () => {
      // Arrange
      const map = new Map();
      // Act
      const result = FindDuplicates.getMinHash(map, 5);
      // Assert
      expect(result).toEqual(new Array(5).fill(Infinity));
    });

    it('calls fnv1a the correct number of times', () => {
      // Arrange
      const map = new Map([['a', 1], ['b', 1]]);
      jest.spyOn(FindDuplicates, 'fnv1a');
      // Act
      FindDuplicates.getMinHash(map, 5);
      // Assert
      expect(FindDuplicates.fnv1a).toHaveBeenCalledTimes(10); // 2 tokens × 5 hash indices
    });
  });

  describe('addToLSHBuckets', () => {
    let buckets;

    beforeEach(() => {
      buckets = [];
    });

    it('creates correct number of bands in buckets', () => {
      // Arrange
      const work = { _id: randomId() };
      const minhash = Array(10).fill(1); // 10 hashes
      // Act
      FindDuplicates.addToLSHBuckets(work, minhash, buckets, 5);
      // Assert
      expect(buckets.length).toBe(5);
    });

    it('splits minhash into correct slices (bands)', () => {
      // Arrange
      const work = { _id: randomId() };
      const minhash = [1, 2, 3, 4]; // 2 bands of 2 rows
      // Act
      FindDuplicates.addToLSHBuckets(work, minhash, buckets, 2);
      // Assert
      const expectedBandKeys = ['1,2', '3,4'];
      expect([...buckets[0].keys()][0]).toBe(expectedBandKeys[0]);
      expect([...buckets[1].keys()][0]).toBe(expectedBandKeys[1]);
    });

    it('adds the work to the correct bucket', () => {
      // Arrange
      const work = { _id: randomId() };
      const minhash = [10, 20, 30, 40, 50, 60];
      // Act
      FindDuplicates.addToLSHBuckets(work, minhash, buckets, 3); // 2 hashes per band
      // Assert
      const bandKey = '10,20';
      const bucket = buckets[0];
      expect(bucket.has(bandKey)).toBe(true);
      expect(bucket.get(bandKey)[0].id).toBe(work._id);
      expect(bucket.get(bandKey)[0].minhash).toBe(minhash);
    });

    it('puts similar works into the same LSH band bucket', () => {
      // Arrange
      const buckets = [];
      const workA = { _id: randomId() };
      const minhashA = [1, 2, 3, 4];
      const workB = { _id: randomId() };
      const minhashB = [1, 2, 9, 9]; // Shares band 0 with A

      // Act
      FindDuplicates.addToLSHBuckets(workA, minhashA, buckets, 2);
      FindDuplicates.addToLSHBuckets(workB, minhashB, buckets, 2);

      // Assert
      const bandKey0 = '1,2'; // both A and B share this band
      const band0Bucket = buckets[0].get(bandKey0);
      expect(band0Bucket).toBeDefined();
      expect(band0Bucket.length).toBe(2);
      expect(band0Bucket.map((w) => w.id)).toContain(workA._id.toString());
      expect(band0Bucket.map((w) => w.id)).toContain(workB._id.toString());
      expect(buckets[1].get('3,4').length).toBe(1);
      expect(buckets[1].get('9,9').length).toBe(1);
    });

    it('converts _id to string and stores it correctly', () => {
      // Arrange
      const work = { _id: randomId() };
      const minhash = [1, 2, 3, 4, 5];
      // Act
      FindDuplicates.addToLSHBuckets(work, minhash, buckets, 1);
      // Assert
      const bandKey = '1,2,3,4,5';
      const stored = buckets[0].get(bandKey)[0];
      expect(typeof stored.id).toBe('string');
      expect(stored.id).toBe(work._id);
    });

    it('supports multiple works in the same band bucket', () => {
      // Arrange
      const minhash = [7, 8, 9, 10]; // only 1 band for simplicity
      const work1 = { _id: randomId() };
      const work2 = { _id: randomId() };
      // Act
      FindDuplicates.addToLSHBuckets(work1, minhash, buckets, 1);
      FindDuplicates.addToLSHBuckets(work2, minhash, buckets, 1);
      // Assert
      const bandKey = '7,8,9,10';
      const list = buckets[0].get(bandKey);
      expect(list.length).toBe(2);
      expect(list.map((w) => w.id)).toEqual([work1._id, work2._id]);
    });

    it('does not crash if buckets is partially initialized', () => {
      // Arrange
      const work = { _id: randomId() };
      const minhash = [1, 2, 3, 4];
      buckets[0] = new Map(); // partially initialized
      // Act & Assert
      expect(() => FindDuplicates.addToLSHBuckets(work, minhash, buckets, 2)).not.toThrow();
      expect(buckets[0].size).toBeGreaterThan(0);
      expect(buckets[1].size).toBeGreaterThan(0);
    });

    it('ignores remaining elements if minhash is not evenly divisible by bands', () => {
      // Arrange
      const work = { _id: randomId() };
      const minhash = [1, 2, 3, 4, 5]; // 5 elements, 2 bands => 2 per band, 1 leftover
      // Act
      FindDuplicates.addToLSHBuckets(work, minhash, buckets, 2);
      // Assert
      // Only 2 bands should be created
      expect(buckets.length).toBe(2);
      expect([...buckets[0].keys()][0]).toBe('1,2');
      expect([...buckets[1].keys()][0]).toBe('3,4');
    });
  });

  describe('buildDuplicateGraph', () => {
    it('returns an empty graph for empty input', () => {
      // Act
      const result = FindDuplicates.buildDuplicateGraph([]);
      // Assert
      expect(result.size).toBe(0);
    });

    it('creates nodes and neighbors for a single pair', () => {
      // Arrange
      const pairs = [{ id1: 'A', id2: 'B' }];
      // Act
      const graph = FindDuplicates.buildDuplicateGraph(pairs);
      // Assert
      expect(graph.size).toBe(2);
      expect(graph.get('A').neighbors.has('B')).toBe(true);
      expect(graph.get('B').neighbors.has('A')).toBe(true);
    });

    it('handles multiple connected pairs', () => {
      // Arrange
      const pairs = [
        { id1: 'A', id2: 'B' },
        { id1: 'B', id2: 'C' },
      ];
      // Act
      const graph = FindDuplicates.buildDuplicateGraph(pairs);
      // Assert
      expect(graph.size).toBe(3);
      expect(graph.get('A').neighbors.has('B')).toBe(true);
      expect(graph.get('B').neighbors.has('A')).toBe(true);
      expect(graph.get('B').neighbors.has('C')).toBe(true);
      expect(graph.get('C').neighbors.has('B')).toBe(true);
    });

    it('does not add self-loops (id1 === id2)', () => {
      // Arrange
      const pairs = [{ id1: 'A', id2: 'A' }];
      // Act
      const graph = FindDuplicates.buildDuplicateGraph(pairs);
      // Assert
      expect(graph.size).toBe(0);
    });

    it('does not duplicate edges in neighbors', () => {
      // Arrange
      const pairs = [
        { id1: 'X', id2: 'Y' },
        { id1: 'Y', id2: 'X' }, // duplicate, should not affect graph
      ];
      // Act
      const graph = FindDuplicates.buildDuplicateGraph(pairs);
      // Assert
      expect(graph.size).toBe(2);
      expect(graph.get('X').neighbors.size).toBe(1);
      expect(graph.get('Y').neighbors.size).toBe(1);
      expect(graph.get('X').neighbors.has('Y')).toBe(true);
      expect(graph.get('Y').neighbors.has('X')).toBe(true);
    });

    it('handles disconnected nodes correctly', () => {
      // Arrange
      const pairs = [
        { id1: 'A', id2: 'B' },
        { id1: 'C', id2: 'D' },
      ];
      // Act
      const graph = FindDuplicates.buildDuplicateGraph(pairs);
      // Assert
      expect(graph.size).toBe(4);
      expect(graph.get('A').neighbors.has('B')).toBe(true);
      expect(graph.get('C').neighbors.has('D')).toBe(true);
      expect(graph.get('A').neighbors.has('C')).toBe(false);
    });
  });

  describe('extractDuplicateGroups', () => {
    const createNode = (id, neighbors = []) => ({ id, neighbors: new Set(neighbors) });

    it('returns an empty array for empty graph', () => {
      // Act
      const graph = new Map();
      // Act
      const groups = FindDuplicates.extractDuplicateGroups(graph);
      // Assert
      expect(groups).toEqual([]);
    });

    it('returns empty array when graph has isolated nodes only', () => {
      // Arrange
      const graph = new Map([
        ['A', createNode('A')],
        ['B', createNode('B')],
        ['C', createNode('C')],
      ]);
      // Act
      const groups = FindDuplicates.extractDuplicateGroups(graph);
      // Assert
      expect(groups).toEqual([]); // no groups since no duplicates (all singletons)
    });

    it('finds a single group with two connected nodes', () => {
      // Arrange
      const graph = new Map([
        ['A', createNode('A', ['B'])],
        ['B', createNode('B', ['A'])],
      ]);
      // Act
      const groups = FindDuplicates.extractDuplicateGroups(graph);
      // Assert
      expect(groups).toEqual([expect.arrayContaining(['A', 'B'])]);
    });

    it('finds multiple groups with several connected components', () => {
      // Arrange
      const graph = new Map([
        ['A', createNode('A', ['B'])],
        ['B', createNode('B', ['A'])],
        ['C', createNode('C', ['D'])],
        ['D', createNode('D', ['C'])],
        ['E', createNode('E')],
      ]);
      // Act
      const groups = FindDuplicates.extractDuplicateGroups(graph);
      // Assert
      // Two groups: ['A', 'B'] and ['C', 'D'], 'E' alone is ignored
      expect(groups.length).toBe(2);
      expect(groups).toEqual(
        expect.arrayContaining([
          expect.arrayContaining(['A', 'B']),
          expect.arrayContaining(['C', 'D']),
        ]),
      );
    });

    it('handles larger connected components', () => {
      // Arrange
      const graph = new Map([
        ['A', createNode('A', ['B', 'C'])],
        ['B', createNode('B', ['A', 'C'])],
        ['C', createNode('C', ['A', 'B', 'D'])],
        ['D', createNode('D', ['C'])],
      ]);
      // Act
      const groups = FindDuplicates.extractDuplicateGroups(graph);
      // Assert
      expect(groups.length).toBe(1);
      expect(groups[0]).toEqual(expect.arrayContaining(['A', 'B', 'C', 'D']));
    });

    it('does not include single-node groups', () => {
      // Arrange
      const graph = new Map([
        ['A', createNode('A')],
        ['B', createNode('B', ['C'])],
        ['C', createNode('C', ['B'])],
      ]);
      // Act
      const groups = FindDuplicates.extractDuplicateGroups(graph);
      // Assert
      // Only group of B and C is returned, A alone ignored
      expect(groups).toEqual([expect.arrayContaining(['B', 'C'])]);
      expect(groups.flat()).not.toContain('A');
    });
  });

  describe('getDuplicateGroups', () => {
    it('processes works and returns duplicate groups', async () => {
      // Arrange
      const works = [{ _id: '1' }, { _id: '2' }, { _id: '3' }];
      const cursor = createMockCursor(works);

      // Spies
      jest.spyOn(FindDuplicates, 'tokenize');
      jest.spyOn(FindDuplicates, 'getMinHash');
      jest.spyOn(FindDuplicates, 'addToLSHBuckets');

      // Mock tokenize to return simple frequency maps
      jest.spyOn(FindDuplicates, 'tokenize').mockImplementation((cache, work) => new Map([['token', 1]]));

      // Mock getMinHash to return fake signatures
      jest.spyOn(FindDuplicates, 'getMinHash').mockImplementation(() => Array(100).fill(42));

      // Mock addToLSHBuckets to just track calls
      jest.spyOn(FindDuplicates, 'addToLSHBuckets').mockImplementation(() => {});

      // Simulate jaccard similarity scores
      // Only works 1 and 2 are similar, 2 and 3 are not
      const tokenize = jest.spyOn(FindDuplicates, 'tokenize');
      jest.spyOn(FindDuplicates, 'jaccard').mockImplementation((map1, map2) => {
        if (map1 === map2) return 1;
        if (map1 && map2) {
        // Return high similarity only if comparing work 1 and 2
          if (
            (map1 === tokenize.mock.results[0].value && map2 === tokenize.mock.results[1].value)
          || (map1 === tokenize.mock.results[1].value && map2 === tokenize.mock.results[0].value)
          ) {
            return 0.9;
          }
        }
        return 0.1;
      });

      // Mock buildDuplicateGraph to return a simple graph
      jest.spyOn(FindDuplicates, 'buildDuplicateGraph').mockImplementation((duplicates) => new Map([
        ['1', { id: '1', neighbors: new Set(['2']) }],
        ['2', { id: '2', neighbors: new Set(['1']) }],
      ]));

      // Mock extractDuplicateGroups to return groups of duplicates
      jest.spyOn(FindDuplicates, 'extractDuplicateGroups').mockImplementation(() => [['1', '2']]);

      // Act
      const groups = await FindDuplicates.getDuplicateGroups(cursor);

      // Assert
      // Expect bucket functions to be called for each work
      expect(FindDuplicates.tokenize).toHaveBeenCalledTimes(3);
      expect(FindDuplicates.getMinHash).toHaveBeenCalledTimes(3);
      expect(FindDuplicates.addToLSHBuckets).toHaveBeenCalledTimes(3);

      // Cursor destroy called after processing
      expect(cursor.destroy).toHaveBeenCalled();

      // Result matches mock extractDuplicateGroups output
      expect(groups).toEqual([['1', '2']]);
    });

    it('returns an empty array if no duplicates found', async () => {
      // Arrange
      const works = [{ _id: randomId() }];
      const cursor = createMockCursor(works);
      jest.spyOn(FindDuplicates, 'tokenize').mockReturnValue(new Map([['token', 1]]));
      jest.spyOn(FindDuplicates, 'getMinHash').mockReturnValue(Array(100).fill(0));
      jest.spyOn(FindDuplicates, 'addToLSHBuckets').mockImplementation(() => {});
      jest.spyOn(FindDuplicates, 'buildDuplicateGraph').mockReturnValue(new Map());
      jest.spyOn(FindDuplicates, 'extractDuplicateGroups').mockReturnValue([]);
      // Act
      const groups = await FindDuplicates.getDuplicateGroups(cursor);
      // Assert
      expect(groups).toEqual([]);
    });
  });

  describe('getModelType', () => {
    it('returns the Work model when the type is "work"', () => {
      // Act
      const result = FindDuplicates.getModelType('work');
      // Assert
      expect(result).toBe(Work);
    });

    it('returns the Composer model when the type is "composer"', () => {
      // Act
      const result = FindDuplicates.getModelType('composer');
      // Assert
      expect(result).toBe(Composer);
    });

    it('returns the Publisher model when the type is "publisher"', () => {
      // Act
      const result = FindDuplicates.getModelType('publisher');
      // Assert
      expect(result).toBe(Publisher);
    });

    it('throw an error when the type is unknown', () => {
      // Assert
      try {
        FindDuplicates.getModelType(null);
        expect.fail('Expected error not thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
      }
    });
  });
});
