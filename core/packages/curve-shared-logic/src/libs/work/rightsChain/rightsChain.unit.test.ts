import {
  controlledByPublisherOrIncomeParticipant,
  sumContractTypeValueInIpChainChildren,
  checkChainsHaveTerritory,
  countContractTypeInIpChainChildren,
  ContractType,
  ChainItem,
} from './rightsChain';

describe('controlledByPublisherOrIncomeParticipant', () => {
  it('should return true if a controlled chain includes an Original Publisher', () => {
    const chain = [
      {
        id: 1,
        type: 'Publisher',
        controlled: true,
        contractType: 'Sub Publisher',
        children: [
          {
            id: 2,
            type: 'Publisher',
            controlled: true,
            contractType: 'Original Publisher',
            children: [
              {
                id: 3,
                type: 'Composer',
                controlled: true,
                contractType: 'Lyrics & Music',
              },
            ],
          },
        ],
      },
    ];
    expect(controlledByPublisherOrIncomeParticipant(chain)).toEqual(true);
  });
  it('should return true if a controlled chain includes an Income Participant', () => {
    const chain = [
      {
        type: 'Publisher',
        controlled: true,
        contractType: 'Income Participant',
        children: [
          {
            type: 'Composer',
            controlled: true,
            contractType: 'Lyrics & Music',
          },
        ],
      },
    ];
    expect(controlledByPublisherOrIncomeParticipant(chain)).toEqual(true);
  });
  it('should return false if a controlled chain does not include an Original Publisher or Income Participant', () => {
    const chain = [
      {
        type: 'Publisher',
        controlled: true,
        contractType: 'Admin',
        children: [
          {
            type: 'Composer',
            controlled: true,
            contractType: 'Lyrics & Music',
          },
        ],
      },
    ];
    expect(controlledByPublisherOrIncomeParticipant(chain)).toEqual(false);
  });
  it('should return true for deeply nested chains that include an Income Participant', () => {
    const chain = [
      {
        type: 'Publisher',
        controlled: true,
        contractType: 'Admin',
        children: [
          {
            type: 'Publisher',
            controlled: true,
            contractType: 'Income Participant',
            children: [
              {
                type: 'Composer',
                controlled: true,
                contractType: 'Lyrics & Music',
              },
            ],
          },
        ],
      },
    ];
    expect(controlledByPublisherOrIncomeParticipant(chain)).toEqual(true);
  });
  it('should ignore uncontrolled chains and always return true', () => {
    const chain = [
      {
        id: 1,
        type: 'Publisher',
        controlled: false,
        contractType: 'Sub Publisher',
        children: [
          {
            id: 2,
            type: 'Publisher',
            controlled: false,
            contractType: 'Original Publisher',
            children: [
              {
                id: 3,
                type: 'Composer',
                controlled: false,
                contractType: 'Lyrics & Music',
              },
            ],
          },
        ],
      },
    ];
    expect(controlledByPublisherOrIncomeParticipant(chain)).toEqual(true);
  });
  it('should return false if a controlled composer is at the top level of the chain', () => {
    const chain = [
      {
        id: 1,
        type: 'Publisher',
        controlled: true,
        contractType: 'Original Publisher',
        children: [
          {
            id: 2,
            type: 'Composer',
            controlled: true,
            contractType: 'Lyrics & Music',
          },
        ],
      },
      {
        id: 3,
        type: 'Composer',
        controlled: true,
        contractType: 'Lyrics & Music',
        children: [],
      },
    ];
    expect(controlledByPublisherOrIncomeParticipant(chain)).toEqual(false);
  });
});

