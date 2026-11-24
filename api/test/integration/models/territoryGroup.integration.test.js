process.env.NODE_ENV = 'test';
require('../../../models/db');

const { testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const chai = require('chai');

const { expect } = chai;
const TerritoryGroup = require('../../../models/territoryGroup');
const Client = require('../../../models/client');

describe('Integration Test for Territory Group Model', () => {
  let client;

  // Set up mock data before each test
  beforeEach(async () => {
    // Ensure a fresh state for each test
    await testUtils.cleanUp();

    client = await new Client({
      name: 'TEST CLIENT',
      issueIdentifier: false,
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    }).save();
  });

  afterEach(async () => {
    await testUtils.cleanUp();
  });

  describe('Saving a territory group', () => {
    it('should throw an error if the name is a continent from territoryGroupTerritories', async () => {
      try {
        const territoryGroup1 = new TerritoryGroup({
          name: 'Asia',
          clientId: client._id.toString(),
        });

        await territoryGroup1.save();
      } catch (error) {
        expect(error).to.exist;
        expect(error.message).to.equal('The provided name is disallowed as it matches a territory code, name, or continent.');
      }
    });

    it('should throw an error if the name is a code from territoryGroupTerritories', async () => {
      try {
        const territoryGroup1 = new TerritoryGroup({
          name: 'DE',
          clientId: client._id.toString(),
        });

        await territoryGroup1.save();
      } catch (error) {
        expect(error).to.exist;
        expect(error.message).to.equal('The provided name is disallowed as it matches a territory code, name, or continent.');
      }
    });

    it('should throw an error if the name is a name from territoryGroupTerritories', async () => {
      try {
        const territoryGroup1 = new TerritoryGroup({
          name: 'Chad',
          clientId: client._id.toString(),
        });

        await territoryGroup1.save();
      } catch (error) {
        expect(error).to.exist;
        expect(error.message).to.equal('The provided name is disallowed as it matches a territory code, name, or continent.');
      }
    });

    it('should save successfully if the name is not a name, code or continent from territoryGroupTerritories', async () => {
      const newTerritoryGroup = new TerritoryGroup({
        name: 'Territory Group',
        clientId: client._id.toString(),
      });

      const savedTerritoryGroup = await newTerritoryGroup.save();

      expect(savedTerritoryGroup).to.exist;
      expect(savedTerritoryGroup.name).to.equal('Territory Group');
      expect(savedTerritoryGroup.clientId.toString()).to.equal(client._id.toString());
    });
  });
});
