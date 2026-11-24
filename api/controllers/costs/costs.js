const _ = require('lodash');
const Cost = require('../../models/cost');
const { costParamsSchema } = require('./validators');

const getFilterOptions = async ({ clientId }) => {
  const costs = await Cost.find({ clientId, targetPeriod: { $exists: true, $ne: '' } }).select('targetPeriod').lean();
  const targetPeriods = _.uniq(costs?.map((cost) => cost.targetPeriod).filter((targetPeriod) => targetPeriod));
  return { targetPeriods };
};

const validateParams = (inputParams) => {
  const result = costParamsSchema.safeParse(inputParams);

  if (result.success) {
    return { errors: [], errored: false, success: true };
  }

  const errors = result.error.issues.map((issue) => issue.message);
  return { errors, errored: true, success: false };
};

module.exports = { getFilterOptions, validateParams };
