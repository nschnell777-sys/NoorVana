import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, CircularProgress, Radio, RadioGroup, FormControlLabel,
  Stepper, Step, StepLabel, Alert, Chip
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import FavoriteIcon from '@mui/icons-material/Favorite';
import BusinessIcon from '@mui/icons-material/Business';
import EditIcon from '@mui/icons-material/Edit';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import SecurityIcon from '@mui/icons-material/Security';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useAuth } from '../context/AuthContext';
import { getBeneficiary, saveBeneficiary, updateClientProfile, get2FAStatus, setup2FA, confirm2FA, disable2FA } from '../services/api';
import TierBadge from '../components/TierBadge';

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

const cardSx = {
  background: 'rgba(255,255,255,0.65)',
  backdropFilter: 'blur(12px)',
  borderRadius: '16px',
  border: '1px solid rgba(61, 74, 62, 0.08)',
  p: 3,
  mb: 3
};

const AccountPage = () => {
  const { client, updateClient } = useAuth();
  const [beneficiary, setBeneficiary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editType, setEditType] = useState('none');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRelationship, setEditRelationship] = useState('');
  const [editOrgName, setEditOrgName] = useState('');
  const [saving, setSaving] = useState(false);

  // Address editing
  const [addressOpen, setAddressOpen] = useState(false);
  const [addrStreet, setAddrStreet] = useState('');
  const [addrApt, setAddrApt] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrZip, setAddrZip] = useState('');
  const [addrSaving, setAddrSaving] = useState(false);

  useEffect(() => {
    if (!client) return;
    const fetch = async () => {
      try {
        const { data } = await getBeneficiary(client.id);
        setBeneficiary(data.beneficiary);
      } catch (err) {
        console.error('Failed to load beneficiary', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [client]);

  const openEdit = () => {
    if (beneficiary) {
      setEditType(beneficiary.beneficiary_type || 'none');
      setEditName(beneficiary.name || '');
      setEditPhone(beneficiary.phone || '');
      setEditEmail(beneficiary.email || '');
      setEditRelationship(beneficiary.relationship || '');
      setEditOrgName(beneficiary.organization_name || '');
    } else {
      setEditType('none');
      setEditName('');
      setEditPhone('');
      setEditEmail('');
      setEditRelationship('');
      setEditOrgName('');
    }
    setEditOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        beneficiary_type: editType,
        name: editName || null,
        phone: editPhone || null,
        email: editEmail || null,
        relationship: editRelationship || null,
        organization_name: editOrgName || null
      };
      const { data } = await saveBeneficiary(client.id, payload);
      setBeneficiary(data.beneficiary);
      setEditOpen(false);
    } catch (err) {
      console.error('Failed to save beneficiary', err);
    } finally {
      setSaving(false);
    }
  };

  const openAddressEdit = () => {
    setAddrStreet(client.address_street || '');
    setAddrApt(client.address_apt || '');
    setAddrCity(client.address_city || '');
    setAddrState(client.address_state || '');
    setAddrZip(client.address_zip || '');
    setAddressOpen(true);
  };

  const handleAddressSave = async () => {
    setAddrSaving(true);
    try {
      const payload = {
        address_street: addrStreet.trim(),
        address_apt: addrApt.trim() || null,
        address_city: addrCity.trim(),
        address_state: addrState.trim(),
        address_zip: addrZip.trim()
      };
      await updateClientProfile(client.id, payload);
      updateClient(payload);
      setAddressOpen(false);
    } catch (err) {
      console.error('Failed to save address', err);
    } finally {
      setAddrSaving(false);
    }
  };

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(true);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [setupStep, setSetupStep] = useState(0); // 0=QR, 1=confirm, 2=recovery codes
  const [qrCode, setQrCode] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetch2FA = async () => {
      try {
        const { data } = await get2FAStatus();
        setTwoFactorEnabled(data.two_factor_enabled);
      } catch {
        // ignore — user may not have 2FA columns yet
      } finally {
        setTwoFactorLoading(false);
      }
    };
    fetch2FA();
  }, []);

  const handleStartSetup = async () => {
    setSetupError('');
    setSetupLoading(true);
    try {
      const { data } = await setup2FA();
      setQrCode(data.qr_code);
      setSecretKey(data.secret);
      setSetupStep(0);
      setSetupCode('');
      setSetupDialogOpen(true);
    } catch (err) {
      setSetupError(err.response?.data?.error?.message || 'Failed to start setup.');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleConfirmSetup = async () => {
    setSetupError('');
    setSetupLoading(true);
    try {
      const { data } = await confirm2FA(setupCode);
      setRecoveryCodes(data.recovery_codes);
      setSetupStep(2);
      setTwoFactorEnabled(true);
    } catch (err) {
      setSetupError(err.response?.data?.error?.message || 'Invalid code. Please try again.');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setDisableError('');
    setDisableLoading(true);
    try {
      await disable2FA(disableCode);
      setTwoFactorEnabled(false);
      setDisableDialogOpen(false);
      setDisableCode('');
    } catch (err) {
      setDisableError(err.response?.data?.error?.message || 'Invalid code. Please try again.');
    } finally {
      setDisableLoading(false);
    }
  };

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasAddress = client.address_street && client.address_city && client.address_state && client.address_zip;

  if (!client) return null;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 600, mx: 'auto' }}>
      <Typography
        variant="h4"
        sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, color: '#2D2D2D', mb: 3 }}
      >
        Account
      </Typography>

      {/* Profile Info */}
      <Box sx={cardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <PersonOutlineIcon sx={{ fontSize: 40, color: '#3D4A3E' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#2D2D2D' }}>
              {client.name}
            </Typography>
            <Typography variant="body2" sx={{ color: '#5C6B5E' }}>
              {client.email}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="caption" sx={{ color: '#5C6B5E', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              Care Package
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500, color: '#2D2D2D' }}>
              {PACKAGE_LABELS[client.care_package] || client.care_package}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: '#5C6B5E', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              Tier
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <TierBadge tier={client.current_tier} size="small" />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Address */}
      <Box sx={cardSx}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOnOutlinedIcon sx={{ fontSize: 20, color: '#3D4A3E' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#2D2D2D', fontSize: '16px' }}>
              Address
            </Typography>
          </Box>
          <Button
            size="small"
            startIcon={<EditIcon sx={{ fontSize: 16 }} />}
            onClick={openAddressEdit}
            sx={{ color: '#5A8A7A', textTransform: 'none', fontWeight: 600 }}
          >
            {hasAddress ? 'Edit' : 'Add'}
          </Button>
        </Box>

        {hasAddress ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="body2" sx={{ color: '#2D2D2D' }}>{client.address_street}</Typography>
            {client.address_apt && (
              <Typography variant="body2" sx={{ color: '#2D2D2D' }}>{client.address_apt}</Typography>
            )}
            <Typography variant="body2" sx={{ color: '#2D2D2D' }}>
              {client.address_city}, {client.address_state} {client.address_zip}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: '#5C6B5E' }}>
            No address on file. Add your address for gift shipping and records.
          </Typography>
        )}
      </Box>

      {/* Security — 2FA */}
      <Box sx={cardSx}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon sx={{ fontSize: 20, color: '#3D4A3E' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#2D2D2D', fontSize: '16px' }}>
              Security
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#2D2D2D', mb: 0.5 }}>
              Two-Factor Authentication
            </Typography>
            <Typography variant="caption" sx={{ color: '#5C6B5E' }}>
              {twoFactorEnabled
                ? 'Your account is protected with an authenticator app.'
                : 'Add an extra layer of security to your account.'}
            </Typography>
          </Box>
          {twoFactorLoading ? (
            <CircularProgress size={20} />
          ) : twoFactorEnabled ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Chip label="Enabled" size="small" sx={{ backgroundColor: 'rgba(90, 138, 122, 0.12)', color: '#5A8A7A', fontWeight: 600, fontSize: '11px' }} />
              <Button
                size="small"
                color="error"
                onClick={() => { setDisableDialogOpen(true); setDisableCode(''); setDisableError(''); }}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Disable
              </Button>
            </Box>
          ) : (
            <Button
              size="small"
              variant="outlined"
              onClick={handleStartSetup}
              disabled={setupLoading}
              sx={{ textTransform: 'none', fontWeight: 600, color: '#5A8A7A', borderColor: '#5A8A7A' }}
            >
              {setupLoading ? <CircularProgress size={18} /> : 'Enable'}
            </Button>
          )}
        </Box>
      </Box>

      {/* 2FA Setup Dialog */}
      <Dialog open={setupDialogOpen} onClose={() => setupStep !== 2 && setSetupDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {setupStep === 0 && 'Scan QR Code'}
          {setupStep === 1 && 'Verify Code'}
          {setupStep === 2 && 'Save Recovery Codes'}
        </DialogTitle>
        <DialogContent>
          {setupStep === 0 && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 3 }}>
                Scan this QR code with Google Authenticator, Authy, or your preferred authenticator app.
              </Typography>
              {qrCode && (
                <Box sx={{ mb: 3 }}>
                  <img src={qrCode} alt="2FA QR Code" style={{ width: 200, height: 200 }} />
                </Box>
              )}
              <Typography variant="caption" sx={{ color: '#5C6B5E', display: 'block', mb: 1 }}>
                Can't scan? Enter this key manually:
              </Typography>
              <Typography variant="body2" sx={{
                fontFamily: 'monospace', fontSize: '14px', fontWeight: 600, color: '#3D4A3E',
                p: 1.5, borderRadius: '8px', backgroundColor: 'rgba(61, 74, 62, 0.06)',
                letterSpacing: '2px', wordBreak: 'break-all'
              }}>
                {secretKey}
              </Typography>
            </Box>
          )}

          {setupStep === 1 && (
            <Box sx={{ py: 2 }}>
              <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 3 }}>
                Enter the 6-digit code from your authenticator app to confirm setup.
              </Typography>
              {setupError && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>{setupError}</Alert>
              )}
              <TextField
                fullWidth
                label="6-digit code"
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoFocus
                inputProps={{ maxLength: 6 }}
              />
            </Box>
          )}

          {setupStep === 2 && (
            <Box sx={{ py: 2 }}>
              <Alert severity="warning" sx={{ mb: 3, borderRadius: '10px' }}>
                Save these recovery codes in a safe place. Each code can only be used once. If you lose access to your authenticator app, these are the only way to sign in.
              </Alert>
              <Box sx={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 3,
                p: 2, borderRadius: '10px', backgroundColor: 'rgba(61, 74, 62, 0.04)',
                border: '1px solid rgba(61, 74, 62, 0.08)'
              }}>
                {recoveryCodes.map((code, i) => (
                  <Typography key={i} variant="body2" sx={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 600, color: '#3D4A3E', py: 0.5, textAlign: 'center' }}>
                    {code}
                  </Typography>
                ))}
              </Box>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ContentCopyIcon />}
                onClick={copyRecoveryCodes}
                sx={{ mb: 1, textTransform: 'none' }}
              >
                {copied ? 'Copied!' : 'Copy All Codes'}
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {setupStep === 0 && (
            <>
              <Button onClick={() => setSetupDialogOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={() => { setSetupStep(1); setSetupCode(''); setSetupError(''); }}>
                Next
              </Button>
            </>
          )}
          {setupStep === 1 && (
            <>
              <Button onClick={() => setSetupStep(0)} disabled={setupLoading}>Back</Button>
              <Button
                variant="contained"
                onClick={handleConfirmSetup}
                disabled={setupLoading || setupCode.length < 6}
              >
                {setupLoading ? <CircularProgress size={20} /> : 'Verify & Enable'}
              </Button>
            </>
          )}
          {setupStep === 2 && (
            <Button
              variant="contained"
              onClick={() => setSetupDialogOpen(false)}
              sx={{ backgroundColor: '#5A8A7A', '&:hover': { backgroundColor: '#4A7A6A' } }}
            >
              I've Saved My Codes
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Disable 2FA Dialog */}
      <Dialog open={disableDialogOpen} onClose={() => !disableLoading && setDisableDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 1 }}>
            <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 3 }}>
              Enter your authenticator code to disable two-factor authentication.
            </Typography>
            {disableError && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>{disableError}</Alert>
            )}
            <TextField
              fullWidth
              label="6-digit code"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              autoFocus
              inputProps={{ maxLength: 6 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisableDialogOpen(false)} disabled={disableLoading}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDisable2FA}
            disabled={disableLoading || disableCode.length < 6}
          >
            {disableLoading ? <CircularProgress size={20} /> : 'Disable 2FA'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Beneficiary Info */}
      <Box sx={cardSx}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#2D2D2D', fontSize: '16px' }}>
            Beneficiary
          </Typography>
          <Button
            size="small"
            startIcon={<EditIcon sx={{ fontSize: 16 }} />}
            onClick={openEdit}
            sx={{ color: '#5A8A7A', textTransform: 'none', fontWeight: 600 }}
          >
            {beneficiary && beneficiary.beneficiary_type !== 'none' ? 'Edit' : 'Add'}
          </Button>
        </Box>

        {loading ? (
          <CircularProgress size={20} />
        ) : !beneficiary || beneficiary.beneficiary_type === 'none' ? (
          <Typography variant="body2" sx={{ color: '#5C6B5E' }}>
            No beneficiary selected. You can designate someone to receive your points balance.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {beneficiary.beneficiary_type === 'family_friend'
                ? <FavoriteIcon sx={{ fontSize: 18, color: '#D4956A' }} />
                : <BusinessIcon sx={{ fontSize: 18, color: '#5A8A7A' }} />
              }
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#2D2D2D' }}>
                {TYPE_LABELS[beneficiary.beneficiary_type]}
              </Typography>
            </Box>
            {beneficiary.name && (
              <InfoRow label="Name" value={beneficiary.name} />
            )}
            {beneficiary.relationship && (
              <InfoRow label="Relationship" value={beneficiary.relationship} />
            )}
            {beneficiary.organization_name && (
              <InfoRow label="Organization" value={beneficiary.organization_name} />
            )}
            {beneficiary.phone && (
              <InfoRow label="Phone" value={beneficiary.phone} />
            )}
            {beneficiary.email && (
              <InfoRow label="Email" value={beneficiary.email} />
            )}
          </Box>
        )}
      </Box>

      {/* Edit Address Dialog */}
      <Dialog open={addressOpen} onClose={() => !addrSaving && setAddressOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Address</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Street Address" fullWidth value={addrStreet} onChange={(e) => setAddrStreet(e.target.value)} required />
            <TextField label="Apt / Suite / Unit" fullWidth value={addrApt} onChange={(e) => setAddrApt(e.target.value)} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="City" fullWidth value={addrCity} onChange={(e) => setAddrCity(e.target.value)} required />
              <TextField label="State" sx={{ width: 120 }} value={addrState} onChange={(e) => setAddrState(e.target.value)} required />
            </Box>
            <TextField label="Zip Code" sx={{ width: 160 }} value={addrZip} onChange={(e) => setAddrZip(e.target.value)} required />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddressOpen(false)} disabled={addrSaving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddressSave}
            disabled={addrSaving || !addrStreet.trim() || !addrCity.trim() || !addrState.trim() || !addrZip.trim()}
          >
            {addrSaving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Beneficiary Dialog */}
      <Dialog open={editOpen} onClose={() => !saving && setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Beneficiary</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <RadioGroup value={editType} onChange={(e) => setEditType(e.target.value)}>
              <FormControlLabel value="family_friend" control={<Radio />} label="Family / Friend" />
              <FormControlLabel value="charity_facility" control={<Radio />} label="Charity / Facility" />
              <FormControlLabel value="none" control={<Radio />} label="None" />
            </RadioGroup>
          </Box>

          {editType === 'family_friend' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField label="Name" fullWidth value={editName} onChange={(e) => setEditName(e.target.value)} />
              <TextField label="Relationship" fullWidth value={editRelationship} onChange={(e) => setEditRelationship(e.target.value)} placeholder="e.g. Daughter, Spouse, Friend" />
              <TextField label="Phone" fullWidth value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              <TextField label="Email" fullWidth value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </Box>
          )}

          {editType === 'charity_facility' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField label="Organization Name" fullWidth value={editOrgName} onChange={(e) => setEditOrgName(e.target.value)} />
              <TextField label="Contact Name" fullWidth value={editName} onChange={(e) => setEditName(e.target.value)} />
              <TextField label="Phone" fullWidth value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              <TextField label="Email" fullWidth value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const InfoRow = ({ label, value }) => (
  <Box sx={{ display: 'flex', gap: 1 }}>
    <Typography variant="body2" sx={{ color: '#5C6B5E', minWidth: 90 }}>{label}:</Typography>
    <Typography variant="body2" sx={{ color: '#2D2D2D' }}>{value}</Typography>
  </Box>
);

export default AccountPage;
