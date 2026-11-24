const { testUtils, createXlsx } = require('@curveroyaltysystems/platform-shared-utils');
const { TerritoryHelper, WorkRightsChainValidation } = require('@curveroyaltysystems/curve-shared-logic');
const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const Composer = require('../composer');
const Contract = require('../contract');
const Publisher = require('../publisher');
const DeliveredWork = require('../deliveredWork');
const TerritoryGroup = require('../territoryGroup');
const Track = require('../track');
const Work = require('./index');
const Client = require('../client');

let client;

// Build a minimal work for the current client.
function buildWork(overrides = {}) {
  return new Work({
    clientId: client._id.toString(),
    title: randomString(),
    rightsChain: [],
    ...overrides,
  });
}

// Build a work that passes all chain validation checks (valid: true).
// Ownership values are split across levels to avoid double-counting:
// publisher takes mechanical in full (100/0) and splits performance 50/50 with the composer.
function buildValidWork(overrides = {}) {
  return new Work({
    clientId: client._id.toString(),
    title: randomString(),
    territories: ['WW'],
    rightsChain: [{
      territory: 'WW',
      children: [{
        type: 'Publisher',
        publisherId: testUtils.randomId().toString(),
        controlled: true,
        contractType: 'Original Publisher',
        mechanicalOwnership: 100,
        performanceOwnership: 50,
        mechanicalCollection: 100,
        performanceCollection: 50,
        children: [{
          type: 'Composer',
          composerId: testUtils.randomId().toString(),
          controlled: true,
          contractType: 'Music',
          mechanicalOwnership: 0,
          performanceOwnership: 50,
          mechanicalCollection: 0,
          performanceCollection: 50,
          children: [],
        }],
      }],
    }],
    ...overrides,
  });
}

beforeEach(async () => {
  client = await new Client({
    name: randomString(),
    issueIdentifier: false,
    createdBigQueryTables: true,
    createdBigQueryBackups: true,
    clientType: 'Publisher',
  }).save();
});

afterEach(async () => {
  if (client._id) await testUtils.cleanUpAsync(client._id.toString());
});

