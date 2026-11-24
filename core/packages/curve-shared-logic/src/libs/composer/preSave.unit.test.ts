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
  updateComposerWorks,
} from './preSave';
import { makeComposer, asComposer, mockComposerModel, mockWorkModel, asModel, mockQuery } from './testUtils';

const { randomId } = testUtils;

describe('potentialDuplicateCount', () => {
  it('sets potentialDuplicatesCount to the length of potentialDuplicates', () => {
    const composer = makeComposer({ potentialDuplicates: [{}, {}] });
    potentialDuplicateCount(asComposer(composer));
    expect(composer.potentialDuplicatesCount).toBe(2);
  });

  it('sets potentialDuplicatesCount to 0 when potentialDuplicates is an empty array', () => {
    const composer = makeComposer({ potentialDuplicates: [] });
    potentialDuplicateCount(asComposer(composer));
    expect(composer.potentialDuplicatesCount).toBe(0);
  });

  it('sets potentialDuplicatesCount to 0 when potentialDuplicates is undefined', () => {
    const composer = makeComposer({ potentialDuplicates: undefined });
    potentialDuplicateCount(asComposer(composer));
    expect(composer.potentialDuplicatesCount).toBe(0);
  });
});

describe('normalizeCae', () => {
  it('sets default values when cae is undefined', () => {
    const composer = makeComposer({ cae: undefined });
    normalizeCae(asComposer(composer));
    expect(composer.cae).toBe('00000000000');
    expect(composer.caeWithoutLeadingZeros).toBe('');
  });

  it('sets default values when cae is null', () => {
    const composer = makeComposer({ cae: null });
    normalizeCae(asComposer(composer));
    expect(composer.cae).toBe('00000000000');
    expect(composer.caeWithoutLeadingZeros).toBe('');
  });

  it('sets default values when cae is an empty string', () => {
    const composer = makeComposer({ cae: '' });
    normalizeCae(asComposer(composer));
    expect(composer.cae).toBe('00000000000');
    expect(composer.caeWithoutLeadingZeros).toBe('');
  });

  it('sets default values when cae is "0"', () => {
    const composer = makeComposer({ cae: '0' });
    normalizeCae(asComposer(composer));
    expect(composer.cae).toBe('00000000000');
    expect(composer.caeWithoutLeadingZeros).toBe('');
  });

  it('strips non-alphanumeric characters', () => {
    const composer = makeComposer({ cae: 'abc-123!@#' });
    normalizeCae(asComposer(composer));
    expect(composer.cae).toBe('abc123');
    expect(composer.caeWithoutLeadingZeros).toBe('abc123');
  });

  it('preserves leading zeros in cae but strips them in caeWithoutLeadingZeros', () => {
    const composer = makeComposer({ cae: '00012345' });
    normalizeCae(asComposer(composer));
    expect(composer.cae).toBe('00012345');
    expect(composer.caeWithoutLeadingZeros).toBe('12345');
  });

  it('handles mixed characters and leading zeros correctly', () => {
    const composer = makeComposer({ cae: '00-0abc123' });
    normalizeCae(asComposer(composer));
    expect(composer.cae).toBe('000abc123');
    expect(composer.caeWithoutLeadingZeros).toBe('abc123');
  });

  it('keeps an already-clean alphanumeric cae unchanged', () => {
    const composer = makeComposer({ cae: 'ABC123xyz' });
    normalizeCae(asComposer(composer));
    expect(composer.cae).toBe('ABC123xyz');
    expect(composer.caeWithoutLeadingZeros).toBe('ABC123xyz');
  });

  it('results in empty caeWithoutLeadingZeros when cae contains only zeros', () => {
    const composer = makeComposer({ cae: '000000' });
    normalizeCae(asComposer(composer));
    expect(composer.cae).toBe('000000');
    expect(composer.caeWithoutLeadingZeros).toBe('');
  });
});

