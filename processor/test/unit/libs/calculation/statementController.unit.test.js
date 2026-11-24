const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomDate, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/periodController.unit.test.js');

const sinon = require('sinon');
const { expect } = require('chai');

const Contract = require('../../../../models/contract');
const Period = require('../../../../models/period');
const Escalation = require('../../../../models/escalation');
const StatementController = require('../../../../libs/calculation/statementController');
const Statement = require('../../../../models/statement');
const CreatePeriodFiles = require('../../../../libs/calculation/period/createPeriodFiles');
const PaymentGroup = require('../../../../models/paymentGroup');
const Payment = require('../../../../models/payment');

describe('statementController unit tests', () => {
  beforeEach((done) => {
    sinon.restore();
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#setEscalationStartingFigures', () => {
    let statement; let period; let contractId; let contract;
    beforeEach((done) => {
      contractId = randomId();
      contract = { _id: contractId };
      period = { _id: randomId(), clientId: randomId(), startDate: randomDate(), escalationStartingFigures: [{ contractId, escalationTracking: {} }, { contractId: randomId() }] };
      statement = { _id: randomId(), periodId: period._id, contractId };

      sinon.stub(Contract, 'findById');
      Contract.findById.returns({ select: sinon.stub().resolves(contract) });

      sinon.stub(Escalation, 'find');
      Escalation.find.resolves([]);

      sinon.stub(Period, 'findByIdAndUpdate');
      Period.findByIdAndUpdate.resolves();

      done();
    });

    it('should clear the escalation figures of the contract from the period', async () => {
      Contract.findById.returns({ select: sinon.stub().resolves() });
      await StatementController.setEscalationStartingFigures(statement, period);
      const contractEscalations = period.escalationStartingFigures.find((escalation) => escalation.contractId === statement.contractId);
      expect(contractEscalations).to.be.undefined;
    });

    it('should call Contract.findById with the right args', async () => {
      await StatementController.setEscalationStartingFigures(statement, period);
      expect(Contract.findById.calledWith(statement.contractId)).to.be.true;
    });

    describe('when no contract is returned', () => {
      it('should return and not call Escalation.gind', async () => {
        Contract.findById.returns({ select: sinon.stub().resolves() });
        await StatementController.setEscalationStartingFigures(statement, period);
        expect(Escalation.find.called).to.be.false;
      });
    });

    it('should call Escalation.find with the right args', async () => {
      const expectedFilter = { clientId: period.clientId, startDate: { $lt: period.startDate }, contractId: contract._id };
      await StatementController.setEscalationStartingFigures(statement, period);
      expect(Escalation.find.calledWith(expectedFilter)).to.be.true;
    });

    it('should set the contract starting figures against the period and Period.findByIdAndUpdate with the rights args', async () => {
      const tracker = randomString();
      contract.escalationTracking = {};
      contract.escalationTracking[tracker] = { startingUnits: randomInt(), startingGross: randomInt(), startingNet: randomInt() };

      await StatementController.setEscalationStartingFigures(statement, period);
      const updatedStartingFigures = Period.findByIdAndUpdate.args[0][1].$set.escalationStartingFigures.find((escalation) => escalation.contractId === contractId);
      const expectedStartingFigure = { contractId, escalationTracking: {} };
      expectedStartingFigure.escalationTracking[tracker] = { units: contract.escalationTracking[tracker].startingUnits, gross: contract.escalationTracking[tracker].startingGross, net: contract.escalationTracking[tracker].startingNet };
      expect(updatedStartingFigures).to.deep.equal(expectedStartingFigure);
      expect(Period.findByIdAndUpdate.args[0][0]).to.eq(period._id);
    });
  });

  describe('#createSalesUnreportedFiles', () => {
    let period; let contractId; let statement; let client; let bigQuery;
    beforeEach((done) => {
      bigQuery = {};
      contractId = randomId();
      client = { _id: randomId(), features: {} };
      period = { _id: randomId(), clientId: randomId(), startDate: randomDate(), endDate: randomDate() };
      statement = { _id: randomId(), periodId: period._id, contractId };
      // Stubs
      sinon.stub(Statement, 'find').returns({ select: sinon.stub().returns({ lean: sinon.stub().resolves([statement]) }) });
      sinon.stub(CreatePeriodFiles, 'createUnreportedSalesCsv').resolves();
      sinon.stub(CreatePeriodFiles, 'createMechanicalUnreportedSalesCsv').yields();
      done();
    });
    it('Should call Statement.find with the right args', async () => {
      // Act
      await StatementController.createSalesUnreportedFiles({ statement, period, client, bigQuery });
      // Assert
      expect(Statement.find.calledWith({
        status: 'Processing',
        clientId: statement.clientId,
        periodId: statement.periodId,
        calculationStatus: {
          $in: [
            'Calculating Sales',
            'Calculating Costs',
            'Updating Catalogue Data',
          ],
        },
      })).to.be.true;
    });
    describe('When Statement.find errors', () => {
      it('Should throw an error', async () => {
        // Arrange
        const error = new Error(randomString());
        Statement.find.returns({ select: sinon.stub().returns({ lean: sinon.stub().rejects(error) }) });
        // Act
        try {
          await StatementController.createSalesUnreportedFiles({ statement, period, client, bigQuery });
        } catch (e) {
          // Assert
          expect(e).to.deep.eq(error);
        }
      });
    });
    describe('when there are no statements AND period is NOT Mechanical', () => {
      it('Should call CreatePeriodFiles.createUnreportedSalesCsv with the right args', async () => {
        // Arrange
        Statement.find.returns({ select: sinon.stub().returns({ lean: sinon.stub().resolves([]) }) });
        // Act
        await StatementController.createSalesUnreportedFiles({ statement, period, client, bigQuery });
        // Assert
        expect(CreatePeriodFiles.createUnreportedSalesCsv.calledWith({ period, client, excludedSalesFiles: [] })).to.be.true;
      });
    });
    describe('When there are no statements AND period is Mechanical', () => {
      it('Should call CreatePeriodFiles.createMechanicalUnreportedSalesCsv', async () => {
        // Arrange
        Statement.find.returns({ select: sinon.stub().returns({ lean: sinon.stub().resolves([]) }) });
        period.contractType = 'Mechanical';
        // Act
        await StatementController.createSalesUnreportedFiles({ statement, period, client, bigQuery });
        // Assert
        expect(CreatePeriodFiles.createMechanicalUnreportedSalesCsv.called).to.be.true;
      });
    });
    describe('When there are Statements', () => {
      it('Should not call createUnreportedSalesCsv', async () => {
        // Act
        await StatementController.createSalesUnreportedFiles({ statement, period, client, bigQuery });
        // Assert
        expect(CreatePeriodFiles.createUnreportedSalesCsv.called).to.be.false;
      });
      it('Should not call createMechanicalUnreportedSalesCsv', async () => {
        // Arrange
        period.contractType = 'Mechanical';
        // Act
        await StatementController.createSalesUnreportedFiles({ statement, period, client, bigQuery });
        // Assert
        expect(CreatePeriodFiles.createMechanicalUnreportedSalesCsv.called).to.be.false;
      });
    });
    describe('When createUnreportedSalesCsv errors', () => {
      it('Should throw an error', async () => {
        // Arrange
        const error = new Error(randomString());
        CreatePeriodFiles.createUnreportedSalesCsv.rejects(error);
        // Act
        try {
          await StatementController.createSalesUnreportedFiles({ statement, period, client, bigQuery });
        } catch (e) {
          // Assert
          expect(e).to.deep.eq(error);
        }
      });
    });
    describe('When createMechanicalUnreportedSalesCsv errors', () => {
      it('Should throw an error', async () => {
        // Arrange
        period.contractType = 'Mechanical';
        const error = new Error(randomString());
        CreatePeriodFiles.createMechanicalUnreportedSalesCsv.yields(error);
        // Act
        try {
          await StatementController.createSalesUnreportedFiles({ statement, period, client, bigQuery });
        } catch (e) {
          // Assert
          expect(e).to.deep.eq(error);
        }
      });
    });
  });

  describe('#checkPaymentGroup', () => {
    let period;
    let client;
    let paymentGroup;

    beforeEach((done) => {
      sinon.stub(PaymentGroup, 'findOne');
      sinon.stub(Payment, 'countDocuments');
      sinon.stub(PaymentGroup.prototype, 'deleteOne');

      period = { _id: randomId(), name: randomString() };
      client = { _id: randomId() };
      paymentGroup = new PaymentGroup({ _id: randomId() });
      PaymentGroup.findOne.resolves(paymentGroup);

      done();
    });

    describe('when generatePayments is false', () => {
      it('should not call PaymentGroup.findOne', (done) => {
        // Act
        StatementController.checkPaymentGroup(period, client, false, (err) => {
          // Assert
          expect(PaymentGroup.findOne.called).to.be.false;
          done();
        });
      });
    });

    describe('when generatePayments is true', () => {
      it('should call PaymentGroup.findOne with the right args', (done) => {
        // Act
        StatementController.checkPaymentGroup(period, client, true, (err) => {
          // Assert
          expect(PaymentGroup.findOne.calledWith({ clientId: client._id.toString(), periodId: period._id.toString() })).to.be.true;
          done();
        });
      });

      it('should call Payment.countDocuments with the right args', (done) => {
        // Act
        StatementController.checkPaymentGroup(period, client, true, (err) => {
          // Assert
          expect(Payment.countDocuments.calledWith({ clientId: client._id.toString(), paymentGroupId: paymentGroup._id.toString() })).to.be.true;
          done();
        });
      });

      describe('when PaymentGroup.findOne returns nothing', () => {
        it('should call the callback without counting documents or attempting to delete', (done) => {
          // Arrange
          PaymentGroup.findOne.resolves(null);
          // Act
          StatementController.checkPaymentGroup(period, client, true, (err) => {
            // Assert
            expect(Payment.countDocuments.called).to.be.false;
            expect(PaymentGroup.prototype.deleteOne.called).to.be.false;
            expect(err).to.be.undefined;
            done();
          });
        });
      });

      describe('when no payments are returned', () => {
        it('should call paymentGroup.deleteOne', (done) => {
          // Arrange
          Payment.countDocuments.resolves(0);
          PaymentGroup.prototype.deleteOne.resolves();
          // Act
          StatementController.checkPaymentGroup(period, client, true, (err) => {
            // Assert
            expect(PaymentGroup.prototype.deleteOne.called).to.be.true;
            done();
          });
        });

        describe('when paymentGroup.deleteOne returns an error', () => {
          it('should return the error to the callback', (done) => {
            // Arrange
            const expectedError = new Error(randomString());
            Payment.countDocuments.resolves(0);
            PaymentGroup.prototype.deleteOne.rejects(expectedError);
            // Act
            StatementController.checkPaymentGroup(period, client, true, (err) => {
              // Assert
              expect(err).to.eq(expectedError);
              done();
            });
          });
        });
      });

      describe('when payments are returned', () => {
        it('should not call paymentGroup.deleteOne', (done) => {
          // Arrange
          Payment.countDocuments.resolves(1);
          // Act
          StatementController.checkPaymentGroup(period, client, true, (err) => {
            // Assert
            expect(PaymentGroup.prototype.deleteOne.called).to.be.false;
            expect(err).to.be.undefined;
            done();
          });
        });
      });
    });
  });
});
