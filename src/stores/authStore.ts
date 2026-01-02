/**
 * Authentication Store
 * 
 * Global state management for authentication using Zustand
 */

import { create } from 'zustand';
import type { User } from '../types';
import { signIn, signOut, getCurrentUser, hasPermission } from '../services/auth/authService';

interface AuthStore {
  // State
  user: User | null;
  loading: boolean;
  error: string | null;

  // Actions
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => void;
  clearError: () => void;
  checkPermission: (resource: string, action: 'view' | 'create' | 'edit' | 'delete' | 'approve') => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  loading: false,
  error: null,

  // Login action
  login: async (username: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const user = await signIn(username, password);
      set({ user, loading: false, error: null });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer login';
      set({ 
        loading: false, 
        error: errorMessage
      });
      throw error;
    }
  },

  // Logout action
  logout: async () => {
    set({ loading: true });
    try {
      await signOut();
      set({ user: null, loading: false, error: null });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer logout';
      set({ 
        loading: false, 
        error: errorMessage
      });
    }
  },

  // Initialize authentication from session
  initializeAuth: () => {
    const user = getCurrentUser();
    set({ user, loading: false });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Check permission
  checkPermission: (resource: string, action: 'view' | 'create' | 'edit' | 'delete' | 'approve') => {
    const { user } = get();
    return hasPermission(user, resource, action);
  }
}));
