const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const utils = require('../../../libs/utils');

describe('utils', () => {
  describe('validateMechanicalLicense', () => {
    it('should return undefined if rate and share are not provided', (done) => {
      const license = {}; // No rate or share
      const result = utils.validateMechanicalLicense(license);
      expect(result).toEqual(undefined);
      done();
    });

    it('should return the license object if rate is not a valid number', (done) => {
      const license = { rate: 'invalid', share: 50, contractId: '123' }; // Invalid rate
      const result = utils.validateMechanicalLicense(license);
      expect(result).toEqual(license);
      done();
    });

    it('should return the license object if share is not a valid number', (done) => {
      const license = { rate: 0.05, share: 'invalid', contractId: '123' }; // Invalid share
      const result = utils.validateMechanicalLicense(license);
      expect(result).toEqual(license);
      done();
    });

    it('should return the license object if contractId is missing', (done) => {
      const license = { rate: 0.05, share: 50 }; // Missing contractId
      const result = utils.validateMechanicalLicense(license);
      expect(result).toEqual(license);
      done();
    });

    it('should return undefined for valid rate, share, and contractId', (done) => {
      const license = { rate: 0.05, share: 50, contractId: '123' }; // All valid
      const result = utils.validateMechanicalLicense(license);
      expect(result).toEqual(undefined);
      done();
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
            read: jest.fn().mockReturnValue({
              allowDiskUse: jest.fn().mockReturnValue([]),
            }),
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
        // Arrange
          user.contractIds = [randomId(), randomId()];

          // Act
          await utils.atlasSearch({ Payee, Model, query, user, params });

          // Assert
          expect(Model.aggregate.mock.calls[0][0][0].$search.compound.filter).toEqual([
            { text: { query: user.contractIds, path: ['salesReturnsRights.contractId'] } },
            { text: { query: clientId, path: 'clientId' } },
          ]);
        });
      });

      describe('when the user has no contracts', () => {
        it('should not add the contract id filter and not throw an error', async () => {
          // Arrange
          user.contractIds = [];

          // Act
          await expect(
            utils.atlasSearch({ Payee, Model, query, user, params }),
          ).resolves.not.toThrow();

          // Assert
          // It should only have a client id filter and no contract id filter
          expect(Model.aggregate.mock.calls[0][0][0].$search.compound.filter).toEqual([
            { text: { query: clientId, path: 'clientId' } },
          ]);
        });
      });
    });
  });
});
