import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Menu,
  MenuItem,
  Avatar,
  Divider
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  People,
  School,
  Schedule,
  Assignment,
  Person,
  Logout,
  Class,
  Science
} from '@mui/icons-material';
import { useAuth } from '../context/authContext';

const drawerWidth = 240;

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getMenuItems = () => {
    const basePath = `/${user.role}`;
    const commonItems = [
      { text: 'Dashboard', icon: <Dashboard />, path: `${basePath}/dashboard` },
      { text: 'Profile', icon: <Person />, path: `${basePath}/profile` }
    ];

    if (user.role === 'admin') {
      return [
        ...commonItems.slice(0, 1),
        { text: 'Manage Users', icon: <People />, path: `${basePath}/users` },
        { text: 'Manage Courses', icon: <School />, path: `${basePath}/courses` },
        { text: 'Manage Timetable', icon: <Schedule />, path: `${basePath}/timetable` },
        { text: 'Advanced Generation', icon: <Science />, path: `${basePath}/advanced-timetable` },
        { text: 'Manage Attendance', icon: <Assignment />, path: `${basePath}/attendance` },
        ...commonItems.slice(1)
      ];
    } else if (user.role === 'faculty') {
      return [
        ...commonItems.slice(0, 1),
        { text: 'My Timetable', icon: <Schedule />, path: `${basePath}/timetable` },
        { text: 'Mark Attendance', icon: <Assignment />, path: `${basePath}/attendance` },
        ...commonItems.slice(1)
      ];
    } else {
      return [
        ...commonItems.slice(0, 1),
        { text: 'My Timetable', icon: <Schedule />, path: `${basePath}/timetable` },
        { text: 'My Attendance', icon: <Assignment />, path: `${basePath}/attendance` },
        ...commonItems.slice(1)
      ];
    }
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          {user.role === 'admin' ? 'Admin Panel' : 
           user.role === 'faculty' ? 'Faculty Portal' : 'Student Portal'}
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {getMenuItems().map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Automated Timetable & Attendance System
          </Typography>
          <IconButton
            color="inherit"
            onClick={handleProfileMenuOpen}
          >
            <Avatar sx={{ bgcolor: 'secondary.main' }}>
              {user.name?.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
          >
            <MenuItem onClick={() => { navigate(`/${user.role}/profile`); handleProfileMenuClose(); }}>
              <ListItemIcon>
                <Person fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;