import React, { useMemo, useState } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { createScreenVariants, FormTransition } from '../motion';
import { useNavigate } from 'react-router-dom';
import { useCookies } from 'react-cookie';
import { LoginForm } from '../components/Authentication/LoginForm';
import { ForgotPasswordForm } from '../components/Authentication/ForgotPasswordForm';
import { MFASetupForm } from '../components/Authentication/MFA/MFASetupForm';
import { MFAVerification } from '../components/Authentication/MFA/MFAVerification';
import type { LoginResponse } from '../api/authenticate';
import { AuthBasePage } from './AuthBasePage';
import { CurveCookies } from '@/constants/cookies';
import { AppRoutes } from '@/routing/routes';
import { getAuthCookieOptions } from '@/utils/cookieOptions';

// Define all possible authentication screens
type AuthScreen = 'login' | 'forgot-password' | 'mfa' | 'mfa-setup';

export const LoginPage: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('login');
  const [authData, setAuthData] = useState<LoginResponse | null>(null);
  const [typedEmail, setTypedEmail] = useState<string>('');
  const navigate = useNavigate();
  const [, setCookie] = useCookies([CurveCookies.AuthToken]);

  // Centralized navigation functions
  const navigateToForgotPassword = () => setCurrentScreen('forgot-password');
  const navigateToLogin = () => {
    setCurrentScreen('login');
    setAuthData(null);
    setTypedEmail('');
  };

  const navigateToMFA = (response: LoginResponse, email: string, setUpRequired: boolean) => {
    setAuthData(response);
    setTypedEmail(email);
    if (setUpRequired) {
      setCurrentScreen('mfa-setup');
    } else {
      setCurrentScreen('mfa');
    }
  };

  // Handle successful MFA completion (both setup and verification)
  const handleMFASuccess = (token: string) => {
    setCookie(CurveCookies.AuthToken, token, getAuthCookieOptions());
    navigate(AppRoutes.Dashboard);
  };

  // Screen configuration map
  const screens: Record<AuthScreen, React.ReactNode> = {
    login: <LoginForm onForgotPassword={navigateToForgotPassword} onMFARequired={navigateToMFA} />,
    'forgot-password': <ForgotPasswordForm onBackToLogin={navigateToLogin} />,
    'mfa-setup': authData && authData.qrCode && (
      <MFASetupForm
        email={typedEmail}
        tempToken={authData?.token}
        qrCode={authData?.qrCode}
        onSuccess={handleMFASuccess}
      />
    ),
    mfa: authData && (
      <MFAVerification
        email={typedEmail}
        mfaType={authData.multiFactorAuthenticationType!}
        tempToken={authData.token}
        onComplete={handleMFASuccess}
        onBackToLogin={navigateToLogin}
      />
    ),
  };

  // Animation variants for screen transitions
  const screenVariants = useMemo(() => createScreenVariants(), []);
  const motionProps: HTMLMotionProps<'div'> = useMemo(() => {
    const shouldAnimate = currentScreen !== 'login';
    if (shouldAnimate) {
      return {
        initial: 'initial',
        animate: 'animate',
        exit: 'exit',
        transition: { duration: 0.3, ease: 'easeInOut' },
      };
    }
    return {};
  }, [currentScreen]);

  return (
    <AuthBasePage>
      <FormTransition>
        <motion.div key={currentScreen} custom={1} variants={screenVariants} {...motionProps}>
          {screens[currentScreen]}
        </motion.div>
      </FormTransition>
    </AuthBasePage>
  );
};
