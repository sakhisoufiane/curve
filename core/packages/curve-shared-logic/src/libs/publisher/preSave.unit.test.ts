import { testUtils } from '@curveroyaltysystems/platform-shared-utils';
import {
  potentialDuplicateCount,
  normalizeCae,
  filterPublisherAgreements,
  preSaveValidation,
  setLowerCaseName,
  issuePartyNo,
  issueInterestedPartyId,
  validateInterestedPartyId,
} from './preSave';
import { makePublisher, asPublisher, mockPublisherModel, asModel, mockQuery } from './testUtils';

const { randomId } = testUtils;

describe('potentialDuplicateCount', () => {
  it('sets potentialDuplicatesCount to the length of potentialDuplicates', () => {
    const publisher = makePublisher({ potentialDuplicates: [{}, {}] });
    potentialDuplicateCount(asPublisher(publisher));
    expect(publisher.potentialDuplicatesCount).toBe(2);
  });

  it('sets potentialDuplicatesCount to 0 when potentialDuplicates is an empty array', () => {
    const publisher = makePublisher({ potentialDuplicates: [] });
    potentialDuplicateCount(asPublisher(publisher));
    expect(publisher.potentialDuplicatesCount).toBe(0);
  });

  it('sets potentialDuplicatesCount to 0 when potentialDuplicates is undefined', () => {
    const publisher = makePublisher({ potentialDuplicates: undefined });
    potentialDuplicateCount(asPublisher(publisher));
    expect(publisher.potentialDuplicatesCount).toBe(0);
  });
});

describe('normalizeCae', () => {
  it('sets default values when cae is undefined', () => {
    const publisher = makePublisher({ cae: undefined });
    normalizeCae(asPublisher(publisher));
    expect(publisher.cae).toBe('00000000000');
    expect(publisher.caeWithoutLeadingZeros).toBe('');
  });

  it('sets default values when cae is null', () => {
    const publisher = makePublisher({ cae: null });
    normalizeCae(asPublisher(publisher));
    expect(publisher.cae).toBe('00000000000');
    expect(publisher.caeWithoutLeadingZeros).toBe('');
  });

  it('sets default values when cae is an empty string', () => {
    const publisher = makePublisher({ cae: '' });
    normalizeCae(asPublisher(publisher));
    expect(publisher.cae).toBe('00000000000');
    expect(publisher.caeWithoutLeadingZeros).toBe('');
  });

  it('sets default values when cae is "0"', () => {
    const publisher = makePublisher({ cae: '0' });
    normalizeCae(asPublisher(publisher));
    expect(publisher.cae).toBe('00000000000');
    expect(publisher.caeWithoutLeadingZeros).toBe('');
  });

  it('strips non-alphanumeric characters', () => {
    const publisher = makePublisher({ cae: 'abc-123!@#' });
    normalizeCae(asPublisher(publisher));
    expect(publisher.cae).toBe('abc123');
    expect(publisher.caeWithoutLeadingZeros).toBe('abc123');
  });

  it('preserves leading zeros in cae but strips them in caeWithoutLeadingZeros', () => {
    const publisher = makePublisher({ cae: '00012345' });
    normalizeCae(asPublisher(publisher));
    expect(publisher.cae).toBe('00012345');
    expect(publisher.caeWithoutLeadingZeros).toBe('12345');
  });

  it('handles mixed characters and leading zeros correctly', () => {
    const publisher = makePublisher({ cae: '00-0abc123' });
    normalizeCae(asPublisher(publisher));
    expect(publisher.cae).toBe('000abc123');
    expect(publisher.caeWithoutLeadingZeros).toBe('abc123');
  });

  it('keeps an already-clean alphanumeric cae unchanged', () => {
    const publisher = makePublisher({ cae: 'ABC123xyz' });
    normalizeCae(asPublisher(publisher));
    expect(publisher.cae).toBe('ABC123xyz');
    expect(publisher.caeWithoutLeadingZeros).toBe('ABC123xyz');
  });

  it('results in empty caeWithoutLeadingZeros when cae contains only zeros', () => {
    const publisher = makePublisher({ cae: '000000' });
    normalizeCae(asPublisher(publisher));
    expect(publisher.cae).toBe('000000');
    expect(publisher.caeWithoutLeadingZeros).toBe('');
  });
});

