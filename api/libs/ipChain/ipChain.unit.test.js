const IpChainUtils = require('./ipChain');

describe('#combineDuplicatePublishers', () => {
  it('should not modify the chain at all if no duplicate publishers', (done) => {
    const chain = [
      {
        name: 'pub1',
        type: 'Publisher',
        children: [{ name: 'comp1', type: 'Composer', children: [] }],
        mechanicalOwnership: 50,
        mechanicalCollection: 50,
        performanceOwnership: 50,
        performanceCollection: 50,
      },
      {
        name: 'pub2',
        type: 'Publisher',
        children: [{ name: 'comp2', type: 'Composer', children: [] }],
        mechanicalOwnership: 50,
        mechanicalCollection: 50,
        performanceOwnership: 50,
        performanceCollection: 50,
      },
    ];
    const combined = IpChainUtils.combineDuplicatePublishers(chain);
    expect(combined).toEqual(chain);
    done();
  });

  it('should combine duplicate publishers and merge their children', (done) => {
    const chain = [
      {
        name: 'pub1',
        type: 'Publisher',
        children: [{ name: 'comp1', type: 'Composer', children: [] }],
        mechanicalOwnership: 25,
        mechanicalCollection: 25,
        performanceOwnership: 25,
        performanceCollection: 25,
      },
      {
        name: 'pub1',
        type: 'Publisher',
        children: [{ name: 'comp2', type: 'Composer', children: [] }],
        mechanicalOwnership: 75,
        mechanicalCollection: 75,
        performanceOwnership: 75,
        performanceCollection: 75,
      },
    ];
    const combined = IpChainUtils.combineDuplicatePublishers(chain);
    expect(combined).toEqual([
      {
        name: 'pub1',
        type: 'Publisher',
        children: [{ name: 'comp1', type: 'Composer', children: [] }, { name: 'comp2', type: 'Composer', children: [] }],
        mechanicalOwnership: 100,
        mechanicalCollection: 100,
        performanceOwnership: 100,
        performanceCollection: 100,
      },
    ]);
    done();
  });

  it('should combine nested duplicate publishers and merge their children (1)', (done) => {
    const chain = [
      {
        name: 'pub1',
        type: 'Publisher',
        children: [
          {
            name: 'pub2',
            type: 'Publisher',
            children: [
              { name: 'comp1', type: 'Composer', children: [] },
              { name: 'comp2', type: 'Composer', children: [] },
            ],
            mechanicalOwnership: 75,
            mechanicalCollection: 75,
            performanceOwnership: 75,
            performanceCollection: 75,
          },
        ],
      },
      {
        name: 'pub1',
        type: 'Publisher',
        children: [
          {
            name: 'pub2',
            type: 'Publisher',
            children: [
              { name: 'comp3', type: 'Composer', children: [] },
            ],
            mechanicalOwnership: 25,
            mechanicalCollection: 25,
            performanceOwnership: 25,
            performanceCollection: 25,
          },
        ],
      },
    ];
    const combined = IpChainUtils.combineDuplicatePublishers(chain);
    expect(combined).toEqual([
      {
        name: 'pub1',
        type: 'Publisher',
        children: [
          {
            name: 'pub2',
            type: 'Publisher',
            children: [
              { name: 'comp1', type: 'Composer', children: [] },
              { name: 'comp2', type: 'Composer', children: [] },
              { name: 'comp3', type: 'Composer', children: [] },
            ],
            mechanicalOwnership: 100,
            mechanicalCollection: 100,
            performanceOwnership: 100,
            performanceCollection: 100,
          },
        ],
      },
    ]);
    done();
  });

  it('should combine nested duplicate publishers and merge their children (2)', (done) => {
    const chain = [
      {
        name: 'pub1',
        type: 'Publisher',
        children: [
          {
            name: 'pub2',
            type: 'Publisher',
            children: [
              { name: 'comp1', type: 'Composer', children: [] },
            ],
            mechanicalOwnership: 75,
            mechanicalCollection: 75,
            performanceOwnership: 75,
            performanceCollection: 75,
          },
        ],
      },
      {
        name: 'pub1',
        type: 'Publisher',
        children: [
          {
            name: 'pub2',
            type: 'Publisher',
            children: [
              { name: 'comp1', type: 'Composer', children: [] },
            ],
            mechanicalOwnership: 25,
            mechanicalCollection: 25,
            performanceOwnership: 25,
            performanceCollection: 25,
          },
        ],
      },
    ];
    const combined = IpChainUtils.combineDuplicatePublishers(chain);
    expect(combined).toEqual([
      {
        name: 'pub1',
        type: 'Publisher',
        children: [
          {
            name: 'pub2',
            type: 'Publisher',
            children: [
              { name: 'comp1', type: 'Composer', children: [] },
            ],
            mechanicalOwnership: 100,
            mechanicalCollection: 100,
            performanceOwnership: 100,
            performanceCollection: 100,
          },
        ],
      },
    ]);
    done();
  });

  it('should total the ip chain values when combining', (done) => {
    const chain = [
      {
        name: 'pub1',
        type: 'Publisher',
        children: [
          {
            name: 'comp1',
            type: 'Composer',
            children: [],
            mechanicalOwnership: 25,
            mechanicalCollection: 25,
            performanceOwnership: 25,
            performanceCollection: 25,
          },
        ],
        mechanicalOwnership: 25,
        mechanicalCollection: 25,
        performanceOwnership: 25,
        performanceCollection: 25,
      },
      {
        name: 'pub1',
        type: 'Publisher',
        children: [
          {
            name: 'comp2',
            type: 'Composer',
            children: [],
            mechanicalOwnership: 25,
            mechanicalCollection: 25,
            performanceOwnership: 25,
            performanceCollection: 25,
          },
        ],
        mechanicalOwnership: 25,
        mechanicalCollection: 25,
        performanceOwnership: 25,
        performanceCollection: 25,
      },
    ];
    const combined = IpChainUtils.combineDuplicatePublishers(chain);
    expect(combined).toEqual([
      {
        name: 'pub1',
        type: 'Publisher',
        children: [
          {
            name: 'comp1',
            type: 'Composer',
            children: [],
            mechanicalOwnership: 25,
            mechanicalCollection: 25,
            performanceOwnership: 25,
            performanceCollection: 25,
          },
          {
            name: 'comp2',
            type: 'Composer',
            children: [],
            mechanicalOwnership: 25,
            mechanicalCollection: 25,
            performanceOwnership: 25,
            performanceCollection: 25,
          },
        ],
        mechanicalOwnership: 50,
        mechanicalCollection: 50,
        performanceOwnership: 50,
        performanceCollection: 50,
      },
    ]);
    done();
  });

  it('should not combine parent publishers if they have different child publishers (sup-1164)', (done) => {
    const chain = [
      {
        name: 'pub1',
        type: 'Publisher',
        children: [
          {
            name: 'pub2',
            type: 'Publisher',
            contractType: 'Admin',
            children: [
              {
                name: 'comp1',
                type: 'Composer',
                children: [],
              },
            ],
            mechanicalOwnership: 25,
            mechanicalCollection: 25,
            performanceOwnership: 25,
            performanceCollection: 25,
          },
        ],
        mechanicalOwnership: 25,
        mechanicalCollection: 25,
        performanceOwnership: 25,
        performanceCollection: 25,
      },
      {
        name: 'pub1',
        type: 'Publisher',
        children: [
          {
            name: 'pub3',
            type: 'Publisher',
            contractType: 'Sub-Publisher',
            children: [
              {
                name: 'comp2',
                type: 'Composer',
                children: [],
              },
            ],
            mechanicalOwnership: 25,
            mechanicalCollection: 25,
            performanceOwnership: 25,
            performanceCollection: 25,
          },
        ],
        mechanicalOwnership: 25,
        mechanicalCollection: 25,
        performanceOwnership: 25,
        performanceCollection: 25,
      },
      {
        name: 'pub3',
        type: 'Publisher',
        children: [
          { name: 'comp3', type: 'Composer', children: [] },
        ],
        mechanicalOwnership: 25,
        mechanicalCollection: 25,
        performanceOwnership: 25,
        performanceCollection: 25,
      },
      {
        name: 'pub4',
        type: 'Publisher',
        children: [{ name: 'comp4', type: 'Composer', children: [] }],
        mechanicalOwnership: 12.5,
        mechanicalCollection: 12.5,
        performanceOwnership: 12.5,
        performanceCollection: 12.5,
      },
      {
        name: 'pub4',
        type: 'Publisher',
        children: [{ name: 'comp5', type: 'Composer', children: [] }],
        mechanicalOwnership: 12.5,
        mechanicalCollection: 12.5,
        performanceOwnership: 12.5,
        performanceCollection: 12.5,
      },
    ];
    const combined = IpChainUtils.combineDuplicatePublishers(chain);
    expect(combined).toEqual([
      {
        name: 'pub1',
        type: 'Publisher',
        children: [
          {
            name: 'pub2',
            type: 'Publisher',
            contractType: 'Admin',
            children: [
              {
                name: 'comp1',
                type: 'Composer',
                children: [],
              },
            ],
            mechanicalOwnership: 25,
            mechanicalCollection: 25,
            performanceOwnership: 25,
            performanceCollection: 25,
          },
        ],
        mechanicalOwnership: 25,
        mechanicalCollection: 25,
        performanceOwnership: 25,
        performanceCollection: 25,
      },
      {
        name: 'pub1',
        type: 'Publisher',
        children: [
          {
            name: 'pub3',
            type: 'Publisher',
            contractType: 'Sub-Publisher',
            children: [
              {
                name: 'comp2',
                type: 'Composer',
                children: [],
              },
            ],
            mechanicalOwnership: 25,
            mechanicalCollection: 25,
            performanceOwnership: 25,
            performanceCollection: 25,
          },
        ],
        mechanicalOwnership: 25,
        mechanicalCollection: 25,
        performanceOwnership: 25,
        performanceCollection: 25,
      },
      {
        name: 'pub3',
        type: 'Publisher',
        children: [
          { name: 'comp3', type: 'Composer', children: [] },
        ],
        mechanicalOwnership: 25,
        mechanicalCollection: 25,
        performanceOwnership: 25,
        performanceCollection: 25,
      },
      {
        name: 'pub4',
        type: 'Publisher',
        children: [{ name: 'comp4', type: 'Composer', children: [] }, { name: 'comp5', type: 'Composer', children: [] }],
        mechanicalOwnership: 25,
        mechanicalCollection: 25,
        performanceOwnership: 25,
        performanceCollection: 25,
      },
    ]);
    done();
  });

  it('should not combine duplicate publishers if they have a different contractType', (done) => {
    const chain = [
      {
        name: 'pub1',
        type: 'Publisher',
        contractType: 'Admin',
        children: [
          {
            name: 'pub2',
            type: 'Publisher',
            contractType: 'Original Publisher',
            children: [{ name: 'comp1', type: 'Composer', children: [] }],
            mechanicalOwnership: 50,
            mechanicalCollection: 50,
            performanceOwnership: 50,
            performanceCollection: 50,
          },
        ],
        mechanicalOwnership: 50,
        mechanicalCollection: 50,
        performanceOwnership: 50,
        performanceCollection: 50,
      },
      {
        name: 'pub1',
        type: 'Publisher',
        contractType: 'Sub-Publisher',
        children: [
          {
            name: 'pub2',
            type: 'Publisher',
            contractType: 'Original Publisher',
            children: [{ name: 'comp2', type: 'Composer', children: [] }],
            mechanicalOwnership: 50,
            mechanicalCollection: 50,
            performanceOwnership: 50,
            performanceCollection: 50,
          },
        ],
        mechanicalOwnership: 50,
        mechanicalCollection: 50,
        performanceOwnership: 50,
        performanceCollection: 50,
      },
    ];
    const combined = IpChainUtils.combineDuplicatePublishers(chain);
    expect(combined).toEqual(chain);
    done();
  });

  it('should not combine nested duplicate publishers if they have a different contractType', (done) => {
    const chain = [
      {
        name: 'pub1',
        type: 'Publisher',
        contractType: 'Sub-Publisher',
        children: [
          {
            name: 'pub2',
            type: 'Publisher',
            contractType: 'Admin',
            children: [
              { name: 'comp1', type: 'Composer', children: [] },
            ],
            mechanicalOwnership: 25,
            mechanicalCollection: 25,
            performanceOwnership: 25,
            performanceCollection: 25,
          },
        ],
        mechanicalOwnership: 25,
        mechanicalCollection: 25,
        performanceOwnership: 25,
        performanceCollection: 25,
      },
      {
        name: 'pub1',
        type: 'Publisher',
        contractType: 'Sub-Publisher',
        children: [
          {
            name: 'pub2',
            type: 'Publisher',
            contractType: 'Sub-Publisher',
            children: [
              { name: 'comp2', type: 'Composer', children: [] },
            ],
            mechanicalOwnership: 25,
            mechanicalCollection: 25,
            performanceOwnership: 25,
            performanceCollection: 25,
          },
        ],
        mechanicalOwnership: 25,
        mechanicalCollection: 25,
        performanceOwnership: 25,
        performanceCollection: 25,
      },
    ];
    const combined = IpChainUtils.combineDuplicatePublishers(chain);
    expect(combined).toEqual([
      {
        name: 'pub1',
        type: 'Publisher',
        contractType: 'Sub-Publisher',
        children: [
          {
            name: 'pub2',
            type: 'Publisher',
            contractType: 'Admin',
            children: [
              { name: 'comp1', type: 'Composer', children: [] },
            ],
            mechanicalOwnership: 25,
            mechanicalCollection: 25,
            performanceOwnership: 25,
            performanceCollection: 25,
          },
        ],
        mechanicalOwnership: 25,
        mechanicalCollection: 25,
        performanceOwnership: 25,
        performanceCollection: 25,
      },
      {
        name: 'pub1',
        type: 'Publisher',
        contractType: 'Sub-Publisher',
        children: [
          {
            name: 'pub2',
            type: 'Publisher',
            contractType: 'Sub-Publisher',
            children: [
              { name: 'comp2', type: 'Composer', children: [] },
            ],
            mechanicalOwnership: 25,
            mechanicalCollection: 25,
            performanceOwnership: 25,
            performanceCollection: 25,
          },
        ],
        mechanicalOwnership: 25,
        mechanicalCollection: 25,
        performanceOwnership: 25,
        performanceCollection: 25,
      },
    ]);
    done();
  });

  it('should not combine nested publishers if they have different child publisher & composer combinations', (done) => {
    const chain = [
      {
        name: 'pub1',
        type: 'Publisher',
        contractType: 'admin',
        children: [
          {
            name: 'pub2',
            type: 'Publisher',
            contractType: 'Original Publisher',
            children: [{ name: 'comp1', type: 'Composer', children: [] }],
            mechanicalOwnership: 25,
            mechanicalCollection: 25,
            performanceOwnership: 25,
            performanceCollection: 25,
          },
        ],
        mechanicalOwnership: 25,
        mechanicalCollection: 25,
        performanceOwnership: 25,
        performanceCollection: 25,
      },
      {
        name: 'pub1',
        type: 'Publisher',
        contractType: 'admin',
        children: [
          {
            name: 'pub3',
            type: 'Publisher',
            contractType: 'Original Publisher',
            children: [{ name: 'comp2', type: 'Composer', children: [] }],
            mechanicalOwnership: 25,
            mechanicalCollection: 25,
            performanceOwnership: 25,
            performanceCollection: 25,
          },
        ],
        mechanicalOwnership: 25,
        mechanicalCollection: 25,
        performanceOwnership: 25,
        performanceCollection: 25,
      },
    ];
    const combined = IpChainUtils.combineDuplicatePublishers(chain);
    expect(combined).toEqual(chain);
    done();
  });

  it('should not combine composers if they have the same publisher but different contract types', (done) => {
    const chain = [
      {
        name: 'pub1',
        type: 'Publisher',
        contractType: 'admin',
        children: [
          {
            name: 'comp1',
            type: 'Composer',
            contractType: 'Lyrics',
            children: [],
            mechanicalOwnership: 25,
            mechanicalCollection: 25,
            performanceOwnership: 25,
            performanceCollection: 25,
          },
        ],
        mechanicalOwnership: 25,
        mechanicalCollection: 25,
        performanceOwnership: 25,
        performanceCollection: 25,
      },
      {
        name: 'pub1',
        type: 'Publisher',
        contractType: 'admin',
        children: [
          {
            name: 'comp1',
            type: 'Composer',
            contractType: 'Music',
            children: [],
            mechanicalOwnership: 25,
            mechanicalCollection: 25,
            performanceOwnership: 25,
            performanceCollection: 25,
          },
        ],
        mechanicalOwnership: 25,
        mechanicalCollection: 25,
        performanceOwnership: 25,
        performanceCollection: 25,
      },
    ];
    const combined = IpChainUtils.combineDuplicatePublishers(chain);
    expect(combined).toEqual([
      {
        name: 'pub1',
        type: 'Publisher',
        contractType: 'admin',
        children: [
          {
            name: 'comp1',
            type: 'Composer',
            contractType: 'Lyrics',
            children: [],
            mechanicalOwnership: 25,
            mechanicalCollection: 25,
            performanceOwnership: 25,
            performanceCollection: 25,
          },
          {
            name: 'comp1',
            type: 'Composer',
            contractType: 'Music',
            children: [],
            mechanicalOwnership: 25,
            mechanicalCollection: 25,
            performanceOwnership: 25,
            performanceCollection: 25,
          },
        ],
        mechanicalOwnership: 50,
        mechanicalCollection: 50,
        performanceOwnership: 50,
        performanceCollection: 50,
      },
    ]);
    done();
  });

  it('should still work as expected when the only unique field is the publisher id', (done) => {
    const chain = [
      {
        type: 'Publisher',
        mechanicalCollection: 50,
        performanceCollection: 25,
        children: [
          {
            type: 'Composer',
            composerId: '65dd9d4688a9a6a15f268fec',
            controlled: true,
            contractType: 'Lyrics and Music',
            mechanicalOwnership: 25,
            performanceOwnership: 25,
            mechanicalCollection: 0,
            performanceCollection: 25,
          },
        ],
        publisherId: '65dd9d3893b93e8b3d266ac9',
        controlled: true,
        contractType: 'Original Publisher',
        mechanicalOwnership: 25,
        performanceOwnership: 25,
      },
      {
        type: 'Publisher',
        mechanicalCollection: 50,
        performanceCollection: 25,
        children: [
          {
            type: 'Composer',
            composerId: '65e6ff9d46c878b7c3eaeba4',
            controlled: true,
            contractType: 'Lyrics and Music',
            mechanicalOwnership: 25,
            performanceOwnership: 25,
            mechanicalCollection: 0,
            performanceCollection: 25,
          },
        ],
        publisherId: '65e1b60399e59d20a6c14d7a',
        controlled: true,
        contractType: 'Original Publisher',
        mechanicalOwnership: 25,
        performanceOwnership: 25,
      },
    ];
    const combined = IpChainUtils.combineDuplicatePublishers(chain);
    expect(combined).toEqual(chain);
    done();
  });

  it('should still work as expected when the only unique field is the composer id', (done) => {
    const chain = [
      {
        type: 'Publisher',
        mechanicalCollection: 50,
        performanceCollection: 25,
        children: [
          {
            type: 'Composer',
            composerId: '65dd9d4688a9a6a15f268fec',
            controlled: true,
            contractType: 'Lyrics and Music',
            mechanicalOwnership: 25,
            performanceOwnership: 25,
            mechanicalCollection: 0,
            performanceCollection: 25,
          },
        ],
        publisherId: '65dd9d3893b93e8b3d266ac9',
        controlled: true,
        contractType: 'Original Publisher',
        mechanicalOwnership: 25,
        performanceOwnership: 25,
      },
      {
        type: 'Publisher',
        mechanicalCollection: 50,
        performanceCollection: 25,
        children: [
          {
            type: 'Composer',
            composerId: '65e6ff9d46c878b7c3eaeba4',
            controlled: true,
            contractType: 'Lyrics and Music',
            mechanicalOwnership: 25,
            performanceOwnership: 25,
            mechanicalCollection: 0,
            performanceCollection: 25,
          },
        ],
        publisherId: '65dd9d3893b93e8b3d266ac9',
        controlled: true,
        contractType: 'Original Publisher',
        mechanicalOwnership: 25,
        performanceOwnership: 25,
      },
    ];
    const combined = IpChainUtils.combineDuplicatePublishers(chain);
    expect(combined).toEqual([
      {
        type: 'Publisher',
        mechanicalCollection: 100,
        performanceCollection: 50,
        children: [
          {
            type: 'Composer',
            composerId: '65dd9d4688a9a6a15f268fec',
            controlled: true,
            contractType: 'Lyrics and Music',
            mechanicalOwnership: 25,
            performanceOwnership: 25,
            mechanicalCollection: 0,
            performanceCollection: 25,
          },
          {
            type: 'Composer',
            composerId: '65e6ff9d46c878b7c3eaeba4',
            controlled: true,
            contractType: 'Lyrics and Music',
            mechanicalOwnership: 25,
            performanceOwnership: 25,
            mechanicalCollection: 0,
            performanceCollection: 25,
          },
        ],
        publisherId: '65dd9d3893b93e8b3d266ac9',
        controlled: true,
        contractType: 'Original Publisher',
        mechanicalOwnership: 50,
        performanceOwnership: 50,
      },
    ]);
    done();
  });

  it('should make sure performance and mechanical percentages are numbers before totalling (when coming from the frontend)', (done) => {
    const chain = [
      {
        name: 'pub1',
        type: 'Publisher',
        children: [{ name: 'comp1', type: 'Composer', children: [] }],
        mechanicalOwnership: '.01',
        mechanicalCollection: '25',
        performanceOwnership: '25',
        performanceCollection: '24.25',
      },
      {
        name: 'pub1',
        type: 'Publisher',
        children: [{ name: 'comp2', type: 'Composer', children: [] }],
        mechanicalOwnership: '99.99',
        mechanicalCollection: '75',
        performanceOwnership: '75',
        performanceCollection: '75.75',
      },
    ];
    const combined = IpChainUtils.combineDuplicatePublishers(chain);
    expect(combined).toEqual([
      {
        name: 'pub1',
        type: 'Publisher',
        children: [{ name: 'comp1', type: 'Composer', children: [] }, { name: 'comp2', type: 'Composer', children: [] }],
        mechanicalOwnership: 100,
        mechanicalCollection: 100,
        performanceOwnership: 100,
        performanceCollection: 100,
      },
    ]);
    done();
  });

  it('should not combine composers at the top level of the chain', (done) => {
    const chain = [
      {
        type: 'Publisher',
        name: 'Publisher 1',
        mechanicalCollection: 100,
        performanceCollection: 50,
        children: [
          {
            type: 'Composer',
            composerId: '6548b656b7cd407a3ff17b9d',
            name: 'Comp 1',
            controlled: true,
            contractType: 'Lyrics and Music',
            performanceOwnership: 10,
            performanceCollection: 10,
            mechanicalCollection: 0,
            mechanicalOwnership: 0,
          },
        ],
        controlled: true,
        contractType: 'Original Publisher',
        mechanicalOwnership: 100,
        performanceOwnership: 50,
      },
      {
        type: 'Composer',
        composerId: '6548b0e9b7cd407a3ff13e3b',
        name: 'Comp 2',
        controlled: false,
        contractType: 'Lyrics and Music',
        performanceOwnership: 20,
        performanceCollection: 20,
        mechanicalCollection: 0,
        mechanicalOwnership: 0,
      },
      {
        type: 'Composer',
        composerId: '6548b1f6b7cd407a3ff14958',
        name: 'Comp 3',
        controlled: false,
        contractType: 'Lyrics and Music',
        performanceOwnership: 20,
        performanceCollection: 20,
        mechanicalCollection: 0,
        mechanicalOwnership: 0,
      },
    ];
    const combined = IpChainUtils.combineDuplicatePublishers(chain);
    expect(combined).toEqual(chain);
    done();
  });

  it('should return the correct path when a Publisher has no child Composer', (done) => {
    const chain = [
      {
        type: 'Publisher',
        name: 'Publisher 1',
        mechanicalCollection: 100,
        performanceCollection: 50,
        children: [
          {
            type: 'Publisher',
            publisherId: '6548b656b7cd407a3ff17b9d',
            name: 'Pub 1',
            controlled: true,
            contractType: 'Sub Publisher',
            performanceOwnership: 10,
            performanceCollection: 10,
            mechanicalCollection: 0,
            mechanicalOwnership: 0,
          },
        ],
        controlled: true,
        contractType: 'Original Publisher',
        mechanicalOwnership: 100,
        performanceOwnership: 50,
      },

    ];
    const combined = IpChainUtils.combineDuplicatePublishers(chain);
    expect(combined).toEqual(chain);
    done();
  });

  it('should return the correct path when a Publisher has a blank array of children', (done) => {
    const chain = [
      {
        type: 'Publisher',
        name: 'Publisher 1',
        mechanicalCollection: 100,
        performanceCollection: 50,
        children: [
          {
            type: 'Publisher',
            publisherId: '6548b656b7cd407a3ff17b9d',
            name: 'Pub 1',
            controlled: true,
            contractType: 'Sub Publisher',
            performanceOwnership: 10,
            performanceCollection: 10,
            mechanicalCollection: 0,
            mechanicalOwnership: 0,
            children: [],
          },
        ],
        controlled: true,
        contractType: 'Original Publisher',
        mechanicalOwnership: 100,
        performanceOwnership: 50,
      },

    ];
    const combined = IpChainUtils.combineDuplicatePublishers(chain);
    expect(combined).toEqual(chain);
    done();
  });

  it('should not modify the chain when a composer is owned by a top level sub-publisher (SUP-1395)', (done) => {
    const chain = [
      {
        type: 'Publisher',
        mechanicalCollection: 100,
        performanceCollection: 50,
        children: [
          {
            type: 'Publisher',
            children: [
              {
                type: 'Composer',
                composerId: '65bb914669538381ccf9087e',
                controlled: true,
                contractType: 'Lyrics and Music',
                mechanicalOwnership: 0,
                performanceOwnership: 25,
                mechanicalCollection: 0,
                performanceCollection: 25,
              },
            ],
            publisherId: '65b3b122c7b7149ee7bf3dfa',
            controlled: true,
            contractType: 'Original Publisher',
            mechanicalOwnership: 100,
            performanceOwnership: 50,
            mechanicalCollection: 0,
            performanceCollection: 0 },
          {
            type: 'Composer',
            children: [],
            contractType: 'Lyrics and Music',
            composerId: '65bb924c69538381ccf90a34',
            controlled: true,
            mechanicalOwnership: 0,
            performanceOwnership: 25,
            mechanicalCollection: 0,
            performanceCollection: 25,
          },
        ],
        publisherId: '65b3b122c7b7149ee7bf3de5',
        controlled: true,
        contractType: 'Sub Publisher',
        mechanicalOwnership: 0,
        performanceOwnership: 0,
      },
    ];
    const combined = IpChainUtils.combineDuplicatePublishers(chain);
    expect(combined).toEqual(chain);
    done();
  });

  it('should not error when a top-level publisher has no children or they include null (SUP-1408)', (done) => {
    const chain = [
      {
        type: 'Publisher',
        name: 'Publisher 1',
        mechanicalCollection: 100,
        performanceCollection: 50,
        children: [null],
        controlled: true,
        contractType: 'Original Publisher',
        mechanicalOwnership: 100,
        performanceOwnership: 50,
      },

    ];
    const combined = IpChainUtils.combineDuplicatePublishers(chain);
    expect(combined).toEqual(chain);
    done();
  });

  it('should not modify the chain at all if there are duplicate original publishers but one is layered underneath a separate publisher', (done) => {
    const chain = [
      {
        type: 'Publisher',
        contractType: 'Sub Publisher',
        controlled: true,
        mechanicalCollection: 0,
        mechanicalOwnership: 0,
        performanceCollection: 0,
        performanceOwnership: 0,
        children: [
          {
            type: 'Publisher',
            mechanicalCollection: 0,
            performanceCollection: 0,
            children: [
              {
                type: 'Composer',
                contractType: 'Lyrics and Music',
                mechanicalOwnership: 0,
                performanceOwnership: 25,
                mechanicalCollection: 0,
                performanceCollection: 25,
                name: 'John Smith',
                controlled: true,
                caeNumber: '00000000000',
                cae: '198297777',
              },
              {
                type: 'Composer',
                controlled: true,
                contractType: 'Lyrics and Music',
                mechanicalOwnership: 0,
                performanceOwnership: 25,
                mechanicalCollection: 0,
                performanceCollection: 25,
                name: 'Emily White',
                caeNumber: '00000000000',
                cae: '97498490',
              },
            ],
            publisherId: '67927bee9ef2b2032145825b',
            controlled: true,
            contractType: 'Original Publisher',
            mechanicalOwnership: 100,
            performanceOwnership: 50,
          },
        ],
        publisherId: '67a4cfbfacc44b578440ef5f',
      },
      {
        type: 'Publisher',
        mechanicalCollection: 0,
        performanceCollection: 0,
        children: [
          {
            type: 'Composer',
            children: [],
            composerId: '67a4d012acc44b578440efa1',
            controlled: true,
            contractType: 'Lyrics and Music',
            mechanicalOwnership: 0,
            performanceOwnership: 0,
            mechanicalCollection: 100,
            performanceCollection: 50,
            cae: '00000000000',
            name: 'Sarah Johnson',
          },
        ],
        publisherId: '67927bee9ef2b2032145825b',
        controlled: true,
        contractType: 'Original Publisher',
        mechanicalOwnership: 0,
        performanceOwnership: 0,
      },
    ];
    const combined = IpChainUtils.combineDuplicatePublishers(chain);
    expect(combined).toEqual(Object.values(chain));
    done();
  });

  // This scenario is possible after exporting a work and re-importing it
  // Only the originally exported Publisher will have extra data like name fields
  it('should prioritise merging on Publisher ID when only one has name fields set (CUR-4577)', () => {
    // Arrange
    const chain = [
      {
        type: 'Publisher',
        name: 'Line Songs Inc.',
        firstName: null,
        middleName: null,
        surname: null,
        caeNumber: '1029384756',
        mechanicalOwnership: 50,
        mechanicalCollection: 50,
        performanceOwnership: 25,
        performanceCollection: 25,
        contractType: 'Original Publisher',
        children: [
          {
            type: 'Composer',
            name: 'Josh Prints',
            firstName: 'Josh',
            middleName: null,
            surname: 'Prints',
            caeNumber: '00192837465',
            mechanicalOwnership: 0,
            mechanicalCollection: 0,
            performanceOwnership: 25,
            performanceCollection: 25,
            contractType: 'Lyrics and Music',
            children: [],
            index: 0,
            composerId: '687e610d23403ba8ea08d49a',
            controlled: true,
          },
        ],
        index: 0,
        publisherId: '6875062ef681beb862c9b1c7',
        controlled: true,
      },
      {
        type: 'Publisher',
        mechanicalCollection: 50,
        performanceCollection: 25,
        children: [
          {
            type: 'Composer',
            children: [],
            composerId: '687e54161735bb56a27d4070',
            controlled: true,
            contractType: 'Lyrics and Music',
            performanceOwnership: 25,
            mechanicalCollection: 0,
            performanceCollection: 25,
            mechanicalOwnership: 0,
            caeNumber: '00012345679',
            name: 'Gretchen Cabe',
          },
        ],
        publisherId: '6875062ef681beb862c9b1c7',
        controlled: true,
        mechanicalOwnership: 50,
        contractType: 'Original Publisher',
        performanceOwnership: 25,
      },
    ];

    // Act
    const combined = IpChainUtils.combineDuplicatePublishers(chain);

    // Assert
    expect(combined).toEqual([
      {
        type: 'Publisher',
        name: 'Line Songs Inc.',
        firstName: null,
        middleName: null,
        surname: null,
        caeNumber: '1029384756',
        mechanicalOwnership: 100,
        mechanicalCollection: 100,
        performanceOwnership: 50,
        performanceCollection: 50,
        contractType: 'Original Publisher',
        children: [
          {
            type: 'Composer',
            name: 'Josh Prints',
            firstName: 'Josh',
            middleName: null,
            surname: 'Prints',
            caeNumber: '00192837465',
            mechanicalOwnership: 0,
            mechanicalCollection: 0,
            performanceOwnership: 25,
            performanceCollection: 25,
            contractType: 'Lyrics and Music',
            children: [],
            index: 0,
            composerId: '687e610d23403ba8ea08d49a',
            controlled: true,
          },
          {
            type: 'Composer',
            children: [],
            composerId: '687e54161735bb56a27d4070',
            controlled: true,
            contractType: 'Lyrics and Music',
            performanceOwnership: 25,
            mechanicalCollection: 0,
            performanceCollection: 25,
            mechanicalOwnership: 0,
            caeNumber: '00012345679',
            name: 'Gretchen Cabe',
          },
        ],
        index: 0,
        publisherId: '6875062ef681beb862c9b1c7',
        controlled: true,
      },
    ]);
  });
});

