import { create } from 'zustand';

interface AppStore {
  maintenanceMode: boolean;
  setMaintenanceMode: (maintenanceMode: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  maintenanceMode: false,
  setMaintenanceMode: (maintenanceMode) => set({ maintenanceMode }),
}));
