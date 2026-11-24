jest.mock('@curveroyaltysystems/curve-shared-logic', () => {
  const actual = jest.requireActual('@curveroyaltysystems/curve-shared-logic');
  return {
    ...actual,
    CwrReader: jest.fn(),
  };
});
jest.mock('../../../models/work', () => jest.fn());
jest.mock('../../../models/track', () => jest.fn());
jest.mock('../../../models/release', () => jest.fn());
jest.mock('../../../models/publisher', () => jest.fn());
jest.mock('../../../models/composer', () => jest.fn());

const { CwrReader } = require('@curveroyaltysystems/curve-shared-logic');
const { fileManager, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const Ingest = require('./ingest');
const Work = require('../../../models/work');
const Publisher = require('../../../models/publisher');
const Composer = require('../../../models/composer');

const { randomString, randomId } = testUtils;

const defaults = {};
const s3Key = randomString();
const bucket = randomString();
const clientId = randomId();
const submitter = randomString();
const Import = { _id: randomId(), importPartnerId: randomId() };
const mockData = { works: [{ _id: randomId(), submitterWorkNo: randomString() }] };
const errors = null;
const workMock = { _id: randomId() };

let workFindOne; let workSave; let mockReadFile;

beforeEach(() => {
  mockReadFile = jest.fn().mockImplementation((filePath, cb) => cb(null, mockData.works, []));
  CwrReader.mockImplementation(() => ({ readFile: mockReadFile }));

  fileManager.downloadFromS3 = jest.fn().mockImplementation((key, bucket, cb) => cb(null, 'localFile'));

  workFindOne = jest.fn().mockResolvedValue(null);
  workSave = jest.fn().mockResolvedValue();
  Work.mockImplementation((newWork) => ({ save: workSave, ...newWork }));
  Work.findOne = workFindOne;
});

afterEach(() => {
  jest.clearAllMocks();
});

const executeIngest = async (args) => Ingest.ingestCwrFile({ Import, submitter, clientId, bucket, s3Key, defaults, ...args });

describe('ingest', () => {
  it('should return an error when not passed an s3Key', async () => {
    try {
      await executeIngest({ s3Key: null });
    } catch (err) {
      expect(err.message).toBe('No file passed');
    }
  });

  it('should throw an error when not passed a bucket', async () => {
    try {
      await executeIngest({ bucket: null });
    } catch (err) {
      expect(err.message).toBe('No S3 bucket passed');
    }
  });

  it('should throw a client id error when not passed a clientId', async () => {
    try {
      await executeIngest({ clientId: null });
    } catch (err) {
      expect(err.message).toBe('ClientId must be passed');
    }
  });

  it('should call fileManager.downloadFromS3 when passed an s3Key and clientId', async () => {
    await executeIngest({});
    expect(fileManager.downloadFromS3.mock.calls.length).toBe(1);
    expect(fileManager.downloadFromS3.mock.calls[0][0]).toBe(s3Key);
    expect(fileManager.downloadFromS3.mock.calls[0][1]).toBe(bucket);
  });

  it('should throw download error when fileManager.downloadFromS3 fails', async () => {
    const error = new Error('This is an error');
    fileManager.downloadFromS3 = jest.fn().mockImplementation((key, bucket, cb) => cb(error));

    try {
      await executeIngest({});
    } catch (err) {
      expect(err.message).toBe(error.message);
    }
  });

  it('should throw error file could not be found when downloadFromS3 does not return a file', async () => {
    fileManager.downloadFromS3 = jest.fn().mockImplementation((key, bucket, cb) => cb(null, null));

    try {
      await executeIngest({});
    } catch (err) {
      expect(err.message).toBe(`No file was found at location ${s3Key}`);
    }
  });

  it('should call cwrReader.readFile with the returned file', async () => {
    mockReadFile.mockImplementation((filePath, cb) => cb(null, [], []));

    await executeIngest({});

    expect(mockReadFile.mock.calls.length).toBe(1);
    expect(mockReadFile.mock.calls[0][0]).toBe('localFile');
  });

  it('should call Ingest.ingestCwrFileData and throw error if no data', async () => {
    mockReadFile.mockImplementation((filePath, cb) => cb(null, null, []));

    try {
      await executeIngest({});
    } catch (err) {
      expect(err.message).toBe('No data passed');
    }
  });

  it('should call Ingest.ingestCwrFileWork and create new Work with source', async () => {
    await executeIngest({});

    expect(Work.mock.calls.length).toBe(1);
    expect(workFindOne.mock.calls[0][0].clientId).toBe(clientId);
    expect(workSave.mock.calls.length).toBe(1);
    expect(workSave.mock.instances[0].source[0]).toMatchObject({ importId: Import._id, action: 'Created' });
    expect(workSave.mock.instances[0].source[0].date).not.toBeUndefined();
  });

  it('should call Ingest.ingestCwrFileWork and update existing Work with source', async () => {
    const updatedWorkFindOne = jest.fn().mockResolvedValue({ ...mockData.works[0], source: [], save: workSave });
    Work.findOne = updatedWorkFindOne;

    await executeIngest({});

    expect(Work.mock.calls.length).toBe(0);
    expect(updatedWorkFindOne.mock.calls[0][0].clientId).toBe(clientId);
    expect(workSave.mock.calls.length).toBe(1);
    expect(workSave.mock.instances[0].source[0]).toMatchObject({ importId: Import._id, action: 'Updated' });
    expect(workSave.mock.instances[0].source[0].date).not.toBeUndefined();
  });
});

describe('findPreviousWork', () => {
  it('should find previous work if matching identifiers', async () => {
    const data = { submitterWorkNo: mockData.works[0].submitterWorkNo };
    Work.findOne = jest.fn().mockResolvedValue(workMock);

    const workResult = await Ingest.findPreviousWork({ data, clientId, Import });

    expect(Work.findOne.mock.calls.length).toBe(1);
    expect(workResult).not.toBe(null);
    expect(Work.findOne.mock.calls[0][0].clientId).toBe(clientId);
    expect(Work.findOne.mock.calls[0][0]['source.importPartnerId']).toEqual(Import.importPartnerId);
    expect(Work.findOne.mock.calls[0][0].$or).toEqual([
      { identifier: data.submitterWorkNo },
      { foreignId: data.submitterWorkNo },
    ]);
  });

  it('should return null if previous work not found', async () => {
    const data = { submitterWorkNo: mockData.works[0].submitterWorkNo };
    Work.findOne = jest.fn().mockResolvedValue(null);

    const workResult = await Ingest.findPreviousWork({ data, clientId, Import });

    expect(Work.findOne.mock.calls.length).toBe(1);
    expect(workResult).toBe(null);
  });
});

describe('createPublisher', () => {
  let publisherData;
  const workData = {};
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
    const result = await Ingest.createPublisher({
      publisherData: null, workData, defaults, clientId, lastInChain, key, shares, commonTerritories, mainChainTerritoriesArray, Import,
    });
    expect(result).toBeUndefined();
  });

  it('should return publisher data found by cae', async () => {
    publisherData.publisherIpiName = randomString();
    const mockPublisher = { _id: randomId(), save: jest.fn().mockResolvedValue() };
    Publisher.findOne = jest.fn().mockResolvedValue(mockPublisher);

    const result = await Ingest.createPublisher({
      publisherData, workData, defaults, clientId, lastInChain, key, shares, commonTerritories, mainChainTerritoriesArray, Import,
    });

    expect(Publisher.findOne.mock.calls.length).toBe(1);
    expect(Publisher.findOne.mock.calls[0][0].clientId).toBe(clientId);
    expect(Publisher.findOne.mock.calls[0][0].$or).toEqual([
      { cae: publisherData.publisherIpiName },
      { cae: publisherData.publisherIpiName },
      { caeWithoutLeadingZeros: publisherData.publisherIpiName },
    ]);
    expect(result.publisherId).toBe(mockPublisher._id);
  });

  it('should return publisher data found by name', async () => {
    const mockPublisher = { _id: randomId(), save: jest.fn().mockResolvedValue() };
    Publisher.findOne = jest.fn().mockResolvedValue(mockPublisher);

    const result = await Ingest.createPublisher({
      publisherData, workData, defaults, clientId, lastInChain, key, shares, commonTerritories, mainChainTerritoriesArray, Import,
    });

    expect(Publisher.findOne.mock.calls.length).toBe(1);
    expect(Publisher.findOne.mock.calls[0][0].clientId).toBe(clientId);
    expect(Publisher.findOne.mock.calls[0][0].lowerCaseName).toBe(publisherData.publisherName.toLowerCase());
    expect(result.publisherId).toBe(mockPublisher._id);
  });

  it('should return new publisher data when not found', async () => {
    const mockPublisherId = randomId();
    Publisher.mockImplementation((newPublisher) => ({
      _id: mockPublisherId,
      ...newPublisher,
      save: jest.fn().mockResolvedValue({ _id: mockPublisherId, ...newPublisher }),
    }));
    Publisher.findOne = jest.fn().mockResolvedValue(null);
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

    const result = await Ingest.createPublisher({
      publisherData, workData, defaults, clientId, lastInChain, key, shares, commonTerritories, mainChainTerritoriesArray, Import,
    });

    expect(Publisher.findOne.mock.calls.length).toBe(1);
    expect(result.publisherId).toBe(mockPublisherId);
    expect(result).toEqual(expectedResult);
  });
});

