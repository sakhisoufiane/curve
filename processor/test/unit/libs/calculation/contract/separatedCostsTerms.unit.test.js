const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** test/unit/libs/calculation/contract/separatedCostsTerms.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Contract = require('../../../../../models/contract');
const TerritoryGroup = require('../../../../../models/territoryGroup');
const ContractTermGroup = require('../../../../../models/contractTermGroup');

describe('SeparatedCostsTerms Unit Tests', () => {
  let SeparatedCostsTerms;
  let contract; let territoryGroup;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    SeparatedCostsTerms = rewire('../../../../../libs/calculation/contract/separatedCostsTerms');

    contract = new Contract({ _id: randomId(), costsTerms: [{ territory: randomId(), type: randomId() }] });
    territoryGroup = { _id: randomId(), territories: [randomString()] };

    sinon.stub(TerritoryGroup, 'findOne').resolves({});
    sinon.stub(ContractTermGroup, 'findOne').resolves({ items: [] });
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#get', () => {
    describe('when obj.territory is an ID', () => {
      it('should call TerritoryGroup.findOne', (done) => {
        // Act
        SeparatedCostsTerms.get(contract, () => {
          // Assert
          expect(TerritoryGroup.findOne.called).to.be.true;
          done();
        });
      });
      it('should set obj.territory to the returned territories', (done) => {
        // Arrange
        TerritoryGroup.findOne = sinon.stub().resolves(territoryGroup);
        // Act
        SeparatedCostsTerms.get(contract, (err, terms) => {
          // Assert
          expect(terms[0].territory).to.deep.eq(territoryGroup.territories);
          done();
        });
      });
    });

    describe('when obj.territory is not an ID', () => {
      it('should not call TerritoryGroup.findOne', (done) => {
        // Arrange
        contract.costsTerms[0].territory = '123';
        // Act
        SeparatedCostsTerms.get(contract, () => {
          // Assert
          expect(TerritoryGroup.findOne.called).to.be.false;
          done();
        });
      });
    });

    describe('when obj.type is an ID', () => {
      it('should call ContractTermGroup.findById', (done) => {
        // Act
        SeparatedCostsTerms.get(contract, () => {
          // Assert
          expect(ContractTermGroup.findOne.called).to.be.true;
          done();
        });
      });
      it('should set obj.type to the returned contract term group items', (done) => {
        // Arrange
        const item = randomString();
        const items = [item, item, item];
        ContractTermGroup.findOne.resolves({ items: [item, 0, '', null, item, item] });
        // Act
        SeparatedCostsTerms.get(contract, (err, terms) => {
          // Assert
          expect(terms[0].type).to.deep.eq(items);
          done();
        });
      });
    });

    describe('when obj.type is not an ID', () => {
      it('should not call ContractTermGroup.findById', (done) => {
        // Arrange
        contract.costsTerms[0].type = '123';
        // Act
        SeparatedCostsTerms.get(contract, () => {
          // Assert
          expect(ContractTermGroup.findOne.called).to.be.false;
          done();
        });
      });
    });
  });
});
