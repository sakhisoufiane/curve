jest.mock('../mapper');

const validateSales = require('./validateSales');

describe('validateSales.line', () => {
  const baseCompleteSale = {
    territory: 'US',
    distributionChannel: 'Digital',
    configuration: 'Streaming',
    source: 'Spotify',
    originalCurrency: 'USD',
    exchangeRate: 1,
    saleDate: '2024-01-01',
    transactionDate: '2024-01-01',
    netAmount: 100,
  };

  describe('Complete status', () => {
    test.each([
      ['Contract', { contractId: '123' }],
      ['Track', { trackId: 'track123' }],
      ['Release', { releaseId: 'release123' }],
      ['Work', { workId: 'work123' }],
    ])('should set status to Complete for %s with valid id', (catType, idField, done) => {
      // Arrange
      const sale = { ...baseCompleteSale, catType, ...idField };

      // Act
      validateSales.line(sale, (err, result) => {
        // Assert
        expect(err).toBeNull();
        expect(result.status).toBe('Complete');
        done();
      });
    });

    it('should set status to Complete when netAmount is 0', (done) => {
      // Arrange
      const sale = { ...baseCompleteSale, catType: 'Track', trackId: 'track123', netAmount: 0 };

      // Act
      validateSales.line(sale, (err, result) => {
        // Assert
        expect(err).toBeNull();
        expect(result.status).toBe('Complete');
        done();
      });
    });

    test.each([
      ['Track with contractId fallback', 'Track', { contractId: '123' }],
      ['Release with contractId fallback', 'Release', { contractId: '123' }],
      ['Work with contractId fallback', 'Work', { contractId: '123' }],
    ])('should set status to Complete for %s', (_, catType, idField, done) => {
      // Arrange
      const sale = { ...baseCompleteSale, catType, ...idField };

      // Act
      validateSales.line(sale, (err, result) => {
        // Assert
        expect(err).toBeNull();
        expect(result.status).toBe('Complete');
        done();
      });
    });
  });

  describe('Incomplete status', () => {
    it('should set status to Incomplete when required fields are missing', (done) => {
      // Arrange
      const sale = { catType: 'Contract', territory: 'US' };

      // Act
      validateSales.line(sale, (err, result) => {
        // Assert
        expect(err).toBeNull();
        expect(result.status).toBe('Incomplete');
        done();
      });
    });

    it('should set status to Incomplete when catType id is missing', (done) => {
      // Arrange
      const sale = { ...baseCompleteSale, catType: 'Track' }; // Missing trackId

      // Act
      validateSales.line(sale, (err, result) => {
        // Assert
        expect(err).toBeNull();
        expect(result.status).toBe('Incomplete');
        done();
      });
    });
  });

  describe('Suspense status', () => {
    it('should preserve Suspense status when already set', (done) => {
      // Arrange
      const sale = { catType: 'Contract', territory: 'US', status: 'Suspense' };

      // Act
      validateSales.line(sale, (err, result) => {
        // Assert
        expect(err).toBeNull();
        expect(result.status).toBe('Suspense');
        done();
      });
    });
  });

  describe('Error handling', () => {
    test.each([
      ['null', null],
      ['undefined', undefined],
      ['array', []],
      ['string', 'not an object'],
      ['number', 123],
    ])('should return error when sale is %s', (_, invalidInput, done) => {
      // Act
      validateSales.line(invalidInput, (err) => {
        // Assert
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('An object is required');
        done();
      });
    });
  });
});
