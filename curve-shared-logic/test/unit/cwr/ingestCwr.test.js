/* eslint-disable no-shadow */
process.env.NODE_ENV = 'test';

const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const chai = require('chai');
const cwrReader = require('../../../libs/cwr/cwrReader');
const ingestCwr = require('../../../libs/cwr/ingestCwr');

const { expect } = chai;

jest.mock('../../../libs/cwr/cwrReader', () => jest.fn());

describe('ingestCwr', function () {
  logger.info('>>>file>>>> unit/libs/ingestCwr .....................');

  const defaults = {};
  const s3Key = randomString();
  const bucket = randomString();
  const clientId = randomId();
  const submitter = randomString();
  const Import = {
    _id: randomId(),
    importPartnerId: randomId(),
  };
  const mockData = { works: [{ _id: randomId(), submitterWorkNo: randomString() }] };
  const errors = null;
  const workMock = { _id: randomId() };

  let readFile; let Work; let workFindOne; let workSave;

  beforeEach(() => {
    fileManager.downloadFromS3 = jest.fn().mockImplementation((_s3Key, _bucket, callback) => { callback(null, 'localFile'); });

    readFile = jest.fn().mockImplementation((_file, callback) => { callback(errors, mockData, () => { }); });
    cwrReader.mockImplementation((_cb) => ({ readFile }));

    workFindOne = jest.fn().mockImplementation((filter, cb) => { cb(null, null); });
    workSave = jest.fn().mockImplementation((cb) => { cb(); });
    Work = jest.fn().mockImplementation((newWork) => ({ save: workSave, ...newWork }));
    Work.findOne = workFindOne;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const executeIngest = async (args) => {
    await new Promise((resolve, reject) => {
      ingestCwr.ingest({ Import, submitter, clientId, bucket, s3Key, defaults, ...args }, (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    });
  };

  describe('ingest', function () {
    it('should return an error when not passed an s3Key', async () => {
      try {
        await executeIngest({ Work, s3Key: null });
      } catch (err) {
        expect(err.message).to.eq('No file passed');
      }
    });

    it('should throw an error when not passed a bucket', async () => {
      try {
        await executeIngest({ Work, bucket: null });
      } catch (err) {
        expect(err.message).to.eq('No S3 bucket passed');
      }
    });

    it('should throw a client id error when not passed a clientId', async () => {
      try {
        await executeIngest({ Work, clientId: null });
      } catch (err) {
        expect(err.message).to.eq('ClientId must be passed');
      }
    });

    it('should call fileManager.downloadFromS3 when passed an s3Key and clientId', async () => {
      try {
        await executeIngest({ Work });
      } catch (err) {
        expect(err.message).to.eq('No data passed');
        expect(fileManager.downloadFromS3.mock.calls.length).to.eq(1);
        expect(fileManager.downloadFromS3.mock.calls[0][0]).to.eq(s3Key);
        expect(fileManager.downloadFromS3.mock.calls[0][1]).to.eq(bucket);
      }
    });

    it('should throw download error when fileManager.downloadFromS3 fails', async () => {
      const error = new Error('This is an error');
      fileManager.downloadFromS3 = jest.fn().mockImplementation((_s3Key, _bucket, callback) => { callback(error, 'localFile'); });

      try {
        await executeIngest({ Work });
      } catch (err) {
        expect(err.message).to.eq(error.message);
      }
    });

    it('should throw error file could not be found when downloadFromS3 does not return a file', async () => {
      fileManager.downloadFromS3 = jest.fn().mockImplementation((_s3Key, _bucket, callback) => { callback(null, null); });

      try {
        await executeIngest({ Work });
      } catch (err) {
        expect(err.message).to.eq(`No file was found at location ${s3Key}`);
      }
    });

    it('should call cwrReader.readFile with the returned file', async () => {
      try {
        await executeIngest({ Work });
      } catch (err) {
        expect(err.message).to.eq('No data passed');
        expect(readFile.mock.calls.length).to.eq(1);
      }
    });

    it('should call ingestCwr.ingestData and throw error if no data', async () => {
      try {
        await executeIngest({ Work });
      } catch (err) {
        expect(err.message).to.eq('No data passed');
        expect(readFile.mock.calls.length).to.eq(1);
      }
    });

    it('should call ingestCwr.ingestWork and create new Work with source', async () => {
      cwrReader.mockImplementation((_cb) => ({ readFile, works: mockData.works, errors: [] }));

      await executeIngest({ Work });

      // Work not found, created
      expect(Work.mock.calls.length).to.eq(1);

      expect(workFindOne.mock.calls.length).to.eq(1);
      expect(workFindOne.mock.calls[0][0].clientId).to.eq(clientId);

      expect(workSave.mock.calls.length).to.eq(1);
      expect(workSave.mock.instances[0].source[0]).to.deep.include({ importId: Import._id, action: 'Created' });
      expect(workSave.mock.instances[0].source[0].date).not.to.be.undefined;
    });

    it('should call ingestCwr.ingestWork and create update Work with source', async () => {
      cwrReader.mockImplementation((_cb) => ({ readFile, works: mockData.works, errors: [] }));
      Work.findOne = jest.fn().mockImplementation((filter, cb) => { cb(null, { ...mockData.works[0], source: [], save: workSave }); });

      await executeIngest({ Work });

      // Work found, updating
      expect(Work.mock.calls.length).to.eq(0);

      expect(Work.findOne.mock.calls.length).to.eq(1);
      expect(Work.findOne.mock.calls[0][0].clientId).to.eq(clientId);

      expect(workSave.mock.calls.length).to.eq(1);
      expect(workSave.mock.instances[0].source[0]).to.deep.include({ importId: Import._id, action: 'Updated' });
      expect(workSave.mock.instances[0].source[0].date).not.to.be.undefined;
    });
  });

  describe('findPreviousWork', () => {
    it('should find previous work if matching identifiers', async () => {
      const data = { submitterWorkNo: mockData.works[0].submitterWorkNo };
      Work.findOne = jest.fn().mockImplementation((filter, cb) => { cb(null, workMock); });

      ingestCwr.findPreviousWork({ Work, data, clientId, Import }, (err, workResult) => {
        expect(Work.findOne.mock.calls.length).to.eq(1);
        expect(workResult).not.to.be.null;

        expect(Work.findOne.mock.calls[0][0].clientId).to.eq(clientId);
        expect(Work.findOne.mock.calls[0][0]['source.importPartnerId']).to.deep.eq(Import.importPartnerId);
        expect(Work.findOne.mock.calls[0][0].$or).to.deep.eq([{ identifier: data.submitterWorkNo }, { foreignId: data.submitterWorkNo }]);
      });
    });

    it('should return null if previous work not found', async () => {
      const data = { submitterWorkNo: mockData.works[0].submitterWorkNo };
      Work.findOne = jest.fn().mockImplementation((filter, cb) => { cb(null, null); });

      ingestCwr.findPreviousWork({ Work, data, clientId, Import }, (err, workResult) => {
        expect(Work.findOne.mock.calls.length).to.eq(1);
        expect(workResult).to.be.null;
      });
    });
  });

  describe('createPublisher', () => {
    let publisherData;
    const Publisher = {}; const Composer = {}; const workData = {};
    const lastInChain = false;
    const key = randomString();
    const shares = [];
    const commonTerritories = [];
    const mainChainTerritoriesArray = [];

    beforeEach(() => {
      publisherData = {
        publisherName: randomString(),
        prOwnershipShare: randomString(),
        mrOwnershipShare: randomString(),
        interestedPartyNo: randomString(),
      };
    });

    it('should return undefined if no publisherData', async () => {
      ingestCwr.createPublisher({
        Publisher, Composer, publisherData: null, workData, defaults, clientId, lastInChain, key, shares, commonTerritories, mainChainTerritoriesArray, Import,
      }, (_, result) => {
        expect(result).to.be.undefined;
      });
    });

    it('should return publisher data found by cae', async () => {
      publisherData.publisherIpiName = randomString();
      const mockPublisher = {
        _id: randomId(),
        save: jest.fn().mockImplementation((cb) => { cb(); }),
      };
      Publisher.findOne = jest.fn().mockImplementation((_, cb) => cb(null, mockPublisher));

      ingestCwr.createPublisher({
        Publisher, Composer, publisherData, workData, defaults, clientId, lastInChain, key, shares, commonTerritories, mainChainTerritoriesArray, Import,
      }, (_, result) => {
        expect(Publisher.findOne.mock.calls.length).to.eq(1);
        expect(Publisher.findOne.mock.calls[0][0].clientId).to.eq(clientId);
        expect(Publisher.findOne.mock.calls[0][0].$or).to.deep.eq([
          { cae: publisherData.publisherIpiName },
          { cae: publisherData.publisherIpiName },
          { caeWithoutLeadingZeros: publisherData.publisherIpiName },
        ]);
        expect(result.publisherId).to.eq(mockPublisher._id);
      });
    });

    it('should return publisher data found by name', async () => {
      const mockPublisher = {
        _id: randomId(),
        save: jest.fn().mockImplementation((cb) => { cb(); }),
      };
      Publisher.findOne = jest.fn().mockImplementation((_, cb) => cb(null, mockPublisher));

      ingestCwr.createPublisher({
        Publisher, Composer, publisherData, workData, defaults, clientId, lastInChain, key, shares, commonTerritories, mainChainTerritoriesArray, Import,
      }, (_, result) => {
        expect(Publisher.findOne.mock.calls.length).to.eq(1);
        expect(Publisher.findOne.mock.calls[0][0].clientId).to.eq(clientId);
        expect(Publisher.findOne.mock.calls[0][0].lowerCaseName).to.eq(publisherData.publisherName.toLowerCase());
        expect(result.publisherId).to.eq(mockPublisher._id);
      });
    });

    it('should return new publisher data when not found', async () => {
      const mockPublisherId = randomId();
      const mockPublisher = jest.fn().mockImplementation((newPublisher) => ({
        _id: mockPublisherId,
        ...newPublisher,
        save: jest.fn().mockImplementation((cb) => {
          cb(null, { _id: mockPublisherId, ...newPublisher });
        }),
      }));
      mockPublisher.findOne = jest.fn().mockImplementation((_, cb) => cb(null, null));
      const expectedResult = {
        publisherId: mockPublisherId,
        type: 'Publisher',
        children: [],
        contractType: null,
        controlled: false,
        interestedPartyNo: publisherData.interestedPartyNo,
        mechanicalCollection: publisherData.mrOwnershipShare,
        mechanicalOwnership: publisherData.mrOwnershipShare,
        performanceCollection: publisherData.prOwnershipShare,
        performanceOwnership: publisherData.prOwnershipShare,
      };

      ingestCwr.createPublisher({
        Publisher: mockPublisher, Composer, publisherData, workData, defaults, clientId, lastInChain, key, shares, commonTerritories, mainChainTerritoriesArray, Import,
      }, (_, result) => {
        expect(mockPublisher.findOne.mock.calls.length).to.eq(1);
        expect(result.publisherId).to.eq(mockPublisherId);
        expect(result).to.deep.eq(expectedResult);
      });
    });
  });

  describe('createComposer', () => {
    let composerData;
    const Composer = {};
    const key = randomString();
    const mainChainTerritoriesArray = [];

    beforeEach(() => {
      composerData = {
        writerFirstName: randomString(),
        writerLastName: randomString(),
        prOwnershipShare: 1,
        mrOwnershipShare: 1,
      };
    });

    it('should return undefined if no composerData', async () => {
      ingestCwr.createComposer({ Composer, composerData: null, defaults, clientId, key, mainChainTerritoriesArray, Import }, (_, result) => {
        expect(result).to.be.undefined;
      });
    });

    it('should return composer data found by cae', async () => {
      composerData.writerIpiNameNo = randomString();
      const mockComposer = {
        _id: randomId(),
        cae: composerData.writerIpiNameNo,
        save: jest.fn().mockImplementation((cb) => { cb(); }),
      };
      Composer.findOne = jest.fn().mockImplementation((_, cb) => cb(null, mockComposer));

      ingestCwr.createComposer({ Composer, composerData, defaults, clientId, key, mainChainTerritoriesArray, Import }, (_, result) => {
        expect(Composer.findOne.mock.calls.length).to.eq(1);
        expect(Composer.findOne.mock.calls[0][0].clientId).to.eq(clientId);
        expect(Composer.findOne.mock.calls[0][0].$or).to.deep.eq([
          { cae: composerData.writerIpiNameNo },
          { cae: composerData.writerIpiNameNo },
          { caeWithoutLeadingZeros: composerData.writerIpiNameNo },
        ]);
        expect(result.composerId).to.eq(mockComposer._id);
      });
    });

    it('should return new composer data found by cae if not unique', async () => {
      composerData.writerIpiNameNo = randomString();
      const mockComposerData = {
        _id: randomId(),
        save: jest.fn().mockImplementation((cb) => { cb(); }),
      };
      const mockComposerId = randomId();
      const mockComposer = jest.fn().mockImplementation((newComposer) => ({
        _id: mockComposerId,
        ...newComposer,
        save: jest.fn().mockImplementation((cb) => {
          cb(null, { _id: mockComposerId, ...newComposer });
        }),
      }));
      mockComposer.findOne = jest.fn().mockImplementation((_, cb) => cb(null, mockComposerData));

      ingestCwr.createComposer({ Composer: mockComposer, composerData, defaults, clientId, key, mainChainTerritoriesArray, Import }, (_, result) => {
        expect(mockComposer.findOne.mock.calls.length).to.eq(1);
        expect(mockComposer.findOne.mock.calls[0][0].clientId).to.eq(clientId);
        expect(mockComposer.findOne.mock.calls[0][0].$or).to.deep.eq([
          { cae: composerData.writerIpiNameNo },
          { cae: composerData.writerIpiNameNo },
          { caeWithoutLeadingZeros: composerData.writerIpiNameNo },
        ]);
        expect(result.composerId).to.eq(mockComposerId);
      });
    });

    it('should return composer data found by name', async () => {
      const mockComposer = {
        _id: randomId(),
        save: jest.fn().mockImplementation((cb) => { cb(); }),
      };
      Composer.findOne = jest.fn().mockImplementation((_, cb) => cb(null, mockComposer));

      ingestCwr.createComposer({ Composer, composerData, defaults, clientId, key, mainChainTerritoriesArray, Import }, (_, result) => {
        expect(Composer.findOne.mock.calls.length).to.eq(1);
        expect(Composer.findOne.mock.calls[0][0].clientId).to.eq(clientId);
        expect(Composer.findOne.mock.calls[0][0].lowerCaseName).to.eq(`${composerData.writerFirstName} ${composerData.writerLastName}`.toLowerCase());
        expect(result.composerId).to.eq(mockComposer._id);
      });
    });

    it('should return new composer data when not found', async () => {
      const mockComposerId = randomId();
      const mockComposer = jest.fn().mockImplementation((newComposer) => ({
        _id: mockComposerId,
        ...newComposer,
        save: jest.fn().mockImplementation((cb) => {
          cb(null, { _id: mockComposerId, ...newComposer });
        }),
      }));
      mockComposer.findOne = jest.fn().mockImplementation((_, cb) => cb(null, null));
      const expectedResult = {
        composerId: mockComposerId,
        type: 'Composer',
        contractType: 'Unknown',
        controlled: false,
        mechanicalCollection: composerData.mrOwnershipShare,
        mechanicalOwnership: composerData.mrOwnershipShare,
        performanceCollection: composerData.prOwnershipShare,
        performanceOwnership: composerData.prOwnershipShare,
      };

      ingestCwr.createComposer({ Composer: mockComposer, composerData, defaults, clientId, key, mainChainTerritoriesArray, Import }, (_, result) => {
        expect(mockComposer.findOne.mock.calls.length).to.eq(1);
        expect(result.composerId).to.eq(mockComposerId);
        expect(result).to.deep.eq(expectedResult);
      });
    });
  });

  describe('ingestData', function () {
    let Track; let Release; let Publisher; let Composer; let data;

    const executeIngestData = async (args) => new Promise((resolve, reject) => {
      ingestCwr.ingestData({ Work, Track, Release, Publisher, Composer, data, errors, clientId, defaults, submitter, Import, ...args }, (err, count, errors) => {
        if (err) reject(err);
        resolve({ err, count, errors });
      });
    });

    it('should return an error no data passed', async () => {
      try {
        await executeIngestData({ errors: null });
      } catch (err) {
        expect(err.message).to.eq('No data passed');
      }
    });

    it('should return an errors ingesting data', async () => {
      Work.findOne = jest.fn().mockImplementation((filter, cb) => { cb('some error', { ...mockData.works[0], source: [], save: workSave }); });

      const result = await executeIngestData({ data: [{}], errors: [] });

      expect(result.errors).to.have.lengthOf(1);
      expect(result.errors[0]).to.deep.include({ error: 'some error' });
    });

    it('should throw an error when not passed a client id', async () => {
      try {
        await executeIngestData({ data: [{}], errors: [], clientId: null });
      } catch (err) {
        expect(err.message).to.eq('ClientId must be passed');
      }
    });

    it('should do nothing if no work data', async () => {
      Work.findOne = jest.fn().mockImplementation((filter, cb) => { cb('some error', { ...mockData.works[0], source: [], save: workSave }); });

      const result = await executeIngestData({ data: [null], errors: [] });

      expect(result.errors).to.have.lengthOf(0);
      expect(result.count).to.eq(0);
      expect(result.err).to.be.null;
    });
  });

  describe('#combinePublisherChains', () => {
    it('should not merge publisher chains when there are two identifcal publishers but different publisherSequence numbers', (done) => {
      // arrange
      const publisherChains = {
        '01': [
          {
            lineType: 'SPU',
            cwrWorkNo: '00000885',
            cwrLineNo: '00000001',
            publisherSequence: '01',
            interestedPartyNo: 'AURE',
            publisherName: 'AURELIANS CLUB PUBLISHING',
            publisherUnknownIndicator: '',
            publisherType: 'E',
            taxId: '000000000',
            publisherIpiName: '00856394791',
            submitterAgreementNo: '',
            prSociety: '021',
            prOwnershipShare: 25,
            mrSociety: '099',
            mrOwnershipShare: 50,
            srSociety: '099',
            srOwnershipShare: 50,
            specialAgreementsIndicator: '',
            firstRecordingRefusalIndicator: false,
            publisherIpiBaseNo: '',
            internationStandardAgreementCode: '',
            societyAssignedAgreementNo: '',
            agreementType: '',
            usaLicenseIndicator: '',
          },
          {
            lineType: 'SPU',
            cwrWorkNo: '00000885',
            cwrLineNo: '00000002',
            publisherSequence: '01',
            interestedPartyNo: 'TERR',
            publisherName: 'TERRORBIRD TRACKS',
            publisherUnknownIndicator: '',
            publisherType: 'AM',
            taxId: '000000000',
            publisherIpiName: '00641885425',
            submitterAgreementNo: '',
            prSociety: '021',
            prOwnershipShare: 0,
            mrSociety: '099',
            mrOwnershipShare: 0,
            srSociety: '099',
            srOwnershipShare: 0,
            specialAgreementsIndicator: '',
            firstRecordingRefusalIndicator: false,
            publisherIpiBaseNo: '',
            internationStandardAgreementCode: '',
            societyAssignedAgreementNo: '',
            agreementType: '',
            usaLicenseIndicator: '',
          },
        ],
        '02': [
          {
            lineType: 'SPU',
            cwrWorkNo: '00000885',
            cwrLineNo: '00000004',
            publisherSequence: '02',
            interestedPartyNo: 'AURE',
            publisherName: 'AURELIANS CLUB PUBLISHING',
            publisherUnknownIndicator: '',
            publisherType: 'E',
            taxId: '000000000',
            publisherIpiName: '00856394791',
            submitterAgreementNo: '',
            prSociety: '021',
            prOwnershipShare: 25,
            mrSociety: '099',
            mrOwnershipShare: 50,
            srSociety: '099',
            srOwnershipShare: 50,
            specialAgreementsIndicator: '',
            firstRecordingRefusalIndicator: false,
            publisherIpiBaseNo: '',
            internationStandardAgreementCode: '',
            societyAssignedAgreementNo: '',
            agreementType: '',
            usaLicenseIndicator: '',
          },
          {
            lineType: 'SPU',
            cwrWorkNo: '00000885',
            cwrLineNo: '00000005',
            publisherSequence: '02',
            interestedPartyNo: 'TERR',
            publisherName: 'TERRORBIRD TRACKS',
            publisherUnknownIndicator: '',
            publisherType: 'AM',
            taxId: '000000000',
            publisherIpiName: '00641885425',
            submitterAgreementNo: '',
            prSociety: '021',
            prOwnershipShare: 0,
            mrSociety: '099',
            mrOwnershipShare: 0,
            srSociety: '099',
            srOwnershipShare: 0,
            specialAgreementsIndicator: '',
            firstRecordingRefusalIndicator: false,
            publisherIpiBaseNo: '',
            internationStandardAgreementCode: '',
            societyAssignedAgreementNo: '',
            agreementType: '',
            usaLicenseIndicator: '',
          },
        ],
      };
      const publisherTerritories = {
        '01': [
          {
            cwrWorkNo: '00000885',
            cwrLineNo: '00000003',
            interestedPartyNo: 'TERR',
            prCollectionShare: 25,
            mrCollectionShare: 50,
            srCollectionShare: 0,
            includeExclusionIndicator: 'I',
            territories: '2136',
            sharesChangeIndicator: 'N',
            sequenceNo: '001',
          },
        ],
        '02': [
          {
            cwrWorkNo: '00000885',
            cwrLineNo: '00000006',
            interestedPartyNo: 'TERR',
            prCollectionShare: 25,
            mrCollectionShare: 50,
            srCollectionShare: 0,
            includeExclusionIndicator: 'I',
            territories: '2136',
            sharesChangeIndicator: 'N',
            sequenceNo: '001',
          },
        ],
      };
      // Act
      const result = ingestCwr.combinePublisherChains(publisherChains, publisherTerritories);
      // Assert
      expect(result.publisherChains['01'][0].publisherSequence).to.eql(publisherChains['01'][0].publisherSequence);
      expect(result.publisherChains['01'][1].publisherSequence).to.eql(publisherChains['01'][1].publisherSequence);
      expect(result.publisherChains['02'][0].publisherSequence).to.eql(publisherChains['02'][0].publisherSequence);
      expect(result.publisherChains['02'][1].publisherSequence).to.eql(publisherChains['02'][1].publisherSequence);
      done();
    });

    it('should merge publisher chains when there are two identifcal publishers with the same publisherSequence numbers', (done) => {
      // arrange
      const publisherChains = {
        '01': [
          {
            lineType: 'SPU',
            cwrWorkNo: '00000885',
            cwrLineNo: '00000001',
            publisherSequence: '01',
            interestedPartyNo: 'AURE',
            publisherName: 'AURELIANS CLUB PUBLISHING',
            publisherUnknownIndicator: '',
            publisherType: 'E',
            taxId: '000000000',
            publisherIpiName: '00856394791',
            submitterAgreementNo: '',
            prSociety: '021',
            prOwnershipShare: 25,
            mrSociety: '099',
            mrOwnershipShare: 50,
            srSociety: '099',
            srOwnershipShare: 50,
            specialAgreementsIndicator: '',
            firstRecordingRefusalIndicator: false,
            publisherIpiBaseNo: '',
            internationStandardAgreementCode: '',
            societyAssignedAgreementNo: '',
            agreementType: '',
            usaLicenseIndicator: '',
          },
          {
            lineType: 'SPU',
            cwrWorkNo: '00000885',
            cwrLineNo: '00000002',
            publisherSequence: '01',
            interestedPartyNo: 'TERR',
            publisherName: 'TERRORBIRD TRACKS',
            publisherUnknownIndicator: '',
            publisherType: 'AM',
            taxId: '000000000',
            publisherIpiName: '00641885425',
            submitterAgreementNo: '',
            prSociety: '021',
            prOwnershipShare: 0,
            mrSociety: '099',
            mrOwnershipShare: 0,
            srSociety: '099',
            srOwnershipShare: 0,
            specialAgreementsIndicator: '',
            firstRecordingRefusalIndicator: false,
            publisherIpiBaseNo: '',
            internationStandardAgreementCode: '',
            societyAssignedAgreementNo: '',
            agreementType: '',
            usaLicenseIndicator: '',
          },
        ],
        '02': [
          {
            lineType: 'SPU',
            cwrWorkNo: '00000885',
            cwrLineNo: '00000004',
            publisherSequence: '01',
            interestedPartyNo: 'AURE',
            publisherName: 'AURELIANS CLUB PUBLISHING',
            publisherUnknownIndicator: '',
            publisherType: 'E',
            taxId: '000000000',
            publisherIpiName: '00856394791',
            submitterAgreementNo: '',
            prSociety: '021',
            prOwnershipShare: 25,
            mrSociety: '099',
            mrOwnershipShare: 50,
            srSociety: '099',
            srOwnershipShare: 50,
            specialAgreementsIndicator: '',
            firstRecordingRefusalIndicator: false,
            publisherIpiBaseNo: '',
            internationStandardAgreementCode: '',
            societyAssignedAgreementNo: '',
            agreementType: '',
            usaLicenseIndicator: '',
          },
          {
            lineType: 'SPU',
            cwrWorkNo: '00000885',
            cwrLineNo: '00000005',
            publisherSequence: '01',
            interestedPartyNo: 'TERR',
            publisherName: 'TERRORBIRD TRACKS',
            publisherUnknownIndicator: '',
            publisherType: 'AM',
            taxId: '000000000',
            publisherIpiName: '00641885425',
            submitterAgreementNo: '',
            prSociety: '021',
            prOwnershipShare: 0,
            mrSociety: '099',
            mrOwnershipShare: 0,
            srSociety: '099',
            srOwnershipShare: 0,
            specialAgreementsIndicator: '',
            firstRecordingRefusalIndicator: false,
            publisherIpiBaseNo: '',
            internationStandardAgreementCode: '',
            societyAssignedAgreementNo: '',
            agreementType: '',
            usaLicenseIndicator: '',
          },
        ],
      };
      const publisherTerritories = {
        '01': [
          {
            cwrWorkNo: '00000885',
            cwrLineNo: '00000003',
            interestedPartyNo: 'TERR',
            prCollectionShare: 25,
            mrCollectionShare: 50,
            srCollectionShare: 0,
            includeExclusionIndicator: 'I',
            territories: '2136',
            sharesChangeIndicator: 'N',
            sequenceNo: '001',
          },
        ],
        '02': [
          {
            cwrWorkNo: '00000885',
            cwrLineNo: '00000006',
            interestedPartyNo: 'TERR',
            prCollectionShare: 25,
            mrCollectionShare: 50,
            srCollectionShare: 0,
            includeExclusionIndicator: 'I',
            territories: '2136',
            sharesChangeIndicator: 'N',
            sequenceNo: '001',
          },
        ],
      };
      // Act
      const result = ingestCwr.combinePublisherChains(publisherChains, publisherTerritories);
      // Assert
      expect(result.publisherChains['01'][0].publisherSequence).to.eql(publisherChains['01'][0].publisherSequence);
      expect(result.publisherChains['01'][1].publisherSequence).to.eql(publisherChains['01'][1].publisherSequence);
      expect(result.publisherChains['02']).to.equal(undefined);
      done();
    });
  });
  describe('#mapSociety', () => {
    it('should return the correct society name', (done) => {
      const society = ingestCwr.mapSociety(338);
      expect(society).to.eql('EDEM');
      done();
    });
  });
});
