const { randomString, randomId, randomFloat, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const DuplicateWorks = require('./works');
const Client = require('../../models/client');
const Work = require('../../models/work');
const SalesFile = require('../../models/salesFile');
const RemovedDuplicateWork = require('../../models/removedDuplicateWork');
const DeliveredWork = require('../../models/deliveredWork');
const IswcDeliveredWork = require('../../models/iswcDeliveredWork');
const CwrDelivery = require('../../models/cwrDelivery');

jest.mock('@curveroyaltysystems/platform-shared-utils', () => {
  const original = jest.requireActual('@curveroyaltysystems/platform-shared-utils');
  const mockGetCount = jest.fn((table, col, filter, cb) => cb(null, [{ count: 0 }]));
  const mockQueryJobPromise = jest.fn(({ query }) => Promise.resolve());

  function BigQuery({ datasetName, inputTable }) {
    return {
      datasetName,
      inputTable,
      getCount: mockGetCount,
      queryJobPromise: mockQueryJobPromise,
    };
  }

  return {
    ...original,
    BigQuery,
    __mockGetCount: mockGetCount,
    __mockQueryJobPromise: mockQueryJobPromise,
  };
});

describe('mergeWorks', () => {
  let client;
  let clientId;
  let userId;
  let duplicateWork1;
  let duplicateWork2;
  let primaryWork;

  beforeEach(async () => {
    client = await Client.create({
      name: randomString(),
      bigQueryDataset: randomString(),
      bigQuerySalesTable: randomString(),
      createdBigQueryBackups: true,
      createdBigQueryTables: true,
    });
    clientId = client._id.toString();
    userId = randomId();

    // Create duplicate works and a primary work
    duplicateWork1 = new Work({
      clientId,
      title: randomString(),
      territories: ['WW'],
    });
    duplicateWork2 = new Work({
      clientId,
      title: randomString(),
      territories: ['WW'],
    });
    await Promise.all([duplicateWork1.save(), duplicateWork2.save()]);

    primaryWork = new Work({
      clientId,
      title: randomString(),
      alternateTitles: [
        { title: randomString(), language: 'NL' },
      ],
      territories: ['WW'],
      potentialDuplicates: [
        { workId: duplicateWork1._id },
        { workId: duplicateWork2._id },
      ],
      potentialDuplicatesCount: 2,
      blacklistedDuplicateIds: [randomId()],
    });
    await primaryWork.save();
  });

  it('should merge works into a single primary work', async () => {
    // Arrange
    const mergeData = {
      title: randomString(),
      alternateTitles: [
        { title: randomString(), language: 'EN' },
      ],
      territories: ['GB', 'NL', 'FR', 'SE'],
      aliases: [randomString(), randomString()],
      rightsChain: [
        {
          territory: ['WW'],
          children: [
            {
              type: 'Publisher',
              contractType: 'Original Publisher',
              publisherId: randomId(),
              controlled: true,
              children: [
                {
                  type: 'Composer',
                  contractType: 'Lyrics and Music',
                  composerId: randomId(),
                  controlled: true,
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    };

    // Act
    await DuplicateWorks.mergeWorks({
      clientId,
      userId,
      primaryWorkId: primaryWork._id.toString(),
      mergeData,
      deleteWorkIds: [duplicateWork1._id.toString(), duplicateWork2._id.toString()],
      blacklistedDuplicateIds: [],
    });

    // Assert
    // The primary work should still exist
    const mergedPrimaryWork = await Work.findById(primaryWork._id);
    expect(mergedPrimaryWork).toBeDefined();

    // The primary work should have been updated with the merge data
    expect(mergedPrimaryWork.title).toEqual(mergeData.title);
    expect(mergedPrimaryWork.alternateTitles).toMatchObject(mergeData.alternateTitles);
    expect(mergedPrimaryWork.territories).toEqual(mergeData.territories);
    expect(mergedPrimaryWork.aliases).toEqual(mergeData.aliases);
    expect(mergedPrimaryWork.rightsChains).toEqual(mergeData.rightsChains);

    // Existing fields should not be overwritten (and when not included in mergeData)
    expect(mergedPrimaryWork.createdBy).toEqual(primaryWork.createdBy);
    expect(mergedPrimaryWork.iswc).toEqual(primaryWork.iswc);

    // The potential duplicates should have been cleared
    expect(mergedPrimaryWork.potentialDuplicatesCount).toEqual(0);
    expect(mergedPrimaryWork.potentialDuplicates).toEqual([]);

    // The duplicate works should have been deleted
    const deletedWorks = await Work.find({ _id: { $in: [duplicateWork1._id, duplicateWork2._id] } });
    expect(deletedWorks).toHaveLength(0);

    // BigQuery should have been checked to see if any sales lines need updating
    const { __mockGetCount } = require('@curveroyaltysystems/platform-shared-utils');
    expect(__mockGetCount).toHaveBeenCalledWith(
      client.bigQuerySalesTable,
      'count',
      { workId: [duplicateWork1._id.toString(), duplicateWork2._id.toString()] },
      expect.any(Function),
    );
  });

  it('should remove blacklisted duplicate works (whilst also deleting other duplicates)', async () => {
    // Arrange
    const mergeData = {};

    // Act
    await DuplicateWorks.mergeWorks({
      clientId,
      userId,
      primaryWorkId: primaryWork._id.toString(),
      mergeData,
      deleteWorkIds: [duplicateWork2._id.toString()],
      blacklistedDuplicateIds: [duplicateWork1._id.toString()],
    });

    // Assert

    // The primary work should still exist
    const mergedPrimaryWork = await Work.findById(primaryWork._id);
    expect(mergedPrimaryWork).toBeDefined();

    // The blacklisted duplicate should be removed from potential duplicates
    expect(mergedPrimaryWork.potentialDuplicatesCount).toEqual(0);
    expect(mergedPrimaryWork.potentialDuplicates).toHaveLength(0);

    // The ignore duplicate ID should be saved on the primary work, so it's skipped when searching in the future
    // It should have not removed any existing ignore IDs
    expect(mergedPrimaryWork.blacklistedDuplicateIds).toHaveLength(2);
    expect(mergedPrimaryWork.blacklistedDuplicateIds).toEqual([
      ...primaryWork.blacklistedDuplicateIds,
      duplicateWork1._id.toString(),
    ]);

    // BigQuery should have been checked to see if any sales lines need updating
    const { __mockGetCount } = require('@curveroyaltysystems/platform-shared-utils');
    expect(__mockGetCount).toHaveBeenCalledWith(
      client.bigQuerySalesTable,
      'count',
      { workId: [duplicateWork2._id.toString()] },
      expect.any(Function),
    );
  });

  it('should remove blackedlisted duplicate works (whilst not deleting other duplicates)', async () => {
    // Arrange
    const mergeData = {};

    // Act
    await DuplicateWorks.mergeWorks({
      clientId,
      userId,
      primaryWorkId: primaryWork._id.toString(),
      mergeData,
      deleteWorkIds: [],
      blacklistedDuplicateIds: [duplicateWork1._id.toString()],
    });

    // Assert

    // The primary work should still exist
    const mergedPrimaryWork = await Work.findById(primaryWork._id);
    expect(mergedPrimaryWork).toBeDefined();

    // The blacklisted duplicate should be removed from potential duplicates
    expect(mergedPrimaryWork.potentialDuplicatesCount).toEqual(1);
    expect(mergedPrimaryWork.potentialDuplicates).toHaveLength(1);
    expect(mergedPrimaryWork.potentialDuplicates[0].workId.toString()).toEqual(duplicateWork2._id.toString());

    // The ignore duplicate ID should be saved on the primary work, so it's skipped when searching in the future
    // It should have not removed any existing ignore IDs
    expect(mergedPrimaryWork.blacklistedDuplicateIds).toHaveLength(2);
    expect(mergedPrimaryWork.blacklistedDuplicateIds).toEqual([
      ...primaryWork.blacklistedDuplicateIds,
      duplicateWork1._id.toString(),
    ]);

    // BigQuery should not have been checked as no works are being deleted
    const { __mockGetCount } = require('@curveroyaltysystems/platform-shared-utils');
    expect(__mockGetCount).not.toHaveBeenCalled();
  });

  it('should save copies of the deleted works for delivery history', async () => {
    // Arrange
    const mergeData = {};

    // Act
    await DuplicateWorks.mergeWorks({
      clientId,
      userId,
      primaryWorkId: primaryWork._id.toString(),
      mergeData,
      deleteWorkIds: [duplicateWork1._id.toString(), duplicateWork2._id.toString()],
      blacklistedDuplicateIds: [],
    });

    // Assert
    const loggedWorks = await RemovedDuplicateWork.find({ clientId });
    expect(loggedWorks).toHaveLength(2);

    // Works should be logged with the correct historical data
    const work1 = loggedWorks.find((w) => w.originalWorkId.toString() === duplicateWork1._id.toString());
    const work2 = loggedWorks.find((w) => w.originalWorkId.toString() === duplicateWork2._id.toString());

    expect(work1.clientId.toString()).toEqual(clientId);
    expect(work1.mergedByUserId.toString()).toEqual(userId);
    expect(work1.mergedIntoWorkId.toString()).toEqual(primaryWork._id.toString());
    expect(work1.mergedWithWorkIds).toHaveLength(1);
    expect(work1.mergedWithWorkIds[0].toString()).toEqual(duplicateWork2._id.toString());
    expect(work1.originalWorkId).toEqual(duplicateWork1._id);
    expect(work1.originalWork._id).toEqual(duplicateWork1._id);
    expect(work1.originalWork.title).toEqual(duplicateWork1.title);

    expect(work2.clientId.toString()).toEqual(clientId);
    expect(work2.mergedByUserId.toString()).toEqual(userId);
    expect(work2.mergedIntoWorkId.toString()).toEqual(primaryWork._id.toString());
    expect(work2.mergedWithWorkIds).toHaveLength(1);
    expect(work2.mergedWithWorkIds[0].toString()).toEqual(duplicateWork1._id.toString());
    expect(work2.originalWorkId).toEqual(duplicateWork2._id);
    expect(work2.originalWork._id).toEqual(duplicateWork2._id);
    expect(work2.originalWork.title).toEqual(duplicateWork2.title);
  });

  describe('when the works have sales input lines in BigQuery', () => {
  // BigQuery client and mock data
    let fakeSalesInputRows;
    let fakeRowsCount;

    beforeEach(async () => {
      // Create fake sales lines in BigQuery for the works
      fakeRowsCount = 100;
      fakeSalesInputRows = Array.from({ length: fakeRowsCount }, (_, i) => ({
        id: randomId(),
        salesFileId: randomId(),
        workId: i % 2 === 0 ? duplicateWork1._id.toString() : duplicateWork2._id.toString(),
        territory: randomString(),
        netAmount: randomFloat(),
      }));
      // Add more fake rows unrelated to the tested works
      fakeSalesInputRows.push(...Array.from({ length: fakeRowsCount / 2 }, () => ({
        id: randomId(),
        salesFileId: randomId(),
        workId: randomId(),
        territory: randomString(),
        netAmount: randomFloat(),
      })));

      // Mock the required BigQuery methods based on the fake data above
      const { __mockGetCount } = require('@curveroyaltysystems/platform-shared-utils');
      __mockGetCount.mockImplementation((table, col, filter, cb) => cb(null, [{ count: fakeRowsCount }]));
    });

    it('should update the workId of works that have been deleted', async () => {
    // Arrange
      const mergeData = {
        title: randomString(),
        alternateTitles: [
          { title: randomString(), language: 'EN' },
        ],
        territories: ['GB', 'NL', 'FR', 'SE'],
        aliases: [randomString(), randomString()],
        rightsChain: [
          {
            territory: ['WW'],
            children: [
              {
                type: 'Publisher',
                contractType: 'Original Publisher',
                publisherId: randomId(),
                controlled: true,
                children: [
                  {
                    type: 'Composer',
                    contractType: 'Lyrics and Music',
                    composerId: randomId(),
                    controlled: true,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      };

      // Act
      await DuplicateWorks.mergeWorks({
        clientId,
        userId,
        primaryWorkId: primaryWork._id.toString(),
        mergeData,
        deleteWorkIds: [duplicateWork1._id.toString(), duplicateWork2._id.toString()],
        blacklistedDuplicateIds: [],
      });

      // Assert
      const { __mockQueryJobPromise } = require('@curveroyaltysystems/platform-shared-utils');
      expect(__mockQueryJobPromise).toHaveBeenCalledWith({
        query: {
          query: `UPDATE \`${client.bigQueryDataset}.${client.bigQuerySalesTable}\` SET workId = @primaryWorkId WHERE workId IN UNNEST(@workIds)`,
          params: {
            primaryWorkId: primaryWork._id.toString(),
            workIds: [duplicateWork1._id.toString(), duplicateWork2._id.toString()],
          },
        },
        labels: {
          client_id: clientId,
          document_id: primaryWork._id.toString(),
          job_type: 'merge_catalogue',
        },
      });
    });
  });

  describe('when the works are included in sales files', () => {
    it('should remove duplicate work id references', async () => {
      // Arrange
      const [
        salesFile1,
        salesFile2,
        salesFile3,
      ] = await Promise.all([
        SalesFile.create({ clientId, usedWorkIds: [randomId(), duplicateWork1._id.toString()] }),
        SalesFile.create({ clientId, usedWorkIds: [duplicateWork1._id.toString(), duplicateWork2._id.toString()] }),
        SalesFile.create({ clientId, usedWorkIds: [randomId(), randomId()] }),
      ]);

      // Act
      await DuplicateWorks.mergeWorks({
        clientId,
        userId,
        primaryWorkId: primaryWork._id.toString(),
        mergeData: {},
        deleteWorkIds: [duplicateWork1._id.toString(), duplicateWork2._id.toString()],
        blacklistedDuplicateIds: [],
      });

      // Assert
      const salesFiles = await SalesFile.find({ clientId, _id: { $in: [salesFile1._id, salesFile2._id, salesFile3._id] } });
      expect(salesFiles).toHaveLength(3);
      const updatedSalesFile1 = salesFiles.find((f) => f._id.equals(salesFile1._id));
      const updatedSalesFile2 = salesFiles.find((f) => f._id.equals(salesFile2._id));
      const updatedSalesFile3 = salesFiles.find((f) => f._id.equals(salesFile3._id));
      expect(updatedSalesFile1.usedWorkIds).toEqual([salesFile1.usedWorkIds[0], primaryWork._id.toString()]);
      expect(updatedSalesFile2.usedWorkIds).toEqual([primaryWork._id.toString()]);
      expect(updatedSalesFile3.usedWorkIds).toEqual(salesFile3.usedWorkIds);
    });
  });

  describe('when the works have been delivered in the past', () => {
    it('should update delivered works to reference the primary work', async () => {
      // Arrange
      const deliveredWork1 = await DeliveredWork.create({ clientId, workId: duplicateWork1._id });
      const deliveredWork2 = await DeliveredWork.create({ clientId, workId: duplicateWork2._id });
      const deliveredWork3 = await DeliveredWork.create({ clientId, workId: primaryWork._id });

      // Act
      await DuplicateWorks.mergeWorks({
        clientId,
        userId,
        primaryWorkId: primaryWork._id.toString(),
        mergeData: {},
        deleteWorkIds: [duplicateWork1._id.toString(), duplicateWork2._id.toString()],
        blacklistedDuplicateIds: [],
      });

      // Assert
      const deliveredWorks = await DeliveredWork.find({ clientId });
      expect(deliveredWorks).toHaveLength(3);

      const updated1 = deliveredWorks.find((w) => w._id.equals(deliveredWork1._id));
      const updated2 = deliveredWorks.find((w) => w._id.equals(deliveredWork2._id));
      const updated3 = deliveredWorks.find((w) => w._id.equals(deliveredWork3._id));

      // The Delivered Works should still have their reference to the originally delivered Work
      expect(updated1.workId.toString()).toEqual(deliveredWork1.workId.toString());
      expect(updated2.workId.toString()).toEqual(deliveredWork2.workId.toString());
      expect(updated3.workId.toString()).toEqual(deliveredWork3.workId.toString());

      // The duplicate Delivered Works should have a new reference to the primary Work ID
      expect(updated1.mergedIntoWorkId.toString()).toEqual(primaryWork._id.toString());
      expect(updated2.mergedIntoWorkId.toString()).toEqual(primaryWork._id.toString());
      // The primary Delivered Work should not have a mergedIntoWorkId field
      expect(updated3.mergedIntoWorkId).toBeNull();
    });
  });

  describe('when iswc works have been delivered in the past', () => {
    it('should update ISWC delivered works to reference the primary work', async () => {
      // Arrange
      const iswcDeliveredWork1 = await IswcDeliveredWork.create({ clientId, workId: duplicateWork1._id });
      const iswcDeliveredWork2 = await IswcDeliveredWork.create({ clientId, workId: duplicateWork2._id });
      const iswcDeliveredWork3 = await IswcDeliveredWork.create({ clientId, workId: primaryWork._id });

      // Act
      await DuplicateWorks.mergeWorks({
        clientId,
        userId,
        primaryWorkId: primaryWork._id.toString(),
        mergeData: {},
        deleteWorkIds: [duplicateWork1._id.toString(), duplicateWork2._id.toString()],
        blacklistedDuplicateIds: [],
      });

      // Assert
      const iswcDeliveredWorks = await IswcDeliveredWork.find({ clientId });
      expect(iswcDeliveredWorks).toHaveLength(3);

      const updated1 = iswcDeliveredWorks.find((w) => w._id.equals(iswcDeliveredWork1._id));
      const updated2 = iswcDeliveredWorks.find((w) => w._id.equals(iswcDeliveredWork2._id));
      const updated3 = iswcDeliveredWorks.find((w) => w._id.equals(iswcDeliveredWork3._id));

      // The ISWC Delivered Works should still have their reference to the originally delivered Work
      expect(updated1.workId.toString()).toEqual(iswcDeliveredWork1.workId.toString());
      expect(updated2.workId.toString()).toEqual(iswcDeliveredWork2.workId.toString());
      expect(updated3.workId.toString()).toEqual(iswcDeliveredWork3.workId.toString());

      // The duplicate ISWC Delivered Works should have a new reference to the primary Work ID
      expect(updated1.mergedIntoWorkId.toString()).toEqual(primaryWork._id.toString());
      expect(updated2.mergedIntoWorkId.toString()).toEqual(primaryWork._id.toString());
      // The primary ISWC Delivered Work should not have a mergedIntoWorkId field
      expect(updated3.mergedIntoWorkId).toBeNull();
    });
  });

  describe('when the works are included in cwr delivery filters', () => {
    it('should update the filter to reference the primary work', async () => {
      // Arrange
      const anotherRandomId = randomId();
      const cwrDelivery = new CwrDelivery({
        clientId,
        deliveryPartnerId: randomId(),
        filterType: 'custom',
        name: randomString(),
        territory: 'WW',
        filter: {
          workIds: [
            duplicateWork1._id.toString(),
            anotherRandomId,
            duplicateWork2._id.toString(),
          ],
        },
      });
      await CwrDelivery.insertMany([cwrDelivery]);

      // Act
      await DuplicateWorks.mergeWorks({
        clientId,
        userId,
        primaryWorkId: primaryWork._id.toString(),
        mergeData: {},
        deleteWorkIds: [duplicateWork1._id.toString(), duplicateWork2._id.toString()],
        blacklistedDuplicateIds: [],
      });

      // Assert
      const updatedDelivery = await CwrDelivery.findById(cwrDelivery._id);
      expect(updatedDelivery.filter.workIds).toHaveLength(2);
      expect(updatedDelivery.filter.workIds).toEqual(expect.arrayContaining([anotherRandomId, primaryWork._id.toString()]));
    });
  });

  describe('when participation rates have been added', () => {
    it('should also build the salesReturnsRightsDisplay field', async () => {
      // Arrange
      const mergeData = {
        title: randomString(),
        salesReturnsRights: [
          { workId: randomId(), workTitle: randomString(), contractId: randomId(), percentage: randomInt() },
          {
            workId: randomId(),
            workTitle: randomString(),
            contractId: randomId(),
            percentage: randomInt(),
            children: [
              {
                workId: randomId(),
                workTitle: randomString(),
                contractId: randomId(),
                percentage: randomInt(),
              },
            ],
          },
          { workId: randomId(), workTitle: randomString(), contractId: randomId(), percentage: randomInt() },
        ],
      };

      // Act
      await DuplicateWorks.mergeWorks({
        clientId,
        userId,
        primaryWorkId: primaryWork._id.toString(),
        mergeData,
        deleteWorkIds: [duplicateWork1._id.toString(), duplicateWork2._id.toString()],
        blacklistedDuplicateIds: [],
      });

      // Assert
      const mergedPrimaryWork = await Work.findById(primaryWork._id).lean();

      // Normal version should just include the flat top-level list
      expect(mergedPrimaryWork.salesReturnsRights).toMatchObject([
        { contractId: mergeData.salesReturnsRights[0].contractId, percentage: mergeData.salesReturnsRights[0].percentage },
        { contractId: mergeData.salesReturnsRights[1].contractId, percentage: mergeData.salesReturnsRights[1].percentage },
        { contractId: mergeData.salesReturnsRights[2].contractId, percentage: mergeData.salesReturnsRights[2].percentage },
      ]);

      // Display version should include the nested contract
      expect(mergedPrimaryWork.salesReturnsRightsDisplay).toEqual([
        { contractId: mergeData.salesReturnsRights[0].contractId, percentage: mergeData.salesReturnsRights[0].percentage },
        {
          contractId: mergeData.salesReturnsRights[1].contractId,
          percentage: mergeData.salesReturnsRights[1].percentage,
          children: [
            { contractId: mergeData.salesReturnsRights[1].children[0].contractId, percentage: mergeData.salesReturnsRights[1].children[0].percentage },
          ],
        },
        { contractId: mergeData.salesReturnsRights[2].contractId, percentage: mergeData.salesReturnsRights[2].percentage },
      ]);
    });
  });

  describe('when field values being saved already exist in other works', () => {
    it('should ignore duplicate value model validation for Main Identifier', async () => {
      // Arrange
      const mergeData = {
        title: randomString(),
        identifier: randomString(),
      };
      duplicateWork1.identifier = mergeData.identifier;
      await duplicateWork1.save();

      // Act
      await DuplicateWorks.mergeWorks({
        clientId,
        userId,
        primaryWorkId: primaryWork._id.toString(),
        mergeData,
        deleteWorkIds: [duplicateWork1._id.toString(), duplicateWork2._id.toString()],
        blacklistedDuplicateIds: [],
      });

      // Assert
      // If this is reached then the test has passed as the duplicate validation would have been ignored
      const mergedPrimaryWork = await Work.findById(primaryWork._id).lean();
      expect(mergedPrimaryWork.identifier).toEqual(mergeData.identifier);
    });

    it('should ignore duplicate value model validation for ISWC', async () => {
      // Arrange
      const mergeData = {
        title: randomString(),
        iswc: 'T-345246800-1',
      };
      duplicateWork1.iswc = mergeData.iswc;
      await duplicateWork1.save();

      // Act
      await DuplicateWorks.mergeWorks({
        clientId,
        userId,
        primaryWorkId: primaryWork._id.toString(),
        mergeData,
        deleteWorkIds: [duplicateWork1._id.toString(), duplicateWork2._id.toString()],
        blacklistedDuplicateIds: [],
      });

      // Assert
      // If this is reached then the test has passed as the duplicate validation would have been ignored
      const mergedPrimaryWork = await Work.findById(primaryWork._id).lean();
      expect(mergedPrimaryWork.iswc).toEqual(mergeData.iswc);
    });

    it('should ignore duplicate value model validation for Tunecode', async () => {
      // Arrange
      const mergeData = {
        title: randomString(),
        tunecode: randomString(),
      };
      duplicateWork1.tunecode = mergeData.tunecode;
      await duplicateWork1.save();

      // Act
      await DuplicateWorks.mergeWorks({
        clientId,
        userId,
        primaryWorkId: primaryWork._id.toString(),
        mergeData,
        deleteWorkIds: [duplicateWork1._id.toString(), duplicateWork2._id.toString()],
        blacklistedDuplicateIds: [],
      });

      // Assert
      // If this is reached then the test has passed as the duplicate validation would have been ignored
      const mergedPrimaryWork = await Work.findById(primaryWork._id).lean();
      expect(mergedPrimaryWork.tunecode).toEqual(mergeData.tunecode);
    });
  });
});

describe('getDuplicates', () => {
  let client;
  let clientId;
  let duplicateWork1;
  let duplicateWork2;
  let primaryWork;

  beforeEach(async () => {
    client = await Client.create({
      name: randomString(),
      bigQueryDataset: randomString(),
      bigQuerySalesTable: randomString(),
      createdBigQueryBackups: true,
      createdBigQueryTables: true,
    });
    clientId = client._id.toString();

    // Create duplicate works and a primary work
    duplicateWork1 = new Work({
      clientId,
      title: 'Duplicate One',
      territories: ['WW'],
      foreignId: randomString(),
      composer: randomString(),
    });
    duplicateWork2 = new Work({
      clientId,
      title: 'Duplicate Two',
      territories: ['WW'],
      foreignId: randomString(),
      composer: randomString(),
    });
    await Promise.all([duplicateWork1.save(), duplicateWork2.save()]);

    primaryWork = new Work({
      clientId,
      title: 'Primary Work',
      alternateTitles: [
        { title: randomString(), language: 'NL' },
      ],
      territories: ['WW'],
      potentialDuplicates: [
        { workId: duplicateWork1._id },
        { workId: duplicateWork2._id },
      ],
      potentialDuplicatesCount: 2,
      blacklistedDuplicateIds: [randomId()],
    });
    await primaryWork.save();
  });

  it('should find duplicates by search term', async () => {
    // Act
    const works = await DuplicateWorks.getDuplicateWorks({ clientId,
      query: {
        search: 'Primary',
      },
    });

    // Assert
    expect(works.meta.total).toEqual(1);
    expect(works.duplicates).toHaveLength(1);
    expect(works.duplicates).toEqual([
      {
        _id: primaryWork._id,
        clientId,
        id: primaryWork._id.toString(),
        potentialDuplicates: [
          {
            composer: duplicateWork1.composer,
            foreignId: duplicateWork1.foreignId,
            title: duplicateWork1.title,
            workId: duplicateWork1._id.toString(),
          },
          {
            composer: duplicateWork2.composer,
            foreignId: duplicateWork2.foreignId,
            title: duplicateWork2.title,
            workId: duplicateWork2._id.toString(),
          },
        ],
        potentialDuplicatesCount: 2,
        title: primaryWork.title,
      },
    ]);
  });

  it('should find nested duplicates by search term', async () => {
    // Act
    const works = await DuplicateWorks.getDuplicateWorks({ clientId,
      query: {
        search: 'Duplicate Two',
      },
    });

    // Assert
    expect(works.meta.total).toEqual(1);
    expect(works.duplicates).toHaveLength(1);
    expect(works.duplicates).toEqual([
      {
        _id: primaryWork._id,
        clientId,
        id: primaryWork._id.toString(),
        potentialDuplicates: [
          {
            composer: duplicateWork1.composer,
            foreignId: duplicateWork1.foreignId,
            title: duplicateWork1.title,
            workId: duplicateWork1._id.toString(),
          },
          {
            composer: duplicateWork2.composer,
            foreignId: duplicateWork2.foreignId,
            title: duplicateWork2.title,
            workId: duplicateWork2._id.toString(),
          },
        ],
        potentialDuplicatesCount: 2,
        title: primaryWork.title,
      },
    ]);
  });
});
