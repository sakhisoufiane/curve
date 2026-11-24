const request = require('supertest');
const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const jwt = require('jsonwebtoken');
const config = require('../../config.json');

const mockCSVRawExport = jest.fn();
jest.mock('../../libs/mongodb-export', () => ({
  CSVRawExport: mockCSVRawExport,
}));

const User = require('../../models/user');
const Payee = require('../../models/payee');
const Client = require('../../models/client');
const Publisher = require('../../models/publisher');
const server = require('../../index');
const { generateComposers } = require('../composers/test-data/works/generateComposers');
const DeliveryPartner = require('../../models/deliveryPartner');
const { worksWithChains } = require('../composers/test-data/works/worksWithChains');
const Track = require('../../models/track');
const Release = require('../../models/release');
const Work = require('../../models/work');
const Contract = require('../../models/contract');
const Composer = require('../../models/composer');

const applicationToken = config.applicationTokens[0];

function getRandomIntInclusive(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
}

describe('/publishers', () => {
  logger.info('>>>file>>>> int/routes/publishers .....................');
  let publisher1; let publisher2; let publisher3; let
    clientUser; let email;
  let publisherLinkedToWork;
  let sendExportSpy; let importFromExcelSpy;
  let client; let user;

  beforeEach(async () => {
    // Jest spies for import/export
    importFromExcelSpy = jest.spyOn(Publisher, 'importFromExcel').mockImplementation();
    sendExportSpy = jest.spyOn(Publisher, 'sendExport').mockImplementation();

    // unique email per run
    email = `${randomString()}@curve.com`;

    [client, user] = await Promise.all([
      Client({ name: testUtils.randomString(), createdBigQueryTables: true, createdBigQueryBackups: true }).save(),
      new User({ email }).save(),
    ]);

    publisher1 = new Publisher({ clientId: client._id, name: randomString(), interestedPartyId: randomString(), cae: `00${randomString(9)}` });
    publisher2 = new Publisher({ clientId: client._id, name: randomString(), interestedPartyId: randomString() });
    publisher3 = new Publisher({ clientId: randomId(), name: randomString(), interestedPartyId: randomString() });

    publisherLinkedToWork = new Publisher({
      clientId: client._id,
      name: randomString(),
      interestedPartyId: randomString(),
    });

    [publisher1, publisher2, publisher3] = await Promise.all([
      publisher1.save(),
      publisher2.save(),
      publisher3.save(),
      publisherLinkedToWork.save(),
    ]);

    await Work.insertMany([new Work({
      clientId: client._id,
      title: randomString(),
      usedPublisherIds: [publisherLinkedToWork._id.toString()],
    })]);

    const userToken = {
      id: user._id,
      internal: false,
      parentId: null,
      clientId: client._id,
      email,
      rights: {},
    };
    userToken.rights[client._id.toString()] = { catalogue: 'Edit' };
    clientUser = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('as a client user', () => {
    describe('as a user with full rights', () => {
      describe('/ GET', () => {
        it('should return a list of publishers', async () => {
          const res = await request(server)
            .get('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(200);
          expect(Array.isArray(res.body.publishers)).toBe(true);

          const publishers = await Publisher.find({ clientId: client._id });
          expect(res.body.publishers.length).toBe(publishers.length);
        });

        it('should return metadata of publishers index on / GET', async () => {
          const res = await request(server)
            .get('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(200);
          expect(typeof res.body.meta).toBe('object');
        });

        it('should return the first page if not passed a specific page', async () => {
          const res = await request(server)
            .get('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.body.meta.currentPage).toBe(1);
        });

        it('should return the passed page when passed the parameter', async () => {
          const res = await request(server)
            .get('/publishers?page=3')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.body.meta.currentPage).toBe(3);
        });

        it('should return the pages available', async () => {
          const res = await request(server)
            .get('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.body.meta.totalPages).toBe(1);
        });

        it('should set the amount to be returned per page when passed a limit option', async () => {
          const res = await request(server)
            .get('/publishers?limit=1')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.body.publishers.length).toBe(1);

          const count = await Publisher.countDocuments({ clientId: client._id });
          expect(res.body.meta.totalPages).toBe(count);
        });

        it('should return publishers that match the interestedPartyId text', async () => {
          const res = await request(server)
            .get('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .query({ text: publisher1.interestedPartyId });

          expect(res.body.meta.total).toBe(1);
        });

        it('should return publishers that match the cae text', async () => {
          const res = await request(server)
            .get('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .query({ text: publisher1.cae });

          expect(res.body.meta.total).toBe(1);
        });

        it('should return publishers that match part of the cae text', async () => {
          const res = await request(server)
            .get('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .query({ text: publisher1.cae.slice(-9) });
          expect(res.body.meta.total).toBe(1);
        });

        it('should return publishers that match one of their aliases', async () => {
          const alias = randomString();
          await new Publisher({ clientId: client._id, name: randomString(), aliases: [alias] }).save();

          const res = await request(server)
            .get('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .query({ text: alias });

          expect(res.body.meta.total).toBe(1);
        });
      });

      describe('/:id GET', () => {
        describe('when a publisher is found', () => {
          it('should return a publisher and 200 status', async () => {
            const publisher = await Publisher.findOne({ name: publisher1.name });

            const res = await request(server)
              .get(`/publishers/${publisher._id}`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser);

            expect(res.status).toBe(200);
            expect(typeof res.body).toBe('object');
            expect(res.body.clientId).toBe(publisher.clientId.toString());
            expect(res.body.foreignId).toBe(publisher.foreignId);
            expect(res.body.partyNo).toBe(publisher.partyNo);
            expect(res.body.name).toBe(publisher.name);
            expect(res.body.cae).toBe(publisher.cae);
            expect(res.body.mainPro).toBe(publisher.mainPro);
            expect(res.body.mechanicalPro).toBe(publisher.mechanicalPro);
            expect(res.body.performancePro).toBe(publisher.performancePro);
            expect(res.body.syncPro).toBe(publisher.syncPro);
            expect(res.body.mainProIdentifier).toBe(publisher.mainProIdentifier);
            expect(res.body.mechanicalProIdentifier).toBe(publisher.mechanicalProIdentifier);
            expect(res.body.performanceProIdentifier).toBe(publisher.performanceProIdentifier);
            expect(res.body.syncProIdentifier).toBe(publisher.syncProIdentifier);
            expect(res.body.controlled).toBe(publisher.controlled);
            expect(res.body.notes).toBe(publisher.notes);
            expect(res.body.createdBy).toBe(publisher.createdBy);
            expect(res.body.lastModifiedBy).toBe(publisher.lastModifiedBy);
          });
        });

        describe('when a publisher is not found', () => {
          it('should return a 404 status', async () => {
            const id = randomId();

            const res = await request(server)
              .get(`/publishers/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser);

            expect(res.status).toBe(404);
            expect(res.body.message).toBe(`Could not find Publisher with ID ${id}`);
          });
        });
      });

      describe('/duplicates GET', () => {
        beforeEach(async () => {
          await Client.updateOne({ clientId: client._id }, { clientType: 'Publisher' });

          let publishers = [{
            clientId: client._id,
            name: 'Has duplicates',
            caeWithoutLeadingZeros: '',
            potentialDuplicates: [],
            interestedPartyId: '342423432342',
          }];

          publishers = [...publishers, ...generateComposers(client._id)].map((publisher) => new Publisher(publisher).save());

          const [main, ...results] = await Promise.all(publishers);
          main.potentialDuplicates = results.map(({ _id }) => ({
            publisherId: _id,
            score: getRandomIntInclusive(13, 15),
          }));

          await main.save();

          const publishersSecondary = [
            new Publisher({
              clientId: client._id,
              name: 'Has duplicates secondary',
              caeWithoutLeadingZeros: '',
              potentialDuplicates: [],
              interestedPartyId: '45454545',
            }).save(),
            ...generateComposers(client._id, 24).map((publisher) => new Publisher(publisher).save()),
          ];

          const [secondary, ...secondaryResults] = await Promise.all(publishersSecondary);
          secondary.potentialDuplicates = secondaryResults.map(({ _id }) => ({
            publisherId: _id,
            score: getRandomIntInclusive(13, 15),
          }));
          await secondary.save();
        });

        it('should get the duplicates in the right structure', async () => {
          const response = await request(server)
            .get('/publishers/duplicates')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(response.status).toBe(200);
          const [publisher, secondaryPublisher] = response.body.duplicates;

          expect(publisher.potentialDuplicates.length).toBe(50);
          expect(publisher.name).toBe('Has duplicates');
          publisher.potentialDuplicates.forEach((duplicate) => {
            expect(Object.keys(duplicate)).toEqual(
              expect.arrayContaining(['publisherId', 'score', 'name', 'cae', 'worksCount']),
            );
          });

          const getScores = publisher.potentialDuplicates.map(({ score }) => score);
          expect(getScores).toEqual([...getScores].sort((a, b) => b - a));

          expect(secondaryPublisher.potentialDuplicates.length).toBe(24);
          expect(secondaryPublisher.name).toBe('Has duplicates secondary');
          secondaryPublisher.potentialDuplicates.forEach((duplicate) => {
            expect(Object.keys(duplicate)).toEqual(
              expect.arrayContaining(['publisherId', 'score', 'name', 'cae', 'worksCount']),
            );
          });

          const getSecondaryScores = secondaryPublisher.potentialDuplicates.map(({ score }) => score);
          expect(getSecondaryScores).toEqual([...getSecondaryScores].sort((a, b) => b - a));
        });
      });

      describe('/duplicates/merge POST', () => {
        it('should error if validation checks fail', async () => {
          const response = await request(server)
            .post('/publishers/duplicates/merge')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(response.status).toBe(400);
          const { errors } = response.body;
          expect(errors).toHaveLength(1);
          expect(errors[0]).toBe('Please provide a valid primary publisher ID');
        });

        describe('Merge publishers', () => {
          let publishers;
          let contract1;
          let contract2;

          beforeEach(async () => {
            await Client.updateOne({ clientId: client._id }, { clientType: 'Publisher' });

            contract1 = new Contract({ clientId: client._id, name: testUtils.randomString(), status: 'Expired' });
            contract2 = new Contract({ clientId: client._id, name: testUtils.randomString(), status: 'Expired' });
            await Promise.all([contract1.save(), contract2.save()]);

            publishers = generateComposers(client._id).map((p) => new Publisher(p).save());
            publishers = await Promise.all(publishers);
          });

          it('should error if an invalid contract ID is provided', async () => {
            const [primary] = publishers;
            const data = {
              primaryPublisherId: primary._id,
              data: {
                name: 'Overwritten name',
                cae: 'cae12345',
                linkedContracts: [{ contractId: testUtils.randomId() }, { contractId: contract2._id.toString() }],
              },
            };

            const response = await request(server)
              .post('/publishers/duplicates/merge')
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .send(data);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Invalid contracts found');
          });

          it('should error if an invalid composer ID is provided for deletion', async () => {
            const [primary] = publishers;
            const data = {
              primaryPublisherId: primary._id,
              deletePublisherIds: [testUtils.randomId()],
              data: {
                name: 'Overwritten name',
                cae: 'cae12345',
              },
            };

            const response = await request(server)
              .post('/publishers/duplicates/merge')
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .send(data);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Invalid publisher ids found for deletion');
          });

          it('should merge and update the values of the primary publisher and set blacklist', async () => {
            const [primary, ...rest] = publishers;
            primary.potentialDuplicates = [{ publisherId: rest[0]._id, score: 14 }];
            await primary.save();

            const data = {
              primaryPublisherId: primary._id,
              blacklistedDuplicateIds: [rest[0]._id.toString()],
              data: {
                name: 'Overwritten name',
                cae: 'cae12345',
                linkedContracts: [
                  { contractId: contract1._id.toString() },
                  { contractId: contract2._id.toString() },
                ],
                foreignId: testUtils.randomString(),
                cwrName: testUtils.randomString(),
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

            const response = await request(server)
              .post('/publishers/duplicates/merge')
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .send(data);

            expect(response.status).toBe(200);

            const updatedPublisher = await Publisher.findById(primary._id);
            expect(updatedPublisher.blacklistedDuplicateIds).toContain(data.blacklistedDuplicateIds[0]);
            expect(updatedPublisher.potentialDuplicates.length).toBe(0);
            expect(updatedPublisher.name).toBe(data.data.name);
            expect(updatedPublisher.cae).toBe(data.data.cae);
            expect(updatedPublisher.linkedContracts).toEqual(data.data.linkedContracts);
            expect(updatedPublisher.foreignId).toBe(data.data.foreignId);
            expect(updatedPublisher.mainPro).toBe(data.data.mainPro);
            expect(updatedPublisher.mechanicalPro).toBe(data.data.mechanicalPro);
            expect(updatedPublisher.performancePro).toBe(data.data.performancePro);
            expect(updatedPublisher.syncPro).toBe(data.data.syncPro);
            expect(updatedPublisher.mainProIdentifier).toBe(data.data.mainProIdentifier);
            expect(updatedPublisher.mechanicalProIdentifier).toBe(data.data.mechanicalProIdentifier);
            expect(updatedPublisher.performanceProIdentifier).toBe(data.data.performanceProIdentifier);
            expect(updatedPublisher.syncProIdentifier).toBe(data.data.syncProIdentifier);
            expect(updatedPublisher.societies).toEqual(expect.arrayContaining(data.data.societies));
            expect(updatedPublisher.publisherAgreements).toEqual(expect.arrayContaining(data.data.publisherAgreements));
          });

          describe('Merge and delete', () => {
            let work1; let
              work2;
            let deliveryPartner1; let
              deliveryPartner2;
            let track1; let
              track2;
            let release1; let
              release2;
            let primary; let publisherToDelete1; let publisherToDelete2; let
              publisherToReplaceId;
            let composer1; let
              composer2;

            beforeEach(async () => {
              [primary, publisherToDelete1, publisherToDelete2, publisherToReplaceId] = publishers;

              await Publisher.updateOne({ _id: publisherToReplaceId._id }, {
                publisherAgreements: [{
                  publisherId: publisherToDelete1._id.toString(),
                  agreementType: 'Original General',
                  territory: 'WW',
                  society: 'PRS',
                  agreementNo: '1',
                }],
              });

              composer1 = await new Composer({
                clientId: client._id,
                name: testUtils.randomString(),
                interestedPartyId: testUtils.randomString(),
                cae: testUtils.randomString(),
                publisherAgreements: [{
                  publisherId: publisherToDelete1._id.toString(),
                  agreementType: 'Original General',
                  territory: 'WW',
                  society: 'PRS',
                  agreementNo: '1',
                }],
              }).save();

              composer2 = await new Composer({
                clientId: client._id,
                name: testUtils.randomString(),
                interestedPartyId: testUtils.randomString(),
                cae: testUtils.randomString(),
                publisherAgreements: [{
                  publisherId: publisherToDelete2._id.toString(),
                  agreementType: 'Original General',
                  territory: 'WW',
                  society: 'PRS',
                  agreementNo: '1',
                }],
              }).save();

              [deliveryPartner1, deliveryPartner2] = await Promise.all([
                new DeliveryPartner({
                  clientId: client._id.toString(),
                  name: testUtils.randomString(),
                  publisherId: publisherToDelete1._id.toString(),
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
                  insertionTerritory: [
                    {
                      territory: 'WW',
                      publisherId: publisherToDelete1._id.toString(),
                      category: 'Original Publisher',
                    },
                  ],
                }).save(),
                new DeliveryPartner({
                  clientId: client._id.toString(),
                  publisherId: publisherToDelete2._id.toString(),
                  name: testUtils.randomString(),
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
                  insertionTerritory: [
                    {
                      territory: 'WW',
                      publisherId: publisherToDelete2._id.toString(),
                      category: 'Original Publisher',
                    },
                  ],
                }).save(),
                new DeliveryPartner({
                  clientId: client._id.toString(),
                  name: testUtils.randomString(),
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
                }).save(),
              ]);

              work1 = new Work(worksWithChains(client._id.toString(), composer1, publisherToDelete1));
              await work1.save();

              track1 = new Track({
                clientId: client._id,
                title: testUtils.randomString(),
                isrc: testUtils.randomString(),
                mechanicalLicenses: [{
                  publisherId: publisherToDelete1._id.toString(),
                  share: 100,
                  rate: 100,
                  contractId: contract1._id.toString(),
                }],
              });

              track2 = new Track({
                clientId: client._id,
                title: testUtils.randomString(),
                isrc: testUtils.randomString(),
                mechanicalLicenses: [{
                  publisherId: publisherToDelete2._id.toString(),
                  share: 100,
                  rate: 100,
                  contractId: contract2._id.toString(),
                }],
              });

              await Promise.all([track1.save(), track2.save()]);

              release1 = new Release({
                clientId: client._id,
                title: testUtils.randomString(),
                trackIds: [track1._id.toString()],
                catNo: testUtils.randomString(),
                mechanicalLicenses: {
                  [track1._id.toString()]: {
                    reportMechanicals: true,
                    licenses: [{
                      rate: 100,
                      share: 100,
                      publisherId: publisherToDelete1._id.toString(),
                      contractId: contract1._id.toString(),
                    }],
                  },
                },
              });

              release2 = new Release({
                clientId: client._id,
                title: testUtils.randomString(),
                trackIds: [track2._id.toString()],
                catNo: testUtils.randomString(),
                mechanicalLicenses: {
                  [track2._id.toString()]: {
                    reportMechanicals: true,
                    licenses: [{
                      rate: 100,
                      share: 100,
                      publisherId: publisherToDelete2._id.toString(),
                      contractId: contract2._id.toString(),
                    }],
                  },
                },
              });

              await Promise.all([release1.save(), release2.save()]);
            });

            it('should delete the publishers when deletePublisherIds is set', async () => {
              primary.potentialDuplicates = [
                { publisherId: publisherToDelete1._id, score: 13 },
                { publisherId: publisherToDelete2._id, score: 13 },
              ];
              await primary.save();

              const data = {
                primaryPublisherId: primary._id,
                deletePublisherIds: [publisherToDelete1._id.toString(), publisherToDelete2._id.toString()],
                data: {
                  name: 'Overwritten name',
                  cae: 'cae12345',
                  linkedContractIds: [contract1._id.toString(), contract2._id.toString()],
                },
              };

              const response = await request(server)
                .post('/publishers/duplicates/merge')
                .set('applicationToken', applicationToken)
                .set('token', clientUser)
                .send(data);

              [primary] = await Publisher.find({ clientId: client._id, _id: primary._id });

              expect(response.status).toBe(200);
              expect(primary.potentialDuplicates.length).toBe(0);
              expect(primary.potentialDuplicatesCount).toBe(0);

              [deliveryPartner1, deliveryPartner2] = await DeliveryPartner.find({
                clientId: client._id.toString(),
                _id: { $in: [deliveryPartner1._id, deliveryPartner2._id] },
              });

              expect(deliveryPartner1.insertionTerritory[0].publisherId).toContain(primary._id.toString());
              expect(deliveryPartner2.insertionTerritory[0].publisherId).toContain(primary._id.toString());

              [work1] = await Work.find({ clientId: client._id.toString(), usedPublisherIds: { $in: [primary._id.toString()] } });
              expect(work1).not.toBeNull();
              expect(work1.rightsChain).toEqual(worksWithChains(client._id.toString(), composer1, primary).rightsChain);

              [track1, track2] = await Track.find({
                clientId: client._id.toString(),
                _id: { $in: [track1._id.toString(), track2._id.toString()] },
              });

              expect(track1.toObject().mechanicalLicenses).toEqual([{
                publisherId: primary._id.toString(),
                share: 100,
                rate: 100,
                contractId: contract1._id.toString(),
              }]);

              expect(track2.toObject().mechanicalLicenses).toEqual([{
                publisherId: primary._id.toString(),
                share: 100,
                rate: 100,
                contractId: contract2._id.toString(),
              }]);

              [release1, release2] = await Release.find({
                clientId: client._id.toString(),
                _id: { $in: [release1._id.toString(), release2._id.toString()] },
              });

              expect(release1.mechanicalPublisherIds.includes(primary._id.toString())).toBe(true);
              expect(release1.toObject().mechanicalLicenses[track1._id.toString()].licenses).toEqual([{
                rate: 100,
                share: 100,
                publisherId: primary._id.toString(),
                contractId: contract1._id.toString(),
              }]);

              expect(release2.mechanicalPublisherIds.includes(primary._id.toString())).toBe(true);
              expect(release2.toObject().mechanicalLicenses[track2._id.toString()].licenses).toEqual([{
                rate: 100,
                share: 100,
                publisherId: primary._id.toString(),
                contractId: contract2._id.toString(),
              }]);

              [composer1, composer2] = await Composer.find({
                clientId: client._id.toString(),
                _id: { $in: [composer1._id.toString(), composer2._id.toString()] },
              });

              expect(composer1.publisherAgreements[0].publisherId).toContain(primary._id.toString());
              expect(composer2.publisherAgreements[0].publisherId).toContain(primary._id.toString());

              publisherToReplaceId = await Publisher.findById(publisherToReplaceId);
              expect(publisherToReplaceId.publisherAgreements[0].publisherId).toContain(primary._id.toString());

              const deletedPublishersCount = await Publisher.countDocuments({
                clientId: client._id,
                _id: { $in: [publisherToDelete1._id, publisherToDelete2._id] },
              });
              expect(deletedPublishersCount).toBe(0);
            });
          });
        });
      });

      describe('/duplicates/overview POST', () => {
        let publishers;
        let contract1; let
          contract2;
        let publisher1; let
          publisher2;
        let composer1;

        beforeEach(async () => {
          contract1 = new Contract({ clientId: client._id, name: testUtils.randomString() });
          contract2 = new Contract({ clientId: client._id, name: testUtils.randomString() });
          [contract1, contract2] = await Promise.all([
            contract1.save(),
            contract2.save(),
          ]);

          publisher1 = new Publisher({ clientId: client._id, name: testUtils.randomString(), interestedPartyId: testUtils.randomString() });
          publisher2 = new Publisher({ clientId: client._id, name: testUtils.randomString(), interestedPartyId: testUtils.randomString() });
          [publisher1, publisher2] = await Promise.all([
            publisher1.save(),
            publisher2.save(),
          ]);

          publishers = generateComposers(client._id, 3).map((publisher, index) => {
            if (index === 1) {
              publisher.linkedContracts = [{ contractId: contract1._id.toString() }];
              publisher.publisherAgreements = [
                {
                  publisherId: publisher1._id.toString(),
                  agreementType: 'Original Specific',
                  territory: 'AD',
                  society: 'ABRAMUS',
                  agreementNo: '11111',
                },
              ];
              publisher.societies = [{
                society: 'SOCAN',
                identifier: '11111',
                mechanicalPro: 'ASCAP',
                performancePro: 'SOCON',
                syncPro: 'BMI',
              }];
            }
            if (index === 2) {
              publisher.linkedContracts = [{ contractId: contract2._id.toString() }];
              publisher.publisherAgreements = [
                {
                  publisherId: publisher2._id.toString(),
                  agreementType: 'Original General',
                  territory: 'AD',
                  society: 'ABRAMUS',
                  agreementNo: '222222',
                },
              ];
              publisher.societies = [{
                society: 'ACAM',
                identifier: '22222',
                mechanicalPro: 'ACCESS',
                performancePro: 'BEELDRECHT',
                syncPro: 'HDS-ZAMP',
              }];
            }
            return new Publisher(publisher).save();
          });
          publishers = await Promise.all(publishers);

          composer1 = await new Composer({
            clientId: client._id,
            name: testUtils.randomString(),
            interestedPartyId: testUtils.randomString(),
            cae: testUtils.randomString(),
          }).save();

          await Promise.all([
            new Work(worksWithChains(client._id.toString(), composer1, publishers[0])).save(),
            new Work(worksWithChains(client._id.toString(), composer1, publishers[0])).save(),
            new Work(worksWithChains(client._id.toString(), composer1, publishers[0])).save(),
            new Work(worksWithChains(client._id.toString(), composer1, publishers[0])).save(),
          ]);
        });

        it('should have the right data structure', async () => {
          const data = {
            primaryPublisherId: publishers[0]._id,
            duplicatePublishers: publishers.map(({ _id }) => ({ id: _id.toString(), selected: true })),
          };

          const response = await request(server)
            .post('/publishers/duplicates/overview')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send(data);

          expect(response.status).toBe(200);

          const { publishers: responsePublishers, options } = response.body;

          expect(options.name).toEqual(expect.arrayContaining([publishers[0].name, publishers[1].name, publishers[2].name]));
          expect(options.cae).toEqual(expect.arrayContaining([publishers[0].cae, publishers[1].cae, publishers[2].cae]));

          expect(options.linkedContracts).toHaveLength(2);
          expect(options.linkedContracts).toEqual([
            {
              publisherId: publishers[1]._id.toString(),
              publisherName: publishers[1].name,
              contractId: contract1._id.toString(),
              contractName: contract1.name,
            },
            {
              publisherId: publishers[2]._id.toString(),
              publisherName: publishers[2].name,
              contractId: contract2._id.toString(),
              contractName: contract2.name,
            },
          ]);

          expect(options.publisherAgreements).toHaveLength(2);
          expect(options.publisherAgreements).toEqual([
            publishers[1].publisherAgreements[0],
            publishers[2].publisherAgreements[0],
          ]);

          expect(options.societies).toHaveLength(2);
          expect(options.societies).toEqual([
            {
              ...publishers[1].societies[0],
              publisherId: publishers[1]._id.toString(),
              publisherName: publishers[1].name,
            },
            {
              ...publishers[2].societies[0],
              publisherId: publishers[2]._id.toString(),
              publisherName: publishers[2].name,
            },
          ]);

          expect(responsePublishers).toHaveLength(3);
          expect(responsePublishers.map(({ _id, name, cae }) => ({
            _id: _id.toString(),
            name,
            cae,
          }))).toEqual(publishers.map(({ _id, name, cae }) => ({
            _id: _id.toString(),
            name,
            cae,
          })));
          expect(responsePublishers[0].worksCount).toEqual({ controlled: 4, unControlled: 0 });
        });

        it('should error if no primary composer provided', async () => {
          const data = {
            primaryPublisherId: '',
            duplicatePublishers: publishers.map(({ _id }) => ({ id: _id.toString(), selected: true })),
          };

          const response = await request(server)
            .post('/publishers/duplicates/overview')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send(data);

          expect(response.status).toBe(400);
          expect(response.body.message).toBe('Please provide a primary publisher id');
        });

        it('should error if an invalid primary publisher is provided', async () => {
          const data = {
            primaryPublisherId: testUtils.randomId(),
            duplicatePublishers: publishers.map(({ _id }) => ({ id: _id.toString(), selected: true })),
          };

          const response = await request(server)
            .post('/publishers/duplicates/overview')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send(data);

          expect(response.status).toBe(400);
          expect(response.body.message).toBe('Please provide a valid primary publisher id');
        });

        it('should error if invalid publisherIds are provided', async () => {
          const data = {
            primaryPublisherId: publishers[0]._id,
            duplicatePublishers: [
              { id: publishers[0]._id.toString(), selected: true },
              { id: testUtils.randomId(), selected: true },
              { id: testUtils.randomId(), selected: true },
            ],
          };

          const response = await request(server)
            .post('/publishers/duplicates/overview')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send(data);

          expect(response.status).toBe(400);
          expect(response.body.message).toBe(`The following publisher IDs do not exist: ${data.duplicatePublishers[1].id}, ${data.duplicatePublishers[2].id}`);
        });
      });

      describe('/:id PUT', () => {
        describe('when a publisher is found', () => {
          it('should update with passed values only', async () => {
            const publishers = await Publisher.find({ name: publisher1.name });
            const id = publishers[0]._id;
            const changedName = `${publishers[0].name}changed`;

            const res = await request(server)
              .put(`/publishers/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .send({ name: changedName });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe(changedName);
          });

          it('should not update clientId', async () => {
            const publishers = await Publisher.find({ name: publisher1.name });
            const id = publishers[0]._id;
            const changedTitle = `${publishers[0].title}changed`;

            const res = await request(server)
              .put(`/publishers/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .send({ name: changedTitle, clientId: 'changed' });

            expect(res.body.clientId).toBe(publishers[0].clientId);
          });

          it("should not update any fields it isn't passed", async () => {
            const publishers = await Publisher.find({ clientId: client._id.toString() });
            const id = publishers[0]._id;
            const changedTitle = `${publishers[0].title}changed`;

            const res = await request(server)
              .put(`/publishers/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .send({ name: changedTitle, clientId: 'changed' });

            expect(res.body.foreignId).toBe(publishers[0].foreignId);
          });
        });

        describe('when a publisher is not found', () => {
          it('should return a 404 status', async () => {
            const id = randomId();
            const res = await request(server)
              .put(`/publishers/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .send({ title: 'Changed Publisher Title' });

            expect(res.status).toBe(404);
            expect(res.body.message).toBe(`Could not find Publisher with ID ${id}`);
          });
        });
      });

      describe('/:id DELETE', () => {
        describe('type duplicates', () => {
          it('should delete the publisher and have the correct count of duplicates and return a 200 status', async () => {
            // prepare mainPublisher w/ 4 duplicates
            const base = {
              clientId: client._id,
              name: 'Has duplicates',
              caeWithoutLeadingZeros: '',
              potentialDuplicates: [],
              interestedPartyId: '342423432342',
            };
            const all = [base, ...generateComposers(client._id, 4)];
            const saved = await Promise.all(all.map((c) => new Publisher(c).save()));
            const mainPublisher = saved[0];
            mainPublisher.potentialDuplicates = saved.slice(1).map((c) => ({
              publisherId: c._id,
              score: Math.floor(Math.random() * 3) + 13,
            }));
            await mainPublisher.save();

            const idToDelete = mainPublisher.potentialDuplicates[0].publisherId.toString();
            const res = await request(server)
              .delete('/publishers')
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .send({ ids: [idToDelete], type: 'duplicates' });

            expect(res.status).toBe(200);

            const reloadedMain = await Publisher.findById(mainPublisher._id);
            expect(reloadedMain.potentialDuplicatesCount).toBe(3);
            expect(
              reloadedMain.potentialDuplicates.some((pd) => pd.publisherId.toString() === idToDelete),
            ).toBe(false);
          });

          it('should return a 201 status when the publisher is linked to a work', async () => {
            const res = await request(server)
              .delete('/publishers')
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .send({ ids: [publisherLinkedToWork._id.toString()], type: 'duplicates' });

            expect(res.status).toEqual(201);
            expect(res.body).toEqual('Some or all of these publishers are attached to Works which will need to be detached first');

            // Confirm Publisher was not deleted
            const publisherStillExists = await Publisher.findById(publisherLinkedToWork._id);
            expect(publisherStillExists).not.toBeNull();
          });
        });

        it('should delete the publisher and return a 200 status when found', async () => {
          const res = await request(server)
            .delete('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ ids: [publisher1._id.toString()] });

          expect(res.status).toBe(200);
          expect(res.body.deletedCount).toBe(1);
        });

        it('should return a 404 status when none found', async () => {
          const res = await request(server)
            .delete('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ ids: [] });

          expect(res.status).toBe(404);
          expect(res.body.message).toBe('Could not find Publishers');
        });

        it('should return a 201 status when the publisher is linked to a work', async () => {
          const res = await request(server)
            .delete('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ ids: [publisherLinkedToWork._id.toString()] });

          expect(res.status).toEqual(201);
          expect(res.body).toEqual('Some or all of these publishers are attached to Works which will need to be detached first');

          // Confirm Publisher was not deleted
          const publisherStillExists = await Publisher.findById(publisherLinkedToWork._id);
          expect(publisherStillExists).not.toBeNull();
        });
      });

      describe('aliases', () => {
        describe('/:id GET', () => {
          it('should return aliases field in the response', async () => {
            const alias1 = randomString();
            const alias2 = randomString();
            const pub = await new Publisher({
              clientId: client._id,
              name: randomString(),
              interestedPartyId: randomString(),
              aliases: [alias1, alias2],
            }).save();

            const res = await request(server)
              .get(`/publishers/${pub._id}`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser);

            expect(res.status).toBe(200);
            expect(res.body.aliases).toEqual([alias1, alias2]);
          });

          it('should return empty aliases array when publisher has no aliases', async () => {
            const res = await request(server)
              .get(`/publishers/${publisher1._id}`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser);

            expect(res.status).toBe(200);
            expect(res.body.aliases).toEqual([]);
          });
        });

        describe('/:id PUT', () => {
          it('should update aliases on a publisher', async () => {
            const newAlias = randomString();
            const res = await request(server)
              .put(`/publishers/${publisher1._id}`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .send({ aliases: [newAlias] });

            expect(res.status).toBe(200);
            expect(res.body.aliases).toEqual([newAlias]);

            const updated = await Publisher.findById(publisher1._id);
            expect(updated.aliases).toEqual([newAlias]);
          });

          it('should return 500 when alias conflicts with another publishers alias', async () => {
            const takenAlias = randomString();
            const otherPub = await new Publisher({
              clientId: client._id,
              name: randomString(),
              interestedPartyId: randomString(),
              aliases: [takenAlias],
            }).save();

            const res = await request(server)
              .put(`/publishers/${publisher1._id}`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .send({ aliases: [takenAlias] });

            expect(res.status).toBe(500);
            expect(res.body.message).toContain(`Cannot add alias '${takenAlias}'`);
            expect(res.body.message).toContain(otherPub.name);
          });

          it('should return 500 when alias matches another publishers primary name', async () => {
            const res = await request(server)
              .put(`/publishers/${publisher1._id}`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .send({ aliases: [publisher2.name] });

            expect(res.status).toBe(500);
            expect(res.body.message).toContain(`Cannot add alias '${publisher2.name}'`);
            expect(res.body.message).toContain('primary name of another publisher');
          });
        });
      });

      describe('/ POST', () => {
        it('should return a publisher created with the passed parameters', async () => {
          const params = {
            name: randomString(),
            cae: randomString(),
            foreignId: randomString(),
            mainPro: randomString(),
            mechanicalPro: randomString(),
            performancePro: randomString(),
            syncPro: randomString(),
            mainProIdentifier: randomString(),
            mechanicalProIdentifier: randomString(),
            performanceProIdentifier: randomString(),
            syncProIdentifier: randomString(),
            controlled: true,
            notes: randomString(),
          };

          const [{ partyNo: latestPartyNo }] = await Publisher
            .find({ clientId: client._id.toString() }, { partyNo: 1 })
            .sort({ partyNo: -1 })
            .limit(1);

          const res = await request(server)
            .post('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send(params);

          expect(res.status).toBe(200);
          expect(res.body.clientId).toBe(client._id.toString());
          expect(res.body.foreignId).toBe(params.foreignId);
          expect(res.body.partyNo).toBe(latestPartyNo + 1);
          expect(res.body.name).toBe(params.name);
          expect(res.body.cae).toBe(params.cae);
          expect(res.body.mainPro).toBe(params.mainPro);
          expect(res.body.mechanicalPro).toBe(params.mechanicalPro);
          expect(res.body.performancePro).toBe(params.performancePro);
          expect(res.body.syncPro).toBe(params.syncPro);
          expect(res.body.mainProIdentifier).toBe(params.mainProIdentifier);
          expect(res.body.mechanicalProIdentifier).toBe(params.mechanicalProIdentifier);
          expect(res.body.performanceProIdentifier).toBe(params.performanceProIdentifier);
          expect(res.body.syncProIdentifier).toBe(params.syncProIdentifier);
          expect(res.body.controlled).toBe(params.controlled);
          expect(res.body.notes).toBe(params.notes);
        });

        it('should add the publisher to the database', async () => {
          const initialPublishers = await Publisher.find({ clientId: client._id.toString() });
          const params = { name: randomString(), cae: randomString() };

          await request(server)
            .post('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send(params);

          const newPublishers = await Publisher.find({ clientId: client._id.toString() });
          expect(newPublishers.length).toBe(initialPublishers.length + 1);
        });

        it('should create a publisher with aliases', async () => {
          const alias1 = randomString();
          const alias2 = randomString();
          const params = {
            name: randomString(),
            cae: randomString(),
            aliases: [alias1, alias2],
          };

          const res = await request(server)
            .post('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send(params);

          expect(res.status).toBe(200);
          expect(res.body.aliases).toEqual([alias1, alias2]);
        });

        it('should return 500 when creating publisher with alias that conflicts with existing alias', async () => {
          const takenAlias = randomString();
          const otherPub = await new Publisher({
            clientId: client._id,
            name: randomString(),
            interestedPartyId: randomString(),
            aliases: [takenAlias],
          }).save();

          const params = {
            name: randomString(),
            cae: randomString(),
            aliases: [takenAlias],
          };

          const res = await request(server)
            .post('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send(params);

          expect(res.status).toBe(500);
          expect(res.body.message).toContain(`Cannot add alias '${takenAlias}'`);
          expect(res.body.message).toContain(otherPub.name);
        });

        it('should return 500 when creating publisher with alias matching another publishers primary name', async () => {
          const params = {
            name: randomString(),
            cae: randomString(),
            aliases: [publisher2.name],
          };

          const res = await request(server)
            .post('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send(params);

          expect(res.status).toBe(500);
          expect(res.body.message).toContain(`Cannot add alias '${publisher2.name}'`);
          expect(res.body.message).toContain('primary name of another publisher');
        });
      });

      describe('/import POST', () => {
        describe('when a file is passed', () => {
          it('should give a 200', async () => {
            const res = await request(server)
              .post('/publishers/import')
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .attach('file', 'routes/publishers/test-data/test_publisher.xlsx');

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Publishers are importing, and a report will be sent to you shortly.');
          });

          it('should call importFromExcel with the uploaded file', async () => {
            await request(server)
              .post('/publishers/import')
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .attach('file', 'routes/publishers/test-data/test_publisher.xlsx')
              .field('clientType', 'Publisher');

            expect(importFromExcelSpy).toHaveBeenCalled();
          });
        });

        describe('when no file is uploaded', () => {
          it('should return an error without a file in the request', async () => {
            const res = await request(server)
              .post('/publishers/import')
              .set('applicationToken', applicationToken)
              .set('token', clientUser);

            expect(res.status).toBe(400);
            expect(res.body.errors).toEqual(['Requires a file to be uploaded']);
          });
        });
      });

      describe('/export POST', () => {
        it('should return 200', async () => {
          const publishers = await Publisher.find({ clientId: client._id.toString() });
          const id = publishers[0]._id;

          const res = await request(server)
            .post('/publishers/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ ids: [id], clientType: 'admin' });

          expect(res.status).toBe(200);
        });

        it('should call sendExport', async () => {
          await request(server)
            .post('/publishers/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
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
            .post('/publishers/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ clientType: 'Publisher', filter: {} });
          expect(res.status).toBe(200);
          expect(res.body.message).toEqual('Your report will be sent to you via email shortly');
        });

        it('should return 200 with csvPublicLink when sync=true', async () => {
          const res = await request(server)
            .post('/publishers/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ sync: true, clientType: 'Publisher', filter: {} });
          expect(res.status).toBe(200);
          expect(res.body.csvPublicLink).toEqual('https://s3.amazonaws.com/test-export.csv');
        });

        it('should call CSVRawExport with sync=true when body param set', async () => {
          await request(server)
            .post('/publishers/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ sync: true, clientType: 'Publisher', filter: {} });
          expect(mockCSVRawExport).toHaveBeenCalledWith(
            expect.objectContaining({
              sync: true,
            }),
          );
        });

        it('should return 500 when CSVRawExport throws in sync mode', async () => {
          mockCSVRawExport.mockRejectedValue(new Error('Export failed'));
          const res = await request(server)
            .post('/publishers/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ sync: true, clientType: 'Publisher', filter: {} });
          expect(res.status).toBe(500);
          expect(res.body.message).toEqual('Export failed');
        });

        it('should pass ids filter to CSVRawExport', async () => {
          const id = publisher1._id.toString();
          await request(server)
            .post('/publishers/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ sync: true, clientType: 'Publisher', ids: [id] });
          expect(mockCSVRawExport).toHaveBeenCalledWith(
            expect.objectContaining({
              filter: expect.objectContaining({
                _id: { $in: [id] },
              }),
            }),
          );
        });

        it('should include clientId in filter', async () => {
          await request(server)
            .post('/publishers/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ clientType: 'Publisher', filter: {} });
          expect(mockCSVRawExport).toHaveBeenCalledWith(
            expect.objectContaining({
              filter: expect.objectContaining({
                clientId: expect.anything(),
              }),
            }),
          );
        });

        it('should return 403 when clientType is missing', async () => {
          const res = await request(server)
            .post('/publishers/raw-export')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ filter: {} });
          expect(res.status).toBe(403);
        });
      });
    });

    describe('as a user with None rights', () => {
      let userNone;
      beforeEach(() => {
        userNone = {
          id: user._id, internal: false, parentId: null, clientId: null, rights: {},
        };
        userNone.rights[client._id] = {
          sales: 'None', contracts: 'None', periods: 'None', catalogue: 'None',
        };
      });

      describe('/ GET', () => {
        it('should return 403', async () => {
          const clientUserNone = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
          const publishers = await Publisher.find({ clientId: client._id.toString() });
          const res = await request(server)
            .get('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);

          expect(res.status).toBe(403);
        });
      });

      describe('/:id GET', () => {
        it('should return 403', async () => {
          const clientUserNone = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
          const publishers = await Publisher.find({ clientId: client._id.toString() });
          const id = publishers[0]._id;
          const res = await request(server)
            .get(`/publishers/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);

          expect(res.status).toBe(403);
        });
      });

      describe('/:id PUT', () => {
        it('should return 403', async () => {
          const clientUserNone = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
          const publishers = await Publisher.find({ clientId: client._id.toString() });
          const id = publishers[0]._id;
          const res = await request(server)
            .put(`/publishers/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send({ name: 'changedName' });

          expect(res.status).toBe(403);
        });
      });

      describe('/:id DELETE', () => {
        it('should return 403', async () => {
          const clientUserNone = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
          const res = await request(server)
            .delete('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);

          expect(res.status).toBe(403);
        });
      });

      describe('/ POST', () => {
        it('should return 403', async () => {
          const clientUserNone = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
          const params = {
            name: randomString(),
            cae: randomString(),
          };
          const res = await request(server)
            .post('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send(params);

          expect(res.status).toBe(403);
        });
      });

      describe('/import POST', () => {
        it('should give a 403', async () => {
          const clientUserNone = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
          const res = await request(server)
            .post('/publishers/import')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .attach('file', 'routes/publishers/test-data/test_publisher.xlsx');

          expect(res.status).toBe(403);
        });
      });

      describe('/export POST', () => {
        it('should return 403', async () => {
          const clientUserNone = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
          const res = await request(server)
            .post('/publishers/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);

          expect(res.status).toBe(403);
        });
      });
    });

    describe('as a user with View rights', () => {
      let userView; let clientUserView;
      beforeEach(() => {
        userView = {
          id: user._id, internal: false, parentId: null, clientId: client._id, rights: {},
        };
        userView.rights[client._id] = {
          sales: 'View', contracts: 'View', periods: 'View', catalogue: 'View',
        };
        clientUserView = jwt.sign(userView, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/ GET', () => {
        it('should return 200', async () => {
          const res = await request(server)
            .get('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);

          expect(res.status).toBe(200);
        });
      });

      describe('/:id GET', () => {
        it('should return 200', async () => {
          const publishers = await Publisher.find({ clientId: client._id.toString() });
          const id = publishers[0]._id;
          const res = await request(server)
            .get(`/publishers/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);

          expect(res.status).toBe(200);
        });
      });

      describe('/:id PUT', () => {
        it('should return 403', async () => {
          const publishers = await Publisher.find({ clientId: client._id.toString() });
          const id = publishers[0]._id;
          const res = await request(server)
            .put(`/publishers/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send({ name: 'changedName' });

          expect(res.status).toBe(403);
        });
      });

      describe('/:id DELETE', () => {
        it('should return 403', async () => {
          const res = await request(server)
            .delete('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);

          expect(res.status).toBe(403);
        });
      });

      describe('/ POST', () => {
        it('should return 403', async () => {
          const params = {
            clientId: client._id.toString(),
            foreignId: 'foreignId',
            partyNo: 2,
            payeeId: 'payeeId',
            name: 'name',
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
            .post('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send(params);

          expect(res.status).toBe(403);
        });
      });

      describe('/import POST', () => {
        it('should give a 403', async () => {
          const res = await request(server)
            .post('/publishers/import')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .attach('file', 'routes/publishers/test-data/test_publisher.xlsx');

          expect(res.status).toBe(403);
        });
      });

      describe('/export POST', () => {
        it('should return 200', async () => {
          const publishers = await Publisher.find({ clientId: client._id.toString() });
          const id = publishers[0]._id;
          const res = await request(server)
            .post('/publishers/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send({ clientType: 'Admin', ids: [id] });

          expect(res.status).toBe(200);
        });

        it('should call sendExport', async () => {
          await request(server)
            .post('/publishers/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send({ clientType: 'Publisher', filter: { ids: [] } });

          expect(sendExportSpy).toHaveBeenCalled();
        });
      });
    });

    describe('as a user with Edit rights', () => {
      let clientUserEdit; let userEdit;
      beforeEach(() => {
        userEdit = {
          id: user._id, internal: false, parentId: null, clientId: client._id, rights: {},
        };
        userEdit.rights[client._id] = {
          sales: 'Edit', contracts: 'Edit', periods: 'Edit', catalogue: 'Edit',
        };
        clientUserEdit = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/ GET', () => {
        it('should return 200', async () => {
          const res = await request(server)
            .get('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);

          expect(res.status).toBe(200);
        });
      });

      describe('/:id PUT', () => {
        it('should return 200', async () => {
          const publishers = await Publisher.find({ clientId: client._id.toString() });
          const id = publishers[0]._id;
          const res = await request(server)
            .put(`/publishers/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ name: 'changedName' });

          expect(res.status).toBe(200);
        });
      });

      describe('/:id DELETE', () => {
        describe('type duplicates', () => {
          it('should delete the publisher and have the correct count of duplicates and return a 200 status', async () => {
            // prepare mainPublisher w/ 4 duplicates
            const base = {
              clientId: client._id,
              name: 'Has duplicates',
              caeWithoutLeadingZeros: '',
              potentialDuplicates: [],
              interestedPartyId: '342423432342',
            };
            const all = [base, ...generateComposers(client._id, 4)];
            const saved = await Promise.all(all.map((c) => new Publisher(c).save()));
            const mainPublisher = saved[0];
            mainPublisher.potentialDuplicates = saved.slice(1).map((c) => ({
              publisherId: c._id,
              score: Math.floor(Math.random() * 3) + 13,
            }));
            await mainPublisher.save();

            const idToDelete = mainPublisher.potentialDuplicates[0].publisherId.toString();
            const res = await request(server)
              .delete('/publishers')
              .set('applicationToken', applicationToken)
              .set('token', clientUserEdit)
              .send({ ids: [idToDelete], type: 'duplicates' });

            expect(res.status).toBe(200);

            const reloadedMain = await Publisher.findById(mainPublisher._id);
            expect(reloadedMain.potentialDuplicatesCount).toBe(3);
            expect(
              reloadedMain.potentialDuplicates.some((pd) => pd.publisherId.toString() === idToDelete),
            ).toBe(false);
          });

          it('should return a 201 status when the publisher is linked to a work', async () => {
            const res = await request(server)
              .delete('/publishers')
              .set('applicationToken', applicationToken)
              .set('token', clientUserEdit)
              .send({ ids: [publisherLinkedToWork._id.toString()], type: 'duplicates' });

            expect(res.status).toEqual(201);
            expect(res.body).toEqual('Some or all of these publishers are attached to Works which will need to be detached first');

            // Confirm Publisher was not deleted
            const publisherStillExists = await Publisher.findById(publisherLinkedToWork._id);
            expect(publisherStillExists).not.toBeNull();
          });
        });

        it('should delete the publisher and return a 200 status when found', async () => {
          const res = await request(server)
            .delete('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ ids: [publisher1._id.toString()] });

          expect(res.status).toBe(200);
          expect(res.body.deletedCount).toBe(1);
        });

        it('should return a 404 status when none found', async () => {
          const res = await request(server)
            .delete('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ ids: [] });

          expect(res.status).toBe(404);
          expect(res.body.message).toBe('Could not find Publishers');
        });

        it('should return a 201 status when the publisher is linked to a work', async () => {
          const res = await request(server)
            .delete('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ ids: [publisherLinkedToWork._id.toString()] });

          expect(res.status).toEqual(201);
          expect(res.body).toEqual('Some or all of these publishers are attached to Works which will need to be detached first');

          // Confirm Publisher was not deleted
          const publisherStillExists = await Publisher.findById(publisherLinkedToWork._id);
          expect(publisherStillExists).not.toBeNull();
        });
      });

      describe('/ POST', () => {
        it('should return 200 and create the correct publisher', async () => {
          const params = {
            name: randomString(),
            cae: randomString(),
            foreignId: randomString(),
            mainPro: randomString(),
            mechanicalPro: randomString(),
            performancePro: randomString(),
            syncPro: randomString(),
            mainProIdentifier: randomString(),
            mechanicalProIdentifier: randomString(),
            performanceProIdentifier: randomString(),
            syncProIdentifier: randomString(),
            controlled: true,
            notes: randomString(),
          };

          const [{ partyNo: latestPartyNo }] = await Publisher
            .find({ clientId: client._id.toString() }, { partyNo: 1 })
            .sort({ partyNo: -1 })
            .limit(1);

          const res = await request(server)
            .post('/publishers')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send(params);

          expect(res.status).toBe(200);
          expect(res.body.clientId).toBe(client._id.toString());
          expect(res.body.foreignId).toBe(params.foreignId);
          expect(res.body.partyNo).toBe(latestPartyNo + 1);
          expect(res.body.name).toBe(params.name);
          expect(res.body.cae).toBe(params.cae);
          expect(res.body.mainPro).toBe(params.mainPro);
          expect(res.body.mechanicalPro).toBe(params.mechanicalPro);
          expect(res.body.performancePro).toBe(params.performancePro);
          expect(res.body.syncPro).toBe(params.syncPro);
          expect(res.body.mainProIdentifier).toBe(params.mainProIdentifier);
          expect(res.body.mechanicalProIdentifier).toBe(params.mechanicalProIdentifier);
          expect(res.body.performanceProIdentifier).toBe(params.performanceProIdentifier);
          expect(res.body.syncProIdentifier).toBe(params.syncProIdentifier);
          expect(res.body.controlled).toBe(params.controlled);
          expect(res.body.notes).toBe(params.notes);
        });
      });

      describe('/import POST', () => {
        it('should give a 200', async () => {
          const clientUserEdit = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });
          const res = await request(server)
            .post('/publishers/import')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .attach('file', 'routes/publishers/test-data/test_publisher.xlsx');

          expect(res.status).toBe(200);
        });
      });

      describe('/export POST', () => {
        it('should return 200', async () => {
          const publishers = await Publisher.find({ clientId: client._id.toString() });
          const id = publishers[0]._id;
          const res = await request(server)
            .post('/publishers/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ clientType: 'Admin', ids: [id] });

          expect(res.status).toBe(200);
        });

        it('should call sendExport', async () => {
          await request(server)
            .post('/publishers/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ clientType: 'Publisher', filter: { ids: [] } });

          expect(sendExportSpy).toHaveBeenCalled();
        });
      });
    });
  });

  describe('as an internal user', () => {
    let internal;

    beforeEach(() => {
      internal = jwt.sign({ internal: true }, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/ GET', () => {
      it('should return a 403 forbidden response', async () => {
        const userToken = {
          id: user._id,
          internal: false,
          parentId: null,
          clientId: client._id,
          email: 'test-upload@curve.com',
          rights: {},
        };
        const token = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });

        const res = await request(server)
          .get('/publishers')
          .set('applicationToken', applicationToken)
          .set('token', token);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id GET', () => {
      it('should return a 403 forbidden response', async () => {
        const publishers = await Publisher.find({ clientId: client._id.toString() });
        const id = publishers[0]._id;
        const res = await request(server)
          .get(`/publishers/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', internal);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id PUT', () => {
      it('should return a 403 forbidden response', async () => {
        const publishers = await Publisher.find({ clientId: client._id.toString() });
        const id = publishers[0]._id;
        const res = await request(server)
          .put(`/publishers/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .send({ title: 'Changed Title' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not update the publisher', async () => {
        const publishers = await Publisher.find({ clientId: client._id.toString() });
        const id = publishers[0]._id;

        await request(server)
          .put(`/publishers/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .send({ title: 'Changed Title' });

        const newPublishers = await Publisher.find({ _id: id });
        expect(newPublishers[0].title).toBe(publishers[0].title);
      });
    });

    describe('/:id DELETE', () => {
      it('should return a 403 forbidden response', async () => {
        const publishers = await Publisher.find({ clientId: client._id.toString() });
        const id = publishers[0]._id;
        const res = await request(server)
          .delete('/publishers/')
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .send({ ids: [id] });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not delete the publisher', async () => {
        const publishers = await Publisher.find({ clientId: client._id.toString() });
        const id = publishers[0]._id;

        await request(server)
          .delete(`/publishers/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', internal);

        const count = await Publisher.countDocuments({ _id: id });
        expect(count).toBe(1);
      });
    });

    describe('/ POST', () => {
      it('should return a 403 forbidden response', async () => {
        const userToken = {
          id: user._id,
          internal: false,
          parentId: null,
          clientId: client._id,
          email: 'test-upload@curve.com',
          rights: {},
        };
        const token = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });

        const res = await request(server)
          .post('/publishers')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ name: 'Changed Title' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not create a publisher', async () => {
        const publishers = await Publisher.find({ clientId: client._id.toString() });
        const countBefore = publishers.length;

        await request(server)
          .post(`/publishers/${publishers[0]._id}`)
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .send({ title: 'Changed Title' });

        const countAfter = await Publisher.countDocuments({ clientId: client._id.toString() });
        expect(countAfter).toBe(countBefore);
      });
    });

    describe('/import POST', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .post('/publishers/import')
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .attach('file', 'routes/publishers/test-data/test_publisher.xlsx');

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not import a publisher', async () => {
        const publishers = await Publisher.find({ clientId: client._id.toString() });
        const countBefore = publishers.length;

        await request(server)
          .post('/publishers/import')
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .attach('file', 'routes/publishers/test-data/test_publisher.xlsx');

        const countAfter = await Publisher.countDocuments({ clientId: client._id.toString() });
        expect(countAfter).toBe(countBefore);
      });
    });

    describe('/export POST', () => {
      it('should return a 403', async () => {
        const res = await request(server)
          .post('/publishers/export')
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
        const res = await request(server)
          .get('/publishers')
          .set('applicationToken', applicationToken)
          .set('token', parent);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id GET', () => {
      it('should return a 403 forbidden response', async () => {
        const publishers = await Publisher.find({ clientId: client._id.toString() });
        const id = publishers[0]._id;
        const res = await request(server)
          .get(`/publishers/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', parent);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id PUT', () => {
      it('should return a 403 forbidden response', async () => {
        const publishers = await Publisher.find({ clientId: client._id.toString() });
        const id = publishers[0]._id;
        const res = await request(server)
          .put(`/publishers/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ title: 'Changed Title' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not update the publisher', async () => {
        const publishers = await Publisher.find({ clientId: client._id.toString() });
        const id = publishers[0]._id;

        await request(server)
          .put(`/publishers/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ title: 'Changed Title' });

        const newPublisher = await Publisher.findById(id);
        expect(newPublisher.title).toBe(publishers[0].title);
      });
    });

    describe('/:id DELETE', () => {
      it('should return a 403 forbidden response', async () => {
        const publishers = await Publisher.find({ clientId: client._id.toString() });
        const id = publishers[0]._id;
        const res = await request(server)
          .delete('/publishers')
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ ids: [id] });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not delete the publisher', async () => {
        const publishers = await Publisher.find({ clientId: client._id.toString() });
        const id = publishers[0]._id;

        await request(server)
          .delete(`/publishers/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', parent);

        const count = await Publisher.countDocuments({ _id: id });
        expect(count).toBe(1);
      });
    });

    describe('/ POST', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .post('/publishers')
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ title: 'Changed Title' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not create a publisher', async () => {
        const publishers = await Publisher.find({ clientId: client._id.toString() });
        const countBefore = publishers.length;

        await request(server)
          .post(`/publishers/${publishers[0]._id}`)
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ title: 'Changed Title' });

        const countAfter = await Publisher.countDocuments({ clientId: client._id.toString() });
        expect(countAfter).toBe(countBefore);
      });
    });

    describe('/import POST', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .post('/publishers/import')
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .attach('file', 'routes/publishers/test-data/test_publisher.xlsx');

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not import a publisher', async () => {
        const publishers = await Publisher.find({ clientId: client._id.toString() });
        const countBefore = publishers.length;

        await request(server)
          .post('/publishers/import')
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .attach('file', 'routes/publishers/test-data/test_publisher.xlsx');

        const countAfter = await Publisher.countDocuments({ clientId: client._id.toString() });
        expect(countAfter).toBe(countBefore);
      });
    });

    describe('/export POST', () => {
      it('should return a 403', async () => {
        const res = await request(server)
          .post('/publishers/export')
          .set('applicationToken', applicationToken)
          .set('token', parent);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });
  });

  describe('as a payee user', () => {
    const contractId = randomId();
    const contractIds = [contractId, randomId()];
    let payeeToken;

    beforeEach(async () => {
      const payee = new Payee({ name: 'Payee Login', clientId: client._id });
      const savedPayee = await payee.save();
      payeeToken = jwt.sign({
        internal: false, parentId: null, payeeId: savedPayee._id, contractIds,
      }, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/ GET', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .get('/publishers')
          .set('applicationToken', applicationToken)
          .set('token', payeeToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id PUT', () => {
      it('should return a 403 forbidden response', async () => {
        const publishers = await Publisher.find({ clientId: client._id.toString() });
        const id = publishers[0]._id;
        const res = await request(server)
          .put(`/publishers/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', payeeToken)
          .send({ name: 'Changed Title' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not update the publisher', async () => {
        const publishers = await Publisher.find({ clientId: client._id.toString() });
        const id = publishers[0]._id;

        await request(server)
          .put(`/publishers/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', payeeToken)
          .send({ name: 'Changed Title' });

        const newPublishers = await Publisher.find({ _id: id });
        expect(newPublishers[0].name).toBe(publishers[0].name);
      });
    });

    describe('/:id DELETE', () => {
      it('should return a 403 forbidden response', async () => {
        const publishers = await Publisher.find({ clientId: client._id.toString() });
        const id = publishers[0]._id;
        const res = await request(server)
          .delete('/publishers')
          .set('applicationToken', applicationToken)
          .set('token', payeeToken)
          .send({ ids: [id] });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not delete the publisher', async () => {
        const publishers = await Publisher.find({ clientId: client._id.toString() });
        const id = publishers[0]._id;

        await request(server)
          .delete(`/publishers/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', payeeToken);

        const count = await Publisher.countDocuments({ _id: id });
        expect(count).toBe(1);
      });
    });

    describe('/ POST', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .post('/publishers')
          .set('applicationToken', applicationToken)
          .set('token', payeeToken)
          .send({ title: 'Changed Title' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not create a publisher', async () => {
        const publishers = await Publisher.find({ clientId: client._id.toString() });
        const countBefore = publishers.length;

        await request(server)
          .post(`/publishers/${publishers[0]._id}`)
          .set('applicationToken', applicationToken)
          .set('token', payeeToken)
          .send({ title: 'Changed Title' });

        const countAfter = await Publisher.countDocuments({ clientId: client._id.toString() });
        expect(countAfter).toBe(countBefore);
      });
    });

    describe('/import POST', () => {
      it('should return 403', async () => {
        const res = await request(server)
          .post('/publishers/import')
          .set('applicationToken', applicationToken)
          .set('token', payeeToken)
          .attach('file', 'routes/publishers/test-data/test_publisher.xlsx');

        expect(res.status).toBe(403);
      });
    });

    describe('/export POST', () => {
      it('should return 403', async () => {
        const res = await request(server)
          .post('/publishers/export')
          .set('applicationToken', applicationToken)
          .set('token', payeeToken);

        expect(res.status).toBe(403);
      });
    });
  });
});
