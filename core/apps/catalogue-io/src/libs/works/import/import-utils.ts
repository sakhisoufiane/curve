// @ts-expect-error — no type declarations for platform-shared-utils
import { logger } from '@curveroyaltysystems/platform-shared-utils';
import moment from 'moment';
import fs from 'fs';
import { createInterface } from 'readline';
import appRootDirModule from 'app-root-dir';
import { Track } from '../../../models';
import type { ImportRow, IndexedObject } from './import.types';

const appRootDir = appRootDirModule.get();

export function writeArrayToFile(array: ImportRow[], name: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const outputLocation = `${appRootDir}/tmp/${name}_${moment().format('x')}.json`;
    const file = fs.createWriteStream(outputLocation);
    addLineNumberToImportArray(array);
    array = removeUnpopulatedObjects(array);
    if (array.length > 0 && array.length < 5000) {
      file.write(`${JSON.stringify(array)}\n`);
      file.write('Last_Line_Ignore');
    } else if (array.length >= 5000) {
      const batches = arrayToBatches(array, 5000);
      batches.forEach((batch) => { if (batch) file.write(`${JSON.stringify(batch)}\n`); });
      file.write('Last_Line_Ignore');
    } else {
      file.write('Last_Line_Ignore');
    }
    file.on('error', reject);
    file.end();
    resolve(outputLocation);
  });
}

export function turnArrayIntoIndexedObject(array: ImportRow[], identifiers: string[]): IndexedObject {
  const indexes: IndexedObject = {};
  array.forEach((item, line) => {
    item.line = line + 3;
    let indexed = false;
    identifiers.forEach((identifier) => {
      if (!indexed && item[identifier]) {
        if (!indexes[`${identifier}_${item[identifier]}`]) { indexes[`${identifier}_${item[identifier]}`] = []; }
        indexes[`${identifier}_${item[identifier]}`]!.push(item);
        indexed = true;
      }
    });
  });
  return indexes;
}

export function isObjectPopulated(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).some((key) => obj[key] !== '' && obj[key] !== undefined && obj[key] !== null);
}

export function getItemsFromIndexedObject(work: Record<string, unknown>, indexes: IndexedObject, identifiers: string[]): ImportRow[] {
  let result: ImportRow[] = [];
  identifiers.forEach((identifier) => {
    if (indexes[`${identifier}_${work[identifier]}`] && Array.isArray(indexes[`${identifier}_${work[identifier]}`])) {
      result = result.concat(indexes[`${identifier}_${work[identifier]}`] ?? []);
    }
  });
  return result;
}

export function removeLeadingZeros(value: string | number | null | undefined): string {
  if (value) {
    return typeof value === 'string' ? value.replace(/^0+/, '') : String(value);
  }
  return '';
}

export function padLeadingZeros(value: string | number | null | undefined, num = 0): string {
  if (value) {
    return String(value).padStart(num, '0');
  }
  return ''.padStart(num, '0');
}

export async function createMissingTracksUsingWorks(clientId: string, works: ImportRow[]): Promise<void> {
  const isrcTitleMap = new Map();

  works.forEach((work) => {
    if (work.trackIsrcs?.length && work.title) {
      work.trackIsrcs.forEach((rawIsrc) => {
        const isrc = rawIsrc.toString().replace(/[^a-zA-Z0-9]/ig, '');
        if (isrc && !isrcTitleMap.has(isrc)) {
          isrcTitleMap.set(isrc, work.title);
        }
      });
    }
  });

  const isrcArray = Array.from(isrcTitleMap).map(([isrc]) => isrc);
  const existingTracks = await Track.find({ clientId, isrc: { $in: isrcArray } }).lean();
  const existingIsrcs = existingTracks.map((existingTrack) => existingTrack.isrc);
  const missingIsrcs = isrcArray.filter((isrc) => !existingIsrcs.includes(isrc));

  for (const isrc of missingIsrcs) {
    const title = isrcTitleMap.get(isrc);
    const track = new Track({ clientId, isrc, title });
    try {
      await track.save();
    } catch (err) {
      logger.error(`Error saving track '${title}' for client '${clientId}': ${err}`);
    }
  }
}

export async function findRelatedTracks(
  work: { clientId?: unknown; trackIds?: unknown[] },
  workData: ImportRow,
  TrackModel: { find(query: Record<string, unknown>): Promise<Array<{ _id: unknown }>> },
): Promise<void> {
  const isrcs = workData.trackIsrcs?.map((isrc) => isrc.toString().replace(/[^a-zA-Z0-9]/ig, ''));
  if (!isrcs?.length) return;
  const tracks = await TrackModel.find({ clientId: work.clientId, isrc: { $in: isrcs } });
  work.trackIds = tracks.map((track) => String(track._id));
}

function addLineNumberToImportArray(array: ImportRow[]): void {
  array.forEach((item, line) => {
    item.line = line + 3;
  });
}

function arrayToBatches(array: ImportRow[], batchSize: number): ImportRow[][] {
  const batches: ImportRow[][] = [];
  for (let index = 0; index < array.length; index += batchSize) {
    batches.push(array.slice(index, index + batchSize));
  }
  return batches;
}

export async function withConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (queue.length > 0) await fn(queue.shift()!);
    }),
  );
}

export function writeIndexedObjectToFile(indexed: IndexedObject, name: string): Promise<string> {
  logger.debug(`Writing ${name} indexed object to file..`);
  return new Promise<string>((resolve, reject) => {
    const outputLocation = `${appRootDir}/tmp/${name}_${moment().format('x')}.jsonl`;
    const file = fs.createWriteStream(outputLocation);
    for (const [key, rows] of Object.entries(indexed)) {
      file.write(`${JSON.stringify({ key, rows })}\n`);
    }
    file.write('Last_Line_Ignore');
    file.on('error', reject);
    file.end(() => {
      logger.debug(`Finished writing ${name} indexed object to file..`);
      resolve(outputLocation);
    });
  });
}

export async function readIndexedObjectForBatch(
  filePath: string,
  works: ImportRow[],
  identifiers: string[],
): Promise<IndexedObject> {
  const wantedKeys = new Set<string>();
  for (const work of works) {
    for (const id of identifiers) {
      const val = work[id as keyof ImportRow];
      if (val) wantedKeys.add(`${id}_${String(val)}`);
    }
  }
  const result: IndexedObject = {};
  const rl = createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of rl) {
    if (line !== 'Last_Line_Ignore') {
      const entry = JSON.parse(line) as { key: string; rows: ImportRow[] };
      if (wantedKeys.has(entry.key)) {
        result[entry.key] = entry.rows;
      }
    }
  }
  return result;
}

function removeUnpopulatedObjects(array: ImportRow[]): ImportRow[] {
  array.map((object, index) => {
    if (!isObjectPopulated(object)) {
      array.splice(index, 1);
    }
  });
  return array;
}
