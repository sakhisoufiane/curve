import {
  SidebarMenuSub,
  SidebarMenuSubItem,
  BaseSidebarMenuItem,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  SidebarMenuButton,
  SidebarMenuSubButton,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  cn,
} from '@curveroyaltysystems/react-ui-library';
import { Icon } from '@curveroyaltysystems/react-ui-library';
import type { MenuItem } from '../utils/types';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSidebarId, isPathActive } from '../utils/utils';

/** Styles for collapsed sidebar state (icon-only mode) */
const collapsedStyles = {
  /** Centers content vertically when sidebar is collapsed */
  menuItem: [
    'group-data-[collapsible=icon]:flex',
    'group-data-[collapsible=icon]:flex-col',
    'group-data-[collapsible=icon]:items-center',
  ],
  /** Container for abbreviated letter buttons */
  childrenContainer: [
    'hidden',
    'flex-col',
    'items-center',
    'gap-1',
    'p-1',
    'mt-1',
    'rounded-md',
    'bg-sidebar-border',
    'group-data-[collapsible=icon]:flex',
  ],
  /** Individual letter button styling */
  letterButton: [
    'flex',
    'h-6',
    'w-6',
    'items-center',
    'justify-center',
    'rounded-md',
    'text-xs',
    'font-medium',
    'transition-colors',
    'text-sidebar-foreground',
    'hover:bg-sidebar-accent',
    'hover:text-sidebar-accent-foreground',
    'data-[active=true]:bg-sidebar-accent',
    'data-[active=true]:text-sidebar-accent-foreground',
  ],
} as const;

/** Styles for chevron icon animation */
const chevronStyles = [
  'ml-auto',
  'transition-transform',
  'duration-200',
  'group-data-[state=open]/collapsible:rotate-90',
];

type Props = {
  item: MenuItem;
  openKey: string | null;
  setOpenKey: (key: string | null) => void;
};

export const CollapsibleMenuItem = ({ item, openKey, setOpenKey }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isOpen = openKey === item.key;
  const handleOpenChange = (open: boolean) => setOpenKey(open ? item.key : null);

  const handleNavigate = (e: React.MouseEvent, path: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    navigate(path);
  };

  // Find the most specific (longest URL) matching subitem to avoid highlighting
  // a parent path (e.g. /monitoring) when a more specific sibling matches (e.g. /monitoring/tools).
  const activeSubItemUrl = item.items?.reduce<string | null>((best, subItem) => {
    if (!isPathActive(location.pathname, subItem.url, location.search)) return best;
    if (!best) return subItem.url;
    return subItem.url.length > best.length ? subItem.url : best;
  }, null);

  const hasActiveChild = activeSubItemUrl !== null && activeSubItemUrl !== undefined;

  return (
    <Collapsible key={item.key} asChild open={isOpen} onOpenChange={handleOpenChange} className="group/collapsible">
      <BaseSidebarMenuItem id={getSidebarId(item.key)} className={cn(collapsedStyles.menuItem)}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.title} isActive={hasActiveChild}>
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            <Icon.ChevronRight className={cn(chevronStyles)} />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {/* Expanded view - full menu items (hidden when sidebar is collapsed) */}
          <SidebarMenuSub className="py-1.5 pl-3.5">
            {item.items?.map((subItem) => {
              const isSubItemActive = activeSubItemUrl === subItem.url;
              return (
                <SidebarMenuSubItem key={subItem.url} id={getSidebarId(subItem.key, item.key)}>
                  <SidebarMenuSubButton asChild isActive={isSubItemActive}>
                    <a href={subItem.url} onClick={(e) => handleNavigate(e, subItem.url)}>
                      <span>{subItem.title}</span>
                    </a>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>

          {/* Collapsed view - abbreviated first letter items */}
          <div className={cn(collapsedStyles.childrenContainer)}>
            {item.items?.map((subItem) => {
              const isSubItemActive = activeSubItemUrl === subItem.url;
              return (
                <Tooltip key={subItem.url}>
                  <TooltipTrigger asChild>
                    <a
                      href={subItem.url}
                      onClick={(e) => handleNavigate(e, subItem.url)}
                      data-active={isSubItemActive}
                      className={cn(collapsedStyles.letterButton)}
                    >
                      {subItem.title.charAt(0).toUpperCase()}
                    </a>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center">
                    {subItem.title}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </CollapsibleContent>
      </BaseSidebarMenuItem>
    </Collapsible>
  );
};
