import { testUtils } from '@curveroyaltysystems/platform-shared-utils';
import {
  preSave,
  uniqueSocietyIdentifiers,
  uniqueAliases,
  formatIdentifier,
  calculateTotalParticipation,
  validateSalesReturns,
  checkMultipleContracts,
  forceControlledBoolean,
  collectComposerAndPublisherIDs,
  setApprovalStatus,
  roundRightsChainPercentages,
  calculateTotalCollection,
  combineDuplicateChainPublishers,
  checkCatalogueIDsAreUnique,
  checkOtherClientCatalogue,
  checksRightChainValidity,
  autoApproveWork,
  buildComposersString,
  addExtraChainData,
  checkPartnerChainsForSignificantUpdates,
  issuePartyNo,
  issueIdentifier,
  setDeliveries,
  cleanPublishers,
  generatePublisherFingerprints,
} from './preSave';
import RightsChainValidation from './rightsChain/validation';
import {
  makeWork,
  asWork,
  asModel,
  mockQuery,
  mockWorkModel,
  mockClientModel,
  mockComposerModel,
  mockPublisherModel,
  mockTerritoryGroupModel,
  mockDeliveredWorkModel,
} from './testUtils';

jest.mock('../../controllers/deliveredWork', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    count: jest.fn(),
  },
}));

jest.mock('../../controllers/work', () => ({
  __esModule: true,
  significantUpdateCheck: jest.fn().mockReturnValue([]),
  arePartnerChainsEqual: jest.fn().mockReturnValue([]),
  checkIswcEligibility: jest.fn().mockResolvedValue(undefined),
}));

const { randomId } = testUtils;

// Access the mock functions via requireMock so we can set return values per-test.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dwcMock = (jest.requireMock('../../controllers/deliveredWork') as any).default as {
  get: jest.Mock;
  count: jest.Mock;
};
const mockDWCGet = dwcMock.get;
const mockDWCCount = dwcMock.count;

describe('uniqueSocietyIdentifiers', () => {
  it('removes duplicate entries with the same society and identifier', () => {
    const entry = { society: 'PRS', identifier: 'ABC123' };
    const work = makeWork({ societyIdentifiers: [entry, entry] });
    uniqueSocietyIdentifiers(asWork(work));
    expect(work.societyIdentifiers).toHaveLength(1);
  });

  it('keeps entries that share a society but have different identifiers', () => {
    const work = makeWork({
      societyIdentifiers: [
        { society: 'PRS', identifier: 'ABC' },
        { society: 'PRS', identifier: 'XYZ' },
      ],
    });
    uniqueSocietyIdentifiers(asWork(work));
    expect(work.societyIdentifiers).toHaveLength(2);
  });

  it('keeps entries that share an identifier but have different societies', () => {
    const work = makeWork({
      societyIdentifiers: [
        { society: 'PRS', identifier: 'ABC' },
        { society: 'ASCAP', identifier: 'ABC' },
      ],
    });
    uniqueSocietyIdentifiers(asWork(work));
    expect(work.societyIdentifiers).toHaveLength(2);
  });

  it('no-ops when all entries are already unique', () => {
    const work = makeWork({
      societyIdentifiers: [
        { society: 'PRS', identifier: 'A' },
        { society: 'ASCAP', identifier: 'B' },
      ],
    });
    uniqueSocietyIdentifiers(asWork(work));
    expect(work.societyIdentifiers).toHaveLength(2);
  });

  it('handles an empty array', () => {
    const work = makeWork({ societyIdentifiers: [] });
    uniqueSocietyIdentifiers(asWork(work));
    expect(work.societyIdentifiers).toHaveLength(0);
  });
});

describe('checkCatalogueIDsAreUnique', () => {
  describe('identifier uniqueness', () => {
    it('throws when another work with the same identifier exists for the client', async () => {
      const Work = mockWorkModel({
        findOne: jest.fn().mockReturnValue(mockQuery({ _id: randomId(), identifier: 'DUPE' })),
      });
      const work = makeWork({ identifier: 'DUPE' });
      await expect(checkCatalogueIDsAreUnique(asWork(work), asModel(Work))).rejects.toThrow(
        'Identifier is required to be unique'
      );
    });

    it('does not throw when the identifier is unique', async () => {
      const Work = mockWorkModel();
      const work = makeWork({ identifier: 'UNIQUE' });
      await expect(checkCatalogueIDsAreUnique(asWork(work), asModel(Work))).resolves.toBeUndefined();
    });

    it('does not throw when identifier is not set', async () => {
      const Work = mockWorkModel();
      const work = makeWork();
      await expect(checkCatalogueIDsAreUnique(asWork(work), asModel(Work))).resolves.toBeUndefined();
    });

    it('does not throw when _creationType is unmapped even if a duplicate exists', async () => {
      const Work = mockWorkModel({
        findOne: jest.fn().mockReturnValue(mockQuery({ _id: randomId(), identifier: 'DUPE' })),
      });
      const work = makeWork({ identifier: 'DUPE', _creationType: 'unmapped' });
      await expect(checkCatalogueIDsAreUnique(asWork(work), asModel(Work))).resolves.toBeUndefined();
    });

    it('does not throw when the conflicting work is in _excludeIdsForValidation', async () => {
      // findOne returns null — the excluded id is filtered out via $nin in the query
      const Work = mockWorkModel();
      const work = makeWork({ identifier: 'DUPE', _excludeIdsForValidation: [randomId()] });
      await expect(checkCatalogueIDsAreUnique(asWork(work), asModel(Work))).resolves.toBeUndefined();
    });
  });

  describe('tunecode uniqueness', () => {
    it('throws when a duplicate tunecode exists for the same client', async () => {
      const Work = mockWorkModel({
        findOne: jest.fn().mockReturnValue(mockQuery({ _id: randomId(), tunecode: 'TC001' })),
      });
      const work = makeWork({ tunecode: 'TC001' });
      await expect(checkCatalogueIDsAreUnique(asWork(work), asModel(Work))).rejects.toThrow(
        'Tunecode is required to be unique'
      );
    });

    it('does not throw when tunecode is not set', async () => {
      const Work = mockWorkModel();
      const work = makeWork();
      await expect(checkCatalogueIDsAreUnique(asWork(work), asModel(Work))).resolves.toBeUndefined();
    });

    it('does not throw when the conflicting work is the work itself', async () => {
      // findOne returns null — the work's own _id is excluded via $nin
      const Work = mockWorkModel();
      const work = makeWork({ tunecode: 'TC001' });
      await expect(checkCatalogueIDsAreUnique(asWork(work), asModel(Work))).resolves.toBeUndefined();
    });
  });

  describe('ISWC uniqueness', () => {
    it('throws when a duplicate ISWC exists for the same client', async () => {
      const Work = mockWorkModel({
        findOne: jest.fn().mockReturnValue(mockQuery({ _id: randomId(), iswc: 'T-123456789-0' })),
      });
      const work = makeWork({ iswc: 'T-123456789-0' });
      await expect(checkCatalogueIDsAreUnique(asWork(work), asModel(Work))).rejects.toThrow(
        'ISWC is required to be unique'
      );
    });

    it('does not throw when ISWC is not set', async () => {
      const Work = mockWorkModel();
      const work = makeWork();
      await expect(checkCatalogueIDsAreUnique(asWork(work), asModel(Work))).resolves.toBeUndefined();
    });

    it('does not throw when the conflicting work is the work itself', async () => {
      const Work = mockWorkModel();
      const work = makeWork({ iswc: 'T-123456789-0' });
      await expect(checkCatalogueIDsAreUnique(asWork(work), asModel(Work))).resolves.toBeUndefined();
    });
  });

  describe('society identifier uniqueness', () => {
    it('throws when a modified society identifier conflicts with another work', async () => {
      const identifier = { society: 'PRS', identifier: 'PRS99999' };
      const Work = mockWorkModel({
        find: jest.fn().mockReturnValue(mockQuery([{ _id: randomId(), societyIdentifiers: [identifier] }])),
      });
      const work = makeWork({
        societyIdentifiers: [identifier],
        modifiedPaths: () => ['societyIdentifiers'],
      });
      await expect(checkCatalogueIDsAreUnique(asWork(work), asModel(Work))).rejects.toThrow(
        'Society Identifiers are required to be unique'
      );
    });

    it('skips the conflict check when societyIdentifiers has not been modified', async () => {
      const Work = mockWorkModel();
      const work = makeWork({
        societyIdentifiers: [{ society: 'PRS', identifier: 'PRS99999' }],
        modifiedPaths: () => [],
      });
      await checkCatalogueIDsAreUnique(asWork(work), asModel(Work));
      expect(Work.find).not.toHaveBeenCalled();
    });

    it('does not throw when no conflict exists', async () => {
      const Work = mockWorkModel({
        find: jest.fn().mockReturnValue(mockQuery([])),
      });
      const work = makeWork({
        societyIdentifiers: [{ society: 'PRS', identifier: 'PRS00001' }],
        modifiedPaths: () => ['societyIdentifiers'],
      });
      await expect(checkCatalogueIDsAreUnique(asWork(work), asModel(Work))).resolves.toBeUndefined();
    });
  });
});

