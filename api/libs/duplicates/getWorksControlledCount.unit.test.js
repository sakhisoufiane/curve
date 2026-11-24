const getWorksControlledCount = require('./getWorksControlledCount');
const Work = require('../../models/work');

jest.mock('../../models/work');

describe('getWorksControlledCount', () => {
  const complexWorkRightsChain = [
    {
      _id: 'work1',
      rightsChain: [
        {
          type: 'publisher',
          publisherId: 'pubRoot',
          controlled: false,
          children: [
            {
              type: 'publisher',
              publisherId: 'pubChild1',
              controlled: false,
              children: [
                { type: 'composer', composerId: 'comp1', controlled: true, children: [] },
                { type: 'composer', composerId: 'comp1', controlled: false, children: [] },
              ],
            },
            {
              type: 'publisher',
              publisherId: 'pubChild2',
              controlled: true,
              children: [
                { type: 'composer', composerId: 'comp2', controlled: true, children: [] },
                { type: 'composer', composerId: 'comp2', controlled: false, children: [] },
              ],
            },
          ],
        },
      ],
    },
    {
      _id: 'work2',
      rightsChain: [
        {
          type: 'publisher',
          publisherId: 'pubRoot2',
          controlled: true,
          children: [
            {
              type: 'publisher',
              publisherId: 'pubChild3',
              controlled: true,
              children: [
                { type: 'composer', composerId: 'comp1', controlled: false, children: [] },
                { type: 'composer', composerId: 'comp3', controlled: true, children: [] },
              ],
            },
            {
              type: 'publisher',
              publisherId: 'pubChild4',
              controlled: false,
              children: [
                { type: 'composer', composerId: 'comp2', controlled: true, children: [] },
                { type: 'composer', composerId: 'comp3', controlled: false, children: [] },
              ],
            },
          ],
        },
      ],
    },
  ];
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should return an empty object when no works are found', async () => {
    Work.find.mockReturnValue({
      lean: () => Promise.resolve([]),
    });

    const catalogue = [{ _id: '1' }];
    const clientId = 'client1';

    const result = await getWorksControlledCount('composer', clientId, catalogue);

    expect(result).toEqual({});
    expect(Work.find).toHaveBeenCalledWith(
      { clientId, usedComposerIds: { $in: ['1'] } },
      { _id: 1, usedComposerIds: 1, rightsChain: 1 },
    );
  });

  it('should correctly count controlled and uncontrolled composer nodes', async () => {
    const catalogue = [{ _id: '123' }, { _id: '456' }];
    const clientId = 'client2';
    const works = [
      {
        _id: 'work1',
        rightsChain: [
          { type: 'composer', composerId: '123', controlled: true, children: [] },
          { type: 'composer', composerId: '123', controlled: false, children: [] },
          { type: 'composer', composerId: '789', controlled: true, children: [] },
        ],
      },
    ];

    Work.find.mockReturnValue({
      lean: () => Promise.resolve(works),
    });

    const result = await getWorksControlledCount('composer', clientId, catalogue);

    expect(result).toEqual({
      123: {
        controlled: 1,
        unControlled: 1,
      },
    });
    expect(Work.find).toHaveBeenCalledWith(
      { clientId, usedComposerIds: { $in: ['123', '456'] } },
      { _id: 1, usedComposerIds: 1, rightsChain: 1 },
    );
  });

  it('should correctly count publisher nodes recursively', async () => {
    const catalogue = [{ _id: 'abc' }];
    const clientId = 'client3';

    const works = [
      {
        _id: 'work2',
        rightsChain: [
          {
            type: 'publisher',
            publisherId: 'abc',
            controlled: false,
            children: [
              { type: 'publisher', publisherId: 'abc', controlled: true, children: [] },
              { type: 'publisher', publisherId: 'abc', controlled: false, children: [] },
            ],
          },
          {
            type: 'publisher',
            publisherId: 'def',
            controlled: true,
            children: [],
          },
        ],
      },
    ];

    Work.find.mockReturnValue({
      lean: () => Promise.resolve(works),
    });

    const result = await getWorksControlledCount('publisher', clientId, catalogue);
    expect(result).toEqual({
      abc: {
        controlled: 1,
        unControlled: 2,
      },
    });
    expect(Work.find).toHaveBeenCalledWith(
      { clientId, usedPublisherIds: { $in: ['abc'] } },
      { _id: 1, usedPublisherIds: 1, rightsChain: 1 },
    );
  });

  it('should handle works without a rightsChain gracefully', async () => {
    const catalogue = [{ _id: '001' }];
    const clientId = 'client4';

    const works = [
      { _id: 'work3' },
      { _id: 'work4', rightsChain: [] },
    ];

    Work.find.mockReturnValue({
      lean: () => Promise.resolve(works),
    });

    const result = await getWorksControlledCount('composer', clientId, catalogue);

    expect(result).toEqual({});
    expect(Work.find).toHaveBeenCalledWith(
      { clientId, usedComposerIds: { $in: ['001'] } },
      { _id: 1, usedComposerIds: 1, rightsChain: 1 },
    );
  });

  it('should aggregate composer counts from multiple works where each work has a publisher root with 2 publisher children each containing 2 composer nodes', async () => {
    const catalogue = [{ _id: 'comp1' }, { _id: 'comp2' }, { _id: 'comp3' }];
    const clientId = 'clientMixed';

    Work.find.mockReturnValue({
      lean: () => Promise.resolve(complexWorkRightsChain),
    });

    const result = await getWorksControlledCount('composer', clientId, catalogue);

    expect(result).toEqual({
      comp1: { controlled: 1, unControlled: 2 },
      comp2: { controlled: 2, unControlled: 1 },
      comp3: { controlled: 1, unControlled: 1 },
    });

    expect(Work.find).toHaveBeenCalledWith(
      { clientId, usedComposerIds: { $in: ['comp1', 'comp2', 'comp3'] } },
      { _id: 1, usedComposerIds: 1, rightsChain: 1 },
    );
  });

  it('should aggregate publisher counts correctly when rightsChain has a publisher root with 2 publisher children each containing composer nodes (which are ignored)', async () => {
    const catalogue = [
      { _id: 'pubRoot' },
      { _id: 'pubChild1' },
      { _id: 'pubChild2' },
      { _id: 'pubRoot2' },
      { _id: 'pubChild3' },
      { _id: 'pubChild4' },
    ];
    const clientId = 'clientMixed';

    Work.find.mockReturnValue({
      lean: () => Promise.resolve(complexWorkRightsChain),
    });

    const result = await getWorksControlledCount('publisher', clientId, catalogue);

    expect(result).toEqual({
      pubRoot: { controlled: 0, unControlled: 1 },
      pubChild1: { controlled: 0, unControlled: 1 },
      pubChild2: { controlled: 1, unControlled: 0 },
      pubRoot2: { controlled: 1, unControlled: 0 },
      pubChild3: { controlled: 1, unControlled: 0 },
      pubChild4: { controlled: 0, unControlled: 1 },
    });

    expect(Work.find).toHaveBeenCalledWith(
      { clientId, usedPublisherIds: { $in: ['pubRoot', 'pubChild1', 'pubChild2', 'pubRoot2', 'pubChild3', 'pubChild4'] } },
      { _id: 1, usedPublisherIds: 1, rightsChain: 1 },
    );
  });
});
