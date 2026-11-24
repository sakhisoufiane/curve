const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/release/contractsForMechanicalCalculation.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Track = require('../../../../../models/track');

describe('contractsForCostsCalculation unit tests', () => {
  let ContractsForMechanicalCalculation;

  let release; let contract; let client; let period; let track;

  let getSeperatedSalesTerms; let getSeperatedDeductionTerms; let getSeperatedWithholdingTaxTerms;
  let getSeperatedMechanicalContractTerms; let getSeperatedMechanicalTerms; let getReleaseMechanicalAmount;
  let getTotalUniqueTracks; let getMechanicalBasisPercentage;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    ContractsForMechanicalCalculation = rewire('../../../../../libs/calculation/release/contractsForMechanicalCalculation');

    client = { _id: randomId() };

    period = { _id: randomId(), endDate: randomString() };

    contract = { _id: randomId() };

    track = { _id: randomId(), mechanicalCalculationBasis: randomString(), duration: randomInt() };
    release = {
      trackIds: [track._id],
      mechanicalLicenses: {},
    };

    release.mechanicalLicenses[track._id] = {
      reportMechanicals: true,
      licenses: [
        { contractId: contract._id.toString(), rate: randomInt(), share: randomInt(), trackCapOverride: randomInt() },
      ],
    };

    sinon.stub(Track, 'findById').resolves(track);

    getSeperatedSalesTerms = sinon.stub().yields(null, []);
    ContractsForMechanicalCalculation.__set__('SeperatedSalesTerms', { get: getSeperatedSalesTerms });

    getSeperatedDeductionTerms = sinon.stub().yields(null, []);
    ContractsForMechanicalCalculation.__set__('SeperatedDeductionTerms', { get: getSeperatedDeductionTerms });

    getSeperatedWithholdingTaxTerms = sinon.stub().yields(null, []);
    ContractsForMechanicalCalculation.__set__('SeperatedWithholdingTaxTerms', { get: getSeperatedWithholdingTaxTerms });

    getSeperatedMechanicalContractTerms = sinon.stub().yields(null, []);
    ContractsForMechanicalCalculation.__set__('SeperatedMechanicalContractTerms', { get: getSeperatedMechanicalContractTerms });

    getSeperatedMechanicalTerms = sinon.stub().yields(null, []);
    ContractsForMechanicalCalculation.__set__('SeperatedMechanicalTerms', { get: getSeperatedMechanicalTerms });

    getReleaseMechanicalAmount = sinon.stub().yields(null, []);
    getTotalUniqueTracks = sinon.stub().yields(null, []);
    getMechanicalBasisPercentage = sinon.stub().yields(null, []);
    ContractsForMechanicalCalculation.__set__('ReleaseMechanicalAmount', {
      get: getReleaseMechanicalAmount,
      totalUniqueTracks: getTotalUniqueTracks,
      getMechanicalBasisPercentage,
    });

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('for each trackLicenses', () => {
    it('should call Track.findById with the right args', (done) => {
      // Act
      ContractsForMechanicalCalculation(release, contract, client, period, (err, data) => {
        // Assert
        expect(Track.findById.calledWith(track._id)).to.be.true;
        done();
      });
    });

    it('should call SeperatedDeductionTerms.get with the right args', (done) => {
      // Act
      ContractsForMechanicalCalculation(release, contract, client, period, (err, data) => {
        // Assert
        expect(getSeperatedDeductionTerms.calledWith(contract)).to.be.true;
        done();
      });
    });

    it('should call SeperatedWithholdingTaxTerms.get with the right args', (done) => {
      // Act
      ContractsForMechanicalCalculation(release, contract, client, period, (err, data) => {
        // Assert
        expect(getSeperatedWithholdingTaxTerms.calledWith(contract)).to.be.true;
        done();
      });
    });

    describe('when it\'s a mechanical contract', () => {
      it('should call SeperatedMechanicalContractTerms.get with the right args', (done) => {
        // Arrange
        contract.contractType = 'Mechanical';
        // Act
        ContractsForMechanicalCalculation(release, contract, client, period, (err, data) => {
          // Assert
          expect(getSeperatedMechanicalContractTerms.calledWith(contract)).to.be.true;
          done();
        });
      });
    });

    describe('when it\'s not a mechanical contract', () => {
      it('should call SeperatedSalesTerms.get with the right args', (done) => {
        // Arrange
        contract.contractType = randomString();
        // Act
        ContractsForMechanicalCalculation(release, contract, client, period, (err, data) => {
          // Assert
          expect(getSeperatedSalesTerms.calledWith(contract)).to.be.true;
          done();
        });
      });
    });

    it('should call SeperatedMechanicalTerms.get with the right args', (done) => {
      // Act
      ContractsForMechanicalCalculation(release, contract, client, period, (err, data) => {
        // Assert
        expect(getSeperatedMechanicalTerms.calledWith(contract)).to.be.true;
        done();
      });
    });

    it('should call ReleaseMechanicalAmount.get with the right args', (done) => {
      // Act
      ContractsForMechanicalCalculation(release, contract, client, period, (err, data) => {
        // Assert
        expect(getReleaseMechanicalAmount.calledWith(release, client)).to.be.true;
        done();
      });
    });

    it('should call ReleaseMechanicalAmount.totalUniqueTracks with the right args', (done) => {
      // Act
      ContractsForMechanicalCalculation(release, contract, client, period, (err, data) => {
        // Assert
        expect(getTotalUniqueTracks.calledWith(release)).to.be.true;
        done();
      });
    });

    it('should call ReleaseMechanicalAmount.getMechanicalBasisPercentage with the right args', (done) => {
      // Act
      ContractsForMechanicalCalculation(release, contract, client, period, (err, data) => {
        // Assert
        expect(getMechanicalBasisPercentage.calledWith(release, release.mechanicalLicenses[track._id].licenses[0].trackCapOverride)).to.be.true;
        done();
      });
    });

    it('should return the right object', (done) => {
      // Arrange
      let salesTerms = ['All', 'Release', randomString()];
      getSeperatedSalesTerms.yields(null, salesTerms);

      let deductionTerms = ['All', 'Release', randomString()];
      getSeperatedDeductionTerms.yields(null, deductionTerms);

      let withholdingTaxTerms = ['All', 'Release', randomString()];
      getSeperatedWithholdingTaxTerms.yields(null, withholdingTaxTerms);

      let mechanicalTerms = ['All', 'Release', randomString()];
      getSeperatedMechanicalTerms.yields(null, mechanicalTerms);

      const mechanicalAmount = randomInt();
      getReleaseMechanicalAmount.yields(null, mechanicalAmount);

      const totalTracks = randomInt();
      getTotalUniqueTracks.yields(null, totalTracks);

      const mechanicalBasisPercentage = randomInt();
      getMechanicalBasisPercentage.yields(null, mechanicalBasisPercentage);

      salesTerms = salesTerms.map((term) => { if (['Release', 'All', ''].includes(term.catType) || !term.catType) { return term; } }).filter(Boolean);
      deductionTerms = deductionTerms.map((term) => { if (['Release', 'All', ''].includes(term.catType) || !term.catType) { return term; } }).filter(Boolean);
      withholdingTaxTerms = withholdingTaxTerms.map((term) => { if (['Release', 'All', ''].includes(term.catType) || !term.catType) { return term; } }).filter(Boolean);
      mechanicalTerms = mechanicalTerms.map((term) => { if (['Release', 'All', ''].includes(term.catType) || !term.catType) { return term; } }).filter(Boolean);

      const expectedObject = {
        objectPercentage: release.mechanicalLicenses[track._id].licenses[0].rate,
        name: contract.name,
        share: release.mechanicalLicenses[track._id].licenses[0].share,
        contractId: release.mechanicalLicenses[track._id].licenses[0].contractId,
        contractType: 'Mechanical',
        partitionNo: contract.partitionNo,
        licenseNo: release.mechanicalLicenses[track._id].licenses[0].licenseNo && release.mechanicalLicenses[track._id].licenses[0].licenseNo !== '' ? release.mechanicalLicenses[track._id].licenses[0].licenseNo : contract.licenseNo,
        track: { _id: track._id, title: track.title, version: track.version, artist: track.artist, isrc: track.isrc, statutoryRate: { US: track.statutoryRate, CA: track.canadianStatutoryRate }, controlledCompositionClause: release.controlledCompositionClause, mechanicalCalculationBasis: track.mechanicalCalculationBasis, duration: track.duration },
        terms: {
          sales: salesTerms,
          deductions: deductionTerms,
          mechanicalContracts: mechanicalTerms,
          mechanicalBasisPercentage,
          mechanicalAmount,
          totalTracks,
          contractCurrency: contract.currency,
        },
      };
      // Act
      ContractsForMechanicalCalculation(release, contract, client, period, (err, data) => {
        // Assert
        expect(data).to.deep.eq([expectedObject]);
        done();
      });
    });
  });
});
