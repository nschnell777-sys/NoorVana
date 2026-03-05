import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box, Typography, Grid, Button, Chip, Snackbar, Alert
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import StyleOutlinedIcon from '@mui/icons-material/StyleOutlined';
import RedeemOutlinedIcon from '@mui/icons-material/Redeem';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import { getRedemptions, getCardRequests, getGiftClaims, getConciergeRequests } from '../services/api';
import { frostedCardSx } from '../theme';

import ServiceCreditsTab from './fulfillment/ServiceCreditsTab';
import ProductCreditsTab from './fulfillment/ProductCreditsTab';
import GiftCardsTab from './fulfillment/GiftCardsTab';
import RequestedCardsTab from './fulfillment/RequestedCardsTab';
import GiftsTab from './fulfillment/GiftsTab';
import ConciergeTab from './fulfillment/ConciergeTab';

const CATEGORIES = [
  { key: 'serviceCredits', label: 'Service Credits', desc: 'Invoice credits & service discounts', icon: <ReceiptLongOutlinedIcon sx={{ fontSize: 36 }} />, color: '#D4956A' },
  { key: 'productCredits', label: 'Product Credits', desc: 'Product discount codes', icon: <ShoppingBagOutlinedIcon sx={{ fontSize: 36 }} />, color: '#D4956A' },
  { key: 'giftCards', label: 'Gift Cards', desc: 'Gift card redemptions', icon: <CardGiftcardOutlinedIcon sx={{ fontSize: 36 }} />, color: '#D4956A' },
  { key: 'requestedCards', label: 'Card Requests', desc: 'Custom gift card requests', icon: <StyleOutlinedIcon sx={{ fontSize: 36 }} />, color: '#D4956A' },
  { key: 'gifts', label: 'Gifts', desc: 'Tier gifts & fulfillment', icon: <RedeemOutlinedIcon sx={{ fontSize: 36 }} />, color: '#D4956A' },
  { key: 'concierge', label: 'Concierge Hours', desc: 'VIP concierge services', icon: <SupportAgentOutlinedIcon sx={{ fontSize: 36 }} />, color: '#D4956A' },
];

const TAB_COMPONENTS = [ServiceCreditsTab, ProductCreditsTab, GiftCardsTab, RequestedCardsTab, GiftsTab, ConciergeTab];

