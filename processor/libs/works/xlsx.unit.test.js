jest.mock('moment', () => {
  const actualMoment = jest.requireActual('moment');
  const mockMoment = jest.fn(() => actualMoment('2025-01-01'));
  return mockMoment;
});

const { keyBy, cloneDeep } = require('lodash');
const { randomString, randomDate, randomInt, randomFloat, randomBoolean } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { Types } = require('@curveroyaltysystems/models/mongoose');

const Client = require('../../models/client');
const Work = require('../../models/work');
const Track = require('../../models/track');
const Contract = require('../../models/contract');
const TerritoryGroup = require('../../models/territoryGroup');
const Composer = require('../../models/composer');
const Publisher = require('../../models/publisher');
const DeliveryPartner = require('../../models/deliveryPartner');
const WorksXlsx = require('./xlsx');

let dateFormat;
let workId;
let tracks;
let trackIsrcsById;
let work;
let contracts;
let contractsById;
let territoryGroups;
let territoryGroupsById;
let composers;
let composersById;
let publishers;
let publishersById;
let deliveryPartners;
let deliveryPartnersById;

beforeEach(() => {
  dateFormat = 'DD/MM/YYYY';
  workId = new Types.ObjectId();

  tracks = [
    new Track({ _id: new Types.ObjectId(), workId: workId.toString(), isrc: randomString() }),
    new Track({ _id: new Types.ObjectId(), workId: workId.toString(), isrc: randomString() }),
    new Track({ _id: new Types.ObjectId(), workId: randomString(), isrc: randomString() }),
  ];
  trackIsrcsById = {};
  for (const track of tracks) trackIsrcsById[track._id.toString()] = track.isrc;

  contracts = [
    new Contract({ _id: new Types.ObjectId(), name: randomString() }),
    new Contract({ _id: new Types.ObjectId(), name: randomString() }),
  ];
  contractsById = keyBy(contracts, (c) => c._id.toString());

  territoryGroups = [new TerritoryGroup({ _id: new Types.ObjectId(), name: randomString() })];
  territoryGroupsById = keyBy(territoryGroups, (tg) => tg._id.toString());

  composers = [
    new Composer({
      _id: new Types.ObjectId(),
      name: randomString(),
      firstName: randomString(),
      middleNames: randomString(),
      surname: randomString(),
      cae: randomString(),
    }),
  ];
  composersById = keyBy(composers, (c) => c._id.toString());

  publishers = [new Publisher({ _id: new Types.ObjectId(), name: randomString(), cae: randomString() })];
  publishersById = keyBy(publishers, (p) => p._id.toString());

  deliveryPartners = [new DeliveryPartner({ _id: new Types.ObjectId(), name: randomString() })];
  deliveryPartnersById = keyBy(deliveryPartners, (dp) => dp._id.toString());

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
});

describe('formatTrackData', () => {
  describe("when client has 'Lite' payment tier", () => {
    it('should include limited track data', () => {
      // Arrange
      const client = new Client({ paymentTier: 'Lite' });

      // Act
      const formattedWork = WorksXlsx.formatTrackData({ client, work, trackIsrcsById, dateFormat });

      // Assert
      expect(formattedWork).toEqual([
        work._id.toString(),
        work.title,
        work.composer,
        work.foreignId,
        work.projectId,
        work.partyNo,
        work.identifier,
        work.iswc,
        work.tunecode,
        '01/01/2025',
        work.labelCopy,
        work.performers.join(';'),
        [tracks[0].isrc, tracks[1].isrc].join(';'),
        work.territories.join(';'),
        work.catalogueGroups.join(';'),
        work.aliases.join(';'),
        work.notes,
      ]);
    });
  });

  describe('when client has higher than Lite payment tier', () => {
    it('should include full track data', () => {
      // Arrange
      const client = new Client({ paymentTier: 'Pro' });

      // Act
      const formattedWork = WorksXlsx.formatTrackData({ client, work, trackIsrcsById, dateFormat });

      // Assert
      expect(formattedWork).toEqual([
        work._id.toString(),
        work.title,
        work.composer,
        work.foreignId,
        work.projectId,
        work.partyNo,
        work.identifier,
        work.iswc,
        work.tunecode,
        '01/01/2025',
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
        [tracks[0].isrc, tracks[1].isrc].join(';'),
        work.territories.join(';'),
        work.catalogueGroups.join(';'),
        work.aliases.join(';'),
        work.notes,
      ]);
    });
  });

  it('should handle new lines (\\n) in work.notes', () => {
    // Arrange
    const client = new Client({ paymentTier: 'Pro' });
    work.notes = 'Hello\nWorld\nNew lines';

    // Act
    const formattedWork = WorksXlsx.formatTrackData({ client, work, trackIsrcsById, dateFormat });

    // Assert
    expect(formattedWork[formattedWork.length - 1]).toEqual('Hello World New lines');
  });

  it('should handle new lines (\\r\\r) in work.notes', () => {
    // Arrange
    const client = new Client({ paymentTier: 'Pro' });
    work.notes = 'Hello\r\rWorld\r\rNew lines';

    // Act
    const formattedWork = WorksXlsx.formatTrackData({ client, work, trackIsrcsById, dateFormat });

    // Assert
    expect(formattedWork[formattedWork.length - 1]).toEqual('Hello World New lines');
  });
});

