import { randomId, randomString } from '../testUtils';
import { rewriteQueryWithTempTables, removeLargeParamValues } from './query';

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
    const bigQuery = {
      datasetName: randomString(),
      createTempTable: jest.fn().mockResolvedValue({ id: tempTableId }),
      queryPromisify: jest.fn().mockResolvedValue({}),
    };

    const updatedQuery = await removeLargeParamValues(bigQuery, query, {
      maxArrayParamSize: 2,
      tempTablePrefix: randomString(),
    });

    expect(updatedQuery).toEqual({
      query: `SELECT contractId FROM salesOutput WHERE EXISTS (SELECT 1 FROM \`${bigQuery.datasetName}.${tempTableId}\` t WHERE t.workId0 = workId) AND contractId IN UNNEST(@contractId0)`,
      params: {
        contractId0: query.params.contractId0,
      },
    });
  });
});
