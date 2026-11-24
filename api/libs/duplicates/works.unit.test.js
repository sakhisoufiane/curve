const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const Work = require('../../models/work');
const DuplicateWorks = require('./works');

describe('getDuplicateWorks', () => {
  let clientId;

  beforeEach(() => {
    clientId = randomId();
  });

  it('should return an empty array when no duplicate works are found', async () => {
    // Arrange
    jest.spyOn(Work, 'paginate').mockResolvedValue({
      docs: [],
      totalDocs: 0,
      page: 1,
      totalPages: 1,
    });
    // Act
    const result = await DuplicateWorks.getDuplicateWorks({ clientId, query: {} });
    // Assert
    expect(result).toEqual({
      duplicates: [],
      meta: {
        currentPage: 1,
        total: 0,
        totalPages: 0,
      },
    });
  });

  it('should return duplicates works with correct metadata', async () => {
    // Arrange
    const duplicateWorks = [
      {
        _id: randomId(),
        title: randomString(),
        composer: randomString(),
        foreignId: randomString(),
        clientId,
      },
      {
        _id: randomId(),
        title: randomString(),
        composer: randomString(),
        foreignId: randomString(),
        clientId,
      },
    ];
    jest.spyOn(Work, 'find').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(duplicateWorks),
      }),
    });

    const works = [
      {
        _id: randomId(),
        title: randomString(),
        composer: randomString(),
        foreignId: randomString(),
        clientId,
        potentialDuplicates: [{ workId: duplicateWorks[0]._id }],
        potentialDuplicatesCount: 1,
      },
      {
        _id: randomId(),
        title: randomString(),
        composer: randomString(),
        foreignId: randomString(),
        clientId,
        potentialDuplicates: [{ workId: duplicateWorks[1]._id }],
        potentialDuplicatesCount: 1,
      },
    ];
    jest.spyOn(Work, 'paginate').mockResolvedValue({
      docs: works,
      totalDocs: works.length,
      limit: 10,
      page: 1,
      totalPages: 1,
    });

    // Act
    const result = await DuplicateWorks.getDuplicateWorks({ clientId, query: {} });

    // Assert
    expect(result.meta).toEqual({
      total: 2,
      currentPage: 1,
      totalPages: 1,
    });
    expect(result.duplicates).toHaveLength(2);
    expect(result.duplicates).toEqual([
      {
        ...works[0],
        potentialDuplicates: [
          {
            workId: duplicateWorks[0]._id,
            title: duplicateWorks[0].title,
            composer: duplicateWorks[0].composer,
            foreignId: duplicateWorks[0].foreignId,
          },
        ],
      },
      {
        ...works[1],
        potentialDuplicates: [
          {
            workId: duplicateWorks[1]._id,
            title: duplicateWorks[1].title,
            composer: duplicateWorks[1].composer,
            foreignId: duplicateWorks[1].foreignId,
          },
        ],
      },
    ]);
  });

  it('should use the default search parameters when no query is provided', async () => {
    // Act
    await DuplicateWorks.getDuplicateWorks({ clientId });
    // Assert
    expect(Work.paginate).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId,
        potentialDuplicatesCount: { $exists: true, $gt: 0 },
      }),
      {
        lean: true,
        limit: 25,
        page: 1,
        select: '_id title composer foreignId clientId potentialDuplicates potentialDuplicatesCount',
        sort: { potentialDuplicatesCount: -1, title: 1 },
      },
    );
  });

  it('should apply a search filter when a search term is provided', async () => {
    // Arrange
    const duplicateWorks = [
      {
        _id: randomId(),
        title: 'test',
        composer: randomString(),
        foreignId: randomString(),
        clientId,
      },
    ];
    jest.spyOn(Work, 'find')
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(duplicateWorks),
        }),
      });

    const searchTerm = 'test';
    jest.spyOn(Work, 'paginate').mockResolvedValue({
      docs: [
        {
          _id: randomId(),
          title: 'test',
          composer: randomString(),
          foreignId: randomString(),
          potentialDuplicates: [{ workId: duplicateWorks[0]._id }],
          potentialDuplicatesCount: 1,
        },
      ],
      total: 1,
      limit: 10,
      page: 1,
      pages: 1,
    });

    // Act
    await DuplicateWorks.getDuplicateWorks({ clientId, query: { search: searchTerm } });

    // Assert
    expect(Work.paginate).toHaveBeenCalledWith(
      {
        $or: [
          { title: { $options: 'i', $regex: 'test' } },
          { foreignId: { $options: 'i', $regex: 'test' } },
          { composer: { $options: 'i', $regex: 'test' } },
        ],
        clientId,
        potentialDuplicatesCount: { $exists: true, $gt: 0 },
      },
      expect.objectContaining({
        lean: true,
        limit: 25,
        page: 1,
        select: '_id title composer foreignId clientId potentialDuplicates potentialDuplicatesCount',
        sort: { potentialDuplicatesCount: -1, title: 1 },
      }),
    );
  });
});