describe('save (pre-save hook)', () => {
  // Everything within this describe block is called via the Works pre-save hook
  // The names of each block e.g. uniqueSocietyIdentifiers correspond to the original function name
  // These have since been migrated over to CSL so they can be shared across repos
  // There's no harm in keeping these descriptors here in this test file as they keep everything nicely grouped up

  describe('uniqueSocietyIdentifiers', () => {
    it('removes duplicate entries with the same society and identifier', async () => {
      const entry = { society: 'PRS', identifier: 'ABC123' };
      const work = await buildWork({ societyIdentifiers: [entry, entry] }).save();
      const saved = await Work.findById(work._id);
      expect(saved.societyIdentifiers).toHaveLength(1);
    });

    it('keeps entries that share a society but have different identifiers', async () => {
      const work = await buildWork({
        societyIdentifiers: [
          { society: 'PRS', identifier: 'ABC123' },
          { society: 'PRS', identifier: 'XYZ999' },
        ],
      }).save();
      const saved = await Work.findById(work._id);
      expect(saved.societyIdentifiers).toHaveLength(2);
    });

    it('keeps entries that share an identifier but have different societies', async () => {
      const work = await buildWork({
        societyIdentifiers: [
          { society: 'PRS', identifier: 'ABC123' },
          { society: 'ASCAP', identifier: 'ABC123' },
        ],
      }).save();
      const saved = await Work.findById(work._id);
      expect(saved.societyIdentifiers).toHaveLength(2);
    });

    it('no-ops when all entries are already unique', async () => {
      const work = await buildWork({
        societyIdentifiers: [
          { society: 'PRS', identifier: 'AAA' },
          { society: 'ASCAP', identifier: 'BBB' },
        ],
      }).save();
      const saved = await Work.findById(work._id);
      expect(saved.societyIdentifiers).toHaveLength(2);
    });

    it('handles an empty societyIdentifiers array', async () => {
      const work = await buildWork({ societyIdentifiers: [] }).save();
      const saved = await Work.findById(work._id);
      expect(saved.societyIdentifiers).toHaveLength(0);
    });
  });

  describe('uniqueAliases', () => {
    it('removes duplicate alias strings', async () => {
      const work = await buildWork({ aliases: ['ALIAS ONE', 'ALIAS ONE'] }).save();
      const saved = await Work.findById(work._id);
      expect(saved.aliases).toHaveLength(1);
      expect(saved.aliases[0]).toBe('ALIAS ONE');
    });

    it('keeps unique alias strings', async () => {
      const work = await buildWork({ aliases: ['ALIAS ONE', 'ALIAS TWO'] }).save();
      const saved = await Work.findById(work._id);
      expect(saved.aliases).toHaveLength(2);
    });

    it('handles an empty aliases array', async () => {
      const work = await buildWork({ aliases: [] }).save();
      const saved = await Work.findById(work._id);
      expect(saved.aliases).toHaveLength(0);
    });
  });

  describe('identifier cleanup', () => {
    it('strips non-alphanumeric characters from the identifier', async () => {
      const work = await buildWork({ identifier: 'AB-CD 12/3' }).save();
      const saved = await Work.findById(work._id);
      expect(saved.identifier).toBe('ABCD123');
    });

    it('preserves alphanumeric characters', async () => {
      const work = await buildWork({ identifier: 'ABC123' }).save();
      const saved = await Work.findById(work._id);
      expect(saved.identifier).toBe('ABC123');
    });

    it('no-ops when identifier is not set', async () => {
      const work = await buildWork({ identifier: undefined }).save();
      const saved = await Work.findById(work._id);
      expect(saved.identifier).toBeFalsy();
    });
  });

  describe('calculateTotalParticipation', () => {
    it('sums percentages across all salesReturnsRights entries', async () => {
      const work = await buildWork({
        salesReturnsRights: [
          { contractId: testUtils.randomId(), percentage: 30 },
          { contractId: testUtils.randomId(), percentage: 20 },
        ],
      }).save();
      const saved = await Work.findById(work._id);
      expect(saved.totalParticipation).toBe(50);
    });

    it('rounds the result to 4 decimal places', async () => {
      const work = await buildWork({
        salesReturnsRights: [
          { contractId: testUtils.randomId(), percentage: 33.33333 },
          { contractId: testUtils.randomId(), percentage: 33.33333 },
        ],
      }).save();
      const saved = await Work.findById(work._id);
      expect(saved.totalParticipation).toBe(66.6666);
    });

    it('returns 0 for an empty salesReturnsRights array', async () => {
      const work = await buildWork({ salesReturnsRights: [] }).save();
      const saved = await Work.findById(work._id);
      expect(saved.totalParticipation).toBe(0);
    });
  });

  describe('preSaveValidation — society alias uniqueness', () => {
    it('throws when a modified society identifier conflicts with another work for the same client', async () => {
      const identifier = { society: 'PRS', identifier: 'PRS99999' };
      await buildWork({ societyIdentifiers: [identifier] }).save();

      await expect(buildWork({ societyIdentifiers: [identifier] })
        .save()).rejects.toThrow('Society Identifiers are required to be unique');
    });

    it('does not throw when societyIdentifiers has not been modified', async () => {
      const work = await buildWork({ societyIdentifiers: [{ society: 'PRS', identifier: 'PRS99999' }] }).save();
      work.title = randomString();
      await expect(work.save()).resolves.toBeDefined();
    });

    it('does not throw when no society identifier conflict exists', async () => {
      await expect(buildWork({ societyIdentifiers: [{ society: 'PRS', identifier: 'PRS00001' }] }).save()).resolves.toBeDefined();
    });
  });

  describe('preSaveValidation — identifier uniqueness', () => {
    it('throws when another work with the same identifier exists for the client', async () => {
      await buildWork({ identifier: 'MYID001' }).save();
      await expect(buildWork({ identifier: 'MYID001' }).save()).rejects.toThrow('Identifier is required to be unique');
    });

    it('does not throw when the identifier is unique within the client', async () => {
      await expect(buildWork({ identifier: 'UNIQUE001' }).save()).resolves.toBeDefined();
    });

    it('does not throw when identifier is not set', async () => {
      await expect(buildWork({ identifier: undefined }).save()).resolves.toBeDefined();
    });

    it('does not throw when _creationType is unmapped even if a duplicate identifier exists', async () => {
      await buildWork({ identifier: 'MYID001' }).save();
      const duplicate = buildWork({ identifier: 'MYID001' });
      duplicate._creationType = 'unmapped';
      await expect(duplicate.save()).resolves.toBeDefined();
    });

    it('does not throw on update when the only conflict is the work itself', async () => {
      const work = await buildWork({ identifier: 'MYID001' }).save();
      work.title = randomString();
      await expect(work.save()).resolves.toBeDefined();
    });

    it('does not throw when the same identifier exists for a different client', async () => {
      const otherClient = await new Client({
        name: randomString(),
        issueIdentifier: false,
        createdBigQueryTables: true,
        createdBigQueryBackups: true,
        clientType: 'Publisher',
      }).save();
      await new Work({ clientId: otherClient._id, title: randomString(), identifier: 'MYID001' }).save();
      await expect(buildWork({ identifier: 'MYID001' }).save()).resolves.toBeDefined();
    });

    it('does not throw when the conflicting work is in _excludeIdsForValidation', async () => {
      const existing = await buildWork({ identifier: 'MYID001' }).save();
      const duplicate = buildWork({ identifier: 'MYID001' });
      duplicate._excludeIdsForValidation = [existing._id];
      await expect(duplicate.save()).resolves.toBeDefined();
    });
  });

  describe('preSaveValidation — tunecode uniqueness', () => {
    it('throws when another work with the same tunecode exists for the client', async () => {
      await buildWork({ tunecode: 'TC123456' }).save();
      await expect(buildWork({ tunecode: 'TC123456' }).save()).rejects.toThrow('Tunecode is required to be unique');
    });

    it('does not throw when the tunecode is unique', async () => {
      await expect(buildWork({ tunecode: 'TC999999' }).save()).resolves.toBeDefined();
    });

    it('does not throw when tunecode is not set', async () => {
      await expect(buildWork({ tunecode: undefined }).save()).resolves.toBeDefined();
    });

    it('does not throw for the same tunecode on a different client', async () => {
      const otherClient = await new Client({
        name: randomString(),
        issueIdentifier: false,
        createdBigQueryTables: true,
        createdBigQueryBackups: true,
        clientType: 'Publisher',
      }).save();
      await new Work({ clientId: otherClient._id, title: randomString(), tunecode: 'TC123456' }).save();
      await expect(buildWork({ tunecode: 'TC123456' }).save()).resolves.toBeDefined();
    });

    it('does not throw on update when the only conflict is the work itself', async () => {
      const work = await buildWork({ tunecode: 'TC123456' }).save();
      work.title = randomString();
      await expect(work.save()).resolves.toBeDefined();
    });
  });

  describe('preSaveValidation — ISWC uniqueness', () => {
    it('throws when saving a work with an ISWC that already exists for the client', async () => {
      const iswc = 'T1234567890';
      await buildWork({ iswc }).save();
      await expect(buildWork({ iswc }).save()).rejects.toThrow('ISWC is required to be unique');
    });

    it('does not throw when the ISWC is unique', async () => {
      await expect(buildWork({ iswc: 'T9999999999' }).save()).resolves.toBeDefined();
    });

    it('does not throw when ISWC is not set', async () => {
      await expect(buildWork({ iswc: undefined }).save()).resolves.toBeDefined();
    });

    it('does not throw for the same ISWC on a different client', async () => {
      const otherClient = await new Client({
        name: randomString(),
        issueIdentifier: false,
        createdBigQueryTables: true,
        createdBigQueryBackups: true,
        clientType: 'Publisher',
      }).save();
      await new Work({ clientId: otherClient._id, title: randomString(), iswc: 'T1234567890' }).save();
      await expect(buildWork({ iswc: 'T1234567890' }).save()).resolves.toBeDefined();
    });

    it('does not throw on update when the only conflict is the work itself', async () => {
      const work = await buildWork({ iswc: 'T1234567890' }).save();
      work.title = randomString();
      await expect(work.save()).resolves.toBeDefined();
    });
  });

  describe('combineDuplicatePublishers', () => {
    const publisherId = testUtils.randomId().toString();

    function buildChainWithPublishers(children) {
      return buildWork({
        rightsChain: [{ territory: 'WW', children }],
      });
    }

    it('merges two publishers at the same chain level with the same publisherId', async () => {
      const publisher = { type: 'Publisher', publisherId, controlled: true, contractType: 'Original Publisher', mechanicalOwnership: 50, performanceOwnership: 50, mechanicalCollection: 0, performanceCollection: 0, children: [] };
      const work = await buildChainWithPublishers([publisher, { ...publisher }]).save();
      const saved = await Work.findById(work._id);
      expect(saved.rightsChain[0].children).toHaveLength(1);
    });

    it('preserves publishers with distinct publisherIds', async () => {
      const a = { type: 'Publisher', publisherId: testUtils.randomId().toString(), controlled: true, contractType: 'Original Publisher', mechanicalOwnership: 50, performanceOwnership: 50, mechanicalCollection: 0, performanceCollection: 0, children: [] };
      const b = { ...a, publisherId: testUtils.randomId().toString() };
      const work = await buildChainWithPublishers([a, b]).save();
      const saved = await Work.findById(work._id);
      expect(saved.rightsChain[0].children).toHaveLength(2);
    });
  });

  describe('forceControlledBoolean', () => {
    function buildChainWith(controlled) {
      return buildWork({
        rightsChain: [{
          territory: 'WW',
          children: [{ type: 'Publisher', publisherId: testUtils.randomId().toString(), controlled, contractType: 'Original Publisher', mechanicalOwnership: 100, performanceOwnership: 100, mechanicalCollection: 0, performanceCollection: 0, children: [] }],
        }],
      });
    }

    it('persists controlled as boolean true when set to boolean true', async () => {
      const work = await buildChainWith(true).save();
      const saved = await Work.findById(work._id);
      expect(saved.rightsChain[0].children[0].controlled).toBe(true);
      expect(typeof saved.rightsChain[0].children[0].controlled).toBe('boolean');
    });

    it('persists controlled as boolean true when set to string "true"', async () => {
      const work = await buildChainWith('true').save();
      const saved = await Work.findById(work._id);
      expect(saved.rightsChain[0].children[0].controlled).toBe(true);
      expect(typeof saved.rightsChain[0].children[0].controlled).toBe('boolean');
    });

    it('persists controlled as boolean true when set to string "1"', async () => {
      const work = await buildChainWith('1').save();
      const saved = await Work.findById(work._id);
      expect(saved.rightsChain[0].children[0].controlled).toBe(true);
      expect(typeof saved.rightsChain[0].children[0].controlled).toBe('boolean');
    });

    it('persists controlled as boolean false when set to boolean false', async () => {
      const work = await buildChainWith(false).save();
      const saved = await Work.findById(work._id);
      expect(saved.rightsChain[0].children[0].controlled).toBe(false);
      expect(typeof saved.rightsChain[0].children[0].controlled).toBe('boolean');
    });

    it('applies recursively to nested children', async () => {
      const work = await buildWork({
        rightsChain: [{
          territory: 'WW',
          children: [{
            type: 'Publisher',
            publisherId: testUtils.randomId().toString(),
            controlled: 'true',
            contractType: 'Original Publisher',
            mechanicalOwnership: 100,
            performanceOwnership: 100,
            mechanicalCollection: 0,
            performanceCollection: 0,
            children: [{ type: 'Composer', composerId: testUtils.randomId().toString(), controlled: 'true', contractType: 'Lyrics and Music', mechanicalOwnership: 100, performanceOwnership: 100, mechanicalCollection: 0, performanceCollection: 0, children: [] }],
          }],
        }],
      }).save();
      const saved = await Work.findById(work._id);
      const composer = saved.rightsChain[0].children[0].children[0];
      expect(composer.controlled).toBe(true);
      expect(typeof composer.controlled).toBe('boolean');
    });
  });

  describe('getComposerIDs', () => {
    it('populates usedComposerIds from composers in the rightsChain', async () => {
      const composerId = testUtils.randomId().toString();
      const work = await buildWork({
        rightsChain: [{
          territory: 'WW',
          children: [{
            type: 'Publisher',
            publisherId: testUtils.randomId().toString(),
            controlled: true,
            contractType: 'Original Publisher',
            mechanicalOwnership: 100,
            performanceOwnership: 100,
            mechanicalCollection: 0,
            performanceCollection: 0,
            children: [{ type: 'Composer', composerId, controlled: true, contractType: 'Lyrics and Music', mechanicalOwnership: 100, performanceOwnership: 100, mechanicalCollection: 0, performanceCollection: 0, children: [] }],
          }],
        }],
      }).save();
      const saved = await Work.findById(work._id);
      expect(saved.usedComposerIds).toContain(composerId);
    });

    it('populates usedPublisherIds from publishers in the rightsChain', async () => {
      const publisherId = testUtils.randomId().toString();
      const work = await buildWork({
        rightsChain: [{
          territory: 'WW',
          children: [{ type: 'Publisher', publisherId, controlled: true, contractType: 'Original Publisher', mechanicalOwnership: 100, performanceOwnership: 100, mechanicalCollection: 0, performanceCollection: 0, children: [] }],
        }],
      }).save();
      const saved = await Work.findById(work._id);
      expect(saved.usedPublisherIds).toContain(publisherId);
    });

    it('deduplicates the same ID appearing in multiple chains', async () => {
      const composerId = testUtils.randomId().toString();
      const composerEntry = { type: 'Composer', composerId, controlled: true, contractType: 'Lyrics and Music', mechanicalOwnership: 50, performanceOwnership: 50, mechanicalCollection: 0, performanceCollection: 0, children: [] };
      const publisherEntry = (id) => ({ type: 'Publisher', publisherId: id, controlled: true, contractType: 'Original Publisher', mechanicalOwnership: 100, performanceOwnership: 100, mechanicalCollection: 0, performanceCollection: 0, children: [composerEntry] });
      const work = await buildWork({
        rightsChain: [
          { territory: 'WW', children: [{ ...publisherEntry(testUtils.randomId().toString()) }] },
          { territory: 'specific', territoryCodes: { codes: ['GB'], name: 'GB' }, children: [{ ...publisherEntry(testUtils.randomId().toString()) }] },
        ],
      }).save();
      const saved = await Work.findById(work._id);
      const composerCount = saved.usedComposerIds.filter((id) => id === composerId).length;
      expect(composerCount).toBe(1);
    });

    it('handles an empty rightsChain', async () => {
      const work = await buildWork({ rightsChain: [] }).save();
      const saved = await Work.findById(work._id);
      expect(saved.usedComposerIds).toHaveLength(0);
      expect(saved.usedPublisherIds).toHaveLength(0);
    });
  });

  describe('calculateTotalCollection', () => {
    function buildChainWithControlledComposer(composerId, mechanicalCollection, performanceCollection) {
      return [{
        territory: 'WW',
        children: [{
          type: 'Publisher',
          publisherId: testUtils.randomId().toString(),
          controlled: true,
          contractType: 'Original Publisher',
          mechanicalOwnership: 100,
          performanceOwnership: 100,
          mechanicalCollection: 0,
          performanceCollection: 0,
          children: [{
            type: 'Composer',
            composerId,
            controlled: true,
            contractType: 'Lyrics and Music',
            mechanicalOwnership: 100,
            performanceOwnership: 100,
            mechanicalCollection,
            performanceCollection,
            children: [],
          }],
        }],
      }];
    }

    it('sets totalOwnedMechanical from mechanicalCollection of controlled children', async () => {
      const composerId = testUtils.randomId().toString();
      const work = await buildWork({ rightsChain: buildChainWithControlledComposer(composerId, 75, 50) }).save();
      const saved = await Work.findById(work._id);
      expect(saved.totalCollection.totalOwnedMechanical).toBe(75);
    });

    it('sets totalOwnedPerformance from performanceCollection of controlled children', async () => {
      const composerId = testUtils.randomId().toString();
      const work = await buildWork({ rightsChain: buildChainWithControlledComposer(composerId, 50, 60) }).save();
      const saved = await Work.findById(work._id);
      expect(saved.totalCollection.totalOwnedPerformance).toBe(60);
    });

    it('leaves totals at 0 when there are no controlled children', async () => {
      const work = await buildWork({
        rightsChain: [{
          territory: 'WW',
          children: [{
            type: 'Publisher',
            publisherId: testUtils.randomId().toString(),
            controlled: false,
            contractType: 'Original Publisher',
            mechanicalOwnership: 100,
            performanceOwnership: 100,
            mechanicalCollection: 0,
            performanceCollection: 0,
            children: [],
          }],
        }],
      }).save();
      const saved = await Work.findById(work._id);
      expect(saved.totalCollection.totalOwnedMechanical).toBe(0);
      expect(saved.totalCollection.totalOwnedPerformance).toBe(0);
    });

    it('leaves totals at 0 for an empty rightsChain', async () => {
      const work = await buildWork({ rightsChain: [] }).save();
      const saved = await Work.findById(work._id);
      expect(saved.totalCollection.totalOwnedMechanical).toBe(0);
      expect(saved.totalCollection.totalOwnedPerformance).toBe(0);
    });
  });

  describe('issuePartyNo', () => {
    it('assigns partyNo of 1 when no other works exist for the client', async () => {
      const work = await buildWork().save();
      const saved = await Work.findById(work._id);
      expect(saved.partyNo).toBe(1);
    });

    it('assigns the next sequential partyNo when other works already exist for the client', async () => {
      const first = await buildWork().save();
      const firstPartyNo = (await Work.findById(first._id)).partyNo;

      const second = await buildWork().save();
      const secondPartyNo = (await Work.findById(second._id)).partyNo;

      expect(secondPartyNo).toBe(firstPartyNo + 1);
    });

    it('keeps existing partyNo when it is already unique across the client', async () => {
      const work = await buildWork().save();
      const { partyNo } = await Work.findById(work._id);
      work.title = randomString();
      await work.save();
      const saved = await Work.findById(work._id);
      expect(saved.partyNo).toBe(partyNo);
    });
  });

  describe('issueIdentifier', () => {
    it('does not issue an identifier when client.issueIdentifier is false', async () => {
      const work = await buildWork().save();
      const saved = await Work.findById(work._id);
      expect(saved.identifier).toBeFalsy();
    });

    it('does not overwrite an existing identifier when issueIdentifier is true', async () => {
      client.issueIdentifier = true;
      await client.save();
      const work = await buildWork({ identifier: 'EXISTING001' }).save();
      const saved = await Work.findById(work._id);
      expect(saved.identifier).toBe('EXISTING001');
    });

    it('assigns identifier starting from 1 when no prior works exist', async () => {
      client.issueIdentifier = true;
      await client.save();
      const work = await buildWork().save();
      const saved = await Work.findById(work._id);
      expect(saved.identifier).toBe('1');
      expect(saved.identifierNo).toBe(1);
    });

    it('assigns the next sequential identifier when prior works exist', async () => {
      client.issueIdentifier = true;
      await client.save();
      await buildWork().save();
      const second = await buildWork().save();
      const saved = await Work.findById(second._id);
      expect(saved.identifierNo).toBe(2);
    });

    it('applies identifierStartFrom when it is greater than the current max', async () => {
      client.issueIdentifier = true;
      client.identifierStartFrom = 100;
      await client.save();
      const work = await buildWork().save();
      const saved = await Work.findById(work._id);
      expect(saved.identifierNo).toBe(100);
    });

    it('does not apply identifierStartFrom when current max exceeds it', async () => {
      client.issueIdentifier = true;
      client.identifierStartFrom = 1;
      await client.save();
      await buildWork().save();
      await buildWork().save();
      const third = await buildWork().save();
      const saved = await Work.findById(third._id);
      expect(saved.identifierNo).toBe(3);
    });

    it('prepends identifierPrefix to the identifier string', async () => {
      client.issueIdentifier = true;
      client.identifierPrefix = 'CRV';
      await client.save();
      const work = await buildWork().save();
      const saved = await Work.findById(work._id);
      expect(saved.identifier).toBe('CRV1');
    });

    it('issues an identifier for a work with _creationType unmapped even when it has one', async () => {
      client.issueIdentifier = true;
      await client.save();
      const work = buildWork({ identifier: 'EXISTING001' });
      work._creationType = 'unmapped';
      await work.save();
      const saved = await Work.findById(work._id);
      expect(saved.identifierNo).toBe(1);
    });

    it('assigns unique identifiers under concurrent saves', async () => {
      client.issueIdentifier = true;
      await client.save();
      const COUNT = 20;
      await Promise.all(Array.from({ length: COUNT }, () => buildWork().save()));
      const works = await Work.find({ clientId: client._id }, { identifier: 1, identifierNo: 1 }).lean();
      const identifiers = works.map((w) => w.identifier);
      const unique = new Set(identifiers);
      expect(unique.size).toBe(COUNT);
      const nos = works.map((w) => w.identifierNo).sort((a, b) => a - b);
      expect(nos).toEqual(Array.from({ length: COUNT }, (_, i) => i + 1));
    });

    it('assigns unique prefixed identifiers under concurrent saves', async () => {
      client.issueIdentifier = true;
      client.identifierPrefix = 'CRV';
      await client.save();
      const COUNT = 20;
      await Promise.all(Array.from({ length: COUNT }, () => buildWork().save()));
      const works = await Work.find({ clientId: client._id }, { identifier: 1 }).lean();
      const identifiers = works.map((w) => w.identifier);
      const unique = new Set(identifiers);
      expect(unique.size).toBe(COUNT);
      expect(identifiers.every((id) => id.startsWith('CRV'))).toBe(true);
    });

    it('assigns unique identifiers above identifierStartFrom under concurrent saves', async () => {
      client.issueIdentifier = true;
      client.identifierStartFrom = 100;
      await client.save();
      const COUNT = 20;
      await Promise.all(Array.from({ length: COUNT }, () => buildWork().save()));
      const works = await Work.find({ clientId: client._id }, { identifier: 1, identifierNo: 1 }).lean();
      const identifiers = works.map((w) => w.identifier);
      const unique = new Set(identifiers);
      expect(unique.size).toBe(COUNT);
      expect(works.every((w) => w.identifierNo >= 100)).toBe(true);
      const nos = works.map((w) => w.identifierNo).sort((a, b) => a - b);
      expect(nos).toEqual(Array.from({ length: COUNT }, (_, i) => i + 100));
    });

    it('assigns unique identifiers when a sequential import loop and a manual save run simultaneously', async () => {
      client.issueIdentifier = true;
      await client.save();
      const IMPORT_COUNT = 10;

      // Simulate a sequential import loop (eachSeries) and a manual FE save firing at the same time
      const importLoop = async () => {
        for (let i = 0; i < IMPORT_COUNT; i++) {
          // eslint-disable-next-line no-await-in-loop
          await buildWork().save();
        }
      };
      const manualSave = () => buildWork().save();

      await Promise.all([importLoop(), manualSave()]);

      const works = await Work.find({ clientId: client._id }, { identifier: 1, identifierNo: 1 }).lean();
      expect(works).toHaveLength(IMPORT_COUNT + 1);
      const identifiers = works.map((w) => w.identifier);
      const unique = new Set(identifiers);
      expect(unique.size).toBe(IMPORT_COUNT + 1);
    });
  });

  describe('roundRightsChainPercentages', () => {
    function buildChainWithPercentages(overrides) {
      return [{
        territory: 'WW',
        children: [{
          type: 'Publisher',
          publisherId: testUtils.randomId().toString(),
          controlled: true,
          contractType: 'Original Publisher',
          children: [],
          ...overrides,
        }],
      }];
    }

    it('rounds mechanicalOwnership to 2 decimal places', async () => {
      const work = await buildWork({ rightsChain: buildChainWithPercentages({ mechanicalOwnership: 33.33333, performanceOwnership: 100, mechanicalCollection: 0, performanceCollection: 0 }) }).save();
      const saved = await Work.findById(work._id);
      expect(saved.rightsChain[0].children[0].mechanicalOwnership).toBe(33.33);
    });

    it('rounds mechanicalCollection to 2 decimal places', async () => {
      const work = await buildWork({ rightsChain: buildChainWithPercentages({ mechanicalOwnership: 100, performanceOwnership: 100, mechanicalCollection: 66.66666, performanceCollection: 0 }) }).save();
      const saved = await Work.findById(work._id);
      expect(saved.rightsChain[0].children[0].mechanicalCollection).toBe(66.67);
    });

    it('rounds performanceOwnership to 2 decimal places', async () => {
      const work = await buildWork({ rightsChain: buildChainWithPercentages({ mechanicalOwnership: 100, performanceOwnership: 33.33333, mechanicalCollection: 0, performanceCollection: 0 }) }).save();
      const saved = await Work.findById(work._id);
      expect(saved.rightsChain[0].children[0].performanceOwnership).toBe(33.33);
    });

    it('rounds performanceCollection to 2 decimal places', async () => {
      const work = await buildWork({ rightsChain: buildChainWithPercentages({ mechanicalOwnership: 100, performanceOwnership: 100, mechanicalCollection: 0, performanceCollection: 66.66666 }) }).save();
      const saved = await Work.findById(work._id);
      expect(saved.rightsChain[0].children[0].performanceCollection).toBe(66.67);
    });

    it('applies rounding recursively to nested children', async () => {
      const work = await buildWork({
        rightsChain: [{
          territory: 'WW',
          children: [{
            type: 'Publisher',
            publisherId: testUtils.randomId().toString(),
            controlled: true,
            contractType: 'Original Publisher',
            mechanicalOwnership: 100,
            performanceOwnership: 100,
            mechanicalCollection: 0,
            performanceCollection: 0,
            children: [{
              type: 'Composer',
              composerId: testUtils.randomId().toString(),
              controlled: true,
              contractType: 'Lyrics and Music',
              mechanicalOwnership: 33.33333,
              performanceOwnership: 33.33333,
              mechanicalCollection: 0,
              performanceCollection: 0,
              children: [],
            }],
          }],
        }],
      }).save();
      const saved = await Work.findById(work._id);
      const composer = saved.rightsChain[0].children[0].children[0];
      expect(composer.mechanicalOwnership).toBe(33.33);
      expect(composer.performanceOwnership).toBe(33.33);
    });
  });

  describe('significantUpdateCheck', () => {
    function chainWith(publisherId) {
      return [{
        territory: 'WW',
        children: [{
          type: 'Publisher',
          publisherId,
          controlled: true,
          contractType: 'Original Publisher',
          mechanicalOwnership: 100,
          performanceOwnership: 100,
          mechanicalCollection: 0,
          performanceCollection: 0,
          children: [],
        }],
      }];
    }

    it('sets significantUpdateDate when the rights chain changes significantly on update', async () => {
      const work = await buildWork({ rightsChain: chainWith(testUtils.randomId().toString()) }).save();

      const found = await Work.findById(work._id);
      found.rightsChain[0].children[0].publisherId = testUtils.randomId().toString();
      found.markModified('rightsChain');
      await found.save();

      const saved = await Work.findById(work._id);
      expect(saved.significantUpdateDate).toBeDefined();
    });

    it('does not set significantUpdateDate when the rights chain is unchanged between saves', async () => {
      const publisherId = testUtils.randomId().toString();
      const work = await buildWork({ rightsChain: chainWith(publisherId) }).save();

      const found = await Work.findById(work._id);
      found.foreignId = randomString();
      await found.save();

      const saved = await Work.findById(work._id);
      expect(saved.significantUpdateDate).toEqual(work.significantUpdateDate);
    });

    it('sets significantUpdateDate on first save', async () => {
      const work = await buildWork().save();
      const saved = await Work.findById(work._id);
      expect(saved.significantUpdateDate).toBeTruthy();
    });
  });

  describe('significantUpdateToPartnerChains', () => {
    function partnerChainWith(deliveryPartnerId, publisherId) {
      return {
        deliveryPartnerId,
        rightsChain: [{
          territory: 'WW',
          children: [{
            type: 'Publisher',
            publisherId,
            controlled: true,
            contractType: 'Original Publisher',
            mechanicalOwnership: 100,
            performanceOwnership: 100,
            mechanicalCollection: 0,
            performanceCollection: 0,
            children: [],
          }],
        }],
      };
    }

    it('pushes a new entry when a partner chain changes for the first time', async () => {
      const deliveryPartnerId = testUtils.randomId().toString();
      const work = await buildWork({
        partnerRightsChains: [partnerChainWith(deliveryPartnerId, testUtils.randomId().toString())],
      }).save();

      const found = await Work.findById(work._id);
      found.partnerRightsChains[0].rightsChain[0].children[0].publisherId = testUtils.randomId().toString();
      found.markModified('partnerRightsChains');
      await found.save();

      const saved = await Work.findById(work._id);
      expect(saved.significantUpdateToPartnerChains).toHaveLength(1);
      expect(saved.significantUpdateToPartnerChains[0].deliveryPartnerId.toString()).toBe(deliveryPartnerId);
    });

    it('updates the existing entry date rather than pushing a new one on repeated changes', async () => {
      const deliveryPartnerId = testUtils.randomId().toString();
      const work = await buildWork({
        partnerRightsChains: [partnerChainWith(deliveryPartnerId, testUtils.randomId().toString())],
      }).save();

      const found = await Work.findById(work._id);
      found.partnerRightsChains[0].rightsChain[0].children[0].publisherId = testUtils.randomId().toString();
      found.markModified('partnerRightsChains');
      await found.save();

      const found2 = await Work.findById(work._id);
      found2.partnerRightsChains[0].rightsChain[0].children[0].publisherId = testUtils.randomId().toString();
      found2.markModified('partnerRightsChains');
      await found2.save();

      const saved = await Work.findById(work._id);
      expect(saved.significantUpdateToPartnerChains).toHaveLength(1);
    });

    it('does not push an entry when the partner chain is unchanged between saves', async () => {
      const deliveryPartnerId = testUtils.randomId().toString();
      const work = await buildWork({
        partnerRightsChains: [partnerChainWith(deliveryPartnerId, testUtils.randomId().toString())],
      }).save();

      const found = await Work.findById(work._id);
      found.title = randomString();
      await found.save();

      const saved = await Work.findById(work._id);
      expect(saved.significantUpdateToPartnerChains).toHaveLength(0);
    });
  });

  describe('composersString', () => {
    function chainWithComposers(composerEntries) {
      return [{
        territory: 'WW',
        children: [{
          type: 'Publisher',
          publisherId: testUtils.randomId().toString(),
          controlled: true,
          contractType: 'Original Publisher',
          mechanicalOwnership: 100,
          performanceOwnership: 100,
          mechanicalCollection: 0,
          performanceCollection: 0,
          children: composerEntries,
        }],
      }];
    }

    function composerEntry(composerId) {
      return {
        type: 'Composer',
        composerId,
        controlled: true,
        contractType: 'Lyrics and Music',
        mechanicalOwnership: 100,
        performanceOwnership: 100,
        mechanicalCollection: 0,
        performanceCollection: 0,
        children: [],
      };
    }

    it('sets work.composer to the name of a single composer in the chain', async () => {
      const composer = await new Composer({ clientId: client._id, name: 'JOHN SMITH' }).save();
      const work = await buildWork({
        rightsChain: chainWithComposers([composerEntry(composer._id.toString())]),
      }).save();
      const saved = await Work.findById(work._id);
      expect(saved.composer).toBe('JOHN SMITH');
    });

    it('sets work.composer to a comma-joined string for multiple composers', async () => {
      const composer1 = await new Composer({ clientId: client._id, name: 'JOHN SMITH' }).save();
      const composer2 = await new Composer({ clientId: client._id, name: 'JANE DOE' }).save();
      const work = await buildWork({
        rightsChain: chainWithComposers([
          composerEntry(composer1._id.toString()),
          composerEntry(composer2._id.toString()),
        ]),
      }).save();
      const saved = await Work.findById(work._id);
      expect(saved.composer).toContain('JOHN SMITH');
      expect(saved.composer).toContain('JANE DOE');
    });

    it('deduplicates — the same composer in multiple chains appears only once', async () => {
      const composer = await new Composer({ clientId: client._id, name: 'JOHN SMITH' }).save();
      const entry = composerEntry(composer._id.toString());
      const publisherEntry = (id) => ({
        type: 'Publisher',
        publisherId: id,
        controlled: true,
        contractType: 'Original Publisher',
        mechanicalOwnership: 100,
        performanceOwnership: 100,
        mechanicalCollection: 0,
        performanceCollection: 0,
        children: [entry],
      });

      const work = await buildWork({
        rightsChain: [
          { territory: 'WW', children: [publisherEntry(testUtils.randomId().toString())] },
          { territory: 'specific', territoryCodes: { codes: ['GB'], name: 'GB' }, children: [publisherEntry(testUtils.randomId().toString())] },
        ],
      }).save();

      const saved = await Work.findById(work._id);
      const count = saved.composer.split(',').filter((n) => n.trim() === 'JOHN SMITH').length;
      expect(count).toBe(1);
    });

    it('does not set work.composer when rightsChain is empty', async () => {
      const work = await buildWork({ rightsChain: [] }).save();
      const saved = await Work.findById(work._id);
      expect(saved.composer).toBeFalsy();
    });

    it('does not set work.composer when the chain contains only Publisher nodes', async () => {
      const work = await buildWork({
        rightsChain: [{
          territory: 'WW',
          children: [{
            type: 'Publisher',
            publisherId: testUtils.randomId().toString(),
            controlled: true,
            contractType: 'Original Publisher',
            mechanicalOwnership: 100,
            performanceOwnership: 100,
            mechanicalCollection: 0,
            performanceCollection: 0,
            children: [],
          }],
        }],
      }).save();
      const saved = await Work.findById(work._id);
      expect(saved.composer).toBeFalsy();
    });
  });

  describe('addExtraChainData', () => {
    function chainWithComposerEntry(composerId) {
      return [{
        territory: 'WW',
        children: [{
          type: 'Publisher',
          publisherId: testUtils.randomId().toString(),
          controlled: true,
          contractType: 'Original Publisher',
          mechanicalOwnership: 100,
          performanceOwnership: 100,
          mechanicalCollection: 0,
          performanceCollection: 0,
          children: [{
            type: 'Composer',
            composerId,
            controlled: true,
            contractType: 'Lyrics and Music',
            mechanicalOwnership: 100,
            performanceOwnership: 100,
            mechanicalCollection: 0,
            performanceCollection: 0,
            children: [],
          }],
        }],
      }];
    }

    it('backfills caeNumber on the chain Composer entry from the Composer document', async () => {
      const composer = await new Composer({ clientId: client._id, name: 'JOHN SMITH', cae: '123456789' }).save();
      const work = await buildWork({ rightsChain: chainWithComposerEntry(composer._id.toString()) }).save();
      const saved = await Work.findById(work._id);
      expect(saved.rightsChain[0].children[0].children[0].caeNumber).toBe('123456789');
    });

    it('backfills name on the chain Composer entry from the Composer document', async () => {
      const composer = await new Composer({ clientId: client._id, name: 'JOHN SMITH', cae: '123456789' }).save();
      const work = await buildWork({ rightsChain: chainWithComposerEntry(composer._id.toString()) }).save();
      const saved = await Work.findById(work._id);
      expect(saved.rightsChain[0].children[0].children[0].name).toBe('JOHN SMITH');
    });

    it('updates the chain when a composer is added or changed', async () => {
      const composer1 = await new Composer({ clientId: client._id, name: 'ORIGINAL NAME' }).save();
      const work = await buildWork({ rightsChain: chainWithComposerEntry(composer1._id.toString()) }).save();

      composer1.name = 'UPDATED NAME';
      await composer1.save();
      const found = await Work.findById(work._id);
      await found.save();

      const saved = await Work.findById(work._id);
      expect(saved.rightsChain[0].children[0].children[0].name).toBe('UPDATED NAME');
    });

    it('no-ops when there are no Composer entries in the chain', async () => {
      const work = await buildWork({
        rightsChain: [{
          territory: 'WW',
          children: [{
            type: 'Publisher',
            publisherId: testUtils.randomId().toString(),
            controlled: true,
            contractType: 'Original Publisher',
            mechanicalOwnership: 100,
            performanceOwnership: 100,
            mechanicalCollection: 0,
            performanceCollection: 0,
            children: [],
          }],
        }],
      }).save();
      await expect(Work.findById(work._id)).resolves.not.toBeNull();
    });

    it('leaves the chain entry unchanged when the composerId is not found in the DB', async () => {
      const missingId = testUtils.randomId().toString();
      const work = await buildWork({ rightsChain: chainWithComposerEntry(missingId) }).save();
      const saved = await Work.findById(work._id);
      expect(saved.rightsChain[0].children[0].children[0].caeNumber).toBeFalsy();
    });
  });

  describe('validateSalesReturns', () => {
    it('throws when a salesReturnsRights entry is missing contractId', async () => {
      await expect(buildWork({ salesReturnsRights: [{ percentage: 50 }] }).save())
        .rejects.toThrow('A Contract needs to be linked to a Percentage');
    });

    it('throws when a salesReturnsRights entry is missing percentage', async () => {
      await expect(buildWork({ salesReturnsRights: [{ contractId: testUtils.randomId() }] }).save())
        .rejects.toThrow('A Contract needs to be linked to a Percentage');
    });

    it('does not throw when percentage is exactly 0', async () => {
      await expect(buildWork({ salesReturnsRights: [{ contractId: testUtils.randomId(), percentage: 0 }] }).save())
        .resolves.toBeDefined();
    });

    it('throws when a channelSpecificSalesReturnsRights entry is missing contractId', async () => {
      await expect(buildWork({ channelSpecificSalesReturnsRights: [{ percentage: 50 }] }).save())
        .rejects.toThrow('A Contract needs to be linked to a Percentage');
    });

    it('throws when a channelSpecificSalesReturnsRights entry is missing percentage', async () => {
      await expect(buildWork({ channelSpecificSalesReturnsRights: [{ contractId: testUtils.randomId() }] }).save())
        .rejects.toThrow('A Contract needs to be linked to a Percentage');
    });

    it('does not throw when all salesReturnsRights entries are valid', async () => {
      await expect(buildWork({ salesReturnsRights: [{ contractId: testUtils.randomId(), percentage: 50 }] }).save())
        .resolves.toBeDefined();
    });
  });

  describe('checkMultipleContracts', () => {
    it('throws when salesReturnsRights has two entries with the same contractId', async () => {
      const contractId = testUtils.randomId();
      await expect(buildWork({
        salesReturnsRights: [
          { contractId, percentage: 25 },
          { contractId, percentage: 25 },
        ],
      }).save()).rejects.toThrow('A work can only have one instance of a contract');
    });

    it('throws when costsRights has two entries with the same contractId', async () => {
      const contractId = testUtils.randomId();
      await expect(buildWork({
        costsRights: [
          { contractId, percentage: 25 },
          { contractId, percentage: 25 },
        ],
      }).save()).rejects.toThrow('A work can only have one instance of a contract');
    });

    it('does not throw when all salesReturnsRights entries have distinct contractIds', async () => {
      await expect(buildWork({
        salesReturnsRights: [
          { contractId: testUtils.randomId(), percentage: 25 },
          { contractId: testUtils.randomId(), percentage: 25 },
        ],
      }).save()).resolves.toBeDefined();
    });
  });

  describe('checkOtherClientCatalogue', () => {
    let otherClient;

    beforeEach(async () => {
      otherClient = await new Client({
        name: randomString(),
        issueIdentifier: false,
        createdBigQueryTables: true,
        createdBigQueryBackups: true,
        clientType: 'Publisher',
      }).save();
    });

    it('throws when the rights chain references a Publisher from a different client', async () => {
      const foreignPublisher = await new Publisher({ clientId: otherClient._id, name: randomString() }).save();
      await expect(buildWork({
        rightsChain: [{
          territory: 'WW',
          children: [{
            type: 'Publisher',
            publisherId: foreignPublisher._id.toString(),
            controlled: true,
            contractType: 'Original Publisher',
            mechanicalOwnership: 100,
            performanceOwnership: 100,
            mechanicalCollection: 0,
            performanceCollection: 0,
            children: [],
          }],
        }],
      }).save()).rejects.toThrow('A work appears to include publisher from another Client');
    });

    it('throws when the rights chain references a Composer from a different client', async () => {
      const ownPublisher = await new Publisher({ clientId: client._id, name: randomString() }).save();
      const foreignComposer = await new Composer({ clientId: otherClient._id, name: randomString() }).save();
      await expect(buildWork({
        rightsChain: [{
          territory: 'WW',
          children: [{
            type: 'Publisher',
            publisherId: ownPublisher._id.toString(),
            controlled: true,
            contractType: 'Original Publisher',
            mechanicalOwnership: 100,
            performanceOwnership: 100,
            mechanicalCollection: 0,
            performanceCollection: 0,
            children: [{
              type: 'Composer',
              composerId: foreignComposer._id.toString(),
              controlled: true,
              contractType: 'Lyrics and Music',
              mechanicalOwnership: 100,
              performanceOwnership: 100,
              mechanicalCollection: 0,
              performanceCollection: 0,
              children: [],
            }],
          }],
        }],
      }).save()).rejects.toThrow('A work appears to include composer from another Client');
    });

    it('throws when the rights chain uses a TerritoryGroup from a different client', async () => {
      const foreignGroup = await new TerritoryGroup({ clientId: otherClient._id, name: `TG${randomString()}` }).save();
      await expect(buildWork({
        rightsChain: [{
          territory: foreignGroup._id.toString(),
          children: [{
            type: 'Publisher',
            publisherId: testUtils.randomId().toString(),
            controlled: true,
            contractType: 'Original Publisher',
            mechanicalOwnership: 100,
            performanceOwnership: 100,
            mechanicalCollection: 0,
            performanceCollection: 0,
            children: [],
          }],
        }],
      }).save()).rejects.toThrow('A work appears to include territory groups from another Client');
    });

    it('does not throw when all publishers, composers, and territories belong to the same client', async () => {
      const ownPublisher = await new Publisher({ clientId: client._id, name: randomString() }).save();
      const ownComposer = await new Composer({ clientId: client._id, name: randomString() }).save();
      await expect(buildWork({
        rightsChain: [{
          territory: 'WW',
          children: [{
            type: 'Publisher',
            publisherId: ownPublisher._id.toString(),
            controlled: true,
            contractType: 'Original Publisher',
            mechanicalOwnership: 100,
            performanceOwnership: 100,
            mechanicalCollection: 0,
            performanceCollection: 0,
            children: [{
              type: 'Composer',
              composerId: ownComposer._id.toString(),
              controlled: true,
              contractType: 'Lyrics and Music',
              mechanicalOwnership: 100,
              performanceOwnership: 100,
              mechanicalCollection: 0,
              performanceCollection: 0,
              children: [],
            }],
          }],
        }],
      }).save()).resolves.toBeDefined();
    });
  });

  describe('checkValidationErrors / valid / approvalStatus', () => {
    it('sets valid to false and approvalStatus to Invalid when the work has no territories', async () => {
      const work = await buildWork({ territories: [] }).save();
      const saved = await Work.findById(work._id);
      expect(saved.valid).toBe(false);
      expect(saved.approvalStatus).toBe('Invalid');
      expect(saved.validationErrors.length).toBeGreaterThan(0);
    });

    it('sets valid to true and approvalStatus to Ready for Approval for a correctly structured work', async () => {
      const work = await buildValidWork().save();
      const saved = await Work.findById(work._id);
      expect(saved.valid).toBe(true);
      expect(saved.approvalStatus).toBe('Ready for Approval');
      expect(saved.validationErrors).toHaveLength(0);
    });

    it('throws when a previously approved work is saved with changes that make it invalid', async () => {
      const work = await buildValidWork({ approvedDate: new Date() }).save();
      const saved = await Work.findById(work._id);
      expect(saved.valid).toBe(true);
      expect(saved.approvedDate).toBeDefined();
      saved.territories = [];
      await expect(saved.save()).rejects.toThrow('These changes will invalidate the work');
    });

    it('does not throw when a non-approved invalid work becomes invalid again', async () => {
      const work = await buildWork({ territories: [] }).save();
      const saved = await Work.findById(work._id);
      expect(saved.valid).toBe(false);
      expect(saved.approvedDate).toBeFalsy();

      saved.title = randomString();
      await expect(saved.save()).resolves.toBeDefined();
    });

    it('runs validation checks and attaches errors when approvalStatus is Invalid', async () => {
      const work = await buildValidWork().save();
      const found = await Work.findById(work._id);
      found.rightsChain[0].children[0].children[0].performanceCollection = 1000;
      await found.save();
      const saved = await Work.findById(work._id);
      expect(saved.validationErrors).toBeDefined();
      expect(saved.validationErrors.length).toBeGreaterThan(0);
      expect(saved.validationErrors).toContain(`Default Chain: ${WorkRightsChainValidation.ErrorMessages.PerformanceCollectionNot100}`);
    });

    it('runs validation checks and attaches errors when approvalStatus is Approved', async () => {
      await client.save();
      const work = await buildValidWork().save();
      const found = await Work.findById(work._id);
      // Make the chain invalid — but auto-approved works would throw if valid→invalid.
      // Reset autoApproveWorks so this save doesn't throw the "invalidate" error.
      client.autoApproveWorks = false;
      await client.save();
      found.rightsChain[0].children[0].children[0].performanceCollection = 1000;
      found.markModified('rightsChain');
      await found.save();
      const saved = await Work.findById(work._id);
      expect(saved.validationErrors).toBeDefined();
      expect(saved.validationErrors.length).toBeGreaterThan(0);
    });

    it('runs validation checks and attaches errors when approvalStatus is Ready for Approval', async () => {
      const work = await buildValidWork().save();
      const found = await Work.findById(work._id);
      found.rightsChain[0].children[0].children[0].performanceCollection = 1000;
      found.markModified('rightsChain');
      await found.save();
      const saved = await Work.findById(work._id);
      expect(saved.validationErrors).toBeDefined();
      expect(saved.validationErrors.length).toBeGreaterThan(0);
      expect(saved.validationErrors).toContain(`Default Chain: ${WorkRightsChainValidation.ErrorMessages.PerformanceCollectionNot100}`);
    });
  });

  describe('auto-approve', () => {
    it('sets approvedDate and approvalStatus Approved when valid and client.autoApproveWorks is true', async () => {
      client.autoApproveWorks = true;
      await client.save();

      const work = await buildValidWork().save();
      const saved = await Work.findById(work._id);
      expect(saved.approvedDate).toBeDefined();
      expect(saved.approvalStatus).toBe('Approved');
    });

    it('does not set approvedDate when client.autoApproveWorks is false', async () => {
      const work = await buildValidWork().save();
      const saved = await Work.findById(work._id);
      expect(saved.approvedDate).toBeFalsy();
      expect(saved.approvalStatus).toBe('Ready for Approval');
    });

    it('does not set approvedDate when the work is invalid even if client.autoApproveWorks is true', async () => {
      client.autoApproveWorks = true;
      await client.save();

      const work = await buildWork({ territories: [] }).save();
      const saved = await Work.findById(work._id);
      expect(saved.approvedDate).toBeFalsy();
      expect(saved.approvalStatus).toBe('Invalid');
    });
  });

  describe('checkIswcEligibility', () => {
    function chainWithControlledComposer(composerId) {
      return [{
        territory: 'WW',
        children: [{
          type: 'Publisher',
          publisherId: testUtils.randomId().toString(),
          controlled: true,
          contractType: 'Original Publisher',
          mechanicalOwnership: 100,
          performanceOwnership: 100,
          mechanicalCollection: 0,
          performanceCollection: 0,
          children: [{
            type: 'Composer',
            composerId,
            controlled: true,
            contractType: 'Lyrics and Music',
            mechanicalOwnership: 100,
            performanceOwnership: 100,
            mechanicalCollection: 0,
            performanceCollection: 0,
            children: [],
          }],
        }],
      }];
    }

    it('sets isIswcIrsEligible false when the work already has an ISWC', async () => {
      const composer = await new Composer({ clientId: client._id, name: randomString(), cae: '123456789' }).save();
      const work = await buildWork({
        identifier: 'TEST001',
        iswc: 'T1234567890',
        rightsChain: chainWithControlledComposer(composer._id.toString()),
      }).save();
      expect((await Work.findById(work._id)).isIswcIrsEligible).toBe(false);
    });

    it('sets isIswcIrsEligible false when the work has no identifier', async () => {
      const composer = await new Composer({ clientId: client._id, name: randomString(), cae: '123456789' }).save();
      const work = await buildWork({
        rightsChain: chainWithControlledComposer(composer._id.toString()),
      }).save();
      expect((await Work.findById(work._id)).isIswcIrsEligible).toBe(false);
    });

    it('sets isIswcIrsEligible true when all controlled composers have a CAE', async () => {
      const composer = await new Composer({ clientId: client._id, name: randomString(), cae: '123456789' }).save();
      const work = await buildWork({
        identifier: 'TEST001',
        rightsChain: chainWithControlledComposer(composer._id.toString()),
      }).save();
      expect((await Work.findById(work._id)).isIswcIrsEligible).toBe(true);
    });

    it('sets isIswcIrsEligible false when a controlled composer is missing a CAE', async () => {
      const composer = await new Composer({ clientId: client._id, name: randomString() }).save();
      const work = await buildWork({
        identifier: 'TEST001',
        rightsChain: chainWithControlledComposer(composer._id.toString()),
      }).save();
      expect((await Work.findById(work._id)).isIswcIrsEligible).toBe(false);
    });

    it('sets isIswcIasEligible false when the work already has an ISWC', async () => {
      const composer = await new Composer({ clientId: client._id, name: randomString(), cae: '123456789' }).save();
      const work = await buildWork({
        identifier: 'TEST001',
        iswc: 'T1234567890',
        rightsChain: chainWithControlledComposer(composer._id.toString()),
      }).save();
      expect((await Work.findById(work._id)).isIswcIasEligible).toBe(false);
    });

    it('sets isIswcIasEligible true when all composers have a valid CAE', async () => {
      const composer = await new Composer({ clientId: client._id, name: randomString(), cae: '123456789' }).save();
      const work = await buildWork({
        identifier: 'TEST001',
        rightsChain: chainWithControlledComposer(composer._id.toString()),
      }).save();
      expect((await Work.findById(work._id)).isIswcIasEligible).toBe(true);
    });

    it('sets isIswcIasEligible false when any composer is missing a CAE', async () => {
      const composer = await new Composer({ clientId: client._id, name: randomString() }).save();
      const work = await buildWork({
        identifier: 'TEST001',
        rightsChain: chainWithControlledComposer(composer._id.toString()),
      }).save();
      expect((await Work.findById(work._id)).isIswcIasEligible).toBe(false);
    });
  });

  describe('setDeliveries', () => {
    it('sets deliveredTo to an empty array when no deliveries exist for the work', async () => {
      const work = await buildWork().save();
      const saved = await Work.findById(work._id);
      expect(saved.deliveredTo).toEqual([]);
    });

    it('populates deliveredTo from existing DeliveredWork documents on re-save', async () => {
      const work = await buildWork().save();
      const deliveryPartnerId = testUtils.randomId();

      await new DeliveredWork({
        clientId: client._id.toString(),
        workId: work._id,
        deliveryPartnerId,
      }).save();

      const found = await Work.findById(work._id);
      await found.save();

      const saved = await Work.findById(work._id);
      expect(saved.deliveredTo).toHaveLength(1);
      expect(saved.deliveredTo[0].deliveryPartnerId.toString()).toBe(deliveryPartnerId.toString());
    });

    it('reflects the current delivery state on every save', async () => {
      const work = await buildWork().save();

      const first = await Work.findById(work._id);
      expect(first.deliveredTo).toHaveLength(0);

      await new DeliveredWork({
        clientId: client._id.toString(),
        workId: work._id,
        deliveryPartnerId: testUtils.randomId(),
      }).save();

      const found = await Work.findById(work._id);
      await found.save();
      const second = await Work.findById(work._id);
      expect(second.deliveredTo).toHaveLength(1);
    });
  });
});

