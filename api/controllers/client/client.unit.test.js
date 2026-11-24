const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const {
  randomString,
  randomId,
} = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const axios = require('axios').default;

const Client = require('./client');
const DeliveryProfile = require('../../models/deliveryProfile');
const Composer = require('../../models/composer');
const Contract = require('../../models/contract');
const Import = require('../../models/import');
const ImportPartner = require('../../models/importPartner');
const Publisher = require('../../models/publisher');
const Release = require('../../models/release');
const Track = require('../../models/track');
const Work = require('../../models/work');

describe('ClientController', () => {
  const error = new Error('some error');

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFtpKeyfile', () => {
    it('should upload file to s3 and return ack ingestion file key', async () => {
      fileManager.uploadToS3 = jest.fn((key, buffer, cb) => cb(null, key));
      const clientMock = {
        _id: randomId(),
        ackFtpIngestions: [{ host: randomString() }],
      };
      const client = {
        ...clientMock,
        save: jest.fn().mockResolvedValue(clientMock),
      };
      const ackFtpIngestionIndex = 0;
      const file = {
        originalname: randomString(),
        buffer: Buffer.from('test'),
        path: randomString(),
      };

      const result = await Client.uploadFtpKeyfile({
        client,
        file,
        ackFtpIngestionIndex,
      });

      expect(fileManager.uploadToS3).toHaveBeenCalledWith(
        `clients/${client._id.toString()}/ackFtpIngestions/${ackFtpIngestionIndex}/${file.originalname
        }`,
        file.path,
        expect.any(Function),
      );
      expect(result.host).toEqual(clientMock.host);
      expect(result.ackFtpIngestions[ackFtpIngestionIndex].fileKey).toEqual(`clients/${client._id}/ackFtpIngestions/0/${file.originalname}`);
    });

    it('should upload file to s3 and return ftp file key', async () => {
      fileManager.uploadToS3 = jest.fn((key, buffer, cb) => cb(null, key));
      const clientMock = {
        _id: randomId(),
        ackFtpIngestions: [{ host: randomString() }],
      };
      const client = {
        ...clientMock,
        save: jest.fn().mockResolvedValue(clientMock),
      };
      const file = {
        originalname: randomString(),
        buffer: Buffer.from('test'),
        path: randomString(),
      };

      const result = await Client.uploadFtpKeyfile({ client, file });
      expect(fileManager.uploadToS3).toHaveBeenCalledWith(
        `clients/${client._id.toString()}/catalogue/${file.originalname
        }`,
        file.path,
        expect.any(Function),
      );
      expect(result.host).toEqual(clientMock.host);
      expect(result.ftpFileKey).toEqual(`clients/${client._id}/catalogue/${file.originalname}`);
    });

    it('should throw error when failure uploading file to s3', async () => {
      const clientMock = {
        _id: randomId(),
        ackFtpIngestions: [{ host: randomString() }],
      };
      const client = {
        ...clientMock,
        save: jest.fn().mockImplementation((cb) => cb(null, clientMock)),
      };
      const ackFtpIngestionIndex = 0;
      const file = {
        originalname: randomString(),
        buffer: Buffer.from('test'),
      };

      fileManager.uploadToS3.mockImplementation((key, buffer, cb) => cb(error));

      await expect(
        Client.uploadFtpKeyfile({ client, file, ackFtpIngestionIndex }),
      ).rejects.toThrow(error);
    });
  });

  describe('deleteFtpKeyFile', () => {
    it('should delete file from s3', async () => {
      const ftpFileKey = randomString();
      fileManager.deleteFromS3 = jest.fn((key, cb) => cb());

      const result = await Client.deleteFtpKeyFile({ key: ftpFileKey });

      expect(fileManager.deleteFromS3).toHaveBeenCalledWith(
        ftpFileKey,
        expect.any(Function),
      );
      expect(result).toEqual(ftpFileKey);
    });

    it('should throw error when failure deleting file from s3', async () => {
      const ftpFileKey = randomString();
      fileManager.deleteFromS3 = jest.fn((key, cb) => cb(error));

      await expect(
        Client.deleteFtpKeyFile({ key: ftpFileKey }),
      ).rejects.toThrow(error);
    });
  });

  describe('getCatalogueGroupsToDelete', () => {
    it('should return catalogue groups to delete', () => {
      const existing = ['group1', 'group2', 'group3'];
      const incoming = ['group1', 'group3'];

      const result = Client.getCatalogueGroupsToDelete(existing, incoming);

      expect(result).toEqual(['group2']);
    });

    it('should return empty when nothing to delete', () => {
      const list = ['group1', 'group2'];
      expect(Client.getCatalogueGroupsToDelete(list, list)).toEqual([]);
    });

    it('should return all if new list is empty', () => {
      const list = ['a', 'b'];
      expect(Client.getCatalogueGroupsToDelete(list, [])).toEqual(['a', 'b']);
    });

    it('should return empty if both are empty', () => {
      expect(Client.getCatalogueGroupsToDelete([], [])).toEqual([]);
    });
  });

  describe('checkIfCatalogueGroupsCanBeDeleted', () => {
    const clientId = 'client123';
    const catalogueGroups = ['group1', 'group2'];
    const models = [
      Contract,
      Composer,
      DeliveryProfile,
      Import,
      ImportPartner,
      Publisher,
      Release,
      Track,
      Work,
    ];

    beforeEach(() => {
      models.forEach((model) => jest.spyOn(model, 'countDocuments'));
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should throw error when all results > 0', async () => {
      models.forEach((model) => model.countDocuments.mockResolvedValue(1));

      await expect(
        Client.checkIfCatalogueGroupsCanBeDeleted(clientId, catalogueGroups),
      ).rejects.toThrow(/The Catalogue Group cannot be deleted/);
    });

    it('should throw error when any result > 0', async () => {
      models.forEach((model) => model.countDocuments.mockResolvedValue(0));
      Work.countDocuments.mockResolvedValue(1);

      await expect(
        Client.checkIfCatalogueGroupsCanBeDeleted(clientId, catalogueGroups),
      ).rejects.toThrow(/Work\(s\)/);
    });

    it('should not throw when all results are 0', async () => {
      models.forEach((model) => model.countDocuments.mockResolvedValue(0));

      await expect(
        Client.checkIfCatalogueGroupsCanBeDeleted(clientId, catalogueGroups),
      ).resolves.not.toThrow();
    });

    it('should handle empty catalogueGroups', async () => {
      models.forEach((model) => model.countDocuments.mockResolvedValue(0));

      await expect(
        Client.checkIfCatalogueGroupsCanBeDeleted(clientId, []),
      ).resolves.not.toThrow();
    });
  });

  describe('hasStandardAccess', () => {
    const clientId = 'client123';

    const fullRights = {
      catalogue: 'Edit',
      contracts: 'Edit',
      periods: 'Edit',
      sales: 'Edit',
    };

    it('returns true when all four rights are Edit', () => {
      const curveUser = { rights: { [clientId]: fullRights } };
      expect(Client.hasStandardAccess({ curveUser, clientId })).toBe(true);
    });

    it('returns false when catalogue is not Edit', () => {
      const curveUser = { rights: { [clientId]: { ...fullRights, catalogue: 'View' } } };
      expect(Client.hasStandardAccess({ curveUser, clientId })).toBe(false);
    });

    it('returns false when contracts is not Edit', () => {
      const curveUser = { rights: { [clientId]: { ...fullRights, contracts: 'View' } } };
      expect(Client.hasStandardAccess({ curveUser, clientId })).toBe(false);
    });

    it('returns false when periods is not Edit', () => {
      const curveUser = { rights: { [clientId]: { ...fullRights, periods: 'View' } } };
      expect(Client.hasStandardAccess({ curveUser, clientId })).toBe(false);
    });

    it('returns false when sales is not Edit', () => {
      const curveUser = { rights: { [clientId]: { ...fullRights, sales: 'View' } } };
      expect(Client.hasStandardAccess({ curveUser, clientId })).toBe(false);
    });

    it('returns false when a right is missing entirely', () => {
      const { sales: _omitted, ...withoutSales } = fullRights;
      const curveUser = { rights: { [clientId]: withoutSales } };
      expect(Client.hasStandardAccess({ curveUser, clientId })).toBe(false);
    });

    it('returns false when the clientId is not present in rights', () => {
      const curveUser = { rights: { differentClientId: fullRights } };
      expect(Client.hasStandardAccess({ curveUser, clientId })).toBe(false);
    });

    it('returns false when rights is undefined', () => {
      const curveUser = {};
      expect(Client.hasStandardAccess({ curveUser, clientId })).toBe(false);
    });

    it('returns false when curveUser is null', () => {
      expect(Client.hasStandardAccess({ curveUser: null, clientId })).toBe(false);
    });

    it('returns false when all rights are empty strings', () => {
      const curveUser = { rights: { [clientId]: { catalogue: '', contracts: '', periods: '', sales: '' } } };
      expect(Client.hasStandardAccess({ curveUser, clientId })).toBe(false);
    });
  });

  describe('getCurvePayApiKey', () => {
    const clientId = randomId();
    const name = randomString();
    const apiKey = randomString();

    it('should return the Curve Pay API key', async () => {
      process.env.PAYMENTS_API_KEY = randomString();
      axios.post = jest
        .fn()
        .mockResolvedValue({ data: { api_key: apiKey }, status: 200 });

      const result = await Client.getCurvePayApiKey({ clientId, name });

      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(axios.post.mock.calls[0][0]).toContain('/api/v1/client');
      expect(axios.post.mock.calls[0][1]).toEqual({
        payment_provider_id: 'currency-cloud',
        referrer_client_id: clientId,
        referrer_client_name: name,
        referrer_id: 'curve',
      });
      expect(axios.post.mock.calls[0][2]).toEqual({ headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.PAYMENTS_API_KEY } });
      expect(result).toEqual(apiKey);
    });

    it('should throw an error if API returns an error response', async () => {
      axios.post = jest.fn().mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Bad Request' },
        },
      });

      expect(await Client.getCurvePayApiKey({ clientId, name })).toBeNull();
    });

    it('should throw an error if axios throws a network error', async () => {
      axios.post = jest.fn().mockRejectedValue(new Error('Network Error'));
      expect(await Client.getCurvePayApiKey({ clientId, name })).toBeNull();
    });
  });
});
