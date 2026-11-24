import fs from 'fs';
import { stringify } from 'csv-stringify/sync';
// @ts-expect-error — no type declarations for @curveroyaltysystems/models/mongoose
import { isValidObjectId } from '@curveroyaltysystems/models/mongoose';

type CsvRow = (string | number | boolean | null | undefined | object)[];

export async function closeStream(csvStream: fs.WriteStream): Promise<void> {
  const finished = new Promise<void>((resolve, reject) => {
    const onFinish = () => {
      csvStream.removeListener('error', onError);
      resolve();
    };
    const onError = (err: Error) => {
      csvStream.removeListener('finish', onFinish);
      reject(err);
    };
    csvStream.once('finish', onFinish);
    csvStream.once('error', onError);
  });
  csvStream.end();
  await finished;
}

export function writeCsvLine(
  csvStream: fs.WriteStream,
  arrayLine: CsvRow,
  { format = null, bom = false }: { format?: string | null; bom?: boolean } = {},
): void {
  const delimiter = format === 'EU Decimal Comma' ? ';' : ',';
  const lineStr = stringify([arrayLine], {
    delimiter,
    bom,
    cast: {
      object: (value: unknown) => {
        if (isValidObjectId(value) && typeof value !== 'string') return String(value);
        if (Array.isArray(value)) return value.join(',');
        return JSON.stringify(value);
      },
      boolean: (value: boolean) => (value ? 'TRUE' : 'FALSE'),
    },
  });
  csvStream.write(lineStr);
}

export function createStream(filePath: string, headers: string[]): fs.WriteStream {
  const stream = fs.createWriteStream(filePath);
  writeCsvLine(stream, headers, { bom: true });
  return stream;
}
