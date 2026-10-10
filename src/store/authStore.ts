import { create } from 'zustand';
import type { User } from '../types/api';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  setSession: (token: string, refreshToken: string, user: User) => void;
  updateUser: (user: User) => void;
  requirePasswordChange: () => void;
  logout: () => void;
}

const storedUser = localStorage.getItem('metalworks-user');

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('metalworks-token'),
  refreshToken: localStorage.getItem('metalworks-refresh-token'),
  user: storedUser ? (JSON.parse(storedUser) as User) : null,
  setSession: (token, refreshToken, user) => {
    localStorage.setItem('metalworks-token', token);
    localStorage.setItem('metalworks-refresh-token', refreshToken);
    localStorage.setItem('metalworks-user', JSON.stringify(user));
    set({ token, refreshToken, user });
  },
  updateUser: (user) => {
    localStorage.setItem('metalworks-user', JSON.stringify(user));
    set({ user });
  },
  requirePasswordChange: () => set((state) => {
    const user = state.user ? { ...state.user, mustChangePassword: true } : null;
    if (user) localStorage.setItem('metalworks-user', JSON.stringify(user));
    return { user };
  }),
  logout: () => {
    localStorage.removeItem('metalworks-token');
    localStorage.removeItem('metalworks-refresh-token');
    localStorage.removeItem('metalworks-user');
    set({ token: null, refreshToken: null, user: null });
  },
}));
