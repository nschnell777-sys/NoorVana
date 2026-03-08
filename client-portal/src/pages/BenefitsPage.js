import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Fade
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import DiamondOutlinedIcon from '@mui/icons-material/DiamondOutlined';
import MilitaryTechOutlinedIcon from '@mui/icons-material/MilitaryTechOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useAuth } from '../context/AuthContext';
import {
  getLoyaltyStatus,
  createGiftClaim,
  getGiftClaims,
  createConciergeRequest,
  getConciergeRequests,
  getConciergeHours,
  respondToConciergeQuote
} from '../services/api';
import { formatPoints, formatShortDate } from '../utils/formatters';
import {
  TIER_LABELS,
  TIER_ORDER,
  TIER_THRESHOLDS,
  TIER_MULTIPLIERS,
  TIER_COLORS
} from '../utils/tierConfig';
import LoadingSpinner from '../components/LoadingSpinner';
import TierBadge from '../components/TierBadge';
import TierProgressBar from '../components/TierProgressBar';
import Toast from '../components/Toast';

/** Darken/lighten a hex color */
function adjustTierColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

/** Collection gifts per tier */
const COLLECTION_GIFTS = {
  silver: {
    name: 'Silver Collection',
    image: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=600&q=80'
  },
  gold: {
    name: 'Gold Collection',
    image: 'https://images.unsplash.com/photo-1764385827352-78c20131fd47?w=600&q=80'
  },
  platinum: {
    name: 'Platinum Collection',
    image: 'https://images.unsplash.com/photo-1639562954924-975ca13f454a?w=600&q=80'
  },
  diamond: {
    name: 'Signature Collection',
    image: 'https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=600&q=80'
  }
};

/** Cumulative concierge hours per tier (Gold: 1, +2 at Platinum, +5 at Diamond) */
const TIER_CONCIERGE_HOURS = {
  bronze: 0,
  silver: 0,
  gold: 1,
  platinum: 3,
  diamond: 8
};

const frostedCardSx = {
  background: 'rgba(255, 255, 255, 0.75)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  borderRadius: '12px',
  p: { xs: 2.5, md: 3.5 },
  boxShadow: '0 2px 20px rgba(0,0,0,0.06)'
};

/** Tier benefit descriptions */
const TIER_BENEFITS = {
  bronze: ['Access to loyalty portal'],
  silver: ['Points redemption unlocked', 'Silver Collection Gift'],
  gold: ['Gold Collection Gift', '1 VIP concierge hour'],
  platinum: ['Platinum Collection Gift', '3 VIP concierge hours'],
  diamond: ['Signature Collection Gift', '8 VIP concierge hours']
};

