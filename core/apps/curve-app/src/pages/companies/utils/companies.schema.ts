import { z } from 'zod';

/**
 * Validation for the company edit/new form.
 *
 * The API is the source of truth: `name` is the only field it enforces
 * (schema `required: true`, plus a pre-save uniqueness check per client), so
 * it's the only field validated or marked required here. Every other field is
 * optional, matching the backend.
 */
export const companySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  foreignId: z.string(),
  feesInvoiceCustomText: z.string(),
  companyName: z.string(),
  address: z.string(),
  email: z.string(),
  statementCustomText: z.string(),
  statementOfAccountCustomText: z.string(),
  selfBillingTaxText: z.string(),
  selfBillingTaxCustomText: z.string(),
  vatNo: z.string(),
  statementDesign: z.string(),
  statementHeaderType: z.string(),
  salesReportTemplate: z.string(),
  costsReportTemplate: z.string(),
  statementIncludeTotalsRow: z.boolean(),
  suppressZeroValueInExport: z.boolean(),
  suppressStatementOfAccount: z.boolean(),
  displaySeparatedDeductions: z.boolean(),
  customDeductionName: z.string(),
});
