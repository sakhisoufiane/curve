require('../models/db');
const appRootDir = require('app-root-dir').get();
const moment = require('moment');
const Contract = require('../models/contract');
const WriteCsv = require('../libs/writeCsv');

// Use ID
const clientId = '61b714d4f9df980026714a18';

// Function
const createAliasReport = async (id) => {
  try {
    const contracts = await Contract.find({ clientId: id }, { name: 1, aliases: 1 })

    const convertedContracts = [];
    contracts.forEach(contract => {
      const aliases = contract.aliases.map((alias) => alias).join(';');
      convertedContracts.push([contract.id, contract.name, aliases]);
    })

    const outputTemp = `${appRootDir}/tmp/contractAliases-${moment().format('X')}.csv`;
    const writer = new WriteCsv({ headers: ['ID', 'Name', 'Aliases'], outputLocation: outputTemp });
    writer.addData(convertedContracts, () => {
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
createAliasReport(clientId);