/*
Description: Seed identifierSequence on all clients that use issueIdentifier,
             seating the counter at max(currentMaxIdentifierNo, identifierStartFrom - 1).
             Run BEFORE deploying the atomic issueIdentifier fix.
Time To Run: varies by catalogue size
Ticket No: SUP-1166
Category: Clients
*/
require('dotenv').config();
const db = require('../../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Client = require('../../models/client');
const Work = require('../../models/work/work');

const run = async () => {
  await db.connect();
  const clients = await Client.find(
    { issueIdentifier: true, identifierSequence: { $exists: false } },
    '_id identifierStartFrom'
  ).lean();

  logger.info(`Found ${clients.length} client(s) to initialise`);

  for (const client of clients) {
    const topWork = await Work.findOne(
      { clientId: client._id },
      { identifierNo: 1 },
      { sort: { identifierNo: -1 } }
    ).lean();

    const maxIdentifierNo = topWork?.identifierNo || 0;
    const identifierStartFrom = client.identifierStartFrom || 1;
    const sequence = Math.max(maxIdentifierNo, identifierStartFrom - 1);

    await Client.updateOne({ _id: client._id }, { $set: { identifierSequence: sequence } });
    logger.info(`Client ${client._id}: identifierSequence set to ${sequence} (maxIdentifierNo: ${maxIdentifierNo}, identifierStartFrom: ${identifierStartFrom})`);
  }

  logger.info(`Done — ${clients.length} client(s) initialised`);
};

run()
  .then(() => process.exit(0))
  .catch((err) => { logger.error(err); process.exit(1); });
