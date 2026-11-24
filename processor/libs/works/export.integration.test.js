jest.mock('moment', () => {
  const actualMoment = jest.requireActual('moment');
  const mockMoment = jest.fn(() => actualMoment('2025-01-01'));
  return mockMoment;
});

const { randomString, randomId, randomFloat, randomDate, randomBoolean, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { cloneDeep } = require('lodash');
const fs = require('fs');
const Excel = require('exceljs');
const unzipper = require('unzipper');
const moment = require('moment');

const Client = require('../../models/client');
const Track = require('../../models/track');
const Contract = require('../../models/contract');
const TerritoryGroup = require('../../models/territoryGroup');
const Composer = require('../../models/composer');
const Publisher = require('../../models/publisher');
const DeliveryPartner = require('../../models/deliveryPartner');
const Work = require('../../models/work');
const ExportNotification = require('../exportNotification/exportNotification');
const WorksExport = require('./export');
const CsvHeaders = require('./csvHeaders');

let client;
let clientId;
let filter;
let email;
let downloadUrl;

let tracks;
let contracts;
let territoryGroups;
let composers;
let publishers;
let deliveryPartners;
let work;

beforeEach(async () => {
  client = new Client({ name: randomString(), paymentTier: 'Pro', dateFormat: 'YYYY-MM-DD', clientType: 'Publisher' });
  await client.save();
  clientId = client._id.toString();

  const workId = randomId();

  tracks = [
    new Track({ clientId, workId: workId.toString(), isrc: randomString() }),
    new Track({ clientId, workId: workId.toString(), isrc: randomString() }),
  ];
  await Track.insertMany(tracks);

  contracts = [new Contract({ clientId, name: randomString() }), new Contract({ clientId, name: randomString() })];
  await Contract.insertMany(contracts);

  territoryGroups = [new TerritoryGroup({ clientId, name: randomString() })];
  await TerritoryGroup.insertMany(territoryGroups);

  composers = [
    new Composer({
      clientId,
      name: randomString(),
      firstName: randomString(),
      middleNames: randomString(),
      surname: randomString(),
      cae: randomString(),
    }),
  ];
  await Composer.insertMany(composers);

  publishers = [new Publisher({ clientId, name: randomString(), cae: randomString() })];
  await Publisher.insertMany(publishers);

  deliveryPartners = [new DeliveryPartner({ clientId, name: randomString() })];
  await DeliveryPartner.insertMany(deliveryPartners);

  const rightsChain = [
    {
      territory: territoryGroups[0]._id.toString(),
      totalMechanicalOwnership: 100,
      totalPerformanceOwnership: 100,
      totalMechanicalCollection: 100,
      totalPerformanceCollection: 100,
      mechanicalCollection: 0,
      mechanicalOwnership: 0,
      performanceCollection: 0,
      performanceOwnership: 0,
      children: [
        {
          type: 'Publisher',
          publisherId: publishers[0]._id.toString(),
          controlled: true,
          contractType: 'Original Publisher',
          mechanicalCollection: 100,
          performanceCollection: 50,
          mechanicalOwnership: 100,
          performanceOwnership: 50,
          children: [
            {
              type: 'Composer',
              composerId: composers[0]._id.toString(),
              controlled: true,
              contractType: 'Lyrics & Music',
              mechanicalCollection: 0,
              performanceCollection: 50,
              mechanicalOwnership: 0,
              performanceOwnership: 50,
              children: [],
            },
          ],
        },
      ],
    },
  ];

  work = new Work({
    clientId,
    _id: workId,
    trackIds: [tracks[0]._id.toString(), tracks[1]._id.toString()],
    title: randomString(),
    composer: randomString(),
    foreignId: randomString(),
    projectId: randomString(),
    partyNo: randomInt(),
    identifier: randomString(),
    iswc: randomString(),
    tunecode: randomString(),
    copyrightDate: randomDate(),
    labelCopy: randomString(),
    priority: randomBoolean(),
    productionLibrary: randomBoolean(),
    workDescriptionCategory: randomString(),
    workLanguage: randomString(),
    compositeType: randomString(),
    compositeCount: randomInt(),
    versionType: randomString(),
    arrangementType: randomString(),
    lyricAdaptionType: randomString(),
    performers: [randomString(), randomString()],
    territories: [randomString(), randomString()],
    catalogueGroups: randomString(),
    notes: randomString(),
    aliases: [randomString(), randomString()],
    alternateTitles: [
      { title: randomString(), language: randomString() },
      { title: randomString(), language: randomString() },
    ],
    salesReturnsRights: contracts.map((c) => ({
      contractId: c._id.toString(),
      percentage: randomFloat(),
    })),
    channelSpecificSalesReturnsRights: [
      {
        contractId: contracts[0]._id.toString(),
        percentage: randomFloat(),
        distributionChannel: randomString(),
        source: randomString(),
        territory: randomString(),
      },
      {
        contractId: contracts[1]._id.toString(),
        percentage: randomFloat(),
        distributionChannel: randomString(),
        source: randomString(),
        territory: territoryGroups[0]._id.toString(),
      },
    ],
    societyIdentifiers: [
      { society: randomString(), identifier: randomString() },
      { society: randomString(), identifier: randomString() },
    ],
    rightsChain,
    partnerRightsChains: [
      {
        deliveryPartnerId: deliveryPartners[0]._id.toString(),
        rightsChain: cloneDeep(rightsChain),
      },
    ],
  });
  await Work.insertMany([work]);

  filter = { _id: { $in: [work._id.toString()] } };
  email = randomString();
  downloadUrl = randomString();

  jest.spyOn(fileManager, 'uploadToS3').mockImplementation((key, filePath, cb) => cb(null, key));
  jest.spyOn(fileManager, 'publicLink24Hours').mockImplementation((key, cb) => cb(null, downloadUrl));
  jest.spyOn(ExportNotification, 'sendWorksExportNotification').mockResolvedValue();
});

describe('when < 1000 works', () => {
  it('should generate an xlsx format export', async () => {
    // Act
    await WorksExport.exportWorks({ clientId, filter, email });

    // Assert
    expect(fileManager.uploadToS3).toHaveBeenCalledTimes(1);
    expect(fileManager.publicLink24Hours).toHaveBeenCalledTimes(1);
    expect(ExportNotification.sendWorksExportNotification).toHaveBeenCalledWith(expect.objectContaining({
      client: expect.objectContaining({ _id: client._id }),
      email,
      url: downloadUrl,
      isError: false,
    }));

    // File uploaded should be XLSX
    const filePath = fileManager.uploadToS3.mock.calls[0][1];
    expect(filePath).toContain('.xlsx');

    const file = fs.readFileSync(filePath);
    expect(file).toBeDefined();

    const wb = new Excel.Workbook();
    await wb.xlsx.load(file);

    // File should have 8 sheets (one for each export type)
    expect(wb.worksheets.length).toEqual(8);

    const ws = wb.worksheets[0];
    // Main Works sheet has the correct columns
    expect(ws.getRow(1).values).toEqual([undefined, ...CsvHeaders.workHeaders]);

    const workRow = ws.getRow(3).values;
    expect(workRow).toEqual([
      undefined,
      work._id.toString(),
      work.title,
      work.composer,
      work.foreignId,
      work.projectId,
      work.partyNo,
      work.identifier,
      work.iswc,
      work.tunecode,
      '2025-01-01',
      work.labelCopy,
      work.priority,
      work.productionLibrary,
      work.workDescriptionCategory,
      work.workLanguage,
      work.compositeType,
      work.compositeCount,
      work.versionType,
      work.arrangementType,
      work.lyricAdaptionType,
      work.performers.join(';'),
      tracks.map((t) => t.isrc).join(';'),
      work.territories.join(';'),
      work.catalogueGroups.join(';'),
      work.aliases.join(';'),
      work.notes,
    ]);
  });
});

describe('when >= 1000 works', () => {
  it('should generate a csv format export', async () => {
    // Arrange
    const works = [];
    for (let i = 0; i < 999; i += 1) {
      works.push(new Work({ ...cloneDeep(work.toObject()), _id: randomId() }));
    }
    await Work.insertMany(works);

    // Specifying an empty filter will trigger an all Works (1000) export for the Client
    filter = {};

    // Act
    await WorksExport.exportWorks({ clientId, filter, email });

    // Assert
    expect(fileManager.uploadToS3).toHaveBeenCalledTimes(1);
    expect(fileManager.publicLink24Hours).toHaveBeenCalledTimes(1);
    expect(ExportNotification.sendWorksExportNotification).toHaveBeenCalledWith(expect.objectContaining({
      client: expect.objectContaining({ _id: client._id }),
      email,
      url: downloadUrl,
      isError: false,
    }));

    // File uploaded should be a ZIP (containing multiple CSVs)
    const filePath = fileManager.uploadToS3.mock.calls[0][1];
    expect(filePath).toContain('.zip');

    const file = fs.readFileSync(filePath);
    expect(file).toBeDefined();

    const { files } = await unzipper.Open.buffer(file);
    // ZIP should contain 7 CSV files
    expect(files.length).toEqual(7);

    // Moment is mocked to return 2025-01-01 always, which is 1735686000 in Unix timestamp
    const filePrefix = `Work Export - ${moment().format('X')}`;
    const expectedFiles = [
      `${filePrefix}.csv`,
      `${filePrefix} - alternateTitles.csv`,
      `${filePrefix} - participators.csv`,
      `${filePrefix} - specificParticipationRates.csv`,
      `${filePrefix} - societyIdentifiers.csv`,
      `${filePrefix} - ipChain.csv`,
      `${filePrefix} - partnerIpChains.csv`,
    ];
    expect(files.map((f) => f.path)).toEqual(expectedFiles);

    // Works
    const worksFile = files.find((f) => f.path === expectedFiles[0]);
    const worksContent = (await worksFile.buffer()).toString();
    const worksLines = worksContent.split('\n').map((l) => l.trim());

    // Main works CSV should have 1001 lines (2 headers + 1000 works)
    expect(worksLines.length).toEqual(1002);

    // Header row is correct
    expect(worksLines[0]).toEqual(CsvHeaders.workHeaders.join(','));

    // Check all lines are correct
    verifyCsvExport(
      worksLines,
      [work, ...works],
      null,
      (work) => [
        work._id.toString(),
        work.title,
        work.composer,
        work.foreignId,
        work.projectId,
        work.partyNo.toString(),
        work.identifier,
        work.iswc,
        work.tunecode,
        '2025-01-01',
        work.labelCopy,
        work.priority ? 'TRUE' : 'FALSE',
        work.productionLibrary ? 'TRUE' : 'FALSE',
        work.workDescriptionCategory,
        work.workLanguage,
        work.compositeType,
        work.compositeCount.toString(),
        work.versionType,
        work.arrangementType,
        work.lyricAdaptionType,
        work.performers.join(';'),
        tracks.map((t) => t.isrc).join(';'),
        work.territories.join(';'),
        work.catalogueGroups.join(';'),
        work.aliases.join(';'),
        work.notes,
      ],
    );

    // Alternate Titles
    const altTitlesFile = files.find((f) => f.path === expectedFiles[1]);
    const altTitlesContent = (await altTitlesFile.buffer()).toString();
    const altTitlesLines = altTitlesContent.split('\n').map((l) => l.trim());

    // Alternate Titles CSV should have 2001 lines (2 headers + 2 alternate titles per work for 1000 works)
    expect(altTitlesLines.length).toEqual(2002);

    // Header row is correct
    expect(altTitlesLines[0]).toEqual(CsvHeaders.alternateTitlesHeaders.join(','));

    // Check all lines are correct
    verifyCsvExport(
      altTitlesLines,
      [work, ...works],
      'alternateTitles',
      (work, title) => [
        work._id.toString(),
        work.title,
        work.identifier,
        work.tunecode,
        title.title,
        title.language,
      ],
    );

    // Participators
    const participatorsFile = files.find((f) => f.path === expectedFiles[2]);
    const participatorsContent = (await participatorsFile.buffer()).toString();
    const participatorsLines = participatorsContent.split('\n').map((l) => l.trim());

    // Participators CSV should have 2001 lines (2 headers + 2 sales returns per work for 1000 works)
    expect(participatorsLines.length).toEqual(2002);

    // Header row is correct
    expect(participatorsLines[0]).toEqual(CsvHeaders.participatorsHeaders.join(','));

    // Check all lines are correct
    verifyCsvExport(
      participatorsLines,
      [work, ...works],
      'salesReturnsRights',
      (work, salesReturn) => {
        const contract = contracts.find((c) => c._id.toString() === salesReturn.contractId);
        return [
          work._id.toString(),
          work.title,
          work.identifier,
          work.tunecode,
          contract ? contract.name : '',
          salesReturn.percentage.toString(),
        ];
      },
    );

    // Specific Participation Rates
    const specificRatesFile = files.find((f) => f.path === expectedFiles[3]);
    const specificRatesContent = (await specificRatesFile.buffer()).toString();
    const specificRatesLines = specificRatesContent.split('\n').map((l) => l.trim());

    // Specific Participation Rates CSV should have 2001 lines (2 headers + 2 channel specific sales returns per work for 1000 works)
    expect(specificRatesLines.length).toEqual(2002);

    // Header row is correct
    expect(specificRatesLines[0]).toEqual(CsvHeaders.specificParticipationRatesHeaders.join(','));

    // Check all lines are correct
    verifyCsvExport(
      specificRatesLines,
      [work, ...works],
      'channelSpecificSalesReturnsRights',
      (work, specificRate) => {
        const contract = contracts.find((c) => c._id.toString() === specificRate.contractId);
        const territoryGroup = territoryGroups.find((t) => t._id.toString() === specificRate.territory);
        return [
          work._id.toString(),
          work.title,
          work.identifier,
          work.tunecode,
          contract ? contract.name : '',
          specificRate.distributionChannel,
          specificRate.source,
          territoryGroup ? territoryGroup?.name : specificRate.territory,
          specificRate.percentage.toString(),
        ];
      },
    );

    // Society Identifiers;
    const societyIdsFile = files.find((f) => f.path === expectedFiles[4]);
    const societyIdsContent = (await societyIdsFile.buffer()).toString();
    const societyIdsLines = societyIdsContent.split('\n').map((l) => l.trim());

    // Society Identifiers CSV should have 2001 lines (2 headers + 2 society identifiers per work for 1000 works)
    expect(societyIdsLines.length).toEqual(2002);

    // Header row is correct
    expect(societyIdsLines[0]).toEqual(CsvHeaders.societyIdentifiersHeaders.join(','));

    // Check all lines are correct
    verifyCsvExport(
      societyIdsLines,
      [work, ...works],
      'societyIdentifiers',
      (work, societyId) => [
        work._id.toString(),
        work.title,
        work.identifier,
        work.tunecode,
        societyId.society,
        societyId.identifier,
      ],
    );

    // IP Chains
    const ipChainFile = files.find((f) => f.path === expectedFiles[5]);
    const ipChainContent = (await ipChainFile.buffer()).toString();
    const ipChainLines = ipChainContent.split('\n').map((l) => l.trim());

    // IP Chains CSV should have 1002 lines (2 headers + 1 rights chain per work for 1000 works)
    expect(ipChainLines.length).toEqual(1002);

    // Header row is correct
    expect(ipChainLines[0]).toEqual(CsvHeaders.ipChainHeaders.join(','));

    // Compare only first line due to complexity
    const firstIpChainLine = ipChainLines[1].split(',').map((v) => v.trim());
    expect(firstIpChainLine).toEqual([
      // Work + Territory
      work._id.toString(),
      work.title,
      work.identifier,
      work.tunecode,
      territoryGroups[0].name,
      // Publisher
      work.rightsChain[0].children[0].type,
      publishers[0].name,
      '',
      '',
      '',
      publishers[0].cae,
      work.rightsChain[0].children[0].controlled ? 'TRUE' : 'FALSE',
      work.rightsChain[0].children[0].mechanicalOwnership.toString(),
      work.rightsChain[0].children[0].mechanicalCollection.toString(),
      work.rightsChain[0].children[0].performanceOwnership.toString(),
      work.rightsChain[0].children[0].performanceCollection.toString(),
      work.rightsChain[0].children[0].contractType,
      // Composer
      work.rightsChain[0].children[0].children[0].type,
      composers[0].name,
      composers[0].firstName,
      composers[0].middleNames,
      composers[0].surname,
      composers[0].cae,
      work.rightsChain[0].children[0].children[0].controlled ? 'TRUE' : 'FALSE',
      work.rightsChain[0].children[0].children[0].mechanicalOwnership.toString(),
      work.rightsChain[0].children[0].children[0].mechanicalCollection.toString(),
      work.rightsChain[0].children[0].children[0].performanceOwnership.toString(),
      work.rightsChain[0].children[0].children[0].performanceCollection.toString(),
      work.rightsChain[0].children[0].children[0].contractType,
    ]);

    // Partner IP Chains
    const partnerIpChainFile = files.find((f) => f.path === expectedFiles[6]);
    const partnerIpChainContent = (await partnerIpChainFile.buffer()).toString();
    const partnerIpChainLines = partnerIpChainContent.split('\n').map((l) => l.trim());

    // Partner IP Chains CSV should have 1002 lines (2 headers + 1 partner rights chain per work for 1000 works)
    expect(partnerIpChainLines.length).toEqual(1002);

    // Header row is correct
    expect(partnerIpChainLines[0]).toEqual(CsvHeaders.partnerIpChainsHeaders.join(','));

    // Compare only first line due to complexity
    const firstPartnerIpChainLine = partnerIpChainLines[1].split(',').map((v) => v.trim());
    expect(firstPartnerIpChainLine).toEqual([
      // Work + Territory
      work._id.toString(),
      work.title,
      work.identifier,
      work.tunecode,
      territoryGroups[0].name,
      // Delivery Partner
      deliveryPartners[0].name,
      // Publisher
      work.partnerRightsChains[0].rightsChain[0].children[0].type,
      publishers[0].name,
      '',
      '',
      '',
      publishers[0].cae,
      work.partnerRightsChains[0].rightsChain[0].children[0].controlled ? 'TRUE' : 'FALSE',
      work.partnerRightsChains[0].rightsChain[0].children[0].mechanicalOwnership.toString(),
      work.partnerRightsChains[0].rightsChain[0].children[0].mechanicalCollection.toString(),
      work.partnerRightsChains[0].rightsChain[0].children[0].performanceOwnership.toString(),
      work.partnerRightsChains[0].rightsChain[0].children[0].performanceCollection.toString(),
      work.partnerRightsChains[0].rightsChain[0].children[0].contractType,
      // Composer
      work.partnerRightsChains[0].rightsChain[0].children[0].children[0].type,
      composers[0].name,
      composers[0].firstName,
      composers[0].middleNames,
      composers[0].surname,
      composers[0].cae,
      work.partnerRightsChains[0].rightsChain[0].children[0].children[0].controlled ? 'TRUE' : 'FALSE',
      work.partnerRightsChains[0].rightsChain[0].children[0].children[0].mechanicalOwnership.toString(),
      work.partnerRightsChains[0].rightsChain[0].children[0].children[0].mechanicalCollection.toString(),
      work.partnerRightsChains[0].rightsChain[0].children[0].children[0].performanceOwnership.toString(),
      work.partnerRightsChains[0].rightsChain[0].children[0].children[0].performanceCollection.toString(),
      work.partnerRightsChains[0].rightsChain[0].children[0].children[0].contractType,
    ]);
  });
});

describe('when there is an error', () => {
  it('should send an error notification', async () => {
    expect.assertions(3);

    // Arrange
    jest.spyOn(fileManager, 'uploadToS3').mockImplementationOnce((key, filePath, cb) => cb(new Error('FakeError')));

    // Act
    try {
      await WorksExport.exportWorks({ clientId, filter, email });
    } catch (err) {
      // Assert
      expect(err).toBeDefined();
      expect(err.message).toEqual('FakeError');
      expect(ExportNotification.sendWorksExportNotification).toHaveBeenCalledWith(expect.objectContaining({
        client: expect.objectContaining({ _id: client._id }),
        email,
        url: null,
        isError: true,
      }));
    }
  });
});

/**
 * Helper to verify CSV export content against source data
 * @param {string[]} csvLines - Lines from the CSV export (including header)
 * @param {Object[]} sourceData - Source data array to verify against
 * @param {string} nestedField - Nested field name in source data for rows (if applicable)
 * @param {Function} rowMapper - Callback to map source data item(s) to CSV row array
 */
const verifyCsvExport = (csvLines, sourceData, nestedField, rowMapper) => {
  const actualLines = csvLines.slice(1);
  const expectedLines = [];
  sourceData.forEach((parentItem) => {
    if (!nestedField) {
      // No nested field, just map the parent item
      const rowArray = rowMapper(parentItem);
      expectedLines.push(rowArray.join(','));
      return;
    }
    const children = parentItem[nestedField];
    // Only process if the nested array exists and has items
    if (children && children.length > 0) {
      children.forEach((childItem) => {
        const rowArray = rowMapper(parentItem, childItem);
        expectedLines.push(rowArray.join(','));
      });
    }
  });
  actualLines.sort();
  expectedLines.sort();
  expect(actualLines).toEqual(['', ...expectedLines]);
};
