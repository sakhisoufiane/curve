import React, { useCallback, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useClientStore } from '../../../stores/client.store';
import { useHotkey } from '@/hooks/utils/useHotkey';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Skeleton,
  SidebarTrigger,
  useIsMobile,
  Flex,
} from '@curveroyaltysystems/react-ui-library';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { cn, Icon } from '@curveroyaltysystems/react-ui-library';
import { getRouteTitle } from '@/routing/routes';
import { useBreadcrumbStore } from '@/stores/breadcrumb.store';
import { useHeaderTabsStore } from '@/stores/headerTabs.store';
import { HeaderLogo } from './HeaderLogo';
import { HeaderBadges } from './HeaderBadges';
import { HeaderActions } from './HeaderActions';
import { MobileHeaderMenu } from './MobileHeaderMenu';
import { NotificationMenu } from './Notifications';
import { SearchOverlay } from '../Search';
import { useUserStore } from '@/stores/user.store';
import { useDemoMode } from '@/hooks/integrations/useDemoMode';
import { useGetWhiteLabelData } from '@/hooks/branding/useGetWhiteLabelData';
import { isWhiteLabelledDomain } from '@/api/authenticate';

interface HeaderProps {
  isInTrial?: boolean;
  trialDaysLeft?: number;
  logo: string;
}

export const Header: React.FC<HeaderProps> = ({ isInTrial = false, trialDaysLeft = 0, logo }) => {
  const { demoMode } = useUserStore();
  const { exitDemoMode } = useDemoMode();
  const { data: whiteLabelData } = useGetWhiteLabelData();
  const isWhiteLabelled = whiteLabelData ? isWhiteLabelledDomain(whiteLabelData) : false;
  const { clientId } = useClientStore(
    useShallow((state) => ({
      clientId: state.clientId ?? state.payeeId,
    }))
  );

  const location = useLocation();
  const pageTitle = getRouteTitle(location.pathname);
  const breadcrumbItems = useBreadcrumbStore((s) => s.items);
  const headerTabs = useHeaderTabsStore((s) => s.tabs);
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab');
  const isMobile = useIsMobile(1015);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearchOpen = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  useHotkey('/', handleSearchOpen, { enabled: !!clientId });

  const headerLogo = isWhiteLabelled ? <HeaderLogo logo={logo} /> : null;

  const navTitle =
    breadcrumbItems.length > 0 ? (
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbItems.map((item, i) => (
            <React.Fragment key={i}>
              <BreadcrumbItem>
                {item.isLoading ? (
                  <Skeleton className="h-4 w-24" />
                ) : item.href ? (
                  <BreadcrumbLink asChild>
                    <Link to={item.href} className="text-sm">
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                ) : headerTabs.length > 0 ? (
                  <span className="text-sm text-muted-foreground max-w-[100px] truncate block">{item.label}</span>
                ) : (
                  <BreadcrumbPage className="text-sm">{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {i < breadcrumbItems.length - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    ) : pageTitle ? (
      <span className="text-sm">{pageTitle}</span>
    ) : null;

  const tabNav =
    headerTabs.length > 0 ? (
      <div className="flex items-center gap-0.5">
        {headerTabs.map((tab) => (
          <Link
            key={tab.id}
            to={`?tab=${tab.id}`}
            className={cn(
              'px-2.5 py-1 rounded-md text-sm transition-colors',
              activeTab === tab.id || (!activeTab && headerTabs[0]?.id === tab.id)
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    ) : null;

  return (
    <>
      {isMobile ? (
        <Flex
          role="banner"
          direction="row"
          align="center"
          gap="md"
          className="bg-background text-foreground p-2 sticky top-0 z-10 border-b"
        >
          {/* Left section - Mobile */}
          <Flex direction="row" align="center" gap="md">
            <SidebarTrigger className="-ml-1" />
            {navTitle}
            {tabNav && <Icon.ChevronRight className="size-3.5 text-muted-foreground/50 shrink-0" />}
            {tabNav}
          </Flex>

          {/* Center section - Logo */}
          <Flex direction="row" align="center" justify="center" className="flex-1">
            {headerLogo}
          </Flex>

          {/* Right section - Mobile Menu */}
          <Flex direction="row" align="center" gap="sm">
            <NotificationMenu />
            <MobileHeaderMenu
              isInTrial={isInTrial}
              trialDaysLeft={trialDaysLeft}
              onSearchOpen={clientId ? handleSearchOpen : undefined}
            />
          </Flex>
        </Flex>
      ) : (
        <Flex
          role="banner"
          direction="row"
          justify="between"
          align="center"
          gap="md"
          className="bg-background text-foreground p-2 sticky top-0 z-10 border-b"
        >
          {/* Left section - Desktop */}
          <Flex direction="row" align="center" gap="md">
            <SidebarTrigger className="-ml-1" />
            {headerLogo}
            {navTitle}
            {tabNav && <Icon.ChevronRight className="size-3.5 text-muted-foreground/50 shrink-0" />}
            {tabNav}
          </Flex>

          {/* Middle section - Desktop */}
          <Flex direction="row" align="center" gap="md">
            <HeaderBadges isInTrial={isInTrial} trialDaysLeft={trialDaysLeft} />
          </Flex>

          {/* Right section - Desktop */}
          <Flex direction="row" align="center" justify="end" gap="sm">
            <HeaderActions onSearchOpen={clientId ? handleSearchOpen : undefined} />
          </Flex>
        </Flex>
      )}
      {demoMode && (
        <div className="text-center bg-curve-warning p-2">
          <p>
            You are in demo mode, where you are displayed a set of demo data, and no changes will be saved.{' '}
            <b className="underline cursor-pointer" onClick={exitDemoMode}>
              Turn off demo mode
            </b>
          </p>
        </div>
      )}
      <SearchOverlay isOpen={isSearchOpen} onClose={handleSearchClose} />
    </>
  );
};