describe('filterPublisherAgreements', () => {
  it('keeps an empty array unchanged', () => {
    const publisher = makePublisher({ publisherAgreements: [] });
    filterPublisherAgreements(asPublisher(publisher));
    expect(publisher.publisherAgreements).toEqual([]);
  });

  it('nullifies empty publisherId fields in agreement objects', () => {
    const publisher = makePublisher({ publisherAgreements: [{ publisherId: '' }, { publisherId: '' }] });
    filterPublisherAgreements(asPublisher(publisher));
    expect(publisher.publisherAgreements).toEqual([{ publisherId: null }, { publisherId: null }]);
  });

  it('nullifies only agreements with empty publisherId', () => {
    const publisher = makePublisher({ publisherAgreements: [{ publisherId: '' }, { publisherId: 'pub1' }] });
    filterPublisherAgreements(asPublisher(publisher));
    expect(publisher.publisherAgreements).toEqual([{ publisherId: null }, { publisherId: 'pub1' }]);
  });

  it('leaves the array unchanged when publisherId is not empty', () => {
    const publisher = makePublisher({ publisherAgreements: [{ publisherId: 'pub1' }, { publisherId: 'pub2' }] });
    filterPublisherAgreements(asPublisher(publisher));
    expect(publisher.publisherAgreements).toEqual([{ publisherId: 'pub1' }, { publisherId: 'pub2' }]);
  });

  it('nullifies empty composerId fields in agreement objects', () => {
    const publisher = makePublisher({ publisherAgreements: [{ composerId: '' }] });
    filterPublisherAgreements(asPublisher(publisher));
    expect(publisher.publisherAgreements).toEqual([{ composerId: null }]);
  });

  it('nullifies empty contractId fields in agreement objects', () => {
    const publisher = makePublisher({ publisherAgreements: [{ contractId: '' }] });
    filterPublisherAgreements(asPublisher(publisher));
    expect(publisher.publisherAgreements).toEqual([{ contractId: null }]);
  });

  it('no-ops when publisherAgreements is not an array', () => {
    const publisher = makePublisher({ publisherAgreements: undefined });
    filterPublisherAgreements(asPublisher(publisher));
    expect(publisher.publisherAgreements).toBeUndefined();
  });
});

