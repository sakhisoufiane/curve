import {
  authApi,
  type LoginResponse,
  type CaptchaResponse,
  type MFAResponse,
  type MultiFactorAuthenticationType,
} from '@/api/authenticate';

export type SignUpData = {
  clientName: string;
  clientType: string;
  email: string;
  password: string;
  confirmPassword: string;
  marketingPermissions: boolean;
  grecaptcha: string;
};

export const loginMutation = async (data: {
  email: string;
  password: string;
  grecaptcha: string;
}): Promise<LoginResponse> => {
  const captchaResponse: CaptchaResponse = await authApi.verifyCaptcha(data.grecaptcha);
  if (!captchaResponse.success) {
    throw new Error('An error occurred while verifying the captcha. Please try again or contact support.');
  }
  const response: LoginResponse = await authApi.login(data.email, data.password);
  if (!response.success) {
    throw new Error(
      response.message ||
        'Cannot find user, or your email and password do not match. Please check details and try again.'
    );
  }
  return response;
};

export const verifyMFACodeMutation = async (params: {
  email: string;
  type: MultiFactorAuthenticationType;
  code: string;
  token: string;
}): Promise<MFAResponse> => {
  const response = await authApi.setUpOrValidateMFACode(params);
  if (!response.success) {
    throw new Error(response.message || 'Invalid code. Please try again.');
  }
  return response;
};

export const setupMFACodeMutation = (params: {
  email: string;
  type: MultiFactorAuthenticationType;
  code?: string;
  token: string;
}): Promise<MFAResponse> => authApi.setUpOrValidateMFACode(params);

export const signupConfirmQuery = (token: string) => authApi.signupConfirm(token);

export const forgotPasswordMutation = (email: string) => authApi.forgotPassword(email);

export const resetPasswordMutation = (token: string, password: string, confirmPassword: string) =>
  authApi.resetPassword(token, password, confirmPassword);

export const resetExpiredPasswordMutation = (
  token: string,
  currentPassword: string,
  newPassword: string,
  confirmNewPassword: string
) => authApi.resetExpiredPassword(token, currentPassword, newPassword, confirmNewPassword);

export const signUpMutation = (data: SignUpData) => authApi.signup({ ...data, clientBilling: 'Lite' });
