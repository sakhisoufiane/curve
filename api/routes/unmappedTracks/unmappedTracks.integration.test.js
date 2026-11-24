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
const UnmappedTrack = require('../../models/unmappedTrack');
const User = require('../../models/user');

const server = supertest(require('../../index'));

describe('/unmappedTracks', () => {
  logger.info('>>>file>>>> routes/unmappedTracks/unmappedTracks.integration.test .....................');

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
    let oldTrack;
    let recentTrack;

    beforeEach(async () => {
      oldTrack = new UnmappedTrack({
        clientId: client._id,
        title: 'Old Track',
        complete: false,
        createdAt: new Date('2023-01-15T10:30:00Z'),
        updatedAt: new Date('2023-01-15T10:30:00Z'),
      });
      await oldTrack.save();

      recentTrack = new UnmappedTrack({
        clientId: client._id,
        title: 'Recent Track',
        complete: false,
        createdAt: new Date('2024-06-20T14:45:00Z'),
        updatedAt: new Date('2024-06-20T14:45:00Z'),
      });
      await recentTrack.save();
    });

    it('should return only unmapped tracks created on or after the specified date', async () => {
      const res = await server
        .get('/unmappedTracks?createdAfter=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      const returnedIds = res.body.unmappedTracks.map((t) => t._id.toString());
      expect(returnedIds).toContain(recentTrack._id.toString());
      expect(returnedIds).not.toContain(oldTrack._id.toString());
    });

    it('should include unmapped tracks created exactly on the specified date', async () => {
      const exactDateTrack = new UnmappedTrack({
        clientId: client._id,
        title: 'Exact Date Track',
        complete: false,
        createdAt: new Date('2024-01-01T23:59:59Z'),
        updatedAt: new Date('2024-01-01T23:59:59Z'),
      });
      await exactDateTrack.save();

      const res = await server
        .get('/unmappedTracks?createdAfter=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      const returnedIds = res.body.unmappedTracks.map((t) => t._id.toString());
      expect(returnedIds).toContain(exactDateTrack._id.toString());
    });
  });

  describe('Date filtering - createdBefore', () => {
    let oldTrack;
    let recentTrack;

    beforeEach(async () => {
      oldTrack = new UnmappedTrack({
        clientId: client._id,
        title: 'Old Track',
        complete: false,
        createdAt: new Date('2023-01-15T10:30:00Z'),
        updatedAt: new Date('2023-01-15T10:30:00Z'),
      });
      await oldTrack.save();

      recentTrack = new UnmappedTrack({
        clientId: client._id,
        title: 'Recent Track',
        complete: false,
        createdAt: new Date('2024-06-20T14:45:00Z'),
        updatedAt: new Date('2024-06-20T14:45:00Z'),
      });
      await recentTrack.save();
    });

    it('should return only unmapped tracks created before the specified date', async () => {
      const res = await server
        .get('/unmappedTracks?createdBefore=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      const returnedIds = res.body.unmappedTracks.map((t) => t._id.toString());
      expect(returnedIds).toContain(oldTrack._id.toString());
      expect(returnedIds).not.toContain(recentTrack._id.toString());
    });

    it('should include unmapped tracks created exactly on the specified date', async () => {
      const exactDateTrack = new UnmappedTrack({
        clientId: client._id,
        title: 'Exact Date Track',
        complete: false,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });
      await exactDateTrack.save();

      const res = await server
        .get('/unmappedTracks?createdBefore=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      const returnedIds = res.body.unmappedTracks.map((t) => t._id.toString());
      expect(returnedIds).toContain(exactDateTrack._id.toString());
    });
  });

  describe('Date filtering - updatedAfter', () => {
    let oldUpdateTrack;
    let recentUpdateTrack;

    beforeEach(async () => {
      oldUpdateTrack = new UnmappedTrack({
        clientId: client._id,
        title: 'Old Update Track',
        complete: false,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await oldUpdateTrack.save();
      await UnmappedTrack.updateOne({ _id: oldUpdateTrack._id }, { updatedAt: new Date('2023-03-15T10:30:00Z') }, { timestamps: false });

      recentUpdateTrack = new UnmappedTrack({
        clientId: client._id,
        title: 'Recent Update Track',
        complete: false,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await recentUpdateTrack.save();
      await UnmappedTrack.updateOne({ _id: recentUpdateTrack._id }, { updatedAt: new Date('2024-08-20T14:45:00Z') }, { timestamps: false });
    });

    it('should return only unmapped tracks updated on or after the specified date', async () => {
      const res = await server
        .get('/unmappedTracks?updatedAfter=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      const returnedIds = res.body.unmappedTracks.map((t) => t._id.toString());
      expect(returnedIds).toContain(recentUpdateTrack._id.toString());
      expect(returnedIds).not.toContain(oldUpdateTrack._id.toString());
    });

    it('should include unmapped tracks updated exactly on the specified date', async () => {
      const exactDateTrack = new UnmappedTrack({
        clientId: client._id,
        title: 'Exact Update Track',
        complete: false,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await exactDateTrack.save();
      await UnmappedTrack.updateOne({ _id: exactDateTrack._id }, { updatedAt: new Date('2024-01-01T12:00:00Z') }, { timestamps: false });

      const res = await server
        .get('/unmappedTracks?updatedAfter=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      const returnedIds = res.body.unmappedTracks.map((t) => t._id.toString());
      expect(returnedIds).toContain(exactDateTrack._id.toString());
    });
  });

  describe('Date filtering - updatedBefore', () => {
    let oldUpdateTrack;
    let recentUpdateTrack;

    beforeEach(async () => {
      oldUpdateTrack = new UnmappedTrack({
        clientId: client._id,
        title: 'Old Update Track',
        complete: false,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await oldUpdateTrack.save();
      await UnmappedTrack.updateOne({ _id: oldUpdateTrack._id }, { updatedAt: new Date('2023-03-15T10:30:00Z') }, { timestamps: false });

      recentUpdateTrack = new UnmappedTrack({
        clientId: client._id,
        title: 'Recent Update Track',
        complete: false,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await recentUpdateTrack.save();
      await UnmappedTrack.updateOne({ _id: recentUpdateTrack._id }, { updatedAt: new Date('2024-08-20T14:45:00Z') }, { timestamps: false });
    });

    it('should return only unmapped tracks updated before the specified date', async () => {
      const res = await server
        .get('/unmappedTracks?updatedBefore=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      const returnedIds = res.body.unmappedTracks.map((t) => t._id.toString());
      expect(returnedIds).toContain(oldUpdateTrack._id.toString());
      expect(returnedIds).not.toContain(recentUpdateTrack._id.toString());
    });

    it('should include unmapped tracks updated exactly on the specified date', async () => {
      const exactDateTrack = new UnmappedTrack({
        clientId: client._id,
        title: 'Exact Update Track',
        complete: false,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await exactDateTrack.save();
      await UnmappedTrack.updateOne({ _id: exactDateTrack._id }, { updatedAt: new Date('2024-01-01T00:00:00Z') }, { timestamps: false });

      const res = await server
        .get('/unmappedTracks?updatedBefore=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      const returnedIds = res.body.unmappedTracks.map((t) => t._id.toString());
      expect(returnedIds).toContain(exactDateTrack._id.toString());
    });
  });

  describe('Date filtering - combinations', () => {
    let earlyTrack;
    let midTrack;
    let lateTrack;

    beforeEach(async () => {
      earlyTrack = new UnmappedTrack({
        clientId: client._id,
        title: 'Early Track',
        complete: false,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date('2024-01-15T10:00:00Z'),
      });
      await earlyTrack.save();

      midTrack = new UnmappedTrack({
        clientId: client._id,
        title: 'Mid Track',
        complete: false,
        createdAt: new Date('2024-06-15T10:00:00Z'),
        updatedAt: new Date('2024-06-15T10:00:00Z'),
      });
      await midTrack.save();

      lateTrack = new UnmappedTrack({
        clientId: client._id,
        title: 'Late Track',
        complete: false,
        createdAt: new Date('2024-12-15T10:00:00Z'),
        updatedAt: new Date('2024-12-15T10:00:00Z'),
      });
      await lateTrack.save();
    });

    it('should apply createdAfter and createdBefore together for a date range', async () => {
      const res = await server
        .get('/unmappedTracks?createdAfter=2024-03-01&createdBefore=2024-09-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      const returnedIds = res.body.unmappedTracks.map((t) => t._id.toString());
      expect(returnedIds).toContain(midTrack._id.toString());
      expect(returnedIds).not.toContain(earlyTrack._id.toString());
      expect(returnedIds).not.toContain(lateTrack._id.toString());
    });

    it('should combine date filters with text search', async () => {
      const matchingTrack = new UnmappedTrack({
        clientId: client._id,
        title: 'Searchable Track',
        complete: false,
        createdAt: new Date('2024-06-15T10:00:00Z'),
      });
      await matchingTrack.save();

      const nonMatchingTrack = new UnmappedTrack({
        clientId: client._id,
        title: 'Different Title',
        complete: false,
        createdAt: new Date('2024-06-15T10:00:00Z'),
      });
      await nonMatchingTrack.save();

      const res = await server
        .get('/unmappedTracks?createdAfter=2024-03-01&text=Searchable')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      const returnedIds = res.body.unmappedTracks.map((t) => t._id.toString());
      expect(returnedIds).toContain(matchingTrack._id.toString());
      expect(returnedIds).not.toContain(nonMatchingTrack._id.toString());
    });
  });

  describe('POST /unmappedTracks/export', () => {
    it('should create an export task with specific track IDs', async () => {
      const track1 = new UnmappedTrack({
        clientId: client._id,
        title: 'Export Track 1',
        complete: false,
      });
      await track1.save();

      const track2 = new UnmappedTrack({
        clientId: client._id,
        title: 'Export Track 2',
        complete: false,
      });
      await track2.save();

      const res = await server
        .post('/unmappedTracks/export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ trackIds: [track1._id, track2._id] });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Export task created');
    });

    it('should create an export task with date filters', async () => {
      const res = await server
        .post('/unmappedTracks/export')
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
        .post('/unmappedTracks/export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({
          filter: {
            text: 'Test Track',
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
        .post('/unmappedTracks/export')
        .set('applicationToken', applicationToken)
        .set('token', restrictedToken)
        .send({ filter: {} });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Forbidden');
    });

    it('should create an export task combining filters', async () => {
      const res = await server
        .post('/unmappedTracks/export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({
          filter: {
            createdAfter: '2024-01-01',
            text: 'Track',
            complete: 'false',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Export task created');
    });

    describe('POST /unmappedTracks/raw-export', () => {
      beforeEach(() => {
        mockCSVRawExport.mockReset();
        mockCSVRawExport.mockResolvedValue({ csvPublicLink: 'https://s3.amazonaws.com/test-export.csv' });
      });

      it('should return 200 with async message when sync is not set', async () => {
        const res = await server
          .post('/unmappedTracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ filter: {} });
        expect(res.status).toBe(200);
        expect(res.body.message).toEqual('Your report will be sent to you via email shortly');
      });

      it('should return 200 with csvPublicLink when sync=true', async () => {
        const res = await server
          .post('/unmappedTracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ sync: true, filter: {} });
        expect(res.status).toBe(200);
        expect(res.body.csvPublicLink).toEqual('https://s3.amazonaws.com/test-export.csv');
      });

      it('should call CSVRawExport with sync=true when body param set', async () => {
        await server
          .post('/unmappedTracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ sync: true, filter: {} });
        expect(mockCSVRawExport).toHaveBeenCalledWith(
          expect.objectContaining({
            sync: true,
          }),
        );
      });

      it('should return 500 when CSVRawExport throws in sync mode', async () => {
        mockCSVRawExport.mockRejectedValue(new Error('Export failed'));
        const res = await server
          .post('/unmappedTracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ sync: true, filter: {} });
        expect(res.status).toBe(500);
        expect(res.body.message).toEqual('Export failed');
      });

      it('should apply updatedAfter filter to updatedAt.$gte', async () => {
        await server
          .post('/unmappedTracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ filter: { updatedAfter: '2025-01-15' } });
        expect(mockCSVRawExport).toHaveBeenCalledWith(
          expect.objectContaining({
            filter: expect.objectContaining({
              updatedAt: { $gte: new Date('2025-01-15T00:00:00.000Z') },
            }),
          }),
        );
      });

      it('should apply updatedBefore filter to updatedAt.$lte', async () => {
        await server
          .post('/unmappedTracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ filter: { updatedBefore: '2025-01-20' } });
        expect(mockCSVRawExport).toHaveBeenCalledWith(
          expect.objectContaining({
            filter: expect.objectContaining({
              updatedAt: { $lte: new Date('2025-01-20T23:59:59.999Z') },
            }),
          }),
        );
      });

      it('should apply createdAfter filter to createdAt.$gte', async () => {
        await server
          .post('/unmappedTracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ filter: { createdAfter: '2025-01-10' } });
        expect(mockCSVRawExport).toHaveBeenCalledWith(
          expect.objectContaining({
            filter: expect.objectContaining({
              createdAt: { $gte: new Date('2025-01-10T00:00:00.000Z') },
            }),
          }),
        );
      });

      it('should apply createdBefore filter to createdAt.$lte', async () => {
        await server
          .post('/unmappedTracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ filter: { createdBefore: '2025-01-25' } });
        expect(mockCSVRawExport).toHaveBeenCalledWith(
          expect.objectContaining({
            filter: expect.objectContaining({
              createdAt: { $lte: new Date('2025-01-25T23:59:59.999Z') },
            }),
          }),
        );
      });

      it('should apply combined updatedAfter and updatedBefore as date range', async () => {
        await server
          .post('/unmappedTracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ filter: { updatedAfter: '2025-01-01', updatedBefore: '2025-01-31' } });
        expect(mockCSVRawExport).toHaveBeenCalledWith(
          expect.objectContaining({
            filter: expect.objectContaining({
              updatedAt: {
                $gte: new Date('2025-01-01T00:00:00.000Z'),
                $lte: new Date('2025-01-31T23:59:59.999Z'),
              },
            }),
          }),
        );
      });

      it('should pass text filter to CSVRawExport', async () => {
        await server
          .post('/unmappedTracks/raw-export')
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
          .post('/unmappedTracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ filter: { salesFileIds: ['abc123'] } });

        expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
          filter: expect.objectContaining({
            salesFileId: { $in: ['abc123'] },
          }),
        }));
      });

      it('should include clientId in filter', async () => {
        await server
          .post('/unmappedTracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ filter: {} });

        expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
          filter: expect.objectContaining({
            clientId: expect.anything(),
          }),
        }));
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
          .post('/unmappedTracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', noRightsToken)
          .send({ filter: {} });

        expect(res.status).toBe(403);
      });
    });
  });
});
