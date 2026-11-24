import type { MenuItem, SubMenuItem } from './types';

/**
 * Checks if the current pathname matches the menu item's URL.
 * Handles URLs with query strings by matching both pathname and relevant query params.
 *
 * @param currentPathname - The current location pathname
 * @param menuUrl - The menu item's URL (may include query string)
 * @param currentSearch - The current location search string (optional)
 * @returns true if the path is considered active
 */
export const isPathActive = (currentPathname: string, menuUrl: string, currentSearch?: string): boolean => {
  // Parse the menu URL to separate pathname and search params
  const [menuPathname, menuSearch] = menuUrl.split('?');

  // For root path, require exact match
  if (menuPathname === '/') {
    return currentPathname === '/';
  }

  // Check pathname match — exact or child dynamic route (e.g. /foo active on /foo/123/edit)
  if (currentPathname !== menuPathname && !currentPathname.startsWith(menuPathname + '/')) {
    return false;
  }

  // If menu URL has no query params, it's active only when the current URL
  // also has no query params. This prevents a bare "/imports" from matching
  // when the user is on "/imports?transferringSystem=CWR".
  if (!menuSearch) {
    const searchString = currentSearch ?? window.location.search;
    return !searchString;
  }

  // If menu URL has query params, we need to check them too
  // Get current search params (from window.location if not provided)
  const searchString = currentSearch ?? window.location.search;
  const currentParams = new URLSearchParams(searchString);
  const menuParams = new URLSearchParams(menuSearch);

  // Check if all menu params are present and match in current URL
  for (const [key, value] of menuParams.entries()) {
    if (currentParams.get(key) !== value) {
      return false;
    }
  }

  return true;
};

export const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
  return items
    .filter((item) => {
      if (item.condition && !item.condition()) {
        return false;
      }
      if (item.items) {
        const visibleSubItems = filterSubItems(item.items);
        return visibleSubItems.length > 0;
      }
      return true;
    })
    .map((item) => {
      if (item.items) {
        return {
          ...item,
          items: filterSubItems(item.items),
        };
      }
      return item;
    });
};

export const filterSubItems = (subItems: SubMenuItem[]): SubMenuItem[] => {
  return subItems.filter((subItem) => {
    if (subItem.condition) {
      return subItem.condition();
    }
    return true;
  });
};

/**
 * Generates a sidebar ID from a menu key, matching the Angular sidebar ID pattern.
 * Examples: 'dashboard' -> 'sidebar-dashboard', 'support' -> 'sidebar-support'
 *
 * @param key - The menu item key
 * @param parentKey - Optional parent key for sub-items (used to detect special cases)
 */
export const getSidebarId = (key: string, parentKey?: string): string => {
  // Handle special cases for sub-items that have the same key as their parent
  if (parentKey && key === parentKey) {
    const specialSubMenuCases: Record<string, string> = {
      contracts: 'sidebar-contract-submenu',
      sales: 'sidebar-sales-file-submenu',
      deliveries: 'sidebar-deliveries-submenu',
      statements: 'sidebar-statements-submenu',
    };

    if (specialSubMenuCases[key]) {
      return specialSubMenuCases[key];
    }
  }

  // Handle other special cases
  const specialCases: Record<string, string> = {
    unmappedTracksReleases: 'sidebar-unmapped-tracks-releases',
    unmappedWorks: 'sidebar-unmapped-works',
    salesDb: 'sidebar-sales-db',
    incomeDb: 'sidebar-income-db',
    accountingPeriods: 'sidebar-accounting-periods',
    deliverySettings: 'sidebar-delivery-settings',
    iswc: 'sidebar-iswc-deliveries',
    supportAnalytics: 'sidebar-support-analytics',
    monitoringTools: 'sidebar-monitoring-tools',
    'artist-statements': 'sidebar-artist-statements',
  };

  // Check if there's a special case, otherwise use the standard pattern
  if (specialCases[key]) {
    return specialCases[key];
  }

  return `sidebar-${key}`;
};
