require("dotenv").config();
require("../../models/db");
const fs = require("fs");
const appRootDir = require('app-root-dir').get();

const STATEMENTS_JSON = 'path/to/csv/export/from/atlas';
const CLIENTS_JSON = 'path/to/csv/export/from/atlas';
const CONTRACTS_JSON = 'path/to/csv/export/from/atlas';
const PARENTS_JSON = 'path/to/csv/export/from/atlas';


const OUTPUT_FILE = `${appRootDir}/tmp/clients-revenue-report.csv`;

const generateReport = async () => {
  const statements = JSON.parse(fs.readFileSync(STATEMENTS_JSON, "utf8"));
  console.log('Processed statements');

  const clients_data = JSON.parse(fs.readFileSync(CLIENTS_JSON, "utf8"));
  const clients = new Map(clients_data.map((c) => [c._id.$oid, c]));
  console.log('Processed clients');
  
  const contracts_data = JSON.parse(fs.readFileSync(CONTRACTS_JSON, "utf8"));
  const contracts = new Map(contracts_data.map((c) => [c._id.$oid, c]));
  console.log('Processed contracts');
  
  const parents_data = JSON.parse(fs.readFileSync(PARENTS_JSON, "utf8"));
  const parents = new Map(parents_data.map((p) => [p._id.$oid, p]));
  console.log('Processed parent');

  const writeStream = fs.createWriteStream(OUTPUT_FILE);
  writeStream.write('Parent ID, Parent Name, Client ID, Client Name, Contract ID, Contract Name, Accounting Period, Net Amount, Currency\n');
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const client = clients.get(statement.clientId);
    const contract = contracts.get(statement.contractId);
    const parent = client && parents.get(client.parentId);
    
    writeStream.write(`${client?.parentId?.replaceAll(',', '') || ''},${parent?.name?.replaceAll(',', '').replaceAll('+', '') || ''},${statement.clientId},${client?.name?.replaceAll(',', '') || 'DELETED CLIENT'},${statement.contractId},${contract?.name?.replaceAll(',', '') || 'DELETED CONTRACT'},${statement.accountingPeriod},${statement.netAmount},${contract?.currency === 'Home Currency' ? client?.homeCurrency : contract?.currency}\n`);
    
    if ((i + 1) % 100000 === 0) {
      console.log(`Processed ${i + 1} / ${statements.length} statements (${((i + 1) / statements.length * 100).toFixed(1)}%)`);
    }
  }
  writeStream.end();
  await new Promise((resolve, reject) => writeStream.on('finish', resolve).on('error', reject));
};

generateReport().then(() => {
  console.log("Done generating report.");
  process.exit(0);
});
