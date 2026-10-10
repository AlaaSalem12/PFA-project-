import { create } from 'zustand';

interface UiState {
  dark: boolean;
  sidebarOpen: boolean;
  toggleTheme: () => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  dark: localStorage.getItem('metalworks-theme') ? localStorage.getItem('metalworks-theme') === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches,
  sidebarOpen: localStorage.getItem('metalworks-sidebar') !== 'collapsed',
  toggleTheme: () => set((state) => {
    const dark = !state.dark;
    localStorage.setItem('metalworks-theme', dark ? 'dark' : 'light');
    return { dark };
  }),
  toggleSidebar: () => set((state) => { const sidebarOpen = !state.sidebarOpen; localStorage.setItem('metalworks-sidebar', sidebarOpen ? 'expanded' : 'collapsed'); return { sidebarOpen }; }),
}));
