import React, { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Button, SidebarInset, Toaster } from '@curveroyaltysystems/react-ui-library';
import { Header } from './Header/Header';
import { ROUTES } from '../../routing/routes';
import type { WhiteLabelConfig } from '@/hooks/branding/useBrandingManager';
import { ErrorBoundary } from '@/pages/misc/ErrorBoundary';
import { Icon } from '@curveroyaltysystems/react-ui-library';

const PageErrorFallback = () => (
  <div className="flex flex-col items-center justify-center h-full p-8 gap-4 min-h-[300px]">
    <Icon.AlertCircle className="h-10 w-10 text-[var(--color-curve-danger)]" />
    <p className="text-lg font-medium text-foreground">Something went wrong on this page.</p>
    <p className="text-sm text-muted-foreground">Please try refreshing the page.</p>
    <Button onClick={() => window.location.reload()} variant="outline">
      Refresh Page
    </Button>
  </div>
);

export interface AppLayoutProps {
  whiteLabelConfig: WhiteLabelConfig;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ whiteLabelConfig }) => {
  return (
    <>
      <Sidebar />
      <SidebarInset className="flex flex-col m-0! rounded-none! h-svh overflow-hidden">
        <Toaster />
        <Header logo={whiteLabelConfig.darkLogo} />
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <ErrorBoundary fallback={<PageErrorFallback />}>
            <Suspense>
              <Routes>
                {Object.values(ROUTES).map(({ path, component: Component }) => (
                  <Route key={path} path={path} element={Component ? <Component /> : null} />
                ))}
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </div>
      </SidebarInset>
    </>
  );
};
