const throwError = ({ message, code, cause, details }) => {
  const error = new Error(message);

  if (code) error.code = code;

  if (cause) error.cause = cause;

  if (details) error.details = details;

  throw error;
};

module.exports = { throwError };
