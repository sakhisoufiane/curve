const { testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

// Mock CSVRawExport for raw-export tests
const mockCSVRawExport = jest.fn();
jest.mock('../../libs/mongodb-export', () => ({
  CSVRawExport: (...args) => mockCSVRawExport(...args),
}));

const config = require('../../config.json');
const User = require('../../models/user');
const Client = require('../../models/client');
const Payee = require('../../models/payee');
const Composer = require('../../models/composer');
const Contract = require('../../models/contract');
const DeliveryProfile = require('../../models/deliveryProfile');
const Work = require('../../models/work');
const Track = require('../../models/track');
const Release = require('../../models/release');
const Publisher = require('../../models/publisher');

const { generateComposers } = require('./test-data/works/generateComposers');
const { worksWithChains } = require('./test-data/works/worksWithChains');

const server = require('../../index');

describe('/composers', () => {
  const applicationToken = config.applicationTokens[0];
  let client; let user; let clientUserToken; let
    email;
  let composer1; let composer2; let
    composer3;
  let composerLinkedToWork;
  let importMechanicalFromExcelSpy; let sendExportSpy;

  beforeEach(async () => {
    // Jest spies for import/export
    importMechanicalFromExcelSpy = jest.spyOn(Composer, 'importMechanicalFromExcel').mockImplementation();
    sendExportSpy = jest.spyOn(Composer, 'sendExport').mockImplementation();

    // unique email per run
    email = `${randomString()}@curve.com`;

    client = new Client({
      name: testUtils.randomString(),
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    });
    user = new User({ email });
    await Promise.all([client.save(), user.save()]);

    composer1 = new Composer({ clientId: client._id, name: randomString(), interestedPartyId: randomString(), cae: `00${randomString(9)}` });
    composer2 = new Composer({ clientId: client._id, name: randomString(), interestedPartyId: randomString() });
    composer3 = new Composer({ clientId: client._id, name: randomString(), interestedPartyId: randomString() });

    composerLinkedToWork = new Composer({
      clientId: client._id,
      name: randomString(),
      interestedPartyId: randomString(),
    });

    [composer1, composer2, composer3] = await Promise.all([
      composer1.save(),
      composer2.save(),
      composer3.save(),
      composerLinkedToWork.save(),
    ]);

    await Work.insertMany([new Work({
      clientId: client._id,
      title: randomString(),
      usedComposerIds: [composerLinkedToWork._id.toString()],
    })]);

    // clientUser token with Edit rights
    const userToken = {
      id: user._id,
      internal: false,
      parentId: null,
      clientId: client._id,
      email,
      rights: {},
    };
    userToken.rights[client._id.toString()] = { catalogue: 'Edit' };
    clientUserToken = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await testUtils.cleanUpAsync(client._id.toString());
  });

  describe('as a client user', () => {
    describe('as a user with full rights', () => {
      describe('/ GET', () => {
        it('should return a list of composers', async () => {
          const res = await request(server)
            .get('/composers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken);

          expect(res.status).toBe(200);
          expect(Array.isArray(res.body.composers)).toBe(true);

          const composersInDb = await Composer.find({ clientId: client._id });
          expect(res.body.composers.length).toBe(composersInDb.length);
        });

        it('should return metadata of composers index on / GET', async () => {
          const res = await request(server)
            .get('/composers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken);

          expect(res.status).toBe(200);
          expect(typeof res.body.meta).toBe('object');
        });

        it('should return the first page if not passed a specific page', async () => {
          const res = await request(server)
            .get('/composers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken);

          expect(res.body.meta.currentPage).toBe(1);
        });

        it('should return the passed page when passed the parameter', async () => {
          const res = await request(server)
            .get('/composers?page=3')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken);

          expect(res.body.meta.currentPage).toBe(3);
        });

        it('should return the pages available', async () => {
          const res = await request(server)
            .get('/composers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken);

          expect(res.body.meta.totalPages).toBe(1);
        });

        it('should set the amount to be returned per page when passed a limit option', async () => {
          const res = await request(server)
            .get('/composers?limit=1')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken);

          expect(res.body.composers.length).toBe(1);
          const count = await Composer.countDocuments({ clientId: client._id });
          expect(res.body.meta.totalPages).toBe(count);
        });

        it('should return composers that match the interestedPartyId text', async () => {
          const res = await request(server)
            .get('/composers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .query({ text: composer1.interestedPartyId });

          expect(res.body.meta.total).toBe(1);
        });

        it('should return composers that match the cae text', async () => {
          const res = await request(server)
            .get('/composers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .query({ text: composer1.cae });

          expect(res.body.meta.total).toBe(1);
        });

        it('should return composers that match part of the cae text', async () => {
          const res = await request(server)
            .get('/composers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .query({ text: composer1.cae.slice(-9) });
          expect(res.body.meta.total).toBe(1);
        });
      });

      describe('/:id GET', () => {
        it('should return a composer and 200 status when found', async () => {
          const composer = await Composer.findOne({ name: composer1.name });
          const res = await request(server)
            .get(`/composers/${composer._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken);

          expect(res.status).toBe(200);
          expect(res.body).toMatchObject({
            _id: composer._id.toString(),
            clientId: composer.clientId.toString(),
            name: composer.name,
            partyNo: composer.partyNo,
          });
        });

        it('should return a 404 status when not found', async () => {
          const fakeId = 'anything';
          const res = await request(server)
            .get(`/composers/${fakeId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken);

          expect(res.status).toBe(404);
          expect(res.body.message).toBe(`Could not find Composer with ID ${fakeId}`);
        });
      });

      describe('/duplicates GET', () => {
        let mainComposer;
        const getRandomIntInclusive = (min, max) => {
          const mn = Math.ceil(min);
          const mx = Math.floor(max);
          return Math.floor(Math.random() * (mx - mn + 1) + mn);
        };

        beforeEach(async () => {
          // mark client as Publisher
          await Client.updateOne({ _id: client._id }, { clientType: 'Publisher' });

          // generate a main with 50 potential duplicates
          const base = {
            clientId: client._id,
            name: 'Has duplicates',
            caeWithoutLeadingZeros: '',
            potentialDuplicates: [],
            interestedPartyId: '342423432342',
          };
          const all = [base, ...generateComposers(client._id, 50)];
          const saved = await Promise.all(all.map((c) => new Composer(c).save()));
          mainComposer = saved[0];
          mainComposer.potentialDuplicates = saved.slice(1).map((c) => ({
            composerId: c._id,
            score: getRandomIntInclusive(13, 15),
          }));
          await mainComposer.save();

          // secondary with 24 potential duplicates
          const secBase = {
            clientId: client._id,
            name: 'Has duplicates secondary',
            caeWithoutLeadingZeros: '',
            potentialDuplicates: [],
            interestedPartyId: '45454545',
          };
          const secSet = [secBase, ...generateComposers(client._id, 24)];
          const savedSec = await Promise.all(secSet.map((c) => new Composer(c).save()));
          const secondary = savedSec[0];
          secondary.potentialDuplicates = savedSec.slice(1).map((c) => ({
            composerId: c._id,
            score: getRandomIntInclusive(13, 15),
          }));
          await secondary.save();
        });

        it('should get the duplicates in the right structure', async () => {
          const res = await request(server)
            .get('/composers/duplicates')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken);

          expect(res.status).toBe(200);
          const [first, second] = res.body.duplicates;

          // first composer
          expect(first.potentialDuplicates).toHaveLength(50);
          expect(first.name).toBe('Has duplicates');
          first.potentialDuplicates.forEach((d) => expect(Object.keys(d)).toEqual(expect.arrayContaining(['composerId', 'score', 'name', 'cae', 'worksCount'])));
          const scores = first.potentialDuplicates.map((d) => d.score);
          expect(scores).toEqual([...scores].sort((a, b) => b - a));

          // secondary
          expect(second.potentialDuplicates).toHaveLength(24);
          expect(second.name).toBe('Has duplicates secondary');
          second.potentialDuplicates.forEach((d) => expect(Object.keys(d)).toEqual(expect.arrayContaining(['composerId', 'score', 'name', 'cae', 'worksCount'])));
          const secScores = second.potentialDuplicates.map((d) => d.score);
          expect(secScores).toEqual([...secScores].sort((a, b) => b - a));
        });

        it('make sure search works correctly using string', async () => {
          const res = await request(server)
            .get('/composers/duplicates')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .query({ search: 'Has duplicates' });

          expect(res.status).toBe(200);
          expect(res.body.duplicates).toHaveLength(2);
          expect(res.body.duplicates[0].name).toBe('Has duplicates');
          expect(res.body.duplicates[1].name).toBe('Has duplicates secondary');
        });

        it('make sure search works correctly using ID', async () => {
          const res = await request(server)
            .get('/composers/duplicates')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .query({ search: mainComposer._id.toString() });

          expect(res.status).toBe(200);
          expect(res.body.duplicates).toHaveLength(1);
          expect(res.body.duplicates[0].name).toBe('Has duplicates');
        });
      });

      // TODO: @o-abb these tests are failing with mongoose' stricter schema validation
      // Contract.status field does not exist on main, which is the cause of this these tests failing.
      describe.skip('/duplicates/merge POST', () => {
        it('should error if validation checks fail', async () => {
          const res = await request(server)
            .post('/composers/duplicates/merge')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .send({});

          expect(res.status).toBe(400);
          expect(res.body.errors).toContain('Please provide a valid primary composer ID');
        });

        describe('Merge composers', () => {
          let composers; let contract1; let
            contract2;

          beforeEach(async () => {
            await Client.updateOne({ _id: client._id }, { clientType: 'Publisher' });
            [contract1, contract2] = await Promise.all([
              new Contract({ clientId: client._id, name: testUtils.randomString(), status: 'Expired' }).save(),
              new Contract({ clientId: client._id, name: testUtils.randomString(), status: 'Expired' }).save(),
            ]);

            composers = await Promise.all(
              generateComposers(client._id).map((c) => new Composer(c).save()),
            );
          });

          it('should error if an invalid contract ID is provided', async () => {
            const [primary] = composers;
            const payload = {
              primaryComposerId: primary._id,
              data: {
                name: 'Overwritten name',
                cae: 'cae12345',
                linkedContracts: [
                  { contractId: testUtils.randomId() },
                  { contractId: contract2._id.toString() },
                ],
              },
            };

            const res = await request(server)
              .post('/composers/duplicates/merge')
              .set('applicationToken', applicationToken)
              .set('token', clientUserToken)
              .send(payload);

            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Invalid contracts found');
          });

          it('should error if an invalid composer ID is provided for deletion', async () => {
            const [primary] = composers;
            const payload = {
              primaryComposerId: primary._id,
              deleteComposerIds: [testUtils.randomId()],
              data: { name: 'Overwritten name', cae: 'cae12345' },
            };

            const res = await request(server)
              .post('/composers/duplicates/merge')
              .set('applicationToken', applicationToken)
              .set('token', clientUserToken)
              .send(payload);

            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Invalid composer ids found for deletion');
          });

          it('should merge update the values of the primary composer using the data provided and set blacklist', async () => {
            const [primary, ...rest] = composers;
            primary.potentialDuplicates = [{ composerId: rest[0]._id, score: 14 }];
            await primary.save();

            const data = {
              primaryComposerId: primary._id,
              blacklistedDuplicateIds: [primary.potentialDuplicates[0].composerId.toString()],
              data: {
                name: 'Overwritten name',
                cae: 'cae12345',
                linkedContracts: [
                  { contractId: contract1._id.toString() },
                  { contractId: contract2._id.toString() },
                ],
                firstName: testUtils.randomString(),
                middleNames: testUtils.randomString(),
                surname: testUtils.randomString(),
                foreignId: testUtils.randomString(),
                mainPro: testUtils.randomString(),
                mechanicalPro: testUtils.randomString(),
                performancePro: testUtils.randomString(),
                syncPro: testUtils.randomString(),
                mainProIdentifier: testUtils.randomString(),
                mechanicalProIdentifier: testUtils.randomString(),
                performanceProIdentifier: testUtils.randomString(),
                syncProIdentifier: testUtils.randomString(),
                societies: [{
                  society: 'PRS',
                  identifier: '12345',
                  mechanicalPro: 'PRS',
                  performancePro: 'ASCAP',
                  syncPro: 'PRS',
                }],
                publisherAgreements: [{
                  publisherId: '617fbcdda275de001dbdbbb5',
                  agreementType: 'Original General',
                  territory: 'WW',
                  society: 'PRS',
                  agreementNo: '1',
                }],
              },
            };

            const res = await request(server)
              .post('/composers/duplicates/merge')
              .set('applicationToken', applicationToken)
              .set('token', clientUserToken)
              .send(data);

            expect(res.status).toBe(200);

            const updated = await Composer.findById(primary._id);
            expect(updated.blacklistedDuplicateIds).toContain(data.blacklistedDuplicateIds[0]);
            expect(updated.potentialDuplicates).toHaveLength(0);
            expect(updated.name).toBe(data.data.name);
            expect(updated.cae).toBe(data.data.cae);
            expect(updated.linkedContracts).toEqual(data.data.linkedContracts);
            expect(updated.firstName).toBe(data.data.firstName);
            expect(updated.middleNames).toBe(data.data.middleNames);
            expect(updated.surname).toBe(data.data.surname);
            expect(updated.foreignId).toBe(data.data.foreignId);
            expect(updated.mainPro).toBe(data.data.mainPro);
            expect(updated.mechanicalPro).toBe(data.data.mechanicalPro);
            expect(updated.performancePro).toBe(data.data.performancePro);
            expect(updated.syncPro).toBe(data.data.syncPro);
            expect(updated.mainProIdentifier).toBe(data.data.mainProIdentifier);
            expect(updated.mechanicalProIdentifier).toBe(data.data.mechanicalProIdentifier);
            expect(updated.performanceProIdentifier).toBe(data.data.performanceProIdentifier);
            expect(updated.syncProIdentifier).toBe(data.data.syncProIdentifier);
            expect(updated.societies).toEqual(data.data.societies);
            expect(updated.publisherAgreements).toEqual(data.data.publisherAgreements);
          });

          describe('Merge and delete', () => {
            let primary; let composerToDelete1; let
              composerToDelete2;
            let contract1; let
              contract2;
            let deliveryProfile1; let
              deliveryProfile2;
            let work1; let track1; let track2; let release1; let release2; let
              publisher1;

            beforeEach(async () => {
              [primary, composerToDelete1, composerToDelete2] = composers;
              publisher1 = await new Publisher({
                clientId: client._id,
                name: testUtils.randomString(),
                interestedPartyId: testUtils.randomString(),
                cae: testUtils.randomString(),
              }).save();

              [deliveryProfile1, deliveryProfile2] = await Promise.all([
                new DeliveryProfile({
                  clientId: client._id.toString(),
                  name: 'Delivery Profile 1',
                  composerIds: [composerToDelete1._id.toString()],
                }).save(),
                new DeliveryProfile({
                  clientId: client._id.toString(),
                  name: 'Delivery Profile 2',
                  composerIds: [composerToDelete2._id.toString()],
                }).save(),
              ]);

              work1 = new Work(worksWithChains(client._id.toString(), composerToDelete1, publisher1));
              await work1.save();

              contract1 = await Contract.findOne({ clientId: client._id, status: 'Expired' });
              contract2 = await Promise.resolve(); // left blank because generated above

              track1 = await new Track({
                clientId: client._id,
                title: 'Track 1',
                isrc: 'ISRC-Track-1',
                mechanicalLicenses: [{
                  composerId: composerToDelete1._id.toString(),
                  share: 100,
                  rate: 100,
                  contractId: contract1._id.toString(),
                }],
              }).save();

              track2 = await new Track({
                clientId: client._id,
                title: 'Track 2',
                isrc: 'ISRC-Track-2',
                mechanicalLicenses: [{
                  composerId: composerToDelete2._id.toString(),
                  share: 100,
                  rate: 100,
                  contractId: contract2?._id?.toString() || contract1._id.toString(),
                }],
              }).save();

              release1 = await new Release({
                clientId: client._id,
                title: 'Release 1',
                trackIds: [track1._id.toString()],
                catNo: '1',
                mechanicalLicenses: {
                  [track1._id.toString()]: {
                    reportMechanicals: true,
                    licenses: [{
                      rate: 100,
                      share: 100,
                      composerId: composerToDelete1._id.toString(),
                      contractId: contract1._id.toString(),
                    }],
                  },
                },
              }).save();

              release2 = await new Release({
                clientId: client._id,
                title: 'Release 2',
                trackIds: [track2._id.toString()],
                catNo: '2',
                mechanicalLicenses: {
                  [track2._id.toString()]: {
                    reportMechanicals: true,
                    licenses: [{
                      rate: 100,
                      share: 100,
                      composerId: composerToDelete2._id.toString(),
                      contractId: contract2?._id?.toString() || contract1._id.toString(),
                    }],
                  },
                },
              }).save();
            });

            it('should delete the composers when deleteComposerIds is set', async () => {
              primary.potentialDuplicates = [
                { composerId: composerToDelete1._id, score: 13 },
                { composerId: composerToDelete2._id, score: 13 },
              ];
              await primary.save();

              const payload = {
                primaryComposerId: primary._id,
                deleteComposerIds: [
                  composerToDelete1._id.toString(),
                  composerToDelete2._id.toString(),
                ],
                data: {
                  name: 'Overwritten name',
                  cae: 'cae12345',
                  linkedContractIds: [
                    contract1._id.toString(),
                    (contract2?._id?.toString() || contract1._id.toString()),
                  ],
                },
              };

              const res = await request(server)
                .post('/composers/duplicates/merge')
                .set('applicationToken', applicationToken)
                .set('token', clientUserToken)
                .send(payload);

              expect(res.status).toBe(200);

              const updatedPrimary = await Composer.findById(primary._id);
              expect(updatedPrimary.potentialDuplicates).toHaveLength(0);
              expect(updatedPrimary.potentialDuplicatesCount).toBe(0);

              const updatedProfiles = await DeliveryProfile.find({
                clientId: client._id.toString(),
                _id: { $in: [deliveryProfile1._id, deliveryProfile2._id] },
              });
              updatedProfiles.forEach((dp) => expect(dp.composerIds).toContain(primary._id.toString()));

              const updatedWork = await Work.findOne({
                clientId: client._id.toString(),
                usedComposerIds: primary._id.toString(),
              });
              expect(updatedWork).not.toBeNull();
              expect(updatedWork.rightsChain).toEqual(
                worksWithChains(client._id.toString(), updatedPrimary, publisher1).rightsChain,
              );

              const updatedTracks = await Track.find({
                clientId: client._id.toString(),
                _id: { $in: [track1._id, track2._id] },
              });
              updatedTracks.forEach((t) => expect(t.mechanicalLicenses.every((lic) => lic.composerId === primary._id.toString())).toBe(true));

              const updatedReleases = await Release.find({
                clientId: client._id.toString(),
                _id: { $in: [release1._id, release2._id] },
              });
              updatedReleases.forEach((rel, i) => {
                const tid = i === 0 ? track1._id.toString() : track2._id.toString();
                expect(rel.mechanicalComposerIds).toContain(primary._id.toString());
                expect(rel.mechanicalLicenses[tid].licenses.every((lic) => lic.composerId === primary._id.toString())).toBe(true);
              });

              const deletedCount = await Composer.countDocuments({
                clientId: client._id,
                _id: { $in: [composerToDelete1._id, composerToDelete2._id] },
              });
              expect(deletedCount).toBe(0);
            });
          });

          describe('Merge and delete test for new validation', () => {
            let primary; let composerToDelete1; let
              composerToDelete2;

            beforeEach(() => {
              [primary, composerToDelete1, composerToDelete2] = composers;
            });

            it('should delete the composers when setting the primary composer that has an empty cae', async () => {
              primary.cae = '00000000000';
              primary.caeWithoutLeadingZeros = '';
              await primary.save();

              composerToDelete1.cae = testUtils.randomString();
              await composerToDelete1.save();

              const payload = {
                primaryComposerId: primary._id,
                deleteComposerIds: [
                  composerToDelete1._id.toString(),
                  composerToDelete2._id.toString(),
                ],
                data: {
                  name: 'Overwritten name',
                  cae: composerToDelete1.cae,
                },
              };

              const res = await request(server)
                .post('/composers/duplicates/merge')
                .set('applicationToken', applicationToken)
                .set('token', clientUserToken)
                .send(payload);

              expect(res.status).toBe(200);

              const deletedCount = await Composer.countDocuments({
                clientId: client._id,
                _id: { $in: [composerToDelete1._id, composerToDelete2._id] },
              });
              expect(deletedCount).toBe(0);
            });
          });
        });
      });

      describe('/duplicates/overview POST', () => {
        let composers; let contract1; let contract2; let publisher1; let
          publisher2;

        beforeEach(async () => {
          [contract1, contract2] = await Promise.all([
            new Contract({ clientId: client._id, name: testUtils.randomString() }).save(),
            new Contract({ clientId: client._id, name: testUtils.randomString() }).save(),
          ]);

          [publisher1, publisher2] = await Promise.all([
            new Publisher({
              clientId: client._id,
              name: testUtils.randomString(),
              interestedPartyId: testUtils.randomString(),
            }).save(),
            new Publisher({
              clientId: client._id,
              name: testUtils.randomString(),
              interestedPartyId: testUtils.randomString(),
            }).save(),
          ]);

          composers = await Promise.all(
            generateComposers(client._id, 3).map((c, i) => {
              if (i === 1) {
                c.linkedContracts = [{ contractId: contract1._id.toString() }];
                c.publisherAgreements = [{
                  publisherId: publisher1._id.toString(),
                  agreementType: 'Original Specific',
                  territory: 'AD',
                  society: 'ABRAMUS',
                  agreementNo: '11111',
                }];
                c.societies = [{
                  society: 'SOCAN',
                  identifier: '11111',
                  mechanicalPro: 'ASCAP',
                  performancePro: 'SOCON',
                  syncPro: 'BMI',
                }];
              }
              if (i === 2) {
                c.linkedContracts = [{ contractId: contract2._id.toString() }];
                c.publisherAgreements = [{
                  publisherId: publisher2._id.toString(),
                  agreementType: 'Original General',
                  territory: 'AD',
                  society: 'ABRAMUS',
                  agreementNo: '222222',
                }];
                c.societies = [{
                  society: 'ACAM',
                  identifier: '22222',
                  mechanicalPro: 'ACCESS',
                  performancePro: 'BEELDRECHT',
                  syncPro: 'HDS-ZAMP',
                }];
              }
              return new Composer(c).save();
            }),
          );

          // create some works for first composer
          await Promise.all([
            new Work(worksWithChains(client._id.toString(), composers[0], publisher1)).save(),
            new Work(worksWithChains(client._id.toString(), composers[0], publisher1)).save(),
            new Work(worksWithChains(client._id.toString(), composers[0], publisher1)).save(),
          ]);
        });

        it('should have the right data structure', async () => {
          const payload = {
            primaryComposerId: composers[0]._id,
            duplicateComposers: composers.map((c) => ({ id: c._id.toString(), selected: true })),
          };

          const res = await request(server)
            .post('/composers/duplicates/overview')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .send(payload);

          expect(res.status).toBe(200);

          const { composers: respComposers, options } = res.body;

          // options.name
          expect(options.name).toContain(composers[0].name);
          expect(options.name).toContain(composers[1].name);
          expect(options.name).toContain(composers[2].name);

          // options.cae
          expect(options.cae).toContain(composers[0].cae);
          expect(options.cae).toContain(composers[1].cae);
          expect(options.cae).toContain(composers[2].cae);

          // linkedContracts
          expect(options.linkedContracts).toEqual([
            {
              composerId: composers[1]._id.toString(),
              composerName: composers[1].name,
              contractId: contract1._id.toString(),
              contractName: contract1.name,
            },
            {
              composerId: composers[2]._id.toString(),
              composerName: composers[2].name,
              contractId: contract2._id.toString(),
              contractName: contract2.name,
            },
          ]);

          // publisherAgreements
          expect(options.publisherAgreements).toEqual([
            {
              ...composers[1].publisherAgreements[0],
              composerId: composers[1]._id.toString(),
              composerName: composers[1].name,
              publisherId: publisher1._id.toString(),
            },
            {
              ...composers[2].publisherAgreements[0],
              composerId: composers[2]._id.toString(),
              composerName: composers[2].name,
              publisherId: publisher2._id.toString(),
            },
          ]);

          // societies
          expect(options.societies).toEqual([
            {
              ...composers[1].societies[0],
              composerId: composers[1]._id.toString(),
              composerName: composers[1].name,
            },
            {
              ...composers[2].societies[0],
              composerId: composers[2]._id.toString(),
              composerName: composers[2].name,
            },
          ]);

          // composers array
          expect(respComposers).toHaveLength(3);
          expect(respComposers.map((c) => ({
            _id: c._id.toString(),
            name: c.name,
            cae: c.cae,
          }))).toEqual(
            composers.map((c) => ({
              _id: c._id.toString(),
              name: c.name,
              cae: c.cae,
            })),
          );

          // worksCount for first composer
          expect(respComposers[0].worksCount).toEqual({ controlled: 3, unControlled: 0 });
        });

        it('should error if no primary composer provided', async () => {
          const payload = {
            primaryComposerId: '',
            duplicateComposers: composers.map((c) => ({ id: c._id.toString(), selected: true })),
          };

          const res = await request(server)
            .post('/composers/duplicates/overview')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .send(payload);

          expect(res.status).toBe(400);
          expect(res.body.message).toBe('Please provide a primary composer id');
        });

        it('should error if an invalid primary composer is provided', async () => {
          const payload = {
            primaryComposerId: testUtils.randomId(),
            duplicateComposers: composers.map((c) => ({ id: c._id.toString(), selected: true })),
          };

          const res = await request(server)
            .post('/composers/duplicates/overview')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .send(payload);

          expect(res.status).toBe(400);
          expect(res.body.message).toBe('Please provide a valid primary composer id');
        });

        it('should error if invalid composerIds are provided', async () => {
          const bad1 = testUtils.randomId();
          const bad2 = testUtils.randomId();
          const payload = {
            primaryComposerId: composers[0]._id,
            duplicateComposers: [
              { id: composers[0]._id.toString(), selected: true },
              { id: bad1, selected: true },
              { id: bad2, selected: true },
            ],
          };

          const res = await request(server)
            .post('/composers/duplicates/overview')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .send(payload);

          expect(res.status).toBe(400);
          expect(res.body.message).toBe(
            `The following composer IDs do not exist: ${bad1}, ${bad2}`,
          );
        });
      });

      describe('/:id PUT', () => {
        it('should update with passed values only', async () => {
          const composer = await Composer.findOne({ name: composer1.name });
          const newName = `${composer.name}changed`;

          const res = await request(server)
            .put(`/composers/${composer._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .send({ name: newName });

          expect(res.status).toBe(200);
          expect(res.body.name).toBe(newName);
        });

        it('should not update clientId', async () => {
          const composer = await Composer.findOne({ name: composer1.name });
          const attemptedClientId = 'changed';
          const res = await request(server)
            .put(`/composers/${composer._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .send({ name: 'newName', clientId: attemptedClientId });

          expect(res.body.clientId).toBe(composer.clientId.toString());
        });

        it("should not update any fields it isn't passed", async () => {
          const composer = await Composer.findOne({ name: composer1.name });
          const originalForeignId = composer.foreignId;

          await request(server)
            .put(`/composers/${composer._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .send({ name: 'newName', clientId: 'changed' });

          const reloaded = await Composer.findById(composer._id);
          expect(reloaded.foreignId).toBe(originalForeignId);
        });

        it('should return a 404 status when not found', async () => {
          const fakeId = 'anything';
          const res = await request(server)
            .put(`/composers/${fakeId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .send({ title: 'Changed Composer Title' });

          expect(res.status).toBe(404);
          expect(res.body.message).toBe(`Could not find Composer with ID ${fakeId}`);
        });
      });

      describe('/:id DELETE', () => {
        describe('type duplicates', () => {
          it('should delete the composer and have the correct count of duplicates and return a 200 status', async () => {
            // prepare mainComposer w/ 4 duplicates
            const base = {
              clientId: client._id,
              name: 'Has duplicates',
              caeWithoutLeadingZeros: '',
              potentialDuplicates: [],
              interestedPartyId: '342423432342',
            };
            const all = [base, ...generateComposers(client._id, 4)];
            const saved = await Promise.all(all.map((c) => new Composer(c).save()));
            const mainComposer = saved[0];
            mainComposer.potentialDuplicates = saved.slice(1).map((c) => ({
              composerId: c._id,
              score: Math.floor(Math.random() * 3) + 13,
            }));
            await mainComposer.save();

            const idToDelete = mainComposer.potentialDuplicates[0].composerId.toString();
            const res = await request(server)
              .delete('/composers')
              .set('applicationToken', applicationToken)
              .set('token', clientUserToken)
              .send({ ids: [idToDelete], type: 'duplicates' });

            expect(res.status).toBe(200);

            const reloadedMain = await Composer.findById(mainComposer._id);
            expect(reloadedMain.potentialDuplicatesCount).toBe(3);
            expect(
              reloadedMain.potentialDuplicates.some((pd) => pd.composerId.toString() === idToDelete),
            ).toBe(false);
          });

          it('should return a 201 status when the composer is linked to a work', async () => {
            const res = await request(server)
              .delete('/composers')
              .set('applicationToken', applicationToken)
              .set('token', clientUserToken)
              .send({ ids: [composerLinkedToWork._id.toString()], type: 'duplicates' });

            expect(res.status).toEqual(201);
            expect(res.body).toEqual('Some or all of these composers are attached to Works which will need to be detached first');

            // Confirm Composer was not deleted
            const composerStillExists = await Composer.findById(composerLinkedToWork._id);
            expect(composerStillExists).not.toBeNull();
          });
        });

        it('should delete the composer and return a 200 status when found', async () => {
          const res = await request(server)
            .delete('/composers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .send({ ids: [composer1._id.toString()] });

          expect(res.status).toBe(200);
          expect(res.body.deletedCount).toBe(1);
        });

        it('should return a 404 status when none found', async () => {
          const res = await request(server)
            .delete('/composers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .send({ ids: [] });

          expect(res.status).toBe(404);
          expect(res.body.message).toBe('Could not find Composers');
        });

        it('should return a 201 status when the composer is linked to a work', async () => {
          const res = await request(server)
            .delete('/composers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .send({ ids: [composerLinkedToWork._id.toString()] });

          expect(res.status).toEqual(201);
          expect(res.body).toEqual('Some or all of these composers are attached to Works which will need to be detached first');

          // Confirm Composer was not deleted
          const composerStillExists = await Composer.findById(composerLinkedToWork._id);
          expect(composerStillExists).not.toBeNull();
        });
      });

      describe('/ POST', () => {
        it('should return a composer created with the passed parameters', async () => {
          const params = {
            clientId: client._id.toString(),
            foreignId: 'foreignId',
            partyNo: 2,
            name: 'name',
            firstName: 'firstName',
            middleNames: 'middleNames',
            surname: 'surname',
            cae: 'cae',
            mainPro: 'mainPro',
            mechanicalPro: 'mechanicalPro',
            performancePro: 'performancePro',
            syncPro: 'syncPro',
            mainProIdentifier: 'mainProIdentifier',
            mechanicalProIdentifier: 'mechanicalProIdentifier',
            performanceProIdentifier: 'performanceProIdentifier',
            syncProIdentifier: 'syncProIdentifier',
            controlled: true,
            notes: 'notes',
            societies: ['S1', 'S2', 'S3'],
            publisherAgreements: ['P1', 'P2', 'P3'],
            linkedContracts: ['L1', 'L2', 'L3'],
          };

          const res = await request(server)
            .post('/composers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .send(params);

          expect(res.status).toBe(200);
          expect(res.body).toMatchObject(params);
        });

        it('should add the composer to the database', async () => {
          const beforeCount = await Composer.countDocuments();
          const params = { clientId: '123', name: 'Post Composer' };

          await request(server)
            .post('/composers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .send(params);

          const afterCount = await Composer.countDocuments();
          expect(afterCount).toBe(beforeCount + 1);
        });
      });

      describe('/import POST', () => {
        it('should give a 200 when file is passed', async () => {
          const res = await request(server)
            .post('/composers/import')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .attach('file', 'routes/composers/test-data/test_composer.xlsx');

          expect(res.status).toBe(200);
          expect(res.body.message).toBe('Composers are importing, and a report will be sent to you shortly.');
        });

        it('should call importFromExcel with the uploaded file', async () => {
          await request(server)
            .post('/composers/import')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .attach('file', 'routes/composers/test-data/test_composer.xlsx');

          expect(importMechanicalFromExcelSpy).toHaveBeenCalled();
        });

        it('should return an error without a file in the request', async () => {
          const res = await request(server)
            .post('/composers/import')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken);

          expect(res.status).toBe(400);
          expect(res.body.errors).toEqual(['Requires a file to be uploaded']);
        });
      });

      describe('/export POST', () => {
        it('should return 200', async () => {
          const composer = await Composer.findOne({ clientId: client._id.toString() });
          const res = await request(server)
            .post('/composers/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .send({ ids: [composer._id.toString()], clientType: 'admin' });

          expect(res.status).toBe(200);
        });

        it('should call sendExport', async () => {
          await request(server)
            .post('/composers/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .send({ clientType: 'Publisher', filter: { ids: [] } });

          expect(sendExportSpy).toHaveBeenCalled();
        });
      });

      describe('/raw-export POST', () => {
        beforeEach(() => {
          mockCSVRawExport.mockReset();
          mockCSVRawExport.mockResolvedValue({ csvPublicLink: 'https://s3.amazonaws.com/test-export.csv' });
        });

        it('should return 200 with async message when sync is not set', async () => {
          const res = await request(server)
            .post('/composers/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .send({ ids: [composer1._id.toString()] });
          expect(res.status).toBe(200);
          expect(res.body.message).toEqual('Your report will be sent to you via email shortly');
        });

        it('should call CSVRawExport with correct filter when ids provided', async () => {
          await request(server)
            .post('/composers/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .send({ ids: [composer1._id.toString()] });
          expect(mockCSVRawExport).toHaveBeenCalledWith(
            expect.objectContaining({
              collectionName: 'composers',
              filter: expect.objectContaining({
                clientId: client._id.toString(),
                _id: { $in: [composer1._id.toString()] },
              }),
            }),
          );
        });

        it('should return 200 with csvPublicLink when sync=true', async () => {
          const res = await request(server)
            .post('/composers/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .send({ ids: [composer1._id.toString()], sync: true });
          expect(res.status).toBe(200);
          expect(res.body.csvPublicLink).toEqual('https://s3.amazonaws.com/test-export.csv');
        });

        it('should call CSVRawExport with sync=true when body param set', async () => {
          await request(server)
            .post('/composers/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .send({ ids: [composer1._id.toString()], sync: true });
          expect(mockCSVRawExport).toHaveBeenCalledWith(
            expect.objectContaining({
              sync: true,
            }),
          );
        });

        it('should return 500 when CSVRawExport throws in sync mode', async () => {
          mockCSVRawExport.mockRejectedValue(new Error('Export failed'));
          const res = await request(server)
            .post('/composers/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .send({ ids: [composer1._id.toString()], sync: true });
          expect(res.status).toBe(500);
          expect(res.body.message).toEqual('Export failed');
        });

        it('should call CSVRawExport with filter when body.filter provided', async () => {
          await request(server)
            .post('/composers/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
            .send({ filter: { text: 'test' } });
          expect(mockCSVRawExport).toHaveBeenCalledWith(
            expect.objectContaining({
              collectionName: 'composers',
            }),
          );
        });

        it('should apply updatedAfter filter to updatedAt.$gte', async () => {
          await request(server)
            .post('/composers/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
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
          await request(server)
            .post('/composers/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
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
          await request(server)
            .post('/composers/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
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
          await request(server)
            .post('/composers/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
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
          await request(server)
            .post('/composers/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
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
          const res = await request(server)
            .post('/composers/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
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
          const res = await request(server)
            .post('/composers/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
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
          const res = await request(server)
            .post('/composers/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserToken)
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

    describe('as a user with None rights', () => {
      let clientUserNoneToken;

      beforeEach(() => {
        const userNone = {
          id: user._id,
          internal: false,
          parentId: null,
          clientId: null,
          rights: {},
        };
        userNone.rights[client._id] = {
          sales: 'None',
          contracts: 'None',
          periods: 'None',
          catalogue: 'None',
        };
        clientUserNoneToken = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/ GET', () => {
        it('should return 403', async () => {
          const res = await request(server)
            .get('/composers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNoneToken);

          expect(res.status).toBe(403);
        });
      });

      describe('/:id GET', () => {
        it('should return 403', async () => {
          const composer = await Composer.findOne({ clientId: client._id.toString() });
          const res = await request(server)
            .get(`/composers/${composer._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNoneToken);

          expect(res.status).toBe(403);
        });
      });

      describe('/:id PUT', () => {
        it('should return 403', async () => {
          const composer = await Composer.findOne({ clientId: client._id.toString() });
          const res = await request(server)
            .put(`/composers/${composer._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNoneToken)
            .send({ name: 'changedName' });

          expect(res.status).toBe(403);
        });
      });

      describe('/:id DELETE', () => {
        it('should return 403', async () => {
          const composer = await Composer.findOne({ clientId: client._id.toString() });
          const res = await request(server)
            .delete('/composers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNoneToken)
            .send({ ids: [composer._id.toString()] });

          expect(res.status).toBe(403);
        });
      });

      describe('/ POST', () => {
        it('should return 403', async () => {
          const params = {
            clientId: client._id.toString(),
            name: 'Name',
            address: 'Address',
            country: 'Country',
            vatNo: 'VATNO',
          };

          const res = await request(server)
            .post('/composers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNoneToken)
            .send(params);

          expect(res.status).toBe(403);
        });
      });

      describe('/import POST', () => {
        it('should return 403', async () => {
          const res = await request(server)
            .post('/composers/import')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNoneToken)
            .attach('file', 'routes/composers/test-data/test_composer.xlsx');

          expect(res.status).toBe(403);
        });
      });

      describe('/export POST', () => {
        it('should return 403', async () => {
          const res = await request(server)
            .post('/composers/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNoneToken);

          expect(res.status).toBe(403);
        });
      });
    });

    describe('as a user with View rights', () => {
      let clientUserViewToken;

      beforeEach(() => {
        const userView = {
          id: user._id,
          internal: false,
          parentId: null,
          clientId: client._id,
          rights: {},
        };
        userView.rights[client._id] = {
          sales: 'View',
          contracts: 'View',
          periods: 'View',
          catalogue: 'View',
        };
        clientUserViewToken = jwt.sign(userView, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/ GET', () => {
        it('should return 200', async () => {
          const res = await request(server)
            .get('/composers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserViewToken);

          expect(res.status).toBe(200);
        });
      });

      describe('/:id GET', () => {
        it('should return 200', async () => {
          const composer = await Composer.findOne({ clientId: client._id.toString() });
          const res = await request(server)
            .get(`/composers/${composer._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserViewToken);

          expect(res.status).toBe(200);
        });
      });

      describe('/:id PUT', () => {
        it('should return 403', async () => {
          const composer = await Composer.findOne({ clientId: client._id.toString() });
          const res = await request(server)
            .put(`/composers/${composer._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserViewToken)
            .send({ name: 'changedName' });

          expect(res.status).toBe(403);
        });
      });

      describe('/:id DELETE', () => {
        it('should return 403', async () => {
          const composer = await Composer.findOne({ clientId: client._id.toString() });
          const res = await request(server)
            .delete('/composers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserViewToken)
            .send({ ids: [composer._id.toString()] });

          expect(res.status).toBe(403);
        });
      });

      describe('/ POST', () => {
        it('should return 403', async () => {
          const params = {
            clientId: client._id.toString(),
            name: 'Name',
            address: 'Address',
            country: 'Country',
            vatNo: 'VATNO',
          };

          const res = await request(server)
            .post('/composers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserViewToken)
            .send(params);

          expect(res.status).toBe(403);
        });
      });

      describe('/import POST', () => {
        it('should return 403', async () => {
          const res = await request(server)
            .post('/composers/import')
            .set('applicationToken', applicationToken)
            .set('token', clientUserViewToken)
            .attach('file', 'routes/composers/test-data/test_composer.xlsx');

          expect(res.status).toBe(403);
        });
      });

      describe('/export POST', () => {
        it('should return 200', async () => {
          const composer = await Composer.findOne({ clientId: client._id.toString() });
          const res = await request(server)
            .post('/composers/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserViewToken)
            .send({ clientType: 'Publisher', ids: [composer._id.toString()] });

          expect(res.status).toBe(200);
        });

        it('should call sendExport', async () => {
          await request(server)
            .post('/composers/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserViewToken)
            .send({ clientType: 'Publisher', filter: { ids: [] } });

          expect(sendExportSpy).toHaveBeenCalled();
          sendExportSpy.mockRestore();
        });
      });
    });

    describe('as a user with Edit rights', () => {
      let clientUserEditToken;

      beforeEach(() => {
        const userEdit = {
          id: user._id,
          internal: false,
          parentId: null,
          clientId: client._id,
          rights: {},
        };
        userEdit.rights[client._id] = {
          sales: 'Edit',
          contracts: 'Edit',
          periods: 'Edit',
          catalogue: 'Edit',
        };
        clientUserEditToken = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/ GET', () => {
        it('should return 200', async () => {
          const res = await request(server)
            .get('/composers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEditToken);

          expect(res.status).toBe(200);
        });
      });

      describe('/:id PUT', () => {
        it('should return 200', async () => {
          const composer = await Composer.findOne({ clientId: client._id.toString() });
          const res = await request(server)
            .put(`/composers/${composer._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEditToken)
            .send({ name: 'changedName' });

          expect(res.status).toBe(200);
        });
      });

      describe('/:id DELETE', () => {
        describe('type duplicates', () => {
          it('should delete the composer and have the correct count of duplicates and return a 200 status', async () => {
            // prepare mainComposer w/ 4 duplicates
            const base = {
              clientId: client._id,
              name: 'Has duplicates',
              caeWithoutLeadingZeros: '',
              potentialDuplicates: [],
              interestedPartyId: '342423432342',
            };
            const all = [base, ...generateComposers(client._id, 4)];
            const saved = await Promise.all(all.map((c) => new Composer(c).save()));
            const mainComposer = saved[0];
            mainComposer.potentialDuplicates = saved.slice(1).map((c) => ({
              composerId: c._id,
              score: Math.floor(Math.random() * 3) + 13,
            }));
            await mainComposer.save();

            const idToDelete = mainComposer.potentialDuplicates[0].composerId.toString();
            const res = await request(server)
              .delete('/composers')
              .set('applicationToken', applicationToken)
              .set('token', clientUserEditToken)
              .send({ ids: [idToDelete], type: 'duplicates' });

            expect(res.status).toBe(200);

            const reloadedMain = await Composer.findById(mainComposer._id);
            expect(reloadedMain.potentialDuplicatesCount).toBe(3);
            expect(
              reloadedMain.potentialDuplicates.some((pd) => pd.composerId.toString() === idToDelete),
            ).toBe(false);
          });

          it('should return a 201 status when the composer is linked to a work', async () => {
            const res = await request(server)
              .delete('/composers')
              .set('applicationToken', applicationToken)
              .set('token', clientUserEditToken)
              .send({ ids: [composerLinkedToWork._id.toString()], type: 'duplicates' });

            expect(res.status).toEqual(201);
            expect(res.body).toEqual('Some or all of these composers are attached to Works which will need to be detached first');

            // Confirm Composer was not deleted
            const composerStillExists = await Composer.findById(composerLinkedToWork._id);
            expect(composerStillExists).not.toBeNull();
          });
        });

        it('should delete the composer and return a 200 status when found', async () => {
          const res = await request(server)
            .delete('/composers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEditToken)
            .send({ ids: [composer1._id.toString()] });

          expect(res.status).toBe(200);
          expect(res.body.deletedCount).toBe(1);
        });

        it('should return a 404 status when none found', async () => {
          const res = await request(server)
            .delete('/composers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEditToken)
            .send({ ids: [] });

          expect(res.status).toBe(404);
          expect(res.body.message).toBe('Could not find Composers');
        });

        it('should return a 201 status when the composer is linked to a work', async () => {
          const res = await request(server)
            .delete('/composers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEditToken)
            .send({ ids: [composerLinkedToWork._id.toString()] });

          expect(res.status).toEqual(201);
          expect(res.body).toEqual('Some or all of these composers are attached to Works which will need to be detached first');

          // Confirm Composer was not deleted
          const composerStillExists = await Composer.findById(composerLinkedToWork._id);
          expect(composerStillExists).not.toBeNull();
        });
      });

      describe('/ POST', () => {
        it('should return 200 and match posted data', async () => {
          const params = {
            clientId: client._id.toString(),
            foreignId: 'foreignId',
            partyNo: 2,
            name: 'name',
            firstName: 'firstName',
            middleNames: 'middleNames',
            surname: 'surname',
            cae: 'cae',
            mainPro: 'mainPro',
            mechanicalPro: 'mechanicalPro',
            performancePro: 'performancePro',
            syncPro: 'syncPro',
            mainProIdentifier: 'mainProIdentifier',
            mechanicalProIdentifier: 'mechanicalProIdentifier',
            performanceProIdentifier: 'performanceProIdentifier',
            syncProIdentifier: 'syncProIdentifier',
            controlled: true,
            notes: 'notes',
            societies: ['S1', 'S2', 'S3'],
            publisherAgreements: ['P1', 'P2', 'P3'],
            linkedContracts: ['L1', 'L2', 'L3'],
          };

          const res = await request(server)
            .post('/composers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEditToken)
            .send(params);

          expect(res.status).toBe(200);
          expect(res.body).toMatchObject(params);
        });
      });

      describe('/import POST', () => {
        it('should return 200', async () => {
          const res = await request(server)
            .post('/composers/import')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEditToken)
            .attach('file', 'routes/composers/test-data/test_composer.xlsx');

          expect(res.status).toBe(200);
        });
      });

      describe('/export POST', () => {
        it('should return 200', async () => {
          const composer = await Composer.findOne({ clientId: client._id.toString() });
          const res = await request(server)
            .post('/composers/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEditToken)
            .send({ clientType: 'Publisher', ids: [composer._id.toString()] });

          expect(res.status).toBe(200);
        });

        it('should call sendExport', async () => {
          await request(server)
            .post('/composers/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEditToken)
            .send({ clientType: 'Publisher', filter: { ids: [] } });

          expect(sendExportSpy).toHaveBeenCalled();
        });
      });
    });
  });

  describe('as an internal user', () => {
    const internal = jwt.sign({ internal: true }, process.env.jsonSecretToken, { expiresIn: 86400 });

    describe('/ GET', () => {
      it('should return a 403 forbidden response', async () => {
        const userToken = jwt.sign({
          id: user._id,
          internal: false,
          parentId: null,
          clientId: client._id,
          email: 'test-upload@curve.com',
          rights: {},
        }, process.env.jsonSecretToken, { expiresIn: 86400 });

        const res = await request(server)
          .get('/composers')
          .set('applicationToken', applicationToken)
          .set('token', userToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id GET', () => {
      it('should return a 403 forbidden response', async () => {
        const composer = await Composer.findOne({ clientId: client._id.toString() });
        const userToken = jwt.sign({
          id: user._id,
          internal: false,
          parentId: null,
          clientId: client._id,
          email: 'test-upload@curve.com',
          rights: {},
        }, process.env.jsonSecretToken, { expiresIn: 86400 });

        const res = await request(server)
          .get(`/composers/${composer._id}`)
          .set('applicationToken', applicationToken)
          .set('token', userToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id PUT', () => {
      it('should return a 403 forbidden response', async () => {
        const composer = await Composer.findOne({ clientId: client._id.toString() });
        const res = await request(server)
          .put(`/composers/${composer._id}`)
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .send({ title: 'Changed Title' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not update the composer', async () => {
        const composer = await Composer.findOne({ clientId: client._id.toString() });
        await request(server)
          .put(`/composers/${composer._id}`)
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .send({ title: 'Changed Title' });

        const reloaded = await Composer.findById(composer._id);
        expect(reloaded.title).toBe(composer.title);
      });
    });

    describe('/:id DELETE', () => {
      it('should return a 403 forbidden response', async () => {
        const composer = await Composer.findOne({ clientId: client._id.toString() });
        const res = await request(server)
          .delete('/composers')
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .send({ ids: [composer._id.toString()] });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not delete the composer', async () => {
        const composer = await Composer.findOne({ clientId: client._id.toString() });
        await request(server)
          .delete('/composers')
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .send({ ids: [composer._id.toString()] });

        const count = await Composer.countDocuments({ _id: composer._id });
        expect(count).toBe(1);
      });
    });

    describe('/ POST', () => {
      it('should return a 403 forbidden response', async () => {
        const userToken = jwt.sign({
          id: user._id,
          internal: false,
          parentId: null,
          clientId: client._id,
          email: 'test-upload@curve.com',
          rights: {},
        }, process.env.jsonSecretToken, { expiresIn: 86400 });

        const res = await request(server)
          .post('/composers')
          .set('applicationToken', applicationToken)
          .set('token', userToken)
          .send({ title: 'Changed Title' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not create a composer', async () => {
        const beforeCount = await Composer.countDocuments();
        await request(server)
          .post('/composers')
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .send({ title: 'Changed Title' });

        const afterCount = await Composer.countDocuments();
        expect(afterCount).toBe(beforeCount);
      });
    });

    describe('/import POST', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .post('/composers/import')
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .attach('file', 'routes/composers/test-data/test_composer.xlsx');

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not import a composer', async () => {
        const beforeCount = await Composer.countDocuments();
        await request(server)
          .post('/composers/import')
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .attach('file', 'routes/composers/test-data/test_composer.xlsx');

        const afterCount = await Composer.countDocuments();
        expect(afterCount).toBe(beforeCount);
      });
    });

    describe('/export POST', () => {
      it('should return 403', async () => {
        const res = await request(server)
          .post('/composers/export')
          .set('applicationToken', applicationToken)
          .set('token', internal);

        expect(res.status).toBe(403);
      });
    });
  });

  describe('as a parent user without a client', () => {
    const parent = jwt.sign({ internal: false, parentId: 'parentId' }, process.env.jsonSecretToken, { expiresIn: 86400 });

    describe('/ GET', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .get('/composers')
          .set('applicationToken', applicationToken)
          .set('token', parent);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id GET', () => {
      it('should return a 403 forbidden response', async () => {
        const composer = await Composer.findOne({ clientId: client._id.toString() });
        const res = await request(server)
          .get(`/composers/${composer._id}`)
          .set('applicationToken', applicationToken)
          .set('token', parent);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id PUT', () => {
      it('should return a 403 forbidden response', async () => {
        const composer = await Composer.findOne({ clientId: client._id.toString() });
        const res = await request(server)
          .put(`/composers/${composer._id}`)
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ title: 'Changed Title' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not update the composer', async () => {
        const composer = await Composer.findOne({ clientId: client._id.toString() });
        await request(server)
          .put(`/composers/${composer._id}`)
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ title: 'Changed Title' });

        const reloaded = await Composer.findById(composer._id);
        expect(reloaded.title).toBe(composer.title);
      });
    });

    describe('/:id DELETE', () => {
      it('should return a 403 forbidden response', async () => {
        const composer = await Composer.findOne({ clientId: client._id.toString() });
        const res = await request(server)
          .delete('/composers')
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ ids: [composer._id.toString()] });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not delete the composer', async () => {
        const composer = await Composer.findOne({ clientId: client._id.toString() });
        await request(server)
          .delete('/composers')
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ ids: [composer._id.toString()] });

        const count = await Composer.countDocuments({ _id: composer._id });
        expect(count).toBe(1);
      });
    });

    describe('/ POST', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .post('/composers')
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ title: 'Changed Title' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not create a composer', async () => {
        const beforeCount = await Composer.countDocuments();
        await request(server)
          .post('/composers')
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ title: 'Changed Title' });

        const afterCount = await Composer.countDocuments();
        expect(afterCount).toBe(beforeCount);
      });
    });

    describe('/import POST', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .post('/composers/import')
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .attach('file', 'routes/composers/test-data/test_composer.xlsx');

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not import a composer', async () => {
        const beforeCount = await Composer.countDocuments();
        await request(server)
          .post('/composers/import')
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .attach('file', 'routes/composers/test-data/test_composer.xlsx');

        const afterCount = await Composer.countDocuments();
        expect(afterCount).toBe(beforeCount);
      });
    });

    describe('/export POST', () => {
      it('should return 403', async () => {
        const res = await request(server)
          .post('/composers/export')
          .set('applicationToken', applicationToken)
          .set('token', parent);

        expect(res.status).toBe(403);
      });
    });
  });

  describe('as a payee user', () => {
    const contractId = '345';
    const contractIds = [contractId, '678'];
    let payeeToken;

    beforeEach(async () => {
      const payee = await new Payee({ name: 'Payee Login', clientId: client._id }).save();
      payeeToken = jwt.sign({
        internal: false,
        parentId: null,
        payeeId: payee._id,
        contractIds,
      }, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/ GET', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .get('/composers')
          .set('applicationToken', applicationToken)
          .set('token', payeeToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id PUT', () => {
      it('should return a 403 forbidden response', async () => {
        const composer = await Composer.findOne({ clientId: client._id.toString() });
        const res = await request(server)
          .put(`/composers/${composer._id}`)
          .set('applicationToken', applicationToken)
          .set('token', payeeToken)
          .send({ name: 'Changed Title' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not update the composer', async () => {
        const composer = await Composer.findOne({ clientId: client._id.toString() });
        await request(server)
          .put(`/composers/${composer._id}`)
          .set('applicationToken', applicationToken)
          .set('token', payeeToken)
          .send({ name: 'Changed Title' });

        const updated = await Composer.findById(composer._id);
        expect(updated.name).toBe(composer.name);
      });
    });

    describe('/:id DELETE', () => {
      it('should return a 403 forbidden response', async () => {
        const composer = await Composer.findOne({ clientId: client._id.toString() });
        const res = await request(server)
          .delete('/composers')
          .set('applicationToken', applicationToken)
          .set('token', payeeToken)
          .send({ ids: [composer._id.toString()] });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not delete the composer', async () => {
        const composer = await Composer.findOne({ clientId: client._id.toString() });
        await request(server)
          .delete('/composers')
          .set('applicationToken', applicationToken)
          .set('token', payeeToken)
          .send({ ids: [composer._id.toString()] });

        const count = await Composer.countDocuments({ _id: composer._id });
        expect(count).toBe(1);
      });
    });

    describe('/ POST', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .post('/composers')
          .set('applicationToken', applicationToken)
          .set('token', payeeToken)
          .send({ title: 'Changed Title' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not create a composer', async () => {
        const beforeCount = await Composer.countDocuments();
        await request(server)
          .post('/composers')
          .set('applicationToken', applicationToken)
          .set('token', payeeToken)
          .send({ title: 'Changed Title' });

        const afterCount = await Composer.countDocuments();
        expect(afterCount).toBe(beforeCount);
      });
    });

    describe('/import POST', () => {
      it('should return 403', async () => {
        const res = await request(server)
          .post('/composers/import')
          .set('applicationToken', applicationToken)
          .set('token', payeeToken)
          .attach('file', 'routes/composers/test-data/test_composer.xlsx');

        expect(res.status).toBe(403);
      });
    });

    describe('/export POST', () => {
      it('should return 403', async () => {
        const res = await request(server)
          .post('/composers/export')
          .set('applicationToken', applicationToken)
          .set('token', payeeToken);

        expect(res.status).toBe(403);
      });
    });
  });

  describe('Date filtering', () => {
    let oldComposer;
    let midComposer;
    let newComposer;

    beforeEach(async () => {
      oldComposer = new Composer({
        clientId: client._id,
        name: 'Old Composer',
        foreignId: 'OLD-001',
        createdAt: new Date('2020-01-01T00:00:00.000Z'),
        updatedAt: new Date('2020-01-01T00:00:00.000Z'),
      });
      await oldComposer.save();

      midComposer = new Composer({
        clientId: client._id,
        name: 'Mid Composer',
        foreignId: 'MID-001',
        createdAt: new Date('2022-06-15T12:00:00.000Z'),
        updatedAt: new Date('2022-06-15T12:00:00.000Z'),
      });
      await midComposer.save();

      newComposer = new Composer({
        clientId: client._id,
        name: 'New Composer',
        foreignId: 'NEW-001',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      });
      await newComposer.save();
    });

    describe('createdAfter filter', () => {
      it('should filter composers created on or after the specified date', async () => {
        const res = await request(server)
          .get('/composers?createdAfter=2022-01-01')
          .set('applicationToken', applicationToken)
          .set('token', clientUserToken);

        expect(res.status).toBe(200);
        const composerNames = res.body.composers.map((c) => c.name);
        expect(composerNames).toContain('Mid Composer');
        expect(composerNames).toContain('New Composer');
        expect(composerNames).not.toContain('Old Composer');
      });

      it('should include composers created exactly on the filter date', async () => {
        const res = await request(server)
          .get('/composers?createdAfter=2022-06-15')
          .set('applicationToken', applicationToken)
          .set('token', clientUserToken);

        expect(res.status).toBe(200);
        const composerNames = res.body.composers.map((c) => c.name);
        expect(composerNames).toContain('Mid Composer');
      });
    });

    describe('createdBefore filter', () => {
      it('should filter composers created on or before the specified date', async () => {
        const res = await request(server)
          .get('/composers?createdBefore=2022-06-15')
          .set('applicationToken', applicationToken)
          .set('token', clientUserToken);

        expect(res.status).toBe(200);
        const composerNames = res.body.composers.map((c) => c.name);
        expect(composerNames).toContain('Old Composer');
        expect(composerNames).toContain('Mid Composer');
        expect(composerNames).not.toContain('New Composer');
      });

      it('should include composers created exactly on the filter date', async () => {
        const res = await request(server)
          .get('/composers?createdBefore=2020-01-01')
          .set('applicationToken', applicationToken)
          .set('token', clientUserToken);

        expect(res.status).toBe(200);
        const composerNames = res.body.composers.map((c) => c.name);
        expect(composerNames).toContain('Old Composer');
      });
    });

    describe('updatedAfter filter', () => {
      it('should filter composers updated on or after the specified date', async () => {
        const res = await request(server)
          .get('/composers?updatedAfter=2022-01-01')
          .set('applicationToken', applicationToken)
          .set('token', clientUserToken);

        expect(res.status).toBe(200);
        const composerNames = res.body.composers.map((c) => c.name);
        expect(composerNames).toContain('Mid Composer');
        expect(composerNames).toContain('New Composer');
        expect(composerNames).not.toContain('Old Composer');
      });

      it('should include composers updated exactly on the filter date', async () => {
        const res = await request(server)
          .get('/composers?updatedAfter=2024-01-01')
          .set('applicationToken', applicationToken)
          .set('token', clientUserToken);

        expect(res.status).toBe(200);
        const composerNames = res.body.composers.map((c) => c.name);
        expect(composerNames).toContain('New Composer');
      });
    });

    describe('updatedBefore filter', () => {
      it('should filter composers updated on or before the specified date', async () => {
        const res = await request(server)
          .get('/composers?updatedBefore=2022-06-15')
          .set('applicationToken', applicationToken)
          .set('token', clientUserToken);

        expect(res.status).toBe(200);
        const composerNames = res.body.composers.map((c) => c.name);
        expect(composerNames).toContain('Old Composer');
        expect(composerNames).toContain('Mid Composer');
        expect(composerNames).not.toContain('New Composer');
      });

      it('should include composers updated exactly on the filter date', async () => {
        const res = await request(server)
          .get('/composers?updatedBefore=2022-06-15')
          .set('applicationToken', applicationToken)
          .set('token', clientUserToken);

        expect(res.status).toBe(200);
        const composerNames = res.body.composers.map((c) => c.name);
        expect(composerNames).toContain('Mid Composer');
      });
    });

    describe('date range combinations', () => {
      it('should apply createdAfter and createdBefore together', async () => {
        const res = await request(server)
          .get('/composers?createdAfter=2021-01-01&createdBefore=2023-01-01')
          .set('applicationToken', applicationToken)
          .set('token', clientUserToken);

        expect(res.status).toBe(200);
        const composerNames = res.body.composers.map((c) => c.name);
        expect(composerNames).toContain('Mid Composer');
        expect(composerNames).not.toContain('Old Composer');
        expect(composerNames).not.toContain('New Composer');
      });

      it('should combine date filters with text search', async () => {
        const res = await request(server)
          .get('/composers?createdAfter=2020-01-01&text=Mid')
          .set('applicationToken', applicationToken)
          .set('token', clientUserToken);

        expect(res.status).toBe(200);
        const composerNames = res.body.composers.map((c) => c.name);
        expect(composerNames).toContain('Mid Composer');
        expect(composerNames).not.toContain('Old Composer');
        expect(composerNames).not.toContain('New Composer');
      });
    });
  });
});