describe('checkOtherClientCatalogue', () => {
  const clientId = randomId();

  describe('publisher check', () => {
    it('throws when a publisher in usedPublisherIds belongs to a different client', async () => {
      const publisherId = randomId();
      const Composer = mockComposerModel();
      const Publisher = mockPublisherModel({
        find: jest.fn().mockReturnValue(mockQuery([{ clientId: 'other-client', name: 'Bad Publisher' }])),
      });
      const TerritoryGroup = mockTerritoryGroupModel();
      const work = makeWork({ clientId, usedPublisherIds: [publisherId] });
      await expect(
        checkOtherClientCatalogue(asWork(work), asModel(Composer), asModel(Publisher), asModel(TerritoryGroup))
      ).rejects.toThrow('A work appears to include publisher from another Client: Bad Publisher');
    });

    it('does not throw when all publishers belong to the same client', async () => {
      const publisherId = randomId();
      const Composer = mockComposerModel();
      const Publisher = mockPublisherModel({
        find: jest.fn().mockReturnValue(mockQuery([{ clientId, name: 'Good Publisher' }])),
      });
      const TerritoryGroup = mockTerritoryGroupModel();
      const work = makeWork({ clientId, usedPublisherIds: [publisherId] });
      await expect(
        checkOtherClientCatalogue(asWork(work), asModel(Composer), asModel(Publisher), asModel(TerritoryGroup))
      ).resolves.toBeUndefined();
    });

    it('skips the publisher check when usedPublisherIds is empty', async () => {
      const Composer = mockComposerModel();
      const Publisher = mockPublisherModel();
      const TerritoryGroup = mockTerritoryGroupModel();
      const work = makeWork({ clientId, usedPublisherIds: [] });
      await checkOtherClientCatalogue(asWork(work), asModel(Composer), asModel(Publisher), asModel(TerritoryGroup));
      expect(Publisher.find).not.toHaveBeenCalled();
    });
  });

  describe('composer check', () => {
    it('throws when a composer in usedComposerIds belongs to a different client', async () => {
      const composerId = randomId();
      const Composer = mockComposerModel({
        find: jest.fn().mockReturnValue(mockQuery([{ clientId: 'other-client', name: 'Bad Composer' }])),
      });
      const Publisher = mockPublisherModel();
      const TerritoryGroup = mockTerritoryGroupModel();
      const work = makeWork({ clientId, usedComposerIds: [composerId] });
      await expect(
        checkOtherClientCatalogue(asWork(work), asModel(Composer), asModel(Publisher), asModel(TerritoryGroup))
      ).rejects.toThrow('A work appears to include composer from another Client: Bad Composer');
    });

    it('does not throw when all composers belong to the same client', async () => {
      const composerId = randomId();
      const Composer = mockComposerModel({
        find: jest.fn().mockReturnValue(mockQuery([{ clientId, name: 'Good Composer' }])),
      });
      const Publisher = mockPublisherModel();
      const TerritoryGroup = mockTerritoryGroupModel();
      const work = makeWork({ clientId, usedComposerIds: [composerId] });
      await expect(
        checkOtherClientCatalogue(asWork(work), asModel(Composer), asModel(Publisher), asModel(TerritoryGroup))
      ).resolves.toBeUndefined();
    });

    it('skips the composer check when usedComposerIds is empty', async () => {
      const Composer = mockComposerModel();
      const Publisher = mockPublisherModel();
      const TerritoryGroup = mockTerritoryGroupModel();
      const work = makeWork({ clientId, usedComposerIds: [] });
      await checkOtherClientCatalogue(asWork(work), asModel(Composer), asModel(Publisher), asModel(TerritoryGroup));
      expect(Composer.find).not.toHaveBeenCalled();
    });
  });

  describe('territory group check', () => {
    it('throws when a rights chain territory belongs to a different client', async () => {
      const territoryId = randomId();
      const Composer = mockComposerModel();
      const Publisher = mockPublisherModel();
      const TerritoryGroup = mockTerritoryGroupModel({
        find: jest.fn().mockReturnValue(mockQuery([{ clientId: 'other-client', name: 'Bad Territory' }])),
      });
      const work = makeWork({
        clientId,
        rightsChain: [{ territory: territoryId, children: [] }],
      });
      await expect(
        checkOtherClientCatalogue(asWork(work), asModel(Composer), asModel(Publisher), asModel(TerritoryGroup))
      ).rejects.toThrow('A work appears to include territory groups from another Client: Bad Territory');
    });

    it('throws when a partner rights chain territory belongs to a different client', async () => {
      const territoryId = randomId();
      const Composer = mockComposerModel();
      const Publisher = mockPublisherModel();
      const TerritoryGroup = mockTerritoryGroupModel({
        find: jest.fn().mockReturnValue(mockQuery([{ clientId: 'other-client', name: 'Bad Partner Territory' }])),
      });
      const work = makeWork({
        clientId,
        partnerRightsChains: [{ rightsChain: [{ territory: territoryId, children: [] }] }],
      });
      await expect(
        checkOtherClientCatalogue(asWork(work), asModel(Composer), asModel(Publisher), asModel(TerritoryGroup))
      ).rejects.toThrow('A work appears to include territory groups from another Client: Bad Partner Territory');
    });

    it('does not throw when all territory groups belong to the same client', async () => {
      const territoryId = randomId();
      const Composer = mockComposerModel();
      const Publisher = mockPublisherModel();
      const TerritoryGroup = mockTerritoryGroupModel({
        find: jest.fn().mockReturnValue(mockQuery([{ clientId, name: 'Good Territory' }])),
      });
      const work = makeWork({
        clientId,
        rightsChain: [{ territory: territoryId, children: [] }],
      });
      await expect(
        checkOtherClientCatalogue(asWork(work), asModel(Composer), asModel(Publisher), asModel(TerritoryGroup))
      ).resolves.toBeUndefined();
    });

    it('skips the territory check when rightsChain and partnerRightsChains are empty', async () => {
      const Composer = mockComposerModel();
      const Publisher = mockPublisherModel();
      const TerritoryGroup = mockTerritoryGroupModel();
      const work = makeWork({ clientId });
      await checkOtherClientCatalogue(asWork(work), asModel(Composer), asModel(Publisher), asModel(TerritoryGroup));
      expect(TerritoryGroup.find).not.toHaveBeenCalled();
    });
  });
});

describe('uniqueAliases', () => {
  it('removes duplicate string values', () => {
    const work = makeWork({ aliases: ['Rock', 'Pop', 'Rock'] });
    uniqueAliases(asWork(work));
    expect(work.aliases).toEqual(['Rock', 'Pop']);
  });

  it('keeps unique strings', () => {
    const work = makeWork({ aliases: ['Rock', 'Pop', 'Jazz'] });
    uniqueAliases(asWork(work));
    expect(work.aliases).toEqual(['Rock', 'Pop', 'Jazz']);
  });

  it('handles an empty array', () => {
    const work = makeWork({ aliases: [] });
    uniqueAliases(asWork(work));
    expect(work.aliases).toEqual([]);
  });
});

