import type { ReactNode } from 'react';

/**
 * Context passed to tab `visible` and `label` functions.
 * Extend this as new conditions arise — it's the single place to add new tab visibility rules.
 */
export interface TabContext {
  isNew: boolean;
  clientType?: string;
}

/**
 * A single tab definition. Replaces the `{ id, label, disabledWhenNew }` pattern.
 *
 * - `label` can be a string or a function for client-specific naming (e.g. "Sales" vs "Income")
 * - `visible` hides the tab entirely when it returns false — use for new-state and client-type gating
 * - `render` is a closure over the page's local state; no props needed
 */
export interface TabDefinition<TId extends string = string> {
  id: TId;
  label: string | ((ctx: TabContext) => string);
  visible?: (ctx: TabContext) => boolean;
  render: () => ReactNode;
}

/** Resolve a tab's label to a plain string for the header store. */
export function resolveLabel(label: TabDefinition['label'], ctx: TabContext): string {
  return typeof label === 'function' ? label(ctx) : label;
}

/**
 * Filter tabs by visibility and return `{ id, label }` pairs ready for `useHeaderTabs`.
 * Also returns the full definitions so the page can call `.render()` on the active tab.
 */
export function resolveTabsForHeader<TId extends string>(
  tabs: ReadonlyArray<Omit<TabDefinition<TId>, 'render'>>,
  ctx: TabContext
): Array<{ id: TId; label: string }> {
  return tabs.filter((t) => !t.visible || t.visible(ctx)).map((t) => ({ id: t.id, label: resolveLabel(t.label, ctx) }));
}

/** Filter a full TabDefinition array by visibility context. */
export function filterTabs<TId extends string>(
  tabs: ReadonlyArray<TabDefinition<TId>>,
  ctx: TabContext
): TabDefinition<TId>[] {
  return tabs.filter((t) => !t.visible || t.visible(ctx));
}
