import { Icon } from '@curveroyaltysystems/react-ui-library';
import { useHandleLogout } from '@/hooks/auth/useHandleLogout';
import { Button } from '@curveroyaltysystems/react-ui-library';

export const Logout = ({ size = 32 }: { size?: number }) => {
  const { logout } = useHandleLogout();

  return (
    <Button onClick={() => logout()} variant="ghost" size="icon" aria-label="Logout">
      <Icon.LogOut size={size} />
    </Button>
  );
};
