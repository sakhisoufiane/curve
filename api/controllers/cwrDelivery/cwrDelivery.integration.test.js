const fs = require('fs');
const os = require('os');
const path = require('path');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { CwrDeliveryController } = require('@curveroyaltysystems/curve-shared-logic');

const Work = require('../../models/work');
const Client = require('../../models/client');
const CwrDelivery = require('../../models/cwrDelivery');
const DeliveryPartner = require('../../models/deliveryPartner');
const Publisher = require('../../models/publisher');
const Composer = require('../../models/composer');
const Notification = require('../../models/notification');
const { prepareDelivery, exportDelivery } = require('./cwrDelivery');

describe('prepareDelivery', () => {
  let work1;
  let client;
  let deliveryPartner;
  let curveUser;

  beforeEach(async () => {
    client = await new Client({
      _id: randomId(),
      name: randomString(),
      issueIdentifier: false,
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    }).save();

    curveUser = { clientId: client._id.toString() };

    work1 = await new Work({
      clientId: client._id,
      _id: randomId(),
      title: randomString(),
      rightsChain: [
        {
          territory: 'WW',
          children: [
            {
              type: 'Publisher',
              name: 'CLOUD 9 HOLLAND MUSIC PUBLISHING',
              firstName: null,
              middleName: null,
              surname: null,
              caeNumber: '466551142',
              controlled: true,
              mechanicalOwnership: 0,
              mechanicalCollection: 100,
              performanceOwnership: 0,
              performanceCollection: 50,
              contractType: 'Sub Publisher',
              children: [
                {
                  type: 'Publisher',
                  name: 'NEXT ERA',
                  firstName: null,
                  middleName: null,
                  surname: null,
                  caeNumber: '587391699',
                  controlled: true,
                  mechanicalOwnership: 0,
                  mechanicalCollection: 0,
                  performanceOwnership: 0,
                  performanceCollection: 0,
                  contractType: 'Sub Publisher',
                  children: [
                    {
                      type: 'Publisher',
                      name: 'SONGS OF POCI',
                      firstName: null,
                      middleName: null,
                      surname: null,
                      caeNumber: '606032982',
                      controlled: true,
                      mechanicalOwnership: 100,
                      mechanicalCollection: 0,
                      performanceOwnership: 50,
                      performanceCollection: 0,
                      contractType: 'Original Publisher',
                      children: [
                        {
                          type: 'Composer',
                          name: 'JEROME SEBASTIEN PHILIPPE ZAMPINI',
                          firstName: null,
                          middleName: null,
                          surname: null,
                          caeNumber: '621257377',
                          controlled: true,
                          mechanicalOwnership: 0,
                          mechanicalCollection: 0,
                          performanceOwnership: 50,
                          performanceCollection: 50,
                          contractType: 'Lyrics and Music',
                          children: [],
                          index: 0,
                          composerId: '64e46807c4f3c1ad4ebac12e',
                          cae: '00000000123',
                        },
                      ],
                      index: 0,
                      publisherId: '64b00e3b747e8f5dd996ab61',
                    },
                  ],
                  index: 0,
                  publisherId: '',
                },
              ],
              index: 0,
              publisherId: '64b00e3b747e8f5dd996ab59',
            },
          ],
          totalMechanicalOwnership: 100,
          totalPerformanceOwnership: 100,
          totalMechanicalCollection: 100,
          totalPerformanceCollection: 100,
          mechanicalOwnership: null,
          performanceOwnership: null,
          mechanicalCollection: null,
          performanceCollection: null,
        },
      ],
    }).save();

    deliveryPartner = await new DeliveryPartner({
      clientId: client._id.toString(),
      name: randomString(),
      receivingParty: randomString(),
      territory: 'WW',
      type: 'Export Only',
    }).save();

    jest.spyOn(fileManager, 'uploadToS3').mockImplementation((file, path, cb) => cb(null, path));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('< 10,000 works in delivery', () => {
    it('should only add the group header & trailer once to the CWR output file', async () => {
      // Arrange
      const delivery = await new CwrDelivery({
        clientId: client._id,
        territory: 'WW',
        name: randomString(),
        deliveryPartnerId: deliveryPartner._id,
      }).save();
      const works = [];
      for (let i = 0; i < 100; i += 1) {
        works.push(new Work({ ...work1, _id: randomId(), title: randomString() }));
      }
      // Mock Work.find for: (1) getDifference inside getUncontrolledWorks, (2) pre-fetch in createCWRDeliveryWork
      jest.spyOn(Work, 'find')
        .mockReturnValueOnce(Promise.resolve([]))
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          sort: jest.fn().mockReturnThis(),
          lean: jest.fn().mockResolvedValue(works.map((w) => ({ _id: w._id }))),
        });
      jest.spyOn(CwrDeliveryController, 'getWorksForDelivery').mockResolvedValueOnce({ works, territory: ['WW'] });

      // Act
      await prepareDelivery({ delivery, deliveryPartner, curveUser });

      // Assert
      const tmpFilePath = fileManager.uploadToS3.mock.calls[0][1];
      const cwrFile = fs.readFileSync(tmpFilePath);
      const cwrLines = cwrFile.toString().split('\n');
      expect(cwrLines[1].startsWith('GRHREV')).toEqual(true);
      expect(cwrLines[cwrLines.length - 3].startsWith('GRT')).toEqual(true);
      expect(cwrLines.length).toEqual(100 + 5); // 100 works + 5 header/trailer lines
    });
  });

  describe('> 10,000 works in delivery', () => {
    it('should only add the group header & trailer once to the CWR output file', async () => {
      // Arrange
      const delivery = await new CwrDelivery({ clientId: client._id, territory: 'WW', name: randomString() }).save();
      const works = [];
      for (let i = 0; i < 15_000; i += 1) {
        works.push(new Work({ ...work1, _id: randomId(), title: randomString() }));
      }
      // Mock Work.find for the pre-fetch in createCWRDeliveryWork (getUncontrolledWorks returns early — no deliveryPartnerId)
      jest.spyOn(Work, 'find').mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(works.map((w) => ({ _id: w._id }))),
      });
      jest.spyOn(CwrDeliveryController, 'getWorksForDelivery')
        .mockResolvedValueOnce({ works: works.slice(0, 10_000), territory: ['WW'] })
        .mockResolvedValueOnce({ works: works.slice(10_000), territory: ['WW'] });

      // Act
      await prepareDelivery({ delivery, deliveryPartner, curveUser });

      // Assert
      const tmpFilePath = fileManager.uploadToS3.mock.calls[0][1];
      const cwrFile = fs.readFileSync(tmpFilePath);
      const cwrLines = cwrFile.toString().split('\n');
      expect(cwrLines[1].startsWith('GRHREV')).toEqual(true);
      expect(cwrLines[cwrLines.length - 2].startsWith('TRL')).toEqual(true);

      // There should only ever be 1 header + 1 trailer line, even when > 10_000 (Work.find limit) works
      const trailerAndHeaderLines = cwrLines.filter((line) => line.startsWith('GRHREV') || line.startsWith('GRT'));
      expect(trailerAndHeaderLines.length).toEqual(2);

      expect(cwrLines.length).toEqual(15_000 + 5); // 15,000 works + 5 header/trailer lines
    });
  });

  it('should use the chain controlled value instead of the entity default controlled value', async () => {
    // Arrange
    const publisher = await new Publisher({ clientId: client._id.toString(), name: randomString(), controlled: true }).save();
    const composer = await new Composer({ clientId: client._id.toString(), name: randomString(), controlled: true }).save();

    const work = await new Work({
      clientId: client._id.toString(),
      title: randomString(),
      rightsChain: [
        {
          territory: 'WW',
          children: [
            {
              type: 'Publisher',
              contractType: 'Original Publisher',
              publisherId: publisher._id.toString(),
              mechanicalOwnership: 25,
              mechanicalCollection: 25,
              performanceOwnership: 50,
              performanceCollection: 50,
              controlled: true,
              children: [
                {
                  type: 'Composer',
                  contractType: 'Lyrics and Music',
                  composerId: composer._id.toString(),
                  mechanicalOwnership: 50,
                  mechanicalCollection: 50,
                  performanceOwnership: 25,
                  performanceCollection: 25,
                  controlled: true,
                },
              ],
            },
            {
              type: 'Composer',
              contractType: 'Lyrics and Music',
              composerId: composer._id.toString(),
              mechanicalOwnership: 25,
              mechanicalCollection: 25,
              performanceOwnership: 25,
              performanceCollection: 25,
              controlled: false,
            },
          ],
        },
      ],
      territories: ['WW'],
    }).save();

    const delivery = await new CwrDelivery({
      clientId: client._id.toString(),
      territory: 'WW',
      name: randomString(),
      deliveryPartnerId: deliveryPartner._id,
      workIds: [work._id.toString()],
    }).save();

    // Act
    await prepareDelivery({ delivery, deliveryPartner, curveUser });

    // Assert
    const tmpFilePath = fileManager.uploadToS3.mock.calls[0][1];
    const cwrFile = fs.readFileSync(tmpFilePath);
    const cwrLines = cwrFile.toString().split('\n');
    const expectedLineTypes = [
      'HDR',
      'GRH', // Group Header
      'REV', // Work Title
      'OPU', // Original Publisher
      'SPT', // Publisher Territory
      'SWR', // Submitter Work Record
      'SWT', // Submitter Work Title
      'PWR', // Publisher Record
      'OWR', // Uncontrolled Composer
      'GRT', // Group Trailer
      'TRL',
    ];
    for (let i = 0; i < expectedLineTypes.length; i += 1) {
      expect(cwrLines[i].startsWith(expectedLineTypes[i])).toEqual(true);
    }
  });

  describe('Delivery Partner overrides', () => {
    it('uses deliveryPartner ipiNo and sendingPartyId when present', async () => {
      // Arrange
      const ipiNo = 'IPI-TEST';
      const sendingPartyId = 'SP-TEST-456';
      deliveryPartner.ipiNo = ipiNo;
      deliveryPartner.sendingPartyId = sendingPartyId;
      await deliveryPartner.save();

      const delivery = await new CwrDelivery({
        clientId: client._id.toString(),
        territory: 'WW',
        name: randomString(),
        deliveryPartnerId: deliveryPartner._id,
      }).save();
      const works = [];
      works.push(new Work({ ...work1, _id: randomId(), title: randomString() }));

      jest.spyOn(CwrDeliveryController, 'getWorksForDelivery').mockResolvedValueOnce({ works, territory: ['WW'] });

      // Act
      await prepareDelivery({ delivery, deliveryPartner, curveUser });

      // Assert
      const tmpFilePath = fileManager.uploadToS3.mock.calls[0][1];
      const cwrFile = fs.readFileSync(tmpFilePath);
      const cwrLines = cwrFile.toString().split('\n');
      expect(cwrLines[0].includes(ipiNo)).toEqual(true);
      expect(delivery.fileName.includes(sendingPartyId)).toEqual(true);
    });

    it('uses deliveryPartner sendingPartyName when present', async () => {
      // Arrange
      const sendingPartyName = 'DP SENDER NAME TEST';
      deliveryPartner.sendingPartyName = sendingPartyName;
      await deliveryPartner.save();

      const delivery = await new CwrDelivery({
        clientId: client._id.toString(),
        territory: 'WW',
        name: randomString(),
        deliveryPartnerId: deliveryPartner._id,
        outputFormat: 'CWR',
      }).save();

      const works = [];
      works.push(new Work({ ...work1, _id: randomId(), title: randomString() }));

      jest
        .spyOn(CwrDeliveryController, 'getWorksForDelivery')
        .mockResolvedValueOnce({ works, territory: ['WW'] });

      // Act
      await prepareDelivery({ delivery, deliveryPartner, curveUser });

      // Assert
      const tmpFilePath = fileManager.uploadToS3.mock.calls[0][1];
      const cwrFile = fs.readFileSync(tmpFilePath);
      const cwrLines = cwrFile.toString().split('\n');

      // Header line should contain overridden sender name
      expect(cwrLines[0].includes(sendingPartyName)).toEqual(true);
    });
  });

  describe('when the Works are uncontrolled in the Delivery territory', () => {
    it('should remove them from the delivery filter and not include them in the CWR file (CUR-5499)', async () => {
      // Arrange
      const [work, uncontrolledWork] = await Work.insertMany([
        new Work({
          clientId: client._id.toString(),
          title: randomString(),
          rightsChain: [],
          // Controlled in BE (within delivery territory)
          territories: ['BE'],
          valid: true,
          approvalStatus: 'Approved',
        }),
        new Work({
          clientId: client._id.toString(),
          title: randomString(),
          rightsChain: [],
          // Not controlled in BE (outside delivery territory)
          territories: ['NL'],
          valid: true,
          approvalStatus: 'Approved',
        }),
      ]);

      deliveryPartner.territory = 'BE';
      await deliveryPartner.save();

      const delivery = new CwrDelivery({
        clientId: client._id,
        territory: 'BE',
        name: randomString(),
        deliveryPartnerId: deliveryPartner._id,
        workIds: [work._id.toString(), uncontrolledWork._id.toString()],
        filter: { excludeCatalogueGroups: [] },
        filterType: 'custom',
      });
      await delivery.save();

      // Act
      await prepareDelivery({ delivery, deliveryPartner, curveUser });

      // Assert
      const tmpFilePath = fileManager.uploadToS3.mock.calls[0][1];
      const cwrFile = fs.readFileSync(tmpFilePath);
      const cwrLines = cwrFile.toString().split('\n');

      // Header + Trailer + 1 empty REV line (since no rights chain added in this test)
      expect(cwrLines.length).toEqual(6);

      // Only the controlled work should be included in the CWR file
      const works = cwrLines.filter((line) => line.startsWith('REV'));
      expect(works.length).toEqual(1);
      expect(works[0].includes(work.title.toUpperCase())).toEqual(true);
    });
  });

  describe('MLC delivery type', () => {
    it('creates an MLC zip and uploads it to deliveryFiles/mls/{clientId}/{deliveryId}/', async () => {
      // Arrange
      jest.spyOn(CwrDeliveryController, 'getWorksForDelivery')
        .mockResolvedValueOnce({ works: [work1], territory: ['WW'] });

      const delivery = await new CwrDelivery({
        clientId: client._id,
        territory: 'WW',
        name: randomString(),
        deliveryPartnerId: deliveryPartner._id,
        outputFormat: 'MLC',
      }).save();

      // Act
      await prepareDelivery({ delivery, deliveryPartner, curveUser });

      // Assert
      expect(fileManager.uploadToS3).toHaveBeenCalledTimes(1);
      const [s3Key, localPath] = fileManager.uploadToS3.mock.calls[0];
      const keyParts = s3Key.split('/');
      expect(keyParts[0]).toBe('deliveryFiles');
      expect(keyParts[1]).toBe('mls');
      expect(keyParts[2]).toBe(client._id.toString());
      expect(keyParts[3]).toBe(delivery._id.toString());
      expect(keyParts[4]).toMatch(/\.zip$/);

      // MLC creates a zip — verify the file exists
      expect(fs.existsSync(localPath)).toBe(true);
    });
  });

  describe('Catalogue Shipment delivery type', () => {
    it('creates a CSV and uploads it to deliveryFiles/cs/{clientId}/{deliveryId}/', async () => {
      // Arrange
      jest.spyOn(CwrDeliveryController, 'getWorksForDelivery')
        .mockResolvedValueOnce({ works: [work1], territory: ['WW'] });

      const delivery = await new CwrDelivery({
        clientId: client._id,
        territory: 'WW',
        name: randomString(),
        deliveryPartnerId: deliveryPartner._id,
        outputFormat: 'Catalogue Shipment',
      }).save();

      // Act
      await prepareDelivery({ delivery, deliveryPartner, curveUser });

      // Assert
      expect(fileManager.uploadToS3).toHaveBeenCalledTimes(1);
      const [s3Key, localPath] = fileManager.uploadToS3.mock.calls[0];
      const keyParts = s3Key.split('/');
      expect(keyParts[0]).toBe('deliveryFiles');
      expect(keyParts[1]).toBe('cs');
      expect(keyParts[2]).toBe(client._id.toString());
      expect(keyParts[3]).toBe(delivery._id.toString());
      expect(keyParts[4]).toMatch(/^Cat Shipment .+\.csv$/);

      const content = fs.readFileSync(localPath, 'utf8');
      expect(content).toContain('Song Title');
      expect(content).toContain(work1.title);
    });
  });

  describe('Catalogue Shipment - Simple delivery type', () => {
    it('creates a CSV and uploads it to deliveryFiles/cs/{clientId}/{deliveryId}/', async () => {
      // Arrange
      jest.spyOn(CwrDeliveryController, 'getWorksForDelivery')
        .mockResolvedValueOnce({ works: [work1], territory: ['WW'] });

      const delivery = await new CwrDelivery({
        clientId: client._id,
        territory: 'WW',
        name: randomString(),
        deliveryPartnerId: deliveryPartner._id,
        outputFormat: 'Catalogue Shipment - Simple',
      }).save();

      // Act
      await prepareDelivery({ delivery, deliveryPartner, curveUser });

      // Assert
      expect(fileManager.uploadToS3).toHaveBeenCalledTimes(1);
      const [s3Key, localPath] = fileManager.uploadToS3.mock.calls[0];
      const keyParts = s3Key.split('/');
      expect(keyParts[0]).toBe('deliveryFiles');
      expect(keyParts[1]).toBe('cs');
      expect(keyParts[2]).toBe(client._id.toString());
      expect(keyParts[3]).toBe(delivery._id.toString());
      expect(keyParts[4]).toMatch(/^Cat Shipment .+\.csv$/);

      const content = fs.readFileSync(localPath, 'utf8');
      expect(content).toContain('Title of Song');
      expect(content).toContain(work1.title);
    });
  });

  describe('Youtube delivery type', () => {
    it('creates a CSV and uploads it to deliveryFiles/youtube/{clientId}/{deliveryId}/', async () => {
      // Arrange
      jest.spyOn(CwrDeliveryController, 'getWorksForDelivery')
        .mockResolvedValueOnce({ works: [work1], territory: ['WW'] });

      const delivery = await new CwrDelivery({
        clientId: client._id,
        territory: 'WW',
        name: randomString(),
        deliveryPartnerId: deliveryPartner._id,
        outputFormat: 'Youtube',
      }).save();

      // Act
      await prepareDelivery({ delivery, deliveryPartner, curveUser });

      // Assert
      expect(fileManager.uploadToS3).toHaveBeenCalledTimes(1);
      const [s3Key, localPath] = fileManager.uploadToS3.mock.calls[0];
      const keyParts = s3Key.split('/');
      expect(keyParts[0]).toBe('deliveryFiles');
      expect(keyParts[1]).toBe('youtube');
      expect(keyParts[2]).toBe(client._id.toString());
      expect(keyParts[3]).toBe(delivery._id.toString());
      expect(keyParts[4]).toMatch(/^Youtube .+\.csv$/);

      // Youtube outputs territory-based rows; with work1 having no territories array,
      // the file may be empty — check it was created at the expected path
      expect(fs.existsSync(localPath)).toBe(true);
    });
  });

  describe('ISWC Registration - JSON delivery type', () => {
    it('creates a JSON file and uploads it to deliveryFiles/iswcRegistration/{clientId}/{deliveryId}/', async () => {
      // Arrange
      jest.spyOn(CwrDeliveryController, 'getWorksForDelivery')
        .mockResolvedValueOnce({ works: [work1], territory: ['WW'] });

      const delivery = await new CwrDelivery({
        clientId: client._id,
        territory: 'WW',
        name: randomString(),
        deliveryPartnerId: deliveryPartner._id,
        outputFormat: 'ISWC Registration - JSON',
        receivingParty: deliveryPartner.receivingParty,
      }).save();

      // Act
      await prepareDelivery({ delivery, deliveryPartner, curveUser });

      // Assert
      expect(fileManager.uploadToS3).toHaveBeenCalledTimes(1);
      const [s3Key, localPath] = fileManager.uploadToS3.mock.calls[0];
      const keyParts = s3Key.split('/');
      expect(keyParts[0]).toBe('deliveryFiles');
      expect(keyParts[1]).toBe('iswcRegistration');
      expect(keyParts[2]).toBe(client._id.toString());
      expect(keyParts[3]).toBe(delivery._id.toString());
      expect(keyParts[4]).toMatch(/^iswcp_.+\.json$/);

      const content = JSON.parse(fs.readFileSync(localPath, 'utf8'));
      expect(content.$schema).toBeTruthy();
    });
  });

  describe('ISWC Lookup - JSON delivery type', () => {
    it('creates a JSON file and uploads it to deliveryFiles/iswcRegistration/{clientId}/{deliveryId}/', async () => {
      // Arrange
      jest.spyOn(CwrDeliveryController, 'getWorksForDelivery')
        .mockResolvedValueOnce({ works: [work1], territory: ['WW'] });

      const delivery = await new CwrDelivery({
        clientId: client._id,
        territory: 'WW',
        name: randomString(),
        deliveryPartnerId: deliveryPartner._id,
        outputFormat: 'ISWC Lookup - JSON',
        receivingParty: deliveryPartner.receivingParty,
      }).save();

      // Act
      await prepareDelivery({ delivery, deliveryPartner, curveUser });

      // Assert
      expect(fileManager.uploadToS3).toHaveBeenCalledTimes(1);
      const [s3Key, localPath] = fileManager.uploadToS3.mock.calls[0];
      const keyParts = s3Key.split('/');
      expect(keyParts[0]).toBe('deliveryFiles');
      expect(keyParts[1]).toBe('iswcRegistration');
      expect(keyParts[2]).toBe(client._id.toString());
      expect(keyParts[3]).toBe(delivery._id.toString());
      expect(keyParts[4]).toMatch(/^iswcp_.+\.json$/);

      const content = JSON.parse(fs.readFileSync(localPath, 'utf8'));
      expect(content.$schema).toBeTruthy();
    });
  });

  describe('Excel delivery type', () => {
    it('uses createExportXlsx and uploads to deliveryFiles/excel/{clientId}/{deliveryId}/ when work count is under 3000', async () => {
      // Arrange
      const xlsxContent = Buffer.from('fake xlsx content');
      jest.spyOn(Work, 'countDocuments').mockResolvedValueOnce(100);
      jest.spyOn(Work, 'createExportXlsx').mockImplementation((filter, clientId, cb) => {
        const loc = path.join(os.tmpdir(), `test-export-${randomString()}.xlsx`);
        fs.writeFileSync(loc, xlsxContent);
        cb(null, loc);
      });

      const delivery = await new CwrDelivery({
        clientId: client._id,
        territory: 'WW',
        name: randomString(),
        deliveryPartnerId: deliveryPartner._id,
        outputFormat: 'Excel',
      }).save();

      // Act
      await prepareDelivery({ delivery, deliveryPartner, curveUser });

      // Assert
      expect(Work.createExportXlsx).toHaveBeenCalledTimes(1);
      expect(fileManager.uploadToS3).toHaveBeenCalledTimes(1);
      const [s3Key, localPath] = fileManager.uploadToS3.mock.calls[0];
      const keyParts = s3Key.split('/');
      expect(keyParts[0]).toBe('deliveryFiles');
      expect(keyParts[1]).toBe('excel');
      expect(keyParts[2]).toBe(client._id.toString());
      expect(keyParts[3]).toBe(delivery._id.toString());
      expect(keyParts[4]).toMatch(/\.xlsx$/);
      expect(fs.readFileSync(localPath)).toEqual(xlsxContent);
    });

    it('uses createExportCsv and uploads to deliveryFiles/excel/{clientId}/{deliveryId}/ when work count is 3000 or more', async () => {
      // Arrange
      const csvContent = 'col1,col2\nval1,val2';
      jest.spyOn(Work, 'countDocuments').mockResolvedValueOnce(5000);
      jest.spyOn(Work, 'createExportCsv').mockImplementation((filter, count, clientId, cb) => {
        const loc = path.join(os.tmpdir(), `test-export-${randomString()}.csv`);
        fs.writeFileSync(loc, csvContent);
        cb(null, loc);
      });

      const delivery = await new CwrDelivery({
        clientId: client._id,
        territory: 'WW',
        name: randomString(),
        deliveryPartnerId: deliveryPartner._id,
        outputFormat: 'Excel',
      }).save();

      // Act
      await prepareDelivery({ delivery, deliveryPartner, curveUser });

      // Assert
      expect(Work.createExportCsv).toHaveBeenCalledTimes(1);
      expect(fileManager.uploadToS3).toHaveBeenCalledTimes(1);
      const [s3Key, localPath] = fileManager.uploadToS3.mock.calls[0];
      const keyParts = s3Key.split('/');
      expect(keyParts[0]).toBe('deliveryFiles');
      expect(keyParts[1]).toBe('excel');
      expect(keyParts[2]).toBe(client._id.toString());
      expect(keyParts[3]).toBe(delivery._id.toString());
      expect(keyParts[4]).toMatch(/\.csv$/);
      expect(fs.readFileSync(localPath, 'utf8')).toBe(csvContent);
    });
  });

  describe('unknown delivery type', () => {
    it('throws an error for an unrecognised outputFormat', async () => {
      const delivery = await new CwrDelivery({
        clientId: client._id,
        territory: 'WW',
        name: randomString(),
        deliveryPartnerId: deliveryPartner._id,
      }).save();
      // Override in-memory only — bypasses schema enum validation
      delivery.outputFormat = 'UnknownFormat';

      await expect(prepareDelivery({ delivery, deliveryPartner, curveUser }))
        .rejects.toThrow('Delivery type unknown: UnknownFormat');
    });
  });
});

