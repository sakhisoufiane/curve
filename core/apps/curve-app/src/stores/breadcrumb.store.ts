import { create } from 'zustand';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isLoading?: boolean;
}

interface BreadcrumbStore {
  items: BreadcrumbItem[];
  setBreadcrumbs: (items: BreadcrumbItem[]) => void;
  clearBreadcrumbs: () => void;
}

export const useBreadcrumbStore = create<BreadcrumbStore>((set) => ({
  items: [],
  setBreadcrumbs: (items) => set({ items }),
  clearBreadcrumbs: () => set({ items: [] }),
}));
