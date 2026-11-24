process.env.NODE_ENV = 'test';

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

logger.debug('\n\n**** .test/unit/libs/platoon/generate.unit.test.js');

describe('Platoon Generate Validation Functions Unit Tests', function () {
  let platoonGenerate;
  let validateLine;
  let sourceCurrencyValid;
  let saleTypeValid;

  before((done) => {
    sinon.restore();
    done();
  });

  after((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    // Use rewire to access the internal functions
    platoonGenerate = rewire('../../../../libs/platoon/generate');

    // Get the internal functions
    validateLine = platoonGenerate.__get__('validateLine');
    sourceCurrencyValid = platoonGenerate.__get__('sourceCurrencyValid');
    saleTypeValid = platoonGenerate.__get__('saleTypeValid');

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('validateLine function', function () {
    it('should return false for lines with NaN values in critical amount fields', function (done) {
      // Arrange
      const lineWithNaN = [
        'test-id', // [0] Sales Line ID
        'test-isrc', // [1] ISRC/UPC
        'GBP', // [2] transactionCurrency
        'NaN', // [3] transactionCurrencyAmount - NaN
        'GBP', // [4] receivedCurrency
        '100.00', // [5] receivedAmount
        '1.0', // [6] exchangeRate
        '10.0', // [7] royaltyRate
        'GBP', // [8] royaltyCurrency
        '10.00', // [9] royaltyAmount
        '202401-test', // [10] transactionId
        'GB', // [11] territory
        'Premium Stream', // [12] saleType
        'Spotify AB', // [13] source
        '1234567890', // [14] artistId
        'contract123', // [15] contractId
        'ref123', // [16] paymentReference
        '2024-01-01', // [17] saleDate
        '2024-01-01', // [18] transactionDate
        'Test Contract', // [19] contractName
        'Track', // [20] catType
        'SubSource', // [21] subSource
        'barcode123', // [22] barcode
        'cat123', // [23] catNo
        'Test Release', // [24] releaseTitle
        'Test Artist', // [25] releaseArtist
        'Test Track', // [26] trackTitle
        'Test Artist', // [27] trackArtist
        'Digital', // [28] distributionChannel
        '1', // [29] units
        '100.00', // [30] perUnitRate
      ];

      // Act
      const result = validateLine(lineWithNaN);

      // Assert
      expect(result).to.be.false;
      done();
    });

    it('should return false for lines missing required fields', function (done) {
      // Arrange
      const incompleteLine = [
        '', // [0] Sales Line ID - missing
        'test-isrc', // [1] ISRC/UPC
        'GBP', // [2] transactionCurrency
        '100.00', // [3] transactionCurrencyAmount
        'GBP', // [4] receivedCurrency
        '100.00', // [5] receivedAmount
        '1.0', // [6] exchangeRate
        '10.0', // [7] royaltyRate
        'GBP', // [8] royaltyCurrency
        '10.00', // [9] royaltyAmount
        '202401-test', // [10] transactionId
        'GB', // [11] territory
        'Premium Stream', // [12] saleType
        'Spotify AB', // [13] source
        '1234567890', // [14] artistId
        'contract123', // [15] contractId
        'ref123', // [16] paymentReference
        '2024-01-01', // [17] saleDate
        '2024-01-01', // [18] transactionDate
        'Test Contract', // [19] contractName
        'Track', // [20] catType
        'SubSource', // [21] subSource
        'barcode123', // [22] barcode
        'cat123', // [23] catNo
        'Test Release', // [24] releaseTitle
        'Test Artist', // [25] releaseArtist
        'Test Track', // [26] trackTitle
        'Test Artist', // [27] trackArtist
        'Digital', // [28] distributionChannel
        '1', // [29] units
        '100.00', // [30] perUnitRate
      ];

      // Act
      const result = validateLine(incompleteLine);

      // Assert
      expect(result).to.be.false;
      done();
    });

    it('should return true for valid regular royalty lines', function (done) {
      // Arrange
      const validLine = [
        'test-id', // [0] Sales Line ID
        'test-isrc', // [1] ISRC/UPC
        'GBP', // [2] transactionCurrency
        '100.00', // [3] transactionCurrencyAmount
        'GBP', // [4] receivedCurrency
        '100.00', // [5] receivedAmount
        '1.0', // [6] exchangeRate
        '10.0', // [7] royaltyRate
        'GBP', // [8] royaltyCurrency
        '10.00', // [9] royaltyAmount
        '202401-test', // [10] transactionId
        'GB', // [11] territory
        'Premium Stream', // [12] saleType
        'Spotify AB', // [13] source
        '1234567890', // [14] artistId
        'contract123', // [15] contractId
        'ref123', // [16] paymentReference
        '2024-01-01', // [17] saleDate
        '2024-01-01', // [18] transactionDate
        'Test Contract', // [19] contractName
        'Track', // [20] catType
        'SubSource', // [21] subSource
        'barcode123', // [22] barcode
        'cat123', // [23] catNo
        'Test Release', // [24] releaseTitle
        'Test Artist', // [25] releaseArtist
        'Test Track', // [26] trackTitle
        'Test Artist', // [27] trackArtist
        'Digital', // [28] distributionChannel
        '1', // [29] units
        '100.00', // [30] perUnitRate
      ];

      // Act
      const result = validateLine(validLine);

      // Assert
      expect(result).to.be.true;
      done();
    });

    it('should return true for Sync Fee lines with empty contractId', function (done) {
      // Arrange
      const syncFeeLine = [
        'test-id', // [0] Sales Line ID
        'test-isrc', // [1] ISRC/UPC
        'GBP', // [2] transactionCurrency
        '100.00', // [3] transactionCurrencyAmount
        'GBP', // [4] receivedCurrency
        '100.00', // [5] receivedAmount
        '1.0', // [6] exchangeRate
        '0.0', // [7] royaltyRate
        'GBP', // [8] royaltyCurrency
        '0.00', // [9] royaltyAmount
        '202401-test', // [10] transactionId
        'GB', // [11] territory
        'Sync Fee', // [12] saleType
        'Unknown Source', // [13] source (unmapped)
        null, // [14] artistId (null for Sync Fee)
        '', // [15] contractId (empty for Sync Fee)
        'ref123', // [16] paymentReference
        '2024-01-01', // [17] saleDate
        '2024-01-01', // [18] transactionDate
        '', // [19] contractName (empty for Sync Fee)
        'Track', // [20] catType
        'SubSource', // [21] subSource
        '', // [22] barcode (empty for Sync Fee)
        '', // [23] catNo (empty for Sync Fee)
        '', // [24] releaseTitle (empty for Sync Fee)
        '', // [25] releaseArtist (empty for Sync Fee)
        '', // [26] trackTitle (empty for Sync Fee)
        '', // [27] trackArtist (empty for Sync Fee)
        'Digital', // [28] distributionChannel
        '1', // [29] units
        '100.00', // [30] perUnitRate
      ];

      // Act
      const result = validateLine(syncFeeLine);

      // Assert
      expect(result).to.be.true;
      done();
    });

    it('should return true for VAT lines with UNREPORTED contractId', function (done) {
      // Arrange
      const vatLine = [
        'test-id', // [0] Sales Line ID
        'test-isrc', // [1] ISRC/UPC
        'GBP', // [2] transactionCurrency
        '100.00', // [3] transactionCurrencyAmount
        'GBP', // [4] receivedCurrency
        '100.00', // [5] receivedAmount
        '1.0', // [6] exchangeRate
        '0.0', // [7] royaltyRate
        'GBP', // [8] royaltyCurrency
        '0.00', // [9] royaltyAmount
        '202401-test', // [10] transactionId
        'GB', // [11] territory
        'Premium Stream', // [12] saleType
        'Spotify AB', // [13] source
        null, // [14] artistId (null for VAT)
        'UNREPORTED', // [15] contractId (UNREPORTED for VAT)
        'ref123', // [16] paymentReference
        '2024-01-01', // [17] saleDate
        '2024-01-01', // [18] transactionDate
        null, // [19] contractName (null for VAT)
        'Track', // [20] catType
        'SubSource', // [21] subSource
        null, // [22] barcode (null for VAT)
        null, // [23] catNo (null for VAT)
        null, // [24] releaseTitle (null for VAT)
        null, // [25] releaseArtist (null for VAT)
        null, // [26] trackTitle (null for VAT)
        null, // [27] trackArtist (null for VAT)
        'Digital', // [28] distributionChannel
        '1', // [29] units
        '100.00', // [30] perUnitRate
      ];

      // Act
      const result = validateLine(vatLine);

      // Assert
      expect(result).to.be.true;
      done();
    });

    it('should return false for lines with invalid artistId length when not UNREPORTED', function (done) {
      // Arrange
      const invalidArtistIdLine = [
        'test-id', // [0] Sales Line ID
        'test-isrc', // [1] ISRC/UPC
        'GBP', // [2] transactionCurrency
        '100.00', // [3] transactionCurrencyAmount
        'GBP', // [4] receivedCurrency
        '100.00', // [5] receivedAmount
        '1.0', // [6] exchangeRate
        '10.0', // [7] royaltyRate
        'GBP', // [8] royaltyCurrency
        '10.00', // [9] royaltyAmount
        '202401-test', // [10] transactionId
        'GB', // [11] territory
        'Premium Stream', // [12] saleType
        'Spotify AB', // [13] source
        '12345', // [14] artistId (only 5 digits, should be 10)
        'contract123', // [15] contractId (not UNREPORTED)
        'ref123', // [16] paymentReference
        '2024-01-01', // [17] saleDate
        '2024-01-01', // [18] transactionDate
        'Test Contract', // [19] contractName
        'Track', // [20] catType
        'SubSource', // [21] subSource
        'barcode123', // [22] barcode
        'cat123', // [23] catNo
        'Test Release', // [24] releaseTitle
        'Test Artist', // [25] releaseArtist
        'Test Track', // [26] trackTitle
        'Test Artist', // [27] trackArtist
        'Digital', // [28] distributionChannel
        '1', // [29] units
        '100.00', // [30] perUnitRate
      ];

      // Act
      const result = validateLine(invalidArtistIdLine);

      // Assert
      expect(result).to.be.false;
      done();
    });
  });

  describe('sourceCurrencyValid function', function () {
    it('should return true for null/undefined sources (Sync Fee lines)', function (done) {
      // Act & Assert
      expect(sourceCurrencyValid(null, 'GBP')).to.be.true;
      expect(sourceCurrencyValid(undefined, 'USD')).to.be.true;
      expect(sourceCurrencyValid('', 'EUR')).to.be.true;
      done();
    });

    it('should return true for unmapped sources (Sync Fee lines with unknown platforms)', function (done) {
      // Act & Assert
      expect(sourceCurrencyValid('Unknown Platform', 'GBP')).to.be.true;
      expect(sourceCurrencyValid('New Streaming Service', 'USD')).to.be.true;
      done();
    });

    it('should return true for valid source-currency combinations', function (done) {
      // Act & Assert
      expect(sourceCurrencyValid('Spotify AB', 'GBP')).to.be.true;
      expect(sourceCurrencyValid('Spotify AB', 'EUR')).to.be.true;
      expect(sourceCurrencyValid('Spotify AB', 'USD')).to.be.true;
      expect(sourceCurrencyValid('Apple', 'GBP')).to.be.true;
      expect(sourceCurrencyValid('YouTube', 'USD')).to.be.true;
      expect(sourceCurrencyValid('YouTube', 'GBP')).to.be.true;
      done();
    });

    it('should return true for invalid source-currency combinations (but source is unmapped)', function (done) {
      // Act & Assert
      expect(sourceCurrencyValid('Invalid Source', 'INVALID_CURRENCY')).to.be.true;
      done();
    });
  });

  describe('saleTypeValid function', function () {
    it('should return true for valid sale types', function (done) {
      // Act & Assert
      expect(saleTypeValid('Premium Stream')).to.be.true;
      expect(saleTypeValid('Download')).to.be.true;
      expect(saleTypeValid('Sync Fee')).to.be.true;
      expect(saleTypeValid('Sync Direct')).to.be.true;
      expect(saleTypeValid('DJ Mix')).to.be.true;
      expect(saleTypeValid('Ad-Funded Stream')).to.be.true;
      done();
    });

    it('should return true for valid sale types with modifiers', function (done) {
      // Act & Assert
      expect(saleTypeValid('Premium Stream-DTT')).to.be.true;
      expect(saleTypeValid('Download-XMT')).to.be.true;
      expect(saleTypeValid('Sync 3rd Party-DTT')).to.be.true;
      done();
    });

    it('should return undefined for invalid sale types', function (done) {
      // Act & Assert
      expect(saleTypeValid('Invalid Sale Type')).to.be.undefined;
      expect(saleTypeValid('')).to.be.undefined;
      expect(saleTypeValid(null)).to.be.undefined;
      done();
    });
  });

  describe('Integration: validateLine with sourceCurrencyValid and saleTypeValid', function () {
    it('should validate Sync Fee lines correctly through the entire chain', function (done) {
      // Arrange - Create a Sync Fee line that should pass all validations
      const syncFeeLine = [
        'sync-fee-id', // [0] Sales Line ID
        'test-isrc', // [1] ISRC/UPC
        'GBP', // [2] transactionCurrency
        '100.00', // [3] transactionCurrencyAmount
        'GBP', // [4] receivedCurrency
        '100.00', // [5] receivedAmount
        '1.0', // [6] exchangeRate
        '0.0', // [7] royaltyRate
        'GBP', // [8] royaltyCurrency
        '0.00', // [9] royaltyAmount
        '202401-sync', // [10] transactionId
        'GB', // [11] territory
        'Sync Fee', // [12] saleType
        'Unmapped Platform', // [13] source (unmapped, should pass sourceCurrencyValid)
        null, // [14] artistId (null, should pass because it's a Sync Fee line)
        '', // [15] contractId (empty for Sync Fee)
        'ref123', // [16] paymentReference
        '2024-01-01', // [17] saleDate
        '2024-01-01', // [18] transactionDate
        '', // [19] contractName (empty for Sync Fee)
        'Track', // [20] catType
        'SubSource', // [21] subSource
        '', // [22] barcode (empty for Sync Fee)
        '', // [23] catNo (empty for Sync Fee)
        '', // [24] releaseTitle (empty for Sync Fee)
        '', // [25] releaseArtist (empty for Sync Fee)
        '', // [26] trackTitle (empty for Sync Fee)
        '', // [27] trackArtist (empty for Sync Fee)
        'Digital', // [28] distributionChannel
        '1', // [29] units
        '100.00', // [30] perUnitRate
      ];

      // Act
      const result = validateLine(syncFeeLine);

      // Assert
      expect(result).to.be.true;
      done();
    });

    it('should validate regular royalty lines correctly through the entire chain', function (done) {
      // Arrange - Create a regular royalty line that should pass all validations
      const regularLine = [
        'regular-id', // [0] Sales Line ID
        'test-isrc', // [1] ISRC/UPC
        'GBP', // [2] transactionCurrency
        '100.00', // [3] transactionCurrencyAmount
        'GBP', // [4] receivedCurrency
        '100.00', // [5] receivedAmount
        '1.0', // [6] exchangeRate
        '10.0', // [7] royaltyRate
        'GBP', // [8] royaltyCurrency
        '10.00', // [9] royaltyAmount
        '202401-regular', // [10] transactionId
        'GB', // [11] territory
        'Premium Stream', // [12] saleType
        'Spotify AB', // [13] source (mapped, should pass sourceCurrencyValid)
        '1234567890', // [14] artistId (10 digits, should pass validation)
        'contract123', // [15] contractId (not UNREPORTED, should pass validation)
        'ref123', // [16] paymentReference
        '2024-01-01', // [17] saleDate
        '2024-01-01', // [18] transactionDate
        'Test Contract', // [19] contractName
        'Track', // [20] catType
        'SubSource', // [21] subSource
        'barcode123', // [22] barcode
        'cat123', // [23] catNo
        'Test Release', // [24] releaseTitle
        'Test Artist', // [25] releaseArtist
        'Test Track', // [26] trackTitle
        'Test Artist', // [27] trackArtist
        'Digital', // [28] distributionChannel
        '1', // [29] units
        '100.00', // [30] perUnitRate
      ];

      // Act
      const result = validateLine(regularLine);

      // Assert
      expect(result).to.be.true;
      done();
    });
  });
});