describe('preSaveValidation', () => {
  describe('name', () => {
    it('throws when name is missing', async () => {
      const Publisher = mockPublisherModel();
      const publisher = makePublisher({ name: null });
      await expect(preSaveValidation(asPublisher(publisher), asModel(Publisher))).rejects.toThrow('Name is required');
    });

    it('does not throw when name is defined', async () => {
      const Publisher = mockPublisherModel();
      const publisher = makePublisher({ cae: '00000000000', caeWithoutLeadingZeros: '' });
      await expect(preSaveValidation(asPublisher(publisher), asModel(Publisher))).resolves.toBeUndefined();
    });
  });

  describe('CAE uniqueness', () => {
    it('does not throw when CAE is unique', async () => {
      const Publisher = mockPublisherModel({ countDocuments: jest.fn().mockResolvedValue(0) });
      const publisher = makePublisher({ cae: 'ABC123', caeWithoutLeadingZeros: 'ABC123' });
      await expect(preSaveValidation(asPublisher(publisher), asModel(Publisher))).resolves.toBeUndefined();
    });

    it('throws "CAE is required to be unique" when a duplicate non-empty CAE exists', async () => {
      const Publisher = mockPublisherModel({ countDocuments: jest.fn().mockResolvedValue(1) });
      const publisher = makePublisher({ cae: 'ABC123', caeWithoutLeadingZeros: 'ABC123' });
      await expect(preSaveValidation(asPublisher(publisher), asModel(Publisher))).rejects.toThrow(
        'CAE is required to be unique'
      );
    });

    it('throws "CAE can not be empty" when CAE is empty and a publisher with the same name exists', async () => {
      const Publisher = mockPublisherModel({ countDocuments: jest.fn().mockResolvedValue(1) });
      const publisher = makePublisher({ name: 'My Publisher', cae: '00000000000', caeWithoutLeadingZeros: '' });
      await expect(preSaveValidation(asPublisher(publisher), asModel(Publisher))).rejects.toThrow(
        'CAE can not be empty'
      );
    });

    it('does not throw when CAE is empty and name is unique', async () => {
      const Publisher = mockPublisherModel({ countDocuments: jest.fn().mockResolvedValue(0) });
      const publisher = makePublisher({ cae: '00000000000', caeWithoutLeadingZeros: '' });
      await expect(preSaveValidation(asPublisher(publisher), asModel(Publisher))).resolves.toBeUndefined();
    });

    it('does not throw when the conflicting publisher is excluded via excludeIds', async () => {
      // countDocuments returns 0 — the excluded id is filtered out by the $and conditions
      const Publisher = mockPublisherModel({ countDocuments: jest.fn().mockResolvedValue(0) });
      const publisher = makePublisher({ cae: 'ABC123', caeWithoutLeadingZeros: 'ABC123' });
      await expect(
        preSaveValidation(asPublisher(publisher), asModel(Publisher), [randomId()])
      ).resolves.toBeUndefined();
    });
  });

  describe('alias validation', () => {
    it('only checks the primary name against other aliases when aliases is empty', async () => {
      const Publisher = mockPublisherModel();
      const publisher = makePublisher({ aliases: [] });
      await preSaveValidation(asPublisher(publisher), asModel(Publisher));
      expect(Publisher.findOne).toHaveBeenCalledTimes(1);
      expect(Publisher.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ aliases: expect.objectContaining({ $regex: expect.any(RegExp) }) })
      );
    });

    it('throws when an alias is an empty string', async () => {
      const Publisher = mockPublisherModel();
      const publisher = makePublisher({ aliases: ['Valid Alias', ''] });
      await expect(preSaveValidation(asPublisher(publisher), asModel(Publisher))).rejects.toThrow('Alias cannot be empty');
    });

    it('throws when an alias is whitespace only', async () => {
      const Publisher = mockPublisherModel();
      const publisher = makePublisher({ aliases: ['   '] });
      await expect(preSaveValidation(asPublisher(publisher), asModel(Publisher))).rejects.toThrow('Alias cannot be empty');
    });

    it('throws when the same alias appears twice (case-insensitive)', async () => {
      const Publisher = mockPublisherModel();
      const publisher = makePublisher({ aliases: ['My Alias', 'my alias'] });
      await expect(preSaveValidation(asPublisher(publisher), asModel(Publisher))).rejects.toThrow(
        "Duplicate alias 'My Alias' within the same publisher"
      );
    });

    it('throws when an alias matches the publisher primary name (case-insensitive)', async () => {
      const Publisher = mockPublisherModel();
      const publisher = makePublisher({ name: 'Test Publisher', aliases: ['test publisher'] });
      await expect(preSaveValidation(asPublisher(publisher), asModel(Publisher))).rejects.toThrow(
        "Alias 'test publisher' matches the publisher's own name"
      );
    });

    it('throws when an alias matches another publisher primary name', async () => {
      const conflictingPublisher = { _id: randomId(), lowerCaseName: 'other publisher', name: 'Other Publisher', aliases: [] };
      const Publisher = mockPublisherModel({
        findOne: jest.fn().mockReturnValue(mockQuery(conflictingPublisher)),
      });
      const publisher = makePublisher({ aliases: ['Other Publisher'] });
      await expect(preSaveValidation(asPublisher(publisher), asModel(Publisher))).rejects.toThrow(
        "Cannot add alias 'Other Publisher'. This is the primary name of another publisher."
      );
    });

    it('throws when an alias is already used by another publisher', async () => {
      const conflictingPublisher = { _id: randomId(), name: 'Other Publisher', aliases: ['shared alias'] };
      const Publisher = mockPublisherModel({
        findOne: jest.fn()
          .mockReturnValueOnce(mockQuery(null))
          .mockReturnValue(mockQuery(conflictingPublisher)),
      });
      const publisher = makePublisher({ aliases: ['Shared Alias'] });
      await expect(preSaveValidation(asPublisher(publisher), asModel(Publisher))).rejects.toThrow(
        "Cannot add alias 'Shared Alias'. This alias is already used by publisher 'Other Publisher'."
      );
    });

    it('throws when the publisher primary name conflicts with another publisher alias', async () => {
      const conflictingPublisher = { _id: randomId(), name: 'Other Publisher', aliases: ['Test Publisher'] };
      const Publisher = mockPublisherModel({
        findOne: jest.fn()
          .mockReturnValueOnce(mockQuery(null))
          .mockReturnValueOnce(mockQuery(null))
          .mockReturnValue(mockQuery(conflictingPublisher)),
      });
      const publisher = makePublisher({ name: 'Test Publisher', aliases: ['Unique Alias'] });
      await expect(preSaveValidation(asPublisher(publisher), asModel(Publisher))).rejects.toThrow(
        "The name 'Test Publisher' conflicts with an alias on publisher 'Other Publisher'."
      );
    });

    it('does not throw when aliases are valid and unique', async () => {
      const Publisher = mockPublisherModel({
        findOne: jest.fn().mockReturnValue(mockQuery(null)),
      });
      const publisher = makePublisher({ aliases: ['Alias One', 'Alias Two'] });
      await expect(preSaveValidation(asPublisher(publisher), asModel(Publisher))).resolves.toBeUndefined();
    });
  });
});

