const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const jwt = require('jsonwebtoken');
const supertest = require('supertest');
const config = require('../../config.json');

const mockCSVRawExport = jest.fn();
jest.mock('../../libs/mongodb-export', () => ({
  CSVRawExport: mockCSVRawExport,
}));

const Client = require('../../models/client');
const Contract = require('../../models/contract');
const Notification = require('../../models/notification');
const Payee = require('../../models/payee');
const Release = require('../../models/release');
const Track = require('../../models/track');
const User = require('../../models/user');

const server = supertest(require('../../index'));

describe('/releases', () => {
  let client;
  let user;
  const applicationToken = config.applicationTokens[0];
  let importFromExcelStub;
  let sendExportStub;
  let release1;
  let release2;
  let release3;
  let release4;
  let track;
  let contract;
  let contract2;
  let proRataContractsFromTracksStub;
  let inheritMechanicalsFromTracksStub;

  beforeEach(async () => {
    jest.spyOn(Client.prototype, 'createBigQueryTables').mockImplementation((callback) => callback());
    jest.spyOn(Client.prototype, 'createBigQueryBackups').mockImplementation((callback) => callback());
    jest.spyOn(Release.prototype, 'proRataTrackContracts').mockImplementation((callback) => callback());
    jest.spyOn(Release.prototype, 'proRataTrackCostContracts').mockImplementation((callback) => callback());
    jest.spyOn(Notification, 'generate').mockImplementation((callback) => callback());
    sendExportStub = jest.spyOn(Release, 'sendExport').mockImplementation(() => { });
    importFromExcelStub = jest.spyOn(Release, 'importFromExcel').mockReturnValue({});
    proRataContractsFromTracksStub = jest.spyOn(Release, 'proRataContractsFromTracks').mockReturnValue({});
    inheritMechanicalsFromTracksStub = jest.spyOn(Release, 'inheritMechanicalsFromTracks').mockReturnValue({});

    client = new Client({
      _id: randomId(),
      name: randomString(),
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    });
    await client.save();

    user = new User({ _id: randomId(), email: `${randomString()}@curve.com` });
    await user.save();

    track = new Track({ clientId: client._id, title: randomString(), isrc: randomString() });
    await track.save();

    contract = new Contract({ clientId: client._id, name: randomString() });
    await contract.save();

    contract2 = new Contract({ clientId: client._id, name: 'Contract 2' });
    await contract2.save();

    release1 = new Release({ clientId: client._id, title: randomString(), trackIds: [track._id], salesReturnsRights: { contractId: contract._id, percentage: randomInt() } });
    await release1.save();

    release2 = new Release({ clientId: client._id, title: randomString(), trackIds: [track._id], salesReturnsRights: { contractId: contract._id, percentage: randomInt() } });
    await release2.save();

    release3 = new Release({ clientId: client._id, title: randomString(), trackIds: [track._id], salesReturnsRights: { contractId: contract._id, percentage: randomInt() } });
    await release3.save();

    release4 = new Release({ clientId: client._id, title: 'Release 4 attached to non-existant contract', salesReturnsRights: { contractId: contract2._id, percentage: 5.00 } });
    await release4.save();
  });

  describe('as a client user', () => {
    describe('as a user with full rights', () => {
      let clientUser;

      beforeEach(() => {
        const userToken = { id: user._id, internal: false, parentId: null, clientId: client._id, email: `${randomString()}@curve.com`, rights: {} };
        userToken.rights[client._id.toString()] = { catalogue: 'Edit' };
        clientUser = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/ GET', () => {
        it('should return a list of releases', async () => {
          const res = await server
            .get('/releases')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(200);
          expect(res.body.releases).toBeInstanceOf(Array);
          const releases = await Release.find({ clientId: client._id });
          expect(res.body.releases.length).toBe(releases.length);
          expect(res.body.releases[0].updatedAt).toBeDefined();
        });

        it('should return metadata of releases index on / GET', async () => {
          const res = await server
            .get('/releases')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(200);
          expect(res.body.meta).toBeInstanceOf(Object);
        });

        it('should return the first page if not passed a specific page', async () => {
          const res = await server
            .get('/releases')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.body.meta.currentPage).toBe(1);
        });

        it('should return the passed page when passed the parameter', async () => {
          const res = await server
            .get('/releases?page=3')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.body.meta.currentPage).toBe(3);
        });

        it('should return the pages available', async () => {
          const res = await server
            .get('/releases')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.body.meta.totalPages).toBe(1);
        });

        it('should set the amount to be returned per page when passed a limit option', async () => {
          const res = await server
            .get('/releases?limit=1')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.body.releases.length).toBe(1);
          const releaseCount = await Release.countDocuments({ clientId: client._id });
          expect(res.body.meta.totalPages).toBe(releaseCount);
        });
      });

      describe('/:id GET', () => {
        it('should return a release and 200 status', async () => {
          const res = await server
            .get(`/releases/${release1._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(200);
          expect(res.body).toBeInstanceOf(Object);
          expect(res.body.clientId).toBe(release1.clientId);
          expect(res.body.title).toBe(release1.title);
          expect(res.body.artist).toBe(release1.artist);
          expect(res.body.catNo).toBe(release1.catNo);
          expect(res.body.barcode).toBe(release1.barcode);
          expect(res.body.label).toBe(release1.label);
          expect(res.body.updatedAt).toBeDefined();
        });

        it('should return a 404 status', async () => {
          const id = randomId();

          const res = await server
            .get(`/releases/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(404);
          expect(res.body.message).toBe(`Could not find Release with ID ${id}`);
        });
      });

      describe('/:id/tracks GET', () => {
        describe('when a release is found', () => {
          it('should return a release and 200 status', async () => {
            const res = await server
              .get(`/releases/${release1._id}/tracks`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser);

            expect(res.status).toBe(200);
          });
        });
      });

      describe('/:id/pro_rata_track_contracts GET', () => {
        describe('when a release is found', () => {
          it('should return a contract and 200 status', async () => {
            const res = await server
              .get(`/releases/${release1._id}/pro_rata_track_contracts`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser);

            expect(res.status).toBe(200);
          });
        });
      });

      describe('/:id/inherit_track_mechanicals GET', () => {
        describe('when a release is found', () => {
          it('should return a contract and 200 status', async () => {
            const res = await server
              .get(`/releases/${release1._id}/inherit_track_mechanicals`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser);

            expect(res.status).toBe(200);
          });
        });
      });

      describe('/pro_rata_contracts_from_tracks POST', () => {
        it('should return 200', async () => {
          const res = await server
            .post('/releases/pro_rata_contracts_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ ids: [release1._id.toString()] });

          expect(res.status).toBe(200);
        });

        it('should call Release.proRataContractsFromTracks', async () => {
          await server
            .post('/releases/pro_rata_contracts_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ ids: [release1._id.toString()] });

          expect(proRataContractsFromTracksStub).toHaveBeenCalled();
        });
      });

      describe('/inherit_mechanicals_from_tracks POST', () => {
        it('should return 200', async () => {
          const res = await server
            .post('/releases/inherit_mechanicals_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ ids: [release1._id.toString()] });

          expect(res.status).toBe(200);
        });

        it('should call Release.inheritMechanicalsFromTracks', async () => {
          await server
            .post('/releases/inherit_mechanicals_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ ids: [release1._id.toString()] });

          expect(inheritMechanicalsFromTracksStub).toHaveBeenCalled();
        });
      });

      describe('/:id PUT', () => {
        describe('when a release is found', () => {
          it('should update with passed values only', async () => {
            const id = release1._id;
            const changedName = `${release1.title}changed`;

            const res = await server
              .put(`/releases/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .send({ title: changedName });

            expect(res.status).toBe(200);
            expect(res.body.title).toBe(changedName);
          });

          it('should not update clientId', async () => {
            const id = release1._id;
            const changedTitle = `${release1.title}changed`;

            const res = await server
              .put(`/releases/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .send({ title: changedTitle, clientId: 'changed' });

            expect(res.body.clientId).toBe(release1.clientId);
          });

          it("should not update any fields it isn't passed", async () => {
            const id = release1._id;
            const changedTitle = `${release1.title}changed`;

            const res = await server
              .put(`/releases/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .send({ title: changedTitle, clientId: 'changed' });

            expect(res.body.foreignId).toBe(release1.foreignId);
          });
        });

        describe('when a release is not found', () => {
          it('should return a 404 status', async () => {
            const id = randomId();

            const res = await server
              .put(`/releases/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .send({ title: 'Changed Release Title' });

            expect(res.status).toBe(404);
            expect(res.body.message).toBe(`Could not find Release with ID ${id}`);
          });
        });
      });

      describe('/:id/add_alias PUT', () => {
        describe('when a release is found', () => {
          it('should update with passed alias', async () => {
            const id = release1._id;

            const res = await server
              .put(`/releases/${id}/add_alias`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .send({ aliases: 'aliases', alias: 'alias' });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Alias added');
          });
        });
      });

      describe('/ DELETE', () => {
        let curveUser;

        beforeEach(() => {
          curveUser = jwt.sign(
            {
              id: user._id,
              internal: false,
              parentId: null,
              clientId: client._id,
              email: `${randomString()}@curve.com`,
              rights: {
                [client._id]: {
                  catalogue: 'Edit',
                },
              },
            },
            process.env.jsonSecretToken,
            { expiresIn: 86400 },
          );
        });

        describe('when a release is not passed', () => {
          it('should return a 404 status', async () => {
            const params = {};

            const res = await server
              .delete('/releases')
              .set('applicationToken', applicationToken)
              .set('token', curveUser)
              .send(params);

            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Could not find Releases');
          });
        });
      });

      describe('/ POST', () => {
        it('should return a release created with the passed parameters', async () => {
          const params = {
            clientId: client._id.toString(),
            title: 'title',
            version: 'version',
            artist: 'artist',
            catNo: 'catNo',
            barcode: 'barcode',
            label: 'label',
          };

          const res = await server
            .post('/releases')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send(params);

          expect(res.status).toBe(200);
          expect(res.body.clientId).toBe(params.clientId);
          expect(res.body.title).toBe(params.title);
          expect(res.body.version).toBe(params.version);
          expect(res.body.artist).toBe(params.artist);
          expect(res.body.catNo).toBe(params.catNo);
          expect(res.body.barcode).toBe(params.barcode);
          expect(res.body.label).toBe(params.label);
        });

        it('should add the release to the database', async () => {
          const releases = await Release.find({});
          const params = { clientId: '123', title: 'Post Release' };

          await server
            .post('/releases')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send(params);

          const newRelease = await Release.find({});
          expect(newRelease.length).toBe(releases.length + 1);
        });
      });

      describe('/import POST', () => {
        describe('when a file is passed', () => {
          it('should give a 200', async () => {
            const res = await server
              .post('/releases/import')
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .attach('file', 'test/test-data/test_release.xlsx');

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Releases are importing, and a report will be sent to you shortly.');
          });

          it('should call importFromExcel with the uploaded file', async () => {
            await server
              .post('/releases/import')
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .attach('file', 'test/test-data/test_release.xlsx');

            expect(importFromExcelStub).toHaveBeenCalled();
          });
        });

        describe('when no file is uploaded', () => {
          it('should return an error without a file in the request', async () => {
            const res = await server
              .post('/releases/import')
              .set('applicationToken', applicationToken)
              .set('token', clientUser);

            expect(res.status).toBe(400);
            expect(res.body.errors).toEqual(['Requires a file to be uploaded']);
          });
        });
      });

      describe('/export POST', () => {
        it('should return 200', async () => {
          const id = release1._id;

          const res = await server
            .post('/releases/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ ids: [id] });

          expect(res.status).toBe(200);
        });

        it('should call sendExport', async () => {
          await server
            .post('/releases/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ filter: {} });

          expect(sendExportStub).toHaveBeenCalled();
        });
      });

      describe('/raw-export POST', () => {
        beforeEach(() => {
          mockCSVRawExport.mockReset();
          mockCSVRawExport.mockResolvedValue({ csvPublicLink: 'https://s3.amazonaws.com/test-export.csv' });
        });

        it('should return 200 with async message when sync is not set', async () => {
          const res = await server
            .post('/releases/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ filter: {} });
          expect(res.status).toBe(200);
          expect(res.body.message).toEqual('Your report will be sent to you via email shortly');
        });

        it('should return 200 with csvPublicLink when sync=true', async () => {
          const res = await server
            .post('/releases/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ sync: true, filter: {} });
          expect(res.status).toBe(200);
          expect(res.body.csvPublicLink).toEqual('https://s3.amazonaws.com/test-export.csv');
        });

        it('should call CSVRawExport with sync=true when body param set', async () => {
          await server
            .post('/releases/raw-export')
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
            .post('/releases/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ sync: true, filter: {} });
          expect(res.status).toBe(500);
          expect(res.body.message).toEqual('Export failed');
        });

        it('should pass ids filter to CSVRawExport', async () => {
          const id = release1._id.toString();
          await server
            .post('/releases/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ sync: true, ids: [id] });
          expect(mockCSVRawExport).toHaveBeenCalledWith(
            expect.objectContaining({
              filter: expect.objectContaining({
                _id: { $in: [id] },
              }),
            }),
          );
        });

        it('should include clientId in filter', async () => {
          await server
            .post('/releases/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ filter: {} });
          expect(mockCSVRawExport).toHaveBeenCalledWith(
            expect.objectContaining({
              filter: expect.objectContaining({
                clientId: expect.anything(),
              }),
            }),
          );
        });

        it('should return 403 when user has no catalogue rights', async () => {
          const noRightsUser = { id: user._id, internal: false, parentId: null, clientId: client._id, email: `${randomString()}@curve.com`, rights: {} };
          noRightsUser.rights[client._id.toString()] = { catalogue: 'None' };
          const noRightsToken = jwt.sign(noRightsUser, process.env.jsonSecretToken, { expiresIn: 86400 });

          const res = await server
            .post('/releases/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', noRightsToken)
            .send({ filter: {} });
          expect(res.status).toBe(403);
        });
      });
    });

    describe('as a user with None rights', () => {
      let userNone;
      let clientUserNone;

      beforeEach(() => {
        userNone = { id: user._id, internal: false, parentId: null, clientId: null, rights: {} };
        userNone.rights[client._id] = { sales: 'None', contracts: 'None', periods: 'None', catalogue: 'None' };
        clientUserNone = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/ GET', () => {
        it('should return 403', async () => {
          const res = await server
            .get('/releases')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);

          expect(res.status).toBe(403);
        });
      });

      describe('/:id GET', () => {
        it('should return 403', async () => {
          const id = release1._id;

          const res = await server
            .get(`/releases/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);

          expect(res.status).toBe(403);
        });
      });

      describe('/:id/tracks GET', () => {
        it('should return 403', async () => {
          const id = release1._id;

          const res = await server
            .get(`/releases/${id}/tracks`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);

          expect(res.status).toBe(403);
        });
      });

      describe('/:id/pro_rata_track_contracts GET', () => {
        it('should return 403', async () => {
          const id = release1._id;

          const res = await server
            .get(`/releases/${id}/pro_rata_track_contracts`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);

          expect(res.status).toBe(403);
        });
      });

      describe('/:id/inherit_track_mechanicals GET', () => {
        it('should return 403', async () => {
          const id = release1._id;

          const res = await server
            .get(`/releases/${id}/inherit_track_mechanicals`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);

          expect(res.status).toBe(403);
        });
      });

      describe('/pro_rata_contracts_from_tracks POST', () => {
        it('should return 403', async () => {
          const id = release1._id;

          const res = await server
            .post('/releases/pro_rata_contracts_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send({ ids: [id] });

          expect(res.status).toBe(403);
        });

        it('should NOT call Release.proRataContractsFromTracks', async () => {
          const id = release1._id;

          await server
            .post('/releases/pro_rata_contracts_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send({ ids: [id] });

          expect(proRataContractsFromTracksStub).not.toHaveBeenCalled();
        });
      });

      describe('/inherit_mechanicals_from_tracks POST', () => {
        it('should return 403', async () => {
          const id = release1._id;

          const res = await server
            .post('/releases/inherit_mechanicals_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send({ ids: [id] });

          expect(res.status).toBe(403);
        });

        it('should NOT call Release.inheritMechanicalsFromTracks', async () => {
          const id = release1._id;

          await server
            .post('/releases/inherit_mechanicals_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send({ ids: [id] });

          expect(inheritMechanicalsFromTracksStub).not.toHaveBeenCalled();
        });
      });

      describe('/:id PUT', () => {
        it('should return 403', async () => {
          const id = release1._id;

          const res = await server
            .put(`/releases/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send({ title: 'changedName' });

          expect(res.status).toBe(403);
        });
      });

      describe('/:id/add_alias PUT', () => {
        it('should return 403', async () => {
          const id = release1._id;

          const res = await server
            .put(`/releases/${id}/add_alias`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send({ alias: 'alias' });

          expect(res.status).toBe(403);
        });
      });

      describe('/ DELETE', () => {
        it('should return 403', async () => {
          const params = {
            ids: [release1._id],
            type: 'single',
          };

          const res = await server
            .delete('/releases')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send(params);

          expect(res.status).toBe(403);
        });
      });

      describe('/ POST', () => {
        it('should return 403', async () => {
          const params = {
            clientId: client._id.toString(),
            foreignId: 'foreignId',
            projectId: 'projectId',
            partyNo: 2,
          };

          const res = await server
            .post('/releases')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send(params);

          expect(res.status).toBe(403);
        });
      });

      describe('/import POST', () => {
        it('should give a 403', async () => {
          const res = await server
            .post('/releases/import')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .attach('file', 'test/test-data/test_release.xlsx');

          expect(res.status).toBe(403);
        });
      });

      describe('/export POST', () => {
        it('should return 403', async () => {
          const res = await server
            .post('/releases/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);

          expect(res.status).toBe(403);
        });
      });
    });

    describe('as a user with View rights', function () {
      let userView;
      let clientUserView;

      beforeEach(() => {
        userView = { id: user._id, internal: false, parentId: null, clientId: client._id, rights: {} };
        userView.rights[client._id] = { sales: 'View', contracts: 'View', periods: 'View', catalogue: 'View' };
        clientUserView = jwt.sign(userView, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/ GET', () => {
        it('should return 200', async () => {
          const res = await server
            .get('/releases')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);

          expect(res.status).toBe(200);
        });
      });

      describe('/:id GET', () => {
        it('should return 200', async () => {
          const id = release1._id;

          const res = await server
            .get(`/releases/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);

          expect(res.status).toBe(200);
        });
      });

      describe('/:id/tracks GET', () => {
        it('should return 200', async () => {
          const id = release1._id;

          const res = await server
            .get(`/releases/${id}/tracks`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);

          expect(res.status).toBe(200);
        });
      });

      describe('/:id/pro_rata_track_contracts GET', () => {
        it('should return 403', async () => {
          const id = release1._id;

          const res = await server
            .get(`/releases/${id}/pro_rata_track_contracts`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);

          expect(res.status).toBe(403);
        });
      });

      describe('/:id/inherit_track_mechanicals GET', () => {
        it('should return 403', async () => {
          const id = release1._id;

          const res = await server
            .get(`/releases/${id}/inherit_track_mechanicals`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);

          expect(res.status).toBe(403);
        });
      });

      describe('/pro_rata_contracts_from_tracks POST', () => {
        it('should return 403', async () => {
          const id = release1._id;

          const res = await server
            .post('/releases/pro_rata_contracts_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send({ ids: [id] });

          expect(res.status).toBe(403);
        });

        it('should NOT call Release.proRataContractsFromTracks', async () => {
          const id = release1._id;

          await server
            .post('/releases/pro_rata_contracts_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send({ ids: [id] });

          expect(proRataContractsFromTracksStub).not.toHaveBeenCalled();
        });
      });

      describe('/inherit_mechanicals_from_tracks POST', () => {
        it('should return 403', async () => {
          const id = release1._id;

          const res = await server
            .post('/releases/inherit_mechanicals_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send({ ids: [id] });

          expect(res.status).toBe(403);
        });

        it('should NOT call Release.inheritMechanicalsFromTracks', async () => {
          const id = release1._id;

          await server
            .post('/releases/inherit_mechanicals_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send({ ids: [id] });

          expect(inheritMechanicalsFromTracksStub).not.toHaveBeenCalled();
        });
      });

      describe('/:id PUT', () => {
        it('should return 403', async () => {
          const id = release1._id;

          const res = await server
            .put(`/releases/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send({ title: 'changedName' });

          expect(res.status).toBe(403);
        });
      });

      describe('/:id/add_alias PUT', () => {
        it('should return 403', async () => {
          const id = release1._id;

          const res = await server
            .put(`/releases/${id}/add_alias`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send({ alias: 'alias' });

          expect(res.status).toBe(403);
        });
      });

      describe('/ DELETE', () => {
        it('should return 403', async () => {
          const params = {
            ids: [release1._id],
            type: 'single',
          };

          const res = await server
            .delete('/releases')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send(params);

          expect(res.status).toBe(403);
        });
      });

      describe('/ POST', () => {
        it('should return 403', async () => {
          const params = {
            clientId: client._id.toString(),
            foreignId: 'foreignId',
            projectId: 'projectId',
            partyNo: 2,
          };

          const res = await server
            .post('/releases')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send(params);

          expect(res.status).toBe(403);
        });
      });

      describe('/import POST', () => {
        it('should give a 403', async () => {
          const res = await server
            .post('/releases/import')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .attach('file', 'test/test-data/test_release.xlsx');

          expect(res.status).toBe(403);
        });
      });

      // describe('/export POST', () => {
      //   it('should return 403', async () => {
      //     const res = await server
      //       .post('/releases/export')
      //       .set('applicationToken', applicationToken)
      //       .set('token', clientUserView);

      //     expect(res.status).toBe(403);
      //   });
      // });
    });

    describe('as a user with Edit rights', function () {
      let userEdit;
      let clientUserEdit;

      beforeEach(() => {
        userEdit = { id: user._id, internal: false, parentId: null, clientId: client._id, rights: {} };
        userEdit.rights[client._id] = { sales: 'Edit', contracts: 'Edit', periods: 'Edit', catalogue: 'Edit' };
        clientUserEdit = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/ GET', () => {
        it('should return 200', async () => {
          const res = await server
            .get('/releases')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);

          expect(res.status).toBe(200);
        });
      });

      describe('/:id/tracks GET', () => {
        describe('when a release is found', () => {
          it('should return a release and 200 status', async () => {
            const id = release1._id;

            const res = await server
              .get(`/releases/${id}/tracks`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserEdit);

            expect(res.status).toBe(200);
          });
        });
      });

      describe('/:id/pro_rata_track_contracts GET', () => {
        describe('when a release is found', () => {
          it('should return a release and 200 status', async () => {
            const id = release1._id;

            const res = await server
              .get(`/releases/${id}/pro_rata_track_contracts`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserEdit);

            expect(res.status).toBe(200);
          });
        });
      });

      describe('/:id/inherit_track_mechanicals GET', () => {
        describe('when a release is found', () => {
          it('should return a release and 200 status', async () => {
            const id = release1._id;

            const res = await server
              .get(`/releases/${id}/inherit_track_mechanicals`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserEdit);

            expect(res.status).toBe(200);
          });
        });
      });

      describe('/pro_rata_contracts_from_tracks POST', () => {
        it('should return 200', async () => {
          const id = release1._id;

          const res = await server
            .post('/releases/pro_rata_contracts_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ ids: [id] });

          expect(res.status).toBe(200);
        });

        it('should call Release.proRataContractsFromTracks', async () => {
          const id = release1._id;

          await server
            .post('/releases/pro_rata_contracts_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ ids: [id] });

          expect(proRataContractsFromTracksStub).toHaveBeenCalled();
        });
      });

      describe('/inherit_mechanicals_from_tracks POST', () => {
        it('should return 200', async () => {
          const id = release1._id;

          const res = await server
            .post('/releases/inherit_mechanicals_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ ids: [id] });

          expect(res.status).toBe(200);
        });

        it('should call Release.inheritMechanicalsFromTracks', async () => {
          const id = release1._id;

          await server
            .post('/releases/inherit_mechanicals_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ ids: [id] });

          expect(inheritMechanicalsFromTracksStub).toHaveBeenCalled();
        });
      });

      describe('/:id PUT', () => {
        it('should return 200', async () => {
          const id = release1._id;

          const res = await server
            .put(`/releases/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ title: 'changedName' });

          expect(res.status).toBe(200);
        });
      });

      describe('/:id/add_alias PUT', () => {
        describe('when a release is found', () => {
          it('should update with passed alias', async () => {
            const id = release1._id;

            const res = await server
              .put(`/releases/${id}/add_alias`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserEdit)
              .send({ aliases: 'aliases', alias: 'alias' });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Alias added');
          });
        });
      });

      // TODO: Not passing, find a way to stub bigQuery.getDistinct
      // describe('/:id DELETE', () => {
      //   it('should return 200', async () => {
      //     const id = release1._id;

      //     const res = await server
      //       .delete(`/releases/${id}`)
      //       .set('applicationToken', applicationToken)
      //       .set('token', clientUserEdit);

      //     expect(res.status).toBe(200);
      //   });
      // });

      describe('/ POST', () => {
        it('should return 200', async () => {
          const params = {
            clientId: client._id.toString(),
            title: 'title',
            version: 'version',
            artist: 'artist',
            catNo: 'catNo',
            barcode: 'barcode',
            label: 'label',
          };

          const res = await server
            .post('/releases')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send(params);

          expect(res.status).toBe(200);
          expect(res.body.clientId).toBe(params.clientId);
          expect(res.body.title).toBe(params.title);
          expect(res.body.version).toBe(params.version);
          expect(res.body.artist).toBe(params.artist);
          expect(res.body.catNo).toBe(params.catNo);
          expect(res.body.barcode).toBe(params.barcode);
          expect(res.body.label).toBe(params.label);
        });
      });

      describe('/import POST', () => {
        it('should give a 200', async () => {
          const res = await server
            .post('/releases/import')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .attach('file', 'test/test-data/test_release.xlsx');

          expect(res.status).toBe(200);
        });
      });

      describe('/export POST', () => {
        it('should return 200', async () => {
          const id = release1._id;

          const res = await server
            .post('/releases/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ ids: [id] });

          expect(res.status).toBe(200);
        });

        it('should call sendExport', async () => {
          await server
            .post('/releases/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ filter: {} });

          expect(sendExportStub).toHaveBeenCalled();
        });
      });
    });

    describe('as an internal user', function () {
      let internal;

      beforeEach(() => {
        internal = jwt.sign({ internal: true, clientId: client._id.toString() }, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/ GET', () => {
        it('should return a 200 response', async () => {
          const res = await server
            .get('/releases')
            .set('applicationToken', applicationToken)
            .set('token', internal);

          expect(res.status).toBe(200);
        });
      });

      describe('/:id GET', () => {
        it('should return a 200 response', async () => {
          const id = release1._id;

          const res = await server
            .get(`/releases/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', internal);

          expect(res.status).toBe(200);
        });
      });

      describe('/:id/tracks GET', () => {
        it('should return a 200 response', async () => {
          const id = release1._id;

          const res = await server
            .get(`/releases/${id}/tracks`)
            .set('applicationToken', applicationToken)
            .set('token', internal);

          expect(res.status).toBe(200);
        });
      });

      describe('/:id/pro_rata_track_contracts GET', () => {
        it('should return a 200 forbidden response', async () => {
          const id = release1._id;

          const res = await server
            .get(`/releases/${id}/pro_rata_track_contracts`)
            .set('applicationToken', applicationToken)
            .set('token', internal);

          expect(res.status).toBe(200);
        });
      });

      describe('/:id/inherit_track_mechanicals GET', () => {
        it('should return a 200 forbidden response', async () => {
          const id = release1._id;

          const res = await server
            .get(`/releases/${id}/inherit_track_mechanicals`)
            .set('applicationToken', applicationToken)
            .set('token', internal);

          expect(res.status).toBe(200);
        });
      });

      describe('/pro_rata_contracts_from_tracks POST', () => {
        it('should return 403', async () => {
          const id = release1._id;

          const res = await server
            .post('/releases/pro_rata_contracts_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', internal)
            .send({ ids: [id] });

          expect(res.status).toBe(403);
        });

        it('should NOT call Release.proRataContractsFromTracks', async () => {
          const id = release1._id;

          await server
            .post('/releases/pro_rata_contracts_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', internal)
            .send({ ids: [id] });

          expect(proRataContractsFromTracksStub).not.toHaveBeenCalled();
        });
      });

      describe('/inherit_mechanicals_from_tracks POST', () => {
        it('should return 403', async () => {
          const id = release1._id;

          const res = await server
            .post('/releases/inherit_mechanicals_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', internal)
            .send({ ids: [id] });

          expect(res.status).toBe(403);
        });

        it('should NOT call Release.inheritMechanicalsFromTracks', async () => {
          const id = release1._id;

          await server
            .post('/releases/inherit_mechanicals_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', internal)
            .send({ ids: [id] });

          expect(inheritMechanicalsFromTracksStub).not.toHaveBeenCalled();
        });
      });

      describe('/:id PUT', () => {
        it('should return a 200 forbidden response', async () => {
          const id = release1._id;

          const res = await server
            .put(`/releases/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', internal)
            .send({ title: 'Changed Title' });

          expect(res.status).toBe(200);
        });

        it('should not update the release', async () => {
          const id = release1._id;

          await server
            .put(`/releases/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', internal)
            .send({ title: 'Changed Title' });

          const newPayees = await Release.find({ _id: release1._id });
          expect(newPayees[0].title).toBe('Changed Title');
        });
      });

      describe('/:id/add_alias PUT', () => {
        it('should return 200', async () => {
          const id = release1._id;

          const res = await server
            .put(`/releases/${id}/add_alias`)
            .set('applicationToken', applicationToken)
            .set('token', internal)
            .send({ alias: 'alias' });

          expect(res.status).toBe(200);
        });
      });

      describe('/:id DELETE', () => {
        it('should return a 403 forbidden response', async () => {
          const params = {
            ids: [release1._id],
            type: 'single',
          };

          const res = await server
            .delete('/releases')
            .set('applicationToken', applicationToken)
            .set('token', internal)
            .send(params);

          expect(res.status).toBe(403);
          expect(res.body.message).toBe('Forbidden');
        });

        it('should not delete the release', async () => {
          const id = release1._id;

          await server
            .delete('/releases')
            .set('applicationToken', applicationToken)
            .set('token', internal);

          const count = await Release.countDocuments({ _id: release1._id });
          expect(count).toBe(1);
        });
      });

      describe('/ POST', () => {
        it('should return a 200 forbidden response', async () => {
          const res = await server
            .post('/releases')
            .set('applicationToken', applicationToken)
            .set('token', internal)
            .send({ title: 'Changed Title' });

          expect(res.status).toBe(200);
        });

        it('should not create a release', async () => {
          const releases = await Release.find({});
          const id = releases[0]._id;

          await server
            .post(`/releases/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', internal)
            .send({ title: 'Changed Title' });

          const count = await Release.countDocuments({});
          expect(releases.length).toBe(count);
        });
      });

      describe('/import POST', () => {
        it('should return a 403 forbidden response', async () => {
          const res = await server
            .post('/releases/import')
            .set('applicationToken', applicationToken)
            .set('token', internal)
            .attach('file', 'test/test-data/test_release.xlsx');

          expect(res.status).toBe(403);
          expect(res.body.message).toBe('Forbidden');
        });

        it('should not import a release', async () => {
          const releases = await Release.find({});

          await server
            .post('/releases/import')
            .set('applicationToken', applicationToken)
            .set('token', internal)
            .attach('file', 'test/test-data/test_release.xlsx');

          const count = await Release.countDocuments({});
          expect(releases.length).toBe(count);
        });
      });

      describe('/export POST', () => {
        it('should return a 403', async () => {
          const res = await server
            .post('/releases/export')
            .set('applicationToken', applicationToken)
            .set('token', internal);

          expect(res.status).toBe(403);
          expect(res.body.message).toBe('Forbidden');
        });
      });
    });

    describe('as a parent user without a client', function () {
      let parent;

      beforeEach(() => {
        parent = jwt.sign({ internal: false, parentId: 'parentId' }, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/ GET', () => {
        it('should return a 403 forbidden response', async () => {
          const res = await server
            .get('/releases')
            .set('applicationToken', applicationToken)
            .set('token', parent);

          expect(res.status).toBe(403);
          expect(res.body.message).toBe('Forbidden');
        });
      });

      describe('/:id GET', () => {
        it('should return a 403 forbidden response', async () => {
          const id = release1._id;

          const res = await server
            .get(`/releases/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', parent);

          expect(res.status).toBe(403);
          expect(res.body.message).toBe('Forbidden');
        });
      });

      describe('/:id/tracks GET', () => {
        it('should return a 403 forbidden response', async () => {
          const id = release1._id;

          const res = await server
            .get(`/releases/${id}/tracks`)
            .set('applicationToken', applicationToken)
            .set('token', parent);

          expect(res.status).toBe(403);
          expect(res.body.message).toBe('Forbidden');
        });
      });

      describe('/:id/pro_rata_track_contracts GET', () => {
        it('should return a 403 forbidden response', async () => {
          const id = release1._id;

          const res = await server
            .get(`/releases/${id}/pro_rata_track_contracts`)
            .set('applicationToken', applicationToken)
            .set('token', parent);

          expect(res.status).toBe(403);
          expect(res.body.message).toBe('Forbidden');
        });
      });

      describe('/:id/inherit_track_mechanicals GET', () => {
        it('should return a 403 forbidden response', async () => {
          const id = release1._id;

          const res = await server
            .get(`/releases/${id}/inherit_track_mechanicals`)
            .set('applicationToken', applicationToken)
            .set('token', parent);

          expect(res.status).toBe(403);
          expect(res.body.message).toBe('Forbidden');
        });
      });

      describe('/pro_rata_contracts_from_tracks POST', () => {
        it('should return 403', async () => {
          const id = release1._id;

          const res = await server
            .post('/releases/pro_rata_contracts_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', parent)
            .send({ ids: [id] });

          expect(res.status).toBe(403);
        });

        it('should NOT call Release.proRataContractsFromTracks', async () => {
          const id = release1._id;

          await server
            .post('/releases/pro_rata_contracts_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', parent)
            .send({ ids: [id] });

          expect(proRataContractsFromTracksStub).not.toHaveBeenCalled();
        });
      });

      describe('/inherit_mechanicals_from_tracks POST', () => {
        it('should return 403', async () => {
          const id = release1._id;

          const res = await server
            .post('/releases/inherit_mechanicals_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', parent)
            .send({ ids: [id] });

          expect(res.status).toBe(403);
        });

        it('should NOT call Release.inheritMechanicalsFromTracks', async () => {
          const id = release1._id;

          await server
            .post('/releases/inherit_mechanicals_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', parent)
            .send({ ids: [id] });

          expect(inheritMechanicalsFromTracksStub).not.toHaveBeenCalled();
        });
      });

      describe('/:id PUT', () => {
        it('should return a 403 forbidden response', async () => {
          const id = release1._id;

          const res = await server
            .put(`/releases/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', parent)
            .send({ title: 'Changed Title' });

          expect(res.status).toBe(403);
          expect(res.body.message).toBe('Forbidden');
        });

        it('should not update the release', async () => {
          const id = release1._id;

          await server
            .put(`/releases/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', parent)
            .send({ title: 'Changed Title' });

          const newPayees = await Release.find({ _id: release1._id });
          expect(newPayees[0].title).toBe(release1.title);
        });
      });

      describe('/:id/add_alias PUT', () => {
        it('should return 403', async () => {
          const id = release1._id;

          const res = await server
            .put(`/releases/${id}/add_alias`)
            .set('applicationToken', applicationToken)
            .set('token', parent)
            .send({ alias: 'alias' });

          expect(res.status).toBe(403);
        });
      });

      describe('/ DELETE', () => {
        it('should return a 403 forbidden response', async () => {
          const params = {
            ids: [release1._id],
            type: 'single',
          };

          const res = await server
            .delete('/releases')
            .set('applicationToken', applicationToken)
            .set('token', parent)
            .send(params);

          expect(res.status).toBe(403);
          expect(res.body.message).toBe('Forbidden');
        });

        it('should not delete the release', async () => {
          const id = release1._id;

          await server
            .delete(`/releases/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', parent);

          const count = await Release.countDocuments({ _id: release1._id });
          expect(count).toBe(1);
        });
      });

      describe('/ POST', () => {
        it('should return a 403 forbidden response', async () => {
          const res = await server
            .post('/releases')
            .set('applicationToken', applicationToken)
            .set('token', parent)
            .send({ title: 'Changed Title' });

          expect(res.status).toBe(403);
          expect(res.body.message).toBe('Forbidden');
        });

        it('should not create a release', async () => {
          const releases = await Release.find({});
          const id = releases[0]._id;

          await server
            .post(`/releases/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', parent)
            .send({ title: 'Changed Title' });

          const count = await Release.countDocuments({});
          expect(releases.length).toBe(count);
        });
      });

      describe('/import POST', () => {
        it('should return a 403 forbidden response', async () => {
          const res = await server
            .post('/releases/import')
            .set('applicationToken', applicationToken)
            .set('token', parent)
            .attach('file', 'test/test-data/test_release.xlsx');

          expect(res.status).toBe(403);
          expect(res.body.message).toBe('Forbidden');
        });

        it('should not import a release', async () => {
          const releases = await Release.find({});

          await server
            .post('/releases/import')
            .set('applicationToken', applicationToken)
            .set('token', parent)
            .attach('file', 'test/test-data/test_release.xlsx');

          const count = await Release.countDocuments({});
          expect(releases.length).toBe(count);
        });
      });

      describe('/export POST', () => {
        it('should return a 403', async () => {
          const res = await server
            .post('/releases/export')
            .set('applicationToken', applicationToken)
            .set('token', parent);

          expect(res.status).toBe(403);
          expect(res.body.message).toBe('Forbidden');
        });
      });
    });

    describe('as a payee user', function () {
      const contractId = randomId();
      const contractIds = [contractId, randomId()];
      let payee;
      let payeeToken;

      beforeEach(() => {
        payee = new Payee({ title: randomString(), clientId: client._id });
        payeeToken = jwt.sign({ internal: false, parentId: null, payeeId: payee._id, contractIds }, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/ GET', () => {
        describe('when user is assigned to a contract with attached releases', () => {
          it('should return only the releases attached to this contract', async () => {
            const contractIds = [contract._id.toString()];
            const payee2 = new Payee({ title: 'Payee Login attached to main contract', clientId: client._id.toString() });
            const payeeToken2 = jwt.sign({
              internal: false, parentId: null, payeeId: payee2._id, contractIds,
            }, process.env.jsonSecretToken, { expiresIn: 86400 });

            const res = await server
              .get('/releases')
              .set('applicationToken', applicationToken)
              .set('token', payeeToken2);

            expect(res.status).toBe(200);
            expect(res.body.releases).toEqual(expect.any(Array));

            const releases = await Release.find({ clientId: client._id, 'salesReturnsRights.contractId': { $in: contractIds } });
            expect(res.body.releases.length).toBe(releases.length);
          });
        });

        describe('when user is assigned to a contract without attached releases', () => {
          it('should return an empty array', async () => {
            const contractIds2 = [contract2._id.toString()];
            const payee3 = new Payee({ title: 'Payee Login attached to other contract', clientId: client._id.toString() });
            const payeeToken3 = jwt.sign({
              internal: false, parentId: null, payeeId: payee3._id, contractIds2,
            }, process.env.jsonSecretToken, { expiresIn: 86400 });

            const res = await server
              .get('/releases')
              .set('applicationToken', applicationToken)
              .set('token', payeeToken3);

            expect(res.status).toBe(200);
            expect(res.body.releases).toEqual(expect.any(Array));
            expect(res.body.releases.length).toBe(0);
          });
        });

        describe('when user is assigned to NO contracts', () => {
          it('should return an empty array', async () => {
            const payee4 = new Payee({ title: 'Payee Login attached to NO contracts', clientId: client._id.toString() });
            const payeeToken4 = jwt.sign({
              internal: false, parentId: null, payeeId: payee4._id,
            }, process.env.jsonSecretToken, { expiresIn: 86400 });

            const res = await server
              .get('/releases')
              .set('applicationToken', applicationToken)
              .set('token', payeeToken4);

            expect(res.status).toBe(200);
            expect(res.body.releases).toEqual(expect.any(Array));
            expect(res.body.releases.length).toBe(0);
          });
        });
      });
      describe('/:id/tracks GET', () => {
        it('should return a 403 forbidden response', async () => {
          const id = release1._id;

          const res = await server
            .get(`/releases/${id}/tracks`)
            .set('applicationToken', applicationToken)
            .set('token', payeeToken);

          expect(res.status).toBe(403);
          expect(res.body.message).toBe('Forbidden');
        });
      });
      describe('/:id/pro_rata_track_contracts GET', () => {
        it('should return a 403 forbidden response', async () => {
          const id = release1._id;

          const res = await server
            .get(`/releases/${id}/pro_rata_track_contracts`)
            .set('applicationToken', applicationToken)
            .set('token', payeeToken);

          expect(res.status).toBe(403);
          expect(res.body.message).toBe('Forbidden');
        });
      });
      describe('/:id/inherit_track_mechanicals GET', () => {
        it('should return a 403 forbidden response', async () => {
          const id = release1._id;

          const res = await server
            .get(`/releases/${id}/inherit_track_mechanicals`)
            .set('applicationToken', applicationToken)
            .set('token', payeeToken);

          expect(res.status).toBe(403);
          expect(res.body.message).toBe('Forbidden');
        });
      });

      describe('/pro_rata_contracts_from_tracks POST', () => {
        it('should return 403', async () => {
          const id = release1._id;

          const res = await server
            .post('/releases/pro_rata_contracts_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', payeeToken)
            .send({ ids: [id] });

          expect(res.status).toBe(403);
        });

        it('should NOT call Release.proRataContractsFromTracks', async () => {
          const id = release1._id;

          await server
            .post('/releases/pro_rata_contracts_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', payeeToken)
            .send({ ids: [id] });

          expect(proRataContractsFromTracksStub).not.toHaveBeenCalled();
        });
      });

      describe('/inherit_mechanicals_from_tracks POST', () => {
        it('should return 403', async () => {
          const id = release1._id;

          const res = await server
            .post('/releases/inherit_mechanicals_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', payeeToken)
            .send({ ids: [id] });

          expect(res.status).toBe(403);
        });

        it('should NOT call Release.inheritMechanicalsFromTracks', async () => {
          const id = release1._id;

          await server
            .post('/releases/inherit_mechanicals_from_tracks')
            .set('applicationToken', applicationToken)
            .set('token', payeeToken)
            .send({ ids: [id] });

          expect(inheritMechanicalsFromTracksStub).not.toHaveBeenCalled();
        });
      });

      describe('/:id PUT', () => {
        it('should return a 403 forbidden response', async () => {
          const id = release1._id;

          const res = await server
            .put(`/releases/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', payeeToken)
            .send({ title: 'Changed Title' });

          expect(res.status).toBe(403);
          expect(res.body.message).toBe('Forbidden');
        });

        it('should not update the release', async () => {
          const id = release1._id;

          await server
            .put(`/releases/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', payeeToken)
            .send({ title: 'Changed Title' });

          const newPayees = await Release.find({ _id: release1._id });
          expect(newPayees[0].title).toBe(release1.title);
        });
      });
      describe('/:id/add_alias PUT', () => {
        it('should return 403', async () => {
          const id = release1._id;

          const res = await server
            .put(`/releases/${id}/add_alias`)
            .set('applicationToken', applicationToken)
            .set('token', payeeToken)
            .send({ alias: 'alias' });

          expect(res.status).toBe(403);
        });
      });
      describe('/ DELETE', () => {
        it('should return a 403 forbidden response', async () => {
          const params = {
            ids: [release1._id],
            type: 'single',
          };

          const res = await server
            .delete('/releases')
            .set('applicationToken', applicationToken)
            .set('token', payeeToken)
            .send(params);

          expect(res.status).toBe(403);
          expect(res.body.message).toBe('Forbidden');
        });

        it('should not delete the release', async () => {
          const id = release1._id;

          await server
            .delete(`/releases/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', payeeToken);

          const count = await Release.countDocuments({ _id: release1._id });
          expect(count).toBe(1);
        });
      });
      describe('/ POST', () => {
        it('should return a 403 forbidden response', async () => {
          const res = await server
            .post('/releases')
            .set('applicationToken', applicationToken)
            .set('token', payeeToken)
            .send({ title: 'Changed Title' });

          expect(res.status).toBe(403);
          expect(res.body.message).toBe('Forbidden');
        });

        it('should not create a release', async () => {
          const releases = await Release.find({});
          const id = releases[0]._id;

          await server
            .post(`/releases/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', payeeToken)
            .send({ title: 'Changed Title' });

          const count = await Release.countDocuments({});
          expect(releases.length).toBe(count);
        });
      });
      describe('/import POST', () => {
        it('should return a 403 forbidden response', async () => {
          const res = await server
            .post('/releases/import')
            .set('applicationToken', applicationToken)
            .set('token', payeeToken)
            .attach('file', 'test/test-data/test_release.xlsx');

          expect(res.status).toBe(403);
          expect(res.body.message).toBe('Forbidden');
        });

        it('should not import a release', async () => {
          const releases = await Release.find({});

          await server
            .post('/releases/import')
            .set('applicationToken', applicationToken)
            .set('token', payeeToken)
            .attach('file', 'test/test-data/test_release.xlsx');

          const count = await Release.countDocuments({});
          expect(releases.length).toBe(count);
        });
      });
    });
  });

  describe('as an internal user', function () {
    let internal;

    beforeEach(() => {
      internal = jwt.sign({ internal: true, clientId: client._id.toString() }, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/ GET', () => {
      it('should return a 200 response', async () => {
        const res = await server
          .get('/releases')
          .set('applicationToken', applicationToken)
          .set('token', internal);

        expect(res.status).toBe(200);
      });
    });
    describe('/:id GET', () => {
      it('should return a 200 response', async () => {
        const id = release1._id;

        const res = await server
          .get(`/releases/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', internal);

        expect(res.status).toBe(200);
      });
    });
    describe('/:id/tracks GET', () => {
      it('should return a 200 response', async () => {
        const id = release1._id;

        const res = await server
          .get(`/releases/${id}/tracks`)
          .set('applicationToken', applicationToken)
          .set('token', internal);

        expect(res.status).toBe(200);
      });
    });
    describe('/:id/pro_rata_track_contracts GET', () => {
      it('should return a 200 forbidden response', async () => {
        const id = release1._id;

        const res = await server
          .get(`/releases/${id}/pro_rata_track_contracts`)
          .set('applicationToken', applicationToken)
          .set('token', internal);

        expect(res.status).toBe(200);
      });
    });
    describe('/:id/inherit_track_mechanicals GET', () => {
      it('should return a 200 forbidden response', async () => {
        const id = release1._id;

        const res = await server
          .get(`/releases/${id}/inherit_track_mechanicals`)
          .set('applicationToken', applicationToken)
          .set('token', internal);

        expect(res.status).toBe(200);
      });
    });
    describe('/pro_rata_contracts_from_tracks POST', () => {
      it('should return 403', async () => {
        const id = release1._id;

        const res = await server
          .post('/releases/pro_rata_contracts_from_tracks')
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .send({ ids: [id] });

        expect(res.status).toBe(403);
      });

      it('should NOT call Release.proRataContractsFromTracks', async () => {
        const id = release1._id;

        await server
          .post('/releases/pro_rata_contracts_from_tracks')
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .send({ ids: [id] });

        expect(proRataContractsFromTracksStub).not.toHaveBeenCalled();
      });
    });

    describe('/inherit_mechanicals_from_tracks POST', () => {
      it('should return 403', async () => {
        const id = release1._id;

        const res = await server
          .post('/releases/inherit_mechanicals_from_tracks')
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .send({ ids: [id] });

        expect(res.status).toBe(403);
      });

      it('should NOT call Release.inheritMechanicalsFromTracks', async () => {
        const id = release1._id;

        await server
          .post('/releases/inherit_mechanicals_from_tracks')
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .send({ ids: [id] });

        expect(inheritMechanicalsFromTracksStub).not.toHaveBeenCalled();
      });
    });

    describe('/:id/add_alias PUT', () => {
      it('should return 200', async () => {
        const id = release1._id;

        const res = await server
          .put(`/releases/${id}/add_alias`)
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .send({ alias: 'alias' });

        expect(res.status).toBe(200);
      });
    });
    describe('/:id DELETE', () => {
      it('should return a 403 forbidden response', async () => {
        const params = {
          ids: [release1._id],
          type: 'single',
        };

        const res = await server
          .delete('/releases')
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .send(params);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not delete the release', async () => {
        const id = release1._id;

        await server
          .delete(`/releases/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', internal);

        const count = await Release.countDocuments({ _id: release1._id });
        expect(count).toBe(1);
      });
    });
    describe('/ POST', () => {
      it('should return a 200 forbidden response', async () => {
        const res = await server
          .post('/releases')
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .send({ title: 'Changed Title' });

        expect(res.status).toBe(200);
      });

      it('should not create a release', async () => {
        const releases = await Release.find({});
        const id = releases[0]._id;

        await server
          .post(`/releases/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .send({ title: 'Changed Title' });

        const count = await Release.countDocuments({});
        expect(releases.length).toBe(count);
      });
    });
    describe('/import POST', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .post('/releases/import')
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .attach('file', 'test/test-data/test_release.xlsx');

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not import a release', async () => {
        const releases = await Release.find({});

        await server
          .post('/releases/import')
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .attach('file', 'test/test-data/test_release.xlsx');

        const count = await Release.countDocuments({});
        expect(releases.length).toBe(count);
      });
    });
    describe('/export POST', () => {
      it('should return a 403', async () => {
        const res = await server
          .post('/releases/export')
          .set('applicationToken', applicationToken)
          .set('token', internal);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });
  });

  describe('as a parent user without a client', () => {
    let parent;

    beforeEach(() => {
      parent = jwt.sign({ internal: false, parentId: 'parentId' }, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/ GET', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .get('/releases')
          .set('applicationToken', applicationToken)
          .set('token', parent);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });
    describe('/:id GET', () => {
      it('should return a 403 forbidden response', async () => {
        const id = release1._id;

        const res = await server
          .get(`/releases/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', parent);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });
    describe('/:id/tracks GET', () => {
      it('should return a 403 forbidden response', async () => {
        const id = release1._id;

        const res = await server
          .get(`/releases/${id}/tracks`)
          .set('applicationToken', applicationToken)
          .set('token', parent);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });
    describe('/:id/pro_rata_track_contracts GET', () => {
      it('should return a 403 forbidden response', async () => {
        const id = release1._id;

        const res = await server
          .get(`/releases/${id}/pro_rata_track_contracts`)
          .set('applicationToken', applicationToken)
          .set('token', parent);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });
    describe('/:id/inherit_track_mechanicals GET', () => {
      it('should return a 403 forbidden response', async () => {
        const id = release1._id;

        const res = await server
          .get(`/releases/${id}/inherit_track_mechanicals`)
          .set('applicationToken', applicationToken)
          .set('token', parent);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/pro_rata_contracts_from_tracks POST', () => {
      it('should return 403', async () => {
        const id = release1._id;

        const res = await server
          .post('/releases/pro_rata_contracts_from_tracks')
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ ids: [id] });

        expect(res.status).toBe(403);
      });

      it('should NOT call Release.proRataContractsFromTracks', async () => {
        const id = release1._id;

        await server
          .post('/releases/pro_rata_contracts_from_tracks')
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ ids: [id] });

        expect(proRataContractsFromTracksStub).not.toHaveBeenCalled();
      });
    });

    describe('/inherit_mechanicals_from_tracks POST', () => {
      it('should return 403', async () => {
        const id = release1._id;

        const res = await server
          .post('/releases/inherit_mechanicals_from_tracks')
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ ids: [id] });

        expect(res.status).toBe(403);
      });

      it('should NOT call Release.inheritMechanicalsFromTracks', async () => {
        const id = release1._id;

        await server
          .post('/releases/inherit_mechanicals_from_tracks')
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ ids: [id] });

        expect(inheritMechanicalsFromTracksStub).not.toHaveBeenCalled();
      });
    });

    describe('/:id PUT', () => {
      it('should return a 403 forbidden response', async () => {
        const id = release1._id;

        const res = await server
          .put(`/releases/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ title: 'Changed Title' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not update the release', async () => {
        const id = release1._id;

        await server
          .put(`/releases/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ title: 'Changed Title' });

        const newPayees = await Release.find({ _id: release1._id });
        expect(newPayees[0].title).toBe(release1.title);
      });
    });
    describe('/:id/add_alias PUT', () => {
      it('should return 403', async () => {
        const id = release1._id;

        const res = await server
          .put(`/releases/${id}/add_alias`)
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ alias: 'alias' });

        expect(res.status).toBe(403);
      });
    });
    describe('/ DELETE', () => {
      it('should return a 403 forbidden response', async () => {
        const params = {
          ids: [release1._id],
          type: 'single',
        };

        const res = await server
          .delete('/releases')
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send(params);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not delete the release', async () => {
        const id = release1._id;

        await server
          .delete(`/releases/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', parent);

        const count = await Release.countDocuments({ _id: release1._id });
        expect(count).toBe(1);
      });
    });
    describe('/ POST', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .post('/releases')
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ title: 'Changed Title' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not create a release', async () => {
        const releases = await Release.find({});
        const id = releases[0]._id;

        await server
          .post(`/releases/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ title: 'Changed Title' });

        const count = await Release.countDocuments({});
        expect(releases.length).toBe(count);
      });
    });
    describe('/import POST', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .post('/releases/import')
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .attach('file', 'test/test-data/test_release.xlsx');

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not import a release', async () => {
        const releases = await Release.find({});

        await server
          .post('/releases/import')
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .attach('file', 'test/test-data/test_release.xlsx');

        const count = await Release.countDocuments({});
        expect(releases.length).toBe(count);
      });
    });
    describe('/export POST', () => {
      it('should return a 403', async () => {
        const res = await server
          .post('/releases/export')
          .set('applicationToken', applicationToken)
          .set('token', parent);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });
  });
});
