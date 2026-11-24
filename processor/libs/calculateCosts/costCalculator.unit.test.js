const { randomId, randomString, randomDate, randomInt, randomFloat } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const moment = require('moment');
const { ObjectId } = require('mongodb');
const CostCalculator = require('./costCalculator');

describe('CostCalculator Unit Tests', () => {
  let contract;
  let exchangeRates;
  let db;
  let bigQuery;
  let costsDatabaseTable;
  let periodId;
  let filter;
  let periodEndDate;
  let catalogueData;
  let collectionFindStub;
  let collectionFindToArrayStub;
  let inputCollection;
  let collectionUpdateManyStub;
  let collectionFindOneStub;
  let collectionUpdateOneStub;

  beforeEach(() => {
    contract = {
      contractCurrency: 'USD',
      contractId: randomId(),
      name: randomString(),
      terms: ['term1', 'term2'],
      objectPercentage: randomInt(),
      escalationTracking: randomString(),
    };
    exchangeRates = [{ currency: 'USD' }, { currency: 'GBP' }];
    collectionFindToArrayStub = jest.fn().mockResolvedValue([]);
    collectionFindStub = jest.fn().mockReturnValue({ toArray: collectionFindToArrayStub });
    collectionFindOneStub = jest.fn().mockResolvedValue(undefined);
    collectionUpdateManyStub = jest.fn().mockResolvedValue(undefined);
    collectionUpdateOneStub = jest.fn().mockResolvedValue(undefined);
    inputCollection = {
      find: collectionFindStub,
      findOne: collectionFindOneStub,
      updateOne: collectionUpdateOneStub,
      updateMany: collectionUpdateManyStub,
    };
    db = { collection: jest.fn().mockReturnValue(inputCollection) };
    bigQuery = { writeToFile: jest.fn().mockImplementation((_lines, cb) => cb()) };
    costsDatabaseTable = randomString();
    periodId = randomId();
    filter = { condition: true };
    periodEndDate = randomDate();
    catalogueData = 'catalogueData';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('#byContract', () => {
    beforeEach(() => {
      jest.spyOn(CostCalculator, 'createFilterAndCalculations').mockImplementation((_contract, _periodId, _filter, cb) => cb(null, {}));
      jest.spyOn(CostCalculator, 'runCostsFilter').mockImplementation((_db, _bigQuery, _costFilter, _inputCollection, _periodId, _contractId, _contractName, _periodEndDate, _catalogueData, cb) => cb(null, {}));
    });

    it('should set CostCalculator.exchangeRates to the passed exchange rates', (done) => {
      CostCalculator.byContract(contract, db, bigQuery, costsDatabaseTable, periodId, filter, periodEndDate, catalogueData, exchangeRates, () => {
        expect(CostCalculator.exchangeRates).toEqual(exchangeRates);
        done();
      });
    });

    it('should set CostCalculator.contract to the passed contract', (done) => {
      CostCalculator.byContract(contract, db, bigQuery, costsDatabaseTable, periodId, filter, periodEndDate, catalogueData, exchangeRates, () => {
        expect(CostCalculator.contract).toEqual(contract);
        done();
      });
    });

    describe("when contract.currency is 'Home Currency'", () => {
      it('should set CostCalculator.contractExchangeRate to 1', (done) => {
        contract = { contractCurrency: 'Home Currency' };
        CostCalculator.byContract(contract, db, bigQuery, costsDatabaseTable, periodId, filter, periodEndDate, catalogueData, exchangeRates, () => {
          expect(CostCalculator.contractExchangeRate).toBe(1);
          done();
        });
      });
    });

    describe('when contract.currency is a specified currency and the exchange rate is within the passed exchange rates', () => {
      it('should set the exchange rate as defined', (done) => {
        exchangeRates = [{ from: 'Home Currency', to: 'USD', rate: '0.99' }];
        CostCalculator.byContract(contract, db, bigQuery, costsDatabaseTable, periodId, filter, periodEndDate, catalogueData, exchangeRates, () => {
          expect(CostCalculator.contractExchangeRate).toBe(exchangeRates[0].rate);
          done();
        });
      });
    });

    describe('when contract.currency is a specified currency and the exchange rate is NOT within the passed exchange rates', () => {
      it('should set the exchange rate to 0', (done) => {
        contract = { contractCurrency: 'MAD' };
        exchangeRates = [{ from: 'Home Currency', to: 'USD', rate: '0.99' }];
        CostCalculator.byContract(contract, db, bigQuery, costsDatabaseTable, periodId, filter, periodEndDate, catalogueData, exchangeRates, () => {
          expect(CostCalculator.contractExchangeRate).toBe(0);
          done();
        });
      });
    });

    describe('when contract is missing', () => {
      it('should return an error to the callback', (done) => {
        contract = null;
        const expectedError = 'Requires a contract, costsDatabaseTable, periodId and filter to be passed';
        CostCalculator.byContract(contract, db, bigQuery, costsDatabaseTable, periodId, filter, periodEndDate, catalogueData, exchangeRates, (err) => {
          expect(err).toBe(expectedError);
          done();
        });
      });
    });

    describe('when db is missing', () => {
      it('should return an error to the callback', (done) => {
        db = null;
        const expectedError = 'Requires a contract, costsDatabaseTable, periodId and filter to be passed';
        CostCalculator.byContract(contract, db, bigQuery, costsDatabaseTable, periodId, filter, periodEndDate, catalogueData, exchangeRates, (err) => {
          expect(err).toBe(expectedError);
          done();
        });
      });
    });

    describe('when costsDatabaseTable is missing', () => {
      it('should return an error to the callback', (done) => {
        costsDatabaseTable = null;
        const expectedError = 'Requires a contract, costsDatabaseTable, periodId and filter to be passed';
        CostCalculator.byContract(contract, db, bigQuery, costsDatabaseTable, periodId, filter, periodEndDate, catalogueData, exchangeRates, (err) => {
          expect(err).toBe(expectedError);
          done();
        });
      });
    });

    describe('when periodId is missing', () => {
      it('should return an error to the callback', (done) => {
        const periodId = null;
        const expectedError = 'Requires a contract, costsDatabaseTable, periodId and filter to be passed';
        CostCalculator.byContract(contract, db, bigQuery, costsDatabaseTable, periodId, filter, periodEndDate, catalogueData, exchangeRates, (err) => {
          expect(err).toBe(expectedError);
          done();
        });
      });
    });

    describe('when filter is missing', () => {
      it('should return an error to the callback', (done) => {
        filter = null;
        const expectedError = 'Requires a contract, costsDatabaseTable, periodId and filter to be passed';
        CostCalculator.byContract(contract, db, bigQuery, costsDatabaseTable, periodId, filter, periodEndDate, catalogueData, exchangeRates, (err) => {
          expect(err).toBe(expectedError);
          done();
        });
      });
    });

    describe('when contract, db, costsDatabaseTable, periodId, writeCostsDatabaseTable and filter are passed', () => {
      it('should call CostCalculator.createFilterAndCalculations with the passed contract, periodId and filter', (done) => {
        CostCalculator.byContract(contract, db, bigQuery, costsDatabaseTable, periodId, filter, periodEndDate, catalogueData, exchangeRates, () => {
          expect(CostCalculator.createFilterAndCalculations).toHaveBeenCalledWith(contract, periodId, filter, expect.any(Function));
          done();
        });
      });

      describe('when CostCalculator.createFilterAndCalculations returns an error', () => {
        it('should call the callback with the returned error', (done) => {
          const expectedError = randomString();
          CostCalculator.createFilterAndCalculations.mockImplementation((_contract, _periodId, _filter, cb) => cb(expectedError));
          CostCalculator.byContract(contract, db, null, costsDatabaseTable, periodId, filter, periodEndDate, catalogueData, exchangeRates, (err) => {
            expect(err).toBe(expectedError);
            done();
          });
        });
      });

      describe('when CostCalculator.createFilterAndCalculations returns specificFilters', () => {
        it('should call CostCalculator.runCostsFilter for each filter with the specific parameters', (done) => {
          const returnedFilters = [{ filter: 1 }, { filter: 2 }];
          CostCalculator.createFilterAndCalculations.mockImplementation((_contract, _periodId, _filter, cb) => cb(null, returnedFilters));
          CostCalculator.byContract(contract, db, bigQuery, costsDatabaseTable, periodId, filter, periodEndDate, catalogueData, exchangeRates, () => {
            expect(CostCalculator.runCostsFilter).toHaveBeenCalledWith(db, bigQuery, returnedFilters[0], inputCollection, periodId, contract.contractId, contract.name, periodEndDate, catalogueData, expect.any(Function));
            expect(CostCalculator.runCostsFilter).toHaveBeenCalledWith(db, bigQuery, returnedFilters[1], inputCollection, periodId, contract.contractId, contract.name, periodEndDate, catalogueData, expect.any(Function));
            done();
          });
        });
      });
    });
  });

  describe('#createFilterAndCalculations', () => {
    describe('when not passed a contract', () => {
      it('should return an error to the callback', (done) => {
        const expectedError = 'Requires a contract with terms and a filter';
        contract = null;
        CostCalculator.createFilterAndCalculations(contract, periodId, filter, (err) => {
          expect(err).toBe(expectedError);
          done();
        });
      });
    });

    describe('when contract has no terms', () => {
      it('should return an error to the callback', (done) => {
        const expectedError = 'Requires a contract with terms and a filter';
        delete contract.terms;
        CostCalculator.createFilterAndCalculations(contract, periodId, filter, (err) => {
          expect(err).toBe(expectedError);
          done();
        });
      });
    });

    describe('when filter is missing', () => {
      it('should return an error to the callback', (done) => {
        const expectedError = 'Requires a contract with terms and a filter';
        filter = null;
        CostCalculator.createFilterAndCalculations(contract, periodId, filter, (err) => {
          expect(err).toBe(expectedError);
          done();
        });
      });
    });

    describe('when contract with terms and filter is passed', () => {
      beforeEach(() => {
        jest.spyOn(CostCalculator, 'createCostFilterAndCalculation').mockReturnValue({ result: 'createCostFilterAndCalculation' });
      });

      it('should call CostCalculator.createCostFilterAndCalculation for each term with the specific params', (done) => {
        CostCalculator.createFilterAndCalculations(contract, periodId, filter, () => {
          expect(CostCalculator.createCostFilterAndCalculation).toHaveBeenCalledWith(contract.terms[0], contract.objectPercentage, periodId, filter);
          expect(CostCalculator.createCostFilterAndCalculation).toHaveBeenCalledWith(contract.terms[1], contract.objectPercentage, periodId, filter);
          done();
        });
      });

      it('should add each returned obj from CostCalculator.createCostFilterAndCalculation to the output array', (done) => {
        CostCalculator.createFilterAndCalculations(contract, periodId, filter, (err, result) => {
          expect(result).toEqual([{ result: 'createCostFilterAndCalculation' }, { result: 'createCostFilterAndCalculation' }]);
          done();
        });
      });
    });
  });

  describe('#createCostFilterAndCalculation', () => {
    let term;
    let createFilterResult;
    let createCalculationResult;

    beforeEach(() => {
      term = { escalationTrackers: 'escalationTrackers' };
      createFilterResult = { result: 'createFilter' };
      jest.spyOn(CostCalculator, 'createFilter').mockReturnValue(createFilterResult);
      createCalculationResult = { result: 'createCalculation' };
      jest.spyOn(CostCalculator, 'createCalculation').mockReturnValue(createCalculationResult);
    });

    it('should call CostCalculator.createFilter with the term, periodId and filter', () => {
      CostCalculator.createCostFilterAndCalculation(term, contract.objectPercentage, periodId, filter);
      expect(CostCalculator.createFilter).toHaveBeenCalledWith(term, periodId, filter);
    });

    it('should call CostCalculator.createCalculation with the term, and objectPercentage', () => {
      CostCalculator.createCostFilterAndCalculation(term, contract.objectPercentage, periodId, filter);
      expect(CostCalculator.createCalculation).toHaveBeenCalledWith(term, contract.objectPercentage);
    });

    it('should return an object', () => {
      const result = CostCalculator.createCostFilterAndCalculation(term, contract.objectPercentage, periodId, filter);
      expect(typeof result === 'object').toBe(true);
    });

    it('should return the returned value from CostCalculator.createFilter in object.filter', () => {
      const result = CostCalculator.createCostFilterAndCalculation(term, contract.objectPercentage, periodId, filter);
      expect(result.filter).toEqual(createFilterResult);
    });

    it('should return the returned value from CostCalculator.createCalculation in object.calculation', () => {
      const result = CostCalculator.createCostFilterAndCalculation(term, contract.objectPercentage, periodId, filter);
      expect(result.calculation).toEqual(createCalculationResult);
    });

    it('should return the returned the term.escalationTrackers in object.escalationTrackers', () => {
      const result = CostCalculator.createCostFilterAndCalculation(term, contract.objectPercentage, periodId, filter);
      expect(result.escalationTrackers).toEqual(term.escalationTrackers);
    });
  });

  describe('#createFilter', () => {
    let object;
    beforeEach(() => {
      object = {};
    });

    it('should return an object', () => {
      const result = CostCalculator.createFilter(object, periodId, filter);
      expect(typeof result === 'object').toBe(true);
    });

    describe('when object.territory is a string', () => {
      it('should return the territory in { $in: [territory] }', () => {
        object = { territory: 'FR' };
        const expectedTerritory = { $in: [object.territory] };
        const result = CostCalculator.createFilter(object, periodId, filter);
        expect(result.territory).toEqual(expectedTerritory);
      });
    });

    describe('when term.territory is a continent', () => {
      it('should return the value from CostCalculator.continentToTerritories within the $in parameter', () => {
        object = { territory: 'Europe' };
        const europe = ['AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FO', 'FI', 'FR', 'DE', 'GI', 'GR', 'GG', 'VA', 'HU', 'IS', 'IE', 'IM', 'IT', 'JE', 'LV', 'LI', 'LT', 'LU', 'MK', 'MT', 'MD', 'MC', 'ME', 'XK', 'NL', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SJ', 'SE', 'CH', 'UA', 'GB', 'AX'];
        const expectedTerritory = { $in: europe };
        const result = CostCalculator.createFilter(object, periodId, filter);
        expect(result.territory).toEqual(expectedTerritory);
      });
    });

    describe('when term.territory is an array', () => {
      it('should return the value in { $in: territory }', () => {
        object = { territory: ['UK', 'FR'] };
        const expectedTerritory = { $in: object.territory };
        const result = CostCalculator.createFilter(object, periodId, filter);
        expect(result.territory).toEqual(expectedTerritory);
      });
    });

    describe('when term.type is an array', () => {
      it('should set type to { $in: type }', () => {
        object = { territory: ['UK', 'FR'], type: ['Type 1', 'Type 2'] };
        const expectType = { $in: object.type };
        const result = CostCalculator.createFilter(object, periodId, filter);
        expect(result.type).toEqual(expectType);
      });
    });

    describe('when term.type is a string', () => {
      it('should return the original string as type', () => {
        object = { territory: ['UK', 'FR'], type: randomString() };
        const expectType = object.type;
        const result = CostCalculator.createFilter(object, periodId, filter);
        expect(result.type).toEqual(expectType);
      });
    });
  });

  describe('#continentToTerritories', () => {
    describe('when not passed a continent, but a territory code', () => {
      it('should return the code in an array', () => {
        const territory = 'FR';
        expect(CostCalculator.continentToTerritories(territory)).toEqual([territory]);
      });
    });

    describe('when not passed a continent, but an array', () => {
      it('should return the array', () => {
        const territory = ['FR', 'UK'];
        expect(CostCalculator.continentToTerritories(territory)).toEqual(territory);
      });
    });

    describe('when passed a continent', () => {
      it('should return an array for Europe', () => {
        const territory = 'Europe';
        const europe = ['AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FO', 'FI', 'FR', 'DE', 'GI', 'GR', 'GG', 'VA', 'HU', 'IS', 'IE', 'IM', 'IT', 'JE', 'LV', 'LI', 'LT', 'LU', 'MK', 'MT', 'MD', 'MC', 'ME', 'XK', 'NL', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SJ', 'SE', 'CH', 'UA', 'GB', 'AX'];
        expect(CostCalculator.continentToTerritories(territory)).toEqual(europe);
      });

      it('should return an array for Africa', () => {
        const territory = 'Africa';
        const africa = ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SH', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW'];
        expect(CostCalculator.continentToTerritories(territory)).toEqual(africa);
      });

      it('should return an array for Americas', () => {
        const territory = 'Americas';
        const americas = ['AW', 'CW', 'AI', 'AG', 'AR', 'BS', 'BB', 'BZ', 'BM', 'BO', 'BQ', 'BR', 'VG', 'CA', 'KY', 'CL', 'CO', 'CR', 'CU', 'CW', 'DM', 'DO', 'EC', 'SV', 'FK', 'GF', 'GL', 'GD', 'GP', 'GT', 'GY', 'HT', 'HN', 'JM', 'MQ', 'MX', 'MS', 'AN', 'NI', 'PA', 'PY', 'PE', 'PR', 'BL', 'KN', 'LC', 'MF', 'PM', 'VC', 'SR', 'TT', 'TC', 'US', 'UY', 'VE', 'VI', 'SX'];
        expect(CostCalculator.continentToTerritories(territory)).toEqual(americas);
      });

      it('should return an array for Asia', () => {
        const territory = 'Asia';
        const asia = ['AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE', 'HK', 'IN', 'ID', 'IR', 'IQ', 'IL', 'JP', 'JO', 'KZ', 'KP', 'KR', 'KW', 'KG', 'LA', 'LB', 'MO', 'MY', 'MV', 'MN', 'MM', 'NP', 'OM', 'PK', 'PS', 'PH', 'QA', 'SA', 'SG', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL', 'TR', 'TM', 'AE', 'UZ', 'VN', 'YE'];
        expect(CostCalculator.continentToTerritories(territory)).toEqual(asia);
      });

      it('should return an array for Oceania', () => {
        const territory = 'Oceania';
        const oceania = ['AS', 'AQ', 'AU', 'BV', 'IO', 'CX', 'CC', 'CK', 'FJ', 'PF', 'TF', 'GU', 'HM', 'KI', 'MH', 'FM', 'NR', 'NC', 'NZ', 'NU', 'NF', 'MP', 'PW', 'PG', 'PN', 'SB', 'GS', 'TK', 'TO', 'TV', 'UM', 'VU', 'WF', 'WS'];
        expect(CostCalculator.continentToTerritories(territory)).toEqual(oceania);
      });
    });
  });

  describe('#createCalculation', () => {
    it('should return an object', () => {
      const term = {};
      const result = CostCalculator.createCalculation(term, contract.objectPercentage);
      expect(typeof result === 'object').toBe(true);
    });

    it('should include the passed object percentage', () => {
      const term = {};
      const result = CostCalculator.createCalculation(term, contract.objectPercentage);
      expect(result.objectPercentage).toBe(contract.objectPercentage);
    });

    describe('when a rate is included in the term', () => {
      it('should return the rate', () => {
        const term = { rate: '0.99' };
        const result = CostCalculator.createCalculation(term, contract.objectPercentage);
        expect(result.rate).toBe(term.rate);
      });
    });

    describe('when a rate is NOT included in the term', () => {
      it('should NOT return a rate in the object', () => {
        const term = {};
        const result = CostCalculator.createCalculation(term, contract.objectPercentage);
        expect(result.rate).toBeUndefined();
      });
    });

    describe('when escalations are included in the term', () => {
      it('should return the escalations', () => {
        const term = { escalations: 'escalations' };
        const result = CostCalculator.createCalculation(term, contract.objectPercentage);
        expect(result.escalations).toBe(term.escalations);
      });
    });

    describe('when escalations are NOT included in the term', () => {
      it('should NOT return escalations in the object', () => {
        const term = {};
        const result = CostCalculator.createCalculation(term, contract.objectPercentage);
        expect(result.escalations).toBeUndefined();
      });
    });
  });

  describe('#organiseTerms', () => {
    beforeEach(() => {
      jest.spyOn(CostCalculator, 'removeAllOrBlankTerms').mockReturnValue({ result: randomString() });
      jest.spyOn(CostCalculator, 'sortBySpecificity').mockReturnValue({ result: randomString() });
    });

    describe('when the passed contract has terms', () => {
      it('should call removeAllOrBlankTerms', () => {
        CostCalculator.organiseTerms(contract);
        expect(CostCalculator.removeAllOrBlankTerms).toHaveBeenCalled();
      });

      it('should call sortBySpecificity', () => {
        CostCalculator.organiseTerms(contract);
        expect(CostCalculator.sortBySpecificity).toHaveBeenCalled();
      });
    });

    describe('when not passed a contract', () => {
      it('should not call removeAllOrBlankTerms', () => {
        contract = null;
        CostCalculator.organiseTerms(contract);
        expect(CostCalculator.removeAllOrBlankTerms).not.toHaveBeenCalled();
      });

      it('should not call sortBySpecificity', () => {
        contract = null;
        CostCalculator.organiseTerms(contract);
        expect(CostCalculator.sortBySpecificity).not.toHaveBeenCalled();
      });
    });
  });

  describe('#removeAllOrBlankTerms', () => {
    it('should return an object', () => {
      const object = { property1: 'property1', property2: 'property2' };
      const result = CostCalculator.removeAllOrBlankTerms(object);
      expect(typeof result === 'object').toBe(true);
    });

    it("should remove any fields that are specified as 'All'", () => {
      const object = { property1: 'All', property2: 'property2' };
      const result = CostCalculator.removeAllOrBlankTerms(object);
      expect(result).toEqual({ property2: 'property2' });
    });

    it("should remove any fields that are specified as 'World'", () => {
      const object = { property1: 'World', property2: 'property2' };
      const result = CostCalculator.removeAllOrBlankTerms(object);
      expect(result).toEqual({ property2: 'property2' });
    });
  });

  describe('#sortBySpecificity', () => {
    describe("when the first item contains type and the second doesn't", () => {
      it('should return -1', () => {
        const object = { type: randomString() };
        const comparison = {};
        const result = CostCalculator.sortBySpecificity(object, comparison);
        expect(result).toBe(-1);
      });
    });

    describe("when the second item contains type and the first doesn't", () => {
      it('should return 1', () => {
        const object = {};
        const comparison = { type: randomString() };
        const result = CostCalculator.sortBySpecificity(object, comparison);
        expect(result).toBe(1);
      });
    });

    describe('when the first item contains type and the second contains a territory', () => {
      it('should return -1', () => {
        const object = { type: randomString() };
        const comparison = { territory: 'FR' };
        const result = CostCalculator.sortBySpecificity(object, comparison);
        expect(result).toBe(-1);
      });
    });

    describe("when the first item contains a specific territory and the second doesn't", () => {
      it('should return -1', () => {
        const object = { territory: 'FR' };
        const comparison = {};
        const result = CostCalculator.sortBySpecificity(object, comparison);
        expect(result).toBe(-1);
      });
    });

    describe("when the second item contains a specific territory and the first doesn't", () => {
      it('should return 1', () => {
        const object = {};
        const comparison = { territory: 'FR' };
        const result = CostCalculator.sortBySpecificity(object, comparison);
        expect(result).toBe(1);
      });
    });

    describe('when the first item contains a specific territory and the second contains a continent', () => {
      it('should return -1', () => {
        const object = { territory: 'FR' };
        const comparison = { territory: 'Europe' };
        const result = CostCalculator.sortBySpecificity(object, comparison);
        expect(result).toBe(-1);
      });
    });

    describe('when the first item contains a specific Continent and the second doesnt', () => {
      it('should return 1', () => {
        const object = {};
        const comparison = { territory: 'Europe' };
        const result = CostCalculator.sortBySpecificity(object, comparison);
        expect(result).toBe(1);
      });
    });

    describe('when the first item doesnt contain a specific Continent and the second does', () => {
      it('should return -1', () => {
        const object = { territory: 'Europe' };
        const comparison = {};
        const result = CostCalculator.sortBySpecificity(object, comparison);
        expect(result).toBe(-1);
      });
    });

    describe('when the first item is a territory and the second is EU', () => {
      it('should return -1', () => {
        const object = { territory: 'BE' };
        const comparison = { territory: 'EU' };
        const result = CostCalculator.sortBySpecificity(object, comparison);
        expect(result).toBe(-1);
      });
    });

    describe('when the first item is a territory and the second is WW', () => {
      it('should return -1', () => {
        const object = { territory: 'BE' };
        const comparison = { territory: 'WW' };
        const result = CostCalculator.sortBySpecificity(object, comparison);
        expect(result).toBe(-1);
      });
    });
  });

  describe('#runCostsFilter', () => {
    let inputs = { inputs: {} };

    describe('when not passed any inputs', () => {
      it('should return an error to the callback', (done) => {
        inputs = null;
        CostCalculator.runCostsFilter(db, bigQuery, inputs, inputCollection, periodId, contract.contractId, contract.contractName, periodEndDate, catalogueData, (err) => {
          expect(err).toBe('Requires inputs, inputCollection and periodId');
          done();
        });
      });
    });

    describe('when not passed any inputs.filter', () => {
      it('should return an error to the callback', (done) => {
        inputs = {};
        CostCalculator.runCostsFilter(db, bigQuery, inputs, inputCollection, periodId, contract.contractId, contract.contractName, periodEndDate, catalogueData, (err) => {
          expect(err).toBe('Requires inputs, inputCollection and periodId');
          done();
        });
      });
    });

    describe('when not passed an inputCollection', () => {
      it('should return an error to the callback', (done) => {
        inputCollection = null;
        CostCalculator.runCostsFilter(db, bigQuery, inputs, inputCollection, periodId, contract.contractId, contract.contractName, periodEndDate, catalogueData, (err) => {
          expect(err).toBe('Requires inputs, inputCollection and periodId');
          done();
        });
      });
    });

    describe('when not passed a periodId', () => {
      it('should return an error to the callback', (done) => {
        periodId = null;
        CostCalculator.runCostsFilter(db, bigQuery, inputs, inputCollection, periodId, contract.contractId, contract.contractName, periodEndDate, catalogueData, (err) => {
          expect(err).toBe('Requires inputs, inputCollection and periodId');
          done();
        });
      });
    });

    describe('when passed inputs, inputCollection and periodId', () => {
      it('should call find on the inputCollection with the created filter', (done) => {
        const inputs = { filter: { _id: { $in: [randomId(), randomId()] } }, calculation: {} };
        const expectedFilter = { _id: { $in: inputs.filter._id.$in.map((id) => ObjectId.createFromHexString(id)) }, calculationContractIds: { $ne: contract.contractId } };
        CostCalculator.runCostsFilter(db, bigQuery, inputs, inputCollection, periodId, contract.contractId, contract.contractName, periodEndDate, catalogueData, () => {
          expect(collectionFindStub).toHaveBeenCalledWith(expectedFilter);
          done();
        });
      });

      describe('when inputCollection.find returns an error', () => {
        it('should return the error to the callback', (done) => {
          const expectedError = randomString();
          collectionFindToArrayStub.mockRejectedValue(expectedError);
          const inputs = { filter: { _id: { $in: [randomId(), randomId()] } }, calculation: {} };
          CostCalculator.runCostsFilter(db, bigQuery, inputs, inputCollection, periodId, contract.contractId, contract.contractName, periodEndDate, catalogueData, (err) => {
            expect(err).toBe(expectedError);
            done();
          });
        });
      });

      describe("when inputCollection.find doesn't return an error", () => {
        it('should call CostCalculator.runCalculation on each found line', (done) => {
          const expectedCostlines = [randomString(), randomString()];
          collectionFindToArrayStub.mockResolvedValue(expectedCostlines);
          const inputs = { filter: { _id: { $in: [randomId(), randomId()] } }, calculation: { calculation: true }, escalationTrackers: { escalationTracker: true } };
          jest.spyOn(CostCalculator, 'runCalculation').mockImplementation((_db, _costLine, _calc, _trackers, _periodId, _contractId, _periodEndDate, cb) => cb(null, {}));
          CostCalculator.runCostsFilter(db, bigQuery, inputs, inputCollection, periodId, contract.contractId, contract.contractName, periodEndDate, catalogueData, () => {
            expect(CostCalculator.runCalculation).toHaveBeenCalledWith(db, expectedCostlines[0], inputs.calculation, inputs.escalationTrackers, periodId, contract.contractId, periodEndDate, expect.any(Function));
            expect(CostCalculator.runCalculation).toHaveBeenCalledWith(db, expectedCostlines[1], inputs.calculation, inputs.escalationTrackers, periodId, contract.contractId, periodEndDate, expect.any(Function));
            done();
          });
        });

        describe('when CostCalculator.runCalculation returns an error', () => {
          it('should return the error to the callback', (done) => {
            const expectedCostlines = [randomString(), randomString()];
            collectionFindToArrayStub.mockResolvedValue(expectedCostlines);
            const inputs = { filter: { _id: { $in: [randomId(), randomId()] } }, calculation: { calculation: true }, escalationTrackers: { escalationTracker: true } };
            const expectedError = randomString();
            jest.spyOn(CostCalculator, 'runCalculation').mockImplementation((_db, _costLine, _calc, _trackers, _periodId, _contractId, _periodEndDate, cb) => cb(expectedError));
            CostCalculator.runCostsFilter(db, bigQuery, inputs, inputCollection, periodId, contract.contractId, contract.contractName, periodEndDate, catalogueData, (err) => {
              expect(err).not.toBe(expectedError);
              done();
            });
          });
        });

        describe('when CostCalculator.runCalculation returns an outputLine', () => {
          let inputs;
          let releaseIds;
          let trackIds;

          beforeEach(() => {
            inputs = { filter: { _id: { $in: [randomId(), randomId()] } }, calculation: { calculation: true }, escalationTrackers: { escalationTracker: true } };
            releaseIds = [randomId(), randomId()];
            trackIds = [randomId(), randomId()];
            collectionFindToArrayStub.mockResolvedValue([{ releaseIds, trackIds }]);
            jest.spyOn(CostCalculator, 'runCalculation').mockImplementation((_db, _costLine, _calc, _trackers, _periodId, _contractId, _periodEndDate, cb) => cb(null, {}));
            jest.spyOn(CostCalculator, 'setCatalogueData').mockImplementation((line) => line);
          });

          it('should set contractName to the passed contractName', (done) => {
            const expectedOutputLine = [{ contractName: contract.name, releaseId: releaseIds[0], trackId: trackIds[0] }];
            CostCalculator.runCostsFilter(db, bigQuery, inputs, inputCollection, periodId, contract.contractId, contract.name, periodEndDate, catalogueData, () => {
              expect(bigQuery.writeToFile).toHaveBeenCalledWith(expectedOutputLine, expect.any(Function));
              done();
            });
          });

          it('should call CostCalculator.setCatalogueData with the line and passed catalogue', (done) => {
            const expectedOutputLine = { contractName: contract.name, releaseId: releaseIds[0], trackId: trackIds[0] };
            CostCalculator.runCostsFilter(db, bigQuery, inputs, inputCollection, periodId, contract.contractId, contract.name, periodEndDate, catalogueData, () => {
              expect(CostCalculator.setCatalogueData).toHaveBeenCalledWith(expectedOutputLine, catalogueData);
              done();
            });
          });

          it('should remove any unwanted values for writing to the DB', (done) => {
            CostCalculator.runCalculation.mockImplementation((_db, _costLine, _calc, _trackers, _periodId, _contractId, _periodEndDate, cb) => cb(null, {
              unwanted1: 'unwanted1',
              unwanted2: 'unwanted2',
            }));
            CostCalculator.runCostsFilter(db, bigQuery, inputs, inputCollection, periodId, contract.contractId, contract.name, periodEndDate, catalogueData, () => {
              const outputLine = bigQuery.writeToFile.mock.calls[0][0][0];
              expect(outputLine.unwanted1).toBeUndefined();
              expect(outputLine.unwanted2).toBeUndefined();
              done();
            });
          });

          describe('when lines have been returned from CostCalculator.runCalculation', () => {
            it('should call inputCollection.update with the filter, and push the contractId and periodId', (done) => {
              const expectedUpdateFilter = { $push: { calculationContractIds: contract.contractId, periodIds: periodId } };
              CostCalculator.runCostsFilter(db, bigQuery, inputs, inputCollection, periodId, contract.contractId, contract.name, periodEndDate, catalogueData, () => {
                expect(collectionUpdateManyStub).toHaveBeenCalledWith(inputs.filter, expectedUpdateFilter);
                done();
              });
            });

            it('should call bigQuery.writeToFile with an array of all the returns lines', (done) => {
              const expectedOutputLines = [{ contractName: contract.name, releaseId: releaseIds[0], trackId: trackIds[0] }];
              CostCalculator.runCostsFilter(db, bigQuery, inputs, inputCollection, periodId, contract.contractId, contract.name, periodEndDate, catalogueData, () => {
                expect(bigQuery.writeToFile).toHaveBeenCalledWith(expectedOutputLines, expect.any(Function));
                done();
              });
            });
          });

          describe('when no lines have been returned from CostCalculator.runCalculation', () => {
            it('should not call inputCollection.update', (done) => {
              CostCalculator.runCalculation.mockImplementation((_db, _costLine, _calc, _trackers, _periodId, _contractId, _periodEndDate, cb) => cb());
              CostCalculator.runCostsFilter(db, bigQuery, inputs, inputCollection, periodId, contract.contractId, contract.name, periodEndDate, catalogueData, () => {
                expect(collectionUpdateManyStub).not.toHaveBeenCalled();
                done();
              });
            });

            it('should not call bigQuery.writeToFile', (done) => {
              CostCalculator.runCalculation.mockImplementation((_db, _costLine, _calc, _trackers, _periodId, _contractId, _periodEndDate, cb) => cb());
              CostCalculator.runCostsFilter(db, bigQuery, inputs, inputCollection, periodId, contract.contractId, contract.name, periodEndDate, catalogueData, () => {
                expect(bigQuery.writeToFile).not.toHaveBeenCalled();
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('#runCalculation', () => {
    let costLine;
    let calculation;
    let escalationTrackers;
    let rechargeRate;

    beforeEach(() => {
      costLine = {
        name: randomString(),
        date: randomDate(),
        _id: randomId(),
        amount: randomInt(),
      };
      calculation = { name: randomString(), objectPercentage: 10 };
      escalationTrackers = [randomString(), randomString()];
      rechargeRate = 0.99;

      jest.spyOn(CostCalculator, 'checkEscalations').mockImplementation((_costCalculator, _calc, _db, _periodId, _contractId, _costDate, _periodEndDate, cb) => cb(null, { rate: rechargeRate }));
      CostCalculator.contractEscalations = { escalationTracking: {} };
      CostCalculator.contractEscalations.escalationTracking[escalationTrackers[0]] = {};
      CostCalculator.contractEscalations.escalationTracking[escalationTrackers[1]] = {};
      CostCalculator.contract = contract;
      CostCalculator.exchangeRates = exchangeRates;
      CostCalculator.contractExchangeRate = undefined;
    });

    describe('when not passed a costLine', () => {
      it('should return an error to the callback', (done) => {
        costLine = null;
        CostCalculator.runCalculation(db, costLine, calculation, escalationTrackers, periodId, contract.contractId, periodEndDate, (err) => {
          expect(err).toBe('Requires a costLine, calculation, periodId and contractId');
          done();
        });
      });
    });

    describe('when not passed a calculation', () => {
      it('should return an error to the callback', (done) => {
        calculation = null;
        CostCalculator.runCalculation(db, costLine, calculation, escalationTrackers, periodId, contract.contractId, periodEndDate, (err) => {
          expect(err).toBe('Requires a costLine, calculation, periodId and contractId');
          done();
        });
      });
    });

    describe('when not passed a periodId', () => {
      it('should return an error to the callback', (done) => {
        periodId = null;
        CostCalculator.runCalculation(db, costLine, calculation, escalationTrackers, periodId, contract.contractId, periodEndDate, (err) => {
          expect(err).toBe('Requires a costLine, calculation, periodId and contractId');
          done();
        });
      });
    });

    describe('when not passed a contractId', () => {
      it('should return an error to the callback', (done) => {
        contract.contractId = null;
        CostCalculator.runCalculation(db, costLine, calculation, escalationTrackers, periodId, contract.contractId, periodEndDate, (err) => {
          expect(err).toBe('Requires a costLine, calculation, periodId and contractId');
          done();
        });
      });
    });

    describe('when passed a costLine, calculation, periodId and contractId', () => {
      it('should call costCalculator.checkEscalations with the specified params', (done) => {
        const period = { _id: randomId(), escalationStartingFigures: [] };
        collectionFindOneStub.mockResolvedValue(period);
        CostCalculator.runCalculation(db, costLine, calculation, escalationTrackers, periodId, contract.contractId, periodEndDate, () => {
          expect(CostCalculator.checkEscalations).toHaveBeenCalledWith(CostCalculator, calculation, db, periodId, contract.contractId, costLine.date, periodEndDate, expect.any(Function));
          done();
        });
      });

      it('should set the costId to the costLine._id', (done) => {
        const period = { _id: randomId(), escalationStartingFigures: [] };
        collectionFindOneStub.mockResolvedValue(period);
        const expectedCostId = costLine._id;
        CostCalculator.runCalculation(db, costLine, calculation, escalationTrackers, periodId, contract.contractId, periodEndDate, (err, result) => {
          expect(result.costId).toEqual(expectedCostId);
          done();
        });
      });

      it('should set the periodId to the passed periodId', (done) => {
        const period = { _id: randomId(), escalationStartingFigures: [] };
        collectionFindOneStub.mockResolvedValue(period);
        CostCalculator.runCalculation(db, costLine, calculation, escalationTrackers, periodId, contract.contractId, periodEndDate, (err, result) => {
          expect(result.periodId).toBe(periodId);
          done();
        });
      });

      it('should set the contractId to the passed contractId', (done) => {
        const period = { _id: randomId(), escalationStartingFigures: [] };
        collectionFindOneStub.mockResolvedValue(period);
        CostCalculator.runCalculation(db, costLine, calculation, escalationTrackers, periodId, contract.contractId, periodEndDate, (err, result) => {
          expect(result.contractId).toBe(contract.contractId);
          done();
        });
      });

      it("should set the objectPercentage to the passed calculation's objectPercentage", (done) => {
        const period = { _id: randomId(), escalationStartingFigures: [] };
        collectionFindOneStub.mockResolvedValue(period);
        CostCalculator.runCalculation(db, costLine, calculation, escalationTrackers, periodId, contract.contractId, periodEndDate, (err, result) => {
          expect(result.objectPercentage).toBe(calculation.objectPercentage);
          done();
        });
      });

      it("should set the rechargeRate to the returned calculation's rate from costCalculator.checkEscalations", (done) => {
        const period = { _id: randomId(), escalationStartingFigures: [] };
        collectionFindOneStub.mockResolvedValue(period);
        CostCalculator.runCalculation(db, costLine, calculation, escalationTrackers, periodId, contract.contractId, periodEndDate, (err, result) => {
          expect(result.rechargeRate).toEqual(rechargeRate);
          done();
        });
      });

      it('should set the calculationOutput to the amount * objectPercentage/100 * rate/100', (done) => {
        const period = { _id: randomId(), escalationStartingFigures: [] };
        collectionFindOneStub.mockResolvedValue(period);
        const expectedOutput = costLine.amount * calculation.objectPercentage * 0.01 * rechargeRate * 0.01;
        CostCalculator.runCalculation(db, costLine, calculation, escalationTrackers, periodId, contract.contractId, periodEndDate, (err, result) => {
          expect(result.calculationOutput.toFixed(3)).toEqual(expectedOutput.toFixed(3));
          done();
        });
      });

      it('should set the contractCurrencyAmount to the amount * contractExchangeRate', (done) => {
        const period = { _id: randomId(), escalationStartingFigures: [] };
        collectionFindOneStub.mockResolvedValue(period);
        CostCalculator.contractExchangeRate = randomInt();
        const expectedAmount = costLine.amount * CostCalculator.contractExchangeRate;
        CostCalculator.runCalculation(db, costLine, calculation, escalationTrackers, periodId, contract.contractId, periodEndDate, (err, result) => {
          expect(result.contractCurrencyAmount).toEqual(expectedAmount);
          done();
        });
      });

      it('should set the contractCurrencyCalculationOutput to the calculationOutput * contractExchangeRate', (done) => {
        const period = { _id: randomId(), escalationStartingFigures: [] };
        collectionFindOneStub.mockResolvedValue(period);
        CostCalculator.contractExchangeRate = randomInt();
        CostCalculator.runCalculation(db, costLine, calculation, escalationTrackers, periodId, contract.contractId, periodEndDate, (err, result) => {
          expect(result.contractCurrencyCalculationOutput).toEqual(result.calculationOutput * CostCalculator.contractExchangeRate);
          done();
        });
      });

      describe('when escalationTrackers contains trackers', () => {
        it('should call update on the DB contracts collection', (done) => {
          const period = { _id: randomId(), escalationStartingFigures: [] };
          collectionFindOneStub.mockResolvedValue(period);
          CostCalculator.runCalculation(db, costLine, calculation, escalationTrackers, periodId, contract.contractId, periodEndDate, () => {
            expect(db.collection).toHaveBeenCalledWith('contracts');
            done();
          });
        });

        it('should increment the escalation by the given amount', (done) => {
          escalationTrackers = [randomString()];
          CostCalculator.contractEscalations = { escalationTracking: {} };
          CostCalculator.contractEscalations.escalationTracking[escalationTrackers[0]] = {};
          const period = { _id: randomId(), escalationStartingFigures: [] };
          period.escalationStartingFigures[0] = {
            contractId: contract.contractId,
            escalationTracking: {},
          };
          period.escalationStartingFigures[0].escalationTracking = {
            units: randomInt(),
            gross: randomInt(),
            net: randomInt(),
            grossCosts: randomInt(),
            netCosts: randomInt(),
          };
          CostCalculator.contractEscalations.escalationTracking[escalationTrackers[0]] = period.escalationStartingFigures[0].escalationTracking;
          collectionFindOneStub.mockResolvedValue(period);
          CostCalculator.contractExchangeRate = randomInt();
          const expectedEscalations = JSON.parse(JSON.stringify(period.escalationStartingFigures[0].escalationTracking));
          CostCalculator.runCalculation(db, costLine, calculation, escalationTrackers, periodId, contract.contractId, periodEndDate, (err, result) => {
            expectedEscalations.grossCosts += costLine.contractCurrencyAmount;
            expectedEscalations.netCosts += costLine.contractCurrencyCalculationOutput;
            expectedEscalations.gross -= costLine.contractCurrencyAmount;
            expectedEscalations.net -= costLine.contractCurrencyCalculationOutput;
            const expectedUpdate = { $set: { escalationStartingFigures: [{ contractId: contract.contractId, escalationTracking: {} }] } };
            expectedUpdate.$set.escalationStartingFigures[0].escalationTracking = {};
            expectedUpdate.$set.escalationStartingFigures[0].escalationTracking[escalationTrackers[0]] = expectedEscalations;
            expect(collectionUpdateOneStub).toHaveBeenCalledWith({ _id: new ObjectId(periodId) }, expectedUpdate);
            done();
          });
        });
      });
    });

    describe('Currency Conversion (SUP-3243)', () => {
      let contractId;

      beforeEach(() => {
        contractId = contract.contractId;
        CostCalculator.checkEscalations.mockRestore();
        jest.spyOn(CostCalculator, 'checkEscalations').mockImplementation((_costCalculator, calc, _db, _periodId, _contractId, _costDate, _periodEndDate, cb) => {
          cb(null, { rate: calc.rate });
        });
        CostCalculator.contractEscalations = { escalationTracking: {} };
      });

      it('should NOT apply double conversion when cost and contract currencies match', (done) => {
        const costAmount = 5000;
        const usdToEurRate = 0.839475;
        const eurToUsdRate = 1.191114;

        CostCalculator.exchangeRates = [
          { from: 'USD', to: 'Home Currency', rate: usdToEurRate },
          { from: 'Home Currency', to: 'USD', rate: eurToUsdRate },
        ];
        CostCalculator.contract = { contractCurrency: 'USD' };
        CostCalculator.contractExchangeRate = eurToUsdRate;

        costLine = { _id: new ObjectId(), currency: 'USD', amount: costAmount, type: 'Video', territory: 'GB', name: 'Test Cost', date: new Date() };
        calculation = { objectPercentage: 100, rate: 100 };
        escalationTrackers = [];
        const clientId = new ObjectId();
        const period = { _id: new ObjectId(periodId), clientId, escalationStartingFigures: [{ contractId, escalationTracking: {} }] };
        const contractDoc = { _id: new ObjectId(contractId), clientId, currency: 'USD' };
        const client = { _id: clientId, homeCurrency: 'EUR' };

        collectionFindOneStub
          .mockResolvedValueOnce(period)
          .mockResolvedValueOnce(contractDoc)
          .mockResolvedValueOnce(client);
        collectionUpdateOneStub.mockResolvedValue({ acknowledged: true });

        CostCalculator.runCalculation(db, costLine, calculation, escalationTrackers, periodId, contractId, new Date(), (err, result) => {
          try {
            expect(err).toBeFalsy();
            expect(result.calculationInput).toBeCloseTo(costAmount * usdToEurRate, 2);
            expect(result.contractCurrencyAmount).toBe(costAmount);
            expect(result.contractCurrencyCalculationOutput).toBe(costAmount);
            expect(result.contractCurrency).toBe('USD');
            done();
          } catch (error) {
            done(error);
          }
        });
      });

      it('should apply proper conversion through home currency when cost currency is different from contract currency', (done) => {
        const costAmount = 1000;
        const gbpToEurRate = 1.2;
        const eurToUsdRate = 1.1;

        CostCalculator.exchangeRates = [
          { from: 'GBP', to: 'Home Currency', rate: gbpToEurRate },
          { from: 'Home Currency', to: 'USD', rate: eurToUsdRate },
        ];
        CostCalculator.contract = { contractCurrency: 'USD' };
        CostCalculator.contractExchangeRate = eurToUsdRate;

        costLine = { _id: new ObjectId(), currency: 'GBP', amount: costAmount, type: 'Marketing', territory: 'GB', name: 'Test Cost GBP', date: new Date() };
        calculation = { objectPercentage: 100, rate: 100 };
        escalationTrackers = [];
        const clientId = new ObjectId();
        const period = { _id: new ObjectId(periodId), clientId, escalationStartingFigures: [{ contractId, escalationTracking: {} }] };
        const contractDoc = { _id: new ObjectId(contractId), clientId, currency: 'USD' };
        const client = { _id: clientId, homeCurrency: 'EUR' };

        collectionFindOneStub
          .mockResolvedValueOnce(period)
          .mockResolvedValueOnce(contractDoc)
          .mockResolvedValueOnce(client);
        collectionUpdateOneStub.mockResolvedValue({ acknowledged: true });

        CostCalculator.runCalculation(db, costLine, calculation, escalationTrackers, periodId, contractId, new Date(), (err, result) => {
          try {
            expect(err).toBeFalsy();
            expect(result.calculationInput).toBeCloseTo(costAmount * gbpToEurRate, 2);
            const expectedAmount = costAmount * gbpToEurRate * eurToUsdRate;
            expect(result.contractCurrencyAmount).toBeCloseTo(expectedAmount, 2);
            expect(result.contractCurrency).toBe('USD');
            done();
          } catch (error) {
            done(error);
          }
        });
      });

      it('should only convert to contract currency when cost currency is Home Currency', (done) => {
        const costAmount = 2000;
        const eurToUsdRate = 1.15;

        CostCalculator.exchangeRates = [
          { from: 'Home Currency', to: 'USD', rate: eurToUsdRate },
        ];
        CostCalculator.contract = { contractCurrency: 'USD' };
        CostCalculator.contractExchangeRate = eurToUsdRate;

        costLine = {
          _id: new ObjectId(),
          currency: 'Home Currency',
          amount: costAmount,
          type: 'Production',
          territory: 'DE',
          name: 'Test Cost EUR',
          date: new Date(),
        };
        calculation = { objectPercentage: 100, rate: 100 };
        escalationTrackers = [];
        const clientId = new ObjectId();
        const period = { _id: new ObjectId(periodId), clientId, escalationStartingFigures: [{ contractId, escalationTracking: {} }] };
        const contractDoc = { _id: new ObjectId(contractId), clientId, currency: 'USD' };
        const client = { _id: clientId, homeCurrency: 'EUR' };

        collectionFindOneStub
          .mockResolvedValueOnce(period)
          .mockResolvedValueOnce(contractDoc)
          .mockResolvedValueOnce(client);
        collectionUpdateOneStub.mockResolvedValue({ acknowledged: true });

        CostCalculator.runCalculation(db, costLine, calculation, escalationTrackers, periodId, contractId, new Date(), (err, result) => {
          try {
            expect(err).toBeFalsy();
            expect(result.calculationInput).toBe(costAmount);
            const expectedAmount = costAmount * eurToUsdRate;
            expect(result.contractCurrencyAmount).toBeCloseTo(expectedAmount, 2);
            expect(result.contractCurrency).toBe('USD');
            done();
          } catch (error) {
            done(error);
          }
        });
      });

      it('should not apply any conversion when all currencies are Home Currency', (done) => {
        const costAmount = 3000;

        CostCalculator.exchangeRates = [];
        CostCalculator.contract = { contractCurrency: 'Home Currency' };
        CostCalculator.contractExchangeRate = 1;

        costLine = { _id: new ObjectId(), currency: 'Home Currency', amount: costAmount, type: 'Licensing', territory: 'GB', name: 'Test Cost Home', date: new Date() };
        calculation = { objectPercentage: 100, rate: 100 };
        escalationTrackers = [];
        const clientId = new ObjectId();
        const period = { _id: new ObjectId(periodId), clientId, escalationStartingFigures: [{ contractId, escalationTracking: {} }] };
        const contractDoc = { _id: new ObjectId(contractId), clientId, currency: 'Home Currency' };
        const client = { _id: clientId, homeCurrency: 'GBP' };

        collectionFindOneStub
          .mockResolvedValueOnce(period)
          .mockResolvedValueOnce(contractDoc)
          .mockResolvedValueOnce(client);
        collectionUpdateOneStub.mockResolvedValue({ acknowledged: true });

        CostCalculator.runCalculation(db, costLine, calculation, escalationTrackers, periodId, contractId, new Date(), (err, result) => {
          try {
            expect(err).toBeFalsy();
            expect(result.calculationInput).toBe(costAmount);
            expect(result.contractCurrencyAmount).toBe(costAmount);
            expect(result.contractCurrency).toBe('GBP');
            done();
          } catch (error) {
            done(error);
          }
        });
      });

      it('should use zero exchange rate for missing currency', (done) => {
        const costAmount = 1500;

        CostCalculator.exchangeRates = [
          { from: 'GBP', to: 'Home Currency', rate: 1.2 },
        ];
        CostCalculator.contract = { contractCurrency: 'USD' };
        CostCalculator.contractExchangeRate = 1.1;

        costLine = { _id: new ObjectId(), currency: 'JPY', amount: costAmount, type: 'Sync', territory: 'JP', name: 'Test Cost JPY', date: new Date() };
        calculation = { objectPercentage: 100, rate: 100 };
        escalationTrackers = [];
        const clientId = new ObjectId();
        const period = { _id: new ObjectId(periodId), clientId, escalationStartingFigures: [{ contractId, escalationTracking: {} }] };
        const contractDoc = { _id: new ObjectId(contractId), clientId, currency: 'USD' };
        const client = { _id: clientId, homeCurrency: 'EUR' };

        collectionFindOneStub
          .mockResolvedValueOnce(period)
          .mockResolvedValueOnce(contractDoc)
          .mockResolvedValueOnce(client);
        collectionUpdateOneStub.mockResolvedValue({ acknowledged: true });

        CostCalculator.runCalculation(db, costLine, calculation, escalationTrackers, periodId, contractId, new Date(), (err, result) => {
          try {
            expect(err).toBeFalsy();
            expect(result.calculationInput).toBe(0);
            expect(result.contractCurrencyAmount).toBe(0);
            expect(result.contractCurrency).toBe('USD');
            done();
          } catch (error) {
            done(error);
          }
        });
      });
    });
  });

  describe('#checkEscalations', () => {
    let calculation;
    let costDate;
    let reportingDate;

    beforeEach(() => {
      calculation = { escalations: [{ escalation: 1, rate: randomFloat() }, { escalation: 2, rate: randomFloat() }] };
      costDate = randomDate();
      reportingDate = randomDate();
      const period = { _id: randomId(), escalationStartingFigures: [] };
      collectionFindOneStub.mockResolvedValue(period);
    });

    describe('when passed calculation has no escalations', () => {
      it('should return the passed calculation to the callback', (done) => {
        CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
          expect(result).toEqual(calculation);
          done();
        });
      });
    });

    describe('when passed calculation has escalations', () => {
      it('should call findOne on the DB contracts collection with the passed contractId', (done) => {
        CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, () => {
          expect(db.collection).toHaveBeenCalledWith('periods');
          expect(collectionFindOneStub).toHaveBeenCalledWith({ _id: new ObjectId(periodId) }, { clientId: 1, startDate: 1, endDate: 1, escalationStartingFigures: 1 });
          done();
        });
      });

      describe('when no costCalculator.contractEscalations is returned', () => {
        it('should return the passed calculation to the callback', (done) => {
          CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
            expect(result).toEqual(calculation);
            done();
          });
        });
      });

      describe('when costCalculator.contractEscalations is returned', () => {
        it('should process escalations and return result', (done) => {
          const period = { _id: randomId(), escalationStartingFigures: [{ contractId: contract.contractId, escalationTracking: {} }] };
          collectionFindOneStub.mockResolvedValue(period);
          CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
            expect(result).toBeDefined();
            done();
          });
        });
      });
    });
  });

  describe('#testConditions (via checkEscalations)', () => {
    let calculation;
    let costDate;
    let reportingDate;

    beforeEach(() => {
      costDate = randomDate();
      reportingDate = randomDate();
    });

    describe('when not passed an escalation', () => {
      it('should return the original calculation when escalation conditions are not met', (done) => {
        calculation = { escalations: [null], rate: randomFloat() };
        const period = { _id: randomId(), escalationStartingFigures: [{ contractId: contract.contractId, escalationTracking: {} }] };
        collectionFindOneStub.mockResolvedValue(period);
        CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
          expect(result).toEqual(calculation);
          done();
        });
      });
    });

    describe('when passed an escalation with one condition', () => {
      describe('when it has no tracker selected', () => {
        it('should return the original calculation (condition not met)', (done) => {
          calculation = { escalations: [{ conditions: [{ condition: true }], rate: randomFloat() }] };
          const period = { _id: randomId(), escalationStartingFigures: [{ contractId: contract.contractId, escalationTracking: {} }] };
          collectionFindOneStub.mockResolvedValue(period);
          CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
            expect(result).toEqual(calculation);
            done();
          });
        });
      });

      describe('when it has Cost Date as escalationTracker and date of the costLine is before the selected date', () => {
        it('should return the original calculation (condition not met)', (done) => {
          calculation = { escalations: [{ conditions: [{ escalationTracker: 'Cost Date', threshold: moment(costDate).add(1, 'day').format() }], rate: randomFloat() }] };
          const period = { _id: randomId(), escalationStartingFigures: [{ contractId: contract.contractId, escalationTracking: {} }] };
          collectionFindOneStub.mockResolvedValue(period);
          CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
            expect(result).toEqual(calculation);
            done();
          });
        });
      });

      describe('when it has Cost Date as escalationTracker and date of the costLine is after the selected date', () => {
        it('should return the escalation (condition met)', (done) => {
          const escalationRate = randomFloat();
          calculation = { escalations: [{ conditions: [{ escalationTracker: 'Cost Date', threshold: moment(costDate).subtract(1, 'day').format() }], rate: escalationRate }] };
          const period = { _id: randomId(), escalationStartingFigures: [{ contractId: contract.contractId, escalationTracking: {} }] };
          collectionFindOneStub.mockResolvedValue(period);
          CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
            expect(result.rate).toBe(escalationRate);
            done();
          });
        });
      });

      describe('when it has Reporting Date as escalationTracker and passed reporting date is before the selected date', () => {
        it('should return the original calculation (condition not met)', (done) => {
          calculation = { escalations: [{ conditions: [{ escalationTracker: 'Reporting Date', threshold: moment(reportingDate).add(1, 'day').format() }], rate: randomFloat() }] };
          const period = { _id: randomId(), escalationStartingFigures: [{ contractId: contract.contractId, escalationTracking: {} }] };
          collectionFindOneStub.mockResolvedValue(period);
          CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
            expect(result).toEqual(calculation);
            done();
          });
        });
      });

      describe('when it has Reporting Date as escalationTracker and passed reporting date is after the selected date', () => {
        it('should return the escalation (condition met)', (done) => {
          const escalationRate = randomFloat();
          calculation = { escalations: [{ conditions: [{ escalationTracker: 'Reporting Date', threshold: moment(reportingDate).subtract(1, 'day').format() }], rate: escalationRate }] };
          const period = { _id: randomId(), escalationStartingFigures: [{ contractId: contract.contractId, escalationTracking: {} }] };
          collectionFindOneStub.mockResolvedValue(period);
          CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
            expect(result.rate).toBe(escalationRate);
            done();
          });
        });
      });

      describe('when it has an Escalation Tracker as escalationTracker', () => {
        describe('and Units and Greater Than are selected', () => {
          it("should return original calculation when the tracker's units are less than the threshold", (done) => {
            calculation = { escalations: [{ conditions: [{ escalationTracker: 'Escalation Tracker', threshold: 10, thresholdType: 'units', when: 'Greater Than' }], rate: randomFloat() }] };
            const contractEscalations = { contractId: contract.contractId, escalationTracking: { 'Escalation Tracker': { units: 9 } } };
            const period = { _id: randomId(), escalationStartingFigures: [contractEscalations] };
            collectionFindOneStub.mockResolvedValue(period);
            CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
              expect(result).toEqual(calculation);
              done();
            });
          });

          it("should return original calculation when the tracker's units are more than the threshold with Less Than", (done) => {
            calculation = { escalations: [{ conditions: [{ escalationTracker: 'Escalation Tracker', threshold: 10, thresholdType: 'units', when: 'Less Than' }], rate: randomFloat() }] };
            const contractEscalations = { contractId: contract.contractId, escalationTracking: { 'Escalation Tracker': { units: 11 } } };
            const period = { _id: randomId(), escalationStartingFigures: [contractEscalations] };
            collectionFindOneStub.mockResolvedValue(period);
            CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
              expect(result).toEqual(calculation);
              done();
            });
          });
        });

        describe('and Units and Less Than are selected', () => {
          it("should return the escalation when the tracker's units are less than the threshold", (done) => {
            const escalationRate = randomFloat();
            calculation = { escalations: [{ conditions: [{ escalationTracker: 'Escalation Tracker', threshold: 10, thresholdType: 'units', when: 'Less Than' }], rate: escalationRate }] };
            const contractEscalations = { contractId: contract.contractId, escalationTracking: { 'Escalation Tracker': { units: 9 } } };
            const period = { _id: randomId(), escalationStartingFigures: [contractEscalations] };
            collectionFindOneStub.mockResolvedValue(period);
            CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
              expect(result.rate).toBe(escalationRate);
              done();
            });
          });

          it("should return original calculation when the tracker's units are more than the threshold", (done) => {
            calculation = { escalations: [{ conditions: [{ escalationTracker: 'Escalation Tracker', threshold: 10, thresholdType: 'units', when: 'Less Than' }], rate: randomFloat() }] };
            const contractEscalations = { contractId: contract.contractId, escalationTracking: { 'Escalation Tracker': { units: 11 } } };
            const period = { _id: randomId(), escalationStartingFigures: [contractEscalations] };
            collectionFindOneStub.mockResolvedValue(period);
            CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
              expect(result).toEqual(calculation);
              done();
            });
          });
        });

        describe('and Gross Amount and Greater Than are selected', () => {
          it("should return original calculation when the tracker's Gross Amount is less than the threshold", (done) => {
            calculation = { escalations: [{ conditions: [{ escalationTracker: 'Escalation Tracker', threshold: 10, thresholdType: 'gross', when: 'Greater Than' }], rate: randomFloat() }] };
            const contractEscalations = { contractId: contract.contractId, escalationTracking: { 'Escalation Tracker': { gross: 9 } } };
            const period = { _id: randomId(), escalationStartingFigures: [contractEscalations] };
            collectionFindOneStub.mockResolvedValue(period);
            CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
              expect(result).toEqual(calculation);
              done();
            });
          });

          it("should return the escalation when the tracker's Gross Amount is more than the threshold", (done) => {
            const escalationRate = randomFloat();
            calculation = { escalations: [{ conditions: [{ escalationTracker: 'Escalation Tracker', threshold: 10, thresholdType: 'gross', when: 'Greater Than' }], rate: escalationRate }] };
            const contractEscalations = { contractId: contract.contractId, escalationTracking: { 'Escalation Tracker': { gross: 11 } } };
            const period = { _id: randomId(), escalationStartingFigures: [contractEscalations] };
            collectionFindOneStub.mockResolvedValue(period);
            CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
              expect(result.rate).toBe(escalationRate);
              done();
            });
          });
        });

        describe('and Gross Amount and Less Than are selected', () => {
          it("should return the escalation when the tracker's Gross Amount is less than the threshold", (done) => {
            const escalationRate = randomFloat();
            calculation = { escalations: [{ conditions: [{ escalationTracker: 'Escalation Tracker', threshold: 10, thresholdType: 'gross', when: 'Less Than' }], rate: escalationRate }] };
            const contractEscalations = { contractId: contract.contractId, escalationTracking: { 'Escalation Tracker': { gross: 9 } } };
            const period = { _id: randomId(), escalationStartingFigures: [contractEscalations] };
            collectionFindOneStub.mockResolvedValue(period);
            CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
              expect(result.rate).toBe(escalationRate);
              done();
            });
          });

          it("should return original calculation when the tracker's Gross Amount is more than the threshold", (done) => {
            calculation = { escalations: [{ conditions: [{ escalationTracker: 'Escalation Tracker', threshold: 10, thresholdType: 'gross', when: 'Less Than' }], rate: randomFloat() }] };
            const contractEscalations = { contractId: contract.contractId, escalationTracking: { 'Escalation Tracker': { gross: 11 } } };
            const period = { _id: randomId(), escalationStartingFigures: [contractEscalations] };
            collectionFindOneStub.mockResolvedValue(period);
            CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
              expect(result).toEqual(calculation);
              done();
            });
          });
        });

        describe('and Net Amount and Greater Than are selected', () => {
          it("should return original calculation when the tracker's Net Amount is less than the threshold", (done) => {
            calculation = { escalations: [{ conditions: [{ escalationTracker: 'Escalation Tracker', threshold: 10, thresholdType: 'netAmount', when: 'Greater Than' }], rate: randomFloat() }] };
            const contractEscalations = { contractId: contract.contractId, escalationTracking: { 'Escalation Tracker': { netamount: 9 } } };
            const period = { _id: randomId(), escalationStartingFigures: [contractEscalations] };
            collectionFindOneStub.mockResolvedValue(period);
            CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
              expect(result).toEqual(calculation);
              done();
            });
          });

          it("should return the escalation when the tracker's Net Amount is more than the threshold", (done) => {
            const escalationRate = randomFloat();
            calculation = { escalations: [{ conditions: [{ escalationTracker: 'Escalation Tracker', threshold: 10, thresholdType: 'netAmount', when: 'Greater Than' }], rate: escalationRate }] };
            const contractEscalations = { contractId: contract.contractId, escalationTracking: { 'Escalation Tracker': { netamount: 11 } } };
            const period = { _id: randomId(), escalationStartingFigures: [contractEscalations] };
            collectionFindOneStub.mockResolvedValue(period);
            CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
              expect(result.rate).toBe(escalationRate);
              done();
            });
          });
        });

        describe('and Net Amount and Less Than are selected', () => {
          it("should return the escalation when the tracker's Net Amount is less than the threshold", (done) => {
            const escalationRate = randomFloat();
            calculation = { escalations: [{ conditions: [{ escalationTracker: 'Escalation Tracker', threshold: 10, thresholdType: 'netAmount', when: 'Less Than' }], rate: escalationRate }] };
            const contractEscalations = { contractId: contract.contractId, escalationTracking: { 'Escalation Tracker': { netamount: 9 } } };
            const period = { _id: randomId(), escalationStartingFigures: [contractEscalations] };
            collectionFindOneStub.mockResolvedValue(period);
            CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
              expect(result.rate).toBe(escalationRate);
              done();
            });
          });

          it("should return original calculation when the tracker's Net Amount is more than the threshold", (done) => {
            calculation = { escalations: [{ conditions: [{ escalationTracker: 'Escalation Tracker', threshold: 10, thresholdType: 'netAmount', when: 'Less Than' }], rate: randomFloat() }] };
            const contractEscalations = { contractId: contract.contractId, escalationTracking: { 'Escalation Tracker': { netamount: 11 } } };
            const period = { _id: randomId(), escalationStartingFigures: [contractEscalations] };
            collectionFindOneStub.mockResolvedValue(period);
            CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
              expect(result).toEqual(calculation);
              done();
            });
          });
        });
      });
    });

    describe('when passed an escalation with more than one condition', () => {
      describe('when one has no tracker selected', () => {
        it('should return the original calculation', (done) => {
          calculation = { escalations: [{ conditions: [{}, { escalationTracker: 'Cost Date' }], rate: randomFloat() }] };
          const period = { _id: randomId(), escalationStartingFigures: [{ contractId: contract.contractId, escalationTracking: {} }] };
          collectionFindOneStub.mockResolvedValue(period);
          CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
            expect(result).toEqual(calculation);
            done();
          });
        });
      });

      describe('when one has Cost Date as escalationTracker and date of the costLine is before the selected date', () => {
        it('should return the original calculation', (done) => {
          calculation = {
            escalations: [{
              conditions: [
                { escalationTracker: 'Cost Date', threshold: moment(costDate).subtract(1, 'day').format() },
                { escalationTracker: 'Cost Date', threshold: moment(costDate).add(1, 'day').format() },
              ],
              rate: randomFloat(),
            }],
          };
          const period = { _id: randomId(), escalationStartingFigures: [{ contractId: contract.contractId, escalationTracking: {} }] };
          collectionFindOneStub.mockResolvedValue(period);
          CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
            expect(result).toEqual(calculation);
            done();
          });
        });
      });

      describe('when one has Reporting Date as escalationTracker and passed reporting date is before the selected date', () => {
        it('should return the original calculation', (done) => {
          calculation = {
            escalations: [{
              conditions: [
                { escalationTracker: 'Cost Date', threshold: moment(costDate).subtract(1, 'day').format() },
                { escalationTracker: 'Reporting Date', threshold: moment(reportingDate).add(1, 'day').format() },
              ],
              rate: randomFloat(),
            }],
          };
          const period = { _id: randomId(), escalationStartingFigures: [{ contractId: contract.contractId, escalationTracking: {} }] };
          collectionFindOneStub.mockResolvedValue(period);
          CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
            expect(result).toEqual(calculation);
            done();
          });
        });
      });

      describe('when one has an Escalation Tracker as escalationTracker which is passed the threshold', () => {
        it('should return the original calculation', (done) => {
          calculation = {
            escalations: [{
              conditions: [
                { escalationTracker: 'Escalation Tracker', threshold: 10, thresholdType: 'netAmount', when: 'Greater Than' },
                { escalationTracker: 'Escalation Tracker', threshold: 12, thresholdType: 'netAmount', when: 'Greater Than' },
              ],
              rate: randomFloat(),
            }],
          };
          const contractEscalations = { contractId: contract.contractId, escalationTracking: { 'Escalation Tracker': { netamount: 11 } } };
          const period = { _id: randomId(), escalationStartingFigures: [contractEscalations] };
          collectionFindOneStub.mockResolvedValue(period);
          CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
            expect(result).toEqual(calculation);
            done();
          });
        });
      });

      describe('when both escalation conditions pass', () => {
        it('should return the escalation', (done) => {
          const escalationRate = randomFloat();
          calculation = {
            escalations: [{
              conditions: [
                { escalationTracker: 'Escalation Tracker', threshold: 10, thresholdType: 'netAmount', when: 'Greater Than' },
                { escalationTracker: 'Escalation Tracker', threshold: 9, thresholdType: 'netAmount', when: 'Greater Than' },
              ],
              rate: escalationRate,
            }],
          };
          const contractEscalations = { contractId: contract.contractId, escalationTracking: { 'Escalation Tracker': { netamount: 11 } } };
          const period = { _id: randomId(), escalationStartingFigures: [contractEscalations] };
          collectionFindOneStub.mockResolvedValue(period);
          CostCalculator.checkEscalations(CostCalculator, calculation, db, periodId, contract.contractId, costDate, reportingDate, (err, result) => {
            expect(result.rate).toBe(escalationRate);
            done();
          });
        });
      });
    });
  });

  describe('#setCatalogueData', () => {
    describe('when not passed a costLine', () => {
      it('should return null', () => {
        const result = CostCalculator.setCatalogueData(null, catalogueData);
        expect(result).toBe(null);
      });
    });

    describe('when passed a costLine', () => {
      describe('and costLine has a releaseId that is included in the catalogueData', () => {
        it('should set each of the params from the catalogueData item on costLine', () => {
          const releaseId = randomId();
          catalogueData = { releases: {} };
          catalogueData.releases[releaseId] = { title: 'Release', releaseDate: randomDate() };
          const costLine = { releaseId };
          const result = CostCalculator.setCatalogueData(costLine, catalogueData);
          expect(result.releaseId).toBe(releaseId);
          expect(result.title).toBe(catalogueData.releases[releaseId].title);
          expect(result.releaseDate).toBe(catalogueData.releases[releaseId].releaseDate);
        });
      });

      describe('and costLine has a releaseId that is NOT included in the catalogueData', () => {
        it('should not change the costLine', () => {
          const releaseId = randomId();
          catalogueData = { releases: {} };
          catalogueData.releases[randomId()] = { title: 'Release', releaseDate: randomDate() };
          const costLine = { releaseId };
          const result = CostCalculator.setCatalogueData(costLine, catalogueData);
          expect(result).toEqual({ releaseId });
        });
      });

      describe('and costLine has a trackId that is included in the catalogueData', () => {
        it('should set each of the params from the catalogueData item on costLine', () => {
          const trackId = randomId();
          catalogueData = { tracks: {} };
          catalogueData.tracks[trackId] = { title: 'Track', releaseDate: randomDate() };
          const costLine = { trackId };
          const result = CostCalculator.setCatalogueData(costLine, catalogueData);
          expect(result.trackId).toBe(trackId);
          expect(result.title).toBe(catalogueData.tracks[trackId].title);
          expect(result.trackDate).toBe(catalogueData.tracks[trackId].trackDate);
        });
      });

      describe('and costLine has a trackId that is NOT included in the catalogueData', () => {
        it('should not change the costLine', () => {
          const trackId = randomId();
          catalogueData = { tracks: {} };
          catalogueData.tracks[randomId()] = { title: 'Track', releaseDate: randomDate() };
          const costLine = { trackId };
          const result = CostCalculator.setCatalogueData(costLine, catalogueData);
          expect(result).toEqual({ trackId });
        });
      });

      describe('and costLine has a workId that is included in the catalogueData', () => {
        it('should set each of the params from the catalogueData item on costLine', () => {
          const workId = randomId();
          catalogueData = { works: {} };
          catalogueData.works[workId] = { title: 'Work', releaseDate: randomDate() };
          const costLine = { workId };
          const result = CostCalculator.setCatalogueData(costLine, catalogueData);
          expect(result.workId).toBe(workId);
          expect(result.title).toBe(catalogueData.works[workId].title);
          expect(result.workDate).toBe(catalogueData.works[workId].workDate);
        });
      });

      describe('and costLine has a workId that is NOT included in the catalogueData', () => {
        it('should not change the costLine', () => {
          const workId = randomId();
          catalogueData = { works: {} };
          catalogueData.works[randomId()] = { title: 'Work', releaseDate: randomDate() };
          const costLine = { workId };
          const result = CostCalculator.setCatalogueData(costLine, catalogueData);
          expect(result).toEqual({ workId });
        });
      });
    });
  });
});
