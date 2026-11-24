import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  isActive?: boolean;
}

export const useAutoBreadcrumbs = (): BreadcrumbItem[] => {
  const location = useLocation();

  return useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);

    // If we're on the root path, return HOME breadcrumb
    if (pathSegments.length === 0) {
      return [
        {
          label: 'HOME',
          isActive: true,
        },
      ];
    }

    return pathSegments.map((segment, index) => {
      const href = '/' + pathSegments.slice(0, index + 1).join('/');
      const isActive = index === pathSegments.length - 1;

      return {
        label: segment.charAt(0).toUpperCase() + segment.slice(1).toUpperCase(),
        href: isActive ? undefined : href,
        isActive,
      };
    });
  }, [location.pathname]);
};
