require('dotenv').config();
require('../models/db');
const { eachLimit } = require('async');
const Transaction = require('../models/transaction');
const Statement = require('../models/statement');

/*
This script is searching for all transactions of client 
then checking if transaction statement is assigned and exists
and if statement does not exist but is assigned - it removes transaction
*/

const main = async () => {
    const clientId = '64d4b1346b0b7fb1ffda1714';
    const transactions = await Transaction.find({ clientId }); //.limit(10);
    console.log(`Number of transactions - ${transactions.length}`);

    let counter = 1;
    await eachLimit(transactions, 20, async (transaction) => {
        counter += 1;
        console.log(`Statement counter - ${counter}/${transactions.length}`);
        if (transaction?.statementId) {
            const statement = await Statement.findById(transaction.statementId);
            if (!statement) {
                console.log('removing transaction');
                await transaction.deleteOne();
            }
        }
    });

    console.log('script complete');
};

main();
