import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  TablePagination, InputAdornment, TableSortLabel, Chip, Grid
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { getClients } from '../services/api';
import { formatPoints, formatCurrency } from '../utils/formatters';
import TierBadge from '../components/TierBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { frostedCardSx } from '../theme';

const ClientListPage = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [packageFilter, setPackageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total_clients: 0, avg_cltv: 0, avg_duration_days: 0 });
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...(search && { search }),
        ...(tierFilter && { tier: tierFilter }),
        ...(packageFilter && { care_package: packageFilter }),
        status: statusFilter
      };
      const { data } = await getClients(params);
      setClients(data.clients);
      setTotal(data.pagination.total);
      if (data.summary) setSummary(data.summary);
    } catch (err) {
      console.error('Failed to load clients', err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, tierFilter, packageFilter, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      fetchClients();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder(column === 'name' ? 'asc' : 'desc');
    }
    setPage(0);
  };

  const columns = [
    { id: 'name', label: 'Name', align: 'left', sortable: false },
    { id: 'current_tier', label: 'Tier', align: 'left', sortable: false },
    { id: 'lifetime_points', label: 'Lifetime Points', align: 'right', sortable: true },
    { id: 'redeemable_points', label: 'Redeemable Points', align: 'right', sortable: true },
    { id: 'points_redeemed', label: 'Points Redeemed', align: 'right', sortable: true },
    { id: 'lifetime_revenue', label: 'Lifetime Revenue', align: 'right', sortable: true },
    { id: 'tenure_days', label: 'Duration', align: 'right', sortable: true }
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Clients</Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Clients', value: String(summary.total_clients), sub: `${summary.active_clients || 0} currently active` },
          { label: 'Avg CLTV', value: formatCurrency(summary.avg_cltv), sub: 'lifetime value per client' },
          { label: 'Avg Duration', value: `${summary.avg_duration_days} days`, sub: `across ${summary.total_clients} clients` }
        ].map((stat) => (
          <Grid item xs={12} sm={6} md={4} key={stat.label}>
            <Box sx={{ ...frostedCardSx, p: 3, textAlign: 'center', height: 130, display: 'flex', flexDirection: 'column', justifyContent: 'center', '&:hover': { transform: 'none' } }}>
              <Typography variant="subtitle2" sx={{ color: '#5C6B5E', mb: 0.5 }}>{stat.label}</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', mb: 0.5 }}>{stat.value}</Typography>
              <Typography variant="caption" sx={{ color: '#5C6B5E' }}>{stat.sub}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search by name, email, or AxisCare ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 250 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
          }}
        />
        <FormControl sx={{ minWidth: 140 }}>
          <InputLabel>Tier</InputLabel>
          <Select value={tierFilter} onChange={(e) => { setTierFilter(e.target.value); setPage(0); }} label="Tier">
            <MenuItem value="">All Tiers</MenuItem>
            {['bronze', 'silver', 'gold', 'platinum', 'diamond'].map((t) => (
              <MenuItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel>Care Package</InputLabel>
          <Select value={packageFilter} onChange={(e) => { setPackageFilter(e.target.value); setPage(0); }} label="Care Package">
            <MenuItem value="">All Packages</MenuItem>
            <MenuItem value="essentials">Essentials</MenuItem>
            <MenuItem value="premium">Premium</MenuItem>
            <MenuItem value="white_glove">White Glove</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 130 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} label="Status">
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
            <MenuItem value="all">All</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell key={col.id} align={col.align}>
                    {col.sortable ? (
                      <TableSortLabel
                        active={sortBy === col.id}
                        direction={sortBy === col.id ? sortOrder : 'asc'}
                        onClick={() => handleSort(col.id)}
                      >
                        {col.label}
                      </TableSortLabel>
                    ) : (
                      col.label
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {clients.map((client) => (
                <TableRow
                  key={client.id}
                  hover
                  sx={{ cursor: 'pointer', opacity: client.is_active === false ? 0.55 : 1 }}
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{client.name}</Typography>
                        <Typography variant="caption" sx={{ color: '#5C6B5E' }}>{client.email}</Typography>
                      </Box>
                      {client.is_active === false && (
                        <Chip label="Inactive" size="small" sx={{ fontSize: '10px', height: 20, bgcolor: 'rgba(211,47,47,0.08)', color: '#d32f2f' }} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell><TierBadge tier={client.current_tier} size="small" /></TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"Outfit", sans-serif' }}>
                      {formatPoints(client.lifetime_points)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontFamily: '"Outfit", sans-serif' }}>
                      {formatPoints(client.redeemable_points)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ color: client.points_redeemed > 0 ? '#C1592E' : '#5C6B5E', fontFamily: '"Outfit", sans-serif' }}>
                      {formatPoints(client.points_redeemed)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontFamily: '"Outfit", sans-serif' }}>
                      {formatCurrency(client.lifetime_revenue)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ color: '#5C6B5E' }}>
                      {client.tenure_days} days
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              {clients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">No clients found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50]}
          />
        </TableContainer>
      )}
    </Box>
  );
};

export default ClientListPage;
