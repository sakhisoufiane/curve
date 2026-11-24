import { type Report } from '@/api/reports';
import { STATEMENT_DESIGNS, STATEMENT_DESIGNS_INTERNAL } from './companies.constants';

/** Statement designs available to the current user (internal users see extra designs). */
export function getStatementDesigns(isInternalUser: boolean): string[] {
  return isInternalUser ? STATEMENT_DESIGNS_INTERNAL : STATEMENT_DESIGNS;
}

/** The Costs CSV Design select is only shown to internal users on non-Publisher clients. */
export function shouldShowCostsReport(isInternalUser: boolean, clientType?: string | null): boolean {
  return isInternalUser && clientType !== 'Publisher';
}

/** Builds combobox items from the reports whose `table` matches one of the given tables. */
export function buildReportSelectItems(
  reports: Report[] | undefined,
  tables: string[]
): { label: string; value: string }[] {
  return (reports ?? [])
    .filter((r) => tables.includes(r.table))
    .map((r) => ({ label: r.name, value: r._id }));
}
