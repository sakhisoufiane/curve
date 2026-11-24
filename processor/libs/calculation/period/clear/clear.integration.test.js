const { randomId, cleanUp, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');

const Client = require('../../../../models/client');
const Contract = require('../../../../models/contract');
const Payee = require('../../../../models/payee');
const Payment = require('../../../../models/payment');
const PaymentGroup = require('../../../../models/paymentGroup');
const Period = require('../../../../models/period');
const Transaction = require('../../../../models/transaction');
const Statement = require('../../../../models/statement');
const Escalation = require('../../../../models/escalation');
const BatchTask = require('../../../../models/batchTask');
const Clear = require('./clear');
const clearPeriodData = require('../../../clearPeriod');

jest.mock('../../../clearPeriod', () => jest.fn((data, callback) => {
  if (callback) {
    callback(null);
  }
  return Promise.resolve();
}));

describe('Clear Integration Tests', () => {
  let client; let payee; let
    contract; const db = {};

  beforeEach(async () => {
    client = new Client({
      name: randomString(),
      email: 'test@curve.com',
      primaryEmail: 'test@curve.com',
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    });
    await client.save();

    payee = new Payee({ name: 'Payee', clientId: client._id });
    await payee.save();

    contract = new Contract({ clientId: client._id, name: 'Contract', payeeId: payee._id });
    await contract.save();

    jest.spyOn(PaymentGroup, 'findOne');
    jest.spyOn(PaymentGroup.prototype, 'deleteOne');
    jest.spyOn(Payment, 'find');
    jest.spyOn(Statement, 'find');
    jest.spyOn(Payment.prototype, 'deleteOne');
    jest.spyOn(fileManager, 'deleteFromS3').mockImplementation((filePath, callback) => {
      if (callback) {
        callback(null);
      }
    });
  });

  describe('Clear Period', () => {
    let period; let paymentGroup;
    beforeEach(async () => {
      period = new Period({
        clientId: client._id.toString(),
        name: 'Test Period',
        startDate: new Date(),
        endDate: new Date(),
        recalculation: { type: 'Full' },
      });
      await period.save();

      paymentGroup = new PaymentGroup({
        name: 'Payment Group Full',
        clientId: client._id,
        periodId: period._id.toString(),
      });

      await paymentGroup.save();

      await Promise.all([
        new Payment({
          clientId: client._id,
          paymentGroupId: paymentGroup._id.toString(),
          name: 'Payment Full',
          contractId: contract._id.toString(),
          amount: 1234,
          currency: 'GBP',
          payeeId: payee._id,
          periodId: period._id.toString(),
        }).save(),

        new Payment({
          clientId: client._id,
          paymentGroupId: paymentGroup._id.toString(),
          name: 'Payment Full',
          contractId: contract._id.toString(),
          amount: 1234,
          currency: 'GBP',
          payeeId: payee._id,
          periodId: period._id.toString(),
        }).save(),
      ]);
    });

    afterEach((done) => {
      cleanUp(client._id.toString(), done);
    });

    it('should delete all payments if recalculation is not partial', async () => {
      const transactionsBefore = await Transaction.find({ clientId: client._id });
      expect(transactionsBefore.length).toBe(2);
      await Clear.clearPeriod(period, db, global.bigQuery);

      const transactionsAfter = await Transaction.find({ clientId: client._id });
      expect(transactionsAfter.length).toBe(0);
      expect(PaymentGroup.findOne).toHaveBeenCalledWith({ clientId: period.clientId, periodId: period._id.toString() });
      expect(Payment.find).toHaveBeenCalledWith({ clientId: period.clientId, paymentGroupId: paymentGroup._id.toString() });
      expect(Payment.prototype.deleteOne).toHaveBeenCalledTimes(2);
      expect(PaymentGroup.prototype.deleteOne).toHaveBeenCalled();
    });

    it('should only delete payments for affected contracts when recalculation is Partial', async () => {
      period.recalculation = { type: 'Partial', contractIds: [contract._id.toString()] };
      await period.save();

      await Clear.clearPeriod(period, db, global.bigQuery);

      expect(Payment.find).toHaveBeenCalledWith(expect.objectContaining({ contractId: { $in: period.recalculation.contractIds } }));
      expect(Payment.prototype.deleteOne).toHaveBeenCalledTimes(2);
    });

    it('should delete all statements when recalculation is Full', async () => {
      await new Statement({ clientId: client._id, periodId: period._id }).save();

      await Clear.clearPeriod(period, db, global.bigQuery);

      const statementsAfter = await Statement.find({ clientId: client._id });
      expect(statementsAfter.length).toBe(0);
    });

    it('should only delete statements for affected contracts when recalculation is Partial', async () => {
      period.recalculation = { type: 'Partial', contractIds: [contract._id.toString()] };
      await period.save();

      await Clear.clearPeriod(period, db, global.bigQuery);

      expect(Statement.find).toHaveBeenCalledWith(
        expect.objectContaining({ contractId: { $in: period.recalculation.contractIds } }),
      );
    });

    it('should reset period values after clearing', async () => {
      await Clear.clearPeriod(period, db, global.bigQuery);

      const updatedPeriod = await Period.findById(period._id);
      expect(updatedPeriod.grossAmount).toBeNull();
      expect(updatedPeriod.netAmount).toBeNull();
      expect(updatedPeriod.valid).toBeFalsy();
    });

    it('should handle periods with no payments gracefully', async () => {
      await Payment.deleteMany({ clientId: client._id });

      await expect(Clear.clearPeriod(period, db, global.bigQuery)).resolves.toBeUndefined();

      expect(Payment.find).toHaveBeenCalled();
      expect(Payment.prototype.deleteOne).not.toHaveBeenCalled();
    });

    it('should delete all associated files from S3', async () => {
      period.allCalculatedSalesCsv = 'file1.csv';
      period.allCalculatedCostsCsv = 'file2.csv';
      period.unreportedSalesCsv = 'file3.csv';
      period.unreportedCostsCsv = 'file4.csv';
      period.suspenseCsv = 'file5.csv';
      period.generalLedgerSummary = 'file6.csv';
      period.customStatement = 'file7.csv';
      period.statementsZip = 'file8.zip';
      await period.save();

      await Clear.clearPeriod(period, db, global.bigQuery);

      const expectedFiles = [
        'file1.csv',
        'file2.csv',
        'file3.csv',
        'file4.csv',
        'file5.csv',
        'file6.csv',
        'file7.csv',
        'file8.zip',
      ];

      expectedFiles.forEach((file) => {
        expect(fileManager.deleteFromS3).toHaveBeenCalledWith(file, expect.any(Function));
      });

      expect(fileManager.deleteFromS3).toHaveBeenCalledTimes(expectedFiles.length);
    });

    it('should remove incomplete batch tasks', async () => {
      await BatchTask.insertMany([
        { periodId: period._id, status: 'Pending', clientId: client._id },
        { periodId: period._id, status: 'Complete', clientId: client._id },
      ]);

      await Clear.clearPeriod(period, db, global.bigQuery);

      const batchTasksAfter = await BatchTask.find({ clientId: client._id });
      expect(batchTasksAfter.length).toBe(1);
      expect(batchTasksAfter[0].status).toBe('Complete');
    });

    it('should reset escalation tracking figures only for specified contracts when recalculation has contractIds', async () => {
      period.recalculation = { type: 'Partial', contractIds: [contract._id.toString()] };
      await period.save();

      await new Escalation({
        clientId: client._id,
        periodId: period._id,
        contractId: contract._id,
        trackers: { someTracker: 123 },
      }).save();

      // Create another escalation that should NOT be reset
      await new Escalation({
        clientId: client._id,
        periodId: period._id,
        contractId: randomId(),
        trackers: { anotherTracker: 456 },
      }).save();

      const escalationsBefore = await Escalation.find({ clientId: client._id });
      expect(escalationsBefore.length).toBe(2);
      expect(escalationsBefore[0].trackers).toEqual({ someTracker: 123 });
      expect(escalationsBefore[1].trackers).toEqual({ anotherTracker: 456 });

      await Clear.clearPeriod(period, db, global.bigQuery);

      const escalationsAfter = await Escalation.find({ clientId: client._id });
      expect(escalationsAfter.length).toBe(2);
      expect(escalationsAfter[0].trackers).toEqual({}); // This one should be cleared
      expect(escalationsAfter[1].trackers).toEqual({ anotherTracker: 456 }); // This one should remain unchanged
    });

    it('should reset escalation tracking figures for all contracts the period will recalculate, leaving the rest when recalculation has no contractIds', async () => {
      period.recalculation = { type: 'Full' };
      await period.save();

      await new Escalation({
        clientId: client._id,
        periodId: period._id,
        contractId: contract._id,
        trackers: { someTracker: 123 },
      }).save();

      await new Escalation({
        clientId: client._id,
        periodId: period._id,
        contractId: randomId(),
        trackers: { anotherTracker: 456 },
      }).save();
      await new Escalation({
        clientId: client._id,
        periodId: period._id,
        contractId: randomId(),
        trackers: { anotherTracker: 789 },
      }).save();

      const escalationsBefore = await Escalation.find({ clientId: client._id });

      expect(escalationsBefore.length).toBe(3);
      expect(escalationsBefore[0].trackers).toEqual({ someTracker: 123 });
      expect(escalationsBefore[1].trackers).toEqual({ anotherTracker: 456 });
      expect(escalationsBefore[2].trackers).toEqual({ anotherTracker: 789 });

      await Clear.clearPeriod(period, db, global.bigQuery);

      const escalationsAfter = await Escalation.find({ clientId: client._id });
      expect(escalationsAfter.length).toBe(3);
      expect(escalationsAfter[0].trackers).toEqual({});
      expect(escalationsAfter[1].trackers).toEqual({ anotherTracker: 456 });
      expect(escalationsBefore[2].trackers).toEqual({ anotherTracker: 789 });
    });

    it('should only remove incomplete batch tasks and retain completed ones', async () => {
      await BatchTask.insertMany([
        { periodId: period._id, status: 'Pending', clientId: client._id },
        { periodId: period._id, status: 'Processing', clientId: client._id },
        { periodId: period._id, status: 'Complete', clientId: client._id },
      ]);

      await Clear.clearPeriod(period, db, global.bigQuery);

      const batchTasksAfter = await BatchTask.find({ clientId: client._id });
      expect(batchTasksAfter.length).toBe(1);
      expect(batchTasksAfter[0].status).toBe('Complete');
    });

    it('should reset escalation tracking only for specified contracts when recalculation is Partial', async () => {
      const unaffectedContractId = randomId();

      await new Escalation({ clientId: client._id, periodId: period._id, contractId: contract._id, trackers: { someTracker: 123 } }).save();
      await new Escalation({ clientId: client._id, periodId: period._id, contractId: unaffectedContractId, trackers: { anotherTracker: 456 } }).save();

      period.recalculation = { type: 'Partial', contractIds: [contract._id.toString()] };
      await period.save();

      await Clear.clearPeriod(period, db, global.bigQuery);

      const escalationsAfter = await Escalation.find({ clientId: client._id });
      expect(escalationsAfter.length).toBe(2);
      expect(escalationsAfter.find((e) => e.contractId.toString() === contract._id.toString()).trackers).toEqual({});
      expect(escalationsAfter.find((e) => e.contractId.toString() === unaffectedContractId.toString()).trackers).toEqual({ anotherTracker: 456 });
    });

    it('should call clearPeriodData with the correct parameters', async () => {
      period.recalculation = { type: 'Full' };
      await period.save();

      await Clear.clearPeriod(period, db, global.bigQuery);

      expect(clearPeriodData).toHaveBeenCalledWith(
        expect.objectContaining({
          db,
          bigQuery: global.bigQuery,
          recalculation: period.recalculation,
          clientId: period.clientId,
          periodId: period._id.toString(),
        }),
        expect.any(Function),
      );
    });
    it('should delete all payments if recalculation includes salesFiles', async () => {
      period.recalculation = { type: 'Partial', salesFiles: true };
      await period.save();

      jest.spyOn(Payment.prototype, 'deleteOne');

      await Clear.clearPeriod(period, db, global.bigQuery);

      expect(Payment.find).toHaveBeenCalledWith({ clientId: period.clientId, paymentGroupId: paymentGroup._id.toString() });
      expect(Payment.prototype.deleteOne).toHaveBeenCalledTimes(2);
    });

    it('should delete all payments when contractIds is an empty array', async () => {
      period.recalculation = { type: 'Partial', contractIds: [] };
      await period.save();

      jest.spyOn(Payment.prototype, 'deleteOne');

      await Clear.clearPeriod(period, db, global.bigQuery);

      expect(Payment.find).toHaveBeenCalledWith({ clientId: period.clientId, paymentGroupId: paymentGroup._id.toString() });
      expect(Payment.prototype.deleteOne).toHaveBeenCalledTimes(2);
    });

    it('should reset all period values correctly', async () => {
      period.grossAmount = 1000;
      period.netAmount = 800;
      period.valid = true;
      period.statementsZipPublicLink = 'some_link';
      period.calculationStatus = 'Completed';
      period.calculationError = 'Some error';
      period.calculationNotes = [
        {
          documentType: 'Contract',
          runNo: 123,
          message: 'Calculation completed successfully.',
          type: 'Info',
        },
      ];

      await period.save();
      await Clear.clearPeriod(period, db, global.bigQuery);

      const updatedPeriod = await Period.findById(period._id);

      expect(updatedPeriod.grossAmount).toBeNull();
      expect(updatedPeriod.netAmount).toBeNull();
      expect(updatedPeriod.valid).toBeFalsy();
      expect(updatedPeriod.statementsZipPublicLink).toBeNull();
      expect(updatedPeriod.calculationStatus).toBeNull();
      expect(updatedPeriod.calculationError).toBeNull();
      expect(updatedPeriod.calculationNotes).toEqual([]);
    });
  });
});