describe('getMergeOverview', () => {
  let clientId;

  const buildWork = () => new Work({
    title: randomString(),
    composer: randomString(),
    foreignId: randomString(),
  });

  beforeEach(() => {
    clientId = randomId();
  });

  it('should throw an error if no primary work id is provided', async () => {
    // Act & Assert
    await expect(DuplicateWorks.getMergeOverview({ clientId, primaryWorkId: null, duplicateWorks: [] }))
      .rejects.toThrow('No valid primary work id provided');
  });

  it('should throw an error if no duplicate works are specified', async () => {
    // Act & Assert
    await expect(DuplicateWorks.getMergeOverview({ clientId, primaryWorkId: randomId(), duplicateWorks: [] }))
      .rejects.toThrow('No duplicate works specified');
  });

  it('should throw an error if the primary work is not found', async () => {
    // Arrange
    const primaryWorkId = randomId();
    jest.spyOn(Work, 'findOne').mockResolvedValue(null);
    // Act & Assert
    await expect(DuplicateWorks.getMergeOverview({
      clientId,
      primaryWorkId,
      duplicateWorks: [{ id: randomId(), title: 'Test', composer: 'Test', foreignId: 'Test', selected: true }],
    })).rejects.toThrow('Primary work not found');
  });

  it('should throw an error if not all duplicate works are found', async () => {
    // Arrange
    const primaryWork = buildWork();
    const duplicateWorks = [buildWork(), buildWork()];
    const duplicateWorksRequest = duplicateWorks.map((work) => ({
      id: work._id.toString(),
      title: work.title,
      composer: work.composer,
      foreignId: work.foreignId,
      selected: true,
      isPrimary: work.isPrimary,
    }));
    jest.spyOn(Work, 'findOne').mockResolvedValue(primaryWork);
    // Only returning one of the duplicate Works
    jest.spyOn(Work, 'find').mockResolvedValue([duplicateWorks[0]]);

    // Act & Assert
    await expect(DuplicateWorks.getMergeOverview({
      clientId,
      primaryWorkId: primaryWork._id.toString(),
      duplicateWorks: duplicateWorksRequest,
    })).rejects.toThrow(`The following Work IDs do not exist: ${duplicateWorks[1]._id.toString()}`);
  });

  it('should return unique field values and works to be merged', async () => {
    // Arrange
    const primaryWork = buildWork();
    primaryWork.isPrimary = true;
    const duplicateWorks = [buildWork(), buildWork(), buildWork(), primaryWork];
    const duplicateWorksRequest = duplicateWorks.map((work) => ({
      id: work._id.toString(),
      title: work.title,
      composer: work.composer,
      foreignId: work.foreignId,
      selected: true,
      isPrimary: work.isPrimary,
    }));

    jest.spyOn(Work, 'findOne').mockResolvedValue(primaryWork);
    jest.spyOn(Work, 'find').mockResolvedValue(duplicateWorks);

    // Act
    const result = await DuplicateWorks.getMergeOverview({
      clientId,
      primaryWorkId: primaryWork._id.toString(),
      duplicateWorks: duplicateWorksRequest,
    });

    // Assert
    expect(result).toHaveProperty('options');
    expect(result).toHaveProperty('works');
    expect(result.options).toBeInstanceOf(Object);
    expect(result.works).toHaveLength(duplicateWorks.length);
    expect(result.works).toEqual(expect.arrayContaining(duplicateWorks.map((work) => work.toObject())));

    // Simple single text fields should contain all unique values from the selected works
    expect(result.options).toMatchObject({
      title: [primaryWork.title, duplicateWorks[0].title, duplicateWorks[1].title, duplicateWorks[2].title],
      composer: [primaryWork.composer, duplicateWorks[0].composer, duplicateWorks[1].composer, duplicateWorks[2].composer],
      foreignId: [primaryWork.foreignId, duplicateWorks[0].foreignId, duplicateWorks[1].foreignId, duplicateWorks[2].foreignId],
    });
  });

  it('should always return the primary work data first in the unique fields', async () => {
    // Arrange
    const primaryWork = buildWork();
    primaryWork.isPrimary = true;
    const duplicateWorks = [buildWork(), buildWork(), buildWork(), primaryWork];
    const duplicateWorksRequest = duplicateWorks.map((work) => ({
      id: work._id.toString(),
      title: work.title,
      composer: work.composer,
      foreignId: work.foreignId,
      selected: true,
      isPrimary: work.isPrimary,
    }));

    jest.spyOn(Work, 'findOne').mockResolvedValue(primaryWork);
    jest.spyOn(Work, 'find').mockResolvedValue(duplicateWorks);

    // Act
    const result = await DuplicateWorks.getMergeOverview({
      clientId,
      primaryWorkId: primaryWork._id.toString(),
      duplicateWorks: duplicateWorksRequest,
    });

    // Assert
    expect(result.options.title[0]).toBe(primaryWork.title);
    expect(result.options.composer[0]).toBe(primaryWork.composer);
    expect(result.options.foreignId[0]).toBe(primaryWork.foreignId);
  });

  it('should only include selected works in the unique fields', async () => {
    // Arrange
    const primaryWork = buildWork();
    primaryWork.isPrimary = true;
    const duplicateWorks = [
      buildWork(),
      buildWork(), // This one should be excluded
      buildWork(),
      primaryWork,
    ];
    const duplicateWorksRequest = duplicateWorks.map((work) => ({
      id: work._id.toString(),
      title: work.title,
      composer: work.composer,
      foreignId: work.foreignId,
      selected: true,
      isPrimary: work.isPrimary,
    }));
    duplicateWorksRequest[1].selected = false; // Exclude this work

    jest.spyOn(Work, 'findOne').mockResolvedValue(primaryWork);
    jest.spyOn(Work, 'find').mockResolvedValue(duplicateWorks);

    // Act
    const result = await DuplicateWorks.getMergeOverview({
      clientId,
      primaryWorkId: primaryWork._id.toString(),
      duplicateWorks: duplicateWorksRequest,
    });

    // Assert
    // Only the two selected works and the primary work
    expect(result.options).toMatchObject({
      title: [primaryWork.title, duplicateWorks[0].title, duplicateWorks[2].title],
      composer: [primaryWork.composer, duplicateWorks[0].composer, duplicateWorks[2].composer],
      foreignId: [primaryWork.foreignId, duplicateWorks[0].foreignId, duplicateWorks[2].foreignId],
    });
  });
});

