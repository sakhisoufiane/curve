jest.mock('../helper', () => ({
  formatRow: jest.fn(),
  addToFile: jest.fn(),
}));

const Helper = require('../helper');
const Process = require('./process');

const mockWriteCsv = {};

describe('processPeriodFileRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call Helper.formatRow for contract row when contractId is NOT in contractIds', async () => {
    const mockRow = {
      catType: 'Contract',
      contractId: 'abc123',
      contractIds: 'def456 ghi789',
    };

    const contracts = {
      abc123: { name: 'Test Contract' },
    };

    const template = ['field1', 'field2'];
    const reportId = 'report-456';
    const client = {};
    const catalogue = {}; // not used for contract

    await Process.processPeriodFileRow({
      row: mockRow,
      catalogue,
      contracts,
      template,
      writeCsv: mockWriteCsv,
      reportId,
      client,
    });

    expect(Helper.formatRow).toHaveBeenCalledWith({
      contract: contracts.abc123,
      row: mockRow,
      template,
      periodFile: true,
    });

    expect(Helper.addToFile).toHaveBeenCalled();
  });

  it('should NOT call Helper.formatRow for contract row when contractId IS in contractIds', async () => {
    const mockRow = {
      catType: 'Contract',
      contractId: 'abc123',
      contractIds: 'abc123 def456',
    };

    const contracts = {
      abc123: { name: 'Test Contract' },
    };

    const template = ['field1', 'field2'];
    const reportId = 'report-789';
    const client = {};
    const catalogue = {}; // not used for contract

    await Process.processPeriodFileRow({
      row: mockRow,
      catalogue,
      contracts,
      template,
      writeCsv: mockWriteCsv,
      reportId,
      client,
    });

    expect(Helper.formatRow).not.toHaveBeenCalled();
    expect(Helper.addToFile).not.toHaveBeenCalled();
  });
});
