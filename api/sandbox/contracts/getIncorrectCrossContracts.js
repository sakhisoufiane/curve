require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();
const moment = require('moment');
const async = require('async');
const WriteCsv = require('../libs/writeCsv');
const Contract = require('../models/contract');
const Client = require('../models/client');

const getIncorrectCrossings = () => {
    const incorrectContracts = []
    Contract.countDocuments({}, (err, count) => {
        const limit = 100;
        const rounds = listFromNumber(Math.floor(count / limit));
        const contractFilter = { clientId: '6135d18a74eb58111366ebad' };
        let lastContractId;
        logger.info(`Processing ${rounds.length - 1} batches from ${count} contracts`)
        async.eachSeries(rounds, (round, loopCb) => {
            if (lastContractId) {
                contractFilter._id = { $gt: lastContractId };
            }
            async.waterfall([
                function (waterfallCb) {
                    Contract.find(contractFilter).sort({ _id: 1 }).limit(limit).exec((err, contracts) => {
                        if (err) { return waterfallCb(err) }

                        if (contracts?.[contracts?.length - 1]) {
                            lastContractId = contracts[contracts?.length - 1]._id
                        }
                        waterfallCb(null, contracts)
                    })
                },
                function (contracts, waterfallCb) {
                    logger.info(`Batch No. ${round} - Working out incorrect contracts`)
                    async.each(contracts, (contract, contractCb) => {
                        if (contract?.crossContracts?.length > 0) {
                            async.each(contract.crossContracts, (crossContract, crossContractCb) => {
                                if (crossContract) {
                                    Contract.findOne({ clientId: contract.clientId, _id: crossContract.contractId }, 'name accountingPeriod contractType', (err, foundContract) => {
                                        if (err) { return crossContractCb(err); }

                                        if (foundContract?.accountingPeriod !== contract?.accountingPeriod || foundContract?.contractType !== contract?.contractType) {
                                            Client.findById(contract.clientId, 'name', (err, clientName) => {
                                                if (err) { return crossContractCb(err) }
                                                contract.clientName = clientName?.name;
                                                incorrectContracts.push(contract);
                                                crossContractCb();
                                            })
                                        } else {
                                            crossContractCb();
                                        }
                                    });
                                } else {
                                    crossContractCb();
                                }
                            }, () => {
                                contractCb()
                            })
                        } else {
                            contractCb();
                        }
                    }, () => {
                        waterfallCb()
                    });
                },
            ], (err) => {
                logger.info(`Batch No. ${round} completed`)
                loopCb(err)
            })
        }, () => {
            const convertedContracts = [];
            logger.info(`Preparing ${incorrectContracts.length} to contracts write to CSV`);
            incorrectContracts.forEach((contract) => {
                if (contract?.crossContracts?.length > 0) {
                    contract.crossContracts.forEach((crossContract) => {
                        convertedContracts.push([contract.clientId, contract.clientName, contract._id, contract.name, crossContract.contractId, crossContract.condition, crossContract.process])
                    })
                }
            })

            const standardOutput = `${appRootDir}/tmp/Incorrect Cross Contracts - ${moment().format('X')}.csv`;
            const writeCsv = new WriteCsv({
                headers: [
                    'Client ID', 'ClientName', 'Contract ID', 'Contract Name', 'Cross Contract ID', 'Condition', 'Process'
                ],
                outputLocation: standardOutput,
            });

            writeCsv.addData(convertedContracts, (err) => {
                writeCsv.write((err) => {
                    console.log('Complete');
                    process.exit(-1);
                });
            });
        })
    })
}

getIncorrectCrossings();

function listFromNumber(number) {
    const list = [];
    for (let i = 0; i <= number; i += 1) { list.push(i); }
    return list;
}
