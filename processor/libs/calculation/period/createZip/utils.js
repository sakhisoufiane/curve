// Used in email subject line and zip file name
const statementFileToDisplayName = {
  // When searching for statement pdfs, we also check for custom statements
  pdf: 'Statement PDFs',
  // Renamed to "Income CSV" for Publishing clients
  salesCsv: 'Sales CSV',
  costsCsv: 'Costs CSV',
  statementOfAccount: 'Statement of Account',
  feesInvoice: 'Fees Invoice',
  selfBillingInvoice: 'Self Billing Invoice',
  // Only used for certain clients
  platoonRevenueReport: 'Platoon Revenue Report',
};

function getExportDisplayName(statementFileType, clientType) {
  if (statementFileType === 'salesCsv' && clientType === 'Publisher') return 'Income CSV';
  return statementFileToDisplayName[statementFileType];
}

module.exports = {
  getExportDisplayName,
};
