import { Readable } from 'stream';

/**
 * Creates a Readable that data can be manually pushed to. To push data, call the `pushData` function. Once all the
 * elements have been added to the stream, `endStream` must be called
 */
export class PushReadable<T> extends Readable {
  private readonly queue: T[] = [];

  private readonly highWaterMark: number;

  private waiting: (() => void) | null = null;

  private resolveDrain: (() => void) | null = null;

  private endPromiseResolve: (() => void) | null = null;

  private ended = false;

  constructor(highWaterMark: number = 10000) {
    super({ objectMode: true });
    this.highWaterMark = highWaterMark;
  }

  _read(): void {
    if (this.queue.length > 0) {
      const chunk = this.queue.shift()!;
      const canPush = this.push(chunk);

      // Resolve backpressure if buffer drained below highWaterMark
      if (this.resolveDrain && this.queue.length < this.highWaterMark) {
        this.resolveDrain();
        this.resolveDrain = null;
      }

      if (canPush) {
        setImmediate(() => this._read());
      } else {
        this.once('drain', () => this._read());
      }
    } else if (this.ended) {
      // Stream has ended and queue is empty
      this.push(null);
      if (this.endPromiseResolve) {
        this.endPromiseResolve();
        this.endPromiseResolve = null;
      }
    } else {
      // Wait for more data
      this.waiting = () => {
        this.waiting = null;
        this._read();
      };
    }
  }

  /**
   * Push data into the buffer. A Promise that resolves once the data is accepted by the stream.
   */
  pushData(data: T): Promise<void> {
    if (this.ended) throw new Error('Cannot push after endStream()');

    this.queue.push(data);

    if (this.waiting) this.waiting();

    if (this.queue.length >= this.highWaterMark) {
      if (!this.resolveDrain) {
        return new Promise<void>(resolve => {
          this.resolveDrain = resolve;
        });
      }
    }

    return Promise.resolve();
  }

  /**
   * Ends the stream. Returns a Promise that resolves once all queued data is processed.
   */
  endStream(): Promise<void> {
    this.ended = true;

    if (this.waiting) {
      // Stream was waiting for data, wake it up
      this.waiting();
    } else {
      // No one has started reading yet — trigger _read manually
      setImmediate(() => this._read());
    }

    if (this.queue.length === 0) {
      return Promise.resolve();
    }

    return new Promise(resolve => {
      this.endPromiseResolve = resolve;
    });
  }
}