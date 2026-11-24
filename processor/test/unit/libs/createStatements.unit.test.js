process.env.NODE_ENV = 'test';

const { expect } = require('chai');
const { ObjectId } = require('mongodb');
const sinon = require('sinon');
const rewire = require('rewire');
const { testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const Contract = require('../../../models/contract');
const Statement = require('../../../models/statement');

describe('CreateStatements', () => {
  let CreateStatements;
  let distinctResult;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    CreateStatements = rewire('../../../libs/createStatements');

    distinctResult = [testUtils.randomId(), testUtils.randomId(), testUtils.randomId()];

    sinon.stub(Contract, 'findOne').resolves();
    sinon.stub(Contract, 'distinct').resolves(distinctResult);

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

  describe('getContractIdsFromClient', () => {
    it('should should exist', (done) => {
      // Assert
      expect(CreateStatements.__get__('getContractIdsFromClient')).to.exist;
      done();
    });

    it('should call collection.distinct with the right arguments when contractType is NOT Mechanical', (done) => {
      // Arrange
      const clientId = testUtils.randomId();
      const accountingPeriodType = testUtils.randomString();
      const contractType = testUtils.randomString();
      const recalculation = {};
      const expectedFilter = {
        clientId,
        accountingPeriod: accountingPeriodType,
        active: true,
        contractType: { $ne: 'Mechanical' },
      };
      // Act
      CreateStatements.__get__('getContractIdsFromClient')(clientId, recalculation, accountingPeriodType, contractType, (err) => {
        // Assert
        expect(Contract.distinct.called).to.be.true;
        expect(Contract.distinct.calledWith('_id', expectedFilter)).to.be.true;
        done(err);
      });
    });

    it('should call collection.distinct with the right arguments when contractType is Mechanical', (done) => {
      // Arrange
      const clientId = testUtils.randomId();
      const accountingPeriodType = testUtils.randomString();
      const contractType = 'Mechanical';
      const recalculation = {};
      const expectedFilter = {
        clientId,
        accountingPeriod: accountingPeriodType,
        active: true,
        contractType: 'Mechanical',
      };
      // Act
      CreateStatements.__get__('getContractIdsFromClient')(clientId, recalculation, accountingPeriodType, contractType, (err) => {
        // Assert
        expect(Contract.distinct.called).to.be.true;
        expect(Contract.distinct.calledWith('_id', expectedFilter)).to.be.true;
        done(err);
      });
    });

    describe('when distinct returns an empty array', () => {
      it('should return an empty object when no aggregate result', (done) => {
        // Arrange
        const clientId = testUtils.randomId();
        const accountingPeriodType = testUtils.randomString();
        const contractType = 'Mechanical';
        const recalculation = {};
        Contract.distinct.resolves([]);
        // Act
        CreateStatements.__get__('getContractIdsFromClient')(clientId, recalculation, accountingPeriodType, contractType, (err, result) => {
          // Assert
          expect(result).to.deep.eq([]);
          done(err);
        });
      });
    });

    describe('when distinct returns data', () => {
      it('should return an empty object when no aggregate result', (done) => {
        // Arrange
        const clientId = testUtils.randomId();
        const accountingPeriodType = testUtils.randomString();
        const contractType = 'Mechanical';
        const recalculation = {};
        // Act
        CreateStatements.__get__('getContractIdsFromClient')(clientId, recalculation, accountingPeriodType, contractType, (err, result) => {
          // Assert
          expect(result).to.deep.eq(distinctResult);
          done(err);
        });
      });
    });

    describe('when distinct returns an error', () => {
      it('should return an empty object when no aggregate result', () => {
        // Arrange
        const clientId = testUtils.randomId();
        const accountingPeriodType = testUtils.randomString();
        const contractType = 'Mechanical';
        const distinctError = testUtils.randomString();
        const recalculation = {};
        Contract.distinct.rejects(distinctError);
        // Act
        CreateStatements.__get__('getContractIdsFromClient')(clientId, recalculation, accountingPeriodType, contractType, (err, result) => {
          // Assert
          expect(err).to.eq(distinctError);
        });
      });
    });
  });

  describe('createContract', () => {
    const contractId = testUtils.randomId();
    const periodId = testUtils.randomId();
    const clientId = testUtils.randomId();
    const year = testUtils.randomFloat();
    const accountingPeriod = testUtils.randomString();
    const date = testUtils.randomFloat();
    const periodType = testUtils.randomString();
    const contract = {
      name: testUtils.randomString(),
      currency: testUtils.randomString(),
    };

    let statement;

    beforeEach((done) => {
      statement = new Statement({
        clientId,
        periodId,
        contractId,
        name: `${year} - ${accountingPeriod}: ${contract.name}`,
        year,
        accountingPeriod,
        date,
        periodType,
        currency: contract.currency,
        status: 'Pending',
      });
      sinon.stub(Statement.prototype, 'save').resolves();
      done();
    });

    it('should should exist', (done) => {
      // Assert
      expect(CreateStatements.__get__('createContract')).to.exist;
      done();
    });

    describe('when collection.findOne returns an error', () => {
      it('should return an error', () => {
        // Arrange
        const expectedError = testUtils.randomString();
        Contract.findOne.rejects(expectedError);
        // Act
        CreateStatements.__get__('createContract')(contractId, periodId, clientId, year, accountingPeriod, date, periodType, (err, result) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });

    describe('when collection.findOne doesnt return a contract', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = `No contract found with ID ${contractId}`;
        // Act
        CreateStatements.__get__('createContract')(contractId, periodId, clientId, year, accountingPeriod, date, periodType, (err, result) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    it('should call collection.findOne with the right arguments', (done) => {
      // Arrange
      const expectedFilter = { _id: new ObjectId(contractId) };
      // Act
      CreateStatements.__get__('createContract')(contractId, periodId, clientId, year, accountingPeriod, date, periodType, () => {
        // Assert
        expect(Contract.findOne.calledWith(expectedFilter)).to.be.true;
        done();
      });
    });

    it('should call collection.insertOne with the right arguments', (done) => {
      // Arrange
      Contract.findOne.resolves(contract);
      // Act
      CreateStatements.__get__('createContract')(contractId, periodId, clientId, year, accountingPeriod, date, periodType, (err, result) => {
        // Assert
        expect(statement.save.called).to.be.true;
        done();
      });
    });

    it('should return the right result', (done) => {
      // Arrange
      Statement.prototype.save.resolves(statement);
      Contract.findOne.resolves(contract);
      // Act
      CreateStatements.__get__('createContract')(contractId, periodId, clientId, year, accountingPeriod, date, periodType, (err, result) => {
        // Assert
        expect(result).to.eq(statement);
        done();
      });
    });

    describe('when insert one returns an error', () => {
      it('should return the right result', () => {
        // Arrange
        const expctedError = testUtils.randomString();
        Statement.prototype.save.rejects(expctedError);
        Contract.findOne.resolves(contract);
        // Act
        CreateStatements.__get__('createContract')(contractId, periodId, clientId, year, accountingPeriod, date, periodType, (err, result) => {
          // Assert
          expect(err).to.eq(expctedError);
        });
      });
    });
  });

  describe('module.exports', () => {
    const expectedContractIds = [testUtils.randomId()];
    const event = {
      databaseUrl: testUtils.randomString(),
      clientId: testUtils.randomId(),
      recalculation: {},
      accountingPeriodType: testUtils.randomString(),
      contractType: testUtils.randomString(),
      periodId: testUtils.randomId(),
      year: testUtils.randomFloat(),
      accountingPeriod: testUtils.randomString(),
      date: testUtils.randomFloat(),
      periodType: testUtils.randomString(),
    };

    beforeEach((done) => {
      CreateStatements.__set__('getContractIdsFromClient', sinon.stub());
      CreateStatements.__get__('getContractIdsFromClient').yields(null, expectedContractIds);

      CreateStatements.__set__('createContract', sinon.stub());
      CreateStatements.__get__('createContract').yields();

      done();
    });

    it('should call getContractIdsFromClient with the right arguments', (done) => {
      // Act
      CreateStatements(event, (err) => {
        // Assert
        expect(CreateStatements.__get__('getContractIdsFromClient').called).to.be.true;
        expect(CreateStatements.__get__('getContractIdsFromClient').calledWith(
          event.clientId,
          event.recalculation,
          event.accountingPeriodType,
          event.contractType,
        )).to.be.true;
        done(err);
      });
    });

    it('should call createContract with the right arguments', (done) => {
      // Act
      CreateStatements(event, (err) => {
        // Assert
        expect(CreateStatements.__get__('createContract').called).to.be.true;
        expect(CreateStatements.__get__('createContract').calledWith(
          expectedContractIds[0],
          event.periodId,
          event.clientId,
          event.year,
          event.accountingPeriod,
          event.date,
          event.periodType,
        )).to.be.true;
        done(err);
      });
    });

    it('should return the right result', (done) => {
      // Arrange
      const expectedResult = `${expectedContractIds.length} contracts created`;
      // Act
      CreateStatements(event, (err, result) => {
        // Assert
        expect(result).to.deep.eq({ result: expectedResult });
        done(err);
      });
    });

    describe('when getContractIdsFromClient returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        CreateStatements.__get__('getContractIdsFromClient').yields(expectedError);
        // Act
        CreateStatements(event, (err) => {
        // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when createContract returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        CreateStatements.__get__('createContract').yields(expectedError);
        // Act
        CreateStatements(event, (err) => {
        // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
  });
});