describe('#controlledByPublisherOrIncomeParticipant', () => {
  it('should return true if a controlled chain includes an Original Publisher', (done) => {
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
    expect(IpChainUtils.controlledByPublisherOrIncomeParticipant(chain)).toEqual(true);
    done();
  });
  it('should return true if a controlled chain includes an Income Participant', (done) => {
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
    expect(IpChainUtils.controlledByPublisherOrIncomeParticipant(chain)).toEqual(true);
    done();
  });
  it('should return false if a controlled chain does not include an Original Publisher or Income Participant', (done) => {
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
    expect(IpChainUtils.controlledByPublisherOrIncomeParticipant(chain)).toEqual(false);
    done();
  });
  it('should return true for deeply nested chains that include an Income Participant', (done) => {
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
    expect(IpChainUtils.controlledByPublisherOrIncomeParticipant(chain)).toEqual(true);
    done();
  });
  it('should ignore uncontrolled chains and always return true', (done) => {
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
    expect(IpChainUtils.controlledByPublisherOrIncomeParticipant(chain)).toEqual(true);
    done();
  });
  it('should return false if a controlled composer is at the top level of the chain', (done) => {
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
    expect(IpChainUtils.controlledByPublisherOrIncomeParticipant(chain)).toEqual(false);
    done();
  });
});

