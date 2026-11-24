const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString, randomInt, randomDate } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** test/unit/libs/calculation/contract/separatedDeductionTerms.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Contract = require('../../../../../models/contract');
const TerritoryGroup = require('../../../../../models/territoryGroup');
const ContractTermGroup = require('../../../../../models/contractTermGroup');
const Release = require('../../../../../models/release');
const Track = require('../../../../../models/track');
const Work = require('../../../../../models/work');

describe('SeparatedDeductionTerms Unit Tests', () => {
  let SeparatedDeductionTerms;
  let contract;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    SeparatedDeductionTerms = rewire('../../../../../libs/calculation/contract/separatedDeductionTerms');

    contract = new Contract({ _id: randomId(),
      deductionsTerms: [
        {
          territory: randomId(),
          channel: randomId(),
          configuration: randomId(),
          priceCategory: randomId(),
          source: randomId(),
          catalogueGroup: randomId(),
        },
      ] });

    sinon.stub(Release, 'find').resolves([]);
    sinon.stub(Track, 'find').resolves([]);
    sinon.stub(Work, 'find').resolves([]);
    sinon.stub(TerritoryGroup, 'findOne').resolves({});
    sinon.stub(ContractTermGroup, 'findById').resolves({ items: [] });
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#get', () => {
    describe('when obj.catalogueGroup', () => {
      it('should call Release.find', (done) => {
        // Act
        SeparatedDeductionTerms.get(contract, () => {
          // Assert
          expect(Release.find.called).to.be.true;
          done();
        });
      });

      it('should set obj.releaseIds', (done) => {
        // Arrange
        const releases = [
          { _id: randomId() },
          { _id: randomId() },
          { _id: randomId() },
        ];
        Release.find.resolves(releases);
        const releaseIds = releases.map((release) => release._id.toString());
        // Act
        SeparatedDeductionTerms.get(contract, (err, terms) => {
          // Assert
          expect(terms[0].releaseIds).to.eql(releaseIds);
          done();
        });
      });

      it('should call Track.find', (done) => {
        // Act
        SeparatedDeductionTerms.get(contract, () => {
          // Assert
          expect(Release.find.called).to.be.true;
          done();
        });
      });

      it('should set obj.trackIds', (done) => {
        // Arrange
        const tracks = [
          { _id: randomId() },
          { _id: randomId() },
          { _id: randomId() },
        ];
        Track.find.resolves(tracks);
        const trackIds = tracks.map((track) => track._id.toString());
        // Act
        SeparatedDeductionTerms.get(contract, (err, terms) => {
          // Assert
          expect(terms[0].trackIds).to.eql(trackIds);
          done();
        });
      });

      it('should call Work.find', (done) => {
        // Act
        SeparatedDeductionTerms.get(contract, () => {
          // Assert
          expect(Work.find.called).to.be.true;
          done();
        });
      });

      it('should set obj.workIds', (done) => {
        // Arrange
        const works = [
          { _id: randomId() },
          { _id: randomId() },
          { _id: randomId() },
        ];
        Work.find.resolves(works);
        const workIds = works.map((work) => work._id.toString());
        // Act
        SeparatedDeductionTerms.get(contract, (err, terms) => {
          // Assert
          expect(terms[0].workIds).to.eql(workIds);
          done();
        });
      });
    });

    describe('when no obj.catalogueGroup', () => {
      it('should not call Release.find', (done) => {
        // Arrange
        contract.deductionsTerms[0].catalogueGroup = undefined;
        // Act
        SeparatedDeductionTerms.get(contract, () => {
          // Assert
          expect(Release.find.called).to.be.false;
          done();
        });
      });

      it('should not call Track.find', (done) => {
        // Arrange
        contract.deductionsTerms[0].catalogueGroup = undefined;
        // Act
        SeparatedDeductionTerms.get(contract, () => {
          // Assert
          expect(Track.find.called).to.be.false;
          done();
        });
      });

      it('should not call Work.find', (done) => {
        // Arrange
        contract.deductionsTerms[0].catalogueGroup = undefined;
        // Act
        SeparatedDeductionTerms.get(contract, () => {
          // Assert
          expect(Work.find.called).to.be.false;
          done();
        });
      });

      it('should not set obj.workIds', (done) => {
        contract.deductionsTerms[0].catalogueGroup = undefined;
        // Arrange
        const works = [
          { _id: randomId() },
          { _id: randomId() },
          { _id: randomId() },
        ];
        Work.find.resolves(works);
        const workIds = works.map((work) => work._id.toString());
        // Act
        SeparatedDeductionTerms.get(contract, (err, terms) => {
          // Assert
          expect(terms[0].workIds).to.eql(undefined);
          done();
        });
      });
    });

    describe('when obj.territory is an ID', () => {
      it('should call TerritoryGroup.findOne', (done) => {
        // Act
        SeparatedDeductionTerms.get(contract, (err, terms) => {
          // Assert
          expect(TerritoryGroup.findOne.called).to.be.true;
          done();
        });
      });

      it('should set obj.territory to the returned territories', (done) => {
        // Arrange
        Work.find.resolves([{ _id: randomId() }]);
        const territory = randomString();
        TerritoryGroup.findOne.resolves({ territories: territory });
        // Act
        SeparatedDeductionTerms.get(contract, (err, terms) => {
          // Assert
          expect(terms[0].territory).to.eql(territory);
          done();
        });
      });
    });
    describe('when obj.territory is not an ID', () => {
      it('should not call TerritoryGroup.findOne', (done) => {
        // Arrange
        contract.deductionsTerms[0].territory = undefined;
        // Act
        SeparatedDeductionTerms.get(contract, (err, terms) => {
          // Assert
          expect(TerritoryGroup.findOne.called).to.be.false;
          done();
        });
      });
    });

    describe('when obj.channel is an ID', () => {
      it('should call ContractTermGroup.findById', (done) => {
        // Act
        SeparatedDeductionTerms.get(contract, () => {
          // Assert
          expect(ContractTermGroup.findById.calledWith(contract.deductionsTerms[0].channel)).to.be.true;
          done();
        });
      });
      it('should set obj.channel to the returned contract term group items', (done) => {
        // Arrange
        Work.find.resolves([{ _id: randomId() }]);
        const channel = [randomString()];
        ContractTermGroup.findById.resolves({ items: channel });
        // Act
        SeparatedDeductionTerms.get(contract, (err, terms) => {
          // Assert
          expect(terms[0].channel).to.eql(channel);
          done();
        });
      });
    });

    describe('when obj.channel is not an ID', () => {
      it('should not call ContractTermGroup.findById', (done) => {
        // Arrange
        contract.deductionsTerms[0].channel = undefined;
        // Act
        SeparatedDeductionTerms.get(contract, (err, terms) => {
          // Assert
          expect(ContractTermGroup.findById.calledWith(terms.channel)).to.be.false;
          done();
        });
      });
    });

    describe('when obj.configuration is an ID', () => {
      it('should call ContractTermGroup.findById', (done) => {
        // Act
        SeparatedDeductionTerms.get(contract, () => {
          // Assert
          expect(ContractTermGroup.findById.calledWith(contract.deductionsTerms[0].configuration)).to.be.true;
          done();
        });
      });
      it('should set obj.configuration to the returned contract term group items', (done) => {
        // Arrange
        Work.find.resolves([{ _id: randomId() }]);
        const configuration = [randomString()];
        ContractTermGroup.findById.resolves({ items: configuration });
        // Act
        SeparatedDeductionTerms.get(contract, (err, terms) => {
          // Assert
          expect(terms[0].configuration).to.eql(configuration);
          done();
        });
      });
    });

    describe('when obj.configuration is not an ID', () => {
      it('should not call ContractTermGroup.findById', (done) => {
        // Arrange
        contract.deductionsTerms[0].configuration = undefined;
        // Act
        SeparatedDeductionTerms.get(contract, (err, terms) => {
          // Assert
          expect(ContractTermGroup.findById.calledWith(terms.configuration)).to.be.false;
          done();
        });
      });
    });

    describe('when obj.priceCategory is an ID', () => {
      it('should call ContractTermGroup.findById', (done) => {
        // Act
        SeparatedDeductionTerms.get(contract, () => {
          // Assert
          expect(ContractTermGroup.findById.calledWith(contract.deductionsTerms[0].priceCategory)).to.be.true;
          done();
        });
      });
      it('should set obj.priceCategory to the returned contract term group items', (done) => {
        // Arrange
        Work.find.resolves([{ _id: randomId() }]);
        const priceCategory = [randomString()];
        ContractTermGroup.findById.resolves({ items: priceCategory });
        // Act
        SeparatedDeductionTerms.get(contract, (err, terms) => {
          // Assert
          expect(terms[0].priceCategory).to.eql(priceCategory);
          done();
        });
      });
    });

    describe('when obj.priceCategory is not an ID', () => {
      it('should not call ContractTermGroup.findById', (done) => {
        // Arrange
        contract.deductionsTerms[0].priceCategory = undefined;
        // Act
        SeparatedDeductionTerms.get(contract, (err, terms) => {
          // Assert
          expect(ContractTermGroup.findById.calledWith(terms.priceCategory)).to.be.false;
          done();
        });
      });
    });

    describe('when obj.source is an ID', () => {
      it('should call ContractTermGroup.findById', (done) => {
        // Act
        SeparatedDeductionTerms.get(contract, () => {
          // Assert
          expect(ContractTermGroup.findById.calledWith(contract.deductionsTerms[0].source)).to.be.true;
          done();
        });
      });
      it('should set obj.source to the returned contract term group items', (done) => {
        // Arrange
        Work.find.resolves([{ _id: randomId() }]);
        const source = [randomString()];
        ContractTermGroup.findById.resolves({ items: source });
        // Act
        SeparatedDeductionTerms.get(contract, (err, terms) => {
          // Assert
          expect(terms[0].source).to.eql(source);
          done();
        });
      });
    });

    describe('when obj.source is not an ID', () => {
      it('should not call ContractTermGroup.findById', (done) => {
        // Arrange
        contract.deductionsTerms[0].source = undefined;
        // Act
        SeparatedDeductionTerms.get(contract, (err, terms) => {
          // Assert
          expect(ContractTermGroup.findById.calledWith(terms.source)).to.be.false;
          done();
        });
      });
    });
  });
});
