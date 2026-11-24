import { create } from 'zustand';

type ClientRights = {
  catalogue: string;
  contracts: string;
  sales: string;
  periods: string;
};

export interface ClientState {
  clientId: string | null;
  clientName: string | null;
  clientType: string | null;
  parentId: string | null;
  payeeId: string | null;
  currency: string | null;
  currencySymbol: string | null;
  paymentProvider: string | null;
  lockedForNonPayment: boolean;
  clientRights: ClientRights | null;
  clients: unknown[];
  temporaryClient: string | null;
  darkLogo: string | null;
  lightLogo: string | null;
  isInTrial: boolean;
  trialDaysLeft: number | null;
  dateFormat: string | null;
  clientCurrencies: string[];
  tipaltiCrossPayeeDetails: boolean;
  requiresTsAndCsConfirmation: boolean;
  setClientData: (data: Partial<ClientState>) => void;
}

export const useClientStore = create<ClientState>((set) => ({
  clientId: null,
  clientName: null,
  clientType: null,
  parentId: null,
  payeeId: null,
  currency: null,
  currencySymbol: null,
  paymentProvider: null,
  lockedForNonPayment: false,
  clientRights: null,
  clients: [],
  temporaryClient: null,
  darkLogo: null,
  lightLogo: null,
  isInTrial: false,
  trialDaysLeft: null,
  dateFormat: null,
  clientCurrencies: [],
  tipaltiCrossPayeeDetails: false,
  requiresTsAndCsConfirmation: false,
  setClientData: (data) => set((state) => ({ ...state, ...data })),
}));
