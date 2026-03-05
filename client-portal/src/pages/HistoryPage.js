import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField
} from '@mui/material';
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
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import { Grid } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { getTransactions } from '../services/api';
import { formatPoints, formatCurrency, formatShortDate } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';
import TierBadge from '../components/TierBadge';

const RANGE_OPTIONS = [
  { key: '1M', label: '1M', months: 1 },
  { key: '3M', label: '3M', months: 3 },
  { key: '6M', label: '6M', months: 6 },
  { key: '1Y', label: '1Y', months: 12 },
  { key: '2Y', label: '2Y', months: 24 },
  { key: '5Y', label: '5Y', months: 60 },
  { key: 'ALL', label: 'All', months: null }
];

const TYPE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'earn', label: 'Earned' },
  { value: 'redeem', label: 'Redeemed' },
  { value: 'adjustment', label: 'Adjustments' }
];

const ChartTooltip = ({ active, payload, label }) => {
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

const BAR_RANGE_OPTIONS = [
  { key: '3M', label: '3M', months: 3 },
  { key: '6M', label: '6M', months: 6 },
  { key: '1Y', label: '1Y', months: 12 },
  { key: 'ALL', label: 'All', months: null }
];

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

const HistoryPage = () => {
  const { client } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 0 });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [allPoints, setAllPoints] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [chartRange, setChartRange] = useState('ALL');
  const [barRange, setBarRange] = useState('ALL');
  const [chartLoading, setChartLoading] = useState(true);

  // Fetch chart data (all transactions)
  useEffect(() => {
    if (!client?.id) return;
    (async () => {
      try {
        let allTx = [];
        let pg = 1;
        let totalPages = 1;
        while (pg <= totalPages) {
          const { data } = await getTransactions(client.id, { page: pg, limit: 100 });
          allTx = allTx.concat(data.transactions || []);
          totalPages = data.pagination?.total_pages || 1;
          pg++;
        }
        const txList = allTx.slice().reverse();
        setAllTransactions(txList);
        setAllPoints(txList.map((tx) => ({
          ts: new Date(tx.date).getTime(),
          lifetime: tx.lifetime_balance || 0,
          balance: tx.balance || 0
        })));
      } catch (err) {
        console.error('Failed to load chart data', err);
      } finally {
        setChartLoading(false);
      }
    })();
  }, [client?.id]);

  // Fetch table data (paginated, filtered, searched)
  const fetchTransactions = useCallback(async () => {
    if (!client?.id) return;
    setLoading(true);
    try {
      const params = { page: page + 1, limit: rowsPerPage };
      if (typeFilter) params.type = typeFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const { data } = await getTransactions(client.id, params);
      setTransactions(data.transactions || []);
      setPagination(data.pagination || { total: 0, total_pages: 0 });
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      setLoading(false);
    }
  }, [client?.id, page, rowsPerPage, typeFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const chartData = useMemo(() => {
    if (!allPoints.length) return [];

    const now = new Date();
    const curMonthKey = `${now.getFullYear()}-${now.getMonth()}`;

    const rangeDef = RANGE_OPTIONS.find((r) => r.key === chartRange);
    let filtered = allPoints;
    if (rangeDef?.months) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - rangeDef.months);
      filtered = allPoints.filter((p) => p.ts >= cutoff.getTime());
    }
    if (!filtered.length) return [];

    const spanMs = filtered[filtered.length - 1].ts - filtered[0].ts;
    const spanDays = spanMs / (1000 * 60 * 60 * 24);

    let dateKey, dateLabel;
    if (spanDays <= 90) {
      dateKey = (ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
      dateLabel = dateKey;
    } else {
      dateKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}`; };
      dateLabel = (ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }

    const byKey = new Map();
    filtered.forEach((p) => {
      const key = dateKey(p.ts);
      if (spanDays > 90 && key === curMonthKey) return;
      byKey.set(key, { date: dateLabel(p.ts), lifetime: p.lifetime, balance: p.balance });
    });
    return Array.from(byKey.values());
  }, [allPoints, chartRange]);

  const barChartData = useMemo(() => {
    if (!allTransactions.length) return [];

    const rangeDef = BAR_RANGE_OPTIONS.find((r) => r.key === barRange);
    let filtered = allTransactions;
    if (rangeDef?.months) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - rangeDef.months);
      filtered = allTransactions.filter((tx) => new Date(tx.date) >= cutoff);
    }

    const monthMap = new Map();
    filtered.forEach((tx) => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, { key, earned: 0 });
      }
      const entry = monthMap.get(key);
      if (tx.type === 'earn') {
        entry.earned += tx.points_earned || 0;
      } else if (tx.type === 'adjustment') {
        const adj = tx.points_adjusted || 0;
        if (adj > 0) entry.earned += adj;
      }
    });

    const now = new Date();
    const curMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return Array.from(monthMap.values())
      .filter((m) => m.key !== curMonthKey)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((m) => {
        const [y, mo] = m.key.split('-');
        const d = new Date(parseInt(y), parseInt(mo) - 1);
        return {
          month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          earned: m.earned
        };
      });
  }, [allTransactions, barRange]);

  const getTypeChip = (type) => {
    const styles = {
      earn: { label: 'Earned', color: '#5A8A7A', bg: 'rgba(90, 138, 122, 0.1)' },
      redeem: { label: 'Redeemed', color: '#C1592E', bg: 'rgba(193, 89, 46, 0.1)' },
      adjustment: { label: 'Adjusted', color: '#3D4A3E', bg: 'rgba(61, 74, 62, 0.1)' }
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

  const getClientDescription = (tx) => {
    const desc = tx.description || '';
    const cleaned = desc
      .replace(/^AxisCare\s+(sync|payment)\s*[-—]\s*/i, '')
      .replace(/^(Manual entry|Generic payment)\s*[-—]\s*/i, '')
      .trim();
    if (tx.type === 'earn') return cleaned || (tx.invoice_amount ? 'Care Package Payment' : 'Points Earned');
    if (tx.type === 'redeem') return cleaned || 'Points Redeemed';
    if (tx.type === 'beneficiary_transfer') return cleaned || 'Beneficiary Transfer';
    if (tx.type === 'adjustment') return cleaned || 'Points Adjustment';
    return cleaned || '-';
  };

  const getPointsDisplay = (tx) => {
    if (tx.type === 'earn') {
      return { value: `+${formatPoints(tx.points_earned)}`, color: '#5A8A7A' };
    } else if (tx.type === 'redeem') {
      return { value: `-${formatPoints(tx.points_redeemed)}`, color: '#C1592E' };
    } else {
      const val = tx.points_adjusted || 0;
      return {
        value: val > 0 ? `+${formatPoints(val)}` : formatPoints(val),
        color: val >= 0 ? '#5A8A7A' : '#C1592E'
      };
    }
  };

  return (
    <Box sx={{ px: { xs: 2, md: 5 }, py: { xs: 3, md: 4 } }}>
      {/* Header */}
      <Typography
        variant="h2"
        sx={{
          fontFamily: '"Outfit", sans-serif',
          color: '#2D2D2D',
          fontSize: { xs: '24px', md: '28px' },
          mb: 1
        }}
      >
        Points History
      </Typography>
      <Typography variant="body1" sx={{ color: '#5C6B5E', mb: 3 }}>
        Track your points activity over time
      </Typography>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Monthly Activity Bar Chart */}
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

            {chartLoading ? (
              <Box sx={{ py: 8 }}><LoadingSpinner /></Box>
            ) : barChartData.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6, px: 3 }}>
                <StarOutlineIcon sx={{ fontSize: 40, color: 'rgba(212, 149, 106, 0.25)', mb: 1 }} />
                <Typography variant="body2" sx={{ color: '#5C6B5E' }}>
                  No activity yet.
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

        {/* Points History Line Chart */}
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
                  Points History
                </Typography>
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

            {chartLoading ? (
              <Box sx={{ py: 8 }}><LoadingSpinner /></Box>
            ) : chartData.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6, px: 3 }}>
                <StarOutlineIcon sx={{ fontSize: 40, color: 'rgba(212, 149, 106, 0.25)', mb: 1 }} />
                <Typography variant="body2" sx={{ color: '#5C6B5E' }}>
                  No data for this time range.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ px: { xs: 0.5, md: 1 }, pb: 2 }}>
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="histGradBalance" x1="0" y1="0" x2="0" y2="1">
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
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="balance"
                      name="Balance"
                      stroke="#D4956A"
                      strokeWidth={2}
                      fill="url(#histGradBalance)"
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

      {/* Transactions Header & Filters */}
      <Typography
        sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D', fontWeight: 500, fontSize: '18px', mb: 2 }}
      >
        Transactions
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          {TYPE_FILTERS.map((f) => (
            <Box
              key={f.value}
              onClick={() => { setTypeFilter(f.value); setPage(0); }}
              sx={{
                px: 2,
                py: 0.75,
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: typeFilter === f.value ? 600 : 500,
                color: typeFilter === f.value ? '#FFF' : '#5C6B5E',
                backgroundColor: typeFilter === f.value ? '#3D4A3E' : 'transparent',
                border: typeFilter === f.value ? 'none' : '1px solid rgba(61, 74, 62, 0.15)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: typeFilter === f.value ? '#4A5A4C' : 'rgba(61, 74, 62, 0.06)'
                }
              }}
            >
              {f.label}
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', ml: { sm: 'auto' } }}>
          <TextField
            type="date"
            size="small"
            label="From"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            InputLabelProps={{ shrink: true }}
            sx={{
              width: 155,
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                backgroundColor: 'rgba(255,255,255,0.7)',
                fontSize: '13px',
                '& fieldset': { borderColor: 'rgba(61, 74, 62, 0.15)' },
                '&:hover fieldset': { borderColor: 'rgba(61, 74, 62, 0.3)' },
                '&.Mui-focused fieldset': { borderColor: '#3D4A3E' }
              },
              '& .MuiInputLabel-root': { fontSize: '12px', color: '#8A9A8C' }
            }}
          />
          <Typography sx={{ color: '#8A9A8C', fontSize: '13px' }}>to</Typography>
          <TextField
            type="date"
            size="small"
            label="To"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            InputLabelProps={{ shrink: true }}
            sx={{
              width: 155,
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                backgroundColor: 'rgba(255,255,255,0.7)',
                fontSize: '13px',
                '& fieldset': { borderColor: 'rgba(61, 74, 62, 0.15)' },
                '&:hover fieldset': { borderColor: 'rgba(61, 74, 62, 0.3)' },
                '&.Mui-focused fieldset': { borderColor: '#3D4A3E' }
              },
              '& .MuiInputLabel-root': { fontSize: '12px', color: '#8A9A8C' }
            }}
          />
          {(dateFrom || dateTo) && (
            <Box
              onClick={() => { setDateFrom(''); setDateTo(''); setPage(0); }}
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#C1592E',
                '&:hover': { backgroundColor: 'rgba(193, 89, 46, 0.06)' }
              }}
            >
              Clear
            </Box>
          )}
        </Box>
      </Box>

      {/* Table */}
      <Box
        sx={{
          background: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '12px',
          boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
          overflow: 'hidden'
        }}
      >
        {loading ? (
          <LoadingSpinner />
        ) : transactions.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: '#5C6B5E' }}>
              {(dateFrom || dateTo || typeFilter) ? 'No transactions match your filters.' : 'No transactions found.'}
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(61, 74, 62, 0.03)' }}>
                    <TableCell>Date</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Invoice</TableCell>
                    <TableCell align="right">Change</TableCell>
                    <TableCell align="right">Balance</TableCell>
                    <TableCell>Tier</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((tx, idx) => {
                    const pts = getPointsDisplay(tx);
                    return (
                      <TableRow
                        key={tx.id}
                        sx={{
                          backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(61, 74, 62, 0.02)',
                          '&:hover': { backgroundColor: 'rgba(61, 74, 62, 0.05)' },
                          transition: 'background-color 0.2s ease'
                        }}
                      >
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#2D2D2D' }}>
                            {formatShortDate(tx.date)}
                          </Typography>
                        </TableCell>
                        <TableCell>{getTypeChip(tx.type)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#5C6B5E' }}>
                            {getClientDescription(tx)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ color: '#2D2D2D' }}>
                            {tx.invoice_amount ? formatCurrency(tx.invoice_amount) : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700, color: pts.color, fontFamily: '"Outfit", sans-serif' }}
                          >
                            {pts.value}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 500, color: '#2D2D2D', fontFamily: '"Outfit", sans-serif' }}
                          >
                            {tx.balance != null ? formatPoints(tx.balance) : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <TierBadge tier={tx.tier_at_transaction} size="small" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={pagination.total}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 20, 50]}
              sx={{
                borderTop: '1px solid rgba(61, 74, 62, 0.08)',
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                  color: '#5C6B5E'
                }
              }}
            />
          </>
        )}
      </Box>
    </Box>
  );
};

export default HistoryPage;
