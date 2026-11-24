jest.mock('@curveroyaltysystems/platform-shared-utils');
jest.mock('../../../models/client');
jest.mock('../../../models/salesGroupLines');
jest.mock('../../../models/salesGroup');
jest.mock('../salesHelpers');

const { BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const { randomDate, randomId, randomString, randomArray, randomError } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { ObjectId } = require('mongodb');
const { salesHelpers } = require('../salesHelpers');
const Client = require('../../../models/client');
const SalesGroupLines = require('../../../models/salesGroupLines');
const SalesGroup = require('../../../models/salesGroup');
const Period = require('../../../models/period');

const salesGroupHelpers = require('./salesGroupHelpers');

describe('salesGroupHelpers Unit Tests', () => {
  afterEach(jest.restoreAllMocks);

  describe('addSalesLinesByIds', () => {
    beforeEach(() => {
      jest.spyOn(salesGroupHelpers, 'addSalesLinesByFilter').mockResolvedValue();
    });
    it('should throw an error if no sales lines are provided', async () => {
      // Arrange
      const salesLineIds = [];
      const salesGroup = { clientId: randomId() };
      const expectedError = 'No sales lines selected';
      // Act & Assert
      await expect(salesGroupHelpers.addSalesLinesByIds({ salesLineIds, salesGroup })).rejects.toThrow(expectedError);
    });
    it('should call salesGroupHelpers.addSalesLinesByFilter with the appropriate filter', async () => {
      // Arrange
      const salesLineIds = randomArray();
      const salesGroup = { clientId: randomId() };
      const filter = { id: { $in: salesLineIds } };
      salesGroupHelpers.addSalesLinesByFilter.mockResolvedValue({ totalAdded: salesLineIds.length });
      // Act
      await salesGroupHelpers.addSalesLinesByIds({ salesLineIds, salesGroup });
      // Assert
      expect(salesGroupHelpers.addSalesLinesByFilter).toHaveBeenCalledWith({ filter, salesGroup });
    });
  });

  describe('addSalesLinesByFilter', () => {
    const mockGetBigQueryFilterResult = {
      filter: randomString(),
      filterParams: randomArray(),
    };
    const bigQuery = {};
    let client; let salesGroup; let filter;
    let salesFileIds; let mockGetSalesResult;
    beforeEach(() => {
      client = { _id: randomId(), name: randomString() };
      salesGroup = {
        clientId: randomId(),
        save: jest.fn(),
      };
      filter = {};
      salesFileIds = randomArray().map(() => new ObjectId(randomId()));
      mockGetSalesResult = salesFileIds.map((salesFileId) => ({
        id: randomString(),
        salesFileId,
      }));
      BigQuery.mockReturnValue(bigQuery);

      jest.spyOn(Client, 'findById').mockResolvedValue(client);
      jest.spyOn(salesHelpers, 'getBigQueryFilter').mockReturnValue(mockGetBigQueryFilterResult);
      jest.spyOn(salesHelpers, 'getSales').mockReturnValue(mockGetSalesResult);
      jest.spyOn(salesGroupHelpers, 'areAllSalesLinesInSuspense').mockReturnValue(true);
      jest.spyOn(salesGroupHelpers, 'filterOutIdsAlreadyOnSalesGroup').mockImplementation((({ salesGroup, salesLines, salesFileIds }) => salesLines));
      jest.spyOn(salesGroupHelpers, 'addSalesLinesBySalesFileId').mockReturnValue();
      jest.spyOn(salesGroupHelpers, 'removeSalesLinesFromOtherSalesGroups').mockReturnValue();
    });
    it('should throw an error if client is not found', async () => {
      // Arrange
      Client.findById.mockReturnValue();
      const expectedError = 'Client not found';
      // Act & Assert
      await expect(salesGroupHelpers.addSalesLinesByFilter({ filter, salesGroup })).rejects.toThrow(expectedError);
    });
    it('should call salesGroupHelpers.getBigQueryFilter with the correct parameters', async () => {
      // Act
      await salesGroupHelpers.addSalesLinesByFilter({ filter, salesGroup });
      // Assert
      expect(salesHelpers.getBigQueryFilter).toHaveBeenCalledWith({
        filter,
        bigQuery,
        clientName: client.name,
        clientId: client._id.toString(),
      });
    });
    describe('when salesGroupHelpers.getBigQueryFilter throws an error', () => {
      it('should throw the error returned by salesGroupHelpers.getBigQueryFilter', async () => {
        // Arrange
        const expectedError = randomError();
        salesHelpers.getBigQueryFilter.mockRejectedValue(expectedError);
        // Act & Assert
        await expect(salesGroupHelpers.addSalesLinesByFilter({ filter, salesGroup })).rejects.toThrow(expectedError);
      });
    });
    it('should call bigQuery.getSales with the correct parameters', async () => {
      // Act
      await salesGroupHelpers.addSalesLinesByFilter({ filter, salesGroup });
      // Assert
      expect(salesHelpers.getSales).toHaveBeenCalledWith({
        bigQuery,
        select: ['id', 'salesFileId'],
        bqFilter: mockGetBigQueryFilterResult.filter,
        filterParams: mockGetBigQueryFilterResult.filterParams,
        options: {},
        clientId: client._id.toString(),
      });
    });
    it('should throw an error if no sales lines are returned by salesHelpers.getSales', async () => {
      // Arrange
      salesHelpers.getSales.mockResolvedValue(null);
      const expectedError = 'No filtered sales lines to add to a Group';
      // Act & Assert
      await expect(salesGroupHelpers.addSalesLinesByFilter({ filter, salesGroup })).rejects.toThrow(expectedError);
    });
    describe('salesGroup type is `resolved`', () => {
      beforeEach(() => {
        salesGroup = { ...salesGroup, type: 'resolved' };
      });
      it('should call salesGroupHelpers.areAllSalesLinesInSuspense with the correct parameters', async () => {
      // Act
        await salesGroupHelpers.addSalesLinesByFilter({ filter, salesGroup });
        // Assert
        expect(salesGroupHelpers.areAllSalesLinesInSuspense).toHaveBeenCalledWith({
          salesLines: mockGetSalesResult,
          salesFileIds,
          clientId: client._id.toString(),
        });
      });

      it('should throw an error if salesGroupHelpers.areAllSalesLinesInSuspense returns false', async () => {
        // Arrange
        jest.spyOn(salesGroupHelpers, 'areAllSalesLinesInSuspense').mockReturnValue(false);
        const expectedError = 'All sales lines must be in suspense to be resolved';
        // Act & Assert
        await expect(salesGroupHelpers.addSalesLinesByFilter({ filter, salesGroup })).rejects.toThrow(expectedError);
      });
    });
    describe('salesGroup type is `suspense`', () => {
      beforeEach(() => {
        salesGroup = { ...salesGroup, type: 'suspense' };
      });
      it('should call salesGroupHelpers.filterOutIdsAlreadyOnSalesGroup with the correct parameters', async () => {
        // Act
        await salesGroupHelpers.addSalesLinesByFilter({ filter, salesGroup });
        // Assert
        expect(salesGroupHelpers.filterOutIdsAlreadyOnSalesGroup).toHaveBeenCalledWith({
          salesGroup,
          salesLines: mockGetSalesResult,
          salesFileIds,
        });
      });
    });
    it('should sort sales lines by salesFileId and call addSalesLinesBySalesFileId for each salesFileId', async () => {
      // Arrange
      const salesLinesGrouped = mockGetSalesResult.reduce((acc, line) => {
        if (!acc[line.salesFileId]) { acc[line.salesFileId] = []; }
        acc[line.salesFileId].push(line.id);
        return acc;
      }, {});

      // Act
      await salesGroupHelpers.addSalesLinesByFilter({ filter, salesGroup });
      // Assert
      expect(salesGroupHelpers.addSalesLinesBySalesFileId).toHaveBeenCalledTimes(salesFileIds.length);
      const entries = Object.entries(salesLinesGrouped);
      for (let index = 0; index < entries.length; index += 1) {
        const [salesFileId, salesLineIds] = entries[index];
        expect(salesGroupHelpers.addSalesLinesBySalesFileId).toHaveBeenNthCalledWith(index + 1, { salesLineIds, salesFileId, salesGroup });
      }
    });
    it('should call salesGroupHelpers.removeSalesLinesFromOtherSalesGroups with the correct parameters', async () => {
      // Act
      await salesGroupHelpers.addSalesLinesByFilter({ filter, salesGroup });
      // Assert
      expect(salesGroupHelpers.removeSalesLinesFromOtherSalesGroups).toHaveBeenCalledWith({
        salesLines: mockGetSalesResult,
        salesFileIds,
        salesGroup,
      });
    });
    it('should return number of sales lines added, when successful', async () => {
      // Act
      const res = await salesGroupHelpers.addSalesLinesByFilter({ filter, salesGroup });
      // Assert
      expect(res).toEqual({ totalAdded: mockGetSalesResult.length });
    });

    it('should save the salesGroup once the lines have been added', async () => {
      // Act
      await salesGroupHelpers.addSalesLinesByFilter({ filter, salesGroup });
      // Assert
      expect(salesGroup.save).toHaveBeenCalled();
    });
  });

  describe('addSalesLinesBySalesFileId', () => {
    let existingSalesGroupLines;
    const SALES_GROUP_LINES_MAX_LINES = 10_000;
    const EXISTING_SALES_GROUP_LINES = 1_000;
    let mockLean;
    beforeEach(() => {
      existingSalesGroupLines = { _id: randomId(), salesLineIds: randomArray(EXISTING_SALES_GROUP_LINES) };
      mockLean = jest.fn().mockResolvedValue(existingSalesGroupLines);
      jest.spyOn(SalesGroupLines, 'findOne').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: mockLean,
        }),
      });
      jest.spyOn(SalesGroupLines, 'findByIdAndUpdate').mockResolvedValue();
      jest.spyOn(SalesGroupLines.prototype, 'save').mockResolvedValue();
    });

    it('should add sales lines to existing salesGroupLines if available and below max lines', async () => {
      // Arrange
      const salesLineIds = randomArray(SALES_GROUP_LINES_MAX_LINES - EXISTING_SALES_GROUP_LINES);
      const salesFileId = randomId();
      const salesGroup = { clientId: randomId(), type: randomString(), _id: randomId() };
      // Act
      await salesGroupHelpers.addSalesLinesBySalesFileId({ salesLineIds, salesFileId, salesGroup });
      // Assert
      expect(SalesGroupLines.findByIdAndUpdate).toHaveBeenCalledTimes(1);
      expect(SalesGroupLines.prototype.save).toHaveBeenCalledTimes(0);
    });

    it('should create new salesGroupLines lines to be added don\t fit within the max. 10_000', async () => {
      // Arrange
      const salesLineIds = randomArray((SALES_GROUP_LINES_MAX_LINES * 3) - EXISTING_SALES_GROUP_LINES);
      const salesFileId = randomId();
      const salesGroup = { clientId: randomId(), type: randomString(), _id: randomId() };
      // Act
      await salesGroupHelpers.addSalesLinesBySalesFileId({ salesLineIds, salesFileId, salesGroup });
      // Assert
      expect(SalesGroupLines.findByIdAndUpdate).toHaveBeenCalledTimes(1);
      expect(SalesGroupLines.prototype.save).toHaveBeenCalledTimes(2);
    });

    it('should create new salesGroupLines if none exist', async () => {
      // Arrange
      const salesLineIds = randomArray();
      const salesFileId = randomId();
      const salesGroup = { clientId: randomId(), type: randomString(), _id: randomId() };
      mockLean.mockResolvedValue();
      // Act
      await salesGroupHelpers.addSalesLinesBySalesFileId({ salesLineIds, salesFileId, salesGroup });
      // Assert
      expect(SalesGroupLines.prototype.save).toHaveBeenCalled();
    });

    it('should NOT mutate the salesGroup object', async () => {
      // Arrange
      const salesLineIds = randomArray();
      const salesFileId = randomId();
      const salesGroup = { clientId: randomId(), type: randomString(), _id: randomId() };
      mockLean.mockResolvedValue();
      const salesLineIdsCopy = [...salesLineIds];
      // Act
      await salesGroupHelpers.addSalesLinesBySalesFileId({ salesLineIds, salesFileId, salesGroup });
      // Assert
      expect(salesLineIdsCopy).toEqual(salesLineIds);
    });
  });

  describe('removeSalesLinesFromOtherSalesGroups', () => {
    let salesLines; let salesFileIds; let salesGroup;
    let salesGroupLinesWithSomeLinesToRemove; let salesGroupLinesWithAllLinesToRemove; let salesGroupLinesWithNoLinesToRemove;
    let otherSalesGroupLines;
    let mockSalesGroupSave; let returnedSalesGroup;
    beforeEach(() => {
      salesLines = randomArray(10).map(() => ({ id: randomId() }));
      salesFileIds = randomArray(3).map(() => new ObjectId(randomId()));
      salesGroup = { _id: new ObjectId(randomId()), clientId: randomId() };
      const someLinesToRemove = [...randomArray(10).map(() => randomId()), ...salesLines.map((line) => line.id).slice(0, 10)];
      salesGroupLinesWithSomeLinesToRemove = { _id: new ObjectId(randomId()), salesLineIds: someLinesToRemove, salesGroupId: new ObjectId(randomId()) };
      salesGroupLinesWithAllLinesToRemove = { _id: new ObjectId(randomId()), salesLineIds: salesLines.map((line) => line.id).slice(11), salesGroupId: new ObjectId(randomId()) };
      salesGroupLinesWithNoLinesToRemove = { _id: new ObjectId(randomId()), salesLineIds: randomArray(10).map(() => randomId()), salesGroupId: new ObjectId(randomId()) };
      otherSalesGroupLines = [
        salesGroupLinesWithSomeLinesToRemove,
        salesGroupLinesWithAllLinesToRemove,
        salesGroupLinesWithNoLinesToRemove,
      ];
      jest.spyOn(SalesGroupLines, 'find').mockReturnValue({
        lean: jest.fn().mockResolvedValue(otherSalesGroupLines.map((line) => ({ _id: line._id }))),
      });
      jest.spyOn(SalesGroupLines, 'findById').mockReturnValue({
        lean: jest.fn()
          .mockResolvedValueOnce(otherSalesGroupLines[0])
          .mockResolvedValueOnce(otherSalesGroupLines[1])
          .mockResolvedValueOnce(otherSalesGroupLines[2]),
      });
      jest.spyOn(SalesGroupLines, 'findByIdAndDelete').mockResolvedValue();
      jest.spyOn(SalesGroupLines, 'findByIdAndUpdate').mockResolvedValue();
      mockSalesGroupSave = jest.fn();
      returnedSalesGroup = {
        save: mockSalesGroupSave,
      };
      jest.spyOn(SalesGroup, 'findById').mockResolvedValue(returnedSalesGroup);
    });
    it('should call SalesGroupLines.find with the correct parameters', async () => {
      // Act
      await salesGroupHelpers.removeSalesLinesFromOtherSalesGroups({ salesLines, salesFileIds, salesGroup });
      // Assert
      expect(SalesGroupLines.find).toHaveBeenCalledWith(
        {
          clientId: salesGroup.clientId,
          salesGroupId: { $ne: salesGroup._id },
          salesFileId: { $in: salesFileIds },
        },
        { _id: 1 },
      );
    });
    describe('when SalesGroupLines.find returns some results', () => {
      it('should call SalesGroupLines.findById with the correct id for each item returned', async () => {
        // Act
        await salesGroupHelpers.removeSalesLinesFromOtherSalesGroups({ salesLines, salesFileIds, salesGroup });
        // Assert
        expect(SalesGroupLines.findById).toHaveBeenCalledTimes(otherSalesGroupLines.length);
        for (let i = 0; i < otherSalesGroupLines.length; i += 1) {
          expect(SalesGroupLines.findById).toHaveBeenNthCalledWith(i + 1, otherSalesGroupLines[i]._id, { salesLineIds: 1, salesGroupId: 1 });
        }
      });
      it('should remove sales lines from sales groups lines containing some of the lines to remove', async () => {
        // Arrange
        const idsToKeep = salesGroupLinesWithSomeLinesToRemove.salesLineIds.slice(0, 10);
        // Act
        await salesGroupHelpers.removeSalesLinesFromOtherSalesGroups({ salesLines, salesFileIds, salesGroup });
        // Assert
        expect(SalesGroupLines.findByIdAndUpdate).toHaveBeenCalledWith(
          salesGroupLinesWithSomeLinesToRemove._id,
          {
            salesLineIds: idsToKeep,
          },
        );
      });
      it('should delete salesGroupLines document when all sales lines are removed', async () => {
        // Act
        await salesGroupHelpers.removeSalesLinesFromOtherSalesGroups({ salesLines, salesFileIds, salesGroup });
        // Assert
        expect(SalesGroupLines.findByIdAndDelete).toHaveBeenCalledWith(
          salesGroupLinesWithAllLinesToRemove._id,
        );
      });
      it('should not update or delete salesGroupLines document when no sales lines are removed', async () => {
        // Arrange
        jest.spyOn(SalesGroupLines, 'findById').mockReturnValue({
          lean: jest.fn()
            .mockResolvedValue(salesGroupLinesWithNoLinesToRemove),
        });
        // Act
        await salesGroupHelpers.removeSalesLinesFromOtherSalesGroups({ salesLines, salesFileIds, salesGroup });
        // Assert
        expect(SalesGroupLines.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(SalesGroupLines.findByIdAndDelete).not.toHaveBeenCalled();
      });
    });
    it('should update all relevant Sales Groups', async () => {
      // Act
      await salesGroupHelpers.removeSalesLinesFromOtherSalesGroups({ salesLines, salesFileIds, salesGroup });
      // Assert
      expect(SalesGroup.findById).toHaveBeenCalledTimes(2);
      expect(SalesGroup.findById).toHaveBeenNthCalledWith(1, salesGroupLinesWithSomeLinesToRemove.salesGroupId.toString());
      expect(SalesGroup.findById).toHaveBeenNthCalledWith(2, salesGroupLinesWithAllLinesToRemove.salesGroupId.toString());
      expect(mockSalesGroupSave).toHaveBeenCalledTimes(2);
    });
  });

  describe('areAllSalesLinesInSuspense', () => {
    let salesLines; let salesFileIds; let clientId;
    beforeEach(() => {
      salesLines = randomArray(25_000).map(() => ({ id: randomId() }));
      salesFileIds = randomArray(3).map(() => new ObjectId(randomId()));
      clientId = randomId();
      jest.spyOn(SalesGroupLines, 'find').mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
    });
    it('should return true if all sales lines are found in suspense', async () => {
      // Arrange
      const foundSalesLineIds = salesLines.map((line) => line.id);
      jest.spyOn(SalesGroupLines, 'find').mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ salesLineIds: foundSalesLineIds }]),
      });
      // Act
      const result = await salesGroupHelpers.areAllSalesLinesInSuspense({ salesLines, salesFileIds, clientId });
      // Assert
      expect(result).toBe(true);
    });
    it('should return false if not all sales lines are found in suspense', async () => {
      // Arrange
      const foundSalesLineIds = salesLines.slice(0, 5).map((line) => line.id);
      jest.spyOn(SalesGroupLines, 'find').mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ salesLineIds: foundSalesLineIds }]),
      });
      // Act
      const result = await salesGroupHelpers.areAllSalesLinesInSuspense({ salesLines, salesFileIds, clientId });
      // Assert
      expect(result).toBe(false);
    });
  });
  describe('filterOutIdsAlreadyOnSalesGroup', () => {
    let salesGroup; let salesLines; let salesFileIds;
    beforeEach(() => {
      salesGroup = { _id: randomId(), type: randomString(), clientId: randomId() };
      salesLines = randomArray(10).map(() => ({ id: randomId() }));
      salesFileIds = randomArray(3).map(() => new ObjectId(randomId()));
      jest.spyOn(SalesGroupLines, 'find').mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
    });

    it('should return all sales lines if no existing lines are found', async () => {
      // Act
      const result = await salesGroupHelpers.filterOutIdsAlreadyOnSalesGroup({ salesGroup, salesLines, salesFileIds });
      // Assert
      expect(result).toEqual(salesLines);
    });

    it('should filter out sales lines that are already on the sales group', async () => {
      // Arrange
      const existingSalesLineIds = [salesLines[0].id, salesLines[1].id];
      jest.spyOn(SalesGroupLines, 'find').mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ salesLineIds: existingSalesLineIds }]),
      });
      // Act
      const result = await salesGroupHelpers.filterOutIdsAlreadyOnSalesGroup({ salesGroup, salesLines, salesFileIds });
      // Assert
      expect(result).toEqual(salesLines.filter((line) => !existingSalesLineIds.includes(line.id)));
    });
  });
  describe('paramsToFilterField', () => {
    describe('when curveUser has a clientId', () => {
      it('should add the user`s clientId to the params', () => {
        // Arrange
        const inputParams = {};
        const clientId = randomId();
        const curveUser = { clientId };
        // Act
        const result = salesGroupHelpers.paramsToFilterField(inputParams, curveUser);
        // Assert
        expect(result.clientId).toEqual(clientId);
      });
    });
    describe('when inputParams contains a type param', () => {
      it('should add the type to the output', () => {
        // Arrange
        const inputParams = { type: 'suspense' };
        const curveUser = {};
        // Act
        const result = salesGroupHelpers.paramsToFilterField(inputParams, curveUser);
        // Assert
        expect(result.type).toEqual(inputParams.type);
      });
    });
    describe('when inputParams contains a text param', () => {
      it('should add a regex search for the name field', () => {
        // Arrange
        const searchText = randomString();
        const inputParams = { text: searchText };
        const curveUser = {};
        // Act
        const result = salesGroupHelpers.paramsToFilterField(inputParams, curveUser);
        // Assert
        expect(result.$or).toEqual([{ name: { $regex: new RegExp(searchText, 'i') } }]);
      });
      describe('when inputParams.text is a valid ObjectId', () => {
        it('should add the text as the _id', () => {
          // Arrange
          const inputParams = { text: randomId() };
          const curveUser = {};
          // Act
          const result = salesGroupHelpers.paramsToFilterField(inputParams, curveUser);
          // Assert
          expect(result.$or).toContainEqual({ _id: inputParams.text });
        });
      });
    });

    describe('when inputParams contains a createdAfter param', () => {
      it('should add createdAt with $gte and $lte', () => {
        // Arrange
        const createdAfter = randomDate();
        const inputParams = { createdAfter };
        const curveUser = {};
        // Act
        const result = salesGroupHelpers.paramsToFilterField(inputParams, curveUser);
        // Assert
        expect(result.createdAt).toEqual({ $gte: createdAfter });
      });
    });
    describe('when inputParams contains a createdBefore param', () => {
      it('should add createdAt with $gte and $lte', () => {
        // Arrange
        const createdBefore = randomDate();
        const inputParams = { createdBefore };
        const curveUser = {};
        // Act
        const result = salesGroupHelpers.paramsToFilterField(inputParams, curveUser);
        // Assert
        expect(result.createdAt).toEqual({ $lte: createdBefore });
      });
    });
    describe('when inputParams contains createdAfter AND createdBefore', () => {
      it('should add createdAt with $gte and $lte', () => {
        // Arrange
        const createdAfter = randomDate();
        const createdBefore = randomDate;
        const inputParams = { createdAfter, createdBefore };
        const curveUser = {};
        // Act
        const result = salesGroupHelpers.paramsToFilterField(inputParams, curveUser);
        // Assert
        expect(result.createdAt).toEqual({ $gte: createdAfter, $lte: createdBefore });
      });
    });
    describe('when inputParams contains a notInclude array', () => {
      it('should add _id with $nin for the notInclude array', () => {
        // Arrange
        const notInclude = [randomId(), randomId()];
        const inputParams = { notInclude };
        const curveUser = {};
        // Act
        const result = salesGroupHelpers.paramsToFilterField(inputParams, curveUser);
        // Assert
        expect(result._id).toEqual({ $nin: notInclude.map((val) => new ObjectId(val)) });
      });
    });
  });

  describe('deleteSalesGroups', () => {
    let curveUser; let ids; let salesGroups;
    beforeEach(() => {
      curveUser = { clientId: randomId() };
      salesGroups = randomArray(2).map(() => ({ _id: randomId(), clientId: curveUser.clientId, name: randomString() }));
      ids = salesGroups.map((group) => group._id);
      jest.spyOn(SalesGroup, 'find').mockReturnValue({
        lean: jest.fn().mockResolvedValue(salesGroups),
      });
      jest.spyOn(salesGroupHelpers, 'checkSalesGroupsAssociations').mockResolvedValue([]);
      jest.spyOn(salesGroupHelpers, 'deleteSalesGroup').mockResolvedValue({ deletedCount: ids.length });
    });

    it('should return 409 if any of the sales groups have associations', async () => {
      // Arrange
      const associations = randomArray().map(() => ({ id: randomId() }));
      salesGroupHelpers.checkSalesGroupsAssociations.mockResolvedValue(associations);
      // Act
      const res = await salesGroupHelpers.deleteSalesGroups({ curveUser, ids });
      // Assert
      expect(res.code).toBe(409);
      expect(res.message).toBe('Some or all of the selected groups cannot be deleted as they contain lines that have been included in one or more locked periods');
      expect(res.associations).toEqual(associations);
    });
    it('should delete the sales groups if there are no associations and return the deleted count', async () => {
      // Act
      const res = await salesGroupHelpers.deleteSalesGroups({ curveUser, ids });
      // Assert
      expect(salesGroupHelpers.deleteSalesGroup).toHaveBeenCalledWith({ clientId: curveUser.clientId, salesGroupId: ids[0] });
      expect(salesGroupHelpers.deleteSalesGroup).toHaveBeenCalledWith({ clientId: curveUser.clientId, salesGroupId: ids[1] });
      expect(res.code).toBe(200);
      expect(res.deletedCount).toBe(ids.length);
    });
    describe('when only 1 sales group is found', () => {
      it('should delete only the one sales group if there are no associations and return the deleted count', async () => {
      // Arrange
        jest.spyOn(SalesGroup, 'find').mockReturnValue({
          lean: jest.fn().mockResolvedValue(salesGroups.slice(0, 1)),
        });
        // Act
        const res = await salesGroupHelpers.deleteSalesGroups({ curveUser, ids });
        // Assert
        expect(salesGroupHelpers.deleteSalesGroup).toHaveBeenCalledWith({ clientId: curveUser.clientId, salesGroupId: ids[0] });
        expect(res.code).toBe(200);
        expect(res.deletedCount).toBe(1);
      });
    });
    describe('when salesGroupHelpers.deleteSalesGroup throws an error', () => {
      it('should throw the error returned by salesGroupHelpers.deleteSalesGroup', async () => {
        // Arrange
        const expectedError = randomError();
        salesGroupHelpers.deleteSalesGroup.mockRejectedValue(expectedError);
        // Act & Assert
        await expect(salesGroupHelpers.deleteSalesGroups({ curveUser, ids })).rejects.toThrow(expectedError);
      });
    });
  });

  describe('deleteSalesGroup', () => {
    let clientId; let salesGroupId;
    beforeEach(() => {
      clientId = randomId();
      salesGroupId = randomId();
      jest.spyOn(SalesGroupLines, 'deleteMany').mockResolvedValue();
      jest.spyOn(SalesGroup, 'findByIdAndDelete').mockResolvedValue();
    });

    it('should call SalesGroupLines.deleteMany with the correct parameters', async () => {
      // Act
      await salesGroupHelpers.deleteSalesGroup({ clientId, salesGroupId });
      // Assert
      expect(SalesGroupLines.deleteMany).toHaveBeenCalledWith({ clientId, salesGroupId });
    });
    describe('when SalesGroupLines.deleteMany throws an error', () => {
      it('should throw the error returned by SalesGroupLines.deleteMany', async () => {
        // Arrange
        const expectedError = randomError();
        SalesGroupLines.deleteMany.mockRejectedValue(expectedError);
        // Act & Assert
        await expect(salesGroupHelpers.deleteSalesGroup({ clientId, salesGroupId })).rejects.toThrow(expectedError);
      });
    });
    it('should call SalesGroup.findByIdAndDelete with the correct parameters', async () => {
      // Act
      await salesGroupHelpers.deleteSalesGroup({ clientId, salesGroupId });
      // Assert
      expect(SalesGroup.findByIdAndDelete).toHaveBeenCalledWith(salesGroupId);
    });
    describe('when SalesGroup.findByIdAndDelete throws an error', () => {
      it('should throw the error returned by SalesGroup.findByIdAndDelete', async () => {
        // Arrange
        const expectedError = randomError();
        SalesGroup.findByIdAndDelete.mockRejectedValue(expectedError);
        // Act & Assert
        await expect(salesGroupHelpers.deleteSalesGroup({ clientId, salesGroupId })).rejects.toThrow(expectedError);
      });
    });
  });

  describe('checkSalesGroupsAssociations', () => {
    let clientId; let salesGroups; let lockedPeriods;
    beforeEach(() => {
      clientId = randomId();
      salesGroups = randomArray(3).map(() => ({ _id: randomId(), type: 'resolved', name: randomString() }));
      lockedPeriods = [
        { _id: randomId(), name: randomString(), resolvedGroupIds: [salesGroups[0]._id, salesGroups[1]._id] },
        { _id: randomId(), name: randomString(), resolvedGroupIds: [salesGroups[1]._id] },
        { _id: randomId(), name: randomString(), resolvedGroupIds: [randomId()] },
      ];
      jest.spyOn(Period, 'find').mockReturnValue({
        lean: jest.fn().mockResolvedValue(lockedPeriods),
      });
    });

    it('should return an array of associations between sales groups and locked periods', async () => {
      // Act
      const result = await salesGroupHelpers.checkSalesGroupsAssociations({ clientId, salesGroups });
      // Assert
      expect(Period.find).toHaveBeenCalledWith({
        locked: true,
        clientId,
        resolvedGroupIds: { $in: salesGroups.map((group) => group._id) },
      }, { name: 1, resolvedGroupIds: 1 });
      expect(result).toEqual([
        {
          id: salesGroups[0]._id.toString(),
          name: salesGroups[0].name,
          lockedPeriods: [
            { id: lockedPeriods[0]._id.toString(), name: lockedPeriods[0].name },
          ],
        },
        {
          id: salesGroups[1]._id.toString(),
          name: salesGroups[1].name,
          lockedPeriods: [
            { id: lockedPeriods[0]._id.toString(), name: lockedPeriods[0].name },
            { id: lockedPeriods[1]._id.toString(), name: lockedPeriods[1].name },
          ],
        },
      ]);
    });
    it('should only return associations for resolved groups', async () => {
      // Arrange
      salesGroups[1].type = 'suspense';
      // Act
      const result = await salesGroupHelpers.checkSalesGroupsAssociations({ clientId, salesGroups });
      // Assert
      expect(Period.find).toHaveBeenCalledWith({
        locked: true,
        clientId,
        resolvedGroupIds: { $in: [salesGroups[0]._id, salesGroups[2]._id] },
      }, { name: 1, resolvedGroupIds: 1 });
      expect(result).toEqual([
        {
          id: salesGroups[0]._id.toString(),
          name: salesGroups[0].name,
          lockedPeriods: [
            { id: lockedPeriods[0]._id.toString(), name: lockedPeriods[0].name },
          ],
        },
      ]);
    });
    describe('when none of the provided groups are resolved groups', () => {
      it('should return an empty array', async () => {
        // Arrange
        salesGroups.forEach((group) => { group.type = randomString(); });
        // Act
        const result = await salesGroupHelpers.checkSalesGroupsAssociations({ clientId, salesGroups });
        // Assert
        expect(Period.find).not.toHaveBeenCalled();
        expect(result).toEqual([]);
      });
    });
    describe('when Period.find returns no locked periods', () => {
      it('should return an empty array', async () => {
        // Arrange
        jest.spyOn(Period, 'find').mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        });
        // Act
        const result = await salesGroupHelpers.checkSalesGroupsAssociations({ clientId, salesGroups });
        // Assert
        expect(result).toEqual([]);
      });
    });
  });
});
