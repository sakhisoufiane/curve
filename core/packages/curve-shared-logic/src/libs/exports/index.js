/* eslint-disable consistent-return */
const Exports = this;
const appRootDir = require('app-root-dir').get();
const { exportExcelTemplates } = require('../../config.json');

/**
   * Returns the path to the excel file template based on the model and client
   *
   * @param {string} templateName - Name of the template (ex. client, contract..)
   * @param {string} clientId - Id of the client getting the template
   * @returns {string} - Returns the path to the excel file
   */

Exports.getTemplate = async ({ Client, templateName, clientId }) => {
  const client = clientId ? await Client.findById(clientId) : null;
  // Default to Professional Label
  const clientType = client?.clientType === 'Publisher' ? 'Publisher' : 'Label';
  const paymentTier = client?.paymentTier === 'Lite' ? 'Lite' : 'Professional';

  let shareTemplateName = templateName; // Setting param to overwrite for feature flags

  // Payee Balances Feature Flag
  if (['contract', 'mechanicalContract'].includes(templateName) && client.features.payeeBalances) {
    shareTemplateName = templateName === 'mechanicalContract' ? 'mechanicalContractPayeeBalances' : 'contractPayeeBalances';
  }

  // If it's a template specific to the client's payment tier AND type
  if (exportExcelTemplates?.[paymentTier]?.[clientType]?.[shareTemplateName]) {
    return `${appRootDir}/node_modules/@curveroyaltysystems/curve-shared-logic/dist${exportExcelTemplates[paymentTier][clientType][shareTemplateName]}`;
  }

  // If it's a template ONLY specific to the client's
  if (exportExcelTemplates?.[paymentTier]?.Shared?.[shareTemplateName]) {
    return `${appRootDir}/node_modules/@curveroyaltysystems/curve-shared-logic/dist${exportExcelTemplates[paymentTier].Shared[shareTemplateName]}`;
  }

  // If it's a template shared by ALL clients
  if (exportExcelTemplates.Shared?.[shareTemplateName]) {
    if (client?.features.payeeBalances && templateName === 'payee') {
      shareTemplateName = 'payeeWithPayeeBalances';
    }

    if (client?.features.payeeBalances && templateName === 'periodStatements') {
      shareTemplateName = 'periodStatementsPayeeBalances';
    }

    return `${appRootDir}/node_modules/@curveroyaltysystems/curve-shared-logic/dist${exportExcelTemplates.Shared[shareTemplateName]}`;
  }
};

module.exports = Exports;
