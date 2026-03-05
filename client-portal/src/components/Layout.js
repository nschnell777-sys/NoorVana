import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  IconButton,
  BottomNavigation,
  BottomNavigationAction,
  useMediaQuery,
  useTheme,
  AppBar,
  Toolbar,
  Dialog,
  TextField,
  Button,
  CircularProgress
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/DashboardOutlined';
import HistoryIcon from '@mui/icons-material/ReceiptLongOutlined';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import FavoriteIcon from '@mui/icons-material/Favorite';
import BusinessIcon from '@mui/icons-material/Business';
import BlockIcon from '@mui/icons-material/Block';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import LogoutIcon from '@mui/icons-material/LogoutOutlined';
import { useAuth } from '../context/AuthContext';
import { getBeneficiary, saveBeneficiary } from '../services/api';
import TierBadge from './TierBadge';

const DRAWER_WIDTH = 260;

/** Auto-capitalize first letter */
const autoCap = (v) => v ? v.charAt(0).toUpperCase() + v.slice(1) : '';
const autoCapWords = (v) => v ? v.replace(/\b\w/g, (c) => c.toUpperCase()) : '';

/** Format digits as US phone: (xxx) xxx-xxxx */
const formatUSPhone = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 10);
  if (d.length === 0) return '';
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0,3)}) ${d.slice(3)}`;
  return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
};

/** Basic email validation */
const isValidEmail = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const PACKAGE_LABELS = {
  essentials: 'Care Essentials',
  premium: 'Care Premium',
  white_glove: 'White Glove'
};

const TYPE_LABELS = {
  family_friend: 'Family / Friend',
  charity_facility: 'Charity / Facility',
  none: 'None'
};

const NAV_ITEMS = [
  { label: 'Dashboard', shortLabel: 'Home', icon: <DashboardIcon />, path: '/dashboard' },
  { label: 'Points History', shortLabel: 'History', icon: <HistoryIcon />, path: '/history' },
  { label: 'Redeem Rewards', shortLabel: 'Redeem', icon: <CardGiftcardOutlinedIcon />, path: '/redeem' },
  { label: 'Explore Benefits', shortLabel: 'Benefits', icon: <ExploreOutlinedIcon />, path: '/benefits' },
  { label: 'Offers', shortLabel: 'Offers', icon: <LocalOfferOutlinedIcon />, path: '/offers' }
];

const Layout = ({ children }) => {
  const { client, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [profileOpen, setProfileOpen] = useState(false);
  const [beneficiary, setBeneficiary] = useState(null);
  const [benLoading, setBenLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editType, setEditType] = useState(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [editRelationship, setEditRelationship] = useState('');
  const [editOrgName, setEditOrgName] = useState('');

  const currentNavIndex = NAV_ITEMS.findIndex((item) => location.pathname === item.path);

  const handleNavClick = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleOpenProfile = () => {
    setProfileOpen(true);
    setEditing(false);
    if (client) {
      setBenLoading(true);
      getBeneficiary(client.id)
        .then(({ data }) => setBeneficiary(data.beneficiary))
        .catch(() => setBeneficiary(null))
        .finally(() => setBenLoading(false));
    }
  };

  const handleStartEdit = () => {
    if (beneficiary) {
      setEditType(beneficiary.beneficiary_type || 'none');
      if (beneficiary.beneficiary_type === 'charity_facility') {
        setEditFirstName(beneficiary.name || '');
        setEditLastName('');
      } else {
        const parts = (beneficiary.name || '').split(' ');
        setEditFirstName(parts[0] || '');
        setEditLastName(parts.slice(1).join(' ') || '');
      }
      setEditPhone(beneficiary.phone || '');
      setEditEmail(beneficiary.email || '');
      setEditRelationship(beneficiary.relationship || '');
      setEditOrgName(beneficiary.organization_name || '');
    } else {
      setEditType(null);
      setEditFirstName('');
      setEditLastName('');
      setEditPhone('');
      setEditEmail('');
      setEditRelationship('');
      setEditOrgName('');
    }
    setEmailError(false);
    setEditing(true);
  };

  const handleSaveBeneficiary = async () => {
    if (!client || !editType) return;
    if (editEmail && !isValidEmail(editEmail)) {
      setEmailError(true);
      return;
    }
    setSaving(true);
    try {
      const fullName = [editFirstName.trim(), editLastName.trim()].filter(Boolean).join(' ') || null;
      const payload = {
        beneficiary_type: editType,
        name: fullName,
        phone: editPhone || null,
        email: editEmail || null,
        relationship: editType === 'family_friend' ? (editRelationship || null) : null,
        organization_name: editType === 'charity_facility' ? (editOrgName || null) : null
      };
      const { data } = await saveBeneficiary(client.id, payload);
      setBeneficiary(data.beneficiary);
      setEditing(false);
    } catch (err) {
      console.error('Failed to save beneficiary', err);
    } finally {
      setSaving(false);
    }
  };

  // Desktop sidebar
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
          Rewards Portal
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mx: 2 }} />

      {/* Client info */}
      {client && (
        <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography
              variant="body2"
              sx={{ color: '#EFEBE4', fontWeight: 500, mb: 1 }}
            >
              {client.name}
            </Typography>
            <TierBadge tier={client.current_tier} size="small" />
          </Box>
          <IconButton
            onClick={handleOpenProfile}
            sx={{
              color: 'rgba(239, 235, 228, 0.5)',
              '&:hover': { color: '#EFEBE4', backgroundColor: 'rgba(255,255,255,0.08)' }
            }}
          >
            <VisibilityOutlinedIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
      )}

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mx: 2 }} />

      {/* Navigation */}
      <List sx={{ px: 1.5, py: 2, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.path}
              onClick={() => handleNavClick(item.path)}
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
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText
            primary="Sign Out"
            primaryTypographyProps={{ fontSize: '14px' }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      borderRadius: '10px',
      color: '#EFEBE4',
      fontSize: '13px',
      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.15)' },
      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
      '&.Mui-focused fieldset': { borderColor: '#D4956A' }
    },
    '& .MuiInputLabel-root': {
      color: 'rgba(239, 235, 228, 0.4)', fontSize: '13px',
      '&.Mui-focused': { color: '#D4956A' }
    }
  };

  const beneficiaryOptions = [
    {
      type: 'family_friend',
      icon: <FavoriteIcon sx={{ fontSize: 22, color: '#D4956A' }} />,
      label: 'Family or Friend',
      desc: 'Designate a loved one'
    },
    {
      type: 'charity_facility',
      icon: <BusinessIcon sx={{ fontSize: 22, color: '#5A8A7A' }} />,
      label: 'Charity or Facility',
      desc: 'Donate to an organization'
    },
    {
      type: 'none',
      icon: <BlockIcon sx={{ fontSize: 22, color: 'rgba(239, 235, 228, 0.4)' }} />,
      label: 'None',
      desc: 'No beneficiary'
    }
  ];

  const profileWidget = (
    <Dialog
      open={profileOpen}
      onClose={() => !saving && setProfileOpen(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(145deg, #2A332B 0%, #3D4A3E 40%, #4A5A4C 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
          overflow: 'hidden'
        }
      }}
    >
      <Box sx={{ p: { xs: 3, sm: 4 } }}>
        {/* Close button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <IconButton
            onClick={() => { setEditing(false); setProfileOpen(false); }}
            disabled={saving}
            sx={{ color: 'rgba(239,235,228,0.5)', p: 0.5 }}
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        {/* Profile card */}
        {client && (
          <Box sx={{
            background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)',
            borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', p: 2.5, mb: 3
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <PersonOutlineIcon sx={{ fontSize: 32, color: '#EFEBE4' }} />
              <Box>
                <Typography sx={{ color: '#EFEBE4', fontWeight: 600, fontSize: '16px' }}>
                  {client.name}
                </Typography>
                <Typography sx={{ color: 'rgba(239,235,228,0.5)', fontSize: '13px' }}>
                  {client.email}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Box>
                <Typography sx={{
                  color: 'rgba(239,235,228,0.4)', fontSize: '10px',
                  textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600
                }}>
                  Care Package
                </Typography>
                <Typography sx={{ color: '#EFEBE4', fontSize: '14px', fontWeight: 500 }}>
                  {PACKAGE_LABELS[client.care_package] || client.care_package}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{
                  color: 'rgba(239,235,228,0.4)', fontSize: '10px',
                  textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, mb: 0.5
                }}>
                  Tier
                </Typography>
                <TierBadge tier={client.current_tier} size="small" />
              </Box>
            </Box>
            {client.phone && (
              <Box sx={{ mt: 2 }}>
                <Typography sx={{
                  color: 'rgba(239,235,228,0.4)', fontSize: '10px',
                  textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600
                }}>
                  Phone
                </Typography>
                <Typography sx={{ color: '#EFEBE4', fontSize: '14px' }}>
                  {client.phone}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Beneficiary section - View mode */}
        {!editing && (
          <Box sx={{
            background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)',
            borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', p: 2.5
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography sx={{
                color: 'rgba(239,235,228,0.4)', fontSize: '10px',
                textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600
              }}>
                Beneficiary
              </Typography>
              <IconButton
                onClick={handleStartEdit}
                disabled={benLoading}
                sx={{ color: 'rgba(239,235,228,0.5)', p: 0.5, '&:hover': { color: '#D4956A' } }}
              >
                <EditIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>

            {benLoading ? (
              <CircularProgress size={18} sx={{ color: 'rgba(239,235,228,0.4)' }} />
            ) : !beneficiary || beneficiary.beneficiary_type === 'none' ? (
              <Typography sx={{ color: 'rgba(239,235,228,0.5)', fontSize: '13px' }}>
                No beneficiary designated
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {beneficiary.beneficiary_type === 'family_friend'
                    ? <FavoriteIcon sx={{ fontSize: 16, color: '#D4956A' }} />
                    : <BusinessIcon sx={{ fontSize: 16, color: '#5A8A7A' }} />
                  }
                  <Typography sx={{ color: '#EFEBE4', fontWeight: 600, fontSize: '13px' }}>
                    {TYPE_LABELS[beneficiary.beneficiary_type]}
                  </Typography>
                </Box>
                {beneficiary.name && (
                  <Typography sx={{ color: 'rgba(239,235,228,0.7)', fontSize: '13px' }}>
                    {beneficiary.name}
                    {beneficiary.relationship && ` (${beneficiary.relationship})`}
                  </Typography>
                )}
                {beneficiary.organization_name && (
                  <Typography sx={{ color: 'rgba(239,235,228,0.7)', fontSize: '13px' }}>
                    {beneficiary.organization_name}
                  </Typography>
                )}
                {beneficiary.phone && (
                  <Typography sx={{ color: 'rgba(239,235,228,0.5)', fontSize: '12px' }}>
                    {beneficiary.phone}
                  </Typography>
                )}
                {beneficiary.email && (
                  <Typography sx={{ color: 'rgba(239,235,228,0.5)', fontSize: '12px' }}>
                    {beneficiary.email}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* Beneficiary section - Edit mode */}
        {editing && (
          <Box sx={{
            background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)',
            borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', p: 2.5
          }}>
            <Typography sx={{
              color: 'rgba(239,235,228,0.4)', fontSize: '10px',
              textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, mb: 1.5
            }}>
              Edit Beneficiary
            </Typography>

            {/* Type selector - horizontal row */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              {beneficiaryOptions.map(opt => (
                <Box
                  key={opt.type}
                  onClick={() => !saving && setEditType(opt.type)}
                  sx={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5,
                    p: 1.5, borderRadius: '10px', cursor: saving ? 'default' : 'pointer',
                    border: '2px solid',
                    borderColor: editType === opt.type ? '#D4956A' : 'rgba(255,255,255,0.08)',
                    backgroundColor: editType === opt.type ? 'rgba(212,149,106,0.08)' : 'transparent',
                    transition: 'all 0.2s ease',
                    '&:hover': saving ? {} : { borderColor: editType === opt.type ? '#D4956A' : 'rgba(255,255,255,0.2)' }
                  }}
                >
                  {opt.icon}
                  <Typography sx={{ color: '#EFEBE4', fontWeight: 600, fontSize: '11px', textAlign: 'center' }}>
                    {opt.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Contact fields for family/friend - 2-col grid */}
            {editType === 'family_friend' && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
                <TextField label="First Name" size="small" value={editFirstName} onChange={(e) => setEditFirstName(autoCap(e.target.value))} sx={inputSx} disabled={saving} />
                <TextField label="Last Name" size="small" value={editLastName} onChange={(e) => setEditLastName(autoCap(e.target.value))} sx={inputSx} disabled={saving} />
                <TextField label="Relationship" size="small" value={editRelationship} onChange={(e) => setEditRelationship(autoCap(e.target.value))} placeholder="e.g. Daughter" sx={inputSx} disabled={saving} />
                <TextField label="Phone" size="small" value={editPhone} onChange={(e) => setEditPhone(formatUSPhone(e.target.value))} sx={inputSx} disabled={saving} inputProps={{ maxLength: 14 }} />
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <TextField label="Email" size="small" fullWidth value={editEmail} onChange={(e) => { setEditEmail(e.target.value); setEmailError(false); }} error={emailError} helperText={emailError ? 'Enter a valid email' : ''} sx={inputSx} disabled={saving} />
                </Box>
              </Box>
            )}

            {/* Contact fields for charity/facility - 2-col grid */}
            {editType === 'charity_facility' && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <TextField label="Organization Name" size="small" fullWidth value={editOrgName} onChange={(e) => setEditOrgName(e.target.value)} sx={inputSx} disabled={saving} />
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <TextField label="Contact Name" size="small" fullWidth value={editFirstName} onChange={(e) => setEditFirstName(autoCapWords(e.target.value))} sx={inputSx} disabled={saving} />
                </Box>
                <TextField label="Phone" size="small" value={editPhone} onChange={(e) => setEditPhone(formatUSPhone(e.target.value))} sx={inputSx} disabled={saving} inputProps={{ maxLength: 14 }} />
                <TextField label="Email" size="small" value={editEmail} onChange={(e) => { setEditEmail(e.target.value); setEmailError(false); }} error={emailError} helperText={emailError ? 'Enter a valid email' : ''} sx={inputSx} disabled={saving} />
              </Box>
            )}

            {/* Action buttons */}
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                onClick={() => setEditing(false)}
                disabled={saving}
                sx={{
                  flex: 1, py: 1, color: 'rgba(239,235,228,0.6)', fontSize: '13px',
                  borderColor: 'rgba(255,255,255,0.15)', borderRadius: '10px',
                  '&:hover': { borderColor: 'rgba(255,255,255,0.3)' }
                }}
                variant="outlined"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveBeneficiary}
                disabled={saving || !editType}
                sx={{
                  flex: 2, py: 1, backgroundColor: '#1A1A1A', color: '#FFFFFF',
                  fontSize: '13px', fontWeight: 600, borderRadius: '10px',
                  '&:hover': { backgroundColor: '#333333' },
                  '&.Mui-disabled': { backgroundColor: 'rgba(26,26,26,0.3)', color: 'rgba(255,255,255,0.3)' }
                }}
                variant="contained"
              >
                {saving ? <CircularProgress size={18} sx={{ color: '#EFEBE4' }} /> : 'Save'}
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Dialog>
  );

  if (isMobile) {
    return (
      <Box sx={{ pb: 8 }}>
        {/* Mobile top bar */}
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            background: '#3D4A3E',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: '"Outfit", sans-serif',
                fontWeight: 700,
                color: '#EFEBE4'
              }}
            >
              NoorVana Advantage
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton onClick={handleOpenProfile} sx={{ color: '#EFEBE4' }}>
                <VisibilityOutlinedIcon />
              </IconButton>
              <IconButton onClick={handleLogout} sx={{ color: '#EFEBE4' }}>
                <LogoutIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Main content */}
        <Box sx={{ mt: 8, minHeight: 'calc(100vh - 120px)' }}>
          {children}
        </Box>

        {/* Bottom navigation */}
        <BottomNavigation
          value={currentNavIndex}
          onChange={(_, idx) => handleNavClick(NAV_ITEMS[idx].path)}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1200,
            backgroundColor: '#3D4A3E',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            height: 64,
            '& .MuiBottomNavigationAction-root': {
              color: 'rgba(239, 235, 228, 0.5)',
              minWidth: 0,
              padding: '6px 0',
              '&.Mui-selected': {
                color: '#D4956A'
              }
            }
          }}
        >
          {NAV_ITEMS.map((item) => (
            <BottomNavigationAction
              key={item.path}
              label={item.shortLabel}
              icon={item.icon}
            />
          ))}
        </BottomNavigation>
        {profileWidget}
      </Box>
    );
  }

  // Desktop layout
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
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#EFEBE4',
          overflow: 'auto'
        }}
      >
        {children}
      </Box>
      {profileWidget}
    </Box>
  );
};

export default Layout;
