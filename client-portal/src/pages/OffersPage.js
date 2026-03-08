import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Grid, Button, Chip, CircularProgress, Dialog, DialogContent,
  IconButton, Fade
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CloseIcon from '@mui/icons-material/Close';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useAuth } from '../context/AuthContext';
import { getOffers, claimOffer, getLoyaltyStatus } from '../services/api';
import { TIER_LABELS, TIER_ORDER, REDEMPTION_POINTS_PER_UNIT, REDEMPTION_CREDIT_PER_UNIT } from '../utils/tierConfig';
import Toast from '../components/Toast';
import TierBadge from '../components/TierBadge';

const TYPE_CONFIG = {
  deal: {
    label: 'Deal',
    color: '#D4956A',
    icon: <LocalOfferOutlinedIcon />,
    fallbackImage: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80'
  },
  experience: {
    label: 'Experience',
    color: '#3D4A3E',
    icon: <ConfirmationNumberOutlinedIcon />,
    fallbackImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80'
  },
  giveaway: {
    label: 'Giveaway',
    color: '#5A8A7A',
    icon: <EmojiEventsOutlinedIcon />,
    fallbackImage: 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=800&q=80'
  }
};

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'deal', label: 'Deals' },
  { key: 'experience', label: 'Experiences' },
  { key: 'giveaway', label: 'Giveaways' }
];

const getCountdown = (endDate) => {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end - now;
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
};

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const resolveImageUrl = (url, fallback) => {
  if (!url) return fallback;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
};