describe('filterPublisherAgreements', () => {
  it('keeps an empty array unchanged', () => {
    const composer = makeComposer({ publisherAgreements: [] });
    filterPublisherAgreements(asComposer(composer));
    expect(composer.publisherAgreements).toEqual([]);
  });

  it('nullifies empty publisherId fields in agreement objects', () => {
    const composer = makeComposer({ publisherAgreements: [{ publisherId: '' }, { publisherId: '' }] });
    filterPublisherAgreements(asComposer(composer));
    expect(composer.publisherAgreements).toEqual([{ publisherId: null }, { publisherId: null }]);
  });

  it('nullifies only agreements with empty publisherId', () => {
    const composer = makeComposer({ publisherAgreements: [{ publisherId: '' }, { publisherId: 'pub1' }] });
    filterPublisherAgreements(asComposer(composer));
    expect(composer.publisherAgreements).toEqual([{ publisherId: null }, { publisherId: 'pub1' }]);
  });

  it('leaves the array unchanged when publisherId is not empty', () => {
    const composer = makeComposer({ publisherAgreements: [{ publisherId: 'pub1' }, { publisherId: 'pub2' }] });
    filterPublisherAgreements(asComposer(composer));
    expect(composer.publisherAgreements).toEqual([{ publisherId: 'pub1' }, { publisherId: 'pub2' }]);
  });

  it('nullifies empty composerId fields in agreement objects', () => {
    const composer = makeComposer({ publisherAgreements: [{ composerId: '' }] });
    filterPublisherAgreements(asComposer(composer));
    expect(composer.publisherAgreements).toEqual([{ composerId: null }]);
  });

  it('nullifies empty contractId fields in agreement objects', () => {
    const composer = makeComposer({ publisherAgreements: [{ contractId: '' }] });
    filterPublisherAgreements(asComposer(composer));
    expect(composer.publisherAgreements).toEqual([{ contractId: null }]);
  });

  it('no-ops when publisherAgreements is not an array', () => {
    const composer = makeComposer({ publisherAgreements: undefined });
    filterPublisherAgreements(asComposer(composer));
    expect(composer.publisherAgreements).toBeUndefined();
  });
});

describe('preSaveValidation', () => {
  describe('name', () => {
    it('throws when name is missing', async () => {
      const Composer = mockComposerModel();
      const composer = makeComposer({ name: null });
      await expect(preSaveValidation(asComposer(composer), asModel(Composer))).rejects.toThrow('Name is required');
    });

    it('does not throw when name is defined', async () => {
      const Composer = mockComposerModel();
      const composer = makeComposer({ cae: '00000000000', caeWithoutLeadingZeros: '' });
      await expect(preSaveValidation(asComposer(composer), asModel(Composer))).resolves.toBeUndefined();
    });
  });

  describe('CAE uniqueness', () => {
    it('does not throw when CAE is unique', async () => {
      const Composer = mockComposerModel({ countDocuments: jest.fn().mockResolvedValue(0) });
      const composer = makeComposer({ cae: 'ABC123', caeWithoutLeadingZeros: 'ABC123' });
      await expect(preSaveValidation(asComposer(composer), asModel(Composer))).resolves.toBeUndefined();
    });

    it('throws "CAE is required to be unique" when a duplicate non-empty CAE exists', async () => {
      const Composer = mockComposerModel({ countDocuments: jest.fn().mockResolvedValue(1) });
      const composer = makeComposer({ cae: 'ABC123', caeWithoutLeadingZeros: 'ABC123' });
      await expect(preSaveValidation(asComposer(composer), asModel(Composer))).rejects.toThrow(
        'CAE is required to be unique'
      );
    });

    it('throws "CAE can not be empty" when CAE is empty and a composer with the same name exists', async () => {
      const Composer = mockComposerModel({ countDocuments: jest.fn().mockResolvedValue(1) });
      const composer = makeComposer({ name: 'My Composer', cae: '00000000000', caeWithoutLeadingZeros: '' });
      await expect(preSaveValidation(asComposer(composer), asModel(Composer))).rejects.toThrow('CAE can not be empty');
    });

    it('does not throw when CAE is empty and name is unique', async () => {
      const Composer = mockComposerModel({ countDocuments: jest.fn().mockResolvedValue(0) });
      const composer = makeComposer({ cae: '00000000000', caeWithoutLeadingZeros: '' });
      await expect(preSaveValidation(asComposer(composer), asModel(Composer))).resolves.toBeUndefined();
    });

    it('does not throw when the conflicting composer is excluded via excludeIds', async () => {
      const Composer = mockComposerModel({ countDocuments: jest.fn().mockResolvedValue(0) });
      const composer = makeComposer({ cae: 'ABC123', caeWithoutLeadingZeros: 'ABC123' });
      await expect(preSaveValidation(asComposer(composer), asModel(Composer), [randomId()])).resolves.toBeUndefined();
    });
  });
});