describe('createComposer', () => {
  let composerData;
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
    const result = await Ingest.createComposer({ composerData: null, defaults, clientId, key, mainChainTerritoriesArray, Import });
    expect(result).toBeUndefined();
  });

  it('should return composer data found by cae', async () => {
    composerData.writerIpiNameNo = randomString();
    const mockComposer = { _id: randomId(), cae: composerData.writerIpiNameNo, save: jest.fn().mockResolvedValue() };
    Composer.findOne = jest.fn().mockResolvedValue(mockComposer);

    const result = await Ingest.createComposer({ composerData, defaults, clientId, key, mainChainTerritoriesArray, Import });

    expect(Composer.findOne.mock.calls.length).toBe(1);
    expect(Composer.findOne.mock.calls[0][0].clientId).toBe(clientId);
    expect(Composer.findOne.mock.calls[0][0].$or).toEqual([
      { cae: composerData.writerIpiNameNo },
      { cae: composerData.writerIpiNameNo },
      { caeWithoutLeadingZeros: composerData.writerIpiNameNo },
    ]);
    expect(result.composerId).toBe(mockComposer._id);
  });

  it('should return new composer data found by cae if not unique', async () => {
    composerData.writerIpiNameNo = randomString();
    const mockComposerData = { _id: randomId(), save: jest.fn().mockResolvedValue() };
    const mockComposerId = randomId();
    Composer.mockImplementation((newComposer) => ({
      _id: mockComposerId,
      ...newComposer,
      save: jest.fn().mockResolvedValue({ _id: mockComposerId, ...newComposer }),
    }));
    Composer.findOne = jest.fn().mockResolvedValue(mockComposerData);

    const result = await Ingest.createComposer({ composerData, defaults, clientId, key, mainChainTerritoriesArray, Import });

    expect(Composer.findOne.mock.calls.length).toBe(1);
    expect(Composer.findOne.mock.calls[0][0].clientId).toBe(clientId);
    expect(Composer.findOne.mock.calls[0][0].$or).toEqual([
      { cae: composerData.writerIpiNameNo },
      { cae: composerData.writerIpiNameNo },
      { caeWithoutLeadingZeros: composerData.writerIpiNameNo },
    ]);
    expect(result.composerId).toBe(mockComposerId);
  });

  it('should return composer data found by name', async () => {
    const mockComposer = { _id: randomId(), save: jest.fn().mockResolvedValue() };
    Composer.findOne = jest.fn().mockResolvedValue(mockComposer);

    const result = await Ingest.createComposer({ composerData, defaults, clientId, key, mainChainTerritoriesArray, Import });

    expect(Composer.findOne.mock.calls.length).toBe(1);
    expect(Composer.findOne.mock.calls[0][0].clientId).toBe(clientId);
    expect(Composer.findOne.mock.calls[0][0].lowerCaseName).toBe(`${composerData.writerFirstName} ${composerData.writerLastName}`.toLowerCase());
    expect(result.composerId).toBe(mockComposer._id);
  });

  it('should return new composer data when not found', async () => {
    const mockComposerId = randomId();
    Composer.mockImplementation((newComposer) => ({
      _id: mockComposerId,
      ...newComposer,
      save: jest.fn().mockResolvedValue({ _id: mockComposerId, ...newComposer }),
    }));
    Composer.findOne = jest.fn().mockResolvedValue(null);
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

    const result = await Ingest.createComposer({ composerData, defaults, clientId, key, mainChainTerritoriesArray, Import });

    expect(Composer.findOne.mock.calls.length).toBe(1);
    expect(result.composerId).toBe(mockComposerId);
    expect(result).toEqual(expectedResult);
  });
});