const OfferCard = ({ offer, onClaim }) => {
  const config = TYPE_CONFIG[offer.type] || TYPE_CONFIG.deal;
  const isLocked = !!offer.locked;
  const isEntered = !!offer.client_entered;
  const [countdown, setCountdown] = useState(getCountdown(offer.end_date));
  const imageUrl = resolveImageUrl(offer.image_url, config.fallbackImage);

  useEffect(() => {
    const timer = setInterval(() => setCountdown(getCountdown(offer.end_date)), 60000);
    return () => clearInterval(timer);
  }, [offer.end_date]);

  const getCtaLabel = () => {
    if (isEntered) {
      if (offer.type === 'giveaway') return 'Entered';
      return 'Claimed';
    }
    if (isLocked) return `${TIER_LABELS[offer.min_tier]}+ Only`;
    if (offer.type === 'deal') return 'Claim Deal';
    if (offer.type === 'experience') {
      if (offer.spots_available && offer.spots_claimed >= offer.spots_available) return 'Sold Out';
      return 'Claim Spot';
    }
    if (offer.type === 'giveaway') {
      if (offer.sweepstakes_drawn) return 'Drawing Complete';
      return 'Enter to Win';
    }
    return 'Claim';
  };

  const isDisabled = isEntered || isLocked ||
    (offer.type === 'deal' && offer.deal_quantity_limit && offer.deal_quantity_claimed >= offer.deal_quantity_limit) ||
    (offer.type === 'experience' && offer.spots_available && offer.spots_claimed >= offer.spots_available) ||
    (offer.type === 'giveaway' && offer.sweepstakes_drawn);

  const getSubInfo = () => {
    if (offer.type === 'deal') {
      if (offer.deal_quantity_limit) {
        const remaining = offer.deal_quantity_limit - (offer.deal_quantity_claimed || 0);
        return `${remaining} remaining`;
      }
      return null;
    }
    if (offer.type === 'experience') {
      if (offer.spots_available) {
        const remaining = offer.spots_available - (offer.spots_claimed || 0);
        return `${remaining} of ${offer.spots_available} spots left`;
      }
      return null;
    }
    if (offer.type === 'giveaway') {
      if (offer.sweepstakes_draw_date) {
        return `Drawing: ${new Date(offer.sweepstakes_draw_date).toLocaleDateString()}`;
      }
      return null;
    }
    return null;
  };

  return (
    <Box sx={{
      position: 'relative',
      borderRadius: '20px',
      overflow: 'hidden',
      height: 420,
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid rgba(255,255,255,0.15)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      cursor: isDisabled ? 'default' : 'pointer',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.18)'
      }
    }}>
      {/* Background image */}
      <Box sx={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'transform 0.5s ease',
        '.MuiBox-root:hover > &': { transform: 'scale(1.05)' }
      }} />

      {/* Dark gradient overlay */}
      <Box sx={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0.25) 100%)'
      }} />

      {/* Top badges */}
      <Box sx={{
        position: 'relative',
        zIndex: 2,
        p: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            icon={React.cloneElement(config.icon, { sx: { fontSize: 16, color: `${config.color} !important` } })}
            label={config.label}
            size="small"
            sx={{
              backgroundColor: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              color: '#FFF',
              fontWeight: 600,
              fontSize: '11px',
              height: 28,
              border: `1px solid ${config.color}40`,
              '& .MuiChip-icon': { ml: 0.5 }
            }}
          />
          <TierBadge tier={offer.min_tier} size="small" />
        </Box>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          backgroundColor: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(8px)',
          borderRadius: '12px',
          px: 1.2,
          py: 0.4
        }}>
          <AccessTimeIcon sx={{ fontSize: 13, color: '#FFF' }} />
          <Typography variant="caption" sx={{ color: '#FFF', fontWeight: 600, fontSize: '11px' }}>
            {countdown}
          </Typography>
        </Box>
      </Box>

      {/* Entered badge */}
      {isEntered && (
        <Box sx={{
          position: 'relative',
          zIndex: 2,
          mx: 2,
          mt: 'auto',
          mb: 0
        }}>
          <Box sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            backgroundColor: 'rgba(90, 138, 122, 0.9)',
            backdropFilter: 'blur(8px)',
            borderRadius: '8px',
            px: 1.5,
            py: 0.5
          }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 16, color: '#FFF' }} />
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#FFF' }}>
              {offer.type === 'giveaway' ? 'Entered' : 'Claimed'}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Bottom content */}
      <Box sx={{
        position: 'relative',
        zIndex: 2,
        mt: isEntered ? 1.5 : 'auto',
        p: 2.5,
        pt: 0
      }}>
        <Typography sx={{
          fontFamily: '"Outfit", sans-serif',
          fontWeight: 600,
          fontSize: '18px',
          color: '#FFF',
          lineHeight: 1.3,
          mb: 1,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {offer.title}
        </Typography>

        {(offer.type === 'experience' ? offer.preview_text : offer.description) && (
          <Typography sx={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '13px',
            lineHeight: 1.5,
            mb: 2,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {offer.type === 'experience' ? offer.preview_text : offer.description}
          </Typography>
        )}

        {/* Deal pricing */}
        {offer.type === 'deal' && offer.deal_discount_percentage && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Chip
              label={`${offer.deal_discount_percentage}% OFF`}
              size="small"
              sx={{ backgroundColor: 'rgba(212, 149, 106, 0.9)', color: '#FFF', fontWeight: 700, fontSize: '12px' }}
            />
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
              $50 &ndash; $500
            </Typography>
          </Box>
        )}

        {/* Sub info */}
        {getSubInfo() && (
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', mb: 1.5 }}>
            {getSubInfo()}
          </Typography>
        )}

        {/* CTA */}
        {!isEntered && (
          <Button
            variant="contained"
            fullWidth
            disabled={isDisabled}
            onClick={(e) => { e.stopPropagation(); if (!isDisabled) onClaim(offer); }}
            sx={{
              py: 1.2,
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '13px',
              textTransform: 'none',
              letterSpacing: '0.3px',
              background: isLocked
                ? 'rgba(255,255,255,0.15)'
                : 'linear-gradient(135deg, #D4956A, #C4854A)',
              color: '#FFF',
              backdropFilter: isLocked ? 'blur(4px)' : 'none',
              boxShadow: isLocked ? 'none' : '0 4px 16px rgba(212, 149, 106, 0.4)',
              '&:hover': {
                background: isLocked
                  ? 'rgba(255,255,255,0.2)'
                  : 'linear-gradient(135deg, #C4854A, #B4753A)',
                boxShadow: isLocked ? 'none' : '0 6px 20px rgba(212, 149, 106, 0.5)'
              },
              '&.Mui-disabled': {
                background: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.5)'
              }
            }}
          >
            {getCtaLabel()}
          </Button>
        )}
      </Box>
    </Box>
  );
};

