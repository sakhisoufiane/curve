/* eslint-disable @typescript-eslint/no-var-requires */

const SeparatedSalesTerms = require('./separatedSalesTerms/index.js');
const SeparatedMechanicalTerms = require('./separatedMechanicalTerms/index.js');
const SeparatedMechanicalContractTerms = require('./separatedMechanicalContractTerms/index.js');
const SeparatedCostsTerms = require('./separatedCostsTerms/index.js');
const SeparatedDeductionTerms = require('./separatedDeductionTerms/index.js');
const SeperatedWithholdingTaxTerms = require('./separatedWithholdingTaxTerms/index.js');

const ContractTerms = {
  forCalcualtion: async (contract) => {
    const contractTerms = { contractId: contract._id.toString(), name: contract.name, partitionNo: contract.partitionNo };

    const deductionTerms = await  SeparatedDeductionTerms.get(contract);
    
    let salesTerms;
    if (contract.contractType === 'Mechanical') {
      salesTerms = await SeparatedMechanicalContractTerms.get(contract);
    } else {
      salesTerms = await SeparatedSalesTerms.get(contract);
    }

    const withholdingTaxTerms = await SeperatedWithholdingTaxTerms.get(contract);
    
    const mechanicalTerms = await SeparatedMechanicalTerms.get(contract);

    contractTerms.terms = {
      contractCurrency: contract.currency,
      sales: salesTerms.map((term) => { if (['Release', 'Track', 'Work', 'Contract', 'All', ''].includes(term.catType) || !term.catType) { return term; } }).filter(Boolean),
      deductions: deductionTerms.map((term) => { if (['Release', 'Track', 'Work', 'Contract', 'All', ''].includes(term.catType) || !term.catType) { return term; } }).filter(Boolean),
      withholdingTaxes: withholdingTaxTerms,
      mechanicalContracts: mechanicalTerms.map((term) => { if (['Release', 'Track', 'Work', 'Contract', 'All', ''].includes(term.catType) || !term.catType) { return term; } }).filter(Boolean),
      mechanicalAmount: 0,
    };

    return contractTerms;
  },
  forCostsCalculation: async (contract, accountingPeriod) => {
    if (contract.active === true && contract.accountingPeriod === accountingPeriod) {
      const costsTerms = await SeparatedCostsTerms.get(contract);
      const data = [{
        objectPercentage: 100, contractId: contract._id.toString(), name: contract.name, contractCurrency: contract.currency, terms: costsTerms,
      }];
      return data;
      
    }
  },
};

module.exports = ContractTerms;
