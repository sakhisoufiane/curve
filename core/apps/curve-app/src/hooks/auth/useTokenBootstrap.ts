import { useEffect, useRef } from 'react';
import { useCookies } from 'react-cookie';
import { useHandleLogout } from './useHandleLogout';
import { initAppState } from '@/utils/initAppState';
import { CurveCookies } from '@/constants/cookies';

export const useTokenBootstrap = () => {
  const [cookies] = useCookies([CurveCookies.AuthToken]);
  const { logout } = useHandleLogout();
  const hasValidated = useRef(false);
  const token = cookies[CurveCookies.AuthToken];

  useEffect(() => {
    if (!token || hasValidated.current) return;
    hasValidated.current = true;
    initAppState(token).catch(() => {
      hasValidated.current = false;
      logout();
    });
  }, [token, logout]);
};
