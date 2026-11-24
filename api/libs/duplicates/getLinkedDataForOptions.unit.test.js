const getLinkedDataForOptions = require('./getLinkedDataForOptions');

const mockContractFind = jest.fn();
const mockPublisherFind = jest.fn();

jest.mock('../../models/contract', () => ({ find: mockContractFind }));
jest.mock('../../models/publisher', () => ({ find: mockPublisherFind }));

describe('getLinkedDataForOptions', () => {
  const clientId = 'client123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should enrich linkedContracts with contractName', async () => {
    const input = {
      linkedContracts: [
        { contractId: 'c1' },
        { contractId: 'c2' },
      ],
      publisherAgreements: [],
    };

    const mockContracts = [
      { _id: 'c1', name: 'Contract One' },
      { _id: 'c2', name: 'Contract Two' },
    ];

    mockContractFind.mockResolvedValue(mockContracts);

    const result = await getLinkedDataForOptions(clientId, input);

    expect(mockContractFind).toHaveBeenCalledWith({
      clientId,
      _id: { $in: ['c1', 'c2'] },
    });

    expect(result.linkedContracts).toEqual([
      { contractId: 'c1', contractName: 'Contract One' },
      { contractId: 'c2', contractName: 'Contract Two' },
    ]);
  });

  it('should return empty strings for unmatched contracts or publishers', async () => {
    const input = {
      linkedContracts: [
        { contractId: 'c3' },
      ],
      publisherAgreements: [
        { publisherId: 'p3' },
      ],
    };

    mockContractFind.mockResolvedValue([]);
    mockPublisherFind.mockResolvedValue([]);

    const result = await getLinkedDataForOptions(clientId, input);

    expect(result.linkedContracts).toEqual([
      { contractId: 'c3', contractName: '' },
    ]);

    expect(result.publisherAgreements).toEqual([{ publisherId: 'p3' }]);
  });

  it('should skip lookups when lists are empty', async () => {
    const input = {
      linkedContracts: [],
      publisherAgreements: [],
    };

    const result = await getLinkedDataForOptions(clientId, input);

    expect(mockContractFind).not.toHaveBeenCalled();
    expect(result).toEqual({
      linkedContracts: [],
      publisherAgreements: [],
    });
  });
});
