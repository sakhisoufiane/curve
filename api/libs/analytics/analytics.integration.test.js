const { randomString, randomInt, cleanUpAsync } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const Client = require('../../models/client');
const Contract = require('../../models/contract');
const Filter = require('../filter');
const Work = require('../../models/work');
const Track = require('../../models/track');
const Release = require('../../models/release');
const Analytics = require('./analytics');

describe('Analytics', () => {
  let client;
  let contract;
  let work;
  let track;
  let release;
  let salesReturnsRights;

  let filter;
  let options;
  let fakeRows;
  let filterSpy;
  let querySpy;

  beforeEach(async () => {
    client = new Client({
      name: randomString(),
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    });
    await client.save();

    contract = new Contract({ clientId: client._id.toString(), name: randomString() });
    await contract.save();
    salesReturnsRights = [{ contractId: contract._id.toString(), percentage: 100 }];

    filter = [{ contractIds: [contract._id.toString()] }];
    options = { clientId: client._id.toString() };
    fakeRows = [
      {
        homeCurrencyNetAmount: randomInt(),
        units: randomInt(),
        lines: randomInt(),
      },
      {
        homeCurrencyNetAmount: randomInt(),
        units: randomInt(),
        lines: randomInt(),
      },
    ];

    jest.spyOn(Analytics, 'runQuery').mockImplementation((bigQuery, query, labels, cb) => cb(null, fakeRows));
    filterSpy = jest.spyOn(Filter, 'filterToDbFilter');
    querySpy = jest.spyOn(Analytics, 'buildQuery');
  });

  afterEach(async () => {
    await cleanUpAsync(client._id.toString());
  });

  describe('when a Contract id filter is specified', () => {
    describe('when the contract has Works assigned', () => {
      beforeEach(async () => {
        work = new Work({
          clientId: client._id.toString(),
          title: randomString(),
          salesReturnsRights,
        });
        await work.save();
      });

      it('should include the work id in the query filter', async () => {
        // Act
        const data = await new Promise((resolve, reject) => {
          Analytics.getAnalytics(filter, [], options, (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });
        // Assert
        // The correct totals should be returned
        expect(data.totalRevenue).toBe(fakeRows[0].homeCurrencyNetAmount + fakeRows[1].homeCurrencyNetAmount);
        expect(data.totalUnits).toBe(fakeRows[0].units + fakeRows[1].units);
        // Contract ID filter should be passed into query builder
        expect(filterSpy.mock.calls[0][0]).toEqual(filter);
        // Check the query filter
        const queryFilter = querySpy.mock.calls[0][4];
        expect(queryFilter).toEqual({
          $or: [
            {
              $and: [
                { catType: 'Work', workId: { $in: [work._id.toString()] } },
              ],
            },
          ],
        });
      });

      describe('when the contract also has Tracks assigned', () => {
        it('should include the work id and track id in the query filter', async () => {
          // Arrange
          track = new Track({
            clientId: client._id.toString(),
            title: randomString(),
            salesReturnsRights,
          });
          await track.save();
          // Act
          const data = await new Promise((resolve, reject) => {
            Analytics.getAnalytics(filter, [], options, (err, data) => {
              if (err) reject(err);
              else resolve(data);
            });
          });
          // Assert
          // The correct totals should be returned
          expect(data.totalRevenue).toBe(fakeRows[0].homeCurrencyNetAmount + fakeRows[1].homeCurrencyNetAmount);
          expect(data.totalUnits).toBe(fakeRows[0].units + fakeRows[1].units);
          // Contract ID filter should be passed into query builder
          expect(filterSpy.mock.calls[0][0]).toEqual(filter);
          // Check the query filter
          const queryFilter = querySpy.mock.calls[0][4];
          expect(queryFilter).toEqual({
            $or: [
              {
                $and: [
                  {
                    $or: [
                      { catType: 'Contract', contractId: { $in: [contract._id.toString()] } },
                      { catType: 'Track', trackId: { $in: [track._id.toString()] } },
                      { catType: 'Work', workId: { $in: [work._id.toString()] } },
                    ],
                  },
                ],
              },
            ],
          });
        });
      });

      describe('when the contract also has Releases assigned', () => {
        it('should include the work id and release id in the query filter', async () => {
          // Arrange
          release = new Release({
            clientId: client._id.toString(),
            title: randomString(),
            salesReturnsRights,
          });
          await release.save();
          // Act
          const data = await new Promise((resolve, reject) => {
            Analytics.getAnalytics(filter, [], options, (err, data) => {
              if (err) reject(err);
              else resolve(data);
            });
          });
          // Assert
          // The correct totals should be returned
          expect(data.totalRevenue).toBe(fakeRows[0].homeCurrencyNetAmount + fakeRows[1].homeCurrencyNetAmount);
          expect(data.totalUnits).toBe(fakeRows[0].units + fakeRows[1].units);
          // Contract ID filter should be passed into query builder
          expect(filterSpy.mock.calls[0][0]).toEqual(filter);
          // Check the query filter
          const queryFilter = querySpy.mock.calls[0][4];
          expect(queryFilter).toEqual({
            $or: [
              {
                $and: [
                  {
                    $or: [
                      { catType: 'Contract', contractId: { $in: [contract._id.toString()] } },
                      { catType: 'Release', releaseId: { $in: [release._id.toString()] } },
                      { catType: 'Work', workId: { $in: [work._id.toString()] } },
                    ],
                  },
                ],
              },
            ],
          });
        });
      });

      describe('when the contract also has Tracks AND Releases assigned', () => {
        it('should include the work id, track id and release id in the query filter', async () => {
          // Arrange
          release = new Release({
            clientId: client._id.toString(),
            title: randomString(),
            salesReturnsRights,
          });
          track = new Track({
            clientId: client._id.toString(),
            title: randomString(),
            salesReturnsRights,
          });
          await Promise.all([release.save(), track.save()]);
          // Act
          const data = await new Promise((resolve, reject) => {
            Analytics.getAnalytics(filter, [], options, (err, data) => {
              if (err) reject(err);
              else resolve(data);
            });
          });
          // Assert
          // The correct totals should be returned
          expect(data.totalRevenue).toBe(fakeRows[0].homeCurrencyNetAmount + fakeRows[1].homeCurrencyNetAmount);
          expect(data.totalUnits).toBe(fakeRows[0].units + fakeRows[1].units);
          // Contract ID filter should be passed into query builder
          expect(filterSpy.mock.calls[0][0]).toEqual(filter);
          // Check the query filter
          const queryFilter = querySpy.mock.calls[0][4];
          expect(queryFilter).toEqual({
            $or: [
              {
                $and: [
                  {
                    $or: [
                      { catType: 'Contract', contractId: { $in: [contract._id.toString()] } },
                      { catType: 'Release', releaseId: { $in: [release._id.toString()] } },
                      { catType: 'Track', trackId: { $in: [track._id.toString()] } },
                      { catType: 'Work', workId: { $in: [work._id.toString()] } },
                    ],
                  },
                ],
              },
            ],
          });
        });
      });
    });

    describe('when the contract has only Tracks AND Releases assigned', () => {
      it('should include the track id and release id in the query filter', async () => {
        // Arrange
        release = new Release({
          clientId: client._id.toString(),
          title: randomString(),
          salesReturnsRights,
        });
        track = new Track({
          clientId: client._id.toString(),
          title: randomString(),
          salesReturnsRights,
        });
        await Promise.all([release.save(), track.save()]);
        // Act
        const data = await new Promise((resolve, reject) => {
          Analytics.getAnalytics(filter, [], options, (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });
        // Assert
        // The correct totals should be returned
        expect(data.totalRevenue).toBe(fakeRows[0].homeCurrencyNetAmount + fakeRows[1].homeCurrencyNetAmount);
        expect(data.totalUnits).toBe(fakeRows[0].units + fakeRows[1].units);
        // Contract ID filter should be passed into query builder
        expect(filterSpy.mock.calls[0][0]).toEqual(filter);
        // Check the query filter
        const queryFilter = querySpy.mock.calls[0][4];
        expect(queryFilter).toEqual({
          $or: [
            {
              $and: [
                {
                  $or: [
                    { catType: 'Contract', contractId: { $in: [contract._id.toString()] } },
                    { catType: 'Release', releaseId: { $in: [release._id.toString()] } },
                    { catType: 'Track', trackId: { $in: [track._id.toString()] } },
                  ],
                },
              ],
            },
          ],
        });
      });
    });

    describe('when the contract has only Tracks assigned', () => {
      it('should include only the track id in the query filter', async () => {
        // Arrange
        track = new Track({
          clientId: client._id.toString(),
          title: randomString(),
          salesReturnsRights,
        });
        await track.save();
        // Act
        const data = await new Promise((resolve, reject) => {
          Analytics.getAnalytics(filter, [], options, (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });
        // Assert
        // The correct totals should be returned
        expect(data.totalRevenue).toBe(fakeRows[0].homeCurrencyNetAmount + fakeRows[1].homeCurrencyNetAmount);
        expect(data.totalUnits).toBe(fakeRows[0].units + fakeRows[1].units);
        // Contract ID filter should be passed into query builder
        expect(filterSpy.mock.calls[0][0]).toEqual(filter);
        // Check the query filter
        const queryFilter = querySpy.mock.calls[0][4];
        expect(queryFilter).toEqual({
          $or: [
            {
              $and: [
                {
                  $or: [
                    { catType: 'Contract', contractId: { $in: [contract._id.toString()] } },
                    { catType: 'Track', trackId: { $in: [track._id.toString()] } },
                  ],
                },
              ],
            },
          ],
        });
      });
    });

    describe('when the contract has only Releases assigned', () => {
      it('should include only the release id in the query filter', async () => {
        // Arrange
        release = new Release({
          clientId: client._id.toString(),
          title: randomString(),
          salesReturnsRights,
        });
        await release.save();
        // Act
        const data = await new Promise((resolve, reject) => {
          Analytics.getAnalytics(filter, [], options, (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });
        // Assert
        // The correct totals should be returned
        expect(data.totalRevenue).toBe(fakeRows[0].homeCurrencyNetAmount + fakeRows[1].homeCurrencyNetAmount);
        expect(data.totalUnits).toBe(fakeRows[0].units + fakeRows[1].units);
        // Contract ID filter should be passed into query builder
        expect(filterSpy.mock.calls[0][0]).toEqual(filter);
        // Check the query filter
        const queryFilter = querySpy.mock.calls[0][4];
        expect(queryFilter).toEqual({
          $or: [
            {
              $and: [
                {
                  $or: [
                    { catType: 'Contract', contractId: { $in: [contract._id.toString()] } },
                    { catType: 'Release', releaseId: { $in: [release._id.toString()] } },
                  ],
                },
              ],
            },
          ],
        });
      });
    });
  });
});
