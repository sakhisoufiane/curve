const { testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const Publisher = require('.');
const Client = require('../client');

let client;

// Build a minimal publisher for the current client.
function buildPublisher(overrides = {}) {
  return new Publisher({
    clientId: client._id.toString(),
    name: randomString(),
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
  // Everything within this describe block is called via the Publisher pre-save hook
  // The names of each block e.g. uniqueSocietyIdentifiers correspond to the original function name
  // These have since been migrated over to CSL so they can be shared across repos
  // There's no harm in keeping these descriptors here in this test file as they keep everything nicely grouped up

  describe('potentialDuplicateCount', () => {
    it('sets the potentialDuplicatesCount if potentialDuplicates exist', async () => {
      const publisher = await buildPublisher({ potentialDuplicates: [{}, {}] }).save();
      const saved = await Publisher.findById(publisher._id);
      expect(saved.potentialDuplicatesCount).toBe(2);
    });

    it('sets the potentialDuplicatesCount to zero if no potentialDuplicates exist', async () => {
      const publisher = await buildPublisher().save();
      const saved = await Publisher.findById(publisher._id);
      expect(saved.potentialDuplicatesCount).toBe(0);
    });
  });

  describe('cae', () => {
    describe('when no cae is defined', () => {
      it('sets the default cae numbers', async () => {
        const publisher = await buildPublisher().save();
        const saved = await Publisher.findById(publisher._id);
        expect(saved.cae).toBe('00000000000');
        expect(saved.caeWithoutLeadingZeros).toBe('');
      });
    });

    describe('when cae is "0"', () => {
      it('sets default values', async () => {
        const publisher = await buildPublisher({ cae: '0' }).save();
        const saved = await Publisher.findById(publisher._id);
        expect(saved.cae).toBe('00000000000');
        expect(saved.caeWithoutLeadingZeros).toBe('');
      });
    });

    describe('when cae contains non-alphanumeric characters', () => {
      it('removes all non-alphanumeric characters', async () => {
        const publisher = await buildPublisher({ cae: 'abc-123!@#' }).save();
        const saved = await Publisher.findById(publisher._id);
        expect(saved.cae).toBe('abc123');
        expect(saved.caeWithoutLeadingZeros).toBe('abc123');
      });
    });

    describe('when cae has leading zeros', () => {
      it('removes leading zeros only in caeWithoutLeadingZeros', async () => {
        const publisher = await buildPublisher({ cae: '00012345' }).save();
        const saved = await Publisher.findById(publisher._id);
        expect(saved.cae).toBe('00012345');
        expect(saved.caeWithoutLeadingZeros).toBe('12345');
      });
    });

    describe('when cae has mixed characters and leading zeros', () => {
      it('sanitizes and removes leading zeros correctly', async () => {
        const publisher = await buildPublisher({ cae: '00-0abc123' }).save();
        const saved = await Publisher.findById(publisher._id);
        expect(saved.cae).toBe('000abc123');
        expect(saved.caeWithoutLeadingZeros).toBe('abc123');
      });
    });

    describe('when cae is already clean alphanumeric', () => {
      it('keeps the value unchanged', async () => {
        const publisher = await buildPublisher({ cae: 'ABC123xyz' }).save();
        const saved = await Publisher.findById(publisher._id);
        expect(saved.cae).toBe('ABC123xyz');
        expect(saved.caeWithoutLeadingZeros).toBe('ABC123xyz');
      });
    });

    describe('when cae contains only zeros', () => {
      it('results in empty caeWithoutLeadingZeros', async () => {
        const publisher = await buildPublisher({ cae: '000000' }).save();
        const saved = await Publisher.findById(publisher._id);
        expect(saved.cae).toBe('000000');
        expect(saved.caeWithoutLeadingZeros).toBe('');
      });
    });

    describe('when cae is an empty string', () => {
      it('sets default values', async () => {
        const publisher = await buildPublisher({ cae: '' }).save();
        const saved = await Publisher.findById(publisher._id);
        expect(saved.cae).toBe('00000000000');
        expect(saved.caeWithoutLeadingZeros).toBe('');
      });
    });

    describe('when cae is null', () => {
      it('sets default values', async () => {
        const publisher = await buildPublisher({ cae: null }).save();
        const saved = await Publisher.findById(publisher._id);
        expect(saved.cae).toBe('00000000000');
        expect(saved.caeWithoutLeadingZeros).toBe('');
      });
    });
  });

  describe('publisherAgreements', () => {
    describe('when no publisherAgreements is defined', () => {
      it('defaults to an empty array', async () => {
        const publisher = await buildPublisher().save();
        const saved = await Publisher.findById(publisher._id);
        expect(saved.publisherAgreements).toHaveLength(0);
      });
    });

    describe('when publisherAgreements is an empty array', () => {
      it('keeps it as an empty array', async () => {
        const publisher = await buildPublisher({ publisherAgreements: [] }).save();
        const saved = await Publisher.findById(publisher._id);
        expect(saved.publisherAgreements).toEqual([]);
      });
    });

    describe('when publisherAgreements contains agreements with empty publisherId', () => {
      it('nullifies the publisherId field', async () => {
        const publisher = await buildPublisher({ publisherAgreements: [{ publisherId: '' }, { publisherId: '' }] }).save();
        const saved = await Publisher.findById(publisher._id);
        expect(saved.publisherAgreements).toEqual([{ publisherId: null }, { publisherId: null }]);
      });
    });

    describe('when publisherAgreements contains a mix of empty and non-empty publisherId', () => {
      it('nullifies only the empty publisherId entries', async () => {
        const publisher = await buildPublisher({ publisherAgreements: [{ publisherId: '' }, { publisherId: 'pub1' }] }).save();
        const saved = await Publisher.findById(publisher._id);
        expect(saved.publisherAgreements).toEqual([{ publisherId: null }, { publisherId: 'pub1' }]);
      });
    });

    describe('when publisherAgreements contains agreements with non-empty publisherId', () => {
      it('leaves the array unchanged', async () => {
        const publisher = await buildPublisher({ publisherAgreements: [{ publisherId: 'pub1' }, { publisherId: 'pub2' }] }).save();
        const saved = await Publisher.findById(publisher._id);
        expect(saved.publisherAgreements).toEqual([{ publisherId: 'pub1' }, { publisherId: 'pub2' }]);
      });
    });

    describe('when publisherAgreements contains agreements with empty composerId', () => {
      it('nullifies the composerId field', async () => {
        const publisher = await buildPublisher({ publisherAgreements: [{ composerId: '' }] }).save();
        const saved = await Publisher.findById(publisher._id);
        expect(saved.publisherAgreements).toEqual([{ composerId: null }]);
      });
    });

    describe('when publisherAgreements contains agreements with empty contractId', () => {
      it('nullifies the contractId field', async () => {
        const publisher = await buildPublisher({ publisherAgreements: [{ contractId: '' }] }).save();
        const saved = await Publisher.findById(publisher._id);
        expect(saved.publisherAgreements).toEqual([{ contractId: null }]);
      });
    });
  });

  describe('preSaveValidation', () => {
    describe('name', () => {
      it('should throw an error if name is missing', async () => {
        await expect(buildPublisher({ name: null }).save()).rejects.toThrow('Name is required');
      });

      it('should not throw an error if the name is defined', async () => {
        const publisher = buildPublisher({ name: randomString() });
        await expect(publisher.save()).resolves.not.toThrow();
        const saved = await Publisher.findById(publisher._id);
        expect(saved.name).toBe(publisher.name);
      });
    });

    describe('CAE uniqueness', () => {
      it('does not throw when CAE is unique for the client', async () => {
        await expect(buildPublisher({ cae: 'ABC123' }).save()).resolves.not.toThrow();
      });

      it('throws when CAE already exists for a different publisher in the same client', async () => {
        await buildPublisher({ cae: 'ABC123' }).save();
        await expect(buildPublisher({ cae: 'ABC123' }).save()).rejects.toThrow('CAE is required to be unique');
      });

      it('does not throw when the same CAE exists for a publisher in a different client', async () => {
        await buildPublisher({ cae: 'ABC123' }).save();
        const otherClient = await new Client({
          name: randomString(),
          issueIdentifier: false,
          createdBigQueryTables: true,
          createdBigQueryBackups: true,
          clientType: 'Publisher',
        }).save();
        await expect(
          new Publisher({ clientId: otherClient._id.toString(), name: randomString(), cae: 'ABC123' }).save(),
        ).resolves.not.toThrow();
      });

      it('throws when CAE is empty and name is duplicated in the same client', async () => {
        const sharedName = randomString();
        await buildPublisher({ name: sharedName }).save();
        await expect(buildPublisher({ name: sharedName }).save()).rejects.toThrow('CAE can not be empty');
      });

      it('does not throw when CAE is empty and name is unique', async () => {
        await expect(buildPublisher().save()).resolves.not.toThrow();
      });

      it('does not throw for a publisher that already has the same CAE as itself (re-save)', async () => {
        const publisher = await buildPublisher({ cae: 'ABC123' }).save();
        publisher.name = randomString();
        await expect(publisher.save()).resolves.not.toThrow();
      });

      it('throws when a publisher with the same stripped CAE exists (leading zero cross-match)', async () => {
        // '00ABC123' and 'ABC123' have the same caeWithoutLeadingZeros — treated as duplicates
        await buildPublisher({ cae: '00ABC123' }).save();
        await expect(buildPublisher({ cae: 'ABC123' }).save()).rejects.toThrow('CAE is required to be unique');
      });

      it('does not throw when a conflicting publisher is in excludeIds', async () => {
        // Simulates a merge: publisher A is being deleted, so it should be excluded from the uniqueness check
        const publisherA = await buildPublisher({ cae: 'ABC123' }).save();
        const publisherB = buildPublisher({ cae: 'ABC123' });
        publisherB._excludeIdsForValidation = [publisherA._id.toString()];
        await expect(publisherB.save()).resolves.not.toThrow();
      });
    });
  });

  describe('lowerCaseName', () => {
    describe('when publisher.name is defined', () => {
      it('converts uppercase letters to lowercase', async () => {
        const publisher = await buildPublisher({ name: 'MyPublisher' }).save();
        const saved = await Publisher.findById(publisher._id);
        expect(saved.lowerCaseName).toBe('mypublisher');
      });

      it('keeps already lowercase letters unchanged', async () => {
        const publisher = await buildPublisher({ name: 'mypublisher' }).save();
        const saved = await Publisher.findById(publisher._id);
        expect(saved.lowerCaseName).toBe('mypublisher');
      });

      it('converts mixed case letters correctly', async () => {
        const publisher = await buildPublisher({ name: 'MiXeDCaSe123' }).save();
        const saved = await Publisher.findById(publisher._id);
        expect(saved.lowerCaseName).toBe('mixedcase123');
      });

      it('handles numeric and special characters without change', async () => {
        const publisher = await buildPublisher({ name: 'Publisher123!@#' }).save();
        const saved = await Publisher.findById(publisher._id);
        expect(saved.lowerCaseName).toBe('publisher123!@#');
      });
    });

    describe('when publisher.name is a number or boolean', () => {
      it('converts numbers to lowercase string', async () => {
        const publisher = await buildPublisher({ name: 12345 }).save();
        const saved = await Publisher.findById(publisher._id);
        expect(saved.lowerCaseName).toBe('12345');
      });

      it('converts booleans to lowercase string', async () => {
        const publisher = await buildPublisher({ name: true }).save();
        const saved = await Publisher.findById(publisher._id);
        expect(saved.lowerCaseName).toBe('true');
      });
    });
  });

  describe('issuePartyNo', () => {
    it('assigns partyNo of 1 when no other publishers exist for the client', async () => {
      const publisher = await buildPublisher().save();
      const saved = await Publisher.findById(publisher._id);
      expect(saved.partyNo).toBe(1);
    });

    it('assigns the next sequential partyNo when other publishers already exist for the client', async () => {
      const first = await buildPublisher().save();
      const firstPartyNo = (await Publisher.findById(first._id)).partyNo;

      const second = await buildPublisher().save();
      const secondPartyNo = (await Publisher.findById(second._id)).partyNo;

      expect(secondPartyNo).toBe(firstPartyNo + 1);
    });

    it('keeps existing partyNo when it is already unique across the client', async () => {
      const publisher = await buildPublisher().save();
      const { partyNo } = await Publisher.findById(publisher._id);
      publisher.title = randomString();
      await publisher.save();
      const saved = await Publisher.findById(publisher._id);
      expect(saved.partyNo).toBe(partyNo);
    });

    it('re-issues a new partyNo when the existing one conflicts with another publisher', async () => {
      await buildPublisher({ partyNo: 5 }).save();
      // Second publisher with the same partyNo — issuePartyNo should detect the conflict and assign the next sequential
      const publisher = await buildPublisher({ partyNo: 5 }).save();
      const saved = await Publisher.findById(publisher._id);
      expect(saved.partyNo).toBe(6);
    });
  });

  describe('issueInterestedPartyId', () => {
    it('should stringify the interestedPartyId', async () => {
      const publisher = await buildPublisher({ partyNo: 2 }).save();
      const saved = await Publisher.findById(publisher._id);
      expect(typeof saved.interestedPartyId).toBe('string');
    });

    it('should pad the string with up to 8 "0"', async () => {
      const publisher = await buildPublisher({ partyNo: 2 }).save();
      const saved = await Publisher.findById(publisher._id);
      expect(saved.interestedPartyId.length).toBe(9);
    });

    it('adds an interestedPartyId to the publisher', async () => {
      const publisher = await buildPublisher({ partyNo: 2 }).save();
      const saved = await Publisher.findById(publisher._id);
      expect(saved.interestedPartyId).toBeDefined();
    });

    it('The interestedPartyId matches the partyNo + 7 0s', async () => {
      const publisher = await buildPublisher({ partyNo: 2 }).save();
      const saved = await Publisher.findById(publisher._id);
      expect(saved.interestedPartyId).toBe('P00000002');
    });

    describe('interestedPartyId already exists & partyNo is the same', () => {
      it('skips creating an interestedPartyId', async () => {
        const publisher = await buildPublisher({ partyNo: 2, interestedPartyId: 'P00000002' }).save();
        const saved = await Publisher.findById(publisher._id);
        expect(saved.interestedPartyId).toBe('P00000002');
      });
    });

    describe('computed interestedPartyId conflicts with an existing one in the same client', () => {
      it('throws a validation error', async () => {
        // Publisher A: partyNo=1 but interestedPartyId manually set to 'P00000002' (mismatched).
        // This means the next auto-assigned partyNo (2) maps to an already-taken interestedPartyId.
        await buildPublisher({ partyNo: 1, interestedPartyId: 'P00000002' }).save();
        // Publisher B: no interestedPartyId. issuePartyNo assigns partyNo=2, then
        // issueInterestedPartyId computes 'P00000002', finds Publisher A already has it, and throws.
        await expect(buildPublisher().save()).rejects.toThrow('Interested Party ID P00000002 already exists');
      });
    });
  });

  describe('validateInterestedPartyId', () => {
    it('does not error when interestedPartyId is unique within the client', async () => {
      await expect(buildPublisher().save()).resolves.not.toThrow();
    });

    it('throws when interestedPartyId already exists for a different publisher in the same client', async () => {
      await buildPublisher().save(); // Gets interestedPartyId 'P00000001'
      await expect(
        buildPublisher({ interestedPartyId: 'P00000001' }).save(),
      ).rejects.toThrow('Interested Party ID P00000001 already exists');
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
        inheritCatalogueFrom: [{ clientId: client._id.toString(), transferPublishers: true, ...inheritance }],
      }).save();
    }

    afterEach(async () => {
      if (childClient?._id) await testUtils.cleanUpAsync(childClient._id.toString());
      childClient = null;
    });

    describe('client filtering', () => {
      it('does not create a copy when no child clients inherit from the publisher\'s client', async () => {
        const publisher = await buildPublisher().save();
        const copies = await Publisher.find({ duplicatedFrom: publisher._id });
        expect(copies).toHaveLength(0);
      });

      it('does not create a copy when transferPublishers is false', async () => {
        childClient = await buildChildClient({ transferPublishers: false });
        const publisher = await buildPublisher().save();
        const copies = await Publisher.find({ clientId: childClient._id, duplicatedFrom: publisher._id });
        expect(copies).toHaveLength(0);
      });

      it('creates a copy in a child client when transferPublishers is true', async () => {
        childClient = await buildChildClient();
        const publisher = await buildPublisher().save();
        const copy = await Publisher.findOne({ clientId: childClient._id, duplicatedFrom: publisher._id });
        expect(copy).not.toBeNull();
      });

      it('creates a copy when the publisher\'s catalogueGroups includes the child client\'s catalogueGroup', async () => {
        childClient = await buildChildClient({ catalogueGroup: 'Group A' });
        const publisher = await buildPublisher({ catalogueGroups: ['Group A'] }).save();
        const copy = await Publisher.findOne({ clientId: childClient._id, duplicatedFrom: publisher._id });
        expect(copy).not.toBeNull();
      });

      it('does not create a copy when the child client\'s catalogueGroup does not match the publisher', async () => {
        childClient = await buildChildClient({ catalogueGroup: 'Group B' });
        const publisher = await buildPublisher({ catalogueGroups: ['Group A'] }).save();
        const copy = await Publisher.findOne({ clientId: childClient._id, duplicatedFrom: publisher._id });
        expect(copy).toBeNull();
      });

      it('does not create a copy when the child client has a catalogueGroup filter but the publisher has none', async () => {
        childClient = await buildChildClient({ catalogueGroup: 'Group A' });
        const publisher = await buildPublisher({ catalogueGroups: [] }).save();
        const copy = await Publisher.findOne({ clientId: childClient._id, duplicatedFrom: publisher._id });
        expect(copy).toBeNull();
      });

      it('creates copies in multiple child clients', async () => {
        childClient = await buildChildClient();
        const secondChildClient = await buildChildClient();
        const publisher = await buildPublisher().save();
        const copies = await Publisher.find({ duplicatedFrom: publisher._id });
        expect(copies).toHaveLength(2);
        await testUtils.cleanUpAsync(secondChildClient._id.toString());
      });
    });

    describe('copy fidelity', () => {
      it('sets clientId on the copied publisher to the child client\'s ID', async () => {
        childClient = await buildChildClient();
        const publisher = await buildPublisher().save();
        const copy = await Publisher.findOne({ clientId: childClient._id, duplicatedFrom: publisher._id });
        expect(copy.clientId.toString()).toBe(childClient._id.toString());
      });

      it('sets duplicatedFrom on the copied publisher to the parent publisher\'s ID', async () => {
        childClient = await buildChildClient();
        const publisher = await buildPublisher().save();
        const copy = await Publisher.findOne({ clientId: childClient._id, duplicatedFrom: publisher._id });
        expect(copy.duplicatedFrom.toString()).toBe(publisher._id.toString());
      });

      it('copies the name to the child publisher', async () => {
        childClient = await buildChildClient();
        const publisherName = randomString();
        const publisher = await buildPublisher({ name: publisherName }).save();
        const copy = await Publisher.findOne({ clientId: childClient._id, duplicatedFrom: publisher._id });
        expect(copy.name).toBe(publisherName);
      });

      it('copies the cae to the child publisher (padded to 11 digits)', async () => {
        childClient = await buildChildClient();
        const publisher = await buildPublisher({ cae: '12345' }).save();
        const copy = await Publisher.findOne({ clientId: childClient._id, duplicatedFrom: publisher._id });
        expect(copy.cae).toBe('00000012345');
      });

      it('copies controlled to the child publisher', async () => {
        childClient = await buildChildClient();
        const publisher = await buildPublisher({ controlled: true }).save();
        const copy = await Publisher.findOne({ clientId: childClient._id, duplicatedFrom: publisher._id });
        expect(copy.controlled).toBe(true);
      });

      it('copies notes to the child publisher', async () => {
        childClient = await buildChildClient();
        const notes = randomString();
        const publisher = await buildPublisher({ notes }).save();
        const copy = await Publisher.findOne({ clientId: childClient._id, duplicatedFrom: publisher._id });
        expect(copy.notes).toBe(notes);
      });
    });

    describe('idempotency', () => {
      it('does not create a duplicate copy on re-save', async () => {
        childClient = await buildChildClient();
        const publisher = await buildPublisher().save();
        publisher.notes = randomString();
        await publisher.save();
        const copies = await Publisher.find({ clientId: childClient._id, duplicatedFrom: publisher._id });
        expect(copies).toHaveLength(1);
      });

      it('updates the existing copy with the new values on re-save', async () => {
        childClient = await buildChildClient();
        const publisher = await buildPublisher().save();
        const newName = randomString();
        publisher.name = newName;
        await publisher.save();
        const copy = await Publisher.findOne({ clientId: childClient._id, duplicatedFrom: publisher._id });
        expect(copy.name).toBe(newName);
      });
    });
  });
});
