import { type Option } from '@curveroyaltysystems/react-ui-library';
import { type AlternateTitle } from '@/api/works';

// ── Row types ───────────────────────────────────────────────────────────────

export type AlternateTitleRow = { title: string; language: Option | null };
export type PerformerRow = { name: string };
export type CompositeWorkRow = { title: string; source: string };

// ── Alternate title mappers ───────────────────────────────────────────────────

export function toAltTitleRows(titles: AlternateTitle[]): AlternateTitleRow[] {
  return titles.map((t) => ({
    title: t.title,
    language: t.language ? { value: t.language, label: t.language } : null,
  }));
}

export function fromAltTitleRows(rows: AlternateTitleRow[]): AlternateTitle[] {
  return rows.map((r) => ({ title: r.title, language: r.language?.value ?? null }));
}