describe('sumContractTypeValueInIpChainChildren', () => {
  it('should total the specified field for all valid chain types and their children', () => {
    const chain: ChainItem[] = [
      {
        contractType: ContractType.OriginalPublisher,
        mechanicalOwnership: 12.5,
        children: [
          {
            contractType: ContractType.SubPublisher,
            mechanicalOwnership: 50,
          },
          {
            contractType: ContractType.OriginalPublisher,
            mechanicalOwnership: 12.5,
            children: [
              {
                contractType: ContractType.OriginalPublisher,
                mechanicalOwnership: 25,
              },
            ],
          },
        ],
      },
    ];
    // Mechanical Ownership for Original Publishers should total 50%
    expect(
      sumContractTypeValueInIpChainChildren(chain[0]!, 'mechanicalOwnership', [ContractType.OriginalPublisher], 0)
    ).toEqual(50);
    // Mechanical Ownership for Original Publishers + Sub Publishers should total 100%
    expect(
      sumContractTypeValueInIpChainChildren(
        chain[0]!,
        'mechanicalOwnership',
        [ContractType.OriginalPublisher, ContractType.SubPublisher],
        0
      )
    ).toEqual(100);
    // Performance Ownership should be zero for Admins (none on the chain)
    expect(sumContractTypeValueInIpChainChildren(chain[0]!, 'performanceOwnership', [ContractType.Admin], 0)).toEqual(
      0
    );
  });
});

describe('countContractTypeInIpChainChildren', () => {
  it('should return the count of a specified type + contract type in the chain', () => {
    const chain: ChainItem[] = [
      {
        type: 'Publisher',
        contractType: ContractType.Admin,
        children: [
          {
            type: 'Publisher',
            contractType: ContractType.SubPublisher,
            children: [
              {
                type: 'Publisher',
                contractType: ContractType.OriginalPublisher,
                children: [
                  {
                    type: 'Composer',
                    contractType: 'Lyrics and Music',
                  },
                  {
                    type: 'Composer',
                    contractType: 'Lyrics',
                  },
                ],
              },
            ],
          },
          {
            type: 'Publisher',
            contractType: ContractType.OriginalPublisher,
            children: [
              {
                type: 'Composer',
                contractType: 'Lyrics and Music',
              },
            ],
          },
        ],
      },
    ];
    // There are three Original Publishers
    expect(countContractTypeInIpChainChildren(chain[0]!, 'Publisher', [ContractType.OriginalPublisher], 0)).toEqual(2);
    // There are two Composers with the the contract type Lyrics and Music
    expect(countContractTypeInIpChainChildren(chain[0]!, 'Composer', ['Lyrics and Music'], 0)).toEqual(2);
    // It should total up different Publisher types when specified
    expect(
      countContractTypeInIpChainChildren(
        chain[0]!,
        'Publisher',
        [ContractType.OriginalPublisher, ContractType.SubPublisher, ContractType.Admin],
        0
      )
    ).toEqual(4);
  });
});

describe('checkChainsHaveTerritory', () => {
  it('should return false if a chain has no territory defined', () => {
    const chain1 = [{ children: [], totalPerformanceCollection: 100 }];
    const chain2 = [{ territory: null, children: [], totalPerformanceCollection: 100 }];
    expect(checkChainsHaveTerritory(chain1)).toEqual(false);
    expect(checkChainsHaveTerritory(chain2)).toEqual(false);
  });

  it('should return false if a chain has no territory defined (specific)', () => {
    const chain1 = [{ territory: 'specific', children: [], totalPerformanceCollection: 100 }];
    const chain2 = [
      { territory: 'specific', territoryCodes: { name: '', codes: [] }, children: [], totalPerformanceCollection: 100 },
    ];
    expect(checkChainsHaveTerritory(chain1)).toEqual(false);
    expect(checkChainsHaveTerritory(chain2)).toEqual(false);
  });

  it('should return false if even one single chain no territory defined', () => {
    const chains = [
      { territory: 'WW', children: [], totalPerformanceCollection: 100 },
      {
        territory: 'specific',
        territoryCodes: { name: 'GB, NL', codes: ['GB', 'NL'] },
        children: [],
        totalPerformanceCollection: 100,
      },
      // No territories defined on this chain
      { territory: 'specific', territoryCodes: { name: '', codes: [] }, children: [], totalPerformanceCollection: 100 },
    ];
    expect(checkChainsHaveTerritory(chains)).toEqual(false);
  });

  it('should return true if every chain has a territory defined', () => {
    const chains = [
      { territory: 'WW', children: [], totalPerformanceCollection: 100 },
      {
        territory: 'specific',
        territoryCodes: { name: 'GB, NL', codes: ['GB', 'NL'] },
        children: [],
        totalPerformanceCollection: 100,
      },
      { territory: '6613edda8c39ec79087dead1', children: [], totalPerformanceCollection: 100 },
    ];
    expect(checkChainsHaveTerritory(chains)).toEqual(true);
  });
});
