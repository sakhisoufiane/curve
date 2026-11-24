import { testUtils } from '@curveroyaltysystems/platform-shared-utils';

const { randomId } = testUtils;

// ---------------------------------------------------------------------------
// Composer fixture
// ---------------------------------------------------------------------------

export function makeComposer(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    _id: randomId(),
    clientId: randomId(),
    name: 'Test Composer',
    cae: '',
    caeWithoutLeadingZeros: '',
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
export const asComposer = (c: Record<string, unknown>) => c as any;
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
// Model mock factories
// ---------------------------------------------------------------------------

export function mockComposerModel(overrides: Record<string, unknown> = {}) {
  return {
    findOne: jest.fn().mockReturnValue(mockQuery(null)),
    find: jest.fn().mockReturnValue(mockQuery([])),
    countDocuments: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
}

export function mockWorkModel(overrides: Record<string, unknown> = {}) {
  return {
    find: jest.fn().mockReturnValue(mockQuery([])),
    updateOne: jest.fn().mockResolvedValue({}),
    ...overrides,
  };
}
