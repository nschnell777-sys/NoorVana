import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Grid, Button, Chip, Dialog, DialogContent,
  IconButton, Slider, CircularProgress, Fade, Avatar, TextField,
  MenuItem, Select, FormControl, InputLabel, Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MedicalServicesOutlinedIcon from '@mui/icons-material/MedicalServicesOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useAuth } from '../context/AuthContext';
import {
  getLoyaltyStatus, getRewardsCatalog, redeemPoints, createCardRequest,
  getRedemptions, getClientCardRequests, confirmCardRequest, denyCardRequest
} from '../services/api';
import { formatPoints, formatCurrency, formatShortDate } from '../utils/formatters';
import { TIER_ORDER } from '../utils/tierConfig';
import LoadingSpinner from '../components/LoadingSpinner';
import TierBadge from '../components/TierBadge';
import Toast from '../components/Toast';

const SUBCATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'dining', label: 'Dining' },
  { key: 'travel', label: 'Travel' },
  { key: 'cards', label: 'Cards' }
];

const GIFT_CARD_AMOUNTS = [
  { points: 10000, dollars: 50 },
  { points: 20000, dollars: 100 },
  { points: 30000, dollars: 150 },
  { points: 40000, dollars: 200 },
  { points: 50000, dollars: 250 },
  { points: 60000, dollars: 300 },
  { points: 70000, dollars: 350 },
  { points: 80000, dollars: 400 },
  { points: 90000, dollars: 450 },
  { points: 100000, dollars: 500 }
];

const SUBCAT_COLORS = {
  shopping: '#D4956A',
  dining: '#C1592E',
  travel: '#6C63FF',
  cards: '#5A8A7A'
};

const SUBCAT_LABELS = {
  shopping: 'Shopping',
  dining: 'Dining',
  travel: 'Travel',
  cards: 'Cards'
};

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const BRAND_DESCRIPTIONS = {
  // Shopping (A-Z)
  'Amazon': 'Shop millions of products from the world\'s largest online retailer.',
  'Apple': 'Devices, accessories, apps, and more from Apple.',
  'Home Depot': 'Tools, hardware, and everything for home improvement.',
  'Nordstrom': 'Designer fashion, shoes, and beauty.',
  'Saks Fifth Avenue': 'Luxury fashion, beauty, and accessories.',
  'Target': 'Everything from home essentials to fashion and electronics.',
  // Dining (A-Z)
  "Bloomin' Brands": 'Outback Steakhouse, Carrabba\'s, Bonefish Grill, and Fleming\'s Steakhouse.',
  'Darden': 'The Capital Grille, Ruth\'s Chris Steak House, Eddie V\'s, and many more.',
  "Landry's": 'Del Frisco\'s, Mastro\'s Steakhouse, Chart House, and many more.',
  'Starbucks': 'Coffee, tea, and handcrafted beverages.',
  // Travel (A-Z)
  'Airbnb': 'Unique stays and experiences around the world.',
  'American Airlines': 'Book flights and travel with American Airlines.',
  'Delta': 'Delta Air Lines gift cards for flights worldwide.',
  'Four Seasons': 'Luxury hotel stays and world-class hospitality.',
  'Hertz': 'Car rentals for business and leisure travel.',
  'Hilton': 'Stays at Hilton, Conrad, Waldorf Astoria, and more.',
  'Marriott': 'Hotels and resorts across 30+ brands worldwide.',
  'United Airlines': 'Gift cards for domestic and international travel.',
  // Cards (A-Z)
  'Amex Prepaid': 'Use anywhere American Express is accepted.',
  'Visa Prepaid': 'Use anywhere Visa is accepted - the ultimate flexible gift.'
};

const LogoAvatar = React.memo(({ brand, logoUrl, size = 48 }) => {
  const [imgError, setImgError] = useState(false);
  const initials = brand?.substring(0, 2).toUpperCase() || '??';
  const src = logoUrl?.startsWith('/') ? `${API_BASE}${logoUrl}` : logoUrl;

  if (src && !imgError) {
    return (
      <Avatar
        src={src}
        onError={() => setImgError(true)}
        sx={{
          width: size, height: size, borderRadius: '12px',
          backgroundColor: '#FFF', border: '1px solid rgba(0,0,0,0.08)'
        }}
        variant="rounded"
      />
    );
  }
  return (
    <Box sx={{
      width: size, height: size, borderRadius: '12px',
      background: 'linear-gradient(135deg, #3D4A3E, #5C6B5E)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#EFEBE4', fontFamily: '"Outfit", sans-serif', fontWeight: 500,
      fontSize: size > 40 ? '16px' : '12px', flexShrink: 0
    }}>
      {initials}
    </Box>
  );
});

const frostedCardSx = {
  background: 'rgba(255, 255, 255, 0.75)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  borderRadius: '16px',
  boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
  position: 'relative',
  overflow: 'hidden'
};