describe('save (post-save hook)', () => {
  describe('updateCopyToCatalogueClients', () => {
    let childClient;

    async function buildChildClient(inheritance = {}) {
      return new Client({
        name: randomString(),
        issueIdentifier: false,
        createdBigQueryTables: true,
        createdBigQueryBackups: true,
        clientType: 'Publisher',
        inheritCatalogueFrom: [{ clientId: client._id.toString(), transferWorks: true, ...inheritance }],
      }).save();
    }

    afterEach(async () => {
      if (childClient?._id) await testUtils.cleanUpAsync(childClient._id.toString());
      childClient = null;
    });

    describe('client filtering', () => {
      it('does not create a copy when no child clients inherit from the work\'s client', async () => {
        const work = await buildWork().save();
        const copies = await Work.find({ duplicatedFrom: work._id });
        expect(copies).toHaveLength(0);
      });

      it('does not create a copy when transferWorks is false', async () => {
        childClient = await buildChildClient({ transferWorks: false });
        const work = await buildWork().save();
        const copies = await Work.find({ clientId: childClient._id, duplicatedFrom: work._id });
        expect(copies).toHaveLength(0);
      });

      it('creates a copy in a child client when transferWorks is true', async () => {
        childClient = await buildChildClient();
        const work = await buildWork().save();
        const copy = await Work.findOne({ clientId: childClient._id, duplicatedFrom: work._id });
        expect(copy).not.toBeNull();
      });

      it('creates a copy when the work\'s catalogueGroups includes the child client\'s catalogueGroup', async () => {
        childClient = await buildChildClient({ catalogueGroup: 'Group A' });
        const work = await buildWork({ catalogueGroups: ['Group A'] }).save();
        const copy = await Work.findOne({ clientId: childClient._id, duplicatedFrom: work._id });
        expect(copy).not.toBeNull();
      });

      it('does not create a copy when the child client\'s catalogueGroup does not match the work', async () => {
        childClient = await buildChildClient({ catalogueGroup: 'Group B' });
        const work = await buildWork({ catalogueGroups: ['Group A'] }).save();
        const copy = await Work.findOne({ clientId: childClient._id, duplicatedFrom: work._id });
        expect(copy).toBeNull();
      });

      it('does not create a copy when the child client has a catalogueGroup filter but the work has none', async () => {
        childClient = await buildChildClient({ catalogueGroup: 'Group A' });
        const work = await buildWork({ catalogueGroups: [] }).save();
        const copy = await Work.findOne({ clientId: childClient._id, duplicatedFrom: work._id });
        expect(copy).toBeNull();
      });

      it('creates copies for multiple matching child clients', async () => {
        childClient = await buildChildClient();
        const secondChildClient = await buildChildClient();
        const work = await buildWork().save();
        const copies = await Work.find({ duplicatedFrom: work._id });
        expect(copies).toHaveLength(2);
        await testUtils.cleanUpAsync(secondChildClient._id.toString());
      });

      it('copies to a child client when only the second of its inheritCatalogueFrom entries matches', async () => {
        // Tests that the filter iterates ALL entries, not just the first
        childClient = await new Client({
          name: randomString(),
          issueIdentifier: false,
          createdBigQueryTables: true,
          createdBigQueryBackups: true,
          clientType: 'Publisher',
          inheritCatalogueFrom: [
            { clientId: client._id.toString(), transferWorks: true, catalogueGroup: 'Group A' },
            { clientId: client._id.toString(), transferWorks: true, catalogueGroup: 'Group B' },
          ],
        }).save();
        const work = await buildWork({ catalogueGroups: ['Group B'] }).save();
        const copy = await Work.findOne({ clientId: childClient._id, duplicatedFrom: work._id });
        expect(copy).not.toBeNull();
      });

      it('does not copy to a child client when none of its inheritCatalogueFrom entries match', async () => {
        childClient = await new Client({
          name: randomString(),
          issueIdentifier: false,
          createdBigQueryTables: true,
          createdBigQueryBackups: true,
          clientType: 'Publisher',
          inheritCatalogueFrom: [
            { clientId: client._id.toString(), transferWorks: true, catalogueGroup: 'Group A' },
            { clientId: client._id.toString(), transferWorks: true, catalogueGroup: 'Group B' },
          ],
        }).save();
        const work = await buildWork({ catalogueGroups: ['Group C'] }).save();
        const copy = await Work.findOne({ clientId: childClient._id, duplicatedFrom: work._id });
        expect(copy).toBeNull();
      });
    });

    describe('copy fidelity', () => {
      it('sets clientId on the copied work to the child client\'s ID', async () => {
        childClient = await buildChildClient();
        const work = await buildWork().save();
        const copy = await Work.findOne({ clientId: childClient._id, duplicatedFrom: work._id });
        expect(copy.clientId.toString()).toBe(childClient._id.toString());
      });

      it('sets duplicatedFrom on the copied work to the parent work\'s ID', async () => {
        childClient = await buildChildClient();
        const work = await buildWork().save();
        const copy = await Work.findOne({ clientId: childClient._id, duplicatedFrom: work._id });
        expect(copy.duplicatedFrom.toString()).toBe(work._id.toString());
      });

      it('copies the title to the child work', async () => {
        childClient = await buildChildClient();
        const work = await buildWork({ title: 'MY TEST TITLE' }).save();
        const copy = await Work.findOne({ clientId: childClient._id, duplicatedFrom: work._id });
        expect(copy.title).toBe('MY TEST TITLE');
      });

      it('copies iswc to the child work', async () => {
        childClient = await buildChildClient();
        const work = await buildWork({ iswc: 'T9999999990' }).save();
        const copy = await Work.findOne({ clientId: childClient._id, duplicatedFrom: work._id });
        expect(copy.iswc).toBe('T9999999990');
      });

      it('copies territories to the child work', async () => {
        childClient = await buildChildClient();
        const work = await buildWork({ territories: ['WW', 'GB'] }).save();
        const copy = await Work.findOne({ clientId: childClient._id, duplicatedFrom: work._id });
        expect(copy.territories).toEqual(expect.arrayContaining(['WW', 'GB']));
      });
    });

    describe('copyValues — accumulating fields', () => {
      // aliases and societyIdentifiers use an append-and-deduplicate pattern rather than a plain
      // overwrite. The pre-save hook handles final deduplication before saving.

      it('copies aliases from the parent work to the child work', async () => {
        childClient = await buildChildClient();
        const work = await buildWork({ aliases: ['ALIAS ONE', 'ALIAS TWO'] }).save();
        const copy = await Work.findOne({ clientId: childClient._id, duplicatedFrom: work._id });
        expect(copy.aliases).toEqual(expect.arrayContaining(['ALIAS ONE', 'ALIAS TWO']));
      });

      it('does not accumulate duplicate aliases on re-save', async () => {
        childClient = await buildChildClient();
        const work = await buildWork({ aliases: ['ALIAS ONE'] }).save();
        work.title = randomString();
        await work.save();
        const copy = await Work.findOne({ clientId: childClient._id, duplicatedFrom: work._id });
        const occurrences = copy.aliases.filter((a) => a === 'ALIAS ONE');
        expect(occurrences).toHaveLength(1);
      });

      it('copies societyIdentifiers from the parent work to the child work', async () => {
        childClient = await buildChildClient();
        const work = await buildWork({ societyIdentifiers: [{ society: 'PRS', identifier: 'PRS00001' }] }).save();
        const copy = await Work.findOne({ clientId: childClient._id, duplicatedFrom: work._id });
        expect(copy.societyIdentifiers).toHaveLength(1);
        expect(copy.societyIdentifiers[0].identifier).toBe('PRS00001');
      });

      it('does not accumulate duplicate societyIdentifiers on re-save', async () => {
        childClient = await buildChildClient();
        const work = await buildWork({ societyIdentifiers: [{ society: 'PRS', identifier: 'PRS00001' }] }).save();
        work.title = randomString();
        await work.save();
        const copy = await Work.findOne({ clientId: childClient._id, duplicatedFrom: work._id });
        const occurrences = copy.societyIdentifiers.filter((s) => s.identifier === 'PRS00001');
        expect(occurrences).toHaveLength(1);
      });
    });

    describe('idempotency', () => {
      it('updates the existing copy on re-save rather than creating a new one', async () => {
        childClient = await buildChildClient();
        const work = await buildWork().save();
        work.title = randomString();
        await work.save();
        const copies = await Work.find({ clientId: childClient._id, duplicatedFrom: work._id });
        expect(copies).toHaveLength(1);
      });

      it('reflects the updated title in the existing copy after re-save', async () => {
        childClient = await buildChildClient();
        const work = await buildWork().save();
        const newTitle = randomString();
        work.title = newTitle;
        await work.save();
        const copy = await Work.findOne({ clientId: childClient._id, duplicatedFrom: work._id });
        expect(copy.title).toBe(newTitle);
      });
    });

    describe('copyTracks', () => {
      it('copies tracks from the parent work to the child client', async () => {
        childClient = await buildChildClient();
        const track = await new Track({ clientId: client._id, title: 'Test Track', isrc: randomString() }).save();
        const work = await buildWork({ trackIds: [track._id.toString()] }).save();
        const copy = await Work.findOne({ clientId: childClient._id, duplicatedFrom: work._id });
        expect(copy.trackIds).toHaveLength(1);
        const copiedTrack = await Track.findOne({ clientId: childClient._id, duplicatedFrom: track._id });
        expect(copiedTrack).not.toBeNull();
      });

      it('does not create a duplicate track when an existing track in the child client matches by ISRC', async () => {
        childClient = await buildChildClient();
        const isrc = randomString();
        const track = await new Track({ clientId: client._id, title: 'Test Track', isrc }).save();
        const existingChildTrack = await new Track({ clientId: childClient._id, title: 'Existing Track', isrc }).save();
        await buildWork({ trackIds: [track._id.toString()] }).save();
        const childTracks = await Track.find({ clientId: childClient._id, isrc });
        expect(childTracks).toHaveLength(1);
        expect(childTracks[0]._id.toString()).toBe(existingChildTrack._id.toString());
      });

      it('does not create a duplicate track on re-save when the track was already copied (matched by duplicatedFrom)', async () => {
        childClient = await buildChildClient();
        const track = await new Track({ clientId: client._id, title: 'Test Track', isrc: randomString() }).save();
        const work = await buildWork({ trackIds: [track._id.toString()] }).save();
        work.title = randomString();
        await work.save();
        const copiedTracks = await Track.find({ clientId: childClient._id, duplicatedFrom: track._id });
        expect(copiedTracks).toHaveLength(1);
      });

      it('copies a track with no ISRC to the child client', async () => {
        childClient = await buildChildClient();
        const track = await new Track({ clientId: client._id, title: 'No ISRC Track' }).save();
        await buildWork({ trackIds: [track._id.toString()] }).save();
        const copiedTrack = await Track.findOne({ clientId: childClient._id, duplicatedFrom: track._id });
        expect(copiedTrack).not.toBeNull();
      });

      it('does not duplicate a no-ISRC track on re-save (matched by duplicatedFrom)', async () => {
        childClient = await buildChildClient();
        const track = await new Track({ clientId: client._id, title: 'No ISRC Track' }).save();
        const work = await buildWork({ trackIds: [track._id.toString()] }).save();
        work.title = randomString();
        await work.save();
        const copiedTracks = await Track.find({ clientId: childClient._id, duplicatedFrom: track._id });
        expect(copiedTracks).toHaveLength(1);
      });
    });

    describe('copyIpChain — publishers', () => {
      function buildChainWithPublisher(publisherId) {
        return [{
          territory: 'WW',
          children: [{
            type: 'Publisher',
            publisherId: publisherId.toString(),
            controlled: true,
            contractType: 'Original Publisher',
            mechanicalOwnership: 100,
            performanceOwnership: 100,
            mechanicalCollection: 0,
            performanceCollection: 0,
            children: [],
          }],
        }];
      }

      it('creates a new publisher in the child client', async () => {
        childClient = await buildChildClient();
        const publisher = await new Publisher({ clientId: client._id, name: randomString() }).save();
        await buildWork({ rightsChain: buildChainWithPublisher(publisher._id) }).save();
        const copiedPublisher = await Publisher.findOne({ clientId: childClient._id, duplicatedFrom: publisher._id });
        expect(copiedPublisher).not.toBeNull();
      });

      it('copies the publisher name to the child client', async () => {
        childClient = await buildChildClient();
        const publisherName = randomString();
        const publisher = await new Publisher({ clientId: client._id, name: publisherName }).save();
        await buildWork({ rightsChain: buildChainWithPublisher(publisher._id) }).save();
        const copiedPublisher = await Publisher.findOne({ clientId: childClient._id, duplicatedFrom: publisher._id });
        expect(copiedPublisher.name).toBe(publisherName);
      });

      it('does not duplicate the publisher in the child client on re-save (matched by duplicatedFrom)', async () => {
        childClient = await buildChildClient();
        const publisher = await new Publisher({ clientId: client._id, name: randomString() }).save();
        const work = await buildWork({ rightsChain: buildChainWithPublisher(publisher._id) }).save();
        work.title = randomString();
        await work.save();
        const copies = await Publisher.find({ clientId: childClient._id, duplicatedFrom: publisher._id });
        expect(copies).toHaveLength(1);
      });

      it('reuses an existing publisher in the child client matched by name when no duplicatedFrom exists', async () => {
        childClient = await buildChildClient();
        const publisherName = randomString();
        const publisher = await new Publisher({ clientId: client._id, name: publisherName }).save();
        const existingChildPublisher = await new Publisher({ clientId: childClient._id, name: publisherName }).save();
        await buildWork({ rightsChain: buildChainWithPublisher(publisher._id) }).save();
        const childPublishers = await Publisher.find({ clientId: childClient._id, name: publisherName });
        expect(childPublishers).toHaveLength(1);
        expect(childPublishers[0]._id.toString()).toBe(existingChildPublisher._id.toString());
      });

      it('maps the publisherId in the copied work\'s rightsChain to the child client\'s publisher ID', async () => {
        childClient = await buildChildClient();
        const publisher = await new Publisher({ clientId: client._id, name: randomString() }).save();
        const work = await buildWork({ rightsChain: buildChainWithPublisher(publisher._id) }).save();
        const copy = await Work.findOne({ clientId: childClient._id, duplicatedFrom: work._id });
        const childPublisher = await Publisher.findOne({ clientId: childClient._id, duplicatedFrom: publisher._id });
        expect(copy.rightsChain[0].children[0].publisherId.toString()).toBe(childPublisher._id.toString());
      });
    });

    describe('copyIpChain — composers', () => {
      function buildChainWithComposer(composerId) {
        return [{
          territory: 'WW',
          children: [{
            type: 'Composer',
            composerId: composerId.toString(),
            controlled: true,
            contractType: 'Lyrics and Music',
            mechanicalOwnership: 100,
            performanceOwnership: 100,
            mechanicalCollection: 0,
            performanceCollection: 0,
            children: [],
          }],
        }];
      }

      it('creates a new composer in the child client', async () => {
        childClient = await buildChildClient();
        const composer = await new Composer({ clientId: client._id, name: randomString() }).save();
        await buildWork({ rightsChain: buildChainWithComposer(composer._id) }).save();
        const copiedComposer = await Composer.findOne({ clientId: childClient._id, duplicatedFrom: composer._id });
        expect(copiedComposer).not.toBeNull();
      });

      it('does not duplicate the composer in the child client on re-save (matched by duplicatedFrom)', async () => {
        childClient = await buildChildClient();
        const composer = await new Composer({ clientId: client._id, name: randomString() }).save();
        const work = await buildWork({ rightsChain: buildChainWithComposer(composer._id) }).save();
        work.title = randomString();
        await work.save();
        const copies = await Composer.find({ clientId: childClient._id, duplicatedFrom: composer._id });
        expect(copies).toHaveLength(1);
      });

      it('reuses an existing composer in the child client matched by CAE', async () => {
        childClient = await buildChildClient();
        const cae = '12345678901';
        const composer = await new Composer({ clientId: client._id, name: randomString(), cae }).save();
        const existingChildComposer = await new Composer({ clientId: childClient._id, name: randomString(), cae }).save();
        await buildWork({ rightsChain: buildChainWithComposer(composer._id) }).save();
        const childComposers = await Composer.find({ clientId: childClient._id, cae });
        expect(childComposers).toHaveLength(1);
        expect(childComposers[0]._id.toString()).toBe(existingChildComposer._id.toString());
      });

      it('reuses an existing composer in the child client matched by name when CAE is absent', async () => {
        childClient = await buildChildClient();
        const composerName = randomString();
        const composer = await new Composer({ clientId: client._id, name: composerName }).save();
        const existingChildComposer = await new Composer({ clientId: childClient._id, name: composerName }).save();
        await buildWork({ rightsChain: buildChainWithComposer(composer._id) }).save();
        const childComposers = await Composer.find({ clientId: childClient._id, name: composerName });
        expect(childComposers).toHaveLength(1);
        expect(childComposers[0]._id.toString()).toBe(existingChildComposer._id.toString());
      });

      it('reuses an existing composer when the parent CAE has leading zeros and the child CAE does not', async () => {
        // Parent cae '00012345678' → caeWithoutLeadingZeros '12345678'
        // Child cae '12345678' (no leading zeros) — matched via { cae: originalComposer.caeWithoutLeadingZeros }
        childClient = await buildChildClient();
        const composer = await new Composer({ clientId: client._id, name: randomString(), cae: '00012345678' }).save();
        const existingChildComposer = await new Composer({ clientId: childClient._id, name: randomString(), cae: '12345678' }).save();
        await buildWork({ rightsChain: buildChainWithComposer(composer._id) }).save();
        const childComposers = await Composer.find({ clientId: childClient._id });
        expect(childComposers).toHaveLength(1);
        expect(childComposers[0]._id.toString()).toBe(existingChildComposer._id.toString());
      });

      it('reuses an existing composer when the parent CAE has no leading zeros and the child CAE does', async () => {
        // Parent cae '12345678' — child cae '00012345678' (padded)
        // Child's caeWithoutLeadingZeros field '12345678' is matched via { caeWithoutLeadingZeros }
        childClient = await buildChildClient();
        const composer = await new Composer({ clientId: client._id, name: randomString(), cae: '12345678' }).save();
        const existingChildComposer = await new Composer({ clientId: childClient._id, name: randomString(), cae: '00012345678' }).save();
        await buildWork({ rightsChain: buildChainWithComposer(composer._id) }).save();
        const childComposers = await Composer.find({ clientId: childClient._id });
        expect(childComposers).toHaveLength(1);
        expect(childComposers[0]._id.toString()).toBe(existingChildComposer._id.toString());
      });

      it('maps the composerId in the copied work\'s rightsChain to the child client\'s composer ID', async () => {
        childClient = await buildChildClient();
        const composer = await new Composer({ clientId: client._id, name: randomString() }).save();
        const work = await buildWork({ rightsChain: buildChainWithComposer(composer._id) }).save();
        const copy = await Work.findOne({ clientId: childClient._id, duplicatedFrom: work._id });
        const childComposer = await Composer.findOne({ clientId: childClient._id, duplicatedFrom: composer._id });
        expect(copy.rightsChain[0].children[0].composerId.toString()).toBe(childComposer._id.toString());
      });
    });

    describe('copyIpChain — nested publisher → composer chain', () => {
      function buildNestedChain(publisherId, composerId) {
        return [{
          territory: 'WW',
          children: [{
            type: 'Publisher',
            publisherId: publisherId.toString(),
            controlled: true,
            contractType: 'Original Publisher',
            mechanicalOwnership: 100,
            performanceOwnership: 50,
            mechanicalCollection: 0,
            performanceCollection: 0,
            children: [{
              type: 'Composer',
              composerId: composerId.toString(),
              controlled: true,
              contractType: 'Lyrics and Music',
              mechanicalOwnership: 0,
              performanceOwnership: 50,
              mechanicalCollection: 0,
              performanceCollection: 0,
              children: [],
            }],
          }],
        }];
      }

      it('copies both the publisher and its nested composer to the child client', async () => {
        childClient = await buildChildClient();
        const publisher = await new Publisher({ clientId: client._id, name: randomString() }).save();
        const composer = await new Composer({ clientId: client._id, name: randomString() }).save();
        await buildWork({ rightsChain: buildNestedChain(publisher._id, composer._id) }).save();
        const childPublisher = await Publisher.findOne({ clientId: childClient._id, duplicatedFrom: publisher._id });
        const childComposer = await Composer.findOne({ clientId: childClient._id, duplicatedFrom: composer._id });
        expect(childPublisher).not.toBeNull();
        expect(childComposer).not.toBeNull();
      });

      it('maps both the publisherId and composerId in the copied work\'s rightsChain to the child client\'s IDs', async () => {
        childClient = await buildChildClient();
        const publisher = await new Publisher({ clientId: client._id, name: randomString() }).save();
        const composer = await new Composer({ clientId: client._id, name: randomString() }).save();
        const work = await buildWork({ rightsChain: buildNestedChain(publisher._id, composer._id) }).save();
        const copy = await Work.findOne({ clientId: childClient._id, duplicatedFrom: work._id });
        const childPublisher = await Publisher.findOne({ clientId: childClient._id, duplicatedFrom: publisher._id });
        const childComposer = await Composer.findOne({ clientId: childClient._id, duplicatedFrom: composer._id });
        const chainPublisher = copy.rightsChain[0].children[0];
        const chainComposer = chainPublisher.children[0];
        expect(chainPublisher.publisherId.toString()).toBe(childPublisher._id.toString());
        expect(chainComposer.composerId.toString()).toBe(childComposer._id.toString());
      });
    });

    describe('copyIpChain — territory groups', () => {
      // Builds a rights chain entry with a territory and one publisher child so it passes pre-save
      // chain validation (a chain entry with no children is rejected as empty)
      function buildChainWithTerritory(territory, publisherId) {
        return [{
          territory,
          children: [{
            type: 'Publisher',
            publisherId: publisherId.toString(),
            controlled: true,
            contractType: 'Original Publisher',
            mechanicalOwnership: 100,
            performanceOwnership: 100,
            mechanicalCollection: 0,
            performanceCollection: 0,
            children: [],
          }],
        }];
      }

      it('copies a TerritoryGroup to the child client when the chain territory is a TerritoryGroup ID', async () => {
        childClient = await buildChildClient();
        const publisher = await new Publisher({ clientId: client._id, name: randomString() }).save();
        const territoryGroup = await new TerritoryGroup({
          clientId: client._id,
          name: randomString(),
          territories: ['GB', 'IE'],
        }).save();
        const work = await buildWork({
          rightsChain: buildChainWithTerritory(territoryGroup._id.toString(), publisher._id),
        }).save();
        const copy = await Work.findOne({ clientId: childClient._id, duplicatedFrom: work._id });
        const copiedGroup = await TerritoryGroup.findOne({ clientId: childClient._id, name: territoryGroup.name });
        expect(copiedGroup).not.toBeNull();
        expect(copy.rightsChain[0].territory).toBe(copiedGroup._id.toString());
      });

      it('reuses an existing TerritoryGroup in the child client with the same name (no duplicate created)', async () => {
        childClient = await buildChildClient();
        const publisher = await new Publisher({ clientId: client._id, name: randomString() }).save();
        const groupName = randomString();
        const territoryGroup = await new TerritoryGroup({ clientId: client._id, name: groupName, territories: ['GB'] }).save();
        const existingChildGroup = await new TerritoryGroup({ clientId: childClient._id, name: groupName, territories: ['GB'] }).save();
        await buildWork({
          rightsChain: buildChainWithTerritory(territoryGroup._id.toString(), publisher._id),
        }).save();
        const childGroups = await TerritoryGroup.find({ clientId: childClient._id, name: groupName });
        expect(childGroups).toHaveLength(1);
        expect(childGroups[0]._id.toString()).toBe(existingChildGroup._id.toString());
      });
    });

    describe('error handling', () => {
      it('records a validationError on the parent work when saving the copied work fails', async () => {
        childClient = await buildChildClient();
        const sharedIswc = 'T0000000001';
        // Pre-create a work in the child client with the same ISWC so the copy will fail on uniqueness
        await new Work({ clientId: childClient._id, title: randomString(), iswc: sharedIswc }).save();
        // territories: ['WW'] avoids the pre-save territory validation error so that the only
        // validationError recorded is the one from the failed sync to the child client
        const parentWork = await buildWork({ iswc: sharedIswc, territories: ['WW'] }).save();
        const saved = await Work.findById(parentWork._id);
        const hasSyncError = saved.validationErrors.some((e) => e.includes('Failed syncing to'));
        expect(hasSyncError).toBe(true);
      });
    });
  });
});

