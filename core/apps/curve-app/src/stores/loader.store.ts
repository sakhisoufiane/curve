import { create } from 'zustand';

interface LoaderStoreState {
  isLoading: boolean;
  reactLoadingCount: number;
  startLoading: () => void;
  stopLoading: () => void;
}

const useLoaderStore = create<LoaderStoreState>((set) => ({
  reactLoadingCount: 0,
  isLoading: false,

  startLoading: () =>
    set((state) => ({
      reactLoadingCount: state.reactLoadingCount + 1,
      isLoading: true,
    })),

  stopLoading: () =>
    set((state) => {
      const newCount = Math.max(0, state.reactLoadingCount - 1);
      return {
        reactLoadingCount: newCount,
        isLoading: newCount > 0,
      };
    }),
}));

export default useLoaderStore;
