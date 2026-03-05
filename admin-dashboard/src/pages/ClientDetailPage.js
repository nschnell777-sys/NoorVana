import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, LinearProgress, Button, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, TablePagination,
  Chip, Collapse, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Alert, CircularProgress,
  Checkbox, FormControlLabel, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import ContactsIcon from '@mui/icons-material/Contacts';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import LockResetIcon from '@mui/icons-material/LockReset';
import { getClientDetail, updateClient, adminUnenrollClient, adminReenrollClient, adminResetClientPassword } from '../services/api';
import TierBadge from '../components/TierBadge';
import PointAdjustmentModal from '../components/PointAdjustmentModal';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { formatPoints, formatCurrency, formatShortDate, pointsToDollars } from '../utils/formatters';
import { frostedCardSx } from '../theme';

const PACKAGE_LABELS = {
  essentials: 'Care Essentials',
  premium: 'Care Premium',
  white_glove: 'White Glove'
};

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC'
];

const ClientDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { admin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [expandedId, setExpandedId] = useState(null);

  // Transaction sort, filter, pagination
  const [txSortKey, setTxSortKey] = useState('created_at');
  const [txSortDir, setTxSortDir] = useState('desc');
  const [txTypeFilter, setTxTypeFilter] = useState('');
  const [txDateFrom, setTxDateFrom] = useState('');
  const [txDateTo, setTxDateTo] = useState('');
  const [txPage, setTxPage] = useState(0);
  const txRowsPerPage = 10;

  // Edit contact state
  const [editContactOpen, setEditContactOpen] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editStreet, setEditStreet] = useState('');
  const [editApt, setEditApt] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editZip, setEditZip] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Reset password state
  const [resetPwStep, setResetPwStep] = useState(0); // 0 = closed, 1 = first confirm, 2 = final confirm
  const [resetPwLoading, setResetPwLoading] = useState(false);

  // Unenroll/reenroll state
  const [unenrollDialogOpen, setUnenrollDialogOpen] = useState(false);
  const [unenrollReason, setUnenrollReason] = useState('');
  const [unenrollLoading, setUnenrollLoading] = useState(false);
  const [unenrollChecks, setUnenrollChecks] = useState([]);
  const [unenrollStep, setUnenrollStep] = useState(0); // 0 = checklist, 1 = final confirm
  const [reenrollDialogOpen, setReenrollDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      const res = await getClientDetail(id);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load client', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const openEditContact = () => {
    const c = data?.client;
    setEditPhone(c?.phone || '');
    setEditStreet(c?.address_street || '');
    setEditApt(c?.address_apt || '');
    setEditCity(c?.address_city || '');
    setEditState(c?.address_state || '');
    setEditZip(c?.address_zip || '');
    setEditContactOpen(true);
  };

  const handleSaveContact = async () => {
    setEditSaving(true);
    try {
      await updateClient(id, {
        phone: editPhone,
        address_street: editStreet,
        address_apt: editApt,
        address_city: editCity,
        address_state: editState,
        address_zip: editZip
      });
      setEditContactOpen(false);
      setToast({ open: true, message: 'Contact info updated', severity: 'success' });
      fetchData();
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.error?.message || 'Failed to update', severity: 'error' });
    } finally {
      setEditSaving(false);
    }
  };

  const handleUnenroll = async () => {
    if (!unenrollReason) return;
    setUnenrollLoading(true);
    try {
      const res = await adminUnenrollClient(id, { reason: unenrollReason });
      setUnenrollDialogOpen(false);
      setUnenrollReason('');
      const transfer = res.data?.beneficiary_transfer;
      const msg = transfer
        ? `Client unenrolled — ${formatPoints(transfer.points_transferred)} pts transferred to ${transfer.beneficiary_name || 'beneficiary'}`
        : 'Client unenrolled successfully';
      setToast({ open: true, message: msg, severity: 'success' });
      fetchData();
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.error?.message || 'Failed to unenroll', severity: 'error' });
    } finally {
      setUnenrollLoading(false);
    }
  };

  const handleReenroll = async () => {
    setUnenrollLoading(true);
    try {
      await adminReenrollClient(id);
      setToast({ open: true, message: 'Client re-enrolled successfully', severity: 'success' });
      fetchData();
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.error?.message || 'Failed to re-enroll', severity: 'error' });
    } finally {
      setUnenrollLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setResetPwLoading(true);
    try {
      await adminResetClientPassword(id);
      setResetPwStep(0);
      setToast({ open: true, message: 'Password reset successfully. Client will need to set up a new password.', severity: 'success' });
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.error?.message || 'Failed to reset password', severity: 'error' });
    } finally {
      setResetPwLoading(false);
    }
  };

  const handleTxSort = (key) => {
    if (txSortKey === key) {
      setTxSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setTxSortKey(key);
      setTxSortDir(key === 'created_at' ? 'desc' : 'desc');
    }
    setTxPage(0);
  };

  const CLOSURE_LABELS = {
    deceased: 'Deceased',
    cancelled_care_package: 'Cancelled Care Package'
  };

  const getTypeChip = (type) => {
    const styles = {
      earn: { label: 'Earned', color: '#5A8A7A', bg: 'rgba(90, 138, 122, 0.1)' },
      redeem: { label: 'Redeemed', color: '#C1592E', bg: 'rgba(193, 89, 46, 0.1)' },
      adjustment: { label: 'Adjusted', color: '#3D4A3E', bg: 'rgba(61, 74, 62, 0.1)' },
      beneficiary_transfer: { label: 'Beneficiary', color: '#7B5EA7', bg: 'rgba(123, 94, 167, 0.1)' }
    };
    const style = styles[type] || styles.earn;
    return (
      <Chip
        label={style.label}
        size="small"
        sx={{ backgroundColor: style.bg, color: style.color, fontWeight: 600, fontSize: '11px', height: 24 }}
      />
    );
  };

  if (loading) return <LoadingSpinner />;
  if (!data) return <Typography>Client not found</Typography>;

  const { client, recent_transactions, tier_history, beneficiary } = data;
  const canAdjust = admin?.role === 'admin' || admin?.role === 'customer_service';

  // Helper to get display points for a transaction (used for sorting)
  const getTxPoints = (tx) => {
    if (tx.transaction_type === 'redeem' || tx.transaction_type === 'beneficiary_transfer') return tx.redeemable_points_change;
    if (tx.transaction_type === 'adjustment') return tx.lifetime_points_change || tx.redeemable_points_change;
    return tx.lifetime_points_change;
  };

  // Filter + sort + paginate transactions
  const filteredTx = recent_transactions.filter(tx => {
    if (txTypeFilter && tx.transaction_type !== txTypeFilter) return false;
    if (txDateFrom && tx.created_at < txDateFrom) return false;
    if (txDateTo && tx.created_at > txDateTo + 'T23:59:59') return false;
    return true;
  });

  const sortedTx = [...filteredTx].sort((a, b) => {
    let aVal, bVal;
    if (txSortKey === 'points') {
      aVal = getTxPoints(a) ?? 0;
      bVal = getTxPoints(b) ?? 0;
    } else if (txSortKey === 'invoice_amount') {
      aVal = parseFloat(a.invoice_amount) || 0;
      bVal = parseFloat(b.invoice_amount) || 0;
    } else if (txSortKey === 'created_at') {
      aVal = a.created_at || '';
      bVal = b.created_at || '';
    } else if (txSortKey === 'transaction_type') {
      aVal = a.transaction_type || '';
      bVal = b.transaction_type || '';
    } else if (txSortKey === 'source') {
      aVal = a.source || '';
      bVal = b.source || '';
    } else {
      aVal = a[txSortKey] ?? 0;
      bVal = b[txSortKey] ?? 0;
    }
    if (typeof aVal === 'string') return txSortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    return txSortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const paginatedTx = sortedTx.slice(txPage * txRowsPerPage, txPage * txRowsPerPage + txRowsPerPage);

  const hasAddress = client.address_street || client.address_city;

  return (
    <Box>
      {/* Header with back button */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <IconButton
          onClick={() => navigate('/clients')}
          sx={{
            backgroundColor: 'rgba(61, 74, 62, 0.06)',
            '&:hover': { backgroundColor: 'rgba(61, 74, 62, 0.12)' }
          }}
        >
          <ArrowBackIcon sx={{ color: '#3D4A3E' }} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4">{client.name}</Typography>
          <Typography variant="body2" sx={{ color: '#5C6B5E' }}>{client.email}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {canAdjust && (
            <>
              <Button variant="outlined" size="small" startIcon={<ContactsIcon />} onClick={openEditContact}>
                Edit Contact
              </Button>
              <Button variant="outlined" size="small" startIcon={<LockResetIcon />} onClick={() => setResetPwStep(1)}>
                Reset Password
              </Button>
              {!!client.is_active && (
                <Button variant="contained" size="small" startIcon={<EditIcon />} onClick={() => setAdjustModalOpen(true)}>
                  Adjust Points
                </Button>
              )}
              {!!client.is_active && (
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  onClick={() => { setUnenrollDialogOpen(true); setUnenrollReason(''); setUnenrollChecks([]); setUnenrollStep(0); }}
                >
                  Unenroll
                </Button>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* AxisCare connected indicator */}
      {client.axiscare_client_id && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: !client.is_active ? 1.5 : 3, ml: 7 }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 14, color: '#5A8A7A' }} />
          <Typography variant="caption" sx={{ color: '#5A8A7A', fontWeight: 500 }}>
            Synced from AxisCare — ID: {client.axiscare_client_id}
          </Typography>
        </Box>
      )}

      {/* Inactive client banner */}
      {!client.is_active && (
        <Alert
          severity={client.unenroll_reason === 'deceased' ? 'error' : 'warning'}
          sx={{ mb: 3, borderRadius: '12px' }}
          action={
            canAdjust && (
              <Button color="inherit" size="small" onClick={() => setReenrollDialogOpen(true)} disabled={unenrollLoading}>
                Re-enroll
              </Button>
            )
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {client.unenroll_reason === 'deceased'
              ? `Account Closed${client.unenrolled_at ? ` on ${formatShortDate(client.unenrolled_at)}` : ''} — Deceased`
              : `Unenrolled${client.unenrolled_at ? ` on ${formatShortDate(client.unenrolled_at)}` : ''}${client.unenroll_reason ? ` — ${CLOSURE_LABELS[client.unenroll_reason] || client.unenroll_reason}` : ''}`
            }
          </Typography>
          {client.unenroll_reason !== 'deceased' ? (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Points retained: {formatPoints(client.redeemable_points)} pts — eligible for re-enrollment
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Account can be re-enrolled if circumstances change
            </Typography>
          )}
        </Alert>
      )}

      {/* Top row: Profile + Points — equal height */}
      <Grid container spacing={3} sx={{ mb: 3, alignItems: 'stretch' }}>
        {/* Client Profile */}
        <Grid item xs={12} md={5} sx={{ display: 'flex' }}>
          <Box sx={{ ...frostedCardSx, p: 3, '&:hover': { transform: 'none' }, width: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2.5 }}>Client Profile</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <ProfileRow label="Care Package">
                <Chip
                  label={PACKAGE_LABELS[client.care_package] || client.care_package}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(212, 149, 106, 0.12)',
                    color: '#B87A4F',
                    fontWeight: 600,
                    fontSize: '12px'
                  }}
                />
              </ProfileRow>
              <ProfileRow label="Current Tier">
                <TierBadge tier={client.current_tier} size="small" />
              </ProfileRow>
              <ProfileRow label="Earn Rate">
                <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"Outfit", sans-serif' }}>
                  {client.tier_multiplier}x multiplier
                </Typography>
              </ProfileRow>
              <ProfileRow label="Phone">
                <Typography variant="body2">
                  {client.phone || <span style={{ color: '#9CA89E', fontStyle: 'italic' }}>Not on file</span>}
                </Typography>
              </ProfileRow>
              <ProfileRow label="Address">
                {hasAddress ? (
                  <Box>
                    <Typography variant="body2">
                      {client.address_street}
                      {client.address_apt && `, ${client.address_apt}`}
                    </Typography>
                    <Typography variant="body2">
                      {[client.address_city, client.address_state].filter(Boolean).join(', ')}
                      {client.address_zip && ` ${client.address_zip}`}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ color: '#9CA89E', fontStyle: 'italic' }}>
                    Not on file
                  </Typography>
                )}
              </ProfileRow>
              <ProfileRow label="Member Since">
                <Typography variant="body2">{formatShortDate(client.created_at)}</Typography>
              </ProfileRow>
              {client.tier_upgraded_at && (
                <ProfileRow label="Last Upgrade">
                  <Typography variant="body2">{formatShortDate(client.tier_upgraded_at)}</Typography>
                </ProfileRow>
              )}
            </Box>
          </Box>
        </Grid>

        {/* Points Balance */}
        <Grid item xs={12} md={7} sx={{ display: 'flex' }}>
          <Box sx={{ ...frostedCardSx, p: 3, '&:hover': { transform: 'none' }, width: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2.5 }}>Points Balance</Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#5C6B5E', display: 'block', mb: 0.5 }}>Lifetime</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: '#3D4A3E' }}>
                    {formatPoints(client.lifetime_points)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#5C6B5E', display: 'block', mb: 0.5 }}>Redeemable</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: '#5A8A7A' }}>
                    {formatPoints(client.redeemable_points)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#5C6B5E', display: 'block', mb: 0.5 }}>Credit Available</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: '#D4956A' }}>
                    {formatCurrency(client.credit_available)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#5C6B5E', display: 'block', mb: 0.5 }}>Multiplier</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: '#3D4A3E' }}>
                    {client.tier_multiplier}x
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Tier progress */}
            <Box sx={{
              p: 2.5,
              borderRadius: '10px',
              backgroundColor: 'rgba(61, 74, 62, 0.04)',
              mb: 2
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, color: '#3D4A3E' }}>
                  {client.next_tier
                    ? `Progress to ${client.next_tier.charAt(0).toUpperCase() + client.next_tier.slice(1)}`
                    : 'Maximum Tier Achieved'}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"Outfit", sans-serif', color: '#5A8A7A' }}>
                  {client.progress_percentage}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={client.progress_percentage}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: 'rgba(61, 74, 62, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 5,
                    background: 'linear-gradient(90deg, #5A8A7A, #3D4A3E)'
                  }
                }}
              />
              <Typography variant="caption" sx={{ color: '#5C6B5E', mt: 0.5, display: 'block' }}>
                {client.next_tier
                  ? `${formatPoints(client.points_to_next_tier)} points to go`
                  : 'Diamond tier — highest level'}
              </Typography>
            </Box>

            {/* Tier history timeline */}
            {tier_history && tier_history.length > 0 && (
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#3D4A3E', mb: 1 }}>Tier Journey</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {tier_history.map((th, idx) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TierBadge tier={th.to_tier} size="small" />
                      <Typography variant="caption" sx={{ color: '#9CA89E' }}>
                        {formatShortDate(th.upgraded_at)}
                      </Typography>
                      {idx < tier_history.length - 1 && (
                        <Typography variant="caption" sx={{ color: '#9CA89E', mx: 0.5 }}>→</Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>

      {/* Beneficiary Info */}
      <Box sx={{ ...frostedCardSx, p: 3, mb: 3, '&:hover': { transform: 'none' } }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Beneficiary</Typography>
        {!beneficiary || beneficiary.beneficiary_type === 'none' ? (
          <Typography variant="body2" sx={{ color: '#9CA89E', fontStyle: 'italic' }}>
            {beneficiary?.beneficiary_type === 'none' ? 'Client chose not to designate a beneficiary' : 'No beneficiary on file'}
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <ProfileRow label="Type">
              <Chip
                label={beneficiary.beneficiary_type === 'family_friend' ? 'Family / Friend' : 'Charity / Facility'}
                size="small"
                sx={{
                  backgroundColor: beneficiary.beneficiary_type === 'family_friend'
                    ? 'rgba(212, 149, 106, 0.12)' : 'rgba(90, 138, 122, 0.12)',
                  color: beneficiary.beneficiary_type === 'family_friend' ? '#B87A4F' : '#5A8A7A',
                  fontWeight: 600, fontSize: '12px'
                }}
              />
            </ProfileRow>
            {beneficiary.name && (
              <ProfileRow label="Name">
                <Typography variant="body2">{beneficiary.name}</Typography>
              </ProfileRow>
            )}
            {beneficiary.relationship && (
              <ProfileRow label="Relationship">
                <Typography variant="body2">{beneficiary.relationship}</Typography>
              </ProfileRow>
            )}
            {beneficiary.organization_name && (
              <ProfileRow label="Organization">
                <Typography variant="body2">{beneficiary.organization_name}</Typography>
              </ProfileRow>
            )}
            {beneficiary.phone && (
              <ProfileRow label="Phone">
                <Typography variant="body2">{beneficiary.phone}</Typography>
              </ProfileRow>
            )}
            {beneficiary.email && (
              <ProfileRow label="Email">
                <Typography variant="body2">{beneficiary.email}</Typography>
              </ProfileRow>
            )}
          </Box>
        )}
      </Box>

      {/* Transaction History */}
      <Box sx={{ ...frostedCardSx, overflow: 'hidden', mb: 3, '&:hover': { transform: 'none' } }}>
        <Box sx={{ px: 3, pt: 3, pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
            <Typography variant="h6">Transaction History</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <ToggleButtonGroup
              value={txTypeFilter}
              exclusive
              onChange={(e, val) => { if (val !== null) { setTxTypeFilter(val); setTxPage(0); } }}
              size="small"
              sx={{
                gap: 1,
                '& .MuiToggleButton-root': {
                  borderRadius: '10px',
                  px: 2,
                  py: 0.6,
                  border: '1px solid rgba(61, 74, 62, 0.15)',
                  color: '#5C6B5E',
                  fontSize: '13px',
                  fontWeight: 500,
                  textTransform: 'none',
                  '&.Mui-selected': {
                    backgroundColor: '#3D4A3E',
                    color: '#EFEBE4',
                    '&:hover': { backgroundColor: '#4A5A4C' }
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(61, 74, 62, 0.06)'
                  }
                }
              }}
            >
              <ToggleButton value="">All</ToggleButton>
              <ToggleButton value="earn">Earned</ToggleButton>
              <ToggleButton value="redeem">Redeemed</ToggleButton>
              <ToggleButton value="adjustment">Adjustments</ToggleButton>
              <ToggleButton value="beneficiary_transfer">Beneficiary</ToggleButton>
            </ToggleButtonGroup>
            <TextField
              type="date"
              size="small"
              label="From"
              value={txDateFrom}
              onChange={(e) => { setTxDateFrom(e.target.value); setTxPage(0); }}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 155 }}
            />
            <TextField
              type="date"
              size="small"
              label="To"
              value={txDateTo}
              onChange={(e) => { setTxDateTo(e.target.value); setTxPage(0); }}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 155 }}
            />
            {(txTypeFilter || txDateFrom || txDateTo) && (
              <Chip
                label="Clear Filters"
                size="small"
                onDelete={() => { setTxTypeFilter(''); setTxDateFrom(''); setTxDateTo(''); setTxPage(0); }}
                onClick={() => { setTxTypeFilter(''); setTxDateFrom(''); setTxDateTo(''); setTxPage(0); }}
                sx={{
                  backgroundColor: 'rgba(193, 89, 46, 0.1)',
                  color: '#C1592E',
                  fontWeight: 600,
                  fontSize: '12px',
                  '& .MuiChip-deleteIcon': { color: '#C1592E' }
                }}
              />
            )}
          </Box>
          {(txTypeFilter || txDateFrom || txDateTo) && (
            <Typography variant="caption" sx={{ color: '#5C6B5E', mt: 1.5, display: 'block' }}>
              Showing {filteredTx.length} result{filteredTx.length !== 1 ? 's' : ''}
              {txTypeFilter && <> of type <strong>{txTypeFilter}</strong></>}
              {txDateFrom && <> from <strong>{txDateFrom}</strong></>}
              {txDateTo && <> to <strong>{txDateTo}</strong></>}
            </Typography>
          )}
        </Box>
        {filteredTx.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#5C6B5E' }}>
              {txTypeFilter ? 'No transactions match this filter' : 'No transactions yet'}
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 28, px: 1 }} />
                    {[
                      { key: 'created_at', label: 'Date', align: 'left' },
                      { key: 'transaction_type', label: 'Type', align: 'left' },
                      { key: 'source', label: 'Source', align: 'left' },
                      { key: 'invoice_amount', label: 'Invoice', align: 'right' },
                      { key: 'points', label: 'Points', align: 'right' },
                      { key: 'tier_at_transaction', label: 'Tier', align: 'left' }
                    ].map(col => (
                      <TableCell key={col.key} align={col.align}>
                        <TableSortLabel
                          active={txSortKey === col.key}
                          direction={txSortKey === col.key ? txSortDir : 'desc'}
                          onClick={() => handleTxSort(col.key)}
                        >
                          {col.label}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedTx.map((tx, idx) => {
                    const pts = getTxPoints(tx);
                    const ptsDisplay = pts > 0 ? `+${formatPoints(pts)}` : formatPoints(pts);
                    const ptsColor = pts >= 0 ? '#5A8A7A' : '#C1592E';
                    const isExpanded = expandedId === tx.id;
                    const hasDescription = !!tx.description;

                    return (
                      <React.Fragment key={tx.id}>
                        <TableRow
                          onClick={() => hasDescription && setExpandedId(isExpanded ? null : tx.id)}
                          sx={{
                            cursor: hasDescription ? 'pointer' : 'default',
                            backgroundColor: isExpanded
                              ? 'rgba(61, 74, 62, 0.04)'
                              : idx % 2 === 0 ? 'transparent' : 'rgba(61, 74, 62, 0.02)',
                            '&:hover': { backgroundColor: 'rgba(61, 74, 62, 0.05)' },
                            transition: 'background-color 0.2s ease',
                            '& > td': { borderBottom: isExpanded ? 'none' : undefined }
                          }}
                        >
                          <TableCell sx={{ width: 28, px: 1, py: 1.5 }}>
                            {hasDescription && (
                              isExpanded
                                ? <KeyboardArrowUpIcon sx={{ fontSize: 20, color: '#9CA89E', verticalAlign: 'middle' }} />
                                : <KeyboardArrowDownIcon sx={{ fontSize: 20, color: '#9CA89E', verticalAlign: 'middle' }} />
                            )}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {formatShortDate(tx.created_at)}
                            </Typography>
                          </TableCell>
                          <TableCell>{getTypeChip(tx.transaction_type)}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: '#5C6B5E', textTransform: 'capitalize' }}>
                              {tx.source || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {tx.invoice_amount ? formatCurrency(tx.invoice_amount) : '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 700, color: ptsColor, fontFamily: '"Outfit", sans-serif' }}
                            >
                              {ptsDisplay}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <TierBadge tier={tx.tier_at_transaction} size="small" />
                          </TableCell>
                        </TableRow>

                        {hasDescription && (
                          <TableRow sx={{ backgroundColor: isExpanded ? 'rgba(61, 74, 62, 0.04)' : 'transparent' }}>
                            <TableCell colSpan={7} sx={{ py: 0, px: 0, borderBottom: isExpanded ? undefined : 'none' }}>
                              <Collapse in={isExpanded} timeout={200}>
                                <Box sx={{ px: 4, py: 1.5, pl: 6 }}>
                                  <Typography variant="body2" sx={{ color: '#5C6B5E' }}>
                                    {tx.description}
                                    {tx.invoice_id && (
                                      <Typography component="span" variant="body2" sx={{ color: '#9CA89E', ml: 1 }}>
                                        — Invoice {tx.invoice_id}
                                      </Typography>
                                    )}
                                    {tx.multiplier_applied && (
                                      <Typography component="span" variant="body2" sx={{ color: '#9CA89E', ml: 1 }}>
                                        • {tx.multiplier_applied}x multiplier
                                      </Typography>
                                    )}
                                  </Typography>
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filteredTx.length}
              page={txPage}
              rowsPerPage={txRowsPerPage}
              onPageChange={(e, newPage) => setTxPage(newPage)}
              rowsPerPageOptions={[10]}
            />
          </>
        )}
      </Box>

      {/* Point Adjustment Modal */}
      <PointAdjustmentModal
        open={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        clientId={id}
        onSuccess={() => {
          fetchData();
          setToast({ open: true, message: 'Points adjusted successfully', severity: 'success' });
        }}
      />

      {/* Edit Contact Modal */}
      <Dialog open={editContactOpen} onClose={() => setEditContactOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Contact Information</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" sx={{ mb: 2.5 }}>
              <strong>{client.name}</strong> — {client.email}
            </Typography>
            <TextField
              fullWidth
              label="Phone"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="(555) 123-4567"
              sx={{ mb: 2.5 }}
            />
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#3D4A3E', mb: 1.5 }}>Address</Typography>
            <TextField
              fullWidth
              label="Street Address"
              value={editStreet}
              onChange={(e) => setEditStreet(e.target.value)}
              placeholder="123 Oak Lane"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Apt / Suite / Unit"
              value={editApt}
              onChange={(e) => setEditApt(e.target.value)}
              placeholder="Apt 4B"
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="City"
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
                placeholder="Dallas"
                sx={{ flex: 2 }}
              />
              <TextField
                label="State"
                value={editState}
                onChange={(e) => setEditState(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="TX"
                inputProps={{ maxLength: 2 }}
                sx={{ flex: 0.7 }}
              />
              <TextField
                label="ZIP"
                value={editZip}
                onChange={(e) => setEditZip(e.target.value)}
                placeholder="75201"
                inputProps={{ maxLength: 10 }}
                sx={{ flex: 1 }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditContactOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveContact} disabled={editSaving}>
            {editSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unenroll / Cancel Account Dialog */}
      <Dialog open={unenrollDialogOpen} onClose={() => !unenrollLoading && setUnenrollDialogOpen(false)} maxWidth="md" fullWidth>
        {unenrollStep === 1 && (
          <DialogTitle sx={{ color: '#d32f2f' }}>Confirm Cancellation</DialogTitle>
        )}
        <DialogContent>
          {/* Step 0: Reason, checklist, details */}
          {unenrollStep === 0 && (() => {
            const isDeceased = unenrollReason === 'deceased';
            const hasBeneficiary = beneficiary && beneficiary.beneficiary_type !== 'none';
            const dollarValue = formatCurrency(pointsToDollars(client.redeemable_points));

            // Build dynamic checklist based on reason
            let checklistSteps;
            if (isDeceased && hasBeneficiary) {
              checklistSteps = [
                `Contact beneficiary (${beneficiary.name}) about balance transfer`,
                `Process remaining balance to beneficiary: ${formatPoints(client.redeemable_points)} pts (${dollarValue})`,
                'Confirm with family or emergency contact',
                'Update status in AxisCare'
              ];
            } else if (isDeceased) {
              checklistSteps = [
                'No beneficiary on file — continue with unenrollment',
                'Confirm with family or emergency contact',
                'Update status in AxisCare'
              ];
            } else {
              checklistSteps = [
                'Confirm unenrollment with client',
                `Verify client understands they retain ${formatPoints(client.redeemable_points)} pts (${dollarValue}) but will not earn new points`,
                'Inform client they can re-enroll if they return to a care package',
                'Update status in AxisCare'
              ];
            }

            return (
              <>
                {/* Closure type selector — two distinct flows */}
                <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#3D4A3E' }}>
                  What is the reason for closing this account?
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  {[
                    { value: 'deceased', label: 'Deceased', desc: 'Process beneficiary balance transfer and permanently close account' },
                    { value: 'cancelled_care_package', label: 'Cancelled Care Package', desc: 'Client keeps points but stops earning. Eligible for re-enrollment.' }
                  ].map((opt) => (
                    <Box
                      key={opt.value}
                      onClick={() => {
                        setUnenrollReason(opt.value);
                        const hasBen = beneficiary && beneficiary.beneficiary_type !== 'none';
                        const stepCount = (opt.value === 'deceased' && !hasBen) ? 3 : 4;
                        setUnenrollChecks(new Array(stepCount).fill(false));
                      }}
                      sx={{
                        flex: 1,
                        p: 2,
                        borderRadius: '12px',
                        border: unenrollReason === opt.value ? '2px solid #5A8A7A' : '2px solid rgba(61, 74, 62, 0.12)',
                        backgroundColor: unenrollReason === opt.value ? 'rgba(90, 138, 122, 0.06)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: '#5A8A7A', backgroundColor: 'rgba(90, 138, 122, 0.03)' }
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#3D4A3E', mb: 0.5 }}>
                        {opt.label}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#5C6B5E', lineHeight: 1.4, whiteSpace: 'nowrap' }}>
                        {opt.desc}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* Show details only after reason is selected */}
                {unenrollReason && (
                  <>
                    {/* Context banner */}
                    {isDeceased ? (
                      <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Deceased — Process remaining balance to beneficiary before account closure
                        </Typography>
                      </Alert>
                    ) : (
                      <Alert severity="info" sx={{ mb: 3, borderRadius: '12px' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Unenrollment — Points retained
                        </Typography>
                        <Typography variant="body2">
                          Client keeps their current points balance but will no longer earn new points. They can be re-enrolled if they return to a care package.
                        </Typography>
                      </Alert>
                    )}

                    {/* Points Balance Summary */}
                    <Box sx={{ mb: 3, p: 2.5, borderRadius: '12px', backgroundColor: 'rgba(61, 74, 62, 0.04)', border: '1px solid rgba(61, 74, 62, 0.08)' }}>
                      <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#3D4A3E' }}>Points Balance</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <Typography variant="caption" sx={{ color: '#5C6B5E', display: 'block' }}>Redeemable Points</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: '#5A8A7A' }}>
                            {formatPoints(client.redeemable_points)}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" sx={{ color: '#5C6B5E', display: 'block' }}>Dollar Value</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: '#D4956A' }}>
                            {dollarValue}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" sx={{ color: '#5C6B5E', display: 'block' }}>Lifetime Points</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: '#3D4A3E' }}>
                            {formatPoints(client.lifetime_points)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>

                    {/* Beneficiary info — shown for deceased */}
                    {isDeceased && hasBeneficiary && (
                      <Alert severity="info" sx={{ mb: 3, borderRadius: '12px' }}>
                        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Beneficiary on File</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {beneficiary.name}
                          {beneficiary.beneficiary_type === 'family_friend' && beneficiary.relationship
                            ? ` (${beneficiary.relationship})`
                            : beneficiary.organization_name
                              ? ` - ${beneficiary.organization_name}`
                              : ''}
                        </Typography>
                        <Typography variant="body2">
                          {[
                            beneficiary.phone ? `Phone: ${beneficiary.phone}` : null,
                            beneficiary.email ? `Email: ${beneficiary.email}` : null
                          ].filter(Boolean).join(' | ') || 'No contact info'}
                        </Typography>
                      </Alert>
                    )}

                    {/* Cancellation Checklist */}
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, color: '#3D4A3E' }}>
                        {isDeceased ? 'Beneficiary Processing Steps' : 'Unenrollment Steps'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#9CA89E', display: 'block', mb: 1.5 }}>
                        All steps must be checked before proceeding
                      </Typography>
                      {checklistSteps.map((step, i) => (
                        <FormControlLabel
                          key={i}
                          control={
                            <Checkbox
                              checked={unenrollChecks[i]}
                              onChange={(e) => {
                                const next = [...unenrollChecks];
                                next[i] = e.target.checked;
                                setUnenrollChecks(next);
                              }}
                              sx={{ color: '#9CA89E', '&.Mui-checked': { color: '#5A8A7A' } }}
                            />
                          }
                          label={<Typography variant="body2" sx={{ color: '#3D4A3E' }}>{step}</Typography>}
                          sx={{ display: 'flex', alignItems: 'center', mb: 0.5, ml: 0 }}
                        />
                      ))}
                    </Box>
                  </>
                )}
              </>
            );
          })()}

          {/* Step 1: Final confirmation */}
          {unenrollStep === 1 && (() => {
            const isDeceased = unenrollReason === 'deceased';
            const hasBeneficiary = beneficiary && beneficiary.beneficiary_type !== 'none';
            const dollarValue = formatCurrency(pointsToDollars(client.redeemable_points));
            return (
              <Box sx={{ py: 2 }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <WarningAmberIcon sx={{ fontSize: 48, color: '#d32f2f', mb: 2 }} />
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                    {isDeceased
                      ? 'Confirm account closure'
                      : 'Confirm unenrollment'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#5C6B5E', maxWidth: 440, mx: 'auto' }}>
                    {isDeceased ? (
                      <>This will permanently close <strong>{client.name}</strong>'s account.</>
                    ) : (
                      <>
                        <strong>{client.name}</strong> will be unenrolled from NoorVana Advantage. They will keep their <strong>{formatPoints(client.redeemable_points)} points</strong> ({dollarValue}) but will not earn new points.
                      </>
                    )}
                  </Typography>
                </Box>

                {/* Beneficiary transfer summary — only for deceased with points */}
                {isDeceased && client.redeemable_points > 0 && (
                  <Box sx={{ p: 2.5, borderRadius: '12px', backgroundColor: 'rgba(61, 74, 62, 0.04)', border: '1px solid rgba(61, 74, 62, 0.08)', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#3D4A3E' }}>
                      Beneficiary Point Transfer
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="caption" sx={{ color: '#5C6B5E', display: 'block' }}>Points to Transfer</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: '#C1592E' }}>
                          -{formatPoints(client.redeemable_points)}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" sx={{ color: '#5C6B5E', display: 'block' }}>Credit Value</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: '#D4956A' }}>
                          {dollarValue}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" sx={{ color: '#5C6B5E', display: 'block' }}>Transfer To</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: '#3D4A3E' }}>
                          {hasBeneficiary ? beneficiary.name : 'No beneficiary'}
                        </Typography>
                      </Grid>
                    </Grid>
                    <Typography variant="caption" sx={{ color: '#9CA89E', display: 'block', mt: 1.5 }}>
                      These points will be deducted from the client's account and a transfer record will be created.
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          {unenrollStep === 0 && (
            <>
              <Button onClick={() => setUnenrollDialogOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                color="error"
                onClick={() => setUnenrollStep(1)}
                disabled={!unenrollReason || unenrollChecks.length === 0 || !unenrollChecks.every(Boolean)}
              >
                Continue to Confirm
              </Button>
            </>
          )}
          {unenrollStep === 1 && (
            <>
              <Button onClick={() => setUnenrollStep(0)} disabled={unenrollLoading}>Go Back</Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleUnenroll}
                disabled={unenrollLoading}
                startIcon={unenrollLoading ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {unenrollLoading ? 'Processing...' : (unenrollReason === 'deceased' ? 'Close Account' : 'Unenroll Client')}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Re-enroll Confirmation Dialog */}
      <Dialog open={reenrollDialogOpen} onClose={() => !unenrollLoading && setReenrollDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 48, color: '#5A8A7A', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: '#3D4A3E' }}>
              Re-enroll {client.name}?
            </Typography>
            <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 3, maxWidth: 400, mx: 'auto' }}>
              This will reactivate their account in NoorVana Advantage. They will begin earning points again on future invoices.
            </Typography>
            <Box sx={{ p: 2, borderRadius: '12px', backgroundColor: 'rgba(61, 74, 62, 0.04)', border: '1px solid rgba(61, 74, 62, 0.08)', textAlign: 'left', maxWidth: 360, mx: 'auto' }}>
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#5C6B5E', display: 'block' }}>Current Tier</Typography>
                  <Box sx={{ mt: 0.5 }}><TierBadge tier={client.current_tier} size="small" /></Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#5C6B5E', display: 'block' }}>Lifetime Points</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: '#3D4A3E', mt: 0.5 }}>
                    {formatPoints(client.lifetime_points)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#5C6B5E', display: 'block' }}>Redeemable Points</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: '#5A8A7A', mt: 0.5 }}>
                    {formatPoints(client.redeemable_points)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#5C6B5E', display: 'block' }}>Credit Value</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: '#D4956A', mt: 0.5 }}>
                    {formatCurrency(pointsToDollars(client.redeemable_points))}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReenrollDialogOpen(false)} disabled={unenrollLoading}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              await handleReenroll();
              setReenrollDialogOpen(false);
            }}
            disabled={unenrollLoading}
            startIcon={unenrollLoading ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ backgroundColor: '#5A8A7A', '&:hover': { backgroundColor: '#4A7A6A' } }}
          >
            {unenrollLoading ? 'Processing...' : 'Confirm Re-enrollment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Double Confirmation Dialog */}
      <Dialog open={resetPwStep > 0} onClose={() => !resetPwLoading && setResetPwStep(0)} maxWidth="sm" fullWidth>
        <DialogContent>
          {resetPwStep === 1 && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <LockResetIcon sx={{ fontSize: 48, color: '#D4956A', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: '#3D4A3E' }}>
                Reset password for {client.name}?
              </Typography>
              <Typography variant="body2" sx={{ color: '#5C6B5E', maxWidth: 400, mx: 'auto' }}>
                This will clear their current password. The client will need to set up a new password the next time they access the portal.
              </Typography>
            </Box>
          )}
          {resetPwStep === 2 && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <WarningAmberIcon sx={{ fontSize: 48, color: '#d32f2f', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: '#d32f2f' }}>
                Are you sure?
              </Typography>
              <Typography variant="body2" sx={{ color: '#5C6B5E', maxWidth: 400, mx: 'auto' }}>
                <strong>{client.name}</strong> ({client.email}) will be logged out of the client portal and will need to register again with a new password.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetPwStep(0)} disabled={resetPwLoading}>Cancel</Button>
          {resetPwStep === 1 && (
            <Button variant="contained" color="warning" onClick={() => setResetPwStep(2)}>
              Continue
            </Button>
          )}
          {resetPwStep === 2 && (
            <Button
              variant="contained"
              color="error"
              onClick={handleResetPassword}
              disabled={resetPwLoading}
              startIcon={resetPwLoading ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {resetPwLoading ? 'Resetting...' : 'Confirm Reset Password'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Toast {...toast} onClose={() => setToast({ ...toast, open: false })} />
    </Box>
  );
};

const ProfileRow = ({ label, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
    <Typography
      variant="body2"
      sx={{ color: '#5C6B5E', minWidth: 110, flexShrink: 0, pt: 0.25 }}
    >
      {label}
    </Typography>
    <Box>{children}</Box>
  </Box>
);

export default ClientDetailPage;
