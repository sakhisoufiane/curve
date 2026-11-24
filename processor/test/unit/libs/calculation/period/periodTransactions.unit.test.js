const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomBoolean } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/period/periodStatementData.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');
const { ObjectId } = require('mongodb');

const Statement = require('../../../../../models/statement');
const Contract = require('../../../../../models/contract');

describe('PeriodTransactions Unit Tests', () => {
  let PeriodTransactions;
  let period; let db; let client;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    PeriodTransactions = rewire('../../../../../libs/calculation/period/periodTransactions');

    period = { _id: randomId(), clientId: randomId(), recalculation: {} };

    client = { _id: randomId() };

    db = { type: randomString() };

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#create', () => {
    let statement;
    let StatementTransactions; let SubtractFromTransactions; let TaxAmounts; let AddToTransactions; let ProfitShareCheckPayments;
    let ProfitShare; let AutoPayments;
    let generatePayments;
    beforeEach((done) => {
      generatePayments = randomBoolean();

      statement = { _id: randomId() };
      sinon.stub(Statement, 'find').resolves([statement]);

      sinon.stub(PeriodTransactions, 'orderStatements').yields(null, [statement]);

      StatementTransactions = { create: sinon.stub().yields() };
      PeriodTransactions.__set__('StatementTransactions', StatementTransactions);

      SubtractFromTransactions = { create: sinon.stub().yields() };
      PeriodTransactions.__set__('SubtractFromTransactions', SubtractFromTransactions);

      TaxAmounts = { createByStage: sinon.stub().yields() };
      PeriodTransactions.__set__('TaxAmounts', TaxAmounts);

      AddToTransactions = { create: sinon.stub().yields() };
      PeriodTransactions.__set__('AddToTransactions', AddToTransactions);

      ProfitShare = { createTransactions: sinon.stub().yields(), manageNegativeBalanceFromTransfers: sinon.stub().yields(), checkProfitSharePayments: sinon.stub().resolves() };
      PeriodTransactions.__set__('ProfitShare', ProfitShare);

      PeriodTransactions.__set__('setClosingBalance', sinon.stub().yields());

      AutoPayments = { create: sinon.stub().yields() };
      PeriodTransactions.__set__('AutoPayments', AutoPayments);

      done();
    });

    it('should call Statement.find with the right args', (done) => {
      // Act
      PeriodTransactions.create(period, db, client, generatePayments, () => {
        // Assert
        expect(Statement.find.calledWith({ clientId: period.clientId, periodId: period._id.toString() })).to.be.true;
        done();
      });
    });

    describe('when Statement.find returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        Statement.find.rejects(expectedError);
        // Act
        PeriodTransactions.create(period, db, client, generatePayments, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });

    it('should call PeriodTransactions.orderStatements with the right args', (done) => {
      // Act
      PeriodTransactions.create(period, db, client, generatePayments, () => {
        // Assert
        expect(PeriodTransactions.orderStatements.calledWith([statement])).to.be.true;
        done();
      });
    });

    describe('when PeriodTransactions.orderStatements returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        PeriodTransactions.orderStatements.yields(expectedError);
        // Act
        PeriodTransactions.create(period, db, client, generatePayments, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when recalculation.contractIds', () => {
      it('should only create transactions for madified contracts', (done) => {
        // Arrange
        statement.contractId = randomId();
        const statementToNotCalculate = { _id: randomId(), contractId: randomId() };
        Statement.find.resolves([statement, statementToNotCalculate]);
        period.recalculation = { contractIds: [statement.contractId] };
        // Act
        PeriodTransactions.create(period, db, client, generatePayments, () => {
          // Assert
          expect(StatementTransactions.create.calledWith(statementToNotCalculate)).to.be.false;
          done();
        });
      });
    });

    it('should call StatementTransactions.create with the right args', (done) => {
      // Act
      PeriodTransactions.create(period, db, client, generatePayments, () => {
        // Assert
        expect(StatementTransactions.create.calledWith(statement, client, period)).to.be.true;
        done();
      });
    });

    it('should call SubtractFromTransactions.create with the right args', (done) => {
      // Act
      PeriodTransactions.create(period, db, client, generatePayments, () => {
        // Assert
        expect(SubtractFromTransactions.create.calledWith(statement, client, period)).to.be.true;
        done();
      });
    });

    it('should call TaxAmounts.createByStage with the right args for early stage', (done) => {
      // Act
      PeriodTransactions.create(period, db, client, generatePayments, () => {
        // Assert
        expect(TaxAmounts.createByStage.calledWith(statement, 'Early', period, client)).to.be.true;
        done();
      });
    });

    it('should call AddToTransactions.create with the right args', (done) => {
      // Act
      PeriodTransactions.create(period, db, client, generatePayments, () => {
        // Assert
        expect(AddToTransactions.create.calledWith(statement, client, period)).to.be.true;
        done();
      });
    });

    it('should call TaxAmounts.createByStage with the right args for late stage', (done) => {
      // Act
      PeriodTransactions.create(period, db, client, generatePayments, () => {
        // Assert
        expect(TaxAmounts.createByStage.calledWith(statement, 'Late', period, client)).to.be.true;
        done();
      });
    });

    it('should call ProfitShare.createTransactions with the right args', (done) => {
      // Act
      PeriodTransactions.create(period, db, client, generatePayments, () => {
        // Assert
        expect(ProfitShare.createTransactions.calledWith(statement, period)).to.be.true;
        done();
      });
    });

    it('should call setClosingBalance with the right args', (done) => {
      // Act
      PeriodTransactions.create(period, db, client, generatePayments, () => {
        // Assert
        expect(PeriodTransactions.__get__('setClosingBalance').calledWith(statement, period)).to.be.true;
        done();
      });
    });

    it('should call AutoPayments.create with the right args', (done) => {
      // Act
      PeriodTransactions.create(period, db, client, generatePayments, () => {
        // Assert
        expect(AutoPayments.create.calledWith(statement, period, generatePayments)).to.be.true;
        done();
      });
    });

    it('should call ProfitShare.manageNegativeBalanceFromTransfers with the right args', (done) => {
      // Act
      PeriodTransactions.create(period, db, client, generatePayments, () => {
        // Assert
        expect(ProfitShare.manageNegativeBalanceFromTransfers.calledWith(statement, period)).to.be.true;
        done();
      });
    });
  });

  describe('#orderStatements', () => {
    let statements; let contracts;

    beforeEach((done) => {
      contracts = [
        {
          _id: randomId(),
          name: 'Contract 1',
          crossContracts: [],
        },
        {
          _id: randomId(),
          name: 'Contract 2',
          crossContracts: [],
        },
        {
          _id: randomId(),
          name: 'Contract 3',
          crossContracts: [],
        },
      ];

      statements = [
        { _id: randomId(), name: 'Statement 1', contractId: contracts[0]._id },
        { _id: randomId(), name: 'Statement 2', contractId: contracts[1]._id },
        { _id: randomId(), name: 'Statement 3', contractId: contracts[2]._id },
      ];
      sinon.stub(Contract, 'find');

      Contract.find.resolves(contracts);

      done();
    });

    describe('when statements is not an array', () => {
      it('should return an error to the callback', (done) => {
        // Arrange
        statements = { _id: randomString() };
        const expectedError = 'Requires an array to be passed';
        // Act
        PeriodTransactions.orderStatements(statements, (err) => {
          // Assert
          expect(err.message).to.eq(expectedError);
          done();
        });
      });
    });

    it('should call Contract.find with the right args', (done) => {
      // Arrange
      const contractIds = statements.map((statement) => ObjectId.createFromHexString(statement.contractId));
      // Act
      PeriodTransactions.orderStatements(statements, (err) => {
        // Assert
        expect(Contract.find.calledWith({ _id: { $in: contractIds } }, { crossContracts: 1 })).to.be.true;
        done();
      });
    });

    it('should flush out any null values', (done) => {
      // Arrange
      const expectedContractIds = statements.map((statement) => ObjectId.createFromHexString(statement.contractId));
      statements.push(null);
      // Act
      PeriodTransactions.orderStatements(statements, (err) => {
        // Assert
        const contractIds = Contract.find.args[0][0]._id.$in;
        expect(contractIds).to.deep.eq(expectedContractIds);
        done();
      });
    });

    it('should sort the statements', (done) => {
      // Arrange
      contracts[1].crossContracts = [{ contractId: contracts[2]._id }];
      contracts[2].crossContracts = [{ contractId: contracts[0]._id }, { contractId: contracts[1]._id }];
      const expectedOutput = [statements[2], statements[1], statements[0]];
      // Act
      PeriodTransactions.orderStatements(statements, (err, output) => {
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
  });
});
