/**
 * Category: Contracts
 * Description: export CSV of escalation tracking on Contracts
 * 
 * node sandbox/contracts/createContractTrackingReport.js 
 * Please Note:
 * [clientId] = id of client to report
 * 
 * Output is a report stored in /tmp/escalationTracking.csv
 * 
 * Autor: Marco G
 * 
 * Tickets using this script: SUP-1062
 * 
 */
require('../../models/db');
const appRootDir = require('app-root-dir').get();
const moment = require('moment');
const Contract = require('../../models/contract');
const WriteCsv = require('../../libs/writeCsv');

// Use ID
const clientId = '5d6fca6a2e4bb8367ddb6fb9';

// Function
const createContractTrackingReport = async (id) => {
  try {
    const contracts = await Contract.find({
      clientId: id, 
      escalationTracking: {
        $exists: true,
        $ne: {}
      }
    }, { name: 1, escalationTracking: 1 })

    const escalationTracking = [];
    contracts.forEach(contract => {
      for (const key in contract.escalationTracking) {
        if (contract.escalationTracking.hasOwnProperty(key)) {
          const entry = contract.escalationTracking[key];
          const formattedEntry = { name: contract.name, key: key, units: entry.units, gross: entry.gross, net: entry.net };
          escalationTracking.push(formattedEntry);
        }
      }
    })

    const outputTemp = `${appRootDir}/tmp/escalationTracking-${moment().format('X')}.csv`;
    const writer = new WriteCsv({ headers: ['Contract', 'Tracking', 'Units', 'Gross', 'Net'], outputLocation: outputTemp });
    const outputData = escalationTracking.map((line) => [line.name, line.key, line.units, line.gross, line.net]);
    writer.addData(outputData, () => {
      writer.write((err) => {
        if (err) {
          console.log(err);
        }
        console.log('Output:', outputTemp);
      });
    });
  } catch (err) {
    console.log(err)
  }
}

// Run Script
createContractTrackingReport(clientId);