import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Card, CardContent, Grid, Button, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, IconButton, Tooltip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import {
  getRedemptions, getRedemptionStats, fulfillRedemption, denyRedemption
} from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import TierBadge from '../components/TierBadge';
import Toast from '../components/Toast';
import { frostedCardSx } from '../theme';

const RedemptionQueuePage = () => {
  const [tab, setTab] = useState('pending');
  const [redemptions, setRedemptions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Approve modal
  const [approveItem, setApproveItem] = useState(null);
  const [approveDetails, setApproveDetails] = useState('');
  const [approveDetailsConfirm, setApproveDetailsConfirm] = useState('');
  const [approveNotes, setApproveNotes] = useState('');

  // Deny modal
  const [denyItem, setDenyItem] = useState(null);
  const [denyReason, setDenyReason] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const statusMap = { pending: 'pending', approved: 'fulfilled', denied: 'denied' };
      const [redemRes, statsRes] = await Promise.all([
        getRedemptions({ status: statusMap[tab] || tab }),
        getRedemptionStats()
      ]);
      setRedemptions(redemRes.data.redemptions || []);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load redemptions', err);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async () => {
    try {
      await fulfillRedemption(approveItem.id, {
        fulfillment_details: approveDetails,
        admin_notes: approveNotes
      });
      setToast({ open: true, message: 'Redemption approved', severity: 'success' });
      setApproveItem(null);
      setApproveDetails('');
      setApproveDetailsConfirm('');
      setApproveNotes('');
      fetchData();
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.error?.message || 'Failed', severity: 'error' });
    }
  };

  const handleQuickApprove = async (item) => {
    try {
      await fulfillRedemption(item.id, {});
      setToast({ open: true, message: 'Service credit approved', severity: 'success' });
      fetchData();
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.error?.message || 'Failed', severity: 'error' });
    }
  };

  const handleDeny = async () => {
    try {
      await denyRedemption(denyItem.id, { denied_reason: denyReason });
      setToast({ open: true, message: 'Redemption denied and points refunded', severity: 'info' });
      setDenyItem(null);
      setDenyReason('');
      fetchData();
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.error?.message || 'Failed', severity: 'error' });
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '-';
  const formatCurrency = (v) => `$${(v || 0).toFixed(2)}`;

  const getApproveLabel = (item) => {
    if (item?.reward_category === 'service_credit') return 'Invoice Reference';
    return 'Code to Send to Client';
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Redemption Queue</Typography>

      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Box sx={{ ...frostedCardSx, p: 3 }}>
              <Typography color="text.secondary" variant="body2">Pending</Typography>
              <Typography variant="h4" color="warning.main">{stats.pending_count}</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ ...frostedCardSx, p: 3 }}>
              <Typography color="text.secondary" variant="body2">Approved Today</Typography>
              <Typography variant="h4" color="success.main">{stats.fulfilled_today}</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ ...frostedCardSx, p: 3 }}>
              <Typography color="text.secondary" variant="body2">Monthly Value</Typography>
              <Typography variant="h4">{formatCurrency(stats.monthly_value)}</Typography>
            </Box>
          </Grid>
        </Grid>
      )}

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab label="Pending" value="pending" />
          <Tab label="Approved" value="approved" />
          <Tab label="Denied" value="denied" />
        </Tabs>

        {loading ? <LoadingSpinner /> : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Tier</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Details</TableCell>
                  <TableCell align="right">Points</TableCell>
                  <TableCell align="right">Value</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {redemptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No {tab} redemptions</Typography>
                    </TableCell>
                  </TableRow>
                ) : redemptions.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{formatDate(r.redeemed_at)}</TableCell>
                    <TableCell>{r.client_name}</TableCell>
                    <TableCell><TierBadge tier={r.client_tier} size="small" /></TableCell>
                    <TableCell>
                      <Chip
                        label={r.reward_category === 'service_credit' ? 'Service Credit' : r.reward_category === 'gift_card' ? 'Gift Card' : 'Credit'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{r.reward_name || `${formatCurrency(r.credit_amount)} credit`}</TableCell>
                    <TableCell align="right">{(r.points_redeemed || 0).toLocaleString()}</TableCell>
                    <TableCell align="right">{formatCurrency(r.credit_amount)}</TableCell>
                    <TableCell align="center">
                      {r.status === 'pending' && (
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Approve">
                            <IconButton size="small" color="success" onClick={() => r.reward_category === 'service_credit' ? handleQuickApprove(r) : setApproveItem(r)}>
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Deny">
                            <IconButton size="small" color="error" onClick={() => setDenyItem(r)}>
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                      {r.status === 'fulfilled' && (
                        <Typography variant="caption" color="success.main">
                          Approved {formatDate(r.fulfilled_at)}
                        </Typography>
                      )}
                      {r.status === 'denied' && (
                        <Typography variant="caption" color="error.main">
                          Denied
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Approve Modal */}
      <Dialog open={!!approveItem} onClose={() => setApproveItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Redemption</DialogTitle>
        <DialogContent>
          {approveItem && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>{approveItem.client_name}</strong> — {approveItem.reward_name || formatCurrency(approveItem.credit_amount)}
              </Typography>
              <Typography variant="body2" color="info.main" sx={{ mb: 2 }}>
                This code will be sent to the client's Redemptions Center.
              </Typography>
              <TextField
                fullWidth
                required
                label={getApproveLabel(approveItem)}
                value={approveDetails}
                onChange={(e) => setApproveDetails(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                placeholder="e.g., Gift card code ABC-123"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                required
                label="Confirm Code"
                value={approveDetailsConfirm}
                onChange={(e) => setApproveDetailsConfirm(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                placeholder="Re-enter the code"
                error={approveDetailsConfirm.length > 0 && approveDetails !== approveDetailsConfirm}
                helperText={approveDetailsConfirm.length > 0 && approveDetails !== approveDetailsConfirm ? 'Codes do not match' : ''}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Notes (optional)"
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                multiline
                rows={2}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveItem(null)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleApprove} disabled={!approveDetails.trim() || approveDetails !== approveDetailsConfirm}>Send Code</Button>
        </DialogActions>
      </Dialog>

      {/* Deny Modal */}
      <Dialog open={!!denyItem} onClose={() => setDenyItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Deny Redemption</DialogTitle>
        <DialogContent>
          {denyItem && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>{denyItem.client_name}</strong> — {(denyItem.points_redeemed || 0).toLocaleString()} points
              </Typography>
              <Typography variant="body2" color="info.main" sx={{ mb: 2 }}>
                Points will be automatically refunded to the client.
              </Typography>
              <TextField
                fullWidth
                required
                label="Reason for denial"
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                multiline
                rows={3}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDenyItem(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeny} disabled={!denyReason.trim()}>
            Deny & Refund Points
          </Button>
        </DialogActions>
      </Dialog>

      <Toast open={toast.open} message={toast.message} severity={toast.severity}
        onClose={() => setToast(t => ({ ...t, open: false }))} />
    </Box>
  );
};

export default RedemptionQueuePage;
