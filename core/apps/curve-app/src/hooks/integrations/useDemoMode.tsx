import { useEffect, useRef } from 'react';
import { usePossibleClientsQuery } from '@/hooks/client/usePossibleClientsQuery';
import { useSetClient } from '@/hooks/client/useSetClient';
import { useAuthStore } from '@/stores/auth.store';
import { useUserStore } from '@/stores/user.store';
import { useCookies } from 'react-cookie';

const DEMO_MODE_COOKIE = 'demoMode';
const ORIGINAL_TOKEN_COOKIE = 'originalToken';

export function useDemoMode() {
  const { setUserData } = useUserStore();
  const [cookies, setCookie, removeCookie] = useCookies([
    'curveToken',
    DEMO_MODE_COOKIE,
    ORIGINAL_TOKEN_COOKIE,
  ]);
  const { refetch } = usePossibleClientsQuery('');

  // Ref allows enterDemoMode to pass a dynamic callback into setClient's onSuccess
  // without needing to re-initialise the mutation on every call
  const onClientSetRef = useRef<(() => void) | undefined>(undefined);

  // Restore demo mode state from cookie on mount (e.g. after a page reload)
  useEffect(() => {
    if (cookies[DEMO_MODE_COOKIE]) {
      setUserData({ demoMode: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { mutate: setClient } = useSetClient({
    onSuccess: () => onClientSetRef.current?.(),
  });

  const enterDemoMode = async (onClientSet?: () => void) => {
    onClientSetRef.current = onClientSet;

    // Snapshot the current token before entering demo — used to restore on exit.
    // Read from store state at call time (not render time) to avoid stale closures.
    const currentToken = useAuthStore.getState().token;
    setCookie(ORIGINAL_TOKEN_COOKIE, currentToken, { secure: true, path: '/' });

    setCookie(DEMO_MODE_COOKIE, true, { secure: true, path: '/' });
    setUserData({ demoMode: true });

    const { data: clients } = await refetch();
    const firstClient = clients?.[0];
    if (!firstClient) return;

    const demoClientId = firstClient.clientId ?? firstClient.payeeId;
    if (!demoClientId) return;

    const demoClientUserType = firstClient.clientId ? 'client' : 'payee';
    setClient({ clientId: demoClientId, userType: demoClientUserType });
  };

  const exitDemoMode = () => {
    const originalToken = cookies[ORIGINAL_TOKEN_COOKIE];
    if (!originalToken) return;

    setCookie('curveToken', originalToken, { secure: true, path: '/' });

    removeCookie(DEMO_MODE_COOKIE, { path: '/' });
    removeCookie(ORIGINAL_TOKEN_COOKIE, { path: '/' });

    // Full reload: useTokenBootstrap validates curveToken and restores the original client
    window.location.reload();
  };

  return { enterDemoMode, exitDemoMode };
}
