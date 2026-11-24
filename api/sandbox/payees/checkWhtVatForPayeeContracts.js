/*
Description: checks contracts and payee data to identify contracts with payees that have applicable Withholding Tax (WHT) and VAT rates
Time To Run: 00:00:34s
Ticket No: CUR-3811
Category: Payees
Author: Joe Osborne
*/

require('dotenv').config();
require('../../models/db');
const appRootDir = require('app-root-dir').get();
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const async = require('async');
const Payee = require('../../models/payee');
const Contract = require('../../models/contract');
const Client = require('../../models/client');
const border = '********';
const log = (message) => { logger.info(`${border} ${message} ${border}`); }
const logErr = (message) => { logger.error(`${border} ${message} ${border}`); }
const contractFindLimit = 1000;
const report = [];
let round = 0;

const checkWhtVatForPayeeContracts = async (lastId) => {
  round++;
  log(`processing round ${round}`);
  let contractQuery = { selfBilling: true, deductWithholding: true, "payees.0": { $exists: true }};
  if (lastId) { contractQuery._id = { $gt: lastId } }
  
  // Projection for contracts to include only necessary fields
  const contracts = await Contract.find(contractQuery, { _id: 1, name: 1, clientId: 1, selfBilling: 1, deductWithholding: 1, payees: 1 }).limit(contractFindLimit).sort({ _id: 1 });

  await async.eachLimit(contracts, 100, async (contract) => {
    const client = await Client.findById(contract.clientId, { _id: 1, name: 1 });
    const payeeIds = contract.payees.map((payee) => payee.payeeId);
    
    // Projection for payees to include only necessary fields
    const payees = await Payee.find({ _id: { $in: payeeIds }, withholdingTaxRate: { $gt: 0 }, selfBillingTaxRate: { $gt: 0 }}, { _id: 1, name: 1, withholdingTaxRate: 1, selfBillingTaxRate: 1 });

    if (payees.length) {
      payees.forEach((payee) => {
        report.push({
          clientId: client?._id.toString(),
          clientName: client?.name,
          contractId: contract._id.toString(),
          contractName: contract.name,
          contractSelfBilling: contract.selfBilling,
          contractDeductWithholdingtax: contract.deductWithholding,
          payeeId: payee._id.toString(),
          payeeName: payee.name,
          payeeWithholdingTaxRate: payee.withholdingTaxRate,
          payeeSelfBillingTaxRate: payee.selfBillingTaxRate,
        });
      });
    }
  });
  if (contracts.length === contractFindLimit) {
    await checkWhtVatForPayeeContracts(contracts[contracts.length -1]._id)
  } else {
    await prepareReport();
  }
};

const prepareReport = async () => {
  log('Preparing report...');
  await new Promise ((resolve, reject) => {
    const outputLocation = `${appRootDir}/tmp/contractsPayeesWithWhtVat.csv`;
    const writer = new WriteCsv({
      headers: ['CLIENT ID', 'CLIENT NAME', 'CONTRACT ID', 'CONTRACT NAME', 'CONTRACT SELF BILLING', 'CONTRACT DEDUCT WITHHOLDING TAX', 'PAYEE ID', 'PAYEE NAME', 'PAYEE WITHHOLDING TAX RATE', 'PAYEE SELF BILLING TAX RATE'],
      outputLocation,
    });

    const outputData = report.map((contract) => {
      return [
        contract.clientId,
        contract.clientName,
        contract.contractId,
        contract.contractName,
        contract.contractSelfBilling,
        contract.contractDeductWithholdingtax,
        contract.payeeId,
        contract.payeeName,
        contract.payeeWithholdingTaxRate,
        contract.payeeSelfBillingTaxRate
      ];
    });
    
    writer.addData(outputData, () => {
      writer.write((err, location) => {
        if (err) reject(err);
        log(`Report written to ${location}`);
        resolve();
        process.exit(0);
      });
    });
  });
};

checkWhtVatForPayeeContracts(null);
