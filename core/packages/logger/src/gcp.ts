import { createLogger, format, Logger, transports } from 'winston';
import { TransformableInfo } from 'logform';
import errorFormatter from './errorFormatter';

/**
 * Creates a logger that reformats messages to conform to Googles JSON logging structure:
 * {@link https://cloud.google.com/logging/docs/structured-logging}
 * Logs will be printed to the console, which will be shipped to Log Explorer and Datadog.
 * @param level The minimum level of logs to log
 * @return The logger implementation
 */
const createGcpLogger = (level: string): Logger => createLogger({
  level,
  format: format.combine(
    format.timestamp(),
    errorFormatter(),
    gcpFormatter(),
    format.json(),
  ),
  transports: [new transports.Console({ forceConsole: true })],
});

/**
 * Creates a formatting function, which mutates any logs to match GCPs structured logging standard
 * {@link https://cloud.google.com/logging/docs/structured-logging}
 */
const gcpFormatter = format((info: TransformableInfo & { severity?: string }) => {
  if (info.level) {
    info.severity = info.level.toUpperCase();
  }

  return info;
});

export default createGcpLogger;
