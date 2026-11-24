/* eslint-disable @typescript-eslint/no-var-requires */
const MechanicalAmount = require('./index');

// Mock dependencies
jest.mock('../controlledComposition', () => ({
  getControlledCompositionRate: jest.fn()
}));

jest.mock('../../mechanicalUtils', () => ({
  sortMechanicalRatesObject: jest.fn((ratesObject) => ratesObject)
}));

jest.mock('async', () => ({
  eachLimit: jest.fn((items, limit, iteratee, callback) => {
    // Simple mock that calls iteratee for each item then calls callback
    Promise.all(items.map(item => iteratee(item)))
      .then(() => callback(null))
      .catch(callback);
  })
}));

const ControlledComposition = require('../controlledComposition');
const MechanicalUtils = require('../../mechanicalUtils');
const async = require('async');

describe('MechanicalAmount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStatRateMinutes', () => {
    it('should return 0 for NaN duration', () => {
      const result = MechanicalAmount.getStatRateMinutes(NaN);
      expect(result).toBe(0);
    });

    it('should return NaN for undefined duration', () => {
      const result = MechanicalAmount.getStatRateMinutes(undefined);
      expect(result).toBeNaN();
    });

    it('should return 1 minute for durations 1-60 seconds', () => {
      expect(MechanicalAmount.getStatRateMinutes(30)).toBe(1);
      expect(MechanicalAmount.getStatRateMinutes(60)).toBe(1);
    });

    it('should return 2 minutes for durations 61-120 seconds', () => {
      expect(MechanicalAmount.getStatRateMinutes(61)).toBe(2);
      expect(MechanicalAmount.getStatRateMinutes(120)).toBe(2);
    });

    it('should ceil fractional minutes correctly', () => {
      expect(MechanicalAmount.getStatRateMinutes(180)).toBe(3); // exactly 3 minutes
      expect(MechanicalAmount.getStatRateMinutes(181)).toBe(4); // 3 minutes 1 second -> ceil to 4
    });
  });

  describe('getMinStatRateForDate', () => {
    it('should return 0 when statRates is null or undefined', () => {
      expect(MechanicalAmount.getMinStatRateForDate(null, '2023-06-01')).toBe(0);
      expect(MechanicalAmount.getMinStatRateForDate(undefined, '2023-06-01')).toBe(0);
    });

    it('should return the latest rate before the given date', () => {
      const statRates = [
        { startDate: '2023-01-01', minAmount: 0.10 },
        { startDate: '2023-03-01', minAmount: 0.12 },
        { startDate: '2023-06-01', minAmount: 0.15 },
        { startDate: '2023-09-01', minAmount: 0.18 }
      ];

      // Date between March and June rates
      const result = MechanicalAmount.getMinStatRateForDate(statRates, '2023-05-15');
      expect(result).toBe(0.12);
    });

    it('should return the first rate when date is after all rates', () => {
      const statRates = [
        { startDate: '2023-01-01', minAmount: 0.10 },
        { startDate: '2023-03-01', minAmount: 0.12 }
      ];

      const result = MechanicalAmount.getMinStatRateForDate(statRates, '2023-12-01');
      expect(result).toBe(0.12);
    });

    it('should return 0 when date is before all rates', () => {
      const statRates = [
        { startDate: '2023-03-01', minAmount: 0.12 },
        { startDate: '2023-06-01', minAmount: 0.15 }
      ];

      const result = MechanicalAmount.getMinStatRateForDate(statRates, '2023-01-01');
      expect(result).toBe(0);
    });

    it('should handle missing minAmount and return 0', () => {
      const statRates = [
        { startDate: '2023-01-01' }, // No minAmount
        { startDate: '2023-03-01', minAmount: 0.12 }
      ];

      const result = MechanicalAmount.getMinStatRateForDate(statRates, '2023-02-01');
      expect(result).toBe(0);
    });

    it('should handle empty statRates array', () => {
      const result = MechanicalAmount.getMinStatRateForDate([], '2023-06-01');
      expect(result).toBe(0);
    });
  });

  describe('getMechanicalBasisPercentage', () => {
    let mockCallback;

    beforeEach(() => {
      mockCallback = jest.fn();
    });

    it('should use trackCapOverride when provided (including 0)', () => {
      const release = {
        trackIds: ['track1', 'track2', 'track3', 'track4'], // 4 tracks
        mechanicalTrackCap: 10,
        mechanicalBasisPercentage: 75
      };

      MechanicalAmount.getMechanicalBasisPercentage(release, 2, mockCallback);

      // 2 tracks / 4 total = 50%
      expect(mockCallback).toHaveBeenCalledWith(null, '50.00000');
    });

    it('should handle trackCapOverride of 0', () => {
      const release = {
        trackIds: ['track1', 'track2', 'track3', 'track4'], // 4 tracks
        mechanicalTrackCap: 10,
        mechanicalBasisPercentage: 75
      };

      MechanicalAmount.getMechanicalBasisPercentage(release, 0, mockCallback);

      // 0 is falsy, so it falls back to mechanicalBasisPercentage
      expect(mockCallback).toHaveBeenCalledWith(null, 75);
    });

    it('should use release mechanicalTrackCap when no override provided', () => {
      const release = {
        trackIds: ['track1', 'track2', 'track3', 'track4'], // 4 tracks
        mechanicalTrackCap: 2,
        mechanicalBasisPercentage: 75
      };

      MechanicalAmount.getMechanicalBasisPercentage(release, null, mockCallback);

      // 2 tracks / 4 total = 50%
      expect(mockCallback).toHaveBeenCalledWith(null, '50.00000');
    });

    it('should return 100 when trackCap is greater than or equal to total tracks', () => {
      const release = {
        trackIds: ['track1', 'track2'], // 2 tracks
        mechanicalTrackCap: 5, // Cap is higher than track count
        mechanicalBasisPercentage: 75
      };

      MechanicalAmount.getMechanicalBasisPercentage(release, null, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, 100);
    });

    it('should return mechanicalBasisPercentage when no trackCap is set', () => {
      const release = {
        trackIds: ['track1', 'track2'],
        mechanicalBasisPercentage: 85
        // No mechanicalTrackCap
      };

      MechanicalAmount.getMechanicalBasisPercentage(release, null, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, 85);
    });

    it('should handle empty trackIds array', () => {
      const release = {
        trackIds: [],
        mechanicalTrackCap: 2,
        mechanicalBasisPercentage: 75
      };

      MechanicalAmount.getMechanicalBasisPercentage(release, null, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, 75);
    });

    it('should handle missing trackIds', () => {
      const release = {
        mechanicalTrackCap: 2,
        mechanicalBasisPercentage: 75
      };

      MechanicalAmount.getMechanicalBasisPercentage(release, null, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, 75);
    });
  });

  describe('addRatesToObject', () => {
    let ratesObject;

    beforeEach(() => {
      ratesObject = {
        '2023-01-01': {
          US: 0,
          CA: 0,
          minUS: 0,
          minCA: 0,
          usMinAmount: 0.10,
          usPerMinuteRate: 0.05,
          caMinAmount: 0.08,
          caPerMinuteRate: 0.04
        }
      };
    });

    it('should add rates for track with Sale Date basis and short duration (< 301 seconds)', () => {
      const track = {
        duration: 180, // 3 minutes, less than 301 seconds
        mechanicalCalculationBasis: 'Sale Date'
      };

      MechanicalAmount.addRatesToObject(ratesObject, track, 1);

      expect(ratesObject['2023-01-01'].US).toBe(0.10); // 1 * usMinAmount
      expect(ratesObject['2023-01-01'].minUS).toBe(0.10);
      expect(ratesObject['2023-01-01'].CA).toBe(0.08); // 1 * caMinAmount
      expect(ratesObject['2023-01-01'].minCA).toBe(0.08);
    });

    it('should add rates for track with Sale Date basis and long duration (>= 301 seconds)', () => {
      const track = {
        duration: 360, // 6 minutes, >= 301 seconds
        mechanicalCalculationBasis: 'Sale Date'
      };

      MechanicalAmount.addRatesToObject(ratesObject, track, 1);

      // 6 minutes * per minute rate
      expect(ratesObject['2023-01-01'].US).toBeCloseTo(0.30, 5); // 6 * 0.05
      expect(ratesObject['2023-01-01'].minUS).toBe(0.10); // still uses minAmount
      expect(ratesObject['2023-01-01'].CA).toBeCloseTo(0.24, 5); // 6 * 0.04
      expect(ratesObject['2023-01-01'].minCA).toBe(0.08);
    });

    it('should add rates for track with non-Sale Date basis using statutory rates', () => {
      const track = {
        duration: 180,
        mechanicalCalculationBasis: 'Other',
        statutoryRate: 0.15,
        canadianStatutoryRate: 0.12
      };

      MechanicalAmount.addRatesToObject(ratesObject, track, 1);

      expect(ratesObject['2023-01-01'].US).toBe(0.15);
      expect(ratesObject['2023-01-01'].minUS).toBe(0.10);
      expect(ratesObject['2023-01-01'].CA).toBe(0.12);
      expect(ratesObject['2023-01-01'].minCA).toBe(0.08);
    });

    it('should apply multiplier correctly', () => {
      const track = {
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date'
      };

      MechanicalAmount.addRatesToObject(ratesObject, track, 0.5);

      expect(ratesObject['2023-01-01'].US).toBe(0.05); // 0.5 * 0.10
      expect(ratesObject['2023-01-01'].CA).toBe(0.04); // 0.5 * 0.08
    });

    it('should default duration to 1 if not provided', () => {
      const track = {
        mechanicalCalculationBasis: 'Sale Date'
        // No duration provided
      };

      MechanicalAmount.addRatesToObject(ratesObject, track, 1);

      // Should use minAmount path since duration defaults to 1 (< 301)
      expect(ratesObject['2023-01-01'].US).toBe(0.10);
      expect(ratesObject['2023-01-01'].CA).toBe(0.08);
    });

    it('should handle missing rate values gracefully', () => {
      const ratesObjectWithMissingRates = {
        '2023-01-01': {
          US: 0,
          CA: 0,
          minUS: 0,
          minCA: 0
          // Missing usMinAmount, caMinAmount, etc.
        }
      };

      const track = {
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date'
      };

      MechanicalAmount.addRatesToObject(ratesObjectWithMissingRates, track, 1);

      expect(ratesObjectWithMissingRates['2023-01-01'].US).toBe(0); // 1 * 0 (missing rate)
      expect(ratesObjectWithMissingRates['2023-01-01'].CA).toBe(0);
    });
  });

  describe('calculateRates', () => {
    let mockCallback;
    let ratesObject;

    beforeEach(() => {
      mockCallback = jest.fn();
      ratesObject = {
        '2023-01-01': {
          US: 0,
          CA: 0,
          minUS: 0,
          minCA: 0,
          usMinAmount: 0.10,
          caMinAmount: 0.08
        }
      };

      // Mock addRatesToObject to track calls
      jest.spyOn(MechanicalAmount, 'addRatesToObject').mockImplementation(() => {});
    });

    afterEach(() => {
      MechanicalAmount.addRatesToObject.mockRestore();
    });

    it('should calculate rates for track with mechanical licenses', () => {
      const release = {
        trackIds: ['track1', 'track2'],
        mechanicalTrackCap: 2,
        mechanicalLicenses: {
          track1: {
            reportMechanicals: true,
            licenses: [
              { share: 50, rate: 75 },
              { share: 30, rate: 80 }
            ]
          }
        }
      };

      const track = {
        _id: { toString: () => 'track1' },
        statutoryRate: 0.15,
        canadianStatutoryRate: 0.12
      };

      MechanicalAmount.calculateRates(ratesObject, release, track, mockCallback);

      expect(MechanicalAmount.addRatesToObject).toHaveBeenCalledTimes(2);
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should calculate rates with track cap override', () => {
      const release = {
        trackIds: ['track1', 'track2', 'track3', 'track4'], // 4 tracks
        mechanicalTrackCap: 4,
        mechanicalLicenses: {
          track1: {
            reportMechanicals: true,
            licenses: [
              { share: 100, rate: 75, trackCapOverride: 2 } // Override to 2 tracks
            ]
          }
        }
      };

      const track = {
        _id: { toString: () => 'track1' },
        statutoryRate: 0.15
      };

      MechanicalAmount.calculateRates(ratesObject, release, track, mockCallback);

      expect(MechanicalAmount.addRatesToObject).toHaveBeenCalledWith(
        ratesObject,
        track,
        expect.closeTo(0.375, 3) // 0.75 * 1.0 * 0.5 (2/4 tracks)
      );
    });

    it('should set statutory rates to 0 when reportMechanicals is false', () => {
      const release = {
        trackIds: ['track1', 'track2'],
        mechanicalLicenses: {
          track1: {
            reportMechanicals: false
          }
        }
      };

      const track = {
        _id: { toString: () => 'track1' },
        statutoryRate: 0.15,
        canadianStatutoryRate: 0.12
      };

      MechanicalAmount.calculateRates(ratesObject, release, track, mockCallback);

      expect(track.statutoryRate).toBe(0);
      expect(track.canadianStatutoryRate).toBe(0);
      expect(MechanicalAmount.addRatesToObject).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should set statutory rates to 0 when no mechanical licenses exist for track', () => {
      const release = {
        trackIds: ['track1', 'track2'],
        mechanicalTrackCap: 2,
        mechanicalLicenses: {
          // track1 not in licenses
        }
      };

      const track = {
        _id: { toString: () => 'track1' },
        statutoryRate: 0.15,
        canadianStatutoryRate: 0.12
      };

      MechanicalAmount.calculateRates(ratesObject, release, track, mockCallback);

      // The function sets statutory rates to 0 when no licenses exist
      expect(track.statutoryRate).toBe(0);
      expect(track.canadianStatutoryRate).toBe(0);
      expect(MechanicalAmount.addRatesToObject).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should handle track with no statutory rates', () => {
      const release = {
        trackIds: ['track1', 'track2'],
        mechanicalLicenses: {}
      };

      const track = {
        _id: { toString: () => 'track1' },
        statutoryRate: 0,
        canadianStatutoryRate: 0
      };

      MechanicalAmount.calculateRates(ratesObject, release, track, mockCallback);

      expect(MechanicalAmount.addRatesToObject).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should handle mechanical track cap calculations when track has licenses', () => {
      const release = {
        trackIds: ['track1', 'track2', 'track3', 'track4'], // 4 tracks
        mechanicalTrackCap: 2, // Cap at 2 tracks
        mechanicalLicenses: {
          track1: {
            reportMechanicals: true,
            licenses: [] // Empty licenses, so it goes to the else branch
          }
        }
      };

      const track = {
        _id: { toString: () => 'track1' },
        statutoryRate: 0.15,
        canadianStatutoryRate: 0.12
      };

      MechanicalAmount.calculateRates(ratesObject, release, track, mockCallback);

      expect(MechanicalAmount.addRatesToObject).toHaveBeenCalledWith(
        ratesObject,
        track,
        0.5 // 2 tracks / 4 total = 0.5
      );
    });
  });

  describe('get', () => {
    let mockCallback;
    let mockLevelDB;

    beforeEach(() => {
      mockCallback = jest.fn();
      mockLevelDB = {
        get: jest.fn()
      };
    });

    it('should build rates object from US and CA stat rates', () => {
      const client = {
        usStatRates: [
          { startDate: '2023-01-01', minAmount: 0.10, perMinuteRate: 0.05 }
        ],
        caStatRates: [
          { startDate: '2023-01-01', minAmount: 0.08, perMinuteRate: 0.04 }
        ]
      };

      const release = {
        trackIds: ['track1']
      };

      mockLevelDB.get.mockResolvedValue({
        _id: 'track1',
        statutoryRate: 0.15,
        canadianStatutoryRate: 0.12,
        duration: 180
      });

      MechanicalAmount.get(release, client, mockLevelDB, mockCallback);

      expect(MechanicalUtils.sortMechanicalRatesObject).toHaveBeenCalled();
    });

    it('should handle controlled composition clause', () => {
      const client = {
        usStatRates: [
          { startDate: '2023-01-01', minAmount: 0.10, perMinuteRate: 0.05 }
        ]
      };

      const release = {
        controlledCompositionClause: true,
        trackIds: ['track1']
      };

      ControlledComposition.getControlledCompositionRate.mockImplementation((ratesObject, release, levelDB, callback) => {
        callback(null, {
          '2023-01-01': {
            US: 0.20,
            CA: 0.16,
            usMinAmount: 0.10,
            caMinAmount: 0.08
          }
        });
      });

      MechanicalAmount.get(release, client, mockLevelDB, mockCallback);

      expect(ControlledComposition.getControlledCompositionRate).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
        '2023-01-01': expect.objectContaining({
          US: 0.20,
          CA: 0.16
        })
      }));
    });

    it('should handle release with mechanical licenses', async () => {
      const client = {
        usStatRates: [
          { startDate: '2023-01-01', minAmount: 0.10, perMinuteRate: 0.05 }
        ]
      };

      const release = {
        trackIds: ['track1', 'track2'],
        mechanicalLicenses: {
          track1: { reportMechanicals: true }
        }
      };

      mockLevelDB.get
        .mockResolvedValueOnce({
          _id: 'track1',
          statutoryRate: 0.15,
          canadianStatutoryRate: 0.12,
          duration: 180
        })
        .mockResolvedValueOnce({
          _id: 'track2',
          statutoryRate: 0.15,
          canadianStatutoryRate: 0.12,
          duration: 240
        });

      // Mock calculateRates
      jest.spyOn(MechanicalAmount, 'calculateRates').mockImplementation((ratesObject, release, track, callback) => {
        callback();
      });

      MechanicalAmount.get(release, client, mockLevelDB, mockCallback);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(async.eachLimit).toHaveBeenCalled();
      expect(MechanicalAmount.calculateRates).toHaveBeenCalledTimes(2);

      MechanicalAmount.calculateRates.mockRestore();
    });

    it('should handle release without mechanical licenses', async () => {
      const client = {
        usStatRates: [
          { startDate: '2023-01-01', minAmount: 0.10, perMinuteRate: 0.05 }
        ]
      };

      const release = {
        trackIds: ['track1']
      };

      mockLevelDB.get.mockResolvedValue({
        _id: 'track1',
        statutoryRate: 0.15,
        canadianStatutoryRate: 0.12,
        duration: 180
      });

      jest.spyOn(MechanicalAmount, 'addRatesToObject').mockImplementation(() => {});

      MechanicalAmount.get(release, client, mockLevelDB, mockCallback);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(async.eachLimit).toHaveBeenCalled();
      expect(MechanicalAmount.addRatesToObject).toHaveBeenCalled();

      MechanicalAmount.addRatesToObject.mockRestore();
    });

    it('should handle missing tracks gracefully', async () => {
      const client = {
        usStatRates: [
          { startDate: '2023-01-01', minAmount: 0.10, perMinuteRate: 0.05 }
        ]
      };

      const release = {
        trackIds: ['track1', 'nonexistent']
      };

      mockLevelDB.get
        .mockResolvedValueOnce({
          _id: 'track1',
          statutoryRate: 0.15,
          canadianStatutoryRate: 0.12
        })
        .mockResolvedValueOnce(null); // nonexistent track

      MechanicalAmount.get(release, client, mockLevelDB, mockCallback);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockLevelDB.get).toHaveBeenCalledTimes(2);
    });

    it('should filter out falsy trackIds', () => {
      const client = {
        usStatRates: [
          { startDate: '2023-01-01', minAmount: 0.10, perMinuteRate: 0.05 }
        ]
      };

      const release = {
        trackIds: ['track1', null, '', 'track2']
      };

      MechanicalAmount.get(release, client, mockLevelDB, mockCallback);

      expect(async.eachLimit).toHaveBeenCalledWith(
        ['track1', 'track2'], // Falsy values filtered out
        20,
        expect.any(Function),
        expect.any(Function)
      );
    });
  });
});