describe('ingestData', () => {
  let data;

  const executeIngestData = async (args) => Ingest.ingestData({ data, errors, clientId, defaults, submitter, Import, ...args });

  it('should return an error when no data passed', async () => {
    try {
      await executeIngestData({ errors: null });
    } catch (err) {
      expect(err.message).toBe('No data passed');
    }
  });

  it('should return errors when ingesting data fails', async () => {
    Work.findOne = jest.fn().mockRejectedValue('some error');

    const result = await executeIngestData({ data: [{}], errors: [] });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({ error: 'some error' });
  });

  it('should throw an error when not passed a client id', async () => {
    try {
      await executeIngestData({ data: [{}], errors: [], clientId: null });
    } catch (err) {
      expect(err.message).toBe('ClientId must be passed');
    }
  });

  it('should do nothing if no work data', async () => {
    Work.findOne = jest.fn().mockRejectedValue('some error');

    const result = await executeIngestData({ data: [null], errors: [] });

    expect(result.errors).toHaveLength(0);
    expect(result.count).toBe(0);
  });
});

describe('combinePublisherChains', () => {
  it('should not merge chains when two identical publishers have different publisherSequence numbers', () => {
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
      '01': [{ cwrWorkNo: '00000885', cwrLineNo: '00000003', interestedPartyNo: 'TERR', prCollectionShare: 25, mrCollectionShare: 50, srCollectionShare: 0, includeExclusionIndicator: 'I', territories: '2136', sharesChangeIndicator: 'N', sequenceNo: '001' }],
      '02': [{ cwrWorkNo: '00000885', cwrLineNo: '00000006', interestedPartyNo: 'TERR', prCollectionShare: 25, mrCollectionShare: 50, srCollectionShare: 0, includeExclusionIndicator: 'I', territories: '2136', sharesChangeIndicator: 'N', sequenceNo: '001' }],
    };

    const result = Ingest.combinePublisherChains(publisherChains, publisherTerritories);

    expect(result.publisherChains['01'][0].publisherSequence).toBe(publisherChains['01'][0].publisherSequence);
    expect(result.publisherChains['01'][1].publisherSequence).toBe(publisherChains['01'][1].publisherSequence);
    expect(result.publisherChains['02'][0].publisherSequence).toBe(publisherChains['02'][0].publisherSequence);
    expect(result.publisherChains['02'][1].publisherSequence).toBe(publisherChains['02'][1].publisherSequence);
  });

  it('should merge chains when two identical publishers have the same publisherSequence numbers', () => {
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
      '01': [{ cwrWorkNo: '00000885', cwrLineNo: '00000003', interestedPartyNo: 'TERR', prCollectionShare: 25, mrCollectionShare: 50, srCollectionShare: 0, includeExclusionIndicator: 'I', territories: '2136', sharesChangeIndicator: 'N', sequenceNo: '001' }],
      '02': [{ cwrWorkNo: '00000885', cwrLineNo: '00000006', interestedPartyNo: 'TERR', prCollectionShare: 25, mrCollectionShare: 50, srCollectionShare: 0, includeExclusionIndicator: 'I', territories: '2136', sharesChangeIndicator: 'N', sequenceNo: '001' }],
    };

    const result = Ingest.combinePublisherChains(publisherChains, publisherTerritories);

    expect(result.publisherChains['01'][0].publisherSequence).toBe(publisherChains['01'][0].publisherSequence);
    expect(result.publisherChains['01'][1].publisherSequence).toBe(publisherChains['01'][1].publisherSequence);
    expect(result.publisherChains['02']).toBeUndefined();
  });
});
