const Contract = require('../models/contract');
const knex = require('../db');
const { eachLimit } = require('async');

async function syncContracts() {
  console.log('Syncing contracts');
  let exitLoop = false;
  let page = 0;
  let limit = 1000;
  let processedContracts = 0;

  while (!exitLoop) {
    console.log('Getting page ', page);
    const count = await Contract.countDocuments({ clientId: process.env.CURVE_CLIENT });
    const contracts = await Contract.find({ clientId: process.env.CURVE_CLIENT }).sort({_id: 1}).skip(page*limit).limit(limit).lean();
    
    console.log('Returned contracts:', contracts.length);

    await eachLimit(contracts, 500, async (contract) => {
        const [returnedContract] = await knex('contracts')
          .insert({ 
            contract_id: contract._id.toString(),
            name: contract.name,
            client_id: contract.clientId,
            currency: contract.currency,
            type: contract.type,
            opening_balance: contract.openingBalance,
            current_balance: contract.currentBalance,
            valid: contract.valid,
            is_main_sub_client_contract: contract.isMainSubClientContract,
            active: contract.active,
            type: contract.type,
            opening_balance: contract.openingBalance,
            current_balance: contract.currentBalance,
            valid: contract.valid,
            reserve_basis: contract.reserveBasis,
            contract_type: contract.contractType,
            min_payout: contract.minPayout,
            accounting_period: contract.accountingPeriod,
            profit_share_percentage: contract.profitSharePercentage,
            company_id: contract.companyId,
            partition_no: contract.partitionNo,
            statement_design: contract.statementDesign,
            auto_payment: contract.autoPayment,
            deduct_withholding: contract.deductWithholding,
            fees_invoice: contract.feesInvoice,
            end_date: contract.endDate,
            project_id: contract.projectId,
            self_billing: contract.selfBilling,
            start_date: contract.startDate,
            summary_contract_totals: contract.summaryContractTotals,
            payee_balance_condition: contract.payeeBalanceCondition,
    
          })
          .returning('id');
    
        const contractId = contract._id.toString();
    
        const insertPromises = [

          // contract_payees
          ...(contract.payees || []).map(payee =>
            knex('contract_payees').insert({
              contract_id: contractId,
              payee_id: payee.payeeId,
              percentage: payee.percentage
            })
          ),
        
          // contract_aliases
          ...(contract.aliases || []).map(alias =>
            knex('contract_aliases').insert({
              contract_id: contractId,
              alias
            })
          ),
        
          // contract_reserves
          ...(contract.reserves || []).map(reserve =>
            knex('contract_reserves').insert({
              contract_id: contractId,
              contract_name: reserve.contractName,
              rate: reserve.rate
            })
          ),
        
          // contract_categories
          ...(contract.contractCategories || []).map(category =>
            knex('contract_categories').insert({
              contract_id: contractId,
              category
            })
          ),
        
          // contract_auto_payment_conditions
          ...(contract.autoPaymentConditions || []).map(cond =>
            knex('contract_auto_payment_conditions').insert({
              contract_id: contractId,
              payment_contract_id: cond.contractId,
              condition: cond.condition
            })
          ),
        
          // contract_cross_contracts
          ...(contract.crossContracts || []).map(cross =>
            knex('contract_cross_contracts').insert({
              contract_id: contractId,
              cross_contract_id: cross.contractId,
              condition: cross.condition,
              process: cross.process,
              percentage: cross.percentage,
              when_auto_payment_triggered: cross.whenAutoPaymentTriggered
            })
          ),
        
          // Contract terms: invoke addTerm() concurrently
          ...(contract.salesTerms || []).map(term => addTerm(contractId, term, 'salesTerms')),
          ...(contract.deductionsTerms || []).map(term => addTerm(contractId, term, 'deductionsTerms')),
          ...(contract.costsTerms || []).map(term => addTerm(contractId, term, 'costsTerms')),
          ...(contract.mechanicalTerms || []).map(term => addTerm(contractId, term, 'mechanicalTerms')),
          ...(contract.withholdingTaxTerms || []).map(term => addTerm(contractId, term, 'withholdingTaxTerms')),
          ...(contract.mechanicalContractTerms || []).map(term => addTerm(contractId, term, 'mechanicalContractTerms'))
        
        ];
        
        // Run all insertions and term inserts in parallel
        await Promise.all(insertPromises);
        

        processedContracts += 1;
        process.stdout.write(`\rProcessed ${processedContracts}/${count} - ${((processedContracts/count)*100).toFixed(0)}%`);
    })

    
    if (!contracts.length) {
      exitLoop = true;
    } else {
      page += 1;
    }
  }

  console.log('Done syncing contracts');
}

const addTerm = async (contractId, term, termType) => {
  // Add term
  const [returnedTerm] = await knex('contract_terms').insert({ 
    contract_id: contractId, 
    term_type: termType,
    contract_name: term.contractName,
    cat_type: term.catType,
    catalogue_group: term.catalogueGroup,
    territory: term.territory,
    channel: term.channel,
    configuration: term.configuration,
    price_category: term.priceCategory,
    source: term.source,
    type: term.type,
    deduction_type: term.deductionType,
    deduction_basis: term.deductionBasis,
    rate_basis: term.rateBasis,
    rate: term.rate,
    unit_rate: term.untiRate,
    reserve: term.reserve,
    currency: term.currency,
    multiplier: term.multiplier,
    reduction_rate: term.reductionRate,
  }).returning('id');

  const termId = returnedTerm.id;

  // Add Escalation trackers
  for (const tracker of term.escalationTrackers || []) { await knex('contract_term_escalation_trackers').insert({ term_id: termId, tracker }); }
  
  // Add Escalations
  for (const escalation of term.escalations || []) {
    const [returnedEscalation] = await knex('contract_term_escalations').insert({ 
      term_id: termId, 
      rate: escalation.rate,
      type: escalation.type,
      unit_rate: escalation.unitRate,
      multiplier: escalation.multiplier,
      reduction_rate: escalation.reductionRate,
      reserve: escalation.reserve,
    }).returning('id');
  
    const escalationId = returnedEscalation.id;

    for (const condition of escalation.conditions || []) { await knex('contract_term_escalation_conditions').insert({ 
      escalation_id: escalationId,
      escalation_tracker: condition.escalationTracker,
      threshold_type: condition.thresholdType,
      when: condition.when,
      threshold: condition.threshold,
    }); }
   }
};

module.exports = syncContracts;
