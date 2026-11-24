/* eslint-disable max-len */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
process.env.NODE_ENV = 'test';

const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const rewire = require('rewire');
const { BigQuery } = require('@google-cloud/bigquery');
const appRootDir = require('app-root-dir').get();

const testUtils = require('../../libs/testUtils');

const bigQueryClient = new BigQuery({});

const bigQueryParams = {
  datasetName: 'datasetName',
  inputTable: 'inputTable',
  outputTable: 'outputTable',
  costsTable: 'costsTable',
  bigQueryClient,
};

let BigQueryLib;
let bigQuery;

let queryStub;
let queryJobStub;
let bigQueryClientQueryStub;
let bigQueryClientDatasetStub;
let bigQueryClientCreateDatasetStub;

const tmpDir = `${appRootDir}/tmp`;

describe('bigQuery Unit Tests', () => {
  beforeAll((done) => {
    testUtils.cleanUp(done);
    testUtils.makeTmpDir(tmpDir);
  });

  beforeEach((done) => {
    BigQueryLib = rewire('../../libs/bigQuery');
    bigQuery = new BigQueryLib(bigQueryParams);
    // Override timeout
    BigQueryLib.__set__('msBeforeRetryingErrors', 100);
    queryJobStub = sinon.stub(bigQuery, 'queryJob');
    queryJobStub.yields(null, [{ some: 'data' }]);

    done();
  });

  afterEach((done) => {
    bigQuery.datasetName = 'datasetName';
    testUtils.cleanUp(done);
  });

  afterAll((done) => {
    testUtils.cleanUp(done);
  });

  it('should initialise with the right params', (done) => {
    expect(bigQuery.datasetName).to.eq(bigQueryParams.datasetName);
    expect(bigQuery.inputTable).to.eq(bigQueryParams.inputTable);
    expect(bigQuery.outputTable).to.eq(bigQueryParams.outputTable);
    expect(bigQuery.costsTable).to.eq(bigQueryParams.costsTable);
    expect(bigQuery.accountingTable).to.eq(bigQueryParams.accountingTable);
    done();
  });

  describe('datasetExists', () => {
    let datasetStub;
    let datasetExistsSpy;

    beforeEach(() => {
      datasetStub = sinon.stub(bigQueryClient, 'dataset');
    });

    it('should call bigQueryClient.dataset with the datasetName', (done) => {
      // Arrange
      const datasetName = 'dataset 1';
      // Act
      bigQuery.datasetExists(datasetName, (err, exists) => {
        // Assert
        expect(datasetStub.args[0][0]).to.eq(datasetName);
        done();
      });
    });

    describe('when checkDataset.exists returns an err', () => {
      it('should return an error', (done) => {
        // Arrange
        const datasetName = 'dataset 1';
        const datasetExistsError = 'Dataset Error';

        datasetExistsSpy = sinon.spy((callback) => {
          callback(datasetExistsError);
        });

        datasetStub.returns({
          exists: datasetExistsSpy,
        });

        // Act
        bigQuery.datasetExists(datasetName, (err, exists) => {
          // Assert
          expect(err).to.eq(datasetExistsError);
          done();
        });
      });
    });

    describe('when checkDataset.exists does not return an err', () => {
      it('should return a boolean value', (done) => {
        // Arrange
        const datasetName = 'dataset 1';
        // Generate random boolean
        const datasetExists = Math.random() < 0.5;

        datasetExistsSpy = sinon.spy((callback) => {
          callback(null, datasetExists);
        });

        datasetStub.returns({
          exists: datasetExistsSpy,
        });

        // Act
        bigQuery.datasetExists(datasetName, (err, exists) => {
          // Assert
          expect(err).to.not.exist;
          expect(exists).to.eq(datasetExists);
          done();
        });
      });
    });
  });

  describe('getSchema', () => {
    // Arrange
    const metadata = {
      schema: {
        field1: 'Value1',
        field2: 'Value2',
      },
    };
    const tableName = 'Table 1';

    beforeEach(() => {
      bigQueryClientDatasetStub = sinon.stub(bigQueryClient, 'dataset').returns({
        dataset: sinon.stub().returnsThis(),
        table: sinon.stub().returns({
          getMetadata: sinon.stub().resolves([metadata]),
        }),
      });
    });

    it('should call getSchema with the table name', (done) => {
      // Act
      bigQuery.getSchema(tableName, () => {
        // Assert
        expect(bigQueryClientDatasetStub.args[0][0]).to.eq(bigQuery.datasetName);
        done();
      });
    });

    describe('when metadata is returned', () => {
      it('should return the schema', (done) => {
        // Act
        bigQuery.getSchema(tableName, (err, returnedSchema) => {
        // Assert
          expect(returnedSchema).to.deep.eq(metadata.schema);
          done();
        });
      });
    });
  });

  describe('formatJoinSalesFilterContractIdQuery', () => {
    it('should return an empty query when passed a null arg', (done) => {
      // Arrange
      const arg = null;
      // Act
      const query = bigQuery.formatJoinSalesFilterContractIdQuery(arg);
      // Assert
      expect(query).to.eq('');
      done();
    });

    it('should return an empty query when passed an arg not a string/array', (done) => {
      // Arrange
      const arg = {};
      // Act
      const query = bigQuery.formatJoinSalesFilterContractIdQuery(arg);
      // Assert
      expect(query).to.eq('');
      done();
    });

    it('should return one NOT LIKE query when passed a string', (done) => {
      // Arrange
      const contractId = testUtils.randomId();
      // Act
      const query = bigQuery.formatJoinSalesFilterContractIdQuery(contractId);
      // Assert
      expect(query).to.eq(`contractIds NOT LIKE '%${contractId}%'`);
      done();
    });

    it('should return multiple NOT LIKE queries when passed an array', (done) => {
      // Arrange
      const contractId1 = testUtils.randomId();
      const contractId2 = testUtils.randomId();
      // Act
      const query = bigQuery.formatJoinSalesFilterContractIdQuery([contractId1, contractId2]);
      // Assert
      expect(query).to.eq(`contractIds NOT LIKE '%${contractId1}%' AND contractIds NOT LIKE '%${contractId2}%'`);
      done();
    });
  });

  describe('formatJoinColumnsGroupBy', () => {
    it('should return an empty array when passed no args', (done) => {
      // Arrange
      const displayAs = null;
      const columns = null;
      // Act
      const result = bigQuery.formatJoinColumnsGroupBy(displayAs, columns);
      // Assert
      expect(result).to.deep.eq([]);
      done();
    });

    it('should return an empty array when passed no columns', (done) => {
      // Arrange
      const displayAs = 'displayAs';
      const columns = null;
      // Act
      const result = bigQuery.formatJoinColumnsGroupBy(displayAs, columns);
      // Assert
      expect(result).to.deep.eq([]);
      done();
    });

    it('should return an empty array when passed an empty array for the columns', (done) => {
      // Arrange
      const displayAs = 'displayAs';
      const columns = [];
      // Act
      const result = bigQuery.formatJoinColumnsGroupBy(displayAs, columns);
      // Assert
      expect(result).to.deep.eq([]);
      done();
    });

    describe('When passing it string columns', () => {
      it('should return column names when displayAs is null', (done) => {
        // Arrange
        const displayAs = null;
        const columns = ['column1', 'column2'];
        // Act
        const result = bigQuery.formatJoinColumnsGroupBy(displayAs, columns);
        // Assert
        expect(result).to.deep.eq(columns);
        done();
      });

      it('should return column names when displayAs is an empty string', (done) => {
        // Arrange
        const displayAs = '';
        const columns = ['column1', 'column2'];
        // Act
        const result = bigQuery.formatJoinColumnsGroupBy(displayAs, columns);
        // Assert
        expect(result).to.deep.eq(columns);
        done();
      });

      it('should return column names as they should be displayed', (done) => {
        // Arrange
        const displayAs = 'displayAs';
        const columns = ['column1', 'column2'];
        // Act
        const result = bigQuery.formatJoinColumnsGroupBy(displayAs, columns);
        // Assert
        expect(result).to.deep.eq(['displayAs.column1', 'displayAs.column2']);
        done();
      });
    });

    describe('When passing it array of objects', () => {
      it("should return empty array when displayAs is null and they're not to be grouped", (done) => {
        // Arrange
        const displayAs = null;
        const columns = [{ column: 'column1' }, { column: 'column2' }];
        // Act
        const result = bigQuery.formatJoinColumnsGroupBy(displayAs, columns);
        // Assert
        expect(result).to.deep.eq([]);
        done();
      });

      it("should empty array when displayAs is empty and they're not to be grouped", (done) => {
        // Arrange
        const displayAs = '';
        const columns = [{ column: 'column1' }, { column: 'column2' }];
        // Act
        const result = bigQuery.formatJoinColumnsGroupBy(displayAs, columns);
        // Assert
        expect(result).to.deep.eq([]);
        done();
      });

      it('should return column names when displayAs is an empty string and groupBy is true', (done) => {
        // Arrange
        const displayAs = '';
        const columns = [{ column: 'column1', groupBy: true }, { column: 'column2' }];
        // Act
        const result = bigQuery.formatJoinColumnsGroupBy(displayAs, columns);
        // Assert
        expect(result).to.deep.eq(['column1']);
        done();
      });

      it('should return column names as they should be displayed is defined and groupBy is true', (done) => {
        // Arrange
        const displayAs = 'displayAs';
        const columns = [{ column: 'column1', groupBy: true }, { column: 'column2' }];
        // Act
        const result = bigQuery.formatJoinColumnsGroupBy(displayAs, columns);
        // Assert
        expect(result).to.deep.eq(['displayAs.column1']);
        done();
      });
    });
  });

  describe('formatJoinColumnsSelect', () => {
    it('should return an empty array when passed no args', (done) => {
      // Arrange
      const displayAs = null;
      const columns = null;
      // Act
      const result = bigQuery.formatJoinColumnsSelect(displayAs, columns);
      // Assert
      expect(result).to.deep.eq([]);
      done();
    });

    it('should return an empty array when passed no columns', (done) => {
      // Arrange
      const displayAs = 'displayAs';
      const columns = null;
      // Act
      const result = bigQuery.formatJoinColumnsSelect(displayAs, columns);
      // Assert
      expect(result).to.deep.eq([]);
      done();
    });

    it('should return an empty array when passed an empty array for the columns', (done) => {
      // Arrange
      const displayAs = 'displayAs';
      const columns = [];
      // Act
      const result = bigQuery.formatJoinColumnsSelect(displayAs, columns);
      expect(result).to.deep.eq([]);
      done();
    });

    describe('When passing it string columns', () => {
      it('should return column names when displayAs is null', (done) => {
        // Arrange
        const displayAs = null;
        const columns = ['column1', 'column2'];
        // Act
        const result = bigQuery.formatJoinColumnsSelect(displayAs, columns);
        // Assert
        expect(result).to.deep.eq(columns);
        done();
      });

      it('should return column names when displayAs is an empty string', (done) => {
        // Arrange
        const displayAs = '';
        const columns = ['column1', 'column2'];
        // Act
        const result = bigQuery.formatJoinColumnsSelect(displayAs, columns);
        // Assert
        expect(result).to.deep.eq(columns);
        done();
      });

      it('should return column names as they should be displayed', (done) => {
        // Arrange
        const displayAs = 'displayAs';
        const columns = ['column1', 'column2'];
        // Act
        const result = bigQuery.formatJoinColumnsSelect(displayAs, columns);
        // Assert
        expect(result).to.deep.eq(['displayAs.column1', 'displayAs.column2']);
        done();
      });
    });

    describe('When passing it array of objects', () => {
      it("should return columns when displayAs is null and they're not to be aggregated", (done) => {
        // Arrange
        const displayAs = null;
        const columns = [{ column: 'column1' }, { column: 'column2' }];
        // Act
        const result = bigQuery.formatJoinColumnsSelect(displayAs, columns);
        // Asseret
        expect(result).to.deep.eq(['column1', 'column2']);
        done();
      });

      it("should return columns when displayAs is empty and they're not to be grouped", (done) => {
        // Arrange
        const displayAs = '';
        const columns = [{ column: 'column1' }, { column: 'column2' }];
        // Act
        const result = bigQuery.formatJoinColumnsSelect(displayAs, columns);
        // Assert
        expect(result).to.deep.eq(['column1', 'column2']);
        done();
      });

      it('should return column names when displayAs is an empty string and aggregate is not true', (done) => {
        // Arrange
        const displayAs = 'displayAs';
        const columns = [{ column: 'column1', aggregate: true }, { column: 'column2' }];
        // Act
        const result = bigQuery.formatJoinColumnsSelect(displayAs, columns);
        // Assert
        expect(result).to.deep.eq(['displayAs.column2']);
        done();
      });
    });
  });

  describe('filterArrayToVales', () => {
    it('should return null array when passed no args', (done) => {
      // Arrange
      const array = null;
      // Act
      const query = bigQuery.filterArrayToVales(array);
      // Assert
      expect(query).to.deep.eq(null);
      done();
    });

    it('should return null array not passed an array', (done) => {
      // Arrange
      const array = 'String';
      // Act
      const query = bigQuery.filterArrayToVales(array);
      // Assert
      expect(query).to.deep.eq(null);
      done();
    });

    it('should return query when passed an array containing one String', (done) => {
      // Arrange
      const array = ['String'];
      // Act
      const query = bigQuery.filterArrayToVales(array);
      // Assert
      expect(query).to.deep.eq('("String")');
      done();
    });

    it('should return query when passed an array containing more than one String', (done) => {
      // Arrange
      const array = ['String1', 'String2'];
      // Act
      const query = bigQuery.filterArrayToVales(array);
      // Assert
      expect(query).to.deep.eq('("String1", "String2")');
      done();
    });

    it('should return query when passed an array containing one Number', (done) => {
      // Arrange
      const array = [1];
      // Act
      const query = bigQuery.filterArrayToVales(array);
      // Assert
      expect(query).to.deep.eq('(1)');
      done();
    });

    it('should return query when passed an array containing more than one Number', (done) => {
      // Arrange
      const array = [1, 2, 3];
      // Act
      const query = bigQuery.filterArrayToVales(array);
      // Assert
      expect(query).to.deep.eq('(1, 2, 3)');
      done();
    });

    it('should return query when passed an array containing Strings and Numbers', (done) => {
      // Arrange
      const array = [1, 'String', 3];
      // Act
      const query = bigQuery.filterArrayToVales(array);
      // Assert
      expect(query).to.deep.eq('(1, "String", 3)');
      done();
    });
  });

  describe('filterFromObject', () => {
    it("should return 'true' when passed an empty object", (done) => {
      // Arrange
      const object = {};
      const table = 'Table';
      // Act
      const query = bigQuery.filterFromObject(object, table);
      // Assert
      expect(query).to.be.eq('true');
      done();
    });

    it('should back a simple query', (done) => {
      // Arrange
      const object = { arg1: 'Value 1' };
      const table = null;
      // Act
      const query = bigQuery.filterFromObject(object, table);
      // Assert
      expect(query).to.eq("arg1 = 'Value 1'");
      done();
    });

    it('should return back a simple query with table', (done) => {
      // Arrange
      const object = { arg1: 'Value 1' };
      const table = 'Table';
      // Act
      const query = bigQuery.filterFromObject(object, table);
      // Assert
      expect(query).to.eq("Table.arg1 = 'Value 1'");
      done();
    });

    it('should return back a simple Number query', (done) => {
      // Arrange
      const object = { arg1: 1 };
      const table = null;
      // Act
      const query = bigQuery.filterFromObject(object, table);
      // Assert
      expect(query).to.eq('arg1 = 1');
      done();
    });

    it('should return back a simple Not Equal Number query', (done) => {
      // Arrange
      const object = { arg1: { $ne: 1 } };
      const table = null;
      // Act
      const query = bigQuery.filterFromObject(object, table);
      // Assert
      expect(query).to.eq('arg1 != 1');
      done();
    });

    it("should return an 'AND' query", (done) => {
      // Arrange
      const object = { arg1: 'Value 1', arg2: 'Value 2' };
      const table = null;
      // Act
      const query = bigQuery.filterFromObject(object, table);
      // Assert
      expect(query).to.eq("arg1 = 'Value 1' AND arg2 = 'Value 2'");
      done();
    });

    it("should return an 'OR' query", (done) => {
      // Arrange
      const object = { $or: [{ arg1: 'Value 1' }, { arg2: 'Value 2' }] };
      const table = null;
      // Act
      const query = bigQuery.filterFromObject(object, table);
      // Assert
      expect(query).to.eq("((arg1 = 'Value 1') OR (arg2 = 'Value 2'))");
      done();
    });

    it("should return an 'IN' query", (done) => {
      // Arrange
      const object = { arg1: { $in: ['Value 1', 'Value 2'] } };
      const table = null;
      // Act
      const query = bigQuery.filterFromObject(object, table);
      // Assert
      expect(query).to.eq('arg1 IN ("Value 1", "Value 2")');
      done();
    });

    it("should return an 'NOT IN' query", (done) => {
      // Arrange
      const object = { arg1: { $nin: ['Value 1', 'Value 2'] } };
      const table = null;
      // Act
      const query = bigQuery.filterFromObject(object, table);
      // Assert
      expect(query).to.eq('arg1 NOT IN ("Value 1", "Value 2")');
      done();
    });

    it("should return an 'IS NULL' query", (done) => {
      // Arrange
      const object = { arg1: null };
      const table = null;
      // Act
      const query = bigQuery.filterFromObject(object, table);
      // Assert
      expect(query).to.eq('arg1 IS NULL');
      done();
    });

    it("should return an 'IS NULL' query based on $exists", (done) => {
      // Arrange
      const object = { arg1: { $exists: false } };
      const table = null;
      // Act
      const query = bigQuery.filterFromObject(object, table);
      // Assert
      expect(query).to.eq('arg1 IS NULL');
      done();
    });

    it("should return an 'IS NOT NULL' query based on $exists", (done) => {
      // Arrange
      const object = { arg1: { $exists: true } };
      const table = null;
      // Act
      const query = bigQuery.filterFromObject(object, table);
      // Assert
      expect(query).to.eq('arg1 IS NOT NULL');
      done();
    });

    it("should return an 'IS NULL' and 'IS NOT NULL' query based on $exists", (done) => {
      // Arrange
      const object = { arg1: { $exists: true }, arg2: { $exists: false } };
      const table = null;
      // Act
      const query = bigQuery.filterFromObject(object, table);
      // Assert
      expect(query).to.eq('arg1 IS NOT NULL AND arg2 IS NULL');
      done();
    });

    it("should return a '>' query on $gt", (done) => {
      // Arrange
      const object = { arg1: { $gt: 10 } };
      const table = null;
      // Act
      const query = bigQuery.filterFromObject(object, table);
      // Assert
      expect(query).to.eq('arg1 > 10');
      done();
    });

    it("should return a '>=' query on $gte", (done) => {
      // Arrange
      const object = { arg1: { $gte: 10 } };
      const table = null;
      // Act
      const query = bigQuery.filterFromObject(object, table);
      // Assert
      expect(query).to.eq('arg1 >= 10');
      done();
    });

    it("should return a '<' query on $lt", (done) => {
      // Arrange
      const object = { arg1: { $lt: 10 } };
      const table = null;
      // Act
      const query = bigQuery.filterFromObject(object, table);
      // Assert
      expect(query).to.eq('arg1 < 10');
      done();
    });

    it("should return a '<=' query on $lte", (done) => {
      // Arrange
      const object = { arg1: { $lte: 10 } };
      const table = null;
      // Act
      const query = bigQuery.filterFromObject(object, table);
      // Assert
      expect(query).to.eq('arg1 <= 10');
      done();
    });
  });

  describe('selectQueryFromArray', () => {
    it('should return empty query when passed empty string', (done) => {
      // Arrange
      const array = '';
      // Act
      const query = bigQuery.selectQueryFromArray(array);
      // Assert
      expect(query).to.eq('');
      done();
    });

    it('should return string when passed a string', (done) => {
      // Arrange
      const array = 'String';
      // Act
      const query = bigQuery.selectQueryFromArray(array);
      // Assert
      expect(query).to.eq('String');
      done();
    });

    it('should return query when passed an array', (done) => {
      // Arrange
      const array = ['String 1', 'String 2'];
      // Act
      const query = bigQuery.selectQueryFromArray(array);
      // Assert
      expect(query).to.eq('String 1, String 2');
      done();
    });
  });

  describe('getSalesInputSelectQueryArgs', () => {
    it('should return an empty string if no columns', (done) => {
      // Arrange
      const columns = null;
      // Act
      const query = bigQuery.getSalesInputSelectQueryArgs(columns);
      // Assert
      expect(query).to.eq('');
      done();
    });

    it('should return an empty string if columns is not an array', (done) => {
      // Arrange
      const columns = 'Column';
      // Act
      const query = bigQuery.getSalesInputSelectQueryArgs(columns);
      // Assert
      expect(query).to.eq('');
      done();
    });

    it('should return input columns', (done) => {
      // Arrange
      const columns = [{ column: 'column1' }, { column: 'column2' }];
      // Act
      const query = bigQuery.getSalesInputSelectQueryArgs(columns);
      // Assert
      expect(query).to.eq('Input.column1, Input.column2');
      done();
    });

    it("should return input columns only if they contain the 'column' field", (done) => {
      // Arrange
      const columns = [{ column: 'column1' }, { column: 'column2' }, { other: 'field' }];
      // Act
      const query = bigQuery.getSalesInputSelectQueryArgs(columns);
      // Assert
      expect(query).to.eq('Input.column1, Input.column2');
      done();
    });
  });

  describe('getSumQuery', () => {
    it('should return an empty string if no columns', (done) => {
      // Arrange
      const columns = null;
      // Act
      const query = bigQuery.getSumQuery(columns);
      // Assert
      expect(query).to.eq('');
      done();
    });

    it('should return an empty string if columns is not an array', (done) => {
      // Arrange
      const columns = 'Columns';
      // Act
      const query = bigQuery.getSumQuery(columns);
      // Assert
      expect(query).to.eq('');
      done();
    });

    it('should return sum columns', (done) => {
      // Arrange
      const columns = [{ column: 'column1', displayAs: 'Column-1' }, { column: 'column2', displayAs: 'Column-2' }];
      // Act
      const query = bigQuery.getSumQuery(columns);
      // Assert
      expect(query).to.eq('SUM(column1) AS Column-1, SUM(column2) AS Column-2');
      done();
    });

    it("should return sum columns only if they contain the 'column' and 'displayAs' fields", (done) => {
      // Arrange
      const columns = [{ column: 'column1', displayAs: 'Column-1' }, { column: 'column2', displayAs: 'Column-2' }, { other: 'field' }];
      // Act
      const query = bigQuery.getSumQuery(columns);
      // Assert
      expect(query).to.eq('SUM(column1) AS Column-1, SUM(column2) AS Column-2');
      done();
    });
  });

  describe('formatSelector', () => {
    it('should return empty strings if no args', (done) => {
      // Arrange
      const selector = null;
      // Act
      const query = bigQuery.formatSelector(selector);
      // Assert
      expect(query).to.deep.eq({ select: '', groupBy: '' });
      done();
    });

    it('should return empty strings if arg is not String/Array', (done) => {
      // Arrange
      const selector = {};
      // Act
      const query = bigQuery.formatSelector(selector);
      // Assert
      expect(query).to.deep.eq({ select: '', groupBy: '' });
      done();
    });

    it('should return the arg as select and groupBy if arg is string', (done) => {
      // Arrange
      const selector = 'String';
      // Act
      const query = bigQuery.formatSelector(selector);
      // Assert
      expect(query).to.deep.eq({ select: 'String', groupBy: 'String' });
      done();
    });

    it('should return selectors', (done) => {
      // Arrange
      const selector = [{ column: 'String1', isSelector: true }, { column: 'String2', isSelector: true }];
      // Act
      const query = bigQuery.formatSelector(selector);
      // Assert
      expect(query).to.deep.eq({ select: 'String1, String2', groupBy: '' });
      done();
    });

    it('should return group by', (done) => {
      // Arrange
      const selector = [{ column: 'String1', isGroupBy: true }, { column: 'String2', isGroupBy: true }];
      // Act
      const query = bigQuery.formatSelector(selector);
      // Assert
      expect(query).to.deep.eq({ groupBy: 'String1, String2', select: '' });
      done();
    });

    it('should return selectors and group by', (done) => {
      // Arrange
      const selector = [{ column: 'String1', isGroupBy: false, isSelector: true }, { column: 'String2', isGroupBy: true, isSelector: false }];
      // Act
      const query = bigQuery.formatSelector(selector);
      // Assert
      expect(query).to.deep.eq({ select: 'String1', groupBy: 'String2' });
      done();
    });
  });

  describe('setupFile', () => {
    it('should create a JSON file', (done) => {
      // Act
      bigQuery.setupFile((err) => {
        // Assert
        expect(bigQuery.fileLocation).to.not.eq(null);
        fs.unlink(bigQuery.fileLocation, done);
      });
    });

    it('should add the JSON file to allFiles', (done) => {
      // Act
      bigQuery.setupFile((err) => {
        // Assert
        expect(bigQuery.allFiles.indexOf(bigQuery.fileLocation)).to.not.eq(-1);
        fs.unlink(bigQuery.fileLocation, done);
      });
    });

    it('should allow writing to file', (done) => {
      // Act
      bigQuery.setupFile((err) => {
        // Assert
        expect(bigQuery.writeFileLocked).to.be.false;
        fs.unlink(bigQuery.fileLocation, done);
      });
    });
  });

  describe('writeToFile', () => {
    it('should return an error if data is null', (done) => {
      // Arrange
      bigQuery.setupFile(() => {
        // Act
        bigQuery.writeToFile(null, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err.message).to.eq('Data must be an array');
          fs.unlink(bigQuery.fileLocation, done);
        });
      });
    });

    it('should return an error if data is not an array', (done) => {
      // Arrange
      bigQuery.setupFile(() => {
        // Act
        bigQuery.writeToFile('data', (err) => {
          // Assert
          expect(err).to.exist;
          expect(err.message).to.eq('Data must be an array');
          fs.unlink(bigQuery.fileLocation, done);
        });
      });
    });

    it('should write data to the JSON file', (done) => {
      // Arrange
      const data = ['line 1', 'line 2', 'line 3'];
      bigQuery.setupFile(() => {
        // Act
        bigQuery.writeToFile(data, (err) => {
          fs.readFile(bigQuery.fileLocation, 'utf8', (fsError, rawData) => {
            // Assert
            expect(rawData).to.deep.eq('"line 1"\r\n"line 2"\r\n"line 3"\r\n');
            fs.unlink(bigQuery.fileLocation, done);
          });
        });
      });
    });
  });

  describe('getData', () => {
    it('should form the right query with: table and column', (done) => {
      // Arrange
      const table = 'table';
      const columns = 'column';
      const filter = {};
      const options = {};
      // Act
      bigQuery.getData(table, columns, filter, options, () => {
        const query = queryJobStub.getCall(0).args[0].replace(/\s+/g, ' ');
        // Assert
        expect(query).to.eq(`SELECT column FROM \`${bigQuery.datasetName}.table\` WHERE true`);
        done();
      });
    });

    it('should form the right query with: table and multiple columns', (done) => {
      // Arrange
      const table = 'table';
      const columns = ['column1', 'column2'];
      const filter = {};
      const options = {};
      // Act
      bigQuery.getData(table, columns, filter, options, () => {
        const query = queryJobStub.getCall(0).args[0].replace(/\s+/g, ' ');
        // Assert
        expect(query).to.eq(`SELECT column1, column2 FROM \`${bigQuery.datasetName}.table\` WHERE true`);
        done();
      });
    });

    it('should form the right query with: table, column and filter', (done) => {
      // Arrange
      const table = 'table';
      const columns = 'column';
      const filter = { arg: 'Value' };
      const options = {};
      // Act
      bigQuery.getData(table, columns, filter, options, () => {
        const query = queryJobStub.getCall(0).args[0].replace(/\s+/g, ' ');
        // Assert
        expect(query).to.eq(`SELECT column FROM \`${bigQuery.datasetName}.table\` WHERE arg = 'Value'`);
        done();
      });
    });

    it('should form the right query with: table, select, filter and limit', (done) => {
      // Arrange
      const table = 'table';
      const columns = 'column';
      const filter = { arg: 'Value' };
      const options = { limit: 10 };
      // Act
      bigQuery.getData(table, columns, filter, options, () => {
        const query = queryJobStub.getCall(0).args[0].replace(/\s+/g, ' ');
        // Assert
        expect(query).to.eq(`SELECT column FROM \`${bigQuery.datasetName}.table\` WHERE arg = 'Value' LIMIT 10`);
        done();
      });
    });

    it('should form the right query with: table, select, filter, limit and offset', (done) => {
      // Arrange
      const table = 'table';
      const columns = 'column';
      const filter = { arg: 'Value' };
      const options = { limit: 10, offset: 10 };
      // Act
      bigQuery.getData(table, columns, filter, options, () => {
        const query = queryJobStub.getCall(0).args[0].replace(/\s+/g, ' ');
        // Assert
        expect(query).to.eq(`SELECT column FROM \`${bigQuery.datasetName}.table\` WHERE arg = 'Value' LIMIT 10 OFFSET 10`);
        done();
      });
    });

    it('should get data from DB', (done) => {
      // Arrange
      const table = 'table';
      const columns = 'column';
      const filter = {};
      const options = {};
      // Act
      bigQuery.getData(table, columns, filter, options, (err, data) => {
        // Assert
        expect(err).to.not.exist;
        expect(queryJobStub.called).to.be.true;
        expect(data).to.deep.eq([{ some: 'data' }]);
        done();
      });
    });
  });

  describe('deleteData', () => {
    beforeEach(() => {
      queryJobStub.yields(null, [{ some: 'data', count: 0 }]);
    });

    it('should form the right query', (done) => {
      // Arrange
      const table = 'table';
      const filter = { arg: 'Value' };
      // Act
      bigQuery.deleteData(table, filter, () => {
        const query = queryJobStub.getCall(0).args[0].replace(/\s+/g, ' ');
        // Assert
        expect(query).to.eq(`DELETE FROM \`${bigQuery.datasetName}.table\` WHERE arg = 'Value'`);
        done();
      });
    });
    it('should delete data from DB', (done) => {
      // Arrange
      const table = 'table';
      const filter = { arg: 'Value' };
      // Act
      bigQuery.deleteData(table, filter, (err, data) => {
        // Assert
        expect(err).to.not.exist;
        expect(queryJobStub.called).to.be.true;
        expect(data).to.deep.eq([{ some: 'data', count: 0 }]);
        done();
      });
    });
  });

  describe('updateData', () => {
    it('should return an error if no update object is passed', (done) => {
      // Arrange
      const table = 'table';
      const filter = {};
      const update = null;
      // Act
      bigQuery.updateData(table, filter, update, (err, data) => {
        // Assert
        expect(err).to.exist;
        expect(err.message).to.eq('Update object must be passed');
        done();
      });
    });

    it('should form the right query when update is an object', (done) => {
      // Arrange
      const table = 'table';
      const filter = { arg1: 'Value 1' };
      const update = { arg2: 'Value 2', arg3: 3 };
      // Act
      bigQuery.updateData(table, filter, update, (err, data) => {
        // Assert
        const query = queryJobStub.getCall(0).args[0].replace(/\s+/g, ' ');
        expect(query).to.eq(`UPDATE \`${bigQuery.datasetName}.table\` SET arg2 = "Value 2", arg3 = 3 WHERE arg1 = 'Value 1'`);
        done();
      });
    });

    it('should form the right query when update is a string', (done) => {
      // Arrange
      const table = 'table';
      const filter = { arg1: 'Value 1' };
      const update = 'UPDATE';
      // Act
      bigQuery.updateData(table, filter, update, (err, data) => {
        // Assert
        const query = queryJobStub.getCall(0).args[0].replace(/\s+/g, ' ');
        expect(query).to.eq(`UPDATE \`${bigQuery.datasetName}.table\` SET UPDATE WHERE arg1 = 'Value 1'`);
        done();
      });
    });
  });

  describe('getDistinct', () => {
    beforeEach(() => {
      queryJobStub.yields(null, [{ column: '1' }, { column: '2' }, { column: '3' }]);
    });

    it('should form the right query with: table and column', (done) => {
      // Arrange
      const table = 'table';
      const column = 'column';
      const filter = {};
      // Act
      bigQuery.getDistinct(table, column, filter, (err, data) => {
        // Assert
        const query = queryJobStub.getCall(0).args[0].replace(/\s+/g, ' ');
        expect(query).to.eq(`SELECT DISTINCT column FROM \`${bigQuery.datasetName}.table\` WHERE column IS NOT NULL AND true`);
        done();
      });
    });

    it('should form the right query with: table and column when colum is an array', (done) => {
      // Arrange
      const table = 'table';
      const column = ['column1', 'column2'];
      const filter = {};
      // Act
      bigQuery.getDistinct(table, column, filter, (err, data) => {
        // Assert
        const query = queryJobStub.getCall(0).args[0].replace(/\s+/g, ' ');
        expect(query).to.eq(`SELECT DISTINCT column1,column2 FROM \`${bigQuery.datasetName}.table\` WHERE column1 IS NOT NULL AND column2 IS NOT NULL AND true`);
        done();
      });
    });

    it('should form the right query with: table, column and filter', (done) => {
      // Arrange
      const table = 'table';
      const column = 'column';
      const filter = { arg: 'Value' };
      // Act
      bigQuery.getDistinct(table, column, filter, (err, data) => {
        // Assert
        const query = queryJobStub.getCall(0).args[0].replace(/\s+/g, ' ');
        expect(query).to.eq(`SELECT DISTINCT column FROM \`${bigQuery.datasetName}.table\` WHERE column IS NOT NULL AND arg = 'Value'`);
        done();
      });
    });

    it('should get distinct data from DB', (done) => {
      // Arrange
      const table = 'table';
      const column = 'column';
      const filter = { arg: 'Value' };
      // Act
      bigQuery.getDistinct(table, column, filter, (err, data) => {
        // Assert
        expect(err).to.be.null;
        expect(queryJobStub.called).to.be.true;
        expect(data).to.deep.eq(['1', '2', '3']);
        done();
      });
    });
  });

  describe('getMultiDistinct', () => {
    beforeEach(() => {
      queryJobStub.yields(null, [{ column: '1' }, { column: '2' }, { column: '3' }]);
    });

    it('should form the right query with: table and columns', (done) => {
      // Arrange
      const table = 'table';
      const columns = ['column1', 'column2'];
      const filter = {};
      // Act
      bigQuery.getMultiDistinct(table, columns, filter, (err, data) => {
        // Assert
        const query = queryJobStub.getCall(0).args[0].replace(/\s+/g, ' ');
        expect(query).to.eq(`SELECT DISTINCT column1, column2 FROM \`${bigQuery.datasetName}.table\` WHERE true`);
        done();
      });
    });

    it('should form the right query with: table,columns and filter', (done) => {
      // Arrange
      const table = 'table';
      const columns = ['column1', 'column2'];
      const filter = { arg: 'Value' };
      // Act
      bigQuery.getMultiDistinct(table, columns, filter, (err, data) => {
        // Assert
        const query = queryJobStub.getCall(0).args[0].replace(/\s+/g, ' ');
        expect(query).to.eq(`SELECT DISTINCT column1, column2 FROM \`${bigQuery.datasetName}.table\` WHERE arg = 'Value'`);
        done();
      });
    });

    it('should get distinct data from DB', (done) => {
      // Arrange
      const table = 'table';
      const columns = ['column1', 'column2'];
      const filter = { arg: 'Value' };
      // Act
      bigQuery.getMultiDistinct(table, columns, filter, (err, data) => {
        // Assert
        expect(err).to.not.exist;
        expect(queryJobStub.called).to.be.true;
        expect(data).to.deep.eq([{ column: '1' }, { column: '2' }, { column: '3' }]);
        done();
      });
    });
  });

  describe('getAggregate', () => {
    let logQueryStub;
    let getAggregateQuerySub;
    const query = testUtils.randomString();

    beforeEach(() => {
      getAggregateQuerySub = sinon.stub(bigQuery, 'getAggregateQuery');
      getAggregateQuerySub.returns(query);

      logQueryStub = sinon.stub(bigQuery, 'logQuery');
      logQueryStub.returns();
    });

    it('should call getAggregateQuery', (done) => {
      // Arrange
      const table = 'table';
      const selector = [{ isSelector: true, isGroupBy: true, column: 'selector1' }, { isSelector: true, isGroupBy: true, column: 'selector2' }];
      const sumColumns = [{ column: 'sumColumn1', displayAs: 'Column1' }];
      const countColumns = 'countColumn';
      const filter = { arg: 'Value' };
      const options = { limit: 10, offset: 10 };
      // Act
      bigQuery.getAggregate(table, selector, sumColumns, countColumns, filter, options, (err, data) => {
        // Assert
        expect(err).to.not.exist;
        expect(getAggregateQuerySub.called).to.be.true;
        done();
      });
    });

    it('should log the query', (done) => {
      // Arrange
      const table = 'table';
      const selector = [{ isSelector: true, isGroupBy: true, column: 'selector1' }, { isSelector: true, isGroupBy: true, column: 'selector2' }];
      const sumColumns = [{ column: 'sumColumn1', displayAs: 'Column1' }];
      const countColumns = 'countColumn';
      const filter = { arg: 'Value' };
      const options = { limit: 10, offset: 10 };
      // Act
      bigQuery.getAggregate(table, selector, sumColumns, countColumns, filter, options, (err, data) => {
        // Assert
        expect(logQueryStub.called).to.be.true;
        expect(logQueryStub.args[0][0]).to.eq(table);
        expect(logQueryStub.args[0][1]).to.eq(query);
        expect(logQueryStub.args[0][2]).to.eq('Calculation');
        done();
      });
    });

    it('should call queryJob', (done) => {
      // Arrange
      const table = 'table';
      const selector = [{ isSelector: true, isGroupBy: true, column: 'selector1' }, { isSelector: true, isGroupBy: true, column: 'selector2' }];
      const sumColumns = [{ column: 'sumColumn1', displayAs: 'Column1' }];
      const countColumns = 'countColumn';
      const filter = { arg: 'Value' };
      const options = { limit: 10, offset: 10 };
      // Act
      bigQuery.getAggregate(table, selector, sumColumns, countColumns, filter, options, (err, data) => {
        // Assert
        expect(err).to.not.exist;
        expect(queryJobStub.called).to.be.true;
        expect(queryJobStub.args[0][0]).to.eq(query);
        expect(data).to.deep.eq([{ some: 'data' }]);
        done();
      });
    });
  });

  describe('getAggregateQuery', () => {
    it('should form the right query with a single selector, no filter and no options', (done) => {
      // Arrange
      const table = 'table';
      const selector = 'selector';
      const sumColumns = [{ column: 'sumColumn1', displayAs: 'Column1' }];
      const countColumns = 'countColumn';
      const filter = {};
      const options = {};
      // Act
      const query = bigQuery.getAggregateQuery(table, selector, sumColumns, countColumns, filter, options).replace(/\s+/g, ' ').trim();
      const expectedQuery = `SELECT selector, SUM(sumColumn1) AS Column1, COUNT(*) AS countColumn FROM \`${bigQuery.datasetName}.table\` WHERE true GROUP BY selector`.replace(/\s+/g, ' ').trim();
      // Assert
      expect(query).to.eq(expectedQuery);
      done();
    });

    it('should form the right query with multiple selectors, no filter and no options', (done) => {
      // Arrange
      const table = 'table';
      const selector = [{ isSelector: true, isGroupBy: true, column: 'selector1' }, { isSelector: true, isGroupBy: true, column: 'selector2' }];
      const sumColumns = [{ column: 'sumColumn1', displayAs: 'Column1' }];
      const countColumns = 'countColumn';
      const filter = {};
      const options = {};
      // Act
      const query = bigQuery.getAggregateQuery(table, selector, sumColumns, countColumns, filter, options).replace(/\s+/g, ' ').trim();
      const expectedQuery = `SELECT selector1, selector2, SUM(sumColumn1) AS Column1, COUNT(*) AS countColumn FROM \`${bigQuery.datasetName}.table\` WHERE true GROUP BY selector1, selector2`.replace(/\s+/g, ' ').trim();
      // Assert
      expect(query).to.eq(expectedQuery);
      done();
    });

    it('should form the right query with multiple selectors, a filter and no options', (done) => {
      // Arrange
      const table = 'table';
      const selector = [{ isSelector: true, isGroupBy: true, column: 'selector1' }, { isSelector: true, isGroupBy: true, column: 'selector2' }];
      const sumColumns = [{ column: 'sumColumn1', displayAs: 'Column1' }];
      const countColumns = 'countColumn';
      const filter = { arg: 'Value' };
      const options = {};
      // Act
      const query = bigQuery.getAggregateQuery(table, selector, sumColumns, countColumns, filter, options).replace(/\s+/g, ' ').trim();
      const expectedQuery = `SELECT selector1, selector2, SUM(sumColumn1) AS Column1, COUNT(*) AS countColumn FROM \`${bigQuery.datasetName}.table\` WHERE arg = 'Value' GROUP BY selector1, selector2`.replace(/\s+/g, ' ').trim();
      // Assert
      expect(query).to.eq(expectedQuery);
      done();
    });

    it('should form the right query with multiple selectors, a filter and a limit option', (done) => {
      // Arrange
      const table = 'table';
      const selector = [{ isSelector: true, isGroupBy: true, column: 'selector1' }, { isSelector: true, isGroupBy: true, column: 'selector2' }];
      const sumColumns = [{ column: 'sumColumn1', displayAs: 'Column1' }];
      const countColumns = 'countColumn';
      const filter = { arg: 'Value' };
      const options = { limit: 10 };
      // Act
      const query = bigQuery.getAggregateQuery(table, selector, sumColumns, countColumns, filter, options).replace(/\s+/g, ' ').trim();
      const expectedQuery = `SELECT selector1, selector2, SUM(sumColumn1) AS Column1, COUNT(*) AS countColumn FROM \`${bigQuery.datasetName}.table\` WHERE arg = 'Value' GROUP BY selector1, selector2 LIMIT 10`.replace(/\s+/g, ' ').trim();
      // Assert
      expect(query).to.eq(expectedQuery);
      done();
    });

    it('should form the right query with multiple selectors, a filter, a limit option and an offset', (done) => {
      // Arrange
      const table = 'table';
      const selector = [{ isSelector: true, isGroupBy: true, column: 'selector1' }, { isSelector: true, isGroupBy: true, column: 'selector2' }];
      const sumColumns = [{ column: 'sumColumn1', displayAs: 'Column1' }];
      const countColumns = 'countColumn';
      const filter = { arg: 'Value' };
      const options = { limit: 10, offset: 10 };
      // Act
      const query = bigQuery.getAggregateQuery(table, selector, sumColumns, countColumns, filter, options).replace(/\s+/g, ' ').trim();
      const expectedQuery = `SELECT selector1, selector2, SUM(sumColumn1) AS Column1, COUNT(*) AS countColumn FROM \`${bigQuery.datasetName}.table\` WHERE arg = 'Value' GROUP BY selector1, selector2 LIMIT 10 OFFSET 10`.replace(/\s+/g, ' ').trim();
      // Assert
      expect(query).to.eq(expectedQuery);
      done();
    });
  });

  describe('getSalesInputAggregate', () => {
    it('should form the right query without a filter', (done) => {
      // Arrange
      const groupBy = 'groupBy';
      const sumColumns = [{ column: 'sumColumn1', displayAs: 'Column1' }];
      const countColumn = 'countColumn';
      const filter = {};
      // Act
      bigQuery.getSalesInputAggregate(groupBy, sumColumns, countColumn, filter, (err, data) => {
        // Assert
        const query = queryJobStub.getCall(0).args[0].replace(/\s+/g, ' ');
        expect(query).to.eq(`SELECT groupBy, SUM(sumColumn1) AS Column1, COUNT(*) AS countColumn FROM ( SELECT string_agg(Output.contractId) as ContractIds,Output.salesLineId,Output.periodId,Output.groupBy,Input.sumColumn1 FROM \`${bigQuery.datasetName}.${bigQuery.outputTable}\` Output JOIN \`${bigQuery.datasetName}.${bigQuery.inputTable}\` Input ON Output.salesLineId = Input.id GROUP BY Output.salesLineId, Output.periodId, Output.groupBy, units, homeCurrencyNetAmount) GROUP BY groupBy`);
        done();
      });
    });

    it('should form the right query with a filter', (done) => {
      // Arrange
      const groupBy = 'groupBy';
      const sumColumns = [{ column: 'sumColumn1', displayAs: 'Column1' }];
      const countColumn = 'countColumn';
      const filter = { arg: 'Value' };
      // Act
      bigQuery.getSalesInputAggregate(groupBy, sumColumns, countColumn, filter, (err, data) => {
        // Assert
        const query = queryJobStub.getCall(0).args[0].replace(/\s+/g, ' ');
        expect(query).to.eq(`SELECT groupBy, SUM(sumColumn1) AS Column1, COUNT(*) AS countColumn FROM ( SELECT string_agg(Output.contractId) as ContractIds,Output.salesLineId,Output.periodId,Output.groupBy,Input.sumColumn1 FROM \`${bigQuery.datasetName}.${bigQuery.outputTable}\` Output JOIN \`${bigQuery.datasetName}.${bigQuery.inputTable}\` Input ON Output.salesLineId = Input.id GROUP BY Output.salesLineId, Output.periodId, Output.groupBy, units, homeCurrencyNetAmount) WHERE arg = 'Value' GROUP BY groupBy`);
        done();
      });
    });

    it('should get aggregate from DB', (done) => {
      // Arrange
      const groupBy = 'groupBy';
      const sumColumns = [{ column: 'sumColumn1', displayAs: 'Column1' }];
      const countColumn = 'countColumn';
      const filter = { arg: 'Value' };
      // Act
      bigQuery.getSalesInputAggregate(groupBy, sumColumns, countColumn, filter, (err, data) => {
        // Assert
        expect(err).to.not.exist;
        expect(queryJobStub.called).to.be.true;
        expect(data).to.deep.eq([{ some: 'data' }]);
        done();
      });
    });
  });

  describe('joinSalesCalculationFilterQueryObject', () => {
    let filterQueryStub;
    let catalogueIdsToParamsStub;
    const query = testUtils.randomString();

    beforeEach(() => {
      filterQueryStub = sinon.stub(bigQuery, 'joinSalesCalculationFilterQuery');
      filterQueryStub.returns(query);

      catalogueIdsToParamsStub = sinon.stub(bigQuery, 'catalogueIdsToParams');
      catalogueIdsToParamsStub.returns(query);
    });

    it('should call joinSalesCalculationFilterQuery', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const distinctColumns = ['distinct1', 'distinct2'];
      const filter = { arg: 'Value' };
      const options = { limit: 10, offset: 10 };
      // Act
      bigQuery.joinSalesCalculationFilterQueryObject(salesInputColumns, distinctColumns, filter, options);
      // Assert
      expect(filterQueryStub.called).to.be.true;
      expect(filterQueryStub.args[0][0]).to.deep.eq(salesInputColumns);
      expect(filterQueryStub.args[0][1]).to.deep.eq(distinctColumns);
      expect(filterQueryStub.args[0][2]).to.deep.eq(filter);
      expect(filterQueryStub.args[0][3]).to.deep.eq(options);

      done();
    });

    it('should call catalogueIdsToParams for releaseIds', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const distinctColumns = ['distinct1', 'distinct2'];
      const filter = { arg: 'Value' };
      const options = { limit: 10, offset: 10 };
      // Act
      bigQuery.joinSalesCalculationFilterQueryObject(salesInputColumns, distinctColumns, filter, options);
      // Assert
      expect(catalogueIdsToParamsStub.called).to.be.true;
      expect(catalogueIdsToParamsStub.args[0][0]).to.deep.eq(query);
      expect(catalogueIdsToParamsStub.args[0][1]).to.deep.eq('releaseId IN ');
      expect(catalogueIdsToParamsStub.args[0][2]).to.deep.eq('releaseIds');

      done();
    });

    it('should call catalogueIdsToParams for trackIds', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const distinctColumns = ['distinct1', 'distinct2'];
      const filter = { arg: 'Value' };
      const options = { limit: 10, offset: 10 };
      // Act
      bigQuery.joinSalesCalculationFilterQueryObject(salesInputColumns, distinctColumns, filter, options);
      // Assert
      expect(catalogueIdsToParamsStub.called).to.be.true;
      expect(catalogueIdsToParamsStub.args[1][1]).to.deep.eq('trackId IN ');
      expect(catalogueIdsToParamsStub.args[1][2]).to.deep.eq('trackIds');

      done();
    });

    it('should call catalogueIdsToParams for workIds', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const distinctColumns = ['distinct1', 'distinct2'];
      const filter = { arg: 'Value' };
      const options = { limit: 10, offset: 10 };
      // Act
      bigQuery.joinSalesCalculationFilterQueryObject(salesInputColumns, distinctColumns, filter, options);
      // Assert
      expect(catalogueIdsToParamsStub.called).to.be.true;
      expect(catalogueIdsToParamsStub.args[2][1]).to.deep.eq('workId IN ');
      expect(catalogueIdsToParamsStub.args[2][2]).to.deep.eq('workIds');

      done();
    });

    it('should return the query', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const distinctColumns = ['distinct1', 'distinct2'];
      const filter = { arg: 'Value' };
      const options = { limit: 10, offset: 10 };
      // Act
      const result = bigQuery.joinSalesCalculationFilterQueryObject(salesInputColumns, distinctColumns, filter, options);
      // Assert
      expect(result).to.eq(query);

      done();
    });
  });

  describe('joinSalesCalculationFilter', () => {
    let filterQueryStub;
    let logQueryStub;
    let catalogueIdsToParamsStub;
    const query = testUtils.randomString();

    beforeEach(() => {
      filterQueryStub = sinon.stub(bigQuery, 'joinSalesCalculationFilterQuery');
      filterQueryStub.returns(query);

      catalogueIdsToParamsStub = sinon.stub(bigQuery, 'catalogueIdsToParams');
      catalogueIdsToParamsStub.returns();

      logQueryStub = sinon.stub(bigQuery, 'logQuery');
      logQueryStub.returns();
    });

    it('should call joinSalesCalculationFilterQuery', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const distinctColumns = ['distinct1', 'distinct2'];
      const filter = { arg: 'Value' };
      const options = { limit: 10, offset: 10 };
      // Act
      bigQuery.joinSalesCalculationFilter(salesInputColumns, distinctColumns, filter, options, (err, data) => {
        // Assert
        expect(filterQueryStub.called).to.be.true;
        expect(filterQueryStub.args[0][0]).to.deep.eq(salesInputColumns);
        expect(filterQueryStub.args[0][1]).to.deep.eq(distinctColumns);
        expect(filterQueryStub.args[0][2]).to.deep.eq(filter);
        expect(filterQueryStub.args[0][3]).to.deep.eq(options);

        done();
      });
    });

    it('should call catalogueIdsToParams for releaseIds', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const distinctColumns = ['distinct1', 'distinct2'];
      const filter = { arg: 'Value' };
      const options = { limit: 10, offset: 10 };
      // Act
      bigQuery.joinSalesCalculationFilter(salesInputColumns, distinctColumns, filter, options, (err, data) => {
        // Assert
        expect(catalogueIdsToParamsStub.called).to.be.true;
        expect(catalogueIdsToParamsStub.args[0][0]).to.deep.eq(query);
        expect(catalogueIdsToParamsStub.args[0][1]).to.deep.eq('releaseId IN ');
        expect(catalogueIdsToParamsStub.args[0][2]).to.deep.eq('releaseIds');

        done();
      });
    });

    it('should call catalogueIdsToParams for trackIds', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const distinctColumns = ['distinct1', 'distinct2'];
      const filter = { arg: 'Value' };
      const options = { limit: 10, offset: 10 };
      // Act
      bigQuery.joinSalesCalculationFilter(salesInputColumns, distinctColumns, filter, options, (err, data) => {
        // Assert
        expect(catalogueIdsToParamsStub.called).to.be.true;
        expect(catalogueIdsToParamsStub.args[1][1]).to.deep.eq('trackId IN ');
        expect(catalogueIdsToParamsStub.args[1][2]).to.deep.eq('trackIds');

        done();
      });
    });

    it('should call catalogueIdsToParams for workIds', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const distinctColumns = ['distinct1', 'distinct2'];
      const filter = { arg: 'Value' };
      const options = { limit: 10, offset: 10 };
      // Act
      bigQuery.joinSalesCalculationFilter(salesInputColumns, distinctColumns, filter, options, (err, data) => {
        // Assert
        expect(catalogueIdsToParamsStub.called).to.be.true;
        expect(catalogueIdsToParamsStub.args[2][1]).to.deep.eq('workId IN ');
        expect(catalogueIdsToParamsStub.args[2][2]).to.deep.eq('workIds');

        done();
      });
    });

    it('should call logQuery', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const distinctColumns = ['distinct1', 'distinct2'];
      const filter = { arg: 'Value' };
      const options = { limit: 10, offset: 10 };
      // Act
      bigQuery.joinSalesCalculationFilter(salesInputColumns, distinctColumns, filter, options, (err, data) => {
        // Assert
        expect(logQueryStub.called).to.be.true;
        expect(logQueryStub.args[0][0]).to.deep.eq(bigQuery.inputTable);
        expect(logQueryStub.args[0][1]).to.deep.eq(query.query);
        expect(logQueryStub.args[0][2]).to.deep.eq('Calculation');

        done();
      });
    });

    it('should call queryJob', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const distinctColumns = ['distinct1', 'distinct2'];
      const filter = { arg: 'Value' };
      const options = { limit: 10, offset: 10 };
      // Act
      bigQuery.joinSalesCalculationFilter(salesInputColumns, distinctColumns, filter, options, (err, data) => {
        // Assert
        expect(err).to.not.exist;
        expect(queryJobStub.called).to.be.true;
        expect(data).to.deep.eq([{ some: 'data' }]);
        done();
      });
    });
  });

  describe('joinSalesCalculationFilterQuery', () => {
    it('should form the right query without a filter or options', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const distinctColumns = ['distinct1', 'distinct2'];
      const filter = {};
      const options = {};
      // Act
      const query = bigQuery.joinSalesCalculationFilterQuery(salesInputColumns, distinctColumns, filter, options).replace(/\s+/g, ' ').replace(/\s+/g, ' ');
      const expctedQuery = `SELECT STRING_AGG(Output.contractId) AS contractIds, STRING_AGG(Output.releaseId) AS releaseIds, STRING_AGG(Output.catalogueIsrc) AS trackIsrcs, Input.input1, Input.input2 FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\` Input LEFT OUTER JOIN \`${bigQuery.datasetName}.${bigQuery.outputTable}\` Output ON (Output.salesLineId = Input.id) GROUP BY distinct1, distinct2`.replace(/\s+/g, ' ');
      // Assert
      expect(query).to.eq(expctedQuery);
      done();
    });

    it('should form the right query with a filter and without options', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const distinctColumns = ['distinct1', 'distinct2'];
      const filter = { arg: 'Value' };
      const options = {};
      // Act
      const query = bigQuery.joinSalesCalculationFilterQuery(salesInputColumns, distinctColumns, filter, options).replace(/\s+/g, ' ').replace(/\s+/g, ' ');
      const expctedQuery = `SELECT STRING_AGG(Output.contractId) AS contractIds, STRING_AGG(Output.releaseId) AS releaseIds, STRING_AGG(Output.catalogueIsrc) AS trackIsrcs, Input.input1, Input.input2 FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\` Input LEFT OUTER JOIN \`${bigQuery.datasetName}.${bigQuery.outputTable}\` Output ON (Output.salesLineId = Input.id) GROUP BY distinct1, distinct2 HAVING (arg = 'Value')`.replace(/\s+/g, ' ');
      // Assert
      expect(query).to.eq(expctedQuery);
      done();
    });

    it('should form the right query with a filter and a limit option', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const distinctColumns = ['distinct1', 'distinct2'];
      const filter = { arg: 'Value' };
      const options = { limit: 10 };
      // Act
      const query = bigQuery.joinSalesCalculationFilterQuery(salesInputColumns, distinctColumns, filter, options).replace(/\s+/g, ' ').replace(/\s+/g, ' ');
      const expctedQuery = `SELECT STRING_AGG(Output.contractId) AS contractIds, STRING_AGG(Output.releaseId) AS releaseIds, STRING_AGG(Output.catalogueIsrc) AS trackIsrcs, Input.input1, Input.input2 FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\` Input LEFT OUTER JOIN \`${bigQuery.datasetName}.${bigQuery.outputTable}\` Output ON (Output.salesLineId = Input.id) GROUP BY distinct1, distinct2 HAVING (arg = 'Value') LIMIT 10 OFFSET 0`.replace(/\s+/g, ' ');
      // Assert
      expect(query).to.eq(expctedQuery);
      done();
    });

    it('should form the right query with a filter and limit and offset options', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const distinctColumns = ['distinct1', 'distinct2'];
      const filter = { arg: 'Value' };
      const options = { limit: 10, offset: 10 };
      // Act
      const query = bigQuery.joinSalesCalculationFilterQuery(salesInputColumns, distinctColumns, filter, options).replace(/\s+/g, ' ').replace(/\s+/g, ' ');
      const expctedQuery = `SELECT STRING_AGG(Output.contractId) AS contractIds, STRING_AGG(Output.releaseId) AS releaseIds, STRING_AGG(Output.catalogueIsrc) AS trackIsrcs, Input.input1, Input.input2 FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\` Input LEFT OUTER JOIN \`${bigQuery.datasetName}.${bigQuery.outputTable}\` Output ON (Output.salesLineId = Input.id) GROUP BY distinct1, distinct2 HAVING (arg = 'Value') LIMIT 10 OFFSET 10`.replace(/\s+/g, ' ');
      // Assert
      expect(query).to.eq(expctedQuery);
      done();
    });
  });

  describe('joinSalesFilterQuery', () => {
    let filterQueryStub;
    let logQueryStub;
    const query = testUtils.randomString();

    beforeEach(() => {
      filterQueryStub = sinon.stub(bigQuery, 'joinSalesFilterQuery');
      filterQueryStub.returns(query);

      logQueryStub = sinon.stub(bigQuery, 'logQuery');
      logQueryStub.returns();
    });

    it('should call joinSalesCalculationFilterQuery', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const salesOutputColumns = ['output1', 'output2'];
      const filter = { filter: 'Value' };
      const contractIds = ['contractId'];
      const options = { orderBy: 'OrderBy' };
      // Act
      bigQuery.joinSalesFilter(salesInputColumns, salesOutputColumns, filter, contractIds, options, (err, data) => {
        // Assert
        expect(filterQueryStub.called).to.be.true;
        expect(filterQueryStub.args[0][0]).to.deep.eq(salesInputColumns);
        expect(filterQueryStub.args[0][1]).to.deep.eq(salesOutputColumns);
        expect(filterQueryStub.args[0][2]).to.deep.eq(filter);
        expect(filterQueryStub.args[0][3]).to.deep.eq(contractIds);
        expect(filterQueryStub.args[0][5]).to.deep.eq(options);

        done();
      });
    });

    it('should call logQuery', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const salesOutputColumns = ['output1', 'output2'];
      const filter = { filter: 'Value' };
      const contractIds = ['contractId'];
      const options = { orderBy: 'OrderBy' };
      // Act
      bigQuery.joinSalesFilter(salesInputColumns, salesOutputColumns, filter, contractIds, options, (err, data) => {
        // Assert
        expect(logQueryStub.called).to.be.true;
        expect(logQueryStub.args[0][0]).to.deep.eq(bigQuery.inputTable);
        expect(logQueryStub.args[0][1]).to.deep.eq(query);
        expect(logQueryStub.args[0][2]).to.deep.eq('Calculation');

        done();
      });
    });

    it('should call queryJob', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const salesOutputColumns = ['output1', 'output2'];
      const filter = { filter: 'Value' };
      const contractIds = ['contractId'];
      const options = { orderBy: 'OrderBy' };
      // Act
      bigQuery.joinSalesFilter(salesInputColumns, salesOutputColumns, filter, contractIds, options, (err, data) => {
        // Assert
        expect(err).to.not.exist;
        expect(queryJobStub.called).to.be.true;
        expect(data).to.deep.eq([{ some: 'data' }]);
        done();
      });
    });
  });

  describe('joinSalesFilterQuery', () => {
    it('should form the right query without a filter', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const salesOutputColumns = ['output1', 'output2'];
      const filter = {};
      const contractIds = 'contractId';
      const options = {};
      // Act
      const query = bigQuery.joinSalesFilterQuery(salesInputColumns, salesOutputColumns, filter, contractIds, options).replace(/\s+/g, ' ').trim();
      const expectedQuery = `SELECT STRING_AGG(Output.contractId, ', ') as contractIds, Input.input1, Input.input2, Output.output1, Output.output2 FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\` Input LEFT OUTER JOIN \`${bigQuery.datasetName}.${bigQuery.outputTable}\` Output ON (Output.salesLineId = Input.id) GROUP BY Input.input1, Input.input2, Output.output1, Output.output2 HAVING (Output.salesLineId IS NULL OR (Output.salesLineId IS NOT NULL AND contractIds NOT LIKE '%contractId%'))`.replace(/\s+/g, ' ').trim();
      // Assert
      expect(query).to.eq(expectedQuery);
      done();
    });

    it('should form the right query with a filter', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const salesOutputColumns = ['output1', 'output2'];
      const filter = { arg: 'Value' };
      const contractIds = 'contractId';
      const options = {};
      // Act
      const query = bigQuery.joinSalesFilterQuery(salesInputColumns, salesOutputColumns, filter, contractIds, options).replace(/\s+/g, ' ').trim();
      const expectedQuery = `SELECT STRING_AGG(Output.contractId, ', ') as contractIds, Input.input1, Input.input2, Output.output1, Output.output2 FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\` Input LEFT OUTER JOIN \`${bigQuery.datasetName}.${bigQuery.outputTable}\` Output ON (Output.salesLineId = Input.id) GROUP BY Input.input1, Input.input2, Output.output1, Output.output2 HAVING (Output.salesLineId IS NULL OR (Output.salesLineId IS NOT NULL AND contractIds NOT LIKE '%contractId%')) AND arg = 'Value'`.replace(/\s+/g, ' ').trim();
      // Assert
      expect(query).to.eq(expectedQuery);
      done();
    });

    it('should form the right query with a filter and array of contract Ids', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const salesOutputColumns = ['output1', 'output2'];
      const filter = { arg: 'Value' };
      const contractIds = ['contractId1', 'contractId2'];
      const options = {};
      // Act
      const query = bigQuery.joinSalesFilterQuery(salesInputColumns, salesOutputColumns, filter, contractIds, options).replace(/\s+/g, ' ').trim();
      const expectedQuery = `SELECT STRING_AGG(Output.contractId, ', ') as contractIds, Input.input1, Input.input2, Output.output1, Output.output2 FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\` Input LEFT OUTER JOIN \`${bigQuery.datasetName}.${bigQuery.outputTable}\` Output ON (Output.salesLineId = Input.id) GROUP BY Input.input1, Input.input2, Output.output1, Output.output2 HAVING (Output.salesLineId IS NULL OR (Output.salesLineId IS NOT NULL AND contractIds NOT LIKE '%contractId1%' AND contractIds NOT LIKE '%contractId2%')) AND arg = 'Value'`.replace(/\s+/g, ' ').trim();
      // Assert
      expect(query).to.eq(expectedQuery);
      done();
    });
  });

  describe('joinAccountsFilterQuery', () => {
    it('should form the right query without a filter or options', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const salesOutputColumns = ['output1', 'output2'];
      const filter = {};
      const options = {};
      // Act
      const query = bigQuery.joinAccountsFilterQuery(salesInputColumns, salesOutputColumns, filter, options).replace(/\s+/g, ' ').replace(/\s+/g, ' ').trim();
      const expctedQuery = `SELECT ${[].concat(bigQuery.formatJoinColumnsSelect('Input', salesInputColumns), bigQuery.formatJoinColumnsSelect('Output', salesOutputColumns)).join(', ')}
      FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\` Input
      LEFT OUTER JOIN \`${bigQuery.datasetName}.${bigQuery.accountingTable}\` Output
      ON (Output.salesLineId = Input.id)
      GROUP BY ${[].concat(bigQuery.formatJoinColumnsGroupBy('Input', salesInputColumns), bigQuery.formatJoinColumnsGroupBy('Output', salesOutputColumns)).join(', ')}
      HAVING (Output.salesLineId IS NULL)`.replace(/\s+/g, ' ').trim();
      // Assert
      expect(query).to.eq(expctedQuery);
      done();
    });

    it('should form the right query with a filter and without options', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const salesOutputColumns = ['output1', 'output2'];
      const filter = { arg: 'Value' };
      const options = {};
      // Act
      const query = bigQuery.joinAccountsFilterQuery(salesInputColumns, salesOutputColumns, filter, options).replace(/\s+/g, ' ').replace(/\s+/g, ' ').trim();
      const expctedQuery = `SELECT ${[].concat(bigQuery.formatJoinColumnsSelect('Input', salesInputColumns), bigQuery.formatJoinColumnsSelect('Output', salesOutputColumns)).join(', ')}
      FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\` Input
      LEFT OUTER JOIN \`${bigQuery.datasetName}.${bigQuery.accountingTable}\` Output
      ON (Output.salesLineId = Input.id)
      GROUP BY ${[].concat(bigQuery.formatJoinColumnsGroupBy('Input', salesInputColumns), bigQuery.formatJoinColumnsGroupBy('Output', salesOutputColumns)).join(', ')}
      HAVING (Output.salesLineId IS NULL) AND ${bigQuery.filterFromObject(filter)}`.replace(/\s+/g, ' ').trim();
      // Assert
      expect(query).to.eq(expctedQuery);
      done();
    });

    it('should form the right query with a filter and a limit option', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const salesOutputColumns = ['output1', 'output2'];
      const filter = { arg: 'Value' };
      const options = { limit: 10 };
      // Act
      const query = bigQuery.joinAccountsFilterQuery(salesInputColumns, salesOutputColumns, filter, options).replace(/\s+/g, ' ').replace(/\s+/g, ' ').trim();
      const expctedQuery = `SELECT ${[].concat(bigQuery.formatJoinColumnsSelect('Input', salesInputColumns), bigQuery.formatJoinColumnsSelect('Output', salesOutputColumns)).join(', ')}
      FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\` Input
      LEFT OUTER JOIN \`${bigQuery.datasetName}.${bigQuery.accountingTable}\` Output
      ON (Output.salesLineId = Input.id)
      GROUP BY ${[].concat(bigQuery.formatJoinColumnsGroupBy('Input', salesInputColumns), bigQuery.formatJoinColumnsGroupBy('Output', salesOutputColumns)).join(', ')}
      HAVING (Output.salesLineId IS NULL) AND ${bigQuery.filterFromObject(filter)}
      LIMIT ${options.limit}`.replace(/\s+/g, ' ').trim();
      // Assert
      expect(query).to.eq(expctedQuery);
      done();
    });

    it('should form the right query with a filter and limit and offset options', (done) => {
      // Arrange
      const salesInputColumns = ['input1', 'input2'];
      const salesOutputColumns = ['output1', 'output2'];
      const filter = { arg: 'Value' };
      const options = { limit: 10, offset: 10 };
      // Act
      const query = bigQuery.joinAccountsFilterQuery(salesInputColumns, salesOutputColumns, filter, options).replace(/\s+/g, ' ').replace(/\s+/g, ' ').trim();
      const expctedQuery = `SELECT ${[].concat(bigQuery.formatJoinColumnsSelect('Input', salesInputColumns), bigQuery.formatJoinColumnsSelect('Output', salesOutputColumns)).join(', ')}
      FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\` Input
      LEFT OUTER JOIN \`${bigQuery.datasetName}.${bigQuery.accountingTable}\` Output
      ON (Output.salesLineId = Input.id)
      GROUP BY ${[].concat(bigQuery.formatJoinColumnsGroupBy('Input', salesInputColumns), bigQuery.formatJoinColumnsGroupBy('Output', salesOutputColumns)).join(', ')}
      HAVING (Output.salesLineId IS NULL) AND ${bigQuery.filterFromObject(filter)}
      LIMIT ${options.limit}
      OFFSET ${options.offset}`.replace(/\s+/g, ' ').trim();
      // Assert
      expect(query).to.eq(expctedQuery);
      done();
    });
  });

  // TODO: Maybe test each individual error code?
  describe('query', () => {
    beforeEach(() => {
      bigQueryClientQueryStub = sinon.stub(bigQueryClient, 'query').resolves([{ some: 'data' }]);
    });

    it('should call bigQueryClient.query', (done) => {
      // Arrange
      const query = testUtils.randomString();
      // Act
      bigQuery.query(query, (err, data) => {
        // Assert
        expect(bigQueryClientQueryStub.called).to.be.true;
        done();
      });
    });

    it('should call bigQueryClient.queryPromisify', async () => {
      // Arrange
      const query = testUtils.randomString();
      // Act
      const result = await bigQuery.queryPromisify(query);

      expect(bigQueryClientQueryStub.called).to.be.true;
    });

    it('should return the result when bigQueryClient resolves', (done) => {
      // Arrange
      const query = testUtils.randomString();
      // Act
      bigQuery.query(query, (err, data) => {
        // Assert
        expect(err).to.be.null;
        expect(data).to.not.be.null;
        expect(data).to.deep.equal({ some: 'data' });
        done();
      });
    });

    it('should return the result when queryPomisify resolves', async () => {
      // Arrange
      const query = testUtils.randomString();
      // Act
      try {
        const result = await bigQuery.queryPromisify(query);
        expect(result).to.not.be.null;
        expect(result).to.deep.equal({ some: 'data' });
      } catch (e) {
        expect.fail('queryPromisify should not throw an error');
      }
    });

    it('should return an error when bigQueryClient rejects', (done) => {
      // Arrange
      const query = testUtils.randomString();
      bigQueryClientQueryStub.restore();
      const error = { code: testUtils.randomInt(), message: testUtils.randomString() };
      bigQueryClientQueryStub = sinon.stub(bigQueryClient, 'query').rejects(error);
      // Act
      bigQuery.query(query, (err, data) => {
        // Assert
        expect(err).to.not.be.null;
        expect(err).to.deep.eq(error);
        expect(data).to.not.exist;
        done();
      });
    });

    it('should return an error when queryPomisify rejects', async () => {
      // Arrange
      const query = testUtils.randomString();
      bigQueryClientQueryStub.restore();
      const error = { code: testUtils.randomInt(), message: testUtils.randomString() };
      bigQueryClientQueryStub = sinon.stub(bigQueryClient, 'query').rejects(error);
      // Act
      try {
        await bigQuery.queryPromisify(query);
        expect.fail('queryPromisify should have thrown an error');
      } catch (e) {
        expect(e).to.deep.eq(error);
      }
    });

    it('should retry when bigQueryClient returns an error', (done) => {
      // Arrange
      const query = testUtils.randomString();
      const code = testUtils.randomInt();
      const message = testUtils.randomString();
      bigQueryClientQueryStub.restore();
      bigQueryClientQueryStub = sinon.stub(bigQueryClient, 'query').rejects({ code, message });
      // Reject with a different error after 2s to exit the loop.
      setTimeout(() => bigQueryClientQueryStub.rejects({ code: testUtils.randomInt(), message: testUtils.randomString() }), 100);
      // Act
      bigQuery.query(query, () => {
        // Assert
        expect(bigQueryClientQueryStub.callCount).not.to.be.lessThan(2);
        done();
      });
    });

    it('should not retry the error more than 3 times', (done) => {
      // Arrange
      const query = testUtils.randomString();
      const code = testUtils.randomInt();
      const message = testUtils.randomString();
      bigQueryClientQueryStub.restore();
      bigQueryClientQueryStub = sinon.stub(bigQueryClient, 'query').rejects({ code, message });
      // Act
      bigQuery.query(query, () => {
        // Assert
        expect(bigQueryClientQueryStub.callCount).not.to.be.greaterThan(4);
        done();
      });
    });
  });

  describe('queryJob', () => {
    let createQueryJobStub;
    let getQueryResultsStub;

    beforeEach(() => {
      queryJobStub.restore();

      getQueryResultsStub = sinon.stub().resolves([{ getQueryResults: 'Result' }]);

      createQueryJobStub = sinon
        .stub(bigQueryClient, 'createQueryJob')
        .resolves([{ getQueryResults: getQueryResultsStub }]);
    });

    it('should call bigQueryClient.query', (done) => {
      // Arrange
      const query = testUtils.randomString();
      // Act
      bigQuery.queryJob(query, (err, data) => {
        // Assert
        expect(createQueryJobStub.called).to.be.true;
        done();
      });
    });

    it('should return the result when bigQueryClient resolves', (done) => {
      // Arrange
      const query = testUtils.randomString();
      // Act
      bigQuery.queryJob(query, (err, data) => {
        // Assert
        expect(err).to.be.null;
        expect(data).to.not.be.null;
        expect(data).to.deep.equal({ getQueryResults: 'Result' });
        done();
      });
    });

    it('should return an error when bigQueryClient rejects', (done) => {
      // Arrange
      const query = testUtils.randomString();
      const error = { code: testUtils.randomInt(), message: testUtils.randomString() };
      createQueryJobStub.rejects(error);
      // Act
      bigQuery.queryJob(query, (err, data) => {
        // Assert
        expect(err).to.not.be.null;
        expect(err).to.deep.eq(error);
        expect(data).to.not.exist;
        done();
      });
    });
  });

  describe('queryDryRun', () => {
    beforeEach(() => {
      bigQueryClientCreateJobStub = sinon.stub(bigQueryClient, 'createJob').resolves([{ metadata: { status: 'Status', statistics: 'Statistics' } }]);
    });

    it('should call bigQueryClient.queryDryRun', (done) => {
      // Arrange
      const query = testUtils.randomString();
      // Act
      bigQuery.queryDryRun(query, (err, data) => {
        // Assert
        expect(bigQueryClientCreateJobStub.called).to.be.true;
        done();
      });
    });

    it('should return the result when bigQueryClient resolves', (done) => {
      // Arrange
      const query = testUtils.randomString();
      // Act
      bigQuery.queryDryRun(query, (err, data) => {
        // Assert
        expect(err).to.be.null;
        expect(data).to.not.be.null;
        expect(data).to.deep.equal({ status: 'Status', statistics: 'Statistics' });
        done();
      });
    });

    it('should return an error when bigQueryClient rejects', (done) => {
      // Arrange
      const query = testUtils.randomString();
      bigQueryClientCreateJobStub.restore();
      const error = [testUtils.randomString()];
      bigQueryClientCreateJobStub = sinon.stub(bigQueryClient, 'createJob').rejects(error);
      // Act
      bigQuery.queryDryRun(query, (err, data) => {
        // Assert
        expect(err).to.not.be.null;
        expect(err).to.deep.eq(error);
        expect(data).to.not.exist;
        done();
      });
    });
  });

  describe('writeFileToDb', function () {
    const error = testUtils.randomString();
    beforeEach((done) => {
      bigQueryClientDatasetStub = sinon.stub(bigQueryClient, 'dataset').returns({
        dataset: sinon.stub().returnsThis(),
        table: sinon.stub().returns({
          load: sinon.stub().resolves([{ errors: error }]),
        }),
      });

      bigQuery.setupFile(done);
    });

    it('should call bigQueryClient.dataset', (done) => {
      // Arrange
      const table = 'table';
      // Act
      bigQuery.writeFileToDb(table, (err, data) => {
        // Assert
        expect(bigQueryClientDatasetStub.called).to.be.true;
        done();
      });
    });

    it('should return the errors', (done) => {
      // Arrange
      const table = 'table';
      // Act
      bigQuery.writeFileToDb(table, (err, data) => {
        // Assert
        expect(err).to.not.be.null;
        expect(err).to.eq(error);
        done();
      });
    });

    it('should return the job if no errors', (done) => {
      // Arrange
      const table = 'table';
      bigQueryClientDatasetStub.returns({
        dataset: sinon.stub().returnsThis(),
        table: sinon.stub().returns({
          load: sinon.stub().resolves([{ job: 'some Job' }]),
        }),
      });
      // Act
      bigQuery.writeFileToDb(table, (err, data) => {
        // Assert
        expect(err).to.be.null;
        expect(data).to.deep.equal({ job: 'some Job' });
        done();
      });
    });

    it('should delete the file if no errors', (done) => {
      // Arrange
      const data = ['line 1', 'line 2', 'line 3'];
      const table = 'table';
      bigQueryClientDatasetStub.returns({
        dataset: sinon.stub().returnsThis(),
        table: sinon.stub().returns({
          load: sinon.stub().resolves([{ job: 'some Job' }]),
        }),
      });
      // Act
      bigQuery.setupFile(() => {
        bigQuery.writeToFile(data, () => {
          bigQuery.writeFileToDb(table, () => {
            // Assert
            expect(fs.existsSync(bigQuery.fileLocation)).to.equal(false);
            done();
          });
        });
      });
    });
  });

  describe('createDataset', () => {
    beforeEach(() => {
      bigQueryClientCreateDatasetStub = sinon.stub(bigQueryClient, 'createDataset').resolves([{ some: 'data' }]);
    });

    it('should call bigQueryClient.createDataset', (done) => {
      // Arrange
      const datasetName = 'newDataSet';
      // Act
      bigQuery.createDataset(datasetName, (err, data) => {
        // Assert
        expect(err).to.not.exist;
        expect(bigQueryClientCreateDatasetStub.called).to.be.true;
        done();
      });
    });

    it('should update the dataset name', (done) => {
      // Arrange
      const datasetName = 'newDataSetName';
      // Act
      bigQuery.createDataset(datasetName, (err, data) => {
        // Assert
        expect(err).to.not.exist;
        expect(bigQuery.datasetName).to.eq('newDataSetName');
        done();
      });
    });

    it('should return the dataset name', (done) => {
      // Arrange
      const datasetName = 'newDataSetName';
      // Act
      bigQuery.createDataset(datasetName, (err, data) => {
        // Assert
        expect(err).to.not.exist;
        expect(data).to.eq('newDataSetName');
        done();
      });
    });

    it('should return errors', (done) => {
      // Arrange
      const datasetName = 'newDataSetName';
      bigQueryClientCreateDatasetStub.rejects(Error('Dataset Error'));
      // Act
      bigQuery.createDataset('newDataSetName', (err, data) => {
        // Assert
        expect(err).to.not.be.null;
        expect(err.message).to.eq('Dataset Error');
        done();
      });
    });
  });

  describe('createTable', () => {
    beforeEach(() => {
      bigQueryClientDatasetStub = sinon.stub(bigQueryClient, 'dataset').returns({
        dataset: sinon.stub().returnsThis(),
        createTable: sinon.stub().resolves([{ table: 'Table' }]),
      });
    });

    it('should call bigQueryClient.dataset', (done) => {
      // Arrange
      const table = 'table';
      const schema = {};
      const partitionColumn = null;
      // Act
      bigQuery.createTable(table, schema, partitionColumn, (err, data) => {
        // Assert
        expect(bigQueryClientDatasetStub.called).to.be.true;
        done();
      });
    });

    it('should return the table', (done) => {
      // Arrange
      const table = 'table';
      const schema = {};
      const partitionColumn = null;
      // Act
      bigQuery.createTable(table, schema, partitionColumn, (err, data) => {
        // Assert
        expect(data).to.deep.eq({ table: 'Table' });
        done();
      });
    });

    describe('when dataset.createTable returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const table = 'table';
        const schema = {};
        const partitionColumn = null;

        bigQueryClientDatasetStub.returns({
          dataset: sinon.stub().returnsThis(),
          createTable: sinon.stub().rejects(),
        });

        // Act
        bigQuery.createTable(table, schema, partitionColumn, (err, data) => {
          // Assert
          expect(data).to.not.exist;
          expect(err).to.exist;
          done();
        });
      });
    });

    describe('when partitionColumn is defined', () => {
      it('should add rangePartitioning to the createTableOptions', (done) => {
        // Arrange
        const table = 'table';
        const schema = {};
        const partitionColumn = 'partitionColumn';
        const rangePartitioning = {
          field: partitionColumn,
          range: {
            start: 1,
            end: 1000,
            interval: 1,
          },
        };
        const createTableSpy = sinon.spy((tableName, createTableOptions) => {});
        bigQueryClientDatasetStub.returns({
          dataset: sinon.stub().returnsThis(),
          createTable: createTableSpy,
        });

        // Act
        bigQuery.createTable(table, schema, partitionColumn, () => {
          // Assert
          expect(createTableSpy.args[0][1].rangePartitioning).to.deep.eq(rangePartitioning);
          done();
        });
      });
    });
  });

  describe('createTempTable', () => {
    let tableName; let schema; let partitionColumn; let expirationTime;
    let createTableSpy;
    beforeEach(() => {
      tableName = testUtils.randomString();
      schema = [{ name: testUtils.randomString(), type: testUtils.randomString() }];
      partitionColumn = null;
      expirationTime = testUtils.randomDate();
      createTableSpy = sinon.spy(() => [tableName]);
      bigQueryClientDatasetStub = sinon.stub(bigQueryClient, 'dataset').returns({
        dataset: sinon.stub().returnsThis(),
        createTable: createTableSpy,
      });
    });

    describe('when `tableName` is missing from params', () => {
      it('should throw an error', async () => {
        // Arrange
        const expectedError = new Error('Missing required parameters');
        tableName = undefined;
        let thrownError;

        // Act
        const data = await bigQuery.createTempTable({ tableName, schema, partitionColumn, expirationTime }).catch((err) => {
          thrownError = err;
        });

        // Assert
        expect(data).to.not.exist;
        expect(thrownError).to.exist;
        expect(thrownError.message).to.eq(expectedError.message);
      });
    });
    describe('when `schema` is missing from params', () => {
      it('should throw an error', async () => {
        // Arrange
        const expectedError = new Error('Missing required parameters');
        schema = undefined;
        let thrownError;

        // Act
        const data = await bigQuery.createTempTable({ tableName, schema, partitionColumn, expirationTime }).catch((err) => {
          thrownError = err;
        });

        // Assert
        expect(data).to.not.exist;
        expect(thrownError).to.exist;
        expect(thrownError.message).to.eq(expectedError.message);
      });
    });
    describe('when `expirationTime` is missing from params', () => {
      it('should throw an error', async () => {
        // Arrange
        const expectedError = new Error('Missing required parameters');
        expirationTime = undefined;
        let thrownError;

        // Act
        const data = await bigQuery.createTempTable({ tableName, schema, partitionColumn, expirationTime }).catch((err) => {
          thrownError = err;
        });

        // Assert
        expect(data).to.not.exist;
        expect(thrownError).to.exist;
        expect(thrownError.message).to.eq(expectedError.message);
      });
    });

    it('should call bigQueryClient.dataset with the correct params', async () => {
      // Act
      await bigQuery.createTempTable({ tableName, schema, partitionColumn, expirationTime });
      // Assert
      expect(bigQueryClientDatasetStub.called).to.be.true;
      expect(bigQueryClientDatasetStub.args[0][0]).to.eq(bigQuery.datasetName);
    });

    it('should call dataset.createTable with the correct params', async () => {
      // Act
      await bigQuery.createTempTable({ tableName, schema, partitionColumn, expirationTime });
      // Assert
      expect(createTableSpy.args[0][1]).to.deep.eq({
        schema,
        expirationTime,
      });
    });

    it('should return the output from dataset.createTable', async () => {
      // Act
      const data = await bigQuery.createTempTable({ tableName, schema, partitionColumn, expirationTime });
      expect(data).to.deep.eq(tableName);
    });

    it('should add a unique suffix to the table name', async () => {
      // Arrange
      const uuidV4withoutHyphensRegex = '[a-z0-9]{12}4[a-z0-9]{19}';
      const outputRegex = new RegExp(`^${tableName}_${uuidV4withoutHyphensRegex}$`);
      // Act
      await bigQuery.createTempTable({ tableName, schema, partitionColumn, expirationTime });
      // Assert
      expect(outputRegex.test(createTableSpy.args[0][0])).to.be.true;
    });

    describe('when dataset.createTable returns undefined', () => {
      it('should throw an error', async () => {
        // Arrange
        const expectedError = new Error(`Failed to create Table ${tableName}`);
        bigQueryClientDatasetStub.returns({
          dataset: sinon.stub().returnsThis(),
          createTable: sinon.stub(() => undefined),
        });
        let thrownError;

        // Act
        const data = await bigQuery.createTempTable({ tableName, schema, partitionColumn, expirationTime }).catch((err) => {
          thrownError = err;
        });

        // Assert
        expect(data).to.not.exist;
        expect(thrownError).to.exist;
        expect(thrownError.message).to.eq(expectedError.message);
      });
    });
    describe('when dataset.createTable returns an empty array', () => {
      it('should throw an error', async () => {
        // Arrange
        const expectedError = new Error(`Failed to create Table ${tableName}`);
        bigQueryClientDatasetStub.returns({
          dataset: sinon.stub().returnsThis(),
          createTable: sinon.stub(() => []),
        });
        let thrownError;

        // Act
        const data = await bigQuery.createTempTable({ tableName, schema, partitionColumn, expirationTime }).catch((err) => {
          thrownError = err;
        });

        // Assert
        expect(data).to.not.exist;
        expect(thrownError).to.exist;
        expect(thrownError.message).to.eq(expectedError.message);
      });
    });

    describe('when dataset.createTable returns an error', () => {
      it('should throw an error', async () => {
        // Arrange
        const expectedError = testUtils.randomError();
        bigQueryClientDatasetStub.returns({
          dataset: sinon.stub().returnsThis(),
          createTable: sinon.stub().rejects(expectedError),
        });
        let thrownError;

        // Act
        const data = await bigQuery.createTempTable({ tableName, schema, partitionColumn, expirationTime }).catch((err) => {
          thrownError = err;
        });

        // Assert
        expect(data).to.not.exist;
        expect(thrownError).to.exist;
        expect(thrownError.message).to.eq(expectedError.message);
      });
    });

    describe('when partitionColumn is defined', () => {
      it('should add rangePartitioning to the createTableOptions', async () => {
        // Arrange
        partitionColumn = testUtils.randomString();
        const expectedRangePartitioning = {
          field: partitionColumn,
          range: {
            start: 1,
            end: 1000,
            interval: 1,
          },
        };
        // Act
        await bigQuery.createTempTable({ tableName, schema, partitionColumn, expirationTime });
        // Assert
        expect(createTableSpy.args[0][1].rangePartitioning).to.deep.eq(expectedRangePartitioning);
      });
    });
  });

  describe('updateSchema', () => {
    beforeEach(() => {
      bigQueryClientDatasetStub = sinon.stub(bigQueryClient, 'dataset').returns({
        dataset: sinon.stub().returnsThis(),
        table: sinon.stub().returns({
          getMetadata: sinon.stub().resolves([{ table: 'Table' }]),
          setMetadata: sinon.stub().resolves([{ result: 'Set Metadata' }]),
        }),
      });
    });

    it('should call bigQueryClient.dataset', (done) => {
      // Arrange
      const table = 'table';
      const schema = {};
      // Act
      bigQuery.updateSchema(table, schema, (err, data) => {
        // Assert
        expect(bigQueryClientDatasetStub.called).to.be.true;
        done();
      });
    });

    it('should return result', (done) => {
      // Arrange
      const table = 'table';
      const schema = {};
      // Act
      bigQuery.updateSchema(table, schema, (err, data) => {
        // Assert
        expect(err).to.not.exist;
        expect(data).to.deep.eq({ result: 'Set Metadata' });
        done();
      });
    });

    it('should return errors on getMetadata', (done) => {
      // Arrange
      const table = 'table';
      const schema = {};
      bigQueryClientDatasetStub.returns({
        dataset: sinon.stub().returnsThis(),
        table: sinon.stub().returns({
          getMetadata: sinon.stub().rejects([{ error: 'getMetadata' }]),
          setMetadata: sinon.stub().resolves([{ result: 'Set Metadata' }]),
        }),
      });

      // Act
      bigQuery.updateSchema(table, schema, (err, data) => {
        // Assert
        expect(err).to.exist;
        expect(err).to.deep.eq([{ error: 'getMetadata' }]);
        done();
      });
    });

    it('should return errors on setMetadata', (done) => {
      // Arrange
      const table = 'table';
      const schema = {};
      bigQueryClientDatasetStub.returns({
        dataset: sinon.stub().returnsThis(),
        table: sinon.stub().returns({
          getMetadata: sinon.stub().resolves([{ result: 'getMetadata' }]),
          setMetadata: sinon.stub().rejects([{ error: 'setMetadata' }]),
        }),
      });
      // Act
      bigQuery.updateSchema(table, schema, (err, data) => {
        // Assert
        expect(err).to.exist;
        expect(err).to.deep.eq([{ error: 'setMetadata' }]);
        done();
      });
    });
  });

  describe('logQuery', () => {
    // Arrange
    const table = 'Table 1';
    const query = 'Query';
    const type = 'Type';

    let queryDryRunStub;
    const tableStub = sinon.stub();
    const insertStub = sinon.stub();

    beforeEach(() => {
      bigQueryClientDatasetStub = sinon.stub(bigQueryClient, 'dataset').returns({
        dataset: sinon.stub().returnsThis(),
        table: tableStub.returnsThis(),
        insert: insertStub.returnsThis(),
      });

      queryDryRunStub = sinon.stub(bigQuery, 'queryDryRun');
      queryDryRunStub.yields(null, { metadata: true });
    });

    it('should call queryDryRun', (done) => {
      // Act
      bigQuery.logQuery(table, query, type, (err) => {
        // Assert
        expect(queryDryRunStub.called).to.be.true;
        done();
      });
    });

    describe('when queryDryRun returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const error = 'Query Dry Run Error';
        queryDryRunStub.yields(error);
        // Act
        bigQuery.logQuery(table, query, type, (err) => {
        // Assert
          expect(err).to.eq(error);
          done();
        });
      });
    });

    describe('when queryDryRun returns metadata', () => {
      it('should call the QueryLogs dataset', (done) => {
        // Act
        bigQuery.logQuery(table, query, type, () => {
          // Assert
          expect(bigQueryClientDatasetStub.args[0][0]).to.eq('QueryLogs');
          done();
        });
      });

      it('should call the QueryLogsA table', (done) => {
        // Act
        bigQuery.logQuery(table, query, type, () => {
          // Assert
          expect(tableStub.args[0][0]).to.eq('QueryLogsA');
          done();
        });
      });
      // TODO: insert stub not called, get back to it.
      // it('should insert a log into the logs table', () => {
      //   // Act
      //   bigQuery.logQuery(table, query, type, (err) => {
      //     // Assert
      //     console.log(insertStub.called);
      //   });
      // });
      // TODO: insert stub not called, get back to it.
      // describe('when query is not a string', () => {
      //   it('should use query.query', (err) => {
      //     // Arrange
      //     const query = { query: 'Query' };
      //     // Act
      //     bigQuery.logQuery(table, query, type, (err) => {
      //     // Assert
      //       console.log(insertStub.called);
      //     });
      //   });
      // });
    });
  });

  describe('getCount', () => {
    // Arrange
    let catalogueIdsToParamsStub;
    let logQueryStub;

    const table = 'Table1';
    const countColumn = 'CountColumn';
    const filter = { field1: 'value1' };
    let expectedQuery;

    beforeEach(() => {
      expectedQuery = `SELECT  SUM(1) AS ${countColumn} FROM \`${bigQuery.datasetName}.${table}\` WHERE ${bigQuery.filterFromObject(filter)} `;
      catalogueIdsToParamsStub = sinon.stub(bigQuery, 'catalogueIdsToParams');
      catalogueIdsToParamsStub.returns(expectedQuery);
      logQueryStub = sinon.stub(bigQuery, 'logQuery');
    });

    it('should form the right query', (done) => {
      // Act
      bigQuery.getCount(table, countColumn, filter, (err) => {
        // Assert
        expect(catalogueIdsToParamsStub.args[0][0]).to.eq(expectedQuery);
        done();
      });
    });

    it('should call catalogueIdsToParams for releaseIds', (done) => {
      // Act
      bigQuery.getCount(table, countColumn, filter, (err) => {
        // Assert
        expect(catalogueIdsToParamsStub.args[0][1]).to.eq('releaseId IN ');
        expect(catalogueIdsToParamsStub.args[0][2]).to.eq('releaseIds');
        done();
      });
    });

    it('should call catalogueIdsToParams for trackIds', (done) => {
      // Act
      bigQuery.getCount(table, countColumn, filter, (err) => {
        // Assert
        expect(catalogueIdsToParamsStub.args[1][1]).to.eq('trackId IN ');
        expect(catalogueIdsToParamsStub.args[1][2]).to.eq('trackIds');
        done();
      });
    });

    it('should call catalogueIdsToParams for workIds', (done) => {
      // Act
      bigQuery.getCount(table, countColumn, filter, (err) => {
        // Assert
        expect(catalogueIdsToParamsStub.args[2][1]).to.eq('workId IN ');
        expect(catalogueIdsToParamsStub.args[2][2]).to.eq('workIds');
        done();
      });
    });

    it('should call logQuery with the right args', (done) => {
      // Act
      bigQuery.getCount(table, countColumn, filter, (err) => {
        // Assert
        expect(logQueryStub.args[0][0]).to.eq(table);
        expect(logQueryStub.args[0][1]).to.eq(expectedQuery);
        expect(logQueryStub.args[0][2]).to.eq('Calculation');
        done();
      });
    });

    it('should call queryJob with the right args', (done) => {
      // Act
      bigQuery.getCount(table, countColumn, filter, (err) => {
        // Assert
        expect(queryJobStub.args[0][0]).to.eq(expectedQuery);
        done();
      });
    });
  });

  describe('getDataQuery', () => {
    // Arrange
    let selectQueryFromArrayStub;
    let filterFromObjectStub;

    const table = 'Table1';
    const select = 'column';
    const filter = 'filter';
    const selectQuery = 'SELECT_QUERY';
    const filterQuery = 'FILTER_QUERY';

    beforeEach(() => {
      selectQueryFromArrayStub = sinon.stub(bigQuery, 'selectQueryFromArray');
      selectQueryFromArrayStub.returns(selectQuery);
      filterFromObjectStub = sinon.stub(bigQuery, 'filterFromObject');
      filterFromObjectStub.returns(filterQuery);
    });

    describe('when no options are passed', () => {
      it('should return the formatted query', (done) => {
        // Arrange
        const options = null;
        // Act
        const query = bigQuery.getDataQuery(table, select, filter, options).replace(/\s/g, '');
        const expectedQuery = `SELECT ${selectQuery} FROM \`${bigQuery.datasetName}.${table}\` WHERE ${filterQuery}`.replace(/\s/g, '');
        // Assert
        expect(query).to.eq(expectedQuery);
        done();
      });
    });

    describe('when options are passed', () => {
      describe('when options.orderBy is an array', () => {
        it('should return the formatted query', (done) => {
          // Arrange
          const options = {
            orderBy: ['orderBy1', 'orderBy2'],
          };
          // Act
          const query = bigQuery.getDataQuery(table, select, filter, options).replace(/\s/g, '');
          const expectedQuery = `SELECT ${selectQuery} FROM \`${bigQuery.datasetName}.${table}\` WHERE ${filterQuery} ORDER BY ${options.orderBy.join(', ')} `.replace(/\s/g, '');
          // Assert
          expect(query).to.eq(expectedQuery);
          done();
        });
      });

      describe('when options.orderBy is a string', () => {
        it('should return the formatted query', (done) => {
          // Arrange
          const options = {
            orderBy: 'orderBy1',
          };
          // Act
          const query = bigQuery.getDataQuery(table, select, filter, options).replace(/\s/g, '');
          const expectedQuery = `SELECT ${selectQuery} FROM \`${bigQuery.datasetName}.${table}\` WHERE ${filterQuery} ORDER BY ${options.orderBy} ASC`.replace(/\s/g, '');
          // Assert
          expect(query).to.eq(expectedQuery);
          done();
        });

        describe('when options.orderDir is set', () => {
          it('should return the formatted query', (done) => {
            // Arrange
            const options = {
              orderBy: 'orderBy1',
              orderDir: 'orderDir1',
            };
            // Act
            const query = bigQuery.getDataQuery(table, select, filter, options).replace(/\s/g, '');
            const expectedQuery = `SELECT ${selectQuery} FROM \`${bigQuery.datasetName}.${table}\` WHERE ${filterQuery} ORDER BY ${options.orderBy} ${options.orderDir}`.replace(/\s/g, '');
            // Assert
            expect(query).to.eq(expectedQuery);
            done();
          });
        });
      });

      describe('when options.limit is passed', () => {
        it('should return the formatted query', (done) => {
          // Arrange
          const options = {
            orderBy: 'orderBy1',
            orderDir: 'orderDir1',
            limit: 100,
          };
          // Act
          const query = bigQuery.getDataQuery(table, select, filter, options).replace(/\s/g, '');
          const expectedQuery = `SELECT ${selectQuery} FROM \`${bigQuery.datasetName}.${table}\` WHERE ${filterQuery} ORDER BY ${options.orderBy} ${options.orderDir}  LIMIT ${options.limit}`.replace(/\s/g, '');
          // Assert
          expect(query).to.eq(expectedQuery);
          done();
        });
      });

      describe('when options.offset is passed', () => {
        it('should return the formatted query', (done) => {
          // Arrange
          const options = {
            orderBy: 'orderBy1',
            orderDir: 'orderDir1',
            offset: 100,
          };
          // Act
          const query = bigQuery.getDataQuery(table, select, filter, options).replace(/\s/g, '');
          const expectedQuery = `SELECT ${selectQuery} FROM \`${bigQuery.datasetName}.${table}\` WHERE ${filterQuery} ORDER BY ${options.orderBy} ${options.orderDir}  OFFSET ${options.offset}`.replace(/\s/g, '');
          // Assert
          expect(query).to.eq(expectedQuery);
          done();
        });
      });
    });
  });

  describe('getSize', () => {
    // Arrange
    let catalogueIdsToParamsStub;
    let logQueryStub;

    const table = 'Table1';
    const selection = 'selectColumn';
    const filter = { field1: 'value1' };
    let expectedQuery;

    beforeEach(() => {
      expectedQuery = `SELECT COUNT(${selection}) as count FROM \`${bigQuery.datasetName}.${table}\` WHERE ${bigQuery.filterFromObject(filter)}`.replace(/\s/g, '');
      catalogueIdsToParamsStub = sinon.stub(bigQuery, 'catalogueIdsToParams');
      catalogueIdsToParamsStub.returns(expectedQuery);
      logQueryStub = sinon.stub(bigQuery, 'logQuery');

      queryJobStub.yields();
    });

    it('should form the right query', (done) => {
      // Act
      bigQuery.getSize(table, selection, filter, (err) => {
        // Assert
        expect(catalogueIdsToParamsStub.args[0][0].replace(/\s/g, '')).to.eq(expectedQuery);
        done();
      });
    });

    it('should call catalogueIdsToParams for releaseIds', (done) => {
      // Act
      bigQuery.getSize(table, selection, filter, (err) => {
        // Assert
        expect(catalogueIdsToParamsStub.args[0][1]).to.eq('releaseId IN ');
        expect(catalogueIdsToParamsStub.args[0][2]).to.eq('releaseIds');
        done();
      });
    });

    it('should call catalogueIdsToParams for trackIds', (done) => {
      // Act
      bigQuery.getSize(table, selection, filter, (err) => {
        // Assert
        expect(catalogueIdsToParamsStub.args[1][1]).to.eq('trackId IN ');
        expect(catalogueIdsToParamsStub.args[1][2]).to.eq('trackIds');
        done();
      });
    });

    it('should call catalogueIdsToParams for workIds', (done) => {
      // Act
      bigQuery.getSize(table, selection, filter, (err) => {
        // Assert
        expect(catalogueIdsToParamsStub.args[2][1]).to.eq('workId IN ');
        expect(catalogueIdsToParamsStub.args[2][2]).to.eq('workIds');
        done();
      });
    });

    it('should call logQuery with the right args', (done) => {
      // Act
      bigQuery.getSize(table, selection, filter, (err) => {
        // Assert
        expect(logQueryStub.args[0][0]).to.eq(table);
        expect(logQueryStub.args[0][1].replace(/\s/g, '')).to.eq(expectedQuery);
        expect(logQueryStub.args[0][2]).to.eq('Calculation');
        done();
      });
    });

    it('should call queryJob with the right args', (done) => {
      // Act
      bigQuery.getSize(table, selection, filter, (err) => {
        // Assert
        expect(queryJobStub.args[0][0].replace(/\s/g, '')).to.eq(expectedQuery);
        done();
      });
    });
  });

  describe('writeSpecificFileToDb', function () {
    let file;
    beforeEach((done) => {
      bigQueryClientDatasetStub = sinon.stub(bigQueryClient, 'dataset').returns({
        dataset: sinon.stub().returnsThis(),
        table: sinon.stub().returns({
          load: sinon.stub().resolves([{ errors: 'Some Errors' }]),
        }),
      });

      file = `./tmp/${testUtils.randomString()}.json`;
      fs.writeFile(file, testUtils.randomString(), done);
    });

    afterEach((done) => {
      if (fs.existsSync(file)) { fs.unlinkSync(file); }
      done();
    });

    it('should not call bigQueryClient.dataset when the file does not exist', (done) => {
      // Arrange
      const table = 'table';
      fs.unlinkSync(file);
      // Act
      bigQuery.writeSpecificFileToDb(table, file, () => {
        // Assert
        expect(bigQueryClientDatasetStub.called).to.be.false;
        done();
      });
    });

    it('should call bigQueryClient.dataset', (done) => {
      // Arrange
      const table = 'table';
      // Act
      bigQuery.writeSpecificFileToDb(table, file, () => {
        // Assert
        expect(bigQueryClientDatasetStub.called).to.be.true;
        done();
      });
    });

    it('should return the errors', (done) => {
      // Arrange
      const table = 'table';
      // Act
      bigQuery.writeSpecificFileToDb(table, file, (err) => {
        // Assert
        expect(err).to.not.be.null;
        expect(err).to.eq('Some Errors');
        done();
      });
    });

    it('should return the job if no errors', (done) => {
      // Arrange
      const table = 'table';
      bigQueryClientDatasetStub.returns({
        dataset: sinon.stub().returnsThis(),
        table: sinon.stub().returns({
          load: sinon.stub().resolves([{ job: 'some Job' }]),
        }),
      });
      // Act
      bigQuery.writeSpecificFileToDb(table, file, (err, data) => {
        // Assert
        expect(err).to.be.null;
        expect(data).to.deep.equal({ job: 'some Job' });
        done();
      });
    });
  });
});
