import { useClientStore } from '../../../stores/client.store';
import { useUserStore } from '../../../stores/user.store';

type ClientRights = {
  contracts?: 'None' | 'View' | 'Edit';
  catalogue?: 'None' | 'View' | 'Edit';
  sales?: 'None' | 'View' | 'Edit';
  periods?: 'None' | 'View' | 'Edit';
  admin?: boolean;
} | null;

const getClientState = () => useClientStore.getState();
const getUserState = () => useUserStore.getState();

const getClientRights = (): ClientRights => {
  const raw = getClientState().clientRights as unknown;

  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as ClientRights;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') {
    return raw as ClientRights;
  }
  return null;
};

// Helper functions for common conditions
export const isInternalUser = (): boolean => {
  return Boolean(getUserState().internalUser);
};

export const isParentUser = (): boolean => {
  return Boolean(getUserState().parentUser);
};

export const isClientAdminUser = (): boolean => {
  return Boolean(getUserState().clientAdminUser);
};

export const isNotPayee = (): boolean => {
  return getUserState().userType !== 'payee';
};

export const isNotLockedForNonPayment = (): boolean => {
  return !getClientState().lockedForNonPayment;
};

export const hasContractRights = (): boolean => {
  return getClientRights()?.contracts !== 'None';
};

export const hasCatalogueRights = (): boolean => {
  return getClientRights()?.catalogue !== 'None';
};

export const hasSalesRights = (): boolean => {
  return getClientRights()?.sales !== 'None';
};

export const hasPeriodsRights = (): boolean => {
  return getClientRights()?.periods !== 'None';
};

export const isPublisher = (): boolean => {
  return getClientState().clientType === 'Publisher';
};

export const isNotLiteTier = (): boolean => {
  return getUserState().paymentTier !== 'Lite';
};

export const hasFeature = (feature: string): boolean => {
  const features = (getUserState().features ?? {}) as Record<string, boolean>;
  return Boolean(features[feature]);
};

export const isCurvePayProvider = (): boolean => {
  return getClientState().paymentProvider === 'Curve Pay';
};

// Specific menu item conditions
export const showDashboard = (): boolean => {
  return isNotLockedForNonPayment();
};

export const showSupport = (): boolean => {
  return isInternalUser() || Boolean(getUserState().monitoring);
};

export const showParents = (): boolean => {
  return getUserState().userType === 'internal';
};

export const showClients = (): boolean => {
  return isNotLockedForNonPayment() && isNotPayee() && (isInternalUser() || isParentUser());
};

export const showCompanies = (): boolean => {
  return (
    getUserState().userType === 'client' && hasContractRights() && isNotLockedForNonPayment() && hasFeature('companies')
  );
};

export const showContracts = (): boolean => {
  return getUserState().userType === 'client' && hasContractRights() && isNotLockedForNonPayment();
};

export const showCatalogue = (): boolean => {
  return getUserState().userType === 'client' && hasCatalogueRights() && isNotLockedForNonPayment();
};

export const showDeliveries = (): boolean => {
  return (
    isPublisher() &&
    getUserState().userType === 'client' &&
    hasCatalogueRights() &&
    isNotLockedForNonPayment() &&
    hasFeature('deliveries')
  );
};

export const showSales = (): boolean => {
  return getUserState().userType === 'client' && hasSalesRights() && isNotLockedForNonPayment();
};

export const showStatements = (): boolean => {
  return getUserState().userType === 'client' && hasPeriodsRights() && isNotLockedForNonPayment();
};

export const showArtistStatements = (): boolean => {
  return getUserState().userType === 'payee' && isNotLockedForNonPayment();
};

export const showTransactions = (): boolean => {
  return getUserState().userType === 'payee';
};

export const showPayments = (): boolean => {
  return (
    isClientAdminUser() &&
    getUserState().userType === 'client' &&
    hasPeriodsRights() &&
    hasFeature('payments') &&
    !isCurvePayProvider()
  );
};

export const showCurvePayments = (): boolean => {
  return (
    isClientAdminUser() &&
    getUserState().userType === 'client' &&
    hasPeriodsRights() &&
    (hasFeature('payments') || hasFeature('paymentSetup')) &&
    isCurvePayProvider()
  );
};

export const showArtistPayments = (): boolean => {
  return getUserState().userType === 'payee' && hasFeature('paymentDetails');
};

