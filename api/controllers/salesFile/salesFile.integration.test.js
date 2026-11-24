const { fileManager, fileOpener } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { ObjectId } = require('mongodb');
const { UserAccess } = require('@curveroyaltysystems/curve-shared-logic');

const SalesFile = require('../../models/salesFile');
const Client = require('../../models/client');
const User = require('../../models/user');
const Hypercare = require('../hypercare');

const SalesFileController = require('./salesFile');

describe('runIngestion', () => {
  const clientId = new ObjectId().toString();
  let salesFile;
  let user;

  beforeEach(async () => {
    user = new User({ clientId, email: randomString() });
    await user.save();

    salesFile = await new SalesFile({ clientId, name: randomString() }).save();

    jest.spyOn(UserAccess, 'isUserForbidden').mockResolvedValue(false);
    jest.spyOn(SalesFile.prototype, 'createIngestTask').mockImplementation((priority, curveUser, callback) => {
      callback(null);
    });
  });

  it('should throw an error if no sales file is found', async () => {
    const id = new ObjectId().toString();
    await expect(SalesFileController.runIngestion(user, id))
      .rejects
      .toThrow(`Could not find SalesFile with ID ${id}`);
  });

  it('should throw an error if the user is not authorized', async () => {
    jest.spyOn(UserAccess, 'isUserForbidden').mockResolvedValue(true);

    await expect(SalesFileController.runIngestion(user, salesFile._id.toString()))
      .rejects
      .toThrow('Forbidden');
  });

  it('should throw an error if createIngestTask throws an error', async () => {
    jest.spyOn(SalesFile.prototype, 'createIngestTask').mockRejectedValue(new Error('That was unexpected!'));

    await expect(SalesFileController.runIngestion(user, salesFile._id.toString()))
      .rejects
      .toThrow();
  });

  it('should throw an error if createIngestTask returns an error in the callback', async () => {
    jest.spyOn(SalesFile.prototype, 'createIngestTask').mockImplementation((priority, curveUser, callback) => {
      callback(new Error('That was unexpected!'));
    });

    await expect(SalesFileController.runIngestion(user, salesFile._id.toString()))
      .rejects
      .toThrow();
  });

  it('should send a message to start the ingestion', async () => {
    jest.spyOn(SalesFile.prototype, 'createIngestTask').mockImplementation((priority, curveUser, callback) => {
      callback();
    });

    await expect(SalesFileController.runIngestion(user, salesFile._id.toString()))
      .resolves
      .toBeUndefined();
  });

  it('should send a Hypercare notification if the client is configured to do so', async () => {
    await new Client({
      _id: new ObjectId(clientId),
      name: randomString(),
      operations: { hypercare: true },
      createdBigQueryBackups: true,
      createdBigQueryTables: true,
    }).save();
    jest.spyOn(SalesFile.prototype, 'createIngestTask').mockImplementation((priority, curveUser, callback) => {
      callback();
    });
    const notifyIngestion = jest.spyOn(Hypercare, 'notifyIngestion').mockResolvedValue(undefined);

    await expect(SalesFileController.runIngestion(user, salesFile._id.toString()))
      .resolves
      .toBeUndefined();

    expect(notifyIngestion).toHaveBeenCalled();
  });
});

