const { testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const Composer = require('.');
const Client = require('../client');
const Work = require('../work');

let client;

// Build a minimal composer for the current client.
function buildComposer(overrides = {}) {
  return new Composer({
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
  // Everything within this describe block is called via the Composer pre-save hook
  // The names of each block e.g. uniqueSocietyIdentifiers correspond to the original function name
  // These have since been migrated over to CSL so they can be shared across repos
  // There's no harm in keeping these descriptors here in this test file as they keep everything nicely grouped up

  describe('potentialDuplicatesCount', () => {
    it('sets the potentialDuplicatesCount if potentialDuplicates exist', async () => {
      const composer = await buildComposer({ potentialDuplicates: [{}, {}] }).save();
      const saved = await Composer.findById(composer._id);
      expect(saved.potentialDuplicatesCount).toBe(2);
    });

    it('sets the potentialDuplicatesCount to zero if no potentialDuplicates exist', async () => {
      const composer = await buildComposer().save();
      const saved = await Composer.findById(composer._id);
      expect(saved.potentialDuplicatesCount).toBe(0);
    });
  });

  describe('cae', () => {
    describe('when no cae is defined', () => {
      it('sets the default cae numbers', async () => {
        const composer = await buildComposer().save();
        const saved = await Composer.findById(composer._id);
        expect(saved.cae).toBe('00000000000');
        expect(saved.caeWithoutLeadingZeros).toBe('');
      });
    });

    describe('when cae is "0"', () => {
      it('sets default values', async () => {
        const composer = await buildComposer({ cae: '0' }).save();
        const saved = await Composer.findById(composer._id);
        expect(saved.cae).toBe('00000000000');
        expect(saved.caeWithoutLeadingZeros).toBe('');
      });
    });

    describe('when cae contains non-alphanumeric characters', () => {
      it('removes all non-alphanumeric characters', async () => {
        const composer = await buildComposer({ cae: 'abc-123!@#' }).save();
        const saved = await Composer.findById(composer._id);
        expect(saved.cae).toBe('abc123');
        expect(saved.caeWithoutLeadingZeros).toBe('abc123');
      });
    });

    describe('when cae has leading zeros', () => {
      it('removes leading zeros only in caeWithoutLeadingZeros', async () => {
        const composer = await buildComposer({ cae: '00012345' }).save();
        const saved = await Composer.findById(composer._id);
        expect(saved.cae).toBe('00012345');
        expect(saved.caeWithoutLeadingZeros).toBe('12345');
      });
    });

    describe('when cae has mixed characters and leading zeros', () => {
      it('sanitizes and removes leading zeros correctly', async () => {
        const composer = await buildComposer({ cae: '00-0abc123' }).save();
        const saved = await Composer.findById(composer._id);
        expect(saved.cae).toBe('000abc123');
        expect(saved.caeWithoutLeadingZeros).toBe('abc123');
      });
    });

    describe('when cae is already clean alphanumeric', () => {
      it('keeps the value unchanged', async () => {
        const composer = await buildComposer({ cae: 'ABC123xyz' }).save();
        const saved = await Composer.findById(composer._id);
        expect(saved.cae).toBe('ABC123xyz');
        expect(saved.caeWithoutLeadingZeros).toBe('ABC123xyz');
      });
    });

    describe('when cae contains only zeros', () => {
      it('results in empty caeWithoutLeadingZeros', async () => {
        const composer = await buildComposer({ cae: '000000' }).save();
        const saved = await Composer.findById(composer._id);
        expect(saved.cae).toBe('000000');
        expect(saved.caeWithoutLeadingZeros).toBe('');
      });
    });

    describe('when cae is an empty string', () => {
      it('sets default values', async () => {
        const composer = await buildComposer({ cae: '' }).save();
        const saved = await Composer.findById(composer._id);
        expect(saved.cae).toBe('00000000000');
        expect(saved.caeWithoutLeadingZeros).toBe('');
      });
    });

    describe('when cae is null', () => {
      it('sets default values', async () => {
        const composer = await buildComposer({ cae: null }).save();
        const saved = await Composer.findById(composer._id);
        expect(saved.cae).toBe('00000000000');
        expect(saved.caeWithoutLeadingZeros).toBe('');
      });
    });
  });

  describe('publisherAgreements', () => {
    describe('when no publisherAgreements is defined', () => {
      it('defaults to an empty array', async () => {
        const composer = await buildComposer().save();
        const saved = await Composer.findById(composer._id);
        expect(saved.publisherAgreements).toHaveLength(0);
      });
    });

    describe('when publisherAgreements is an empty array', () => {
      it('keeps it as an empty array', async () => {
        const composer = await buildComposer({ publisherAgreements: [] }).save();
        const saved = await Composer.findById(composer._id);
        expect(saved.publisherAgreements).toEqual([]);
      });
    });

    describe('when publisherAgreements contains agreements with empty publisherId', () => {
      it('nullifies the publisherId field', async () => {
        const composer = await buildComposer({ publisherAgreements: [{ publisherId: '' }, { publisherId: '' }] }).save();
        const saved = await Composer.findById(composer._id);
        expect(saved.publisherAgreements).toEqual([{ publisherId: null }, { publisherId: null }]);
      });
    });

    describe('when publisherAgreements contains a mix of empty and non-empty publisherId', () => {
      it('nullifies only the empty publisherId entries', async () => {
        const composer = await buildComposer({ publisherAgreements: [{ publisherId: '' }, { publisherId: 'pub1' }] }).save();
        const saved = await Composer.findById(composer._id);
        expect(saved.publisherAgreements).toEqual([{ publisherId: null }, { publisherId: 'pub1' }]);
      });
    });

    describe('when publisherAgreements contains agreements with non-empty publisherId', () => {
      it('leaves the array unchanged', async () => {
        const composer = await buildComposer({ publisherAgreements: [{ publisherId: 'pub1' }, { publisherId: 'pub2' }] }).save();
        const saved = await Composer.findById(composer._id);
        expect(saved.publisherAgreements).toEqual([{ publisherId: 'pub1' }, { publisherId: 'pub2' }]);
      });
    });

    describe('when publisherAgreements contains agreements with empty composerId', () => {
      it('nullifies the composerId field', async () => {
        const composer = await buildComposer({ publisherAgreements: [{ composerId: '' }] }).save();
        const saved = await Composer.findById(composer._id);
        expect(saved.publisherAgreements).toEqual([{ composerId: null }]);
      });
    });

    describe('when publisherAgreements contains agreements with empty contractId', () => {
      it('nullifies the contractId field', async () => {
        const composer = await buildComposer({ publisherAgreements: [{ contractId: '' }] }).save();
        const saved = await Composer.findById(composer._id);
        expect(saved.publisherAgreements).toEqual([{ contractId: null }]);
      });
    });
  });

  describe('preSaveValidation', () => {
    describe('name', () => {
      it('should throw an error if name is missing', async () => {
        await expect(buildComposer({ name: null }).save()).rejects.toThrow('Name is required');
      });

      it('should not throw an error if the name is defined', async () => {
        const composer = buildComposer({ name: randomString() });
        await expect(composer.save()).resolves.not.toThrow();
        const saved = await Composer.findById(composer._id);
        expect(saved.name).toBe(composer.name);
      });
    });

    describe('CAE uniqueness', () => {
      it('does not throw when CAE is unique for the client', async () => {
        await expect(buildComposer({ cae: 'ABC123' }).save()).resolves.not.toThrow();
      });

      it('throws when CAE already exists for a different composer in the same client', async () => {
        await buildComposer({ cae: 'ABC123' }).save();
        await expect(buildComposer({ cae: 'ABC123' }).save()).rejects.toThrow('CAE is required to be unique');
      });

      it('does not throw when the same CAE exists for a composer in a different client', async () => {
        await buildComposer({ cae: 'ABC123' }).save();
        const otherClient = await new Client({
          name: randomString(),
          issueIdentifier: false,
          createdBigQueryTables: true,
          createdBigQueryBackups: true,
          clientType: 'Publisher',
        }).save();
        await expect(
          new Composer({ clientId: otherClient._id.toString(), name: randomString(), cae: 'ABC123' }).save(),
        ).resolves.not.toThrow();
      });

      it('throws when CAE is empty and name is duplicated in the same client', async () => {
        const sharedName = randomString();
        await buildComposer({ name: sharedName }).save();
        // Note: the post-save errorMessages hook splits on ',' and re-joins with ', ', so the
        // original ', ' in the message becomes ',  ' (double space) in the thrown error.
        await expect(buildComposer({ name: sharedName }).save()).rejects.toThrow('CAE can not be empty');
      });

      it('does not throw when CAE is empty and name is unique', async () => {
        await expect(buildComposer().save()).resolves.not.toThrow();
      });

      it('does not throw for a composer that already has the same CAE as itself (re-save)', async () => {
        const composer = await buildComposer({ cae: 'ABC123' }).save();
        composer.name = randomString();
        await expect(composer.save()).resolves.not.toThrow();
      });

      it('throws when a composer with the same stripped CAE exists (leading zero cross-match)', async () => {
        // '00ABC123' and 'ABC123' share the same caeWithoutLeadingZeros — treated as duplicates
        await buildComposer({ cae: '00ABC123' }).save();
        await expect(buildComposer({ cae: 'ABC123' }).save()).rejects.toThrow('CAE is required to be unique');
      });

      it('does not throw when a conflicting composer is in excludeIds', async () => {
        // Simulates a merge: composer A is being deleted, so it should be excluded from the uniqueness check
        const composerA = await buildComposer({ cae: 'ABC123' }).save();
        const composerB = buildComposer({ cae: 'ABC123' });
        composerB._excludeIdsForValidation = [composerA._id.toString()];
        await expect(composerB.save()).resolves.not.toThrow();
      });
    });
  });

  describe('lowerCaseName', () => {
    describe('when composer.name is defined', () => {
      it('converts uppercase letters to lowercase', async () => {
        const composer = await buildComposer({ name: 'MyComposer' }).save();
        const saved = await Composer.findById(composer._id);
        expect(saved.lowerCaseName).toBe('mycomposer');
      });

      it('keeps already lowercase letters unchanged', async () => {
        const composer = await buildComposer({ name: 'mycomposer' }).save();
        const saved = await Composer.findById(composer._id);
        expect(saved.lowerCaseName).toBe('mycomposer');
      });

      it('converts mixed case letters correctly', async () => {
        const composer = await buildComposer({ name: 'MiXeDCaSe123' }).save();
        const saved = await Composer.findById(composer._id);
        expect(saved.lowerCaseName).toBe('mixedcase123');
      });

      it('handles numeric and special characters without change', async () => {
        const composer = await buildComposer({ name: 'Composer123!@#' }).save();
        const saved = await Composer.findById(composer._id);
        expect(saved.lowerCaseName).toBe('composer123!@#');
      });
    });

    describe('when composer.name is a number or boolean', () => {
      it('converts numbers to lowercase string', async () => {
        const composer = await buildComposer({ name: 12345 }).save();
        const saved = await Composer.findById(composer._id);
        expect(saved.lowerCaseName).toBe('12345');
      });

      it('converts booleans to lowercase string', async () => {
        const composer = await buildComposer({ name: true }).save();
        const saved = await Composer.findById(composer._id);
        expect(saved.lowerCaseName).toBe('true');
      });
    });
  });

  describe('issuePartyNo', () => {
    it('assigns partyNo of 1 when no other composers exist for the client', async () => {
      const composer = await buildComposer().save();
      const saved = await Composer.findById(composer._id);
      expect(saved.partyNo).toBe(1);
    });

    it('assigns the next sequential partyNo when other composers already exist for the client', async () => {
      const first = await buildComposer().save();
      const firstPartyNo = (await Composer.findById(first._id)).partyNo;

      const second = await buildComposer().save();
      const secondPartyNo = (await Composer.findById(second._id)).partyNo;

      expect(secondPartyNo).toBe(firstPartyNo + 1);
    });

    it('keeps existing partyNo when it is already unique across the client', async () => {
      const composer = await buildComposer().save();
      const { partyNo } = await Composer.findById(composer._id);
      composer.name = randomString();
      await composer.save();
      const saved = await Composer.findById(composer._id);
      expect(saved.partyNo).toBe(partyNo);
    });

    it('re-issues a new partyNo when the existing one conflicts with another composer', async () => {
      await buildComposer({ partyNo: 5 }).save();
      // Second composer with the same partyNo — issuePartyNo should detect the conflict and assign the next sequential
      const composer = await buildComposer({ partyNo: 5 }).save();
      const saved = await Composer.findById(composer._id);
      expect(saved.partyNo).toBe(6);
    });
  });

  describe('issueInterestedPartyId', () => {
    it('should stringify the interestedPartyId', async () => {
      const composer = await buildComposer({ partyNo: 2 }).save();
      const saved = await Composer.findById(composer._id);
      expect(typeof saved.interestedPartyId).toBe('string');
    });

    it('should pad the string with up to 8 "0"s plus the "C" prefix (total length 9)', async () => {
      const composer = await buildComposer({ partyNo: 2 }).save();
      const saved = await Composer.findById(composer._id);
      expect(saved.interestedPartyId.length).toBe(9);
    });

    it('adds an interestedPartyId to the composer', async () => {
      const composer = await buildComposer({ partyNo: 2 }).save();
      const saved = await Composer.findById(composer._id);
      expect(saved.interestedPartyId).toBeDefined();
    });

    it('the interestedPartyId matches "C" + partyNo zero-padded to 8 digits', async () => {
      const composer = await buildComposer({ partyNo: 2 }).save();
      const saved = await Composer.findById(composer._id);
      expect(saved.interestedPartyId).toBe('C00000002');
    });

    describe('when interestedPartyId already exists and partyNo is the same', () => {
      it('skips creating an interestedPartyId', async () => {
        const composer = await buildComposer({ partyNo: 2, interestedPartyId: 'C00000002' }).save();
        const saved = await Composer.findById(composer._id);
        expect(saved.interestedPartyId).toBe('C00000002');
      });
    });

    describe('computed interestedPartyId conflicts with an existing one in the same client', () => {
      it('throws a validation error', async () => {
        // Composer A: partyNo=1 but interestedPartyId manually set to 'C00000002' (mismatched).
        // This means the next auto-assigned partyNo (2) maps to an already-taken interestedPartyId.
        await buildComposer({ partyNo: 1, interestedPartyId: 'C00000002' }).save();
        // Composer B: no interestedPartyId. issuePartyNo assigns partyNo=2, then
        // issueInterestedPartyId computes 'C00000002', finds Composer A already has it, and throws.
        await expect(buildComposer().save()).rejects.toThrow('Interested Party ID C00000002 already exists');
      });
    });
  });

  describe('validateInterestedPartyId', () => {
    it('does not error when interestedPartyId is unique within the client', async () => {
      await expect(buildComposer().save()).resolves.not.toThrow();
    });

    it('save fails when interestedPartyId already exists for a different composer in the same client', async () => {
      await buildComposer().save(); // Gets interestedPartyId 'C00000001'
      await expect(
        buildComposer({ interestedPartyId: 'C00000001' }).save(),
      ).rejects.toThrow('Interested Party ID C00000001 already exists');
    });
  });

  describe('updateComposerWorks', () => {
    async function buildWorkWithComposer(savedComposer) {
      return Work.create({
        clientId: client._id.toString(),
        title: randomString(),
        territories: ['WW'],
        usedComposerIds: [savedComposer._id.toString()],
        rightsChain: [
          {
            territory: 'WW',
            children: [
              {
                type: 'Publisher',
                publisherId: randomId(),
                name: randomString(),
                contractType: 'Original Publisher',
                mechanicalOwnership: 50,
                mechanicalCollection: 50,
                performanceOwnership: 50,
                performanceCollection: 50,
                controlled: true,
                children: [
                  {
                    type: 'Composer',
                    composerId: savedComposer._id.toString(),
                    caeNumber: savedComposer.cae,
                    name: savedComposer.name,
                    contractType: 'Lyrics and Music',
                    mechanicalOwnership: 50,
                    mechanicalCollection: 50,
                    performanceOwnership: 50,
                    performanceCollection: 50,
                    controlled: true,
                  },
                ],
              },
            ],
          },
        ],
      });
    }

    it('saves successfully when no works reference the composer', async () => {
      await expect(buildComposer({ cae: 'NOCAE1' }).save()).resolves.not.toThrow();
    });

    it('updates caeNumber in linked works rightsChain when cae changes', async () => {
      const composer = await buildComposer({ cae: 'OLDCAE1' }).save();
      const savedComposer = await Composer.findById(composer._id);

      const work = await buildWorkWithComposer(savedComposer);
      const composerChain = work.rightsChain[0].children[0].children[0];
      expect(composerChain.caeNumber).toBe('OLDCAE1');

      savedComposer.cae = 'NEWCAE1';
      await savedComposer.save();

      const updatedWork = await Work.findById(work._id);
      expect(updatedWork.rightsChain[0].children[0].children[0].caeNumber).toBe('NEWCAE1');
    });

    it('updates name in linked works rightsChain when name changes', async () => {
      const composer = await buildComposer({ cae: 'NAMECAE1' }).save();
      const savedComposer = await Composer.findById(composer._id);

      const work = await buildWorkWithComposer(savedComposer);
      expect(work.rightsChain[0].children[0].children[0].name).toBe(savedComposer.name);

      const newName = randomString();
      savedComposer.name = newName;
      await savedComposer.save();

      const updatedWork = await Work.findById(work._id);
      expect(updatedWork.rightsChain[0].children[0].children[0].name).toBe(newName);
    });

    it('does not alter the work when caeNumber and name are already up to date', async () => {
      const composer = await buildComposer({ cae: 'SAMECAE1' }).save();
      const savedComposer = await Composer.findById(composer._id);

      const work = await buildWorkWithComposer(savedComposer);
      const originalUpdatedAt = work.updatedAt;

      // Re-save the composer without any changes to cae or name
      await savedComposer.save();

      const refetchedWork = await Work.findById(work._id);
      expect(refetchedWork.rightsChain[0].children[0].children[0].caeNumber).toBe('SAMECAE1');
      expect(refetchedWork.rightsChain[0].children[0].children[0].name).toBe(savedComposer.name);
      // Work should not have been updated (updatedAt unchanged)
      expect(refetchedWork.updatedAt?.getTime()).toBe(originalUpdatedAt?.getTime());
    });

    it('updates both caeNumber and name in the same save', async () => {
      const composer = await buildComposer({ cae: 'BOTHCAE1' }).save();
      const savedComposer = await Composer.findById(composer._id);

      const work = await buildWorkWithComposer(savedComposer);

      savedComposer.cae = 'BOTHCAE2';
      savedComposer.name = randomString();
      await savedComposer.save();

      const updatedWork = await Work.findById(work._id);
      expect(updatedWork.rightsChain[0].children[0].children[0].caeNumber).toBe('BOTHCAE2');
      expect(updatedWork.rightsChain[0].children[0].children[0].name).toBe(savedComposer.name);
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
        inheritCatalogueFrom: [{ clientId: client._id.toString(), transferComposers: true, ...inheritance }],
      }).save();
    }

    afterEach(async () => {
      if (childClient?._id) await testUtils.cleanUpAsync(childClient._id.toString());
      childClient = null;
    });

    describe('client filtering', () => {
      it('does not create a copy when no child clients inherit from the composer\'s client', async () => {
        const composer = await buildComposer().save();
        const copies = await Composer.find({ duplicatedFrom: composer._id });
        expect(copies).toHaveLength(0);
      });

      it('does not create a copy when transferComposers is false', async () => {
        childClient = await buildChildClient({ transferComposers: false });
        const composer = await buildComposer().save();
        const copies = await Composer.find({ clientId: childClient._id, duplicatedFrom: composer._id });
        expect(copies).toHaveLength(0);
      });

      it('creates a copy in a child client when transferComposers is true', async () => {
        childClient = await buildChildClient();
        const composer = await buildComposer().save();
        const copy = await Composer.findOne({ clientId: childClient._id, duplicatedFrom: composer._id });
        expect(copy).not.toBeNull();
      });

      it('creates a copy when the composer\'s catalogueGroups includes the child client\'s catalogueGroup', async () => {
        childClient = await buildChildClient({ catalogueGroup: 'Group A' });
        const composer = await buildComposer({ catalogueGroups: ['Group A'] }).save();
        const copy = await Composer.findOne({ clientId: childClient._id, duplicatedFrom: composer._id });
        expect(copy).not.toBeNull();
      });

      it('does not create a copy when the child client\'s catalogueGroup does not match the composer', async () => {
        childClient = await buildChildClient({ catalogueGroup: 'Group B' });
        const composer = await buildComposer({ catalogueGroups: ['Group A'] }).save();
        const copy = await Composer.findOne({ clientId: childClient._id, duplicatedFrom: composer._id });
        expect(copy).toBeNull();
      });

      it('does not create a copy when the child client has a catalogueGroup filter but the composer has none', async () => {
        childClient = await buildChildClient({ catalogueGroup: 'Group A' });
        const composer = await buildComposer({ catalogueGroups: [] }).save();
        const copy = await Composer.findOne({ clientId: childClient._id, duplicatedFrom: composer._id });
        expect(copy).toBeNull();
      });

      it('creates copies in multiple child clients', async () => {
        childClient = await buildChildClient();
        const secondChildClient = await buildChildClient();
        const composer = await buildComposer().save();
        const copies = await Composer.find({ duplicatedFrom: composer._id });
        expect(copies).toHaveLength(2);
        await testUtils.cleanUpAsync(secondChildClient._id.toString());
      });
    });

    describe('copy fidelity', () => {
      it('sets clientId on the copied composer to the child client\'s ID', async () => {
        childClient = await buildChildClient();
        const composer = await buildComposer().save();
        const copy = await Composer.findOne({ clientId: childClient._id, duplicatedFrom: composer._id });
        expect(copy.clientId.toString()).toBe(childClient._id.toString());
      });

      it('sets duplicatedFrom on the copied composer to the parent composer\'s ID', async () => {
        childClient = await buildChildClient();
        const composer = await buildComposer().save();
        const copy = await Composer.findOne({ clientId: childClient._id, duplicatedFrom: composer._id });
        expect(copy.duplicatedFrom.toString()).toBe(composer._id.toString());
      });

      it('copies name to the child composer', async () => {
        childClient = await buildChildClient();
        const composerName = randomString();
        const composer = await buildComposer({ name: composerName }).save();
        const copy = await Composer.findOne({ clientId: childClient._id, duplicatedFrom: composer._id });
        expect(copy.name).toBe(composerName);
      });

      it('copies cae to the child composer (as-is, no padding to 11 digits)', async () => {
        childClient = await buildChildClient();
        const composer = await buildComposer({ cae: 'ABC123' }).save();
        const copy = await Composer.findOne({ clientId: childClient._id, duplicatedFrom: composer._id });
        expect(copy.cae).toBe(composer.cae);
      });

      it('copies controlled to the child composer', async () => {
        childClient = await buildChildClient();
        const composer = await buildComposer({ controlled: true }).save();
        const copy = await Composer.findOne({ clientId: childClient._id, duplicatedFrom: composer._id });
        expect(copy.controlled).toBe(true);
      });

      it('copies notes to the child composer', async () => {
        childClient = await buildChildClient();
        const notes = randomString();
        const composer = await buildComposer({ notes }).save();
        const copy = await Composer.findOne({ clientId: childClient._id, duplicatedFrom: composer._id });
        expect(copy.notes).toBe(notes);
      });

      it('copies firstName to the child composer', async () => {
        childClient = await buildChildClient();
        const firstName = randomString();
        const composer = await buildComposer({ firstName }).save();
        const copy = await Composer.findOne({ clientId: childClient._id, duplicatedFrom: composer._id });
        expect(copy.firstName).toBe(firstName);
      });

      it('copies surname to the child composer', async () => {
        childClient = await buildChildClient();
        const surname = randomString();
        const composer = await buildComposer({ surname }).save();
        const copy = await Composer.findOne({ clientId: childClient._id, duplicatedFrom: composer._id });
        expect(copy.surname).toBe(surname);
      });
    });

    describe('idempotency', () => {
      it('does not create a duplicate copy on re-save', async () => {
        childClient = await buildChildClient();
        const composer = await buildComposer().save();
        composer.notes = randomString();
        await composer.save();
        const copies = await Composer.find({ clientId: childClient._id, duplicatedFrom: composer._id });
        expect(copies).toHaveLength(1);
      });

      it('updates the existing copy with the new values on re-save', async () => {
        childClient = await buildChildClient();
        const composer = await buildComposer().save();
        const newName = randomString();
        composer.name = newName;
        await composer.save();
        const copy = await Composer.findOne({ clientId: childClient._id, duplicatedFrom: composer._id });
        expect(copy.name).toBe(newName);
      });
    });
  });
});
