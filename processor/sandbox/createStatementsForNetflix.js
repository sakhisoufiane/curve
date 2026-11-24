require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Excel = require('exceljs');
const async = require('async');
const Contract = require('../models/contract');
const Statement = require('../models/statement');
const Period = require('../models/period');
const WriteCsv = require('../libs/writeCsv/writeCsvObject');
const appRootDir = require('app-root-dir').get();
const StatementController = require('../libs/calculation/statementController');
const filePath = '/Users/joeosborne/Downloads/Netflix Historical Statements 20230802.xlsx';
const border = '===================';
const clientId = '61e70b5c9ff4560026f677d5';
const unfoundContracts = [];
const existingStatements = [];
let count = 0;

const createStatementsForNetflix = (extractedExcelData, periodOne, periodTwo) => {
  async.eachSeries(extractedExcelData, (individualRowOfData, cb) => {
    Contract.findOne({ clientId, name: individualRowOfData.contract }, (err, contract) => {
      if (err) {
        logger.error(`${border} 1 Error: ${err} ${border}`);
        return cb(err);
      }
      if (!contract) {
        logger.info(`${border} Contract not found: ${individualRowOfData.contract}. Skipping ${border}:`);
        unfoundContracts.push(individualRowOfData);
        return cb();
      }   
      let currentPeriod;
      if (individualRowOfData.period === '2H2020 - 1H2022') {
        currentPeriod = periodOne;
      } else if (individualRowOfData.period === '2022 H2') {
        currentPeriod = periodTwo;
      };
      Statement.count({ contractId: contract.id, periodId: currentPeriod._id }, (err, existingStatementCount) => {
        if (err) {
          logger.error(`${border} 2 Error: ${err} ${border}`);
          return cb(err);
        }
        if (existingStatementCount > 0) {
          logger.info(`${border} Statement already exists: ${currentPeriod.year} - ${currentPeriod.accountingPeriod}: ${individualRowOfData.contract}. Skipping ${border}:`);
          existingStatements.push(individualRowOfData)
          return cb();
        } else {
          if (individualRowOfData.period === '2H2020 - 1H2022') {
             processStatement(contract, periodOne, cb);
          } else if (individualRowOfData.period === '2022 H2') {
             processStatement(contract, periodTwo, cb);
          }
        }
      });
    });
  }, (err) => {
    if (err) {
      logger.error(`${border} 3 Error: ${err} ${border}`);
    } 
    else {
      let tasksCompleted = 0;
      const checkCompletion = () => {
        tasksCompleted++;
        if (tasksCompleted === 2) {
          logger.info(`${border} All data processed successfully ${border}`);
          process.exit(0);
        }
      }; if (unfoundContracts.length) {
          processCsvReport('Unfound Contracts', unfoundContracts, checkCompletion)
        } else {
            checkCompletion();
          };
      if (existingStatements.length) {
        processCsvReport('Existing Statements', existingStatements, checkCompletion)
      } else {
          checkCompletion();
        };
    };
  });
};

const getDataFromXlsx = () => {
  return new Promise((resolve, reject) => {
    const extractedExcelData = [];
    const workbook = new Excel.Workbook();
    workbook.xlsx.readFile(filePath).then(() => {
      const workSheet = workbook.getWorksheet('Sheet1');
      workSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;
        let period = row.getCell(1).value;
        let contract = row.getCell(2).value;
        extractedExcelData.push({ period, contract });
      });
      resolve(extractedExcelData);
    })
    .catch(reject);
  });
};

const processStatement = async (contract, period, cb) => {
  count++;
  logger.info(`${border} Contract: ${contract.name} - Found. Creating Statement number ${count}. ${border}:`);
  const statement = new Statement({
    clientId,
    name: `${period.year} - ${period.accountingPeriod}: ${contract.name}`,
    periodId: period._id.toString(),
    contractId: contract._id.toString(),
    date: period.endDate,
    year: period.year,
    accountingPeriod: period.accountingPeriod,
    contractType: period.contractType,
    partitionNo: contract.partitionNo,
    periodType: period.contractType,
  });
  statement.save((err, savedStatement) => {
    if (err) {
      logger.error(`${border} Error saving statement: ${err} ${border}`);
      return cb(err);
    } 
    else {
      StatementController.calculate(savedStatement, (err) => {
        if (err) {
          logger.error(`${border} 4 Error: ${err} ${border}`);
          return cb(err);
        }    
        return cb();
      });       
    };
  });
};

const processCsvReport = (whatDataIsIt, data, callback) => {
  const outputLocation = `${appRootDir}/tmp/${whatDataIsIt}.csv`;
  const csvWriter = new WriteCsv({ headers: ['Statement Period', 'Curve Contract Name'], outputLocation });
  const outputData = data.map((line) => {
    return [line.period, line.contract];
  })
  csvWriter.addData(outputData, () => {
    csvWriter.write((err, fileLocation) => {
      logger.info(`${border} ${data.length} ${whatDataIsIt}. Report: ${fileLocation} ${border}`);
      callback(err);
    });
  });
}

const runScript = async () => {
  const extractedExcelData = await getDataFromXlsx();
  const periodOne = await Period.findOne({ clientId, name: '2H2020 - 1H2022' });
  const periodTwo = await Period.findOne({ clientId, name: '2022 H2' })
  createStatementsForNetflix(extractedExcelData, periodOne, periodTwo);
};

runScript().catch((err) => {
  logger.error(`${border} Error: ${err} ${border}`);
});