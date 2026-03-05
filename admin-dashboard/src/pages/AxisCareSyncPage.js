import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Chip, Button, TextField, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TablePagination,
  CircularProgress, Alert, Snackbar, InputAdornment
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import { frostedCardSx } from '../theme';
import {
  getAxisCareStatus,
  syncAxisCareBilling,
  syncAxisCareSingleClient,
  getAxisCareSyncLogs
} from '../services/api';

const AxisCareSyncPage = () => {
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState({});
  const [logs, setLogs] = useState([]);
  const [logsPagination, setLogsPagination] = useState({ page: 0, total: 0, limit: 10 });
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsFilter, setLogsFilter] = useState('');
  const [billingFrom, setBillingFrom] = useState('');
  const [billingTo, setBillingTo] = useState('');
  const [singleClientId, setSingleClientId] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Set default billing dates (last 30 days)
  useEffect(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    setBillingFrom(from.toISOString().split('T')[0]);
    setBillingTo(to.toISOString().split('T')[0]);
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      setStatusLoading(true);
      const { data } = await getAxisCareStatus();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async (page = 0) => {
    try {
      setLogsLoading(true);
      const params = { page: page + 1, limit: logsPagination.limit };
      if (logsFilter) params.sync_type = logsFilter;
      const { data } = await getAxisCareSyncLogs(params);
      setLogs(data.logs);
      setLogsPagination(prev => ({
        ...prev,
        page,
        total: data.pagination.total
      }));
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, [logsPagination.limit, logsFilter]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);
  useEffect(() => { fetchLogs(0); }, [fetchLogs]);

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const handleSyncBilling = async () => {
    if (!billingFrom || !billingTo) {
      showToast('Please select both date fields', 'warning');
      return;
    }
    try {
      setSyncLoading(prev => ({ ...prev, billing: true }));
      const { data } = await syncAxisCareBilling(billingFrom, billingTo);
      showToast(`Billing sync complete: ${data.created} created, ${data.skipped} skipped, ${data.failed} failed`);
      fetchStatus();
      fetchLogs(0);
    } catch (err) {
      showToast(err.response?.data?.message || 'Billing sync failed', 'error');
    } finally {
      setSyncLoading(prev => ({ ...prev, billing: false }));
    }
  };

  const handleSyncSingleClient = async () => {
    if (!singleClientId.trim()) {
      showToast('Please enter an AxisCare Client ID to add', 'warning');
      return;
    }
    try {
      setSyncLoading(prev => ({ ...prev, single: true }));
      const { data } = await syncAxisCareSingleClient(singleClientId.trim());
      const billingMsg = data.billing ? ` | Billing: ${data.billing.created} new, ${data.billing.skipped} skipped` : '';
      showToast(`Client ${data.action}${billingMsg}`);
      setSingleClientId('');
      fetchStatus();
      fetchLogs(0);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add client', 'error');
    } finally {
      setSyncLoading(prev => ({ ...prev, single: false }));
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  };

  const getDuration = (start, end) => {
    if (!start || !end) return '—';
    const ms = new Date(end) - new Date(start);
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  const statusChipColor = (s) => {
    if (s === 'completed') return 'success';
    if (s === 'failed') return 'error';
    if (s === 'running') return 'info';
    return 'default';
  };

  const typeLabel = (t) => {
    const map = {
      clients: 'Clients',
      billing: 'Billing',
      single_client: 'Single Client',
      single_client_billing: 'Client Billing'
    };
    return map[t] || t;
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, color: '#2D2D2D' }}>
          AxisCare Sync
        </Typography>
        <Typography variant="body2" sx={{ color: '#5C6B5E', mt: 0.5 }}>
          Sync client profiles and billing data from AxisCare
        </Typography>
      </Box>

      {/* Connection Status */}
      <Box sx={{ ...frostedCardSx, p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontFamily: '"Outfit", sans-serif', mb: 2 }}>
          Connection Status
        </Typography>

        {statusLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" sx={{ color: '#5C6B5E' }}>Checking connection...</Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {status?.configured ? (
                  status?.connectivity?.ok ? (
                    <CheckCircleOutlineIcon sx={{ color: '#5A8A7A', fontSize: 28 }} />
                  ) : (
                    <WarningAmberIcon sx={{ color: '#D4956A', fontSize: 28 }} />
                  )
                ) : (
                  <ErrorOutlineIcon sx={{ color: '#C1592E', fontSize: 28 }} />
                )}
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {!status?.configured ? 'Not Configured' :
                     status?.connectivity?.ok ? 'Connected' : 'Configuration Error'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#5C6B5E' }}>
                    {!status?.configured
                      ? 'Set AXISCARE_API_BASE_URL and AXISCARE_API_KEY in .env'
                      : status?.connectivity?.message || 'AxisCare API'}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="caption" sx={{ color: '#5C6B5E', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600 }}>
                Last Client Sync
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {status?.last_client_sync
                  ? formatDate(status.last_client_sync.completed_at)
                  : 'Never'}
              </Typography>
              {status?.last_client_sync && (
                <Typography variant="caption" sx={{ color: '#5C6B5E' }}>
                  {status.last_client_sync.records_processed} processed, {status.last_client_sync.records_created} created, {status.last_client_sync.records_updated} updated
                </Typography>
              )}
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="caption" sx={{ color: '#5C6B5E', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600 }}>
                Last Billing Sync
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {status?.last_billing_sync
                  ? formatDate(status.last_billing_sync.completed_at)
                  : 'Never'}
              </Typography>
              {status?.last_billing_sync && (
                <Typography variant="caption" sx={{ color: '#5C6B5E' }}>
                  {status.last_billing_sync.records_processed} processed, {status.last_billing_sync.records_created} created
                </Typography>
              )}
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Sync Actions */}
      <Box sx={{ ...frostedCardSx, p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontFamily: '"Outfit", sans-serif', mb: 3 }}>
          Sync Actions
        </Typography>

        <Grid container spacing={3}>
          {/* Sync Billing */}
          <Grid item xs={12} md={6}>
            <Box sx={{
              p: 2.5,
              borderRadius: '10px',
              border: '1px solid rgba(61, 74, 62, 0.1)',
              backgroundColor: 'rgba(61, 74, 62, 0.02)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <ReceiptLongOutlinedIcon sx={{ color: '#3D4A3E' }} />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>Sync Billing</Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#5C6B5E', mb: 1.5 }}>
                Pull completed payments from AxisCare and award points. Duplicate invoices are skipped.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                <TextField
                  type="date"
                  size="small"
                  label="From"
                  value={billingFrom}
                  onChange={(e) => setBillingFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  type="date"
                  size="small"
                  label="To"
                  value={billingTo}
                  onChange={(e) => setBillingTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={syncLoading.billing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
                disabled={!!Object.values(syncLoading).find(Boolean)}
                onClick={handleSyncBilling}
                fullWidth
              >
                {syncLoading.billing ? 'Syncing...' : 'Sync Billing'}
              </Button>
            </Box>
          </Grid>

          {/* Add Client */}
          <Grid item xs={12} md={6}>
            <Box sx={{
              p: 2.5,
              borderRadius: '10px',
              border: '1px solid rgba(61, 74, 62, 0.1)',
              backgroundColor: 'rgba(61, 74, 62, 0.02)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <PersonSearchOutlinedIcon sx={{ color: '#3D4A3E' }} />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>Add Client</Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#5C6B5E', mb: 1.5, flex: 1 }}>
                Add a client from AxisCare and pull their full billing history.
              </Typography>
              <TextField
                size="small"
                placeholder="AxisCare Client ID"
                value={singleClientId}
                onChange={(e) => setSingleClientId(e.target.value)}
                sx={{ mb: 1.5 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonSearchOutlinedIcon sx={{ fontSize: 18, color: '#5C6B5E' }} />
                    </InputAdornment>
                  )
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSyncSingleClient(); }}
                fullWidth
              />
              <Button
                variant="contained"
                size="small"
                startIcon={syncLoading.single ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
                disabled={!!Object.values(syncLoading).find(Boolean)}
                onClick={handleSyncSingleClient}
                fullWidth
              >
                {syncLoading.single ? 'Adding...' : 'Add Client'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Sync History */}
      <Box sx={{ ...frostedCardSx, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontFamily: '"Outfit", sans-serif' }}>
            Sync History
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {['', 'clients', 'billing', 'single_client'].map((filter) => (
              <Chip
                key={filter}
                label={filter === '' ? 'All' : typeLabel(filter)}
                size="small"
                variant={logsFilter === filter ? 'filled' : 'outlined'}
                onClick={() => setLogsFilter(filter)}
                sx={{
                  backgroundColor: logsFilter === filter ? '#3D4A3E' : 'transparent',
                  color: logsFilter === filter ? '#EFEBE4' : '#3D4A3E',
                  borderColor: '#3D4A3E',
                  '&:hover': { backgroundColor: logsFilter === filter ? '#3D4A3E' : 'rgba(61,74,62,0.08)' }
                }}
              />
            ))}
          </Box>
        </Box>

        {logsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : logs.length === 0 ? (
          <Alert severity="info" sx={{ border: 'none' }}>
            No sync history found. Run a sync to see results here.
          </Alert>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Started</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell align="right">Processed</TableCell>
                    <TableCell align="right">Created</TableCell>
                    <TableCell align="right">Updated</TableCell>
                    <TableCell align="right">Failed</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        <Chip
                          label={typeLabel(log.sync_type)}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 500, fontSize: '12px' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.status}
                          size="small"
                          color={statusChipColor(log.status)}
                          sx={{ fontWeight: 600, fontSize: '11px', textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '13px' }}>
                        {formatDate(log.started_at)}
                      </TableCell>
                      <TableCell sx={{ fontSize: '13px' }}>
                        {getDuration(log.started_at, log.completed_at)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>
                        {log.records_processed ?? '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, color: '#5A8A7A' }}>
                        {log.records_created ?? '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, color: '#3D4A3E' }}>
                        {log.records_updated ?? '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, color: log.records_failed > 0 ? '#C1592E' : 'inherit' }}>
                        {log.records_failed ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={logsPagination.total}
              page={logsPagination.page}
              onPageChange={(_, p) => fetchLogs(p)}
              rowsPerPage={logsPagination.limit}
              onRowsPerPageChange={(e) => {
                setLogsPagination(prev => ({ ...prev, limit: parseInt(e.target.value, 10) }));
              }}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </>
        )}
      </Box>

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

export default AxisCareSyncPage;