describe('setLowerCaseName', () => {
  it('converts an uppercase name to lowercase', () => {
    const composer = makeComposer({ name: 'MyComposer' });
    setLowerCaseName(asComposer(composer));
    expect(composer.lowerCaseName).toBe('mycomposer');
  });

  it('keeps an already-lowercase name unchanged', () => {
    const composer = makeComposer({ name: 'mycomposer' });
    setLowerCaseName(asComposer(composer));
    expect(composer.lowerCaseName).toBe('mycomposer');
  });

  it('lowercases a mixed-case name', () => {
    const composer = makeComposer({ name: 'MiXeDCaSe123' });
    setLowerCaseName(asComposer(composer));
    expect(composer.lowerCaseName).toBe('mixedcase123');
  });

  it('leaves numbers and special characters unchanged', () => {
    const composer = makeComposer({ name: 'Composer123!@#' });
    setLowerCaseName(asComposer(composer));
    expect(composer.lowerCaseName).toBe('composer123!@#');
  });
});

describe('issuePartyNo', () => {
  it('assigns partyNo: 1 when no other composers exist for the client', async () => {
    const Composer = mockComposerModel({
      countDocuments: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockReturnValue(mockQuery([])),
    });
    const composer = makeComposer();
    await issuePartyNo(asComposer(composer), asModel(Composer));
    expect(composer.partyNo).toBe(1);
  });

  it('assigns max(partyNo) + 1 when other composers already exist', async () => {
    const Composer = mockComposerModel({
      countDocuments: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockReturnValue(mockQuery([{ partyNo: 5 }])),
    });
    const composer = makeComposer();
    await issuePartyNo(asComposer(composer), asModel(Composer));
    expect(composer.partyNo).toBe(6);
  });

  it('keeps an existing partyNo when it is unique across the client', async () => {
    const Composer = mockComposerModel({
      countDocuments: jest.fn().mockResolvedValue(0),
    });
    const composer = makeComposer({ partyNo: 7 });
    await issuePartyNo(asComposer(composer), asModel(Composer));
    expect(composer.partyNo).toBe(7);
  });

  it('re-issues a new partyNo when the existing one conflicts with another composer', async () => {
    const Composer = mockComposerModel({
      countDocuments: jest.fn().mockResolvedValue(1),
      find: jest.fn().mockReturnValue(mockQuery([{ partyNo: 5 }])),
    });
    const composer = makeComposer({ partyNo: 5 });
    await issuePartyNo(asComposer(composer), asModel(Composer));
    expect(composer.partyNo).toBe(6);
  });
});

