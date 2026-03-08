import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button
} from '@mui/material';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import { useNavigate } from 'react-router-dom';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { getLoyaltyStatus, getTransactions } from '../services/api';
import { formatPoints, formatCurrency } from '../utils/formatters';
import { TIER_MULTIPLIERS, TIER_LABELS, REDEMPTION_POINTS_PER_UNIT, REDEMPTION_CREDIT_PER_UNIT } from '../utils/tierConfig';
import LoadingSpinner from '../components/LoadingSpinner';
import StatCard from '../components/StatCard';
import TierBadge from '../components/TierBadge';
import Toast from '../components/Toast';

const frostedCardSx = {
  background: 'rgba(255, 255, 255, 0.75)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  borderRadius: '12px',
  p: { xs: 2.5, md: 3.5 },
  boxShadow: '0 2px 20px rgba(0,0,0,0.06)'
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const lifetime = payload.find((p) => p.dataKey === 'lifetime');
  const balance = payload.find((p) => p.dataKey === 'balance');
  const lifetimeVal = lifetime ? Number(lifetime.value) : 0;
  const balanceVal = balance ? Number(balance.value) : 0;
  return (
    <Box
      sx={{
        background: '#FFF',
        borderRadius: '10px',
        px: 2,
        py: 1.5,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        border: '1px solid rgba(61, 74, 62, 0.08)'
      }}
    >
      <Typography sx={{ color: '#8A9A8C', fontSize: '11px', mb: 0.75 }}>
        {label}
      </Typography>
      <Typography sx={{ color: '#2D2D2D', fontSize: '13px', fontWeight: 600 }}>
        Lifetime: {lifetimeVal.toLocaleString()} pts
      </Typography>
      <Typography sx={{ color: '#C1592E', fontSize: '13px', fontWeight: 600 }}>
        Balance: {balanceVal.toLocaleString()} pts
      </Typography>
      {lifetimeVal > balanceVal && (
        <Typography sx={{ color: '#8A9A8C', fontSize: '11px', mt: 0.25 }}>
          Redeemed: {(lifetimeVal - balanceVal).toLocaleString()} pts
        </Typography>
      )}
    </Box>
  );
};

const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const earned = payload.find((p) => p.dataKey === 'earned');
  return (
    <Box
      sx={{
        background: '#FFF',
        borderRadius: '10px',
        px: 2,
        py: 1.5,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        border: '1px solid rgba(61, 74, 62, 0.08)'
      }}
    >
      <Typography sx={{ color: '#8A9A8C', fontSize: '11px', mb: 0.75 }}>
        {label}
      </Typography>
      {earned && (
        <Typography sx={{ color: '#3D4A3E', fontSize: '13px', fontWeight: 600 }}>
          {Number(earned.value).toLocaleString()} pts earned
        </Typography>
      )}
    </Box>
  );
};

