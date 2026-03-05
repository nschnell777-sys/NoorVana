import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import {
  PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  getDashboardSummary, getTierDistribution, getMonthlyStats,
  getTopClients, getRedemptionStats
} from '../services/api';
import TierBadge from '../components/TierBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { exportToCsv } from '../utils/csv';
import { formatPoints } from '../utils/formatters';
import { frostedCardSx, CHART_COLORS } from '../theme';

const TIER_COLORS = {
  bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700',
  platinum: '#e5e4e2', diamond: '#b9f2ff'
};

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.95)',
  border: '1px solid rgba(61,74,62,0.12)',
  borderRadius: '10px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  fontSize: '13px'
};

const LEGEND_STYLE = { fontSize: '13px', color: '#5C6B5E' };

const SectionHeader = ({ title, action }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
    <Typography variant="h6" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}>
      {title}
    </Typography>
    {action}
  </Box>
);

const ReportsPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [tierData, setTierData] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [redemptionStats, setRedemptionStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dashRes, tierRes, monthlyRes, topRes, redemptionRes] = await Promise.all([
          getDashboardSummary(),
          getTierDistribution(),
          getMonthlyStats(12),
          getTopClients(20),
          getRedemptionStats()
        ]);
        setDashboard(dashRes.data);
        setTierData(tierRes.data);
        const curMonth = new Date().toISOString().slice(0, 7);
        setMonthlyData((monthlyRes.data.months || [])
          .filter(m => m.month !== curMonth)
          .map(m => ({
            ...m,
            revenue: parseFloat(m.revenue) || 0,
            points_accrued: parseInt(m.points_accrued, 10) || 0,
            redemptions_count: parseInt(m.redemptions_count, 10) || 0,
            redemptions_value: parseFloat(m.redemptions_value) || 0
          })));
        setTopClients(topRes.data.clients || []);
        setRedemptionStats(redemptionRes.data);
      } catch (err) {
        console.error('Failed to load reports', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <LoadingSpinner />;

  // Derived data
  const pieData = tierData
    ? Object.entries(tierData.tier_distribution).map(([tier, count]) => ({
        name: tier.charAt(0).toUpperCase() + tier.slice(1),
        tier,
        value: count,
        color: TIER_COLORS[tier]
      }))
    : [];
  const totalClients = tierData?.total_clients || 1;

  const totals = monthlyData.reduce((acc, m) => ({
    revenue: acc.revenue + m.revenue,
    points: acc.points + m.points_accrued,
    redemptionValue: acc.redemptionValue + m.redemptions_value
  }), { revenue: 0, points: 0, redemptionValue: 0 });

  const fmtCurrency = (v) => `$${(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h3" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, color: '#2D2D2D' }}>
          Reports & Analytics
        </Typography>
        <Typography variant="body2" sx={{ color: '#5C6B5E', mt: 0.5 }}>
          Comprehensive program analytics for business decisions
        </Typography>
      </Box>

      {/* Section 1: KPI Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: 'Total Clients', value: String(dashboard?.total_clients ?? 0), sub: 'active in program' },
          { label: 'Avg. Client Duration', value: `${dashboard?.avg_tenure_days ?? 0}`, sub: 'days in program' },
          { label: 'Avg. Revenue / Client', value: fmtCurrency(parseFloat(dashboard?.avg_revenue_per_client)), sub: 'from AxisCare billing' },
          { label: 'Avg. Redemptions / Client', value: fmtCurrency(parseFloat(dashboard?.avg_redemptions_per_client)), sub: 'in credit redeemed' }
        ].map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.label}>
            <Box sx={{ ...frostedCardSx, p: 3, textAlign: 'center', height: 130, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="subtitle2" sx={{ color: '#5C6B5E', mb: 0.5 }}>{stat.label}</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', mb: 0.5 }}>{stat.value}</Typography>
              <Typography variant="caption" sx={{ color: '#5C6B5E' }}>{stat.sub}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Section 2: Revenue & Points Trends */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={7}>
          <Box sx={{ ...frostedCardSx, p: 3, '&:hover': { transform: 'none' } }}>
            <SectionHeader title="Revenue & Points Trends" />
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="rptGradPrimary" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="rptGradSecondary" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="rptGradTertiary" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.tertiary} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={CHART_COLORS.tertiary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,74,62,0.08)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#5C6B5E' }} axisLine={{ stroke: 'rgba(61,74,62,0.12)' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#5C6B5E' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => {
                    if (name === 'Revenue' || name === 'Redemption Value') return [fmtCurrency(value), name];
                    return [value.toLocaleString(), name];
                  }} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={LEGEND_STYLE} />
                  <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.tertiary} strokeWidth={2.5} fill="url(#rptGradTertiary)" name="Revenue" dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: '#fff' }} />
                  <Area type="monotone" dataKey="points_accrued" stroke={CHART_COLORS.primary} strokeWidth={2.5} fill="url(#rptGradPrimary)" name="Points Accrued" dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: '#fff' }} />
                  <Area type="monotone" dataKey="redemptions_value" stroke={CHART_COLORS.secondary} strokeWidth={2.5} fill="url(#rptGradSecondary)" name="Redemption Value" dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">No monthly data available yet</Typography>
              </Box>
            )}
          </Box>
        </Grid>
        <Grid item xs={12} md={5}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
            {[
              { label: 'Total Revenue (12 mo)', value: fmtCurrency(totals.revenue), color: CHART_COLORS.tertiary },
              { label: 'Total Points Issued (12 mo)', value: totals.points.toLocaleString(), color: CHART_COLORS.primary },
              { label: 'Total Redemption Value (12 mo)', value: fmtCurrency(totals.redemptionValue), color: CHART_COLORS.secondary }
            ].map((card) => (
              <Box key={card.label} sx={{ ...frostedCardSx, p: 3, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                <Typography variant="subtitle2" sx={{ color: '#5C6B5E', mb: 0.5 }}>{card.label}</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: card.color }}>{card.value}</Typography>
              </Box>
            ))}
          </Box>
        </Grid>
      </Grid>

      {/* Section 3: Tier Analytics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={5}>
          <Box sx={{ ...frostedCardSx, p: 3, '&:hover': { transform: 'none' } }}>
            <SectionHeader title="Tier Distribution" />
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={3}
                  cornerRadius={6}
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={10} wrapperStyle={LEGEND_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Grid>
        <Grid item xs={12} md={7}>
          <Box sx={{ ...frostedCardSx, p: 3, '&:hover': { transform: 'none' } }}>
            <SectionHeader
              title="Tier Breakdown"
              action={
                <Button
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={() => exportToCsv(
                    pieData.map((d) => ({ Tier: d.name, Clients: d.value, Percentage: ((d.value / totalClients) * 100).toFixed(1) + '%' })),
                    'tier-distribution.csv'
                  )}
                  sx={{ color: '#5C6B5E', textTransform: 'none' }}
                >
                  Export CSV
                </Button>
              }
            />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Tier</TableCell>
                    <TableCell align="right">Clients</TableCell>
                    <TableCell align="right">% of Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pieData.map((row) => (
                    <TableRow key={row.name} hover>
                      <TableCell><TierBadge tier={row.tier} size="small" /></TableCell>
                      <TableCell align="right">{row.value}</TableCell>
                      <TableCell align="right">{((row.value / totalClients) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ mt: 2, display: 'flex', gap: 3, pt: 2, borderTop: '1px solid rgba(61,74,62,0.08)' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#5C6B5E' }}>Avg. Lifetime Points</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, fontFamily: '"Outfit", sans-serif' }}>
                  {formatPoints(tierData?.average_lifetime_points || 0)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#5C6B5E' }}>Total Redeemable Points</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, fontFamily: '"Outfit", sans-serif' }}>
                  {formatPoints(tierData?.total_redeemable_points || 0)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Section 4: Redemption Analytics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={7}>
          <Box sx={{ ...frostedCardSx, p: 3, '&:hover': { transform: 'none' } }}>
            <SectionHeader title="Monthly Redemptions" />
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,74,62,0.08)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#5C6B5E' }} axisLine={{ stroke: 'rgba(61,74,62,0.12)' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#5C6B5E' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => {
                    if (name === 'Value') return [fmtCurrency(value), name];
                    return [value.toLocaleString(), name];
                  }} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={LEGEND_STYLE} />
                  <Bar dataKey="redemptions_count" fill={CHART_COLORS.primary} name="Count" radius={[4, 4, 0, 0]} barSize={monthlyData.length > 15 ? undefined : Math.min(80, Math.floor(500 / (monthlyData.length || 1)))} />
                  <Bar dataKey="redemptions_value" fill={CHART_COLORS.secondary} name="Value" radius={[4, 4, 0, 0]} barSize={monthlyData.length > 15 ? undefined : Math.min(80, Math.floor(500 / (monthlyData.length || 1)))} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">No redemption data available yet</Typography>
              </Box>
            )}
          </Box>
        </Grid>
        <Grid item xs={12} md={5}>
          <Box sx={{ height: '100%' }}>
            <SectionHeader title="Redemption Pipeline" />
            <Grid container spacing={2}>
              {[
                { label: 'Pending', value: redemptionStats?.pending_count ?? 0, color: '#D4956A' },
                { label: 'Processing', value: redemptionStats?.processing_count ?? 0, color: '#5A8A7A' },
                { label: 'Fulfilled Today', value: redemptionStats?.fulfilled_today ?? 0, color: '#3D4A3E' },
                { label: 'Monthly Value', value: fmtCurrency(redemptionStats?.monthly_value), color: '#3D4A3E' }
              ].map((card) => (
                <Grid item xs={6} key={card.label}>
                  <Box sx={{ ...frostedCardSx, p: 2.5, textAlign: 'center', height: 130, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#5C6B5E', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                      {card.label}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: card.value > 0 || typeof card.value === 'string' ? card.color : '#9CA89E', mt: 0.5 }}>
                      {card.value}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Grid>
      </Grid>

      {/* Section 5: Top Clients Table */}
      <Box sx={{ ...frostedCardSx, p: 3, mb: 4, '&:hover': { transform: 'none' } }}>
        <SectionHeader
          title="Top Clients by Lifetime Points"
          action={
            <Button
              size="small"
              startIcon={<DownloadIcon />}
              onClick={() => exportToCsv(
                topClients.map((c, i) => ({
                  Rank: i + 1,
                  Name: c.name,
                  Email: c.email,
                  'Care Package': c.care_package,
                  Tier: c.current_tier,
                  'Lifetime Points': c.lifetime_points,
                  'Redeemable Points': c.redeemable_points
                })),
                'top-clients.csv'
              )}
              sx={{ color: '#5C6B5E', textTransform: 'none' }}
            >
              Export CSV
            </Button>
          }
        />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Care Package</TableCell>
                <TableCell>Tier</TableCell>
                <TableCell align="right">Lifetime Points</TableCell>
                <TableCell align="right">Redeemable Points</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No client data available</Typography>
                  </TableCell>
                </TableRow>
              ) : topClients.map((client, index) => (
                <TableRow key={client.id} hover>
                  <TableCell sx={{ fontWeight: 600, color: '#5C6B5E' }}>{index + 1}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{client.name}</TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{(client.care_package || '').replace('_', ' ')}</TableCell>
                  <TableCell><TierBadge tier={client.current_tier} size="small" /></TableCell>
                  <TableCell align="right">{formatPoints(client.lifetime_points)}</TableCell>
                  <TableCell align="right">{formatPoints(client.redeemable_points)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Section 6: Monthly Data Table */}
      <Box sx={{ ...frostedCardSx, p: 3, '&:hover': { transform: 'none' } }}>
        <SectionHeader
          title="Monthly Data"
          action={
            <Button
              size="small"
              startIcon={<DownloadIcon />}
              onClick={() => exportToCsv(
                monthlyData.map((m) => ({
                  Month: m.month,
                  Revenue: m.revenue.toFixed(2),
                  'Points Accrued': m.points_accrued,
                  'Redemption Count': m.redemptions_count,
                  'Redemption Value': m.redemptions_value.toFixed(2)
                })),
                'monthly-data.csv'
              )}
              sx={{ color: '#5C6B5E', textTransform: 'none' }}
            >
              Export CSV
            </Button>
          }
        />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Month</TableCell>
                <TableCell align="right">Revenue</TableCell>
                <TableCell align="right">Points Accrued</TableCell>
                <TableCell align="right">Redemption Count</TableCell>
                <TableCell align="right">Redemption Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {monthlyData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No monthly data available</Typography>
                  </TableCell>
                </TableRow>
              ) : monthlyData.map((m) => (
                <TableRow key={m.month} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{m.month}</TableCell>
                  <TableCell align="right">{fmtCurrency(m.revenue)}</TableCell>
                  <TableCell align="right">{m.points_accrued.toLocaleString()}</TableCell>
                  <TableCell align="right">{m.redemptions_count.toLocaleString()}</TableCell>
                  <TableCell align="right">{fmtCurrency(m.redemptions_value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default ReportsPage;
