const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const SalesFile = require('../../models/salesFile');
const UnmappedWork = require('../../models/unmappedWork');
const UnmappedTrack = require('../../models/unmappedTrack');
const UnmappedRelease = require('../../models/unmappedRelease');
const UnmappedPublisher = require('../../models/unmappedPublisher');
const SalesFileController = require('./salesFile');

let clientId;

function mockCatalogueModel(Model, docs = []) {
  jest.spyOn(Model, 'countDocuments').mockResolvedValue(docs.length);
  jest.spyOn(Model, 'find').mockReturnValue({
    sort: jest.fn().mockReturnValue({
      limit: jest.fn().mockResolvedValue(docs),
    }),
  });
}

beforeEach(() => {
  clientId = randomId();
  jest.spyOn(SalesFile, 'find')
    .mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getFilterOptions', () => {
  it('should return empty array if no target periods found', async () => {
    const targetPeriods = await SalesFileController.getFilterOptions({ clientId });
    expect(targetPeriods).toEqual({ foreignIds: [], targetPeriods: [] });
  });

  it('should return target periods array', async () => {
    const targetPeriodsList = [{ targetPeriod: randomString() }, { targetPeriod: randomString() }];
    jest.spyOn(SalesFile, 'find')
      .mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(targetPeriodsList),
        }),
      });
    const targetPeriods = await SalesFileController.getFilterOptions({ clientId });
    expect(targetPeriods).toEqual({ foreignIds: [], targetPeriods: targetPeriodsList.map((tp) => tp.targetPeriod) });
  });

  it('should return unique target periods array', async () => {
    const targetPeriod = randomString();
    jest.spyOn(SalesFile, 'find')
      .mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ targetPeriod }, { targetPeriod }]),
        }),
      });
    const targetPeriods = await SalesFileController.getFilterOptions({ clientId });
    expect(targetPeriods).toEqual({ foreignIds: [], targetPeriods: [targetPeriod] });
  });
});

describe('getSalesFile', () => {
  it('should load unmapped publishers into invalidFields', async () => {
    const salesFile = {
      _id: randomId(),
      status: 'Complete',
      viewed: true,
      lastIngested: {},
      lastRevalidated: {},
      invalidFields: {},
      duplicateSalesFileId: 'No ID Found',
    };
    jest.spyOn(SalesFile, 'findById').mockResolvedValue(salesFile);
    mockCatalogueModel(UnmappedWork);
    mockCatalogueModel(UnmappedTrack);
    mockCatalogueModel(UnmappedRelease);
    mockCatalogueModel(UnmappedPublisher);

    const result = await SalesFileController.getSalesFile({ params: { id: salesFile._id }, curveUser: { clientId } });

    expect(result.invalidFields.publishers).toEqual([]);
  });
});
