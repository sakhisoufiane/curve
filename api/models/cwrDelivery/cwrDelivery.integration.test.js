const fs = require('fs');
const os = require('os');
const path = require('path');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const Client = require('../client');
const CwrDelivery = require('./cwrDelivery');
const DeliveryPartner = require('../deliveryPartner');
const Notification = require('../notification');
const Ftp = require('../../libs/ftp');
const Sftp = require('../../libs/sftp');
const cwrDeliveryController = require('../../controllers/cwrDelivery');

jest.mock('../../libs/ftp');
jest.mock('../../libs/sftp');

describe('deliver - FTP disconnect and cleanup on error', () => {
  let client;
  let curveUser;
  let localFilePath;
  let mockFtpInstance;

  beforeEach(async () => {
    localFilePath = path.join(os.tmpdir(), `cwr-test-${randomString()}.cwr`);
    fs.writeFileSync(localFilePath, 'test cwr content');

    mockFtpInstance = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      uploadFile: jest.fn().mockResolvedValue(undefined),
    };
    Ftp.mockImplementation(() => mockFtpInstance);
    Sftp.mockImplementation(() => mockFtpInstance);

    jest.spyOn(fileManager, 'uploadToS3').mockImplementation((file, key, cb) => cb(null, key));
    jest.spyOn(fileManager, 'downloadFromS3').mockImplementation((key, bucket, cb) => cb(null, localFilePath));
    jest.spyOn(Notification, 'generate').mockImplementation(() => {});

    client = await new Client({
      _id: randomId(),
      name: randomString(),
      issueIdentifier: false,
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    }).save();

    curveUser = { clientId: client._id.toString() };

    jest.spyOn(cwrDeliveryController, 'prepareDelivery').mockResolvedValue('mock-s3-key');
  });

  afterEach(() => {
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
  });

  async function createFtpDelivery(type) {
    const deliveryPartner = await new DeliveryPartner({
      clientId: client._id.toString(),
      name: randomString(),
      receivingParty: randomString(),
      territory: 'WW',
      type,
      ftpHost: 'test-host',
      ftpUsername: 'test-user',
      ftpPassword: 'test-pass',
      ftpAuthenticationType: 'Password',
      ftpRootDir: '/upload',
    }).save();

    const delivery = await new CwrDelivery({
      clientId: client._id.toString(),
      territory: 'WW',
      name: randomString(),
      deliveryPartnerId: deliveryPartner._id,
    }).save();

    return delivery;
  }

  describe.each([['FTP'], ['SFTP']])('%s', (type) => {
    it('should disconnect and clean up local files on connection error', async () => {
      mockFtpInstance.connect.mockRejectedValue(new Error('Connection refused'));
      const delivery = await createFtpDelivery(type);

      const err = await new Promise((resolve) => { delivery.deliver(curveUser, resolve); });

      expect(err).toBeTruthy();
      expect(mockFtpInstance.disconnect).toHaveBeenCalledTimes(1);
      expect(fs.existsSync(localFilePath)).toBe(false);
    });

    it('should disconnect and clean up local files on upload error', async () => {
      mockFtpInstance.uploadFile.mockRejectedValue(new Error('Upload failed'));
      const delivery = await createFtpDelivery(type);

      const err = await new Promise((resolve) => { delivery.deliver(curveUser, resolve); });

      expect(err).toBeTruthy();
      expect(mockFtpInstance.disconnect).toHaveBeenCalledTimes(1);
      expect(fs.existsSync(localFilePath)).toBe(false);
    });
  });
});
