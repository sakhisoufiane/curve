process.env.NODE_ENV = 'test';
require('../../../models/db');

const { expect } = require('chai');
const testUtils = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const DeliveryPartner = require('../../../models/deliveryPartner');
const Client = require('../../../models/client');

describe('Delivery Partner Integration Test', () => {
  let deliveryPartnerData; let client; let curveUser;

  beforeEach(async () => {
    client = await new Client({
      _id: testUtils.randomId(),
      name: testUtils.randomString(),
      issueIdentifier: false,
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    }).save();

    deliveryPartnerData = {
      name: testUtils.randomString(),
      clientId: client._id.toString(),
      type: 'FTP',
      cwrVersion: '2.2',
      outputFormat: 'CWR',
      receivingParty: testUtils.randomString(),
      territory: 'WW',
      ipiNo: testUtils.randomString(),
      notificationEmail: testUtils.randomString(),
      ftpHost: testUtils.randomString(),
      ftpPort: testUtils.randomString(),
      ftpUsername: testUtils.randomString(),
      ftpPassword: testUtils.randomString(),
      ftpRootDir: testUtils.randomString(),
    };
  });

  afterEach(async () => {
    await testUtils.cleanUp();
  });

  it('should save successfully when all FTP fields are present', async () => {
    // Arrange
    const partner = new DeliveryPartner(deliveryPartnerData);
    let error;
    // Act
    try {
      await partner.save();
    } catch (err) {
      error = err;
    }
    // Assert
    expect(error).to.be.undefined;
    expect(partner._id).to.exist;
  });

  it('should fail if FTP fields are incomplete', async () => {
    // Arrange
    const partner = new DeliveryPartner({ ...deliveryPartnerData, ftpHost: '' });
    let error;
    // Act
    try {
      await partner.save();
    } catch (err) {
      error = err;
    }
    // Assert
    expect(error).to.exist;
    expect(error.message).to.equal('Please complete FTP details for this Delivery Partner');
  });

  it('should save successfully when FTPS type with all FTP fields present', async () => {
    // Arrange
    const partner = new DeliveryPartner({ ...deliveryPartnerData, type: 'FTPS' });
    let error;
    // Act
    try {
      await partner.save();
    } catch (err) {
      error = err;
    }
    // Assert
    expect(error).to.be.undefined;
    expect(partner._id).to.exist;
  });

  it('should fail if FTPS type but FTP fields are incomplete', async () => {
    // Arrange
    const partner = new DeliveryPartner({ ...deliveryPartnerData, type: 'FTPS', ftpHost: '' });
    let error;
    // Act
    try {
      await partner.save();
    } catch (err) {
      error = err;
    }
    // Assert
    expect(error).to.exist;
    expect(error.message).to.equal('Please complete FTP details for this Delivery Partner');
  });

  it('should fail if Email type but no notificationEmail', async () => {
    // Arrange
    const partner = new DeliveryPartner({ ...deliveryPartnerData, type: 'Email', notificationEmail: '' });
    let error;
    // Act
    try {
      await partner.save();
    } catch (err) {
      error = err;
    }
    // Assert
    expect(error).to.exist;
    expect(error.message).to.equal('Please add at least one email address for deliveries to this Partner');
  });

  it('should fail if receivingParty is missing', async () => {
    // Arrange
    const partner = new DeliveryPartner({ ...deliveryPartnerData, receivingParty: '' });
    let error;
    // Act
    try {
      await partner.save();
    } catch (err) {
      error = err;
    }
    // Assert
    expect(error).to.exist;
    expect(error.message).to.equal('A Receiving Party is required');
  });

  it('should fail if territory is missing (for normal outputFormat)', async () => {
    // Arrange
    const partner = new DeliveryPartner({ ...deliveryPartnerData, territory: '' });
    let error;
    // Act
    try {
      await partner.save();
    } catch (err) {
      error = err;
    }
    // Assert
    expect(error).to.exist;
    expect(error.message).to.equal('A Territory is required');
  });

  it('should fail if splitElection is true but splitElectionPRO is empty', async () => {
    // Arrange
    const partner = new DeliveryPartner({ ...deliveryPartnerData, splitElection: true, splitElectionPRO: '' });
    let error;
    // Act
    try {
      await partner.save();
    } catch (err) {
      error = err;
    }
    // Assert
    expect(error).to.exist;
    expect(error.message).to.equal('Split Election Pro is required');
  });

  it('should fail if name is missing', async () => {
    // Arrange
    const partner = new DeliveryPartner({ ...deliveryPartnerData, name: '' });
    let error;
    // Act
    try {
      await partner.save();
    } catch (err) {
      error = err;
    }
    // Assert
    expect(error).to.exist;
    expect(error.message).to.equal('A Name is required');
  });

  it('should fail if type is missing', async () => {
    // Arrange
    const partner = new DeliveryPartner({ ...deliveryPartnerData, type: '' });
    let error;
    // Act
    try {
      await partner.save();
    } catch (err) {
      error = err;
    }
    // Assert
    expect(error).to.exist;
    expect(error.message).to.equal('A Delivery Type is required');
  });

  it('should fail if DeliveryPartner name is not unique for the same clientId', async () => {
    // Arrange
    const partner = new DeliveryPartner(deliveryPartnerData);
    await partner.save();
    const secondPartner = new DeliveryPartner(deliveryPartnerData);
    let error;
    // Act
    try {
      await secondPartner.save();
    } catch (err) {
      error = err;
    }
    // Assert
    expect(error).to.exist;
    expect(error.message).to.equal('Could not save Delivery Partner - Name needs to be unique');
  });

  it('should save if DeliveryPartner name is unique for the same clientId', async () => {
    // Arrange
    const partner = new DeliveryPartner(deliveryPartnerData);
    let error;
    // Act
    try {
      await partner.save();
    } catch (err) {
      error = err;
    }
    // Assert
    expect(error).to.be.undefined;
    expect(partner._id).to.exist;
  });
});
