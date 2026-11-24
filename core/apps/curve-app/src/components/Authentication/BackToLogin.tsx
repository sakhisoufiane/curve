import { Icon } from '@curveroyaltysystems/react-ui-library';
import { useNavigate } from 'react-router-dom';
import { AppRoutes } from '@/routing/routes';

export const BackToLogin = ({ customOnBackToLogin }: { customOnBackToLogin?: () => void }) => {
  const navigate = useNavigate();
  const onBackToLogin = () => (customOnBackToLogin ? customOnBackToLogin() : navigate(AppRoutes.Login));
  return (
    <button
      type="button"
      onClick={onBackToLogin}
      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
    >
      <Icon.ArrowLeft className="h-4 w-4" />
      Back to Login
    </button>
  );
};
