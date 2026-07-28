import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Toolbar,
  Tooltip,
  Typography,
  Menu,
  MenuItem,
} from '@mui/material';
import CreateOutlined from '@mui/icons-material/CreateOutlined';
import ForumOutlined from '@mui/icons-material/ForumOutlined';
import TimerOutlined from '@mui/icons-material/TimerOutlined';
import BuildOutlined from '@mui/icons-material/BuildOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import PaletteIcon from '@mui/icons-material/Palette';
import ViewQuiltIcon from '@mui/icons-material/ViewQuilt';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleOutlined from '@mui/icons-material/AccountCircleOutlined';
import { useDesign } from '../design/DesignContext.jsx';
import { signOut } from '../services/authService.js';
import { brandGradient } from '../design/muiTheme.js';

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { label: 'Create Quiz', path: '/', icon: <CreateOutlined /> },
  { label: 'AI Chat', path: '/chat', icon: <ForumOutlined /> },
  { label: 'Focus Timer', path: '/focus', icon: <TimerOutlined /> },
  { label: 'Tools', path: '/tools', icon: <BuildOutlined /> },
];

function isActive(pathname, path) {
  return path === '/' ? pathname === '/' : pathname.startsWith(path);
}

// The MUI design's shell: a persistent left Drawer for navigation (a
// deliberately different structure from Classic's top nav) plus a slim top
// AppBar for the brand + appearance/account actions. On mobile the Drawer
// becomes a temporary overlay opened by the AppBar hamburger.
export default function MuiLayout({
  user,
  photoData,
  mode,
  onToggleTheme,
  palette,
  onTogglePalette,
  children,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleDesign } = useDesign();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);

  const isDark = mode === 'dark';
  const initials = (user?.displayName || user?.email || '?').trim().charAt(0).toUpperCase();

  function go(path) {
    navigate(path);
    setMobileOpen(false);
  }

  const brandMark = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Box
        aria-hidden
        sx={{
          width: 34, height: 34, borderRadius: '10px',
          display: 'grid', placeItems: 'center',
          background: brandGradient(mode, palette),
          color: '#fff', fontWeight: 800, fontSize: '0.8rem',
        }}
      >
        SP
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
        StudyPilot
      </Typography>
    </Box>
  );

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Empty spacer so the nav list sits below the fixed AppBar (the brand
          lives in the AppBar itself). */}
      <Toolbar />
      <Divider />
      <List sx={{ px: 1, py: 1.5, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(location.pathname, item.path);
          return (
            <ListItemButton
              key={item.path}
              selected={active}
              onClick={() => go(item.path)}
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: active ? 'primary.main' : 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: active ? 700 : 500,
                  color: active ? 'primary.main' : 'text.primary',
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
      <Divider />
      <Box sx={{ p: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          Material design
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <IconButton
            edge="start"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {brandMark}
          <Box sx={{ flex: 1 }} />

          <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton onClick={onToggleTheme} aria-label="Toggle light/dark mode">
              {isDark ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Change color palette">
            <IconButton onClick={onTogglePalette} aria-label="Change color palette">
              <PaletteIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Switch to Classic design">
            <IconButton onClick={toggleDesign} aria-label="Switch to Classic design">
              <ViewQuiltIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={user?.displayName || user?.email || 'Account'}>
            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="Account menu" sx={{ p: 0.5 }}>
              <Avatar
                src={photoData || undefined}
                sx={{ width: 34, height: 34, background: brandGradient(mode, palette), fontSize: '0.9rem', fontWeight: 800 }}
              >
                {initials}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem onClick={() => { setMenuAnchor(null); go('/profile'); }}>
              <ListItemIcon><AccountCircleOutlined fontSize="small" /></ListItemIcon>
              Profile
            </MenuItem>
            <MenuItem onClick={() => { setMenuAnchor(null); signOut(); }}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Permanent sidebar on md+, temporary drawer on mobile */}
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Toolbar />
        <Box sx={{ flex: 1, minHeight: 0 }}>{children}</Box>
      </Box>
    </Box>
  );
}
