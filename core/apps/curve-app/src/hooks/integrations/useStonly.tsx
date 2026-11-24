import { useClientStore } from '@/stores/client.store';
import { useUserStore } from '@/stores/user.store';
import { useDemoMode } from './useDemoMode';

declare global {
  interface Window {
    StonlyWidget: (action: 'openGuidedTour', options: unknown) => void;
  }
}

const LABEL_STONLY_TOUR_ID = '4pdijKJxCz';
const PUBLISHER_STONLY_TOUR_ID = 'wmsVliZWkQ';
const PAYEE_STONLY_TOUR_ID = 'SYZn4uguI6';

export function useStonly() {
  const { clientType } = useClientStore();
  const { userType } = useUserStore();
  const { enterDemoMode } = useDemoMode();

  const launchTour = () => {
    if (userType === 'payee') {
      // Payee tour: no demo mode needed, launch directly
      window.StonlyWidget('openGuidedTour', { guideId: PAYEE_STONLY_TOUR_ID });
    } else {
      // Label/Publisher tour: enter demo mode first, launch tour once client is switched
      const tourId = clientType === 'Publisher' ? PUBLISHER_STONLY_TOUR_ID : LABEL_STONLY_TOUR_ID;
      enterDemoMode(() => {
        window.StonlyWidget('openGuidedTour', { guideId: tourId });
      });
    }
  };

  return { launchTour };
}
