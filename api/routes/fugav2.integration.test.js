const { testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomInt, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const jwt = require('jsonwebtoken');
const supertest = require('supertest');
const { ObjectId } = require('mongodb');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { createCatalogueUserWithAdminAccess, createUserWithNoRights, createUserWithCatalogueReadRights, createCataloguePayeeUser } = require('../test/test-utils/user.generator');

const Track = require('../models/track');
const Client = require('../models/client');
const User = require('../models/user');
const Contract = require('../models/contract');
const BulkSplits = require('../models/bulkSplits');
const { getPayeesFromReturnsRights } = require('../libs/payees/payees');

jest.mock('../controllers/fugav2/helpers/import-export/upload', () => ({
  uploadToS3: jest.fn().mockResolvedValue({ publicLink: 'https://s3-test-upload-url', s3Key: 's3Key' }),
  UPLOAD_TYPE: {
    IMPORT: 'import',
    EXPORT: 'export',
  },
}));

jest.mock('@curveroyaltysystems/platform-shared-utils', () => {
  const actual = jest.requireActual('@curveroyaltysystems/platform-shared-utils');
  return {
    ...actual,
    fileManager: {
      ...actual.fileManager,
      publicLink7Days: jest.fn(),
    },
  };
});

jest.mock('../libs/payees/payees');

const config = require('../config.json');

const applicationToken = config.applicationTokens[0];

const server = supertest(require('../index'));

describe('/fuga/v2', function () {
  let client;
  let user;
  let track1;
  let track2;
  let token;

  beforeEach(async () => {
    client = new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true });
    await client.save();

    user = new User({ email: `${randomString()}@curve.com` });
    await user.save();

    track1 = new Track({
      _id: new ObjectId('100000000000000000000000'),
      clientId: client._id,
      title: randomString(),
      isrc: randomString(),
      alternativeId: randomString(),
      tags: ['foo'],
      version: randomString(),
      artist: randomString(),
      salesReturnsRights: {
        contractId: randomId(),
        percentage: randomInt(),
      },
    });
    await track1.save();

    track2 = new Track({
      _id: new ObjectId('200000000000000000000000'),
      clientId: client._id,
      title: randomString(),
      isrc: randomString(),
      alternativeId: randomString(),
      tags: ['bar'],
      version: randomString(),
      artist: randomString(),
      salesReturnsRights: {
        contractId: randomId(),
        percentage: randomInt(),
      },
    });
    await track2.save();

    const userToken = { id: user._id, internal: false, parentId: null, clientId: client._id.toString(), email: `${testUtils.randomString()}@curve.com`, rights: {} };
    userToken.rights[client._id.toString()] = { catalogue: 'Edit', admin: true };
    token = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });
  });

  afterEach(async () => {
    await testUtils.cleanUpAsync(client._id.toString());
  });

  describe('/fuga/v2/tracks/:id GET', function () {
    it('should return 200 and expected track data', async () => {
      const res = await server
        .get(`/fuga/v2/tracks/${track1._id.toString()}`)
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: track1._id.toString(),
        fugaId: null,
        isrc: track1.isrc,
        alternativeId: track1.alternativeId,
        tags: track1.tags,
        title: track1.title,
        artist: track1.artist,
        version: track1.version,
        duration: null,
        payeeCount: 0,
        releases: [],
        contracts: [],
      });
    });
  });

  describe('/fuga/v2/payees/:id/tracks GET', function () {
    let payeeId; let payeeTrack1; let
      payeeTrack2;

    beforeEach(async () => {
      const { body } = await server
        .post('/fuga/v2/payees/')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString())
        .send({
          name: 'some payee',
          email: 'email@example.com',
        });
      payeeId = body._id;
      const contract = await Contract.findOne({ name: 'some payee' });
      payeeTrack1 = new Track({
        _id: new ObjectId('111111111111111111111111'),
        clientId: client._id,
        title: 'payee track 1',
        isrc: randomString(),
        alternativeId: randomString(),
        tags: ['foo'],
        version: randomString(),
        artist: randomString(),
        salesReturnsRights: {
          contractId: contract._id.toString(),
          percentage: 100,
        },
      });
      await payeeTrack1.save();
      payeeTrack2 = new Track({
        _id: new ObjectId('222222222222222222222222'),
        clientId: client._id,
        title: 'payee track 2',
        isrc: randomString(),
        alternativeId: randomString(),
        tags: ['bar'],
        version: randomString(),
        artist: randomString(),
        salesReturnsRights: {
          contractId: contract._id.toString(),
          percentage: 100,
        },
      });
      await payeeTrack2.save();
    });

    it('should return 200 and expected track data', async () => {
      const res = await server
        .get(`/fuga/v2/payees/${payeeId}/tracks/`)
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());
      expect(res.status).toBe(200);
      expect(res.body.meta.total).toEqual(2);
      expect(res.body.tracks[0]).toMatchObject({
        title: payeeTrack2.title,
        isrc: payeeTrack2.isrc,
        alternativeId: payeeTrack2.alternativeId,
        artist: payeeTrack2.artist,
        tags: payeeTrack2.tags,
      });
      expect(res.body.tracks[1]).toMatchObject({
        title: payeeTrack1.title,
        isrc: payeeTrack1.isrc,
        alternativeId: payeeTrack1.alternativeId,
        artist: payeeTrack1.artist,
        tags: payeeTrack1.tags,
      });
    });

    it('should filter for a specific tag', async () => {
      const res = await server
        .get(`/fuga/v2/payees/${payeeId}/tracks/?tags=foo`)
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());
      expect(res.body.meta.total).toEqual(1);
      expect(res.body.tracks[0]).toMatchObject({
        title: payeeTrack1.title,
        isrc: payeeTrack1.isrc,
        alternativeId: payeeTrack1.alternativeId,
        artist: payeeTrack1.artist,
        tags: payeeTrack1.tags,
      });
    });

    it('should exclude a specific tag', async () => {
      const res = await server
        .get(`/fuga/v2/payees/${payeeId}/tracks/?excludeTags=foo`)
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());
      expect(res.body.meta.total).toEqual(1);
      expect(res.body.tracks[0]).toMatchObject({
        title: payeeTrack2.title,
        isrc: payeeTrack2.isrc,
        alternativeId: payeeTrack2.alternativeId,
        artist: payeeTrack2.artist,
        tags: payeeTrack2.tags,
      });
    });
  });

  describe('/fuga/v2/bulkSplitsExport GET', function () {
    it('should return 200 and create bulk splits export record when tracks exist', async () => {
      const res = await server
        .get('/fuga/v2/bulkSplitsExport')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        message: expect.stringContaining('Processing'),
        bulkSplitsId: expect.any(String),
        totalCount: 2,
      });

      // Small delay to ensure the record is saved
      // eslint-disable-next-line
      await new Promise((resolve) => setTimeout(resolve, 100));
      const bulkSplitsRecord = await BulkSplits.findById(res.body.bulkSplitsId);
      expect(bulkSplitsRecord).toBeTruthy();
      expect(bulkSplitsRecord.clientId.toString()).toBe(client._id.toString());
      expect(bulkSplitsRecord.type).toBe('export');
      expect(bulkSplitsRecord.count).toBe(2);
    });

    it('should return 200 with zero count when no tracks match criteria', async () => {
      const res = await server
        .get('/fuga/v2/bulkSplitsExport?tags=nonexistent')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        totalCount: 0,
        message: 'Could not find any tracks matching the search criteria.',
      });
    });

    it('should filter tracks by tag parameter', async () => {
      const res = await server
        .get('/fuga/v2/bulkSplitsExport?tags=foo')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        message: 'Processing 1 tracks.',
        bulkSplitsId: expect.any(String),
        totalCount: 1,
      });
    });

    it('should exclude tracks by excludeTag parameter', async () => {
      const res = await server
        .get('/fuga/v2/bulkSplitsExport?excludeTags=foo')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        message: 'Processing 1 tracks.',
        bulkSplitsId: expect.any(String),
        totalCount: 1,
      });
    });

    it('should return 403 when user lacks catalogue read access', async () => {
      // GIVEN
      const { token: limitedToken } = await createUserWithNoRights({ clientId: client._id });

      // WHEN
      const res = await server
        .get('/fuga/v2/bulkSplitsExport')
        .set('applicationToken', applicationToken)
        .set('token', limitedToken)
        .set('clientId', client._id.toString());

      // THEN
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ message: 'Forbidden' });
    });

    it('should return 403 when user is a payee user', async () => {
      // GIVEN
      const { token: payeeToken } = await createCataloguePayeeUser({ clientId: client._id });

      // WHEN
      const res = await server
        .get('/fuga/v2/bulkSplitsExport')
        .set('applicationToken', applicationToken)
        .set('token', payeeToken)
        .set('clientId', client._id.toString());

      // THEN
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ message: 'Forbidden' });
    });

    it('should return 400 when client does not exist', async () => {
      // GIVEN
      const nonExistentClientId = new ObjectId();
      const { token: invalidToken } = await createCatalogueUserWithAdminAccess({ clientId: nonExistentClientId, userId: user._id });

      // WHEN
      const res = await server
        .get('/fuga/v2/bulkSplitsExport')
        .set('applicationToken', applicationToken)
        .set('token', invalidToken)
        .set('clientId', nonExistentClientId.toString());

      // THEN
      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        message: 'Organisation not found',
        code: 'CLIENT_NOT_FOUND',
      });
    });

    it('should store filter parameters in BulkSplits record', async () => {
      const queryParams = 'tags=foo&fugaUserEmail=user@example.com';
      const res = await server
        .get(`/fuga/v2/bulkSplitsExport?${queryParams}`)
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      // eslint-disable-next-line
      await new Promise((resolve) => setTimeout(resolve, 100));
      const bulkSplitsRecord = await BulkSplits.findById(res.body.bulkSplitsId);
      expect(bulkSplitsRecord.filter).toMatchObject({
        tags: 'foo',
        fugaUserEmail: 'user@example.com',
      });
      expect(bulkSplitsRecord.fugaUserEmail).toBe('user@example.com');
    });

    it('should store file publicUrl and file S3 storage key if some tracks processed successfully', async () => {
      const res = await server
        .get('/fuga/v2/bulkSplitsExport')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);

      // Small delay to ensure the record is saved
      // eslint-disable-next-line
      await new Promise((resolve) => setTimeout(resolve, 100));

      const bulkSplitsRecord = await BulkSplits.findById(res.body.bulkSplitsId);
      expect(bulkSplitsRecord.count).toBe(2);
      expect(bulkSplitsRecord.file).toBe('https://s3-test-upload-url');
      expect(bulkSplitsRecord.fileKey).toBe('s3Key');
      expect(bulkSplitsRecord.errorFile).toBe(null);
      expect(bulkSplitsRecord.errorFileKey).toBe(null);
    });

    it('should store error file publicUrl and error file S3 storage key if some tracks processed with errors', async () => {
      // GIVEN
      getPayeesFromReturnsRights.mockRejectedValue(new Error('Unexpected error.'));

      const res = await server
        .get('/fuga/v2/bulkSplitsExport')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);

      // Small delay to ensure the record is saved
      // eslint-disable-next-line
      await new Promise((resolve) => setTimeout(resolve, 100));

      const bulkSplitsRecord = await BulkSplits.findById(res.body.bulkSplitsId);
      expect(bulkSplitsRecord.count).toBe(2);
      expect(bulkSplitsRecord.errorFile).toBe('https://s3-test-upload-url');
      expect(bulkSplitsRecord.errorFileKey).toBe('s3Key');

      // Clean up mock
      getPayeesFromReturnsRights.mockRestore();
    });
  });

  describe('/fuga/v2/bulkSplitsImport POST', function () {
    it('should return 200 and create bulk splits import record when file is provided', async () => {
      // GIVEN
      const csvContent = 'id,title,artist,isrc,payees\n100000000000000000000000,Test Track,Test Artist,ISRC123,"[{\\"name\\":\\"Test Payee\\",\\"email\\":\\"test@example.com\\",\\"percentage\\":100}]"';

      // WHEN
      const res = await server
        .post('/fuga/v2/bulkSplitsImport')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString())
        .attach('file', Buffer.from(csvContent), 'test-import.csv');

      // THEN
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        message: expect.stringContaining('Processing import file'),
        bulkSplitsId: expect.any(String),
        fileName: 'test-import.csv',
      });

      // Delay to ensure the record is saved
      // eslint-disable-next-line
      await new Promise((resolve) => setTimeout(resolve, 100));
      const bulkSplitsRecord = await BulkSplits.findById(res.body.bulkSplitsId);

      expect(bulkSplitsRecord).toBeTruthy();
      expect(bulkSplitsRecord.clientId.toString()).toBe(client._id.toString());
      expect(bulkSplitsRecord.type).toBe('import');
      expect(bulkSplitsRecord.fugaUserEmail).toBe('');
    });

    it('should persist import job title if it is provided as the request query parameter', async () => {
      // GIVEN
      const csvContent = 'id,title,artist,isrc,payees\n100000000000000000000000,Test Track,Test Artist,ISRC123,"[{\\"name\\":\\"Test Payee\\",\\"email\\":\\"test@example.com\\",\\"percentage\\":100}]"';

      // WHEN
      const res = await server
        .post('/fuga/v2/bulkSplitsImport?title=custom%20import%20title&fugaUserEmail=import.user@example.com')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString())
        .attach('file', Buffer.from(csvContent), 'test-import.csv');

      // Delay to ensure the record is saved
      // eslint-disable-next-line
      await new Promise((resolve) => setTimeout(resolve, 100));
      const bulkSplitsRecord = await BulkSplits.findById(res.body.bulkSplitsId);

      // THEN
      expect(bulkSplitsRecord.name).toBe('custom import title');
      expect(bulkSplitsRecord.fugaUserEmail).toBe('import.user@example.com');
    });

    it('should persist the default import job name if title is not provided as query parameter', async () => {
      // GIVEN
      const csvContent = 'id,title,artist,isrc,payees\n100000000000000000000000,Test Track,Test Artist,ISRC123,"[{\\"name\\":\\"Test Payee\\",\\"email\\":\\"test@example.com\\",\\"percentage\\":100}]"';

      // WHEN
      const res = await server
        .post('/fuga/v2/bulkSplitsImport')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString())
        .attach('file', Buffer.from(csvContent), 'test-import.csv');

      // Delay to ensure the record is saved
      // eslint-disable-next-line
      await new Promise((resolve) => setTimeout(resolve, 100));
      const bulkSplitsRecord = await BulkSplits.findById(res.body.bulkSplitsId);

      // THEN
      expect(bulkSplitsRecord.name).toContain('Splits import');
    });

    it('should return 400 when no file is provided', async () => {
      // GIVEN - no file provided

      // WHEN
      const res = await server
        .post('/fuga/v2/bulkSplitsImport')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      // THEN
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        message: expect.stringContaining('file'),
      });
    });

    it('should return 400 when file has wrong extension', async () => {
      // GIVEN
      const txtContent = 'This is not a CSV file';

      // WHEN
      const res = await server
        .post('/fuga/v2/bulkSplitsImport')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString())
        .attach('file', Buffer.from(txtContent), 'test-import.txt');

      // THEN
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        message: expect.stringContaining('Only .csv files are supported'),
        code: 'INVALID_FILE',
      });
    });

    it('should return 403 when user lacks catalogue write access', async () => {
      // GIVEN
      const { token: limitedToken } = await createUserWithCatalogueReadRights({ clientId: client._id });
      const csvContent = 'id,title,artist,isrc,payees\n100000000000000000000000,Test Track,Test Artist,ISRC123,"[]"';

      // WHEN
      const res = await server
        .post('/fuga/v2/bulkSplitsImport')
        .set('applicationToken', applicationToken)
        .set('token', limitedToken)
        .set('clientId', client._id.toString())
        .attach('file', Buffer.from(csvContent), 'test-import.csv');

      // THEN
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ message: 'Forbidden' });
    });

    it('should return 403 when user is a payee user', async () => {
      // GIVEN
      const { token: payeeToken } = await createCataloguePayeeUser({ clientId: client._id });
      const csvContent = 'id,title,artist,isrc,payees\n100000000000000000000000,Test Track,Test Artist,ISRC123,"[]"';

      // WHEN
      const res = await server
        .post('/fuga/v2/bulkSplitsImport')
        .set('applicationToken', applicationToken)
        .set('token', payeeToken)
        .set('clientId', client._id.toString())
        .attach('file', Buffer.from(csvContent), 'test-import.csv');

      // THEN
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ message: 'Forbidden' });
    });

    it('should return 400 when client does not exist', async () => {
      // GIVEN
      const nonExistentClientId = new ObjectId();
      const { token: invalidToken } = await createCatalogueUserWithAdminAccess({ clientId: nonExistentClientId, userId: user._id });
      const csvContent = 'id,title,artist,isrc,payees\n100000000000000000000000,Test Track,Test Artist,ISRC123,"[]"';

      // WHEN
      const res = await server
        .post('/fuga/v2/bulkSplitsImport')
        .set('applicationToken', applicationToken)
        .set('token', invalidToken)
        .set('clientId', nonExistentClientId.toString())
        .attach('file', Buffer.from(csvContent), 'test-import.csv');

      // THEN
      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        message: 'Organisation not found',
        code: 'CLIENT_NOT_FOUND',
      });
    });
  });

  describe('/fuga/v2/bulkSplits/:id GET', function () {
    let bulkSplitsId;

    beforeEach(async () => {
      const bulkSplits = new BulkSplits({
        name: 'Test Splits Export 2024-01-01T00:00:00.000Z',
        clientId: client._id,
        organisationId: client._id,
        errors: [],
        status: 'Complete',
        filter: { tag: 'test' },
        count: 100,
        updatedCount: 95,
        type: 'export',
        errorMessage: '',
        updatedBy: user._id,
        file: 'https://example.com/export-file.csv',
        errorFile: 'https://example.com/error-file.csv',
      });
      await bulkSplits.save();
      bulkSplitsId = bulkSplits._id;
    });

    it('should return 200 and expected bulk splits data', async () => {
      const res = await server
        .get(`/fuga/v2/bulkSplits/${bulkSplitsId}`)
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        _id: bulkSplitsId.toString(),
        name: 'Test Splits Export 2024-01-01T00:00:00.000Z',
        clientId: client._id.toString(),
        organisationId: client._id.toString(),
        status: 'Complete',
        filter: { tag: 'test' },
        count: 100,
        updatedCount: 95,
        type: 'export',
        errorMessage: '',
        updatedBy: user._id.toString(),
        file: 'https://example.com/export-file.csv',
        errorFile: 'https://example.com/error-file.csv',
      });
    });

    it('should return 400 for invalid bulk job ID', async () => {
      const res = await server
        .get('/fuga/v2/bulkSplits/invalid-id')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: 'Valid bulk job ID required',
        details: { missingFields: ['bulkJobId'] },
        code: 'FIELDS_REQUIRED',
      });
    });

    it('should return 404 for non-existent bulk job ID', async () => {
      const nonExistentId = '00cd00fdae0000c47be05d26';
      const res = await server
        .get(`/fuga/v2/bulkSplits/${nonExistentId}`)
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        message: `Bulk job with id: ${nonExistentId} not found`,
        code: 'BULK_JOB_NOT_FOUND',
      });
    });

    it('should return 404 for bulk job belonging to different client', async () => {
      const otherClient = new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true });
      await otherClient.save();

      const otherBulkSplits = new BulkSplits({
        name: 'Other Client Export',
        clientId: otherClient._id,
        organisationId: otherClient._id,
        errors: [],
        status: 'Complete',
        filter: {},
        count: 50,
        updatedCount: 50,
        type: 'export',
        errorMessage: '',
        updatedBy: user._id,
        file: '',
        errorFile: '',
      });
      await otherBulkSplits.save();

      const res = await server
        .get(`/fuga/v2/bulkSplits/${otherBulkSplits._id}`)
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        message: `Bulk job with id: ${otherBulkSplits._id} not found`,
        code: 'BULK_JOB_NOT_FOUND',
      });
    });

    it('should return 403 when user lacks catalogue read access', async () => {
      // Create user with no catalogue rights
      const limitedUser = new User({ email: `${randomString()}@curve.com` });
      await limitedUser.save();

      const limitedUserToken = {
        id: limitedUser._id,
        internal: false,
        parentId: null,
        clientId: client._id.toString(),
        email: limitedUser.email,
        rights: {},
      };

      limitedUserToken.rights[client._id.toString()] = {};
      const limitedToken = jwt.sign(limitedUserToken, process.env.jsonSecretToken, { expiresIn: 86400 });

      const res = await server
        .get(`/fuga/v2/bulkSplits/${bulkSplitsId}`)
        .set('applicationToken', applicationToken)
        .set('token', limitedToken)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ message: 'Forbidden' });
    });

    it('should return 403 when user is a payee user', async () => {
      const payeeUser = new User({ email: `${randomString()}@curve.com` });
      await payeeUser.save();

      const payeeUserToken = {
        id: payeeUser._id,
        internal: false,
        parentId: 'test-parent-id',
        clientId: client._id.toString(),
        email: payeeUser.email,
        rights: {},
      };
      payeeUserToken.rights[client._id.toString()] = { catalogue: 'Read' };
      const payeeToken = jwt.sign(payeeUserToken, process.env.jsonSecretToken, { expiresIn: 86400 });

      const res = await server
        .get(`/fuga/v2/bulkSplits/${bulkSplitsId}`)
        .set('applicationToken', applicationToken)
        .set('token', payeeToken)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ message: 'Forbidden' });
    });
  });

  describe('/fuga/v2/bulkSplits GET', function () {
    let bulkSplits1;
    let bulkSplits2;
    let bulkSplits3;

    afterEach(() => {
      fileManager.publicLink7Days.mockClear();
    });

    beforeEach(async () => {
      bulkSplits1 = new BulkSplits({
        name: 'Test Export 1',
        clientId: client._id,
        organisationId: client._id,
        errors: [],
        status: 'Complete',
        filter: { tag: 'test1' },
        count: 50,
        updatedCount: 45,
        type: 'export',
        errorMessage: '',
        updatedBy: user._id,
        file: 'https://example.com/export1.csv',
        errorFile: '',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
      });
      await bulkSplits1.save();

      bulkSplits2 = new BulkSplits({
        name: 'Test Export 2',
        clientId: client._id,
        organisationId: client._id,
        errors: [],
        status: 'In Progress',
        filter: { tag: 'test2' },
        count: 75,
        updatedCount: 25,
        type: 'export',
        errorMessage: '',
        updatedBy: user._id,
        file: '',
        errorFile: '',
        createdAt: new Date('2024-01-02T00:00:00.000Z'),
      });
      await bulkSplits2.save();

      bulkSplits3 = new BulkSplits({
        name: 'Test Export 3',
        clientId: client._id,
        organisationId: client._id,
        errors: ['Error 1', 'Error 2'],
        status: 'Errored',
        filter: {},
        count: 100,
        updatedCount: 0,
        type: 'export',
        errorMessage: 'Failed to process',
        updatedBy: user._id,
        file: '',
        errorFile: 'https://example.com/errors3.csv',
        createdAt: new Date('2024-01-03T00:00:00.000Z'),
      });
      await bulkSplits3.save();
    });

    it('should return 200 and expected bulk splits data sorted by createdAt desc', async () => {
      const res = await server
        .get('/fuga/v2/bulkSplits')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      expect(res.body.bulkSplits).toHaveLength(3);
      expect(res.body.meta).toEqual({
        currentPage: 1,
        totalPages: 1,
        total: 3,
      });

      // Check sorting
      expect(res.body.bulkSplits[0]._id).toBe(bulkSplits3._id.toString());
      expect(res.body.bulkSplits[2]._id).toBe(bulkSplits1._id.toString());

      // Check response structure
      expect(res.body.bulkSplits[0]).toMatchObject({
        _id: bulkSplits3._id.toString(),
        name: 'Test Export 3',
        clientId: client._id.toString(),
        organisationId: client._id.toString(),
        status: 'Errored',
        count: 100,
        updatedCount: 0,
        type: 'export',
        errorMessage: 'Failed to process',
        updatedBy: user._id.toString(),
        file: '',
        errorFile: 'https://example.com/errors3.csv',
      });
    });

    it('should support pagination with limit and page parameters', async () => {
      const res = await server
        .get('/fuga/v2/bulkSplits?limit=2&page=1')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      expect(res.body.bulkSplits).toHaveLength(2);
      expect(res.body.meta).toEqual({
        currentPage: 1,
        totalPages: 2,
        total: 3,
      });

      // Should return first 2 records (most recent)
      expect(res.body.bulkSplits[0]._id).toBe(bulkSplits3._id.toString());
      expect(res.body.bulkSplits[1]._id).toBe(bulkSplits2._id.toString());
    });

    it('should support pagination second page', async () => {
      const res = await server
        .get('/fuga/v2/bulkSplits?limit=2&page=2')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      expect(res.body.bulkSplits).toHaveLength(1);
      expect(res.body.meta).toEqual({
        currentPage: 2,
        totalPages: 2,
        total: 3,
      });

      // Should return last record
      expect(res.body.bulkSplits[0]._id).toBe(bulkSplits1._id.toString());
    });

    it('should return empty results when no bulk splits exist for client', async () => {
      const newClient = new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true });
      await newClient.save();

      const newUser = new User({ email: `${randomString()}@curve.com` });
      await newUser.save();

      const newUserToken = {
        id: newUser._id,
        internal: false,
        parentId: null,
        clientId: newClient._id.toString(),
        email: newUser.email,
        rights: {},
      };
      newUserToken.rights[newClient._id.toString()] = { catalogue: 'Edit', admin: true };
      const newToken = jwt.sign(newUserToken, process.env.jsonSecretToken, { expiresIn: 86400 });

      const res = await server
        .get('/fuga/v2/bulkSplits')
        .set('applicationToken', applicationToken)
        .set('token', newToken)
        .set('clientId', newClient._id.toString());

      expect(res.status).toBe(200);
      expect(res.body.bulkSplits).toHaveLength(0);
      expect(res.body.meta.total).toBe(0);
    });

    it('should support custom ordering parameters', async () => {
      const res = await server
        .get('/fuga/v2/bulkSplits?orderBy=name&orderDir=asc')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      expect(res.body.bulkSplits).toHaveLength(3);

      // Check ordering by name ascending
      expect(res.body.bulkSplits[0].name).toBe('Test Export 1');
      expect(res.body.bulkSplits[1].name).toBe('Test Export 2');
      expect(res.body.bulkSplits[2].name).toBe('Test Export 3');
    });

    it('should return 403 when user lacks catalogue read access', async () => {
      // Create user with no catalogue rights
      const limitedUser = new User({ email: `${randomString()}@curve.com` });
      await limitedUser.save();

      const limitedUserToken = {
        id: limitedUser._id,
        internal: false,
        parentId: null,
        clientId: client._id.toString(),
        email: limitedUser.email,
        rights: {},
      };
      // No catalogue rights assigned
      limitedUserToken.rights[client._id.toString()] = {};
      const limitedToken = jwt.sign(limitedUserToken, process.env.jsonSecretToken, { expiresIn: 86400 });

      const res = await server
        .get('/fuga/v2/bulkSplits')
        .set('applicationToken', applicationToken)
        .set('token', limitedToken)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ message: 'Forbidden' });
    });

    it('should return 403 when user is a payee user', async () => {
      const payeeUser = new User({ email: `${randomString()}@curve.com` });
      await payeeUser.save();

      const payeeUserToken = {
        id: payeeUser._id,
        internal: false,
        parentId: 'test-parent-id',
        clientId: client._id.toString(),
        email: payeeUser.email,
        rights: {},
      };
      payeeUserToken.rights[client._id.toString()] = { catalogue: 'Read' };
      const payeeToken = jwt.sign(payeeUserToken, process.env.jsonSecretToken, { expiresIn: 86400 });

      const res = await server
        .get('/fuga/v2/bulkSplits')
        .set('applicationToken', applicationToken)
        .set('token', payeeToken)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ message: 'Forbidden' });
    });

    it('should filter bulk splits by createdAfter date', async () => {
      const res = await server
        .get('/fuga/v2/bulkSplits?createdAfter=2024-01-02')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      expect(res.body.bulkSplits).toHaveLength(2);
      expect(res.body.meta.total).toBe(2);

      // Should only return bulkSplits2 and bulkSplits3 (created on or after 2024-01-02)
      expect(res.body.bulkSplits[0]._id).toBe(bulkSplits3._id.toString());
      expect(res.body.bulkSplits[1]._id).toBe(bulkSplits2._id.toString());
      expect(res.body.bulkSplits.length).toBe(2);
    });

    it('should filter bulk splits by createdBefore date', async () => {
      const res = await server
        .get('/fuga/v2/bulkSplits?createdBefore=2024-01-02')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      expect(res.body.bulkSplits).toHaveLength(2);
      expect(res.body.meta.total).toBe(2);

      // Should only return bulkSplits1 and bulkSplits2 (created on or before 2024-01-02)
      expect(res.body.bulkSplits[0]._id).toBe(bulkSplits2._id.toString());
      expect(res.body.bulkSplits[1]._id).toBe(bulkSplits1._id.toString());
      expect(res.body.bulkSplits.length).toBe(2);
    });

    it('should filter bulk splits by date range using both createdAfter and createdBefore', async () => {
      const res = await server
        .get('/fuga/v2/bulkSplits?createdAfter=2024-01-02&createdBefore=2024-01-02')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      expect(res.body.bulkSplits).toHaveLength(1);
      expect(res.body.meta.total).toBe(1);

      // Should only return bulkSplits2 (created exactly on 2024-01-02)
      expect(res.body.bulkSplits[0]._id).toBe(bulkSplits2._id.toString());
      expect(res.body.bulkSplits.length).toBe(1);
    });

    it('should return empty results when date range excludes all records', async () => {
      const res = await server
        .get('/fuga/v2/bulkSplits?createdAfter=2025-01-01')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      expect(res.body.bulkSplits).toHaveLength(0);
      expect(res.body.meta.total).toBe(0);
    });

    it('should return 500 with invalid createdAfter date format', async () => {
      const res = await server
        .get('/fuga/v2/bulkSplits?createdAfter=invalid-date')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid date param');
      expect(res.body.code).toBe('INVALID_FIELDS');
    });

    it('should return 500 with invalid createdBefore date format', async () => {
      const res = await server
        .get('/fuga/v2/bulkSplits?createdBefore=not-a-date')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid date param');
      expect(res.body.code).toBe('INVALID_FIELDS');
    });

    it('should accept ISO 8601 date format with time', async () => {
      const res = await server
        .get('/fuga/v2/bulkSplits?createdAfter=2024-01-01T23:59:59Z')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      expect(res.body.bulkSplits).toHaveLength(2);
      // Should return bulkSplits2 and bulkSplits3 (created after 2024-01-01T23:59:59Z)
      expect(res.body.bulkSplits[0]._id).toBe(bulkSplits3._id.toString());
      expect(res.body.bulkSplits[1]._id).toBe(bulkSplits2._id.toString());
      expect(res.body.bulkSplits.length).toBe(2);
    });

    it('should combine date range filtering with custom ordering', async () => {
      const res = await server
        .get('/fuga/v2/bulkSplits?createdAfter=2024-01-01&orderBy=name&orderDir=asc')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      expect(res.body.bulkSplits).toHaveLength(3);

      expect(res.body.bulkSplits[0].name).toBe('Test Export 1');
      expect(res.body.bulkSplits[1].name).toBe('Test Export 2');
      expect(res.body.bulkSplits[2].name).toBe('Test Export 3');
    });

    it('should restore expired file link when bulk split is older than 7 days', async () => {
      fileManager.publicLink7Days.mockImplementation((key, callback) => {
        callback(null, `https://renewed-link.com/${key}`);
      });

      // Timestamp for 9 days ago in YYYYMMDDHHmmssSSS format
      const nineDaysAgo = new Date();
      nineDaysAgo.setDate(nineDaysAgo.getDate() - 9);
      const timestamp = nineDaysAgo.toISOString()
        .replace(/[-:T.Z]/g, '')
        .substring(0, 17);

      const expiredBulkSplit = new BulkSplits({
        name: 'Expired Export',
        clientId: client._id,
        organisationId: client._id,
        status: 'Complete',
        type: 'export',
        updatedBy: user._id,
        file: `https://old-link.com/export ${timestamp}.csv`,
        fileKey: `raw_export/Client - Tracks Splits export ${timestamp}.csv`,
        createdAt: nineDaysAgo,
      });
      await expiredBulkSplit.save();

      const res = await server
        .get('/fuga/v2/bulkSplits')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      const restored = res.body.bulkSplits.find((bs) => bs._id === expiredBulkSplit._id.toString());
      expect(restored.file).toBe(`https://renewed-link.com/raw_export/Client - Tracks Splits export ${timestamp}.csv`);
    });

    it('should not restore links for bulk splits younger than 7 days', async () => {
      // Timestamp in YYYYMMDDHHmmssSSS format
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const timestamp = threeDaysAgo.toISOString()
        .replace(/[-:T.Z]/g, '')
        .substring(0, 17);

      const recentBulkSplit = new BulkSplits({
        name: 'Recent Export',
        clientId: client._id,
        organisationId: client._id,
        status: 'Complete',
        type: 'export',
        updatedBy: user._id,
        file: `https://recent-link.com/export ${timestamp}.csv`,
        fileKey: `raw_export/Client - Tracks Splits export ${timestamp}.csv`,
        createdAt: threeDaysAgo,
      });
      await recentBulkSplit.save();

      await server
        .get('/fuga/v2/bulkSplits')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .set('clientId', client._id.toString());

      expect(fileManager.publicLink7Days).not.toHaveBeenCalled();
    });
  });
});
