import { createBrowserRouter } from 'react-router-dom';
import { AppRouteGuard } from '../components/AppRouteGuard';
import { LoginPage } from '../pages/LoginPage';
import { ErrorBoundary } from '../pages/misc/ErrorBoundary';
import { SignUp } from '../components/Authentication/SignUp';
import { ConfirmSignUp } from '../components/Authentication/ConfirmSignUp';
import { ResetPassword } from '../components/Authentication/ResetPasswordForm';
import { ExpiredPassword } from '../components/Authentication/ExpiredPassword';
import { AppRoutes } from './routes';

export const router = createBrowserRouter([
  // Unauthenticated routes — rendered without the AppRouteGuard auth check
  { path: AppRoutes.Login, element: <LoginPage /> },
  { path: AppRoutes.ResetPassword, element: <ResetPassword /> },
  { path: AppRoutes.SignUp, element: <SignUp /> },
  { path: AppRoutes.SignUpConfirm, element: <ConfirmSignUp /> },
  { path: AppRoutes.ExpiredPassword, element: <ExpiredPassword /> },

  // Catch-all: everything else goes through the auth guard, which renders App
  // or redirects to login.
  {
    path: '/*',
    element: (
      <ErrorBoundary>
        <AppRouteGuard />
      </ErrorBoundary>
    ),
  },
]);
