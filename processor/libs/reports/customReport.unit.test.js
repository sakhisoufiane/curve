const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const { BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const Client = require('../../models/client');
const Payee = require('../../models/payee');
const Report = require('../../models/report');
const SalesFile = require('../../models/salesFile');
const CustomReport = require('./customReport');
const Filter = require('../filter');
const CatalogueOverwritingData = require('../catalogueOverwritingData');
const CollectData = require('../writeCsv/collectData');
const CsvExports = require('../exports/csv');

const exportBucketName = 'my-lovely-bucket';

jest.mock('moment', () => jest.fn(() => ({
  format: jest.fn(() => '20250101'),
})));

jest.mock('./props', () => ({
  getExportBucketName: () => exportBucketName,
}));

describe('customReport', () => {
  describe('getReportClient', () => {
    let clientId;

    beforeEach(() => {
      clientId = randomId();
      jest.spyOn(Client, 'findById').mockResolvedValue(new Client({ _id: clientId }));
    });

    describe('when the report has a payeeId', () => {
      it('should retrieve the client associated with the payee', async () => {
        // Arrange
        const payee = new Payee({ clientId });
        const report = new Report({ payeeId: payee._id.toString() });
        jest.spyOn(Payee, 'findById').mockResolvedValue(payee);
        // Act
        const client = await CustomReport.getReportClient(report);
        // Assert
        expect(client._id.toString()).toEqual(clientId);
      });
    });

    it('should retrieve the client associated with the report', async () => {
      // Arrange
      const report = new Report({ clientId });
      // Act
      const client = await CustomReport.getReportClient(report);
      // Assert
      expect(client._id.toString()).toEqual(clientId);
    });
  });

  describe('getFilter', () => {
    it('should convert report filters to db filters', async () => {
      // Arrange
      const client = new Client();
      const report = new Report({
        clientId: client._id.toString(),
        payeeId: randomId(),
        table: 'Sales Output',
        filters: [{ contractIds: [randomId(), randomId()] }],
      });
      jest.spyOn(Filter, 'filterToDbFilter').mockImplementation((filter, options, cb) => cb(null, filter));
      // Act
      const filter = await CustomReport.getFilter({ report, client });
      // Assert
      expect(filter).toEqual(report.filters);
      expect(Filter.filterToDbFilter).toHaveBeenCalledWith(
        report.filters,
        {
          client,
          payeeId: report.payeeId,
          table: report.table,
        },
        expect.any(Function),
      );
    });
  });

  describe('clearOrphanedSalesLines', () => {
    describe('when the report table is not Sales Input or Income Data', () => {
      it('should not do anything', async () => {
        // Arrange
        jest.spyOn(SalesFile, 'distinct').mockResolvedValue([]);
        // Act
        await CustomReport.clearOrphanedSalesLines({
          logKey: null,
          bigQuery: null,
          clientId: null,
          report: { table: 'Sales Output' },
        });
        // Assert
        expect(SalesFile.distinct).not.toHaveBeenCalled();
      });
    });

    describe('when the report table is Sales Input or Income Data', () => {
      describe('when there are no sales files', () => {
        it('should not do anything', async () => {
          // Arrange
          jest.spyOn(SalesFile, 'distinct').mockResolvedValue([]);
          const bigQuery = { deleteData: jest.fn() };
          const clientId = randomId();
          // Act
          await CustomReport.clearOrphanedSalesLines({
            logKey: null,
            bigQuery,
            clientId,
            report: { table: 'Sales Input' },
          });
          // Assert
          expect(SalesFile.distinct).toHaveBeenCalled();
          expect(bigQuery.deleteData).not.toHaveBeenCalled();
        });
      });

      describe('when sales files exist', () => {
        it('should delete any sales lines not associated with any sales files', async () => {
          // Arrange
          const salesFileIds = [
            (new SalesFile())._id,
            (new SalesFile())._id,
          ];
          jest.spyOn(SalesFile, 'distinct').mockResolvedValue(salesFileIds);
          const bigQuery = {
            inputTable: randomString(),
            deleteData: jest.fn().mockImplementation((table, filter, cb) => cb()),
          };
          const clientId = randomId();
          // Act
          await CustomReport.clearOrphanedSalesLines({
            logKey: null,
            bigQuery,
            clientId,
            report: { table: 'Sales Input' },
          });
          // Assert
          expect(bigQuery.deleteData).toHaveBeenCalledWith(
            bigQuery.inputTable,
            {
              salesFileId: {
                $nin: salesFileIds.map((id) => id.toString()),
              },
            },
            expect.any(Function),
          );
        });
      });
    });
  });

  describe('buildFileKey', () => {
    it('should build an s3 file key for a report', () => {
      // Arrange
      const report = new Report({ name: randomString() });
      // Act
      const fileKey = CustomReport.buildFileKey(report);
      // Assert
      expect(fileKey).toEqual(`reports/${report._id.toString()}/${report.name} 20250101.csv`);
    });
  });

  describe('getReportTable', () => {
    it('should map a report dataset to the correct table (data source)', () => {
      // Arrange
      const client = new Client({
        bigQuerySalesTable: randomString(),
        bigQueryPeriodSales: randomString(),
        bigQueryPeriodCosts: randomString(),
      });
      const tests = [
        ['Sales Input', client.bigQuerySalesTable],
        ['Income Data', client.bigQuerySalesTable],
        ['Sales Output', client.bigQueryPeriodSales],
        ['Sales', client.bigQueryPeriodSales],
        ['Royalties', client.bigQueryPeriodSales],
        ['Costs Input', 'costs'],
        ['Costs Output', client.bigQueryPeriodCosts],
        ['Costs', client.bigQueryPeriodCosts],
        ['Anything Else', 'Anything Else'],
      ];
      // Act
      for (const [inputTable, expectedTable] of tests) {
        // Assert
        const report = new Report({ table: inputTable });
        const outputTable = CustomReport.getDatabaseTable({ report, client });
        expect(outputTable).toEqual(expectedTable);
      }
    });
  });

  describe('getGoogleStoragePath', () => {
    it('should build a Google Storage report file path for a client', async () => {
      // Arrange
      const clientId = randomId();
      // Act
      const gs = await CustomReport.getGoogleStoragePath(clientId);
      // Assert
      const fileName = `${clientId}-20250101-report-`;
      expect(gs).toEqual({
        gsFileName: fileName,
        gsFilePath: `gs://${exportBucketName}/${fileName}*.json`,
      });
    });
  });

  describe('getClientMappingData', () => {
    it('should return mapping data for a client report', async () => {
      // Arrange
      const report = new Report({
        filters: [
          { targetPeriod: '2025Q1' },
          { foreignId: randomId() },
        ],
        fields: [
          { field: 'workIsrcs' },
        ],
      });
      const client = new Client();
      const trackId1 = randomId();
      const trackId2 = randomId();
      const isrc1 = randomString();
      const isrc2 = randomString();
      const catalogueData = {
        tracks: {
          [trackId1]: { catalogueIsrc: randomString() },
          [trackId2]: { catalogueIsrc: randomString() },
        },
        works: [
          {
            workIsrcs: [isrc1, isrc2],
            catalogueTrackIds: [trackId1, trackId2],
          },
        ],
      };
      jest.spyOn(CatalogueOverwritingData, 'get').mockImplementation((client, options, cb) => cb(null, catalogueData));
      // Act
      const mappingData = await CustomReport.getClientMappingData({ report, client });
      // Assert
      expect(mappingData).toEqual({
        hasTargetPeriod: true,
        hasForeignId: true,
        tracks: catalogueData.tracks,
        works: [
          {
            workIsrcs: [
              catalogueData.tracks[trackId1].catalogueIsrc,
              catalogueData.tracks[trackId2].catalogueIsrc,
            ].join(', '),
            catalogueTrackIds: [trackId1, trackId2],
          },
        ],
      });
    });
  });

  describe('createCsvStream', () => {
    beforeEach(() => {
      jest.spyOn(CsvExports, 'writeCsvLine').mockReturnValue();
    });

    describe('when the format is the default', () => {
      it('should create a csv write stream with , as the decimal separator', async () => {
        // Arrange
        const fileKey = `${randomString()}/${randomString()}.csv`;
        const template = [
          { header: 'salesFileId' },
          { header: 'contractId' },
          { header: 'units' },
        ];
        const format = null;
        // Act
        const { csvStream, fileLocation } = CustomReport.createCsvStream({
          fileKey,
          template,
          format,
        });
        // Assert
        const outputLocation = `${process.env.APP_ROOT_DIR}/tmp/${fileKey.split('/').pop()}`;
        expect(csvStream.path).toEqual(outputLocation);
        expect(fileLocation).toEqual(outputLocation);
        expect(CsvExports.writeCsvLine).toHaveBeenCalledWith(
          csvStream,
          template.map((t) => t.header),
          { format, bom: true },
        );
      });
    });

    describe('when the format is EU decimal comma', () => {
      it('should use ; as the decimal separator', () => {
        // Arrange
        const fileKey = `${randomString()}/${randomString()}.csv`;
        const template = [];
        const format = 'EU Decimal Comma';
        // Act
        const { csvStream } = CustomReport.createCsvStream({
          fileKey,
          template,
          format,
        });
        // Assert
        expect(CsvExports.writeCsvLine).toHaveBeenCalledWith(
          csvStream,
          [],
          { format, bom: true },
        );
      });
    });
  });

  describe('splitOutArrayParams', () => {
    it('should split out array parameters in a BigQuery query', () => {
      // Arrange
      const ids = [randomId(), randomId(), randomId()];
      const queryObj = {
        query: `SELECT salesFileId, territory, units FROM \`staging.table\` WHERE salesFileId IN ("${ids[0]}", "${ids[1]}", "${ids[2]}") GROUP BY territory LIMIT 100`,
        params: {},
      };
      const selector = 'salesFileId';
      // Act
      const query = CustomReport.splitOutArrayParams(queryObj, selector);
      // Assert
      // IN parameters should reference a variable after
      expect(query.query).toEqual(
        'SELECT salesFileId, territory, units FROM `staging.table` WHERE salesFileId IN UNNEST(@salesFileId0) GROUP BY territory LIMIT 100',
      );
      // salesFileId0 should include the original ids from the query string
      expect(query.params).toHaveProperty('salesFileId0');
      expect(query.params.salesFileId0).toEqual(ids);
    });
  });

  describe('removeColumnsBeingMappedToCatalogue', () => {
    describe('when no select columns specified', () => {
      it('should do nothing', () => {
        // Arrange
        const columns = { selectCols: [] };
        const columnsCopy = { ...columns };
        // Act
        CustomReport.removeColumnsBeingMappedToCatalogue(columnsCopy);
        // Assert
        expect(columns).toEqual(columnsCopy);
      });
    });

    it('should remove any columns that are mapped to a catalogue field', () => {
      // Arrange
      const columns = { selectCols: [
        { column: 'salesFileId' },
        { column: 'contractName' },
      ] };
      // Act
      CustomReport.removeColumnsBeingMappedToCatalogue(columns);
      // Assert
      expect(columns).toEqual({ selectCols: [{ column: 'salesFileId' }] });
    });
  });

  describe('buildQuery', () => {
    it('should build a BigQuery based on the report configuration', async () => {
      // Arrange
      const bigQuery = new BigQuery({ datasetName: randomString() });
      const template = [
        { type: 'Selector', field: 'salesFileId' },
        { type: 'Selector', field: 'contractId' },
        { type: 'Selector', field: 'territory' },
        { type: 'Selector', field: 'units' },
        { type: 'Calculator', field: 'netAmount' },
      ];
      const filter = {
        salesFileId: [randomId(), randomId(), randomId()],
      };
      const table = randomString();
      jest.spyOn(CollectData, 'getSelectAndSumColumnArray');

      // Act
      const query = await CustomReport.buildQuery({
        bigQuery,
        template,
        filter,
        table,
      });

      // Assert
      expect(CollectData.getSelectAndSumColumnArray.mock.results[0]).toEqual({
        type: 'return',
        value: {
          groupCols: [
            { column: 'salesFileId', displayAs: 'salesFileId', isGroupBy: true, isSelector: false },
          ],
          selectCols: [
            { column: 'salesFileId', displayAs: 'salesFileId', isGroupBy: true, isSelector: true },
            { column: 'contractId', displayAs: 'contractId', isGroupBy: true, isSelector: true },
            { column: 'territory', displayAs: 'territory', isGroupBy: true, isSelector: true },
            { column: 'units', displayAs: 'units', isGroupBy: true, isSelector: true },
          ],
          sumCols: [{ column: 'netAmount', displayAs: 'netAmount' }],
        },
      });
      expect(query.query.replace(/\s+/g, ' ')).toEqual(`
          SELECT salesFileId, contractId, territory, units, SUM(netAmount) AS netAmount, COUNT(*) AS lines 
          FROM \`${bigQuery.datasetName}.${table}\` 
          WHERE salesFileId IN UNNEST(@salesFileId0) 
          GROUP BY salesFileId, contractId, territory, units`
        .replace(/\s+/g, ' '));
      expect(query.params).toEqual({ salesFileId0: filter.salesFileId });
    });

    it('should replace query param values over the threshold with temp table joins (SUP-2952)', async () => {
      // Arrange
      const bigQuery = new BigQuery({ datasetName: randomString() });
      const template = [
        { type: 'Selector', field: 'salesFileId' },
        { type: 'Selector', field: 'contractId' },
        { type: 'Selector', field: 'territory' },
        { type: 'Selector', field: 'units' },
        { type: 'Calculator', field: 'netAmount' },
      ];
      const filter = {
        salesFileId: [randomId(), randomId(), randomId()],
      };
      const table = randomString();
      const limit = 100;

      jest.spyOn(CollectData, 'getSelectAndSumColumnArray');

      const tempTableId = randomId();
      jest.spyOn(bigQuery, 'createTempTable').mockResolvedValueOnce({ id: tempTableId });
      jest.spyOn(bigQuery, 'queryPromisify').mockResolvedValueOnce();

      // Act
      const query = await CustomReport.buildQuery({
        bigQuery,
        template,
        filter,
        table,
        limit,
        maxArrayParamSize: 2,
      });

      // Assert
      expect(query.query.replace(/\s+/g, ' ')).toEqual(`
          SELECT salesFileId, contractId, territory, units, SUM(netAmount) AS netAmount, COUNT(*) AS lines 
          FROM \`${bigQuery.datasetName}.${table}\` 
          WHERE EXISTS (SELECT 1 FROM \`${bigQuery.datasetName}.${tempTableId}\` t WHERE t.salesFileId0 = salesFileId)
          GROUP BY salesFileId, contractId, territory, units`
        .replace(/\s+/g, ' '));
      expect(query.params).toEqual({});
    });
  });
});
