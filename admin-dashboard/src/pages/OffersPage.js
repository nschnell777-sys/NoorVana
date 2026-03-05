import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Button, Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Grid,
  Card, CardContent, CircularProgress, Radio, RadioGroup, FormControlLabel, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CasinoIcon from '@mui/icons-material/Casino';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import StarIcon from '@mui/icons-material/Star';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import {
  getOffers, createOffer, updateOffer, deleteOffer, getOfferClaims,
  getAllOfferClaims, updateOfferClaim, drawOfferWinners, manualPickWinner,
  getRewardsCatalog
} from '../services/api';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TierBadge from '../components/TierBadge';
import Toast from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { POINTS_PER_DOLLAR } from '../utils/formatters';

const TYPE_COLORS = {
  deal: { bg: 'rgba(212, 149, 106, 0.12)', color: '#B87A4F', label: 'Deal' },
  experience: { bg: 'rgba(90, 138, 122, 0.12)', color: '#5A8A7A', label: 'Experience' },
  giveaway: { bg: 'rgba(61, 74, 62, 0.12)', color: '#3D4A3E', label: 'Giveaway' }
};

const STATUS_COLORS = {
  draft: 'default',
  active: 'success',
  expired: 'warning',
  cancelled: 'error'
};

const CLAIM_STATUS_COLORS = {
  entered: 'info',
  won: 'success',
  lost: 'default',
  confirmed: 'success',
  declined: 'error',
  claimed: 'info',
  fulfilled: 'success'
};

const TIERS = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

const INITIAL_FORM = {
  type: 'deal', title: '', description: '', preview_text: '', min_tier: 'gold',
  start_date: '', end_date: '', status: 'draft',
  reward_id: '', deal_discount_percentage: '',
  claim_type: 'first_come', spots_available: '', prize_details: '',
  event_date: '',
  sweepstakes_entries_allowed: 1, sweepstakes_winners_count: 1,
  sweepstakes_draw_date: ''
};

const DEAL_FIELDS = { reward_id: '', deal_discount_percentage: '' };
const EXPERIENCE_FIELDS = { claim_type: 'rsvp', spots_available: '', prize_details: '', event_date: '' };
const GIVEAWAY_FIELDS = { sweepstakes_entries_allowed: 1, sweepstakes_winners_count: 1, sweepstakes_draw_date: '', prize_details: '' };

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '-';

