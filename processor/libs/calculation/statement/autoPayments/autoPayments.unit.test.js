const { randomId, randomString, randomInt, randomDate, randomBoolean, randomError } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const balanceAtDate = require('../../contract/balanceAtDate');
const AutoPayments = require('./autoPayments');

const Client = require('../../../../models/client');
const Contract = require('../../../../models/contract');
const Payment = require('../../../../models/payment');
const PaymentGroup = require('../../../../models/paymentGroup');
const Statement = require('../../../../models/statement');
const Transaction = require('../../../../models/transaction');

jest.mock('../../contract/balanceAtDate', () => jest.fn());

// Mock Payment to capture constructor arguments
const paymentConstructorArgs = [];
jest.mock('../../../../models/payment', () => jest.fn().mockImplementation((args) => {
  paymentConstructorArgs.push(args);
  return {
    save: jest.fn().mockResolvedValue(),
    ...args,
  };
}));

describe('AssociatedAddToContractIds Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    paymentConstructorArgs.length = 0; // Clear the array
  });

  describe('create', () => {
    let statement; let period; let generatePayments; let contract; let findByIdAndUpdateStub;

    beforeEach(() => {
      period = { _id: randomId() };
      contract = { _id: randomId() };
      statement = { periodId: period._id, contractId: contract._id };
      generatePayments = true;

      jest.spyOn(AutoPayments, 'triggerAutoPayment').mockImplementation((stmt, ctr, date, cb) => cb(true));
      jest.spyOn(Contract, 'findById').mockResolvedValue(contract);

      findByIdAndUpdateStub = jest.spyOn(Statement, 'findByIdAndUpdate').mockReturnValue({ exec: jest.fn().mockResolvedValue() });

      jest.spyOn(Transaction.prototype, 'save').mockResolvedValue();
      jest.spyOn(PaymentGroup, 'findOne').mockResolvedValue(undefined);
      jest.spyOn(PaymentGroup.prototype, 'save').mockResolvedValue();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should call Contract.findById with the right args', () => {
      AutoPayments.create(statement, period, generatePayments, () => {
        expect(Contract.findById).toHaveBeenCalledWith(statement.contractId);
      });
    });

    it('should return the error to the callback when Contract.findById returns an error', () => {
      const expectedError = new Error(`Could not find contract with the ID ${statement.contractId} in creating auto payments`);
      Contract.findById.mockRejectedValue(expectedError);
      AutoPayments.create(statement, period, generatePayments, (err) => {
        expect(err.message).toBe(expectedError.message);
      });
    });

    it('should return the error to the callback when Contract.findById doesnt return a contract', () => {
      const expectedError = new Error(`Could not find contract with the ID ${statement.contractId} in creating auto payments`);
      Contract.findById.mockResolvedValue(null);
      AutoPayments.create(statement, period, generatePayments, (err) => {
        expect(err.message).toBe(expectedError.message);
      });
    });

    it('should call AutoPayments.triggerAutoPayment with the right args', () => {
      period.endDate = randomDate();
      const expectedAccountingDate = new Date(period.endDate);
      expectedAccountingDate.setDate(expectedAccountingDate.getDate() + 1);
      AutoPayments.create(statement, period, generatePayments, () => {
        expect(AutoPayments.triggerAutoPayment).toHaveBeenCalledWith(statement, contract, expectedAccountingDate, expect.any(Function));
      });
    });

    it('should call Statement.findByIdAndUpdate with the right args', () => {
      period.endDate = randomDate();
      const reason = randomString();
      const triggerAutoPayment = randomBoolean();
      AutoPayments.triggerAutoPayment.mockImplementation((stmt, ctr, date, cb) => cb(triggerAutoPayment, reason));
      AutoPayments.create(statement, period, generatePayments, () => {
        expect(findByIdAndUpdateStub).toHaveBeenCalledWith(statement._id, { $set: { autoPaymentTriggered: triggerAutoPayment, autoPaymentNotTriggeredReason: reason } });
      });
    });

    describe('when triggerAutoPayment', () => {
      beforeEach(() => {
        jest.spyOn(Client, 'findById').mockResolvedValue();
      });

      it('should create a payment transaction', () => {
        AutoPayments.create(statement, period, generatePayments, () => {
          expect(Transaction.prototype.save).toHaveBeenCalled();
        });
      });

      it('should not create a payment when generatePayments is false', () => {
        generatePayments = false;
        AutoPayments.create(statement, period, generatePayments, () => {
          expect(Client.findById).not.toHaveBeenCalled();
        });
      });

      it('should not create a payment when no contract.payeeId', () => {
        AutoPayments.create(statement, period, generatePayments, () => {
          expect(Client.findById).not.toHaveBeenCalled();
        });
      });

      it('should not create a payment when closingBalance is 0', () => {
        AutoPayments.triggerAutoPayment.mockImplementation((stmt, ctr, date, cb) => cb(true, randomString(), 0));
        AutoPayments.create(statement, period, generatePayments, () => {
          expect(Client.findById).not.toHaveBeenCalled();
        });
      });

      it('should call Client.findById with the right args', () => {
        statement._id = randomId();
        statement.clientId = randomId();
        AutoPayments.triggerAutoPayment.mockImplementation((stmt, ctr, date, cb) => cb(true, randomString(), randomInt()));
        contract.payees = [{ payeeId: randomId() }];
        contract.payeeBalanceCondition = 'Never';
        Client.findById.mockRejectedValue(randomError());
        AutoPayments.create(statement, period, generatePayments, () => {
          expect(Client.findById).toHaveBeenCalledWith(statement.clientId, 'homeCurrency features');
        });
      });

      it('should call PaymentGroup.findOne with the right args', () => {
        const paymentGroup = { _id: randomId() };
        PaymentGroup.findOne.mockResolvedValue(paymentGroup);

        statement._id = randomId();
        statement.clientId = randomId();
        AutoPayments.triggerAutoPayment.mockImplementation((stmt, ctr, date, cb) => cb(true, randomString(), randomInt()));
        contract.payees = [{ payeeId: randomId() }];
        contract.payeeBalanceCondition = 'Never';
        Client.findById.mockResolvedValue(null);

        AutoPayments.create(statement, period, generatePayments, () => {
          expect(PaymentGroup.findOne).toHaveBeenCalledWith({ clientId: statement.clientId, periodId: statement.periodId });
        });
      });

      describe('when no payment group is found', () => {
        beforeEach(() => {
          statement._id = randomId();
          statement.clientId = randomId();
          AutoPayments.triggerAutoPayment.mockImplementation((stmt, ctr, date, cb) => cb(true, randomString(), randomInt()));
          contract.payees = [{ payeeId: randomId() }];
          contract.payeeBalanceCondition = 'Never';
          period.name = randomString();
          Client.findById.mockResolvedValue(null);

          const paymentGroup = { _id: randomId() };
          PaymentGroup.findOne.mockResolvedValue(null);
          PaymentGroup.prototype.save.mockResolvedValue(paymentGroup);
        });

        it('should create a payment group', () => {
          AutoPayments.create(statement, period, generatePayments, () => {
            expect(PaymentGroup.prototype.save).toHaveBeenCalled();
          });
        });

        it('should create a payment', () => {
          AutoPayments.create(statement, period, generatePayments, () => {
            expect(Payment).toHaveBeenCalled();
          });
        });

        it('should create a payment containing withholding tax', () => {
          statement.withholdingTax = randomInt();
          contract.currency = 'USD';

          const client = { homeCurrency: 'EUR' };
          Client.findById.mockResolvedValue(client);

          AutoPayments.create(statement, period, generatePayments, () => {
            expect(Payment).toHaveBeenCalled();
            expect(paymentConstructorArgs).toContainEqual(expect.objectContaining({
              withholdingTaxAmount: statement.withholdingTax,
              withholdingTaxCurrency: contract.currency,
            }));
          });
        });
      });

      describe('when payment group is found', () => {
        it('should create a payment', () => {
          statement._id = randomId();
          statement.clientId = randomId();
          statement.withholdingTax = randomInt();
          AutoPayments.triggerAutoPayment.mockImplementation((stmt, ctr, date, cb) => cb(true, randomString(), randomInt()));
          contract.payees = [{ payeeId: randomId() }];
          contract.payeeBalanceCondition = 'Never';
          contract.currency = 'USD';
          period.name = randomString();

          const client = { homeCurrency: 'EUR' };
          Client.findById.mockResolvedValue(client);

          const paymentGroup = { _id: randomId() };
          PaymentGroup.findOne.mockResolvedValue(null);
          PaymentGroup.prototype.save.mockResolvedValue(paymentGroup);

          AutoPayments.create(statement, period, generatePayments, () => {
            expect(Payment).toHaveBeenCalled();
            expect(Payment).toHaveBeenCalledWith(expect.objectContaining({
              withholdingTaxAmount: statement.withholdingTax,
              withholdingTaxCurrency: contract.currency,
            }));
          });
        });
      });
    });
  });

  describe('#triggerAutoPayment', () => {
    let statement; let contract; let accountingDate;

    beforeEach(() => {
      contract = {
        _id: randomId(),
        autoPayment: true,
        type: 'Profit Share',
        autoPaymentConditions: [
          { contractId: randomId(), condition: 'Balance is Positive, Ignoring Advance' },
        ],
      };
      statement = { _id: randomString(), contractId: contract._id, withholdingTax: randomInt() };

      balanceAtDate.mockImplementation((ctr, date, opts, cb) => cb(null, randomInt() + statement.withholdingTax));

      jest.spyOn(Contract, 'findById').mockResolvedValue(contract);
      jest.spyOn(Statement, 'findOne').mockResolvedValue(statement);
    });

    it('should call balanceAtDate with the right args when contract is profit share', () => {
      statement.contractType = 'Profit Share';
      const options = { excludeReserves: true };
      accountingDate = randomDate();
      AutoPayments.triggerAutoPayment(statement, contract, accountingDate, () => {
        expect(balanceAtDate).toHaveBeenCalledWith(contract, accountingDate, options, expect.any(Function));
      });
    });

    it('should call balanceAtDate with the right args when contract is Profit Share - Flexible', () => {
      statement.contractType = 'Profit Share - Flexible';
      const options = { excludeReserves: true };
      accountingDate = randomDate();
      AutoPayments.triggerAutoPayment(statement, contract, accountingDate, () => {
        expect(balanceAtDate).toHaveBeenCalledWith(contract, accountingDate, options, expect.any(Function));
      });
    });

    it('should call balanceAtDate with the right args when contract is not profit share or Profit Share - Flexible', () => {
      statement.contractType = randomString();
      const options = {};
      accountingDate = randomDate();
      AutoPayments.triggerAutoPayment(statement, contract, accountingDate, () => {
        expect(balanceAtDate).toHaveBeenCalledWith(contract, accountingDate, options, expect.any(Function));
      });
    });

    it('should set contract.minPayout to 0 when no contract.minPayout', () => {
      statement.contractType = 'Profit Share - Flexible';
      AutoPayments.triggerAutoPayment(statement, contract, accountingDate, () => {
        expect(contract.minPayout).toBe(0);
      });
    });

    it('should return false when contract.autoPayment is false', () => {
      statement.contractType = 'Profit Share - Flexible';
      contract.autoPayment = false;
      AutoPayments.triggerAutoPayment(statement, contract, accountingDate, (expectedResult) => {
        expect(expectedResult).toBe(false);
      });
    });

    it('should return true when no contract.autoPaymentConditions, closingBalance - statement.withholdingTax > 0 and closingBalance - statement.withholdingTax >= minPayout', () => {
      statement.contractType = 'Profit Share - Flexible';
      contract.autoPaymentConditions = [];
      contract.minPayout = 0;
      AutoPayments.triggerAutoPayment(statement, contract, accountingDate, (expectedResult) => {
        expect(expectedResult).toBe(true);
      });
    });

    describe('when contract.autoPaymentConditions, closingBalance - statement.withholdingTax > 0 and closingBalance - statement.withholdingTax >= minPayout', () => {
      beforeEach(() => {
        contract.minPayout = 0;
      });

      describe('when autoPayment.contractId and autoPayment.condition', () => {
        it('should call Contract.findById with the right args', () => {
          AutoPayments.triggerAutoPayment(statement, contract, accountingDate, () => {
            expect(Contract.findById).toHaveBeenCalledWith(contract.autoPaymentConditions[0].contractId);
          });
        });

        it('should call Statement.findOne with the right args', () => {
          AutoPayments.triggerAutoPayment(statement, contract, accountingDate, () => {
            expect(Statement.findOne).toHaveBeenCalledWith({ clientId: statement.clientId, contractId: contract._id.toString(), periodId: statement.periodId }, '_id');
          });
        });

        it('should call balanceAtDate with the right args when foundContract.type is Profit Share or Profit Share - Flexible', () => {
          const statementId = statement ? statement._id.toString() : null;
          const contractBalanceFilter = { excludeStatementPayments: true, statementId, excludeContractTransfersTos: true };
          contractBalanceFilter.excludeReserves = true;
          contract.autoPaymentConditions[0].condition = randomString();
          AutoPayments.triggerAutoPayment(statement, contract, accountingDate, () => {
            expect(balanceAtDate).toHaveBeenCalledWith(contract, accountingDate, contractBalanceFilter, expect.any(Function));
          });
        });

        it('should call balanceAtDate with the right args when autoPayment.condition is Balance is Positive, Ignoring Advance', () => {
          contract.type = randomString();
          const statementId = statement ? statement._id.toString() : null;
          const contractBalanceFilter = { excludeStatementPayments: true, statementId, excludeContractTransfersTos: true };
          contractBalanceFilter.excludeAdvance = true;
          AutoPayments.triggerAutoPayment(statement, contract, accountingDate, () => {
            expect(balanceAtDate).toHaveBeenCalledWith(contract, accountingDate, contractBalanceFilter, expect.any(Function));
          });
        });

        it('should call balanceAtDate with the right args when autoPayment.condition is not Balance is Positive, Ignoring Advance and foundContract.type is not Profit Share or Profit Share - Flexible', () => {
          contract.type = randomString();
          contract.autoPaymentConditions[0].condition = randomString();
          const statementId = statement ? statement._id.toString() : null;
          const contractBalanceFilter = { excludeStatementPayments: true, statementId, excludeContractTransfersTos: true };
          AutoPayments.triggerAutoPayment(statement, contract, accountingDate, () => {
            expect(balanceAtDate).toHaveBeenCalledWith(contract, accountingDate, contractBalanceFilter, expect.any(Function));
          });
        });

        it('should set triggerAutoPayment to false and condition to Conditions Not Met when closingBalance is negative', () => {
          const closingBalance = 0 - randomInt();
          balanceAtDate
            .mockImplementationOnce((ctr, date, opts, cb) => cb(null, randomInt() + statement.withholdingTax))
            .mockImplementationOnce((ctr, date, opts, cb) => cb(null, closingBalance));

          AutoPayments.triggerAutoPayment(statement, contract, accountingDate, (triggerAutoPayment, message) => {
            expect(triggerAutoPayment).toBe(false);
            expect(message).toBe('Conditions Not Met');
          });
        });
      });
    });
  });
});