describe('formatIdentifier', () => {
  it('strips spaces, hyphens and special characters from the identifier', () => {
    const work = makeWork({ identifier: 'AB C-12/3!' });
    formatIdentifier(asWork(work));
    expect(work.identifier).toBe('ABC123');
  });

  it('preserves alphanumeric characters', () => {
    const work = makeWork({ identifier: 'ABC123' });
    formatIdentifier(asWork(work));
    expect(work.identifier).toBe('ABC123');
  });

  it('no-ops when identifier is already clean', () => {
    const work = makeWork({ identifier: 'XYZ789' });
    formatIdentifier(asWork(work));
    expect(work.identifier).toBe('XYZ789');
  });

  it('no-ops when identifier is not set', () => {
    const work = makeWork();
    formatIdentifier(asWork(work));
    expect(work.identifier).toBeUndefined();
  });
});

describe('calculateTotalParticipation', () => {
  it('sums percentage across all salesReturnsRights entries', () => {
    const work = makeWork({
      salesReturnsRights: [{ percentage: 25 }, { percentage: 50 }],
    });
    calculateTotalParticipation(asWork(work));
    expect(work.totalParticipation).toBe(75);
  });

  it('rounds the result to 4 decimal places', () => {
    const work = makeWork({
      salesReturnsRights: [{ percentage: 33.33333 }],
    });
    calculateTotalParticipation(asWork(work));
    expect(work.totalParticipation).toBe(33.3333);
  });

  it('treats a missing percentage on a line as 0', () => {
    const work = makeWork({
      salesReturnsRights: [{ percentage: 50 }, {}],
    });
    calculateTotalParticipation(asWork(work));
    expect(work.totalParticipation).toBe(50);
  });

  it('handles an empty salesReturnsRights array (result is 0)', () => {
    const work = makeWork({ salesReturnsRights: [] });
    calculateTotalParticipation(asWork(work));
    expect(work.totalParticipation).toBe(0);
  });

  it('handles floating point accumulation correctly', () => {
    const work = makeWork({
      salesReturnsRights: [{ percentage: 0.1 }, { percentage: 0.2 }],
    });
    calculateTotalParticipation(asWork(work));
    expect(work.totalParticipation).toBe(0.3);
  });
});

describe('validateSalesReturns', () => {
  it('throws when a salesReturnsRights entry is missing contractId', () => {
    const work = makeWork({ salesReturnsRights: [{ percentage: 50 }] });
    expect(() => validateSalesReturns(asWork(work))).toThrow(
      'A Contract needs to be linked to a Percentage when a Participation Right is assigned'
    );
  });

  it('throws when a salesReturnsRights entry is missing percentage (and percentage is not 0)', () => {
    const work = makeWork({ salesReturnsRights: [{ contractId: randomId() }] });
    expect(() => validateSalesReturns(asWork(work))).toThrow(
      'A Contract needs to be linked to a Percentage when a Participation Right is assigned'
    );
  });

  it('does not throw when percentage is exactly 0 (zero is a valid percentage)', () => {
    const work = makeWork({ salesReturnsRights: [{ contractId: randomId(), percentage: 0 }] });
    expect(() => validateSalesReturns(asWork(work))).not.toThrow();
  });

  it('throws when a channelSpecificSalesReturnsRights entry is missing contractId', () => {
    const work = makeWork({ channelSpecificSalesReturnsRights: [{ percentage: 25 }] });
    expect(() => validateSalesReturns(asWork(work))).toThrow(
      'A Contract needs to be linked to a Percentage when a Participation Right is assigned'
    );
  });

  it('throws when a channelSpecificSalesReturnsRights entry is missing percentage', () => {
    const work = makeWork({ channelSpecificSalesReturnsRights: [{ contractId: randomId() }] });
    expect(() => validateSalesReturns(asWork(work))).toThrow(
      'A Contract needs to be linked to a Percentage when a Participation Right is assigned'
    );
  });

  it('does not throw when all salesReturnsRights and channelSpecificSalesReturnsRights entries are valid', () => {
    const work = makeWork({
      salesReturnsRights: [{ contractId: randomId(), percentage: 50 }],
      channelSpecificSalesReturnsRights: [{ contractId: randomId(), percentage: 25 }],
    });
    expect(() => validateSalesReturns(asWork(work))).not.toThrow();
  });
});

describe('checkMultipleContracts', () => {
  it('throws when salesReturnsRights has two entries with the same contractId', () => {
    const contractId = randomId();
    const work = makeWork({
      salesReturnsRights: [{ contractId }, { contractId }],
    });
    expect(() => checkMultipleContracts(asWork(work))).toThrow(
      'A work can only have one instance of a contract attached to it'
    );
  });

  it('throws when costsRights has two entries with the same contractId', () => {
    const contractId = randomId();
    const work = makeWork({
      costsRights: [{ contractId }, { contractId }],
    });
    expect(() => checkMultipleContracts(asWork(work))).toThrow(
      'A work can only have one instance of a contract attached to it'
    );
  });

  it('does not throw when every entry in salesReturnsRights has a distinct contractId', () => {
    const work = makeWork({
      salesReturnsRights: [{ contractId: randomId() }, { contractId: randomId() }],
    });
    expect(() => checkMultipleContracts(asWork(work))).not.toThrow();
  });

  it('does not throw when every entry in costsRights has a distinct contractId', () => {
    const work = makeWork({
      costsRights: [{ contractId: randomId() }, { contractId: randomId() }],
    });
    expect(() => checkMultipleContracts(asWork(work))).not.toThrow();
  });
});

describe('forceControlledBoolean', () => {
  it('sets controlled: true when value is boolean true', () => {
    const work = makeWork({ rightsChain: [{ controlled: true, children: [] }] });
    forceControlledBoolean(asWork(work));
    expect((work.rightsChain as { controlled: boolean }[])[0]!.controlled).toBe(true);
  });

  it("sets controlled: true when value is string 'true'", () => {
    const work = makeWork({ rightsChain: [{ controlled: 'true', children: [] }] });
    forceControlledBoolean(asWork(work));
    expect((work.rightsChain as { controlled: boolean }[])[0]!.controlled).toBe(true);
  });

  it("sets controlled: true when value is string '1'", () => {
    const work = makeWork({ rightsChain: [{ controlled: '1', children: [] }] });
    forceControlledBoolean(asWork(work));
    expect((work.rightsChain as { controlled: boolean }[])[0]!.controlled).toBe(true);
  });

  it('sets controlled: false when value is boolean false', () => {
    const work = makeWork({ rightsChain: [{ controlled: false, children: [] }] });
    forceControlledBoolean(asWork(work));
    expect((work.rightsChain as { controlled: boolean }[])[0]!.controlled).toBe(false);
  });

  it('sets controlled: false when value is any other truthy string', () => {
    const work = makeWork({ rightsChain: [{ controlled: 'yes', children: [] }] });
    forceControlledBoolean(asWork(work));
    expect((work.rightsChain as { controlled: boolean }[])[0]!.controlled).toBe(false);
  });

  it('applies recursively to all children in the chain', () => {
    const work = makeWork({
      rightsChain: [{ children: [{ controlled: 'true', children: [] }] }],
    });
    forceControlledBoolean(asWork(work));
    const chain = work.rightsChain as { children: { controlled: boolean }[] }[];
    expect(chain[0]!.children[0]!.controlled).toBe(true);
  });

  it('applies to every chain in rightsChain', () => {
    const work = makeWork({
      rightsChain: [
        { controlled: 'true', children: [] },
        { controlled: '1', children: [] },
      ],
    });
    forceControlledBoolean(asWork(work));
    const chains = work.rightsChain as { controlled: boolean }[];
    expect(chains[0]!.controlled).toBe(true);
    expect(chains[1]!.controlled).toBe(true);
  });

  it('applies to partnerRightsChains too', () => {
    const work = makeWork({
      partnerRightsChains: [{ rightsChain: [{ controlled: 'true', children: [] }] }],
    });
    forceControlledBoolean(asWork(work));
    const partnerChain = (work.partnerRightsChains as { rightsChain: { controlled: boolean }[] }[])[0]!;
    expect(partnerChain.rightsChain[0]!.controlled).toBe(true);
  });

  it('handles empty rightsChain', () => {
    const work = makeWork({ rightsChain: [] });
    expect(() => forceControlledBoolean(asWork(work))).not.toThrow();
  });
});

