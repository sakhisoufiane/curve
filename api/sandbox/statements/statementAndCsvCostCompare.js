require('dotenv').config();
require('../models/db');
const fs = require('fs');
const axios = require('axios').default;
const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const Statement = require('../models/statement');

const clientId = '61698b493c0fe0001f20ff0d';

/*
This script searches for statements with not matching costs data.
Comparison is made between cost data in statement object and 
costs data summed up in csv column.
*/

const getPublicLink = ({ costsCsv }) => new Promise((resolve) => {
    fileManager.publicS3Link(costsCsv, (err, publicLink) => {
        if (err) {
            resolve();
        } else {
            resolve(publicLink);
        }
    });
});

const main = async () => {
  const statements = await Statement.find({ clientId });
  console.log(`Number of statements retrieved from client -> ${statements.length}`);

  const filePath = './problematicStatements.csv';
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  fs.appendFileSync(filePath, `statementId,statementName,csvCostSum,statementCostSum\n`);

  for (let i = 0; i < statements.length; i += 1) {
    console.log(`Checking statement data No -> ${i + 1}`);

    if ((!statements[i]?.costsCsv && statements[i]?.costsCsv !== 0)
        || (!statements[i]?.grossCosts && statements[i]?.grossCosts !== 0)) {
        // if data is missing - skip the statement check
        continue;
    }

    const csvCostsLink = await getPublicLink({ costsCsv: statements[i].costsCsv });

    let response;
    try {
        // it might be not possible to get data from production when client is copied
        response = await axios.get(csvCostsLink);
    } catch (err) {}
    if (!response) { continue; }

    const csvDataLines = response?.data?.split('\n');
    const statementCostSum = statements[i].grossCosts;
    let csvCostSum = 0;
    csvDataLines.map((line) => {
      const linesArray = line.split(',');
      const cost = linesArray[linesArray.length - 5];
      if (!isNaN(cost)) {
        csvCostSum += Number(cost);
      }
    });

    if (Math.round(csvCostSum) !== Math.round(statementCostSum)) {
      fs.appendFileSync(filePath, `${statements[i]._id.toString()},${statements[i].name},${csvCostSum},${statementCostSum}\n`);
    }
  }

  console.log('script complete >>>');
};

main();
