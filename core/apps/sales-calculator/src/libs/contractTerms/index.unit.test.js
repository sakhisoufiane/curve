/* eslint-disable @typescript-eslint/no-var-requires */
const testUtils = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const ContractTerms = require('./index');
const SeparatedSalesTerms = require('./separatedSalesTerms/index.js');
const SeparatedMechanicalTerms = require('./separatedMechanicalTerms/index.js');
const SeparatedMechanicalContractTerms = require('./separatedMechanicalContractTerms/index.js');
const SeparatedCostsTerms = require('./separatedCostsTerms/index.js');
const SeparatedDeductionTerms = require('./separatedDeductionTerms/index.js');
const SeperatedWithholdingTaxTerms = require('./separatedWithholdingTaxTerms/index.js');

// Mock all the required modules
jest.mock('./separatedSalesTerms/index.js');
jest.mock('./separatedMechanicalTerms/index.js');
jest.mock('./separatedMechanicalContractTerms/index.js');
jest.mock('./separatedCostsTerms/index.js');
jest.mock('./separatedDeductionTerms/index.js');
jest.mock('./separatedWithholdingTaxTerms/index.js');

describe('ContractTerms', () => {
  let mockContract;
  let mockDeductionTerms;
  let mockSalesTerms;
  let mockMechanicalTerms;
  let mockWithholdingTaxTerms;
  let mockCostsTerms;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock contract
    mockContract = {
      _id: testUtils.randomId(),
      name: testUtils.randomString(15),
      partitionNo: testUtils.randomInt(),
      contractType: 'Sales',
      currency: 'USD',
      active: true,
      accountingPeriod: '2024'
    };

    // Setup mock terms data
    mockDeductionTerms = [
      { id: 1, catType: 'Release', amount: 100 },
      { id: 2, catType: 'Track', amount: 200 },
      { id: 3, catType: 'Other', amount: 300 },
      { id: 4, catType: '', amount: 400 },
      { id: 5, amount: 500 }
    ];

    mockSalesTerms = [
      { id: 10, catType: 'Release', amount: 1000 },
      { id: 11, catType: 'Track', amount: 2000 },
      { id: 12, catType: 'Work', amount: 3000 },
      { id: 13, catType: 'Contract', amount: 4000 },
      { id: 14, catType: 'All', amount: 5000 },
      { id: 15, catType: 'Other', amount: 6000 },
      { id: 16, catType: '', amount: 7000 },
      { id: 17, amount: 8000 }
    ];

    mockMechanicalTerms = [
      { id: 20, catType: 'Release', amount: 100 },
      { id: 21, catType: 'Track', amount: 200 },
      { id: 22, catType: 'Other', amount: 300 }
    ];

    mockWithholdingTaxTerms = [
      { id: testUtils.randomInt(), taxRate: testUtils.randomFloat(), amount: testUtils.randomInt() * 100 }
    ];

    mockCostsTerms = [
      { id: testUtils.randomInt(), costType: testUtils.randomString(10), amount: testUtils.randomInt() * 1000 },
      { id: testUtils.randomInt(), costType: testUtils.randomString(10), amount: testUtils.randomInt() * 1000 }
    ];

    // Setup mock implementations
    SeparatedDeductionTerms.get.mockResolvedValue(mockDeductionTerms);
    SeparatedSalesTerms.get.mockResolvedValue(mockSalesTerms);
    SeparatedMechanicalContractTerms.get.mockResolvedValue(mockSalesTerms);
    SeparatedMechanicalTerms.get.mockResolvedValue(mockMechanicalTerms);
    SeperatedWithholdingTaxTerms.get.mockResolvedValue(mockWithholdingTaxTerms);
    SeparatedCostsTerms.get.mockResolvedValue(mockCostsTerms);
  });

  describe('forCalcualtion', () => {
    it('should process Sales contract type correctly', async () => {
      const result = await ContractTerms.forCalcualtion(mockContract);

      expect(SeparatedDeductionTerms.get).toHaveBeenCalledWith(mockContract);
      expect(SeparatedSalesTerms.get).toHaveBeenCalledWith(mockContract);
      expect(SeparatedMechanicalContractTerms.get).not.toHaveBeenCalled();
      expect(SeperatedWithholdingTaxTerms.get).toHaveBeenCalledWith(mockContract);
      expect(SeparatedMechanicalTerms.get).toHaveBeenCalledWith(mockContract);

      expect(result).toEqual({
        contractId: mockContract._id,
        name: mockContract.name,
        partitionNo: mockContract.partitionNo,
        terms: {
          contractCurrency: 'USD',
          sales: mockSalesTerms.filter(term => ['Release', 'Track', 'Work', 'Contract', 'All', ''].includes(term.catType) || !term.catType),
          deductions: mockDeductionTerms.filter(term => ['Release', 'Track', 'Work', 'Contract', 'All', ''].includes(term.catType) || !term.catType),
          withholdingTaxes: mockWithholdingTaxTerms,
          mechanicalContracts: mockMechanicalTerms.filter(term => ['Release', 'Track', 'Work', 'Contract', 'All', ''].includes(term.catType) || !term.catType),
          mechanicalAmount: 0
        }
      });
    });

    it('should process Mechanical contract type correctly', async () => {
      mockContract.contractType = 'Mechanical';

      const result = await ContractTerms.forCalcualtion(mockContract);

      expect(SeparatedMechanicalContractTerms.get).toHaveBeenCalledWith(mockContract);
      expect(SeparatedSalesTerms.get).not.toHaveBeenCalled();

      expect(result.terms.sales).toEqual(
        mockSalesTerms.filter(term => ['Release', 'Track', 'Work', 'Contract', 'All', ''].includes(term.catType) || !term.catType)
      );
    });

    it('should filter out terms with invalid catType', async () => {
      const result = await ContractTerms.forCalcualtion(mockContract);

      // Check that terms with catType 'Other' are filtered out
      const salesTermIds = result.terms.sales.map((term) => term.id);
      const salesTermsWithOther = mockSalesTerms.filter(term => term.catType === 'Other');
      salesTermsWithOther.forEach(term => {
        expect(salesTermIds).not.toContain(term.id);
      });

      const deductionTermIds = result.terms.deductions.map((term) => term.id);
      const deductionTermsWithOther = mockDeductionTerms.filter(term => term.catType === 'Other');
      deductionTermsWithOther.forEach(term => {
        expect(deductionTermIds).not.toContain(term.id);
      });

      const mechanicalTermIds = result.terms.mechanicalContracts.map((term) => term.id);
      const mechanicalTermsWithOther = mockMechanicalTerms.filter(term => term.catType === 'Other');
      mechanicalTermsWithOther.forEach(term => {
        expect(mechanicalTermIds).not.toContain(term.id);
      });
    });

    it('should handle terms with undefined catType', async () => {
      const result = await ContractTerms.forCalcualtion(mockContract);

      // Check that terms with undefined catType are included
      const salesTermIds = result.terms.sales.map((term) => term.id);
      const salesTermsWithoutCatType = mockSalesTerms.filter(term => !term.catType);
      salesTermsWithoutCatType.forEach(term => {
        expect(salesTermIds).toContain(term.id);
      });

      const deductionTermIds = result.terms.deductions.map((term) => term.id);
      const deductionTermsWithoutCatType = mockDeductionTerms.filter(term => !term.catType);
      deductionTermsWithoutCatType.forEach(term => {
        expect(deductionTermIds).toContain(term.id);
      });
    });

    it('should handle empty terms arrays', async () => {
      SeparatedDeductionTerms.get.mockResolvedValue([]);
      SeparatedSalesTerms.get.mockResolvedValue([]);
      SeparatedMechanicalTerms.get.mockResolvedValue([]);
      SeperatedWithholdingTaxTerms.get.mockResolvedValue([]);

      const result = await ContractTerms.forCalcualtion(mockContract);

      expect(result.terms.sales).toEqual([]);
      expect(result.terms.deductions).toEqual([]);
      expect(result.terms.mechanicalContracts).toEqual([]);
      expect(result.terms.withholdingTaxes).toEqual([]);
    });

    it('should handle contract with ObjectId that needs toString()', async () => {
      const mockObjectId = { toString: jest.fn().mockReturnValue(testUtils.randomId()) };
      mockContract._id = mockObjectId;

      const result = await ContractTerms.forCalcualtion(mockContract);

      expect(mockObjectId.toString).toHaveBeenCalled();
      expect(result.contractId).toBe(mockObjectId.toString());
    });
  });

  describe('forCostsCalculation', () => {
    it('should return costs data for active contract with matching accounting period', async () => {
      // Ensure the contract has the right conditions
      mockContract.active = true;
      mockContract.accountingPeriod = '2024';
      
      const result = await ContractTerms.forCostsCalculation(mockContract, '2024');

      expect(SeparatedCostsTerms.get).toHaveBeenCalledWith(mockContract);
      expect(result).toEqual([{
        objectPercentage: 100,
        contractId: mockContract._id,
        name: mockContract.name,
        contractCurrency: 'USD',
        terms: mockCostsTerms
      }]);
    });

    it('should return undefined for inactive contract', async () => {
      mockContract.active = false;

      const result = await ContractTerms.forCostsCalculation(mockContract, '2024');

      expect(SeparatedCostsTerms.get).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should return undefined when contract is active but accounting period does not match', async () => {
      mockContract.active = true;
      mockContract.accountingPeriod = '2024';

      const result = await ContractTerms.forCostsCalculation(mockContract, '2023');

      expect(SeparatedCostsTerms.get).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should return undefined for contract with non-matching accounting period', async () => {
      // Ensure contract is active but has different accounting period
      mockContract.active = true;
      mockContract.accountingPeriod = '2024';

      const result = await ContractTerms.forCostsCalculation(mockContract, '2023');

      expect(SeparatedCostsTerms.get).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle contract with ObjectId that needs toString()', async () => {
      const mockObjectId = { toString: jest.fn().mockReturnValue(testUtils.randomId()) };
      mockContract._id = mockObjectId;
      
      // Ensure the contract has the right conditions
      mockContract.active = true;
      mockContract.accountingPeriod = '2024';

      const result = await ContractTerms.forCostsCalculation(mockContract, '2024');

      expect(mockObjectId.toString).toHaveBeenCalled();
      expect(result[0].contractId).toBe(mockObjectId.toString());
    });
  });

  describe('error handling', () => {
    it('should handle errors in forCalcualtion gracefully', async () => {
      SeparatedDeductionTerms.get.mockRejectedValue(new Error('Database error'));

      await expect(ContractTerms.forCalcualtion(mockContract)).rejects.toThrow('Database error');
    });

    it('should handle errors in forCostsCalculation gracefully', async () => {
      // Mock the function to reject when called
      SeparatedCostsTerms.get.mockRejectedValue(new Error('Costs calculation error'));

      // The method should call SeparatedCostsTerms.get and then reject
      await expect(ContractTerms.forCostsCalculation(mockContract, '2024')).rejects.toThrow('Costs calculation error');
      
      // Verify the mock was called
      expect(SeparatedCostsTerms.get).toHaveBeenCalledWith(mockContract);
    });
  });
}); 