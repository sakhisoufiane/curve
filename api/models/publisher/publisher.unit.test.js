jest.mock('../contract');
jest.mock('@curveroyaltysystems/platform-shared-utils', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  fileManager: {},
  createXlsx: {},
  configShared: { encryptedFields: { client: [] } },
  encryption: { encryptionPlugin: jest.fn() },
  testUtils: jest.requireActual('@curveroyaltysystems/platform-shared-utils').testUtils,
}));

const { Exports } = require('@curveroyaltysystems/curve-shared-logic');
const { testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');

const Publisher = require('./publisher');
const Contract = require('../contract');

describe('Publisher', () => {
  describe('convertPublishersForXlsx', () => {
    let clientId;

    beforeEach(() => {
      clientId = testUtils.randomString();
      jest.spyOn(Contract, 'find').mockResolvedValue([]);
      jest.spyOn(Publisher, 'findOne').mockResolvedValue([]);
      jest.spyOn(Publisher.prototype, 'exportData').mockReturnValue();
      jest.spyOn(Exports, 'getTemplate').mockResolvedValue('test');
    });

    it('should return an error if publishers is not an array', (done) => {
      Publisher.convertPublishersForXlsx('Test', clientId, (err, result) => {
        expect(err[0]).toEqual('Must be passed an Array of Publishers');
        done();
      });
    });

    it('should include interestedPartyId in the converted publishers', (done) => {
      const publisher = new Publisher({
        _id: testUtils.randomId(),
        name: testUtils.randomString(),
        interestedPartyId: testUtils.randomString(),
        linkedContracts: [],
        societies: [],
        publisherAgreements: [{ publisherId: testUtils.randomId() }],
      });

      Publisher.convertPublishersForXlsx([publisher], clientId, (err, result) => {
        expect(Contract.find).toHaveBeenCalled();
        expect(Publisher.findOne).toHaveBeenCalled();
        expect(Publisher.prototype.exportData).toHaveBeenCalled();
        done();
      });
    });

    it('should include aliases in export data at index 3 (Reference placeholder at index 4)', (done) => {
      const publisherId = testUtils.randomId();
      const publisherName = testUtils.randomString();
      const alias1 = testUtils.randomString();
      const alias2 = testUtils.randomString();
      const publisher = new Publisher({
        _id: publisherId,
        name: publisherName,
        interestedPartyId: testUtils.randomString(),
        linkedContracts: [],
        societies: [],
        publisherAgreements: [],
        aliases: [alias1, alias2],
      });

      jest.spyOn(Publisher.prototype, 'exportData').mockReturnValue(['id', publisherName]);

      Publisher.convertPublishersForXlsx([publisher], clientId, (err, result, template) => {
        expect(err).toBeNull();
        // result[3] should contain alias rows
        expect(result[3]).toEqual([
          [publisherId.toString(), publisherName, alias1],
          [publisherId.toString(), publisherName, alias2],
        ]);
        // result[4] should be empty (Reference placeholder)
        expect(result[4]).toEqual([]);
        done();
      });
    });

    it('should not include alias data if publisher has no aliases', (done) => {
      const publisherName = testUtils.randomString();
      const publisher = new Publisher({
        _id: testUtils.randomId(),
        name: publisherName,
        interestedPartyId: testUtils.randomString(),
        linkedContracts: [],
        societies: [],
        publisherAgreements: [],
        aliases: [],
      });

      jest.spyOn(Publisher.prototype, 'exportData').mockReturnValue(['id', publisherName]);

      Publisher.convertPublishersForXlsx([publisher], clientId, (err, result) => {
        expect(err).toBeNull();
        expect(result[3]).toEqual([]);
        done();
      });
    });

    it('should handle publisher with undefined aliases field', (done) => {
      const publisherName = testUtils.randomString();
      const publisher = new Publisher({
        _id: testUtils.randomId(),
        name: publisherName,
        interestedPartyId: testUtils.randomString(),
        linkedContracts: [],
        societies: [],
        publisherAgreements: [],
      });

      jest.spyOn(Publisher.prototype, 'exportData').mockReturnValue(['id', publisherName]);

      Publisher.convertPublishersForXlsx([publisher], clientId, (err, result) => {
        expect(err).toBeNull();
        expect(result).toHaveLength(5);
        expect(result[3]).toEqual([]);
        expect(result[4]).toEqual([]);
        done();
      });
    });

    it('should collect aliases from multiple publishers', (done) => {
      const pubId1 = testUtils.randomId();
      const pubId2 = testUtils.randomId();
      const name1 = testUtils.randomString();
      const name2 = testUtils.randomString();
      const aliasA = testUtils.randomString();
      const aliasB = testUtils.randomString();
      const aliasC = testUtils.randomString();
      const publisher1 = new Publisher({
        _id: pubId1,
        name: name1,
        interestedPartyId: testUtils.randomString(),
        linkedContracts: [],
        societies: [],
        publisherAgreements: [],
        aliases: [aliasA],
      });
      const publisher2 = new Publisher({
        _id: pubId2,
        name: name2,
        interestedPartyId: testUtils.randomString(),
        linkedContracts: [],
        societies: [],
        publisherAgreements: [],
        aliases: [aliasB, aliasC],
      });

      jest.spyOn(Publisher.prototype, 'exportData').mockReturnValue(['id', 'name']);

      Publisher.convertPublishersForXlsx([publisher1, publisher2], clientId, (err, result) => {
        const expectedAliases = [
          [pubId1.toString(), name1, aliasA],
          [pubId2.toString(), name2, aliasB],
          [pubId2.toString(), name2, aliasC],
        ];
        const sortRows = (rows) => rows.slice().sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
        expect(err).toBeNull();
        expect(result[3]).toHaveLength(3);
        expect(sortRows(result[3])).toEqual(sortRows(expectedAliases));
        done();
      });
    });
  });

  describe('importPublisherAliases', () => {
    let curveUser;
    let pubId;
    let pubName;
    let mockPub;

    beforeEach(() => {
      curveUser = { clientId: testUtils.randomId(), id: testUtils.randomId() };
      pubId = testUtils.randomId().toString();
      pubName = testUtils.randomString();
      mockPub = { _id: pubId, name: pubName, aliases: [], lowerCaseName: pubName.toLowerCase() };
      jest.restoreAllMocks();
    });

    it('should skip empty rows', (done) => {
      const aliasRows = [{}];
      Publisher.importPublisherAliases(aliasRows, [], curveUser, (errors) => {
        expect(errors).toEqual([]);
        done();
      });
    });

    it('should error when alias is empty', (done) => {
      const aliasRows = [{ _id: pubId, name: pubName, alias: '' }];
      Publisher.importPublisherAliases(aliasRows, [], curveUser, (errors) => {
        expect(errors.length).toBe(1);
        expect(errors[0]).toContain('Alias cannot be empty');
        done();
      });
    });

    it('should silently skip intra-file duplicate aliases for the same publisher (by ID)', (done) => {
      jest.spyOn(Publisher, 'findOne')
        .mockResolvedValueOnce(mockPub) // row 1: resolve publisher by ID
        .mockResolvedValueOnce(null) // row 1: no primary name conflict
        .mockResolvedValueOnce(null) // row 1: no alias conflict
        .mockResolvedValueOnce(mockPub); // row 2: resolve same publisher by ID — then caught by seenAliasesInFile

      const duplicateAlias = testUtils.randomString();
      const aliasRows = [
        { _id: pubId, name: pubName, alias: duplicateAlias },
        { _id: pubId, name: pubName, alias: duplicateAlias.toLowerCase() },
      ];

      Publisher.importPublisherAliases(aliasRows, [], curveUser, (errors) => {
        expect(errors).toEqual([]);
        // Only one alias should have been added (the first occurrence)
        expect(mockPub.aliases).toHaveLength(1);
        expect(mockPub.aliases[0]).toBe(duplicateAlias);
        done();
      });
    });

    it('should silently skip intra-file duplicate aliases for the same publisher resolved by name then ID', (done) => {
      jest.spyOn(Publisher, 'findOne')
        .mockResolvedValueOnce(mockPub) // row 1: resolve publisher by name
        .mockResolvedValueOnce(null) // row 1: no primary name conflict
        .mockResolvedValueOnce(null) // row 1: no alias conflict
        .mockResolvedValueOnce(mockPub); // row 2: resolve same publisher by ID — then caught by seenAliasesInFile

      const duplicateAlias = testUtils.randomString();
      const aliasRows = [
        { _id: '', name: pubName, alias: duplicateAlias },
        { _id: pubId, name: '', alias: duplicateAlias },
      ];

      Publisher.importPublisherAliases(aliasRows, [], curveUser, (errors) => {
        expect(errors).toEqual([]);
        expect(mockPub.aliases).toHaveLength(1);
        done();
      });
    });

    it('should error on intra-file duplicate aliases across different publishers', (done) => {
      const otherPubId = testUtils.randomId().toString();
      const otherPubName = testUtils.randomString();
      const otherPub = { _id: otherPubId, name: otherPubName, aliases: [], lowerCaseName: otherPubName.toLowerCase() };

      jest.spyOn(Publisher, 'findOne')
        .mockResolvedValueOnce(mockPub) // row 1: resolve first publisher
        .mockResolvedValueOnce(null) // row 1: no primary name conflict
        .mockResolvedValueOnce(null) // row 1: no alias conflict
        .mockResolvedValueOnce(otherPub); // row 2: resolve different publisher — then caught by seenAliasesInFile

      const sharedAlias = testUtils.randomString();
      const aliasRows = [
        { _id: pubId, name: pubName, alias: sharedAlias },
        { _id: otherPubId, name: otherPubName, alias: sharedAlias },
      ];

      Publisher.importPublisherAliases(aliasRows, [], curveUser, (errors) => {
        expect(errors.length).toBe(1);
        expect(errors[0]).toContain('already assigned to another publisher');
        done();
      });
    });

    it('should error when publisher is not found by ID', (done) => {
      jest.spyOn(Publisher, 'findOne').mockResolvedValue(null);

      const aliasRows = [{ _id: pubId, name: '', alias: testUtils.randomString() }];
      Publisher.importPublisherAliases(aliasRows, [], curveUser, (errors) => {
        expect(errors.length).toBe(1);
        expect(errors[0]).toContain('not found');
        done();
      });
    });

    it('should error when neither Publisher ID nor Publisher Name is provided', (done) => {
      const aliasRows = [{ _id: '', name: '', alias: testUtils.randomString() }];
      Publisher.importPublisherAliases(aliasRows, [], curveUser, (errors) => {
        expect(errors.length).toBe(1);
        expect(errors[0]).toContain('Publisher ID or Publisher Name is required');
        done();
      });
    });

    it('should silently skip aliases that already exist on the publisher (idempotent)', (done) => {
      const existingAlias = testUtils.randomString();
      mockPub.aliases = [existingAlias];
      jest.spyOn(Publisher, 'findOne').mockResolvedValue(mockPub);

      const aliasRows = [{ _id: pubId, name: pubName, alias: existingAlias.toLowerCase() }];
      Publisher.importPublisherAliases(aliasRows, [], curveUser, (errors) => {
        expect(errors).toEqual([]);
        expect(mockPub.aliases.length).toBe(1);
        done();
      });
    });

    it('should add a valid alias to the publisher', (done) => {
      const newAlias = testUtils.randomString();

      jest.spyOn(Publisher, 'findOne')
        .mockResolvedValueOnce(mockPub) // resolve by ID
        .mockResolvedValueOnce(null) // no primary name conflict
        .mockResolvedValueOnce(null); // no alias conflict

      const aliasRows = [{ _id: pubId, name: pubName, alias: newAlias }];
      Publisher.importPublisherAliases(aliasRows, [], curveUser, (errors) => {
        expect(errors).toEqual([]);
        expect(mockPub.aliases).toContain(newAlias);
        done();
      });
    });

    it('should error when alias matches another publisher primary name', (done) => {
      const conflictName = testUtils.randomString();
      const conflictPub = { _id: testUtils.randomId(), name: conflictName };

      jest.spyOn(Publisher, 'findOne')
        .mockResolvedValueOnce(mockPub) // resolve by ID
        .mockResolvedValueOnce(conflictPub) // primary name conflict found
        .mockResolvedValueOnce(null); // alias conflict check (Promise.all runs both)

      const aliasRows = [{ _id: pubId, name: pubName, alias: conflictName }];
      Publisher.importPublisherAliases(aliasRows, [], curveUser, (errors) => {
        expect(errors.length).toBe(1);
        expect(errors[0]).toContain('primary name');
        done();
      });
    });

    it('should find publisher from importedPublishers without querying DB', (done) => {
      const alias = testUtils.randomString();
      const newPublisher = { _id: testUtils.randomId(), name: pubName, lowerCaseName: pubName.toLowerCase(), aliases: [] };

      const findOneSpy = jest.spyOn(Publisher, 'findOne')
        .mockResolvedValueOnce(null) // no primary name conflict
        .mockResolvedValueOnce(null); // no alias conflict

      const aliasRows = [{ _id: newPublisher._id.toString(), name: '', alias }];
      Publisher.importPublisherAliases(aliasRows, [newPublisher], curveUser, (errors) => {
        expect(errors).toEqual([]);
        expect(newPublisher.aliases).toContain(alias);
        // Should only call findOne for uniqueness checks, not for publisher lookup
        expect(findOneSpy).toHaveBeenCalledTimes(2);
        done();
      });
    });

    it('should error when alias conflicts with another publisher alias', (done) => {
      const conflictPubName = testUtils.randomString();
      const takenAlias = testUtils.randomString();
      const conflictPub = { _id: testUtils.randomId(), name: conflictPubName, aliases: [takenAlias] };

      jest.spyOn(Publisher, 'findOne')
        .mockResolvedValueOnce(mockPub) // resolve by ID
        .mockResolvedValueOnce(null) // no primary name conflict
        .mockResolvedValueOnce(conflictPub); // alias conflict found

      const aliasRows = [{ _id: pubId, name: pubName, alias: takenAlias }];
      Publisher.importPublisherAliases(aliasRows, [], curveUser, (errors) => {
        expect(errors.length).toBe(1);
        expect(errors[0]).toContain('already used by publisher');
        expect(errors[0]).toContain(conflictPubName);
        done();
      });
    });

    it('should find publisher by name when ID is not provided', (done) => {
      const alias = testUtils.randomString();

      jest.spyOn(Publisher, 'findOne')
        .mockResolvedValueOnce(mockPub) // resolve by lowerCaseName
        .mockResolvedValueOnce(null) // no primary name conflict
        .mockResolvedValueOnce(null); // no alias conflict

      const aliasRows = [{ _id: '', name: pubName, alias }];
      Publisher.importPublisherAliases(aliasRows, [], curveUser, (errors) => {
        expect(errors).toEqual([]);
        expect(mockPub.aliases).toContain(alias);
        done();
      });
    });

    it('should find publisher from importedPublishers by name without querying DB', (done) => {
      const alias = testUtils.randomString();
      const newPublisher = { _id: testUtils.randomId(), name: pubName, lowerCaseName: pubName.toLowerCase(), aliases: [] };

      const findOneSpy = jest.spyOn(Publisher, 'findOne')
        .mockResolvedValueOnce(null) // no primary name conflict
        .mockResolvedValueOnce(null); // no alias conflict

      const aliasRows = [{ _id: '', name: pubName, alias }];
      Publisher.importPublisherAliases(aliasRows, [newPublisher], curveUser, (errors) => {
        expect(errors).toEqual([]);
        expect(newPublisher.aliases).toContain(alias);
        // Should only call findOne for uniqueness checks, not for publisher lookup
        expect(findOneSpy).toHaveBeenCalledTimes(2);
        done();
      });
    });

    it('should use importedPublishers instance and skip DB lookup when publisher exists in both', (done) => {
      const alias = testUtils.randomString();
      const importedInstance = { _id: new ObjectId(pubId), name: pubName, lowerCaseName: pubName.toLowerCase(), aliases: [] };

      const findOneSpy = jest.spyOn(Publisher, 'findOne')
        .mockResolvedValueOnce(null) // no primary name conflict
        .mockResolvedValueOnce(null); // no alias conflict

      const aliasRows = [{ _id: pubId, name: pubName, alias }];
      Publisher.importPublisherAliases(aliasRows, [importedInstance], curveUser, (errors) => {
        expect(errors).toEqual([]);
        expect(importedInstance.aliases).toContain(alias);
        // Should only call findOne for uniqueness checks, not for publisher lookup
        expect(findOneSpy).toHaveBeenCalledTimes(2);
        done();
      });
    });

    it('should error on whitespace-only alias', (done) => {
      const aliasRows = [{ _id: pubId, name: pubName, alias: '   ' }];
      Publisher.importPublisherAliases(aliasRows, [], curveUser, (errors) => {
        expect(errors.length).toBe(1);
        expect(errors[0]).toContain('Alias cannot be empty');
        done();
      });
    });

    it('should add multiple valid aliases to the same publisher in one import', (done) => {
      const alias1 = testUtils.randomString();
      const alias2 = testUtils.randomString();

      jest.spyOn(Publisher, 'findOne')
        .mockResolvedValueOnce(mockPub) // row 1: resolve by ID from DB
        .mockResolvedValueOnce(null) // row 1: no primary name conflict
        .mockResolvedValueOnce(null) // row 1: no alias conflict
        // row 2: publisher found in importedPublishers (added after row 1), no DB lookup
        .mockResolvedValueOnce(null) // row 2: no primary name conflict
        .mockResolvedValueOnce(null); // row 2: no alias conflict

      const aliasRows = [
        { _id: pubId, name: pubName, alias: alias1 },
        { _id: pubId, name: pubName, alias: alias2 },
      ];
      Publisher.importPublisherAliases(aliasRows, [], curveUser, (errors) => {
        expect(errors).toEqual([]);
        expect(mockPub.aliases).toContain(alias1);
        expect(mockPub.aliases).toContain(alias2);
        expect(mockPub.aliases).toHaveLength(2);
        done();
      });
    });

    it('should find newly created publisher from importedPublishers by name even without lowerCaseName', (done) => {
      const alias = testUtils.randomString();
      // Simulate a publisher created in the Publishers tab — has name but no lowerCaseName (not yet saved)
      const newPublisher = { _id: testUtils.randomId(), name: pubName, aliases: [] };

      const findOneSpy = jest.spyOn(Publisher, 'findOne')
        .mockResolvedValueOnce(null) // no primary name conflict
        .mockResolvedValueOnce(null); // no alias conflict

      const aliasRows = [{ _id: '', name: pubName, alias }];
      Publisher.importPublisherAliases(aliasRows, [newPublisher], curveUser, (errors) => {
        expect(errors).toEqual([]);
        expect(newPublisher.aliases).toContain(alias);
        // Should only call findOne for uniqueness checks, not for publisher lookup
        expect(findOneSpy).toHaveBeenCalledTimes(2);
        done();
      });
    });

    it('should reject alias that matches an in-flight publisher name from importedPublishers', (done) => {
      const otherPubName = testUtils.randomString();
      const otherPublisher = { _id: testUtils.randomId(), name: otherPubName, aliases: [] };

      jest.spyOn(Publisher, 'findOne')
        .mockResolvedValueOnce(mockPub) // resolve publisher by ID
        .mockResolvedValueOnce(null) // no DB primary name conflict
        .mockResolvedValueOnce(null); // no DB alias conflict

      // Try to add an alias that matches the in-flight publisher's name
      const aliasRows = [{ _id: pubId, name: pubName, alias: otherPubName }];
      Publisher.importPublisherAliases(aliasRows, [otherPublisher], curveUser, (errors) => {
        expect(errors.length).toBe(1);
        expect(errors[0]).toContain('primary name');
        expect(errors[0]).toContain(otherPubName);
        done();
      });
    });

    it('should reject alias that matches an in-flight alias on another publisher in importedPublishers', (done) => {
      const otherPubName = testUtils.randomString();
      const existingInFlightAlias = testUtils.randomString();
      const otherPublisher = { _id: testUtils.randomId(), name: otherPubName, aliases: [existingInFlightAlias] };

      jest.spyOn(Publisher, 'findOne')
        .mockResolvedValueOnce(mockPub) // resolve publisher by ID
        .mockResolvedValueOnce(null) // no DB primary name conflict
        .mockResolvedValueOnce(null); // no DB alias conflict

      // Try to add an alias that matches an in-flight alias on another publisher
      const aliasRows = [{ _id: pubId, name: pubName, alias: existingInFlightAlias }];
      Publisher.importPublisherAliases(aliasRows, [otherPublisher], curveUser, (errors) => {
        expect(errors.length).toBe(1);
        expect(errors[0]).toContain('already used by publisher');
        expect(errors[0]).toContain(otherPubName);
        done();
      });
    });

    it('should error when alias matches the publisher own name', (done) => {
      jest.spyOn(Publisher, 'findOne')
        .mockResolvedValueOnce(mockPub); // resolve by ID (self-name check returns before Promise.all)

      const aliasRows = [{ _id: pubId, name: pubName, alias: pubName }];
      Publisher.importPublisherAliases(aliasRows, [], curveUser, (errors) => {
        expect(errors.length).toBe(1);
        expect(errors[0]).toContain("matches the publisher's own name");
        done();
      });
    });
  });

  describe('importPublishers', () => {
    let curveUser;

    beforeEach(() => {
      curveUser = { clientId: testUtils.randomId(), id: testUtils.randomId() };
      jest.restoreAllMocks();
    });

    it('should return error if publishers is not an array', (done) => {
      Publisher.importPublishers('not an array', [], [], [], curveUser, false, (errors) => {
        expect(errors).toBe('Data must be an Array');
        done();
      });
    });

    it('should return error if clientId is missing', (done) => {
      const noClientUser = { clientId: null, id: testUtils.randomId() };
      Publisher.importPublishers([], [], [], [], noClientUser, false, (errors) => {
        expect(errors).toBe('A Client ID must be passed');
        done();
      });
    });

    it('should skip empty rows and return zero count', (done) => {
      jest.spyOn(Publisher, 'importPublisher').mockImplementation((data, ids, agr, user, overwrite, cb) => cb());

      Publisher.importPublishers([{}, {}], [], [], [], curveUser, false, (errors, count, importedPublishers) => {
        expect(errors).toEqual([]);
        expect(count).toBe(0);
        expect(importedPublishers).toEqual([]);
        done();
      });
    });

    it('should call importPublisher for each populated row and collect results', (done) => {
      const mockPublisher1 = { _id: testUtils.randomId(), name: testUtils.randomString(), aliases: [] };
      const mockPublisher2 = { _id: testUtils.randomId(), name: testUtils.randomString(), aliases: [] };

      jest.spyOn(Publisher, 'importPublisher')
        .mockImplementationOnce((data, ids, agr, user, overwrite, cb) => cb(null, mockPublisher1))
        .mockImplementationOnce((data, ids, agr, user, overwrite, cb) => cb(null, mockPublisher2));

      const rows = [{ name: testUtils.randomString() }, { name: testUtils.randomString() }];
      Publisher.importPublishers(rows, [], [], [], curveUser, false, (errors, count, importedPublishers) => {
        expect(errors).toEqual([]);
        expect(count).toBe(2);
        expect(importedPublishers).toHaveLength(2);
        expect(importedPublishers).toContain(mockPublisher1);
        expect(importedPublishers).toContain(mockPublisher2);
        done();
      });
    });

    it('should collect errors from importPublisher without stopping', (done) => {
      const mockPublisher = { _id: testUtils.randomId(), name: testUtils.randomString(), aliases: [] };

      jest.spyOn(Publisher, 'importPublisher')
        .mockImplementationOnce((data, ids, agr, user, overwrite, cb) => cb('Name is required'))
        .mockImplementationOnce((data, ids, agr, user, overwrite, cb) => cb(null, mockPublisher));

      const rows = [{ name: testUtils.randomString() }, { name: testUtils.randomString() }];
      Publisher.importPublishers(rows, [], [], [], curveUser, false, (errors, count, importedPublishers) => {
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('Name is required');
        expect(count).toBe(1);
        expect(importedPublishers).toHaveLength(1);
        done();
      });
    });

    it('should call importPublisherAliases when aliases are provided', (done) => {
      const mockPublisher = { _id: testUtils.randomId(), name: testUtils.randomString(), aliases: [] };

      jest.spyOn(Publisher, 'importPublisher')
        .mockImplementation((data, ids, agr, user, overwrite, cb) => cb(null, mockPublisher));
      jest.spyOn(Publisher, 'importPublisherAliases')
        .mockImplementation((aliasRows, importedPublishers, user, cb) => cb([]));

      const aliasRows = [{ _id: mockPublisher._id.toString(), name: mockPublisher.name, alias: testUtils.randomString() }];
      const rows = [{ name: mockPublisher.name }];

      Publisher.importPublishers(rows, [], [], aliasRows, curveUser, false, (errors, count, importedPublishers) => {
        expect(Publisher.importPublisherAliases).toHaveBeenCalledWith(
          aliasRows,
          expect.arrayContaining([mockPublisher]),
          curveUser,
          expect.any(Function),
        );
        expect(errors).toEqual([]);
        expect(count).toBe(1);
        done();
      });
    });

    it('should merge alias errors with publisher errors', (done) => {
      const mockPublisher = { _id: testUtils.randomId(), name: testUtils.randomString(), aliases: [] };

      jest.spyOn(Publisher, 'importPublisher')
        .mockImplementationOnce((data, ids, agr, user, overwrite, cb) => cb('Publisher row error'))
        .mockImplementationOnce((data, ids, agr, user, overwrite, cb) => cb(null, mockPublisher));

      jest.spyOn(Publisher, 'importPublisherAliases')
        .mockImplementation((aliasRows, importedPublishers, user, cb) => cb(['Aliases tab line 3: Alias cannot be empty']));

      const aliasRows = [{ _id: mockPublisher._id.toString(), name: mockPublisher.name, alias: '' }];
      const rows = [{ name: '' }, { name: mockPublisher.name }];

      Publisher.importPublishers(rows, [], [], aliasRows, curveUser, false, (errors, count, importedPublishers) => {
        expect(errors).toHaveLength(2);
        expect(errors[0]).toContain('Publisher row error');
        expect(errors[1]).toContain('Alias cannot be empty');
        done();
      });
    });

    it('should forward alias errors from importPublisherAliases', (done) => {
      const mockPublisher = { _id: testUtils.randomId(), name: testUtils.randomString(), aliases: [] };
      const aliasError = 'Aliases tab line 3: Cannot add alias \'TEST\'. This is the primary name of publisher \'Other\'.';

      jest.spyOn(Publisher, 'importPublisher')
        .mockImplementation((data, ids, agr, user, overwrite, cb) => cb(null, mockPublisher));
      jest.spyOn(Publisher, 'importPublisherAliases')
        .mockImplementation((aliasRows, importedPublishers, user, cb) => cb([aliasError]));

      const aliasRows = [{ _id: mockPublisher._id.toString(), name: mockPublisher.name, alias: 'TEST' }];
      const rows = [{ name: mockPublisher.name }];

      Publisher.importPublishers(rows, [], [], aliasRows, curveUser, false, (errors, count, importedPublishers) => {
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('primary name of publisher');
        done();
      });
    });

    it('should skip importPublisherAliases when aliases array is empty', (done) => {
      const mockPublisher = { _id: testUtils.randomId(), name: testUtils.randomString(), aliases: [] };

      jest.spyOn(Publisher, 'importPublisher')
        .mockImplementation((data, ids, agr, user, overwrite, cb) => cb(null, mockPublisher));
      jest.spyOn(Publisher, 'importPublisherAliases');

      const rows = [{ name: mockPublisher.name }];
      Publisher.importPublishers(rows, [], [], [], curveUser, false, (errors, count, importedPublishers) => {
        expect(Publisher.importPublisherAliases).not.toHaveBeenCalled();
        expect(errors).toEqual([]);
        expect(count).toBe(1);
        done();
      });
    });

    it('should skip importPublisherAliases when aliases is null/undefined', (done) => {
      const mockPublisher = { _id: testUtils.randomId(), name: testUtils.randomString(), aliases: [] };

      jest.spyOn(Publisher, 'importPublisher')
        .mockImplementation((data, ids, agr, user, overwrite, cb) => cb(null, mockPublisher));
      jest.spyOn(Publisher, 'importPublisherAliases');

      const rows = [{ name: mockPublisher.name }];
      Publisher.importPublishers(rows, [], [], null, curveUser, false, (errors, count, importedPublishers) => {
        expect(Publisher.importPublisherAliases).not.toHaveBeenCalled();
        expect(errors).toEqual([]);
        done();
      });
    });

    it('should pass importedPublishers array to importPublisherAliases for cross-tab reference', (done) => {
      const pub1 = { _id: testUtils.randomId(), name: testUtils.randomString(), aliases: [] };
      const pub2 = { _id: testUtils.randomId(), name: testUtils.randomString(), aliases: [] };

      jest.spyOn(Publisher, 'importPublisher')
        .mockImplementationOnce((data, ids, agr, user, overwrite, cb) => cb(null, pub1))
        .mockImplementationOnce((data, ids, agr, user, overwrite, cb) => cb(null, pub2));

      jest.spyOn(Publisher, 'importPublisherAliases')
        .mockImplementation((aliasRows, importedPublishers, user, cb) => {
          // Verify both publishers are available for alias resolution
          expect(importedPublishers).toHaveLength(2);
          expect(importedPublishers).toContain(pub1);
          expect(importedPublishers).toContain(pub2);
          cb([]);
        });

      const aliasRows = [{ _id: pub1._id.toString(), name: pub1.name, alias: testUtils.randomString() }];
      const rows = [{ name: pub1.name }, { name: pub2.name }];

      Publisher.importPublishers(rows, [], [], aliasRows, curveUser, false, (errors, count) => {
        expect(count).toBe(2);
        expect(Publisher.importPublisherAliases).toHaveBeenCalled();
        done();
      });
    });
  });
});
