const async = require('async');

const SeparatedSalesTerms = require('./separatedSalesTerms');
const SeparatedMechanicalTerms = require('./separatedMechanicalTerms');
const SeparatedMechanicalContractTerms = require('./separatedMechanicalContractTerms');
const SeparatedCostsTerms = require('./separatedCostsTerms');
const SeparatedDeductionTerms = require('./separatedDeductionTerms');
const SeperatedWithholdingTaxTerms = require('./separatedWithholdingTaxTerms');

const ContractTerms = {
  forCalcualtion: (contract, callback) => {
    const contractTerms = { contractId: contract._id.toString(), name: contract.name, partitionNo: contract.partitionNo };
    async.parallel({
      deductionTerms(callback) {
        SeparatedDeductionTerms.get(contract, callback);
      },
      salesTerms(callback) {
        if (contract.contractType === 'Mechanical') {
          SeparatedMechanicalContractTerms.get(contract, callback);
        } else {
          SeparatedSalesTerms.get(contract, callback);
        }
      },
      withholdingTaxTerms(callback) {
        SeperatedWithholdingTaxTerms.get(contract, callback);
      },
      mechanicalTerms(callback) {
        SeparatedMechanicalTerms.get(contract, callback);
      },
    }, (err, results) => {
      results.salesTerms = results.salesTerms.map((term) => { if (['Release', 'Track', 'Work', 'Contract', 'All', ''].includes(term.catType) || !term.catType) { return term; } }).filter(Boolean);
      results.deductionTerms = results.deductionTerms.map((term) => { if (['Release', 'Track', 'Work', 'Contract', 'All', ''].includes(term.catType) || !term.catType) { return term; } }).filter(Boolean);
      results.mechanicalTerms = results.mechanicalTerms.map((term) => { if (['Release', 'Track', 'Work', 'Contract', 'All', ''].includes(term.catType) || !term.catType) { return term; } }).filter(Boolean);
      contractTerms.terms = {
        contractCurrency: contract.currency, sales: results.salesTerms, deductions: results.deductionTerms, withholdingTaxes: results.withholdingTaxTerms, mechanicalContracts: results.mechanicalTerms, mechanicalAmount: 0,
      };
      callback(null, contractTerms);
    });
  },
  forCostsCalculation: (contract, accountingPeriod, callback) => {
    if (contract.active === true && contract.accountingPeriod == accountingPeriod) {
      async.parallel({
        costsTerms(callback) {
          SeparatedCostsTerms.get(contract, callback);
        },
      }, (err, results) => {
        const data = [{
          objectPercentage: 100, contractId: contract._id.toString(), name: contract.name, contractCurrency: contract.currency, terms: results.costsTerms,
        }];
        callback(data);
      });
    } else {
      callback();
    }
  },
};

module.exports = ContractTerms;
