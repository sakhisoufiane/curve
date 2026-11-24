/*
Description: Check if any clients have contract term groups named All and/or territory groups with disallowed names.
Time To Run: 00:00:15s (Staging)
Ticket No: CUR-3843
Category: Clients
Author: Joe Osborne
*/
require('dotenv').config();
require('../../models/db');
const appRootDir = require('app-root-dir').get();
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const async = require('async');
const Client = require('../../models/client');
const ContractTermGroup = require('../../models/contractTermGroup');
const TerritoryGroup = require('../../models/territoryGroup');
const TerritoryGroupController = require('../../controllers/territoryGroup');
const border = '********';
const log = (message) => { logger.info(`${border} ${message} ${border}`); }
const logErr = (message) => { logger.error(`${border} ${message} ${border}`); }
const report = [];

const checkClientsContractTermsGroupsAndTerritoryGroupsNames = async () => {
  const clients = await Client.find({}, 'name _id');
  await async.eachLimit(clients, 100, async (client) => {
    const contractTermGroupNamedAll = await ContractTermGroup.findOne({ clientId: client._id.toString(), name: { $in: ['All', 'ALL', 'all'] } }, '_id name');
    if (contractTermGroupNamedAll) {
      logErr(`Client ${client.name} has a contract term group named All`);
      report.push({ clientId: client._id.toString(), clientName: client.name, type: 'Contract Term Group', _id: contractTermGroupNamedAll._id.toString(), name: contractTermGroupNamedAll.name });
    }
    const territoryGroups = TerritoryGroup.find({ clientId: client._id.toString() }, 'name');
    async.eachLimit(territoryGroups, 100, async (territoryGroup) => {
      const territoryGroupInvalidName = TerritoryGroupController.isNameDisallowed(territoryGroup.name);
      if (territoryGroupInvalidName) {
        logErr(`Client ${client.name} has a territory group with a disallowed name: ${territoryGroup.name}`);
        report.push({ clientId: client._id.toString(), clientName: client.name, type: 'Territory Group', _id: territoryGroup._id.toString(), name: territoryGroup.name });
      }
    });
  });
  writeReport();
};

const writeReport = async () => {
  const outputLocation = `${appRootDir}/tmp/clientsWithInvalidTerritoryGroupsAndOrContractTermGroups.csv`;
  const writeCsv = new WriteCsv({ headers: ['Client ID', 'Client Name', 'Type', 'ID', 'Name'], outputLocation});
  const outputData = report.map((line) => [line.clientId, line.clientName, line.type, line._id, line.name]);
  new Promise((resolve, reject) => {
    writeCsv.addData(outputData, (err) => {
      if (err) {
        logErr(`Error writing CSV: ${err}`);
      } else {
        writeCsv.write((err, location) => {
          if (err) {
            logErr(`${err}`);
            reject(err);
          } else {
            log(`Report written to: ${location}`);
            resolve();
            process.exit(0);
          }
        });
      }
    });
  })
}

checkClientsContractTermsGroupsAndTerritoryGroupsNames();
