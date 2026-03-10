import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Grid,
  Card, CardContent, CircularProgress, Radio, RadioGroup, FormControlLabel, Tooltip,
  ToggleButton, ToggleButtonGroup, Collapse, InputAdornment
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
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import ClearIcon from '@mui/icons-material/Clear';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import {
  getOffers, createOffer, updateOffer, deleteOffer, getOfferClaims,
  getAllOfferClaims, updateOfferClaim, drawOfferWinners, manualPickWinner,
  getRewardsCatalog
} from '../services/api';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TierBadge from '../components/TierBadge';
import Toast from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { POINTS_PER_DOLLAR, formatShortDate } from '../utils/formatters';
import { frostedCardSx, TIER_DOT_COLORS } from '../theme';

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

const TIME_PERIODS = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: 'YTD', months: 0 },
  { label: '1Y', months: 12 },
  { label: '2Y', months: 24 },
  { label: '5Y', months: 60 },
  { label: 'All', months: 999 }
];

const getDateCutoff = (periodLabel) => {
  if (periodLabel === 'All') return null;
  const now = new Date();
  if (periodLabel === 'YTD') return new Date(now.getFullYear(), 0, 1);
  const period = TIME_PERIODS.find(p => p.label === periodLabel);
  const from = new Date(now);
  from.setMonth(from.getMonth() - period.months);
  return from;
};

const periodToggleSx = {
  '& .MuiToggleButton-root': {
    px: 1.5, py: 0.3, fontSize: '12px', fontWeight: 600,
    border: '1px solid rgba(61,74,62,0.15)', color: '#5C6B5E', textTransform: 'none',
    '&.Mui-selected': { backgroundColor: '#3D4A3E', color: '#fff', '&:hover': { backgroundColor: '#2A332B' } },
    '&:hover': { backgroundColor: 'rgba(61,74,62,0.06)' }
  }
};

const INITIAL_FORM = {
  type: 'deal', title: '', description: '', preview_text: '', min_tier: 'gold',
  start_date: '', end_date: '', status: 'draft',
  reward_id: '', deal_discount_percentage: '',
  claim_type: 'first_come', spots_available: '', prize_details: '',
  event_date: '', experience_points_cost: '',
  sweepstakes_entries_allowed: 1, sweepstakes_winners_count: 1,
  sweepstakes_draw_date: ''
};

const DEAL_FIELDS = { reward_id: '', deal_discount_percentage: '' };
const EXPERIENCE_FIELDS = { claim_type: 'rsvp', spots_available: '', prize_details: '', event_date: '', experience_points_cost: '' };
const GIVEAWAY_FIELDS = { sweepstakes_entries_allowed: 1, sweepstakes_winners_count: 1, sweepstakes_draw_date: '', prize_details: '' };

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '-';

const typeFilterOptions = [
  { value: '', label: 'All Types' },
  { value: 'deal', label: 'Deals' },
  { value: 'experience', label: 'Experiences' },
  { value: 'giveaway', label: 'Giveaways' }
];

const statusFilterOptions = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'completed', label: 'Completed' }
];

const toggleButtonSx = {
  gap: 1,
  '& .MuiToggleButton-root': {
    borderRadius: '10px',
    px: 2, py: 0.6,
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
    '&:hover': { backgroundColor: 'rgba(61, 74, 62, 0.06)' }
  }
};

