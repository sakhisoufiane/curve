class CurveError extends Error {
  /**
   * Create a new instance of a Curve Error.
   *
   * @param {string} message - The error message
   * @param {string} statusCode - The code defining what the error is
   * @param {string} [userMessage] - The user-friendly message to display on the front-end. If this is not set, the message will be used instead.
   * @param {Error} [cause] - The cause of the error
   */
  constructor({ message, statusCode, userMessage, cause }) {
    super(message);
    this.statusCode = statusCode;
    this.userMessage = userMessage ?? message;
    if (cause) this.cause = cause;
  }
}

const ERROR_CODES = Object.freeze({
  salesTemplateNotMatched: 'SALES_TEMPLATE_NOT_MATCHED',
});

module.exports = { CurveError, ERROR_CODES };
