import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, DarkMode, LightMode, Logout, Menu } from '@mui/icons-material';
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Tooltip,
  Typography,
  useColorScheme,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AssistantWidget } from '../../features/assistant/AssistantWidget';
import { BackButton } from '../BackButton';
import { NotificationBell } from '../NotificationBell';
import { formatEnum } from '../../utils/format';
import { useAuthStore } from '../../store/authStore';
import { LANGUAGES, type Language } from '../../i18n';
import { useUiStore } from '../../store/uiStore';
import { getBreadcrumbs, getVisibleNavGroups } from '../../app/navigation';
const expanded = 256;
const rail = 72;
export function AppLayout() {
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  // Same breakpoint as the permanent drawer (`md`), so exactly one of the two drawers is ever active.
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUiStore();
  const { mode, systemMode, setMode } = useColorScheme();
  const dark = (mode === 'system' ? systemMode : mode) === 'dark';
  const location = useLocation();
  const navigate = useNavigate();
  const groups = getVisibleNavGroups(user?.role);
  const crumbs = getBreadcrumbs(location.pathname);
  const content = (
    <Box
      sx={{
        height: '100%',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        color: 'text.primary',
      }}
    >
      <Box sx={{ p: 2.5, display: 'flex', gap: 1.25, alignItems: 'center' }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontWeight: 900,
            borderRadius: 1.5,
          }}
        >
          M
        </Box>
        {(sidebarOpen || isMobile) && (
          <Box>
            <Typography fontWeight={800} letterSpacing={-0.3}>
              MetalWorks
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('layout.tagline')}
            </Typography>
          </Box>
        )}
      </Box>
      <Divider />
      <Box sx={{ flex: 1, overflowY: 'auto', py: 2 }}>
        {groups.map(
          (group) =>
            group.items.length > 0 && (
              <Box key={group.label} sx={{ mb: 2 }}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ px: 2.5, fontSize: 10, letterSpacing: 1.4 }}
                >
                  {(sidebarOpen || isMobile) && t(group.label)}
                </Typography>
                <List sx={{ px: 1 }}>
                  {group.items.map((item) => {
                    const active =
                      location.pathname === item.path ||
                      location.pathname.startsWith(`${item.path}/`);
                    return (
                      <Tooltip
                        key={item.path}
                        title={!sidebarOpen && !isMobile ? t(item.label) : ''}
                        placement="right"
                      >
                        <ListItemButton
                          component={NavLink}
                          to={item.path}
                          onClick={() => setMobileOpen(false)}
                          selected={active}
                          sx={{
                            minHeight: 44,
                            borderRadius: 1.5,
                            mb: 0.5,
                            position: 'relative',
                            justifyContent: sidebarOpen || isMobile ? 'flex-start' : 'center',
                            color: 'text.secondary',
                            '&.Mui-selected': {
                              bgcolor: 'brand.soft',
                              color: 'primary.main',
                              '&:before': {
                                content: '""',
                                position: 'absolute',
                                right: 10,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                height: 5,
                                width: 5,
                                bgcolor: 'primary.main',
                                borderRadius: '50%',
                              },
                            },
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              minWidth: sidebarOpen || isMobile ? 38 : 'auto',
                              color: 'inherit',
                            }}
                          >
                            <item.icon />
                          </ListItemIcon>
                          {(sidebarOpen || isMobile) && (
                            <ListItemText
                              primary={t(item.label)}
                              primaryTypographyProps={{
                                fontSize: 14,
                                fontWeight: active ? 700 : 500,
                              }}
                            />
                          )}
                        </ListItemButton>
                      </Tooltip>
                    );
                  })}
                </List>
              </Box>
            ),
        )}
      </Box>
      <Divider />
      <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        {(sidebarOpen || isMobile) && (
          <>
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: 'secondary.main',
                color: 'secondary.contrastText',
              }}
            >
              {user?.fullName?.[0] || 'U'}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap fontSize={13} fontWeight={650}>
                {user?.fullName || user?.username}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatEnum(user?.role, 'UserRole')}
              </Typography>
            </Box>
          </>
        )}
        <Tooltip title={t('common.logOut')}>
          <IconButton
            onClick={() => {
              logout();
              navigate('/login');
            }}
            aria-label={t('common.logOut')}
          >
            <Logout fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        bgcolor: 'background.default',
        overflowX: 'hidden',
      }}
    >
      <Box
        component="nav"
        sx={{
          width: { md: sidebarOpen ? expanded : rail },
          flexShrink: 0,
          display: { xs: 'none', md: 'block' },
          transition: 'width .18s ease',
        }}
      >
        <Drawer
          variant="permanent"
          open
          sx={{
            '& .MuiDrawer-paper': {
              width: sidebarOpen ? expanded : rail,
              boxSizing: 'border-box',
              border: 0,
              borderRight: 1,
              borderColor: 'divider',
              transition: 'width .18s ease',
              overflowX: 'hidden',
            },
          }}
        >
          {content}
        </Drawer>
      </Box>
      <Drawer
        variant="temporary"
        open={mobileOpen && isMobile}
        onClose={() => setMobileOpen(false)}
        sx={{ '& .MuiDrawer-paper': { width: expanded } }}
      >
        {content}
      </Drawer>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Toolbar sx={{ minHeight: 72, gap: 1.5, px: { xs: 2, md: 4 } }}>
            <IconButton
              onClick={() => (isMobile ? setMobileOpen(true) : toggleSidebar())}
              aria-label={t('common.toggleNavigation')}
            >
              {isMobile ? <Menu /> : sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
            </IconButton>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} noWrap>
                {crumbs.length > 0 ? t(crumbs[crumbs.length - 1].label) : 'MetalWorks'}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {crumbs.map((crumb, index) => (
                  <Box component="span" key={crumb.path}>
                    {index > 0 && (
                      <Box component="span" sx={{ mx: 0.5 }}>
                        ›
                      </Box>
                    )}
                    {t(crumb.label)}
                  </Box>
                ))}
              </Typography>
            </Box>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={i18n.language}
              aria-label={t('common.language')}
              onChange={(_, value: Language | null) => {
                if (value) void i18n.changeLanguage(value);
              }}
            >
              {LANGUAGES.map((language) => (
                <ToggleButton key={language} value={language} sx={{ px: 1.25, fontWeight: 700 }}>
                  {language.toUpperCase()}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <IconButton
              onClick={() => setMode(dark ? 'light' : 'dark')}
              aria-label={t('common.toggleTheme')}
            >
              {dark ? <LightMode /> : <DarkMode />}
            </IconButton>
            <NotificationBell />
            <IconButton onClick={() => navigate('/profile')} aria-label={t('common.profile')}>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: 'primary.dark',
                  color: 'primary.contrastText',
                }}
              >
                {user?.fullName?.[0] || 'U'}
              </Avatar>
            </IconButton>
          </Toolbar>
        </AppBar>
        <Box
          component="main"
          sx={{
            width: '100%',
            maxWidth: 1440,
            mx: 'auto',
            px: { xs: 2, sm: 4, lg: 5 },
            py: { xs: 3, md: 5 },
            boxSizing: 'border-box',
          }}
        >
          <BackButton />
          <Outlet key={i18n.language} />
        </Box>
      </Box>
      <AssistantWidget />
    </Box>
  );
}
