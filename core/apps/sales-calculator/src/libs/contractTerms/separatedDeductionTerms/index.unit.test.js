/* eslint-disable @typescript-eslint/no-var-requires */
const testUtils = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const SeparatedDeductionTerms = require('./index');

// Mock all the required modules
jest.mock('../../../models/release');
jest.mock('../../../models/track');
jest.mock('../../../models/work');
jest.mock('../../../models/territoryGroup');
jest.mock('../../../models/contractTermGroup');
jest.mock('@curveroyaltysystems/platform-shared-utils', () => ({
  logger: {
    info: jest.fn()
  },
  testUtils: require('@curveroyaltysystems/platform-shared-utils/libs/testUtils')
}));

const Release = require('../../../models/release');
const Track = require('../../../models/track');
const Work = require('../../../models/work');
const TerritoryGroup = require('../../../models/territoryGroup');
const ContractTermGroup = require('../../../models/contractTermGroup');

describe('SeparatedDeductionTerms', () => {
  let mockContract;
  let mockDeductionTerms;
  let mockReleases;
  let mockTracks;
  let mockWorks;
  let mockTerritoryGroup;
  let mockContractTermGroup;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock contract
    mockContract = {
      _id: testUtils.randomId(),
      clientId: testUtils.randomId(),
      deductionsTerms: []
    };

    // Setup mock deduction terms
    mockDeductionTerms = [
      {
        id: 201,
        catalogueGroup: 'Group1',
        territory: testUtils.randomId(),
        channel: testUtils.randomId(),
        configuration: testUtils.randomId(),
        priceCategory: testUtils.randomId(),
        source: testUtils.randomId(),
        amount: 100
      },
      {
        id: 202,
        catalogueGroup: 'All',
        territory: testUtils.randomId(),
        channel: testUtils.randomId(),
        configuration: testUtils.randomId(),
        priceCategory: testUtils.randomId(),
        source: testUtils.randomId(),
        amount: 200
      },
      {
        id: 203,
        catalogueGroup: 'Group2',
        territory: testUtils.randomId(),
        channel: testUtils.randomId(),
        configuration: testUtils.randomId(),
        priceCategory: testUtils.randomId(),
        source: testUtils.randomId(),
        amount: 300
      }
    ];

    // Setup mock releases
    mockReleases = [
      { _id: testUtils.randomId() },
      { _id: testUtils.randomId() }
    ];

    // Setup mock tracks
    mockTracks = [
      { _id: testUtils.randomId() },
      { _id: testUtils.randomId() }
    ];

    // Setup mock works
    mockWorks = [
      { _id: testUtils.randomId() },
      { _id: testUtils.randomId() }
    ];

    // Setup mock territory group
    mockTerritoryGroup = {
      _id: testUtils.randomId(),
      territories: ['US', 'UK', 'CA']
    };

    // Setup mock contract term group
    mockContractTermGroup = {
      _id: testUtils.randomId(),
      items: ['Item1', 'Item2', 'Item3']
    };

    // Setup mock implementations
    Release.find.mockResolvedValue(mockReleases);
    Track.find.mockResolvedValue(mockTracks);
    Work.find.mockResolvedValue(mockWorks);
    TerritoryGroup.findOne.mockResolvedValue(mockTerritoryGroup);
    ContractTermGroup.findById.mockResolvedValue(mockContractTermGroup);
  });

  describe('get', () => {
    it('should process deduction terms with catalogue groups', async () => {
      // Store original values before processing to avoid reference issues
      const originalTerritory = mockDeductionTerms[0].territory;
      const originalChannel = mockDeductionTerms[0].channel;
      const originalConfiguration = mockDeductionTerms[0].configuration;
      const originalPriceCategory = mockDeductionTerms[0].priceCategory;
      const originalSource = mockDeductionTerms[0].source;
      
      mockContract.deductionsTerms = [mockDeductionTerms[0]];

      const result = await SeparatedDeductionTerms.get(mockContract);

      // Verify Release.find was called
      expect(Release.find).toHaveBeenCalledWith(
        { clientId: mockContract.clientId, catalogueGroups: 'Group1' },
        { _id: 1 }
      );

      // Verify Track.find was called
      expect(Track.find).toHaveBeenCalledWith(
        { clientId: mockContract.clientId, catalogueGroups: 'Group1' },
        { _id: 1 }
      );

      // Verify Work.find was called
      expect(Work.find).toHaveBeenCalledWith(
        { clientId: mockContract.clientId, catalogueGroups: 'Group1' },
        { _id: 1 }
      );

      // Verify TerritoryGroup.findOne was called with the original territory ID
      expect(TerritoryGroup.findOne).toHaveBeenCalledWith({ _id: originalTerritory });

      // Verify ContractTermGroup.findById was called for all fields
      expect(ContractTermGroup.findById).toHaveBeenCalledWith(originalChannel);
      expect(ContractTermGroup.findById).toHaveBeenCalledWith(originalConfiguration);
      expect(ContractTermGroup.findById).toHaveBeenCalledWith(originalPriceCategory);
      expect(ContractTermGroup.findById).toHaveBeenCalledWith(originalSource);

      // Verify the result
      expect(result).toHaveLength(1);
      expect(result[0].releaseIds).toEqual(mockReleases.map(r => r._id.toString()));
      expect(result[0].trackIds).toEqual(mockTracks.map(t => t._id.toString()));
      expect(result[0].workIds).toEqual(mockWorks.map(w => w._id.toString()));
      expect(result[0].territory).toEqual(mockTerritoryGroup.territories);
      expect(result[0].channel).toEqual(mockContractTermGroup.items.filter(Boolean));
      expect(result[0].configuration).toEqual(mockContractTermGroup.items.filter(Boolean));
      expect(result[0].priceCategory).toEqual(mockContractTermGroup.items.filter(Boolean));
      expect(result[0].source).toEqual(mockContractTermGroup.items.filter(Boolean));
    });

    it('should process deduction terms with "All" catalogue group', async () => {
      mockContract.deductionsTerms = [mockDeductionTerms[1]];

      const result = await SeparatedDeductionTerms.get(mockContract);

      // Verify the result includes the term with "All" catalogue group
      expect(result).toHaveLength(1);
      expect(result[0].catalogueGroup).toBe('All');
    });

    it('should handle terms with 24-character ObjectIds for territory, channel, configuration, priceCategory, and source', async () => {
      const termWith24CharIds = {
        id: 204,
        catalogueGroup: 'Group1',
        territory: 'a'.repeat(24),
        channel: 'b'.repeat(24),
        configuration: 'c'.repeat(24),
        priceCategory: 'd'.repeat(24),
        source: 'e'.repeat(24)
      };

      mockContract.deductionsTerms = [termWith24CharIds];

      const result = await SeparatedDeductionTerms.get(mockContract);

      // Verify all the 24-character ID lookups were performed
      expect(TerritoryGroup.findOne).toHaveBeenCalledWith({ _id: 'a'.repeat(24) });
      expect(ContractTermGroup.findById).toHaveBeenCalledWith('b'.repeat(24));
      expect(ContractTermGroup.findById).toHaveBeenCalledWith('c'.repeat(24));
      expect(ContractTermGroup.findById).toHaveBeenCalledWith('d'.repeat(24));
      expect(ContractTermGroup.findById).toHaveBeenCalledWith('e'.repeat(24));

      expect(result).toHaveLength(1);
    });

    it('should not process terms with non-24-character IDs for territory, channel, configuration, priceCategory, and source', async () => {
      const termWithNon24CharIds = {
        id: 205,
        catalogueGroup: 'Group1',
        territory: 'short',
        channel: 'short',
        configuration: 'short',
        priceCategory: 'short',
        source: 'short'
      };

      mockContract.deductionsTerms = [termWithNon24CharIds];

      const result = await SeparatedDeductionTerms.get(mockContract);

      // Verify the lookups were not performed for non-24-character IDs
      expect(TerritoryGroup.findOne).not.toHaveBeenCalled();
      expect(ContractTermGroup.findById).not.toHaveBeenCalled();

      expect(result).toHaveLength(1);
      expect(result[0].territory).toBe('short');
      expect(result[0].channel).toBe('short');
      expect(result[0].configuration).toBe('short');
      expect(result[0].priceCategory).toBe('short');
      expect(result[0].source).toBe('short');
    });

    it('should filter out terms with catalogue group but no associated catalogue items', async () => {
      // Mock empty results for catalogue lookups
      Release.find.mockResolvedValue([]);
      Track.find.mockResolvedValue([]);
      Work.find.mockResolvedValue([]);

      mockContract.deductionsTerms = [mockDeductionTerms[0]];

      const result = await SeparatedDeductionTerms.get(mockContract);

      // Verify the term was filtered out due to no catalogue items
      expect(result).toHaveLength(0);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Not adding term due to no catalogue associated with group')
      );
    });

    it('should include terms with catalogue group and some associated catalogue items', async () => {
      // Mock some results for catalogue lookups
      Release.find.mockResolvedValue(mockReleases);
      Track.find.mockResolvedValue([]);
      Work.find.mockResolvedValue([]);

      mockContract.deductionsTerms = [mockDeductionTerms[0]];

      const result = await SeparatedDeductionTerms.get(mockContract);

      // Verify the term was included because it has some catalogue items
      expect(result).toHaveLength(1);
      expect(result[0].releaseIds).toEqual(mockReleases.map(r => r._id.toString()));
      expect(result[0].trackIds).toEqual([]);
      expect(result[0].workIds).toEqual([]);
    });

    it('should handle null/undefined deduction terms', async () => {
      mockContract.deductionsTerms = [null, undefined, mockDeductionTerms[0]];

      const result = await SeparatedDeductionTerms.get(mockContract);

      // Verify only the valid term was processed
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockDeductionTerms[0].id);
    });

    it('should handle empty deduction terms array', async () => {
      mockContract.deductionsTerms = [];

      const result = await SeparatedDeductionTerms.get(mockContract);

      expect(result).toHaveLength(0);
    });

    it('should handle terms without catalogue group', async () => {
      const termWithoutCatalogueGroup = {
        id: 206,
        territory: testUtils.randomId(),
        channel: testUtils.randomId(),
        configuration: testUtils.randomId(),
        priceCategory: testUtils.randomId(),
        source: testUtils.randomId(),
        amount: 600
      };

      mockContract.deductionsTerms = [termWithoutCatalogueGroup];

      const result = await SeparatedDeductionTerms.get(mockContract);

      // Verify no catalogue lookups were performed
      expect(Release.find).not.toHaveBeenCalled();
      expect(Track.find).not.toHaveBeenCalled();
      expect(Work.find).not.toHaveBeenCalled();

      // Verify the term was included
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(termWithoutCatalogueGroup.id);
    });

    it('should process multiple deduction terms', async () => {
      mockContract.deductionsTerms = mockDeductionTerms;

      const result = await SeparatedDeductionTerms.get(mockContract);

      expect(result).toHaveLength(3);
      
      // Verify all terms were processed
      result.forEach((term, index) => {
        expect(term.id).toBe(mockDeductionTerms[index].id);
      });
    });

    it('should handle database errors gracefully', async () => {
      // Mock a database error
      Release.find.mockRejectedValue(new Error('Database connection failed'));

      mockContract.deductionsTerms = [mockDeductionTerms[0]];

      await expect(SeparatedDeductionTerms.get(mockContract)).rejects.toThrow('Database connection failed');
    });

    it('should handle territory group not found', async () => {
      TerritoryGroup.findOne.mockResolvedValue(null);

      mockContract.deductionsTerms = [mockDeductionTerms[0]];

      const result = await SeparatedDeductionTerms.get(mockContract);

      // Verify the term was still processed but territory wasn't transformed
      expect(result).toHaveLength(1);
      expect(result[0].territory).toBe(mockDeductionTerms[0].territory); // Original value preserved
    });

    it('should handle contract term group not found', async () => {
      ContractTermGroup.findById.mockResolvedValue(null);

      mockContract.deductionsTerms = [mockDeductionTerms[0]];

      const result = await SeparatedDeductionTerms.get(mockContract);

      // Verify the term was still processed but fields weren't transformed
      expect(result).toHaveLength(1);
      expect(result[0].channel).toBe(mockDeductionTerms[0].channel); // Original value preserved
      expect(result[0].configuration).toBe(mockDeductionTerms[0].configuration);
      expect(result[0].priceCategory).toBe(mockDeductionTerms[0].priceCategory);
      expect(result[0].source).toBe(mockDeductionTerms[0].source);
    });

    it('should handle terms with partial ObjectId fields', async () => {
      const termWithPartialIds = {
        id: 207,
        catalogueGroup: 'Group1',
        territory: testUtils.randomId(),
        // channel, configuration, priceCategory, source are missing
        amount: 700
      };

      mockContract.deductionsTerms = [termWithPartialIds];

      const result = await SeparatedDeductionTerms.get(mockContract);

      // Verify only territory lookup was performed
      expect(TerritoryGroup.findOne).toHaveBeenCalledTimes(1);
      expect(ContractTermGroup.findById).not.toHaveBeenCalled();

      expect(result).toHaveLength(1);
      expect(result[0].territory).toEqual(mockTerritoryGroup.territories);
    });

    it('should handle catalogue group filtering with mixed results', async () => {
      // Mock mixed results for catalogue lookups
      Release.find.mockResolvedValue([]);
      Track.find.mockResolvedValue(mockTracks);
      Work.find.mockResolvedValue([]);

      const termWithMixedCatalogue = {
        id: 208,
        catalogueGroup: 'MixedGroup',
        territory: testUtils.randomId(),
        amount: 800
      };

      mockContract.deductionsTerms = [termWithMixedCatalogue];

      const result = await SeparatedDeductionTerms.get(mockContract);

      // Verify the term was included because it has some catalogue items (tracks)
      expect(result).toHaveLength(1);
      expect(result[0].releaseIds).toEqual([]);
      expect(result[0].trackIds).toEqual(mockTracks.map(t => t._id.toString()));
      expect(result[0].workIds).toEqual([]);
    });

    it('should filter contract term group items correctly', async () => {
      // Mock contract term group with some falsy values
      const mockContractTermGroupWithFalsyValues = {
        _id: testUtils.randomId(),
        items: ['Item1', null, 'Item2', '', 'Item3', undefined, 'Item4']
      };

      ContractTermGroup.findById.mockResolvedValue(mockContractTermGroupWithFalsyValues);

      mockContract.deductionsTerms = [mockDeductionTerms[0]];

      const result = await SeparatedDeductionTerms.get(mockContract);

      // Verify falsy values are filtered out
      expect(result[0].channel).toEqual(['Item1', 'Item2', 'Item3', 'Item4']);
      expect(result[0].configuration).toEqual(['Item1', 'Item2', 'Item3', 'Item4']);
      expect(result[0].priceCategory).toEqual(['Item1', 'Item2', 'Item3', 'Item4']);
      expect(result[0].source).toEqual(['Item1', 'Item2', 'Item3', 'Item4']);
    });
  });
});
