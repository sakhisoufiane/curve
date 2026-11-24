import { create } from 'zustand';

export interface UserState {
  userType: string | null;
  internalUser: boolean;
  superInternalUser: boolean;
  adminType: string | null;
  clientAdminUser: boolean;
  parentUser: boolean;
  monitoring: boolean;
  paymentTier: string | null;
  features: Record<string, unknown>;
  flushScript: boolean;
  production?: boolean;
  altEnvironment: boolean;
  demoMode: boolean;
  qaMode: boolean;
  userSuccess: boolean;
  labelStonlyTourId: string;
  publisherStonlyTourId: string;
  payeeStonlyTourid: string;
  launchTourIsClicked: string;
  validFileTypesGeneral: string[];
  validFileTypesSales: string[];
  apiUser: boolean;
  fugaApiUser: boolean;
  setUserData: (data: Partial<UserState>) => void;
}

export const useUserStore = create<UserState>((set) => ({
  userType: null,
  internalUser: false,
  superInternalUser: false,
  adminType: null,
  clientAdminUser: false,
  parentUser: false,
  monitoring: false,
  paymentTier: null,
  features: {},
  flushScript: false,
  production: undefined,
  altEnvironment: false,
  demoMode: false,
  qaMode: false,
  userSuccess: false,
  labelStonlyTourId: '',
  publisherStonlyTourId: '',
  payeeStonlyTourid: '',
  launchTourIsClicked: '',
  validFileTypesGeneral: [],
  validFileTypesSales: [],
  apiUser: false,
  fugaApiUser: false,
  setUserData: (data) => set((state) => ({ ...state, ...data })),
}));
