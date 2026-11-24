import { testUtils } from '@curveroyaltysystems/platform-shared-utils';

export const { randomId, randomString } = testUtils;

// ---------------------------------------------------------------------------
// Type cast helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const asWork = (w: Record<string, unknown>) => w as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const asPublisher = (p: Record<string, unknown>) => p as any;

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

export function makeSourceWork(overrides: Record<string, unknown> = {}) {
  return {
    _id: randomId(),
    clientId: randomId(),
    title: randomString(),
    aliases: [] as string[],
    societyIdentifiers: [] as { society: string; identifier: string }[],
    trackIds: [] as string[],
    rightsChain: undefined as unknown,
    catalogueGroups: [] as string[],
    validationErrors: [] as string[],
    ...overrides,
  };
}

export function makeChildWorkInstance(overrides: Record<string, unknown> = {}) {
  return {
    _id: randomId(),
    clientId: '' as unknown,
    title: '',
    aliases: [] as string[],
    societyIdentifiers: [] as { society: string; identifier: string }[],
    trackIds: [] as string[],
    rightsChain: undefined as unknown,
    duplicatedFrom: undefined as unknown,
    validationErrors: [] as string[],
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function makeClient(inheritCatalogueFrom: Record<string, unknown>[] = []) {
  return { _id: randomId(), name: randomString(), inheritCatalogueFrom };
}

export function makePublisher(overrides: Record<string, unknown> = {}) {
  return {
    _id: randomId(),
    name: randomString(),
    cae: undefined as string | undefined,
    mainPro: undefined,
    mechanicalPro: undefined,
    performancePro: undefined,
    syncPro: undefined,
    mainProIdentifier: undefined,
    mechanicalProIdentifier: undefined,
    performanceProIdentifier: undefined,
    syncProIdentifier: undefined,
    controlled: false,
    notes: undefined,
    ...overrides,
  };
}

export function makeComposer(overrides: Record<string, unknown> = {}) {
  return {
    _id: randomId(),
    name: randomString(),
    cae: undefined as string | undefined,
    caeWithoutLeadingZeros: undefined as string | undefined,
    mainPro: undefined,
    mechanicalPro: undefined,
    performancePro: undefined,
    syncPro: undefined,
    mainProIdentifier: undefined,
    mechanicalProIdentifier: undefined,
    performanceProIdentifier: undefined,
    syncProIdentifier: undefined,
    controlled: false,
    notes: undefined,
    ...overrides,
  };
}

export function makeTerritoryGroup(overrides: Record<string, unknown> = {}) {
  return { _id: randomId(), name: randomString(), territories: ['GB', 'IE'], clientId: randomId(), ...overrides };
}

// ---------------------------------------------------------------------------
// Model mock factories
// ---------------------------------------------------------------------------

export function makeWorkModel(childInstance = makeChildWorkInstance()): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Work: any;
  childInstance: ReturnType<typeof makeChildWorkInstance>;
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Work: any = jest.fn().mockImplementation(() => childInstance);
  Work.findOne = jest.fn().mockResolvedValue(null);
  Work.updateOne = jest.fn().mockResolvedValue(undefined);
  return { Work, childInstance };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function makeClientModel(parent: Record<string, unknown> | null, children: Record<string, unknown>[]): any {
  return {
    findById: jest.fn().mockResolvedValue(parent),
    find: jest.fn().mockResolvedValue(children),
  };
}

export function makeTrackModel(
  sourceTracks: Record<string, unknown>[] = [],
  existingChildTrack: Record<string, unknown> | null = null
) {
  const newTrackId = randomId();
  const newTrackInstance = {
    _id: newTrackId,
    save: jest.fn().mockResolvedValue({ _id: newTrackId }),
    copyValues: jest.fn().mockImplementation((_t: unknown, _c: unknown, cb: () => void) => cb()),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Track: any = jest.fn().mockImplementation(() => newTrackInstance);
  Track.find = jest.fn().mockResolvedValue(sourceTracks);
  Track.findOne = jest.fn().mockResolvedValue(existingChildTrack);
  return { Track, newTrackInstance };
}

export function makePublisherModel() {
  const newPublisherId = randomId();
  const newInstance = { _id: newPublisherId, save: jest.fn().mockResolvedValue({ _id: newPublisherId }) };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Publisher: any = jest.fn().mockImplementation(() => newInstance);
  Publisher.findOne = jest.fn().mockResolvedValue(null);
  Publisher.findById = jest.fn().mockResolvedValue(null);
  return { Publisher, newInstance };
}

export function makeComposerModel() {
  const newComposerId = randomId();
  const newInstance = { _id: newComposerId, save: jest.fn().mockResolvedValue({ _id: newComposerId }) };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Composer: any = jest.fn().mockImplementation(() => newInstance);
  Composer.findOne = jest.fn().mockResolvedValue(null);
  Composer.findById = jest.fn().mockResolvedValue(null);
  return { Composer, newInstance };
}

export function makeTerritoryGroupModel() {
  const newGroupId = randomId();
  const newInstance = { _id: newGroupId, save: jest.fn().mockResolvedValue({ _id: newGroupId }) };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TerritoryGroup: any = jest.fn().mockImplementation(() => newInstance);
  TerritoryGroup.findOne = jest.fn().mockResolvedValue(null);
  TerritoryGroup.findById = jest.fn().mockResolvedValue(null);
  return { TerritoryGroup, newInstance };
}

// ---------------------------------------------------------------------------
// Partial model sets
// ---------------------------------------------------------------------------

export function makeDefaultModels() {
  return {
    Track: makeTrackModel().Track,
    Composer: makeComposerModel().Composer,
    Publisher: makePublisherModel().Publisher,
    TerritoryGroup: makeTerritoryGroupModel().TerritoryGroup,
  };
}

export function makeComposerPublisherTerritoryModels() {
  return {
    Composer: makeComposerModel().Composer,
    Publisher: makePublisherModel().Publisher,
    TerritoryGroup: makeTerritoryGroupModel().TerritoryGroup,
  };
}

export function makeTrackComposerTerritoryModels() {
  return {
    Track: makeTrackModel().Track,
    Composer: makeComposerModel().Composer,
    TerritoryGroup: makeTerritoryGroupModel().TerritoryGroup,
  };
}

export function makeTrackPublisherTerritoryModels() {
  return {
    Track: makeTrackModel().Track,
    Publisher: makePublisherModel().Publisher,
    TerritoryGroup: makeTerritoryGroupModel().TerritoryGroup,
  };
}

export function makeSourcePublisher(overrides: Record<string, unknown> = {}) {
  return {
    _id: randomId(),
    clientId: randomId(),
    name: randomString(),
    cae: undefined as string | undefined,
    mainPro: undefined,
    mechanicalPro: undefined,
    performancePro: undefined,
    syncPro: undefined,
    mainProIdentifier: undefined,
    mechanicalProIdentifier: undefined,
    performanceProIdentifier: undefined,
    syncProIdentifier: undefined,
    controlled: false,
    notes: undefined as string | undefined,
    aliases: [] as string[],
    catalogueGroups: [] as string[],
    ...overrides,
  };
}

export function makeChildPublisherInstance(overrides: Record<string, unknown> = {}) {
  return {
    _id: randomId(),
    clientId: '' as unknown,
    name: '',
    cae: undefined as string | undefined,
    mainPro: undefined,
    mechanicalPro: undefined,
    performancePro: undefined,
    syncPro: undefined,
    mainProIdentifier: undefined,
    mechanicalProIdentifier: undefined,
    performanceProIdentifier: undefined,
    syncProIdentifier: undefined,
    controlled: false,
    notes: undefined as string | undefined,
    aliases: [] as string[],
    duplicatedFrom: undefined as unknown,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function makePublisherModelForPropagation(childInstance = makeChildPublisherInstance()): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Publisher: any;
  childInstance: ReturnType<typeof makeChildPublisherInstance>;
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Publisher: any = jest.fn().mockImplementation(() => childInstance);
  Publisher.findOne = jest.fn().mockResolvedValue(null);
  return { Publisher, childInstance };
}

export function makeBasicPublisherScenario(publisherOverrides: Record<string, unknown> = {}) {
  const parent = makeClient();
  const child = makeClient([{ clientId: parent._id.toString(), transferPublishers: true }]);
  const publisher = makeSourcePublisher({ clientId: parent._id, ...publisherOverrides });
  const childInstance = makeChildPublisherInstance();
  const { Publisher } = makePublisherModelForPropagation(childInstance);
  const Client = makeClientModel(parent, [child]);
  return { parent, child, publisher, childInstance, Publisher, Client };
}

export function makeSourceComposer(overrides: Record<string, unknown> = {}) {
  return {
    _id: randomId(),
    clientId: randomId(),
    name: randomString(),
    cae: undefined as string | undefined,
    mainPro: undefined,
    mechanicalPro: undefined,
    performancePro: undefined,
    syncPro: undefined,
    mainProIdentifier: undefined,
    mechanicalProIdentifier: undefined,
    performanceProIdentifier: undefined,
    syncProIdentifier: undefined,
    controlled: false,
    notes: undefined as string | undefined,
    firstName: undefined as string | undefined,
    middleNames: undefined as string | undefined,
    surname: undefined as string | undefined,
    catalogueGroups: [] as string[],
    ...overrides,
  };
}

export function makeChildComposerInstance(overrides: Record<string, unknown> = {}) {
  return {
    _id: randomId(),
    clientId: '' as unknown,
    name: '',
    cae: undefined as string | undefined,
    mainPro: undefined,
    mechanicalPro: undefined,
    performancePro: undefined,
    syncPro: undefined,
    mainProIdentifier: undefined,
    mechanicalProIdentifier: undefined,
    performanceProIdentifier: undefined,
    syncProIdentifier: undefined,
    controlled: false,
    notes: undefined as string | undefined,
    firstName: undefined as string | undefined,
    middleNames: undefined as string | undefined,
    surname: undefined as string | undefined,
    duplicatedFrom: undefined as unknown,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function makeComposerModelForPropagation(childInstance = makeChildComposerInstance()): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Composer: any;
  childInstance: ReturnType<typeof makeChildComposerInstance>;
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Composer: any = jest.fn().mockImplementation(() => childInstance);
  Composer.findOne = jest.fn().mockResolvedValue(null);
  return { Composer, childInstance };
}

export function makeBasicComposerScenario(composerOverrides: Record<string, unknown> = {}) {
  const parent = makeClient();
  const child = makeClient([{ clientId: parent._id.toString(), transferComposers: true }]);
  const composer = makeSourceComposer({ clientId: parent._id, ...composerOverrides });
  const childInstance = makeChildComposerInstance();
  const { Composer } = makeComposerModelForPropagation(childInstance);
  const Client = makeClientModel(parent, [child]);
  return { parent, child, composer, childInstance, Composer, Client };
}

// ---------------------------------------------------------------------------
// Rights chain builders
// ---------------------------------------------------------------------------

export function buildChainWithPublisher(publisherId: string) {
  return [{ territory: 'WW', children: [{ type: 'Publisher', publisherId, controlled: true, children: [] }] }];
}

export function buildChainWithComposer(composerId: string) {
  return [{ territory: 'WW', children: [{ type: 'Composer', composerId, controlled: true, children: [] }] }];
}

export function buildChainWithTerritoryGroup(territory: string, publisherId: string) {
  return [{ territory, children: [{ type: 'Publisher', publisherId, controlled: true, children: [] }] }];
}

// ---------------------------------------------------------------------------
// Shared scenario — one parent client, one child that inherits everything
// ---------------------------------------------------------------------------

export function makeBasicScenario(workOverrides: Record<string, unknown> = {}) {
  const parent = makeClient();
  const child = makeClient([{ clientId: parent._id.toString(), transferWorks: true }]);
  const work = makeSourceWork({ clientId: parent._id, ...workOverrides });
  const childInstance = makeChildWorkInstance();
  const { Work } = makeWorkModel(childInstance);
  const Client = makeClientModel(parent, [child]);
  return { parent, child, work, childInstance, Work, Client };
}
