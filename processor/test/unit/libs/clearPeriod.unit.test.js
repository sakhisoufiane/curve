process.env.NODE_ENV = 'test';

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const { logger, BigQuery, testUtils } = require('@curveroyaltysystems/platform-shared-utils');

const ClearPeriod = rewire('../../../libs/clearPeriod');

const bigQuery = new BigQuery(testUtils.bigQueryRandomParams());
logger.debug('\n\n**** .test/unit/libs/clearPeriod.unit.test');

let deleteDataStub;
let mongoCollectionStub;
let mongoUpdateManyStub;
let mongoDeleteManyStub;
let db;

// TODO - Async refactor
describe.skip('clearPeriod', () => {
  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    mongoUpdateManyStub = sinon.stub().yields();
    mongoDeleteManyStub = sinon.stub().yields();

    mongoCollectionStub = sinon.stub().returns({
      updateMany: mongoUpdateManyStub,
      deleteMany: mongoDeleteManyStub,
    });

    db = {
      collection: mongoCollectionStub,
    };

    deleteDataStub = sinon.stub(bigQuery, 'deleteData');
    deleteDataStub.yields();

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  after((done) => {
    sinon.restore();
    done();
  });

  describe('sales', () => {
    let event;

    beforeEach((done) => {
      event = {
        type: testUtils.randomString(),
        periodId: testUtils.randomId(),
        contractIds: [testUtils.randomId(), testUtils.randomId()],
        bigQuery,
      };

      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(ClearPeriod.__get__('sales')).to.exist;
      done();
    });

    describe('when bigQuery.deleteData doesn\'t return an error', () => {
      it('should not return an error', (done) => {
        // Act
        ClearPeriod.__get__('sales')(event, (err) => {
          // Assert
          expect(err).to.not.exist;
          done();
        });
      });
    });

    describe('when bigQuery.deleteData returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        deleteDataStub.yields(expectedError);
        // Act
        ClearPeriod.__get__('sales')(event, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('When event type is Statement', () => {
      it('should call bigQuery.deleteData with the right arguments', (done) => {
        // Arrange
        event.type = 'Statement';
        const expectedTable = bigQuery.outputTable;
        const expectedFilter = { periodId: event.periodId, $or: [{ contractId: { $in: event.contractIds } }] };
        // Act
        ClearPeriod.__get__('sales')(event, (err) => {
          // Assert
          expect(deleteDataStub.called).to.be.true;
          expect(deleteDataStub.calledWith(expectedTable, expectedFilter)).to.be.true;
          done(err);
        });
      });
    });

    describe('When event type is Period', () => {
      it('should call bigQuery.deleteData with the right arguments', (done) => {
        // Arrange
        event.type = 'Period';
        const expectedTable = bigQuery.outputTable;
        const expectedFilter = { periodId: event.periodId, $or: [] };
        // Act
        ClearPeriod.__get__('sales')(event, (err) => {
          // Assert
          expect(deleteDataStub.called).to.be.true;
          expect(deleteDataStub.calledWith(expectedTable, expectedFilter)).to.be.true;
          done(err);
        });
      });
    });
  });

  describe('outputCosts', () => {
    let event;

    beforeEach((done) => {
      event = {
        type: testUtils.randomString(),
        periodId: testUtils.randomId(),
        contractIds: [testUtils.randomId(), testUtils.randomId()],
        bigQuery,
      };

      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(ClearPeriod.__get__('outputCosts')).to.exist;
      done();
    });

    describe('when bigQuery.deleteData doesn\'t return an error', () => {
      it('should not return an error', (done) => {
        // Act
        ClearPeriod.__get__('outputCosts')(event, (err) => {
          // Assert
          expect(err).to.not.exist;
          done();
        });
      });
    });

    describe('when bigQuery.deleteData returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        deleteDataStub.yields(expectedError);
        // Act
        ClearPeriod.__get__('outputCosts')(event, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('When event type is Statement', () => {
      it('should call bigQuery.deleteData with the right arguments', (done) => {
        // Arrange
        event.type = 'Statement';
        const expectedTable = bigQuery.costsTable;
        const expectedFilter = { periodId: event.periodId, contractId: { $in: event.contractIds } };
        // Act
        ClearPeriod.__get__('outputCosts')(event, (err) => {
          // Assert
          expect(deleteDataStub.called).to.be.true;
          expect(deleteDataStub.calledWith(expectedTable, expectedFilter)).to.be.true;
          done(err);
        });
      });
    });

    describe('When event type is Period', () => {
      it('should call bigQuery.deleteData with the right arguments', (done) => {
        // Arrange
        event.type = 'Period';
        const expectedTable = bigQuery.costsTable;
        const expectedFilter = { periodId: event.periodId };
        // Act
        ClearPeriod.__get__('outputCosts')(event, (err) => {
          // Assert
          expect(deleteDataStub.called).to.be.true;
          expect(deleteDataStub.calledWith(expectedTable, expectedFilter)).to.be.true;
          done(err);
        });
      });
    });
  });

  describe('inputCosts', () => {
    let event;

    beforeEach((done) => {
      event = {
        db,
        periodId: testUtils.randomId(),
        clientId: testUtils.randomId(),
        contractIds: [testUtils.randomId(), testUtils.randomId()],
        costsDatabaseTable: testUtils.randomString(),
        type: testUtils.randomString(),
      };

      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(ClearPeriod.__get__('inputCosts')).to.exist;
      done();
    });

    it('should call event.db.collection with the right params', (done) => {
      // Act
      ClearPeriod.__get__('inputCosts')(event, (err) => {
        // Assert
        expect(mongoCollectionStub.called).to.be.true;
        expect(mongoCollectionStub.calledWith(event.costsDatabaseTable)).to.be.true;
        done(err);
      });
    });

    describe('when event.type is \'Statement\'', () => {
      it('should call inputCollection.updateMany with the right params', (done) => {
        // Arrange
        event.type = 'Statement';
        const expecteFilter = { clientId: event.clientId, periodIds: { $in: [event.periodId] }, calculationContractIds: { $in: event.contractIds } };
        const expectePullQuery = { $pull: { calculationContractIds: { $in: event.contractIds } } };
        // Act
        ClearPeriod.__get__('inputCosts')(event, (err) => {
          // Assert
          expect(mongoUpdateManyStub.called).to.be.true;
          expect(mongoUpdateManyStub.calledWith(expecteFilter, expectePullQuery)).to.be.true;
          done(err);
        });
      });
    });

    describe('when event.type is not \'Statement\'', () => {
      it('should call inputCollection.updateMany with the right params', (done) => {
        // Arrange
        const expecteFilter = { clientId: event.clientId, periodIds: { $in: [event.periodId] } };
        const expectePullQuery = { $pull: { periodIds: event.periodId, calculationContractIds: { $in: event.contractIds } } };
        // Act
        ClearPeriod.__get__('inputCosts')(event, (err) => {
          // Assert
          expect(mongoUpdateManyStub.called).to.be.true;
          expect(mongoUpdateManyStub.calledWith(expecteFilter, expectePullQuery)).to.be.true;
          done(err);
        });
      });
    });

    describe('when inputCollection.updateMany returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        mongoUpdateManyStub.yields(expectedError);
        // Act
        ClearPeriod.__get__('inputCosts')(event, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
  });

  describe('mcpsRetentions', () => {
    let event;

    beforeEach((done) => {
      event = {
        db,
        periodId: testUtils.randomId(),
        contractIds: [testUtils.randomId(), testUtils.randomId()],
        costsDatabaseTable: testUtils.randomString(),
        type: testUtils.randomString(),
      };

      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(ClearPeriod.__get__('mcpsRetentions')).to.exist;
      done();
    });

    it('should call event.db.collection with the right params', (done) => {
      // Arrange
      const expectedTable = 'mcpsretentions';
      // Act
      ClearPeriod.__get__('mcpsRetentions')(event, (err) => {
        // Assert
        expect(mongoCollectionStub.called).to.be.true;
        expect(mongoCollectionStub.calledWith(expectedTable)).to.be.true;
        done(err);
      });
    });

    describe('when event.type is \'Statement\'', () => {
      it('should not call inputCollection.deleteMany', (done) => {
        // Arrange
        event.type = 'Statement';
        // Act
        ClearPeriod.__get__('mcpsRetentions')(event, (err) => {
          // Assert
          expect(mongoUpdateManyStub.called).to.be.false;
          done(err);
        });
      });
    });

    describe('when event.type is not \'Statement\'', () => {
      it('should call inputCollection.deleteMany with the right params', (done) => {
        // Arrange
        const expecteFilter = { periodId: event.periodId };
        // Act
        ClearPeriod.__get__('mcpsRetentions')(event, (err) => {
          // Assert
          expect(mongoDeleteManyStub.called).to.be.true;
          expect(mongoDeleteManyStub.calledWith(expecteFilter)).to.be.true;
          done(err);
        });
      });
    });

    describe('when inputCollection.deleteMany returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        mongoDeleteManyStub.yields(expectedError);
        // Act
        ClearPeriod.__get__('mcpsRetentions')(event, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
  });

  describe('mcpsNegatives', () => {
    let event;

    beforeEach((done) => {
      event = {
        db,
        periodId: testUtils.randomId(),
        contractIds: [testUtils.randomId(), testUtils.randomId()],
        costsDatabaseTable: testUtils.randomString(),
        type: testUtils.randomString(),
      };

      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(ClearPeriod.__get__('mcpsNegatives')).to.exist;
      done();
    });

    it('should call event.db.collection with the right params', (done) => {
      // Arrange
      const expectedTable = 'mcpsnegatives';
      // Act
      ClearPeriod.__get__('mcpsNegatives')(event, (err) => {
        // Assert
        expect(mongoCollectionStub.called).to.be.true;
        expect(mongoCollectionStub.calledWith(expectedTable)).to.be.true;
        done(err);
      });
    });

    describe('when event.type is \'Statement\'', () => {
      it('should not call inputCollection.deleteMany', (done) => {
        // Arrange
        event.type = 'Statement';
        // Act
        ClearPeriod.__get__('mcpsNegatives')(event, (err) => {
          // Assert
          expect(mongoUpdateManyStub.called).to.be.false;
          done(err);
        });
      });
    });

    describe('when event.type is not \'Statement\'', () => {
      it('should call inputCollection.deleteMany with the right params', (done) => {
        // Arrange
        const expecteFilter = { periodId: event.periodId };
        // Act
        ClearPeriod.__get__('mcpsNegatives')(event, (err) => {
          // Assert
          expect(mongoDeleteManyStub.called).to.be.true;
          expect(mongoDeleteManyStub.calledWith(expecteFilter)).to.be.true;
          done(err);
        });
      });
    });

    describe('when inputCollection.deleteMany returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        mongoDeleteManyStub.yields(expectedError);
        // Act
        ClearPeriod.__get__('mcpsNegatives')(event, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
  });

  describe('module.exports', () => {
    const event = {
      periodId: testUtils.randomId(),
      contractIds: [testUtils.randomId(), testUtils.randomId()],
      costsDatabaseUrl: testUtils.randomString(),
      costsDatabaseTable: testUtils.randomString(),
      type: testUtils.randomString(),
    };

    beforeEach((done) => {
      ClearPeriod.__set__('sales', sinon.stub());
      ClearPeriod.__get__('sales').yields();

      ClearPeriod.__set__('inputCosts', sinon.stub());
      ClearPeriod.__get__('inputCosts').yields();

      ClearPeriod.__set__('outputCosts', sinon.stub());
      ClearPeriod.__get__('outputCosts').yields();

      ClearPeriod.__set__('mcpsRetentions', sinon.stub());
      ClearPeriod.__get__('mcpsRetentions').yields();

      ClearPeriod.__set__('mcpsNegatives', sinon.stub());
      ClearPeriod.__get__('mcpsNegatives').yields();

      done();
    });

    it('should call all individual methods', (done) => {
      // Act
      ClearPeriod(event, () => {
        // Assert
        expect(ClearPeriod.__get__('sales').called).to.be.true;
        expect(ClearPeriod.__get__('sales').calledWith(event)).to.be.true;
        expect(ClearPeriod.__get__('inputCosts').called).to.be.true;
        expect(ClearPeriod.__get__('inputCosts').calledWith(event)).to.be.true;
        expect(ClearPeriod.__get__('outputCosts').called).to.be.true;
        expect(ClearPeriod.__get__('outputCosts').calledWith(event)).to.be.true;
        expect(ClearPeriod.__get__('mcpsRetentions').called).to.be.true;
        expect(ClearPeriod.__get__('mcpsRetentions').calledWith(event)).to.be.true;
        expect(ClearPeriod.__get__('mcpsNegatives').called).to.be.true;
        expect(ClearPeriod.__get__('mcpsNegatives').calledWith(event)).to.be.true;
        done();
      });
    });

    describe('When no errors are returned', () => {
      it('should call all individual methods', (done) => {
        // Act
        ClearPeriod(event, (err) => {
          // Assert
          expect(err).to.be.null;
          done();
        });
      });
    });

    describe('When sales returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        ClearPeriod.__get__('sales').yields(expectedError);
        // Act
        ClearPeriod(event, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('When inputCosts returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        ClearPeriod.__get__('inputCosts').yields(expectedError);
        // Act
        ClearPeriod(event, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('When outputCosts returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        ClearPeriod.__get__('outputCosts').yields(expectedError);
        // Act
        ClearPeriod(event, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('When mcpsRetentions returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        ClearPeriod.__get__('mcpsRetentions').yields(expectedError);
        // Act
        ClearPeriod(event, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('When mcpsNegatives returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        ClearPeriod.__get__('mcpsNegatives').yields(expectedError);
        // Act
        ClearPeriod(event, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
  });
});
