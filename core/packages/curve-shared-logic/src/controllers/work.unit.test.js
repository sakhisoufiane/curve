const { randomId, randomString, randomArray } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const _ = require('lodash');
const WorkController = require('./work');
const Publisher = require('../libs/cwr/publisher');

describe('WorkController', () => {
  describe('significantUpdateCheck', () => {
    it('should flag an update if the title has changed', () => {
      const newWork = { title: 'Title 2' };
      const oldWork = { title: 'Title 1' };

      const changes = WorkController.significantUpdateCheck({ work: newWork, oldWork });
      expect(changes).toEqual(['title']);
    });

    it('should not flag an update if the title is the same', () => {
      const newWork = { title: 'Title 1' };
      const oldWork = { title: 'Title 1' };

      const changes = WorkController.significantUpdateCheck({ work: newWork, oldWork });
      expect(changes).toEqual([]);
    });

    it('should flag an update if the rightsChain has changed (territory)', () => {
      const newChain = [{ territory: 'GB', children: [] }];
      const oldChain = [{ territory: 'WW', children: [] }];
      const newWork = { rightsChain: newChain };
      const oldWork = { rightsChain: oldChain };

      const changes = WorkController.significantUpdateCheck({ work: newWork, oldWork });
      expect(changes).toEqual(['rightsChain']);
    });

    it('should flag an update if the rightsChain has changed (nested)', () => {
      const newChain = [{
        territory: 'WW',
        children: [{
          type: 'Publisher',
          contractType: Publisher.ContractType.OriginalPublisher,
          children: [{ type: 'Composer', contractType: 'Lyrics and Music', },],
        }],
      }];
      const oldChain = [{
        territory: 'WW',
        children: [{
          type: 'Publisher',
          contractType: Publisher.ContractType.OriginalPublisher,
          children: [{ type: 'Composer', contractType: 'Lyrics', },],
        }],
      }];
      const newWork = { rightsChain: newChain };
      const oldWork = { rightsChain: oldChain };

      const changes = WorkController.significantUpdateCheck({ work: newWork, oldWork });
      expect(changes).toEqual(['rightsChain']);
    });

    it('should flag an update if territories has changed', () => {
      const newWork = { territories: ['NL', 'GB', 'SE'] };
      const oldWork = { territories: ['NL', 'DK', 'GB'] };

      const changes = WorkController.significantUpdateCheck({ work: newWork, oldWork });
      expect(changes).toEqual(['territories']);
    });

    it('should not flag any updates if the works are identifical', () => {
      const newWork = { title: 'Title 1', territories: ['NL', 'GB', 'SE'], rightsChain: [], partnerRightsChains: [] };
      const oldWork = { title: 'Title 1', territories: ['NL', 'GB', 'SE'], rightsChain: [], partnerRightsChains: [] };

      const changes = WorkController.significantUpdateCheck({ work: newWork, oldWork });
      expect(changes).toEqual([]);
    });

    it('should flag multiple changes to a work', () => {
      const newWork = { title: 'Title 2', territories: ['NL', 'GB', 'SE'] };
      const oldWork = { title: 'Title 1', territories: ['NL', 'DK', 'GB'] };

      const changes = WorkController.significantUpdateCheck({ work: newWork, oldWork });
      expect(changes).toEqual(['title', 'territories']);
    });
  });

  describe('arePartnerChainsEqual', () => {
    it('should return the differences between partner rights chains', () => {
      const testComposerId = randomId();
      const testPublisherId = randomId();
      const newChain = [{
        territory: 'specific',
        children: [
          {
            type: Publisher,
            mechanicalCollection: 100,
            performanceCollection: 50,
            children: [
              {
                type: 'Composer',
                composerId: testComposerId,
                controlled: true,
                contractType: 'Music',
                mechanicalOwnership: 0,
                performanceOwnership: 50,
                mechanicalCollection: 0,
                performanceCollection: 50,
                cae: '00000000000',
                composer: { name: 'Test Composer', },
                name: 'Test Composer',
              },
            ],
            publisherId: testPublisherId,
            controlled: false,
            contractType: 'Original Publisher',
            mechanicalOwnership: 100,
            performanceOwnership: 50,
            publisher: { clientId: randomId(), name: 'Test Publisher', },
          }],
        totalMechanicalOwnership: 100,
        totalPerformanceOwnership: 100,
        totalMechanicalCollection: 100,
        totalPerformanceCollection: 100,
        mechanicalCollection: 0,
        mechanicalOwnership: 0,
        performanceCollection: 0,
        performanceOwnership: 0,
      }];

      const oldChain = [{
        territory: 'specific',
        children: [
          {
            type: Publisher,
            mechanicalCollection: 100,
            performanceCollection: 50,
            children: [
              {
                type: 'Composer',
                composerId: testComposerId,
                controlled: true,
                contractType: 'Music',
                mechanicalOwnership: 0,
                performanceOwnership: 50,
                mechanicalCollection: 0,
                performanceCollection: 50,
                composer: { name: 'Test Composer', },
                name: 'Test Composer',
              },
            ],
            publisherId: testPublisherId,
            controlled: true,
            contractType: 'Original Publisher',
            mechanicalOwnership: 100,
            performanceOwnership: 50,
            publisher: { name: 'Test Publisher', },
          }],
        totalMechanicalOwnership: 100,
        totalPerformanceOwnership: 100,
        totalMechanicalCollection: 100,
        totalPerformanceCollection: 100,
        mechanicalCollection: 0,
        mechanicalOwnership: 0,
        performanceCollection: 0,
        performanceOwnership: 0,
      }];

      const differences = WorkController.arePartnerChainsEqual(newChain, oldChain);
      expect(differences[0]).toMatchObject({
        path: '0.children.0.controlled',
        oldValue: true,
        newValue: false,
      });
    });
  });

  describe('paramsToFilterField', () => {
    it('function should exist', () => {
      expect(WorkController.paramsToFilterField).toBeDefined();
    });

    describe('when `user` has a payeeId and contractIds', () => {
      it('should add `salesReturnsRights.contractId` property containing the contractIds array assigned to $in to the output params', () => {
        const inputParams = {};
        const contractIds = randomArray();
        const curveUser = { payeeId: randomId(), contractIds };
        const expectedParams = { 'salesReturnsRights.contractId': { $in: contractIds }, };

        const result = WorkController.paramsToFilterField(inputParams, curveUser);

        expect(result).toEqual(expectedParams);
      });
    });

    describe('when `user` has a payeeId and NO contractIds', () => {
      it('should add `salesReturnsRights.contractId` property containing an empty array assigned to $in to the output params', () => {
        const inputParams = {};
        const contractIds = undefined;
        const curveUser = { payeeId: randomId(), contractIds };
        const expectedParams = { 'salesReturnsRights.contractId': { $in: [] }, };

        const result = WorkController.paramsToFilterField(inputParams, curveUser);

        expect(result).toEqual(expectedParams);
      });
    });

    describe('when `user` does not have a payeeId, but has a clientId', () => {
      it('should add `clientId` to the request', () => {
        const inputParams = {};
        const clientId = randomId();
        const user = { clientId };

        const result = WorkController.paramsToFilterField(inputParams, user);

        expect(result.clientId).toEqual(clientId);
      });
    });

    describe('when params passed contain a `text` property', () => {
      it('should add regex escaped text strings for the relevant fields to the output params', () => {
        const inputParams = { text: randomString() };
        const user = {};
        const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
        const expectedParams = {
          $or: [{ title: { $regex: regex } },
          { composer: { $regex: regex } },
          { identifier: { $regex: regex } },
          { iswc: { $regex: regex } },
          { tunecode: { $regex: regex } },
          { aliases: { $regex: regex } },
          { 'societyIdentifiers.identifier': { $regex: regex } },
          { foreignId: { $regex: regex } },
          { projectId: { $regex: regex } }],
        };

        const params = WorkController.paramsToFilterField(inputParams, user);

        expect(params).toEqual(expectedParams);
      });
    });

    describe('when params passed contain an `identifiers` array of strings', () => {
      it('should add `identifier` property containing the array assigned to $in to the output params', () => {
        const inputParams = { identifiers: randomArray() };
        const user = {};
        const expectedParams = { identifier: { $in: inputParams.identifiers }, };

        const params = WorkController.paramsToFilterField(inputParams, user);

        expect(params).toEqual(expectedParams);
      });
    });

    describe('when params passed contain an empty `identifiers` array', () => {
      it('should NOT add `identifier` property to the output params', () => {
        const inputParams = { identifiers: [] };
        const user = {};
        const expectedParams = {};

        const params = WorkController.paramsToFilterField(inputParams, user);

        expect(params).toEqual(expectedParams);
      });
    });

    describe('when params contain updatedAfter', () => {
      it('should add updatedAt.$gte with the date', () => {
        const dateString = '2025-03-01T00:00:00.000Z';
        const inputParams = { updatedAfter: dateString };
        const user = {};

        const params = WorkController.paramsToFilterField(inputParams, user);

        expect(params.updatedAt).toEqual({ $gte: new Date(dateString) });
      });
    });

    describe('when params contain updatedBefore', () => {
      it('should add updatedAt.$lte with the date', () => {
        const dateString = '2025-12-31T23:59:59.000Z';
        const inputParams = { updatedBefore: dateString };
        const user = {};

        const params = WorkController.paramsToFilterField(inputParams, user);

        expect(params.updatedAt).toEqual({ $lte: new Date(dateString) });
      });
    });

    describe('when params contain both updatedAfter and updatedBefore', () => {
      it('should add both $gte and $lte to updatedAt', () => {
        const afterDate = '2025-01-01T00:00:00.000Z';
        const beforeDate = '2025-06-30T23:59:59.000Z';
        const inputParams = { updatedAfter: afterDate, updatedBefore: beforeDate };
        const user = {};

        const params = WorkController.paramsToFilterField(inputParams, user);

        expect(params.updatedAt).toEqual({
          $gte: new Date(afterDate),
          $lte: new Date(beforeDate),
        });
      });
    });
  });

  describe('workSearchParams', () => {
    describe('filterItems', () => {
      it('should contain updatedAfter filter item', () => {
        const updatedAfterFilter = WorkController.workSearchParams.filterItems.find(
          (item) => item.name === 'updatedAfter',
        );

        expect(updatedAfterFilter).toEqual({
          name: 'updatedAfter',
          field: 'updatedAt',
          type: 'afterInclusive',
        });
      });

      it('should contain updatedBefore filter item', () => {
        const updatedBeforeFilter = WorkController.workSearchParams.filterItems.find(
          (item) => item.name === 'updatedBefore',
        );

        expect(updatedBeforeFilter).toEqual({
          name: 'updatedBefore',
          field: 'updatedAt',
          type: 'beforeInclusive',
        });
      });
    });
  });

  describe('sanitiseFilter', () => {
    it('returns only allowed keys', () => {
      const result = WorkController.sanitiseFilter({ text: 'hello', unknown: 'bad', injected: 'evil' });
      expect(result).toEqual({ text: 'hello' });
    });

    it('passes through all known filterItem keys', () => {
      const input = { contractIds: ['abc'], catalogueGroups: 'grp', onHold: 'true', approvalStatus: 'approved' };
      const result = WorkController.sanitiseFilter(input);
      expect(result).toEqual(input);
    });

    it('strips disallowed keys from a mixed input', () => {
      const result = WorkController.sanitiseFilter({ ids: ['id1'], foo: 'bar', text: 'search' });
      expect(result).toEqual({ ids: ['id1'], text: 'search' });
    });

    it('returns empty object for null input', () => {
      expect(WorkController.sanitiseFilter(null)).toEqual({});
    });

    it('returns empty object for undefined input', () => {
      expect(WorkController.sanitiseFilter(undefined)).toEqual({});
    });

    it('returns empty object when no keys match', () => {
      expect(WorkController.sanitiseFilter({ foo: 'bar', baz: 123 })).toEqual({});
    });
  });
});
