process.env.NODE_ENV = 'test';

require('../../../models/db');
const { testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { expect } = require('chai');
const { randomString, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const rewire = require('rewire');
const sinon = require('sinon');

const Client = require('../../../models/client');
const Contract = require('../../../models/contract');
const Filter = require('../../../libs/filter');
const Work = require('../../../models/work');
const Track = require('../../../models/track');
const Release = require('../../../models/release');

// This test has been migrated to Jest and is being kept here for reference.
// It will be deleted at a later point.
describe.skip('Analytics', () => {
  let Analytics;
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

  before((done) => {
    sinon.restore();
    testUtils.cleanUp(done);
  });

  beforeEach(async () => {
    sinon.restore();
    testUtils.cleanUp();
    Analytics = rewire('../../../libs/analytics');

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

    sinon.stub(Analytics, 'runQuery');
    Analytics.runQuery.yields(null, fakeRows);
    filterSpy = sinon.spy(Filter, 'filterToDbFilter');
    querySpy = sinon.spy(Analytics, 'buildQuery');
  });

  afterEach((done) => {
    sinon.restore();
    testUtils.cleanUp(done);
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
        expect(data.totalRevenue).to.equal(fakeRows[0].homeCurrencyNetAmount + fakeRows[1].homeCurrencyNetAmount);
        expect(data.totalUnits).to.equal(fakeRows[0].units + fakeRows[1].units);
        // Contract ID filter should be passed into query builder
        expect(filterSpy.args[0][0]).to.eql(filter);
        // Check the query filter
        const queryFilter = querySpy.args[0][4];
        expect(queryFilter).to.eql({
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
          expect(data.totalRevenue).to.equal(fakeRows[0].homeCurrencyNetAmount + fakeRows[1].homeCurrencyNetAmount);
          expect(data.totalUnits).to.equal(fakeRows[0].units + fakeRows[1].units);
          // Contract ID filter should be passed into query builder
          expect(filterSpy.args[0][0]).to.eql(filter);
          // Check the query filter
          const queryFilter = querySpy.args[0][4];
          expect(queryFilter).to.eql({
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
          expect(data.totalRevenue).to.equal(fakeRows[0].homeCurrencyNetAmount + fakeRows[1].homeCurrencyNetAmount);
          expect(data.totalUnits).to.equal(fakeRows[0].units + fakeRows[1].units);
          // Contract ID filter should be passed into query builder
          expect(filterSpy.args[0][0]).to.eql(filter);
          // Check the query filter
          const queryFilter = querySpy.args[0][4];
          expect(queryFilter).to.eql({
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
          expect(data.totalRevenue).to.equal(fakeRows[0].homeCurrencyNetAmount + fakeRows[1].homeCurrencyNetAmount);
          expect(data.totalUnits).to.equal(fakeRows[0].units + fakeRows[1].units);
          // Contract ID filter should be passed into query builder
          expect(filterSpy.args[0][0]).to.eql(filter);
          // Check the query filter
          const queryFilter = querySpy.args[0][4];
          expect(queryFilter).to.eql({
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
        expect(data.totalRevenue).to.equal(fakeRows[0].homeCurrencyNetAmount + fakeRows[1].homeCurrencyNetAmount);
        expect(data.totalUnits).to.equal(fakeRows[0].units + fakeRows[1].units);
        // Contract ID filter should be passed into query builder
        expect(filterSpy.args[0][0]).to.eql(filter);
        // Check the query filter
        const queryFilter = querySpy.args[0][4];
        expect(queryFilter).to.eql({
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
        expect(data.totalRevenue).to.equal(fakeRows[0].homeCurrencyNetAmount + fakeRows[1].homeCurrencyNetAmount);
        expect(data.totalUnits).to.equal(fakeRows[0].units + fakeRows[1].units);
        // Contract ID filter should be passed into query builder
        expect(filterSpy.args[0][0]).to.eql(filter);
        // Check the query filter
        const queryFilter = querySpy.args[0][4];
        expect(queryFilter).to.eql({
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
        expect(data.totalRevenue).to.equal(fakeRows[0].homeCurrencyNetAmount + fakeRows[1].homeCurrencyNetAmount);
        expect(data.totalUnits).to.equal(fakeRows[0].units + fakeRows[1].units);
        // Contract ID filter should be passed into query builder
        expect(filterSpy.args[0][0]).to.eql(filter);
        // Check the query filter
        const queryFilter = querySpy.args[0][4];
        expect(queryFilter).to.eql({
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
