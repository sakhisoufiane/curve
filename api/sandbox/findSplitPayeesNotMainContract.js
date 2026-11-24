require('dotenv').config();
require('../models/db');
const { eachLimit } = require('async');
const Contract = require('../models/contract');
const SubClient = require('../models/subClient');

// Set this to true for dry-run (just log what would be fixed)
// Set this to false to actually make the changes
const DRY_RUN = true;

async function findAndFixSplitContracts() {
  let count = 0;
  let fixedCount = 0;
  let errorCount = 0;
  let noMainContractCount = 0;
  let incorrectCrossContractsCount = 0;

  console.log(`${DRY_RUN ? 'DRY RUN' : 'LIVE'} mode - ${DRY_RUN ? 'no changes will be made' : 'changes will be applied'}`);

  try {
    const allSubClientContracts = await Contract.find({
      subClientId: { $exists: true, $ne: null }
    }).lean().exec();

    const contractsBySubClient = {};
    allSubClientContracts.forEach(contract => {
      if (!contractsBySubClient[contract.subClientId]) {
        contractsBySubClient[contract.subClientId] = [];
      }
      contractsBySubClient[contract.subClientId].push(contract);
    });

    console.log(`Processing ${Object.keys(contractsBySubClient).length} subClients...`);

    await eachLimit(Object.entries(contractsBySubClient), 5, async ([subClientId, contracts]) => {
      count += 1;

      try {
        const mainContract = contracts.find(c => c.isMainSubClientContract === true);
        const splitContracts = contracts.filter(c => c.isMainSubClientContract !== true);

        if (!mainContract) {
          noMainContractCount += 1;
          console.log(`No main contract found for subClient ${subClientId}`);
          return;
        }

        for (const splitContract of splitContracts) {
          const crossContractsCorrect = splitContract.crossContracts && 
            splitContract.crossContracts.length > 0 &&
            splitContract.crossContracts.some(cc => cc.contractId === mainContract._id.toString());

          if (!crossContractsCorrect) {
            incorrectCrossContractsCount += 1;

            if (DRY_RUN) {
              console.log(`Contract ${splitContract._id} (client: ${splitContract.clientId}) - Contract Name: ${splitContract.name}`);
              console.log(`  Current crossContracts:`, splitContract.crossContracts || 'none');
            } else {
              console.log(`Fixing ${splitContract.name} (${splitContract._id})`);
              await Contract.findByIdAndUpdate(splitContract._id, { 
                $set: { 
                  'crossContracts.0.contractId': mainContract._id.toString()
                } 
              });
              fixedCount += 1;
            }
          }
        }

      } catch (error) {
        errorCount += 1;
        console.log(`Error processing subClient ${subClientId}: ${error.message}`);
      }
    });

    console.log('\nSummary:');
    console.log(`SubClients processed: ${count}`);
    console.log(`SubClients without main contract: ${noMainContractCount}`);
    console.log(`Split contracts with incorrect crossContracts: ${incorrectCrossContractsCount}`);
    
    if (DRY_RUN) {
      console.log('\nDry run complete - no changes made');
    } else {
      console.log(`\nFixed ${fixedCount} contracts`);
    }

  } catch (error) {
    console.error('Script error:', error);
  } finally {
    process.exit(0);
  }
}

findAndFixSplitContracts();