describe('formatAlternateTitles', () => {
  it('should format alternate titles correctly', () => {
    // Act
    const formattedAlternateTitles = WorksXlsx.formatAlternateTitles({ work });

    // Assert
    expect(formattedAlternateTitles).toEqual(
      work.alternateTitles.map((at) => [
        work._id.toString(),
        work.title,
        work.identifier,
        work.tunecode,
        at.title,
        at.language,
      ]),
    );
  });
});

describe('formatParticipators', () => {
  it('should format participators correctly', () => {
    // Act
    const formattedParticipators = WorksXlsx.formatParticipators({ work, contractsById });

    // Assert
    expect(formattedParticipators).toEqual(
      work.salesReturnsRights.map((p) => [
        work._id.toString(),
        work.title,
        work.identifier,
        work.tunecode,
        contractsById[p.contractId].name,
        p.percentage,
      ]),
    );
  });
});

describe('formatSpecificParticipationRates', () => {
  it('should format channel specific participation rates correctly', () => {
    // Act
    const formattedParticipators = WorksXlsx.formatSpecificParticipationRates({ work, contractsById, territoryGroupsById });

    // Assert
    expect(formattedParticipators).toEqual([
      [
        work._id.toString(),
        work.title,
        work.identifier,
        work.tunecode,
        contracts[0].name,
        work.channelSpecificSalesReturnsRights[0].distributionChannel,
        work.channelSpecificSalesReturnsRights[0].source,
        work.channelSpecificSalesReturnsRights[0].territory,
        work.channelSpecificSalesReturnsRights[0].percentage,
      ],
      [
        work._id.toString(),
        work.title,
        work.identifier,
        work.tunecode,
        contracts[1].name,
        work.channelSpecificSalesReturnsRights[1].distributionChannel,
        work.channelSpecificSalesReturnsRights[1].source,
        territoryGroups[0].name,
        work.channelSpecificSalesReturnsRights[1].percentage,
      ],
    ]);
  });
});

describe('formatSocietyIdentifiers', () => {
  it('should format society identifiers correctly', () => {
    // Act
    const formattedSocietyIdentifiers = WorksXlsx.formatSocietyIdentifiers({ work });

    // Assert
    expect(formattedSocietyIdentifiers).toEqual(
      work.societyIdentifiers.map((si) => [
        work._id.toString(),
        work.title,
        work.identifier,
        work.tunecode,
        si.society,
        si.identifier,
      ]),
    );
  });
});

