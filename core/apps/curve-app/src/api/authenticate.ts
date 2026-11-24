import { curveApi } from './http';

export type MultiFactorAuthenticationType = 'Email' | 'Authenticator';

export interface LoginResponse {
  token: string;
  email: string;
  multiFactorAuthentication?: boolean;
  multiFactorAuthenticationType?: MultiFactorAuthenticationType;
  mfaRequired?: boolean;
  qrCode?: string;
  success: boolean;
  message?: string;
}

export interface MFAResponse {
  token: string;
  success: boolean;
  message?: string;
}

export interface CaptchaResponse {
  success: boolean;
}

const login = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await curveApi.post('/authenticate', { email, password });
  return response.data;
};

const validateToken = async (token: string) => {
  const response = await curveApi.get('/authenticate/test_token', { headers: { token } });
  return response.data;
};

export interface StandardInstallationResponse {
  message: string;
}

export interface WhiteLabelResponse {
  darkLogo?: string | null;
  lightLogo?: string | null;
  favicon?: string | null;
  pageTitle?: string | null;
}

export type WhiteLabelApiResponse = WhiteLabelResponse | StandardInstallationResponse;

export const isWhiteLabelledDomain = (data: WhiteLabelApiResponse): data is WhiteLabelResponse =>
  !('message' in data);

const getWhiteLabelData = async (): Promise<WhiteLabelApiResponse> => {
  const response = await curveApi.get('/authenticate/whitelabel');
  return response.data;
};

const setUpOrValidateMFACode = async ({
  email,
  type,
  code,
  token,
}: {
  email: string;
  type: MultiFactorAuthenticationType;
  code?: string;
  token: string;
}): Promise<MFAResponse> => {
  const response = await curveApi.post('/authenticate/multi_factor', {
    email,
    type,
    code,
    token,
  });
  return response.data;
};

const forgotPassword = async (email: string) => {
  const response = await curveApi.post('/forgot', { email });
  return response.data;
};

const resetPassword = async (token: string, password: string, confirm: string) => {
  const response = await curveApi.post(`/reset?token=${token}`, { password, confirm });
  return response.data;
};

const resetExpiredPassword = async (
  token: string,
  currentPassword: string,
  newPassword: string,
  confirmNewPassword: string
) => {
  const response = await curveApi.post(
    `/expired?token=${token}`,
    { currentPassword, newPassword, newPasswordRepeat: confirmNewPassword },
    { headers: { token } }
  );
  return response.data;
};

const signup = async ({
  clientName,
  clientType,
  clientBilling,
  email,
  password,
  confirmPassword,
  marketingPermissions,
  grecaptcha,
}: {
  clientName: string;
  clientType: string;
  clientBilling: 'Lite' | 'Professional';
  email: string;
  password: string;
  confirmPassword: string;
  marketingPermissions: boolean;
  grecaptcha: string;
}) => {
  const response = await curveApi.post('/register', {
    clientName,
    clientType,
    clientBilling,
    email,
    password,
    confirmPassword,
    marketingPermissions,
    grecaptcha,
  });
  return response.data;
};

const signupConfirm = async (token: string) => {
  const response = await curveApi.get(`/register/confirm?token=${token}`);
  return response.data;
};

const verifyCaptcha = async (grecaptcha: string): Promise<CaptchaResponse> => {
  const response = await curveApi.post('/authenticate/verify_captcha', { grecaptcha });
  return response.data;
};

export const authApi = {
  login,
  validateToken,
  getWhiteLabelData,
  setUpOrValidateMFACode,
  forgotPassword,
  resetPassword,
  resetExpiredPassword,
  signup,
  signupConfirm,
  verifyCaptcha,
};
