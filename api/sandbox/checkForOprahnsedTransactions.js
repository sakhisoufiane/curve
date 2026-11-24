const moment = require('moment');
const appRootDir = require('app-root-dir').get();;
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');

require('../models/db');
const Contract = require('../models/contract');
const Statement = require('../models/statement');
const Transaction = require('../models/transaction');
const Client = require('../models/client');
const Payment = require('../models/payment');



const run = async () => {
  let lastId;
  let recurse = true;
  const limit = 5_000;

  const orphanedTransactions = [];

  const transactionCount = await Transaction.countDocuments({
    statementId: { $exists: true },
    userCreated: false
  });
  const formattedTotalCount = transactionCount.toLocaleString('en-US');
  logger.info(`Total transactions with statementId: ${formattedTotalCount}`);

  let processedTransactionsCount = 0;
  do {
    const query = { statementId: { $exists: true }, userCreated: false };
    if (lastId) query._id = { $gt: lastId };

    const transactions = await Transaction
      .find(query)
      .select({ clientId: 1, statementId: 1, _id: 1, isPayment: 1, amount: 1, createdAt: 1, contractId: 1, name: 1 })
      .sort({ _id: 1 })
      .limit(limit)
      .lean();

    if (!transactions.length) break;


    const statementIds = transactions.map(tx => tx.statementId).filter(id => id);
    if (!statementIds.length) {
      logger.info('No statement IDs found in transactions, skipping further checks.');
      break;
    }

    const statements = await Statement
      .find({ _id: { $in: statementIds } })
      .select({ _id: 1 })
      .lean();

    const statementMap = new Map(statements.map(s => [s._id.toString(), s]));

    const clientIds = [...new Set(transactions.map(tx => tx.clientId))];
    const clients = await Client.find({ _id: { $in: clientIds } })
      .select({ _id: 1, name: 1 })
      .lean();

    const clientMap = new Map(clients.map(c => [c._id.toString(), c.name]));

    // Get Payments
    const paymentTransactions = transactions.filter(tx => tx.isPayment);
    const payments = await Payment.find({
      transactionId: { $in: paymentTransactions.map(tx => tx._id)},
      status: 'Paid'
    })
    .select({ _id: 1 })
    .lean();
    const paymentMap = new Map(payments.map(p => [p.transactionId, p.status]));
    
    const contractIds = transactions.map(tx => tx.contractId).filter(id => id);
    const contracts = await Contract.find({ _id: { $in: contractIds } }).select({ _id: 1, name: 1 }).lean();
    const contractMap = new Map(contracts.map(c => [c._id.toString(), c.name]));


    for (const transaction of transactions) {
      const contract = contractMap.get(transaction.contractId);
      const statement = statementMap.get(transaction.statementId);
      // If the statement exists, we skip this transaction
      if (statement) continue;

      orphanedTransactions.push([
        transaction._id,
        transaction.name,
        transaction.clientId,
        clientMap.get(transaction.clientId) || 'Unknown Client',
        transaction.contractId || 'N/A',
        transaction.statementId,
        transaction.isPayment ? 'Yes' : 'No',
        paymentMap.get(transaction._id.toString()),
        transaction.amount,
        moment(transaction.createdAt).format('MM-DD-YYYY'),
        contract ? contract : 'N/A'
      ]);
    }
    
    lastId = transactions[transactions.length - 1]._id;

    // Format Count
    processedTransactionsCount += transactions.length;
    
    process.stdout.write(`Processed ${processedTransactionsCount.toLocaleString('en-US')} transactions... of ${formattedTotalCount} \r`);
    
    if (transactions?.length !== limit) {
      recurse = false;
      break;
    }
  } while (recurse)
  
  process.stdout.write(`Processed ${processedTransactionsCount.toLocaleString('en-US')} transactions... Done\n`);

  const writeCsv = new WriteCsv({
    outputLocation: `${appRootDir}/tmp/orphanedTransactions.csv`,
    headers: ['Transaction ID', 'Transaction Name', 'Client ID', 'Client Name', 'Contract ID', 'Statement ID', 'Is Payment', 'Payment Status', 'Amount', 'Created At', 'Contract Exists'],
  });

  await new Promise((resolve, reject) => {
    writeCsv.addData(orphanedTransactions, () => {
      writeCsv.write((err, fileLocation) => {
        if (err) {
          logger.error(`Error writing CSV: ${err}`);
          return reject(err);
        }
        logger.info(`Orphaned transactions report written to: ${fileLocation}`);
        resolve();
      });
    });
  });
};

console.time('checkForOprahnsedTransactions');
run().then(() => {
  console.log('Done');
  console.timeEnd('checkForOprahnsedTransactions');
}).catch((err) => {
  console.error('Error:', err);
  console.timeEnd('checkForOprahnsedTransactions');
});