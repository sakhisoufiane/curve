require('../../models/db');
const appRootDir = require('app-root-dir').get();;
const fs = require("fs/promises");

const Client = require('../../models/client');
const SalesTemplate = require('../../models/salesTemplate');
const SalesFile = require('../../models/salesFile');

async function getCrdFilesForClient(client) {
  const output = [];
  console.log(`Checking for Sales Templates with fileType 'CRD' for client '${client.name}'`);
  const clientId = client._id.toString();
  // stream data from BigQuery and add to suspenseSalesLines
  const salesTemplates = await SalesTemplate.find({ clientId, fileType: 'CRD' }).lean();
  if (salesTemplates.length) {
    console.log(`>> found ${salesTemplates.length} Sales Templates with fileType 'CRD' for client '${client.name}'`);
    for (const template of salesTemplates) {
      console.log(`----> Getting Sales Files using Sales Template: ${template._id}`);
      const salesFiles = await SalesFile.find({ clientId, salesTemplateId: template._id.toString() }, { _id: 1, name: 1, file: 1 }).lean();
      if (salesFiles.length) {
        console.log(`>>>> found ${salesFiles.length} Sales Files for Sales Template '${template._id}'`);
        for (const salesFile of salesFiles) {
          console.log(`------> Sales File Id: ${salesFile._id}, File Name: ${salesFile.file}`);
          output.push({
            salesFileId: salesFile._id,
            salesFilePath: salesFile.file,
          });
        }
      } else {
        console.log(`>>>> no Sales Files found for Sales Template '${template._id}'`);
      }
    }
    return output;
  }
}
  
async function checkClients({ filter }) {
  if (!filter) {
    console.error('Please provide a filter to check for Sales Files.');
    process.exit(1);
  }
  const clients = await Client.find({ ...filter, clientType: 'Publisher' }).select({ _id: 1, name: 1 }).sort({ name: 1 }).lean();
  if (!clients.length) {
    console.error(`No clients found with filter: ${JSON.stringify(filter)}`);
    process.exit(1);
  }
  const allOutput = [];
  for (const client of clients) {
    console.log(`\n==================\nProcessing client: ${client.name} (${client._id})\n--->`);
    const clientOutput = await getCrdFilesForClient(client);
    if (clientOutput?.length) {
      allOutput.push({ client: { _id: client._id, name: client.name }, salesFiles: clientOutput || [] });
    }
  }


  const outputPath = `${appRootDir}/tmp/crdFiles.json`;
  await fs.writeFile(outputPath, JSON.stringify(allOutput, null, 2));
  console.log(`\n\nAll done! Output written to: ${outputPath}\n`);
  process.exit();
}

if (process.argv[2]) {
  if (process.argv[2] === '--all') {
    console.log('------ processing ALL clients ------\n');
    checkClients({ filter: { name: { $not: /Gelo Publisher/ } } });
  } else {
    checkClients({ filter: { _id: process.argv[2] } });
  }
} else {
  console.error('Please provide a Client Id, or use --all to get Sales Files with File Type CRD');
  process.exit(1);
}
