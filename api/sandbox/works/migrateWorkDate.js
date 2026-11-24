// This script migrates Work documents for a specific client, converting the copyrightDate field from a string in "DD/MM/YYYY" format to a proper Date object in UTC.
// Usage: node migrateWorkDate.js ( add the ClientId to the clientId variable at the bottom of the file )
// Author: Attilio Marotta

require('dotenv').config();
require('../../models/db');
const { lineAnnotation } = require('pdfkit');
const Work = require('../../models/work');

function parseDDMMYYYYToUTC(value) {
  if (typeof value !== 'string') return null;

  const [day, month, year] = value.trim().split('/').map(Number);
  if (!day || !month || !year) return null;

  return new Date(Date.UTC(year, month - 1, day));
}

const BATCH_SIZE = 500;

async function migrateBatch({ clientId, lastId = null, totalUpdated = 0 }) {
  const query = {
    clientId,
    copyrightDate: { $type: 2 },
    ...(lastId && { _id: { $gt: lastId } }),
  };

  const works = await Work.find(query)
    .sort({ _id: 1 })
    .limit(BATCH_SIZE).lean();

  if (works.length === 0) {
    console.log(`Migration complete. Total updated: ${totalUpdated}`);
    return;
  }

  const bulkOps = [];

  for (const work of works) {
    const parsedDate = parseDDMMYYYYToUTC(work.copyrightDate);

    if (!parsedDate || isNaN(parsedDate.getTime())) {
      console.warn(
        `Skipping Work ${work._id}: invalid date "${work.copyrightDate}"`
      );
      continue;
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: work._id },
        update: { $set: { copyrightDate: parsedDate } },
      },
    });
  }

  if (bulkOps.length) {
    const res = await Work.bulkWrite(bulkOps, { ordered: false });
    totalUpdated += res.modifiedCount;
  }

  const newLastId = works[works.length - 1]._id;

  console.log(
    `Processed batch ending at ${newLastId}, total updated: ${totalUpdated}`
  );

  // recurse
  return migrateBatch({
    clientId,
    lastId: newLastId,
    totalUpdated,
  });
}

async function migrateCopyrightDates(clientId) {
  try {
    console.log(`Starting migration for client ${clientId}...`);
    await migrateBatch({ clientId });
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

const clientId = 'Add Client Id';
migrateCopyrightDates(clientId);
