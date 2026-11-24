import { useAuthStore } from '@/stores/auth.store';
import { useClientStore } from '@/stores/client.store';
import { useUserStore } from '@/stores/user.store';
import { useEffect } from 'react';

type BeaconFn = (method: 'init' | 'identify' | 'destroy' | 'show-message', options?: unknown, data?: unknown) => void;

declare global {
  interface Window {
    Beacon: BeaconFn;
  }
}

// Main Beacon IDs for each user type (set on init/destroy)
const PUBLISHER_BEACON_ID = '49311711-30a9-4d44-b105-8182cdc55479';
const LABEL_BEACON_ID = '18540986-b11e-42b0-aeee-c395003847c7';
const ARTIST_BEACON_ID = '090a922a-0be0-4014-bee5-d588d4045341';

// Dashboard Beacon IDs for each user type (used for popup when on dashboard, not set on init)
const DASHBOARD_PUBLISHER_BEACON_ID = '6130bce1-e0fe-4198-ac8a-a63abdb48ec9';
const DASHBOARD_LABEL_BEACON_ID = '88c7d4ac-26dc-485b-9870-a1fc6e84bbb3';

/**
 * Initialises the HelpScout Beacon widget.
 *
 * Note: The multi-beacon logic (artist/publisher/label) carries technical debt.
 * Ideally this would use a single beacon with user attributes rather than
 * destroying and reinitialising on client type change, but has been kept as-is
 * to match the existing Help Scout configuration.
 */
export function useHelpScout() {
  const { clientType, clientName } = useClientStore();
  const { userType } = useUserStore();
  const { userEmail } = useAuthStore();

  const beacon: BeaconFn = (method, options, data) => window.Beacon(method, options, data);

  // Init once on mount with default beacon (no client selected yet)
  useEffect(() => {
    beacon('init', LABEL_BEACON_ID);
    return () => beacon('destroy');
  }, []);

  // Switch beacon when userType/clientType is known (client selected or payee loaded)
  useEffect(() => {
    if (!userType || !clientType) return;

    let beaconId = LABEL_BEACON_ID;
    if (userType === 'payee') beaconId = ARTIST_BEACON_ID;
    else if (clientType === 'Publisher') beaconId = PUBLISHER_BEACON_ID;

    if (beaconId !== LABEL_BEACON_ID) {
      beacon('destroy');
      beacon('init', beaconId);
    }

    // Show dashboard message if on dashboard (clientType is only set once on dashboard, not on other pages)
    beacon('show-message', clientType === 'Publisher' ? DASHBOARD_PUBLISHER_BEACON_ID : DASHBOARD_LABEL_BEACON_ID);
  }, [userType, clientType]);

  // Identify separately once we have the full user data (client selected)
  useEffect(() => {
    if (!userEmail || !clientName) return;
    beacon('identify', { email: userEmail, company: clientName });
  }, [userEmail, clientName]);
}
