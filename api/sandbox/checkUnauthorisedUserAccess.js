require('dotenv').config();
require('../models/db');

const User = require('../models/user');
const Statement = require('../models/statement');
const Contract = require('../models/contract');
const { open } = require('node:fs/promises');
const { eachLimit } = require('async');
const { ObjectId } = require('mongodb');

(async () => {
  const getSingleStatementRequests = [];
  const statementRequests = [];

  // Feb 14 4pm to 9pm
  // const data = await open('/Users/mbs/Downloads/extract-2024-02-19T17_12_14.680Z.csv');
  // Feb 11 12pm to Feb 16 11.59pm
  const data = await open('/Users/mbs/Downloads/extract-2024-02-19T17_15_42.186Z.csv');
  // const data = await open('/Users/mbs/Downloads/extract-2024-02-19T14_19_53.308Z.csv');
  for await (const line of data.readLines()) {
    const log = line.split(',');
    const url = log[3].replaceAll('"','');

    if (url.includes('statement')) {
      statementRequests.push({
        timestamp: log[0].replaceAll('"',''),
        url,
        userId: url.split('User: ')?.[1]?.split(' ')?.[0],
        isStatementRequest: url.includes('statement')
      })
    }
    // Requests to access a single statement
    if (url.includes('GET /statements/') && url.includes('detail')) {
      const request = {
        timestamp: log[0].replaceAll('"',''),
        url,
        userId: url.split('User: ')?.[1]?.split(' ')?.[0],
        statementId: url.split('GET /statements/')[1].split('/detail User: ')[0],
        isStatementRequest: url.includes('statement'),
      };

      const alreadyAdded = getSingleStatementRequests.find((existing) => existing.url === request.url)

      if (!alreadyAdded) {
        getSingleStatementRequests.push(request)
      }
    }

  }
  
  console.log(getSingleStatementRequests.length)
  
  await eachLimit(getSingleStatementRequests, 20, async (request) => {
    const user = await User.findById(request.userId).select('payeeIds email rights internal');
    if (ObjectId.isValid(request.statementId)) {
      const statement = await Statement.findById(request.statementId).select('contractId name clientId');
      if (user && statement && !user.internal) {
        const contract = await Contract.findById(statement.contractId).select('payees');
        const payeeId = contract?.payees[0]?.payeeId;
  
        if (!user.payeeIds.includes(payeeId)) {
          if (!user.rights?.[statement.clientId]?.admin && !['View', 'Edit', 'Approval'].includes(user.rights?.[statement.clientId]?.periods)) {
            console.log(`${request.timestamp},${statement.clientId},${user.email},${request.userId},${payeeId},${statement.name.replaceAll(',','')},${request.statementId},${request.url}`);
          }
        }
      }
    }
  });
  
  console.log('Done')
})();
