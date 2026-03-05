import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Tabs, Tab, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, TextField,
  InputAdornment, TablePagination
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import { getCardRequests, updateCardRequest } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusChip from '../../components/StatusChip';
import { frostedCardSx, TIER_DOT_COLORS } from '../../theme';

const STATUS_LABELS = { pending: 'Pending', quoted: 'Accepted', approved: 'Confirmed', denied: 'Denied' };

const filterBarSx = {
  display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap',
  px: 2, py: 1.5, borderBottom: '1px solid rgba(61,74,62,0.06)'
};
const inputSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff' },
  '& .MuiOutlinedInput-input': { py: '7px' }
};

const RequestedCardsTab = ({ showToast, onCountChange }) => {
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewItem, setReviewItem] = useState(null);
  const [reviewAction, setReviewAction] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [page, setPage] = useState(0);

  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCardRequests();
      const data = res.data.requests || [];
      setAllRequests(data);
      onCountChange(data.filter(r => r.status === 'pending').length);
    } catch (err) {
      console.error('Failed to load card requests', err);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(0); }, [statusFilter, search, dateFrom, dateTo]);

  const handleAction = (item, action) => { setReviewItem(item); setReviewAction(action); setReviewNotes(''); };

  const confirmAction = async () => {
    setActionLoading(true);
    try {
      await updateCardRequest(reviewItem.id, { status: reviewAction, admin_notes: reviewNotes || undefined });
      const msg = reviewAction === 'accepted'
        ? `Accepted — ${reviewItem.brand_name} ${reviewItem.preferred_amount} for ${reviewItem.client_name}. Waiting for client to confirm.`
        : `Denied — ${reviewItem.brand_name} ${reviewItem.preferred_amount} for ${reviewItem.client_name}`;
      showToast(msg, 'success');
      setReviewItem(null);
      fetchData();
    } catch (err) { showToast(err.response?.data?.error?.message || 'Failed', 'error'); }
    finally { setActionLoading(false); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '-';

  // Map tab values to actual statuses
  const statusMap = { pending: ['pending'], accepted: ['quoted', 'approved'], denied: ['denied'] };
  const countForTab = (tabVal) => allRequests.filter(r => statusMap[tabVal].includes(r.status)).length;

  const pendingCount = allRequests.filter(r => r.status === 'pending').length;

  const displayed = useMemo(() => {
    const allowedStatuses = statusMap[statusFilter] || ['pending'];
    let items = allRequests.filter(r => allowedStatuses.includes(r.status));
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(r => (r.client_name || '').toLowerCase().includes(q) || (r.brand_name || '').toLowerCase().includes(q));
    }
    if (dateFrom) items = items.filter(r => r.created_at >= dateFrom);
    if (dateTo) items = items.filter(r => r.created_at <= dateTo + 'T23:59:59');
    items.sort((a, b) => {
      const av = a.created_at || '';
      const bv = b.created_at || '';
      return bv.localeCompare(av); // newest first
    });
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRequests, statusFilter, search, dateFrom, dateTo]);

  const paged = displayed.slice(page * 10, page * 10 + 10);

  const isPending = statusFilter === 'pending';

  return (
    <Box>
      <Box sx={{ ...frostedCardSx, overflow: 'hidden', '&:hover': { transform: 'none' }, borderTop: '4px solid #3D4A3E' }}>
        {/* Card header */}
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid rgba(61,74,62,0.06)' }}>
          <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, fontSize: '16px', color: '#2D2D2D' }}>
            Card Requests
            {pendingCount > 0 && (
              <Typography component="span" sx={{ color: '#D4956A', fontWeight: 600, fontSize: '14px', ml: 1 }}>
                · {pendingCount} pending
              </Typography>
            )}
          </Typography>
        </Box>

        <Tabs value={statusFilter} onChange={(_, v) => setStatusFilter(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2, '& .MuiTab-root': { textTransform: 'none', minWidth: 'auto' } }}>
          <Tab label={`Pending (${countForTab('pending')})`} value="pending" />
          <Tab label={`Accepted (${countForTab('accepted')})`} value="accepted" />
          <Tab label={`Denied (${countForTab('denied')})`} value="denied" />
        </Tabs>

        <Box sx={filterBarSx}>
          <TextField size="small" placeholder="Search client or brand..." value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ ...inputSx, minWidth: 200 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#6B7A6D' }} /></InputAdornment> }} />
          <TextField size="small" type="date" label="From" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ ...inputSx, width: 150 }} />
          <TextField size="small" type="date" label="To" value={dateTo} onChange={(e) => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ ...inputSx, width: 150 }} />
          {(search || dateFrom || dateTo) && (
            <Button size="small" onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}
              sx={{ textTransform: 'none', color: '#5C6B5E', fontSize: '12px' }}>Clear</Button>
          )}
          <Typography variant="caption" sx={{ color: '#6B7A6D', ml: 'auto' }}>
            {displayed.length} result{displayed.length !== 1 ? 's' : ''}
          </Typography>
        </Box>

        {loading ? <LoadingSpinner /> : (
          <>
            {isPending ? (
              /* ── Pending: Request Cards ── */
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {paged.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Typography color="text.secondary">No pending card requests</Typography>
                  </Box>
                ) : paged.map((r) => (
                  <Box key={r.id} sx={{
                    p: 2.5,
                    borderRadius: '14px',
                    border: '1px solid rgba(61,74,62,0.12)',
                    borderLeft: '4px solid #3D4A3E',
                    backgroundColor: 'rgba(61,74,62,0.03)',
                    transition: 'all 0.2s ease',
                    '&:hover': { backgroundColor: 'rgba(61,74,62,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' },
                  }}>
                    {/* Top row: client + date */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: TIER_DOT_COLORS[r.client_tier] || '#6B7A6D', flexShrink: 0 }} />
                        <Box>
                          <Typography sx={{ fontWeight: 600, fontSize: '15px', lineHeight: 1.3 }}>{r.client_name}</Typography>
                          <Typography variant="caption" sx={{ color: '#6B7A6D' }}>{r.client_email}</Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" sx={{ color: '#6B7A6D', fontSize: '13px', whiteSpace: 'nowrap' }}>{formatDate(r.created_at)}</Typography>
                    </Box>

                    {/* Middle: brand + amount + points */}
                    <Box sx={{ mb: 1.5 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '16px', color: '#2D2D2D', mb: 0.5 }}>
                        {r.brand_name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: '20px', color: '#3D4A3E' }}>
                          {r.preferred_amount || '-'}
                        </Typography>
                        {r.points_deducted && (
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, backgroundColor: 'rgba(61,74,62,0.06)', borderRadius: '6px', px: 1, py: 0.25 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '13px', color: '#3D4A3E' }}>{r.points_deducted.toLocaleString()}</Typography>
                            <Typography variant="caption" sx={{ color: '#6B7A6D', fontSize: '10px' }}>pts</Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>

                    {/* Actions */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Button size="small" startIcon={<VisibilityIcon sx={{ fontSize: '16px !important' }} />} onClick={() => setViewItem(r)}
                        sx={{ textTransform: 'none', color: '#5C6B5E', fontSize: '13px' }}>View</Button>
                      <Button size="small" variant="outlined" color="success" startIcon={<CheckCircleIcon sx={{ fontSize: '16px !important' }} />}
                        onClick={() => handleAction(r, 'accepted')}
                        sx={{ textTransform: 'none', fontSize: '13px', borderRadius: '8px' }}>Accept</Button>
                      <Button size="small" variant="outlined" color="error" startIcon={<CancelIcon sx={{ fontSize: '16px !important' }} />}
                        onClick={() => handleAction(r, 'denied')}
                        sx={{ textTransform: 'none', fontSize: '13px', borderRadius: '8px' }}>Deny</Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              /* ── Accepted/Denied: Flat List ── */
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 0 }}>
                {paged.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Typography color="text.secondary">No {statusFilter} card requests</Typography>
                  </Box>
                ) : paged.map((r, idx) => (
                  <Box key={r.id} onClick={() => setViewItem(r)} sx={{
                    px: 2, py: 1.25,
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    cursor: 'pointer',
                    borderTop: idx > 0 ? '1px solid rgba(61,74,62,0.06)' : 'none',
                    transition: 'background-color 0.15s ease',
                    '&:hover': { backgroundColor: 'rgba(61,74,62,0.03)' },
                  }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: TIER_DOT_COLORS[r.client_tier] || '#6B7A6D', flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 120 }}>{r.client_name}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#2D2D2D', minWidth: 100 }}>{r.brand_name}</Typography>
                    <Typography variant="body2" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, color: '#3D4A3E' }}>{r.preferred_amount || '-'}</Typography>
                    {r.points_deducted ? (
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, backgroundColor: 'rgba(61,74,62,0.05)', borderRadius: '6px', px: 0.75, py: 0.15 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '12px', color: '#3D4A3E' }}>{r.points_deducted.toLocaleString()}</Typography>
                        <Typography variant="caption" sx={{ color: '#6B7A6D', fontSize: '9px' }}>pts</Typography>
                      </Box>
                    ) : null}
                    <Typography variant="caption" sx={{ color: '#6B7A6D', ml: 'auto', mr: 1 }}>{formatDate(r.created_at)}</Typography>
                    <StatusChip status={r.status} label={STATUS_LABELS[r.status]} />
                  </Box>
                ))}
              </Box>
            )}

            {displayed.length > 10 && (
              <TablePagination component="div" count={displayed.length} page={page} onPageChange={(_, p) => setPage(p)}
                rowsPerPage={10} rowsPerPageOptions={[10]} sx={{ borderTop: '1px solid rgba(61,74,62,0.06)' }} />
            )}
          </>
        )}
      </Box>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onClose={() => setViewItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Card Request Details</DialogTitle>
        <DialogContent>
          {viewItem && (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ background: 'rgba(61, 74, 62, 0.04)', borderRadius: '12px', p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{viewItem.client_name}</Typography>
                  <StatusChip status={viewItem.status} label={STATUS_LABELS[viewItem.status]} />
                </Box>
                <Typography variant="body2" color="text.secondary">{viewItem.client_email}</Typography>
              </Box>
              {[
                ['Brand', viewItem.brand_name],
                ['Amount', viewItem.preferred_amount || '-'],
                ['Points', viewItem.points_deducted ? viewItem.points_deducted.toLocaleString() : '-'],
                ['Requested At', formatDate(viewItem.created_at)],
                ...(viewItem.admin_notes ? [['Admin Notes', viewItem.admin_notes]] : []),
                ...(viewItem.delivery_code ? [['Delivery Code', viewItem.delivery_code]] : []),
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

      {/* Accept/Deny Dialog */}
      <Dialog open={!!reviewItem} onClose={() => !actionLoading && setReviewItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{reviewAction === 'accepted' ? 'Accept Request' : 'Deny Request'}</DialogTitle>
        <DialogContent>
          {reviewItem && (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ background: 'rgba(61, 74, 62, 0.04)', borderRadius: '12px', p: 2, mb: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>{reviewItem.brand_name} {reviewItem.preferred_amount}</Typography>
                <Typography variant="body2" color="text.secondary">Client: {reviewItem.client_name} ({reviewItem.client_email})</Typography>
              </Box>
              {reviewAction === 'accepted' && (
                <Box sx={{ background: 'rgba(90, 138, 122, 0.08)', borderRadius: '12px', p: 2, mb: 2 }}>
                  <Typography variant="body2" color="info.dark">The client will see this request as "Accepted" and will need to confirm before points are deducted.</Typography>
                </Box>
              )}
              <TextField fullWidth label="Notes (optional)" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={reviewAction === 'denied' ? 'Reason for denial...' : 'Any notes for the client...'} multiline rows={2} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewItem(null)} disabled={actionLoading}>Cancel</Button>
          <Button variant="contained" onClick={confirmAction} disabled={actionLoading} color={reviewAction === 'accepted' ? 'success' : 'error'}>
            {actionLoading ? 'Processing...' : reviewAction === 'accepted' ? 'Accept Request' : 'Deny Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RequestedCardsTab;
