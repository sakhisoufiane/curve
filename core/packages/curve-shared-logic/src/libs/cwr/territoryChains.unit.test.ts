/* eslint-disable no-return-assign */
import { convertIsoToCisacTerritoryCode, continentToTerritoryCodes } from '../territoryHelper';
import {
  CISAC_APPROVED_COUNTRIES_CODES,
  AREA_CODES,
  ALL_WORLD_CODE,
  CISAC_COUNTRIES_AFRICA,
  CISAC_COUNTRIES_AMERICAS,
  CISAC_COUNTRIES_ASIA,
  CISAC_COUNTRIES_EUROPE,
  CISAC_COUNTRIES_OCEANIA,
} from './territories';
import {
  getTerritoriesFromChainAndWork,
  territoriesToGroups,
  isWorldCode,
  hasWorldIndicator,
  filterValidCisacTerritories,
  toNumericCisacCodes,
  expandTerritoryCode,
} from './territoryChains';

const BE_ISO = 'BE';
const BE_CISAC = 56;
const WORLD_CODE = AREA_CODES.WW;
const WORLD_CISAC = ALL_WORLD_CODE;

describe('territoriesToGroups', () => {
  let deliveryTerritory: string[];

  // Define a standard mock participant with a uniform global share.
  // This ensures that standard tests stay in a single "Share Bucket".
  const globalShares = {
    mechanicalCollection: 0,
    mechanicalOwnership: 0,
    performanceCollection: 50,
    performanceOwnership: 50,
  };
  const specificShares = {
    mechanicalCollection: 0,
    mechanicalOwnership: 0,
    performanceCollection: 66.67,
    performanceOwnership: 66.67,
  };
  const mockParticipant = {
    shares: {
      [AREA_CODES.WW]: globalShares,
    },
    territoryCollection: {
      [AREA_CODES.WW]: globalShares,
    },
  };

  const worldIncludingInvalidCodes = [...CISAC_APPROVED_COUNTRIES_CODES, 'XX', 'XY', 'XZ', 'ZZ'];
  const worldIncludingInvalidExcludingBe = worldIncludingInvalidCodes.filter((t) => t !== BE_ISO);
  const worldExcludingBe = CISAC_APPROVED_COUNTRIES_CODES.filter((t) => t !== BE_ISO);

  describe('Delivery territory is all World', () => {
    beforeEach(() => {
      deliveryTerritory = ['WW'];
    });

    describe('Chain territories are <= half of the world', () => {
      it('should include only the chain territories for a Publisher', () => {
        // Arrange / Act
        const { includes, excludes } = territoriesToGroups({
          participant: mockParticipant,
          chainTerritories: ['NL', 'GB', 'SE'],
          allChainTerritories: [
            ['NL', 'GB', 'SE'],
            ['SE', 'NO', 'DK'],
          ],
          workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
          participantTerritories: ['NL', 'GB', 'SE'],
          isExtraPublisher: false,
          role: 'Publisher',
          deliveryTerritory,
        });

        // Assert
        expect(includes).toEqual(['NL', 'GB', 'SE'].map(convertIsoToCisacTerritoryCode));
        expect(excludes).toEqual([]);
      });

      it('should include only the chain territories for a Composer', () => {
        // Arrange / Act
        const { includes, excludes } = territoriesToGroups({
          participant: mockParticipant,
          chainTerritories: ['NL', 'GB', 'SE'],
          allChainTerritories: [
            ['NL', 'GB', 'SE'],
            ['SE', 'NO', 'DK'],
          ],
          workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
          participantTerritories: ['NL', 'GB', 'SE'],
          isExtraPublisher: false,
          role: 'Composer',
          deliveryTerritory,
        });

        // Assert
        expect(includes).toEqual(['NL', 'GB', 'SE'].map(convertIsoToCisacTerritoryCode));
        expect(excludes).toEqual([]);
      });
    });

    describe('Chain territories are > half of the world', () => {
      it('should flip to world excl. remaining territories for a Publisher', () => {
        // Arrange / Act
        const { includes, excludes } = territoriesToGroups({
          participant: mockParticipant,
          chainTerritories: CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188), // Most of the world (188/201),
          allChainTerritories: [CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188), CISAC_APPROVED_COUNTRIES_CODES],
          workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
          participantTerritories: CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188),
          isExtraPublisher: false,
          role: 'Publisher',
          deliveryTerritory,
        });

        // Assert
        expect(includes).toEqual([WORLD_CISAC]);
        expect(excludes).toEqual(CISAC_APPROVED_COUNTRIES_CODES.slice(188).map(convertIsoToCisacTerritoryCode).sort());
      });

      it('should flip to world excl. remaining territories for a Composer', () => {
        // Arrange / Act
        const { includes, excludes } = territoriesToGroups({
          participant: mockParticipant,
          chainTerritories: CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188), // Most of the world (188/201),
          allChainTerritories: [CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188), CISAC_APPROVED_COUNTRIES_CODES],
          workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
          participantTerritories: CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188),
          isExtraPublisher: false,
          role: 'Composer',
          deliveryTerritory,
        });

        // Assert
        expect(includes).toEqual([WORLD_CISAC]);
        expect(excludes).toEqual(CISAC_APPROVED_COUNTRIES_CODES.slice(188).map(convertIsoToCisacTerritoryCode).sort());
      });
    });

    describe('Chain territories are all world', () => {
      it('should only include all world for a Publisher', () => {
        // Arrange / Act
        const { includes, excludes } = territoriesToGroups({
          participant: mockParticipant,
          chainTerritories: CISAC_APPROVED_COUNTRIES_CODES,
          allChainTerritories: [CISAC_APPROVED_COUNTRIES_CODES],
          workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
          participantTerritories: CISAC_APPROVED_COUNTRIES_CODES,
          isExtraPublisher: false,
          role: 'Publisher',
          deliveryTerritory,
        });

        // Assert
        expect(includes).toEqual([WORLD_CISAC]);
        expect(excludes).toEqual([]);
      });

      it('should only include all world for a Composer', () => {
        // Arrange / Act
        const { includes, excludes } = territoriesToGroups({
          participant: mockParticipant,
          chainTerritories: CISAC_APPROVED_COUNTRIES_CODES,
          allChainTerritories: [CISAC_APPROVED_COUNTRIES_CODES],
          workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
          participantTerritories: CISAC_APPROVED_COUNTRIES_CODES,
          isExtraPublisher: false,
          role: 'Publisher',
          deliveryTerritory,
        });

        // Assert
        expect(includes).toEqual([WORLD_CISAC]);
        expect(excludes).toEqual([]);
      });
    });
  });

  describe('Delivery territory is a specific group (i.e. not all World)', () => {
    beforeEach(() => {
      deliveryTerritory = CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188);
    });

    describe('Chain territories are <= half of the world', () => {
      it('should not include chain territories which are not in the delivery territory for a Publisher', () => {
        // Arrange / Act
        const { includes, excludes } = territoriesToGroups({
          participant: mockParticipant,
          chainTerritories: ['NL', 'GB', 'SE'],
          allChainTerritories: [
            ['NL', 'GB', 'SE'],
            ['SE', 'NO', 'DK'],
          ],
          workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
          participantTerritories: ['NL', 'GB', 'SE'],
          isExtraPublisher: false,
          role: 'Publisher',
          deliveryTerritory,
        });

        // Assert
        // GB is in the chain territory but not in the Delivery territory, so should not be present in the includes array
        expect(includes).toEqual(['NL', 'SE'].map(convertIsoToCisacTerritoryCode).sort());
        expect(excludes).toEqual([]);
      });

      it('should not include chain territories which are not in the delivery territory for a Composer', () => {
        // Arrange / Act
        const { includes, excludes } = territoriesToGroups({
          participant: mockParticipant,
          chainTerritories: ['NL', 'GB', 'SE'],
          allChainTerritories: [
            ['NL', 'GB', 'SE'],
            ['SE', 'NO', 'DK'],
          ],
          workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
          participantTerritories: ['NL', 'GB', 'SE'],
          isExtraPublisher: false,
          role: 'Publisher',
          deliveryTerritory,
        });

        // Assert
        // GB is in the chain territory but not in the Delivery territory, so should not be present in the includes array
        expect(includes).toEqual(['NL', 'SE'].map(convertIsoToCisacTerritoryCode).sort());
        expect(excludes).toEqual([]);
      });
    });

    describe('Chain territories are > half of the world', () => {
      it('should flip to world excl. remaining territories for a Publisher', () => {
        // Arrange / Act
        const { includes, excludes } = territoriesToGroups({
          participant: mockParticipant,
          chainTerritories: CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188), // Most of the world (188/201),
          allChainTerritories: [CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188), CISAC_APPROVED_COUNTRIES_CODES],
          workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
          participantTerritories: CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188),
          isExtraPublisher: false,
          role: 'Publisher',
          deliveryTerritory,
        });

        // Assert
        expect(includes).toEqual([WORLD_CISAC]);
        expect(excludes).toEqual(CISAC_APPROVED_COUNTRIES_CODES.slice(188).map(convertIsoToCisacTerritoryCode).sort());
      });

      it('should flip to world excl. remaining territories for a Composer', () => {
        // Arrange / Act
        const { includes, excludes } = territoriesToGroups({
          participant: mockParticipant,
          chainTerritories: CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188), // Most of the world (188/201),
          allChainTerritories: [CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188), CISAC_APPROVED_COUNTRIES_CODES],
          workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
          participantTerritories: CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188),
          isExtraPublisher: false,
          role: 'Publisher',
          deliveryTerritory,
        });

        // Assert
        expect(includes).toEqual([WORLD_CISAC]);
        expect(excludes).toEqual(CISAC_APPROVED_COUNTRIES_CODES.slice(188).map(convertIsoToCisacTerritoryCode).sort());
      });
    });
  });

  describe('When the participant is a Composer', () => {
    it('should expand regional codes like Europe into ISO codes', () => {
      // Arrange
      const europeIsoCodes = continentToTerritoryCodes('Europe');

      // Act
      const { includes } = territoriesToGroups({
        participant: mockParticipant,
        chainTerritories: ['Europe'],
        allChainTerritories: [['Europe']],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
        participantTerritories: ['Europe'],
        isExtraPublisher: false,
        role: 'Composer',
        deliveryTerritory: ['WW'],
      });

      // Assert
      const franceCode = convertIsoToCisacTerritoryCode('FR');
      const germanyCode = convertIsoToCisacTerritoryCode('DE');
      expect(includes).toContain(franceCode);
      expect(includes).toContain(germanyCode);
      expect(includes.length).toEqual(europeIsoCodes.length);
    });
  });

  it('should exclude and then explicitly include territories when shares differ from World', () => {
    const params = {
      role: 'Composer',
      chainTerritories: ['WW'],
      allChainTerritories: [['WW']],
      workTerritories: [],
      participantTerritories: [],
      deliveryTerritory: ['WW'],
      isExtraPublisher: false,
      participant: {
        shares: {
          WW: { mechanicalCollection: 50, performanceCollection: 50 },
          BE: { mechanicalCollection: 66.67, performanceCollection: 66.67 },
        },
      },
    };

    // @ts-expect-error Incomplete type is fine for this test
    const result = territoriesToGroups(params);

    expect(result.includes).toContain(WORLD_CISAC); // World
    expect(result.includes).toContain(BE_CISAC); // Belgium specific Inclusion
    expect(result.excludes).toContain(BE_CISAC); // Belgium specific Exclusion
  });

  it('should treat a massive list of ISOs as World for a Composer', () => {
    // Generate a full list of CISAC codes to simulate a world-sized list
    const allWorldList = [...CISAC_APPROVED_COUNTRIES_CODES];

    const params = {
      role: 'Composer',
      chainTerritories: allWorldList,
      allChainTerritories: [allWorldList],
      workTerritories: [],
      participantTerritories: [],
      deliveryTerritory: ['WW'],
      isExtraPublisher: false,
      participant: null,
    };

    // @ts-expect-error Incomplete type is fine for this test
    const result = territoriesToGroups(params);

    expect(result.includes).toEqual([WORLD_CISAC]); // Reduced to World numeric ID
  });

  it('should return specific CISAC IDs for a simple list of ISO codes', () => {
    const params = {
      role: 'Publisher',
      chainTerritories: ['US', 'CA'],
      allChainTerritories: [['US', 'CA']],
      workTerritories: ['US', 'CA', 'GB'],
      participantTerritories: ['US', 'CA', 'MX'],
      deliveryTerritory: ['WW'],
      isExtraPublisher: false,
      participant: null,
    };

    // @ts-expect-error Incomplete type is fine for this test
    const result = territoriesToGroups(params);

    expect(result.includes).toContain(840); // US
    expect(result.includes).toContain(124); // CA
    expect(result.excludes).toHaveLength(0);
  });

  it('should ignore exclusions if isExtraPublisher is true', () => {
    // We typically don't calculate exclusions against other chains for extra publishers.
    const params = {
      role: 'Publisher',
      chainTerritories: ['US'],
      allChainTerritories: [['US', 'GB']], // GB is missing from this chain
      workTerritories: ['US', 'GB'],
      participantTerritories: ['US', 'GB'],
      deliveryTerritory: ['WW'],
      isExtraPublisher: true, // Should prevent exclusion logic
      participant: null,
    };

    // @ts-expect-error Incomplete type is fine for this test
    const result = territoriesToGroups(params);

    expect(result.includes).toContain(840);
    expect(result.excludes).toHaveLength(0); // GB should not be excluded
  });

  describe('Scenarios - KEY027', () => {
    const globalShares = { mechanicalCollection: 100, performanceCollection: 50 };
    const specificShares = { mechanicalCollection: 100, performanceCollection: 33.33 };

    it('KEY027 - Publisher', () => {
      const participant = {
        name: 'Crown Publishing',
        territoryCollection: {
          [BE_ISO]: specificShares,
        },
      };

      // @ts-expect-error This is fine for testing
      worldIncludingInvalidExcludingBe.forEach((t) => (participant.territoryCollection[t] = globalShares));

      const result = territoriesToGroups({
        participant,
        chainTerritories: worldIncludingInvalidCodes,
        allChainTerritories: [worldIncludingInvalidExcludingBe, [BE_ISO]],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: worldIncludingInvalidCodes, // Full world authorized
        isExtraPublisher: false,
        role: 'Publisher',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes).toEqual([WORLD_CISAC, BE_CISAC]);
      expect(result.excludes).toEqual([BE_CISAC]);
    });

    it('KEY027 - Composer', () => {
      const participant = {
        name: 'John Smith',
        territoryCollection: {
          [BE_ISO]: specificShares,
        },
      };
      const worldExcludingBe = worldIncludingInvalidCodes.filter((t) => t !== BE_ISO);

      // @ts-expect-error This is fine for testing
      worldExcludingBe.forEach((t) => (participant.territoryCollection[t] = globalShares));

      const result = territoriesToGroups({
        participant,
        chainTerritories: [worldIncludingInvalidExcludingBe, [BE_ISO]],
        allChainTerritories: [worldIncludingInvalidExcludingBe, [BE_ISO]],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Composer',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes).toEqual([WORLD_CISAC, BE_CISAC]);
      expect(result.excludes).toEqual([BE_CISAC]);
    });

    it('KEY027b - Publisher', () => {
      const participant = {
        name: 'Crown Publishing',
        territoryCollection: {
          [WORLD_CODE]: globalShares,
          [BE_ISO]: specificShares,
        },
      };

      const result = territoriesToGroups({
        participant,
        chainTerritories: CISAC_APPROVED_COUNTRIES_CODES,
        allChainTerritories: [[WORLD_CODE], [BE_ISO]],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Publisher',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes).toEqual([WORLD_CISAC, BE_CISAC]);
      expect(result.excludes).toEqual([BE_CISAC]);
    });

    it('KEY027b - Composer', () => {
      const participant = {
        name: 'John Smith',
        territoryCollection: {
          [BE_ISO]: specificShares,
        },
      };

      const worldExcludingBe = CISAC_APPROVED_COUNTRIES_CODES.filter((t) => t !== BE_ISO);

      // @ts-expect-error This is fine for testing
      worldExcludingBe.forEach((t) => (participant.territoryCollection[t] = globalShares));

      const result = territoriesToGroups({
        participant,
        chainTerritories: [WORLD_CODE, [BE_ISO]],
        allChainTerritories: [[WORLD_CODE], [BE_ISO]],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Composer',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes).toEqual([WORLD_CISAC, BE_CISAC]);
      expect(result.excludes).toEqual([BE_CISAC]);
    });
  });

  describe('Scenarios - MOD015', () => {
    const globalShares = { mechanicalCollection: 100, performanceCollection: 50 };
    const specificShares = { mechanicalCollection: 100, performanceCollection: 33.33 };

    it('MOD015 - Publisher (1)', () => {
      const participant = {
        name: 'Crown Publishing',
        territoryCollection: {
          [WORLD_CODE]: globalShares,
          [BE_ISO]: specificShares,
        },
      };

      const result = territoriesToGroups({
        participant,
        chainTerritories: [],
        allChainTerritories: [[WORLD_CODE], [BE_ISO]],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Publisher',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes).toEqual([]);
      expect(result.excludes).toEqual([]);
    });

    it('MOD015 - Publisher (2)', () => {
      const participant = {
        name: 'Liberty Publishing',
        territoryCollection: {
          [WORLD_CODE]: globalShares,
          [BE_ISO]: specificShares,
        },
      };

      const result = territoriesToGroups({
        participant,
        chainTerritories: worldExcludingBe,
        allChainTerritories: [[WORLD_CODE], [BE_ISO]],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Publisher',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes).toEqual([WORLD_CISAC]);
      expect(result.excludes).toEqual([BE_CISAC]);
    });

    it('MOD015 - Publisher (3)', () => {
      const participant = {
        name: 'Liberty Publishing',
        territoryCollection: {
          [WORLD_CODE]: globalShares,
          [BE_ISO]: specificShares,
        },
      };

      const result = territoriesToGroups({
        participant,
        chainTerritories: [BE_ISO],
        allChainTerritories: [[WORLD_CODE], [BE_ISO]],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Publisher',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes).toEqual([BE_CISAC]);
      expect(result.excludes).toEqual([]);
    });

    it('MOD015 - Composer', () => {
      const participant = {
        name: 'John Smith',
        territoryCollection: {
          [BE_ISO]: specificShares,
        },
      };

      // @ts-expect-error This is fine for testing
      worldIncludingInvalidExcludingBe.forEach((t) => (participant.territoryCollection[t] = globalShares));

      const result = territoriesToGroups({
        participant,
        chainTerritories: [worldIncludingInvalidCodes, [BE_ISO]],
        allChainTerritories: [worldIncludingInvalidCodes, [BE_ISO]],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Composer',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes).toEqual([WORLD_CISAC, BE_CISAC]);
      expect(result.excludes).toEqual([BE_CISAC]);
    });

    it('MOD015b - Publisher (1)', () => {
      const participant = {
        name: 'Crown Publishing',
        territoryCollection: {
          [WORLD_CODE]: globalShares,
          [BE_ISO]: specificShares,
        },
      };

      const result = territoriesToGroups({
        participant,
        chainTerritories: [],
        allChainTerritories: [[WORLD_CODE], [BE_ISO]],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Publisher',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes).toEqual([]);
      expect(result.excludes).toEqual([]);
    });

    it('MOD015b - Publisher (2)', () => {
      const participant = {
        name: 'Liberty Publishing',
        territoryCollection: null,
      };

      const result = territoriesToGroups({
        // @ts-expect-error Incomplete type is fine for this test
        participant,
        chainTerritories: CISAC_APPROVED_COUNTRIES_CODES,
        allChainTerritories: [[WORLD_CODE], [BE_ISO]],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Publisher',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes).toEqual([WORLD_CISAC]);
      expect(result.excludes).toEqual([BE_CISAC]);
    });

    it('MOD015b - Publisher (3)', () => {
      const participant = {
        name: 'Liberty Publishing',
        territoryCollection: null,
      };

      const result = territoriesToGroups({
        // @ts-expect-error Incomplete type is fine for this test
        participant,
        chainTerritories: [BE_ISO],
        allChainTerritories: [[WORLD_CODE], [BE_ISO]],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Publisher',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes).toEqual([BE_CISAC]);
      expect(result.excludes).toEqual([]);
    });

    it('MOD015b - Composer', () => {
      const participant = {
        name: 'John Smith',
        shares: {
          [WORLD_CODE]: {
            mechanicalCollection: 0,
            mechanicalOwnership: 0,
            performanceCollection: 50,
            performanceOwnership: 50,
          },
          [BE_ISO]: {
            mechanicalCollection: 0,
            mechanicalOwnership: 0,
            performanceCollection: 66.67,
            performanceOwnership: 50,
          },
        },
      };

      const result = territoriesToGroups({
        participant,
        chainTerritories: [WORLD_CODE, [BE_ISO]],
        allChainTerritories: [[WORLD_CODE], [BE_ISO]],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Composer',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes).toEqual([WORLD_CISAC, BE_CISAC]);
      expect(result.excludes).toEqual([BE_CISAC]);
    });
  });

  describe('Scenario - MOD017', () => {
    it('MOD017 - Composer', () => {
      const participant = {
        name: 'John Smith',
        shares: {
          [BE_ISO]: specificShares,
        },
      };

      // @ts-expect-error This is fine for testing
      worldIncludingInvalidExcludingBe.forEach((t) => (participant.shares[t] = globalShares));

      const result = territoriesToGroups({
        participant,
        chainTerritories: [worldIncludingInvalidExcludingBe, [BE_ISO]],
        allChainTerritories: [worldIncludingInvalidExcludingBe, [BE_ISO]],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Composer',
        deliveryTerritory: ['WW'], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes).toEqual([WORLD_CISAC, BE_CISAC]);
      expect(result.excludes).toEqual([BE_CISAC]);
    });
  });

  describe('Scenarios - KEY032 (Continent Segmented Shares)', () => {
    const africaAmericasISOs = [...Object.values(CISAC_COUNTRIES_AFRICA), ...Object.values(CISAC_COUNTRIES_AMERICAS)];
    const asiaISOs = [...Object.values(CISAC_COUNTRIES_ASIA)];
    const europeOceaniaISOs = [...Object.values(CISAC_COUNTRIES_EUROPE), ...Object.values(CISAC_COUNTRIES_OCEANIA)];
    const fullWorkISOs = [...africaAmericasISOs, ...asiaISOs, ...europeOceaniaISOs];

    it('should mirror Publisher shares across three continent groups', () => {
      const participant: {
        name: string;
        territoryCollection: Record<string, { mechanicalCollection: number; performanceCollection: number }>;
      } = {
        name: 'Crown Publishing',
        territoryCollection: {},
      };

      // Bucket 1: 100 Mech / 50 Perf (Africa/Americas)
      africaAmericasISOs.forEach(
        (iso) => (participant.territoryCollection[iso] = { mechanicalCollection: 100, performanceCollection: 50 })
      );
      // Bucket 2: 50 Mech / 33.33 Perf (Asia)
      asiaISOs.forEach(
        (iso) => (participant.territoryCollection[iso] = { mechanicalCollection: 50, performanceCollection: 33.33 })
      );
      // Bucket 3: 33.33 Mech / 33.33 Perf (Europe/Oceania)
      europeOceaniaISOs.forEach(
        (iso) => (participant.territoryCollection[iso] = { mechanicalCollection: 33.33, performanceCollection: 33.33 })
      );

      const result = territoriesToGroups({
        participant,
        chainTerritories: fullWorkISOs,
        allChainTerritories: [fullWorkISOs],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES,
        isExtraPublisher: false,
        role: 'Publisher',
        deliveryTerritory: [WORLD_CODE],
      });

      // KEY032 Expectation: Because shares are different, it should NOT flip to World (2136).
      // It should instead represent the distinct territory groups.
      expect(result.includes).not.toContain(WORLD_CISAC);
      expect(result.includes.length).toBeGreaterThan(3);
      expect(result.includes.sort()).toEqual(fullWorkISOs.map(convertIsoToCisacTerritoryCode).sort());
      expect(result.excludes).toEqual([]);
    });

    it('should mirror Composer shares across three continent groups', () => {
      const participant: {
        name: string;
        territoryCollection: Record<string, { mechanicalCollection: number; performanceCollection: number }>;
      } = {
        name: 'John Smith',
        territoryCollection: {},
      };

      // Bucket 1: 0 Mech / 50 Perf (Africa/Americas)
      africaAmericasISOs.forEach(
        (iso) => (participant.territoryCollection[iso] = { mechanicalCollection: 0, performanceCollection: 50 })
      );
      // Bucket 2: 50 Mech / 66.67 Perf (Asia)
      asiaISOs.forEach(
        (iso) => (participant.territoryCollection[iso] = { mechanicalCollection: 50, performanceCollection: 66.67 })
      );
      // Bucket 3: 66.67 Mech / 66.67 Perf (Europe/Oceania)
      europeOceaniaISOs.forEach(
        (iso) => (participant.territoryCollection[iso] = { mechanicalCollection: 66.67, performanceCollection: 66.67 })
      );

      const result = territoriesToGroups({
        participant,
        chainTerritories: fullWorkISOs,
        allChainTerritories: [fullWorkISOs],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES,
        isExtraPublisher: false,
        role: 'Composer',
        deliveryTerritory: [WORLD_CODE],
      });

      // John should be segmented exactly like Crown Publishing due to his share boundaries
      expect(result.includes).not.toContain(WORLD_CISAC);
      expect(result.includes.sort()).toEqual(fullWorkISOs.map(convertIsoToCisacTerritoryCode).sort());
      expect(result.excludes).toEqual([]);
    });
  });

  describe('Scenarios - KEY005', () => {
    const globalShares = { mechanicalCollection: 100, performanceCollection: 50 };
    const specificShares = { mechanicalCollection: 100, performanceCollection: 33.33 };

    it('KEY005b - Publisher (1)', () => {
      const participant = {
        name: 'Crown Publishing',
        territoryCollection: {
          [WORLD_CODE]: globalShares,
          [BE_ISO]: specificShares,
        },
      };

      const result = territoriesToGroups({
        participant,
        chainTerritories: worldExcludingBe,
        allChainTerritories: [[WORLD_CODE], [BE_ISO]],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Publisher',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes).toEqual([WORLD_CISAC]);
      expect(result.excludes).toEqual([BE_CISAC]);
    });

    it('KEY005b - Publisher (2)', () => {
      const participant = {
        name: 'Crown Publishing',
        territoryCollection: {
          [WORLD_CODE]: globalShares,
          [BE_ISO]: specificShares,
        },
      };

      const result = territoriesToGroups({
        participant,
        chainTerritories: [BE_ISO],
        allChainTerritories: [[WORLD_CODE], [BE_ISO]],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Publisher',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes).toEqual([BE_CISAC]);
      expect(result.excludes).toEqual([]);
    });

    it('KEY005b - Composer', () => {
      const participant = {
        name: 'John Smith',
        territoryCollection: {
          [WORLD_CODE]: globalShares,
          [BE_ISO]: globalShares,
        },
      };

      const result = territoriesToGroups({
        participant,
        chainTerritories: [WORLD_CODE, [BE_ISO]],
        allChainTerritories: [[WORLD_CODE], [BE_ISO]],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Composer',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes).toEqual([WORLD_CISAC]);
      expect(result.excludes).toEqual([]);
    });

    it('KEY005 - Publisher (1)', () => {
      const participant = {
        name: 'Crown Publishing',
        territoryCollection: {
          [BE_ISO]: specificShares,
        },
      };
      const worldIncludingInvalid = [...CISAC_APPROVED_COUNTRIES_CODES, 'XK', 'PS', 'TW'].filter((t) => t !== BE_ISO);

      // @ts-expect-error This is fine for testing
      worldIncludingInvalid.forEach((t) => (participant.territoryCollection[t] = globalShares));

      const result = territoriesToGroups({
        participant,
        chainTerritories: worldIncludingInvalid,
        allChainTerritories: [worldIncludingInvalid, [BE_ISO]],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Publisher',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes).toEqual([WORLD_CISAC]);
      expect(result.excludes).toEqual([BE_CISAC]);
    });

    it('KEY005 - Publisher (2)', () => {
      const participant = {
        name: 'Hops Publishing',
        territoryCollection: {
          [BE_ISO]: specificShares,
        },
      };
      const worldIncludingInvalid = [...CISAC_APPROVED_COUNTRIES_CODES, 'XK', 'PS', 'TW'].filter((t) => t !== BE_ISO);

      // @ts-expect-error This is fine for testing
      worldIncludingInvalid.forEach((t) => (participant.territoryCollection[t] = globalShares));

      const result = territoriesToGroups({
        participant,
        chainTerritories: [BE_ISO],
        allChainTerritories: [worldIncludingInvalid, [BE_ISO]],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Publisher',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes).toEqual([BE_CISAC]);
      expect(result.excludes).toEqual([]);
    });

    it('KEY005 - Composer', () => {
      const participant = {
        name: 'John Smith',
        territoryCollection: {
          [BE_ISO]: specificShares,
        },
      };
      const worldIncludingInvalid = [...CISAC_APPROVED_COUNTRIES_CODES, 'XK', 'PS', 'TW'].filter((t) => t !== BE_ISO);

      // @ts-expect-error This is fine for testing
      worldIncludingInvalid.forEach((t) => (participant.territoryCollection[t] = globalShares));

      const result = territoriesToGroups({
        participant,
        chainTerritories: [[BE_ISO], worldIncludingInvalid],
        allChainTerritories: [worldIncludingInvalid, [BE_ISO]],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Composer',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      // BE has its own chain and different shares, so it should be included and excluded separately
      expect(result.includes).toEqual([WORLD_CISAC, BE_CISAC]);
      expect(result.excludes).toEqual([BE_CISAC]);
    });

    it('KEY005c - Publisher (1)', () => {
      const participant = {
        name: 'Crown Publishing',
        territoryCollection: {
          [WORLD_CODE]: globalShares,
          [BE_ISO]: specificShares,
        },
      };
      const someTerritories = [
        'BW',
        'KM',
        'ER',
        'GN',
        'LS',
        'ML',
        'MZ',
        'RW',
        'SS',
        'ZM',
        'CA',
        'CO',
        'CW',
        'GF',
        'GT',
        'NI',
        'PY',
        'KN',
        'MF',
        'SX',
        'VE',
        'BD',
        'GE',
        'IQ',
        'JO',
        'KW',
        'MY',
        'MM',
        'PK',
        'LK',
        'TW',
        'TR',
        'UZ',
        'AT',
        'BA',
        'CZ',
        'FO',
        'DE',
        'GG',
        'IE',
        'LT',
        'NL',
        'RO',
        'ES',
        'GB',
        'AS',
        'CX',
        'TF',
        'KI',
        'NR',
        'NF',
        'MP',
        'PN',
        'GS',
        'VU',
      ];

      const result = territoriesToGroups({
        participant,
        chainTerritories: CISAC_APPROVED_COUNTRIES_CODES,
        allChainTerritories: [[WORLD_CODE], someTerritories],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Publisher',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes).toEqual([WORLD_CISAC]);
      expect(result.excludes.sort()).toEqual(
        someTerritories
          .map(convertIsoToCisacTerritoryCode)
          .filter((code): code is number => code !== null && code !== undefined)
          .sort()
      );
    });

    it('KEY005c - Publisher (2)', () => {
      const participant = {
        name: 'Crown Publishing',
        territoryCollection: {
          [WORLD_CODE]: globalShares,
          [BE_ISO]: specificShares,
        },
      };
      const someTerritories = [
        'BW',
        'KM',
        'ER',
        'GN',
        'LS',
        'ML',
        'MZ',
        'RW',
        'SS',
        'ZM',
        'CA',
        'CO',
        'CW',
        'GF',
        'GT',
        'NI',
        'PY',
        'KN',
        'MF',
        'SX',
        'VE',
        'BD',
        'GE',
        'IQ',
        'JO',
        'KW',
        'MY',
        'MM',
        'PK',
        'LK',
        'TW',
        'TR',
        'UZ',
        'AT',
        'BA',
        'CZ',
        'FO',
        'DE',
        'GG',
        'IE',
        'LT',
        'NL',
        'RO',
        'ES',
        'GB',
        'AS',
        'CX',
        'TF',
        'KI',
        'NR',
        'NF',
        'MP',
        'PN',
        'GS',
        'VU',
      ];

      const result = territoriesToGroups({
        participant,
        chainTerritories: someTerritories,
        allChainTerritories: [[WORLD_CODE], someTerritories],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Publisher',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes.sort()).toEqual(
        someTerritories
          .map(convertIsoToCisacTerritoryCode)
          .filter((code): code is number => code !== null && code !== undefined)
          .sort()
      );
      expect(result.excludes).toEqual([]);
    });

    it('KEY005c - Composer', () => {
      const participant = {
        name: 'John Smith',
        territoryCollection: {
          [WORLD_CODE]: globalShares,
          [BE_ISO]: specificShares,
        },
      };
      const someTerritories = [
        'BW',
        'KM',
        'ER',
        'GN',
        'LS',
        'ML',
        'MZ',
        'RW',
        'SS',
        'ZM',
        'CA',
        'CO',
        'CW',
        'GF',
        'GT',
        'NI',
        'PY',
        'KN',
        'MF',
        'SX',
        'VE',
        'BD',
        'GE',
        'IQ',
        'JO',
        'KW',
        'MY',
        'MM',
        'PK',
        'LK',
        'TW',
        'TR',
        'UZ',
        'AT',
        'BA',
        'CZ',
        'FO',
        'DE',
        'GG',
        'IE',
        'LT',
        'NL',
        'RO',
        'ES',
        'GB',
        'AS',
        'CX',
        'TF',
        'KI',
        'NR',
        'NF',
        'MP',
        'PN',
        'GS',
        'VU',
      ];

      const result = territoriesToGroups({
        participant,
        chainTerritories: [someTerritories, WORLD_CODE],
        allChainTerritories: [[WORLD_CODE], someTerritories],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Composer',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes).toEqual([WORLD_CISAC]);
      expect(result.excludes).toEqual([]);
    });
  });

  describe('Scenarios - KEY019', () => {
    it('KEY019 - Publisher', () => {
      const participant = {
        name: 'Crown Publishing',
        territoryCollection: {
          [WORLD_CODE]: globalShares,
        },
      };

      const result = territoriesToGroups({
        participant,
        chainTerritories: CISAC_APPROVED_COUNTRIES_CODES,
        allChainTerritories: [[WORLD_CODE], ['BG', 'NL']],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Publisher',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes).toEqual([WORLD_CISAC]);
      expect(result.excludes).toEqual([]);
    });

    it('KEY019 - Composer', () => {
      const participant = {
        name: 'Sarah Johnson',
        territoryCollection: {
          [WORLD_CODE]: globalShares,
        },
      };

      const result = territoriesToGroups({
        participant,
        chainTerritories: [WORLD_CODE, ['BG', 'NL']],
        allChainTerritories: [[WORLD_CODE], ['BG', 'NL']],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Composer',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes).toEqual([WORLD_CISAC]);
      expect(result.excludes).toEqual([]);
    });
  });

  describe('Scenarios - KEY025', () => {
    type Shares = {
      mechanicalCollection: number;
      mechanicalOwnership: number;
      performanceCollection: number;
      performanceOwnership: number;
    };
    const SOME_OF_WORLD_PLUS_INVALID_CODES = [
      ...CISAC_APPROVED_COUNTRIES_CODES.filter(
        (code) =>
          ![
            'AE',
            'AL',
            'AM',
            'AR',
            'BB',
            'BG',
            'BO',
            'CM',
            'DJ',
            'DK',
            'GR',
            'HT',
            'ID',
            'IT',
            'JO',
            'KE',
            'KG',
            'KH',
            'KI',
            'LU',
            'LY',
            'NE',
            'NO',
            'NR',
            'OM',
            'PY',
            'RW',
            'SA',
            'SC',
            'SI',
            'TJ',
            'UA',
            'UG',
            'US',
            'VC',
            'ZA',
          ].includes(code)
      ),
      // Plus the invalid/dependent codes unique to Array A
      'AI',
      'AN',
      'AS',
      'AW',
      'AX',
      'BM',
      'BQ',
      'BV',
      'CC',
      'CK',
      'FO',
      'GF',
      'GG',
      'GI',
      'GL',
      'GP',
      'GS',
      'GU',
      'HM',
      'IM',
      'IO',
      'JE',
      'MF',
      'MO',
      'NF',
      'NU',
      'PM',
      'PS',
      'RE',
      'SH',
      'SJ',
      'SX',
      'TC',
      'UM',
      'VG',
      'VI',
      'WF',
      'XK',
      'YT',
    ];

    it('KEY025 - Publisher', () => {
      const participant: { name: string; territoryCollection: Record<string, Shares> } = {
        name: 'Liberty Publishing',
        territoryCollection: {},
      };
      SOME_OF_WORLD_PLUS_INVALID_CODES.forEach(
        (t) =>
          // @ts-expect-error Partial type is fine for testing
          (participant.territoryCollection[t] = {
            mechanicalCollection: 100,
            performanceCollection: 50,
          })
      );

      const result = territoriesToGroups({
        participant,
        chainTerritories: SOME_OF_WORLD_PLUS_INVALID_CODES,
        allChainTerritories: [SOME_OF_WORLD_PLUS_INVALID_CODES],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Publisher',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes).toEqual([WORLD_CISAC]);
      expect(result.excludes).toEqual(
        CISAC_APPROVED_COUNTRIES_CODES.filter((t) => !SOME_OF_WORLD_PLUS_INVALID_CODES.includes(t))
          .map(convertIsoToCisacTerritoryCode)
          .filter((code): code is number => code !== null && code !== undefined)
          .sort((a, b) => a - b)
      );
    });

    it('KEY025 - Composer', () => {
      const participant: { name: string; shares: Record<string, Shares> } = {
        name: 'Sarah Johnson',
        shares: {},
      };
      SOME_OF_WORLD_PLUS_INVALID_CODES.forEach(
        (t) =>
          (participant.shares[t] = {
            mechanicalCollection: 0,
            mechanicalOwnership: 0,
            performanceCollection: 50,
            performanceOwnership: 50,
          })
      );

      const result = territoriesToGroups({
        participant,
        chainTerritories: SOME_OF_WORLD_PLUS_INVALID_CODES,
        allChainTerritories: [SOME_OF_WORLD_PLUS_INVALID_CODES],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world active
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world authorized
        isExtraPublisher: false,
        role: 'Composer',
        deliveryTerritory: [WORLD_CODE], // Ensure delivery is WW to avoid filtering
      });

      expect(result.includes).toEqual([WORLD_CISAC]);
      expect(result.excludes).toEqual(
        CISAC_APPROVED_COUNTRIES_CODES.filter((t) => !SOME_OF_WORLD_PLUS_INVALID_CODES.includes(t))
          .map(convertIsoToCisacTerritoryCode)
          .filter((code): code is number => code !== null && code !== undefined)
          .sort((a, b) => a - b)
      );
    });
  });

  describe('Zero-share territories (DP2/DP3 regression)', () => {
    it('should include territories with zero shares for controlled composers', () => {
      // This test covers the DP2/DP3 regression where composers with 0% shares
      // were not getting their territories included, causing them to be marked as OWR instead of SWR
      const participant = {
        name: 'Sarah Johnson',
        territoryCollection: {
          AT: { mechanicalCollection: 0, performanceCollection: 0 },
          NL: { mechanicalCollection: 0, performanceCollection: 0 },
          SE: { mechanicalCollection: 0, performanceCollection: 0 },
        },
      };

      const result = territoriesToGroups({
        participant,
        chainTerritories: ['AT', 'NL', 'SE'],
        allChainTerritories: [['AT', 'NL', 'SE']],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
        participantTerritories: ['AT', 'NL', 'SE'],
        isExtraPublisher: false,
        role: 'Composer',
        deliveryTerritory: [WORLD_CODE],
      });

      // Even with zero shares, territories should be included
      expect(result.includes.length).toBeGreaterThan(0);
      expect(result.includes).toContain(convertIsoToCisacTerritoryCode('AT'));
      expect(result.includes).toContain(convertIsoToCisacTerritoryCode('NL'));
      expect(result.includes).toContain(convertIsoToCisacTerritoryCode('SE'));
    });

    it('should include territories with zero shares for publishers', () => {
      const participant = {
        name: 'Crown Publishing',
        territoryCollection: {
          US: { mechanicalCollection: 0, performanceCollection: 0 },
          CA: { mechanicalCollection: 0, performanceCollection: 0 },
        },
      };

      const result = territoriesToGroups({
        participant,
        chainTerritories: ['US', 'CA'],
        allChainTerritories: [['US', 'CA']],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
        participantTerritories: ['US', 'CA'],
        isExtraPublisher: false,
        role: 'Publisher',
        deliveryTerritory: [WORLD_CODE],
      });

      expect(result.includes).toContain(convertIsoToCisacTerritoryCode('US'));
      expect(result.includes).toContain(convertIsoToCisacTerritoryCode('CA'));
    });

    it('should handle mixed zero and non-zero shares in same bucket scenario', () => {
      const participant = {
        name: 'Mixed Publisher',
        territoryCollection: {
          US: { mechanicalCollection: 50, performanceCollection: 50 },
          CA: { mechanicalCollection: 50, performanceCollection: 50 },
          GB: { mechanicalCollection: 0, performanceCollection: 0 },
          FR: { mechanicalCollection: 0, performanceCollection: 0 },
        },
      };

      const result = territoriesToGroups({
        participant,
        chainTerritories: ['US', 'CA', 'GB', 'FR'],
        allChainTerritories: [['US', 'CA', 'GB', 'FR']],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
        participantTerritories: ['US', 'CA', 'GB', 'FR'],
        isExtraPublisher: false,
        role: 'Publisher',
        deliveryTerritory: [WORLD_CODE],
      });

      // All territories should be included
      expect(result.includes).toContain(convertIsoToCisacTerritoryCode('US'));
      expect(result.includes).toContain(convertIsoToCisacTerritoryCode('CA'));
      expect(result.includes).toContain(convertIsoToCisacTerritoryCode('GB'));
      expect(result.includes).toContain(convertIsoToCisacTerritoryCode('FR'));
    });
  });

  describe('World flip with explicit WW share (KEY005C regression)', () => {
    it('should flip to World when participant has explicit WW share and covers all territories', () => {
      // This covers the KEY005C scenario where CROWN has WW share but also appears
      // in a territory group chain with different (0%) shares
      const territoryGroupISOs = ['AT', 'NL', 'SE', 'DE', 'FR']; // 55 territories simplified to 5

      const participant = {
        name: 'Crown Publishing',
        territoryCollection: {
          [WORLD_CODE]: { mechanicalCollection: 100, performanceCollection: 50 },
        },
      };

      // Add 0% shares for territory group territories
      territoryGroupISOs.forEach((iso) => {
        participant.territoryCollection[iso] = { mechanicalCollection: 0, performanceCollection: 0 };
      });

      const result = territoriesToGroups({
        participant,
        chainTerritories: CISAC_APPROVED_COUNTRIES_CODES, // Full world from WW chain
        allChainTerritories: [[WORLD_CODE], territoryGroupISOs],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES,
        isExtraPublisher: false,
        role: 'Publisher',
        deliveryTerritory: [WORLD_CODE],
      });

      // Should flip to World because participant has explicit WW share
      expect(result.includes).toContain(WORLD_CISAC);
      // Should exclude the territory group territories
      territoryGroupISOs.forEach((iso) => {
        const cisacCode = convertIsoToCisacTerritoryCode(iso);
        if (cisacCode) {
          expect(result.excludes).toContain(cisacCode);
        }
      });
    });

    it('should NOT flip to World when dominant bucket is below threshold and no explicit WW share', () => {
      // Create a scenario where participant has many territories but no WW share
      const halfWorld = CISAC_APPROVED_COUNTRIES_CODES.slice(0, 100); // Less than threshold
      const otherHalf = CISAC_APPROVED_COUNTRIES_CODES.slice(100);

      const participant = {
        name: 'Partial Publisher',
        territoryCollection: {} as Record<string, { mechanicalCollection: number; performanceCollection: number }>,
      };

      // Different shares for each half
      halfWorld.forEach((iso) => {
        participant.territoryCollection[iso] = { mechanicalCollection: 50, performanceCollection: 50 };
      });
      otherHalf.forEach((iso) => {
        participant.territoryCollection[iso] = { mechanicalCollection: 25, performanceCollection: 25 };
      });

      const result = territoriesToGroups({
        participant,
        chainTerritories: CISAC_APPROVED_COUNTRIES_CODES,
        allChainTerritories: [CISAC_APPROVED_COUNTRIES_CODES],
        workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
        participantTerritories: CISAC_APPROVED_COUNTRIES_CODES,
        isExtraPublisher: false,
        role: 'Publisher',
        deliveryTerritory: [WORLD_CODE],
      });

      // Should NOT flip to World - segmented mode
      expect(result.includes).not.toContain(WORLD_CISAC);
      expect(result.includes.length).toEqual(CISAC_APPROVED_COUNTRIES_CODES.length);
    });
  });

  it('should return excludes sorted in ascending numeric order', () => {
    const participant = {
      name: 'Crown Publishing',
      territoryCollection: {
        [WORLD_CODE]: { mechanicalCollection: 100, performanceCollection: 50 },
      },
    };

    const result = territoriesToGroups({
      participant,
      chainTerritories: CISAC_APPROVED_COUNTRIES_CODES.slice(0, 180), // Most of world
      allChainTerritories: [CISAC_APPROVED_COUNTRIES_CODES.slice(0, 180)],
      workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
      participantTerritories: CISAC_APPROVED_COUNTRIES_CODES.slice(0, 180),
      isExtraPublisher: false,
      role: 'Publisher',
      deliveryTerritory: [WORLD_CODE],
    });

    // Excludes should be sorted
    const sortedExcludes = [...result.excludes].sort((a, b) => a - b);
    expect(result.excludes).toEqual(sortedExcludes);
  });

  it('should handle empty chain territories', () => {
    const result = territoriesToGroups({
      // @ts-expect-error Testing null participant
      participant: null,
      chainTerritories: [],
      allChainTerritories: [[]],
      workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
      participantTerritories: [],
      isExtraPublisher: false,
      role: 'Publisher',
      deliveryTerritory: [WORLD_CODE],
    });

    expect(result.includes).toEqual([]);
    expect(result.excludes).toEqual([]);
  });

  it('should handle null participant gracefully', () => {
    const result = territoriesToGroups({
      // @ts-expect-error Testing null participant
      participant: null,
      chainTerritories: ['US', 'CA'],
      allChainTerritories: [['US', 'CA']],
      workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
      participantTerritories: ['US', 'CA'],
      isExtraPublisher: false,
      role: 'Publisher',
      deliveryTerritory: [WORLD_CODE],
    });

    expect(result.includes).toContain(convertIsoToCisacTerritoryCode('US'));
    expect(result.includes).toContain(convertIsoToCisacTerritoryCode('CA'));
  });

  it('should handle participant with empty territoryCollection', () => {
    const participant = {
      name: 'Empty Publisher',
      territoryCollection: {},
    };

    const result = territoriesToGroups({
      participant,
      chainTerritories: ['US', 'CA', 'GB'],
      allChainTerritories: [['US', 'CA', 'GB']],
      workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
      participantTerritories: ['US', 'CA', 'GB'],
      isExtraPublisher: false,
      role: 'Publisher',
      deliveryTerritory: [WORLD_CODE],
    });

    // Should still work, treating all as default bucket
    expect(result.includes.length).toBeGreaterThan(0);
  });

  it('should exclude territories not in work territories', () => {
    const participant = {
      name: 'Crown Publishing',
      territoryCollection: {
        US: { mechanicalCollection: 50, performanceCollection: 50 },
        CA: { mechanicalCollection: 50, performanceCollection: 50 },
        GB: { mechanicalCollection: 50, performanceCollection: 50 },
      },
    };

    const result = territoriesToGroups({
      participant,
      chainTerritories: ['US', 'CA', 'GB'],
      allChainTerritories: [['US', 'CA', 'GB']],
      workTerritories: ['US', 'CA'], // GB not in work territories
      participantTerritories: ['US', 'CA', 'GB'],
      isExtraPublisher: false,
      role: 'Publisher',
      deliveryTerritory: [WORLD_CODE],
    });

    expect(result.includes).toContain(convertIsoToCisacTerritoryCode('US'));
    expect(result.includes).toContain(convertIsoToCisacTerritoryCode('CA'));
    expect(result.includes).not.toContain(convertIsoToCisacTerritoryCode('GB'));
  });

  it('should exclude territories not in delivery territory', () => {
    const participant = {
      name: 'Crown Publishing',
      territoryCollection: {
        US: { mechanicalCollection: 50, performanceCollection: 50 },
        CA: { mechanicalCollection: 50, performanceCollection: 50 },
        GB: { mechanicalCollection: 50, performanceCollection: 50 },
      },
    };

    const result = territoriesToGroups({
      participant,
      chainTerritories: ['US', 'CA', 'GB'],
      allChainTerritories: [['US', 'CA', 'GB']],
      workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
      participantTerritories: ['US', 'CA', 'GB'],
      isExtraPublisher: false,
      role: 'Publisher',
      deliveryTerritory: ['US', 'CA'], // GB not in delivery territory
    });

    expect(result.includes).toContain(convertIsoToCisacTerritoryCode('US'));
    expect(result.includes).toContain(convertIsoToCisacTerritoryCode('CA'));
    expect(result.includes).not.toContain(convertIsoToCisacTerritoryCode('GB'));
  });

  it('should expand Africa continent code for composers', () => {
    const participant = {
      name: 'African Composer',
      territoryCollection: {
        Africa: { mechanicalCollection: 50, performanceCollection: 50 },
      },
    };

    const result = territoriesToGroups({
      participant,
      chainTerritories: ['Africa'],
      allChainTerritories: [['Africa']],
      workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
      participantTerritories: CISAC_APPROVED_COUNTRIES_CODES,
      isExtraPublisher: false,
      role: 'Composer',
      deliveryTerritory: [WORLD_CODE],
    });

    // Should contain African country codes
    const southAfricaCode = convertIsoToCisacTerritoryCode('ZA');
    const nigeriaCode = convertIsoToCisacTerritoryCode('NG');
    expect(result.includes).toContain(southAfricaCode);
    expect(result.includes).toContain(nigeriaCode);
  });

  it('should expand Americas continent code for composers', () => {
    const participant = {
      name: 'Americas Composer',
      territoryCollection: {
        Americas: { mechanicalCollection: 50, performanceCollection: 50 },
      },
    };

    const result = territoriesToGroups({
      participant,
      chainTerritories: ['Americas'],
      allChainTerritories: [['Americas']],
      workTerritories: CISAC_APPROVED_COUNTRIES_CODES,
      participantTerritories: CISAC_APPROVED_COUNTRIES_CODES,
      isExtraPublisher: false,
      role: 'Composer',
      deliveryTerritory: [WORLD_CODE],
    });

    // Should contain American country codes
    const usCode = convertIsoToCisacTerritoryCode('US');
    const brCode = convertIsoToCisacTerritoryCode('BR');
    expect(result.includes).toContain(usCode);
    expect(result.includes).toContain(brCode);
  });
});

describe('getTerritoriesFromChainAndWork', () => {
  it('should return simple intersections for arrays of ISO codes', () => {
    // Arrange
    const chainTerritories = ['US', 'CA', 'GB'];
    const comparisonTerritories = ['US', 'CA', 'MX'];

    // Act
    const result = getTerritoriesFromChainAndWork(chainTerritories, comparisonTerritories);

    // Assert
    expect(result).toEqual(['US', 'CA']);
  });

  it('should expand WW to all CISAC codes if comparison list meets the threshold', () => {
    // Arrange
    const chainTerritories = 'WW';
    // Mocking a full world comparison list
    const comparisonTerritories = [...CISAC_APPROVED_COUNTRIES_CODES];

    // Act
    const result = getTerritoriesFromChainAndWork(chainTerritories, comparisonTerritories);

    // Assert
    expect(result).toEqual(CISAC_APPROVED_COUNTRIES_CODES);
  });

  it('should return the full world if the intersection result exceeds the CISAC threshold', () => {
    // Arrange
    // Imagine a chain has 251 items, and work has the same 251.
    // It should trigger the "return all approved codes" logic.
    const chainTerritories = [...CISAC_APPROVED_COUNTRIES_CODES, 'EXTRA', 'INVALID', 'ISO'];
    const comparisonTerritories = [...CISAC_APPROVED_COUNTRIES_CODES, 'EXTRA', 'INVALID', 'ISO'];

    // Act
    const result = getTerritoriesFromChainAndWork(chainTerritories, comparisonTerritories);

    // Assert
    expect(result).toEqual(CISAC_APPROVED_COUNTRIES_CODES);
  });

  it('should correctly expand and filter a continent code (e.g., Europe)', () => {
    // Arrange
    const chainTerritories = 'Europe';
    const comparisonTerritories = ['FR', 'DE', 'US']; // Work only valid in FR, DE, and US

    // Act
    const result = getTerritoriesFromChainAndWork(chainTerritories, comparisonTerritories);

    // Assert
    // Should only contain the European countries present in the comparison list
    expect(result).toEqual(['FR', 'DE']);
  });

  it('should return exactly the continent codes if the continent and work match perfectly', () => {
    // Arrange
    const continent = 'Europe';
    const europeCodes = continentToTerritoryCodes(continent);
    const chainTerritories = continent;
    const comparisonTerritories = [...europeCodes];

    // Act
    const result = getTerritoriesFromChainAndWork(chainTerritories, comparisonTerritories);

    // Assert
    expect(result.sort()).toEqual(europeCodes.sort());
  });

  it('should handle nested arrays by flattening them', () => {
    // Arrange
    const chainTerritories = [['US'], ['CA']];
    const comparisonTerritories = ['US', 'CA', 'GB'];

    // Act
    // @ts-expect-error Testing runtime flattening
    const result = getTerritoriesFromChainAndWork(chainTerritories, comparisonTerritories);

    // Assert
    expect(result).toEqual(['US', 'CA']);
  });

  it('should return an empty array when there is no intersection', () => {
    // Arrange
    const chainTerritories = ['US', 'CA'];
    const comparisonTerritories = ['GB', 'FR'];

    // Act
    const result = getTerritoriesFromChainAndWork(chainTerritories, comparisonTerritories);

    // Assert
    expect(result).toEqual([]);
  });

  it('should handle "World" string and return partial intersection if threshold not met', () => {
    // Arrange
    const chainTerritories = 'World';
    const comparisonTerritories = ['US', 'CA']; // Only 2 countries (below CISAC threshold)

    // Act
    const result = getTerritoriesFromChainAndWork(chainTerritories, comparisonTerritories);

    // Assert
    // Since World is expanded and then filtered by comparison list
    expect(result.sort()).toEqual(['US', 'CA'].sort());
  });

  it('should handle WW in array format', () => {
    const result = getTerritoriesFromChainAndWork(['WW'], CISAC_APPROVED_COUNTRIES_CODES);
    expect(result).toEqual(CISAC_APPROVED_COUNTRIES_CODES);
  });

  it('should handle comparison with WW indicator', () => {
    const result = getTerritoriesFromChainAndWork(CISAC_APPROVED_COUNTRIES_CODES, [
      'WW',
      ...CISAC_APPROVED_COUNTRIES_CODES,
    ]);
    expect(result).toEqual(CISAC_APPROVED_COUNTRIES_CODES);
  });

  it('should handle World code (not WW)', () => {
    const result = getTerritoriesFromChainAndWork('World', CISAC_APPROVED_COUNTRIES_CODES);
    expect(result).toEqual(CISAC_APPROVED_COUNTRIES_CODES);
  });

  it('should handle deeply nested arrays', () => {
    // @ts-expect-error Testing runtime behavior with nested arrays
    const result = getTerritoriesFromChainAndWork([['US', 'CA'], ['GB']], ['US', 'CA', 'GB', 'FR']);
    expect(result.sort()).toEqual(['US', 'CA', 'GB'].sort());
  });
});

describe('isWorldCode', () => {
  it('should return true for WW', () => {
    expect(isWorldCode('WW')).toBe(true);
  });

  it('should return true for World', () => {
    expect(isWorldCode('World')).toBe(true);
  });

  it('should return false for country codes', () => {
    expect(isWorldCode('US')).toBe(false);
    expect(isWorldCode('GB')).toBe(false);
    expect(isWorldCode('BE')).toBe(false);
  });

  it('should return false for continent codes', () => {
    expect(isWorldCode('Europe')).toBe(false);
    expect(isWorldCode('Africa')).toBe(false);
  });
});

describe('hasWorldIndicator', () => {
  it('should return true if array contains WW', () => {
    expect(hasWorldIndicator(['US', 'WW', 'GB'])).toBe(true);
  });

  it('should return true if array contains World', () => {
    expect(hasWorldIndicator(['US', 'World', 'GB'])).toBe(true);
  });

  it('should return false if array has no world indicators', () => {
    expect(hasWorldIndicator(['US', 'GB', 'FR'])).toBe(false);
  });

  it('should return false for empty array', () => {
    expect(hasWorldIndicator([])).toBe(false);
  });
});

describe('filterValidCisacTerritories', () => {
  it('should keep only valid CISAC country codes', () => {
    const result = filterValidCisacTerritories(['US', 'GB', 'XX', 'YY', 'FR']);
    expect(result).toEqual(['US', 'GB', 'FR']);
  });

  it('should filter out WW and World codes', () => {
    const result = filterValidCisacTerritories(['US', 'WW', 'World', 'GB']);
    expect(result).toEqual(['US', 'GB']);
  });

  it('should filter out continent codes', () => {
    const result = filterValidCisacTerritories(['US', 'Europe', 'Africa', 'GB']);
    expect(result).toEqual(['US', 'GB']);
  });

  it('should return empty array for empty input', () => {
    expect(filterValidCisacTerritories([])).toEqual([]);
  });

  it('should return empty array if all codes are invalid', () => {
    expect(filterValidCisacTerritories(['XX', 'YY', 'ZZ'])).toEqual([]);
  });
});

describe('toNumericCisacCodes', () => {
  it('should convert ISO codes to CISAC numeric codes', () => {
    const result = toNumericCisacCodes(['US', 'GB', 'FR']);
    expect(result).toEqual([840, 826, 250]);
  });

  it('should filter out codes that cannot be converted', () => {
    const result = toNumericCisacCodes(['US', 'XX', 'GB']);
    expect(result).toEqual([840, 826]);
  });

  it('should convert WW to 2136', () => {
    const result = toNumericCisacCodes(['WW']);
    expect(result).toEqual([WORLD_CISAC]);
  });

  it('should return empty array for empty input', () => {
    expect(toNumericCisacCodes([])).toEqual([]);
  });
});

describe('expandTerritoryCode', () => {
  it('should expand Europe to European country codes', () => {
    const result = expandTerritoryCode('Europe');
    expect(result.length).toBeGreaterThan(30);
    expect(result).toContain('GB');
    expect(result).toContain('FR');
    expect(result).toContain('DE');
  });

  it('should expand Africa to African country codes', () => {
    const result = expandTerritoryCode('Africa');
    expect(result.length).toBeGreaterThan(40);
    expect(result).toContain('ZA');
    expect(result).toContain('EG');
  });

  it('should expand WW to all CISAC codes', () => {
    const result = expandTerritoryCode('WW');
    expect(result).toEqual(CISAC_APPROVED_COUNTRIES_CODES);
  });

  it('should return single country code as-is (in array)', () => {
    const result = expandTerritoryCode('US');
    expect(result).toEqual(['US']);
  });
});