describe('setLowerCaseName', () => {
  it('converts an uppercase name to lowercase', () => {
    const publisher = makePublisher({ name: 'MyPublisher' });
    setLowerCaseName(asPublisher(publisher));
    expect(publisher.lowerCaseName).toBe('mypublisher');
  });

  it('keeps an already-lowercase name unchanged', () => {
    const publisher = makePublisher({ name: 'mypublisher' });
    setLowerCaseName(asPublisher(publisher));
    expect(publisher.lowerCaseName).toBe('mypublisher');
  });

  it('lowercases a mixed-case name', () => {
    const publisher = makePublisher({ name: 'MiXeDCaSe123' });
    setLowerCaseName(asPublisher(publisher));
    expect(publisher.lowerCaseName).toBe('mixedcase123');
  });

  it('leaves numbers and special characters unchanged', () => {
    const publisher = makePublisher({ name: 'Publisher123!@#' });
    setLowerCaseName(asPublisher(publisher));
    expect(publisher.lowerCaseName).toBe('publisher123!@#');
  });
});

describe('issuePartyNo', () => {
  it('assigns partyNo: 1 when no other publishers exist for the client', async () => {
    const Publisher = mockPublisherModel({
      countDocuments: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockReturnValue(mockQuery([])),
    });
    const publisher = makePublisher();
    await issuePartyNo(asPublisher(publisher), asModel(Publisher));
    expect(publisher.partyNo).toBe(1);
  });

  it('assigns max(partyNo) + 1 when other publishers already exist', async () => {
    const Publisher = mockPublisherModel({
      countDocuments: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockReturnValue(mockQuery([{ partyNo: 5 }])),
    });
    const publisher = makePublisher();
    await issuePartyNo(asPublisher(publisher), asModel(Publisher));
    expect(publisher.partyNo).toBe(6);
  });

  it('keeps an existing partyNo when it is unique across the client', async () => {
    const Publisher = mockPublisherModel({
      countDocuments: jest.fn().mockResolvedValue(0),
    });
    const publisher = makePublisher({ partyNo: 7 });
    await issuePartyNo(asPublisher(publisher), asModel(Publisher));
    expect(publisher.partyNo).toBe(7);
  });

  it('re-issues a new partyNo when the existing one conflicts with another publisher', async () => {
    const Publisher = mockPublisherModel({
      countDocuments: jest.fn().mockResolvedValue(1),
      find: jest.fn().mockReturnValue(mockQuery([{ partyNo: 5 }])),
    });
    const publisher = makePublisher({ partyNo: 5 });
    await issuePartyNo(asPublisher(publisher), asModel(Publisher));
    expect(publisher.partyNo).toBe(6);
  });
});

