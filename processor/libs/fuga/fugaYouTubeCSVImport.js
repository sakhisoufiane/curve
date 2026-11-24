const { pipeline } = require('stream/promises');
const fastCsv = require('fast-csv');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Track = require('../../models/track');

const TAGS = ['youtube'];

async function upsertBatch(batch) {
  await Track.bulkWrite(
    batch.map((item) => ({
      updateOne: {
        filter: { alternativeId: item.alternativeId, clientId: item.clientId },
        update: { $set: item },
        upsert: true,
      },
    })),
  );
}

function parseRow(row) {
  return {
    alternativeId: row[0]?.trim().replace(/[^0-9a-zA-Z- (),_'#"]/gi, ''),
    title: row[1]?.trim(),
    linkedIsrc: row[2].trim().replace(/[^0-9a-zA-Z(),_'#"]/gi, ''),
    artist: row[3]?.trim(),
  };
}

async function importCSV(readableStream, clientId, batchSize = 10000) {
  let batch = [];
  let rowCount = 0;
  let errorCount = 0;

  const parser = fastCsv.parse({ headers: false, ignoreEmpty: true, skipLines: 1 });

  await pipeline(
    readableStream,
    parser,
    async (source) => {
      for await (const row of source) {
        rowCount += 1;
        const { alternativeId, title, linkedIsrc, artist } = parseRow(row);
        if (!alternativeId || !title) {
          errorCount += 1;
          logger.error('fugaYouTubeCSVImport: failed to ingest row: missing alternativeId or title', { row: rowCount + 1 });
        } else {
          batch.push({
            clientId,
            alternativeId,
            title,
            linkedIsrc,
            artist,
            tags: TAGS,
            useAlternativeId: true,
          });
        }
        if (batch.length === batchSize) {
          await upsertBatch(batch);
          batch = [];
        }
      }
      if (batch.length > 0) {
        await upsertBatch(batch);
      }
      logger.info('fugaYouTubeCSVImport: finished', { rowCount, errorCount });
    },
  );
}

module.exports = importCSV;
