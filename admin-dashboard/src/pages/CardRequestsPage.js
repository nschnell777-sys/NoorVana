import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Card, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { getCardRequests, updateCardRequest } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

const STATUS_COLORS = { pending: 'warning', quoted: 'info', approved: 'success', denied: 'error' };
const STATUS_LABELS = { pending: 'Pending', quoted: 'Accepted', approved: 'Confirmed', denied: 'Denied' };

const CardRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewItem, setReviewItem] = useState(null);
  const [reviewAction, setReviewAction] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCardRequests();
      setRequests(res.data.requests || []);
    } catch (err) {
      console.error('Failed to load card requests', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (item, action) => {
    setReviewItem(item);
    setReviewAction(action);
    setReviewNotes('');
  };

  const confirmAction = async () => {
    setActionLoading(true);
    try {
      await updateCardRequest(reviewItem.id, {
        status: reviewAction,
        admin_notes: reviewNotes || undefined
      });
      const msg = reviewAction === 'accepted'
        ? `Accepted — ${reviewItem.brand_name} ${reviewItem.preferred_amount} for ${reviewItem.client_name}. Waiting for client to confirm.`
        : `Denied — ${reviewItem.brand_name} ${reviewItem.preferred_amount} for ${reviewItem.client_name}`;
      setToast({ open: true, message: msg, severity: 'success' });
      setReviewItem(null);
      fetchData();
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.error?.message || 'Failed', severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '-';

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Card Requests</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review custom gift card requests. Accept to let the client confirm and pay with points, or deny the request.
      </Typography>

      <Card>
        {loading ? <LoadingSpinner /> : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Requested Brand</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Points</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No card requests yet</Typography>
                    </TableCell>
                  </TableRow>
                ) : requests.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{formatDate(r.created_at)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{r.client_name}</Typography>
                      <Typography variant="caption" color="text.secondary">{r.client_email}</Typography>
                    </TableCell>
                    <TableCell><strong>{r.brand_name}</strong></TableCell>
                    <TableCell>{r.preferred_amount || '-'}</TableCell>
                    <TableCell>{r.points_deducted ? r.points_deducted.toLocaleString() : '-'}</TableCell>
                    <TableCell>
                      <Chip label={STATUS_LABELS[r.status] || r.status} size="small" color={STATUS_COLORS[r.status] || 'default'} />
                    </TableCell>
                    <TableCell align="center">
                      {r.status === 'pending' ? (
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Button size="small" color="success" variant="outlined" startIcon={<CheckCircleIcon />}
                            onClick={() => handleAction(r, 'accepted')}>
                            Accept
                          </Button>
                          <Button size="small" color="error" variant="outlined" startIcon={<CancelIcon />}
                            onClick={() => handleAction(r, 'denied')}>
                            Deny
                          </Button>
                        </Box>
                      ) : r.status === 'quoted' ? (
                        <Typography variant="caption" color="info.main" sx={{ fontWeight: 500 }}>
                          Waiting for client to confirm
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {r.admin_notes || '—'}
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

      {/* Confirm Action Dialog */}
      <Dialog open={!!reviewItem} onClose={() => !actionLoading && setReviewItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {reviewAction === 'accepted' ? 'Accept Request' : 'Deny Request'}
        </DialogTitle>
        <DialogContent>
          {reviewItem && (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ background: 'rgba(61, 74, 62, 0.04)', borderRadius: '12px', p: 2, mb: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>{reviewItem.brand_name} {reviewItem.preferred_amount}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Client: {reviewItem.client_name} ({reviewItem.client_email})
                </Typography>
              </Box>

              {reviewAction === 'accepted' && (
                <Box sx={{ background: 'rgba(90, 138, 122, 0.08)', borderRadius: '12px', p: 2, mb: 2 }}>
                  <Typography variant="body2" color="info.dark">
                    The client will see this request as "Accepted" and will need to confirm before points are deducted.
                  </Typography>
                </Box>
              )}

              <TextField
                fullWidth
                label="Notes (optional)"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={reviewAction === 'denied' ? 'Reason for denial...' : 'Any notes for the client...'}
                multiline
                rows={2}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewItem(null)} disabled={actionLoading}>Cancel</Button>
          <Button variant="contained" onClick={confirmAction}
            disabled={actionLoading}
            color={reviewAction === 'accepted' ? 'success' : 'error'}>
            {actionLoading ? 'Processing...' : reviewAction === 'accepted' ? 'Accept Request' : 'Deny Request'}
          </Button>
        </DialogActions>
      </Dialog>

      <Toast open={toast.open} message={toast.message} severity={toast.severity}
        onClose={() => setToast(t => ({ ...t, open: false }))} />
    </Box>
  );
};

export default CardRequestsPage;
