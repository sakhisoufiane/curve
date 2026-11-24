process.env.NODE_ENV = 'test';
require('../../../models/db');

const { expect } = require('chai');
const async = require('async');

const { testUtils, logger } = require('@curveroyaltysystems/platform-shared-utils');
const Statement = require('../../../models/statement');
const Period = require('../../../models/period');
const Payee = require('../../../models/payee');
const Contract = require('../../../models/contract');
const Client = require('../../../models/client');
const Transaction = require('../../../models/transaction');
const TaxAmounts = require('../../../libs/calculation/statement/taxAmounts');

let period;
let contract;
let statement;
let client;
let payee;

describe('Statement', () => {
  let clientId;
  before((done) => {
    clientId = testUtils.randomId();
    testUtils.cleanUp(clientId, done);
  });

  beforeEach((done) => {
    async.series([
      function (cb) {
        client = new Client({ _id: clientId, name: 'Client Statements 1' });
        client.save()
          .then(() => cb())
          .catch(cb);
      },
      function (cb) {
        period = new Period({ clientId, name: 'Period 1', startDate: new Date(2020, 0, 1), endDate: new Date(2021, 0, 1) });
        period.save()
          .then(() => cb())
          .catch(cb);
      },
      function (cb) {
        payee = new Payee({ clientId, name: 'Payee 1', selfBillingTaxRate: 20, withholdingTaxRate: 5 });
        payee.save()
          .then(() => cb())
          .catch(cb);
      },
      function (cb) {
        contract = new Contract({ clientId, name: 'Contract 1', payees: [{ payeeId: payee._id, percentage: 100 }], minPayout: 100 });
        contract.save()
          .then(() => cb())
          .catch(cb);
      },
      function (cb) {
        statement = new Statement({ clientId, name: 'Statement 1', date: new Date(), periodId: period._id, contractId: contract._id });
        statement.save()
          .then(() => cb())
          .catch(cb);
      },
    ], done);
  });

  afterEach((done) => {
    testUtils.cleanUp(clientId, done);
  });

  after((done) => {
    testUtils.cleanUp(clientId, done);
  });

  describe('#setTaxBasis', () => {
    beforeEach((done) => {
      Transaction.deleteMany({ clientId })
        .then(() => {
          statement.taxBasis = 0;
          statement.withholdingAmount = 0;
          contract.payeeId = payee._id;
          contract.save()
            .then(() => done())
            .catch(done);
        })
        .catch(done);
    });
    describe("when clientType or statementDesign is 'Distribution'", () => {
      it('should set value to gross amount', (done) => {
        contract.openingBalance = 0;
        contract.statementDesign = 'Distribution';
        contract.save()
          .then(() => {
            statement.grossAmount = 100;
            TaxAmounts.setTaxBasis(statement, period, client, (err) => {
              expect(statement.taxBasis).to.eq(statement.grossAmount);
              done();
            });
          })
          .catch(done);
      });
    });
    describe("when clientType and statementDesign is not 'Distribution'", () => {
      describe('when opening balance is 0 and closing balance is less than min payment', () => {
        it('should set value to 0', (done) => {
          contract.openingBalance = 0;
          contract.statementDesign = 'Standard';
          contract.save()
            .then(() => {
              const transaction = new Transaction({
                clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Royalties', amount: 12,
              });
              transaction.save()
                .then(() => {
                  TaxAmounts.setTaxBasis(statement, period, client, (err) => {
                    expect(statement.taxBasis).to.eq(0);
                    done();
                  });
                })
                .catch(done);
            })
            .catch(done);
        });
      });
      describe('when opening balance is 0 and closing balance is greater than min payment', () => {
        it.skip('should set value to closing balance', (done) => {
          contract.openingBalance = 0;
          contract.statementDesign = 'Standard';
          contract.save()
            .then(() => {
              const transaction = new Transaction({
                clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Royalties', amount: 123,
              });
              transaction.save()
                .then(() => {
                  TaxAmounts.setTaxBasis(statement, period, client, (err) => {
                    expect(statement.taxBasis).to.eq(transaction.amount);
                    done();
                  });
                })
                .catch(done);
            })
            .catch(done);
        });
      });
      describe('when opening balance is negative and closing balance is less than min payment', () => {
        it('should set value to 0', (done) => {
          contract.openingBalance = -10;
          contract.statementDesign = 'Standard';
          contract.save()
            .then(() => {
              const transaction = new Transaction({
                clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Royalties', amount: 12,
              });
              transaction.save()
                .then(() => {
                  TaxAmounts.setTaxBasis(statement, period, client, (err) => {
                    expect(statement.taxBasis).to.eq(0);
                    done();
                  });
                })
                .catch(done);
            })
            .catch(done);
        });
      });
      describe('when opening balance is negative and closing balance is greater than min payment', () => {
        it.skip('should set value to 0', (done) => {
          contract.openingBalance = -10;
          contract.statementDesign = 'Standard';
          contract.save()
            .then(() => {
              const transaction = new Transaction({
                clientId,
                contractId: contract._id,
                statementId: statement._id,
                date: new Date(),
                userCreated: false,
                name: 'Royalties',
                amount: 123,
              });
              transaction.save()
                .then(() => {
                  TaxAmounts.setTaxBasis(statement, period, client, (err) => {
                    expect(statement.taxBasis).to.eq(transaction.amount + contract.openingBalance);
                    done();
                  });
                })
                .catch(done);
            })
            .catch(done);
        });
      });
      describe('when opening balance is less than min payment and closing balance is less than min payment', () => {
        it('should set value to 0', (done) => {
          contract.openingBalance = 10;
          contract.statementDesign = 'Standard';
          contract.save()
            .then(() => {
              const transaction = new Transaction({
                clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Royalties', amount: 12,
              });
              transaction.save()
                .then(() => {
                  TaxAmounts.setTaxBasis(statement, period, client, (err) => {
                    expect(statement.taxBasis).to.eq(0);
                    done();
                  });
                }).catch(done);
            }).catch(done);
        });
      });
      describe('when opening balance is less than min payment and closing balance is greater than min payment', () => {
        // This assumes that the opening balance has not been invoiced for previously - as it is less than the payment threshold
        it.skip('should set value to closing balance', (done) => {
          contract.openingBalance = 10;
          contract.statementDesign = 'Standard';
          contract.save()
            .then(() => {
              const transaction = new Transaction({
                clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Royalties', amount: 123,
              });
              transaction.save()
                .then(() => {
                  TaxAmounts.setTaxBasis(statement, period, client, (err) => {
                    expect(statement.taxBasis).to.eq(transaction.amount + contract.openingBalance);
                    done();
                  });
                }).catch(done);
            }).catch(done);
        });
      });
      describe('when opening balance is greater than min payment and closing balance is less than min payment', () => {
        // This would be negative in the period. Users can still invoice negative amounts if it is above the min payment threshold
        it('should set value to 0', (done) => {
          contract.openingBalance = 110;
          contract.statementDesign = 'Standard';
          contract.save()
            .then(() => {
              const transaction = new Transaction({
                clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Royalties', amount: -50,
              });
              transaction.save()
                .then(() => {
                  TaxAmounts.setTaxBasis(statement, period, client, (err) => {
                    expect(statement.taxBasis).to.eq(0);
                    done();
                  });
                }).catch(done);
            }).catch(done);
        });
      });
      describe('when opening balance is greater than min payment and closing balance is greater than min payment', () => {
        it.skip('should set value to difference between opening and closing balances', (done) => {
          contract.openingBalance = 110;
          contract.statementDesign = 'Standard';
          contract.save()
            .then(() => {
              const transaction = new Transaction({
                clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Royalties', amount: 100,
              });
              transaction.save()
                .then(() => {
                  TaxAmounts.setTaxBasis(statement, period, client, (err) => {
                    expect(statement.taxBasis).to.eq(transaction.amount);
                    done();
                  });
                }).catch(done);
            }).catch(done);
        });
      });
      describe('when opening balance is less than min payment, a payment taking balance to 0 is present, and closing balance is less than min payment', () => {
        it('should set value to 0', (done) => {
          contract.openingBalance = 90;
          contract.statementDesign = 'Standard';
          contract.save()
            .then(() => {
              const payment = new Transaction({
                clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Payment', type: 'Payment', amount: 0 - contract.openingBalance,
              });
              payment.save()
                .then(() => {
                  const transaction = new Transaction({
                    clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Royalties', amount: 10,
                  });
                  transaction.save()
                    .then(() => {
                      TaxAmounts.setTaxBasis(statement, period, client, (err) => {
                        expect(statement.taxBasis).to.eq(0);
                        done();
                      });
                    }).catch(done);
                }).catch(done);
            }).catch(done);
        });
      });
      describe('when opening balance is less than min payment, a payment taking balance to 0 is present, and closing balance is greater than min payment', () => {
        it.skip('should set value to closing balance', (done) => {
          contract.openingBalance = 90;
          contract.statementDesign = 'Standard';
          contract.save()
            .then(() => {
              const payment = new Transaction({
                clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Payment', type: 'Payment', amount: 0 - contract.openingBalance,
              });
              payment.save()
                .then(() => {
                  const transaction = new Transaction({
                    clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Royalties', amount: 110,
                  });
                  transaction.save()
                    .then(() => {
                      TaxAmounts.setTaxBasis(statement, period, client, (err) => {
                        expect(statement.taxBasis).to.eq(transaction.amount);
                        done();
                      });
                    }).catch(done);
                }).catch(done);
            }).catch(done);
        });
      });
      describe('when opening balance is less than min payment, a payment taking balance to a negative value is present, and closing balance is less than min payment', () => {
        it('should set value to 0', (done) => {
          contract.openingBalance = 90;
          contract.statementDesign = 'Standard';
          contract.save()
            .then(() => {
              const payment = new Transaction({
                clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Payment', type: 'Payment', amount: -10 - contract.openingBalance,
              });
              payment.save()
                .then(() => {
                  const transaction = new Transaction({
                    clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Royalties', amount: 50,
                  });
                  transaction.save()
                    .then(() => {
                      TaxAmounts.setTaxBasis(statement, period, client, (err) => {
                        expect(statement.taxBasis).to.eq(0);
                        done();
                      });
                    }).catch(done);
                }).catch(done);
            }).catch(done);
        });
      });
      describe('when opening balance is less than min payment, a payment taking balance to a negative value is present, and closing balance is greater than min payment', () => {
        it.skip('should set value to closing balance', (done) => {
          contract.openingBalance = 90;
          contract.statementDesign = 'Standard';
          contract.save()
            .then(() => {
              const payment = new Transaction({
                clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Payment', type: 'Payment', amount: -10 - contract.openingBalance,
              });
              payment.save()
                .then(() => {
                  const transaction = new Transaction({
                    clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Royalties', amount: 250,
                  });
                  transaction.save()
                    .then(() => {
                      TaxAmounts.setTaxBasis(statement, period, client, (err) => {
                        expect(statement.taxBasis).to.eq(-10 + transaction.amount);
                        done();
                      });
                    }).catch(done);
                }).catch(done);
            }).catch(done);
        });
      });
      describe('when opening balance is less than min payment, a payment taking balance to a positive value is present, and closing balance is less than min payment', () => {
        it('should set value to 0', (done) => {
          contract.openingBalance = 90;
          contract.statementDesign = 'Standard';
          contract.save()
            .then(() => {
              const payment = new Transaction({
                clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Payment', type: 'Payment', amount: 10 - contract.openingBalance,
              });
              payment.save()
                .then(() => {
                  const transaction = new Transaction({
                    clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Royalties', amount: 50,
                  });
                  transaction.save()
                    .then(() => {
                      TaxAmounts.setTaxBasis(statement, period, client, (err) => {
                        expect(statement.taxBasis).to.eq(0);
                        done();
                      });
                    }).catch(done);
                }).catch(done);
            }).catch(done);
        });
      });
      describe('when opening balance is less than min payment, a payment taking balance to a positive value is present, and closing balance is greater than min payment', () => {
        // This considers the opening balance should be included in the tax amount, since it will not have been valued before, but payment of it means any payment amount will be deducted
        // An unlikely scenario, but totally possible in the setup
        it.skip('should set value to the royalties that period', (done) => {
          contract.openingBalance = 90;
          contract.statementDesign = 'Standard';
          contract.save()
            .then(() => {
              const payment = new Transaction({
                clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Payment', type: 'Payment', amount: 10 - contract.openingBalance,
              });
              payment.save()
                .then(() => {
                  const transaction = new Transaction({
                    clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Royalties', amount: 250,
                  });
                  transaction.save()
                    .then(() => {
                      TaxAmounts.setTaxBasis(statement, period, client, (err) => {
                        expect(statement.taxBasis).to.eq(transaction.amount + payment.amount + contract.openingBalance);
                        done();
                      });
                    }).catch(done);
                }).catch(done);
            }).catch(done);
        });
      });
      describe('when opening balance is greater than min payment, a payment taking balance to 0 is present, and closing balance is less than min payment', () => {
        it('should set value to 0', (done) => {
          contract.openingBalance = 110;
          contract.statementDesign = 'Standard';
          contract.save()
            .then(() => {
              const payment = new Transaction({
                clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Payment', type: 'Payment', amount: 0 - contract.openingBalance,
              });
              payment.save()
                .then(() => {
                  const transaction = new Transaction({
                    clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Royalties', amount: 50,
                  });
                  transaction.save()
                    .then(() => {
                      TaxAmounts.setTaxBasis(statement, period, client, (err) => {
                        expect(statement.taxBasis).to.eq(0);
                        done();
                      });
                    }).catch(done);
                }).catch(done);
            }).catch(done);
        });
      });
      describe('when opening balance is greater than min payment, a payment taking balance to 0 is present, and closing balance is greater than min payment', () => {
        it.skip('should set value to closing balance', (done) => {
          contract.openingBalance = 110;
          contract.statementDesign = 'Standard';
          contract.save()
            .then(() => {
              const payment = new Transaction({
                clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Payment', type: 'Payment', amount: 0 - contract.openingBalance,
              });
              payment.save()
                .then(() => {
                  const transaction = new Transaction({
                    clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Royalties', amount: 150,
                  });
                  transaction.save()
                    .then(() => {
                      TaxAmounts.setTaxBasis(statement, period, client, (err) => {
                        expect(statement.taxBasis).to.eq(transaction.amount);
                        done();
                      });
                    }).catch(done);
                }).catch(done);
            }).catch(done);
        });
      });
      describe('when opening balance is greater than min payment, a payment taking balance to a negative value is present, and closing balance is less than min payment', () => {
        it('should set value to 0', (done) => {
          contract.openingBalance = 110;
          contract.statementDesign = 'Standard';
          contract.save()
            .then(() => {
              const payment = new Transaction({
                clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Payment', type: 'Payment', amount: -10 - contract.openingBalance,
              });
              payment.save()
                .then(() => {
                  const transaction = new Transaction({
                    clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Royalties', amount: 50,
                  });
                  transaction.save()
                    .then(() => {
                      TaxAmounts.setTaxBasis(statement, period, client, (err) => {
                        expect(statement.taxBasis).to.eq(0);
                        done();
                      });
                    }).catch(done);
                }).catch(done);
            }).catch(done);
        });
      });
      describe('when opening balance is greater than min payment, a payment taking balance to a negative value is present, and closing balance is greater than min payment', () => {
        it.skip('should set value to closing balance', (done) => {
          contract.openingBalance = 110;
          contract.statementDesign = 'Standard';
          contract.save()
            .then(() => {
              const payment = new Transaction({
                clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Payment', type: 'Payment', amount: -10 - contract.openingBalance,
              });
              payment.save()
                .then(() => {
                  const transaction = new Transaction({
                    clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Royalties', amount: 250,
                  });
                  transaction.save()
                    .then(() => {
                      TaxAmounts.setTaxBasis(statement, period, client, (err) => {
                        const today = new Date();
                        today.setDate(today.getDate() + 1);
                        contract.balanceAtDate(today, (err, balance) => {
                          expect(statement.taxBasis).to.eq(balance);
                          done();
                        });
                      });
                    }).catch(done);
                }).catch(done);
            }).catch(done);
        });
      });
      describe('when opening balance is greater than min payment, a payment taking balance to a positive value is present, and closing balance is less than min payment', () => {
        it('should set value to 0', (done) => {
          contract.openingBalance = 110;
          contract.statementDesign = 'Standard';
          contract.save()
            .then(() => {
              const payment = new Transaction({
                clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Payment', type: 'Payment', amount: 10 - contract.openingBalance,
              });
              payment.save()
                .then(() => {
                  const transaction = new Transaction({
                    clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Royalties', amount: 50,
                  });
                  transaction.save()
                    .then(() => {
                      TaxAmounts.setTaxBasis(statement, period, client, (err) => {
                        expect(statement.taxBasis).to.eq(0);
                        done();
                      });
                    }).catch(done);
                }).catch(done);
            }).catch(done);
        });
      });
      describe('when opening balance is greater than min payment, a payment taking balance to a positive value is present, and closing balance is greater than min payment', () => {
        it.skip('should set value to royalty amount', (done) => {
          contract.openingBalance = 110;
          contract.statementDesign = 'Standard';
          contract.save()
            .then(() => {
              const payment = new Transaction({
                clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Payment', type: 'Payment', amount: 100,
              });
              payment.save()
                .then(() => {
                  const transaction = new Transaction({
                    clientId, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Royalties', amount: 250,
                  });
                  transaction.save()
                    .then(() => {
                      TaxAmounts.setTaxBasis(statement, period, client, (err) => {
                        expect(statement.taxBasis).to.eq(transaction.amount);
                        done();
                      });
                    }).catch(done);
                }).catch(done);
            }).catch(done);
        });
      });
    });
  });

  describe('#createTaxAmounts', () => {
    beforeEach((done) => {
      Transaction.deleteMany({ clientId })
        .then(() => {
          statement.selfBillingTaxAmount = 0;
          statement.withholdingTax = 0;
          statement.feesInvoiceTaxAmount = 0;
          contract.selfBilling = true;
          contract.deductWithholding = true;
          contract.payeeId = payee._id;
          contract.save()
            .then(() => done())
            .catch(done);
        }).catch(done);
    });
    describe('when contract has selfBilling selected', () => {
      it('should set the selfBillingInvoiceNo', (done) => {
        contract.selfBilling = true;
        contract.save()
          .then(() => {
            TaxAmounts.create(statement, period, client, () => {
              expect(statement.selfBillingInvoiceNo).to.exist;
              done();
            });
          }).catch(done);
      });
    });
    describe('when contract has feesInvoice selected', () => {
      it('should set the feesInvoiceNo', (done) => {
        contract.feesInvoice = true;
        contract.save()
          .then(() => {
            TaxAmounts.create(statement, period, client, () => {
              expect(statement.selfBillingInvoiceNo).to.exist;
              done();
            });
          }).catch(done);
      });
    });
    describe('setting withholding tax', () => {
      describe('when taxBasis is 0', () => {
        it('should set withholdingTax to 0', (done) => {
          statement.taxBasis = 0;
          TaxAmounts.create(statement, period, client, () => {
            expect(statement.withholdingTax).to.eq(0);
            done();
          });
        });
      });
      describe('when taxBasis is not 0', () => {
        describe('and withholdingTax is already set', () => {
          it('should flip amount to negative', (done) => {
            statement.taxBasis = 100;
            const inputTaxAmount = 200;
            statement.withholdingTax = inputTaxAmount;
            TaxAmounts.create(statement, period, client, () => {
              expect(statement.withholdingTax).to.eq(0 - inputTaxAmount);
              done();
            });
          });
        });
        describe('and withholdingTax is not set', () => {
          describe('and contract has a payee associated', () => {
            describe('and payee has a withholding rate set', () => {
              it('should set withholdingTax to taxBasis multiplied by payee.withholdingTaxRate', (done) => {
                payee.withholdingTaxRate = 5;
                payee.save()
                  .then(() => {
                    contract.selfBilling = true;
                    contract.save()
                      .then(() => {
                        statement.taxBasis = 100;
                        statement.withholdingTax = 0;
                        TaxAmounts.create(statement, period, client, () => {
                          expect(statement.withholdingTax).to.eq(0 - (statement.taxBasis * (payee.withholdingTaxRate / 100)));
                          done();
                        });
                      }).catch(done);
                  }).catch(done);
              });
            });
            describe('and payee does not have a withholding rate set', () => {
              it('should set withholdingTax to 0', (done) => {
                payee.withholdingTaxRate = null;
                payee.save()
                  .then(() => {
                    contract.selfBilling = true;
                    contract.save()
                      .then(() => {
                        statement.taxBasis = 100;
                        statement.withholdingTax = 0;
                        TaxAmounts.create(statement, period, client, () => {
                          expect(statement.withholdingTax).to.eq(0);
                          done();
                        });
                      }).catch(done);
                  }).catch(done);
              });
            });
          });
          describe('and contract DOES NOT have a payee associated', () => {
            it('should set withholdingTax to 0', (done) => {
              contract.selfBilling = true;
              contract.payeeId = null;
              contract.save()
                .then(() => {
                  statement.taxBasis = 100;
                  statement.withholdingTax = 0;
                  TaxAmounts.create(statement, period, client, () => {
                    expect(statement.withholdingTax).to.eq(0);
                    done();
                  });
                }).catch(done);
            });
          });
        });
      });
    });
    describe('setting VAT', () => {
      describe('when taxBasis is 0', () => {
        it('should set selfBillingTaxAmount to 0', (done) => {
          payee.withholdingTaxRate = 0;
          payee.selfBillingTaxRate = 20;
          payee.save()
            .then(() => {
              contract.selfBilling = true;
              contract.save()
                .then(() => {
                  statement.taxBasis = 0;
                  statement.withholdingTax = 0;
                  TaxAmounts.create(statement, period, client, () => {
                    expect(statement.selfBillingTaxAmount).to.eq(0);
                    done();
                  });
                }).catch(done);
            }).catch(done);
        });
      });
      describe('when taxBasis is not 0', () => {
        describe('and contract has a payee associated', () => {
          describe('and contract has selfBilling selected', () => {
            describe('and when withholding is 0', () => {
              it("should set selfBillingTaxAmount to taxBasis multiplied by the payee's selfBillingTaxRate", (done) => {
                payee.selfBillingTaxRate = 20;
                payee.withholdingTaxRate = 0;
                payee.save()
                  .then(() => {
                    contract.selfBilling = true;
                    contract.save()
                      .then(() => {
                        statement.withholdingTax = 0;
                        statement.taxBasis = 100;
                        TaxAmounts.create(statement, period, client, () => {
                          expect(statement.selfBillingTaxAmount).to.eq(statement.taxBasis * (payee.selfBillingTaxRate / 100));
                          done();
                        });
                      }).catch(done);
                  }).catch(done);
              });
            });
            describe('and when withholding is NOT 0', () => {
              it("should set selfBillingTaxAmount to taxBasis multiplied by the payee's selfBillingTaxRate", (done) => {
                payee.selfBillingTaxRate = 20;
                payee.withholdingTaxRate = 5;
                payee.save()
                  .then(() => {
                    contract.selfBilling = true;
                    contract.save()
                      .then(() => {
                        const transaction = new Transaction({
                          clientId: client._id, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Royalties', amount: 100,
                        });
                        transaction.save()
                          .then(() => {
                            statement.withholdingTax = 10;
                            statement.taxBasis = 100;
                            TaxAmounts.create(statement, period, client, () => {
                              expect(statement.selfBillingTaxAmount).to.eq(statement.taxBasis * (payee.selfBillingTaxRate / 100));
                              expect(statement.selfBillingTaxAmount).to.not.eq((statement.taxBasis + statement.withholdingTax) * (payee.selfBillingTaxRate / 100));
                              done();
                            });
                          }).catch(done);
                      }).catch(done);
                  }).catch(done);
              });
            });
            describe('and when withholding is NOT 0 and self billing tax rate is 0', () => {
              it("should set selfBillingTaxAmount to taxBasis multiplied by the payee's selfBillingTaxRate", (done) => {
                payee.selfBillingTaxRate = 0;
                payee.withholdingTaxRate = 5;
                payee.save()
                  .then(() => {
                    contract.selfBilling = true;
                    contract.save()
                      .then(() => {
                        const transaction = new Transaction({
                          clientId: client._id, contractId: contract._id, statementId: statement._id, date: new Date(), userCreated: false, name: 'Royalties', amount: 100,
                        });
                        transaction.save()
                          .then(() => {
                            statement.withholdingTax = 10;
                            statement.taxBasis = 100;
                            TaxAmounts.create(statement, period, client, () => {
                              expect(statement.selfBillingTaxAmount).to.eq(statement.taxBasis * (payee.selfBillingTaxRate / 100));
                              done();
                            });
                          }).catch(done);
                      }).catch(done);
                  }).catch(done);
              });
            });
          });
          describe('and contract DOES NOT have selfBilling selected', () => {
            it('should set selfBillingTaxAmount to 0', (done) => {
              payee.withholdingTaxRate = 0;
              payee.selfBillingTaxRate = 20;
              payee.save()
                .then(() => {
                  contract.selfBilling = false;
                  contract.save()
                    .then(() => {
                      statement.taxBasis = 100;
                      statement.withholdingTax = 0;
                      TaxAmounts.create(statement, period, client, () => {
                        expect(statement.selfBillingTaxAmount).to.eq(0);
                        done();
                      });
                    }).catch(done);
                }).catch(done);
            });
          });
        });
        describe('and contract DOES NOT have a payee associated', () => {
          it('should set selfBillingTaxAmount to 0', (done) => {
            contract.selfBilling = true;
            contract.payeeId = null;
            contract.save()
              .then(() => {
                statement.taxBasis = 0;
                statement.withholdingTax = 0;
                TaxAmounts.create(statement, period, client, () => {
                  expect(statement.selfBillingTaxAmount).to.eq(0);
                  done();
                });
              }).catch(done);
          });
        });
      });
    });
    describe('setting Fees Amount', () => {
      describe('and contract has a payee associated', () => {
        describe('when feesInvoice is selected', () => {
          it('should set feesInvoice to grossAmount * payee.feesInvoiceTaxRate', (done) => {
            payee.feesInvoiceTaxRate = 10;
            payee.save()
              .then(() => {
                contract.feesInvoice = true;
                contract.save()
                  .then(() => {
                    statement.grossAmount = 200;
                    statement.withholdingTax = 10;
                    statement.taxBasis = 100;
                    TaxAmounts.create(statement, period, client, () => {
                      expect(statement.feesInvoiceTaxAmount).to.eq(0 - (statement.grossAmount * (payee.feesInvoiceTaxRate / 100)));
                      done();
                    });
                  }).catch(done);
              }).catch(done);
          });
        });
        describe('when feesInvoice is NOT selected', () => {
          it('should set feesInvoice to 0', (done) => {
            payee.feesInvoiceTaxRate = 10;
            payee.save()
              .then(() => {
                contract.feesInvoice = false;
                contract.save()
                  .then(() => {
                    statement.grossAmount = 200;
                    statement.withholdingTax = 10;
                    statement.taxBasis = 100;
                    TaxAmounts.create(statement, period, client, () => {
                      expect(statement.feesInvoiceTaxAmount).to.eq(0);
                      done();
                    });
                  }).catch(done);
              }).catch(done);
          });
        });
      });
      describe('and contract DOES NOT have a payee associated', () => {
        it('should set feesInvoice to 0', (done) => {
          contract.feesInvoice = true;
          contract.payeeId = null;
          contract.save()
            .then(() => {
              statement.grossAmount = 200;
              statement.withholdingTax = 10;
              statement.taxBasis = 100;
              TaxAmounts.create(statement, period, client, () => {
                expect(statement.feesInvoiceTaxAmount).to.eq(0);
                done();
              });
            }).catch(done);
        });
      });
    });
  });
});
