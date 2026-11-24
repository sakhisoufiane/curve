jest.mock('../../../../models/contract', () => ({
  findById: jest.fn(),
  find: jest.fn(),
}));
jest.mock('../../../../models/statement', () => ({
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));
jest.mock('../../contract/statementDesignData', () => jest.fn());
jest.mock('../associatedAddToContractIds', () => jest.fn());
jest.mock('../../../../models/report', () => ({
  findById: jest.fn(),
}));
jest.mock('../../../writeCsv', () => jest.fn());
jest.mock('../../../statements/feesInvoice', () => jest.fn());
jest.mock('../../../statements/selfBillingInvoice', () => jest.fn());

const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const Contract = require('../../../../models/contract');
const Statement = require('../../../../models/statement');
const statementDesignDataRequest = require('../../contract/statementDesignData');
const associatedAddToContractIds = require('../associatedAddToContractIds');
const Report = require('../../../../models/report');
const writeCsv = require('../../../writeCsv');
const CreateFiles = require('./createFiles');
const pdfFeesInvoice = require('../../../statements/feesInvoice');
const pdfSelfBillingInvoice = require('../../../statements/selfBillingInvoice');

describe('CreateFiles', () => {
  describe('CreateFiles.createSalesCsv', () => {
    let fakeStatement;
    let fakeClient;
    const fakeBigQuery = {};
    const fakeSalesData = [];

    beforeEach(() => {
      jest.clearAllMocks();

      fakeStatement = {
        _id: randomId(),
        periodId: randomId().toString(),
        contractId: randomId().toString(),
        clientId: randomId().toString(),
      };
      fakeClient = {
        bigQueryPeriodSales: 'sales_table',
        clientType: 'Publisher',
        periodSalesDatabaseTable: 'db_sales_table',
      };

      Contract.findById.mockImplementation((id, cb) => Promise.resolve({ _id: id }));
      Contract.find.mockImplementation((query, fields, cb) => Promise.resolve([{ name: fakeStatement.contractId }]));
      Statement.find.mockImplementation((query, fields, cb) => Promise.resolve([]));
      Statement.findByIdAndUpdate.mockImplementation(() => Promise.resolve(null));
      Report.findById.mockImplementation((id, cb) => Promise.resolve(null));
      statementDesignDataRequest.mockImplementation((contract, cb) => cb(null, { suppressZeroValueInExport: false, salesReportTemplate: null }));
      pdfFeesInvoice.mockImplementation((event, cb) => cb(null, {}));
      pdfSelfBillingInvoice.mockImplementation((event, cb) => cb(null, {}));
      associatedAddToContractIds.mockImplementation((statement, cb) => cb(null, [fakeStatement.contractId]));
      writeCsv.mockImplementation((object, cb) => cb(null, 'fakeCsvKey'));
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should build a filter WITHOUT suppressZeroValueInExport', (done) => {
      CreateFiles.createSalesCsv(fakeStatement, fakeBigQuery, fakeClient, fakeSalesData, (err) => {
        expect(writeCsv).toHaveBeenCalledTimes(1);

        const { filter } = writeCsv.mock.calls[0][0];

        expect(filter).toBeDefined();
        expect(filter.periodId).toBe(fakeStatement.periodId);
        expect(filter.contractId).toEqual({ $in: [fakeStatement.contractId] });
        expect(filter.objectPercentage).toEqual({ $ne: 0 });
        expect(filter.contractPartitionNo).toEqual({ $in: [] });

        // Assert correct $and clause
        expect(filter.$and).toEqual([
          {
            $or: [
              { royaltyRate: { $ne: 0 } },
              { contractCurrencyCalculationOutput: { $ne: 0 } },
            ],
          },
        ]);

        done();
      });
    });

    it('should build a filter WITH suppressZeroValueInExport', (done) => {
      statementDesignDataRequest.mockImplementation((contract, cb) => cb(null, { suppressZeroValueInExport: true, salesReportTemplate: null }));

      CreateFiles.createSalesCsv(fakeStatement, fakeBigQuery, fakeClient, fakeSalesData, (err) => {
        expect(writeCsv).toHaveBeenCalledTimes(1);

        const { filter } = writeCsv.mock.calls[0][0];

        expect(filter).toBeDefined();
        expect(filter.periodId).toBe(fakeStatement.periodId);
        expect(filter.contractId).toEqual({ $in: [fakeStatement.contractId] });
        expect(filter.objectPercentage).toEqual({ $ne: 0 });
        expect(filter.contractPartitionNo).toEqual({ $in: [] });

        expect(filter.$and).toEqual([
          {
            $or: [
              { royaltyRate: { $ne: 0 } },
              { contractCurrencyCalculationOutput: { $ne: 0 } },
            ],
          },
          {
            $or: [
              { contractCurrencyCalculationOutput: { $ne: 0 } },
              { royaltyRate: 0 },
            ],
          },
        ]);

        done();
      });
    });

    it('should create pdf with param suppressZeroTaxLine set to true', (done) => {
      // When
      statementDesignDataRequest.mockImplementation((contract, cb) => cb(null, { suppressZeroTaxLine: true }));

      // Then
      CreateFiles.createFeesInvoicePdf(fakeStatement, fakeClient, {}, {}, () => {
        // Expect
        expect(pdfFeesInvoice).toHaveBeenCalledTimes(1);
        expect(pdfFeesInvoice.mock.calls[0][0].suppressZeroTaxLine).toBe(true);
        done();
      });
    });

    it('should create pdf with param suppressZeroTaxLine set to false', (done) => {
      // When
      statementDesignDataRequest.mockImplementation((contract, cb) => cb(null, { suppressZeroTaxLine: false }));

      // Then
      CreateFiles.createFeesInvoicePdf(fakeStatement, fakeClient, {}, {}, () => {
        // Expect
        expect(pdfFeesInvoice).toHaveBeenCalledTimes(1);
        expect(pdfFeesInvoice.mock.calls[0][0].suppressZeroTaxLine).toBe(false);
        done();
      });
    });

    it('should create pdf with param suppressZeroTaxLine not set', (done) => {
      // When
      statementDesignDataRequest.mockImplementation((contract, cb) => cb(null, { }));

      // Then
      CreateFiles.createFeesInvoicePdf(fakeStatement, fakeClient, {}, {}, () => {
        // Expect
        expect(pdfFeesInvoice).toHaveBeenCalledTimes(1);
        expect(pdfFeesInvoice.mock.calls[0][0].suppressZeroTaxLine).toBe(undefined);
        done();
      });
    });

    it('should create self-billing pdf with param suppressZeroTaxLine set to true', (done) => {
      // When
      statementDesignDataRequest.mockImplementation((contract, cb) => cb(null, { suppressZeroTaxLine: true }));

      // Then
      CreateFiles.createSelfBillingPdf(fakeStatement, fakeClient, {}, {}, () => {
        // Expect
        expect(pdfSelfBillingInvoice).toHaveBeenCalledTimes(1);
        expect(pdfSelfBillingInvoice.mock.calls[0][0].suppressZeroTaxLine).toBe(true);
        done();
      });
    });

    it('should create self-billing pdf with param suppressZeroTaxLine set to false', (done) => {
      // When
      statementDesignDataRequest.mockImplementation((contract, cb) => cb(null, { suppressZeroTaxLine: false }));

      // Then
      CreateFiles.createSelfBillingPdf(fakeStatement, fakeClient, {}, {}, () => {
        // Expect
        expect(pdfSelfBillingInvoice).toHaveBeenCalledTimes(1);
        expect(pdfSelfBillingInvoice.mock.calls[0][0].suppressZeroTaxLine).toBe(false);
        done();
      });
    });

    it('should create self-billing pdf with param suppressZeroTaxLine not set', (done) => {
      // When
      statementDesignDataRequest.mockImplementation((contract, cb) => cb(null, { }));

      // Then
      CreateFiles.createSelfBillingPdf(fakeStatement, fakeClient, {}, {}, () => {
        // Expect
        expect(pdfSelfBillingInvoice).toHaveBeenCalledTimes(1);
        expect(pdfSelfBillingInvoice.mock.calls[0][0].suppressZeroTaxLine).toBe(undefined);
        done();
      });
    });

    // MOCHA
    it('should create pdf with param customFeesInvoiceTitle set', (done) => {
      // When
      const statementDesignData = { customFeesInvoiceTitle: randomString() };
      statementDesignDataRequest.mockImplementation((contract, cb) => cb(null, statementDesignData));

      // Then
      CreateFiles.createFeesInvoicePdf(fakeStatement, fakeClient, {}, {}, () => {
        // Expect
        expect(pdfFeesInvoice).toHaveBeenCalledTimes(1);
        expect(pdfFeesInvoice.mock.calls[0][0].customFeesInvoiceTitle).toBe(statementDesignData.customFeesInvoiceTitle);
        done();
      });
    });

    it('should create pdf with param customFeesInvoiceTitle set to empty', (done) => {
      // When
      const statementDesignData = { customFeesInvoiceTitle: '' };
      statementDesignDataRequest.mockImplementation((contract, cb) => cb(null, statementDesignData));

      // Then
      CreateFiles.createFeesInvoicePdf(fakeStatement, fakeClient, {}, {}, () => {
        // Expect
        expect(pdfFeesInvoice).toHaveBeenCalledTimes(1);
        expect(pdfFeesInvoice.mock.calls[0][0].customFeesInvoiceTitle).toBe('');
        done();
      });
    });

    it('should create pdf with param customFeesInvoiceTitle not set', (done) => {
      // When
      statementDesignDataRequest.mockImplementation((contract, cb) => cb(null, { }));

      // Then
      CreateFiles.createFeesInvoicePdf(fakeStatement, fakeClient, {}, {}, () => {
        // Expect
        expect(pdfFeesInvoice).toHaveBeenCalledTimes(1);
        expect(pdfFeesInvoice.mock.calls[0][0].customFeesInvoiceTitle).toBe(undefined);
        done();
      });
    });
  });
});
