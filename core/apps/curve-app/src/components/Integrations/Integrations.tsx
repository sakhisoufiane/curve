import { useHelpScout } from '@/hooks/integrations/useHelpScout';
import { useDemoMode } from '@/hooks/integrations/useDemoMode';

// Add third-party integrations that need to be initialized at the app level here
export const Integrations = () => {
  useHelpScout();
  useDemoMode();
  return null;
};
