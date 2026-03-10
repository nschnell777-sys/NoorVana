import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Grid, Typography, Box, Chip, Button, CircularProgress, Select, MenuItem, ToggleButton, ToggleButtonGroup } from '@mui/material';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import StyleOutlinedIcon from '@mui/icons-material/StyleOutlined';
import RedeemOutlinedIcon from '@mui/icons-material/Redeem';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useNavigate } from 'react-router-dom';
import { ComposedChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { getDashboardSummary, getMonthlyStats, getRedemptions, getCardRequests, getGiftClaims, getConciergeRequests } from '../services/api';
import { frostedCardSx, CHART_COLORS } from '../theme';
import LoadingSpinner from '../components/LoadingSpinner';

const TIME_PERIODS = [
  { label: '1M', months: 1, granularity: 'week' },
  { label: '3M', months: 3, granularity: 'week' },
  { label: '6M', months: 6, granularity: 'week' },
  { label: 'YTD', months: 0, granularity: 'auto' },
  { label: '1Y', months: 12, granularity: 'month' },
  { label: '2Y', months: 24, granularity: 'month' },
  { label: '5Y', months: 60, granularity: 'month' },
  { label: 'All', months: 999, granularity: 'month' }
];

const TREND_TIMEFRAMES = [
  { label: 'W', backendGranularity: 'week', aggregateCount: 1 },
  { label: '2W', backendGranularity: 'week', aggregateCount: 2 },
  { label: '1M', backendGranularity: 'month', aggregateCount: 1 },
  { label: '3M', backendGranularity: 'month', aggregateCount: 3 },
  { label: '6M', backendGranularity: 'month', aggregateCount: 6 },
];

const PERIOD_ALLOWED_TF = {
  '1M':  { allowed: ['W'],               default: 'W' },
  '3M':  { allowed: ['W', '2W', '1M'],   default: '1M' },
  '6M':  { allowed: ['W', '2W', '1M'],   default: '1M' },
  '1Y':  { allowed: ['2W', '1M', '3M'],  default: '1M' },
  '2Y':  { allowed: ['1M', '3M', '6M'],  default: '3M' },
  '5Y':  { allowed: ['1M', '3M', '6M'],  default: '3M' },
  'All': { allowed: ['1M', '3M', '6M'],  default: '6M' },
};

const compactSelectSx = {
  minWidth: 70, '& .MuiSelect-select': { py: 0.5, px: 1.5, fontSize: '12px', fontWeight: 600 },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(61,74,62,0.15)' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(61,74,62,0.3)' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#3D4A3E' }
};

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.95)',
  border: '1px solid rgba(61,74,62,0.12)',
  borderRadius: '10px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  fontSize: '13px'
};

const TIER_COLORS = {
  bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700',
  platinum: '#e5e4e2', diamond: '#b9f2ff'
};

const STATE_COLORS = ['#3D4A3E', '#D4956A', '#5A8A7A', '#8B6F5E', '#7BA696'];

const STATE_NAMES = {
  TX: 'Texas', FL: 'Florida', AZ: 'Arizona', SC: 'South Carolina',
  SD: 'South Dakota', CA: 'California', NY: 'New York', IL: 'Illinois',
  GA: 'Georgia', NC: 'North Carolina', OH: 'Ohio', PA: 'Pennsylvania',
  VA: 'Virginia', WA: 'Washington', CO: 'Colorado', MA: 'Massachusetts'
};

