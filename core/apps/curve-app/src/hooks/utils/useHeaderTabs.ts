import { useEffect } from 'react';
import { useHeaderTabsStore, type HeaderTab } from '@/stores/headerTabs.store';

export function useHeaderTabs(tabs: readonly Pick<HeaderTab, 'id' | 'label'>[]) {
  const setTabs = useHeaderTabsStore((s) => s.setTabs);
  const clearTabs = useHeaderTabsStore((s) => s.clearTabs);
  const serialised = JSON.stringify(tabs);

  useEffect(() => {
    setTabs(JSON.parse(serialised));
    return () => clearTabs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialised]);
}
