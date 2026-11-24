const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const Contract = require('./contract');
const Client = require('./client');

describe('Contract Model Tests', () => {
  let client;

  describe('validateSubclientRestrictions', () => {
    let baseContractData;

    beforeEach(() => {
      client = new Client({
        name: randomString(),
        createdBigQueryTables: true,
        createdBigQueryBackups: true,
      });
      baseContractData = {
        clientId: client._id,
        name: randomString(),
        minPayout: 100,
        autoPayment: true,
        accountingPeriod: 'monthly',
        active: true,
        crossContracts: false,
        deductWithholding: true,
        autoPaymentConditions: [{ condition: 'Balance Is Positive' }],
        currentBalance: 1000,
        openingBalance: 500,
        payees: [
          { payeeId: new mongoose.Types.ObjectId(), share: 50 },
          { payeeId: new mongoose.Types.ObjectId(), share: 50 },
        ],
        salesTerms: [{ territory: 'US', rate: 0.15 }],
        mechanicalTerms: [{ territory: 'US', rate: 0.10 }],
        mechanicalContractTerms: [{ territory: 'US', rate: 0.08 }],
        withholdingTaxTerms: [{ territory: 'US', rate: 0.05 }],
        costsTerms: [{ type: 'recording', rate: 0.20 }],
        deductionsTerms: [{ type: 'marketing', rate: 0.10 }],
        reserves: [{ contractName: 'contract-1', rate: 1000 }],
      };
    });

    describe('when no existing contract is provided', () => {
      it('should return empty array', () => {
        const contract = new Contract(baseContractData);
        const errors = contract.validateSubclientRestrictions(null);
        expect(errors).toEqual([]);
      });

      it('should return empty array when undefined is passed', () => {
        const contract = new Contract(baseContractData);
        const errors = contract.validateSubclientRestrictions(undefined);
        expect(errors).toEqual([]);
      });
    });

    describe('restricted field modifications', () => {
      it('should detect minPayout modification', () => {
        const mongoBaseContract = new Contract(baseContractData);
        const updatedContractData = {
          ...mongoBaseContract.toObject(),
          minPayout: 200,
        };
        const updatedContract = new Contract(updatedContractData);
        const errors = updatedContract.validateSubclientRestrictions(mongoBaseContract);
        expect(errors).toContain('The Minimum Payout was created as part of an automation and cannot be edited.');
      });

      it('should detect autoPayment modification', () => {
        const mongoBaseContract = new Contract(baseContractData);
        const updatedContractData = {
          ...mongoBaseContract.toObject(),
          autoPayment: false,
        };
        const updatedContract = new Contract(updatedContractData);
        const errors = updatedContract.validateSubclientRestrictions(mongoBaseContract);
        expect(errors).toContain('The Autopayment setting was created as part of an automation and cannot be changed.');
      });

      it('should detect accountingPeriod modification', () => {
        const mongoBaseContract = new Contract(baseContractData);
        const updatedContractData = {
          ...mongoBaseContract.toObject(),
          accountingPeriod: 'quarterly',
        };
        const updatedContract = new Contract(updatedContractData);
        const errors = updatedContract.validateSubclientRestrictions(mongoBaseContract);
        expect(errors).toContain('The Accounting Period was created as part of an automation and cannot be edited.');
      });

      it('should detect active status modification', () => {
        const mongoBaseContract = new Contract(baseContractData);
        const updatedContractData = {
          ...mongoBaseContract.toObject(),
          active: false,
        };
        const updatedContract = new Contract(updatedContractData);
        const errors = updatedContract.validateSubclientRestrictions(mongoBaseContract);
        expect(errors).toContain('The Active status was created as part of an automation and cannot be changed.');
      });

      it('should detect deductWithholding modification', () => {
        const mongoBaseContract = new Contract(baseContractData);
        const updatedContractData = {
          ...mongoBaseContract.toObject(),
          deductWithholding: false,
        };
        const updatedContract = new Contract(updatedContractData);
        const errors = updatedContract.validateSubclientRestrictions(mongoBaseContract);
        expect(errors).toContain('The Withholding Tax setting was created as part of an automation and cannot be changed.');
      });

      it('should detect autoPaymentConditions modification', () => {
        const mongoBaseContract = new Contract(baseContractData);
        const updatedContractData = {
          ...mongoBaseContract.toObject(),
          autoPaymentConditions: [{ condition: 'Balance Is Negative' }],
        };
        const updatedContract = new Contract(updatedContractData);
        const errors = updatedContract.validateSubclientRestrictions(mongoBaseContract);
        expect(errors).toContain('Autopayment conditions were created as part of an automation and cannot be added.');
      });

      it('should detect currentBalance modification', () => {
        const mongoBaseContract = new Contract(baseContractData);
        const updatedContractData = {
          ...mongoBaseContract.toObject(),
          currentBalance: 1500,
        };
        const updatedContract = new Contract(updatedContractData);
        const errors = updatedContract.validateSubclientRestrictions(mongoBaseContract);
        expect(errors).toContain('Balance transfers were created as part of an automation and cannot be edited.');
      });

      it('should detect openingBalance modification', () => {
        const mongoBaseContract = new Contract(baseContractData);
        const updatedContractData = {
          ...mongoBaseContract.toObject(),
          openingBalance: 750,
        };
        const updatedContract = new Contract(updatedContractData);
        const errors = updatedContract.validateSubclientRestrictions(mongoBaseContract);
        expect(errors).toContain('Balance transfers were created as part of an automation and cannot be edited.');
      });

      it('should detect salesTerms modification', () => {
        const mongoBaseContract = new Contract(baseContractData);
        const updatedContractData = {
          ...mongoBaseContract.toObject(),
          salesTerms: [{ territory: 'CA', rate: 0.18 }],
        };
        const updatedContract = new Contract(updatedContractData);
        const errors = updatedContract.validateSubclientRestrictions(mongoBaseContract);
        expect(errors).toContain('These contract terms were created as part of an automation and cannot be edited.');
      });

      it('should detect mechanicalTerms modification', () => {
        const mongoBaseContract = new Contract(baseContractData);
        const updatedContractData = {
          ...mongoBaseContract.toObject(),
          mechanicalTerms: [{ territory: 'CA', rate: 0.12 }],
        };
        const updatedContract = new Contract(updatedContractData);
        const errors = updatedContract.validateSubclientRestrictions(mongoBaseContract);
        expect(errors).toContain('These contract terms were created as part of an automation and cannot be edited.');
      });

      it('should detect mechanicalContractTerms modification', () => {
        const mongoBaseContract = new Contract(baseContractData);
        const updatedContractData = {
          ...mongoBaseContract.toObject(),
          mechanicalContractTerms: [{ territory: 'CA', rate: 0.09 }],
        };
        const updatedContract = new Contract(updatedContractData);
        const errors = updatedContract.validateSubclientRestrictions(mongoBaseContract);
        expect(errors).toContain('These contract terms were created as part of an automation and cannot be edited.');
      });

      it('should detect withholdingTaxTerms modification', () => {
        const mongoBaseContract = new Contract(baseContractData);
        const updatedContractData = {
          ...mongoBaseContract.toObject(),
          withholdingTaxTerms: [{ territory: 'CA', rate: 0.07 }],
        };
        const updatedContract = new Contract(updatedContractData);
        const errors = updatedContract.validateSubclientRestrictions(mongoBaseContract);
        expect(errors).toContain('These contract terms were created as part of an automation and cannot be edited.');
      });

      it('should detect costsTerms modification', () => {
        const mongoBaseContract = new Contract(baseContractData);
        const updatedContractData = {
          ...mongoBaseContract.toObject(),
          costsTerms: [{ type: 'marketing', rate: 0.25 }],
        };
        const updatedContract = new Contract(updatedContractData);
        const errors = updatedContract.validateSubclientRestrictions(mongoBaseContract);
        expect(errors).toContain('These contract terms were created as part of an automation and cannot be edited.');
      });

      it('should detect deductionsTerms modification', () => {
        const mongoBaseContract = new Contract(baseContractData);
        const updatedContractData = {
          ...mongoBaseContract.toObject(),
          deductionsTerms: [{ type: 'promotion', rate: 0.15 }],
        };
        const updatedContract = new Contract(updatedContractData);
        const errors = updatedContract.validateSubclientRestrictions(mongoBaseContract);
        expect(errors).toContain('Deductions are inherited from the main contract and cannot be edited.');
      });

      it('should detect reserves modification', () => {
        const mongoBaseContract = new Contract(baseContractData);
        const updatedContractData = {
          ...mongoBaseContract.toObject(),
          reserves: [{ contractName: 'contract-2', rate: 2000 }],
        };

        const updatedContract = new Contract(updatedContractData);
        const errors = updatedContract.validateSubclientRestrictions(mongoBaseContract);
        expect(errors).toContain('These contract terms were created as part of an automation and cannot be edited.');
      });
    });

    describe('payee restrictions', () => {
      it('should allow modifying existing payee shares', () => {
        const updatedData = {
          ...baseContractData,
          payees: [
            { payeeId: baseContractData.payees[0].payeeId, share: 60 },
            { payeeId: baseContractData.payees[1].payeeId, share: 40 },
          ],
        };
        const updatedContract = new Contract(updatedData);
        const errors = updatedContract.validateSubclientRestrictions(new Contract(baseContractData));
        expect(errors).not.toContain('Adding new Payees is not allowed for Main Subclient Contracts');
      });
    });

    describe('multiple field modifications', () => {
      it('should return multiple errors for multiple field modifications', () => {
        const mongoBaseContract = new Contract(baseContractData);
        const updatedContractData = {
          ...mongoBaseContract.toObject(),
          minPayout: 200,
          autoPayment: false,
          active: false,
          payees: [
            ...baseContractData.payees,
            { payeeId: new mongoose.Types.ObjectId(), share: 10 },
          ],
        };
        const updatedContract = new Contract(updatedContractData);
        const errors = updatedContract.validateSubclientRestrictions(mongoBaseContract);
        expect(errors).toContain('The Minimum Payout was created as part of an automation and cannot be edited.');
        expect(errors).toContain('The Autopayment setting was created as part of an automation and cannot be changed.');
        expect(errors).toContain('The Active status was created as part of an automation and cannot be changed.');
        expect(errors).toContain('Payee details were created as part of an automation and cannot be updated.');
        expect(errors).toHaveLength(4);
      });
    });
  });
});
