import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppRoutes } from './routing/routes';
import { useTokenBootstrap } from '@/hooks/auth/useTokenBootstrap';
import { useBrandingManager } from '@/hooks/branding/useBrandingManager';
import { useDocumentTitle } from '@/hooks/utils/useDocumentTitle';
import { TermsAndConditionsDialog } from './components/Dialogs/TermsAndConditionsDialog';
import { SidebarProvider } from '@curveroyaltysystems/react-ui-library';
import { AppLayout } from './components/AppLayout';
import { useClientStore } from './stores/client.store';
import { useThemeStore, applyTheme } from './stores/theme.store';
import { Integrations } from '@/components/Integrations/Integrations';

export const App = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentBranding } = useBrandingManager();
  const { lockedForNonPayment } = useClientStore();
  const { theme } = useThemeStore();

  useTokenBootstrap();
  useDocumentTitle(currentBranding.pageTitle);

  // Apply theme and listen for system preference changes when theme is 'system'
  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // Billing lock: redirect to billing page if the client's account is overdue.
  useEffect(() => {
    if (lockedForNonPayment && location.pathname !== AppRoutes.Billing) {
      navigate(AppRoutes.Billing, { replace: true });
    }
  }, [lockedForNonPayment, location.pathname, navigate]);

  return (
    <>
      {import.meta.env.PROD && <Integrations />}
      <div className="flex h-screen">
        <TermsAndConditionsDialog />
        <SidebarProvider>
          <AppLayout whiteLabelConfig={currentBranding} />
        </SidebarProvider>
      </div>
    </>
  );
};

export default App;
