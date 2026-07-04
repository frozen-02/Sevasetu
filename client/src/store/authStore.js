import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/index.js';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setProfile: (profile) => set({ profile }),
      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
        if (accessToken) localStorage.setItem('accessToken', accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      },

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authService.login(credentials);
          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          return data;
        } catch (error) {
          const message = error.response?.data?.message || 'Login failed';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      logout: async () => {
        try {
          const { refreshToken } = get();
          await authService.logout(refreshToken);
        } catch { /* always logout locally */ }

        set({
          user: null,
          profile: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      },

      fetchMe: async () => {
        set({ isLoading: true });
        try {
          const { data } = await authService.getMe();
          set({
            user: data.user,
            profile: data.profile,
            isAuthenticated: true,
            isLoading: false,
          });
          return data;
        } catch {
          set({ isLoading: false, isAuthenticated: false, user: null });
        }
      },

      updateUser: (updates) => set((state) => ({
        user: { ...state.user, ...updates },
      })),

      updateProfile: (updates) => set((state) => ({
        profile: { ...state.profile, ...updates },
      })),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'sevasetu-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
