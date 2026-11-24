const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const async = require('async');
const moment = require('moment');

module.exports = {
  byContract(contract, db, bigQuery, costsDatabaseTable, periodId, filter, periodEndDate, catalogueData, exchangeRates, callback) {
    const CostCalculator = this;
    this.exchangeRates = exchangeRates;
    this.contract = contract;
    // Set contract exchange rate
    CostCalculator.contractExchangeRate = CostCalculator.contract?.contractCurrency === 'Home Currency' ? 1 : 0;
    exchangeRates.forEach((ex) => {
      if (ex && ex.from === 'Home Currency' && ex.to === CostCalculator.contract.contractCurrency) {
        CostCalculator.contractExchangeRate = ex.rate;
      }
    });

    if (contract && db && costsDatabaseTable && periodId && filter) {
      // Setup collections for reading and writing
      const inputCollection = db.collection(costsDatabaseTable);
      // Create objects for filtering and calculating royalties - should order in most specific to least specific
      CostCalculator.createFilterAndCalculations(contract, periodId, filter, (err, specificFilters) => {
        if (err) {
          logger.error(err);
          callback(err);
        } else {
          // Loop through each filter
          async.eachSeries(specificFilters, (costFilter, eachCb) => {
            CostCalculator.runCostsFilter(db, bigQuery, costFilter, inputCollection, periodId, contract.contractId, contract.name, periodEndDate, catalogueData, eachCb);
          }, callback);
        }
      });
    } else {
      callback('Requires a contract, costsDatabaseTable, periodId and filter to be passed');
    }
  },
  createFilterAndCalculations(contract, periodId, filter, callback) {
    // Returns an array, most specific first
    const CostCalculator = this;
    if (contract && contract.terms && filter) {
      // Organise terms ready for filtering
      CostCalculator.organiseTerms(contract);
      const output = [];
      // Loop through terms
      async.eachSeries(contract.terms, (term, cb) => {
        if (term) {
          const obj = CostCalculator.createCostFilterAndCalculation(term, contract.objectPercentage, periodId, filter);
          output.push(obj);
        }
        cb();
      }, () => {
        callback(null, output);
      });
    } else {
      callback('Requires a contract with terms and a filter');
    }
  },
  createCostFilterAndCalculation(term, objectPercentage, periodId, filter) {
    // Returns an object with a filter and calculation element - { filter: { salesFileId: $in: ["123", "234"], territory: "GB" }, calculation: { type: "Net Receipts", rate: 12, reserve: 50, unitRate: 12.45 } }
    return {
      filter: this.createFilter(term, periodId, filter),
      calculation: this.createCalculation(term, objectPercentage),
      escalationTrackers: term.escalationTrackers,
    };
  },
  createFilter(object, periodId, filter) {
    const output = JSON.parse(JSON.stringify(filter));
    if (object && object.territory && object.territory !== 'WW') { output.territory = { $in: this.continentToTerritories(object.territory) }; }
    if (object && Array.isArray(object.type)) {
      output.type = { $in: object.type };
    } else if (object && object.type) {
      output.type = object.type;
    }
    return output;
  },
  continentToTerritories(territory) {
    if (territory === 'Africa') { return ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SH', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW']; }
    if (territory === 'Americas') { return ['AW', 'CW', 'AI', 'AG', 'AR', 'BS', 'BB', 'BZ', 'BM', 'BO', 'BQ', 'BR', 'VG', 'CA', 'KY', 'CL', 'CO', 'CR', 'CU', 'CW', 'DM', 'DO', 'EC', 'SV', 'FK', 'GF', 'GL', 'GD', 'GP', 'GT', 'GY', 'HT', 'HN', 'JM', 'MQ', 'MX', 'MS', 'AN', 'NI', 'PA', 'PY', 'PE', 'PR', 'BL', 'KN', 'LC', 'MF', 'PM', 'VC', 'SR', 'TT', 'TC', 'US', 'UY', 'VE', 'VI', 'SX']; }
    if (territory === 'Asia') { return ['AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE', 'HK', 'IN', 'ID', 'IR', 'IQ', 'IL', 'JP', 'JO', 'KZ', 'KP', 'KR', 'KW', 'KG', 'LA', 'LB', 'MO', 'MY', 'MV', 'MN', 'MM', 'NP', 'OM', 'PK', 'PS', 'PH', 'QA', 'SA', 'SG', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL', 'TR', 'TM', 'AE', 'UZ', 'VN', 'YE']; }
    if (territory === 'Europe') { return ['AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FO', 'FI', 'FR', 'DE', 'GI', 'GR', 'GG', 'VA', 'HU', 'IS', 'IE', 'IM', 'IT', 'JE', 'LV', 'LI', 'LT', 'LU', 'MK', 'MT', 'MD', 'MC', 'ME', 'XK', 'NL', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SJ', 'SE', 'CH', 'UA', 'GB', 'AX']; }
    if (territory === 'Oceania') { return ['AS', 'AQ', 'AU', 'BV', 'IO', 'CX', 'CC', 'CK', 'FJ', 'PF', 'TF', 'GU', 'HM', 'KI', 'MH', 'FM', 'NR', 'NC', 'NZ', 'NU', 'NF', 'MP', 'PW', 'PG', 'PN', 'SB', 'GS', 'TK', 'TO', 'TV', 'UM', 'VU', 'WF', 'WS']; }
    if (Array.isArray(territory)) { return territory; }
    return [territory];
  },
  createCalculation(term, objectPercentage) {
    const output = { objectPercentage };
    if (term.rate !== null && term.rate !== undefined) { output.rate = term.rate; }
    if (term.escalations) { output.escalations = term.escalations; }
    return output;
  },
  organiseTerms(contract) {
    if (contract && contract.terms) {
      // Remove 'All' or blank fields
      contract.terms.map(this.removeAllOrBlankTerms);
      // Sort terms into specificity order
      contract.terms.sort(this.sortBySpecificity);
    }
  },
  removeAllOrBlankTerms(object) {
    for (const property in object) {
      if (object.hasOwnProperty(property) && (object[property] === 'All' || object[property] === 'World')) {
        delete object[property];
      }
    }
    return object;
  },
  sortBySpecificity(object, comparison) {
    const type = compare(object.type, comparison.type);
    const specificTerritory = compare((object.territory && ['WW', 'EU', 'World', 'Africa', 'Asia', 'Americas', 'Europe', 'Oceania'].indexOf(object.territory) === -1), (comparison.territory && ['WW', 'EU', 'World', 'Africa', 'Asia', 'Americas', 'Europe', 'Oceania'].indexOf(comparison.territory) === -1));
    const specificContinent = compare((object.territory && ['Africa', 'Asia', 'Americas', 'EU', 'Europe', 'Oceania'].indexOf(object.territory) !== -1), (comparison.territory && ['Africa', 'Asia', 'Americas', 'EU', 'Europe', 'Oceania'].indexOf(comparison.territory) !== -1));
    const territory = compare(object.territory, comparison.territory);

    if (type !== 0) {
      return type;
    } if (specificTerritory !== 0) {
      return specificTerritory;
    } if (specificContinent !== 0) {
      return specificContinent;
    } if (territory !== 0) {
      return territory;
    } if (object && Object.keys(object).length > Object.keys(comparison).length) {
      return -1;
    } if (object && Object.keys(object).length < Object.keys(comparison).length) {
      return 1;
    }
    return 0;

    function compare(a, b) {
      if (a && !b) {
        return -1;
      } if (!a && b) {
        return 1;
      }
      return 0;
    }
  },
  createCostsFilterAndCalculations(sales, objectPercentage, filter, callback) {
    if (sales && objectPercentage && filter) {
      // Creates an object for each passed sales term
      // Returns an array of the objects
      const CostCalculator = this;
      const output = [];
      async.eachSeries(sales, (sale, cb) => {
        const obj = CostCalculator.createSaleFilterAndCalculation(sale, objectPercentage, filter);
        output.push(obj);
        cb();
      }, () => {
        callback(null, output);
      });
    } else {
      callback('Requires sales, an objectPercentage and a filter');
    }
  },
  runCostsFilter(db, bigQuery, inputs, inputCollection, periodId, contractId, contractName, periodEndDate, catalogueData, callback) {
    if (inputs?.filter && inputCollection && periodId) {
      // inputs is an object with two keys - filter and calculation = { filter: {}, calculation: {} }
      const CostCalculator = this;
      // Set Object IDs in filter
      if (inputs.filter && inputs.filter._id.$in) {
        inputs.filter._id.$in = inputs.filter._id.$in.map((id) => new ObjectId(id));
      }
      if (inputs.filter.releaseIds) {
        inputs.filter.releaseIds = new ObjectId(inputs.filter.releaseIds);
      } else if (inputs.filter.trackIds) {
        inputs.filter.trackIds = new ObjectId(inputs.filter.trackIds);
      } else if (inputs.filter.workIds) {
        inputs.filter.workIds = new ObjectId(inputs.filter.workIds);
      } else if (inputs.filter.contractIds) {
        inputs.filter.contractIds = new ObjectId(inputs.filter.contractIds);
      }
      inputs.filter.calculationContractIds = { $ne: contractId };
      // Find in database using filter
      inputCollection.find(inputs.filter)
        .toArray()
        .then((costsLines) => {
          const outputLines = [];
          // Loop through each line
          async.eachSeries(costsLines, (costLine, cb) => {
            // Call run calculation on each line
            CostCalculator.runCalculation(db, costLine, inputs.calculation, inputs.escalationTrackers, periodId, contractId, periodEndDate, (err, outputLine) => {
              if (err) {
                logger.error(err);
                cb(err);
              } else if (outputLine) {
                // Output line to new object
                outputLine = { ...outputLine };
                // Add contract name
                outputLine.contractName = contractName;
                // Add releaseId and trackId
                if (costLine.releaseIds && costLine.releaseIds[0]) {
                  outputLine.releaseId = String(costLine.releaseIds[0]);
                }
                if (costLine.trackIds && costLine.trackIds[0]) {
                  outputLine.trackId = String(costLine.trackIds[0]);
                }
                // Overwrite Catalogue Data
                outputLine = CostCalculator.setCatalogueData(outputLine, catalogueData);
                // Remove any fields not required in the output
                const allowedFields = ['periodId', 'contractId', 'costId', 'contractName', 'type', 'name', 'invoiceNo', 'description', 'date', 'amount', 'territory', 'objectPercentage', 'rechargeRate', 'calculationInput', 'calculationOutput', 'releaseId', 'trackId', 'catalogueReleaseTitle', 'catalogueReleaseVersion', 'catalogueReleaseArtist', 'catalogueReleaseLabel', 'catalogueCatNo', 'catalogueBarcode', 'catalogueReleaseForeignId', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'catalogueTrackLabel', 'catalogueIsrc', 'catalogueTrackForeignId', 'contractCurrencyAmount', 'contractCurrencyCalculationOutput', 'contractCurrency'];
                Object.keys(outputLine).forEach((key) => {
                  if (!allowedFields.includes(key)) {
                    delete outputLine[key];
                  } else if (key === 'date') {
                    outputLine.date = moment(outputLine.date).format('YYYY-MM-DD');
                    if (outputLine.date === 'Invalid date') {
                      delete outputLine.date;
                    }
                  }
                });
                // Add output of calculation to array
                outputLines.push(outputLine);
                cb();
              } else {
                cb();
              }
            });
          }, (err) => {
            if (err) { logger.error(err); }
            if (outputLines.length > 0) {
              async.waterfall([
                function (waterfallCb) {
                  // Update inputs
                  inputCollection.updateMany(inputs.filter, { $push: { calculationContractIds: contractId, periodIds: periodId } }).then(() => waterfallCb()).catch(waterfallCb);
                },
                function (waterfallCb) {
                  // Write to output
                  bigQuery.writeToFile(outputLines, (err) => {
                    waterfallCb(err);
                  });
                },
              ], callback);
            } else {
              callback();
            }
          });
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    } else {
      callback('Requires inputs, inputCollection and periodId');
    }
  },
  runCalculation(db, costLine, calculation, escalationTrackers, periodId, contractId, periodEndDate, callback) {
    const costCalculator = this;
    // calculation = { objectPercentage: 50, unitRate: 1.23, rate: 12.5, reserve: 50 }
    if (costLine && calculation && periodId && contractId) {
      async.waterfall([
        function (cb) {
          costCalculator.checkEscalations(costCalculator, calculation, db, periodId, contractId, costLine.date, periodEndDate, cb);
        },
        function (chosenCalculation, cb) {
          // Update object - set old ID to salesLineId and delete ID
          costLine.costId = costLine._id;
          costLine.periodId = periodId;
          costLine.contractId = contractId;
          costLine.objectPercentage = calculation.objectPercentage;
          costLine.rechargeRate = chosenCalculation.rate;
          delete costLine._id;
          // Calculation

          // Convert CostLine amount into home currency for calculationInput
          if (!costLine.currency) costLine.currency = 'Home Currency';
          let lineSpecificExRate = 1;
          const costMatchesContractCurrency = costLine.currency === costCalculator.contract?.contractCurrency
            && costLine.currency !== 'Home Currency';

          if (costLine.currency !== 'Home Currency') {
            lineSpecificExRate = 0;
            if (costCalculator.exchangeRates) {
              costCalculator.exchangeRates.forEach((ex) => {
                if (ex && ex.from === costLine.currency && ex.to === 'Home Currency') {
                  lineSpecificExRate = ex.rate;
                }
              });
            }
          }

          costLine.calculationInput = costLine.amount * lineSpecificExRate;

          costLine.calculationOutput = costLine.calculationInput * (calculation.objectPercentage / 100) * (chosenCalculation.rate / 100);
          // Set in contract currency
          if (costMatchesContractCurrency) {
            // Cost already in contract currency - use original amounts directly to avoid round-trip conversion
            costLine.contractCurrencyAmount = costLine.amount;
            costLine.contractCurrencyCalculationOutput = costLine.amount * (calculation.objectPercentage / 100) * (chosenCalculation.rate / 100);
          } else {
            costLine.contractCurrencyAmount = costLine.calculationInput * costCalculator.contractExchangeRate;
            costLine.contractCurrencyCalculationOutput = costLine.calculationOutput * costCalculator.contractExchangeRate;
          }
          cb();
        },
        function (cb) {
          // Update Escalations
          async.each(escalationTrackers, (escalationTrackingName, escalationTrackingNameCb) => {
            costCalculator.contractEscalations.escalationTracking[escalationTrackingName].grossCosts = costCalculator.contractEscalations.escalationTracking[escalationTrackingName].grossCosts || 0;
            costCalculator.contractEscalations.escalationTracking[escalationTrackingName].netCosts = costCalculator.contractEscalations.escalationTracking[escalationTrackingName].netCosts || 0;

            costCalculator.contractEscalations.escalationTracking[escalationTrackingName].gross = costCalculator.contractEscalations.escalationTracking[escalationTrackingName].gross || 0;
            costCalculator.contractEscalations.escalationTracking[escalationTrackingName].net = costCalculator.contractEscalations.escalationTracking[escalationTrackingName].net || 0;

            costCalculator.contractEscalations.escalationTracking[escalationTrackingName].grossCosts += costLine.contractCurrencyAmount || 0;
            costCalculator.contractEscalations.escalationTracking[escalationTrackingName].netCosts += costLine.contractCurrencyCalculationOutput || 0;

            costCalculator.contractEscalations.escalationTracking[escalationTrackingName].gross -= costLine.contractCurrencyAmount || 0;
            costCalculator.contractEscalations.escalationTracking[escalationTrackingName].net -= costLine.contractCurrencyCalculationOutput || 0;

            escalationTrackingNameCb();
          }, cb);
        },
        function (cb) {
          // Update the period escalation starting figures to have the cost line net and gross
          db.collection('periods').findOne({ _id: new ObjectId(periodId) }, { clientId: 1, startDate: 1, endDate: 1, escalationStartingFigures: 1 }).then((period) => {
            // Find and update the starting figures for the contract
            period.escalationStartingFigures.forEach((escalations) => { if (escalations.contractId === contractId) { escalations.escalationTracking = costCalculator.contractEscalations.escalationTracking; } });
            // Update the period object
            db.collection('periods').updateOne({ _id: new ObjectId(periodId) }, { $set: { escalationStartingFigures: period.escalationStartingFigures } }).then(() => cb()).catch(cb);
          }).catch(cb);
        },
        function (cb) {
          // Add contract currency to cost csv output
          // Get contract clientId and selected currency.
          db.collection('contracts').findOne({ _id: new ObjectId(contractId) }, { clientId: 1, currency: 1 }).then((contract) => {
            if (!contract) { return cb(); }
            // Get client currency setup
            db.collection('clients').findOne({ _id: new ObjectId(contract.clientId) }).then((client) => {
              if (client) {
                if (contract.currency === 'Home Currency') {
                  costLine.contractCurrency = client.homeCurrency;
                } else {
                  costLine.contractCurrency = contract.currency;
                }
              }
              cb();
            }).catch(cb);
          }).catch(cb);
        },
      ], (err) => {
        callback(err, costLine);
      });
    } else {
      callback('Requires a costLine, calculation, periodId and contractId');
    }
  },
  checkEscalations(costCalculator, calculation, db, periodId, contractId, costDate, reportingDate, callback) {
    if (calculation.escalations) {
      db.collection('periods').findOne({ _id: new ObjectId(periodId) }, { clientId: 1, startDate: 1, endDate: 1, escalationStartingFigures: 1 }).then((period) => {
        costCalculator.contractEscalations = period.escalationStartingFigures.find((escalations) => escalations.contractId === contractId);

        if (costCalculator.contractEscalations?.escalationTracking) {
          let output;
          async.eachSeries(calculation.escalations, (escalation, escalationCb) => {
            testConditions(escalation, costDate, reportingDate, costCalculator.contractEscalations, (err, runEscalation) => {
              if (runEscalation) {
                output = escalation;
                if (output.rate !== null && output.rate !== undefined) { output.rate = Number(output.rate); }
                escalationCb();
              } else {
                escalationCb();
              }
            });
          }, (err) => {
            if (output) {
              // Return output
              callback(err, output);
            } else {
              // Else return original calculation
              callback(err, calculation);
            }
          });
        } else {
          callback(null, calculation);
        }
      }).catch(callback);
    } else {
      callback(null, calculation);
    }
  },
  setCatalogueData(costLine, catalogueData) {
    // Check if costLine exists
    if (costLine) {
      // Check if costLine has releaseId
      if (costLine.releaseId && catalogueData && catalogueData.releases) {
        // Get release from catalogue data
        const releaseData = catalogueData.releases[costLine.releaseId];
        // If release exists in data, update values
        if (releaseData) {
          Object.keys(releaseData).forEach((key) => {
            costLine[key] = releaseData[key];
          });
        }
      }
      // Check if costLine has trackId
      if (costLine.trackId && catalogueData && catalogueData.tracks) {
        // Get release from catalogue data
        const trackData = catalogueData.tracks[costLine.trackId];
        // If release exists in data, update values
        if (trackData) {
          Object.keys(trackData).forEach((key) => {
            costLine[key] = trackData[key];
          });
        }
      }
      // Check if costLine has workId
      if (costLine.workId && catalogueData && catalogueData.works) {
        // Get release from catalogue data
        const workData = catalogueData.works[costLine.workId];
        // If release exists in data, update values
        if (workData) {
          Object.keys(workData).forEach((key) => {
            costLine[key] = workData[key];
          });
        }
      }
      return costLine;
    }
    // Return original value
    return costLine;
  },
};

function testConditions(escalation, costDate, reportingDate, contract, callback) {
  let runEscalation = true;
  if (!escalation) { return callback(null, false); }
  async.eachSeries(escalation.conditions, (condition, conditionCb) => {
    // Test if escalation met
    if ((condition.escalationTracker && condition.thresholdType && condition.when && (condition.threshold || condition.threshold === 0)) || (condition.escalationTracker && condition.escalationTracker === 'Cost Date' && costDate) || (condition.escalationTracker && condition.escalationTracker === 'Reporting Date' && reportingDate)) {
      // Get value from escalation
      let currentValue;
      if (condition.escalationTracker === 'Cost Date') {
        if (condition.threshold) { condition.threshold = new Date(condition.threshold); }
        currentValue = new Date(costDate);
      } else if (condition.escalationTracker === 'Reporting Date') {
        if (condition.threshold) { condition.threshold = new Date(condition.threshold); }
        currentValue = new Date(reportingDate);
      } else if (condition.escalationTracker && condition.thresholdType && contract.escalationTracking[condition.escalationTracker]) {
        currentValue = contract.escalationTracking[condition.escalationTracker][condition.thresholdType.toLowerCase()];
      }
      // Test against model
      if ((currentValue && condition.when === 'Greater Than' && currentValue > condition.threshold) || (currentValue && condition.when === 'Less Than' && currentValue < condition.threshold)) {
        logger.info('Meets threshold');
      } else if ((condition.escalationTracker === 'Cost Date' && currentValue > condition.threshold) || (condition.escalationTracker === 'Reporting Date' && currentValue > condition.threshold)) {
        logger.info('Is after specified date');
      } else {
        runEscalation = false;
      }
      conditionCb();
    } else {
      runEscalation = false;
      conditionCb();
    }
  }, (err) => {
    callback(err, runEscalation);
  });
}
