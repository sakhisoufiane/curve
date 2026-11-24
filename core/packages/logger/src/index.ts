import { Logger as WinstonLogger } from 'winston';
import WinstonCloudWatch from 'winston-cloudwatch';
import { format } from 'util';
import { AsyncLocalStorage } from 'node:async_hooks';
import { v4 } from 'uuid';
import createAwsLogger from './aws';
import createGcpLogger from './gcp';
import createLocalLogger from './local';

type LoggingContext = Record<string, string> & { loggingContextId: string };
const loggingContextStorage = new AsyncLocalStorage<LoggingContext>();

type CloudEnvironment = 'aws' | 'gcp' | undefined;

/**
 * This function creates the underlying Winston logger we use to log messages. Based on the Cloud Environment, this
 * will create loggers with different configurations.
 * In AWS, this will create a logger which produces JSON logs, which are pushed directly to CloudWatch.
 * In GCP, this will create a logger which produces JSON logs, which are logged to the console, with some modification
 * to some JSON keys.
 * Locally, this will create a logger which produces text logs, which are logged to the console. A custom format is
 * provided to log the timestamp, as well as the level and the message.
 * @param cloudEnvironment The environment we are currently running in
 * @param level The minimum level to log at
 * @return The logger implementation
 */
const createWinstonLogger = (cloudEnvironment: CloudEnvironment, level: string): WinstonLogger => {
  if (cloudEnvironment === 'aws') {
    return createAwsLogger(level);
  }
  if (cloudEnvironment === 'gcp') {
    return createGcpLogger(level);
  }
  return createLocalLogger(level);
};

/**
 * Concatenate all the arguments together into a message
 * @param args The arguments to concatenate
 * @return The message generated
 */
const concatArgs = (args: unknown[]): string => {
  const messages: string[] = [];
  args.forEach((arg) => {
    if (typeof (arg) !== 'object') {
      messages.push(`${arg}`);
    } else if (arg instanceof Error) {
      messages.push(`\n${format(arg)}`);
    } else {
      messages.push(JSON.stringify(arg, null, 2));
    }
  });
  return messages.join(' ');
};

/**
 * Returns an object containing a list of the provided arguments with the last element removed, if it is an error
 * @param args The arguments to check
 * @return An object containing the checked args, and an error extracted
 */
const extractMessageAndError = (args: unknown[]): { message: string, error?: Error } => {
  let messageArgs = args ?? [];
  let error: Error | undefined;
  if (args && args.length !== 0) {
    // Grab the last element. If it's an error, chop it of the args list and use it as the error
    const lastArg = args[args.length - 1];
    if (lastArg && lastArg instanceof Error) {
      messageArgs = args.slice(0, args.length - 1);
      error = lastArg;
    }
  }

  if (error && messageArgs.length === 0) {
    return {
      message: error.message,
      error,
    };
  }

  return {
    message: concatArgs(messageArgs),
    error,
  };
};

/**
 * Interface for Logger methods
 */
interface ILogger {
  info(...args: unknown[]): void;
  error(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  runInContext<T>(initialContext: Record<string, string>, fn: () => T): T;
  getContext(): Record<string, string> | undefined;
  addToContext(obj: Record<string, string>): void;
}

/**
 * Produces a Logger, which wraps another implementation
 */
class Logger implements ILogger {
  private _logger: WinstonLogger | null = null;

  private readonly cloudEnvironment: CloudEnvironment;

  private readonly level: string;

  constructor() {
    const environment = process.env?.environmentName?.toLowerCase();
    this.cloudEnvironment = process.env?.CLOUD_ENVIRONMENT?.toLowerCase() as CloudEnvironment;
    this.level = environment === 'production' ? 'info' : 'debug';
  }

  private get winstonLogger(): WinstonLogger {
    if (!this._logger) {
      this._logger = createWinstonLogger(this.cloudEnvironment, this.level);
    }
    return this._logger;
  }

  /**
   * Logs a list of arguments at error level.
   * If the last element is an Error, the stack and cause will be printed at the end of the message.
   * @param args The arguments to log
   */
  error(...args: unknown[]): void {
    const { message, error } = extractMessageAndError(args);
    this.winstonLogger.error({
      message,
      error,
      ...this.getContext(),
    });
  }

  /**
   * Logs a list of arguments at info level.
   * If the last element is an Error, the stack and cause will be printed at the end of the message.
   * @param args The arguments to log
   */
  warn(...args: unknown[]): void {
    const { message, error } = extractMessageAndError(args);
    this.winstonLogger.warn({
      message,
      error,
      ...this.getContext(),
    });
  }

  /**
   * Logs a list of arguments at info level.
   * If the last element is an Error, the stack and cause will be printed at the end of the message.
   * @param args The arguments to log
   */
  info(...args: unknown[]): void {
    const { message, error } = extractMessageAndError(args);
    this.winstonLogger.info({
      message,
      error,
      ...this.getContext(),
    });
  }

  /**
   * Logs a list of arguments at debug level.
   * If the last element is an Error, the stack and cause will be printed at the end of the message.
   * @param args The arguments to log
   */
  debug(...args: unknown[]): void {
    if (this.level !== 'debug') return;
    const { message, error } = extractMessageAndError(args);
    this.winstonLogger.debug({
      message,
      error,
      ...this.getContext(),
    });
  }

  /**
   * Creates a new logging context, which will be available to the given function if {@link getContext} is called.
   * Any parameters provided to {@link addToContext} will be added to the log message (if using Structured Logging).
   *
   * @example
   * logger.runInContext({ salesFileId: '1234' }, () => {
   *   logger.info('Hello'); // Results in { message: 'Hello', salesFileId: '1234' }
   *   addToContext({ taskId: '5678' });
   *   logger.info('World'); // Results in { message: 'World', salesFileId: '1234', taskId: '5678' }
   * });
   * logger.info('Foo Bar'); // Results in { message: 'Foo Bar' }
   */
  runInContext<T>(initialContext: Record<string, string>, fn: () => T): T {
    return loggingContextStorage.run({ ...initialContext, loggingContextId: v4() }, fn);
  }

  /**
   * Returns the current context. Returns undefined if there is no current context
   * @return The current context
   */
  getContext(): Record<string, string> | undefined {
    return loggingContextStorage.getStore();
  }

  /**
   * Pushes some data to the current context, if a context exists.
   * @param obj Any key-value pairs to push to the context
   */
  addToContext(obj: Record<string, string>): void {
    const store = this.getContext();
    if (!store) return;

    Object.entries(obj).forEach(([key, value]) => {
      store[key] = value;
    });
  }

  /**
   * Flush the logger. This will wait for any pending logs to be pushed to their destination.
   */
  async flush(): Promise<void> {
    if (!this._logger) return;
    const logger = this._logger;
    this._logger = null;

    const cloudWatchTransport = logger.transports.find(
      (t): t is WinstonCloudWatch => t instanceof WinstonCloudWatch
    );

    if (cloudWatchTransport) {
      await new Promise<void>((resolve) => {
        cloudWatchTransport.kthxbye(() => resolve());
      });
    }

    return new Promise((resolve) => {
      logger.on('finish', resolve);
      logger.end();
    });
  }
}

export const logger = new Logger();
