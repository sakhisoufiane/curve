const {
  normalizeToStartOfDay,
  normalizeToEndOfDay,
  buildDateRangeFilter,
  applyDateFilters,
} = require('./dateFilters');

describe('dateFilters utility', () => {
  describe('normalizeToStartOfDay', () => {
    it('should normalize a date string to start of day UTC', () => {
      const result = normalizeToStartOfDay('2024-06-15');
      expect(result).toBeInstanceOf(Date);
      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
      expect(result.getUTCMilliseconds()).toBe(0);
    });

    it('should preserve full datetime precision when time is provided', () => {
      const result = normalizeToStartOfDay('2024-06-15T14:30:45Z');
      expect(result).toBeInstanceOf(Date);
      // Full datetime strings should be preserved, not normalized
      expect(result.getUTCHours()).toBe(14);
      expect(result.getUTCMinutes()).toBe(30);
      expect(result.getUTCSeconds()).toBe(45);
    });

    it('should return null for invalid date string', () => {
      const result = normalizeToStartOfDay('invalid-date');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = normalizeToStartOfDay('');
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = normalizeToStartOfDay(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = normalizeToStartOfDay(undefined);
      expect(result).toBeNull();
    });

    it('should handle whitespace-only strings', () => {
      const result = normalizeToStartOfDay('   ');
      expect(result).toBeNull();
    });
  });

  describe('normalizeToEndOfDay', () => {
    it('should normalize a date string to end of day UTC', () => {
      const result = normalizeToEndOfDay('2024-06-15');
      expect(result).toBeInstanceOf(Date);
      expect(result.getUTCHours()).toBe(23);
      expect(result.getUTCMinutes()).toBe(59);
      expect(result.getUTCSeconds()).toBe(59);
      expect(result.getUTCMilliseconds()).toBe(999);
    });

    it('should preserve full datetime precision when time is provided', () => {
      const result = normalizeToEndOfDay('2024-06-15T14:30:45Z');
      expect(result).toBeInstanceOf(Date);
      // Full datetime strings should be preserved, not normalized
      expect(result.getUTCHours()).toBe(14);
      expect(result.getUTCMinutes()).toBe(30);
      expect(result.getUTCSeconds()).toBe(45);
    });

    it('should return null for invalid date string', () => {
      const result = normalizeToEndOfDay('invalid-date');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = normalizeToEndOfDay('');
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = normalizeToEndOfDay(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = normalizeToEndOfDay(undefined);
      expect(result).toBeNull();
    });

    it('should handle whitespace-only strings', () => {
      const result = normalizeToEndOfDay('   ');
      expect(result).toBeNull();
    });
  });

  describe('buildDateRangeFilter', () => {
    it('should build a $gte filter for "after" direction', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const result = buildDateRangeFilter(date, 'after');
      expect(result).toEqual({ $gte: date });
    });

    it('should build a $lte filter for "before" direction', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const result = buildDateRangeFilter(date, 'before');
      expect(result).toEqual({ $lte: date });
    });

    it('should return empty object for null date', () => {
      const result = buildDateRangeFilter(null, 'after');
      expect(result).toEqual({});
    });

    it('should return empty object for invalid direction', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const result = buildDateRangeFilter(date, 'invalid');
      expect(result).toEqual({});
    });

    it('should combine multiple filters for the same field', () => {
      const afterDate = new Date('2024-01-01T00:00:00Z');
      const beforeDate = new Date('2024-06-01T00:00:00Z');

      const afterFilter = buildDateRangeFilter(afterDate, 'after');
      const beforeFilter = buildDateRangeFilter(beforeDate, 'before');

      const combined = { ...afterFilter, ...beforeFilter };

      expect(combined).toEqual({
        $gte: afterDate,
        $lte: beforeDate,
      });
    });
  });

  describe('applyDateFilters', () => {
    it('should apply createdAfter filter', () => {
      const inputParams = { createdAfter: '2024-01-01' };
      const params = {};

      const result = applyDateFilters(inputParams, params);

      expect(result.createdAt).toBeDefined();
      expect(result.createdAt.$gte).toBeInstanceOf(Date);
    });

    it('should apply createdBefore filter with end of day', () => {
      const inputParams = { createdBefore: '2024-06-01' };
      const params = {};

      const result = applyDateFilters(inputParams, params);

      expect(result.createdAt).toBeDefined();
      expect(result.createdAt.$lte).toBeInstanceOf(Date);
      expect(result.createdAt.$lte.getUTCHours()).toBe(23);
      expect(result.createdAt.$lte.getUTCMinutes()).toBe(59);
      expect(result.createdAt.$lte.getUTCSeconds()).toBe(59);
      expect(result.createdAt.$lte.getUTCMilliseconds()).toBe(999);
    });

    it('should combine createdAfter and createdBefore', () => {
      const inputParams = {
        createdAfter: '2024-01-01',
        createdBefore: '2024-06-01',
      };
      const params = {};

      const result = applyDateFilters(inputParams, params);

      expect(result.createdAt).toBeDefined();
      expect(result.createdAt.$gte).toBeInstanceOf(Date);
      expect(result.createdAt.$gte.getUTCHours()).toBe(0);
      expect(result.createdAt.$lte).toBeInstanceOf(Date);
      expect(result.createdAt.$lte.getUTCHours()).toBe(23);
    });

    it('should apply all four date filters', () => {
      const inputParams = {
        createdAfter: '2024-01-01',
        createdBefore: '2024-06-01',
        updatedAfter: '2024-02-01',
        updatedBefore: '2024-05-01',
      };
      const params = {};

      const result = applyDateFilters(inputParams, params);

      expect(result.createdAt).toBeDefined();
      expect(result.createdAt.$gte).toBeInstanceOf(Date);
      expect(result.createdAt.$gte.getUTCHours()).toBe(0);
      expect(result.createdAt.$lte).toBeInstanceOf(Date);
      expect(result.createdAt.$lte.getUTCHours()).toBe(23);
      expect(result.updatedAt).toBeDefined();
      expect(result.updatedAt.$gte).toBeInstanceOf(Date);
      expect(result.updatedAt.$gte.getUTCHours()).toBe(0);
      expect(result.updatedAt.$lte).toBeInstanceOf(Date);
      expect(result.updatedAt.$lte.getUTCHours()).toBe(23);
    });

    it('should preserve existing params', () => {
      const inputParams = { createdAfter: '2024-01-01' };
      const params = { clientId: '123', name: 'Test' };

      const result = applyDateFilters(inputParams, params);

      expect(result.clientId).toBe('123');
      expect(result.name).toBe('Test');
      expect(result.createdAt).toBeDefined();
    });

    it('should handle invalid dates gracefully', () => {
      const inputParams = {
        createdAfter: 'invalid-date',
        updatedBefore: '2024-06-01',
      };
      const params = {};

      const result = applyDateFilters(inputParams, params);

      expect(result.createdAt).toBeUndefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.updatedAt.$lte).toBeInstanceOf(Date);
      expect(result.updatedAt.$lte.getUTCHours()).toBe(23);
      expect(result.updatedAt.$lte.getUTCMinutes()).toBe(59);
    });

    it('should return params unchanged if no date filters provided', () => {
      const inputParams = { text: 'search' };
      const params = { clientId: '123' };

      const result = applyDateFilters(inputParams, params);

      expect(result).toEqual(params);
    });
  });
});
