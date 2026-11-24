const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const {
  randomId,
  randomString,
  randomInt,
  randomDate,
} = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** test/unit/libs/calculation/statement/addToTransactions.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Contract = require('../../../../../models/contract');
const Transaction = require('../../../../../models/transaction');
const Statement = require('../../../../../models/statement');
const Period = require('../../../../../models/period');

describe('AddToTransactions Unit Tests', () => {
  let AddToTransactions;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    AddToTransactions = rewire('../../../../../libs/calculation/statement/addToTransactions');

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#create', () => {
    let statement; let client; let period; let contract; let transactions;
    let transactionExchangeRateData;
    let triggerAutoPaymentStub;

    beforeEach((done) => {
      period = { _id: randomId(), year: randomString(), accountingPeriod: randomString() };
      contract = {
        _id: randomId(),
        name: randomString(),
        crossContracts: [
          {
            process: 'Add To',
            condition: 'Always',
          },
        ],
      };
      statement = {
        _id: randomId(),
        contractId: contract._id,
        periodId: period._id,
        date: randomDate(),
      };

      transactions = [
        { type: 'Withholding Tax', amount: randomInt() },
        { type: 'Withholding Tax', amount: randomInt() },
        { type: 'Tax', amount: randomInt() },
        { type: 'Tax', amount: randomInt() },
      ];

      sinon.stub(Contract, 'findById');
      Contract.findById.resolves(contract);

      sinon.stub(Transaction, 'find').resolves(transactions);
      sinon.stub(Transaction.prototype, 'save').resolves();
      sinon.stub(Statement, 'findOne').resolves(statement);
      sinon.stub(Period, 'findByIdAndUpdate').resolves();

      AddToTransactions.__set__('balanceAtDate', sinon.stub());
      AddToTransactions.__get__('balanceAtDate').yields(null, randomInt());

      transactionExchangeRateData = { name: randomString(), amount: randomInt() };
      AddToTransactions.__set__('getTransactionExchangeRateData', sinon.stub());
      AddToTransactions.__get__('getTransactionExchangeRateData').returns(transactionExchangeRateData);

      triggerAutoPaymentStub = sinon.stub().yields();
      AddToTransactions.__set__('Autopayments', { triggerAutoPayment: triggerAutoPaymentStub });

      done();
    });

    it('should call Contract.findById with the right args', (done) => {
      // Arrange
      // Act
      AddToTransactions.create(statement, client, period, (err) => {
        // Assert
        expect(Contract.findById.calledWith(statement.contractId)).to.be.true;
        done();
      });
    });

    describe('when no contract is found', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = `Could not find contract with the ID ${statement.contractId} in creating subtract from transactions`;
        Contract.findById.resolves(null);
        // Act
        AddToTransactions.create(statement, client, period, (err) => {
          // Assert
          expect(Contract.findById.calledWith(statement.contractId)).to.be.true;
          expect(err.message).to.eq(expectedError);
          done();
        });
      });
    });

    it('should call balanceAtDate to get the opening balance with the right args', (done) => {
      // Arrange
      const balanceOptions = {};
      // Act
      AddToTransactions.create(statement, client, period, (err) => {
        // Assert
        expect(AddToTransactions.__get__('balanceAtDate')
          .calledWith(contract, period.startDate, balanceOptions)).to.be.true;
        done();
      });
    });

    it('should call balanceAtDate to get the closing balance with the right args', (done) => {
      // Arrange
      const balanceOptions = {};
      const dateAfterClosing = new Date(statement.date);
      dateAfterClosing.setDate(dateAfterClosing.getDate() + 1);
      // Act
      AddToTransactions.create(statement, client, period, (err) => {
        // Assert
        expect(AddToTransactions.__get__('balanceAtDate')
          .calledWith(contract, dateAfterClosing, balanceOptions)).to.be.true;
        done();
      });
    });

    describe('when contract.type is Profit Share or Profit Share Flexible', () => {
      it('should call balanceAtDate to get the closing balance with the right args', (done) => {
        // Arrange
        contract.type = 'Profit Share';
        const balanceOptions = { excludeReserves: true };
        const dateAfterClosing = new Date(statement.date);
        dateAfterClosing.setDate(dateAfterClosing.getDate() + 1);
        // Act
        AddToTransactions.create(statement, client, period, (err) => {
          // Assert
          expect(AddToTransactions.__get__('balanceAtDate')
            .calledWith(contract, dateAfterClosing, balanceOptions)).to.be.true;
          done();
        });
      });

      it('should call balanceAtDate to get the closing balance with the right args', (done) => {
        // Arrange
        contract.type = 'Profit Share - Flexible';
        const balanceOptions = { excludeReserves: true };
        const dateAfterClosing = new Date(statement.date);
        dateAfterClosing.setDate(dateAfterClosing.getDate() + 1);
        // Act
        AddToTransactions.create(statement, client, period, (err) => {
          // Assert
          expect(AddToTransactions.__get__('balanceAtDate')
            .calledWith(contract, dateAfterClosing, balanceOptions)).to.be.true;
          done();
        });
      });
    });

    it('should call Transaction.find with the right args', (done) => {
      // Arrange
      // Act
      AddToTransactions.create(statement, client, period, (err) => {
        // Assert
        expect(Transaction.find
          .calledWith({ statementId: statement._id.toString() })).to.be.true;
        done();
      });
    });

    describe('when Transaction.find errors', () => {
      it.skip('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        sinon.stub(Transaction, 'find').rejects(expectedError);
        // Act
        AddToTransactions.create(statement, client, period, (err) => {
          // Assert
          expect(Transaction.find
            .calledWith({ statementId: statement._id.toString() })).to.be.true;
          expect(err).to.exist;
          expect(err).to.eq(expectedError);
        });
      });
    });

    it('should get the right value for withholdingAmount', (done) => {
      // Arrange
      let expectedWithholdingAmount = 0;
      transactions.forEach((transaction) => {
        if (transaction.type === 'Withholding Tax') {
          expectedWithholdingAmount += transaction.amount;
        }
      });
      // Act
      AddToTransactions.create(statement, client, period, (err) => {
        // Assert
        const transaction = Transaction.prototype.save.secondCall.thisValue;
        expect(transaction.amount).to.eq(expectedWithholdingAmount);
        done();
      });
    });

    it('should get the right value for vatAmount', (done) => {
      // Arrange
      let expectedVatAmount = 0;
      transactions.forEach((transaction) => {
        if (transaction.type === 'Tax') {
          expectedVatAmount += transaction.amount;
        }
      });
      // Act
      AddToTransactions.create(statement, client, period, (err) => {
        // Assert
        const transaction = Transaction.prototype.save.getCall(2).thisValue;
        expect(transaction.amount).to.eq(expectedVatAmount);
        done();
      });
    });

    describe('for each of the contract.crossContracts', () => {
      describe('when crossContract.process is Add To', () => {
        describe('when crossContract.condition is Always', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].process = 'Add To';
            contract.crossContracts[0].condition = 'Always';
            // Act
            AddToTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(Transaction.prototype.save.called).to.be.true;
              done();
            });
          });
        });

        describe('when crossContract.condition is Always transfer Income', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].process = 'Add To';
            contract.crossContracts[0].condition = 'Always transfer Income';
            // Act
            AddToTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(Transaction.prototype.save.called).to.be.true;
              done();
            });
          });
        });

        describe('when crossContract.condition is Always transfer Income and Costs', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].process = 'Add To';
            contract.crossContracts[0].condition = 'Always transfer Income and Costs';
            // Act
            AddToTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(Transaction.prototype.save.called).to.be.true;
              done();
            });
          });
        });

        describe('when crossContract.condition is Always transer Income and Costs', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].process = 'Add To';
            contract.crossContracts[0].condition = 'Always transer Income and Costs';
            // Act
            AddToTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(Transaction.prototype.save.called).to.be.true;
              done();
            });
          });
        });

        describe('when crossContract.condition is Always transfer Income, Costs and Reserves', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].process = 'Add To';
            contract.crossContracts[0].condition = 'Always transfer Income, Costs and Reserves';
            // Act
            AddToTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(Transaction.prototype.save.called).to.be.true;
              done();
            });
          });
        });

        describe('when crossContract.condition is Balance is Greater Than Minimum Payout and closingBalance > contract.minPayout', (done) => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].process = 'Add To';
            contract.crossContracts[0].condition = 'Balance is Greater Than Minimum Payout';
            contract.minPayout = 1;
            AddToTransactions.__get__('balanceAtDate').yields(null, 2);
            // Act
            AddToTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(Transaction.prototype.save.called).to.be.true;
              done();
            });
          });
        });

        describe('when crossContract.condition is Always transfer Balance Minus Opening', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].process = 'Add To';
            contract.crossContracts[0].condition = 'Always transfer Balance Minus Opening';
            // Act
            AddToTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(Transaction.prototype.save.called).to.be.true;
              done();
            });
          });
        });

        describe('when crossContract.condition is Positive and closingBalance > 0', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].process = 'Add To';
            contract.crossContracts[0].condition = 'Positive';
            AddToTransactions.__get__('balanceAtDate').yields(null, 1);
            // Act
            AddToTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(Transaction.prototype.save.called).to.be.true;
              done();
            });
          });
        });

        describe('when crossContract.condition is Balance Minus Opening is Positive and closingBalance - openingBalance > 0', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].process = 'Add To';
            contract.crossContracts[0].condition = 'Balance Minus Opening is Positive';
            AddToTransactions.__get__('balanceAtDate').onCall(0).yields(null, 1).onCall(1)
              .yields(null, 2);
            // Act
            AddToTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(Transaction.prototype.save.called).to.be.true;
              done();
            });
          });
        });

        describe('when crossContract.condition is Income is Positive and statement.netAmount > 0', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].process = 'Add To';
            contract.crossContracts[0].condition = 'Income is Positive';
            statement.netAmount = 1;
            // Act
            AddToTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(Transaction.prototype.save.called).to.be.true;
              done();
            });
          });
        });

        describe('when crossContract.condition is Income and Costs are Positive and statement.netAmount - statement.netCosts > 0', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].process = 'Add To';
            contract.crossContracts[0].condition = 'Income and Costs are Positive';
            statement.netAmount = 2;
            statement.netCosts = 1;
            // Act
            AddToTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(Transaction.prototype.save.called).to.be.true;
              done();
            });
          });
        });

        describe('when crossContract.condition is Income, Costs and Reserves are Positive and statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld > 0', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].process = 'Add To';
            contract.crossContracts[0].condition = 'Income, Costs and Reserves are Positive';
            statement.netAmount = 2;
            statement.netCosts = 1;
            statement.reservesReleased = 2;
            statement.reservesWithheld = 1;
            // Act
            AddToTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(Transaction.prototype.save.called).to.be.true;
              done();
            });
          });
        });

        describe('when crossContract.condition is Negative and closingBalance < 0', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].process = 'Add To';
            contract.crossContracts[0].condition = 'Negative';
            AddToTransactions.__get__('balanceAtDate').yields(null, -1);
            // Act
            AddToTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(Transaction.prototype.save.called).to.be.true;
              done();
            });
          });
        });

        describe('when crossContract.condition is Balance Minus Opening is Negative and closingBalance - openingBalance < 0', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].process = 'Add To';
            contract.crossContracts[0].condition = 'Balance Minus Opening is Negative';
            AddToTransactions.__get__('balanceAtDate').onCall(0).yields(null, 2).onCall(1)
              .yields(null, 1);
            // Act
            AddToTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(Transaction.prototype.save.called).to.be.true;
              done();
            });
          });
        });

        describe('when crossContract.condition is Income is Negative and statement.netAmount < 0', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].process = 'Add To';
            contract.crossContracts[0].condition = 'Income is Negative';
            statement.netAmount = -1;
            // Act
            AddToTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(Transaction.prototype.save.called).to.be.true;
              done();
            });
          });
        });

        describe('when crossContract.condition is Income and Costs are Negative and statement.netAmount - statement.netCosts < 0', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].process = 'Add To';
            contract.crossContracts[0].condition = 'Income and Costs are Negative';
            statement.netAmount = 1;
            statement.netCosts = 2;
            // Act
            AddToTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(Transaction.prototype.save.called).to.be.true;
              done();
            });
          });
        });

        describe('when crossContract.condition is Income, Costs and Reserves are Negative and statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld < 0', () => {
          it('should create the transaction', (done) => {
            // Arrange
            contract.crossContracts[0].process = 'Add To';
            contract.crossContracts[0].condition = 'Income, Costs and Reserves are Negative';
            statement.netAmount = 1;
            statement.netCosts = 2;
            statement.reservesReleased = 1;
            statement.reservesWithheld = 2;
            // Act
            AddToTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(Transaction.prototype.save.called).to.be.true;
              done();
            });
          });
        });

        describe('when crossContract.whenAutoPaymentTriggered', () => {
          describe('when Autopayments.triggerAutoPayment returns true', () => {
            it('should create the transaction', (done) => {
              // Arrange
              contract.crossContracts[0].whenAutoPaymentTriggered = true;
              AddToTransactions.__get__('Autopayments.triggerAutoPayment').yields(true);
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(Transaction.prototype.save.called).to.be.true;
                done();
              });
            });
          });
          describe('when Autopayments.triggerAutoPayment returns false', () => {
            it('should not create the transaction', (done) => {
              // Arrange
              contract.crossContracts[0].whenAutoPaymentTriggered = true;
              AddToTransactions.__get__('Autopayments.triggerAutoPayment').yields(false);
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(Transaction.prototype.save.called).to.be.false;
                done();
              });
            });
          });
        });

        describe('when createTransaction is true', () => {
          it('should call  wiContract.findByIdth the right args', (done) => {
            // Arrange
            contract.crossContracts[0].whenAutoPaymentTriggered = false;
            // Act
            AddToTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(Contract.findById.calledWith(contract.crossContracts[0].contractId)).to.be.true;
              done();
            });
          });

          describe('when Contract.findById donesn\'t return a contractToCrossTo', () => {
            it('should return an error', (done) => {
              // Arrange
              Contract.findById.onCall(1).resolves(null);
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(err).to.exist;
                done();
              });
            });
          });

          describe('when crossContract.condition is Positive', () => {
            it('should set the amount to closingBalance', (done) => {
              // Arrange
              const closingBalance = 1;
              contract.crossContracts[0].condition = 'Positive';
              AddToTransactions.__get__('balanceAtDate').onCall(1).yields(null, closingBalance);
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(AddToTransactions.__get__('getTransactionExchangeRateData')
                  .calledWith(undefined, period, statement, contract, contract, closingBalance)).to.be.true;
                done();
              });
            });
          });

          describe('when crossContract.condition is Negative', () => {
            it('should set the amount to closingBalance', (done) => {
              // Arrange
              const closingBalance = -1;
              contract.crossContracts[0].condition = 'Negative';
              AddToTransactions.__get__('balanceAtDate').onCall(1).yields(null, closingBalance);
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(AddToTransactions.__get__('getTransactionExchangeRateData')
                  .calledWith(undefined, period, statement, contract, contract, closingBalance)).to.be.true;
                done();
              });
            });
          });

          describe('when crossContract.condition is Always', () => {
            it('should set the amount to closingBalance', (done) => {
              // Arrange
              const closingBalance = 1;
              contract.crossContracts[0].condition = 'Always';
              AddToTransactions.__get__('balanceAtDate').onCall(1).yields(null, closingBalance);
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(AddToTransactions.__get__('getTransactionExchangeRateData')
                  .calledWith(undefined, period, statement, contract, contract, closingBalance)).to.be.true;
                done();
              });
            });
          });

          describe('when crossContract.condition is Balance is Greater Than Minimum Payout', () => {
            it('should set the amount to closingBalance', (done) => {
              // Arrange
              const closingBalance = 2;
              contract.crossContracts[0].condition = 'Balance is Greater Than Minimum Payout';
              contract.minPayout = 1;
              AddToTransactions.__get__('balanceAtDate').onCall(1).yields(null, closingBalance);
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(AddToTransactions.__get__('getTransactionExchangeRateData')
                  .calledWith(undefined, period, statement, contract, contract, closingBalance)).to.be.true;
                done();
              });
            });
          });

          describe('when crossContract.condition is Always transfer Balance Minus Opening', () => {
            it('should set the amount to closingBalance - openingBalance', (done) => {
              // Arrange
              const openingBalance = 1;
              const closingBalance = 1;
              contract.crossContracts[0].condition = 'Always transfer Balance Minus Opening';
              AddToTransactions.__get__('balanceAtDate').onCall(0).yields(null, openingBalance).onCall(1)
                .yields(null, closingBalance);
              const difference = closingBalance - openingBalance;
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(AddToTransactions.__get__('getTransactionExchangeRateData')
                  .calledWith(undefined, period, statement, contract, contract, difference)).to.be.true;
                done();
              });
            });
          });

          describe('when crossContract.condition is Balance Minus Opening is Positive', () => {
            it('should set the amount to closingBalance - openingBalance', (done) => {
              // Arrange
              const openingBalance = 1;
              const closingBalance = 2;
              contract.crossContracts[0].condition = 'Balance Minus Opening is Positive';
              AddToTransactions.__get__('balanceAtDate').onCall(0).yields(null, openingBalance).onCall(1)
                .yields(null, closingBalance);
              const difference = closingBalance - openingBalance;
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(AddToTransactions.__get__('getTransactionExchangeRateData')
                  .calledWith(undefined, period, statement, contract, contract, difference)).to.be.true;
                done();
              });
            });
          });

          describe('when crossContract.condition is Balance Minus Opening is Negative', () => {
            it('should set the amount to closingBalance - openingBalance', (done) => {
              // Arrange
              const openingBalance = 2;
              const closingBalance = 1;
              contract.crossContracts[0].condition = 'Balance Minus Opening is Negative';
              AddToTransactions.__get__('balanceAtDate').onCall(0).yields(null, openingBalance).onCall(1)
                .yields(null, closingBalance);
              const difference = closingBalance - openingBalance;
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(AddToTransactions.__get__('getTransactionExchangeRateData')
                  .calledWith(undefined, period, statement, contract, contract, difference)).to.be.true;
                done();
              });
            });
          });

          describe('when crossContract.condition is Always transfer Income', () => {
            it('should set the amount to statement.netAmount', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Always transfer Income';
              statement.netAmount = 1;
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(AddToTransactions.__get__('getTransactionExchangeRateData')
                  .calledWith(undefined, period, statement, contract, contract, statement.netAmount)).to.be.true;
                done();
              });
            });
          });

          describe('when crossContract.condition is Income is Positive', () => {
            it('should set the amount to statement.netAmount', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Income is Positive';
              statement.netAmount = 1;
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(AddToTransactions.__get__('getTransactionExchangeRateData')
                  .calledWith(undefined, period, statement, contract, contract, statement.netAmount)).to.be.true;
                done();
              });
            });
          });

          describe('when crossContract.condition is Income is Negative', () => {
            it('should set the amount to statement.netAmount', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Income is Negative';
              statement.netAmount = -1;
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(AddToTransactions.__get__('getTransactionExchangeRateData')
                  .calledWith(undefined, period, statement, contract, contract, statement.netAmount)).to.be.true;
                done();
              });
            });
          });

          describe('when crossContract.condition is Always transfer Income and Costs', () => {
            it('should set the amount to statement.netAmount - statement.netCosts', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Always transfer Income and Costs';
              statement.netAmount = 1;
              statement.netCosts = 1;
              const difference = statement.netAmount - statement.netCosts;
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(AddToTransactions.__get__('getTransactionExchangeRateData')
                  .calledWith(undefined, period, statement, contract, contract, difference)).to.be.true;
                done();
              });
            });
          });

          describe('when crossContract.condition is Income and Costs are Positive', () => {
            it('should set the amount to statement.netAmount - statement.netCosts', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Income and Costs are Positive';
              statement.netAmount = 2;
              statement.netCosts = 1;
              const difference = statement.netAmount - statement.netCosts;
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(AddToTransactions.__get__('getTransactionExchangeRateData')
                  .calledWith(undefined, period, statement, contract, contract, difference)).to.be.true;
                done();
              });
            });
          });

          describe('when crossContract.condition is Income and Costs are Negative', () => {
            it('should set the amount to statement.netAmount - statement.netCosts', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Income and Costs are Negative';
              statement.netAmount = 1;
              statement.netCosts = 2;
              const difference = statement.netAmount - statement.netCosts;
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(AddToTransactions.__get__('getTransactionExchangeRateData')
                  .calledWith(undefined, period, statement, contract, contract, difference)).to.be.true;
                done();
              });
            });
          });

          describe('when crossContract.condition is Always transfer Income, Costs and Reserves', () => {
            it('should set the amount to statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld;', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Always transfer Income, Costs and Reserves';
              statement.netAmount = 1;
              statement.netCosts = 1;
              statement.reservesReleased = 1;
              statement.reservesWithheld = 1;
              const result = statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld;
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(AddToTransactions.__get__('getTransactionExchangeRateData')
                  .calledWith(undefined, period, statement, contract, contract, result)).to.be.true;
                done();
              });
            });
          });

          describe('when crossContract.condition is Income, Costs and Reserves are Positive', () => {
            it('should set the amount to statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld;', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Income, Costs and Reserves are Positive';
              statement.netAmount = 10;
              statement.netCosts = 1;
              statement.reservesReleased = 1;
              statement.reservesWithheld = 1;
              const result = statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld;
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(AddToTransactions.__get__('getTransactionExchangeRateData')
                  .calledWith(undefined, period, statement, contract, contract, result)).to.be.true;
                done();
              });
            });
          });

          describe('when crossContract.condition is Income, Costs and Reserves are Negative', () => {
            it('should set the amount to statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld;', (done) => {
              // Arrange
              contract.crossContracts[0].condition = 'Income, Costs and Reserves are Negative';
              statement.netAmount = -10;
              statement.netCosts = 1;
              statement.reservesReleased = 1;
              statement.reservesWithheld = 1;
              const result = statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld;
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(AddToTransactions.__get__('getTransactionExchangeRateData')
                  .calledWith(undefined, period, statement, contract, contract, result)).to.be.true;
                done();
              });
            });
          });

          describe('when crossContract.percentage is set', () => {
            it('should multiply the amount by crossContract.percentage', (done) => {
              // Arrange
              const closingBalance = 1;
              contract.crossContracts[0].condition = 'Positive';
              contract.crossContracts[0].percentage = 10;
              AddToTransactions.__get__('balanceAtDate').onCall(1).yields(null, closingBalance);
              const closingBalancePercentage = closingBalance * parseFloat(contract.crossContracts[0].percentage) / 100;
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(AddToTransactions.__get__('getTransactionExchangeRateData')
                  .calledWith(undefined, period, statement, contract, contract, closingBalancePercentage)).to.be.true;
                done();
              });
            });
          });

          it('should call Statement.findOne with the right args', (done) => {
            // Act
            AddToTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(Statement.findOne.calledWith({ clientId: statement.clientId, periodId: period._id.toString(), contractId: contract._id.toString() })).to.be.true;
              done();
            });
          });

          describe('when Statement.findOne donesn\'t return a statementToCrossTo', () => {
            it.skip('should return an error', (done) => {
              // Arrange
              Statement.findOne.onCall(0).resolves(null);
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                expect(err).to.exist;
                done();
              });
            });
          });

          it('should call getTransactionExchangeRateData with the right args', (done) => {
            // Arrange
            const closingBalance = 1;
            AddToTransactions.__get__('balanceAtDate').onCall(1).yields(null, closingBalance);
            // Act
            AddToTransactions.create(statement, client, period, (err) => {
              // Assert
              expect(AddToTransactions.__get__('getTransactionExchangeRateData')
                .calledWith(undefined, period, statement, contract, contract, closingBalance)).to.be.true;
              done();
            });
          });

          it('should create a new transaction with the right args', (done) => {
            // Arrange
            statement.name = randomString();
            let withholdingAmount = 0;
            let vatAmount = 0;
            transactions.forEach((t) => {
              if (t.type === 'Withholding Tax') {
                withholdingAmount += t.amount;
              } else if (t.type === 'Tax') {
                vatAmount += t.amount;
              }
            });
            // Act
            AddToTransactions.create(statement, client, period, (err) => {
              // Assert
              const transaction = Transaction.prototype.save.getCall(0).thisValue;
              expect(transaction.contractId).to.eq(contract._id);
              expect(transaction.statementId).to.eq(statement._id);
              expect(transaction.transferringStatementId).to.eq(statement._id);
              expect(transaction.sourceContractId).to.eq(contract._id);
              expect(transaction.name).to.eq(transactionExchangeRateData.name);
              expect(transaction.type).to.eq('Transfer From');
              expect(transaction.date.toISOString()).to.eq(new Date(statement.date).toISOString());
              expect(transaction.amount).to.eq(transactionExchangeRateData.amount - withholdingAmount - vatAmount);
              expect(transaction.userCreated).to.eq(false);
              done();
            });
          });

          describe('when withholdingAmount', () => {
            it('should create a new transaction with the right args', (done) => {
              // Arrange
              statement.name = randomString();
              let withholdingAmount = 0;
              transactions.forEach((t) => {
                if (t.type === 'Withholding Tax') {
                  withholdingAmount += t.amount;
                }
              });
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                const transaction = Transaction.prototype.save.getCall(1).thisValue;
                expect(transaction.contractId).to.eq(contract._id);
                expect(transaction.statementId).to.eq(statement._id);
                expect(transaction.transferringStatementId).to.eq(statement._id);
                expect(transaction.name).to.eq(`${statement.name} - Withholding Tax`);
                expect(transaction.type).to.eq('Transfer From');
                expect(transaction.date.toISOString()).to.eq(new Date(statement.date).toISOString());
                expect(transaction.amount).to.eq(withholdingAmount);
                expect(transaction.userCreated).to.eq(false);
                done();
              });
            });
          });

          describe('when vatAmount', () => {
            it('should create a new transaction with the right args', (done) => {
              // Arrange
              statement.name = randomString();
              let vatAmount = 0;
              transactions.forEach((t) => {
                if (t.type === 'Tax') {
                  vatAmount += t.amount;
                }
              });
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                const transaction = Transaction.prototype.save.getCall(2).thisValue;
                expect(transaction.contractId).to.eq(contract._id);
                expect(transaction.statementId).to.eq(statement._id);
                expect(transaction.transferringStatementId).to.eq(statement._id);
                expect(transaction.name).to.eq(`${statement.name} - Tax`);
                expect(transaction.type).to.eq('Transfer From');
                expect(transaction.date.toISOString()).to.eq(new Date(statement.date).toISOString());
                expect(transaction.amount).to.eq(vatAmount);
                expect(transaction.userCreated).to.eq(false);
                done();
              });
            });
          });

          it('should create a new transfer to transaction with the right args', (done) => {
            // Arrange
            statement.name = randomString();
            statement.netAmount = randomInt();
            contract.crossContracts[0].condition = 'Always transfer Income';
            // Act
            AddToTransactions.create(statement, client, period, (err) => {
              // Assert
              const transaction = Transaction.prototype.save.getCall(3).thisValue;
              expect(transaction.contractId).to.eq(contract._id);
              expect(transaction.statementId).to.eq(statement._id);
              expect(transaction.name).to.eq(`${period.year} ${period.accountingPeriod} - ${contract.name} to ${contract.name}`);
              expect(transaction.type).to.eq('Transfer To');
              expect(transaction.destinationContractId).to.eq(contract._id);
              expect(transaction.date.toISOString()).to.eq(new Date(statement.date).toISOString());
              expect(transaction.amount).to.eq(0 - statement.netAmount);
              expect(transaction.userCreated).to.eq(false);
              done();
            });
          });

          describe('when contracts are not of the same accounting period', () => {
            it('should add error message to the calculationNotes', (done) => {
              // Arrange
              const crossContract = JSON.parse(JSON.stringify(contract));
              crossContract._id = randomString();
              crossContract.accountingPeriod = randomString();
              Contract.findById.onCall(1).resolves(crossContract);
              const message = {
                type: 'Contract Error',
                message: 'Cross contract should only be attached to a contract with the same accounting period and contract type',
                runNo: period.runNo,
                documentId: contract._id.toString(),
                documentName: contract.name,
                documentType: 'Contract',
              };
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                setTimeout(() => {
                  expect(Period.findByIdAndUpdate.calledWith(
                    period._id,
                    { $push: { calculationNotes: message } },
                    { safe: true, upsert: true },
                  )).to.be.true;
                  done();
                }, 0);
              });
            });
          });

          describe('when contracts are not of the same type', () => {
            it('should add error message to the calculationNotes', (done) => {
              // Arrange
              const crossContract = JSON.parse(JSON.stringify(contract));
              crossContract._id = randomString();
              crossContract.contractType = 'Mechanical';
              Contract.findById.onCall(1).resolves(crossContract);
              contract.contractType = 'Artist';
              const message = {
                type: 'Contract Error',
                message: 'Cross contract should only be attached to a contract with the same accounting period and contract type',
                runNo: period.runNo,
                documentId: contract._id.toString(),
                documentName: contract.name,
                documentType: 'Contract',
              };
              // Act
              AddToTransactions.create(statement, client, period, (err) => {
                // Assert
                setTimeout(() => {
                  expect(Period.findByIdAndUpdate.calledWith(
                    period._id,
                    { $push: { calculationNotes: message } },
                    { safe: true, upsert: true },
                  )).to.be.true;
                  done();
                }, 0);
              });
            });
          });
        });
      });
    });
  });
});