const OffersPage = () => {
  const [tab, setTab] = useState(0);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Create/Edit form
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({ ...INITIAL_FORM });
  const [formLoading, setFormLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [stepErrors, setStepErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Claims viewer
  const [claimsDialogOpen, setClaimsDialogOpen] = useState(false);
  const [claimsOffer, setClaimsOffer] = useState(null);
  const [claims, setClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [allClaims, setAllClaims] = useState([]);
  const [allClaimsLoading, setAllClaimsLoading] = useState(false);

  // Draw dialog
  const [drawDialogOpen, setDrawDialogOpen] = useState(false);
  const [drawOffer, setDrawOffer] = useState(null);
  const [drawLoading, setDrawLoading] = useState(false);
  const [drawResult, setDrawResult] = useState(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Rewards catalog for deal creation
  const [rewardsCatalog, setRewardsCatalog] = useState([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getOffers({ limit: 200 });
      setOffers(data.offers || []);
    } catch (err) {
      console.error('Failed to load offers', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllClaims = useCallback(async () => {
    setAllClaimsLoading(true);
    try {
      const { data } = await getAllOfferClaims({ limit: 200 });
      setAllClaims(data.claims || []);
    } catch (err) {
      console.error('Failed to load claims', err);
    } finally {
      setAllClaimsLoading(false);
    }
  }, []);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);
  useEffect(() => { if (tab === 2) fetchAllClaims(); }, [tab, fetchAllClaims]);

  const activeOffers = offers.filter(o => o.status === 'active' || o.status === 'draft');
  const completedOffers = offers.filter(o => o.status === 'expired' || o.status === 'cancelled');

  // --- Form helpers ---
  const closeForm = () => {
    setFormOpen(false);
    setFormData({ ...INITIAL_FORM });
    setEditingId(null);
    setStepErrors({});
    setImageFile(null);
    setImagePreview(null);
  };

  const fetchRewardsCatalog = async () => {
    if (rewardsCatalog.length > 0) return;
    setRewardsLoading(true);
    try {
      const { data } = await getRewardsCatalog({ category: 'gift_card' });
      // Also fetch product credits
      const { data: pcData } = await getRewardsCatalog({ category: 'product_credit' });
      const allRewards = [...(data.rewards || []), ...(pcData.rewards || [])];
      setRewardsCatalog(allRewards);
    } catch (err) {
      console.error('Failed to load rewards catalog', err);
    } finally {
      setRewardsLoading(false);
    }
  };

  const openCreateForm = async () => {
    setEditingId(null);
    setFormData({ ...INITIAL_FORM });
    setStepErrors({});
    setImageFile(null);
    setImagePreview(null);
    setFormOpen(true);
    fetchRewardsCatalog();
  };

  const openEditForm = async (offer) => {
    setEditingId(offer.id);
    setFormData({
      type: offer.type || 'deal',
      title: offer.title || '',
      description: offer.description || '',
      preview_text: offer.preview_text || '',
      min_tier: offer.min_tier || 'silver',
      start_date: offer.start_date || '',
      end_date: offer.end_date || '',
      status: offer.status || 'draft',
      reward_id: offer.reward_id || '',
      deal_discount_percentage: offer.deal_discount_percentage || '',
      claim_type: offer.claim_type || 'first_come',
      spots_available: offer.spots_available || '',
      prize_details: offer.prize_details || '',
      event_date: offer.event_date || '',
      sweepstakes_entries_allowed: offer.sweepstakes_entries_allowed || 1,
      sweepstakes_winners_count: offer.sweepstakes_winners_count || 1,
      sweepstakes_draw_date: offer.sweepstakes_draw_date || ''
    });
    setStepErrors({});
    setImageFile(null);
    setImagePreview(offer.image_url || null);
    setFormOpen(true);
    if (offer.type === 'deal') fetchRewardsCatalog();
  };

  const handleFormChange = (field, value) => {
    setStepErrors({});
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      // When type changes, clear other type's fields and set default tier
      if (field === 'type') {
        if (value === 'deal') {
          Object.assign(next, EXPERIENCE_FIELDS, GIVEAWAY_FIELDS, { prize_details: '' });
          next.min_tier = 'gold';
          fetchRewardsCatalog();
        } else if (value === 'experience') {
          Object.assign(next, DEAL_FIELDS, GIVEAWAY_FIELDS);
          next.min_tier = 'platinum';
        } else if (value === 'giveaway') {
          Object.assign(next, DEAL_FIELDS, EXPERIENCE_FIELDS);
          next.min_tier = 'silver';
        }
      }
      return next;
    });
  };

  const isDealForm = formData.type === 'deal';
  const isExperienceForm = formData.type === 'experience';
  const isGiveawayForm = formData.type === 'giveaway';


  // Validate the single-screen deal form
  const validateDealForm = () => {
    const errors = {};
    if (!formData.reward_id) errors.reward_id = 'Please select a gift card or product credit';
    const pct = Number(formData.deal_discount_percentage);
    if (!formData.deal_discount_percentage && formData.deal_discount_percentage !== 0) {
      errors.deal_discount_percentage = 'Discount percentage is required';
    } else if (pct < 1 || pct > 99) {
      errors.deal_discount_percentage = 'Must be between 1% and 99%';
    }
    if (!formData.start_date) errors.start_date = 'Start date is required';
    if (!formData.end_date) errors.end_date = 'End date is required';
    if (formData.start_date && formData.end_date && new Date(formData.end_date) < new Date(formData.start_date)) {
      errors.end_date = 'End date must be after start date';
    }
    return errors;
  };

  // Validate the single-screen experience form
  const validateExperienceForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.start_date) errors.start_date = 'Start date is required';
    if (!formData.end_date) errors.end_date = 'End date is required';
    if (formData.start_date && formData.end_date && new Date(formData.end_date) < new Date(formData.start_date)) {
      errors.end_date = 'End date must be after start date';
    }
    if (!formData.spots_available || Number(formData.spots_available) < 1) errors.spots_available = 'At least 1 spot required';
    return errors;
  };

  // Validate the single-screen giveaway form
  const validateGiveawayForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.start_date) errors.start_date = 'Start date is required';
    if (!formData.end_date) errors.end_date = 'End date is required';
    if (formData.start_date && formData.end_date && new Date(formData.end_date) < new Date(formData.start_date)) {
      errors.end_date = 'End date must be after start date';
    }
    if (!formData.sweepstakes_winners_count || Number(formData.sweepstakes_winners_count) < 1) errors.sweepstakes_winners_count = 'At least 1 winner required';
    if (!formData.sweepstakes_entries_allowed || Number(formData.sweepstakes_entries_allowed) < 1) errors.sweepstakes_entries_allowed = 'At least 1 entry required';
    return errors;
  };

  // Auto-generate title & description for deals
  const getDealAutoTitle = (rewardId, pct) => {
    const reward = rewardsCatalog.find(r => r.id === rewardId);
    if (!reward) return '';
    return pct ? `${pct}% Off ${reward.name}` : reward.name;
  };

  const getDealAutoDescription = (rewardId, pct) => {
    const reward = rewardsCatalog.find(r => r.id === rewardId);
    if (!reward || !pct) return '';
    return `Save ${pct}% on points when you redeem for a ${reward.name}.`;
  };

  // --- Build clean payload and save ---
  const handleSave = async (activateNow = false) => {
    // Validate based on type
    if (isDealForm) {
      const errors = validateDealForm();
      if (Object.keys(errors).length > 0) { setStepErrors(errors); return; }
    } else if (isExperienceForm) {
      const errors = validateExperienceForm();
      if (Object.keys(errors).length > 0) { setStepErrors(errors); return; }
    } else if (isGiveawayForm) {
      const errors = validateGiveawayForm();
      if (Object.keys(errors).length > 0) { setStepErrors(errors); return; }
    }

    setFormLoading(true);
    try {
      const fd = new FormData();

      // For deals, auto-generate title & description if not manually set
      const effectiveTitle = isDealForm
        ? (formData.title || getDealAutoTitle(formData.reward_id, formData.deal_discount_percentage))
        : formData.title;
      const effectiveDescription = isDealForm
        ? (formData.description || getDealAutoDescription(formData.reward_id, formData.deal_discount_percentage))
        : formData.description;

      // Base fields
      fd.append('type', formData.type);
      fd.append('title', effectiveTitle);
      if (effectiveDescription) fd.append('description', effectiveDescription);
      fd.append('min_tier', formData.min_tier);
      fd.append('start_date', formData.start_date);
      fd.append('end_date', formData.end_date);
      fd.append('status', activateNow ? 'active' : (formData.status || 'draft'));

      // Type-specific fields
      if (formData.type === 'deal') {
        if (formData.reward_id) fd.append('reward_id', formData.reward_id);
        if (formData.deal_discount_percentage) fd.append('deal_discount_percentage', formData.deal_discount_percentage);
        // No global deal_quantity_limit — per-client limit (max 1) is enforced by backend duplicate check
      } else if (formData.type === 'experience') {
        fd.append('claim_type', 'rsvp');
        if (formData.spots_available) fd.append('spots_available', formData.spots_available);
        if (formData.preview_text) fd.append('preview_text', formData.preview_text);
        if (formData.event_date) fd.append('event_date', formData.event_date);
      } else if (formData.type === 'giveaway') {
        fd.append('sweepstakes_entries_allowed', formData.sweepstakes_entries_allowed || 1);
        fd.append('sweepstakes_winners_count', formData.sweepstakes_winners_count || 1);
        if (formData.sweepstakes_draw_date) fd.append('sweepstakes_draw_date', formData.sweepstakes_draw_date);
        if (formData.prize_details) fd.append('prize_details', formData.prize_details);
      }

      // Image: prefer uploaded file, then selected reward's logo
      if (imageFile) {
        fd.append('image', imageFile);
      } else if (formData.type === 'deal' && formData.reward_id && !imagePreview) {
        const selectedReward = rewardsCatalog.find(r => r.id === formData.reward_id);
        if (selectedReward?.logo_url) {
          fd.append('image_url', selectedReward.logo_url);
        }
      }

      if (editingId) {
        await updateOffer(editingId, fd);
        setToast({ open: true, message: 'Offer updated', severity: 'success' });
      } else {
        await createOffer(fd);
        setToast({ open: true, message: activateNow ? 'Offer created & activated' : 'Offer saved as draft', severity: 'success' });
      }
      closeForm();
      fetchOffers();
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.error?.message || 'Failed to save offer', severity: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  // --- Image handling ---
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Actions ---
  const handleActivate = async (offer) => {
    try {
      await updateOffer(offer.id, { status: 'active' });
      setToast({ open: true, message: 'Offer activated', severity: 'success' });
      fetchOffers();
    } catch (err) {
      setToast({ open: true, message: 'Failed to activate', severity: 'error' });
    }
  };

  const handleDeactivate = async (offer) => {
    try {
      await updateOffer(offer.id, { status: 'cancelled' });
      setToast({ open: true, message: 'Offer cancelled', severity: 'success' });
      fetchOffers();
    } catch (err) {
      setToast({ open: true, message: 'Failed to cancel', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteOffer(deleteTarget.id);
      setToast({ open: true, message: 'Offer deleted', severity: 'success' });
      setDeleteTarget(null);
      fetchOffers();
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.error?.message || 'Cannot delete', severity: 'error' });
      setDeleteTarget(null);
    }
  };

  // --- Claims viewer ---
  const openClaimsViewer = async (offer) => {
    setClaimsOffer(offer);
    setClaimsDialogOpen(true);
    setClaimsLoading(true);
    try {
      const { data } = await getOfferClaims(offer.id, { limit: 200 });
      setClaims(data.claims || []);
    } catch (err) {
      console.error('Failed to load claims', err);
    } finally {
      setClaimsLoading(false);
    }
  };

  const handleUpdateClaimStatus = async (claimId, status) => {
    try {
      await updateOfferClaim(claimId, { status });
      setToast({ open: true, message: `Claim updated to ${status}`, severity: 'success' });
      if (claimsOffer) {
        const { data } = await getOfferClaims(claimsOffer.id, { limit: 200 });
        setClaims(data.claims || []);
      }
      if (tab === 2) fetchAllClaims();
    } catch (err) {
      setToast({ open: true, message: 'Failed to update', severity: 'error' });
    }
  };

  // --- Draw ---
  const openDrawDialog = (offer) => {
    setDrawOffer(offer);
    setDrawResult(null);
    setDrawDialogOpen(true);
  };

  const handleDraw = async () => {
    setDrawLoading(true);
    try {
      const { data } = await drawOfferWinners(drawOffer.id);
      setDrawResult(data);
      setToast({ open: true, message: `${data.winners_count} winner(s) drawn!`, severity: 'success' });
      fetchOffers();
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.error?.message || 'Draw failed', severity: 'error' });
    } finally {
      setDrawLoading(false);
    }
  };

  const handleConfirmWinner = async (claimId) => {
    await handleUpdateClaimStatus(claimId, 'confirmed');
    if (drawResult) {
      setDrawResult(prev => ({
        ...prev,
        winners: prev.winners.map(w => w.claim_id === claimId ? { ...w, status: 'confirmed' } : w)
      }));
    }
  };

  const handleManualPick = async (offer, clientId) => {
    try {
      await manualPickWinner(offer.id, clientId);
      setToast({ open: true, message: 'Winner manually selected', severity: 'success' });
      if (claimsOffer) {
        const { data } = await getOfferClaims(claimsOffer.id, { limit: 200 });
        setClaims(data.claims || []);
      }
      fetchOffers();
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.error?.message || 'Manual pick failed', severity: 'error' });
    }
  };

  // --- Helpers ---
  const getClaimsSummary = (offer) => {
    if (offer.type === 'deal') {
      return `${offer.deal_quantity_claimed || 0}${offer.deal_quantity_limit ? ' / ' + offer.deal_quantity_limit : ''}`;
    } else if (offer.type === 'experience') {
      return `${offer.spots_claimed || 0}${offer.spots_available ? ' / ' + offer.spots_available : ''}`;
    }
    return `${offer.deal_quantity_claimed || offer.spots_claimed || 0} entries`;
  };

  const getTypeBadge = (type) => {
    const t = TYPE_COLORS[type] || TYPE_COLORS.deal;
    return <Chip label={t.label} size="small" sx={{ backgroundColor: t.bg, color: t.color, fontWeight: 600, fontSize: '11px' }} />;
  };

  const getDiscountPreview = (pct) => {
    if (!pct || pct <= 0 || pct >= 100) return [];
    // POINTS_PER_DOLLAR imported from formatters
    return [50, 100, 250, 500].map(dollars => {
      const full = dollars * POINTS_PER_DOLLAR;
      const discounted = Math.floor(full * (1 - pct / 100) / 1000) * 1000;
      return { dollars, full, discounted };
    });
  };

  const getImageSrc = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${process.env.REACT_APP_API_URL || 'http://localhost:3000'}${url}`;
  };

  // --- Render offers table ---
  const renderOffersTable = (offersList) => (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Title</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Min Tier</TableCell>
            <TableCell>Start</TableCell>
            <TableCell>End</TableCell>
            <TableCell>Claims</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {offersList.length === 0 ? (
            <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>No offers found</TableCell></TableRow>
          ) : (
            offersList.map((offer) => (
              <TableRow key={offer.id} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{offer.title}</Typography>
                </TableCell>
                <TableCell>{getTypeBadge(offer.type)}</TableCell>
                <TableCell><TierBadge tier={offer.min_tier} size="small" /></TableCell>
                <TableCell><Typography variant="caption">{formatDate(offer.start_date)}</Typography></TableCell>
                <TableCell><Typography variant="caption">{formatDate(offer.end_date)}</Typography></TableCell>
                <TableCell><Typography variant="body2">{getClaimsSummary(offer)}</Typography></TableCell>
                <TableCell><Chip label={offer.status} size="small" color={STATUS_COLORS[offer.status] || 'default'} /></TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                    <Tooltip title="Edit"><IconButton size="small" onClick={() => openEditForm(offer)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="View Claims"><IconButton size="small" onClick={() => openClaimsViewer(offer)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                    {offer.status === 'draft' && (
                      <>
                        <Button size="small" variant="contained" color="success" onClick={() => handleActivate(offer)} sx={{ minWidth: 0, px: 1 }}>Activate</Button>
                        <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteTarget(offer)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </>
                    )}
                    {offer.status === 'active' && (
                      <Button size="small" variant="outlined" color="error" onClick={() => handleDeactivate(offer)} sx={{ minWidth: 0, px: 1 }}>Cancel</Button>
                    )}
                    {offer.type === 'giveaway' && offer.status === 'active' && !offer.sweepstakes_drawn && (
                      <Button size="small" variant="contained" startIcon={<CasinoIcon />}
                        onClick={() => openDrawDialog(offer)}
                        sx={{ minWidth: 0, px: 1.5, backgroundColor: '#D4956A', '&:hover': { backgroundColor: '#c08050' } }}>
                        Draw
                      </Button>
                    )}
                    {offer.type === 'giveaway' && offer.sweepstakes_drawn && (
                      <Chip icon={<EmojiEventsIcon />} label="Drawn" size="small" color="success" variant="outlined" />
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">Offers & Promotions</Typography>
          <Typography variant="body2" color="text.secondary">Manage deals, experiences, and sweepstakes</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>Create Offer</Button>
      </Box>

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab label={`Active & Upcoming (${activeOffers.length})`} />
          <Tab label={`Completed (${completedOffers.length})`} />
          <Tab label="Offer Claims" />
        </Tabs>

        <CardContent sx={{ p: 0 }}>
          {loading ? <LoadingSpinner /> : (
            <>
              {tab === 0 && renderOffersTable(activeOffers)}
              {tab === 1 && renderOffersTable(completedOffers)}
              {tab === 2 && (() => {
                const filteredClaims = allClaims.filter(c => c.claim_type !== 'deal_redemption');
                return (
                <>
                <Box sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'flex', alignItems: 'center', gap: 1, color: '#5C6B5E' }}>
                  <Typography variant="caption">Deal redemptions are processed on the Redemptions page.</Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Client</TableCell>
                        <TableCell>Tier</TableCell>
                        <TableCell>Offer</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Claim Type</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {allClaimsLoading ? (
                        <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
                      ) : filteredClaims.length === 0 ? (
                        <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>No claims found</TableCell></TableRow>
                      ) : (
                        filteredClaims.map((c) => (
                          <TableRow key={c.id} hover>
                            <TableCell><Typography variant="caption">{formatDateTime(c.created_at)}</Typography></TableCell>
                            <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{c.client_name}</Typography></TableCell>
                            <TableCell><TierBadge tier={c.client_tier} size="small" /></TableCell>
                            <TableCell><Typography variant="body2">{c.offer_title}</Typography></TableCell>
                            <TableCell>{getTypeBadge(c.offer_type)}</TableCell>
                            <TableCell><Typography variant="caption">{c.claim_type}</Typography></TableCell>
                            <TableCell><Chip label={c.status} size="small" color={CLAIM_STATUS_COLORS[c.status] || 'default'} /></TableCell>
                            <TableCell align="right">
                              <FormControl size="small" sx={{ minWidth: 100 }}>
                                <Select value={c.status} onChange={(e) => handleUpdateClaimStatus(c.id, e.target.value)} size="small">
                                  {['entered', 'won', 'lost', 'confirmed', 'declined', 'claimed', 'fulfilled'].map(s => (
                                    <MenuItem key={s} value={s}>{s}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                </>
                );
              })()}
            </>
          )}
        </CardContent>
      </Card>

      {/* ===== CREATE/EDIT OFFER DIALOG ===== */}
      <Dialog open={formOpen} onClose={closeForm} maxWidth="md" fullWidth>
        <DialogTitle>{editingId ? 'Edit Offer' : 'Create New Offer'}</DialogTitle>
        <DialogContent>
          {/* Type selector — always visible */}
          <Box sx={{ mb: 2.5, mt: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Offer Type</Typography>
            <RadioGroup row value={formData.type || 'deal'} onChange={(e) => handleFormChange('type', e.target.value)}>
              {[
                { value: 'deal', label: 'Deal', icon: <LocalOfferIcon />, desc: 'Discounted gift cards or service credits' },
                { value: 'experience', label: 'Experience', icon: <StarIcon />, desc: 'Exclusive events, dinners, priority access' },
                { value: 'giveaway', label: 'Giveaway', icon: <ConfirmationNumberIcon />, desc: 'Sweepstakes / random drawings' }
              ].map(opt => (
                <FormControlLabel key={opt.value} value={opt.value} control={<Radio />}
                  label={
                    <Box sx={{ ml: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>{opt.icon}<Typography variant="body2" fontWeight={600}>{opt.label}</Typography></Box>
                      <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                    </Box>
                  }
                  sx={{ mr: 3, border: formData.type === opt.value ? '2px solid' : '1px solid', borderColor: formData.type === opt.value ? 'primary.main' : 'divider', borderRadius: 2, p: 1.5, m: 0.5, flex: 1 }}
                />
              ))}
            </RadioGroup>
          </Box>

          {/* ===== DEAL: SINGLE-SCREEN FORM ===== */}
          {isDealForm && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Card Picker */}
              <Typography variant="subtitle2">Select Card</Typography>
              {stepErrors.reward_id && (
                <Typography variant="caption" color="error" sx={{ mt: -1.5 }}>{stepErrors.reward_id}</Typography>
              )}
              {rewardsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, maxHeight: 220, overflowY: 'auto', py: 1 }}>
                  {rewardsCatalog.map((reward) => {
                    const isSelected = formData.reward_id === reward.id;
                    const logoSrc = reward.logo_url?.startsWith('http')
                      ? reward.logo_url
                      : reward.logo_url ? `${process.env.REACT_APP_API_URL || 'http://localhost:3000'}${reward.logo_url}` : null;
                    return (
                      <Box
                        key={reward.id}
                        onClick={() => handleFormChange('reward_id', reward.id)}
                        sx={{
                          flex: '0 0 calc(33.33% - 8px)',
                          border: '2px solid',
                          borderColor: isSelected ? '#5A8A7A' : 'rgba(61, 74, 62, 0.12)',
                          borderRadius: '12px',
                          p: 1.5,
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'rgba(90, 138, 122, 0.06)' : 'transparent',
                          transition: 'all 0.2s ease',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          '&:hover': { borderColor: '#5A8A7A', backgroundColor: 'rgba(90, 138, 122, 0.03)' }
                        }}
                      >
                        {isSelected && (
                          <CheckCircleIcon sx={{ position: 'absolute', top: -8, right: -8, fontSize: 20, color: '#5A8A7A', backgroundColor: '#fff', borderRadius: '50%' }} />
                        )}
                        {logoSrc ? (
                          <Box
                            component="img"
                            src={logoSrc}
                            alt={reward.brand}
                            sx={{ width: 36, height: 36, borderRadius: '8px', objectFit: 'contain', flexShrink: 0 }}
                          />
                        ) : (
                          <Box sx={{ width: 36, height: 36, borderRadius: '8px', backgroundColor: 'rgba(61,74,62,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <LocalOfferIcon sx={{ fontSize: 18, color: '#5C6B5E' }} />
                          </Box>
                        )}
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '12px', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {reward.brand}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#5C6B5E', fontSize: '10px' }}>
                            {reward.subcategory || reward.category}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {/* Background Image */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Background Image</Typography>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  style={{ display: 'none' }}
                />
                {imagePreview ? (
                  <Box sx={{ position: 'relative', display: 'inline-block' }}>
                    <Box
                      component="img"
                      src={imageFile ? imagePreview : getImageSrc(imagePreview)}
                      alt="Preview"
                      sx={{ width: 200, height: 120, objectFit: 'cover', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
                    />
                    <IconButton
                      size="small"
                      onClick={handleRemoveImage}
                      sx={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', border: '1px solid', borderColor: 'divider', '&:hover': { backgroundColor: '#f5f5f5' } }}
                    >
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ borderStyle: 'dashed', px: 4, py: 2, color: '#5C6B5E', borderColor: 'rgba(61, 74, 62, 0.3)' }}
                  >
                    Upload Image
                  </Button>
                )}
              </Box>

              {/* Date, Tier, Discount in a compact row */}
              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <TextField
                    label="Start Date"
                    type="date"
                    fullWidth
                    required
                    value={formData.start_date ? formData.start_date.slice(0, 10) : ''}
                    onChange={(e) => handleFormChange('start_date', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    error={!!stepErrors.start_date}
                    helperText={stepErrors.start_date}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    label="End Date"
                    type="date"
                    fullWidth
                    required
                    value={formData.end_date ? formData.end_date.slice(0, 10) : ''}
                    onChange={(e) => handleFormChange('end_date', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    error={!!stepErrors.end_date}
                    helperText={stepErrors.end_date}
                  />
                </Grid>
                <Grid item xs={3}>
                  <FormControl fullWidth>
                    <InputLabel>Min Tier</InputLabel>
                    <Select value={formData.min_tier || 'gold'} label="Min Tier" onChange={(e) => handleFormChange('min_tier', e.target.value)}>
                      {TIERS.map(t => <MenuItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    label="Discount %"
                    type="number"
                    fullWidth
                    required
                    value={formData.deal_discount_percentage || ''}
                    onChange={(e) => handleFormChange('deal_discount_percentage', parseInt(e.target.value) || '')}
                    error={!!stepErrors.deal_discount_percentage}
                    helperText={stepErrors.deal_discount_percentage}
                    InputProps={{ endAdornment: <Typography sx={{ color: '#9CA89E' }}>%</Typography> }}
                    inputProps={{ min: 1, max: 99 }}
                  />
                </Grid>
              </Grid>

              {/* Discount Preview */}
              {formData.deal_discount_percentage > 0 && formData.deal_discount_percentage < 100 && (
                <Box sx={{ backgroundColor: 'rgba(61, 74, 62, 0.04)', borderRadius: 2, p: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#3D4A3E', mb: 1, display: 'block' }}>
                    Points Preview: {formData.deal_discount_percentage}% off — Max 1 per client, $50–$500
                  </Typography>
                  <Grid container spacing={1}>
                    {getDiscountPreview(Number(formData.deal_discount_percentage)).map(({ dollars, full, discounted }) => (
                      <Grid item xs={3} key={dollars}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#2D2D2D' }}>${dollars}</Typography>
                          <Typography variant="caption" sx={{ textDecoration: 'line-through', color: '#9CA89E' }}>
                            {full.toLocaleString()} pts
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#5A8A7A' }}>
                            {discounted.toLocaleString()} pts
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* Auto-generated title/description preview */}
              {formData.reward_id && formData.deal_discount_percentage > 0 && (
                <Box sx={{ backgroundColor: 'rgba(90, 138, 122, 0.06)', borderRadius: 2, p: 2, border: '1px solid rgba(90, 138, 122, 0.15)' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#5A8A7A', mb: 0.5, display: 'block' }}>
                    Auto-Generated
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#2D2D2D' }}>
                    {getDealAutoTitle(formData.reward_id, formData.deal_discount_percentage)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#5C6B5E' }}>
                    {getDealAutoDescription(formData.reward_id, formData.deal_discount_percentage)}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* ===== EXPERIENCE: SINGLE-PAGE FORM ===== */}
          {isExperienceForm && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                label="Title"
                fullWidth
                required
                value={formData.title || ''}
                onChange={(e) => handleFormChange('title', e.target.value)}
                error={!!stepErrors.title}
                helperText={stepErrors.title}
              />

              <TextField
                label="Preview Text"
                fullWidth
                value={formData.preview_text || ''}
                onChange={(e) => handleFormChange('preview_text', e.target.value)}
                helperText="Short text shown on the offer card (1-2 lines)"
                inputProps={{ maxLength: 100 }}
              />

              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <TextField
                    label="Start Date"
                    type="date"
                    fullWidth
                    required
                    value={formData.start_date ? formData.start_date.slice(0, 10) : ''}
                    onChange={(e) => handleFormChange('start_date', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    error={!!stepErrors.start_date}
                    helperText={stepErrors.start_date}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    label="End Date"
                    type="date"
                    fullWidth
                    required
                    value={formData.end_date ? formData.end_date.slice(0, 10) : ''}
                    onChange={(e) => handleFormChange('end_date', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    error={!!stepErrors.end_date}
                    helperText={stepErrors.end_date}
                  />
                </Grid>
                <Grid item xs={4}>
                  <FormControl fullWidth>
                    <InputLabel>Min Tier</InputLabel>
                    <Select value={formData.min_tier || 'platinum'} label="Min Tier" onChange={(e) => handleFormChange('min_tier', e.target.value)}>
                      {TIERS.map(t => <MenuItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Image Upload */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Offer Image</Typography>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  style={{ display: 'none' }}
                />
                {imagePreview ? (
                  <Box sx={{ position: 'relative', display: 'inline-block' }}>
                    <Box
                      component="img"
                      src={imageFile ? imagePreview : getImageSrc(imagePreview)}
                      alt="Preview"
                      sx={{ width: 200, height: 120, objectFit: 'cover', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
                    />
                    <IconButton
                      size="small"
                      onClick={handleRemoveImage}
                      sx={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', border: '1px solid', borderColor: 'divider', '&:hover': { backgroundColor: '#f5f5f5' } }}
                    >
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ borderStyle: 'dashed', px: 4, py: 2, color: '#5C6B5E', borderColor: 'rgba(61, 74, 62, 0.3)' }}
                  >
                    Upload Image
                  </Button>
                )}
              </Box>


              <TextField
                label="Spots Available"
                type="number"
                fullWidth
                required
                value={formData.spots_available || ''}
                onChange={(e) => handleFormChange('spots_available', parseInt(e.target.value) || '')}
                error={!!stepErrors.spots_available}
                helperText={stepErrors.spots_available}
              />

              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={formData.description || ''}
                onChange={(e) => handleFormChange('description', e.target.value)}
              />

              <TextField
                label="Date of Event / Experience"
                type="date"
                fullWidth
                value={formData.event_date ? formData.event_date.slice(0, 10) : ''}
                onChange={(e) => handleFormChange('event_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          )}

          {/* ===== GIVEAWAY: SINGLE-PAGE FORM ===== */}
          {isGiveawayForm && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                label="Title"
                fullWidth
                required
                value={formData.title || ''}
                onChange={(e) => handleFormChange('title', e.target.value)}
                error={!!stepErrors.title}
                helperText={stepErrors.title}
              />

              <TextField label="Description" fullWidth multiline rows={3} value={formData.description || ''} onChange={(e) => handleFormChange('description', e.target.value)} />

              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <TextField
                    label="Start Date"
                    type="date"
                    fullWidth
                    required
                    value={formData.start_date ? formData.start_date.slice(0, 10) : ''}
                    onChange={(e) => handleFormChange('start_date', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    error={!!stepErrors.start_date}
                    helperText={stepErrors.start_date}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    label="End Date"
                    type="date"
                    fullWidth
                    required
                    value={formData.end_date ? formData.end_date.slice(0, 10) : ''}
                    onChange={(e) => handleFormChange('end_date', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    error={!!stepErrors.end_date}
                    helperText={stepErrors.end_date}
                  />
                </Grid>
                <Grid item xs={4}>
                  <FormControl fullWidth>
                    <InputLabel>Min Tier</InputLabel>
                    <Select value={formData.min_tier || 'silver'} label="Min Tier" onChange={(e) => handleFormChange('min_tier', e.target.value)}>
                      {TIERS.map(t => <MenuItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Image Upload */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Offer Image</Typography>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  style={{ display: 'none' }}
                />
                {imagePreview ? (
                  <Box sx={{ position: 'relative', display: 'inline-block' }}>
                    <Box
                      component="img"
                      src={imageFile ? imagePreview : getImageSrc(imagePreview)}
                      alt="Preview"
                      sx={{ width: 200, height: 120, objectFit: 'cover', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
                    />
                    <IconButton
                      size="small"
                      onClick={handleRemoveImage}
                      sx={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', border: '1px solid', borderColor: 'divider', '&:hover': { backgroundColor: '#f5f5f5' } }}
                    >
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ borderStyle: 'dashed', px: 4, py: 2, color: '#5C6B5E', borderColor: 'rgba(61, 74, 62, 0.3)' }}
                  >
                    Upload Image
                  </Button>
                )}
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Entries Per Client"
                    type="number"
                    fullWidth
                    required
                    value={formData.sweepstakes_entries_allowed || 1}
                    onChange={(e) => handleFormChange('sweepstakes_entries_allowed', parseInt(e.target.value) || 1)}
                    error={!!stepErrors.sweepstakes_entries_allowed}
                    helperText={stepErrors.sweepstakes_entries_allowed}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Number of Winners"
                    type="number"
                    fullWidth
                    required
                    value={formData.sweepstakes_winners_count || 1}
                    onChange={(e) => handleFormChange('sweepstakes_winners_count', parseInt(e.target.value) || 1)}
                    error={!!stepErrors.sweepstakes_winners_count}
                    helperText={stepErrors.sweepstakes_winners_count}
                  />
                </Grid>
              </Grid>

              <TextField
                label="Draw Date"
                type="date"
                fullWidth
                value={formData.sweepstakes_draw_date ? formData.sweepstakes_draw_date.slice(0, 10) : ''}
                onChange={(e) => handleFormChange('sweepstakes_draw_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />

              <TextField label="Prize Details" fullWidth multiline rows={3} value={formData.prize_details || ''} onChange={(e) => handleFormChange('prize_details', e.target.value)} />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeForm} disabled={formLoading}>Cancel</Button>
          <Button variant="outlined" onClick={() => handleSave(false)} disabled={formLoading}>
            {formLoading ? <CircularProgress size={20} /> : 'Save as Draft'}
          </Button>
          <Button variant="contained" onClick={() => handleSave(true)} disabled={formLoading}
            sx={{ backgroundColor: '#D4956A', '&:hover': { backgroundColor: '#c08050' } }}>
            {formLoading ? <CircularProgress size={20} /> : (editingId ? 'Save Changes' : 'Create & Activate')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== CLAIMS VIEWER DIALOG ===== */}
      <Dialog open={claimsDialogOpen} onClose={() => setClaimsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Claims — {claimsOffer?.title}</DialogTitle>
        <DialogContent>
          {claimsLoading ? <CircularProgress /> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Tier</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {claims.map(c => (
                  <TableRow key={c.id} hover>
                    <TableCell><Typography variant="caption">{formatDateTime(c.created_at)}</Typography></TableCell>
                    <TableCell><Typography variant="body2" fontWeight={500}>{c.client_name}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{c.client_email}</Typography></TableCell>
                    <TableCell><TierBadge tier={c.client_tier} size="small" /></TableCell>
                    <TableCell><Typography variant="caption">{c.claim_type}</Typography></TableCell>
                    <TableCell><Chip label={c.status} size="small" color={CLAIM_STATUS_COLORS[c.status] || 'default'} /></TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <FormControl size="small" sx={{ minWidth: 90 }}>
                          <Select value={c.status} onChange={(e) => handleUpdateClaimStatus(c.id, e.target.value)} size="small">
                            {['entered', 'won', 'lost', 'confirmed', 'declined', 'claimed', 'fulfilled'].map(s => (
                              <MenuItem key={s} value={s}>{s}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        {claimsOffer?.type === 'giveaway' && (c.status === 'entered' || c.status === 'lost') && (
                          <Tooltip title="Manual Pick as Winner">
                            <IconButton size="small" color="warning" onClick={() => handleManualPick(claimsOffer, c.client_id)}>
                              <EmojiEventsIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setClaimsDialogOpen(false)}>Close</Button></DialogActions>
      </Dialog>

      {/* ===== DRAW WINNERS DIALOG ===== */}
      <Dialog open={drawDialogOpen} onClose={() => setDrawDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CasinoIcon color="warning" /> Draw Winners
        </DialogTitle>
        <DialogContent>
          {!drawResult ? (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Are you sure you want to draw <strong>{drawOffer?.sweepstakes_winners_count || 1}</strong> winner(s)
                for "<strong>{drawOffer?.title}</strong>"?
              </Typography>
              <Typography variant="body2" color="text.secondary">This action cannot be undone.</Typography>
            </Box>
          ) : (
            <Box sx={{ py: 2 }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <EmojiEventsIcon sx={{ fontSize: 56, color: '#FFD700' }} />
                <Typography variant="h5" sx={{ mt: 1 }}>Winners Drawn!</Typography>
                <Typography variant="body2" color="text.secondary">{drawResult.total_entries} entries, {drawResult.winners_count} winner(s)</Typography>
              </Box>
              {drawResult.winners.map(w => (
                <Card key={w.claim_id} variant="outlined" sx={{ p: 2, mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body1" fontWeight={600}>{w.client_name}</Typography>
                    <Typography variant="caption" color="text.secondary">{w.client_email}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TierBadge tier={w.client_tier} size="small" />
                    <Button size="small" variant="contained" color="success"
                      onClick={() => handleConfirmWinner(w.claim_id)}
                      disabled={w.status === 'confirmed'}>
                      {w.status === 'confirmed' ? 'Confirmed' : 'Confirm Winner'}
                    </Button>
                  </Box>
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDrawDialogOpen(false)}>Close</Button>
          {!drawResult && (
            <Button variant="contained" onClick={handleDraw} disabled={drawLoading}
              sx={{ backgroundColor: '#D4956A', '&:hover': { backgroundColor: '#c08050' } }}>
              {drawLoading ? <CircularProgress size={20} /> : 'Draw Now'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ===== DELETE CONFIRMATION ===== */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Offer?</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete "{deleteTarget?.title}"? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Toast open={toast.open} message={toast.message} severity={toast.severity}
        onClose={() => setToast(t => ({ ...t, open: false }))} />
    </Box>
  );
};

export default OffersPage;
