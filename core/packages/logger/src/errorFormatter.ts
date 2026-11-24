import { format } from 'winston';
import { TransformableInfo } from 'logform';
import { inspect } from 'util';

/**
 * Creates a formatting function, which formats any Error classes that have been passed to the logger
 */
const errorFormatter = format((info: TransformableInfo & { error?: unknown, stack?: string }) => {
  if (info.error && info.error instanceof Error) {
    if (!info.message) {
      info.message = info.error.message;
    }
    info.stack = inspect(info.error);
    delete info.error;
  }

  return info;
});

export default errorFormatter;
