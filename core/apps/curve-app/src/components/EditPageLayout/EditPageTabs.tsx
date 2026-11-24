import type { TabDefinition } from './tab-types';

interface EditPageTabsProps<TId extends string> {
  tabs: TabDefinition<TId>[];
  activeTab: TId;
}

/**
 * Renders the active tab's content given a list of tab definitions and the
 * current active tab id. Pass the filtered (visible) tabs from `filterTabs`.
 *
 * @example
 * <EditPageTabs tabs={visibleTabs} activeTab={activeTab} />
 */
export function EditPageTabs<TId extends string>({ tabs, activeTab }: EditPageTabsProps<TId>) {
  const def = tabs.find((t) => t.id === activeTab);
  return <>{def?.render()}</>;
}
