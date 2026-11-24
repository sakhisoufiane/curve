/* eslint-disable max-len */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import { Parser } from 'node-sql-parser';
import { ObjectId } from 'mongodb';
import {
  createDeleteQuery,
  filterFromObject,
  formatJoinColumnsGroupBy,
  formatJoinColumnsSelect,
  getAggregate,
  getData,
  getDistinct,
  getDistinctCount,
  getMultiDistinct,
  removeLargeParamValues,
  rewriteQueryWithTempTables,
  updateData,
} from './query-builder';
import { BigQueryClient } from '../client/bigquery-client';

process.env.NODE_ENV = 'test';

const datasetName = 'datasetName';

describe('bigQuery Unit Tests', () => {
  describe('formatJoinColumnsGroupBy', () => {
    it('should return an empty array when passed no args', () => {
      // Arrange
      const displayAs = null;
      const columns = null;
      // Act
      const result = formatJoinColumnsGroupBy(displayAs, columns);
      // Assert
      expect(result).toEqual([]);
    });

    it('should return an empty array when passed no columns', () => {
      // Arrange
      const displayAs = 'displayAs';
      const columns = null;
      // Act
      const result = formatJoinColumnsGroupBy(displayAs, columns);
      // Assert
      expect(result).toEqual([]);
    });

    it('should return an empty array when passed an empty array for the columns', () => {
      // Arrange
      const displayAs = 'displayAs';
      const columns: { groupBy: boolean; column: string }[] = [];
      // Act
      const result = formatJoinColumnsGroupBy(displayAs, columns);
      // Assert
      expect(result).toEqual([]);
    });

    describe('When passing it string columns', () => {
      it('should return column names when displayAs is null', () => {
        // Arrange
        const displayAs = null;
        const columns = ['column1', 'column2'];
        // Act
        const result = formatJoinColumnsGroupBy(displayAs, columns);
        // Assert
        expect(result).toEqual(columns);
      });

      it('should return column names when displayAs is an empty string', () => {
        // Arrange
        const displayAs = '';
        const columns = ['column1', 'column2'];
        // Act
        const result = formatJoinColumnsGroupBy(displayAs, columns);
        // Assert
        expect(result).toEqual(columns);
      });

      it('should return column names as they should be displayed', () => {
        // Arrange
        const displayAs = 'displayAs';
        const columns = ['column1', 'column2'];
        // Act
        const result = formatJoinColumnsGroupBy(displayAs, columns);
        // Assert
        expect(result).toEqual(['displayAs.column1', 'displayAs.column2']);
      });
    });

    describe('When passing it array of objects', () => {
      it("should return empty array when displayAs is null and they're not to be grouped", () => {
        // Arrange
        const displayAs = null;
        const columns = [{ column: 'column1' }, { column: 'column2' }];
        // Act
        const result = formatJoinColumnsGroupBy(displayAs, columns);
        // Assert
        expect(result).toEqual([]);
      });

      it("should empty array when displayAs is empty and they're not to be grouped", () => {
        // Arrange
        const displayAs = '';
        const columns = [{ column: 'column1' }, { column: 'column2' }];
        // Act
        const result = formatJoinColumnsGroupBy(displayAs, columns);
        // Assert
        expect(result).toEqual([]);
      });

      it('should return column names when displayAs is an empty string and groupBy is true', () => {
        // Arrange
        const displayAs = '';
        const columns = [{ column: 'column1', groupBy: true }, { column: 'column2' }];
        // Act
        const result = formatJoinColumnsGroupBy(displayAs, columns);
        // Assert
        expect(result).toEqual(['column1']);
      });

      it('should return column names as they should be displayed is defined and groupBy is true', () => {
        // Arrange
        const displayAs = 'displayAs';
        const columns = [{ column: 'column1', groupBy: true }, { column: 'column2' }];
        // Act
        const result = formatJoinColumnsGroupBy(displayAs, columns);
        // Assert
        expect(result).toEqual(['displayAs.column1']);
      });
    });
  });

  describe('formatJoinColumnsSelect', () => {
    it('should return an empty array when passed no args', () => {
      // Arrange
      const displayAs = null;
      const columns = null;
      // Act
      const result = formatJoinColumnsSelect(displayAs, columns);
      // Assert
      expect(result).toEqual([]);
    });

    it('should return an empty array when passed no columns', () => {
      // Arrange
      const displayAs = 'displayAs';
      const columns = null;
      // Act
      const result = formatJoinColumnsSelect(displayAs, columns);
      // Assert
      expect(result).toEqual([]);
    });

    it('should return an empty array when passed an empty array for the columns', () => {
      // Arrange
      const displayAs = 'displayAs';
      const columns: { column: string; aggregate: boolean }[] = [];
      // Act
      const result = formatJoinColumnsSelect(displayAs, columns);
      expect(result).toEqual([]);
    });

    describe('When passing it string columns', () => {
      it('should return column names when displayAs is null', () => {
        // Arrange
        const displayAs = null;
        const columns = ['column1', 'column2'];
        // Act
        const result = formatJoinColumnsSelect(displayAs, columns);
        // Assert
        expect(result).toEqual(columns);
      });

      it('should return column names when displayAs is an empty string', () => {
        // Arrange
        const displayAs = '';
        const columns = ['column1', 'column2'];
        // Act
        const result = formatJoinColumnsSelect(displayAs, columns);
        // Assert
        expect(result).toEqual(columns);
      });

      it('should return column names as they should be displayed', () => {
        // Arrange
        const displayAs = 'displayAs';
        const columns = ['column1', 'column2'];
        // Act
        const result = formatJoinColumnsSelect(displayAs, columns);
        // Assert
        expect(result).toEqual(['displayAs.column1', 'displayAs.column2']);
      });
    });

    describe('When passing it array of objects', () => {
      it("should return columns when displayAs is null and they're not to be aggregated", () => {
        // Arrange
        const displayAs = null;
        const columns = [{ column: 'column1' }, { column: 'column2' }];
        // Act
        const result = formatJoinColumnsSelect(displayAs, columns);
        // Assert
        expect(result).toEqual(['column1', 'column2']);
      });

      it("should return columns when displayAs is empty and they're not to be grouped", () => {
        // Arrange
        const displayAs = '';
        const columns = [{ column: 'column1' }, { column: 'column2' }];
        // Act
        const result = formatJoinColumnsSelect(displayAs, columns);
        // Assert
        expect(result).toEqual(['column1', 'column2']);
      });

      it('should return column names when displayAs is an empty string and aggregate is not true', () => {
        // Arrange
        const displayAs = 'displayAs';
        const columns = [{ column: 'column1', aggregate: true }, { column: 'column2' }];
        // Act
        const result = formatJoinColumnsSelect(displayAs, columns);
        // Assert
        expect(result).toEqual(['displayAs.column2']);
      });
    });
  });

  describe('filterFromObject', () => {
    it("should return 'true' when passed an empty object", () => {
      // Arrange
      const object = {};
      const table = 'Table';
      // Act
      const { query } = filterFromObject(object, table);
      // Assert
      expect(query).toEqual('true');
    });

    it('should back a simple query', () => {
      // Arrange
      const object = { arg1: 'Value 1' };
      const table = null;
      // Act
      const { query, params } = filterFromObject(object, table);
      // Assert
      expect(query).toEqual('arg1 = @arg10');
      expect(params.arg10).toEqual('Value 1');
    });

    it('should return back a simple query with table', () => {
      // Arrange
      const object = { arg1: 'Value 1' };
      const table = 'Table';
      // Act
      const { query, params } = filterFromObject(object, table);
      // Assert
      expect(query).toEqual('Table.arg1 = @arg10');
      expect(params.arg10).toEqual('Value 1');
    });

    it('should return back a simple Number query', () => {
      // Arrange
      const object = { arg1: 1 };
      const table = null;
      // Act
      const { query, params } = filterFromObject(object, table);
      // Assert
      expect(query).toEqual('arg1 = @arg10');
      expect(params.arg10).toEqual(1);
    });

    it('should return back a simple Not Equal Number query', () => {
      // Arrange
      const object = { arg1: { $ne: 1 } };
      const table = null;
      // Act
      const { query, params } = filterFromObject(object, table);
      // Assert
      expect(query).toEqual('arg1 != @arg10');
      expect(params.arg10).toEqual(1);
    });

    it("should return an 'AND' query", () => {
      // Arrange
      const object = { arg1: 'Value 1', arg2: 'Value 2' };
      const table = null;
      // Act
      const { query, params } = filterFromObject(object, table);
      // Assert
      expect(query).toEqual('arg1 = @arg10 AND arg2 = @arg20');
      expect(params.arg10).toEqual('Value 1');
      expect(params.arg20).toEqual('Value 2');
    });

    it("should return an 'OR' query", () => {
      // Arrange
      const object = { $or: [{ arg1: 'Value 1' }, { arg2: 'Value 2' }] };
      const table = null;
      // Act
      const { query, params } = filterFromObject(object, table);
      // Assert
      expect(query).toEqual('((arg1 = @arg10) OR (arg2 = @arg20))');
      expect(params.arg10).toEqual('Value 1');
      expect(params.arg20).toEqual('Value 2');
    });

    it("should return an 'IN' query", () => {
      // Arrange
      const object = { arg1: { $in: ['Value 1', 'Value 2'] } };
      const table = null;
      // Act
      const { query, params } = filterFromObject(object, table);
      // Assert
      expect(query).toEqual('arg1 IN UNNEST(@arg10)');
      expect(params.arg10).toEqual(['Value 1', 'Value 2']);
    });

    it("should return an 'NOT IN' query", () => {
      // Arrange
      const object = { arg1: { $nin: ['Value 1', 'Value 2'] } };
      const table = null;
      // Act
      const { query, params } = filterFromObject(object, table);
      // Assert
      expect(query).toEqual('arg1 NOT IN UNNEST(@arg10)');
      expect(params.arg10).toEqual(['Value 1', 'Value 2']);
    });

    it("should return an 'IS NULL' query", () => {
      // Arrange
      const object = { arg1: null };
      const table = null;
      // Act
      const { query } = filterFromObject(object, table);
      // Assert
      expect(query).toEqual('arg1 IS NULL');
    });

    it("should return an 'IS NULL' query based on $exists", () => {
      // Arrange
      const object = { arg1: { $exists: false } };
      const table = null;
      // Act
      const { query } = filterFromObject(object, table);
      // Assert
      expect(query).toEqual('arg1 IS NULL');
    });

    it("should return an 'IS NOT NULL' query based on $exists", () => {
      // Arrange
      const object = { arg1: { $exists: true } };
      const table = null;
      // Act
      const { query } = filterFromObject(object, table);
      // Assert
      expect(query).toEqual('arg1 IS NOT NULL');
    });

    it("should return an 'IS NULL' and 'IS NOT NULL' query based on $exists", () => {
      // Arrange
      const object = { arg1: { $exists: true }, arg2: { $exists: false } };
      const table = null;
      // Act
      const { query } = filterFromObject(object, table);
      // Assert
      expect(query).toEqual('arg1 IS NOT NULL AND arg2 IS NULL');
    });

    it("should return a '>' query on $gt", () => {
      // Arrange
      const object = { arg1: { $gt: 10 } };
      const table = null;
      // Act
      const { query, params } = filterFromObject(object, table);
      // Assert
      expect(query).toEqual('arg1 > @arg10');
      expect(params.arg10).toEqual(10);
    });

    it("should return a '>=' query on $gte", () => {
      // Arrange
      const object = { arg1: { $gte: 10 } };
      const table = null;
      // Act
      const { query, params } = filterFromObject(object, table);
      // Assert
      expect(query).toEqual('arg1 >= @arg10');
      expect(params.arg10).toEqual(10);
    });

    it("should return a '<' query on $lt", () => {
      // Arrange
      const object = { arg1: { $lt: 10 } };
      const table = null;
      // Act
      const { query, params } = filterFromObject(object, table);
      // Assert
      expect(query).toEqual('arg1 < @arg10');
      expect(params.arg10).toEqual(10);
    });

    it("should return a '<=' query on $lte", () => {
      // Arrange
      const object = { arg1: { $lte: 10 } };
      const table = null;
      // Act
      const { query, params } = filterFromObject(object, table);
      // Assert
      expect(query).toEqual('arg1 <= @arg10');
      expect(params.arg10).toEqual(10);
    });
  });

  describe('createDeleteQuery', () => {
    it('should form the right query', () => {
      // Arrange
      const table = 'table';
      const filter = { arg: 'Value' };
      // Act
      const { query, params } = createDeleteQuery(datasetName, table, filter);

      const expectedQuery = `DELETE
          FROM \`${datasetName}.table\`
          WHERE arg = @arg0`;
      compareSql(query, expectedQuery);
      expect(params.arg0).toEqual('Value');
    });
  });

  describe('getData', () => {
    it('should form the right query with: table and column', () => {
      // Arrange
      const table = 'table';
      const columns = 'column';
      const filter = {};
      const options = {};
      // Act
      const { query } = getData(datasetName, table, columns, filter, options);

      const expectedQuery = `SELECT column
        FROM \`${datasetName}.table\`
        WHERE true`;
      compareSql(expectedQuery, query);
    });

    it('should form the right query with: table and multiple columns', () => {
      // Arrange
      const table = 'table';
      const columns = ['column1', 'column2'];
      const filter = {};
      const options = {};
      // Act
      const { query } = getData(datasetName, table, columns, filter, options);

      const expectedQuery = `SELECT column1, column2
        FROM \`${datasetName}.table\`
        WHERE true`;
      compareSql(expectedQuery, query);
    });

    it('should form the right query with: table, column and filter', () => {
      // Arrange
      const table = 'table';
      const columns = 'column';
      const filter = { arg: 'Value' };
      const options = {};
      // Act
      const { query, params } = getData(datasetName, table, columns, filter, options);

      const expectedQuery = `SELECT column
          FROM \`${datasetName}.table\`
          WHERE arg = @arg0`;
      compareSql(expectedQuery, query);
      expect(params.arg0).toEqual('Value');
    });

    it('should form the right query with: table, select, filter and limit', () => {
      // Arrange
      const table = 'table';
      const columns = 'column';
      const filter = { arg: 'Value' };
      const options = { limit: 10 };
      // Act
      const { query, params } = getData(datasetName, table, columns, filter, options);

      const expectedQuery = `SELECT column
        FROM \`${datasetName}.table\`
        WHERE arg = @arg0 
        LIMIT @limit0`;
      compareSql(expectedQuery, query);
      expect(params.arg0).toEqual('Value');
      expect(params.limit0).toEqual(10);
    });

    it('should form the right query with: table, select, filter, limit and offset', () => {
      // Arrange
      const table = 'table';
      const columns = 'column';
      const filter = { arg: 'Value' };
      const options = { limit: 10, offset: 10 };
      // Act
      const { query, params } = getData(datasetName, table, columns, filter, options);

      const expectedQuery = `SELECT column
        FROM \`${datasetName}.table\`
        WHERE arg = @arg0 
        LIMIT @limit0 
        OFFSET @offset0`;
      compareSql(expectedQuery, query);
      expect(params.arg0).toEqual('Value');
      expect(params.limit0).toEqual(10);
      expect(params.offset0).toEqual(10);
    });
  });

  describe('updateData', () => {
    it('should form the right query when update is an object', () => {
      // Arrange
      const table = 'table';
      const filter = { arg1: 'Value 1' };
      const update = { arg2: 'Value 2', arg3: 3 };
      // Act
      const { query, params } = updateData(datasetName, table, filter, update);

      const expectedQuery = `UPDATE \`${datasetName}.table\`
        SET arg2 = @arg20, 
            arg3 = @arg30 
        WHERE arg1 = @arg10`;
      compareSql(expectedQuery, query);
      expect(params.arg10).toEqual('Value 1');
      expect(params.arg20).toEqual('Value 2');
      expect(params.arg30).toEqual(3);
    });

    it('should form the right query when update is a string', () => {
      // Arrange
      const table = 'table';
      const filter = { arg1: 'Value 1' };
      const update = 'hello = world, foo = bar';
      // Act
      const { query, params } = updateData(datasetName, table, filter, update);

      const expectedQuery = `UPDATE \`${datasetName}.table\` SET hello = world, foo = bar WHERE arg1 = @arg10`;
      compareSql(expectedQuery, query);
      expect(params.arg10).toEqual('Value 1');
    });
  });

  describe('getDistinct', () => {
    it('should form the right query with: table and column', () => {
      // Arrange
      const table = 'table';
      const column = 'column';
      const filter = {};
      // Act
      const { query } = getDistinct(datasetName, table, column, filter);

      const expectedQuery = `SELECT
        DISTINCT column
        FROM \`${datasetName}.table\` WHERE column IS NOT NULL AND true`;
      compareSql(expectedQuery, query);
    });

    it('should form the right query with: table and column when colum is an array', () => {
      // Arrange
      const table = 'table';
      const column = ['column1', 'column2'];
      const filter = {};
      // Act
      const { query } = getDistinct(datasetName, table, column, filter);

      const expectedQuery = `SELECT
        DISTINCT column1,column2
        FROM \`${datasetName}.table\` WHERE column1 IS NOT NULL AND column2 IS NOT NULL AND true`;
      compareSql(expectedQuery, query);
    });

    it('should form the right query with: table, column and filter', () => {
      // Arrange
      const table = 'table';
      const column = 'column';
      const filter = { arg: 'Value' };
      // Act
      const { query, params } = getDistinct(datasetName, table, column, filter);

      const expectedQuery = `SELECT
        DISTINCT column
        FROM \`${datasetName}.table\` WHERE column IS NOT NULL AND arg = @arg0`;
      compareSql(expectedQuery, query);
      expect(params.arg0).toEqual('Value');
    });
  });

  describe('getDistinctCount', () => {
    it('should form the right query with: table and column', () => {
      // Arrange
      const table = 'table';
      const column = 'column';
      const filter = {};
      // Act
      const { query } = getDistinctCount(datasetName, table, column, filter);

      const expectedQuery = `SELECT COUNT(DISTINCT(column)) as count
        FROM \`${datasetName}.table\` 
        WHERE column IS NOT NULL AND true`;
      compareSql(expectedQuery, query);
    });

    it('should form the right query with: table and column when colum is an array', () => {
      // Arrange
      const table = 'table';
      const column = ['column1', 'column2'];
      const filter = {};
      // Act
      const { query } = getDistinctCount(datasetName, table, column, filter);

      const expectedQuery = `SELECT COUNT(DISTINCT(column1,column2)) as count
        FROM \`${datasetName}.table\` 
        WHERE column1 IS NOT NULL AND column2 IS NOT NULL AND true`;
      compareSql(expectedQuery, query);
    });

    it('should form the right query with: table, column and filter', () => {
      // Arrange
      const table = 'table';
      const column = 'column';
      const filter = { arg: 'Value' };
      // Act
      const { query, params } = getDistinctCount(datasetName, table, column, filter);

      const expectedQuery = `SELECT COUNT(DISTINCT(column)) as count
        FROM \`${datasetName}.table\` 
        WHERE column IS NOT NULL AND arg = @arg0`;
      compareSql(expectedQuery, query);
      expect(params.arg0).toEqual('Value');
    });
  });

  describe('getMultiDistinct', () => {
    it('should form the right query with: table and columns', () => {
      // Arrange
      const table = 'table';
      const columns = ['column1', 'column2'];
      const filter = {};
      // Act
      const { query } = getMultiDistinct(datasetName, table, columns, filter);

      const expectedQuery = `SELECT
        DISTINCT column1, column2
        FROM \`${datasetName}.table\`
        WHERE true`;
      compareSql(expectedQuery, query);
    });

    it('should form the right query with: table,columns and filter', () => {
      // Arrange
      const table = 'table';
      const columns = ['column1', 'column2'];
      const filter = { arg: 'Value' };
      // Act
      const { query, params } = getMultiDistinct(datasetName, table, columns, filter);

      const expectedQuery = `SELECT
        DISTINCT column1, column2
        FROM \`${datasetName}.table\`
        WHERE arg = @arg0`;
      compareSql(expectedQuery, query);
      expect(params.arg0).toEqual('Value');
    });
  });

  describe('getAggregate', () => {
    it('should form the right query with a single selector, no filter and no options', () => {
      // Arrange
      const table = 'table';
      const selector = 'selector';
      const sumColumns = [{ column: 'sumColumn1', displayAs: 'Column1' }];
      const countColumns = 'countColumn';
      const filter = {};
      const options = {};
      // Act
      const { query } = getAggregate(datasetName, table, selector, sumColumns, countColumns, filter, options);

      const expectedQuery = `SELECT selector, SUM(sumColumn1) AS Column1, COUNT(*) AS countColumn 
          FROM \`${datasetName}.table\` 
          WHERE true 
          GROUP BY selector`;

      // Assert
      compareSql(expectedQuery, query);
    });

    it('should form the right query with multiple selectors, no filter and no options', () => {
      // Arrange
      const table = 'table';
      const selector = [
        { isSelector: true, isGroupBy: true, column: 'selector1' },
        { isSelector: true, isGroupBy: true, column: 'selector2' },
      ];
      const sumColumns = [{ column: 'sumColumn1', displayAs: 'Column1' }];
      const countColumns = 'countColumn';
      const filter = {};
      const options = {};
      // Act
      const { query } = getAggregate(datasetName, table, selector, sumColumns, countColumns, filter, options);
      const expectedQuery = `SELECT selector1, selector2, SUM(sumColumn1) AS Column1, COUNT(*) AS countColumn 
        FROM \`${datasetName}.table\` 
        WHERE true 
        GROUP BY selector1, selector2`;

      // Assert
      compareSql(expectedQuery, query);
    });

    it('should form the right query with multiple selectors, a filter and no options', () => {
      // Arrange
      const table = 'table';
      const selector = [
        { isSelector: true, isGroupBy: true, column: 'selector1' },
        { isSelector: true, isGroupBy: true, column: 'selector2' },
      ];
      const sumColumns = [{ column: 'sumColumn1', displayAs: 'Column1' }];
      const countColumns = 'countColumn';
      const filter = { arg: 'Value' };
      const options = {};
      // Act
      const { query, params } = getAggregate(datasetName, table, selector, sumColumns, countColumns, filter, options);

      const expectedQuery = `SELECT selector1, selector2, SUM(sumColumn1) AS Column1, COUNT(*) AS countColumn 
        FROM \`${datasetName}.table\` 
        WHERE arg = @arg0
        GROUP BY selector1, selector2`;
      // Assert
      compareSql(expectedQuery, query);
      expect(params.arg0).toEqual('Value');
    });

    it('should form the right query with multiple selectors, a filter and a limit option', () => {
      // Arrange
      const table = 'table';
      const selector = [
        { isSelector: true, isGroupBy: true, column: 'selector1' },
        { isSelector: true, isGroupBy: true, column: 'selector2' },
      ];
      const sumColumns = [{ column: 'sumColumn1', displayAs: 'Column1' }];
      const countColumns = 'countColumn';
      const filter = { arg: 'Value' };
      const options = { limit: 10 };
      // Act
      const { query, params } = getAggregate(datasetName, table, selector, sumColumns, countColumns, filter, options);
      const expectedQuery = `SELECT selector1, selector2, SUM(sumColumn1) AS Column1, COUNT(*) AS countColumn 
        FROM \`${datasetName}.table\`
        WHERE arg = @arg0
        GROUP BY selector1, selector2
        LIMIT @limit0`;

      // Assert
      compareSql(expectedQuery, query);
      expect(params.arg0).toEqual('Value');
      expect(params.limit0).toEqual(10);
    });

    it('should form the right query with multiple selectors, a filter, a limit option and an offset', () => {
      // Arrange
      const table = 'table';
      const selector = [
        { isSelector: true, isGroupBy: true, column: 'selector1' },
        { isSelector: true, isGroupBy: true, column: 'selector2' },
      ];
      const sumColumns = [{ column: 'sumColumn1', displayAs: 'Column1' }];
      const countColumns = 'countColumn';
      const filter = { arg: 'Value' };
      const options = { limit: 10, offset: 10 };
      // Act
      const { query, params } = getAggregate(datasetName, table, selector, sumColumns, countColumns, filter, options);
      const expectedQuery = `SELECT selector1, selector2, SUM(sumColumn1) AS Column1, COUNT(*) AS countColumn 
        FROM \`${datasetName}.table\` 
        WHERE arg = @arg0 
        GROUP BY selector1, selector2 
        LIMIT @limit0 
        OFFSET @offset0`;

      // Assert
      compareSql(expectedQuery, query);
      expect(params.arg0).toEqual('Value');
      expect(params.limit0).toEqual(10);
      expect(params.offset0).toEqual(10);
    });
  });

  describe('rewriteQueryWithTempTables', () => {
    it('should do nothing if the query does not use UNNEST', () => {
      const query = {
        query: 'SELECT contractId, workId FROM `some.table` WHERE contractId = "some-id"',
        params: {},
      };
      expect(rewriteQueryWithTempTables(query, {})).toEqual(query);
    });

    it('should update queries to use an EXISTS clause instead of array parameters', () => {
      const query = {
        query: `
        SELECT 
          source, 
          subSource, 
          territory, 
          sharePercentage, 
          workId, 
          SUM(homeCurrencyNetAmount) AS homeCurrencyNetAmount, 
          COUNT(*) AS lines
        FROM \`dataset.table\` 
        WHERE ((((catType = 'Work' AND workId IN UNNEST(@workId0))))) 
        GROUP BY source, subSource, territory, sharePercentage, workId 
        LIMIT 100000000
      `,
        params: {
          workId0: [randomId(), randomId(), randomId()],
        },
      };
      const tempTableParams = {
        workId0: randomString(),
      };

      expect(rewriteQueryWithTempTables(query, tempTableParams)).toEqual({
        query: `
        SELECT 
          source, 
          subSource, 
          territory, 
          sharePercentage, 
          workId, 
          SUM(homeCurrencyNetAmount) AS homeCurrencyNetAmount, 
          COUNT(*) AS lines
        FROM \`dataset.table\` 
        WHERE ((((catType = 'Work' AND EXISTS (SELECT 1 FROM \`${tempTableParams.workId0}\` t WHERE t.workId0 = workId))))) 
        GROUP BY source, subSource, territory, sharePercentage, workId 
        LIMIT 100000000
      `,
        params: {},
      });
    });

    it('should not update an UNNSET clause if the field has not been moved to a temp table', () => {
      const query = {
        query: `
          SELECT 
            source, 
            subSource, 
            territory, 
            sharePercentage, 
            workId, 
            SUM(homeCurrencyNetAmount) AS homeCurrencyNetAmount, 
            COUNT(*) AS lines
          FROM \`dataset.table\` 
          WHERE ((((catType = 'Work' AND workId IN UNNEST(@workId0))))) 
          GROUP BY source, subSource, territory, sharePercentage, workId 
          LIMIT 100000000
      `,
        params: {
          workId0: [randomId(), randomId(), randomId()],
        },
      };
      expect(rewriteQueryWithTempTables(query, {})).toEqual(query);
    });
  });

  describe('removeLargeParamValues', () => {
    it('should do nothing if no query params are specified', async () => {
      const query = { query: 'SELECT contractId FROM salesOutput' };
      // @ts-expect-error BigQuery type doesn't matter for this test
      expect(await removeLargeParamValues({}, query)).toEqual(query);
      // @ts-expect-error BigQuery type doesn't matter for this test
      expect(await removeLargeParamValues({}, { ...query, params: [] })).toEqual({ ...query, params: [] });
    });

    it('should do nothing if no query params are over the size threshold', async () => {
      const query = {
        query: 'SELECT contractId FROM salesOutput WHERE workId IN UNNEST(@workId0)',
        params: {
          workId0: [randomId(), randomId()],
        },
      };
      expect(
        // @ts-expect-error BigQuery type doesn't matter for this test
        await removeLargeParamValues({}, query, {
          maxArrayParamSize: 3,
        })
      ).toEqual(query);
    });

    it('should replace query params over the size threshold with temp table syntax', async () => {
      const query = {
        query:
          'SELECT contractId FROM salesOutput WHERE workId IN UNNEST(@workId0) AND contractId IN UNNEST(@contractId0)',
        params: {
          workId0: [randomId(), randomId(), randomId()],
          contractId0: [randomId()],
        },
      };
      const tempTableId = randomString();
      const bigQuery: Partial<BigQueryClient> = {
        datasetName: randomString(),
        createTable: jest.fn().mockResolvedValue({ id: tempTableId }),
        createWriteSession: jest.fn(() => ({
          setup: jest.fn(),
          write: jest.fn(),
          close: jest.fn(),
        })),
      };

      const updatedQuery = await removeLargeParamValues(
        bigQuery as BigQueryClient,
        query,
        { job_type: 'test_job', client_id: 'test' },
        {
          maxArrayParamSize: 2,
          tempTablePrefix: randomString(),
        }
      );

      expect(updatedQuery).toEqual({
        query: `SELECT contractId FROM salesOutput WHERE EXISTS (SELECT 1 FROM \`${bigQuery.datasetName}.${tempTableId}\` t WHERE t.workId0 = workId) AND contractId IN UNNEST(@contractId0)`,
        params: {
          contractId0: query.params.contractId0,
        },
      });
    });
  });
});

const compareSql = (expected: string, received: string) => {
  const parser = new Parser();
  const opts = {
    database: 'bigquery',
  };
  expect(parser.astify(received, opts)).toEqual(parser.astify(expected, opts));
};

const randomString = (stringLength?: string) => {
  const length = stringLength || Math.floor(Math.random() * 11) + 10; // default to string length of 10 - 20 characters

  return new Array(length)
    .fill('')
    .map(() => {
      const randomNumber = Math.random() * 52; // 2 * 26 chars
      return String.fromCharCode(randomNumber + (randomNumber > 26 ? 71 : 65)); // add 65 for upper case, 71 (97 - 26) for lower case letters
    })
    .join('');
};

const randomId = () => new ObjectId().toString();
