/* eslint-disable global-require */
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { ObjectId } = require('mongodb');

jest.mock('../payment', () => {
  const mockPayment = jest.fn();
  mockPayment.findOne = jest.fn();
  mockPayment.countDocuments = jest.fn();
  mockPayment.find = jest.fn(() => ({
    sort: () => ({ limit: () => ({ skip: () => Promise.resolve([{}]) }) }),
  }));
  return mockPayment;
});

const Payee = require('../payee');
const Statement = require('../statement');
const Contract = require('../contract');
const Payment = require('../payment');
const PaymentGroup = require('./paymentGroup');

describe('PaymentGroup', () => {
  const mockPayee = { _id: randomId(), name: randomString(), supplierCode: randomString(), vatNo: randomString() };
  const mockStatement = { _id: randomId(), name: randomString(), clientId: randomId() };
  const payments = [
    {
      _id: randomId(),
      name: randomString(),
      payeeId: randomId(),
      amount: 123.45,
      withholdingTaxAmount: 0.12,
      withholdingTaxCurrency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date(),
      statementId: randomId(),
    },
  ];

  beforeEach(() => {
    Payee.findById = jest.fn(({ _id }) => Promise.resolve(mockPayee));
    Statement.findById = jest.fn(({ _id }) => Promise.resolve(mockStatement));
  });

  describe('convertForXlsx', () => {
    it('should return defined data for export', () => {
      const result = PaymentGroup.convertForXlsx();
      expect(result).toBeDefined();
    });

    it('should return expected fields with withholding tax', async () => {
      const result = await PaymentGroup.convertForXlsx(payments);

      expect(result).toBeDefined();
      expect(Payee.findById).toHaveBeenCalled();
      expect(Statement.findById).toHaveBeenCalled();
      expect(result.length).toBe(1);
      expect(result[0]).toEqual([[
        payments[0]._id,
        payments[0].name,
        undefined,
        payments[0].amount,
        undefined,
        '',
        mockPayee.name,
        mockPayee.supplierCode,
        '',
        '',
        null,
        null,
        null,
        null,
        null,
        mockPayee.vatNo,
        mockStatement.name,
        payments[0].withholdingTaxAmount,
        payments[0].withholdingTaxCurrency,
        payments[0].createdAt.toISOString(),
        payments[0].updatedAt.toISOString(),
      ]]);
    });

    it('should return expected fields with withholding tax when no statement', async () => {
      Statement.findById = jest.fn(() => Promise.resolve(null));
      const result = await PaymentGroup.convertForXlsx(payments);

      expect(result).toBeDefined();
      expect(Payee.findById).toHaveBeenCalled();
      expect(Statement.findById).toHaveBeenCalled();
      expect(result.length).toBe(1);
      expect(result[0]).toEqual([[
        payments[0]._id,
        payments[0].name,
        undefined,
        payments[0].amount,
        undefined,
        '',
        mockPayee.name,
        mockPayee.supplierCode,
        '',
        '',
        null,
        null,
        null,
        null,
        null,
        mockPayee.vatNo,
        '',
        payments[0].withholdingTaxAmount,
        payments[0].withholdingTaxCurrency,
        payments[0].createdAt.toISOString(),
        payments[0].updatedAt.toISOString(),
      ]]);
    });
  });

  describe('createExportCsv', () => {
    it('should initialise WriteCsv with the expected header columns', (done) => {
      jest.isolateModules(() => {
        let capturedOpts;
        const writerMock = {
          addData: jest.fn((rows, cb) => cb(null)),
          write: jest.fn((cb) => cb(null)),
        };

        // Mock WriteCsv class to avoid file system writes
        jest.doMock('@curveroyaltysystems/curve-shared-logic', () => ({
          WriteCsv: jest.fn().mockImplementation((opts) => { capturedOpts = opts; return writerMock; }),
          Exports: {},
        }));

        jest.doMock('@curveroyaltysystems/models', () => ({ PaymentGroup: { name: 'PaymentGroup', schema: new mongoose.Schema({}) } }));

        // Mock Client and Notification to avoid loading full models and transitive deps
        jest.doMock('../client', () => ({ findById: jest.fn() }));
        jest.doMock('../notification', () => ({ generate: jest.fn() }));
        jest.doMock('../payment', () => ({
          find: jest.fn(() => ({ sort: () => ({ limit: () => ({ skip: () => Promise.resolve([{}]) }) }) })),
        }));

        const FreshPaymentGroup = require('./paymentGroup');
        jest.spyOn(FreshPaymentGroup, 'convertForXlsx').mockResolvedValue([[['a']]]);

        const client = { name: 'TestClient' };
        const expectedHeaders = [
          'ID', 'Name', 'Currency', 'Amount', 'US Revenue Percentage', 'Contract', 'Payee',
          'Supplier Code', 'Self Billing Invoice Number', 'Payment Reference', 'Conversion Rate',
          'Destination Currency', 'Destination Amount', 'Payment Method', 'Fees',
          'Payee Tax Number', 'Statement Name', 'Withholding Tax Amount', 'Withholding Tax Currency',
          'Created At', 'Updated At',
        ];

        FreshPaymentGroup.createExportCsv({}, 1, client, (err, outputPath) => {
          try {
            expect(err).toBeFalsy();
            expect(typeof outputPath).toBe('string');
            expect(outputPath.endsWith('.csv')).toBe(true);
            expect(outputPath).toContain('Payments Export');
            expect(capturedOpts.headers).toEqual(expectedHeaders);
            expect(writerMock.addData).toHaveBeenCalled();
            expect(writerMock.write).toHaveBeenCalled();
            done();
          } catch (e) {
            done(e);
          }
        });
      });
    });
  });

  describe('importPayment', () => {
    let mockClient;
    let mockPaymentGroupId;
    let mockContract;
    let mockPayeeForImport;

    beforeEach(() => {
      jest.clearAllMocks();

      mockClient = { _id: randomId() };
      mockPaymentGroupId = randomId();
      mockContract = { _id: randomId(), name: randomString(), clientId: mockClient._id };
      mockPayeeForImport = { _id: randomId(), name: randomString(), clientId: mockClient._id };
      ObjectId.isValid = jest.fn();
    });

    describe('validation errors', () => {
      it('should throw error when data is null', async () => {
        await expect(
          PaymentGroup.importPayment(mockPaymentGroupId, null, mockClient),
        ).rejects.toThrow('Data does not match template');
      });

      it('should throw error when data is undefined', async () => {
        await expect(
          PaymentGroup.importPayment(mockPaymentGroupId, undefined, mockClient),
        ).rejects.toThrow('Data does not match template');
      });

      it('should throw error when name is missing', async () => {
        const data = { amount: 1000, payeeId: randomId() };

        await expect(
          PaymentGroup.importPayment(mockPaymentGroupId, data, mockClient),
        ).rejects.toThrow('Name must be passed');
      });

      it('should throw error when name is empty string', async () => {
        const data = { name: '', amount: 1000, payeeId: randomId() };

        await expect(
          PaymentGroup.importPayment(mockPaymentGroupId, data, mockClient),
        ).rejects.toThrow('Name must be passed');
      });

      it('should throw error when amount is missing', async () => {
        const data = { name: randomString(), payeeId: randomId() };

        await expect(
          PaymentGroup.importPayment(mockPaymentGroupId, data, mockClient),
        ).rejects.toThrow('Amount must be passed');
      });

      it('should throw error when amount is empty string', async () => {
        const data = { name: randomString(), amount: '', payeeId: randomId() };

        await expect(
          PaymentGroup.importPayment(mockPaymentGroupId, data, mockClient),
        ).rejects.toThrow('Amount must be passed');
      });

      it('should throw error when payeeId is missing', async () => {
        const data = { name: randomString(), amount: 1000 };

        await expect(
          PaymentGroup.importPayment(mockPaymentGroupId, data, mockClient),
        ).rejects.toThrow('Payee must be passed');
      });

      it('should throw error when payeeId is empty string', async () => {
        const data = { name: randomString(), amount: 1000, payeeId: '' };

        await expect(
          PaymentGroup.importPayment(mockPaymentGroupId, data, mockClient),
        ).rejects.toThrow('Payee must be passed');
      });
    });

    describe('updating existing payment', () => {
      it('should throw error when payment status is Paid', async () => {
        const data = {
          _id: randomId().toString(),
          name: randomString(),
          amount: 1000,
          payeeId: randomId(),
          currency: 'USD',
        };

        ObjectId.isValid.mockReturnValue(true);
        const paidPayment = {
          status: 'Paid',
          currency: 'USD',
          validate: jest.fn().mockResolvedValue(true),
        };
        Payment.findOne = jest.fn().mockResolvedValue(paidPayment);

        await expect(
          PaymentGroup.importPayment(mockPaymentGroupId, data, mockClient),
        ).rejects.toThrow('This payment has already been paid and cannot be updated');
      });

      it('should throw error when currency is being changed', async () => {
        const data = {
          _id: randomId().toString(),
          name: randomString(),
          amount: 1000,
          payeeId: randomId(),
          currency: 'EUR',
        };

        ObjectId.isValid.mockReturnValue(true);
        const existingPayment = {
          currency: 'USD',
          status: 'Pending',
          validate: jest.fn().mockResolvedValue(true),
        };
        Payment.findOne = jest.fn().mockResolvedValue(existingPayment);

        await expect(
          PaymentGroup.importPayment(mockPaymentGroupId, data, mockClient),
        ).rejects.toThrow('Payment currency has been updated, which is not allowed');
      });

      it('should successfully update existing payment', async () => {
        const data = {
          _id: randomId().toString(),
          name: 'Updated Payment',
          amount: 1500,
          payeeId: randomId(),
          currency: 'USD',
          usRevenuePercentage: 50,
          withholdingTaxAmount: 100,
          withholdingTaxCurrency: 'USD',
        };

        ObjectId.isValid.mockReturnValue(true);
        const validateMock = jest.fn().mockResolvedValue(true);
        const existingPayment = {
          currency: 'USD',
          status: 'Pending',
          validate: validateMock,
        };
        Payment.findOne = jest.fn().mockResolvedValue(existingPayment);
        Payee.findOne = jest.fn().mockResolvedValue(mockPayeeForImport);

        const result = await PaymentGroup.importPayment(mockPaymentGroupId, data, mockClient);

        expect(result.name).toBe('Updated Payment');
        expect(result.amount).toBe(1500);
        expect(result.usRevenuePercentage).toBe(50);
        expect(result.withholdingTaxAmount).toBe(100);
        expect(result.withholdingTaxCurrency).toBe('USD');
        expect(result.payeeId).toBe(mockPayeeForImport._id);
        expect(validateMock).toHaveBeenCalled();
      });
    });

    describe('creating new payment', () => {
      it('should create new payment when _id is not valid ObjectId', async () => {
        const data = {
          _id: 'invalid-id',
          name: 'New Payment',
          amount: 1000,
          payeeId: randomId(),
          currency: 'USD',
        };

        ObjectId.isValid.mockReturnValue(false);
        Payee.findOne = jest.fn().mockResolvedValue(mockPayeeForImport);

        const mockPaymentInstance = {
          clientId: mockClient._id,
          paymentGroupId: mockPaymentGroupId,
          currency: 'USD',
          validate: jest.fn().mockResolvedValue(true),
        };
        Payment.mockImplementation(() => mockPaymentInstance);

        const result = await PaymentGroup.importPayment(mockPaymentGroupId, data, mockClient);

        expect(Payment).toHaveBeenCalledWith({
          clientId: mockClient._id,
          paymentGroupId: mockPaymentGroupId,
          currency: 'USD',
        });
        expect(result.name).toBe('New Payment');
        expect(result.amount).toBe(1000);
      });

      it('should create new payment when existing payment not found', async () => {
        const data = {
          _id: randomId().toString(),
          name: 'New Payment',
          amount: 1000,
          payeeId: randomId(),
          currency: 'USD',
        };

        ObjectId.isValid.mockReturnValue(true);
        Payment.findOne = jest.fn().mockResolvedValue(null);
        Payee.findOne = jest.fn().mockResolvedValue(mockPayeeForImport);

        const mockPaymentInstance = {
          clientId: mockClient._id,
          paymentGroupId: mockPaymentGroupId,
          currency: 'USD',
          validate: jest.fn().mockResolvedValue(true),
        };
        Payment.mockImplementation(() => mockPaymentInstance);

        const result = await PaymentGroup.importPayment(mockPaymentGroupId, data, mockClient);

        expect(Payment).toHaveBeenCalledWith({
          clientId: mockClient._id,
          paymentGroupId: mockPaymentGroupId,
          currency: 'USD',
        });
        expect(result.name).toBe('New Payment');
      });

      it('should set usRevenuePercentage to 0 when explicitly passed as 0', async () => {
        const data = {
          name: 'New Payment',
          amount: 1000,
          payeeId: randomId(),
          currency: 'USD',
          usRevenuePercentage: 0,
        };

        ObjectId.isValid.mockReturnValue(false);
        Payee.findOne = jest.fn().mockResolvedValue(mockPayeeForImport);

        const mockPaymentInstance = {
          clientId: mockClient._id,
          paymentGroupId: mockPaymentGroupId,
          currency: 'USD',
          usRevenuePercentage: undefined,
          validate: jest.fn().mockResolvedValue(true),
        };
        Payment.mockImplementation(() => mockPaymentInstance);

        const result = await PaymentGroup.importPayment(mockPaymentGroupId, data, mockClient);

        expect(result.usRevenuePercentage).toBe(0);
      });

      it('should default withholdingTax fields when not provided', async () => {
        const data = {
          name: 'New Payment',
          amount: 1000,
          payeeId: randomId(),
          currency: 'USD',
        };

        ObjectId.isValid.mockReturnValue(false);
        Payee.findOne = jest.fn().mockResolvedValue(mockPayeeForImport);

        const mockPaymentInstance = {
          clientId: mockClient._id,
          paymentGroupId: mockPaymentGroupId,
          currency: 'USD',
          withholdingTaxAmount: undefined,
          withholdingTaxCurrency: undefined,
          validate: jest.fn().mockResolvedValue(true),
        };
        Payment.mockImplementation(() => mockPaymentInstance);

        const result = await PaymentGroup.importPayment(mockPaymentGroupId, data, mockClient);

        expect(result.withholdingTaxAmount).toBe(0);
        expect(result.withholdingTaxCurrency).toBe('');
      });
    });

    describe('contract lookup', () => {
      it('should throw error when contract not found', async () => {
        const data = {
          name: randomString(),
          amount: 1000,
          payeeId: randomId(),
          currency: 'USD',
          contractId: 'Nonexistent Contract',
        };

        ObjectId.isValid.mockReturnValue(false);
        Contract.findOne = jest.fn().mockResolvedValue(null);

        const mockPaymentInstance = {
          clientId: mockClient._id,
          paymentGroupId: mockPaymentGroupId,
          currency: 'USD',
          validate: jest.fn().mockResolvedValue(true),
        };
        Payment.mockImplementation(() => mockPaymentInstance);

        await expect(
          PaymentGroup.importPayment(mockPaymentGroupId, data, mockClient),
        ).rejects.toThrow('Could not find contract with the name Nonexistent Contract');
      });

      it('should set contractId when contract is found', async () => {
        const data = {
          name: randomString(),
          amount: 1000,
          payeeId: randomId(),
          currency: 'USD',
          contractId: 'Test Contract',
        };

        ObjectId.isValid.mockReturnValue(false);
        Contract.findOne = jest.fn().mockResolvedValue(mockContract);
        Payee.findOne = jest.fn().mockResolvedValue(mockPayeeForImport);

        const mockPaymentInstance = {
          clientId: mockClient._id,
          paymentGroupId: mockPaymentGroupId,
          currency: 'USD',
          contractId: undefined,
          validate: jest.fn().mockResolvedValue(true),
        };
        Payment.mockImplementation(() => mockPaymentInstance);

        const result = await PaymentGroup.importPayment(mockPaymentGroupId, data, mockClient);

        expect(Contract.findOne).toHaveBeenCalledWith({
          clientId: mockClient._id,
          name: 'Test Contract',
        });
        expect(result.contractId).toBe(mockContract._id);
      });

      it('should not call Contract.findOne when contractId not provided', async () => {
        const data = {
          name: randomString,
          amount: 1000,
          payeeId: randomId(),
          currency: 'USD',
        };

        ObjectId.isValid.mockReturnValue(false);
        Contract.findOne = jest.fn();
        Payee.findOne = jest.fn().mockResolvedValue(mockPayeeForImport);

        const mockPaymentInstance = {
          clientId: mockClient._id,
          paymentGroupId: mockPaymentGroupId,
          currency: 'USD',
          validate: jest.fn().mockResolvedValue(true),
        };
        Payment.mockImplementation(() => mockPaymentInstance);

        await PaymentGroup.importPayment(mockPaymentGroupId, data, mockClient);

        expect(Contract.findOne).not.toHaveBeenCalled();
      });
    });

    describe('payee lookup', () => {
      it('should throw error when payee not found', async () => {
        const data = {
          name: randomString(),
          amount: 1000,
          payeeId: 'Nonexistent Payee',
          currency: 'USD',
        };

        ObjectId.isValid.mockReturnValue(false);
        Payee.findOne = jest.fn().mockResolvedValue(null);

        const mockPaymentInstance = {
          clientId: mockClient._id,
          paymentGroupId: mockPaymentGroupId,
          currency: 'USD',
          validate: jest.fn().mockResolvedValue(true),
        };
        Payment.mockImplementation(() => mockPaymentInstance);

        await expect(
          PaymentGroup.importPayment(mockPaymentGroupId, data, mockClient),
        ).rejects.toThrow('Could not find payee with the name Nonexistent Payee');
      });

      it('should set payeeId when payee is found', async () => {
        const data = {
          name: randomString(),
          amount: 1000,
          payeeId: 'Test Payee',
          currency: 'USD',
        };

        ObjectId.isValid.mockReturnValue(false);
        Payee.findOne = jest.fn().mockResolvedValue(mockPayeeForImport);

        const mockPaymentInstance = {
          clientId: mockClient._id,
          paymentGroupId: mockPaymentGroupId,
          currency: 'USD',
          payeeId: undefined,
          validate: jest.fn().mockResolvedValue(true),
        };
        Payment.mockImplementation(() => mockPaymentInstance);

        const result = await PaymentGroup.importPayment(mockPaymentGroupId, data, mockClient);

        expect(Payee.findOne).toHaveBeenCalledWith({
          clientId: mockClient._id,
          name: 'Test Payee',
        });
        expect(result.payeeId).toBe(mockPayeeForImport._id);
      });
    });

    describe('payment validation', () => {
      it('should call validate on payment', async () => {
        const data = {
          name: randomString(),
          amount: 1000,
          payeeId: randomId(),
          currency: 'USD',
        };

        ObjectId.isValid.mockReturnValue(false);
        Payee.findOne = jest.fn().mockResolvedValue(mockPayeeForImport);

        const validateMock = jest.fn().mockResolvedValue(true);
        const mockPaymentInstance = {
          clientId: mockClient._id,
          paymentGroupId: mockPaymentGroupId,
          currency: 'USD',
          validate: validateMock,
        };
        Payment.mockImplementation(() => mockPaymentInstance);

        await PaymentGroup.importPayment(mockPaymentGroupId, data, mockClient);

        expect(validateMock).toHaveBeenCalled();
      });
    });
  });
});