const FulfillmentCenterPage = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab ?? null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Navigate from DashboardPage with state.tab → open detail mode directly
  useEffect(() => {
    if (location.state?.tab != null) {
      setActiveTab(location.state.tab);
    }
  }, [location.state?.tab, location.state?.ts]);

  const [counts, setCounts] = useState({
    serviceCredits: 0, productCredits: 0, giftCards: 0,
    requestedCards: 0, gifts: 0, concierge: 0
  });
  const [summaryStats, setSummaryStats] = useState({
    totalPointsRedeemed: 0, totalRedemptionAmount: 0,
    giftsDelivered: 0, conciergeHoursCompleted: 0,
    scAmount: 0, pcAmount: 0, gcAmount: 0
  });

  const showToast = useCallback((message, severity = 'success') => {
    setToast({ open: true, message, severity });
  }, []);

  // Fetch all pending counts and summary stats on mount
  useEffect(() => {
    const fetchAllCounts = async () => {
      try {
        const [pendingRes, allRedemptionsRes, cardReqRes, giftsRes, conciergeRes] = await Promise.all([
          getRedemptions({ status: 'pending' }),
          getRedemptions(),
          getCardRequests(),
          getGiftClaims(),
          getConciergeRequests()
        ]);
        // Pending counts
        const pendingRedemptions = pendingRes.data.redemptions || [];
        const sc = pendingRedemptions.filter(r => !r.reward_category || r.reward_category === 'service_credit').length;
        const pc = pendingRedemptions.filter(r => r.reward_category === 'product_credit').length;
        const gc = pendingRedemptions.filter(r => r.reward_category === 'gift_card').length;
        const cr = (cardReqRes.data.requests || []).filter(r => r.status === 'pending').length;
        const gi = (giftsRes.data.claims || []).filter(c => ['claimed', 'processing', 'shipped'].includes(c.status)).length;
        const co = (conciergeRes.data.requests || []).filter(r => ['new', 'reviewing', 'quoted', 'approved', 'connected'].includes(r.status)).length;
        setCounts({ serviceCredits: sc, productCredits: pc, giftCards: gc, requestedCards: cr, gifts: gi, concierge: co });

        // Summary stats from all redemptions
        const allRedemptions = allRedemptionsRes.data.redemptions || [];
        const fulfilled = allRedemptions.filter(r => r.status === 'fulfilled');
        const totalPointsRedeemed = fulfilled.reduce((sum, r) => sum + (parseFloat(r.points_redeemed) || 0), 0);
        const totalRedemptionAmount = fulfilled.reduce((sum, r) => sum + (parseFloat(r.credit_amount) || 0), 0);
        const scAmount = fulfilled.filter(r => !r.reward_category || r.reward_category === 'service_credit').reduce((sum, r) => sum + (parseFloat(r.credit_amount) || 0), 0);
        const pcAmount = fulfilled.filter(r => r.reward_category === 'product_credit').reduce((sum, r) => sum + (parseFloat(r.credit_amount) || 0), 0);
        const gcAmount = fulfilled.filter(r => r.reward_category === 'gift_card').reduce((sum, r) => sum + (parseFloat(r.credit_amount) || 0), 0);
        const giftsDelivered = (giftsRes.data.claims || []).filter(c => c.status === 'delivered').length;
        const conciergeHoursCompleted = (conciergeRes.data.requests || [])
          .filter(r => r.status === 'completed')
          .reduce((sum, r) => sum + (parseFloat(r.hours_allocated) || 0), 0);
        setSummaryStats({ totalPointsRedeemed, totalRedemptionAmount, giftsDelivered, conciergeHoursCompleted, scAmount, pcAmount, gcAmount });
      } catch (err) {
        console.error('Failed to fetch pending counts', err);
      }
    };
    fetchAllCounts();
  }, []);

  const countHandlers = useMemo(() => ({
    serviceCredits: (count) => setCounts(prev => ({ ...prev, serviceCredits: count })),
    productCredits: (count) => setCounts(prev => ({ ...prev, productCredits: count })),
    giftCards: (count) => setCounts(prev => ({ ...prev, giftCards: count })),
    requestedCards: (count) => setCounts(prev => ({ ...prev, requestedCards: count })),
    gifts: (count) => setCounts(prev => ({ ...prev, gifts: count })),
    concierge: (count) => setCounts(prev => ({ ...prev, concierge: count }))
  }), []);

  const totalPending = counts.serviceCredits + counts.productCredits + counts.giftCards + counts.requestedCards + counts.gifts + counts.concierge;

  const activeCat = activeTab != null ? CATEGORIES[activeTab] : null;
  const ActiveComponent = activeTab != null ? TAB_COMPONENTS[activeTab] : null;
  const activeCountKey = activeCat?.key;

  return (
    <Box>
      {activeTab === null ? (
        /* ── Landing Mode ── */
        <>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Typography variant="h3" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, color: '#2D2D2D' }}>
                Redemptions
              </Typography>
              {totalPending > 0 && (
                <Chip
                  label={`${totalPending} need${totalPending !== 1 ? '' : 's'} attention`}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(212, 149, 106, 0.12)',
                    color: '#C1592E',
                    fontWeight: 600,
                    fontSize: '12px',
                    height: 26,
                  }}
                />
              )}
            </Box>
            <Typography variant="body2" sx={{ color: '#5C6B5E' }}>
              Manage all client rewards, redemptions, and fulfillment
            </Typography>
          </Box>

          {/* Summary Stats Row */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {[
              { label: 'Total Points Redeemed', value: summaryStats.totalPointsRedeemed.toLocaleString(), sub: 'across all categories' },
              { label: 'Total Redemption Amount', value: `$${summaryStats.totalRedemptionAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: 'in fulfilled credits' },
              { label: 'Gifts Delivered', value: String(summaryStats.giftsDelivered), sub: 'tier gifts shipped' },
              { label: 'Concierge Hours Completed', value: String(summaryStats.conciergeHoursCompleted), sub: 'hours of service' },
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

          <Box sx={{ ...frostedCardSx, p: 3, '&:hover': { transform: 'none' } }}>
            <Grid container spacing={2.5}>
              {CATEGORIES.map((cat, idx) => {
                const count = counts[cat.key];
                const hasItems = count > 0;
                return (
                  <Grid item xs={12} sm={6} md={4} key={cat.key}>
                    <Box
                      onClick={() => setActiveTab(idx)}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 1.5,
                        py: 3,
                        px: 2,
                        borderRadius: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        backgroundColor: hasItems ? 'rgba(212,149,106,0.06)' : 'rgba(61,74,62,0.04)',
                        border: hasItems
                          ? '1px solid rgba(212,149,106,0.18)'
                          : '1px solid rgba(61,74,62,0.12)',
                        borderLeftWidth: '4px',
                        borderLeftColor: hasItems ? cat.color : 'rgba(61,74,62,0.15)',
                        '&:hover': {
                          backgroundColor: hasItems
                            ? 'rgba(212,149,106,0.1)'
                            : 'rgba(61,74,62,0.07)',
                          transform: 'translateY(-3px)',
                          boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
                        },
                      }}
                    >
                      <Box sx={{ color: hasItems ? cat.color : '#6B7A6D', display: 'flex' }}>
                        {cat.icon}
                      </Box>
                      <Typography sx={{
                        fontFamily: '"Outfit", sans-serif',
                        fontWeight: 600,
                        fontSize: '15px',
                        color: hasItems ? '#2D2D2D' : '#4A5A4C',
                        textAlign: 'center',
                      }}>
                        {cat.label}
                      </Typography>
                      <Typography sx={{
                        fontFamily: '"Outfit", sans-serif',
                        fontWeight: 700,
                        fontSize: '28px',
                        color: hasItems ? cat.color : '#6B7A6D',
                        lineHeight: 1,
                      }}>
                        {count}
                      </Typography>
                      <Typography variant="caption" sx={{
                        color: '#6B7A6D',
                        fontSize: '11px',
                        textAlign: 'center',
                        lineHeight: 1.3,
                      }}>
                        {cat.desc}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </>
      ) : (
        /* ── Detail Mode ── */
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
            <Button
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => setActiveTab(null)}
              sx={{
                color: '#5C6B5E',
                fontWeight: 500,
                fontSize: '13px',
                textTransform: 'none',
                '&:hover': { backgroundColor: 'rgba(61,74,62,0.06)' },
              }}
            >
              Back to Redemptions
            </Button>
            <Typography variant="h4" sx={{
              fontFamily: '"Outfit", sans-serif',
              fontWeight: 600,
              color: '#2D2D2D',
              ml: 'auto',
            }}>
              {activeCat.label}
            </Typography>
          </Box>

          <ActiveComponent
            showToast={showToast}
            onCountChange={countHandlers[activeCountKey]}
            redemptionStats={summaryStats}
          />
        </>
      )}

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast(prev => ({ ...prev, open: false }))}
          sx={{ borderRadius: '10px' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FulfillmentCenterPage;
