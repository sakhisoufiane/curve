const sinon = require('sinon');
const { expect } = require('chai');
const rewire = require('rewire');
const axios = require('axios');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const Client = require('../../../models/client');
const Release = require('../../../models/release');
const Track = require('../../../models/track');
const Contract = require('../../../models/contract');
const SendEmail = require('../../../libs/sendEmail');
const Notification = require('../../../models/notification');

const fileUnderTest = rewire('../../../libs/fuga/fugaCatalogueSync');
const logFugaResponse = fileUnderTest.__get__('logFugaResponse');
const sendNotificationToChosenEmail = fileUnderTest.__get__('sendNotificationToChosenEmail');
const readCookie = fileUnderTest.__get__('readCookie');
const refreshFugaAuthCookie = fileUnderTest.__get__('refreshFugaAuthCookie');
const sendFugaSyncEmail = fileUnderTest.__get__('sendFugaSyncEmail');
const sendUserNotification = fileUnderTest.__get__('sendUserNotification');
const getFugaReleases = fileUnderTest.__get__('getFugaReleases');
const readReleases = fileUnderTest.__get__('readReleases');
const handleRelease = fileUnderTest.__get__('handleRelease');
const segregateReleases = fileUnderTest.__get__('segragateReleases');
const saveAllReleases = fileUnderTest.__get__('saveAllReleases');
const groupTracks = fileUnderTest.__get__('groupTracks');
const readTracks = fileUnderTest.__get__('readTracks');
const handleReadTracks = fileUnderTest.__get__('handleReadTracks');
const handleReadTracksProcess = fileUnderTest.__get__('handleReadTracksProcess');
const matchTrackWithContracts = fileUnderTest.__get__('matchTrackWithContracts');
const syncRelease = fileUnderTest.__get__('syncRelease');
const syncTrack = fileUnderTest.__get__('syncTrack');
const syncClient = fileUnderTest.__get__('syncClient');

