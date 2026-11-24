import { testUtils } from '@curveroyaltysystems/platform-shared-utils';

const { randomId } = testUtils;

// ---------------------------------------------------------------------------
// Publisher fixture
// ---------------------------------------------------------------------------

export function makePublisher(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    _id: randomId(),
    clientId: randomId(),
    name: 'Test Publisher',
    cae: '',
    caeWithoutLeadingZeros: '',
    aliases: [],
    publisherAgreements: [],
    potentialDuplicates: [],
    potentialDuplicatesCount: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Type cast helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const asPublisher = (p: Record<string, unknown>) => p as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const asModel = (m: Record<string, unknown>) => m as any;

// ---------------------------------------------------------------------------
// Chainable query mock — supports .sort().limit(), .select().lean(), etc.
// ---------------------------------------------------------------------------

export function mockQuery(resolvedValue: unknown): Record<string, unknown> {
  const query: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolvedValue).then(resolve),
    lean: jest.fn().mockResolvedValue(resolvedValue),
  };
  for (const method of ['select', 'sort', 'limit']) {
    query[method] = jest.fn().mockReturnValue(query);
  }
  return query;
}

// ---------------------------------------------------------------------------
// Publisher model mock factory
// ---------------------------------------------------------------------------

export function mockPublisherModel(overrides: Record<string, unknown> = {}) {
  return {
    findOne: jest.fn().mockReturnValue(mockQuery(null)),
    find: jest.fn().mockReturnValue(mockQuery([])),
    countDocuments: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
}
