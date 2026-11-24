const ErrorCodes = {
  PAYMENT_ACCOUNT_DISABLED: 'This account is currently disabled. Please contact support for further assistance.',
  PAYMENT_AMOUNT_TYPE_INVALID: 'The amount type is invalid. Please contact support.',
  PAYMENT_BALANCE_NOT_AVAILABLE: 'No balance found for the specified payment currency. Please convert or top-up funds.',
  PAYMENT_BALANCE_RETRIEVAL_FAILED: 'Failed to retrieve the balance. Please try again later or contact support.',
  PAYMENT_BATCH_ID_MISSING: 'The batch ID is missing from the request. Please contact support.',
  PAYMENT_BENEFICIARY_ID_NOT_FOUND: 'The beneficiary ID cannot be found. Please verify the payee’s details and try again.',
  PAYMENT_CLIENT_PAYEE_NOT_FOUND: 'The specified payee cannot be found. Please verify the payee’s details has been added and try again.',
  PAYMENT_CONTACT_NOT_FOUND: 'This user is unauthorised to make payments on behalf of the client. Please contact support.',
  PAYMENT_CREATION_FAILED: 'The payment creation failed. Please retry or contact support if the issue persists.',
  PAYMENT_CREATION_FAILED_UNKNOWN: 'An unknown error occurred during payment creation. Please retry or contact support.',
  PAYMENT_CURRENCY_INVALID_FORMAT: 'The currency format is invalid. Please correct it and try again.',
  PAYMENT_CURRENCY_MISMATCH: 'The currency provided does not match the required currency. Please use the correct currency.',
  PAYMENT_DUPLICATE_REQUEST: 'A duplicate payment request was detected. Please try again or contact support.',
  PAYMENT_INSUFFICIENT_FUNDS: 'Your account has insufficient funds. Please add funds to complete the payment.',
  PAYMENT_INSUFFICIENT_BALANCE: 'Your account has insufficient funds. Please add funds to complete the payment.',
  PAYMENT_INVALID_BENEFICIARY_ID_FORMAT: 'The beneficiary ID format is incorrect. Please correct it and try again.',
  PAYMENT_INVALID_PAYLOAD: 'The payment data is incorrectly formatted. Please contact support for further assistance.',
  PAYMENT_PAYEE_INFORMATION_INCOMPLETE: 'The payee information is incomplete. Please provide all required details.',
  PAYMENT_PAYEE_NOT_FOUND: 'The specified payee cannot be found. Please verify the payee’s details has been added and try again.',
  PAYMENT_UNSUPPORTED_CURRENCY: 'The specified currency is not supported. Please use a supported currency.',
};

const DefaultError = 'An unknown error occurred. Please contact support for further assistance.';

const getErrorDescription = (code) => ErrorCodes[code] || DefaultError;

module.exports = { ErrorCodes, DefaultError, getErrorDescription };
