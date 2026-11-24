import { create } from 'zustand';

export interface HeaderTab {
  id: string;
  label: string;
}

interface HeaderTabsStore {
  tabs: HeaderTab[];
  setTabs: (tabs: HeaderTab[]) => void;
  clearTabs: () => void;
}

export const useHeaderTabsStore = create<HeaderTabsStore>((set) => ({
  tabs: [],
  setTabs: (tabs) => set({ tabs }),
  clearTabs: () => set({ tabs: [] }),
}));
