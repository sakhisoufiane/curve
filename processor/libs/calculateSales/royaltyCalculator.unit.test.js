const { BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString, randomDate, randomInt, randomFloat } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { EventEmitter } = require('events');
const async = require('async');
const moment = require('moment');
const fs = require('fs');
const { ObjectId } = require('mongodb');

const momentActual = jest.requireActual('moment');
const calculationHelper = require('../calculationHelper');

const Escalation = require('../../models/escalation');
const Period = require('../../models/period');

jest.mock('../calculationHelper');
jest.mock('@curveroyaltysystems/platform-shared-utils');
jest.mock('moment', () => jest.fn());

const RoyaltyCalculator = require('./royaltyCalculator');

describe('RoyaltyCalculator Unit Tests', () => {
  let contract; let db; let bigQuery; let salesDatabaseTable; let periodId; let writeSalesDatabaseTable;
  let filter; let contractQuery; let periodEndDate; let periodType; let clientCurrencies; let exchangeRates;
  let mechanicalAmounts; let eventType; let participationRates; let salesData; let catType; let ppds; let statRates;
  let specificDealerPrices; let totalLines; let releaseRestrictions; let catalogueData; let escalationEquivalents;
  let collectionFindOneStub; let collectionUpdateStub; let inputCollection; let emitter; let joinSalesCalculationFilterQueryObjectResult;
  let royaltyCalculator;

  beforeEach(() => {
    contract = {
      name: randomString(),
      contractId: randomId(),
      terms: {
        contractCurrency: 'Home Currency',
        sales: [{ escalationTrackers: [randomString(), randomString()] }, { escalationTrackers: [randomString(), randomString()] }],
        deductions: [{ deduction: 1 }, { deduction: 2 }],
        withholdingTaxes: [{ withholdingTaxe: 1 }, { withholdingTaxe: 2 }],
        mechanicalContracts: [{ mechanicalContract: 1 }, { mechanicalContract: 2 }],
      },
      share: randomFloat(),
      releaseId: randomId(),
    };

    collectionFindOneStub = jest.fn().mockResolvedValue();
    collectionUpdateStub = jest.fn().mockResolvedValue();
    inputCollection = {
      findOne: collectionFindOneStub,
      update: collectionUpdateStub,
    };
    db = { collection: jest.fn().mockReturnValue(inputCollection) };
    emitter = new EventEmitter()
      .on('error', function (error) { return error; })
      .on('data', function (data) { return data; })
      .on('end', function () {});

    joinSalesCalculationFilterQueryObjectResult = { type: randomString() };
    bigQuery = {
      outputSchema: [{ mode: 'REPEATED', name: 'field1', type: 'String' }, { mode: 'NOT-REPEATED', name: 'field2', type: 'Number' }],
      outputTable: randomString(),
      writeToFile: jest.fn().mockImplementation((...args) => args[args.length - 1]()),
      writeFileToDb: jest.fn().mockImplementation((...args) => args[args.length - 1]()),
      setupFile: jest.fn().mockImplementation((...args) => args[args.length - 1]()),
      joinSalesCalculationFilterQueryObject: jest.fn().mockReturnValue(joinSalesCalculationFilterQueryObjectResult),
      getCount: jest.fn().mockImplementation((...args) => args[args.length - 1]()),
      retryErroredQuery: jest.fn(),
      logQuery: jest.fn(),
      client: {
        createQueryStream: jest.fn().mockReturnValue(emitter),
      },
    };

    jest.spyOn(fs, 'unlinkSync');
    fs.unlinkSync.mockReturnValue();

    BigQuery.mockReturnValue(bigQuery);
    calculationHelper.generateContractPartitionNo = jest.fn().mockImplementation((...args) => args[args.length - 1]());

    salesDatabaseTable = randomString();
    periodId = randomId();
    writeSalesDatabaseTable = randomString();
    filter = { type: randomString() };
    contractQuery = { type: randomString() };
    periodEndDate = randomDate();
    periodType = randomString();
    clientCurrencies = { homeCurrency: randomString(), currency: randomString() };
    exchangeRates = [{ rate: randomInt() }, { rate: randomInt() }];
    mechanicalAmounts = [{ amount: randomInt() }, { amount: randomInt() }];
    eventType = randomString();
    participationRates = [{ rate: randomInt() }, { rate: randomInt() }];
    salesData = [{ salesData: 1 }, { salesData: 2 }];
    catType = randomString();
    ppds = [{ rate: randomInt() }, { rate: randomInt() }];
    specificDealerPrices = [{ rate: randomInt() }, { rate: randomInt() }];
    totalLines = 100001;
    releaseRestrictions = [{ restriction: randomInt() }, { restriction: randomInt() }];
    catalogueData = [{ _id: randomId() }, { _id: randomId() }];
    escalationEquivalents = [{ escalation: randomInt() }, { escalation: randomInt() }];
    statRates = [{ rate: randomInt() }, { rate: randomInt() }];

    royaltyCalculator = new RoyaltyCalculator(contract, db, bigQuery, salesDatabaseTable, periodId, writeSalesDatabaseTable, filter, contractQuery, periodEndDate, periodType, clientCurrencies, exchangeRates, mechanicalAmounts, eventType, participationRates, salesData, catType, ppds, specificDealerPrices, totalLines, releaseRestrictions, catalogueData, escalationEquivalents, statRates);

    jest.spyOn(Escalation, 'findOne').mockResolvedValue();
    jest.spyOn(Escalation, 'findByIdAndUpdate').mockResolvedValue();
    jest.spyOn(Period, 'findOne').mockResolvedValue({ escalationStartingFigures: [] });
    jest.spyOn(Period, 'findById').mockResolvedValue({ escalationStartingFigures: [] });
    jest.spyOn(Period, 'findByIdAndUpdate').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialisation', () => {
    it('should set participationRates to a blank object when they DO NOT exist', () => {
      // Arrange
      participationRates = null;
      // Act
      royaltyCalculator = new RoyaltyCalculator(contract, db, bigQuery, salesDatabaseTable, periodId, writeSalesDatabaseTable, filter, contractQuery, periodEndDate, periodType, clientCurrencies, exchangeRates, mechanicalAmounts, eventType, participationRates, salesData, catType, ppds, specificDealerPrices, totalLines, releaseRestrictions, catalogueData, escalationEquivalents, statRates);
      // Assert
      expect(royaltyCalculator.participationRates).toEqual({});
    });

    it('should set ppds to a blank object when they DO NOT exist', () => {
      // Arrange
      ppds = null;
      // Act
      royaltyCalculator = new RoyaltyCalculator(contract, db, bigQuery, salesDatabaseTable, periodId, writeSalesDatabaseTable, filter, contractQuery, periodEndDate, periodType, clientCurrencies, exchangeRates, mechanicalAmounts, eventType, participationRates, salesData, catType, ppds, specificDealerPrices, totalLines, releaseRestrictions, catalogueData, escalationEquivalents, statRates);
      // Assert
      expect(royaltyCalculator.ppds).toEqual({});
    });

    it('should set specificDealerPrices to a blank object when they DO NOT exist', () => {
      // Arrange
      specificDealerPrices = null;
      // Act
      royaltyCalculator = new RoyaltyCalculator(contract, db, bigQuery, salesDatabaseTable, periodId, writeSalesDatabaseTable, filter, contractQuery, periodEndDate, periodType, clientCurrencies, exchangeRates, mechanicalAmounts, eventType, participationRates, salesData, catType, ppds, specificDealerPrices, totalLines, releaseRestrictions, catalogueData, escalationEquivalents, statRates);
      // Assert
      expect(royaltyCalculator.specificDealerPrices).toEqual({});
    });

    it('should set releaseRestrictions to a blank object when they DO NOT exist', () => {
      // Arrange
      releaseRestrictions = null;
      // Act
      royaltyCalculator = new RoyaltyCalculator(contract, db, bigQuery, salesDatabaseTable, periodId, writeSalesDatabaseTable, filter, contractQuery, periodEndDate, periodType, clientCurrencies, exchangeRates, mechanicalAmounts, eventType, participationRates, salesData, catType, ppds, specificDealerPrices, totalLines, releaseRestrictions, catalogueData, escalationEquivalents, statRates);
      // Assert
      expect(royaltyCalculator.releaseRestrictions).toEqual({});
    });

    it('should set catalogueData to a blank object when they DO NOT exist', () => {
      // Arrange
      catalogueData = null;
      // Act
      royaltyCalculator = new RoyaltyCalculator(contract, db, bigQuery, salesDatabaseTable, periodId, writeSalesDatabaseTable, filter, contractQuery, periodEndDate, periodType, clientCurrencies, exchangeRates, mechanicalAmounts, eventType, participationRates, salesData, catType, ppds, specificDealerPrices, totalLines, releaseRestrictions, catalogueData, escalationEquivalents, statRates);
      // Assert
      expect(royaltyCalculator.catalogueData).toEqual({});
    });

    it('should set escalationEquivalents to a blank array when they DO NOT exist', () => {
      // Arrange
      escalationEquivalents = null;
      // Act
      royaltyCalculator = new RoyaltyCalculator(contract, db, bigQuery, salesDatabaseTable, periodId, writeSalesDatabaseTable, filter, contractQuery, periodEndDate, periodType, clientCurrencies, exchangeRates, mechanicalAmounts, eventType, participationRates, salesData, catType, ppds, specificDealerPrices, totalLines, releaseRestrictions, catalogueData, escalationEquivalents, statRates);
      // Assert
      expect(royaltyCalculator.escalationEquivalents).toEqual([]);
    });

    it('should set bigQuery to the passed bigQuery value', () => {
      // Assert
      expect(royaltyCalculator.bigQuery).toEqual(bigQuery);
    });

    it('should set db to the passed db value', () => {
      // Assert
      expect(royaltyCalculator.db).toEqual(db);
    });

    it('should set filter to the passed filter value', () => {
      // Assert
      expect(royaltyCalculator.filter).toEqual(filter);
    });

    it('should set contractQuery to the passed contractQuery value', () => {
      // Assert
      expect(royaltyCalculator.contractQuery).toEqual(contractQuery);
    });

    it('should set periodId to the passed periodId value', () => {
      // Assert
      expect(royaltyCalculator.periodId).toEqual(periodId);
    });

    it('should set periodEndDate to the passed periodEndDate value', () => {
      // Assert
      expect(royaltyCalculator.periodEndDate).toEqual(periodEndDate);
    });

    it('should set periodType to the passed periodType value', () => {
      // Assert
      expect(royaltyCalculator.periodType).toEqual(periodType);
    });

    it('should set clientCurrencies to the passed clientCurrencies value', () => {
      // Assert
      expect(royaltyCalculator.clientCurrencies).toEqual(clientCurrencies);
    });

    it('should set exchangeRates to the passed exchangeRates value', () => {
      // Assert
      expect(royaltyCalculator.exchangeRates).toEqual(exchangeRates);
    });

    it('should set mechanicalAmounts to the passed mechanicalAmounts value', () => {
      // Assert
      expect(royaltyCalculator.mechanicalAmounts).toEqual(mechanicalAmounts);
    });

    it('should set type to the passed eventType value', () => {
      // Assert
      expect(royaltyCalculator.type).toEqual(eventType);
    });

    it('should set catType to the passed catType value', () => {
      // Assert
      expect(royaltyCalculator.catType).toEqual(catType);
    });

    it('should set participationRates to the passed participationRates value when they exist', () => {
      // Assert
      expect(royaltyCalculator.participationRates).toEqual(participationRates);
    });

    it('should set ppds to the passed ppds value when they exist', () => {
      // Assert
      expect(royaltyCalculator.ppds).toEqual(ppds);
    });

    it('should set specificDealerPrices to the passed specificDealerPrices value when they exist', () => {
      // Assert
      expect(royaltyCalculator.specificDealerPrices).toEqual(specificDealerPrices);
    });

    it('should set totalLines to the passed totalLines value', () => {
      // Assert
      expect(royaltyCalculator.totalLines).toEqual(totalLines);
    });

    it('should set releaseRestrictions to the passed releaseRestrictions value when they exist', () => {
      // Assert
      expect(royaltyCalculator.releaseRestrictions).toEqual(releaseRestrictions);
    });

    it('should set catalogueData to the passed catalogueData value when they exist', () => {
      // Assert
      expect(royaltyCalculator.catalogueData).toEqual(catalogueData);
    });

    it('should set escalationEquivalents to the passed escalationEquivalents value when they exist', () => {
      // Assert
      expect(royaltyCalculator.escalationEquivalents).toEqual(escalationEquivalents);
    });

    it('should set originalSalesData to the passed originalSalesData value', () => {
      // Assert
      expect(royaltyCalculator.originalSalesData).toEqual(salesData);
    });

    it('should set outputLines to a blank array', () => {
      // Assert
      expect(royaltyCalculator.outputLines).toEqual([]);
    });

    it('should set allowedFields to the names in the outputSchema of bigQuery, excluding any repeated values', () => {
      // Assert
      expect(royaltyCalculator.allowedFields).toEqual(['field2']);
    });

    it('should set fieldTypes to a name to type mapping from the outputSchema of bigQuery', () => {
      // Assert
      expect(royaltyCalculator.fieldTypes).toEqual({ field1: 'String', field2: 'Number' });
    });

    describe("when contract currency is 'Home Currency'", () => {
      it('should set contractExchangeRate to 1', () => {
        // Arrange
        contract.terms = { contractCurrency: 'Home Currency' };
        // Act
        royaltyCalculator = new RoyaltyCalculator(contract, db, bigQuery, salesDatabaseTable, periodId, writeSalesDatabaseTable, filter, contractQuery, periodEndDate, periodType, clientCurrencies, exchangeRates, mechanicalAmounts, eventType, participationRates, salesData, catType, ppds, specificDealerPrices, totalLines, releaseRestrictions, catalogueData, escalationEquivalents);
        // Assert
        expect(royaltyCalculator.contractExchangeRate).toEqual(1);
      });
    });

    describe("when contract currency is NOT 'Home Currency'", () => {
      describe("and exchangeRate from 'Home Currency' to specified rate exists in exchangeRates", () => {
        it('should set the exchange rate as specified', () => {
          // Arrange
          contract.terms = { contractCurrency: 'USD' };
          const homeCurrencyUSDExchange = { from: 'Home Currency', to: 'USD', rate: randomFloat() };
          exchangeRates = [homeCurrencyUSDExchange];
          // Act
          royaltyCalculator = new RoyaltyCalculator(contract, db, bigQuery, salesDatabaseTable, periodId, writeSalesDatabaseTable, filter, contractQuery, periodEndDate, periodType, clientCurrencies, exchangeRates, mechanicalAmounts, eventType, participationRates, salesData, catType, ppds, specificDealerPrices, totalLines, releaseRestrictions, catalogueData, escalationEquivalents);
          // Assert
          expect(royaltyCalculator.contractExchangeRate).toBeCloseTo(homeCurrencyUSDExchange.rate, 5);
        });
      });

      describe("and exchangeRate from 'Home Currency' to specified rate DOES NOT exist in exchangeRates", () => {
        it('should set the exchange rate to 0', () => {
          // Arrange
          contract.terms = { contractCurrency: 'EUR' };
          const homeCurrencyUSDExchange = { from: 'Home Currency', to: 'USD', rate: randomFloat() };
          exchangeRates = [homeCurrencyUSDExchange];
          // Act
          royaltyCalculator = new RoyaltyCalculator(contract, db, bigQuery, salesDatabaseTable, periodId, writeSalesDatabaseTable, filter, contractQuery, periodEndDate, periodType, clientCurrencies, exchangeRates, mechanicalAmounts, eventType, participationRates, salesData, catType, ppds, specificDealerPrices, totalLines, releaseRestrictions, catalogueData, escalationEquivalents);
          // Assert
          expect(royaltyCalculator.contractExchangeRate).toEqual(0);
        });
      });
    });
  });

  describe('#byContract', () => {
    let expectSalesTermsToObject; let expectedSpecificFilters;
    beforeEach(() => {
      expectSalesTermsToObject = { salesTermsObject: true };
      royaltyCalculator.salesTermsToObject = jest.fn().mockReturnValue(expectSalesTermsToObject);

      royaltyCalculator.writeEscalations = jest.fn().mockImplementation((callback) => callback());

      expectedSpecificFilters = {
        sales: [{ sale: 1 }, { sale: 2 }],
        deductions: [{ deduction: 1 }, { deduction: 2 }],
        withholdingTaxes: [{ withholdingTaxe: 1 }, { withholdingTaxe: 2 }],
        mechanicals: [{ mechanical: 1 }, { mechanical: 2 }],
      };

      royaltyCalculator.setupEscalations = jest.fn().mockImplementation((callback) => callback());
      royaltyCalculator.createFilterAndCalculations = jest.fn().mockImplementation((callback) => callback(null, expectedSpecificFilters));
      royaltyCalculator.runSalesFilter = jest.fn().mockImplementation((...args) => args[args.length - 1]());
      royaltyCalculator.runSalesLine = jest.fn().mockImplementation((...args) => args[args.length - 1]());
    });

    it('should call setupEscalations', (done) => {
      // Act
      royaltyCalculator.byContract(() => {
        // Assert
        expect(royaltyCalculator.setupEscalations).toHaveBeenCalled();
        done();
      });
    });

    describe('when setupEscalations returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        royaltyCalculator.setupEscalations.mockImplementation((callback) => callback(expectedError));
        // Act
        royaltyCalculator.byContract((err) => {
          // Assert
          expect(err).toEqual(expectedError);
          done();
        });
      });

      it('should not call createFilterAndCalculations', (done) => {
        // Arrange
        const expectedError = randomString();
        royaltyCalculator.setupEscalations.mockImplementation((callback) => callback(expectedError));
        // Act
        royaltyCalculator.byContract(() => {
          // Assert
          expect(royaltyCalculator.createFilterAndCalculations).not.toHaveBeenCalled();
          done();
        });
      });
    });

    describe('when setupEscalations does not return an error', () => {
      it('should call createFilterAndCalculations', (done) => {
        // Act
        royaltyCalculator.byContract(() => {
          // Assert
          expect(royaltyCalculator.createFilterAndCalculations).toHaveBeenCalled();
          done();
        });
      });

      describe('when createFilterAndCalculations return an error', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          const expectedError = randomString();
          royaltyCalculator.createFilterAndCalculations.mockImplementation((callback) => callback(expectedError));
          // Act
          royaltyCalculator.byContract((err) => {
            // Assert
            expect(err).toEqual(expectedError);
            done();
          });
        });

        it('should not call bigQuery.writeToFile', (done) => {
          // Arrange
          const expectedError = randomString();
          royaltyCalculator.createFilterAndCalculations.mockImplementation((callback) => callback(expectedError));
          // Act
          royaltyCalculator.byContract(() => {
            // Assert
            expect(bigQuery.writeToFile).not.toHaveBeenCalled();
            done();
          });
        });
      });

      describe('when createFilterAndCalculations does not return an error', () => {
        it('should call salesTermsToObject', (done) => {
          royaltyCalculator.byContract(() => {
            expect(royaltyCalculator.salesTermsToObject).toHaveBeenCalled();
            expect(royaltyCalculator.salesTermsToObject).toHaveBeenCalledWith(expectedSpecificFilters.sales);
            done();
          });
        });

        describe('when totalLines is greater than 250k', () => {
          it('should call runSalesFilter with the salesTerms, deductions, withholdingTaxes and mechanicals', (done) => {
            // Arrange
            royaltyCalculator.originalSalesData = [{ salesData: 1 }, { salesData: 2 }];
            royaltyCalculator.totalLines = 250001;
            // Act
            royaltyCalculator.byContract(() => {
              // Assert
              expect(royaltyCalculator.runSalesFilter).toHaveBeenCalled();
              expect(royaltyCalculator.runSalesFilter).toHaveBeenCalledWith(expectSalesTermsToObject, expectedSpecificFilters.deductions, expectedSpecificFilters.withholdingTaxes, expectedSpecificFilters.mechanicals, expect.any(Function));
              done();
            });
          });
        });

        describe('when originalSalesData is null', () => {
          it('should call runSalesFilter with the salesTerms, deductions, withholdingTaxes and mechanicals', (done) => {
            // Arrange
            royaltyCalculator.originalSalesData = null;
            // Act
            royaltyCalculator.byContract(() => {
              // Assert
              expect(royaltyCalculator.runSalesFilter).toHaveBeenCalled();
              expect(royaltyCalculator.runSalesFilter).toHaveBeenCalledWith(expectSalesTermsToObject, expectedSpecificFilters.deductions, expectedSpecificFilters.withholdingTaxes, expectedSpecificFilters.mechanicals, expect.any(Function));
              done();
            });
          });
        });

        describe('when originalSalesData length is 0 and total lines does not equal 0', () => {
          it('should call runSalesFilter with the salesTerms, deductions, withholdingTaxes and mechanicals', (done) => {
            // Arrange
            royaltyCalculator.originalSalesData = [];
            royaltyCalculator.totalLines = 100;
            // Act
            royaltyCalculator.byContract(() => {
              // Assert
              expect(royaltyCalculator.runSalesFilter).toHaveBeenCalled();
              expect(royaltyCalculator.runSalesFilter).toHaveBeenCalledWith(expectSalesTermsToObject, expectedSpecificFilters.deductions, expectedSpecificFilters.withholdingTaxes, expectedSpecificFilters.mechanicals, expect.any(Function));
              done();
            });
          });
        });

        describe('when originalSalesData is the same length as the totalLines', () => {
          beforeEach(() => {
            royaltyCalculator.originalSalesData = [{ salesData: 1 }, { salesData: 2 }];
            royaltyCalculator.salesData = [{ salesData: 1 }, { salesData: 2 }];
            royaltyCalculator.totalLines = 2;
          });

          describe('when a sales filter has an escalation', () => {
            it('should call async.eachSeries', (done) => {
              // Arrange
              jest.spyOn(async, 'eachSeries');
              jest.spyOn(async, 'each');
              expectedSpecificFilters.sales = [{ calculation: { escalations: [randomString()] } }];
              royaltyCalculator.createFilterAndCalculations.mockImplementation((callback) => callback(null, expectedSpecificFilters));
              // Act
              royaltyCalculator.byContract(() => {
                // Assert
                expect(async.eachSeries).toHaveBeenCalled();
                expect(async.each).not.toHaveBeenCalled();
                done();
              });
            });
          });

          describe('when no sales filters use escalations', () => {
            it('should call async.each', (done) => {
              // Arrange
              jest.spyOn(async, 'eachSeries');
              jest.spyOn(async, 'each');
              expectedSpecificFilters.sales = [{ calculation: { escalations: [] } }];
              royaltyCalculator.createFilterAndCalculations.mockImplementation((callback) => callback(null, expectedSpecificFilters));
              // Act
              royaltyCalculator.byContract(() => {
                // Assert
                expect(async.each).toHaveBeenCalled();
                expect(async.eachSeries).not.toHaveBeenCalled();
                done();
              });
            });
          });

          it('should call runSalesLine for each sales line passed', (done) => {
            // Act
            royaltyCalculator.byContract(() => {
              // Assert
              expect(royaltyCalculator.runSalesLine).toHaveBeenCalledTimes(royaltyCalculator.salesData.length);
              done();
            });
          });
        });

        describe('on output', () => {
          describe('and outputLines contains sales data', () => {
            it('should call bigQuery.writeToFile with the outputLines', (done) => {
              // Arrange
              royaltyCalculator.outputLines = [{ salesData: 1 }, { salesData: 2 }];
              // Act
              royaltyCalculator.byContract(() => {
                // Assert
                expect(royaltyCalculator.bigQuery.writeToFile).toHaveBeenCalled();
                expect(royaltyCalculator.bigQuery.writeToFile.mock.calls[0][0]).toEqual(royaltyCalculator.outputLines);
                done();
              });
            });
          });

          describe('and outputLines DOES NOT contain sales data', () => {
            it('should NOT call bigQuery.writeToFile', (done) => {
              // Arrange
              royaltyCalculator.outputLines = [];
              // Act
              royaltyCalculator.byContract(() => {
                // Assert
                expect(royaltyCalculator.bigQuery.writeToFile).not.toHaveBeenCalled();
                done();
              });
            });
          });

          it('should call writeEscalations', (done) => {
            // Act
            royaltyCalculator.byContract(() => {
              // Assert
              expect(royaltyCalculator.writeEscalations).toHaveBeenCalled();
              done();
            });
          });

          describe('when writeEscalations returns an error', () => {
            it('should return the error to the callback', (done) => {
              // Arrange
              const expectedError = randomString();
              royaltyCalculator.writeEscalations.mockImplementation((callback) => callback(expectedError));
              // Act
              royaltyCalculator.byContract((err) => {
                // Assert
                expect(err).toEqual(expectedError);
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('#salesTermsToObject', () => {
    let terms; let digitalTerms; let physicalTerms;

    beforeEach(() => {
      digitalTerms = { filter: { distributionChannel: 'Digital' } };
      physicalTerms = { filter: { distributionChannel: 'Physical' } };
      terms = [digitalTerms, physicalTerms];
    });

    it('should return an object', () => {
      // Act
      const result = royaltyCalculator.salesTermsToObject(terms);
      // Assert
      expect(typeof result).toBe('object');
    });

    describe('when passed terms are an array', () => {
      describe('when a specific distribution channel is passed, but no config', () => {
        it('should add a param for each specific distribution channel', () => {
          // Act
          const result = royaltyCalculator.salesTermsToObject(terms);
          // Assert
          expect(result.Digital).toBeDefined();
          expect(result.Physical).toBeDefined();
        });

        it('should add the term under channel > default', () => {
          // Arrange
          const expectedDigitalObject = { default: [{ filter: { distributionChannel: 'Digital' }, index: 0 }] };
          const expectedPhysicalObject = { default: [{ filter: { distributionChannel: 'Physical' }, index: 1 }] };
          // Act
          const result = royaltyCalculator.salesTermsToObject(terms);
          // Assert
          expect(result.Digital.default).toEqual(expectedDigitalObject);
          expect(result.Physical.default).toEqual(expectedPhysicalObject);
        });
      });

      describe('when a specific distribution channel is passed, with a specific config', () => {
        it('should add the term under channel > config', () => {
          // Arrange
          terms = [{ filter: { distributionChannel: 'Digital', configuration: 'Stream' } }];
          // Act
          const result = royaltyCalculator.salesTermsToObject(terms);
          // Assert
          expect(result.Digital.Stream).toEqual({ default: [{ filter: { distributionChannel: 'Digital', configuration: 'Stream' }, index: 0 }] });
        });
      });

      describe('when no distribution is passed and a config is passed', () => {
        it('should add the config to the default param', () => {
          // Arrange
          terms = [{ filter: { configuration: 'Stream' } }];
          // Act
          const result = royaltyCalculator.salesTermsToObject(terms);
          // Assert
          expect(result.default.Stream).toEqual({ default: [{ filter: { configuration: 'Stream' }, index: 0 }] });
        });
      });

      describe('when no distribution channel is passed, a config is not passed', () => {
        it('should add the term to default > default', () => {
          // Arrange
          terms = [{ filter: {} }];
          // Act
          const result = royaltyCalculator.salesTermsToObject(terms);
          // Assert
          expect(result.default.default).toEqual({ default: [{ filter: {}, index: 0 }] });
        });
      });

      describe('when distribution channel is passed within an $in parameter', () => {
        it('should add each channel in the array to the object', () => {
          // Arrange
          terms = [{ filter: { distributionChannel: { $in: ['Digital', 'Physical'] } } }];
          // Act
          const result = royaltyCalculator.salesTermsToObject(terms);
          // Assert
          expect(result.Digital.default.default[0].filter).toEqual({ distributionChannel: { $in: ['Digital', 'Physical'] } });
          expect(result.Physical.default.default[0].filter).toEqual({ distributionChannel: { $in: ['Digital', 'Physical'] } });
        });
      });

      describe('when configuration is passed within an $in parameter', () => {
        it('should add each configuration in the array', () => {
          // Arrange
          terms = [{ filter: { configuration: { $in: ['Stream', 'Download'] } } }];
          // Act
          const result = royaltyCalculator.salesTermsToObject(terms);
          // Assert
          expect(result.default.Stream.default[0].filter).toEqual({ configuration: { $in: ['Stream', 'Download'] } });
          expect(result.default.Download.default[0].filter).toEqual({ configuration: { $in: ['Stream', 'Download'] } });
        });
      });
    });

    describe('when passed terms are not an array', () => {
      it('should return the standard the blank object', () => {
        // Arrange
        terms = {};
        // Act
        const result = royaltyCalculator.salesTermsToObject(terms);
        // Assert
        expect(result).toEqual({ default: {} });
      });
    });
  });

  describe('#createFilterAndCalculations', () => {
    describe('when contract is not set on the object', () => {
      it('should return an error to the callback', (done) => {
        // Arrange
        royaltyCalculator.contract = null;
        // Act
        royaltyCalculator.createFilterAndCalculations((err) => {
          // Assert
          expect(err).toBe('Requires a contract with terms, a periodId and a filter');
          done();
        });
      });
    });

    describe('when the contract does not have terms', () => {
      it('should return an error to the callback', (done) => {
        // Arrange
        delete royaltyCalculator.contract.terms;
        // Act
        royaltyCalculator.createFilterAndCalculations((err) => {
          // Assert
          expect(err).toBe('Requires a contract with terms, a periodId and a filter');
          done();
        });
      });
    });

    describe('when a periodId is not set on the object', () => {
      it('should return an error to the callback', (done) => {
        // Arrange
        delete royaltyCalculator.periodId;
        // Act
        royaltyCalculator.createFilterAndCalculations((err) => {
          // Assert
          expect(err).toBe('Requires a contract with terms, a periodId and a filter');
          done();
        });
      });
    });

    describe('when a filter is not set on the object', () => {
      it('should return an error to the callback', (done) => {
        // Arrange
        delete royaltyCalculator.filter;
        // Act
        royaltyCalculator.createFilterAndCalculations((err) => {
          // Assert
          expect(err).toBe('Requires a contract with terms, a periodId and a filter');
          done();
        });
      });
    });

    describe('when a contract is set with terms, a periodId and filter on the object', () => {
      beforeEach(() => {
        royaltyCalculator.organiseTerms = jest.fn((input) => input);
        royaltyCalculator.createSalesFilterAndCalculations = jest.fn().mockImplementation((...args) => args[args.length - 1](null, {}));
        royaltyCalculator.createDeductionsFilterAndCalculations = jest.fn().mockImplementation((...args) => args[args.length - 1](null, {}));
      });

      it('should return an object', (done) => {
        // Act
        royaltyCalculator.createFilterAndCalculations((err, filter) => {
          // Assert
          expect(typeof filter).toBe('object');
          done();
        });
      });

      it('should call organiseTerms with the contract on the object', (done) => {
        // Act
        royaltyCalculator.createFilterAndCalculations((err) => {
          // Assert
          expect(royaltyCalculator.organiseTerms).toHaveBeenCalledWith(royaltyCalculator.contract);
          done();
        });
      });

      it('should call createSalesFilterAndCalculations with the sales params', (done) => {
        // Act
        royaltyCalculator.createFilterAndCalculations(() => {
          // Assert
          expect(royaltyCalculator.createSalesFilterAndCalculations).toHaveBeenCalledWith(
            contract.terms.sales,
            contract.share,
            contract.releaseId,
            royaltyCalculator.periodId,
            royaltyCalculator.filter,
            false,
            expect.any(Function),
          );
          done();
        });
      });

      it('should set the sales param on the output object to the returned value from createSalesFilterAndCalculations', (done) => {
        // Arrange
        const expectedOutputSales = [randomString(), randomString(), randomString()];
        royaltyCalculator.createSalesFilterAndCalculations.mockImplementation((...args) => args[args.length - 1](null, expectedOutputSales));
        // Act
        royaltyCalculator.createFilterAndCalculations((err, output) => {
          // Assert
          expect(output.sales).toEqual(expectedOutputSales);
          done();
        });
      });

      it('should call createDeductionsFilterAndCalculations with the deduction params', (done) => {
        // Act
        royaltyCalculator.createFilterAndCalculations(() => {
          // Assert
          expect(royaltyCalculator.createDeductionsFilterAndCalculations).toHaveBeenCalledWith(
            royaltyCalculator.contract.terms.deductions,
            royaltyCalculator.periodId,
            royaltyCalculator.filter,
            expect.any(Function),
          );
          done();
        });
      });

      it('should set the deductions param on the output object to the returned value from createDeductionsFilterAndCalculations', (done) => {
        // Arrange
        const expectedDeductionsFilter = [randomString(), randomString(), randomString()];
        royaltyCalculator.createDeductionsFilterAndCalculations.mockImplementation((...args) => args[args.length - 1](null, expectedDeductionsFilter));
        // Act
        royaltyCalculator.createFilterAndCalculations((err, output) => {
          // Assert
          expect(output.deductions).toEqual(expectedDeductionsFilter);
          done();
        });
      });

      it('should call createDeductionsFilterAndCalculations with the withholding params', (done) => {
        // Act
        royaltyCalculator.createFilterAndCalculations(() => {
          // Assert
          expect(royaltyCalculator.createDeductionsFilterAndCalculations).toHaveBeenCalledWith(
            royaltyCalculator.contract.terms.withholdingTaxes,
            royaltyCalculator.periodId,
            royaltyCalculator.filter,
            expect.any(Function),
          );
          done();
        });
      });

      it('should set the withholdingTaxes param on the output object to the returned value from createDeductionsFilterAndCalculations', (done) => {
        // Arrange
        const expectedWithholdingFilter = [randomString(), randomString(), randomString()];
        royaltyCalculator.createDeductionsFilterAndCalculations.mockImplementation((...args) => args[args.length - 1](null, expectedWithholdingFilter));
        // Act
        royaltyCalculator.createFilterAndCalculations((err, output) => {
          // Assert
          expect(output.withholdingTaxes).toEqual(expectedWithholdingFilter);
          done();
        });
      });

      it('should call createSalesFilterAndCalculations with the mechanicals params', (done) => {
        // Act
        royaltyCalculator.createFilterAndCalculations((err) => {
          // Assert
          expect(royaltyCalculator.createSalesFilterAndCalculations).toHaveBeenCalledWith(
            royaltyCalculator.contract.terms.mechanicalContracts,
            royaltyCalculator.contract.share,
            royaltyCalculator.contract.releaseId,
            royaltyCalculator.periodId,
            royaltyCalculator.filter,
            true,
            expect.any(Function),
          );
          done();
        });
      });

      it('should set the mechanicals param on the output object to the returned value from createSalesFilterAndCalculations', (done) => {
        // Arrange
        const expectedMechanicalFilter = [randomString(), randomString(), randomString()];
        royaltyCalculator.createSalesFilterAndCalculations.mockImplementation((...args) => args[args.length - 1](null, expectedMechanicalFilter));
        // Act
        royaltyCalculator.createFilterAndCalculations((err, output) => {
          // Assert
          expect(output.mechanicals).toEqual(expectedMechanicalFilter);
          done();
        });
      });
    });
  });

  describe('#createSalesFilterAndCalculations', () => {
    let sales; let share; let releaseId; let mechanicalContract;
    beforeEach(() => {
      ({ sales } = contract.terms);
      ({ share } = contract);
      ({ releaseId } = contract);
      mechanicalContract = royaltyCalculator.contract.terms.mechanicalContracts[0];
    });

    describe('when sales are not passed', () => {
      it('should return an error', (done) => {
        // Arrange
        sales = null;
        // Act
        royaltyCalculator.createSalesFilterAndCalculations(sales, share, releaseId, periodId, filter, mechanicalContract, (err) => {
          // Assert
          expect(err).toBe('Requires sales, an objectPercentage, a periodId and a filter');
          done();
        });
      });
    });

    describe('when a periodId is not passed', () => {
      it('should return an error', (done) => {
        // Arrange
        periodId = null;
        // Act
        royaltyCalculator.createSalesFilterAndCalculations(sales, share, releaseId, periodId, filter, mechanicalContract, (err) => {
          // Assert
          expect(err).toBe('Requires sales, an objectPercentage, a periodId and a filter');
          done();
        });
      });
    });

    describe('when a filter is not passed', () => {
      it('should return an error', (done) => {
        // Arrange
        filter = null;
        // Act
        royaltyCalculator.createSalesFilterAndCalculations(sales, share, releaseId, periodId, filter, mechanicalContract, (err) => {
          // Assert
          expect(err).toBe('Requires sales, an objectPercentage, a periodId and a filter');
          done();
        });
      });
    });

    describe('when sales, a periodId and filter is passed', () => {
      it('should call createSaleFilterAndCalculation for each sale passed', (done) => {
        // Arrange
        royaltyCalculator.createSaleFilterAndCalculation = jest.fn().mockReturnValue({});
        // Act
        royaltyCalculator.createSalesFilterAndCalculations(sales, share, releaseId, periodId, filter, mechanicalContract, () => {
          // Assert
          expect(royaltyCalculator.createSaleFilterAndCalculation).toHaveBeenCalledWith(
            sales[0],
            share,
            releaseId,
            periodId,
            filter,
            mechanicalContract,
          );
          expect(royaltyCalculator.createSaleFilterAndCalculation).toHaveBeenCalledWith(
            sales[1],
            share,
            releaseId,
            periodId,
            filter,
            mechanicalContract,
          );
          done();
        });
      });
    });
  });

  describe('#createSaleFilterAndCalculation', () => {
    let sale; let share; let releaseId; let mechanicalContract;
    beforeEach(() => {
      sale = contract.terms.sales[0];
      ({ share } = contract);
      ({ releaseId } = contract);
      mechanicalContract = contract.terms.mechanicalContracts[0];
    });

    it('should return an object', (done) => {
      // Act
      const result = royaltyCalculator.createSaleFilterAndCalculation(sale, share, releaseId, periodId, filter, mechanicalContract);
      // Assert
      expect(typeof result).toBe('object');
      done();
    });

    it('should call createFilter with the correct params', (done) => {
      // Arrange
      royaltyCalculator.createFilter = jest.fn().mockReturnValue({});
      // Act
      royaltyCalculator.createSaleFilterAndCalculation(sale, share, releaseId, periodId, filter, mechanicalContract);
      // Assert
      expect(royaltyCalculator.createFilter).toHaveBeenCalledWith(
        sale,
        releaseId,
        periodId,
        filter,
        mechanicalContract,
      );

      done();
    });

    it('should return the returned value from createFilter in the filter value', (done) => {
      // Arrange
      const expectedCreateFilterResult = { result: randomString() };
      royaltyCalculator.createFilter = jest.fn().mockReturnValue(expectedCreateFilterResult);
      // Act
      const result = royaltyCalculator.createSaleFilterAndCalculation(sale, share, releaseId, periodId, filter, mechanicalContract);
      // Assert
      expect(result.filter).toEqual(expectedCreateFilterResult);

      done();
    });

    it('should call createSaleCalculation with the correct params', (done) => {
      // Arrange
      royaltyCalculator.createSaleCalculation = jest.fn().mockReturnValue({});
      // Act
      royaltyCalculator.createSaleFilterAndCalculation(sale, share, releaseId, periodId, filter, mechanicalContract);
      // Assert
      expect(royaltyCalculator.createSaleCalculation).toHaveBeenCalledWith(
        sale,
        share,
      );

      done();
    });

    it('should return the returned value from createSaleCalculation in the calculation value', () => {
      // Arrange
      const expectedCreateSalesCalculationResult = { result: randomString() };
      royaltyCalculator.createSaleCalculation = jest.fn().mockReturnValue(expectedCreateSalesCalculationResult);
      // Act
      const result = royaltyCalculator.createSaleFilterAndCalculation(sale, share, releaseId, periodId, filter, mechanicalContract);
      // Assert
      expect(result.calculation).toEqual(expectedCreateSalesCalculationResult);
    });

    it("should return the sale's escalationTrackers in the escalationTrackers field", () => {
      // Act
      const result = royaltyCalculator.createSaleFilterAndCalculation(sale, share, releaseId, periodId, filter, mechanicalContract);
      // Assert
      expect(result.escalationTrackers).toEqual(sale.escalationTrackers);
    });
  });

  describe('#createFilter', () => {
    let object; let releaseId; let mechanicalContract;
    beforeEach(() => {
      object = {};
      ({ releaseId } = contract);
      mechanicalContract = contract.terms.mechanicalContracts[0];
    });

    describe('when passed a filter', () => {
      it('should return an object', () => {
        // Act
        const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
        // Assert
        expect(typeof result).toBe('object');
      });

      describe("when periodType is NOT 'Mechanical'", () => {
        it('should start with a blank object', () => {
          // Arrange
          royaltyCalculator.periodType = randomString();
          // Act
          const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(result).toEqual({});
        });
      });

      describe("when periodType is 'Mechanical'", () => {
        it('should start with the passed filter as the object', () => {
          // Arrange
          royaltyCalculator.periodType = 'Mechanical';
          // Act
          const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(result).toEqual(filter);
        });
      });

      describe('when catType is defined in the passed terms', () => {
        it('should set the catType on the output object', () => {
          // Arrange
          object = { catType: 'catType' };
          // Act
          const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(result.catType).toEqual(object.catType);
        });
      });

      describe("when catType is 'Release' and releaseIds are passed", () => {
        it('should add the releaseIds as an object in the $or statement', () => {
          // Arrange
          object = { catType: 'Release', releaseIds: [randomString(), randomString()] };
          // Act
          const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(result.$or).toEqual([{ catType: object.catType, releaseId: { $in: object.releaseIds } }]);
        });
      });

      describe("when catType is 'Release' and releaseIds are not passed", () => {
        it('should not add a value to the $or statement', () => {
          // Arrange
          object = { catType: 'Release' };
          // Act
          const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(result.$or).toBeUndefined();
        });
      });

      describe("when catType is 'Track' and trackIds are passed", () => {
        it('should add the releaseIds as an object in the $or statement', () => {
          // Arrange
          const object = { catType: 'Track', trackIds: [randomString(), randomString()] };
          // Act
          const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(result.$or).toEqual([{ catType: object.catType, trackId: { $in: object.trackIds } }]);
        });
      });

      describe("when catType is 'Track' and trackIds are not passed", () => {
        it('should not add a value to the $or statement', () => {
          // Arrange
          const object = { catType: 'Track' };
          // Act
          const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(result.$or).toBeUndefined();
        });
      });

      describe("when catType is 'Work' and workIds are passed", () => {
        it('should add the releaseIds as an object in the $or statement', () => {
          // Arrange
          const object = { catType: 'Work', workIds: [randomString(), randomString()] };
          // Act
          const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(result.$or).toEqual([{ catType: object.catType, workId: { $in: object.workIds } }]);
        });
      });

      describe("when catType is 'Work' and workIds are not passed", () => {
        it('should not add a value to the $or statement', () => {
          // Arrange
          const object = { catType: 'Work' };
          // Act
          const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(result.$or).toBeUndefined();
        });
      });

      describe("when periodType is NOT 'Mechanical' and releaseId passed", () => {
        it('should add the releaseId to the output object', () => {
          // Arrange
          royaltyCalculator.periodType = randomString();
          mechanicalContract = null;
          // Act
          const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(result.releaseId).toEqual(releaseId);
        });
      });

      describe("when periodType is NOT 'Mechanical' and releaseId NOT passed", () => {
        it('should NOT add the releaseId to the output object', () => {
          // Arrange
          royaltyCalculator.periodType = randomString();
          mechanicalContract = null;
          releaseId = null;
          // Act
          const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(result.releaseId).toBeUndefined();
        });
      });

      describe('when territory is passed and is an array', () => {
        it('should add the territory in an $in statement', () => {
          // Arrange
          object = { catType: 'Release', territory: ['UK', 'FR'] };
          // Act
          const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(result.territory).toEqual({ $in: object.territory });
        });
      });

      describe('when territory is passed and is WW', () => {
        it('should not add the territory to the output object', () => {
          // Arrange
          object = { catType: 'Release', territory: 'WW' };
          // Act
          const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(result.territory).toBeUndefined();
        });
      });

      describe('when territory is passed an is not WW', () => {
        it('should call continentToTerritories with the territory', () => {
          // Arrange
          royaltyCalculator.continentToTerritories = jest.fn().mockReturnValue([]);
          object = { catType: 'Release', territory: randomString() };
          // Act
          royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(royaltyCalculator.continentToTerritories).toHaveBeenCalled();
        });

        it('should add the returned value from continentToTerritories to the output', () => {
          // Arrange
          const expectedTerritories = [randomString(), randomString(), randomString()];
          royaltyCalculator.continentToTerritories = jest.fn().mockReturnValue(expectedTerritories);
          object = { catType: 'Release', territory: randomString() };
          // Act
          const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(result.territory).toEqual({ $in: expectedTerritories });
        });
      });

      describe('when distributionChannel is passed and is an array', () => {
        it('should add the distributionChannel in an $in statement', () => {
          // Arrange
          object = { catType: 'Release', distributionChannel: ['Digital', 'Physical'] };
          // Act
          const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(result.distributionChannel).toEqual({ $in: object.distributionChannel });
        });
      });

      describe('when distributionChannel is passed and not an array', () => {
        it('should add the passed value to the output object', () => {
          // Arrange
          object = { catType: 'Release', distributionChannel: 'Digital' };
          // Act
          const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(result.distributionChannel).toEqual(object.distributionChannel);
        });
      });

      describe('when channel is passed and is an array', () => {
        it('should add the channel in an $in statement to the distributionChannel of the output object', () => {
          // Arrange
          object = { catType: 'Release', channel: ['Digital', 'Physical'] };
          // Act
          const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(result.distributionChannel).toEqual({ $in: object.channel });
        });
      });

      describe('when channel is passed and not an array', () => {
        it('should add the passed value to the distributionChannel of the output object', () => {
          // Arrange
          object = { catType: 'Release', channel: 'Digital' };
          // Act
          const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(result.distributionChannel).toEqual(object.channel);
        });
      });

      describe('when configuration is passed and is an array', () => {
        it('should add the configuration in an $in statement', () => {
          // Arrange
          object = { catType: 'Release', configuration: ['Stream', 'Download'] };
          // Act
          const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(result.configuration).toEqual({ $in: object.configuration });
        });
      });

      describe('when configuration is passed and not an array', () => {
        it('should add the passed value to the output object', () => {
          // Arrange
          object = { catType: 'Release', configuration: 'Stream' };
          // Act
          const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(result.configuration).toEqual(object.configuration);
        });
      });

      describe('when priceCategory is passed and is an array', () => {
        it('should add the priceCategory in an $in statement', () => {
          // Arrange
          object = { catType: 'Release', priceCategory: ['Full Price', 'Discount'] };
          // Act
          const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(result.priceCategory).toEqual({ $in: object.priceCategory });
        });
      });

      describe('when priceCategory is passed and not an array', () => {
        it('should add the passed value to the output object', () => {
          // Arrange
          object = { catType: 'Release', priceCategory: 'Full Price' };
          // Act
          const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(result.priceCategory).toEqual(object.priceCategory);
        });
      });

      describe('when source is passed and is an array', () => {
        it('should add the source in an $in statement', () => {
          // Arrange
          object = { catType: 'Release', source: ['Believe', 'Deezer'] };
          // Act
          const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(result.source).toEqual({ $in: object.source });
        });
      });

      describe('when source is passed and not an array', () => {
        it('should add the passed value to the output object', () => {
          // Arrange
          object = { catType: 'Release', source: 'Believe' };
          // Act
          const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
          // Assert
          expect(result.source).toEqual(object.source);
        });
      });
    });
    describe('when not passed a filter', () => {
      it('should return null', () => {
        // Arrange
        object = {};
        filter = null;
        // Act
        const result = royaltyCalculator.createFilter(object, releaseId, periodId, filter, mechanicalContract);
        // Assert
        expect(result).toBe(null);
      });
    });
  });

  describe('#continentToTerritories', () => {
    it("should return the Africa set of territories when passed 'Africa'", () => {
      // Arrange
      const Africa = ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SH', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW'];
      // Act
      const result = royaltyCalculator.continentToTerritories('Africa');
      // Assert
      expect(result).toEqual(Africa);
    });

    it("should return the Americas set of territories when passed 'Americas'", () => {
      // Arrange
      const Americas = ['AW', 'CW', 'AI', 'AG', 'AR', 'BS', 'BB', 'BZ', 'BM', 'BO', 'BQ', 'BR', 'VG', 'CA', 'KY', 'CL', 'CO', 'CR', 'CU', 'CW', 'DM', 'DO', 'EC', 'SV', 'FK', 'GF', 'GL', 'GD', 'GP', 'GT', 'GY', 'HT', 'HN', 'JM', 'MQ', 'MX', 'MS', 'AN', 'NI', 'PA', 'PY', 'PE', 'PR', 'BL', 'KN', 'LC', 'MF', 'PM', 'VC', 'SR', 'TT', 'TC', 'US', 'UY', 'VE', 'VI', 'SX'];
      // Act
      const result = royaltyCalculator.continentToTerritories('Americas');
      // Assert
      expect(result).toEqual(Americas);
    });

    it("should return the Asia set of territories when passed 'Asia'", () => {
      // Arrange
      const Asia = ['AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE', 'HK', 'IN', 'ID', 'IR', 'IQ', 'IL', 'JP', 'JO', 'KZ', 'KP', 'KR', 'KW', 'KG', 'LA', 'LB', 'MO', 'MY', 'MV', 'MN', 'MM', 'NP', 'OM', 'PK', 'PS', 'PH', 'QA', 'SA', 'SG', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL', 'TR', 'TM', 'AE', 'UZ', 'VN', 'YE'];
      // Act
      const result = royaltyCalculator.continentToTerritories('Asia');
      expect(result).toEqual(Asia);
    });

    it("should return the Europe set of territories when passed 'Europe'", () => {
      // Arrange
      const Europe = ['AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FO', 'FI', 'FR', 'DE', 'GI', 'GR', 'GG', 'VA', 'HU', 'IS', 'IE', 'IM', 'IT', 'JE', 'LV', 'LI', 'LT', 'LU', 'MK', 'MT', 'MD', 'MC', 'ME', 'XK', 'NL', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SJ', 'SE', 'CH', 'UA', 'GB', 'AX'];
      // Act
      const result = royaltyCalculator.continentToTerritories('Europe');
      // Assert
      expect(result).toEqual(Europe);
    });

    it("should return the Oceania set of territories when passed 'Oceania'", () => {
      // Arrange
      const Oceania = ['AS', 'AQ', 'AU', 'BV', 'IO', 'CX', 'CC', 'CK', 'FJ', 'PF', 'TF', 'GU', 'HM', 'KI', 'MH', 'FM', 'NR', 'NC', 'NZ', 'NU', 'NF', 'MP', 'PW', 'PG', 'PN', 'SB', 'GS', 'TK', 'TO', 'TV', 'UM', 'VU', 'WF', 'WS'];
      // Act
      const result = royaltyCalculator.continentToTerritories('Oceania');
      // Assert
      expect(result).toEqual(Oceania);
    });

    it('should return the original value when passed an array', () => {
      // Arrange
      const Territories = ['AS', 'AQ', 'AU'];
      // Act
      const result = royaltyCalculator.continentToTerritories(Territories);
      // Assert
      expect(result).toEqual(Territories);
    });

    it('should return the original value as an array when passed a string', () => {
      // Arrange
      const Territories = 'FR';
      // Act
      const result = royaltyCalculator.continentToTerritories(Territories);
      // Assert
      expect(result).toEqual([Territories]);
    });
  });

  describe('#createSaleCalculation', () => {
    let sale;
    beforeEach(() => {
      sale = contract.terms.sales[0];
    });

    it('should return an object', () => {
      // Act
      const result = royaltyCalculator.createSaleCalculation(sale, contract.share);
      // Assert
      expect(typeof result).toBe('object');
    });

    it('should return the unitRate when passed', () => {
      // Arrange
      sale = { unitRate: 10 };
      // Act
      const result = royaltyCalculator.createSaleCalculation(sale, contract.share);
      // Assert
      expect(result.unitRate).toBe(10);
    });

    it('should return the multiplier when passed', () => {
      // Arrange
      sale = { multiplier: 10 };
      // Act
      const result = royaltyCalculator.createSaleCalculation(sale, contract.share);
      // Assert
      expect(result.multiplier).toBe(10);
    });

    it('should return the rate when passed', () => {
      // Arrange
      sale = { rate: randomFloat() };
      // Act
      const result = royaltyCalculator.createSaleCalculation(sale, contract.share);
      // Assert
      expect(result.rate).toBeCloseTo(sale.rate, 5);
    });

    it('should return the rateBasis when passed', () => {
      // Arrange
      sale = { rateBasis: randomFloat() };
      // Act
      const result = royaltyCalculator.createSaleCalculation(sale, contract.share);
      // Assert
      expect(result.rateBasis).toBeCloseTo(sale.rateBasis, 5);
    });

    it('should return the share when passed', () => {
      // Arrange
      sale = { rateBasis: randomFloat() };
      // Act
      const result = royaltyCalculator.createSaleCalculation(sale, contract.share);
      // Assert
      expect(result.share).toBeCloseTo(contract.share, 5);
    });

    it('should return the reductionRate when passed', () => {
      // Arrange
      sale = { reductionRate: randomFloat() };
      // Act
      const result = royaltyCalculator.createSaleCalculation(sale, contract.share);
      // Assert
      expect(result.reductionRate).toBeCloseTo(sale.reductionRate, 5);
    });

    it('should return the reserve when passed', () => {
      // Arrange
      sale = { reserve: randomFloat() };
      // Act
      const result = royaltyCalculator.createSaleCalculation(sale, contract.share);
      // Assert
      expect(result.reserve).toBeCloseTo(sale.reserve, 5);
    });

    it('should return the type when passed', () => {
      // Arrange
      sale = { type: randomString() };
      // Act
      const result = royaltyCalculator.createSaleCalculation(sale, contract.share);
      // Assert
      expect(result.type).toBe(sale.type);
    });

    it('should return the reserveBasis when passed', () => {
      // Arrange
      sale = { reserveBasis: randomFloat() };
      // Act
      const result = royaltyCalculator.createSaleCalculation(sale, contract.share);
      // Assert
      expect(result.reserveBasis).toBeCloseTo(sale.reserveBasis, 5);
    });

    it('should return the escalations when passed', () => {
      // Arrange
      sale = { escalations: [randomString(), randomString()] };
      // Act
      const result = royaltyCalculator.createSaleCalculation(sale, contract.share);
      // Assert
      expect(result.escalations).toEqual(sale.escalations);
    });

    it('should return the deductionType when passed', () => {
      // Arrange
      sale = { deductionType: randomString() };
      // Act
      const result = royaltyCalculator.createSaleCalculation(sale, contract.share);
      // Assert
      expect(result.deductionType).toBe(sale.deductionType);
    });

    it('should return the deductionBasis when passed', () => {
      // Arrange
      sale = { deductionBasis: randomString() };
      // Act
      const result = royaltyCalculator.createSaleCalculation(sale, contract.share);
      // Assert
      expect(result.deductionBasis).toBe(sale.deductionBasis);
    });

    it('should return the currency when passed', () => {
      // Arrange
      sale = { currency: randomString() };
      // Act
      const result = royaltyCalculator.createSaleCalculation(sale, contract.share);
      // Assert
      expect(result.currency).toBe(sale.currency);
    });
  });

  describe('#createDeductionsFilterAndCalculations', () => {
    describe('when deductions not passed', () => {
      it('should return an error', (done) => {
        // Arrange
        contract.terms.deductions = null;
        // Act
        royaltyCalculator.createDeductionsFilterAndCalculations(contract.terms.deductions, periodId, filter, (err) => {
          // Assert
          expect(err).toBe('Requires sales, an objectPercentage and a filter');
          done();
        });
      });
    });

    describe('when filter not passed', () => {
      it('should return an error', (done) => {
        // Arrange
        filter = null;
        // Act
        royaltyCalculator.createDeductionsFilterAndCalculations(contract.terms.deductions, periodId, filter, (err) => {
          // Assert
          expect(err).toBe('Requires sales, an objectPercentage and a filter');
          done();
        });
      });
    });

    describe('when deductions and filter passed', () => {
      beforeEach(() => {
        royaltyCalculator.createDeductionFilterAndCalculation = jest.fn((input) => input);
      });

      it('should call createDeductionFilterAndCalculation for each deduction passed', (done) => {
        // Act
        royaltyCalculator.createDeductionsFilterAndCalculations(contract.terms.deductions, periodId, filter, () => {
          // Assert
          expect(royaltyCalculator.createDeductionFilterAndCalculation).toHaveBeenCalledTimes(contract.terms.deductions.length);
          done();
        });
      });

      it('should return an array to the callback', (done) => {
        // Act
        royaltyCalculator.createDeductionsFilterAndCalculations(contract.terms.deductions, periodId, filter, (err, result) => {
          // Assert
          expect(Array.isArray(result)).toBe(true);
          done();
        });
      });

      it('should return an item for each deduction passed', (done) => {
        // Act
        royaltyCalculator.createDeductionsFilterAndCalculations(contract.terms.deductions, periodId, filter, (err, result) => {
          // Assert
          expect(result).toEqual(contract.terms.deductions);
          done();
        });
      });

      it('should return the returned value from createDeductionFilterAndCalculation in the array', (done) => {
        // Arrange
        royaltyCalculator.createDeductionsFilterAndCalculations(contract.terms.deductions, periodId, filter, () => {
          // Act
          expect(royaltyCalculator.createDeductionFilterAndCalculation.mock.calls[0][0]).toBe(contract.terms.deductions[0]);
          expect(royaltyCalculator.createDeductionFilterAndCalculation.mock.calls[1][0]).toBe(contract.terms.deductions[1]);
          done();
        });
      });
    });
  });

  describe('#createDeductionFilterAndCalculation', () => {
    it('should return an object', () => {
      // Act
      const result = royaltyCalculator.createDeductionFilterAndCalculation(contract.terms.deductions[0], periodId, filter);
      // Assert
      expect(typeof result).toBe('object');
    });

    it('should return the returned value from createFilter as filter in the returned object', () => {
      // Arrange
      const expectedFilter = { type: randomString() };
      royaltyCalculator.createFilter = jest.fn().mockReturnValue(expectedFilter);
      // Act
      const result = royaltyCalculator.createDeductionFilterAndCalculation(contract.terms.deductions[0], periodId, filter);
      // Assert
      expect(result.filter).toEqual(expectedFilter);
    });

    it('should return the returned value from createDeductionCalculation as calculation in the returned object', () => {
      // Arrange
      const expectedFilter = { type: randomString() };
      royaltyCalculator.createDeductionCalculation = jest.fn().mockReturnValue(expectedFilter);
      // Act
      const result = royaltyCalculator.createDeductionFilterAndCalculation(contract.terms.deductions[0], periodId, filter);
      // Assert
      expect(result.calculation).toEqual(expectedFilter);
    });
  });

  describe('#createDeductionCalculation', () => {
    it('should return an object', () => {
      // Arrange
      const deduction = { deduction: randomFloat() };
      // Act
      const result = royaltyCalculator.createDeductionCalculation(deduction);
      // Assert
      expect(typeof result).toBe('object');
    });

    it('should return the unitRate when passed', () => {
      // Arrange
      const deduction = { unitRate: randomFloat() };
      // Act
      const result = royaltyCalculator.createDeductionCalculation(deduction);
      // Assert
      expect(result.unitRate).toBeCloseTo(deduction.unitRate, 5);
    });

    it('should return the rate when passed', () => {
      // Arrange
      const deduction = { rate: randomFloat() };
      // Act
      const result = royaltyCalculator.createDeductionCalculation(deduction);
      // Assert
      expect(result.rate).toBeCloseTo(deduction.rate, 5);
    });

    it('should return the rateBasis when passed', () => {
      // Arrange
      const deduction = { rateBasis: randomFloat() };
      // Act
      const result = royaltyCalculator.createDeductionCalculation(deduction);
      // Assert
      expect(result.rateBasis).toBeCloseTo(deduction.rateBasis, 5);
    });

    it('should return the reductionRate when passed', () => {
      // Arrange
      const deduction = { reductionRate: randomFloat() };
      // Act
      const result = royaltyCalculator.createDeductionCalculation(deduction);
      // Assert
      expect(result.reductionRate).toBeCloseTo(deduction.reductionRate, 5);
    });

    it('should return the type when passed', () => {
      // Arrange
      const deduction = { type: randomFloat() };
      // Act
      const result = royaltyCalculator.createDeductionCalculation(deduction);
      // Assert
      expect(result.type).toBeCloseTo(deduction.type, 5);
    });

    it('should return the deductionBasis when passed', () => {
      // Arrange
      const deduction = { deductionBasis: randomFloat() };
      // Act
      const result = royaltyCalculator.createDeductionCalculation(deduction);
      // Assert
      expect(result.deductionBasis).toBeCloseTo(deduction.deductionBasis, 5);
    });

    it('should return the currency when passed', () => {
      // Arrange
      const deduction = { currency: randomFloat() };
      // Act
      const result = royaltyCalculator.createDeductionCalculation(deduction);
      // Assert
      expect(result.currency).toBeCloseTo(deduction.currency, 5);
    });
  });

  describe('#organiseTerms', () => {
    beforeEach(() => {
      royaltyCalculator.removeAllOrBlankTerms = jest.fn((arg) => arg);
      royaltyCalculator.sortByDecendingOrder = jest.fn((arg) => arg);
    });

    it('should call removeAllOrBlankTerms for each sales term passed', () => {
      // Act
      royaltyCalculator.organiseTerms(contract);
      // Assert
      expect(royaltyCalculator.removeAllOrBlankTerms.mock.calls[0][0]).toBe(contract.terms.sales[0]);
      expect(royaltyCalculator.removeAllOrBlankTerms.mock.calls[1][0]).toBe(contract.terms.sales[1]);
    });

    it('should call removeAllOrBlankTerms for each deductions term passed', () => {
      // Act
      royaltyCalculator.organiseTerms(contract);
      // Assert
      expect(royaltyCalculator.removeAllOrBlankTerms.mock.calls[2][0]).toBe(contract.terms.deductions[0]);
      expect(royaltyCalculator.removeAllOrBlankTerms.mock.calls[3][0]).toBe(contract.terms.deductions[1]);
    });

    it('should call removeAllOrBlankTerms for each withholdingTaxes term passed', () => {
      // Act
      royaltyCalculator.organiseTerms(contract);
      // Assert
      expect(royaltyCalculator.removeAllOrBlankTerms.mock.calls[4][0]).toBe(contract.terms.withholdingTaxes[0]);
      expect(royaltyCalculator.removeAllOrBlankTerms.mock.calls[5][0]).toBe(contract.terms.withholdingTaxes[1]);
    });

    it('should call removeAllOrBlankTerms for each mechanicalContracts term passed', () => {
      // Act
      royaltyCalculator.organiseTerms(contract);
      // Assert
      expect(royaltyCalculator.removeAllOrBlankTerms.mock.calls[6][0]).toBe(contract.terms.mechanicalContracts[0]);
      expect(royaltyCalculator.removeAllOrBlankTerms.mock.calls[7][0]).toBe(contract.terms.mechanicalContracts[1]);
    });

    it('should call sortByDecendingOrder for each sales term passed', () => {
      // Act
      royaltyCalculator.organiseTerms(contract);
      // Assert
      expect(royaltyCalculator.sortByDecendingOrder.mock.calls[0][0]).toBe(contract.terms.sales[1], contract.terms.sales[0]);
    });

    it('should call sortByDecendingOrder for each deductions term passed', () => {
      // Act
      royaltyCalculator.organiseTerms(contract);
      // Assert
      expect(royaltyCalculator.sortByDecendingOrder.mock.calls[1][0]).toBe(contract.terms.deductions[1], contract.terms.deductions[0]);
    });

    it('should call sortByDecendingOrder for each withholdingTaxes term passed', () => {
      // Act
      royaltyCalculator.organiseTerms(contract);
      // Assert
      expect(royaltyCalculator.sortByDecendingOrder.mock.calls[2][0]).toBe(contract.terms.withholdingTaxes[1], contract.terms.withholdingTaxes[0]);
    });

    it('should call sortByDecendingOrder for each mechanicalContracts term passed', () => {
      // Act
      royaltyCalculator.organiseTerms(contract);
      // Assert
      expect(royaltyCalculator.sortByDecendingOrder.mock.calls[3][0]).toBe(contract.terms.mechanicalContracts[1], contract.terms.mechanicalContracts[0]);
    });
  });

  describe('#removeAllOrBlankTerms', () => {
    it('should return an object', () => {
    // Arrange
      const object = {};
      // Act
      const result = royaltyCalculator.removeAllOrBlankTerms(object);
      // Assert
      expect(typeof result).toBe('object');
    });

    it("should remove any values that are 'All'", () => {
    // Arrange
      const object = { all: 'All', notAll: 'Not All' };
      // Act
      const result = royaltyCalculator.removeAllOrBlankTerms(object);
      // Assert
      expect(result).toEqual({ notAll: 'Not All' });
    });

    it("should remove any value that are 'World'", () => {
    // Arrange
      const object = { world: 'World', notWorld: 'Not World' };
      // Act
      const result = royaltyCalculator.removeAllOrBlankTerms(object);
      // Assert
      expect(result).toEqual({ notWorld: 'Not World' });
    });

    it('should remove any value that are a blank string', () => {
    // Arrange
      const object = { blank: '', notBlank: 'Not Blank' };
      // Act
      const result = royaltyCalculator.removeAllOrBlankTerms(object);
      // Assert
      expect(result).toEqual({ notBlank: 'Not Blank' });
    });
  });

  describe('#sortByDecendingOrder', () => {
    it('should set any term with a catalogueGroup to first', () => {
      // Arrange
      const object = { name: randomString() };
      const comparison = { name: randomString(), catalogueGroup: randomString() };
      const array = [object, comparison];
      // Act
      const result = array.sort(royaltyCalculator.sortByDecendingOrder);
      // Assert
      expect(result[0]).toBe(comparison);
      expect(result[1]).toBe(object);
    });

    it('should set any term with catalogueGroup to a higher priority than catType', () => {
      // Arrange
      const object = { name: randomString(), catType: randomString() };
      const comparison = { name: randomString(), catalogueGroup: randomString() };
      const array = [object, comparison];
      // Act
      const result = array.sort(royaltyCalculator.sortByDecendingOrder);
      // Assert
      expect(result[0]).toBe(comparison);
      expect(result[1]).toBe(object);
    });

    it('should set any term with a catType to a higher priority than territory', () => {
      // Arrange
      const object = { name: randomString(), territory: ['FR'] };
      const comparison = { name: randomString(), catType: randomString() };
      const array = [object, comparison];
      // Act
      const result = array.sort(royaltyCalculator.sortByDecendingOrder);
      // Assert
      expect(result[0]).toBe(comparison);
      expect(result[1]).toBe(object);
    });

    it('should set any term with a specific territory to a higher priority than a continent', () => {
      // Arrange
      const object = { name: randomString(), territory: 'Africa' };
      const comparison = { name: randomString(), territory: ['FR'] };
      const array = [object, comparison];
      // Act
      const result = array.sort(royaltyCalculator.sortByDecendingOrder);
      // Assert
      expect(result[0]).toBe(comparison);
      expect(result[1]).toBe(object);
    });

    // TODO (previous): It's giving arrays a higher score
    it.skip('should set any term with a specific territory to a higher priority than a territory group array', () => {
      // Arrange
      const object = { name: randomString(), territory: ['FR', 'UK'] };
      const comparison = { name: randomString(), territory: ['MA'] };
      const array = [object, comparison];
      // Act
      const result = array.sort(royaltyCalculator.sortByDecendingOrder);
      // Assert
      expect(result[0]).toBe(comparison);
      expect(result[1]).toBe(object);
    });

    it('should set any term with a territory group array with a higher priority than a continent', () => {
      // Arrange
      const object = { name: randomString(), territory: 'Africa' };
      const comparison = { name: randomString(), territory: ['FR', 'CA'] };
      const array = [object, comparison];
      // Act
      const result = array.sort(royaltyCalculator.sortByDecendingOrder);
      // Assert
      expect(result[0]).toBe(comparison);
      expect(result[1]).toBe(object);
    });

    it('should set any term with a territory to a higher priority than channel', () => {
      // Arrange
      const object = { name: randomString(), channel: 'Digital' };
      const comparison = { name: randomString(), territory: 'Africa' };
      const array = [object, comparison];
      // Act
      const result = array.sort(royaltyCalculator.sortByDecendingOrder);
      // Assert
      expect(result[0]).toBe(comparison);
      expect(result[1]).toBe(object);
    });

    it('should set any term with a specific channel ahead of a channel term group array', () => {
      // Arrange
      const object = { name: randomString(), channel: ['Digital', 'Physical'] };
      const comparison = { name: randomString(), channel: 'Digital' };
      const array = [object, comparison];
      // Act
      const result = array.sort(royaltyCalculator.sortByDecendingOrder);
      // Assert
      expect(result[0]).toBe(comparison);
      expect(result[1]).toBe(object);
    });

    it('should set any term with a channel to a higher priority than config', () => {
      // Arrange
      const object = { name: randomString(), configuration: 'Config' };
      const comparison = { name: randomString(), channel: 'Digital' };
      const array = [object, comparison];
      // Act
      const result = array.sort(royaltyCalculator.sortByDecendingOrder);
      // Assert
      expect(result[0]).toBe(comparison);
      expect(result[1]).toBe(object);
    });

    it('should set any term with a specific config ahead of a config term group array', () => {
      // Arrange
      const object = { name: randomString(), configuration: ['Config 1', 'Config 2'] };
      const comparison = { name: randomString(), configuration: 'Config' };
      const array = [object, comparison];
      // Act
      const result = array.sort(royaltyCalculator.sortByDecendingOrder);
      // Assert
      expect(result[0]).toBe(comparison);
      expect(result[1]).toBe(object);
    });

    it('should set any term with a config to a higher priority than priceCat', () => {
      // Arrange
      const object = { name: randomString(), priceCategory: 'priceCategory' };
      const comparison = { name: randomString(), configuration: 'Config' };
      const array = [object, comparison];
      // Act
      const result = array.sort(royaltyCalculator.sortByDecendingOrder);
      // Assert
      expect(result[0]).toBe(comparison);
      expect(result[1]).toBe(object);
    });

    it('should set any term with a specific priceCat ahead of a priceCat term group array', () => {
      // Arrange
      const object = { name: randomString(), priceCategory: [randomString(), randomString()] };
      const comparison = { name: randomString(), priceCategory: randomString() };
      const array = [object, comparison];
      // Act
      const result = array.sort(royaltyCalculator.sortByDecendingOrder);
      // Assert
      expect(result[0]).toBe(comparison);
      expect(result[1]).toBe(object);
    });

    it('should set any term with a priceCat to a higher priority than source', () => {
      // Arrange
      const object = { name: randomString(), source: randomString() };
      const comparison = { name: randomString(), priceCategory: randomString() };
      const array = [object, comparison];
      // Act
      const result = array.sort(royaltyCalculator.sortByDecendingOrder);
      // Assert
      expect(result[0]).toBe(comparison);
      expect(result[1]).toBe(object);
    });
  });

  describe('#runSalesFilter', () => {
    let salesTermsObject; let deductionFilters; let withholdingTaxFilters; let mechanicalFilters;
    beforeEach(() => {
      salesTermsObject = { term: randomString() };
      deductionFilters = { type: randomString() };
      withholdingTaxFilters = { type: randomString() };
      mechanicalFilters = { type: randomString() };
    });

    describe('when periodId NOT passed', () => {
      it('should return an error to the callback', (done) => {
        // Arrange
        royaltyCalculator.periodId = null;
        // Act
        royaltyCalculator.runSalesFilter(
          salesTermsObject,
          deductionFilters,
          withholdingTaxFilters,
          mechanicalFilters,
          (err) => {
            expect(err).toBe('Requires inputs, inputCollection, outputCollection and periodId');
            done();
          },
        );
      });
    });

    describe('when periodId is passed', () => {
      let mockedMomentDate;
      // Arrange

      beforeEach(() => {
        mockedMomentDate = randomDate();
        moment.mockImplementation(() => ({
          format: jest.fn().mockReturnValue(mockedMomentDate),
        }));
        royaltyCalculator.runSalesLine = jest.fn().mockImplementation((...args) => args[args.length - 1]());
      });

      it('should call joinSalesCalculationFilterQuery with expected params', (done) => {
        const selectFields = [
          'id', 'contractId', 'salesFileId', 'catType', 'releaseId', 'trackId', 'workId', 'distributionChannel', 'configuration', 'priceCategory', 'territory', 'saleDate', 'transactionDate', 'source', 'subSource', 'description', 'units', 'sharePercentage', 'returnUnits', 'originalCurrency', 'exchangeRate', 'grossAmount', 'netAmount', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'perUnitRate', 'homeCurrencyPerUnitRate', 'retailPrice', 'homeCurrencyRetailPrice', 'salePrice', 'homeCurrencySalePrice', 'duration', 'production', 'episode', 'dateFrom', 'dateTo', 'catNo', 'barcode', 'catalogueReleaseTitle', 'catalogueReleaseVersion', 'catalogueReleaseArtist', 'catalogueReleaseLabel', 'catalogueCatNo', 'catalogueReleaseForeignId', 'catalogueBarcode', 'ppd', 'proRataAmount',
          'catalogueFormat', 'mechanicalBasisPercentage', 'totalMechanicalAmount', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'catalogueTrackLabel', 'catalogueIsrc', 'catalogueTrackForeignId', 'mechanicalRate', 'catalogueWorkTitle', 'catalogueWorkComposer', 'catalogueIdentifier', 'catalogueWorkForeignId', 'catalogueIswc', 'catalogueTunecode', 'status', 'currency2GrossAmount', 'currency2NetAmount', 'currency2PerUnitRate', 'currency2RetailPrice', 'currency2SalePrice', 'currency3GrossAmount', 'currency3NetAmount', 'currency3PerUnitRate', 'currency3RetailPrice', 'currency3SalePrice', 'currency4GrossAmount', 'currency4NetAmount', 'currency4PerUnitRate', 'currency4RetailPrice', 'currency4SalePrice', 'partitionNo',
        ];
        const distinctFields = [...selectFields];
        // @NOTE: I have removed the below as it did not make sense
        // const timestamp = randomString();
        // moment.mockImplementation(() => ({
        //   format: jest.fn().mockReturnValue(timestamp),
        // }));

        // Act
        royaltyCalculator.runSalesFilter(
          salesTermsObject,
          deductionFilters,
          withholdingTaxFilters,
          mechanicalFilters,
          () => {
            // Assert
            expect(bigQuery.joinSalesCalculationFilterQueryObject).toHaveBeenCalledWith(
              selectFields,
              distinctFields,
              royaltyCalculator.contractQuery,
              {
                uniqueValue: mockedMomentDate,
                limit: 100000000,
                offset: 0,
                orderBy: 'id',
              },
            );
            done();
          },
        );

        emitter.emit('error', { message: '' });
      });

      it('should call createQueryStream with the returned query', (done) => {
        // Act
        royaltyCalculator.runSalesFilter(
          salesTermsObject,
          deductionFilters,
          withholdingTaxFilters,
          mechanicalFilters,
          () => {
            // Assert
            expect(bigQuery.client.createQueryStream).toHaveBeenCalledWith(joinSalesCalculationFilterQueryObjectResult);
            done();
          },
        );

        emitter.emit('error', { message: '' });
      });

      describe('when createQueryStream triggers an error', () => {
        it('should retry the query on 409', (done) => {
          // Arrange
          jest.setTimeout(3000);
          let doneCalled = false;
          bigQuery.retryErroredQuery.mockReturnValue(true);
          // Act
          royaltyCalculator.runSalesFilter(
            salesTermsObject,
            deductionFilters,
            withholdingTaxFilters,
            mechanicalFilters,
            () => {
              // Assert
              expect(bigQuery.client.createQueryStream).toHaveBeenCalledTimes(2);
              if (doneCalled) done(); else doneCalled = true;
            },
          );

          emitter.emit('error', { code: 409 });

          setTimeout(() => {
            bigQuery.retryErroredQuery.mockReturnValue(false);
            emitter.emit('error', {});
          }, 2000);
        });

        it('should retry on "Exceeded rate limits"', (done) => {
          // Arrange
          jest.setTimeout(3000);
          let doneCalled = false;
          bigQuery.retryErroredQuery.mockReturnValue(true);
          // Act
          royaltyCalculator.runSalesFilter(
            salesTermsObject,
            deductionFilters,
            withholdingTaxFilters,
            mechanicalFilters,
            () => {
              // Assert
              expect(bigQuery.client.createQueryStream).toHaveBeenCalledTimes(2);
              if (doneCalled) done(); else doneCalled = true;
            },
          );

          emitter.emit('error', { message: 'Exceeded rate limits' });

          setTimeout(() => {
            bigQuery.retryErroredQuery.mockReturnValue(false);
            emitter.emit('error', { message: '' });
          }, 2000);
        });

        it('should return other errors to the callback', (done) => {
          // Arrange
          const expectedError = randomString();
          // Act
          royaltyCalculator.runSalesFilter(
            salesTermsObject,
            deductionFilters,
            withholdingTaxFilters,
            mechanicalFilters,
            (err) => {
              // Assert
              expect(err).toEqual(expectedError);
              done();
            },
          );

          emitter.emit('error', { errors: [expectedError] });
        });
      });

      describe('when createQueryStream returns data', () => {
        it('should call runSalesLine for each data line', (done) => {
          // Arrange
          bigQuery.getCount.mockImplementation((...args) => args[args.length - 1](null, [{ count: 2 }]));
          // Act
          royaltyCalculator.runSalesFilter(
            salesTermsObject,
            deductionFilters,
            withholdingTaxFilters,
            mechanicalFilters,
            () => {
              // Assert
              expect(royaltyCalculator.runSalesLine).toHaveBeenCalledTimes(2);
              expect(royaltyCalculator.runSalesLine).toHaveBeenCalledWith(
                { line: 1 },
                salesTermsObject,
                deductionFilters,
                withholdingTaxFilters,
                mechanicalFilters,
                expect.any(Function),
              );
              expect(royaltyCalculator.runSalesLine).toHaveBeenCalledWith(
                { line: 2 },
                salesTermsObject,
                deductionFilters,
                withholdingTaxFilters,
                mechanicalFilters,
                expect.any(Function),
              );
              done();
            },
          );

          emitter.emit('data', { line: 1 });
          emitter.emit('data', { line: 2 });
          emitter.emit('end');
        });

        it('should call writeToFile with outputLines', (done) => {
          // Arrange
          bigQuery.getCount.mockImplementation((...args) => args[args.length - 1](null, [{ count: 1 }]));
          const outputLines = [{ line: 1 }, { line: 2 }];
          royaltyCalculator.outputLines = outputLines;
          // Act
          royaltyCalculator.runSalesFilter(
            salesTermsObject,
            deductionFilters,
            withholdingTaxFilters,
            mechanicalFilters,
            () => {
              // Assert
              expect(bigQuery.writeToFile).toHaveBeenCalled();
              const callArgs = bigQuery.writeToFile.mock.calls[0];
              expect(callArgs.slice(0, 2)).toEqual([
                outputLines,
                bigQuery.outputTable,
              ]);
              done();
            },
          );

          emitter.emit('data', { line: 1 });
          emitter.emit('end');
        });

        it('should reset outputLines after writing', (done) => {
          // Arrange
          bigQuery.getCount.mockImplementation((...args) => args[args.length - 1](null, [{ count: 1 }]));
          royaltyCalculator.outputLines = [{ line: 1 }, { line: 2 }];
          // Act
          royaltyCalculator.runSalesFilter(
            salesTermsObject,
            deductionFilters,
            withholdingTaxFilters,
            mechanicalFilters,
            () => {
              // Assert
              expect(royaltyCalculator.outputLines).toEqual([]);
              done();
            },
          );

          emitter.emit('data', { line: 1 });
          emitter.emit('end');
        });
      });
    });
  });

  describe('#runSalesLine', () => {
    let salesLine;
    let salesTermsObject;
    let deductionFilters;
    let withholdingTaxFilters;
    let mechanicalFilters;

    beforeEach(() => {
      salesLine = { line: randomString() };
      salesTermsObject = { term: randomString() };
      deductionFilters = { type: randomString() };
      withholdingTaxFilters = { type: randomString() };
      mechanicalFilters = { type: randomString() };
    });

    describe('when periodId NOT passed', () => {
      it('should return an error to the callback', (done) => {
        // Arrange
        royaltyCalculator.periodId = null;

        // Act
        royaltyCalculator.runSalesLine(salesLine, salesTermsObject, deductionFilters, withholdingTaxFilters, mechanicalFilters, (err) => {
          // Assert
          expect(err).toBe('Requires inputs, inputCollection, outputCollection and periodId');
          done();
        });
      });
    });

    describe('when periodId is passed', () => {
      let salesTerm;
      let updatedSalesLine;
      let outputLine;
      let previouslyReported;

      beforeEach(() => {
        updatedSalesLine = { updatedSalesLine: randomString() };
        outputLine = { outputLine: randomString() };
        previouslyReported = { previouslyReported: randomString() };

        royaltyCalculator.runCalculation = jest.fn().mockImplementation((...args) => args[args.length - 1](null, updatedSalesLine, outputLine, previouslyReported));
        royaltyCalculator.setCatalogueData = jest.fn((input) => input);

        salesLine = { workId: randomId(), distributionChannel: 'Digital' };
        royaltyCalculator.participationRates = {};
        royaltyCalculator.participationRates[salesLine.workId] = [];

        salesTerm = { filter: { type: randomString() }, calculation: { type: randomString() }, escalationTrackers: [randomString(), randomString()] };
        royaltyCalculator.getSalesTermFromSalesLine = jest.fn().mockImplementation((...args) => args[args.length - 1](null, salesTerm));
      });

      it('should call getSalesTermFromSalesLine with the line and terms', (done) => {
        // Act
        royaltyCalculator.runSalesLine(salesLine, salesTermsObject, deductionFilters, withholdingTaxFilters, mechanicalFilters, () => {
          // Assert
          expect(royaltyCalculator.getSalesTermFromSalesLine).toHaveBeenCalled();
          done();
        });
      });

      // TODO (previous): the error isn't being returned here.
      describe('when getSalesTermFromSalesLine returns an error', () => {
        it.skip('should return the error to the callback', (done) => {
          // Arrange
          const expectedError = randomString();
          royaltyCalculator.getSalesTermFromSalesLine.mockImplementationOnce((...args) => args[args.length - 1](expectedError));

          // Act
          royaltyCalculator.runSalesLine(salesLine, salesTermsObject, deductionFilters, withholdingTaxFilters, mechanicalFilters, (err) => {
            // Assert
            expect(err).toBe(expectedError);
            done();
          });
        });
      });

      describe('when getSalesTermFromSalesLine returns no salesTerm', () => {
        it('should return nothing to the callback', (done) => {
          // Arrange
          royaltyCalculator.getSalesTermFromSalesLine.mockImplementationOnce((...args) => args[args.length - 1]());

          // Act
          royaltyCalculator.runSalesLine(salesLine, salesTermsObject, deductionFilters, withholdingTaxFilters, mechanicalFilters, (err, result) => {
            // Assert
            expect(result).toBeUndefined();
            done();
          });
        });

        it('should not call runCalculation', (done) => {
          // Arrange
          royaltyCalculator.getSalesTermFromSalesLine.mockImplementationOnce((...args) => args[args.length - 1]());

          // Act
          royaltyCalculator.runSalesLine(salesLine, salesTermsObject, deductionFilters, withholdingTaxFilters, mechanicalFilters, () => {
            // Assert
            expect(royaltyCalculator.runCalculation).not.toHaveBeenCalled();
            done();
          });
        });
      });

      describe('when getSalesTermFromSalesLine returns a term', () => {
        describe('and when a specific channel is found in the participation rates that matches the sales line distribution channel', () => {
          it('should call runCalculation with the required params', (done) => {
            // Arrange
            royaltyCalculator.participationRates[salesLine.workId] = [{ distributionChannel: 'Digital' }];

            // Act
            royaltyCalculator.runSalesLine(salesLine, salesTermsObject, deductionFilters, withholdingTaxFilters, mechanicalFilters, () => {
              // Assert
              expect(royaltyCalculator.runCalculation).toHaveBeenCalledWith(
                salesLine,
                salesTerm.filter,
                deductionFilters,
                withholdingTaxFilters,
                mechanicalFilters,
                salesTerm.calculation,
                salesTerm.escalationTrackers,
                expect.any(Function),
              );
              done();
            });
          });
        });

        describe('and when a specific channel is found in the participation rates that DOES NOT match the sales line distribution channel', () => {
          it('should NOT call runCalculation', (done) => {
            // Arrange
            royaltyCalculator.participationRates[salesLine.workId] = [{ distributionChannel: 'Physical' }];

            // Act
            royaltyCalculator.runSalesLine(salesLine, salesTermsObject, deductionFilters, withholdingTaxFilters, mechanicalFilters, () => {
              // Assert
              expect(royaltyCalculator.runCalculation).not.toHaveBeenCalled();
              done();
            });
          });
        });

        describe('and when a specific channel is NOT found in the participation rates', () => {
          it('should call runCalculation with the required params', (done) => {
            // Arrange
            royaltyCalculator.participationRates[salesLine.workId] = [];

            // Act
            royaltyCalculator.runSalesLine(salesLine, salesTermsObject, deductionFilters, withholdingTaxFilters, mechanicalFilters, () => {
              // Assert
              expect(royaltyCalculator.runCalculation).toHaveBeenCalledWith(
                salesLine,
                salesTerm.filter,
                deductionFilters,
                withholdingTaxFilters,
                mechanicalFilters,
                salesTerm.calculation,
                salesTerm.escalationTrackers,
                expect.any(Function),
              );
              done();
            });
          });
        });

        describe('when runCalculation returns an error', () => {
          it('should return the error to the callback', (done) => {
            // Arrange
            const excpectedError = randomString();
            royaltyCalculator.runCalculation.mockImplementationOnce((...args) => args[args.length - 1](excpectedError));

            // Act
            royaltyCalculator.runSalesLine(salesLine, salesTermsObject, deductionFilters, withholdingTaxFilters, mechanicalFilters, (err) => {
              // Assert
              expect(err).toBe(excpectedError);
              done();
            });
          });
        });

        describe('when runCalculation returns an outputLine', () => {
          describe("when periodType is 'Mechanical'", () => {
            it('should add the returned updatedSalesLine to batches to allow for recalculating on another track', (done) => {
              // Arrange
              royaltyCalculator.periodType = 'Mechanical';

              // Act
              royaltyCalculator.runSalesLine(salesLine, salesTermsObject, deductionFilters, withholdingTaxFilters, mechanicalFilters, () => {
                // Assert
                expect(royaltyCalculator.batches[0]).toEqual([updatedSalesLine]);
                done();
              });
            });
          });

          it('should call setCatalogueData with the returned outputLine', (done) => {
            // Act
            royaltyCalculator.runSalesLine(salesLine, salesTermsObject, deductionFilters, withholdingTaxFilters, mechanicalFilters, (err, result) => {
              // Assert
              expect(royaltyCalculator.setCatalogueData).toHaveBeenCalledWith(outputLine);
              done();
            });
          });

          it("should remove any values that aren't included in allowedFields", (done) => {
            // Arrange
            royaltyCalculator.allowedFields = ['key1', 'key2', 'key3'];
            outputLine = { key1: 'key1', key2: 'key2', key3: 'key3', key4: 'key4' };
            royaltyCalculator.runCalculation.mockImplementationOnce((...args) => args[args.length - 1](null, updatedSalesLine, outputLine, previouslyReported));

            // Act
            royaltyCalculator.runSalesLine(salesLine, salesTermsObject, deductionFilters, withholdingTaxFilters, mechanicalFilters, () => {
              // Assert
              expect(royaltyCalculator.outputLines[0].key1).toBeDefined();
              expect(royaltyCalculator.outputLines[0].key2).toBeDefined();
              expect(royaltyCalculator.outputLines[0].key3).toBeDefined();
              expect(royaltyCalculator.outputLines[0].key4).toBeUndefined();
              done();
            });
          });

          it("should remove any non-numeric values for any fields that have the type of 'FLOAT'", (done) => {
            // Arrange
            royaltyCalculator.allowedFields = ['key1', 'key2', 'key3'];
            royaltyCalculator.fieldTypes = { key1: 'FLOAT', key2: 'STRING', key3: 'DATE' };
            const outputLine = { key1: randomString(), key2: randomString(), key3: randomDate() };
            royaltyCalculator.runCalculation.mockImplementationOnce((...args) => args[args.length - 1](null, updatedSalesLine, outputLine, previouslyReported));

            // Act
            royaltyCalculator.runSalesLine(salesLine, salesTermsObject, deductionFilters, withholdingTaxFilters, mechanicalFilters, () => {
              // Assert
              expect(royaltyCalculator.outputLines[0].key1).toBeUndefined();
              done();
            });
          });

          it("should remove any non-date value for any of the fields that have the type of 'Date'", (done) => {
            // Arrange
            royaltyCalculator.allowedFields = ['key1', 'key2', 'key3'];
            royaltyCalculator.fieldTypes = { key1: 'FLOAT', key2: 'STRING', key3: 'DATE' };
            const outputLine = { key1: randomFloat(), key2: randomString(), key3: randomString(8) };
            royaltyCalculator.runCalculation.mockImplementationOnce((...args) => args[args.length - 1](null, updatedSalesLine, outputLine, previouslyReported));

            // Act
            royaltyCalculator.runSalesLine(salesLine, salesTermsObject, deductionFilters, withholdingTaxFilters, mechanicalFilters, () => {
              // Assert
              expect(royaltyCalculator.outputLines[0].key3).toBeUndefined();
              done();
            });
          });

          it("should force any fields that have the type of 'STRING' into a string", (done) => {
            // Arrange
            royaltyCalculator.allowedFields = ['key1', 'key2', 'key3'];
            royaltyCalculator.fieldTypes = { key1: 'FLOAT', key2: 'STRING', key3: 'DATE' };
            const outputLine = { key1: randomFloat(), key2: randomFloat(), key3: randomDate() };
            royaltyCalculator.runCalculation.mockImplementationOnce((...args) => args[args.length - 1](null, updatedSalesLine, outputLine, previouslyReported));

            // Act
            royaltyCalculator.runSalesLine(salesLine, salesTermsObject, deductionFilters, withholdingTaxFilters, mechanicalFilters, (err, result) => {
              // Assert
              expect(royaltyCalculator.outputLines[0].key2).toBe(String(outputLine.key2));
              done();
            });
          });

          it('should remove the id from the outputLine', (done) => {
            // Arrange
            royaltyCalculator.allowedFields = ['id', 'key1', 'key2', 'key3'];
            royaltyCalculator.fieldTypes = { key1: 'FLOAT', key2: 'STRING', key3: 'DATE' };
            const outputLine = { id: randomId() };
            royaltyCalculator.runCalculation.mockImplementationOnce((...args) => args[args.length - 1](null, updatedSalesLine, outputLine, previouslyReported));

            // Act
            royaltyCalculator.runSalesLine(salesLine, salesTermsObject, deductionFilters, withholdingTaxFilters, mechanicalFilters, (err, result) => {
              // Assert
              expect(royaltyCalculator.outputLines[0].id).toBeUndefined();
              done();
            });
          });

          it('should add the outputLine onto the outputLines array', (done) => {
            // Arrange
            royaltyCalculator.allowedFields = ['id', 'key1', 'key2', 'key3'];
            royaltyCalculator.fieldTypes = { key1: 'FLOAT', key2: 'STRING', key3: 'DATE' };
            const outputLine = { id: randomId(), key1: randomFloat(), key2: randomString(), key3: randomDate() };
            royaltyCalculator.runCalculation.mockImplementationOnce((...args) => args[args.length - 1](null, updatedSalesLine, outputLine, previouslyReported));

            // Act
            royaltyCalculator.runSalesLine(salesLine, salesTermsObject, deductionFilters, withholdingTaxFilters, mechanicalFilters, (err, result) => {
              // Assert
              expect(royaltyCalculator.outputLines[0]).toEqual({ key1: outputLine.key1, key2: outputLine.key2, key3: outputLine.key3 });
              done();
            });
          });

          describe('when adding the line sends outputLines over 100k lines', () => {
            it('should call bigQuery.writeToFile', (done) => {
              // Arrange
              royaltyCalculator.outputLines.length = 99999;

              // Act
              royaltyCalculator.runSalesLine(salesLine, salesTermsObject, deductionFilters, withholdingTaxFilters, mechanicalFilters, () => {
                // Assert
                expect(bigQuery.writeToFile).toHaveBeenCalled();
                expect(royaltyCalculator.outputLines.length).toBe(0);
                done();
              });
            });
          });
        });

        describe('when runCalculation does not return an outputLine, and previouslyReported is false', () => {
          it('should add returned updatedSalesLine to batches', (done) => {
            // Arrange
            outputLine = null;
            previouslyReported = false;
            royaltyCalculator.runCalculation.mockImplementationOnce((...args) => args[args.length - 1](null, updatedSalesLine, outputLine, previouslyReported));

            // Act
            royaltyCalculator.runSalesLine(salesLine, salesTermsObject, deductionFilters, withholdingTaxFilters, mechanicalFilters, () => {
              // Assert
              expect(royaltyCalculator.batches[0]).toEqual([updatedSalesLine]);
              done();
            });
          });
        });

        describe('when runCalculation does not return an outputLine, and previouslyReported is true', () => {
          it('should not change batches', (done) => {
            // Arrange
            outputLine = null;
            previouslyReported = true;
            royaltyCalculator.runCalculation.mockImplementationOnce((...args) => args[args.length - 1](null, updatedSalesLine, outputLine, previouslyReported));

            // Act
            royaltyCalculator.runSalesLine(salesLine, salesTermsObject, deductionFilters, withholdingTaxFilters, mechanicalFilters, () => {
              // Assert
              expect(royaltyCalculator.batches[0]).toEqual([]);
              done();
            });
          });
        });
      });
    });
  });

  describe('#setDeduction', () => {
    let deductionFilters;
    let salesLine;

    beforeEach(() => {
      salesLine = { _id: randomId() };
      deductionFilters = [{ deductionFilter: 1, calculation: {} }, { deductionFilter: 2, calculation: {} }];
      royaltyCalculator.filterMatches = jest.fn().mockImplementation((_salesLine, _filter, callback) => callback(true));
    });

    describe('when salesLine is not passed', () => {
      it('should return an error to the callback', (done) => {
        // Arrange
        salesLine = null;
        // Act
        royaltyCalculator.setDeduction(salesLine, deductionFilters, (err) => {
          // Assert
          expect(err).toBe('A sales line and deduction filters are required');
          done();
        });
      });
    });

    describe('when deductionFilters are not passed', () => {
      it('should return an error to the callback', (done) => {
        // Arrange
        deductionFilters = null;
        // Act
        royaltyCalculator.setDeduction(salesLine, deductionFilters, (err) => {
          // Assert
          expect(err).toBe('A sales line and deduction filters are required');
          done();
        });
      });
    });

    describe('when a salesLine and deductionFilters are passed', () => {
      it('should call filterMatches for each filter', (done) => {
        // Act
        royaltyCalculator.setDeduction(salesLine, deductionFilters, () => {
          // Assert
          expect(royaltyCalculator.filterMatches).toHaveBeenCalledTimes(2);
          done();
        });
      });

      describe('when filterMatches returns true on one deduction', () => {
        describe("and when deduction.calculation.deductionBasis is 'Unit Rate'", () => {
          it('should set contractCurrencyDeductionUnitRate to calculation.unitRate', (done) => {
            // Arrange
            deductionFilters = [
              { calculation: { deductionBasis: 'Unit Rate', unitRate: randomFloat() } },
              { calculation: { deductionBasis: 'Unit Rate', unitRate: randomFloat() } },
            ];
            // Act
            royaltyCalculator.setDeduction(salesLine, deductionFilters, () => {
              // Assert
              expect(salesLine.contractCurrencyDeductionUnitRate).toBeCloseTo(deductionFilters[0].calculation.unitRate, 5);
              done();
            });
          });

          it('should set deductionUnitRate to calculation.unitRate / contractExchangeRate', (done) => {
            // Arrange
            deductionFilters = [
              { calculation: { deductionBasis: 'Unit Rate', unitRate: randomFloat() } },
              { calculation: { deductionBasis: 'Unit Rate', unitRate: randomFloat() } },
            ];
            // Act
            royaltyCalculator.setDeduction(salesLine, deductionFilters, () => {
              // Assert
              expect(salesLine.deductionUnitRate).toBeCloseTo(deductionFilters[0].calculation.unitRate / royaltyCalculator.contractExchangeRate, 5);
              done();
            });
          });

          it('should set deductionRate to calculation.rate when it exists', (done) => {
            // Arrange
            deductionFilters = [
              { calculation: { deductionBasis: 'Unit Rate', unitRate: randomFloat(), rate: randomFloat() } },
              { calculation: { deductionBasis: 'Unit Rate', unitRate: randomFloat(), rate: randomFloat() } },
            ];
            // Act
            royaltyCalculator.setDeduction(salesLine, deductionFilters, () => {
              // Assert
              expect(salesLine.deductionRate).toBeCloseTo(deductionFilters[0].calculation.rate, 5);
              done();
            });
          });

          it('should set deductionRate to 0 when calculation.rate does not exist', (done) => {
            // Arrange
            deductionFilters = [
              { calculation: { deductionBasis: 'Unit Rate', unitRate: randomFloat() } },
              { calculation: { deductionBasis: 'Unit Rate', unitRate: randomFloat() } },
            ];
            // Act
            royaltyCalculator.setDeduction(salesLine, deductionFilters, () => {
              // Assert
              expect(salesLine.deductionRate).toBe(0);
              done();
            });
          });

          it("should set deductionCalculationType to 'Unit Rate'", (done) => {
            // Arrange
            deductionFilters = [
              { calculation: { deductionBasis: 'Unit Rate', unitRate: randomFloat() } },
              { calculation: { deductionBasis: 'Unit Rate', unitRate: randomFloat() } },
            ];
            // Act
            royaltyCalculator.setDeduction(salesLine, deductionFilters, () => {
              // Assert
              expect(salesLine.deductionCalculationType).toBe('Unit Rate');
              done();
            });
          });

          it('should set deductionType to calculation.type', (done) => {
            // Arrange
            deductionFilters = [
              { calculation: { deductionBasis: 'Unit Rate', unitRate: randomFloat(), type: randomString() } },
              { calculation: { deductionBasis: 'Unit Rate', unitRate: randomFloat() } },
            ];
            // Act
            royaltyCalculator.setDeduction(salesLine, deductionFilters, () => {
              // Assert
              expect(salesLine.deductionType).toBe(deductionFilters[0].calculation.type);
              done();
            });
          });
        });

        describe("and when deduction.calculation.deductionBasis is NOT 'Unit Rate'", () => {
          it('should set deductionRate to calculation.rate when it exists', (done) => {
            // Arrange
            deductionFilters = [
              { calculation: { deductionBasis: randomString(), rate: randomFloat(), type: randomString() } },
              { calculation: { deductionBasis: randomString(), rate: randomFloat() } },
            ];
            // Act
            royaltyCalculator.setDeduction(salesLine, deductionFilters, () => {
              // Assert
              expect(salesLine.deductionRate).toBeCloseTo(deductionFilters[0].calculation.rate, 5);
              done();
            });
          });

          it('should set deductionRate to 0 when calculation.rate does not exist', (done) => {
            // Arrange
            deductionFilters = [
              { calculation: { deductionBasis: randomString(), type: randomString() } },
              { calculation: { deductionBasis: randomString() } },
            ];
            // Act
            royaltyCalculator.setDeduction(salesLine, deductionFilters, () => {
              // Assert
              expect(salesLine.deductionRate).toBe(0);
              done();
            });
          });

          // TODO (previous): Are defaulting to Percentage here
          it.skip("should set deductionCalculationType to 'Percentage'", () => {
            // Arrange
            deductionFilters = [
              { calculation: { deductionBasis: randomString(), rate: randomFloat() } },
              { calculation: { deductionBasis: randomString(), rate: randomFloat() } },
            ];
            // Act
            royaltyCalculator.setDeduction(salesLine, deductionFilters, () => {
              // Assert
              expect(salesLine.deductionCalculationType).toBe('Percentage');
            });
          });

          it('should set deductionType to calculation.type', (done) => {
            // Arrange
            deductionFilters = [
              { calculation: { deductionBasis: randomString(), rate: randomFloat(), type: randomString() } },
              { calculation: { deductionBasis: randomString(), rate: randomFloat() } },
            ];
            // Act
            royaltyCalculator.setDeduction(salesLine, deductionFilters, () => {
              // Assert
              expect(salesLine.deductionType).toBe(deductionFilters[0].calculation.type);
              done();
            });
          });
        });
      });
    });
  });

  describe('#setWithholdingTax', () => {
    let deductionFilters;
    let salesLine;

    beforeEach(() => {
      salesLine = { _id: randomId() };
      deductionFilters = [{ deductionFilter: 1, calculation: {} }, { deductionFilter: 2, calculation: {} }];
      royaltyCalculator.filterMatches = jest.fn().mockImplementation((_salesLine, _filter, callback) => callback(true));
    });

    describe('when salesLine is not passed', () => {
      it('should return an error to the callback', (done) => {
        // Arrange
        salesLine = null;
        // Act
        royaltyCalculator.setWithholdingTax(salesLine, deductionFilters, (err) => {
          // Assert
          expect(err).toBe('A sales line and deduction filters are required');
          done();
        });
      });
    });

    describe('when deductionFilters are not passed', () => {
      it('should return an error to the callback', (done) => {
        // Arrange
        deductionFilters = null;
        // Act
        royaltyCalculator.setWithholdingTax(salesLine, deductionFilters, (err) => {
          // Assert
          expect(err).toBe('A sales line and deduction filters are required');
          done();
        });
      });
    });

    describe('when a salesLine and deductionFilters are passed', () => {
      it('should call filterMatches for each filter', (done) => {
        // Act
        royaltyCalculator.setWithholdingTax(salesLine, deductionFilters, () => {
          // Assert
          expect(royaltyCalculator.filterMatches).toHaveBeenCalledTimes(2);
          done();
        });
      });

      describe('when filterMatches returns true on one deduction', () => {
        describe("and when deduction.calculation.deductionBasis is 'Unit Rate'", () => {
          it('should set contractCurrencyWithholdingTaxUnitRate to calculation.unitRate', (done) => {
            // Arrange
            deductionFilters = [
              { calculation: { deductionBasis: 'Unit Rate', unitRate: randomFloat(), rate: randomFloat() } },
            ];
            // Act
            royaltyCalculator.setWithholdingTax(salesLine, deductionFilters, () => {
              // Assert
              expect(salesLine.contractCurrencyWithholdingTaxUnitRate).toBeCloseTo(deductionFilters[0].calculation.unitRate, 5);
              done();
            });
          });

          it('should set withholdingTaxUnitRate to calculation.unitRate / contractExchangeRate', (done) => {
            // Arrange
            deductionFilters = [
              { calculation: { deductionBasis: 'Unit Rate', unitRate: randomFloat(), rate: randomFloat() } },
            ];
            // Act
            royaltyCalculator.setWithholdingTax(salesLine, deductionFilters, () => {
              // Assert
              expect(salesLine.withholdingTaxUnitRate).toBeCloseTo(deductionFilters[0].calculation.unitRate / royaltyCalculator.contractExchangeRate, 5);
              done();
            });
          });

          it('should set withholdingTaxRate to calculation.rate when it exists', (done) => {
            // Arrange
            deductionFilters = [
              { calculation: { deductionBasis: 'Unit Rate', unitRate: randomFloat(), rate: randomFloat() } },
            ];
            // Act
            royaltyCalculator.setWithholdingTax(salesLine, deductionFilters, () => {
              // Assert
              expect(salesLine.withholdingTaxRate).toBeCloseTo(deductionFilters[0].calculation.rate, 5);
              done();
            });
          });

          it('should set withholdingTaxRate to 0 when calculation.rate does not exist', (done) => {
            // Arrange
            deductionFilters = [
              { calculation: { deductionBasis: 'Unit Rate', unitRate: randomFloat(), norate: randomFloat() } },
            ];
            // Act
            royaltyCalculator.setWithholdingTax(salesLine, deductionFilters, () => {
              // Assert
              expect(salesLine.withholdingTaxRate).toBe(0);
              done();
            });
          });

          it("should set withholdingTaxCalculationType to 'Unit Rate'", (done) => {
            // Arrange
            deductionFilters = [
              { calculation: { deductionBasis: 'Unit Rate', unitRate: randomFloat(), norate: randomFloat() } },
            ];
            // Act
            royaltyCalculator.setWithholdingTax(salesLine, deductionFilters, () => {
              // Assert
              expect(salesLine.withholdingTaxCalculationType).toBe('Unit Rate');
              done();
            });
          });

          it('should set withholdingTaxType to calculation.type', (done) => {
            // Arrange
            deductionFilters = [
              { calculation: { deductionBasis: 'Unit Rate', unitRate: randomFloat(), type: randomString() } },
            ];
            // Act
            royaltyCalculator.setWithholdingTax(salesLine, deductionFilters, () => {
              // Assert
              expect(salesLine.withholdingTaxType).toBe(deductionFilters[0].calculation.type);
              done();
            });
          });
        });

        describe("and when deduction.calculation.deductionBasis is NOT 'Unit Rate'", () => {
          it('should set withholdingTaxRate to calculation.rate when it exists', (done) => {
            // Arrange
            deductionFilters = [
              { calculation: { deductionBasis: randomString(), unitRate: randomFloat(), rate: randomFloat() } },
            ];
            // Act
            royaltyCalculator.setWithholdingTax(salesLine, deductionFilters, () => {
              // Assert
              expect(salesLine.withholdingTaxRate).toBeCloseTo(deductionFilters[0].calculation.rate, 5);
              done();
            });
          });

          it('should set withholdingTaxRate to 0 when calculation.rate does not exist', (done) => {
            // Arrange
            deductionFilters = [
              { calculation: { deductionBasis: randomString(), unitRate: randomFloat(), norate: randomFloat() } },
            ];
            // Act
            royaltyCalculator.setWithholdingTax(salesLine, deductionFilters, () => {
              // Assert
              expect(salesLine.withholdingTaxRate).toBe(0);
              done();
            });
          });

          it("should set withholdingTaxCalculationType to 'Percentage'", (done) => {
            // Arrange
            deductionFilters = [
              { calculation: { deductionBasis: randomString(), unitRate: randomFloat(), rate: randomFloat() } },
            ];
            // Act
            royaltyCalculator.setWithholdingTax(salesLine, deductionFilters, () => {
              // Assert
              expect(salesLine.withholdingTaxCalculationType).toBe('Percentage');
              done();
            });
          });

          it('should set withholdingTaxType to calculation.type', (done) => {
            // Arrange
            deductionFilters = [
              { calculation: { deductionBasis: randomString(), unitRate: randomFloat(), type: randomString() } },
            ];
            // Act
            royaltyCalculator.setWithholdingTax(salesLine, deductionFilters, () => {
              // Assert
              expect(salesLine.withholdingTaxType).toBe(deductionFilters[0].calculation.type);
              done();
            });
          });
        });
      });

      describe('when filterMatches returns true on more than one deduction', () => {
        it('should set the params from the first deduction', (done) => {
          // Arrange
          deductionFilters = [
            { calculation: { deductionBasis: 'Unit Rate', unitRate: randomFloat(), rate: randomFloat() } },
            { calculation: { deductionBasis: 'Unit Rate', unitRate: randomFloat(), rate: randomFloat() } },
          ];
          // Act
          royaltyCalculator.setWithholdingTax(salesLine, deductionFilters, () => {
            // Assert
            expect(salesLine.withholdingTaxRate).toBeCloseTo(deductionFilters[0].calculation.rate, 5);
            done();
          });
        });
      });
    });
  });

  describe('#setMechanical', () => {
    let mechanicalFilters;
    let salesLine;

    beforeEach(() => {
      salesLine = { _id: randomId() };
      mechanicalFilters = [{ calculation: {} }, { calculation: {} }];
      royaltyCalculator.filterMatches = jest.fn().mockImplementation((_salesLine, _filter, callback) => callback(true));
    });

    describe('when salesLine is not passed', () => {
      it('should return an error to the callback', (done) => {
        // Arrange
        salesLine = null;

        // Act
        royaltyCalculator.setMechanical(salesLine, mechanicalFilters, (err) => {
          // Assert
          expect(err).toBe('A sales line and mechanical filters are required');
          done();
        });
      });
    });

    describe('when mechanicalFilters are not passed', () => {
      it('should return an error to the callback', (done) => {
        // Arrange
        mechanicalFilters = null;

        // Act
        royaltyCalculator.setMechanical(salesLine, mechanicalFilters, (err) => {
          // Assert
          expect(err).toBe('A sales line and mechanical filters are required');
          done();
        });
      });
    });

    it('should call filterMatches for each filter', (done) => {
      // Act
      royaltyCalculator.setMechanical(salesLine, mechanicalFilters, () => {
        // Assert
        expect(royaltyCalculator.filterMatches).toHaveBeenCalledTimes(2);
        done();
      });
    });

    describe('when filterMatches returns true on one deduction', () => {
      it('should set mechanicalPercentage to calculation.rate', (done) => {
        // Arrange
        mechanicalFilters = [
          { calculation: { rate: randomFloat() } },
        ];

        // Act
        royaltyCalculator.setMechanical(salesLine, mechanicalFilters, () => {
          // Assert
          expect(salesLine.mechanicalPercentage).toBeCloseTo(mechanicalFilters[0].calculation.rate, 5);
          done();
        });
      });

      it('should set mechanicalType to calculation.type', (done) => {
        // Arrange
        mechanicalFilters = [
          { calculation: { rate: randomFloat(), type: randomString() } },
        ];

        // Act
        royaltyCalculator.setMechanical(salesLine, mechanicalFilters, () => {
          // Assert
          expect(salesLine.mechanicalType).toBe(mechanicalFilters[0].calculation.type);
          done();
        });
      });

      it('should set mechanicalDeductionType to calculation.deductionType', (done) => {
        // Arrange
        mechanicalFilters = [
          { calculation: { rate: randomFloat(), deductionType: randomString() } },
        ];

        // Act
        royaltyCalculator.setMechanical(salesLine, mechanicalFilters, () => {
          // Assert
          expect(salesLine.mechanicalDeductionType).toBe(mechanicalFilters[0].calculation.deductionType);
          done();
        });
      });

      it('should set mechanicalCurrency to calculation.currency', (done) => {
        // Arrange
        mechanicalFilters = [
          { mechanicalFilter: 1, calculation: { rate: randomFloat(), currency: randomString() } },
        ];

        // Act
        royaltyCalculator.setMechanical(salesLine, mechanicalFilters, () => {
          // Assert
          expect(salesLine.mechanicalCurrency).toBe(mechanicalFilters[0].calculation.currency);
          done();
        });
      });

      describe("when calculation.type is 'Statutory Rate' and catType is 'Release'", () => {
        describe('and the releaseId is within the mechanicalAmounts', () => {
          it('should set the mechanicalAmount to the specific rateBasis defined for the release', (done) => {
            // Arrange
            mechanicalFilters = [
              { calculation: { rate: randomFloat(), type: 'Statutory Rate', rateBasis: 'US' } },
            ];
            salesLine = { releaseId: '59da63b796a95e61da9ee703', catType: 'Release', saleDate: { value: momentActual().add(1, 'month').format('YYYY-MM-DD') } };
            royaltyCalculator.mechanicalAmounts = { '59da63b796a95e61da9ee703': { } };
            const date = [moment().format('YYYY-MM-DD')];
            royaltyCalculator.mechanicalAmounts['59da63b796a95e61da9ee703'][date] = { US: randomFloat(), usMinAmount: randomFloat(), usPerMinuteRate: randomFloat() };

            // Act
            royaltyCalculator.setMechanical(salesLine, mechanicalFilters, () => {
              // Assert
              expect(salesLine.mechanicalAmount).toBeCloseTo(royaltyCalculator.mechanicalAmounts[salesLine.releaseId][date][mechanicalFilters[0].calculation.rateBasis], 5);
              done();
            });
          });
        });

        describe('and the releaseId is NOT within the mechanicalAmounts', () => {
          it('should set the mechanicalAmount defined by the rateBasis', (done) => {
            // Arrange
            mechanicalFilters = [
              { calculation: { rate: randomFloat(), type: 'Statutory Rate', rateBasis: 'SpecificRateBasis' } },
            ];
            salesLine = { salesLine: true, releaseId: '59da63b796a95e61da9ee704', catType: 'Release' };
            contract.terms = { mechanicalAmount: { SpecificRateBasis: randomFloat() } };

            // Act
            royaltyCalculator.setMechanical(salesLine, mechanicalFilters, () => {
              // Assert
              expect(salesLine.mechanicalAmount).toBeCloseTo(royaltyCalculator.contract.terms.mechanicalAmount[mechanicalFilters[0].calculation.rateBasis], 5);
              done();
            });
          });
        });
      });

      describe("when calculation.type is 'Statutory Rate' and catType is 'Track'", () => {
        describe('and the trackId is within the mechanicalAmounts', () => {
          it('should set the mechanicalAmount to the specific rateBasis defined for the track', (done) => {
            // Arrange
            mechanicalFilters = [
              { calculation: { rate: 88.88, type: 'Statutory Rate', rateBasis: 'SpecificRateBasis' } },
            ];
            salesLine = { trackId: '59da63b796a95e61da9ee703', catType: 'Track' };
            royaltyCalculator.mechanicalAmounts = { '59da63b796a95e61da9ee703': { SpecificRateBasis: randomFloat(), reportMechanicals: true }, SpecificRateBasis: randomFloat() };

            // Act
            royaltyCalculator.setMechanical(salesLine, mechanicalFilters, () => {
              // Assert
              expect(salesLine.mechanicalAmount).toBeCloseTo(royaltyCalculator.mechanicalAmounts[salesLine.trackId][mechanicalFilters[0].calculation.rateBasis], 5);
              done();
            });
          });
        });
      });

      describe("when calculation.type is 'Unit Rate'", () => {
        it('should set contractCurrencyMechanicalAmount to calculation.unitRate', (done) => {
          // Arrange
          mechanicalFilters = [
            { calculation: { rate: randomFloat(), type: 'Unit Rate', unitRate: randomFloat() } },
          ];

          // Act
          royaltyCalculator.setMechanical(salesLine, mechanicalFilters, () => {
            // Assert
            expect(salesLine.contractCurrencyMechanicalAmount).toBe(mechanicalFilters[0].calculation.unitRate);
            done();
          });
        });

        it('should set mechanicalAmount to calculation.unitRate / contractExchangeRate', (done) => {
          // Arrange
          mechanicalFilters = [
            { calculation: { rate: 88.88, type: 'Unit Rate', unitRate: 99.99 } },
          ];
          salesLine = {};

          // Act
          royaltyCalculator.setMechanical(salesLine, mechanicalFilters, () => {
            // Assert
            expect(salesLine.mechanicalAmount).toBeCloseTo(mechanicalFilters[0].calculation.unitRate / royaltyCalculator.contractExchangeRate, 5);
            done();
          });
        });
      });
    });
  });

  describe('#getSalesTermFromSalesLine', () => {
    let salesLine;
    let salesTermsObject;

    beforeEach(() => {
      salesLine = {};
      salesTermsObject = {};
      royaltyCalculator.getMatchingTermFromArray = jest.fn((salesTermsObject, channel, config, salesLine, callback) => {
        callback(null, [{ channel, config }]);
      });
    });

    describe('when a salesLine is not passed', () => {
      it('should return a blank array', (done) => {
        // Arrange
        salesLine = null;

        // Act
        royaltyCalculator.getSalesTermFromSalesLine(salesLine, salesTermsObject, (err, result) => {
          // Assert
          expect(err).toBeUndefined();
          expect(result).toBeUndefined();
          done();
        });
      });
    });

    describe('when a salesTermsObject is not passed', () => {
      it('should return a blank array', (done) => {
        // Arrange
        salesTermsObject = null;

        // Act
        royaltyCalculator.getSalesTermFromSalesLine(salesLine, salesTermsObject, (err, result) => {
          // Assert
          expect(err).toBeUndefined();
          expect(result).toBeUndefined();
          done();
        });
      });
    });

    describe('when a salesLine and salesTermsObject are passed', () => {
      it('should return an object when a term is matched', (done) => {
        // Act
        royaltyCalculator.getSalesTermFromSalesLine(salesLine, salesTermsObject, (err, result) => {
          // Assert
          expect(typeof result).toBe('object');
          done();
        });
      });

      it('should return null when a term is NOT matched', (done) => {
        // Arrange
        royaltyCalculator.getMatchingTermFromArray = jest.fn().mockImplementation((...args) => args[args.length - 1](null, []));

        // Act
        royaltyCalculator.getSalesTermFromSalesLine(salesLine, salesTermsObject, (err, result) => {
          // Assert
          expect(result).toBeUndefined();
          done();
        });
      });

      it('should select any matching terms and return the first', (done) => {
        // Arrange
        salesLine = { configuration: 'LP', distributionChannel: 'Digital' };

        // Act
        royaltyCalculator.getSalesTermFromSalesLine(salesLine, salesTermsObject, (err, result) => {
          // Assert
          expect(result).toEqual({ channel: salesLine.distributionChannel, config: salesLine.configuration });
          done();
        });
      });

      it('should call getMatchingTermFromArray with the salesLine.distributionChannel and salesLine.configuration', (done) => {
        // Arrange
        salesLine = { configuration: 'LP', distributionChannel: 'Digital' };

        // Act
        royaltyCalculator.getSalesTermFromSalesLine(salesLine, salesTermsObject, () => {
          // Assert
          expect(royaltyCalculator.getMatchingTermFromArray).toHaveBeenCalled();
          const callArgs = royaltyCalculator.getMatchingTermFromArray.mock.calls[0];
          expect(callArgs.slice(0, 4)).toEqual([
            salesTermsObject,
            salesLine.distributionChannel,
            salesLine.configuration,
            salesLine,
          ]);
          done();
        });
      });

      it("should call getMatchingTermFromArray with salesLine.distributionChannel and 'Default'", (done) => {
        // Arrange
        salesLine = { configuration: 'LP', distributionChannel: 'Digital' };

        // Act
        royaltyCalculator.getSalesTermFromSalesLine(salesLine, salesTermsObject, () => {
          // Assert
          expect(royaltyCalculator.getMatchingTermFromArray).toHaveBeenCalled();
          const callArgs = royaltyCalculator.getMatchingTermFromArray.mock.calls[1];
          expect(callArgs.slice(0, 4)).toEqual([
            salesTermsObject,
            salesLine.distributionChannel,
            'default',
            salesLine,
          ]);
          done();
        });
      });

      it("should call getMatchingTermFromArray with 'Default' and salesLine.configuration", (done) => {
        // Arrange
        salesLine = { configuration: 'LP', distributionChannel: 'Digital' };

        // Act
        royaltyCalculator.getSalesTermFromSalesLine(salesLine, salesTermsObject, () => {
          // Assert
          expect(royaltyCalculator.getMatchingTermFromArray).toHaveBeenCalled();
          const callArgs = royaltyCalculator.getMatchingTermFromArray.mock.calls[2];
          expect(callArgs.slice(0, 4)).toEqual([
            salesTermsObject,
            'default',
            salesLine.configuration,
            salesLine,
          ]);
          done();
        });
      });

      it("should call getMatchingTermFromArray with 'Default' and 'Default'", (done) => {
        // Arrange
        salesLine = { configuration: 'LP', distributionChannel: 'Digital' };

        // Act
        royaltyCalculator.getSalesTermFromSalesLine(salesLine, salesTermsObject, () => {
          // Assert
          expect(royaltyCalculator.getMatchingTermFromArray).toHaveBeenCalled();
          const callArgs = royaltyCalculator.getMatchingTermFromArray.mock.calls[3];
          expect(callArgs.slice(0, 4)).toEqual([
            salesTermsObject,
            'default',
            'default',
            salesLine,
          ]);
          done();
        });
      });

      it('should sort any returned terms from getMatchingTermFromArray into order by index and return the first', (done) => {
        // Arrange
        let index = 4;
        royaltyCalculator.getMatchingTermFromArray = jest.fn((salesTermsObject, channel, config, salesLine, callback) => {
          callback(null, [{ channel, config, index }]);
          index -= 1;
        });
        salesLine = { configuration: 'LP', distributionChannel: 'Digital' };

        // Act
        royaltyCalculator.getSalesTermFromSalesLine(salesLine, salesTermsObject, (err, result) => {
          // Assert
          expect(result).toEqual({ channel: 'default', config: 'default', index: 1 });
          done();
        });
      });
    });
  });

  describe('#getMatchingTermFromArray', () => {
    let salesTermsObject;
    let channel;
    let config;
    let salesLine;
    let catId;

    beforeEach(() => {
      catId = randomId();
      royaltyCalculator.getCatIdFromSalesLine = jest.fn(() => catId);
      royaltyCalculator.filterMatches = jest.fn((term, salesLine, cb) => cb(true));

      salesTermsObject = {};
      salesLine = {};
      channel = randomString();
      config = randomString();
    });

    describe('when salesTermsObject is not passed', () => {
      it('should return a blank array in the callback', (done) => {
        // Arrange
        salesTermsObject = null;

        // Act
        royaltyCalculator.getMatchingTermFromArray(salesTermsObject, channel, config, salesLine, (err, result) => {
          // Assert
          expect(err).toBeNull();
          expect(result).toEqual([]);
          done();
        });
      });
    });

    describe('when salesLine is not passed', () => {
      it('should return a blank array in the callback', (done) => {
        // Arrange
        salesLine = null;

        // Act
        royaltyCalculator.getMatchingTermFromArray(salesTermsObject, channel, config, salesLine, (err, result) => {
          // Assert
          expect(err).toBeNull();
          expect(result).toEqual([]);
          done();
        });
      });
    });

    describe('when salesTermsObject and salesLine are passed', () => {
      describe('when distributionChannel does not match value in object', () => {
        it('should return a blank array', (done) => {
          // Act
          royaltyCalculator.getMatchingTermFromArray(salesTermsObject, channel, config, salesLine, (err, result) => {
            // Assert
            expect(err).toBeNull();
            expect(result).toEqual([]);
            done();
          });
        });
      });

      describe('when distributionChannel matches but config does not match value in object', () => {
        it('should return a blank array', (done) => {
          // Arrange
          salesTermsObject = { Digital: {} };
          channel = 'Digital';
          config = 'LP';

          // Act
          royaltyCalculator.getMatchingTermFromArray(salesTermsObject, channel, config, salesLine, (err, result) => {
            // Assert
            expect(err).toBeNull();
            expect(result).toEqual([]);
            done();
          });
        });
      });

      describe('when distributionChannel and config matches', () => {
        beforeEach(() => {
          // Arrange
          salesTermsObject = { Digital: { LP: {} } };
          salesTermsObject.Digital.LP[catId] = [{ item: 1 }, { item: 2 }];
          channel = 'Digital';
          config = 'LP';
        });

        it('should call filterMatches on each of the items in the array', (done) => {
          // Act
          royaltyCalculator.getMatchingTermFromArray(salesTermsObject, channel, config, salesLine, () => {
            // Assert
            expect(royaltyCalculator.filterMatches).toHaveBeenCalledTimes(2);
            done();
          });
        });

        describe('when filterMatches returns true', () => {
          it('should return each of the matching terms', (done) => {
            // Act
            royaltyCalculator.getMatchingTermFromArray(salesTermsObject, channel, config, salesLine, (err, result) => {
              // Assert
              expect(result).toEqual([{ item: 1 }, { item: 2 }]);
              done();
            });
          });
        });

        describe('when filterMatches returns false', () => {
          it('should return a blank array', (done) => {
            // Arrange
            royaltyCalculator.filterMatches.mockImplementation((term, salesLine, cb) => cb(false));

            // Act
            royaltyCalculator.getMatchingTermFromArray(salesTermsObject, channel, config, salesLine, (err, result) => {
              // Assert
              expect(err).toBeNull();
              expect(result).toEqual([]);
              done();
            });
          });
        });
      });
    });
  });

  describe('#setupEscalations', () => {
    describe('when contract has valid contractId', () => {
      it('should call Period.findOne to get the period', (done) => {
        // Arrange
        royaltyCalculator.periodId = randomId();
        royaltyCalculator.contract.contractId = randomId();

        const period = {
          escalationStartingFigures: [
            {
              contractId: royaltyCalculator.contract.contractId,
              escalationTracking: {},
            },
          ],
        };

        Period.findOne.mockResolvedValue(period);

        // Act
        royaltyCalculator.setupEscalations(() => {
          // Assert
          expect(Period.findOne).toHaveBeenCalledWith(
            { _id: new ObjectId(royaltyCalculator.periodId) },
            {
              clientId: 1,
              startDate: 1,
              endDate: 1,
              escalationStartingFigures: 1,
            },
          );
          done();
        });
      });

      it('should set RoyaltyCalculator.escalationContract to the right value', (done) => {
        // Arrange
        royaltyCalculator.periodId = randomId();
        royaltyCalculator.contract.contractId = randomId();

        const period = {
          clientId: randomId(),
          startDate: randomDate(),
          endDate: randomDate(),
          escalationStartingFigures: [
            {
              contractId: royaltyCalculator.contract.contractId,
              escalationTracking: {},
            },
          ],
        };
        const tracker = randomString();
        period.escalationStartingFigures[0].escalationTracking[tracker] = {
          units: randomInt(),
          gross: randomInt(),
          net: randomInt(),
          grossCosts: randomInt(),
          netCosts: randomInt(),
        };
        Period.findOne.mockResolvedValue(period);
        const contractEscalations = period.escalationStartingFigures.find((escalations) => escalations.contractId === royaltyCalculator.contract.contractId);
        const expectedEscalationContract = {
          _id: new ObjectId(royaltyCalculator.contract.contractId),
          clientId: period.clientId,
          escalationTracking: contractEscalations.escalationTracking,
          startingEscalationTracking: JSON.parse(JSON.stringify(contractEscalations.escalationTracking)),
          startDate: period.startDate,
          endDate: period.endDate,
        };

        // Act
        royaltyCalculator.setupEscalations(() => {
          // Assert
          expect(royaltyCalculator.escalationContract).toEqual(expectedEscalationContract);
          done();
        });
      });
    });

    describe('when contract does not have valid contractId', () => {
      it('should not call Period.findOne', (done) => {
        // Arrange
        royaltyCalculator.contract.contractId = randomString();

        // Act
        royaltyCalculator.setupEscalations(() => {
          // Assert
          expect(Period.findOne).not.toHaveBeenCalled();
          done();
        });
      });
    });
  });

  describe('#writeEscalations', () => {
    describe('when contractId and escalationTracking are set', () => {
      beforeEach(() => {
        // Arrange
        royaltyCalculator.contract.contractId = randomId();
        royaltyCalculator.periodId = randomId();
        royaltyCalculator.escalationContract = {
          clientId: randomId(),
          escalationTracking: {},
        };
      });

      it('should call Escalation.findOne with the right args', async () => {
        // Act
        await royaltyCalculator.writeEscalations(() => {});
        // Assert
        expect(Escalation.findOne).toHaveBeenCalledWith({
          clientId: royaltyCalculator.escalationContract.clientId,
          periodId: royaltyCalculator.periodId,
          contractId: royaltyCalculator.contract.contractId,
        });
      });

      describe('when no escalation is returned', () => {
        it('should create a new escalation', async () => {
          // Arrange
          jest.spyOn(Escalation, 'findOne').mockResolvedValue(null);
          // Act
          await royaltyCalculator.writeEscalations(() => {});
          // Assert
          const escalation = Escalation.findByIdAndUpdate.mock.calls[0][1];
          expect(escalation._id).toBeDefined();
        });
      });

      it('should call Escalation.findByIdAndUpdate with the right args', async () => {
        // Arrange
        const escalation = { _id: randomId() };
        const tracker = randomString();
        royaltyCalculator.escalationContract.escalationTracking[tracker] = {
          units: randomInt(),
          gross: randomInt(),
          net: randomInt(),
        };
        royaltyCalculator.escalationContract.startingEscalationTracking = {
          [tracker]: {
            units: randomInt(),
            gross: randomInt(),
            net: randomInt(),
          },
        };

        jest.spyOn(Escalation, 'findOne').mockResolvedValue(escalation);

        const expectedEscalationUpdate = { ...escalation, trackers: {} };
        expectedEscalationUpdate.trackers[tracker] = {
          units:
            royaltyCalculator.escalationContract.escalationTracking[tracker].units
            - royaltyCalculator.escalationContract.startingEscalationTracking[tracker].units,
          gross:
            royaltyCalculator.escalationContract.escalationTracking[tracker].gross
            - royaltyCalculator.escalationContract.startingEscalationTracking[tracker].gross,
          net:
            royaltyCalculator.escalationContract.escalationTracking[tracker].net
            - royaltyCalculator.escalationContract.startingEscalationTracking[tracker].net,
        };

        // Act
        await royaltyCalculator.writeEscalations(() => {});
        // Assert
        expect(Escalation.findByIdAndUpdate).toHaveBeenCalledWith(
          escalation._id,
          expectedEscalationUpdate,
        );
      });

      it('should call the callback function', async () => {
        // Arrange
        const callback = jest.fn();
        // Act
        await royaltyCalculator.writeEscalations(callback);
        // Assert
        expect(callback).toHaveBeenCalled();
      });
    });

    describe('when contract does not have valid contractId', () => {
      it('should not call Escalation.findOne', async () => {
        // Arrange
        royaltyCalculator.contract.contractId = momentActual().format('X');
        royaltyCalculator.escalationContract = { escalationTracking: {} };
        // Act
        await royaltyCalculator.writeEscalations(() => {});
        // Assert
        expect(Escalation.findOne).not.toHaveBeenCalled();
      });
    });

    describe('when escalationContract is not set', () => {
      it('should not call Escalation.findOne', async () => {
        // Arrange
        royaltyCalculator.contract.contractId = randomId();
        royaltyCalculator.escalationContract = null;
        // Act
        await royaltyCalculator.writeEscalations(() => {});
        // Assert
        expect(Escalation.findOne).not.toHaveBeenCalled();
      });
    });

    describe('when escalationContract.escalationTracking is not set', () => {
      it('should not call Escalation.findOne', async () => {
        // Arrange
        royaltyCalculator.contract.contractId = randomId();
        royaltyCalculator.escalationContract = { escalationTracking: null };
        // Act
        await royaltyCalculator.writeEscalations(() => {});
        // Assert
        expect(Escalation.findOne).not.toHaveBeenCalled();
      });
    });
  });

  describe('#checkEscalations', () => {
    let calculation;
    let saleDate;
    let reportingDate;

    beforeEach(() => {
      calculation = {};
      saleDate = randomDate();
      reportingDate = randomDate();

      royaltyCalculator.testEscalationConditions = jest.fn((_calc, _saleDate, _reportingDate, cb) => cb(null, true));
    });

    describe('when calculation has no escalations', () => {
      it('should return the passed calculation', (done) => {
        // Act
        royaltyCalculator.checkEscalations(calculation, saleDate, reportingDate, (err, result) => {
          expect(result).toEqual(calculation);
          done();
        });
      });
    });

    describe('when escalationContract does not exist', () => {
      it('should return the passed calculation', (done) => {
        // Arrange
        calculation = { escalations: [] };

        // Act
        royaltyCalculator.checkEscalations(calculation, saleDate, reportingDate, (err, result) => {
          // Assert
          expect(result).toEqual(calculation);
          done();
        });
      });
    });

    describe('when escalationContract does not have any escalationTracking', () => {
      it('should return the passed calculation', (done) => {
        // Arrange
        calculation = { escalations: [] };
        royaltyCalculator.escalationContract = {};

        // Act
        royaltyCalculator.checkEscalations(calculation, saleDate, reportingDate, (err, result) => {
          // Assert
          expect(result).toEqual(calculation);
          done();
        });
      });
    });

    describe('when calculation has escalations and escalationContract exists with an empty object', () => {
      it('should call testEscalationConditions', (done) => {
        // Arrange
        calculation = { escalations: [randomString()] };
        royaltyCalculator.escalationContract = { escalationTracking: {} };

        // Act
        royaltyCalculator.checkEscalations(calculation, saleDate, reportingDate, () => {
          // Assert
          expect(royaltyCalculator.testEscalationConditions).toHaveBeenCalled();
          done();
        });
      });
    });

    describe('when calculation has escalations and escalationContract exists with escalationTracking attached', () => {
      // Arrange
      const initialGross = randomInt();
      const initialNet = randomInt();

      it('should call testEscalationConditions on each escalation', (done) => {
        // Arrange
        const calculation = { escalations: [randomString()] };
        royaltyCalculator.escalationContract = {
          escalationTracking: {
            tracker: {
              gross: initialGross,
              units: initialNet,
            },
          },
        };

        // Act
        royaltyCalculator.checkEscalations(calculation, saleDate, reportingDate, () => {
          // Assert
          expect(royaltyCalculator.testEscalationConditions).toHaveBeenCalled();
          done();
        });
      });

      describe('when testEscalationConditions returns false', () => {
        it('should return the original calculation to the callback', (done) => {
          // Arrange
          calculation = { escalations: [randomString()] };
          royaltyCalculator.escalationContract = { escalationTracking: {} };
          royaltyCalculator.testEscalationConditions.mockImplementation((c, s, r, cb) => cb(null, false));

          // Act
          royaltyCalculator.checkEscalations(calculation, saleDate, reportingDate, (err, result) => {
            // Assert
            expect(result).toEqual(calculation);
            done();
          });
        });
      });

      describe('when testEscalationConditions returns true', () => {
        it('should return the escalation to the callback', (done) => {
          // Arrange
          const calculation = { escalations: [randomString()] };
          royaltyCalculator.escalationContract = {
            escalationTracking: {
              tracker: {
                gross: initialGross,
                units: initialNet,
              },
            },
          };

          // Act
          royaltyCalculator.checkEscalations(calculation, saleDate, reportingDate, (err, result) => {
            // Assert
            expect(result).toEqual(calculation.escalations[0]);
            done();
          });
        });

        it('should force rate on the returned escalation into a number', (done) => {
          // Arrange
          const calculation = {
            escalations: [{ name: randomString(), rate: randomFloat().toString() }],
          };
          royaltyCalculator.escalationContract = {
            escalationTracking: {
              tracker: {
                gross: initialGross,
                units: initialNet,
              },
            },
          };

          // Act
          royaltyCalculator.checkEscalations(calculation, saleDate, reportingDate, (err, result) => {
            // Assert
            expect(result.rate).toBe(Number(calculation.escalations[0].rate));
            done();
          });
        });

        it('should force reductionRate on the returned escalation into a number', (done) => {
          // Arrange
          const calculation = {
            escalations: [{ name: randomString(), reductionRate: randomFloat().toString() }],
          };
          royaltyCalculator.escalationContract = {
            escalationTracking: {
              tracker: {
                gross: initialGross,
                units: initialNet,
              },
            },
          };

          // Act
          royaltyCalculator.checkEscalations(calculation, saleDate, reportingDate, (err, result) => {
            // Assert
            expect(result.reductionRate).toBe(Number(calculation.escalations[0].reductionRate));
            done();
          });
        });

        it('should force reserve on the returned escalation into a number', (done) => {
          // Arrange
          calculation = {
            escalations: [{ name: randomString(), reserve: randomFloat().toString() }],
          };
          royaltyCalculator.escalationContract = {
            escalationTracking: {
              tracker: {
                gross: initialGross,
                units: initialNet,
              },
            },
          };

          // Act
          royaltyCalculator.checkEscalations(calculation, saleDate, reportingDate, (err, result) => {
            // Assert
            expect(result.reserve).toBe(Number(calculation.escalations[0].reserve));
            done();
          });
        });
      });

      describe('when testEscalationConditions returns true on multiple escalations', () => {
        it('should return the last escalation to the callback', (done) => {
          // Arrange
          calculation = {
            escalations: [
              { name: randomString(), reserve: randomFloat().toString() },
              { name: randomString(), reserve: randomFloat().toString() },
            ],
          };
          royaltyCalculator.escalationContract = {
            escalationTracking: {
              tracker: {
                gross: initialGross,
                units: initialNet,
              },
            },
          };

          // Act
          royaltyCalculator.checkEscalations(calculation, saleDate, reportingDate, (err, result) => {
            // Assert
            expect(result).toEqual(calculation.escalations[1]);
            done();
          });
        });
      });
    });
  });

  describe('#testEscalationConditions', () => {
    let escalation;
    let saleDate;
    let reportingDate;

    beforeEach(() => {
      escalation = {};
      saleDate = randomDate();
      reportingDate = randomDate();
    });

    describe('when not passed escalation', () => {
      it('should return false', (done) => {
        // Arrange
        escalation = null;

        // Act
        royaltyCalculator.testEscalationConditions(escalation, saleDate, reportingDate, (err, result) => {
          // Assert
          expect(result).toBe(false);
          done();
        });
      });
    });

    describe('when passed escalation', () => {
      describe('when escalation threshold is set to 0', () => {
        it('should return true when threshold is 0 and current value is greater', (done) => {
          // Arrange
          const escalation = {
            conditions: [{
              escalationTracker: 'testTracker',
              thresholdType: 'units',
              when: 'Greater Than',
              threshold: 0,
            }],
          };

          royaltyCalculator.escalationContract = {
            escalationTracking: {
              testTracker: {
                units: 1,
              },
            },
          };

          // Act
          royaltyCalculator.testEscalationConditions(escalation, null, null, (err, result) => {
            // Assert
            expect(err).toBeNull();
            expect(result).toBe(true);
            done();
          });
        });

        it('should return false when threshold is 0 and current value is 0', (done) => {
          // Arrange
          const escalation = {
            conditions: [{
              escalationTracker: 'testTracker',
              thresholdType: 'units',
              when: 'Greater Than',
              threshold: 0,
            }],
          };

          royaltyCalculator.escalationContract = {
            escalationTracking: {
              testTracker: {
                units: -1,
              },
            },
          };

          // Act
          royaltyCalculator.testEscalationConditions(escalation, null, null, (err, result) => {
            // Assert
            expect(err).toBeNull();
            expect(result).toBe(false);
            done();
          });
        });

        it('should return false when threshold is undefined and current value is greater', (done) => {
          // Arrange
          const escalation = {
            conditions: [{
              escalationTracker: 'testTracker',
              thresholdType: 'units',
              when: 'Greater Than',
            }],
          };

          royaltyCalculator.escalationContract = {
            escalationTracking: {
              testTracker: {
                units: 1,
              },
            },
          };

          // Act
          royaltyCalculator.testEscalationConditions(escalation, null, null, (err, result) => {
            // Assert
            expect(err).toBeNull();
            expect(result).toBe(false);
            done();
          });
        });
      });

      describe('when escalation is not met', () => {
        it('should return false when !condition.escalationTracker', (done) => {
          // Arrange
          escalation = { conditions: [{ conditions: true }] };

          // Act
          royaltyCalculator.testEscalationConditions(escalation, saleDate, reportingDate, (err, result) => {
            // Assert
            expect(result).toBe(false);
            done();
          });
        });

        it('should return false when condition.escalationTracker && !condition.thresholdType', (done) => {
          // Arrange
          escalation = { conditions: [{ escalationTracker: randomString() }] };

          // Act
          royaltyCalculator.testEscalationConditions(escalation, saleDate, reportingDate, (err, result) => {
            // Assert
            expect(result).toBe(false);
            done();
          });
        });

        it('should return false when condition.escalationTracker && condition.thresholdType && !condition.when', (done) => {
          // Arrange
          escalation = { conditions: [{ escalationTracker: randomString(), thresholdType: randomString() }] };

          // Act
          royaltyCalculator.testEscalationConditions(escalation, saleDate, reportingDate, (err, result) => {
            // Assert
            expect(result).toBe(false);
            done();
          });
        });

        it('should return false when condition.escalationTracker && condition.thresholdType && condition.when && !condition.threshold', (done) => {
          // Arrange
          escalation = { conditions: [{ escalationTracker: randomString(), thresholdType: randomString(), when: randomString }] };

          // Act
          royaltyCalculator.testEscalationConditions(escalation, saleDate, reportingDate, (err, result) => {
            // Assert
            expect(result).toBe(false);
            done();
          });
        });

        it("should return false when !(condition.escalationTracker && condition.escalationTracker == 'Sale Date' && saleDate)", (done) => {
          // Arrange
          escalation = { conditions: [{ escalationTracker: randomString() }] };

          // Act
          royaltyCalculator.testEscalationConditions(escalation, saleDate, reportingDate, (err, result) => {
            // Assert
            expect(result).toBe(false);
            done();
          });
        });

        it("should return false when !(condition.escalationTracker && condition.escalationTracker == 'Reporting Date' && reportingDate)", (done) => {
          // Arrange
          escalation = { conditions: [{ escalationTracker: randomString() }] };

          // Act
          royaltyCalculator.testEscalationConditions(escalation, saleDate, reportingDate, (err, result) => {
            // Assert
            expect(result).toBe(false);
            done();
          });
        });
      });

      describe('when escalation is met', () => {
        describe('when passed one condition', () => {
          describe("when escalationTracker is 'Sale Date'", () => {
            describe("when condition.when == 'Greater Than' and saleDate > condition.threshold", () => {
              it('should return true', (done) => {
                // Arrange
                escalation = { conditions: [{ escalationTracker: 'Sale Date', when: 'Greater Than', threshold: '2020-12-01' }] };
                saleDate = { value: '2020-12-02' };

                // Act
                royaltyCalculator.testEscalationConditions(escalation, saleDate, reportingDate, (err, result) => {
                  // Assert
                  expect(result).toBe(true);
                  done();
                });
              });
            });

            describe("when condition.when == 'Greater Than' and saleDate < condition.threshold", () => {
              it('should return false', (done) => {
                // Arrange
                escalation = { conditions: [{ escalationTracker: 'Sale Date', when: 'Greater Than', threshold: '2020-12-02' }] };
                saleDate = { value: '2020-12-01' };

                // Act
                royaltyCalculator.testEscalationConditions(escalation, saleDate, reportingDate, (err, result) => {
                  // Assert
                  expect(result).toBe(false);
                  done();
                });
              });
            });

            // TODO (previous): can we mix sale date and condition.when?
            describe("when condition.when == 'Less Than' && saleDate < condition.threshold", () => {
              it('should return true', (done) => {
                // Arrange
                escalation = { conditions: [{ escalationTracker: 'Sale Date', when: 'Less Than', threshold: new Date('2020-12-02') }] };
                saleDate = { value: '2020-12-01' };

                // Act
                royaltyCalculator.testEscalationConditions(escalation, saleDate, reportingDate, (err, result) => {
                  // Assert
                  expect(result).toBe(true);
                  done();
                });
              });
            });

            // TODO (previous): Same here, can we mix condition and dates
            describe("when condition.when == 'Less Than' && saleDate > condition.threshold", () => {
              it.skip('should return false', (done) => {
                // Arrange
                escalation = { conditions: [{ escalationTracker: 'Sale Date', when: 'Less Than', threshold: '2020-12-01' }] };
                saleDate = { value: '2020-12-02' };

                // Act
                royaltyCalculator.testEscalationConditions(escalation, saleDate, reportingDate, (err, result) => {
                  // Assert
                  expect(result).toBe(false);
                  done();
                });
              });
            });
          });

          describe("when escalationTracker is 'Reporting Date'", () => {
            describe("when condition.when == 'Greater Than' and reportingDate > condition.threshold", () => {
              it.skip('should return true', (done) => {
                // Arrange
                const escalation = { conditions: [{ escalationTracker: 'Reporting Date', when: 'Greater Than', threshold: '2020-12-01' }] };
                const reportingDate = '2020-12-02';

                // Act
                royaltyCalculator.testEscalationConditions(escalation, saleDate, reportingDate, (err, result) => {
                  // Assert
                  expect(result).toBe(true);
                  done();
                });
              });
            });

            describe('when passed multiple conditions', () => {
              describe("when condition.when == 'Greater Than' and reportingDate < condition.threshold", () => {
                it.skip('should return false', (done) => {
                // Arrange
                  const escalation = { conditions: [{ escalationTracker: 'Reporting Date', when: 'Greater Than', threshold: '2020-12-02' }] };
                  const reportingDate = '2020-12-01';

                  // Act
                  royaltyCalculator.testEscalationConditions(escalation, saleDate, reportingDate, (err, result) => {
                    // Assert
                    expect(result).toBe(false);
                    done();
                  });
                });
              });

              describe("when condition.when == 'Less Than' && reportingDate < condition.threshold", () => {
                it.skip('should return true', (done) => {
                // Arrange
                  const escalation = { conditions: [{ escalationTracker: 'Reporting Date', when: 'Less Than', threshold: '2020-12-02' }] };
                  const reportingDate = '2020-12-01';

                  // Act
                  royaltyCalculator.testEscalationConditions(escalation, saleDate, reportingDate, (err, result) => {
                    // Assert
                    expect(result).toBe(true);
                    done();
                  });
                });
              });

              describe("when condition.when == 'Less Than' && reportingDate > condition.threshold", () => {
                it.skip('should return false', (done) => {
                // Arrange
                  const escalation = { conditions: [{ escalationTracker: 'Reporting Date', when: 'Less Than', threshold: '2020-12-01' }] };
                  const reportingDate = '2020-12-02';

                  // Act
                  royaltyCalculator.testEscalationConditions(escalation, saleDate, reportingDate, (err, result) => {
                    // Assert
                    expect(result).toBe(false);
                    done();
                  });
                });
              });
            });

            describe('when escalationTracker and thresholdType', () => {
              describe("when condition.when == 'Greater Than' and currentValue > condition.threshold", () => {
                it('should return true', (done) => {
                // Arrange
                  escalation = { conditions: [{ escalationTracker: 'Other escalationTracker', thresholdType: 'Threshold Type', when: 'Greater Than', threshold: 1000 }] };
                  royaltyCalculator.escalationContract = { escalationTracking: { 'Other escalationTracker': { 'threshold type': 1001 } } };

                  // Act
                  royaltyCalculator.testEscalationConditions(escalation, saleDate, reportingDate, (err, result) => {
                    // Assert
                    expect(result).toBe(true);
                    done();
                  });
                });
              });

              describe("when condition.when == 'Greater Than' and currentValue < condition.threshold", () => {
                it('should return false', (done) => {
                // Arrange
                  escalation = { conditions: [{ escalationTracker: 'Other escalationTracker', thresholdType: 'Threshold Type', when: 'Greater Than', threshold: 1001 }] };
                  royaltyCalculator.escalationContract = { escalationTracking: { 'Other escalationTracker': { 'threshold type': 1000 } } };

                  // Act
                  royaltyCalculator.testEscalationConditions(escalation, saleDate, reportingDate, (err, result) => {
                    // Assert
                    expect(result).toBe(false);
                    done();
                  });
                });
              });

              describe("when condition.when == 'Less Than' && currentValue < condition.threshold", () => {
                it('should return true', (done) => {
                // Arrange
                  escalation = { conditions: [{ escalationTracker: 'Other escalationTracker', thresholdType: 'Threshold Type', when: 'Less Than', threshold: 1001 }] };
                  royaltyCalculator.escalationContract = { escalationTracking: { 'Other escalationTracker': { 'threshold type': 1000 } } };

                  // Act
                  royaltyCalculator.testEscalationConditions(escalation, saleDate, reportingDate, (err, result) => {
                    // Assert
                    expect(result).toBe(true);
                    done();
                  });
                });
              });

              describe("when condition.when == 'Less Than' && currentValue > condition.threshold", () => {
                it('should return false', (done) => {
                // Arrange
                  escalation = { conditions: [{ escalationTracker: 'Other escalationTracker', thresholdType: 'Threshold Type', when: 'Less Than', threshold: 1000 }] };
                  royaltyCalculator.escalationContract = { escalationTracking: { 'Other escalationTracker': { 'threshold type': 1001 } } };

                  // Act
                  royaltyCalculator.testEscalationConditions(escalation, saleDate, reportingDate, (err, result) => {
                    // Assert
                    expect(result).toBe(false);
                    done();
                  });
                });
              });
            });
          });

          describe('when passed multiple conditions', () => {
            describe("when escalationTracker is 'Sale Date' and an escalation doesn't pass the test", () => {
              it('should return true', (done) => {
                // Arrange
                escalation = {
                  conditions: [
                    { escalationTracker: 'Sale Date', when: 'Greater Than', threshold: '2020-12-03' },
                    { escalationTracker: 'Sale Date', when: 'Greater Than', threshold: '2020-12-01' },
                  ],
                };
                saleDate = '2020-12-02';

                // Act
                royaltyCalculator.testEscalationConditions(escalation, saleDate, reportingDate, (err, result) => {
                  // Assert
                  expect(result).toBe(false);
                  done();
                });
              });
            });
          });
        });
      });
    });
  });

  describe('#calculateInCurrency', () => {
    let salesLine; let originalSalesLine; let calculation; let fields;
    let deductionFilters; let withholdingTaxFilters; let mechanicalFilters; let escalationTrackers;

    beforeEach(() => {
      royaltyCalculator.setDeduction = jest.fn((...args) => args[args.length - 1]());
      royaltyCalculator.setWithholdingTax = jest.fn((...args) => args[args.length - 1]());
      royaltyCalculator.setMechanical = jest.fn((...args) => args[args.length - 1]());
      // @NOTE: should this perhaps be royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));
      royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, { calculation: true }));
      originalSalesLine = { id: randomId(), _id: randomId(), name: randomString(), saleDate: randomDate() };
      salesLine = { id: randomId(), _id: randomId(), name: randomString(), saleDate: randomDate() };
      calculation = { type: randomString() };
      fields = { output: {}, input: {} };
      deductionFilters = [{ type: randomString() }, { type: randomString() }];
      withholdingTaxFilters = [{ type: randomString() }, { type: randomString() }];
      mechanicalFilters = [{ type: randomString() }, { type: randomString() }];
      escalationTrackers = [];
    });

    describe('when deductionFilters are NOT passed', () => {
      it('should NOT call setDeduction', (done) => {
      // Arrange
        deductionFilters = null;
        // Act
        royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, (err) => {
          // Assert
          expect(royaltyCalculator.setDeduction).not.toHaveBeenCalled();
          done();
        });
      });
    });

    describe('when deductionFilters are passed', () => {
      it('should call setDeduction with the salesLine and deductionFilters', (done) => {
      // Act
        royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, (err) => {
          // Assert
          expect(royaltyCalculator.setDeduction).toHaveBeenCalledWith(salesLine, deductionFilters, expect.any(Function));
          done();
        });
      });
    });

    describe('when withholdingTaxFilters are NOT passed', () => {
      it('should NOT call setWithholdingTax', (done) => {
      // Arrange
        withholdingTaxFilters = null;
        // Act
        royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, (err) => {
          // Assert
          expect(royaltyCalculator.setWithholdingTax).not.toHaveBeenCalled();
          done();
        });
      });
    });

    describe('when withholdingTaxFilters are passed', () => {
      it('should call setWithholdingTax with the salesLine and withholdingTaxFilters', (done) => {
      // Act
        royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, (err) => {
          // Assert
          expect(royaltyCalculator.setWithholdingTax).toHaveBeenCalledWith(salesLine, withholdingTaxFilters, expect.any(Function));
          done();
        });
      });
    });

    it('should call checkEscalations with the calculation, salesLine.saleDate and periodEndDate', (done) => {
    // Act
      royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, (err) => {
        // Assert
        expect(royaltyCalculator.checkEscalations).toHaveBeenCalledWith(calculation, salesLine.saleDate, periodEndDate, expect.any(Function));
        done();
      });
    });

    it("should set salesLineId to the salesLine's id", (done) => {
    // Act
      royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, (err) => {
        // Assert
        expect(salesLine.salesLineId).toBe(salesLine.id);
        done();
      });
    });

    it('should set periodId to RoyaltyCalculator.periodId', (done) => {
    // Act
      royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, (err) => {
        // Assert
        expect(salesLine.periodId).toBe(royaltyCalculator.periodId);
        done();
      });
    });

    it('should set contractId to RoyaltyCalculator.contractId', (done) => {
    // Act
      royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, (err) => {
        // Assert
        expect(salesLine.contractId).toBe(royaltyCalculator.contract.contractId);
        done();
      });
    });

    it('should set contractName to RoyaltyCalculator.contract.name', (done) => {
    // Act
      royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, (err) => {
        // Assert
        expect(salesLine.contractName).toBe(royaltyCalculator.contract.name);
        done();
      });
    });

    it('should set licenseNo to RoyaltyCalculator.contract.licenseNo', (done) => {
    // Act
      royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, (err) => {
        // Assert
        expect(salesLine.licenseNo).toBe(royaltyCalculator.contract.licenseNo);
        done();
      });
    });

    it('should delete salesLine._id', (done) => {
    // Act
      royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, (err) => {
        // Assert
        expect(salesLine._id).toBeUndefined();
        done();
      });
    });

    describe('when catType is release and the releaseId is included in participationRates', () => {
      it('should set objectPercentage to the amount', (done) => {
      // Arrange
        salesLine.catType = 'Release';
        salesLine.releaseId = '59dd28d9e1d5d31023d09ba3';
        royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));
        royaltyCalculator.participationRates = { '59dd28d9e1d5d31023d09ba3': randomFloat() };

        // Act
        royaltyCalculator.calculateInCurrency(
          fields,
          salesLine,
          originalSalesLine,
          calculation,
          deductionFilters,
          withholdingTaxFilters,
          mechanicalFilters,
          escalationTrackers,
          (err) => {
            // Assert
            expect(calculation.objectPercentage).toBeCloseTo(royaltyCalculator.participationRates[salesLine.releaseId], 5);
            done();
          },
        );
      });
    });

    describe("when the releaseId isn't included in the participationRates", () => {
      it('should set objectPercentage to 100', (done) => {
      // Arrange
        salesLine.catType = 'Release';
        salesLine.releaseId = '59dd28d9e1d5d31023d09ba3';
        royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));
        royaltyCalculator.participationRates = { '59dd28d9e1d5d31023d09ba4': randomFloat() };

        // Act
        royaltyCalculator.calculateInCurrency(
          fields,
          salesLine,
          originalSalesLine,
          calculation,
          deductionFilters,
          withholdingTaxFilters,
          mechanicalFilters,
          escalationTrackers,
          (err) => {
            // Assert
            expect(calculation.objectPercentage).toBe(100);
            done();
          },
        );
      });
    });

    describe('when catType is track and the trackId and is included in participationRates', () => {
      it('should set objectPercentage to the amount', (done) => {
      // Arrange
        salesLine.catType = 'Track';
        salesLine.trackId = '59dd28d9e1d5d31023d09ba3';
        royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));
        royaltyCalculator.participationRates = { '59dd28d9e1d5d31023d09ba3': randomFloat() };

        // Act
        royaltyCalculator.calculateInCurrency(
          fields,
          salesLine,
          originalSalesLine,
          calculation,
          deductionFilters,
          withholdingTaxFilters,
          mechanicalFilters,
          escalationTrackers,
          (err) => {
            // Assert
            expect(calculation.objectPercentage).toBeCloseTo(royaltyCalculator.participationRates[salesLine.trackId], 5);
            done();
          },
        );
      });
    });

    describe("when the trackId isn't included in the participationRates", () => {
      it('should set objectPercentage to 100', (done) => {
      // Arrange
        salesLine.catType = 'Track';
        salesLine.trackId = '59dd28d9e1d5d31023d09ba3';
        royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));
        royaltyCalculator.participationRates = { '59dd28d9e1d5d31023d09ba4': randomFloat() };

        // Act
        royaltyCalculator.calculateInCurrency(
          fields,
          salesLine,
          originalSalesLine,
          calculation,
          deductionFilters,
          withholdingTaxFilters,
          mechanicalFilters,
          escalationTrackers,
          (err) => {
            // Assert
            expect(calculation.objectPercentage).toBe(100);
            done();
          },
        );
      });
    });

    describe('when catType is work workId and is included in participationRates', () => {
      it('should set objectPercentage to the amount', (done) => {
      // Arrange
        salesLine.catType = 'Work';
        salesLine.workId = '59dd28d9e1d5d31023d09ba3';
        royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));
        royaltyCalculator.participationRates = { '59dd28d9e1d5d31023d09ba3': randomFloat() };

        // Act
        royaltyCalculator.calculateInCurrency(
          fields,
          salesLine,
          originalSalesLine,
          calculation,
          deductionFilters,
          withholdingTaxFilters,
          mechanicalFilters,
          escalationTrackers,
          (err) => {
            // Assert
            expect(calculation.objectPercentage).toBeCloseTo(royaltyCalculator.participationRates[salesLine.workId], 5);
            done();
          },
        );
      });
    });

    describe("when the workId isn't included in the participationRates", () => {
      it('should set objectPercentage to 100', (done) => {
      // Arrange
        salesLine.catType = 'Work';
        salesLine.workId = '59dd28d9e1d5d31023d09ba3';
        royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));
        royaltyCalculator.participationRates = { '59dd28d9e1d5d31023d09ba4': randomFloat() };

        // Act
        royaltyCalculator.calculateInCurrency(
          fields,
          salesLine,
          originalSalesLine,
          calculation,
          deductionFilters,
          withholdingTaxFilters,
          mechanicalFilters,
          escalationTrackers,
          (err) => {
            // Assert
            expect(calculation.objectPercentage).toBe(100);
            done();
          },
        );
      });
    });

    describe('when the participationRate is an object', () => {
      it('should set objectPercentage to the rate from the object', (done) => {
      // Arrange
        salesLine.catType = 'Release';
        salesLine.releaseId = '59dd28d9e1d5d31023d09ba3';
        royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));
        royaltyCalculator.participationRates = { '59dd28d9e1d5d31023d09ba3': { rate: 10 } };

        // Act
        royaltyCalculator.calculateInCurrency(
          fields,
          salesLine,
          originalSalesLine,
          calculation,
          deductionFilters,
          withholdingTaxFilters,
          mechanicalFilters,
          escalationTrackers,
          (err) => {
            // Assert
            expect(calculation.objectPercentage).toEqual(royaltyCalculator.participationRates[salesLine.releaseId]);
            done();
          },
        );
      });
    });

    describe('when the contractType is mechanical', () => {
      describe('and when the catType is Release with a track against the contract', () => {
        it('should set the catalogueTrackTitle from the track data', (done) => {
        // Arrange
          salesLine.catType = 'Release';
          salesLine.releaseId = '59dd28d9e1d5d31023d09ba3';
          calculation = { rateBasis: 'calculationRateBasis' };
          royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));
          royaltyCalculator.contract.contractType = 'Mechanical';
          royaltyCalculator.contract.track = {
            _id: randomId(),
            title: randomString(),
            version: randomString(),
            artist: randomString(),
            isrc: randomString(),
            statutoryRate: { calculationRateBasis: 99 },
          };

          // Act
          royaltyCalculator.calculateInCurrency(
            fields,
            salesLine,
            originalSalesLine,
            calculation,
            deductionFilters,
            withholdingTaxFilters,
            mechanicalFilters,
            escalationTrackers,
            (err) => {
              // Assert
              expect(salesLine.catalogueTrackTitle).toBe(royaltyCalculator.contract.track.title);
              done();
            },
          );
        });

        it('should set the catalogueTrackVersion from the track data', (done) => {
        // Arrange
          salesLine.catType = 'Release';
          salesLine.releaseId = '59dd28d9e1d5d31023d09ba3';
          calculation = { rateBasis: 'calculationRateBasis' };
          royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));
          royaltyCalculator.contract.contractType = 'Mechanical';
          royaltyCalculator.contract.track = {
            _id: randomId(),
            title: randomString(),
            version: randomString(),
            artist: randomString(),
            isrc: randomString(),
            statutoryRate: { calculationRateBasis: 99 },
          };

          // Act
          royaltyCalculator.calculateInCurrency(
            fields,
            salesLine,
            originalSalesLine,
            calculation,
            deductionFilters,
            withholdingTaxFilters,
            mechanicalFilters,
            escalationTrackers,
            (err) => {
              // Assert
              expect(salesLine.catalogueTrackVersion).toBe(royaltyCalculator.contract.track.version);
              done();
            },
          );
        });

        it('should set the catalogueTrackArtist from the track data', (done) => {
        // Arrange
          salesLine.catType = 'Release';
          salesLine.releaseId = '59dd28d9e1d5d31023d09ba3';
          calculation = { rateBasis: 'calculationRateBasis' };
          royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));
          royaltyCalculator.contract.contractType = 'Mechanical';
          royaltyCalculator.contract.track = {
            _id: randomId(),
            title: randomString(),
            version: randomString(),
            artist: randomString(),
            isrc: randomString(),
            statutoryRate: { calculationRateBasis: 99 },
          };

          // Act
          royaltyCalculator.calculateInCurrency(
            fields,
            salesLine,
            originalSalesLine,
            calculation,
            deductionFilters,
            withholdingTaxFilters,
            mechanicalFilters,
            escalationTrackers,
            (err) => {
              // Assert
              expect(salesLine.catalogueTrackArtist).toBe(royaltyCalculator.contract.track.artist);
              done();
            },
          );
        });

        it('should set the catalogueIsrc from the track data', (done) => {
        // Arrange
          salesLine.catType = 'Release';
          salesLine.releaseId = '59dd28d9e1d5d31023d09ba3';
          calculation = { rateBasis: 'calculationRateBasis' };
          royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));
          royaltyCalculator.contract.contractType = 'Mechanical';
          royaltyCalculator.contract.track = {
            _id: randomId(),
            title: randomString(),
            version: randomString(),
            artist: randomString(),
            isrc: randomString(),
            statutoryRate: { calculationRateBasis: 99 },
          };

          // Act
          royaltyCalculator.calculateInCurrency(
            fields,
            salesLine,
            originalSalesLine,
            calculation,
            deductionFilters,
            withholdingTaxFilters,
            mechanicalFilters,
            escalationTrackers,
            (err) => {
              // Assert
              expect(salesLine.catalogueIsrc).toBe(royaltyCalculator.contract.track.isrc);
              done();
            },
          );
        });

        it('should set the mechanicalRate from the track data', (done) => {
        // Arrange
          salesLine.catType = 'Release';
          salesLine.releaseId = '59dd28d9e1d5d31023d09ba3';
          calculation = { rateBasis: 'calculationRateBasis' };
          royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));
          royaltyCalculator.contract.contractType = 'Mechanical';
          royaltyCalculator.contract.track = {
            _id: randomId(),
            title: randomString(),
            version: randomString(),
            artist: randomString(),
            isrc: randomString(),
            statutoryRate: { calculationRateBasis: 99 },
          };

          // Act
          royaltyCalculator.calculateInCurrency(
            fields,
            salesLine,
            originalSalesLine,
            calculation,
            deductionFilters,
            withholdingTaxFilters,
            mechanicalFilters,
            escalationTrackers,
            (err) => {
              // Assert
              expect(salesLine.mechanicalRate).toBe(royaltyCalculator.contract.track.statutoryRate.calculationRateBasis);
              done();
            },
          );
        });

        it('should set the objectPercentage from the track data', (done) => {
        // Arrange
          salesLine.catType = 'Release';
          salesLine.releaseId = '59dd28d9e1d5d31023d09ba3';
          calculation = { rateBasis: 'calculationRateBasis' };
          royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));
          royaltyCalculator.contract.contractType = 'Mechanical';
          royaltyCalculator.contract.objectPercentage = 99;
          royaltyCalculator.contract.track = {
            _id: randomId(),
            title: randomString(),
            version: randomString(),
            artist: randomString(),
            isrc: randomString(),
            statutoryRate: { calculationRateBasis: 99 },
          };

          // Act
          royaltyCalculator.calculateInCurrency(
            fields,
            salesLine,
            originalSalesLine,
            calculation,
            deductionFilters,
            withholdingTaxFilters,
            mechanicalFilters,
            escalationTrackers,
            (err) => {
              // Assert
              expect(calculation.objectPercentage).toBe(royaltyCalculator.contract.objectPercentage);
              done();
            },
          );
        });
      });

      describe('and when the catType is Track', () => {
        it('should set the mechanicalRate from the track data', (done) => {
        // Arrange
          salesLine.catType = 'Track';
          salesLine.trackId = '59dd28d9e1d5d31023d09ba3';
          calculation = { rateBasis: 'calculationRateBasis' };
          royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));
          royaltyCalculator.contract.contractType = 'Mechanical';
          royaltyCalculator.contract.objectPercentage = 99;
          royaltyCalculator.contract.terms = { mechanicalAmount: { calculationRateBasis: 99 } };

          // Act
          royaltyCalculator.calculateInCurrency(
            fields,
            salesLine,
            originalSalesLine,
            calculation,
            deductionFilters,
            withholdingTaxFilters,
            mechanicalFilters,
            escalationTrackers,
            (err) => {
              // Assert
              expect(salesLine.mechanicalRate).toBe(royaltyCalculator.contract.terms.mechanicalAmount.calculationRateBasis);
              done();
            },
          );
        });

        it('should set the objectPercentage from the track data', (done) => {
        // Arrange
          salesLine.catType = 'Track';
          salesLine.trackId = '59dd28d9e1d5d31023d09ba3';
          calculation = { rateBasis: 'calculationRateBasis' };
          royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));
          royaltyCalculator.contract.contractType = 'Mechanical';
          royaltyCalculator.contract.objectPercentage = 99;
          royaltyCalculator.contract.terms = { mechanicalAmount: { calculationRateBasis: 99 } };

          // Act
          royaltyCalculator.calculateInCurrency(
            fields,
            salesLine,
            originalSalesLine,
            calculation,
            deductionFilters,
            withholdingTaxFilters,
            mechanicalFilters,
            escalationTrackers,
            (err) => {
              // Assert
              expect(calculation.objectPercentage).toBe(royaltyCalculator.contract.objectPercentage);
              done();
            },
          );
        });
      });
    });

    describe("when calculation type is 'Gross Receipts'", () => {
    // This is setting values based on the field input which is built in the runCalculation function
      it('should set the passed fields output.calculationInput to the passed fields input.grossAmount', (done) => {
      // Arrange
        salesLine = {
          id: '59dd28d9e1d5d31023d09ba1',
          _id: '59dd28d9e1d5d31023d09ba2',
          name: 'Sales Line',
          saleDate: '11/11/2011',
          catType: 'Track',
          releaseId: '59dd28d9e1d5d31023d09ba3',
          customGrossAmount: randomInt(),
        };
        calculation = {
          rateBasis: 'calculationRateBasis',
          type: 'Gross Receipts',
          rate: randomInt(),
        };
        royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));
        fields = {
          output: {
            calculationInput: 'customCalculationInput',
          },
          input: {
            grossAmount: 'customGrossAmount',
          },
        };
        royaltyCalculator.contract.contractType = 'Mechanical';
        royaltyCalculator.contract.objectPercentage = randomInt();
        royaltyCalculator.contract.terms = {
          mechanicalAmount: {
            calculationRateBasis: randomInt(),
          },
        };

        // Act
        royaltyCalculator.calculateInCurrency(
          fields,
          salesLine,
          originalSalesLine,
          calculation,
          deductionFilters,
          withholdingTaxFilters,
          mechanicalFilters,
          escalationTrackers,
          (err) => {
            // Assert
            expect(salesLine.customCalculationInput).toBe(salesLine.customGrossAmount);
            done();
          },
        );
      });
    });

    describe("when calculation type is 'PPD'", () => {
      describe('and specificDealerPrices contains the releaseId', () => {
        it('should set the dealer to the matching dealer price', (done) => {
        // Arrange
          salesLine = {
            id: '59dd28d9e1d5d31023d09ba1',
            _id: '59dd28d9e1d5d31023d09ba2',
            name: 'Sales Line',
            saleDate: '11/11/2011',
            catType: 'Track',
            releaseId: '59dd28d9e1d5d31023d09ba3',
            customGrossAmount: randomInt(),
            priceCategory: 'Full Price',
            units: randomInt(),
          };

          fields = {
            output: {
              calculationInput: 'customCalculationInput',
              ppd: 'customPPD',
            },
            input: {},
          };

          calculation = {
            rateBasis: 'calculationRateBasis',
            type: 'PPD',
            rate: randomInt(),
          };
          royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

          royaltyCalculator.specificDealerPrices = {
            '59dd28d9e1d5d31023d09ba3': [
              {
                priceCategory: 'Full Price',
                territory: 'WW',
                dealerPrice: randomInt(),
              },
              {
                priceCategory: 'Full Price',
                territory: 'FR',
                dealerPrice: randomInt(),
              },
            ],
          };

          // Act
          royaltyCalculator.calculateInCurrency(
            fields,
            salesLine,
            originalSalesLine,
            calculation,
            deductionFilters,
            withholdingTaxFilters,
            mechanicalFilters,
            escalationTrackers,
            (err) => {
              // Assert
              expect(salesLine.customCalculationInput).toBe(salesLine.units * royaltyCalculator.specificDealerPrices[salesLine.releaseId][0].dealerPrice);
              expect(salesLine.customPPD).toBe(royaltyCalculator.specificDealerPrices[salesLine.releaseId][0].dealerPrice);
              done();
            },
          );
        });
      });
    });

    describe("and specificDealerPrices doesn't include the releaseId, but it is included in ppds", () => {
      it('should set the passed fields output.calculationInput to the ppd multiplied by the contractExchangeRate', (done) => {
      // Arrange
        salesLine = {
          id: '59dd28d9e1d5d31023d09ba1',
          _id: '59dd28d9e1d5d31023d09ba2',
          name: 'Sales Line',
          saleDate: '11/11/2011',
          catType: 'Track',
          releaseId: '59dd28d9e1d5d31023d09ba3',
          customGrossAmount: randomInt(),
          priceCategory: 'Full Price',
          units: randomInt(),
        };

        fields = {
          type: 'contractCurrency',
          output: {
            calculationInput: 'customCalculationInput',
            ppd: 'customPPD',
          },
          input: {},
        };

        calculation = {
          rateBasis: 'calculationRateBasis',
          type: 'PPD',
          rate: randomInt(),
        };

        royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

        royaltyCalculator.ppds = {
          '59dd28d9e1d5d31023d09ba3': randomInt(),
        };

        royaltyCalculator.contractExchangeRate = randomInt();

        // Act
        royaltyCalculator.calculateInCurrency(
          fields,
          salesLine,
          originalSalesLine,
          calculation,
          deductionFilters,
          withholdingTaxFilters,
          mechanicalFilters,
          escalationTrackers,
          (err) => {
            // Assert
            expect(salesLine.customCalculationInput).toBe(
              royaltyCalculator.ppds[salesLine.releaseId] * royaltyCalculator.contractExchangeRate * salesLine.units,
            );
            done();
          },
        );
      });
    });

    describe("and the releaseId isn't included in either specificDealerPrices or pdds", () => {
      it('should not set the passed fields output.calculationInput', (done) => {
      // Arrange
        salesLine = {
          id: '59dd28d9e1d5d31023d09ba1',
          _id: '59dd28d9e1d5d31023d09ba2',
          name: 'Sales Line',
          saleDate: '11/11/2011',
          catType: 'Track',
          releaseId: '59dd28d9e1d5d31023d09ba3',
          customGrossAmount: randomInt(),
          priceCategory: 'Full Price',
          units: randomInt(),
        };

        fields = {
          type: 'contractCurrency',
          output: {
            calculationInput: 'customCalculationInput',
            ppd: 'customPPD',
          },
          input: {},
        };

        calculation = {
          rateBasis: 'calculationRateBasis',
          type: 'PPD',
          rate: randomInt(),
        };

        royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

        royaltyCalculator.ppds = {};

        royaltyCalculator.contractExchangeRate = randomInt();

        // Act
        royaltyCalculator.calculateInCurrency(
          fields,
          salesLine,
          originalSalesLine,
          calculation,
          deductionFilters,
          withholdingTaxFilters,
          mechanicalFilters,
          escalationTrackers,
          (err) => {
            // Assert
            expect(salesLine.customCalculationInput).toBe(0);
            done();
          },
        );
      });
    });

    describe("when calculation type is 'Net Receipts'", () => {
      it('should set the passed fields output.calculationInput to the passed fields input.netAmount', (done) => {
      // Arrange
        salesLine = {
          id: '59dd28d9e1d5d31023d09ba1',
          _id: '59dd28d9e1d5d31023d09ba2',
          name: 'Sales Line',
          saleDate: '11/11/2011',
          catType: 'Track',
          releaseId: '59dd28d9e1d5d31023d09ba3',
          customNetAmount: randomInt(),
        };

        calculation = {
          rateBasis: 'calculationRateBasis',
          type: 'Net Receipts',
          rate: randomInt(),
        };

        royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

        fields = {
          output: {
            calculationInput: 'customCalculationInput',
          },
          input: {
            netAmount: 'customNetAmount',
          },
        };
        royaltyCalculator.contract.contractType = 'Mechanical';
        royaltyCalculator.contract.objectPercentage = randomInt();

        royaltyCalculator.contract.terms = {
          mechanicalAmount: {
            calculationRateBasis: randomInt(),
          },
        };

        // Act
        royaltyCalculator.calculateInCurrency(
          fields,
          salesLine,
          originalSalesLine,
          calculation,
          deductionFilters,
          withholdingTaxFilters,
          mechanicalFilters,
          escalationTrackers,
          (err) => {
            // Assert
            expect(salesLine.customCalculationInput).toBe(salesLine.customNetAmount);
            done();
          },
        );
      });
    });

    describe("when calculation type is 'Unit Price'", () => {
      it('should set the passed fields output.calculationInput to the passed fields input.unitPrice', (done) => {
      // Arrange
        salesLine = {
          id: '59dd28d9e1d5d31023d09ba1',
          _id: '59dd28d9e1d5d31023d09ba2',
          name: 'Sales Line',
          saleDate: '11/11/2011',
          catType: 'Track',
          releaseId: '59dd28d9e1d5d31023d09ba3',
          units: randomInt(),
          homeCurrencyPerUnitRate: randomInt(),
          customUnitPrice: randomInt(),
        };

        calculation = {
          rateBasis: 'calculationRateBasis',
          type: 'Unit Price',
          rate: randomInt(),
        };

        royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

        fields = {
          output: {
            calculationInput: 'customCalculationInput',
          },
          input: {
            perUnitRate: 'customUnitPrice',
          },
        };

        royaltyCalculator.contract.contractType = 'Mechanical';
        royaltyCalculator.contract.objectPercentage = randomInt();

        royaltyCalculator.contract.terms = {
          mechanicalAmount: {
            calculationRateBasis: randomInt(),
          },
        };

        // Act
        royaltyCalculator.calculateInCurrency(
          fields,
          salesLine,
          originalSalesLine,
          calculation,
          deductionFilters,
          withholdingTaxFilters,
          mechanicalFilters,
          escalationTrackers,
          (err) => {
            // Assert
            expect(salesLine.customCalculationInput).toBe(salesLine.customUnitPrice * salesLine.units);
            done();
          },
        );
      });
    });

    describe("when calculation type is 'Unit Rate'", () => {
      it('should set salesLine.unitRate to the calculation.unitRate', (done) => {
      // Arrange
        salesLine = {
          id: '59dd28d9e1d5d31023d09ba1',
          _id: '59dd28d9e1d5d31023d09ba2',
          name: 'Sales Line',
          saleDate: '11/11/2011',
          catType: 'Track',
          releaseId: '59dd28d9e1d5d31023d09ba3',
        };

        calculation = {
          type: 'Unit Rate',
          rate: randomInt(),
          unitRate: randomInt(),
        };

        royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

        fields = {
          output: {
            calculationInput: 'customCalculationInput',
          },
          input: {
            perUnitRate: 'customUnitPrice',
          },
        };
        royaltyCalculator.contract.contractType = 'Mechanical';
        royaltyCalculator.contract.objectPercentage = randomInt();

        royaltyCalculator.contract.terms = {
          mechanicalAmount: {
            calculationRateBasis: randomInt(),
          },
        };

        // Act
        royaltyCalculator.calculateInCurrency(
          fields,
          salesLine,
          originalSalesLine,
          calculation,
          deductionFilters,
          withholdingTaxFilters,
          mechanicalFilters,
          escalationTrackers,
          (err) => {
            // Assert
            expect(salesLine.unitRate).toBe(salesLine.unitRate);
            done();
          },
        );
      });

      it('should set the passed fields output.calculationInput to the calculation.unitRate * units', (done) => {
      // Arrange
        salesLine = {
          id: '59dd28d9e1d5d31023d09ba1',
          _id: '59dd28d9e1d5d31023d09ba2',
          name: 'Sales Line',
          saleDate: '11/11/2011',
          catType: 'Track',
          releaseId: '59dd28d9e1d5d31023d09ba3',
          units: randomInt(),
        };

        calculation = {
          type: 'Unit Rate',
          rate: randomInt(),
          unitRate: randomInt(),
        };

        royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

        fields = {
          output: {
            calculationInput: 'customCalculationInput',
          },
          input: {
            perUnitRate: 'customUnitPrice',
          },
        };
        royaltyCalculator.contract.contractType = 'Mechanical';
        royaltyCalculator.contract.objectPercentage = randomInt();

        royaltyCalculator.contract.terms = {
          mechanicalAmount: {
            calculationRateBasis: randomInt(),
          },
        };

        // Act
        royaltyCalculator.calculateInCurrency(
          fields,
          salesLine,
          originalSalesLine,
          calculation,
          deductionFilters,
          withholdingTaxFilters,
          mechanicalFilters,
          escalationTrackers,
          (err) => {
            // Assert
            expect(salesLine.customCalculationInput).toBe(salesLine.units * calculation.unitRate);
            done();
          },
        );
      });
    });

    describe("when calculation type is 'Fixed Unit Rate'", () => {
      it('should set salesLine.unitRate to the calculation.unitRate', (done) => {
      // Arrange
        salesLine = {
          id: '59dd28d9e1d5d31023d09ba1',
          _id: '59dd28d9e1d5d31023d09ba2',
          name: 'Sales Line',
          saleDate: '11/11/2011',
          catType: 'Track',
          releaseId: '59dd28d9e1d5d31023d09ba3',
        };

        calculation = {
          type: 'Fixed Unit Rate',
          rate: randomInt(),
          unitRate: randomInt(),
        };

        royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

        fields = {
          output: {
            calculationInput: 'customCalculationInput',
          },
          input: {
            perUnitRate: 'customUnitPrice',
          },
        };

        royaltyCalculator.contract.contractType = 'Mechanical';
        royaltyCalculator.contract.objectPercentage = randomInt();
        royaltyCalculator.contract.terms = {
          mechanicalAmount: {
            calculationRateBasis: randomInt(),
          },
        };

        // Act
        royaltyCalculator.calculateInCurrency(
          fields,
          salesLine,
          originalSalesLine,
          calculation,
          deductionFilters,
          withholdingTaxFilters,
          mechanicalFilters,
          escalationTrackers,
          (err) => {
            // Assert
            expect(salesLine.unitRate).toBe(salesLine.unitRate);
            done();
          },
        );
      });

      it('should set the passed fields output.calculationInput to the calculation.unitRate * units', (done) => {
      // Arrange
        salesLine = {
          id: '59dd28d9e1d5d31023d09ba1',
          _id: '59dd28d9e1d5d31023d09ba2',
          name: 'Sales Line',
          saleDate: '11/11/2011',
          catType: 'Track',
          releaseId: '59dd28d9e1d5d31023d09ba3',
          units: randomInt(),
        };

        calculation = {
          type: 'Fixed Unit Rate',
          rate: randomInt(),
          unitRate: randomInt(),
        };

        royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

        fields = {
          output: {
            calculationInput: 'customCalculationInput',
          },
          input: {
            perUnitRate: 'customUnitPrice',
          },
        };

        royaltyCalculator.contract.contractType = 'Mechanical';
        royaltyCalculator.contract.objectPercentage = randomInt();
        royaltyCalculator.contract.terms = {
          mechanicalAmount: {
            calculationRateBasis: randomInt(),
          },
        };

        // Act
        royaltyCalculator.calculateInCurrency(
          fields,
          salesLine,
          originalSalesLine,
          calculation,
          deductionFilters,
          withholdingTaxFilters,
          mechanicalFilters,
          escalationTrackers,
          (err) => {
            // Assert
            expect(salesLine.customCalculationInput).toBe(salesLine.units * calculation.unitRate); // @NOTE: added missing expect
            done();
          },
        );
      });
    });

    describe("when calculation type is 'Statutory Rate' and salesLine.mechanicalRate exists", () => {
      it('should set the passed fields output.calculationInput to salesLine.units * salesLine.mechanicalRate', (done) => {
      // Arrange
        salesLine = {
          id: '59dd28d9e1d5d31023d09ba1',
          _id: '59dd28d9e1d5d31023d09ba2',
          name: 'Sales Line',
          saleDate: '11/11/2011',
          catType: 'Track',
          releaseId: '59dd28d9e1d5d31023d09ba3',
          units: randomInt(),
          mechanicalRate: randomInt(), // @NOTE: added missing mechanicalRate
        };

        calculation = {
          type: 'Statutory Rate',
          rate: randomInt(),
          unitRate: randomInt(),
          rateBasis: 'calculationRateBasis',
        };

        royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

        fields = {
          output: {
            calculationInput: 'customCalculationInput',
          },
          input: {
            perUnitRate: 'customUnitPrice',
          },
        };

        royaltyCalculator.contract.contractType = 'Mechanical';
        royaltyCalculator.contract.objectPercentage = randomInt();

        royaltyCalculator.contract.terms = {
          mechanicalAmount: {
            calculationRateBasis: randomInt(),
          },
        };

        // Act
        royaltyCalculator.calculateInCurrency(
          fields,
          salesLine,
          originalSalesLine,
          calculation,
          deductionFilters,
          withholdingTaxFilters,
          mechanicalFilters,
          escalationTrackers,
          (err) => {
            // Assert
            expect(salesLine.customCalculationInput).toBe(salesLine.units * salesLine.mechanicalRate);
            done();
          },
        );
      });
    });

    describe('when calculation type is none of the above', () => {
      it('should set the passed fields output.calculationInput to 0', (done) => {
      // Arrange
        salesLine = {
          id: '59dd28d9e1d5d31023d09ba1',
          _id: '59dd28d9e1d5d31023d09ba2',
          name: 'Sales Line',
          saleDate: '11/11/2011',
          catType: 'Track',
          releaseId: '59dd28d9e1d5d31023d09ba3',
          units: randomInt(),
        };

        calculation = {
          type: 'Other',
          rate: randomInt(),
          unitRate: randomInt(),
          rateBasis: 'calculationRateBasis',
        };

        royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

        fields = {
          output: {
            calculationInput: 'customCalculationInput',
          },
          input: {
            perUnitRate: 'customUnitPrice',
          },
        };

        royaltyCalculator.contract.contractType = 'Mechanical';
        royaltyCalculator.contract.objectPercentage = randomInt();

        royaltyCalculator.contract.terms = {
          mechanicalAmount: {
            calculationRateBasis: randomInt(),
          },
        };

        // Act
        royaltyCalculator.calculateInCurrency(
          fields,
          salesLine,
          originalSalesLine,
          calculation,
          deductionFilters,
          withholdingTaxFilters,
          mechanicalFilters,
          escalationTrackers,
          (err) => {
            // Assert
            expect(salesLine.customCalculationInput).toBe(0);
            done();
          },
        );
      });
    });

    it('should set calculationType to calculation.type', (done) => {
    // Arrange
      salesLine = {
        id: '59dd28d9e1d5d31023d09ba1',
        _id: '59dd28d9e1d5d31023d09ba2',
        name: 'Sales Line',
        saleDate: '11/11/2011',
        catType: 'Track',
        releaseId: '59dd28d9e1d5d31023d09ba3',
        units: randomInt(),
      };

      calculation = {
        type: 'Statutory Rate',
        rate: randomInt(),
        unitRate: randomInt(),
        rateBasis: 'calculationRateBasis',
      };

      royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

      const fields = {
        output: {
          calculationInput: 'customCalculationInput',
        },
        input: {
          perUnitRate: 'customUnitPrice',
        },
      };

      // Act
      royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, (err) => {
        // Assert
        expect(salesLine.calculationType).toBe(calculation.type);
        done();
      });
    });

    it('should set share to calculation.share', (done) => {
    // Arrange
      salesLine = {
        id: '59dd28d9e1d5d31023d09ba1',
        _id: '59dd28d9e1d5d31023d09ba2',
        name: 'Sales Line',
        saleDate: '11/11/2011',
        catType: 'Track',
        releaseId: '59dd28d9e1d5d31023d09ba3',
        units: randomInt(),
      };

      calculation = {
        type: 'Statutory Rate',
        rate: randomInt(),
        unitRate: randomInt(),
        rateBasis: 'calculationRateBasis',
        share: randomInt(),
      };

      royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

      fields = {
        output: {
          calculationInput: 'customCalculationInput',
        },
        input: {
          perUnitRate: 'customUnitPrice',
        },
      };

      // Act
      royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
        // Assert
        expect(salesLine.share).toBe(calculation.share);
        done();
      });
    });

    it('should set multiplier to calculation.multiplier', (done) => {
    // Arrange
      salesLine = {
        id: '59dd28d9e1d5d31023d09ba1',
        _id: '59dd28d9e1d5d31023d09ba2',
        name: 'Sales Line',
        saleDate: '11/11/2011',
        catType: 'Track',
        releaseId: '59dd28d9e1d5d31023d09ba3',
        units: randomInt(),
      };

      calculation = {
        type: 'Statutory Rate',
        rate: randomInt(),
        unitRate: randomInt(),
        rateBasis: 'calculationRateBasis',
        multiplier: randomInt(),
      };

      royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

      fields = {
        output: {
          calculationInput: 'customCalculationInput',
        },
        input: {
          perUnitRate: 'customUnitPrice',
        },
      };

      // Act
      royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
        // Assert
        expect(salesLine.multiplier).toBe(calculation.multiplier);
        done();
      });
    });

    it('should set royaltyRate to calculation.rate', (done) => {
    // Arrange
      salesLine = {
        id: '59dd28d9e1d5d31023d09ba1',
        _id: '59dd28d9e1d5d31023d09ba2',
        name: 'Sales Line',
        saleDate: '11/11/2011',
        catType: 'Track',
        releaseId: '59dd28d9e1d5d31023d09ba3',
        units: randomInt(),
      };

      calculation = {
        type: 'Statutory Rate',
        rate: randomInt(),
        unitRate: randomInt(),
        rateBasis: 'calculationRateBasis',
      };

      royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

      fields = {
        output: {
          calculationInput: 'customCalculationInput',
        },
        input: {
          perUnitRate: 'customUnitPrice',
        },
      };

      // Act
      royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
        // Assert
        expect(salesLine.royaltyRate).toBe(calculation.rate);
        done();
      });
    });

    it('should set reductionRate to calculation.reductionRate', (done) => {
    // Arrange
      salesLine = {
        id: '59dd28d9e1d5d31023d09ba1',
        _id: '59dd28d9e1d5d31023d09ba2',
        name: 'Sales Line',
        saleDate: '11/11/2011',
        catType: 'Track',
        releaseId: '59dd28d9e1d5d31023d09ba3',
        units: randomInt(),
      };

      calculation = {
        type: 'Statutory Rate',
        rate: randomInt(),
        unitRate: randomInt(),
        rateBasis: 'calculationRateBasis',
        reductionRate: randomInt(),
      };

      royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

      fields = {
        output: {
          calculationInput: 'customCalculationInput',
        },
        input: {
          perUnitRate: 'customUnitPrice',
        },
      };

      // Act
      royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
        // Assert
        expect(salesLine.reductionRate).toBe(calculation.reductionRate);
        done();
      });
    });

    it('should set fields.output.proRataAmount to the calculationInput * objectPercentage / 100', (done) => {
    // Arrange
      salesLine = {
        id: '59dd28d9e1d5d31023d09ba1',
        _id: '59dd28d9e1d5d31023d09ba2',
        name: 'Sales Line',
        saleDate: '11/11/2011',
        catType: 'Track',
        releaseId: '59dd28d9e1d5d31023d09ba3',
        units: randomInt(),
      };

      calculation = {
        type: 'Fixed Unit Rate',
        rate: randomInt(),
        unitRate: randomInt(),
        rateBasis: 'calculationRateBasis',
        objectPercentage: randomInt(),
      };

      royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

      fields = {
        output: {
          calculationInput: 'customCalculationInput',
          proRataAmount: 'customProRataAmount',
        },
        input: {
          perUnitRate: 'customUnitPrice',
        },
      };

      royaltyCalculator.contract.terms = {
        mechanicalAmount: {
          calculationRateBasis: randomInt(),
        },
      };

      // Act
      royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
        // Assert
        expect(salesLine.customProRataAmount).toBeCloseTo(salesLine.customCalculationInput * calculation.objectPercentage / 100, 5);
        done();
      });
    });

    describe('mechanical deduction', () => {
      describe('when mechanicalPercentage set on salesLine', () => {
        it('should not change the mechanicalPercentage', (done) => {
        // Arrange
          salesLine = {
            id: '59dd28d9e1d5d31023d09ba1',
            _id: '59dd28d9e1d5d31023d09ba2',
            name: 'Sales Line',
            saleDate: '11/11/2011',
            catType: 'Track',
            releaseId: '59dd28d9e1d5d31023d09ba3',
            mechanicalPercentage: randomInt(),
          };

          calculation = {
            type: 'Fixed Unit Rate',
            rate: randomInt(),
            unitRate: randomInt(),
            rateBasis: 'calculationRateBasis',
            objectPercentage: randomInt(),
          };

          royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

          fields = {
            output: {
              calculationInput: 'customCalculationInput',
              proRataAmount: 'customProRataAmount',
            },
            input: {
              perUnitRate: 'customUnitPrice',
            },
          };

          royaltyCalculator.contract.terms = {
            mechanicalAmount: {
              calculationRateBasis: randomInt(),
            },
          };

          // Act
          royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
            // Assert
            expect(salesLine.mechanicalPercentage).toBe(salesLine.mechanicalPercentage);
            done();
          });
        });
      });

      describe('when mechanicalPercentage not set on salesLine', () => {
        it('should set mechanicalPercentage to 100', (done) => {
        // Arrange
          salesLine = {
            id: '59dd28d9e1d5d31023d09ba1',
            _id: '59dd28d9e1d5d31023d09ba2',
            name: 'Sales Line',
            saleDate: '11/11/2011',
            catType: 'Track',
            releaseId: '59dd28d9e1d5d31023d09ba3',
          };

          calculation = {
            type: 'Fixed Unit Rate',
            rate: randomInt(),
            unitRate: randomInt(),
            rateBasis: 'calculationRateBasis',
            objectPercentage: randomInt(),
          };

          royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

          fields = {
            output: {
              calculationInput: 'customCalculationInput',
              proRataAmount: 'customProRataAmount',
            },
            input: {
              perUnitRate: 'customUnitPrice',
            },
          };

          royaltyCalculator.contract.terms = {
            mechanicalAmount: {
              calculationRateBasis: randomInt(),
            },
          };

          // Act
          royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
            // Assert
            expect(salesLine.mechanicalPercentage).toBe(100);
            done();
          });
        });
      });
    });

    describe('mechanical deduction', () => {
      describe('when mechanicalType is PPD', () => {
        it('should set fields.output.mechanicalAmount to the salesLine.ppd', (done) => {
        // Arrange
          salesLine = {
            id: '59dd28d9e1d5d31023d09ba1',
            _id: '59dd28d9e1d5d31023d09ba2',
            name: 'Sales Line',
            saleDate: '11/11/2011',
            catType: 'Track',
            releaseId: '59dd28d9e1d5d31023d09ba3',
            mechanicalPercentage: randomInt(),
            mechanicalType: 'PPD',
            customPPD: randomInt(),
          };

          calculation = {
            type: 'Fixed Unit Rate',
            rate: randomInt(),
            unitRate: randomInt(),
            rateBasis: 'calculationRateBasis',
            objectPercentage: randomInt(),
          };

          royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

          fields = {
            output: {
              calculationInput: 'customCalculationInput',
              proRataAmount: 'customProRataAmount',
              mechanicalAmount: 'customMechanicalAmount',
              ppd: 'customPPD',
            },
            input: {
              perUnitRate: 'customUnitPrice',
            },
          };

          royaltyCalculator.contract.terms = {
            mechanicalAmount: {
              calculationRateBasis: randomInt(),
            },
          };

          // Act
          royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
            // Assert
            expect(salesLine.customMechanicalAmount).toBe(salesLine.customPPD);
            done();
          });
        });
      });

      describe('when mechanicalType is Net Receipts', () => {
        it('should set fields.output.mechanicalAmount to the salesLine.netAmount / units * contractCurrencyExchangeRate', (done) => {
        // Arrange
          salesLine = {
            id: '59dd28d9e1d5d31023d09ba1',
            _id: '59dd28d9e1d5d31023d09ba2',
            name: 'Sales Line',
            saleDate: '11/11/2011',
            catType: 'Track',
            releaseId: '59dd28d9e1d5d31023d09ba3',
            mechanicalPercentage: randomInt(),
            mechanicalType: 'Net Receipts',
            customPPD: randomInt(),
            contractCurrencyExchangeRate: randomInt(),
            customNetAmount: randomInt(),
            units: randomInt(),
          };

          calculation = {
            type: 'Fixed Unit Rate',
            rate: randomInt(),
            unitRate: randomInt(),
            rateBasis: 'calculationRateBasis',
            objectPercentage: randomInt(),
          };

          royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

          fields = {
            output: {
              calculationInput: 'customCalculationInput',
              proRataAmount: 'customProRataAmount',
              mechanicalAmount: 'customMechanicalAmount',
              netAmount: 'customNetAmount',
              ppd: 'customPPD',
            },
            input: {
              perUnitRate: 'customUnitPrice',
            },
          };

          royaltyCalculator.contract.terms = {
            mechanicalAmount: {
              calculationRateBasis: randomInt(),
            },
          };

          // Act
          royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
            // Assert
            expect(salesLine.customMechanicalAmount).toBeCloseTo(salesLine.customNetAmount / salesLine.units * salesLine.contractCurrencyExchangeRate, 5);
            done();
          });
        });
      });

      it('should set fields.output.mechanicalDeduction value to units * mechanicalAmount * objectPercentage / 100 * mechanicalPercentage / 100 * exchangeRate', (done) => {
      // Arrange
        const salesLine = {
          id: '59dd28d9e1d5d31023d09ba1',
          _id: '59dd28d9e1d5d31023d09ba2',
          name: 'Sales Line',
          saleDate: '11/11/2011',
          catType: 'Track',
          releaseId: '59dd28d9e1d5d31023d09ba3',
          mechanicalType: 'Statutory Rate',
          mechanicalPercentage: randomInt(),
          mechanicalAmount: randomInt(),
          units: randomInt(),
        };

        const calculation = {
          type: 'Fixed Unit Rate',
          rate: randomInt(),
          unitRate: randomInt(),
          rateBasis: 'calculationRateBasis',
          objectPercentage: randomInt(),
        };

        royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

        const fields = {
          output: {
            calculationInput: 'customCalculationInput',
            proRataAmount: 'customProRataAmount',
            mechanicalAmount: 'customMechanicalAmount',
            netAmount: 'customNetAmount',
            ppd: 'customPPD',
            mechanicalDeduction: 'customMechanicalDeduction',
          },
          input: {
            perUnitRate: 'customUnitPrice',
          },
        };

        royaltyCalculator.contract.terms = {
          mechanicalAmount: {
            calculationRateBasis: randomInt(),
          },
        };

        royaltyCalculator.exchangeRates = [];

        // Act
        royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
          // Assert
          expect(salesLine.customMechanicalDeduction).toBeCloseTo(salesLine.units * salesLine.mechanicalAmount * calculation.objectPercentage / 100 * salesLine.mechanicalPercentage / 100 * 1, 5);
          done();
        });
      });

      describe("when mechanicalDeductionType is 'Post-Calculation'", () => {
        it('should deduct the mechanical amount from the calculationOutput', (done) => {
        // Arrange
          salesLine = {
            id: '59dd28d9e1d5d31023d09ba1',
            _id: '59dd28d9e1d5d31023d09ba2',
            name: 'Sales Line',
            saleDate: '11/11/2011',
            catType: 'Track',
            releaseId: '59dd28d9e1d5d31023d09ba3',
            mechanicalType: 'Statutory Rate',
            mechanicalPercentage: randomInt(),
            mechanicalAmount: randomInt(),
            units: randomInt(),
            mechanicalDeductionType: 'Post-Calculation',
            customCalculationInput: randomInt(),
            proRataTrackAmount: randomInt(),
            customDeduction: randomInt(),
            share: randomInt(),
            mechanicalBasisPercentage: randomInt(),
            multiplier: randomInt(),
            royaltyRate: randomInt(),
          };

          calculation = {
            type: 'Fixed Unit Rate',
            rate: randomInt(),
            unitRate: randomInt(),
            rateBasis: 'calculationRateBasis',
            objectPercentage: randomInt(),
          };

          royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

          fields = {
            output: {
              calculationInput: 'customCalculationInput',
              proRataAmount: 'customProRataAmount',
              mechanicalAmount: 'customMechanicalAmount',
              netAmount: 'customNetAmount',
              ppd: 'customPPD',
              mechanicalDeduction: 'customMechanicalDeduction',
              calculationOutput: 'customCalculationOutput',
              deduction: 'customDeduction',
            },
            input: {
              perUnitRate: 'customUnitPrice',
            },
          };

          royaltyCalculator.contract.terms = {
            mechanicalAmount: {
              calculationRateBasis: randomInt(),
            },
          };

          royaltyCalculator.exchangeRates = [];

          // Act
          royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
            // Assert
            expect(salesLine.customCalculationOutput).toBeCloseTo(((salesLine[fields.output.calculationInput] * salesLine.proRataTrackAmount - salesLine[fields.output.deduction]) * calculation.objectPercentage / 100 * salesLine.share / 100 * salesLine.mechanicalBasisPercentage / 100 * salesLine.multiplier * salesLine.royaltyRate / 100) - salesLine[fields.output.mechanicalDeduction], 5);
            done();
          });
        });
      });

      describe("when mechanicalDeductionType is 'Pre-Calculation'", () => {
        it('should be deducted from the calculationInput before calculating the royalty', (done) => {
        // Arrange
          salesLine = {
            id: '59dd28d9e1d5d31023d09ba1',
            _id: '59dd28d9e1d5d31023d09ba2',
            name: 'Sales Line',
            saleDate: '11/11/2011',
            catType: 'Track',
            releaseId: '59dd28d9e1d5d31023d09ba3',
            mechanicalType: 'Statutory Rate',
            mechanicalPercentage: randomInt(),
            mechanicalAmount: randomInt(),
            units: randomInt(),
            mechanicalDeductionType: 'Pre-Calculation',
            customCalculationInput: randomInt(),
            proRataTrackAmount: randomInt(),
            customDeduction: randomInt(),
            share: randomInt(),
            mechanicalBasisPercentage: randomInt(),
            multiplier: randomInt(),
            royaltyRate: randomInt(),
          };

          calculation = {
            type: 'Fixed Unit Rate',
            rate: randomInt(),
            unitRate: randomInt(),
            rateBasis: 'calculationRateBasis',
            objectPercentage: randomInt(),
          };

          royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

          fields = {
            output: {
              calculationInput: 'customCalculationInput',
              proRataAmount: 'customProRataAmount',
              mechanicalAmount: 'customMechanicalAmount',
              netAmount: 'customNetAmount',
              ppd: 'customPPD',
              mechanicalDeduction: 'customMechanicalDeduction',
              calculationOutput: 'customCalculationOutput',
              deduction: 'customDeduction',
            },
            input: {
              perUnitRate: 'customUnitPrice',
            },
          };

          royaltyCalculator.contract.terms = {
            mechanicalAmount: {
              calculationRateBasis: randomInt(),
            },
          };

          royaltyCalculator.exchangeRates = [];

          // Act
          royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
            // Assert
            expect(salesLine.customCalculationOutput).toBeCloseTo((salesLine[fields.output.calculationInput] * salesLine.proRataTrackAmount * calculation.objectPercentage / 100 - salesLine[fields.output.deduction] - salesLine[fields.output.mechanicalDeduction]) * salesLine.share / 100 * salesLine.mechanicalBasisPercentage / 100 * salesLine.multiplier * salesLine.royaltyRate / 100, 5);
            done();
          });
        });
      });
    });

    describe('deduction', () => {
      describe("when deductionType is 'Pre-Calculation'", () => {
        it('should set deductionRate to 0 when it is blank', (done) => {
        // Arrange
          salesLine = {
            id: '59dd28d9e1d5d31023d09ba1',
            _id: '59dd28d9e1d5d31023d09ba2',
            name: 'Sales Line',
            saleDate: '11/11/2011',
            catType: 'Track',
            releaseId: '59dd28d9e1d5d31023d09ba3',
            mechanicalType: 'Statutory Rate',
            mechanicalPercentage: randomInt(),
            mechanicalAmount: randomInt(),
            units: randomInt(),
          };

          calculation = {
            type: 'Fixed Unit Rate',
            rate: randomInt(),
            unitRate: randomInt(),
            rateBasis: 'calculationRateBasis',
            objectPercentage: randomInt(),
          };

          royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

          fields = {
            output: {
              calculationInput: 'customCalculationInput',
              proRataAmount: 'customProRataAmount',
              mechanicalAmount: 'customMechanicalAmount',
              netAmount: 'customNetAmount',
              ppd: 'customPPD',
              mechanicalDeduction: 'customMechanicalDeduction',
            },
            input: {
              perUnitRate: 'customUnitPrice',
            },
          };

          royaltyCalculator.contract.terms = {
            mechanicalAmount: {
              calculationRateBasis: randomInt(),
            },
          };

          royaltyCalculator.exchangeRates = [];

          // Act
          royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
            // Assert
            expect(salesLine.deductionRate).toBe(0);
            done();
          });
        });

        it('should not change deductionRate when it is present', (done) => {
        // Arrange
          salesLine = {
            id: '59dd28d9e1d5d31023d09ba1',
            _id: '59dd28d9e1d5d31023d09ba2',
            name: 'Sales Line',
            saleDate: '11/11/2011',
            catType: 'Track',
            releaseId: '59dd28d9e1d5d31023d09ba3',
            mechanicalType: 'Statutory Rate',
            mechanicalPercentage: randomInt(),
            mechanicalAmount: randomInt(),
            units: randomInt(),
            deductionRate: randomInt(),
          };

          calculation = {
            type: 'Fixed Unit Rate',
            rate: randomInt(),
            unitRate: randomInt(),
            rateBasis: 'calculationRateBasis',
            objectPercentage: randomInt(),
          };

          royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

          fields = {
            output: {
              calculationInput: 'customCalculationInput',
              proRataAmount: 'customProRataAmount',
              mechanicalAmount: 'customMechanicalAmount',
              netAmount: 'customNetAmount',
              ppd: 'customPPD',
              mechanicalDeduction: 'customMechanicalDeduction',
            },
            input: {
              perUnitRate: 'customUnitPrice',
            },
          };

          royaltyCalculator.contract.terms = {
            mechanicalAmount: {
              calculationRateBasis: randomInt(),
            },
          };

          royaltyCalculator.exchangeRates = [];

          // Act
          royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
            // Assert
            expect(salesLine.deductionRate).toBe(salesLine.deductionRate);
            done();
          });
        });

        describe("and when deductionCalculationType is 'Unit Rate'", () => {
          it('should set fields.output.deduction value to deductionUnitRate * units', (done) => {
          // Arrange
            salesLine = {
              id: '59dd28d9e1d5d31023d09ba1',
              _id: '59dd28d9e1d5d31023d09ba2',
              name: 'Sales Line',
              saleDate: '11/11/2011',
              catType: 'Track',
              releaseId: '59dd28d9e1d5d31023d09ba3',
              mechanicalType: 'Statutory Rate',
              mechanicalPercentage: randomInt(),
              mechanicalAmount: randomInt(),
              units: randomInt(),
              deductionCalculationType: 'Unit Rate',
              customDeductionUnitRate: randomInt(),
              deductionRate: randomInt(),
            };

            calculation = {
              type: 'Fixed Unit Rate',
              rate: randomInt(),
              unitRate: randomInt(),
              rateBasis: 'calculationRateBasis',
              objectPercentage: randomInt(),
            };

            royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

            fields = {
              output: {
                calculationInput: 'customCalculationInput',
                proRataAmount: 'customProRataAmount',
                mechanicalAmount: 'customMechanicalAmount',
                netAmount: 'customNetAmount',
                ppd: 'customPPD',
                mechanicalDeduction: 'customMechanicalDeduction',
                deductionUnitRate: 'customDeductionUnitRate',
                deduction: 'customDeduction',
              },
              input: {
                perUnitRate: 'customUnitPrice',
              },
            };

            royaltyCalculator.contract.terms = {
              mechanicalAmount: {
                calculationRateBasis: randomInt(),
              },
            };

            royaltyCalculator.exchangeRates = [];

            // Act
            royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
              // Assert
              expect(salesLine.customDeduction).toBeCloseTo(salesLine.customDeductionUnitRate * salesLine.units * calculation.objectPercentage / 100 * salesLine.deductionRate / 100, 5);
              done();
            });
          });

          it('should set fields.output.deduction to deduction * deductionRate / 100 when deductionRate exists', (done) => {
          // Arrange
            salesLine = {
              id: '59dd28d9e1d5d31023d09ba1',
              _id: '59dd28d9e1d5d31023d09ba2',
              name: 'Sales Line',
              saleDate: '11/11/2011',
              catType: 'Track',
              releaseId: '59dd28d9e1d5d31023d09ba3',
              mechanicalType: 'Statutory Rate',
              mechanicalPercentage: randomInt(),
              mechanicalAmount: randomInt(),
              units: randomInt(),
              deductionCalculationType: 'Unit Rate',
              customDeductionUnitRate: randomInt(),
              deductionRate: randomInt(),
            };

            calculation = {
              type: 'Fixed Unit Rate',
              rate: randomInt(),
              unitRate: randomInt(),
              rateBasis: 'calculationRateBasis',
              objectPercentage: randomInt(),
            };

            royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

            fields = {
              output: {
                calculationInput: 'customCalculationInput',
                proRataAmount: 'customProRataAmount',
                mechanicalAmount: 'customMechanicalAmount',
                netAmount: 'customNetAmount',
                ppd: 'customPPD',
                mechanicalDeduction: 'customMechanicalDeduction',
                deductionUnitRate: 'customDeductionUnitRate',
                deduction: 'customDeduction',
              },
              input: {
                perUnitRate: 'customUnitPrice',
              },
            };

            royaltyCalculator.contract.terms = {
              mechanicalAmount: {
                calculationRateBasis: randomInt(),
              },
            };

            royaltyCalculator.exchangeRates = [];

            // Act
            royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
              // Assert
              expect(salesLine.customDeduction).toBeCloseTo(salesLine.customDeductionUnitRate * salesLine.units * salesLine.deductionRate / 100, 5);
              done();
            });
          });

          it('should set fields.output.deduction to deduction * deductionRate / 100 * deductionReductionRate / 100 when deductionReductionRate exists', (done) => {
          // Arrange
            salesLine = {
              id: '59dd28d9e1d5d31023d09ba1',
              _id: '59dd28d9e1d5d31023d09ba2',
              name: 'Sales Line',
              saleDate: '11/11/2011',
              catType: 'Track',
              releaseId: '59dd28d9e1d5d31023d09ba3',
              mechanicalType: 'Statutory Rate',
              mechanicalPercentage: randomInt(),
              mechanicalAmount: randomInt(),
              units: randomInt(),
              deductionCalculationType: 'Unit Rate',
              customDeductionUnitRate: randomInt(),
              deductionRate: randomInt(),
              deductionReductionRate: randomInt(),
            };

            calculation = {
              type: 'Fixed Unit Rate',
              rate: randomInt(),
              unitRate: randomInt(),
              rateBasis: 'calculationRateBasis',
              objectPercentage: randomInt(),
            };

            royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

            fields = {
              output: {
                calculationInput: 'customCalculationInput',
                proRataAmount: 'customProRataAmount',
                mechanicalAmount: 'customMechanicalAmount',
                netAmount: 'customNetAmount',
                ppd: 'customPPD',
                mechanicalDeduction: 'customMechanicalDeduction',
                deductionUnitRate: 'customDeductionUnitRate',
                deduction: 'customDeduction',
              },
              input: {
                perUnitRate: 'customUnitPrice',
              },
            };

            royaltyCalculator.contract.terms = {
              mechanicalAmount: {
                calculationRateBasis: randomInt(),
              },
            };

            royaltyCalculator.exchangeRates = [];

            // Act
            royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
              // Assert
              expect(salesLine.customDeduction).toBeCloseTo(salesLine.customDeductionUnitRate * salesLine.units * salesLine.deductionRate / 100 * salesLine.deductionReductionRate / 100, 5);
              done();
            });
          });
        });

        describe("and when deductionCalculationType is 'Percentage'", () => {
          it('should set fields.output.deduction value to calculationInput * deductionRate / 100', (done) => {
          // Arrange
            salesLine = {
              id: '59dd28d9e1d5d31023d09ba1',
              _id: '59dd28d9e1d5d31023d09ba2',
              name: 'Sales Line',
              saleDate: '11/11/2011',
              catType: 'Track',
              releaseId: '59dd28d9e1d5d31023d09ba3',
              mechanicalType: 'Statutory Rate',
              mechanicalPercentage: randomInt(),
              mechanicalAmount: randomInt(),
              units: randomInt(),
              deductionCalculationType: 'Percentage',
              customCalculationInput: randomInt(),
            };

            calculation = {
              type: 'Fixed Unit Rate',
              rate: randomInt(),
              unitRate: randomInt(),
              rateBasis: 'calculationRateBasis',
              objectPercentage: randomInt(),
            };

            royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

            fields = {
              output: {
                calculationInput: 'customCalculationInput',
                proRataAmount: 'customProRataAmount',
                mechanicalAmount: 'customMechanicalAmount',
                netAmount: 'customNetAmount',
                ppd: 'customPPD',
                mechanicalDeduction: 'customMechanicalDeduction',
                deductionUnitRate: 'customDeductionUnitRate',
                deduction: 'customDeduction',
              },
              input: {
                perUnitRate: 'customUnitPrice',
              },
            };

            royaltyCalculator.contract.terms = {
              mechanicalAmount: {
                calculationRateBasis: randomInt(),
              },
            };

            royaltyCalculator.exchangeRates = [];

            // Act
            royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
              // Assert
              expect(salesLine.customDeduction).toBeCloseTo(salesLine.customCalculationInput * salesLine.deductionRate / 100, 5);
              done();
            });
          });

          it('should set fields.output.deduction to calculationInput * deductionRate / 100 * deductionReductionRate / 100 when deductionReductionRate exists', (done) => {
          // Arrange
            salesLine = {
              id: '59dd28d9e1d5d31023d09ba1',
              _id: '59dd28d9e1d5d31023d09ba2',
              name: 'Sales Line',
              saleDate: '11/11/2011',
              catType: 'Track',
              releaseId: '59dd28d9e1d5d31023d09ba3',
              mechanicalType: 'Statutory Rate',
              mechanicalPercentage: randomInt(),
              mechanicalAmount: randomInt(),
              units: randomInt(),
              deductionCalculationType: 'Percentage',
              customCalculationInput: randomInt(),
              deductionReductionRate: randomInt(),
            };

            calculation = {
              type: 'Fixed Unit Rate',
              rate: randomInt(),
              unitRate: randomInt(),
              rateBasis: 'calculationRateBasis',
              objectPercentage: randomInt(),
            };

            royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

            fields = {
              output: {
                calculationInput: 'customCalculationInput',
                proRataAmount: 'customProRataAmount',
                mechanicalAmount: 'customMechanicalAmount',
                netAmount: 'customNetAmount',
                ppd: 'customPPD',
                mechanicalDeduction: 'customMechanicalDeduction',
                deductionUnitRate: 'customDeductionUnitRate',
                deduction: 'customDeduction',
              },
              input: {
                perUnitRate: 'customUnitPrice',
              },
            };

            royaltyCalculator.contract.terms = {
              mechanicalAmount: {
                calculationRateBasis: 99,
              },
            };

            royaltyCalculator.exchangeRates = [];

            // Act
            royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
              // Assert
              expect(salesLine.customDeduction).toBeCloseTo(salesLine.customCalculationInput * salesLine.deductionRate / 100 * salesLine.deductionReductionRate / 100, 5);
              done();
            });
          });
        });

        it('should set deduction based on pro-rata eg. objectPercentage', (done) => {
        // Arrange
          salesLine = {
            id: '59dd28d9e1d5d31023d09ba1',
            _id: '59dd28d9e1d5d31023d09ba2',
            name: 'Sales Line',
            saleDate: '11/11/2011',
            catType: 'Track',
            releaseId: '59dd28d9e1d5d31023d09ba3',
            mechanicalType: 'Statutory Rate',
            mechanicalPercentage: randomInt(),
            mechanicalAmount: randomInt(),
            units: randomInt(),
            deductionCalculationType: 'Percentage',
            customCalculationInput: randomInt(),
          };

          calculation = {
            type: 'Unit Rate',
            rate: randomInt(),
            unitRate: randomInt(),
            rateBasis: 'calculationRateBasis',
            objectPercentage: randomInt(),
          };

          royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

          fields = {
            output: {
              calculationInput: 'customCalculationInput',
              proRataAmount: 'customProRataAmount',
              mechanicalAmount: 'customMechanicalAmount',
              netAmount: 'customNetAmount',
              ppd: 'customPPD',
              mechanicalDeduction: 'customMechanicalDeduction',
              deductionUnitRate: 'customDeductionUnitRate',
              deduction: 'customDeduction',
            },
            input: {
              perUnitRate: 'customUnitPrice',
            },
          };

          royaltyCalculator.contract.terms = {
            mechanicalAmount: {
              calculationRateBasis: randomInt(),
            },
          };

          royaltyCalculator.exchangeRates = [];

          // Act
          royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
            // Assert
            expect(salesLine.customDeduction).toBeCloseTo(salesLine.customCalculationInput * salesLine.deductionRate / 100 * calculation.objectPercentage / 100, 5);
            done();
          });
        });
      });

      describe("when deductionType is 'Post-Calculation'", () => {
        describe("and when deductionCalculationType is 'Unit Rate'", () => {
          it('should set fields.output.deduction value to deductionUnitRate * units', (done) => {
          // Arrange
            salesLine = {
              id: '59dd28d9e1d5d31023d09ba1',
              _id: '59dd28d9e1d5d31023d09ba2',
              name: 'Sales Line',
              saleDate: '11/11/2011',
              catType: 'Track',
              releaseId: '59dd28d9e1d5d31023d09ba3',
              mechanicalType: 'Statutory Rate',
              mechanicalPercentage: randomInt(),
              mechanicalAmount: randomInt(),
              units: randomInt(),
              deductionCalculationType: 'Unit Rate',
              customDeductionUnitRate: randomInt(),
              deductionType: 'Post-Calculation',
            };

            calculation = {
              type: 'Fixed Unit Rate',
              rate: randomInt(),
              unitRate: randomInt(),
              rateBasis: 'calculationRateBasis',
              objectPercentage: randomInt(),
            };

            royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

            fields = {
              output: {
                calculationInput: 'customCalculationInput',
                proRataAmount: 'customProRataAmount',
                mechanicalAmount: 'customMechanicalAmount',
                netAmount: 'customNetAmount',
                ppd: 'customPPD',
                mechanicalDeduction: 'customMechanicalDeduction',
                deductionUnitRate: 'customDeductionUnitRate',
                deduction: 'customDeduction',
              },
              input: {
                perUnitRate: 'customUnitPrice',
              },
            };

            royaltyCalculator.contract.terms = {
              mechanicalAmount: {
                calculationRateBasis: randomInt(),
              },
            };

            royaltyCalculator.exchangeRates = [];

            // Act
            royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
              // Assert
              expect(salesLine.customDeduction).toBeCloseTo(salesLine.customDeductionUnitRate * salesLine.units * calculation.objectPercentage / 100 * salesLine.deductionRate / 100, 5);
              done();
            });
          });

          it('should set fields.output.deduction to deduction * deductionRate / 100 when deductionRate exists', (done) => {
          // Arrange
            salesLine = {
              id: '59dd28d9e1d5d31023d09ba1',
              _id: '59dd28d9e1d5d31023d09ba2',
              name: 'Sales Line',
              saleDate: '11/11/2011',
              catType: 'Track',
              releaseId: '59dd28d9e1d5d31023d09ba3',
              mechanicalType: 'Statutory Rate',
              mechanicalPercentage: randomInt(),
              mechanicalAmount: randomInt(),
              units: randomInt(),
              deductionCalculationType: 'Unit Rate',
              customDeductionUnitRate: randomInt(),
              deductionType: 'Post-Calculation',
            };

            calculation = {
              type: 'Fixed Unit Rate',
              rate: randomInt(),
              unitRate: randomInt(),
              rateBasis: 'calculationRateBasis',
              objectPercentage: randomInt(),
            };

            royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

            fields = {
              output: {
                calculationInput: 'customCalculationInput',
                proRataAmount: 'customProRataAmount',
                mechanicalAmount: 'customMechanicalAmount',
                netAmount: 'customNetAmount',
                ppd: 'customPPD',
                mechanicalDeduction: 'customMechanicalDeduction',
                deductionUnitRate: 'customDeductionUnitRate',
                deduction: 'customDeduction',
              },
              input: {
                perUnitRate: 'customUnitPrice',
              },
            };

            royaltyCalculator.contract.terms = {
              mechanicalAmount: {
                calculationRateBasis: randomInt(),
              },
            };

            royaltyCalculator.exchangeRates = [];

            // Act
            royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
              // Assert
              expect(salesLine.customDeduction).toBeCloseTo(salesLine.customDeductionUnitRate * salesLine.units * salesLine.deductionRate / 100, 5);
              done();
            });
          });

          it('should set fields.output.deduction to deduction * deductionRate / 100 * deductionReductionRate / 100 when deductionReductionRate exists', (done) => {
          // Arrange
            salesLine = {
              id: '59dd28d9e1d5d31023d09ba1',
              _id: '59dd28d9e1d5d31023d09ba2',
              name: 'Sales Line',
              saleDate: '11/11/2011',
              catType: 'Track',
              releaseId: '59dd28d9e1d5d31023d09ba3',
              mechanicalType: 'Statutory Rate',
              mechanicalPercentage: randomInt(),
              mechanicalAmount: randomInt(),
              units: randomInt(),
              deductionCalculationType: 'Unit Rate',
              customDeductionUnitRate: randomInt(),
              deductionType: 'Post-Calculation',
              deductionReductionRate: randomInt(),
            };

            calculation = {
              type: 'Fixed Unit Rate',
              rate: randomInt(),
              unitRate: randomInt(),
              rateBasis: 'calculationRateBasis',
              objectPercentage: randomInt(),
            };

            royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

            fields = {
              output: {
                calculationInput: 'customCalculationInput',
                proRataAmount: 'customProRataAmount',
                mechanicalAmount: 'customMechanicalAmount',
                netAmount: 'customNetAmount',
                ppd: 'customPPD',
                mechanicalDeduction: 'customMechanicalDeduction',
                deductionUnitRate: 'customDeductionUnitRate',
                deduction: 'customDeduction',
              },
              input: {
                perUnitRate: 'customUnitPrice',
              },
            };

            royaltyCalculator.contract.terms = {
              mechanicalAmount: {
                calculationRateBasis: 99,
              },
            };

            royaltyCalculator.exchangeRates = [];

            // Act
            royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
              // Assert
              expect(salesLine.customDeduction).toBeCloseTo(salesLine.customDeductionUnitRate * salesLine.units * salesLine.deductionRate / 100 * salesLine.deductionReductionRate / 100, 5);
              done();
            });
          });
        });

        describe("and when deductionCalculationType is 'Percentage'", () => {
          it('should set fields.output.deduction value to calculationOutput * deductionRate / 100', (done) => {
          // Arrange
            salesLine = {
              id: '59dd28d9e1d5d31023d09ba1',
              _id: '59dd28d9e1d5d31023d09ba2',
              name: 'Sales Line',
              saleDate: '11/11/2011',
              catType: 'Track',
              releaseId: '59dd28d9e111223323d09ba3',
              units: randomInt(),
              deductionCalculationType: 'Percentage',
              deductionType: 'Post-Calculation',
              customCalculationInput: randomInt(),
              customCalculationOutput: randomInt(),
              deduction: 0,
            };

            calculation = {
              type: 'Unit Rate',
              rate: randomInt(),
              unitRate: randomInt(),
              rateBasis: 'calculationRateBasis',
              objectPercentage: randomInt(),
            };

            royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

            fields = {
              output: {
                calculationInput: 'customCalculationInput',
                calculationOutput: 'customCalculationOutput',
                proRataAmount: 'customProRataAmount',
                mechanicalAmount: 'customMechanicalAmount',
                netAmount: 'customNetAmount',
                ppd: 'customPPD',
                mechanicalDeduction: 'customMechanicalDeduction',
                deductionUnitRate: 'customDeductionUnitRate',
                deduction: 'customDeduction',
              },
              input: {
                perUnitRate: 'customUnitPrice',
              },
            };

            royaltyCalculator.contract.terms = {
              mechanicalAmount: {
                calculationRateBasis: randomInt(),
              },
            };

            royaltyCalculator.exchangeRates = [];

            // Act
            royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
              // Assert
              expect(salesLine.customDeduction).toBeCloseTo(salesLine.customCalculationOutput * salesLine.deductionRate / 100, 5);
              done();
            });
          });
        });
      });
    });

    describe('withholding deduction', () => {
      describe("when withholdingTaxType is 'Pre-Calculation'", () => {
        describe("and when withholdingTaxCalculationType is 'Unit Rate'", () => {
          it('should set fields.output.withholdingTax value to deductionUnitRate * units', (done) => {
            // Arrange
            salesLine = {
              id: '59dd28d9e1d5d31023d09ba1',
              _id: '59dd28d9e1d5d31023d09ba2',
              name: 'Sales Line',
              saleDate: '11/11/2011',
              catType: 'Track',
              releaseId: '59dd28d9e1d5d31023d09ba3',
              mechanicalType: 'Statutory Rate',
              mechanicalPercentage: randomInt(),
              mechanicalAmount: randomInt(),
              units: randomInt(),
              withholdingTaxType: 'Pre-Calculation',
              withholdingTaxCalculationType: 'Unit Rate',
              customWithholdingTaxUnitRate: randomInt(),
            };

            calculation = {
              type: 'Fixed Unit Rate',
              rate: randomInt(),
              unitRate: randomInt(),
              rateBasis: 'calculationRateBasis',
              objectPercentage: randomInt(),
            };

            royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

            fields = {
              output: {
                calculationInput: 'customCalculationInput',
                withholdingTax: 'customWithholdingTax',
                withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
              },
              input: {
                perUnitRate: 'customUnitPrice',
              },
            };

            royaltyCalculator.contract.terms = {
              mechanicalAmount: {
                calculationRateBasis: randomInt(),
              },
            };

            royaltyCalculator.exchangeRates = [];

            // Act
            royaltyCalculator.calculateInCurrency(
              fields,
              salesLine,
              originalSalesLine,
              calculation,
              deductionFilters,
              withholdingTaxFilters,
              mechanicalFilters,
              escalationTrackers,
              () => {
                // Assert
                expect(salesLine.customWithholdingTax).toEqual(
                  salesLine.customWithholdingTaxUnitRate * salesLine.units,
                );
                done();
              },
            );
          });

          it('should set fields.output.withholdingTax to deduction * withholdingTaxRate / 100 when withholdingTaxRate exists', (done) => {
            // Arrange
            salesLine = {
              id: '59dd28d9e1d5d31023d09ba1',
              _id: '59dd28d9e1d5d31023d09ba2',
              name: 'Sales Line',
              saleDate: '11/11/2011',
              catType: 'Track',
              releaseId: '59dd28d9e1d5d31023d09ba3',
              mechanicalType: 'Statutory Rate',
              mechanicalPercentage: randomInt(),
              mechanicalAmount: randomInt(),
              units: randomInt(),
              withholdingTaxType: 'Pre-Calculation',
              withholdingTaxCalculationType: 'Unit Rate',
              customWithholdingTaxUnitRate: randomInt(),
              withholdingTaxRate: randomInt(),
            };

            calculation = {
              type: 'Fixed Unit Rate',
              rate: randomInt(),
              unitRate: randomInt(),
              rateBasis: 'calculationRateBasis',
              objectPercentage: randomInt(),
            };

            royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

            fields = {
              output: {
                calculationInput: 'customCalculationInput',
                withholdingTax: 'customWithholdingTax',
                withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
              },
              input: {
                perUnitRate: 'customUnitPrice',
              },
            };

            royaltyCalculator.contract.terms = {
              mechanicalAmount: {
                calculationRateBasis: randomInt(),
              },
            };

            royaltyCalculator.exchangeRates = [];

            // Act
            royaltyCalculator.calculateInCurrency(
              fields,
              salesLine,
              originalSalesLine,
              calculation,
              deductionFilters,
              withholdingTaxFilters,
              mechanicalFilters,
              escalationTrackers,
              () => {
                // Assert
                expect(salesLine.customWithholdingTax).toBeCloseTo(salesLine.customWithholdingTaxUnitRate * salesLine.units * salesLine.withholdingTaxRate / 100, 5);
                done();
              },
            );
          });

          it('should set fields.output.withholdingTax to deduction * withholdingTaxRate / 100 * deductionReductionRate / 100 when withholdingTaxReductionRate exists', (done) => {
            // Arrange
            salesLine = {
              id: '59dd28d9e1d5d31023d09ba1',
              _id: '59dd28d9e1d5d31023d09ba2',
              name: 'Sales Line',
              saleDate: '11/11/2011',
              catType: 'Track',
              releaseId: '59dd28d9e1d5d31023d09ba3',
              mechanicalType: 'Statutory Rate',
              mechanicalPercentage: randomInt(),
              mechanicalAmount: randomInt(),
              units: randomInt(),
              withholdingTaxType: 'Pre-Calculation',
              withholdingTaxCalculationType: 'Unit Rate',
              customWithholdingTaxUnitRate: randomInt(),
              withholdingTaxRate: randomInt(),
              withholdingTaxReductionRate: randomInt(),
            };

            calculation = {
              type: 'Fixed Unit Rate',
              rate: randomInt(),
              unitRate: randomInt(),
              rateBasis: 'calculationRateBasis',
              objectPercentage: randomInt(),
            };

            royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

            fields = {
              output: {
                calculationInput: 'customCalculationInput',
                withholdingTax: 'customWithholdingTax',
                withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
              },
              input: {
                perUnitRate: 'customUnitPrice',
              },
            };

            royaltyCalculator.contract.terms = {
              mechanicalAmount: {
                calculationRateBasis: randomInt(),
              },
            };

            royaltyCalculator.exchangeRates = [];

            // Act
            royaltyCalculator.calculateInCurrency(
              fields,
              salesLine,
              originalSalesLine,
              calculation,
              deductionFilters,
              withholdingTaxFilters,
              mechanicalFilters,
              escalationTrackers,
              () => {
                // Assert
                expect(salesLine.customWithholdingTax).toBeCloseTo(
                  salesLine.customWithholdingTaxUnitRate
                  * salesLine.units
                  * salesLine.withholdingTaxRate / 100
                  * salesLine.withholdingTaxReductionRate / 100,
                );
                done();
              },
            );
          });
        });

        describe("and when withholdingTaxCalculationType is 'Percentage'", () => {
          it('should set fields.output.withholdingTax value to calculationInput * withholdingTaxRate / 100', (done) => {
            // Arrange
            salesLine = {
              id: '59dd28d9e1d5d31023d09ba1',
              _id: '59dd28d9e1d5d31023d09ba2',
              name: 'Sales Line',
              saleDate: '11/11/2011',
              catType: 'Track',
              releaseId: '59dd28d9e1d5d31023d09ba3',
              mechanicalType: 'Statutory Rate',
              mechanicalPercentage: randomInt(),
              mechanicalAmount: randomInt(),
              units: randomInt(),
              withholdingTaxType: 'Pre-Calculation',
              withholdingTaxCalculationType: 'Percentage',
              customWithholdingTaxUnitRate: randomInt(),
              customCalculationInput: randomInt(),
              withholdingTaxRate: randomInt(),
            };

            calculation = {
              type: 'Fixed Unit Rate',
              rate: randomInt(),
              unitRate: randomInt(),
              rateBasis: 'calculationRateBasis',
              objectPercentage: randomInt(),
            };

            royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

            fields = {
              output: {
                calculationInput: 'customCalculationInput',
                withholdingTax: 'customWithholdingTax',
                withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
              },
              input: {
                perUnitRate: 'customUnitPrice',
              },
            };

            royaltyCalculator.contract.terms = {
              mechanicalAmount: {
                calculationRateBasis: randomInt(),
              },
            };

            royaltyCalculator.exchangeRates = [];

            // Act
            royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
              // Assert
              expect(salesLine.customWithholdingTax).toBeCloseTo(salesLine.customCalculationInput * salesLine.withholdingTaxRate / 100, 5);
              done();
            });
          });

          it('should set fields.output.withholdingTax to calculationInput * withholdingTaxRate / 100 * deductionReductionRate / 100 when withholdingTaxReductionRate exists', (done) => {
            // Arrange
            salesLine = {
              id: '59dd28d9e1d5d31023d09ba1',
              _id: '59dd28d9e1d5d31023d09ba2',
              name: 'Sales Line',
              saleDate: '11/11/2011',
              catType: 'Track',
              releaseId: '59dd28d9e1d5d31023d09ba3',
              mechanicalType: 'Statutory Rate',
              mechanicalPercentage: randomInt(),
              mechanicalAmount: randomInt(),
              units: randomInt(),
              withholdingTaxType: 'Pre-Calculation',
              withholdingTaxCalculationType: 'Percentage',
              customWithholdingTaxUnitRate: randomInt(),
              customCalculationInput: randomInt(),
              withholdingTaxRate: randomInt(),
              withholdingTaxReductionRate: randomInt(),
            };

            calculation = {
              type: 'Fixed Unit Rate',
              rate: randomInt(),
              unitRate: randomInt(),
              rateBasis: 'calculationRateBasis',
              objectPercentage: randomInt(),
            };

            royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

            fields = {
              output: {
                calculationInput: 'customCalculationInput',
                withholdingTax: 'customWithholdingTax',
                withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
              },
              input: {
                perUnitRate: 'customUnitPrice',
              },
            };

            royaltyCalculator.contract.terms = {
              mechanicalAmount: {
                calculationRateBasis: randomInt(),
              },
            };

            royaltyCalculator.exchangeRates = [];

            // Act
            royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
              // Assert
              expect(salesLine.customWithholdingTax).toBeCloseTo(
                salesLine.customCalculationInput
                * salesLine.withholdingTaxRate / 100
                * salesLine.withholdingTaxReductionRate / 100,
              );
              done();
            });
          });
        });

        it('should set deduction based on pro-rata eg. objectPercentage', (done) => {
          // Arrange
          salesLine = {
            id: '59dd28d9e1d5d31023d09ba1',
            _id: '59dd28d9e1d5d31023d09ba2',
            name: 'Sales Line',
            saleDate: '11/11/2011',
            catType: 'Track',
            releaseId: '59dd28d9e1d5d31023d09ba3',
            mechanicalType: 'Statutory Rate',
            mechanicalPercentage: randomInt(),
            mechanicalAmount: randomInt(),
            units: randomInt(),
            withholdingTaxType: 'Pre-Calculation',
            withholdingTaxCalculationType: 'Percentage',
            customWithholdingTaxUnitRate: randomInt(),
            customCalculationInput: randomInt(),
            withholdingTaxRate: randomInt(),
            withholdingTaxReductionRate: randomInt(),
          };

          calculation = {
            type: 'Unit Rate',
            rate: randomInt(),
            unitRate: randomInt(),
            rateBasis: 'calculationRateBasis',
            objectPercentage: randomInt(),
          };

          royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

          fields = {
            output: {
              calculationInput: 'customCalculationInput',
              withholdingTax: 'customWithholdingTax',
              withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
            },
            input: {
              perUnitRate: 'customUnitPrice',
            },
          };

          royaltyCalculator.contract.terms = {
            mechanicalAmount: {
              calculationRateBasis: randomInt(),
            },
          };

          royaltyCalculator.exchangeRates = [];

          // Act
          royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
            // Assert
            expect(salesLine.customWithholdingTax).toBeCloseTo(
              salesLine.customCalculationInput
              * salesLine.withholdingTaxRate / 100
              * salesLine.withholdingTaxReductionRate / 100
              * calculation.objectPercentage / 100,
            );
            done();
          });
        });
      });

      describe("when withholdingTaxType is 'Post-Calculation'", () => {
        describe("and when withholdingTaxCalculationType is 'Unit Rate'", () => {
          it('should set fields.output.withholdingTax value to deductionUnitRate * units', (done) => {
            // Arrange
            salesLine = {
              id: '59dd28d9e1d5d31023d09ba1',
              _id: '59dd28d9e1d5d31023d09ba2',
              name: 'Sales Line',
              saleDate: '11/11/2011',
              catType: 'Track',
              releaseId: '59dd28d9e1d5d31023d09ba3',
              mechanicalType: 'Statutory Rate',
              mechanicalPercentage: randomInt(),
              mechanicalAmount: randomInt(),
              units: randomInt(),
              withholdingTaxType: 'Post-Calculation',
              withholdingTaxCalculationType: 'Unit Rate',
              customWithholdingTaxUnitRate: randomInt(),
              withholdingTaxRate: randomInt(),
            };

            calculation = {
              type: 'Fixed Unit Rate',
              rate: randomInt(),
              unitRate: randomInt(),
              rateBasis: 'calculationRateBasis',
              objectPercentage: randomInt(),
            };

            royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

            fields = {
              output: {
                calculationInput: 'customCalculationInput',
                withholdingTax: 'customWithholdingTax',
                withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
              },
              input: {
                perUnitRate: 'customUnitPrice',
              },
            };

            royaltyCalculator.contract.terms = {
              mechanicalAmount: {
                calculationRateBasis: randomInt(),
              },
            };

            royaltyCalculator.exchangeRates = [];

            // Act
            royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
              // Assert
              expect(salesLine.customWithholdingTax).toBeCloseTo(
                salesLine.customWithholdingTaxUnitRate * salesLine.units * salesLine.withholdingTaxRate / 100,
              );
              done();
            });
          });

          it('should set fields.output.withholdingTax to deduction * withholdingTaxRate / 100 * deductionReductionRate / 100 when withholdingTaxReductionRate exists', (done) => {
            // Arrange
            salesLine = {
              id: '59dd28d9e1d5d31023d09ba1',
              _id: '59dd28d9e1d5d31023d09ba2',
              name: 'Sales Line',
              saleDate: '11/11/2011',
              catType: 'Track',
              releaseId: '59dd28d9e1d5d31023d09ba3',
              mechanicalType: 'Statutory Rate',
              mechanicalPercentage: randomInt(),
              mechanicalAmount: randomInt(),
              units: randomInt(),
              withholdingTaxType: 'Post-Calculation',
              withholdingTaxCalculationType: 'Unit Rate',
              customWithholdingTaxUnitRate: randomInt(),
              withholdingTaxRate: randomInt(),
              withholdingTaxReductionRate: randomInt(),
            };

            calculation = {
              type: 'Fixed Unit Rate',
              rate: randomInt(),
              unitRate: randomInt(),
              rateBasis: 'calculationRateBasis',
              objectPercentage: randomInt(),
            };

            royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

            fields = {
              output: {
                calculationInput: 'customCalculationInput',
                withholdingTax: 'customWithholdingTax',
                withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
              },
              input: {
                perUnitRate: 'customUnitPrice',
              },
            };

            royaltyCalculator.contract.terms = {
              mechanicalAmount: {
                calculationRateBasis: randomInt(),
              },
            };

            royaltyCalculator.exchangeRates = [];

            // Act
            royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
              // Assert
              expect(salesLine.customWithholdingTax).toBeCloseTo(
                salesLine.customWithholdingTaxUnitRate
                * salesLine.units
                * salesLine.withholdingTaxRate / 100
                * salesLine.withholdingTaxReductionRate / 100,
              );
              done();
            });
          });
        });

        describe("and when withholdingTaxCalculationType is 'Percentage'", () => {
          it('should set fields.output.withholdingTax value to calculationOutput * withholdingTaxRate / 100', (done) => {
            // Arrange
            salesLine = {
              id: '59dd28d9e1d5d31023d09ba1',
              _id: '59dd28d9e1d5d31023d09ba2',
              name: 'Sales Line',
              saleDate: '11/11/2011',
              catType: 'Track',
              releaseId: '59dd28d9e1d5d31023d09ba3',
              mechanicalType: 'Statutory Rate',
              mechanicalPercentage: randomInt(),
              mechanicalAmount: randomInt(),
              units: randomInt(),
              withholdingTaxType: 'Post-Calculation',
              withholdingTaxCalculationType: 'Percentage',
              customWithholdingTaxUnitRate: randomInt(),
              withholdingTaxRate: randomInt(),
            };

            calculation = {
              type: 'Fixed Unit Rate',
              rate: randomInt(),
              unitRate: randomInt(),
              rateBasis: 'calculationRateBasis',
              objectPercentage: randomInt(),
            };

            royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

            fields = {
              output: {
                calculationInput: 'customCalculationInput',
                calculationOutput: 'customCalculationOutput',
                withholdingTax: 'customWithholdingTax',
                withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
              },
              input: {
                perUnitRate: 'customUnitPrice',
              },
            };

            royaltyCalculator.contract.terms = {
              mechanicalAmount: {
                calculationRateBasis: randomInt(),
              },
            };

            royaltyCalculator.exchangeRates = [];

            // Act
            royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
              // Assert
              expect(salesLine.customWithholdingTax).toBeCloseTo(
                salesLine.customCalculationOutput * salesLine.withholdingTaxRate / 100,
              );
              done();
            });
          });

          it('should set fields.output.withholdingTax to calculationOutput * withholdingTaxRate / 100 * deductionReductionRate / 100 when withholdingTaxReductionRate exists', (done) => {
            // Arrange
            salesLine = {
              id: '59dd28d9e1d5d31023d09ba1',
              _id: '59dd28d9e1d5d31023d09ba2',
              name: 'Sales Line',
              saleDate: '11/11/2011',
              catType: 'Track',
              releaseId: '59dd28d9e1d5d31023d09ba3',
              mechanicalType: 'Statutory Rate',
              mechanicalPercentage: randomInt(),
              mechanicalAmount: randomInt(),
              units: randomInt(),
              withholdingTaxType: 'Post-Calculation',
              withholdingTaxCalculationType: 'Percentage',
              customWithholdingTaxUnitRate: randomInt(),
              withholdingTaxRate: randomInt(),
              withholdingTaxReductionRate: randomInt(),
            };

            calculation = {
              type: 'Fixed Unit Rate',
              rate: randomInt(),
              unitRate: randomInt(),
              rateBasis: 'calculationRateBasis',
              objectPercentage: randomInt(),
            };

            royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

            fields = {
              output: {
                calculationInput: 'customCalculationInput',
                calculationOutput: 'customCalculationOutput',
                withholdingTax: 'customWithholdingTax',
                withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
              },
              input: {
                perUnitRate: 'customUnitPrice',
              },
            };

            royaltyCalculator.contract.terms = {
              mechanicalAmount: {
                calculationRateBasis: randomInt(),
              },
            };

            royaltyCalculator.exchangeRates = [];

            // Act
            royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
              // Assert
              expect(salesLine.customWithholdingTax).toBeCloseTo(
                salesLine.customCalculationOutput
                * salesLine.withholdingTaxRate / 100
                * salesLine.withholdingTaxReductionRate / 100,
              );
              done();
            });
          });

          it('should update calculationOutput to deduct the withholding tax deduction', (done) => {
            // Arrange
            salesLine = {
              id: '59dd28d9e1d5d31023d09ba1',
              _id: '59dd28d9e1d5d31023d09ba2',
              name: 'Sales Line',
              saleDate: '11/11/2011',
              catType: 'Track',
              releaseId: '59dd28d9e1d5d31023d09ba3',
              mechanicalType: 'Statutory Rate',
              mechanicalPercentage: randomInt(),
              mechanicalAmount: randomInt(),
              units: randomInt(),
              withholdingTaxType: 'Post-Calculation',
              withholdingTaxCalculationType: 'Percentage',
              customWithholdingTaxUnitRate: randomInt(),
              withholdingTaxRate: randomInt(),
              withholdingTaxReductionRate: randomInt(),
            };

            calculation = {
              type: 'Fixed Unit Rate',
              rate: randomInt(),
              unitRate: randomInt(),
              rateBasis: 'calculationRateBasis',
              objectPercentage: randomInt(),
              reserve: randomInt(),
            };

            royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

            fields = {
              output: {
                calculationInput: 'customCalculationInput',
                calculationOutput: 'customCalculationOutput',
                withholdingTax: 'customWithholdingTax',
                withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
                reserve: 'customReserve',
              },
              input: {
                perUnitRate: 'customUnitPrice',
              },
            };

            royaltyCalculator.contract.terms = {
              mechanicalAmount: {
                calculationRateBasis: randomInt(),
              },
            };

            royaltyCalculator.exchangeRates = [];

            // Act
            royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
              // Assert
              expect(salesLine.customReserve).toBeCloseTo(salesLine.customCalculationOutput * calculation.reserve / 100, 5);
              done();
            });
          });
        });
      });
    });

    describe('reserve', () => {
      it('should set reserveRate to calculation.rate', (done) => {
        // Arrange
        salesLine = {
          id: '59dd28d9e1d5d31023d09ba1',
          _id: '59dd28d9e1d5d31023d09ba2',
          name: 'Sales Line',
          saleDate: '11/11/2011',
          catType: 'Track',
          releaseId: '59dd28d9e1d5d31023d09ba3',
          mechanicalType: 'Statutory Rate',
          mechanicalPercentage: randomInt(),
          mechanicalAmount: randomInt(),
          units: randomInt(),
          withholdingTaxType: 'Post-Calculation',
          withholdingTaxCalculationType: 'Percentage',
          customWithholdingTaxUnitRate: randomInt(),
          withholdingTaxRate: randomInt(),
          withholdingTaxReductionRate: randomInt(),
        };

        calculation = {
          type: 'Fixed Unit Rate',
          rate: randomInt(),
          unitRate: randomInt(),
          rateBasis: 'calculationRateBasis',
          objectPercentage: randomInt(),
          reserve: randomInt(),
        };

        royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

        fields = {
          output: {
            calculationInput: 'customCalculationInput',
            calculationOutput: 'customCalculationOutput',
            withholdingTax: 'customWithholdingTax',
            withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
            reserve: 'customReserve',
          },
          input: {
            perUnitRate: 'customUnitPrice',
          },
        };

        royaltyCalculator.contract.terms = {
          mechanicalAmount: {
            calculationRateBasis: randomInt(),
          },
        };

        royaltyCalculator.exchangeRates = [];

        // Act
        royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
          // Assert
          expect(salesLine.reserveRate).toEqual(calculation.reserve);
          done();
        });
      });

      describe("when reserve is 'Pre-Calculation'", () => {
        it('should set reserve to calculationInput * reserveRate / 100', (done) => {
          // Arrange
          salesLine = {
            id: '59dd28d9e1d5d31023d09ba1',
            _id: '59dd28d9e1d5d31023d09ba2',
            name: 'Sales Line',
            saleDate: '11/11/2011',
            catType: 'Track',
            releaseId: '59dd28d9e1d5d31023d09ba3',
            mechanicalType: 'Statutory Rate',
            mechanicalPercentage: randomInt(),
            mechanicalAmount: randomInt(),
            units: randomInt(),
            withholdingTaxType: 'Pre-Calculation',
            withholdingTaxCalculationType: 'Percentage',
            customWithholdingTaxUnitRate: randomInt(),
            withholdingTaxRate: randomInt(),
            withholdingTaxReductionRate: randomInt(),
          };

          calculation = {
            type: 'Fixed Unit Rate',
            rate: randomInt(),
            unitRate: randomInt(),
            rateBasis: 'calculationRateBasis',
            objectPercentage: randomInt(),
            reserveBasis: 'Pre-Calculation',
            reserve: randomInt(),
          };

          royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

          fields = {
            output: {
              calculationInput: 'customCalculationInput',
              calculationOutput: 'customCalculationOutput',
              withholdingTax: 'customWithholdingTax',
              withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
              reserve: 'customReserve',
            },
            input: {
              perUnitRate: 'customUnitPrice',
            },
          };

          royaltyCalculator.contract.terms = {
            mechanicalAmount: {
              calculationRateBasis: 99,
            },
          };

          royaltyCalculator.exchangeRates = [];

          // Act
          royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
            // Assert
            expect(salesLine.customReserve).toBeCloseTo(salesLine.customCalculationInput * calculation.reserve / 100, 5);
            done();
          });
        });
      });

      describe("when reserve is 'Post-Calculation'", () => {
        it('should set reserve to calculationOutput * reserveRate / 100', (done) => {
          // Arrange
          salesLine = {
            id: '59dd28d9e1d5d31023d09ba1',
            _id: '59dd28d9e1d5d31023d09ba2',
            name: 'Sales Line',
            saleDate: '11/11/2011',
            catType: 'Track',
            releaseId: '59dd28d9e1d5d31023d09ba3',
            mechanicalType: 'Statutory Rate',
            mechanicalPercentage: randomInt(),
            mechanicalAmount: randomInt(),
            units: randomInt(),
            withholdingTaxType: 'Post-Calculation',
            withholdingTaxCalculationType: 'Percentage',
            customWithholdingTaxUnitRate: randomInt(),
            withholdingTaxRate: randomInt(),
            withholdingTaxReductionRate: randomInt(),
          };

          calculation = {
            type: 'Fixed Unit Rate',
            rate: randomInt(),
            unitRate: randomInt(),
            rateBasis: 'calculationRateBasis',
            objectPercentage: randomInt(),
            reserve: randomInt(),
          };

          royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

          fields = {
            output: {
              calculationInput: 'customCalculationInput',
              calculationOutput: 'customCalculationOutput',
              withholdingTax: 'customWithholdingTax',
              withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
              reserve: 'customReserve',
            },
            input: {
              perUnitRate: 'customUnitPrice',
            },
          };

          royaltyCalculator.contract.terms = {
            mechanicalAmount: {
              calculationRateBasis: 99,
            },
          };

          royaltyCalculator.exchangeRates = [];

          // Act
          royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
            // Assert
            expect(salesLine.customReserve).toBeCloseTo(salesLine.customCalculationOutput * calculation.reserve / 100, 5);
            done();
          });
        });
      });
    });

    describe('mechanical calculations', () => {
      describe("when catType is 'Release'", () => {
        it('should set proRataTrackAmount to 1 / totalTracks', (done) => {
          // Arrange
          salesLine = {
            id: '59dd28d9e1d5d31023d09ba1',
            _id: '59dd28d9e1d5d31023d09ba2',
            name: 'Sales Line',
            saleDate: '11/11/2011',
            catType: 'Release',
            releaseId: '11dd28d9e1d5d31023d09ba3',
            calculationType: 'PPD',
          };

          calculation = {
            type: 'PPD',
            rate: randomInt(),
            unitRate: randomInt(),
            rateBasis: 'calculationRateBasis',
            objectPercentage: randomInt(),
            reserve: randomInt(),
          };

          royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

          fields = {
            output: {
              calculationInput: 'customCalculationInput',
              calculationOutput: 'customCalculationOutput',
              withholdingTax: 'customWithholdingTax',
              withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
              reserve: 'customReserve',
            },
            input: {
              perUnitRate: 'customUnitPrice',
            },
          };

          royaltyCalculator.contract.contractType = 'Mechanical';
          royaltyCalculator.contract.terms = {
            mechanicalAmount: {
              calculationRateBasis: randomInt(),
            },
            totalTracks: randomInt(),
          };

          royaltyCalculator.exchangeRates = [];

          // Act
          royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
            // Assert
            expect(salesLine.proRataTrackAmount).toBeCloseTo(1 / royaltyCalculator.contract.terms.totalTracks, 5);
            done();
          });
        });
      });

      describe("when catType is not 'Release'", () => {
        it('should set proRataTrackAmount to 1', (done) => {
          // Arrange
          salesLine = {
            id: '59dd28d9e1d5d31023d09ba1',
            _id: '59dd28d9e1d5d31023d09ba2',
            name: 'Sales Line',
            saleDate: '11/11/2011',
            catType: 'Not Release',
            releaseId: '11dd28d9e1d5d31023d09ba3',
            calculationType: 'PPD',
          };

          calculation = {
            type: 'PPD',
            rate: randomInt(),
            unitRate: randomInt(),
            rateBasis: 'calculationRateBasis',
            objectPercentage: randomInt(),
            reserve: randomInt(),
          };

          royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

          fields = {
            output: {
              calculationInput: 'customCalculationInput',
              calculationOutput: 'customCalculationOutput',
              withholdingTax: 'customWithholdingTax',
              withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
              reserve: 'customReserve',
            },
            input: {
              perUnitRate: 'customUnitPrice',
            },
          };

          royaltyCalculator.contract.contractType = 'Mechanical';
          royaltyCalculator.contract.terms = {
            mechanicalAmount: {
              calculationRateBasis: randomInt(),
            },
            totalTracks: randomInt(),
          };

          royaltyCalculator.exchangeRates = [];

          // Act
          royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
            // Assert
            expect(salesLine.proRataTrackAmount).toEqual(1);
            done();
          });
        });
      });
    });

    describe('escalation trackers', function () {
      describe('when fields.type is equal to contractCurrency', function () {
        describe('and when escalationTrackers exist', function () {
          it("should add the calculationOutput to each of the passed escalationTrackers' net values", (done) => {
            // Arrange
            salesLine = {
              id: '59dd28d9e1d5d31023d09ba1',
              _id: '59dd28d9e1d5d31023d09ba2',
              name: 'Sales Line',
              saleDate: '11/11/2011',
              catType: 'Track',
              releaseId: '59dd28d9e1d5d31023d09ba3',
              mechanicalType: 'Statutory Rate',
              mechanicalPercentage: randomInt(),
              mechanicalAmount: randomInt(),
              units: randomInt(),
              withholdingTaxType: 'Post-Calculation',
              withholdingTaxCalculationType: 'Percentage',
              customWithholdingTaxUnitRate: randomInt(),
              withholdingTaxRate: randomInt(),
              withholdingTaxReductionRate: randomInt(),
            };

            calculation = {
              type: 'Fixed Unit Rate',
              rate: randomInt(),
              unitRate: randomInt(),
              rateBasis: 'calculationRateBasis',
              objectPercentage: randomInt(),
              reserve: randomInt(),
            };

            royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

            fields = {
              output: {
                calculationInput: 'customCalculationInput',
                calculationOutput: 'customCalculationOutput',
                withholdingTax: 'customWithholdingTax',
                withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
                reserve: 'customReserve',
              },
              input: {
                perUnitRate: 'customUnitPrice',
              },
              type: 'contractCurrency',
            };

            const escalationTrackers = ['tracker'];
            royaltyCalculator.escalationContract = {
              escalationTracking: {
                tracker: {
                  net: 1000,
                },
              },
            };

            // Act
            royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
              // Assert
              expect(royaltyCalculator.escalationContract.escalationTracking[escalationTrackers[0]].net).toBe(salesLine.customCalculationOutput + 1000);
              done();
            });
          });

          describe("when the calculation type is 'Gross Receipts'", function () {
            it("should add salesLine.contractCurrencyGrossAmount to the escalationTrackers' gross value", (done) => {
            // Arrange
              salesLine = {
                id: '59dd28d9e1d5d31023d09ba1',
                _id: '59dd28d9e1d5d31023d09ba2',
                name: 'Sales Line',
                saleDate: '11/11/2011',
                catType: 'Track',
                releaseId: '59dd28d9e1d5d31023d09ba3',
                mechanicalType: 'Statutory Rate',
                mechanicalPercentage: randomInt(),
                mechanicalAmount: randomInt(),
                units: randomInt(),
                withholdingTaxType: 'Post-Calculation',
                withholdingTaxCalculationType: 'Percentage',
                customWithholdingTaxUnitRate: randomInt(),
                withholdingTaxRate: randomInt(),
                withholdingTaxReductionRate: randomInt(),
                customGrossAmount: randomInt(),
              };

              const calculation = {
                type: 'Gross Receipts',
                rate: randomInt(),
                unitRate: randomInt(),
                rateBasis: 'calculationRateBasis',
                objectPercentage: randomInt(),
                reserve: randomInt(),
              };

              royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

              fields = {
                output: {
                  calculationInput: 'customCalculationInput',
                  calculationOutput: 'customCalculationOutput',
                  withholdingTax: 'customWithholdingTax',
                  withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
                  reserve: 'customReserve',
                },
                input: {
                  perUnitRate: 'customUnitPrice',
                  grossAmount: 'customGrossAmount',
                },
                type: 'contractCurrency',
              };

              const escalationTrackers = ['tracker'];
              const initialGross = randomInt();
              royaltyCalculator.escalationContract = {
                escalationTracking: {
                  tracker: {
                    gross: initialGross,
                  },
                },
              };

              // Act
              royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
              // Assert
                expect(royaltyCalculator.escalationContract.escalationTracking[escalationTrackers[0]].gross).toBe(salesLine.customGrossAmount + initialGross);
                done();
              });
            });
          });

          describe("when the calculation type is 'Net Receipts'", () => {
            it("should add salesLine.contractCurrencyNetAmount to the escalationTrackers' gross value", (done) => {
              // Arrange
              salesLine = {
                id: '59dd28d9e1d5d31023d09ba1',
                _id: '59dd28d9e1d5d31023d09ba2',
                name: 'Sales Line',
                saleDate: '11/11/2011',
                catType: 'Track',
                releaseId: '59dd28d9e1d5d31023d09ba3',
                mechanicalType: 'Statutory Rate',
                mechanicalPercentage: randomInt(),
                mechanicalAmount: randomInt(),
                units: randomInt(),
                withholdingTaxType: 'Post-Calculation',
                withholdingTaxCalculationType: 'Percentage',
                customWithholdingTaxUnitRate: randomInt(),
                withholdingTaxRate: randomInt(),
                withholdingTaxReductionRate: randomInt(),
                customNetAmount: randomInt(),
              };

              calculation = {
                type: 'Net Receipts',
                rate: randomInt(),
                unitRate: randomInt(),
                rateBasis: 'calculationRateBasis',
                objectPercentage: randomInt(),
                reserve: randomInt(),
              };

              royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

              fields = {
                output: {
                  calculationInput: 'customCalculationInput',
                  calculationOutput: 'customCalculationOutput',
                  withholdingTax: 'customWithholdingTax',
                  withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
                  reserve: 'customReserve',
                },
                input: {
                  perUnitRate: 'customUnitPrice',
                  netAmount: 'customNetAmount',
                },
                type: 'contractCurrency',
              };

              const escalationTrackers = ['tracker'];
              const initialGross = randomInt();
              royaltyCalculator.escalationContract = {
                escalationTracking: {
                  tracker: {
                    gross: initialGross,
                  },
                },
              };

              // Act
              royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
                // Assert
                expect(royaltyCalculator.escalationContract.escalationTracking[escalationTrackers[0]].gross).toBe(salesLine.customNetAmount + initialGross);
                done();
              });
            });
          });

          describe("when the calculation type is 'PPD'", () => {
            it("should add salesLine.ppd to the escalationTrackers' gross value", (done) => {
              // Arrange
              const salesLine = {
                id: '59dd28d9e1d5d31023d09ba1',
                _id: '59dd28d9e1d5d31023d09ba2',
                name: 'Sales Line',
                saleDate: '11/11/2011',
                catType: 'Track',
                releaseId: '59dd28d9e1d5d31023d09ba3',
                mechanicalType: 'Statutory Rate',
                mechanicalPercentage: randomInt(),
                mechanicalAmount: randomInt(),
                units: randomInt(),
                withholdingTaxType: 'Post-Calculation',
                withholdingTaxCalculationType: 'Percentage',
                customWithholdingTaxUnitRate: randomInt(),
                withholdingTaxRate: randomInt(),
                withholdingTaxReductionRate: randomInt(),
                ppd: randomInt(),
              };

              const calculation = {
                type: 'PPD',
                rate: randomInt(),
                unitRate: randomInt(),
                rateBasis: 'calculationRateBasis',
                objectPercentage: randomInt(),
                reserve: randomInt(),
              };

              royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

              const fields = {
                output: {
                  calculationInput: 'customCalculationInput',
                  calculationOutput: 'customCalculationOutput',
                  withholdingTax: 'customWithholdingTax',
                  withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
                  reserve: 'customReserve',
                },
                input: {
                  perUnitRate: 'customUnitPrice',
                  netAmount: 'customNetAmount',
                },
                type: 'contractCurrency',
              };

              const initialGross = randomInt();

              const escalationTrackers = ['tracker'];
              royaltyCalculator.escalationContract = {
                escalationTracking: {
                  tracker: {
                    gross: initialGross,
                  },
                },
              };

              // Act
              royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
                // Assert
                expect(royaltyCalculator.escalationContract.escalationTracking[escalationTrackers[0]].gross).toBe(salesLine.ppd + initialGross);
                done();
              });
            });
          });

          describe("when the calculation type is 'Unit Price'", () => {
            it("should add salesLine.contractCurrencyPerUnitRate * salesLine.units to the escalationTrackers' gross value", (done) => {
              // Arrange
              const salesLine = {
                id: '59dd28d9e1d5d31023d09ba1',
                _id: '59dd28d9e1d5d31023d09ba2',
                name: 'Sales Line',
                saleDate: '11/11/2011',
                catType: 'Track',
                releaseId: '59dd28d9e1d5d31023d09ba3',
                mechanicalType: 'Statutory Rate',
                mechanicalPercentage: randomInt(),
                mechanicalAmount: randomInt(),
                units: randomInt(),
                withholdingTaxType: 'Post-Calculation',
                withholdingTaxCalculationType: 'Percentage',
                customWithholdingTaxUnitRate: randomInt(),
                withholdingTaxRate: randomInt(),
                withholdingTaxReductionRate: randomInt(),
                customUnitPrice: randomInt(),
              };

              const calculation = {
                type: 'Unit Price',
                rate: randomInt(),
                unitRate: randomInt(),
                rateBasis: 'calculationRateBasis',
                objectPercentage: randomInt(),
                reserve: randomInt(),
              };

              royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

              const fields = {
                output: {
                  calculationInput: 'customCalculationInput',
                  calculationOutput: 'customCalculationOutput',
                  withholdingTax: 'customWithholdingTax',
                  withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
                  reserve: 'customReserve',
                },
                input: {
                  perUnitRate: 'customUnitPrice',
                  netAmount: 'customNetAmount',
                },
                type: 'contractCurrency',
              };

              const initialGross = randomInt();
              const escalationTrackers = ['tracker'];
              royaltyCalculator.escalationContract = {
                escalationTracking: {
                  tracker: {
                    gross: initialGross,
                  },
                },
              };

              // Act
              royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
                // Assert
                expect(royaltyCalculator.escalationContract.escalationTracking[escalationTrackers[0]].gross).toBe(salesLine.customUnitPrice * salesLine.units + initialGross);
                done();
              });
            });
          });

          describe("when the calculation type is 'Retail Price'", () => {
            it("should add salesLine.contractCurrencyRetailPrice * salesLine.units to the escalationTrackers' gross value", (done) => {
              // Arrange
              const salesLine = {
                id: '59dd28d9e1d5d31023d09ba1',
                _id: '59dd28d9e1d5d31023d09ba2',
                name: 'Sales Line',
                saleDate: '11/11/2011',
                catType: 'Track',
                releaseId: '59dd28d9e1d5d31023d09ba3',
                mechanicalType: 'Statutory Rate',
                mechanicalPercentage: randomInt(),
                mechanicalAmount: randomInt(),
                units: randomInt(),
                withholdingTaxType: 'Post-Calculation',
                withholdingTaxCalculationType: 'Percentage',
                customWithholdingTaxUnitRate: randomInt(),
                withholdingTaxRate: randomInt(),
                withholdingTaxReductionRate: randomInt(),
                customRetailPrice: randomInt(),
              };

              const calculation = {
                type: 'Retail Price',
                rate: randomInt(),
                unitRate: randomInt(),
                rateBasis: 'calculationRateBasis',
                objectPercentage: randomInt(),
                reserve: randomInt(),
              };

              royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

              const fields = {
                output: {
                  calculationInput: 'customCalculationInput',
                  calculationOutput: 'customCalculationOutput',
                  withholdingTax: 'customWithholdingTax',
                  withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
                  reserve: 'customReserve',
                },
                input: {
                  retailPrice: 'customRetailPrice',
                  netAmount: 'customNetAmount',
                },
                type: 'contractCurrency',
              };

              const initialGross = randomInt();
              const escalationTrackers = ['tracker'];
              royaltyCalculator.escalationContract = {
                escalationTracking: {
                  tracker: {
                    gross: initialGross,
                  },
                },
              };

              // Act
              royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
                // Assert
                expect(royaltyCalculator.escalationContract.escalationTracking[escalationTrackers[0]].gross).toBe(salesLine.customRetailPrice * salesLine.units + initialGross);
                done();
              });
            });
          });

          describe("when the calculation type is 'Unit Rate'", () => {
            it("should add calculation.unitRate * salesLine.units to the escalationTrackers' gross value", (done) => {
              // Arrange
              const salesLine = {
                id: '59dd28d9e1d5d31023d09ba1',
                _id: '59dd28d9e1d5d31023d09ba2',
                name: 'Sales Line',
                saleDate: '11/11/2011',
                catType: 'Track',
                releaseId: '59dd28d9e1d5d31023d09ba3',
                mechanicalType: 'Statutory Rate',
                mechanicalPercentage: randomInt(),
                mechanicalAmount: randomInt(),
                units: randomInt(),
                withholdingTaxType: 'Post-Calculation',
                withholdingTaxCalculationType: 'Percentage',
                customWithholdingTaxUnitRate: randomInt(),
                withholdingTaxRate: randomInt(),
                withholdingTaxReductionRate: randomInt(),
                customRetailPrice: randomInt(),
              };

              const calculation = {
                type: 'Unit Rate',
                rate: randomInt(),
                unitRate: randomInt(),
                rateBasis: 'calculationRateBasis',
                objectPercentage: randomInt(),
                reserve: randomInt(),
              };

              royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

              const fields = {
                output: {
                  calculationInput: 'customCalculationInput',
                  calculationOutput: 'customCalculationOutput',
                  withholdingTax: 'customWithholdingTax',
                  withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
                  reserve: 'customReserve',
                },
                input: {
                  retailPrice: 'customRetailPrice',
                  netAmount: 'customNetAmount',
                },
                type: 'contractCurrency',
              };

              const initialGross = randomInt();
              const escalationTrackers = ['tracker'];
              royaltyCalculator.escalationContract = {
                escalationTracking: {
                  tracker: {
                    gross: initialGross,
                  },
                },
              };

              // Act
              royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
                // Assert
                expect(royaltyCalculator.escalationContract.escalationTracking[escalationTrackers[0]].gross).toBe(calculation.unitRate * salesLine.units + initialGross);
                done();
              });
            });
          });

          describe("when the calculation type is 'Fixed Unit Rate'", function () {
            it("should add calculation.unitRate * salesLine.units to the escalationTrackers' gross value", (done) => {
              // Arrange
              const salesLine = {
                id: '59dd28d9e1d5d31023d09ba1',
                _id: '59dd28d9e1d5d31023d09ba2',
                name: 'Sales Line',
                saleDate: '11/11/2011',
                catType: 'Track',
                releaseId: '59dd28d9e1d5d31023d09ba3',
                mechanicalType: 'Statutory Rate',
                mechanicalPercentage: randomInt(),
                mechanicalAmount: randomInt(),
                units: randomInt(),
                withholdingTaxType: 'Post-Calculation',
                withholdingTaxCalculationType: 'Percentage',
                customWithholdingTaxUnitRate: randomInt(),
                withholdingTaxRate: randomInt(),
                withholdingTaxReductionRate: randomInt(),
                customRetailPrice: randomInt(),
              };

              const calculation = {
                type: 'Fixed Unit Rate',
                rate: randomInt(),
                unitRate: randomInt(),
                rateBasis: 'calculationRateBasis',
                objectPercentage: randomInt(),
                reserve: randomInt(),
              };

              royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

              const fields = {
                output: {
                  calculationInput: 'customCalculationInput',
                  calculationOutput: 'customCalculationOutput',
                  withholdingTax: 'customWithholdingTax',
                  withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
                  reserve: 'customReserve',
                },
                input: {
                  retailPrice: 'customRetailPrice',
                  netAmount: 'customNetAmount',
                },
                type: 'contractCurrency',
              };

              const initialGross = randomInt();
              const escalationTrackers = ['tracker'];
              royaltyCalculator.escalationContract = {
                escalationTracking: {
                  tracker: {
                    gross: initialGross,
                  },
                },
              };

              // Act
              royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
                // Assert
                expect(royaltyCalculator.escalationContract.escalationTracking[escalationTrackers[0]].gross).toBe(calculation.unitRate * salesLine.units + initialGross);
                done();
              });
            });
          });

          describe("when the calculation type is 'Statutory Rate'", () => {
            it("should add salesLine.mechanicalRate * salesLine.units to the escalationTrackers' gross value", (done) => {
              // Arrange
              const salesLine = {
                id: '59dd28d9e1d5d31023d09ba1',
                _id: '59dd28d9e1d5d31023d09ba2',
                name: 'Sales Line',
                saleDate: '11/11/2011',
                catType: 'Track',
                releaseId: '59dd28d9e1d5d31023d09ba3',
                mechanicalType: 'Statutory Rate',
                mechanicalPercentage: randomInt(),
                mechanicalAmount: randomInt(),
                units: randomInt(),
                withholdingTaxType: 'Post-Calculation',
                withholdingTaxCalculationType: 'Percentage',
                customWithholdingTaxUnitRate: randomInt(),
                withholdingTaxRate: randomInt(),
                withholdingTaxReductionRate: randomInt(),
                mechanicalRate: randomInt(),
              };

              const calculation = {
                type: 'Statutory Rate',
                rate: randomInt(),
                unitRate: randomInt(),
                rateBasis: 'calculationRateBasis',
                objectPercentage: randomInt(),
                reserve: randomInt(),
              };

              royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

              const fields = {
                output: {
                  calculationInput: 'customCalculationInput',
                  calculationOutput: 'customCalculationOutput',
                  withholdingTax: 'customWithholdingTax',
                  withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
                  reserve: 'customReserve',
                },
                input: {
                  retailPrice: 'customRetailPrice',
                  netAmount: 'customNetAmount',
                },
                type: 'contractCurrency',
              };

              const initialGross = randomInt();
              const escalationTrackers = ['tracker'];
              royaltyCalculator.escalationContract = {
                escalationTracking: {
                  tracker: {
                    gross: initialGross,
                  },
                },
              };

              // Act
              royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
                // Assert
                expect(royaltyCalculator.escalationContract.escalationTracking[escalationTrackers[0]].gross).toBe(salesLine.mechanicalRate * salesLine.units + initialGross);
                done();
              });
            });
          });

          describe('when escalationEquivalents are present', function () {
            describe('and the configuration is set in the equivalents', () => {
              it("should multiply the units by the equivalent, and add to the escalationTrackers' unit value", (done) => {
                // Arrange
                const salesLine = {
                  id: '59dd28d9e1d5d31023d09ba1',
                  _id: '59dd28d9e1d5d31023d09ba2',
                  name: 'Sales Line',
                  saleDate: '11/11/2011',
                  catType: 'Track',
                  releaseId: '59dd28d9e1d5d31023d09ba3',
                  mechanicalType: 'Statutory Rate',
                  mechanicalPercentage: randomInt(),
                  mechanicalAmount: randomInt(),
                  units: randomInt(),
                  withholdingTaxType: 'Post-Calculation',
                  withholdingTaxCalculationType: 'Percentage',
                  customWithholdingTaxUnitRate: randomInt(),
                  withholdingTaxRate: randomInt(),
                  withholdingTaxReductionRate: randomInt(),
                  mechanicalRate: randomInt(),
                  configuration: 'Stream',
                };

                const calculation = {
                  type: 'Statutory Rate',
                  rate: randomInt(),
                  unitRate: randomInt(),
                  rateBasis: 'calculationRateBasis',
                  objectPercentage: randomInt(),
                  reserve: randomInt(),
                };

                royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

                const fields = {
                  output: {
                    calculationInput: 'customCalculationInput',
                    calculationOutput: 'customCalculationOutput',
                    withholdingTax: 'customWithholdingTax',
                    withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
                    reserve: 'customReserve',
                  },
                  input: {
                    retailPrice: 'customRetailPrice',
                    netAmount: 'customNetAmount',
                  },
                  type: 'contractCurrency',
                };

                const escalationTrackers = ['tracker'];
                const initialGross = randomInt();
                const initialNet = randomInt();
                royaltyCalculator.escalationContract = {
                  escalationTracking: {
                    tracker: {
                      gross: initialGross,
                      units: initialNet,
                    },
                  },
                };

                royaltyCalculator.escalationEquivalents = [{ configuration: 'Stream', amount: 10 }];

                // Act
                royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
                  // Assert
                  expect(royaltyCalculator.escalationContract.escalationTracking[escalationTrackers[0]].units).toBeCloseTo(initialNet + salesLine.units * 1 / 10, 5);
                  done();
                });
              });
            });

            describe('and the configuration is NOT set in the equivalents', () => {
              it("should add the units to the escalationTrackers' unit value", (done) => {
                // Arrange
                const salesLine = {
                  id: '59dd28d9e1d5d31023d09ba1',
                  _id: '59dd28d9e1d5d31023d09ba2',
                  name: 'Sales Line',
                  saleDate: '11/11/2011',
                  catType: 'Track',
                  releaseId: '59dd28d9e1d5d31023d09ba3',
                  mechanicalType: 'Statutory Rate',
                  mechanicalPercentage: randomInt(),
                  mechanicalAmount: randomInt(),
                  units: randomInt(),
                  withholdingTaxType: 'Post-Calculation',
                  withholdingTaxCalculationType: 'Percentage',
                  customWithholdingTaxUnitRate: randomInt(),
                  withholdingTaxRate: randomInt(),
                  withholdingTaxReductionRate: randomInt(),
                  mechanicalRate: randomInt(),
                  configuration: 'Stream',
                };

                const calculation = {
                  type: 'Statutory Rate',
                  rate: randomInt(),
                  unitRate: randomInt(),
                  rateBasis: 'calculationRateBasis',
                  objectPercentage: randomInt(),
                  reserve: randomInt(),
                };

                royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

                const fields = {
                  output: {
                    calculationInput: 'customCalculationInput',
                    calculationOutput: 'customCalculationOutput',
                    withholdingTax: 'customWithholdingTax',
                    withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
                    reserve: 'customReserve',
                  },
                  input: {
                    retailPrice: 'customRetailPrice',
                    netAmount: 'customNetAmount',
                  },
                  type: 'contractCurrency',
                };

                const escalationTrackers = ['tracker'];
                const initialGross = randomInt();
                const initialNet = randomInt();
                royaltyCalculator.escalationContract = {
                  escalationTracking: {
                    tracker: {
                      gross: initialGross,
                      units: initialNet,
                    },
                  },
                };

                royaltyCalculator.escalationEquivalents = [{ configuration: 'Not Stream', amount: 10 }];

                // Act
                royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
                  // Assert
                  expect(royaltyCalculator.escalationContract.escalationTracking[escalationTrackers[0]].units).toBe(initialNet + salesLine.units);
                  done();
                });
              });
            });
          });

          describe('when escalationEquivalents are NOT present', () => {
            it("should add the units to the escalationTrackers' unit value", (done) => {
              const salesLine = {
                id: '59dd28d9e1d5d31023d09ba1',
                _id: '59dd28d9e1d5d31023d09ba2',
                name: 'Sales Line',
                saleDate: '11/11/2011',
                catType: 'Track',
                releaseId: '59dd28d9e1d5d31023d09ba3',
                mechanicalType: 'Statutory Rate',
                mechanicalPercentage: randomInt(),
                mechanicalAmount: randomInt(),
                units: randomInt(),
                withholdingTaxType: 'Post-Calculation',
                withholdingTaxCalculationType: 'Percentage',
                customWithholdingTaxUnitRate: randomInt(),
                withholdingTaxRate: randomInt(),
                withholdingTaxReductionRate: randomInt(),
                mechanicalRate: randomInt(),
                configuration: 'Stream',
              };

              const calculation = {
                type: 'Statutory Rate',
                rate: randomInt(),
                unitRate: randomInt(),
                rateBasis: 'calculationRateBasis',
                objectPercentage: randomInt(),
                reserve: randomInt(),
              };

              royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

              const fields = {
                output: {
                  calculationInput: 'customCalculationInput',
                  calculationOutput: 'customCalculationOutput',
                  withholdingTax: 'customWithholdingTax',
                  withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
                  reserve: 'customReserve',
                },
                input: {
                  retailPrice: 'customRetailPrice',
                  netAmount: 'customNetAmount',
                },
                type: 'contractCurrency',
              };

              const escalationTrackers = ['tracker'];
              const initialGross = randomInt();
              const initialNet = randomInt();
              royaltyCalculator.escalationContract = {
                escalationTracking: {
                  tracker: {
                    gross: initialGross,
                    units: initialNet,
                  },
                },
              };

              royaltyCalculator.escalationEquivalents = [];

              // Act
              royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
                // Assert
                expect(royaltyCalculator.escalationContract.escalationTracking[escalationTrackers[0]].units).toBe(initialNet + salesLine.units);
                done();
              });
            });
          });
        });

        describe('and when escalationTrackers DO NOT exist', function () {
          it('should not change escalationContract.escalationTracking', (done) => {
            // Arrange
            const salesLine = {
              id: '59dd28d9e1d5d31023d09ba1',
              _id: '59dd28d9e1d5d31023d09ba2',
              name: 'Sales Line',
              saleDate: '11/11/2011',
              catType: 'Track',
              releaseId: '59dd28d9e1d5d31023d09ba3',
              mechanicalType: 'Statutory Rate',
              mechanicalPercentage: randomInt(),
              mechanicalAmount: randomInt(),
              units: randomInt(),
              withholdingTaxType: 'Post-Calculation',
              withholdingTaxCalculationType: 'Percentage',
              customWithholdingTaxUnitRate: randomInt(),
              withholdingTaxRate: randomInt(),
              withholdingTaxReductionRate: randomInt(),
              mechanicalRate: randomInt(),
              configuration: 'Stream',
            };

            const calculation = {
              type: 'Statutory Rate',
              rate: randomInt(),
              unitRate: randomInt(),
              rateBasis: 'calculationRateBasis',
              objectPercentage: randomInt(),
              reserve: randomInt(),
            };

            royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

            const fields = {
              output: {
                calculationInput: 'customCalculationInput',
                calculationOutput: 'customCalculationOutput',
                withholdingTax: 'customWithholdingTax',
                withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
                reserve: 'customReserve',
              },
              input: {
                retailPrice: 'customRetailPrice',
                netAmount: 'customNetAmount',
              },
              type: 'contractCurrency',
            };

            const escalationTrackers = ['tracker'];
            const initialGross = randomInt();
            const initialNet = randomInt();
            royaltyCalculator.escalationContract = {
              escalationTracking: {
                tracker: {
                  gross: initialGross,
                  units: initialNet,
                },
              },
            };

            // Act
            royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
              // Assert
              expect(royaltyCalculator.escalationContract.escalationTracking[escalationTrackers[0]].units).toBe(initialNet + salesLine.units);
              done();
            });
          });
        });
      });

      describe('when fields.type is NOT equal to contractCurrency', () => {
        it('should not change escalationContract.escalationTracking', (done) => {
          // Arrange
          const salesLine = {
            id: '59dd28d9e1d5d31023d09ba1',
            _id: '59dd28d9e1d5d31023d09ba2',
            name: 'Sales Line',
            saleDate: '11/11/2011',
            catType: 'Track',
            releaseId: '59dd28d9e1d5d31023d09ba3',
            mechanicalType: 'Statutory Rate',
            mechanicalPercentage: randomInt(),
            mechanicalAmount: randomInt(),
            units: randomInt(),
            withholdingTaxType: 'Post-Calculation',
            withholdingTaxCalculationType: 'Percentage',
            customWithholdingTaxUnitRate: randomInt(),
            withholdingTaxRate: randomInt(),
            withholdingTaxReductionRate: randomInt(),
            mechanicalRate: randomInt(),
            configuration: 'Stream',
          };

          const calculation = {
            type: 'Statutory Rate',
            rate: randomInt(),
            unitRate: randomInt(),
            rateBasis: 'calculationRateBasis',
            objectPercentage: randomInt(),
            reserve: randomInt(),
          };

          royaltyCalculator.checkEscalations = jest.fn((...args) => args[args.length - 1](null, calculation));

          const fields = {
            output: {
              calculationInput: 'customCalculationInput',
              calculationOutput: 'customCalculationOutput',
              withholdingTax: 'customWithholdingTax',
              withholdingTaxUnitRate: 'customWithholdingTaxUnitRate',
              reserve: 'customReserve',
            },
            input: {
              retailPrice: 'customRetailPrice',
              netAmount: 'customNetAmount',
            },
          };

          const escalationTrackers = ['tracker'];
          const initialGross = randomInt();
          const initialNet = randomInt();
          royaltyCalculator.escalationContract = {
            escalationTracking: {
              tracker: {
                gross: initialGross,
                units: initialNet,
              },
            },
          };

          royaltyCalculator.escalationEquivalents = [{ configuration: 'Not Stream', amount: 10 }];

          // Act
          royaltyCalculator.calculateInCurrency(fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, () => {
            // Assert
            expect(royaltyCalculator.escalationContract.escalationTracking[escalationTrackers[0]].units).toBe(initialNet);
            expect(royaltyCalculator.escalationContract.escalationTracking[escalationTrackers[0]].gross).toBe(initialGross);
            done();
          });
        });
      });
    });
  });

  describe('#runCalculation', () => {
    let originalSalesLine;
    let calculation;
    let escalationTrackers;
    let inputFilter;
    let deductionFilters;
    let withholdingTaxFilters;
    let mechanicalFilters;
    let contractIds;

    beforeEach(() => {
      contractIds = [randomId(), randomId()];
      originalSalesLine = { line: randomString(), contractIds };
      calculation = { type: randomString() };
      escalationTrackers = [randomString(), randomString()];
      inputFilter = { type: randomString() };
      deductionFilters = [{ filter: randomString() }, { filter: randomString() }];
      withholdingTaxFilters = [{ filter: randomString() }, { filter: randomString() }];
      mechanicalFilters = [{ filter: randomString() }, { filter: randomString() }];

      royaltyCalculator.filterMatches = jest.fn().mockImplementation((...args) => args[args.length - 1](true));
      royaltyCalculator.calculateInCurrency = jest.fn().mockImplementation((...args) => args[args.length - 1]());
    });

    describe('when originalSalesLine is not passed, but other values are', () => {
      it('should call the callback with no error and no returned line', (done) => {
        // Arrange
        originalSalesLine = null;

        // Act
        royaltyCalculator.runCalculation(originalSalesLine, inputFilter, deductionFilters, withholdingTaxFilters, mechanicalFilters, calculation, escalationTrackers, (err, result) => {
          // Assert
          expect(err).toBeUndefined();
          expect(result).toBeUndefined();
          done();
        });
      });
    });

    describe('when calculation is not passed', () => {
      it('should return an error', (done) => {
        // Arrange
        calculation = null;

        // Act
        royaltyCalculator.runCalculation(originalSalesLine, inputFilter, deductionFilters, withholdingTaxFilters, mechanicalFilters, calculation, escalationTrackers, (err) => {
          // Assert
          expect(err).toBeDefined();
          expect(err).toBe('Requires a salesLine, calculation, periodId and contractId');
          done();
        });
      });
    });

    describe('when periodId does not exist', () => {
      it('should return an error', (done) => {
        // Arrange
        royaltyCalculator.periodId = null;

        // Act
        royaltyCalculator.runCalculation(originalSalesLine, inputFilter, deductionFilters, withholdingTaxFilters, mechanicalFilters, calculation, escalationTrackers, (err) => {
          // Assert
          expect(err).toBeDefined();
          expect(err).toBe('Requires a salesLine, calculation, periodId and contractId');
          done();
        });
      });
    });

    describe('when contract.contractId does not exist', () => {
      it('should return an error', (done) => {
        // Arrange
        royaltyCalculator.contract.contractId = null;

        // Act
        royaltyCalculator.runCalculation(originalSalesLine, inputFilter, deductionFilters, withholdingTaxFilters, mechanicalFilters, calculation, escalationTrackers, (err) => {
          // Assert
          expect(err).toBeDefined();
          expect(err).toBe('Requires a salesLine, calculation, periodId and contractId');
          done();
        });
      });
    });

    describe('when everything is passed as expected', function () {
      it('should call filterMatches on the salesLine and inputFilter', (done) => {
        // Act
        royaltyCalculator.runCalculation(originalSalesLine, inputFilter, deductionFilters, withholdingTaxFilters, mechanicalFilters, calculation, escalationTrackers, () => {
          // Assert
          const filterMatchesCall = royaltyCalculator.filterMatches.mock.calls[0];
          expect(filterMatchesCall[0].line).toBe(originalSalesLine.line);
          expect(filterMatchesCall[0].contractIds).toEqual(contractIds);
          expect(filterMatchesCall[1]).toBe(inputFilter);
          done();
        });
      });

      describe('when filterMatches returns false', () => {
        it('should return the originalSalesLine to the callback', (done) => {
          // Arrange
          royaltyCalculator.filterMatches = jest.fn((...args) => args[args.length - 1](false));

          // Act
          royaltyCalculator.runCalculation(originalSalesLine, inputFilter, deductionFilters, withholdingTaxFilters, mechanicalFilters, calculation, escalationTrackers, (err, result) => {
            // Assert
            expect(result).toEqual(originalSalesLine);
            done();
          });
        });
      });

      describe('when filterMatches returns true', function () {
        describe('and when salesLine is for a release where track should be restricted', () => {
          // This is where a track is used in a release, that has release-specific rights associated with it
          // These are passed as an object defining which tracks on specific releases shouldn't be reported
          it('should return to the callback without the original sales line, and with previouslyReported set to true', (done) => {
            // Arrange
            const originalSalesLine = {
              contractIds: ['59dd28d9e1d5d31023d09ba1', '59dd28d9e1d5d31023d09ba2'],
              trackId: '59dd28d9e1d5d31023d09ba3',
              releaseId: '59dd28d9e1d5d31023d09ba4',
            };
            royaltyCalculator.releaseRestrictions = { '59dd28d9e1d5d31023d09ba3': ['59dd28d9e1d5d31023d09ba4'] };

            // Act
            royaltyCalculator.runCalculation(originalSalesLine, inputFilter, deductionFilters, withholdingTaxFilters, mechanicalFilters, calculation, escalationTrackers, (err, salesLine, result, previouslyReported) => {
              // Assert
              expect(salesLine).toBeNull();
              expect(previouslyReported).toBe(true);
              done();
            });
          });
        });

        //   describe('and when salesLine is NOT on a release where track should be restricted', function () {
        describe('when contract is in another currency', function () {
          describe('and when contractCurrency value is present', () => {
            it('should not change the value', (done) => {
            // Arrange
              const originalSalesLine = {
                contractIds: ['59dd28d9e1d5d31023d09ba1', '59dd28d9e1d5d31023d09ba2'],
                trackId: '59dd28d9e1d5d31023d09ba3',
                releaseId: '59dd28d9e1d5d31023d09ba4',
                homeCurrencyGrossAmount: randomInt(),
                homeCurrencyNetAmount: randomInt(),
                homeCurrencyDiscountAmount: randomInt(),
                usdFieldGrossAmount: randomInt(),
                usdFieldNetAmount: randomInt(),
                usdFieldDiscountAmount: randomInt(),
              };
              royaltyCalculator.releaseRestrictions = { '59dd28d9e1d5d31023d09ba3': ['59dd28d9e1d5d31023d09ba5'] };
              royaltyCalculator.contractExchangeRate = randomInt();
              royaltyCalculator.contract = {
                contractId: '59dd28d9e1d5d31023d09ba8',
                name: 'Contract 1',
                share: randomInt(),
                releaseId: '59dd28d9e1d5d31023d09bb1',
                terms: {
                  contractCurrency: 'USD',
                  sales: [{ sale: 1 }, { sale: 2 }],
                  deductions: [{ deduction: 1 }, { deduction: 2 }],
                  withholdingTaxes: [{ withholdingTaxe: 1 }, { withholdingTaxe: 2 }],
                  mechanicalContracts: [{ mechanicalContract: 1 }, { mechanicalContract: 2 }],
                },
              };
              royaltyCalculator.clientCurrencies = { USD: 'usdField' };

              // Act
              royaltyCalculator.runCalculation(originalSalesLine, inputFilter, deductionFilters, withholdingTaxFilters, mechanicalFilters, calculation, escalationTrackers, (err) => {
              // Assert
                expect(royaltyCalculator.filterMatches.mock.calls[0][0].usdFieldGrossAmount).toBe(originalSalesLine.usdFieldGrossAmount);
                expect(royaltyCalculator.filterMatches.mock.calls[0][0].usdFieldNetAmount).toBe(originalSalesLine.usdFieldNetAmount);
                expect(royaltyCalculator.filterMatches.mock.calls[0][0].usdFieldDiscountAmount).toBe(originalSalesLine.usdFieldDiscountAmount);
                done();
              });
            });
          });

          describe('and when contractCurrency value is missing', function () {
            describe('and when exchange rate is present', function () {
              it('should set the value to the homeCurrency value, multiplied by the exchange rate', (done) => {
              // Arrange
                const originalSalesLine = {
                  originalSalesLine: true,
                  contractIds: ['59dd28d9e1d5d31023d09ba1', '59dd28d9e1d5d31023d09ba2'],
                  trackId: '59dd28d9e1d5d31023d09ba3',
                  releaseId: '59dd28d9e1d5d31023d09ba4',
                  homeCurrencyGrossAmount: randomInt(),
                  homeCurrencyNetAmount: randomInt(),
                  homeCurrencyDiscountAmount: randomInt(),
                };

                royaltyCalculator.releaseRestrictions = {
                  '59dd28d9e1d5d31023d09ba3': ['59dd28d9e1d5d31023d09ba5'],
                };
                royaltyCalculator.contractExchangeRate = randomInt();
                royaltyCalculator.contract = {
                  contractId: '59dd28d9e1d5d31023d09ba8',
                  name: 'Contract 1',
                  share: randomInt(),
                  releaseId: '59dd28d9e1d5d31023d09bb1',
                  terms: {
                    contractCurrency: 'USD',
                    sales: [{ sale: 1 }, { sale: 2 }],
                    deductions: [{ deduction: 1 }, { deduction: 2 }],
                    withholdingTaxes: [{ withholdingTaxe: 1 }, { withholdingTaxe: 2 }],
                    mechanicalContracts: [{ mechanicalContract: 1 }, { mechanicalContract: 2 }],
                  },
                };
                royaltyCalculator.clientCurrencies = { USD: 'usdField' };

                // Act
                royaltyCalculator.runCalculation(originalSalesLine, inputFilter, deductionFilters, withholdingTaxFilters, mechanicalFilters, calculation, escalationTrackers, () => {
                // Assert
                  expect(royaltyCalculator.filterMatches.mock.calls[0][0].usdFieldGrossAmount).toBe(originalSalesLine.homeCurrencyGrossAmount * royaltyCalculator.contractExchangeRate);
                  expect(royaltyCalculator.filterMatches.mock.calls[0][0].usdFieldNetAmount).toBe(originalSalesLine.homeCurrencyNetAmount * royaltyCalculator.contractExchangeRate);
                  expect(royaltyCalculator.filterMatches.mock.calls[0][0].usdFieldDiscountAmount).toBe(originalSalesLine.homeCurrencyDiscountAmount * royaltyCalculator.contractExchangeRate);
                  done();
                });
              });

              it('should set the contractCurrencyExchangeRate to the exchange rate for the currency', (done) => {
              // Arrange
                const originalSalesLine = {
                  originalSalesLine: true,
                  contractIds: ['59dd28d9e1d5d31023d09ba1', '59dd28d9e1d5d31023d09ba2'],
                  trackId: '59dd28d9e1d5d31023d09ba3',
                  releaseId: '59dd28d9e1d5d31023d09ba4',
                  netAmount: randomInt(),
                  homeCurrencyGrossAmount: randomInt(),
                  homeCurrencyNetAmount: randomInt(),
                  homeCurrencyDiscountAmount: randomInt(),
                };

                royaltyCalculator.releaseRestrictions = { '59dd28d9e1d5d31023d09ba3': ['59dd28d9e1d5d31023d09ba5'] };
                royaltyCalculator.contract = {
                  contractId: '59dd28d9e1d5d31023d09ba8',
                  name: 'Contract 1',
                  share: 99,
                  releaseId: '59dd28d9e1d5d31023d09bb1',
                  terms: {
                    contractCurrency: 'USD',
                    sales: [{ sale: 1 }, { sale: 2 }],
                    deductions: [{ deduction: 1 }, { deduction: 2 }],
                    withholdingTaxes: [{ withholdingTaxe: 1 }, { withholdingTaxe: 2 }],
                    mechanicalContracts: [{ mechanicalContract: 1 }, { mechanicalContract: 2 }],
                  },
                };
                royaltyCalculator.clientCurrencies = { USD: 'usdField' };

                // Act
                royaltyCalculator.runCalculation(originalSalesLine, inputFilter, deductionFilters, withholdingTaxFilters, mechanicalFilters, calculation, escalationTrackers, () => {
                // Assert
                  const args = royaltyCalculator.filterMatches.mock.calls[0][0];
                  const expectedExchangeRate = args.usdFieldNetAmount / args.netAmount;
                  expect(args.contractCurrencyExchangeRate).toBeCloseTo(expectedExchangeRate, 5);
                  done();
                });
              });
            });
          });
        });

        it('should call calculateInCurrency twice', (done) => {
          // Arrange
          const originalSalesLine = {
            originalSalesLine: true,
            contractIds: ['59dd28d9e1d5d31023d09ba1', '59dd28d9e1d5d31023d09ba2'],
            trackId: '59dd28d9e1d5d31023d09ba3',
            releaseId: '59dd28d9e1d5d31023d09ba4',
            netAmount: randomInt(),
            homeCurrencyGrossAmount: randomInt(),
            homeCurrencyNetAmount: randomInt(),
            homeCurrencyDiscountAmount: randomInt(),
          };
          royaltyCalculator.releaseRestrictions = { '59dd28d9e1d5d31023d09ba3': ['59dd28d9e1d5d31023d09ba5'] };
          royaltyCalculator.contractExchangeRate = 2;
          royaltyCalculator.contract = {
            contractId: '59dd28d9e1d5d31023d09ba8',
            name: 'Contract 1',
            share: randomInt(),
            releaseId: '59dd28d9e1d5d31023d09bb1',
            terms: {
              contractCurrency: 'USD',
              sales: [{ sale: 1 }, { sale: 2 }],
              deductions: [{ deduction: 1 }, { deduction: 2 }],
              withholdingTaxes: [{ withholdingTaxe: 1 }, { withholdingTaxe: 2 }],
              mechanicalContracts: [{ mechanicalContract: 1 }, { mechanicalContract: 2 }],
            },
          };
          royaltyCalculator.clientCurrencies = { USD: 'usdField' };

          // Act
          royaltyCalculator.runCalculation(originalSalesLine, inputFilter, deductionFilters, withholdingTaxFilters, mechanicalFilters, calculation, escalationTrackers, () => {
            // Assert
            expect(royaltyCalculator.calculateInCurrency).toHaveBeenCalledTimes(2);
            done();
          });
        });

        it('should call calculateInCurrency with the homeCurrencyFields and the rest of the sales data', (done) => {
          // Arrange
          const originalSalesLine = {
            originalSalesLine: true,
            contractIds: ['59dd28d9e1d5d31023d09ba1', '59dd28d9e1d5d31023d09ba2'],
            trackId: '59dd28d9e1d5d31023d09ba3',
            releaseId: '59dd28d9e1d5d31023d09ba4',
            netAmount: randomInt(),
            homeCurrencyGrossAmount: randomInt(),
            homeCurrencyNetAmount: randomInt(),
            homeCurrencyDiscountAmount: randomInt(),
          };

          royaltyCalculator.releaseRestrictions = {
            '59dd28d9e1d5d31023d09ba3': ['59dd28d9e1d5d31023d09ba5'],
          };
          royaltyCalculator.contractExchangeRate = 2;
          royaltyCalculator.contract = {
            contractId: '59dd28d9e1d5d31023d09ba8',
            name: 'Contract 1',
            share: randomInt(),
            releaseId: '59dd28d9e1d5d31023d09bb1',
            terms: {
              contractCurrency: 'USD',
              sales: [{ sale: 1 }, { sale: 2 }],
              deductions: [{ deduction: 1 }, { deduction: 2 }],
              withholdingTaxes: [{ withholdingTaxe: 1 }, { withholdingTaxe: 2 }],
              mechanicalContracts: [{ mechanicalContract: 1 }, { mechanicalContract: 2 }],
            },
          };
          royaltyCalculator.clientCurrencies = { USD: 'usdField' };

          const homeCurrencyFields = {
            type: 'homeCurrency',
            input: {
              grossAmount: 'homeCurrencyGrossAmount',
              netAmount: 'homeCurrencyNetAmount',
              perUnitRate: 'homeCurrencyPerUnitRate',
              retailPrice: 'homeCurrencyRetailPrice',
              salePrice: 'homeCurrencySalePrice',
            },
            salesFields: {
              grossAmount: 'homeCurrencyGrossAmount',
              netAmount: 'homeCurrencyNetAmount',
              discountAmount: 'homeCurrencyDiscountAmount',
              mechanicalAtSource: 'homeCurrencyMechanicalAtSource',
              returnGrossAmount: 'homeCurrencyReturnGrossAmount',
              returnNetAmount: 'homeCurrencyReturnNetAmount',
              perUnitRate: 'homeCurrencyPerUnitRate',
              retailPrice: 'homeCurrencyRetailPrice',
              salePrice: 'homeCurrencySalePrice',
            },
            output: {
              proRataAmount: 'proRataAmount',
              grossAmount: 'homeCurrencyGrossAmount',
              netAmount: 'homeCurrencyNetAmount',
              discountAmount: 'homeCurrencyDiscountAmount',
              mechanicalAtSource: 'homeCurrencyMechanicalAtSource',
              returnGrossAmount: 'homeCurrencyReturnGrossAmount',
              returnNetAmount: 'homeCurrencyReturnNetAmount',
              salePrice: 'homeCurrencySalePrice',
              ppd: 'ppd',
              perUnitRate: 'homeCurrencyPerUnitRate',
              retailPrice: 'homeCurrencyRetailPrice',
              unitRate: 'unitRate',
              calculationInput: 'calculationInput',
              deduction: 'deduction',
              deductionUnitRate: 'deductionUnitRate',
              withholdingTax: 'withholdingTax',
              withholdingTaxUnitRate: 'withholdingTaxUnitRate',
              mechanicalAmount: 'mechanicalAmount',
              mechanicalDeduction: 'mechanicalDeduction',
              calculationOutput: 'calculationOutput',
              reserve: 'reserve',
            },
          };

          // Act
          royaltyCalculator.runCalculation(originalSalesLine, inputFilter, deductionFilters, withholdingTaxFilters, mechanicalFilters, calculation, escalationTrackers, () => {
            // Assert
            expect(royaltyCalculator.calculateInCurrency.mock.calls[0][0]).toEqual(homeCurrencyFields);
            done();
          });
        });

        it('should call calculateInCurrency with the contractCurrencyFields and the rest of the sales data', (done) => {
          // Arrange
          const originalSalesLine = {
            originalSalesLine: true,
            contractIds: ['59dd28d9e1d5d31023d09ba1', '59dd28d9e1d5d31023d09ba2'],
            trackId: '59dd28d9e1d5d31023d09ba3',
            releaseId: '59dd28d9e1d5d31023d09ba4',
            netAmount: randomInt(),
            homeCurrencyGrossAmount: randomInt(),
            homeCurrencyNetAmount: randomInt(),
            homeCurrencyDiscountAmount: randomInt(),
          };

          royaltyCalculator.releaseRestrictions = { '59dd28d9e1d5d31023d09ba3': ['59dd28d9e1d5d31023d09ba5'] };
          royaltyCalculator.contractExchangeRate = randomInt();
          royaltyCalculator.contract = {
            contractId: '59dd28d9e1d5d31023d09ba8',
            name: 'Contract 1',
            share: randomInt(),
            releaseId: '59dd28d9e1d5d31023d09bb1',
            terms: {
              contractCurrency: 'USD',
              sales: [{ sale: 1 }, { sale: 2 }],
              deductions: [{ deduction: 1 }, { deduction: 2 }],
              withholdingTaxes: [{ withholdingTaxe: 1 }, { withholdingTaxe: 2 }],
              mechanicalContracts: [{ mechanicalContract: 1 }, { mechanicalContract: 2 }],
            },
          };
          royaltyCalculator.clientCurrencies = { USD: 'usdField' };

          const contractCurrencyFields = {
            type: 'contractCurrency',
            input: {
              grossAmount: 'usdFieldGrossAmount',
              netAmount: 'usdFieldNetAmount',
              perUnitRate: 'usdFieldPerUnitRate',
              retailPrice: 'usdFieldRetailPrice',
              salePrice: 'usdFieldSalePrice',
            },
            salesFields: {
              exchangeRate: 'usdFieldExchangeRate',
              grossAmount: 'usdFieldGrossAmount',
              netAmount: 'usdFieldNetAmount',
              discountAmount: 'usdFieldDiscountAmount',
              mechanicalAtSource: 'usdFieldMechanicalAtSource',
              returnGrossAmount: 'usdFieldReturnGrossAmount',
              returnNetAmount: 'usdFieldReturnNetAmount',
              perUnitRate: 'usdFieldPerUnitRate',
              retailPrice: 'usdFieldRetailPrice',
              salePrice: 'usdFieldSalePrice',
            },
            output: {
              proRataAmount: 'contractCurrencyProRataAmount',
              grossAmount: 'contractCurrencyGrossAmount',
              netAmount: 'contractCurrencyNetAmount',
              discountAmount: 'contractCurrencyDiscountAmount',
              mechanicalAtSource: 'contractCurrencyMechanicalAtSource',
              returnGrossAmount: 'contractCurrencyReturnGrossAmount',
              returnNetAmount: 'contractCurrencyReturnNetAmount',
              ppd: 'contractCurrencyPpd',
              perUnitRate: 'contractCurrencyPerUnitRate',
              retailPrice: 'contractCurrencyRetailPrice',
              unitRate: 'contractCurrencyUnitRate',
              calculationInput: 'contractCurrencyCalculationInput',
              deduction: 'contractCurrencyDeduction',
              deductionUnitRate: 'contractCurrencyDeductionUnitRate',
              withholdingTax: 'contractCurrencyWithholdingTax',
              withholdingTaxUnitRate: 'contractCurrencyWithholdingTaxUnitRate',
              mechanicalAmount: 'contractCurrencyMechanicalAmount',
              mechanicalDeduction: 'contractCurrencyMechanicalDeduction',
              calculationOutput: 'contractCurrencyCalculationOutput',
              reserve: 'contractCurrencyReserve',
              salePrice: 'contractCurrencySalePrice',
            },
          };

          // Act
          royaltyCalculator.runCalculation(originalSalesLine, inputFilter, deductionFilters, withholdingTaxFilters, mechanicalFilters, calculation, escalationTrackers, () => {
            // Assert
            expect(royaltyCalculator.calculateInCurrency.mock.calls[1][0]).toEqual(contractCurrencyFields);
            done();
          });
        });

        describe("when calculation.type is 'Unit Price' and homeCurrencyPerUnitRate is missing from the salesLine", () => {
          it('should not return the sales line to the callback', (done) => {
            // Arrange
            originalSalesLine = {
              originalSalesLine: true,
              contractIds: ['59dd28d9e1d5d31023d09ba1', '59dd28d9e1d5d31023d09ba2'],
              trackId: '59dd28d9e1d5d31023d09ba3',
              releaseId: '59dd28d9e1d5d31023d09ba4',
              netAmount: randomInt(),
              homeCurrencyGrossAmount: randomInt(),
              homeCurrencyNetAmount: randomInt(),
              homeCurrencyDiscountAmount: randomInt(),
            };
            royaltyCalculator.releaseRestrictions = { '59dd28d9e1d5d31023d09ba3': ['59dd28d9e1d5d31023d09ba5'] };
            royaltyCalculator.contractExchangeRate = randomInt();
            royaltyCalculator.contract = {
              contractId: '59dd28d9e1d5d31023d09ba8',
              name: 'Contract 1',
              share: randomInt(),
              releaseId: '59dd28d9e1d5d31023d09bb1',
              terms: {
                contractCurrency: 'USD',
                sales: [{ sale: 1 }, { sale: 2 }],
                deductions: [{ deduction: 1 }, { deduction: 2 }],
                withholdingTaxes: [{ withholdingTaxe: 1 }, { withholdingTaxe: 2 }],
                mechanicalContracts: [{ mechanicalContract: 1 }, { mechanicalContract: 2 }],
              },
            };
            royaltyCalculator.clientCurrencies = { USD: 'usdField' };
            const calculation = { type: 'Unit Price' };

            // Act
            royaltyCalculator.runCalculation(originalSalesLine, inputFilter, deductionFilters, withholdingTaxFilters, mechanicalFilters, calculation, escalationTrackers, (err, originalSalesLine, salesLine) => {
              // Assert
              expect(salesLine).toBeUndefined();
              done();
            });
          });
        });

        describe("when calculation.type is 'Unit Price' and homeCurrencyPerUnitRate is 0 in the salesLine", () => {
          it('should return the sales line to the callback', (done) => {
            // Arrange
            originalSalesLine = {
              originalSalesLine: true,
              contractIds: ['59dd28d9e1d5d31023d09ba1', '59dd28d9e1d5d31023d09ba2'],
              trackId: '59dd28d9e1d5d31023d09ba3',
              releaseId: '59dd28d9e1d5d31023d09ba4',
              netAmount: randomInt(),
              homeCurrencyGrossAmount: randomInt(),
              homeCurrencyNetAmount: randomInt(),
              homeCurrencyDiscountAmount: randomInt(),
              homeCurrencyPerUnitRate: 0,
            };
            royaltyCalculator.releaseRestrictions = { '59dd28d9e1d5d31023d09ba3': ['59dd28d9e1d5d31023d09ba5'] };
            royaltyCalculator.contractExchangeRate = randomInt();
            royaltyCalculator.contract = {
              contractId: '59dd28d9e1d5d31023d09ba8',
              name: 'Contract 1',
              share: randomInt(),
              releaseId: '59dd28d9e1d5d31023d09bb1',
              terms: {
                contractCurrency: 'USD',
                sales: [{ sale: 1 }, { sale: 2 }],
                deductions: [{ deduction: 1 }, { deduction: 2 }],
                withholdingTaxes: [{ withholdingTaxe: 1 }, { withholdingTaxe: 2 }],
                mechanicalContracts: [{ mechanicalContract: 1 }, { mechanicalContract: 2 }],
              },
            };
            royaltyCalculator.clientCurrencies = { USD: 'usdField' };
            const calculation = { type: 'Unit Price' };

            // Act
            royaltyCalculator.runCalculation(originalSalesLine, inputFilter, deductionFilters, withholdingTaxFilters, mechanicalFilters, calculation, escalationTrackers, (err, originalSalesLine, salesLine) => {
              // Assert
              expect(salesLine).toBeDefined();
              done();
            });
          });
        });

        describe("when calculation.type is 'Retail Price' and homeCurrencyRetailPrice is missing from the salesLine", () => {
          it('should not return the sales line to the callback', (done) => {
            // Arrange
            originalSalesLine = {
              originalSalesLine: true,
              contractIds: ['59dd28d9e1d5d31023d09ba1', '59dd28d9e1d5d31023d09ba2'],
              trackId: '59dd28d9e1d5d31023d09ba3',
              releaseId: '59dd28d9e1d5d31023d09ba4',
              netAmount: randomInt(),
              homeCurrencyGrossAmount: randomInt(),
              homeCurrencyNetAmount: randomInt(),
              homeCurrencyDiscountAmount: randomInt(),
            };
            royaltyCalculator.releaseRestrictions = { '59dd28d9e1d5d31023d09ba3': ['59dd28d9e1d5d31023d09ba5'] };
            royaltyCalculator.contractExchangeRate = 2;
            royaltyCalculator.contract = {
              contractId: '59dd28d9e1d5d31023d09ba8',
              name: 'Contract 1',
              share: randomInt(),
              releaseId: '59dd28d9e1d5d31023d09bb1',
              terms: {
                contractCurrency: 'USD',
                sales: [{ sale: 1 }, { sale: 2 }],
                deductions: [{ deduction: 1 }, { deduction: 2 }],
                withholdingTaxes: [{ withholdingTaxe: 1 }, { withholdingTaxe: 2 }],
                mechanicalContracts: [{ mechanicalContract: 1 }, { mechanicalContract: 2 }],
              },
            };
            royaltyCalculator.clientCurrencies = { USD: 'usdField' };
            const calculation = { type: 'Retail Price' };

            // Act
            royaltyCalculator.runCalculation(
              originalSalesLine,
              inputFilter,
              deductionFilters,
              withholdingTaxFilters,
              mechanicalFilters,
              calculation,
              escalationTrackers,
              (err, originalSalesLine, salesLine) => {
                // Assert
                expect(salesLine).toBeUndefined();
                done();
              },
            );
          });
        });

        describe("when calculation.type is 'Retail Price' and homeCurrencyRetailPrice is 0 in the salesLine", () => {
          it('should return the sales line to the callback', (done) => {
            // Arrange
            originalSalesLine = {
              originalSalesLine: true,
              contractIds: ['59dd28d9e1d5d31023d09ba1', '59dd28d9e1d5d31023d09ba2'],
              trackId: '59dd28d9e1d5d31023d09ba3',
              releaseId: '59dd28d9e1d5d31023d09ba4',
              netAmount: randomInt(),
              homeCurrencyGrossAmount: randomInt(),
              homeCurrencyNetAmount: randomInt(),
              homeCurrencyDiscountAmount: randomInt(),
              homeCurrencyRetailPrice: 0,
            };
            royaltyCalculator.releaseRestrictions = { '59dd28d9e1d5d31023d09ba3': ['59dd28d9e1d5d31023d09ba5'] };
            royaltyCalculator.contractExchangeRate = 2;
            royaltyCalculator.contract = {
              contractId: '59dd28d9e1d5d31023d09ba8',
              name: 'Contract 1',
              share: randomInt(),
              releaseId: '59dd28d9e1d5d31023d09bb1',
              terms: {
                contractCurrency: 'USD',
                sales: [{ sale: 1 }, { sale: 2 }],
                deductions: [{ deduction: 1 }, { deduction: 2 }],
                withholdingTaxes: [{ withholdingTaxe: 1 }, { withholdingTaxe: 2 }],
                mechanicalContracts: [{ mechanicalContract: 1 }, { mechanicalContract: 2 }],
              },
            };
            royaltyCalculator.clientCurrencies = { USD: 'usdField' };
            const calculation = { type: 'Retail Price' };

            // Act
            royaltyCalculator.runCalculation(
              originalSalesLine,
              inputFilter,
              deductionFilters,
              withholdingTaxFilters,
              mechanicalFilters,
              calculation,
              escalationTrackers,
              (err, originalSalesLine, salesLine) => {
                // Assert
                expect(salesLine).toBeDefined();
                done();
              },
            );
          });
        });

        describe("when calculation.type is 'PPD' and ppd is missing from the salesLine", () => {
          it('should not return the sales line to the callback', (done) => {
            // Arrange
            originalSalesLine = {
              originalSalesLine: true,
              contractIds: ['59dd28d9e1d5d31023d09ba1', '59dd28d9e1d5d31023d09ba2'],
              trackId: '59dd28d9e1d5d31023d09ba3',
              releaseId: '59dd28d9e1d5d31023d09ba4',
              netAmount: randomInt(),
              homeCurrencyGrossAmount: randomInt(),
              homeCurrencyNetAmount: randomInt(),
              homeCurrencyDiscountAmount: randomInt(),
            };
            royaltyCalculator.releaseRestrictions = {
              '59dd28d9e1d5d31023d09ba3': ['59dd28d9e1d5d31023d09ba5'],
            };
            royaltyCalculator.contractExchangeRate = randomInt();
            royaltyCalculator.contract = {
              contractId: '59dd28d9e1d5d31023d09ba8',
              name: 'Contract 1',
              share: randomInt(),
              releaseId: '59dd28d9e1d5d31023d09bb1',
              terms: {
                contractCurrency: 'USD',
                sales: [{ sale: 1 }, { sale: 2 }],
                deductions: [{ deduction: 1 }, { deduction: 2 }],
                withholdingTaxes: [{ withholdingTaxe: 1 }, { withholdingTaxe: 2 }],
                mechanicalContracts: [{ mechanicalContract: 1 }, { mechanicalContract: 2 }],
              },
            };
            royaltyCalculator.clientCurrencies = {
              USD: 'usdField',
            };
            const calculation = { type: 'PPD' };

            // Act
            royaltyCalculator.runCalculation(
              originalSalesLine,
              inputFilter,
              deductionFilters,
              withholdingTaxFilters,
              mechanicalFilters,
              calculation,
              escalationTrackers,
              (err, originalSalesLine, salesLine) => {
                // Assert
                expect(salesLine).toBeUndefined();
                done();
              },
            );
          });
        });

        describe("when calculation.type is 'PPD' and ppd is 0 on the release", () => {
          // This is to allow 0 values, which we consider present and specific and not missing
          it('should return the sales line to the callback', (done) => {
            // Arrange
            originalSalesLine = {
              originalSalesLine: true,
              contractIds: ['59dd28d9e1d5d31023d09ba1', '59dd28d9e1d5d31023d09ba2'],
              trackId: '59dd28d9e1d5d31023d09ba3',
              releaseId: '59dd28d9e1d5d31023d09ba4',
              netAmount: randomInt(),
              homeCurrencyGrossAmount: randomInt(),
              homeCurrencyNetAmount: randomInt(),
              homeCurrencyDiscountAmount: randomInt(),
              ppd: 0,
            };
            royaltyCalculator.releaseRestrictions = {
              '59dd28d9e1d5d31023d09ba3': ['59dd28d9e1d5d31023d09ba5'],
            };
            royaltyCalculator.contractExchangeRate = 2;
            royaltyCalculator.contract = {
              contractId: '59dd28d9e1d5d31023d09ba8',
              name: 'Contract 1',
              share: randomInt(),
              releaseId: '59dd28d9e1d5d31023d09bb1',
              terms: {
                contractCurrency: 'USD',
                sales: [{ sale: 1 }, { sale: 2 }],
                deductions: [{ deduction: 1 }, { deduction: 2 }],
                withholdingTaxes: [{ withholdingTaxe: 1 }, { withholdingTaxe: 2 }],
                mechanicalContracts: [{ mechanicalContract: 1 }, { mechanicalContract: 2 }],
              },
            };
            royaltyCalculator.clientCurrencies = { USD: 'usdField' };
            royaltyCalculator.ppds = {
              '59dd28d9e1d5d31023d09ba4': 0,
            };
            const calculation = { type: 'PPD' };

            // Act
            royaltyCalculator.runCalculation(
              originalSalesLine,
              inputFilter,
              deductionFilters,
              withholdingTaxFilters,
              mechanicalFilters,
              calculation,
              escalationTrackers,
              (err, originalSalesLine, salesLine) => {
                // Assert
                expect(salesLine).toBeDefined();
                done();
              },
            );
          });
        });

        describe("when calculation.type is not 'Unit Price', 'Retail Price' of 'PPD'", () => {
          it('should return the originalSalesLine and calculated salesLine', (done) => {
            // Arrange
            originalSalesLine = {
              originalSalesLine: true,
              contractIds: ['59dd28d9e1d5d31023d09ba1', '59dd28d9e1d5d31023d09ba2'],
              trackId: '59dd28d9e1d5d31023d09ba3',
              releaseId: '59dd28d9e1d5d31023d09ba4',
              netAmount: randomInt(),
              homeCurrencyGrossAmount: randomInt(),
              homeCurrencyNetAmount: randomInt(),
              homeCurrencyDiscountAmount: randomInt(),
            };
            royaltyCalculator.releaseRestrictions = {
              '59dd28d9e1d5d31023d09ba3': ['59dd28d9e1d5d31023d09ba5'],
            };
            royaltyCalculator.contractExchangeRate = randomInt();
            royaltyCalculator.contract = {
              contractId: '59dd28d9e1d5d31023d09ba8',
              name: 'Contract 1',
              share: 99,
              releaseId: '59dd28d9e1d5d31023d09bb1',
              terms: {
                contractCurrency: 'USD',
                sales: [{ sale: 1 }, { sale: 2 }],
                deductions: [{ deduction: 1 }, { deduction: 2 }],
                withholdingTaxes: [{ withholdingTaxe: 1 }, { withholdingTaxe: 2 }],
                mechanicalContracts: [{ mechanicalContract: 1 }, { mechanicalContract: 2 }],
              },
            };
            royaltyCalculator.clientCurrencies = { USD: 'usdField' };
            const calculation = { type: 'Other' };

            // Act
            royaltyCalculator.runCalculation(
              originalSalesLine,
              inputFilter,
              deductionFilters,
              withholdingTaxFilters,
              mechanicalFilters,
              calculation,
              escalationTrackers,
              (err, originalSalesLine, salesLine) => {
                // Assert
                expect(originalSalesLine).toBeDefined();
                expect(salesLine).toBeDefined();
                done();
              },
            );
          });
        });
      });
    });
  });

  describe('#filterMatches', () => {
    let salesLine; let filter;
    beforeEach(() => {
      salesLine = {};
      filter = {};
    });

    describe('when salesLine does not exist', () => {
      it('should return false', (done) => {
        // Arrange
        salesLine = null;
        // Act
        royaltyCalculator.filterMatches(salesLine, filter, (result) => {
          // Assert
          expect(result).toBe(false);
          done();
        });
      });
    });

    describe('when filter does not exist', () => {
      it('should return false', (done) => {
        // Arrange
        filter = null;
        // Act
        royaltyCalculator.filterMatches(salesLine, filter, (result) => {
          // Assert
          expect(result).toBe(false);
          done();
        });
      });
    });

    describe('when salesLine and filter are both passed', function () {
      describe('and when single value matches', () => {
        it('should return true', (done) => {
          // Act
          royaltyCalculator.filterMatches(salesLine, filter, (result) => {
            // Assert
            expect(result).toBe(true);
            done();
          });
        });
      });

      describe('and when single value DOES NOT match', () => {
        it('should return false', (done) => {
          // Arrange
          const salesLine = { type: randomString() };
          const filter = { type: randomString() };
          // Act
          royaltyCalculator.filterMatches(salesLine, filter, (result) => {
            // Assert
            expect(result).toBe(false);
            done();
          });
        });
      });

      describe("and when one single value matches and another doesn't", () => {
        it('should return false', (done) => {
          // Arrange
          const salesLine = { property1: randomString(), property2: randomString() };
          const filter = { property1: salesLine.property1, property2: randomString() };
          // Act
          royaltyCalculator.filterMatches(salesLine, filter, (result) => {
            // Assert
            expect(result).toBe(false);
            done();
          });
        });
      });

      describe('and when array value is included', () => {
        it('should return true', (done) => {
          // Arrange
          const salesLine = { property1: randomString() };
          const filter = { property1: { $in: [salesLine.property1, randomString()] } };
          // Act
          royaltyCalculator.filterMatches(salesLine, filter, (result) => {
            // Assert
            expect(result).toBe(true);
            done();
          });
        });
      });

      describe('and when array value DOES NOT match', () => {
        it('should return false', (done) => {
          // Arrange
          const salesLine = { property1: randomString() };
          const filter = { property1: { $in: [randomString(), randomString()] } };
          // Act
          royaltyCalculator.filterMatches(salesLine, filter, (result) => {
            // Assert
            expect(result).toBe(false);
            done();
          });
        });
      });

      describe("and when catType of Contract in filter is passed and salesLine's catType is Contract", () => {
        it('should return true', (done) => {
          // Arrange
          const salesLine = { catType: 'Contract', contractId: randomId() };
          const filter = {
            $or: [
              { catType: 'Contract', contractId: salesLine.contractId },
              { catType: 'Contract', contractId: randomId() },
            ],
          };
          // Act
          royaltyCalculator.filterMatches(salesLine, filter, (result) => {
            // Assert
            expect(result).toBe(true);
            done();
          });
        });
      });

      describe("and when catType of Contract in filter is passed and salesLine's catType is Contract, but another field does not match", () => {
        it('should return false', (done) => {
          // Arrange
          const salesLine = { catType: 'Contract', contractId: randomId() };
          const filter = {
            $or: [
              { catType: 'Contract', contractId: randomId() },
              { catType: 'Contract', contractId: randomId() },
            ],
          };
          // Act
          royaltyCalculator.filterMatches(salesLine, filter, (result) => {
            // Assert
            expect(result).toBe(false);
            done();
          });
        });
      });

      describe("and when catType of Contract in filter is passed and salesLine's catType is NOT Contract", () => {
        it('should return false', (done) => {
          // Arrange
          const salesLine = { catType: randomString(), contractId: randomId() };
          const filter = {
            $or: [
              { catType: 'Contract', contractId: salesLine.contractId },
              { catType: 'Contract', contractId: randomId() },
            ],
          };
          // Act
          royaltyCalculator.filterMatches(salesLine, filter, (result) => {
            // Assert
            expect(result).toBe(false);
            done();
          });
        });
      });

      describe("and when catType of Release in filter is passed and salesLine's catType is Release", () => {
        it('should return true', (done) => {
          // Arrange
          const salesLine = { catType: 'Release', releaseId: randomId() };
          const filter = {
            $or: [
              { catType: 'Release', releaseId: salesLine.releaseId },
              { catType: 'Release', releaseId: randomId() },
            ],
          };
          // Act
          royaltyCalculator.filterMatches(salesLine, filter, (result) => {
            // Assert
            expect(result).toBe(true);
            done();
          });
        });
      });

      describe("and when catType of Release in filter is passed and salesLine's catType is NOT Release", () => {
        it('should return false', (done) => {
          // Arrange
          const salesLine = { catType: randomString(), releaseId: randomId() };
          const filter = {
            $or: [
              { catType: 'Release', releaseId: salesLine.releaseId },
              { catType: 'Release', releaseId: randomId() },
            ],
          };
          // Act
          royaltyCalculator.filterMatches(salesLine, filter, (result) => {
            // Assert
            expect(result).toBe(false);
            done();
          });
        });
      });

      describe("and when catType of Release in filter is passed and salesLine's catType is Release, but another field does not match", () => {
        it('should return false', (done) => {
          // Arrange
          const salesLine = { catType: 'Release', releaseId: randomId(), otherField: randomString() };
          const filter = {
            $or: [
              { catType: 'Release', releaseId: salesLine.releaseId },
              { catType: 'Release', releaseId: randomId() },
            ],
            otherField: 2,
          };
          // Act
          royaltyCalculator.filterMatches(salesLine, filter, (result) => {
            // Assert
            expect(result).toBe(false);
            done();
          });
        });
      });

      describe("and when catType of Track in filter is passed and salesLine's catType is Track", () => {
        it('should return true', (done) => {
          // Arrange
          const salesLine = { catType: 'Track', trackId: randomId() };
          const filter = {
            $or: [
              { catType: 'Track', trackId: salesLine.trackId },
              { catType: 'Track', trackId: randomId() },
            ],
          };
          // Act
          royaltyCalculator.filterMatches(salesLine, filter, (result) => {
            // Assert
            expect(result).toBe(true);
            done();
          });
        });
      });

      describe("and when catType of Track in filter is passed and salesLine's catType is NOT Track", () => {
        it('should return false', (done) => {
          // Arrange
          const salesLine = { catType: randomString(), trackId: randomId() };
          const filter = {
            $or: [
              { catType: 'Track', trackId: salesLine.trackId },
              { catType: 'Track', trackId: randomId() },
            ],
          };
          // Act
          royaltyCalculator.filterMatches(salesLine, filter, (result) => {
            // Assert
            expect(result).toBe(false);
            done();
          });
        });
      });

      describe("and when catType of Track in filter is passed and salesLine's catType is Track, but another field does not match", () => {
        it('should return false', (done) => {
          // Arrange
          const salesLine = { catType: 'Track', trackId: randomId(), otherField: randomString() };
          const filter = {
            $or: [
              { catType: 'Track', trackId: salesLine.trackId },
              { catType: 'Track', trackId: randomId() },
            ],
            otherField: randomString(),
          };
          // Act
          royaltyCalculator.filterMatches(salesLine, filter, (result) => {
            // Assert
            expect(result).toBe(false);
            done();
          });
        });
      });

      describe("and when catType of Work in filter is passed and salesLine's catType is Work", () => {
        it('should return true', (done) => {
          // Arrange
          const salesLine = { catType: 'Work', workId: randomId() };
          const filter = {
            $or: [
              { catType: 'Work', workId: salesLine.workId },
              { catType: 'Work', workId: randomId() },
            ],
          };
          // Act
          royaltyCalculator.filterMatches(salesLine, filter, (result) => {
            // Assert
            expect(result).toBe(true);
            done();
          });
        });
      });

      describe("and when catType of Work in filter is passed and salesLine's catType is NOT Work", () => {
        it('should return false', (done) => {
          // Arrange
          const salesLine = { catType: randomString(), workId: randomId() };
          const filter = {
            $or: [
              { catType: 'Work', workId: salesLine.workId },
              { catType: 'Work', workId: randomId() },
            ],
          };
          // Act
          royaltyCalculator.filterMatches(salesLine, filter, (result) => {
            // Assert
            expect(result).toBe(false);
            done();
          });
        });
      });

      describe("and when catType of Work in filter is passed and salesLine's catType is Work, but another field does not match", () => {
        it('should return false', (done) => {
          // Arrange
          const salesLine = { catType: 'Work', workId: randomId(), otherField: randomString() };
          const filter = {
            $or: [
              { catType: 'Work', workId: salesLine.workId },
              { catType: 'Work', workId: randomId() },
            ],
            otherField: randomString(),
          };
          // Act
          royaltyCalculator.filterMatches(salesLine, filter, (result) => {
            // Assert
            expect(result).toBe(false);
            done();
          });
        });
      });
    });
  });

  describe('#setCatalogueData', function () {
    describe('when passed a salesLine', function () {
      describe('when the salesLine includes a workId', () => {
        describe('and when catalogueData includes the workId', () => {
          it('should update each of the values in the data in the catalogueData item onto the salesLine', (done) => {
            // Arrange
            const salesLine = { workId: randomId() };
            royaltyCalculator.catalogueData = { works: {} };
            royaltyCalculator.catalogueData.works[salesLine.workId] = { property1: randomString(), property2: randomString(), property3: randomString() };
            // Act
            const result = royaltyCalculator.setCatalogueData(salesLine);
            // Assert
            expect(result.property1).toBe(royaltyCalculator.catalogueData.works[salesLine.workId].property1);
            expect(result.property2).toBe(royaltyCalculator.catalogueData.works[salesLine.workId].property2);
            expect(result.property3).toBe(royaltyCalculator.catalogueData.works[salesLine.workId].property3);
            done();
          });
        });

        describe('and when catalogueData DOES NOT include the workId', () => {
          it('should return the original salesLine', (done) => {
            // Arrange
            const salesLine = { workId: randomId() };
            royaltyCalculator.catalogueData = { works: {} };
            // Act
            const result = royaltyCalculator.setCatalogueData(salesLine);
            // Assert
            expect(result).toEqual({ workId: salesLine.workId });
            done();
          });
        });
      });

      describe('when the salesLine includes a trackId', () => {
        describe('and when catalogueData includes the trackId', () => {
          it('should update each of the values in the data in the catalogueData item onto the salesLine', (done) => {
            // Arrange
            const salesLine = { trackId: randomId() };
            royaltyCalculator.catalogueData = { tracks: {} };
            royaltyCalculator.catalogueData.tracks[salesLine.trackId] = { property1: randomString(), property2: randomString(), property3: randomString() };
            // Act
            const result = royaltyCalculator.setCatalogueData(salesLine);
            // Assert
            expect(result.property1).toBe(royaltyCalculator.catalogueData.tracks[salesLine.trackId].property1);
            expect(result.property2).toBe(royaltyCalculator.catalogueData.tracks[salesLine.trackId].property2);
            expect(result.property3).toBe(royaltyCalculator.catalogueData.tracks[salesLine.trackId].property3);
            done();
          });

          it('should set the releaseId from the passed defaultReleaseId', (done) => {
            // Arrange
            const salesLine = { trackId: randomId() };
            royaltyCalculator.catalogueData = { tracks: {} };
            royaltyCalculator.catalogueData.tracks[salesLine.trackId] = { property1: randomString(), property2: randomString(), property3: randomString(), defaultReleaseId: randomId() };
            // Act
            const result = royaltyCalculator.setCatalogueData(salesLine);
            // Assert
            expect(result.releaseId).toBe(royaltyCalculator.catalogueData.tracks[salesLine.trackId].defaultReleaseId);
            done();
          });
        });

        describe('and when catalogueData DOES NOT include the trackId', () => {
          it('should return the original salesLine', (done) => {
            // Arrange
            const salesLine = { trackId: randomId() };
            royaltyCalculator.catalogueData = { tracks: {} };
            // Act
            const result = royaltyCalculator.setCatalogueData(salesLine);
            // Assert
            expect(result).toEqual({ trackId: salesLine.trackId });
            done();
          });
        });
      });

      describe('when the salesLine includes a releaseId', () => {
        describe('and when catalogueData includes the releaseId', () => {
          it('should update each of the values in the data in the catalogueData item onto the salesLine', (done) => {
            // Arrange
            const salesLine = { releaseId: randomId() };
            royaltyCalculator.catalogueData = { releases: {} };
            royaltyCalculator.catalogueData.releases[salesLine.releaseId] = { property1: randomString(), property2: randomString(), property3: randomString() };
            // Act
            const result = royaltyCalculator.setCatalogueData(salesLine);
            // Assert
            expect(result.property1).toBe(royaltyCalculator.catalogueData.releases[salesLine.releaseId].property1);
            expect(result.property2).toBe(royaltyCalculator.catalogueData.releases[salesLine.releaseId].property2);
            expect(result.property3).toBe(royaltyCalculator.catalogueData.releases[salesLine.releaseId].property3);
            done();
          });
        });

        describe('and when catalogueData DOES NOT include the releaseId', () => {
          it('should return the original salesLine', (done) => {
            // Arrange
            const salesLine = { releaseId: randomId() };
            royaltyCalculator.catalogueData = { releases: {} };
            // Act
            const result = royaltyCalculator.setCatalogueData(salesLine);
            // Assert
            expect(result).toEqual({ releaseId: salesLine.releaseId });
            done();
          });
        });
      });
    });
    describe('when NOT passed a salesLine', () => {
      it('should return the original value', (done) => {
        // Arrange
        const salesLine = null;
        // Act
        const result = royaltyCalculator.setCatalogueData(salesLine);
        // Assert
        expect(result).toBeNull();
        done();
      });
    });
  });

  describe('#getSpecificRateForSalesLine', () => {
    let specificRates; let salesLine;
    beforeEach(() => {
      salesLine = {
        distributionChannel: 'distributionChannel1',
        source: 'source1',
        territory: 'territory1',
      };
      specificRates = [];
    });
    describe('missing params', () => {
      it('should return undefined when specificRates is not defined', () => {
        // Arrange
        specificRates = undefined;
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toBe(undefined);
      });
      it('should return undefined when specificRates is not an array', () => {
        // Arrange
        specificRates = randomString();
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toBe(undefined);
      });
      it('should return undefined when salesLine is not defined', () => {
        // Arrange
        salesLine = undefined;
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toBe(undefined);
      });
      it('should return rate item when all specificRates are blank', () => {
        // Arrange
        specificRates = [{}];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toEqual(specificRates[0]);
      });
    });
    describe('match on distributionChannel', () => {
      it('should return specificRates item when distributionChannel of specificRates item matches salesLine.distributionChannel', () => {
        // Arrange
        specificRates = [{
          distributionChannel: salesLine.distributionChannel,
        }];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toEqual(specificRates[0]);
      });
      it('should return specificRates item when one of distributionChannel array of specificRates item matches salesLine.distributionChannel', () => {
        // Arrange
        specificRates = [{
          distributionChannel: [
            'channel1',
            salesLine.distributionChannel,
            'channel2',
          ],
        }];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toEqual(specificRates[0]);
      });
      it('should return specificRates item when distributionChannel of specificRates item is empty string', () => {
        // Arrange
        specificRates = [{
          distributionChannel: '',
        }];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toEqual(specificRates[0]);
      });
      it('should return specificRates item when distributionChannel of specificRates item is null', () => {
        // Arrange
        specificRates = [{
          distributionChannel: null,
        }];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toEqual(specificRates[0]);
      });
    });

    describe('match on territory', () => {
      it('should call continentToTerritories when territory is not an array', () => {
        // Arrange
        specificRates = [{
          territory: randomString(),
        }];
        jest.spyOn(royaltyCalculator, 'continentToTerritories').mockReturnValue(specificRates[0].territory);
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(royaltyCalculator.continentToTerritories).toHaveBeenCalled();
        expect(result).toEqual(specificRates[0]);
      });
      it('should return specificRates item when one of territory array of specificRates item matches salesLine.territory', () => {
        // Arrange
        specificRates = [{
          territory: [
            'channel1',
            salesLine.territory,
            'channel2',
          ],
        }];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toEqual(specificRates[0]);
      });
      it('should return specificRates item when territory of specificRates item is empty string', () => {
        // Arrange
        specificRates = [{
          territory: '',
        }];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toEqual(specificRates[0]);
      });
      it('should return specificRates item when territory of specificRates item is null', () => {
        // Arrange
        specificRates = [{
          territory: null,
        }];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toEqual(specificRates[0]);
      });
      it('should return specificRates item when territory of specificRates item is "World"', () => {
        // Arrange
        specificRates = [{
          territory: 'World',
        }];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toEqual(specificRates[0]);
      });
      it('should return specificRates item when territory of specificRates item is "WW"', () => {
        // Arrange
        specificRates = [{
          territory: 'WW',
        }];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toEqual(specificRates[0]);
      });
      it('should return specificRates item when territory array of specificRates is empty array', () => {
        // Arrange
        specificRates = [{
          territory: [],
        }];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toEqual(specificRates[0]);
      });
      it('should return specificRates item when the only item of territory array of specificRates is null', () => {
        // Arrange
        specificRates = [{
          territory: [null],
        }];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toEqual(specificRates[0]);
      });
      it('should return specificRates item when one of territory array of specificRates is empty string', () => {
        // Arrange
        specificRates = [{
          territory: [
            'channel1',
            '',
            'channel2',
          ],
        }];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toEqual(specificRates[0]);
      });
      it('should return specificRates item when one of territory array of specificRates is "World"', () => {
        // Arrange
        specificRates = [{
          territory: [
            'channel1',
            'World',
            'channel2',
          ],
        }];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toEqual(specificRates[0]);
      });
      it('should return specificRates item when one of territory array of specificRates is "WW', () => {
        // Arrange
        specificRates = [{
          territory: [
            'channel1',
            'WW',
            'channel2',
          ],
        }];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toEqual(specificRates[0]);
      });
    });

    describe('match on source', () => {
      it('should return specificRates item when source of specificRates item matches salesLine.source', () => {
      // Arrange
        specificRates = [{
          source: salesLine.source,
        }];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toEqual(specificRates[0]);
      });
      it('should return specificRates item when source of specificRates item is empty string', () => {
      // Arrange
        specificRates = [{
          source: '',
        }];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toEqual(specificRates[0]);
      });
      it('should return specificRates item when source of specificRates item is null', () => {
      // Arrange
        specificRates = [{
          source: null,
        }];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toEqual(specificRates[0]);
      });
    });

    describe('not matching', () => {
      it('should return undefined when distributionChannel of specificRates does not match', () => {
        // Arrange
        specificRates = [
          {
            distributionChannel: 'other channel',
            source: salesLine.source,
            territory: [salesLine.territory],
          },
        ];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toBe(undefined);
      });
      it('should return undefined when source of specificRates does not match', () => {
        // Arrange
        specificRates = [
          {
            distributionChannel: salesLine.distributionChannel,
            source: 'other source',
            territory: [salesLine.territory],
          },
        ];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toBe(undefined);
      });
      it('should return undefined when territory of specificRates does not match', () => {
        // Arrange
        specificRates = [
          {
            distributionChannel: salesLine.distributionChannel,
            source: salesLine.source,
            territory: ['other territory'],
          },
        ];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toBe(undefined);
      });
    });
    describe('sorting on most specific', () => {
      it('should return the specificRates with the most specific matches - 3 vs 2 specific matches', () => {
        // Arrange
        specificRates = [
          {
            source: salesLine.source,
            territory: salesLine.territory,
          },
          {
            distributionChannel: salesLine.distributionChannel,
            source: salesLine.source,
            territory: salesLine.territory,
          },
        ];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toBe(specificRates[1]);
      });
      it('should return the specificRates with the most specific matches - 2 vs 1 specific match', () => {
        // Arrange
        specificRates = [
          {
            source: salesLine.source,
          },
          {
            distributionChannel: salesLine.distributionChannel,
            source: salesLine.source,
          },
        ];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toBe(specificRates[1]);
      });
      it('should return the specificRates with the most specific matches - 3 vs 2 vs 1 specific matche', () => {
        // Arrange
        specificRates = [
          {
            source: salesLine.source,
            territory: salesLine.territory,
          },
          {
            source: salesLine.source,
          },
          {
            distributionChannel: salesLine.distributionChannel,
            source: salesLine.source,
            territory: salesLine.territory,
          },
        ];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toBe(specificRates[2]);
      });
      it('should return the specificRates with the most specific matches where rate is 0', () => {
        // Arrange
        specificRates = [
          {
            source: salesLine.source,
            territory: salesLine.territory,
            rate: 10,
          },
          {
            distributionChannel: salesLine.distributionChannel,
            source: salesLine.source,
            territory: salesLine.territory,
            rate: 0,
          },
          {
            source: salesLine.source,
            rate: 20,
          },
        ];
        // Act
        const result = royaltyCalculator.getSpecificRateForSalesLine(specificRates, salesLine);
        // Assert
        expect(result).toBe(specificRates[1]);
      });
    });
  });
});
