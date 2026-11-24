// Remove non CISAC approved territories from various publishing territory arrays
require('dotenv').config();
require('../../models/db');

const { TerritoryHelper } = require('@curveroyaltysystems/curve-shared-logic');
const { eachLimit } = require('async');
const Publisher = require('../../models/publisher');
const Composer = require('../../models/composer');
const Work = require('../../models/work');
const TerritoryGroup = require('../../models/territoryGroup');

const INVALID_TERRITORIES = ['YT', 'RE', 'SH', 'AW', 'AI', 'BM', 'BQ', 'VG', 'KY', 'CW', 'FK', 'GF', 'GL', 'GP', 'MQ', 'MS', 'AN', 'BL', 'MF', 'SX', 'PM', 'TC', 'VI', 'PS', 'FO', 'GI', 'GG', 'IM', 'JE', 'XK', 'SJ', 'AX', 'AS', 'AQ', 'BV', 'IO', 'CX', 'CC', 'CK', 'TF', 'GU', 'HM', 'NU', 'NF', 'MP', 'PN', 'GS', 'TK', 'UM', 'WF'];

const FILTER = {
  name: { $not: /Regression (Composer|Publisher)/i }, // Ignore thousands of QA test rows
  territories: { $in: INVALID_TERRITORIES }, // Only select where territories array includes some or all invalid territories
};
  // Set to null when running on all records, use something small for quick debugging/testing
const LIMIT = null;
// Set concurrecy limit for db update queries
const CONCURRENCY = 5;

const updateDoc = (model, id, territories) => model.updateOne({ _id: id }, { territories });

const getGroupedTerritories = (territories) => {
  const valid = [];
  const invalid = [];
  territories.forEach((t) => {
    if (INVALID_TERRITORIES.includes(t)) invalid.push(t);
    else valid.push(t);
  });
  return { valid, invalid };
};

async function fixPublishers() {
  console.time('Publisher.find');
  const publishers = await Publisher.find(FILTER, '_id name territories').limit(LIMIT);
  console.timeEnd('Publisher.find');
  console.log(`—— Publishers (${publishers.length}) ——`);
  console.time('update');
  await eachLimit(publishers, CONCURRENCY, async (publisher) => {
    const { valid, invalid } = getGroupedTerritories(publisher.territories);
    console.log(`${publisher.name} (${publisher._id.toString()})`, 'total = ', publisher.territories.length, 'invalid =', invalid.length, 'valid after filter =', valid.length);
    await updateDoc(Publisher, publisher._id, valid);
  });
  console.timeEnd('update');
}

async function fixComposers() {
  console.time('Composer.find');
  const composers = await Composer.find(FILTER, '_id name territories').limit(LIMIT);
  console.timeEnd('Composer.find');
  console.log(`—— Composers (${composers.length}) ——`);
  console.time('update');
  await eachLimit(composers, CONCURRENCY, async (composer) => {
    const { valid, invalid } = getGroupedTerritories(composer.territories);
    console.log(`${composer.name} (${composer._id.toString()})`, 'total = ', composer.territories.length, 'invalid =', invalid.length, 'valid after filter =', valid.length);
    await updateDoc(Composer, composer._id, valid);
  });
  console.timeEnd('update');
}

async function fixGroups() {
  console.time('TerritoryGroup.find');
  const groups = await TerritoryGroup.find(FILTER, '_id name territories').limit(LIMIT);
  console.timeEnd('TerritoryGroup.find');
  console.log(`—— Territory Groups (${groups.length}) ——`);
  console.time('update');
  await eachLimit(groups, CONCURRENCY, async (group) => {
    const { valid, invalid } = getGroupedTerritories(group.territories);
    console.log(`${group.name} (${group._id.toString()})`, 'total = ', group.territories.length, 'invalid =', invalid.length, 'valid after filter =', valid.length);
    await updateDoc(TerritoryGroup, group._id, valid);
  });
  console.timeEnd('update');
}

async function fixWorks() {
  console.time('Work.find');
  const works = await Work.find({
    $or: [
      { territories: FILTER.territories },
      { rightsChain: { $elemMatch: { territory: 'specific' } } },
    ] }, '_id title territories rightsChain').limit(100_000);
  console.timeEnd('Work.find');
  console.log(`—— Works (${works.length}) ——`);
  console.time('update');
  await eachLimit(works, CONCURRENCY, async (work) => {
    const { valid, invalid } = getGroupedTerritories(work.territories);
    const workUpdateFields = {};

    // If work includes any invalid territories
    if (invalid.length > 0) workUpdateFields.territories = valid;

    // Update rights chain territories when territory="specific"
    let rightsChainUpdate = false;
    for (const chain of work.rightsChain) {
      if (chain.territory !== 'specific') continue;
      if (chain.territoryCodes.codes.length === 0) continue;
      const { valid: validChainTerritories, invalid: invalidChainTerritories } = getGroupedTerritories(chain.territoryCodes.codes);
      if (invalidChainTerritories.length === 0) continue;
      rightsChainUpdate = true;
      chain.territoryCodes.name = validChainTerritories.join(', ');
      chain.territoryCodes.codes = validChainTerritories;
    }
    if (rightsChainUpdate) workUpdateFields.rightsChain = work.rightsChain;

    if (Object.keys(workUpdateFields).length === 0) return;

    console.log(`${work.title} (${work._id.toString()})`, 'total = ', work.territories.length, 'invalid =', invalid.length, 'valid after filter =', valid.length);
    if (rightsChainUpdate) console.log('> also updating invalid codes in rights chain');

    await Work.updateOne({ _id: work._id }, workUpdateFields);
  });
  console.timeEnd('update');
}

async function main() {
  console.log('CISAC Approved Territories Count: ', TerritoryHelper.allTerritories.length);

  await fixPublishers().catch(console.log);
  await fixComposers().catch(console.log);
  await fixGroups().catch(console.log);

  // We run fixWorks a few times otherwise we have memory issues, each with a limit of 100k
  // With the filters there are just under 300k works that need updating, so 3 times should be enough
  // This could be smarter but it's just a one time script...
  await fixWorks().catch(console.log); // 1st 100k
  await fixWorks().catch(console.log); // 2nd 100k
  await fixWorks().catch(console.log); // 3rd <100k

  console.log('finished all');
  process.exit(0);
}

main();
