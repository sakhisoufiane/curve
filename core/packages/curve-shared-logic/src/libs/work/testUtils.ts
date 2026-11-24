import { testUtils } from '@curveroyaltysystems/platform-shared-utils';

const { randomId, randomString } = testUtils;

// ---------------------------------------------------------------------------
// Work fixture
// ---------------------------------------------------------------------------

function addToSetStub(arr: unknown[]) {
  (arr as unknown as Record<string, unknown>).addToSet = (...items: unknown[]) => arr.push(...items);
  return arr;
}

export function makeWork(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const work: Record<string, unknown> = {
    _id: randomId(),
    clientId: randomId(),
    title: randomString(),
    societyIdentifiers: [],
    aliases: [],
    partnerRightsChains: [],
    modifiedPaths: () => [],
    ...overrides,
  };
  // Stub Mongoose's addToSet on rightsChain. combineDuplicateChainPublishers reassigns
  // work.rightsChain = [] before calling .addToSet, so we intercept the property with a setter.
  let _rightsChain = addToSetStub((work.rightsChain as unknown[] | undefined) ?? []);
  Object.defineProperty(work, 'rightsChain', {
    get: () => _rightsChain,
    set: (val: unknown[]) => {
      _rightsChain = addToSetStub(val);
    },
    enumerable: true,
    configurable: true,
  });
  return work;
}

// ---------------------------------------------------------------------------
// Type cast helpers
//
// All functions in preSave.ts are typed against HydratedDocument/Model. Tests
// use plain fixture objects. The casts live here so individual tests stay clean.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const asWork = (w: Record<string, unknown>) => w as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const asModel = (m: Record<string, unknown>) => m as any;

// ---------------------------------------------------------------------------
// Chainable query mock
//
// Supports: .select().lean(), .sort().lean(), .limit().lean(), etc.
// ---------------------------------------------------------------------------

export function mockQuery(resolvedValue: unknown): Record<string, unknown> {
  // The query is itself thenable so both patterns work:
  //   await find().select().lean()  — chains that call .lean() explicitly
  //   await find().select()         — awaits the query directly without .lean()
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

export function mockWorkModel(overrides: Record<string, unknown> = {}) {
  return {
    findOne: jest.fn().mockReturnValue(mockQuery(null)),
    find: jest.fn().mockReturnValue(mockQuery([])),
    findById: jest.fn().mockResolvedValue(null),
    countDocuments: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
}

export function mockClientModel(overrides: Record<string, unknown> = {}) {
  return {
    findById: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

export function mockComposerModel(overrides: Record<string, unknown> = {}) {
  return {
    find: jest.fn().mockReturnValue(mockQuery([])),
    ...overrides,
  };
}

export function mockPublisherModel(overrides: Record<string, unknown> = {}) {
  return {
    find: jest.fn().mockReturnValue(mockQuery([])),
    ...overrides,
  };
}

export function mockTerritoryGroupModel(overrides: Record<string, unknown> = {}) {
  return {
    find: jest.fn().mockReturnValue(mockQuery([])),
    ...overrides,
  };
}

export function mockDeliveredWorkModel() {
  return {};
}
