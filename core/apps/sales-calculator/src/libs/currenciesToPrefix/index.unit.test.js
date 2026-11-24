/* eslint-disable @typescript-eslint/no-var-requires */
const testUtils = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const currenciesToPrefix = require('./index');

describe('currenciesToPrefix', () => {
  describe('with all currencies defined', () => {
    it('should return mapping for all client currencies when all are defined', () => {
      const client = {
        homeCurrency: 'USD',
        currency2: 'EUR',
        currency3: 'GBP',
        currency4: 'CAD'
      };

      const result = currenciesToPrefix(client);

      expect(result).toEqual({
        'USD': 'homeCurrency',
        'EUR': 'currency2',
        'GBP': 'currency3',
        'CAD': 'currency4'
      });
    });

    it('should handle dynamic currency values using testUtils', () => {
      const client = {
        homeCurrency: testUtils.randomString(3).toUpperCase(),
        currency2: testUtils.randomString(3).toUpperCase(),
        currency3: testUtils.randomString(3).toUpperCase(),
        currency4: testUtils.randomString(3).toUpperCase()
      };

      const result = currenciesToPrefix(client);

      expect(result).toEqual({
        [client.homeCurrency]: 'homeCurrency',
        [client.currency2]: 'currency2',
        [client.currency3]: 'currency3',
        [client.currency4]: 'currency4'
      });
    });

    it('should handle duplicate currency values correctly', () => {
      const duplicateCurrency = 'USD';
      const client = {
        homeCurrency: duplicateCurrency,
        currency2: duplicateCurrency,
        currency3: 'EUR',
        currency4: 'GBP'
      };

      const result = currenciesToPrefix(client);

      // The last assignment should win (currency2 overwrites homeCurrency)
      expect(result).toEqual({
        'USD': 'currency2', // Last assignment wins
        'EUR': 'currency3',
        'GBP': 'currency4'
      });
    });
  });

  describe('with partial currencies defined', () => {
    it('should return mapping for only homeCurrency when only homeCurrency is defined', () => {
      const client = {
        homeCurrency: 'USD'
      };

      const result = currenciesToPrefix(client);

      expect(result).toEqual({
        'USD': 'homeCurrency'
      });
    });

    it('should return mapping for homeCurrency and currency2 when only these are defined', () => {
      const client = {
        homeCurrency: 'USD',
        currency2: 'EUR'
      };

      const result = currenciesToPrefix(client);

      expect(result).toEqual({
        'USD': 'homeCurrency',
        'EUR': 'currency2'
      });
    });

    it('should return mapping for homeCurrency and currency3 when currency2 is undefined', () => {
      const client = {
        homeCurrency: 'USD',
        currency2: undefined,
        currency3: 'GBP'
      };

      const result = currenciesToPrefix(client);

      expect(result).toEqual({
        'USD': 'homeCurrency',
        'GBP': 'currency3'
      });
    });

    it('should return mapping for homeCurrency and currency4 when currency2 and currency3 are undefined', () => {
      const client = {
        homeCurrency: 'USD',
        currency2: undefined,
        currency3: undefined,
        currency4: 'CAD'
      };

      const result = currenciesToPrefix(client);

      expect(result).toEqual({
        'USD': 'homeCurrency',
        'CAD': 'currency4'
      });
    });

    it('should return mapping for only currency2 when homeCurrency is undefined', () => {
      const client = {
        homeCurrency: undefined,
        currency2: 'EUR'
      };

      const result = currenciesToPrefix(client);

      expect(result).toEqual({
        'EUR': 'currency2'
      });
    });

    it('should return mapping for mixed defined currencies', () => {
      const client = {
        homeCurrency: testUtils.randomString(3).toUpperCase(),
        currency2: null,
        currency3: testUtils.randomString(3).toUpperCase(),
        currency4: undefined
      };

      const result = currenciesToPrefix(client);

      expect(result).toEqual({
        [client.homeCurrency]: 'homeCurrency',
        [client.currency3]: 'currency3'
      });
    });
  });

  describe('with no currencies defined', () => {
    it('should return empty object when no currencies are defined', () => {
      const client = {};

      const result = currenciesToPrefix(client);

      expect(result).toEqual({});
    });

    it('should return empty object when all currencies are undefined', () => {
      const client = {
        homeCurrency: undefined,
        currency2: undefined,
        currency3: undefined,
        currency4: undefined
      };

      const result = currenciesToPrefix(client);

      expect(result).toEqual({});
    });

    it('should return empty object when all currencies are null', () => {
      const client = {
        homeCurrency: null,
        currency2: null,
        currency3: null,
        currency4: null
      };

      const result = currenciesToPrefix(client);

      expect(result).toEqual({});
    });

    it('should return empty object when all currencies are empty strings', () => {
      const client = {
        homeCurrency: '',
        currency2: '',
        currency3: '',
        currency4: ''
      };

      const result = currenciesToPrefix(client);

      expect(result).toEqual({});
    });
  });

  describe('edge cases and data validation', () => {
    it('should handle null client parameter', () => {
      expect(() => currenciesToPrefix(null)).toThrow();
    });

    it('should handle undefined client parameter', () => {
      expect(() => currenciesToPrefix(undefined)).toThrow();
    });

    it('should handle client with extra properties', () => {
      const client = {
        homeCurrency: 'USD',
        currency2: 'EUR',
        currency3: 'GBP',
        currency4: 'CAD',
        extraProperty: 'ignored',
        anotherProperty: 123,
        _id: testUtils.randomId(),
        name: 'Test Client'
      };

      const result = currenciesToPrefix(client);

      // Should only process the currency fields, ignoring extra properties
      expect(result).toEqual({
        'USD': 'homeCurrency',
        'EUR': 'currency2',
        'GBP': 'currency3',
        'CAD': 'currency4'
      });
    });

    it('should handle numeric currency codes', () => {
      const client = {
        homeCurrency: 840, // USD numeric code
        currency2: 978, // EUR numeric code
        currency3: 826, // GBP numeric code
        currency4: 124  // CAD numeric code
      };

      const result = currenciesToPrefix(client);

      expect(result).toEqual({
        840: 'homeCurrency',
        978: 'currency2',
        826: 'currency3',
        124: 'currency4'
      });
    });

    it('should handle mixed string and numeric currency codes', () => {
      const client = {
        homeCurrency: 'USD',
        currency2: 978,
        currency3: 'GBP',
        currency4: 124
      };

      const result = currenciesToPrefix(client);

      expect(result).toEqual({
        'USD': 'homeCurrency',
        978: 'currency2',
        'GBP': 'currency3',
        124: 'currency4'
      });
    });

    it('should handle boolean currency values', () => {
      const client = {
        homeCurrency: true,
        currency2: false,
        currency3: 'GBP',
        currency4: 'CAD'
      };

      const result = currenciesToPrefix(client);

      // false is falsy, so currency2 should not appear
      expect(result).toEqual({
        true: 'homeCurrency',
        'GBP': 'currency3',
        'CAD': 'currency4'
      });
    });

    it('should handle zero as currency value', () => {
      const client = {
        homeCurrency: 0,
        currency2: 'EUR',
        currency3: 'GBP',
        currency4: 'CAD'
      };

      const result = currenciesToPrefix(client);

      // 0 is falsy, so homeCurrency should not appear
      expect(result).toEqual({
        'EUR': 'currency2',
        'GBP': 'currency3',
        'CAD': 'currency4'
      });
    });

    it('should handle whitespace-only currency values', () => {
      const client = {
        homeCurrency: '   ',
        currency2: '\t',
        currency3: '\n',
        currency4: 'CAD'
      };

      const result = currenciesToPrefix(client);

      // Whitespace strings are truthy, so they should appear
      expect(result).toEqual({
        '   ': 'homeCurrency',
        '\t': 'currency2',
        '\n': 'currency3',
        'CAD': 'currency4'
      });
    });
  });

  describe('return value structure', () => {
    it('should return a plain object (not an instance of a class)', () => {
      const client = {
        homeCurrency: 'USD'
      };

      const result = currenciesToPrefix(client);

      expect(result).toBeInstanceOf(Object);
      expect(result.constructor).toBe(Object);
    });

    it('should return an object with string values for field names', () => {
      const client = {
        homeCurrency: 'USD',
        currency2: 'EUR',
        currency3: 'GBP',
        currency4: 'CAD'
      };

      const result = currenciesToPrefix(client);

      Object.values(result).forEach(value => {
        expect(typeof value).toBe('string');
      });
    });

    it('should return an object with correct field name values', () => {
      const client = {
        homeCurrency: 'USD',
        currency2: 'EUR',
        currency3: 'GBP',
        currency4: 'CAD'
      };

      const result = currenciesToPrefix(client);

      expect(Object.values(result)).toEqual(
        expect.arrayContaining(['homeCurrency', 'currency2', 'currency3', 'currency4'])
      );
    });

    it('should maintain key-value relationship integrity', () => {
      const client = {
        homeCurrency: testUtils.randomString(3).toUpperCase(),
        currency2: testUtils.randomString(3).toUpperCase(),
        currency3: testUtils.randomString(3).toUpperCase(),
        currency4: testUtils.randomString(3).toUpperCase()
      };

      const result = currenciesToPrefix(client);

      // Verify each currency maps to its correct field name
      expect(result[client.homeCurrency]).toBe('homeCurrency');
      expect(result[client.currency2]).toBe('currency2');
      expect(result[client.currency3]).toBe('currency3');
      expect(result[client.currency4]).toBe('currency4');
    });
  });

  describe('real-world scenarios', () => {
    it('should handle typical client with USD as home currency and EUR as secondary', () => {
      const client = {
        homeCurrency: 'USD',
        currency2: 'EUR'
      };

      const result = currenciesToPrefix(client);

      expect(result).toEqual({
        'USD': 'homeCurrency',
        'EUR': 'currency2'
      });
    });

    it('should handle multi-currency international client', () => {
      const client = {
        homeCurrency: 'USD',
        currency2: 'EUR',
        currency3: 'JPY',
        currency4: 'AUD'
      };

      const result = currenciesToPrefix(client);

      expect(result).toEqual({
        'USD': 'homeCurrency',
        'EUR': 'currency2',
        'JPY': 'currency3',
        'AUD': 'currency4'
      });
    });

    it('should handle client with only home currency (simple case)', () => {
      const client = {
        homeCurrency: 'GBP',
        name: 'UK Music Label',
        _id: testUtils.randomId()
      };

      const result = currenciesToPrefix(client);

      expect(result).toEqual({
        'GBP': 'homeCurrency'
      });
    });

    it('should handle emerging market currencies', () => {
      const client = {
        homeCurrency: 'BRL', // Brazilian Real
        currency2: 'INR',     // Indian Rupee
        currency3: 'ZAR',     // South African Rand
        currency4: 'MXN'      // Mexican Peso
      };

      const result = currenciesToPrefix(client);

      expect(result).toEqual({
        'BRL': 'homeCurrency',
        'INR': 'currency2',
        'ZAR': 'currency3',
        'MXN': 'currency4'
      });
    });

    it('should handle cryptocurrency codes', () => {
      const client = {
        homeCurrency: 'BTC',
        currency2: 'ETH',
        currency3: 'USD',
        currency4: 'EUR'
      };

      const result = currenciesToPrefix(client);

      expect(result).toEqual({
        'BTC': 'homeCurrency',
        'ETH': 'currency2',
        'USD': 'currency3',
        'EUR': 'currency4'
      });
    });
  });

  describe('performance and immutability', () => {
    it('should not modify the input client object', () => {
      const originalClient = {
        homeCurrency: 'USD',
        currency2: 'EUR',
        currency3: 'GBP',
        currency4: 'CAD'
      };

      const clientCopy = { ...originalClient };

      currenciesToPrefix(clientCopy);

      // Client should remain unchanged
      expect(clientCopy).toEqual(originalClient);
    });

    it('should return a new object each time (not cached)', () => {
      const client = {
        homeCurrency: 'USD',
        currency2: 'EUR'
      };

      const result1 = currenciesToPrefix(client);
      const result2 = currenciesToPrefix(client);

      // Results should be equal but not the same reference
      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2);
    });

    it('should handle large number of calls efficiently', () => {
      const client = {
        homeCurrency: 'USD',
        currency2: 'EUR',
        currency3: 'GBP',
        currency4: 'CAD'
      };

      const startTime = Date.now();

      // Run the function many times
      for (let i = 0; i < 1000; i++) {
        currenciesToPrefix(client);
      }

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should complete quickly (less than 100ms for 1000 calls)
      expect(executionTime).toBeLessThan(100);
    });
  });
});
