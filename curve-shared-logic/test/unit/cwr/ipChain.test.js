process.env.NODE_ENV = 'test';
const { expect } = require('chai');
const IpChainUtils = require('../../../libs/cwr/ipChain');
const TestWorks = require('../../data/works-p1.json');
const { CISAC_APPROVED_COUNTRIES_CODES } = require('../../../libs/cwr/territories');
const Publisher = require('../../../libs/cwr/publisher');
const TerritoryHelper = require('../../../libs/territoryHelper');

describe('IpChainUtils', () => {
  describe('separateSpecificChains', () => {
    it('should not change a chain with only one path', (done) => {
      // Arrange — Sub Publisher > Original Publisher > Composer
      const rightsChain = [
        {
          territory: [
            'AR',
            'GB',
          ],
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
              publisher: {
                _id: '65fb2bf90d0963016511a570',
                name: 'Response Music Scandinavia',
                controlled: true,
              },
            },
          ],
          totalMechanicalOwnership: 100,
          totalPerformanceOwnership: 100,
          totalMechanicalCollection: 100,
          totalPerformanceCollection: 100,
        },
      ];
      // Act
      const output = IpChainUtils.separateSpecificChains(rightsChain);
      // Assert
      const subPublisherChain = output[0].children;
      const originalPublisherChain = subPublisherChain[0].children;
      const composerChain = originalPublisherChain[0].children;
      expect(output.length).to.eq(1);
      expect(subPublisherChain.length).to.eq(1);
      expect(subPublisherChain[0].name).to.eq('Response Music Scandinavia'); // Sub Publisher
      expect(originalPublisherChain.length).to.eq(1);
      expect(originalPublisherChain[0].name).to.eq('FJ Response Holding'); // Original Publisher
      expect(composerChain.length).to.eq(1);
      expect(composerChain[0].name).to.eq('Kasper Kamnik'); // Original Publisher
      done();
    });

    it('should not change a chain that has a publisher and multiple composer children', (done) => {
      // Arrange — > Original Publisher > Composers
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
      // Act
      const output = IpChainUtils.separateSpecificChains(rightsChain);
      // Assert
      expect(output.length).to.eq(1);
      expect(output[0].children.length).to.eq(1); // Original Publisher
      expect(output[0].children[0].children.length).to.eq(2); // Composers
      done();
    });

    it('should split a chain that has one initial publisher element, and then multiple publishers as children of that publisher', (done) => {
      // Arrange
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
      // Act
      const output = IpChainUtils.separateSpecificChains(rightsChains);
      // Assert
      expect(output[0].children.length).to.eq(3);
      done();
    });

    it('should split a chain that has the same initial publisher but different original publisher children (sup-1460)', (done) => {
      // Arrange
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
      // Act
      const output = IpChainUtils.separateSpecificChains(rightsChain);
      // Assert
      const [subPublisher1, subPublisher2] = output[0].children;
      const [originalPublisher1] = subPublisher1.children;
      const [originalPublisher2] = subPublisher2.children;
      const [composer1] = originalPublisher1.children;
      const [composer2] = originalPublisher2.children;
      expect(output[0].children.length).to.eq(2);
      expect(subPublisher1.children.length).to.eq(1);
      expect(subPublisher1.name).to.eq('Response Music Scandinavia');
      expect(subPublisher2.children.length).to.eq(1);
      expect(subPublisher2.name).to.eq('Response Music Services');
      expect(originalPublisher1.children.length).to.eq(1);
      expect(originalPublisher1.name).to.eq('FJ Response Holding');
      expect(originalPublisher2.children.length).to.eq(1);
      expect(originalPublisher2.name).to.eq('FJ Response Holding');
      expect(composer1.name).to.eq('Kasper Kamnik');
      expect(composer2.name).to.eq('Sima Jones');
      done();
    });
  });

  describe('chainToSeparateChains', () => {
    it('should not change a chain with only one path', (done) => {
      // Arrange — Original Publisher > Composer
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
      // Act
      const output = IpChainUtils.chainToSeparateChains(rightsChain);
      // Assert
      expect(output.length).to.eq(1);
      expect(output[0].children.length).to.eq(1);
      done();
    });

    it('should not change a chain that has a publisher and multiple composer children', (done) => {
      // Arrange — Original Publisher > Composers
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
      // Act
      const output = IpChainUtils.chainToSeparateChains(rightsChain);
      // Assert
      expect(output.length).to.eq(1);
      expect(output[0].children.length).to.eq(2);
      done();
    });

    it('should return two chains when an admin has two publishers beneath it', (done) => {
      // Arrange — Admin > Original Publishers > Composers
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
      // Act
      const output = IpChainUtils.chainToSeparateChains(rightsChain);
      // Assert
      expect(output.length).to.eq(2);
      done();
    });

    it('should return three chains when an admin has a subpublisher with two publishers beneath it', (done) => {
      // Arrange
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
      // Act
      const output = IpChainUtils.chainToSeparateChains(rightsChain);
      // Assert
      expect(output.length).to.eq(3);
      done();
    });
  });

  describe('rightsChainsToObject', () => {
    it('should convert a rights chain to an object format with the correct publisher order', (done) => {
      // Arrange — Sub Publisher > Original Publisher > Composer
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
      // Act
      const output = IpChainUtils.rightsChainsToObject(rightsChain);

      // Assert
      // (1) Nested Original Publisher should be at the top of the object
      expect(output).to.have.key(`${originalPublisherName}:${subPublisherName}`);
      const originalPublisher = output[`${originalPublisherName}:${subPublisherName}`];
      expect(originalPublisher).to.include({
        mechanicalOwnership: 100,
        mechanicalCollection: 0,
        performanceOwnership: 50,
        performanceCollection: 0,
        contractType: 'Original Publisher',
      });

      // (2) Top-level Sub Publisher should now be nested within the Original Publisher
      const subPublisherKey = IpChainUtils.buildPublisherNextLayerKey(rightsChain[0].children[0]);
      expect(originalPublisher.nextLayers).to.have.key(subPublisherKey);
      const subPublisher = originalPublisher.nextLayers[subPublisherKey];
      expect(subPublisher).to.include({
        mechanicalOwnership: 0,
        mechanicalCollection: 100,
        performanceOwnership: 0,
        performanceCollection: 50,
        contractType: 'Sub Publisher',
      });

      // (3) Composers should not be included on publishers (they are stored in a different variable)
      expect(subPublisher).to.not.have.keys('children', 'composer', 'composers');
      done();
    });

    it('should not merge original publishers that have different nested paths (sup-1460)', (done) => {
      // Arrange
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
      // Act
      const output = IpChainUtils.rightsChainsToObject(rightsChain);

      // Assert
      // (1) Nested Original Publishers should be at the top of the object
      const key1 = `${originalPublisherName}:${subPublisher1Name}`;
      const key2 = `${originalPublisherName}:${subPublisher2Name}`;
      expect(output).to.have.keys(key1, key2);
      const expectedOriginalPublisher = {
        name: originalPublisherName,
        mechanicalOwnership: 50,
        mechanicalCollection: 0,
        performanceOwnership: 25,
        performanceCollection: 0,
        contractType: 'Original Publisher',
      };
      expect(output[key1]).to.include(expectedOriginalPublisher);
      expect(output[key2]).to.include(expectedOriginalPublisher);

      // (2) Top-level Sub Publishers should be nested within their respective Original Publishers
      const subPublisher1Key = IpChainUtils.buildPublisherNextLayerKey(rightsChain[0].children[0]);
      const subPublisher2Key = IpChainUtils.buildPublisherNextLayerKey(rightsChain[0].children[1]);
      expect(output[key1].nextLayers).to.have.key(subPublisher1Key);
      expect(output[key2].nextLayers).to.have.key(subPublisher2Key);
      // Original Publisher > Sub Publisher 1
      const subPublisher1 = output[key1].nextLayers[subPublisher1Key];
      expect(subPublisher1).to.include({
        name: subPublisher1Name,
        mechanicalOwnership: 0,
        mechanicalCollection: 50,
        performanceOwnership: 0,
        performanceCollection: 25,
        contractType: 'Sub Publisher',
      });
      // Original Publisher > Sub Publisher 2
      const subPublisher2 = output[key2].nextLayers[subPublisher2Key];
      expect(subPublisher2).to.include({
        name: subPublisher2Name,
        mechanicalOwnership: 0,
        mechanicalCollection: 50,
        performanceOwnership: 0,
        performanceCollection: 25,
        contractType: 'Sub Publisher',
      });
      done();
    });

    it('should correctly parse collection values that are <1% (cur-3305)', (done) => {
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
      expect(publisher.territoryCollection).to.eql({ WW: { mechanicalCollection: 0.25, performanceCollection: 0.25 } });
      expect(publisher).to.include({
        mechanicalOwnership: 0.5,
        mechanicalCollection: 0.25,
        performanceOwnership: 0.5,
        performanceCollection: 0.25,
      });
      // Territories depend on collection values and should be all world, not empty
      expect(publisher.totalTerritories).to.eql(['WW']);
      expect(publisher.territory).to.eql(CISAC_APPROVED_COUNTRIES_CODES);

      done();
    });

    it('should support a chain with nested Income Participant > Original Publisher > Composer (cur-2162)', (done) => {
      // Arrange — Income Participant > Original Publisher > Composer
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
      // Act
      const output = IpChainUtils.rightsChainsToObject(rightsChain);

      // Assert
      const key = `${originalPublisherName}:${incomeParticipantName}`;
      expect(output).to.have.key(key);
      expect(output[key]).to.include({ contractType: 'Original Publisher' });

      const nextLayerKey = `${incomeParticipantName}Income Participant50100`;
      expect(output[`${originalPublisherName}:${incomeParticipantName}`].nextLayers).to.have.key(nextLayerKey);
      expect(output[key].nextLayers[nextLayerKey]).to.include({ contractType: 'Income Participant' });

      done();
    });

    it('should use "publisher.name" if "name" is not defined for nested publishers', (done) => {
      // Arrange
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
      // Act
      const output = IpChainUtils.rightsChainsToObject(rightsChain);
      expect(output).to.have.keys('FJ Response Holding:FJ Response Music');
      done();
    });
    it('should return two publishers when the same publisher exists on a rights chain as controlled and uncontrolled', (done) => {
      // Arrange
      let controlledPublisher = null;
      let uncontrolledPublisher = null;

      TestWorks.CORE7.rightsChain[0].children.forEach((publisher) => {
        if (publisher.controlled) {
          controlledPublisher = publisher;
        } else {
          uncontrolledPublisher = publisher;
        }
      });

      // Act
      const output = IpChainUtils.rightsChainsToObject(TestWorks.CORE7.rightsChain); // this chain has the same publisher twice, once controlled and once uncontrolled

      // Assert
      // Ensure the controlled and uncontrolled publishers are properly handled
      expect(controlledPublisher).to.not.be.null;
      expect(uncontrolledPublisher).to.not.be.null;
      const uncontrolledPublisherKey = `${uncontrolledPublisher.name}: uncontrolled`;
      expect(output[controlledPublisher.name]).to.equal(controlledPublisher);
      expect(output[uncontrolledPublisherKey]).to.equal(uncontrolledPublisher);
      expect(output[uncontrolledPublisherKey].controlled).to.equal(false);
      // Check that the output contains exactly two entries
      const outputLength = Object.keys(output).length;
      expect(outputLength).to.eq(2);
      done();
    });
  });

  describe('getPublisherFromComposer', () => {
    it('should match a publisher for a composer based on the interested party & sequence no.', (done) => {
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
      expect(publisherForComposer).to.eql(composerData.publishers[0]);
      done();
    });

    it('should not match a publisher when the sequence no. is different', (done) => {
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
      // The Publisher sequence to match on (in this test it differs to the value defined on composerData)
      const publisherSequence = '01';
      const publisherForComposer = IpChainUtils.getPublisherFromComposer(composerData, publisher, publisherSequence);
      expect(publisherForComposer).to.be.undefined;
      done();
    });

    it('should not use the publisher sequence if undefined on the publisher (cwr version 2.1)', (done) => {
      // Fields omitted from both objects for clarity
      const composerData = {
        interestedPartyNo: 'C00000018',
        publishers: [
          {
            interestedPartyNo: 'P00000003',
          },
        ],
      };
      const publisher = {
        type: 'Publisher',
        interestedPartyNo: 'P00000003',
      };
      // The Publisher sequence to match on
      const publisherSequence = '01';
      const publisherForComposer = IpChainUtils.getPublisherFromComposer(composerData, publisher, publisherSequence);
      expect(publisherForComposer).to.eql(composerData.publishers[0]);
      done();
    });

    it('should return nothing if no publishers are linked to the composer', (done) => {
      const composerData = {
        interestedPartyNo: 'C00000018',
        publishers: [],
      };
      const publisherForComposer = IpChainUtils.getPublisherFromComposer(composerData, {}, '01');
      expect(publisherForComposer).to.be.undefined;
      done();
    });

    it('should match a publisher using the interested party no. if the publisher sequence is an empty string', (done) => {
      // Fields omitted from both objects for clarity
      const composerData = {
        interestedPartyNo: 'C00000018',
        publishers: [
          {
            interestedPartyNo: 'P00000003',
            publisherSequence: '',
          },
        ],
      };
      const publisher = {
        type: 'Publisher',
        interestedPartyNo: 'P00000003',
      };
      const publisherForComposer = IpChainUtils.getPublisherFromComposer(composerData, publisher);
      expect(publisherForComposer).to.eql(composerData.publishers[0]);
      done();
    });
  });

  describe('createPublisherForChain', () => {
    it('should return true if the publisher is a valid Publisher type for starting a chain', (done) => {
      const tests = [
        { publisherType: 'E', lineType: 'SPU' }, // Original Publisher
        { publisherType: 'AM', lineType: 'SPU' }, // Admin
        { publisherType: 'PA', lineType: 'SPU' }, // Income Participant
        { publisherType: 'SE', lineType: 'SPU' }, // Sub Publisher
      ];
      for (const publisherTest of tests) {
        expect(IpChainUtils.createPublisherForChain(publisherTest, ['WW'])).to.equal(true);
      }
      done();
    });
    it('should return false if no common territories exist', (done) => {
      expect(IpChainUtils.createPublisherForChain({ lineType: 'SPU' }, undefined)).to.equal(false);
      done();
    });
  });

  describe('getSubPublishedOriginalPublishers', () => {
    it('should return duplicate Original Publishers where one is sub-published in another chain', (done) => {
      const rightsChainObject = {
        'Original Publisher 1': {
          contractType: Publisher.ContractType.OriginalPublisher,
        },
        'Original Publisher 1:Sub Publisher 1': {
          contractType: Publisher.ContractType.OriginalPublisher,
          nextLayers: {
            'Sub Publisher 1': {
              contractType: Publisher.ContractType.SubPublisher,
            },
          },
        },
      };
      const subPublished = IpChainUtils.getSubPublishedOriginalPublishers(rightsChainObject);
      expect(subPublished).to.eql(['Original Publisher 1']);
      done();
    });
    it('should return nothing when Original Publishers are not sub-published in another chain', (done) => {
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
      expect(subPublished).to.eql([]);
      done();
    });
    it('should return nothing when duplicate Original Publishers have distinct sub-publisher chains', (done) => {
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
      expect(subPublished).to.eql([]);
      done();
    });
  });

  describe('getScoredTerritories', () => {
    it('should return the max score for a chain that exactly matches the delivery territory', (done) => {
      const scores = IpChainUtils.getScoredTerritories([{ territory: 'NL' }], ['NL']);
      expect(scores).to.eql([
        { territory: ['NL'], score: 1_000_000, newTerritories: ['NL'] },
      ]);
      done();
    });

    it('should give no score to a chain with no match to the delivery territory', (done) => {
      const scores = IpChainUtils.getScoredTerritories([{ territory: 'DK' }], ['NO']);
      expect(scores).to.be.empty;
      done();
    });

    it('should rank multiple chains by score depending on how closely they match the delivery territory', (done) => {
      const scores = IpChainUtils.getScoredTerritories([
        { territory: 'NL' },
        { territory: 'WW' },
        { territory: 'Europe' },
      ], ['Europe']);
      const europeExcludingNL = Object.values(TerritoryHelper.europe).filter((t) => t !== 'NL');
      expect(scores).to.eql([
        { territory: ['NL'], score: 1_000_000, newTerritories: ['NL'] },
        {
          territory: europeExcludingNL,
          score: 45,
          newTerritories: europeExcludingNL,
          territoryCodes: { name: europeExcludingNL.join(', '), codes: europeExcludingNL },
        },
      ]);
      done();
    });

    it('should handle multiple territories for a single chain and rank single territory chains higher', (done) => {
      const scores = IpChainUtils.getScoredTerritories(
        [
          { territory: ['SE', 'DK', 'NO'] },
          { territory: 'NL' },
          { territory: 'US' },
        ],
        Object.values(TerritoryHelper.europe),
      );
      expect(scores).to.eql([
        { territory: ['NL'], score: 1_000_000, newTerritories: ['NL'] },
        { territory: ['DK', 'NO', 'SE'], score: 300_000, newTerritories: ['DK', 'NO', 'SE'] },
      ]);
      done();
    });

    it('should use a matching territory group for a territory that has no exact match in the chain', (done) => {
      const scores = IpChainUtils.getScoredTerritories(
        [
          { territory: Object.values(TerritoryHelper.europe), isTerritoryGroup: true },
          { territory: ['GB', 'IE'] },
        ],
        ['GB', 'IE', 'FR'],
      );
      expect(scores).to.eql([
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
      done();
    });

    it('should give a higher score to a specific territory match over an entire continent (Europe delivery)', (done) => {
      const scores = IpChainUtils.getScoredTerritories([{ territory: Object.values(TerritoryHelper.europe), isTerritoryGroup: true }, { territory: ['GB', 'NL'] }], ['Europe']);
      const europeExcludingSpecific = Object.values(TerritoryHelper.europe).filter((t) => t !== 'NL' && t !== 'GB');
      expect(scores).to.eql([
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
      done();
    });

    it('should give a higher score to a specific territory match over an entire continent (specific delivery)', (done) => {
      const rightsChain = [
        { territory: Object.values(TerritoryHelper.europe), isTerritoryGroup: true },
        { territory: ['ES'] },
      ];
      const scores = IpChainUtils.getScoredTerritories(rightsChain, ['ES', 'IT']);
      expect(scores).to.eql([
        // Highest score for ES as an exact match
        { territory: ['ES'], score: 1_000_000, newTerritories: ['ES'] },
        // Lower score for IT as matched within the Europe chain
        { territory: ['IT'], isTerritoryGroup: true, score: 100, newTerritories: ['IT'] },
      ]);
      done();
    });

    it('should give a higher score to a specific territory match over an entire continent (specific delivery) (CUR-3490)', (done) => {
      const rightsChain = [
        { territory: ['IT', 'ES', 'GB', 'US'] },
        { territory: ['ES', 'CA', 'US'] },
        { territory: ['GB', 'ES'] },
      ];
      const scores = IpChainUtils.getScoredTerritories(rightsChain, ['IT', 'ES', 'GB']);
      expect(scores).to.eql([
        // Highest score for the ES + GB chain as it's the most specific (least territories included)
        { territory: ['ES', 'GB'], score: 400_000, newTerritories: ['ES', 'GB'] },
        // Italy only matched in the first chain
        { territory: ['IT'], score: 100_000, newTerritories: ['IT'] },
      ]);
      done();
    });

    it('should give a higher score to a specific match over a continent when they are territory groups', (done) => {
      const rightsChain = [
        { id: 1, territory: Object.values(TerritoryHelper.europe), isTerritoryGroup: true },
        { id: 2, territory: ['GB', 'NL'], isTerritoryGroup: true },
        { id: 3, territory: ['ES'] },
      ];
      const scores = IpChainUtils.getScoredTerritories(rightsChain, ['GB']);
      expect(scores).to.eql([
        {
          id: 2,
          territory: ['GB'],
          isTerritoryGroup: true,
          score: 100,
          newTerritories: ['GB'],
        },
      ]);
      done();
    });
  });
});