const BenefitsPage = () => {
  const { client, updateClient, isUnenrolled } = useAuth();
  const [loyalty, setLoyalty] = useState(null);
  const [giftClaims, setGiftClaims] = useState([]);
  const [conciergeHours, setConciergeHours] = useState(null);
  const [conciergeRequests, setConciergeRequests] = useState([]);
  const [respondingId, setRespondingId] = useState(null);
  const [declineDialogId, setDeclineDialogId] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [claimingTier, setClaimingTier] = useState(null);
  const [claimDialog, setClaimDialog] = useState(null); // { tier, giftName }
  const [claimAddr, setClaimAddr] = useState({ street: '', apt: '', city: '', state: '', zip: '' });
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Concierge modal state
  const [conciergeOpen, setConciergeOpen] = useState(false);
  const [conciergeForm, setConciergeForm] = useState({
    request_type: '',
    preferred_date: '',
    details: ''
  });
  const [conciergeSubmitting, setConciergeSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!client?.id) return;
    try {
      const [loyaltyRes, claimsRes, hoursRes, requestsRes] = await Promise.all([
        getLoyaltyStatus(client.id),
        getGiftClaims(client.id).catch(() => ({ data: { claims: [] } })),
        getConciergeHours(client.id).catch(() => ({ data: { total_hours: 0, hours_used: 0, hours_remaining: 0 } })),
        getConciergeRequests(client.id).catch(() => ({ data: { requests: [] } }))
      ]);
      setLoyalty(loyaltyRes.data);
      if (loyaltyRes.data.current_tier && loyaltyRes.data.current_tier !== client?.current_tier) {
        updateClient({ current_tier: loyaltyRes.data.current_tier });
      }
      setGiftClaims(claimsRes.data.claims || []);
      setConciergeHours(hoursRes.data);
      setConciergeRequests(requestsRes.data.requests || []);
    } catch (err) {
      console.error('Failed to load benefits data', err);
    } finally {
      setLoading(false);
    }
  }, [client?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openClaimDialog = (tier, giftName) => {
    setClaimDialog({ tier, giftName });
    setClaimAddr({
      street: client?.address_street || '',
      apt: client?.address_apt || '',
      city: client?.address_city || '',
      state: client?.address_state || '',
      zip: client?.address_zip || ''
    });
  };

  const handleClaimGift = async () => {
    if (!claimDialog || !claimAddr.street.trim() || !claimAddr.city.trim() || !claimAddr.state.trim() || !claimAddr.zip.trim()) return;
    setClaimingTier(claimDialog.tier);
    try {
      await createGiftClaim(client.id, {
        tier: claimDialog.tier,
        gift_name: claimDialog.giftName,
        shipping_street: claimAddr.street.trim(),
        shipping_apt: claimAddr.apt.trim() || undefined,
        shipping_city: claimAddr.city.trim(),
        shipping_state: claimAddr.state.trim(),
        shipping_zip: claimAddr.zip.trim()
      });
      updateClient({
        address_street: claimAddr.street.trim(),
        address_apt: claimAddr.apt.trim() || null,
        address_city: claimAddr.city.trim(),
        address_state: claimAddr.state.trim(),
        address_zip: claimAddr.zip.trim()
      });
      setToast({ open: true, message: 'Gift claimed! We will be in touch with next steps.', severity: 'success' });
      setClaimDialog(null);
      const claimsRes = await getGiftClaims(client.id);
      setGiftClaims(claimsRes.data.claims || []);
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.error?.message || 'Failed to claim gift', severity: 'error' });
    } finally {
      setClaimingTier(null);
    }
  };

  const handleConciergeSubmit = async () => {
    if (!conciergeForm.details.trim()) return;
    setConciergeSubmitting(true);
    try {
      await createConciergeRequest(client.id, conciergeForm);
      setToast({ open: true, message: 'Request submitted! We will reach out to you shortly.', severity: 'success' });
      setConciergeOpen(false);
      setConciergeForm({ request_type: '', preferred_date: '', details: '' });
      fetchData();
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.error?.message || 'Failed to submit request', severity: 'error' });
    } finally {
      setConciergeSubmitting(false);
    }
  };

  const handleRespondToQuote = async (requestId, response, reason) => {
    setRespondingId(requestId);
    try {
      const body = { response };
      if (response === 'declined' && reason) body.decline_reason = reason;
      await respondToConciergeQuote(client.id, requestId, body);
      setToast({
        open: true,
        message: response === 'approved'
          ? 'Quote approved! We will connect you with a concierge shortly.'
          : 'Quote declined.',
        severity: response === 'approved' ? 'success' : 'info'
      });
      setDeclineDialogId(null);
      setDeclineReason('');
      fetchData();
    } catch (err) {
      setToast({
        open: true,
        message: err.response?.data?.error?.message || 'Failed to respond',
        severity: 'error'
      });
    } finally {
      setRespondingId(null);
    }
  };

  if (loading) return <LoadingSpinner message="Loading your benefits..." />;
  if (!loyalty) return null;

  const currentTier = loyalty.current_tier;
  const currentTierIndex = TIER_ORDER.indexOf(currentTier);

  // Build collection gift list
  const collectionGiftItems = [];
  for (let i = 1; i < TIER_ORDER.length; i++) {
    const tier = TIER_ORDER[i];
    const gift = COLLECTION_GIFTS[tier];
    const claim = giftClaims.find((c) => c.tier === tier);
    const isUnlocked = i <= currentTierIndex;
    collectionGiftItems.push({ tier, gift, isUnlocked, claim });
  }

  // Concierge data
  const totalConciergeHours = TIER_CONCIERGE_HOURS[currentTier] || 0;
  const remainingConciergeHours = conciergeHours?.hours_remaining ?? totalConciergeHours;
  const hasConciergeAccess = totalConciergeHours > 0;

  const getClaimStatusChip = (claim) => {
    if (!claim) return null;
    const statusConfig = {
      claimed: { color: '#5A8A7A', bg: 'rgba(90, 138, 122, 0.1)', icon: <CheckCircleOutlineIcon sx={{ fontSize: 14 }} /> },
      processing: { color: '#D4956A', bg: 'rgba(212, 149, 106, 0.1)', icon: <HourglassEmptyIcon sx={{ fontSize: 14 }} /> },
      shipped: { color: '#1976D2', bg: 'rgba(25, 118, 210, 0.1)', icon: <LocalShippingOutlinedIcon sx={{ fontSize: 14 }} /> },
      delivered: { color: '#5A8A7A', bg: 'rgba(90, 138, 122, 0.1)', icon: <CheckCircleOutlineIcon sx={{ fontSize: 14 }} /> }
    };
    const cfg = statusConfig[claim.status] || statusConfig.claimed;
    return (
      <Chip
        label={claim.status === 'claimed' ? 'Claimed' : claim.status === 'processing' ? 'Processing' : claim.status === 'shipped' ? 'Shipped' : claim.status === 'delivered' ? 'Delivered' : 'Claimed'}
        size="small"
        icon={cfg.icon}
        sx={{
          backgroundColor: cfg.bg,
          color: cfg.color,
          fontWeight: 600,
          fontSize: '11px',
          height: 28
        }}
      />
    );
  };

  const getClaimStatusText = (claim) => {
    if (!claim) return null;
    const statusText = {
      claimed: 'Processing',
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered'
    };
    return statusText[claim.status] || 'Processing';
  };

  return (
    <Box sx={{ px: { xs: 2, md: 5 }, py: { xs: 3, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h2"
          sx={{
            fontFamily: '"Outfit", sans-serif',
            color: '#2D2D2D',
            fontSize: { xs: '24px', md: '28px' },
            mb: 1
          }}
        >
          Explore Benefits
        </Typography>
        <Typography variant="body1" sx={{ color: '#5C6B5E' }}>
          Your tier rewards and exclusive perks
        </Typography>
      </Box>

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
            Your account has been unenrolled. You can view your benefits and history, but claiming gifts and concierge services is no longer available.
          </Typography>
        </Box>
      )}

      {/* Tier Progress */}
      <Box sx={{ mb: 4 }}>
        <TierProgressBar
          currentTier={currentTier}
          nextTier={loyalty.next_tier}
          progressPercentage={loyalty.progress_percentage}
          pointsToNextTier={loyalty.points_to_next_tier}
        />
      </Box>

      {/* Tiers */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <WorkspacePremiumOutlinedIcon sx={{ color: '#D4956A', fontSize: 28 }} />
          <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D' }}>
            Tiers
          </Typography>
        </Box>

        {/* Tier tiles */}
        <Box sx={{
          display: 'flex',
          gap: { xs: 1, md: 1.5 },
          width: '100%'
        }}>
          {(() => {
            const tierIcons = {
              bronze: <ShieldOutlinedIcon />,
              silver: <AutoAwesomeOutlinedIcon />,
              gold: <WorkspacePremiumOutlinedIcon />,
              platinum: <MilitaryTechOutlinedIcon />,
              diamond: <DiamondOutlinedIcon />
            };

            return TIER_ORDER.map((tier, idx) => {
              const isCurrent = tier === currentTier;
              const isUnlocked = idx <= currentTierIndex;
              const threshold = TIER_THRESHOLDS[tier];
              const multiplier = TIER_MULTIPLIERS[tier];
              const benefits = TIER_BENEFITS[tier];
              const tc = TIER_COLORS[tier];

              const iconColor = tc.text === '#FFFFFF' ? tc.bg : tc.text;

              // Stylized gradients per tier
              const tierGradients = {
                bronze: 'linear-gradient(145deg, #B8733A 0%, #CD7F32 35%, #DDA15E 65%, #A86B2D 100%)',
                silver: 'linear-gradient(145deg, #8E8E8E 0%, #C0C0C0 30%, #E8E8E8 60%, #A8A8A8 100%)',
                gold: 'linear-gradient(145deg, #C9A800 0%, #FFD700 30%, #FFF1A0 55%, #DAA520 100%)',
                platinum: 'linear-gradient(145deg, #BDB9B1 0%, #E5E4E2 30%, #F5F5F3 55%, #CBC7BF 100%)',
                diamond: 'linear-gradient(145deg, #7AD4E8 0%, #B9F2FF 25%, #E0FAFF 50%, #89D6EC 75%, #6EC8DE 100%)'
              };

              return (
                <Box key={tier} sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <Box
                    sx={{
                      flex: 1,
                      borderRadius: '20px',
                      overflow: 'hidden',
                      position: 'relative',
                      border: isCurrent ? '2px solid #D4956A' : '1px solid rgba(61, 74, 62, 0.08)',
                      boxShadow: isCurrent
                        ? '0 8px 32px rgba(212, 149, 106, 0.3)'
                        : '0 4px 20px rgba(0,0,0,0.06)',
                      background: 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    {/* Header */}
                    <Box sx={{
                      background: tierGradients[tier],
                      height: 130,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {/* Shimmer for platinum/diamond */}
                      {tc.shimmer && (
                        <Box sx={{
                          position: 'absolute',
                          inset: 0,
                          overflow: 'hidden',
                          '&::after': {
                            content: '""',
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.35) 50%, transparent 75%)',
                            animation: 'tierShine 3s ease-in-out infinite',
                            '@keyframes tierShine': {
                              '0%': { transform: 'translateX(-100%)' },
                              '100%': { transform: 'translateX(100%)' }
                            }
                          }
                        }} />
                      )}

                      {/* Icon */}
                      <Box sx={{
                        width: 52,
                        height: 52,
                        borderRadius: '16px',
                        background: 'rgba(255,255,255,0.92)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 1,
                        boxShadow: `0 4px 16px ${tc.glow}`,
                        position: 'relative',
                        flexShrink: 0
                      }}>
                        {React.cloneElement(tierIcons[tier], { sx: { fontSize: 26, color: iconColor } })}
                      </Box>

                      {/* Tier name */}
                      <Typography sx={{
                        fontFamily: '"Outfit", sans-serif',
                        fontWeight: 700,
                        fontSize: '14px',
                        color: tc.text === '#FFFFFF' ? '#FFF' : '#2D2D2D',
                        textShadow: tc.text === '#FFFFFF' ? '0 1px 4px rgba(0,0,0,0.25)' : 'none',
                        position: 'relative',
                        letterSpacing: '0.5px'
                      }}>
                        {TIER_LABELS[tier]}
                      </Typography>
                    </Box>

                    {/* Body */}
                    <Box sx={{
                      p: { xs: 1.5, md: 2 },
                      pt: { xs: 1.5, md: 2 },
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      {/* "Current" indicator */}
                      {isCurrent ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                          <Chip
                            label="Current"
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '10px',
                              fontWeight: 700,
                              backgroundColor: '#D4956A',
                              color: '#FFF',
                              boxShadow: '0 2px 8px rgba(212, 149, 106, 0.4)'
                            }}
                          />
                        </Box>
                      ) : (
                        <Box sx={{ height: 22, mb: 1 }} />
                      )}
                      {/* Threshold & multiplier row */}
                      <Box sx={{ textAlign: 'center', mb: 1.5 }}>
                        <Typography variant="caption" sx={{
                          color: '#5C6B5E',
                          fontWeight: 600,
                          display: 'block',
                          letterSpacing: '0.3px',
                          mb: 0.5
                        }}>
                          {threshold === 0 ? 'Starting Tier' : `${formatPoints(threshold)} pts`}
                        </Typography>
                        <Box sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          background: isCurrent
                            ? 'linear-gradient(135deg, #3D4A3E, #2A332B)'
                            : 'rgba(61, 74, 62, 0.06)',
                          borderRadius: '10px',
                          px: 1.5,
                          py: 0.3
                        }}>
                          <Typography sx={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: isCurrent ? '#EFEBE4' : '#5C6B5E'
                          }}>
                            {multiplier}x Points
                          </Typography>
                        </Box>
                      </Box>

                      {/* Benefits */}
                      <Box sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.6
                      }}>
                        {benefits.map((b, i) => (
                          <Box key={i} sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.8,
                            px: 1,
                            py: 0.4,
                            borderRadius: '8px',
                            backgroundColor: 'rgba(61, 74, 62, 0.04)'
                          }}>
                            <CheckCircleOutlineIcon sx={{ fontSize: 14, color: '#5A8A7A', flexShrink: 0 }} />
                            <Typography variant="caption" sx={{
                              color: '#3D4A3E',
                              lineHeight: 1.4,
                              fontSize: '11px',
                              fontWeight: 500
                            }}>
                              {b}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              );
            });
          })()}
        </Box>
      </Box>

      {/* Collection Gifts */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <CardGiftcardOutlinedIcon sx={{ color: '#D4956A', fontSize: 28 }} />
          <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D' }}>
            Collection Gifts
          </Typography>
        </Box>

        <Grid container spacing={2.5}>
          {collectionGiftItems.map((item) => {
            return (
              <Grid item xs={12} sm={6} md={3} key={item.tier}>
                <Box sx={{
                  position: 'relative',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  height: 340,
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid rgba(255,255,255,0.3)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.18)'
                  }
                }}>
                  {/* Background image */}
                  <Box sx={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${item.gift.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    transition: 'transform 0.4s ease',
                    '&:hover': { transform: 'scale(1.05)' }
                  }} />

                  {/* Dark gradient overlay */}
                  <Box sx={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.1) 100%)'
                  }} />

                  {/* Tier badge - top left */}
                  <Box sx={{ position: 'relative', zIndex: 2, p: 2 }}>
                    <TierBadge tier={item.tier} size="small" />
                  </Box>

                  {/* Bottom content */}
                  <Box sx={{
                    position: 'relative',
                    zIndex: 2,
                    mt: 'auto',
                    p: 2.5,
                    pt: 0
                  }}>
                    <Typography sx={{
                      fontFamily: '"Outfit", sans-serif',
                      fontWeight: 700,
                      fontSize: '17px',
                      color: '#FFF',
                      lineHeight: 1.2,
                      mb: 2
                    }}>
                      {item.gift.name}
                    </Typography>

                    {/* Action area */}
                    {item.isUnlocked && item.claim ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircleOutlineIcon sx={{ fontSize: 18, color: '#7CE08A' }} />
                        <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#7CE08A' }}>
                          Claimed
                        </Typography>
                        {item.claim.status !== 'claimed' && (
                          <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', ml: 'auto' }}>
                            {getClaimStatusText(item.claim)}{item.claim.tracking_number ? ` · ${item.claim.tracking_number}` : ''}
                          </Typography>
                        )}
                      </Box>
                    ) : item.isUnlocked && !item.claim ? (
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={() => openClaimDialog(item.tier, item.gift.name)}
                        disabled={claimingTier === item.tier || isUnenrolled}
                        sx={{
                          background: 'linear-gradient(135deg, #D4956A, #C4854A)',
                          color: '#FFF',
                          fontWeight: 700,
                          fontSize: '13px',
                          py: 1,
                          borderRadius: '10px',
                          textTransform: 'none',
                          letterSpacing: '0.3px',
                          boxShadow: '0 4px 16px rgba(212, 149, 106, 0.4)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #C4854A, #B4753A)',
                            boxShadow: '0 6px 20px rgba(212, 149, 106, 0.5)'
                          }
                        }}
                      >
                        {claimingTier === item.tier ? <CircularProgress size={18} sx={{ color: '#FFF' }} /> : 'Claim Gift'}
                      </Button>
                    ) : !item.isUnlocked ? (
                      <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
                        Reach {TIER_LABELS[item.tier]} to claim
                      </Typography>
                    ) : null}
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* VIP Concierge */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <SupportAgentOutlinedIcon sx={{ color: '#D4956A', fontSize: 28 }} />
          <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D' }}>
            VIP Concierge
          </Typography>
        </Box>

        <Box sx={{
          position: 'relative',
          borderRadius: '20px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
        }}>
          {/* Gradient header */}
          <Box sx={{
            background: 'linear-gradient(135deg, #3D4A3E 0%, #2A332B 50%, #3D4A3E 100%)',
            px: { xs: 3, md: 4 },
            py: 3,
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Decorative accent */}
            <Box sx={{
              position: 'absolute',
              top: -30,
              right: -30,
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'rgba(212, 149, 106, 0.1)'
            }} />
            <Box sx={{
              position: 'absolute',
              bottom: -20,
              right: 60,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'rgba(212, 149, 106, 0.06)'
            }} />

            <Typography sx={{
              fontFamily: '"Outfit", sans-serif',
              fontWeight: 700,
              fontSize: '20px',
              color: '#EFEBE4',
              mb: 0.5,
              position: 'relative'
            }}>
              NoorVana Concierge
            </Typography>
            <Typography sx={{
              fontSize: '13px',
              color: 'rgba(239, 235, 228, 0.65)',
              position: 'relative'
            }}>
              Submit a request for concierge services ranging from care coordination to lifestyle support.
            </Typography>
          </Box>

          {/* Body */}
          <Box sx={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            px: { xs: 3, md: 4 },
            py: 3
          }}>
            {!hasConciergeAccess ? (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <LockOutlinedIcon sx={{ fontSize: 40, color: '#9CA89E', mb: 1 }} />
                <Typography variant="body1" sx={{ color: '#5C6B5E', mb: 0.5 }}>
                  Reach Gold Tier
                </Typography>
                <Typography variant="body2" sx={{ color: '#9CA89E' }}>
                  Gold, Platinum, and Diamond members receive complimentary concierge hours.
                </Typography>
              </Box>
            ) : (
              <Box>
                {/* Hours Summary */}
                <Box sx={{ mb: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#2D2D2D' }}>
                      Concierge Hours
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#5C6B5E' }}>
                      {remainingConciergeHours} of {totalConciergeHours} hr{totalConciergeHours !== 1 ? 's' : ''} remaining
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={totalConciergeHours > 0 ? ((totalConciergeHours - remainingConciergeHours) / totalConciergeHours) * 100 : 0}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'rgba(61, 74, 62, 0.08)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        background: 'linear-gradient(90deg, #D4956A, #C4854A)'
                      }
                    }}
                  />
                </Box>

                <Box sx={{ mb: 2 }} />

                {/* CTA Button */}
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => setConciergeOpen(true)}
                  disabled={remainingConciergeHours <= 0 || isUnenrolled}
                  startIcon={<SupportAgentOutlinedIcon />}
                  sx={{
                    borderColor: '#D4956A',
                    color: '#D4956A',
                    py: 1.2,
                    fontWeight: 600,
                    '&:hover': { borderColor: '#C4854A', backgroundColor: 'rgba(212, 149, 106, 0.04)' },
                    '&.Mui-disabled': { borderColor: '#ccc', color: '#aaa' }
                  }}
                >
                  {remainingConciergeHours <= 0 ? 'No Hours Remaining' : 'Submit Concierge Request'}
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Concierge Request History */}
      {hasConciergeAccess && conciergeRequests.filter((r) => !['declined', 'completed'].includes(r.status)).length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <SupportAgentOutlinedIcon sx={{ color: '#D4956A', fontSize: 28 }} />
            <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D' }}>
              Concierge Requests
            </Typography>
          </Box>

          {conciergeRequests.filter((r) => !['declined', 'completed'].includes(r.status)).map((req) => {
            const statusConfig = {
              new: { label: 'Submitted', color: '#D4956A', bg: 'rgba(212, 149, 106, 0.1)', message: 'Your request has been received. Our team will review it shortly.' },
              reviewing: { label: 'Under Review', color: '#1976D2', bg: 'rgba(25, 118, 210, 0.1)', message: 'Our team is reviewing your request. You will receive a quote soon.' },
              quoted: { label: 'Action Required', color: '#7B1FA2', bg: 'rgba(123, 31, 162, 0.1)', message: null },
              approved: { label: 'Approved', color: '#5A8A7A', bg: 'rgba(90, 138, 122, 0.1)', message: 'Your request has been approved. We will connect you with a concierge shortly.' },
              connected: { label: 'In Progress', color: '#1976D2', bg: 'rgba(25, 118, 210, 0.1)', message: 'You have been connected with your concierge.' }
            };
            const sc = statusConfig[req.status] || { label: req.status, color: '#999', bg: '#f5f5f5', message: '' };

            return (
              <Fade in timeout={300} key={req.id}>
                <Box sx={{ ...frostedCardSx, mb: 2, p: 0, overflow: 'hidden' }}>
                  {/* Top bar: name + status */}
                  <Box sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    px: { xs: 2.5, md: 3 }, py: 1.5,
                    borderBottom: '1px solid rgba(61, 74, 62, 0.08)',
                    background: 'rgba(61, 74, 62, 0.02)'
                  }}>
                    <Typography sx={{ fontWeight: 600, color: '#2D2D2D', fontFamily: '"Outfit", sans-serif', fontSize: '15px', '&::first-letter': { textTransform: 'uppercase' } }}>
                      {req.request_type || 'General Request'}
                    </Typography>
                    <Chip
                      label={sc.label}
                      size="small"
                      sx={{ backgroundColor: sc.bg, color: sc.color, fontWeight: 600, fontSize: '12px', px: 0.5 }}
                    />
                  </Box>

                  {/* Info grid */}
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: req.hours_allocated > 0 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                    borderBottom: '1px solid rgba(61, 74, 62, 0.08)',
                  }}>
                    <Box sx={{ px: { xs: 2.5, md: 3 }, py: 1.5, borderRight: '1px solid rgba(61, 74, 62, 0.08)' }}>
                      <Typography variant="caption" sx={{ color: '#9CA89E', fontWeight: 600, letterSpacing: '0.5px', display: 'block', mb: 0.25 }}>SUBMITTED</Typography>
                      <Typography variant="body2" sx={{ color: '#2D2D2D', fontWeight: 500 }}>{formatShortDate(req.created_at)}</Typography>
                    </Box>
                    <Box sx={{ px: { xs: 2.5, md: 3 }, py: 1.5, borderRight: req.hours_allocated > 0 ? '1px solid rgba(61, 74, 62, 0.08)' : 'none' }}>
                      <Typography variant="caption" sx={{ color: '#9CA89E', fontWeight: 600, letterSpacing: '0.5px', display: 'block', mb: 0.25 }}>PREFERRED DATE</Typography>
                      <Typography variant="body2" sx={{ color: '#2D2D2D', fontWeight: 500 }}>{req.preferred_date ? formatShortDate(req.preferred_date) : '-'}</Typography>
                    </Box>
                    {req.hours_allocated > 0 && (
                      <Box sx={{ px: { xs: 2.5, md: 3 }, py: 1.5 }}>
                        <Typography variant="caption" sx={{ color: '#9CA89E', fontWeight: 600, letterSpacing: '0.5px', display: 'block', mb: 0.25 }}>HOURS</Typography>
                        <Typography variant="body2" sx={{ color: '#2D2D2D', fontWeight: 500 }}>{req.hours_allocated}</Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Status content */}
                  <Box sx={{ px: { xs: 2.5, md: 3 }, py: 2 }}>
                    {req.details && (
                      <Typography sx={{ color: '#4A5A4C', fontSize: '14px', lineHeight: 1.6, mb: (req.status === 'quoted' && req.quoted_hours) || sc.message ? 2 : 0, '&::first-letter': { textTransform: 'uppercase' } }}>
                        {req.details}
                      </Typography>
                    )}

                    {/* Quoted — action required */}
                    {req.status === 'quoted' && req.quoted_hours ? (
                      <Box sx={{
                        p: 2.5,
                        borderRadius: '12px',
                        background: 'rgba(212, 149, 106, 0.08)',
                        border: '1px solid rgba(212, 149, 106, 0.2)'
                      }}>
                        <Typography sx={{ fontWeight: 600, color: '#2D2D2D', fontSize: '14px', mb: 1 }}>
                          We recommend {req.quoted_hours} hour{parseFloat(req.quoted_hours) !== 1 ? 's' : ''} of concierge service for your request.
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 2 }}>
                          Would you like to proceed?
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                          <Button
                            variant="contained"
                            size="small"
                            disabled={respondingId === req.id}
                            onClick={() => handleRespondToQuote(req.id, 'approved')}
                            sx={{
                              background: 'linear-gradient(135deg, #5A8A7A, #4A7A6A)',
                              textTransform: 'none',
                              fontWeight: 600,
                              borderRadius: '8px',
                              px: 3,
                              py: 0.8,
                              fontSize: '13px',
                              '&:hover': { background: 'linear-gradient(135deg, #4A7A6A, #3A6A5A)' }
                            }}
                          >
                            {respondingId === req.id ? <CircularProgress size={16} sx={{ color: '#FFF' }} /> : 'Approve'}
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            disabled={respondingId === req.id}
                            onClick={() => { setDeclineDialogId(req.id); setDeclineReason(''); }}
                            sx={{
                              textTransform: 'none',
                              fontWeight: 600,
                              borderRadius: '8px',
                              px: 3,
                              py: 0.8,
                              fontSize: '13px',
                              borderColor: '#D32F2F',
                              color: '#D32F2F',
                              '&:hover': { borderColor: '#B71C1C', backgroundColor: 'rgba(211, 47, 47, 0.04)' }
                            }}
                          >
                            Decline
                          </Button>
                        </Box>
                      </Box>
                    ) : sc.message && (
                      <Box sx={{
                        p: 2,
                        borderRadius: '10px',
                        background: sc.bg,
                        border: `1px solid ${sc.color}20`
                      }}>
                        <Typography variant="body2" sx={{ color: sc.color, fontWeight: 500 }}>
                          {sc.message}
                        </Typography>
                        {req.status === 'connected' && req.appointment_date && (
                          <Typography variant="body2" sx={{ color: sc.color, mt: 0.5 }}>
                            Appointment: {req.appointment_date}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Fade>
            );
          })}
        </Box>
      )}

      {/* Gift Claim Address Dialog */}
      <Dialog
        open={!!claimDialog}
        onClose={() => setClaimDialog(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D', pb: 0.5 }}>
          Claim {claimDialog?.giftName}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 2.5 }}>
            Please verify your shipping address so we can send your gift.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              required
              label="Street Address"
              value={claimAddr.street}
              onChange={(e) => setClaimAddr((a) => ({ ...a, street: e.target.value }))}
              autoFocus
              sx={{ flex: 2 }}
            />
            <TextField
              label="Apt / Unit"
              value={claimAddr.apt}
              onChange={(e) => setClaimAddr((a) => ({ ...a, apt: e.target.value }))}
              sx={{ flex: 1 }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              required
              label="City"
              value={claimAddr.city}
              onChange={(e) => setClaimAddr((a) => ({ ...a, city: e.target.value }))}
              sx={{ flex: 2 }}
            />
            <TextField
              required
              label="State"
              value={claimAddr.state}
              onChange={(e) => setClaimAddr((a) => ({ ...a, state: e.target.value }))}
              sx={{ flex: 1 }}
            />
            <TextField
              required
              label="Zip Code"
              value={claimAddr.zip}
              onChange={(e) => setClaimAddr((a) => ({ ...a, zip: e.target.value }))}
              sx={{ flex: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setClaimDialog(null)} sx={{ color: '#5C6B5E' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!claimAddr.street.trim() || !claimAddr.city.trim() || !claimAddr.state.trim() || !claimAddr.zip.trim() || claimingTier === claimDialog?.tier}
            onClick={handleClaimGift}
            sx={{
              px: 3,
              background: 'linear-gradient(135deg, #D4956A, #C4854A)',
              '&:hover': { background: 'linear-gradient(135deg, #C4854A, #B4753A)' }
            }}
          >
            {claimingTier === claimDialog?.tier ? <CircularProgress size={20} sx={{ color: '#FFF' }} /> : 'Confirm & Claim'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Concierge Request Modal */}
      <Dialog
        open={conciergeOpen}
        onClose={() => setConciergeOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D', pb: 1 }}>
          Submit Concierge Request
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 2.5, whiteSpace: 'nowrap' }}>
            Tell us what you need and we will connect you with a NoorVana Concierge.
          </Typography>

          <TextField
            fullWidth
            label="Preferred Date"
            type="date"
            value={conciergeForm.preferred_date}
            onChange={(e) => setConciergeForm((f) => ({ ...f, preferred_date: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            required
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="What do you need help with?"
            value={conciergeForm.request_type}
            onChange={(e) => setConciergeForm((f) => ({ ...f, request_type: e.target.value }))}
            required
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Details"
            multiline
            rows={4}
            value={conciergeForm.details}
            onChange={(e) => setConciergeForm((f) => ({ ...f, details: e.target.value }))}
            placeholder="Please describe what you're looking for..."
            required
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setConciergeOpen(false)} sx={{ color: '#5C6B5E' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConciergeSubmit}
            disabled={conciergeSubmitting || !conciergeForm.details.trim() || !conciergeForm.preferred_date || !conciergeForm.request_type.trim()}
            sx={{ px: 3 }}
          >
            {conciergeSubmitting ? <CircularProgress size={20} /> : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Decline Reason Dialog */}
      <Dialog
        open={!!declineDialogId}
        onClose={() => { setDeclineDialogId(null); setDeclineReason(''); }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D', pb: 1 }}>
          Decline Quote
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 2 }}>
            Please let us know why you are declining this quote.
          </Typography>
          <TextField
            fullWidth
            label="Reason for declining"
            multiline
            rows={3}
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="e.g., too many hours, changed my mind, etc."
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => { setDeclineDialogId(null); setDeclineReason(''); }}
            sx={{ color: '#5C6B5E' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!declineReason.trim() || respondingId === declineDialogId}
            onClick={() => handleRespondToQuote(declineDialogId, 'declined', declineReason)}
            sx={{
              px: 3,
              background: '#D32F2F',
              '&:hover': { background: '#B71C1C' }
            }}
          >
            {respondingId === declineDialogId ? <CircularProgress size={20} sx={{ color: '#FFF' }} /> : 'Decline Quote'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </Box>
  );
};

export default BenefitsPage;
