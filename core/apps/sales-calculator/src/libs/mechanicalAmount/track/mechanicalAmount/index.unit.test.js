/* eslint-disable @typescript-eslint/no-var-requires */
const MechanicalAmount = require('./index');

describe('MechanicalAmount (Track)', () => {
  describe('get', () => {
    let mockCallback;

    beforeEach(() => {
      mockCallback = jest.fn();
    });

    it('should return basic result structure for track without reportMechanicals', () => {
      const track = {
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date',
        statutoryRate: 0.15,
        canadianStatutoryRate: 0.12
      };

      MechanicalAmount.get(track, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        US: 0,
        CA: 0,
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date'
      });
    });

    it('should default duration to 0 when not provided', () => {
      const track = {
        mechanicalCalculationBasis: 'Sale Date'
      };

      MechanicalAmount.get(track, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        US: 0,
        CA: 0,
        duration: 0,
        mechanicalCalculationBasis: 'Sale Date'
      });
    });

    it('should include reportMechanicals flag when track has reportMechanicals enabled', () => {
      const track = {
        duration: 240,
        mechanicalCalculationBasis: 'Release Date',
        reportMechanicals: true,
        statutoryRate: 0.15,
        canadianStatutoryRate: 0.12
      };

      MechanicalAmount.get(track, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        US: 0.15,
        CA: 0.12,
        duration: 240,
        mechanicalCalculationBasis: 'Release Date',
        reportMechanicals: true
      });
    });

    it('should calculate license multipliers when track has mechanical licenses', () => {
      const track = {
        duration: 200,
        mechanicalCalculationBasis: 'Sale Date',
        reportMechanicals: true,
        statutoryRate: 0.15,
        canadianStatutoryRate: 0.12,
        mechanicalLicenses: [
          { rate: 75 }, // 0.75
          { rate: 80 }, // 0.80
          { rate: 60 }  // 0.60
        ]
      };

      MechanicalAmount.get(track, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        US: 0.15,
        CA: 0.12,
        duration: 200,
        mechanicalCalculationBasis: 'Sale Date',
        reportMechanicals: true,
        multiplierSum: 2.15, // 0.75 + 0.80 + 0.60
        licenseCount: 3
      });
    });

    it('should handle mechanical licenses with missing rates', () => {
      const track = {
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date',
        reportMechanicals: true,
        statutoryRate: 0.15,
        canadianStatutoryRate: 0.12,
        mechanicalLicenses: [
          { rate: 75 }, // 0.75
          { rate: null }, // Should be ignored
          { rate: 80 }, // 0.80
          { }, // No rate property, should be ignored
          { rate: 0 } // 0 is falsy, should be ignored
        ]
      };

      MechanicalAmount.get(track, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        US: 0.15,
        CA: 0.12,
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date',
        reportMechanicals: true,
        multiplierSum: 1.55, // 0.75 + 0.80
        licenseCount: 2
      });
    });

    it('should handle empty mechanical licenses array', () => {
      const track = {
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date',
        reportMechanicals: true,
        statutoryRate: 0.15,
        canadianStatutoryRate: 0.12,
        mechanicalLicenses: []
      };

      MechanicalAmount.get(track, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        US: 0.15,
        CA: 0.12,
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date',
        reportMechanicals: true
      });
    });

    it('should handle track with reportMechanicals but no mechanical licenses property', () => {
      const track = {
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date',
        reportMechanicals: true,
        statutoryRate: 0.15,
        canadianStatutoryRate: 0.12
        // No mechanicalLicenses property
      };

      MechanicalAmount.get(track, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        US: 0.15,
        CA: 0.12,
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date',
        reportMechanicals: true
      });
    });

    it('should handle track with null mechanical licenses', () => {
      const track = {
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date',
        reportMechanicals: true,
        statutoryRate: 0.15,
        canadianStatutoryRate: 0.12,
        mechanicalLicenses: null
      };

      MechanicalAmount.get(track, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        US: 0.15,
        CA: 0.12,
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date',
        reportMechanicals: true
      });
    });

    it('should handle missing statutory rates', () => {
      const track = {
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date',
        reportMechanicals: true
        // No statutoryRate or canadianStatutoryRate
      };

      MechanicalAmount.get(track, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        US: undefined,
        CA: undefined,
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date',
        reportMechanicals: true
      });
    });

    it('should handle string rate values correctly', () => {
      const track = {
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date',
        reportMechanicals: true,
        statutoryRate: 0.15,
        canadianStatutoryRate: 0.12,
        mechanicalLicenses: [
          { rate: '75' }, // String value
          { rate: '80.5' }, // String with decimal
          { rate: 60 } // Number value
        ]
      };

      MechanicalAmount.get(track, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        US: 0.15,
        CA: 0.12,
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date',
        reportMechanicals: true,
        multiplierSum: expect.closeTo(2.155, 5), // 0.75 + 0.805 + 0.60
        licenseCount: 3
      });
    });

    it('should handle single mechanical license', () => {
      const track = {
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date',
        reportMechanicals: true,
        statutoryRate: 0.15,
        canadianStatutoryRate: 0.12,
        mechanicalLicenses: [
          { rate: 100 } // 100% rate
        ]
      };

      MechanicalAmount.get(track, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        US: 0.15,
        CA: 0.12,
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date',
        reportMechanicals: true,
        multiplierSum: 1.0, // 1.00
        licenseCount: 1
      });
    });

    it('should handle complex scenario with mixed valid and invalid licenses', () => {
      const track = {
        duration: 300,
        mechanicalCalculationBasis: 'Release Date',
        reportMechanicals: true,
        statutoryRate: 0.18,
        canadianStatutoryRate: 0.14,
        mechanicalLicenses: [
          { rate: 50 }, // Valid: 0.50
          { rate: '' }, // Invalid: empty string (falsy)
          { rate: 'invalid' }, // Invalid: NaN when parsed (but still truthy)
          { rate: 25.5 }, // Valid: 0.255
          { rate: undefined }, // Invalid: undefined (falsy)
          { rate: 75 }, // Valid: 0.75
          { otherProperty: 'value' } // Invalid: no rate property (falsy)
        ]
      };

      MechanicalAmount.get(track, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        US: 0.18,
        CA: 0.14,
        duration: 300,
        mechanicalCalculationBasis: 'Release Date',
        reportMechanicals: true,
        multiplierSum: NaN, // 0.50 + NaN + 0.255 + 0.75 = NaN
        licenseCount: 4 // 50, 'invalid', 25.5, 75 all pass truthy check
      });
    });

    it('should handle reportMechanicals as falsy value', () => {
      const track = {
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date',
        reportMechanicals: false,
        statutoryRate: 0.15,
        canadianStatutoryRate: 0.12,
        mechanicalLicenses: [
          { rate: 75 }
        ]
      };

      MechanicalAmount.get(track, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        US: 0,
        CA: 0,
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date'
      });
    });

    it('should handle track with zero duration', () => {
      const track = {
        duration: 0,
        mechanicalCalculationBasis: 'Sale Date',
        reportMechanicals: true,
        statutoryRate: 0.15,
        canadianStatutoryRate: 0.12
      };

      MechanicalAmount.get(track, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        US: 0.15,
        CA: 0.12,
        duration: 0,
        mechanicalCalculationBasis: 'Sale Date',
        reportMechanicals: true
      });
    });

    it('should handle track with negative rates (edge case)', () => {
      const track = {
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date',
        reportMechanicals: true,
        statutoryRate: -0.05, // Negative rate (unusual but possible)
        canadianStatutoryRate: 0.12,
        mechanicalLicenses: [
          { rate: -25 } // Negative license rate
        ]
      };

      MechanicalAmount.get(track, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        US: -0.05,
        CA: 0.12,
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date',
        reportMechanicals: true,
        multiplierSum: -0.25, // -25/100
        licenseCount: 1
      });
    });

    it('should handle very large rate values', () => {
      const track = {
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date',
        reportMechanicals: true,
        statutoryRate: 100.50,
        canadianStatutoryRate: 75.25,
        mechanicalLicenses: [
          { rate: 1000 }, // 10.00 when converted
          { rate: 500 }   // 5.00 when converted
        ]
      };

      MechanicalAmount.get(track, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        US: 100.50,
        CA: 75.25,
        duration: 180,
        mechanicalCalculationBasis: 'Sale Date',
        reportMechanicals: true,
        multiplierSum: 15.0, // 10.00 + 5.00
        licenseCount: 2
      });
    });

    it('should preserve mechanicalCalculationBasis value exactly', () => {
      const track = {
        duration: 180,
        mechanicalCalculationBasis: 'Custom Basis Type',
        reportMechanicals: false
      };

      MechanicalAmount.get(track, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        US: 0,
        CA: 0,
        duration: 180,
        mechanicalCalculationBasis: 'Custom Basis Type'
      });
    });
  });
});
