import { BaseSidebar, BaseSidebarContent, SidebarGroup } from '@curveroyaltysystems/react-ui-library';
import { SidebarHeader } from './SidebarHeader';
import { SidebarMenu } from './SidebarMenu';
import { SidebarUser } from './SidebarUser';

export const Sidebar = () => {
  return (
    <BaseSidebar variant="inset" collapsible="icon">
      <SidebarHeader />
      <BaseSidebarContent>
        <SidebarGroup>
          <SidebarMenu />
        </SidebarGroup>
      </BaseSidebarContent>
      <SidebarUser />
    </BaseSidebar>
  );
};
