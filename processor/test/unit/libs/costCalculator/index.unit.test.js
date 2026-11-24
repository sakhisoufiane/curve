process.env.NODE_ENV = 'test';

const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { expect } = require('chai');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const CalculatCosts = require('../../../../libs/calculateCosts');
const CostCalculator = require('../../../../libs/calculateCosts/costCalculator');
const Cost = require('../../../../models/cost');

logger.debug('\n\n**** .test/unit/libs/costCalculator/index.unit.test.js');

describe('Cost Calculator Index Unit Tests', function () {
  let countDocumentsStub; let dbStub;
  before((done) => {
    sinon.restore();
    done();
  });

  after((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    countDocumentsStub = sinon.stub(Cost, 'countDocuments').resolves();
    dbStub = { collection: sinon.stub().returns({ countDocuments: countDocumentsStub }) };

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('when passed costIds in event', function () {
    // TODO - ObjectId Test Fix
    it('should update these to be ObjectIds in the created filter', function (done) {
      // Arrange
      const event = {
        db: dbStub,
        clientId: testUtils.randomId(),
        costsDatabaseTable: 'Costs',
        costIds: [testUtils.randomId()],
      };
      const expectedFilter = { clientId: event.clientId, _id: { $in: event.costIds.map((costId) => new ObjectId(costId)) } };
      // Act
      CalculatCosts(event, function () {
        // Assert
        expect(countDocumentsStub.calledWith(expectedFilter)).to.be.true;
        done();
      });
    });
  });

  describe('when NOT passed costIds in event', function () {
    it('should return an empty array for the cost ids', function (done) {
      // Arrange
      const event = {
        db: dbStub,
        clientId: testUtils.randomId(),
        costsDatabaseTable: 'Costs',
      };
      const expectedFilter = { clientId: event.clientId, _id: { $in: [] } };
      // Act
      CalculatCosts(event, function () {
        // Assert
        expect(countDocumentsStub.calledWith(expectedFilter)).to.be.true;
        done();
      });
    });
  });

  describe('when the event.type is Release', function () {
    it('add the passed ID to the releaseIds of the filter', function (done) {
      // Arrange
      const event = {
        db: dbStub,
        clientId: testUtils.randomId(),
        costsDatabaseTable: 'Costs',
        type: 'Release',
        id: testUtils.randomId(),
      };
      const expectedFilter = { clientId: event.clientId, _id: { $in: [] }, releaseIds: new ObjectId(event.id) };
      // Act
      CalculatCosts(event, function () {
        // Assert
        expect(countDocumentsStub.calledWith(expectedFilter)).to.be.true;
        done();
      });
    });
  });

  describe('when the event.type is Track', function () {
    it('add the passed ID to the trackIds of the filter', function (done) {
      // Arrange
      const event = {
        db: dbStub,
        clientId: testUtils.randomId(),
        costsDatabaseTable: 'Costs',
        type: 'Track',
        id: testUtils.randomId(),
      };
      const expectedFilter = { clientId: event.clientId, _id: { $in: [] }, trackIds: new ObjectId(event.id) };
      // Act
      CalculatCosts(event, function () {
        // Assert
        expect(countDocumentsStub.calledWith(expectedFilter)).to.be.true;
        done();
      });
    });
  });

  describe('when the event.type is Work', function () {
    it('add the passed ID to the workIds of the filter', function (done) {
      // Arrange
      const event = {
        db: dbStub,
        clientId: testUtils.randomId(),
        costsDatabaseTable: 'Costs',
        type: 'Work',
        id: testUtils.randomId(),
      };
      const expectedFilter = { clientId: event.clientId, _id: { $in: [] }, workIds: new ObjectId(event.id) };
      // Act
      CalculatCosts(event, function () {
        // Assert
        expect(countDocumentsStub.calledWith(expectedFilter)).to.be.true;
        done();
      });
    });
  });

  describe('when the event.type is Contract', function () {
    it('add the passed ID to the contractIds of the filter', function (done) {
      // Arrange
      const event = {
        db: dbStub,
        clientId: testUtils.randomId(),
        costsDatabaseTable: 'Costs',
        type: 'Contract',
        id: testUtils.randomId(),
      };
      const expectedFilter = { clientId: event.clientId, _id: { $in: [] }, contractIds: new ObjectId(event.id) };
      // Act
      CalculatCosts(event, function () {
        // Assert
        expect(countDocumentsStub.calledWith(expectedFilter)).to.be.true;
        done();
      });
    });
  });

  describe('when count returns an error', function () {
    it('should call the callback with the error', function () {
      // Arrange
      const expectedError = testUtils.randomString();
      countDocumentsStub.rejects(expectedError);
      const event = { db: dbStub, costsDatabaseTable: 'Costs' };
      // Act
      CalculatCosts(event, function (err) {
        // Assert
        expect(err).to.eq(expectedError);
      });
    });
  });

  describe('when count returns a count of 0', function () {
    let event;

    beforeEach(function () {
      countDocumentsStub.resolves(0);
      sinon.stub(CostCalculator, 'byContract').yields(null, {});

      event = {
        db: dbStub,
        costsDatabaseTable: 'Costs',
        type: 'Contract',
        id: '5f8ecbd5aab4562597b34a11',
      };
    });

    it('should call the callback', function (done) {
      // Act
      CalculatCosts(event, function (err, result) {
        // Assert
        expect(err).to.be.undefined;
        expect(result).to.be.undefined;
        done();
      });
    });

    it('should not call the CostCalculator.byContract', function (done) {
      // Act
      CalculatCosts(event, function () {
        // Assert
        expect(CostCalculator.byContract.called).to.be.false;
        done();
      });
    });
  });

  describe('when count returns a count greater than 0', function () {
    let event;

    beforeEach(function () {
      event = {
        db: dbStub,
        costsDatabaseTable: 'Costs',
        type: 'Contract',
        id: '5f8ecbd5aab4562597b34a11',
        contracts: [{ name: 'Contract 1' }, { name: 'Contract 2' }],
      };
      countDocumentsStub.resolves(10);
      sinon.stub(CostCalculator, 'byContract').yields(null, {});
    });

    it('should call CostCalculator.byContract for each contract passed', function (done) {
      CalculatCosts(event, function (err, result) {
        expect(CostCalculator.byContract.calledWith(event.contracts[0])).to.be.true;
        expect(CostCalculator.byContract.calledWith(event.contracts[1])).to.be.true;
        done();
      });
    });
  });
});
