import { BaseSidebarMenuItem, SidebarMenuButton } from '@curveroyaltysystems/react-ui-library';
import type { MenuItem } from '../utils/types';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getSidebarId, isPathActive } from '../utils/utils';

export const SimpleMenuItem = ({ item }: { item: MenuItem }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = item.url ? isPathActive(location.pathname, item.url, location.search) : false;

  const handleClick = (e: React.MouseEvent) => {
    if (!item.url) return;
    // Let browser open a new tab e.g. on cmd + click
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    navigate(item.url);
  };

  return (
    <BaseSidebarMenuItem id={getSidebarId(item.key)}>
      <SidebarMenuButton tooltip={item.title} isActive={isActive} asChild>
        <Link to={item.url ?? '#'} onClick={handleClick}>
          {item.icon && <item.icon />}
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </BaseSidebarMenuItem>
  );
};
