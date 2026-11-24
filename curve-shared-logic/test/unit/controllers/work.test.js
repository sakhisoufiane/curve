const { expect } = require('chai');
const { randomId, randomString, randomArray } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const _ = require('lodash');
const WorkController = require('../../../controllers/work');
const Publisher = require('../../../libs/cwr/publisher');

describe('WorkController', () => {
  describe('significantUpdateCheck', () => {
    it('should flag an update if the title has changed', (done) => {
      const newWork = { title: 'Title 2' };
      const oldWork = { title: 'Title 1' };
      const changes = WorkController.significantUpdateCheck({ work: newWork, oldWork });
      expect(changes).to.eql(['title']);
      done();
    });
    it('should not flag an update if the title is the same', (done) => {
      const newWork = { title: 'Title 1' };
      const oldWork = { title: 'Title 1' };
      const changes = WorkController.significantUpdateCheck({ work: newWork, oldWork });
      expect(changes).to.eql([]);
      done();
    });
    it('should flag an update if the rightsChain has changed (territory)', (done) => {
      const newChain = [{ territory: 'GB', children: [] }];
      const oldChain = [{ territory: 'WW', children: [] }];
      const newWork = { rightsChain: newChain };
      const oldWork = { rightsChain: oldChain };
      const changes = WorkController.significantUpdateCheck({ work: newWork, oldWork });
      expect(changes).to.eql(['rightsChain']);
      done();
    });
    it('should flag an update if the rightsChain has changed (nested)', (done) => {
      const newChain = [{
        territory: 'WW',
        children: [{
          type: 'Publisher',
          contractType: Publisher.ContractType.OriginalPublisher,
          children: [
            {
              type: 'Composer',
              contractType: 'Lyrics and Music',
            },
          ],
        }],
      }];
      const oldChain = [{
        territory: 'WW',
        children: [{
          type: 'Publisher',
          contractType: Publisher.ContractType.OriginalPublisher,
          children: [
            {
              type: 'Composer',
              contractType: 'Lyrics',
            },
          ],
        }],
      }];
      const newWork = { rightsChain: newChain };
      const oldWork = { rightsChain: oldChain };
      const changes = WorkController.significantUpdateCheck({ work: newWork, oldWork });
      expect(changes).to.eql(['rightsChain']);
      done();
    });
    // it('should flag an update if partnerRightsChains has changed', (done) => {
    //   const newChain = {
    //     deliveryPartnerId: 1,
    //     rightsChain: [{ territory: 'WW',
    //       children: [{
    //         type: 'Publisher',
    //         contractType: Publisher.ContractType.OriginalPublisher,
    //         children: [
    //           {
    //             type: 'Composer',
    //             contractType: 'Lyrics and Music',
    //           },
    //         ],
    //       }],
    //     }],
    //   };
    //   const oldChain = {
    //     deliveryPartnerId: 1,
    //     rightsChain: [{ territory: 'WW',
    //       children: [{
    //         type: 'Publisher',
    //         contractType: Publisher.ContractType.OriginalPublisher,
    //         children: [
    //           {
    //             type: 'Composer',
    //             contractType: 'Lyrics',
    //           },
    //         ],
    //       }],
    //     }],
    //   };
    //   const newWork = { partnerRightsChains: [newChain] };
    //   const oldWork = { partnerRightsChains: [oldChain] };
    //   const changes = WorkController.significantUpdateCheck({ work: newWork, oldWork });
    //   expect(changes).to.eql(['partnerRightsChains']);
    //   done();
    // });
    it('should flag an update if territories has changed', (done) => {
      const newWork = { territories: ['NL', 'GB', 'SE'] };
      const oldWork = { territories: ['NL', 'DK', 'GB'] };
      const changes = WorkController.significantUpdateCheck({ work: newWork, oldWork });
      expect(changes).to.eql(['territories']);
      done();
    });
    it('should not flag any updates if the works are identifical', (done) => {
      const newWork = { title: 'Title 1', territories: ['NL', 'GB', 'SE'], rightsChain: [], partnerRightsChains: [] };
      const oldWork = { title: 'Title 1', territories: ['NL', 'GB', 'SE'], rightsChain: [], partnerRightsChains: [] };
      const changes = WorkController.significantUpdateCheck({ work: newWork, oldWork });
      expect(changes).to.eql([]);
      done();
    });
    it('should flag multiple changes to a work', (done) => {
      const newWork = { title: 'Title 2', territories: ['NL', 'GB', 'SE'] };
      const oldWork = { title: 'Title 1', territories: ['NL', 'DK', 'GB'] };
      const changes = WorkController.significantUpdateCheck({ work: newWork, oldWork });
      expect(changes).to.eql(['title', 'territories']);
      done();
    });
  });
  describe('arePartnerChainsEqual', () => {
    it('should return the differences between partner rights chains', (done) => {
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
                composer: {
                  name: 'Test Composer',
                },
                name: 'Test Composer',
              },
            ],
            publisherId: testPublisherId,
            controlled: false,
            contractType: 'Original Publisher',
            mechanicalOwnership: 100,
            performanceOwnership: 50,
            publisher: {
              clientId: randomId(),
              name: 'Test Publisher',
            },
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
                composer: {
                  name: 'Test Composer',
                },
                name: 'Test Composer',
              },
            ],
            publisherId: testPublisherId,
            controlled: true,
            contractType: 'Original Publisher',
            mechanicalOwnership: 100,
            performanceOwnership: 50,
            publisher: {
              name: 'Test Publisher',
            },
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
      expect(differences[0]).to.include({
        path: '0.children.0.controlled',
        oldValue: true,
        newValue: false,
      });
      done();
    });
  });
  describe('paramsToFilterField', () => {
    it('function should exist', (done) => {
      expect(WorkController.paramsToFilterField).to.exist;
      done();
    });
    describe('when `user` has a payeeId and contractIds', function () {
      it('should add `salesReturnsRights.contractId` property containing the contractIds array assigned to $in to the output params', (done) => {
        // Arrange
        const inputParams = {};
        const contractIds = randomArray();
        const curveUser = { payeeId: randomId(), contractIds };
        const expectedParams = {
          'salesReturnsRights.contractId': { $in: contractIds },
        };

        // Act
        const result = WorkController.paramsToFilterField(inputParams, curveUser);

        // Assert
        expect(result).to.deep.eq(expectedParams);
        done();
      });
    });
    describe('when `user` has a payeeId and NO contractIds', function () {
      it('should add `salesReturnsRights.contractId` property containing an empty array assigned to $in to the output params', (done) => {
        // Arrange
        const inputParams = {};
        const contractIds = undefined;
        const curveUser = { payeeId: randomId(), contractIds };
        const expectedParams = {
          'salesReturnsRights.contractId': { $in: [] },
        };

        // Act
        const result = WorkController.paramsToFilterField(inputParams, curveUser);

        // Assert
        expect(result).to.deep.eq(expectedParams);
        done();
      });
    });
    describe('when `user` does not have a payeeId, but has a clientId', function () {
      it('should add `clientId` to the request', function (done) {
        // Arrange
        const inputParams = {};
        const clientId = randomId();
        const user = { clientId };

        // Act
        const result = WorkController.paramsToFilterField(inputParams, user);

        // Assert
        expect(result.clientId).to.eq(clientId);
        done();
      });
    });
    describe('when params passed contain a `text` property', () => {
      it('should add regex escaped text strings for the relevant fields to the output params', (done) => {
        // Arrange
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

        // Act
        const params = WorkController.paramsToFilterField(inputParams, user);
        // Assert
        expect(params).to.deep.eq(expectedParams);
        done();
      });
    });
    describe('when params passed contain an `identifiers` array of strings', () => {
      it('should add `identifier` property containing the array assigned to $in to the output params', (done) => {
        // Arrange
        const inputParams = { identifiers: randomArray() };
        const user = {};
        const expectedParams = {
          identifier: { $in: inputParams.identifiers },
        };

        // Act
        const params = WorkController.paramsToFilterField(inputParams, user);
        // Assert
        expect(params).to.deep.eq(expectedParams);
        done();
      });
    });
    describe('when params passed contain an empty `identifiers` array', () => {
      it('should NOT add `identifier` property to the output params', (done) => {
        // Arrange
        const inputParams = { identifiers: [] };
        const user = {};
        const expectedParams = {};

        // Act
        const params = WorkController.paramsToFilterField(inputParams, user);
        // Assert
        expect(params).to.deep.eq(expectedParams);
        done();
      });
    });
  });
});
