const { BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const reports = require('./reports');

describe('runReportExport', () => {
  it('should slice massive query params so the query does not exceed limits', async () => {
    // Arrange
    const datasetName = randomString();
    const bigQuery = new BigQuery({ datasetName });
    const query = {
      query: 'SELECT contractId FROM dataset.table WHERE contractId IN UNNEST(@contractId0)',
      params: {
        contractId0: [],
        workId0: [randomId(), randomId(), randomId()],
        periodName: randomString(),
      },
    };
    const labels = { job_type: 'test' };
    const template = [];
    for (let i = 0; i < 100_010; i += 1) query.params.contractId0.push(randomId());
    jest.spyOn(reports, 'runReportQuery').mockImplementation((bigQuery, query, template, labelSubset, cb) => cb(null, []));

    // Act
    await new Promise((resolve) => {
      reports.runReportExport(bigQuery, query, template, labels, resolve);
    });

    // Assert
    expect(reports.runReportQuery.mock.calls[0][1]).toEqual({
      query: query.query,
      params: {
        contractId0: query.params.contractId0.slice(0, 50),
        workId0: query.params.workId0,
        periodName: query.params.periodName,
      },
    });
  });
});
