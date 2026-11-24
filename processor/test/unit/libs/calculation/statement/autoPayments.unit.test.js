const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString, randomInt, randomDate, randomBoolean, randomError } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** test/unit/libs/calculation/statement/associatedAddToContractIds.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Contract = require('../../../../../models/contract');
const Client = require('../../../../../models/client');
const Transaction = require('../../../../../models/transaction');
const Statement = require('../../../../../models/statement');
const PaymentGroup = require('../../../../../models/paymentGroup');
const Payment = require('../../../../../models/payment');

describe('AutoPayments Unit Tests', () => {
  let AutoPayments;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    AutoPayments = rewire('../../../../../libs/calculation/statement/autoPayments');

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#create', () => {
    let statement; let period; let generatePayments; let contract; let findByIdAndUpdateStub;

    beforeEach((done) => {
      period = { _id: randomId() };
      contract = { _id: randomId() };
      statement = { periodId: period._id, contractId: contract._id };
      generatePayments = true;

      sinon.stub(AutoPayments, 'triggerAutoPayment').yields(true);
      sinon.stub(Contract, 'findById').resolves(contract);

      findByIdAndUpdateStub = sinon.stub(Statement, 'findByIdAndUpdate').resolves();

      sinon.stub(Transaction.prototype, 'save').resolves();
      sinon.stub(PaymentGroup, 'findOne').resolves();
      sinon.stub(PaymentGroup.prototype, 'save').resolves();
      sinon.stub(Payment.prototype, 'save').resolves();
      done();
    });

    it('should call Contract.findById with the right args', () => {
      // Act
      AutoPayments.create(statement, period, generatePayments, () => {
        // Assert
        expect(Contract.findById.calledWith(statement.contractId)).to.be.true;
      });
    });

    describe('when Contract.findById returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = new Error(`Could not find contract with the ID ${statement.contractId} in creating auto payments`);
        Contract.findById.rejects(expectedError);
        // Act
        AutoPayments.create(statement, period, generatePayments, (err) => {
          // Assert
          expect(err.message).to.eq(expectedError.message);
        });
      });
    });
    describe('when Contract.findById doesn\'t return a contract', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = new Error(`Could not find contract with the ID ${statement.contractId} in creating auto payments`);
        Contract.findById.rejects(expectedError);
        // Act
        AutoPayments.create(statement, period, generatePayments, (err) => {
          // Assert
          expect(err.message).to.eq(expectedError.message);
        });
      });
    });
    it('should call AutoPayments.triggerAutoPayment with the right args', () => {
      // Arrange
      period.endDate = randomDate();
      const expectedAccountingDate = new Date(period.endDate);
      expectedAccountingDate.setDate(expectedAccountingDate.getDate() + 1);
      // Act
      AutoPayments.create(statement, period, generatePayments, (err) => {
        // Assert
        expect(AutoPayments.triggerAutoPayment.calledWith(statement, contract, expectedAccountingDate)).to.be.true;
      });
    });
    it('should call Statement.findByIdAndUpdate with the right args', () => {
      // Arrange
      period.endDate = randomDate();
      const expectedAccountingDate = new Date(period.endDate);
      expectedAccountingDate.setDate(expectedAccountingDate.getDate() + 1);
      const reason = randomString();
      const triggerAutoPayment = randomBoolean();
      AutoPayments.triggerAutoPayment.yields(triggerAutoPayment, reason);
      // Act
      AutoPayments.create(statement, period, generatePayments, (err) => {
        // Assert
        expect(findByIdAndUpdateStub.calledWith(statement._id, { $set: { autoPaymentTriggered: triggerAutoPayment, autoPaymentNotTriggeredReason: reason } })).to.be.true;
      });
    });

    describe('when triggerAutoPayment', () => {
      beforeEach(() => {
        sinon.stub(Client, 'findById').resolves();
      });
      it('should create a payment transaction', () => {
        // Act
        AutoPayments.create(statement, period, generatePayments, (err) => {
          // Assert
          expect(Transaction.prototype.save.called).to.be.true;
        });
      });

      describe('when generatePayments is false', () => {
        it('should not create a payment', () => {
          // Arrange
          generatePayments = false;
          // Act
          AutoPayments.create(statement, period, generatePayments, (err) => {
            // Assert
            expect(Client.findById.called).to.be.false;
          });
        });
      });

      describe('when no contract.payeeId', () => {
        it('should no create a payment', () => {
          // Act
          AutoPayments.create(statement, period, generatePayments, (err) => {
            // Assert
            expect(Client.findById.called).to.be.false;
          });
        });
      });

      describe('when closingBalance is 0', () => {
        it('should no create a payment', () => {
          // Arrange
          AutoPayments.triggerAutoPayment.yields(true, randomString(), 0);
          // Act
          AutoPayments.create(statement, period, generatePayments, (err) => {
            // Assert
            expect(Client.findById.called).to.be.false;
          });
        });
      });

      it('should call Client.findById with the right args', () => {
        // Arrange
        statement._id = randomId();
        statement.clientId = randomId();
        AutoPayments.triggerAutoPayment.yields(true, randomString(), randomInt());
        contract.payees = [{ payeeId: randomId() }];
        contract.payeeBalanceCondition = 'Never';
        Client.findById.rejects(randomError());
        // Act
        AutoPayments.create(statement, period, generatePayments, () => {
          // Assert
          expect(Client.findById.calledWith(statement.clientId, 'homeCurrency features')).to.be.true;
        });
      });
      it('should call PaymentGroup.findOne with the right args', () => {
        // Arrange
        const paymentGroup = { _id: randomId() };
        PaymentGroup.findOne.resolves(paymentGroup);

        statement._id = randomId();
        statement.clientId = randomId();

        AutoPayments.triggerAutoPayment.yields(true, randomString(), randomInt());

        contract.payees = [{ payeeId: randomId() }];
        contract.payeeBalanceCondition = 'Never';

        Client.findById.resolves();
        // Act
        AutoPayments.create(statement, period, generatePayments, () => {
          // Assert
          expect(PaymentGroup.findOne.calledWith({ clientId: statement.clientId, periodId: statement.periodId })).to.be.true;
        });
      });

      describe('when no payment group is found', () => {
        beforeEach((done) => {
          statement._id = randomId();
          statement.clientId = randomId();

          AutoPayments.triggerAutoPayment.yields(true, randomString(), randomInt());

          contract.payees = [{ payeeId: randomId() }];
          contract.payeeBalanceCondition = 'Never';

          period.name = randomString();

          Client.findById.resolves();

          const paymentGroup = { _id: randomId() };

          PaymentGroup.findOne.resolves(null);
          PaymentGroup.prototype.save.resolves(paymentGroup);
          done();
        });
        it('should create a payment group', () => {
          // Act
          AutoPayments.create(statement, period, generatePayments, (err) => {
            // Assert
            expect(PaymentGroup.prototype.save.called).to.be.true;
          });
        });
        it('should create a payment', () => {
          // Act
          AutoPayments.create(statement, period, generatePayments, (err) => {
            // Assert
            expect(Payment.prototype.save.called).to.be.true;
          });
        });
      });

      describe('when payment group is found', () => {
        it('should create a payment', () => {
          // Arrange
          statement._id = randomId();
          statement.clientId = randomId();

          AutoPayments.triggerAutoPayment.yields(true, randomString(), randomInt());

          contract.payees = [{ payeeId: randomId() }];
          contract.payeeBalanceCondition = 'Never';

          period.name = randomString();

          Client.findById.resolves();

          const paymentGroup = { _id: randomId() };

          PaymentGroup.findOne.resolves(null);
          PaymentGroup.prototype.save.resolves(paymentGroup);
          // Act
          AutoPayments.create(statement, period, generatePayments, (err) => {
            // Assert
            expect(Payment.prototype.save.called).to.be.true;
          });
        });
      });
    });
  });

  describe('#triggerAutoPayment', () => {
    let statement; let contract; let accountingDate;

    beforeEach((done) => {
      contract = {
        _id: randomId(),
        autoPayment: true,
        type: 'Profit Share',
        autoPaymentConditions: [
          {
            contractId: randomId(),
            condition: 'Balance is Positive, Ignoring Advance',
          },
        ],
      };
      statement = {
        _id: randomString(),
        contractId: contract._id,
        withholdingTax: randomInt(),
      };

      AutoPayments.__set__('balanceAtDate', sinon.stub().yields(null, randomInt() + statement.withholdingTax));

      sinon.stub(Contract, 'findById').resolves(contract);
      sinon.stub(Statement, 'findOne').resolves(statement);
      done();
    });

    describe('when contract is profit share', () => {
      it('should call balanceAtDate with the right args', async () => {
        // Arrange
        statement.contractType = 'Profit Share';
        const options = { excludeReserves: true };
        accountingDate = randomDate();
        // Act
        AutoPayments.triggerAutoPayment(statement, contract, accountingDate, () => {
          // Assert
          expect(AutoPayments.__get__('balanceAtDate').calledWith(contract, accountingDate, options)).to.be.true;
        });
      });
    });

    describe('when contract is Profit Share - Flexible', () => {
      it('should call balanceAtDate with the right args', async () => {
        // Arrange
        statement.contractType = 'Profit Share - Flexible';
        const options = { excludeReserves: true };
        accountingDate = randomDate();
        // Act
        AutoPayments.triggerAutoPayment(statement, contract, accountingDate, () => {
          // Assert
          expect(AutoPayments.__get__('balanceAtDate').calledWith(contract, accountingDate, options)).to.be.true;
        });
      });
    });

    describe('when contract is not profit share or Profit Share - Flexible', () => {
      it('should call balanceAtDate with the right args', async () => {
        // Arrange
        statement.contractType = randomString();
        const options = {};
        accountingDate = randomDate();
        // Act
        AutoPayments.triggerAutoPayment(statement, contract, accountingDate, () => {
          // Assert
          expect(AutoPayments.__get__('balanceAtDate').calledWith(contract, accountingDate, options)).to.be.true;
        });
      });
    });

    describe('when no contract.minPayout', () => {
      it('should set contract.minPayout to 0', async () => {
        // Arrange
        statement.contractType = 'Profit Share - Flexible';
        // Act
        AutoPayments.triggerAutoPayment(statement, contract, accountingDate, () => {
          // Assert
          expect(contract.minPayout).to.equal(0);
        });
      });
    });

    describe('when contract.autoPayment is false', () => {
      it('should return false', async () => {
        // Arrange
        statement.contractType = 'Profit Share - Flexible';
        contract.autoPayment = false;
        // Act
        AutoPayments.triggerAutoPayment(statement, contract, accountingDate, (expectedResult) => {
          // Assert
          expect(expectedResult).to.be.false;
        });
      });
    });

    describe('when no contract.autoPaymentConditions, closingBalance - statement.withholdingTax > 0 and closingBalance - statement.withholdingTax >= minPayout', () => {
      it('should return true', async () => {
        // Arrange
        statement.contractType = 'Profit Share - Flexible';
        contract.autoPaymentConditions = [];
        contract.minPayout = 0;
        // Act
        AutoPayments.triggerAutoPayment(statement, contract, accountingDate, (expectedResult) => {
          // Assert
          expect(expectedResult).to.be.true;
        });
      });
    });

    describe('when contract.autoPaymentConditions, closingBalance - statement.withholdingTax > 0 and closingBalance - statement.withholdingTax >= minPayout', () => {
      beforeEach((done) => {
        contract.minPayout = 0;
        done();
      });
      describe('when autoPayment.contractId and autoPayment.condition', () => {
        it('should call Contract.findById with the right args', async () => {
          // Act
          AutoPayments.triggerAutoPayment(statement, contract, accountingDate, () => {
            // Assert
            expect(Contract.findById.calledWith(contract.autoPaymentConditions[0].contractId)).to.be.true;
          });
        });
        it('should call Statement.findOne with the right args', async () => {
          // Act
          AutoPayments.triggerAutoPayment(statement, contract, accountingDate, () => {
            // Assert
            expect(Statement.findOne.calledWith({ clientId: statement.clientId, contractId: contract._id.toString(), periodId: statement.periodId })).to.be.true;
          });
        });
        describe('when foundContract.type is Profit Share or Profit Share - Flexible', () => {
          it('should call balanceAtDate with the right args', async () => {
            // Arrange
            const statementId = statement ? statement._id.toString() : null;
            const contractBalanceFilter = { excludeTransferringStatement: statement._id.toString(), excludeStatementPayments: true, statementId, excludeContractTransfersTos: true };
            contractBalanceFilter.excludeReserves = true;
            contract.autoPaymentConditions[0].condition = randomString();
            // Act
            AutoPayments.triggerAutoPayment(statement, contract, accountingDate, () => {
              // Assert
              expect(AutoPayments.__get__('balanceAtDate').calledWith(contract, accountingDate, contractBalanceFilter)).to.be.true;
            });
          });
        });
        describe('when autoPayment.condition is Balance is Positive, Ignoring Advance', () => {
          it('should call balanceAtDate with the right args', async () => {
            // Arrange
            contract.type = randomString();
            const statementId = statement ? statement._id.toString() : null;
            const contractBalanceFilter = { excludeTransferringStatement: statement._id.toString(), excludeStatementPayments: true, statementId, excludeContractTransfersTos: true };
            contractBalanceFilter.excludeAdvance = true;
            // Act
            AutoPayments.triggerAutoPayment(statement, contract, accountingDate, () => {
              // Assert
              expect(AutoPayments.__get__('balanceAtDate').calledWith(contract, accountingDate, contractBalanceFilter)).to.be.true;
            });
          });
        });
        describe('when autoPayment.condition is not Balance is Positive, Ignoring Advance and foundContract.type is not Profit Share or Profit Share - Flexible', () => {
          it('should call balanceAtDate with the right args', async () => {
            // Arrange
            contract.type = randomString();
            contract.autoPaymentConditions[0].condition = randomString();
            const statementId = statement ? statement._id.toString() : null;
            const contractBalanceFilter = { excludeTransferringStatement: statement._id.toString(), excludeStatementPayments: true, statementId, excludeContractTransfersTos: true };
            // Act
            AutoPayments.triggerAutoPayment(statement, contract, accountingDate, () => {
              // Assert
              expect(AutoPayments.__get__('balanceAtDate').calledWith(contract, accountingDate, contractBalanceFilter)).to.be.true;
            });
          });
        });
        describe('when closingBalance is negative', () => {
          it('should set triggerAutoPayment to false and condition to Conditions Not Met', async () => {
            // Arrange
            const closingBalance = 0 - randomInt();
            AutoPayments.__get__('balanceAtDate').onCall(1).yields(null, closingBalance);
            // Act
            AutoPayments.triggerAutoPayment(statement, contract, accountingDate, (triggerAutoPayment, message) => {
              // Assert
              expect(triggerAutoPayment).to.be.false;
              expect(message).to.equal('Conditions Not Met');
            });
          });
        });
      });
    });
  });
});
