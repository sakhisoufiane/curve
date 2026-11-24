const { fileManager, fileOpener, testUtils, CurveError } = require('@curveroyaltysystems/platform-shared-utils');
const IngestSalesFile = require('../../salesIngestion/ingestSalesFile');

const publicUrl = 'https://example.com/some-url';

const mockHasProRataAmount = jest.fn();
const mockHasProRataTargetCell = jest.fn();
const mockGetPerUnitRate = jest.fn();
const mockDetectFileType = jest.fn();

jest.mock('./proRata', () => ({
  hasProRataAmount: mockHasProRataAmount,
  hasProRataTargetCell: mockHasProRataTargetCell,
  getPerUnitRate: mockGetPerUnitRate,
}));

jest.mock('./fileTypeDetector', () => ({
  detectFileType: mockDetectFileType,
}));

const prepareData = require('./prepareData');

describe('prepareData', () => {
  beforeEach(() => {
    mockHasProRataAmount.mockReset();
    mockHasProRataTargetCell.mockReset();
    mockGetPerUnitRate.mockReset();
    mockDetectFileType.mockReset();

    mockDetectFileType.mockResolvedValue({ type: 'XLS' });

    jest.spyOn(fileManager, 'publicLink7Days').mockImplementation((key, callback) => callback(null, publicUrl));
    jest.spyOn(fileOpener, 'detectEncoding').mockImplementation((localPath, callback) => callback(null, 'utf8'));
    jest.spyOn(fileOpener, 'detectFileType').mockImplementation((file, callback) => callback(null, null));
  });

  describe('Input Schema', () => {
    it('should pass a cleaningPattern to fields that need cleaned', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        template: [
          {
            type: 'String',
            field: 'originalArtistTitle',
          },
          {
            type: 'String',
            field: 'isrc',
          },
          {
            type: 'String',
            field: 'originalTrackTitle',
          },
          {
            type: 'String',
            field: 'catNo',
          },
          {
            type: 'String',
            field: 'barcode',
          },
          {
            type: 'Number',
            field: 'netAmount',
          },
          {
            type: 'String',
            field: 'iswc',
          },
          {
            type: 'Date: DD/MM/YYYY',
            field: 'saleDate',
          },
          {
            type: 'String',
            field: 'songCode',
          },
          {
            type: 'String',
            field: 'tunecode',
          },
          {
            type: 'String',
            field: 'originalIdentifier',
          },
          {
            type: 'String',
            field: 'contractIdentifier',
          },
        ],
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedSchema = [
        {
          fields: [{ name: 'originalArtistTitle', type: { type: 'String' } }],
        },
        {
          fields: [{ name: 'isrc', cleaningPattern: '[^0-9a-zA-Z(),_\'#"]', type: { type: 'String' } }],
        },
        {
          fields: [{ name: 'originalTrackTitle', type: { type: 'String' } }],
        },
        {
          fields: [{ name: 'catNo', cleaningPattern: '[^0-9a-zA-Z- (),_\'#"]', type: { type: 'String' } }],
        },
        {
          fields: [{ name: 'barcode', cleaningPattern: '[^0-9a-zA-Z- (),_\'#"]', type: { type: 'String' } }],
        },
        {
          fields: [{ name: 'netAmount', type: { type: 'Number' } }],
        },
        {
          fields: [{ name: 'iswc', cleaningPattern: '[^0-9a-zA-Z- (),_\'#"]', type: { type: 'String' } }],
        },
        {
          fields: [{ name: 'saleDate', type: { type: 'Date', dateFormat: 'DD/MM/YYYY' } }],
        },
        {
          fields: [{ name: 'songCode', cleaningPattern: '[^0-9a-zA-Z- (),_\'#"]', type: { type: 'String' } }],
        },
        {
          fields: [{ name: 'tunecode', cleaningPattern: '[^0-9a-zA-Z- (),_\'#"]', type: { type: 'String' } }],
        },
        {
          fields: [{ name: 'originalIdentifier', cleaningPattern: '[^0-9a-zA-Z- (),_\'#"]', type: { type: 'String' } }],
        },
        {
          fields: [{ name: 'contractIdentifier', cleaningPattern: '[^0-9a-zA-Z- (),_\'#"]', type: { type: 'String' } }],
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.inputSchema).toEqual(expectedSchema);
    });

    it('should map types correctly', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        template: [
          {
            type: 'Date',
            field: 'Some Date',
          },
          {
            type: 'Date: YYYY/MM/DD',
            field: 'Some Other Date',
          },
          {
            type: 'Date: MM/DD/YYYY',
            field: 'Some Third Date',
          },
          {
            type: 'Number Comma Decimal',
            field: 'A comma separated number',
          },
        ],
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedSchema = [
        {
          fields: [{ name: 'Some Date', type: { type: 'Date' } }],
        },
        {
          fields: [{ name: 'Some Other Date', type: { type: 'Date', dateFormat: 'YYYY/MM/DD' } }],
        },
        {
          fields: [{ name: 'Some Third Date', type: { type: 'Date', dateFormat: 'MM/DD/YYYY' } }],
        },
        {
          fields: [{ name: 'A comma separated number', type: { type: 'Number Comma Separated' } }],
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.inputSchema).toEqual(expectedSchema);
    });

    it('should map types correctly when calculation and type are present in the field', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        template: [
          {
            type: 'Number',
            field: 'netAmount',
          },
        ],
        calculation: [
          {
            outputField: 'grossAmount',
            calculation: {
              valueType: 'Column',
              value: 1,
            },
          },
        ],
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedSchema = [
        {
          fields: [{ name: 'netAmount', type: { type: 'Number' } }, { name: '__col0', type: { type: 'String' } }],
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.inputSchema).toEqual(expectedSchema);
    });

    it.each([
      { columnType: undefined, fieldName: undefined },
      { columnType: null, fieldName: null },
      { columnType: '', fieldName: '' },
      { columnType: 'Ignore', fieldName: 'Ignore' },
    ])('should handle ignored columns correctly', async ({ columnType, fieldName }) => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        template: [
          {
            type: columnType,
            field: fieldName,
          },
        ],
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedSchema = [
        {
          type: 'Ignore',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.inputSchema).toEqual(expectedSchema);
    });

    it.each([
      { columnType: undefined, fieldName: undefined },
      { columnType: null, fieldName: null },
      { columnType: '', fieldName: '' },
      { columnType: 'Ignore', fieldName: 'Ignore' },
    ])('should handle anonymous columns correctly', async ({ columnType, fieldName }) => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        template: [
          {
            type: columnType,
            field: fieldName,
          },
        ],
        calculation: [
          {
            outputField: 'catNo',
            calculation: {
              valueType: 'Column',
              value: 1,
            },
          },
        ],
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedSchema = [
        {
          fields: [{ name: '__col0', type: { type: 'String' } }],
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.inputSchema).toEqual(expectedSchema);
    });

    it('should handle loading anonymous indexes from calculations, combined with field names correctly', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        template: [
          {
            type: 'String',
            field: 'originalArtistTitle',
          },
          {
            type: 'String',
            field: 'isrc',
          },
          {
            type: 'String',
            field: 'originalTrackTitle',
          },
        ],
        calculation: [
          {
            outputField: 'catNo',
            calculation: {
              valueType: 'Column',
              value: 1,
              calculations: [{
                valueType: 'Column',
                value: 2,
                function: 'Concatenate',
              }],
            },
            conditionType: 'Any',
            conditions: [{
              comparison: 'Equals',
              inputType: 'Column',
              if: 3,
              value: 'Hello',
            }],
          },
        ],
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedSchema = [
        {
          fields: [{ name: 'originalArtistTitle', type: { type: 'String' } }, { name: '__col0', type: { type: 'String' } }],
        },
        {
          fields: [{ name: 'isrc', cleaningPattern: '[^0-9a-zA-Z(),_\'#"]', type: { type: 'String' } }, { name: '__col1', type: { type: 'String' } }],
        },
        {
          fields: [{ name: 'originalTrackTitle', type: { type: 'String' } }, { name: '__col2', type: { type: 'String' } }],
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.inputSchema).toEqual(expectedSchema);
    });

    it.each([undefined, null, ''])('should handle invalid column types correctly', async (columnType) => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        template: [
          {
            type: columnType,
          },
        ],
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedSchema = [
        {
          type: 'Ignore',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.inputSchema).toEqual(expectedSchema);
    });

    it('should handle fixed-width characters correctly', async () => {
      mockDetectFileType.mockResolvedValue({ type: 'Fixed-width', encoding: 'utf8' });

      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        template: [
          {
            type: 'String',
            field: 'Some Field',
            characters: 10,
          },
          {
            type: 'String',
            field: 'Another Field',
            characters: 15,
          },
        ],
        characterSeparators: [10, 15],
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedSchema = [
        {
          fields: [{ name: 'Some Field', type: { type: 'String' } }],
          characters: 10,
        },
        {
          fields: [{ name: 'Another Field', type: { type: 'String' } }],
          characters: 15,
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.inputSchema).toEqual(expectedSchema);
      expect(res.inputConfig.fileType).toEqual({
        type: 'TXT',
        encoding: 'UTF-8',
        indexSeparated: true,
      });
    });
  });

  describe('CSV files', () => {
    it.each(['\t', '\\t'])('should pass any delimiter set by the file type detection', async (delimiter) => {
      mockDetectFileType.mockResolvedValue({ type: 'CSV', delimiter, encoding: 'utf8' });

      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        delimiter,
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedFileType = {
        type: 'CSV',
        encoding: 'UTF-8',
        delimiter: '\t',
      };

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.inputConfig).toBeTruthy();
      expect(res.inputConfig.fileType).toEqual(expectedFileType);
    });

    it.each(['\',\'', 'hello'])('should throw an error for delimiters longer than 1 characters', async (delimiter) => {
      mockDetectFileType.mockResolvedValue({ type: 'CSV', delimiter, encoding: 'latin1' });

      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        delimiter,
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      const res = prepareData(salesFile, taskId, null);
      expect(res).rejects.toThrow(CurveError);
    });
  });

  describe('Catalogue Mappings', () => {
    it('should filter out invalid exceptions', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        templateSource: 'PRS',
        catalogue: {
          trackExceptions: [
            {
              title: 'Hello',
              output: '1',
            },
            {
              isrc: 'ISRC00001',
              output: '2',
            },
            {
              output: '3',
            },
            {
              isrc: 'ISRC00002',
              title: 'World',
            },
            {
              isrc: 'ISRC00003',
            },
            {
              title: 'Foo',
            },
          ],
          releaseExceptions: [
            {
              title: 'Hello',
              output: '1',
            },
            {
              catNo: 'CATNO00001',
              output: '2',
            },
            {
              output: '3',
            },
            {
              catNo: 'CATNO00002',
              title: 'World',
            },
            {
              catNo: 'CATNO00003',
            },
            {
              title: 'Foo',
            },
          ],
          workExceptions: [
            {
              title: 'Hello',
              output: '1',
            },
            {
              identifier: 'WORKID00001',
              output: '2',
            },
            {
              output: '3',
            },
            {
              identifier: 'WORKID00002',
              title: 'World',
            },
            {
              identifier: 'WORKID00003',
            },
            {
              title: 'Foo',
            },
          ],
        },
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res)
        .toBeTruthy();
      expect(res.transformations)
        .toEqual(expectedTransformations);
    });
  });

  describe('Catalogue Overwriting Data', () => {
    it('should pass on data to the transformation executor', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        templateSource: 'PRS',
        catalogue: {
          tracks: {
            ISRC00001: '1',
          },
          releases: {
            CATNO00001: {
              Physical: '2',
            },
          },
          works: {
            WORKID00001: {
              PRS: '3',
            },
          },
          trackExceptions: [{
            isrc: 'ISRC00001',
            title: 'Hello',
            output: '4',
          }],
          releaseExceptions: [{
            catNo: 'CATNO00001',
            title: 'Foo',
            output: '5',
          }],
          workExceptions: [{
            identifier: 'WORKID00001',
            title: 'Alice',
            output: '6',
          }],
        },
        catalogueOverwritingData: {
          externalReleases: {
            url: 'gs://some-bucket/releases.avro',
            schema: {},
          },
          externalTracks: {
            url: 'gs://some-bucket/tracks.avro',
            schema: {},
          },
          externalWorks: {
            url: 'gs://some-bucket/works.avro',
            schema: {},
          },
        },
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        {
          type: 'CurvePublisherCatalogue',
          round: 1,
          society: 'PRS',
          workConfig: {
            WORKID00001: {
              PRS: '3',
            },
          },
          workExceptions: [{
            identifier: 'WORKID00001',
            workNamePrefix: 'Alice',
            workId: '6',
          }],
        },
        {
          type: 'CurveLabelCatalogue',
          trackConfig: {
            ISRC00001: '1',
          },
          trackExceptions: [{
            isrc: 'ISRC00001',
            trackNamePrefix: 'Hello',
            trackId: '4',
          }],
          releaseConfig: {
            CATNO00001: {
              Physical: '2',
            },
          },
          releaseExceptions: [{
            catNo: 'CATNO00001',
            releaseNamePrefix: 'Foo',
            releaseId: '5',
          }],
          round: 1,
        },
        {
          type: 'CurveCatalogueOverwritingDataTransformation',
          round: 1,
          releaseInfo: {
            url: 'gs://some-bucket/releases.avro',
            schema: {},
          },
          tracksInfo: {
            url: 'gs://some-bucket/tracks.avro',
            schema: {},
          },
          worksInfo: {
            url: 'gs://some-bucket/works.avro',
            schema: {},
          },
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.transformations).toEqual(expectedTransformations);
    });

    it('should skip passing missing overwriting data', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.transformations).toEqual(expectedTransformations);
    });
  });

  describe('Calculations', () => {
    it('should pass pre and post calculations in groups', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        calculation: [
          {
            outputField: 'myField',
            calculation: {
              valueType: 'Column',
              value: 1,
              calculations: [{
                valueType: 'Field',
                value: 'someOtherField',
                function: 'Concatenate',
              }],
            },
            conditionType: 'Always',
          },
          {
            outputField: 'Skip Row',
            conditionType: 'All',
            conditions: [{
              comparison: 'Equals',
              inputType: 'Value',
              if: 'Jimmy',
              value: 'Jimmy',
            }],
            calculation: {
              calculations: [],
            },
          },
        ],
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        {
          type: 'CurveTransformationGroup',
          name: 'Run pre-transformation user calculations',
          transformations: [
            {
              type: 'Calculation',
              inputValueFieldName: '__col0',
              outputField: 'myField',
              replaceOutputValue: true,
              equations: [
                {
                  calculationType: 'Concatenation',
                  equationValueFieldName: 'someOtherField',
                },
              ],
            },
            {
              type: 'Discard',
              condition: {
                conditions: [
                  {
                    leftFixedValue: 'Jimmy',
                    rightValue: 'Jimmy',
                    type: 'Equals',
                  },
                ],
                type: 'And',
              },
            },
          ],
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveTransformationGroup',
          name: 'Run post-transformation user calculations',
          transformations: [
            {
              type: 'Calculation',
              inputValueFieldName: '__col0',
              outputField: 'myField',
              replaceOutputValue: true,
              equations: [
                {
                  calculationType: 'Concatenation',
                  equationValueFieldName: 'someOtherField',
                },
              ],
            },
            {
              type: 'Discard',
              condition: {
                conditions: [
                  {
                    leftFixedValue: 'Jimmy',
                    rightValue: 'Jimmy',
                    type: 'Equals',
                  },
                ],
                type: 'And',
              },
            },
          ],
        },
        createCatTypeMapper(2),
        {
          name: 'Create title mapper: Round 2',
          type: 'CurveTitleMapperCreator',
        },
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.transformations).toEqual(expectedTransformations);
    });

    it('should pass pre calculations in a group and skip post, along with round 2', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        calculation: [
          {
            outputField: 'myField',
            calculation: {
              valueType: 'Field',
              value: 'someOtherField',
              calculations: [{
                valueType: 'Column',
                value: 1,
                function: 'Concatenate',
              }],
            },
            conditionType: 'Always',
          },
        ],
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        {
          type: 'CurveTransformationGroup',
          name: 'Run pre-transformation user calculations',
          transformations: [
            {
              type: 'Calculation',
              outputField: 'myField',
              inputValueFieldName: 'someOtherField',
              replaceOutputValue: true,
              equations: [
                {
                  calculationType: 'Concatenation',
                  equationValueFieldName: '__col0',
                },
              ],
            },
          ],
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.transformations).toEqual(expectedTransformations);
    });

    it('should pass post calculations in a group and skip pre', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        calculation: [
          {
            outputField: 'myField',
            calculateAfterMapping: true,
            calculation: {
              valueType: 'Field',
              value: 'someOtherField',
              calculations: [{
                valueType: 'Column',
                value: 1,
                function: 'Concatenate',
              }],
            },
            conditionType: 'Always',
          },
        ],
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveTransformationGroup',
          name: 'Run post-transformation user calculations',
          transformations: [
            {
              type: 'Calculation',
              outputField: 'myField',
              inputValueFieldName: 'someOtherField',
              replaceOutputValue: true,
              equations: [
                {
                  calculationType: 'Concatenation',
                  equationValueFieldName: '__col0',
                },
              ],
            },
          ],
        },
        createCatTypeMapper(2),
        {
          name: 'Create title mapper: Round 2',
          type: 'CurveTitleMapperCreator',
        },
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.transformations).toEqual(expectedTransformations);
    });

    it('should skip passing no calculations', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.transformations).toEqual(expectedTransformations);
    });

    it('should pass cleaning patterns for fields used as lookup keys', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        calculation: [
          {
            outputField: 'isrc',
            calculation: {
              valueType: 'Field',
              value: 'someOtherField',
              calculations: [{
                valueType: 'Column',
                value: 1,
                function: 'Concatenate',
              }],
            },
            conditionType: 'Always',
          },
          {
            outputField: 'catNo',
            calculation: {
              valueType: 'Field',
              value: 'someOtherField',
              calculations: [{
                valueType: 'Column',
                value: 1,
                function: 'Concatenate',
              }],
            },
            conditionType: 'Always',
          },
          {
            outputField: 'barcode',
            calculation: {
              valueType: 'Field',
              value: 'someOtherField',
              calculations: [{
                valueType: 'Column',
                value: 1,
                function: 'Concatenate',
              }],
            },
            conditionType: 'Always',
          },
          {
            outputField: 'originalIdentifier',
            calculation: {
              valueType: 'Field',
              value: 'someOtherField',
              calculations: [{
                valueType: 'Column',
                value: 1,
                function: 'Concatenate',
              }],
            },
            conditionType: 'Always',
          },
          {
            outputField: 'iswc',
            calculation: {
              valueType: 'Field',
              value: 'someOtherField',
              calculations: [{
                valueType: 'Column',
                value: 1,
                function: 'Concatenate',
              }],
            },
            conditionType: 'Always',
          },
          {
            outputField: 'tunecode',
            calculation: {
              valueType: 'Field',
              value: 'someOtherField',
              calculations: [{
                valueType: 'Column',
                value: 1,
                function: 'Concatenate',
              }],
            },
            conditionType: 'Always',
          },
          {
            outputField: 'songCode',
            calculation: {
              valueType: 'Field',
              value: 'someOtherField',
              calculations: [{
                valueType: 'Column',
                value: 1,
                function: 'Concatenate',
              }],
            },
            conditionType: 'Always',
          },
          {
            outputField: 'contractIdentifier',
            calculation: {
              valueType: 'Field',
              value: 'someOtherField',
              calculations: [{
                valueType: 'Column',
                value: 1,
                function: 'Concatenate',
              }],
            },
            conditionType: 'Always',
          },
        ],
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        {
          type: 'CurveTransformationGroup',
          name: 'Run pre-transformation user calculations',
          transformations: [
            {
              type: 'Calculation',
              outputField: 'isrc',
              inputValueFieldName: 'someOtherField',
              replaceOutputValue: true,
              equations: [
                {
                  calculationType: 'Concatenation',
                  equationValueFieldName: '__col0',
                },
              ],
              cleaningPattern: '[^0-9a-zA-Z(),_\'#"]',
            },
            {
              type: 'Calculation',
              outputField: 'catNo',
              inputValueFieldName: 'someOtherField',
              replaceOutputValue: true,
              equations: [
                {
                  calculationType: 'Concatenation',
                  equationValueFieldName: '__col0',
                },
              ],
              cleaningPattern: '[^0-9a-zA-Z- (),_\'#"]',
            },
            {
              type: 'Calculation',
              outputField: 'barcode',
              inputValueFieldName: 'someOtherField',
              replaceOutputValue: true,
              equations: [
                {
                  calculationType: 'Concatenation',
                  equationValueFieldName: '__col0',
                },
              ],
              cleaningPattern: '[^0-9a-zA-Z- (),_\'#"]',
            },
            {
              type: 'Calculation',
              outputField: 'originalIdentifier',
              inputValueFieldName: 'someOtherField',
              replaceOutputValue: true,
              equations: [
                {
                  calculationType: 'Concatenation',
                  equationValueFieldName: '__col0',
                },
              ],
              cleaningPattern: '[^0-9a-zA-Z- (),_\'#"]',
            },
            {
              type: 'Calculation',
              outputField: 'iswc',
              inputValueFieldName: 'someOtherField',
              replaceOutputValue: true,
              equations: [
                {
                  calculationType: 'Concatenation',
                  equationValueFieldName: '__col0',
                },
              ],
              cleaningPattern: '[^0-9a-zA-Z- (),_\'#"]',
            },
            {
              type: 'Calculation',
              outputField: 'tunecode',
              inputValueFieldName: 'someOtherField',
              replaceOutputValue: true,
              equations: [
                {
                  calculationType: 'Concatenation',
                  equationValueFieldName: '__col0',
                },
              ],
              cleaningPattern: '[^0-9a-zA-Z- (),_\'#"]',
            },
            {
              type: 'Calculation',
              outputField: 'songCode',
              inputValueFieldName: 'someOtherField',
              replaceOutputValue: true,
              equations: [
                {
                  calculationType: 'Concatenation',
                  equationValueFieldName: '__col0',
                },
              ],
              cleaningPattern: '[^0-9a-zA-Z- (),_\'#"]',
            },
            {
              type: 'Calculation',
              outputField: 'contractIdentifier',
              inputValueFieldName: 'someOtherField',
              replaceOutputValue: true,
              equations: [
                {
                  calculationType: 'Concatenation',
                  equationValueFieldName: '__col0',
                },
              ],
              cleaningPattern: '[^0-9a-zA-Z- (),_\'#"]',
            },
          ],
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.transformations).toEqual(expectedTransformations);
    });

    it.each([
      {
        calculation: {
          valueType: 'Field',
          value: 'someOtherField',
        },
      },
      {
        outputField: 'myField',
        calculation: {
          value: 'someOtherField',
        },
      },
      {
        outputField: 'myField',
        calculation: {
          valueType: 'Field',
        },
      },
      {
        outputField: 'myField',
        calculation: {
          valueType: 'Column',
        },
      },
    ])('should skip invalid calculations', async (calculation) => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        calculation: [calculation],
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.transformations).toEqual(expectedTransformations);
    });

    it('should return a correct transformation when no Date Format specified in calculation', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        calculation: [
          {
            outputField: 'transactionDate',
            calculation: {
              valueType: 'Field',
              value: 'saleDate',
              calculations: [],
              function: 'Equals',
            },
            conditionType: 'Always',
          },
        ],
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        {
          type: 'CurveTransformationGroup',
          name: 'Run pre-transformation user calculations',
          transformations: [
            {
              replaceOutputValue: true,
              equations: [],
              type: 'Calculation',
              outputField: 'transactionDate',
              inputValueFieldName: 'saleDate',
              resultMapping: {
                type: 'ToDate',
                dateFormat: undefined,
              },
            },
          ],
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveTransformationGroup',
          name: 'Run post-transformation user calculations',
          transformations: [
            {
              equations: [],
              inputValueFieldName: 'saleDate',
              outputField: 'transactionDate',
              replaceOutputValue: true,
              resultMapping: {
                type: 'ToDate',
              },
              type: 'Calculation',
            },
          ],
        },
        createCatTypeMapper(2),
        {
          name: 'Create title mapper: Round 2',
          type: 'CurveTitleMapperCreator',
        },
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.transformations).toEqual(expectedTransformations);
    });

    it.each([
      {
        valueType: 'Column',
        value: 1,
      },
      {
        value: 1,
        function: 'Concatenate',
      },
      {
        valueType: 'Column',
        function: 'Concatenate',
      },
      {
        valueType: 'Field',
        function: 'Concatenate',
      },
    ])('should skip invalid equations', async (equation) => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        calculation: [
          {
            outputField: 'myField',
            calculation: {
              valueType: 'Field',
              value: 'someOtherField',
              calculations: [equation],
            },
          },
        ],
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        {
          name: 'Run pre-transformation user calculations',
          transformations: [
            {
              equations: [],
              inputValueFieldName: 'someOtherField',
              outputField: 'myField',
              replaceOutputValue: true,
              type: 'Calculation',
            },
          ],
          type: 'CurveTransformationGroup',
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.transformations).toEqual(expectedTransformations);
    });

    it.each([
      {
        if: 0,
        comparison: 'Equals',
      },
      {
        if: 0,
        inputType: 'Column',
      },
      {
        comparison: 'Equals',
        inputType: 'Column',
      },
      {
        comparison: 'Equals',
        inputType: 'Field',
      },
    ])('should skip invalid conditions', async (condition) => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        calculation: [
          {
            outputField: 'myField',
            calculation: {
              valueType: 'Field',
              value: 'someOtherField',
              calculations: [{
                valueType: 'Column',
                value: 1,
                function: 'Concatenate',
              }],
            },
            conditionType: 'And',
            conditions: [condition],
          },
        ],
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        {
          name: 'Run pre-transformation user calculations',
          transformations: [
            {
              equations: [
                {
                  calculationType: 'Concatenation',
                  equationValueFieldName: '__col0',
                },
              ],
              inputValueFieldName: 'someOtherField',
              outputField: 'myField',
              replaceOutputValue: true,
              type: 'Calculation',
            },
          ],
          type: 'CurveTransformationGroup',
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.transformations).toEqual(expectedTransformations);
    });

    it.each([
      { inputComparison: 'Is Blank', outputComparison: 'IsBlank' },
      { inputComparison: 'Is Not Blank', outputComparison: 'IsNotBlank' },
    ])('should ignore right values when a condition doesnt support right values', async ({ inputComparison, outputComparison }) => {
      const ingestionData = {
        key: 'my-file.csv',
        calculation: [
          {
            outputField: 'myField',
            calculation: {
              valueType: 'Field',
              value: 'someOtherField',
              calculations: [{
                valueType: 'Column',
                value: 1,
                function: 'Concatenate',
              }],
            },
            conditionType: 'All',
            conditions: [{
              comparison: inputComparison,
              inputType: 'Field',
              if: 'netAmount',
              value: 'Hello',
            }],
          },
        ],
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        {
          name: 'Run pre-transformation user calculations',
          transformations: [
            {
              condition: {
                conditions: [
                  {
                    leftValueFieldName: 'netAmount',
                    type: outputComparison,
                  },
                ],
                type: 'And',
              },
              equations: [
                {
                  calculationType: 'Concatenation',
                  equationValueFieldName: '__col0',
                },
              ],
              inputValueFieldName: 'someOtherField',
              outputField: 'myField',
              replaceOutputValue: true,
              type: 'Calculation',
            },
          ],
          type: 'CurveTransformationGroup',
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.transformations).toEqual(expectedTransformations);
    });

    it('should pass formats for dates', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        calculation: [
          {
            outputField: 'saleDate',
            dateFormat: 'Date: YYYYMM',
            calculation: {
              valueType: 'Field',
              value: 'temp1',
              calculations: [{
                valueType: 'Column',
                value: 1,
                function: 'Concatenate',
              }],
            },
            conditionType: 'Always',
          },
        ],
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        {
          type: 'CurveTransformationGroup',
          name: 'Run pre-transformation user calculations',
          transformations: [
            {
              type: 'Calculation',
              outputField: 'saleDate',
              inputValueFieldName: 'temp1',
              replaceOutputValue: true,
              equations: [
                {
                  calculationType: 'Concatenation',
                  equationValueFieldName: '__col0',
                },
              ],
              resultMapping: {
                type: 'ToDate',
                dateFormat: 'YYYYMM',
              },
            },
          ],
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.transformations).toEqual(expectedTransformations);
    });
  });

  describe('User Mappings', () => {
    it('should pass on data to the transformation executor', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        catalogue: {
          territories: {
            Ingerlund: 'UK',
          },
          configurations: {
            Frisbee: 'Vinyl',
          },
          distributionChannels: {
            'Doon the shop': 'Physical',
          },
          priceCategories: {
            'Well good': 'Budget',
          },
          positiveNegatives: {
            C: 'Positive',
          },
          sources: {
            'That fruit company': 'Apple',
          },
          subSources: {
            'That music software they make': 'iTunes',
          },
          currencies: {
            Bob: 'GBP',
          },
        },
        currencies: {
          currency2: 'USD',
          currency3: 'EUR',
          currency4: 'THB',
        },
        exchangeRates: [{
          from: 'GBP',
          to: 'Home Currency',
          rate: 1,
        }],
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        {
          type: 'CurveUserMappingV2',
          name: 'Map User-defined mappings. Round: 1',
          territories: {
            Ingerlund: 'UK',
          },
          configurations: {
            Frisbee: 'Vinyl',
          },
          distributionChannels: {
            'Doon the shop': 'Physical',
          },
          priceCategories: {
            'Well good': 'Budget',
          },
          positiveNegatives: {
            C: 'Positive',
          },
          sources: {
            'That fruit company': 'Apple',
          },
          subSources: {
            'That music software they make': 'iTunes',
          },
          currencies: {
            Bob: 'GBP',
          },
          targetCurrencies: [
            'Home Currency',
            'USD',
            'EUR',
            'THB',
          ],
          exchangeRates: {
            GBP: {
              'Home Currency': 1,
            },
          },
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.transformations).toEqual(expectedTransformations);
    });

    it('should skip passing missing user transformation data', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.transformations).toEqual(expectedTransformations);
    });
  });

  describe('Copy Fields', () => {
    it('should add a copy fields transformation if some have been defined', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        catalogue: {
          copyFields: [
            { from: 'netAmount', to: 'grossAmount' },
            { from: 'returnNetAmount', to: 'returnGrossAmount' },
          ],
        },
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        {
          type: 'CurveCopyFields',
          name: 'Copy fields: Round 1',
          directives: [
            {
              from: 'netAmount',
              to: 'grossAmount',
            },
            {
              from: 'returnNetAmount',
              to: 'returnGrossAmount',
            },
          ],
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.transformations).toEqual(expectedTransformations);
    });

    it.each([undefined, null, []])('should not run copy fields when no copy fields are present', async (copyFields) => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        catalogue: {
          copyFields,
        },
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.transformations).toEqual(expectedTransformations);
    });
  });

  describe('iTunes Exchange Rates', () => {
    it('should pass on any exchange rates found', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        iTunesExchangeRates: {
          'Latam Caribbean USD': '0.9',
          'Americas USD': '0.8',
          'ROW USD': '0.7',
          EUR: '0.95',
        },
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveITunesExchangeRates',
          name: 'Apply iTunes Exchange Rates',
          exchangeRatesByRegion: {
            'Latam Caribbean USD': '0.9',
            'Americas USD': '0.8',
            'ROW USD': '0.7',
            EUR: '0.95',
          },
        },
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.transformations).toEqual(expectedTransformations);
    });

    it('should filter out any invalid keys or values', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        iTunesExchangeRates: {
          'Americas USD': null,
          'ROW USD': NaN,
          EUR: undefined,
        },
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.transformations).toEqual(expectedTransformations);
    });

    it('should skip passing missing iTunes Exchange Rates', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.transformations).toEqual(expectedTransformations);
    });
  });

  describe('Pro Rata Calculation', () => {
    it('should return transformations when ingestionData has ProRata', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      // Create spies on the ProRata module functions
      mockHasProRataAmount.mockReturnValue(true);
      mockGetPerUnitRate.mockResolvedValue(0.5);

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveTransformationGroup',
          name: 'Use Pro-Rata calculated per-unit rate',
          transformations: [
            {
              type: 'Calculation',
              name: 'Set per-unit rate',
              outputField: 'perUnitRate',
              replaceOutputValue: true,
              inputFixedValue: 0.5,
              equations: [],
            },
            {
              type: 'Calculation',
              name: 'Calculate net amount',
              outputField: 'netAmount',
              replaceOutputValue: true,
              inputValueFieldName: 'units',
              equations: [
                {
                  calculationType: 'Multiplication',
                  equationFixedValue: 0.5,
                },
              ],
            },
            {
              type: 'Calculation',
              name: 'Calculate gross amount',
              outputField: 'grossAmount',
              replaceOutputValue: true,
              inputValueFieldName: 'units',
              equations: [
                {
                  calculationType: 'Multiplication',
                  equationFixedValue: 0.5,
                },
              ],
            },
          ],
        },
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.transformations).toEqual(expectedTransformations);
    });

    it('should return transformations when ingestionData has Pro Rata Target Cell', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      // Create spies on the ProRata module functions
      mockHasProRataTargetCell.mockReturnValue(true);
      mockGetPerUnitRate.mockResolvedValue(0.5);

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveTransformationGroup',
          name: 'Use Pro-Rata calculated per-unit rate',
          transformations: [
            {
              type: 'Calculation',
              name: 'Set per-unit rate',
              outputField: 'perUnitRate',
              replaceOutputValue: true,
              inputFixedValue: 0.5,
              equations: [],
            },
            {
              type: 'Calculation',
              name: 'Calculate net amount',
              outputField: 'netAmount',
              replaceOutputValue: true,
              inputValueFieldName: 'units',
              equations: [
                {
                  calculationType: 'Multiplication',
                  equationFixedValue: 0.5,
                },
              ],
            },
            {
              type: 'Calculation',
              name: 'Calculate gross amount',
              outputField: 'grossAmount',
              replaceOutputValue: true,
              inputValueFieldName: 'units',
              equations: [
                {
                  calculationType: 'Multiplication',
                  equationFixedValue: 0.5,
                },
              ],
            },
          ],
        },
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.transformations).toEqual(expectedTransformations);
    });
  });

  describe('Exchange Rates', () => {
    it('should return exchange rate mappings', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        exchangeRates: [
          {
            from: 'GBP',
            to: 'Home Currency',
            rate: 1,
          },
          {
            from: 'GBP',
            to: 'USD',
            rate: 1.2,
          },
          {
            from: 'USD',
            to: 'Home Currency',
            rate: 0.8,
          },
          {
            from: 'JPY',
            to: 'Home Currency',
            rate: 1.4,
          },
        ],
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        {
          type: 'CurveUserMappingV2',
          name: 'Map User-defined mappings. Round: 1',
          targetCurrencies: ['Home Currency'],
          exchangeRates: {
            GBP: {
              'Home Currency': 1,
              USD: 1.2,
            },
            USD: {
              'Home Currency': 0.8,
            },
            JPY: {
              'Home Currency': 1.4,
            },
          },
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.transformations).toEqual(expectedTransformations);
    });

    it('should filter null or undefined rates', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        exchangeRates: [
          {
            from: 'GBP',
            to: 'Home Currency',
            rate: 1,
          },
          {
            from: '',
            to: 'USD',
            rate: 1.2,
          },
          {
            from: 'USD',
            to: null,
            rate: 0.8,
          },
          {
            from: 'JPY',
            to: 'Home Currency',
            rate: undefined,
          },
        ],
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedTransformations = [
        {
          type: 'CurveReturnsHandler',
        },
        {
          type: 'CurveUserMappingV2',
          name: 'Map User-defined mappings. Round: 1',
          targetCurrencies: ['Home Currency'],
          exchangeRates: {
            GBP: {
              'Home Currency': 1,
            },
          },
        },
        createCatTypeMapper(1),
        {
          name: 'Create title mapper: Round 1',
          type: 'CurveTitleMapperCreator',
        },
        ...createPositiveNegativeTransformations(),
        {
          type: 'CurveExchangeRate',
          name: 'Apply exchange rate',
        },
        {
          type: 'CurveMultiplier',
          name: 'Apply multiplier',
        },
        {
          name: 'Determine status',
          type: 'CurveDataRowValidator',
        },
        {
          name: 'Generate primary key',
          type: 'GenerateUUID',
          outputField: 'id',
        },
      ];

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.transformations).toEqual(expectedTransformations);
    });
  });

  describe('File Encoding', () => {
    it.each([
      { code: 'utf8', expectedOutput: 'UTF-8' },
      { code: 'utf16le', expectedOutput: 'UTF-16' },
      { code: 'latin1', expectedOutput: 'ISO-8859-1' },
      { code: null, expectedOutput: undefined },
      { code: undefined, expectedOutput: undefined },
    ])('Should correctly map fileOpener outputs to Platform inputs', async ({ code, expectedOutput }) => {
      mockDetectFileType.mockResolvedValue({ type: 'CSV', encoding: code, delimiter: ',' });

      // Set up the encoding to be returned
      jest.spyOn(fileOpener, 'detectEncoding').mockImplementation((localPath, callback) => callback(null, code));

      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      // Set up our expected output
      const expectedFileType = {
        type: 'CSV',
        encoding: expectedOutput,
        delimiter: ',',
      };

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.inputConfig).toBeTruthy();
      expect(res.inputConfig.fileType).toEqual(expectedFileType);
    });
  });

  describe('File Type', () => {
    it('should use the response of the file detector to determine the file type', async () => {
      mockDetectFileType.mockResolvedValue({ type: 'CSV', encoding: 'latin1', delimiter: ',' });

      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'file.txt',
      };
      const salesFile = {
        _id: testUtils.randomString(),
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.inputConfig).toBeTruthy();
      expect(res.inputConfig.fileType).toBeTruthy();
      expect(res.inputConfig.fileType.type).toEqual('CSV');
    });
  });

  describe('Target Cells', () => {
    it('should pass target cell details along', async () => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        overwriteFieldTargetCells: [
          {
            field: 'originalChannel',
            type: 'string',
            cell: 'A1',
          },
          {
            field: 'netAmount',
            type: 'number',
            cell: 'B2',
          },
        ],
      };
      const salesFileId = testUtils.randomString();
      const salesFile = {
        _id: salesFileId,
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.inputConfig.defaultValues.length).toEqual(3);
      expect(res.inputConfig.defaultValues[0]).toEqual({ field: 'originalChannel', dataType: 'string', location: 'A1' });
      expect(res.inputConfig.defaultValues[1]).toEqual({ field: 'netAmount', dataType: 'number', location: 'B2' });
      expect(res.inputConfig.defaultValues[2]).toEqual({ field: 'salesFileId', dataType: 'String', value: salesFileId });
    });

    it.each([
      // Missing field
      {
        type: 'string',
        cell: 'A1',
      },
      {
        field: null,
        type: 'string',
        cell: 'A1',
      },
      {
        field: '',
        type: 'string',
        cell: 'A1',
      },

      // Missing type
      {
        field: 'originalChannel',
        cell: 'A1',
      },
      {
        field: 'originalChannel',
        type: null,
        cell: 'A1',
      },
      {
        field: 'originalChannel',
        type: '',
        cell: 'A1',
      },

      // Missing cell
      {
        field: 'originalChannel',
        type: 'string',
      },
      {
        field: 'originalChannel',
        type: 'string',
        cell: null,
      },
      {
        field: 'originalChannel',
        type: 'string',
        cell: '',
      },
    ])('should skip target cells that are missing required fields', async (cell) => {
      // Set up the ingestion data and the sales file we want to generate the configuration against, and stub it in
      const ingestionData = {
        key: 'my-file.csv',
        overwriteFieldTargetCells: [cell],
      };
      const salesFileId = testUtils.randomString();
      const salesFile = {
        _id: salesFileId,
      };

      jest.spyOn(IngestSalesFile, 'ingestionProcessData')
        .mockImplementation((salesFile, platform, useDb, callback) => callback(null, ingestionData));

      const taskId = testUtils.randomString();

      const res = await prepareData(salesFile, taskId, null);
      expect(res).toBeTruthy();
      expect(res.inputConfig.defaultValues.length).toEqual(1);
      expect(res.inputConfig.defaultValues[0]).toEqual({ field: 'salesFileId', dataType: 'String', value: salesFileId });
    });
  });
});

