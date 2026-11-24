import { type Company, type CompanyFormData } from '@/api/companies';

/** Empty form values for the "new company" page. */
export const emptyCompanyFormValues: CompanyFormData = {
  name: '',
  foreignId: '',
  feesInvoiceCustomText: '',
  companyName: '',
  address: '',
  email: '',
  statementCustomText: '',
  statementOfAccountCustomText: '',
  selfBillingTaxText: '',
  selfBillingTaxCustomText: '',
  vatNo: '',
  statementDesign: '',
  statementHeaderType: '',
  salesReportTemplate: '',
  costsReportTemplate: '',
  statementIncludeTotalsRow: false,
  suppressZeroValueInExport: false,
  suppressStatementOfAccount: false,
  displaySeparatedDeductions: false,
  customDeductionName: '',
};

/** Maps a loaded Company to the flat form shape, normalising nulls. */
export function companyToFormValues(company: Company): CompanyFormData {
  return {
    name: company.name ?? '',
    foreignId: company.foreignId ?? '',
    feesInvoiceCustomText: company.feesInvoiceCustomText ?? '',
    companyName: company.companyName ?? '',
    address: company.address ?? '',
    email: company.email ?? '',
    statementCustomText: company.statementCustomText ?? '',
    statementOfAccountCustomText: company.statementOfAccountCustomText ?? '',
    selfBillingTaxText: company.selfBillingTaxText ?? '',
    selfBillingTaxCustomText: company.selfBillingTaxCustomText ?? '',
    vatNo: company.vatNo ?? '',
    statementDesign: company.statementDesign ?? '',
    statementHeaderType: company.statementHeaderType ?? '',
    salesReportTemplate: company.salesReportTemplate ?? '',
    costsReportTemplate: company.costsReportTemplate ?? '',
    statementIncludeTotalsRow: company.statementIncludeTotalsRow ?? false,
    suppressZeroValueInExport: company.suppressZeroValueInExport ?? false,
    suppressStatementOfAccount: company.suppressStatementOfAccount ?? false,
    displaySeparatedDeductions: company.displaySeparatedDeductions ?? false,
    customDeductionName: company.customDeductionName ?? '',
  };
}
