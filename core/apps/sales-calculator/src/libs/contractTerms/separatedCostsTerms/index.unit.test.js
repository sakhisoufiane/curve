/* eslint-disable @typescript-eslint/no-var-requires */
const testUtils = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const SeparatedCostsTerms = require('./index');

// Mock all the required modules
jest.mock('../../../models/territoryGroup');
jest.mock('../../../models/contractTermGroup');

const TerritoryGroup = require('../../../models/territoryGroup');
const ContractTermGroup = require('../../../models/contractTermGroup');

describe('SeparatedCostsTerms', () => {
  let mockContract;
  let mockCostsTerms;
  let mockTerritoryGroup;
  let mockContractTermGroup;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock contract
    mockContract = {
      _id: testUtils.randomId(),
      clientId: testUtils.randomId(),
      costsTerms: []
    };

    // Setup mock costs terms
    mockCostsTerms = [
      {
        id: 101,
        territory: testUtils.randomId(),
        type: testUtils.randomId(),
        amount: 1000,
        description: testUtils.randomString(20)
      },
      {
        id: 102,
        territory: testUtils.randomId(),
        type: testUtils.randomId(),
        amount: 2000,
        description: testUtils.randomString(20)
      },
      {
        id: 103,
        territory: 'short',
        type: 'short',
        amount: 3000,
        description: testUtils.randomString(20)
      }
    ];

    // Setup mock territory group
    mockTerritoryGroup = {
      _id: testUtils.randomId(),
      territories: ['US', 'UK', 'CA', 'AU']
    };

    // Setup mock contract term group
    mockContractTermGroup = {
      _id: testUtils.randomId(),
      items: ['Production', 'Marketing', 'Distribution', 'Legal']
    };

    // Setup mock implementations
    TerritoryGroup.findOne.mockResolvedValue(mockTerritoryGroup);
    ContractTermGroup.findById.mockResolvedValue(mockContractTermGroup);
  });

  describe('get', () => {
    it('should process costs terms with 24-character ObjectIds', async () => {
      // Store original values before processing to avoid reference issues
      const originalTerritory = mockCostsTerms[0].territory;
      const originalType = mockCostsTerms[0].type;
      
      mockContract.costsTerms = [mockCostsTerms[0]];

      const result = await SeparatedCostsTerms.get(mockContract);

      // Verify TerritoryGroup.findOne was called
      expect(TerritoryGroup.findOne).toHaveBeenCalledWith({ _id: originalTerritory });

      // Verify ContractTermGroup.findById was called
      expect(ContractTermGroup.findById).toHaveBeenCalledWith(originalType);

      // Verify the result
      expect(result).toHaveLength(1);
      expect(result[0].territory).toEqual(mockTerritoryGroup.territories);
      expect(result[0].type).toEqual(mockContractTermGroup.items.filter(Boolean));
      expect(result[0].amount).toBe(mockCostsTerms[0].amount);
      expect(result[0].description).toBe(mockCostsTerms[0].description);
    });

    it('should handle terms with 24-character ObjectIds for territory and type', async () => {
      const termWith24CharIds = {
        id: 104,
        territory: 'a'.repeat(24),
        type: 'b'.repeat(24),
        amount: 4000,
        description: testUtils.randomString(20)
      };

      mockContract.costsTerms = [termWith24CharIds];

      const result = await SeparatedCostsTerms.get(mockContract);

      // Verify all the 24-character ID lookups were performed
      expect(TerritoryGroup.findOne).toHaveBeenCalledWith({ _id: 'a'.repeat(24) });
      expect(ContractTermGroup.findById).toHaveBeenCalledWith('b'.repeat(24));

      expect(result).toHaveLength(1);
      expect(result[0].territory).toEqual(mockTerritoryGroup.territories);
      expect(result[0].type).toEqual(mockContractTermGroup.items.filter(Boolean));
    });

    it('should not process terms with non-24-character IDs', async () => {
      mockContract.costsTerms = [mockCostsTerms[2]]; // This has 'short' IDs

      const result = await SeparatedCostsTerms.get(mockContract);

      // Verify the lookups were not performed for non-24-character IDs
      expect(TerritoryGroup.findOne).not.toHaveBeenCalled();
      expect(ContractTermGroup.findById).not.toHaveBeenCalled();

      expect(result).toHaveLength(1);
      expect(result[0].territory).toBe('short');
      expect(result[0].type).toBe('short');
    });

    it('should handle null/undefined costs terms', async () => {
      mockContract.costsTerms = [null, undefined, mockCostsTerms[0]];

      const result = await SeparatedCostsTerms.get(mockContract);

      // Verify only the valid term was processed
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockCostsTerms[0].id);
    });

    it('should handle empty costs terms array', async () => {
      mockContract.costsTerms = [];

      const result = await SeparatedCostsTerms.get(mockContract);

      expect(result).toHaveLength(0);
    });

    it('should handle terms without territory or type', async () => {
      const termWithoutIds = {
        id: 105,
        amount: 5000,
        description: testUtils.randomString(20)
      };

      mockContract.costsTerms = [termWithoutIds];

      const result = await SeparatedCostsTerms.get(mockContract);

      // Verify no lookups were performed
      expect(TerritoryGroup.findOne).not.toHaveBeenCalled();
      expect(ContractTermGroup.findById).not.toHaveBeenCalled();

      // Verify the term was included
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(termWithoutIds.id);
    });

    it('should process multiple costs terms', async () => {
      mockContract.costsTerms = mockCostsTerms;

      const result = await SeparatedCostsTerms.get(mockContract);

      expect(result).toHaveLength(3);
      
      // Verify all terms were processed
      result.forEach((term, index) => {
        expect(term.id).toBe(mockCostsTerms[index].id);
      });

      // Verify lookups were called for 24-character IDs only (first two terms)
      expect(TerritoryGroup.findOne).toHaveBeenCalledTimes(2);
      expect(ContractTermGroup.findById).toHaveBeenCalledTimes(2);
    });

    it('should handle database errors gracefully', async () => {
      // Mock a database error
      TerritoryGroup.findOne.mockRejectedValue(new Error('Database connection failed'));

      mockContract.costsTerms = [mockCostsTerms[0]];

      await expect(SeparatedCostsTerms.get(mockContract)).rejects.toThrow('Database connection failed');
    });

    it('should handle territory group not found', async () => {
      TerritoryGroup.findOne.mockResolvedValue(null);

      mockContract.costsTerms = [mockCostsTerms[0]];

      const result = await SeparatedCostsTerms.get(mockContract);

      // Verify the term was still processed but territory wasn't transformed
      expect(result).toHaveLength(1);
      expect(result[0].territory).toBe(mockCostsTerms[0].territory); // Original value preserved
    });

    it('should handle contract term group not found', async () => {
      ContractTermGroup.findById.mockResolvedValue(null);

      mockContract.costsTerms = [mockCostsTerms[0]];

      const result = await SeparatedCostsTerms.get(mockContract);

      // Verify the term was still processed but type wasn't transformed
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(mockCostsTerms[0].type); // Original value preserved
    });

    it('should handle terms with only territory ObjectId', async () => {
      const termWithOnlyTerritory = {
        id: 106,
        territory: testUtils.randomId(),
        amount: 6000,
        description: testUtils.randomString(20)
      };

      // Store original territory before processing
      const originalTerritory = termWithOnlyTerritory.territory;
      
      mockContract.costsTerms = [termWithOnlyTerritory];

      const result = await SeparatedCostsTerms.get(mockContract);

      // Verify only territory lookup was performed
      expect(TerritoryGroup.findOne).toHaveBeenCalledWith({ _id: originalTerritory });
      expect(ContractTermGroup.findById).not.toHaveBeenCalled();

      expect(result).toHaveLength(1);
      expect(result[0].territory).toEqual(mockTerritoryGroup.territories);
    });

    it('should handle terms with only type ObjectId', async () => {
      const termWithOnlyType = {
        id: 107,
        type: testUtils.randomId(),
        amount: 7000,
        description: testUtils.randomString(20)
      };

      // Store original type before processing
      const originalType = termWithOnlyType.type;
      
      mockContract.costsTerms = [termWithOnlyType];

      const result = await SeparatedCostsTerms.get(mockContract);

      // Verify only type lookup was performed
      expect(TerritoryGroup.findOne).not.toHaveBeenCalled();
      expect(ContractTermGroup.findById).toHaveBeenCalledWith(originalType);

      expect(result).toHaveLength(1);
      expect(result[0].type).toEqual(mockContractTermGroup.items.filter(Boolean));
    });

    it('should filter contract term group items correctly', async () => {
      // Mock contract term group with some falsy values
      const mockContractTermGroupWithFalsyValues = {
        _id: testUtils.randomId(),
        items: ['Production', null, 'Marketing', '', 'Distribution', undefined, 'Legal']
      };

      ContractTermGroup.findById.mockResolvedValue(mockContractTermGroupWithFalsyValues);

      mockContract.costsTerms = [mockCostsTerms[0]];

      const result = await SeparatedCostsTerms.get(mockContract);

      // Verify falsy values are filtered out
      expect(result[0].type).toEqual(['Production', 'Marketing', 'Distribution', 'Legal']);
    });
  });
});
