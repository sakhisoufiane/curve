import { useEffect } from 'react';
import { useBreadcrumbStore, type BreadcrumbItem } from '@/stores/breadcrumb.store';

export function useBreadcrumbs(items: BreadcrumbItem[]) {
  const setBreadcrumbs = useBreadcrumbStore((s) => s.setBreadcrumbs);
  const clearBreadcrumbs = useBreadcrumbStore((s) => s.clearBreadcrumbs);
  const serialised = JSON.stringify(items);

  useEffect(() => {
    setBreadcrumbs(JSON.parse(serialised));
    return () => clearBreadcrumbs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialised]);
}