const OffersPage = () => {
  const { client, isUnenrolled } = useAuth();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [claimDialog, setClaimDialog] = useState(null);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimResult, setClaimResult] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(50);
  const [clientPoints, setClientPoints] = useState(client?.redeemable_points || 0);
  const [dealConfirm, setDealConfirm] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const fetchOffers = useCallback(async () => {
    try {
      const res = await getOffers();
      setOffers(res.data.offers || []);
    } catch (err) {
      console.error('Failed to load offers', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const activeOffers = offers.filter(o => !o.locked && o.status === 'active');
  const lockedOffers = offers.filter(o => o.locked);
  const expiredOffers = offers.filter(o => o.status === 'expired' || o.status === 'completed');

  const filterOffers = (list) => {
    if (activeFilter === 'all') return list;
    return list.filter(o => o.type === activeFilter);
  };

  const handleClaimClick = async (offer) => {
    if (isUnenrolled) return;
    setClaimDialog(offer);
    setClaimResult(null);
    setSelectedAmount(50);
    // Fetch fresh points balance
    if (client?.id) {
      try {
        const { data } = await getLoyaltyStatus(client.id);
        setClientPoints(data.redeemable_points || 0);
      } catch {
        setClientPoints(client?.redeemable_points || 0);
      }
    }
  };

  const handleConfirmClaim = async () => {
    if (!claimDialog) return;
    setClaimLoading(true);
    try {
      const body = {};
      if (claimDialog.type === 'deal' && claimDialog.deal_discount_percentage) {
        body.dollar_amount = selectedAmount;
      }
      const res = await claimOffer(claimDialog.id, body);
      setClaimResult(res.data);
      await fetchOffers();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to claim offer. Please try again.';
      setToast({ open: true, message: msg, severity: 'error' });
      setClaimDialog(null);
    } finally {
      setClaimLoading(false);
    }
  };

  const closeClaimDialog = () => {
    setClaimDialog(null);
    setClaimResult(null);
    setSelectedAmount(50);
    setDealConfirm(false);
  };

  const getConfirmTitle = (offer) => {
    if (!offer) return '';
    if (offer.type === 'deal') return 'Claim This Deal?';
    if (offer.type === 'experience') return 'Claim Your Spot?';
    return 'Enter Sweepstakes?';
  };

  const DEAL_AMOUNTS = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500];
  const POINTS_PER_DOLLAR = REDEMPTION_POINTS_PER_UNIT / REDEMPTION_CREDIT_PER_UNIT;

  const getDiscountedPoints = (dollars, pct) => {
    const full = dollars * POINTS_PER_DOLLAR;
    return Math.floor(full * (1 - pct / 100) / 1000) * 1000;
  };

  const getConfirmBody = (offer) => {
    if (!offer) return '';
    if (offer.type === 'deal' && offer.deal_discount_percentage) {
      return null; // We render a custom amount picker instead
    }
    if (offer.type === 'deal') {
      return `This will redeem ${(offer.deal_points || offer.original_points || 0).toLocaleString()} points from your balance for "${offer.title}".`;
    }
    if (offer.type === 'experience') {
      return `You'll claim a spot for "${offer.title}". The NoorVana team will reach out with details.`;
    }
    return `You'll be entered into the drawing for "${offer.title}". Winners will be drawn on ${offer.sweepstakes_draw_date ? new Date(offer.sweepstakes_draw_date).toLocaleDateString() : 'a future date'}.`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#3D4A3E' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Hero */}
      <Box sx={{
        background: 'linear-gradient(145deg, #2A332B 0%, #3D4A3E 50%, #4A5A4C 100%)',
        px: { xs: 3, md: 5 }, py: { xs: 4, md: 5 }, position: 'relative', overflow: 'hidden'
      }}>
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(212, 149, 106, 0.06)', filter: 'blur(40px)' }} />
        <Typography variant="h2" sx={{
          fontFamily: '"Outfit", sans-serif',
          color: '#EFEBE4',
          fontSize: { xs: '24px', sm: '28px', md: '28px' },
          mb: 1,
          position: 'relative'
        }}>
          Exclusive Offers
        </Typography>
        <Typography sx={{
          fontSize: '12px',
          letterSpacing: '2.5px',
          textTransform: 'uppercase',
          color: 'rgba(239, 235, 228, 0.5)'
        }}>
          Limited-Time Deals, Experiences & Giveaways
        </Typography>
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
              Your account has been unenrolled. You can browse offers, but claiming is no longer available.
            </Typography>
          </Box>
        )}

        {/* Filter tabs */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
          {FILTER_TABS.map((tab) => (
            <Chip
              key={tab.key}
              label={tab.label}
              size="medium"
              onClick={() => setActiveFilter(tab.key)}
              sx={{
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '20px',
                px: 1,
                backgroundColor: activeFilter === tab.key ? '#D4956A' : 'rgba(61, 74, 62, 0.06)',
                color: activeFilter === tab.key ? '#FFF' : '#5C6B5E',
                '&:hover': {
                  backgroundColor: activeFilter === tab.key ? '#C1832F' : 'rgba(61, 74, 62, 0.12)'
                }
              }}
            />
          ))}
        </Box>

        {/* Active Offers */}
        {filterOffers([...activeOffers, ...lockedOffers]).length === 0 ? (
          <Box sx={{
            py: 8,
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 2px 20px rgba(0,0,0,0.06)'
          }}>
            <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D', mb: 1 }}>
              No offers available
            </Typography>
            <Typography variant="body1" sx={{ color: '#5C6B5E' }}>
              Check back soon for exclusive deals, experiences, and giveaways.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {filterOffers([...activeOffers, ...lockedOffers]).map((offer) => (
              <Grid item xs={12} sm={6} md={4} key={offer.id}>
                <OfferCard
                  offer={offer}
                  onClaim={handleClaimClick}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {/* Past Offers */}
        {filterOffers(expiredOffers).length > 0 && (
          <Box sx={{ mt: 5 }}>
            <Typography variant="h5" sx={{
              fontFamily: '"Outfit", sans-serif',
              color: '#2D2D2D',
              fontSize: { xs: '18px', md: '20px' },
              mb: 0.5
            }}>
              Past Offers
            </Typography>
            <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 3 }}>
              These offers have ended
            </Typography>
            <Grid container spacing={3}>
              {filterOffers(expiredOffers).map((offer) => (
                <Grid item xs={12} sm={6} md={4} key={offer.id}>
                  <Box sx={{ opacity: 0.5, pointerEvents: 'none' }}>
                    <OfferCard offer={offer} onClaim={() => {}} />
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Box>

      {/* Claim Confirmation Dialog */}
      <Dialog
        open={!!claimDialog && !claimResult}
        onClose={closeClaimDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden' } }}
        slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(61, 74, 62, 0.6)', backdropFilter: 'blur(4px)' } } }}
      >
        <DialogContent sx={{ p: 0 }}>
          {claimDialog?.type === 'experience' ? (
            /* ===== EXPERIENCE: Elegant invite style ===== */
            <Box>
              {/* Full-bleed image with overlay */}
              <Box sx={{ position: 'relative', height: 200, overflow: 'hidden' }}>
                <Box sx={{
                  position: 'absolute', inset: 0,
                  backgroundImage: `url(${resolveImageUrl(claimDialog.image_url, TYPE_CONFIG.experience.fallbackImage)})`,
                  backgroundSize: 'cover', backgroundPosition: 'center'
                }} />
                <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(42, 51, 43, 0.95) 0%, rgba(42, 51, 43, 0.4) 50%, rgba(0,0,0,0.15) 100%)' }} />
                <IconButton onClick={closeClaimDialog} sx={{ position: 'absolute', top: 12, right: 12, color: 'rgba(255,255,255,0.7)', zIndex: 3, '&:hover': { color: '#FFF' } }}>
                  <CloseIcon />
                </IconButton>
                <Box sx={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', px: 4, pb: 3 }}>
                  <Typography sx={{ fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: '#D4956A', fontWeight: 600, mb: 0.5 }}>
                    You're Invited
                  </Typography>
                  <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', color: '#EFEBE4', fontWeight: 600, lineHeight: 1.3 }}>
                    {claimDialog.title}
                  </Typography>
                </Box>
              </Box>

              {/* Invite body */}
              <Box sx={{ px: 4, py: 3 }}>
                {claimDialog.description && (
                  <Typography variant="body2" sx={{ color: '#5C6B5E', lineHeight: 1.7, mb: 2.5 }}>
                    {claimDialog.description}
                  </Typography>
                )}

                {/* Details row */}
                <Box sx={{
                  display: 'flex', gap: 2, mb: 2.5,
                  background: 'rgba(61, 74, 62, 0.04)', borderRadius: '12px', p: 2
                }}>
                  {claimDialog.spots_available && (
                    <Box sx={{ flex: 1, textAlign: 'center', borderRight: '1px solid rgba(61, 74, 62, 0.1)', pr: 2 }}>
                      <Typography variant="caption" sx={{ color: '#9CA89E', fontWeight: 600, letterSpacing: '0.5px', display: 'block', mb: 0.25 }}>SPOTS LEFT</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: '#2D2D2D' }}>
                        {claimDialog.spots_available - (claimDialog.spots_claimed || 0)}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ flex: 1, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#9CA89E', fontWeight: 600, letterSpacing: '0.5px', display: 'block', mb: 0.25 }}>MIN TIER</Typography>
                    <TierBadge tier={claimDialog.min_tier} size="small" />
                  </Box>
                  {claimDialog.experience_points_cost > 0 && (
                    <Box sx={{ flex: 1, textAlign: 'center', borderLeft: '1px solid rgba(61, 74, 62, 0.1)', pl: 2 }}>
                      <Typography variant="caption" sx={{ color: '#9CA89E', fontWeight: 600, letterSpacing: '0.5px', display: 'block', mb: 0.25 }}>POINTS COST</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: '#D4956A' }}>
                        {Number(claimDialog.experience_points_cost).toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ flex: 1, textAlign: 'center', borderLeft: '1px solid rgba(61, 74, 62, 0.1)', pl: 2 }}>
                    <Typography variant="caption" sx={{ color: '#9CA89E', fontWeight: 600, letterSpacing: '0.5px', display: 'block', mb: 0.25 }}>ENDS</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#2D2D2D' }}>
                      {new Date(claimDialog.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Typography>
                  </Box>
                </Box>

                {claimDialog.experience_points_cost > 0 && (
                  <Typography variant="caption" sx={{ color: '#C1592E', display: 'block', textAlign: 'center', mb: 1.5, fontWeight: 600 }}>
                    This will deduct {Number(claimDialog.experience_points_cost).toLocaleString()} points from your redeemable balance
                  </Typography>
                )}
                <Typography variant="caption" sx={{ color: '#9CA89E', display: 'block', textAlign: 'center', mb: 2.5 }}>
                  The NoorVana Advantage team will contact you with details.
                </Typography>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={closeClaimDialog}
                    sx={{ py: 1.3, borderColor: 'rgba(61, 74, 62, 0.2)', color: '#5C6B5E', borderRadius: '10px' }}
                  >
                    Not Now
                  </Button>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleConfirmClaim}
                    disabled={claimLoading}
                    sx={{
                      py: 1.3, borderRadius: '10px',
                      background: 'linear-gradient(135deg, #3D4A3E, #5A8A7A)',
                      '&:hover': { background: 'linear-gradient(135deg, #2A332B, #4A7A6A)' }
                    }}
                  >
                    {claimLoading ? <CircularProgress size={22} sx={{ color: '#FFF' }} /> : (claimDialog.experience_points_cost > 0 ? `Claim for ${Number(claimDialog.experience_points_cost).toLocaleString()} pts` : 'RSVP')}
                  </Button>
                </Box>
              </Box>
            </Box>
          ) : (
            /* ===== DEAL / GIVEAWAY: Original layout ===== */
            <>
              {/* Dialog image header */}
              {claimDialog && (
                <Box sx={{ position: 'relative', height: 160, overflow: 'hidden' }}>
                  <Box sx={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `url(${resolveImageUrl(claimDialog.image_url, TYPE_CONFIG[claimDialog.type]?.fallbackImage)})`,
                    backgroundSize: 'cover', backgroundPosition: 'center'
                  }} />
                  <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 100%)' }} />
                  <Box sx={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', alignItems: 'flex-end', px: 4, pb: 2.5 }}>
                    <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', color: '#FFF', fontWeight: 600 }}>
                      {getConfirmTitle(claimDialog)}
                    </Typography>
                  </Box>
                </Box>
              )}
              <Box sx={{ px: 4, py: 3 }}>
                <Typography variant="body1" sx={{ color: '#2D2D2D', fontWeight: 600, mb: 1 }}>
                  {claimDialog?.title}
                </Typography>

                {claimDialog?.description && (
                  <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 2, lineHeight: 1.6 }}>
                    {claimDialog.description}
                  </Typography>
                )}

                {/* Deal amount picker */}
                {claimDialog?.type === 'deal' && claimDialog?.deal_discount_percentage ? (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 2, whiteSpace: 'nowrap' }}>
                      Choose your redemption amount. You'll save {claimDialog.deal_discount_percentage}% on points!
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 2 }}>
                      {DEAL_AMOUNTS.map((amt) => {
                        const fullPts = amt * POINTS_PER_DOLLAR;
                        const discPts = getDiscountedPoints(amt, claimDialog.deal_discount_percentage);
                        const canAfford = clientPoints >= discPts;
                        return (
                          <Box
                            key={amt}
                            onClick={() => canAfford && setSelectedAmount(amt)}
                            sx={{
                              height: 52, border: '2px solid',
                              borderColor: selectedAmount === amt ? '#D4956A' : (canAfford ? 'rgba(61, 74, 62, 0.15)' : 'rgba(0,0,0,0.06)'),
                              borderRadius: '10px', px: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              cursor: canAfford ? 'pointer' : 'default', opacity: canAfford ? 1 : 0.4,
                              backgroundColor: selectedAmount === amt ? 'rgba(212, 149, 106, 0.06)' : 'transparent',
                              transition: 'all 0.2s ease',
                              '&:hover': canAfford ? { borderColor: '#D4956A', backgroundColor: 'rgba(212, 149, 106, 0.04)' } : {}
                            }}
                          >
                            <Typography sx={{ fontWeight: 700, color: '#2D2D2D', fontSize: '14px' }}>${amt}</Typography>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography sx={{ textDecoration: 'line-through', color: '#9CA89E', fontSize: '10px', lineHeight: 1.2 }}>
                                {fullPts.toLocaleString()}
                              </Typography>
                              <Typography sx={{ fontWeight: 700, color: '#5A8A7A', fontSize: '12px', lineHeight: 1.2 }}>
                                {discPts.toLocaleString()} pts
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                    <Box sx={{ backgroundColor: 'rgba(90, 138, 122, 0.08)', borderRadius: '10px', px: 2, py: 1.5, textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#3D4A3E' }}>
                        <strong>${selectedAmount}</strong> for{' '}
                        <strong>{getDiscountedPoints(selectedAmount, claimDialog.deal_discount_percentage).toLocaleString()} pts</strong>
                        <Typography component="span" sx={{ color: '#5A8A7A', fontWeight: 600, ml: 1 }}>
                          (save {(selectedAmount * POINTS_PER_DOLLAR - getDiscountedPoints(selectedAmount, claimDialog.deal_discount_percentage)).toLocaleString()} pts)
                        </Typography>
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 3, lineHeight: 1.6 }}>
                    {getConfirmBody(claimDialog)}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button variant="outlined" fullWidth onClick={closeClaimDialog}
                    sx={{ py: 1.3, borderColor: 'rgba(61, 74, 62, 0.2)', color: '#5C6B5E', borderRadius: '10px' }}>
                    Cancel
                  </Button>
                  <Button variant="contained" fullWidth
                    onClick={() => {
                      if (claimDialog?.type === 'deal' && claimDialog?.deal_discount_percentage) {
                        setDealConfirm(true);
                      } else {
                        handleConfirmClaim();
                      }
                    }}
                    disabled={claimLoading}
                    sx={{ py: 1.3, borderRadius: '10px', background: 'linear-gradient(135deg, #D4956A, #C4854A)', '&:hover': { background: 'linear-gradient(135deg, #C4854A, #B4753A)' } }}>
                    {claimLoading ? <CircularProgress size={22} sx={{ color: '#FFF' }} /> : (
                      claimDialog?.type === 'deal' && claimDialog?.deal_discount_percentage ? 'Redeem' : 'Confirm'
                    )}
                  </Button>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Claim Success Dialog */}
      <Dialog
        open={!!claimResult}
        onClose={closeClaimDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: {
          borderRadius: '16px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)'
        } }}
        slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(61, 74, 62, 0.6)', backdropFilter: 'blur(4px)' } } }}
      >
        <DialogContent sx={{ p: { xs: 3, md: 4 }, position: 'relative', textAlign: 'center' }}>
          <IconButton onClick={closeClaimDialog} sx={{ position: 'absolute', top: 12, right: 12, color: '#5C6B5E' }}>
            <CloseIcon />
          </IconButton>
          <Fade in timeout={500}>
            {claimDialog?.type === 'deal' && claimResult?.redemption ? (
              /* Deal: redemption-style success screen */
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <HourglassEmptyIcon sx={{ fontSize: 72, color: '#D4956A', mb: 2 }} />
                <Typography variant="h4" sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D', mb: 1 }}>
                  Request Submitted!
                </Typography>
                <Typography variant="body1" sx={{ color: '#5C6B5E', mb: 1 }}>
                  {claimDialog?.title} - ${selectedAmount} value
                </Typography>
                <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 0.5 }}>
                  {claimResult.redemption.points_redeemed?.toLocaleString()} points redeemed
                </Typography>
                <Typography variant="body2" sx={{ color: '#2D2D2D', fontWeight: 600, mb: 2 }}>
                  Remaining points: {claimResult.redemption.remaining_redeemable_points?.toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 3, lineHeight: 1.6 }}>
                  Your code will be sent once processed by the NoorVana team. You can track it on your Redemptions page.
                </Typography>
                <Button
                  variant="contained"
                  onClick={closeClaimDialog}
                  sx={{
                    minWidth: 160,
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #D4956A, #C4854A)',
                    '&:hover': { background: 'linear-gradient(135deg, #C4854A, #B4753A)' }
                  }}
                >
                  Done
                </Button>
              </Box>
            ) : (
              /* Experience / Giveaway: existing success screen */
              <Box sx={{ py: 2, textAlign: 'center' }}>
                <CheckCircleOutlineIcon sx={{ fontSize: 64, color: '#5A8A7A', mb: 2 }} />
                <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D', mb: 1 }}>
                  {claimDialog?.type === 'giveaway' ? "You're Entered!" : 'Claimed!'}
                </Typography>
                <Typography variant="body1" sx={{ color: '#5C6B5E', mb: 3, lineHeight: 1.6 }}>
                  {claimResult?.message}
                </Typography>
                <Button
                  variant="contained"
                  onClick={closeClaimDialog}
                  sx={{
                    mt: 1,
                    minWidth: 140,
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #D4956A, #C4854A)',
                    '&:hover': { background: 'linear-gradient(135deg, #C4854A, #B4753A)' }
                  }}
                >
                  Done
                </Button>
              </Box>
            )}
          </Fade>
        </DialogContent>
      </Dialog>

      {/* Deal Confirmation Dialog */}
      <Dialog
        open={dealConfirm}
        onClose={() => setDealConfirm(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden' } }}
        slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(61, 74, 62, 0.6)', backdropFilter: 'blur(4px)' } } }}
      >
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
                {claimDialog?.reward_name || claimDialog?.title}
              </Typography>
              <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Code delivered to your redemptions list</Typography>
            </Box>
            <Box sx={{ background: 'rgba(61, 74, 62, 0.04)', borderRadius: '12px', p: 2.5, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Card Value</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#2D2D2D' }}>${selectedAmount}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Points to Deduct</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#C1592E' }}>
                  -{claimDialog?.deal_discount_percentage ? getDiscountedPoints(selectedAmount, claimDialog.deal_discount_percentage).toLocaleString() : '0'}
                </Typography>
              </Box>
              {claimDialog?.deal_discount_percentage && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2" sx={{ color: '#5C6B5E' }}>You Save</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#5A8A7A' }}>
                    {(selectedAmount * POINTS_PER_DOLLAR - getDiscountedPoints(selectedAmount, claimDialog.deal_discount_percentage)).toLocaleString()} pts ({claimDialog.deal_discount_percentage}% off)
                  </Typography>
                </Box>
              )}
              <Box sx={{ borderTop: '1px solid rgba(61, 74, 62, 0.1)', pt: 1.5, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Remaining Balance</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#2D2D2D' }}>
                  {claimDialog?.deal_discount_percentage
                    ? (clientPoints - getDiscountedPoints(selectedAmount, claimDialog.deal_discount_percentage)).toLocaleString()
                    : clientPoints.toLocaleString()
                  } pts
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => setDealConfirm(false)}
                sx={{ py: 1.3, borderColor: 'rgba(61, 74, 62, 0.2)', color: '#5C6B5E', borderRadius: '10px' }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                fullWidth
                onClick={() => { setDealConfirm(false); handleConfirmClaim(); }}
                disabled={claimLoading}
                sx={{
                  py: 1.3,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #D4956A, #C4854A)',
                  '&:hover': { background: 'linear-gradient(135deg, #C4854A, #B4753A)' }
                }}
              >
                {claimLoading ? <CircularProgress size={22} sx={{ color: '#FFF' }} /> : 'Confirm'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={() => setToast(t => ({ ...t, open: false }))}
      />
    </Box>
  );
};

export default OffersPage;
