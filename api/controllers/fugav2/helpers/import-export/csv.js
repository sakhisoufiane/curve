const fs = require('fs');
const csvWriter = require('csv-write-stream');
const { get: safeGet } = require('lodash');
const { csvTrackRowSchema } = require('./validator');
const { throwError } = require('../../../../libs/errors');

const MIN_PAYEE_COLUMNS = 10;

const createTrackCSVWriter = (filePath) => {
  const headers = ['ID', 'Asset Title', 'Artists', 'Alternative ID', 'ISRC'];

  for (let i = 1; i <= MIN_PAYEE_COLUMNS; i++) {
    headers.push(`Payee Name ${i}`, `Payee Email ${i}`, `Payee Participation ${i}`);
  }

  const writer = csvWriter({ headers });
  const writeStream = fs.createWriteStream(filePath, 'utf8');
  writer.pipe(writeStream);

  return writer;
};

const createErrorCSVWriter = (filePath) => {
  const headers = ['ID', 'Asset Title', 'Artists', 'Alternative ID', 'ISRC', 'Errors'];
  const writer = csvWriter({ headers });
  const writeStream = fs.createWriteStream(filePath, 'utf8');
  writer.pipe(writeStream);

  return writer;
};

const formatTrackAsCSVRow = (track) => {
  const csvRow = [
    safeGet(track, 'id', ''),
    safeGet(track, 'title', ''),
    safeGet(track, 'artist', ''),
    safeGet(track, 'alternativeId', ''),
    safeGet(track, 'isrc', ''),
  ];

  for (let i = 0; i < 10; i++) {
    if (i < safeGet(track, 'payees.length', 0)) {
      csvRow.push(
        safeGet(track, `payees[${i}].name`, ''),
        safeGet(track, `payees[${i}].email`, ''),
        safeGet(track, `payees[${i}].percentage`, ''),
      );
    } else {
      csvRow.push('', '', '');
    }
  }

  return csvRow;
};

const formatErrorAsCSVRow = (track, errors) => {
  const errorMessages = Array.isArray(errors) ? errors.join(', ') : 'Unknown error';

  return [
    safeGet(track, 'id', ''),
    safeGet(track, 'title', ''),
    safeGet(track, 'artist', ''),
    safeGet(track, 'alternativeId', ''),
    safeGet(track, 'isrc', ''),
    errorMessages,
  ];
};

const validateHeaders = (headers) => {
  const REQUIRED_HEADERS = ['ID', 'Asset Title', 'Artists', 'Alternative ID', 'ISRC'];

  const basicHeaders = headers.slice(0, REQUIRED_HEADERS.length);
  const payeeHeaders = headers.slice(REQUIRED_HEADERS.length);

  const basicHeadersInvalid = REQUIRED_HEADERS.filter((header, idx) => basicHeaders[idx] !== header);

  if (basicHeadersInvalid.length > 0) {
    throwError({
      message: '`File validation error. Incorrect headers.',
      code: 400,
      details: `Incorrect headers: ${basicHeadersInvalid.join(', ')}`,
      cause: 'INVALID_FILE',
    });
  }

  const validationResult = validatePayeeHeaders(payeeHeaders, MIN_PAYEE_COLUMNS);

  if (!validationResult.success) {
    throwError({
      message: 'File validation error.',
      code: 400,
      details: ` ${validationResult.errMessage}`,
      cause: 'INVALID_FILE',
    });
  }
};

const validatePayeeHeaders = (payeeHeaders, minLength) => {
  if (payeeHeaders.length < minLength) {
    return {
      success: false,
      errMessage: `File validation error. Expected to find at least ${minLength} payee slots.`,
    };
  }

  const PAYEE_NAME_PATTERN = /^Payee Name \d+$/;
  const PAYEE_EMAIL_PATTERN = /^Payee Email \d+$/;
  const PAYEE_PARTICIPATION_PATTERN = /^Payee Participation \d+$/;

  const PAYEE_HEADER_CHUNK_LENGTH = 3;
  let payeeHeaderValid = true;

  for (let i = 0; i < payeeHeaders.length; i += PAYEE_HEADER_CHUNK_LENGTH) {
    payeeHeaderValid = PAYEE_NAME_PATTERN.test(payeeHeaders[i]) && PAYEE_EMAIL_PATTERN.test(payeeHeaders[i + 1]) && PAYEE_PARTICIPATION_PATTERN.test(payeeHeaders[i + 2]);

    if (!payeeHeaderValid) {
      break;
    }
  }

  if (!payeeHeaderValid) {
    return {
      success: false,
      errMessage: `File validation error. One of payee headers invalid. Payee headers should contain: ${PAYEE_NAME_PATTERN} ${PAYEE_EMAIL_PATTERN} ${PAYEE_PARTICIPATION_PATTERN}.`,
    };
  }

  return { success: true };
};

const validateRow = (row) => {
  const result = csvTrackRowSchema.safeParse(row);

  if (!result.success) {
    const { error } = result;

    const errors = error.issues?.map((err) => `${err.path.join('.')}: ${err.message}`);

    throw new Error(`Row validation error; some fields are not valid: ${JSON.stringify(errors)}`);
  }
};

const extractPayeesFromRow = (row) => {
  const payees = [];
  let payeeIndex = 1;

  while (row[`Payee Name ${payeeIndex}`] !== undefined) {
    const name = row[`Payee Name ${payeeIndex}`]?.trim() || '';
    const email = row[`Payee Email ${payeeIndex}`]?.trim() || '';
    const percentageStr = row[`Payee Participation ${payeeIndex}`]?.trim() || '';

    const isEmptyChunk = !name && !email && !percentageStr;

    if (!isEmptyChunk) {
      payees.push({
        name,
        email,
        percentage: percentageStr ? parseFloat(percentageStr) : 0,
      });
    }

    payeeIndex++;
  }

  return payees;
};

const validatePayees = (payees) => {
  const invalidPayees = payees.filter((payee) => !(payee.name && payee.email && payee.percentage));

  if (invalidPayees.length > 0) {
    throw new Error(`Invalid payee data. Payee should have a name, email and percentage fields. Received: ${JSON.stringify(invalidPayees)}`);
  }

  const result = validatePayeePercentages(payees);

  if (!result.success) {
    throw new Error(result.error);
  }
};

const validatePayeePercentages = (payees) => {
  const totalPercentage = payees.reduce((sum, payee) => sum + (payee.percentage || 0), 0);

  if (totalPercentage > 100) {
    return {
      success: false,
      error: `Total payee percentages exceed 100% (current total: ${totalPercentage}%)`,
    };
  }

  return { success: true };
};

module.exports = {
  formatTrackAsCSVRow,
  formatErrorAsCSVRow,
  createTrackCSVWriter,
  createErrorCSVWriter,
  extractPayeesFromRow,
  validateHeaders,
  validatePayees,
  validateRow,
};