describe('formatRightsChains', () => {
  describe('chain territory is a territory group ID', () => {
    it('should format rights chains correctly', () => {
      // Act
      const formattedRightsChains = WorksXlsx.formatRightsChains({ work, territoryGroupsById, composersById, publishersById });

      // Assert
      expect(formattedRightsChains).toEqual([
        [
          work._id.toString(),
          work.title,
          work.identifier,
          work.tunecode,
          // Territory
          territoryGroups[0].name,
          // Publisher
          work.rightsChain[0].children[0].type,
          publishers[0].name,
          undefined,
          undefined,
          undefined,
          publishers[0].cae,
          work.rightsChain[0].children[0].controlled,
          work.rightsChain[0].children[0].mechanicalOwnership,
          work.rightsChain[0].children[0].mechanicalCollection,
          work.rightsChain[0].children[0].performanceOwnership,
          work.rightsChain[0].children[0].performanceCollection,
          work.rightsChain[0].children[0].contractType,
          // Composer
          work.rightsChain[0].children[0].children[0].type,
          composers[0].name,
          composers[0].firstName,
          composers[0].middleNames,
          composers[0].surname,
          composers[0].cae,
          work.rightsChain[0].children[0].children[0].controlled,
          work.rightsChain[0].children[0].children[0].mechanicalOwnership,
          work.rightsChain[0].children[0].children[0].mechanicalCollection,
          work.rightsChain[0].children[0].children[0].performanceOwnership,
          work.rightsChain[0].children[0].children[0].performanceCollection,
          work.rightsChain[0].children[0].children[0].contractType,
        ],
      ]);
    });
  });

  describe('chain territory is a list of territory codes', () => {
    it('should format rights chains correctly', () => {
      // Arrange
      work.rightsChain[0].territory = 'specific';
      work.rightsChain[0].territoryCodes = { codes: ['US', 'GB', 'FR'] };

      // Act
      const formattedRightsChains = WorksXlsx.formatRightsChains({ work, territoryGroupsById, composersById, publishersById });

      // Assert
      expect(formattedRightsChains).toEqual([
        [
          work._id.toString(),
          work.title,
          work.identifier,
          work.tunecode,
          // Territory
          'US;GB;FR',
          // Publisher
          work.rightsChain[0].children[0].type,
          publishers[0].name,
          undefined,
          undefined,
          undefined,
          publishers[0].cae,
          work.rightsChain[0].children[0].controlled,
          work.rightsChain[0].children[0].mechanicalOwnership,
          work.rightsChain[0].children[0].mechanicalCollection,
          work.rightsChain[0].children[0].performanceOwnership,
          work.rightsChain[0].children[0].performanceCollection,
          work.rightsChain[0].children[0].contractType,
          // Composer
          work.rightsChain[0].children[0].children[0].type,
          composers[0].name,
          composers[0].firstName,
          composers[0].middleNames,
          composers[0].surname,
          composers[0].cae,
          work.rightsChain[0].children[0].children[0].controlled,
          work.rightsChain[0].children[0].children[0].mechanicalOwnership,
          work.rightsChain[0].children[0].children[0].mechanicalCollection,
          work.rightsChain[0].children[0].children[0].performanceOwnership,
          work.rightsChain[0].children[0].children[0].performanceCollection,
          work.rightsChain[0].children[0].children[0].contractType,
        ],
      ]);
    });
  });

  describe('chain territory is a single valid territory', () => {
    it('should format rights chains correctly', () => {
      // Arrange
      work.rightsChain[0].territory = 'NL';

      // Act
      const formattedRightsChains = WorksXlsx.formatRightsChains({ work, territoryGroupsById, composersById, publishersById });

      // Assert
      expect(formattedRightsChains).toEqual([
        [
          work._id.toString(),
          work.title,
          work.identifier,
          work.tunecode,
          // Territory
          'NL',
          // Publisher
          work.rightsChain[0].children[0].type,
          publishers[0].name,
          undefined,
          undefined,
          undefined,
          publishers[0].cae,
          work.rightsChain[0].children[0].controlled,
          work.rightsChain[0].children[0].mechanicalOwnership,
          work.rightsChain[0].children[0].mechanicalCollection,
          work.rightsChain[0].children[0].performanceOwnership,
          work.rightsChain[0].children[0].performanceCollection,
          work.rightsChain[0].children[0].contractType,
          // Composer
          work.rightsChain[0].children[0].children[0].type,
          composers[0].name,
          composers[0].firstName,
          composers[0].middleNames,
          composers[0].surname,
          composers[0].cae,
          work.rightsChain[0].children[0].children[0].controlled,
          work.rightsChain[0].children[0].children[0].mechanicalOwnership,
          work.rightsChain[0].children[0].children[0].mechanicalCollection,
          work.rightsChain[0].children[0].children[0].performanceOwnership,
          work.rightsChain[0].children[0].children[0].performanceCollection,
          work.rightsChain[0].children[0].children[0].contractType,
        ],
      ]);
    });
  });
});

