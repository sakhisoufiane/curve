const { testUtils, fileManager, createXlsx } = require('@curveroyaltysystems/platform-shared-utils');
const { Exports } = require('@curveroyaltysystems/curve-shared-logic');
const { randomString, randomId, randomJsDate } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

jest.mock('../track', () => {
  const mockTrack = jest.fn(() => ({
    save: jest.fn().mockResolvedValue({ _id: 'mockTrackId' }),
  }));
  mockTrack.find = jest.fn();
  mockTrack.findById = jest.fn();
  mockTrack.countDocuments = jest.fn();
  return mockTrack;
});

const Client = require('../client');
const Composer = require('../composer');
const Contract = require('../contract');
const DeliveryPartner = require('../deliveryPartner');
const Notification = require('../notification');
const Publisher = require('../publisher');
const PublisherController = require('../../controllers/publisher');
const Track = require('../track');
const TerritoryGroup = require('../territoryGroup');
const User = require('../user');
const Work = require('./work');

describe('Works', () => {
  let clientId;

  beforeEach(() => {
    clientId = testUtils.randomId();

    jest.spyOn(Work, 'findById').mockResolvedValue(undefined);
    jest.spyOn(Work, 'countDocuments').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('model', () => {
    const source = {
      importId: randomId(),
      action: 'Created',
      date: randomJsDate(),
    };
    const workFields = {
      clientId: randomId(),
      title: randomString(),
      composer: randomString(),
      foreignId: randomString(),
      projectId: randomString(),
      identifier: randomString(),
      tunecode: randomString(),
      iswc: randomString(),
      notes: randomString(),
      contractValidation: randomString(),
      duplicatedFrom: randomString(),
      compositeType: 'None',
      versionType: 'Original Work',
      arrangementType: 'Original',
      lyricAdaptionType: 'None',
      originalWorkTitle: randomString(),
      originalIswc: randomString(),
      originalWorkWriterLastName: randomString(),
      originalWorkWriterFirstName: randomString(),
      originalWorkSource: randomString(),
      approvalStatus: 'Invalid',
    };
    let work;

    beforeEach(() => {
      work = new Work({ ...workFields, source: [source] });
    });

    it('should contain expected fields', () => {
      expect(work.toObject()).toEqual(expect.objectContaining(workFields));
    });

    it('should contain expected source fields', () => {
      expect(work.source[0].importId.toString()).toBe(source.importId);
      expect(work.source[0].action).toBe(source.action);
      expect(work.source[0].date).toEqual(source.date);
    });
  });

  describe('findRelatedTracks', () => {
    let work;
    let trackId;

    beforeEach(() => {
      work = new Work({ clientId, title: testUtils.randomString(), identifier: testUtils.randomString() });
      trackId = testUtils.randomId();

      Track.find.mockResolvedValue([{ _id: trackId, isrc: 1 }]);
      Track.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue({ _id: trackId }),
      }));
    });

    it('should not error when the track ISRCs are digits (CUR-3310)', (done) => {
      const workData = { trackIsrcs: [1] };
      work.findRelatedTracks(workData, Track, (err) => {
        expect(err).toBeUndefined();
        expect(work.trackIds).toEqual([trackId]);
        done();
      });
    });
  });

  describe('sendExport', () => {
    let work;
    let client;
    let curveUser;
    let exportTemplate;
    let xlsxFormattedWork;

    beforeEach(() => {
      client = new Client({ name: testUtils.randomString(), features: { partnersChains: false }, dateFormat: 'yyyy-mm-dd', clientType: 'Publisher' });
      work = new Work({ clientId: client._id.toString(), catNo: testUtils.randomString(), barcode: testUtils.randomString(), format: testUtils.randomString() });
      curveUser = new User({ name: testUtils.randomString(), email: testUtils.randomString(), clientId: client._id.toString() });
      exportTemplate = testUtils.randomString();
      xlsxFormattedWork = [testUtils.randomArray()];

      // Mocks
      jest.spyOn(Work, 'countDocuments').mockResolvedValue(1);
      jest.spyOn(Work, 'createExportXlsx').mockImplementation((filter, clientId, cb) => {
        cb(null, testUtils.randomString());
      });
      jest.spyOn(Work, 'createExportCsv').mockImplementation((filter, count, clientId, cb) => {
        cb(null, testUtils.randomString());
      });
      jest.spyOn(Work, 'find').mockResolvedValue([work]);
      jest.spyOn(Work, 'convertWorksForXlsx').mockImplementation((_, cb) => cb(null, xlsxFormattedWork));
      jest.spyOn(Client, 'findById').mockResolvedValue(client);
      jest.spyOn(fileManager, 'uploadToS3').mockImplementation((key, localPath, cb) => {
        cb(null, 'mock/s3/key.xlsx');
      });
      jest.spyOn(fileManager, 'publicLink24Hours').mockImplementation((key, cb) => {
        cb(null, 'https://mocked-link.com/download');
      });
      jest.spyOn(Notification, 'generate').mockImplementation((...args) => {
        const cb = args[args.length - 1];
        if (typeof cb === 'function') cb(null, null);
      });
      jest.spyOn(createXlsx, 'createInTemplate').mockImplementation((data, template, cb) => cb(null, testUtils.randomString()));
      jest.spyOn(Exports, 'getTemplate').mockResolvedValue(exportTemplate);
    });

    it('should call Work.countDocuments with the passed filter', async () => {
      const filter = { _id: { $in: [work.id] } };
      await Work.sendExport(filter, curveUser);
      expect(Work.countDocuments).toHaveBeenCalledWith(filter);
    });

    it('should export in Excel format when < 1000 works', async () => {
      await Work.sendExport({ _id: { $in: [work.id] } }, curveUser);
      expect(Work.createExportXlsx).toHaveBeenCalled();
      expect(Work.createExportCsv).not.toHaveBeenCalled();
    });

    it('should export in CSV format when >= 1000 works', async () => {
      Work.countDocuments.mockResolvedValue(1000);
      await Work.sendExport({ _id: { $in: [work.id] } }, curveUser);
      expect(Work.createExportXlsx).not.toHaveBeenCalled();
      expect(Work.createExportCsv).toHaveBeenCalled();
    });

    it('should call CreateXlsx.createInTemplate with the returned data from Work.find and the work template', async () => {
      // Arrange
      jest.spyOn(Work, 'countDocuments').mockResolvedValue(10);
      jest.spyOn(Work, 'find').mockResolvedValue([work]);
      jest.spyOn(Work, 'convertWorksForXlsx').mockImplementation((_, cb) => cb(null, xlsxFormattedWork));
      jest.spyOn(createXlsx, 'createInTemplate').mockImplementation((data, template, cb) => cb(null, 'mocked.xlsx'));

      jest.spyOn(Work, 'createExportXlsx').mockImplementation((filter, clientId, cb) => {
        Work.convertWorksForXlsx(filter, (err, formatted) => {
          if (err) return cb(err);
          createXlsx.createInTemplate(formatted, exportTemplate, cb);
        });
      });

      // Act
      Work.sendExport({ _id: { $in: [work.id] } }, curveUser);

      // Because of the way this function is called in this await is needed to wait for a Promise in a deep callback tree to resolve
      // This is not good, please fix this when refactoring Work exports
      // Assert
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(Work.convertWorksForXlsx).toHaveBeenCalled();
      expect(createXlsx.createInTemplate).toHaveBeenCalledWith(
        xlsxFormattedWork,
        exportTemplate,
        expect.any(Function),
      );
    });

    // TODO: Re-enable and fix this test once Work exports have been refactored (moved to a task)
    // it('should call CreateXlsx.createInTemplate with the returned data from Work.find and the work template', async () => {
    //   // Arrage
    //   Work.createExportXlsx.mockRestore();
    //   // Act
    //   Work.sendExport({ _id: { $in: [work.id] } }, curveUser);
    //   // Because of the way this function is called in this await is needed to wait for a Promise in a deep callback tree to resolve
    //   // This is not good, please fix this when refactoring Work exports
    //   // Assert
    //   // eslint-disable-next-line no-promise-executor-return
    //   await new Promise((resolve) => setTimeout(resolve, 100));
    //   expect(Work.convertWorksForXlsx).toHaveBeenCalled();
    //   expect(createXlsx.createInTemplate).toHaveBeenCalledWith(xlsxFormattedWork, exportTemplate, expect.any(Function));
    // });
  });

  describe('addPartnerIpChains', () => {
    it('should create Partner Chains for an imported Work', async () => {
      // Arrange
      const work = new Work({ _id: randomId(), title: randomString() });
      const deliveryPartner = new DeliveryPartner({ _id: randomId(), name: randomString() });
      jest.spyOn(DeliveryPartner, 'findOne').mockResolvedValue(deliveryPartner);

      const indexedIpChains = {
        [`_id_${work._id}`]: [
          {
            _id: work._id.toString(),
            title: 'Way That I Am',
            identifier: '17326',
            tunecode: null,
            territory: 'WW',
            partnerName: deliveryPartner.name,
            participant1Type: 'Composer',
            participant1Name: 'Maksim Lemberskiy',
            participant1FirstName: 'Maksim',
            participant1MiddleName: null,
            participant1Surname: 'Lemberskiy',
            participant1CaeNumber: '00750666823',
            participant1Controlled: false,
            participant1MechanicalOwned: 40,
            participant1MechanicalCollected: 40,
            participant1PerformanceOwned: 40,
            participant1PerformanceCollected: 40,
            participant1Capacity: 'Lyrics and Music',
            participant2Type: 'Composer',
            participant2Name: 'Chinedu Enigwe',
            participant2FirstName: 'Chinedu',
            participant2MiddleName: null,
            participant2Surname: 'Enigwe',
            participant2CaeNumber: '00841865417',
            participant2Controlled: false,
            participant2MechanicalOwned: 20,
            participant2MechanicalCollected: 20,
            participant2PerformanceOwned: 20,
            participant2PerformanceCollected: 20,
            participant2Capacity: 'Lyrics and Music',
            modified: true,
            originalRow: [],
            line: 11,
          },
          {
            _id: work._id.toString(),
            title: 'Way That I Am',
            identifier: '17326',
            tunecode: null,
            territory: 'WW',
            partnerName: deliveryPartner.name,
            participant1Type: 'Publisher',
            participant1Name: 'Wikset',
            participant1FirstName: null,
            participant1MiddleName: null,
            participant1Surname: null,
            participant1CaeNumber: '00702513390',
            participant1Controlled: true,
            participant1MechanicalOwned: 40,
            participant1MechanicalCollected: 40,
            participant1PerformanceOwned: 20,
            participant1PerformanceCollected: 20,
            participant1Capacity: 'Original Publisher',
            participant2Type: 'Composer',
            participant2Name: 'Patrick Morales',
            participant2FirstName: 'Patrick',
            participant2MiddleName: 'Garland',
            participant2Surname: 'Morales',
            participant2CaeNumber: '00702513194',
            participant2Controlled: true,
            participant2MechanicalOwned: 0,
            participant2MechanicalCollected: 0,
            participant2PerformanceOwned: 20,
            participant2PerformanceCollected: 20,
            participant2Capacity: 'Lyrics and Music',
            modified: true,
            originalRow: [],
            line: 280,
          },
        ],
      };

      const indexedComposersPublishers = {};
      const clientId = randomId();
      const overwriteBlanks = false;

      // Act
      await work.addPartnerIpChains(indexedIpChains, indexedComposersPublishers, clientId, overwriteBlanks);

      // Assert
      expect(work.partnerRightsChains).toHaveLength(1);
      const chain = work.partnerRightsChains[0];
      expect(chain.deliveryPartnerId).toBe(deliveryPartner._id.toString());

      const rightsChain = chain.rightsChain[0];
      expect(rightsChain.territory).toBe('WW');

      // Composer 1
      expect(rightsChain.children[0]).toEqual(expect.objectContaining({
        type: 'Composer',
        name: 'Maksim Lemberskiy',
        contractType: 'Lyrics and Music',
        index: 0,
      }));
      expect(rightsChain.children[0].children).toHaveLength(0);

      // Publisher → Composer
      expect(rightsChain.children[1]).toEqual(expect.objectContaining({
        type: 'Publisher',
        name: 'Wikset',
        contractType: 'Original Publisher',
        index: 1,
      }));
      expect(rightsChain.children[1].children[0]).toEqual(expect.objectContaining({
        type: 'Composer',
        name: 'Patrick Morales',
        contractType: 'Lyrics and Music',
        index: 1,
      }));

      // Composer 2
      expect(rightsChain.children[2]).toEqual(expect.objectContaining({
        type: 'Composer',
        name: 'Chinedu Enigwe',
        contractType: 'Lyrics and Music',
        index: 0,
      }));
      expect(rightsChain.children[2].children).toHaveLength(0);
    });
  });

  describe('getComposer — indexed CAE deduplication with dummy IPIs', () => {
    const getComposer = Work._getComposer;

    beforeEach(() => {
      jest.spyOn(Composer, 'findOne')
        .mockReturnValue({ then: (resolve) => { resolve(null); return { catch: () => { } }; } });
    });

    function buildIndexedComposer(overrides = {}) {
      const firstName = randomString();
      const surname = randomString();
      const name = `${firstName} ${surname}`;
      const composerId = randomId();
      const entry = {
        type: 'Composer',
        name,
        firstName,
        middleName: null,
        surname,
        caeNumber: '00000000000',
        controlled: false,
        composer: { _id: composerId, name, firstName, middleName: null, surname },
        ...overrides,
      };
      const key = `Composer_${entry.name.toLowerCase()}_${entry.caeNumber}`;
      return { key, entry };
    }

    it('should NOT match a different composer that shares a dummy IPI (00000000000)', (done) => {
      const { key, entry } = buildIndexedComposer();
      const indexed = { [key]: entry };

      const otherFirstName = randomString();
      const otherSurname = randomString();
      const otherName = `${otherFirstName} ${otherSurname}`;

      getComposer(clientId, otherName, otherFirstName, null, otherSurname, '00000000000', false, indexed, (err, composer) => {
        expect(composer).toBeDefined();
        expect(composer.name).toBe(otherName);
        expect(composer.name).not.toBe(entry.name);
        expect(composer.saveLater).toBe(true);
        done();
      });
    });

    it('should match the SAME composer when name and dummy IPI both match', (done) => {
      const { key, entry } = buildIndexedComposer();
      const indexed = { [key]: entry };

      getComposer(clientId, entry.name, entry.firstName, null, entry.surname, '00000000000', false, indexed, (err, composer) => {
        expect(composer).toBeDefined();
        expect(composer.composer._id).toBe(entry.composer._id);
        done();
      });
    });

    it('should match the same composer case-insensitively', (done) => {
      const { key, entry } = buildIndexedComposer();
      const indexed = { [key]: entry };

      getComposer(clientId, entry.name.toUpperCase(), entry.firstName, null, entry.surname, '00000000000', false, indexed, (err, composer) => {
        expect(composer).toBeDefined();
        expect(composer.composer._id).toBe(entry.composer._id);
        done();
      });
    });

    it('should still deduplicate composers with real CAEs', (done) => {
      const realCae = '12345678901';
      const { key, entry } = buildIndexedComposer({ caeNumber: realCae, controlled: true });
      const indexed = { [key]: entry };

      getComposer(clientId, entry.name, entry.firstName, null, entry.surname, realCae, true, indexed, (err, composer) => {
        expect(composer).toBeDefined();
        expect(composer.composer._id).toBe(entry.composer._id);
        done();
      });
    });
  });

  describe('addSpecificRights', () => {
    let work;
    let contractId;
    let theContractName;

    beforeEach(() => {
      work = new Work({ _id: randomId(), title: randomString(), identifier: randomString() });
      contractId = randomId();
      theContractName = randomString();

      Contract.findOne = jest.fn().mockImplementation(() => Promise.resolve({ _id: contractId, name: theContractName }));
      TerritoryGroup.findOne = jest.fn().mockImplementation(() => Promise.resolve(null));
      Client.findById = jest.fn().mockImplementation(() => Promise.resolve(null));
    });

    function buildIndexedRights(workRef, rows) {
      return {
        [`_id_${workRef._id}`]: rows.map((row, i) => ({
          _id: workRef._id.toString(),
          title: workRef.title,
          identifier: workRef.identifier,
          tunecode: null,
          contractName: theContractName,
          distributionChannel: '',
          source: '',
          territory: '',
          publishers: '',
          percentage: Math.floor(Math.random() * 100),
          modified: true,
          originalRow: [],
          line: i + 3,
          ...row,
        })),
      };
    }

    it('should import a standard specific rate without publishers', (done) => {
      const expectedPercentage = Math.floor(Math.random() * 100);
      const indexed = buildIndexedRights(work, [{ percentage: expectedPercentage }]);

      work.addSpecificRights(indexed, clientId, false, (err, errors) => {
        expect(err).toBeNull();
        expect(errors).toEqual([]);
        expect(work.channelSpecificSalesReturnsRights).toHaveLength(1);
        expect(work.channelSpecificSalesReturnsRights[0].percentage).toBe(expectedPercentage);
        expect(work.channelSpecificSalesReturnsRights[0].publishers).toEqual([]);
        expect(work.enablePublisherMapping).toBeFalsy();
        done();
      });
    });

    it('should resolve publishers and set enablePublisherMapping when publishers column is populated', (done) => {
      const publisherId1 = randomId();
      const publisherId2 = randomId();
      const publisherName1 = randomString();
      const publisherName2 = randomString();

      PublisherController.resolvePublisherByName = jest.fn()
        .mockImplementation(({ name }) => {
          if (name === publisherName1) return Promise.resolve({ _id: publisherId1, name: publisherName1 });
          if (name === publisherName2) return Promise.resolve({ _id: publisherId2, name: publisherName2 });
          return Promise.resolve(null);
        });

      const indexed = buildIndexedRights(work, [{
        publishers: `${publisherName1}:${publisherName2}`,
      }]);

      work.addSpecificRights(indexed, clientId, false, (err, errors) => {
        expect(err).toBeNull();
        expect(errors).toEqual([]);
        expect(work.channelSpecificSalesReturnsRights).toHaveLength(1);

        const rate = work.channelSpecificSalesReturnsRights[0];
        expect(rate.publishers).toEqual([publisherId1.toString(), publisherId2.toString()]);
        expect(work.enablePublisherMapping).toBe(true);
        done();
      });
    });

    it('should report errors for unresolved publisher names and still add the rate', (done) => {
      const unknownName = randomString();

      PublisherController.resolvePublisherByName = jest.fn()
        .mockImplementation(() => Promise.resolve(null));

      const indexed = buildIndexedRights(work, [{
        publishers: unknownName,
      }]);

      work.addSpecificRights(indexed, clientId, false, (err, errors) => {
        expect(err).toBeNull();
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain(`Publisher '${unknownName}' not found`);
        // Rate is still added but without publishers
        expect(work.channelSpecificSalesReturnsRights).toHaveLength(1);
        expect(work.channelSpecificSalesReturnsRights[0].publishers).toEqual([]);
        done();
      });
    });

    it('should not set enablePublisherMapping when no rows have publishers', (done) => {
      const indexed = buildIndexedRights(work, [
        { percentage: Math.floor(Math.random() * 100) },
        { percentage: Math.floor(Math.random() * 100) },
      ]);

      work.addSpecificRights(indexed, clientId, false, (err, errors) => {
        expect(err).toBeNull();
        expect(errors).toEqual([]);
        expect(work.channelSpecificSalesReturnsRights).toHaveLength(2);
        expect(work.enablePublisherMapping).toBeFalsy();
        done();
      });
    });

    it('should set enablePublisherMapping when at least one row has publishers', (done) => {
      const publisherId = randomId();
      const publisherName = randomString();

      PublisherController.resolvePublisherByName = jest.fn()
        .mockImplementation(({ name }) => {
          if (name === publisherName) return Promise.resolve({ _id: publisherId, name: publisherName });
          return Promise.resolve(null);
        });

      const indexed = buildIndexedRights(work, [
        { publishers: '' },
        { publishers: publisherName },
      ]);

      work.addSpecificRights(indexed, clientId, false, (err, errors) => {
        expect(err).toBeNull();
        expect(errors).toEqual([]);
        expect(work.channelSpecificSalesReturnsRights).toHaveLength(2);

        // First rate has no publishers
        expect(work.channelSpecificSalesReturnsRights[0].publishers).toEqual([]);
        // Second rate has publishers
        expect(work.channelSpecificSalesReturnsRights[1].publishers).toEqual([publisherId.toString()]);
        expect(work.enablePublisherMapping).toBe(true);
        done();
      });
    });

    it('should handle whitespace-only publishers column as empty', (done) => {
      const indexed = buildIndexedRights(work, [{
        publishers: '   ',
      }]);

      work.addSpecificRights(indexed, clientId, false, (err, errors) => {
        expect(err).toBeNull();
        expect(errors).toEqual([]);
        expect(work.channelSpecificSalesReturnsRights).toHaveLength(1);
        expect(work.channelSpecificSalesReturnsRights[0].publishers).toEqual([]);
        expect(work.enablePublisherMapping).toBeFalsy();
        done();
      });
    });
  });

  describe('exportSpecificParticipationRates', () => {
    it('should include publisher names in exported data', (done) => {
      const contractId = randomId();
      const contractName = randomString();
      const publisherId1 = randomId();
      const publisherId2 = randomId();
      const publisherName1 = randomString();
      const publisherName2 = randomString();
      const percentage = Math.floor(Math.random() * 100);
      const distributionChannel = randomString();
      const source = randomString();
      const territory = randomString();

      const work = new Work({
        _id: randomId(),
        title: randomString(),
        identifier: randomString(),
        tunecode: randomString(),
        channelSpecificSalesReturnsRights: [{
          contractId: contractId.toString(),
          distributionChannel,
          source,
          territory,
          publishers: [publisherId1.toString(), publisherId2.toString()],
          percentage,
        }],
      });

      Contract.findById = jest.fn().mockImplementation(() => Promise.resolve({ _id: contractId, name: contractName }));
      Publisher.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            catch: jest.fn().mockImplementation(() => Promise.resolve([
              { _id: publisherId1, name: publisherName1 },
              { _id: publisherId2, name: publisherName2 },
            ])),
          }),
        }),
      });

      work.exportSpecificParticipationRates((err, result) => {
        expect(err).toBeNull();
        expect(result).toHaveLength(1);

        const row = result[0];
        expect(row).toHaveLength(10);
        // Publishers at index 8, Rate at index 9
        expect(row[8]).toBe(`${publisherName1}:${publisherName2}`);
        expect(row[9]).toBe(percentage);
        done();
      });
    });

    it('should export empty string for rates without publishers', (done) => {
      const contractId = randomId();
      const contractName = randomString();
      const percentage = Math.floor(Math.random() * 100);

      const work = new Work({
        _id: randomId(),
        title: randomString(),
        identifier: randomString(),
        tunecode: randomString(),
        channelSpecificSalesReturnsRights: [{
          contractId: contractId.toString(),
          distributionChannel: randomString(),
          source: randomString(),
          territory: randomString(),
          percentage,
        }],
      });

      Contract.findById = jest.fn().mockImplementation(() => Promise.resolve({ _id: contractId, name: contractName }));

      work.exportSpecificParticipationRates((err, result) => {
        expect(err).toBeNull();
        expect(result).toHaveLength(1);

        const row = result[0];
        expect(row).toHaveLength(10);
        // Publishers at index 8 should be empty string
        expect(row[8]).toBe('');
        expect(row[9]).toBe(percentage);
        done();
      });
    });
  });

  describe('convertWorksForXlsx — specific participation rates', () => {
    const sprRow = ['workId', 'title', 'identifier', 'tunecode', 'contract', 'channel', 'source', 'territory', 'Publisher A:Publisher B', 50];

    function buildFakeWork() {
      return {
        rightsChain: [],
        exportData: jest.fn((client, dateFormat, cb) => cb(null, [])),
        exportAlternateTitles: jest.fn((cb) => cb(null, [])),
        exportParticipators: jest.fn((cb) => cb(null, [])),
        exportSpecificParticipationRates: jest.fn((cb) => cb(null, [sprRow])),
        exportSocietyIdentifiers: jest.fn((cb) => cb(null, [])),
        exportIpChainData: jest.fn((chain, composers, publishers, cb) => cb(null, [])),
      };
    }

    it('should keep the Publishers column for Professional clients', (done) => {
      const client = { paymentTier: 'Professional' };

      Work.convertWorksForXlsx(client, [buildFakeWork()], [], [], '', (err, data) => {
        expect(err).toBeNull();
        expect(data[3]).toEqual([sprRow]);
        done();
      });
    });

    it('should remove the Publishers column for Lite clients', (done) => {
      const client = { paymentTier: 'Lite' };

      Work.convertWorksForXlsx(client, [buildFakeWork()], [], [], '', (err, data) => {
        expect(err).toBeNull();
        expect(data[3]).toEqual([['workId', 'title', 'identifier', 'tunecode', 'contract', 'channel', 'source', 'territory', 50]]);
        done();
      });
    });
  });

  describe('import template config', () => {
    it('liteWorkSpecificPartitionRates should match workSpecificPartitionRates without the publishers column', () => {
      const { workSpecificPartitionRates, liteWorkSpecificPartitionRates } = require('../../config.json').importTemplates;

      expect(liteWorkSpecificPartitionRates).toEqual(workSpecificPartitionRates.filter((column) => column.key !== 'publishers'));
      expect(liteWorkSpecificPartitionRates).toHaveLength(9);
    });
  });
});