describe('getUniqueFieldValues', () => {
  let primaryWork;

  beforeEach(() => {
    primaryWork = new Work({});
  });

  it('should return unique values for simple text fields', () => {
    const dupeWork = (value) => new Work({
      title: value,
      composer: value,
      foreignId: value,
      projectId: value,
      identifier: value,
      iswc: value,
      tunecode: value,
      copyrightDate: value,
      labelCopy: value,
    });

    // Arrange
    const works = [
      dupeWork('sameValue'),
      dupeWork('sameValue'),
      dupeWork('differentValue'),
      dupeWork('sameValue'),
    ];

    // Act
    const result = DuplicateWorks.getUniqueFieldValues(works, primaryWork);

    // Assert
    expect(result).toEqual({
      // Simple fields should return unique values
      title: ['sameValue', 'differentValue'],
      composer: ['sameValue', 'differentValue'],
      foreignId: ['sameValue', 'differentValue'],
      projectId: ['sameValue', 'differentValue'],
      identifier: ['sameValue', 'differentValue'],
      iswc: ['sameValue', 'differentValue'],
      tunecode: ['sameValue', 'differentValue'],
      labelCopy: ['sameValue', 'differentValue'],
      // Other fields should return empty arrays as they weren't defined
      aliases: [],
      catalogueGroups: [],
      channelSpecificSalesReturnsRights: [],
      copyrightDate: [],
      partnerRightsChains: [],
      performers: [],
      rightsChain: [],
      salesReturnsRights: [],
      societyIdentifiers: [],
      territories: [],
      trackIds: [],
      // Alternate titles is a complex field, so just check it's an array here
      alternateTitles: expect.any(Array),
    });
  });

  it('should return unique values for simple array fields', () => {
    // Arrange
    const works = [
      new Work({ catalogueGroups: ['1', '2'], performers: ['1'], trackIds: ['1', '2'], aliases: ['1'] }),
      new Work({ catalogueGroups: ['3', '4'], performers: ['2'], trackIds: ['1', '2'], aliases: ['1'] }),
      new Work({ catalogueGroups: ['1', '2'], performers: ['3'], trackIds: ['1', '2'], aliases: ['2'] }),
      new Work({ catalogueGroups: ['1', '2'], performers: ['4'], trackIds: ['1', '2'], aliases: ['3'] }),
    ];

    // Act
    const result = DuplicateWorks.getUniqueFieldValues(works, primaryWork);

    // Assert
    expect(result).toMatchObject({
      catalogueGroups: ['1', '2', '3', '4'],
      performers: [
        { value: '1' },
        { value: '2' },
        { value: '3' },
        { value: '4' },
      ],
      trackIds: [
        { value: '1' },
        { value: '2' },
      ],
      aliases: [
        { value: '1' },
        { value: '2' },
        { value: '3' },
      ],
    });
  });

  it('should return unique values for complex object array fields', () => {
    // Arrange
    const publisherId = randomId();
    const composerId = randomId();
    const deliveryPartnerId = randomId();
    const contractId = randomId();

    const works = [
      new Work({
        _id: randomId(),
        title: randomString(),
        alternateTitles: [
          { title: 'Title1', language: 'EN' },
          { title: 'Title2', language: 'FR' },
        ],
        territories: ['GB', 'FR'],
        rightsChain: [
          {
            territory: 'WW',
            children: [
              {
                type: 'Publisher',
                contractType: 'Original Publisher',
                publisherId,
                children: [
                  {
                    type: 'Composer',
                    contractType: 'Lyrics & Music',
                  },
                ],
              },
            ],
          },
        ],
        partnerRightsChains: [
          {
            deliveryPartnerId,
            rightsChain: [
              {
                territory: 'WW',
                children: [
                  {
                    type: 'Publisher',
                    contractType: 'Original Publisher',
                    publisherId,
                    children: [
                      {
                        type: 'Composer',
                        contractType: 'Lyrics & Music',
                        composerId,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        salesReturnsRights: [
          {
            contractId,
            percentage: 50,
          },
        ],
        channelSpecificSalesReturnsRights: [
          {
            contractId,
            percentage: 100,
            distributionChannel: 'Digital',
            source: 'Spotify',
            territory: 'WW',
          },
        ],
        societyIdentifiers: [
          {
            society: 'PRS',
            identifier: '123456789',
          },
        ],
      }),
      new Work({
        _id: randomId(),
        title: randomString(),
        alternateTitles: [
          { title: 'Title3', language: 'NL' },
        ],
        territories: ['NL'],
        rightsChain: [
          {
            territory: 'NL',
            children: [
              {
                type: 'Publisher',
                contractType: 'Original Publisher',
                publisherId,
                children: [
                  {
                    type: 'Composer',
                    contractType: 'Lyrics & Music',
                    composerId,
                  },
                ],
              },
            ],
          },
        ],
        partnerRightsChains: [],
        salesReturnsRights: [
          {
            contractId,
            percentage: 50,
          },
        ],
        channelSpecificSalesReturnsRights: [
          {
            contractId,
            percentage: 100,
            distributionChannel: 'Digital',
            source: 'Apple Music',
            territory: 'WW',
          },
        ],
        societyIdentifiers: [
          {
            society: 'BMI',
            identifier: '987654321',
          },
        ],
      }),
      new Work({
        _id: randomId(),
        title: randomString(),
        alternateTitles: [
          { title: 'Title1', language: 'EN' },
          { title: 'Title2', language: 'FR' },
        ],
        territories: ['GB', 'FR'],
        rightsChain: [
          {
            territory: 'WW',
            children: [
              {
                type: 'Publisher',
                contractType: 'Original Publisher',
                publisherId,
                children: [
                  {
                    type: 'Composer',
                    contractType: 'Lyrics & Music',
                  },
                ],
              },
            ],
          },
        ],
        partnerRightsChains: [
          {
            deliveryPartnerId,
            rightsChain: [
              {
                territory: 'WW',
                children: [
                  {
                    type: 'Publisher',
                    contractType: 'Original Publisher',
                    publisherId,
                    children: [
                      {
                        type: 'Composer',
                        contractType: 'Lyrics & Music',
                        composerId,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        salesReturnsRights: [
          {
            contractId,
            percentage: 25,
          },
        ],
        channelSpecificSalesReturnsRights: [
          {
            contractId,
            percentage: 100,
            distributionChannel: 'Digital',
            source: 'Spotify',
            territory: 'WW',
          },
        ],
        societyIdentifiers: [
          {
            society: 'PRS',
            identifier: '123456789',
          },
        ],
      }),
    ];

    // Act
    const result = DuplicateWorks.getUniqueFieldValues(works, primaryWork);

    // Assert
    expect(result).toMatchObject({
      alternateTitles: [
        {
          title: works[0].alternateTitles[0].title,
          language: works[0].alternateTitles[0].language,
          workId: works[0]._id.toString(),
          workTitle: works[0].title,
          fromDuplicateTitle: false,
        },
        {
          title: works[0].alternateTitles[1].title,
          language: works[0].alternateTitles[1].language,
          workId: works[0]._id.toString(),
          workTitle: works[0].title,
          fromDuplicateTitle: false,
        },
        // Added as it's a title from a duplicate Work
        {
          title: works[0].title,
          language: '',
          workId: works[0]._id.toString(),
          workTitle: works[0].title,
          fromDuplicateTitle: true,
        },
        {
          title: works[1].alternateTitles[0].title,
          language: works[1].alternateTitles[0].language,
          workId: works[1]._id.toString(),
          workTitle: works[1].title,
          fromDuplicateTitle: false,
        },
        // Added as it's a title from a duplicate Work
        {
          title: works[1].title,
          language: '',
          workId: works[1]._id.toString(),
          workTitle: works[1].title,
          fromDuplicateTitle: true,
        },
        // Added as it's a title from a duplicate Work
        {
          title: works[2].title,
          language: '',
          workId: works[2]._id.toString(),
          workTitle: works[2].title,
          fromDuplicateTitle: true,
        },
      ],
      territories: [
        {
          workId: works[0]._id.toString(),
          workTitle: works[0].title,
          value: ['GB', 'FR'],
        },
        {
          workId: works[1]._id.toString(),
          workTitle: works[1].title,
          value: ['NL'],
        },
      ],
      rightsChain: [
        {
          workId: works[0]._id.toString(),
          workTitle: works[0].title,
          value: works[0].rightsChain,
        },
        {
          workId: works[1]._id.toString(),
          workTitle: works[1].title,
          value: works[1].rightsChain,
        },
      ],
      partnerRightsChains: [
        {
          workId: works[0]._id.toString(),
          workTitle: works[0].title,
          value: works[0].partnerRightsChains,
        },
      ],
      salesReturnsRights: [
        {
          workId: works[0]._id.toString(),
          workTitle: works[0].title,
          contractId: works[0].salesReturnsRights[0].contractId,
          percentage: works[0].salesReturnsRights[0].percentage,
        },
        {
          workId: works[2]._id.toString(),
          workTitle: works[2].title,
          contractId: works[2].salesReturnsRights[0].contractId,
          percentage: works[2].salesReturnsRights[0].percentage,
        },
      ],
      channelSpecificSalesReturnsRights: [
        {
          workId: works[0]._id.toString(),
          workTitle: works[0].title,
          contractId: works[0].channelSpecificSalesReturnsRights[0].contractId,
          percentage: works[0].channelSpecificSalesReturnsRights[0].percentage,
          distributionChannel: works[0].channelSpecificSalesReturnsRights[0].distributionChannel,
          source: works[0].channelSpecificSalesReturnsRights[0].source,
          territory: works[0].channelSpecificSalesReturnsRights[0].territory,
        },
        {
          workId: works[1]._id.toString(),
          workTitle: works[1].title,
          contractId: works[1].channelSpecificSalesReturnsRights[0].contractId,
          percentage: works[1].channelSpecificSalesReturnsRights[0].percentage,
          distributionChannel: works[1].channelSpecificSalesReturnsRights[0].distributionChannel,
          source: works[1].channelSpecificSalesReturnsRights[0].source,
          territory: works[1].channelSpecificSalesReturnsRights[0].territory,
        },
      ],
      societyIdentifiers: [
        {
          society: works[0].societyIdentifiers[0].society,
          identifier: works[0].societyIdentifiers[0].identifier,
          workId: works[0]._id.toString(),
          workTitle: works[0].title,
        },
        {
          society: works[1].societyIdentifiers[0].society,
          identifier: works[1].societyIdentifiers[0].identifier,
          workId: works[1]._id.toString(),
          workTitle: works[1].title,
        },
      ],
    });
  });

  it('should not add other Work titles to alternateTitles when they are identical', () => {
    const works = [
      new Work({
        _id: randomId(),
        title: randomString(),
        alternateTitles: [],
        territories: [],
        rightsChain: [],
        partnerRightsChains: [],
        salesReturnsRights: [],
        channelSpecificSalesReturnsRights: [],
        societyIdentifiers: [],
      }),
    ];
    primaryWork.title = works[0].title;

    // Act
    const result = DuplicateWorks.getUniqueFieldValues(works, primaryWork);

    // Assert
    expect(result.alternateTitles).toEqual([]);
  });
});
