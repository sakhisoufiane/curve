import { createLogger as createWinstonLogger, format, Logger, transports } from 'winston';
import { TransformableInfo } from 'logform';
import errorFormatter from './errorFormatter';

/**
 * This creates a logger which produces text logs, which are logged to the console. A custom format is
 * provided to log the timestamp, format error messages, and handle the level and the message. Output will also be colorized.
 * @param level The minimum level to log at
 * @return The logger implementation
 */
const createLocalLogger = (level: string): Logger => createWinstonLogger({
  level,
  format: format.combine(
    format.timestamp(),
    errorFormatter(),
    format.colorize({ all: true }),
    format.printf(consolePrint),
  ),
  transports: [new transports.Console({ forceConsole: true })],
});

/**
 * Formats log information to a text line for printing to the console
 * @param info The log info
 * @return A formatted string describing the log
 */
const consolePrint = (info: TransformableInfo & {
  timestamp?: string,
  stack?: string
}): string => {
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

export default createLocalLogger;