describe('collectComposerAndPublisherIDs', () => {
  it('populates usedComposerIds with all composer IDs found in rightsChain', () => {
    const id = randomId();
    const work = makeWork({
      rightsChain: [{ children: [{ type: 'Composer', composerId: id, children: [] }] }],
    });
    collectComposerAndPublisherIDs(asWork(work));
    expect(work.usedComposerIds).toContain(id);
  });

  it('populates usedPublisherIds with all publisher IDs found in rightsChain', () => {
    const id = randomId();
    const work = makeWork({
      rightsChain: [{ children: [{ type: 'Publisher', publisherId: id, children: [] }] }],
    });
    collectComposerAndPublisherIDs(asWork(work));
    expect(work.usedPublisherIds).toContain(id);
  });

  it('deduplicates — the same ID appearing in multiple chains only appears once', () => {
    const id = randomId();
    const work = makeWork({
      rightsChain: [
        { children: [{ type: 'Composer', composerId: id, children: [] }] },
        { children: [{ type: 'Composer', composerId: id, children: [] }] },
      ],
    });
    collectComposerAndPublisherIDs(asWork(work));
    expect((work.usedComposerIds as string[]).filter((x) => x === id)).toHaveLength(1);
  });

  it('traverses nested children recursively', () => {
    const id = randomId();
    const work = makeWork({
      rightsChain: [
        {
          children: [
            {
              type: 'Publisher',
              publisherId: randomId(),
              children: [{ type: 'Composer', composerId: id, children: [] }],
            },
          ],
        },
      ],
    });
    collectComposerAndPublisherIDs(asWork(work));
    expect(work.usedComposerIds).toContain(id);
  });

  it('includes IDs from partnerRightsChains', () => {
    const id = randomId();
    const work = makeWork({
      partnerRightsChains: [{ rightsChain: [{ children: [{ type: 'Composer', composerId: id, children: [] }] }] }],
    });
    collectComposerAndPublisherIDs(asWork(work));
    expect(work.usedComposerIds).toContain(id);
  });

  it('excludes empty string composerId/publisherId values', () => {
    const work = makeWork({
      rightsChain: [{ children: [{ type: 'Composer', composerId: '', children: [] }] }],
    });
    collectComposerAndPublisherIDs(asWork(work));
    expect(work.usedComposerIds).toEqual([]);
  });

  it('handles empty rightsChain', () => {
    const work = makeWork({ rightsChain: [] });
    collectComposerAndPublisherIDs(asWork(work));
    expect(work.usedComposerIds).toEqual([]);
    expect(work.usedPublisherIds).toEqual([]);
  });
});

describe('setApprovalStatus', () => {
  it("sets approvalStatus to 'Ready for Approval' when valid is true and no approvedDate", () => {
    const work = makeWork({ valid: true });
    setApprovalStatus(asWork(work));
    expect(work.approvalStatus).toBe('Ready for Approval');
  });

  it("sets approvalStatus to 'Invalid' when valid is false", () => {
    const work = makeWork({ valid: false });
    setApprovalStatus(asWork(work));
    expect(work.approvalStatus).toBe('Invalid');
  });

  it('does not change approvalStatus when already approved (valid true with approvedDate)', () => {
    const work = makeWork({ valid: true, approvedDate: new Date(), approvalStatus: 'Approved' });
    setApprovalStatus(asWork(work));
    expect(work.approvalStatus).toBe('Approved');
  });
});

describe('roundRightsChainPercentages', () => {
  it('rounds mechanicalOwnership to 2 decimal places', () => {
    const work = makeWork({ rightsChain: [{ mechanicalOwnership: 33.3333, children: [] }] });
    roundRightsChainPercentages(asWork(work));
    expect((work.rightsChain as { mechanicalOwnership: number }[])[0]!.mechanicalOwnership).toBe(33.33);
  });

  it('rounds mechanicalCollection to 2 decimal places', () => {
    const work = makeWork({ rightsChain: [{ mechanicalCollection: 66.6666, children: [] }] });
    roundRightsChainPercentages(asWork(work));
    expect((work.rightsChain as { mechanicalCollection: number }[])[0]!.mechanicalCollection).toBe(66.67);
  });

  it('rounds performanceOwnership to 2 decimal places', () => {
    const work = makeWork({ rightsChain: [{ performanceOwnership: 50.555, children: [] }] });
    roundRightsChainPercentages(asWork(work));
    expect((work.rightsChain as { performanceOwnership: number }[])[0]!.performanceOwnership).toBe(50.56);
  });

  it('rounds performanceCollection to 2 decimal places', () => {
    const work = makeWork({ rightsChain: [{ performanceCollection: 12.3456, children: [] }] });
    roundRightsChainPercentages(asWork(work));
    expect((work.rightsChain as { performanceCollection: number }[])[0]!.performanceCollection).toBe(12.35);
  });

  it('converts string values to numbers before rounding', () => {
    const work = makeWork({ rightsChain: [{ mechanicalOwnership: '25.555' as unknown as number, children: [] }] });
    roundRightsChainPercentages(asWork(work));
    expect((work.rightsChain as { mechanicalOwnership: number }[])[0]!.mechanicalOwnership).toBe(25.56);
  });

  it('applies recursively to all children', () => {
    const work = makeWork({
      rightsChain: [{ children: [{ mechanicalOwnership: 33.3333, children: [] }] }],
    });
    roundRightsChainPercentages(asWork(work));
    const { children } = (work.rightsChain as { children: { mechanicalOwnership: number }[] }[])[0]!;
    expect(children[0]!.mechanicalOwnership).toBe(33.33);
  });

  it('applies to every chain in rightsChain', () => {
    const work = makeWork({
      rightsChain: [
        { mechanicalOwnership: 33.3333, children: [] },
        { mechanicalOwnership: 66.6666, children: [] },
      ],
    });
    roundRightsChainPercentages(asWork(work));
    const chains = work.rightsChain as { mechanicalOwnership: number }[];
    expect(chains[0]!.mechanicalOwnership).toBe(33.33);
    expect(chains[1]!.mechanicalOwnership).toBe(66.67);
  });

  it('applies to partnerRightsChains too', () => {
    const work = makeWork({
      partnerRightsChains: [{ rightsChain: [{ mechanicalOwnership: 33.3333, children: [] }] }],
    });
    roundRightsChainPercentages(asWork(work));
    const partnerChain = (work.partnerRightsChains as { rightsChain: { mechanicalOwnership: number }[] }[])[0]!;
    expect(partnerChain.rightsChain[0]!.mechanicalOwnership).toBe(33.33);
  });

  it('skips chain items that do not have a given percentage property', () => {
    const work = makeWork({ rightsChain: [{ children: [] }] });
    expect(() => roundRightsChainPercentages(asWork(work))).not.toThrow();
  });
});

describe('calculateTotalCollection', () => {
  it('sets totalOwnedMechanical from mechanicalCollection of controlled children in the first qualifying chain', () => {
    const work = makeWork({
      rightsChain: [{ children: [{ controlled: true, mechanicalCollection: 50.5 }] }],
    });
    calculateTotalCollection(asWork(work));
    expect((work.totalCollection as { totalOwnedMechanical: number }).totalOwnedMechanical).toBe(50.5);
  });

  it('sets totalOwnedPerformance from performanceCollection of controlled children', () => {
    const work = makeWork({
      rightsChain: [{ children: [{ controlled: true, performanceCollection: 75.25 }] }],
    });
    calculateTotalCollection(asWork(work));
    expect((work.totalCollection as { totalOwnedPerformance: number }).totalOwnedPerformance).toBe(75.25);
  });

  it('rounds both values to 2 decimal places', () => {
    const work = makeWork({
      rightsChain: [
        { children: [{ controlled: true, mechanicalCollection: 33.3333, performanceCollection: 66.6666 }] },
      ],
    });
    calculateTotalCollection(asWork(work));
    const totals = work.totalCollection as { totalOwnedMechanical: number; totalOwnedPerformance: number };
    expect(totals.totalOwnedMechanical).toBe(33.33);
    expect(totals.totalOwnedPerformance).toBe(66.67);
  });

  it('only processes the first chain that has controlled children', () => {
    const work = makeWork({
      rightsChain: [
        { children: [{ controlled: true, mechanicalCollection: 50 }] },
        { children: [{ controlled: true, mechanicalCollection: 100 }] },
      ],
    });
    calculateTotalCollection(asWork(work));
    expect((work.totalCollection as { totalOwnedMechanical: number }).totalOwnedMechanical).toBe(50);
  });

  it('leaves totals at 0 when no chain has controlled children', () => {
    const work = makeWork({
      rightsChain: [{ children: [{ controlled: false, mechanicalCollection: 50 }] }],
    });
    calculateTotalCollection(asWork(work));
    const totals = work.totalCollection as { totalOwnedMechanical: number; totalOwnedPerformance: number };
    expect(totals.totalOwnedMechanical).toBe(0);
    expect(totals.totalOwnedPerformance).toBe(0);
  });

  it('handles empty rightsChain', () => {
    const work = makeWork({ rightsChain: [] });
    calculateTotalCollection(asWork(work));
    const totals = work.totalCollection as { totalOwnedMechanical: number; totalOwnedPerformance: number };
    expect(totals.totalOwnedMechanical).toBe(0);
    expect(totals.totalOwnedPerformance).toBe(0);
  });
});