describe('issueInterestedPartyId', () => {
  it('skips assignment when interestedPartyId is already set', async () => {
    const Composer = mockComposerModel();
    const composer = makeComposer({ partyNo: 2, interestedPartyId: 'C00000002' });
    await issueInterestedPartyId(asComposer(composer), asModel(Composer));
    expect(composer.interestedPartyId).toBe('C00000002');
    expect(Composer.findOne).not.toHaveBeenCalled();
  });

  it('assigns a zero-padded interestedPartyId with "C" prefix derived from partyNo', async () => {
    const Composer = mockComposerModel();
    const composer = makeComposer({ partyNo: 2 });
    await issueInterestedPartyId(asComposer(composer), asModel(Composer));
    expect(composer.interestedPartyId).toBe('C00000002');
  });

  it('always produces a 9-character string', async () => {
    const Composer = mockComposerModel();
    const composer = makeComposer({ partyNo: 2 });
    await issueInterestedPartyId(asComposer(composer), asModel(Composer));
    expect(typeof composer.interestedPartyId).toBe('string');
    expect((composer.interestedPartyId as string).length).toBe(9);
  });

  it('throws when the computed interestedPartyId already exists for another composer', async () => {
    const Composer = mockComposerModel({
      findOne: jest.fn().mockReturnValue(mockQuery({ _id: randomId(), interestedPartyId: 'C00000002' })),
    });
    const composer = makeComposer({ partyNo: 2 });
    await expect(issueInterestedPartyId(asComposer(composer), asModel(Composer))).rejects.toThrow(
      'Interested Party ID C00000002 already exists'
    );
  });

  it('throws when partyNo is not set (guard against misuse outside the save flow)', async () => {
    const Composer = mockComposerModel();
    const composer = makeComposer({ partyNo: undefined });
    await expect(issueInterestedPartyId(asComposer(composer), asModel(Composer))).rejects.toThrow(
      'An error occurred, the Party Number is required.'
    );
  });
});

describe('validateInterestedPartyId', () => {
  it('does not throw when interestedPartyId is unique within the client', async () => {
    const Composer = mockComposerModel({ find: jest.fn().mockReturnValue(mockQuery([])) });
    const composer = makeComposer({ interestedPartyId: 'C00000001' });
    await expect(validateInterestedPartyId(asComposer(composer), asModel(Composer))).resolves.toBeUndefined();
  });

  it('throws when interestedPartyId already exists for a different composer in the same client', async () => {
    const Composer = mockComposerModel({
      find: jest.fn().mockReturnValue(mockQuery([{ _id: randomId(), interestedPartyId: 'C00000001' }])),
    });
    const composer = makeComposer({ interestedPartyId: 'C00000001' });
    await expect(validateInterestedPartyId(asComposer(composer), asModel(Composer))).rejects.toThrow(
      'Interested Party ID C00000001 already exists'
    );
  });

  it('passes excludeIds to the query via $nin', async () => {
    const excludeId = randomId();
    const Composer = mockComposerModel({ find: jest.fn().mockReturnValue(mockQuery([])) });
    const composer = makeComposer({ interestedPartyId: 'C00000001' });
    await validateInterestedPartyId(asComposer(composer), asModel(Composer), [excludeId]);
    expect(Composer.find).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: { $nin: [composer._id, excludeId] },
      })
    );
  });

  it('does not throw when the only conflict is excluded via excludeIds', async () => {
    const Composer = mockComposerModel({ find: jest.fn().mockReturnValue(mockQuery([])) });
    const composer = makeComposer({ interestedPartyId: 'C00000001' });
    await expect(
      validateInterestedPartyId(asComposer(composer), asModel(Composer), [randomId()])
    ).resolves.toBeUndefined();
  });
});

