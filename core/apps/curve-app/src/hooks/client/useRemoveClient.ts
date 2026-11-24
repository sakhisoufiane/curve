/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation } from '@tanstack/react-query';
import { useCookies } from 'react-cookie';
import { usersApi } from '@/api/users';
import { useAuthStore } from '@/stores/auth.store';
import { useClientStore } from '@/stores/client.store';
import { useUserStore } from '@/stores/user.store';
import { parseJwt } from '@/utils/jwt';
import { useNavigate } from 'react-router-dom';
import useLoaderStore from '@/stores/loader.store';
import { CurveCookies } from '@/constants/cookies';
import { AppRoutes } from '@/routing/routes';
import { getAuthCookieOptions } from '@/utils/cookieOptions';

// Default logos to reset to when client is removed
const DEFAULT_HEADER_LOGO = '/images/Curve-logo.jpg';
const DEFAULT_SIDEBAR_LOGO = '/images/curvetypwhite2x.png';

export const useRemoveClient = ({ onSuccess, onError }: { onSuccess?: (data: any) => void; onError?: () => void }) => {
  const [, setCookie] = useCookies();
  const { sessionId, setAuthData } = useAuthStore();
  const { setClientData } = useClientStore();
  const { setUserData, demoMode } = useUserStore();
  const navigate = useNavigate();

  const { mutate, isPending } = useMutation({
    onMutate: () => {
      useLoaderStore.getState().startLoading();
    },
    onSettled: () => {
      useLoaderStore.getState().stopLoading();
    },
    mutationFn: () => usersApi.removeClient(sessionId ?? ''),
    onSuccess: (data) => {
      // Update token cookie
      if (data.token) {
        setCookie(CurveCookies.AuthToken, data.token, getAuthCookieOptions());
        if (!demoMode) {
          setCookie(CurveCookies.OriginalToken, data.token, getAuthCookieOptions());
        }
      }
      const decoded = parseJwt(data.token);

      // Update auth store with new token
      setAuthData({
        token: data.token,
        sessionId: decoded.id ?? null,
      });

      // Determine user type based on response
      let userType: string | null = null;
      let parentUser = false;

      if (data.internal) {
        userType = 'internal';
      } else if (data.parentId) {
        userType = 'parent';
        parentUser = true;
      }

      // Reset user data to pre-client state
      setUserData({
        userType,
        adminType: null,
        clientAdminUser: false,
        parentUser,
        apiUser: false,
        fugaApiUser: false,
        features: data.features ?? {},
      });

      // Reset client data to initial state
      setClientData({
        clientId: null,
        payeeId: null,
        clientName: null,
        clientType: null,
        currency: null,
        currencySymbol: null,
        paymentProvider: null,
        clientRights: null,
        temporaryClient: null,
        darkLogo: DEFAULT_HEADER_LOGO,
        lightLogo: DEFAULT_SIDEBAR_LOGO,
        isInTrial: false,
        trialDaysLeft: null,
        dateFormat: null,
        clientCurrencies: [],
        tipaltiCrossPayeeDetails: false,
      });

      // Navigate to / if not
      if (window.location.pathname !== AppRoutes.Dashboard) {
        navigate(AppRoutes.Dashboard);
      }

      onSuccess?.(data);
    },
    onError,
  });

  return { mutate, isPending };
};