describe('formatPartnerChains', () => {
  it('should format partner rights chains correctly', () => {
    // Act
    const formattedRightsChains = WorksXlsx.formatPartnerChains({
      work,
      territoryGroupsById,
      composersById,
      publishersById,
      deliveryPartnersById,
    });

    // Assert
    expect(formattedRightsChains).toEqual([
      [
        work._id.toString(),
        work.title,
        work.identifier,
        work.tunecode,
        // Territory
        territoryGroups[0].name,
        // Delivery Partner
        deliveryPartners[0].name,
        // Publisher
        work.rightsChain[0].children[0].type,
        publishers[0].name,
        undefined,
        undefined,
        undefined,
        publishers[0].cae,
        work.rightsChain[0].children[0].controlled,
        work.rightsChain[0].children[0].mechanicalOwnership,
        work.rightsChain[0].children[0].mechanicalCollection,
        work.rightsChain[0].children[0].performanceOwnership,
        work.rightsChain[0].children[0].performanceCollection,
        work.rightsChain[0].children[0].contractType,
        // Composer
        work.rightsChain[0].children[0].children[0].type,
        composers[0].name,
        composers[0].firstName,
        composers[0].middleNames,
        composers[0].surname,
        composers[0].cae,
        work.rightsChain[0].children[0].children[0].controlled,
        work.rightsChain[0].children[0].children[0].mechanicalOwnership,
        work.rightsChain[0].children[0].children[0].mechanicalCollection,
        work.rightsChain[0].children[0].children[0].performanceOwnership,
        work.rightsChain[0].children[0].children[0].performanceCollection,
        work.rightsChain[0].children[0].children[0].contractType,
      ],
    ]);
  });
});

describe('fixEncoding', () => {
  it('should fix UTF-8 encoding issues in work fields', () => {
    expect(WorksXlsx.fixEncoding("L'avenir des idÃ©es")).toEqual("L'avenir des idées");
  });
});

