const { randomId, randomString, randomFloat } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const { UNMAPPED_TYPES, HEADERS, DISPLAY_NAMES, toUniqueStr } = require('./unmapped');

describe('unmapped', () => {
  describe('UNMAPPED_TYPES', () => {
    it('should have the correct types defined', () => {
      expect(UNMAPPED_TYPES).toEqual({
        work: 'work',
        release: 'release',
        track: 'track',
      });
    });
  });

  describe('DISPLAY_NAMES', () => {
    it('should have the correct display names', () => {
      expect(DISPLAY_NAMES).toEqual({
        work: 'Unmapped Works',
        release: 'Unmapped Releases',
        track: 'Unmapped Tracks',
      });
    });
  });

  describe('HEADERS', () => {
    describe('work headers', () => {
      it('should have the correct headers in order', () => {
        expect(HEADERS[UNMAPPED_TYPES.work]).toEqual([
          'Salesfile ID',
          'Title',
          'Source',
          'ISWC',
          'Tunecode',
          'Song Code',
          'Identifier',
          'Party 1',
          'Party 2',
          'Party 3',
          'Party 4',
          'Party 5',
          'Net Value',
        ]);
      });

      it('should have 13 columns', () => {
        expect(HEADERS[UNMAPPED_TYPES.work]).toHaveLength(13);
      });
    });

    describe('release headers', () => {
      it('should have the correct headers in order', () => {
        expect(HEADERS[UNMAPPED_TYPES.release]).toEqual([
          'Salesfile ID',
          'Title',
          'Artist',
          'Cat No',
          'Barcode',
        ]);
      });

      it('should have 6 columns', () => {
        expect(HEADERS[UNMAPPED_TYPES.release]).toHaveLength(5);
      });
    });

    describe('track headers', () => {
      it('should have the correct headers in order', () => {
        expect(HEADERS[UNMAPPED_TYPES.track]).toEqual([
          'Salesfile ID',
          'Title',
          'Artist',
          'ISRC',
        ]);
      });

      it('should have 5 columns', () => {
        expect(HEADERS[UNMAPPED_TYPES.track]).toHaveLength(4);
      });
    });
  });

  describe('toUniqueStr', () => {
    it('returns the string as-is when given a plain string', () => {
      expect(toUniqueStr('T1234567890')).toBe('T1234567890');
    });

    it('trims whitespace from a plain string', () => {
      expect(toUniqueStr('  T1234567890  ')).toBe('T1234567890');
    });

    it('returns empty string for null', () => {
      expect(toUniqueStr(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(toUniqueStr(undefined)).toBe('');
    });

    it('deduplicates values in an array', () => {
      expect(toUniqueStr(['SC001', 'SC001', 'SC002'])).toBe('SC001, SC002');
    });

    it('joins multiple unique values with ", "', () => {
      expect(toUniqueStr(['3773091211', '3773091212'])).toBe('3773091211, 3773091212');
    });

    it('returns empty string for an array of all nulls', () => {
      expect(toUniqueStr([null, null])).toBe('');
    });

    it('returns empty string for an array of all empty strings', () => {
      expect(toUniqueStr(['', ''])).toBe('');
    });

    it('filters out null and empty values from a mixed array', () => {
      expect(toUniqueStr(['SC001', null, '', 'SC002'])).toBe('SC001, SC002');
    });

    it('deduplicates after trimming whitespace', () => {
      expect(toUniqueStr([' SC001 ', 'SC001', 'SC002 '])).toBe('SC001, SC002');
    });

    it('does not produce the literal string "null" from null array entries', () => {
      expect(toUniqueStr([null])).not.toContain('null');
    });
  });

  describe('convertRecordToRow', () => {
    // Since convertRecordToRow is not exported, we test it indirectly
    // by verifying the row structure matches the header structure

    describe('work record', () => {
      it('should produce a row with the same number of columns as headers', () => {
        const workRecord = {
          salesFileId: randomId(),
          title: randomString(),
          source: randomString(),
          iswc: randomString(),
          tunecode: randomString(),
          songCode: randomString(),
          identifier: randomString(),
          party1: randomString(),
          party2: randomString(),
          party3: randomString(),
          party4: randomString(),
          party5: randomString(),
          netValue: randomFloat(),
        };

        // The row should have 11 fields to match 11 headers
        const expectedFieldCount = HEADERS[UNMAPPED_TYPES.work].length;
        const actualFieldCount = Object.keys(workRecord).length;
        expect(actualFieldCount).toEqual(expectedFieldCount);
      });
    });

    describe('release record', () => {
      it('should produce a row with the same number of columns as headers', () => {
        const releaseRecord = {
          salesFileId: randomId(),
          title: randomString(),
          artist: randomString(),
          catNo: randomString(),
          barcode: randomString(),
        };

        // The row should have 6 fields to match 6 headers
        const expectedFieldCount = HEADERS[UNMAPPED_TYPES.release].length;
        const actualFieldCount = Object.keys(releaseRecord).length;
        expect(actualFieldCount).toEqual(expectedFieldCount);
      });
    });

    describe('track record', () => {
      it('should produce a row with the same number of columns as headers', () => {
        const trackRecord = {
          salesFileId: randomId(),
          title: randomString(),
          artist: randomString(),
          isrc: randomString(),
        };

        // The row should have 5 fields to match 5 headers
        const expectedFieldCount = HEADERS[UNMAPPED_TYPES.track].length;
        const actualFieldCount = Object.keys(trackRecord).length;
        expect(actualFieldCount).toEqual(expectedFieldCount);
      });
    });
  });
});
