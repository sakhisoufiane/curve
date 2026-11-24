const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const getDuplicates = require('./getDuplicates');

jest.mock('../../models/composer');
jest.mock('../../models/publisher');
jest.mock('../../models/work');

const Composer = require('../../models/composer');
const Publisher = require('../../models/publisher');
const Work = require('../../models/work');

describe('getDuplicates', () => {
  const clientId = 'client123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use Composer model when type is composer', async () => {
    Composer.paginate.mockResolvedValue({
      totalDocs: 0,
      page: 1,
      pages: 0,
      docs: [],
    });

    const result = await getDuplicates('composer', clientId, {});

    expect(Composer.paginate).toHaveBeenCalled();
    expect(result).toEqual({
      meta: { total: 0, currentPage: 1, totalPages: 0 },
      duplicates: [],
    });
  });

  it('should use Publisher model when type is publisher', async () => {
    Publisher.paginate.mockResolvedValue({
      total: 0,
      page: 1,
      pages: 0,
      docs: [],
    });

    const result = await getDuplicates('publisher', clientId, {});

    expect(Publisher.paginate).toHaveBeenCalled();
    expect(result).toEqual({
      meta: { total: 0, currentPage: 1, totalPages: 0 },
      duplicates: [],
    });
  });

  it('should process potential duplicates and include works count', async () => {
    const duplicateId1 = randomId();
    const duplicateId2 = randomId();

    const mockCatalogueData = {
      totalDocs: 1,
      page: 1,
      pages: 1,
      docs: [
        {
          _id: 'abc123',
          name: 'Original Composer',
          cae: '123',
          clientId,
          potentialDuplicatesCount: 1,
          potentialDuplicates: [
            { composerId: duplicateId1 },
            { composerId: duplicateId2 },
          ],
        },
      ],
    };

    const mockDuplicateComposers = [
      { _id: duplicateId1, name: randomString(), cae: randomString(), mainPro: randomString(), mainProIdentifier: randomString() },
      { _id: duplicateId2, name: randomString(), cae: randomString(), mainPro: randomString(), mainProIdentifier: randomString() },
    ];

    const mockWorks = [
      { _id: randomId(), usedComposerIds: [duplicateId1] },
      { _id: randomId(), usedComposerIds: [duplicateId1, duplicateId2] },
      { _id: randomId(), usedComposerIds: [duplicateId2] },
    ];

    Composer.paginate.mockResolvedValue(mockCatalogueData);
    Composer.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockDuplicateComposers),
      }),
    });
    Work.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockWorks),
      }),
    });

    const result = await getDuplicates('composer', clientId, {});

    expect(result.meta.total).toBe(1);
    expect(result.duplicates.length).toBe(1);
    expect(result.duplicates[0].potentialDuplicates).toEqual([
      {
        composerId: duplicateId1,
        name: mockDuplicateComposers[0].name,
        cae: mockDuplicateComposers[0].cae,
        worksCount: 2,
        mainPro: mockDuplicateComposers[0].mainPro,
        mainProIdentifier: mockDuplicateComposers[0].mainProIdentifier,
      },
      {
        composerId: duplicateId2,
        name: mockDuplicateComposers[1].name,
        cae: mockDuplicateComposers[1].cae,
        worksCount: 2,
        mainPro: mockDuplicateComposers[1].mainPro,
        mainProIdentifier: mockDuplicateComposers[1].mainProIdentifier,
      },
    ]);
  });

  it('should sort potentialDuplicates by score descending', async () => {
    const mockCatalogueData = {
      totalDocs: 1,
      page: 1,
      pages: 1,
      docs: [
        {
          _id: 'abc123',
          name: 'Test Composer',
          cae: '123',
          clientId,
          potentialDuplicatesCount: 1,
          potentialDuplicates: [
            { composerId: 'compB', score: 50 },
            { composerId: 'compA', score: 95 },
          ],
        },
      ],
    };

    const mockDuplicateComposers = [
      { _id: 'compA', name: 'Composer A', cae: 'A001' },
      { _id: 'compB', name: 'Composer B', cae: 'B001' },
    ];

    const mockWorks = [];

    Composer.paginate.mockResolvedValue(mockCatalogueData);
    Composer.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockDuplicateComposers),
      }),
    });

    Work.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockWorks),
      }),
    });

    const result = await getDuplicates('composer', clientId, {});

    const scores = result.duplicates[0].potentialDuplicates.map((d) => d.score);
    expect(scores).toEqual([95, 50]);
  });

  it('should set correct filters and fields for type: composer', async () => {
    Composer.paginate.mockResolvedValue({
      totalDocs: 0,
      page: 1,
      pages: 0,
      docs: [],
    });

    await getDuplicates('composer', clientId, {
      page: 2,
      limit: 10,
      orderBy: 'name',
      orderDir: 'asc',
    });

    expect(Composer.paginate).toHaveBeenCalledWith(
      {
        clientId,
        potentialDuplicatesCount: { $exists: true, $gt: 0 },
      },
      {
        page: 2,
        limit: 10,
        lean: true,
        sort: { name: 1 },
        select: '_id name cae clientId potentialDuplicates potentialDuplicatesCount mainPro mainProIdentifier',
      },
    );
  });

  it('should use correct dynamic field (usedComposerIds) in Work.find for composer', async () => {
    Composer.paginate.mockResolvedValue({
      totalDocs: 1,
      page: 1,
      pages: 1,
      docs: [
        {
          _id: 'composer-1',
          name: 'Composer 1',
          cae: '123',
          clientId,
          potentialDuplicatesCount: 1,
          potentialDuplicates: [{ composerId: 'dup-1', score: 80 }],
        },
      ],
    });

    Composer.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: 'dup-1', name: 'Duplicate', cae: '456' }]),
      }),
    });

    Work.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });

    await getDuplicates('composer', clientId, {});

    expect(Work.find).toHaveBeenCalledWith({
      clientId,
      usedComposerIds: { $in: ['dup-1'] },
    });
  });

  it('should set correct filters and fields for type: publisher', async () => {
    Publisher.paginate.mockResolvedValue({
      totalDocs: 0,
      page: 1,
      pages: 0,
      docs: [],
    });

    await getDuplicates('publisher', clientId, {
      page: 3,
      limit: 25,
      orderBy: 'potentialDuplicatesCount',
      orderDir: 'desc',
    });

    expect(Publisher.paginate).toHaveBeenCalledWith(
      {
        clientId,
        potentialDuplicatesCount: { $exists: true, $gt: 0 },
      },
      {
        page: 3,
        limit: 25,
        lean: true,
        sort: { potentialDuplicatesCount: -1, name: 1 },
        select: '_id name cae clientId potentialDuplicates potentialDuplicatesCount mainPro mainProIdentifier',
      },
    );
  });

  it('should use correct dynamic field (usedPublisherIds) in Work.find for publisher', async () => {
    Publisher.paginate.mockResolvedValue({
      totalDocs: 1,
      page: 1,
      pages: 1,
      docs: [
        {
          _id: 'pub-1',
          name: 'Publisher 1',
          cae: '789',
          clientId,
          potentialDuplicatesCount: 1,
          potentialDuplicates: [{ publisherId: 'dup-pub-1', score: 70 }],
        },
      ],
    });

    Publisher.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: 'dup-pub-1', name: 'Pub Dup', cae: '999' }]),
      }),
    });

    Work.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });

    await getDuplicates('publisher', clientId, {});

    expect(Work.find).toHaveBeenCalledWith({
      clientId,
      usedPublisherIds: { $in: ['dup-pub-1'] },
    });
  });
});
