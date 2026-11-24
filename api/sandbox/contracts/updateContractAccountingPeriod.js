require("dotenv").config();
require("../models/db");
const async = require("async");
const Contract = require("../models/contract");
const { logger } = require("@curveroyaltysystems/platform-shared-utils");
const ImportXlsx = require("../libs/importXlsx");
const contractFile =
  "/Users/joeosborne/Downloads/Contract Import Template (3).xlsx";
const date = new Date();
const template = [
  { key: "ID" },
  { key: "Name" },
  { key: "Foreign ID" },
  { key: "Project ID" },
  { key: "Payee Name" },
  { key: "Active" },
  { key: "Company Name" },
  { key: "Accounting Period" },
  { key: "Contract Type" },
  { key: "Currency" },
  { key: "Profit Share Percentage" },
  { key: "Contract Start Date" },
  { key: "Contract End Date" },
  { key: "Categories" },
  { key: "Opening Balance" },
  { key: "Min Payout" },
  { key: "Auto Payment" },
  { key: "Self Billing Invoice" },
  { key: "Deduct Withholding Tax" },
  { key: "Distribution Fees Invoice" },
  { key: "Total All Associated Statements" },
  { key: "Reserve Basis" },
  { key: "Notes" },
  { key: "Labels" },
  { key: "Aliases" },
  { key: "Balance" },
  { key: "Advance Remaining" },
];

function updateContractAccountingPeriod(file) {
  let count = 0;
  async.waterfall([
    function (cb) {
      ImportXlsx.getDataByTemplate(
        file,
        template,
        0,
        2,
        date,
        (err, contracts) => {
          if (err) {
            logger.error(
              `***************************ERROR GETTING DATA FROM FILE: ${err}***************************`
            );
          }
          logger.info(
            `***************************PROCESSING ${contracts.length} CONTRACTS***************************`
          );
          cb(null, contracts);
        }
      );
    },
    function (contracts, cb) {
      async.eachLimit(
        contracts,
        100,
        (contract, eachCb) => {
          Contract.findByIdAndUpdate(
            contract.ID,
            { $set: { accountingPeriod: contract["Accounting Period"] } },
            { timestamps: false },
            (err, updatedContract) => {
              if (err) {
                logger.error(
                  `***************************ERROR FINDING AND OR UPDATING CONTRACT: ${err}***************************`
                );
                return eachCb(err);
              }
              logger.info(
                `***************************ACCOUNTING PERIOD FOR CONTRACT ${updatedContract._id} SUCCESSFULLY UPDATED TO ${updatedContract.accountingPeriod}***************************`
              );
              count++;
              eachCb();
            }
          );
        },
        (err) => {
          if (err) {
            logger.error(
              `***************************ERROR UPDATING CONTRACTS: ${err}***************************`
            );
          }
          logger.info(
            `***************************UPDATED ${count} CONTRACTS SUCCESSFULLY***************************`
          );
          cb();
          process.exit();
        }
      );
    },
  ]);
}

updateContractAccountingPeriod(contractFile);
