/** Minimal shape of the i18next `t` function used across the works pages. */
export type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

// ── Select option values ────────────────────────────────────────────────────
//
// IMPORTANT: these strings are an API contract. They are persisted to the
// backend and compared in code (e.g. `versionType === 'Modification'`), so the
// VALUES must never be translated or renamed. Only their display labels are
// localised — see `getOptionLabel` below.

export const COMPOSITE_TYPES = ['None', 'Composite of Samples', 'Medley', 'Potpourri', 'Unspecified Composite'];
export const CATEGORIES = ['Pop', 'Jazz', 'Classical', 'Undefined'];
export const VERSION_TYPES = ['Original Work', 'Modification'];
export const ARRANGEMENT_TYPES = ['Original', 'New Music Added', 'Arrangement', 'Addition of Music to Text', 'Unspecified'];
export const LYRIC_ADAPTION_TYPES = [
  'Original',
  'None',
  'New Lyrics Added',
  'Modification',
  'Replaced',
  'Addition of Lyrics to Music',
  'Translation',
  'Unspecified',
];

/**
 * Resolves the localised display label for a Select option value.
 * Falls back to the raw value when no translation exists (e.g. language names),
 * so unmapped values still render their stored text.
 */
export function getOptionLabel(t: TranslateFn, group: string, value: string): string {
  return t(`works.edit.overview.options.${group}.${value}`, { defaultValue: value });
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

export type TabId = 'overview' | 'territories' | 'ipChain' | 'rights' | 'aliases' | 'deliveries' | 'analytics';
export const DEFAULT_TAB: TabId = 'overview';
