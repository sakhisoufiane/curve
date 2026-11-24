process.env.NODE_ENV = 'test';

const { expect } = require('chai');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const iswcRegistration = require('../../../../libs/iswc/iswcRegistration');

logger.debug('\n\n**** test/unit/libs/iswcRegistration/iswcRegistration.unit.test.js');
describe.skip('composersToUniqueOutput Unit Tests', function () {
  xit('should return a formatted array with unique composers', function () {
    const composers = [
      { name: 'John Doe', caeNumber: '123456', contractType: 'Composer' },
      { name: 'Jane Smith', cae: '654321', contractType: 'Lyricist' },
      { name: 'John Doe', caeNumber: '123456', contractType: 'Composer' }, // Duplicate
    ];

    const expectedOutput = [
      { nameNumber: 123456, role: 'Composer' },
      { nameNumber: 654321, role: 'Lyricist' },
    ];

    expect(iswcRegistration.composersToUniqueOutput(composers)).to.deep.equal(expectedOutput);
  });

  xit('should handle missing or invalid CAE numbers gracefully', function () {
    const composers = [
      { name: 'John Doe', caeNumber: '', contractType: 'Composer' },
      { name: 'Jane Smith', cae: null, contractType: 'Lyricist' },
      { name: 'Alice Brown', caeNumber: 'invalid', contractType: 'Arranger' },
    ];

    expect(iswcRegistration.composersToUniqueOutput(composers)).to.deep.equal([]);
  });

  xit('should ignore duplicate CAE entries with different contract types', function () {
    const composers = [
      { name: 'John Doe', caeNumber: '123456', contractType: 'Composer' },
      { name: 'John Doe', caeNumber: '123456', contractType: 'Lyricist' },
    ];

    const expectedOutput = [
      { nameNumber: 123456, role: 'Composer' },
    ];

    expect(iswcRegistration.composersToUniqueOutput(composers)).to.deep.equal(expectedOutput);
  });
});
