const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString, randomInt, randomDate } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** test/unit/libs/calculation/contract/contractTerms.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

describe('ContractTerms Unit Tests', () => {
  let ContractTerms;
  let contract;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    contract = { _id: randomId(), name: randomString(), partitionNo: randomInt() };

    ContractTerms = rewire('../../../../../libs/calculation/contract/contractTerms');
    ContractTerms.__set__('SeparatedSalesTerms', { get: sinon.stub().yields(null, []) });
    ContractTerms.__set__('SeparatedMechanicalTerms', { get: sinon.stub().yields(null, []) });
    ContractTerms.__set__('SeparatedMechanicalContractTerms', { get: sinon.stub().yields(null, []) });
    ContractTerms.__set__('SeparatedCostsTerms', { get: sinon.stub().yields(null, []) });
    ContractTerms.__set__('SeparatedDeductionTerms', { get: sinon.stub().yields(null, []) });
    ContractTerms.__set__('SeperatedWithholdingTaxTerms', { get: sinon.stub().yields(null, []) });
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#forCalcualtion', () => {
    it('should set contractTerms to the right initial value', (done) => {
      // Act
      ContractTerms.forCalcualtion(contract, (err, contractTerms) => {
        // Assert
        expect(contractTerms.contractId).to.eq(contract._id);
        expect(contractTerms.name).to.eq(contract.name);
        expect(contractTerms.partitionNo).to.eq(contract.partitionNo);

        done();
      });
    });
    it('should call SeparatedDeductionTerms.get with the right args', (done) => {
      // Act
      ContractTerms.forCalcualtion(contract, () => {
        // Assert
        expect(ContractTerms.__get__('SeparatedDeductionTerms.get').calledWith(contract)).to.be.true;
        done();
      });
    });
    describe('when contract.contractType is Mechanical', () => {
      it('should call SeparatedMechanicalContractTerms.get with the right args', (done) => {
        // Arrange
        contract.contractType = 'Mechanical';
        // Act
        ContractTerms.forCalcualtion(contract, () => {
          // Assert
          expect(ContractTerms.__get__('SeparatedMechanicalContractTerms.get').calledWith(contract)).to.be.true;
          done();
        });
      });
    });
    describe('when contract.contractType is not Mechanical', () => {
      it('should call SeparatedSalesTerms.get with the right args', (done) => {
        // Arrange
        contract.contractType = randomString();
        // Act
        ContractTerms.forCalcualtion(contract, () => {
          // Assert
          expect(ContractTerms.__get__('SeparatedSalesTerms.get').calledWith(contract)).to.be.true;
          done();
        });
      });
    });
    it('should call SeperatedWithholdingTaxTerms.get with the right args', (done) => {
      // Act
      ContractTerms.forCalcualtion(contract, () => {
        // Assert
        expect(ContractTerms.__get__('SeperatedWithholdingTaxTerms.get').calledWith(contract)).to.be.true;
        done();
      });
    });
    it('should call SeparatedMechanicalTerms.get with the right args', (done) => {
      // Act
      ContractTerms.forCalcualtion(contract, () => {
        // Assert
        expect(ContractTerms.__get__('SeparatedMechanicalTerms.get').calledWith(contract)).to.be.true;
        done();
      });
    });
    it('should set contractTerms.terms to the right value', (done) => {
      // Arrange
      contract.currency = randomString();
      const SeparatedSalesTerms = randomString();
      const SeparatedMechanicalTerms = randomString();
      const SeparatedCostsTerms = randomString();
      const SeparatedDeductionTerms = randomString();
      const SeperatedWithholdingTaxTerms = randomString();
      ContractTerms.__set__('SeparatedSalesTerms', { get: sinon.stub().yields(null, [SeparatedSalesTerms]) });
      ContractTerms.__set__('SeparatedMechanicalTerms', { get: sinon.stub().yields(null, [SeparatedMechanicalTerms]) });
      ContractTerms.__set__('SeparatedCostsTerms', { get: sinon.stub().yields(null, [SeparatedCostsTerms]) });
      ContractTerms.__set__('SeparatedDeductionTerms', { get: sinon.stub().yields(null, [SeparatedDeductionTerms]) });
      ContractTerms.__set__('SeperatedWithholdingTaxTerms', { get: sinon.stub().yields(null, [SeperatedWithholdingTaxTerms]) });
      // Act
      ContractTerms.forCalcualtion(contract, (err, contractTerms) => {
        // Assert
        expect(contractTerms.terms.contractCurrency).to.deep.eq(contract.currency);
        expect(contractTerms.terms.sales).to.deep.eq([SeparatedSalesTerms]);
        expect(contractTerms.terms.deductions).to.deep.eq([SeparatedDeductionTerms]);
        expect(contractTerms.terms.withholdingTaxes).to.deep.eq([SeperatedWithholdingTaxTerms]);
        expect(contractTerms.terms.mechanicalContracts).to.deep.eq([SeparatedMechanicalTerms]);
        expect(contractTerms.terms.mechanicalAmount).to.eq(0);

        done();
      });
    });
  });

  describe('#forCostsCalculation', () => {
    let accountingPeriod;
    beforeEach((done) => {
      accountingPeriod = randomString();
      contract.accountingPeriod = accountingPeriod;
      contract.active = true;
      done();
    });
    describe('when contract.active is not active', () => {
      it('should not call SeparatedCostsTerms.get', (done) => {
        // Arrange
        contract.active = false;
        // Act
        ContractTerms.forCostsCalculation(contract, accountingPeriod, () => {
          // Assert
          expect(ContractTerms.__get__('SeparatedCostsTerms.get').called).to.be.false;
          done();
        });
      });
    });

    describe('when contract.accountingPeriod is not the same as accountingPeriod', () => {
      it('should not call SeparatedCostsTerms.get', (done) => {
        // Arrange
        contract.accountingPeriod = randomString();
        // Act
        ContractTerms.forCostsCalculation(contract, accountingPeriod, () => {
          // Assert
          expect(ContractTerms.__get__('SeparatedCostsTerms.get').called).to.be.false;
          done();
        });
      });
    });

    it('should call SeparatedCostsTerms.get with the right args', (done) => {
      // Act
      ContractTerms.forCostsCalculation(contract, accountingPeriod, () => {
        // Assert
        expect(ContractTerms.__get__('SeparatedCostsTerms.get').calledWith(contract)).to.be.true;
        done();
      });
    });
    it('should set data to the right args', (done) => {
      // Arrange
      contract.currency = randomString();
      const SeparatedCostsTerms = randomString();
      ContractTerms.__set__('SeparatedCostsTerms', { get: sinon.stub().yields(null, [SeparatedCostsTerms]) });

      const expectedData = [{
        objectPercentage: 100, contractId: contract._id.toString(), name: contract.name, contractCurrency: contract.currency, terms: [SeparatedCostsTerms],
      }];
      // Act
      ContractTerms.forCostsCalculation(contract, accountingPeriod, (data) => {
        // Assert
        expect(data).to.deep.eq(expectedData);

        done();
      });
    });
  });
});
