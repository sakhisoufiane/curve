const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const BatchTask = require('../../../../models/batchTask');
const PaymentGroup = require('../../../../models/paymentGroup');
const Payment = require('../../../../models/payment');
const Statement = require('../../../../models/statement');
const Period = require('../../../../models/period');
const Contract = require('../../../../models/contract');
const Escalation = require('../../../../models/escalation');

const Clear = require('./clear');

jest.mock('../../../clearPeriod', () => jest.fn((data, cb) => cb && cb()));

describe('Clear Unit Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('#clearPeriod', () => {
    let inputPeriod; let inputDb; let inputBigQuery; let
      client;

    beforeEach(() => {
      inputPeriod = {
        _id: randomId(),
        name: randomString(),
        recalculation: { type: randomString() },
        clientId: randomId(),
        salesFilesIds: [randomId(), randomId()],
        costIds: [randomId(), randomId()],
      };

      inputDb = { type: randomString() };
      inputBigQuery = { type: randomString() };
      client = { name: randomString() };

      jest.spyOn(Clear, 'deletePayments').mockImplementation((cb) => cb());
      jest.spyOn(Clear, 'deleteStatements').mockResolvedValue();
      jest.spyOn(Clear, 'deleteFiles').mockImplementation((cb) => cb());
      jest.spyOn(Clear, 'setPeriodValues').mockResolvedValue();
      jest.spyOn(Clear, 'clearPeriodValues').mockResolvedValue();
      jest.spyOn(Clear, 'resetEscalationTrackingFigures').mockResolvedValue();
    });

    it('should call all internal methods in order', async () => {
      await Clear.clearPeriod(inputPeriod, inputDb, inputBigQuery, client);
      expect(Clear.deletePayments).toHaveBeenCalled();
      expect(Clear.deleteStatements).toHaveBeenCalled();
      expect(Clear.deleteFiles).toHaveBeenCalled();
      expect(Clear.setPeriodValues).toHaveBeenCalled();
      expect(Clear.clearPeriodValues).toHaveBeenCalled();
      expect(Clear.resetEscalationTrackingFigures).toHaveBeenCalled();
    });

    it('should throw if deletePayments fails', async () => {
      Clear.deletePayments.mockImplementation((cb) => cb('fail'));
      await expect(Clear.clearPeriod(inputPeriod, inputDb, inputBigQuery, client)).rejects.toBe('fail');
    });

    it('should throw if deleteStatements fails', async () => {
      Clear.deleteStatements.mockRejectedValue('fail');
      await expect(Clear.clearPeriod(inputPeriod, inputDb, inputBigQuery, client)).rejects.toBe('fail');
    });

    it('should throw if deleteFiles fails', async () => {
      Clear.deleteFiles.mockImplementation((cb) => cb('fail'));
      await expect(Clear.clearPeriod(inputPeriod, inputDb, inputBigQuery, client)).rejects.toBe('fail');
    });

    it('should throw if setPeriodValues fails', async () => {
      Clear.setPeriodValues.mockRejectedValue('fail');
      await expect(Clear.clearPeriod(inputPeriod, inputDb, inputBigQuery, client)).rejects.toBe('fail');
    });

    it('should throw if clearPeriodValues fails', async () => {
      Clear.clearPeriodValues.mockRejectedValue('fail');
      await expect(Clear.clearPeriod(inputPeriod, inputDb, inputBigQuery, client)).rejects.toBe('fail');
    });

    it('should throw if resetEscalationTrackingFigures fails', async () => {
      Clear.resetEscalationTrackingFigures.mockRejectedValue(new Error('fail'));
      await expect(Clear.clearPeriod(inputPeriod, inputDb, inputBigQuery, client)).rejects.toThrow('fail');
    });
  });

  describe('#deleteFiles', () => {
    let inputPeriod;

    beforeEach(async () => {
      inputPeriod = {
        _id: randomId(),
        name: randomString(),
        recalculation: { type: randomString() },
        clientId: randomId(),
        salesFilesIds: [randomId(), randomId()],
        costIds: [randomId(), randomId()],
        allCalculatedSalesCsv: 'sales.csv',
        allCalculatedCostsCsv: 'costs.csv',
        unreportedSalesCsv: 'unreported-sales.csv',
        unreportedCostsCsv: 'unreported-costs.csv',
        suspenseCsv: 'suspense.csv',
        generalLedgerSummary: 'ledger.csv',
        customStatement: 'custom.csv',
        statementsZip: 'zip.csv',
      };
      jest.spyOn(BatchTask, 'deleteMany').mockResolvedValue();
      fileManager.deleteFromS3 = jest.fn((file, cb) => cb());

      // isolate just deleteFiles by mocking the rest
      jest.spyOn(Clear, 'deletePayments').mockImplementation((cb) => cb());
      jest.spyOn(Clear, 'deleteStatements').mockResolvedValue();
      jest.spyOn(Clear, 'setPeriodValues').mockResolvedValue();
      jest.spyOn(Clear, 'clearPeriodValues').mockResolvedValue();
      jest.spyOn(Clear, 'resetEscalationTrackingFigures').mockResolvedValue();
    });

    it('should delete all S3 files if they exist', async () => {
      await Clear.clearPeriod(inputPeriod, {}, {});

      expect(fileManager.deleteFromS3).toHaveBeenCalledWith('sales.csv', expect.any(Function));
      expect(fileManager.deleteFromS3).toHaveBeenCalledWith('costs.csv', expect.any(Function));
      expect(fileManager.deleteFromS3).toHaveBeenCalledWith('unreported-sales.csv', expect.any(Function));
      expect(fileManager.deleteFromS3).toHaveBeenCalledWith('unreported-costs.csv', expect.any(Function));
      expect(fileManager.deleteFromS3).toHaveBeenCalledWith('suspense.csv', expect.any(Function));
      expect(fileManager.deleteFromS3).toHaveBeenCalledWith('ledger.csv', expect.any(Function));
      expect(fileManager.deleteFromS3).toHaveBeenCalledWith('custom.csv', expect.any(Function));
      expect(fileManager.deleteFromS3).toHaveBeenCalledWith('zip.csv', expect.any(Function));
      expect(BatchTask.deleteMany).toHaveBeenCalledWith({
        periodId: inputPeriod._id,
        status: { $ne: 'Complete' },
      });
    });

    it('should return error if fileManager.deleteFromS3 fails', async () => {
      const error = 'S3 error';
      fileManager.deleteFromS3.mockImplementationOnce((file, cb) => cb(error));

      await expect(Clear.clearPeriod(inputPeriod, {}, {})).rejects.toBe(error);
    });

    it('should call BatchTask.deleteMany with correct filter', async () => {
      await Clear.clearPeriod(inputPeriod, {}, {});
      expect(BatchTask.deleteMany).toHaveBeenCalledWith({
        periodId: inputPeriod._id,
        status: { $ne: 'Complete' },
      });
    });

    it('should return error if BatchTask.deleteMany fails', async () => {
      const expected = 'batch error';
      BatchTask.deleteMany.mockRejectedValueOnce(expected);

      await expect(Clear.clearPeriod(inputPeriod, {}, {})).rejects.toBe(expected);
    });
  });

  describe('#deletePayments', () => {
    let inputPeriod; let paymentGroup; let
      payment;

    beforeEach(() => {
      inputPeriod = {
        _id: randomId(),
        clientId: randomId(),
        recalculation: { type: 'Full' },
      };

      paymentGroup = {
        _id: randomId(),
        deleteOne: jest.fn().mockResolvedValue(),
      };

      payment = {
        deleteOne: jest.fn().mockResolvedValue(),
      };

      jest.spyOn(PaymentGroup, 'findOne').mockResolvedValue(paymentGroup);
      jest.spyOn(Payment, 'find').mockResolvedValue([payment]);

      // mock other internal methods so they don’t interfere
      jest.spyOn(Clear, 'deleteStatements').mockResolvedValue();
      jest.spyOn(Clear, 'deleteFiles').mockImplementation((cb) => cb());
      jest.spyOn(Clear, 'setPeriodValues').mockResolvedValue();
      jest.spyOn(Clear, 'clearPeriodValues').mockResolvedValue();
      jest.spyOn(Clear, 'resetEscalationTrackingFigures').mockResolvedValue();
    });

    it('should call Payment.find with expected filter', async () => {
      await Clear.clearPeriod(inputPeriod, {}, {});
      expect(Payment.find).toHaveBeenCalledWith({
        clientId: inputPeriod.clientId,
        paymentGroupId: paymentGroup._id.toString(),
      });
    });

    it('should remove all returned payments', async () => {
      await Clear.clearPeriod(inputPeriod, {}, {});
      expect(payment.deleteOne).toHaveBeenCalled();
    });

    it('should remove the payment group if not Partial', async () => {
      await Clear.clearPeriod(inputPeriod, {}, {});
      expect(paymentGroup.deleteOne).toHaveBeenCalled();
    });
    it('should not remove payment group if recalculation type is Partial', async () => {
      inputPeriod.recalculation = { type: 'Partial', contractIds: [randomId()] };
      await Clear.clearPeriod(inputPeriod, {}, {});
      expect(paymentGroup.deleteOne).not.toHaveBeenCalled();
    });

    it('should filter by contractIds if recalculation is Partial with contractIds', async () => {
      const contractIds = [randomId(), randomId()];
      inputPeriod.recalculation = { type: 'Partial', contractIds };
      await Clear.clearPeriod(inputPeriod, {}, {});
      expect(Payment.find).toHaveBeenCalledWith(expect.objectContaining({
        contractId: { $in: contractIds },
      }));
    });

    it('should ignore contractIds if salesFiles are present in recalculation', async () => {
      const contractIds = [randomId()];
      inputPeriod.recalculation = { type: 'Partial', contractIds, salesFiles: true };
      await Clear.clearPeriod(inputPeriod, {}, {});
      expect(Payment.find).toHaveBeenCalledWith(expect.not.objectContaining({
        contractId: expect.anything(),
      }));
    });

    it('should not call Payment.find if no payment group returned', async () => {
      jest.spyOn(PaymentGroup, 'findOne').mockResolvedValue(null);
      await Clear.clearPeriod(inputPeriod, {}, {});
      expect(Payment.find).not.toHaveBeenCalled();
    });
  });

  describe('#deleteStatements', () => {
    let inputPeriod; let
      statement;

    beforeEach(() => {
      inputPeriod = {
        _id: randomId(),
        clientId: randomId(),
        recalculation: { type: 'Full' },
      };

      statement = {
        deleteOne: jest.fn((cb) => cb && cb()),
      };

      jest.spyOn(Statement, 'find').mockResolvedValue([statement]);

      // isolate deleteStatements by mocking the rest
      jest.spyOn(Clear, 'deletePayments').mockImplementation((cb) => cb());
      jest.spyOn(Clear, 'deleteFiles').mockImplementation((cb) => cb());
      jest.spyOn(Clear, 'setPeriodValues').mockResolvedValue();
      jest.spyOn(Clear, 'clearPeriodValues').mockResolvedValue();
      jest.spyOn(Clear, 'resetEscalationTrackingFigures').mockResolvedValue();
    });

    it('should call Statement.find with expected filter', async () => {
      await Clear.clearPeriod(inputPeriod, {}, {});
      expect(Statement.find).toHaveBeenCalledWith({
        clientId: inputPeriod.clientId,
        periodId: inputPeriod._id.toString(),
      });
    });

    it('should call deleteOne on all statements', async () => {
      await Clear.clearPeriod(inputPeriod, {}, {});
      expect(statement.deleteOne).toHaveBeenCalled();
    });

    it('should include contractId filter if recalculation type is Partial', async () => {
      const contractIds = [randomId(), randomId()];
      inputPeriod.recalculation = { type: 'Partial', contractIds };
      await Clear.clearPeriod(inputPeriod, {}, {});
      expect(Statement.find).toHaveBeenCalledWith(expect.objectContaining({
        contractId: { $in: contractIds },
      }));
    });

    it('should throw if Statement.find rejects', async () => {
      Statement.find.mockRejectedValueOnce('fail');
      await expect(Clear.clearPeriod(inputPeriod, {}, {})).rejects.toBe('fail');
    });

    it('should throw if deleteOne throws', async () => {
      statement.deleteOne.mockImplementationOnce(() => { throw new Error('fail'); });
      await expect(Clear.clearPeriod(inputPeriod, {}, {})).rejects.toThrow('fail');
    });
  });
  describe('#setPeriodValues', () => {
    let inputPeriod;

    beforeEach(() => {
      inputPeriod = {
        _id: randomId(),
        clientId: randomId(),
        recalculation: { type: 'Full' },
      };

      jest.spyOn(Period, 'findByIdAndUpdate').mockResolvedValue();

      // isolate setPeriodValues by mocking the rest
      jest.spyOn(Clear, 'deletePayments').mockImplementation((cb) => cb());
      jest.spyOn(Clear, 'deleteStatements').mockResolvedValue();
      jest.spyOn(Clear, 'deleteFiles').mockImplementation((cb) => cb());
      jest.spyOn(Clear, 'clearPeriodValues').mockResolvedValue();
      jest.spyOn(Clear, 'resetEscalationTrackingFigures').mockResolvedValue();
    });

    it('should call Period.findByIdAndUpdate with expected update object', async () => {
      await Clear.clearPeriod(inputPeriod, {}, {});

      expect(Period.findByIdAndUpdate).toHaveBeenCalledWith(inputPeriod._id, {
        $set: {
          completedCatalogueItems: 0,
          completedCostCatalogueItems: 0,
          units: null,
          grossAmount: null,
          netAmount: null,
          grossCosts: null,
          netCosts: null,
          lines: null,
          valid: false,
          completedCatalinvalidLinesogueItems: null,
          calculationStatus: null,
          calculationError: null,
          allCalculatedSalesCsv: null,
          allCalculatedCostsCsv: null,
          statementsZipPublicLink: null,
          unreportedSalesCsv: null,
          unreportedCostsCsv: null,
          statementsZip: null,
          analysis: null,
          processEndTime: null,
          calculationNotes: [],
        },
      });
    });

    it('should throw if Period.findByIdAndUpdate rejects', async () => {
      Period.findByIdAndUpdate.mockRejectedValueOnce('fail');
      await expect(Clear.clearPeriod(inputPeriod, {}, {})).rejects.toBe('fail');
    });
  });

  describe('#clearPeriodValues', () => {
    let inputPeriod;
    const contractIds = [randomId(), randomId()];

    beforeEach(() => {
      inputPeriod = {
        _id: randomId(),
        clientId: randomId(),
        salesFilesIds: [randomId(), randomId()],
        costIds: [randomId(), randomId()],
        recalculation: { type: 'Full' },
      };

      jest.spyOn(Contract, 'distinct').mockResolvedValue(contractIds);

      // isolate clearPeriodValues by mocking the rest
      jest.spyOn(Clear, 'deletePayments').mockImplementation((cb) => cb());
      jest.spyOn(Clear, 'deleteStatements').mockResolvedValue();
      jest.spyOn(Clear, 'deleteFiles').mockImplementation((cb) => cb());
      jest.spyOn(Clear, 'setPeriodValues').mockResolvedValue();
      jest.spyOn(Clear, 'resetEscalationTrackingFigures').mockResolvedValue();
    });

    it('should call Contract.distinct with correct filter', async () => {
      await Clear.clearPeriod(inputPeriod, {}, {});
      expect(Contract.distinct).toHaveBeenCalledWith('_id', { clientId: inputPeriod.clientId });
    });

    it('should set filter.contractType to Mechanical if period.contractType is Mechanical', async () => {
      inputPeriod.contractType = 'Mechanical';
      await Clear.clearPeriod(inputPeriod, {}, {});
      expect(Contract.distinct).toHaveBeenCalledWith('_id', expect.objectContaining({
        clientId: inputPeriod.clientId,
        contractType: 'Mechanical',
      }));
    });

    it('should set filter._id to contractIds if recalculation.contractIds are provided', async () => {
      const contractIdsInput = [randomId(), randomId()];
      inputPeriod.recalculation = { type: 'Partial', contractIds: contractIdsInput };
      await Clear.clearPeriod(inputPeriod, {}, {});
      expect(Contract.distinct).toHaveBeenCalledWith('_id', expect.objectContaining({
        _id: { $in: contractIdsInput },
      }));
    });

    it('should call clearPeriodData with expected input', async () => {
      const mockClearPeriodData = require('../../../clearPeriod');

      await Clear.clearPeriod(inputPeriod, {}, {});

      expect(mockClearPeriodData).toHaveBeenCalledWith(
        expect.objectContaining({
          db: {},
          bigQuery: {},
          recalculation: inputPeriod.recalculation,
          costsDatabaseTable: 'costs',
          clientId: inputPeriod.clientId,
          periodId: inputPeriod._id.toString(),
          periodSalesFiles: inputPeriod.salesFilesIds,
          periodCostIds: inputPeriod.costIds,
          contractIds: contractIds.map((id) => id.toString()),
        }),
        expect.any(Function),
      );
    });

    it('should use ["MCPS"] if period.contractType is "MCPS"', async () => {
      const mockClearPeriodData = require('../../../clearPeriod');

      inputPeriod.contractType = 'MCPS';

      await Clear.clearPeriod(inputPeriod, {}, {});

      expect(mockClearPeriodData).toHaveBeenCalledWith(
        expect.objectContaining({
          contractIds: ['MCPS'],
        }),
        expect.any(Function),
      );
    });

    it('should throw if Contract.distinct rejects', async () => {
      Contract.distinct.mockImplementationOnce(() => Promise.reject('fail'));
      Clear.deletePayments.mockImplementation((cb) => cb('fail'));

      await expect(Clear.clearPeriod(inputPeriod, {}, {})).rejects.toBe('fail');
    });

    it('should throw if clearPeriodData yields error', async () => {
      const mockClearPeriodData = require('../../../clearPeriod');

      mockClearPeriodData.mockImplementationOnce((data, cb) => cb('fail'));

      await expect(Clear.clearPeriod(inputPeriod, {}, {})).rejects.toBe('fail');
    });
  });

  describe('#resetEscalationTrackingFigures', () => {
    let inputPeriod;
    let recalculation;
    let contracts;
    let escalations;
    let escalationWithTrackers;

    beforeEach(() => {
      inputPeriod = {
        _id: randomId(),
        clientId: randomId(),
        accountingPeriodType: randomString(),
        contractType: 'NonMechanical',
        recalculation: {},
      };

      recalculation = {};

      contracts = [{ _id: randomId() }, { _id: randomId() }];

      escalationWithTrackers = {
        trackers: {
          [randomString()]: {
            units: 100,
            gross: 500,
            net: 400,
          },
        },
        save: jest.fn().mockResolvedValue(),
      };

      escalations = [
        escalationWithTrackers,
        { trackers: {}, save: jest.fn().mockResolvedValue() },
      ];

      jest.spyOn(Contract, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue(contracts),
      });

      jest.spyOn(Escalation, 'find').mockResolvedValue(escalations);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should use recalculation.contractIds if present', async () => {
      recalculation.contractIds = [randomId(), randomId()];

      await Clear.clearPeriod({ ...inputPeriod, recalculation }, {}, {});

      expect(Escalation.find).toHaveBeenCalledWith(expect.objectContaining({
        clientId: inputPeriod.clientId,
        periodId: inputPeriod._id,
        contractId: { $in: recalculation.contractIds },
      }));
    });

    it('should fetch contracts if recalculation.contractIds is absent', async () => {
      await Clear.clearPeriod(inputPeriod, {}, {});

      expect(Contract.find).toHaveBeenCalledWith(expect.objectContaining({
        clientId: inputPeriod.clientId,
        accountingPeriod: inputPeriod.accountingPeriodType,
        active: true,
        contractType: { $ne: 'Mechanical' },
      }));

      expect(Escalation.find).toHaveBeenCalledWith(expect.objectContaining({
        contractId: { $in: contracts.map((c) => c._id) },
      }));
    });

    it('should use contractType = Mechanical when period is mechanical', async () => {
      inputPeriod.contractType = 'Mechanical';
      await Clear.clearPeriod(inputPeriod, {}, {});

      expect(Contract.find).toHaveBeenCalledWith(expect.objectContaining({
        contractType: 'Mechanical',
      }));
    });

    it('should copy trackers into previousCalculationTrackers and save', async () => {
      const originalTrackers = { ...escalationWithTrackers.trackers };

      await Clear.clearPeriod(inputPeriod, {}, {});

      expect(escalationWithTrackers.previousCalculationTrackers).toEqual(originalTrackers);
      expect(escalationWithTrackers.trackers).toEqual({});
      expect(escalationWithTrackers.save).toHaveBeenCalled();
    });
  });
});
