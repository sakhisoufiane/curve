const moment = require('moment');
const { randomId, randomString, randomInt, randomFloat, randomDate } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const CollectData = require('./collectData');

describe('CollectData', () => {
  let template;

  beforeEach(async () => {
    template = [
      { field: 'contractName', header: 'Contract Name', type: 'Selector' },
      { field: 'saleDate', format: 'Date', header: 'Sale Date', type: 'Selector' },
      { field: 'units', header: 'Units', type: 'Calculator' },
      { field: 'grossAmount', header: 'Gross Amount in Currency', type: 'Calculator' },
    ];
  });

  it('should export all functions', () => {
    // Assert
    expect(CollectData.getData).toBeDefined();
    expect(CollectData.getDataBatch).toBeDefined();
    expect(CollectData.getJoinedSalesData).toBeDefined();
    expect(CollectData.getTotals).toBeDefined();
    expect(CollectData.mapData).toBeDefined();
    expect(CollectData.lineToTemplate).toBeDefined();
    expect(CollectData.flattenLine).toBeDefined();
    expect(CollectData.removeZeroValues).toBeDefined();
    expect(CollectData.getSelectAndSumColumnArray).toBeDefined();
  });

  describe('getSelectAndSumColumnArray', () => {
    it('should return an array of Select, Sum and GroupBy columns', () => {
      // Arrange
      const expectedQuery = {
        selectCols: [
          { column: 'contractName', displayAs: 'contractName', isSelector: true, isGroupBy: true },
          { column: 'saleDate', displayAs: 'saleDate', isSelector: true, isGroupBy: true },
        ],
        sumCols: [
          { column: 'units', displayAs: 'units' },
          { column: 'grossAmount', displayAs: 'grossAmount' },
        ],
        groupCols: [{ column: 'releaseId', displayAs: 'releaseId', isSelector: false, isGroupBy: true }],
      };

      // Act
      const query = CollectData.getSelectAndSumColumnArray(template, { releaseId: randomId(), releaseDate: randomString() });

      // Assert
      expect(query).toEqual(expectedQuery);
    });
  });

  describe('removeZeroValues', () => {
    it('should remove lines where calculationOutput == 0', () => {
      // Arrange
      const data = [
        { calculationOutput: 0, releaseId: randomString() },
        { calculationOutput: randomInt(), releaseId: randomString() },
        { calculationOutput: randomInt(), releaseId: randomString() },

      ];
      const expectedFilteredData = [data[1], data[2]];

      // Act
      const filteredData = CollectData.removeZeroValues(data);

      // Assert
      expect(filteredData).toEqual(expectedFilteredData);
    });
  });

  describe('lineToTemplate', () => {
    it('should map the line to the CSV template', () => {
      // Arrange
      const line = {
        contractName: randomString(),
        saleDate: { value: randomDate() },
        units: randomFloat(),
      };
      const expectedMappedLine = [line.contractName, moment(line.saleDate.value).format('YYYY-MM-DD'), line.units, undefined];

      // Act
      const mappedLine = CollectData.lineToTemplate(line, template);

      // Assert
      expect(mappedLine).toEqual(expectedMappedLine);
    });
  });

  describe('mapData', () => {
    it('should map the lines to the CSV template', () => {
      // Arrange
      const data = [
        { contractName: randomString(), saleDate: { value: randomDate() }, units: randomFloat() },
        { contractName: randomString(), saleDate: { value: randomDate() }, units: randomFloat(), grossAmount: randomFloat() },
        { contractName: randomString(), units: randomFloat(), grossAmount: randomFloat() },
      ];
      const expectedMappedData = [
        [data[0].contractName, moment(data[0].saleDate.value).format('YYYY-MM-DD'), data[0].units, undefined],
        [data[1].contractName, moment(data[1].saleDate.value).format('YYYY-MM-DD'), data[1].units, data[1].grossAmount],
        [data[2].contractName, undefined, data[2].units, data[2].grossAmount],
      ];

      // Act
      const mappedData = CollectData.mapData(data, template);

      // Assert
      expect(mappedData).toEqual(expectedMappedData);
    });

    it('should return an empty array when no data is passed', () => {
      // Arrange
      const data = null;
      const expectedMappedData = [];

      // Act
      const mappedData = CollectData.mapData(data, template);

      // Assert
      expect(mappedData).toEqual(expectedMappedData);
    });
  });

  describe('getTotals', () => {
    let data;
    let bigQuery;
    let getAggregateStub;
    let filter;
    let table;
    let sort;
    let addDataSpy;
    let writeCsv;

    beforeEach(() => {
      data = [
        { contractName: randomString(), saleDate: { value: randomDate() }, units: randomFloat(), grossAmount: randomFloat() },
        { contractName: randomString(), saleDate: { value: randomDate() }, units: randomFloat(), grossAmount: randomFloat() },
      ];
      filter = { releaseId: randomId(), releaseDate: randomString() };
      table = randomString();
      sort = null;
      getAggregateStub = jest.fn().mockImplementation((table, selector, sumColumns, countColumn, filter, options, cb) => cb(null, data));
      bigQuery = { getAggregate: getAggregateStub };
      addDataSpy = jest.mock().fn((mappedData, cb) => cb(null, mappedData));
      writeCsv = { addData: addDataSpy };
    });

    it('should get totals', async () => {
      // Arrange
      const expectedResult = [
        ['Total', moment(data[0].saleDate.value).format('YYYY-MM-DD'), data[0].units, data[0].grossAmount],
        [data[1].contractName, moment(data[1].saleDate.value).format('YYYY-MM-DD'), data[1].units, data[1].grossAmount],
      ];

      // Act
      const result = await new Promise((resolve, reject) => {
        CollectData.getTotals(bigQuery, table, filter, template, sort, writeCsv, null, (err, result) => (err ? reject(err) : resolve(result)));
      });

      // Assert
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getSelectAndSumColumnArray', () => {
    it('should get all columns from the template and filters', () => {
      // Arrange
      const template = [
        { field: 'salesFileId', type: 'Selector' },
        { field: 'netAmount', type: 'Calculator' },
      ];
      const filter = {
        contractId: [randomId()],
      };

      // Act
      const cols = CollectData.getSelectAndSumColumnArray(template, filter);

      // Assert
      expect(cols).toEqual({
        selectCols: [
          {
            column: 'salesFileId',
            displayAs: 'salesFileId',
            isSelector: true,
            isGroupBy: true,
          },
        ],
        sumCols: [{ column: 'netAmount', displayAs: 'netAmount' }],
        groupCols: [
          {
            column: 'contractId',
            displayAs: 'contractId',
            isSelector: false,
            isGroupBy: true,
          },
        ],
      });
    });

    it('should still work when the filters object is undefined', () => {
      // Arrange
      const template = [
        { field: 'salesFileId', type: 'Selector' },
        { field: 'netAmount', type: 'Calculator' },
      ];
      const filter = null;

      // Act
      const cols = CollectData.getSelectAndSumColumnArray(template, filter);

      // Assert
      expect(cols).toEqual({
        selectCols: [
          {
            column: 'salesFileId',
            displayAs: 'salesFileId',
            isSelector: true,
            isGroupBy: true,
          },
        ],
        sumCols: [{ column: 'netAmount', displayAs: 'netAmount' }],
        groupCols: [],
      });
    });
  });
});
