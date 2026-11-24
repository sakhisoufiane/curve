/** Minimal shape of the i18next `t` function used across the companies pages. */
export type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

// ── Select option values ────────────────────────────────────────────────────
//
// IMPORTANT: these strings are an API contract. They are persisted to the
// backend, so the VALUES must never be translated or renamed.

/** Statement designs available to all users. */
export const STATEMENT_DESIGNS = [
  'Standard',
  'Standard - Catalogue Summary',
  'Standard - Extended',
  'Combined',
  'Combined - Catalogue Summary',
  'Combined - Extended',
  'Distribution',
];

/** Additional statement designs only offered to internal users. */
export const STATEMENT_DESIGNS_INTERNAL = [
  ...STATEMENT_DESIGNS,
  'Proper',
  'Just Music',
  'Topic',
  'Late Night Tales',
  'Drag City',
  'Platoon',
  'Combined Plus Release Summary',
];

export const STATEMENT_HEADER_TYPES = ['Standard', 'Include Payee Address'];

/** Report `table` values that qualify a report as a Sales CSV design. */
export const SALES_REPORT_TABLES = ['Sales Output', 'Royalties'];
/** Report `table` value that qualifies a report as a Costs CSV design. */
export const COSTS_REPORT_TABLE = 'Costs Output';

/** Max logo dimensions / size enforced before upload (matches Angular ngf-max-* rules). */
export const LOGO_MAX_DIMENSION = 500;
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
