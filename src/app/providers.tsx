import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createAppTheme } from './theme';
import { useUiStore } from '../store/uiStore';
import { toast } from '../store/toastStore';
import { getErrorMessage } from '../api/errors';
import { ToastHost } from '../components/ToastHost';
import type { ReactNode } from 'react';

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** Skip the default error toast (the caller handles errors itself). */
      silent?: boolean;
    };
  }
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.silent) return;
      toast.error(getErrorMessage(error));
    },
  }),
});

export function AppProviders({ children }: { children: ReactNode }) {
  const dark = useUiStore((state) => state.dark);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={createAppTheme(dark)}>
        <CssBaseline />
        {children}
        <ToastHost />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