const OffersPage = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Period & Filters
  const [selectedPeriod, setSelectedPeriod] = useState('All');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  // Type group expansion
  const [expandedTypeGroups, setExpandedTypeGroups] = useState({ deal: false, experience: false, giveaway: false });

  // Per-offer claims expansion
  const [expandedOfferClaims, setExpandedOfferClaims] = useState({});
  const [offerClaimsCache, setOfferClaimsCache] = useState({});
  const [offerClaimsLoading, setOfferClaimsLoading] = useState({});

  // Create/Edit form
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({ ...INITIAL_FORM });
  const [formLoading, setFormLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [stepErrors, setStepErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Claims viewer dialog
  const [claimsDialogOpen, setClaimsDialogOpen] = useState(false);
  const [claimsOffer, setClaimsOffer] = useState(null);
  const [claims, setClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);

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

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

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

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  // Filtered & grouped offers
  const filteredOffers = useMemo(() => {
    let result = offers;
    if (typeFilter) result = result.filter(o => o.type === typeFilter);
    if (statusFilter) {
      if (statusFilter === 'completed') {
        result = result.filter(o => o.status === 'expired' || o.status === 'cancelled');
      } else {
        result = result.filter(o => o.status === statusFilter);
      }
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        (o.title || '').toLowerCase().includes(q) ||
        (o.description || '').toLowerCase().includes(q) ||
        (o.reward_name || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [offers, typeFilter, statusFilter, search]);

  const dealOffers = useMemo(() => filteredOffers.filter(o => o.type === 'deal'), [filteredOffers]);
  const experienceOffers = useMemo(() => filteredOffers.filter(o => o.type === 'experience'), [filteredOffers]);
  const giveawayOffers = useMemo(() => filteredOffers.filter(o => o.type === 'giveaway'), [filteredOffers]);

  const stats = useMemo(() => {
    const cutoff = getDateCutoff(selectedPeriod);
    const periodOffers = cutoff
      ? offers.filter(o => new Date(o.created_at) >= cutoff)
      : offers;
    return {
      total: periodOffers.length,
      active: periodOffers.filter(o => o.status === 'active').length,
      activeDeals: periodOffers.filter(o => o.type === 'deal' && o.status === 'active').length,
      activeExperiences: periodOffers.filter(o => o.type === 'experience' && o.status === 'active').length,
      activeGiveaways: periodOffers.filter(o => o.type === 'giveaway' && o.status === 'active').length,
      drawnGiveaways: periodOffers.filter(o => o.type === 'giveaway' && o.sweepstakes_drawn).length,
    };
  }, [offers, selectedPeriod]);

  const hasActiveFilters = search || typeFilter || (statusFilter && statusFilter !== 'active');

  const handleClearFilters = () => {
    setSearchInput('');
    setSearch('');
    setTypeFilter('');
    setStatusFilter('active');
  };

  // --- Per-offer claims expansion ---
  const toggleOfferClaims = async (offerId) => {
    const isExpanded = expandedOfferClaims[offerId];
    setExpandedOfferClaims(prev => ({ ...prev, [offerId]: !isExpanded }));

    if (!isExpanded && !offerClaimsCache[offerId]) {
      setOfferClaimsLoading(prev => ({ ...prev, [offerId]: true }));
      try {
        const { data } = await getOfferClaims(offerId, { limit: 200 });
        setOfferClaimsCache(prev => ({ ...prev, [offerId]: data.claims || [] }));
      } catch (err) {
        console.error('Failed to load claims', err);
      } finally {
        setOfferClaimsLoading(prev => ({ ...prev, [offerId]: false }));
      }
    }
  };

  const toggleTypeGroup = (type) => {
    setExpandedTypeGroups(prev => ({ ...prev, [type]: !prev[type] }));
  };

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
      sweepstakes_draw_date: offer.sweepstakes_draw_date || '',
      experience_points_cost: offer.experience_points_cost || ''
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

  const handleSave = async (activateNow = false) => {
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
      const effectiveTitle = isDealForm
        ? (formData.title || getDealAutoTitle(formData.reward_id, formData.deal_discount_percentage))
        : formData.title;
      const effectiveDescription = isDealForm
        ? (formData.description || getDealAutoDescription(formData.reward_id, formData.deal_discount_percentage))
        : formData.description;

      fd.append('type', formData.type);
      fd.append('title', effectiveTitle);
      if (effectiveDescription) fd.append('description', effectiveDescription);
      fd.append('min_tier', formData.min_tier);
      fd.append('start_date', formData.start_date);
      fd.append('end_date', formData.end_date);
      fd.append('status', activateNow ? 'active' : (formData.status || 'draft'));

      if (formData.type === 'deal') {
        if (formData.reward_id) fd.append('reward_id', formData.reward_id);
        if (formData.deal_discount_percentage) fd.append('deal_discount_percentage', formData.deal_discount_percentage);
      } else if (formData.type === 'experience') {
        fd.append('claim_type', 'rsvp');
        if (formData.spots_available) fd.append('spots_available', formData.spots_available);
        if (formData.preview_text) fd.append('preview_text', formData.preview_text);
        if (formData.event_date) fd.append('event_date', formData.event_date);
        if (formData.experience_points_cost) fd.append('experience_points_cost', formData.experience_points_cost);
      } else if (formData.type === 'giveaway') {
        fd.append('sweepstakes_entries_allowed', formData.sweepstakes_entries_allowed || 1);
        fd.append('sweepstakes_winners_count', formData.sweepstakes_winners_count || 1);
        if (formData.sweepstakes_draw_date) fd.append('sweepstakes_draw_date', formData.sweepstakes_draw_date);
        if (formData.prize_details) fd.append('prize_details', formData.prize_details);
      }

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

  // --- Claims viewer dialog ---
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

  const handleUpdateClaimStatus = async (claimId, status, offerId) => {
    try {
      await updateOfferClaim(claimId, { status });
      setToast({ open: true, message: `Claim updated to ${status}`, severity: 'success' });
      // Refresh claims dialog if open
      if (claimsOffer) {
        const { data } = await getOfferClaims(claimsOffer.id, { limit: 200 });
        setClaims(data.claims || []);
      }
      // Invalidate inline claims cache for the offer
      const targetOfferId = offerId || claimsOffer?.id;
      if (targetOfferId && offerClaimsCache[targetOfferId]) {
        const { data } = await getOfferClaims(targetOfferId, { limit: 200 });
        setOfferClaimsCache(prev => ({ ...prev, [targetOfferId]: data.claims || [] }));
      }
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
      // Refresh inline cache
      if (offerClaimsCache[offer.id]) {
        const { data } = await getOfferClaims(offer.id, { limit: 200 });
        setOfferClaimsCache(prev => ({ ...prev, [offer.id]: data.claims || [] }));
      }
      fetchOffers();
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.error?.message || 'Manual pick failed', severity: 'error' });
    }
  };

  // --- Helpers ---
  const getClaimCount = (offer) => {
    if (offer.type === 'deal') return offer.deal_quantity_claimed || 0;
    if (offer.type === 'experience') return offer.spots_claimed || 0;
    return offer.deal_quantity_claimed || offer.spots_claimed || 0;
  };

  const getTypeBadge = (type) => {
    const t = TYPE_COLORS[type] || TYPE_COLORS.deal;
    return <Chip label={t.label} size="small" sx={{ backgroundColor: t.bg, color: t.color, fontWeight: 600, fontSize: '11px' }} />;
  };

  const getDiscountPreview = (pct) => {
    if (!pct || pct <= 0 || pct >= 100) return [];
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

  // --- Render individual offer card ---
  const renderOfferCard = (offer) => {
    const tc = TYPE_COLORS[offer.type] || TYPE_COLORS.deal;
    const isClaimsExpanded = expandedOfferClaims[offer.id];
    const cachedClaims = offerClaimsCache[offer.id] || [];
    const claimsAreLoading = offerClaimsLoading[offer.id];
    const claimCount = getClaimCount(offer);
    const imgSrc = getImageSrc(offer.image_url);

    return (
      <Box key={offer.id} sx={{
        p: 2.5, borderRadius: '14px',
        border: `1px solid ${tc.bg}`,
        borderLeft: `4px solid ${tc.color}`,
        backgroundColor: `rgba(${tc.color === '#B87A4F' ? '212,149,106' : tc.color === '#5A8A7A' ? '90,138,122' : '61,74,62'}, 0.03)`,
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: `rgba(${tc.color === '#B87A4F' ? '212,149,106' : tc.color === '#5A8A7A' ? '90,138,122' : '61,74,62'}, 0.06)`,
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)'
        },
        mb: 1.5
      }}>
        {/* Row 1: Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
            {imgSrc ? (
              <Box component="img" src={imgSrc} alt={offer.title}
                sx={{ width: 40, height: 40, borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <Box sx={{ width: 40, height: 40, borderRadius: '10px', backgroundColor: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {offer.type === 'deal' ? <LocalOfferIcon sx={{ fontSize: 20, color: tc.color }} /> :
                 offer.type === 'experience' ? <StarIcon sx={{ fontSize: 20, color: tc.color }} /> :
                 <ConfirmationNumberIcon sx={{ fontSize: 20, color: tc.color }} />}
              </Box>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '15px', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {offer.title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                {getTypeBadge(offer.type)}
                <Chip label={offer.status} size="small" color={STATUS_COLORS[offer.status] || 'default'} sx={{ height: 22, fontSize: '11px' }} />
                <TierBadge tier={offer.min_tier} size="small" />
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, ml: 1 }}>
            <Tooltip title="Edit"><IconButton size="small" onClick={() => openEditForm(offer)}><EditIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="View All Claims"><IconButton size="small" onClick={() => openClaimsViewer(offer)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
            {offer.status === 'draft' && (
              <>
                <Button size="small" variant="contained" color="success" onClick={() => handleActivate(offer)} sx={{ minWidth: 0, px: 1, fontSize: '12px' }}>Activate</Button>
                <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteTarget(offer)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
              </>
            )}
            {offer.status === 'active' && (
              <Button size="small" variant="outlined" color="error" onClick={() => handleDeactivate(offer)} sx={{ minWidth: 0, px: 1, fontSize: '12px' }}>Cancel</Button>
            )}
            {offer.type === 'giveaway' && offer.status === 'active' && !offer.sweepstakes_drawn && (
              <Button size="small" variant="contained" startIcon={<CasinoIcon sx={{ fontSize: '16px !important' }} />}
                onClick={() => openDrawDialog(offer)}
                sx={{ minWidth: 0, px: 1.5, fontSize: '12px', backgroundColor: '#D4956A', '&:hover': { backgroundColor: '#c08050' } }}>
                Draw
              </Button>
            )}
            {offer.type === 'giveaway' && offer.sweepstakes_drawn && (
              <Chip icon={<EmojiEventsIcon />} label="Drawn" size="small" color="success" variant="outlined" sx={{ height: 24 }} />
            )}
          </Box>
        </Box>

        {/* Row 2: Type-specific details */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap', pl: 7 }}>
          {offer.type === 'deal' && (
            <>
              {offer.reward_name && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {offer.reward_logo_url && (
                    <Box component="img" src={getImageSrc(offer.reward_logo_url)} alt=""
                      sx={{ width: 16, height: 16, borderRadius: '4px', objectFit: 'contain' }} />
                  )}
                  <Typography variant="caption" sx={{ color: '#5C6B5E', fontWeight: 500 }}>{offer.reward_name}</Typography>
                </Box>
              )}
              {offer.deal_discount_percentage && (
                <Chip label={`${offer.deal_discount_percentage}% off`} size="small"
                  sx={{ height: 22, fontSize: '11px', fontWeight: 600, backgroundColor: 'rgba(90,138,122,0.1)', color: '#5A8A7A' }} />
              )}
              <Typography variant="caption" sx={{ color: '#5C6B5E' }}>
                {offer.deal_quantity_claimed || 0} claimed
              </Typography>
            </>
          )}
          {offer.type === 'experience' && (
            <>
              <Typography variant="caption" sx={{ color: '#5C6B5E', fontWeight: 500 }}>
                {offer.spots_claimed || 0}/{offer.spots_available || '?'} spots filled
              </Typography>
              <Chip
                label={offer.experience_points_cost ? `${Number(offer.experience_points_cost).toLocaleString()} pts` : 'Free RSVP'}
                size="small"
                sx={{
                  height: 22, fontSize: '11px', fontWeight: 600,
                  backgroundColor: offer.experience_points_cost ? 'rgba(212,149,106,0.12)' : 'rgba(90,138,122,0.1)',
                  color: offer.experience_points_cost ? '#B87A4F' : '#5A8A7A'
                }}
              />
              {offer.event_date && (
                <Typography variant="caption" sx={{ color: '#5C6B5E' }}>
                  Event: {formatDate(offer.event_date)}
                </Typography>
              )}
            </>
          )}
          {offer.type === 'giveaway' && (
            <>
              <Typography variant="caption" sx={{ color: '#5C6B5E', fontWeight: 500 }}>
                {offer.sweepstakes_winners_count || 1} winner{(offer.sweepstakes_winners_count || 1) > 1 ? 's' : ''}
              </Typography>
              {offer.sweepstakes_draw_date && (
                <Typography variant="caption" sx={{ color: '#5C6B5E' }}>
                  Draw: {formatDate(offer.sweepstakes_draw_date)}
                </Typography>
              )}
            </>
          )}
          <Typography variant="caption" sx={{ color: '#9CA89E' }}>
            {formatDate(offer.start_date)} — {formatDate(offer.end_date)}
          </Typography>
        </Box>

        {/* Row 3: Expandable inline claims */}
        <Box sx={{ pl: 7 }}>
          <Box onClick={() => toggleOfferClaims(offer.id)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', userSelect: 'none',
              py: 0.5,
              '&:hover': { '& .claims-label': { color: '#3D4A3E' } }
            }}>
            {isClaimsExpanded
              ? <KeyboardArrowDownIcon sx={{ fontSize: 18, color: '#6B7A6D' }} />
              : <KeyboardArrowRightIcon sx={{ fontSize: 18, color: '#6B7A6D' }} />}
            <Typography className="claims-label" variant="caption" sx={{ color: '#6B7A6D', fontWeight: 600, transition: 'color 0.15s' }}>
              Claims ({claimCount})
            </Typography>
          </Box>
          <Collapse in={isClaimsExpanded}>
            <Box sx={{ mt: 0.5, mb: 0.5 }}>
              {claimsAreLoading ? (
                <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress size={20} sx={{ color: '#5C6B5E' }} />
                </Box>
              ) : cachedClaims.length === 0 ? (
                <Typography variant="caption" sx={{ color: '#9CA89E', pl: 3 }}>No claims yet</Typography>
              ) : (
                cachedClaims.map((c) => (
                  <Box key={c.id} sx={{
                    px: 1.5, py: 1,
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    borderTop: '1px solid rgba(61,74,62,0.06)',
                    transition: 'background-color 0.15s ease',
                    '&:hover': { backgroundColor: 'rgba(61,74,62,0.03)' },
                  }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: TIER_DOT_COLORS[c.client_tier] || '#9CA89E', flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 120, fontSize: '13px' }}>{c.client_name}</Typography>
                    <Typography variant="caption" sx={{ color: '#6B7A6D', textTransform: 'capitalize', minWidth: 60 }}>{c.client_tier}</Typography>
                    <Typography variant="caption" sx={{ color: '#6B7A6D' }}>{formatDate(c.created_at)}</Typography>
                    <Chip label={c.status} size="small" color={CLAIM_STATUS_COLORS[c.status] || 'default'} sx={{ height: 22, fontSize: '11px', ml: 'auto' }} />
                    <FormControl size="small" sx={{ minWidth: 90 }}>
                      <Select value={c.status} onChange={(e) => handleUpdateClaimStatus(c.id, e.target.value, offer.id)} size="small"
                        sx={{ fontSize: '12px', '& .MuiSelect-select': { py: '4px' } }}>
                        {['entered', 'won', 'lost', 'confirmed', 'declined', 'claimed', 'fulfilled'].map(s => (
                          <MenuItem key={s} value={s} sx={{ fontSize: '12px' }}>{s}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {offer.type === 'giveaway' && (c.status === 'entered' || c.status === 'lost') && (
                      <Tooltip title="Manual Pick as Winner">
                        <IconButton size="small" color="warning" onClick={() => handleManualPick(offer, c.client_id)}>
                          <EmojiEventsIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                ))
              )}
            </Box>
          </Collapse>
        </Box>
      </Box>
    );
  };

  // --- Render type group section ---
  const renderTypeGroup = (type, offersList) => {
    if (offersList.length === 0) return null;
    const tc = TYPE_COLORS[type];
    const isExpanded = expandedTypeGroups[type];
    const typeIcons = { deal: <LocalOfferIcon sx={{ fontSize: 18 }} />, experience: <StarIcon sx={{ fontSize: 18 }} />, giveaway: <ConfirmationNumberIcon sx={{ fontSize: 18 }} /> };

    return (
      <Box key={type} sx={{ borderRadius: '12px', border: '1px solid rgba(61,74,62,0.1)', overflow: 'hidden' }}>
        <Box onClick={() => toggleTypeGroup(type)} sx={{
          px: 2, py: 1.25, cursor: 'pointer', userSelect: 'none',
          backgroundColor: tc.bg,
          display: 'flex', alignItems: 'center', gap: 1,
          transition: 'background-color 0.15s ease',
          '&:hover': { backgroundColor: `rgba(${tc.color === '#B87A4F' ? '212,149,106' : tc.color === '#5A8A7A' ? '90,138,122' : '61,74,62'}, 0.18)` },
        }}>
          {isExpanded
            ? <KeyboardArrowDownIcon sx={{ fontSize: 20, color: tc.color }} />
            : <KeyboardArrowRightIcon sx={{ fontSize: 20, color: tc.color }} />}
          <Box sx={{ color: tc.color }}>{typeIcons[type]}</Box>
          <Typography sx={{ fontWeight: 600, fontSize: '14px', color: '#2D2D2D', flex: 1 }}>
            {tc.label}s
          </Typography>
          <Chip label={offersList.length} size="small" sx={{ height: 22, fontSize: '12px', fontWeight: 600, backgroundColor: 'rgba(61,74,62,0.08)' }} />
        </Box>
        <Collapse in={isExpanded}>
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 0 }}>
            {offersList.map(renderOfferCard)}
          </Box>
        </Collapse>
      </Box>
    );
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" gutterBottom>Offers & Promotions</Typography>
          <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Manage deals, experiences, and sweepstakes</Typography>
        </Box>
        <ToggleButtonGroup
          value={selectedPeriod}
          exclusive
          onChange={(_, v) => { if (v !== null) setSelectedPeriod(v); }}
          size="small"
          sx={periodToggleSx}
        >
          {TIME_PERIODS.map((p) => (
            <ToggleButton key={p.label} value={p.label}>{p.label}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* ── Summary Stats ── */}
      <Typography variant="subtitle2" sx={{ color: '#5C6B5E', mb: 1.5, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', fontSize: '12px' }}>
        Offers Overview
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: 'Total Offers', value: stats.total, sub: `${stats.active} active` },
          { label: 'Active Deals', value: stats.activeDeals, sub: 'deal promotions running' },
          { label: 'Active Experiences', value: stats.activeExperiences, sub: 'events available' },
          { label: 'Active Giveaways', value: stats.activeGiveaways, sub: `${stats.drawnGiveaways} drawn` }
        ].map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.label}>
            <Box sx={{ ...frostedCardSx, p: 3, textAlign: 'center', height: 130, display: 'flex', flexDirection: 'column', justifyContent: 'center', '&:hover': { transform: 'none' } }}>
              <Typography variant="subtitle2" sx={{ color: '#5C6B5E', mb: 0.5 }}>{stat.label}</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', mb: 0.5 }}>{stat.value}</Typography>
              <Typography variant="caption" sx={{ color: '#5C6B5E' }}>{stat.sub}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* ── Manage Offers ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ color: '#5C6B5E', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', fontSize: '12px' }}>
          Manage Offers
        </Typography>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openCreateForm}>Create Offer</Button>
      </Box>

      {/* Filter Bar */}
      <Box sx={{ ...frostedCardSx, p: 2.5, mb: 3, borderTop: '3px solid #D4956A', '&:hover': { transform: 'none' } }}>
        <TextField
          placeholder="Search offers by title, description..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          size="small"
          fullWidth
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlinedIcon sx={{ color: '#9CA89E', fontSize: 20 }} />
              </InputAdornment>
            ),
            endAdornment: searchInput && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchInput('')}>
                  <ClearIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <ToggleButtonGroup
            value={typeFilter}
            exclusive
            onChange={(_, v) => { if (v !== null) setTypeFilter(v); }}
            size="small"
            sx={toggleButtonSx}
          >
            {typeFilterOptions.map(o => <ToggleButton key={o.value} value={o.value}>{o.label}</ToggleButton>)}
          </ToggleButtonGroup>

          <ToggleButtonGroup
            value={statusFilter}
            exclusive
            onChange={(_, v) => { if (v !== null) setStatusFilter(v); }}
            size="small"
            sx={toggleButtonSx}
          >
            {statusFilterOptions.map(o => <ToggleButton key={o.value} value={o.value}>{o.label}</ToggleButton>)}
          </ToggleButtonGroup>

          {hasActiveFilters && (
            <Tooltip title="Clear all filters">
              <Chip
                label="Clear Filters"
                size="small"
                onDelete={handleClearFilters}
                onClick={handleClearFilters}
                sx={{ backgroundColor: 'rgba(193, 89, 46, 0.1)', color: '#C1592E', fontWeight: 600, fontSize: '12px' }}
              />
            </Tooltip>
          )}
        </Box>

        {hasActiveFilters && (
          <Typography variant="caption" sx={{ color: '#5C6B5E', mt: 1.5, display: 'block' }}>
            Showing {filteredOffers.length} offer{filteredOffers.length !== 1 ? 's' : ''}
            {search && <> matching "<strong>{search}</strong>"</>}
          </Typography>
        )}
      </Box>

      {/* Offers Area */}
      <Typography variant="subtitle2" sx={{ color: '#5C6B5E', mb: 1.5, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', fontSize: '12px' }}>
        Categories
      </Typography>
      <Box sx={{ ...frostedCardSx, overflow: 'hidden', '&:hover': { transform: 'none' } }}>
        {loading ? <LoadingSpinner /> : (
          filteredOffers.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body1" sx={{ color: '#5C6B5E' }}>
                {hasActiveFilters ? 'No offers match your filters.' : 'No offers yet. Create your first offer to get started.'}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {renderTypeGroup('deal', dealOffers)}
              {renderTypeGroup('experience', experienceOffers)}
              {renderTypeGroup('giveaway', giveawayOffers)}
            </Box>
          )
        )}
      </Box>

      {/* ===== CREATE/EDIT OFFER DIALOG ===== */}
      <Dialog open={formOpen} onClose={closeForm} maxWidth="md" fullWidth>
        <DialogTitle>{editingId ? 'Edit Offer' : 'Create New Offer'}</DialogTitle>
        <DialogContent>
          {/* Type selector */}
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

          {/* ===== DEAL FORM ===== */}
          {isDealForm && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
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
                          <Box component="img" src={logoSrc} alt={reward.brand}
                            sx={{ width: 36, height: 36, borderRadius: '8px', objectFit: 'contain', flexShrink: 0 }} />
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

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Background Image</Typography>
                <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" ref={fileInputRef} onChange={handleImageSelect} style={{ display: 'none' }} />
                {imagePreview ? (
                  <Box sx={{ position: 'relative', display: 'inline-block' }}>
                    <Box component="img" src={imageFile ? imagePreview : getImageSrc(imagePreview)} alt="Preview"
                      sx={{ width: 200, height: 120, objectFit: 'cover', borderRadius: 2, border: '1px solid', borderColor: 'divider' }} />
                    <IconButton size="small" onClick={handleRemoveImage}
                      sx={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', border: '1px solid', borderColor: 'divider', '&:hover': { backgroundColor: '#f5f5f5' } }}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                ) : (
                  <Button variant="outlined" startIcon={<CloudUploadIcon />} onClick={() => fileInputRef.current?.click()}
                    sx={{ borderStyle: 'dashed', px: 4, py: 2, color: '#5C6B5E', borderColor: 'rgba(61, 74, 62, 0.3)' }}>
                    Upload Image
                  </Button>
                )}
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <TextField label="Start Date" type="date" fullWidth required
                    value={formData.start_date ? formData.start_date.slice(0, 10) : ''}
                    onChange={(e) => handleFormChange('start_date', e.target.value)}
                    InputLabelProps={{ shrink: true }} error={!!stepErrors.start_date} helperText={stepErrors.start_date} />
                </Grid>
                <Grid item xs={3}>
                  <TextField label="End Date" type="date" fullWidth required
                    value={formData.end_date ? formData.end_date.slice(0, 10) : ''}
                    onChange={(e) => handleFormChange('end_date', e.target.value)}
                    InputLabelProps={{ shrink: true }} error={!!stepErrors.end_date} helperText={stepErrors.end_date} />
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
                  <TextField label="Discount %" type="number" fullWidth required
                    value={formData.deal_discount_percentage || ''}
                    onChange={(e) => handleFormChange('deal_discount_percentage', parseInt(e.target.value) || '')}
                    error={!!stepErrors.deal_discount_percentage} helperText={stepErrors.deal_discount_percentage}
                    InputProps={{ endAdornment: <Typography sx={{ color: '#9CA89E' }}>%</Typography> }}
                    inputProps={{ min: 1, max: 99 }} />
                </Grid>
              </Grid>

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
                          <Typography variant="caption" sx={{ textDecoration: 'line-through', color: '#9CA89E' }}>{full.toLocaleString()} pts</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#5A8A7A' }}>{discounted.toLocaleString()} pts</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {formData.reward_id && formData.deal_discount_percentage > 0 && (
                <Box sx={{ backgroundColor: 'rgba(90, 138, 122, 0.06)', borderRadius: 2, p: 2, border: '1px solid rgba(90, 138, 122, 0.15)' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#5A8A7A', mb: 0.5, display: 'block' }}>Auto-Generated</Typography>
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

          {/* ===== EXPERIENCE FORM ===== */}
          {isExperienceForm && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField label="Title" fullWidth required value={formData.title || ''}
                onChange={(e) => handleFormChange('title', e.target.value)}
                error={!!stepErrors.title} helperText={stepErrors.title} />
              <TextField label="Preview Text" fullWidth value={formData.preview_text || ''}
                onChange={(e) => handleFormChange('preview_text', e.target.value)}
                helperText="Short text shown on the offer card (1-2 lines)" inputProps={{ maxLength: 100 }} />
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <TextField label="Start Date" type="date" fullWidth required
                    value={formData.start_date ? formData.start_date.slice(0, 10) : ''}
                    onChange={(e) => handleFormChange('start_date', e.target.value)}
                    InputLabelProps={{ shrink: true }} error={!!stepErrors.start_date} helperText={stepErrors.start_date} />
                </Grid>
                <Grid item xs={4}>
                  <TextField label="End Date" type="date" fullWidth required
                    value={formData.end_date ? formData.end_date.slice(0, 10) : ''}
                    onChange={(e) => handleFormChange('end_date', e.target.value)}
                    InputLabelProps={{ shrink: true }} error={!!stepErrors.end_date} helperText={stepErrors.end_date} />
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

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Offer Image</Typography>
                <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" ref={fileInputRef} onChange={handleImageSelect} style={{ display: 'none' }} />
                {imagePreview ? (
                  <Box sx={{ position: 'relative', display: 'inline-block' }}>
                    <Box component="img" src={imageFile ? imagePreview : getImageSrc(imagePreview)} alt="Preview"
                      sx={{ width: 200, height: 120, objectFit: 'cover', borderRadius: 2, border: '1px solid', borderColor: 'divider' }} />
                    <IconButton size="small" onClick={handleRemoveImage}
                      sx={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', border: '1px solid', borderColor: 'divider', '&:hover': { backgroundColor: '#f5f5f5' } }}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                ) : (
                  <Button variant="outlined" startIcon={<CloudUploadIcon />} onClick={() => fileInputRef.current?.click()}
                    sx={{ borderStyle: 'dashed', px: 4, py: 2, color: '#5C6B5E', borderColor: 'rgba(61, 74, 62, 0.3)' }}>
                    Upload Image
                  </Button>
                )}
              </Box>

              <TextField label="Spots Available" type="number" fullWidth required
                value={formData.spots_available || ''}
                onChange={(e) => handleFormChange('spots_available', parseInt(e.target.value) || '')}
                error={!!stepErrors.spots_available} helperText={stepErrors.spots_available} />
              <TextField label="Points Cost (optional)" type="number" fullWidth
                value={formData.experience_points_cost || ''}
                onChange={(e) => handleFormChange('experience_points_cost', parseInt(e.target.value) || '')}
                helperText="Leave empty for free RSVP. Set a value to require points to claim this experience."
                inputProps={{ min: 0, step: 1000 }} />
              <TextField label="Description" fullWidth multiline rows={3} value={formData.description || ''}
                onChange={(e) => handleFormChange('description', e.target.value)} />
              <TextField label="Date of Event / Experience" type="date" fullWidth
                value={formData.event_date ? formData.event_date.slice(0, 10) : ''}
                onChange={(e) => handleFormChange('event_date', e.target.value)}
                InputLabelProps={{ shrink: true }} />
            </Box>
          )}

          {/* ===== GIVEAWAY FORM ===== */}
          {isGiveawayForm && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField label="Title" fullWidth required value={formData.title || ''}
                onChange={(e) => handleFormChange('title', e.target.value)}
                error={!!stepErrors.title} helperText={stepErrors.title} />
              <TextField label="Description" fullWidth multiline rows={3} value={formData.description || ''}
                onChange={(e) => handleFormChange('description', e.target.value)} />
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <TextField label="Start Date" type="date" fullWidth required
                    value={formData.start_date ? formData.start_date.slice(0, 10) : ''}
                    onChange={(e) => handleFormChange('start_date', e.target.value)}
                    InputLabelProps={{ shrink: true }} error={!!stepErrors.start_date} helperText={stepErrors.start_date} />
                </Grid>
                <Grid item xs={4}>
                  <TextField label="End Date" type="date" fullWidth required
                    value={formData.end_date ? formData.end_date.slice(0, 10) : ''}
                    onChange={(e) => handleFormChange('end_date', e.target.value)}
                    InputLabelProps={{ shrink: true }} error={!!stepErrors.end_date} helperText={stepErrors.end_date} />
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

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Offer Image</Typography>
                <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" ref={fileInputRef} onChange={handleImageSelect} style={{ display: 'none' }} />
                {imagePreview ? (
                  <Box sx={{ position: 'relative', display: 'inline-block' }}>
                    <Box component="img" src={imageFile ? imagePreview : getImageSrc(imagePreview)} alt="Preview"
                      sx={{ width: 200, height: 120, objectFit: 'cover', borderRadius: 2, border: '1px solid', borderColor: 'divider' }} />
                    <IconButton size="small" onClick={handleRemoveImage}
                      sx={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', border: '1px solid', borderColor: 'divider', '&:hover': { backgroundColor: '#f5f5f5' } }}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                ) : (
                  <Button variant="outlined" startIcon={<CloudUploadIcon />} onClick={() => fileInputRef.current?.click()}
                    sx={{ borderStyle: 'dashed', px: 4, py: 2, color: '#5C6B5E', borderColor: 'rgba(61, 74, 62, 0.3)' }}>
                    Upload Image
                  </Button>
                )}
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField label="Entries Per Client" type="number" fullWidth required
                    value={formData.sweepstakes_entries_allowed || 1}
                    onChange={(e) => handleFormChange('sweepstakes_entries_allowed', parseInt(e.target.value) || 1)}
                    error={!!stepErrors.sweepstakes_entries_allowed} helperText={stepErrors.sweepstakes_entries_allowed} />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Number of Winners" type="number" fullWidth required
                    value={formData.sweepstakes_winners_count || 1}
                    onChange={(e) => handleFormChange('sweepstakes_winners_count', parseInt(e.target.value) || 1)}
                    error={!!stepErrors.sweepstakes_winners_count} helperText={stepErrors.sweepstakes_winners_count} />
                </Grid>
              </Grid>

              <TextField label="Draw Date" type="date" fullWidth
                value={formData.sweepstakes_draw_date ? formData.sweepstakes_draw_date.slice(0, 10) : ''}
                onChange={(e) => handleFormChange('sweepstakes_draw_date', e.target.value)}
                InputLabelProps={{ shrink: true }} />
              <TextField label="Prize Details" fullWidth multiline rows={3} value={formData.prize_details || ''}
                onChange={(e) => handleFormChange('prize_details', e.target.value)} />
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
