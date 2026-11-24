const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const { createZip } = require('@curveroyaltysystems/platform-shared-utils');

const ComposerController = require('./composer');
const Composer = require('../../models/composer');
const Client = require('../../models/client');

jest.mock('../../models/composer');
jest.mock('../../models/work');
jest.mock('../../models/client');
jest.mock('@curveroyaltysystems/curve-shared-logic', () => ({
  WriteCsv: jest.fn(),
  LowerCaseString: jest.fn((s) => s.toLowerCase()),
  TerritoryHelper: { allTerritories: [] },
  Exports: {},
  Utils: {},
}));
jest.mock('@curveroyaltysystems/platform-shared-utils', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
  createZip: { localFiles: jest.fn() },
  configShared: { encryptedFields: { client: [] } },
  encryption: { encryptionPlugin: jest.fn() },
}));

describe('ComposerController', () => {
  let composer;

  beforeEach(() => {
    composer = {
      clientId: randomId(),
      name: randomString(),
      catalogueGroups: [],
      societies: [],
      publisherAgreements: [],
      linkedContracts: [],
      territories: ['GB'],
      _id: randomId(),
    };

    jest.clearAllMocks();

    Composer.findOne = jest.fn().mockResolvedValue(null);
    Client.find = jest.fn().mockResolvedValue([]);
  });

  describe('#replaceComposerIDWithinIpChain', () => {
    it('should replace old composer ids with new id and not update publisher', () => {
      const oldIds = ['oldComposerId1', 'oldComposerId2'];
      const primaryComposer = { _id: 'newComposerId1', cae: 'newCae1' };
      const chain = [
        {
          type: 'Publisher',
          children: [
            { type: 'Composer', composerId: 'oldComposerId1', cae: 'oldCae1', children: [] },
            {
              type: 'Publisher',
              children: [
                { type: 'Composer', composerId: 'oldComposerId2', cae: 'oldCae2', children: [] },
                { type: 'Publisher', publisherId: 'oldPublisherId1', cae: 'publisherCae', children: [] },
              ],
            },
          ],
        },
      ];

      const result = ComposerController.replaceComposerIDWithinIpChain(oldIds, primaryComposer, chain);

      expect(result[0].children[0].composerId).toBe('newComposerId1');
      expect(result[0].children[0].cae).toBe('newCae1');
      expect(result[0].children[1].children[0].composerId).toBe('newComposerId1');
      expect(result[0].children[1].children[0].cae).toBe('newCae1');
      expect(result[0].children[1].children[1].publisherId).toBe('oldPublisherId1');
      expect(result[0].children[1].children[1].cae).toBe('publisherCae');
    });

    it('should return the chain unchanged if no matching composerId', () => {
      const oldIds = ['nonMatchingComposerId'];
      const primaryComposer = { _id: 'newComposerId1', cae: 'newCae1' };
      const chain = [
        {
          type: 'Publisher',
          children: [
            { type: 'Composer', composerId: 'oldComposerId1', cae: 'oldCae1', children: [] },
          ],
        },
      ];

      const result = ComposerController.replaceComposerIDWithinIpChain(oldIds, primaryComposer, chain);

      expect(result[0].children[0].composerId).toBe('oldComposerId1');
      expect(result[0].children[0].cae).toBe('oldCae1');
    });

    it('should handle missing, undefined, or empty children', () => {
      const oldIds = ['oldComposerId1', 'oldComposerId2'];
      const primaryComposer = { _id: 'newComposerId1', cae: 'newCae1' };
      const chain = [
        {
          type: 'Publisher',
          children: [
            { type: 'Composer', composerId: 'oldComposerId1', cae: 'oldCae1', children: undefined },
            {
              type: 'Publisher',
              children: [
                { type: 'Composer', composerId: 'oldComposerId2', cae: 'oldCae2', children: [] },
                { type: 'Publisher', children: undefined },
              ],
            },
            { type: 'Publisher', children: [] },
          ],
        },
      ];

      const result = ComposerController.replaceComposerIDWithinIpChain(oldIds, primaryComposer, chain);

      expect(result[0].children[0].composerId).toBe('newComposerId1');
      expect(result[0].children[0].cae).toBe('newCae1');
      expect(result[0].children[1].children[0].composerId).toBe('newComposerId1');
      expect(result[0].children[1].children[0].cae).toBe('newCae1');
      expect(result[0].children[1].children[1].children).toBeUndefined();
      expect(result[0].children[2].children).toEqual([]);
    });
  });

  describe('#createExportCsv', () => {
    let mockWriter;
    let mockQuery;
    let filter;

    const callExport = (count, clientType) => new Promise((resolve, reject) => {
      ComposerController.createExportCsv(filter, count, composer.clientId, clientType, (err, result) => {
        if (err) reject(new Error(err));
        else resolve(result);
      });
    });

    beforeEach(() => {
      filter = { clientId: composer.clientId };

      mockWriter = {
        addData: jest.fn((_data, cb) => cb()),
        write: jest.fn((cb) => cb()),
      };
      WriteCsv.mockImplementation(() => mockWriter);

      mockQuery = {
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([composer]),
      };
      Composer.find = jest.fn().mockReturnValue(mockQuery);

      Composer.convertMechanicalComposersForCsv = jest.fn((_composers, _clientId, cb) => cb(null, [[['mechanical row']]]));
      Composer.convertComposersForCsv = jest.fn((_composers, _clientId, cb) => cb(null, [[['composer row']], [['identifier row']], [['agreement row']]]));

      createZip.localFiles = jest.fn((_files, path, cb) => cb(null, path));
    });

    describe('mechanical export', () => {
      it('calls convertMechanicalComposersForCsv', async () => {
        await callExport(500, 'Mechanical');
        expect(Composer.convertMechanicalComposersForCsv).toHaveBeenCalled();
      });

      it('does not call convertComposersForCsv', async () => {
        await callExport(500, 'Mechanical');
        expect(Composer.convertComposersForCsv).not.toHaveBeenCalled();
      });

      it('creates a single CSV writer', async () => {
        await callExport(500, 'Mechanical');
        expect(WriteCsv).toHaveBeenCalledTimes(1);
      });

      it('creates a zip with a single CSV file', async () => {
        await callExport(500, 'Mechanical');
        expect(createZip.localFiles.mock.calls[0][0]).toHaveLength(1);
      });
    });

    describe('Publisher export', () => {
      it('calls convertComposersForCsv', async () => {
        await callExport(500, 'Publisher');
        expect(Composer.convertComposersForCsv).toHaveBeenCalled();
      });

      it('does not call convertMechanicalComposersForCsv', async () => {
        await callExport(500, 'Publisher');
        expect(Composer.convertMechanicalComposersForCsv).not.toHaveBeenCalled();
      });

      it('creates three CSV writers', async () => {
        await callExport(500, 'Publisher');
        expect(WriteCsv).toHaveBeenCalledTimes(3);
      });

      it('creates a zip with three CSV files', async () => {
        await callExport(500, 'Publisher');
        expect(createZip.localFiles.mock.calls[0][0]).toHaveLength(3);
      });

      it('adds data to all three writers per batch', async () => {
        await callExport(500, 'Publisher');
        expect(mockWriter.addData).toHaveBeenCalledTimes(3);
      });
    });

    describe('batch processing', () => {
      it('runs one batch for count under 1000', async () => {
        await callExport(500, 'Mechanical');
        expect(Composer.find).toHaveBeenCalledTimes(1);
      });

      it('runs two batches for count of exactly 1000', async () => {
        await callExport(1000, 'Mechanical');
        expect(Composer.find).toHaveBeenCalledTimes(2);
      });

      it('uses correct skip offset for each batch', async () => {
        await callExport(2000, 'Mechanical');
        expect(mockQuery.skip).toHaveBeenCalledWith(0);
        expect(mockQuery.skip).toHaveBeenCalledWith(1000);
        expect(mockQuery.skip).toHaveBeenCalledWith(2000);
      });

      it('queries with the provided filter and a limit of 1000', async () => {
        await callExport(500, 'Mechanical');
        expect(Composer.find).toHaveBeenCalledWith(filter);
        expect(mockQuery.limit).toHaveBeenCalledWith(1000);
      });

      it('sorts each batch by _id ascending', async () => {
        await callExport(500, 'Mechanical');
        expect(mockQuery.sort).toHaveBeenCalledWith({ _id: 1 });
      });
    });

    describe('error handling', () => {
      it('calls callback with error message when Composer.find fails', async () => {
        mockQuery.sort = jest.fn().mockRejectedValue(new Error('DB error'));
        await expect(callExport(500, 'Mechanical')).rejects.toThrow('Error in exporting the composers');
      });

      it('calls callback with error message when conversion fails', async () => {
        Composer.convertMechanicalComposersForCsv = jest.fn((_composers, _clientId, cb) => cb(new Error('Conversion error')));
        await expect(callExport(500, 'Mechanical')).rejects.toThrow('Error in exporting the composers');
      });

      it('calls callback with error message when writer.write fails', async () => {
        mockWriter.write = jest.fn((cb) => cb(new Error('Write error')));
        await expect(callExport(500, 'Mechanical')).rejects.toThrow('Error writing composer export files');
      });
    });
  });
});
