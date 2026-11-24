/* eslint-disable no-restricted-syntax */
require('dotenv').config();
const winston = require('winston');
const WinstonCloudWatch = require('winston-cloudwatch');
const { inspect } = require('util');
const { AsyncLocalStorage } = require('node:async_hooks');
const { v4 } = require('uuid');
const util = require('util');

const { format, transports } = winston;

const loggingContextStorage = new AsyncLocalStorage();

/**
 * This function creates the underlying Winston logger we use to log messages. Based on the Cloud Environment, this
 * will create loggers with different configurations.
 * In AWS, this will create a logger which produces JSON logs, which are pushed directly to CloudWatch.
 * In GCP, this will create a logger which produces JSON logs, which are logged to the console. Some JSON keys are
 * modified to match the special keys expected by Logs Explorer {@link https://cloud.google.com/logging/docs/structured-logging}
 * Locally, this will create a logger which produces text logs, which are logged to the console. A custom format is
 * provided to log the timestamp, as well as the level and the message.
 * @param {string} cloudEnvironment The environment we are currently running in
 * @param {string} level The minimum level to log at
 * @return {winston.Logger} The logger implementation
 */
const createLogger = (cloudEnvironment, level) => {
  if (cloudEnvironment === 'aws') {
    // Generate random number between 1 and 999999 for stream name
    const min = 1;
    const max = 999999;
    const randomNumber = Math.floor(Math.random() * (max - min) + min);

    // In AWS, we push JSON formatted logs directly to CloudWatch
    return winston.createLogger({
      level,
      format: format.combine(
        format.timestamp(),
        errorFormatter(),
        format.json(),
      ),
      transports: [
        new WinstonCloudWatch({
          awsOptions: {
            credentials: {
              accessKeyId: process.env.S3_access_key,
              secretAccessKey: process.env.S3_secret_key,
            },
            region: process.env.S3_region,
          },
          logGroupName: `${process.env.logGroupName}-${process.env.logStreamName}`,
          logStreamName: `${process.env.logStreamName}-${randomNumber}`,
          jsonMessage: true,
        }),
      ],
    });
  }

  // In GCP, we push logs to the console, and these will then be shipped to Log Explorer by default.
  // We also modify the severity to match Googles JSON logging structure.
  if (cloudEnvironment === 'gcp') {
    return winston.createLogger({
      level,
      format: format.combine(
        format.timestamp(),
        errorFormatter(),
        gcpFormatter(),
        format.json(),
      ),
      transports: [new transports.Console({ forceConsole: true })],
    });
  }

  // Locally, we push logs to the console. This formatter will also print the timestamp, and colorize the output.
  // Any logging context is ignored in this implementation.
  return winston.createLogger({
    level,
    format: format.combine(
      format.timestamp(),
      errorFormatter(),
      format.colorize({ all: true }),
      format.printf(consolePrint),
    ),
    transports: [new transports.Console({ forceConsole: true })],
  });
};

/**
 * Creates a formatting function, which formats any Error classes that have been passed to the logger
 */
const errorFormatter = format((info, opts) => {
  if (info.error && info.error instanceof Error) {
    if (!info.message) {
      info.message = info.error.message;
    }
    info.stack = inspect(info.error);
    delete info.error;
  }

  return info;
});

/**
 * Creates a formatting function, which mutates any logs to match GCPs structured logging standard
 * {@link https://cloud.google.com/logging/docs/structured-logging}
 */
const gcpFormatter = format((info, opts) => {
  if (info.level) {
    info.severity = info.level.toUpperCase();
    delete info.level;
  }

  return info;
});

/**
 * @typedef {import('logform').TransformableInfo} TransformableInfo
 */
/**
 * Formats log information to a text line for printing to the console
 * @param {TransformableInfo} info The log info
 * @return {string} A formatted string describing the log
 */
const consolePrint = (info) => {
  let output = '';

  if (info.timestamp) {
    output += `${info.timestamp}: `;
  }
  if (info.level) {
    output += `${info.level} - `;
  }
  if (info.message) {
    output += `${info.message}`;
  }
  if (info.stack) {
    output += `\n${info.stack}`;
  }
  return output;
};

/**
 * Concatenate all the arguments together into a message
 * @param {any[]} args The arguments to concatenate
 * @return {string} The message generated
 */
const concatArgs = (args) => {
  const messages = [];
  args.forEach((arg) => {
    if (typeof (arg) !== 'object') {
      messages.push(`${arg}`);
    } else if (arg instanceof Error) {
      messages.push(`\n${util.format(arg)}`);
    } else {
      messages.push(JSON.stringify(arg, null, 2));
    }
  });
  return messages.join(' ');
};

/**
 * Returns an object containing a list of the provided arguments with the last element removed, if it is an error
 * @param {any[]} args The arguments to check
 * @return {{args: any[]}, {error: Error | undefined}} An object containing the checked args, and an error extracted
 */
const extractMessageAndError = (args) => {
  let messageArgs = args ?? [];
  let error;
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
 * Produces a Logger, which wraps another implementation
 */
const Logger = function () {
  const environment = process.env?.environmentName?.toLowerCase();
  const cloudEnvironment = process.env?.CLOUD_ENVIRONMENT?.toLowerCase();
  const level = environment === 'production' ? 'info' : 'debug';

  const logger = createLogger(cloudEnvironment, level);

  /**
   * Logs a list of arguments at info level.
   * If the last element is an Error, the stack and cause will be printed at the end of the message.
   * @param {...any} args The arguments to log
   */
  this.info = (...args) => {
    const { message, error } = extractMessageAndError(args);
    logger.info({
      message,
      error,
      ...this.getContext(),
    });
  };

  /**
   * Logs a list of arguments at error level.
   * If the last element is an Error, the stack and cause will be printed at the end of the message.
   * @param {...any} args The arguments to log
   */
  this.error = (...args) => {
    const { message, error } = extractMessageAndError(args);
    logger.error({
      message,
      error,
      ...this.getContext(),
    });
  };

  /**
   * Logs a list of arguments at debug level.
   * If the last element is an Error, the stack and cause will be printed at the end of the message.
   * @param {...any} args The arguments to log
   */
  this.debug = (...args) => {
    if (level !== 'debug') return;
    const { message, error } = extractMessageAndError(args);
    logger.debug({
      message,
      error,
      ...this.getContext(),
    });
  };

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
  this.runInContext = (initialContext, fn) => loggingContextStorage.run({ ...initialContext, loggingContextId: v4() }, fn);

  /**
   * Returns the current context. Returns undefined if there is no current context
   * @return {Object.<string, any> | undefined} The current context
   */
  this.getContext = () => loggingContextStorage.getStore();

  /**
   * Pushes some data to the current context, if a context exists.
   * @param {Object.<string, any>} obj Any key-value pairs to push to the context
   */
  this.addToContext = (obj) => {
    const store = this.getContext();
    if (!store) return;

    Object.entries(obj).forEach(([key, value]) => {
      store[key] = value;
    });
  };
};

module.exports = {
  logger: new Logger(),
};
