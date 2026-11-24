/* eslint-disable no-await-in-loop */
const axios = require('axios').default;
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

axios.defaults.headers.common['Content-Type'] = 'application/x-www-form-urlencoded';

const { FUGA_NAME } = process.env;
const { FUGA_PASSWORD } = process.env;

const refreshFugaAuthCookie = async () => {
  let response;
  let tries = 5;

  while (tries > 0) {
    try {
      const params = new URLSearchParams();
      params.append('name', FUGA_NAME);
      params.append('password', FUGA_PASSWORD);
      response = await axios.post('https://fugamusic.com/fuga/login', params, {
        headers: { Cookie: '' }, 'Content-Type': 'application/x-www-form-urlencoded' });
      axios.defaults.headers.common.Cookie = response.headers['set-cookie'][0];
      break;
    } catch (err) {
      logger.error(err);
      tries -= 1;
    }
  }
};

const validateFugaOrgId = async ({ fugaOrgId }) => {
  await refreshFugaAuthCookie();

  const response = await axios.get(`https://fugamusic.com/fuga/core/organization?id=${fugaOrgId}&_headers_only=true`);
  if (response.status === 200) {
    return true;
  }
  return false;
};

module.exports = {
  validateFugaOrgId,
};