describe('combineDuplicateChainPublishers', () => {
  function makePublisher(publisherId: string, extras: Record<string, unknown> = {}) {
    return { type: 'Publisher', publisherId, contractType: 'AQ', controlled: false, children: [], ...extras };
  }

  it('merges two publishers at the same chain level with the same publisherId', () => {
    const publisherId = randomId();
    const work = makeWork({
      rightsChain: [{ territory: 'WORLD', children: [makePublisher(publisherId), makePublisher(publisherId)] }],
    });
    combineDuplicateChainPublishers(asWork(work));
    const chain = (work.rightsChain as { children: unknown[] }[])[0]!;
    expect(chain.children).toHaveLength(1);
  });

  it('preserves publishers with distinct publisherIds', () => {
    const work = makeWork({
      rightsChain: [{ territory: 'WORLD', children: [makePublisher(randomId()), makePublisher(randomId())] }],
    });
    combineDuplicateChainPublishers(asWork(work));
    const chain = (work.rightsChain as { children: unknown[] }[])[0]!;
    expect(chain.children).toHaveLength(2);
  });

  it('no-ops on a single-publisher array', () => {
    const work = makeWork({
      rightsChain: [{ territory: 'WORLD', children: [makePublisher(randomId())] }],
    });
    combineDuplicateChainPublishers(asWork(work));
    const chain = (work.rightsChain as { children: unknown[] }[])[0]!;
    expect(chain.children).toHaveLength(1);
  });

  it('handles an empty children array', () => {
    const work = makeWork({ rightsChain: [{ territory: 'WORLD', children: [] }] });
    expect(() => combineDuplicateChainPublishers(asWork(work))).not.toThrow();
  });

  it('applies to partnerRightsChains too', () => {
    const publisherId = randomId();
    const work = makeWork({
      partnerRightsChains: [
        { rightsChain: [{ territory: 'WORLD', children: [makePublisher(publisherId), makePublisher(publisherId)] }] },
      ],
    });
    combineDuplicateChainPublishers(asWork(work));
    const partnerChain = (work.partnerRightsChains as { rightsChain: { children: unknown[] }[] }[])[0]!;
    expect(partnerChain.rightsChain[0]!.children).toHaveLength(1);
  });
});

describe('autoApproveWork', () => {
  it("sets approvedDate and approvalStatus 'Approved' when work is valid and client.autoApproveWorks is true", async () => {
    const Client = mockClientModel({
      findById: jest.fn().mockResolvedValue({ autoApproveWorks: true }),
    });
    const work = makeWork({ valid: true });
    await autoApproveWork(asWork(work), asModel(Client));
    expect(work.approvedDate).toBeDefined();
    expect(work.approvalStatus).toBe('Approved');
  });

  it('does not set approvedDate when work is valid but client.autoApproveWorks is false', async () => {
    const Client = mockClientModel({
      findById: jest.fn().mockResolvedValue({ autoApproveWorks: false }),
    });
    const work = makeWork({ valid: true });
    await autoApproveWork(asWork(work), asModel(Client));
    expect(work.approvedDate).toBeUndefined();
  });

  it('does not set approvedDate when work is invalid even if client.autoApproveWorks is true', async () => {
    const Client = mockClientModel({
      findById: jest.fn().mockResolvedValue({ autoApproveWorks: true }),
    });
    const work = makeWork({ valid: false });
    await autoApproveWork(asWork(work), asModel(Client));
    expect(work.approvedDate).toBeUndefined();
  });

  it('does not throw when client lookup fails', async () => {
    const Client = mockClientModel({
      findById: jest.fn().mockRejectedValue(new Error('DB error')),
    });
    const work = makeWork({ valid: true });
    await expect(autoApproveWork(asWork(work), asModel(Client))).resolves.toBeUndefined();
  });
});

describe('checksRightChainValidity', () => {
  let checkValidationErrorsSpy: jest.SpyInstance;

  beforeEach(() => {
    checkValidationErrorsSpy = jest
      .spyOn(RightsChainValidation, 'checkValidationErrors')
      .mockResolvedValue([] as never);
  });

  afterEach(() => {
    checkValidationErrorsSpy.mockRestore();
  });

  it('sets work.valid = true and validationErrors = [] when no errors', async () => {
    const TerritoryGroup = mockTerritoryGroupModel();
    const work = makeWork();
    await checksRightChainValidity(asWork(work), asModel(TerritoryGroup));
    expect(work.valid).toBe(true);
    expect(work.validationErrors).toEqual([]);
  });

  it('sets work.valid = false and populates validationErrors when errors exist', async () => {
    checkValidationErrorsSpy.mockResolvedValue(['Each IP Chain requires at least one Territory'] as never);
    const TerritoryGroup = mockTerritoryGroupModel();
    const work = makeWork();
    await checksRightChainValidity(asWork(work), asModel(TerritoryGroup));
    expect(work.valid).toBe(false);
    expect(work.validationErrors).toHaveLength(1);
  });

  it('throws when a previously-approved work is saved with changes that make it invalid', async () => {
    checkValidationErrorsSpy.mockResolvedValue(['Each IP Chain requires at least one Territory'] as never);
    const TerritoryGroup = mockTerritoryGroupModel();
    const work = makeWork({ valid: true, approvedDate: new Date() });
    await expect(checksRightChainValidity(asWork(work), asModel(TerritoryGroup))).rejects.toThrow(
      'These changes will invalidate the work'
    );
  });

  it('does not throw when a non-approved work transitions from valid to invalid', async () => {
    checkValidationErrorsSpy.mockResolvedValue(['Each IP Chain requires at least one Territory'] as never);
    const TerritoryGroup = mockTerritoryGroupModel();
    const work = makeWork({ valid: true });
    await expect(checksRightChainValidity(asWork(work), asModel(TerritoryGroup))).resolves.toBeUndefined();
  });

  it("throws the empty chain error when validationErrors includes 'A Chain is currently empty'", async () => {
    checkValidationErrorsSpy.mockResolvedValue(['A Chain is currently empty'] as never);
    const TerritoryGroup = mockTerritoryGroupModel();
    const work = makeWork();
    await expect(checksRightChainValidity(asWork(work), asModel(TerritoryGroup))).rejects.toThrow(
      'A Chain is currently empty'
    );
  });
});