describe('getComposer — indexed CAE deduplication with dummy IPIs', () => {
  const getComposer = Work._getComposer;

  function buildIndexedComposer(overrides = {}) {
    const firstName = randomString();
    const surname = randomString();
    const name = `${firstName} ${surname}`;
    const composerId = testUtils.randomId();
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

  it('should not collapse two different dummy-IPI composers into one when neither exists in the DB', (done) => {
    const { key, entry } = buildIndexedComposer();
    const indexed = { [key]: entry };

    const otherFirstName = randomString();
    const otherSurname = randomString();
    const otherName = `${otherFirstName} ${otherSurname}`;

    getComposer(client._id.toString(), otherName, otherFirstName, null, otherSurname, '00000000000', false, indexed, (err, composer) => {
      expect(err).toBeNull();
      expect(composer).toBeDefined();
      expect(composer.name).toBe(otherName);
      expect(composer.name).not.toBe(entry.name);
      expect(composer.saveLater).toBe(true);
      done();
    });
  });

  it('should not return an existing dummy-IPI composer from the DB when the name does not match', async () => {
    const existingComposer = await new Composer({
      clientId: client._id,
      name: randomString(),
      cae: '00000000000',
    }).save();

    const differentName = randomString();

    await new Promise((resolve) => {
      getComposer(client._id.toString(), differentName, differentName, null, differentName, '00000000000', false, {}, (err, composer) => {
        expect(composer).toBeDefined();
        expect(composer.name).toBe(differentName);
        expect(composer._id.toString()).not.toBe(existingComposer._id.toString());
        expect(composer.saveLater).toBe(true);
        resolve();
      });
    });
  });

  it('should return an existing dummy-IPI composer from the DB when the name matches', async () => {
    const existingComposer = await new Composer({
      clientId: client._id,
      name: randomString(),
      cae: '00000000000',
    }).save();

    await new Promise((resolve) => {
      getComposer(client._id.toString(), existingComposer.name, null, null, null, '00000000000', false, {}, (err, composer) => {
        expect(composer).toBeDefined();
        expect(composer._id.toString()).toBe(existingComposer._id.toString());
        resolve();
      });
    });
  });
});

describe('when exporting a work to excel format', () => {
  let work1;

  beforeEach(async () => {
    work1 = await new Work({
      clientId: client._id.toString(),
      _id: testUtils.randomId(),
      title: randomString(),
      rightsChain: [{
        territory: 'WW',
        children: [{
          type: 'Publisher',
          name: 'CLOUD 9 HOLLAND MUSIC PUBLISHING',
          caeNumber: '466551142',
          controlled: true,
          mechanicalOwnership: 0,
          mechanicalCollection: 100,
          performanceOwnership: 0,
          performanceCollection: 50,
          contractType: 'Sub Publisher',
          publisherId: '64b00e3b747e8f5dd996ab59',
          children: [{
            type: 'Publisher',
            name: 'SONGS OF POCI',
            caeNumber: '606032982',
            controlled: true,
            mechanicalOwnership: 100,
            mechanicalCollection: 0,
            performanceOwnership: 50,
            performanceCollection: 0,
            contractType: 'Original Publisher',
            publisherId: '64b00e3b747e8f5dd996ab61',
            children: [{
              type: 'Composer',
              name: 'JEROME SEBASTIEN PHILIPPE ZAMPINI',
              caeNumber: '621257377',
              controlled: true,
              mechanicalOwnership: 0,
              mechanicalCollection: 0,
              performanceOwnership: 50,
              performanceCollection: 50,
              contractType: 'Lyrics and Music',
              composerId: '64e46807c4f3c1ad4ebac12e',
              cae: '00000000123',
              children: [],
            }],
          }],
        }],
        totalMechanicalOwnership: 100,
        totalPerformanceOwnership: 100,
        totalMechanicalCollection: 100,
        totalPerformanceCollection: 100,
      }],
    }).save();

    jest.spyOn(createXlsx, 'createInTemplate').mockImplementation((data, template, cb) => cb());
  });

  it('should convert the territory list to WW when all world territories are selected', async () => {
    work1.territories = TerritoryHelper.allTerritories;
    await work1.save();
    await new Promise((resolve) => {
      Work.createExportXlsx({ _id: [work1._id] }, client._id.toString(), () => {
        const [exportedWork] = createXlsx.createInTemplate.mock.calls[0][0][0];
        expect(exportedWork[22]).toEqual('WW');
        resolve();
      });
    });
  });

  it('should convert the territory list to excel list format when a subset of territories is selected', async () => {
    work1.territories = ['GB', 'NL', 'SE', 'DK'];
    await work1.save();
    await new Promise((resolve) => {
      Work.createExportXlsx({ _id: [work1._id] }, client._id.toString(), () => {
        const [exportedWork] = createXlsx.createInTemplate.mock.calls[0][0][0];
        expect(exportedWork[22]).toEqual('GB;NL;SE;DK');
        resolve();
      });
    });
  });

  describe('publisher fingerprint generation', () => {
    const publisherIdA = '55385e170ecdf654de36fb24';
    const publisherIdB = '68385e170ecdf654de36fb24';

    it('should generate a publisher fingerprint on save when publisher mapping is enabled', async () => {
      work1.enablePublisherMapping = true;
      work1.channelSpecificSalesReturnsRights = [{
        contractId: testUtils.randomId(),
        percentage: 50,
        publishers: [publisherIdB, publisherIdA],
      }];

      await work1.save();

      const savedWork = await Work.findById(work1._id);
      expect(savedWork.channelSpecificSalesReturnsRights[0].publisherFingerprint)
        .toBe(`${publisherIdA}:${publisherIdB}`);
    });

    it('should produce the same fingerprint regardless of publisher order', async () => {
      work1.enablePublisherMapping = true;
      work1.channelSpecificSalesReturnsRights = [
        {
          contractId: testUtils.randomId(),
          percentage: 50,
          publishers: [publisherIdA, publisherIdB],
        },
        {
          contractId: testUtils.randomId(),
          percentage: 50,
          publishers: [publisherIdB, publisherIdA],
        },
      ];

      await work1.save();

      const savedWork = await Work.findById(work1._id);
      expect(savedWork.channelSpecificSalesReturnsRights[0].publisherFingerprint)
        .toBe(savedWork.channelSpecificSalesReturnsRights[1].publisherFingerprint);
    });

    it('should clear the fingerprint when publisher mapping is disabled', async () => {
      work1.enablePublisherMapping = true;
      work1.channelSpecificSalesReturnsRights = [{
        contractId: testUtils.randomId(),
        percentage: 50,
        publishers: [publisherIdA],
      }];
      await work1.save();

      work1.enablePublisherMapping = false;
      await work1.save();

      const savedWork = await Work.findById(work1._id);
      expect(savedWork.channelSpecificSalesReturnsRights[0].publisherFingerprint).toBe('');
    });

    it('should allow save when publisher mapping is enabled but no publishers are selected', async () => {
      work1.enablePublisherMapping = true;
      work1.channelSpecificSalesReturnsRights = [{
        contractId: testUtils.randomId(),
        percentage: 50,
        publishers: [],
      }];

      await work1.save();

      const savedWork = await Work.findById(work1._id);
      expect(savedWork.channelSpecificSalesReturnsRights[0].publishers).toHaveLength(0);
      expect(savedWork.channelSpecificSalesReturnsRights[0].publisherFingerprint).toBeFalsy();
    });

    it('should update the fingerprint when publishers are changed', async () => {
      work1.enablePublisherMapping = true;
      work1.channelSpecificSalesReturnsRights = [{
        contractId: testUtils.randomId(),
        percentage: 50,
        publishers: [publisherIdA],
      }];
      await work1.save();

      const savedWork = await Work.findById(work1._id);
      const originalFingerprint = savedWork.channelSpecificSalesReturnsRights[0].publisherFingerprint;

      work1.channelSpecificSalesReturnsRights[0].publishers = [publisherIdA, publisherIdB];
      await work1.save();

      const updatedWork = await Work.findById(work1._id);
      expect(updatedWork.channelSpecificSalesReturnsRights[0].publisherFingerprint)
        .not.toBe(originalFingerprint);
      expect(updatedWork.channelSpecificSalesReturnsRights[0].publisherFingerprint)
        .toBe(`${publisherIdA}:${publisherIdB}`);
    });

    it('should reject save when duplicate publishers are detected', async () => {
      work1.enablePublisherMapping = true;
      work1.channelSpecificSalesReturnsRights = [{
        contractId: testUtils.randomId(),
        percentage: 50,
        publishers: [publisherIdA, publisherIdA],
      }];

      await expect(work1.save()).rejects.toThrow(
        'Duplicate Publishers detected',
      );
    });

    it('should remove empty and null publisher entries on save', async () => {
      work1.enablePublisherMapping = true;
      work1.channelSpecificSalesReturnsRights = [{
        contractId: testUtils.randomId(),
        percentage: 50,
        publishers: [publisherIdA, null, '', publisherIdB, '   '],
      }];

      await work1.save();

      const savedWork = await Work.findById(work1._id);
      expect(savedWork.channelSpecificSalesReturnsRights[0].publishers).toHaveLength(2);
      expect(savedWork.channelSpecificSalesReturnsRights[0].publishers.map(String))
        .toEqual([publisherIdA, publisherIdB]);
    });

    it('should allow save when all publishers are empty and mapping is enabled', async () => {
      work1.enablePublisherMapping = true;
      work1.channelSpecificSalesReturnsRights = [{
        contractId: testUtils.randomId(),
        percentage: 50,
        publishers: [null, '', '   '],
      }];

      await work1.save();

      const savedWork = await Work.findById(work1._id);
      expect(savedWork.channelSpecificSalesReturnsRights[0].publishers).toHaveLength(0);
    });

    it('should clear stale fingerprint when mapping is enabled but publishers are removed', async () => {
      work1.enablePublisherMapping = true;
      work1.channelSpecificSalesReturnsRights = [{
        contractId: testUtils.randomId(),
        percentage: 50,
        publishers: [publisherIdA, publisherIdB],
      }];
      await work1.save();

      const savedWork = await Work.findById(work1._id);
      expect(savedWork.channelSpecificSalesReturnsRights[0].publisherFingerprint)
        .toBe(`${publisherIdA}:${publisherIdB}`);

      work1.channelSpecificSalesReturnsRights[0].publishers = [];
      await work1.save();

      const updatedWork = await Work.findById(work1._id);
      expect(updatedWork.channelSpecificSalesReturnsRights[0].publisherFingerprint).toBe('');
      expect(updatedWork.channelSpecificSalesReturnsRights[0].publishers).toHaveLength(0);
    });

    it('should retain publishers in data when mapping is disabled', async () => {
      work1.enablePublisherMapping = true;
      work1.channelSpecificSalesReturnsRights = [{
        contractId: testUtils.randomId(),
        percentage: 50,
        publishers: [publisherIdA, publisherIdB],
      }];
      await work1.save();

      work1.enablePublisherMapping = false;
      await work1.save();

      const savedWork = await Work.findById(work1._id);
      expect(savedWork.channelSpecificSalesReturnsRights[0].publishers.map(String))
        .toEqual([publisherIdA, publisherIdB]);
      expect(savedWork.channelSpecificSalesReturnsRights[0].publisherFingerprint).toBe('');
    });
  });

  describe('addSpecificRights — publisher resolution', () => {
    let contract;
    let publisherA;
    let publisherB;

    beforeEach(async () => {
      contract = await new Contract({ clientId: client._id, name: randomString() }).save();
      publisherA = await new Publisher({ clientId: client._id, name: randomString() }).save();
      publisherB = await new Publisher({ clientId: client._id, name: randomString() }).save();
    });

    function buildIndexedRights(work, rows) {
      return {
        [`_id_${work._id}`]: rows.map((row, i) => ({
          _id: work._id.toString(),
          title: work.title,
          identifier: work.identifier,
          tunecode: null,
          contractName: contract.name,
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

    function addSpecificRightsAsync(work, indexed, clientId, overwrite) {
      return new Promise((resolve, reject) => {
        work.addSpecificRights(indexed, clientId, overwrite, (err, errors) => {
          if (err) return reject(err);
          return resolve(errors);
        });
      });
    }

    it('should resolve publishers by primary name and set enablePublisherMapping', async () => {
      const work = buildWork();
      const indexed = buildIndexedRights(work, [{
        publishers: `${publisherA.name}:${publisherB.name}`,
      }]);

      const errors = await addSpecificRightsAsync(work, indexed, client._id.toString(), false);

      expect(errors).toEqual([]);
      expect(work.channelSpecificSalesReturnsRights).toHaveLength(1);

      const rate = work.channelSpecificSalesReturnsRights[0];
      expect(rate.publishers).toEqual([publisherA._id.toString(), publisherB._id.toString()]);
      expect(work.enablePublisherMapping).toBe(true);
    });

    it('should resolve publishers by alias (case-insensitive)', async () => {
      const aliasName = randomString();
      publisherA.aliases = [aliasName];
      await publisherA.save();

      const work = buildWork();
      const indexed = buildIndexedRights(work, [{
        publishers: aliasName.toUpperCase(),
      }]);

      const errors = await addSpecificRightsAsync(work, indexed, client._id.toString(), false);

      expect(errors).toEqual([]);
      expect(work.channelSpecificSalesReturnsRights).toHaveLength(1);
      expect(work.channelSpecificSalesReturnsRights[0].publishers).toEqual([publisherA._id.toString()]);
    });

    it('should return error for unresolved publisher names', async () => {
      const unknownName = randomString();
      const work = buildWork();
      const indexed = buildIndexedRights(work, [{
        publishers: unknownName,
      }]);

      const errors = await addSpecificRightsAsync(work, indexed, client._id.toString(), false);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain(`Publisher '${unknownName}' not found`);
    });

    it('should not set enablePublisherMapping when no rows have publishers', async () => {
      const work = buildWork();
      const indexed = buildIndexedRights(work, [
        { percentage: Math.floor(Math.random() * 100) },
      ]);

      const errors = await addSpecificRightsAsync(work, indexed, client._id.toString(), false);

      expect(errors).toEqual([]);
      expect(work.enablePublisherMapping).toBeFalsy();
    });

    it('should generate fingerprints on save when publishers are present', async () => {
      const work = buildWork();
      const indexed = buildIndexedRights(work, [{
        publishers: `${publisherA.name}:${publisherB.name}`,
      }]);

      await addSpecificRightsAsync(work, indexed, client._id.toString(), false);
      await work.save();

      const saved = await Work.findById(work._id);
      const rate = saved.channelSpecificSalesReturnsRights[0];
      expect(rate.publisherFingerprint).toBeTruthy();
      // Fingerprint is sorted IDs joined by colon
      const expectedFingerprint = [publisherA._id.toString(), publisherB._id.toString()].sort().join(':');
      expect(rate.publisherFingerprint).toBe(expectedFingerprint);
    });
  });

  describe('exportSpecificParticipationRates — publisher names', () => {
    function exportAsync(work) {
      return new Promise((resolve, reject) => {
        work.exportSpecificParticipationRates((err, result) => {
          if (err) return reject(err);
          return resolve(result);
        });
      });
    }

    it('should export publisher names as colon-separated string', async () => {
      const contract = await new Contract({ clientId: client._id, name: randomString() }).save();
      const publisherA = await new Publisher({ clientId: client._id, name: randomString() }).save();
      const publisherB = await new Publisher({ clientId: client._id, name: randomString() }).save();
      const percentage = Math.floor(Math.random() * 100);

      const work = await buildWork({
        channelSpecificSalesReturnsRights: [{
          contractId: contract._id.toString(),
          distributionChannel: '',
          source: '',
          territory: '',
          publishers: [publisherA._id.toString(), publisherB._id.toString()],
          percentage,
        }],
      }).save();

      const result = await exportAsync(work);

      expect(result).toHaveLength(1);
      const row = result[0];
      expect(row).toHaveLength(10);
      expect(row[8]).toBe(`${publisherA.name}:${publisherB.name}`);
      expect(row[9]).toBe(percentage);
    });

    it('should export empty string when rate has no publishers', async () => {
      const contract = await new Contract({ clientId: client._id, name: randomString() }).save();
      const percentage = Math.floor(Math.random() * 100);

      const work = await buildWork({
        channelSpecificSalesReturnsRights: [{
          contractId: contract._id.toString(),
          distributionChannel: '',
          source: '',
          territory: '',
          percentage,
        }],
      }).save();

      const result = await exportAsync(work);

      expect(result).toHaveLength(1);
      const row = result[0];
      expect(row).toHaveLength(10);
      expect(row[8]).toBe('');
      expect(row[9]).toBe(percentage);
    });
  });

  describe('createExportXlsx — Lite specific participation rates', () => {
    it('should export 9-column SPR rows for a Lite client, matching the Lite template tab', async () => {
      client.paymentTier = 'Lite';
      await client.save();

      const contract = await new Contract({ clientId: client._id, name: randomString() }).save();
      const percentage = Math.floor(Math.random() * 100);

      const work = await buildWork({
        channelSpecificSalesReturnsRights: [{
          contractId: contract._id.toString(),
          distributionChannel: '',
          source: '',
          territory: '',
          percentage,
        }],
      }).save();

      jest.spyOn(createXlsx, 'createInTemplate').mockImplementation((data, template, cb) => cb(null, template));

      await new Promise((resolve) => {
        Work.createExportXlsx({ _id: [work._id] }, client._id.toString(), () => {
          const [data, template] = createXlsx.createInTemplate.mock.calls[0];
          const sprRows = data[3];
          expect(sprRows).toHaveLength(1);
          expect(sprRows[0]).toHaveLength(9);
          expect(sprRows[0][8]).toBe(percentage);
          expect(template).toContain('/templates/Lite/');
          resolve();
        });
      });
    });
  });
});
