const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const supertest = require('supertest');

jest.mock('@curveroyaltysystems/platform-shared-utils', () => ({
  ...jest.requireActual('@curveroyaltysystems/platform-shared-utils'),
  BigQuery: jest.fn().mockReturnValue({
    getSize: jest.fn().mockImplementation((table, selection, filter, cb) => cb(null, [{ count: 0 }])),
    getDistinct: jest.fn().mockImplementation((table, column, filter, cb) => cb(null, [])),
  }),
}));

// Mock CSVRawExport for raw-export tests
const mockCSVRawExport = jest.fn();
jest.mock('../../libs/mongodb-export', () => ({
  CSVRawExport: (...args) => mockCSVRawExport(...args),
}));

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const config = require('../../config.json');
const Track = require('../../models/track');
const Contract = require('../../models/contract');
const Client = require('../../models/client');
const User = require('../../models/user');
const Payee = require('../../models/payee');

const applicationToken = config.applicationTokens[0];
const server = supertest(require('../../index'));

describe('/tracks', () => {
  const importFromExcel = jest.spyOn(Track, 'importFromExcel').mockImplementation(() => {});
  const sendExport = jest.spyOn(Track, 'sendExport').mockImplementation(() => {});
  const clientId = new ObjectId();
  const userId = new ObjectId();
  const payeeId = new ObjectId();
  let client; let user; let track1; let track2; let
    track3;

  beforeEach(async () => {
    client = new Client({ _id: clientId,
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
      name: 'some client',
      features: { useAlternativeId: true } });
    user = new User({ _id: userId, email: 'test-upload@curve.com' });
    await client.save();
    await user.save();
    const contract = new Contract({ clientId, name: 'Contract 1' });
    await contract.save();

    track1 = new Track({
      clientId,
      title: 'Track 1',
      isrc: 'ISRC-Track-1',
      artist: 'artist 1',
      label: 'label 1',
      tags: ['track1-tag'],
    });
    await track1.save();
    track2 = new Track({
      clientId,
      title: 'Track 2',
      artist: 'artist 2',
      label: 'label 2',
      useAlternativeId: true,
      alternativeId: 'alt-2',
      linkedIsrc: 'linked-isrc-2',
      tags: ['track2-tag'],
    });
    await track2.save();
    track3 = new Track({
      clientId,
      title: 'Track 3',
      isrc: 'ISRC-Track-3',
    });
    await track3.save();
  });

  afterEach(async () => {
    await Track.deleteMany({ clientId });
    await Contract.deleteMany({ clientId });
    await User.deleteOne({ _id: userId });
    await Client.deleteOne({ _id: clientId });
  });

  describe('as a client user with full rights', () => {
    const token = jwt.sign({
      id: userId,
      internal: false,
      parentId: null,
      clientId,
      email: 'test-upload@curve.com',
      rights: {
        [clientId]: {
          sales: 'Edit', contracts: 'Edit', periods: 'Edit', catalogue: 'Edit',
        },
      },
    }, process.env.jsonSecretToken, { expiresIn: 86400 });
    describe('/ GET', () => {
      it('should return a list of tracks', async () => {
        const res = await server
          .get('/tracks')
          .set('applicationToken', applicationToken)
          .set('token', token);
        expect(res.status).toBe(200);
        expect(res.body.tracks).toHaveLength(await Track.countDocuments({ clientId }));
      });
      it('should return metadata of tracks index on / GET', async () => {
        const res = await server
          .get('/tracks')
          .set('applicationToken', applicationToken)
          .set('token', token);
        expect(res.status).toBe(200);
        expect(typeof res.body.meta).toBe('object');
      });
      it('should return the first page if not passed a specific page', async () => {
        const res = await server
          .get('/tracks')
          .set('applicationToken', applicationToken)
          .set('token', token);
        expect(res.body.meta.currentPage).toEqual(1);
      });
      it('should return the passed page when passed the parameter', async () => {
        const res = await server
          .get('/tracks?page=3')
          .set('applicationToken', applicationToken)
          .set('token', token);
        expect(res.body.meta.currentPage).toEqual(3);
      });
      it('should return the pages available', async () => {
        const res = await server
          .get('/tracks')
          .set('applicationToken', applicationToken)
          .set('token', token);
        expect(res.body.meta.totalPages).toEqual(1);
      });
      it('should set the amount to be returned per page when passed a limit option', async () => {
        const res = await server
          .get('/tracks?limit=1')
          .set('applicationToken', applicationToken)
          .set('token', token);
        expect(res.body.tracks).toHaveLength(1);
        expect(res.body.meta.totalPages).toEqual(await Track.countDocuments({ clientId }));
      });
      it('should filter for the given tag', async () => {
        const res = await server
          .get(`/tracks?tags=${track1.tags[0]}`)
          .set('applicationToken', applicationToken)
          .set('token', token);
        expect(res.body.tracks).toEqual([
          expect.objectContaining({ title: track1.title }),
        ]);
      });
      it('should filter out the given tag', async () => {
        const res = await server
          .get(`/tracks?excludeTags=${track1.tags[0]}`)
          .set('applicationToken', applicationToken)
          .set('token', token);
        expect(res.body.tracks).toEqual([
          expect.objectContaining({ title: track2.title }),
          expect.objectContaining({ title: track3.title }),
        ]);
      });

      describe('/ GET when includePayees parameter is provided', () => {
        let trackWithSplits;
        let contract1;
        let contract2;
        let payee1;
        let payee2;

        beforeEach(async () => {
          payee1 = new Payee({ clientId, name: 'Payee 1', email: 'payee1@test.com', contactEmail: 'contact1@test.com' });
          payee2 = new Payee({ clientId, name: 'Payee 2', email: 'payee2@test.com', paymentEmail: 'payment2@test.com' });
          await payee1.save();
          await payee2.save();

          contract1 = new Contract({
            clientId,
            name: 'Contract for Payee 1',
            payees: [{ payeeId: payee1._id }],
          });

          contract2 = new Contract({
            clientId,
            name: 'Contract for Payee 2',
            payees: [{ payeeId: payee2._id }],
          });

          await contract1.save();
          await contract2.save();

          trackWithSplits = new Track({
            clientId,
            title: 'Track with Splits',
            artist: 'Artist with Splits',
            isrc: 'ISRC-WITH-SPLITS',
            salesReturnsRights: [
              { contractId: contract1._id, percentage: 60 },
              { contractId: contract2._id, percentage: 40 },
            ],
          });
          await trackWithSplits.save();
        });

        afterEach(async () => {
          await Payee.deleteMany({ _id: { $in: [payee1._id, payee2._id] } });
          await Contract.deleteMany({ _id: { $in: [contract1._id, contract2._id] } });
          await Track.deleteOne({ _id: trackWithSplits._id });
        });

        it('should include payees when includePayees=true', async () => {
          // GIVEN
          const includePayeesParam = 'includePayees=true';

          // WHEN
          const res = await server
            .get(`/tracks?${includePayeesParam}`)
            .set('applicationToken', applicationToken)
            .set('token', token);

          // THEN
          expect(res.status).toBe(200);
          const trackWithPayees = res.body.tracks.find((track) => track._id === trackWithSplits._id.toString());
          expect(trackWithPayees).toBeDefined();
          expect(trackWithPayees.payees).toHaveLength(2);
        });

        it('should return correct payee details with name, email, and percentage', async () => {
          // GIVEN
          const includePayeesParam = 'includePayees=true';

          // WHEN
          const res = await server
            .get(`/tracks?${includePayeesParam}`)
            .set('applicationToken', applicationToken)
            .set('token', token);

          // THEN
          expect(res.status).toBe(200);
          const trackWithPayees = res.body.tracks.find((t) => t._id === trackWithSplits._id.toString());
          expect(trackWithPayees.payees).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                name: 'Payee 1',
                email: 'contact1@test.com',
                percentage: 60,
              }),
              expect.objectContaining({
                name: 'Payee 2',
                email: 'payment2@test.com',
                percentage: 40,
              }),
            ]),
          );
        });

        it('should not include salesReturnsRights in response when includePayees=true', async () => {
          const res = await server
            .get('/tracks?includePayees=true')
            .set('applicationToken', applicationToken)
            .set('token', token);

          expect(res.status).toBe(200);
          const trackWithPayees = res.body.tracks.find((t) => t._id === trackWithSplits._id.toString());
          expect(trackWithPayees.salesReturnsRights).toBeUndefined();
        });

        it('should not include payees array when includePayees is not set', async () => {
          const res = await server
            .get('/tracks')
            .set('applicationToken', applicationToken)
            .set('token', token);

          expect(res.status).toBe(200);
          const trackWithoutPayees = res.body.tracks.find((t) => t._id === trackWithSplits._id.toString());
          expect(trackWithoutPayees.payees).toBeUndefined();
        });

        it('should return empty payees array for tracks without splits when includePayees=true', async () => {
          const res = await server
            .get('/tracks?includePayees=true')
            .set('applicationToken', applicationToken)
            .set('token', token);

          expect(res.status).toBe(200);
          const trackWithoutSplits = res.body.tracks.find((t) => t._id === track1._id.toString());
          expect(trackWithoutSplits.payees).toBeDefined();
          expect(trackWithoutSplits.payees).toEqual([]);
        });
      });

      describe('payeeIds filtering', () => {
        let payee1;
        let payee2;
        let contract1;
        let contract2;

        beforeEach(async () => {
          payee1 = new Payee({ clientId, name: 'Payee 1', email: 'payee1@test.com' });
          payee2 = new Payee({ clientId, name: 'Payee 2', email: 'payee2@test.com' });
          await payee1.save();
          await payee2.save();

          contract1 = new Contract({
            clientId,
            name: 'Contract for Payee 1',
            payees: [{ payeeId: payee1._id }],
          });

          contract2 = new Contract({
            clientId,
            name: 'Contract for Payee 2',
            payees: [{ payeeId: payee2._id }],
          });

          await contract1.save();
          await contract2.save();
        });

        afterEach(async () => {
          await Payee.deleteMany({ _id: { $in: [payee1._id, payee2._id] } });
          await Contract.deleteMany({ _id: { $in: [contract1._id, contract2._id] } });
        });

        it('should filter tracks by payeeIds', async () => {
          // GIVEN
          track1.salesReturnsRights = [{ contractId: contract1._id, percentage: 100 }];
          track2.salesReturnsRights = [{ contractId: contract2._id, percentage: 100 }];
          await track1.save();
          await track2.save();

          // WHEN
          const res = await server
            .get(`/tracks?payeeIds[]=${payee1._id}`)
            .set('applicationToken', applicationToken)
            .set('token', token);

          // THEN
          expect(res.status).toBe(200);
          expect(res.body.tracks).toHaveLength(1);
          expect(res.body.tracks[0].title).toBe(track1.title);
        });

        it('should return all client tracks when payeeIds have no matching contracts', async () => {
          // GIVEN
          const payeeWithNoContracts = new Payee({
            clientId,
            name: 'Payee Without Contracts',
            email: 'nocontracts@test.com',
          });
          await payeeWithNoContracts.save();

          // WHEN
          const res = await server
            .get(`/tracks?payeeIds=${payeeWithNoContracts._id}`)
            .set('applicationToken', applicationToken)
            .set('token', token);

          // THEN
          expect(res.status).toBe(200);
          expect(res.body.tracks.length).toBeGreaterThan(2);
          expect(res.body.tracks).toHaveLength(await Track.countDocuments({ clientId }));

          // Cleanup
          await Payee.deleteOne({ _id: payeeWithNoContracts._id });
        });

        it('should combine payeeIds filter with other filters', async () => {
          // GIVEN
          track1.salesReturnsRights = [{ contractId: contract1._id, percentage: 100 }];
          track2.salesReturnsRights = [{ contractId: contract1._id, percentage: 100 }];
          await track1.save();
          await track2.save();

          // WHEN
          const res = await server
            .get(`/tracks?payeeIds=${payee1._id}&tags=${track1.tags[0]}`)
            .set('applicationToken', applicationToken)
            .set('token', token);

          // THEN
          expect(res.status).toBe(200);
          expect(res.body.tracks).toHaveLength(1);
          expect(res.body.tracks[0].title).toBe(track1.title);
        });

        it('should not call any payee contract extraction logic if payeeIds parameter is nullish', async () => {
          // GIVEN
          const loggerSpy = jest.spyOn(logger, 'info');

          // WHEN
          const res = await server
            .get('/tracks?payeeIds=')
            .set('applicationToken', applicationToken)
            .set('token', token);

          // THEN
          expect(res.status).toBe(200);
          expect(loggerSpy).not.toHaveBeenCalledWith(/Adding payee contract ids to query/);
        });
      });
    });
    describe('/:id GET', () => {
      describe('when a track is found', () => {
        it('should return a track (with isrc) and 200 status', async () => {
          const res = await server
            .get(`/tracks/${track1._id}`)
            .set('applicationToken', applicationToken)
            .set('token', token);
          expect(res.status).toBe(200);
          expect(res.body).toMatchObject({
            clientId: track1.clientId,
            title: track1.title,
            artist: track1.artist,
            label: track1.label,
            isrc: track1.isrc,
            alternativeId: null,
            linkedIsrc: null,
            tags: track1.tags,
          });
        });
        it('should return a track (with alternativeId) and 200 status', async () => {
          const res = await server
            .get(`/tracks/${track2._id}`)
            .set('applicationToken', applicationToken)
            .set('token', token);
          expect(res.status).toBe(200);
          expect(res.body).toMatchObject({
            clientId: track2.clientId,
            title: track2.title,
            artist: track2.artist,
            label: track2.label,
            isrc: null,
            alternativeId: track2.alternativeId,
            linkedIsrc: track2.linkedIsrc,
            tags: track2.tags,
          });
        });
      });
      describe('when a track is not found', () => {
        it('should return a 404 status', async () => {
          const id = 'aaaaaaaaaaaaaaaaaaaaaaaa';
          const res = await server
            .get(`/tracks/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', token);
          expect(res.status).toBe(404);
          expect(res.body.message).toEqual(`Could not find Track with ID ${id}`);
        });
      });
    });
    describe('/:id/releases GET', () => {
      describe('when a track is found', () => {
        it('should return a track and 200 status', async () => {
          const res = await server
            .get(`/tracks/${track1._id}/releases`)
            .set('applicationToken', applicationToken)
            .set('token', token);
          expect(res.status).toBe(200);
        });
      });
    });
    describe('/:id PUT', () => {
      describe('when a track is found', () => {
        it('should update with passed values only', async () => {
          const changedName = `${track1.title}changed`;
          const res = await server
            .put(`/tracks/${track1._id}`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send({ title: changedName });
          expect(res.status).toBe(200);
          expect(res.body.title).toEqual(changedName);
        });
        it('should not update clientId', async () => {
          const changedTitle = `${track1.title}changed`;
          const res = await server
            .put(`/tracks/${track1._id}`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send({ title: changedTitle, clientId: 'changed' });
          expect(res.body.clientId).toEqual(track1.clientId);
        });
        it("should not update any fields it isn't passed", async () => {
          const changedTitle = `${track1.title}changed`;
          const res = await server
            .put(`/tracks/${track1._id}`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send({ title: changedTitle, clientId: 'changed' });
          expect(res.body.foreignId).toEqual(track1.foreignId);
        });
      });
      describe('when a track is not found', () => {
        it('should return a 404 status', async () => {
          const id = 'aaaaaaaaaaaaaaaaaaaaaaaa';
          const res = await server
            .put(`/tracks/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send({ title: 'Changed Track Title' });
          expect(res.status).toBe(404);
          expect(res.body.message).toEqual(`Could not find Track with ID ${id}`);
        });
      });
    });
    describe('/:id/add_alias PUT', () => {
      describe('when a track is found', () => {
        it('should update with passed alias', async () => {
          const res = await server
            .put(`/tracks/${track1._id}/add_alias`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send({ aliases: 'aliases', alias: 'alias' });
          expect(res.status).toBe(200);
          expect(res.body.message).toEqual('Alias added');
        });
      });
    });
    describe('/ DELETE', () => {
      describe('when a track is found', () => {
        it('should delete the track and return a 200 status with deletedCount: 1', async () => {
          const res = await server
            .delete('/tracks')
            .send({ ids: [track1._id] })
            .set('applicationToken', applicationToken)
            .set('token', token);
          expect(res.status).toBe(200);
          expect(res.body).toEqual({ deletedCount: 1 });
          expect(await Track.findById(track1._id)).toBeNull();
        });
      });
      describe('when a track is not found', () => {
        it('should return a 200 status with deletedCount: 0', async () => {
          const id = 'aaaaaaaaaaaaaaaaaaaaaaaa';
          const res = await server
            .delete('/tracks')
            .send({ ids: [id] })
            .set('applicationToken', applicationToken)
            .set('token', token);
          expect(res.status).toBe(200);
          expect(res.body).toEqual({ deletedCount: 0 });
        });
      });
    });
    describe('/ POST', () => {
      it('should return a track created with the passed parameters', async () => {
        const params = {
          clientId: clientId.toString(),
          title: 'title',
          version: 'version',
          artist: 'artist',
          isrc: 'isrc',
          label: 'label',
          pLine: 'pLine',
        };
        const res = await server
          .post('/tracks')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send(params);
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject(params);
      });
      it('should add the track to the database', async () => {
        const trackCount = await Track.countDocuments({ clientId });
        const params = {
          clientId: clientId.toString(),
          title: 'title',
          version: 'version',
          artist: 'artist',
          isrc: 'isrc',
          label: 'label',
          pLine: 'pLine',
        };
        await server
          .post('/tracks')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send(params);
        expect(await Track.countDocuments({ clientId })).toEqual(trackCount + 1);
      });
    });
    describe('/import POST', () => {
      describe('when a file is passed', () => {
        it('should give a 200', async () => {
          const res = await server
            .post('/tracks/import')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .attach('file', 'test/test-data/test_track.xlsx');
          expect(res.status).toBe(200);
          expect(res.body.message).toEqual('Tracks are importing, and a report will be sent to you shortly.');
        });
        it('should call importFromExcel with the uploaded file', async () => {
          await server
            .post('/tracks/import')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .attach('file', 'test/test-data/test_track.xlsx');
          expect(importFromExcel).toHaveBeenCalled();
        });
      });
      describe('when no file is uploaded', () => {
        it('should return an error without a file in the request', async () => {
          const res = await server
            .post('/tracks/import')
            .set('applicationToken', applicationToken)
            .set('token', token);
          expect(res.status).toBe(400);
          expect(res.body.errors).toEqual(['Requires a file to be uploaded']);
        });
      });
    });
    describe('/export POST', () => {
      it('should return 200', async () => {
        const res = await server
          .post('/tracks/export')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ ids: [track1._id] });
        expect(res.status).toBe(200);
      });
      it('should call sendExport', async () => {
        await server
          .post('/tracks/export')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ ids: [track1._id] });
        expect(sendExport).toHaveBeenCalled();
      });
    });
    describe('/raw-export POST', () => {
      beforeEach(() => {
        mockCSVRawExport.mockReset();
        mockCSVRawExport.mockResolvedValue({ csvPublicLink: 'https://s3.amazonaws.com/test-export.csv' });
      });

      it('should return 200 with async message when sync is not set', async () => {
        const res = await server
          .post('/tracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ ids: [track1._id.toString()] });
        expect(res.status).toBe(200);
        expect(res.body.message).toEqual('Your report will be sent to you via email shortly');
      });

      it('should call CSVRawExport with correct filter when ids provided', async () => {
        await server
          .post('/tracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ ids: [track1._id.toString()] });
        expect(mockCSVRawExport).toHaveBeenCalledWith(
          expect.objectContaining({
            collectionName: 'tracks',
            filter: expect.objectContaining({
              clientId: clientId.toString(),
              _id: { $in: [track1._id.toString()] },
            }),
          }),
        );
      });

      it('should return 200 with csvPublicLink when sync=true', async () => {
        const res = await server
          .post('/tracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ ids: [track1._id.toString()], sync: true });
        expect(res.status).toBe(200);
        expect(res.body.csvPublicLink).toEqual('https://s3.amazonaws.com/test-export.csv');
      });

      it('should call CSVRawExport with sync=true when body param set', async () => {
        await server
          .post('/tracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ ids: [track1._id.toString()], sync: true });
        expect(mockCSVRawExport).toHaveBeenCalledWith(
          expect.objectContaining({
            sync: true,
          }),
        );
      });

      it('should return 500 when CSVRawExport throws in sync mode', async () => {
        mockCSVRawExport.mockRejectedValue(new Error('Export failed'));
        const res = await server
          .post('/tracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ ids: [track1._id.toString()], sync: true });
        expect(res.status).toBe(500);
        expect(res.body.message).toEqual('Export failed');
      });

      it('should call CSVRawExport with filter when body.filter provided', async () => {
        await server
          .post('/tracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ filter: { createdAfter: '2025-01-01' } });
        expect(mockCSVRawExport).toHaveBeenCalledWith(
          expect.objectContaining({
            collectionName: 'tracks',
            filter: expect.objectContaining({
              clientId: clientId.toString(),
            }),
          }),
        );
      });

      it('should apply updatedAfter filter to updatedAt.$gte', async () => {
        await server
          .post('/tracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', token)
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
          .post('/tracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', token)
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
          .post('/tracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', token)
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
          .post('/tracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', token)
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
          .post('/tracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', token)
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

      it('should return csvPublicLink when sync=true with updatedAfter filter', async () => {
        const res = await server
          .post('/tracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ sync: true, filter: { updatedAfter: '2025-01-15' } });
        expect(res.status).toBe(200);
        expect(res.body.csvPublicLink).toEqual('https://s3.amazonaws.com/test-export.csv');
        expect(mockCSVRawExport).toHaveBeenCalledWith(
          expect.objectContaining({
            sync: true,
            filter: expect.objectContaining({
              updatedAt: { $gte: new Date('2025-01-15T00:00:00.000Z') },
            }),
          }),
        );
      });

      it('should return csvPublicLink when sync=true with createdAfter filter', async () => {
        const res = await server
          .post('/tracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ sync: true, filter: { createdAfter: '2025-01-10' } });
        expect(res.status).toBe(200);
        expect(res.body.csvPublicLink).toEqual('https://s3.amazonaws.com/test-export.csv');
        expect(mockCSVRawExport).toHaveBeenCalledWith(
          expect.objectContaining({
            sync: true,
            filter: expect.objectContaining({
              createdAt: { $gte: new Date('2025-01-10T00:00:00.000Z') },
            }),
          }),
        );
      });

      it('should return csvPublicLink when sync=true with date range filter', async () => {
        const res = await server
          .post('/tracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ sync: true, filter: { updatedAfter: '2025-01-01', updatedBefore: '2025-01-31' } });
        expect(res.status).toBe(200);
        expect(res.body.csvPublicLink).toEqual('https://s3.amazonaws.com/test-export.csv');
        expect(mockCSVRawExport).toHaveBeenCalledWith(
          expect.objectContaining({
            sync: true,
            filter: expect.objectContaining({
              updatedAt: {
                $gte: new Date('2025-01-01T00:00:00.000Z'),
                $lte: new Date('2025-01-31T23:59:59.999Z'),
              },
            }),
          }),
        );
      });
    });
  });

  describe('as a client user with View rights', () => {
    const userView = {
      id: userId, internal: false, parentId: null, clientId, rights: {},
    };
    userView.rights[clientId] = {
      sales: 'View', contracts: 'View', periods: 'View', catalogue: 'View',
    };
    const token = jwt.sign(userView, process.env.jsonSecretToken, { expiresIn: 86400 });
    describe('/ GET', () => {
      it('should return 200', async () => {
        const res = await server
          .get('/tracks')
          .set('applicationToken', applicationToken)
          .set('token', token);
        expect(res.status).toBe(200);
      });
    });
    describe('/:id GET', () => {
      it('should return 200', async () => {
        const res = await server
          .get(`/tracks/${track1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', token);
        expect(res.status).toBe(200);
      });
    });
    describe('/:id/releases GET', () => {
      it('should return 200', async () => {
        const res = await server
          .get(`/tracks/${track1._id}/releases`)
          .set('applicationToken', applicationToken)
          .set('token', token);
        expect(res.status).toBe(200);
      });
    });
    describe('/:id PUT', () => {
      it('should return 403', async () => {
        const res = await server
          .put(`/tracks/${track1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ title: 'changedName' });
        expect(res.status).toBe(403);
      });
    });
    describe('/:id/add_alias PUT', () => {
      it('should return 403', async () => {
        const res = await server
          .put(`/tracks/${track1._id}/add_alias`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ alias: 'alias' });
        expect(res.status).toBe(403);
      });
    });
    describe('/:id DELETE', () => {
      it('should return 403', async () => {
        const res = await server
          .delete('/tracks')
          .send({ ids: [track1._id] })
          .set('applicationToken', applicationToken)
          .set('token', token);
        expect(res.status).toBe(403);
      });
    });
    describe('/ POST', () => {
      it('should return 403', async () => {
        const params = {
          clientId: clientId.toString(),
          foreignId: 'foreignId',
          projectId: 'projectId',
          partyNo: 2,
          payeeId: 'payeeId',
        };
        const res = await server
          .post('/tracks')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send(params);
        expect(res.status).toBe(403);
      });
    });
    describe('/import POST', () => {
      it('should give a 403', async () => {
        const res = await server
          .post('/tracks/import')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .attach('file', 'test/test-data/test_track.xlsx');
        expect(res.status).toBe(403);
      });
    });
    describe('/export POST', () => {
      it('should return 200', async () => {
        const res = await server
          .post('/tracks/export')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ ids: [track1._id] });
        expect(res.status).toBe(200);
      });
      it('should call sendExport', async () => {
        await server
          .post('/tracks/export')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ ids: [track1._id] });
        expect(sendExport).toHaveBeenCalled();
      });
    });
  });

  describe('as a client user with Edit rights', () => {
    const userEdit = {
      id: userId, internal: false, parentId: null, clientId, rights: {},
    };
    userEdit.rights[clientId] = {
      sales: 'Edit', contracts: 'Edit', periods: 'Edit', catalogue: 'Edit',
    };
    const token = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });
    describe('/ GET', () => {
      it('should return 200', async () => {
        const res = await server
          .get('/tracks')
          .set('applicationToken', applicationToken)
          .set('token', token);
        expect(res.status).toBe(200);
      });
    });
    describe('/:id/releases GET', () => {
      describe('when a track is found', () => {
        it('should return a track and 200 status', async () => {
          const res = await server
            .get(`/tracks/${track1._id}/releases`)
            .set('applicationToken', applicationToken)
            .set('token', token);
          expect(res.status).toBe(200);
        });
      });
    });
    describe('/:id PUT', () => {
      it('should return 200', async () => {
        const res = await server
          .put(`/tracks/${track1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ title: 'changedName' });
        expect(res.status).toBe(200);
      });
    });
    describe('/:id/add_alias PUT', () => {
      describe('when a track is found', () => {
        it('should update with passed alias', async () => {
          const res = await server
            .put(`/tracks/${track1._id}/add_alias`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send({ aliases: 'aliases', alias: 'alias' });
          expect(res.status).toBe(200);
          expect(res.body.message).toBe('Alias added');
        });
      });
    });
    describe('/:id DELETE', () => {
      it('should return 200', async () => {
        const res = await server
          .delete('/tracks')
          .send({ ids: [track1._id] })
          .set('applicationToken', applicationToken)
          .set('token', token);
        expect(res.status).toBe(200);
      });
    });
    describe('/ POST', () => {
      it('should return 200', async () => {
        const params = {
          clientId: clientId.toString(),
          title: 'title',
          version: 'version',
          artist: 'artist',
          isrc: 'isrc',
          label: 'label',
          pLine: 'pLine',
        };
        const res = await server
          .post('/tracks')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send(params);
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject(params);
      });
    });
    describe('/import POST', () => {
      it('should give a 200', async () => {
        const res = await server
          .post('/tracks/import')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .attach('file', 'test/test-data/test_track.xlsx');
        expect(res.status).toBe(200);
      });
    });
    describe('/export POST', () => {
      it('should return 200', async () => {
        const res = await server
          .post('/tracks/export')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ ids: [track1._id] });
        expect(res.status).toBe(200);
      });
      it('should call sendExport', async () => {
        await server
          .post('/tracks/export')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ ids: [track1._id] });
        expect(sendExport).toHaveBeenCalled();
      });
    });
  });

  const userNone = {
    id: userId,
    internal: false,
    parentId: null,
    clientId: null,
    rights: {
      [clientId]: {
        sales: 'None', contracts: 'None', periods: 'None', catalogue: 'None',
      },
    },
  };
  const userNoneToken = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
  const internalUserToken = jwt.sign({ internal: true }, process.env.jsonSecretToken, { expiresIn: 86400 });
  const parentWithoutUserToken = jwt.sign({ internal: false, parentId: 'parentId' }, process.env.jsonSecretToken, { expiresIn: 86400 });
  const contractIds = ['345', '678'];
  const payeeUserToken = jwt.sign({ internal: false, parentId: null, payeeId, contractIds }, process.env.jsonSecretToken, { expiresIn: 86400 });

  describe.each([
    ['as a client user with None rights', userNoneToken],
    ['as an internal user', internalUserToken],
    ['as a parent user without a client', parentWithoutUserToken],
    ['as a payee user', payeeUserToken],
  ])('%s', (_, token) => {
    describe('/ GET', () => {
      if (token === internalUserToken || token === payeeUserToken) {
        it('should return 200', async () => {
          const res = await server
            .get('/tracks')
            .set('applicationToken', applicationToken)
            .set('token', token);
          expect(res.status).toBe(200);
        });
      } else {
        it('should return a 403 forbidden response', async () => {
          const res = await server
            .get('/tracks')
            .set('applicationToken', applicationToken)
            .set('token', token);
          expect(res.status).toBe(403);
          expect(res.body.message).toEqual('Forbidden');
        });
      }
    });
    describe('/:id GET', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .get(`/tracks/${track1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', token);
        expect(res.status).toBe(403);
        expect(res.body.message).toEqual('Forbidden');
      });
    });
    describe('/:id/releases GET', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .get(`/tracks/${track1._id}/releases`)
          .set('applicationToken', applicationToken)
          .set('token', token);
        expect(res.status).toBe(403);
        expect(res.body.message).toEqual('Forbidden');
      });
    });
    describe('/:id PUT', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .put(`/tracks/${track1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ title: 'Changed Title' });
        expect(res.status).toBe(403);
        expect(res.body.message).toEqual('Forbidden');
      });
      it('should not update the track', async () => {
        await server
          .put(`/tracks/${track1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ title: 'Changed Title' });
        const updated = await Track.findById(track1._id);
        expect(updated.title).toEqual(track1.title);
      });
    });
    describe('/:id/add_alias PUT', () => {
      it('should return 403', async () => {
        const res = await server
          .put(`/tracks/${track1._id}/add_alias`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ alias: 'alias' });
        expect(res.status).toBe(403);
      });
    });
    describe('/ DELETE', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .delete('/tracks')
          .send({ ids: [track1._id] })
          .set('applicationToken', applicationToken)
          .set('token', token);
        expect(res.status).toBe(403);
        expect(res.body.message).toEqual('Forbidden');
      });
      it('should not delete the track', async () => {
        await server
          .delete('/tracks')
          .send({ ids: [track1._id] })
          .set('applicationToken', applicationToken)
          .set('token', token);
        const count = await Track.countDocuments({ _id: track1._id });
        expect(count).toEqual(1);
      });
    });
    describe('/ POST', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .post('/tracks')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ title: 'Changed Title' });
        expect(res.status).toBe(403);
        expect(res.body.message).toEqual('Forbidden');
      });
      it('should not create a track', async () => {
        const count = await Track.countDocuments({ clientId });
        await server
          .post('/tracks')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ title: 'Changed Title' });
        expect(await Track.countDocuments({ clientId })).toEqual(count);
      });
    });
    describe('/import POST', () => {
      it('should return 403', async () => {
        const res = await server
          .post('/tracks/import')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .attach('file', 'test/test-data/test_track.xlsx');
        expect(res.status).toBe(403);
        expect(res.body.message).toEqual('Forbidden');
      });
      it('should not import a track', async () => {
        const count = await Track.countDocuments({ clientId });
        await server
          .post('/tracks/import')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .attach('file', 'test/test-data/test_track.xlsx');
        expect(await Track.countDocuments({ clientId })).toEqual(count);
      });
    });
    describe('/export POST', () => {
      it('should return 403', async () => {
        const res = await server
          .post('/tracks/export')
          .set('applicationToken', applicationToken)
          .set('token', token);
        expect(res.status).toBe(403);
        expect(res.body.message).toEqual('Forbidden');
      });
    });
    describe('/raw-export POST', () => {
      it('should return 403 when user has no clientId', async () => {
        const noClientToken = jwt.sign({ id: userId }, process.env.jsonSecretToken, { expiresIn: 86400 });
        const res = await server
          .post('/tracks/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', noClientToken)
          .send({ ids: [track1._id.toString()] });
        expect(res.status).toBe(403);
        expect(res.body.message).toEqual('Forbidden');
      });
    });
  });
});
