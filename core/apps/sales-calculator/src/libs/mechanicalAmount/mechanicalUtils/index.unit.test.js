/* eslint-disable @typescript-eslint/no-var-requires */
const MechanicalUtils = require('./index');

describe('MechanicalUtils', () => {
  describe('sortMechanicalRatesObject', () => {
    it('should sort rates object from oldest to newest date', () => {
      const unsortedRates = {
        '2023-12-01': 0.12,
        '2023-01-01': 0.10,
        '2023-06-15': 0.11,
        '2023-03-20': 0.105
      };

      const result = MechanicalUtils.sortMechanicalRatesObject(unsortedRates);

      const expectedOrder = [
        '2023-01-01',
        '2023-03-20', 
        '2023-06-15',
        '2023-12-01'
      ];

      const resultKeys = Object.keys(result);
      expect(resultKeys).toEqual(expectedOrder);
      
      // Verify values are preserved
      expect(result['2023-01-01']).toBe(0.10);
      expect(result['2023-03-20']).toBe(0.105);
      expect(result['2023-06-15']).toBe(0.11);
      expect(result['2023-12-01']).toBe(0.12);
    });

    it('should handle empty rates object', () => {
      const emptyRates = {};
      
      const result = MechanicalUtils.sortMechanicalRatesObject(emptyRates);
      
      expect(result).toEqual({});
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should handle single rate entry', () => {
      const singleRate = {
        '2023-05-15': 0.115
      };
      
      const result = MechanicalUtils.sortMechanicalRatesObject(singleRate);
      
      expect(result).toEqual(singleRate);
      expect(Object.keys(result)).toHaveLength(1);
      expect(result['2023-05-15']).toBe(0.115);
    });

    it('should filter out falsy values (null, undefined, 0, false, empty string)', () => {
      const ratesWithFalsyValues = {
        '2023-01-01': 0.10,
        '2023-02-01': null,
        '2023-03-01': undefined,
        '2023-04-01': 0, // This should be filtered out as it's falsy
        '2023-05-01': false,
        '2023-06-01': '',
        '2023-07-01': 0.12
      };
      
      const result = MechanicalUtils.sortMechanicalRatesObject(ratesWithFalsyValues);
      
      const expectedKeys = ['2023-01-01', '2023-07-01'];
      expect(Object.keys(result)).toEqual(expectedKeys);
      expect(result['2023-01-01']).toBe(0.10);
      expect(result['2023-07-01']).toBe(0.12);
    });

    it('should handle different date formats that can be parsed by Date constructor', () => {
      const mixedDateFormats = {
        '2023-12-01': 0.12,
        '2023/01/15': 0.10,
        'March 20, 2023': 0.11,
        '2023-06-30T10:00:00Z': 0.105
      };
      
      const result = MechanicalUtils.sortMechanicalRatesObject(mixedDateFormats);
      
      // Should be sorted chronologically
      const resultKeys = Object.keys(result);
      expect(resultKeys).toHaveLength(4);
      
      // Verify the dates are sorted correctly by comparing the actual Date objects
      const dates = resultKeys.map(key => new Date(key));
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i].getTime()).toBeGreaterThanOrEqual(dates[i-1].getTime());
      }
    });

    it('should handle rates with same date (edge case)', () => {
      const sameDate = '2023-05-15';
      const ratesWithSameDate = {
        [sameDate]: 0.10
      };
      
      const result = MechanicalUtils.sortMechanicalRatesObject(ratesWithSameDate);
      
      expect(result[sameDate]).toBe(0.10);
      expect(Object.keys(result)).toHaveLength(1);
    });

    it('should preserve non-numeric rate values', () => {
      const ratesWithMixedValues = {
        '2023-01-01': 'variable',
        '2023-03-01': 0.10,
        '2023-02-01': { complex: 'object' }
      };
      
      const result = MechanicalUtils.sortMechanicalRatesObject(ratesWithMixedValues);
      
      const expectedOrder = ['2023-01-01', '2023-02-01', '2023-03-01'];
      expect(Object.keys(result)).toEqual(expectedOrder);
      expect(result['2023-01-01']).toBe('variable');
      expect(result['2023-02-01']).toEqual({ complex: 'object' });
      expect(result['2023-03-01']).toBe(0.10);
    });

    it('should handle invalid date strings gracefully', () => {
      const ratesWithInvalidDates = {
        'invalid-date': 0.10,
        '2023-01-01': 0.11,
        'not-a-date': 0.12,
        '2023-12-01': 0.13
      };
      
      const result = MechanicalUtils.sortMechanicalRatesObject(ratesWithInvalidDates);
      
      // Invalid dates should still be included but their sort order may be unpredictable
      // The valid dates should still be sorted correctly relative to each other
      expect(Object.keys(result)).toHaveLength(4);
      expect(result['2023-01-01']).toBe(0.11);
      expect(result['2023-12-01']).toBe(0.13);
      expect(result['invalid-date']).toBe(0.10);
      expect(result['not-a-date']).toBe(0.12);
    });

    it('should handle large number of rates efficiently', () => {
      const largeRatesObject = {};
      const expectedDates = [];
      
      // Create 100 rates with random dates in 2023
      for (let i = 0; i < 100; i++) {
        const month = Math.floor(Math.random() * 12) + 1;
        const day = Math.floor(Math.random() * 28) + 1;
        const dateStr = `2023-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        largeRatesObject[dateStr] = Math.random();
        if (!expectedDates.includes(dateStr)) {
          expectedDates.push(dateStr);
        }
      }
      
      expectedDates.sort((a, b) => new Date(a) - new Date(b));
      
      const result = MechanicalUtils.sortMechanicalRatesObject(largeRatesObject);
      
      // Verify all rates are preserved
      expect(Object.keys(result).length).toBe(Object.keys(largeRatesObject).length);
      
      // Verify sorting is correct
      const resultKeys = Object.keys(result);
      const resultDates = resultKeys.map(key => new Date(key));
      for (let i = 1; i < resultDates.length; i++) {
        expect(resultDates[i].getTime()).toBeGreaterThanOrEqual(resultDates[i-1].getTime());
      }
    });

    it('should not mutate the original rates object', () => {
      const originalRates = {
        '2023-12-01': 0.12,
        '2023-01-01': 0.10,
        '2023-06-15': 0.11
      };
      
      const originalCopy = { ...originalRates };
      
      const result = MechanicalUtils.sortMechanicalRatesObject(originalRates);
      
      // Original object should remain unchanged
      expect(originalRates).toEqual(originalCopy);
      
      // Result should be a new object
      expect(result).not.toBe(originalRates);
    });

    it('should handle rates with zero values correctly when they are truthy', () => {
      // Note: The current implementation filters out 0 as it's falsy
      // This test documents the current behavior
      const ratesWithZero = {
        '2023-01-01': 0,
        '2023-02-01': 0.10,
        '2023-03-01': 0.0 // Also falsy
      };
      
      const result = MechanicalUtils.sortMechanicalRatesObject(ratesWithZero);
      
      // Only non-falsy values should be included
      expect(Object.keys(result)).toEqual(['2023-02-01']);
      expect(result['2023-02-01']).toBe(0.10);
    });
  });
});