describe('#sumContractTypeValueInIpChainChildren', () => {
  it('should total the specified field for all valid chain types and their children', (done) => {
    const chain = [
      {
        contractType: IpChainUtils.ContractType.OriginalPublisher,
        mechanicalOwnership: 12.5,
        children: [
          {
            contractType: IpChainUtils.ContractType.SubPublisher,
            mechanicalOwnership: 50,
          },
          {
            contractType: IpChainUtils.ContractType.OriginalPublisher,
            mechanicalOwnership: 12.5,
            children: [
              {
                contractType: IpChainUtils.ContractType.OriginalPublisher,
                mechanicalOwnership: 25,
              },
            ],
          },
        ],
      },
    ];
      // Mechanical Ownership for Original Publishers should total 50%
    expect(IpChainUtils.sumContractTypeValueInIpChainChildren(
      chain[0],
      'mechanicalOwnership',
      [IpChainUtils.ContractType.OriginalPublisher],
      0,
    )).toEqual(50);
    // Mechanical Ownership for Original Publishers + Sub Publishers should total 100%
    expect(IpChainUtils.sumContractTypeValueInIpChainChildren(
      chain[0],
      'mechanicalOwnership',
      [IpChainUtils.ContractType.OriginalPublisher, IpChainUtils.ContractType.SubPublisher],
      0,
    )).toEqual(100);
    // Performance Ownership should be zero for Admins (none on the chain)
    expect(IpChainUtils.sumContractTypeValueInIpChainChildren(
      chain[0],
      'performanceOwnership',
      [IpChainUtils.ContractType.Admin],
      0,
    )).toEqual(0);
    done();
  });
});

