process.env.NODE_ENV = 'test';

jest.mock('mongodb');
const { MongoClient } = require('mongodb');
const { createClientCopy, connectToDatabases } = require('./index');

describe('CopyClient ', () => {
  beforeAll(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should attempt to connect to the source and target databases correctly', async () => {
    // Arrange
    const dbMock = jest.fn().mockReturnValue({});
    MongoClient.connect.mockResolvedValue({
      db: dbMock,
    });
    const sourceConfig = { dbUri: 'mockSourceDbUri' };
    const targetConfig = { dbUri: 'mockTargetDbUri' };

    // Act
    const { sourceDb, targetDb } = await connectToDatabases(sourceConfig, targetConfig);

    // Assert
    expect(sourceDb).toBeDefined();
    expect(targetDb).toBeDefined();
    expect(MongoClient.connect).toHaveBeenCalledTimes(2);
    expect(MongoClient.connect).toHaveBeenCalledWith(sourceConfig.dbUri, expect.any(Object));
    expect(MongoClient.connect).toHaveBeenCalledWith(targetConfig.dbUri, expect.any(Object));
    expect(dbMock).toHaveBeenCalledTimes(2);
    expect(dbMock).toHaveBeenCalledWith('curve-production');
  });

  it('should throw correctly if source db connection fails', async () => {
    // Arrange
    MongoClient.connect.mockRejectedValue(new Error('Connection failed'));
    const sourceConfig = { dbUri: 'mockSourceDbUri' };
    const targetConfig = { dbUri: 'mockTargetDbUri' };

    // Act
    const result = await expect(connectToDatabases(sourceConfig, targetConfig))
      // Assert
      .rejects.toThrow('Connection failed');

    expect(result).toBeUndefined();
    expect(MongoClient.connect).toHaveBeenCalledTimes(1);
    expect(MongoClient.connect).toHaveBeenCalledWith(sourceConfig.dbUri, expect.any(Object));
  });

  it('should create a client copy correctly when target environment is not production', () => {
    // Arrange
    const sourceClientObject = createClientObject();
    const targetConfig = { isProduction: false };
    const targetEnvironment = 'mock';

    // Act
    const copiedClient = createClientCopy(sourceClientObject, targetConfig, targetEnvironment);

    // Assert
    // Should overwrite all these as the target env is not production
    expect(copiedClient.inheritCatalogueFrom).toEqual([]);
    expect(copiedClient.salesFtpIngestions).toEqual([]);
    expect(copiedClient.ftpHost).toBeNull();
    expect(copiedClient.ftpRootDir).toBeNull();
    expect(copiedClient.ftpUsername).toBeNull();
    expect(copiedClient.ingestForeignIds).toBe(false);
    expect(copiedClient.matchContractOnImport).toBe(false);
    expect(copiedClient.setDefaultReleaseIdOnImport).toBe(false);
    expect(copiedClient.useBarcodeAsCatNoOnImport).toBe(false);
    // Should get the dataset name and table names correct
    expect(copiedClient.bigQueryDataset).toBe('DummyClientLabelMock');
    expect(copiedClient.bigQuerySalesTable).toBe('DummyClientLabelMockSales');
    expect(copiedClient.bigQueryPeriodSales).toBe('DummyClientLabelMockPeriodSales');
    expect(copiedClient.bigQueryAccountingPeriodSales).toBe('DummyClientLabelMockAccountingSales');
    expect(copiedClient.bigQueryPeriodCosts).toBe('DummyClientLabelMockCosts');
    // Should always overwrite these fields regardless of env
    expect(copiedClient.customSupportEmail).toBeNull();
    expect(copiedClient.ccCommunicationEmail).toBeNull();
    expect(copiedClient.createdBigQueryBackups).toBe(true);
    expect(copiedClient.paymentProviders).toEqual({});
  });

  it('should create a client copy correctly when target environment is production', () => {
    // Arrange
    const sourceClientObject = createClientObject();
    const targetConfig = { isProduction: true };
    const targetEnvironment = 'production';

    // Act
    const copiedClient = createClientCopy(sourceClientObject, targetConfig, targetEnvironment);

    // Assert
    // Should NOT overwrite all these as the target env is production
    expect(copiedClient.inheritCatalogueFrom).toEqual([1, 2, 3]);
    expect(copiedClient.salesFtpIngestions).toEqual([4, 5, 6]);
    expect(copiedClient.ftpHost).toBe('ftp.example.com');
    expect(copiedClient.ftpRootDir).toBe('/root');
    expect(copiedClient.ftpUsername).toBe('user');
    expect(copiedClient.ingestForeignIds).toBe(true);
    expect(copiedClient.matchContractOnImport).toBe(true);
    expect(copiedClient.setDefaultReleaseIdOnImport).toBe(true);
    expect(copiedClient.useBarcodeAsCatNoOnImport).toBe(true);
    // Should get the dataset name and table names correct
    expect(copiedClient.bigQueryDataset).toBe('DummyClientLabel');
    expect(copiedClient.bigQuerySalesTable).toBe('DummyClientLabelSales');
    expect(copiedClient.bigQueryPeriodSales).toBe('DummyClientLabelPeriodSales');
    expect(copiedClient.bigQueryAccountingPeriodSales).toBe('DummyClientLabelAccountingSales');
    expect(copiedClient.bigQueryPeriodCosts).toBe('DummyClientLabelCosts');
    // Should always overwrite these fields regardless of env
    expect(copiedClient.customSupportEmail).toBeNull();
    expect(copiedClient.ccCommunicationEmail).toBeNull();
    expect(copiedClient.createdBigQueryBackups).toBe(true);
    expect(copiedClient.paymentProviders).toEqual({});
  });
});

function createClientObject() {
  const sourceClientObject = { _id: '123' };
  sourceClientObject.name = 'Dummy Client Label';
  sourceClientObject.inheritCatalogueFrom = [1, 2, 3];
  sourceClientObject.salesFtpIngestions = [4, 5, 6];
  sourceClientObject.ftpHost = 'ftp.example.com';
  sourceClientObject.ftpRootDir = '/root';
  sourceClientObject.ftpUsername = 'user';
  sourceClientObject.ingestForeignIds = true;
  sourceClientObject.matchContractOnImport = true;
  sourceClientObject.setDefaultReleaseIdOnImport = true;
  sourceClientObject.useBarcodeAsCatNoOnImport = true;
  sourceClientObject.customSupportEmail = 'mock@example.com';
  sourceClientObject.ccCommunicationEmail = 'mock@example.com';
  sourceClientObject.createdBigQueryBackups = 'DummyClientLabel';
  sourceClientObject.paymentProviders = { stripe: true };
  return sourceClientObject;
}
