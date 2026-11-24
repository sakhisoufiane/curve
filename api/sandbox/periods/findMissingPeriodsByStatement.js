/*
 Description: Check if the listed clients have statements whose periodId is missing a valid Period
 Time To Run: 00:00:03:00s (Staging)
 Ticket No: CUR-3990
 Category: Periods
 Author: Joe Osborne
*/

require('dotenv').config();
require('../../models/db');
const appRootDir = require('app-root-dir').get();
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Statement = require('../../models/statement');
const Period = require('../../models/period');
const Client = require('../../models/client');
const { WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const { find } = require('lodash');
const border = '********';
const log = (msg) => logger.info(`${border} ${msg} ${border}`);
const logErr = (msg) => logger.error(`${border} ${msg} ${border}`);

const clientsToCheck = [
  { _id: '5daf25c777d4b607aa68a29d', name: 'Cloudkid' },
  { _id: '5fb66a55cc019e00172a1656', name: 'Most Wanted DJ' },
  { _id: '61b0ec35d558e70024798799', name: 'Warp Records' },
  { _id: '62866739a953ac036501fd0e', name: 'Laced Music - Label' },
  { _id: '63d00e6672aafa9dfa4282dd', name: 'Integrity Music - US' },
  { _id: '63d00e9f72aafa9dfa4285e3', name: 'Integrity Music - UK' },
  { _id: '6418d341d17be1472a5ce583', name: 'GoodCopBadCop' },
  { _id: '64593d775609b3f0ae5087b3', name: 'MAD Solutions' },
  { _id: '645c02144e5d1a8be21a4aa7', name: 'Mixtape Monopoly' },
  { _id: '655396bae4619f5a8802bae4', name: 'Precital.com' },
  { _id: '656f58dbc016ff585fedb19b', name: 'GRANNADA MUSIC E EDITORA LTDA' },
  { _id: '6578924a7467fc623964d117', name: 'Agroplay' },
  { _id: '657892f2d5ed7388da8a16ea', name: 'Sonder House' },
  { _id: '65789317be6a6f95e1eedf6c', name: 'Skybound Music' },
  { _id: '65789376be6a6f95e1eee217', name: 'Art Gospel' },
  { _id: '6578939dbe6a6f95e1eee2bb', name: 'HITSTAR PRODUCOES ARTISTICAS' },
  { _id: '657893bdfddc30bd4b793875', name: 'Sonora Digital' },
  { _id: '65789403fddc30bd4b793ba9', name: 'Boiadeira Music' },
  { _id: '6578944fbe6a6f95e1eee5b7', name: 'More Views' },
  { _id: '65789471fddc30bd4b793e5d', name: 'R3 Produções' },
  { _id: '6578948fbe6a6f95e1eee6f4', name: 'Imagine Music' },
  { _id: '657894dba4625858a08e7ba6', name: 'Sound Department' },
  { _id: '65789581fe4586df17b74883', name: 'Musiqah' },
  { _id: '65b8f505a85759fed82e1f61', name: 'Artist House LLC' },
  { _id: '6638f056382553cfe7a8c31d', name: 'N3RVE Entertainment LLC' },
  { _id: '66507783ae6ab09bf2df2adf', name: 'New Earth' },
  { _id: '66683c293ff0c75439a41b64', name: 'Damnably' },
  { _id: '666ac477150896197e598a48', name: 'Kayax' },
  { _id: '6672f6b31f26980b0fce4206', name: 'MCD' },
  { _id: '66792f75d34a97b52561a711', name: 'Antifrigoes LLC' },
  { _id: '667ab63a725225e76722dac8', name: 'Seven 7 Rights Management Ltd (t/a Seven Sonic)' },
  { _id: '66b4b999fa635eb0fbd05214', name: 'Resort - Magnetron' },
  { _id: '66bb2f820b646139493f631d', name: 'Resort/Great News (fka. Ismusic)' },
  { _id: '66eadf9d46c0c69968009120', name: 'SNAFU Records - Label' },
  { _id: '6722834d3c3967af10954506', name: 'Stay Level Records Inc. dba Stay Level Music Group'},
  { _id: '6763d96227feb023bdffb432', name: '2NIGHT Management' },
  { _id: '6790c3fc7c0b146cd1b2e8cb', name: 'Silent Giants' },
];
const clientIds = clientsToCheck.map((c) => c._id.toString());
const filter = { clientId: { $in: clientIds } };
const data = [];
const STATEMENT_LIMIT = 1000;
let round = 0;

const findMissingPeriodsByStatement = async (lastId) => {
  round++;
  log(`Finding statements with missing periods... round: ${round}`);
  if (lastId) {
    filter._id = { $gt: lastId };
  }
  const statements = await Statement.find(filter, '_id periodId name clientId contractId').limit(STATEMENT_LIMIT).lean().sort({ _id: 1 });
  statements.forEach((statement) => {
    if (!data.map((d) => d.periodId).includes(statement.periodId)) {
      data.push({
        periodId: statement.periodId,
        clientId: statement.clientId,
        clientName: find(clientsToCheck, { _id: statement.clientId }).name,
        statementName: statement.name,
      });
    }
  });

  if (statements.length === STATEMENT_LIMIT) {
    findMissingPeriodsByStatement(statements[statements.length - 1]._id);
  } else {
    findMissingPeriods();
  }
};

const findMissingPeriods = async () => {
  log('Finding missing periods...');
  const periodIds = data.map((d) => d.periodId);
  const periods = await Period.find({ _id: { $in: periodIds } }, '_id').lean();
  const missingPeriods = periodIds.filter((periodId) => !periods.some((p) => p._id.toString() === periodId));
  log(`Found ${missingPeriods.length} missing periods.`);
  const dataForReport = data.filter((d) => missingPeriods.includes(d.periodId));
  writeReport(dataForReport);
};

const writeReport = (dataForReport) => {
  log('Writing CSV output...');
  const outputLocation = `${appRootDir}/tmp/missingPeriods.csv`;
  const writer = new WriteCsv({ headers: ['Client Name', 'Client ID', 'Statement Name', 'Missing Period ID'], outputLocation });
  const outputData = dataForReport.map((row) => [row.clientName, row.clientId, row.statementName, row.periodId]);

  writer.addData(outputData, () => {
    return new Promise((resolve, reject) => {
      writer.write((err, location) => {
        if (err) {
          logErr(`Error writing CSV: ${err}`);
          reject(err);
        } else {
          log(`CSV successfully written to: ${location}`);
          resolve();
          process.exit(0);
        }
      });
    });
  });
}

findMissingPeriodsByStatement(null);