const fmtCurrency = (v) => `$${(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Compute date_from and date_to for a clicked trend bar */
const getDateRangeFromTrendItem = (item) => {
  // For aggregated buckets with _rangeEnd, compute the full range
  if (item._rangeEnd) {
    const startRange = getDateRangeFromTrendItem({ week: item.week, month: item.month });
    // _rangeEnd could be a week date or month string
    const isMonth = item._rangeEnd.length === 7;
    const endRange = getDateRangeFromTrendItem(isMonth ? { month: item._rangeEnd } : { week: item._rangeEnd });
    if (startRange && endRange) return { date_from: startRange.date_from, date_to: endRange.date_to };
  }
  if (item.week) {
    const from = item.week;
    const d = new Date(item.week + 'T00:00:00');
    d.setDate(d.getDate() + 6);
    const to = d.toISOString().slice(0, 10);
    return { date_from: from, date_to: to };
  }
  if (item.month) {
    const [y, mo] = item.month.split('-');
    const from = `${y}-${mo}-01`;
    const last = new Date(parseInt(y), parseInt(mo), 0);
    const to = last.toISOString().slice(0, 10);
    return { date_from: from, date_to: to };
  }
  return null;
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [periodClients, setPeriodClients] = useState(0);
  const [periodAvgTenure, setPeriodAvgTenure] = useState(0);
  const [clientsPerTier, setClientsPerTier] = useState({});
  const [revenuePerTier, setRevenuePerTier] = useState({});
  const [revenuePerState, setRevenuePerState] = useState([]);
  const [clientsPerState, setClientsPerState] = useState([]);
  const [lifetimeRevPerClientPerTier, setLifetimeRevPerClientPerTier] = useState({});
  const [revPerClientPerState, setRevPerClientPerState] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('All');
  const [chartLoading, setChartLoading] = useState(false);
  const [trendTimeframe, setTrendTimeframe] = useState('1M');
  const [trendChartType, setTrendChartType] = useState('bar');
  const [trendRawData, setTrendRawData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [fulfillmentCounts, setFulfillmentCounts] = useState({
    serviceCredits: 0, productCredits: 0, giftCards: 0,
    requestedCards: 0, gifts: 0, concierge: 0
  });

  // Allowed timeframes for the current global period
  const allowedTimeframes = useMemo(() => {
    let config = PERIOD_ALLOWED_TF[selectedPeriod];
    if (!config) {
      // YTD
      const m = new Date().getMonth();
      if (m <= 3) config = { allowed: ['W', '2W', '1M'], default: '1M' };
      else if (m <= 6) config = { allowed: ['W', '2W', '1M'], default: '1M' };
      else config = { allowed: ['2W', '1M', '3M'], default: '1M' };
    }
    return config;
  }, [selectedPeriod]);

  // Auto-adjust timeframe when period changes
  useEffect(() => {
    if (!allowedTimeframes.allowed.includes(trendTimeframe)) {
      setTrendTimeframe(allowedTimeframes.default);
    }
  }, [allowedTimeframes, trendTimeframe]);

  // Load dashboard summary + fulfillment counts once
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const dashRes = await getDashboardSummary();
        setDashboard(dashRes.data);
      } catch (err) {
        console.error('Failed to load dashboard summary:', err);
      }
    };
    const fetchFulfillmentCounts = async () => {
      try {
        const [redemptionsRes, cardReqRes, giftsRes, conciergeRes] = await Promise.all([
          getRedemptions({ status: 'pending' }),
          getCardRequests(),
          getGiftClaims(),
          getConciergeRequests()
        ]);
        const allRedemptions = redemptionsRes.data.redemptions || [];
        const sc = allRedemptions.filter(r => !r.reward_category || r.reward_category === 'service_credit').length;
        const pc = allRedemptions.filter(r => r.reward_category === 'product_credit').length;
        const gc = allRedemptions.filter(r => r.reward_category === 'gift_card').length;
        const cr = (cardReqRes.data.requests || []).filter(r => r.status === 'pending').length;
        const gi = (giftsRes.data.claims || []).filter(c => c.status === 'claimed' || c.status === 'processing').length;
        const co = (conciergeRes.data.requests || []).filter(r => ['new', 'reviewing', 'quoted', 'approved'].includes(r.status)).length;
        setFulfillmentCounts({ serviceCredits: sc, productCredits: pc, giftCards: gc, requestedCards: cr, gifts: gi, concierge: co });
      } catch (err) {
        console.error('Failed to load fulfillment counts:', err);
      }
    };
    fetchDashboard();
    fetchFulfillmentCounts();
  }, []);

  // Load stats when period changes
  const fetchMonthlyStats = useCallback(async (months, granularity) => {
    setChartLoading(true);
    try {
      // YTD: calculate months from Jan 1 of current year
      const effectiveMonths = months === 0
        ? new Date().getMonth()
        : months;
      const monthlyRes = await getMonthlyStats(effectiveMonths, granularity);
      const data = monthlyRes.data;
      setPeriodClients(data.period_clients || 0);
      setPeriodAvgTenure(data.period_avg_tenure_days || 0);
      setClientsPerTier(data.clients_per_tier || {});
      setRevenuePerTier(data.revenue_per_tier || {});
      setRevenuePerState(data.revenue_per_state || []);
      setClientsPerState(data.clients_per_state || []);
      setLifetimeRevPerClientPerTier(data.lifetime_rev_per_client_per_tier || {});
      setRevPerClientPerState(data.revenue_per_client_per_state || []);
      const rows = data.months || data.weeks || [];
      setMonthlyData(rows.map(m => {
        const points = parseInt(m.points_accrued, 10) || 0;
        let period = m.month || m.week;
        if (m.week) {
          const d = new Date(m.week + 'T00:00:00');
          period = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        return {
          ...m,
          period,
          revenue: parseFloat(m.revenue) || 0,
          points_accrued: points,
          redemption_value: (points / 1000) * 5,
          actual_redemptions: parseFloat(m.redemptions_value) || 0
        };
      }));
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setChartLoading(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const period = TIME_PERIODS.find(p => p.label === selectedPeriod);
    let months = period?.months ?? 6;
    let granularity = period?.granularity || 'month';
    // YTD: calculate months from Jan 1, use weeks if < 6 months into the year
    if (months === 0) {
      months = new Date().getMonth();
      granularity = months <= 6 ? 'week' : 'month';
    }
    fetchMonthlyStats(months, granularity);
  }, [selectedPeriod, fetchMonthlyStats]);

  // Fetch revenue trend data: global period = lookback, local timeframe = bucket size
  useEffect(() => {
    const fetchTrendData = async () => {
      setTrendLoading(true);
      try {
        const period = TIME_PERIODS.find(p => p.label === selectedPeriod);
        let months = period?.months ?? 6;
        if (months === 0) months = new Date().getMonth(); // YTD

        const tf = TREND_TIMEFRAMES.find(t => t.label === trendTimeframe);
        const res = await getMonthlyStats(months, tf.backendGranularity);
        const d = res.data;
        const rows = d.weeks || d.months || [];

        // Format period labels
        const formatted = rows
          .map(m => {
            let label;
            if (m.week) {
              const dt = new Date(m.week + 'T00:00:00');
              label = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } else if (m.month) {
              const [y, mo] = m.month.split('-');
              const dt = new Date(parseInt(y), parseInt(mo) - 1, 1);
              label = dt.toLocaleDateString('en-US', { month: 'short' }) + " '" + y.slice(2);
            }
            return { ...m, period: label, revenue: parseFloat(m.revenue) || 0 };
          });

        // Aggregate buckets if needed (e.g., 3M = group every 3 months)
        if (tf.aggregateCount > 1) {
          const aggregated = [];
          for (let i = 0; i < formatted.length; i += tf.aggregateCount) {
            const bucket = formatted.slice(i, i + tf.aggregateCount);
            const bucketLabel = bucket.length > 1
              ? `${bucket[0].period} – ${bucket[bucket.length - 1].period}`
              : bucket[0].period;
            aggregated.push({
              period: bucketLabel,
              revenue: bucket.reduce((s, r) => s + r.revenue, 0),
              week: bucket[0].week,
              month: bucket[0].month,
              _rangeEnd: bucket[bucket.length - 1].month || bucket[bucket.length - 1].week,
            });
          }
          setTrendRawData(aggregated);
        } else {
          setTrendRawData(formatted);
        }
      } catch (err) {
        console.error('Failed to load trend data:', err);
      } finally {
        setTrendLoading(false);
      }
    };
    fetchTrendData();
  }, [selectedPeriod, trendTimeframe]);

  const handlePeriodChange = (_, newPeriod) => {
    if (newPeriod !== null) setSelectedPeriod(newPeriod);
  };

  // Drill-down click handlers
  const handleTierClick = (data) => {
    const tier = data.tier || data.name?.toLowerCase();
    if (tier) navigate(`/clients?tier=${tier}&status=active`);
  };

  const handleStateClick = (data) => {
    const stateCode = data.state || Object.keys(STATE_NAMES).find(k => STATE_NAMES[k] === data.name) || data.name;
    if (stateCode) navigate(`/markets?state=${stateCode}`);
  };

  const handleRevenueTrendClick = (data) => {
    const range = getDateRangeFromTrendItem(data);
    if (range) navigate(`/transactions?date_from=${range.date_from}&date_to=${range.date_to}`);
  };

  if (loading) return <LoadingSpinner />;

  // Compute period totals from monthly data
  const totals = monthlyData.reduce((acc, m) => ({
    revenue: acc.revenue + m.revenue,
    points: acc.points + m.points_accrued,
    redemptionValue: acc.redemptionValue + m.redemption_value,
    actualRedemptions: acc.actualRedemptions + m.actual_redemptions
  }), { revenue: 0, points: 0, redemptionValue: 0, actualRedemptions: 0 });

  // Compute moving average for revenue trend chart (local period)
  const trendChartData = trendRawData.map((m, i, arr) => {
    const windowSize = Math.min(3, i + 1);
    const window = arr.slice(i - windowSize + 1, i + 1);
    const avg = window.reduce((s, d) => s + d.revenue, 0) / window.length;
    return { ...m, revenueTrend: Math.round(avg * 100) / 100 };
  });

  const redemptionPct = totals.revenue > 0
    ? ((totals.redemptionValue / totals.revenue) * 100).toFixed(1)
    : '0.0';

  // Derived chart data for breakdown charts
  const tierClientData = Object.entries(clientsPerTier)
    .filter(([, count]) => count > 0)
    .map(([tier, count]) => ({
      name: tier.charAt(0).toUpperCase() + tier.slice(1),
      tier,
      value: count,
      color: TIER_COLORS[tier]
    }));

  const tierRevenueData = Object.entries(revenuePerTier)
    .filter(([, rev]) => rev > 0)
    .map(([tier, revenue]) => ({
      name: tier.charAt(0).toUpperCase() + tier.slice(1),
      tier,
      revenue,
      color: TIER_COLORS[tier]
    }));

  const stateRevenueData = revenuePerState.map((s, i) => ({
    ...s,
    name: STATE_NAMES[s.state] || s.state,
    color: STATE_COLORS[i % STATE_COLORS.length]
  }));

  const stateClientData = clientsPerState.map((s, i) => ({
    ...s,
    name: STATE_NAMES[s.state] || s.state,
    color: STATE_COLORS[i % STATE_COLORS.length]
  }));

  const tierRevPerClientData = Object.entries(lifetimeRevPerClientPerTier)
    .filter(([, v]) => v > 0)
    .map(([tier, value]) => ({
      name: tier.charAt(0).toUpperCase() + tier.slice(1),
      tier,
      revenue: value,
      color: TIER_COLORS[tier]
    }));

  const stateRevPerClientData = revPerClientPerState.map((s, i) => ({
    ...s,
    name: STATE_NAMES[s.state] || s.state,
    color: STATE_COLORS[i % STATE_COLORS.length]
  }));

  return (
    <Box>
      {/* Inactivity Alerts */}
      {dashboard?.inactive_alerts?.length > 0 && (
        <Box sx={{ ...frostedCardSx, p: 3, mb: 3, borderLeft: '4px solid #ed6c02' }}>
          <Typography variant="h6" sx={{ color: '#ed6c02', mb: 1.5, fontWeight: 600 }}>
            {dashboard.inactive_alerts.length} Client{dashboard.inactive_alerts.length !== 1 ? 's' : ''} with No Billing Activity (90+ Days)
          </Typography>
          <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 2 }}>
            These active clients have not earned any points in over 3 months. Please verify they are still enrolled.
          </Typography>
          {dashboard.inactive_alerts.map((alert) => (
            <Box
              key={alert.id}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 1,
                px: 1.5,
                borderRadius: '8px',
                cursor: 'pointer',
                '&:hover': { backgroundColor: 'rgba(237, 108, 2, 0.06)' }
              }}
              onClick={() => navigate(`/clients/${alert.id}`)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#2D2D2D' }}>{alert.name}</Typography>
                <Chip label={alert.current_tier} size="small" sx={{ textTransform: 'capitalize', fontSize: '11px' }} />
                <Chip label={alert.care_package?.replace('_', ' ')} size="small" sx={{ textTransform: 'capitalize', fontSize: '11px' }} />
              </Box>
              <Typography variant="caption" sx={{ color: '#5C6B5E' }}>
                {alert.last_earn_date
                  ? `Last earned: ${new Date(alert.last_earn_date).toLocaleDateString()}`
                  : 'Never earned points'}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Dashboard title + Period selector */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700 }}>Dashboard</Typography>
        <ToggleButtonGroup
          value={selectedPeriod}
          exclusive
          onChange={handlePeriodChange}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              px: 1.5, py: 0.3, fontSize: '12px', fontWeight: 600,
              border: '1px solid rgba(61,74,62,0.15)', color: '#5C6B5E', textTransform: 'none',
              '&.Mui-selected': { backgroundColor: '#3D4A3E', color: '#fff', '&:hover': { backgroundColor: '#2A332B' } },
              '&:hover': { backgroundColor: 'rgba(61,74,62,0.06)' }
            }
          }}
        >
          {TIME_PERIODS.map((p) => (
            <ToggleButton key={p.label} value={p.label}>{p.label}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {(() => {
          const clientCount = periodClients || 1;
          const avgRevenue = totals.revenue / clientCount;
          const avgRedemption = totals.actualRedemptions / clientCount;
          return [
            {
              label: 'Total Clients',
              value: String(periodClients),
              sub: `${dashboard?.active_clients ?? 0} currently active`
            },
            {
              label: 'Avg. Client Duration',
              value: `${periodAvgTenure}`,
              sub: 'days in program'
            },
            {
              label: 'Avg. Revenue / Client',
              value: fmtCurrency(avgRevenue),
              sub: 'from AxisCare billing'
            },
            {
              label: 'Avg. Redemption / Client',
              value: fmtCurrency(avgRedemption),
              sub: 'in credit redeemed'
            }
          ];
        })().map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.label}>
            <Box sx={{ ...frostedCardSx, p: 3, textAlign: 'center', height: 130, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="subtitle2" sx={{ color: '#5C6B5E', mb: 0.5 }}>{stat.label}</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', mb: 0.5 }}>{stat.value}</Typography>
              <Typography variant="caption" sx={{ color: '#5C6B5E' }}>{stat.sub}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Revenue Trend + Summary Widgets */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Box sx={{ ...frostedCardSx, p: 3, '&:hover': { transform: 'none' } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h6" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}>
                Revenue Trend
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Select value={trendTimeframe} onChange={(e) => setTrendTimeframe(e.target.value)} size="small" sx={compactSelectSx}>
                  {TREND_TIMEFRAMES.filter(t => allowedTimeframes.allowed.includes(t.label)).map(t => (
                    <MenuItem key={t.label} value={t.label}>{t.label}</MenuItem>
                  ))}
                </Select>
                <Select value={trendChartType} onChange={(e) => setTrendChartType(e.target.value)} size="small" sx={compactSelectSx}>
                  <MenuItem value="bar">Bar</MenuItem>
                  <MenuItem value="area">Area</MenuItem>
                </Select>
              </Box>
            </Box>
            <Box sx={{ position: 'relative' }}>
              {trendLoading && (
                <Box sx={{
                  position: 'absolute', inset: 0, zIndex: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '8px'
                }}>
                  <CircularProgress size={32} sx={{ color: '#3D4A3E' }} />
                </Box>
              )}
              {trendChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={trendChartData} barCategoryGap="8%">
                    <defs>
                      <linearGradient id="dashBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS.tertiary} stopOpacity={0.85} />
                        <stop offset="100%" stopColor={CHART_COLORS.tertiary} stopOpacity={0.45} />
                      </linearGradient>
                      <linearGradient id="dashAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS.tertiary} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={CHART_COLORS.tertiary} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,74,62,0.08)" />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 11, fill: '#5C6B5E' }}
                      axisLine={{ stroke: 'rgba(61,74,62,0.12)' }}
                      tickLine={false}
                      interval={trendChartData.length > 20 ? 3 : trendChartData.length > 12 ? 1 : 0}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#5C6B5E' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value, name) => [fmtCurrency(value), name]}
                    />
                    <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '13px', color: '#5C6B5E' }} />
                    {trendChartType === 'bar' && <Bar dataKey="revenue" fill="#3D4A3E" name="Revenue" radius={[4, 4, 0, 0]} maxBarSize={24} onClick={handleRevenueTrendClick} cursor="pointer" />}
                    {trendChartType === 'bar' && <Line type="monotone" dataKey="revenueTrend" stroke={CHART_COLORS.primary} strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: '#fff' }} name="Moving Avg" />}
                    {trendChartType === 'area' && <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.tertiary} strokeWidth={2} fill="url(#dashAreaGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: CHART_COLORS.tertiary }} name="Revenue" />}

                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary">No data available</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Grid>

        {/* Summary Widgets */}
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
            <Box sx={{ ...frostedCardSx, p: 3, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', '&:hover': { transform: 'none' } }}>
              <Typography variant="subtitle2" sx={{ color: '#5C6B5E', mb: 0.5 }}>Total Revenue</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: CHART_COLORS.tertiary }}>
                {fmtCurrency(totals.revenue)}
              </Typography>
            </Box>
            <Box sx={{ ...frostedCardSx, p: 3, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', '&:hover': { transform: 'none' } }}>
              <Typography variant="subtitle2" sx={{ color: '#5C6B5E', mb: 0.5 }}>Total Points Issued</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: CHART_COLORS.primary }}>
                {totals.points.toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ ...frostedCardSx, p: 3, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', '&:hover': { transform: 'none' } }}>
              <Typography variant="subtitle2" sx={{ color: '#5C6B5E', mb: 0.5 }}>Total Redemption Value</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: CHART_COLORS.secondary }}>
                {fmtCurrency(totals.redemptionValue)}
              </Typography>
              <Typography variant="caption" sx={{ color: '#5C6B5E', mt: 0.5 }}>
                {redemptionPct}% of revenue
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Tier Breakdown Charts — Row 1 */}
      <Grid container spacing={3} sx={{ mt: 0 }}>
        {/* Clients per Tier — Donut PieChart */}
        <Grid item xs={12} md={4}>
          <Box sx={{ ...frostedCardSx, p: 3, '&:hover': { transform: 'none' } }}>
            <Typography variant="h6" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, mb: 2 }}>
              Clients per Tier
            </Typography>
            <Box sx={{ position: 'relative' }}>
              {chartLoading && (
                <Box sx={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '8px' }}>
                  <CircularProgress size={28} sx={{ color: '#3D4A3E' }} />
                </Box>
              )}
              {tierClientData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={tierClientData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} cornerRadius={6} stroke="none" onClick={handleTierClick} cursor="pointer">
                      {tierClientData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => {
                      const total = tierClientData.reduce((sum, d) => sum + d.value, 0);
                      const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                      return [`${value} (${pct}%)`, name];
                    }} />
                    <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '12px' }} formatter={(value) => <span style={{ color: '#2D2D2D' }}>{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary" variant="body2">No data</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Grid>

        {/* Revenue per Tier — Horizontal BarChart */}
        <Grid item xs={12} md={4}>
          <Box sx={{ ...frostedCardSx, p: 3, '&:hover': { transform: 'none' } }}>
            <Typography variant="h6" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, mb: 2 }}>
              Revenue per Tier
            </Typography>
            <Box sx={{ position: 'relative' }}>
              {chartLoading && (
                <Box sx={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '8px' }}>
                  <CircularProgress size={28} sx={{ color: '#3D4A3E' }} />
                </Box>
              )}
              {tierRevenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={tierRevenueData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,74,62,0.08)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#5C6B5E' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#5C6B5E' }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => {
                      const totalRev = tierRevenueData.reduce((sum, d) => sum + d.revenue, 0);
                      const pct = totalRev > 0 ? ((value / totalRev) * 100).toFixed(1) : '0.0';
                      return [`${fmtCurrency(value)} (${pct}%)`, 'Revenue'];
                    }} />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={24} onClick={handleTierClick} cursor="pointer">
                      {tierRevenueData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary" variant="body2">No data</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Grid>

        {/* Lifetime Rev / Client / Tier — Vertical BarChart with gradient */}
        <Grid item xs={12} md={4}>
          <Box sx={{ ...frostedCardSx, p: 3, '&:hover': { transform: 'none' } }}>
            <Typography variant="h6" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, mb: 2 }}>
              Lifetime Rev / Client / Tier
            </Typography>
            <Box sx={{ position: 'relative' }}>
              {chartLoading && (
                <Box sx={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '8px' }}>
                  <CircularProgress size={28} sx={{ color: '#3D4A3E' }} />
                </Box>
              )}
              {tierRevPerClientData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={tierRevPerClientData}>
                    <defs>
                      {tierRevPerClientData.map((entry, i) => (
                        <linearGradient key={i} id={`tierRevGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={entry.color} stopOpacity={0.9} />
                          <stop offset="95%" stopColor={entry.color} stopOpacity={0.4} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,74,62,0.08)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5C6B5E' }} axisLine={{ stroke: 'rgba(61,74,62,0.12)' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#5C6B5E' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [fmtCurrency(value), 'Revenue / Client']} />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={24} onClick={handleTierClick} cursor="pointer">
                      {tierRevPerClientData.map((entry, index) => (
                        <Cell key={index} fill={`url(#tierRevGrad${index})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary" variant="body2">No data</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* State Breakdown Charts — Row 2 */}
      <Grid container spacing={3} sx={{ mt: 0 }}>
        {/* Clients per State — Donut PieChart (mirrors Clients per Tier) */}
        <Grid item xs={12} md={4}>
          <Box sx={{ ...frostedCardSx, p: 3, '&:hover': { transform: 'none' } }}>
            <Typography variant="h6" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, mb: 2 }}>
              Clients per State
            </Typography>
            <Box sx={{ position: 'relative' }}>
              {chartLoading && (
                <Box sx={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '8px' }}>
                  <CircularProgress size={28} sx={{ color: '#3D4A3E' }} />
                </Box>
              )}
              {stateClientData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={stateClientData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} cornerRadius={6} stroke="none" onClick={handleStateClick} cursor="pointer">
                      {stateClientData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => {
                      const total = stateClientData.reduce((sum, d) => sum + d.count, 0);
                      const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                      return [`${value} (${pct}%)`, name];
                    }} />
                    <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '12px' }} formatter={(value) => <span style={{ color: '#2D2D2D' }}>{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary" variant="body2">No data</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Grid>

        {/* Revenue per State — Horizontal BarChart (mirrors Revenue per Tier) */}
        <Grid item xs={12} md={4}>
          <Box sx={{ ...frostedCardSx, p: 3, '&:hover': { transform: 'none' } }}>
            <Typography variant="h6" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, mb: 2 }}>
              Revenue per State
            </Typography>
            <Box sx={{ position: 'relative' }}>
              {chartLoading && (
                <Box sx={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '8px' }}>
                  <CircularProgress size={28} sx={{ color: '#3D4A3E' }} />
                </Box>
              )}
              {stateRevenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stateRevenueData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,74,62,0.08)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#5C6B5E' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#5C6B5E' }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => {
                      const totalRev = stateRevenueData.reduce((sum, d) => sum + d.revenue, 0);
                      const pct = totalRev > 0 ? ((value / totalRev) * 100).toFixed(1) : '0.0';
                      return [`${fmtCurrency(value)} (${pct}%)`, 'Revenue'];
                    }} />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={24} onClick={handleStateClick} cursor="pointer">
                      {stateRevenueData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary" variant="body2">No data</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Grid>

        {/* Rev / Client / State — Vertical BarChart (distinct from RadarChart in Row 1) */}
        <Grid item xs={12} md={4}>
          <Box sx={{ ...frostedCardSx, p: 3, '&:hover': { transform: 'none' } }}>
            <Typography variant="h6" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, mb: 2 }}>
              Rev / Client / State
            </Typography>
            <Box sx={{ position: 'relative' }}>
              {chartLoading && (
                <Box sx={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '8px' }}>
                  <CircularProgress size={28} sx={{ color: '#3D4A3E' }} />
                </Box>
              )}
              {stateRevPerClientData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stateRevPerClientData}>
                    <defs>
                      {stateRevPerClientData.map((entry, i) => (
                        <linearGradient key={i} id={`stateRevGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={entry.color} stopOpacity={0.9} />
                          <stop offset="95%" stopColor={entry.color} stopOpacity={0.4} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,74,62,0.08)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#5C6B5E' }} axisLine={{ stroke: 'rgba(61,74,62,0.12)' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#5C6B5E' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [fmtCurrency(value), 'Revenue / Client']} />
                    <Bar dataKey="revenue_per_client" radius={[4, 4, 0, 0]} maxBarSize={24} onClick={handleStateClick} cursor="pointer">
                      {stateRevPerClientData.map((entry, index) => (
                        <Cell key={index} fill={`url(#stateRevGrad${index})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary" variant="body2">No data</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Fulfillment Notifications */}
      {(() => {
        const totalPending = fulfillmentCounts.serviceCredits + fulfillmentCounts.productCredits + fulfillmentCounts.giftCards + fulfillmentCounts.requestedCards + fulfillmentCounts.gifts + fulfillmentCounts.concierge;
        const categories = [
          { key: 'serviceCredits', label: 'Service Credits', desc: 'Invoice credits & service discounts', icon: <ReceiptLongOutlinedIcon sx={{ fontSize: 36 }} />, color: '#D4956A', tab: 0 },
          { key: 'productCredits', label: 'Product Credits', desc: 'Product discount codes', icon: <ShoppingBagOutlinedIcon sx={{ fontSize: 36 }} />, color: '#D4956A', tab: 1 },
          { key: 'giftCards', label: 'Gift Cards', desc: 'Gift card redemptions', icon: <CardGiftcardOutlinedIcon sx={{ fontSize: 36 }} />, color: '#D4956A', tab: 2 },
          { key: 'requestedCards', label: 'Card Requests', desc: 'Custom gift card requests', icon: <StyleOutlinedIcon sx={{ fontSize: 36 }} />, color: '#3D4A3E', tab: 3 },
          { key: 'gifts', label: 'Gifts', desc: 'Tier gifts & fulfillment', icon: <RedeemOutlinedIcon sx={{ fontSize: 36 }} />, color: '#5A8A7A', tab: 4 },
          { key: 'concierge', label: 'Concierge', desc: 'VIP concierge services', icon: <SupportAgentOutlinedIcon sx={{ fontSize: 36 }} />, color: '#3D4A3E', tab: 5 }
        ];
        return (
          <Box sx={{ ...frostedCardSx, mt: 3, p: 3, '&:hover': { transform: 'none' } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="h6" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}>
                  Redemptions
                </Typography>
                {totalPending > 0 && (
                  <Chip
                    label={`${totalPending} pending`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(212, 149, 106, 0.12)',
                      color: '#C1592E',
                      fontWeight: 600,
                      fontSize: '11px'
                    }}
                  />
                )}
              </Box>
              <Button
                size="small"
                onClick={() => navigate('/redemptions')}
                endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: '16px !important' }} />}
                sx={{
                  color: '#D4956A',
                  fontWeight: 600,
                  fontSize: '13px',
                  textTransform: 'none',
                  '&:hover': { backgroundColor: 'rgba(212, 149, 106, 0.08)' }
                }}
              >
                View All
              </Button>
            </Box>
            <Grid container spacing={2.5}>
              {categories.map((cat) => {
                const count = fulfillmentCounts[cat.key];
                const hasItems = count > 0;
                const rgbStr = cat.color === '#D4956A' ? '212,149,106' : cat.color === '#5A8A7A' ? '90,138,122' : '61,74,62';
                return (
                  <Grid item xs={12} sm={6} md={4} key={cat.key}>
                    <Box
                      onClick={() => navigate('/redemptions', { state: { tab: cat.tab, ts: Date.now() } })}
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
                        backgroundColor: hasItems ? `rgba(${rgbStr},0.06)` : 'rgba(61,74,62,0.04)',
                        border: hasItems
                          ? `1px solid rgba(${rgbStr},0.18)`
                          : '1px solid rgba(61,74,62,0.12)',
                        borderLeftWidth: '4px',
                        borderLeftColor: hasItems ? cat.color : 'rgba(61,74,62,0.15)',
                        '&:hover': {
                          backgroundColor: hasItems ? `rgba(${rgbStr},0.1)` : 'rgba(61,74,62,0.07)',
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
        );
      })()}
    </Box>
  );
};

export default DashboardPage;