describe('Fuga Sync Unit Tests', () => {
  let stubs;
  beforeEach(() => {
    sinon.stub(Client, 'findById');

    stubs = {
      logInfo: sinon.stub(logger, 'info'),
      logError: sinon.stub(logger, 'error'),
      axiosPost: sinon.stub(axios, 'post'),
      axiosGet: sinon.stub(axios, 'get'),
      clientFind: sinon.stub(Client, 'find'),
      releaseFindOne: sinon.stub(Release, 'findOne'),
      releaseUpdateById: sinon.stub(Release, 'findByIdAndUpdate').resolves(),
      trackFindOne: sinon.stub(Track, 'findOne'),
      trackUpdateById: sinon.stub(Track, 'findByIdAndUpdate').resolves(),
      contractFind: sinon.stub(Contract, 'find'),
      sendEmail: sinon.stub(SendEmail, 'genericCompleteNoUser'),
      notificationGenerate: sinon.stub(Notification, 'generate'),
      trackSave: sinon.stub(Track.prototype, 'save').resolves(),
    };
  });

  afterEach(() => sinon.restore());

  describe('logFugaResponse', () => {
    it('should log the correct message with response details', () => {
      const mockResponse = { status: 200, statusText: 'OK' };
      logFugaResponse({ name: 'testName', response: mockResponse });
      expect(stubs.logInfo.calledOnce).to.be.true;
      expect(stubs.logInfo.calledWithMatch('testName FUGA response code - 200 - message - OK')).to.be.true;
    });
  });

  describe('sendNotificationToChosenEmail', () => {
    it('should send an email and resolve the promise', async () => {
      stubs.sendEmail.yields();
      await sendNotificationToChosenEmail({ email: 'test@example.co.uk', client: {}, mainText: 'Hello' });
      expect(stubs.sendEmail.calledOnce).to.be.true;
    });
  });

  describe('readCookie', () => {
    it('should make a POST request to Fuga login and return the response', async () => {
      const mockResponse = { headers: { 'set-cookie': ['cookie'] } };
      stubs.axiosPost.resolves(mockResponse);

      const response = await readCookie();
      expect(stubs.axiosPost.calledOnce).to.be.true;
      expect(response).to.equal(mockResponse);
    });

    it('should reject the promise on error', async () => {
      stubs.axiosPost.rejects(new Error('Login error'));

      try {
        await readCookie();
      } catch (error) {
        expect(error.message).to.equal('Login error');
      }
    });
  });

  describe('refreshFugaAuthCookie', () => {
    it('should refresh the Fuga auth cookie after multiple tries', async () => {
      stubs.axiosPost.onCall(0).rejects(new Error('Login error'));
      stubs.axiosPost.onCall(2).resolves({ headers: { 'set-cookie': ['cookie'] } });

      await refreshFugaAuthCookie();
      expect(stubs.axiosPost.calledThrice).to.be.true;
      expect(axios.defaults.headers.common.Cookie).to.equal('cookie');
    });

    it('should throw an error after too many failed attempts', async () => {
      stubs.axiosPost.rejects(new Error('Login error'));

      try {
        await refreshFugaAuthCookie();
      } catch (error) {
        expect(error.message).to.include('refreshFugaAuthCookie: too many tries');
      }
    });
  });

  describe('sendFugaSyncEmail', () => {
    it('should send the Fuga sync email to all specified addresses', async () => {
      const client = {
        fugaIntegration: {
          fugaOrgId: 'orgId',
          fugaLastSync: new Date(),
          fugaNotifyEmails: ['test@example.com'],
        },
      };
      stubs.sendEmail.yields();
      await sendFugaSyncEmail({ client });
      expect(stubs.sendEmail.calledOnce).to.be.true;
      expect(stubs.sendEmail.calledWith('test@example.com')).to.be.true;
    });
  });

  describe('sendUserNotification', () => {
    it('should generate a notification for the user', async () => {
      await sendUserNotification({ client: { _id: 'clientId' }, userEmail: 'user@example.com' });
      expect(stubs.notificationGenerate.calledOnce).to.be.true;
      expect(stubs.notificationGenerate.calledWith('Catalogue Sync', 'Catalogue Sync Complete')).to.be.true;
    });
  });

  describe('readReleases', () => {
    it('should resolve with fugaReleases when axios.get is successful', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        data: {
          fuga: {
            entities: {
              product: ['release1', 'release2'],
            },
          },
        },
      };
      stubs.axiosGet.resolves(mockResponse);

      const result = await readReleases({ organizationId: 'org123', state: 'active', batchSize: 10, offsetId: 1 });
      expect(result).to.deep.equal(['release1', 'release2']);
      expect(stubs.logInfo.calledOnce).to.be.true;
      expect(stubs.logInfo.calledWithMatch('readReleases FUGA response code - 200 - message - OK')).to.be.true;
    });

    it('should resolve with an empty array when the response data is missing or malformed', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        data: {},
      };
      stubs.axiosGet.resolves(mockResponse);

      const result = await readReleases({ organizationId: 'org123', state: 'active', batchSize: 10, offsetId: 1 });
      expect(result).to.deep.equal([]);
      expect(stubs.logInfo.calledOnce).to.be.true;
      expect(stubs.logInfo.calledWithMatch('readReleases FUGA response code - 200 - message - OK')).to.be.true;
    });

    it('should reject with an error when axios.get fails', async () => {
      const mockError = new Error('Network Error');
      stubs.axiosGet.rejects(mockError);

      try {
        await readReleases({ organizationId: 'org123', state: 'active', batchSize: 10, offsetId: 1 });
      } catch (error) {
        expect(error).to.equal(mockError);
      }
    });
  });

  describe('getFugaReleases', () => {
    it('should return fugaReleases on the first try', async () => {
      const mockReleases = ['release1', 'release2'];
      stubs.axiosGet.resolves({ data: { fuga: { entities: { product: mockReleases } } } });
      const result = await getFugaReleases({ offsetId: 1, batchSize: 10, organizationId: 'org123' });

      expect(result).to.deep.equal(mockReleases);
      expect(stubs.axiosGet.calledOnce).to.be.true;
      expect(stubs.logError.notCalled).to.be.true;
    });

    it('should retry and eventually return fugaReleases', async () => {
      const mockReleases = ['release1', 'release2'];
      fileUnderTest.__set__('delay', sinon.stub().resolves());
      stubs.axiosGet
        .onFirstCall().rejects(new Error('Network Error'))
        .onSecondCall().rejects(new Error('Network Error'))
        .onThirdCall()
        .resolves({ data: { fuga: { entities: { product: mockReleases } } } });

      const result = await getFugaReleases({ offsetId: 1, batchSize: 10, organizationId: 'org123' });

      expect(result).to.deep.equal(mockReleases);
      expect(stubs.axiosGet.callCount).to.equal(3);
      expect(stubs.logError.calledTwice).to.be.true;
    });

    it('should throw an error after exhausting all retries', async () => {
      stubs.axiosGet.rejects(new Error('Network Error'));

      try {
        await getFugaReleases({ offsetId: 1, batchSize: 10, organizationId: 'org123' });
        throw new Error('Promise should have been rejected');
      } catch (error) {
        expect(error.message).to.equal(' - getFugaReleases: too many tries');
      }

      expect(stubs.axiosGet.callCount).to.equal(5);
      expect(stubs.logError.callCount).to.equal(5);
    });
  });

  describe('syncRelease', () => {
    it('should update an existing release if found by Fuga ID', async () => {
      const mockRelease = { save: sinon.stub().resolves(), _id: 'releaseId' };
      stubs.releaseFindOne.resolves(mockRelease);
      stubs.releaseUpdateById.resolves(mockRelease);

      const result = await syncRelease({
        updateRun: true,
        fugaRelease: { id: 'fugaId', name: 'ReleaseName', upcCode: '12345' },
        fugaIntegration: { setCatNoFromBarcodeOnImport: false },
        clientId: 'clientId',
        client: {},
        trackIds: [],
        inheritanceClients: [],
        checkFirstFugaId: true,
      });

      expect(stubs.releaseUpdateById.calledOnceWith(mockRelease._id)).to.be.true;
      expect(result).to.equal(mockRelease._id);
    });

    it('should create a new release if not found by Fuga ID or UPC', async () => {
      stubs.releaseFindOne.resolves(null);
      const saveStub = sinon.stub(Release.prototype, 'save').resolves();

      const result = await syncRelease({
        updateRun: true,
        fugaRelease: { id: '', name: 'ReleaseName', upcCode: '' },
        fugaIntegration: { setCatNoFromBarcodeOnImport: false },
        clientId: 'clientId',
        client: {},
        trackIds: [],
        inheritanceClients: [],
        checkFirstFugaId: true,
      });

      expect(saveStub.calledOnce).to.be.true;
      expect(result.toString()).to.have.length(24);

      saveStub.restore();
    });
  });

  describe('handleRelease', () => {
    it('should successfully handle a release on the first try', async () => {
      fileUnderTest.__set__('syncRelease', sinon.stub().resolves('mongoReleaseId123'));

      const fugaReleasesWithMongoIds = [];
      await handleRelease({
        type: 'testType',
        updateRun: false,
        fugaRelease: { id: 'fugaReleaseId123' },
        currentFugaReleaseNo: 1,
        fugaIntegration: {},
        releaseBatchNo: 1,
        clientId: 'clientId123',
        client: {},
        inheritanceClients: [],
        fugaReleasesBatchAmount: 10,
        fugaReleasesWithMongoIds,
        checkFirstFugaId: false,
      });

      expect(stubs.logInfo.calledOnce).to.be.true;
      expect(stubs.logError.notCalled).to.be.true;
      expect(fugaReleasesWithMongoIds).to.deep.equal([{
        mongoReleaseId: 'mongoReleaseId123',
        fugaReleaseId: 'fugaReleaseId123',
      }]);
    });

    it('should retry and eventually handle a release after an error', async () => {
      fileUnderTest.__set__('syncRelease', sinon.stub()
        .onFirstCall().rejects(new Error('Network Error'))
        .onSecondCall()
        .resolves('mongoReleaseId123'));

      const fugaReleasesWithMongoIds = [];
      await handleRelease({
        type: 'testType',
        updateRun: false,
        fugaRelease: { id: 'fugaReleaseId123' },
        currentFugaReleaseNo: 1,
        fugaIntegration: {},
        releaseBatchNo: 1,
        clientId: 'clientId123',
        client: {},
        inheritanceClients: [],
        fugaReleasesBatchAmount: 10,
        fugaReleasesWithMongoIds,
        checkFirstFugaId: false,
      });

      expect(stubs.logInfo.calledTwice).to.be.true;
      expect(fugaReleasesWithMongoIds).to.deep.equal([{
        mongoReleaseId: 'mongoReleaseId123',
        fugaReleaseId: 'fugaReleaseId123',
      }]);
    });

    it('should set duplicatedCatNo to true if a specific error message is encountered', async () => {
      const catNoError = new Error('Cat No is required to be unique under each Distribution Channel');
      const syncReleaseStub = sinon.stub()
        .onFirstCall().rejects(catNoError)
        .onSecondCall()
        .resolves('mongoReleaseId123');

      fileUnderTest.__set__('syncRelease', syncReleaseStub);
      const fugaReleasesWithMongoIds = [];
      await handleRelease({
        type: 'testType',
        updateRun: false,
        fugaRelease: { id: 'fugaReleaseId123' },
        currentFugaReleaseNo: 1,
        fugaIntegration: {},
        releaseBatchNo: 1,
        clientId: 'clientId123',
        client: {},
        inheritanceClients: [],
        fugaReleasesBatchAmount: 10,
        fugaReleasesWithMongoIds,
        checkFirstFugaId: false,
      });

      expect(stubs.logInfo.calledTwice).to.be.true;
      expect(fugaReleasesWithMongoIds).to.deep.equal([{
        mongoReleaseId: 'mongoReleaseId123',
        fugaReleaseId: 'fugaReleaseId123',
      }]);
      expect(syncReleaseStub.secondCall.args[0].duplicatedCatNo).to.be.true;
    });
  });

  describe('segregateReleases', () => {
    it('should segregate releases correctly when catalog numbers are unique', () => {
      const fugaReleases = [
        { catalogNumber: 'CAT1' },
        { catalogNumber: 'CAT2' },
      ];
      const result = segregateReleases({ fugaReleases });

      expect(result.parallelFugaReleases).to.deep.equal(fugaReleases);
      expect(result.subsequentFugaReleases).to.deep.equal([]);
    });

    it('should segregate releases correctly when there are duplicate catalog numbers', () => {
      const fugaReleases = [
        { catalogNumber: 'CAT1' },
        { catalogNumber: 'CAT1' },
        { catalogNumber: 'CAT2' },
      ];
      const result = segregateReleases({ fugaReleases });

      expect(result.parallelFugaReleases).to.deep.equal([{ catalogNumber: 'CAT2' }]);
      expect(result.subsequentFugaReleases).to.deep.equal([{ catalogNumber: 'CAT1' }, { catalogNumber: 'CAT1' }]);
    });
  });

  describe('saveAllReleases', () => {
    let handleReleaseProcessStub;

    beforeEach(() => {
      handleReleaseProcessStub = sinon.stub();
      fileUnderTest.__set__('handleReleaseProcess', handleReleaseProcessStub);
    });

    it('should process all releases', async () => {
      handleReleaseProcessStub.resolves();

      const fugaReleases = [
        { catalogNumber: 'CAT1' },
        { catalogNumber: 'CAT1' },
        { catalogNumber: 'CAT2' },
      ];
      await saveAllReleases({
        fugaReleases,
        client: { fugaIntegration: {} },
        clientId: 'client123',
        releaseBatchNo: 1,
        inheritanceClients: [],
        fugaReleasesWithMongoIds: [],
        updateRun: false,
        checkFirstFugaId: false,
      });

      expect(handleReleaseProcessStub.callCount).to.equal(51); // 1 subsequent + 50 parallel
    });
  });

  describe('groupTracks', () => {
    it('should group tracks by ISRC code', () => {
      const fugaTracks = [
        { isrcCode: 'ISRC1' },
        { isrcCode: 'ISRC1' },
        { isrcCode: 'ISRC2' },
      ];
      const result = groupTracks({ fugaTracks });

      expect(result.ISRC1).to.deep.equal([{ isrcCode: 'ISRC1' }, { isrcCode: 'ISRC1' }]);
      expect(result.ISRC2).to.deep.equal([{ isrcCode: 'ISRC2' }]);
    });
  });

  describe('readTracks', () => {
    it('should resolve with fugaTracks when axios.get is successful', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        data: {
          fuga: {
            entities: {
              asset: ['track1', 'track2'],
            },
          },
        },
      };
      stubs.axiosGet.resolves(mockResponse);

      const result = await readTracks({ productId: 'product123' });

      expect(result).to.deep.equal(['track1', 'track2']);
      expect(stubs.logInfo.calledOnce).to.be.true;
    });

    it('should reject with an error when axios.get fails', async () => {
      const mockError = new Error('Network Error');
      stubs.axiosGet.rejects(mockError);

      try {
        await readTracks({ productId: 'product123' });
        throw new Error('Promise should have been rejected');
      } catch (error) {
        expect(error).to.equal(mockError);
      }
    });
  });

  describe('handleReadTracks', () => {
    let readTracksStub;
    let delayStub;

    beforeEach(() => {
      readTracksStub = sinon.stub().resolves([{ id: 'track1' }, { id: 'track2' }]);
      fileUnderTest.__set__('readTracks', readTracksStub);

      delayStub = sinon.stub().resolves();
      fileUnderTest.__set__('delay', delayStub);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should successfully read and process tracks', async () => {
      const fugaTracks = [];
      const fugaReleasesWithMongoIds = [{ fugaReleaseId: 'fugaRelease123', mongoReleaseId: 'mongoRelease123' }];

      await handleReadTracks({
        fugaReleasesAmount: 1,
        fugaReleases: [{ id: 'fugaRelease123' }],
        fugaRelease: { id: 'fugaRelease123', upcCode: 'upc123' },
        fugaTracks,
        fugaReleasesWithMongoIds,
      });

      expect(fugaTracks.length).to.equal(2);
      expect(fugaTracks[0]).to.include({ mongoReleaseId: 'mongoRelease123', label: undefined });
    });

    it('should retry on failure and eventually succeed', async () => {
      readTracksStub.onFirstCall().rejects(new Error('Network Error'));
      readTracksStub.onSecondCall().resolves([{ id: 'track1' }, { id: 'track2' }]);

      const fugaTracks = [];
      const fugaReleasesWithMongoIds = [{ fugaReleaseId: 'fugaRelease123', mongoReleaseId: 'mongoRelease123' }];

      await handleReadTracks({
        fugaReleasesAmount: 1,
        fugaReleases: [{ id: 'fugaRelease123' }],
        fugaRelease: { id: 'fugaRelease123', upcCode: 'upc123' },
        fugaTracks,
        fugaReleasesWithMongoIds,
      });
      expect(fugaTracks.length).to.equal(2);
    });
  });

  describe('handleReadTracksProcess', () => {
    let handleReadTracksStub;

    beforeEach(() => {
      handleReadTracksStub = sinon.stub();
      fileUnderTest.__set__('handleReadTracks', handleReadTracksStub);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should process tracks sequentially', async () => {
      handleReadTracksStub.resolves();

      const fugaTracks = [];
      const fugaReleases = [
        { id: 'fugaRelease1' },
        { id: 'fugaRelease2' },
      ];

      await handleReadTracksProcess({
        fugaReleases,
        fugaReleasesAmount: 2,
        fugaTracks,
        fugaReleasesWithMongoIds: [],
      });

      expect(handleReadTracksStub.callCount).to.equal(2);
    });
  });

  describe('matchTrackWithContracts', () => {
    it('should correctly match track with contracts', async () => {
      stubs.contractFind.resolves([{ _id: 'contract123' }]);
      const track = { _id: 'track123', clientId: 'client123', label: 'label123' };

      await matchTrackWithContracts({ track });

      expect(stubs.contractFind.calledOnce).to.be.true;
      expect(stubs.trackUpdateById.calledWith(track._id, {
        $set: {
          costsRights: [{ contractId: 'contract123', percentage: 100 }],
          salesReturnsRights: [{ contractId: 'contract123', percentage: 100 }],
        },
      })).to.be.true;
    });
  });

  describe('syncTrack', () => {
    it('should update an existing track if found by Fuga ID', async () => {
      const mockTrack = { _id: 'trackId', fugaId: 'fugaId' };
      stubs.trackFindOne.resolves(mockTrack);
      stubs.trackUpdateById.resolves(mockTrack);

      const result = await syncTrack({
        fugaTrack: { id: 'fugaId', name: 'TrackName', isrcCode: '12345' },
        clientId: 'clientId',
        client: {},
        fugaIntegration: {},
        inheritanceClients: [],
        checkFirstFugaId: true,
      });

      expect(Track.findByIdAndUpdate.called).to.be.true;
      expect(Track.prototype.save.called).to.be.false;
      expect(result).to.equal(mockTrack._id);
    });

    it('should update an existing track if found by isrc', async () => {
      const mockTrack = { save: sinon.stub().resolves(), _id: 'trackId', isrc: '12345' };
      stubs.trackFindOne.resolves(mockTrack);
      stubs.trackUpdateById.resolves(mockTrack);

      const result = await syncTrack({
        fugaTrack: { id: 'fugaId', name: 'TrackName', isrcCode: '12345' },
        clientId: 'clientId',
        client: {},
        fugaIntegration: {},
        inheritanceClients: [],
        checkFirstFugaId: false,
      });

      expect(Track.findOne.calledWith({
        clientId: 'clientId',
        $or: [
          { isrc: mockTrack.isrc },
          { aliases: mockTrack.isrc },
        ],
      })).to.be.true;
      expect(Track.findByIdAndUpdate.called).to.be.true;
      expect(Track.prototype.save.called).to.be.false;
      expect(result).to.equal(mockTrack._id);
    });

    it('should not update an existing track or create a new if found by alias ISRC', async () => {
      const isrc = randomString();
      const mockTrack = { save: sinon.stub().resolves(), _id: randomId(), aliases: [isrc] };
      stubs.trackFindOne.resolves(mockTrack);
      stubs.trackUpdateById.resolves(mockTrack);

      await syncTrack({
        fugaTrack: { id: 'fugaId', name: randomString(), isrcCode: isrc },
        clientId: 'clientId',
        client: {},
        fugaIntegration: {},
        inheritanceClients: [],
        checkFirstFugaId: false,
      });

      expect(Track.findOne.calledWith({
        clientId: 'clientId',
        $or: [
          { isrc },
          { aliases: isrc },
        ],
      })).to.be.true;
      expect(Track.findByIdAndUpdate.called).to.be.false;
      expect(Track.prototype.save.called).to.be.false;
    });

    it('should create a new track if not found by Fuga ID or ISRC', async () => {
      stubs.trackFindOne.resolves(null);

      const result = await syncTrack({
        fugaTrack: { id: 'fugaId', name: 'TrackName', isrcCode: '12345' },
        clientId: 'clientId',
        client: {},
        fugaIntegration: {},
        inheritanceClients: [],
        checkFirstFugaId: true,
      });

      expect(Track.prototype.save.calledOnce).to.be.true;
      expect(result.toString()).to.have.length(24);
    });
  });

  describe('syncClient', () => {
    beforeEach(() => {
      fileUnderTest.__set__('refreshFugaAuthCookie', sinon.stub().resolves());
      fileUnderTest.__set__('getFugaReleases', sinon.stub().resolves([]));
      fileUnderTest.__set__('saveAllReleases', sinon.stub().resolves());
      fileUnderTest.__set__('saveAllTracks', sinon.stub().resolves());
      fileUnderTest.__set__('sendUserNotification', sinon.stub().resolves());
      fileUnderTest.__set__('sendFugaSyncEmail', sinon.stub().resolves());
    });

    it('should not proceed if client is already syncing', async () => {
      Client.findById.resolves({ fugaIntegration: { fugaCurrentlySyncing: true }, save: sinon.stub().resolves() });
      await syncClient({ clientId: 'clientId', userEmail: 'user@example.com' });
      expect(stubs.logInfo.calledWithMatch('STOP - currently syncing')).to.be.true;
    });

    it('should throw an error if the client is not found', async () => {
      Client.findById.resolves(null);

      try {
        await syncClient({ clientId: 'nonExistentClient', userEmail: 'user@example.com' });
      } catch (error) {
        expect(error.message).to.equal('Client not found');
      }
    });

    it('should not proceed if fuga org id is missing', async () => {
      Client.findById.resolves({ fugaIntegration: '', save: sinon.stub().resolves() });
      await syncClient({ clientId: 'clientId', userEmail: 'user@example.com' });
      expect(stubs.logInfo.calledWithMatch('STOP - missing fugaOrgId')).to.be.true;
    });

    it('should reset sync flag on completion', async () => {
      Client.findById.resolves({ fugaIntegration: { fugaCurrentlySyncing: false, fugaOrgId: 'orgId' }, save: sinon.stub().resolves() });

      await syncClient({ clientId: 'clientId', userEmail: 'user@example.com' });
      const client = await Client.findById.firstCall.returnValue;

      expect(client.fugaIntegration.fugaCurrentlySyncing).to.be.false;
    });

    it('should reset sync flag if any random error occurs during syncClient execution', async () => {
      Client.findById.resolves({
        fugaIntegration: { fugaCurrentlySyncing: false, fugaOrgId: 'orgId' },
        save: sinon.stub().resolves(),
      });

      let errorThrown = false;

      const errorProneStub = (functionName) => sinon.stub().callsFake(() => {
        const shouldThrowError = Math.random() < 0.5;
        if (shouldThrowError) {
          errorThrown = true;
          throw new Error(`Random error in ${functionName}`);
        }
        return Promise.resolve();
      });

      fileUnderTest.__set__('refreshFugaAuthCookie', errorProneStub('refreshFugaAuthCookie'));
      fileUnderTest.__set__('getFugaReleases', errorProneStub('getFugaReleases'));
      fileUnderTest.__set__('saveAllReleases', errorProneStub('saveAllReleases'));
      fileUnderTest.__set__('saveAllTracks', errorProneStub('saveAllTracks'));
      fileUnderTest.__set__('sendUserNotification', errorProneStub('sendUserNotification'));
      fileUnderTest.__set__('sendFugaSyncEmail', errorProneStub('sendFugaSyncEmail'));

      try {
        await syncClient({ clientId: 'clientId', userEmail: 'user@example.com' });
      } catch (error) {
        // Catch any error to ensure the test doesn't fail here, we only want to test the flag reset
      }
      const client = await Client.findById.firstCall.returnValue;

      // Ensure that at least one error was thrown
      if (!errorThrown) {
        await fileUnderTest.__get__('refreshFugaAuthCookie')().catch(() => {});
      }

      expect(stubs.logError.called).to.be.true; // Ensure that some errors were logged
      expect(client.fugaIntegration.fugaCurrentlySyncing).to.be.false; // Check the flag is reset
    });
  });
});
