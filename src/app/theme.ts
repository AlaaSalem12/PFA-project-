import { createTheme } from '@mui/material/styles';
import type { MachineStatus } from '../types/api';

declare module '@mui/material/styles' {
  interface Palette {
    surface: { subtle: string };
    brand: { soft: string };
    status: Record<MachineStatus, string>;
  }
  interface PaletteOptions {
    surface?: { subtle: string };
    brand?: { soft: string };
    status?: Record<MachineStatus, string>;
  }
}

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'data' },
  defaultColorScheme: 'light',
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#087F5B', contrastText: '#fff' },
        secondary: { main: '#F2B233', contrastText: '#17221E' },
        background: { default: '#F4F8F6', paper: '#fff' },
        divider: '#E1EAE5',
        text: { primary: '#18231E', secondary: '#718078' },
        surface: { subtle: '#F4F8F6' },
        brand: { soft: '#E3F4EA' },
        status: {
          OPERATIONAL: '#087F5B',
          SCHEDULED_MAINTENANCE: '#3B82C4',
          UNDER_MAINTENANCE: '#D88A22',
          BREAKDOWN: '#D95454',
          OUT_OF_SERVICE: '#748078',
        },
      },
    },
    dark: {
      palette: {
        primary: { main: '#087F5B', contrastText: '#fff' },
        secondary: { main: '#F2B233', contrastText: '#17221E' },
        background: { default: '#101815', paper: '#17221E' },
        divider: '#2A3932',
        text: { primary: '#F3F7F4', secondary: '#AABAB0' },
        surface: { subtle: '#1C2924' },
        brand: { soft: 'rgba(8,127,91,.18)' },
        status: {
          OPERATIONAL: '#3FBF95',
          SCHEDULED_MAINTENANCE: '#6AA8E0',
          UNDER_MAINTENANCE: '#E8A74A',
          BREAKDOWN: '#EB7E7E',
          OUT_OF_SERVICE: '#9AA8A0',
        },
      },
    },
  },
  typography: {
    fontFamily: 'Inter, "Segoe UI", sans-serif',
    h1: { fontSize: '2.25rem', fontWeight: 750, letterSpacing: '-.04em' },
    h2: { fontSize: '1.5rem', fontWeight: 700 },
    h4: { fontSize: '2rem', fontWeight: 750, letterSpacing: '-.035em' },
    h6: { fontWeight: 700 },
    body1: { fontSize: '.875rem' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 650,
          borderRadius: 8,
          transition: 'all .18s ease',
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
      styleOverrides: { root: { '& .MuiOutlinedInput-root': { borderRadius: 8 } } },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          border: '1px solid',
          borderColor: (t.vars || t).palette.divider,
          boxShadow: '0 5px 18px rgba(23,58,43,.045)',
          ...t.applyStyles('dark', { boxShadow: '0 8px 24px rgba(0,0,0,.14)' }),
        }),
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme: t }) => ({ borderColor: (t.vars || t).palette.divider }),
        head: { fontWeight: 700 },
      },
    },
  },
});
