import { useCallback } from 'react';
import { useCookies } from 'react-cookie';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../stores/auth.store';
import { useClientStore } from '../../stores/client.store';
import { useUserStore } from '../../stores/user.store';
import { useQueryClient } from '@tanstack/react-query';
import { CurveCookies } from '@/constants/cookies';
import { AppRoutes } from '@/routing/routes';

export const useHandleLogout = () => {
  const navigate = useNavigate();
  const [, , removeCookie] = useCookies();
  const clearAuthData = useAuthStore((state) => state.clearAuthData);
  const setClientData = useClientStore((state) => state.setClientData);
  const setUserData = useUserStore((state) => state.setUserData);
  const queryClient = useQueryClient();
  const logout = useCallback(() => {
    removeCookie(CurveCookies.AuthToken, { path: '/' });
    removeCookie(CurveCookies.OriginalUserId, { path: '/' });
    removeCookie(CurveCookies.OriginalToken, { path: '/' });
    removeCookie(CurveCookies.OriginalClient, { path: '/' });
    removeCookie(CurveCookies.DemoMode, { path: '/' });
    removeCookie(CurveCookies.QaMode, { path: '/' });
    clearAuthData();
    setClientData({});
    setUserData({ demoMode: false });
    queryClient.clear();
    navigate(AppRoutes.Login);
  }, [navigate, removeCookie, clearAuthData, setClientData, setUserData, queryClient]);

  return { logout };
};