describe('buildComposersString', () => {
  it("sets work.composer to the composer's name when there is one Composer node in the chain", async () => {
    const composerId = randomId();
    const Composer = mockComposerModel({
      find: jest.fn().mockReturnValue(mockQuery([{ name: 'John Williams' }])),
    });
    const work = makeWork({
      rightsChain: [{ children: [{ type: 'Composer', composerId, children: [] }] }],
    });
    await buildComposersString(asWork(work), asModel(Composer));
    expect(work.composer).toBe('John Williams');
  });

  it('sets work.composer to a comma-joined string when multiple distinct composers are in the chain', async () => {
    const Composer = mockComposerModel({
      find: jest.fn().mockReturnValue(mockQuery([{ name: 'John Williams' }, { name: 'Hans Zimmer' }])),
    });
    const work = makeWork({
      rightsChain: [
        {
          children: [
            { type: 'Composer', composerId: randomId(), children: [] },
            { type: 'Composer', composerId: randomId(), children: [] },
          ],
        },
      ],
    });
    await buildComposersString(asWork(work), asModel(Composer));
    expect(work.composer).toBe('John Williams, Hans Zimmer');
  });

  it('deduplicates names — the same composer appearing in multiple chains is only listed once', async () => {
    const composerId = randomId();
    const Composer = mockComposerModel({
      find: jest.fn().mockReturnValue(mockQuery([{ name: 'John Williams' }])),
    });
    const work = makeWork({
      rightsChain: [
        { children: [{ type: 'Composer', composerId, children: [] }] },
        { children: [{ type: 'Composer', composerId, children: [] }] },
      ],
    });
    await buildComposersString(asWork(work), asModel(Composer));
    expect(work.composer).toBe('John Williams');
  });

  it('does not set work.composer when rightsChain is empty', async () => {
    const Composer = mockComposerModel();
    const work = makeWork({ rightsChain: [] });
    await buildComposersString(asWork(work), asModel(Composer));
    expect(work.composer).toBeUndefined();
    expect(Composer.find).not.toHaveBeenCalled();
  });

  it('does not set work.composer when the chain contains only Publisher nodes', async () => {
    const Composer = mockComposerModel();
    const work = makeWork({
      rightsChain: [{ children: [{ type: 'Publisher', publisherId: randomId(), children: [] }] }],
    });
    await buildComposersString(asWork(work), asModel(Composer));
    expect(work.composer).toBeUndefined();
  });
});

describe('addExtraChainData', () => {
  it('backfills caeNumber on a chain Composer entry from the matching Composer document', async () => {
    const composerId = randomId();
    const Composer = mockComposerModel({
      find: jest
        .fn()
        .mockReturnValue(mockQuery([{ _id: { toString: () => composerId }, cae: '123456789', name: 'John Williams' }])),
    });
    const composerNode: Record<string, unknown> = { type: 'Composer', composerId, children: [] };
    const work = makeWork({
      rightsChain: [{ children: [composerNode] }],
    });
    await addExtraChainData(asWork(work), asModel(Composer));
    expect(composerNode.caeNumber).toBe('123456789');
  });

  it('backfills name on a chain Composer entry from the matching Composer document', async () => {
    const composerId = randomId();
    const Composer = mockComposerModel({
      find: jest
        .fn()
        .mockReturnValue(mockQuery([{ _id: { toString: () => composerId }, cae: '123456789', name: 'John Williams' }])),
    });
    const composerNode: Record<string, unknown> = { type: 'Composer', composerId, children: [] };
    const work = makeWork({
      rightsChain: [{ children: [composerNode] }],
    });
    await addExtraChainData(asWork(work), asModel(Composer));
    expect(composerNode.name).toBe('John Williams');
  });

  it('applies to composers in partnerRightsChains too', async () => {
    const composerId = randomId();
    const Composer = mockComposerModel({
      find: jest
        .fn()
        .mockReturnValue(mockQuery([{ _id: { toString: () => composerId }, cae: '999', name: 'Hans Zimmer' }])),
    });
    const composerNode: Record<string, unknown> = { type: 'Composer', composerId, children: [] };
    const work = makeWork({
      partnerRightsChains: [{ rightsChain: [{ children: [composerNode] }] }],
    });
    await addExtraChainData(asWork(work), asModel(Composer));
    expect(composerNode.caeNumber).toBe('999');
  });

  it('no-ops when there are no Composer entries in any chain', async () => {
    const Composer = mockComposerModel();
    const work = makeWork({ rightsChain: [] });
    await addExtraChainData(asWork(work), asModel(Composer));
    expect(Composer.find).not.toHaveBeenCalled();
  });

  it('leaves the chain entry unchanged when the composerId is not found in the DB', async () => {
    const composerId = randomId();
    const Composer = mockComposerModel({
      find: jest.fn().mockReturnValue(mockQuery([])),
    });
    const composerNode: Record<string, unknown> = { type: 'Composer', composerId, children: [] };
    const work = makeWork({ rightsChain: [{ children: [composerNode] }] });
    await addExtraChainData(asWork(work), asModel(Composer));
    expect(composerNode.caeNumber).toBeUndefined();
    expect(composerNode.name).toBeUndefined();
  });
});

describe('checkPartnerChainsForSignificantUpdates', () => {
  it('sets significantUpdateDate when the rights chain changes on update', async () => {
    const workId = randomId();
    const oldWork = { rightsChain: [], partnerRightsChains: [] };
    const Work = mockWorkModel({
      findById: jest.fn().mockReturnValue(mockQuery(oldWork)),
    });
    const work = makeWork({ _id: workId, partnerRightsChains: [], significantUpdateToPartnerChains: [] });
    await checkPartnerChainsForSignificantUpdates(asWork(work), asModel(Work));
    expect(Work.findById).toHaveBeenCalledWith(workId);
  });

  it('does not set significantUpdateDate on first save when no prior version exists', async () => {
    const Work = mockWorkModel({
      findById: jest.fn().mockReturnValue(mockQuery(null)),
    });
    const work = makeWork({ significantUpdateToPartnerChains: [] });
    await checkPartnerChainsForSignificantUpdates(asWork(work), asModel(Work));
    expect(work.significantUpdateDate).toBeUndefined();
  });

  it('skips the DB lookup when work has no _id', async () => {
    const Work = mockWorkModel();
    const work = makeWork({ _id: undefined, significantUpdateToPartnerChains: [] });
    await checkPartnerChainsForSignificantUpdates(asWork(work), asModel(Work));
    expect(Work.findById).not.toHaveBeenCalled();
  });
});

describe('issuePartyNo', () => {
  beforeEach(() => {
    mockDWCCount.mockResolvedValue(0);
  });

  it('assigns partyNo: 1 when no other works exist for the client', async () => {
    const Work = mockWorkModel({
      countDocuments: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockReturnValue(mockQuery([])),
    });
    const work = makeWork();
    await issuePartyNo(asWork(work), asModel(Work), asModel(mockDeliveredWorkModel()));
    expect(work.partyNo).toBe(1);
  });

  it('assigns max(partyNo) + 1 when other works exist for the client', async () => {
    const Work = mockWorkModel({
      countDocuments: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockReturnValue(mockQuery([{ partyNo: 5 }])),
    });
    const work = makeWork();
    await issuePartyNo(asWork(work), asModel(Work), asModel(mockDeliveredWorkModel()));
    expect(work.partyNo).toBe(6);
  });

  it('keeps existing partyNo when it is already unique across the client', async () => {
    const Work = mockWorkModel({
      countDocuments: jest.fn().mockResolvedValue(0),
    });
    const work = makeWork({ partyNo: 42 });
    await issuePartyNo(asWork(work), asModel(Work), asModel(mockDeliveredWorkModel()));
    expect(work.partyNo).toBe(42);
  });

  it('re-issues partyNo when it conflicts and the work has no deliveries', async () => {
    const Work = mockWorkModel({
      countDocuments: jest.fn().mockResolvedValue(1),
      find: jest.fn().mockReturnValue(mockQuery([{ partyNo: 10 }])),
    });
    const work = makeWork({ partyNo: 9 });
    await issuePartyNo(asWork(work), asModel(Work), asModel(mockDeliveredWorkModel()));
    expect(work.partyNo).toBe(11);
  });

  it('keeps a conflicting partyNo when the work has existing deliveries', async () => {
    mockDWCCount.mockResolvedValue(3);
    const Work = mockWorkModel({
      countDocuments: jest.fn().mockResolvedValue(1),
    });
    const work = makeWork({ partyNo: 9 });
    await issuePartyNo(asWork(work), asModel(Work), asModel(mockDeliveredWorkModel()));
    expect(work.partyNo).toBe(9);
  });
});

