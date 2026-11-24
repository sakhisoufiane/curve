jest.mock('@curveroyaltysystems/platform-shared-utils');
jest.mock('../../../models/payee');
jest.mock('../../../models/salesFile');
jest.mock('../../../models/salesGroupLines');
jest.mock('../../../models/salesGroup');
jest.mock('../../../models/period');
jest.mock('../../../models/client');
jest.mock('../helpers');
jest.mock('../../../models/track');
jest.mock('../../../models/release');
jest.mock('../../../models/work');

const { BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const { randomArray, randomError, randomFloat, randomId, randomInt, randomJsDate, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const moment = require('moment');
const { ObjectId } = require('mongodb');
const helpers = require('../helpers');
const SalesFile = require('../../../models/salesFile');
const SalesGroupLines = require('../../../models/salesGroupLines');
const SalesGroup = require('../../../models/salesGroup');
const Period = require('../../../models/period');
const Client = require('../../../models/client');

const salesHelpers = require('./salesHelpers');

describe('salesHelpers Unit Tests', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(randomJsDate());
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(jest.restoreAllMocks);

  describe('processUpdates', () => {
    let clientId; let client; let filter; let data; let salesLines;
    let bigQuery; let mockInputTable; let salesFileIds; let mockQueryJobPromise; let mockGetBigQueryFilterResult;
    beforeEach(() => {
      clientId = randomId();
      client = { _id: clientId };
      filter = { clientId };
      data = randomArray().map((item) => ({ [item]: randomString() }));
      salesLines = randomArray().map((item) => ({ id: item }));

      mockGetBigQueryFilterResult = {
        filter: randomString(),
        filterParams: randomArray(),
      };

      jest.spyOn(SalesFile, 'updateMany').mockResolvedValue();
      jest.spyOn(salesHelpers, 'getBigQueryFilter').mockResolvedValue(mockGetBigQueryFilterResult);
      jest.spyOn(salesHelpers, 'updateSales').mockResolvedValue();
      jest.spyOn(salesHelpers, 'getSales').mockResolvedValue(salesLines);
      jest.spyOn(salesHelpers, 'updateSalesGroupsFromSalesLineIds').mockResolvedValue();

      salesFileIds = randomArray();
      mockQueryJobPromise = jest.fn().mockResolvedValue(salesFileIds.map((id) => ({ salesFileId: id })));
      bigQuery = {
        queryJobPromise: mockQueryJobPromise,
        inputTable: mockInputTable,
      };
      BigQuery.mockReturnValue(bigQuery);
    });

    it('should call salesHelpers.getBigQueryFilter with the correct parameters', async () => {
      // Act
      await salesHelpers.processUpdates(client, filter, data);
      // Assert
      expect(salesHelpers.getBigQueryFilter).toHaveBeenCalledWith({
        filter,
        bigQuery,
        clientName: client.name,
        clientId,
      });
    });
    describe('when salesHelpers.getBigQueryFilter throws an error', () => {
      it('should call the callback with a 500 status and error message', async () => {
        // Arrange
        salesHelpers.getBigQueryFilter.mockRejectedValue();
        // Act
        const { status, message } = await salesHelpers.processUpdates(client, filter, data);
        // Assert
        expect(status).toBe(500);
        expect(message).toBe('Internal error, please try again');
      });
    });
    it('should call bigQuery.queryJobPromise with the correct parameters', async () => {
      // Arrange
      const query = `SELECT DISTINCT salesFileId FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\` WHERE ${mockGetBigQueryFilterResult.filter}`;
      const { filterParams } = mockGetBigQueryFilterResult;
      // Act
      await salesHelpers.processUpdates(client, filter, data);
      // Assert
      expect(bigQuery.queryJobPromise).toHaveBeenCalledWith({ query: { query, params: filterParams }, labels: { client_id: client._id.toString() ?? '', job_type: 'api_sales_query_distinct' } });
    });
    describe('when bigQuery.queryJobPromise returns an empty array', () => {
      it('should call the callback with a 500 status and error message', async () => {
        // Arrange
        bigQuery.queryJobPromise.mockResolvedValue([]);
        // Act
        const { status, message } = await salesHelpers.processUpdates(client, filter, data);
        // Assert
        expect(status).toBe(500);
        expect(message).toBe('Internal error, please try again');
      });
    });

    it('should call salesHelpers.getSales with the correct parameters', async () => {
      // Arrange
      const bqFilter = mockGetBigQueryFilterResult.filter;
      const { filterParams } = mockGetBigQueryFilterResult;
      // Act
      await salesHelpers.processUpdates(client, filter, data);
      // Assert
      expect(salesHelpers.getSales).toHaveBeenCalledWith({ bigQuery, select: ['id'], bqFilter, filterParams, options: {}, clientId: client._id.toString() });
    });
    describe('when salesHelpers.getSales returns an empty array', () => {
      it('should call the callback with a 304 status and message', async () => {
        // Arrange
        salesHelpers.getSales.mockResolvedValue([]);
        // Act
        const { status, message } = await salesHelpers.processUpdates(client, filter, data);
        // Assert
        expect(status).toBe(304);
        expect(message).toBe('Filter returned no sales lines to update');
      });
    });

    describe('when bigQuery.queryJobPromise returns a non-empty array', () => {
      it('should call SalesFile.updateMany with the correct parameters', async () => {
        // Act
        await salesHelpers.processUpdates(client, filter, data);
        // Assert
        expect(SalesFile.updateMany).toHaveBeenCalledWith(
          { clientId, _id: { $in: salesFileIds } },
          { $set: { updatedAt: new Date() } },
        );
      });
      describe('when SalesFile.updateMany returns an error', () => {
        it('should call the callback with a 500 status and error message', async () => {
          // Arrange
          const error = randomError();
          jest.spyOn(SalesFile, 'updateMany').mockRejectedValue(error);
          // Act
          const { status, message } = await salesHelpers.processUpdates(client, filter, data);
          // Assert
          expect(status).toBe(500);
          expect(message).toBe('Internal error, please try again');
        });
      });
      it('should call salesHelpers.updateSalesGroupsFromSalesLineIds with the correct parameters', async () => {
        // Act
        await salesHelpers.processUpdates(client, filter, data);
        // Assert
        expect(salesHelpers.updateSalesGroupsFromSalesLineIds).toHaveBeenCalledWith(
          { salesLines, salesFileIds, clientId },
        );
      });
      describe('when salesHelpers.updateSalesGroupsFromSalesLineIds returns an error', () => {
        it('should call the callback with a 500 status and error message', async () => {
          // Arrange
          salesHelpers.updateSalesGroupsFromSalesLineIds.mockRejectedValue(randomError());
          // Act
          const { status, message } = await salesHelpers.processUpdates(client, filter, data);
          // Assert
          expect(status).toBe(500);
          expect(message).toBe('Internal error, please try again');
        });
      });
      it('should call salesHelpers.updateSales with the correct parameters', async () => {
        // Act
        await salesHelpers.processUpdates(client, filter, data);
        // Assert
        expect(salesHelpers.updateSales).toHaveBeenCalledWith(
          { bigQuery, update: data, bqFilter: mockGetBigQueryFilterResult.filter, filterParams: mockGetBigQueryFilterResult.filterParams, clientId: client._id.toString() },
        );
      });
      describe('when salesHelpers.updateSales returns an error', () => {
        it('should call the callback with a 500 status and error message', async () => {
          // Arrange
          salesHelpers.updateSales.mockRejectedValue(randomError());
          // Act
          const { status, message } = await salesHelpers.processUpdates(client, filter, data);
          // Assert
          expect(status).toBe(500);
          expect(message).toBe('Internal error, please try again');
        });
      });
      describe('when salesHelpers.updateSales returns a success', () => {
        it('should call the callback with a 200 status and success message', async () => {
          // Act
          const { status, message } = await salesHelpers.processUpdates(client, filter, data);
          // Assert
          expect(status).toBe(200);
          expect(message).toBe('Successfully updated');
        });
      });
    });
  });

  describe('escapeCharacters', () => {
    it('should escape single quotes', () => {
      // Arrange
      const string = randomString();
      const input = `'${string}'`;
      // Act
      const result = salesHelpers.escapeCharacters(input);
      // Assert
      expect(result).toEqual(`\\'${string}\\'`);
    });
    it('should escape double quotes', () => {
      // Arrange
      const string = randomString();
      const input = `"${string}"`;
      // Act
      const result = salesHelpers.escapeCharacters(input);
      // Assert
      expect(result).toEqual(`\\"${string}\\"`);
    });
  });

  describe('paramsToFilterField', () => {
    let clientId;
    let mockSalesFileFindLean; let salesFileFindSpy;
    let mockSalesGroupLinesFindLean; let salesGroupLinesFindSpy;

    beforeEach(() => {
      clientId = randomId();
      mockSalesFileFindLean = jest.fn().mockResolvedValue([]);
      salesFileFindSpy = jest.spyOn(SalesFile, 'find').mockReturnValue({
        lean: mockSalesFileFindLean,
      });

      mockSalesGroupLinesFindLean = jest.fn().mockResolvedValue([]);
      salesGroupLinesFindSpy = jest.spyOn(SalesGroupLines, 'find').mockReturnValue({
        lean: mockSalesGroupLinesFindLean,
      });
    });

    describe('when passed a csv property', () => {
      describe('and releaseIds property', () => {
        it('should add this to the output params with Input prefix', async () => {
          // Arrange
          const inputParams = { csv: true, releaseIds: randomArray() };
          // Act
          const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
          // Assert
          expect(params['Input.releaseId']).toEqual({ $in: inputParams.releaseIds });
        });
      });
      describe('and trackIds property', () => {
        it('should add this to the output params with Input prefix', async () => {
          // Arrange
          const inputParams = { csv: true, trackIds: randomArray() };
          // Act
          const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
          // Assert
          expect(params['Input.trackId']).toEqual({ $in: inputParams.trackIds });
        });
      });
      describe('and workIds property', () => {
        it('should add this to the output params with Input prefix', async () => {
          // Arrange
          const inputParams = { csv: true, workIds: randomArray() };
          // Act
          const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
          // Assert
          expect(params['Input.workId']).toEqual({ $in: inputParams.workIds });
        });
      });
      describe('and contractId property', () => {
        it('should add this to the output params with Input prefix', async () => {
          // Arrange
          const inputParams = { csv: true, contractId: randomArray() };
          // Act
          const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
          // Assert
          expect(params['Input.contractId']).toEqual({ $in: inputParams.contractId });
        });
      });
    });

    describe('when NOT passed a csv property', () => {
      describe('and releaseIds property', () => {
        it('should add this to the output params without Input prefix', async () => {
          // Arrange
          const inputParams = { csv: false, releaseIds: randomArray() };
          // Act
          const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
          // Assert
          expect(params.releaseId).toEqual({ $in: inputParams.releaseIds });
        });
      });
      describe('and trackIds property', () => {
        it('should add this to the output params without Input prefix', async () => {
          // Arrange
          const inputParams = { csv: false, trackIds: randomArray() };
          // Act
          const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
          // Assert
          expect(params.trackId).toEqual({ $in: inputParams.trackIds });
        });
      });
      describe('and workIds property', () => {
        it('should add this to the output params without Input prefix', async () => {
          // Arrange
          const inputParams = { csv: false, workIds: randomArray() };
          // Act
          const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
          // Assert
          expect(params.workId).toEqual({ $in: inputParams.workIds });
        });
      });
      describe('and contractId property', () => {
        it('should add this to the output params without Input prefix', async () => {
          // Arrange
          const inputParams = { csv: false, contractId: randomArray() };
          // Act
          const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
          // Assert
          expect(params.contractId).toEqual({ $in: inputParams.contractId });
        });
      });
    });

    describe('when passed a partitionNo property', () => {
      it('should add this to the output params as an int', async () => {
        // Arrange
        const inputParams = { partitionNo: randomString() };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.partitionNo).toEqual(parseInt(inputParams.partitionNo));
      });
    });

    describe('when passed a trackTitle property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { trackTitle: stringWithQuotes };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.originalTrackTitle).toEqual(salesHelpers.escapeCharacters(inputParams.trackTitle));
      });
    });

    describe('when passed a originalTrackTitle property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { originalTrackTitle: stringWithQuotes };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.originalTrackTitle).toEqual(salesHelpers.escapeCharacters(inputParams.originalTrackTitle));
      });
    });

    describe('when passed a trackArtist property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { trackArtist: stringWithQuotes };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.originalTrackArtist).toEqual(salesHelpers.escapeCharacters(inputParams.trackArtist));
      });
    });

    describe('when passed a originalTrackArtist property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { originalTrackArtist: stringWithQuotes };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.originalTrackArtist).toEqual(salesHelpers.escapeCharacters(inputParams.originalTrackArtist));
      });
    });

    describe('when passed a releaseArtist property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { releaseArtist: stringWithQuotes };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.originalReleaseArtist).toEqual(salesHelpers.escapeCharacters(inputParams.releaseArtist));
      });
    });

    describe('when passed a originalReleaseArtist property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { originalReleaseArtist: stringWithQuotes };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.originalReleaseArtist).toEqual(salesHelpers.escapeCharacters(inputParams.originalReleaseArtist));
      });
    });

    describe('when passed a releaseTitle property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { releaseTitle: stringWithQuotes };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.originalReleaseTitle).toEqual(salesHelpers.escapeCharacters(inputParams.releaseTitle));
      });
    });

    describe('when passed a originalReleaseTitle property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { originalReleaseTitle: stringWithQuotes };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.originalReleaseTitle).toEqual(salesHelpers.escapeCharacters(inputParams.originalReleaseTitle));
      });
    });

    describe('when passed a catType property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const inputParams = { catType: randomString() };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.catType).toEqual(inputParams.catType);
      });
    });

    describe('when passed a barcode property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { barcode: stringWithQuotes };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.barcode).toEqual(salesHelpers.escapeCharacters(inputParams.barcode));
      });
    });

    describe('when passed a catNo property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { catNo: stringWithQuotes };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.catNo).toEqual(salesHelpers.escapeCharacters(inputParams.catNo));
      });
    });

    describe('when passed a isrc property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { isrc: stringWithQuotes };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.isrc).toEqual(salesHelpers.escapeCharacters(inputParams.isrc));
      });
    });

    describe('when passed a territory property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { territory: stringWithQuotes };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.territory).toEqual(salesHelpers.escapeCharacters(inputParams.territory));
      });
    });

    describe('when passed a distributionChannel property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { distributionChannel: stringWithQuotes };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.distributionChannel).toEqual(salesHelpers.escapeCharacters(inputParams.distributionChannel));
      });
    });

    describe('when passed a configuration property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { configuration: stringWithQuotes };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.configuration).toEqual(salesHelpers.escapeCharacters(inputParams.configuration));
      });
    });

    describe('when passed a source property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { source: stringWithQuotes };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.source).toEqual(salesHelpers.escapeCharacters(inputParams.source));
      });
    });

    describe('when passed a subSource property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { subSource: stringWithQuotes };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.subSource).toEqual(salesHelpers.escapeCharacters(inputParams.subSource));
      });
    });

    describe('when passed a status property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const inputParams = { status: randomString() };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.status).toEqual(inputParams.status);
      });
    });

    describe('when passed a originalIdentifier property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { originalIdentifier: stringWithQuotes };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.originalIdentifier).toEqual(salesHelpers.escapeCharacters(inputParams.originalIdentifier));
      });
    });

    describe('when passed a originalWorkTitle property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { originalWorkTitle: stringWithQuotes };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.originalWorkTitle).toEqual(salesHelpers.escapeCharacters(inputParams.originalWorkTitle));
      });
    });

    describe('when passed a originalComposers property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { originalComposers: stringWithQuotes };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.originalComposers).toEqual(salesHelpers.escapeCharacters(inputParams.originalComposers));
      });
    });

    describe('when passed a iswc property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { iswc: stringWithQuotes };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.iswc).toEqual(salesHelpers.escapeCharacters(inputParams.iswc));
      });
    });

    describe('when passed a tunecode property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { tunecode: stringWithQuotes };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.tunecode).toEqual(salesHelpers.escapeCharacters(inputParams.tunecode));
      });
    });

    describe('when passed a salesFileId property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const inputParams = { salesFileId: randomString() };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.salesFileId).toEqual(inputParams.salesFileId);
      });
    });

    describe('when passed a salesFileIds property', () => {
      it('should add this to the output params', async () => {
        // Arrange
        const inputParams = { salesFileIds: randomString() };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.salesFileId).toEqual({ $in: inputParams.salesFileIds });
      });
    });

    describe('when passed a FilterType key', () => {
      it('should add these to the output params', async () => {
        // Arrange
        const filterKey = `${randomString}FilterType`;
        const inputParams = { [filterKey]: randomString() };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params[filterKey]).toEqual(inputParams[filterKey]);
      });
      it('should add a `Input.` prefix when also passed the csv property', async () => {
        // Arrange
        const filterKey = `${randomString}FilterType`;
        const inputParams = { csv: true, [filterKey]: randomString() };
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params[`Input.${filterKey}`]).toEqual(inputParams[filterKey]);
      });
    });

    describe('when NOT passed a salesFileId property', () => {
      it('should add this to the output params as an array of salesFileIds', async () => {
        // Arrange
        const inputParams = {};
        const salesFiles = randomArray(3).map(() => ({ _id: randomId() }));
        mockSalesFileFindLean.mockResolvedValue(salesFiles);
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(salesFileFindSpy).toHaveBeenCalledWith({ clientId }, { _id: 1 });
        expect(mockSalesFileFindLean).toHaveBeenCalled();
        expect(params.salesFileId).toEqual({ $in: salesFiles.map((salesFile) => salesFile._id.toString()) });
      });
    });

    describe('when passed a suspenseGroupIds property', () => {
      it('should call SalesGroupLines.find with the correct parameters', async () => {
        // Arrange
        const suspenseGroupIds = randomArray(3);
        const inputParams = {
          suspenseGroupIds,
        };
        const expectedFilter = {
          clientId,
          salesGroupId: { $in: suspenseGroupIds },
          type: 'suspense',
        };
        // Act
        await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(salesGroupLinesFindSpy).toHaveBeenCalledWith(expectedFilter, { salesLineIds: 1 });
        expect(mockSalesGroupLinesFindLean).toHaveBeenCalled();
      });
      it('should add the salesLineIds, combined from all results to the output params', async () => {
        // Arrange
        const suspenseGroupIds = randomArray(3);
        const inputParams = {
          suspenseGroupIds,
        };
        const salesGroupLines = randomArray(3).map(() => ({ salesLineIds: randomArray(2) }));
        mockSalesGroupLinesFindLean.mockResolvedValue(salesGroupLines);
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.id).toEqual({ $in: salesGroupLines.flatMap((line) => line.salesLineIds) });
      });
    });

    describe('when passed a resolvedGroupIds property', () => {
      it('should call SalesGroupLines.find with the correct parameters', async () => {
        // Arrange
        const resolvedGroupIds = randomArray(3);
        const inputParams = {
          resolvedGroupIds,
        };
        const expectedFilter = {
          clientId,
          salesGroupId: { $in: resolvedGroupIds },
          type: 'resolved',
        };
        // Act
        await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(salesGroupLinesFindSpy).toHaveBeenCalledWith(expectedFilter, { salesLineIds: 1 });
        expect(mockSalesGroupLinesFindLean).toHaveBeenCalled();
      });
      it('should add the salesLineIds, combined from all results to the output params', async () => {
        // Arrange
        const resolvedGroupIds = randomArray(3);
        const inputParams = {
          resolvedGroupIds,
        };
        const salesGroupLines = randomArray(3).map(() => ({ salesLineIds: randomArray(2) }));
        mockSalesGroupLinesFindLean.mockResolvedValue(salesGroupLines);
        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(params.id).toEqual({ $in: salesGroupLines.flatMap((line) => line.salesLineIds) });
      });
    });

    describe('when passed a periodIds property', () => {
      let mockPeriodFindLean;
      let periodFindSpy;
      let mockClientFindByIdLean;
      let clientFindByIdSpy;

      beforeEach(() => {
        mockPeriodFindLean = jest.fn().mockResolvedValue([]);
        periodFindSpy = jest.spyOn(Period, 'find').mockReturnValue({
          lean: mockPeriodFindLean,
        });

        mockClientFindByIdLean = jest.fn().mockResolvedValue({ features: { suspense: false } });
        clientFindByIdSpy = jest.spyOn(Client, 'findById').mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: mockClientFindByIdLean,
          }),
        });
      });

      it('should call Period.find with the correct parameters', async () => {
        // Arrange
        const periodIds = randomArray(3);
        const inputParams = { periodIds };
        // Act
        await salesHelpers.paramsToFilterField(clientId, inputParams);
        // Assert
        expect(periodFindSpy).toHaveBeenCalledWith(
          { _id: { $in: periodIds } },
          { salesFilesIds: 1, _id: 0 },
        );
      });

      describe('when client is not provided', () => {
        it('should call Client.findById to fetch client features', async () => {
          // Arrange
          const periodIds = randomArray(3);
          const inputParams = { periodIds };
          // Act
          await salesHelpers.paramsToFilterField(clientId, inputParams, undefined);
          // Assert
          expect(clientFindByIdSpy).toHaveBeenCalledWith(clientId);
          expect(Client.findById(clientId).select).toHaveBeenCalledWith('features.suspense');
        });
      });

      describe('when client is provided but missing features', () => {
        it('should call Client.findById to fetch client features', async () => {
          // Arrange
          const periodIds = randomArray(3);
          const inputParams = { periodIds };
          const clientWithoutFeatures = { _id: clientId, name: 'Test Client' };
          // Act
          await salesHelpers.paramsToFilterField(clientId, inputParams, clientWithoutFeatures);
          // Assert
          expect(clientFindByIdSpy).toHaveBeenCalledWith(clientId);
        });
      });

      describe('when client is provided with features', () => {
        it('should NOT call Client.findById', async () => {
          // Arrange
          const periodIds = randomArray(3);
          const inputParams = { periodIds };
          const clientWithFeatures = { _id: clientId, name: 'Test Client', features: { suspense: true } };
          // Act
          await salesHelpers.paramsToFilterField(clientId, inputParams, clientWithFeatures);
          // Assert
          expect(clientFindByIdSpy).not.toHaveBeenCalled();
        });
      });

      describe('when suspense feature is disabled', () => {
        it('should call Period.find with salesFilesIds projection only', async () => {
          // Arrange
          const periodIds = randomArray(3);
          const inputParams = { periodIds };
          const clientWithFeatures = { _id: clientId, features: { suspense: false } };
          // Act
          await salesHelpers.paramsToFilterField(clientId, inputParams, clientWithFeatures);
          // Assert
          expect(periodFindSpy).toHaveBeenCalledWith(
            { _id: { $in: periodIds } },
            { salesFilesIds: 1, _id: 0 },
          );
        });

        it('should create filter with $or containing only salesFileId', async () => {
          // Arrange
          const periodIds = randomArray(3);
          const inputParams = { periodIds };
          const clientWithFeatures = { _id: clientId, features: { suspense: false } };
          const periods = [
            { salesFilesIds: randomArray(2) },
            { salesFilesIds: randomArray(2) },
          ];
          mockPeriodFindLean.mockResolvedValue(periods);
          // Act
          const params = await salesHelpers.paramsToFilterField(clientId, inputParams, clientWithFeatures);
          // Assert
          expect(params.$or).toBeDefined();
          expect(params.$or.length).toBeGreaterThan(0);
        });
      });

      describe('when suspense feature is enabled', () => {
        it('should call Period.find with salesFilesIds and resolvedGroupIds projections', async () => {
          // Arrange
          const periodIds = randomArray(3);
          const inputParams = { periodIds };
          const clientWithFeatures = { _id: clientId, features: { suspense: true } };
          // Act
          await salesHelpers.paramsToFilterField(clientId, inputParams, clientWithFeatures);
          // Assert
          expect(periodFindSpy).toHaveBeenCalledWith(
            { _id: { $in: periodIds } },
            { salesFilesIds: 1, _id: 0, resolvedGroupIds: 1 },
          );
        });

        it('should call SalesGroupLines.find for resolved groups when resolvedGroupIds exist', async () => {
          // Arrange
          const periodIds = randomArray(3);
          const inputParams = { periodIds };
          const clientWithFeatures = { _id: clientId, features: { suspense: true } };
          const periods = [
            { salesFilesIds: randomArray(2), resolvedGroupIds: randomArray(2) },
          ];
          mockPeriodFindLean.mockResolvedValue(periods);

          mockSalesGroupLinesFindLean.mockResolvedValue([
            { salesLineIds: randomArray(2) },
          ]);

          // Act
          await salesHelpers.paramsToFilterField(clientId, inputParams, clientWithFeatures);

          // Assert
          expect(salesGroupLinesFindSpy).toHaveBeenCalledWith(
            {
              clientId,
              type: 'resolved',
              salesGroupId: { $in: periods[0].resolvedGroupIds },
              salesFileIds: { $nin: periods[0].salesFilesIds },
            },
            { salesLineIds: 1, _id: 0 },
          );
        });

        it('should NOT query SalesGroupLines when no resolvedGroupIds', async () => {
          // Arrange
          const periodIds = randomArray(3);
          const inputParams = { periodIds };
          const clientWithFeatures = { _id: clientId, features: { suspense: true } };
          const periods = [
            { salesFilesIds: randomArray(2), resolvedGroupIds: [] },
          ];
          mockPeriodFindLean.mockResolvedValue(periods);

          // Act
          await salesHelpers.paramsToFilterField(clientId, inputParams, clientWithFeatures);

          // Assert
          expect(salesGroupLinesFindSpy).not.toHaveBeenCalled();
        });
      });

      it('should create correct $or filter with salesFileIds and resolved line ids', async () => {
        // Arrange
        const periodIds = randomArray(3);
        const inputParams = { periodIds };
        const clientWithFeatures = { _id: clientId, features: { suspense: true } };
        const salesFileIds = randomArray(3);
        const resolvedGroupIds = randomArray(2);
        const resolvedLineIds = randomArray(3);

        const periods = [
          { salesFilesIds: salesFileIds, resolvedGroupIds },
        ];
        mockPeriodFindLean.mockResolvedValue(periods);
        mockSalesGroupLinesFindLean.mockResolvedValue([
          { salesLineIds: resolvedLineIds },
        ]);

        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams, clientWithFeatures);

        // Assert
        expect(params.$or).toEqual([
          { id: { $in: resolvedLineIds } },
          { salesFileId: { $in: salesFileIds } },
        ]);
      });

      it('should handle multiple periods with combined salesFileIds and resolvedGroupIds', async () => {
        // Arrange
        const periodIds = randomArray(3);
        const inputParams = { periodIds };
        const clientWithFeatures = { _id: clientId, features: { suspense: true } };
        const salesFileIds1 = randomArray(2);
        const salesFileIds2 = randomArray(2);
        const resolvedGroupIds1 = randomArray(1);
        const resolvedGroupIds2 = randomArray(1);

        const periods = [
          { salesFilesIds: salesFileIds1, resolvedGroupIds: resolvedGroupIds1 },
          { salesFilesIds: salesFileIds2, resolvedGroupIds: resolvedGroupIds2 },
        ];
        mockPeriodFindLean.mockResolvedValue(periods);
        mockSalesGroupLinesFindLean.mockResolvedValue([
          { salesLineIds: randomArray(2) },
        ]);

        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams, clientWithFeatures);

        // Assert
        expect(params.$or).toBeDefined();
        expect(params.$or[1]).toEqual({
          salesFileId: {
            $in: expect.arrayContaining(
              [...salesFileIds1, ...salesFileIds2],
            ),
          },
        });
      });

      it('should handle period with resolvedGroupIds but no salesFilesIds when suspense is enabled', async () => {
        // Arrange
        const periodIds = randomArray(3);
        const inputParams = { periodIds };
        const clientWithFeatures = { _id: clientId, features: { suspense: true } };
        const resolvedGroupIds = randomArray(2);
        const resolvedLineIds = randomArray(3);

        const periods = [
          { resolvedGroupIds }, // No salesFilesIds property
        ];
        mockPeriodFindLean.mockResolvedValue(periods);
        mockSalesGroupLinesFindLean.mockResolvedValue([
          { salesLineIds: resolvedLineIds },
        ]);

        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams, clientWithFeatures);

        // Assert
        expect(salesGroupLinesFindSpy).toHaveBeenCalledWith(
          {
            clientId,
            type: 'resolved',
            salesGroupId: { $in: resolvedGroupIds },
            salesFileIds: { $nin: [] }, // Empty array when no salesFilesIds
          },
          { salesLineIds: 1, _id: 0 },
        );
        expect(params.$or).toEqual([
          { id: { $in: resolvedLineIds } },
          { salesFileId: null }, // null when no salesFilesIds
        ]);
      });

      it('should return null for id in $or when no resolvedGroupLines', async () => {
        // Arrange
        const periodIds = randomArray(3);
        const inputParams = { periodIds };
        const clientWithFeatures = { _id: clientId, features: { suspense: true } };
        const salesFileIds = randomArray(2);
        const resolvedGroupIds = randomArray(2);

        const periods = [
          { salesFilesIds: salesFileIds, resolvedGroupIds },
        ];
        mockPeriodFindLean.mockResolvedValue(periods);
        mockSalesGroupLinesFindLean.mockResolvedValue([]); // No resolved lines

        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams, clientWithFeatures);

        // Assert
        expect(params.$or).toEqual([
          { id: null }, // null when no resolved lines
          { salesFileId: { $in: salesFileIds } },
        ]);
      });

      it('should return null for both id and salesFileId in $or when no data', async () => {
        // Arrange
        const periodIds = randomArray(3);
        const inputParams = { periodIds };
        const clientWithFeatures = { _id: clientId, features: { suspense: true } };

        const periods = [
          { }, // No salesFilesIds or resolvedGroupIds
        ];
        mockPeriodFindLean.mockResolvedValue(periods);

        // Act
        const params = await salesHelpers.paramsToFilterField(clientId, inputParams, clientWithFeatures);

        // Assert
        expect(params.$or).toEqual([
          { id: null }, // null when no resolved lines
          { salesFileId: null }, // null when no salesFileIds
        ]);
      });
    });
  });

  describe('updateParams', () => {
    describe('when passed a catType property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { catType: randomString() };
        // Act
        const params = salesHelpers.updateParams(inputParams);
        // Assert
        expect(params.catType).toEqual(inputParams.catType);
      });
    });

    describe('when passed a distributionChannel property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { distributionChannel: randomString() };
        // Act
        const params = salesHelpers.updateParams(inputParams);
        // Assert
        expect(params.distributionChannel).toEqual(inputParams.distributionChannel);
      });
    });

    describe('when passed a configuration property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { configuration: randomString() };
        // Act
        const params = salesHelpers.updateParams(inputParams);
        // Assert
        expect(params.configuration).toEqual(inputParams.configuration);
      });
    });

    describe('when passed a priceCategory property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { priceCategory: randomString() };
        // Act
        const params = salesHelpers.updateParams(inputParams);
        // Assert
        expect(params.priceCategory).toEqual(inputParams.priceCategory);
      });
    });

    describe('when passed a source property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { source: randomString() };
        // Act
        const params = salesHelpers.updateParams(inputParams);
        // Assert
        expect(params.source).toEqual(inputParams.source);
      });
    });

    describe('when passed a subSource property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { subSource: randomString() };
        // Act
        const params = salesHelpers.updateParams(inputParams);
        // Assert
        expect(params.subSource).toEqual(inputParams.subSource);
      });
    });

    describe('when passed a originalTrackTitle property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { originalTrackTitle: randomString() };
        // Act
        const params = salesHelpers.updateParams(inputParams);
        // Assert
        expect(params.originalTrackTitle).toEqual(inputParams.originalTrackTitle);
      });
    });

    describe('when passed a originalTrackArtist property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { originalTrackArtist: randomString() };
        // Act
        const params = salesHelpers.updateParams(inputParams);
        // Assert
        expect(params.originalTrackArtist).toEqual(inputParams.originalTrackArtist);
      });
    });

    describe('when passed a originalReleaseArtist property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { originalReleaseArtist: randomString() };
        // Act
        const params = salesHelpers.updateParams(inputParams);
        // Assert
        expect(params.originalReleaseArtist).toEqual(inputParams.originalReleaseArtist);
      });
    });

    describe('when passed a originalReleaseTitle property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { originalReleaseTitle: randomString() };
        // Act
        const params = salesHelpers.updateParams(inputParams);
        // Assert
        expect(params.originalReleaseTitle).toEqual(inputParams.originalReleaseTitle);
      });
    });

    describe('when passed a barcode property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { barcode: randomString() };
        // Act
        const params = salesHelpers.updateParams(inputParams);
        // Assert
        expect(params.barcode).toEqual(inputParams.barcode);
      });
    });

    describe('when passed a catNo property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { catNo: randomString() };
        // Act
        const params = salesHelpers.updateParams(inputParams);
        // Assert
        expect(params.catNo).toEqual(inputParams.catNo);
      });
    });

    describe('when passed a isrc property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { isrc: randomString() };
        // Act
        const params = salesHelpers.updateParams(inputParams);
        // Assert
        expect(params.isrc).toEqual(inputParams.isrc);
      });
    });

    describe('when passed a identifier property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { identifier: randomString() };
        // Act
        const params = salesHelpers.updateParams(inputParams);
        // Assert
        expect(params.identifier).toEqual(inputParams.identifier);
      });
    });

    describe('when passed a territory property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { territory: randomString() };
        // Act
        const params = salesHelpers.updateParams(inputParams);
        // Assert
        expect(params.territory).toEqual(inputParams.territory);
      });
    });

    describe('when passed a currency property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { currency: randomString() };
        // Act
        const params = salesHelpers.updateParams(inputParams);
        // Assert
        expect(params.originalCurrency).toEqual(inputParams.currency);
      });
    });

    describe('when passed an exchangeRate property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { exchangeRate: randomFloat().toString() };
        // Act
        const params = salesHelpers.updateParams(inputParams);
        // Assert
        expect(params.exchangeRate).toEqual(parseFloat(inputParams.exchangeRate));
      });
    });

    describe('when passed a saleDate property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { saleDate: randomJsDate() };
        // Act
        const params = salesHelpers.updateParams(inputParams);
        // Assert
        expect(params.saleDate).toEqual(moment(inputParams.saleDate).format('YYYY-MM-DD'));
      });
    });

    describe('when passed a transactionDate property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { transactionDate: randomJsDate() };
        // Act
        const params = salesHelpers.updateParams(inputParams);
        // Assert
        expect(params.transactionDate).toEqual(moment(inputParams.transactionDate).format('YYYY-MM-DD'));
      });
    });

    describe('when passed a releaseId property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { releaseId: randomString() };
        // Act
        const params = salesHelpers.updateParams(inputParams);
        // Assert
        expect(params.releaseId).toEqual(inputParams.releaseId);
      });
    });

    describe('when passed a trackId property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { trackId: randomString() };
        // Act
        const params = salesHelpers.updateParams(inputParams);
        // Assert
        expect(params.trackId).toEqual(inputParams.trackId);
      });
    });

    describe('when passed a workId property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { workId: randomString() };
        // Act
        const params = salesHelpers.updateParams(inputParams);
        // Assert
        expect(params.workId).toEqual(inputParams.workId);
      });
    });

    describe('when passed a contractId property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { contractId: randomString() };
        // Act
        const params = salesHelpers.updateParams(inputParams);
        // Assert
        expect(params.contractId).toEqual(inputParams.contractId);
      });
    });

    describe('when passed a status property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { status: randomString() };
        // Act
        const params = salesHelpers.updateParams(inputParams);
        // Assert
        expect(params.status).toEqual(inputParams.status);
      });
    });
  });

  describe('updateSaleObjectWithParams', () => {
    describe('when passed a catType property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { catType: randomString() };
        // Act
        const params = salesHelpers.updateSaleObjectWithParams({}, inputParams);
        // Assert
        expect(params.catType).toEqual(inputParams.catType);
      });
    });

    describe('when passed a distributionChannel property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { distributionChannel: stringWithQuotes };
        // Act
        const params = salesHelpers.updateSaleObjectWithParams({}, inputParams);
        // Assert
        expect(params.distributionChannel).toEqual(salesHelpers.escapeCharacters(inputParams.distributionChannel));
      });
    });

    describe('when passed a configuration property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { configuration: stringWithQuotes };
        // Act
        const params = salesHelpers.updateSaleObjectWithParams({}, inputParams);
        // Assert
        expect(params.configuration).toEqual(salesHelpers.escapeCharacters(inputParams.configuration));
      });
    });

    describe('when passed a priceCategory property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { priceCategory: stringWithQuotes };
        // Act
        const params = salesHelpers.updateSaleObjectWithParams({}, inputParams);
        // Assert
        expect(params.priceCategory).toEqual(salesHelpers.escapeCharacters(inputParams.priceCategory));
      });
    });

    describe('when passed a source property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { source: stringWithQuotes };
        // Act
        const params = salesHelpers.updateSaleObjectWithParams({}, inputParams);
        // Assert
        expect(params.source).toEqual(salesHelpers.escapeCharacters(inputParams.source));
      });
    });

    describe('when passed a subSource property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { subSource: stringWithQuotes };
        // Act
        const params = salesHelpers.updateSaleObjectWithParams({}, inputParams);
        // Assert
        expect(params.subSource).toEqual(salesHelpers.escapeCharacters(inputParams.subSource));
      });
    });

    describe('when passed a originalTrackTitle property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { originalTrackTitle: stringWithQuotes };
        // Act
        const params = salesHelpers.updateSaleObjectWithParams({}, inputParams);
        // Assert
        expect(params.originalTrackTitle).toEqual(salesHelpers.escapeCharacters(inputParams.originalTrackTitle));
      });
    });

    describe('when passed a originalTrackArtist property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { originalTrackArtist: stringWithQuotes };
        // Act
        const params = salesHelpers.updateSaleObjectWithParams({}, inputParams);
        // Assert
        expect(params.originalTrackArtist).toEqual(salesHelpers.escapeCharacters(inputParams.originalTrackArtist));
      });
    });

    describe('when passed a originalReleaseArtist property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { originalReleaseArtist: stringWithQuotes };
        // Act
        const params = salesHelpers.updateSaleObjectWithParams({}, inputParams);
        // Assert
        expect(params.originalReleaseArtist).toEqual(salesHelpers.escapeCharacters(inputParams.originalReleaseArtist));
      });
    });

    describe('when passed a originalReleaseTitle property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { originalReleaseTitle: stringWithQuotes };
        // Act
        const params = salesHelpers.updateSaleObjectWithParams({}, inputParams);
        // Assert
        expect(params.originalReleaseTitle).toEqual(salesHelpers.escapeCharacters(inputParams.originalReleaseTitle));
      });
    });

    describe('when passed a barcode property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { barcode: stringWithQuotes };
        // Act
        const params = salesHelpers.updateSaleObjectWithParams({}, inputParams);
        // Assert
        expect(params.barcode).toEqual(salesHelpers.escapeCharacters(inputParams.barcode));
      });
    });

    describe('when passed a catNo property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { catNo: stringWithQuotes };
        // Act
        const params = salesHelpers.updateSaleObjectWithParams({}, inputParams);
        // Assert
        expect(params.catNo).toEqual(salesHelpers.escapeCharacters(inputParams.catNo));
      });
    });

    describe('when passed a isrc property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { isrc: stringWithQuotes };
        // Act
        const params = salesHelpers.updateSaleObjectWithParams({}, inputParams);
        // Assert
        expect(params.isrc).toEqual(salesHelpers.escapeCharacters(inputParams.isrc));
      });
    });

    describe('when passed a identifier property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { identifier: stringWithQuotes };
        // Act
        const params = salesHelpers.updateSaleObjectWithParams({}, inputParams);
        // Assert
        expect(params.identifier).toEqual(salesHelpers.escapeCharacters(inputParams.identifier));
      });
    });

    describe('when passed a territory property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const stringWithQuotes = `"${randomString()}"`;
        const inputParams = { territory: stringWithQuotes };
        // Act
        const params = salesHelpers.updateSaleObjectWithParams({}, inputParams);
        // Assert
        expect(params.territory).toEqual(salesHelpers.escapeCharacters(inputParams.territory));
      });
    });

    describe('when passed an exchangeRate property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const stringWithQuotes = `"${randomFloat().toString()}"`;
        const inputParams = { exchangeRate: stringWithQuotes };
        // Act
        const params = salesHelpers.updateSaleObjectWithParams({}, inputParams);
        // Assert
        expect(params.exchangeRate).toEqual(salesHelpers.escapeCharacters(inputParams.exchangeRate));
      });
    });

    describe('when passed a saleDate property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { saleDate: randomJsDate() };
        // Act
        const params = salesHelpers.updateSaleObjectWithParams({}, inputParams);
        // Assert
        expect(params.saleDate).toEqual(moment(inputParams.saleDate).format('YYYY-MM-DD'));
      });
    });

    describe('when passed a transactionDate property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { transactionDate: randomJsDate() };
        // Act
        const params = salesHelpers.updateSaleObjectWithParams({}, inputParams);
        // Assert
        expect(params.transactionDate).toEqual(moment(inputParams.transactionDate).format('YYYY-MM-DD'));
      });
    });

    describe('when passed a releaseId property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { releaseId: randomString() };
        // Act
        const params = salesHelpers.updateSaleObjectWithParams({}, inputParams);
        // Assert
        expect(params.releaseId).toEqual(inputParams.releaseId);
      });
    });

    describe('when passed a trackId property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { trackId: randomString() };
        // Act
        const params = salesHelpers.updateSaleObjectWithParams({}, inputParams);
        // Assert
        expect(params.trackId).toEqual(inputParams.trackId);
      });
    });

    describe('when passed a workId property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { workId: randomString() };
        // Act
        const params = salesHelpers.updateSaleObjectWithParams({}, inputParams);
        // Assert
        expect(params.workId).toEqual(inputParams.workId);
      });
    });

    describe('when passed a contractId property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { contractId: randomString() };
        // Act
        const params = salesHelpers.updateSaleObjectWithParams({}, inputParams);
        // Assert
        expect(params.contractId).toEqual(inputParams.contractId);
      });
    });

    describe('when passed a status property', () => {
      it('should add this to the output params', () => {
        // Arrange
        const inputParams = { status: randomString() };
        // Act
        const params = salesHelpers.updateSaleObjectWithParams({}, inputParams);
        // Assert
        expect(params.status).toEqual(inputParams.status);
      });
    });
  });

  describe('getBigQueryFilter', () => {
    let clientName; let clientId;

    let filter;
    let mockConvertAllIdsToParamsResult;
    let mockMoveIdsToTempTablesResult;
    let bigQuery;
    let mockFilterFromObjectResult; let mockFilterFromObject;

    beforeEach(() => {
      clientName = randomString();
      clientId = randomId();

      filter = {
        id: {
          $in: randomArray(100),
        },
      };
      mockConvertAllIdsToParamsResult = { filterStr: randomString(),
        filterParams: {
          ids0: randomArray(),
        } };
      jest.spyOn(salesHelpers, 'convertAllIdsToParams').mockReturnValue(mockConvertAllIdsToParamsResult);
      mockMoveIdsToTempTablesResult = randomString();
      jest.spyOn(salesHelpers, 'moveIdsToTempTables').mockResolvedValue(mockMoveIdsToTempTablesResult);
      mockFilterFromObjectResult = randomString();
      mockFilterFromObject = jest.fn().mockReturnValue(mockFilterFromObjectResult);

      bigQuery = {
        filterFromObject: mockFilterFromObject,
        datasetName: randomString(),
      };
      BigQuery.mockReturnValue(bigQuery);
    });

    it('should call bigQuery.filterFromObject with the correct parameters', async () => {
      // Act
      await salesHelpers.getBigQueryFilter({ filter, bigQuery, clientName, clientId });
      // Assert
      expect(bigQuery.filterFromObject).toHaveBeenCalledWith(filter);
    });
    it('should call salesHelpers.convertAllIdsToParams with the correct parameters', async () => {
      // Act
      await salesHelpers.getBigQueryFilter({ filter, bigQuery, clientName, clientId });
      // Assert
      expect(salesHelpers.convertAllIdsToParams).toHaveBeenCalledWith(mockFilterFromObjectResult);
    });

    describe('when filter includes a total of ids > 100,000', () => {
      beforeEach(() => {
        mockConvertAllIdsToParamsResult = {
          filterStr: randomString(),
          filterParams: randomArray(),
          idsTotal: 100_001,
        };
        salesHelpers.convertAllIdsToParams.mockReturnValue(mockConvertAllIdsToParamsResult);
      });
      it('should call salesHelpers.moveIdsToTempTables with the correct parameters', async () => {
        // Act
        await salesHelpers.getBigQueryFilter({ filter, bigQuery, clientName, clientId });
        // Assert
        expect(salesHelpers.moveIdsToTempTables).toHaveBeenCalledWith({
          filterStr: mockConvertAllIdsToParamsResult.filterStr,
          filterParams: mockConvertAllIdsToParamsResult.filterParams,
          bigQuery,
          clientName,
          clientId,
        });
      });
      it('should return the output of salesHelpers.moveIdsToTempTables', async () => {
        // Act
        const result = await salesHelpers.getBigQueryFilter({ filter, bigQuery, clientName, clientId });
        // Assert
        expect(result).toEqual({ filter: mockMoveIdsToTempTablesResult });
      });
    });
    describe('when filter includes a total of ids <= 25,000', () => {
      beforeEach(() => {
        mockConvertAllIdsToParamsResult = {
          filterStr: randomString(),
          filterParams: randomArray(),
          idsTotal: 25_000,
        };
        salesHelpers.convertAllIdsToParams.mockReturnValue(mockConvertAllIdsToParamsResult);
      });
      it('should NOT call salesHelpers.moveIdsToTempTables', async () => {
        // Act
        await salesHelpers.getBigQueryFilter({ filter, bigQuery, clientName, clientId });
        // Assert
        expect(salesHelpers.moveIdsToTempTables).not.toHaveBeenCalled();
      });
      it('should return the output of salesHelpers.convertAllIdsToParams', async () => {
      // Act
        const result = await salesHelpers.getBigQueryFilter({ filter, bigQuery, clientName, clientId });
        // Assert
        expect(result).toEqual({ filter: mockConvertAllIdsToParamsResult.filterStr, filterParams: mockConvertAllIdsToParamsResult.filterParams });
      });
    });
  });

  describe('convertAllIdsToParams', () => {
    it('should convert a filter string with a list of ids to a filter string with filterParams object and total ids', () => {
      // Arrange
      const ids = randomArray();
      const inputFilter = `id IN (${ids.join(', ')})`;
      const expectedFilterStr = 'id IN UNNEST(@ids0)';
      const expectedFilterParams = {
        ids0: ids,
      };
      const expectedIdsTotal = ids.length;
      // Act
      const result = salesHelpers.convertAllIdsToParams(inputFilter);
      // Assert
      expect(result).toEqual({ filterStr: expectedFilterStr, filterParams: expectedFilterParams, idsTotal: expectedIdsTotal });
    });
    it('should convert a filter string with a list of ids within a OR array to a filter string with filterParams object and total ids', () => {
      // Arrange
      const ids = randomArray();
      const salesFileIds = randomArray();
      const inputFilter = `id IN (${ids.join(', ')}) OR salesFileId IN (${salesFileIds.join(', ')})`;
      const expectedFilterStr = `id IN UNNEST(@ids0) OR salesFileId IN (${salesFileIds.join(', ')})`;
      const expectedFilterParams = {
        ids0: ids,
      };
      const expectedIdsTotal = ids.length;
      // Act
      const result = salesHelpers.convertAllIdsToParams(inputFilter);
      // Assert
      expect(result).toEqual({ filterStr: expectedFilterStr, filterParams: expectedFilterParams, idsTotal: expectedIdsTotal });
    });
    it('should convert a filter string with a list of ids within a AND array to a filter string with filterParams object and total ids', () => {
      // Arrange
      const ids = randomArray();
      const salesFileIds = randomArray();
      const inputFilter = `id IN (${ids.join(', ')}) AND salesFileId IN (${salesFileIds.join(', ')})`;
      const expectedFilterStr = `id IN UNNEST(@ids0) AND salesFileId IN (${salesFileIds.join(', ')})`;
      const expectedFilterParams = {
        ids0: ids,
      };
      const expectedIdsTotal = ids.length;
      // Act
      const result = salesHelpers.convertAllIdsToParams(inputFilter);
      // Assert
      expect(result).toEqual({ filterStr: expectedFilterStr, filterParams: expectedFilterParams, idsTotal: expectedIdsTotal });
    });
    it('should convert a filter string with multiple lists of ids to a filter string with filterParams object and total combined ids', () => {
      // Arrange
      const ids = randomArray();
      const idsWithinOr = randomArray();
      const salesFileIds = randomArray();
      const inputFilter = `id IN (${ids.join(', ')}) AND (id IN (${idsWithinOr.join(', ')}) OR salesFileId IN (${salesFileIds.join(', ')}))`;
      const expectedFilterStr = `id IN UNNEST(@ids0) AND (id IN UNNEST(@ids1) OR salesFileId IN (${salesFileIds.join(', ')}))`;
      const expectedFilterParams = {
        ids0: ids,
        ids1: idsWithinOr,
      };
      const expectedIdsTotal = ids.length + idsWithinOr.length;
      // Act
      const result = salesHelpers.convertAllIdsToParams(inputFilter);
      // Assert
      expect(result).toEqual({ filterStr: expectedFilterStr, filterParams: expectedFilterParams, idsTotal: expectedIdsTotal });
    });
    it('should convert a filter string with multiple lists of ids to a filter string with filterParams object and total combined ids for `NOT IN` filters as well', () => {
      // Arrange
      const ids = randomArray();
      const idsWithinOr = randomArray();
      const salesFileIds = randomArray();
      const inputFilter = `id IN (${ids.join(', ')}) OR (id NOT IN (${idsWithinOr.join(', ')}) AND salesFileId IN (${salesFileIds.join(', ')}))`;
      const expectedFilterStr = `id IN UNNEST(@ids0) OR (id NOT IN UNNEST(@ids1) AND salesFileId IN (${salesFileIds.join(', ')}))`;
      const expectedFilterParams = {
        ids0: ids,
        ids1: idsWithinOr,
      };
      const expectedIdsTotal = ids.length + idsWithinOr.length;
      // Act
      const result = salesHelpers.convertAllIdsToParams(inputFilter);
      // Assert
      expect(result).toEqual({ filterStr: expectedFilterStr, filterParams: expectedFilterParams, idsTotal: expectedIdsTotal });
    });
  });

  describe('moveIdsToTempTables', () => {
    let tempTable; let clientName; let clientId; let filterStr; let filterParams;
    let expirationTime; let mockHashArrayOfStringsResult1; let mockHashArrayOfStringsResult2;
    let alphaNumericName; let tableName1; let tableName2;
    let bigQuery; let mockCreateTempTable; let mockSetupFile; let mockWriteToFile; let mockWriteFileToDb;
    let mockClient; let mockClientTableExists;

    beforeEach(() => {
      tempTable = {
        id: randomString(),
      };
      clientName = randomString();
      clientId = randomId();
      filterStr = 'id IN UNNEST(@ids0)';
      filterParams = {
        ids0: randomArray(),
      };
      expirationTime = Date.now() + 30 * 60 * 1000; // 30 minute expiry
      mockHashArrayOfStringsResult1 = randomString();
      mockHashArrayOfStringsResult2 = randomString();
      jest.spyOn(helpers, 'hashArrayOfStrings').mockReturnValueOnce(mockHashArrayOfStringsResult1).mockReturnValue(mockHashArrayOfStringsResult2);
      alphaNumericName = (clientName + process.env.environmentName).replace(/[^0-9a-z]/gi, '');
      tableName1 = `${alphaNumericName}TempSalesLinesApi_${mockHashArrayOfStringsResult1}`;
      tableName2 = `${alphaNumericName}TempSalesLinesApi_${mockHashArrayOfStringsResult2}`;

      mockCreateTempTable = jest.fn().mockResolvedValue(tempTable);
      mockSetupFile = jest.fn().mockImplementation((...args) => args[args.length - 1](null));
      mockWriteToFile = jest.fn().mockImplementation((...args) => args[args.length - 1](null));
      mockWriteFileToDb = jest.fn().mockImplementation((...args) => args[args.length - 1](null));
      mockClientTableExists = jest.fn().mockResolvedValue([false]);
      mockClient = {
        dataset: jest.fn().mockReturnValue({
          table: jest.fn().mockReturnValue({
            exists: mockClientTableExists,
            get: jest.fn().mockResolvedValue([{
              setMetadata: jest.fn().mockResolvedValue(),
              metadata: {
                expirationTime,
              },
            }]),
          }),
        }),
      };

      bigQuery = {
        createTempTable: mockCreateTempTable,
        setupFile: mockSetupFile,
        writeToFile: mockWriteToFile,
        writeFileToDb: mockWriteFileToDb,
        datasetName: randomString(),
        client: mockClient,
      };
      BigQuery.mockReturnValue(bigQuery);
    });
    it('should call bigQuery.client.dataset().table().exists to check if temp table already exists', async () => {
      // Act
      await salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId });
      // Assert
      expect(bigQuery.client.dataset().table().exists).toHaveBeenCalled();
    });
    describe('when filterStr includes a second ids array', () => {
      beforeEach(() => {
        filterStr = 'id IN UNNEST(@ids0) OR id IN UNNEST(@ids1)';
        filterParams = {
          ids0: randomArray(),
          ids1: randomArray(),
        };
      });
      it('should call bigQuery.client.dataset().table().exists twice to check if temp tables already exist', async () => {
        // Act
        await salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId });
        // Assert
        expect(bigQuery.client.dataset().table().exists).toHaveBeenCalledTimes(2);
      });
    });
    describe('when temp table(s) already exist(s)', () => {
      let existingTableExpirationTime; let mockTableGetResult;
      beforeEach(() => {
        mockClientTableExists.mockResolvedValue([true]);
      });
      it('should check the temp table metadata for expiration time', async () => {
        // Act
        await salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId });
        // Assert
        expect(bigQuery.client.dataset().table().get).toHaveBeenCalled();
      });
      it('should call setMetadata when expiry is more than 10 minutes earlier than desired expiration time', async () => {
        // Arrange
        existingTableExpirationTime = expirationTime - 11 * 60 * 1000; // expiry 11 minutes earlier than desired expiration time
        mockTableGetResult = {
          setMetadata: jest.fn().mockResolvedValue(),
          metadata: {
            expirationTime: existingTableExpirationTime.toString(),
          },
        };
        mockClient.dataset().table().get.mockResolvedValue([mockTableGetResult]);
        // Act
        await salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId });
        // Assert
        expect(mockTableGetResult.setMetadata).toHaveBeenCalledWith({ expirationTime });
      });
      it('should NOT call setMetadata when expiry is less than 10 minutes earlier than desired expiration time', async () => {
        // Arrange
        existingTableExpirationTime = expirationTime - 9 * 60 * 1000; // expiry 9 minutes earlier than desired expiration time
        mockTableGetResult = {
          setMetadata: jest.fn().mockResolvedValue(),
          metadata: {
            expirationTime: existingTableExpirationTime.toString(),
          },
        };
        mockClient.dataset().table().get.mockResolvedValue([mockTableGetResult]);
        // Act
        await salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId });
        // Assert
        expect(mockTableGetResult.setMetadata).not.toHaveBeenCalled();
      });
      it('should return the filter, replacing ids list with temp table reference', async () => {
        // Act
        const filterOut = await salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId });
        // Assert
        expect(filterOut).toEqual(`id IN ( SELECT id FROM \`${bigQuery.datasetName}.${tableName1}\` )`);
      });
      it('should return the filter, replacing ids list with temp table reference for `NOT IN` filters as well', async () => {
        // Arrange
        filterStr = 'id NOT IN UNNEST(@ids0)';
        // Act
        const filterOut = await salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId });
        // Assert
        expect(filterOut).toEqual(`id NOT IN ( SELECT id FROM \`${bigQuery.datasetName}.${tableName1}\` )`);
      });
      describe('when filterStr includes a second ids array', () => {
        beforeEach(() => {
          filterStr = 'id IN UNNEST(@ids0) OR id IN UNNEST(@ids1)';
          filterParams = {
            ids0: randomArray(),
            ids1: randomArray(),
          };
        });
        it('should check the temp table metadata for expiration time twice', async () => {
        // Act
          await salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId });
          // Assert
          expect(bigQuery.client.dataset().table().get).toHaveBeenCalledTimes(2);
        });
        it('should call setMetadata twice when expiry is more than 10 minutes earlier than desired expiration time', async () => {
        // Arrange
          existingTableExpirationTime = expirationTime - 11 * 60 * 1000; // expiry 11 minutes earlier than desired expiration time
          mockTableGetResult = {
            setMetadata: jest.fn().mockResolvedValue(),
            metadata: {
              expirationTime: existingTableExpirationTime.toString(),
            },
          };
          mockClient.dataset().table().get.mockResolvedValue([mockTableGetResult]);
          // Act
          await salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId });
          // Assert
          expect(mockTableGetResult.setMetadata).toHaveBeenCalledTimes(2);
          expect(mockTableGetResult.setMetadata).toHaveBeenCalledWith({ expirationTime });
        });
        it('should NOT call setMetadata when expiry is less than 10 minutes earlier than desired expiration time', async () => {
        // Arrange
          existingTableExpirationTime = expirationTime - 9 * 60 * 1000; // expiry 9 minutes earlier than desired expiration time
          mockTableGetResult = {
            setMetadata: jest.fn().mockResolvedValue(),
            metadata: {
              expirationTime: existingTableExpirationTime.toString(),
            },
          };
          mockClient.dataset().table().get.mockResolvedValue([mockTableGetResult]);
          // Act
          await salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId });
          // Assert
          expect(mockTableGetResult.setMetadata).not.toHaveBeenCalled();
        });
        it('should return the filter, replacing both ids lists with temp table references', async () => {
        // Act
          const filterOut = await salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId });
          // Assert
          expect(filterOut).toEqual(`id IN ( SELECT id FROM \`${bigQuery.datasetName}.${tableName1}\` ) OR id IN ( SELECT id FROM \`${bigQuery.datasetName}.${tableName2}\` )`);
        });
        it('should return the filter, replacing both ids lists with temp table references for `NOT IN` filters as well', async () => {
          // Arrange
          filterStr = 'id IN UNNEST(@ids0) OR id NOT IN UNNEST(@ids1)';
          // Act
          const filterOut = await salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId });
          // Assert
          expect(filterOut).toEqual(`id IN ( SELECT id FROM \`${bigQuery.datasetName}.${tableName1}\` ) OR id NOT IN ( SELECT id FROM \`${bigQuery.datasetName}.${tableName2}\` )`);
        });
      });
    });
    describe('when temp table(s) do(es) not exist', () => {
      beforeEach(() => {
        mockClientTableExists.mockResolvedValue([false]);
      });
      it('should call bigQuery.createTempTable with the correct parameters', async () => {
        // Arrange
        const schema = [
          {
            name: 'id',
            type: 'STRING',
            mode: 'REQUIRED',
          },
        ];
        // Act
        await salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId });
        // Assert
        expect(bigQuery.createTempTable).toHaveBeenCalledWith({ tableName: tableName1, schema, partitionColumn: null, expirationTime, randomizeName: false });
      });
      describe('when bigQuery.createTempTable throws an error', () => {
        it('should throw the error', async () => {
          // Arrange
          const error = randomError();
          mockCreateTempTable.mockRejectedValue(error);
          // Act / Assert
          await expect(salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId })).rejects.toThrow(error);
        });
      });
      describe('when bigQuery.createTempTable returns a template', () => {
        it('should call bigQuery.setupFile with the correct parameters', async () => {
          // Act
          await salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId });
          // Assert
          expect(bigQuery.setupFile).toHaveBeenCalledWith(expect.any(Function));
        });
        describe('when bigQuery.setupFile returns an error', () => {
          it('should throw the error', async () => {
            // Arrange
            const error = randomError();
            mockSetupFile.mockImplementation((...args) => args[args.length - 1](error));
            // Act / Assert
            await expect(salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId })).rejects.toThrow(error);
          });
        });
        describe('when bigQuery.setupFile returns a success', () => {
          it('should call bigQuery.writeToFile with the correct parameters', async () => {
            // Arrange
            const data = filterParams.ids0.map((id) => ({ id }));
            // Act
            await salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId });
            // Assert
            expect(bigQuery.writeToFile).toHaveBeenCalledWith(data, expect.any(Function));
          });
          describe('when bigQuery.writeToFile returns an error', () => {
            it('should throw the error', async () => {
              // Arrange
              const error = randomError();
              mockWriteToFile.mockImplementation((...args) => args[args.length - 1](error));
              // Act / Assert
              await expect(salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId })).rejects.toThrow(error);
            });
          });
          describe('when bigQuery.writeToFile returns a success', () => {
            it('should call bigQuery.writeFileToDb with the correct parameters', async () => {
              // Act
              await salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId });
              // Assert
              expect(bigQuery.writeFileToDb).toHaveBeenCalledWith(tempTable.id, expect.any(Function));
            });
            describe('when bigQuery.writeFileToDb returns an error', () => {
              it('should throw the error', async () => {
                // Arrange
                const error = randomError();
                mockWriteFileToDb.mockImplementation((...args) => args[args.length - 1](error));
                // Act / Assert
                await expect(salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId })).rejects.toThrow(error);
              });
            });
          });
        });
      });
      it('should return the filter, replacing ids list with temp table reference', async () => {
        // Act
        const filterOut = await salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId });
        // Assert
        expect(filterOut).toEqual(`id IN ( SELECT id FROM \`${bigQuery.datasetName}.${tableName1}\` )`);
      });
      it('should return the filter, replacing ids list with temp table reference for `NOT IN` filters as well', async () => {
        // Arrange
        filterStr = 'id NOT IN UNNEST(@ids0)';
        // Act
        const filterOut = await salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId });
        // Assert
        expect(filterOut).toEqual(`id NOT IN ( SELECT id FROM \`${bigQuery.datasetName}.${tableName1}\` )`);
      });

      describe('when filterStr includes a second ids array', () => {
        beforeEach(() => {
          filterStr = 'id IN UNNEST(@ids0) OR id IN UNNEST(@ids1)';
          filterParams = {
            ids0: randomArray(),
            ids1: randomArray(),
          };
        });
        it('should call bigQuery.createTempTable twice with the correct parameters', async () => {
          // Arrange
          const schema = [
            {
              name: 'id',
              type: 'STRING',
              mode: 'REQUIRED',
            },
          ];
          // Act
          await salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId });
          // Assert
          expect(bigQuery.createTempTable).toHaveBeenNthCalledWith(1, { tableName: tableName1, schema, partitionColumn: null, expirationTime, randomizeName: false });
          expect(bigQuery.createTempTable).toHaveBeenNthCalledWith(2, { tableName: tableName2, schema, partitionColumn: null, expirationTime, randomizeName: false });
        });
        it('should call bigQuery.writeToFile twice with the correct parameters', async () => {
          // Arrange
          const data0 = filterParams.ids0.map((id) => ({ id }));
          const data1 = filterParams.ids1.map((id) => ({ id }));
          // Act
          await salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId });
          // Assert
          expect(bigQuery.writeToFile).toHaveBeenNthCalledWith(1, data0, expect.any(Function));
          expect(bigQuery.writeToFile).toHaveBeenNthCalledWith(2, data1, expect.any(Function));
        });
        it('should return the filter, replacing both ids lists with temp table references', async () => {
          // Act
          const filterOut = await salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId });
          // Assert
          expect(filterOut).toEqual(`id IN ( SELECT id FROM \`${bigQuery.datasetName}.${tableName1}\` ) OR id IN ( SELECT id FROM \`${bigQuery.datasetName}.${tableName2}\` )`);
        });
        it('should return the filter, replacing both ids lists with temp table references for `NOT IN` filters as well', async () => {
          // Arrange
          filterStr = 'id IN UNNEST(@ids0) AND id NOT IN UNNEST(@ids1)';
          // Act
          const filterOut = await salesHelpers.moveIdsToTempTables({ filterStr, filterParams, bigQuery, clientName, clientId });
          // Assert
          expect(filterOut).toEqual(`id IN ( SELECT id FROM \`${bigQuery.datasetName}.${tableName1}\` ) AND id NOT IN ( SELECT id FROM \`${bigQuery.datasetName}.${tableName2}\` )`);
        });
      });
    });
  });

  describe('getSales', () => {
    const mockGetDataQueryResult = randomArray();
    const mockQueryJobPromiseResult = randomArray();
    const select = randomArray();
    const bqFilter = randomArray();
    const filterParams = {
      param1: randomString(),
    };
    const options = randomArray();

    let bigQuery; let mockGetDataQuery; let mockQueryJobPromise;

    beforeEach(() => {
      mockGetDataQuery = jest.fn().mockReturnValue(mockGetDataQueryResult);
      mockQueryJobPromise = jest.fn().mockResolvedValue(mockQueryJobPromiseResult);
      bigQuery = {
        getDataQuery: mockGetDataQuery,
        queryJobPromise: mockQueryJobPromise,
        datasetName: randomString(),
      };
      BigQuery.mockReturnValue(bigQuery);
    });

    it('should call bigQuery.getDataQuery with the correct parameters', async () => {
      // Act
      await salesHelpers.getSales({ bigQuery, select, bqFilter, filterParams, options });
      // Assert
      expect(bigQuery.getDataQuery).toHaveBeenCalledWith(bigQuery.inputTable, select, bqFilter, options);
    });

    describe('when clientId is supplied', () => {
      it('should add the supplied clientId to the bigQuery.queryJobPromise call', async () => {
        // Arrange
        const clientId = randomString();
        // Act
        await salesHelpers.getSales({ bigQuery, select, bqFilter, filterParams, options, clientId });
        // Assert
        expect(bigQuery.queryJobPromise).toHaveBeenCalledWith({ query: { query: mockGetDataQueryResult, params: filterParams }, labels: { client_id: clientId, job_type: 'api_sales_query' } });
      });
    });
    describe('when clientId is NOT supplied', () => {
      it('should use an empty string as fallback when calling bigQuery.queryJobPromise', async () => {
        // Arrange
        const clientId = undefined;
        // Act
        await salesHelpers.getSales({ bigQuery, select, bqFilter, filterParams, options, clientId });
        // Assert
        expect(bigQuery.queryJobPromise).toHaveBeenCalledWith({ query: { query: mockGetDataQueryResult, params: filterParams }, labels: { client_id: '', job_type: 'api_sales_query' } });
      });
    });

    it('should return the output of bigQuery.queryJobPromise', async () => {
      // Act
      const result = await salesHelpers.getSales({ bigQuery, select, bqFilter, filterParams, options });
      // Assert
      expect(result).toEqual(mockQueryJobPromiseResult);
    });
  });

  describe('getCount', () => {
    const count = randomInt();
    const mockQueryJobPromiseResult = [{
      count,
    }];
    const bqFilter = randomArray();
    const filterParams = {
      param1: randomString(),
    };

    let bigQuery; let mockQueryJobPromise;
    let countQuery;

    beforeEach(() => {
      mockQueryJobPromise = jest.fn().mockResolvedValue(mockQueryJobPromiseResult);
      bigQuery = {
        queryJobPromise: mockQueryJobPromise,
        datasetName: randomString(),
      };
      BigQuery.mockReturnValue(bigQuery);
      countQuery = `SELECT SUM(1) AS count FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\` WHERE ${bqFilter}`;
    });

    it('should return the count from output of bigQuery.queryJobPromise', async () => {
      // Act
      const result = await salesHelpers.getCount({ bigQuery, bqFilter, filterParams });
      // Assert
      expect(result).toEqual(count);
    });

    describe('when clientId is supplied', () => {
      it('should add the supplied clientId to the bigQuery.queryJobPromise call', async () => {
        // Arrange
        const clientId = randomString();
        // Act
        await salesHelpers.getCount({ bigQuery, bqFilter, filterParams, clientId });
        // Assert
        expect(bigQuery.queryJobPromise).toHaveBeenCalledWith({ query: { query: countQuery, params: filterParams }, labels: { client_id: clientId, job_type: 'api_sales_query_count' } });
      });
    });
    describe('when clientId is NOT supplied', () => {
      it('should use an empty string as fallback when calling bigQuery.queryJobPromise', async () => {
        // Arrange
        const usingTempTable = false;
        const clientId = undefined;
        // Act
        await salesHelpers.getCount({ bigQuery, bqFilter, filterParams, clientId, usingTempTable });
        // Assert
        expect(bigQuery.queryJobPromise).toHaveBeenCalledWith({ query: { query: countQuery, params: filterParams }, labels: { client_id: '', job_type: 'api_sales_query_count' } });
      });
    });
  });

  describe('updateSalesGroupsFromSalesLineIds', () => {
    const BATCH_SIZE = 10_000;
    let clientId;
    let salesLines; let salesGroupIds; let mockSalesGroupSave; let returnedSalesGroup;
    beforeEach(() => {
      clientId = randomId();
      salesLines = randomArray(10).map(() => ({ id: randomId() }));
      salesGroupIds = randomArray(3).map(() => new ObjectId(randomId()));
      jest.spyOn(SalesGroupLines, 'updateMany').mockResolvedValue();
      jest.spyOn(SalesGroupLines, 'distinct').mockResolvedValue(salesGroupIds);
      jest.spyOn(SalesGroupLines, 'find').mockResolvedValue([]);
      mockSalesGroupSave = jest.fn();
      returnedSalesGroup = {
        save: mockSalesGroupSave,
      };
      jest.spyOn(SalesGroup, 'findById').mockResolvedValue(returnedSalesGroup);
    });
    it('should call SalesGroupLines.distinct with the correct parameters', async () => {
      // Arrange
      const salesLineIds = salesLines.map((line) => line.id);
      // Act
      await salesHelpers.updateSalesGroupsFromSalesLineIds({ salesLines, clientId });
      // Assert
      expect(SalesGroupLines.distinct).toHaveBeenCalledWith(
        'salesGroupId',
        {
          clientId,
          salesLineIds: { $in: salesLineIds },
        },
      );
    });
    describe('when SalesGroupLines.distinct returns some results', () => {
      it('should call SalesGroup.findById with the correct id for each item returned', async () => {
        // Act
        await salesHelpers.updateSalesGroupsFromSalesLineIds({ salesLines, clientId });
        // Assert
        expect(SalesGroup.findById).toHaveBeenCalledTimes(salesGroupIds.length);
        for (let i = 0; i < salesGroupIds.length; i += 1) {
          expect(SalesGroup.findById).toHaveBeenNthCalledWith(i + 1, salesGroupIds[i].toString());
        }
      });
      it('should save the returned Sales Group', async () => {
        // Act
        await salesHelpers.updateSalesGroupsFromSalesLineIds({ salesLines, clientId });
        // Assert
        expect(mockSalesGroupSave).toHaveBeenCalledTimes(salesGroupIds.length);
      });
    });
    it('should handle large arrays of sales lines in batches', async () => {
      // Arrange
      salesLines = randomArray(25_000).map(() => ({ id: randomId() }));
      const salesLineIds = [...salesLines.map((line) => line.id)];
      const expectedCalls = Math.ceil(salesLineIds.length / BATCH_SIZE);

      // Act
      await salesHelpers.updateSalesGroupsFromSalesLineIds({ salesLines, clientId });
      // Assert
      for (let i = 0; i < expectedCalls; i += 1) {
        const batch = salesLineIds.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        expect(SalesGroupLines.distinct).toHaveBeenNthCalledWith(
          i + 1,
          'salesGroupId',
          {
            clientId,
            salesLineIds: { $in: batch },
          },
        );
      }
      // Assert
      expect(SalesGroup.findById).toHaveBeenCalledTimes(salesGroupIds.length);
      for (let i = 0; i < salesGroupIds.length; i += 1) {
        expect(SalesGroup.findById).toHaveBeenNthCalledWith(i + 1, salesGroupIds[i].toString());
      }
    });
    it('should handle arrays of sales lines with length greater than 100,000 by loading all salesFileId filtered documents using a cursor', async () => {
      // Arrange
      const salesFileIds = randomArray(2).map(() => new ObjectId(randomId()));
      const salesLinesLarge = randomArray(100_001).map(() => ({ id: randomId() }));
      const salesLineIds = salesLinesLarge.map((line) => line.id);
      const mockDocs = [
        { id: randomId(), salesLineIds: salesLineIds.slice(0, 10_000), salesGroupId: [salesGroupIds[0]] },
        { id: randomId(), salesLineIds: salesLineIds.slice(10_000, 20_000), salesGroupId: [salesGroupIds[1]] },
        { id: randomId(), salesLineIds: salesLineIds.slice(40_000, 40_001), salesGroupId: [salesGroupIds[2]] },
      ];
      const mockCursor = {
        async* [Symbol.asyncIterator]() {
          for (const doc of mockDocs) {
            yield doc;
          }
        },
      };
      SalesGroupLines.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          cursor: jest.fn().mockReturnValue(mockCursor),
        }),
      });
      // Act
      await salesHelpers.updateSalesGroupsFromSalesLineIds({ salesLines: salesLinesLarge, salesFileIds, clientId });
      // Assert
      expect(SalesGroupLines.find).toHaveBeenCalledWith(
        { clientId, salesFileId: { $in: salesFileIds } },
        { salesLineIds: 1, salesGroupId: 1 },
      );
      expect(SalesGroup.findById).toHaveBeenCalledTimes(salesGroupIds.length);
      for (let i = 0; i < salesGroupIds.length; i += 1) {
        expect(SalesGroup.findById).toHaveBeenNthCalledWith(i + 1, salesGroupIds[i].toString());
      }
    });
  });

  describe('addGroupInfoToSales', () => {
    let mockSalesGroupLinesFindLean; let salesGroupLinesFindSpy;
    let mockSalesGroupFindLean; let salesGroupFindSpy;
    beforeEach(() => {
      mockSalesGroupLinesFindLean = jest.fn().mockResolvedValue([]);
      salesGroupLinesFindSpy = jest.spyOn(SalesGroupLines, 'find').mockReturnValue({
        lean: mockSalesGroupLinesFindLean,
      });
      mockSalesGroupFindLean = jest.fn().mockResolvedValue([]);
      salesGroupFindSpy = jest.spyOn(SalesGroup, 'find').mockReturnValue({
        lean: mockSalesGroupFindLean,
      });
    });
    it('should return sales unchanged when clientId is not supplied', async () => {
      // Arrange
      const clientId = undefined;
      const sales = randomArray();
      // Act
      const result = await salesHelpers.addGroupInfoToSales({ clientId, sales });
      // Assert
      expect(result).toEqual(sales);
    });
    it('should return sales unchanged when sales are not supplied', async () => {
      // Arrange
      const clientId = randomId();
      const sales = undefined;
      // Act
      const result = await salesHelpers.addGroupInfoToSales({ clientId, sales });
      // Assert
      expect(result).toEqual(sales);
    });
    it('should return sales unchanged when sales is empty array', async () => {
      // Arrange
      const clientId = randomId();
      const sales = [];
      // Act
      const result = await salesHelpers.addGroupInfoToSales({ clientId, sales });
      // Assert
      expect(result).toEqual(sales);
    });
    it('should call SalesGroupLines.find with the correct parameters', async () => {
      // Arrange
      const clientId = randomId();
      const sales = randomArray().map(() => ({ id: randomId() }));
      // Act
      await salesHelpers.addGroupInfoToSales({ clientId, sales });
      // Assert
      expect(salesGroupLinesFindSpy).toHaveBeenCalledWith(
        { clientId, salesLineIds: { $in: sales.map((sale) => sale.id) } },
        { salesLineIds: 1, salesGroupId: 1, type: 1 },
      );
    });
    it('should call SalesGroup.find with the correct parameters', async () => {
      // Arrange
      const clientId = randomId();
      const sales = randomArray().map(() => ({ id: randomId() }));
      const salesGroup1 = randomId();
      const salesGroup2 = randomId();
      const salesGroupLines = [
        { salesLineIds: randomArray(), salesGroupId: salesGroup1, type: randomString() },
        { salesLineIds: randomArray(), salesGroupId: salesGroup2, type: randomString() },
        { salesLineIds: randomArray(), salesGroupId: salesGroup1, type: randomString() },
      ];
      mockSalesGroupLinesFindLean.mockResolvedValue(salesGroupLines);
      const salesGroupIds = [...new Set(salesGroupLines.map((line) => (line.salesGroupId)))];
      // Act
      await salesHelpers.addGroupInfoToSales({ clientId, sales });
      // Assert
      expect(salesGroupFindSpy).toHaveBeenCalledWith(
        { _id: { $in: salesGroupIds } },
        { name: 1 },
      );
    });
    it('should return sales unchanged when none of the sales ids are contained in any sales groups', async () => {
      // Arrange
      const clientId = randomId();
      const sales = randomArray().map(() => ({ id: randomId() }));
      const salesGroup1 = randomId();
      const salesGroup2 = randomId();
      const salesGroupLines = [
        { salesLineIds: randomArray(), salesGroupId: salesGroup1, type: randomString() },
        { salesLineIds: randomArray(), salesGroupId: salesGroup2, type: randomString() },
        { salesLineIds: randomArray(), salesGroupId: salesGroup1, type: randomString() },
      ];
      mockSalesGroupLinesFindLean.mockResolvedValue(salesGroupLines);
      // Act
      const result = await salesHelpers.addGroupInfoToSales({ clientId, sales });
      // Assert
      expect(result).toEqual(sales);
    });
    it('should return sales with added group info when some of the sales ids are contained in sales groups', async () => {
      // Arrange
      const clientId = randomId();
      const sales = randomArray().map(() => ({ id: randomId() }));
      const salesGroup1 = randomId();
      const salesGroup2 = randomId();
      const salesGroupLines = [
        { salesLineIds: [...randomArray(), sales[0].id], salesGroupId: salesGroup1, type: randomString() },
        { salesLineIds: [...randomArray(), sales[1].id], salesGroupId: salesGroup2, type: randomString() },
        { salesLineIds: randomArray(), salesGroupId: salesGroup1, type: randomString() },
      ];
      mockSalesGroupLinesFindLean.mockResolvedValue(salesGroupLines);
      const salesGroups = [
        { _id: salesGroup1, name: randomString() },
        { _id: salesGroup2, name: randomString() },
      ];
      mockSalesGroupFindLean.mockResolvedValue(salesGroups);

      const expectedSales = [...sales];
      expectedSales[0] = {
        ...expectedSales[0],
        groupId: salesGroup1,
        groupName: salesGroups[0].name,
        groupType: salesGroupLines[0].type,
      };
      expectedSales[1] = {
        ...expectedSales[1],
        groupId: salesGroup2,
        groupName: salesGroups[1].name,
        groupType: salesGroupLines[1].type,
      };
      // Act
      const result = await salesHelpers.addGroupInfoToSales({ clientId, sales });
      // Assert
      expect(result).toEqual(expectedSales);
    });
  });
});
