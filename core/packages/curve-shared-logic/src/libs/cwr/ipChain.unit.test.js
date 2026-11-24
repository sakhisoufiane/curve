const IpChainUtils = require('./ipChain');
const { CISAC_APPROVED_COUNTRIES_CODES } = require('./territories');
const Publisher = require('./publisher');
const TerritoryHelper = require('../territoryHelper');

describe('IpChainUtils', () => {
  describe('separateSpecificChains', () => {
    it('should not change a chain with only one path', () => {
      const rightsChain = [
        {
          territory: ['AR', 'GB'],
          children: [
            {
              type: 'Publisher',
              name: 'Response Music Scandinavia',
              controlled: true,
              mechanicalOwnership: 0,
              mechanicalCollection: 50,
              performanceOwnership: 0,
              performanceCollection: 25,
              contractType: 'Sub Publisher',
              children: [
                {
                  type: 'Publisher',
                  name: 'FJ Response Holding',
                  controlled: true,
                  mechanicalOwnership: 50,
                  mechanicalCollection: 0,
                  performanceOwnership: 25,
                  performanceCollection: 0,
                  contractType: 'Original Publisher',
                  children: [
                    {
                      type: 'Composer',
                      name: 'Kasper Kamnik',
                      controlled: true,
                      mechanicalOwnership: 0,
                      mechanicalCollection: 0,
                      performanceOwnership: 25,
                      performanceCollection: 25,
                      contractType: 'Lyrics and Music',
                      children: [],
                      composerId: '6601638dd71990a82e8819a9',
                      composer: {
                        _id: '6601638dd71990a82e8819a9',
                        name: 'Kasper Kamnik',
                        contractType: 'Lyrics and Music',
                        controlled: true,
                      },
                    },
                  ],
                  publisherId: '65fb2c2513c3d860ee8d221d',
                  publisher: {
                    _id: '65fb2c2513c3d860ee8d221d',
                    name: 'FJ Response Holding',
                    controlled: true,
                    contractType: 'Original Publisher',
                  },
                },
              ],
              publisherId: '65fb2bf90d0963016511a570',
              publisher: { _id: '65fb2bf90d0963016511a570', name: 'Response Music Scandinavia', controlled: true },
            },
          ],
          totalMechanicalOwnership: 100,
          totalPerformanceOwnership: 100,
          totalMechanicalCollection: 100,
          totalPerformanceCollection: 100,
        },
      ];

      const output = IpChainUtils.separateSpecificChains(rightsChain);

      const subPublisherChain = output[0].children;
      const originalPublisherChain = subPublisherChain[0].children;
      const composerChain = originalPublisherChain[0].children;
      expect(output.length).toBe(1);
      expect(subPublisherChain.length).toBe(1);
      expect(subPublisherChain[0].name).toBe('Response Music Scandinavia'); // Sub Publisher
      expect(originalPublisherChain.length).toBe(1);
      expect(originalPublisherChain[0].name).toBe('FJ Response Holding'); // Original Publisher
      expect(composerChain.length).toBe(1);
      expect(composerChain[0].name).toBe('Kasper Kamnik'); // Original Publisher
    });

    it('should not change a chain that has a publisher and multiple composer children', () => {
      const rightsChain = [
        {
          territory: ['SE'],
          children: [
            {
              type: 'Publisher',
              name: 'Response Music Scandinavia',
              contractType: 'Original Publisher',
              children: [
                {
                  type: 'Composer',
                  name: 'Kasper Kamnik',
                  controlled: true,
                  mechanicalOwnership: 0,
                  mechanicalCollection: 0,
                  performanceOwnership: 25,
                  performanceCollection: 25,
                  contractType: 'Lyrics and Music',
                  children: [],
                  composerId: '6601638dd71990a82e8819a9',
                },
                {
                  type: 'Composer',
                  name: 'Ragnar Lodbrok',
                  controlled: true,
                  mechanicalOwnership: 0,
                  mechanicalCollection: 0,
                  performanceOwnership: 25,
                  performanceCollection: 25,
                  contractType: 'Lyrics and Music',
                  children: [],
                  composerId: '6601638dd71990a82e881910',
                },
              ],
            },
          ],
        },
      ];

      const output = IpChainUtils.separateSpecificChains(rightsChain);

      expect(output.length).toBe(1);
      expect(output[0].children.length).toBe(1); // Original Publisher
      expect(output[0].children[0].children.length).toBe(2); // Composers
    });

    it('should split a chain that has one initial publisher element, and then multiple publishers as children of that publisher', () => {
      // (1) Sub Publisher > Admin > Original Publisher 1 > Composer
      // (2) Sub Publisher > Admin > Original Publisher 2 > Composer
      // (3) Sub Publisher > Admin > Composer
      const rightsChains = [
        {
          territory: 'WW',
          children: [
            {
              type: 'Publisher',
              children: [
                {
                  type: 'Publisher',
                  children: [
                    {
                      type: 'Publisher',
                      children: [
                        {
                          type: 'Composer',
                          composerId: '616036bd1b0180002bbdabe2',
                          contractType: 'Lyrics and Music',
                        },
                      ],
                      publisherId: '6160364ad1a01f00d249f498',
                      contractType: 'Original Publisher',
                    },
                    {
                      type: 'Publisher',
                      children: [
                        {
                          type: 'Composer',
                          composerId: '616036bd1b0180002bbdabe2',
                          contractType: 'Lyrics and Music',
                        },
                      ],
                      publisherId: '61603655c0d44c00255970e2',
                      contractType: 'Original Publisher',
                    },
                    {
                      type: 'Composer',
                      composerId: '616036bd1b0180002bbdabe2',
                      contractType: 'Lyrics and Music',
                    },
                  ],
                  publisherId: '61603636c0d44c00255970b8',
                  contractType: 'Admin',
                },
              ],
              publisherId: '61603511c0d44c0025596e74',
              contractType: 'Sub Publisher',
            },
          ],
        },
      ];

      const output = IpChainUtils.separateSpecificChains(rightsChains);

      expect(output[0].children.length).toBe(3);
    });

    it('should split a chain that has the same initial publisher but different original publisher children (sup-1460)', () => {
      // (1) Sub Publisher 1 > Original Publisher 1 > Composer 1
      // (2) Sub Publisher 2 > Original Publisher 1 > Composer 2
      const rightsChain = [
        {
          territory: 'WW',
          children: [
            {
              type: 'Publisher',
              publisherId: '65fb2bf90d0963016511a570',
              contractType: 'Sub Publisher',
              name: 'Response Music Scandinavia',
              children: [
                {
                  type: 'Publisher',
                  publisherId: '65fb2c2513c3d860ee8d221d',
                  contractType: 'Original Publisher',
                  name: 'FJ Response Holding',
                  children: [
                    {
                      type: 'Composer',
                      composerId: '660408ad241a24e754419f76',
                      contractType: 'Lyrics and Music',
                      name: 'Kasper Kamnik',
                    },
                  ],
                },
              ],
            },
            {
              type: 'Publisher',
              publisherId: '660d775956f691f067ebab62',
              contractType: 'Sub Publisher',
              name: 'Response Music Services',
              children: [
                {
                  type: 'Publisher',
                  publisherId: '65fb2c2513c3d860ee8d221d',
                  contractType: 'Original Publisher',
                  name: 'FJ Response Holding',
                  children: [
                    {
                      type: 'Composer',
                      composerId: '6601638dd71990a82e8819a9',
                      contractType: 'Lyrics and Music',
                      name: 'Sima Jones',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      const output = IpChainUtils.separateSpecificChains(rightsChain);

      const [subPublisher1, subPublisher2] = output[0].children;
      const [originalPublisher1] = subPublisher1.children;
      const [originalPublisher2] = subPublisher2.children;
      const [composer1] = originalPublisher1.children;
      const [composer2] = originalPublisher2.children;
      expect(output[0].children.length).toBe(2);
      expect(subPublisher1.children.length).toBe(1);
      expect(subPublisher1.name).toBe('Response Music Scandinavia');
      expect(subPublisher2.children.length).toBe(1);
      expect(subPublisher2.name).toBe('Response Music Services');
      expect(originalPublisher1.children.length).toBe(1);
      expect(originalPublisher1.name).toBe('FJ Response Holding');
      expect(originalPublisher2.children.length).toBe(1);
      expect(originalPublisher2.name).toBe('FJ Response Holding');
      expect(composer1.name).toBe('Kasper Kamnik');
      expect(composer2.name).toBe('Sima Jones');
    });
  });

  describe('chainToSeparateChains', () => {
    it('should not change a chain with only one path', () => {
      const rightsChain = {
        type: 'Publisher',
        mechanicalCollection: '1',
        performanceCollection: '3',
        publisherId: '2',
        controlled: true,
        contractType: 'Original Publisher',
        children: [
          {
            type: 'Composer',
            composerId: '5',
            controlled: true,
            contractType: 'Lyrics and Music',
            performanceCollection: '20',
            performanceOwnership: '20',
            mechanicalOwnership: '0',
            mechanicalCollection: '0',
          },
        ],
      };

      const output = IpChainUtils.chainToSeparateChains(rightsChain);

      expect(output.length).toBe(1);
      expect(output[0].children.length).toBe(1);
    });

    it('should not change a chain that has a publisher and multiple composer children', () => {
      const rightsChain = {
        type: 'Publisher',
        mechanicalCollection: '1',
        performanceCollection: '3',
        publisherId: '2',
        controlled: true,
        contractType: 'Original Publisher',
        children: [
          {
            type: 'Composer',
            composerId: '5',
            controlled: true,
            contractType: 'Lyrics and Music',
            performanceCollection: '20',
            performanceOwnership: '20',
            mechanicalOwnership: '0',
            mechanicalCollection: '0',
          },
          {
            type: 'Composer',
            composerId: '6',
            controlled: true,
            contractType: 'Lyrics and Music',
            performanceCollection: '20',
            performanceOwnership: '20',
            mechanicalOwnership: '0',
            mechanicalCollection: '0',
          },
        ],
      };

      const output = IpChainUtils.chainToSeparateChains(rightsChain);

      expect(output.length).toBe(1);
      expect(output[0].children.length).toBe(2);
    });

    it('should return two chains when an admin has two publishers beneath it', () => {
      const rightsChain = {
        type: 'Publisher',
        mechanicalCollection: '100',
        performanceCollection: '50',
        publisherId: '1',
        controlled: true,
        contractType: 'Admin',
        children: [
          {
            type: 'Publisher',
            mechanicalCollection: '1',
            performanceCollection: '3',
            publisherId: '2',
            controlled: true,
            contractType: 'Original Publisher',
            children: [
              {
                type: 'Composer',
                composerId: '5',
                controlled: true,
                contractType: 'Lyrics and Music',
                performanceCollection: '20',
                performanceOwnership: '20',
                mechanicalOwnership: '0',
                mechanicalCollection: '0',
              },
              {
                type: 'Composer',
                composerId: '6',
                controlled: true,
                contractType: 'Lyrics and Music',
                performanceCollection: '20',
                performanceOwnership: '20',
                mechanicalOwnership: '0',
                mechanicalCollection: '0',
              },
            ],
          },
          {
            type: 'Publisher',
            mechanicalCollection: '2',
            performanceCollection: '4',
            publisherId: '3',
            controlled: true,
            contractType: 'Original Publisher',
            children: [
              {
                type: 'Composer',
                composerId: '7',
                controlled: true,
                contractType: 'Lyrics and Music',
                performanceCollection: '7',
                performanceOwnership: '77',
                mechanicalOwnership: '777',
                mechanicalCollection: '7777',
              },
              {
                type: 'Composer',
                composerId: '8',
                controlled: true,
                contractType: 'Lyrics and Music',
                performanceCollection: '8',
                performanceOwnership: '88',
                mechanicalOwnership: '888',
                mechanicalCollection: '8888',
              },
            ],
          },
        ],
      };

      const output = IpChainUtils.chainToSeparateChains(rightsChain);

      expect(output.length).toBe(2);
    });

    it('should return three chains when an admin has a subpublisher with two publishers beneath it', () => {
      // (1) Admin > Sub Publisher > Original Publisher > Composers
      // (2) Admin > Original Publisher > Composers
      const rightsChain = {
        type: 'Publisher',
        mechanicalCollection: '100',
        performanceCollection: '50',
        publisherId: '1',
        controlled: true,
        contractType: 'Admin',
        children: [
          {
            type: 'Publisher',
            mechanicalCollection: '1',
            performanceCollection: '3',
            publisherId: '2',
            controlled: true,
            contractType: 'Sub Publisher',
            children: [
              {
                type: 'Publisher',
                mechanicalCollection: '10',
                performanceCollection: '10',
                publisherId: '10',
                controlled: true,
                contractType: 'Original Publisher',
                children: [
                  {
                    type: 'Composer',
                    composerId: '5',
                    controlled: true,
                    contractType: 'Lyrics and Music',
                    performanceCollection: '20',
                    performanceOwnership: '20',
                    mechanicalOwnership: '0',
                    mechanicalCollection: '0',
                  },
                  {
                    type: 'Composer',
                    composerId: '6',
                    controlled: true,
                    contractType: 'Lyrics and Music',
                    performanceCollection: '20',
                    performanceOwnership: '20',
                    mechanicalOwnership: '0',
                    mechanicalCollection: '0',
                  },
                ],
              },
              {
                type: 'Publisher',
                mechanicalCollection: '11',
                performanceCollection: '11',
                publisherId: '11',
                controlled: true,
                contractType: 'Original Publisher',
                children: [
                  {
                    type: 'Composer',
                    composerId: '5',
                    controlled: true,
                    contractType: 'Lyrics and Music',
                    performanceCollection: '20',
                    performanceOwnership: '20',
                    mechanicalOwnership: '0',
                    mechanicalCollection: '0',
                  },
                  {
                    type: 'Composer',
                    composerId: '6',
                    controlled: true,
                    contractType: 'Lyrics and Music',
                    performanceCollection: '20',
                    performanceOwnership: '20',
                    mechanicalOwnership: '0',
                    mechanicalCollection: '0',
                  },
                ],
              },
            ],
          },
          {
            type: 'Publisher',
            mechanicalCollection: '2',
            performanceCollection: '4',
            publisherId: '3',
            controlled: true,
            contractType: 'Original Publisher',
            children: [
              {
                type: 'Composer',
                composerId: '7',
                controlled: true,
                contractType: 'Lyrics and Music',
                performanceCollection: '7',
                performanceOwnership: '77',
                mechanicalOwnership: '777',
                mechanicalCollection: '7777',
              },
              {
                type: 'Composer',
                composerId: '8',
                controlled: true,
                contractType: 'Lyrics and Music',
                performanceCollection: '8',
                performanceOwnership: '88',
                mechanicalOwnership: '888',
                mechanicalCollection: '8888',
              },
            ],
          },
        ],
      };

      const output = IpChainUtils.chainToSeparateChains(rightsChain);

      expect(output.length).toBe(3);
    });
  });

  describe('rightsChainsToObject', () => {
    it('should convert a rights chain to an object format with the correct publisher order', () => {
      const subPublisherName = 'Response Music Scandinavia';
      const originalPublisherName = 'FJ Response Holding';
      const rightsChain = [
        {
          territory: ['SE'],
          children: [
            {
              type: 'Publisher',
              name: subPublisherName,
              controlled: true,
              mechanicalOwnership: 0,
              mechanicalCollection: 100,
              performanceOwnership: 0,
              performanceCollection: 50,
              contractType: 'Sub Publisher',
              children: [
                {
                  type: 'Publisher',
                  name: originalPublisherName,
                  controlled: true,
                  mechanicalOwnership: 100,
                  mechanicalCollection: 0,
                  performanceOwnership: 50,
                  performanceCollection: 0,
                  contractType: 'Original Publisher',
                  children: [
                    {
                      type: 'Composer',
                      name: 'Kasper Kamnik',
                      controlled: true,
                      mechanicalOwnership: 0,
                      mechanicalCollection: 0,
                      performanceOwnership: 50,
                      performanceCollection: 50,
                      contractType: 'Lyrics and Music',
                      children: null,
                      composerId: '6601638dd71990a82e8819a9',
                    },
                  ],
                  publisherId: '65fb2c2513c3d860ee8d221d',
                  publisher: {
                    name: originalPublisherName,
                  },
                },
              ],
              publisherId: '65fb2bf90d0963016511a570',
              publisher: {
                name: subPublisherName,
              },
            },
          ],
          totalMechanicalOwnership: 100,
          totalPerformanceOwnership: 100,
          totalMechanicalCollection: 100,
          totalPerformanceCollection: 100,
        },
      ];

      const output = IpChainUtils.rightsChainsToObject(rightsChain);

      // (1) Nested Original Publisher should be at the top of the object
      // expect(output).toContain(`${originalPublisherName}:${subPublisherName}`);
      expect(Object.keys(output)).toEqual(
        expect.arrayContaining([expect.stringContaining(`${originalPublisherName}:${subPublisherName}`)])
      );
      const originalPublisher = output[`${originalPublisherName}:${subPublisherName}`];
      expect(originalPublisher).toMatchObject({
        mechanicalOwnership: 100,
        mechanicalCollection: 0,
        performanceOwnership: 50,
        performanceCollection: 0,
        contractType: 'Original Publisher',
      });

      // (2) Top-level Sub Publisher should now be nested within the Original Publisher
      const subPublisherKey = IpChainUtils.buildPublisherNextLayerKey(rightsChain[0].children[0]);
      expect(Object.keys(originalPublisher.nextLayers)).toContain(subPublisherKey);
      const subPublisher = originalPublisher.nextLayers[subPublisherKey];
      expect(subPublisher).toMatchObject({
        mechanicalOwnership: 0,
        mechanicalCollection: 100,
        performanceOwnership: 0,
        performanceCollection: 50,
        contractType: 'Sub Publisher',
      });

      // (3) Composers should not be included on publishers (they are stored in a different variable)
      expect(subPublisher).not.toContain('children', 'composer', 'composers');
    });

    it('should not merge original publishers that have different nested paths (sup-1460)', () => {
      // (1) — Sub Publisher 1 > Original Publisher 1 > Composer 1
      // (2) — Sub Publisher 2 > Original Publisher 1 > Composer 2
      const subPublisher1Name = 'Response Music Scandinavia';
      const subPublisher2Name = 'Response Music Services';
      const originalPublisherName = 'FJ Response Holding';
      const rightsChain = [
        {
          territory: ['SE'],
          children: [
            {
              type: 'Publisher',
              name: subPublisher1Name,
              controlled: true,
              mechanicalOwnership: 0,
              mechanicalCollection: 50,
              performanceOwnership: 0,
              performanceCollection: 25,
              contractType: 'Sub Publisher',
              children: [
                {
                  type: 'Publisher',
                  name: originalPublisherName,
                  controlled: true,
                  mechanicalOwnership: 50,
                  mechanicalCollection: 0,
                  performanceOwnership: 25,
                  performanceCollection: 0,
                  contractType: 'Original Publisher',
                  children: [
                    {
                      type: 'Composer',
                      name: 'Kasper Kamnik',
                      controlled: true,
                      mechanicalOwnership: 0,
                      mechanicalCollection: 0,
                      performanceOwnership: 25,
                      performanceCollection: 25,
                      contractType: 'Lyrics and Music',
                      children: null,
                      composerId: '6601638dd71990a82e8819a9',
                    },
                  ],
                  publisherId: '65fb2c2513c3d860ee8d221d',
                  publisher: {
                    name: originalPublisherName,
                  },
                },
              ],
              publisherId: '65fb2bf90d0963016511a570',
              publisher: {
                name: subPublisher1Name,
              },
            },
            {
              type: 'Publisher',
              name: subPublisher2Name,
              controlled: true,
              mechanicalOwnership: 0,
              mechanicalCollection: 50,
              performanceOwnership: 0,
              performanceCollection: 25,
              contractType: 'Sub Publisher',
              children: [
                {
                  type: 'Publisher',
                  name: originalPublisherName,
                  controlled: true,
                  mechanicalOwnership: 50,
                  mechanicalCollection: 0,
                  performanceOwnership: 25,
                  performanceCollection: 0,
                  contractType: 'Original Publisher',
                  children: [
                    {
                      type: 'Composer',
                      name: 'Sima Jones',
                      controlled: true,
                      mechanicalOwnership: 0,
                      mechanicalCollection: 0,
                      performanceOwnership: 25,
                      performanceCollection: 25,
                      contractType: 'Lyrics and Music',
                      children: null,
                      composerId: '660408ad241a24e754419f76',
                    },
                  ],
                  publisherId: '65fb2c2513c3d860ee8d221d',
                  publisher: {
                    name: originalPublisherName,
                  },
                },
              ],
              publisherId: '660d775956f691f067ebab62',
              publisher: {
                name: subPublisher2Name,
              },
            },
          ],
          totalMechanicalOwnership: 100,
          totalPerformanceOwnership: 100,
          totalMechanicalCollection: 100,
          totalPerformanceCollection: 100,
        },
      ];

      const output = IpChainUtils.rightsChainsToObject(rightsChain);

      // (1) Nested Original Publishers should be at the top of the object
      const key1 = `${originalPublisherName}:${subPublisher1Name}`;
      const key2 = `${originalPublisherName}:${subPublisher2Name}`;
      expect(Object.keys(output)).toContain(key1);
      expect(Object.keys(output)).toContain(key2);
      const expectedOriginalPublisher = {
        name: originalPublisherName,
        mechanicalOwnership: 50,
        mechanicalCollection: 0,
        performanceOwnership: 25,
        performanceCollection: 0,
        contractType: 'Original Publisher',
      };
      expect(output[key1]).toMatchObject(expectedOriginalPublisher);
      expect(output[key2]).toMatchObject(expectedOriginalPublisher);

      // (2) Top-level Sub Publishers should be nested within their respective Original Publishers
      const subPublisher1Key = IpChainUtils.buildPublisherNextLayerKey(rightsChain[0].children[0]);
      const subPublisher2Key = IpChainUtils.buildPublisherNextLayerKey(rightsChain[0].children[1]);
      expect(Object.keys(output[key1].nextLayers)).toContain(subPublisher1Key);
      expect(Object.keys(output[key2].nextLayers)).toContain(subPublisher2Key);
      // Original Publisher > Sub Publisher 1
      const subPublisher1 = output[key1].nextLayers[subPublisher1Key];
      expect(subPublisher1).toMatchObject({
        name: subPublisher1Name,
        mechanicalOwnership: 0,
        mechanicalCollection: 50,
        performanceOwnership: 0,
        performanceCollection: 25,
        contractType: 'Sub Publisher',
      });
      // Original Publisher > Sub Publisher 2
      const subPublisher2 = output[key2].nextLayers[subPublisher2Key];
      expect(subPublisher2).toMatchObject({
        name: subPublisher2Name,
        mechanicalOwnership: 0,
        mechanicalCollection: 50,
        performanceOwnership: 0,
        performanceCollection: 25,
        contractType: 'Sub Publisher',
      });
    });

    it('should correctly parse collection values that are <1% (cur-3305)', () => {
      const rightsChain = [
        {
          territory: ['WW'],
          children: [
            {
              type: 'Publisher',
              name: 'Tomorrow Publishing',
              controlled: true,
              mechanicalOwnership: 0.5,
              mechanicalCollection: 0.25,
              performanceOwnership: 0.5,
              performanceCollection: 0.25,
              contractType: 'Original Publisher',
              children: [
                {
                  type: 'Composer',
                  name: 'Elton John',
                  controlled: true,
                  mechanicalOwnership: 0,
                  mechanicalCollection: 0.25,
                  performanceOwnership: 0,
                  performanceCollection: 0.25,
                  contractType: 'Lyrics and Music',
                  children: null,
                  composerId: '6601638dd71990a82e8819a9',
                },
              ],
              publisherId: '65fb2bf90d0963016511a570',
            },
            {
              type: 'Composer',
              name: 'Paul McCartney',
              controlled: false,
              mechanicalOwnership: 99.5,
              mechanicalCollection: 99.5,
              performanceOwnership: 99.5,
              performanceCollection: 99.5,
              contractType: 'Lyrics and Music',
              children: null,
              composerId: '6601638dd71990a82e8819a9',
            },
          ],
          totalMechanicalOwnership: 100,
          totalPerformanceOwnership: 100,
          totalMechanicalCollection: 100,
          totalPerformanceCollection: 100,
        },
      ];

      const output = IpChainUtils.rightsChainsToObject(rightsChain);
      const publisher = output['Tomorrow Publishing'];

      // Collection values should be parsed correctly and not converted to 0
      expect(publisher.territoryCollection).toEqual({
        WW: { mechanicalCollection: 0.25, performanceCollection: 0.25 },
      });
      expect(publisher).toMatchObject({
        mechanicalOwnership: 0.5,
        mechanicalCollection: 0.25,
        performanceOwnership: 0.5,
        performanceCollection: 0.25,
      });
      // Territories depend on collection values and should be all world, not empty
      expect(publisher.totalTerritories).toEqual(['WW']);
      expect(publisher.territory).toEqual(CISAC_APPROVED_COUNTRIES_CODES);
    });

    it('should support a chain with nested Income Participant > Original Publisher > Composer (cur-2162)', () => {
      const incomeParticipantName = 'Income Participant';
      const originalPublisherName = 'Original Publisher';
      const rightsChain = [
        {
          territory: ['SE'],
          children: [
            {
              type: 'Publisher',
              name: incomeParticipantName,
              controlled: true,
              mechanicalOwnership: 0,
              mechanicalCollection: 100,
              performanceOwnership: 0,
              performanceCollection: 50,
              contractType: 'Income Participant',
              children: [
                {
                  type: 'Publisher',
                  name: originalPublisherName,
                  controlled: true,
                  mechanicalOwnership: 100,
                  mechanicalCollection: 0,
                  performanceOwnership: 50,
                  performanceCollection: 0,
                  contractType: 'Original Publisher',
                  children: [
                    {
                      type: 'Composer',
                      name: 'Kasper Kamnik',
                      controlled: true,
                      mechanicalOwnership: 0,
                      mechanicalCollection: 0,
                      performanceOwnership: 50,
                      performanceCollection: 50,
                      contractType: 'Lyrics and Music',
                      children: null,
                      composerId: '6601638dd71990a82e8819a9',
                    },
                  ],
                  publisherId: '65fb2c2513c3d860ee8d221d',
                  publisher: {
                    name: originalPublisherName,
                  },
                },
              ],
              publisherId: '65fb2bf90d0963016511a570',
              publisher: {
                name: incomeParticipantName,
              },
            },
          ],
          totalMechanicalOwnership: 100,
          totalPerformanceOwnership: 100,
          totalMechanicalCollection: 100,
          totalPerformanceCollection: 100,
        },
      ];

      const output = IpChainUtils.rightsChainsToObject(rightsChain);

      const key = `${originalPublisherName}:${incomeParticipantName}`;
      expect(output).toHaveProperty(key);
      expect(output[key]).toMatchObject({ contractType: 'Original Publisher' });
      const nextLayerKey = `${incomeParticipantName}Income Participant50100`;
      expect(output[`${originalPublisherName}:${incomeParticipantName}`].nextLayers).toHaveProperty(nextLayerKey);
      expect(output[key].nextLayers[nextLayerKey]).toMatchObject({ contractType: 'Income Participant' });
    });

    it('should use "publisher.name" if "name" is not defined for nested publishers', () => {
      const rightsChain = [
        {
          territory: ['SE'],
          children: [
            {
              type: 'Publisher',
              contractType: 'Sub Publisher',
              children: [
                {
                  type: 'Publisher',
                  contractType: 'Original Publisher',
                  children: [],
                  publisherId: '65fb2c2513c3d860ee8d221d',
                  publisher: { name: 'FJ Response Holding' },
                },
              ],
              publisherId: '65fb2bf90d0963016511a570',
              publisher: { name: 'FJ Response Music' },
            },
          ],
        },
      ];

      const output = IpChainUtils.rightsChainsToObject(rightsChain);
      expect(output).toHaveProperty('FJ Response Holding:FJ Response Music');
    });

    it('should return two publishers when the same publisher exists on a rights chain as controlled and uncontrolled', () => {
      let controlledPublisher = null;
      let uncontrolledPublisher = null;

      const rightsChain = [
        {
          territory: 'WW',
          children: [
            {
              type: 'Publisher',
              mechanicalCollection: 50,
              performanceCollection: 25,
              children: [
                {
                  type: 'Composer',
                  composerId: '6645d97ad8f0e2b9478b7ad7',
                  controlled: true,
                  contractType: 'Lyrics and Music',
                  mechanicalOwnership: 0,
                  performanceOwnership: 25,
                  mechanicalCollection: 0,
                  performanceCollection: 25,
                  cae: '00874512963',
                  name: 'Composer One IPI NS',
                  caeNumber: '00874512963',
                },
              ],
              publisherId: '6645d97ad8f0e2b9478b7ad4',
              controlled: true,
              contractType: 'Original Publisher',
              mechanicalOwnership: 50,
              performanceOwnership: 25,
              name: 'Original Publisher One IPI NS',
              caeNumber: '00384756291',
            },
            {
              type: 'Publisher',
              mechanicalCollection: 50,
              performanceCollection: 25,
              children: [
                {
                  type: 'Composer',
                  composerId: '6645d97ad8f0e2b9478b7ada',
                  controlled: false,
                  contractType: 'Lyrics and Music',
                  mechanicalOwnership: 0,
                  performanceOwnership: 25,
                  mechanicalCollection: 0,
                  performanceCollection: 25,
                  cae: '00874209635',
                  name: 'Composer Two IPI NS',
                  caeNumber: '00874209635',
                },
              ],
              publisherId: '6645d97ad8f0e2b9478b7ad4',
              controlled: false,
              contractType: 'Original Publisher',
              mechanicalOwnership: 50,
              performanceOwnership: 25,
              name: 'Original Publisher One IPI NS',
              caeNumber: '00384756291',
            },
          ],
          totalMechanicalOwnership: 100,
          totalPerformanceOwnership: 100,
          totalMechanicalCollection: 100,
          totalPerformanceCollection: 100,
          mechanicalCollection: 0,
          mechanicalOwnership: 0,
          performanceCollection: 0,
          performanceOwnership: 0,
        },
      ];

      rightsChain[0].children.forEach((publisher) => {
        if (publisher.controlled) {
          controlledPublisher = publisher;
        } else {
          uncontrolledPublisher = publisher;
        }
      });

      const output = IpChainUtils.rightsChainsToObject(rightsChain); // this chain has the same publisher twice, once controlled and once uncontrolled

      // Ensure the controlled and uncontrolled publishers are properly handled
      expect(controlledPublisher).not.toBeNull();
      expect(uncontrolledPublisher).not.toBeNull();
      const uncontrolledPublisherKey = `${uncontrolledPublisher.name}: uncontrolled`;
      expect(output[controlledPublisher.name]).toEqual(controlledPublisher);
      expect(output[uncontrolledPublisherKey]).toEqual(uncontrolledPublisher);
      expect(output[uncontrolledPublisherKey].controlled).toEqual(false);
      // Check that the output contains exactly two entries
      const outputLength = Object.keys(output).length;
      expect(outputLength).toBe(2);
    });
  });

  describe('getPublisherFromComposer', () => {
    it('should match a publisher for a composer based on the interested party & sequence no.', () => {
      // Fields omitted from both objects for clarity
      const composerData = {
        interestedPartyNo: 'C00000018',
        publishers: [
          {
            interestedPartyNo: 'P00000003',
            publisherSequence: '02',
          },
        ],
      };
      const publisher = {
        type: 'Publisher',
        interestedPartyNo: 'P00000003',
      };
      // The Publisher sequence to match on
      const publisherSequence = '02';
      const publisherForComposer = IpChainUtils.getPublisherFromComposer(composerData, publisher, publisherSequence);
      expect(publisherForComposer).toEqual(composerData.publishers[0]);
    });

    it('should not match a publisher when the sequence no. is different', () => {
      // Fields omitted from both objects for clarity
      const composerData = {
        interestedPartyNo: 'C00000018',
        publishers: [
          {
            interestedPartyNo: 'P00000003',
            publisherSequence: '02',
          },
        ],
      };
      const publisher = { type: 'Publisher', interestedPartyNo: 'P00000003' };
      // The Publisher sequence to match on (in this test it differs to the value defined on composerData)
      const publisherSequence = '01';
      const publisherForComposer = IpChainUtils.getPublisherFromComposer(composerData, publisher, publisherSequence);
      expect(publisherForComposer).toBeUndefined();
    });

    it('should not use the publisher sequence if undefined on the publisher (cwr version 2.1)', () => {
      // Fields omitted from both objects for clarity
      const composerData = { interestedPartyNo: 'C00000018', publishers: [{ interestedPartyNo: 'P00000003' }] };
      const publisher = { type: 'Publisher', interestedPartyNo: 'P00000003' };
      // The Publisher sequence to match on
      const publisherSequence = '01';
      const publisherForComposer = IpChainUtils.getPublisherFromComposer(composerData, publisher, publisherSequence);
      expect(publisherForComposer).toEqual(composerData.publishers[0]);
    });

    it('should return nothing if no publishers are linked to the composer', () => {
      const composerData = { interestedPartyNo: 'C00000018', publishers: [] };
      const publisherForComposer = IpChainUtils.getPublisherFromComposer(composerData, {}, '01');
      expect(publisherForComposer).toBeUndefined();
    });

    it('should match a publisher using the interested party no. if the publisher sequence is an empty string', () => {
      // Fields omitted from both objects for clarity
      const composerData = {
        interestedPartyNo: 'C00000018',
        publishers: [{ interestedPartyNo: 'P00000003', publisherSequence: '' }],
      };
      const publisher = { type: 'Publisher', interestedPartyNo: 'P00000003' };
      const publisherForComposer = IpChainUtils.getPublisherFromComposer(composerData, publisher);
      expect(publisherForComposer).toEqual(composerData.publishers[0]);
    });
  });

  describe('createPublisherForChain', () => {
    it('should return true if the publisher is a valid Publisher type for starting a chain', () => {
      const tests = [
        { publisherType: 'E', lineType: 'SPU' }, // Original Publisher
        { publisherType: 'AM', lineType: 'SPU' }, // Admin
        { publisherType: 'PA', lineType: 'SPU' }, // Income Participant
        { publisherType: 'SE', lineType: 'SPU' }, // Sub Publisher
      ];
      for (const publisherTest of tests) {
        expect(IpChainUtils.createPublisherForChain(publisherTest, ['WW'])).toBeTruthy();
      }
    });

    it('should return false if no common territories exist', () => {
      expect(IpChainUtils.createPublisherForChain({ lineType: 'SPU' }, undefined)).toBeFalsy();
    });
  });

  describe('getSubPublishedOriginalPublishers', () => {
    it('should return duplicate Original Publishers where one is sub-published in another chain', () => {
      const rightsChainObject = {
        'Original Publisher 1': {
          contractType: Publisher.ContractType.OriginalPublisher,
        },
        'Original Publisher 1:Sub Publisher 1': {
          contractType: Publisher.ContractType.OriginalPublisher,
          nextLayers: {
            'Sub Publisher 1': { contractType: Publisher.ContractType.SubPublisher },
          },
        },
      };
      const subPublished = IpChainUtils.getSubPublishedOriginalPublishers(rightsChainObject);
      expect(subPublished).toEqual(['Original Publisher 1']);
    });

    it('should return nothing when Original Publishers are not sub-published in another chain', () => {
      const rightsChainObject = {
        'Original Publisher 1': {
          contractType: Publisher.ContractType.OriginalPublisher,
        },
        'Original Publisher 2:Sub Publisher 1': {
          contractType: Publisher.ContractType.OriginalPublisher,
          nextLayers: {
            'Sub Publisher 1': {
              contractType: Publisher.ContractType.SubPublisher,
            },
          },
        },
      };
      const subPublished = IpChainUtils.getSubPublishedOriginalPublishers(rightsChainObject);
      expect(subPublished).toEqual([]);
    });

    it('should return nothing when duplicate Original Publishers have distinct sub-publisher chains', () => {
      const rightsChainObject = {
        'Original Publisher 1:Sub Publisher 1': {
          contractType: Publisher.ContractType.OriginalPublisher,
          nextLayers: {
            'Sub Publisher 1': {
              contractType: Publisher.ContractType.SubPublisher,
            },
          },
        },
        'Original Publisher 1:Sub Publisher 2': {
          contractType: Publisher.ContractType.OriginalPublisher,
          nextLayers: {
            'Sub Publisher 2': {
              contractType: Publisher.ContractType.SubPublisher,
            },
          },
        },
      };
      const subPublished = IpChainUtils.getSubPublishedOriginalPublishers(rightsChainObject);
      expect(subPublished).toEqual([]);
    });
  });

  describe('getScoredTerritories', () => {
    it('should return the max score for a chain that exactly matches the delivery territory', () => {
      const scores = IpChainUtils.getScoredTerritories([{ territory: 'NL' }], ['NL']);
      expect(scores).toEqual([{ territory: ['NL'], score: 1_000_000, newTerritories: ['NL'] }]);
    });

    it('should give no score to a chain with no match to the delivery territory', () => {
      const scores = IpChainUtils.getScoredTerritories([{ territory: 'DK' }], ['NO']);
      expect(scores).toHaveLength(0);
    });

    it('should rank multiple chains by score depending on how closely they match the delivery territory', () => {
      const scores = IpChainUtils.getScoredTerritories(
        [{ territory: 'NL' }, { territory: 'WW' }, { territory: 'Europe' }],
        ['Europe']
      );
      const europeExcludingNL = Object.values(TerritoryHelper.europe).filter((t) => t !== 'NL');
      expect(scores).toEqual([
        { territory: ['NL'], score: 1_000_000, newTerritories: ['NL'] },
        {
          territory: europeExcludingNL,
          score: 45,
          newTerritories: europeExcludingNL,
          territoryCodes: { name: europeExcludingNL.join(', '), codes: europeExcludingNL },
        },
      ]);
    });

    it('should handle multiple territories for a single chain and rank single territory chains higher', () => {
      const scores = IpChainUtils.getScoredTerritories(
        [{ territory: ['SE', 'DK', 'NO'] }, { territory: 'NL' }, { territory: 'US' }],
        Object.values(TerritoryHelper.europe)
      );
      expect(scores).toEqual([
        { territory: ['NL'], score: 1_000_000, newTerritories: ['NL'] },
        { territory: ['DK', 'NO', 'SE'], score: 300_000, newTerritories: ['DK', 'NO', 'SE'] },
      ]);
    });

    it('should use a matching territory group for a territory that has no exact match in the chain', () => {
      const scores = IpChainUtils.getScoredTerritories(
        [{ territory: Object.values(TerritoryHelper.europe), isTerritoryGroup: true }, { territory: ['GB', 'IE'] }],
        ['GB', 'IE', 'FR']
      );
      expect(scores).toEqual([
        {
          territory: ['GB', 'IE'],
          score: 400_000,
          newTerritories: ['GB', 'IE'],
        },
        {
          isTerritoryGroup: true,
          newTerritories: ['FR'],
          score: 100,
          territory: ['FR'],
        },
      ]);
    });

    it('should give a higher score to a specific territory match over an entire continent (Europe delivery)', () => {
      const scores = IpChainUtils.getScoredTerritories(
        [{ territory: Object.values(TerritoryHelper.europe), isTerritoryGroup: true }, { territory: ['GB', 'NL'] }],
        ['Europe']
      );
      const europeExcludingSpecific = Object.values(TerritoryHelper.europe).filter((t) => t !== 'NL' && t !== 'GB');
      expect(scores).toEqual([
        {
          territory: ['NL', 'GB'],
          score: 400_000,
          newTerritories: ['NL', 'GB'],
        },
        {
          territory: europeExcludingSpecific,
          isTerritoryGroup: true,
          score: 4300,
          newTerritories: europeExcludingSpecific,
        },
      ]);
    });

    it('should give a higher score to a specific territory match over an entire continent (specific delivery)', () => {
      const rightsChain = [
        { territory: Object.values(TerritoryHelper.europe), isTerritoryGroup: true },
        { territory: ['ES'] },
      ];
      const scores = IpChainUtils.getScoredTerritories(rightsChain, ['ES', 'IT']);
      expect(scores).toEqual([
        // Highest score for ES as an exact match
        { territory: ['ES'], score: 1_000_000, newTerritories: ['ES'] },
        // Lower score for IT as matched within the Europe chain
        { territory: ['IT'], isTerritoryGroup: true, score: 100, newTerritories: ['IT'] },
      ]);
    });

    it('should give a higher score to a specific territory match over an entire continent (specific delivery) (CUR-3490)', () => {
      const rightsChain = [
        { territory: ['IT', 'ES', 'GB', 'US'] },
        { territory: ['ES', 'CA', 'US'] },
        { territory: ['GB', 'ES'] },
      ];
      const scores = IpChainUtils.getScoredTerritories(rightsChain, ['IT', 'ES', 'GB']);
      expect(scores).toEqual([
        // Highest score for the ES + GB chain as it's the most specific (least territories included)
        { territory: ['ES', 'GB'], score: 400_000, newTerritories: ['ES', 'GB'] },
        // Italy only matched in the first chain
        { territory: ['IT'], score: 100_000, newTerritories: ['IT'] },
      ]);
    });

    it('should give a higher score to a specific match over a continent when they are territory groups', () => {
      const rightsChain = [
        { id: 1, territory: Object.values(TerritoryHelper.europe), isTerritoryGroup: true },
        { id: 2, territory: ['GB', 'NL'], isTerritoryGroup: true },
        { id: 3, territory: ['ES'] },
      ];
      const scores = IpChainUtils.getScoredTerritories(rightsChain, ['GB']);
      expect(scores).toEqual([
        {
          id: 2,
          territory: ['GB'],
          isTerritoryGroup: true,
          score: 100,
          newTerritories: ['GB'],
        },
      ]);
    });
  });

  describe('combineDuplicatePublishers', () => {
    it('should not modify the chain at all if no duplicate publishers', () => {
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
    });

    it('should combine duplicate publishers and merge their children', () => {
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
          children: [
            { name: 'comp1', type: 'Composer', children: [] },
            { name: 'comp2', type: 'Composer', children: [] },
          ],
          mechanicalOwnership: 100,
          mechanicalCollection: 100,
          performanceOwnership: 100,
          performanceCollection: 100,
        },
      ]);
    });

    it('should combine nested duplicate publishers and merge their children (1)', () => {
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
              children: [{ name: 'comp3', type: 'Composer', children: [] }],
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
    });

    it('should combine nested duplicate publishers and merge their children (2)', () => {
      const chain = [
        {
          name: 'pub1',
          type: 'Publisher',
          children: [
            {
              name: 'pub2',
              type: 'Publisher',
              children: [{ name: 'comp1', type: 'Composer', children: [] }],
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
              children: [{ name: 'comp1', type: 'Composer', children: [] }],
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
              children: [{ name: 'comp1', type: 'Composer', children: [] }],
              mechanicalOwnership: 100,
              mechanicalCollection: 100,
              performanceOwnership: 100,
              performanceCollection: 100,
            },
          ],
        },
      ]);
    });

    it('should total the ip chain values when combining', () => {
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
    });

    it('should not combine parent publishers if they have different child publishers (sup-1164)', () => {
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
          children: [{ name: 'comp3', type: 'Composer', children: [] }],
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
          children: [{ name: 'comp3', type: 'Composer', children: [] }],
          mechanicalOwnership: 25,
          mechanicalCollection: 25,
          performanceOwnership: 25,
          performanceCollection: 25,
        },
        {
          name: 'pub4',
          type: 'Publisher',
          children: [
            { name: 'comp4', type: 'Composer', children: [] },
            { name: 'comp5', type: 'Composer', children: [] },
          ],
          mechanicalOwnership: 25,
          mechanicalCollection: 25,
          performanceOwnership: 25,
          performanceCollection: 25,
        },
      ]);
    });

    it('should not combine duplicate publishers if they have a different contractType', () => {
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
    });

    it('should not combine nested duplicate publishers if they have a different contractType', () => {
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
          contractType: 'Sub-Publisher',
          children: [
            {
              name: 'pub2',
              type: 'Publisher',
              contractType: 'Sub-Publisher',
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
          contractType: 'Sub-Publisher',
          children: [
            {
              name: 'pub2',
              type: 'Publisher',
              contractType: 'Sub-Publisher',
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
      ]);
    });

    it('should not combine nested publishers if they have different child publisher & composer combinations', () => {
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
    });

    it('should not combine composers if they have the same publisher but different contract types', () => {
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
    });

    it('should still work as expected when the only unique field is the publisher id', () => {
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
    });

    it('should still work as expected when the only unique field is the composer id', () => {
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
    });

    it('should make sure performance and mechanical percentages are numbers before totalling (when coming from the frontend)', () => {
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
          children: [
            { name: 'comp1', type: 'Composer', children: [] },
            { name: 'comp2', type: 'Composer', children: [] },
          ],
          mechanicalOwnership: 100,
          mechanicalCollection: 100,
          performanceOwnership: 100,
          performanceCollection: 100,
        },
      ]);
    });

    it('should not combine composers at the top level of the chain', () => {
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
    });

    it('should return the correct path when a Publisher has no child Composer', () => {
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
    });

    it('should return the correct path when a Publisher has a blank array of children', () => {
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
    });

    it('should not modify the chain when a composer is owned by a top level sub-publisher (SUP-1395)', () => {
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
              performanceCollection: 0,
            },
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
    });

    it('should not error when a top-level publisher has no children or they include null (SUP-1408)', () => {
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
    });

    it('should not modify the chain at all if there are duplicate original publishers but one is layered underneath a separate publisher', () => {
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
});
