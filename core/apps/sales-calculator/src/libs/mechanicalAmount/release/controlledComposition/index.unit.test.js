/* eslint-disable @typescript-eslint/no-var-requires */
const ControlledComposition = require('./index');

// Mock MechanicalUtils
jest.mock('../../mechanicalUtils', () => ({
  sortMechanicalRatesObject: jest.fn((ratesObject) => 
    // Simple mock implementation that preserves the object
     ratesObject
  )
}));

const MechanicalUtils = require('../../mechanicalUtils');

describe('ControlledComposition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStatRateMinutes', () => {
    it('should return 0 for NaN duration', () => {
      const result = ControlledComposition.getStatRateMinutes(NaN);
      expect(result).toBe(0);
    });

    it('should return NaN for undefined duration', () => {
      const result = ControlledComposition.getStatRateMinutes(undefined);
      expect(result).toBeNaN();
    });

    it('should return 1 minute for durations 1-60 seconds', () => {
      expect(ControlledComposition.getStatRateMinutes(30)).toBe(1);
      expect(ControlledComposition.getStatRateMinutes(60)).toBe(1);
    });

    it('should return 2 minutes for durations 61-120 seconds', () => {
      expect(ControlledComposition.getStatRateMinutes(61)).toBe(2);
      expect(ControlledComposition.getStatRateMinutes(120)).toBe(2);
    });

    it('should ceil fractional minutes correctly', () => {
      expect(ControlledComposition.getStatRateMinutes(180)).toBe(3); // exactly 3 minutes
      expect(ControlledComposition.getStatRateMinutes(181)).toBe(4); // 3 minutes 1 second -> ceil to 4
      expect(ControlledComposition.getStatRateMinutes(359)).toBe(6); // 5 minutes 59 seconds -> ceil to 6
    });

    it('should handle large durations', () => {
      expect(ControlledComposition.getStatRateMinutes(3600)).toBe(60); // 1 hour = 60 minutes
    });
  });

  describe('getTotalTracks', () => {
    it('should count all tracks when no mechanicalLicenses exist', () => {
      const release = {
        trackIds: ['track1', 'track2', 'track3'],
        mechanicalLicenses: {}
      };

      const result = ControlledComposition.getTotalTracks(release);
      expect(result).toBe(3);
    });

    it('should count only tracks with reportMechanicals enabled', () => {
      const release = {
        trackIds: ['track1', 'track2', 'track3'],
        mechanicalLicenses: {
          track1: { reportMechanicals: true },
          track2: { reportMechanicals: false },
          track3: { reportMechanicals: true }
        }
      };

      const result = ControlledComposition.getTotalTracks(release);
      expect(result).toBe(2);
    });

    it('should include tracks without mechanicalLicenses entry as fallback', () => {
      const release = {
        trackIds: ['track1', 'track2', 'track3'],
        mechanicalLicenses: {
          track1: { reportMechanicals: true },
          // track2 missing - should be included as fallback
          track3: { reportMechanicals: false }
        }
      };

      const result = ControlledComposition.getTotalTracks(release);
      expect(result).toBe(2); // track1 + track2 (fallback)
    });

    it('should apply mechanical track cap when it is less than total tracks', () => {
      const release = {
        trackIds: ['track1', 'track2', 'track3', 'track4'],
        mechanicalTrackCap: 2,
        mechanicalLicenses: {
          track1: { reportMechanicals: true },
          track2: { reportMechanicals: true },
          track3: { reportMechanicals: true },
          track4: { reportMechanicals: true }
        }
      };

      const result = ControlledComposition.getTotalTracks(release);
      expect(result).toBe(2);
    });

    it('should not apply mechanical track cap when it is greater than total tracks', () => {
      const release = {
        trackIds: ['track1', 'track2'],
        mechanicalTrackCap: 5,
        mechanicalLicenses: {
          track1: { reportMechanicals: true },
          track2: { reportMechanicals: true }
        }
      };

      const result = ControlledComposition.getTotalTracks(release);
      expect(result).toBe(2);
    });

    it('should handle empty trackIds array', () => {
      const release = {
        trackIds: []
      };

      const result = ControlledComposition.getTotalTracks(release);
      expect(result).toBe(0);
    });
  });

  describe('getOrSkipControlledComposition', () => {
    let mockCallback;

    beforeEach(() => {
      mockCallback = jest.fn();
      MechanicalUtils.sortMechanicalRatesObject.mockImplementation((obj) => obj);
    });

    it('should build rates object from US stat rates', () => {
      const client = {
        usStatRates: [
          {
            startDate: '2023-01-01',
            minAmount: 0.10,
            perMinuteRate: 0.05
          },
          {
            startDate: '2023-06-01',
            minAmount: 0.12,
            perMinuteRate: 0.06
          }
        ]
      };

      const release = {
        controlledCompositionClause: true
      };

      jest.spyOn(ControlledComposition, 'getControlledCompositionRate').mockImplementation(() => {
        // Just verify the function was called
      });

      ControlledComposition.getOrSkipControlledComposition(release, client, mockCallback);

      expect(MechanicalUtils.sortMechanicalRatesObject).toHaveBeenCalled();
      expect(ControlledComposition.getControlledCompositionRate).toHaveBeenCalled();

      const ratesObjectArg = ControlledComposition.getControlledCompositionRate.mock.calls[0][0];
      expect(ratesObjectArg['2023-01-01']).toEqual({
        US: 0,
        CA: 0,
        minUS: 0,
        minCA: 0,
        usMinAmount: 0.10,
        usPerMinuteRate: 0.05
      });
    });

    it('should build rates object from CA stat rates', () => {
      const client = {
        caStatRates: [
          {
            startDate: '2023-01-01',
            minAmount: 0.08,
            perMinuteRate: 0.04
          }
        ]
      };

      const release = {
        controlledCompositionClause: true
      };

      jest.spyOn(ControlledComposition, 'getControlledCompositionRate').mockImplementation(() => {
        // Just verify the function was called
      });

      ControlledComposition.getOrSkipControlledComposition(release, client, mockCallback);

      const ratesObjectArg = ControlledComposition.getControlledCompositionRate.mock.calls[0][0];
      expect(ratesObjectArg['2023-01-01']).toEqual({
        US: 0,
        CA: 0,
        minUS: 0,
        minCA: 0,
        caMinAmount: 0.08,
        caPerMinuteRate: 0.04
      });
    });

    it('should merge US and CA rates for same date', () => {
      const client = {
        usStatRates: [
          {
            startDate: '2023-01-01',
            minAmount: 0.10,
            perMinuteRate: 0.05
          }
        ],
        caStatRates: [
          {
            startDate: '2023-01-01',
            minAmount: 0.08,
            perMinuteRate: 0.04
          }
        ]
      };

      const release = {
        controlledCompositionClause: true
      };

      jest.spyOn(ControlledComposition, 'getControlledCompositionRate').mockImplementation(() => {
        // Just verify the function was called
      });

      ControlledComposition.getOrSkipControlledComposition(release, client, mockCallback);

      const ratesObjectArg = ControlledComposition.getControlledCompositionRate.mock.calls[0][0];
      expect(ratesObjectArg['2023-01-01']).toEqual({
        US: 0,
        CA: 0,
        minUS: 0,
        minCA: 0,
        usMinAmount: 0.10,
        usPerMinuteRate: 0.05,
        caMinAmount: 0.08,
        caPerMinuteRate: 0.04
      });
    });

    it('should skip when release has no controlledCompositionClause', () => {
      const client = {
        usStatRates: [
          {
            startDate: '2023-01-01',
            minAmount: 0.10,
            perMinuteRate: 0.05
          }
        ]
      };

      const release = {}; // No controlledCompositionClause

      ControlledComposition.getOrSkipControlledComposition(release, client, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith();
      expect(ControlledComposition.getControlledCompositionRate).not.toHaveBeenCalled();
    });

    it('should handle missing release', () => {
      const client = {
        usStatRates: [
          {
            startDate: '2023-01-01',
            minAmount: 0.10,
            perMinuteRate: 0.05
          }
        ]
      };

      ControlledComposition.getOrSkipControlledComposition(null, client, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith();
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

      ControlledComposition.addRatesToObject(ratesObject, track, 1);

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

      ControlledComposition.addRatesToObject(ratesObject, track, 1);

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

      ControlledComposition.addRatesToObject(ratesObject, track, 1);

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

      ControlledComposition.addRatesToObject(ratesObject, track, 2);

      expect(ratesObject['2023-01-01'].US).toBe(0.20); // 2 * 0.10
      expect(ratesObject['2023-01-01'].CA).toBe(0.16); // 2 * 0.08
    });

    it('should default duration to 1 if not provided', () => {
      const track = {
        mechanicalCalculationBasis: 'Sale Date'
        // No duration provided
      };

      ControlledComposition.addRatesToObject(ratesObject, track, 1);

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

      ControlledComposition.addRatesToObject(ratesObjectWithMissingRates, track, 1);

      expect(ratesObjectWithMissingRates['2023-01-01'].US).toBe(0); // 1 * 0 (missing rate)
      expect(ratesObjectWithMissingRates['2023-01-01'].CA).toBe(0);
    });
  });

  describe('removeFromTotalRatesObject', () => {
    let ratesObject;

    beforeEach(() => {
      ratesObject = {
        '2023-01-01': {
          US: 1.00,
          CA: 0.80,
          minUS: 1.00,
          minCA: 0.80,
          usMinAmount: 0.10,
          usPerMinuteRate: 0.05,
          caMinAmount: 0.08,
          caPerMinuteRate: 0.04
        }
      };
    });

    it('should remove percentage share for short duration track with Sale Date basis', () => {
      const track = {
        duration: 180, // < 301 seconds
        mechanicalCalculationBasis: 'Sale Date'
      };

      ControlledComposition.removeFromTotalRatesObject(ratesObject, track, 50); // 50% share

      expect(ratesObject['2023-01-01'].US).toBe(0.95); // 1.00 - (1 * 0.10 * 0.5)
      expect(ratesObject['2023-01-01'].CA).toBe(0.76); // 0.80 - (1 * 0.08 * 0.5)
    });

    it('should remove percentage share for long duration track with Sale Date basis', () => {
      const track = {
        duration: 360, // >= 301 seconds (6 minutes)
        mechanicalCalculationBasis: 'Sale Date'
      };

      ControlledComposition.removeFromTotalRatesObject(ratesObject, track, 25); // 25% share

      // 6 minutes * rate * 25%
      expect(ratesObject['2023-01-01'].US).toBe(0.925); // 1.00 - (6 * 0.05 * 0.25)
      expect(ratesObject['2023-01-01'].CA).toBe(0.74); // 0.80 - (6 * 0.04 * 0.25)
    });

    it('should remove percentage share for non-Sale Date basis using statutory rates', () => {
      const track = {
        duration: 180,
        mechanicalCalculationBasis: 'Other',
        statutoryRate: 0.20,
        canadianStatutoryRate: 0.16
      };

      ControlledComposition.removeFromTotalRatesObject(ratesObject, track, 50); // 50% share

      expect(ratesObject['2023-01-01'].US).toBe(0.90); // 1.00 - (0.20 * 0.5)
      expect(ratesObject['2023-01-01'].CA).toBeCloseTo(0.72, 5); // 0.80 - (0.16 * 0.5)
    });

    it('should handle string percentage values', () => {
      const track = {
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date'
      };

      ControlledComposition.removeFromTotalRatesObject(ratesObject, track, '30');

      expect(ratesObject['2023-01-01'].US).toBe(0.97); // 1.00 - (1 * 0.10 * 0.3)
      expect(ratesObject['2023-01-01'].CA).toBe(0.776); // 0.80 - (1 * 0.08 * 0.3)
    });
  });

  describe('getTracks', () => {
    let mockLevelDB;
    let mockCallback;

    beforeEach(() => {
      mockCallback = jest.fn();
      mockLevelDB = {
        get: jest.fn()
      };
    });

    it('should retrieve tracks for all mechanical license IDs', async () => {
      const release = {
        mechanicalLicenses: {
          track1: { reportMechanicals: true },
          track2: { reportMechanicals: false },
          track3: { reportMechanicals: true }
        }
      };

      const mockTracks = [
        { _id: 'track1', title: 'Track 1' },
        { _id: 'track2', title: 'Track 2' },
        { _id: 'track3', title: 'Track 3' }
      ];

      mockLevelDB.get
        .mockResolvedValueOnce(mockTracks[0])
        .mockResolvedValueOnce(mockTracks[1])
        .mockResolvedValueOnce(mockTracks[2]);

      await ControlledComposition.getTracks(release, mockLevelDB, mockCallback);

      expect(mockLevelDB.get).toHaveBeenCalledTimes(3);
      expect(mockLevelDB.get).toHaveBeenCalledWith('track1');
      expect(mockLevelDB.get).toHaveBeenCalledWith('track2');
      expect(mockLevelDB.get).toHaveBeenCalledWith('track3');

      expect(mockCallback).toHaveBeenCalledWith(null, {
        track1: mockTracks[0],
        track2: mockTracks[1],
        track3: mockTracks[2]
      });
    });

    it('should handle missing tracks gracefully', async () => {
      const release = {
        mechanicalLicenses: {
          track1: { reportMechanicals: true },
          track2: { reportMechanicals: true }
        }
      };

      mockLevelDB.get
        .mockResolvedValueOnce({ _id: 'track1', title: 'Track 1' })
        .mockResolvedValueOnce(null); // track2 not found

      await ControlledComposition.getTracks(release, mockLevelDB, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        track1: { _id: 'track1', title: 'Track 1' }
        // track2 should not be included
      });
    });

    it('should return empty object when no mechanical licenses', async () => {
      const release = {};

      await ControlledComposition.getTracks(release, mockLevelDB, mockCallback);

      expect(mockLevelDB.get).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(null, {});
    });

    it('should filter out falsy track IDs', async () => {
      const release = {
        mechanicalLicenses: {
          track1: { reportMechanicals: true },
          '': { reportMechanicals: true }, // Empty string should be filtered
          track3: { reportMechanicals: true }
        }
      };

      mockLevelDB.get
        .mockResolvedValueOnce({ _id: 'track1', title: 'Track 1' })
        .mockResolvedValueOnce({ _id: 'track3', title: 'Track 3' });

      await ControlledComposition.getTracks(release, mockLevelDB, mockCallback);

      expect(mockLevelDB.get).toHaveBeenCalledTimes(2);
      expect(mockLevelDB.get).toHaveBeenCalledWith('track1');
      expect(mockLevelDB.get).toHaveBeenCalledWith('track3');
      expect(mockLevelDB.get).not.toHaveBeenCalledWith('');
    });
  });

  describe('getControlledCompositionRate', () => {
    let mockCallback;
    let mockLevelDB;

    beforeEach(() => {
      mockCallback = jest.fn();
      mockLevelDB = {
        get: jest.fn()
      };
      // Restore all mocks to prevent interference from other tests
      jest.restoreAllMocks();
    });

    it('should return 0 for non-controlled composition release', () => {
      const ratesObject = {
        '2023-01-01': {
          US: 0,
          CA: 0,
          minUS: 0,
          minCA: 0,
          usMinAmount: 0.10,
          caMinAmount: 0.08
        }
      };

      const release = {
        controlledCompositionClause: false
      };

      ControlledComposition.getControlledCompositionRate(ratesObject, release, mockLevelDB, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, 0);
    });

    it('should handle missing controlledCompositionClause', () => {
      const ratesObject = {
        '2023-01-01': {
          US: 0,
          CA: 0,
          minUS: 0,
          minCA: 0,
          usMinAmount: 0.10,
          caMinAmount: 0.08
        }
      };

      const release = {};

      ControlledComposition.getControlledCompositionRate(ratesObject, release, mockLevelDB, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, 0);
    });

    it('should calculate total tracks and multiply by min stat rates', () => {
      const ratesObject = {
        '2023-01-01': {
          US: 0,
          CA: 0,
          minUS: 0,
          minCA: 0,
          usMinAmount: 0.10,
          caMinAmount: 0.08
        }
      };

      const release = {
        controlledCompositionClause: true,
        trackIds: ['track1', 'track2'],
        mechanicalLicenses: {
          track1: { reportMechanicals: true },
          track2: { reportMechanicals: true }
        }
      };

      // Mock getTrackBreakdown to just call callback
      jest.spyOn(ControlledComposition, 'getTrackBreakdown').mockImplementation((release, ratesObject, levelDB, callback) => {
        callback(null, {});
      });

      ControlledComposition.getControlledCompositionRate(ratesObject, release, mockLevelDB, mockCallback);

      // Should multiply 2 tracks * min amounts
      expect(ratesObject['2023-01-01'].US).toBe(0.20); // 2 * 0.10
      expect(ratesObject['2023-01-01'].minUS).toBe(0.20);
      expect(ratesObject['2023-01-01'].CA).toBe(0.16); // 2 * 0.08
      expect(ratesObject['2023-01-01'].minCA).toBe(0.16);
      
      expect(ControlledComposition.getTrackBreakdown).toHaveBeenCalledWith(release, ratesObject, mockLevelDB, expect.any(Function));
      expect(mockCallback).toHaveBeenCalledWith(null, ratesObject, {});
    });

    it('should handle multiple dates in rates object', () => {
      const ratesObject = {
        '2023-01-01': {
          US: 0,
          CA: 0,
          minUS: 0,
          minCA: 0,
          usMinAmount: 0.10,
          caMinAmount: 0.08
        },
        '2023-06-01': {
          US: 0,
          CA: 0,
          minUS: 0,
          minCA: 0,
          usMinAmount: 0.12,
          caMinAmount: 0.09
        }
      };

      const release = {
        controlledCompositionClause: true,
        trackIds: ['track1'],
        mechanicalLicenses: {
          track1: { reportMechanicals: true }
        }
      };

      jest.spyOn(ControlledComposition, 'getTrackBreakdown').mockImplementation((release, ratesObject, levelDB, callback) => {
        callback(null, {});
      });

      ControlledComposition.getControlledCompositionRate(ratesObject, release, mockLevelDB, mockCallback);

      expect(ratesObject['2023-01-01'].US).toBe(0.10);
      expect(ratesObject['2023-01-01'].CA).toBe(0.08);
      expect(ratesObject['2023-06-01'].US).toBe(0.12);
      expect(ratesObject['2023-06-01'].CA).toBe(0.09);
    });

    it('should propagate errors from getTrackBreakdown', () => {
      const ratesObject = {
        '2023-01-01': {
          US: 0,
          CA: 0,
          minUS: 0,
          minCA: 0,
          usMinAmount: 0.10,
          caMinAmount: 0.08
        }
      };

      const release = {
        controlledCompositionClause: true,
        trackIds: ['track1'],
        mechanicalLicenses: {
          track1: { reportMechanicals: true }
        }
      };

      const testError = new Error('Database error');
      jest.spyOn(ControlledComposition, 'getTrackBreakdown').mockImplementation((release, ratesObject, levelDB, callback) => {
        callback(testError);
      });

      ControlledComposition.getControlledCompositionRate(ratesObject, release, mockLevelDB, mockCallback);

      // The method still calculates rates first, then calls getTrackBreakdown which propagates the error
      expect(mockCallback).toHaveBeenCalledWith(testError, expect.any(Object), undefined);
    });
  });

  describe('getTrackBreakdown', () => {
    let mockCallback;
    let mockLevelDB;

    beforeEach(() => {
      mockCallback = jest.fn();
      mockLevelDB = {
        get: jest.fn()
      };
      // Clear any previous mocks that might interfere
      jest.restoreAllMocks();
    });

    it('should handle release without mechanical licenses', () => {
      const release = {};
      const ratesObject = {
        '2023-01-01': { US: 1.0, CA: 0.8 }
      };

      // Should handle gracefully and call callback without parameters
      ControlledComposition.getTrackBreakdown(release, ratesObject, mockLevelDB, mockCallback);
      
      expect(mockCallback).toHaveBeenCalledWith();
    });

    it('should calculate track breakdown with controlled and non-controlled licenses', async () => {
      const release = {
        mechanicalLicenses: {
          track1: {
            reportMechanicals: true,
            licenses: [
              { contractId: 'contract1', controlled: false, share: 50 },
              { contractId: 'contract2', controlled: true, share: 30 }
            ]
          }
        }
      };

      const ratesObject = {
        '2023-01-01': {
          US: 2.0,
          CA: 1.6,
          minUS: 2.0,
          minCA: 1.6,
          usMinAmount: 0.10,
          caMinAmount: 0.08
        }
      };

      const mockTracks = {
        track1: {
          _id: { toString: () => 'track1' },
          duration: 180,
          mechanicalCalculationBasis: 'Sale Date'
        }
      };

      // Mock getTracks to return our test tracks
      jest.spyOn(ControlledComposition, 'getTracks').mockImplementation((release, levelDB, callback) => {
        callback(null, mockTracks);
      });

      // Mock addRatesToObject and removeFromTotalRatesObject
      jest.spyOn(ControlledComposition, 'addRatesToObject').mockImplementation(() => {});
      jest.spyOn(ControlledComposition, 'removeFromTotalRatesObject').mockImplementation(() => {});

      ControlledComposition.getTrackBreakdown(release, ratesObject, mockLevelDB, mockCallback);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(ControlledComposition.getTracks).toHaveBeenCalledWith(release, mockLevelDB, expect.any(Function));
      expect(mockCallback).toHaveBeenCalledWith(null, expect.any(Object));

      const result = mockCallback.mock.calls[0][1];
      expect(result).toHaveProperty('track1');
      expect(result.track1).toHaveProperty('contract1');
      expect(result.track1).toHaveProperty('contract2');
    });

    it('should handle tracks without reportMechanicals', async () => {
      const release = {
        mechanicalLicenses: {
          track1: {
            reportMechanicals: false,
            licenses: [
              { contractId: 'contract1', controlled: false, share: 50 }
            ]
          }
        }
      };

      const ratesObject = {
        '2023-01-01': {
          US: 1.0,
          CA: 0.8,
          minUS: 1.0,
          minCA: 0.8
        }
      };

      const mockTracks = {};

      jest.spyOn(ControlledComposition, 'getTracks').mockImplementation((release, levelDB, callback) => {
        callback(null, mockTracks);
      });

      ControlledComposition.getTrackBreakdown(release, ratesObject, mockLevelDB, mockCallback);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockCallback).toHaveBeenCalledWith(null, expect.any(Object));
      const result = mockCallback.mock.calls[0][1];
      expect(result.track1).toEqual({}); // Should be empty for non-reporting tracks
    });

    it('should propagate errors from getTracks', () => {
      const release = {
        mechanicalLicenses: {
          track1: {
            reportMechanicals: true,
            licenses: [
              { contractId: 'contract1', controlled: false, share: 50 }
            ]
          }
        }
      };

      const ratesObject = {
        '2023-01-01': { US: 1.0, CA: 0.8 }
      };

      const testError = new Error('Database error');
      jest.spyOn(ControlledComposition, 'getTracks').mockImplementation((release, levelDB, callback) => {
        callback(testError);
      });

      ControlledComposition.getTrackBreakdown(release, ratesObject, mockLevelDB, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(testError);
    });

    it('should handle tracks without licenses', async () => {
      const release = {
        mechanicalLicenses: {
          track1: {
            reportMechanicals: true
            // No licenses array
          }
        }
      };

      const ratesObject = {
        '2023-01-01': { US: 1.0, CA: 0.8 }
      };

      const mockTracks = {
        track1: {
          _id: { toString: () => 'track1' },
          duration: 180
        }
      };

      jest.spyOn(ControlledComposition, 'getTracks').mockImplementation((release, levelDB, callback) => {
        callback(null, mockTracks);
      });

      ControlledComposition.getTrackBreakdown(release, ratesObject, mockLevelDB, mockCallback);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockCallback).toHaveBeenCalledWith(null, expect.any(Object));
      const result = mockCallback.mock.calls[0][1];
      // When there are no licenses, the track doesn't get added to the output
      // Only tracks with licenses get entries in the result object
      expect(result).toEqual({});
    });

    it('should handle licenses without share values', async () => {
      const release = {
        mechanicalLicenses: {
          track1: {
            reportMechanicals: true,
            licenses: [
              { contractId: 'contract1', controlled: false }, // No share
              { contractId: 'contract2', controlled: true, share: 30 }
            ]
          }
        }
      };

      const ratesObject = {
        '2023-01-01': { US: 1.0, CA: 0.8 }
      };

      const mockTracks = {
        track1: {
          _id: { toString: () => 'track1' },
          duration: 180
        }
      };

      jest.spyOn(ControlledComposition, 'getTracks').mockImplementation((release, levelDB, callback) => {
        callback(null, mockTracks);
      });

      jest.spyOn(ControlledComposition, 'addRatesToObject').mockImplementation(() => {});
      jest.spyOn(ControlledComposition, 'removeFromTotalRatesObject').mockImplementation(() => {});

      ControlledComposition.getTrackBreakdown(release, ratesObject, mockLevelDB, mockCallback);

      await new Promise(resolve => setTimeout(resolve, 0));

      // Should not crash and should handle missing share gracefully
      expect(mockCallback).toHaveBeenCalledWith(null, expect.any(Object));
    });
  });

  describe('edge cases and error handling', () => {
    beforeEach(() => {
      // Restore all mocks to prevent interference from other tests
      jest.restoreAllMocks();
    });
    it('should handle moment date formatting edge cases', () => {
      const client = {
        usStatRates: [
          {
            startDate: new Date('2023-01-01'),
            minAmount: 0.10,
            perMinuteRate: 0.05
          },
          {
            startDate: '2023-12-31T23:59:59.999Z',
            minAmount: 0.12,
            perMinuteRate: 0.06
          }
        ]
      };

      const release = {
        controlledCompositionClause: true
      };

      const mockCallback = jest.fn();
      jest.spyOn(ControlledComposition, 'getControlledCompositionRate').mockImplementation(() => {});

      ControlledComposition.getOrSkipControlledComposition(release, client, mockCallback);

      const ratesObjectArg = ControlledComposition.getControlledCompositionRate.mock.calls[0][0];
      expect(ratesObjectArg).toHaveProperty('2023-01-01');
      expect(ratesObjectArg).toHaveProperty('2023-12-31');
    });

    it('should handle empty client object', () => {
      const client = {};
      const release = {
        controlledCompositionClause: true
      };

      const mockCallback = jest.fn();
      jest.spyOn(ControlledComposition, 'getControlledCompositionRate').mockImplementation(() => {});

      ControlledComposition.getOrSkipControlledComposition(release, client, mockCallback);

      const ratesObjectArg = ControlledComposition.getControlledCompositionRate.mock.calls[0][0];
      expect(ratesObjectArg).toEqual({});
    });

    it('should handle very large duration values', () => {
      const hugeDuration = Number.MAX_SAFE_INTEGER;
      const result = ControlledComposition.getStatRateMinutes(hugeDuration);
      expect(result).toBe(Math.ceil(hugeDuration / 60));
      expect(Number.isFinite(result)).toBe(true);
    });

    it('should handle zero and negative durations', () => {
      expect(ControlledComposition.getStatRateMinutes(0)).toBe(0);
      expect(ControlledComposition.getStatRateMinutes(-60)).toBe(-1);
      expect(ControlledComposition.getStatRateMinutes(-1)).toBe(-0); // Math.ceil(-1/60) = -0
    });

    it('should handle floating point durations', () => {
      expect(ControlledComposition.getStatRateMinutes(59.9)).toBe(1);
      expect(ControlledComposition.getStatRateMinutes(60.1)).toBe(2);
      expect(ControlledComposition.getStatRateMinutes(119.99)).toBe(2);
    });

    it('should handle missing trackIds in release', () => {
      const release = {
        mechanicalLicenses: {
          track1: { reportMechanicals: true }
        }
        // Missing trackIds array
      };

      expect(() => ControlledComposition.getTotalTracks(release)).toThrow();
    });

    it('should handle empty mechanicalLicenses object', () => {
      const release = {
        trackIds: ['track1', 'track2'],
        mechanicalLicenses: {}
      };

      const result = ControlledComposition.getTotalTracks(release);
      expect(result).toBe(2); // All tracks included as fallback
    });

    it('should handle string duration values in addRatesToObject', () => {
      const track = {
        duration: '180', // String instead of number
        mechanicalCalculationBasis: 'Sale Date'
      };

      const ratesObject = {
        '2023-01-01': {
          US: 0,
          CA: 0,
          minUS: 0,
          minCA: 0,
          usMinAmount: 0.10,
          caMinAmount: 0.08
        }
      };

      // Should handle string duration gracefully
      ControlledComposition.addRatesToObject(ratesObject, track, 1);

      // String '180' < 301 should use minAmount path, but the comparison treats it as string
      // '180' < 301 is true in JavaScript, so it should use minAmount
      expect(ratesObject['2023-01-01'].US).toBe(0.10);
      expect(ratesObject['2023-01-01'].CA).toBe(0.08);
    });

    it('should handle malformed rates object in addRatesToObject', () => {
      const malformedRatesObject = {
        '2023-01-01': null,
        '2023-06-01': {
          US: 0,
          CA: 0
          // Missing other required properties
        }
      };

      const track = {
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date'
      };

      // Should not crash even with malformed data
      expect(() => {
        ControlledComposition.addRatesToObject(malformedRatesObject, track, 1);
      }).not.toThrow();
    });
  });
});
