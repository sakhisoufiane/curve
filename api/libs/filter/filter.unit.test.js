const { randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { ObjectId } = require('mongodb');

const Filter = require('./filter');
const Client = require('../../models/client');
const SalesFile = require('../../models/salesFile');
const Contract = require('../../models/contract');

describe('Filter', () => {
  let catalogueIds;

  beforeEach(() => {
    catalogueIds = {
      releaseIds: [],
      trackIds: [],
      workIds: [],
      releaseTrackIds: [],
      catalogueGroupReleaseIds: [],
      catalogueGroupTrackIds: [],
      catalogueGroupWorkIds: [],
      projectIdReleaseIds: [],
      projectIdTrackIds: [],
      projectIdWorkIds: [],
      contractReleaseIds: [],
      contractTrackIds: [],
      contractWorkIds: [],
    };
  });

  describe('processSalesInput', () => {
    describe('when querying for Contracts', () => {
      describe('when a Work id(s) constraint is added', () => {
        it('should create a new $and condition for the ids', () => {
          // Arrange
          const contractId = randomId();
          const workIds = [randomId(), randomId(), randomId()];
          const filter = { contractIds: [contractId] };
          const filteredContractIds = [contractId];
          catalogueIds.contractWorkIds = workIds;

          // Act
          const salesInputFilter = Filter.processSalesInput(filter, filteredContractIds, catalogueIds);

          // Assert
          expect(salesInputFilter).toEqual({
            $and: [
              { catType: 'Work', workId: { $in: workIds } },
            ],
          });
        });

        describe('when an existing Contract Release id(s) $or constraint exists', () => {
          it('should add it to the existing $or instead of a new $and', () => {
            // Arrange
            const contractId = randomId();
            const releaseIds = [randomId(), randomId(), randomId()];
            const workIds = [randomId(), randomId(), randomId()];
            const filter = { contractIds: [contractId] };
            const filteredContractIds = [contractId];
            catalogueIds.contractReleaseIds = releaseIds;
            catalogueIds.contractWorkIds = workIds;

            // Act
            const salesInputFilter = Filter.processSalesInput(filter, filteredContractIds, catalogueIds);

            // Assert
            expect(salesInputFilter).toEqual({
              $and: [
                {
                  $or: [
                    { catType: 'Contract', contractId: { $in: [contractId] } },
                    { catType: 'Release', releaseId: { $in: releaseIds } },
                    { catType: 'Work', workId: { $in: workIds } },
                  ],
                },
              ],
            });
          });
        });

        describe('when an existing Track id(s) $or constraint exists', () => {
          it('should add it to the existing $or instead of a new $and', () => {
            // Arrange
            const contractId = randomId();
            const trackIds = [randomId(), randomId(), randomId()];
            const workIds = [randomId(), randomId(), randomId()];
            const filter = { contractIds: [contractId] };
            const filteredContractIds = [contractId];
            catalogueIds.contractTrackIds = trackIds;
            catalogueIds.contractWorkIds = workIds;

            // Act
            const salesInputFilter = Filter.processSalesInput(filter, filteredContractIds, catalogueIds);

            // Assert
            expect(salesInputFilter).toEqual({
              $and: [
                {
                  $or: [
                    { catType: 'Contract', contractId: { $in: [contractId] } },
                    { catType: 'Track', trackId: { $in: trackIds } },
                    { catType: 'Work', workId: { $in: workIds } },
                  ],
                },
              ],
            });
          });
        });
      });

      describe('when a Release id(s) constraint is added', () => {
        it('should add an $or condition for the ids', () => {
          // Arrange
          const contractId = randomId();
          const releaseIds = [randomId(), randomId(), randomId()];
          const filter = { contractIds: [contractId] };
          const filteredContractIds = [contractId];
          catalogueIds.contractReleaseIds = releaseIds;

          // Act
          const salesInputFilter = Filter.processSalesInput(filter, filteredContractIds, catalogueIds);

          // Assert
          expect(salesInputFilter).toEqual({
            $and: [{
              $or: [
                { catType: 'Contract', contractId: { $in: [contractId] } },
                { catType: 'Release', releaseId: { $in: releaseIds } },
              ],
            }],
          });
        });
      });

      describe('when a Track id(s) constraint is added', () => {
        it('should add an $or condition for the ids', () => {
          // Arrange
          const contractId = randomId();
          const trackIds = [randomId(), randomId(), randomId()];
          const filter = { contractIds: [contractId] };
          const filteredContractIds = [contractId];
          catalogueIds.contractTrackIds = trackIds;

          // Act
          const salesInputFilter = Filter.processSalesInput(filter, filteredContractIds, catalogueIds);

          // Assert
          expect(salesInputFilter).toEqual({
            $and: [{
              $or: [
                { catType: 'Contract', contractId: { $in: [contractId] } },
                { catType: 'Track', trackId: { $in: trackIds } },
              ],
            }],
          });
        });
      });
    });
  });

  describe('processCostsInput', () => {
    let clientId;

    beforeEach(() => {
      clientId = randomId();
    });

    it('should apply a client id filter if no filters are set', () => {
      // Arrange
      const filter = {};
      const filteredContractIds = [];
      const projectIdContractIds = [];

      // Act
      const costInputFilter = Filter.processCostsInput(filter, filteredContractIds, catalogueIds, projectIdContractIds, clientId);

      // Assert
      expect(costInputFilter).toEqual({ clientId });
    });

    it('should always apply a client id filter, even when the resulting filter is empty and input filter contains parameters', () => {
      // Arrange
      const filter = {
        territory: 'World',
      };
      const filteredContractIds = [];
      const projectIdContractIds = [];

      // Act
      const costInputFilter = Filter.processCostsInput(filter, filteredContractIds, catalogueIds, projectIdContractIds, clientId);

      // Assert
      expect(costInputFilter).toEqual({ clientId });
    });

    it('should apply a cost id filter when cost ids have been added to the filter (for target period)', () => {
      // Arrange
      const filter = {
        costIds: [randomId(), randomId(), randomId()],
      };
      const filteredContractIds = [];
      const projectIdContractIds = [];

      // Act
      const costInputFilter = Filter.processCostsInput(filter, filteredContractIds, catalogueIds, projectIdContractIds, clientId);

      // Assert
      expect(costInputFilter).toEqual({
        _id: {
          $in: filter.costIds.map((id) => new ObjectId(id)),
        },
        clientId,
      });
    });
  });

  describe('processCostsOutput', () => {
    it('should apply a cost id filter when cost ids have been added to the filter (for target period)', () => {
      // Arrange
      const filter = {
        costIds: [randomId(), randomId(), randomId()],
      };
      const filteredContractIds = [];
      const payeeContracts = [];
      const projectIdContractIds = [];

      // Act
      const costInputFilter = Filter.processCostsOutput(filter, filteredContractIds, catalogueIds, payeeContracts, projectIdContractIds);

      // Assert
      expect(costInputFilter).toEqual({
        costId: {
          $in: filter.costIds,
        },
      });
    });
  });

  describe('filterGroupToDbFilter', () => {
    describe('when the dataset is Income Data', () => {
      describe('when a target period filter is used', () => {
        it('should query sales files by the target period', () => {
          // Arrange
          const filter = { targetPeriod: '2023-01' };
          const options = { table: 'Income Data', client: new Client() };
          const salesFiles = [new SalesFile(), new SalesFile(), new SalesFile()];
          jest.spyOn(SalesFile, 'find').mockReturnValue({
            lean: () => Promise.resolve(salesFiles),
          });
          // Act
          Filter.filterGroupToDbFilter(filter, options, (err, dbFilter) => {
            // Assert
            expect(err).toBeUndefined();
            expect(dbFilter).toEqual({
              salesFileId: {
                $in: salesFiles.map((sf) => sf._id.toString()),
              },
            });
            expect(SalesFile.find).toHaveBeenCalledWith(
              {
                clientId: options.client._id.toString(),
                targetPeriod: filter.targetPeriod,
              },
              { _id: 1 },
            );
          });
        });
      });
    });

    describe('when a company and contract id filter is provided', () => {
      it('should use an $and condition when querying contracts (CUR-4452)', () => {
        // Arrange
        const filterIn = {
          companies: [randomId()],
          contractIds: [randomId()],
        };
        const options = {
          client: new Client({ _id: randomId() }),
          table: 'Royalties',
        };
        const contracts = [new Contract({ _id: randomId() }), new Contract({ _id: randomId() })];
        jest.spyOn(Contract, 'find').mockResolvedValueOnce(contracts);
        jest.spyOn(Filter, 'processSalesOutput').mockReturnValueOnce({});

        // Act
        Filter.filterGroupToDbFilter(filterIn, options, (err, filter) => {
          // Assert
          expect(err).toBeNull();
          // Check the correct Contracts are being queried
          expect(Contract.find).toHaveBeenCalledWith({
            $and: [
              { companyId: { $in: filterIn.companies } },
            ],
            $or: [
              { _id: { $in: filterIn.contractIds.map((id) => new ObjectId(id)) } },
            ],
            clientId: options.client._id.toString(),
          }, '_id');
          expect(Filter.processSalesOutput).toHaveBeenCalledWith(
            filterIn,
            contracts.map(
              (c) => c._id.toString(),
            ),
            expect.any(Object),
            [],
            undefined,
          );
        });
      });
    });

    describe('when a company filter is provided', () => {
      it('should use an $or condition when querying contracts', () => {
        // Arrange
        const filterIn = {
          companies: [randomId()],
        };
        const options = {
          client: new Client({ _id: randomId() }),
          table: 'Royalties',
        };
        const contracts = [new Contract({ _id: randomId() }), new Contract({ _id: randomId() })];
        jest.spyOn(Contract, 'find').mockResolvedValueOnce(contracts);
        jest.spyOn(Filter, 'processSalesOutput').mockReturnValueOnce({});

        // Act
        Filter.filterGroupToDbFilter(filterIn, options, (err, filter) => {
          // Assert
          expect(err).toBeNull();
          // Check the correct Contracts are being queried
          expect(Contract.find).toHaveBeenCalledWith({
            $or: [
              { companyId: { $in: filterIn.companies } },
            ],
            clientId: options.client._id.toString(),
          }, '_id');
        });
      });
    });
  });
});
