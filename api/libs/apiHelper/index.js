const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { throwError } = require('../errors');

const Payee = require('../../models/payee');

const getPaginationParams = ({ query, defaultOrderBy = '', defaultOrderDir = 'asc', selectFields, populate }) => ({
  page: Page.valueOrDefault(query?.page, 1),
  limit: Page.valueOrDefault(query?.limit, 25),
  sort: Page.sortOrDefault(query?.orderBy || defaultOrderBy, query?.orderDir || defaultOrderDir),
  ...(selectFields && { select: selectFields }),
  ...(populate && { populate }),
  lean: true,
});

const getFormattedMetadata = ({ data, dataName }) => ({
  [dataName || 'docs']: data?.docs || [],
  meta: {
    currentPage: data?.page || 0,
    totalPages: data?.pages || 0,
    total: data?.total || 0,
  },
});

const checkReadAccessToCatalogue = ({ curveUser }) => {
  if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
    throwError({ message: 'Forbidden', code: 403 });
  }
};

const checkWriteAccessToCatalogue = async ({ curveUser, document }) => {
  if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document, clientOnly: true })) {
    throwError({ message: 'Forbidden', code: 403 });
  }
};

const errorHandler = (err, res) => {
  const status = err.code || 500;
  const message = status === 500 || !err.message ? 'Internal error, please try again' : err.message;
  const code = err.cause;

  logger.error(err);
  res.status(status).json({ code, message });
};

module.exports = {
  getPaginationParams,
  getFormattedMetadata,
  checkReadAccessToCatalogue,
  checkWriteAccessToCatalogue,
  errorHandler,
};
