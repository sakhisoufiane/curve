const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/track/contractsForMechanicalCalculation.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

describe('contractsForCostsCalculation unit tests', () => {
  let ContractsForMechanicalCalculation;

  let contract; let track;

  let getSeperatedDeductionTerms; let getSeperatedMechanicalContractTerms;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    ContractsForMechanicalCalculation = rewire('../../../../../libs/calculation/track/contractsForMechanicalCalculation');

    contract = { _id: randomId() };

    track = {
      _id: randomId(),
      statutoryRate: randomInt(),
      canadianStatutoryRate: randomInt(),
      mechanicalCalculationBasis: randomString(),
      duration: randomInt(),
      mechanicalLicenses: [
        {
          contractId: contract._id,
          rate: randomInt(),
          share: randomInt(),
          licenseNo: randomInt(),
        },
      ],
    };

    getSeperatedDeductionTerms = sinon.stub().yields(null, []);
    ContractsForMechanicalCalculation.__set__('SeparatedDeductionTerms', { get: getSeperatedDeductionTerms });

    getSeperatedMechanicalContractTerms = sinon.stub().yields(null, []);
    ContractsForMechanicalCalculation.__set__('MechanicalContractTerms', { seperatedMechanicalContractTerms: getSeperatedMechanicalContractTerms });

    ContractsForMechanicalCalculation.__set__('validateAndFormatRate', sinon.stub());
    ContractsForMechanicalCalculation.__get__('validateAndFormatRate').returns(randomInt());

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('when no track', () => {
    it('should return an error', (done) => {
      // Arrange
      const expectedError = 'Track and Contract are required in contractsForMechanicalCalculation';
      track = null;
      // Act
      ContractsForMechanicalCalculation(track, contract, (err, data) => {
        // Assert
        expect(err.message).to.eq(expectedError);
        done();
      });
    });
  });

  describe('when no contract', () => {
    it('should return an error', (done) => {
      // Arrange
      const expectedError = 'Track and Contract are required in contractsForMechanicalCalculation';
      contract = null;
      // Act
      ContractsForMechanicalCalculation(track, contract, (err, data) => {
        // Assert
        expect(err.message).to.eq(expectedError);
        done();
      });
    });
  });

  describe('for each trackLicenses', () => {
    it('should call validateAndFormatRate with the right args', (done) => {
      // Act
      ContractsForMechanicalCalculation(track, contract, (err, data) => {
        // Assert
        expect(ContractsForMechanicalCalculation.__get__('validateAndFormatRate').calledWith(track.mechanicalLicenses[0].rate)).to.be.true;
        done();
      });
    });

    it('should call SeperatedDeductionTerms.get with the right args', (done) => {
      // Act
      ContractsForMechanicalCalculation(track, contract, (err, data) => {
        // Assert
        expect(getSeperatedDeductionTerms.calledWith(contract)).to.be.true;
        done();
      });
    });

    it('should call MechanicalContractTerms.seperatedMechanicalContractTerms with the right args', (done) => {
      // Arrange
      contract.contractType = 'Mechanical';
      // Act
      ContractsForMechanicalCalculation(track, contract, (err, data) => {
        // Assert
        expect(getSeperatedMechanicalContractTerms.calledWith(contract)).to.be.true;
        done();
      });
    });

    it('should return the right object', (done) => {
      // Arrange
      let deductionTerms = ['All', 'Track', randomString()];
      getSeperatedDeductionTerms.yields(null, deductionTerms);

      let salesTerms = ['All', 'Track', randomString()];
      getSeperatedMechanicalContractTerms.yields(null, salesTerms);

      salesTerms = salesTerms.map((term) => { if (['Track', 'All', ''].includes(term.catType) || !term.catType) { return term; } }).filter(Boolean);
      deductionTerms = deductionTerms.map((term) => { if (['Track', 'All', ''].includes(term.catType) || !term.catType) { return term; } }).filter(Boolean);

      const validatedRate = randomInt();
      ContractsForMechanicalCalculation.__get__('validateAndFormatRate').returns(validatedRate);

      const mechanicalAmount = { US: track.statutoryRate, CA: track.canadianStatutoryRate };
      const expectedObject = {
        objectPercentage: validatedRate,
        name: contract.name,
        share: track.mechanicalLicenses[0].share,
        contractId: track.mechanicalLicenses[0].contractId,
        contractType: 'Mechanical',
        partitionNo: contract.partitionNo,
        licenseNo: track.mechanicalLicenses[0].licenseNo,
        terms: {
          sales: salesTerms,
          deductions: deductionTerms,
          mechanicalAmount,
          contractCurrency: contract.currency,
          mechanicalCalculationBasis: track.mechanicalCalculationBasis,
          duration: track.duration,
        },
      };
      // Act
      ContractsForMechanicalCalculation(track, contract, (err, data) => {
        // Assert
        expect(data).to.deep.eq([expectedObject]);
        done();
      });
    });
  });
});
