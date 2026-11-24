import { Navigate, useLocation } from 'react-router-dom';
import { FadeIn, LoadingSpinner } from '../motion';
import { useCookies } from 'react-cookie';
import App from '../App';
import { useUrlTokenHandler } from '@/hooks/auth/useUrlTokenHandler';
import { CurveCookies } from '@/constants/cookies';
import { MaintenanceSplashPage } from '../pages/misc/MaintenanceSplashPage';
import { useAppStore } from '../stores/app.store';
import { AppRoutes } from '../routing/routes';

export const AppRouteGuard: React.FC = () => {
  const location = useLocation();
  const [cookies] = useCookies([CurveCookies.AuthToken]);
  const { isProcessingToken } = useUrlTokenHandler();
  const { maintenanceMode } = useAppStore();

  if (isProcessingToken) {
    return (
      <FadeIn className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner size={32} className="mx-auto mb-4" />
        </div>
      </FadeIn>
    );
  }

  // If user is not authenticated, redirect to login
  if (!cookies[CurveCookies.AuthToken]) {
    return <Navigate to={AppRoutes.Login} replace state={{ from: location }} />;
  }

  if (maintenanceMode) {
    return <MaintenanceSplashPage />;
  }

  return <App />;
};
