process.env.NODE_ENV = 'test';

const sinon = require('sinon');
const { expect } = require('chai');

const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');

const validate = require('../../../../libs/salesIngestion/validate');

logger.debug('\n\n**** ./test/unit/libs/ingestSalesFile/validate.unit.test.js');

describe('validate Unit Tests', () => {
  let salesFileId;
  let bigQuery;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    salesFileId = testUtils.randomId();

    // Set up stubs
    sinon.stub(logger);

    // Set up BigQuery stubs
    bigQuery = {
      datasetName: testUtils.randomString(),
      inputTable: testUtils.randomString(),
      query: () => {},
    };
    sinon.stub(bigQuery, 'query').yields(null);
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  after((done) => {
    sinon.restore();
    done();
  });
  describe('validate.getDatabaseData', () => {
    let query1Result; let query2Result;
    beforeEach((done) => {
      query1Result = [{}];
      query2Result = [{
        invalidLines: testUtils.randomArray(),
      }];
      bigQuery.query.onCall(0).yields(null, query1Result);
      bigQuery.query.onCall(1).yields(null, query2Result);
      done();
    });

    it('should call bigQuery.query with the correct attributes', (done) => {
      // Arrange
      const expectedQuery = `SELECT sum(units) AS units, sum(netAmount) AS netAmount, sum(homeCurrencyNetAmount) AS homeCurrencyNetAmount, sum(grossAmount) AS grossAmount, sum(homeCurrencyGrossAmount) AS homeCurrencyGrossAmount, sum(1) AS lines
          FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\`
          WHERE salesFileId = "${salesFileId}"`;
      // Act
      validate.getDatabaseData(salesFileId, bigQuery, (err) => {
        // Assert
        expect(err).to.not.exist;
        expect(bigQuery.query.called).to.be.true;
        expect(bigQuery.query.firstCall.calledWith(expectedQuery)).to.be.true;
        done();
      });
    });
    it('should call bigQuery.query A SECOND TIME with the correct attributes', (done) => {
      // Arrange
      const expectedQuery = `SELECT sum(1) as invalidLines
          FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\`
          WHERE salesFileId = "${salesFileId}" AND status = "Incomplete"`;
      // Act
      validate.getDatabaseData(salesFileId, bigQuery, (err) => {
        // Assert
        expect(err).to.not.exist;
        expect(bigQuery.query.calledTwice).to.be.true;
        expect(bigQuery.query.secondCall.calledWith(expectedQuery)).to.be.true;
        done();
      });
    });
    it('should add output from second call as property "invalidLines" to "general" and return this this to callback', (done) => {
      // Act
      validate.getDatabaseData(salesFileId, bigQuery, (err, result) => {
        // Arrange
        const expectedResult = {
          ...query1Result[0],
          invalidLines: query2Result[0].invalidLines,
        };
        // Assert
        expect(err).to.not.exist;
        expect(result).to.deep.eq(expectedResult);
        done();
      });
    });
    describe('when an error is returned by the first bigQuery.query call', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        bigQuery.query.onCall(0).yields(expectedError);
        // Act
        validate.getDatabaseData(salesFileId, bigQuery, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
    describe('when an error is returned by the first bigQuery.query call', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        bigQuery.query.onCall(1).yields(expectedError);
        // Act
        validate.getDatabaseData(salesFileId, bigQuery, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
  });

  describe('validate.getNetAmountFromDatabase', () => {
    let queryResult;
    beforeEach((done) => {
      queryResult = testUtils.randomArray();
      bigQuery.query.yields(null, queryResult);
      done();
    });

    it('should call bigQuery.query with the correct attributes', (done) => {
      // Arrange
      const expectedQuery = `SELECT sum(homeCurrencyNetAmount) AS homeCurrencyNetAmount, sum(1) AS lines
      FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\`
      WHERE salesFileId = "${salesFileId}"`;
      // Act
      validate.getNetAmountFromDatabase(salesFileId, bigQuery, (err) => {
        // Assert
        expect(err).to.not.exist;
        expect(bigQuery.query.called).to.be.true;
        expect(bigQuery.query.calledWith(expectedQuery)).to.be.true;
        done();
      });
    });
    it('should return the first row of the bigQuery.query result', (done) => {
      // Act
      validate.getNetAmountFromDatabase(salesFileId, bigQuery, (err, result) => {
        // Assert
        expect(err).to.not.exist;
        expect(result).to.eq(queryResult[0]);
        done();
      });
    });
    describe('when an error is returned by bigQuery.query', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        bigQuery.query.yields(expectedError);
        // Act
        validate.getNetAmountFromDatabase(salesFileId, bigQuery, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
  });

  describe('validate.getValidationDataFromData', () => {
    let data = [];
    let mappingData = [];
    let result;
    let mappingResult;
    let units = 0;
    let netAmount = 0;
    let homeCurrencyNetAmount = 0;
    let grossAmount = 0;
    let homeCurrencyGrossAmount = 0;
    beforeEach((done) => {
      // Set up data and mappingData arrays
      data = [];
      for (let i = 0; i < 4; i += 1) {
        const oddNumber = i % 2; // Check if i is odd to add status to some
        data.push({
          units: testUtils.randomInt(),
          netAmount: testUtils.randomFloat(),
          homeCurrencyNetAmount: testUtils.randomFloat(),
          grossAmount: testUtils.randomFloat(),
          homeCurrencyGrossAmount: testUtils.randomFloat(),
          status: oddNumber ? 'Complete' : 'Incomplete',
        });
      }
      mappingData = [
        {
          originalDistributionChannel: 'Digital',
          distributionChannel: 'Digital',
          originalConfiguration: 'Download',
          configuration: 'Download',
          originalPriceCategory: 'Full Price',
          priceCategory: 'Full Price',
          originalTerritory: 'United Kingdom',
          territory: 'GB',
          source: 'iTunes',
          subSource: 'Apple',
          originalCurrency: 'GBP',
          currency: 'GBP',
          exchangeRate: 1,
          transactionDate: new Date(),
          saleDate: new Date(),
          releaseId: '123',
          catType: 'Release',
          originalReleaseTitle: 'Hello World',
          originalReleaseArtist: 'Hola',
          catNo: '123',
          barcode: '321',
        },
        {
          originalDistributionChannel: 'Digital',
          distributionChannel: 'Digital',
          originalConfiguration: 'Download',
          configuration: 'Download',
          originalPriceCategory: 'Mid',
          originalTerritory: 'United Kingdom',
          source: 'iTunes',
          subSource: 'Apple',
          originalCurrency: 'GBP',
          currency: 'GBP',
          exchangeRate: 1,
          catType: 'Release',
          originalReleaseTitle: 'Hello World 2',
          originalReleaseArtist: 'Hola 2',
          catNo: '1232',
          barcode: '3212',
        },
        {
          originalDistributionChannel: 'Physical',
          originalConfiguration: 'CD',
          originalPriceCategory: 'Full Price',
          priceCategory: 'Full Price',
          originalTerritory: 'Germany',
          source: 'Spotify',
          subSource: 'Spotify',
          originalCurrency: 'EUR',
          catType: 'Release',
          originalReleaseTitle: 'Hello World 2',
          originalReleaseArtist: 'Hola 2',
          catNo: '1232',
          barcode: '3212',
        },
        {
          originalDistributionChannel: 'Physical',
          originalConfiguration: 'CD',
          originalPriceCategory: 'Mid',
          originalTerritory: 'Germany',
          source: 'Spotify',
          subSource: 'Spotify',
          originalCurrency: 'EUR',
          trackId: '321',
          catType: 'Track',
          originalTrackTitle: 'Hello World 2',
          originalTrackArtist: 'Hola 2',
          isrc: '1232',
        },
        {
          originalDistributionChannel: 'Sync',
          originalConfiguration: 'Vinyl',
          originalPriceCategory: 'Back',
          originalTerritory: 'France',
          source: 'Deezer',
          subSource: 'Deezer FR',
          originalCurrency: 'US Dollar',
          catType: 'Track',
          originalTrackTitle: 'Hello World 3',
          originalTrackArtist: 'Hola 3',
          isrc: '12323',
        },
        {
          originalDistributionChannel: 'Sync',
          originalConfiguration: 'Vinyl',
          originalPriceCategory: 'Back',
          originalTerritory: 'France',
          source: 'Deezer',
          subSource: 'Deezer FR',
          originalCurrency: 'US Dollar',
          catType: 'Track',
          originalTrackTitle: 'Hello World 3',
          originalTrackArtist: 'Hola 3',
          isrc: '12323',
        },
        {
          originalDistributionChannel: 'Sync',
          originalConfiguration: 'Vinyl',
          originalPriceCategory: 'Back',
          originalTerritory: 'France',
          source: 'Deezer',
          subSource: 'Deezer FR',
          originalCurrency: 'US Dollar',
          catType: 'Track',
          originalTrackTitle: 'Hello World 4',
          originalTrackArtist: 'Hola 4',
          isrc: '123234',
        },
        {
          originalDistributionChannel: 'Sync',
          originalConfiguration: 'Vinyl',
          originalPriceCategory: 'Back',
          originalTerritory: 'France',
          source: 'Deezer',
          subSource: 'Deezer FR',
          originalCurrency: 'US Dollar',
          catType: 'Contract',
          contractIdentifier: 'CONTRACT001',
        },
        {
          originalDistributionChannel: 'Sync',
          originalConfiguration: 'Vinyl',
          originalPriceCategory: 'Back',
          originalTerritory: 'France',
          source: 'Deezer',
          subSource: 'Deezer FR',
          originalCurrency: 'US Dollar',
          catType: 'Work',
          originalWorkTitle: 'Hello World 4',
          originalIdentifier: '123234',
          tunecode: '1232345',
          iswc: '321432',
          songCode: '12323456',
          party1: 'Party',
        },
      ];
      // Arrange for all below
      units = 0;
      netAmount = 0;
      homeCurrencyNetAmount = 0;
      grossAmount = 0;
      homeCurrencyGrossAmount = 0;
      data.forEach((line) => {
        if (line?.units) {
          units += line.units;
        }
        if (line?.netAmount) {
          netAmount += line.netAmount;
        }
        if (line?.homeCurrencyNetAmount) {
          homeCurrencyNetAmount += line.homeCurrencyNetAmount;
        }
        if (line?.grossAmount) {
          grossAmount += line.grossAmount;
        }
        if (line?.homeCurrencyGrossAmount) {
          homeCurrencyGrossAmount += line.homeCurrencyGrossAmount;
        }
      });
      // Act for all below
      validate.getValidationDataFromData(data, (err, output) => {
        result = output;
        validate.getValidationDataFromData(mappingData, (err, mappingOutput) => {
          mappingResult = mappingOutput;
          done();
        });
      });
    });
    describe('when passed at least 1 line', () => {
      it('should return number of lines as "validationLines" AND as "lines"', (done) => {
        // Arrange
        const totalLines = data.length;
        // Assert
        expect(result.validationLines).to.eq(totalLines);
        expect(result.lines).to.eq(totalLines);
        done();
      });
    });
    describe('when any lines passed contain "units"', () => {
      it('should return the sum of all units as "units"', (done) => {
        // Assert
        expect(result.units).to.eq(units);
        done();
      });
      it('should return the sum of all units as "validationUnits"', (done) => {
        // Assert
        expect(result.validationUnits).to.eq(units);
        done();
      });
    });
    describe('when any lines passed contain "netAmount"', () => {
      it('should return the sum of all netAmounts as "netAmount"', (done) => {
        // Assert
        expect(result.netAmount).to.eq(netAmount);
        done();
      });
      it('should return the sum of all netAmounts as "validationNetAmount"', (done) => {
        // Assert
        expect(result.validationNetAmount).to.eq(netAmount);
        done();
      });
    });
    describe('when any lines passed contain "homeCurrencyNetAmount"', () => {
      it('should return the sum of all homeCurrencyNetAmounts as "homeCurrencyNetAmount"', (done) => {
        // Assert
        expect(result.homeCurrencyNetAmount).to.eq(homeCurrencyNetAmount);
        done();
      });
    });
    describe('when any lines passed contain "grossAmount"', () => {
      it('should return the sum of all grossAmounts as "grossAmount"', (done) => {
        // Assert
        expect(result.grossAmount).to.eq(grossAmount);
        done();
      });
    });
    describe('when any lines passed contain "homeCurrencyGrossAmount"', () => {
      it('should return the sum of all homeCurrencyGrossAmounts as "homeCurrencyGrossAmount"', (done) => {
        // Assert
        expect(result.homeCurrencyGrossAmount).to.eq(homeCurrencyGrossAmount);
        done();
      });
    });
    describe('when any lines passed contain "status" set to "Incomplete"', () => {
      it('should return the number of lines with "status" set to "Incomplete" as "invalidLines"', (done) => {
        // Assert
        expect(result.invalidLines).to.eq(data.length / 2);
        done();
      });
    });
    describe('when any lines passed contain "originalDistributionChannel" but do NOT contain "distributionChannel"', () => {
      it('should return all originalDistributionChannels as "distributionChannels", omitting any duplicates', (done) => {
        // Assert
        expect(mappingResult.distributionChannels).to.deep.eq(['Physical', 'Sync']);
        done();
      });
    });
    describe('when any lines passed contain "originalConfiguration" but do NOT contain "configuration"', () => {
      it('should return all originalConfiguration as "configurations", omitting any duplicates', (done) => {
        // Assert
        expect(mappingResult.configurations).to.deep.eq(['CD', 'Vinyl']);
        done();
      });
    });
    describe('when any lines passed contain "originalPriceCategory" but do NOT contain "priceCategory"', () => {
      it('should return all originalPriceCategory as "priceCategories", omitting any duplicates', (done) => {
        // Assert
        expect(mappingResult.priceCategories).to.deep.eq(['Mid', 'Back']);
        done();
      });
    });
    describe('when any lines passed contain "originalTerritory" but do NOT contain "territory"', () => {
      it('should return all originalTerritory as "territories", omitting any duplicates', (done) => {
        // Assert
        expect(mappingResult.territories).to.deep.eq(['United Kingdom', 'Germany', 'France']);
        done();
      });
    });
    describe('when any lines passed contain "source"', () => {
      it('should return all sources as "sources", omitting any duplicates', (done) => {
        // Assert
        expect(mappingResult.sources).to.deep.eq(['iTunes', 'Spotify', 'Deezer']);
        done();
      });
    });
    describe('when any lines passed contain "subSource"', () => {
      it('should return all subSources as "subSources", omitting any duplicates', (done) => {
        // Assert
        expect(mappingResult.subSources).to.deep.eq(['Apple', 'Spotify', 'Deezer FR']);
        done();
      });
    });
    describe('when any lines passed does not contain "exchangeRate" property OR "exchangeRate" is null OR undefined', () => {
      it('should add originalCurrency from each of those lines to "currencies" array and return this, omitting any duplicates', (done) => {
        // Assert
        expect(mappingResult.currencies).to.deep.eq(['EUR', 'US Dollar']);
        done();
      });
    });
    describe('when any lines passed has a currency code that is not mapped to currency and does not match the defined currency list', () => {
      it('should add originalCurrency from each of those lines to "currencyCodes" array and return this, omitting any duplicates', (done) => {
        // Assert
        expect(mappingResult.currencyCodes).to.deep.eq(['US Dollar']);
        done();
      });
    });
    describe('when any lines passed have "catType" set to "Release" but do NOT contain "releaseId"', () => {
      it('should return an object of all release related properties as "releases"', (done) => {
        // Arrange
        const expectedReleases = [
          {
            artist: 'Hola 2',
            barcode: '3212',
            catNo: '1232',
            title: 'Hello World 2',
          },
          {
            artist: 'Hola 2',
            barcode: '3212',
            catNo: '1232',
            title: 'Hello World 2',
          },
        ];
        // Assert
        expect(mappingResult.releases).to.deep.eq(expectedReleases);
        done();
      });
    });
    describe('when any lines passed have "catType" set to "Track" but do NOT contain "trackId"', () => {
      it('should return an object of all track related properties as "tracks"', (done) => {
        // Arrange
        const expectedTracks = [
          {
            artist: 'Hola 3',
            isrc: '12323',
            title: 'Hello World 3',
          },
          {
            artist: 'Hola 3',
            isrc: '12323',
            title: 'Hello World 3',
          },
          {
            artist: 'Hola 4',
            isrc: '123234',
            title: 'Hello World 4',
          },
        ];
        // Assert
        expect(mappingResult.tracks).to.deep.eq(expectedTracks);
        done();
      });
    });
    describe('when any lines passed have "catType" set to "Work" but do NOT contain "workId"', () => {
      it('should return an object of all track related properties as "works"', (done) => {
        // Arrange
        const expectedWorks = [
          {
            title: 'Hello World 4',
            identifier: '123234',
            tunecode: '1232345',
            songcode: '12323456',
            iswc: '321432',
            party1: 'Party',
            source: 'Deezer',
            party2: undefined,
            party3: undefined,
            party4: undefined,
            party5: undefined,
          },
        ];
        // Assert
        expect(mappingResult.works).to.deep.eq(expectedWorks);
        done();
      });
    });
    describe('when any lines passed have "catType" set to "Contract" but contains work information and does NOT contain "workId"', () => {
      it('should return an object of all work related properties as "works"', (done) => {
        // Arrange
        const inputData = [
          {
            originalDistributionChannel: 'Sync',
            originalConfiguration: 'Vinyl',
            originalPriceCategory: 'Back',
            originalTerritory: 'France',
            source: 'Deezer',
            subSource: 'Deezer FR',
            originalCurrency: 'US Dollar',
            catType: 'Contract',
            originalWorkTitle: 'Hello World 4',
            originalIdentifier: '123234',
            tunecode: '1232345',
            iswc: '321432',
            songCode: '12323456',
            party1: 'Party',
          },
        ];
        const expectedWorks = [
          {
            title: 'Hello World 4',
            identifier: '123234',
            tunecode: '1232345',
            songcode: '12323456',
            iswc: '321432',
            party1: 'Party',
            source: 'Deezer',
            party2: undefined,
            party3: undefined,
            party4: undefined,
            party5: undefined,
          },
        ];
        // Act
        validate.getValidationDataFromData(inputData, (err, output) => {
          // Assert
          expect(output.works).to.deep.eq(expectedWorks);
          done();
        });
      });
    });
    describe('when any lines passed have "catType" set to "Contract" but contains track information and does NOT contain "trackId"', () => {
      it('should return an object of all track related properties as "tracks"', (done) => {
        // Arrange
        const inputData = [
          {
            originalDistributionChannel: 'Sync',
            originalConfiguration: 'Vinyl',
            originalPriceCategory: 'Back',
            originalTerritory: 'France',
            source: 'Deezer',
            subSource: 'Deezer FR',
            originalCurrency: 'US Dollar',
            catType: 'Contract',
            originalTrackTitle: 'Hello World 4',
            originalTrackArtist: 'Hola 4',
            isrc: '123234',
          },
        ];
        const expectedTracks = [
          {
            artist: 'Hola 4',
            isrc: '123234',
            title: 'Hello World 4',
          },
        ];
        // Act
        validate.getValidationDataFromData(inputData, (err, output) => {
          // Assert
          expect(output.tracks).to.deep.eq(expectedTracks);
          done();
        });
      });
    });
    describe('when any lines passed have "catType" set to "Contract" but contains release information and does NOT contain "releaseId"', () => {
      it('should return an object of all track related properties as "tracks"', (done) => {
        // Arrange
        const inputData = [
          {
            originalDistributionChannel: 'Sync',
            originalConfiguration: 'Vinyl',
            originalPriceCategory: 'Back',
            originalTerritory: 'France',
            source: 'Deezer',
            subSource: 'Deezer FR',
            originalCurrency: 'US Dollar',
            catType: 'Contract',
            originalReleaseTitle: 'Hello World 4',
            originalReleaseArtist: 'Hola 4',
            catNo: '123234',
            barcode: '4321',
          },
        ];
        const expectedReleases = [
          {
            artist: 'Hola 4',
            catNo: '123234',
            title: 'Hello World 4',
            barcode: '4321',
          },
        ];
        // Act
        validate.getValidationDataFromData(inputData, (err, output) => {
          // Assert
          expect(output.releases).to.deep.eq(expectedReleases);
          done();
        });
      });
    });
    describe('when any lines passed contain "contractIdentifier" but do NOT contain "contractId"', () => {
      it('should return all contractIdentifiers as "contracts", omitting any duplicates', (done) => {
        // Assert
        expect(mappingResult.contracts).to.deep.eq(['CONTRACT001']);
        done();
      });
    });
    describe('when any lines passed do NOT contain "transactionDate"', () => {
      it('should return "invalidFields.transactionDate" set to true', (done) => {
        // Assert
        expect(mappingResult.invalidFields.transactionDate);
        done();
      });
    });
    describe('when all lines passed DO contain "transactionDate"', () => {
      it('should return "invalidFields.transactionDate" set to true', (done) => {
        // Act
        const inputData = [{
          transactionDate: new Date(),
          saleDate: new Date(),
        },
        {
          transactionDate: new Date(),
          saleDate: new Date(),
        }];
        validate.getValidationDataFromData(inputData, (err, output) => {
          // Assert
          expect(output.invalidFields.transactionDate).to.be.false;
          done();
        });
      });
    });
    describe('when any lines passed do NOT contain "saleDate"', () => {
      it('should return "invalidFields.saleDate" set to true', (done) => {
        // Assert
        expect(mappingResult.invalidFields.saleDate);
        done();
      });
    });
    describe('when all lines passed DO contain "saleDate"', () => {
      it('should return "invalidFields.saleDate" set to true', (done) => {
        // Act
        const inputData = [{
          transactionDate: new Date(),
          saleDate: new Date(),
        },
        {
          transactionDate: new Date(),
          saleDate: new Date(),
        }];
        validate.getValidationDataFromData(inputData, (err, output) => {
          // Assert
          expect(output.invalidFields.saleDate).to.be.false;
          done();
        });
      });
    });
  });

  describe('validate.valid', () => {
    let databaseResults; let dataResults;
    beforeEach((done) => {
      // Arrange
      databaseResults = {
        units: testUtils.randomInt(),
        netAmount: testUtils.randomFloat(),
        lines: testUtils.randomInt(),
      };
      dataResults = {
        ...databaseResults,
      };
      done();
    });
    it('should return true if units, netAmount and lines properties match between databaseResults and dataResults', (done) => {
      // Act
      const result = validate.valid(databaseResults, dataResults);
      // Assert
      expect(result).to.be.true;
      done();
    });
    it('should return false if units do not match between databaseResults and dataResults', (done) => {
      // Arrange
      dataResults.units += testUtils.randomInt();
      // Act
      const result = validate.valid(databaseResults, dataResults);
      // Assert
      expect(result).to.be.false;
      done();
    });
    it('should return false if netAmount do not match between databaseResults and dataResults', (done) => {
      // Arrange
      dataResults.netAmount += testUtils.randomFloat();
      // Act
      const result = validate.valid(databaseResults, dataResults);
      // Assert
      expect(result).to.be.false;
      done();
    });
    it('should return false if lines do not match between databaseResults and dataResults', (done) => {
      // Arrange
      dataResults.lines += testUtils.randomInt();
      // Act
      const result = validate.valid(databaseResults, dataResults);
      // Assert
      expect(result).to.be.false;
      done();
    });
  });
});