describe('issueInterestedPartyId', () => {
  it('skips assignment when interestedPartyId is already set', async () => {
    const Publisher = mockPublisherModel();
    const publisher = makePublisher({ partyNo: 2, interestedPartyId: 'P00000002' });
    await issueInterestedPartyId(asPublisher(publisher), asModel(Publisher));
    expect(publisher.interestedPartyId).toBe('P00000002');
    expect(Publisher.findOne).not.toHaveBeenCalled();
  });

  it('assigns a zero-padded interestedPartyId derived from partyNo', async () => {
    const Publisher = mockPublisherModel();
    const publisher = makePublisher({ partyNo: 2 });
    await issueInterestedPartyId(asPublisher(publisher), asModel(Publisher));
    expect(publisher.interestedPartyId).toBe('P00000002');
  });

  it('always produces a 9-character string', async () => {
    const Publisher = mockPublisherModel();
    const publisher = makePublisher({ partyNo: 2 });
    await issueInterestedPartyId(asPublisher(publisher), asModel(Publisher));
    expect(typeof publisher.interestedPartyId).toBe('string');
    expect((publisher.interestedPartyId as string).length).toBe(9);
  });

  it('throws when the computed interestedPartyId already exists for another publisher', async () => {
    const Publisher = mockPublisherModel({
      findOne: jest.fn().mockReturnValue(mockQuery({ _id: randomId(), interestedPartyId: 'P00000002' })),
    });
    const publisher = makePublisher({ partyNo: 2 });
    await expect(issueInterestedPartyId(asPublisher(publisher), asModel(Publisher))).rejects.toThrow(
      'Interested Party ID P00000002 already exists'
    );
  });
});

describe('validateInterestedPartyId', () => {
  it('does not throw when interestedPartyId is unique within the client', async () => {
    const Publisher = mockPublisherModel({ find: jest.fn().mockReturnValue(mockQuery([])) });
    const publisher = makePublisher({ interestedPartyId: 'P00000001' });
    await expect(validateInterestedPartyId(asPublisher(publisher), asModel(Publisher))).resolves.toBeUndefined();
  });

  it('throws when interestedPartyId already exists for a different publisher in the same client', async () => {
    const Publisher = mockPublisherModel({
      find: jest.fn().mockReturnValue(mockQuery([{ _id: randomId(), interestedPartyId: 'P00000001' }])),
    });
    const publisher = makePublisher({ interestedPartyId: 'P00000001' });
    await expect(validateInterestedPartyId(asPublisher(publisher), asModel(Publisher))).rejects.toThrow(
      'Interested Party ID P00000001 already exists'
    );
  });

  it('passes excludeIds to the query via $nin', async () => {
    const excludeId = randomId();
    const Publisher = mockPublisherModel({ find: jest.fn().mockReturnValue(mockQuery([])) });
    const publisher = makePublisher({ interestedPartyId: 'P00000001' });
    await validateInterestedPartyId(asPublisher(publisher), asModel(Publisher), [excludeId]);
    expect(Publisher.find).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: { $nin: [publisher._id, excludeId] },
      })
    );
  });

  it('does not throw when the only conflict is excluded via excludeIds', async () => {
    const Publisher = mockPublisherModel({ find: jest.fn().mockReturnValue(mockQuery([])) });
    const publisher = makePublisher({ interestedPartyId: 'P00000001' });
    await expect(
      validateInterestedPartyId(asPublisher(publisher), asModel(Publisher), [randomId()])
    ).resolves.toBeUndefined();
  });
});
