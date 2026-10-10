import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: localStorage.getItem('metalworks-sidebar') !== 'collapsed',
  toggleSidebar: () =>
    set((state) => {
      const sidebarOpen = !state.sidebarOpen;
      localStorage.setItem('metalworks-sidebar', sidebarOpen ? 'expanded' : 'collapsed');
      return { sidebarOpen };
    }),
}));
