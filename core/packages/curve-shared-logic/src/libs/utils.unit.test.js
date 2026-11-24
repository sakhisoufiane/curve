const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const utils = require('./utils');

describe('utils', () => {
  describe('removeLeadingZeros', () => {
    it('removes leading zeros from a padded string', () => {
      expect(utils.removeLeadingZeros('00012345678')).toBe('12345678');
    });

    it('returns the value unchanged if there are no leading zeros', () => {
      expect(utils.removeLeadingZeros('12345678')).toBe('12345678');
    });

    it('converts a numeric value to string and strips leading zeros', () => {
      expect(utils.removeLeadingZeros(12345678)).toBe('12345678');
    });

    it('returns an empty string for a falsy value', () => {
      expect(utils.removeLeadingZeros('')).toBe('');
      expect(utils.removeLeadingZeros(null)).toBe('');
      expect(utils.removeLeadingZeros(undefined)).toBe('');
    });

    it('returns an empty string for an all-zero value', () => {
      expect(utils.removeLeadingZeros('00000000000')).toBe('');
    });
  });

  describe('padLeadingZeros', () => {
    it('pads a short value to the given length', () => {
      expect(utils.padLeadingZeros('12345678', 11)).toBe('00012345678');
    });

    it('returns the value unchanged if it already meets the target length', () => {
      expect(utils.padLeadingZeros('00012345678', 11)).toBe('00012345678');
    });

    it('converts a numeric value and pads it', () => {
      expect(utils.padLeadingZeros(12345678, 11)).toBe('00012345678');
    });

    it('returns empty padding string for a falsy value', () => {
      expect(utils.padLeadingZeros('', 11)).toBe('00000000000');
      expect(utils.padLeadingZeros(null, 11)).toBe('00000000000');
      expect(utils.padLeadingZeros(undefined, 11)).toBe('00000000000');
    });

    it('defaults to length 0 when num is omitted, returning value as-is', () => {
      expect(utils.padLeadingZeros('12345')).toBe('12345');
    });
  });

  describe('validateMechanicalLicense', () => {
    it('should return undefined if rate and share are not provided', () => {
      const license = {}; // No rate or share
      const result = utils.validateMechanicalLicense(license);
      expect(result).toEqual(undefined);
    });

    it('should return the license object if rate is not a valid number', () => {
      const license = { rate: 'invalid', share: 50, contractId: '123' }; // Invalid rate
      const result = utils.validateMechanicalLicense(license);
      expect(result).toEqual(license);
    });

    it('should return the license object if share is not a valid number', () => {
      const license = { rate: 0.05, share: 'invalid', contractId: '123' }; // Invalid share
      const result = utils.validateMechanicalLicense(license);
      expect(result).toEqual(license);
    });

    it('should return the license object if contractId is missing', () => {
      const license = { rate: 0.05, share: 50 }; // Missing contractId
      const result = utils.validateMechanicalLicense(license);
      expect(result).toEqual(license);
    });

    it('should return undefined for valid rate, share, and contractId', () => {
      const license = { rate: 0.05, share: 50, contractId: '123' }; // All valid
      const result = utils.validateMechanicalLicense(license);
      expect(result).toEqual(undefined);
    });
  });

  describe('atlasSearch', () => {
    describe('when the user is a payee', () => {
      let clientId;
      let Payee;
      let Model;
      let query;
      let user;
      let params;

      beforeEach(() => {
        clientId = randomId();
        Payee = { findById: jest.fn().mockResolvedValue({ clientId }) };
        Model = {
          aggregate: jest.fn().mockReturnValue({
            read: jest.fn().mockReturnValue({ allowDiskUse: jest.fn().mockReturnValue([]) }),
          }),
        };
        query = { text: randomString() };
        user = { payeeId: randomId(), contractIds: [] };
        params = {
          searchIndex: 'workSearch',
          filterItems: [
            {
              name: 'contractIds',
              field: 'salesReturnsRights.contractId',
              type: 'text',
            },
            { name: 'catalogueGroups', field: 'catalogueGroups', type: 'text' },
            { name: 'createdAfter', field: 'createdAt', type: 'after' },
            { name: 'createdBefore', field: 'createdAt', type: 'before' },
            { name: 'updatedAfter', field: 'updatedAt', type: 'after' },
            { name: 'updatedBefore', field: 'updatedAt', type: 'before' },
            { name: 'composerIds', field: 'usedComposerIds', type: 'text' },
            { name: 'publisherIds', field: 'usedPublisherIds', type: 'text' },
            { name: 'onHold', field: 'onHold', type: 'boolean' },
            { name: 'approvalStatus', field: 'approvalStatus', type: 'text' },
            {
              name: 'participation',
              field: 'totalParticipation',
              type: 'equalLessGreaterThan',
            },
            {
              name: 'ownership',
              field: 'totalCollection.totalOwnedMechanical',
              type: 'equalLessGreaterThan',
            },
            { name: 'ids', field: '_id', type: 'objectIds' },
            { name: 'identifiers', field: 'identifier', type: 'text' },
          ],
          payeeFilterFields: ['salesReturnsRights.contractId'],
          textSearchFields: [
            'title',
            'composer',
            'identifier',
            'iswc',
            'tunecode',
            'aliases',
            'societyIdentifiers.identifier',
            'foreignId',
            'projectId',
          ],
          page: 1,
          limit: 25,
          sortBy: undefined,
          sortOrder: undefined,
          project: {
            _id: 1,
            clientId: 1,
            title: 1,
            composer: 1,
            identifier: 1,
            createdAt: 1,
            updatedAt: 1,
            totalCollection: 1,
            totalParticipation: 1,
            valid: 1,
            foreignId: 1,
            deliveries: 1,
            approvalStatus: 1,
            approvedDate: 1,
            onHold: 1,
          },
        };
      });

      describe('when the user has contracts', () => {
        it('should add contract ids to the filter', async () => {
          user.contractIds = [randomId(), randomId()];

          await utils.atlasSearch({ Payee, Model, query, user, params });

          expect(Model.aggregate.mock.calls[0][0][0].$search.compound.filter).toEqual([
            { text: { query: user.contractIds, path: ['salesReturnsRights.contractId'] } },
            { text: { query: clientId, path: 'clientId' } },
          ]);
        });
      });

      describe('when the user has no contracts', () => {
        it('should not add the contract id filter and not throw an error', async () => {
          user.contractIds = [];

          await expect(utils.atlasSearch({ Payee, Model, query, user, params })).resolves.not.toThrow();

          // It should only have a client id filter and no contract id filter
          expect(Model.aggregate.mock.calls[0][0][0].$search.compound.filter).toEqual([
            { text: { query: clientId, path: 'clientId' } },
          ]);
        });
      });

      describe('when a beforeInclusive filter is provided', () => {
        it('should use an inclusive lte range operator', async () => {
          const dateStr = '2026-02-10';
          query.createdBefore = dateStr;
          user.contractIds = [];
          // Replace the createdBefore filterItem with beforeInclusive type
          params.filterItems = params.filterItems.map((item) => (
            item.name === 'createdBefore' ? { ...item, type: 'beforeInclusive' } : item
          ));

          await utils.atlasSearch({ Payee, Model, query, user, params });

          const filters = Model.aggregate.mock.calls[0][0][0].$search.compound.filter;
          expect(filters).toEqual(
            expect.arrayContaining([
              { range: { lte: new Date(dateStr), path: 'createdAt' } },
            ]),
          );
        });
      });

      describe('when an afterInclusive filter is provided', () => {
        it('should use an inclusive gte range operator', async () => {
          const dateStr = '2026-01-01';
          query.createdAfter = dateStr;
          user.contractIds = [];
          // Replace the createdAfter filterItem with afterInclusive type
          params.filterItems = params.filterItems.map((item) => (
            item.name === 'createdAfter' ? { ...item, type: 'afterInclusive' } : item
          ));

          await utils.atlasSearch({ Payee, Model, query, user, params });

          const filters = Model.aggregate.mock.calls[0][0][0].$search.compound.filter;
          expect(filters).toEqual(
            expect.arrayContaining([
              { range: { gte: new Date(dateStr), path: 'createdAt' } },
            ]),
          );
        });
      });
    });
  });
});