describe('#sumContractTypeValueInIpChainChildren', () => {
  it('should return the count of a specified type + contract type in the chain', (done) => {
    const chain = [
      {
        type: 'Publisher',
        contractType: IpChainUtils.ContractType.Admin,
        children: [
          {
            type: 'Publisher',
            contractType: IpChainUtils.ContractType.SubPublisher,
            children: [
              {
                type: 'Publisher',
                contractType: IpChainUtils.ContractType.OriginalPublisher,
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
            contractType: IpChainUtils.ContractType.OriginalPublisher,
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
    expect(IpChainUtils.countContractTypeInIpChainChildren(
      chain[0],
      'Publisher',
      [IpChainUtils.ContractType.OriginalPublisher],
      0,
    )).toEqual(2);
    // There are two Composers with the the contract type Lyrics and Music
    expect(IpChainUtils.countContractTypeInIpChainChildren(
      chain[0],
      'Composer',
      ['Lyrics and Music'],
      0,
    )).toEqual(2);
    // It should total up different Publisher types when specified
    expect(IpChainUtils.countContractTypeInIpChainChildren(
      chain[0],
      'Publisher',
      [IpChainUtils.ContractType.OriginalPublisher, IpChainUtils.ContractType.SubPublisher, IpChainUtils.ContractType.Admin],
      0,
    )).toEqual(4);
    done();
  });
});

describe('#checkChainsHaveTerritory', () => {
  it('should return false if a chain has no territory defined', (done) => {
    const chain1 = [{ children: [], totalPerformanceCollection: 100 }];
    const chain2 = [{ territory: null, children: [], totalPerformanceCollection: 100 }];
    expect(IpChainUtils.checkChainsHaveTerritory(chain1)).toEqual(false);
    expect(IpChainUtils.checkChainsHaveTerritory(chain2)).toEqual(false);
    done();
  });

  it('should return false if a chain has no territory defined (specific)', (done) => {
    const chain1 = [{ territory: 'specific', children: [], totalPerformanceCollection: 100 }];
    const chain2 = [{ territory: 'specific', territoryCodes: { name: '', codes: [] }, children: [], totalPerformanceCollection: 100 }];
    expect(IpChainUtils.checkChainsHaveTerritory(chain1)).toEqual(false);
    expect(IpChainUtils.checkChainsHaveTerritory(chain2)).toEqual(false);
    done();
  });

  it('should return false if even one single chain no territory defined', (done) => {
    const chains = [
      { territory: 'WW', children: [], totalPerformanceCollection: 100 },
      { territory: 'specific', territoryCodes: { name: 'GB, NL', codes: ['GB', 'NL'] }, children: [], totalPerformanceCollection: 100 },
      // No territories defined on this chain
      { territory: 'specific', territoryCodes: { name: '', codes: [] }, children: [], totalPerformanceCollection: 100 },
    ];
    expect(IpChainUtils.checkChainsHaveTerritory(chains)).toEqual(false);
    done();
  });

  it('should return true if every chain has a territory defined', (done) => {
    const chains = [
      { territory: 'WW', children: [], totalPerformanceCollection: 100 },
      { territory: 'specific', territoryCodes: { name: 'GB, NL', codes: ['GB', 'NL'] }, children: [], totalPerformanceCollection: 100 },
      { territory: '6613edda8c39ec79087dead1', children: [], totalPerformanceCollection: 100 },
    ];
    expect(IpChainUtils.checkChainsHaveTerritory(chains)).toEqual(true);
    done();
  });
});
