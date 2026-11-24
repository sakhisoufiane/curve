import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useGetMenuItems } from '../../components/AppLayout/utils/useGetMenuItems';

/**
 * Sets document title based on current route: "Page Title - Base Title"
 */
export const useDocumentTitle = (baseTitle: string) => {
  const { pathname } = useLocation();
  const menuItems = useGetMenuItems();

  useEffect(() => {
    const matchesPath = (url: string | undefined) => {
      if (!url) return false;
      const basePath = url.split('?')[0];
      return pathname === basePath || pathname.startsWith(basePath + '/');
    };

    // Find matching menu item title
    let pageTitle: string | undefined;

    for (const item of menuItems) {
      if (matchesPath(item.url)) {
        pageTitle = item.title;
        break;
      }
      for (const sub of item.items ?? []) {
        if (matchesPath(sub.url)) {
          pageTitle = sub.title;
          break;
        }
      }
      if (pageTitle) break;
    }

    document.title = pageTitle ? `${pageTitle}` : baseTitle;
  }, [pathname, menuItems, baseTitle]);
};
