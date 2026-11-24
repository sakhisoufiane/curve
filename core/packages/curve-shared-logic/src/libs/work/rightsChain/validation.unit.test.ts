import { testUtils } from '@curveroyaltysystems/platform-shared-utils';
import { checkValidationErrors, ErrorMessages } from './validation';

const { randomId, randomString } = testUtils;

// Minimal work fixture — matches the fields checkValidationErrors reads
function makeWork(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    clientId: randomId(),
    title: randomString(),
    territories: [],
    rightsChain: [],
    partnerRightsChains: [],
    ...overrides,
  };
}

// Mock TerritoryGroup model — defaulting to no territory groups found
let mockTerritoryGroup: { find: jest.Mock };

// Helper to avoid repeating the injection on every call
function callCheckValidationErrors(work: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return checkValidationErrors({ work: work as any, TerritoryGroup: mockTerritoryGroup as any });
}

beforeEach(() => {
  mockTerritoryGroup = { find: jest.fn().mockResolvedValue([]) };
});

describe('Default Chains', () => {
  describe('each controlled chain must have an Original Publisher or Income Participant', () => {
    let work: Record<string, unknown>;

    beforeEach(() => {
      work = makeWork();
    });

    it('should return no errors if a controlled chain includes an Original Publisher or Income Participant', async () => {
      work.rightsChain = [
        {
          type: 'Publisher',
          controlled: true,
          contractType: 'Sub Publisher',
          children: [
            {
              type: 'Publisher',
              controlled: true,
              contractType: 'Original Publisher',
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
      const validationErrors = await callCheckValidationErrors(work);
      expect(validationErrors).not.toContain(`Default Chain: ${ErrorMessages.NoControlledPublisher}`);
    });

    it('should return an error when a controlled chain does not include an Original Publisher or Income Participant', async () => {
      work.rightsChain = [
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
      const validationErrors = await callCheckValidationErrors(work);
      expect(validationErrors).toContain(`Default Chain: ${ErrorMessages.NoControlledPublisher}`);
    });
  });

  describe('Admin or Sub Publisher must come before an Original Publisher', () => {
    let work: Record<string, unknown>;

    beforeEach(() => {
      work = makeWork();
    });

    it('should return no errors if there is an Admin or Sub Publisher before an Original Publisher', async () => {
      work.rightsChain = [
        {
          territory: 'specific',
          territoryCodes: { codes: ['NL', 'GB', 'BE'] },
          children: [
            {
              type: 'Publisher',
              contractType: 'Original Publisher',
              children: [
                {
                  type: 'Composer',
                  contractType: 'Music',
                },
              ],
            },
          ],
        },
        {
          territory: 'specific',
          territoryCodes: { codes: ['NL', 'GB', 'BE'] },
          children: [
            {
              type: 'Publisher',
              contractType: 'Admin',
              children: [
                {
                  type: 'Publisher',
                  contractType: 'Original Publisher',
                  children: [
                    {
                      type: 'Composer',
                      contractType: 'Music',
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];
      const validationErrors = await callCheckValidationErrors(work);
      expect(validationErrors).not.toContain(`Default Chain: ${ErrorMessages.CapacityNotInOrder}`);
    });

    it('should return an error if an Original Publisher is the parent of a Sub Publisher', async () => {
      work.rightsChain = [
        {
          territory: 'specific',
          territoryCodes: { codes: ['NL', 'GB', 'BE'] },
          children: [
            {
              type: 'Publisher',
              contractType: 'Original Publisher',
              children: [
                {
                  type: 'Publisher',
                  contractType: 'Sub Publisher',
                  children: [
                    {
                      type: 'Composer',
                      contractType: 'Music',
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];
      const validationErrors = await callCheckValidationErrors(work);
      expect(validationErrors).toContain(`Default Chain: ${ErrorMessages.CapacityNotInOrder}`);
    });
  });

  describe('Owned shares cannot be assigned to an Admin, Sub Publisher or Income Participant', () => {
    let work: Record<string, unknown>;

    beforeEach(() => {
      work = makeWork({
        rightsChain: [
          {
            territory: 'specific',
            territoryCodes: { codes: ['NL', 'GB', 'BE'] },
            children: [
              {
                type: 'Publisher',
                contractType: 'Admin',
                mechanicalOwnership: 50,
                performanceOwnership: 50,
                mechanicalCollection: 50,
                performanceCollection: 50,
                children: [
                  {
                    type: 'Composer',
                    contractType: 'Music',
                    mechanicalOwnership: 50,
                    performanceOwnership: 50,
                    mechanicalCollection: 50,
                    performanceCollection: 50,
                  },
                ],
              },
            ],
          },
        ],
      });
    });

    it('should return an error if owned shares are assigned to an Admin', async () => {
      const validationErrors = await callCheckValidationErrors(work);
      expect(validationErrors).toContain(`Default Chain: ${ErrorMessages.NoOwnedSharesForPublisherTypes}`);
    });

    it('should return an error if owned shares are assigned to a Sub Publisher', async () => {
      work = makeWork({
        rightsChain: [
          {
            territory: 'specific',
            territoryCodes: { codes: ['NL', 'GB', 'BE'] },
            children: [
              {
                type: 'Publisher',
                contractType: 'Sub Publisher',
                mechanicalOwnership: 50,
                performanceOwnership: 50,
                mechanicalCollection: 50,
                performanceCollection: 50,
                children: [
                  {
                    type: 'Composer',
                    contractType: 'Music',
                    mechanicalOwnership: 50,
                    performanceOwnership: 50,
                    mechanicalCollection: 50,
                    performanceCollection: 50,
                  },
                ],
              },
            ],
          },
        ],
      });
      const validationErrors = await callCheckValidationErrors(work);
      expect(validationErrors).toContain(`Default Chain: ${ErrorMessages.NoOwnedSharesForPublisherTypes}`);
    });

    it('should return an error if owned shares are assigned to an Income Participant', async () => {
      work = makeWork({
        rightsChain: [
          {
            territory: 'specific',
            territoryCodes: { codes: ['NL', 'GB', 'BE'] },
            children: [
              {
                type: 'Publisher',
                contractType: 'Income Participant',
                mechanicalOwnership: 50,
                performanceOwnership: 50,
                mechanicalCollection: 50,
                performanceCollection: 50,
                children: [
                  {
                    type: 'Composer',
                    contractType: 'Music',
                    mechanicalOwnership: 50,
                    performanceOwnership: 50,
                    mechanicalCollection: 50,
                    performanceCollection: 50,
                  },
                ],
              },
            ],
          },
        ],
      });
      const validationErrors = await callCheckValidationErrors(work);
      expect(validationErrors).toContain(`Default Chain: ${ErrorMessages.NoOwnedSharesForPublisherTypes}`);
    });

    it('should return no validation errors if owned shares are assigned to a valid Publisher type', async () => {
      work = makeWork({
        rightsChain: [
          {
            territory: 'specific',
            territoryCodes: { codes: ['NL', 'GB', 'BE'] },
            children: [
              {
                type: 'Publisher',
                contractType: 'Original Publisher',
                mechanicalOwnership: 50,
                performanceOwnership: 50,
                mechanicalCollection: 50,
                performanceCollection: 50,
                children: [
                  {
                    type: 'Composer',
                    contractType: 'Music',
                    mechanicalOwnership: 50,
                    performanceOwnership: 50,
                    mechanicalCollection: 50,
                    performanceCollection: 50,
                  },
                ],
              },
            ],
          },
        ],
      });
      const validationErrors = await callCheckValidationErrors(work);
      expect(validationErrors).not.toContain(`Default Chain: ${ErrorMessages.NoOwnedSharesForPublisherTypes}`);
    });

    it('should not attempt Original Publisher & Acquirer owned share checks for Income Participants', async () => {
      work = makeWork({
        territories: ['WW'],
        rightsChain: [
          {
            territory: 'WW',
            children: [
              {
                type: 'Publisher',
                publisherId: '667d346cb57a906d20472055',
                contractType: 'Income Participant',
                controlled: true,
                performanceOwnership: 0,
                performanceCollection: 50,
                mechanicalOwnership: 0,
                mechanicalCollection: 100,
                interestedPartyNo: 'P00000003',
                children: [
                  {
                    type: 'Composer',
                    composerId: '6679243ca5c4b191417dfe27',
                    contractType: 'Lyrics and Music',
                    controlled: true,
                    performanceOwnership: 100,
                    performanceCollection: 50,
                    mechanicalOwnership: 100,
                    mechanicalCollection: 0,
                  },
                ],
              },
            ],
          },
        ],
      });
      const validationErrors = await callCheckValidationErrors(work);
      expect(validationErrors).not.toContain(`Default Chain: ${ErrorMessages.NoOwnedSharesForPublisherTypes}`);
    });
  });

  describe('Specific territories & territory groups must not overlap across chains', () => {
    let work: Record<string, unknown>;

    beforeEach(() => {
      work = makeWork();
    });

    it('should flag overlapping specific territories across chains', async () => {
      work.rightsChain = [
        {
          territory: 'specific',
          territoryCodes: { codes: ['NL', 'GB', 'BE'] },
          children: ['child'],
        },
        {
          territory: 'specific',
          territoryCodes: { codes: ['BE', 'FR'] },
          children: ['child'],
        },
      ];
      const validationErrors = await callCheckValidationErrors(work);
      expect(validationErrors).toContain(`Default Chain: ${ErrorMessages.OverlappingTerritories} - BE`);
    });

    it('should not duplicate territory codes in the overlapping territories error messages', async () => {
      work.rightsChain = [
        {
          territory: 'specific',
          territoryCodes: { codes: ['CA', 'US'] },
          children: ['child'],
        },
        {
          territory: 'specific',
          territoryCodes: { codes: ['CA', 'US'] },
          children: ['child'],
        },
        {
          territory: 'specific',
          territoryCodes: { codes: ['CA', 'US'] },
          children: ['child'],
        },
      ];
      const validationErrors = await callCheckValidationErrors(work);
      expect(validationErrors).toContain(`Default Chain: ${ErrorMessages.OverlappingTerritories} - CA, US`);
    });

    it('should flag overlapping specific territories against territory groups', async () => {
      const territoryGroupId = randomId();
      mockTerritoryGroup.find.mockResolvedValue([
        { _id: territoryGroupId, clientId: work.clientId, name: 'Europe', territories: ['NL', 'GB', 'BE', 'FR', 'DE'] },
      ]);
      work.rightsChain = [
        {
          territory: 'specific',
          territoryCodes: { codes: ['NL', 'GB', 'BE'] },
          children: ['child'],
        },
        {
          territory: territoryGroupId,
          children: ['child'],
        },
      ];
      const validationErrors = await callCheckValidationErrors(work);
      const expectedSubstring = `Default Chain: ${ErrorMessages.OverlappingTerritories}`;
      expect(validationErrors.some((error) => error.includes(expectedSubstring))).toBe(true);
    });

    it('should not flag overlapping specific territories when there are none', async () => {
      work.rightsChain = [
        {
          territory: 'specific',
          territoryCodes: { codes: ['NL', 'GB', 'BE'] },
          children: ['child'],
        },
        {
          territory: 'specific',
          territoryCodes: { codes: ['FR', 'DE'] },
          children: ['child'],
        },
      ];
      const validationErrors = await callCheckValidationErrors(work);
      const expectedSubstring = `Default Chain: ${ErrorMessages.OverlappingTerritories}`;
      expect(validationErrors.some((error) => error.includes(expectedSubstring))).toBe(false);
    });

    it('should not flag overlapping territory groups when there are none', async () => {
      const territoryGroupId1 = randomId();
      const territoryGroupId2 = randomId();
      mockTerritoryGroup.find.mockResolvedValue([
        { _id: territoryGroupId1, clientId: work.clientId, name: 'Group 1', territories: ['NL', 'GB', 'BE'] },
        { _id: territoryGroupId2, clientId: work.clientId, name: 'Group 2', territories: ['FR', 'DE'] },
      ]);
      work.rightsChain = [
        { territory: territoryGroupId1, children: ['child'] },
        { territory: territoryGroupId2, children: ['child'] },
      ];
      const validationErrors = await callCheckValidationErrors(work);
      const expectedSubstring = `Default Chain: ${ErrorMessages.OverlappingTerritories}`;
      expect(validationErrors.some((error) => error.includes(expectedSubstring))).toBe(false);
    });

    it('should not flag overlapping specific territories against a World chain', async () => {
      work.rightsChain = [
        {
          territory: 'specific',
          territoryCodes: { codes: ['NL', 'GB', 'BE'] },
          children: [],
        },
        {
          territory: 'WW',
          children: [],
        },
      ];
      const validationErrors = await callCheckValidationErrors(work);
      const expectedSubstring = `Default Chain: ${ErrorMessages.OverlappingTerritories}`;
      expect(validationErrors.some((error) => error.includes(expectedSubstring))).toBe(false);
    });

    it('should not flag overlapping territories between partner chains and the default chain', async () => {
      work.rightsChain = [
        {
          territory: 'specific',
          territoryCodes: { codes: ['NL', 'GB', 'BE'] },
          children: [],
        },
      ];
      work.partnerRightsChains = [
        {
          deliveryPartnerId: randomId(),
          rightsChain: [
            {
              territory: 'specific',
              territoryCodes: { codes: ['BE', 'FR'] },
              children: [],
            },
          ],
        },
      ];
      const validationErrors = await callCheckValidationErrors(work);
      const expectedSubstring = `Partner Chain: ${ErrorMessages.OverlappingTerritories}`;
      expect(validationErrors.some((error) => error.includes(expectedSubstring))).toBe(false);
    });
  });
});

describe('Partner Chains', () => {
  describe('each controlled chain must have an Original Publisher or Income Participant', () => {
    let work: Record<string, unknown>;

    beforeEach(() => {
      work = makeWork();
    });

    it('should return no errors if a controlled chain includes an Original Publisher or Income Participant', async () => {
      work.partnerRightsChains = [
        {
          deliveryPartnerId: 123,
          rightsChain: [
            {
              type: 'Publisher',
              controlled: true,
              contractType: 'Sub Publisher',
              children: [
                {
                  type: 'Publisher',
                  controlled: true,
                  contractType: 'Original Publisher',
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
          ],
        },
      ];
      const validationErrors = await callCheckValidationErrors(work);
      expect(validationErrors).not.toContain(`Partner Chain: ${ErrorMessages.NoControlledPublisher}`);
    });

    it('should return an error when a controlled chain does not include an Original Publisher or Income Participant', async () => {
      work.partnerRightsChains = [
        {
          deliveryPartnerId: 123,
          rightsChain: [
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
          ],
        },
      ];
      const validationErrors = await callCheckValidationErrors(work);
      expect(validationErrors).toContain(`Partner Chain: ${ErrorMessages.NoControlledPublisher}`);
    });
  });

  describe('Admin or Sub Publisher must come before an Original Publisher', () => {
    let work: Record<string, unknown>;

    beforeEach(() => {
      work = makeWork();
    });

    it('should return no errors if there is an Admin or Sub Publisher before an Original Publisher', async () => {
      work.partnerRightsChains = [
        {
          deliveryPartnerId: 123,
          rightsChain: [
            {
              territory: 'specific',
              territoryCodes: { codes: ['NL', 'GB', 'BE'] },
              children: [
                {
                  type: 'Publisher',
                  contractType: 'Original Publisher',
                  children: [
                    {
                      type: 'Composer',
                      contractType: 'Music',
                    },
                  ],
                },
              ],
            },
            {
              territory: 'specific',
              territoryCodes: { codes: ['NL', 'GB', 'BE'] },
              children: [
                {
                  type: 'Publisher',
                  contractType: 'Admin',
                  children: [
                    {
                      type: 'Publisher',
                      contractType: 'Original Publisher',
                      children: [
                        {
                          type: 'Composer',
                          contractType: 'Music',
                          children: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];
      const validationErrors = await callCheckValidationErrors(work);
      expect(validationErrors).not.toContain(`Partner Chain: ${ErrorMessages.CapacityNotInOrder}`);
    });

    it('should return an error if an Original Publisher is the parent of a Sub Publisher', async () => {
      work.partnerRightsChains = [
        {
          deliveryPartnerId: 123,
          rightsChain: [
            {
              territory: 'specific',
              territoryCodes: { codes: ['NL', 'GB', 'BE'] },
              children: [
                {
                  type: 'Publisher',
                  contractType: 'Original Publisher',
                  children: [
                    {
                      type: 'Publisher',
                      contractType: 'Sub Publisher',
                      children: [
                        {
                          type: 'Composer',
                          contractType: 'Music',
                          children: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];
      const validationErrors = await callCheckValidationErrors(work);
      expect(validationErrors).toContain(`Partner Chain: ${ErrorMessages.CapacityNotInOrder}`);
    });
  });

  describe('Owned shares cannot be assigned to an Admin, Sub Publisher or Income Participant', () => {
    function makePartnerChainWork(contractType: string) {
      return makeWork({
        partnerRightsChains: [
          {
            deliveryPartnerId: 123,
            rightsChain: [
              {
                territory: 'specific',
                territoryCodes: { codes: ['NL', 'GB', 'BE'] },
                children: [
                  {
                    type: 'Publisher',
                    contractType,
                    mechanicalOwnership: 50,
                    performanceOwnership: 50,
                    mechanicalCollection: 50,
                    performanceCollection: 50,
                    children: [
                      {
                        type: 'Composer',
                        contractType: 'Music',
                        mechanicalOwnership: 50,
                        performanceOwnership: 50,
                        mechanicalCollection: 50,
                        performanceCollection: 50,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
    }

    it('should return an error if owned shares are assigned to an Admin', async () => {
      const validationErrors = await callCheckValidationErrors(makePartnerChainWork('Admin'));
      expect(validationErrors).toContain(`Partner Chain: ${ErrorMessages.NoOwnedSharesForPublisherTypes}`);
    });

    it('should return an error if owned shares are assigned to a Sub Publisher', async () => {
      const validationErrors = await callCheckValidationErrors(makePartnerChainWork('Sub Publisher'));
      expect(validationErrors).toContain(`Partner Chain: ${ErrorMessages.NoOwnedSharesForPublisherTypes}`);
    });

    it('should return an error if owned shares are assigned to an Income Participant', async () => {
      const validationErrors = await callCheckValidationErrors(makePartnerChainWork('Income Participant'));
      expect(validationErrors).toContain(`Partner Chain: ${ErrorMessages.NoOwnedSharesForPublisherTypes}`);
    });

    it('should return no validation errors if owned shares are assigned to a valid Publisher type', async () => {
      const validationErrors = await callCheckValidationErrors(makePartnerChainWork('Original Publisher'));
      expect(validationErrors).not.toContain(`Partner Chain: ${ErrorMessages.NoOwnedSharesForPublisherTypes}`);
    });

    it('should not attempt Original Publisher & Acquirer owned share checks for Income Participants', async () => {
      const work = makeWork({
        territories: ['WW'],
        partnerRightsChains: [
          {
            deliveryPartnerId: 123,
            rightsChain: [
              {
                territory: 'WW',
                children: [
                  {
                    type: 'Publisher',
                    publisherId: '667d346cb57a906d20472055',
                    contractType: 'Income Participant',
                    controlled: true,
                    performanceOwnership: 0,
                    performanceCollection: 50,
                    mechanicalOwnership: 0,
                    mechanicalCollection: 100,
                    interestedPartyNo: 'P00000003',
                    children: [
                      {
                        type: 'Composer',
                        composerId: '6679243ca5c4b191417dfe27',
                        contractType: 'Lyrics and Music',
                        controlled: true,
                        performanceOwnership: 100,
                        performanceCollection: 50,
                        mechanicalOwnership: 100,
                        mechanicalCollection: 0,
                      },
                    ],
                  },
                ],
                totalMechanicalOwnership: 100,
                totalPerformanceOwnership: 100,
                totalMechanicalCollection: 100,
                totalPerformanceCollection: 100,
                mechanicalOwnership: 0,
                performanceOwnership: 0,
                mechanicalCollection: 0,
                performanceCollection: 0,
              },
            ],
          },
        ],
      });
      const validationErrors = await callCheckValidationErrors(work);
      expect(validationErrors).not.toContain(`Partner Chain: ${ErrorMessages.NoOwnedSharesForPublisherTypes}`);
    });
  });

  describe('A Delivery Partner can only have one IP Chain assigned', () => {
    let work: Record<string, unknown>;

    beforeEach(() => {
      work = makeWork();
    });

    it('should flag duplicate partner rights chains if there are multiple chains for a delivery partner', async () => {
      work.partnerRightsChains = [
        {
          deliveryPartnerId: 1,
          rightsChain: [
            {
              territory: 'specific',
              territoryCodes: { codes: ['NL', 'GB', 'BE'] },
              children: [],
            },
          ],
        },
        {
          deliveryPartnerId: 1,
          rightsChain: [
            {
              territory: 'specific',
              territoryCodes: { codes: ['NL', 'GB', 'BE'] },
              children: [],
            },
          ],
        },
      ];
      const validationErrors = await callCheckValidationErrors(work);
      expect(validationErrors).toContain(`Partner Chain: ${ErrorMessages.DuplicatePartnerChains}`);
    });

    it('should not flag duplicate partner rights chains when there are none', async () => {
      work.partnerRightsChains = [
        {
          deliveryPartnerId: 1,
          rightsChain: [
            {
              territory: 'specific',
              territoryCodes: { codes: ['NL', 'GB', 'BE'] },
              children: ['child'],
            },
          ],
        },
        {
          deliveryPartnerId: 2,
          rightsChain: [
            {
              territory: 'specific',
              territoryCodes: { codes: ['NL', 'GB', 'BE'] },
              children: ['child'],
            },
          ],
        },
      ];
      const validationErrors = await callCheckValidationErrors(work);
      expect(validationErrors).not.toContain(`Partner Chain: ${ErrorMessages.DuplicatePartnerChains}`);
    });
  });

  describe('A Partner Chain is currently empty', () => {
    let work: Record<string, unknown>;

    beforeEach(() => {
      work = makeWork();
    });

    it('should raise an error if at least one partner chain is empty (not complete)', async () => {
      work.partnerRightsChains = [
        { deliveryPartnerId: 1, rightsChain: [] },
        { deliveryPartnerId: 2, rightsChain: [{ territory: 'WW', children: [] }] },
      ];
      const validationErrors = await callCheckValidationErrors(work);
      expect(validationErrors).toContain(`Partner Chain: ${ErrorMessages.EmptyChain}`);
    });

    it('should not raise an error if all partner chains are complete', async () => {
      work.partnerRightsChains = [
        { deliveryPartnerId: 1, rightsChain: [{ territory: 'WW', children: ['child'] }] },
        { deliveryPartnerId: 2, rightsChain: [{ territory: 'WW', children: ['child'] }] },
      ];
      const validationErrors = await callCheckValidationErrors(work);
      expect(validationErrors).not.toContain(`Partner Chain: ${ErrorMessages.EmptyChain}`);
    });
  });

  describe('Specific territories & territory groups must not overlap across chains', () => {
    let work: Record<string, unknown>;

    beforeEach(() => {
      work = makeWork();
    });

    it('should flag overlapping specific territories across chains', async () => {
      work.partnerRightsChains = [
        {
          deliveryPartnerId: randomId(),
          rightsChain: [
            {
              territory: 'specific',
              territoryCodes: { codes: ['NL', 'GB', 'BE'] },
              children: ['child'],
            },
            {
              territory: 'specific',
              territoryCodes: { codes: ['BE', 'FR'] },
              children: ['child'],
            },
          ],
        },
      ];
      const validationErrors = await callCheckValidationErrors(work);
      expect(validationErrors).toContain(`Partner Chain: ${ErrorMessages.OverlappingTerritories} - BE`);
    });

    it('should flag overlapping specific territories against territory groups', async () => {
      const territoryGroupId = randomId();
      mockTerritoryGroup.find.mockResolvedValue([
        { _id: territoryGroupId, clientId: work.clientId, name: 'Europe', territories: ['NL', 'GB', 'BE', 'FR', 'DE'] },
      ]);
      work.partnerRightsChains = [
        {
          deliveryPartnerId: randomId(),
          rightsChain: [
            {
              territory: 'specific',
              territoryCodes: { codes: ['NL', 'GB', 'BE'] },
              children: ['child'],
            },
            {
              territory: territoryGroupId,
              children: ['child'],
            },
          ],
        },
      ];
      const validationErrors = await callCheckValidationErrors(work);
      const expectedSubstring = `Partner Chain: ${ErrorMessages.OverlappingTerritories}`;
      expect(validationErrors.some((error) => error.includes(expectedSubstring))).toBe(true);
    });

    it('should not flag overlapping specific territories when there are none', async () => {
      work.partnerRightsChains = [
        {
          deliveryPartnerId: randomId(),
          rightsChain: [
            {
              territory: 'specific',
              territoryCodes: { codes: ['NL', 'GB', 'BE'] },
              children: ['child'],
            },
            {
              territory: 'specific',
              territoryCodes: { codes: ['FR', 'DE'] },
              children: ['child'],
            },
          ],
        },
      ];
      const validationErrors = await callCheckValidationErrors(work);
      const expectedSubstring = `Partner Chain: ${ErrorMessages.OverlappingTerritories}`;
      expect(validationErrors.some((error) => error.includes(expectedSubstring))).toBe(false);
    });

    it('should not flag overlapping territory groups when there are none', async () => {
      const territoryGroupId1 = randomId();
      const territoryGroupId2 = randomId();
      mockTerritoryGroup.find.mockResolvedValue([
        { _id: territoryGroupId1, clientId: work.clientId, name: 'Group 1', territories: ['NL', 'GB', 'BE'] },
        { _id: territoryGroupId2, clientId: work.clientId, name: 'Group 2', territories: ['FR', 'DE'] },
      ]);
      work.partnerRightsChains = [
        {
          deliveryPartnerId: randomId(),
          rightsChain: [
            { territory: territoryGroupId1, children: ['child'] },
            { territory: territoryGroupId2, children: ['child'] },
          ],
        },
      ];
      const validationErrors = await callCheckValidationErrors(work);
      const expectedSubstring = `Partner Chain: ${ErrorMessages.OverlappingTerritories}`;
      expect(validationErrors.some((error) => error.includes(expectedSubstring))).toBe(false);
    });

    it('should not flag overlapping specific territories against a World chain', async () => {
      work.partnerRightsChains = [
        {
          deliveryPartnerId: randomId(),
          rightsChain: [
            {
              territory: 'specific',
              territoryCodes: { codes: ['NL', 'GB', 'BE'] },
              children: [],
            },
            {
              territory: 'WW',
              children: [],
            },
          ],
        },
      ];
      const validationErrors = await callCheckValidationErrors(work);
      const expectedSubstring = `Partner Chain: ${ErrorMessages.OverlappingTerritories}`;
      expect(validationErrors.some((error) => error.includes(expectedSubstring))).toBe(false);
    });

    it('should not flag overlapping territories across different partner chains', async () => {
      work.partnerRightsChains = [
        {
          deliveryPartnerId: randomId(),
          rightsChain: [
            {
              territory: 'specific',
              territoryCodes: { codes: ['NL', 'GB', 'BE'] },
              children: [],
            },
          ],
        },
        {
          deliveryPartnerId: randomId(),
          rightsChain: [
            {
              territory: 'specific',
              territoryCodes: { codes: ['BE', 'FR'] },
              children: [],
            },
          ],
        },
      ];
      const validationErrors = await callCheckValidationErrors(work);
      const expectedSubstring = `Partner Chain: ${ErrorMessages.OverlappingTerritories}`;
      expect(validationErrors.some((error) => error.includes(expectedSubstring))).toBe(false);
    });

    it('should not flag overlapping territories between partner chains and the default chain', async () => {
      work.rightsChain = [
        {
          territory: 'specific',
          territoryCodes: { codes: ['NL', 'GB', 'BE'] },
          children: [],
        },
      ];
      work.partnerRightsChains = [
        {
          deliveryPartnerId: randomId(),
          rightsChain: [
            {
              territory: 'specific',
              territoryCodes: { codes: ['BE', 'FR'] },
              children: [],
            },
          ],
        },
      ];
      const validationErrors = await callCheckValidationErrors(work);
      const expectedSubstring = `Partner Chain: ${ErrorMessages.OverlappingTerritories}`;
      expect(validationErrors.some((error) => error.includes(expectedSubstring))).toBe(false);
    });
  });
});
