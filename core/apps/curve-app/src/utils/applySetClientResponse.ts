/* eslint-disable @typescript-eslint/no-explicit-any */
import Cookies from 'universal-cookie';
import { useAuthStore } from '@/stores/auth.store';
import { useUserStore } from '@/stores/user.store';
import { useClientStore } from '@/stores/client.store';
import { parseJwt } from '@/utils/jwt';
import { getCurrencySymbol, isCurrencySupported } from '@/utils/currencySymbols';
import { CurveCookies } from '@/constants/cookies';
import { getAuthCookieOptions } from '@/utils/cookieOptions';

export const applySetClientResponse = (data: any, demoMode: boolean): void => {
  const cookies = new Cookies(null, { path: '/' });

  if (data.token) {
    cookies.set(CurveCookies.AuthToken, data.token, getAuthCookieOptions());
    if (!demoMode) {
      cookies.set(CurveCookies.OriginalToken, data.token, getAuthCookieOptions());
    }
  }

  const decoded = parseJwt(data.token);

  useAuthStore.getState().setAuthData({
    token: data.token,
    userEmail: data.email ?? null,
    sessionId: decoded.id ?? null,
  });

  useUserStore.getState().setUserData({
    userType: data.userType ?? null,
    adminType: data.adminType ?? null,
    clientAdminUser: data.adminType === 'Admin',
    parentUser: Boolean(data.parentUser),
    paymentTier: data.paymentTier ?? null,
    features: data.features ?? {},
    apiUser: Boolean(data.apiUser),
    fugaApiUser: Boolean(data.fugaApiUser),
  });

  useClientStore.getState().setClientData({
    clientId: data.clientId ?? null,
    payeeId: decoded.payeeId ?? null,
    clientName: data.clientName ?? null,
    clientType: data.clientType ?? null,
    currency: data.currency ?? null,
    currencySymbol: isCurrencySupported(data.currency ?? '') ? getCurrencySymbol(data.currency ?? '') : null,
    paymentProvider: data.paymentProvider ?? null,
    clientRights: data.clientRights ?? null,
    temporaryClient: data.clientName ?? null,
    darkLogo: data.darkLogo ?? null,
    lightLogo: data.lightLogo ?? null,
    isInTrial: Boolean(data.isInTrial),
    trialDaysLeft: data.trialDaysLeft ?? null,
    dateFormat: data.dateFormat ?? null,
    clientCurrencies: data.multiCurrencies ?? [],
    tipaltiCrossPayeeDetails: Boolean(data.tipaltiCrossPayeeDetails),
    requiresTsAndCsConfirmation: Boolean(data.requiresTsAndCsConfirmation),
  });

};
