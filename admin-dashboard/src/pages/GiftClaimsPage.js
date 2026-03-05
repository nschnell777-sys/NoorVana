import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Card, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { getGiftClaims, updateGiftClaim } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import TierBadge from '../components/TierBadge';
import Toast from '../components/Toast';

const STATUS_FLOW = ['claimed', 'processing', 'shipped', 'delivered'];
const STATUS_COLORS = { claimed: 'warning', processing: 'info', shipped: 'primary', delivered: 'success' };
const VALID_NEXT = { claimed: ['processing'], processing: ['shipped'], shipped: ['delivered'] };

const GiftClaimsPage = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editTracking, setEditTracking] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getGiftClaims();
      setClaims(res.data.claims || []);
    } catch (err) {
      console.error('Failed to load gift claims', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openEdit = (claim) => {
    setEditItem(claim);
    setEditStatus(claim.status);
    setEditTracking(claim.tracking_number || '');
    setEditNotes(claim.admin_notes || '');
  };

  const handleUpdate = async () => {
    try {
      await updateGiftClaim(editItem.id, {
        status: editStatus,
        tracking_number: editTracking,
        admin_notes: editNotes
      });
      setToast({ open: true, message: 'Gift claim updated', severity: 'success' });
      setEditItem(null);
      fetchData();
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.error?.message || 'Failed', severity: 'error' });
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '-';

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Gift Claims</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage tier collection gift claims from clients
      </Typography>

      <Card>
        {loading ? <LoadingSpinner /> : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Tier</TableCell>
                  <TableCell>Gift</TableCell>
                  <TableCell>Tracking</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {claims.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No gift claims yet</Typography>
                    </TableCell>
                  </TableRow>
                ) : claims.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell>{formatDate(c.claimed_at)}</TableCell>
                    <TableCell>{c.client_name}</TableCell>
                    <TableCell><TierBadge tier={c.tier} size="small" /></TableCell>
                    <TableCell>{c.gift_name}</TableCell>
                    <TableCell>{c.tracking_number || '-'}</TableCell>
                    <TableCell>
                      <Chip label={c.status} size="small" color={STATUS_COLORS[c.status] || 'default'} />
                    </TableCell>
                    <TableCell align="center">
                      <Button size="small" onClick={() => openEdit(c)}>
                        {c.status === 'delivered' ? 'View' : 'Update'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Dialog open={!!editItem} onClose={() => setEditItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Gift Claim</DialogTitle>
        <DialogContent>
          {editItem && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>{editItem.client_name}</strong> — {editItem.gift_name}
              </Typography>
              {(editItem.shipping_street || editItem.shipping_address) && (
                <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(61, 74, 62, 0.04)', borderRadius: '12px' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Shipping Address
                  </Typography>
                  {editItem.shipping_street ? (
                    <Box>
                      <Typography variant="body2">{editItem.shipping_street}</Typography>
                      {editItem.shipping_apt && <Typography variant="body2">{editItem.shipping_apt}</Typography>}
                      <Typography variant="body2">
                        {editItem.shipping_city}, {editItem.shipping_state} {editItem.shipping_zip}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                      {editItem.shipping_address}
                    </Typography>
                  )}
                </Box>
              )}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Status</InputLabel>
                <Select value={editStatus} label="Status" onChange={(e) => setEditStatus(e.target.value)}>
                  <MenuItem value={editItem.status}>{editItem.status.charAt(0).toUpperCase() + editItem.status.slice(1)} (current)</MenuItem>
                  {(VALID_NEXT[editItem.status] || []).map((s) => <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>)}
                </Select>
              </FormControl>
              {(editStatus === 'shipped' || editStatus === 'delivered') && (
                <TextField
                  fullWidth
                  required={editStatus === 'shipped'}
                  label="Tracking Number"
                  value={editTracking}
                  onChange={(e) => setEditTracking(e.target.value)}
                  helperText={editStatus === 'shipped' && !editTracking.trim() ? 'Required when marking as shipped' : ''}
                  error={editStatus === 'shipped' && !editTracking.trim()}
                  sx={{ mb: 2 }}
                />
              )}
              <TextField
                fullWidth
                label="Admin Notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                multiline
                rows={3}
                placeholder="e.g., Boundless Collection order #5678"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditItem(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdate}
            disabled={editStatus === 'shipped' && !editTracking.trim() && !editItem?.tracking_number}>Save</Button>
        </DialogActions>
      </Dialog>

      <Toast open={toast.open} message={toast.message} severity={toast.severity}
        onClose={() => setToast(t => ({ ...t, open: false }))} />
    </Box>
  );
};

export default GiftClaimsPage;