describe('updateComposerWorks', () => {
  function makeChainComposer(composerId: string, overrides: Record<string, unknown> = {}) {
    return {
      type: 'Composer',
      composerId,
      caeNumber: 'OLDCAE',
      name: 'Old Name',
      ...overrides,
    };
  }

  function makeWork(composerId: string, chainOverrides: Record<string, unknown> = {}) {
    return {
      _id: randomId(),
      rightsChain: [makeChainComposer(composerId, chainOverrides)],
    };
  }

  it('does nothing when no works reference the composer', async () => {
    const Work = mockWorkModel();
    const composer = makeComposer({ cae: 'NEWCAE' });
    await updateComposerWorks(asComposer(composer), asModel(Work));
    expect(Work.updateOne).not.toHaveBeenCalled();
  });

  it('does nothing when caeNumber and name are already up to date', async () => {
    const composer = makeComposer({ cae: 'ABC123', name: 'My Composer' });
    const work = makeWork(composer._id as string, { caeNumber: 'ABC123', name: 'My Composer' });
    const Work = mockWorkModel({ find: jest.fn().mockReturnValue(mockQuery([work])) });
    await updateComposerWorks(asComposer(composer), asModel(Work));
    expect(Work.updateOne).not.toHaveBeenCalled();
  });

  it('updates caeNumber when it differs from composer.cae', async () => {
    const composer = makeComposer({ cae: 'NEWCAE', name: 'Old Name' });
    const work = makeWork(composer._id as string);
    const Work = mockWorkModel({ find: jest.fn().mockReturnValue(mockQuery([work])) });
    await updateComposerWorks(asComposer(composer), asModel(Work));
    expect(work.rightsChain[0]!.caeNumber).toBe('NEWCAE');
    expect(Work.updateOne).toHaveBeenCalledWith({ _id: work._id }, { $set: { rightsChain: work.rightsChain } });
  });

  it('updates name when it differs from composer.name', async () => {
    const composer = makeComposer({ cae: 'OLDCAE', name: 'New Name' });
    const work = makeWork(composer._id as string);
    const Work = mockWorkModel({ find: jest.fn().mockReturnValue(mockQuery([work])) });
    await updateComposerWorks(asComposer(composer), asModel(Work));
    expect(work.rightsChain[0]!.name).toBe('New Name');
    expect(Work.updateOne).toHaveBeenCalled();
  });

  it('updates both caeNumber and name when both differ', async () => {
    const composer = makeComposer({ cae: 'NEWCAE', name: 'New Name' });
    const work = makeWork(composer._id as string);
    const Work = mockWorkModel({ find: jest.fn().mockReturnValue(mockQuery([work])) });
    await updateComposerWorks(asComposer(composer), asModel(Work));
    expect(work.rightsChain[0]!.caeNumber).toBe('NEWCAE');
    expect(work.rightsChain[0]!.name).toBe('New Name');
    expect(Work.updateOne).toHaveBeenCalled();
  });

  it('updates caeNumber when it is not set on the chain node', async () => {
    const composer = makeComposer({ cae: 'NEWCAE', name: 'Old Name' });
    const work = makeWork(composer._id as string, { caeNumber: undefined });
    const Work = mockWorkModel({ find: jest.fn().mockReturnValue(mockQuery([work])) });
    await updateComposerWorks(asComposer(composer), asModel(Work));
    expect(work.rightsChain[0]!.caeNumber).toBe('NEWCAE');
    expect(Work.updateOne).toHaveBeenCalled();
  });

  it('traverses nested children to find composer nodes', async () => {
    const composer = makeComposer({ cae: 'NEWCAE', name: 'Old Name' });
    const work = {
      _id: randomId(),
      rightsChain: [
        {
          type: 'Publisher',
          children: [makeChainComposer(composer._id as string)],
        },
      ],
    };
    const Work = mockWorkModel({ find: jest.fn().mockReturnValue(mockQuery([work])) });
    await updateComposerWorks(asComposer(composer), asModel(Work));
    expect(work.rightsChain[0]!.children[0]!.caeNumber).toBe('NEWCAE');
    expect(Work.updateOne).toHaveBeenCalled();
  });

  it('throws when Work.updateOne fails', async () => {
    const composer = makeComposer({ cae: 'NEWCAE', name: 'Old Name' });
    const work = makeWork(composer._id as string);
    const Work = mockWorkModel({
      find: jest.fn().mockReturnValue(mockQuery([work])),
      updateOne: jest.fn().mockRejectedValue(new Error('DB error')),
    });
    await expect(updateComposerWorks(asComposer(composer), asModel(Work))).rejects.toThrow(
      'Error updating Composer works with new caeNumber number'
    );
  });
});