describe('exportDelivery', () => {
  let client;
  let deliveryPartner;
  let curveUser;
  let work;
  let delivery;

  beforeEach(async () => {
    client = await new Client({
      _id: randomId(),
      name: randomString(),
      issueIdentifier: false,
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    }).save();

    curveUser = { clientId: client._id.toString() };

    deliveryPartner = await new DeliveryPartner({
      clientId: client._id.toString(),
      name: randomString(),
      receivingParty: randomString(),
      territory: 'WW',
      type: 'Export Only',
    }).save();

    work = await new Work({
      clientId: client._id,
      _id: randomId(),
      title: randomString(),
      rightsChain: [],
    }).save();

    delivery = await new CwrDelivery({
      clientId: client._id,
      territory: 'WW',
      name: randomString(),
      deliveryPartnerId: deliveryPartner._id,
      outputFormat: 'MLC',
    }).save();

    jest.spyOn(fileManager, 'uploadToS3').mockImplementation((file, loc, cb) => cb(null, file));
    jest.spyOn(fileManager, 'publicLink24Hours').mockImplementation((key, cb) => cb(null, `https://example.com/${key}`));
    jest.spyOn(Notification, 'generate').mockImplementation((name, description, link, curveUser, options, cb) => cb(null));
    jest.spyOn(CwrDeliveryController, 'getWorksForDelivery').mockResolvedValue({ works: [work], territory: ['WW'] });
  });

  // Use MLC format throughout: it handles empty works cleanly, letting these tests
  // focus on the export orchestration (link generation, notifications, status) rather
  // than re-testing file-generation logic that is already covered in prepareDelivery tests.

  it('generates a public download link and sends a notification', async () => {
    // Act
    await exportDelivery({ delivery, curveUser, markWorksAsDelivered: false });

    // Assert
    expect(fileManager.publicLink24Hours).toHaveBeenCalledTimes(1);
    expect(Notification.generate).toHaveBeenCalledTimes(1);
  });

  it('saves the delivery after export', async () => {
    // Act
    await exportDelivery({ delivery, curveUser, markWorksAsDelivered: false });

    // Assert
    // Delivery should be re-saved (e.g. with fileName attached for CWR format);
    // for MLC the save still runs without error
    const savedDelivery = await CwrDelivery.findById(delivery._id);
    expect(savedDelivery).toBeTruthy();
  });

  it('sets delivery status to Delivered when markWorksAsDelivered is true', async () => {
    // Act
    await exportDelivery({ delivery, curveUser, markWorksAsDelivered: true });

    // Assert
    const savedDelivery = await CwrDelivery.findById(delivery._id);
    expect(savedDelivery.status).toBe('Delivered');
    expect(savedDelivery.errorMessage).toBeNull();
  });

  it('sets delivery status to Errored and records the message when prepareDelivery fails with markWorksAsDelivered true', async () => {
    // Arrange
    // Force prepareDelivery to fail at the upload step
    fileManager.uploadToS3.mockImplementation((file, loc, cb) => cb(new Error('FakeError')));

    // Act
    await exportDelivery({ delivery, curveUser, markWorksAsDelivered: true });

    // Assert
    const savedDelivery = await CwrDelivery.findById(delivery._id);
    expect(savedDelivery.status).toBe('Errored');
    expect(savedDelivery.errorMessage).toBe('FakeError');
  });

  it('does not persist an Errored status when markWorksAsDelivered is false', async () => {
    // Arrange
    fileManager.uploadToS3.mockImplementation((file, loc, cb) => cb(new Error('FakeError')));

    // Act
    await exportDelivery({ delivery, curveUser, markWorksAsDelivered: false });

    // Assert
    // exportDelivery swallows the error and does not save when markWorksAsDelivered is false
    const savedDelivery = await CwrDelivery.findById(delivery._id);
    expect(savedDelivery.status).not.toBe('Errored');
  });
});
