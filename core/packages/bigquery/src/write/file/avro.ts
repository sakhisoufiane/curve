import { Schema, streams } from 'avsc';
import appRoot from 'app-root-dir';
import moment from 'moment';
import { createWriteStream } from 'fs';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { LocalFileHandler } from './local-file-handler';
import { convertRecordToAvro, RecordType } from '../../util/avro-utils';
import { PushReadable } from '../../client/push-readable';
import { createEmptyFile } from '../../util/file-utils';

const appRootDir = appRoot.get();

export class AvroLocalFileHandler<RowT extends object> implements LocalFileHandler<RowT> {

  private readonly input: PushReadable<RowT>;

  private readonly pipelineResult: Promise<void>;

  readonly filePath: string;

  readonly sourceFormat = 'AVRO';

  constructor(schema: Schema,
              compression?: SupportedCompression,
              tempDir: string = `${appRootDir}/tmp`,
  ) {
    this.filePath = `${tempDir}/${moment().format('YYYYMMDDHHmmssSSSS')}${Math.random().toString(36).substring(2, 5)}.avro`;

    createEmptyFile(this.filePath);

    this.input = new PushReadable<RowT>();

    this.pipelineResult = pipeline([
      // Will generate input for the pipeline when `write` is called
      this.input,

      // Converts JSON-valid objects to Avro-valid objects
      new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
          try {
            const converted = convertRecordToAvro(chunk, schema as RecordType);
            callback(null, converted);
          } catch (err) {
            callback(err as Error);
          }
        }
      }),

      // An encoder which serializes objects to Avro Rows
      new streams.BlockEncoder(schema, {
        blockSize: 16000,
        codec: compression,
      }),

      // Write the output to a file
      createWriteStream(this.filePath)
    ]);
  }

  async write(chunk: RowT[] | RowT): Promise<void> {
    const array = Array.isArray(chunk) ? chunk : [chunk];
    for (const element of array) {
      await this.input.pushData(element);
    }
  }

  async end(): Promise<void> {
    await this.input.endStream();
    await this.pipelineResult;
  }
}


export type SupportedCompression = 'deflate';
