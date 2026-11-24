/* eslint-disable no-await-in-loop */
/* eslint-disable max-len */
const { logger, fileManager, createXlsx } = require('@curveroyaltysystems/platform-shared-utils');
const { UserAccess, Exports, WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const { randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { eachLimit, eachOfLimit } = require('async');

const PayeeTransactionController = require('./payeeTransaction');

const Client = require('../../models/client');
const Payee = require('../../models/payee');
const PayeeTransaction = require('../../models/payeeTransaction');
const Notification = require('../../models/notification');
const ImportXlsx = require('../../libs/importXlsx');

jest.mock('@curveroyaltysystems/platform-shared-utils');
jest.mock('@curveroyaltysystems/curve-shared-logic');
jest.mock('../../models/notification');
jest.mock('../../libs/importXlsx');
jest.mock('async');

describe('PayeeTransactionController', () => {
  logger.info('\n\n**** controllers/payeeTransaction.unit.test.js');

  const mockCurveUser = {
    id: randomId().toString(),
    clientId: randomId().toString(),
    email: 'test@example.com',
  };

  const mockClient = {
    _id: mockCurveUser.clientId,
    name: 'Test Client',
    features: { payeeBalances: true },
    dateFormat: 'DD/MM/YYYY',
  };

  const mockPayee = {
    _id: randomId().toString(),
    name: 'Test Payee',
    payeeBalanceCurrency: 'USD',
    openingBalance: 1000,
  };

  const mockTransaction = {
    _id: randomId().toString(),
    payeeId: mockPayee._id,
    name: 'Test Transaction',
    amountInPayeeCurrency: 500,
    amountInOriginalCurrency: 500,
    date: new Date('2024-01-01'),
    type: 'Royalty',
    currency: 'USD',
    originalCurrency: 'USD',
    published: true,
    toObject: jest.fn().mockReturnValue({
      _id: randomId().toString(),
      name: 'Test Transaction',
      amountInPayeeCurrency: 500,
      balance: 1500,
    }),
    save: jest.fn().mockResolvedValue(),
    validate: jest.fn().mockResolvedValue(),
    deleteOne: jest.fn().mockResolvedValue(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    Client.findById = jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue(mockClient),
      catch: jest.fn().mockResolvedValue(mockClient),
    });

    Payee.findById = jest.fn().mockResolvedValue(mockPayee);

    Payee.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([mockPayee]),
      }),
    });

    PayeeTransaction.find = jest.fn().mockResolvedValue([mockTransaction]);
    PayeeTransaction.findById = jest.fn().mockResolvedValue(mockTransaction);
    PayeeTransaction.findOne = jest.fn().mockResolvedValue(mockTransaction);
    PayeeTransaction.countDocuments = jest.fn().mockResolvedValue(5);
    PayeeTransaction.prototype.save = jest.fn().mockResolvedValue();
    PayeeTransaction.prototype.validate = jest.fn().mockResolvedValue();
    PayeeTransaction.prototype.deleteOne = jest.fn().mockResolvedValue();

    UserAccess.isUserForbidden = jest.fn().mockResolvedValue(false);
    Notification.generate = jest.fn().mockResolvedValue();

    eachLimit.mockImplementation(async (items, _limit, fn) => {
      for (let i = 0; i < items.length; i += 1) {
        await fn(items[i], i);
      }
    });

    eachOfLimit.mockImplementation(async (items, _limit, fn) => {
      for (let i = 0; i < items.length; i += 1) {
        await fn(items[i], i);
      }
    });
  });

  describe('getTransactions', () => {
    it('should return transactions with balances for valid request', async () => {
      const result = await PayeeTransactionController.getTransactions({
        payeeId: mockPayee._id,
        curveUser: mockCurveUser,
      });

      expect(Client.findById).toHaveBeenCalledWith(mockCurveUser.clientId, 'features');
      expect(Payee.findById).toHaveBeenCalledWith(mockPayee._id);
      expect(PayeeTransaction.find).toHaveBeenCalledWith({
        clientId: mockCurveUser.clientId,
        payeeId: mockPayee._id,
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('balance');
    });

    it('should throw 403 error when client does not have payeeBalances feature', async () => {
      Client.findById = jest.fn().mockResolvedValue({
        ...mockClient,
        features: { payeeBalances: false },
      });

      await expect(
        PayeeTransactionController.getTransactions({
          payeeId: mockPayee._id,
          curveUser: mockCurveUser,
        }),
      ).rejects.toThrow('This client is not allowed to create payee transactions');

      const error = await PayeeTransactionController.getTransactions({
        payeeId: mockPayee._id,
        curveUser: mockCurveUser,
      }).catch((e) => e);

      expect(error.code).toBe(403);
    });

    it('should throw 404 error when payee not found', async () => {
      Payee.findById = jest.fn().mockResolvedValue(null);

      await expect(
        PayeeTransactionController.getTransactions({
          payeeId: 'invalid-id',
          curveUser: mockCurveUser,
        }),
      ).rejects.toThrow("Couldn't find a Payee matching this ID");

      const error = await PayeeTransactionController.getTransactions({
        payeeId: 'invalid-id',
        curveUser: mockCurveUser,
      }).catch((e) => e);

      expect(error.code).toBe(404);
    });

    it('should throw 403 error when user access is forbidden', async () => {
      const payeeUser = {
        ...mockCurveUser,
        clientId: null,
        payeeId: 'different-payee-id',
      };

      await expect(
        PayeeTransactionController.getTransactions({
          payeeId: mockPayee._id,
          curveUser: payeeUser,
        }),
      ).rejects.toThrow('Forbidden');

      const error = await PayeeTransactionController.getTransactions({
        payeeId: mockPayee._id,
        curveUser: payeeUser,
      }).catch((e) => e);

      expect(error.code).toBe(403);
    });

    it('should calculate balances correctly', async () => {
      const transactions = [
        {
          ...mockTransaction,
          amountInPayeeCurrency: 100,
          toObject: jest.fn().mockReturnValue({
            _id: randomId().toString(),
            name: 'Test Transaction 1',
            amountInPayeeCurrency: 100,
          }),
        },
        {
          ...mockTransaction,
          amountInPayeeCurrency: 200,
          toObject: jest.fn().mockReturnValue({
            _id: randomId().toString(),
            name: 'Test Transaction 2',
            amountInPayeeCurrency: 200,
          }),
        },
        {
          ...mockTransaction,
          amountInPayeeCurrency: 300,
          toObject: jest.fn().mockReturnValue({
            _id: randomId().toString(),
            name: 'Test Transaction 3',
            amountInPayeeCurrency: 300,
          }),
        },
      ];

      PayeeTransaction.find = jest.fn().mockResolvedValue(transactions);

      const result = await PayeeTransactionController.getTransactions({
        payeeId: mockPayee._id,
        curveUser: mockCurveUser,
      });

      expect(result).toHaveLength(3);
      expect(result[0].balance).toBe(1100);
      expect(result[1].balance).toBe(1300);
      expect(result[2].balance).toBe(1600);
    });
  });

  describe('createTransaction', () => {
    const mockBody = {
      name: 'New Transaction',
      amountInPayeeCurrency: 250,
      date: new Date('2024-01-15'),
      type: 'Royalty',
    };

    it('should create transaction successfully', async () => {
      const result = await PayeeTransactionController.createTransaction({
        payeeId: mockPayee._id,
        body: mockBody,
        curveUser: mockCurveUser,
      });

      expect(Client.findById).toHaveBeenCalledWith(mockCurveUser.clientId, 'features');
      expect(Payee.findById).toHaveBeenCalledWith(mockPayee._id);
      expect(UserAccess.isUserForbidden).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.clientId).toBe(mockClient._id.toString());
      expect(result.payeeId).toBe(mockPayee._id.toString());
      expect(result.userCreated).toBe(true);
      expect(result.published).toBe(true);
      expect(result.originalCurrency).toBe(mockPayee.payeeBalanceCurrency);
      expect(result.currency).toBe(mockPayee.payeeBalanceCurrency);
    });

    it('should throw 403 error when client does not have payeeBalances feature', async () => {
      Client.findById = jest.fn().mockResolvedValue({
        ...mockClient,
        features: { payeeBalances: false },
      });

      await expect(
        PayeeTransactionController.createTransaction({
          payeeId: mockPayee._id,
          body: mockBody,
          curveUser: mockCurveUser,
        }),
      ).rejects.toThrow('This client is not allowed to create payee transactions');
    });

    it('should throw 404 error when payee not found', async () => {
      Payee.findById = jest.fn().mockResolvedValue(null);

      await expect(
        PayeeTransactionController.createTransaction({
          payeeId: 'invalid-id',
          body: mockBody,
          curveUser: mockCurveUser,
        }),
      ).rejects.toThrow("Couldn't find a Payee matching this ID");
    });

    it('should throw 400 error when payee has no balance currency', async () => {
      Payee.findById = jest.fn().mockResolvedValue({
        ...mockPayee,
        payeeBalanceCurrency: null,
      });

      await expect(
        PayeeTransactionController.createTransaction({
          payeeId: mockPayee._id,
          body: mockBody,
          curveUser: mockCurveUser,
        }),
      ).rejects.toThrow('Payee Balance currency must be set before creating transactions');
    });

    it('should throw 403 error when user access is forbidden', async () => {
      UserAccess.isUserForbidden = jest.fn().mockResolvedValue(true);

      await expect(
        PayeeTransactionController.createTransaction({
          payeeId: mockPayee._id,
          body: mockBody,
          curveUser: mockCurveUser,
        }),
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('updateTransaction', () => {
    const mockBody = {
      name: 'Updated Transaction',
      amountInPayeeCurrency: 300,
    };

    it('should update transaction successfully', async () => {
      const result = await PayeeTransactionController.updateTransaction({
        transactionId: mockTransaction._id,
        body: mockBody,
        curveUser: mockCurveUser,
      });

      expect(Client.findById).toHaveBeenCalledWith(mockCurveUser.clientId, 'features');
      expect(PayeeTransaction.findById).toHaveBeenCalledWith({
        clientId: mockCurveUser.clientId,
        _id: mockTransaction._id,
      });
      expect(UserAccess.isUserForbidden).toHaveBeenCalled();
      expect(mockTransaction.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw 403 error when client does not have payeeBalances feature', async () => {
      Client.findById = jest.fn().mockResolvedValue({
        ...mockClient,
        features: { payeeBalances: false },
      });

      await expect(
        PayeeTransactionController.updateTransaction({
          transactionId: mockTransaction._id,
          body: mockBody,
          curveUser: mockCurveUser,
        }),
      ).rejects.toThrow('This client is not allowed to create payee transactions');
    });

    it('should throw 404 error when transaction not found', async () => {
      PayeeTransaction.findById = jest.fn().mockResolvedValue(null);

      await expect(
        PayeeTransactionController.updateTransaction({
          transactionId: 'invalid-id',
          body: mockBody,
          curveUser: mockCurveUser,
        }),
      ).rejects.toThrow("Couldn't find a PayeeTransaction matching this ID");
    });

    it('should throw 403 error when user access is forbidden', async () => {
      UserAccess.isUserForbidden = jest.fn().mockResolvedValue(true);

      await expect(
        PayeeTransactionController.updateTransaction({
          transactionId: mockTransaction._id,
          body: mockBody,
          curveUser: mockCurveUser,
        }),
      ).rejects.toThrow('Forbidden');
    });

    it('should remove _id from body before updating', async () => {
      const bodyWithId = {
        _id: 'should-be-removed',
        name: 'Updated Transaction',
      };

      await PayeeTransactionController.updateTransaction({
        transactionId: mockTransaction._id,
        body: bodyWithId,
        curveUser: mockCurveUser,
      });

      expect(mockTransaction.name).toBe('Updated Transaction');
      expect(mockTransaction._id).not.toBe('should-be-removed');
    });
  });

  describe('deleteTransaction', () => {
    it('should delete transaction successfully', async () => {
      await PayeeTransactionController.deleteTransaction({
        transactionId: mockTransaction._id,
        curveUser: mockCurveUser,
      });

      expect(Client.findById).toHaveBeenCalledWith(mockCurveUser.clientId, 'features');
      expect(PayeeTransaction.findById).toHaveBeenCalledWith({
        clientId: mockCurveUser.clientId,
        _id: mockTransaction._id,
      });
      expect(UserAccess.isUserForbidden).toHaveBeenCalled();
      expect(mockTransaction.deleteOne).toHaveBeenCalled();
    });

    it('should throw 403 error when client does not have payeeBalances feature', async () => {
      Client.findById = jest.fn().mockResolvedValue({
        ...mockClient,
        features: { payeeBalances: false },
      });

      await expect(
        PayeeTransactionController.deleteTransaction({
          transactionId: mockTransaction._id,
          curveUser: mockCurveUser,
        }),
      ).rejects.toThrow('This client is not allowed to create payee transactions');
    });

    it('should throw 404 error when transaction not found', async () => {
      PayeeTransaction.findById = jest.fn().mockResolvedValue(null);

      await expect(
        PayeeTransactionController.deleteTransaction({
          transactionId: 'invalid-id',
          curveUser: mockCurveUser,
        }),
      ).rejects.toThrow("Couldn't find a PayeeTransaction matching this ID");
    });

    it('should throw 403 error when user access is forbidden', async () => {
      UserAccess.isUserForbidden = jest.fn().mockResolvedValue(true);

      await expect(
        PayeeTransactionController.deleteTransaction({
          transactionId: mockTransaction._id,
          curveUser: mockCurveUser,
        }),
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('importPayeeTransactions', () => {
    const mockFile = {
      path: '/test/path/file.xlsx',
      originalname: 'test-import.xlsx',
    };

    const mockImportData = [
      {
        name: 'Transaction 1',
        date: '2024-01-01',
        payeeName: 'Test Payee',
        originalAmount: '100',
        originalCurrencyAmount: '100',
        type: 'Royalty',
        originalCurrency: 'USD',
        published: true,
      },
      {
        name: 'Transaction 2',
        date: '2024-01-02',
        payeeName: 'Test Payee',
        originalAmount: '200',
        originalCurrencyAmount: '200',
        type: 'Royalty',
        originalCurrency: 'USD',
        published: true,
      },
    ];

    beforeEach(() => {
      ImportXlsx.getDataByTemplate.mockImplementation((_path, _template, _startRow, _endRow, _dateFormat, callback) => {
        callback(null, mockImportData);
      });
    });

    it('should import transactions successfully', async () => {
      const result = await PayeeTransactionController.importPayeeTransactions({
        file: mockFile,
        curveUser: mockCurveUser,
      });

      expect(Client.findById).toHaveBeenCalledWith(mockCurveUser.clientId);
      expect(Payee.find).toHaveBeenCalledWith(
        { clientId: mockCurveUser.clientId },
      );
      expect(ImportXlsx.getDataByTemplate).toHaveBeenCalled();
      expect(eachOfLimit).toHaveBeenCalled();
      expect(eachLimit).toHaveBeenCalled();
      expect(Notification.generate).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle validation errors and not import any transactions', async () => {
      const invalidData = [
        {
          name: '',
          date: '2024-01-01',
          payeeName: 'Test Payee',
        },
        {
          name: 'Transaction 2',
          date: '',
          payeeName: 'Test Payee',
        },
      ];

      ImportXlsx.getDataByTemplate.mockImplementation((_path, _template, _startRow, _endRow, _dateFormat, callback) => {
        callback(null, invalidData);
      });

      const result = await PayeeTransactionController.importPayeeTransactions({
        file: mockFile,
        curveUser: mockCurveUser,
      });

      expect(result.success).toBe(false);
      expect(result.count).toBe(0);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('Name is required');
      expect(result.errors[1]).toContain('Date is required');
      expect(eachLimit).not.toHaveBeenCalled();
    });

    it('should handle payee not found errors', async () => {
      const dataWithInvalidPayee = [
        {
          name: 'Transaction 1',
          date: '2024-01-01',
          payeeName: 'Non-existent Payee',
          originalAmount: '100',
          originalCurrencyAmount: '100',
        },
      ];

      ImportXlsx.getDataByTemplate.mockImplementation((_path, _template, _startRow, _endRow, _dateFormat, callback) => {
        callback(null, dataWithInvalidPayee);
      });

      const result = await PayeeTransactionController.importPayeeTransactions({
        file: mockFile,
        curveUser: mockCurveUser,
      });

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Payee "Non-existent Payee" not found');
    });

    it('should handle payee without balance currency', async () => {
      Payee.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { ...mockPayee, payeeBalanceCurrency: null },
          ]),
        }),
      });

      const result = await PayeeTransactionController.importPayeeTransactions({
        file: mockFile,
        curveUser: mockCurveUser,
      });

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('must have balance currency set');
    });

    it('should handle client not found error', async () => {
      Client.findById = jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue(null),
      });

      await expect(
        PayeeTransactionController.importPayeeTransactions({
          file: mockFile,
          curveUser: mockCurveUser,
        }),
      ).rejects.toThrow('Client not found');
    });

    it('should handle import file parsing errors', async () => {
      ImportXlsx.getDataByTemplate.mockImplementation((_path, _template, _startRow, _endRow, _dateFormat, callback) => {
        callback('Template does not match');
      });

      await expect(
        PayeeTransactionController.importPayeeTransactions({
          file: mockFile,
          curveUser: mockCurveUser,
        }),
      ).rejects.toThrow('It appears the template does not match');
    });

    it('should handle processing errors during import', async () => {
      PayeeTransaction.prototype.save = jest.fn().mockRejectedValue(new Error('Database error'));

      const result = await PayeeTransactionController.importPayeeTransactions({
        file: mockFile,
        curveUser: mockCurveUser,
      });

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Import failed: Database error');
    });

    it('should send error notification when import fails', async () => {
      const error = new Error('Test error');
      Client.findById = jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue(mockClient),
        catch: jest.fn().mockResolvedValue(mockClient),
      });

      Notification.generate = jest.fn().mockRejectedValue(error);

      await expect(
        PayeeTransactionController.importPayeeTransactions({
          file: mockFile,
          curveUser: mockCurveUser,
        }),
      ).rejects.toThrow('Test error');

      expect(Notification.generate).toHaveBeenCalledWith(
        'Your Payee Transaction Import Has Errored',
        'Errors in file test-import.xlsx',
        null,
        mockCurveUser,
        expect.objectContaining({
          identifier: 'importError',
          error: ['Test error'],
        }),
      );
    });
  });

  describe('exportTransactions', () => {
    const mockFilter = { status: 'active' };
    const mockIds = [mockPayee._id];

    beforeEach(() => {
      Payee.paramsToFilterField = jest.fn().mockReturnValue({ clientId: mockCurveUser.clientId });
      PayeeTransaction.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockTransaction]),
        }),
      });

      Payee.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockPayee]),
        }),
      });

      Exports.getTemplate = jest.fn().mockResolvedValue({ template: 'mock-template' });
      createXlsx.createInTemplate = jest.fn().mockImplementation((_data, _template, callback) => {
        callback(null, '/test/path/export.xlsx');
      });
      fileManager.uploadToS3 = jest.fn().mockImplementation((_key, _path, callback) => {
        callback(null, 's3-result');
      });
      fileManager.publicLink24Hours = jest.fn().mockImplementation((_key, callback) => {
        callback(null, 'https://test-link.com');
      });
    });

    it('should export transactions successfully with small dataset', async () => {
      await PayeeTransactionController.exportTransactions({
        curveUser: mockCurveUser,
        ids: mockIds,
        filter: mockFilter,
      });

      expect(PayeeTransaction.countDocuments).toHaveBeenCalled();
      expect(PayeeTransaction.find).toHaveBeenCalledWith(
        { clientId: mockCurveUser.clientId, payeeId: { $in: mockIds } },
      );
      expect(createXlsx.createInTemplate).toHaveBeenCalled();
      expect(fileManager.uploadToS3).toHaveBeenCalled();
      expect(fileManager.publicLink24Hours).toHaveBeenCalled();
      expect(Notification.generate).toHaveBeenCalledWith(
        'Payee Transactions Export Ready',
        `Your Payee Transactions Export for ${mockClient.name} is Ready to Download`,
        'https://test-link.com',
        mockCurveUser,
        expect.any(Object),
      );
    });

    it('should handle large datasets with CSV export', async () => {
      // Override count to trigger CSV path
      PayeeTransaction.countDocuments = jest.fn().mockResolvedValue(15000);

      PayeeTransaction.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([mockTransaction]),
            }),
          }),
        }),
      });

      WriteCsv.mockImplementation(() => ({
        addData: jest.fn().mockImplementation((_data, callback) => callback()),
        write: jest.fn().mockImplementation((callback) => callback()),
      }));

      await PayeeTransactionController.exportTransactions({
        curveUser: mockCurveUser,
        ids: mockIds,
        filter: mockFilter,
      });

      expect(WriteCsv).toHaveBeenCalled();
      expect(PayeeTransaction.find).toHaveBeenCalledTimes(2);
      expect(createXlsx.createInTemplate).not.toHaveBeenCalled();
    });

    it('should export transactions with filter when no ids provided', async () => {
      await PayeeTransactionController.exportTransactions({
        curveUser: mockCurveUser,
        ids: [],
        filter: mockFilter,
      });

      expect(Payee.paramsToFilterField).toHaveBeenCalledWith(mockFilter, mockCurveUser);
      expect(Payee.find).toHaveBeenCalledWith(
        { clientId: mockCurveUser.clientId },
        { _id: 1 },
      );
    });

    it('should handle export errors', async () => {
      const error = new Error('Export failed');
      PayeeTransaction.countDocuments = jest.fn().mockRejectedValue(error);

      await PayeeTransactionController.exportTransactions({
        curveUser: mockCurveUser,
        ids: mockIds,
        filter: mockFilter,
      });

      expect(Notification.generate).toHaveBeenCalledWith(
        `Your Payee Transactions Export for ${mockClient.name} Has Errored`,
        'Export failed',
        null,
        mockCurveUser,
        expect.objectContaining({
          identifier: 'exportError',
          error: 'Export failed',
        }),
      );
    });
  });
});
