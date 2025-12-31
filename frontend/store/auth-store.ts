import { create } from 'zustand';
import { User } from '@/types';
import { authApi } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setToken: (token) => {
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
    set({ token });
  },

  login: async (email, password) => {
    try {
      const response = await authApi.login({ email, password });
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      set({
        user: response.user,
        token: response.access_token,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false
    });
  },

  initialize: async () => {
    console.log('🔄 Auth Store - Initialize called');
    set({ isLoading: true });
    try {
      const token = localStorage.getItem('access_token');
      const userStr = localStorage.getItem('user');
      console.log('📦 Auth Store - Token exists:', !!token);
      console.log('📦 Auth Store - User string:', userStr);

      if (token && userStr) {
        try {
          // Parse stored user as fallback
          const storedUser = JSON.parse(userStr);
          console.log('✅ Auth Store - Parsed stored user:', storedUser);

          // Try to verify token is still valid by fetching current user
          const user = await authApi.getMe();
          console.log('✅ Auth Store - API getMe success:', user);
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          });
          console.log('✅ Auth Store - State set with API user');
        } catch (error) {
          // If API fails, try to use stored user as fallback
          console.warn('⚠️ API getMe failed, using stored user:', error);
          try {
            const storedUser = JSON.parse(userStr);
            console.log('✅ Auth Store - Using fallback user:', storedUser);
            set({
              user: storedUser,
              token,
              isAuthenticated: true,
              isLoading: false
            });
            console.log('✅ Auth Store - State set with fallback user');
          } catch (parseError) {
            console.error('❌ Auth Store - Parse error:', parseError);
            // Token is invalid or stored user is corrupted, clear storage
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false
            });
          }
        }
      } else {
        console.log('❌ Auth Store - No token or user in localStorage');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    } catch (error) {
      console.error('❌ Auth Store - Initialize error:', error);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  },
}));