const RedeemRewardsPage = () => {
  const { client, updateClient, isUnenrolled } = useAuth();
  const [loyalty, setLoyalty] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(null);
  const [activeSubcategory, setActiveSubcategory] = useState('all');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const redemptionsRef = useRef(null);

  // Redemptions list state
  const [redemptionItems, setRedemptionItems] = useState([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(true);

  // Gift card modal
  const [selectedGiftCard, setSelectedGiftCard] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState(null);
  const [redeemError, setRedeemError] = useState('');

  // Service credit
  const [serviceCreditUnits, setServiceCreditUnits] = useState(10);
  const [serviceCreditLoading, setServiceCreditLoading] = useState(false);
  const [serviceCreditSuccess, setServiceCreditSuccess] = useState(null);
  const [serviceCreditError, setServiceCreditError] = useState('');
  const [serviceCreditConfirm, setServiceCreditConfirm] = useState(false);

  // Gift card confirmation step
  const [giftCardConfirm, setGiftCardConfirm] = useState(false);

  // Product credit
  const [productCreditUnits, setProductCreditUnits] = useState(10);
  const [productCreditLoading, setProductCreditLoading] = useState(false);
  const [productCreditSuccess, setProductCreditSuccess] = useState(null);
  const [productCreditError, setProductCreditError] = useState('');
  const [productCreditConfirm, setProductCreditConfirm] = useState(false);

  // Dismiss redemptions
  const [dismissedIds, setDismissedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dismissedRedemptions') || '[]'); } catch { return []; }
  });
  const [dismissOpen, setDismissOpen] = useState(false);
  const [dismissData, setDismissData] = useState(null);
  const [dismissConfirmStep, setDismissConfirmStep] = useState(false);

  // Card request confirm/deny
  const [cardRequestConfirmItem, setCardRequestConfirmItem] = useState(null);
  const [cardRequestDenyItem, setCardRequestDenyItem] = useState(null);
  const [cardRequestDenyReason, setCardRequestDenyReason] = useState('');
  const [cardRequestDenyLoading, setCardRequestDenyLoading] = useState(false);

  // Request a card
  const [confirmingCardId, setConfirmingCardId] = useState(null);

  const [requestCardOpen, setRequestCardOpen] = useState(false);
  const [requestBrand, setRequestBrand] = useState('');
  const [requestAmount, setRequestAmount] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(null);
  const [requestError, setRequestError] = useState('');

  const fetchStoreData = useCallback(async () => {
    if (!client?.id) return;
    try {
      const [loyaltyRes, catalogRes] = await Promise.all([
        getLoyaltyStatus(client.id),
        getRewardsCatalog()
      ]);
      setLoyalty(loyaltyRes.data);
      if (loyaltyRes.data.current_tier && loyaltyRes.data.current_tier !== client?.current_tier) {
        updateClient({ current_tier: loyaltyRes.data.current_tier });
      }
      setRewards(catalogRes.data.rewards || []);
    } catch (err) {
      console.error('Failed to load rewards store', err);
    } finally {
      setLoading(false);
    }
  }, [client?.id]);

  const fetchRedemptions = useCallback(async () => {
    if (!client?.id) return;
    setRedemptionsLoading(true);
    try {
      const [redemptionRes, cardReqRes] = await Promise.all([
        getRedemptions(client.id, { page: 1, limit: 100 }),
        getClientCardRequests(client.id)
      ]);

      const redemptions = (redemptionRes.data.redemptions || []).map((r) => ({
        id: r.id,
        type: 'redemption',
        name: (r.reward_name || `${formatCurrency(r.credit_amount)} Credit`).replace(/^(.+?)\s+(\$\d+)\s+(.+)$/, '$2 $1 $3'),
        category: r.reward_category || 'credit',
        credit_amount: r.credit_amount,
        points: r.points_redeemed,
        code: r.fulfillment_details,
        status: r.status === 'fulfilled' ? 'ready' : r.status === 'denied' ? 'denied' : 'processing',
        date: r.redeemed_at,
        denied_reason: r.denied_reason,
        admin_notes: r.admin_notes
      }));

      const cardRequests = (cardReqRes.data.requests || [])
        .map((r) => {
        let status = 'processing';
        if (r.status === 'fulfilled') status = 'ready';
        else if (r.status === 'approved') status = 'processing';
        else if (r.status === 'denied') status = 'denied';
        else if (r.status === 'quoted') status = 'quoted';
        else if (r.status === 'pending') status = 'pending';
        return {
          id: `cr-${r.id}`,
          raw_id: r.id,
          type: 'card_request',
          name: `Custom: ${r.brand_name}`,
          category: 'gift_card',
          credit_amount: r.credit_amount,
          points: r.points_deducted,
          points_cost: (r.credit_amount / 5) * 1000,
          code: r.delivery_code,
          status,
          date: r.created_at,
          denied_reason: r.admin_notes,
          admin_notes: r.admin_notes
        };
      });

      const merged = [...redemptions, ...cardRequests].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      setRedemptionItems(merged);
    } catch (err) {
      console.error('Failed to load redemptions', err);
    } finally {
      setRedemptionsLoading(false);
    }
  }, [client?.id]);

  useEffect(() => { fetchStoreData(); }, [fetchStoreData]);
  useEffect(() => { fetchRedemptions(); }, [fetchRedemptions]);

  const giftCards = rewards.filter((r) => {
    if (r.category !== 'gift_card') return false;
    if (activeSubcategory !== 'all' && r.subcategory !== activeSubcategory) return false;
    return true;
  });
  const serviceCredits = rewards.filter((r) => r.category === 'service_credit');
  const productCredits = rewards.filter((r) => r.category === 'product_credit');

  const refreshAfterRedeem = async () => {
    const loyaltyRes = await getLoyaltyStatus(client.id);
    setLoyalty(loyaltyRes.data);
    fetchRedemptions();
  };

  const handleGiftCardRedeem = async () => {
    if (!selectedGiftCard || !selectedAmount) return;
    setRedeemLoading(true);
    setRedeemError('');
    try {
      const { data } = await redeemPoints(client.id, selectedAmount.points, {
        reward_name: `$${selectedAmount.dollars} ${selectedGiftCard.brand} Gift Card`,
        reward_category: 'gift_card',
        delivery_method: 'email'
      });
      setRedeemSuccess(data);
      await refreshAfterRedeem();
    } catch (err) {
      setRedeemError(err.response?.data?.error?.message || 'Redemption failed. Please try again.');
    } finally {
      setRedeemLoading(false);
    }
  };

  const handleServiceCreditRedeem = async () => {
    const points = serviceCreditUnits * 1000;
    setServiceCreditLoading(true);
    setServiceCreditError('');
    try {
      const { data } = await redeemPoints(client.id, points, {
        reward_name: `Service Credit - $${serviceCreditUnits * 5}`,
        reward_category: 'service_credit',
        delivery_method: 'invoice_credit'
      });
      setServiceCreditSuccess(data);
      await refreshAfterRedeem();
    } catch (err) {
      setServiceCreditError(err.response?.data?.error?.message || 'Redemption failed. Please try again.');
    } finally {
      setServiceCreditLoading(false);
    }
  };

  const handleProductCreditRedeem = async () => {
    const points = productCreditUnits * 1000;
    setProductCreditLoading(true);
    setProductCreditError('');
    try {
      const { data } = await redeemPoints(client.id, points, {
        reward_name: `Product Credit - $${productCreditUnits * 5}`,
        reward_category: 'product_credit',
        delivery_method: 'email'
      });
      setProductCreditSuccess(data);
      await refreshAfterRedeem();
    } catch (err) {
      setProductCreditError(err.response?.data?.error?.message || 'Redemption failed. Please try again.');
    } finally {
      setProductCreditLoading(false);
    }
  };

  const [giftCardModalOpen, setGiftCardModalOpen] = useState(false);

  const openGiftCardModal = (card) => {
    setSelectedGiftCard(card);
    setSelectedAmount(null);
    setRedeemSuccess(null);
    setRedeemError('');
    setGiftCardModalOpen(true);
  };

  const closeGiftCardModal = () => {
    setGiftCardModalOpen(false);
  };

  const handleGiftCardModalExited = () => {
    setSelectedGiftCard(null);
    setSelectedAmount(null);
    setRedeemSuccess(null);
    setRedeemError('');
    setGiftCardConfirm(false);
  };

  const handleRequestCard = async () => {
    setRequestLoading(true);
    setRequestError('');
    try {
      const { data } = await createCardRequest(client.id, {
        brand_name: requestBrand,
        amount: Number(requestAmount)
      });
      setRequestSuccess(data);
    } catch (err) {
      setRequestError(err.response?.data?.error?.message || 'Request failed. Please try again.');
    } finally {
      setRequestLoading(false);
    }
  };

  const closeRequestModal = () => {
    setRequestCardOpen(false);
    setRequestBrand('');
    setRequestAmount('');
    setRequestSuccess(null);
    setRequestError('');
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setToast({ open: true, message: 'Code copied!', severity: 'success' });
    });
  };

  const handleConfirmCardRequest = async () => {
    if (!cardRequestConfirmItem) return;
    setConfirmingCardId(cardRequestConfirmItem.id);
    try {
      await confirmCardRequest(client.id, cardRequestConfirmItem.raw_id);
      setCardRequestConfirmItem(null);
      setToast({ open: true, message: 'Confirmed! Points redeemed successfully.', severity: 'success' });
      await refreshAfterRedeem();
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.error?.message || 'Failed to confirm', severity: 'error' });
    } finally {
      setConfirmingCardId(null);
    }
  };

  const handleDenyCardRequest = async () => {
    if (!cardRequestDenyItem) return;
    setCardRequestDenyLoading(true);
    try {
      await denyCardRequest(client.id, cardRequestDenyItem.raw_id, { reason: cardRequestDenyReason });
      setCardRequestDenyItem(null);
      setCardRequestDenyReason('');
      setToast({ open: true, message: 'Request declined.', severity: 'info' });
      await refreshAfterRedeem();
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.error?.message || 'Failed to decline', severity: 'error' });
    } finally {
      setCardRequestDenyLoading(false);
    }
  };

  const openDismissDialog = (item) => {
    setDismissData(item);
    setDismissConfirmStep(false);
    setDismissOpen(true);
  };

  const closeDismissDialog = () => {
    setDismissOpen(false);
  };

  const handleDismissRedemption = () => {
    const updated = [...dismissedIds, dismissData.id];
    setDismissedIds(updated);
    localStorage.setItem('dismissedRedemptions', JSON.stringify(updated));
    setDismissOpen(false);
    setToast({ open: true, message: 'Redemption removed from list', severity: 'success' });
  };

  const scrollToRedemptions = () => {
    redemptionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };



  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'gift_card': return 'Gift Card';
      case 'service_credit': return 'Service Credit';
      case 'product_credit': return 'Product Credit';
      default: return 'Credit';
    }
  };

  if (loading) return <LoadingSpinner message="Loading Rewards Store..." />;
  if (!loyalty) {
    return (
      <Box sx={{ p: 5, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ color: '#C1592E', mb: 2 }}>Unable to load Rewards</Typography>
        <Typography variant="body1" sx={{ color: '#5C6B5E', mb: 3 }}>Please try logging out and back in.</Typography>
        <Button variant="contained" onClick={() => { setLoading(true); fetchStoreData(); }}>Try Again</Button>
      </Box>
    );
  }

  const isBronze = loyalty.current_tier === 'bronze';
  const canRedeem = !isBronze && !isUnenrolled;
  const maxServiceUnits = Math.min(Math.floor((loyalty?.redeemable_points || 0) / 1000), 100);
  const minServiceUnits = 10;
  const visibleRedemptions = redemptionItems.filter((item) => !dismissedIds.includes(item.id));
  const redemptionCount = visibleRedemptions.length;

  return (
    <Box>
      {/* Hero */}
      <Box sx={{
        background: 'linear-gradient(145deg, #2A332B 0%, #3D4A3E 50%, #4A5A4C 100%)',
        px: { xs: 3, md: 5 }, py: { xs: 4, md: 5 }, position: 'relative', overflow: 'hidden'
      }}>
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(212, 149, 106, 0.06)', filter: 'blur(40px)' }} />
        <Typography variant="h2" sx={{ fontFamily: '"Outfit", sans-serif', color: '#EFEBE4', fontSize: { xs: '24px', sm: '28px', md: '28px' }, mb: 1, position: 'relative' }}>
          Redeem Rewards
        </Typography>
        <Typography sx={{ fontSize: '12px', letterSpacing: '2.5px', textTransform: 'uppercase', color: 'rgba(239, 235, 228, 0.5)' }}>
          Redeem Your Points
        </Typography>
      </Box>

      {/* Points Balance Bar */}
      <Box sx={{
        background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(61, 74, 62, 0.08)', px: { xs: 3, md: 5 }, py: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 1.5, position: 'sticky', top: 0, zIndex: 10
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body1" sx={{ fontWeight: 600, color: '#2D2D2D' }}>
            You have <span style={{ color: '#D4956A', fontWeight: 700 }}>{formatPoints(loyalty?.redeemable_points || 0)}</span> redeemable points
          </Typography>
          <TierBadge tier={loyalty?.current_tier} size="small" />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" sx={{ color: '#5C6B5E' }}>1,000 pts = $5.00</Typography>
          {redemptionCount > 0 && (
            <Button
              size="small"
              onClick={scrollToRedemptions}
              sx={{
                color: '#D4956A', textTransform: 'none', fontWeight: 600, fontSize: '13px',
                '&:hover': { backgroundColor: 'rgba(212, 149, 106, 0.08)' }
              }}
            >
              {redemptionCount} Reward{redemptionCount !== 1 ? 's' : ''} &darr;
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ px: { xs: 2, md: 5 }, py: { xs: 3, md: 4 } }}>

        {/* Unenrolled Banner */}
        {isUnenrolled && (
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            background: 'rgba(237, 108, 2, 0.08)',
            border: '1px solid rgba(237, 108, 2, 0.25)',
            borderRadius: '12px',
            px: 3, py: 2, mb: 3
          }}>
            <InfoOutlinedIcon sx={{ color: '#ed6c02', fontSize: 24, flexShrink: 0 }} />
            <Typography variant="body2" sx={{ color: '#2D2D2D' }}>
              Your account has been unenrolled. You can view your past redemptions below, but new redemptions are no longer available.
            </Typography>
          </Box>
        )}

        {/* Back Button (when drilled into a section) */}
        {activeSection && (
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => { setActiveSection(null); setActiveSubcategory('all'); }}
            sx={{
              mb: 3, color: '#5C6B5E', textTransform: 'none', fontWeight: 500, fontSize: '14px',
              '&:hover': { backgroundColor: 'rgba(61, 74, 62, 0.06)', color: '#3D4A3E' }
            }}
          >
            Back to Rewards
          </Button>
        )}

        {/* ===== LANDING VIEW — 3 Reward Type Cards ===== */}
        {!activeSection && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Service Credit */}
            <Grid item xs={12} sm={6} md={4}>
              <Box
                sx={{
                  ...frostedCardSx,
                  p: { xs: 3, md: 4 },
                  cursor: canRedeem ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                  '&:hover': canRedeem ? { boxShadow: '0 6px 30px rgba(0,0,0,0.1)', transform: 'translateY(-2px)' } : {}
                }}
                onClick={() => !isBronze && setActiveSection('service_credit')}
              >
                {isBronze && (
                  <Box sx={{
                    position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 5, borderRadius: '16px'
                  }}>
                    <LockOutlinedIcon sx={{ fontSize: 48, color: '#5C6B5E', mb: 1 }} />
                    <Typography variant="h6" sx={{ color: '#3D4A3E', fontWeight: 600 }}>Reach Silver Tier</Typography>
                    <Typography variant="body2" sx={{ color: '#5C6B5E' }}>to start redeeming</Typography>
                  </Box>
                )}
                <Box sx={{
                  width: 56, height: 56, borderRadius: '14px',
                  background: 'linear-gradient(135deg, #3D4A3E, #5A8A7A)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5
                }}>
                  <MedicalServicesOutlinedIcon sx={{ fontSize: 28, color: '#EFEBE4' }} />
                </Box>
                <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D', mb: 1, fontWeight: 600 }}>
                  Service Credit
                </Typography>
                <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 3, lineHeight: 1.6 }}>
                  Credit applied directly to your next <strong>Care Package</strong> invoice.
                </Typography>
                <Button
                  variant="contained" fullWidth
                  disabled={isBronze}
                  onClick={(e) => { e.stopPropagation(); setActiveSection('service_credit'); }}
                  sx={{ py: 1.3 }}
                >
                  Redeem
                </Button>
              </Box>
            </Grid>

            {/* Product Credit */}
            <Grid item xs={12} sm={6} md={4}>
              <Box
                sx={{
                  ...frostedCardSx,
                  p: { xs: 3, md: 4 },
                  cursor: canRedeem ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                  '&:hover': canRedeem ? { boxShadow: '0 6px 30px rgba(0,0,0,0.1)', transform: 'translateY(-2px)' } : {}
                }}
                onClick={() => !isBronze && setActiveSection('product_credit')}
              >
                {isBronze && (
                  <Box sx={{
                    position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 5, borderRadius: '16px'
                  }}>
                    <LockOutlinedIcon sx={{ fontSize: 48, color: '#5C6B5E', mb: 1 }} />
                    <Typography variant="h6" sx={{ color: '#3D4A3E', fontWeight: 600 }}>Reach Silver Tier</Typography>
                    <Typography variant="body2" sx={{ color: '#5C6B5E' }}>to start redeeming</Typography>
                  </Box>
                )}
                <Box sx={{
                  width: 56, height: 56, borderRadius: '14px',
                  background: 'linear-gradient(135deg, #3D4A3E, #D4956A)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5
                }}>
                  <ShoppingBagOutlinedIcon sx={{ fontSize: 28, color: '#EFEBE4' }} />
                </Box>
                <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D', mb: 1, fontWeight: 600 }}>
                  Product Credit
                </Typography>
                <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 3, lineHeight: 1.6 }}>
                  Gift codes for NoorVana Plus products.
                </Typography>
                <Button
                  variant="contained" fullWidth
                  disabled={isBronze}
                  onClick={(e) => { e.stopPropagation(); setActiveSection('product_credit'); }}
                  sx={{ py: 1.3 }}
                >
                  Redeem
                </Button>
              </Box>
            </Grid>

            {/* Gift Cards */}
            <Grid item xs={12} sm={6} md={4}>
              <Box
                sx={{
                  ...frostedCardSx,
                  p: { xs: 3, md: 4 },
                  cursor: canRedeem ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                  '&:hover': canRedeem ? { boxShadow: '0 6px 30px rgba(0,0,0,0.1)', transform: 'translateY(-2px)' } : {}
                }}
                onClick={() => !isBronze && setActiveSection('gift_card')}
              >
                {isBronze && (
                  <Box sx={{
                    position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 5, borderRadius: '16px'
                  }}>
                    <LockOutlinedIcon sx={{ fontSize: 48, color: '#5C6B5E', mb: 1 }} />
                    <Typography variant="h6" sx={{ color: '#3D4A3E', fontWeight: 600 }}>Reach Silver Tier</Typography>
                    <Typography variant="body2" sx={{ color: '#5C6B5E' }}>to start redeeming</Typography>
                  </Box>
                )}
                <Box sx={{
                  width: 56, height: 56, borderRadius: '14px',
                  background: 'linear-gradient(135deg, #6C63FF, #D4956A)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5
                }}>
                  <StorefrontOutlinedIcon sx={{ fontSize: 28, color: '#EFEBE4' }} />
                </Box>
                <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D', mb: 1, fontWeight: 600 }}>
                  Gift Cards
                </Typography>
                <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 3, lineHeight: 1.6 }}>
                  Choose from {rewards.filter(r => r.category === 'gift_card').length}+ brands across shopping, dining, travel & more.
                </Typography>
                <Button
                  variant="contained" fullWidth
                  disabled={isBronze}
                  onClick={(e) => { e.stopPropagation(); setActiveSection('gift_card'); }}
                  sx={{ py: 1.3 }}
                >
                  Browse
                </Button>
              </Box>
            </Grid>
          </Grid>
        )}

        {/* ===== SERVICE CREDITS SECTION ===== */}
        {activeSection === 'service_credit' && serviceCredits.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Box sx={{
              ...frostedCardSx,
              borderRadius: '12px',
              p: { xs: 3, md: 4 }
            }}>
              {isBronze && (
                <Box sx={{
                  position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 5, borderRadius: '12px'
                }}>
                  <LockOutlinedIcon sx={{ fontSize: 48, color: '#5C6B5E', mb: 1 }} />
                  <Typography variant="h6" sx={{ color: '#3D4A3E', fontWeight: 600 }}>Reach Silver Tier</Typography>
                  <Typography variant="body2" sx={{ color: '#5C6B5E' }}>to start redeeming</Typography>
                </Box>
              )}
              <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', mb: 1, color: '#2D2D2D' }}>Service Credit</Typography>
              <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 3 }}>Credit applied directly to your next <strong>Care Package</strong> invoice.</Typography>

              {serviceCreditSuccess ? (
                <Fade in timeout={500}>
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <HourglassEmptyIcon sx={{ fontSize: 56, color: '#D4956A', mb: 1 }} />
                    <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D', mb: 1 }}>Request Submitted!</Typography>
                    <Typography variant="body1" sx={{ color: '#5C6B5E', mb: 2 }}>
                      {formatPoints(serviceCreditSuccess.points_redeemed)} points redeemed for {formatCurrency(serviceCreditSuccess.credit_amount)} credit
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#2D2D2D', mb: 2 }}>
                      Credit applied directly to your next <strong>Care Package</strong> invoice.
                    </Typography>
                    <Box><Button variant="outlined" onClick={() => setServiceCreditSuccess(null)} sx={{ mt: 1 }}>Redeem More</Button></Box>
                  </Box>
                </Fade>
              ) : (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Slider
                        value={serviceCreditUnits} min={minServiceUnits} max={Math.max(minServiceUnits, maxServiceUnits)} step={10}
                        disabled={!canRedeem || maxServiceUnits < minServiceUnits}
                        onChange={(_, val) => setServiceCreditUnits(val)}
                        sx={{ color: '#3D4A3E', '& .MuiSlider-thumb': { backgroundColor: '#3D4A3E' }, '& .MuiSlider-track': { background: 'linear-gradient(90deg, #3D4A3E, #D4956A)' } }}
                      />
                    </Box>
                    <Box sx={{ textAlign: 'center', minWidth: 120 }}>
                      <Typography variant="h4" sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D' }}>{formatPoints(serviceCreditUnits * 1000)}</Typography>
                      <Typography variant="caption" sx={{ color: '#5C6B5E' }}>points</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ background: 'rgba(61, 74, 62, 0.06)', borderRadius: '12px', p: 2, textAlign: 'center', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#5C6B5E', mb: 0.5 }}>CREDIT AMOUNT</Typography>
                    <Typography variant="h3" sx={{ fontFamily: '"Outfit", sans-serif', color: '#5A8A7A', fontWeight: 600 }}>{formatCurrency(serviceCreditUnits * 5)}</Typography>
                    <Typography variant="caption" sx={{ color: '#5C6B5E' }}>{formatPoints(serviceCreditUnits * 1000)} points = {formatCurrency(serviceCreditUnits * 5)}</Typography>
                  </Box>
                  {serviceCreditError && (
                    <Typography variant="body2" sx={{ color: '#C1592E', textAlign: 'center', mb: 2, p: 1.5, backgroundColor: 'rgba(193, 89, 46, 0.08)', borderRadius: '8px' }}>{serviceCreditError}</Typography>
                  )}
                  <Button variant="contained" fullWidth onClick={() => setServiceCreditConfirm(true)} disabled={serviceCreditLoading || !canRedeem || maxServiceUnits < minServiceUnits} sx={{ py: 1.5 }}>
                    Redeem Now
                  </Button>
                </>
              )}
            </Box>
          </Box>
        )}

        {/* ===== PRODUCT CREDITS SECTION ===== */}
        {activeSection === 'product_credit' && productCredits.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Box sx={{
              ...frostedCardSx,
              borderRadius: '12px',
              p: { xs: 3, md: 4 }
            }}>
              {isBronze && (
                <Box sx={{
                  position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 5, borderRadius: '12px'
                }}>
                  <LockOutlinedIcon sx={{ fontSize: 48, color: '#5C6B5E', mb: 1 }} />
                  <Typography variant="h6" sx={{ color: '#3D4A3E', fontWeight: 600 }}>Reach Silver Tier</Typography>
                  <Typography variant="body2" sx={{ color: '#5C6B5E' }}>to start redeeming</Typography>
                </Box>
              )}
              <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', mb: 1, color: '#2D2D2D' }}>Product Credits</Typography>
              <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 3 }}>Gift code for NoorVana Plus products, delivered directly to your redemptions list.</Typography>

              {productCreditSuccess ? (
                <Fade in timeout={500}>
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <HourglassEmptyIcon sx={{ fontSize: 56, color: '#D4956A', mb: 1 }} />
                    <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D', mb: 1 }}>Request Submitted!</Typography>
                    <Typography variant="body1" sx={{ color: '#5C6B5E', mb: 2 }}>
                      {formatPoints(productCreditSuccess.points_redeemed)} points redeemed for {formatCurrency(productCreditSuccess.credit_amount)} product credit
                    </Typography>
                    <Box><Button variant="outlined" onClick={() => setProductCreditSuccess(null)} sx={{ mt: 1 }}>Redeem More</Button></Box>
                  </Box>
                </Fade>
              ) : (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Slider
                        value={productCreditUnits} min={minServiceUnits} max={Math.max(minServiceUnits, maxServiceUnits)} step={10}
                        disabled={!canRedeem || maxServiceUnits < minServiceUnits}
                        onChange={(_, val) => setProductCreditUnits(val)}
                        sx={{ color: '#3D4A3E', '& .MuiSlider-thumb': { backgroundColor: '#3D4A3E' }, '& .MuiSlider-track': { background: 'linear-gradient(90deg, #3D4A3E, #D4956A)' } }}
                      />
                    </Box>
                    <Box sx={{ textAlign: 'center', minWidth: 120 }}>
                      <Typography variant="h4" sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D' }}>{formatPoints(productCreditUnits * 1000)}</Typography>
                      <Typography variant="caption" sx={{ color: '#5C6B5E' }}>points</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ background: 'rgba(61, 74, 62, 0.06)', borderRadius: '12px', p: 2, textAlign: 'center', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#5C6B5E', mb: 0.5 }}>CREDIT AMOUNT</Typography>
                    <Typography variant="h3" sx={{ fontFamily: '"Outfit", sans-serif', color: '#5A8A7A', fontWeight: 600 }}>{formatCurrency(productCreditUnits * 5)}</Typography>
                    <Typography variant="caption" sx={{ color: '#5C6B5E' }}>{formatPoints(productCreditUnits * 1000)} points = {formatCurrency(productCreditUnits * 5)}</Typography>
                  </Box>
                  {productCreditError && (
                    <Typography variant="body2" sx={{ color: '#C1592E', textAlign: 'center', mb: 2, p: 1.5, backgroundColor: 'rgba(193, 89, 46, 0.08)', borderRadius: '8px' }}>{productCreditError}</Typography>
                  )}
                  <Button variant="contained" fullWidth onClick={() => setProductCreditConfirm(true)} disabled={productCreditLoading || !canRedeem || maxServiceUnits < minServiceUnits} sx={{ py: 1.5 }}>
                    Redeem Now
                  </Button>
                </>
              )}
            </Box>
          </Box>
        )}

        {/* ===== GIFT CARDS SECTION ===== */}
        {activeSection === 'gift_card' && (
          <Box sx={{ mb: 4 }}>
            {/* Subcategory filter chips */}
            <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
              {SUBCATEGORIES.map((sub) => (
                <Chip key={sub.key} label={sub.label} size="small"
                  onClick={() => setActiveSubcategory(sub.key)}
                  sx={{
                    fontSize: '12px', fontWeight: 500, borderRadius: '16px',
                    backgroundColor: activeSubcategory === sub.key ? '#3D4A3E' : 'rgba(61, 74, 62, 0.06)',
                    color: activeSubcategory === sub.key ? '#EFEBE4' : '#5C6B5E',
                    '&:hover': { backgroundColor: activeSubcategory === sub.key ? '#2A332B' : 'rgba(61, 74, 62, 0.12)' }
                  }}
                />
              ))}
            </Box>

            <Grid container spacing={2.5}>
              {giftCards.map((card) => (
                <Grid item xs={12} sm={6} md={4} key={card.id}>
                  <Box sx={{
                    background: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: '12px', p: 3,
                    boxShadow: '0 2px 20px rgba(0,0,0,0.06)', transition: 'all 0.3s ease',
                    position: 'relative', overflow: 'hidden',
                    '&:hover': { boxShadow: '0 4px 30px rgba(0,0,0,0.1)', transform: canRedeem ? 'translateY(-2px)' : 'none' }
                  }}>
                    {isBronze && (
                      <Box sx={{
                        position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 5, borderRadius: '12px'
                      }}>
                        <LockOutlinedIcon sx={{ fontSize: 36, color: '#5C6B5E', mb: 0.5 }} />
                        <Typography variant="body2" sx={{ color: '#3D4A3E', fontWeight: 600 }}>Reach Silver</Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <LogoAvatar brand={card.brand} logoUrl={card.logo_url} size={48} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#2D2D2D', lineHeight: 1.3 }}>{card.brand}</Typography>
                        <Chip
                          label={SUBCAT_LABELS[card.subcategory] || card.subcategory}
                          size="small"
                          sx={{
                            mt: 0.5, height: 20, fontSize: '10px', fontWeight: 600,
                            backgroundColor: `${SUBCAT_COLORS[card.subcategory] || '#5C6B5E'}15`,
                            color: SUBCAT_COLORS[card.subcategory] || '#5C6B5E'
                          }}
                        />
                      </Box>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#5C6B5E', display: 'block', mb: 2, lineHeight: 1.4 }}>
                      {BRAND_DESCRIPTIONS[card.brand] || card.brand}
                    </Typography>
                    <Button variant="contained" fullWidth size="small"
                      onClick={() => openGiftCardModal(card)}
                      disabled={!canRedeem} sx={{ py: 1 }}>
                      Select
                    </Button>
                  </Box>
                </Grid>
              ))}

              {/* Request a Card */}
              <Grid item xs={12} sm={6} md={4}>
                <Box sx={{
                  background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(10px)',
                  border: '2px dashed rgba(61, 74, 62, 0.2)', borderRadius: '12px', p: 3,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  minHeight: 180, textAlign: 'center', transition: 'all 0.3s ease', cursor: 'pointer',
                  '&:hover': { borderColor: '#D4956A', background: 'rgba(212, 149, 106, 0.04)' }
                }}
                  onClick={() => setRequestCardOpen(true)}
                >
                  <AddCircleOutlineIcon sx={{ fontSize: 40, color: '#D4956A', mb: 1 }} />
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#3D4A3E', mb: 0.5 }}>Request a Card</Typography>
                  <Typography variant="caption" sx={{ color: '#5C6B5E' }}>
                    Don't see your favorite brand? Let us know and we'll see what we can do!
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ========== YOUR REDEMPTIONS SECTION ========== */}
        {!activeSection && <Box sx={{ mt: 2 }} ref={redemptionsRef}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <CardGiftcardOutlinedIcon sx={{ color: '#D4956A', fontSize: 28 }} />
            <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D' }}>
              Your Redemptions
            </Typography>
          </Box>

          {redemptionsLoading ? (
            <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={32} sx={{ color: '#3D4A3E' }} />
            </Box>
          ) : visibleRedemptions.length === 0 ? (
            <Box sx={{
              ...frostedCardSx,
              py: 6, textAlign: 'center'
            }}>
              <CardGiftcardOutlinedIcon sx={{ fontSize: 48, color: '#9CA89E', mb: 1 }} />
              <Typography variant="h6" sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D', mb: 0.5 }}>
                No redemptions yet
              </Typography>
              <Typography variant="body2" sx={{ color: '#5C6B5E' }}>
                Redeem your points above and your rewards will appear here.
              </Typography>
            </Box>
          ) : (
            visibleRedemptions.map((item) => {
              const statusConfig = {
                ready: { label: 'Complete', color: '#5A8A7A', bg: 'rgba(90, 138, 122, 0.1)' },
                processing: { label: 'Processing', color: '#D4956A', bg: 'rgba(212, 149, 106, 0.1)' },
                pending: { label: 'Pending Review', color: '#D4956A', bg: 'rgba(212, 149, 106, 0.1)' },
                quoted: { label: 'Action Required', color: '#7B1FA2', bg: 'rgba(123, 31, 162, 0.1)' },
                denied: { label: 'Cancelled', color: '#C1592E', bg: 'rgba(193, 89, 46, 0.1)' }
              };
              const sc = statusConfig[item.status] || statusConfig.processing;

              return (
                <Fade in timeout={300} key={item.id}>
                  <Box sx={{ ...frostedCardSx, mb: 2, p: 0, overflow: 'hidden' }}>
                    {/* Top bar: name + status */}
                    <Box sx={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      px: { xs: 2.5, md: 3 }, py: 1.5,
                      borderBottom: '1px solid rgba(61, 74, 62, 0.08)',
                      background: 'rgba(61, 74, 62, 0.02)'
                    }}>
                      <Typography sx={{ fontWeight: 600, color: '#2D2D2D', fontFamily: '"Outfit", sans-serif', fontSize: '15px' }}>
                        {item.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={sc.label}
                          size="small"
                          sx={{ backgroundColor: sc.bg, color: sc.color, fontWeight: 600, fontSize: '12px', px: 0.5 }}
                        />
                        {(item.status === 'ready' || item.status === 'denied') && (
                          <IconButton size="small" onClick={() => openDismissDialog(item)}
                            sx={{ color: '#9CA89E', p: 0.5, '&:hover': { color: '#C1592E', backgroundColor: 'rgba(193, 89, 46, 0.08)' } }}>
                            <CloseIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        )}
                      </Box>
                    </Box>

                    {/* Info grid */}
                    <Box sx={{
                      display: 'grid',
                      gridTemplateColumns: item.points > 0 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                      borderBottom: '1px solid rgba(61, 74, 62, 0.08)',
                    }}>
                      <Box sx={{ px: { xs: 2.5, md: 3 }, py: 1.5, borderRight: '1px solid rgba(61, 74, 62, 0.08)' }}>
                        <Typography variant="caption" sx={{ color: '#9CA89E', fontWeight: 600, letterSpacing: '0.5px', display: 'block', mb: 0.25 }}>DATE</Typography>
                        <Typography variant="body2" sx={{ color: '#2D2D2D', fontWeight: 500 }}>{formatShortDate(item.date)}</Typography>
                      </Box>
                      <Box sx={{ px: { xs: 2.5, md: 3 }, py: 1.5, borderRight: item.points > 0 ? '1px solid rgba(61, 74, 62, 0.08)' : 'none' }}>
                        <Typography variant="caption" sx={{ color: '#9CA89E', fontWeight: 600, letterSpacing: '0.5px', display: 'block', mb: 0.25 }}>CREDIT</Typography>
                        <Typography variant="body2" sx={{ color: '#5A8A7A', fontWeight: 600 }}>{formatCurrency(item.credit_amount)}</Typography>
                      </Box>
                      {item.points > 0 && (
                        <Box sx={{ px: { xs: 2.5, md: 3 }, py: 1.5 }}>
                          <Typography variant="caption" sx={{ color: '#9CA89E', fontWeight: 600, letterSpacing: '0.5px', display: 'block', mb: 0.25 }}>POINTS</Typography>
                          <Typography variant="body2" sx={{ color: '#2D2D2D', fontWeight: 500 }}>{formatPoints(item.points)}</Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Status content */}
                    <Box sx={{ px: { xs: 2.5, md: 3 }, py: 2 }}>
                      {/* Ready — service credit */}
                      {item.status === 'ready' && item.category === 'service_credit' && (
                        <Typography variant="body2" sx={{ color: '#4A5A4C' }}>
                          Your service credit has been applied, if you have any questions please feel free to contact us at <strong>support@noorvanacare.com</strong>. Thank you for being a valued customer.
                        </Typography>
                      )}

                      {/* Code display — Ready (non-service credit) */}
                      {item.status === 'ready' && item.category !== 'service_credit' && item.code && (
                        <Box>
                          <Box sx={{
                            background: 'rgba(90, 138, 122, 0.06)', border: '1px solid rgba(90, 138, 122, 0.15)',
                            borderRadius: '10px', px: 2.5, py: 2,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            mb: 1.5
                          }}>
                            <Box>
                              <Typography variant="caption" sx={{ color: '#9CA89E', fontWeight: 600, letterSpacing: '0.5px', display: 'block', mb: 0.25 }}>YOUR CODE</Typography>
                              <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#3D4A3E', letterSpacing: '2px', fontSize: { xs: '16px', md: '20px' } }}>
                                {item.code}
                              </Typography>
                            </Box>
                            <Tooltip title="Copy code">
                              <IconButton onClick={() => handleCopyCode(item.code)}
                                sx={{ color: '#5C6B5E', '&:hover': { color: '#D4956A', backgroundColor: 'rgba(212, 149, 106, 0.1)' } }}>
                                <ContentCopyIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                          {item.admin_notes && (
                            <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                              <Typography variant="caption" sx={{ color: '#9CA89E', fontWeight: 600, letterSpacing: '0.5px', whiteSpace: 'nowrap', mt: '2px' }}>NOTE</Typography>
                              <Typography variant="body2" sx={{ color: '#5C6B5E', fontStyle: 'italic' }}>{item.admin_notes}</Typography>
                            </Box>
                          )}
                          {item.category === 'gift_card' && (
                            <Typography variant="body2" sx={{ color: '#4A5A4C' }}>
                              Your {item.name?.replace(/^Custom:\s*/, '')} code is ready to use. If you have any issues with your code, please contact us at <strong>support@noorvanacare.com</strong>. Thank you for being a valued NoorVana customer.
                            </Typography>
                          )}
                          {item.category === 'product_credit' && (
                            <Typography variant="body2" sx={{ color: '#4A5A4C' }}>
                              Your code is ready to use on the NoorVana Plus website. If you have any questions please feel free to contact us at <strong>support@noorvanacare.com</strong>. Thank you for being a valued customer.
                            </Typography>
                          )}
                        </Box>
                      )}

                      {/* Ready — no code, non-service credit */}
                      {item.status === 'ready' && item.category !== 'service_credit' && !item.code && (
                        <Box>
                          {item.category === 'gift_card' && (
                            <Typography variant="body2" sx={{ color: '#4A5A4C' }}>
                              Your {item.name?.replace(/^Custom:\s*/, '')} code is ready to use. If you have any issues with your code, please contact us at <strong>support@noorvanacare.com</strong>. Thank you for being a valued NoorVana customer.
                            </Typography>
                          )}
                          {item.category === 'product_credit' && (
                            <Typography variant="body2" sx={{ color: '#4A5A4C' }}>
                              Your code is ready to use on the NoorVana Plus website. If you have any questions please feel free to contact us at <strong>support@noorvanacare.com</strong>. Thank you for being a valued customer.
                            </Typography>
                          )}
                          {item.category !== 'gift_card' && item.category !== 'product_credit' && (
                            <Typography variant="body2" sx={{ color: '#5A8A7A' }}>Your credit has been applied.</Typography>
                          )}
                        </Box>
                      )}

                      {/* Quoted — awaiting client confirmation */}
                      {item.status === 'quoted' && (
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#2D2D2D', mb: 0.5 }}>
                            Your request has been approved. Please confirm or deny.
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 1.5 }}>
                            {formatPoints(item.points_cost)} points will be deducted upon confirmation.
                          </Typography>
                          {item.admin_notes && (
                            <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 1.5, fontStyle: 'italic' }}>{item.admin_notes}</Typography>
                          )}
                          <Box sx={{ display: 'flex', gap: 1.5 }}>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => setCardRequestConfirmItem(item)}
                              sx={{
                                background: 'linear-gradient(135deg, #5A8A7A, #4A7A6A)',
                                textTransform: 'none', fontWeight: 600, borderRadius: '8px',
                                px: 3, py: 0.8, fontSize: '13px',
                                '&:hover': { background: 'linear-gradient(135deg, #4A7A6A, #3A6A5A)' }
                              }}
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => { setCardRequestDenyItem(item); setCardRequestDenyReason(''); }}
                              sx={{
                                textTransform: 'none', fontWeight: 600, borderRadius: '8px',
                                px: 3, py: 0.8, fontSize: '13px',
                                borderColor: '#C1592E', color: '#C1592E',
                                '&:hover': { borderColor: '#A0452A', backgroundColor: 'rgba(193, 89, 46, 0.04)' }
                              }}
                            >
                              Deny
                            </Button>
                          </Box>
                        </Box>
                      )}

                      {/* Pending review message */}
                      {item.status === 'pending' && (
                        <Typography variant="body2" sx={{ color: '#4A5A4C' }}>
                          Your request has been submitted and is awaiting review by the NoorVana Team.
                        </Typography>
                      )}

                      {/* Processing message */}
                      {item.status === 'processing' && (
                        <Typography variant="body2" sx={{ color: '#4A5A4C' }}>
                          Your request has been received and is being processed by the NoorVana Team.
                        </Typography>
                      )}

                      {/* Denied message */}
                      {item.status === 'denied' && (
                        <Box>
                          <Typography variant="body2" sx={{ color: '#C1592E' }}>
                            Our team has cancelled your request, your points have been refunded to your account balance.
                          </Typography>
                          {item.denied_reason && (
                            <Typography variant="body2" sx={{ color: '#5C6B5E', mt: 0.5, fontStyle: 'italic' }}>
                              Reason: {item.denied_reason}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Fade>
              );
            })
          )}
        </Box>}
      </Box>

      {/* Gift Card Amount Selection Modal */}
      <Dialog open={giftCardModalOpen} onClose={closeGiftCardModal} maxWidth="sm" fullWidth
        TransitionProps={{ onExited: handleGiftCardModalExited }}
        PaperProps={{ sx: { background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(20px)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.4)', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' } }}
        slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(61, 74, 62, 0.6)', backdropFilter: 'blur(4px)' } } }}>
        <DialogContent sx={{ p: { xs: 3, md: 4 }, position: 'relative' }}>
          <IconButton onClick={closeGiftCardModal} sx={{ position: 'absolute', top: 12, right: 12, color: '#5C6B5E' }}>
            <CloseIcon />
          </IconButton>
          {redeemSuccess ? (
            <Fade in timeout={500}>
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <HourglassEmptyIcon sx={{ fontSize: 72, color: '#D4956A', mb: 2 }} />
                <Typography variant="h4" sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D', mb: 1 }}>Request Submitted!</Typography>
                <Typography variant="body1" sx={{ color: '#5C6B5E', mb: 1 }}>
                  {selectedGiftCard?.brand} {formatCurrency(redeemSuccess.credit_amount)} gift card
                </Typography>
                <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 2 }}>Remaining points: {formatPoints(redeemSuccess.remaining_redeemable_points)}</Typography>
                <Button variant="contained" onClick={closeGiftCardModal} sx={{ minWidth: 160 }}>Done</Button>
              </Box>
            </Fade>
          ) : (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, pr: 4 }}>
                <LogoAvatar brand={selectedGiftCard?.brand} logoUrl={selectedGiftCard?.logo_url} size={56} />
                <Box>
                  <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D' }}>{selectedGiftCard?.brand} Gift Card</Typography>
                  <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Select an amount</Typography>
                </Box>
              </Box>
              <Grid container spacing={1.5} sx={{ mb: 3 }}>
                {GIFT_CARD_AMOUNTS.map((amt) => {
                  const isSelected = selectedAmount?.points === amt.points;
                  const hasEnough = (loyalty?.redeemable_points || 0) >= amt.points;
                  return (
                    <Grid item xs={4} sm={3} key={amt.points}>
                      <Button fullWidth variant={isSelected ? 'contained' : 'outlined'}
                        onClick={() => setSelectedAmount(amt)} disabled={!hasEnough}
                        sx={{
                          py: 1, px: 0.5, borderRadius: '10px', flexDirection: 'column', minWidth: 0,
                          ...(isSelected ? { backgroundColor: '#3D4A3E', '&:hover': { backgroundColor: '#2A332B' } }
                            : { borderColor: 'rgba(61, 74, 62, 0.2)', '&:hover': { borderColor: '#3D4A3E' } })
                        }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '14px', lineHeight: 1.3 }}>${amt.dollars}</Typography>
                        <Typography sx={{ opacity: 0.7, fontSize: '10px', lineHeight: 1.2 }}>{formatPoints(amt.points)} pts</Typography>
                      </Button>
                    </Grid>
                  );
                })}
              </Grid>
              <Typography variant="caption" sx={{ color: '#5C6B5E', display: 'block', textAlign: 'center', mb: 2 }}>
                Code delivered to your redemptions list
              </Typography>
              {redeemError && (
                <Typography variant="body2" sx={{ color: '#C1592E', textAlign: 'center', mb: 2, p: 1.5, backgroundColor: 'rgba(193, 89, 46, 0.08)', borderRadius: '8px' }}>{redeemError}</Typography>
              )}
              <Button variant="contained" fullWidth onClick={() => setGiftCardConfirm(true)} disabled={!selectedAmount || redeemLoading} sx={{ py: 1.5 }}>
                {selectedAmount ? `Redeem ${formatPoints(selectedAmount.points)} Points for $${selectedAmount.dollars}` : 'Select an Amount'}
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Request a Card Modal */}
      <Dialog open={requestCardOpen} onClose={closeRequestModal} maxWidth="sm" fullWidth
        PaperProps={{ sx: { background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(20px)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.4)', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' } }}
        slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(61, 74, 62, 0.6)', backdropFilter: 'blur(4px)' } } }}>
        <DialogContent sx={{ p: { xs: 3, md: 4 }, position: 'relative' }}>
          <IconButton onClick={closeRequestModal} sx={{ position: 'absolute', top: 12, right: 12, color: '#5C6B5E' }}>
            <CloseIcon />
          </IconButton>
          {requestSuccess ? (
            <Fade in timeout={500}>
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <HourglassEmptyIcon sx={{ fontSize: 72, color: '#D4956A', mb: 2 }} />
                <Typography variant="h4" sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D', mb: 1 }}>Request Submitted!</Typography>
                <Typography variant="body1" sx={{ color: '#5C6B5E', mb: 1 }}>
                  {requestBrand} {formatCurrency(requestSuccess.credit_amount)} gift card
                </Typography>
                <Typography variant="body2" sx={{ color: '#2D2D2D', mb: 3 }}>
                  We'll review your request and get back to you.<br />No points are charged until you confirm.
                </Typography>
                <Button variant="contained" onClick={closeRequestModal} sx={{ minWidth: 160 }}>Done</Button>
              </Box>
            </Fade>
          ) : (
            <Box>
              <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D', mb: 1, pr: 4 }}>Request a Gift Card</Typography>
              <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 3 }}>
                Looking for a different brand? We'll do our best to make it happen.
              </Typography>
              <TextField fullWidth label="Company Name" value={requestBrand}
                onChange={(e) => setRequestBrand(e.target.value)}
                placeholder="e.g., Starbucks, Target, Amazon"
                sx={{ mb: 2 }} />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Amount</InputLabel>
                <Select value={requestAmount} label="Amount"
                  onChange={(e) => setRequestAmount(e.target.value)}>
                  {GIFT_CARD_AMOUNTS.map((amt) => (
                    <MenuItem key={amt.dollars} value={amt.dollars} disabled={(loyalty?.redeemable_points || 0) < amt.points}>
                      ${amt.dollars} ({formatPoints(amt.points)} pts)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {requestError && (
                <Typography variant="body2" sx={{ color: '#C1592E', textAlign: 'center', mb: 2, p: 1.5, backgroundColor: 'rgba(193, 89, 46, 0.08)', borderRadius: '8px' }}>{requestError}</Typography>
              )}
              <Typography variant="caption" sx={{ color: '#5C6B5E', display: 'block', textAlign: 'center', mb: 2 }}>
                Points will be held until you confirm after we review.
              </Typography>
              <Button variant="contained" fullWidth onClick={handleRequestCard}
                disabled={!requestBrand.trim() || !requestAmount || !canRedeem || requestLoading} sx={{ py: 1.5 }}>
                {requestLoading ? <CircularProgress size={22} sx={{ color: '#FFF' }} /> : canRedeem ? 'Submit Request' : 'Reach Silver'}
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Gift Card Confirmation Dialog */}
      <Dialog open={giftCardConfirm} onClose={() => setGiftCardConfirm(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden' } }}
        slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(61, 74, 62, 0.6)', backdropFilter: 'blur(4px)' } } }}>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ background: 'linear-gradient(145deg, #2A332B, #3D4A3E)', px: 4, py: 3, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', color: '#EFEBE4', mb: 0.5 }}>
              Confirm Redemption
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(239, 235, 228, 0.6)' }}>
              Please review the details below
            </Typography>
          </Box>
          <Box sx={{ px: 4, py: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <LogoAvatar brand={selectedGiftCard?.brand} logoUrl={selectedGiftCard?.logo_url} size={48} />
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#2D2D2D' }}>{selectedGiftCard?.brand} Gift Card</Typography>
                <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Code delivered to your redemptions list</Typography>
              </Box>
            </Box>
            <Box sx={{ background: 'rgba(61, 74, 62, 0.04)', borderRadius: '12px', p: 2.5, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Card Value</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#2D2D2D' }}>{selectedAmount ? formatCurrency(selectedAmount.dollars) : ''}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Points to Deduct</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#C1592E' }}>-{selectedAmount ? formatPoints(selectedAmount.points) : ''}</Typography>
              </Box>
              <Box sx={{ borderTop: '1px solid rgba(61, 74, 62, 0.1)', pt: 1.5, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Remaining Balance</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#2D2D2D' }}>
                  {selectedAmount ? formatPoints((loyalty?.redeemable_points || 0) - selectedAmount.points) : ''} pts
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" fullWidth onClick={() => setGiftCardConfirm(false)}
                sx={{ py: 1.3, borderColor: 'rgba(61, 74, 62, 0.2)', color: '#5C6B5E' }}>
                Cancel
              </Button>
              <Button variant="contained" fullWidth onClick={() => { setGiftCardConfirm(false); handleGiftCardRedeem(); }}
                disabled={redeemLoading} sx={{ py: 1.3 }}>
                {redeemLoading ? <CircularProgress size={22} sx={{ color: '#FFF' }} /> : 'Confirm'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Service Credit Confirmation Dialog */}
      <Dialog open={serviceCreditConfirm} onClose={() => setServiceCreditConfirm(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden' } }}
        slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(61, 74, 62, 0.6)', backdropFilter: 'blur(4px)' } } }}>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ background: 'linear-gradient(145deg, #2A332B, #3D4A3E)', px: 4, py: 3, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', color: '#EFEBE4', mb: 0.5 }}>
              Confirm Redemption
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(239, 235, 228, 0.6)' }}>
              Please review the details below
            </Typography>
          </Box>
          <Box sx={{ px: 4, py: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#2D2D2D', mb: 0.5 }}>Service Credit</Typography>
              <Typography variant="body2" sx={{ color: '#5C6B5E', whiteSpace: 'nowrap' }}>Credit applied directly to your next <strong>Care Package</strong> invoice.</Typography>
            </Box>
            <Box sx={{ background: 'rgba(61, 74, 62, 0.04)', borderRadius: '12px', p: 2.5, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Credit Amount</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#5A8A7A' }}>{formatCurrency(serviceCreditUnits * 5)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Points to Deduct</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#C1592E' }}>-{formatPoints(serviceCreditUnits * 1000)}</Typography>
              </Box>
              <Box sx={{ borderTop: '1px solid rgba(61, 74, 62, 0.1)', pt: 1.5, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Remaining Balance</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#2D2D2D' }}>
                  {formatPoints((loyalty?.redeemable_points || 0) - serviceCreditUnits * 1000)} pts
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" fullWidth onClick={() => setServiceCreditConfirm(false)}
                sx={{ py: 1.3, borderColor: 'rgba(61, 74, 62, 0.2)', color: '#5C6B5E' }}>
                Cancel
              </Button>
              <Button variant="contained" fullWidth onClick={() => { setServiceCreditConfirm(false); handleServiceCreditRedeem(); }}
                disabled={serviceCreditLoading} sx={{ py: 1.3 }}>
                {serviceCreditLoading ? <CircularProgress size={22} sx={{ color: '#FFF' }} /> : 'Confirm'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Product Credit Confirmation Dialog */}
      <Dialog open={productCreditConfirm} onClose={() => setProductCreditConfirm(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden' } }}
        slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(61, 74, 62, 0.6)', backdropFilter: 'blur(4px)' } } }}>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ background: 'linear-gradient(145deg, #2A332B, #3D4A3E)', px: 4, py: 3, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', color: '#EFEBE4', mb: 0.5 }}>
              Confirm Redemption
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(239, 235, 228, 0.6)' }}>
              Please review the details below
            </Typography>
          </Box>
          <Box sx={{ px: 4, py: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#2D2D2D', mb: 0.5 }}>Product Credits</Typography>
              <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Code delivered to your redemptions list</Typography>
            </Box>
            <Box sx={{ background: 'rgba(61, 74, 62, 0.04)', borderRadius: '12px', p: 2.5, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Credit Amount</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#5A8A7A' }}>{formatCurrency(productCreditUnits * 5)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Points to Deduct</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#C1592E' }}>-{formatPoints(productCreditUnits * 1000)}</Typography>
              </Box>
              <Box sx={{ borderTop: '1px solid rgba(61, 74, 62, 0.1)', pt: 1.5, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Remaining Balance</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#2D2D2D' }}>
                  {formatPoints((loyalty?.redeemable_points || 0) - productCreditUnits * 1000)} pts
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" fullWidth onClick={() => setProductCreditConfirm(false)}
                sx={{ py: 1.3, borderColor: 'rgba(61, 74, 62, 0.2)', color: '#5C6B5E' }}>
                Cancel
              </Button>
              <Button variant="contained" fullWidth onClick={() => { setProductCreditConfirm(false); handleProductCreditRedeem(); }}
                disabled={productCreditLoading} sx={{ py: 1.3 }}>
                {productCreditLoading ? <CircularProgress size={22} sx={{ color: '#FFF' }} /> : 'Confirm'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Dismiss Redemption Confirmation */}
      <Dialog open={dismissOpen} onClose={closeDismissDialog} maxWidth="xs" fullWidth
        TransitionProps={{ onExited: () => { setDismissData(null); setDismissConfirmStep(false); } }}
        PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden' } }}
        slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(61, 74, 62, 0.6)', backdropFilter: 'blur(4px)' } } }}>
        <DialogContent sx={{ p: 0 }}>
          {!dismissConfirmStep ? (
            <>
              <Box sx={{ background: 'linear-gradient(145deg, #2A332B, #3D4A3E)', px: 4, py: 3, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', color: '#EFEBE4', mb: 0.5 }}>
                  Remove Redemption
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(239, 235, 228, 0.6)' }}>
                  Review the details below
                </Typography>
              </Box>
              <Box sx={{ px: 4, py: 3 }}>
                <Box sx={{ background: 'rgba(61, 74, 62, 0.04)', borderRadius: '12px', p: 2.5, mb: 3 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#2D2D2D', mb: 1.5 }}>
                    {dismissData?.name}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Date</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#2D2D2D' }}>{dismissData && formatShortDate(dismissData.date)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Credit Amount</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#5A8A7A' }}>{dismissData && formatCurrency(dismissData.credit_amount)}</Typography>
                  </Box>
                  {dismissData?.points > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Points Redeemed</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#2D2D2D' }}>{formatPoints(dismissData.points)}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Status</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: dismissData?.status === 'ready' ? '#5A8A7A' : '#C1592E' }}>
                      {dismissData?.status === 'ready' ? 'Complete' : 'Cancelled'}
                    </Typography>
                  </Box>
                </Box>

                {/* Code / Message */}
                {dismissData?.code && (
                  <Box sx={{ background: 'rgba(90, 138, 122, 0.06)', border: '1px solid rgba(90, 138, 122, 0.15)', borderRadius: '12px', p: 2.5, mb: 3 }}>
                    <Typography variant="caption" sx={{ color: '#9CA89E', fontWeight: 600, letterSpacing: '0.5px', display: 'block', mb: 0.25 }}>YOUR CODE</Typography>
                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#3D4A3E', letterSpacing: '2px', fontSize: '16px' }}>
                      {dismissData.code}
                    </Typography>
                  </Box>
                )}
                {dismissData?.category === 'service_credit' && dismissData?.status === 'ready' && (
                  <Box sx={{ background: 'rgba(90, 138, 122, 0.06)', border: '1px solid rgba(90, 138, 122, 0.15)', borderRadius: '12px', p: 2.5, mb: 3 }}>
                    <Typography variant="body2" sx={{ color: '#4A5A4C' }}>
                      Your service credit has been applied to your <strong>Care Package</strong> invoice.
                    </Typography>
                  </Box>
                )}
                {dismissData?.status === 'denied' && (
                  <Box sx={{ background: 'rgba(193, 89, 46, 0.06)', border: '1px solid rgba(193, 89, 46, 0.15)', borderRadius: '12px', p: 2.5, mb: 3 }}>
                    <Typography variant="body2" sx={{ color: '#C1592E' }}>
                      Our team has cancelled your request, your points have been refunded to your account balance.
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button
                    fullWidth variant="outlined" onClick={closeDismissDialog}
                    sx={{ borderColor: 'rgba(61, 74, 62, 0.2)', color: '#3D4A3E', textTransform: 'none', fontWeight: 600, borderRadius: '10px', py: 1 }}
                  >
                    Keep
                  </Button>
                  <Button
                    fullWidth variant="contained" onClick={() => setDismissConfirmStep(true)}
                    sx={{
                      background: 'linear-gradient(135deg, #C1592E, #A0452A)', textTransform: 'none',
                      fontWeight: 600, borderRadius: '10px', py: 1,
                      '&:hover': { background: 'linear-gradient(135deg, #A0452A, #8A3B23)' }
                    }}
                  >
                    Remove
                  </Button>
                </Box>
              </Box>
            </>
          ) : (
            <>
              <Box sx={{ background: 'linear-gradient(145deg, #2A332B, #3D4A3E)', px: 4, py: 3, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', color: '#EFEBE4', mb: 0.5 }}>
                  Are you sure?
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(239, 235, 228, 0.6)' }}>
                  This action cannot be undone
                </Typography>
              </Box>
              <Box sx={{ px: 4, py: 3 }}>
                <Typography variant="body2" sx={{ color: '#5C6B5E', textAlign: 'center', mb: 3 }}>
                  <strong>{dismissData?.name}</strong> will be permanently removed from your redemptions list.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button
                    fullWidth variant="outlined" onClick={() => setDismissConfirmStep(false)}
                    sx={{ borderColor: 'rgba(61, 74, 62, 0.2)', color: '#3D4A3E', textTransform: 'none', fontWeight: 600, borderRadius: '10px', py: 1 }}
                  >
                    Go Back
                  </Button>
                  <Button
                    fullWidth variant="contained" onClick={handleDismissRedemption}
                    sx={{
                      background: 'linear-gradient(135deg, #C1592E, #A0452A)', textTransform: 'none',
                      fontWeight: 600, borderRadius: '10px', py: 1,
                      '&:hover': { background: 'linear-gradient(135deg, #A0452A, #8A3B23)' }
                    }}
                  >
                    Yes, Remove
                  </Button>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Card Request Confirmation Dialog */}
      <Dialog open={!!cardRequestConfirmItem} onClose={() => setCardRequestConfirmItem(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden' } }}
        slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(61, 74, 62, 0.6)', backdropFilter: 'blur(4px)' } } }}>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ background: 'linear-gradient(145deg, #2A332B, #3D4A3E)', px: 4, py: 3, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', color: '#EFEBE4', mb: 0.5 }}>
              Confirm Redemption
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(239, 235, 228, 0.6)' }}>
              Please review the details below
            </Typography>
          </Box>
          <Box sx={{ px: 4, py: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#2D2D2D', mb: 0.5 }}>
                {cardRequestConfirmItem?.name}
              </Typography>
              <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Code delivered to your redemptions list</Typography>
            </Box>
            <Box sx={{ background: 'rgba(61, 74, 62, 0.04)', borderRadius: '12px', p: 2.5, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Card Value</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#2D2D2D' }}>
                  {cardRequestConfirmItem ? formatCurrency(cardRequestConfirmItem.credit_amount) : ''}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Points to Deduct</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#C1592E' }}>
                  -{cardRequestConfirmItem ? formatPoints(cardRequestConfirmItem.points_cost) : ''}
                </Typography>
              </Box>
              <Box sx={{ borderTop: '1px solid rgba(61, 74, 62, 0.1)', pt: 1.5, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Remaining Balance</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#2D2D2D' }}>
                  {cardRequestConfirmItem ? formatPoints((loyalty?.redeemable_points || 0) - cardRequestConfirmItem.points_cost) : ''} pts
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" fullWidth onClick={() => setCardRequestConfirmItem(null)}
                sx={{ py: 1.3, borderColor: 'rgba(61, 74, 62, 0.2)', color: '#5C6B5E' }}>
                Cancel
              </Button>
              <Button variant="contained" fullWidth onClick={handleConfirmCardRequest}
                disabled={confirmingCardId === cardRequestConfirmItem?.id} sx={{ py: 1.3 }}>
                {confirmingCardId === cardRequestConfirmItem?.id ? <CircularProgress size={22} sx={{ color: '#FFF' }} /> : 'Confirm'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Card Request Deny Dialog */}
      <Dialog open={!!cardRequestDenyItem} onClose={() => setCardRequestDenyItem(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden' } }}
        slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(61, 74, 62, 0.6)', backdropFilter: 'blur(4px)' } } }}>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ background: 'linear-gradient(145deg, #2A332B, #3D4A3E)', px: 4, py: 3, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', color: '#EFEBE4', mb: 0.5 }}>
              Decline Request
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(239, 235, 228, 0.6)' }}>
              {cardRequestDenyItem?.name}
            </Typography>
          </Box>
          <Box sx={{ px: 4, py: 3 }}>
            <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 2, textAlign: 'center' }}>
              No points will be deducted. Please let us know why you are declining.
            </Typography>
            <TextField
              fullWidth
              label="Reason (optional)"
              multiline
              rows={3}
              value={cardRequestDenyReason}
              onChange={(e) => setCardRequestDenyReason(e.target.value)}
              placeholder="e.g., changed my mind, no longer needed, etc."
              sx={{ mb: 3 }}
            />
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="outlined" onClick={() => setCardRequestDenyItem(null)}
                sx={{ px: 3, py: 1, borderColor: 'rgba(61, 74, 62, 0.2)', color: '#5C6B5E' }}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleDenyCardRequest}
                disabled={cardRequestDenyLoading}
                sx={{
                  px: 3, py: 1,
                  background: 'linear-gradient(135deg, #C1592E, #A0452A)',
                  '&:hover': { background: 'linear-gradient(135deg, #A0452A, #8A3B23)' }
                }}>
                {cardRequestDenyLoading ? <CircularProgress size={22} sx={{ color: '#FFF' }} /> : 'Decline Request'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <Toast open={toast.open} message={toast.message} severity={toast.severity}
        onClose={() => setToast(t => ({ ...t, open: false }))} />
    </Box>
  );
};

export default RedeemRewardsPage;
