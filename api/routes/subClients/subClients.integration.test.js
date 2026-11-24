const { cleanUpAsync, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { ObjectId } = require('mongodb');
const chai = require('chai');
const chaiHttp = require('chai-http');
const jwt = require('jsonwebtoken');
const config = require('../../config.json');
const server = require('../../index');
const Client = require('../../models/client');
const SubClient = require('../../models/subClient');
const Payee = require('../../models/payee');
const User = require('../../models/user');
const Contract = require('../../models/contract');
const Track = require('../../models/track');
const { createSubClient } = require('../../controllers/subClient');

chai.use(chaiHttp);
const { expect } = chai;

describe('/subClients', () => {
  let clientId;
  let applicationToken;
  let userToken;
  let curveUser;
  beforeEach(async () => {
    clientId = new ObjectId();
    curveUser = {
      id: new ObjectId(),
      clientId,
      email: 'test-user@curve.com',
    };
    await Client.create({ _id: clientId, name: `Test Client-${randomString()}`, createdBigQueryTables: true, createdBigQueryBackups: true });
    applicationToken = config.applicationTokens[0];
    userToken = jwt.sign(curveUser, process.env.jsonSecretToken, { expiresIn: 86400 });
  });

  afterEach(async () => {
    await cleanUpAsync(clientId.toString());
  });

  describe('POST /subClients', () => {
    it('should create a subClient, payee, and contract', async () => {
      const payload = {
        name: 'Test SubClient',
        subOrgId: 'TestSubOrg123',
        salesTerms: {
          territory: 'WW',
          catType: 'All',
          catalogueGroup: 'All',
          channel: 'All',
          configuration: 'All',
          priceCategory: 'All',
          source: 'All',
          type: 'Net Receipts',
          rate: 100,
        },
      };

      const res = await chai.request(server)
        .post('/subClients')
        .set('applicationToken', applicationToken)
        .set('token', userToken)
        .send(payload);

      expect(res.status).to.equal(200);
      expect(res.body.subClient).to.be.an('object');
      expect(res.body.subClient.name).to.equal(payload.name);
      expect(res.body.subClient).to.haveOwnProperty('payeeId');
      expect(res.body.subClient).to.haveOwnProperty('contractId');

      const subClient = await SubClient.findOne({ clientId, name: payload.name });
      const payee = await Payee.findOne({ clientId, name: payload.name });
      const contract = await Contract.findOne({ clientId, name: payload.name });

      expect(subClient).to.not.be.null;
      expect(payee).to.not.be.null;
      expect(contract).to.not.be.null;
    });

    it('should return error if subClient already exists', async () => {
      const payload = {
        name: 'Duplicate SubClient',
        subOrgId: 'DuplicateSubOrg123',
        salesTerms: {
          territory: 'WW',
          catType: 'All',
          catalogueGroup: 'All',
          channel: 'All',
          configuration: 'All',
          priceCategory: 'All',
          source: 'All',
          type: 'Net Receipts',
          rate: 100,
        },
      };

      await SubClient.create({ clientId, name: payload.name, subOrgId: payload.subOrgId });

      const res = await chai.request(server)
        .post('/subClients')
        .set('applicationToken', applicationToken)
        .set('token', userToken)
        .send(payload);

      expect(res.status).to.equal(400);
      expect(res.body.code).to.equal('FORB02');
      expect(res.body.message).to.equal('SubClient already exists');
    });

    it('should return error if required fields are missing', async () => {
      const res = await chai.request(server)
        .post('/subClients')
        .set('applicationToken', applicationToken)
        .set('token', userToken)
        .send({ name: 'Invalid SubClient' });

      expect(res.status).to.equal(400);
      expect(res.body.code).to.equal('ITEM03');
      expect(res.body.message).to.equal('Name, subOrgId and salesTerms are required');
    });

    it('should roll back if contract creation fails', async () => {
      const payload = {
        name: 'Rollback Test',
        subOrgId: 'RollbackSubOrg123',
        salesTerms: {
          territory: 'WW',
          catType: 'All',
          catalogueGroup: 'All',
          channel: 'All',
          configuration: 'All',
          priceCategory: 'All',
          source: 'All',
          type: 'Net Receipts',
          rate: 100,
        },
      };

      const originalSave = Contract.prototype.save;
      Contract.prototype.save = () => { throw new Error('Simulated Contract Failure'); };

      const res = await chai.request(server)
        .post('/subClients')
        .set('applicationToken', applicationToken)
        .set('token', userToken)
        .send(payload);

      expect(res.status).to.equal(500);

      const subClient = await SubClient.findOne({ clientId, name: payload.name });
      const payee = await Payee.findOne({ clientId, name: payload.name });
      const contract = await Contract.findOne({ clientId, name: payload.name });

      expect(subClient).to.be.null;
      expect(payee).to.be.null;
      expect(contract).to.be.null;

      Contract.prototype.save = originalSave;
    });
  });
  describe('POST /subClients/:id/payee', function () {
    describe('createUser = true, default behaviour', function () {
      it('should create a new split payee and link it to the subClient', async () => {
        const subClientPayload = {
          name: 'Test SubClient',
          subOrgId: 'TestSubOrg123',
          salesTerms: { territory: 'WW', catType: 'All', catalogueGroup: 'All', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 100 },
        };
        const payeePayload = { name: 'New Payee', email: 'payee@example.com' };

        await createSubClient({ curveUser, newSubClient: subClientPayload });

        const res = await chai.request(server).post(`/subClients/${subClientPayload.subOrgId}/payee`).set('applicationToken', applicationToken).set('token', userToken)
          .send(payeePayload);
        expect(res.status).to.equal(200);
        expect(res.body.splitPayee.name).to.equal(payeePayload.name);

        const payee = await Payee.findOne({ clientId, name: payeePayload.name });
        const contract = await Contract.findOne({ name: `${payeePayload.name} - ${subClientPayload.name}` });

        expect(payee).to.not.be.null;
        expect(contract).to.not.be.null;
      });

      it('should fail if no main contract exists for subClient', async () => {
        const subOrgId = `NoMain-${randomString(6)}`;
        const subClient = await SubClient.create({ clientId, name: 'NoMainSubClient', subOrgId });

        await Contract.create({
          clientId,
          subClientId: subClient._id,
          isMainSubClientContract: false,
          name: 'NonMainContract',
        });

        const res = await chai.request(server)
          .post(`/subClients/${subOrgId}/payee`)
          .set('applicationToken', applicationToken)
          .set('token', userToken)
          .send({ name: 'NoMainPayee', email: 'nomail@example.com' });

        expect(res.status).to.equal(400);
        expect(res.body.code).to.equal('ITEM02');
        expect(res.body.message).to.equal('Sub-organisation contract not found');
      });

      it('should create a new contract if payee and user exist and are linked', async () => {
        const subClientPayload1 = {
          name: 'SubClient A',
          subOrgId: 'SubOrgA',
          salesTerms: { territory: 'WW', catType: 'All', catalogueGroup: 'All', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 100 },
        };
        const subClientPayload2 = {
          name: 'SubClient B',
          subOrgId: 'SubOrgB',
          salesTerms: subClientPayload1.salesTerms,
        };
        const payeePayload = { name: 'Linked Payee', email: 'linked@example.com' };

        await createSubClient({ curveUser, newSubClient: subClientPayload1 });
        await chai.request(server).post(`/subClients/${subClientPayload1.subOrgId}/payee`).set('applicationToken', applicationToken).set('token', userToken)
          .send(payeePayload);

        await createSubClient({ curveUser, newSubClient: subClientPayload2 });
        const res = await chai.request(server).post(`/subClients/${subClientPayload2.subOrgId}/payee`).set('applicationToken', applicationToken).set('token', userToken)
          .send(payeePayload);
        expect(res.status).to.equal(200);

        const payee = await Payee.findOne({ clientId, name: payeePayload.name });
        const contract = await Contract.findOne({ payees: { $elemMatch: { payeeId: payee._id.toString() } } });
        expect(contract).to.not.be.null;
      });

      it('should return error if user is not linked to payee', async () => {
        const subClientPayload = {
          name: 'SubClient X',
          subOrgId: 'SubOrgX',
          salesTerms: { territory: 'WW', catType: 'All', catalogueGroup: 'All', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 100 },
        };
        const payeePayload = {
          name: `Unlinked Payee ${randomString(8)}`,
          email: `unlinked-${randomString(8)}@example.com`,
        };

        await createSubClient({ curveUser, newSubClient: subClientPayload });
        await Payee.create({ clientId, name: payeePayload.name, email: payeePayload.email });

        await User.create({
          clientId,
          email: payeePayload.email,
          payeeIds: ['12345'],
        });

        const res = await chai.request(server)
          .post(`/subClients/${subClientPayload.subOrgId}/payee`)
          .set('applicationToken', applicationToken)
          .set('token', userToken)
          .send(payeePayload);

        expect(res.status).to.equal(409);
        expect(res.body.code).to.equal('FORB01');
        expect(res.body.message).to.equal('Payee not linked to provided user email');
      });

      it('should return error if payee exists but user does not', async () => {
        const subClientPayload = {
          name: 'SubClient Y',
          subOrgId: 'SubOrgY',
          salesTerms: { territory: 'WW', catType: 'All', catalogueGroup: 'All', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 100 },
        };
        const payeePayload = { name: 'Orphan Payee', email: 'orphan@example.com' };

        await createSubClient({ curveUser, newSubClient: subClientPayload });
        await Payee.create({ clientId, name: payeePayload.name, email: payeePayload.email });

        const res = await chai.request(server).post(`/subClients/${subClientPayload.subOrgId}/payee`).set('applicationToken', applicationToken).set('token', userToken)
          .send(payeePayload);
        expect(res.status).to.equal(409);
        expect(res.body.code).to.equal('FORB01');
        expect(res.body.message).to.equal('Payee exists but user does not exist');
      });

      it('should return error if subClient does not exist', async () => {
        const payeePayload = { name: 'Invalid SubClient Payee', email: 'invalid@example.com' };
        const res = await chai.request(server).post('/subClients/NonExistentSubOrg/payee').set('applicationToken', applicationToken).set('token', userToken)
          .send(payeePayload);

        expect(res.status).to.equal(400);
        expect(res.body.code).to.equal('ITEM02');
        expect(res.body.message).to.equal('sub client for suborg not found');
      });

      it('should roll back if contract creation fails', async () => {
        const subClientPayload = {
          name: 'Failing SubClient',
          subOrgId: 'FailSubOrg',
          salesTerms: { territory: 'WW', catType: 'All', catalogueGroup: 'All', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 100 },
        };
        const payeePayload = { name: 'Rollback Payee', email: 'rollback@example.com' };

        await createSubClient({ curveUser, newSubClient: subClientPayload });

        const originalSave = Contract.prototype.save;
        Contract.prototype.save = () => { throw new Error('Simulated failure'); };

        const res = await chai.request(server).post(`/subClients/${subClientPayload.subOrgId}/payee`).set('applicationToken', applicationToken).set('token', userToken)
          .send(payeePayload);
        expect(res.status).to.equal(500);

        const payee = await Payee.findOne({ clientId, name: payeePayload.name });
        const contract = await Contract.findOne({ name: payeePayload.name });
        expect(payee).to.be.null;
        expect(contract).to.be.null;

        Contract.prototype.save = originalSave;
      });
    });
    describe('createUser = false', function () {
      it('should create payee without user when createUser is false', async () => {
        const subClientPayload = {
          name: 'Test SubClient',
          subOrgId: 'TestSubOrg123',
          salesTerms: { territory: 'WW', catType: 'All', catalogueGroup: 'All', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 100 },
        };
        const payeePayload = {
          name: 'New Payee No User',
          createUser: false,
        };

        await createSubClient({ curveUser, newSubClient: subClientPayload });

        const res = await chai.request(server)
          .post(`/subClients/${subClientPayload.subOrgId}/payee`)
          .set('applicationToken', applicationToken)
          .set('token', userToken)
          .send(payeePayload);

        expect(res.status).to.equal(200);
        expect(res.body.splitPayee.name).to.equal(payeePayload.name);

        // Verify payee was created
        const payee = await Payee.findOne({ clientId, name: payeePayload.name });
        expect(payee).to.not.be.null;

        // Verify no user was created
        const user = await User.findOne({ payeeIds: payee._id.toString() });
        expect(user).to.be.null;

        // Verify contract was still created
        const contract = await Contract.findOne({ name: `${payeePayload.name} - ${subClientPayload.name}` });
        expect(contract).to.not.be.null;
      });

      it('should create payee with optional email when createUser is false', async () => {
        const subClientPayload = {
          name: 'Test SubClient',
          subOrgId: 'TestSubOrg123',
          salesTerms: { territory: 'WW', catType: 'All', catalogueGroup: 'All', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 100 },
        };
        const payeePayload = {
          name: 'New Payee Optional Email',
          email: 'optional@example.com',
          createUser: false,
        };

        await createSubClient({ curveUser, newSubClient: subClientPayload });

        const res = await chai.request(server)
          .post(`/subClients/${subClientPayload.subOrgId}/payee`)
          .set('applicationToken', applicationToken)
          .set('token', userToken)
          .send(payeePayload);

        expect(res.status).to.equal(200);
        expect(res.body.splitPayee.name).to.equal(payeePayload.name);
        expect(res.body.splitPayee.email).to.equal(payeePayload.email);

        // Verify payee was created with email
        const payee = await Payee.findOne({ clientId, name: payeePayload.name });
        expect(payee).to.not.be.null;
        expect(payee.email).to.equal(payeePayload.email);

        // Verify no user was created despite having email
        const user = await User.findOne({ email: payeePayload.email });
        expect(user).to.be.null;
      });
    });
  });

  describe('POST /subClients/:id/link-track', () => {
    const fugaTrackId = 'validFugaTrackId';
    const subOrgId = new ObjectId();

    it('should successfully link a track to a main contract', async () => {
      await Track.create({ clientId, name: 'testTrack', fugaId: fugaTrackId, salesReturnsRights: [], title: randomString(), isrc: randomString() });
      const subClient = await SubClient.create({ clientId, subOrgId, name: 'testSubOrg' });
      const contract = await Contract.create({ clientId, name: 'testSubOrg', subClientId: subClient._id, isMainSubClientContract: true });

      const res = await chai.request(server).post(`/subClients/${subOrgId}/link-track`).set('applicationToken', applicationToken).set('token', userToken)
        .send({ fugaTrackId });

      expect(res.status).to.equal(200);
      expect(res.body.track.salesReturnsRights).to.have.lengthOf(1);
      expect(res.body.track.salesReturnsRights[0]).to.include({ contractId: contract._id.toString(), percentage: 100 });
    });

    it('should return error if required fields are missing', async () => {
      const res = await chai.request(server).post(`/subClients/${subOrgId}/link-track`).set('applicationToken', applicationToken).set('token', userToken)
        .send({});
      expect(res.status).to.equal(400);
      expect(res.body.code).to.equal('ITEM03');
      expect(res.body.message).to.equal('Fuga Track id and subOrgId are required');
    });

    it('should return error if the track does not exist', async () => {
      const res = await chai.request(server).post(`/subClients/${subOrgId}/link-track`).set('applicationToken', applicationToken).set('token', userToken)
        .send({ fugaTrackId: 'nonExistentFugaTrackId' });
      expect(res.status).to.equal(404);
      expect(res.body.code).to.equal('ITEM02');
      expect(res.body.message).to.equal('Track not found');
    });

    it('should return track with no changes if already linked to same contract', async () => {
      const subClient = await SubClient.create({ clientId, subOrgId, name: 'testSubOrg' });
      const contract = await Contract.create({ clientId, name: 'testSubOrg', subClientId: subClient._id, isMainSubClientContract: true });
      await Track.create({
        clientId,
        name: 'testTrack',
        fugaId: fugaTrackId,
        salesReturnsRights: [{ contractId: contract._id.toString(), percentage: 100 }],
        title: randomString(),
        isrc: randomString(),
      });

      const res = await chai.request(server).post(`/subClients/${subOrgId}/link-track`).set('applicationToken', applicationToken).set('token', userToken)
        .send({ fugaTrackId });

      expect(res.status).to.equal(200);
      expect(res.body.track.salesReturnsRights[0].contractId).to.equal(contract._id.toString());
    });

    it('should return error if track is already linked to different contract', async () => {
      const subClient1 = await SubClient.create({ clientId, subOrgId, name: 'testSubOrg' });
      const contract1 = await Contract.create({ clientId, name: 'testSubOrg', subClientId: subClient1._id, isMainSubClientContract: true });
      await Track.create({
        clientId,
        name: 'testTrack',
        fugaId: fugaTrackId,
        salesReturnsRights: [{ contractId: contract1._id.toString(), percentage: 100 }],
        title: randomString(),
        isrc: randomString(),
      });

      const subOrgId2 = new ObjectId();
      const subClient2 = await SubClient.create({ clientId, subOrgId: subOrgId2, name: 'testSubOrg2' });
      await Contract.create({ clientId, name: 'testSubOrg2', subClientId: subClient2._id, isMainSubClientContract: true });

      const res = await chai.request(server).post(`/subClients/${subOrgId2}/link-track`).set('applicationToken', applicationToken).set('token', userToken)
        .send({ fugaTrackId });

      expect(res.status).to.equal(409);
      expect(res.body.code).to.equal('FORB01');
      expect(res.body.message).to.include('Track already linked');
    });

    it('should return error if no main contract exists for subClient', async () => {
      const subClient = await SubClient.create({ clientId, name: 'testSubOrg', subOrgId });
      await Track.create({ clientId, name: 'testTrack', fugaId: fugaTrackId, salesReturnsRights: [], title: randomString(), isrc: randomString() });

      const res = await chai.request(server).post(`/subClients/${subOrgId}/link-track`).set('applicationToken', applicationToken).set('token', userToken)
        .send({ fugaTrackId });

      expect(res.status).to.equal(404);
      expect(res.body.code).to.equal('ITEM02');
      expect(res.body.message).to.include(`Main contract not found for subClientId: ${subClient._id.toString()}`);
    });

    it('should roll back if error occurs during linking', async () => {
      const track = await Track.create({ clientId, name: 'testTrack', fugaId: fugaTrackId, salesReturnsRights: [], title: randomString(), isrc: randomString() });
      const subClient = await SubClient.create({ clientId, name: 'testSubOrg', subOrgId });
      await Contract.create({ clientId, name: 'testSubOrg', subClientId: subClient._id, isMainSubClientContract: true });

      const originalSave = Track.prototype.save;
      Track.prototype.save = async function () {
        throw new Error('Simulated Track Save Failure');
      };
      const res = await chai.request(server).post(`/subClients/${subOrgId}/link-track`).set('applicationToken', applicationToken).set('token', userToken)
        .send({ fugaTrackId });

      expect(res.status).to.equal(500);

      const updatedTrack = await Track.findById(track._id);
      expect(updatedTrack.salesReturnsRights).to.deep.equal([]);

      Track.prototype.save = originalSave;
    });
  });

  describe('POST /subClients/:id/split-track', () => {
    const subOrgId = new ObjectId();
    const fugaTrackId = 'validFugaTrackId';
    let splits;

    beforeEach(async () => {
      const subClient = await SubClient.create({ clientId, subOrgId, name: 'testSubOrg' });
      const mainContract = await Contract.create({ clientId, name: 'testSubOrg', subClientId: subClient._id, isMainSubClientContract: true });

      await Track.create({ clientId, name: 'testTrack', fugaId: fugaTrackId, salesReturnsRights: [{ contractId: mainContract._id.toString(), percentage: 100 }] });

      splits = await Promise.all(
        [1, 2].map(async (n) => {
          const payee = await Payee.create({ clientId, name: `Payee ${n}` });
          await Contract.create({
            clientId,
            name: `Payee ${n}`,
            payees: [{ payeeId: payee._id.toString(), percentage: 100 }],
            subClientId: subClient._id,
            isMainSubClientContract: false,
          });
          return { name: `${n}`, payeeId: payee._id.toString(), percentage: 50 };
        }),
      );
    });

    it('should successfully add splits to a track', async () => {
      const res = await chai.request(server).post(`/subClients/${subOrgId}/split-track`).set('applicationToken', applicationToken).set('token', userToken)
        .send({ fugaTrackId, splits });
      expect(res.status).to.equal(200);
      expect(res.body.splitTrack.contracts).to.have.lengthOf(2);
    });

    it('should return error if total percentage exceeds 100', async () => {
      const invalidSplits = [{ ...splits[0], percentage: 60 }, { ...splits[1], percentage: 50 }];
      const res = await chai.request(server).post(`/subClients/${subOrgId}/split-track`).set('applicationToken', applicationToken).set('token', userToken)
        .send({ fugaTrackId, splits: invalidSplits });
      expect(res.status).to.equal(400);
      expect(res.body.code).to.equal('ITEM04');
      expect(res.body.message).to.include('The total percentage of splits exceeds 100');
    });

    it('should return error if a payee does not exist', async () => {
      const fakeId = new ObjectId().toString();
      const modifiedSplits = [{ ...splits[0], payeeId: fakeId }, splits[1]];
      const res = await chai.request(server).post(`/subClients/${subOrgId}/split-track`).set('applicationToken', applicationToken).set('token', userToken)
        .send({ fugaTrackId, splits: modifiedSplits });
      expect(res.status).to.equal(404);
      expect(res.body.code).to.equal('ITEM02');
      expect(res.body.message).to.include('Payee not found');
    });

    it('should return error if track is not linked to main contract', async () => {
      await Track.create({ clientId, name: 'testTrack2', fugaId: 'invalidFugaTrackId', salesReturnsRights: [] });
      const res = await chai.request(server).post(`/subClients/${subOrgId}/split-track`).set('applicationToken', applicationToken).set('token', userToken)
        .send({ fugaTrackId: 'invalidFugaTrackId', splits });
      expect(res.status).to.equal(409);
      expect(res.body.code).to.equal('FORB01');
      expect(res.body.message).to.include('Track with Fuga ID');
    });

    it('should return error if required fields are missing', async () => {
      const res = await chai.request(server).post(`/subClients/${subOrgId}/split-track`).set('applicationToken', applicationToken).set('token', userToken)
        .send({});
      expect(res.status).to.equal(400);
      expect(res.body.code).to.equal('ITEM03');
      expect(res.body.message).to.include('Fuga Track ID, subOrgId, and splits are required');
    });

    it('should clear splits leaving only main subclient contract if splits array is empty', async () => {
      const res = await chai.request(server).post(`/subClients/${subOrgId}/split-track`).set('applicationToken', applicationToken).set('token', userToken)
        .send({ fugaTrackId, splits: [] });
      expect(res.status).to.equal(200);
      expect(res.body.splitTrack.contracts).to.have.lengthOf(0);
    });

    it('should return error if payee ID format is invalid', async () => {
      const res = await chai.request(server).post(`/subClients/${subOrgId}/split-track`).set('applicationToken', applicationToken).set('token', userToken)
        .send({ fugaTrackId, splits: [{ ...splits[0], payeeId: 'invalid' }, splits[1]] });
      expect(res.status).to.equal(400);
      expect(res.body.code).to.equal('ITEM03');
      expect(res.body.message).to.include('Invalid Payee ID format');
    });

    it('should return error if subClient not found', async () => {
      const invalidSubOrgId = new ObjectId();
      const res = await chai.request(server).post(`/subClients/${invalidSubOrgId}/split-track`).set('applicationToken', applicationToken).set('token', userToken)
        .send({ fugaTrackId, splits });
      expect(res.status).to.equal(404);
      expect(res.body.code).to.equal('ITEM02');
      expect(res.body.message).to.include('SubClient not found for subOrgId');
    });

    it('should return error if main contract not found', async () => {
      await Contract.deleteOne({ clientId, isMainSubClientContract: true });
      const res = await chai.request(server).post(`/subClients/${subOrgId}/split-track`).set('applicationToken', applicationToken).set('token', userToken)
        .send({ fugaTrackId, splits });
      expect(res.status).to.equal(404);
      expect(res.body.code).to.equal('ITEM02');
      expect(res.body.message).to.include('Main contract not found');
    });

    it('should return error if total percentage is 101%', async () => {
      const invalidSplits = [
        { name: '1', payeeId: new ObjectId().toString(), percentage: 50.5 },
        { name: '2', payeeId: new ObjectId().toString(), percentage: 50.5 },
      ];
      const res = await chai.request(server).post(`/subClients/${subOrgId}/split-track`).set('applicationToken', applicationToken).set('token', userToken)
        .send({ fugaTrackId, splits: invalidSplits });
      expect(res.status).to.equal(400);
      expect(res.body.code).to.equal('ITEM04');
      expect(res.body.message).to.include('The total percentage of splits exceeds 100');
    });

    it('should return error if duplicate payees are in splits', async () => {
      const duplicateSplits = [
        { ...splits[0], percentage: 50 },
        { ...splits[0], percentage: 50 },
      ];
      const res = await chai.request(server).post(`/subClients/${subOrgId}/split-track`).set('applicationToken', applicationToken).set('token', userToken)
        .send({ fugaTrackId, splits: duplicateSplits });
      expect(res.status).to.equal(500);
      expect(res.body.message).to.include('A track can only have one instance of a contract attached to it');
    });

    it('should roll back changes if error occurs during processing', async () => {
      const subClient = await SubClient.create({ clientId, name: 'testSubOrg-error', subOrgId });
      const contract = await Contract.create({ clientId, name: 'testSubOrg-error', subClientId: subClient._id, isMainSubClientContract: true });
      const initialRights = [{
        contractId: contract._id.toString(),
        percentage: 100,
      }];
      const track = await Track.create({ clientId, name: 'testTrack-error', fugaId: fugaTrackId, salesReturnsRights: initialRights, title: randomString(), isrc: randomString() });

      const originalSave = Track.prototype.save;
      Track.prototype.save = async function () {
        throw new Error('Simulated Track Save Failure');
      };

      const res = await chai.request(server)
        .post(`/subClients/${subOrgId}/split-track`)
        .set('applicationToken', applicationToken)
        .set('token', userToken)
        .send({ fugaTrackId, splits });

      expect(res.status).to.equal(500);

      const updatedTrack = await Track.findById(track._id);
      expect(updatedTrack.salesReturnsRights.map((right) => ({
        contractId: right.contractId.toString(),
        percentage: right.percentage,
      }))).to.deep.equal(initialRights);

      Track.prototype.save = originalSave;
    });
  });

  describe('PUT /subClients/:id/sales-terms', () => {
    const subOrgId = new ObjectId();
    const updatedSalesTerms = { territory: 'EU', rate: 75 };
    let subClientId;

    beforeEach(async () => {
      const subClient = await SubClient.create({ clientId, subOrgId, name: 'Test SubClient' });
      subClientId = subClient._id;
      await Contract.create([
        { clientId, name: 'Test Contract 1', subClientId, salesTerms: [{ territory: 'WW', rate: 100 }] },
        { clientId, name: 'Test Contract 2', subClientId, salesTerms: [{ territory: 'WW', rate: 100 }] },
      ]);
    });

    it('should successfully update sales terms for all contracts', async () => {
      const res = await chai.request(server)
        .put(`/subClients/${subOrgId}/sales-terms`)
        .set('applicationToken', applicationToken)
        .set('token', userToken)
        .send({ salesTerms: updatedSalesTerms });

      expect(res.status).to.equal(200);
      expect(res.body.subClientId).to.equal(subClientId.toString());
      expect(res.body.updatedContracts).to.have.lengthOf(2);

      const updated = await Contract.find({ subClientId });
      updated.forEach((contract) => {
        const plainSalesTerms = contract.salesTerms[0].toObject();
        expect({
          territory: plainSalesTerms.territory,
          rate: plainSalesTerms.rate,
        }).to.deep.equal(updatedSalesTerms);
      });
    });

    it('should return error if salesTerms are missing', async () => {
      const res = await chai.request(server).put(`/subClients/${subOrgId}/sales-terms`).set('applicationToken', applicationToken).set('token', userToken)
        .send({});
      expect(res.status).to.equal(400);
      expect(res.body.code).to.equal('ITEM03');
      expect(res.body.message).to.include('salesTerms are required');
    });

    it('should return error if subClient does not exist', async () => {
      const invalidSubOrgId = new ObjectId();
      const res = await chai.request(server).put(`/subClients/${invalidSubOrgId}/sales-terms`).set('applicationToken', applicationToken).set('token', userToken)
        .send({ salesTerms: updatedSalesTerms });
      expect(res.status).to.equal(404);
      expect(res.body.code).to.equal('ITEM02');
      expect(res.body.message).to.include('SubClient not found with subOrgId');
    });

    it('should return error if no contracts are found', async () => {
      await Contract.deleteMany({ subClientId });
      const res = await chai.request(server).put(`/subClients/${subOrgId}/sales-terms`).set('applicationToken', applicationToken).set('token', userToken)
        .send({ salesTerms: updatedSalesTerms });
      expect(res.status).to.equal(404);
      expect(res.body.code).to.equal('ITEM02');
      expect(res.body.message).to.include('No contracts found for subClient ID');
    });

    it('should roll back changes if an error occurs during processing', async () => {
      const contractsBefore = await Contract.find({ subClientId }).lean();

      const originalSave = Contract.prototype.save;
      Contract.prototype.save = async function () {
        throw new Error('Simulated Save Failure');
      };

      const res = await chai.request(server)
        .put(`/subClients/${subOrgId}/sales-terms`)
        .set('applicationToken', applicationToken)
        .set('token', userToken)
        .send({ salesTerms: updatedSalesTerms });

      expect(res.status).to.equal(500);

      const contractsAfter = await Contract.find({ subClientId }).lean();
      contractsAfter.forEach((contract, i) => {
        const beforeTerms = contractsBefore[i].salesTerms.map((term) => ({
          territory: term.territory,
          rate: term.rate,
          escalations: term.escalations,
          escalationTrackers: term.escalationTrackers,
        }));
        const afterTerms = contract.salesTerms.map((term) => ({
          territory: term.territory,
          rate: term.rate,
          escalations: term.escalations,
          escalationTrackers: term.escalationTrackers,
        }));
        expect(afterTerms).to.deep.equal(beforeTerms);
      });

      Contract.prototype.save = originalSave;
    });
  });
  describe('GET /subClients/:id/payees', () => {
    const subOrgId = 'TestSubOrg123';
    let subClientId;
    let seededPayees;

    beforeEach(async () => {
      const subClient = await SubClient.create({ clientId, subOrgId, name: 'Test SubClient' });
      subClientId = subClient._id;

      seededPayees = await Payee.insertMany([
        { clientId, name: 'Payee One', email: 'payee1@example.com' },
        { clientId, name: 'Payee Two', email: 'payee2@example.com' },
        { clientId, name: 'Other Payee', email: 'payee3@example.com' },
      ]);

      await Contract.insertMany([
        { clientId, name: 'Contract 1', subClientId, payees: [{ payeeId: seededPayees[0]._id.toString(), percentage: 50 }] },
        { clientId, name: 'Contract 2', subClientId, payees: [{ payeeId: seededPayees[1]._id.toString(), percentage: 50 }] },
      ]);
    });

    it('should return unique payees for the subClient', async () => {
      const res = await chai.request(server).get(`/subClients/${subOrgId}/payees`).set('applicationToken', applicationToken).set('token', userToken);
      expect(res.status).to.equal(200);
      expect(res.body.payees).to.have.lengthOf(2);
      expect(res.body.payees.map((p) => p.name)).to.include.members(['Payee One', 'Payee Two']);
    });

    it('should filter payees by search query', async () => {
      const res = await chai.request(server).get(`/subClients/${subOrgId}/payees`).query({ search: 'One' }).set('applicationToken', applicationToken)
        .set('token', userToken);
      expect(res.status).to.equal(200);
      expect(res.body.payees).to.have.lengthOf(1);
      expect(res.body.payees[0].name).to.equal('Payee One');
    });

    it('should return empty list for unmatched search', async () => {
      const res = await chai.request(server).get(`/subClients/${subOrgId}/payees`).query({ search: 'Nonexistent' }).set('applicationToken', applicationToken)
        .set('token', userToken);
      expect(res.status).to.equal(200);
      expect(res.body.payees).to.be.an('array').that.is.empty;
    });

    it('should return 404 if subClient does not exist', async () => {
      const res = await chai.request(server).get('/subClients/InvalidSubOrg123/payees').set('applicationToken', applicationToken).set('token', userToken);
      expect(res.status).to.equal(404);
      expect(res.body.code).to.equal('ITEM02');
      expect(res.body.message).to.equal('SubClient not found for subOrgId: InvalidSubOrg123');
    });

    it('should return empty list if no contracts are associated', async () => {
      await Contract.deleteMany({ subClientId });
      const res = await chai.request(server).get(`/subClients/${subOrgId}/payees`).set('applicationToken', applicationToken).set('token', userToken);
      expect(res.status).to.equal(200);
      expect(res.body.payees).to.be.an('array').that.is.empty;
    });
  });

  describe('GET /subClients/:id', () => {
    const subOrgId = `TestSubOrg-${randomString(8)}`;
    let subClientId;
    let testNames;

    beforeEach(async () => {
      testNames = {
        subClient: `SubClient-${randomString(8)}`,
        contract: `Contract-${randomString(8)}`,
      };

      const subClient = await SubClient.create({
        clientId,
        subOrgId,
        name: testNames.subClient,
      });

      subClientId = subClient._id;
      await Contract.create({
        clientId,
        name: testNames.contract,
        subClientId,
        isMainSubClientContract: true,
        salesTerms: [{ territory: 'WW', rate: 85 }],
      });
    });

    it('should fetch a subClient and its main contract sales terms', async () => {
      const res = await chai.request(server)
        .get(`/subClients/${subOrgId}`)
        .set('applicationToken', applicationToken)
        .set('token', userToken);

      expect(res.status).to.equal(200);
      expect(res.body.subClient).to.be.an('object');
      expect(res.body.subClient.name).to.equal(testNames.subClient);
      expect(res.body.subClient.salesTerms).to.be.an('array');
      expect(res.body.subClient.salesTerms[0]).to.deep.include({
        territory: 'WW',
        rate: 85,
      });
    });

    it('should return a 404 error if the subClient is not found', async () => {
      const invalidSubOrgId = 'InvalidSubOrg123';

      const res = await chai.request(server)
        .get(`/subClients/${invalidSubOrgId}`)
        .set('applicationToken', applicationToken)
        .set('token', userToken);

      expect(res.status).to.equal(404);
      expect(res.body.code).to.equal('ITEM02');
      expect(res.body.message).to.equal(`SubClient not found with subOrgId: ${invalidSubOrgId}`);
    });

    it('should return a 404 error if the main contract is not found', async () => {
      await Contract.deleteMany({ isMainSubClientContract: true });

      const res = await chai.request(server)
        .get(`/subClients/${subOrgId}`)
        .set('applicationToken', applicationToken)
        .set('token', userToken);

      expect(res.status).to.equal(404);
      expect(res.body.code).to.equal('ITEM02');
      expect(res.body.message).to.equal(`Main contract not found for SubClient ID: ${subClientId}`);
    });
  });
});
