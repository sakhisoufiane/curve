import Cookies from 'universal-cookie';
import { authApi } from '@/api/authenticate';
import { usersApi } from '@/api/users';
import { useAuthStore } from '@/stores/auth.store';
import { useUserStore } from '@/stores/user.store';
import { useClientStore } from '@/stores/client.store';
import useLoaderStore from '@/stores/loader.store';
import { parseJwt } from '@/utils/jwt';
import { applySetClientResponse } from '@/utils/applySetClientResponse';
import { CurveCookies } from '@/constants/cookies';
import { getAuthCookieOptions } from '@/utils/cookieOptions';

export const initAppState = async (token: string): Promise<void> => {
  useLoaderStore.getState().startLoading();
  try {
    // Step 1 — validate token
    const data = await authApi.validateToken(token);

    if (data.success === false) {
      throw new Error(data.message || 'Token validation failed');
    }

    const cookies = new Cookies(null, { path: '/' });
    cookies.set(CurveCookies.AuthToken, data.token, getAuthCookieOptions());

    const decoded = parseJwt(data.token);

    useAuthStore.getState().setAuthData({
      sessionId: decoded.id,
      token: data.token,
      userEmail: data.userEmail ?? null,
      isAuthenticated: true,
    });

    useUserStore.getState().setUserData({
      userType: data.userType,
      internalUser: Boolean(decoded.internal),
      superInternalUser: Boolean(decoded.superInternal),
      adminType: decoded.adminType,
      clientAdminUser: data.adminType === 'Admin',
      parentUser: Boolean(decoded.parentId),
      monitoring: Boolean(decoded.monitoring),
      paymentTier: data.paymentTier || null,
      features: data.features ?? {},
      flushScript: Boolean(data.flushScripts),
      production: data.production,
      altEnvironment: data.production === undefined ? false : !data.production,
      apiUser: false,
      fugaApiUser: false,
    });

    useClientStore.getState().setClientData({
      clientId: decoded.clientId ?? null,
      clientName: data.clientName,
      clientType: data.clientType,
      parentId: data.parentId ?? null,
      payeeId: decoded.payeeId ?? null,
      currency: null,
      currencySymbol: data.currencySymbol,
      paymentProvider: null,
      lockedForNonPayment: false,
      clientRights: null,
      clients: [],
      temporaryClient: data.clientName,
      darkLogo: data.darkLogo,
      lightLogo: data.lightLogo,
      isInTrial: false,
      trialDaysLeft: null,
      dateFormat: null,
      clientCurrencies: [],
      tipaltiCrossPayeeDetails: false,
      requiresTsAndCsConfirmation: Boolean(data.requiresTsAndCsConfirmation),
    });

    const demoMode = useUserStore.getState().demoMode;

    // Step 2 — set client (if clientId present)
    const clientId = decoded.clientId ?? decoded.payeeId;
    const userType = decoded.payeeId ? 'payee' : 'client';
    if (!clientId) {
      return;
    }

    const sessionId = useAuthStore.getState().sessionId ?? '';
    const clientData = await usersApi.setClient(sessionId, clientId, userType);
    applySetClientResponse(clientData, demoMode);
  } finally {
    useLoaderStore.getState().stopLoading();
  }
};
