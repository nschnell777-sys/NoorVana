import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  Tabs, Tab, InputAdornment, TablePagination, Chip
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import { getGiftClaims, updateGiftClaim } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusChip from '../../components/StatusChip';
import { frostedCardSx, TIER_DOT_COLORS } from '../../theme';

const STATUS_FLOW = ['claimed', 'processing', 'shipped', 'delivered'];
const STATUS_COLORS = { claimed: 'warning', processing: 'info', shipped: 'primary', delivered: 'success' };
const VALID_NEXT = { claimed: ['processing'], processing: ['shipped'], shipped: ['delivered'] };

const filterBarSx = {
  display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap',
  px: 2, py: 1.5, borderBottom: '1px solid rgba(61,74,62,0.06)'
};
const inputSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff' },
  '& .MuiOutlinedInput-input': { py: '7px' }
};

const GiftsTab = ({ showToast, onCountChange }) => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editTracking, setEditTracking] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [viewItem, setViewItem] = useState(null);
  const [page, setPage] = useState(0);

  // Filtering
  const [statusFilter, setStatusFilter] = useState('claimed');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getGiftClaims();
      const data = res.data.claims || [];
      setClaims(data);
      onCountChange(data.filter(c => ['claimed', 'processing', 'shipped'].includes(c.status)).length);
    } catch (err) {
      console.error('Failed to load gift claims', err);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(0); }, [statusFilter, search, dateFrom, dateTo]);

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
      showToast('Gift claim updated', 'success');
      setEditItem(null);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to update', 'error');
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '-';
  const countByStatus = (s) => claims.filter(c => c.status === s).length;

  const displayed = useMemo(() => {
    let items = claims.filter(c => c.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(c => (c.client_name || '').toLowerCase().includes(q) || (c.gift_name || '').toLowerCase().includes(q));
    }
    if (dateFrom) items = items.filter(c => c.claimed_at >= dateFrom);
    if (dateTo) items = items.filter(c => c.claimed_at <= dateTo + 'T23:59:59');

    items.sort((a, b) => {
      const av = a.claimed_at || '';
      const bv = b.claimed_at || '';
      return bv.localeCompare(av); // newest first
    });
    return items;
  }, [claims, statusFilter, search, dateFrom, dateTo]);

  const paged = displayed.slice(page * 10, page * 10 + 10);

  const grouped = useMemo(() => {
    if (statusFilter !== 'delivered') return [];
    const groups = {};
    displayed.forEach(c => {
      const key = c.gift_name || 'Unknown Gift';
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [displayed, statusFilter]);

  const isGrouped = statusFilter === 'delivered';

  return (
    <Box>
      <Box sx={{ ...frostedCardSx, overflow: 'hidden', '&:hover': { transform: 'none' }, borderTop: '4px solid #5A8A7A' }}>
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid rgba(61,74,62,0.06)' }}>
          <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, fontSize: '16px', color: '#2D2D2D' }}>
            Gifts
            {countByStatus('claimed') > 0 && (
              <Typography component="span" sx={{ color: '#D4956A', fontWeight: 600, fontSize: '14px', ml: 1 }}>
                · {countByStatus('claimed')} claimed
              </Typography>
            )}
            {countByStatus('processing') > 0 && (
              <Typography component="span" sx={{ color: '#D4956A', fontWeight: 600, fontSize: '14px', ml: 1 }}>
                · {countByStatus('processing')} processing
              </Typography>
            )}
            {countByStatus('shipped') > 0 && (
              <Typography component="span" sx={{ color: '#D4956A', fontWeight: 600, fontSize: '14px', ml: 1 }}>
                · {countByStatus('shipped')} shipped
              </Typography>
            )}
          </Typography>
        </Box>

        <Tabs
          value={statusFilter} onChange={(_, v) => setStatusFilter(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2, '& .MuiTab-root': { textTransform: 'none', minWidth: 'auto' } }}
        >
          <Tab label={`Claimed (${countByStatus('claimed')})`} value="claimed" />
          <Tab label={`Processing (${countByStatus('processing')})`} value="processing" />
          <Tab label={`Shipped (${countByStatus('shipped')})`} value="shipped" />
          <Tab label={`Delivered (${countByStatus('delivered')})`} value="delivered" />
        </Tabs>

        {/* Filter bar */}
        <Box sx={filterBarSx}>
          <TextField
            size="small" placeholder="Search client or gift..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ ...inputSx, minWidth: 200 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#9CA89E' }} /></InputAdornment> }}
          />
          <TextField size="small" type="date" label="From" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }} sx={{ ...inputSx, width: 150 }} />
          <TextField size="small" type="date" label="To" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }} sx={{ ...inputSx, width: 150 }} />
          {(search || dateFrom || dateTo) && (
            <Button size="small" onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}
              sx={{ textTransform: 'none', color: '#5C6B5E', fontSize: '12px' }}>Clear</Button>
          )}
          <Typography variant="caption" sx={{ color: '#9CA89E', ml: 'auto' }}>
            {displayed.length} result{displayed.length !== 1 ? 's' : ''}
          </Typography>
        </Box>

        {loading ? <LoadingSpinner /> : (
          <>
            {isGrouped ? (
              /* ── Delivered: Grouped by gift_name ── */
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {grouped.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Typography color="text.secondary">No delivered gifts</Typography>
                  </Box>
                ) : grouped.map(([groupName, items]) => (
                  <Box key={groupName} sx={{ borderRadius: '12px', border: '1px solid rgba(61,74,62,0.1)', overflow: 'hidden' }}>
                    {/* Group header */}
                    <Box sx={{
                      px: 2, py: 1.25,
                      backgroundColor: 'rgba(90,138,122,0.08)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '14px', color: '#2D2D2D' }}>{groupName}</Typography>
                      <Chip label={`${items.length}`} size="small" sx={{ height: 22, fontSize: '12px', fontWeight: 600, backgroundColor: 'rgba(61,74,62,0.08)' }} />
                    </Box>
                    {/* Transaction rows */}
                    {items.map((c, idx) => (
                      <Box key={c.id} onClick={() => setViewItem(c)} sx={{
                        px: 2, py: 1.25,
                        display: 'flex', alignItems: 'center', gap: 1.5,
                        cursor: 'pointer',
                        borderTop: idx > 0 ? '1px solid rgba(61,74,62,0.06)' : 'none',
                        transition: 'background-color 0.15s ease',
                        '&:hover': { backgroundColor: 'rgba(61,74,62,0.03)' },
                      }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: TIER_DOT_COLORS[c.client_tier || c.tier] || '#9CA89E', flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 120 }}>{c.client_name}</Typography>
                        <Typography variant="caption" sx={{ color: '#6B7A6D', textTransform: 'capitalize', minWidth: 60 }}>{c.client_tier || c.tier}</Typography>
                        <Typography variant="caption" sx={{ color: '#6B7A6D', ml: 'auto', mr: 1 }}>{formatDate(c.claimed_at)}</Typography>
                        <StatusChip status={c.status} />
                      </Box>
                    ))}
                  </Box>
                ))}
              </Box>
            ) : (
              /* ── Active statuses (claimed, processing, shipped): Rich Request Cards ── */
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {paged.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Typography color="text.secondary">No gift claims</Typography>
                  </Box>
                ) : paged.map((c) => (
                  <Box key={c.id} sx={{
                    p: 2.5,
                    borderRadius: '14px',
                    border: '1px solid rgba(90,138,122,0.15)',
                    borderLeft: '4px solid #5A8A7A',
                    backgroundColor: 'rgba(90,138,122,0.03)',
                    transition: 'all 0.2s ease',
                    '&:hover': { backgroundColor: 'rgba(90,138,122,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' },
                  }}>
                    {/* Top row: client + date */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: TIER_DOT_COLORS[c.client_tier || c.tier] || '#9CA89E', flexShrink: 0 }} />
                        <Box>
                          <Typography sx={{ fontWeight: 600, fontSize: '15px', lineHeight: 1.3 }}>{c.client_name}</Typography>
                          <Typography variant="caption" sx={{ color: '#6B7A6D', textTransform: 'capitalize' }}>{c.client_tier || c.tier}</Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" sx={{ color: '#6B7A6D', fontSize: '13px', whiteSpace: 'nowrap' }}>{formatDate(c.claimed_at)}</Typography>
                    </Box>

                    {/* Middle: gift name + status */}
                    <Box sx={{ mb: 1.5 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '16px', color: '#2D2D2D', mb: 0.5 }}>
                        {c.gift_name}
                      </Typography>
                      <StatusChip status={c.status} />
                    </Box>

                    {/* Tracking number if present */}
                    {c.tracking_number && (
                      <Typography variant="caption" sx={{ color: '#6B7A6D', display: 'block', mb: 1 }}>
                        Tracking: {c.tracking_number}
                      </Typography>
                    )}

                    {/* Actions */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Button size="small" startIcon={<VisibilityIcon sx={{ fontSize: '16px !important' }} />} onClick={() => setViewItem(c)}
                        sx={{ textTransform: 'none', color: '#5C6B5E', fontSize: '13px' }}>View</Button>
                      <Button size="small" variant="outlined" onClick={() => openEdit(c)}
                        sx={{ textTransform: 'none', fontSize: '13px', borderRadius: '8px' }}>
                        {c.status === 'delivered' ? 'Details' : 'Update'}
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {!isGrouped && displayed.length > 10 && (
              <TablePagination component="div" count={displayed.length} page={page} onPageChange={(_, p) => setPage(p)}
                rowsPerPage={10} rowsPerPageOptions={[10]} sx={{ borderTop: '1px solid rgba(61,74,62,0.06)' }} />
            )}
          </>
        )}
      </Box>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onClose={() => setViewItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Gift Claim Details</DialogTitle>
        <DialogContent>
          {viewItem && (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ background: 'rgba(61, 74, 62, 0.04)', borderRadius: '12px', p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{viewItem.client_name}</Typography>
                  <StatusChip status={viewItem.status} />
                </Box>
                <Typography variant="caption" sx={{ color: '#9CA89E', textTransform: 'capitalize' }}>{viewItem.client_tier || viewItem.tier} tier</Typography>
              </Box>
              {[
                ['Gift', viewItem.gift_name],
                ['Claimed At', formatDate(viewItem.claimed_at)],
                ...(viewItem.tracking_number ? [['Tracking Number', viewItem.tracking_number]] : []),
                ...(viewItem.admin_notes ? [['Admin Notes', viewItem.admin_notes]] : []),
                ...(viewItem.shipping_street ? [['Shipping Address', `${viewItem.shipping_street}${viewItem.shipping_apt ? ', ' + viewItem.shipping_apt : ''}, ${viewItem.shipping_city}, ${viewItem.shipping_state} ${viewItem.shipping_zip}`]] : viewItem.shipping_address ? [['Shipping Address', viewItem.shipping_address]] : []),
              ].map(([label, value]) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid rgba(61,74,62,0.06)' }}>
                  <Typography variant="body2" color="text.secondary">{label}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewItem(null)}>Close</Button></DialogActions>
      </Dialog>

      {/* Edit Dialog */}
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
                  {/* Show current status + valid next statuses only */}
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
    </Box>
  );
};

export default GiftsTab;
