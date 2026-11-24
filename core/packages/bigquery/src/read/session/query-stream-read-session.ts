import { BigQuery, RowMetadata } from '@google-cloud/bigquery';
import { ResourceStream } from '@google-cloud/paginator';
import { logger } from '@curveroyaltysystems/logger';
import { BigQueryReadSession } from './read-session';
import { Query } from '../../query-builder/query-builder';
import { BigQueryLabels } from '../../client/labels';

/**
 * Uses QueryStreams to load batches of data for processing
 */
export class QueryStreamReadSession<T> implements BigQueryReadSession<T>{

  private readonly stream: ResourceStream<RowMetadata>

  private readonly chunkSize: number | null;

  private buffer: T[] = [];
  
  private ended = false;
  
  private pendingResolve?: () => void;
  
  constructor(bigQuery: BigQuery, query: Query | string, labels: BigQueryLabels, chunkSize?: number) {
    if (chunkSize === undefined || chunkSize === null) {
      this.chunkSize = null;
    } else if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
      throw new Error('Chunk size must be a whole number greater than 0');
    } else {
      this.chunkSize = chunkSize;
    }

    if (typeof query === 'string') {
      query = {
        query,
        params: {},
      }
    }

    this.stream = bigQuery.createQueryStream({
      labels,
      ...query,
    });

    // Ensure the stream is in flowing mode off initially
    this.stream.pause();

    this.stream.on('data', (row) => {
      this.buffer.push(row);

      // If we have enough data, pause the stream
      if (this.chunkSize != null && this.buffer.length >= this.chunkSize) {
        this.stream.pause();
        if (this.pendingResolve) {
          this.pendingResolve();
          this.pendingResolve = undefined;
        }
      }
    });

    this.stream.on('end', () => {
      this.ended = true;
      if (this.pendingResolve) {
        this.pendingResolve();
        this.pendingResolve = undefined;
      }
    });

    this.stream.on('error', (err) => {
      logger.error('Stream error:', err);
      this.ended = true;
      if (this.pendingResolve) {
        this.pendingResolve();
        this.pendingResolve = undefined;
      }
    });
  }

  setup(): Promise<void> {
    return Promise.resolve();
  }

  async read(): Promise<T[]> {
    if (this.buffer.length === 0 && this.ended) {
      return []; // no more data
    }

    // Resume the stream to keep reading if buffer is empty
    if (!this.ended && (this.chunkSize === null || this.buffer.length < this.chunkSize)) {
      this.stream.resume();
      await new Promise<void>((resolve) => {
        this.pendingResolve = resolve;
      });
    }

    return this.buffer.splice(0, this.chunkSize ?? this.buffer.length);
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}

