const { logger, createZip } = require('@curveroyaltysystems/platform-shared-utils');
const { WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const { waterfall, parallel } = require('async');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const config = require('../config.json');
const Client = require('../models/client');

const ContractCsv = {
  labelContractsForCsv: async (filter, clientId, paymentTier, callback) => {
    const client = await Client.findById(clientId, 'features').catch(logger.error);

    const timestamp = moment().format('X');

    // Lite and Pro Headers
    const overviewHeaders = (paymentTier === 'Lite' ? config.importTemplates.liteContract : config.importTemplates.contract).map((header) => header.name);
    if (client?.features?.payeeBalances) { overviewHeaders.splice(4, 4, 'Payee Balance Condition'); }

    const salesHeaders = (paymentTier === 'Lite' ? config.importTemplates.liteSale : config.importTemplates.sale).map((header) => header.name);

    // Pro Headers
    const deductionHeaders = config.importTemplates.deduction.map((header) => header.name);
    const mechanicalDeductionHeaders = config.importTemplates.mechanicalDeduction.map((header) => header.name);
    const withholdingTaxDeductionHeaders = config.importTemplates.withholdingTaxDeduction.map((header) => header.name);
    const contractCostsHeaders = config.importTemplates.contractCost.map((header) => header.name);
    const reserveHeaders = config.importTemplates.reserve.map((header) => header.name);
    const crossContractHeaders = config.importTemplates.crossContracts.map((header) => header.name);
    const autoPaymentHeaders = config.importTemplates.autoPaymentConditions.map((header) => header.name);
    const escalationTrackersHeaders = config.importTemplates.escalationTrackers.map((header) => header.name);
    const escalationEquivalentsHeaders = config.importTemplates.escalationEquivalents.map((header) => header.name);
    // Writers
    const overviewWriter = new WriteCsv({ headers: overviewHeaders, outputLocation: `${appRootDir}/tmp/Contract Export Overview ${timestamp}.csv` });
    const payeesWriter = new WriteCsv({ headers: ['Contract Name', 'Payee Name', 'Payee Type'], outputLocation: `${appRootDir}/tmp/Contract Export Payees ${timestamp}.csv` });
    const salesWriter = new WriteCsv({ headers: salesHeaders, outputLocation: `${appRootDir}/tmp/Contract Export Sales ${timestamp}.csv` });
    const deductionWriter = new WriteCsv({ headers: deductionHeaders, outputLocation: `${appRootDir}/tmp/Contract Export Deductions ${timestamp}.csv` });
    const mechanicalDeductionWriter = new WriteCsv({ headers: mechanicalDeductionHeaders, outputLocation: `${appRootDir}/tmp/Contract Export Mechanicals ${timestamp}.csv` });
    const withholdingTaxDeductionWriter = new WriteCsv({ headers: withholdingTaxDeductionHeaders, outputLocation: `${appRootDir}/tmp/Contract Export Witholding Tax ${timestamp}.csv` });
    const contractCostWriter = new WriteCsv({ headers: contractCostsHeaders, outputLocation: `${appRootDir}/tmp/Contract Export Costs ${timestamp}.csv` });
    const reserveWriter = new WriteCsv({ headers: reserveHeaders, outputLocation: `${appRootDir}/tmp/Contract Export Reserves ${timestamp}.csv` });
    const crossContractWriter = new WriteCsv({ headers: crossContractHeaders, outputLocation: `${appRootDir}/tmp/Contract Export Cross Contracts ${timestamp}.csv` });
    const autoPaymentWriter = new WriteCsv({ headers: autoPaymentHeaders, outputLocation: `${appRootDir}/tmp/Contract Export Auto Payment Conditions ${timestamp}.csv` });
    const escalationTrackersWriter = new WriteCsv({ headers: escalationTrackersHeaders, outputLocation: `${appRootDir}/tmp/Contract Export Escalation Trackers ${timestamp}.csv` });
    const escalationEquivalentsWriter = new WriteCsv({ headers: escalationEquivalentsHeaders, outputLocation: `${appRootDir}/tmp/Contract Export Escalation Equivalents ${timestamp}.csv` });
    // eslint-disable-next-line max-len
    const writers = { overviewWriter, payeesWriter, salesWriter, deductionWriter, mechanicalDeductionWriter, withholdingTaxDeductionWriter, contractCostWriter, reserveWriter, crossContractWriter, autoPaymentWriter, escalationTrackersWriter, escalationEquivalentsWriter };
    // Write to File
    const params = { clientId, paymentTier, filter, writers, client };
    ContractCsv.writeLabelContractData(params, null, 0, callback);
  },
  writeLabelContractData: (params, lastId, total, callback) => {
    const Contract = require('../models/contract');
    const { clientId, paymentTier, filter, writers } = params;
    const limit = 1000;
    let count = 0;
    if (lastId) { filter._id = { $gt: lastId }; }

    waterfall([
      (cb) => {
        Contract.find(filter)
          .sort({ _id: 1 })
          .limit(limit)
          .then((contracts) => {
            if (!contracts?.length) return cb(null, null);
            lastId = contracts[contracts.length - 1]._id;
            count = contracts.length;
            cb(null, contracts);
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      (contracts, cb) => {
        if (!contracts?.length) return cb(null, null);
        Contract.multipleContractsForXlsx(contracts, clientId, paymentTier, cb);
      },
      (data, cb) => {
        if (!data?.length) return cb(null, null);
        parallel([
          // Overview
          (paraCb) => writers.overviewWriter.addData(data[0], paraCb),
          // Payees
          (paraCb) => {
            if (!params.client?.features?.payeeBalances) { return paraCb(); }
            writers.payeesWriter.addData(data[1], paraCb);
          },
          // Sales
          (paraCb) => {
            const sheet = params.client?.features?.payeeBalances ? 2 : 1;
            writers.salesWriter.addData(data[sheet], paraCb);
          },
          // Costs
          (paraCb) => {
            const sheetLite = params.client?.features?.payeeBalances ? 3 : 2;
            const sheetPro = params.client?.features?.payeeBalances ? 6 : 5;

            writers.contractCostWriter.addData(paymentTier === 'Lite' ? data[sheetLite] : data[sheetPro], paraCb);
          },
          // Reserves
          (paraCb) => {
            const sheetLite = params.client?.features?.payeeBalances ? 4 : 3;
            const sheetPro = params.client?.features?.payeeBalances ? 7 : 6;

            writers.reserveWriter.addData(paymentTier === 'Lite' ? data[sheetLite] : data[sheetPro], paraCb);
          },
          // Deductions
          (paraCb) => {
            if (paymentTier === 'Lite') {
              paraCb();
            } else {
              writers.deductionWriter.addData(data[2], paraCb);
            }
          },
          // Mechanical
          (paraCb) => {
            if (paymentTier === 'Lite') {
              paraCb();
            } else {
              const sheet = params.client?.features?.payeeBalances ? 4 : 3;
              writers.mechanicalDeductionWriter.addData(data[sheet], paraCb);
            }
          },
          // Withholding Tax
          (paraCb) => {
            if (paymentTier === 'Lite') {
              paraCb();
            } else {
              const sheet = params.client?.features?.payeeBalances ? 5 : 4;
              writers.withholdingTaxDeductionWriter.addData(data[sheet], paraCb);
            }
          },
          // Cross Contracts
          (paraCb) => {
            if (paymentTier === 'Lite') {
              paraCb();
            } else {
              const sheet = params.client?.features?.payeeBalances ? 8 : 7;
              writers.crossContractWriter.addData(data[sheet], paraCb);
            }
          },
          // Auto Payment Conditions
          (paraCb) => {
            if (paymentTier === 'Lite') {
              paraCb();
            } else {
              const sheet = params.client?.features?.payeeBalances ? 9 : 8;
              writers.autoPaymentWriter.addData(data[sheet], paraCb);
            }
          },
          // Escalation Trackers
          (paraCb) => {
            if (paymentTier === 'Lite') {
              paraCb();
            } else {
              const sheet = params.client?.features?.payeeBalances ? 10 : 9;
              writers.escalationTrackersWriter.addData(data[sheet], paraCb);
            }
          },
          // Escalation Equivalents
          (paraCb) => {
            if (paymentTier === 'Lite') {
              paraCb();
            } else {
              const sheet = params.client?.features?.payeeBalances ? 11 : 10;
              writers.escalationEquivalentsWriter.addData(data[sheet], paraCb);
            }
          },
        ], cb);
      },
    ], (err) => {
      if (err) { return callback(err); }

      logger.debug(`Contract Export ${clientId}: ${count + total} contracts appended to file`);
      if (count === limit) { return ContractCsv.writeLabelContractData(params, lastId, total + limit, callback); }

      logger.debug(`Contract Export ${clientId}: Writing ${count + total} contracts to file`);
      parallel([
        // Overview
        (para2Cb) => writers.overviewWriter.write(para2Cb),
        // Payees
        (para2Cb) => {
          if (!params.client?.features?.payeeBalances) { return para2Cb(); }
          writers.payeesWriter.write(para2Cb);
        },
        // Sales
        (para2Cb) => writers.salesWriter.write(para2Cb),
        // Costs
        (para2Cb) => writers.contractCostWriter.write(para2Cb),
        // Reserves
        (para2Cb) => writers.reserveWriter.write(para2Cb),
        // Deductions
        (para2Cb) => {
          if (paymentTier === 'Lite') {
            para2Cb();
          } else {
            writers.deductionWriter.write(para2Cb);
          }
        },
        // Mechanicals
        (para2Cb) => {
          if (paymentTier === 'Lite') {
            para2Cb();
          } else {
            writers.mechanicalDeductionWriter.write(para2Cb);
          }
        },
        // Witholding Tax
        (para2Cb) => {
          if (paymentTier === 'Lite') {
            para2Cb();
          } else {
            writers.withholdingTaxDeductionWriter.write(para2Cb);
          }
        },
        // Cross Contracts
        (para2Cb) => {
          if (paymentTier === 'Lite') {
            para2Cb();
          } else {
            writers.crossContractWriter.write(para2Cb);
          }
        },
        // Auto Payment Conditons
        (para2Cb) => {
          if (paymentTier === 'Lite') {
            para2Cb();
          } else {
            writers.autoPaymentWriter.write(para2Cb);
          }
        },
        // Escalation Trackers
        (para2Cb) => {
          if (paymentTier === 'Lite') {
            para2Cb();
          } else {
            writers.escalationTrackersWriter.write(para2Cb);
          }
        },
        // Escalation Equivalents
        (para2Cb) => {
          if (paymentTier === 'Lite') {
            para2Cb();
          } else {
            writers.escalationEquivalentsWriter.write(para2Cb);
          }
        },
      ], (err, results) => {
        if (err) { return callback(err); }

        logger.debug(`Contract Export ${clientId}: Zipping files`);
        createZip.localFiles(results.filter(Boolean), `${appRootDir}/tmp/Contract Export ${moment().format('X')}.zip`, callback);
      });
    });
  },
  publishingContratsForCsv: async (filter, clientId, paymentTier, callback) => {
    const timestamp = moment().format('X');

    const client = await Client.findById(clientId, 'features').catch(logger.error);

    // Headers
    const overviewHeaders = (paymentTier === 'Lite' ? config.importTemplates.litePublisherContract : config.importTemplates.publisherContract).map((header) => header.name);
    if (client?.features?.payeeBalances) { overviewHeaders.splice(4, 4, 'Payee Balance Condition'); }

    const incomeHeaders = (paymentTier === 'Lite' ? config.importTemplates.litePublisherSales : config.importTemplates.publisherSales).map((header) => header.name);
    const deductionHeaders = config.importTemplates.publisherDeduction.map((header) => header.name);
    const crossContractHeaders = config.importTemplates.crossContracts.map((header) => header.name);
    const withholdingTaxDeductionHeaders = config.importTemplates.withholdingTaxDeduction.map((header) => header.name);
    const autoPaymentHeaders = config.importTemplates.autoPaymentConditions.map((header) => header.name);
    const escalationTrackersHeaders = config.importTemplates.escalationTrackers.map((header) => header.name);
    const escalationEquivalentsHeaders = config.importTemplates.escalationEquivalents.map((header) => header.name);
    // Writers
    const overviewWriter = new WriteCsv({ headers: overviewHeaders, outputLocation: `${appRootDir}/tmp/Contract Export Overview ${timestamp}.csv` });
    const payeesWriter = new WriteCsv({ headers: ['Contract Name', 'Payee Name', 'Payee Type'], outputLocation: `${appRootDir}/tmp/Contract Export Payees ${timestamp}.csv` });
    const incomeWriter = new WriteCsv({ headers: incomeHeaders, outputLocation: `${appRootDir}/tmp/Contract Export Income ${timestamp}.csv` });
    const deductionWriter = new WriteCsv({ headers: deductionHeaders, outputLocation: `${appRootDir}/tmp/Contract Export Deductions ${timestamp}.csv` });
    const crossContractWriter = new WriteCsv({ headers: crossContractHeaders, outputLocation: `${appRootDir}/tmp/Contract Export Cross Contracts ${timestamp}.csv` });
    const withholdingTaxDeductionWriter = new WriteCsv({ headers: withholdingTaxDeductionHeaders, outputLocation: `${appRootDir}/tmp/Contract Export Witholding Tax ${timestamp}.csv` });
    const autoPaymentWriter = new WriteCsv({ headers: autoPaymentHeaders, outputLocation: `${appRootDir}/tmp/Contract Export Auto Payment Conditions ${timestamp}.csv` });
    const escalationTrackersWriter = new WriteCsv({ headers: escalationTrackersHeaders, outputLocation: `${appRootDir}/tmp/Contract Export Escalation Trackers ${timestamp}.csv` });
    const escalationEquivalentsWriter = new WriteCsv({ headers: escalationEquivalentsHeaders, outputLocation: `${appRootDir}/tmp/Contract Export Escalation Equivalents ${timestamp}.csv` });
    const writers = { overviewWriter, incomeWriter, deductionWriter, crossContractWriter, payeesWriter, withholdingTaxDeductionWriter, autoPaymentWriter, escalationTrackersWriter, escalationEquivalentsWriter };
    // Write to File
    const params = { clientId, paymentTier, filter, writers, client };
    ContractCsv.writePublishingContractData(params, null, 0, callback);
  },
  writePublishingContractData: (params, lastId, total, callback) => {
    const Contract = require('../models/contract');
    const { clientId, paymentTier, filter, writers } = params;
    const limit = 1000;
    let count = 0;
    if (lastId) { filter._id = { $gt: lastId }; }

    waterfall([
      (cb) => {
        Contract.find(filter)
          .sort({ _id: 1 })
          .limit(limit)
          .then((contracts) => {
            if (!contracts?.length) return cb(null, null);

            lastId = contracts[contracts.length - 1]._id;
            count = contracts.length;
            cb(null, contracts);
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      (contracts, cb) => {
        if (!contracts) return cb(null, null);
        Contract.multiplePublisherContractsForXlsx(contracts, clientId, paymentTier, cb);
      },
      (data, cb) => {
        if (!data) return cb(null, null);
        parallel([
          // Overview
          (paraCb) => writers.overviewWriter.addData(data[0], paraCb),
          // Payees
          (paraCb) => {
            if (!params.client?.features?.payeeBalances) { return paraCb(); }
            writers.payeesWriter.addData(data[1], paraCb);
          },
          // Income
          (paraCb) => {
            const sheet = params.client?.features?.payeeBalances ? 2 : 1;
            writers.incomeWriter.addData(data[sheet], paraCb);
          },
          // Deductions
          (paraCb) => {
            if (paymentTier === 'Lite') {
              paraCb();
            } else {
              const sheet = params.client?.features?.payeeBalances ? 3 : 2;
              writers.deductionWriter.addData(data[sheet], paraCb);
            }
          },
          // Witholding Tax
          (paraCb) => {
            if (paymentTier === 'Lite') {
              paraCb();
            } else {
              const sheet = params.client?.features?.payeeBalances ? 4 : 3;
              writers.withholdingTaxDeductionWriter.addData(data[sheet], paraCb);
            }
          },
          // Cross Contracts
          (paraCb) => {
            if (paymentTier === 'Lite') {
              paraCb();
            } else {
              const sheet = params.client?.features?.payeeBalances ? 5 : 4;
              writers.crossContractWriter.addData(data[sheet], paraCb);
            }
          },
          // Auto Payment Conditons
          (paraCb) => {
            if (paymentTier === 'Lite') {
              paraCb();
            } else {
              const sheet = params.client?.features?.payeeBalances ? 6 : 5;
              writers.autoPaymentWriter.addData(data[sheet], paraCb);
            }
          },
          // Escalation Trackers
          (paraCb) => {
            if (paymentTier === 'Lite') {
              paraCb();
            } else {
              const sheet = params.client?.features?.payeeBalances ? 7 : 6;
              writers.escalationTrackersWriter.addData(data[sheet], paraCb);
            }
          },
          // Escalation Equivalents
          (paraCb) => {
            if (paymentTier === 'Lite') {
              paraCb();
            } else {
              const sheet = params.client?.features?.payeeBalances ? 8 : 7;
              writers.escalationEquivalentsWriter.addData(data[sheet], paraCb);
            }
          },
        ], cb);
      },
    ], (err) => {
      if (err) { return callback(err); }

      logger.debug(`Contract Export ${clientId}: ${count + total} contracts appended to file`);
      if (count === limit) { return ContractCsv.writePublishingContractData(params, lastId, total + limit, callback); }

      logger.debug(`Contract Export ${clientId}: Writing ${count + total} contracts to file`);
      parallel([
        // Overview
        (para2Cb) => writers.overviewWriter.write(para2Cb),
        // Payees
        (para2Cb) => {
          if (!params.client?.features?.payeeBalances) { return para2Cb(); }
          writers.payeesWriter.write(para2Cb);
        },
        // Sales
        (para2Cb) => writers.incomeWriter.write(para2Cb),
        // Deductions
        (para2Cb) => {
          if (paymentTier === 'Lite') {
            para2Cb();
          } else {
            writers.deductionWriter.write(para2Cb);
          }
        },
        // Cross Contracts
        (para2Cb) => {
          if (paymentTier === 'Lite') {
            para2Cb();
          } else {
            writers.crossContractWriter.write(para2Cb);
          }
        },
        // Witholding Tax
        (para2Cb) => {
          if (paymentTier === 'Lite') {
            para2Cb();
          } else {
            writers.withholdingTaxDeductionWriter.write(para2Cb);
          }
        },
        // Auto Payment Conditons
        (para2Cb) => {
          if (paymentTier === 'Lite') {
            para2Cb();
          } else {
            writers.autoPaymentWriter.write(para2Cb);
          }
        },
        // Escalation Trackers
        (para2Cb) => {
          if (paymentTier === 'Lite') {
            para2Cb();
          } else {
            writers.escalationTrackersWriter.write(para2Cb);
          }
        },
        // Escalation Equivalents
        (para2Cb) => {
          if (paymentTier === 'Lite') {
            para2Cb();
          } else {
            writers.escalationEquivalentsWriter.write(para2Cb);
          }
        },
      ], (err, results) => {
        if (err) { return callback(err); }

        logger.debug(`Contract Export ${clientId}: Zipping files`);
        createZip.localFiles(results.filter(Boolean), `${appRootDir}/tmp/Mechanical Contract Export ${moment().format('X')}.zip`, callback);
      });
    });
  },
  mechanicalContratsForCsv: async (filter, clientId, callback) => {
    const timestamp = moment().format('X');

    const client = await Client.findById(clientId, 'features').catch(logger.error);

    // Headers
    const overviewHeaders = config.importTemplates.mechanicalContract.map((header) => header.name);
    if (client?.features?.payeeBalances) { overviewHeaders.splice(4, 4, 'Payee Balance Condition'); }

    const termHeaders = config.importTemplates.mechanicalTerms.map((header) => header.name);
    const reserveHeaders = config.importTemplates.reserve.map((header) => header.name);
    const crossContractHeaders = config.importTemplates.crossContracts.map((header) => header.name);

    // Writers
    const overviewWriter = new WriteCsv({ headers: overviewHeaders, outputLocation: `${appRootDir}/tmp/Contract Export Overview ${timestamp}.csv` });
    const payeesWriter = new WriteCsv({ headers: ['Contract Name', 'Payee Name', 'Payee Type'], outputLocation: `${appRootDir}/tmp/Contract Export Payees ${timestamp}.csv` });
    const termWriter = new WriteCsv({ headers: termHeaders, outputLocation: `${appRootDir}/tmp/Contract Export Terms ${timestamp}.csv` });
    const reserveWriter = new WriteCsv({ headers: reserveHeaders, outputLocation: `${appRootDir}/tmp/Contract Export Reserves ${timestamp}.csv` });
    const crossContractWriter = new WriteCsv({ headers: crossContractHeaders, outputLocation: `${appRootDir}/tmp/Contract Export Cross Contracts ${timestamp}.csv` });
    const writers = { overviewWriter, termWriter, reserveWriter, crossContractWriter, payeesWriter };
    // Write to File
    const params = { clientId, filter, writers, client };
    ContractCsv.writeMechanicalContractData(params, null, 0, callback);
  },
  writeMechanicalContractData: (params, lastId, total, callback) => {
    const Contract = require('../models/contract');
    const { clientId, filter, writers } = params;
    const limit = 1000;
    let count = 0;
    if (lastId) { filter._id = { $gt: lastId }; }

    waterfall([
      (cb) => {
        Contract.find(filter)
          .sort({ _id: 1 })
          .limit(limit)
          .then((contracts) => {
            if (!contracts?.length) return cb(null, null);

            lastId = contracts[contracts.length - 1]._id;
            count = contracts.length;
            cb(null, contracts);
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      (contracts, cb) => {
        if (!contracts) return cb(null, null);
        Contract.multipleMechanicalContractsForXlsx(contracts, clientId, cb);
      },
      (data, cb) => {
        if (!data) return cb(null, null);
        parallel([
          // Overview
          (paraCb) => writers.overviewWriter.addData(data[0], paraCb),
          // Payees
          (paraCb) => {
            if (!params.client?.features?.payeeBalances) { return paraCb(); }
            writers.payeesWriter.addData(data[1], paraCb);
          },
          // Terms
          (paraCb) => {
            const sheet = params.client?.features?.payeeBalances ? 2 : 1;
            writers.termWriter.addData(data[sheet], paraCb);
          },
          // Reserves
          (paraCb) => {
            const sheet = params.client?.features?.payeeBalances ? 3 : 2;
            writers.reserveWriter.addData(data[sheet], paraCb);
          },
          // Cross Contracts
          (paraCb) => {
            const sheet = params.client?.features?.payeeBalances ? 4 : 3;
            writers.crossContractWriter.addData(data[sheet], paraCb);
          },
        ], cb);
      },
    ], (err) => {
      if (err) { return callback(err); }

      logger.debug(`Contract Export ${clientId}: ${count + total} contracts appended to file`);
      if (count === limit) { return ContractCsv.writeMechanicalContractData(params, lastId, total + limit, callback); }

      logger.debug(`Contract Export ${clientId}: Writing ${count + total} contracts to file`);
      parallel([
        // Overview
        (para2Cb) => writers.overviewWriter.write(para2Cb),
        // Payees
        (para2Cb) => {
          if (!params.client?.features?.payeeBalances) { return para2Cb(); }
          writers.payeesWriter.write(para2Cb);
        },
        // Sales
        (para2Cb) => writers.termWriter.write(para2Cb),
        // Reserve
        (para2Cb) => writers.reserveWriter.write(para2Cb),
        // Cross Contracts
        (para2Cb) => writers.crossContractWriter.write(para2Cb),
      ], (err, results) => {
        if (err) { return callback(err); }

        logger.debug(`Contract Export ${clientId}: Zipping files`);
        createZip.localFiles(results.filter(Boolean), `${appRootDir}/tmp/Mechanical Contract Export ${moment().format('X')}.zip`, callback);
      });
    });
  },
};

module.exports = ContractCsv;
