/* eslint-disable no-await-in-loop */
/* eslint-disable no-return-assign */
const { randomString, cleanUp, randomId, randomFloat } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { fileManager, BigQueryTestUtils } = require('@curveroyaltysystems/platform-shared-utils');
const fs = require('fs');

const Report = require('../../models/report');
const Client = require('../../models/client');
const Cost = require('../../models/cost');
const Payee = require('../../models/payee');
const Contract = require('../../models/contract');
const Statement = require('../../models/statement');
const CustomReport = require('./customReport');
const ExportNotification = require('../exportNotification/exportNotification');
const GoogleStorage = require('../../controllers/googleStorage');
const Exports = require('../exports');
const Template = require('./template');
const SalesFile = require('../../models/salesFile');
const Filter = require('../filter');

const bqTestUtils = new BigQueryTestUtils();

jest.mock('../../controllers/googleStorage');
jest.mock('moment', () => jest.fn(() => ({ format: jest.fn(() => '20250101') })));

describe('customReport', () => {
  let client;
  let clientId;
  let report;
  let reportId;
  let email;
  let bigQuery;
  let publicUrl;
  let salesLines;

  beforeEach(async () => {
    const fakeRow = () => ({
      salesFileId: randomId(),
      territory: randomString(),
      units: randomFloat(),
      netAmount: randomFloat(),
    });

    salesLines = [fakeRow(), fakeRow(), fakeRow(), fakeRow()];

    client = new Client({
      name: randomString(),
      createdBigQueryBackups: true,
      createdBigQueryTables: true,
    });
    clientId = client._id.toString();
    await client.save();

    email = randomString();
    publicUrl = randomString();

    await bqTestUtils.init();
    bigQuery = await bqTestUtils.getBigQuery();

    jest.spyOn(Report, 'findById');
    jest.spyOn(fileManager, 'uploadToS3').mockImplementation((key, location, cb) => cb());
    jest.spyOn(fileManager, 'publicLink24Hours').mockImplementation((key, cb) => cb(null, publicUrl));
    jest.spyOn(ExportNotification, 'sendReportExportNotification').mockResolvedValue();
    jest.spyOn(CustomReport, 'createBigQueryClient').mockReturnValue(bigQuery);
    jest.spyOn(CustomReport, 'createReportFromDB');
    jest.spyOn(CustomReport, 'createReportFromBigQuery');

    // Prevent local files from being deleted so we can verify the contents
    jest.spyOn(fs, 'unlinkSync').mockReturnValue();
  });

  afterEach((done) => {
    cleanUp(clientId, done);
  });

  afterAll(async () => {
    await bqTestUtils.stopTestContainer();
  });

  describe('createReport', () => {
    const mockReport = async (table, filters = []) => {
      report = new Report({
        clientId,
        name: randomString(),
        table,
        format: 'US/UK Format',
        filters,
        fields: [
          { field: 'salesFileId', header: 'Sales File ID', type: 'Selector' },
          { field: 'territory', header: 'Territory', type: 'Selector' },
          { field: 'units', header: 'Units', type: 'Selector' },
          { field: 'netAmount', header: 'Net Amount', type: 'Calculator' },
        ],
      });
      reportId = report._id.toString();
      await report.save();

      jest.spyOn(Template, 'getTemplates').mockResolvedValue({
        originalTemplate: report.fields,
        template: report.fields,
      });
    };

    describe('when the table is Sales Input', () => {
      let listFilesMock;
      let downloadFileMock;

      beforeEach(async () => {
        await mockReport('Sales');

        // Mock the GoogleStorage class methods
        listFilesMock = jest.fn();
        downloadFileMock = jest.fn().mockResolvedValue();
        GoogleStorage.mockImplementation(() => ({
          listAllFiles: listFilesMock,
          downloadFile: downloadFileMock,
        }));
      });

      it('should create a report and notify the user', async () => {
        // Arrange
        const fileLocation = `${process.env.APP_ROOT_DIR}/tmp/${report.name} 20250101.csv`;
        const { gsFileName } = await CustomReport.getGoogleStoragePath(clientId);

        // Mock the BigQuery file export process
        jest.spyOn(Exports, 'runExportQuery').mockImplementation(async () => {
          let data = '';
          salesLines.map((line) => data += `${JSON.stringify(line)}\n`);
          fs.writeFileSync(`${process.env.APP_ROOT_DIR}/tmp/${gsFileName}.json`, data);
        });

        // Mock the GoogleStorage class methods as the file is already downloaded with the runExportQuery mock
        listFilesMock.mockResolvedValue([{ name: `${gsFileName}.json` }]);

        // Act
        await CustomReport.createReport({ reportId, email });
        // Assert

        // The correct data source should have been used
        expect(CustomReport.createReportFromDB).not.toHaveBeenCalled();
        expect(CustomReport.createReportFromBigQuery).toHaveBeenCalled();

        // The CSV file should be uploaded to S3
        expect(fileManager.uploadToS3).toHaveBeenCalledWith(
          `reports/${reportId}/${report.name} 20250101.csv`,
          fileLocation,
          expect.any(Function),
        );

        // Notification should be sent to the correct user and include the download URL
        expect(ExportNotification.sendReportExportNotification).toHaveBeenCalledWith({
          reportName: report.name,
          url: publicUrl,
          client: expect.any(Object),
          email,
        });

        // Check the contents of the generated CSV file
        const file = fs.readFileSync(fileLocation, 'utf-8');
        const [columns, ...lines] = file.split('\n');
        expect(lines.length).toEqual(salesLines.length + 1); // 4 rows + 1 empty line
        expect(columns).toMatch('Sales File ID,Territory,Units,Net Amount');
        for (let i = 0; i < salesLines.length; i += 1) {
          const actualLine = lines[i];
          const expectedLine = salesLines[i];
          expect(actualLine).toMatch([
            expectedLine.salesFileId,
            expectedLine.territory,
            expectedLine.units,
            expectedLine.netAmount,
          ].join(','));
        }
      });

      it('should handle multiple export files from BigQuery', async () => {
        // Arrange
        const fileLocation = `${process.env.APP_ROOT_DIR}/tmp/${report.name} 20250101.csv`;
        const { gsFileName } = await CustomReport.getGoogleStoragePath(clientId);

        // Mock the BigQuery file export process
        jest.spyOn(Exports, 'runExportQuery').mockImplementation(async () => {
          // Mock export being split into two files
          let file1 = '';
          salesLines.slice(0, 2).map((line) => file1 += `${JSON.stringify(line)}\n`);
          fs.writeFileSync(`${process.env.APP_ROOT_DIR}/tmp/${gsFileName}01.json`, file1);

          let file2 = '';
          salesLines.slice(2).map((line) => file2 += `${JSON.stringify(line)}\n`);
          fs.writeFileSync(`${process.env.APP_ROOT_DIR}/tmp/${gsFileName}02.json`, file2);
        });

        // Mock the GoogleStorage class methods as the files are already downloaded with the runExportQuery mock
        listFilesMock.mockResolvedValue([
          { name: `${gsFileName}01.json` },
          { name: `${gsFileName}02.json` },
        ]);

        // Act
        await CustomReport.createReport({ reportId, email });

        // Assert
        // The correct data source should have been used
        expect(CustomReport.createReportFromDB).not.toHaveBeenCalled();
        expect(CustomReport.createReportFromBigQuery).toHaveBeenCalled();

        // The CSV file should be uploaded to S3
        expect(fileManager.uploadToS3).toHaveBeenCalledWith(
          `reports/${reportId}/${report.name} 20250101.csv`,
          fileLocation,
          expect.any(Function),
        );

        // Notification should be sent to the correct user and include the download URL
        expect(ExportNotification.sendReportExportNotification).toHaveBeenCalledWith({
          reportName: report.name,
          url: publicUrl,
          client: expect.any(Object),
          email,
        });

        // Check the contents of the generated CSV file
        const file = fs.readFileSync(fileLocation, 'utf-8');
        const [columns, ...lines] = file.split('\n');
        expect(lines.length).toEqual(salesLines.length + 1); // 4 rows + 1 empty line
        expect(columns).toMatch('Sales File ID,Territory,Units,Net Amount');
        for (let i = 0; i < salesLines.length; i += 1) {
          const actualLine = lines[i];
          const expectedLine = salesLines[i];
          expect(actualLine).toMatch([
            expectedLine.salesFileId,
            expectedLine.territory,
            expectedLine.units,
            expectedLine.netAmount,
          ].join(','));
        }
      });
    });

    describe('when Target Period and Foreign ID are included', () => {
      let salesFiles;

      beforeEach(async () => {
        report = new Report({
          clientId,
          name: randomString(),
          table: 'Sales',
          format: 'US/UK Format',
          filters: [],
          fields: [
            { field: 'salesFileId', header: 'Sales File ID', type: 'Selector' },
            { field: 'territory', header: 'Territory', type: 'Selector' },
            { field: 'units', header: 'Units', type: 'Selector' },
            { field: 'netAmount', header: 'Net Amount', type: 'Calculator' },
            { field: 'targetPeriod', header: 'Target Period', type: 'Selector' },
            { field: 'foreignId', header: 'Foreign ID', type: 'Selector' },
          ],
        });
        reportId = report._id.toString();
        await report.save();

        salesFiles = [];
        for (const row of salesLines) {
          const salesFile = new SalesFile({
            clientId,
            _id: row.salesFileId,
            targetPeriod: randomString(),
            foreignId: randomString(),
          });
          salesFiles.push(salesFile);
          await salesFile.save();
        }

        jest.spyOn(Template, 'getTemplates').mockResolvedValue({
          originalTemplate: report.fields,
          template: report.fields.filter((t) => t.field !== 'targetPeriod' && t.field !== 'foreignId'),
        });
      });

      it('should query these fields from the DB instead of BigQuery', async () => {
        // Arrange
        const fileLocation = `${process.env.APP_ROOT_DIR}/tmp/${report.name} 20250101.csv`;
        const { gsFileName } = await CustomReport.getGoogleStoragePath(clientId);
        // Mock the BigQuery file export process
        jest.spyOn(Exports, 'runExportQuery').mockImplementation(async () => {
          let data = '';
          salesLines.map((line) => data += `${JSON.stringify(line)}\n`);
          fs.writeFileSync(`${process.env.APP_ROOT_DIR}/tmp/${gsFileName}.json`, data);
        });
        // Mock the GoogleStorage class methods as the file is already downloaded with the runExportQuery mock
        const listFilesMock = jest.fn().mockResolvedValue([{ name: `${gsFileName}.json` }]);
        const downloadFileMock = jest.fn().mockResolvedValue();
        GoogleStorage.mockImplementation(() => ({
          listAllFiles: listFilesMock,
          downloadFile: downloadFileMock,
        }));

        // Act
        await CustomReport.createReport({ reportId, email });
        // Assert

        // Check the contents of the generated CSV file
        const file = fs.readFileSync(fileLocation, 'utf-8');
        const [columns, ...lines] = file.split('\n');
        expect(columns).toMatch('Sales File ID,Territory,Units,Net Amount,Target Period,Foreign ID');
        for (let i = 0; i < salesLines.length; i += 1) {
          const actualLine = lines[i];
          const expectedLine = salesLines[i];
          const targetPeriodSalesFile = salesFiles.find((sf) => sf._id.toString() === expectedLine.salesFileId);
          expect(targetPeriodSalesFile).toBeDefined();
          expect(actualLine).toMatch([
            expectedLine.salesFileId,
            expectedLine.territory,
            expectedLine.units,
            expectedLine.netAmount,
            // Target period should be included AND retrieved from the Sales Files in the DB
            targetPeriodSalesFile.targetPeriod,
            // Foreign ID should be included AND retrieved from the Sales Files in the DB
            targetPeriodSalesFile.foreignId,
          ].join(','));
        }
      });
    });

    describe('when the table is Costs Input', () => {
      let costRows;

      const mockCostsInputReport = async (filters = []) => {
        report = new Report({
          clientId,
          name: randomString(),
          table: 'Costs Input',
          format: 'US/UK Format',
          filters,
          fields: [
            { field: 'name', header: 'Name', type: 'Selector' },
            { field: 'amount', header: 'Amount', type: 'Selector' },
            { field: 'territory', header: 'Territory', type: 'Selector' },
            { field: 'trackIds', header: 'Track IDs', type: 'Selector' },
          ],
        });
        reportId = report._id.toString();
        await report.save();

        const fakeCostRow = (targetPeriod) => new Cost({
          clientId,
          name: randomString(),
          amount: randomFloat(),
          territory: randomString(),
          trackIds: [randomId(), randomId(), randomId()],
          type: randomString(),
          targetPeriod,
        });

        costRows = [
          fakeCostRow('2024H1'),
          fakeCostRow('2024H1'),
          fakeCostRow('2024H2'),
          fakeCostRow('2024H2'),
        ];
        await Cost.bulkSave(costRows);

        jest.spyOn(Template, 'getTemplates').mockResolvedValue({
          originalTemplate: report.fields,
          template: report.fields,
        });
      };

      describe('when no filters are applied', () => {
        beforeEach(async () => {
          await mockCostsInputReport();
        });

        it('should use the db (Mongo) as the data source', async () => {
        // Arrange
          const fileLocation = `${process.env.APP_ROOT_DIR}/tmp/${report.name} 20250101.csv`;
          // Act
          await CustomReport.createReport({ reportId, email });
          // Assert

          // The correct data source should have been used
          expect(CustomReport.createReportFromDB).toHaveBeenCalled();
          expect(CustomReport.createReportFromBigQuery).not.toHaveBeenCalled();

          // The CSV file should be uploaded to S3
          expect(fileManager.uploadToS3).toHaveBeenCalledWith(
            `reports/${reportId}/${report.name} 20250101.csv`,
            fileLocation,
            expect.any(Function),
          );

          // Notification should be sent to the correct user and include the download URL
          expect(ExportNotification.sendReportExportNotification).toHaveBeenCalledWith({
            reportName: report.name,
            url: publicUrl,
            client: expect.any(Object),
            email,
          });

          // Check the contents of the generated CSV file
          const file = fs.readFileSync(fileLocation, 'utf-8');
          const [columns, ...lines] = file.split('\n');
          expect(lines.length).toEqual(costRows.length + 1); // 4 rows + 1 empty line
          expect(columns).toMatch('Name,Amount,Territory,Track IDs');
          for (const cost of costRows) {
            const expectedLine = [cost.name, cost.amount, cost.territory, `"${cost.trackIds.join(',')}"`].join(',');
            const actualLine = lines.find((l) => l === expectedLine);
            expect(actualLine).toEqual(expectedLine);
          }
        });
      });

      describe('when a targetPeriod filter is applied', () => {
        beforeEach(async () => {
          await mockCostsInputReport([
            {
              targetPeriod: '2024H2',
            },
          ]);
        });

        it('should only return costs within that period', async () => {
          // Arrange
          const fileLocation = `${process.env.APP_ROOT_DIR}/tmp/${report.name} 20250101.csv`;
          // Act
          await CustomReport.createReport({ reportId, email });
          // Assert

          // The correct data source should have been used
          expect(CustomReport.createReportFromDB).toHaveBeenCalled();
          expect(CustomReport.createReportFromBigQuery).not.toHaveBeenCalled();

          // The CSV file should be uploaded to S3
          expect(fileManager.uploadToS3).toHaveBeenCalledWith(
            `reports/${reportId}/${report.name} 20250101.csv`,
            fileLocation,
            expect.any(Function),
          );

          // Notification should be sent to the correct user and include the download URL
          expect(ExportNotification.sendReportExportNotification).toHaveBeenCalledWith({
            reportName: report.name,
            url: publicUrl,
            client: expect.any(Object),
            email,
          });

          // Check the contents of the generated CSV file
          const file = fs.readFileSync(fileLocation, 'utf-8');
          const [columns, ...lines] = file.split('\n');
          expect(lines.length).toEqual(2 + 1); // 2 rows + 1 empty line
          expect(columns).toMatch('Name,Amount,Territory,Track IDs');
          for (const cost of costRows.slice(-2)) {
            const expectedLine = [cost.name, cost.amount, cost.territory, `"${cost.trackIds.join(',')}"`].join(',');
            const actualLine = lines.find((l) => l === expectedLine);
            expect(actualLine).toEqual(expectedLine);
          }
        });
      });
    });

    describe('when the filter is null - security fix', () => {
      describe('when filter returns null (no matching catalogue items) - security fix', () => {
        beforeEach(async () => {
        // Create a report with a releaseLabel filter that won't match any releases
          report = new Report({
            clientId,
            name: randomString(),
            table: 'Sales Output',
            format: 'US/UK Format',
            filters: [{ releaseLabel: 'nonexistent-label-that-matches-nothing' }],
            fields: [
              { field: 'salesFileId', header: 'Sales File ID', type: 'Selector' },
              { field: 'territory', header: 'Territory', type: 'Selector' },
            ],
          });
          reportId = report._id.toString();
          await report.save();

          jest.spyOn(Template, 'getTemplates').mockResolvedValue({
            originalTemplate: report.fields,
            template: report.fields,
          });
        });

        it('should create an empty CSV file without querying BigQuery', async () => {
        // Arrange
          const fileLocation = `${process.env.APP_ROOT_DIR}/tmp/${report.name} 20250101.csv`;

          // Act
          await CustomReport.createReport({ reportId, email });

          // Assert - BigQuery should NOT be called (security fix)
          expect(CustomReport.createReportFromBigQuery).not.toHaveBeenCalled();
          expect(CustomReport.createReportFromDB).not.toHaveBeenCalled();

          // Assert - File should still be uploaded (empty CSV with headers)
          expect(fileManager.uploadToS3).toHaveBeenCalledWith(
            `reports/${reportId}/${report.name} 20250101.csv`,
            fileLocation,
            expect.any(Function),
          );

          // Assert - User should still receive notification
          expect(ExportNotification.sendReportExportNotification).toHaveBeenCalledWith({
            reportName: report.name,
            url: publicUrl,
            client: expect.any(Object),
            email,
          });

          // Assert - CSV file should only contain headers (no data rows)
          const file = fs.readFileSync(fileLocation, 'utf-8');
          const lines = file.split('\n').filter((line) => line.trim() !== '');
          expect(lines.length).toEqual(1); // Only headers, no data
          expect(lines[0]).toMatch('Sales File ID,Territory');
        });
      });

      describe('when filter returns a valid filter (has matching data)', () => {
        let listFilesMock;
        let downloadFileMock;

        beforeEach(async () => {
        // Create a report with no filters - should return all data for the client
          report = new Report({
            clientId,
            name: randomString(),
            table: 'Sales',
            format: 'US/UK Format',
            filters: [],
            fields: [
              { field: 'salesFileId', header: 'Sales File ID', type: 'Selector' },
              { field: 'territory', header: 'Territory', type: 'Selector' },
            ],
          });
          // Arrange
          reportId = report._id.toString();
          await report.save();

          jest.spyOn(Template, 'getTemplates').mockResolvedValue({
            originalTemplate: report.fields,
            template: report.fields,
          });

          listFilesMock = jest.fn().mockResolvedValue([]);
          downloadFileMock = jest.fn().mockResolvedValue();
          GoogleStorage.mockImplementation(() => ({
            listAllFiles: listFilesMock,
            downloadFile: downloadFileMock,
          }));

          jest.spyOn(Exports, 'runExportQuery').mockResolvedValue();
        });

        it('should proceed with BigQuery query', async () => {
        // Act
          await CustomReport.createReport({ reportId, email });

          // Assert - BigQuery SHOULD be called (valid filter)
          expect(CustomReport.createReportFromBigQuery).toHaveBeenCalled();
        });
      });
    });

    describe('payee reports - security fix', () => {
      let payee;
      let payeeId;
      let contract;
      let statement;

      beforeEach(async () => {
        payee = new Payee({
          clientId,
          name: randomString(),
          email: `${randomString()}@test.com`,
        });
        payeeId = payee._id.toString();
        await payee.save();

        contract = new Contract({
          clientId,
          name: randomString(),
          payees: [{ payeeId, share: 100 }],
        });
        await contract.save();

        statement = new Statement({
          clientId,
          contractId: contract._id.toString(),
          periodId: randomId(),
          status: 'Published',
        });
        await statement.save();
      });

      describe('when payee report has a catalogue filter that matches nothing', () => {
        beforeEach(async () => {
          // Arrange
          report = new Report({
            clientId,
            payeeId,
            name: randomString(),
            table: 'Sales Output',
            format: 'US/UK Format',
            filters: [{ releaseLabel: 'nonexistent-label' }],
            fields: [
              { field: 'salesFileId', header: 'Sales File ID', type: 'Selector' },
              { field: 'territory', header: 'Territory', type: 'Selector' },
            ],
          });
          reportId = report._id.toString();
          await report.save();

          jest.spyOn(Template, 'getTemplates').mockResolvedValue({
            originalTemplate: report.fields,
            template: report.fields,
          });
        });

        it('should pass payeeId to the filter module', async () => {
          // Arrange
          const filterSpy = jest.spyOn(Filter, 'filterToDbFilter');

          // Act
          await CustomReport.createReport({ reportId, email });

          // Assert - payeeId MUST be passed to ensure payee restrictions
          expect(filterSpy).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ payeeId }),
            expect.any(Function),
          );
        });

        it('should create an empty CSV without querying BigQuery (filter returns null)', async () => {
          // Act
          await CustomReport.createReport({ reportId, email });

          // Assert - BigQuery should NOT be called
          expect(CustomReport.createReportFromBigQuery).not.toHaveBeenCalled();

          // Assert - File should be uploaded (empty CSV)
          expect(fileManager.uploadToS3).toHaveBeenCalled();

          // Assert - User should receive notification
          expect(ExportNotification.sendReportExportNotification).toHaveBeenCalled();
        });
      });

      describe('when payee report has no filters', () => {
        let listFilesMock;
        let downloadFileMock;

        beforeEach(async () => {
          // Arrange
          report = new Report({
            clientId,
            payeeId,
            name: randomString(),
            table: 'Sales Output',
            format: 'US/UK Format',
            filters: [],
            fields: [
              { field: 'salesFileId', header: 'Sales File ID', type: 'Selector' },
              { field: 'contractId', header: 'Contract ID', type: 'Selector' },
            ],
          });
          reportId = report._id.toString();
          await report.save();

          jest.spyOn(Template, 'getTemplates').mockResolvedValue({
            originalTemplate: report.fields,
            template: report.fields,
          });

          listFilesMock = jest.fn().mockResolvedValue([]);
          downloadFileMock = jest.fn().mockResolvedValue();
          GoogleStorage.mockImplementation(() => ({
            listAllFiles: listFilesMock,
            downloadFile: downloadFileMock,
          }));

          jest.spyOn(Exports, 'runExportQuery').mockResolvedValue();
        });

        it('should pass payeeId to filter and include payee contract restrictions', async () => {
          const filterSpy = jest.spyOn(Filter, 'filterToDbFilter');

          // Act
          await CustomReport.createReport({ reportId, email });

          // Assert - payeeId should be passed
          expect(filterSpy).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ payeeId }),
            expect.any(Function),
          );

          // Assert - BigQuery should be called (valid filter with payee restrictions)
          expect(CustomReport.createReportFromBigQuery).toHaveBeenCalled();

          // Assert - The filter passed to BigQuery should include contract restrictions
          const bigQueryCall = CustomReport.createReportFromBigQuery.mock.calls[0][0];
          expect(bigQueryCall.filter).toBeDefined();
          expect(bigQueryCall.filter).not.toBeNull();
          // Filter should include the payee's contract
          expect(JSON.stringify(bigQueryCall.filter)).toContain(contract._id.toString());
        });
      });
    });

    describe('when the table is Costs Output', () => {
      let costRows;

      const mockCostsOutputReport = async (filters = []) => {
        report = new Report({
          clientId,
          name: randomString(),
          table: 'Costs Output',
          format: 'US/UK Format',
          filters,
          fields: [
            { field: 'name', header: 'Name', type: 'Selector' },
            { field: 'amount', header: 'Amount', type: 'Selector' },
            { field: 'territory', header: 'Territory', type: 'Selector' },
            { field: 'trackIds', header: 'Track IDs', type: 'Selector' },
          ],
        });
        reportId = report._id.toString();
        await report.save();

        const fakeCostRow = (targetPeriod) => new Cost({
          clientId,
          name: randomString(),
          amount: randomFloat(),
          territory: randomString(),
          trackIds: [randomId(), randomId(), randomId()],
          type: randomString(),
          targetPeriod,
        });

        costRows = [
          fakeCostRow('2024H1'),
          fakeCostRow('2024H1'),
          fakeCostRow('2024H2'),
          fakeCostRow('2024H2'),
        ];
        await Cost.bulkSave(costRows);

        jest.spyOn(Template, 'getTemplates').mockResolvedValue({
          originalTemplate: report.fields,
          template: report.fields,
        });
      };

      describe('no filters are applied', () => {
        beforeEach(async () => {
          await mockCostsOutputReport();
        });

        it('should create a report and notify the user', async () => {
        // Arrange
          const fileLocation = `${process.env.APP_ROOT_DIR}/tmp/${report.name} 20250101.csv`;
          const { gsFileName } = await CustomReport.getGoogleStoragePath(clientId);
          // Mock the BigQuery file export process
          jest.spyOn(Exports, 'runExportQuery').mockImplementation(async () => {
            let data = '';
            costRows.map((line) => data += `${JSON.stringify(line)}\n`);
            fs.writeFileSync(`${process.env.APP_ROOT_DIR}/tmp/${gsFileName}.json`, data);
          });
          // Mock the GoogleStorage class methods as the file is already downloaded with the runExportQuery mock
          const listFilesMock = jest.fn().mockResolvedValue([{ name: `${gsFileName}.json` }]);
          const downloadFileMock = jest.fn().mockResolvedValue();
          GoogleStorage.mockImplementation(() => ({
            listAllFiles: listFilesMock,
            downloadFile: downloadFileMock,
          }));

          // Act
          await CustomReport.createReport({ reportId, email });
          // Assert

          // The correct data source should have been used
          expect(CustomReport.createReportFromDB).not.toHaveBeenCalled();
          expect(CustomReport.createReportFromBigQuery).toHaveBeenCalled();

          // The CSV file should be uploaded to S3
          expect(fileManager.uploadToS3).toHaveBeenCalledWith(
            `reports/${reportId}/${report.name} 20250101.csv`,
            fileLocation,
            expect.any(Function),
          );

          // Notification should be sent to the correct user and include the download URL
          expect(ExportNotification.sendReportExportNotification).toHaveBeenCalledWith({
            reportName: report.name,
            url: publicUrl,
            client: expect.any(Object),
            email,
          });

          // Check the contents of the generated CSV file
          const file = fs.readFileSync(fileLocation, 'utf-8');
          const [columns, ...lines] = file.split('\n');
          expect(lines.length).toEqual(4 + 1); // 4 rows + 1 empty line
          expect(columns).toMatch('Name,Amount,Territory,Track IDs');
          for (const cost of costRows) {
            const expectedLine = [cost.name, cost.amount, cost.territory, `"${cost.trackIds.join(',')}"`].join(',');
            const actualLine = lines.find((l) => l === expectedLine);
            expect(actualLine).toEqual(expectedLine);
          }
        });
      });

      describe('when a target period filter is applied', () => {
        beforeEach(async () => {
          await mockCostsOutputReport([{ targetPeriod: '2024H2' }]);
        });

        it('should only return costs within that period', async () => {
          // Arrange
          const fileLocation = `${process.env.APP_ROOT_DIR}/tmp/${report.name} 20250101.csv`;
          const { gsFileName } = await CustomReport.getGoogleStoragePath(clientId);
          // Mock the BigQuery file export process
          jest.spyOn(Exports, 'runExportQuery').mockImplementation(async () => {
            let data = '';
            costRows
              .filter((c) => c.targetPeriod === '2024H2')
              .map((line) => data += `${JSON.stringify(line)}\n`);
            fs.writeFileSync(`${process.env.APP_ROOT_DIR}/tmp/${gsFileName}.json`, data);
          });
          // Mock the GoogleStorage class methods as the file is already downloaded with the runExportQuery mock
          const listFilesMock = jest.fn().mockResolvedValue([{ name: `${gsFileName}.json` }]);
          const downloadFileMock = jest.fn().mockResolvedValue();
          GoogleStorage.mockImplementation(() => ({
            listAllFiles: listFilesMock,
            downloadFile: downloadFileMock,
          }));

          // Act
          await CustomReport.createReport({ reportId, email });
          // Assert

          // The correct data source should have been used
          expect(CustomReport.createReportFromDB).not.toHaveBeenCalled();
          expect(CustomReport.createReportFromBigQuery).toHaveBeenCalled();

          // Query should include a Cost ID filter
          const { query } = Exports.runExportQuery.mock.calls[0][0].query;
          const id1 = costRows[2]._id.toString();
          const id2 = costRows[3]._id.toString();
          const expectedFilter = `WHERE ((costId IN ("${id1}", "${id2}")))`;
          expect(query).toContain(expectedFilter);

          // The CSV file should be uploaded to S3
          expect(fileManager.uploadToS3).toHaveBeenCalledWith(
            `reports/${reportId}/${report.name} 20250101.csv`,
            fileLocation,
            expect.any(Function),
          );

          // Notification should be sent to the correct user and include the download URL
          expect(ExportNotification.sendReportExportNotification).toHaveBeenCalledWith({
            reportName: report.name,
            url: publicUrl,
            client: expect.any(Object),
            email,
          });

          // Check the contents of the generated CSV file
          const file = fs.readFileSync(fileLocation, 'utf-8');
          const [columns, ...lines] = file.split('\n');
          expect(lines.length).toEqual(2 + 1); // 2 rows + 1 empty line
          expect(columns).toMatch('Name,Amount,Territory,Track IDs');
          for (const cost of costRows.slice(-2)) {
            const expectedLine = [cost.name, cost.amount, cost.territory, `"${cost.trackIds.join(',')}"`].join(',');
            const actualLine = lines.find((l) => l === expectedLine);
            expect(actualLine).toEqual(expectedLine);
          }
        });
      });
    });
  });
});