export const showData = (): boolean => {
  const rights = getClientRights();
  return (
    (getUserState().userType === 'client' || getUserState().userType === 'payee') &&
    isNotLockedForNonPayment() &&
    (rights?.admin || (hasPeriodsRights() && hasSalesRights()))
  );
};

export const showImports = (): boolean => {
  const rights = getClientRights();
  return (
    getUserState().userType === 'client' &&
    rights?.catalogue === 'Edit' &&
    rights?.contracts === 'Edit' &&
    isNotLockedForNonPayment() &&
    !isPublisher()
  );
};

export const showImportsPublisher = (): boolean => {
  const rights = getClientRights();
  return (
    getUserState().userType === 'client' &&
    rights?.catalogue === 'Edit' &&
    rights?.contracts === 'Edit' &&
    isNotLockedForNonPayment() &&
    isPublisher()
  );
};

export const showSettings = (): boolean => {
  return true; // Settings is always visible
};

export const showUsers = (): boolean => {
  return (
    (getUserState().adminType === 'Admin' || isInternalUser() || isParentUser()) &&
    isNotPayee() &&
    isNotLockedForNonPayment()
  );
};
export const showApiDocs = (): boolean => {
  return hasFeature('apiUser');
};

export const showHelp = (): boolean => {
  return getUserState().userType === 'payee';
};

export const showDemoToggleOn = (): boolean => {
  return hasFeature('demo') && !getUserState().demoMode && getUserState().userType === 'client';
};

export const showDemoToggleOff = (): boolean => {
  return hasFeature('demo') && Boolean(getUserState().demoMode) && getUserState().userType === 'client';
};

// Sub-menu item conditions
export const showMechanicals = (): boolean => {
  return isNotLiteTier() && !isPublisher() && hasFeature('mechanicals');
};

export const showWorks = (): boolean => {
  return isPublisher();
};

export const showComposers = (): boolean => {
  return isPublisher() || hasFeature('mechanicals');
};

export const showPublishers = (): boolean => {
  return isPublisher() || hasFeature('mechanicals');
};

export const showCatalogueManagement = (): boolean => {
  const rights = getClientRights();
  return getUserState().userType === 'client' && rights?.catalogue === 'Edit' && isPublisher();
};

export const showIswcDeliveries = (): boolean => {
  return hasFeature('iswcDeliveries');
};

export const showUnmappedTracksReleases = (): boolean => {
  return !isPublisher();
};

export const showSalesDb = (): boolean => {
  return !isPublisher();
};

export const showGroups = (): boolean => {
  return hasFeature('suspense');
};

export const showCosts = (): boolean => {
  return !isPublisher();
};

export const showUnmappedWorks = (): boolean => {
  return isPublisher();
};

export const showIncomeDb = (): boolean => {
  return isPublisher();
};

export const showAccountingPeriods = (): boolean => {
  return hasFeature('accounting');
};

export const showFtpIntegration = (): boolean => {
  return getUserState().userType === 'client' && isNotLockedForNonPayment() && hasFeature('ftpIngestion');
};

export const showTerritoryGroups = (): boolean => {
  const rights = getClientRights();
  return (
    getUserState().userType === 'client' &&
    rights?.catalogue === 'Edit' &&
    rights?.contracts === 'Edit' &&
    isNotLockedForNonPayment() &&
    hasFeature('termGroups')
  );
};

export const showContractTermGroups = (): boolean => {
  const rights = getClientRights();
  return (
    getUserState().userType === 'client' &&
    rights?.catalogue === 'Edit' &&
    rights?.contracts === 'Edit' &&
    isNotLockedForNonPayment() &&
    hasFeature('termGroups')
  );
};

export const showMcps = (): boolean => {
  return (
    getUserState().userType === 'client' &&
    hasPeriodsRights() &&
    !isPublisher() &&
    isNotLockedForNonPayment() &&
    hasFeature('mcps')
  );
};

export const showLibraryTemplates = (): boolean => {
  return getUserState().userType === 'internal';
};

export const showFixedReports = (): boolean => {
  return getUserState().userType === 'internal';
};

export const showBilling = (): boolean => {
  return (getUserState().adminType === 'Admin' || isInternalUser() || isParentUser()) && isNotPayee();
};
