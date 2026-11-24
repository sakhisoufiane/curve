const { randomString, randomId, randomInt, randomDate } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { promisify } = require('util');
const moment = require('moment');

const mockContractBalance = randomInt();
jest.mock('../contract/balanceAtDate');
const balanceAtDate = require('../contract/balanceAtDate');

balanceAtDate.mockImplementation((contract, date, opts, cb) => cb(null, mockContractBalance));

const ProfitShare = require('./profitShare');
const Contract = require('../../../models/contract');
const Transaction = require('../../../models/transaction');
const Statement = require('../../../models/statement');
const Period = require('../../../models/period');

describe('ProfitShare Unit Tests', () => {
  let statement; let period; let contract; let transactions;

  beforeEach(() => {
    statement = new Statement({
      _id: randomId(),
      name: randomString(),
      contractId: randomId(),
      date: randomDate(),
      clientId: randomString(),
    });

    period = new Period({
      name: randomString(),
      startDate: randomDate(),
      endDate: randomDate(),
      clientId: randomString(),
    });

    contract = new Contract({ name: randomString() });

    transactions = [
      { amount: randomInt() },
      { amount: randomInt() },
      { amount: randomInt() },
    ];

    // Mock all the common dependencies
    jest.spyOn(Contract, 'findById').mockImplementation((id, callback) => {
      if (callback) {
        callback(null, contract);
      } else {
        return Promise.resolve(contract);
      }
    });

    jest.spyOn(Transaction, 'find').mockImplementation((query, callback) => {
      if (typeof callback === 'function') {
        callback(null, transactions);
      } else {
        return {
          lean: () => Promise.resolve(transactions),
        };
      }
    });

    jest.spyOn(Transaction, 'deleteMany').mockImplementation((query, callback) => Promise.resolve());

    jest.spyOn(Transaction.prototype, 'save').mockImplementation((callback) => {
      if (callback) callback(null);
      return Promise.resolve();
    });

    jest.spyOn(Statement, 'findById').mockResolvedValue(statement);

    statement.save = jest.fn((cb) => {
      if (cb) cb(null, statement);
      else return Promise.resolve(statement);
    });

    jest.spyOn(ProfitShare, 'profitShareFigures');
  });

  describe('profitShare100Negative', () => {
    let profitShare100NegativeAsync;

    beforeEach(() => {
      profitShare100NegativeAsync = promisify(ProfitShare.profitShare100Negative);
      ProfitShare.profitShareFigures.mockImplementation((statement, period, contract, cb) => cb());
    });

    it('should call Contract.findById with correct args', async () => {
      await profitShare100NegativeAsync(statement, period);
      expect(Contract.findById).toHaveBeenCalledWith(statement.contractId);
    });

    it('should call ProfitShare.profitShareFigures with the right args', async () => {
      await profitShare100NegativeAsync(statement, period);
      expect(ProfitShare.profitShareFigures).toHaveBeenCalledWith(statement, period, contract, expect.any(Function));
    });

    it('should retain defined profitShareRate', async () => {
      const rate = randomInt();
      statement.profitShareRate = rate;
      await profitShare100NegativeAsync(statement, period);
      expect(statement.profitShareRate).toBe(rate);
    });

    it('should set profitShareRate to 0 if undefined', async () => {
      statement.profitShareRate = null;
      await profitShare100NegativeAsync(statement, period);
      expect(statement.profitShareRate).toBe(0);
    });

    it('should set statement.profitShareAdvanceRecouped to 0', async () => {
      await profitShare100NegativeAsync(statement, period);
      expect(statement.profitShareAdvanceRecouped).toBe(0);
    });

    describe('when output > 0', () => {
      let output;

      beforeEach(() => {
        statement.netAmount = randomInt();
        statement.netCosts = statement.netAmount - 0.1;
        statement.reservesReleased = randomInt();
        statement.reservesWithheld = statement.reservesReleased - 0.1;
        statement.openingBalance = randomInt();
        statement.payments = randomInt();
        statement.profitShareRate = randomInt();

        const thisPeriod = statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld;
        const startingBalanceAfterPayments = statement.openingBalance + statement.payments;
        output = startingBalanceAfterPayments + thisPeriod;
      });

      it('should set statement.profitShareBalance to output', async () => {
        await profitShare100NegativeAsync(statement, period);
        expect(statement.profitShareBalance).toBe(output);
      });

      describe('when statement.openingBalance < 0', () => {
        it('should set statement.profitShareNetAmount to the right value', async () => {
          statement.openingBalance = 0 - statement.payments - 0.1;
          const thisPeriod = statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld;
          const startingBalanceAfterPayments = statement.openingBalance + statement.payments;
          output = startingBalanceAfterPayments + thisPeriod;

          await profitShare100NegativeAsync(statement, period);
          const expectedValue = output * (statement.profitShareRate / 100);
          expect(statement.profitShareNetAmount).toBeCloseTo(expectedValue, 5);
        });
      });

      describe('when statement.openingBalance >= 0', () => {
        it('should set statement.profitShareNetAmount to the right value', async () => {
          await profitShare100NegativeAsync(statement, period);
          const expectedValue = (output - statement.openingBalance - statement.payments) * (statement.profitShareRate / 100);
          expect(statement.profitShareNetAmount).toBeCloseTo(expectedValue, 5);
        });
      });

      describe('when statement.profitShareNetAmount + statement.otherTransactions < 0', () => {
        it('should set statement.profitShareAdvanceRecouped to 0', async () => {
          statement.otherTransactions = 0 - (statement.profitShareNetAmount + 1);
          await profitShare100NegativeAsync(statement, period);
          expect(statement.profitShareAdvanceRecouped).toBe(0);
        });
      });

      describe('when statement.profitShareNetAmount + statement.otherTransactions > 0 - statement.profitShareUnrecoupedAdvanceStart', () => {
        it('should set statement.profitShareAdvanceRecouped to 0 - statement.profitShareUnrecoupedAdvanceStart', async () => {
          statement.profitShareAdvanceRecouped = randomInt();
          statement.otherTransactions = randomInt();
          statement.profitShareUnrecoupedAdvanceStart = randomInt();
          await profitShare100NegativeAsync(statement, period);
          expect(statement.profitShareAdvanceRecouped).toBe(0 - statement.profitShareUnrecoupedAdvanceStart);
        });
      });

      describe('when statement.profitShareUnrecoupedAdvanceStart', () => {
        describe('when statement.openingBalance is defined', () => {
          it('should set positiveOpeningBalance to statement.openingBalance + any payments made', async () => {
            statement.openingBalance = randomInt();
            statement.profitShareAdvanceRecouped = randomInt();
            statement.otherTransactions = randomInt();
            statement.profitShareUnrecoupedAdvanceStart = 0 - (statement.profitShareAdvanceRecouped + statement.otherTransactions) * 2;
            const positiveOpeningBalanceAfterPayments = statement.openingBalance + statement.payments;

            await profitShare100NegativeAsync(statement, period);

            expect(statement.profitShareAdvanceRecouped).toBe(statement.profitShareNetAmount + statement.otherTransactions + positiveOpeningBalanceAfterPayments);
          });
        });

        describe('when statement.openingBalance + payments is not defined', () => {
          it('should set positiveOpeningBalance to 0', async () => {
            statement.payments = null;
            statement.openingBalance = null;
            statement.profitShareAdvanceRecouped = randomInt();
            statement.otherTransactions = randomInt();
            statement.profitShareUnrecoupedAdvanceStart = 0 - (statement.profitShareAdvanceRecouped + statement.otherTransactions) * 2;

            await profitShare100NegativeAsync(statement, period);

            expect(statement.profitShareAdvanceRecouped).toBe(statement.profitShareNetAmount + statement.otherTransactions);
          });
        });
      });
    });

    describe('when output <= 0 && statement.payments != 0 && (Math.round(0 - statement.payments) != Math.round(statement.openingBalance))', () => {
      describe('when negativeValueShared > (0 - startingBalanceAfterPayments)', () => {
        let negativeValueShared;

        beforeEach(() => {
          statement.netAmount = randomInt();
          statement.netCosts = statement.netAmount * 2;
          statement.reservesReleased = randomInt();
          statement.reservesWithheld = statement.reservesReleased * 2;
          statement.openingBalance = 0 - randomInt();
          statement.payments = 0 - randomInt();
          statement.profitShareRate = 0 - randomInt() * 100;

          const thisPeriod = statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld;
          const startingBalanceAfterPayments = statement.openingBalance + statement.payments;
          const output = startingBalanceAfterPayments + thisPeriod;
          negativeValueShared = (output - startingBalanceAfterPayments) * (statement.profitShareRate / 100);
        });

        it('should set statement.profitShareBalance to negativeValueShared', async () => {
          await profitShare100NegativeAsync(statement, period);
          expect(statement.profitShareBalance).toBe(negativeValueShared);
        });

        it('should set statement.profitShareNetAmount to negativeValueShared', async () => {
          await profitShare100NegativeAsync(statement, period);
          expect(statement.profitShareNetAmount).toBe(negativeValueShared);
        });
      });

      describe('when negativeValueShared <= (0 - startingBalanceAfterPayments)', () => {
        let extraHeldAt100Percent;
        let startingBalanceAfterPayments;

        beforeEach(() => {
          statement.profitShareRate = 0 - randomInt() / 100;
          const thisPeriod = statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld;
          startingBalanceAfterPayments = statement.openingBalance + statement.payments;
          const output = startingBalanceAfterPayments + thisPeriod;
          const negativeValueShared = (output - startingBalanceAfterPayments) * statement.profitShareRate / 100;
          extraHeldAt100Percent = (startingBalanceAfterPayments + negativeValueShared) / statement.profitShareRate * 100;
        });

        it('should set statement.profitShareBalance to the right value', async () => {
          await profitShare100NegativeAsync(statement, period);
          expect(statement.profitShareBalance).toBe(0 - startingBalanceAfterPayments + extraHeldAt100Percent);
        });

        it('should set statement.profitShareNetAmount to the right value', async () => {
          await profitShare100NegativeAsync(statement, period);
          expect(statement.profitShareNetAmount).toBe(0 - startingBalanceAfterPayments + extraHeldAt100Percent);
        });
      });
    });

    describe('when output <= 0 && Math.round(statement.openingBalance) == Math.round(0 - statement.payments)', () => {
      let output;
      let thisPeriod;

      beforeEach(() => {
        statement.netAmount = randomInt();
        statement.netCosts = statement.netAmount * 2;
        statement.reservesReleased = randomInt();
        statement.reservesWithheld = statement.reservesReleased * 2;
        statement.openingBalance = 0 - randomInt();
        statement.payments = 0 - statement.openingBalance;

        thisPeriod = statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld;
        const startingBalanceAfterPayments = statement.openingBalance + statement.payments;
        output = startingBalanceAfterPayments + thisPeriod;
      });

      it('should set statement.profitShareBalance to output', async () => {
        await profitShare100NegativeAsync(statement, period);
        expect(statement.profitShareBalance).toBe(output);
      });

      it('should set statement.profitShareNetAmount to thisPeriod', async () => {
        await profitShare100NegativeAsync(statement, period);
        expect(statement.profitShareNetAmount).toBe(thisPeriod);
      });
    });

    it('should set balance and netAmount based on thisPeriod * rate when openingBalance > 0 and threshold condition met', async () => {
      statement.netAmount = randomInt();
      statement.netCosts = statement.netAmount * 2;
      statement.reservesReleased = randomInt();
      statement.reservesWithheld = 0;
      statement.openingBalance = randomInt({ min: 1, max: 1000 });
      statement.payments = 0;
      statement.profitShareRate = randomInt({ min: 1, max: 100 });

      const thisPeriod = statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld;
      const output = statement.openingBalance + statement.payments + thisPeriod;

      await profitShare100NegativeAsync(statement, period);

      expect(statement.profitShareBalance).toBe(output);
      expect(statement.profitShareNetAmount).toBeCloseTo(thisPeriod * (statement.profitShareRate / 100), 5);
    });

    it('should set balance/netAmount to negativeValueShared if it exceeds -startingBalanceAfterPayments', async () => {
      statement.netAmount = -70;
      statement.netCosts = 0;
      statement.reservesReleased = 0;
      statement.reservesWithheld = 0;
      statement.openingBalance = -10;
      statement.payments = 10;
      statement.profitShareRate = 100;

      const startingBalanceAfterPayments = 0;
      const output = -70;
      const negativeValueShared = (output - startingBalanceAfterPayments) * (statement.profitShareRate / 100); // -70

      await profitShare100NegativeAsync(statement, period);

      expect(statement.profitShareBalance).toBeCloseTo(negativeValueShared, 5);
      expect(statement.profitShareNetAmount).toBeCloseTo(negativeValueShared, 5);
    });

    describe('output <= 0 && statement.openingBalance > 0 && 0 - statement.openingBalance > output * statement.profitShareRate / 100', () => {
      let output;
      let thisPeriod;
      let startingBalanceAfterPayments;

      describe('negativeValueShared > (0 - statement.openingBalance)', () => {
        let negativeValueShared;

        beforeEach(() => {
          statement.netAmount = -300;
          statement.netCosts = 0;
          statement.reservesReleased = 0;
          statement.reservesWithheld = 0;
          statement.openingBalance = 50;
          statement.payments = 0;
          statement.profitShareRate = 99.999;

          thisPeriod = statement.netAmount;
          startingBalanceAfterPayments = statement.openingBalance + statement.payments;
          output = startingBalanceAfterPayments + thisPeriod;
          negativeValueShared = (output - statement.openingBalance) * (statement.profitShareRate / 100);
        });

        it('should set statement.profitShareBalance to negativeValueShared', async () => {
          await profitShare100NegativeAsync(statement, period);
          expect(statement.profitShareBalance).toBeCloseTo(negativeValueShared, 2);
        });

        it('should set statement.profitShareNetAmount to negativeValueShared', async () => {
          await profitShare100NegativeAsync(statement, period);
          expect(statement.profitShareNetAmount).toBeCloseTo(negativeValueShared, 2);
        });
      });

      describe('negativeValueShared <= (0 - statement.openingBalance)', () => {
        let extraHeldAt100Percent;
        let startingBalanceAfterPayments;

        beforeEach(() => {
          statement.profitShareRate = 0 - randomInt() / 100;
          const thisPeriod = statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld;
          startingBalanceAfterPayments = statement.openingBalance + statement.payments;
          const output = startingBalanceAfterPayments + thisPeriod;
          const negativeValueShared = (output - startingBalanceAfterPayments) * statement.profitShareRate / 100;
          extraHeldAt100Percent = (startingBalanceAfterPayments + negativeValueShared) / statement.profitShareRate * 100;
        });

        it('should set statement.profitShareBalance to the right value', async () => {
          await profitShare100NegativeAsync(statement, period);
          expect(statement.profitShareBalance).toBe(0 - startingBalanceAfterPayments + extraHeldAt100Percent);
        });

        it('should set statement.profitShareNetAmount to the right value', async () => {
          await profitShare100NegativeAsync(statement, period);
          expect(statement.profitShareNetAmount).toBe(0 - startingBalanceAfterPayments + extraHeldAt100Percent);
        });
      });
    });

    describe('output <= 0', () => {
      let thisPeriod;
      let output;

      beforeEach(() => {
        statement.netAmount = -randomInt();
        statement.netCosts = statement.netAmount * 2;
        statement.reservesReleased = -randomInt();
        statement.reservesWithheld = statement.reservesReleased * 2;
        statement.openingBalance = (statement.netAmount + statement.reservesReleased) * 1.25;
        statement.payments = 0;
        statement.profitShareRate = statement.openingBalance * 100 / (statement.netAmount + statement.reservesReleased) - 1;

        thisPeriod = statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld;
        const startingBalanceAfterPayments = statement.openingBalance + statement.payments;
        output = startingBalanceAfterPayments + thisPeriod;
      });

      it('should set statement.profitShareBalance to output', async () => {
        await profitShare100NegativeAsync(statement, period);
        expect(statement.profitShareBalance).toBe(output);
      });

      it('should set statement.profitShareNetAmount to output', async () => {
        await profitShare100NegativeAsync(statement, period);
        expect(statement.profitShareNetAmount).toBe(output);
      });
    });

    describe('statement.netAmount === 0 && statement.netCosts === 0', () => {
      beforeEach(() => {
        statement.netAmount = 0;
        statement.netCosts = 0;
        statement.reservesReleased = randomInt();
        statement.reservesWithheld = randomInt();
        statement.openingBalance = randomInt();
        statement.payments = randomInt();
      });

      it('should set statement.closingBalance to statement.openingBalance + statement.payments', async () => {
        await profitShare100NegativeAsync(statement, period);
        expect(statement.closingBalance).toBe(statement.openingBalance + statement.payments);
      });
    });

    describe('statement.netAmount !== 0 || statement.netCosts !== 0', () => {
      beforeEach(() => {
        statement.netAmount = randomInt();
        statement.netCosts = randomInt();
        statement.reservesReleased = randomInt();
        statement.reservesWithheld = randomInt();
        statement.openingBalance = randomInt();
        statement.payments = randomInt();
      });

      it('should set statement.closingBalance to statement.profitShareNetAmount - statement.profitShareAdvanceRecouped', async () => {
        await profitShare100NegativeAsync(statement, period);
        expect(statement.closingBalance).toBe(statement.profitShareNetAmount - statement.profitShareAdvanceRecouped);
      });
    });

    it('should call statement.save', async () => {
      await profitShare100NegativeAsync(statement, period);
      expect(statement.save).toHaveBeenCalled();
    });

    it('should propagate error from statement.save', async () => {
      const error = new Error('save failed');
      statement.save = jest.fn((cb) => Promise.reject(error));
      await expect(profitShare100NegativeAsync(statement, period)).rejects.toThrow('save failed');
    });
  });

  describe('profitShareSplitNegative', () => {
    let profitShareSplitNegativeAsync;
    beforeEach(() => {
      profitShareSplitNegativeAsync = promisify(ProfitShare.profitShareSplitNegative);
      contract.profitSharePercentage = randomInt();
      statement.netAmount = randomInt();
      statement.netCosts = statement.netAmount * 2;
      statement.reservesReleased = randomInt();
      statement.reservesWithheld = statement.reservesReleased * 2;
      statement.profitShareRate = randomInt();
      statement.openingBalance = randomInt();
      ProfitShare.profitShareFigures.mockImplementation((statement, period, contract, cb) => cb());
    });

    it('should call Contract.findById with the right args', async () => {
      await profitShareSplitNegativeAsync(statement, period);
      expect(Contract.findById).toHaveBeenCalledWith(statement.contractId);
    });

    it('should call ProfitShare.profitShareFigures with the right args', async () => {
      await profitShareSplitNegativeAsync(statement, period);
      expect(ProfitShare.profitShareFigures).toHaveBeenCalledWith(statement, period, contract, expect.any(Function));
    });

    describe('when contract.profitSharePercentage is defined', () => {
      it('should set statement.profitShareRate to statement.profitSharePercentage', async () => {
        contract.profitSharePercentage = randomInt();
        await profitShareSplitNegativeAsync(statement, period);
        expect(statement.profitShareRate).toBe(contract.profitSharePercentage);
      });
    });

    describe('when contract.profitSharePercentage is not defined', () => {
      it('should set statement.profitShareRate to 0', async () => {
        contract.profitSharePercentage = null;
        await profitShareSplitNegativeAsync(statement, period);
        expect(statement.profitShareRate).toBe(0);
      });
    });

    it('should set statement.profitShareAdvanceRecouped to 0', async () => {
      contract.profitSharePercentage = null;
      await profitShareSplitNegativeAsync(statement, period);
      expect(statement.profitShareAdvanceRecouped).toBe(0);
    });

    it('should set statement.profitShareBalance to the correct value', async () => {
      const thisPeriod = statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld;
      const splitPeriodBy = thisPeriod * (contract.profitSharePercentage / 100);
      const expectedProfitShareBalance = statement.openingBalance + statement.payments + splitPeriodBy;

      await profitShareSplitNegativeAsync(statement, period);
      expect(statement.profitShareBalance).toBe(expectedProfitShareBalance);
    });

    describe('when statement.profitShareUnrecoupedAdvanceStart !== 0', () => {
      beforeEach(() => {
        statement.profitShareUnrecoupedAdvanceStart = randomInt();
      });

      describe('statement.profitShareNetAmount + statement.otherTransactions < 0', () => {
        it('should set statement.profitShareAdvanceRecouped to 0', async () => {
          contract.profitSharePercentage = null;
          statement.otherTransactions = -randomInt();
          await profitShareSplitNegativeAsync(statement, period);
          expect(statement.profitShareAdvanceRecouped).toBe(0);
        });
      });

      describe('statement.profitShareBalance + statement.otherTransactions > 0 - statement.profitShareUnrecoupedAdvanceStart', () => {
        it('should set statement.profitShareAdvanceRecouped to 0 - statement.profitShareUnrecoupedAdvanceStart', async () => {
          contract.profitSharePercentage = null;
          statement.payments = 0;
          statement.otherTransactions = randomInt();
          statement.profitShareUnrecoupedAdvanceStart = -statement.otherTransactions - statement.openingBalance + 1;

          await profitShareSplitNegativeAsync(statement, period);
          expect(statement.profitShareAdvanceRecouped).toBe(0 - statement.profitShareUnrecoupedAdvanceStart);
        });
      });

      describe('else', () => {
        it('should set statement.profitShareAdvanceRecouped to statement.profitShareBalance + statement.otherTransactions', async () => {
          contract.profitSharePercentage = null;
          statement.payments = 0;
          statement.otherTransactions = randomInt();
          statement.profitShareUnrecoupedAdvanceStart = -statement.otherTransactions - statement.openingBalance - 1;

          await profitShareSplitNegativeAsync(statement, period);
          expect(statement.profitShareAdvanceRecouped).toBe(statement.profitShareBalance + statement.otherTransactions);
        });
      });
    });

    describe('when statement.netAmount === 0 && statement.netCosts === 0', () => {
      it('should set statement.closingBalance to openingBalance + payments', async () => {
        statement.netAmount = 0;
        statement.netCosts = 0;
        statement.payments = randomInt();

        await profitShareSplitNegativeAsync(statement, period);
        expect(statement.closingBalance).toBe(statement.openingBalance + statement.payments);
      });
    });

    describe('else', () => {
      it('should set closingBalance to profitShareBalance - profitShareAdvanceRecouped', async () => {
        statement.netAmount = randomInt();
        statement.netCosts = randomInt();
        statement.payments = randomInt();

        await profitShareSplitNegativeAsync(statement, period);
        expect(statement.closingBalance).toBe(statement.profitShareBalance - statement.profitShareAdvanceRecouped);
      });
    });

    it('should call statement.save', async () => {
      await profitShareSplitNegativeAsync(statement, period);
      expect(statement.save).toHaveBeenCalled();
    });

    describe('when statement.save returns an error', () => {
      it('should return the error to the callback', async () => {
        const expectedError = randomString();
        statement.save.mockImplementationOnce((cb) => Promise.reject(expectedError));

        await expect(profitShareSplitNegativeAsync(statement, period)).rejects.toBe(expectedError);
      });
    });
  });

  describe('profitShareFigures', () => {
    let startDate; let endDate;
    let profitShareFiguresAsync;
    let expected;

    beforeEach(() => {
      statement.clientId = randomId();
      statement.contractId = randomId();

      startDate = moment.utc(period.startDate).endOf('day').subtract(1, 'day').format();
      endDate = moment.utc(period.endDate).endOf('day').format();
      expected = transactions.reduce((sum, t) => sum + t.amount, 0);

      ProfitShare.profitShareFigures.mockRestore();
      jest.spyOn(ProfitShare, 'profitShareFigures');
      profitShareFiguresAsync = promisify(ProfitShare.profitShareFigures);

      jest.spyOn(Transaction, 'find').mockImplementation((query, callback) => {
        if (typeof callback === 'function') {
          callback(null, transactions);
        } else {
          return Promise.resolve(transactions);
        }
      });
    });

    it('should call balanceAtDate with the right args', async () => {
      await profitShareFiguresAsync(statement, period, contract);
      expect(balanceAtDate).toHaveBeenCalledWith(contract, period.startDate, {
        excludeAdvance: true,
        excludeReserves: true,
      }, expect.any(Function));
    });

    it('should assign openingBalance from contract balance', async () => {
      await profitShareFiguresAsync(statement, period, contract);
      expect(statement.openingBalance).toBe(mockContractBalance);
    });

    it('should query advance/recoupment transactions with correct filter', async () => {
      await profitShareFiguresAsync(statement, period, contract);
      expect(Transaction.find).toHaveBeenCalledWith({
        clientId: statement.clientId,
        contractId: statement.contractId,
        date: { $lte: endDate },
        type: { $in: ['Advance', 'Advance Recoupment'] },
      });
    });

    it('should set unrecouped advance start correctly', async () => {
      await profitShareFiguresAsync(statement, period, contract);
      expect(statement.profitShareUnrecoupedAdvanceStart).toBe(expected);
    });

    it('should query payment transactions with correct filter', async () => {
      await profitShareFiguresAsync(statement, period, contract);
      expect(Transaction.find).toHaveBeenNthCalledWith(2, {
        clientId: statement.clientId,
        contractId: statement.contractId,
        date: { $lte: endDate, $gte: startDate },
        type: 'Payment',
        isReserveRelease: { $ne: true },
        isReserveWithholding: { $ne: true },
      });
    });

    it('should set payments correctly', async () => {
      await profitShareFiguresAsync(statement, period, contract);
      expect(statement.payments).toBe(expected);
    });

    it('should query other transaction types correctly', async () => {
      await profitShareFiguresAsync(statement, period, contract);
      expect(Transaction.find).toHaveBeenNthCalledWith(3, {
        clientId: statement.clientId,
        contractId: statement.contractId,
        date: { $lte: endDate, $gte: startDate },
        type: {
          $in: ['Contract Payment', 'Other', 'Transfer To', 'Transfer From', 'Royalties', 'Negative Balance Transfer Adjustment'],
        },
        isReserveRelease: { $ne: true },
        isReserveWithholding: { $ne: true },
      });
    });

    it('should set otherTransactions correctly', async () => {
      await profitShareFiguresAsync(statement, period, contract);
      expect(statement.otherTransactions).toBe(expected);
    });
  });

  describe('createTransactions', () => {
    let createTransactionsAsync;
    beforeEach(() => {
      createTransactionsAsync = promisify(ProfitShare.createTransactions);
      jest.spyOn(ProfitShare, 'profitShare100Negative').mockImplementation((statement, period, cb) => cb());
      jest.spyOn(ProfitShare, 'profitShareSplitNegative').mockImplementation((statement, period, cb) => cb());
    });
    describe('when statement.contractType is Profit Share', () => {
      beforeEach(() => {
        statement.contractType = 'Profit Share';
      });

      it('should call Transaction.deleteMany with the right args', async () => {
        await createTransactionsAsync(statement, period);

        expect(Transaction.deleteMany).toHaveBeenCalledWith(
          {
            clientId: period.clientId,
            name: { $not: { $regex: /Tax/ } },
            statementId: statement._id.toString(),
            type: { $nin: ['Contract Payment', 'Transfer To', 'Transfer From', 'Reserves Released'] },
          },
        );
      });

      it('should call ProfitShare.profitShare100Negative with the right args', async () => {
        await createTransactionsAsync(statement, period);
        expect(ProfitShare.profitShare100Negative).toHaveBeenCalledWith(statement, period, expect.any(Function));
      });
    });

    describe('when statement.contractType is Profit Share - Flexible', () => {
      beforeEach(() => {
        statement.contractType = 'Profit Share - Flexible';
      });

      it('should call Transaction.deleteMany with the right args', async () => {
        await createTransactionsAsync(statement, period);
        expect(Transaction.deleteMany).toHaveBeenCalledWith(
          {
            clientId: period.clientId,
            name: { $not: { $regex: /Tax/ } },
            statementId: statement._id.toString(),
            type: { $nin: ['Contract Payment', 'Transfer To', 'Transfer From', 'Reserves Released'] },
          },
        );
      });

      it('should call ProfitShare.profitShareSplitNegative with the right args', async () => {
        await createTransactionsAsync(statement, period);
        expect(ProfitShare.profitShareSplitNegative).toHaveBeenCalledWith(statement, period, expect.any(Function));
      });
    });

    describe('when statement.contractType is not Profit Share or Profit Share - Flexible', () => {
      it('should not call Transaction.deleteMany', async () => {
        statement.contractType = randomString();
        await createTransactionsAsync(statement, period);
        expect(Transaction.deleteMany).not.toHaveBeenCalled();
      });
    });

    describe('when statement.profitShareAdvanceRecouped', () => {
      it('should create a new transaction with the right args', async () => {
        statement.contractType = 'Profit Share';
        statement.profitShareAdvanceRecouped = randomInt();

        await createTransactionsAsync(statement, period);

        expect(Transaction.prototype.save).toHaveBeenCalled();
        const transaction = Transaction.prototype.save.mock.instances[0];
        expect(transaction.statementId).toBe(statement._id.toString());
        expect(transaction.clientId).toBe(statement.clientId);
        expect(transaction.contractId).toBe(statement.contractId);
        expect(transaction.name).toBe('Advance Recoupment');
        expect(transaction.type).toBe('Advance Recoupment');
        expect(transaction.date).toBe(statement.date);
        expect(transaction.userCreated).toBe(false);
        expect(transaction.amount).toBe(statement.profitShareAdvanceRecouped);
      });
    });

    describe('when statement.contractType === Profit Share && statement.openingBalance < 0 && statement.closingBalance > 0', () => {
      it('should create a new transaction with the right args', async () => {
        statement.contractType = 'Profit Share';
        statement.openingBalance = -randomInt();
        statement.closingBalance = randomInt();

        await createTransactionsAsync(statement, period);

        expect(Transaction.prototype.save).toHaveBeenCalled();
        const transaction = Transaction.prototype.save.mock.instances[0];
        expect(transaction.statementId).toBe(statement._id.toString());
        expect(transaction.clientId).toBe(statement.clientId);
        expect(transaction.contractId).toBe(statement.contractId);
        expect(transaction.name).toBe('Negative Balance Recoupment');
        expect(transaction.type).toBe('Negative Balance Recoupment');
        expect(transaction.date).toBe(statement.date);
        expect(transaction.userCreated).toBe(false);
        expect(transaction.amount).toBe(0 - statement.openingBalance);
      });
    });

    describe('when statement.contractType === Profit Share && statement.openingBalance < 0', () => {
      it('should deduct the statement.openingBalance from the value', async () => {
        statement.contractType = 'Profit Share';
        statement.openingBalance = -randomInt();
        statement.profitShareNetAmount = randomInt();
        statement.profitShareAdvanceRecouped = statement.profitShareNetAmount + 1;
        const value = statement.profitShareNetAmount - statement.profitShareAdvanceRecouped - statement.openingBalance;

        await createTransactionsAsync(statement, period);

        expect(Transaction.prototype.save).toHaveBeenCalled();
        const transaction = Transaction.prototype.save.mock.instances[1];
        expect(transaction.statementId).toBe(statement._id.toString());
        expect(transaction.clientId).toBe(statement.clientId);
        expect(transaction.contractId).toBe(statement.contractId);
        expect(transaction.name).toBe(period.name);
        expect(transaction.date).toBe(statement.date);
        expect(transaction.userCreated).toBe(false);
        expect(transaction.amount).toBe(value);
      });
    });
  });

  describe('manageNegativeBalanceFromTransfers', () => {
    let manageNegativeBalanceFromTransfersAsync;

    beforeEach(() => {
      manageNegativeBalanceFromTransfersAsync = promisify(ProfitShare.manageNegativeBalanceFromTransfers);
      jest.spyOn(ProfitShare, 'profitShare100Negative').mockImplementation((statement, period, cb) => cb());
      jest.spyOn(ProfitShare, 'profitShareSplitNegative').mockImplementation((statement, period, cb) => cb());
    });

    it('should call Contract.findById with the right args', async () => {
      await manageNegativeBalanceFromTransfersAsync(statement, period);
      expect(Contract.findById).toHaveBeenCalledWith(statement.contractId);
    });

    describe('when no contract is returned', () => {
      it('should return an error to the callback', async () => {
        Contract.findById.mockImplementationOnce((id, callback) => Promise.resolve(null));

        await expect(manageNegativeBalanceFromTransfersAsync(statement, period)).rejects.toThrow('Contract does not exist associated with this statement');
      });
    });

    it('should call balanceAtDate with the right args', async () => {
      const date = new Date(statement.date);
      date.setDate(date.getDate() + 1);

      await manageNegativeBalanceFromTransfersAsync(statement, period);

      expect(balanceAtDate).toHaveBeenCalledWith(contract, date, { excludeAdvance: true, excludeReserves: true }, expect.any(Function));
    });

    describe('when (balance >= 0 && balance - statement.otherTransactions > 0)', () => {
      it('should callback', async () => {
        const contractBalance = randomInt();
        balanceAtDate.mockImplementationOnce((contract, date, opts, callback) => callback(null, contractBalance));
        statement.otherTransactions = contractBalance - 1;

        await manageNegativeBalanceFromTransfersAsync(statement, period);

        expect(Transaction.prototype.save).not.toHaveBeenCalled();
      });
    });

    describe('when statement.otherTransactions === 0', () => {
      it('should callback', async () => {
        statement.otherTransactions = 0;

        await manageNegativeBalanceFromTransfersAsync(statement, period);

        expect(Transaction.prototype.save).not.toHaveBeenCalled();
      });
    });

    describe('when (balance === 0 && statement.otherTransactions >= 0)', () => {
      it('should callback', async () => {
        const contractBalance = 0;
        balanceAtDate.mockImplementationOnce((contract, date, opts, callback) => callback(null, contractBalance));
        statement.otherTransactions = randomInt();

        await manageNegativeBalanceFromTransfersAsync(statement, period);

        expect(Transaction.prototype.save).not.toHaveBeenCalled();
      });
    });

    describe('else', () => {
      describe('otherTransactions > balance', () => {
        it('should set valueToTransfer to otherTransactions', async () => {
          statement.otherTransactions = -randomInt();
          const contractBalance = statement.otherTransactions - 1;
          balanceAtDate.mockImplementationOnce((contract, date, opts, callback) => callback(null, contractBalance));
          contract.type = 'Profit Share';

          await manageNegativeBalanceFromTransfersAsync(statement, period);

          const transaction = Transaction.prototype.save.mock.instances[0];
          expect(transaction.amount).toBe(0 - statement.otherTransactions);
        });
      });

      describe('else', () => {
        it('should set valueToTransfer to balance', async () => {
          const contractBalance = -randomInt();
          statement.otherTransactions = contractBalance - 1;
          balanceAtDate.mockImplementationOnce((contract, date, opts, callback) => callback(null, contractBalance));
          contract.type = 'Profit Share';

          await manageNegativeBalanceFromTransfersAsync(statement, period);

          const transaction = Transaction.prototype.save.mock.instances[0];
          expect(transaction.amount).toBe(0 - contractBalance);
        });
      });
    });

    describe('contract.type === Profit Share && balance >= 0', () => {
      it('should set valueToTransfer to right value', async () => {
        statement.profitSharePercentage = randomInt();
        const contractBalance = randomInt();
        balanceAtDate.mockImplementationOnce((contract, date, opts, callback) => callback(null, contractBalance));
        statement.otherTransactions = contractBalance + randomInt();
        contract.type = 'Profit Share';
        const expectedValueToTransfer = (0 - (contractBalance - statement.otherTransactions)) * (1 - (contract.profitSharePercentage / 100));

        await manageNegativeBalanceFromTransfersAsync(statement, period);

        const transaction = Transaction.prototype.save.mock.instances[0];
        expect(transaction.amount).toBe(expectedValueToTransfer);
      });
    });

    describe('contract.type === Profit Share && valueToTransfer < 0', () => {
      it('should create a balancing transaction with the right args', async () => {
        statement.otherTransactions = -randomInt();
        const contractBalance = statement.otherTransactions - 1;
        balanceAtDate.mockImplementationOnce((contract, date, opts, callback) => callback(null, contractBalance));
        contract.type = 'Profit Share';

        await manageNegativeBalanceFromTransfersAsync(statement, period);

        const transaction = Transaction.prototype.save.mock.instances[0];
        expect(transaction.statementId).toBe(statement._id.toString());
        expect(transaction.clientId).toBe(statement.clientId);
        expect(transaction.contractId).toBe(statement.contractId);
        expect(transaction.name).toBe('Negative Balance Adjustment');
        expect(transaction.type).toBe('Negative Balance Adjustment');
        expect(transaction.date).toBe(statement.date);
        expect(transaction.userCreated).toBe(false);
        expect(transaction.amount).toBe(0 - statement.otherTransactions);
      });

      it('should create an advance transaction with the right args', async () => {
        statement.otherTransactions = -randomInt();
        const contractBalance = statement.otherTransactions - 1;
        balanceAtDate.mockImplementationOnce((contract, date, opts, callback) => callback(null, contractBalance));
        contract.type = 'Profit Share';

        await manageNegativeBalanceFromTransfersAsync(statement, period);

        const transaction = Transaction.prototype.save.mock.instances[1];
        expect(transaction.statementId).toBe(statement._id.toString());
        expect(transaction.clientId).toBe(statement.clientId);
        expect(transaction.contractId).toBe(statement.contractId);
        expect(transaction.name).toBe('Transaction to Advance');
        expect(transaction.type).toBe('Advance');
        expect(transaction.date).toBe(statement.date);
        expect(transaction.userCreated).toBe(false);
        expect(transaction.amount).toBe(statement.otherTransactions);
      });
    });

    describe('contract.type === Profit Share && valueToTransfer > 0 && contract.profitSharePercentage', () => {
      describe('balanceAfterTransfer > 0', () => {
        it('should set profitSplitDeduction to the right value', async () => {
          statement.otherTransactions = randomInt();
          const contractBalance = -statement.otherTransactions / 2;
          balanceAtDate.mockImplementationOnce((contract, date, opts, callback) => callback(null, contractBalance));
          contract.type = 'Profit Share';
          contract.profitSharePercentage = 100;

          const percentageValue = statement.otherTransactions / contract.profitSharePercentage;
          const inversePercentage = 100 - contract.profitSharePercentage;
          const valueToTransfer = percentageValue * inversePercentage;
          const balanceAfterTransfer = contractBalance + valueToTransfer;
          const profitSplit = balanceAfterTransfer * contract.profitSharePercentage / 100;
          const profitSplitDeduction = balanceAfterTransfer - profitSplit;

          await manageNegativeBalanceFromTransfersAsync(statement, period);

          const transaction = Transaction.prototype.save.mock.instances[0];
          expect(transaction.amount).toBe(valueToTransfer - profitSplitDeduction);
        });
      });

      it('should create a transaction with the right args', async () => {
        statement.otherTransactions = randomInt();
        const contractBalance = -statement.otherTransactions / 2;
        balanceAtDate.mockImplementationOnce((contract, date, opts, callback) => callback(null, contractBalance));
        contract.type = 'Profit Share';
        contract.profitSharePercentage = 1;

        const percentageValue = statement.otherTransactions / contract.profitSharePercentage;
        const inversePercentage = 100 - contract.profitSharePercentage;
        const valueToTransfer = percentageValue * inversePercentage;
        const balanceAfterTransfer = contractBalance + valueToTransfer;
        const profitSplit = balanceAfterTransfer * contract.profitSharePercentage / 100;
        const profitSplitDeduction = balanceAfterTransfer - profitSplit;

        await manageNegativeBalanceFromTransfersAsync(statement, period);

        const transaction = Transaction.prototype.save.mock.instances[0];
        expect(transaction.statementId).toBe(statement._id.toString());
        expect(transaction.clientId).toBe(statement.clientId);
        expect(transaction.contractId).toBe(statement.contractId);
        expect(transaction.name).toBe('Negative Balance Transfer Adjustment (Once in profit, split at profit share rate)');
        expect(transaction.type).toBe('Negative Balance Transfer Adjustment');
        expect(transaction.date).toBe(statement.date);
        expect(transaction.userCreated).toBe(false);
        expect(transaction.amount).toBe(valueToTransfer - profitSplitDeduction);
      });

      describe('profitSplitDeduction !== 0', () => {
        it('should set the transaction name with the right value', async () => {
          statement.otherTransactions = randomInt();
          const contractBalance = -statement.otherTransactions / 2;
          balanceAtDate.mockImplementationOnce((contract, date, opts, callback) => callback(null, contractBalance));
          contract.type = 'Profit Share';
          contract.profitSharePercentage = 100;

          const percentageValue = statement.otherTransactions / contract.profitSharePercentage;
          const inversePercentage = 100 - contract.profitSharePercentage;
          const valueToTransfer = percentageValue * inversePercentage;
          const balanceAfterTransfer = contractBalance + valueToTransfer;
          const profitSplit = balanceAfterTransfer * contract.profitSharePercentage / 100;
          const profitSplitDeduction = balanceAfterTransfer - profitSplit;

          await manageNegativeBalanceFromTransfersAsync(statement, period);

          const transaction = Transaction.prototype.save.mock.instances[0];
          expect(transaction.statementId).toBe(statement._id.toString());
          expect(transaction.clientId).toBe(statement.clientId);
          expect(transaction.contractId).toBe(statement.contractId);
          expect(transaction.name).toBe('Negative Balance Transfer Adjustment');
          expect(transaction.type).toBe('Negative Balance Transfer Adjustment');
          expect(transaction.date).toBe(statement.date);
          expect(transaction.userCreated).toBe(false);
          expect(transaction.amount).toBe(valueToTransfer - profitSplitDeduction);
        });
      });
    });

    describe('statement.contractType === Profit Share', () => {
      it('should call ProfitShare.profitShare100Negative with the right args', async () => {
        statement.otherTransactions = randomInt();
        const contractBalance = -statement.otherTransactions / 2;
        balanceAtDate.mockImplementationOnce((contract, date, opts, callback) => callback(null, contractBalance));
        contract.type = 'Profit Share';
        contract.profitSharePercentage = 100;
        statement.contractType = 'Profit Share';

        await manageNegativeBalanceFromTransfersAsync(statement, period);

        expect(ProfitShare.profitShare100Negative).toHaveBeenCalledWith(statement, period, expect.any(Function));
      });
    });

    describe('statement.contractType === Profit Share - Flexible', () => {
      it('should call ProfitShare.profitShareSplitNegative with the right args', async () => {
        statement.otherTransactions = randomInt();
        const contractBalance = -statement.otherTransactions / 2;
        balanceAtDate.mockImplementationOnce((contract, date, opts, callback) => callback(null, contractBalance));
        contract.type = 'Profit Share - Flexible';
        contract.profitSharePercentage = 100;
        statement.contractType = 'Profit Share - Flexible';

        await manageNegativeBalanceFromTransfersAsync(statement, period);

        expect(ProfitShare.profitShareSplitNegative).toHaveBeenCalledWith(statement, period, expect.any(Function));
      });
    });
  });

  describe('#checkProfitSharePayments', () => {
    beforeEach(() => {
      jest.spyOn(Transaction, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue(transactions),
      });
    });

    it('should call statement.findById', async () => {
      await ProfitShare.checkProfitSharePayments({ statement, period });
      expect(Statement.findById).toHaveBeenCalled();
    });

    it('should return an error if statement is not found', async () => {
      Statement.findById.mockResolvedValueOnce(null);

      await expect(ProfitShare.checkProfitSharePayments({ statement, period })).rejects.toThrow(`Statement ${statement?._id} not found`);
    });

    describe('When Statement.contractType is NOT Profit Share', () => {
      it('Should not call Transaction.find', async () => {
        statement.contractType = randomString();

        await ProfitShare.checkProfitSharePayments({ statement, period });

        expect(Transaction.find).not.toHaveBeenCalled();
      });

      it('Should return undefined', async () => {
        statement.contractType = randomString();

        const result = await ProfitShare.checkProfitSharePayments({ statement, period });

        expect(result).toBeUndefined();
      });
    });

    describe('When Statement.contractType is Profit Share', () => {
      it('Should call Transaction.find with the right args', async () => {
        statement.contractType = 'Profit Share';
        const startDate = moment.utc(period.startDate).format();

        const date = new Date(period.endDate);
        date.setDate(date.getDate() + 1);
        const endDate = moment.utc(date).endOf('day').subtract(1, 'day').format();

        await ProfitShare.checkProfitSharePayments({ statement, period });

        expect(Transaction.find).toHaveBeenCalledWith({
          clientId: statement.clientId,
          contractId: statement.contractId,
          date: { $gte: startDate, $lte: endDate },
          type: 'Payment',
          isReserveRelease: { $ne: true },
          isReserveWithholding: { $ne: true },
        });
      });

      it('Should total any transactions found', async () => {
        statement.contractType = 'Profit Share';
        Transaction.find.mockReturnValue({
          select: jest.fn().mockResolvedValue(transactions),
        });
        const total = transactions.reduce((acc, transaction) => acc + transaction.amount, 0);

        await ProfitShare.checkProfitSharePayments({ statement, period });

        expect(statement.save).toHaveBeenCalled();
        expect(statement.payments).toBe(total);
      });

      describe('If transactions are found but do NOT include an amount', () => {
        it('Should default these amounts to 0', async () => {
          statement.contractType = 'Profit Share';
          Transaction.find.mockReturnValue({
            select: jest.fn().mockResolvedValue([{}]),
          });

          await ProfitShare.checkProfitSharePayments({ statement, period });

          expect(statement.save).toHaveBeenCalled();
          expect(statement.payments).toBe(0);
        });
      });

      describe('If no transactions are found', () => {
        it('Should not call statement.save', async () => {
          statement.contractType = 'Profit Share';
          Transaction.find.mockReturnValue({
            select: jest.fn().mockResolvedValue([]),
          });

          await ProfitShare.checkProfitSharePayments({ statement, period });

          expect(statement.save).not.toHaveBeenCalled();
        });
      });
    });
  });
});
