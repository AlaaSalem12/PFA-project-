import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  DarkMode,
  LightMode,
  Logout,
  Menu,
  Notifications,
} from '@mui/icons-material';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
  useColorScheme,
  useMediaQuery,
} from '@mui/material';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { getBreadcrumbs, getVisibleNavGroups } from '../../app/navigation';
const expanded = 256;
const rail = 72;
export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width:1023px)');
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
              Operations hub
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
                  {(sidebarOpen || isMobile) && group.label}
                </Typography>
                <List sx={{ px: 1 }}>
                  {group.items.map((item) => {
                    const active =
                      location.pathname === item.path ||
                      location.pathname.startsWith(`${item.path}/`);
                    return (
                      <Tooltip
                        key={item.path}
                        title={!sidebarOpen && !isMobile ? item.label : ''}
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
                            color: 'text.secondary',
                            '&.Mui-selected': {
                              bgcolor: 'brand.soft',
                              color: 'primary.main',
                              '&:before': {
                                content: '""',
                                position: 'absolute',
                                right: 10,
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
                              primary={item.label}
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
                {user?.role}
              </Typography>
            </Box>
          </>
        )}
        <Tooltip title="Log out">
          <IconButton
            onClick={() => {
              logout();
              navigate('/login');
            }}
            aria-label="Log out"
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
        open={mobileOpen}
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
              aria-label="Toggle navigation"
            >
              {isMobile ? <Menu /> : sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
            </IconButton>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} noWrap>
                {crumbs.length > 0 ? crumbs[crumbs.length - 1].label : 'MetalWorks'}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {crumbs.map((crumb, index) => (
                  <Box component="span" key={crumb.path}>
                    {index > 0 && (
                      <Box component="span" sx={{ mx: 0.5 }}>
                        ›
                      </Box>
                    )}
                    {crumb.label}
                  </Box>
                ))}
              </Typography>
            </Box>
            <IconButton onClick={() => setMode(dark ? 'light' : 'dark')} aria-label="Toggle theme">
              {dark ? <LightMode /> : <DarkMode />}
            </IconButton>
            <IconButton aria-label="Notifications">
              <Badge color="secondary" variant="dot">
                <Notifications />
              </Badge>
            </IconButton>
            <IconButton onClick={() => navigate('/profile')} aria-label="Profile">
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
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
