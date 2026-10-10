import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createAppTheme } from './theme';
import { useUiStore } from '../store/uiStore';
import type { ReactNode } from 'react';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });

export function AppProviders({ children }: { children: ReactNode }) {
  const dark = useUiStore((state) => state.dark);
  return <QueryClientProvider client={queryClient}><ThemeProvider theme={createAppTheme(dark)}><CssBaseline />{children}</ThemeProvider></QueryClientProvider>;
}
