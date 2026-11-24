/*
Description: Check if there are any contracts that have escalation terms that are using contract term configurations.
Time To Run: 00:00:11s
Ticket No: CUR-3660
Category: Contracts
Author: Joe Osborne
*/
require('dotenv').config();
require('../../models/db');
const { ObjectId } = require('@curveroyaltysystems/models/mongoose').Types;
const Contract = require('../../models/contract');
const Client = require('../../models/client');
const { WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const appRootDir = require('app-root-dir').get();
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const border = '********';
const log = (message) => { logger.info(`${border} ${message} ${border}`); }
const logErr = (message) => { logger.error(`${border} ${message} ${border}`); }

const checkContractEscalationTermsForContractTermConfigs = async () => {
  try {
    const contracts = await Contract.find({ active: true, 'escalationEquivalents.configuration': { $exists: true, $ne: [] } }, '_id escalationEquivalents clientId name');
    const contractsUsingContractTermGroupsForEscalation = contracts.filter((contract) =>
      contract.escalationEquivalents.some((equivalent) => ObjectId.isValid(equivalent.configuration))
    );
    log(`Found ${contractsUsingContractTermGroupsForEscalation.length} contracts with escalation terms using contract term configurations.`);
    const contractsUsingContractTermGroupsForEscalationWithClientName = await Promise.all(
      contractsUsingContractTermGroupsForEscalation.map(async (contract) => {
        const client = await Client.findById(contract.clientId, 'name');
        
        const plainContract = contract.toObject();
        plainContract.clientName = client ? client.name : null;
        
        return plainContract;
      })
    );
    await prepareReport(contractsUsingContractTermGroupsForEscalationWithClientName);
  } catch (err) {
    logErr(`Error: ${err}`);
  }
};

const prepareReport = async (contracts) => {
  log('Preparing report...');
  await new Promise ((resolve, reject) => {
    const outputLocation = `${appRootDir}/tmp/contractsUsingContractTermGroupsForEscalation.csv`;
    const writer = new WriteCsv({
      headers: ['CONTRACT ID', 'CONTRACT NAME', 'CLIENT ID', 'CLIENT NAME'],
      outputLocation,
    });
    const outputData = contracts.map((contract) => {
      return [contract._id, contract.name, contract.clientId, contract.clientName];
    });
    writer.addData(outputData, () => {
      writer.write((err, location) => {
        if (err) reject(err);
        log(`Report written to ${location}`);
        resolve();
      });
    });
  });
};

checkContractEscalationTermsForContractTermConfigs();