describe('convertWorks', () => {
  describe('when partner chains is enabled', () => {
    it('should convert works to XLSX format correctly', () => {
      // Arrange
      const client = new Client({ dateFormat: 'YYYY-MM-DD', features: { partnerChains: true } });

      // Act
      const formattedWorks = WorksXlsx.convertWorks({
        client,
        works: [work],
        contractsById,
        territoryGroupsById,
        composersById,
        publishersById,
        deliveryPartnersById,
        trackIsrcsById,
      });

      // Assert
      expect(formattedWorks).toHaveLength(7);
      expect(formattedWorks[0]).toEqual([
        [
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
          [tracks[0].isrc, tracks[1].isrc].join(';'),
          work.territories.join(';'),
          work.catalogueGroups.join(';'),
          work.aliases.join(';'),
          work.notes,
        ],
      ]);
      expect(formattedWorks[1]).toEqual(work.alternateTitles.map((at) => [
        work._id.toString(),
        work.title,
        work.identifier,
        work.tunecode,
        at.title,
        at.language,
      ]));
      expect(formattedWorks[2]).toEqual(work.salesReturnsRights.map((p) => [
        work._id.toString(),
        work.title,
        work.identifier,
        work.tunecode,
        contractsById[p.contractId].name,
        p.percentage,
      ]));
      expect(formattedWorks[3]).toEqual([
        [
          work._id.toString(),
          work.title,
          work.identifier,
          work.tunecode,
          contracts[0].name,
          work.channelSpecificSalesReturnsRights[0].distributionChannel,
          work.channelSpecificSalesReturnsRights[0].source,
          work.channelSpecificSalesReturnsRights[0].territory,
          work.channelSpecificSalesReturnsRights[0].percentage,
        ],
        [
          work._id.toString(),
          work.title,
          work.identifier,
          work.tunecode,
          contracts[1].name,
          work.channelSpecificSalesReturnsRights[1].distributionChannel,
          work.channelSpecificSalesReturnsRights[1].source,
          territoryGroups[0].name,
          work.channelSpecificSalesReturnsRights[1].percentage,
        ],
      ]);
      expect(formattedWorks[4]).toEqual(work.societyIdentifiers.map((si) => [
        work._id.toString(),
        work.title,
        work.identifier,
        work.tunecode,
        si.society,
        si.identifier,
      ]));
      expect(formattedWorks[5]).toEqual([
        [
          work._id.toString(),
          work.title,
          work.identifier,
          work.tunecode,
          // Territory
          territoryGroups[0].name,
          // Publisher
          work.rightsChain[0].children[0].type,
          publishers[0].name,
          undefined,
          undefined,
          undefined,
          publishers[0].cae,
          work.rightsChain[0].children[0].controlled,
          work.rightsChain[0].children[0].mechanicalOwnership,
          work.rightsChain[0].children[0].mechanicalCollection,
          work.rightsChain[0].children[0].performanceOwnership,
          work.rightsChain[0].children[0].performanceCollection,
          work.rightsChain[0].children[0].contractType,
          // Composer
          work.rightsChain[0].children[0].children[0].type,
          composers[0].name,
          composers[0].firstName,
          composers[0].middleNames,
          composers[0].surname,
          composers[0].cae,
          work.rightsChain[0].children[0].children[0].controlled,
          work.rightsChain[0].children[0].children[0].mechanicalOwnership,
          work.rightsChain[0].children[0].children[0].mechanicalCollection,
          work.rightsChain[0].children[0].children[0].performanceOwnership,
          work.rightsChain[0].children[0].children[0].performanceCollection,
          work.rightsChain[0].children[0].children[0].contractType,
        ],
      ]);
      expect(formattedWorks[6]).toEqual([
        [
          work._id.toString(),
          work.title,
          work.identifier,
          work.tunecode,
          // Territory
          territoryGroups[0].name,
          // Delivery Partner
          deliveryPartners[0].name,
          // Publisher
          work.rightsChain[0].children[0].type,
          publishers[0].name,
          undefined,
          undefined,
          undefined,
          publishers[0].cae,
          work.rightsChain[0].children[0].controlled,
          work.rightsChain[0].children[0].mechanicalOwnership,
          work.rightsChain[0].children[0].mechanicalCollection,
          work.rightsChain[0].children[0].performanceOwnership,
          work.rightsChain[0].children[0].performanceCollection,
          work.rightsChain[0].children[0].contractType,
          // Composer
          work.rightsChain[0].children[0].children[0].type,
          composers[0].name,
          composers[0].firstName,
          composers[0].middleNames,
          composers[0].surname,
          composers[0].cae,
          work.rightsChain[0].children[0].children[0].controlled,
          work.rightsChain[0].children[0].children[0].mechanicalOwnership,
          work.rightsChain[0].children[0].children[0].mechanicalCollection,
          work.rightsChain[0].children[0].children[0].performanceOwnership,
          work.rightsChain[0].children[0].children[0].performanceCollection,
          work.rightsChain[0].children[0].children[0].contractType,
        ],
      ]);
    });
  });

  describe('when partner chains is disabled', () => {
    it('should not convert partner rights chains', () => {
      // Arrange
      const client = new Client({ dateFormat: 'YYYY-MM-DD', features: { partnerChains: false } });

      // Act
      const formattedWorks = WorksXlsx.convertWorks({
        client,
        works: [work],
        contractsById,
        territoryGroupsById,
        composersById,
        publishersById,
        deliveryPartnersById,
        trackIsrcsById,
      });

      // Assert
      expect(formattedWorks).toHaveLength(7);
      expect(formattedWorks[6]).toEqual([]);
    });
  });
});
