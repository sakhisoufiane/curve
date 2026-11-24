import PublisherFingerprint from './publisherFingerprint';

const { generatePublisherFingerprint } = PublisherFingerprint;

describe('generatePublisherFingerprint', () => {
  describe('fingerprint generation', () => {
    it('should generate a fingerprint by sorting and joining publisher IDs with a colon', () => {
      const fingerprint = generatePublisherFingerprint([
        '68385e170ecdf654de36fb24',
        '55385e170ecdf654de36fb24',
      ]);
      expect(fingerprint).toBe('55385e170ecdf654de36fb24:68385e170ecdf654de36fb24');
    });

    it('should produce the same fingerprint regardless of input order', () => {
      const fingerprintA = generatePublisherFingerprint([
        '68385e170ecdf654de36fb24',
        '55385e170ecdf654de36fb24',
      ]);
      const fingerprintB = generatePublisherFingerprint([
        '55385e170ecdf654de36fb24',
        '68385e170ecdf654de36fb24',
      ]);
      expect(fingerprintA).toBe(fingerprintB);
    });

    it('should return the ID itself for a single publisher', () => {
      const fingerprint = generatePublisherFingerprint(['68385e170ecdf654de36fb24']);
      expect(fingerprint).toBe('68385e170ecdf654de36fb24');
    });

    it('should handle three or more publishers correctly', () => {
      const ids = [
        '77385e170ecdf654de36fb24',
        '55385e170ecdf654de36fb24',
        '68385e170ecdf654de36fb24',
      ];
      const fingerprint = generatePublisherFingerprint(ids);
      expect(fingerprint).toBe(
        '55385e170ecdf654de36fb24:68385e170ecdf654de36fb24:77385e170ecdf654de36fb24'
      );
    });

    it('should produce unique fingerprints for different publisher combinations', () => {
      const fingerprintAB = generatePublisherFingerprint([
        '68385e170ecdf654de36fb24',
        '55385e170ecdf654de36fb24',
      ]);
      const fingerprintAC = generatePublisherFingerprint([
        '68385e170ecdf654de36fb24',
        '77385e170ecdf654de36fb24',
      ]);
      expect(fingerprintAB).not.toBe(fingerprintAC);
    });

    it('should de-duplicate publisher IDs before generating the fingerprint', () => {
      const fingerprint = generatePublisherFingerprint([
        '68385e170ecdf654de36fb24',
        '55385e170ecdf654de36fb24',
        '68385e170ecdf654de36fb24',
      ]);
      expect(fingerprint).toBe('55385e170ecdf654de36fb24:68385e170ecdf654de36fb24');
    });

    it('should not mutate the original array', () => {
      const ids = ['68385e170ecdf654de36fb24', '55385e170ecdf654de36fb24'];
      const original = [...ids];
      generatePublisherFingerprint(ids);
      expect(ids).toEqual(original);
    });
  });

  describe('empty / missing input', () => {
    it('should return an empty string for an empty array', () => {
      expect(generatePublisherFingerprint([])).toBe('');
    });

    it('should return an empty string for null or undefined input', () => {
      // @ts-expect-error testing with invalid input
      expect(generatePublisherFingerprint(null)).toBe('');
      // @ts-expect-error testing with invalid input
      expect(generatePublisherFingerprint(undefined)).toBe('');
    });

    it('should return an empty string for non-array input', () => {
      // @ts-expect-error testing with invalid input
      expect(generatePublisherFingerprint('not-an-array')).toBe('');
    });
  });

  describe('validation', () => {
    it('should throw an error if any publisher ID is an empty string', () => {
      expect(() =>
        generatePublisherFingerprint(['68385e170ecdf654de36fb24', ''])
      ).toThrow(/Invalid publisher ID\(s\):\s*/);
    });

    it('should throw an error if any publisher ID is whitespace only', () => {
      expect(() =>
        generatePublisherFingerprint(['68385e170ecdf654de36fb24', '   '])
      ).toThrow('Invalid publisher ID(s)');
    });

    it('should throw an error if any publisher ID is not a valid ObjectId', () => {
      expect(() =>
        generatePublisherFingerprint(['68385e170ecdf654de36fb24', 'not-a-valid-id'])
      ).toThrow('Invalid publisher ID(s): not-a-valid-id');
    });

    it('should report all invalid IDs in the error message', () => {
      expect(() =>
        generatePublisherFingerprint(['bad-id-1', '68385e170ecdf654de36fb24', 'bad-id-2'])
      ).toThrow('Invalid publisher ID(s): bad-id-1, bad-id-2');
    });

    it('should throw an error if any publisher ID is not a string', () => {
      expect(() =>
        // @ts-expect-error testing with invalid input
        generatePublisherFingerprint(['68385e170ecdf654de36fb24', 12345])
      ).toThrow('Invalid publisher ID(s)');
    });
  });
});