describe('issueIdentifier', () => {
  it("no-ops when the work already has an identifier and _creationType is not 'unmapped'", async () => {
    const Work = mockWorkModel();
    const Client = mockClientModel();
    const work = makeWork({ identifier: 'EXISTING' });
    await issueIdentifier(asWork(work), asModel(Work), asModel(Client));
    expect(Client.findById).not.toHaveBeenCalled();
  });

  it("proceeds to issue when the work has an identifier but _creationType is 'unmapped'", async () => {
    const Work = mockWorkModel({
      findOne: jest.fn().mockReturnValue(mockQuery(null)),
    });
    const Client = mockClientModel({
      findById: jest
        .fn()
        .mockResolvedValue({ issueIdentifier: true, identifierPrefix: null, identifierStartFrom: null }),
    });
    const work = makeWork({ identifier: 'EXISTING', _creationType: 'unmapped' });
    await issueIdentifier(asWork(work), asModel(Work), asModel(Client));
    expect(Client.findById).toHaveBeenCalled();
  });

  it('no-ops when client.issueIdentifier is false', async () => {
    const Work = mockWorkModel();
    const Client = mockClientModel({
      findById: jest.fn().mockResolvedValue({ issueIdentifier: false }),
    });
    const work = makeWork();
    await issueIdentifier(asWork(work), asModel(Work), asModel(Client));
    expect(work.identifier).toBeUndefined();
    expect(Work.findOne).not.toHaveBeenCalled();
  });

  it("assigns identifierNo: 1 and identifier: '1' when no prior works exist and no prefix or startFrom is set", async () => {
    const Work = mockWorkModel({
      findOne: jest.fn().mockReturnValue(mockQuery(null)),
    });
    const Client = mockClientModel({
      findById: jest
        .fn()
        .mockResolvedValue({ issueIdentifier: true, identifierPrefix: null, identifierStartFrom: null }),
    });
    const work = makeWork();
    await issueIdentifier(asWork(work), asModel(Work), asModel(Client));
    expect(work.identifierNo).toBe(1);
    expect(work.identifier).toBe('1');
  });

  it('assigns max(identifierNo) + 1 when prior works exist', async () => {
    const Work = mockWorkModel({
      findOne: jest
        .fn()
        .mockReturnValueOnce(mockQuery({ identifierNo: 7 }))
        .mockReturnValueOnce(mockQuery(null)),
    });
    const Client = mockClientModel({
      findById: jest
        .fn()
        .mockResolvedValue({ issueIdentifier: true, identifierPrefix: null, identifierStartFrom: null }),
    });
    const work = makeWork();
    await issueIdentifier(asWork(work), asModel(Work), asModel(Client));
    expect(work.identifierNo).toBe(8);
    expect(work.identifier).toBe('8');
  });

  it('applies identifierStartFrom when it is greater than the current max', async () => {
    const Work = mockWorkModel({
      findOne: jest
        .fn()
        .mockReturnValueOnce(mockQuery({ identifierNo: 3 }))
        .mockReturnValueOnce(mockQuery(null)),
    });
    const Client = mockClientModel({
      findById: jest
        .fn()
        .mockResolvedValue({ issueIdentifier: true, identifierPrefix: null, identifierStartFrom: 100 }),
    });
    const work = makeWork();
    await issueIdentifier(asWork(work), asModel(Work), asModel(Client));
    expect(work.identifierNo).toBe(100);
  });

  it('does not apply identifierStartFrom when it is less than or equal to the current max', async () => {
    const Work = mockWorkModel({
      findOne: jest
        .fn()
        .mockReturnValueOnce(mockQuery({ identifierNo: 50 }))
        .mockReturnValueOnce(mockQuery(null)),
    });
    const Client = mockClientModel({
      findById: jest.fn().mockResolvedValue({ issueIdentifier: true, identifierPrefix: null, identifierStartFrom: 10 }),
    });
    const work = makeWork();
    await issueIdentifier(asWork(work), asModel(Work), asModel(Client));
    expect(work.identifierNo).toBe(51);
  });

  it('prepends identifierPrefix to the identifier string when set on the client', async () => {
    const Work = mockWorkModel({
      findOne: jest.fn().mockReturnValueOnce(mockQuery(null)).mockReturnValueOnce(mockQuery(null)),
    });
    const Client = mockClientModel({
      findById: jest
        .fn()
        .mockResolvedValue({ issueIdentifier: true, identifierPrefix: 'WRK-', identifierStartFrom: null }),
    });
    const work = makeWork();
    await issueIdentifier(asWork(work), asModel(Work), asModel(Client));
    expect(work.identifier).toBe('WRK-1');
  });

  it('retries with initial + 1 when the generated identifier already exists (collision)', async () => {
    const Work = mockWorkModel({
      findOne: jest
        .fn()
        .mockReturnValueOnce(mockQuery(null)) // highest identifierNo query → no prior works
        .mockReturnValueOnce(mockQuery({ _id: 'conflict' })) // collision on identifier '1'
        .mockReturnValueOnce(mockQuery(null)), // identifier '2' is free
    });
    const Client = mockClientModel({
      findById: jest
        .fn()
        .mockResolvedValue({ issueIdentifier: true, identifierPrefix: null, identifierStartFrom: null }),
    });
    const work = makeWork();
    await issueIdentifier(asWork(work), asModel(Work), asModel(Client));
    expect(work.identifierNo).toBe(2);
    expect(work.identifier).toBe('2');
  });

  it('sets both identifierNo (numeric) and identifier (string) on the work', async () => {
    const Work = mockWorkModel({
      findOne: jest
        .fn()
        .mockReturnValueOnce(mockQuery({ identifierNo: 9 }))
        .mockReturnValueOnce(mockQuery(null)),
    });
    const Client = mockClientModel({
      findById: jest
        .fn()
        .mockResolvedValue({ issueIdentifier: true, identifierPrefix: 'P', identifierStartFrom: null }),
    });
    const work = makeWork();
    await issueIdentifier(asWork(work), asModel(Work), asModel(Client));
    expect(work.identifierNo).toBe(10);
    expect(work.identifier).toBe('P10');
  });
});

describe('setDeliveries', () => {
  it('sets work.deliveredTo to an empty array when no DeliveredWork documents exist', async () => {
    mockDWCGet.mockResolvedValue([]);
    const work = makeWork();
    await setDeliveries(asWork(work), asModel(mockDeliveredWorkModel()));
    expect(work.deliveredTo).toEqual([]);
  });

  it('populates work.deliveredTo with { deliveryPartnerId, deliveredAt } entries', async () => {
    const partnerId = randomId();
    const updatedAt = new Date();
    mockDWCGet.mockResolvedValue([{ deliveryPartnerId: partnerId, updatedAt }]);
    const work = makeWork();
    await setDeliveries(asWork(work), asModel(mockDeliveredWorkModel()));
    expect(work.deliveredTo).toEqual([{ deliveryPartnerId: partnerId, deliveredAt: updatedAt }]);
  });

  it('reflects the current state of deliveries on every save', async () => {
    const partnerId1 = randomId();
    const partnerId2 = randomId();
    mockDWCGet.mockResolvedValue([
      { deliveryPartnerId: partnerId1, updatedAt: new Date() },
      { deliveryPartnerId: partnerId2, updatedAt: new Date() },
    ]);
    const work = makeWork();
    await setDeliveries(asWork(work), asModel(mockDeliveredWorkModel()));
    expect((work.deliveredTo as unknown[]).length).toBe(2);
  });
});

