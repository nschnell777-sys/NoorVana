import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Box, Typography, Grid, Button, ToggleButton, ToggleButtonGroup,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, CircularProgress, Chip, FormControl, InputLabel,
  Select, MenuItem
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { getMarketAnalytics } from '../services/api';
import { frostedCardSx, CHART_COLORS } from '../theme';
import { generateMarketReport } from '../utils/pdfReport';
import LoadingSpinner from '../components/LoadingSpinner';
import MarketReportLayout from '../components/MarketReportLayout';

const TIME_PERIODS = [
  { label: '1M', months: 1, granularity: 'week' },
  { label: '3M', months: 3, granularity: 'week' },
  { label: '6M', months: 6 },
  { label: 'YTD', months: 0, granularity: 'auto' },
  { label: '1Y', months: 12 },
  { label: '2Y', months: 24 },
  { label: '5Y', months: 60 },
  { label: 'All', months: 999 }
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

const PKG_COLORS = {
  essentials: '#3D4A3E',
  premium: '#D4956A',
  white_glove: '#5A8A7A'
};

const STATE_NAMES = {
  TX: 'Texas', FL: 'Florida', AZ: 'Arizona', SC: 'South Carolina',
  SD: 'South Dakota', CA: 'California', NY: 'New York', IL: 'Illinois',
  GA: 'Georgia', NC: 'North Carolina', OH: 'Ohio', PA: 'Pennsylvania'
};

const LEVEL_LABELS = {
  country: 'States',
  state: 'Markets',
  market: 'Territories',
  territory: 'Clients'
};

const fmtCurrency = (v) => `$${(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNumber = (v) => (v || 0).toLocaleString();

const selectSx = {
  minWidth: 180,
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    backgroundColor: '#fff',
    fontSize: '14px',
    '& fieldset': { borderColor: 'rgba(61,74,62,0.15)' },
    '&:hover fieldset': { borderColor: 'rgba(61,74,62,0.3)' },
    '&.Mui-focused fieldset': { borderColor: '#3D4A3E' }
  },
  '& .MuiInputLabel-root': { fontSize: '13px', color: '#5C6B5E' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#3D4A3E' }
};

const MarketsPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'revenue', direction: 'desc' });
  const [pdfLoading, setPdfLoading] = useState(false);
  const reportLayoutRef = useRef(null);
  // Revenue trend local controls
  const [trendTimeframe, setTrendTimeframe] = useState('1M');
  const [trendChartType, setTrendChartType] = useState('bar');
  const [trendRawData, setTrendRawData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);

  // Allowed timeframes for the current global period
  const allowedTimeframes = useMemo(() => {
    let config = PERIOD_ALLOWED_TF[selectedPeriod];
    if (!config) {
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

  // Dropdown selections
  const [selectedCountry, setSelectedCountry] = useState('US');
  const [selectedState, setSelectedState] = useState('');
  const [selectedMarket, setSelectedMarket] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // Dropdown options
  const [stateOptions, setStateOptions] = useState([]);
  const [marketOptions, setMarketOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);

  // Build filter params from selections
  const filters = useMemo(() => {
    const f = {};
    if (selectedState) f.state = selectedState;
    if (selectedMarket) f.market = selectedMarket;
    if (selectedCity) f.city = selectedCity;
    return f;
  }, [selectedState, selectedMarket, selectedCity]);

  // Fetch main report data
  const fetchData = useCallback(async () => {
    setChartLoading(true);
    try {
      const period = TIME_PERIODS.find(p => p.label === selectedPeriod);
      let months = period?.months ?? 999;
      let granularity = period?.granularity || 'month';
      if (months === 0) {
        months = new Date().getMonth();
        granularity = months <= 6 ? 'week' : 'month';
      }
      const res = await getMarketAnalytics({ months, granularity, ...filters });
      setData(res.data);
    } catch (err) {
      console.error('Failed to load market analytics:', err);
    } finally {
      setChartLoading(false);
      setLoading(false);
    }
  }, [selectedPeriod, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch state options on mount
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const res = await getMarketAnalytics({ months: 999 });
        if (res.data?.breakdown) {
          setStateOptions(res.data.breakdown.map(r => r.name).sort());
        }
      } catch (err) {
        console.error('Failed to load states:', err);
      }
    };
    fetchStates();
  }, []);

  // Fetch market options when state changes
  useEffect(() => {
    if (!selectedState) {
      setMarketOptions([]);
      return;
    }
    const fetchMarkets = async () => {
      try {
        const res = await getMarketAnalytics({ months: 999, state: selectedState });
        if (res.data?.breakdown) {
          setMarketOptions(res.data.breakdown.map(r => r.name).sort());
        }
      } catch (err) {
        console.error('Failed to load markets:', err);
      }
    };
    fetchMarkets();
  }, [selectedState]);

  // Fetch city options when market changes
  useEffect(() => {
    if (!selectedState || !selectedMarket) {
      setCityOptions([]);
      return;
    }
    const fetchCities = async () => {
      try {
        const res = await getMarketAnalytics({ months: 999, state: selectedState, market: selectedMarket });
        if (res.data?.breakdown) {
          setCityOptions(res.data.breakdown.map(r => r.name).sort());
        }
      } catch (err) {
        console.error('Failed to load cities:', err);
      }
    };
    fetchCities();
  }, [selectedState, selectedMarket]);

  const handleCountryChange = (e) => {
    setSelectedCountry(e.target.value);
    setSelectedState('');
    setSelectedMarket('');
    setSelectedCity('');
    setSortConfig({ key: 'revenue', direction: 'desc' });
  };

  const handleStateChange = (e) => {
    setSelectedState(e.target.value);
    setSelectedMarket('');
    setSelectedCity('');
    setSortConfig({ key: 'revenue', direction: 'desc' });
  };

  const handleMarketChange = (e) => {
    setSelectedMarket(e.target.value);
    setSelectedCity('');
    setSortConfig({ key: 'revenue', direction: 'desc' });
  };

  const handleCityChange = (e) => {
    setSelectedCity(e.target.value);
    setSortConfig({ key: 'revenue', direction: 'desc' });
  };

  // Fetch revenue trend data: global period = lookback, local timeframe = bucket size
  useEffect(() => {
    const fetchTrendData = async () => {
      setTrendLoading(true);
      try {
        const period = TIME_PERIODS.find(p => p.label === selectedPeriod);
        let months = period?.months ?? 999;
        if (months === 0) months = new Date().getMonth(); // YTD

        const tf = TREND_TIMEFRAMES.find(t => t.label === trendTimeframe);
        const res = await getMarketAnalytics({
          months,
          granularity: tf.backendGranularity,
          ...filters
        });
        const d = res.data;
        const rows = d.weekly_trends || d.monthly_trends || [];

        // Filter out current month and format period labels
        const curMo = new Date().toISOString().slice(0, 7);
        const formatted = rows
          .filter(m => !m.month || m.month !== curMo)
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
  }, [selectedPeriod, trendTimeframe, filters]);

  const handlePeriodChange = (_, newPeriod) => {
    if (newPeriod !== null) setSelectedPeriod(newPeriod);
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const sortedBreakdown = useMemo(() => {
    if (!data?.breakdown) return [];
    const sorted = [...data.breakdown];
    sorted.sort((a, b) => {
      const aVal = a[sortConfig.key] ?? 0;
      const bVal = b[sortConfig.key] ?? 0;
      if (typeof aVal === 'string') return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [data?.breakdown, sortConfig]);

  const sortedClients = useMemo(() => {
    if (!data?.clients) return [];
    const sorted = [...data.clients];
    sorted.sort((a, b) => {
      const aVal = a[sortConfig.key] ?? 0;
      const bVal = b[sortConfig.key] ?? 0;
      if (typeof aVal === 'string') return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [data?.clients, sortConfig]);

  const handleDownloadReport = async () => {
    if (!data || !reportLayoutRef.current) return;
    setPdfLoading(true);
    try {
      const filterParts = [];
      if (selectedState) filterParts.push(STATE_NAMES[selectedState] || selectedState);
      if (selectedMarket) filterParts.push(selectedMarket);
      if (selectedCity) filterParts.push(selectedCity);
      const filterLabel = filterParts.length > 0 ? filterParts.join(' > ') : 'All States';

      await generateMarketReport({
        reportDiv: reportLayoutRef.current,
        filters: filterLabel,
        summary: data.summary || {},
        level: data.level || 'country',
        breakdown: data.breakdown || [],
        clients: data.clients || [],
        period: selectedPeriod,
        filename: `noorvana-market-report-${Date.now()}.pdf`
      });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const summary = data?.summary || {};
  const level = data?.level || 'country';
  const isTerritory = level === 'territory';

  // Chart data with moving average (supports weekly or monthly trends)
  const curMonth = new Date().toISOString().slice(0, 7);
  const rawTrends = (data?.weekly_trends || data?.monthly_trends || [])
    .filter(m => !m.month || m.month !== curMonth);
  const trendData = rawTrends.map((m, i, arr) => {
    const revenue = parseFloat(m.revenue) || 0;
    const windowSize = Math.min(3, i + 1);
    const window = arr.slice(i - windowSize + 1, i + 1);
    const avg = window.reduce((s, d) => s + (parseFloat(d.revenue) || 0), 0) / window.length;
    let period = m.month || m.week;
    if (m.week) {
      const d = new Date(m.week + 'T00:00:00');
      period = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return {
      ...m,
      period,
      revenue,
      revenueTrend: Math.round(avg * 100) / 100,
      points_accrued: parseInt(m.points_accrued, 10) || 0
    };
  });

  // Local revenue trend chart data with moving average
  const trendChartData = trendRawData.map((m, i, arr) => {
    const revenue = parseFloat(m.revenue) || 0;
    const windowSize = Math.min(3, i + 1);
    const w = arr.slice(i - windowSize + 1, i + 1);
    const avg = w.reduce((s, d) => s + (parseFloat(d.revenue) || 0), 0) / w.length;
    return { ...m, revenue, revenueTrend: Math.round(avg * 100) / 100 };
  });

  const tierData = Object.entries(data?.tier_distribution || {})
    .filter(([, count]) => count > 0)
    .map(([tier, count]) => ({
      name: tier.charAt(0).toUpperCase() + tier.slice(1),
      value: count,
      color: TIER_COLORS[tier]
    }));

  const pkgData = Object.entries(data?.care_package_mix || {})
    .filter(([, count]) => count > 0)
    .map(([pkg, count]) => ({
      name: pkg.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value: count,
      color: PKG_COLORS[pkg]
    }));

  // Table header cell style
  const thSx = {
    fontWeight: 700, fontSize: '11px', textTransform: 'uppercase',
    letterSpacing: '0.5px', color: '#5C6B5E', borderBottom: '2px solid rgba(61,74,62,0.12)',
    whiteSpace: 'nowrap'
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h3" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, color: '#2D2D2D' }}>
          Markets
        </Typography>
      </Box>

      {/* Filter Bar: Dropdowns + Time Period */}
      <Box sx={{ ...frostedCardSx, p: 2.5, px: 3, mb: 3, '&:hover': { transform: 'none' } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={selectSx}>
              <InputLabel>Country</InputLabel>
              <Select value={selectedCountry} onChange={handleCountryChange} label="Country">
                <MenuItem value="US">United States</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={selectSx}>
              <InputLabel>State</InputLabel>
              <Select value={selectedState} onChange={handleStateChange} label="State">
                <MenuItem value="">All States</MenuItem>
                {stateOptions.map(s => (
                  <MenuItem key={s} value={s}>{STATE_NAMES[s] || s}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={selectSx} disabled={!selectedState}>
              <InputLabel>Market</InputLabel>
              <Select value={selectedMarket} onChange={handleMarketChange} label="Market">
                <MenuItem value="">All Markets</MenuItem>
                {marketOptions.map(m => (
                  <MenuItem key={m} value={m}>{m}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={selectSx} disabled={!selectedMarket}>
              <InputLabel>Territory</InputLabel>
              <Select value={selectedCity} onChange={handleCityChange} label="Territory">
                <MenuItem value="">All Territories</MenuItem>
                {cityOptions.map(c => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

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
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Clients', value: String(summary.total_clients || 0), sub: `${summary.active_clients || 0} currently active` },
          { label: 'Avg Duration', value: `${summary.avg_tenure_days || 0} days`, sub: `across ${summary.total_clients || 0} clients` },
          { label: 'Total Revenue', value: fmtCurrency(summary.total_revenue), sub: 'from AxisCare billing' },
          { label: 'Avg Revenue / Client', value: fmtCurrency(summary.avg_revenue_per_client), sub: 'from AxisCare billing' }
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

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Revenue Trend */}
        <Grid item xs={12} md={5}>
          <Box sx={{ ...frostedCardSx, p: 3, '&:hover': { transform: 'none' } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h6" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}>
                Revenue Trend
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
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
                <Box sx={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '8px' }}>
                  <CircularProgress size={28} sx={{ color: '#3D4A3E' }} />
                </Box>
              )}
              {trendChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={trendChartData} barCategoryGap="8%">
                    <defs>
                      <linearGradient id="mktsBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS.tertiary} stopOpacity={0.85} />
                        <stop offset="100%" stopColor={CHART_COLORS.tertiary} stopOpacity={0.45} />
                      </linearGradient>
                      <linearGradient id="mktsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS.tertiary} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={CHART_COLORS.tertiary} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,74,62,0.08)" />
                    <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#5C6B5E' }} axisLine={{ stroke: 'rgba(61,74,62,0.12)' }} tickLine={false} angle={-45} textAnchor="end" height={50} interval={trendChartData.length > 18 ? 2 : trendChartData.length > 10 ? 1 : 0} />
                    <YAxis tick={{ fontSize: 11, fill: '#5C6B5E' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => [fmtCurrency(value), name]} />
                    <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '13px', color: '#5C6B5E' }} />
                    {trendChartType === 'bar' && <Bar dataKey="revenue" fill="url(#mktsBarGrad)" name="Revenue" radius={[3, 3, 0, 0]} barSize={trendChartData.length > 15 ? undefined : Math.min(80, Math.floor(500 / (trendChartData.length || 1)))} />}
                    {trendChartType === 'bar' && <Line type="monotone" dataKey="revenueTrend" stroke={CHART_COLORS.primary} strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: '#fff' }} name="Moving Avg" />}
                    {trendChartType === 'area' && <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.tertiary} strokeWidth={2} fill="url(#mktsAreaGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: CHART_COLORS.tertiary }} name="Revenue" />}

                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary" variant="body2">No trend data</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Grid>

        {/* Tier Distribution */}
        <Grid item xs={12} md={3.5}>
          <Box sx={{ ...frostedCardSx, p: 3, '&:hover': { transform: 'none' } }}>
            <Typography variant="h6" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, mb: 2 }}>
              Tier Distribution
            </Typography>
            <Box sx={{ position: 'relative' }}>
              {chartLoading && (
                <Box sx={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '8px' }}>
                  <CircularProgress size={28} sx={{ color: '#3D4A3E' }} />
                </Box>
              )}
              {tierData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={tierData} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={40} outerRadius={75} paddingAngle={3} cornerRadius={5} stroke="none">
                      {tierData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => {
                      const total = tierData.reduce((sum, d) => sum + d.value, 0);
                      const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                      return [`${value} (${pct}%)`, name];
                    }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} formatter={(value) => <span style={{ color: '#2D2D2D' }}>{value}</span>} />
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

        {/* Care Package Mix */}
        <Grid item xs={12} md={3.5}>
          <Box sx={{ ...frostedCardSx, p: 3, '&:hover': { transform: 'none' } }}>
            <Typography variant="h6" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, mb: 2 }}>
              Care Package Mix
            </Typography>
            <Box sx={{ position: 'relative' }}>
              {chartLoading && (
                <Box sx={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '8px' }}>
                  <CircularProgress size={28} sx={{ color: '#3D4A3E' }} />
                </Box>
              )}
              {pkgData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={pkgData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      {pkgData.map((entry, i) => (
                        <linearGradient key={`pkgGrad${i}`} id={`pkgGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={entry.color} stopOpacity={0.9} />
                          <stop offset="95%" stopColor={entry.color} stopOpacity={0.4} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,74,62,0.08)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5C6B5E' }} axisLine={{ stroke: 'rgba(61,74,62,0.12)' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#5C6B5E' }} axisLine={false} tickLine={false} allowDecimals={false} domain={[0, (dataMax) => Math.ceil(dataMax * 2)]} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [`${value} clients`, 'Count']} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                      {pkgData.map((entry, i) => <Cell key={i} fill={`url(#pkgGrad${i})`} />)}
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

      {/* Breakdown Table */}
      <Box sx={{ ...frostedCardSx, p: 3, mb: 3, '&:hover': { transform: 'none' } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}>
            {LEVEL_LABELS[level] || 'Breakdown'}
          </Typography>
          <Button
            size="small"
            startIcon={pdfLoading ? <CircularProgress size={14} sx={{ color: '#D4956A' }} /> : <PictureAsPdfIcon />}
            onClick={handleDownloadReport}
            disabled={pdfLoading}
            sx={{ color: '#D4956A', fontWeight: 600, fontSize: '13px', textTransform: 'none', '&:hover': { backgroundColor: 'rgba(212,149,106,0.08)' } }}
          >
            {pdfLoading ? 'Generating...' : 'Download Report'}
          </Button>
        </Box>
        <Box sx={{ position: 'relative' }}>
          {chartLoading && (
            <Box sx={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '8px' }}>
              <CircularProgress size={28} sx={{ color: '#3D4A3E' }} />
            </Box>
          )}
          {isTerritory ? (
            /* Client list at territory level */
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {[
                      { key: 'name', label: 'Name', align: 'left' },
                      { key: 'email', label: 'Email', align: 'left' },
                      { key: 'care_package', label: 'Package', align: 'left' },
                      { key: 'current_tier', label: 'Tier', align: 'left' },
                      { key: 'duration_days', label: 'Duration', align: 'right' },
                      { key: 'lifetime_revenue', label: 'Lifetime Revenue', align: 'right' },
                      { key: 'lifetime_points', label: 'Lifetime Pts', align: 'right' },
                      { key: 'redeemable_points', label: 'Redeemable Pts', align: 'right' }
                    ].map(col => (
                      <TableCell key={col.key} align={col.align} sx={thSx}>
                        <TableSortLabel
                          active={sortConfig.key === col.key}
                          direction={sortConfig.key === col.key ? sortConfig.direction : 'desc'}
                          onClick={() => handleSort(col.key)}
                          sx={{ '&.MuiTableSortLabel-root': { color: '#5C6B5E' }, '&.Mui-active': { color: '#3D4A3E' } }}
                        >
                          {col.label}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedClients.map(c => (
                    <TableRow
                      key={c.id}
                      hover
                      sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(61,74,62,0.03)' } }}
                      onClick={() => navigate(`/clients/${c.id}`)}
                    >
                      <TableCell sx={{ fontWeight: 600, color: '#2D2D2D' }}>{c.name}</TableCell>
                      <TableCell sx={{ color: '#5C6B5E' }}>{c.email}</TableCell>
                      <TableCell>
                        <Chip label={c.care_package?.replace('_', ' ')} size="small" sx={{ textTransform: 'capitalize', fontSize: '11px' }} />
                      </TableCell>
                      <TableCell>
                        <Chip label={c.current_tier} size="small" sx={{ textTransform: 'capitalize', fontSize: '11px' }} />
                      </TableCell>
                      <TableCell align="right">{c.duration_days != null ? `${c.duration_days} days` : '—'}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}>{fmtCurrency(c.lifetime_revenue)}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}>{fmtNumber(c.lifetime_points)}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}>{fmtNumber(c.redeemable_points)}</TableCell>
                    </TableRow>
                  ))}
                  {sortedClients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, color: '#5C6B5E' }}>No clients found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            /* Geographic breakdown table */
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {[
                      { key: 'name', label: 'Name', align: 'left' },
                      { key: 'clients', label: 'Clients', align: 'right' },
                      { key: 'active_clients', label: 'Active', align: 'right' },
                      { key: 'revenue', label: 'Revenue', align: 'right' },
                      { key: 'avg_revenue_per_client', label: 'Rev / Client', align: 'right' },
                      { key: 'avg_tenure_days', label: 'Avg Duration', align: 'right' }
                    ].map(col => (
                      <TableCell key={col.key} align={col.align} sx={thSx}>
                        <TableSortLabel
                          active={sortConfig.key === col.key}
                          direction={sortConfig.key === col.key ? sortConfig.direction : 'desc'}
                          onClick={() => handleSort(col.key)}
                          sx={{ '&.MuiTableSortLabel-root': { color: '#5C6B5E' }, '&.Mui-active': { color: '#3D4A3E' } }}
                        >
                          {col.label}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedBreakdown.map(row => (
                    <TableRow
                      key={row.name}
                      hover
                      sx={{ '&:hover': { backgroundColor: 'rgba(61,74,62,0.03)' } }}
                    >
                      <TableCell sx={{ fontWeight: 600, color: '#2D2D2D' }}>
                        {level === 'country' ? (STATE_NAMES[row.name] || row.name) : row.name}
                      </TableCell>
                      <TableCell align="right">{row.clients}</TableCell>
                      <TableCell align="right">{row.active_clients}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}>{fmtCurrency(row.revenue)}</TableCell>
                      <TableCell align="right">{fmtCurrency(row.avg_revenue_per_client)}</TableCell>
                      <TableCell align="right">{row.avg_tenure_days} days</TableCell>
                    </TableRow>
                  ))}
                  {sortedBreakdown.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: '#5C6B5E' }}>No data for this period</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Box>

      {/* Hidden report layout for PDF capture */}
      <MarketReportLayout
        ref={reportLayoutRef}
        trendData={trendData}
        tierData={tierData}
        pkgData={pkgData}
      />
    </Box>
  );
};

export default MarketsPage;
