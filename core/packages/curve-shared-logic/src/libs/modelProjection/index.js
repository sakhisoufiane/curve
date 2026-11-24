/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */

const Projection = this;

/**
  * Returns the projection fields for a specific model.
  *
  * @method
  * @param {string} model - Model name
  * @param {string} type - Fields type (indexPage, editPage, clientAdminOnly...)
  * @returns {object} fields
  */

Projection.getFields = (model, type) => {
  const fields = require(`./models/${model}`)?.[type];
  return fields || {};
};

module.exports = Projection;
