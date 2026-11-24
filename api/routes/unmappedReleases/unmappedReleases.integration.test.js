jest.mock('@curveroyaltysystems/platform-shared-utils', () => ({
  ...jest.requireActual('@curveroyaltysystems/platform-shared-utils'),
  TaskHelpers: { createTaskAndSendMessage: jest.fn().mockResolvedValue({}) },
}));

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const jwt = require('jsonwebtoken');
const supertest = require('supertest');
const config = require('../../config.json');

// Mock CSVRawExport for raw-export tests
const mockCSVRawExport = jest.fn();
jest.mock('../../libs/mongodb-export', () => ({
  CSVRawExport: mockCSVRawExport,
}));

const Client = require('../../models/client');
const UnmappedRelease = require('../../models/unmappedRelease');
const User = require('../../models/user');

const server = supertest(require('../../index'));

describe('/unmappedReleases', () => {
  logger.info('>>>file>>>> routes/unmappedReleases/unmappedReleases.integration.test .....................');

  const applicationToken = config.applicationTokens[0];
  let client;
  let user;
  let clientUser;

  beforeEach(async () => {
    client = new Client({
      _id: randomId(),
      name: randomString(),
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    });
    await client.save();

    user = new User({ _id: randomId(), email: `${randomString()}@curve.com` });
    await user.save();

    const userToken = {
      id: user._id,
      internal: false,
      parentId: null,
      clientId: client._id,
      email: user.email,
      rights: {},
    };
    userToken.rights[client._id.toString()] = { catalogue: 'Edit' };
    clientUser = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });
  });

  describe('Date filtering - createdAfter', () => {
    let oldRelease;
    let recentRelease;

    beforeEach(async () => {
      oldRelease = new UnmappedRelease({
        clientId: client._id,
        title: 'Old Release',
        complete: false,
        createdAt: new Date('2023-01-15T10:30:00Z'),
        updatedAt: new Date('2023-01-15T10:30:00Z'),
      });
      await oldRelease.save();

      recentRelease = new UnmappedRelease({
        clientId: client._id,
        title: 'Recent Release',
        complete: false,
        createdAt: new Date('2024-06-20T14:45:00Z'),
        updatedAt: new Date('2024-06-20T14:45:00Z'),
      });
      await recentRelease.save();
    });

    it('should return only unmapped releases created on or after the specified date', async () => {
      const res = await server
        .get('/unmappedReleases?createdAfter=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      const returnedIds = res.body.unmappedReleases.map((r) => r._id.toString());
      expect(returnedIds).toContain(recentRelease._id.toString());
      expect(returnedIds).not.toContain(oldRelease._id.toString());
    });

    it('should include unmapped releases created exactly on the specified date', async () => {
      const exactDateRelease = new UnmappedRelease({
        clientId: client._id,
        title: 'Exact Date Release',
        complete: false,
        createdAt: new Date('2024-01-01T23:59:59Z'),
        updatedAt: new Date('2024-01-01T23:59:59Z'),
      });
      await exactDateRelease.save();

      const res = await server
        .get('/unmappedReleases?createdAfter=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      const returnedIds = res.body.unmappedReleases.map((r) => r._id.toString());
      expect(returnedIds).toContain(exactDateRelease._id.toString());
    });
  });

  describe('Date filtering - createdBefore', () => {
    let oldRelease;
    let recentRelease;

    beforeEach(async () => {
      oldRelease = new UnmappedRelease({
        clientId: client._id,
        title: 'Old Release',
        complete: false,
        createdAt: new Date('2023-01-15T10:30:00Z'),
        updatedAt: new Date('2023-01-15T10:30:00Z'),
      });
      await oldRelease.save();

      recentRelease = new UnmappedRelease({
        clientId: client._id,
        title: 'Recent Release',
        complete: false,
        createdAt: new Date('2024-06-20T14:45:00Z'),
        updatedAt: new Date('2024-06-20T14:45:00Z'),
      });
      await recentRelease.save();
    });

    it('should return only unmapped releases created before the specified date', async () => {
      const res = await server
        .get('/unmappedReleases?createdBefore=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      const returnedIds = res.body.unmappedReleases.map((r) => r._id.toString());
      expect(returnedIds).toContain(oldRelease._id.toString());
      expect(returnedIds).not.toContain(recentRelease._id.toString());
    });

    it('should include unmapped releases created exactly on the specified date', async () => {
      const exactDateRelease = new UnmappedRelease({
        clientId: client._id,
        title: 'Exact Date Release',
        complete: false,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });
      await exactDateRelease.save();

      const res = await server
        .get('/unmappedReleases?createdBefore=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      const returnedIds = res.body.unmappedReleases.map((r) => r._id.toString());
      expect(returnedIds).toContain(exactDateRelease._id.toString());
    });
  });

  describe('Date filtering - updatedAfter', () => {
    let oldUpdateRelease;
    let recentUpdateRelease;

    beforeEach(async () => {
      oldUpdateRelease = new UnmappedRelease({
        clientId: client._id,
        title: 'Old Update Release',
        complete: false,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await oldUpdateRelease.save();
      await UnmappedRelease.updateOne({ _id: oldUpdateRelease._id }, { updatedAt: new Date('2023-03-15T10:30:00Z') }, { timestamps: false });

      recentUpdateRelease = new UnmappedRelease({
        clientId: client._id,
        title: 'Recent Update Release',
        complete: false,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await recentUpdateRelease.save();
      await UnmappedRelease.updateOne({ _id: recentUpdateRelease._id }, { updatedAt: new Date('2024-08-20T14:45:00Z') }, { timestamps: false });
    });

    it('should return only unmapped releases updated on or after the specified date', async () => {
      const res = await server
        .get('/unmappedReleases?updatedAfter=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      const returnedIds = res.body.unmappedReleases.map((r) => r._id.toString());
      expect(returnedIds).toContain(recentUpdateRelease._id.toString());
      expect(returnedIds).not.toContain(oldUpdateRelease._id.toString());
    });

    it('should include unmapped releases updated exactly on the specified date', async () => {
      const exactDateRelease = new UnmappedRelease({
        clientId: client._id,
        title: 'Exact Update Release',
        complete: false,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await exactDateRelease.save();
      await UnmappedRelease.updateOne({ _id: exactDateRelease._id }, { updatedAt: new Date('2024-01-01T12:00:00Z') }, { timestamps: false });

      const res = await server
        .get('/unmappedReleases?updatedAfter=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      const returnedIds = res.body.unmappedReleases.map((r) => r._id.toString());
      expect(returnedIds).toContain(exactDateRelease._id.toString());
    });
  });

  describe('Date filtering - updatedBefore', () => {
    let oldUpdateRelease;
    let recentUpdateRelease;

    beforeEach(async () => {
      oldUpdateRelease = new UnmappedRelease({
        clientId: client._id,
        title: 'Old Update Release',
        complete: false,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await oldUpdateRelease.save();
      await UnmappedRelease.updateOne({ _id: oldUpdateRelease._id }, { updatedAt: new Date('2023-03-15T10:30:00Z') }, { timestamps: false });

      recentUpdateRelease = new UnmappedRelease({
        clientId: client._id,
        title: 'Recent Update Release',
        complete: false,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await recentUpdateRelease.save();
      await UnmappedRelease.updateOne({ _id: recentUpdateRelease._id }, { updatedAt: new Date('2024-08-20T14:45:00Z') }, { timestamps: false });
    });

    it('should return only unmapped releases updated before the specified date', async () => {
      const res = await server
        .get('/unmappedReleases?updatedBefore=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      const returnedIds = res.body.unmappedReleases.map((r) => r._id.toString());
      expect(returnedIds).toContain(oldUpdateRelease._id.toString());
      expect(returnedIds).not.toContain(recentUpdateRelease._id.toString());
    });

    it('should include unmapped releases updated exactly on the specified date', async () => {
      const exactDateRelease = new UnmappedRelease({
        clientId: client._id,
        title: 'Exact Update Release',
        complete: false,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await exactDateRelease.save();
      await UnmappedRelease.updateOne({ _id: exactDateRelease._id }, { updatedAt: new Date('2024-01-01T00:00:00Z') }, { timestamps: false });

      const res = await server
        .get('/unmappedReleases?updatedBefore=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      const returnedIds = res.body.unmappedReleases.map((r) => r._id.toString());
      expect(returnedIds).toContain(exactDateRelease._id.toString());
    });
  });

  describe('Date filtering - combinations', () => {
    let earlyRelease;
    let midRelease;
    let lateRelease;

    beforeEach(async () => {
      earlyRelease = new UnmappedRelease({
        clientId: client._id,
        title: 'Early Release',
        complete: false,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date('2024-01-15T10:00:00Z'),
      });
      await earlyRelease.save();

      midRelease = new UnmappedRelease({
        clientId: client._id,
        title: 'Mid Release',
        complete: false,
        createdAt: new Date('2024-06-15T10:00:00Z'),
        updatedAt: new Date('2024-06-15T10:00:00Z'),
      });
      await midRelease.save();

      lateRelease = new UnmappedRelease({
        clientId: client._id,
        title: 'Late Release',
        complete: false,
        createdAt: new Date('2024-12-15T10:00:00Z'),
        updatedAt: new Date('2024-12-15T10:00:00Z'),
      });
      await lateRelease.save();
    });

    it('should apply createdAfter and createdBefore together for a date range', async () => {
      const res = await server
        .get('/unmappedReleases?createdAfter=2024-03-01&createdBefore=2024-09-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      const returnedIds = res.body.unmappedReleases.map((r) => r._id.toString());
      expect(returnedIds).toContain(midRelease._id.toString());
      expect(returnedIds).not.toContain(earlyRelease._id.toString());
      expect(returnedIds).not.toContain(lateRelease._id.toString());
    });

    it('should combine date filters with text search', async () => {
      const matchingRelease = new UnmappedRelease({
        clientId: client._id,
        title: 'Searchable Release',
        complete: false,
        createdAt: new Date('2024-06-15T10:00:00Z'),
      });
      await matchingRelease.save();

      const nonMatchingRelease = new UnmappedRelease({
        clientId: client._id,
        title: 'Different Title',
        complete: false,
        createdAt: new Date('2024-06-15T10:00:00Z'),
      });
      await nonMatchingRelease.save();

      const res = await server
        .get('/unmappedReleases?createdAfter=2024-03-01&text=Searchable')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      const returnedIds = res.body.unmappedReleases.map((r) => r._id.toString());
      expect(returnedIds).toContain(matchingRelease._id.toString());
      expect(returnedIds).not.toContain(nonMatchingRelease._id.toString());
    });
  });

  describe('POST /unmappedReleases/raw-export', () => {
    beforeEach(() => {
      mockCSVRawExport.mockReset();
      mockCSVRawExport.mockResolvedValue({ csvPublicLink: 'https://s3.amazonaws.com/test-export.csv' });
    });

    it('should return 403 when user has no catalogue rights', async () => {
      const noRightsToken = jwt.sign({
        id: user._id,
        internal: false,
        parentId: null,
        clientId: client._id,
        email: user.email,
        rights: { [client._id.toString()]: { catalogue: 'None' } },
      }, process.env.jsonSecretToken, { expiresIn: 86400 });

      const res = await server
        .post('/unmappedReleases/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', noRightsToken)
        .send({ filter: {} });

      expect(res.status).toBe(403);
    });

    it('should return 200 with async message when sync is not set', async () => {
      const res = await server
        .post('/unmappedReleases/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: {} });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Your report will be sent to you via email shortly');
    });

    it('should return 200 with csvPublicLink when sync=true', async () => {
      const res = await server
        .post('/unmappedReleases/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ sync: true, filter: {} });

      expect(res.status).toBe(200);
      expect(res.body.csvPublicLink).toBe('https://s3.amazonaws.com/test-export.csv');
    });

    it('should call CSVRawExport with sync=true when body param set', async () => {
      await server
        .post('/unmappedReleases/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ sync: true, filter: {} });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        sync: true,
        collectionName: 'unmappedreleases',
      }));
    });

    it('should return 500 when CSVRawExport throws in sync mode', async () => {
      mockCSVRawExport.mockRejectedValue(new Error('Export failed'));

      const res = await server
        .post('/unmappedReleases/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ sync: true, filter: {} });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Export failed');
    });

    it('should pass text filter to CSVRawExport', async () => {
      await server
        .post('/unmappedReleases/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: { text: 'searchterm' } });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ title: expect.any(Object) }),
          ]),
        }),
      }));
    });

    it('should pass salesFileIds filter to CSVRawExport', async () => {
      await server
        .post('/unmappedReleases/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: { salesFileIds: ['abc123'] } });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          salesFileId: { $in: ['abc123'] },
        }),
      }));
    });

    it('should pass createdAfter filter to CSVRawExport', async () => {
      await server
        .post('/unmappedReleases/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: { createdAfter: '2024-01-01' } });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          createdAt: expect.objectContaining({
            $gte: expect.any(Date),
          }),
        }),
      }));
    });

    it('should pass createdBefore filter to CSVRawExport', async () => {
      await server
        .post('/unmappedReleases/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: { createdBefore: '2024-12-31' } });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          createdAt: expect.objectContaining({
            $lte: expect.any(Date),
          }),
        }),
      }));
    });

    it('should pass updatedAfter filter to CSVRawExport', async () => {
      await server
        .post('/unmappedReleases/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: { updatedAfter: '2024-01-01' } });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          updatedAt: expect.objectContaining({
            $gte: expect.any(Date),
          }),
        }),
      }));
    });

    it('should pass updatedBefore filter to CSVRawExport', async () => {
      await server
        .post('/unmappedReleases/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: { updatedBefore: '2024-12-31' } });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          updatedAt: expect.objectContaining({
            $lte: expect.any(Date),
          }),
        }),
      }));
    });

    it('should include clientId in filter', async () => {
      await server
        .post('/unmappedReleases/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: {} });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          clientId: expect.anything(),
        }),
      }));
    });
  });
});
describe('POST /unmappedReleases/export', () => {
  logger.info('POST /unmappedReleases/export');

  const applicationToken = config.applicationTokens[0];
  let client;
  let user;
  let clientUser;

  beforeEach(async () => {
    client = new Client({
      _id: randomId(),
      name: randomString(),
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    });
    await client.save();

    user = new User({ _id: randomId(), email: `${randomString()}@curve.com` });
    await user.save();

    const userToken = {
      id: user._id,
      internal: false,
      parentId: null,
      clientId: client._id,
      email: user.email,
      rights: {},
    };
    userToken.rights[client._id.toString()] = { catalogue: 'Edit' };
    clientUser = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });
  });
  it('should create an export task with specific release IDs', async () => {
    const release1 = new UnmappedRelease({
      clientId: client._id,
      title: 'Export Release 1',
      complete: false,
    });
    await release1.save();

    const release2 = new UnmappedRelease({
      clientId: client._id,
      title: 'Export Release 2',
      complete: false,
    });
    await release2.save();

    const res = await server
      .post('/unmappedReleases/export')
      .set('applicationToken', applicationToken)
      .set('token', clientUser)
      .send({ releaseIds: [release1._id, release2._id] });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Export task created');
  });

  it('should create an export task with date filters', async () => {
    const res = await server
      .post('/unmappedReleases/export')
      .set('applicationToken', applicationToken)
      .set('token', clientUser)
      .send({
        filter: {
          createdAfter: '2024-01-01',
          createdBefore: '2024-12-31',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Export task created');
  });

  it('should create an export task with text search filter', async () => {
    const res = await server
      .post('/unmappedReleases/export')
      .set('applicationToken', applicationToken)
      .set('token', clientUser)
      .send({
        filter: {
          text: 'Test Release',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Export task created');
  });

  it('should reject export without proper catalogue access', async () => {
    const restrictedUser = new User({ _id: randomId(), email: `${randomString()}@curve.com` });
    await restrictedUser.save();

    const userToken = {
      id: restrictedUser._id,
      internal: false,
      parentId: null,
      clientId: client._id,
      email: restrictedUser.email,
      rights: {},
    };
    userToken.rights[client._id.toString()] = { catalogue: 'None' };
    const restrictedToken = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });

    const res = await server
      .post('/unmappedReleases/export')
      .set('applicationToken', applicationToken)
      .set('token', restrictedToken)
      .send({ filter: {} });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Forbidden');
  });

  it('should create an export task combining filters', async () => {
    const res = await server
      .post('/unmappedReleases/export')
      .set('applicationToken', applicationToken)
      .set('token', clientUser)
      .send({
        filter: {
          createdAfter: '2024-01-01',
          text: 'Release',
          complete: 'false',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Export task created');
  });
});
