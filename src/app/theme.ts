import { createTheme } from '@mui/material/styles';

export const createAppTheme = (dark: boolean) => createTheme({
  palette: {
    mode: dark ? 'dark' : 'light',
    primary: { main: '#087F5B', contrastText: '#fff' },
    secondary: { main: '#F2B233', contrastText: '#17221E' },
    background: { default: dark ? '#101815' : '#F4F8F6', paper: dark ? '#17221E' : '#fff' },
    divider: dark ? '#2A3932' : '#E1EAE5',
    text: { primary: dark ? '#F3F7F4' : '#18231E', secondary: dark ? '#AABAB0' : '#718078' },
  },
  typography: { fontFamily: 'Inter, "Segoe UI", sans-serif', h1: { fontSize: '2.25rem', fontWeight: 750, letterSpacing: '-.04em' }, h2: { fontSize: '1.5rem', fontWeight: 700 }, h4: { fontSize: '2rem', fontWeight: 750, letterSpacing: '-.035em' }, h6: { fontWeight: 700 }, body1: { fontSize: '.875rem' } },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 650, borderRadius: 8, transition: 'all .18s ease' } } },
    MuiTextField: { defaultProps: { size: 'small' }, styleOverrides: { root: { '& .MuiOutlinedInput-root': { borderRadius: 8 } } } },
    MuiCard: { styleOverrides: { root: { border: '1px solid', borderColor: 'divider', boxShadow: dark ? '0 8px 24px rgba(0,0,0,.14)' : '0 5px 18px rgba(23,58,43,.045)' } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiTableCell: { styleOverrides: { root: { borderColor: 'divider' }, head: { fontWeight: 700 } } },
  },
});
