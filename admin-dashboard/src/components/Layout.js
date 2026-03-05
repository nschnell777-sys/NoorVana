import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, Divider
} from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import RedeemOutlinedIcon from '@mui/icons-material/RedeemOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = 260;

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardOutlinedIcon /> },
  { label: 'Markets', path: '/markets', icon: <MapOutlinedIcon /> },
  { label: 'Clients', path: '/clients', icon: <PeopleOutlinedIcon /> },
  { label: 'Transactions', path: '/transactions', icon: <ReceiptLongOutlinedIcon /> },
  { label: 'Redemptions', path: '/redemptions', icon: <RedeemOutlinedIcon /> },
  { label: 'Offers', path: '/offers', icon: <CampaignOutlinedIcon /> },
  { label: 'Settings', path: '/axiscare', icon: <SyncOutlinedIcon /> }
];

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#3D4A3E',
        color: '#EFEBE4'
      }}
    >
      {/* Logo area */}
      <Box sx={{ p: 3, pt: 4, pb: 2 }}>
        <Typography
          variant="h5"
          sx={{
            fontFamily: '"Outfit", sans-serif',
            fontWeight: 700,
            color: '#EFEBE4',
            lineHeight: 1.2
          }}
        >
          NoorVana Advantage
        </Typography>
        <Typography
          sx={{
            fontSize: '10px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: 'rgba(239, 235, 228, 0.5)',
            mt: 0.5
          }}
        >
          Admin Dashboard
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mx: 2 }} />

      {/* Admin info */}
      {admin && (
        <Box sx={{ px: 3, py: 2.5 }}>
          <Typography
            variant="body2"
            sx={{ color: '#EFEBE4', fontWeight: 500, mb: 0.5 }}
          >
            {admin.name}
          </Typography>
          <Typography
            sx={{
              fontSize: '11px',
              color: 'rgba(239, 235, 228, 0.5)',
              textTransform: 'capitalize'
            }}
          >
            {admin.role}
          </Typography>
        </Box>
      )}

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mx: 2 }} />

      {/* Navigation */}
      <List sx={{ px: 1.5, py: 2, flex: 1 }}>
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <ListItemButton
              key={item.path}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: '10px',
                mb: 0.5,
                py: 1.2,
                px: 2,
                color: isActive ? '#EFEBE4' : 'rgba(239, 235, 228, 0.6)',
                backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                borderLeft: isActive ? '3px solid #D4956A' : '3px solid transparent',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#EFEBE4'
                }
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 400
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      {/* Logout */}
      <Box sx={{ p: 2 }}>
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: '10px',
            py: 1.2,
            px: 2,
            color: 'rgba(239, 235, 228, 0.5)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#EFEBE4'
            }
          }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
            <LogoutOutlinedIcon />
          </ListItemIcon>
          <ListItemText
            primary="Sign Out"
            primaryTypographyProps={{ fontSize: '14px' }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            border: 'none'
          }
        }}
      >
        {sidebarContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          minHeight: '100vh',
          backgroundColor: '#EFEBE4',
          overflow: 'auto'
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
