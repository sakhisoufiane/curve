require('../models/db');
const appRootDir = require('app-root-dir').get();
const moment = require('moment');
const async = require('async');
const Contract = require('../models/contract');
const Transaction = require('../models/transaction');
const WriteCsv = require('../libs/writeCsv');

// Use ID
const stagingClientId = '61e19e681fdeb5001e83bf74';
// const clientId = '6037bb6599b637001cb54184'; // Updated with Documentary Educational Rescources LLC Prod ID

const createBalanceReport = (id) => {
    async.waterfall([
        function (cb) {
            Contract.find({ clientId: id }, (err, contracts) => {
                cb(null, contracts);
            })
        },
        function (contracts, cb) {
            const balances = [];
            async.each(contracts, (contract, contractCb) => {
                contract.getAssociatedTransactions(new Date(), (err) => {
                    console.log('contract.transactions ->', contract.transactions);
                    const balance = {
                        contractId: contract._id,
                        contractName: contract.name,
                        date: contract.transactions?.length > 0 && contract.transactions[contract.transactions.length - 1].date ? contract.transactions[contract.transactions.length - 1].date : '',
                        balance: contract.transactions.length > 0 && contract.transactions[contract.transactions.length - 1].balance ? contract.transactions[contract.transactions.length - 1].balance : 0,
                    }
                    balances.push(balance)
                    contractCb();
                })
            }, () => {
                cb(null, balances)
            });
        },
    ], (err, balances) => {

        if (err) {
            console.log(err);
        }

        // Prepare for excel
        const convertedBalances = [];
        balances.forEach(({ contractId, contractName, balance, date }) => {
            convertedBalances.push([contractId, contractName, getDate(date), balance]);
        })

        // Write to excel
        const outputTemp = `${appRootDir}/tmp/contractBalances-${moment().format('X')}.csv`;
        const writer = new WriteCsv({ headers: ['ID', 'Name', 'Date', 'Balance'], outputLocation: outputTemp });
        writer.addData(convertedBalances, () => {
            writer.write((err) => {
                if (err) {
                    console.log(err);
                }
                console.log('Output:', outputTemp);
            });
        });
    })
}

function getDate(date) {
    let formattedDate;

    if (date) {
        const yyyy = date.getFullYear();
        let mm = date.getMonth() + 1;
        let dd = date.getDate();
        formattedDate = dd + '/' + mm + '/' + yyyy;
    } else {
        formattedDate = 'No Date'
    }

    return formattedDate
}

// Run Script
createBalanceReport(stagingClientId);