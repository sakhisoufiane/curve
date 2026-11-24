/* eslint-disable @typescript-eslint/no-var-requires */
const testUtils = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const SeparatedWithholdingTaxTerms = require('./index');

// Mock all the required modules
jest.mock('../../../models/release.js');
jest.mock('../../../models/track.js');
jest.mock('../../../models/work.js');
jest.mock('../../../models/territoryGroup.js');
jest.mock('../../../models/contractTermGroup.js');
jest.mock('@curveroyaltysystems/platform-shared-utils', () => ({
  logger: {
    info: jest.fn()
  },
  testUtils: require('@curveroyaltysystems/platform-shared-utils/libs/testUtils')
}));

const Release = require('../../../models/release.js');
const Track = require('../../../models/track.js');
const Work = require('../../../models/work.js');
const TerritoryGroup = require('../../../models/territoryGroup.js');
const ContractTermGroup = require('../../../models/contractTermGroup.js');

describe('SeparatedWithholdingTaxTerms', () => {
  let mockContract;
  let mockWithholdingTaxTerms;
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
      withholdingTaxTerms: []
    };

    // Setup mock withholding tax terms
    mockWithholdingTaxTerms = [
      {
        id: testUtils.randomInt(),
        catalogueGroup: 'Group1',
        territory: testUtils.randomId(),
        channel: testUtils.randomId(),
        configuration: testUtils.randomId(),
        priceCategory: testUtils.randomId(),
        source: testUtils.randomId(),
        rate: testUtils.randomFloat(),
        amount: testUtils.randomInt() * 100
      },
      {
        id: testUtils.randomInt(),
        catalogueGroup: 'All',
        territory: testUtils.randomId(),
        channel: testUtils.randomId(),
        configuration: testUtils.randomId(),
        priceCategory: testUtils.randomId(),
        source: testUtils.randomId(),
        rate: testUtils.randomFloat(),
        amount: testUtils.randomInt() * 100
      },
      {
        id: testUtils.randomInt(),
        catalogueGroup: 'Group2',
        territory: testUtils.randomId(),
        channel: testUtils.randomId(),
        configuration: testUtils.randomId(),
        priceCategory: testUtils.randomId(),
        source: testUtils.randomId(),
        rate: testUtils.randomFloat(),
        amount: testUtils.randomInt() * 100
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
    it('should process withholding tax terms with catalogue groups', async () => {
      // Store original values before processing to avoid reference issues
      const originalTerritory = mockWithholdingTaxTerms[0].territory;
      const originalChannel = mockWithholdingTaxTerms[0].channel;
      const originalConfiguration = mockWithholdingTaxTerms[0].configuration;
      const originalPriceCategory = mockWithholdingTaxTerms[0].priceCategory;
      const originalSource = mockWithholdingTaxTerms[0].source;
      
      mockContract.withholdingTaxTerms = [mockWithholdingTaxTerms[0]];

      const result = await SeparatedWithholdingTaxTerms.get(mockContract);

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

    it('should process withholding tax terms with "All" catalogue group', async () => {
      mockContract.withholdingTaxTerms = [mockWithholdingTaxTerms[1]];

      const result = await SeparatedWithholdingTaxTerms.get(mockContract);

      // Verify the result includes the term with "All" catalogue group
      expect(result).toHaveLength(1);
      expect(result[0].catalogueGroup).toBe('All');
      expect(result[0].rate).toBe(mockWithholdingTaxTerms[1].rate);
    });

    it('should handle terms with 24-character ObjectIds for territory, channel, configuration, priceCategory, and source', async () => {
      const termWith24CharIds = {
        id: testUtils.randomInt(),
        catalogueGroup: 'Group1',
        territory: 'a'.repeat(24),
        channel: 'b'.repeat(24),
        configuration: 'c'.repeat(24),
        priceCategory: 'd'.repeat(24),
        source: 'e'.repeat(24),
        rate: testUtils.randomFloat()
      };

      mockContract.withholdingTaxTerms = [termWith24CharIds];

      const result = await SeparatedWithholdingTaxTerms.get(mockContract);

      // Verify all the 24-character ID lookups were performed
      expect(TerritoryGroup.findOne).toHaveBeenCalledWith({ _id: 'a'.repeat(24) });
      expect(ContractTermGroup.findById).toHaveBeenCalledWith('b'.repeat(24));
      expect(ContractTermGroup.findById).toHaveBeenCalledWith('c'.repeat(24));
      expect(ContractTermGroup.findById).toHaveBeenCalledWith('d'.repeat(24));
      expect(ContractTermGroup.findById).toHaveBeenCalledWith('e'.repeat(24));

      expect(result).toHaveLength(1);
      expect(result[0].rate).toBe(termWith24CharIds.rate);
    });

    it('should not process terms with non-24-character IDs for territory, channel, configuration, priceCategory, and source', async () => {
      const termWithNon24CharIds = {
        id: testUtils.randomInt(),
        catalogueGroup: 'Group1',
        territory: 'short',
        channel: 'short',
        configuration: 'short',
        priceCategory: 'short',
        source: 'short',
        rate: testUtils.randomFloat()
      };

      mockContract.withholdingTaxTerms = [termWithNon24CharIds];

      const result = await SeparatedWithholdingTaxTerms.get(mockContract);

      // Verify the lookups were not performed for non-24-character IDs
      expect(TerritoryGroup.findOne).not.toHaveBeenCalled();
      expect(ContractTermGroup.findById).not.toHaveBeenCalled();

      expect(result).toHaveLength(1);
      expect(result[0].territory).toBe('short');
      expect(result[0].channel).toBe('short');
      expect(result[0].configuration).toBe('short');
      expect(result[0].priceCategory).toBe('short');
      expect(result[0].source).toBe('short');
      expect(result[0].rate).toBe(termWithNon24CharIds.rate);
    });

    it('should filter out terms with catalogue group but no associated catalogue items', async () => {
      // Mock empty results for catalogue lookups
      Release.find.mockResolvedValue([]);
      Track.find.mockResolvedValue([]);
      Work.find.mockResolvedValue([]);

      mockContract.withholdingTaxTerms = [mockWithholdingTaxTerms[0]];

      const result = await SeparatedWithholdingTaxTerms.get(mockContract);

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

      mockContract.withholdingTaxTerms = [mockWithholdingTaxTerms[0]];

      const result = await SeparatedWithholdingTaxTerms.get(mockContract);

      // Verify the term was included because it has some catalogue items
      expect(result).toHaveLength(1);
      expect(result[0].releaseIds).toEqual(mockReleases.map(r => r._id.toString()));
      expect(result[0].trackIds).toEqual([]);
      expect(result[0].workIds).toEqual([]);
      expect(result[0].rate).toBe(mockWithholdingTaxTerms[0].rate);
    });

    it('should handle null/undefined withholding tax terms', async () => {
      mockContract.withholdingTaxTerms = [null, undefined, mockWithholdingTaxTerms[0]];

      const result = await SeparatedWithholdingTaxTerms.get(mockContract);

      // Verify only the valid term was processed
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockWithholdingTaxTerms[0].id);
      expect(result[0].rate).toBe(mockWithholdingTaxTerms[0].rate);
    });

    it('should handle empty withholding tax terms array', async () => {
      mockContract.withholdingTaxTerms = [];

      const result = await SeparatedWithholdingTaxTerms.get(mockContract);

      expect(result).toHaveLength(0);
    });

    it('should handle terms without catalogue group', async () => {
      const termWithoutCatalogueGroup = {
        id: testUtils.randomInt(),
        territory: testUtils.randomId(),
        channel: testUtils.randomId(),
        configuration: testUtils.randomId(),
        priceCategory: testUtils.randomId(),
        source: testUtils.randomId(),
        rate: testUtils.randomFloat(),
        amount: testUtils.randomInt() * 100
      };

      mockContract.withholdingTaxTerms = [termWithoutCatalogueGroup];

      const result = await SeparatedWithholdingTaxTerms.get(mockContract);

      // Verify no catalogue lookups were performed
      expect(Release.find).not.toHaveBeenCalled();
      expect(Track.find).not.toHaveBeenCalled();
      expect(Work.find).not.toHaveBeenCalled();

      // Verify the term was included
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(termWithoutCatalogueGroup.id);
      expect(result[0].rate).toBe(termWithoutCatalogueGroup.rate);
    });

    it('should process multiple withholding tax terms', async () => {
      mockContract.withholdingTaxTerms = mockWithholdingTaxTerms;

      const result = await SeparatedWithholdingTaxTerms.get(mockContract);

      expect(result).toHaveLength(3);
      
      // Verify all terms were processed
      result.forEach((term, index) => {
        expect(term.id).toBe(mockWithholdingTaxTerms[index].id);
        expect(term.rate).toBe(mockWithholdingTaxTerms[index].rate);
      });
    });

    it('should handle database errors gracefully', async () => {
      // Mock a database error
      Release.find.mockRejectedValue(new Error('Database connection failed'));

      mockContract.withholdingTaxTerms = [mockWithholdingTaxTerms[0]];

      await expect(SeparatedWithholdingTaxTerms.get(mockContract)).rejects.toThrow('Database connection failed');
    });

    it('should handle territory group not found', async () => {
      TerritoryGroup.findOne.mockResolvedValue(null);

      mockContract.withholdingTaxTerms = [mockWithholdingTaxTerms[0]];

      const result = await SeparatedWithholdingTaxTerms.get(mockContract);

      // Verify the term was still processed but territory wasn't transformed
      expect(result).toHaveLength(1);
      expect(result[0].territory).toBe(mockWithholdingTaxTerms[0].territory); // Original value preserved
      expect(result[0].rate).toBe(mockWithholdingTaxTerms[0].rate);
    });

    it('should handle contract term group not found', async () => {
      ContractTermGroup.findById.mockResolvedValue(null);

      mockContract.withholdingTaxTerms = [mockWithholdingTaxTerms[0]];

      const result = await SeparatedWithholdingTaxTerms.get(mockContract);

      // Verify the term was still processed but fields weren't transformed
      expect(result).toHaveLength(1);
      expect(result[0].channel).toBe(mockWithholdingTaxTerms[0].channel); // Original value preserved
      expect(result[0].configuration).toBe(mockWithholdingTaxTerms[0].configuration);
      expect(result[0].priceCategory).toBe(mockWithholdingTaxTerms[0].priceCategory);
      expect(result[0].source).toBe(mockWithholdingTaxTerms[0].source);
      expect(result[0].rate).toBe(mockWithholdingTaxTerms[0].rate);
    });

    it('should handle terms with partial ObjectId fields', async () => {
      const termWithPartialIds = {
        id: testUtils.randomInt(),
        catalogueGroup: 'Group1',
        territory: testUtils.randomId(),
        // channel, configuration, priceCategory, source are missing
        rate: testUtils.randomFloat(),
        amount: testUtils.randomInt() * 100
      };

      mockContract.withholdingTaxTerms = [termWithPartialIds];

      const result = await SeparatedWithholdingTaxTerms.get(mockContract);

      // Verify only territory lookup was performed
      expect(TerritoryGroup.findOne).toHaveBeenCalledTimes(1);
      expect(ContractTermGroup.findById).not.toHaveBeenCalled();

      expect(result).toHaveLength(1);
      expect(result[0].territory).toEqual(mockTerritoryGroup.territories);
      expect(result[0].rate).toBe(termWithPartialIds.rate);
    });

    it('should handle catalogue group filtering with mixed results', async () => {
      // Mock mixed results for catalogue lookups
      Release.find.mockResolvedValue([]);
      Track.find.mockResolvedValue(mockTracks);
      Work.find.mockResolvedValue([]);

      const termWithMixedCatalogue = {
        id: testUtils.randomInt(),
        catalogueGroup: 'MixedGroup',
        territory: testUtils.randomId(),
        rate: testUtils.randomFloat(),
        amount: testUtils.randomInt() * 100
      };

      mockContract.withholdingTaxTerms = [termWithMixedCatalogue];

      const result = await SeparatedWithholdingTaxTerms.get(mockContract);

      // Verify the term was included because it has some catalogue items (tracks)
      expect(result).toHaveLength(1);
      expect(result[0].releaseIds).toEqual([]);
      expect(result[0].trackIds).toEqual(mockTracks.map(t => t._id.toString()));
      expect(result[0].workIds).toEqual([]);
      expect(result[0].rate).toBe(termWithMixedCatalogue.rate);
    });

    it('should filter contract term group items correctly', async () => {
      // Mock contract term group with some falsy values
      const mockContractTermGroupWithFalsyValues = {
        _id: testUtils.randomId(),
        items: ['Item1', null, 'Item2', '', 'Item3', undefined, 'Item4']
      };

      ContractTermGroup.findById.mockResolvedValue(mockContractTermGroupWithFalsyValues);

      mockContract.withholdingTaxTerms = [mockWithholdingTaxTerms[0]];

      const result = await SeparatedWithholdingTaxTerms.get(mockContract);

      // Verify falsy values are filtered out
      expect(result[0].channel).toEqual(['Item1', 'Item2', 'Item3', 'Item4']);
      expect(result[0].configuration).toEqual(['Item1', 'Item2', 'Item3', 'Item4']);
      expect(result[0].priceCategory).toEqual(['Item1', 'Item2', 'Item3', 'Item4']);
      expect(result[0].source).toEqual(['Item1', 'Item2', 'Item3', 'Item4']);
      expect(result[0].rate).toBe(mockWithholdingTaxTerms[0].rate);
    });

    it('should handle withholding tax terms array property correctly', async () => {
      // Test that the module correctly accesses contract.withholdingTaxTerms
      mockContract.salesTerms = mockWithholdingTaxTerms; // Wrong property
      mockContract.withholdingTaxTerms = [mockWithholdingTaxTerms[0]]; // Correct property

      const result = await SeparatedWithholdingTaxTerms.get(mockContract);

      // Should only process the term from withholdingTaxTerms, not salesTerms
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockWithholdingTaxTerms[0].id);
      expect(result[0].rate).toBe(mockWithholdingTaxTerms[0].rate);
    });

    it('should not set reserve basis (unique characteristic)', async () => {
      // Unlike other modules, withholding tax terms don't get reserve basis
      mockContract.reserveBasis = testUtils.randomString(10);
      mockContract.withholdingTaxTerms = [mockWithholdingTaxTerms[0]];

      const result = await SeparatedWithholdingTaxTerms.get(mockContract);

      // Verify the term doesn't have reserve basis set
      expect(result).toHaveLength(1);
      expect(result[0].reserveBasis).toBeUndefined();
      expect(result[0].rate).toBe(mockWithholdingTaxTerms[0].rate);
    });

    it('should handle works catalogue lookup correctly', async () => {
      // Test the works lookup specifically (line 28-31)
      const termWithCatalogueGroup = {
        id: testUtils.randomInt(),
        catalogueGroup: 'WorksGroup',
        rate: testUtils.randomFloat(),
        amount: testUtils.randomInt() * 100
      };

      mockContract.withholdingTaxTerms = [termWithCatalogueGroup];

      const result = await SeparatedWithholdingTaxTerms.get(mockContract);

      // Verify Work.find was called with correct parameters
      expect(Work.find).toHaveBeenCalledWith(
        { clientId: mockContract.clientId, catalogueGroups: 'WorksGroup' },
        { _id: 1 }
      );

      expect(result).toHaveLength(1);
      expect(result[0].workIds).toEqual(mockWorks.map(w => w._id.toString()));
      expect(result[0].rate).toBe(termWithCatalogueGroup.rate);
    });

    it('should use TerritoryGroup.findOne for territory lookup', async () => {
      // Test that it uses findOne (not findById) for territory lookup
      const termWithTerritory = {
        id: testUtils.randomInt(),
        catalogueGroup: 'Group1',
        territory: testUtils.randomId(),
        rate: testUtils.randomFloat()
      };

      // Store original territory before processing
      const originalTerritory = termWithTerritory.territory;

      mockContract.withholdingTaxTerms = [termWithTerritory];

      await SeparatedWithholdingTaxTerms.get(mockContract);

      // Verify TerritoryGroup.findOne was called (not findById)
      expect(TerritoryGroup.findOne).toHaveBeenCalledWith({ _id: originalTerritory });
    });

    it('should preserve withholding tax specific properties', async () => {
      // Test that withholding tax specific properties are preserved
      const withholdingTaxTerm = {
        id: testUtils.randomInt(),
        catalogueGroup: 'Group1',
        rate: testUtils.randomFloat(),
        threshold: testUtils.randomInt() * 1000,
        exemptionCode: testUtils.randomString(5),
        taxYear: 2024,
        amount: testUtils.randomInt() * 100
      };

      mockContract.withholdingTaxTerms = [withholdingTaxTerm];

      const result = await SeparatedWithholdingTaxTerms.get(mockContract);

      // Verify withholding tax specific properties are preserved
      expect(result).toHaveLength(1);
      expect(result[0].rate).toBe(withholdingTaxTerm.rate);
      expect(result[0].threshold).toBe(withholdingTaxTerm.threshold);
      expect(result[0].exemptionCode).toBe(withholdingTaxTerm.exemptionCode);
      expect(result[0].taxYear).toBe(withholdingTaxTerm.taxYear);
      expect(result[0].amount).toBe(withholdingTaxTerm.amount);
    });

    it('should handle empty catalogue group arrays correctly', async () => {
      // Test with empty arrays returned from catalogue lookups
      Release.find.mockResolvedValue([]);
      Track.find.mockResolvedValue([]);
      Work.find.mockResolvedValue([]);

      const termWithEmptyCatalogue = {
        id: testUtils.randomInt(),
        catalogueGroup: 'EmptyGroup',
        rate: testUtils.randomFloat()
      };

      mockContract.withholdingTaxTerms = [termWithEmptyCatalogue];

      const result = await SeparatedWithholdingTaxTerms.get(mockContract);

      // Verify term is filtered out and logged
      expect(result).toHaveLength(0);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Not adding term due to no catalogue associated with group')
      );
    });
  });
});
