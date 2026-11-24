const { CwrDeliveryController } = require('@curveroyaltysystems/curve-shared-logic');

const CwrDelivery = require('../../../models/cwrDelivery');
const DeliveryPartner = require('../../../models/deliveryPartner');
const Work = require('../../../models/work');
const DeliverySchedule = require('../../../models/deliverySchedule');
const TerritoryGroup = require('../../../models/territoryGroup');
const DeliveredWork = require('../../../models/deliveredWork');

/**
 * Builds a works filter for CWR delivery exports.
 * @todo This is a temporary wrapper around the legacy CwrDeliveryController.buildWorksFilter method until the CSL methods are extracted to this module fully.
 * @param {Object} params - The parameters for building the filter.
 * @param {Object} params.delivery - The delivery object.
 * @returns {Object} - The constructed works filter.
 */
async function buildWorksFilter({ delivery }) {
  const filter = await CwrDeliveryController.buildWorksFilter({
    status: 'All',
    delivery,
    DeliveryPartner,
    Work,
    DeliverySchedule,
    CwrDelivery,
    TerritoryGroup,
    DeliveredWork,
  });

  // Exclude uncontrolled works from the filter results, as these should not be included in the CWR export.
  const uncontrolledWorks = await CwrDeliveryController.getUncontrolledWorks({
    Work,
    DeliveryPartner,
    TerritoryGroup,
    DeliverySchedule,
    CwrDelivery,
    cwrDelivery: delivery,
    query: filter,
  });
  if (uncontrolledWorks.length > 0) {
    if (!filter._id) filter._id = {};
    filter._id.$nin = uncontrolledWorks.map((work) => work._id);
  }

  return filter;
}

module.exports = {
  buildWorksFilter,
};
