import React, { useState } from 'react';
import {
  Box, Typography, Button, TextField, CircularProgress
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import FavoriteIcon from '@mui/icons-material/Favorite';
import BusinessIcon from '@mui/icons-material/Business';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useAuth } from '../context/AuthContext';
import { completeSetup, saveBeneficiary } from '../services/api';
import TierBadge from '../components/TierBadge';

const PACKAGE_LABELS = {
  essentials: 'Care Essentials',
  premium: 'Care Premium',
  white_glove: 'White Glove'
};

const autoCap = (v) => v ? v.charAt(0).toUpperCase() + v.slice(1) : '';
const autoCapWords = (v) => v ? v.replace(/\b\w/g, (c) => c.toUpperCase()) : '';

const formatUSPhone = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 10);
  if (d.length === 0) return '';
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0,3)}) ${d.slice(3)}`;
  return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
};

const isValidEmail = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const inputSx = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: '12px',
    color: '#EFEBE4',
    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.4)' },
    '&.Mui-focused fieldset': { borderColor: '#D4956A' }
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(239, 235, 228, 0.5)',
    '&.Mui-focused': { color: '#D4956A' }
  }
};

const SetupPage = () => {
  const { client, updateClient } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Profile fields (editable)
  const [phone, setPhone] = useState(client?.phone || '');
  const [street, setStreet] = useState(client?.address_street || '');
  const [apt, setApt] = useState(client?.address_apt || '');
  const [city, setCity] = useState(client?.address_city || '');
  const [state, setState] = useState(client?.address_state || '');
  const [zip, setZip] = useState(client?.address_zip || '');

  // Beneficiary fields
  const [benType, setBenType] = useState(null); // null = not selected yet
  const [benFirstName, setBenFirstName] = useState('');
  const [benLastName, setBenLastName] = useState('');
  const [benPhone, setBenPhone] = useState('');
  const [benEmail, setBenEmail] = useState('');
  const [benEmailError, setBenEmailError] = useState(false);
  const [benRelationship, setBenRelationship] = useState('');
  const [benOrgName, setBenOrgName] = useState('');

  const handleContinue = () => {
    setStep(1);
  };

  const handleComplete = async () => {
    if (benEmail && !isValidEmail(benEmail)) {
      setBenEmailError(true);
      return;
    }
    setLoading(true);
    try {
      // Save beneficiary if one was selected
      if (benType && benType !== 'none') {
        const fullName = [benFirstName.trim(), benLastName.trim()].filter(Boolean).join(' ') || null;
        await saveBeneficiary(client.id, {
          beneficiary_type: benType,
          name: fullName,
          phone: benPhone || null,
          email: benEmail || null,
          relationship: benType === 'family_friend' ? (benRelationship || null) : null,
          organization_name: benType === 'charity_facility' ? (benOrgName || null) : null
        });
      } else if (benType === 'none') {
        await saveBeneficiary(client.id, { beneficiary_type: 'none' });
      }

      // Complete setup (with any profile updates)
      const profileUpdates = {};
      if (phone) profileUpdates.phone = phone;
      if (street) profileUpdates.address_street = street;
      profileUpdates.address_apt = apt || null;
      if (city) profileUpdates.address_city = city;
      if (state) profileUpdates.address_state = state;
      if (zip) profileUpdates.address_zip = zip;

      await completeSetup(client.id, profileUpdates);

      updateClient({
        setup_completed: true,
        ...profileUpdates
      });
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Setup failed', err);
      setLoading(false);
    }
  };

  if (!client) return null;

  const beneficiaryOptions = [
    {
      type: 'family_friend',
      icon: <FavoriteIcon sx={{ fontSize: 28, color: '#D4956A' }} />,
      label: 'Family or Friend',
      desc: 'Designate a loved one to receive your points balance'
    },
    {
      type: 'charity_facility',
      icon: <BusinessIcon sx={{ fontSize: 28, color: '#5A8A7A' }} />,
      label: 'Charity or Facility',
      desc: 'Donate your points balance to an organization'
    },
    {
      type: 'none',
      icon: <BlockIcon sx={{ fontSize: 28, color: 'rgba(239, 235, 228, 0.4)' }} />,
      label: 'Skip for Now',
      desc: 'You can always add one later from your Account page'
    }
  ];

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(145deg, #2A332B 0%, #3D4A3E 40%, #4A5A4C 100%)', px: 2, py: 4
    }}>
      <Box sx={{
        width: '100%', maxWidth: 520,
        background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '16px',
        p: { xs: 3, sm: 5 }, boxShadow: '0 8px 40px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h2" sx={{
            fontFamily: '"Outfit", sans-serif', fontWeight: 600, color: '#EFEBE4',
            fontSize: { xs: '24px', sm: '28px' }, lineHeight: 1.2, mb: 1
          }}>
            {step === 0 ? 'Welcome to NoorVana Advantage' : 'Choose a Beneficiary'}
          </Typography>
          <Typography sx={{ fontSize: '12px', fontWeight: 500, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(239, 235, 228, 0.45)' }}>
            {step === 0 ? 'Review Your Profile' : 'Optional'}
          </Typography>
          {/* Step indicator */}
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 2 }}>
            {[0, 1].map(i => (
              <Box key={i} sx={{
                width: 40, height: 4, borderRadius: 2,
                backgroundColor: i <= step ? '#D4956A' : 'rgba(255,255,255,0.15)'
              }} />
            ))}
          </Box>
        </Box>

        {/* Step 0: Review Profile */}
        {step === 0 && (
          <Box>
            {/* Read-only info */}
            <Box sx={{
              background: 'rgba(255,255,255,0.06)', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)', p: 2.5, mb: 3
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <PersonOutlineIcon sx={{ fontSize: 32, color: '#EFEBE4' }} />
                <Box>
                  <Typography sx={{ color: '#EFEBE4', fontWeight: 600, fontSize: '16px' }}>{client.name}</Typography>
                  <Typography sx={{ color: 'rgba(239,235,228,0.5)', fontSize: '13px' }}>{client.email}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 3 }}>
                <Box>
                  <Typography sx={{ color: 'rgba(239,235,228,0.4)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                    Care Package
                  </Typography>
                  <Typography sx={{ color: '#EFEBE4', fontSize: '14px', fontWeight: 500 }}>
                    {PACKAGE_LABELS[client.care_package] || client.care_package}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'rgba(239,235,228,0.4)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, mb: 0.5 }}>
                    Tier
                  </Typography>
                  <TierBadge tier={client.current_tier} size="small" />
                </Box>
              </Box>
            </Box>

            {/* Editable fields */}
            <TextField label="Phone" fullWidth value={phone} onChange={(e) => setPhone(formatUSPhone(e.target.value))} inputProps={{ maxLength: 14 }} sx={{ mb: 2, ...inputSx }} />
            <TextField label="Street Address" fullWidth value={street} onChange={(e) => setStreet(e.target.value)} sx={{ mb: 2, ...inputSx }} />
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
              <TextField label="Apt / Unit" value={apt} onChange={(e) => setApt(e.target.value)} sx={{ flex: 0.7, ...inputSx }} />
              <TextField label="City" value={city} onChange={(e) => setCity(e.target.value)} sx={{ flex: 1, ...inputSx }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
              <TextField label="State" value={state} onChange={(e) => setState(e.target.value)} sx={{ flex: 0.7, ...inputSx }} inputProps={{ maxLength: 2 }} />
              <TextField label="ZIP" value={zip} onChange={(e) => setZip(e.target.value)} sx={{ flex: 1, ...inputSx }} inputProps={{ maxLength: 10 }} />
            </Box>

            <Button
              variant="contained"
              fullWidth
              onClick={handleContinue}
              sx={{
                py: 1.5, backgroundColor: '#1A1A1A', color: '#FFFFFF', fontSize: '15px', fontWeight: 600,
                '&:hover': { backgroundColor: '#333333' }
              }}
            >
              Continue
            </Button>
          </Box>
        )}

        {/* Step 1: Beneficiary */}
        {step === 1 && (
          <Box>
            <Typography sx={{ color: 'rgba(239,235,228,0.6)', fontSize: '13px', mb: 3, textAlign: 'center' }}>
              Would you like to designate a beneficiary for your loyalty points? This person or organization would receive your points balance if your account is closed.
            </Typography>

            {/* Beneficiary type cards */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
              {beneficiaryOptions.map(opt => (
                <Box
                  key={opt.type}
                  onClick={() => setBenType(opt.type)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 2,
                    p: 2, borderRadius: '12px', cursor: 'pointer',
                    border: '2px solid',
                    borderColor: benType === opt.type ? '#D4956A' : 'rgba(255,255,255,0.1)',
                    backgroundColor: benType === opt.type ? 'rgba(212,149,106,0.08)' : 'rgba(255,255,255,0.03)',
                    transition: 'all 0.2s ease',
                    '&:hover': { borderColor: benType === opt.type ? '#D4956A' : 'rgba(255,255,255,0.25)' }
                  }}
                >
                  {opt.icon}
                  <Box>
                    <Typography sx={{ color: '#EFEBE4', fontWeight: 600, fontSize: '14px' }}>{opt.label}</Typography>
                    <Typography sx={{ color: 'rgba(239,235,228,0.4)', fontSize: '12px' }}>{opt.desc}</Typography>
                  </Box>
                  {benType === opt.type && (
                    <CheckCircleOutlineIcon sx={{ ml: 'auto', color: '#D4956A', fontSize: 22 }} />
                  )}
                </Box>
              ))}
            </Box>

            {/* Contact fields for family/friend */}
            {benType === 'family_friend' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <TextField label="First Name" sx={{ flex: 1, ...inputSx }} value={benFirstName} onChange={(e) => setBenFirstName(autoCap(e.target.value))} />
                  <TextField label="Last Name" sx={{ flex: 1, ...inputSx }} value={benLastName} onChange={(e) => setBenLastName(autoCap(e.target.value))} />
                </Box>
                <TextField label="Relationship" fullWidth value={benRelationship} onChange={(e) => setBenRelationship(autoCap(e.target.value))} placeholder="e.g. Daughter, Spouse" sx={inputSx} />
                <TextField label="Phone" fullWidth value={benPhone} onChange={(e) => setBenPhone(formatUSPhone(e.target.value))} inputProps={{ maxLength: 14 }} sx={inputSx} />
                <TextField label="Email" fullWidth value={benEmail} onChange={(e) => { setBenEmail(e.target.value); setBenEmailError(false); }} error={benEmailError} helperText={benEmailError ? 'Enter a valid email' : ''} sx={inputSx} />
              </Box>
            )}

            {/* Contact fields for charity/facility */}
            {benType === 'charity_facility' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                <TextField label="Organization Name" fullWidth value={benOrgName} onChange={(e) => setBenOrgName(e.target.value)} sx={inputSx} />
                <TextField label="Contact Name" fullWidth value={benFirstName} onChange={(e) => setBenFirstName(autoCapWords(e.target.value))} sx={inputSx} />
                <TextField label="Phone" fullWidth value={benPhone} onChange={(e) => setBenPhone(formatUSPhone(e.target.value))} inputProps={{ maxLength: 14 }} sx={inputSx} />
                <TextField label="Email" fullWidth value={benEmail} onChange={(e) => { setBenEmail(e.target.value); setBenEmailError(false); }} error={benEmailError} helperText={benEmailError ? 'Enter a valid email' : ''} sx={inputSx} />
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                onClick={() => setStep(0)}
                sx={{
                  flex: 1, py: 1.5, color: 'rgba(239,235,228,0.6)', borderColor: 'rgba(255,255,255,0.2)',
                  '&:hover': { borderColor: 'rgba(255,255,255,0.4)' }
                }}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleComplete}
                disabled={loading || !benType}
                sx={{
                  flex: 2, py: 1.5, backgroundColor: '#1A1A1A', color: '#FFFFFF', fontSize: '15px', fontWeight: 600,
                  '&:hover': { backgroundColor: '#333333' },
                  '&.Mui-disabled': { backgroundColor: 'rgba(26,26,26,0.3)', color: 'rgba(255,255,255,0.3)' }
                }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: '#EFEBE4' }} /> : 'Complete Setup'}
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default SetupPage;
