import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface AuthState {
  sessionId: string | null;
  token: string | null;
  userEmail: string | null;
  isAuthenticated: boolean;
  setAuthData: (data: Partial<AuthState>) => void;
  clearAuthData: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      sessionId: null,
      token: null,
      userEmail: null,
      isAuthenticated: false,
      setAuthData: (data) => set((state) => ({ ...state, ...data })),
      clearAuthData: () =>
        set({
          sessionId: null,
          token: null,
          userEmail: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessionId: state.sessionId,
        token: state.token,
        userEmail: state.userEmail,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
