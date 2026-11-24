require('dotenv').config();
require('../../models/db');
const appRootDir = require('app-root-dir').get();
const _ = require('lodash');
const moment = require('moment');
const { WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const Client = require('../../models/client');
const Contract = require('../../models/contract');

const LIMIT = null;

function getClients() {
  return Client.find(
    {
      $and: [
        { name: { $not: { $regex: /QA / } } },
        { name: { $not: { $regex: /QA Test/ } } },
        { name: { $not: { $regex: /Cypress Test Client/ } } },
        { name: { $not: { $regex: /Arjun Exam/ } } },
      ],
    },
    '_id name',
  );
}

async function getContracts(clientIds) {
  const contracts = await Contract.find(
    {
      clientId: { $in: clientIds },
      active: true,
      costsTerms: {
        $exists: true,
        $ne: [],
      },
    },
    '_id createdAt updatedAt type name clientId costsTerms',
    {
      limit: LIMIT,
    },
  );
  // IF sum of unique terms (territory + type) count > 1 AND has a fallback WW:All term AND >1 unique territories
  return contracts
    // .filter((contract) => contract._id.toString() === '653abdb6d08a8a84debc5c9e')
    .filter((contract) => {
    // const firstIsWorldAll = contract.costsTerms[0].territory === 'WW' && contract.costsTerms[0].type === 'All';
      const validTerms = _.countBy(contract.costsTerms, (term) => `${term.territory}:${term.type}`);
      const count = _.sumBy(Object.values(validTerms));
      const hasDuplicateWorldAllTerms = Object.keys(validTerms).length === 1 && _.has(validTerms, 'WW:All') && count > 1;
      const hasOnlyOneTerritory = _.uniqBy(contract.costsTerms, (term) => term.territory).length === 1;

      //   console.log({ validTerms, count, hasDuplicateWorldAllTerms, hasOnlyOneTerritory });
      return count > 1 && !hasDuplicateWorldAllTerms && !hasOnlyOneTerritory;
    });
}

async function main() {
  console.log('Searching for non-test clients...');
  const clients = await getClients();
  const allClientIds = clients.map((client) => client._id.toString());

  console.log(`Checking contracts for ${allClientIds.length} clients...`);
  const contracts = await getContracts(allClientIds);

  const totalClients = clients.length;
  const affectedClients = _.uniq(contracts.map((contract) => contract.clientId)).length;

  const contractsByClientId = _.groupBy(contracts, (contract) => contract.clientId);
  let tableLog = [];
  let csvRows = [];

  for (const clientId in contractsByClientId) {
    const contractCount = contractsByClientId[clientId].length;
    const client = clients.find((client) => client._id.toString() === clientId);
    tableLog.push({ clientId, clientName: client.name, contracts: contractCount });

    const contractIdsString = contractsByClientId[clientId].map((c) => c._id.toString()).join(';');
    csvRows.push([clientId, client.name, contractCount, contractIdsString]);
  }

  // Sort outputs by most affected contracts
  tableLog = _.sortBy(tableLog, (client) => -client.contracts);
  csvRows = _.sortBy(csvRows, (client) => -client[2]);

  console.table(tableLog);
  console.log(
    `Found ${affectedClients}/${totalClients} clients with ${contracts.length} contracts that include cost terms`,
  );

  console.log('Writing output to CSV file...');
  const outputTemp = `${appRootDir}/tmp/contractsWithCostTerms-${moment().format('X')}.csv`;
  const writer = new WriteCsv({ headers: ['Client ID', 'Client Name', 'Contracts', 'Contract IDs'], outputLocation: outputTemp });
  await new Promise((resolve, reject) => {
    writer.addData(csvRows, () => {
      writer.write((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  console.log(`Finished and wrote output to ${outputTemp}`);
  process.exit();
}

try {
  main();
} catch (err) {
  console.log('Error running script');
  console.log(err);
  process.exit(-1);
}
