const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** test/unit/libs/calculation/statement/subtractFromTransactions.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Period = require('../../../../../models/period');
const Transaction = require('../../../../../models/transaction');
const Statement = require('../../../../../models/statement');
const Contract = require('../../../../../models/contract');

describe('SubtractFromTransactions Unit Tests', () => {
  let SubtractFromTransactions;
  let transactionExchangeRateData; let triggerAutoPaymentStub;
  let contractToCrossTo; let statement; let period; let contract; let client;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    SubtractFromTransactions = rewire('../../../../../libs/calculation/statement/subtractFromTransactions');

    contractToCrossTo = { _id: randomId() };

    statement = { _id: randomId(), name: randomString(), periodId: randomId(), clientId: randomId() };

    period = { _id: randomId() };

    client = { _id: randomId() };

    contract = {
      _id: randomId(),
      crossContracts: [
        {
          process: 'Subtract From',
          condition: 'Always',
        },
      ],
    };

    sinon.stub(Contract, 'findById').resolves(contract);
    sinon.stub(Transaction.prototype, 'save').resolves();
    sinon.stub(Statement, 'findOne').resolves(statement);
    sinon.stub(Period, 'findByIdAndUpdate').resolves();

    SubtractFromTransactions.__set__('balanceAtDate', sinon.stub());
    SubtractFromTransactions.__get__('balanceAtDate').yields(null, randomInt());

    transactionExchangeRateData = { name: randomString() };
    SubtractFromTransactions.__set__('getTransactionExchangeRateData', sinon.stub());
    SubtractFromTransactions.__get__('getTransactionExchangeRateData').returns(transactionExchangeRateData);

    triggerAutoPaymentStub = sinon.stub().yields();
    SubtractFromTransactions.__set__('Autopayments', { triggerAutoPayment: triggerAutoPaymentStub });
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#create', () => {
    it('should call Contract.findById with the right args', (done) => {
      // Act
      SubtractFromTransactions.create(statement, client, period, () => {
        // Assert
        expect(Contract.findById.calledWith(statement.contractId)).to.be.true;
        done();
      });
    });

    describe('when Contract.findById returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = new Error(`Could not find contract with the ID ${statement.contractId} in creating subtract from transactions`);
        Contract.findById.rejects(expectedError);
        // Act
        SubtractFromTransactions.create(statement, client, period, (err) => {
          // Assert
          expect(err.message).to.eq(expectedError.message);
        });
      });
    });

    describe('when no contract is returned', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = new Error(`Could not find contract with the ID ${statement.contractId} in creating subtract from transactions`);
        Contract.findById.resolves(null);
        // Act
        SubtractFromTransactions.create(statement, client, period, (err) => {
          // Assert
          expect(err.message).to.eq(expectedError.message);
          done();
        });
      });
    });

    it('should call balanceAtDate to get the opening balance', (done) => {
      // Act
      SubtractFromTransactions.create(statement, client, period, (err) => {
        // Assert
        expect(SubtractFromTransactions.__get__('balanceAtDate').called).to.be.true;
        done();
      });
    });

    it('should call balanceAtDate to get the closing balance', (done) => {
      // Act
      SubtractFromTransactions.create(statement, client, period, (err) => {
        // Assert
        expect(SubtractFromTransactions.__get__('balanceAtDate').called).to.be.true;
        done();
      });
    });

    describe('for each of the contract.crossContracts', () => {
      describe('when crossContract.process is Subtract From', () => {
        beforeEach((done) => {
          contract.crossContracts[0].process = 'Subtract From';
          contract.crossContracts[0].whenAutoPaymentTriggered = true;
          triggerAutoPaymentStub.yields(true);
          SubtractFromTransactions.__get__('Autopayments', { triggerAutoPayment: triggerAutoPaymentStub });
          done();
        });
        describe('when crossContract.condition is Always', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].condition = 'Always';
            // Act
            SubtractFromTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(SubtractFromTransactions.__get__('Autopayments.triggerAutoPayment').called).to.be.true;
              done();
            });
          });
        });
        describe('when crossContract.condition is Always transfer Income', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].condition = 'Always transfer Income';
            // Act
            SubtractFromTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(SubtractFromTransactions.__get__('Autopayments.triggerAutoPayment').called).to.be.true;
              done();
            });
          });
        });
        describe('when crossContract.condition is Always transfer Income and Costs', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].condition = 'Always transfer Income and Costs';
            // Act
            SubtractFromTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(SubtractFromTransactions.__get__('Autopayments.triggerAutoPayment').called).to.be.true;
              done();
            });
          });
        });
        describe('when crossContract.condition is Always transer Income and Costs', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].condition = 'Always transer Income and Costs';
            // Act
            SubtractFromTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(SubtractFromTransactions.__get__('Autopayments.triggerAutoPayment').called).to.be.true;
              done();
            });
          });
        });
        describe('when crossContract.condition is Always transfer Income, Costs and Reserves', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].condition = 'Always transfer Income, Costs and Reserves';
            // Act
            SubtractFromTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(SubtractFromTransactions.__get__('Autopayments.triggerAutoPayment').called).to.be.true;
              done();
            });
          });
        });
        describe('when crossContract.condition is Balance is Greater Than Minimum Payout and closingBalance > contract.minPayout', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].condition = 'Balance is Greater Than Minimum Payout';
            contract.minPayout = randomInt();
            SubtractFromTransactions.__get__('balanceAtDate').yields(null, contract.minPayout + 1);
            // Act
            SubtractFromTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(SubtractFromTransactions.__get__('Autopayments.triggerAutoPayment').called).to.be.true;
              done();
            });
          });
        });
        describe('when crossContract.condition is Always transfer Balance Minus Opening', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].condition = 'Always transfer Balance Minus Opening';
            // Act
            SubtractFromTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(SubtractFromTransactions.__get__('Autopayments.triggerAutoPayment').called).to.be.true;
              done();
            });
          });
        });
        describe('when crossContract.condition is Positive and closingBalance > 0', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].condition = 'Positive';
            SubtractFromTransactions.__get__('balanceAtDate').yields(null, randomInt());
            // Act
            SubtractFromTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(SubtractFromTransactions.__get__('Autopayments.triggerAutoPayment').called).to.be.true;
              done();
            });
          });
        });
        describe('when crossContract.condition is Balance Minus Opening is Positive and closingBalance - openingBalance > 0', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].condition = 'Balance Minus Opening is Positive';
            SubtractFromTransactions.__get__('balanceAtDate').onCall(0).yields(null, 1);
            SubtractFromTransactions.__get__('balanceAtDate').onCall(1).yields(null, 2);
            // Act
            SubtractFromTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(SubtractFromTransactions.__get__('Autopayments.triggerAutoPayment').called).to.be.true;
              done();
            });
          });
        });
        describe('when crossContract.condition is Income is Positive and statement.netAmount > 0', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].condition = 'Income is Positive';
            statement.netAmount = randomInt();
            // Act
            SubtractFromTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(SubtractFromTransactions.__get__('Autopayments.triggerAutoPayment').called).to.be.true;
              done();
            });
          });
        });
        describe('when crossContract.condition is Income and Costs are Positive and statement.netAmount - statement.netCosts > 0', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].condition = 'Income and Costs are Positive';
            statement.netAmount = randomInt();
            statement.netCosts = statement.netAmount - 1;
            // Act
            SubtractFromTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(SubtractFromTransactions.__get__('Autopayments.triggerAutoPayment').called).to.be.true;
              done();
            });
          });
        });
        describe('when crossContract.condition is Income, Costs and Reserves are Positive and statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld > 0', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].condition = 'Income, Costs and Reserves are Positive';
            statement.netAmount = randomInt();
            statement.netCosts = statement.netAmount - 1;
            statement.reservesReleased = randomInt();
            statement.reservesWithheld = statement.reservesReleased - 1;
            // Act
            SubtractFromTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(SubtractFromTransactions.__get__('Autopayments.triggerAutoPayment').called).to.be.true;
              done();
            });
          });
        });
        describe('when crossContract.condition is Negative and closingBalance < 0', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].condition = 'Negative';
            SubtractFromTransactions.__get__('balanceAtDate').onCall(1).yields(null, 0 - randomInt());
            // Act
            SubtractFromTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(SubtractFromTransactions.__get__('Autopayments.triggerAutoPayment').called).to.be.true;
              done();
            });
          });
        });
        describe('when crossContract.condition is Balance Minus Opening is Negative and closingBalance - openingBalance < 0', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].condition = 'Balance Minus Opening is Negative';
            SubtractFromTransactions.__get__('balanceAtDate').onCall(0).yields(null, 2);
            SubtractFromTransactions.__get__('balanceAtDate').onCall(1).yields(null, 1);
            // Act
            SubtractFromTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(SubtractFromTransactions.__get__('Autopayments.triggerAutoPayment').called).to.be.true;
              done();
            });
          });
        });
        describe('when crossContract.condition is Income is Negative and statement.netAmount < 0', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].condition = 'Income is Negative';
            statement.netAmount = 0 - randomInt();
            // Act
            SubtractFromTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(SubtractFromTransactions.__get__('Autopayments.triggerAutoPayment').called).to.be.true;
              done();
            });
          });
        });
        describe('when crossContract.condition is Income and Costs are Negative and statement.netAmount - statement.netCosts < 0', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].condition = 'Income and Costs are Negative';
            statement.netAmount = randomInt();
            statement.netCosts = statement.netAmount + 1;
            // Act
            SubtractFromTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(SubtractFromTransactions.__get__('Autopayments.triggerAutoPayment').called).to.be.true;
              done();
            });
          });
        });
        describe('when crossContract.condition is Income, Costs and Reserves are Negative and statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld < 0', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].condition = 'Income, Costs and Reserves are Negative';
            statement.netAmount = randomInt();
            statement.netCosts = statement.netAmount + statement.netAmount;
            statement.reservesReleased = randomInt();
            statement.reservesWithheld = statement.reservesReleased + statement.reservesReleased;
            // Act
            SubtractFromTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(SubtractFromTransactions.__get__('Autopayments.triggerAutoPayment').called).to.be.true;
              done();
            });
          });
        });

        describe('when crossContract.whenAutoPaymentTriggered', () => {
          describe('when Autopayments.triggerAutoPayment returns true', () => {
            it('should create the transaction', (done) => {
              // Arrange
              contract.crossContracts[0].contractId = randomId();
              // Act
              SubtractFromTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(Contract.findById.getCall(1).calledWith(contract.crossContracts[0].contractId)).to.be.true;
                done();
              });
            });
          });
          describe('when Autopayments.triggerAutoPayment returns false', () => {
            it('should not create the transaction', (done) => {
              // Arrange
              triggerAutoPaymentStub.yields(false);
              contract.crossContracts[0].contractId = randomId();
              // Act
              SubtractFromTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(Contract.findById.calledOnce).to.be.true;
                done();
              });
            });
          });
        });

        describe('when createTransaction is true', () => {
          beforeEach((done) => {
            contract.crossContracts[0].contractId = randomId();
            done();
          });
          it('should call Contract.findById with the right args', (done) => {
            // Arrange
            contract.crossContracts[0].contractId = randomId();
            // Act
            SubtractFromTransactions.create(statement, client, period, () => {
              // Assert
              expect(Contract.findById.getCall(1).calledWith(contract.crossContracts[0].contractId)).to.be.true;
              done();
            });
          });
          describe('when Contract.findById donesn\'t return a contractToCrossTo', () => {
            it('should return an error', (done) => {
              // Arrange
              const expectedError = new Error(`Could not find contract with ID ${contract.crossContracts[0].contractId}`);
              Contract.findById.onCall(1).resolves(null);
              // Act
              SubtractFromTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(err.message).to.eq(expectedError.message);
                done();
              });
            });
          });

          describe('when crossContract.condition is Positive', () => {
            it('should set the amount to closingBalance', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Positive';
              const closingBalance = randomInt();
              SubtractFromTransactions.__get__('balanceAtDate').onCall(1).yields(null, closingBalance);
              // Act
              SubtractFromTransactions.create(statement, client, period, (err) => {
                const amount = SubtractFromTransactions.__get__('getTransactionExchangeRateData').args[0][5];
                // Assert
                expect(0 - closingBalance).to.eq(amount);
                done();
              });
            });
          });

          describe('when crossContract.condition is Negative', () => {
            it('should set the amount to closingBalance', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Negative';
              const closingBalance = 0 - randomInt();
              SubtractFromTransactions.__get__('balanceAtDate').onCall(1).yields(null, closingBalance);
              // Act
              SubtractFromTransactions.create(statement, client, period, (err) => {
                const amount = SubtractFromTransactions.__get__('getTransactionExchangeRateData').args[0][5];
                // Assert
                expect(0 - closingBalance).to.eq(amount);
                done();
              });
            });
          });

          describe('when crossContract.condition is Always', () => {
            it('should set the amount to closingBalance', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Always';
              const closingBalance = randomInt();
              SubtractFromTransactions.__get__('balanceAtDate').onCall(1).yields(null, closingBalance);
              // Act
              SubtractFromTransactions.create(statement, client, period, (err) => {
                const amount = SubtractFromTransactions.__get__('getTransactionExchangeRateData').args[0][5];
                // Assert
                expect(0 - closingBalance).to.eq(amount);
                done();
              });
            });
          });

          describe('when crossContract.condition is Balance is Greater Than Minimum Payout', () => {
            it('should set the amount to closingBalance', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Balance is Greater Than Minimum Payout';
              const closingBalance = randomInt();
              contract.minPayout = closingBalance - 1;
              SubtractFromTransactions.__get__('balanceAtDate').onCall(1).yields(null, closingBalance);
              // Act
              SubtractFromTransactions.create(statement, client, period, (err) => {
                const amount = SubtractFromTransactions.__get__('getTransactionExchangeRateData').args[0][5];
                // Assert
                expect(0 - closingBalance).to.eq(amount);
                done();
              });
            });
          });

          describe('when crossContract.condition is Always transfer Balance Minus Opening', () => {
            it('should set the amount to closingBalance - openingBalance', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Always transfer Balance Minus Opening';
              const openingBalance = randomInt();
              SubtractFromTransactions.__get__('balanceAtDate').onCall(0).yields(null, openingBalance);
              const closingBalance = randomInt();
              SubtractFromTransactions.__get__('balanceAtDate').onCall(1).yields(null, closingBalance);
              const expectedAmount = 0 - (closingBalance - openingBalance);
              // Act
              SubtractFromTransactions.create(statement, client, period, (err) => {
                const amount = SubtractFromTransactions.__get__('getTransactionExchangeRateData').args[0][5];
                // Assert
                expect(expectedAmount).to.eq(amount);
                done();
              });
            });
          });

          describe('when crossContract.condition is Balance Minus Opening is Positive', () => {
            it('should set the amount to closingBalance - openingBalance', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Balance Minus Opening is Positive';
              const openingBalance = randomInt();
              SubtractFromTransactions.__get__('balanceAtDate').onCall(0).yields(null, openingBalance);
              const closingBalance = openingBalance + 1;
              SubtractFromTransactions.__get__('balanceAtDate').onCall(1).yields(null, closingBalance);
              const expectedAmount = 0 - (closingBalance - openingBalance);
              // Act
              SubtractFromTransactions.create(statement, client, period, (err) => {
                const amount = SubtractFromTransactions.__get__('getTransactionExchangeRateData').args[0][5];
                // Assert
                expect(expectedAmount).to.eq(amount);
                done();
              });
            });
          });

          describe('when crossContract.condition is Balance Minus Opening is Negative', () => {
            it('should set the amount to closingBalance - openingBalance', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Balance Minus Opening is Negative';
              const openingBalance = randomInt();
              SubtractFromTransactions.__get__('balanceAtDate').onCall(0).yields(null, openingBalance);
              const closingBalance = openingBalance - 1;
              SubtractFromTransactions.__get__('balanceAtDate').onCall(1).yields(null, closingBalance);
              const expectedAmount = 0 - (closingBalance - openingBalance);
              // Act
              SubtractFromTransactions.create(statement, client, period, (err) => {
                const amount = SubtractFromTransactions.__get__('getTransactionExchangeRateData').args[0][5];
                // Assert
                expect(expectedAmount).to.eq(amount);
                done();
              });
            });
          });

          describe('when crossContract.condition is Always transfer Income', () => {
            it('should set the amount to statement.netAmount', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Always transfer Income';
              statement.netAmount = randomInt();
              // Act
              SubtractFromTransactions.create(statement, client, period, (err) => {
                const amount = SubtractFromTransactions.__get__('getTransactionExchangeRateData').args[0][5];
                // Assert
                expect(0 - statement.netAmount).to.eq(amount);
                done();
              });
            });
          });

          describe('when crossContract.condition is Income is Positive', () => {
            it('should set the amount to statement.netAmount', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Income is Positive';
              statement.netAmount = randomInt();
              // Act
              SubtractFromTransactions.create(statement, client, period, (err) => {
                const amount = SubtractFromTransactions.__get__('getTransactionExchangeRateData').args[0][5];
                // Assert
                expect(0 - statement.netAmount).to.eq(amount);
                done();
              });
            });
          });

          describe('when crossContract.condition is Income is Negative', () => {
            it('should set the amount to statement.netAmount', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Income is Negative';
              statement.netAmount = 0 - randomInt();
              // Act
              SubtractFromTransactions.create(statement, client, period, (err) => {
                const amount = SubtractFromTransactions.__get__('getTransactionExchangeRateData').args[0][5];
                // Assert
                expect(0 - statement.netAmount).to.eq(amount);
                done();
              });
            });
          });

          describe('when crossContract.condition is Always transfer Income and Costs', () => {
            it('should set the amount to statement.netAmount - statement.netCosts', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Always transfer Income and Costs';
              statement.netAmount = randomInt();
              statement.netCosts = randomInt();
              const expectedAmount = 0 - (statement.netAmount - statement.netCosts);
              // Act
              SubtractFromTransactions.create(statement, client, period, (err) => {
                const amount = SubtractFromTransactions.__get__('getTransactionExchangeRateData').args[0][5];
                // Assert
                expect(expectedAmount).to.eq(amount);
                done();
              });
            });
          });

          describe('when crossContract.condition is Income and Costs are Positive', () => {
            it('should set the amount to statement.netAmount - statement.netCosts', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Income and Costs are Positive';
              statement.netAmount = randomInt();
              statement.netCosts = statement.netAmount - 1;
              const expectedAmount = 0 - (statement.netAmount - statement.netCosts);
              // Act
              SubtractFromTransactions.create(statement, client, period, (err) => {
                const amount = SubtractFromTransactions.__get__('getTransactionExchangeRateData').args[0][5];
                // Assert
                expect(expectedAmount).to.eq(amount);
                done();
              });
            });
          });

          describe('when crossContract.condition is Income and Costs are Negative', () => {
            it('should set the amount to statement.netAmount - statement.netCosts', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Income and Costs are Negative';
              statement.netAmount = randomInt();
              statement.netCosts = statement.netAmount + 1;
              const expectedAmount = 0 - (statement.netAmount - statement.netCosts);
              // Act
              SubtractFromTransactions.create(statement, client, period, (err) => {
                const amount = SubtractFromTransactions.__get__('getTransactionExchangeRateData').args[0][5];
                // Assert
                expect(expectedAmount).to.eq(amount);
                done();
              });
            });
          });

          describe('when crossContract.condition is Always transfer Income, Costs and Reserves', () => {
            it('should set the amount to statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Always transfer Income, Costs and Reserves';
              statement.netAmount = randomInt();
              statement.netCosts = randomInt();
              statement.reservesReleased = randomInt();
              statement.reservesWithheld = randomInt();
              const expectedAmount = 0 - (statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld);
              // Act
              SubtractFromTransactions.create(statement, client, period, (err) => {
                const amount = SubtractFromTransactions.__get__('getTransactionExchangeRateData').args[0][5];
                // Assert
                expect(expectedAmount).to.eq(amount);
                done();
              });
            });
          });

          describe('when crossContract.condition is Income, Costs and Reserves are Positive', () => {
            it('should set the amount to statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Income, Costs and Reserves are Positive';
              statement.netAmount = randomInt();
              statement.netCosts = statement.netAmount - 1;
              statement.reservesReleased = randomInt();
              statement.reservesWithheld = statement.reservesReleased - 1;
              const expectedAmount = 0 - (statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld);
              // Act
              SubtractFromTransactions.create(statement, client, period, (err) => {
                const amount = SubtractFromTransactions.__get__('getTransactionExchangeRateData').args[0][5];
                // Assert
                expect(expectedAmount).to.eq(amount);
                done();
              });
            });
          });

          describe('when crossContract.condition is Income, Costs and Reserves are Negative', () => {
            it('should set the amount to statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Income, Costs and Reserves are Negative';
              statement.netAmount = randomInt();
              statement.netCosts = statement.netAmount + 1;
              statement.reservesReleased = randomInt();
              statement.reservesWithheld = statement.reservesReleased + 1;
              const expectedAmount = 0 - (statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld);
              // Act
              SubtractFromTransactions.create(statement, client, period, (err) => {
                const amount = SubtractFromTransactions.__get__('getTransactionExchangeRateData').args[0][5];
                // Assert
                expect(expectedAmount).to.eq(amount);
                done();
              });
            });
          });

          describe('when crossContract.percentage is set', () => {
            it('should multiply the amount by crossContract.percentage', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Positive';
              contract.crossContracts[0].percentage = randomInt();
              const closingBalance = randomInt();
              SubtractFromTransactions.__get__('balanceAtDate').onCall(1).yields(null, closingBalance);
              const expectedAmount = 0 - (closingBalance * parseFloat(contract.crossContracts[0].percentage) / 100);
              // Act
              SubtractFromTransactions.create(statement, client, period, (err) => {
                const amount = SubtractFromTransactions.__get__('getTransactionExchangeRateData').args[0][5];
                // Assert
                expect(expectedAmount).to.eq(amount);
                done();
              });
            });
          });

          it('should call Statement.findOne with the right args', (done) => {
            // Arrange
            contract.crossContracts[0].contractId = contractToCrossTo._id;
            Contract.findById.onCall(1).resolves(contractToCrossTo);
            contract.crossContracts[0].condition = 'Positive';
            contract.crossContracts[0].percentage = randomInt();
            const closingBalance = randomInt();
            SubtractFromTransactions.__get__('balanceAtDate').onCall(1).yields(null, closingBalance);
            // Act
            SubtractFromTransactions.create(statement, client, period, () => {
              // Assert
              expect(Statement.findOne.calledWith({ clientId: statement.clientId, periodId: period._id.toString(), contractId: contractToCrossTo._id.toString() })).to.be.true;
              done();
            });
          });
          describe('when Statement.findOne donesn\'t return a statementToCrossTo', () => {
            it('should return an error', (done) => {
              // Arrange
              contract.crossContracts[0].contractId = contractToCrossTo._id;
              Contract.findById.onCall(1).resolves(contractToCrossTo);
              contract.crossContracts[0].condition = 'Positive';
              contract.crossContracts[0].percentage = randomInt();
              const closingBalance = randomInt();
              SubtractFromTransactions.__get__('balanceAtDate').onCall(1).yields(null, closingBalance);
              Statement.findOne.resolves(null);
              const expectedError = new Error(`Could not find statement to associate cross contract transaction with - ${statement}`);
              // Act
              SubtractFromTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(err.message).to.eq(expectedError.message);
                done();
              });
            });
          });

          it('should call getTransactionExchangeRateData with the right args', (done) => {
            // Arrange
            contract.crossContracts[0].contractId = contractToCrossTo._id;
            Contract.findById.onCall(1).resolves(contractToCrossTo);
            contract.crossContracts[0].condition = 'Positive';
            const closingBalance = randomInt();
            SubtractFromTransactions.__get__('balanceAtDate').onCall(1).yields(null, closingBalance);
            const expectedAmount = 0 - closingBalance;

            // Act
            SubtractFromTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(SubtractFromTransactions.__get__('getTransactionExchangeRateData').calledWith(client, period, statement, contract, contractToCrossTo, expectedAmount)).to.be.true;
              done();
            });
          });

          it('should create a new transaction with the right args', (done) => {
            // Arrange
            contract.crossContracts[0].contractId = contractToCrossTo._id;
            Contract.findById.onCall(1).resolves(contractToCrossTo);
            contract.crossContracts[0].condition = 'Positive';
            const closingBalance = randomInt();
            SubtractFromTransactions.__get__('balanceAtDate').onCall(1).yields(null, closingBalance);
            transactionExchangeRateData.amount = randomInt();

            // Act
            SubtractFromTransactions.create(statement, client, period, (err) => {
              // Assert
              const transaction = Transaction.prototype.save.firstCall.thisValue;
              expect(transaction.statementId).to.eq(statement._id.toString());
              expect(transaction.clientId).to.eq(statement.clientId.toString());
              expect(transaction.contractId).to.eq(contractToCrossTo._id.toString());
              expect(transaction.sourceContractId).to.eq(contract._id.toString());
              expect(transaction.name).to.eq(transactionExchangeRateData.name);
              expect(transaction.type).to.eq('Contract Payment');
              expect(transaction.transferringStatementId).to.eq(statement._id.toString());
              expect(transaction.date).to.eq(statement.date);
              expect(transaction.userCreated).to.eq(false);
              expect(transaction.amount).to.eq(transactionExchangeRateData.amount);
              done();
            });
          });

          describe('when contracts are not of the same accounting period', () => {
            it('should add error message to the caclulationNotes', (done) => {
              // Arrange
              contract.crossContracts[0].contractId = contractToCrossTo._id;
              Contract.findById.onCall(1).resolves(contractToCrossTo);
              contract.crossContracts[0].condition = 'Positive';
              const closingBalance = randomInt();
              SubtractFromTransactions.__get__('balanceAtDate').onCall(1).yields(null, closingBalance);
              contractToCrossTo.accountingPeriod = randomString();
              contract.accountingPeriod = randomString();
              period.runNo = randomInt();
              contract.name = randomString();
              const expectedMessage = {
                type: 'Contract Error',
                message: 'Cross contract should only be attached to a contract with the same accounting period and contract type',
                runNo: period.runNo,
                documentId: contract._id.toString(),
                documentName: contract.name,
                documentType: 'Contract',
              };
              // Act
              SubtractFromTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(Period.findByIdAndUpdate.calledWith(period._id, { $push: { calculationNotes: expectedMessage } }, { safe: true, upsert: true })).to.be.true;
                done();
              });
            });
          });

          describe('when contracts are not of the same type', () => {
            it('should add error message to the caclulationNotes', (done) => {
              // Arrange
              contract.crossContracts[0].contractId = contractToCrossTo._id;
              Contract.findById.onCall(1).resolves(contractToCrossTo);
              contract.crossContracts[0].condition = 'Positive';
              const closingBalance = randomInt();
              SubtractFromTransactions.__get__('balanceAtDate').onCall(1).yields(null, closingBalance);
              contractToCrossTo.contractType = randomString();
              contract.contractType = 'Mechanical';
              period.runNo = randomInt();
              contract.name = randomString();
              const expectedMessage = {
                type: 'Contract Error',
                message: 'Cross contract should only be attached to a contract with the same accounting period and contract type',
                runNo: period.runNo,
                documentId: contract._id.toString(),
                documentName: contract.name,
                documentType: 'Contract',
              };
              // Act
              SubtractFromTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(Period.findByIdAndUpdate.calledWith(period._id, { $push: { calculationNotes: expectedMessage } }, { safe: true, upsert: true })).to.be.true;
                done();
              });
            });
          });
        });
      });
    });
  });
});