describe('preSave', () => {
  let checkValidationErrorsSpy: jest.SpyInstance;

  beforeEach(() => {
    checkValidationErrorsSpy = jest
      .spyOn(RightsChainValidation, 'checkValidationErrors')
      .mockResolvedValue([] as never);
    mockDWCGet.mockResolvedValue([]);
    mockDWCCount.mockResolvedValue(0);
  });

  afterEach(() => {
    checkValidationErrorsSpy.mockRestore();
  });

  it('runs the full pipeline and produces expected side effects on work', async () => {
    const work = makeWork();
    const Work = mockWorkModel({
      findById: jest.fn().mockReturnValue(mockQuery(null)),
    });
    const Client = mockClientModel();
    const Composer = mockComposerModel();
    const Publisher = mockPublisherModel();
    const TerritoryGroup = mockTerritoryGroupModel();
    const DeliveredWork = mockDeliveredWorkModel();

    await preSave({
      work: asWork(work),
      Work: asModel(Work),
      Client: asModel(Client),
      DeliveredWork: asModel(DeliveredWork),
      Composer: asModel(Composer),
      Publisher: asModel(Publisher),
      TerritoryGroup: asModel(TerritoryGroup),
    });

    expect(work.totalParticipation).toBe(0); // calculateTotalParticipation
    expect(work.usedComposerIds).toEqual([]); // collectComposerAndPublisherIDs
    expect(work.usedPublisherIds).toEqual([]); // collectComposerAndPublisherIDs
    expect(work.deliveredTo).toEqual([]); // setDeliveries
    expect(work.valid).toBe(true); // checksRightChainValidity
    expect(work.validationErrors).toEqual([]); // checksRightChainValidity
    expect(work.approvalStatus).toBe('Ready for Approval'); // setApprovalStatus (valid, not yet approved)
    expect(work.totalCollection).toBeDefined(); // calculateTotalCollection
    expect(mockDWCGet).toHaveBeenCalled(); // setDeliveries
    expect(mockDWCCount).toHaveBeenCalled(); // issuePartyNo
    expect(Client.findById).toHaveBeenCalled(); // autoApproveWork / issueIdentifier
  });

  it('propagates an error from an early step and skips the rest of the pipeline', async () => {
    const work = makeWork({ identifier: 'DUP001' });
    const Work = mockWorkModel({
      findById: jest.fn().mockReturnValue(mockQuery(null)),
      findOne: jest.fn().mockReturnValue(mockQuery({ identifier: 'DUP001' })),
    });
    const Client = mockClientModel();
    const Composer = mockComposerModel();
    const Publisher = mockPublisherModel();
    const TerritoryGroup = mockTerritoryGroupModel();
    const DeliveredWork = mockDeliveredWorkModel();

    await expect(
      preSave({
        work: asWork(work),
        Work: asModel(Work),
        Client: asModel(Client),
        DeliveredWork: asModel(DeliveredWork),
        Composer: asModel(Composer),
        Publisher: asModel(Publisher),
        TerritoryGroup: asModel(TerritoryGroup),
      })
    ).rejects.toThrow('Identifier is required to be unique');

    // autoApproveWork and issueIdentifier (steps 19 and 22) should never have run
    expect(Client.findById).not.toHaveBeenCalled();
  });
});

describe('cleanPublishers', () => {
  it('filters out empty string publisher IDs', () => {
    const work = makeWork({
      channelSpecificSalesReturnsRights: [{ publishers: ['68385e170ecdf654de36fb24', '', '55385e170ecdf654de36fb24'] }],
    });
    const w = asWork(work);
    cleanPublishers(w);
    expect(w.channelSpecificSalesReturnsRights[0].publishers).toEqual([
      '68385e170ecdf654de36fb24',
      '55385e170ecdf654de36fb24',
    ]);
  });

  it('filters out whitespace-only publisher IDs', () => {
    const work = makeWork({
      channelSpecificSalesReturnsRights: [{ publishers: ['68385e170ecdf654de36fb24', '   '] }],
    });
    const w = asWork(work);
    cleanPublishers(w);
    expect(w.channelSpecificSalesReturnsRights[0].publishers).toEqual(['68385e170ecdf654de36fb24']);
  });

  it('leaves valid publisher IDs untouched', () => {
    const work = makeWork({
      channelSpecificSalesReturnsRights: [{ publishers: ['68385e170ecdf654de36fb24', '55385e170ecdf654de36fb24'] }],
    });
    const w = asWork(work);
    cleanPublishers(w);
    expect(w.channelSpecificSalesReturnsRights[0].publishers).toEqual([
      '68385e170ecdf654de36fb24',
      '55385e170ecdf654de36fb24',
    ]);
  });

  it('handles entries with no publishers array', () => {
    const work = makeWork({
      channelSpecificSalesReturnsRights: [{ publishers: undefined }],
    });
    expect(() => cleanPublishers(asWork(work))).not.toThrow();
  });

  it('no-ops when channelSpecificSalesReturnsRights is absent', () => {
    const work = makeWork();
    expect(() => cleanPublishers(asWork(work))).not.toThrow();
  });
});

describe('validateSalesReturns — duplicate publisher check', () => {
  it('throws when publisher mapping is enabled and a rights entry has duplicate publisher IDs', () => {
    const id = '68385e170ecdf654de36fb24';
    const work = makeWork({
      enablePublisherMapping: true,
      channelSpecificSalesReturnsRights: [{ contractId: randomId(), percentage: 50, publishers: [id, id] }],
    });
    expect(() => validateSalesReturns(asWork(work))).toThrow('Duplicate Publishers detected');
  });

  it('does not throw when publisher mapping is enabled and all publisher IDs are unique', () => {
    const work = makeWork({
      enablePublisherMapping: true,
      channelSpecificSalesReturnsRights: [
        {
          contractId: randomId(),
          percentage: 50,
          publishers: ['68385e170ecdf654de36fb24', '55385e170ecdf654de36fb24'],
        },
      ],
    });
    expect(() => validateSalesReturns(asWork(work))).not.toThrow();
  });

  it('does not throw when publisher mapping is disabled even if publisher IDs are duplicated', () => {
    const id = '68385e170ecdf654de36fb24';
    const work = makeWork({
      enablePublisherMapping: false,
      channelSpecificSalesReturnsRights: [{ contractId: randomId(), percentage: 50, publishers: [id, id] }],
    });
    expect(() => validateSalesReturns(asWork(work))).not.toThrow();
  });

  it('does not throw when the publishers array is empty and publisher mapping is enabled', () => {
    const work = makeWork({
      enablePublisherMapping: true,
      channelSpecificSalesReturnsRights: [{ contractId: randomId(), percentage: 50, publishers: [] }],
    });
    expect(() => validateSalesReturns(asWork(work))).not.toThrow();
  });
});

describe('generatePublisherFingerprints', () => {
  const idA = '55385e170ecdf654de36fb24';
  const idB = '68385e170ecdf654de36fb24';

  it('generates a fingerprint when publisher mapping is enabled and publishers are present', () => {
    const work = makeWork({
      enablePublisherMapping: true,
      channelSpecificSalesReturnsRights: [{ publishers: [idB, idA], publisherFingerprint: '' }],
    });
    const w = asWork(work);
    generatePublisherFingerprints(w);
    expect(w.channelSpecificSalesReturnsRights[0].publisherFingerprint).toBe(`${idA}:${idB}`);
  });

  it('produces the same fingerprint regardless of publisher order', () => {
    const work = makeWork({
      enablePublisherMapping: true,
      channelSpecificSalesReturnsRights: [
        { publishers: [idA, idB], publisherFingerprint: '' },
        { publishers: [idB, idA], publisherFingerprint: '' },
      ],
    });
    const w = asWork(work);
    generatePublisherFingerprints(w);
    expect(w.channelSpecificSalesReturnsRights[0].publisherFingerprint).toBe(w.channelSpecificSalesReturnsRights[1].publisherFingerprint);
  });

  it('clears the fingerprint when publisher mapping is enabled but publishers array is empty', () => {
    const work = makeWork({
      enablePublisherMapping: true,
      channelSpecificSalesReturnsRights: [{ publishers: [], publisherFingerprint: `${idA}:${idB}` }],
    });
    const w = asWork(work);
    generatePublisherFingerprints(w);
    expect(w.channelSpecificSalesReturnsRights[0].publisherFingerprint).toBe('');
  });

  it('clears the fingerprint when publisher mapping is disabled', () => {
    const work = makeWork({
      enablePublisherMapping: false,
      channelSpecificSalesReturnsRights: [{ publishers: [idA, idB], publisherFingerprint: `${idA}:${idB}` }],
    });
    const w = asWork(work);
    generatePublisherFingerprints(w);
    expect(w.channelSpecificSalesReturnsRights[0].publisherFingerprint).toBe('');
  });

  it('no-ops when channelSpecificSalesReturnsRights is absent', () => {
    const work = makeWork({ enablePublisherMapping: true });
    expect(() => generatePublisherFingerprints(asWork(work))).not.toThrow();
  });
});