const createCatTypeMapper = (round) => ({
  name: `Determine category type: Round ${round}`,
  type: 'SwitchDefault',
  outputField: 'catType',
  condition: {
    type: 'isBlank',
    leftValueFieldName: 'catType',
  },
  replaceOutputValue: true,
  defaultValue: null,
  mappings: [
    {
      value: 'Work',
      condition: {
        type: 'or',
        conditions: [
          {
            type: 'isNotBlank',
            leftValueFieldName: 'originalIdentifier',
          },
          {
            type: 'isNotBlank',
            leftValueFieldName: 'tunecode',
          },
          {
            type: 'isNotBlank',
            leftValueFieldName: 'iswc',
          },
          {
            type: 'isNotBlank',
            leftValueFieldName: 'songCode',
          },
          {
            type: 'isNotBlank',
            leftValueFieldName: 'originalWorkTitle',
          },
          {
            type: 'isNotBlank',
            leftValueFieldName: 'originalComposers',
          },
        ],
      },
    },
    {
      value: 'Track',
      condition: {
        type: 'isNotBlank',
        leftValueFieldName: 'isrc',
      },
    },
    {
      value: 'Release',
      condition: {
        type: 'or',
        conditions: [
          {
            type: 'isNotBlank',
            leftValueFieldName: 'catNo',
          },
          {
            type: 'isNotBlank',
            leftValueFieldName: 'barcode',
          },
        ],
      },
    },
    {
      value: 'Contract',
      condition: {
        type: 'isNotBlank',
        leftValueFieldName: 'contractIdentifier',
      },
    },
  ],
});

const createPositiveNegativeTransformations = () => [{
  name: 'Perform Positive-Negative inversion',
  type: 'CurvePositiveNegative',
}];
