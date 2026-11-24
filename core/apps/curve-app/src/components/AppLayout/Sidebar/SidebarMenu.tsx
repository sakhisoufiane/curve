import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { BaseSidebarMenu } from '@curveroyaltysystems/react-ui-library';
import { useGetMenuItems } from '../utils/useGetMenuItems';
import { filterMenuItems, isPathActive } from '../utils/utils';
import { SidebarMenuItem } from './SidebarMenuItem';

export const SidebarMenu = () => {
  const allMenuItems = useGetMenuItems();
  const visibleMenuItems = filterMenuItems(allMenuItems);
  const visibleMenuItemsRef = useRef(visibleMenuItems);
  visibleMenuItemsRef.current = visibleMenuItems;
  const location = useLocation();
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    const activeParent = visibleMenuItemsRef.current.find((item) =>
      item.items?.some((subItem) => isPathActive(location.pathname, subItem.url, location.search))
    );
    setOpenKey(activeParent?.key ?? null);
  }, [location.pathname, location.search, visibleMenuItems.length]);

  return (
    <BaseSidebarMenu>
      {visibleMenuItems.map((item) => (
        <SidebarMenuItem key={item.key} item={item} openKey={openKey} setOpenKey={setOpenKey} />
      ))}
    </BaseSidebarMenu>
  );
};