describe('Bulk Updates', () => {
  let client;
  let clientId;
  let curveUser;
  let salesFile1;
  let salesFile5;
  let salesFile2NoTargetPeriod;
  let salesFile3WithTargetPeriod;
  let salesFile4WithExchangeRates;
  let salesFile6WithExchangeRates;

  beforeEach(async () => {
    client = new Client({
      homeCurrency: 'EUR',
      name: randomString(),
      bigQueryDataset: randomString(),
      bigQuerySalesTable: randomString(),
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    });
    await client.save();

    clientId = client._id.toString();
    curveUser = { clientId };

    salesFile1 = new SalesFile({
      clientId,
      invalidFields: {
        currencies: ['EUR', 'GBP', 'USD'],
        saleDate: true,
        transactionDate: true,
        customAdditionalFile: true,
      },
      overwriteFields: {},
    });

    salesFile5 = new SalesFile({
      clientId,
      invalidFields: {
        currencies: ['GBP'],
        saleDate: false,
        transactionDate: false,
        customAdditionalFile: true,
      },
      overwriteFields: {
        saleDate: new Date('2024-12-03'),
        transactionDate: new Date('2024-12-04'),
      },
    });

    salesFile2NoTargetPeriod = new SalesFile({
      clientId,
      invalidFields: {
        saleDate: false,
        transactionDate: true,
        customAdditionalFile: true,
      },
      overwriteFields: {
        saleDate: new Date('2024-12-01'),
      },
    });

    salesFile3WithTargetPeriod = new SalesFile({
      clientId,
      targetPeriod: '2024Q3',
      invalidFields: {
        saleDate: true,
        transactionDate: false,
        customAdditionalFile: true,
      },
      overwriteFields: {
        transactionDate: new Date('2024-12-01'),
      },
    });

    salesFile4WithExchangeRates = new SalesFile({
      clientId,
      exchangeRates: [
        { rate: 1.8, from: 'GBP', to: 'Home Currency' },
        { rate: 1, from: 'NOK', to: 'Home Currency' },
      ],
      invalidFields: {
        saleDate: false,
        transactionDate: false,
        customAdditionalFile: false,
      },
    });

    salesFile6WithExchangeRates = new SalesFile({
      clientId,
      exchangeRates: [
        { rate: 0.8, from: 'EUR', to: 'Home Currency' },
      ],
      invalidFields: {
        saleDate: false,
        transactionDate: false,
        customAdditionalFile: false,
      },
    });

    await Promise.all([
      salesFile1.save(),
      salesFile2NoTargetPeriod.save(),
      salesFile3WithTargetPeriod.save(),
      salesFile4WithExchangeRates.save(),
      salesFile5.save(),
      salesFile6WithExchangeRates.save(),
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getBulkEditData', () => {
    it('should include the specified sales file ids and names', async () => {
      // Arrange
      const files = [salesFile1, salesFile2NoTargetPeriod, salesFile3WithTargetPeriod, salesFile4WithExchangeRates];
      jest.spyOn(SalesFile, 'find').mockResolvedValue(files);
      // Act
      const data = await SalesFileController.getBulkEditData({ curveUser, query: { ids: files.map((f) => f._id.toString()) } });
      // Assert
      expect(data.salesFiles).toEqual(files.map((sf) => ({ id: sf._id, name: sf.name, platform: null })));
    });

    it('should ignore sales files with empty exchange rates (bad data)', async () => {
      // Arrange
      const files = [new SalesFile({ _id: randomId(), exchangeRates: [{}] })];
      jest.spyOn(SalesFile, 'find').mockResolvedValue(files);
      // Act
      const data = await SalesFileController.getBulkEditData({ curveUser, query: { ids: files.map((f) => f._id.toString()) } });
      // Assert
      expect(data.platform.default.exchangeRates.existing).toEqual([]);
    });

    describe('all files have no exchange rates set AND no invalid currency lines (no rates required)', () => {
      it('should return an empty exchangeRates array', async () => {
        // Arrange
        const files = [salesFile2NoTargetPeriod, salesFile3WithTargetPeriod];
        jest.spyOn(SalesFile, 'find').mockResolvedValue(files);
        // Act
        const data = await SalesFileController.getBulkEditData({ curveUser, query: { ids: files.map((f) => f._id.toString()) } });
        // Assert
        expect(data.platform.default.exchangeRates).toEqual({ existing: [], invalid: [] });
      });
    });

    describe('all files have no exchange rates set already AND has invalid currency lines', () => {
      it('should return the invalid currency lines as exchanges rates to be completed', async () => {
        // Arrange
        const files = [salesFile1];
        jest.spyOn(SalesFile, 'find').mockResolvedValue(files);
        // Act
        const data = await SalesFileController.getBulkEditData({ curveUser, query: { ids: files.map((f) => f._id.toString()) } });
        // Assert
        expect(data.platform.default.exchangeRates).toEqual({
          invalid: [
            { currencyCode: 'EUR', rate: null, salesFileIds: [salesFile1._id.toString()] },
            { currencyCode: 'GBP', rate: null, salesFileIds: [salesFile1._id.toString()] },
            { currencyCode: 'USD', rate: null, salesFileIds: [salesFile1._id.toString()] },
          ],
          existing: [],
        });
      });
    });

    describe('all files have exchange rates AND have no invalid currency lines', () => {
      it('should return the existing exchange rates', async () => {
        // Arrange
        const files = [salesFile4WithExchangeRates];
        jest.spyOn(SalesFile, 'find').mockResolvedValue(files);
        // Act
        const data = await SalesFileController.getBulkEditData({ curveUser, query: { ids: files.map((f) => f._id.toString()) } });
        // Assert
        expect(data.platform.default.exchangeRates).toEqual({
          invalid: [],
          existing: [
            {
              currencyCode: 'GBP',
              rate: null,
              salesFileIds: [salesFile4WithExchangeRates._id.toString()],
            },
            {
              currencyCode: 'NOK',
              rate: null,
              salesFileIds: [salesFile4WithExchangeRates._id.toString()],
            },
          ],
        });
      });
    });

    describe('files have exchange rates AND invalid currency lines', () => {
      it('should return a combined list of exchange rates', async () => {
        // Arrange
        const files = [salesFile1, salesFile5, salesFile4WithExchangeRates];
        jest.spyOn(SalesFile, 'find').mockResolvedValue(files);
        // Act
        const data = await SalesFileController.getBulkEditData({ curveUser, query: { ids: files.map((f) => f._id.toString()) } });
        // Assert
        expect(data.platform.default.exchangeRates).toEqual({
          invalid: [
            { currencyCode: 'EUR', rate: null, salesFileIds: [salesFile1._id.toString()] },
            // Two sales files have no entry for GBP
            { currencyCode: 'GBP', rate: null, salesFileIds: [salesFile1._id.toString(), salesFile5._id.toString()] },
            { currencyCode: 'USD', rate: null, salesFileIds: [salesFile1._id.toString()] },
          ],
          existing: [
            // GBP should exist in both the invalid (sf1, sf5) and existing (sf4) lists
            { currencyCode: 'GBP', rate: null, salesFileIds: [salesFile4WithExchangeRates._id.toString()] },
            { currencyCode: 'NOK', rate: null, salesFileIds: [salesFile4WithExchangeRates._id.toString()] },
          ],
        });
      });
    });
  });

  describe('bulkUpdate', () => {
    it('should throw an error if no sales file ids specified', async () => {
      try {
        await SalesFileController.bulkUpdate({ curveUser, updates: { ids: [] } });
      } catch (err) {
        expect(err).not.toBeUndefined();
      }
    });

    it('should set onlyUpdateMissing to true when not specified to prevent accidental overwrites', async () => {
      // Arrange
      const updates = {
        ids: [salesFile1._id.toString(), salesFile3WithTargetPeriod._id.toString()],
        targetPeriod: '2024Q4',
        transactionDate: '2024-10-01',
        saleDate: '2024-10-02',
        exchangeRates: [],
        appleSpecific: {
          withFinancialFile: false,
          ids: [],
        },
      };
      // Act
      await SalesFileController.bulkUpdate({ curveUser, updates });
      // Assert
      expect(updates.onlyUpdateMissing).toEqual(true);
    });

    it('should remove the invalid flag for Apple files when a financial file is provided', async () => {
      // Arrange
      const updates = {
        ids: [salesFile1._id.toString(), salesFile3WithTargetPeriod._id.toString()],
        targetPeriod: '2024Q4',
        transactionDate: '2024-10-01',
        saleDate: '2024-10-02',
        exchangeRates: [],
        appleSpecific: {
          withFinancialFile: true,
          ids: [salesFile1._id.toString(), salesFile3WithTargetPeriod._id.toString()],
        },
      };
      // Act
      await SalesFileController.bulkUpdate({ curveUser, updates });
      // Assert
      const [updatedSalesFile1, updatedSalesFile3] = await Promise.all([
        SalesFile.findById(salesFile1._id),
        SalesFile.findById(salesFile3WithTargetPeriod._id),
      ]);
      expect(updatedSalesFile1.invalidFields.customAdditionalFile).toEqual(false);
      expect(updatedSalesFile3.invalidFields.customAdditionalFile).toEqual(false);
    });

    describe('when onlyUpdateMissing fields is true (default)', () => {
      it('should update ONLY the target period of sales files without a target period', async () => {
      // Arrange
        const updates = {
          ids: [salesFile1._id.toString(), salesFile3WithTargetPeriod._id.toString()],
          targetPeriod: '2024Q4',
          transactionDate: '2024-10-01',
          saleDate: '2024-10-02',
          exchangeRates: [
            {
              currencyCode: 'GBP',
              salesFileIds: [salesFile1._id.toString()],
              rate: 1.2,
            },
          ],
          onlyUpdateMissing: true,
          appleSpecific: { withFinancialFile: false, ids: [] },
        };
        // Act
        updates.wasd = true;
        await SalesFileController.bulkUpdate({ curveUser, updates });
        // Assert
        // SF1 — target period should be added and set
        const updatedSalesFile1 = await SalesFile.findById(salesFile1._id);
        expect(updatedSalesFile1.targetPeriod).toEqual(updates.targetPeriod);
        // SF3 — target period already exists and should not be updated
        const updatedSalesFile3 = await SalesFile.findById(salesFile3WithTargetPeriod._id);
        expect(updatedSalesFile3.targetPeriod).toEqual(salesFile3WithTargetPeriod.targetPeriod);
      });

      it('should update ONLY missing date field defaults', async () => {
        // Arrange
        const updates = {
          ids: [
            salesFile1._id.toString(),
            salesFile3WithTargetPeriod._id.toString(),
            salesFile2NoTargetPeriod._id.toString(),
            salesFile5._id.toString(),
          ],
          targetPeriod: '2024Q4',
          transactionDate: '2024-10-01',
          saleDate: '2024-10-02',
          exchangeRates: [],
          onlyUpdateMissing: true,
          appleSpecific: { withFinancialFile: false, ids: [] },
        };
          // Act
        await SalesFileController.bulkUpdate({ curveUser, updates });
        // Assert

        // SF1 — Both dates should be updated
        const updatedSalesFile1 = await SalesFile.findById(salesFile1._id);
        // SF1 — Date fields should be marked as valid
        expect(updatedSalesFile1.invalidFields).toMatchObject({
          saleDate: false,
          transactionDate: false,
        });
        // SF1 — Date field defaults should be set
        expect(updatedSalesFile1.overwriteFields.saleDate).toEqual(new Date(updates.saleDate));
        expect(updatedSalesFile1.overwriteFields.transactionDate).toEqual(new Date(updates.transactionDate));

        // SF3 — Only the sale date should be updated
        const updatedSalesFile3 = await SalesFile.findById(salesFile3WithTargetPeriod._id);
        // SF3 — Sale date should now be marked as valid
        expect(updatedSalesFile3.invalidFields).toMatchObject({
          saleDate: false,
          transactionDate: false,
        });
        // SF3 — Only the sale date default should be updated
        expect(updatedSalesFile3.overwriteFields.saleDate).toEqual(new Date(updates.saleDate));
        expect(updatedSalesFile3.overwriteFields.transactionDate).toEqual(
          new Date(salesFile3WithTargetPeriod.overwriteFields.transactionDate),
        );

        // SF2 — Only the transaction date should be updated
        const updatedSalesFile2 = await SalesFile.findById(salesFile2NoTargetPeriod._id);
        // SF2 — Transaction date should now be marked as valid
        expect(updatedSalesFile2.invalidFields).toMatchObject({
          saleDate: false,
          transactionDate: false,
        });
        // SF2 — Only the transaction date default should be updated
        expect(updatedSalesFile2.overwriteFields.transactionDate).toEqual(new Date(updates.transactionDate));
        expect(updatedSalesFile2.overwriteFields.saleDate).toEqual(
          new Date(salesFile2NoTargetPeriod.overwriteFields.saleDate),
        );

        // SF5 — No dates should be updated as they are already set as defaults
        const updatedSalesFile5 = await SalesFile.findById(salesFile5._id);
        expect(updatedSalesFile5.invalidFields).toMatchObject({
          saleDate: false,
          transactionDate: false,
        });
        // SF5 — The dates defaults should not have changed
        expect(updatedSalesFile5.overwriteFields.transactionDate).toEqual(salesFile5.overwriteFields.transactionDate);
        expect(updatedSalesFile5.overwriteFields.saleDate).toEqual(salesFile5.overwriteFields.saleDate);
      });

      it('should update ONLY missing exchange rates', async () => {
        // Arrange
        const updates = {
          ids: [
            salesFile1._id.toString(),
            salesFile4WithExchangeRates._id.toString(),
            salesFile2NoTargetPeriod._id.toString(),
            salesFile6WithExchangeRates._id.toString(),
          ],
          targetPeriod: '2024Q4',
          transactionDate: '2024-10-01',
          saleDate: '2024-10-02',
          exchangeRates: [
            {
              currencyCode: 'GBP',
              rate: 1.1,
              salesFileIds: [salesFile1._id.toString()],
            },
            {
              currencyCode: 'EUR',
              rate: 1.2,
              salesFileIds: [salesFile1._id.toString()],
            },
            {
              currencyCode: 'USD',
              rate: 1.3,
              salesFileIds: [salesFile1._id.toString()],
            },
          ],
          onlyUpdateMissing: true,
          appleSpecific: { withFinancialFile: false, ids: [] },
        };
        // Act
        await SalesFileController.bulkUpdate({ curveUser, updates });
        // Assert
        const [sf1, sf4, sf2, sf6] = await Promise.all([
          SalesFile.findById(salesFile1._id),
          SalesFile.findById(salesFile4WithExchangeRates._id),
          SalesFile.findById(salesFile2NoTargetPeriod._id),
          SalesFile.findById(salesFile6WithExchangeRates._id),
        ]);
        // Sales File is the only file with missing exchange rates, so it should have all added
        expect(sf1.exchangeRates).toEqual([
          { rate: 1.1, from: 'GBP', to: 'Home Currency' },
          { rate: 1.2, from: 'EUR', to: 'Home Currency' },
          { rate: 1.3, from: 'USD', to: 'Home Currency' },
        ]);
        // The remaining sales files have no exchange rate updates so should be unchanged
        expect(sf4.exchangeRates).toEqual(salesFile4WithExchangeRates.exchangeRates);
        expect(sf2.exchangeRates).toEqual(salesFile2NoTargetPeriod.exchangeRates);
        expect(sf6.exchangeRates).toEqual(salesFile6WithExchangeRates.exchangeRates);
      });

      describe('when a rate to update exists and is null (SUP-3116)', () => {
        it('should update the existing null rate with the new rate', async () => {
          // Arrange
          salesFile4WithExchangeRates.exchangeRates = [{ rate: null, from: 'GBP', to: 'Home Currency' }];
          await salesFile4WithExchangeRates.save();
          const updates = {
            ids: [salesFile4WithExchangeRates._id.toString()],
            exchangeRates: [
              {
                currencyCode: 'GBP',
                rate: 1.25,
                salesFileIds: [salesFile4WithExchangeRates._id.toString()],
              },
            ],
            onlyUpdateMissing: true,
            appleSpecific: { withFinancialFile: false, ids: [] },
          };

          // Act
          await SalesFileController.bulkUpdate({ curveUser, updates });

          // Assert
          const updatedSalesFile4 = await SalesFile.findById(salesFile4WithExchangeRates._id);
          expect(updatedSalesFile4.exchangeRates).toEqual([
            { rate: 1.25, from: 'GBP', to: 'Home Currency' },
          ]);
        });
      });

      describe('when a rate to update exists and is zero (SUP-3116)', () => {
        it('should not update the existing zero rate with the new rate', async () => {
          // Arrange
          // Zero could be a valid exchange rate, so we should not consider it missing (like we do with "null")
          salesFile4WithExchangeRates.exchangeRates = [{ rate: 0, from: 'GBP', to: 'Home Currency' }];
          await salesFile4WithExchangeRates.save();
          const updates = {
            ids: [salesFile4WithExchangeRates._id.toString()],
            exchangeRates: [
              {
                currencyCode: 'GBP',
                rate: 1.25,
                salesFileIds: [salesFile4WithExchangeRates._id.toString()],
              },
            ],
            onlyUpdateMissing: true,
            appleSpecific: { withFinancialFile: false, ids: [] },
          };

          // Act
          await SalesFileController.bulkUpdate({ curveUser, updates });

          // Assert
          const updatedSalesFile4 = await SalesFile.findById(salesFile4WithExchangeRates._id);
          expect(updatedSalesFile4.exchangeRates).toEqual([
            { rate: 0, from: 'GBP', to: 'Home Currency' },
          ]);
        });
      });
    });

    describe('when onlyUpdateMissing fields is false', () => {
      it('should update the target period of ALL sales files', async () => {
        // Arrange
        const updates = {
          ids: [salesFile1._id.toString(), salesFile3WithTargetPeriod._id.toString()],
          targetPeriod: '2024Q4',
          transactionDate: '2024-10-01',
          exchangeRates: [
            {
              currencyCode: 'GBP',
              salesFileIds: [salesFile1._id.toString()],
              rate: 1.2,
            },
          ],
          onlyUpdateMissing: false,
          appleSpecific: { withFinancialFile: false, ids: [] },
        };
        // Act
        await SalesFileController.bulkUpdate({ curveUser, updates });
        // Assert
        // SF1 — target period should be added and set
        const updatedSalesFile1 = await SalesFile.findById(salesFile1._id);
        expect(updatedSalesFile1.targetPeriod).toEqual(updates.targetPeriod);
        // SF3 — target period already exists but should be updated as onlyUpdateMissing is false
        const updatedSalesFile3 = await SalesFile.findById(salesFile3WithTargetPeriod._id);
        expect(updatedSalesFile3.targetPeriod).toEqual(updates.targetPeriod);
      });

      it('should update existing or add new date field defaults', async () => {
        // Arrange
        const updates = {
          ids: [
            salesFile1._id.toString(),
            salesFile3WithTargetPeriod._id.toString(),
            salesFile2NoTargetPeriod._id.toString(),
            salesFile5._id.toString(),
          ],
          targetPeriod: '2024Q4',
          transactionDate: '2024-10-01',
          saleDate: '2024-10-02',
          exchangeRates: [],
          onlyUpdateMissing: false,
          appleSpecific: { withFinancialFile: false, ids: [] },
        };
        // Act
        await SalesFileController.bulkUpdate({ curveUser, updates });
        // Assert

        // SF1 — Both dates should be updated
        const updatedSalesFile1 = await SalesFile.findById(salesFile1._id);
        // SF1 — Date fields should be marked as valid
        expect(updatedSalesFile1.invalidFields).toMatchObject({
          saleDate: false,
          transactionDate: false,
        });
        // SF1 — Date field defaults should be set
        expect(updatedSalesFile1.overwriteFields.saleDate).toEqual(new Date(updates.saleDate));
        expect(updatedSalesFile1.overwriteFields.transactionDate).toEqual(new Date(updates.transactionDate));

        // SF3 — Both dates should be updated
        const updatedSalesFile3 = await SalesFile.findById(salesFile3WithTargetPeriod._id);
        // SF3 — Sale date should now be marked as valid
        expect(updatedSalesFile3.invalidFields).toMatchObject({
          saleDate: false,
          transactionDate: false,
        });
        // SF3 — Both dates should be updated
        expect(updatedSalesFile3.overwriteFields.saleDate).toEqual(new Date(updates.saleDate));
        expect(updatedSalesFile3.overwriteFields.transactionDate).toEqual(new Date(updates.transactionDate));

        // SF2 — Both dates should be updated
        const updatedSalesFile2 = await SalesFile.findById(salesFile2NoTargetPeriod._id);
        // SF2 — Transaction date should now be marked as valid
        expect(updatedSalesFile2.invalidFields).toMatchObject({
          saleDate: false,
          transactionDate: false,
        });
        // SF2 — Both dates should be updated
        expect(updatedSalesFile2.overwriteFields.transactionDate).toEqual(new Date(updates.transactionDate));
        expect(updatedSalesFile2.overwriteFields.saleDate).toEqual(new Date(updates.saleDate));

        // SF5 — Both existing dates should be updated
        const updatedSalesFile5 = await SalesFile.findById(salesFile5._id);
        expect(updatedSalesFile5.invalidFields).toMatchObject({
          saleDate: false,
          transactionDate: false,
        });
        // SF5 — The dates defaults should have been updated
        expect(updatedSalesFile5.overwriteFields.transactionDate).toEqual(new Date(updates.transactionDate));
        expect(updatedSalesFile5.overwriteFields.saleDate).toEqual(new Date(updates.saleDate));
      });

      it('should update existing or add new exchange rates', async () => {
        // Arrange
        const updates = {
          ids: [
            salesFile1._id.toString(),
            salesFile4WithExchangeRates._id.toString(),
            salesFile2NoTargetPeriod._id.toString(),
            salesFile6WithExchangeRates._id.toString(),
          ],
          targetPeriod: '2024Q4',
          transactionDate: '2024-10-01',
          exchangeRates: [
            {
              currencyCode: 'GBP',
              rate: 1.1,
              salesFileIds: [salesFile1._id.toString(), salesFile4WithExchangeRates._id.toString()],
            },
            {
              currencyCode: 'EUR',
              rate: 1.2,
              salesFileIds: [salesFile1._id.toString(), salesFile6WithExchangeRates._id.toString()],
            },
            {
              currencyCode: 'USD',
              rate: 1.3,
              salesFileIds: [salesFile1._id.toString()],
            },
            {
              currencyCode: 'NOK',
              rate: 1.4,
              salesFileIds: [salesFile4WithExchangeRates._id.toString()],
            },
          ],
          onlyUpdateMissing: false,
          appleSpecific: { withFinancialFile: false, ids: [] },
        };
        // Act
        await SalesFileController.bulkUpdate({ curveUser, updates });
        // Assert
        const [sf1, sf4, sf2, sf6] = await Promise.all([
          SalesFile.findById(salesFile1._id),
          SalesFile.findById(salesFile4WithExchangeRates._id),
          SalesFile.findById(salesFile2NoTargetPeriod._id),
          SalesFile.findById(salesFile6WithExchangeRates._id),
        ]);
        // Sales file 1 should have all its relevant exchange rates added
        expect(sf1.exchangeRates).toEqual([
          { rate: 1.1, from: 'GBP', to: 'Home Currency' },
          { rate: 1.2, from: 'EUR', to: 'Home Currency' },
          { rate: 1.3, from: 'USD', to: 'Home Currency' },
        ]);
        // Sales file 4 should have updated GBP and NOK, and no changes to SEK
        expect(sf4.exchangeRates).toEqual([
          { rate: 1.1, from: 'GBP', to: 'Home Currency' },
          { rate: 1.4, from: 'NOK', to: 'Home Currency' },
        ]);
        // Sales file 2 should be unchanged
        expect(sf2.exchangeRates).toEqual([]);
        // Sales file 6 should have updated EUR
        expect(sf6.exchangeRates).toEqual([
          { rate: 1.2, from: 'EUR', to: 'Home Currency' },
        ]);
      });
    });
  });

  describe('processFinancialFile', () => {
    it('should handle errors when downloading the file from S3', async () => {
      // Arrange
      const financialFileKey = randomString();
      const fakeError = new Error('FakeDownloadError');
      jest.spyOn(fileManager, 'downloadFromS3').mockImplementation((key, bucket, cb) => cb(fakeError));
      try {
        // Act
        await SalesFileController.processFinancialFile({ clientId: client._id.toString(), salesFileId: salesFile1._id, financialFileKey });
      } catch (err) {
        // Assert
        expect(err).not.toBeUndefined();
        expect(err).toEqual(fakeError);
        expect(fileManager.downloadFromS3).toHaveBeenCalledWith(financialFileKey, expect.any(String), expect.any(Function));
      }
    });

    it('should handle errors opening the downloaded file', async () => {
      // Arrange
      const fakeError = new Error('FakeExtractDataError');
      const filePath = randomString();
      jest.spyOn(fileManager, 'downloadFromS3').mockImplementation((key, bucket, cb) => cb(null, filePath));
      jest.spyOn(fileOpener, 'extractData').mockImplementation((filePath, options, cb) => cb(fakeError));
      // Act
      try {
        await SalesFileController.processFinancialFile({ clientId: client._id.toString(), salesFileId: salesFile1._id, financialFileKey: '' });
      } catch (err) {
        // Assert
        expect(err).not.toBeUndefined();
        expect(err).toEqual(fakeError);
        expect(fileOpener.extractData).toHaveBeenCalledWith(filePath, expect.any(Object), expect.any(Function));
      }
    });

    it('should throw an error if the file contains no data', async () => {
      // Arrange
      jest.spyOn(fileManager, 'downloadFromS3').mockImplementation((key, bucket, cb) => cb(null, randomString()));
      jest.spyOn(fileOpener, 'extractData').mockImplementation((filePath, options, cb) => cb(null, null, []));
      // Act
      try {
        await SalesFileController.processFinancialFile({ clientId: client._id.toString(), salesFileId: salesFile1._id, financialFileKey: '' });
      } catch (err) {
        // Assert
        expect(err).not.toBeUndefined();
      }
    });

    it('should throw an error if the file is missing a header row (invalid file)', async () => {
      // Arrange
      jest.spyOn(fileManager, 'downloadFromS3').mockImplementation((key, bucket, cb) => cb(null, randomString()));
      jest.spyOn(fileOpener, 'extractData').mockImplementation((filePath, options, cb) => cb(null, null, [['row1'], ['row2']]));
      // Act
      try {
        await SalesFileController.processFinancialFile({ clientId: client._id.toString(), salesFileId: salesFile1._id, financialFileKey: '' });
      } catch (err) {
        // Assert
        expect(err).not.toBeUndefined();
      }
    });

    it('should handle any kind of file parsing errors', async () => {
      // Arrange
      jest.spyOn(fileManager, 'downloadFromS3').mockImplementation((key, bucket, cb) => cb(null, randomString()));
      jest.spyOn(fileOpener, 'extractData').mockImplementation((filePath, options, cb) => cb(null, null, [
        [''],
        [''],
        ['Header Row', 'Column 1', 'Column 2', 'Bank Account Currency'],
        [''],
        undefined,
        undefined,
        null,
        -1,
      ]));
      // Act
      try {
        await SalesFileController.processFinancialFile({ clientId: client._id.toString(), salesFileId: salesFile1._id, financialFileKey: '' });
      } catch (err) {
        // Assert
        expect(err).not.toBeUndefined();
      }
    });

    it('should find all unique bank account currency codes from the file', async () => {
      // Arrange
      client.homeCurrency = null;
      await client.save();
      jest.spyOn(fileManager, 'downloadFromS3').mockImplementation((key, bucket, cb) => cb(null, randomString()));
      jest.spyOn(fileOpener, 'extractData').mockImplementation((filePath, options, cb) => cb(null, null, [
        [''],
        [''],
        ['Header Row', 'Column 1', 'Column 2', 'Bank Account Currency'],
        [''],
        ['Row 1', '', '', 'EUR'],
        ['Row 2', '', '', 'EUR'],
        ['Row 3', '', '', 'EUR'],
        [''],
        ['Bad Row 1', '', '', 'Bank Account Currency'],
        ['Bad Row 2', '', ''],
        [''],
        ['Row 1', '', '', 'GBP'],
        ['Row 2', '', '', 'GBP'],
        [''],
        ['Row 1', '', '', 'USD'],
        ['Row 2', '', '', 'USD'],
      ]));
      // Act
      const data = await SalesFileController.processFinancialFile({ clientId: client._id.toString(), salesFileId: salesFile1._id, financialFileKey: '' });
      // Assert
      expect(data).toEqual({
        salesFileId: salesFile1._id,
        currencyCodes: ['EUR', 'GBP', 'USD'],
      });
    });

    it('should filter out the client home currency', async () => {
      // Arrange
      jest.spyOn(fileManager, 'downloadFromS3').mockImplementation((key, bucket, cb) => cb(null, randomString()));
      jest.spyOn(fileOpener, 'extractData').mockImplementation((filePath, options, cb) => cb(null, null, [
        [''],
        [''],
        ['Header Row', 'Column 1', 'Column 2', 'Bank Account Currency'],
        [''],
        ['Row 1', '', '', 'EUR'],
        ['Row 2', '', '', 'EUR'],
        ['Row 3', '', '', 'EUR'],
        [''],
        ['Bad Row 1', '', '', 'Bank Account Currency'],
        ['Bad Row 2', '', ''],
        [''],
        ['Row 1', '', '', 'GBP'],
        ['Row 2', '', '', 'GBP'],
        [''],
        ['Row 1', '', '', 'USD'],
        ['Row 2', '', '', 'USD'],
      ]));
      // Act
      const data = await SalesFileController.processFinancialFile({ clientId: client._id.toString(), salesFileId: salesFile1._id, financialFileKey: '' });
      // Assert
      expect(data).toEqual({
        salesFileId: salesFile1._id,
        currencyCodes: ['GBP', 'USD'],
      });
    });

    it('should only retrieve currency codes from the file', async () => {
      // Arrange
      jest.spyOn(fileManager, 'downloadFromS3').mockImplementation((key, bucket, cb) => cb(null, randomString()));
      jest.spyOn(fileOpener, 'extractData').mockImplementation((filePath, options, cb) => cb(null, null, [
        [''],
        [''],
        ['Header Row', 'Column 1', 'Column 2', 'Bank Account Currency'],
        [''],
        ['Row 1', '', '', 'NOK'],
        ['Row 2', '', '', 'NOK'],
        ['Row 3', '', '', 'NOK'],
        [''],
        ['Bad Row 1', '', '', 'Bank Account Currency'],
        ['Bad Row 2', '', ''],
        [''],
        ['Row 1', '', '', 'GBP'],
        ['Row 2', '', '', 'GBP'],
        [''],
        ['Row 1', '', '', '1,511.39 USD'],
        ['Row 2', '', '', 'Paid to JPMORGAN CHASE BANK'],
      ]));
      // Act
      const data = await SalesFileController.processFinancialFile({ clientId: client._id.toString(), salesFileId: salesFile1._id, financialFileKey: '' });
      // Assert
      expect(data).toEqual({
        salesFileId: salesFile1._id,
        currencyCodes: ['NOK', 'GBP'],
      });
    });
  });
});
