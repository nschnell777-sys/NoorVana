import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Chip,
  Collapse,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import ClearIcon from '@mui/icons-material/Clear';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAllTransactions } from '../services/api';
import { formatPoints, formatCurrency, formatShortDate } from '../utils/formatters';
import { frostedCardSx } from '../theme';
import LoadingSpinner from '../components/LoadingSpinner';
import TierBadge from '../components/TierBadge';

const TIME_PERIODS = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: 'YTD', months: 0 },
  { label: '1Y', months: 12 },
  { label: '2Y', months: 24 },
  { label: '5Y', months: 60 },
  { label: 'All', months: 999 }
];

const computeDateRange = (periodLabel) => {
  if (periodLabel === 'All') return { from: '', to: '' };
  const now = new Date();
  let from;
  if (periodLabel === 'YTD') {
    from = new Date(now.getFullYear(), 0, 1);
  } else {
    const period = TIME_PERIODS.find(p => p.label === periodLabel);
    from = new Date(now);
    from.setMonth(from.getMonth() - period.months);
  }
  return {
    from: from.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10)
  };
};

const typeFilters = [
  { value: '', label: 'All' },
  { value: 'earn', label: 'Earned' },
  { value: 'redeem', label: 'Redeemed' },
  { value: 'adjustment', label: 'Adjustments' }
];

const sortableColumns = [
  { id: 'created_at', label: 'Date' },
  { id: 'client_name', label: 'Client' },
  { id: 'transaction_type', label: 'Type' },
  { id: 'source', label: 'Source' },
  { id: 'invoice_amount', label: 'Invoice', align: 'right' },
  { id: 'lifetime_points_change', label: 'Points', align: 'right' }
];

const TransactionsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ total_transactions: 0, total_revenue: 0, unique_clients: 0 });
  const [pagination, setPagination] = useState({ total: 0, total_pages: 0 });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dateFrom, setDateFrom] = useState(searchParams.get('date_from') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('date_to') || '');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('All');

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: page + 1, limit: rowsPerPage };
      if (typeFilter) params.type = typeFilter;
      if (search) params.search = search;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (sortBy) params.sort_by = sortBy;
      if (sortOrder) params.sort_order = sortOrder;
      const { data } = await getAllTransactions(params);
      setTransactions(data.transactions || []);
      if (data.summary) setSummary(data.summary);
      setPagination(data.pagination || { total: 0, total_pages: 0 });
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, typeFilter, search, dateFrom, dateTo, sortBy, sortOrder]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleFilterChange = (_, newFilter) => {
    if (newFilter !== null) {
      setTypeFilter(newFilter);
      setPage(0);
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder(column === 'created_at' ? 'desc' : 'asc');
    }
    setPage(0);
  };

  const handlePeriodChange = (_, newPeriod) => {
    if (newPeriod === null) return;
    setSelectedPeriod(newPeriod);
    const range = computeDateRange(newPeriod);
    setDateFrom(range.from);
    setDateTo(range.to);
    setPage(0);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearch('');
    setTypeFilter('');
    setDateFrom('');
    setDateTo('');
    setSelectedPeriod('All');
    setSortBy('created_at');
    setSortOrder('desc');
    setPage(0);
  };

  const hasActiveFilters = search || typeFilter || dateFrom || dateTo;

  const getTypeChip = (type) => {
    const styles = {
      earn: { label: 'Earned', color: '#5A8A7A', bg: 'rgba(90, 138, 122, 0.1)' },
      redeem: { label: 'Redeemed', color: '#C1592E', bg: 'rgba(193, 89, 46, 0.1)' },
      adjustment: { label: 'Adjusted', color: '#3D4A3E', bg: 'rgba(61, 74, 62, 0.1)' },
      beneficiary_transfer: { label: 'Beneficiary', color: '#7B5EA7', bg: 'rgba(123, 94, 167, 0.1)' }
    };
    const style = styles[type] || styles.earn;
    return (
      <Chip
        label={style.label}
        size="small"
        sx={{
          backgroundColor: style.bg,
          color: style.color,
          fontWeight: 600,
          fontSize: '11px',
          height: 24
        }}
      />
    );
  };

  const getPointsDisplay = (tx) => {
    let pts = tx.lifetime_points_change;
    if (tx.transaction_type === 'redeem' || tx.transaction_type === 'beneficiary_transfer') {
      pts = tx.redeemable_points_change;
    } else if (tx.transaction_type === 'adjustment') {
      pts = tx.lifetime_points_change || tx.redeemable_points_change;
    }
    return {
      value: pts > 0 ? `+${formatPoints(pts)}` : formatPoints(pts),
      color: pts >= 0 ? '#5A8A7A' : '#C1592E'
    };
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700 }}>Recent Transactions</Typography>
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
      <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 3 }}>
        All points activity across clients from AxisCare billing
      </Typography>

      {/* Summary Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Transactions', value: summary.total_transactions.toLocaleString(), sub: `across ${summary.unique_clients} clients` },
          { label: 'Avg Transactions / Client', value: summary.unique_clients ? Math.round(summary.total_transactions / summary.unique_clients).toLocaleString() : '0', sub: 'transactions per client' },
          { label: 'Total Revenue', value: formatCurrency(summary.total_revenue), sub: 'total billed amount' },
          { label: 'Avg Revenue / Client', value: summary.unique_clients ? formatCurrency(summary.total_revenue / summary.unique_clients) : '$0.00', sub: 'revenue per client' }
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

      {/* Search + Filters Row */}
      <Box sx={{
        ...frostedCardSx,
        p: 2.5,
        mb: 3,
        '&:hover': { transform: 'none' }
      }}>
        {/* Search bar */}
        <TextField
          placeholder="Search by client name, invoice ID, or description..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          size="small"
          fullWidth
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlinedIcon sx={{ color: '#9CA89E', fontSize: 20 }} />
              </InputAdornment>
            ),
            endAdornment: searchInput && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => { setSearchInput(''); setSearch(''); }}>
                  <ClearIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </InputAdornment>
            )
          }}
        />

        {/* Filters row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          {/* Type toggle */}
          <ToggleButtonGroup
            value={typeFilter}
            exclusive
            onChange={handleFilterChange}
            size="small"
            sx={{
              gap: 1,
              '& .MuiToggleButton-root': {
                borderRadius: '10px',
                px: 2,
                py: 0.6,
                border: '1px solid rgba(61, 74, 62, 0.15)',
                color: '#5C6B5E',
                fontSize: '13px',
                fontWeight: 500,
                textTransform: 'none',
                '&.Mui-selected': {
                  backgroundColor: '#3D4A3E',
                  color: '#EFEBE4',
                  '&:hover': { backgroundColor: '#4A5A4C' }
                },
                '&:hover': {
                  backgroundColor: 'rgba(61, 74, 62, 0.06)'
                }
              }
            }}
          >
            {typeFilters.map((f) => (
              <ToggleButton key={f.value} value={f.value}>
                {f.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          {/* Date range */}
          <TextField
            type="date"
            size="small"
            label="From"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setSelectedPeriod(''); setPage(0); }}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 155 }}
          />
          <TextField
            type="date"
            size="small"
            label="To"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setSelectedPeriod(''); setPage(0); }}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 155 }}
          />

          {/* Clear all */}
          {hasActiveFilters && (
            <Tooltip title="Clear all filters">
              <Chip
                label="Clear Filters"
                size="small"
                onDelete={handleClearFilters}
                onClick={handleClearFilters}
                sx={{
                  backgroundColor: 'rgba(193, 89, 46, 0.1)',
                  color: '#C1592E',
                  fontWeight: 600,
                  fontSize: '12px',
                  '& .MuiChip-deleteIcon': { color: '#C1592E' }
                }}
              />
            </Tooltip>
          )}
        </Box>

        {/* Active filter summary */}
        {hasActiveFilters && (
          <Typography variant="caption" sx={{ color: '#5C6B5E', mt: 1.5, display: 'block' }}>
            Showing {pagination.total} result{pagination.total !== 1 ? 's' : ''}
            {search && <> matching "<strong>{search}</strong>"</>}
            {typeFilter && <> of type <strong>{typeFilter}</strong></>}
            {dateFrom && <> from <strong>{dateFrom}</strong></>}
            {dateTo && <> to <strong>{dateTo}</strong></>}
          </Typography>
        )}
      </Box>

      {/* Table */}
      <Box
        sx={{
          ...frostedCardSx,
          overflow: 'hidden',
          '&:hover': { transform: 'none' }
        }}
      >
        {loading ? (
          <LoadingSpinner />
        ) : transactions.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: '#5C6B5E' }}>
              {hasActiveFilters ? 'No transactions match your filters.' : 'No transactions found.'}
            </Typography>
            {hasActiveFilters && (
              <Chip
                label="Clear Filters"
                size="small"
                onClick={handleClearFilters}
                sx={{ mt: 1.5, cursor: 'pointer' }}
              />
            )}
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(61, 74, 62, 0.03)' }}>
                    <TableCell sx={{ width: 28, px: 1 }} />
                    {sortableColumns.map((col) => (
                      <TableCell key={col.id} align={col.align || 'left'}>
                        <TableSortLabel
                          active={sortBy === col.id}
                          direction={sortBy === col.id ? sortOrder : 'asc'}
                          onClick={() => handleSort(col.id)}
                          sx={{
                            '&.Mui-active': { color: '#3D4A3E' },
                            '&.Mui-active .MuiTableSortLabel-icon': { color: '#3D4A3E' }
                          }}
                        >
                          {col.label}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                    <TableCell>Tier</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((tx, idx) => {
                    const pts = getPointsDisplay(tx);
                    const isExpanded = expandedId === tx.id;
                    const hasDescription = !!tx.description;

                    return (
                      <React.Fragment key={tx.id}>
                        <TableRow
                          onClick={() => hasDescription && setExpandedId(isExpanded ? null : tx.id)}
                          sx={{
                            cursor: hasDescription ? 'pointer' : 'default',
                            backgroundColor: isExpanded
                              ? 'rgba(61, 74, 62, 0.04)'
                              : idx % 2 === 0
                                ? 'transparent'
                                : 'rgba(61, 74, 62, 0.02)',
                            '&:hover': { backgroundColor: 'rgba(61, 74, 62, 0.05)' },
                            transition: 'background-color 0.2s ease',
                            '& > td': { borderBottom: isExpanded ? 'none' : undefined }
                          }}
                        >
                          <TableCell sx={{ width: 28, px: 1, py: 1.5 }}>
                            {hasDescription && (
                              isExpanded
                                ? <KeyboardArrowUpIcon sx={{ fontSize: 20, color: '#9CA89E', verticalAlign: 'middle' }} />
                                : <KeyboardArrowDownIcon sx={{ fontSize: 20, color: '#9CA89E', verticalAlign: 'middle' }} />
                            )}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: '#2D2D2D' }}>
                              {formatShortDate(tx.created_at)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 500,
                                color: '#3D4A3E',
                                cursor: 'pointer',
                                '&:hover': { textDecoration: 'underline' }
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/clients/${tx.client_id}`);
                              }}
                            >
                              {tx.client_name}
                            </Typography>
                          </TableCell>
                          <TableCell>{getTypeChip(tx.transaction_type)}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: '#5C6B5E', textTransform: 'capitalize' }}>
                              {tx.source || '-'}
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
                              sx={{
                                fontWeight: 700,
                                color: pts.color,
                                fontFamily: '"Outfit", sans-serif'
                              }}
                            >
                              {pts.value}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <TierBadge tier={tx.tier_at_transaction} size="small" />
                          </TableCell>
                        </TableRow>

                        {/* Expandable description row */}
                        {hasDescription && (
                          <TableRow sx={{
                            backgroundColor: isExpanded ? 'rgba(61, 74, 62, 0.04)' : 'transparent'
                          }}>
                            <TableCell colSpan={8} sx={{ py: 0, px: 0, borderBottom: isExpanded ? undefined : 'none' }}>
                              <Collapse in={isExpanded} timeout={200}>
                                <Box sx={{ px: 4, py: 1.5, pl: 6 }}>
                                  <Typography variant="body2" sx={{ color: '#5C6B5E' }}>
                                    {tx.description}
                                    {tx.invoice_id && (
                                      <Typography component="span" variant="body2" sx={{ color: '#9CA89E', ml: 1 }}>
                                        — Invoice {tx.invoice_id}
                                      </Typography>
                                    )}
                                  </Typography>
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
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

export default TransactionsPage;
