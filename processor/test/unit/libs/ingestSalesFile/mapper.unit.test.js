process.env.NODE_ENV = 'test';

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomFloat } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const Calculation = require('../../../../libs/salesIngestion/calculation');

logger.debug('\n\n**** ./test/unit/libs/ingestSalesFile/mapper.unit.test.js');

describe('mapper Unit Tests', () => {
  let mapper;
  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    mapper = rewire('../../../../libs/salesIngestion/mapper');
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('mapper.arrayToTemplate', () => {
    let data; let event;
    beforeEach((done) => {
      data = [
        testUtils.randomArray(10),
        testUtils.randomArray(10),
        testUtils.randomArray(10),
      ];
      event = {
        template: testUtils.randomArray(),
      };
      sinon.stub(mapper, 'lineToTemplate').yields();
      sinon.stub(mapper, 'splitReturns').yields();
      done();
    });
    describe('when attributes array AND event.template are defined', () => {
      describe('for an array of 3 elements', () => {
        it('should call mapper.lineToTemplate 3 times with the correct attributes', (done) => {
          mapper.arrayToTemplate(data, event, 0, {}, {}, [], {}, {}, [], {}, () => {
            expect(mapper.lineToTemplate.callCount).to.eq(3);
            // @TOTO expect(mapper.lineToTemplate.firstCall.calledWith()).to.be.true;
            done();
          });
        });
      });
      // @TODO: add tests for removal of invalid fields?
    });
    describe('when attributes array AND event.template are not defined or null', () => {
      it('should return error "Requires an array of lines and template" to the callback', (done) => {
        // Arrange
        data = undefined;
        event = {};
        mapper.arrayToTemplate(data, event, 0, {}, {}, [], {}, {}, [], {}, (err) => {
          const expectedError = 'Requires an array of lines and template';
          expect(err.message).to.eq(expectedError);
          done();
        });
      });
    });
    describe('when attribute event.template is not defined or null', () => {
      it('should return error "Requires a template" to the callback', (done) => {
        // Arrange
        event = {};
        mapper.arrayToTemplate(data, event, 0, {}, {}, [], {}, {}, [], {}, (err) => {
          const expectedError = 'Requires a template';
          expect(err.message).to.eq(expectedError);
          done();
        });
      });
    });
    describe('when attribute array is not defined or null', () => {
      it('should return error "Requires an array of lines" to the callback', (done) => {
        // Arrange
        data = undefined;
        mapper.arrayToTemplate(data, event, 0, {}, {}, [], {}, {}, [], {}, (err) => {
          const expectedError = 'Requires an array of lines';
          expect(err.message).to.eq(expectedError);
          done();
        });
      });
    });
  });

  describe('mapper.splitReturns', () => {
    describe('when line contains ONLY returnUnits', () => {
      it('should return an array containing the unmodified line to the callback', (done) => {
        const line = { returnUnits: testUtils.randomInt() };
        mapper.splitReturns(line, 0, (err, lines) => {
          expect(lines).to.deep.eq([line]);
          done();
        });
      });
    });

    describe('when line only contains returnNetAmount', () => {
      it('should return an array containing the unmodified line to the callback', (done) => {
        const line = { returnNetAmount: testUtils.randomFloat() };
        mapper.splitReturns(line, 0, (err, lines) => {
          expect(lines).to.deep.eq([line]);
          done();
        });
      });
    });
    describe('when line contains returnUnits AND returnNetAmount', () => {
      it('should return an array containing the returns line only to the callback', (done) => {
        const line = { returnUnits: testUtils.randomInt(), returnNetAmount: testUtils.randomFloat() };
        mapper.splitReturns(line, 0, (err, lines) => {
          expect(lines[0].returnUnits).to.eq(-line.returnUnits);
          expect(lines[0].units).to.eq(-line.returnUnits);
          expect(lines[0].returnNetAmount).to.eq(-line.returnNetAmount);
          expect(lines[0].netAmount).to.eq(-line.returnNetAmount);
          done();
        });
      });
    });
    describe('when line contains returnUnits, returnNetAmount, units AND netAmount', () => {
      it('should return an array containing both the original line and the returns line to the callback', (done) => {
        const line = { returnUnits: testUtils.randomInt(), returnNetAmount: testUtils.randomFloat(), units: testUtils.randomInt(), netAmount: testUtils.randomFloat() };
        mapper.splitReturns(line, 0, (err, lines) => {
          expect(lines[0].returnUnits).to.eq(line.returnUnits);
          expect(lines[0].units).to.eq(line.units);
          expect(lines[0].returnNetAmount).to.eq(line.returnNetAmount);
          expect(lines[0].netAmount).to.eq(line.netAmount);
          expect(lines[1].returnUnits).to.eq(-line.returnUnits);
          expect(lines[1].units).to.eq(-line.returnUnits);
          expect(lines[1].returnNetAmount).to.eq(-line.returnNetAmount);
          expect(lines[1].netAmount).to.eq(-line.returnNetAmount);
          done();
        });
      });
    });

    describe('when line contains ONLY returnGrossAmount', () => {
      it('should return an array containing the unmodified line to the callback', (done) => {
        const line = { returnGrossAmount: testUtils.randomFloat() };
        mapper.splitReturns(line, 0, (err, lines) => {
          expect(lines).to.deep.eq([line]);
          done();
        });
      });
    });
    describe('when line contains returnUnits AND returnGrossAmount', () => {
      it('should return an array containing the returns line only to the callback', (done) => {
        const line = { returnUnits: testUtils.randomInt(), returnGrossAmount: testUtils.randomFloat() };
        mapper.splitReturns(line, 0, (err, lines) => {
          expect(lines[0].returnUnits).to.eq(-line.returnUnits);
          expect(lines[0].units).to.eq(-line.returnUnits);
          expect(lines[0].returnGrossAmount).to.eq(-line.returnGrossAmount);
          expect(lines[0].grossAmount).to.eq(-line.returnGrossAmount);
          done();
        });
      });
    });
    describe('when line contains returnUnits, returnGrossAmount, units AND grossAmount', () => {
      it('should return an array containing both the original line and the returns line to the callback', (done) => {
        const line = { returnUnits: testUtils.randomInt(), returnGrossAmount: testUtils.randomFloat(), units: testUtils.randomInt(), grossAmount: testUtils.randomFloat() };
        mapper.splitReturns(line, 0, (err, lines) => {
          expect(lines[0].returnUnits).to.eq(line.returnUnits);
          expect(lines[0].units).to.eq(line.units);
          expect(lines[0].returnGrossAmount).to.eq(line.returnGrossAmount);
          expect(lines[0].grossAmount).to.eq(line.grossAmount);
          expect(lines[1].returnUnits).to.eq(-line.returnUnits);
          expect(lines[1].units).to.eq(-line.returnUnits);
          expect(lines[1].returnGrossAmount).to.eq(-line.returnGrossAmount);
          expect(lines[1].grossAmount).to.eq(-line.returnGrossAmount);
          done();
        });
      });
    });

    describe('on error caught using try/catch', () => {
      it('should return error "There was an error in splitting returns" to the callback', (done) => {
        const line = undefined; // will cause error in try/catch
        const expectedError = 'There was an error in splitting returns';
        mapper.splitReturns(line, 0, (err, lines) => {
          expect(err.message).to.eq(expectedError);
          expect(lines).to.not.exist;
          done();
        });
      });
    });
  });

  describe('mapper.lineToTemplate', () => {
    beforeEach((done) => {
      sinon.stub(mapper, 'overwriteFields').yields();
      sinon.stub(mapper, 'addFacebookPerUnitRate').yields();
      sinon.stub(Calculation, 'startCalculation').yields();
      sinon.stub(mapper, 'mapAllFields').yields();
      sinon.stub(mapper, 'setCatalogueData').returns();
      sinon.stub(mapper, 'setNegative').yields();
      sinon.stub(mapper, 'setITunesExchangeRates').yields();
      sinon.stub(mapper, 'addPerUnitRate').yields();
      sinon.stub(mapper, 'addiTunesPerUnitRate').yields();
      sinon.stub(mapper, 'runExchangeRates').yields();
      sinon.stub(mapper, 'runMultiplier').yields();
      sinon.stub(mapper, 'setStatus').yields();
      done();
    });
    describe('when attributes line AND template are defined', () => {
      // @TODO: processing using salesIngestionUtils.fieldToFormat
      it('should call mapper.overwriteFields with the correct attributes');
      it('should call mapper.splitReturns with the correct attributes');
      it('should call mapper.addFacebookPerUnitRate with the correct attributes');
      it('should call Calculation.startCalculation with the correct attributes');
      it('should call mapper.mapAllFields with the correct attributes');
      it('should call mapper.setCatalogueData', () => {
        const overwrittenObject = {};
        const catalogueOverwritterData = {};
        const overwriteFields = {};
        const line = {};
        const index = 1;
        const salesFileId = 1;
        const templateSource = {};
        const template = {};
        const catalogue = {};
        const calculation = {};
        const catalogueOverwritingData = {};
        const perUnitRate = {};
        const iTunesExchangeRates = {};
        const iTunesPerUnitRates = {};
        const currencies = {};
        const exchangeRates = {};
        const facebookPerUnitRates = {};

        mapper.lineToTemplate(
          line,
          index,
          salesFileId,
          templateSource,
          template,
          overwriteFields,
          catalogue,
          calculation,
          catalogueOverwritingData,
          perUnitRate,
          iTunesExchangeRates,
          iTunesPerUnitRates,
          currencies,
          exchangeRates,
          facebookPerUnitRates,
          () => {
            expect(mapper.setCatalogueData.called).to.be.true;
          },
        );
      });
      it('should call mapper.setNegative with the correct attributes');
      it('should call mapper.setITunesExchangeRates with the correct attributes');
      it('should call mapper.addPerUnitRate with the correct attributes');
      it('should call mapper.addiTunesPerUnitRate with the correct attributes');
      it('should call Calculation.startCalculation A SECOND TIME with the correct attributes');
      it('should call mapper.runExchangeRates with the correct attributes');
      it('should call mapper.runMultiplier with the correct attributes');
      it('should call mapper.setCatalogueData A SECOND TIME with the correct attributes');
      it('should call mapper.setStatus with the correct attributes');
      // @TODO: test errors returned by all callback type methods above

      // @TODO: Clear blank dates
      // @TODO: Set dates to SQL style dates
      // @TODO: Delete blank values
    });
    describe('on error caught using try/catch', () => {
      it('should return the error caught to the callback');
    });

    describe('when attributes line AND template are not defined or null', () => {
      it('should return error "Requires an array of lines and template" to the callback');
    });
    describe('when attribute template is not defined or null', () => {
      it('should return error "Requires a template" to the callback');
    });
    describe('when attribute line is not defined or null', () => {
      it('should return error "Requires an array of lines" to the callback');
    });
  });

  describe('mapper.addPerUnitRate', () => {
    describe('when perUnitRate is undefined', () => {
      it('should return the unmodified object to the callback');
    });
    describe('when perUnitRate is 1.23 AND overwrittenObject = { units: 5 }', () => {
      it('should set the grossAmount and netAmount on overwrittenObject and return this to the callback'); // ("", { units: 5, grossAmount: 6.15, netAmount: 6.15 })
    });
    describe('on error caught using try/catch', () => {
      it('should return an error to the callback');
    });
  });

  describe('mapper.addiTunesPerUnitRate', () => {
    describe('when iTunesPerUnitRates is undefined', () => {
      it('should return the unmodified object to the callback');
    });
    describe('when iTunesPerUnitRates is an object with no properties', () => {
      it('should return the unmodified object to the callback');
    });
    describe('when iTunesPerUnitRates is an object containing at least 1 property', () => {
      it('should set the grossAmount and netAmount on overwrittenObject and return this to the callback');
    });
    describe('on error caught using try/catch', () => {
      it('should return an error to the callback');
    });
  });

  describe('mapper.addFacebookPerUnitRate', () => {
    describe('when facebookPerUnitRates is undefined', () => {
      it('should return the unmodified object to the callback');
    });
    describe('when facebookPerUnitRates is on object with no properties', () => {
      it('should return the unmodified object to the callback');
    });
    describe('when facebookPerUnitRates is an object containing at least 1 property', () => {
      it('should set the grossAmount on overwrittenObject and return this to the callback');
    });
    describe('when facebookPerUnitRates is an object containing at least 1 property AND overwrittenObject.units is not defined or null', () => {
      it('should set the grossAmount on overwrittenObject, set overwrittenObject.units to 50 and return this to the callback');
    });
    describe('on error caught using try/catch', () => {
      it('should return an error to the callback');
    });
  });

  describe('mapper.mapAllFields', () => {
    beforeEach((done) => {
      sinon.stub(mapper, 'calculateCatType');
      sinon.stub(mapper, 'createTitleMap');
      sinon.stub(mapper, 'mapToCatalogue').yields();
      done();
    });

    describe('when object AND fields are defined', () => {
      // try
      describe('when object does not contain territory AND contains originalTerritory AND originalTerritory is contained in fields.territories', () => {
        // e.g. when object = { originalTerritory: 'Italy' } AND fields.territories = { Italy: 'IT' }
        it('should return object with territory value taken from fields.territories[originalTerritory]');
        // e.g. object = { originalTerritory: 'Italy', territory: 'IT' }
      });
      // TODO: should we test fallback to mapping the territory to fields.territories[""] when no mapping matched?
      describe('when object does not contain distributionChannel'
      + ' AND contains originalDistributionChannel AND originalDistributionChannel is a property of fields.distributionChannels', () => {
        it('should return object with distributionChannel value taken from fields.distributionChannels[originalDistributionChannel]');
      });
      describe('when object does not contain configuration AND contains originalConfiguration AND originalConfiguration is a property of fields.configurations', () => {
        it('should return object with configuration value taken from fields.configurations[originalConfiguration]');
      });
      describe('when object does not contain priceCategory AND contains originalPriceCategory AND originalPriceCategory is a property of fields.priceCategories', () => {
        it('should return object with priceCategory value taken from fields.priceCategories[originalPriceCategory]');
      });
      describe('when object does not contain positiveNegative AND contains originalPositiveNegative AND originalPositiveNegative is a property of fields.positiveNegatives', () => {
        it('should return object with positiveNegative value taken from fields.positiveNegatives[originalPositiveNegative]');
      });
      describe('when object.source is a property of fields.sources', () => {
        it('should return object with source value taken from fields.sources[source]');
      });
      describe('when object.subSource is a property of fields.subSources', () => {
        it('should return object with subSource value taken from fields.subSources[subSource]');
      });
      it('should call this.calculateCatType with object as the attribute and assign output to object.catType');
      it('should call this.createTitleMap with object as the attribute and assign output to object.titleMapper');
      it('should call this.mapToCatalogue with the correct attributes and return output of this to the callback');

      describe('on error caught using try/catch', () => {
        it('should return an error');
      });
    });
    describe('when object is not defined', () => {
      it('should return the passed object to the callback');
    });
    describe('when fields is not defined', () => {
      it('should return the passed object to the callback');
    });
  });

  describe('mapper.createTitleMap', () => {
    describe('when passed object contains properties originalWorkTitle AND party1', () => {
      // e.g. object = { originalWorkTitle: 'On a Sunny Day', party1: 'Composer Name 1' }
      it('should return a string containing originalWorkTitle AND party1 separated by " - "');
      // e.g. 'On a Sunny Day - Composer Name 1'
    });
    describe('when passed object contains properties originalWorkTitle, party1, party2, party3', () => {
      it('should return a string containing originalWorkTitle, party1, party2, party3 separated by " - "');
    });
    describe('when passed object contains properties originalWorkTitle, party1, party2 which contain unsupported characters', () => {
      it('should return a string containing originalWorkTitle, party1, party2, separated by " - " with unsupported characters removed');
    });
  });

  describe('mapper.mapValue', () => {
    describe('when originalValue AND mapping are defined AND originalValue is a property of mapping', () => {
      it('should return mapping[originalValue]');
    });
    describe('when originalValue AND mapping are defined AND originalValue is NOT a property of mapping', () => {
      it('should return null');
    });
    describe('when originalValue is NOT defined', () => {
      it('should return null');
    });
    describe('when mapping is NOT defined', () => {
      it('should return null');
    });
  });

  describe('mapper.overwriteFields', () => {
    describe('when object AND fields are defined', () => {
      describe('when fields = { field1: "value" }', () => {
        it('should add field1 property with value of "value" to object and return this to the callback');
      });
      describe('when fields = { field1: "" }', () => {
        it('should NOT add field1 property to object and return this to the callback');
      });
      describe('when fields = { field1: null }', () => {
        it('should NOT add field1 property to object and return this to the callback');
      });
      describe('on error caught using try/catch', () => {
        it('should return the error');
      });
    });
    describe('on error caught using try/catch', () => {
      it('should return an error');
    });
    describe('when object is not defined', () => {
      it('should return the passed object to the callback');
    });
    describe('when fields is not defined', () => {
      it('should return the passed object to the callback');
    });
  });

  describe('mapper.setITunesExchangeRates', () => {
    describe('when iTunesExchangeRates is an object containing at least 1 property', () => {
      describe('when object.originalCurrency is "USD"'
      + ' AND iTunesExchangeRates["Latam Caribbean USD"] is defined'
      + ' AND object.territory is contained within LatamCaribbean array', () => {
        it('should assign iTunesExchangeRates["Latam Caribbean USD"] value to object.exchangeRate and return object to the callback');
      });
      describe('when object.originalCurrency is "USD" AND object.territory is contained within usTerritories array', () => {
        it('should assign iTunesExchangeRates["Americas USD"] value to object.exchangeRate and return object to the callback');
      });
      describe('when object.originalCurrency is "USD" AND object.territory is NOT contained within usTerritories array', () => {
        it('should assign iTunesExchangeRates["ROW USD"] value to object.exchangeRate and return object to the callback');
      });
      describe('when object.originalCurrency is NOT "USD"', () => {
        it('should assign iTunesExchangeRates[object.originalCurrency] value to object.exchangeRate and return object to the callback');
      });
    });
    describe('when iTunesExchangeRates is an object containing no properties', () => {
      it('should return the passed object to the callback');
    });
    describe('when iTunesExchangeRates is undefined', () => {
      it('should return the passed object to the callback');
    });
  });

  describe('mapper.setStatus', () => {
    describe('when object contains the following defined properties:'
    + ' catType, territory, distributionChannel, configuration, source, originalCurrency, exchangeRate AND either netAmount OR returnNetAmount are defined', () => {
      describe('when catType is "Contract" AND contractId is defined', () => {
        it('should assign "Complete" to object.status and return object to the callback');
      });
      describe('when catType is "Release" AND either releaseId OR contractId is defined', () => {
        it('should assign "Complete" to object.status and return object to the callback');
      });
      describe('when catType is "Track" AND either trackId OR contractId is defined', () => {
        it('should assign "Complete" to object.status and return object to the callback');
      });
      describe('when catType is "Work" AND either workId OR contractId is defined', () => {
        it('should assign "Complete" to object.status and return object to the callback');
      });
    });
    describe('when none of the above match AND status is "Suspense"', () => {
      it('should assign "Incomplete" to object.status and return object to the callback');
    });
    describe('on error caught using try/catch', () => {
      it('should return an error to the callback');
    });
  });

  describe('mapper.setNegative', () => {
    describe('when positiveNegative is "Negative"', () => {
      it('should reverse the sign for object.grossAmount and object.netAmount and return object to the callback');
    });
    describe('on error caught using try/catch', () => {
      it('should return an error to the callback');
    });
  });

  describe('mapper.runExchangeRates', () => {
    describe('when mechanicalAtSource is defined', () => {
      it('should assign mechanicalAtSource multiplied by exchangeRate to object.homeCurrencyMechanicalAtSource');
    });
    describe('when discountAmount is defined', () => {
      it('should assign discountAmount multiplied by exchangeRate to homeCurrencyDiscountAmount');
    });
    describe('when grossAmount is defined', () => {
      it('should assign grossAmount multiplied by exchangeRate to homeCurrencyGrossAmount');
    });
    describe('when netAmount is defined', () => {
      it('should assign netAmount multiplied by exchangeRate to homeCurrencyNetAmount');
    });
    describe('when returnGrossAmount is defined', () => {
      it('should assign returnGrossAmount multiplied by exchangeRate to homeCurrencyReturnGrossAmount');
    });
    describe('when returnNetAmount is defined', () => {
      it('should assign returnNetAmount multiplied by exchangeRate to homeCurrencyReturnNetAmount');
    });
    describe('when perUnitRate is defined', () => {
      it('should assign perUnitRate multiplied by exchangeRate to homeCurrencyPerUnitRate');
    });
    describe('when retailPrice is defined', () => {
      it('should assign retailPrice multiplied by exchangeRate to homeCurrencyRetailPrice');
    });
    // TODO: remainder still to do
  });

  describe('mapper.runMultiplier', () => {
    describe('when grossAmount is defined', () => {
      it('should set grossAmount to grossAmount multiplied by multiplier', (done) => {
        // Arrange
        const object = { multiplier: randomFloat(), grossAmount: randomFloat() };
        // Act
        mapper.runMultiplier(object, null, (_err, result) => {
          // Assert
          expect(result).to.deep.eq({ ...object, grossAmount: object.grossAmount * object.multiplier });
          done();
        });
      });
    });
    describe('when mechanicalAtSource is defined', () => {
      it('should set mechanicalAtSource to mechanicalAtSource multiplied by multiplier', (done) => {
        // Arrange
        const object = { multiplier: randomFloat(), mechanicalAtSource: randomFloat() };
        // Act
        mapper.runMultiplier(object, null, (_err, result) => {
          // Assert
          expect(result).to.deep.eq({ ...object, mechanicalAtSource: object.mechanicalAtSource * object.multiplier });
          done();
        });
      });
    });
    describe('when discountAmount is defined', () => {
      it('should set discountAmount to discountAmount multiplied by multiplier', (done) => {
        // Arrange
        const object = { multiplier: randomFloat(), discountAmount: randomFloat() };
        // Act
        mapper.runMultiplier(object, null, (_err, result) => {
          // Assert
          expect(result).to.deep.eq({ ...object, discountAmount: object.discountAmount * object.multiplier });
          done();
        });
      });
    });
    describe('when netAmount is defined', () => {
      it('should set netAmount to netAmount multiplied by multiplier', (done) => {
        // Arrange
        const object = { multiplier: randomFloat(), netAmount: randomFloat() };
        // Act
        mapper.runMultiplier(object, null, (_err, result) => {
          // Assert
          expect(result).to.deep.eq({ ...object, netAmount: object.netAmount * object.multiplier });
          done();
        });
      });
    });
    describe('when homeCurrency amounts are defined', () => {
      it('should multiply homeCurrencyGrossAmount, homeCurrencyMechanicalAtSource, homeCurrencyDiscountAmount, homeCurrencyNetAmount, homeCurrencyReturnGrossAmount, homeCurrencyReturnNetAmount by multiplier', (done) => {
        // Arrange
        const object = {
          multiplier: randomFloat(),
          homeCurrencyGrossAmount: randomFloat(),
          homeCurrencyMechanicalAtSource: randomFloat(),
          homeCurrencyDiscountAmount: randomFloat(),
          homeCurrencyNetAmount: randomFloat(),
          homeCurrencyReturnGrossAmount: randomFloat(),
          homeCurrencyReturnNetAmount: randomFloat(),
        };
        // Act
        mapper.runMultiplier(object, null, (_err, result) => {
          // Assert
          expect(result).to.deep.eq({
            ...object,
            homeCurrencyGrossAmount: object.homeCurrencyGrossAmount * object.multiplier,
            homeCurrencyMechanicalAtSource: object.homeCurrencyMechanicalAtSource * object.multiplier,
            homeCurrencyDiscountAmount: object.homeCurrencyDiscountAmount * object.multiplier,
            homeCurrencyNetAmount: object.homeCurrencyNetAmount * object.multiplier,
            homeCurrencyReturnGrossAmount: object.homeCurrencyReturnGrossAmount * object.multiplier,
            homeCurrencyReturnNetAmount: object.homeCurrencyReturnNetAmount * object.multiplier,
          });
          done();
        });
      });
    });
    describe('when currencies are defined', () => {
      it('should multiply each currencies amounts by multiplier', (done) => {
        // Arrange
        const currencies = {
          currency1: randomFloat(),
          currency2: randomFloat(),
        };
        const object = {
          multiplier: randomFloat(),
          currency1GrossAmount: randomFloat(),
          currency1MechanicalAtSource: randomFloat(),
          currency1DiscountAmount: randomFloat(),
          currency1NetAmount: randomFloat(),
          currency1ReturnGrossAmount: randomFloat(),
          currency1ReturnNetAmount: randomFloat(),
          currency2GrossAmount: randomFloat(),
          currency2MechanicalAtSource: randomFloat(),
          currency2DiscountAmount: randomFloat(),
          currency2NetAmount: randomFloat(),
          currency2ReturnGrossAmount: randomFloat(),
          currency2ReturnNetAmount: randomFloat(),
        };
        // Act
        mapper.runMultiplier(object, currencies, (_err, result) => {
          // Assert
          expect(result).to.deep.eq({
            ...object,
            currency1GrossAmount: object.currency1GrossAmount * object.multiplier,
            currency1MechanicalAtSource: object.currency1MechanicalAtSource * object.multiplier,
            currency1DiscountAmount: object.currency1DiscountAmount * object.multiplier,
            currency1NetAmount: object.currency1NetAmount * object.multiplier,
            currency1ReturnGrossAmount: object.currency1ReturnGrossAmount * object.multiplier,
            currency1ReturnNetAmount: object.currency1ReturnNetAmount * object.multiplier,
            currency2GrossAmount: object.currency2GrossAmount * object.multiplier,
            currency2MechanicalAtSource: object.currency2MechanicalAtSource * object.multiplier,
            currency2DiscountAmount: object.currency2DiscountAmount * object.multiplier,
            currency2NetAmount: object.currency2NetAmount * object.multiplier,
            currency2ReturnGrossAmount: object.currency2ReturnGrossAmount * object.multiplier,
            currency2ReturnNetAmount: object.currency2ReturnNetAmount * object.multiplier,
          });
          done();
        });
      });
    });

    describe('on error caught using try/catch', () => {
      it('should return an error to the callback', (done) => {
        mapper.runMultiplier(null, null, (err) => {
          expect(err.message).to.eq('There was an error in running the multiplier. Check that multiplier is a number and gross and net amounts are set.');
          done();
        });
      });
    });
  });

  describe('mapper.mapToCatalogue', () => {
    beforeEach((done) => {
      sinon.stub(mapper, 'mapWorkCatalogue');
      sinon.stub(mapper, 'mapSimpleCatalogue');
      sinon.stub(mapper, 'mapProductCatalogue');
      done();
    });
    describe('when catType is "Work" AND workId is not defined', () => {
      it('should call this.mapWorkCatalogue with the correct attributes and assign output to object.workId');
    });
    describe('when catType is "Track" AND trackId is not defined', () => {
      it('should call this.mapSimpleCatalogue with the correct attributes and assign output to object.trackId');
    });
    // @TODO: revisit once pending mapProductCatalogue tests are written
  });

  describe('mapper.checkForException', () => {
    describe('when identifier is "QZD442000252", exceptionField is "catNo", title is "Limit", exceptions is [{catNo: "QZD442000252", title: "Limit", output: "Unlimited"}]', () => {
      it('should return "Unlimited"');
    });
    describe('when identifier is "JM-K40-14-00212", exceptionField is "isrc", title is "Another Track",'
    + ' exceptions is [{isrc: "JM-K40-14-00212", title: " Another Track ", output: "Output Title"}]', () => {
      it('should return "Output Title"');
    });
    describe('when exceptions is NOT an array', () => {
      it('should return null');
    });
  });

  describe('mapper.mapSimpleCatalogue', () => {
    describe('when an exception matches for identifier, title & exceptionField', () => {
      it('should return the exception output');
    });
    describe('when NO exception matches for identifier, title & exceptionField AND mappings are supplied', () => {
      it('it should return the value of the matching mapping');
    });
    describe('when NO exception matches for identifier, title & exceptionField AND mappings are NOT supplied', () => {
      it('it should return null');
    });
  });

  describe('mapper.mapProductCatalogue', () => {
    describe('when an exception matches for catNo & title', () => {
      it('should return the exception output');
    });
    describe('when NO exception matches for catNo & title AND mapping exists for catNo', () => {
      it('should return mapping value');
    });
    describe('when NO exception matches for catNo & title AND mapping catNo has no value', () => {
      it('should return mapping value of barcode');
    });
    describe('when NO exception matches for catNo & title AND mapping exists for barcode', () => {
      it('should return mapping value');
    });
    describe('when NO exception matches for catNo & title AND mappings, barcode & catNo are not defined', () => {
      it('should return null');
    });
  });

  describe('mapper.mapWorkCatalogue', () => {
    describe('when an exception matches for identifier & title', () => {
      it('should return the exception output');
    });
    describe('when NO exception matches for identifier & title AND mapping exists for identifier', () => {
      it('should return mapping value');
    });
    describe('when NO exception matches for identifier & title AND mapping exists for tunecode', () => {
      it('should return mapping value');
    });
    describe('when NO exception matches for identifier & title AND mapping exists for iswc', () => {
      it('should return mapping value');
    });
    describe('when NO exception matches for identifier & title AND mapping exists for songCode', () => {
      it('should return mapping value');
    });
    describe('when NO exception matches for identifier & title AND mapping exists for titleMapper', () => {
      it('should return mapping value');
    });
  });

  describe('mapper.valueOrDistributionChannel', () => {
    describe('when value is a String', () => {
      it('should return value');
    });
    describe('when value is an object with a property name matching distributionChannel', () => {
      it('should return value[distributionChannel]');
    });
    describe('when value is an object with a property name of undefined but no property name matching distributionChannel', () => {
      it('should return value[undefined]');
    });
  });

  describe('mapper.setCatalogueData', () => {
    describe('When round is 1 and Object.catalcaulateAfterMapping is true', () => {
      it('Should return object with overwrite', () => {
        // Arrange
        const releaseId = randomId();
        const object = { catType: 'Release', releaseId };
        const catalogueOverwritingData = { releases: { [releaseId]: { distributionChannel: 'test' } } };
        const overwriteFields = { overwriteDistributionChannelWithCatalogue: true };
        const round = 1;

        // Act
        const result = mapper.setCatalogueData(object, catalogueOverwritingData, overwriteFields, round);
        const expectedObject = { catType: 'Release', releaseId, distributionChannel: 'test' };
        expect(result).to.deep.eq(expectedObject);
      });
    });
    describe('When round is 2 and Object.catalcaulateAfterMapping is true', () => {
      it('Should return object without overwrite', () => {
        // Arrange
        const releaseId = randomId();
        const object = { catType: 'Release', releaseId, calculateAfterMapping: true };
        const catalogueOverwritingData = { releases: { [releaseId]: { distributionChannel: 'test' } } };
        const overwriteFields = { overwriteDistributionChannelWithCatalogue: true };
        const round = 2;

        // Act
        const result = mapper.setCatalogueData(object, catalogueOverwritingData, overwriteFields, round);
        const expectedObject = { catType: 'Release', releaseId, calculateAfterMapping: true };
        expect(result).to.deep.eq(expectedObject);
      });
    });
    describe('When round is 2 and Object.catalcaulateAfterMapping is false', () => {
      it('Should return object with overwrite', () => {
        // Arrange
        const releaseId = randomId();
        const object = { catType: 'Release', releaseId };
        const catalogueOverwritingData = { releases: { [releaseId]: { distributionChannel: 'test' } } };
        const overwriteFields = { overwriteDistributionChannelWithCatalogue: true };
        const round = 2;

        // Act
        const result = mapper.setCatalogueData(object, catalogueOverwritingData, overwriteFields, round);
        const expectedObject = { catType: 'Release', releaseId, distributionChannel: 'test' };
        expect(result).to.deep.eq(expectedObject);
      });
    });
    describe('when a workId is passed AND catalogue.works contains this workId', () => {
      it('should add values from catalogue.works to output, apart from "distributionChannel", "configuration", "priceCategory"');
    });
    describe('when a trackId is passed AND catalogue.tracks contains this trackId', () => {
      it('should add values from catalogue.tracks to output, apart from "distributionChannel", "configuration", "priceCategory"');
    });
    describe('when a trackId is passed AND catalogue.tracks contains this trackId AND defaultReleaseId is defined AND releaseId is not defined', () => {
      it('should assign value of defaultReleaseId to releaseId AND delete defaultReleaseId from object');
    });
    describe('when a trackId is passed AND catalogue.tracks contains this trackId AND this track data contains a foreign id for releaseId', () => {
      it('should assign value of this releaseSpecificForeignId to catalogueTrackForeignId');
    });
    describe('when a releaseId is passed AND catalogue.releases contains this releaseId', () => {
      it('should add values from catalogue.releases to output, apart from "distributionChannel", "configuration", "priceCategory"');
    });
    describe('when a releaseId is passed AND catalogue.releases contains this releaseId AND overwriteFields.overwriteDistributionChannelWithCatalogue is true', () => {
      it('should add values from catalogue.releases to output, apart from "configuration", "priceCategory"');
    });
    describe('when a releaseId is passed AND catalogue.releases contains this releaseId AND overwriteFields.overwriteConfigWithCatalogue is true', () => {
      it('should add values from catalogue.releases to output, apart from "distributionChannel", "priceCategory"');
    });
    describe('when a releaseId is passed AND catalogue.releases contains this releaseId AND overwriteFields.overwritePriceCategoryWithCatalogue is true', () => {
      it('should add values from catalogue.releases to output, apart from "distributionChannel", "configuration"');
    });
  });
});
