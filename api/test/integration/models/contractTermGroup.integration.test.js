process.env.NODE_ENV = 'test';
require('../../../models/db');

const { testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const chai = require('chai');

const { expect } = chai;
const ContractTermGroup = require('../../../models/contractTermGroup');
const Client = require('../../../models/client');

describe('Integration Test for Contract Term Group Model', () => {
  let client;

  // Set up mock data before each test
  beforeEach(async () => {
    // Ensure a fresh state for each test
    await testUtils.cleanUp();

    client = await new Client({
      name: 'TEST CLIENT',
      distributionChannels: ['Digital', 'Physical', 'Performance', 'Licensing', 'Sync', 'Merchandise', 'Other', 'Test'],
      configuration: ['CD', 'DVD', 'LP', 'Premium Stream', 'Ad-Funded Stream', 'Video Premium Stream', 'Video Ad-Funded Stream', 'Ringtone', 'Performance', 'Sync', 'Other'],
      priceCategories: ['Full Price', 'Mid Price', 'Budget'],
      sources: ['source1', 'source2', 'source3'],
      costTypes: ['Artwork', 'Distribution', 'Marketing', 'Merchandise', 'Other', 'Production', 'Promo', 'Recording', 'Tour', 'Video', 'Postage'],
      issueIdentifier: false,
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    }).save();
  });

  afterEach(async () => {
    await testUtils.cleanUp();
  });

  describe('Saving a contract term group', () => {
    it('should throw an error if the name is a channel from distributionChannels', async () => {
      try {
        const contractTermGroup1 = new ContractTermGroup({
          name: 'Digital',
          type: 'Distribution Channel',
          clientId: client._id.toString(),
        });

        await contractTermGroup1.save();
      } catch (error) {
        expect(error).to.exist;
        expect(error.message).to.equal('The provided name: Digital is disallowed as it either matches a reserved term or a term used as an existing configuration in your Distribution Channel');
      }
    });

    it('should throw an error if the name is a configuration option', async () => {
      try {
        const contractTermGroup2 = new ContractTermGroup({
          name: 'CD',
          type: 'Configuration',
          clientId: client._id.toString(),
        });

        await contractTermGroup2.save();
      } catch (error) {
        expect(error).to.exist;
        expect(error.message).to.equal('Please ensure the name for the group does not already exist in the Configuration list in your settings area.');
      }
    });

    it('should throw an error if the name is a price category', async () => {
      try {
        const contractTermGroup3 = new ContractTermGroup({
          name: 'Full Price',
          type: 'Price Category',
          clientId: client._id.toString(),
        });

        await contractTermGroup3.save();
      } catch (error) {
        expect(error).to.exist;
        expect(error.message).to.equal('The provided name: Full Price is disallowed as it either matches a reserved term or a term used as an existing configuration in your Price Category');
      }
    });

    it('should throw an error if the name is a source', async () => {
      try {
        const contractTermGroup4 = new ContractTermGroup({
          name: 'source1',
          type: 'Source',
          clientId: client._id.toString(),
        });

        await contractTermGroup4.save();
      } catch (error) {
        expect(error).to.exist;
        expect(error.message).to.equal('The provided name: source1 is disallowed as it either matches a reserved term or a term used as an existing configuration in your Source');
      }
    });

    it('should throw an error if the name is a cost type', async () => {
      try {
        const contractTermGroup5 = new ContractTermGroup({
          name: 'Artwork',
          type: 'Cost Type',
          clientId: client._id.toString(),
        });

        await contractTermGroup5.save();
      } catch (error) {
        expect(error).to.exist;
        expect(error.message).to.equal('The provided name: Artwork is disallowed as it either matches a reserved term or a term used as an existing configuration in your Cost Type');
      }
    });

    it('should throw an error if the name is All', async () => {
      try {
        const contractTermGroup5 = new ContractTermGroup({
          name: 'All',
          type: 'Cost Type',
          clientId: client._id.toString(),
        });

        await contractTermGroup5.save();
      } catch (error) {
        expect(error).to.exist;
        expect(error.message).to.equal('Invalid configuration: The term "All" is not allowed. Please remove it from your client configuration');
      }
    });

    it('should save successfully if the name is unique and does not conflict with predefined lists', async () => {
      const contractTermGroup6 = new ContractTermGroup({
        name: 'Unique Group',
        type: 'Custom',
        clientId: client._id.toString(),
      });

      const savedGroup = await contractTermGroup6.save();
      expect(savedGroup).to.exist;
      expect(savedGroup.name).to.equal('Unique Group');
    });
  });
});
