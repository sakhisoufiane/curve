process.env.NODE_ENV = 'test';

const { copyTable, copyDatasetTables } = require('./suite');

describe('CopyClient', () => {
  beforeAll(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('Expect copyTableToNewEnv to call copy with the correct parameters', async () => {
    // Arrange
    const sourceDataset = 'sourceDataset';
    const sourceTable = 'sourceTable';
    const targetDataset = 'targetDataset';
    const targetTable = 'targetTable';

    const sourceBigQueryTableCopy = jest.fn().mockResolvedValue([{ status: { state: 'DONE' } }]);
    const sourceBigQueryTable = jest.fn().mockReturnValue({
      copy: sourceBigQueryTableCopy,
    });
    const sourceBigQueryDataset = jest.fn().mockReturnValue({
      table: sourceBigQueryTable,
    });
    const sourceBigQuery = {
      dataset: sourceBigQueryDataset,
    };

    const destinationBigQueryDatasetTable = jest.fn().mockReturnValue(targetTable);
    const destinationBigQueryDataset = jest.fn().mockReturnValue({
      table: destinationBigQueryDatasetTable,
    });
    const destinationBigQuery = {
      dataset: destinationBigQueryDataset,
    };

    // Act
    await copyTable(sourceBigQuery, destinationBigQuery, sourceDataset, sourceTable, targetDataset, targetTable);

    // Assert
    expect(sourceBigQuery.dataset).toHaveBeenCalledWith(sourceDataset);
    expect(sourceBigQuery.dataset).toHaveBeenCalledTimes(1);
    expect(sourceBigQueryTable).toHaveBeenCalledWith(sourceTable);
    expect(sourceBigQueryTable).toHaveBeenCalledTimes(1);
    expect(sourceBigQueryTableCopy).toHaveBeenCalledWith(targetTable);
    expect(sourceBigQueryTableCopy).toHaveBeenCalledTimes(1);
    expect(destinationBigQuery.dataset).toHaveBeenCalledWith(targetDataset, expect.any(Object));
    expect(destinationBigQuery.dataset).toHaveBeenCalledTimes(1);
    expect(destinationBigQueryDatasetTable).toHaveBeenCalledWith(targetTable);
    expect(destinationBigQueryDatasetTable).toHaveBeenCalledTimes(1);
  });

  it('should copy across all 4 present tables values in the original client', async () => {
    // Arrange
    const sourceDataset = 'sourceDataset';
    const targetDataset = 'targetDataset';
    const targetTable = 'targetTable';

    const originalClient = {
      bigQueryDataset: sourceDataset,
      bigQuerySalesTable: 'originalSalesTable',
      bigQueryPeriodSales: 'originalPeriodSales',
      bigQueryAccountingPeriodSales: 'originalAccountingPeriodSales',
      bigQueryPeriodCosts: 'originalPeriodCosts',
    };

    const copiedClient = {
      bigQueryDataset: targetDataset,
      bigQuerySalesTable: 'copiedSalesTable',
      bigQueryPeriodSales: 'copiedPeriodSales',
      bigQueryAccountingPeriodSales: 'copiedAccountingPeriodSales',
      bigQueryPeriodCosts: 'copiedPeriodCosts',
    };

    const sourceBigQueryTableCopy = jest.fn().mockResolvedValue([{ status: { state: 'DONE' } }]);
    const sourceBigQueryTable = jest.fn().mockReturnValue({
      copy: sourceBigQueryTableCopy,
    });
    const sourceBigQueryDataset = jest.fn().mockReturnValue({
      table: sourceBigQueryTable,
    });
    const sourceBigQuery = {
      dataset: sourceBigQueryDataset,
    };

    const destinationBigQueryDatasetTable = jest.fn().mockReturnValue(targetTable);
    const destinationBigQueryDataset = jest.fn().mockReturnValue({
      table: destinationBigQueryDatasetTable,
    });
    const destinationBigQuery = {
      dataset: destinationBigQueryDataset,
    };

    // Act
    await copyDatasetTables(sourceBigQuery, destinationBigQuery, originalClient, copiedClient);

    // Assert
    expect(sourceBigQuery.dataset).toHaveBeenCalledWith(sourceDataset);
    expect(sourceBigQuery.dataset).toHaveBeenCalledTimes(4);
    expect(sourceBigQueryTable).toHaveBeenCalledWith(originalClient.bigQuerySalesTable);
    expect(sourceBigQueryTable).toHaveBeenCalledWith(originalClient.bigQueryPeriodSales);
    expect(sourceBigQueryTable).toHaveBeenCalledWith(originalClient.bigQueryAccountingPeriodSales);
    expect(sourceBigQueryTable).toHaveBeenCalledWith(originalClient.bigQueryPeriodCosts);
    expect(sourceBigQueryTable).toHaveBeenCalledTimes(4);
    expect(sourceBigQueryTableCopy).toHaveBeenCalledWith(targetTable);
    expect(sourceBigQueryTableCopy).toHaveBeenCalledTimes(4);
    expect(destinationBigQuery.dataset).toHaveBeenCalledWith(targetDataset, expect.any(Object));
    expect(destinationBigQuery.dataset).toHaveBeenCalledTimes(4);
    expect(destinationBigQueryDatasetTable).toHaveBeenCalledWith(copiedClient.bigQuerySalesTable);
    expect(destinationBigQueryDatasetTable).toHaveBeenCalledWith(copiedClient.bigQueryPeriodSales);
    expect(destinationBigQueryDatasetTable).toHaveBeenCalledWith(copiedClient.bigQueryAccountingPeriodSales);
    expect(destinationBigQueryDatasetTable).toHaveBeenCalledWith(copiedClient.bigQueryPeriodCosts);
    expect(destinationBigQueryDatasetTable).toHaveBeenCalledTimes(4);
  });

  it('should only copy across the 3 present tables values in the original client', async () => {
    // Arrange
    const sourceDataset = 'sourceDataset';
    const targetDataset = 'targetDataset';
    const targetTable = 'targetTable';

    const originalClient = {
      bigQueryDataset: sourceDataset,
      bigQuerySalesTable: 'originalSalesTable',
      bigQueryPeriodSales: 'originalPeriodSales',
      bigQueryAccountingPeriodSales: 'originalAccountingPeriodSales',
      // bigQueryPeriodCosts: 'originalPeriodCosts', // This one is missing for example
    };

    const copiedClient = {
      bigQueryDataset: targetDataset,
      bigQuerySalesTable: 'copiedSalesTable',
      bigQueryPeriodSales: 'copiedPeriodSales',
      bigQueryAccountingPeriodSales: 'copiedAccountingPeriodSales',
      bigQueryPeriodCosts: 'copiedPeriodCosts',
    };

    const sourceBigQueryTableCopy = jest.fn().mockResolvedValue([{ status: { state: 'DONE' } }]);
    const sourceBigQueryTable = jest.fn().mockReturnValue({
      copy: sourceBigQueryTableCopy,
    });
    const sourceBigQueryDataset = jest.fn().mockReturnValue({
      table: sourceBigQueryTable,
    });
    const sourceBigQuery = {
      dataset: sourceBigQueryDataset,
    };

    const destinationBigQueryDatasetTable = jest.fn().mockReturnValue(targetTable);
    const destinationBigQueryDataset = jest.fn().mockReturnValue({
      table: destinationBigQueryDatasetTable,
    });
    const destinationBigQuery = {
      dataset: destinationBigQueryDataset,
    };

    // Act
    await copyDatasetTables(sourceBigQuery, destinationBigQuery, originalClient, copiedClient);

    // Assert
    expect(sourceBigQuery.dataset).toHaveBeenCalledWith(sourceDataset);
    expect(sourceBigQuery.dataset).toHaveBeenCalledTimes(3);
    expect(sourceBigQueryTable).toHaveBeenCalledWith(originalClient.bigQuerySalesTable);
    expect(sourceBigQueryTable).toHaveBeenCalledWith(originalClient.bigQueryPeriodSales);
    expect(sourceBigQueryTable).toHaveBeenCalledWith(originalClient.bigQueryAccountingPeriodSales);
    expect(sourceBigQueryTable).toHaveBeenCalledTimes(3);
    expect(sourceBigQueryTableCopy).toHaveBeenCalledWith(targetTable);
    expect(sourceBigQueryTableCopy).toHaveBeenCalledTimes(3);
    expect(destinationBigQuery.dataset).toHaveBeenCalledWith(targetDataset, expect.any(Object));
    expect(destinationBigQuery.dataset).toHaveBeenCalledTimes(3);
    expect(destinationBigQueryDatasetTable).toHaveBeenCalledWith(copiedClient.bigQuerySalesTable);
    expect(destinationBigQueryDatasetTable).toHaveBeenCalledWith(copiedClient.bigQueryPeriodSales);
    expect(destinationBigQueryDatasetTable).toHaveBeenCalledWith(copiedClient.bigQueryAccountingPeriodSales);
    expect(destinationBigQueryDatasetTable).toHaveBeenCalledTimes(3);
  });
});