const DashboardPage = () => {
  const { client, updateClient, isUnenrolled } = useAuth();
  const navigate = useNavigate();
  const [loyalty, setLoyalty] = useState(null);
  const [allPoints, setAllPoints] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [chartRange, setChartRange] = useState('ALL');
  const [barRange, setBarRange] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const fetchData = useCallback(async () => {
    if (!client?.id) return;
    try {
      const loyaltyRes = await getLoyaltyStatus(client.id);
      setLoyalty(loyaltyRes.data);
      if (loyaltyRes.data.current_tier && loyaltyRes.data.current_tier !== client?.current_tier) {
        updateClient({ current_tier: loyaltyRes.data.current_tier });
      }

      // Fetch all transactions (paginate through 100 at a time)
      let allTx = [];
      let page = 1;
      let totalPages = 1;
      while (page <= totalPages) {
        const txRes = await getTransactions(client.id, { page, limit: 100 });
        allTx = allTx.concat(txRes.data.transactions || []);
        totalPages = txRes.data.pagination?.total_pages || 1;
        page++;
      }

      // Build raw points data from transactions (oldest first)
      const txList = allTx.slice().reverse();
      setAllTransactions(txList);
      setAllPoints(txList.map((tx) => ({
        ts: new Date(tx.date).getTime(),
        lifetime: tx.lifetime_balance || 0,
        balance: tx.balance || 0
      })));
    } catch (err) {
      console.error('Failed to load dashboard data', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [client?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const RANGE_OPTIONS = [
    { key: '1M', label: '1M', months: 1 },
    { key: '3M', label: '3M', months: 3 },
    { key: '6M', label: '6M', months: 6 },
    { key: '1Y', label: '1Y', months: 12 },
    { key: '2Y', label: '2Y', months: 24 },
    { key: '5Y', label: '5Y', months: 60 },
    { key: 'ALL', label: 'All', months: null }
  ];

  const chartData = useMemo(() => {
    if (!allPoints.length) return [];

    // Exclude current month
    const now = new Date();
    const curMonthKey = `${now.getFullYear()}-${now.getMonth()}`;

    // Filter by range
    const rangeDef = RANGE_OPTIONS.find((r) => r.key === chartRange);
    let filtered = allPoints;
    if (rangeDef?.months) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - rangeDef.months);
      filtered = allPoints.filter((p) => p.ts >= cutoff.getTime());
    }
    if (!filtered.length) return [];

    // Smart date formatting + dedup based on range span
    const spanMs = filtered[filtered.length - 1].ts - filtered[0].ts;
    const spanDays = spanMs / (1000 * 60 * 60 * 24);

    let dateKey, dateLabel;
    if (spanDays <= 90) {
      // Under 3 months: show "Jan 15, '26"
      dateKey = (ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
      dateLabel = dateKey;
    } else if (spanDays <= 730) {
      // Under 2 years: show "Jan '26", dedup by month
      dateKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}`; };
      dateLabel = (ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    } else {
      // Over 2 years: show "Jan '26", dedup by month
      dateKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}`; };
      dateLabel = (ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }

    const byKey = new Map();
    filtered.forEach((p) => {
      const key = dateKey(p.ts);
      // Skip current month when grouped by month
      if (spanDays > 90 && key === curMonthKey) return;
      byKey.set(key, { date: dateLabel(p.ts), lifetime: p.lifetime, balance: p.balance });
    });
    return Array.from(byKey.values());
  }, [allPoints, chartRange]);

  const BAR_RANGE_OPTIONS = [
    { key: '3M', label: '3M', months: 3 },
    { key: '6M', label: '6M', months: 6 },
    { key: '1Y', label: '1Y', months: 12 },
    { key: 'ALL', label: 'All', months: null }
  ];

  const barChartData = useMemo(() => {
    if (!allTransactions.length) return [];

    const rangeDef = BAR_RANGE_OPTIONS.find((r) => r.key === barRange);
    let filtered = allTransactions;
    if (rangeDef?.months) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - rangeDef.months);
      filtered = allTransactions.filter((tx) => new Date(tx.date) >= cutoff);
    }

    // Aggregate by month
    const monthMap = new Map();
    filtered.forEach((tx) => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, { key, earned: 0, redeemed: 0 });
      }
      const entry = monthMap.get(key);
      if (tx.type === 'earn') {
        entry.earned += tx.points_earned || 0;
      } else if (tx.type === 'redeem') {
        entry.redeemed += tx.points_redeemed || 0;
      } else if (tx.type === 'adjustment') {
        const adj = tx.points_adjusted || 0;
        if (adj > 0) entry.earned += adj;
        else entry.redeemed += Math.abs(adj);
      }
    });

    // Exclude current month
    const now = new Date();
    const curMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Sort by month key, exclude current month, and format labels
    return Array.from(monthMap.values())
      .filter((m) => m.key !== curMonthKey)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((m) => {
        const [y, mo] = m.key.split('-');
        const d = new Date(parseInt(y), parseInt(mo) - 1);
        return {
          month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          earned: m.earned,
          redeemed: m.redeemed
        };
      });
  }, [allTransactions, barRange]);

  if (loading) return <LoadingSpinner message="Loading your rewards..." />;
  if (error) {
    return (
      <Box sx={{ p: 5, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ color: '#C1592E', mb: 2 }}>Something went wrong</Typography>
        <Typography variant="body1" sx={{ color: '#5C6B5E', mb: 3 }}>{error}</Typography>
        <Button variant="contained" onClick={() => { setError(null); setLoading(true); fetchData(); }}>
          Try Again
        </Button>
      </Box>
    );
  }
  if (!loyalty) return null;

  const firstName = loyalty.name?.split(' ')[0] || 'Member';
  const currentTier = loyalty.current_tier;
  const creditAvailable = Math.floor(loyalty.redeemable_points / REDEMPTION_POINTS_PER_UNIT) * REDEMPTION_CREDIT_PER_UNIT;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {/* Hero Greeting */}
      <Box
        sx={{
          background: 'linear-gradient(145deg, #2A332B 0%, #3D4A3E 50%, #4A5A4C 100%)',
          px: { xs: 3, md: 5 },
          py: { xs: 4, md: 5 },
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(212, 149, 106, 0.06)',
            filter: 'blur(40px)'
          }}
        />

        <Typography
          variant="h2"
          sx={{
            fontFamily: '"Outfit", sans-serif',
            color: '#EFEBE4',
            fontSize: { xs: '24px', sm: '28px', md: '28px' },
            mb: 1,
            position: 'relative'
          }}
        >
          Welcome back, {firstName}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography
            sx={{
              fontSize: '12px',
              letterSpacing: '2.5px',
              textTransform: 'uppercase',
              color: 'rgba(239, 235, 228, 0.5)'
            }}
          >
            {TIER_LABELS[currentTier]} Member
          </Typography>
          <Typography
            sx={{
              fontSize: '12px',
              letterSpacing: '1.5px',
              color: 'rgba(239, 235, 228, 0.35)'
            }}
          >
            {TIER_MULTIPLIERS[currentTier]}x Points Multiplier
          </Typography>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ px: { xs: 2, md: 5 }, pt: { xs: 3, md: 4 }, pb: { xs: 2, md: 2.5 } }}>
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
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#2D2D2D' }}>
                Your account was unenrolled{loyalty?.unenrolled_at ? ` on ${new Date(loyalty.unenrolled_at).toLocaleDateString()}` : ''}.
              </Typography>
              <Typography variant="caption" sx={{ color: '#5C6B5E' }}>
                You can view your history and statistics, but rewards and redemptions are no longer available.
              </Typography>
            </Box>
          </Box>
        )}

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              icon={<EmojiEventsOutlinedIcon sx={{ fontSize: 28 }} />}
              label="Current Tier"
              iconSx={{ backgroundColor: 'rgba(212, 149, 106, 0.12)', borderRadius: '12px', width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto' }}
            >
              <Box sx={{ mt: 1, mb: 0.5 }}>
                <TierBadge tier={currentTier} size="large" />
              </Box>
            </StatCard>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              icon={<StarOutlineIcon sx={{ fontSize: 28 }} />}
              label="Points Balance"
              value={formatPoints(loyalty.redeemable_points)}
              subtext={`Lifetime: ${formatPoints(loyalty.lifetime_points)}`}
              iconSx={{ backgroundColor: 'rgba(61, 74, 62, 0.1)', borderRadius: '12px', width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', color: '#3D4A3E' }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              icon={<AccountBalanceWalletOutlinedIcon sx={{ fontSize: 28 }} />}
              label="Credit Available"
              value={formatCurrency(creditAvailable)}
              subtext="1,000 pts = $5.00"
              iconSx={{ backgroundColor: 'rgba(90, 138, 122, 0.1)', borderRadius: '12px', width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', color: '#5A8A7A' }}
            />
          </Grid>
        </Grid>

        {/* Charts Row */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
        <Box
          sx={{
            background: '#F0ECE6',
            borderRadius: '16px',
            overflow: 'hidden',
            height: '100%',
            border: '1px solid rgba(61, 74, 62, 0.08)',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03), 0 2px 12px rgba(0,0,0,0.04)'
          }}
        >
          <Box sx={{ px: { xs: 2.5, md: 3.5 }, pt: { xs: 2.5, md: 3 }, pb: 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Typography
                sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D', fontWeight: 500, fontSize: '18px' }}
              >
                Monthly Activity
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '3px', backgroundColor: '#3D4A3E' }} />
                <Typography sx={{ color: '#8A9A8C', fontSize: '11px', fontWeight: 500 }}>
                  Earned
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
              {BAR_RANGE_OPTIONS.map((r) => (
                <Box
                  key={r.key}
                  onClick={() => setBarRange(r.key)}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: barRange === r.key ? 600 : 400,
                    color: barRange === r.key ? '#FFF' : '#5C6B5E',
                    backgroundColor: barRange === r.key ? '#2D2D2D' : 'transparent',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: barRange === r.key ? '#2D2D2D' : 'rgba(61, 74, 62, 0.06)'
                    }
                  }}
                >
                  {r.label}
                </Box>
              ))}
            </Box>
          </Box>

          {barChartData.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, px: 3 }}>
              <StarOutlineIcon sx={{ fontSize: 40, color: 'rgba(212, 149, 106, 0.25)', mb: 1 }} />
              <Typography variant="body2" sx={{ color: '#5C6B5E' }}>
                No activity yet. Your monthly breakdown will appear here as you earn and redeem points.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ px: { xs: 0.5, md: 1 }, pb: 2 }}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barChartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }} barCategoryGap="20%">
                  <CartesianGrid stroke="rgba(61, 74, 62, 0.06)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: '#8A9A8C' }}
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#8A9A8C' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                    width={40}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(61, 74, 62, 0.04)' }} />
                  <Bar dataKey="earned" name="Earned" fill="#3D4A3E" radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Box>
        </Grid>

        <Grid item xs={12} md={6}>
        <Box
          sx={{
            background: '#F0ECE6',
            borderRadius: '16px',
            overflow: 'hidden',
            height: '100%',
            border: '1px solid rgba(61, 74, 62, 0.08)',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03), 0 2px 12px rgba(0,0,0,0.04)'
          }}
        >
          {/* Chart Header */}
          <Box sx={{ px: { xs: 2.5, md: 3.5 }, pt: { xs: 2.5, md: 3 }, pb: 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Typography
                sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D', fontWeight: 500, fontSize: '18px' }}
              >
                Points History
              </Typography>
              {/* Legend */}
              <Box sx={{ display: 'flex', gap: 2.5, mt: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 16, height: 2.5, borderRadius: 2, backgroundColor: '#2D2D2D' }} />
                  <Typography sx={{ color: '#8A9A8C', fontSize: '11px', fontWeight: 500 }}>
                    Lifetime
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 16, height: 2.5, borderRadius: 2, backgroundColor: '#D4956A' }} />
                  <Typography sx={{ color: '#8A9A8C', fontSize: '11px', fontWeight: 500 }}>
                    Balance
                  </Typography>
                </Box>
              </Box>
            </Box>
            {/* Range selector */}
            <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
              {RANGE_OPTIONS.map((r) => (
                <Box
                  key={r.key}
                  onClick={() => setChartRange(r.key)}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: chartRange === r.key ? 600 : 400,
                    color: chartRange === r.key ? '#FFF' : '#5C6B5E',
                    backgroundColor: chartRange === r.key ? '#2D2D2D' : 'transparent',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: chartRange === r.key ? '#2D2D2D' : 'rgba(61, 74, 62, 0.06)'
                    }
                  }}
                >
                  {r.label}
                </Box>
              ))}
            </Box>
          </Box>

          {chartData.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, px: 3 }}>
              <StarOutlineIcon sx={{ fontSize: 40, color: 'rgba(212, 149, 106, 0.25)', mb: 1 }} />
              <Typography variant="body2" sx={{ color: '#5C6B5E' }}>
                No points history yet. Your chart will grow as you earn points.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ px: { xs: 0.5, md: 1 }, pb: 2 }}>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D4956A" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#D4956A" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(61, 74, 62, 0.06)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#8A9A8C' }}
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#8A9A8C' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    name="Balance"
                    stroke="#D4956A"
                    strokeWidth={2}
                    fill="url(#gradBalance)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#D4956A', stroke: '#fff', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="lifetime"
                    name="Lifetime"
                    stroke="#2D2D2D"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#2D2D2D', stroke: '#fff', strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Box>
        </Grid>
        </Grid>

        {/* Quick Actions */}
        {!isUnenrolled && (
          <Grid container spacing={2.5}>
            {[
              {
                icon: <CardGiftcardOutlinedIcon sx={{ fontSize: 28 }} />,
                title: 'Redeem Rewards',
                desc: 'Gift cards, credits & more',
                path: '/redeem',
                color: '#D4956A'
              },
              {
                icon: <ExploreOutlinedIcon sx={{ fontSize: 28 }} />,
                title: 'Explore Benefits',
                desc: 'Your tier perks & services',
                path: '/benefits',
                color: '#3D4A3E'
              },
              {
                icon: <LocalOfferOutlinedIcon sx={{ fontSize: 28 }} />,
                title: 'View Offers',
                desc: 'Deals, experiences & giveaways',
                path: '/offers',
                color: '#5A8A7A'
              }
            ].map((action) => (
              <Grid item xs={12} sm={4} key={action.path}>
                <Box
                  onClick={() => navigate(action.path)}
                  sx={{
                    background: 'rgba(255, 255, 255, 0.45)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(61, 74, 62, 0.12)',
                    borderLeftWidth: '4px',
                    borderLeftColor: action.color,
                    borderRadius: '14px',
                    px: { xs: 3, md: 4 },
                    py: { xs: 5, md: 6 },
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    transition: 'all 0.25s ease',
                    boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 30px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  <Box sx={{
                    mb: 2,
                    color: action.color,
                    backgroundColor: `${action.color}18`,
                    borderRadius: '14px',
                    width: 60,
                    height: 60,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {action.icon}
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: '"Outfit", sans-serif',
                      fontWeight: 700,
                      color: '#2D2D2D',
                      fontSize: '18px',
                      mb: 0.75
                    }}
                  >
                    {action.title}
                  </Typography>
                  <Typography
                    sx={{
                      color: '#5C6B5E',
                      fontSize: '13px'
                    }}
                  >
                    {action.desc}
                  </Typography>
                  <ArrowForwardIcon sx={{ fontSize: 20, color: action.color, mt: 2, opacity: 0.6 }} />
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

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

export default DashboardPage;
