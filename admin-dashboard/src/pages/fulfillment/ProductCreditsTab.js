import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Tabs, Tab, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, TextField, Chip,
  InputAdornment, TablePagination
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { getRedemptions, fulfillRedemption, denyRedemption } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusChip from '../../components/StatusChip';
import { frostedCardSx, TIER_DOT_COLORS } from '../../theme';

const isProductCredit = (r) => r.reward_category === 'product_credit';

const filterBarSx = {
  display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap',
  px: 2, py: 1.5, borderBottom: '1px solid rgba(61,74,62,0.06)'
};
const inputSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff' },
  '& .MuiOutlinedInput-input': { py: '7px' }
};

const ProductCreditsTab = ({ showToast, onCountChange, redemptionStats }) => {
  const [tab, setTab] = useState('pending');
  const [allData, setAllData] = useState({ pending: [], fulfilled: [], denied: [] });
  const [loading, setLoading] = useState(true);
  const [approveItem, setApproveItem] = useState(null);
  const [approveDetails, setApproveDetails] = useState('');
  const [approveDetailsConfirm, setApproveDetailsConfirm] = useState('');
  const [approveNotes, setApproveNotes] = useState('');
  const [denyItem, setDenyItem] = useState(null);
  const [denyReason, setDenyReason] = useState('');
  const [viewItem, setViewItem] = useState(null);
  const [page, setPage] = useState(0);

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [groupPages, setGroupPages] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingRes, fulfilledRes, deniedRes] = await Promise.all([
        getRedemptions({ status: 'pending' }),
        getRedemptions({ status: 'fulfilled' }),
        getRedemptions({ status: 'denied' })
      ]);
      const p = (pendingRes.data.redemptions || []).filter(isProductCredit);
      const f = (fulfilledRes.data.redemptions || []).filter(isProductCredit);
      const d = (deniedRes.data.redemptions || []).filter(isProductCredit);
      setAllData({ pending: p, fulfilled: f, denied: d });
      onCountChange(p.length);
    } catch (err) {
      console.error('Failed to load redemptions', err);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(0); setExpandedGroups({}); setGroupPages({}); }, [tab, search, dateFrom, dateTo]);

  const redemptions = useMemo(() => {
    const statusMap = { pending: 'pending', approved: 'fulfilled', denied: 'denied' };
    return allData[statusMap[tab]] || [];
  }, [allData, tab]);

  const handleApprove = async () => {
    try {
      await fulfillRedemption(approveItem.id, { fulfillment_details: approveDetails, admin_notes: approveNotes });
      showToast('Product credit approved and code sent', 'success');
      setApproveItem(null); setApproveDetails(''); setApproveDetailsConfirm(''); setApproveNotes('');
      fetchData();
    } catch (err) { showToast(err.response?.data?.error?.message || 'Failed', 'error'); }
  };

  const handleDeny = async () => {
    try {
      await denyRedemption(denyItem.id, { denied_reason: denyReason });
      showToast('Redemption denied and points refunded', 'info');
      setDenyItem(null); setDenyReason('');
      fetchData();
    } catch (err) { showToast(err.response?.data?.error?.message || 'Failed', 'error'); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '-';
  const formatCurrency = (v) => `$${(v || 0).toFixed(2)}`;

  const pendingCount = allData.pending.length;

  const displayed = useMemo(() => {
    let items = [...redemptions];
    if (search) { const q = search.toLowerCase(); items = items.filter(r => (r.client_name || '').toLowerCase().includes(q)); }
    if (dateFrom) items = items.filter(r => r.redeemed_at >= dateFrom);
    if (dateTo) items = items.filter(r => r.redeemed_at <= dateTo + 'T23:59:59');
    items.sort((a, b) => {
      const av = a.redeemed_at || '';
      const bv = b.redeemed_at || '';
      return bv.localeCompare(av); // newest first
    });
    return items;
  }, [redemptions, search, dateFrom, dateTo]);

  const paged = displayed.slice(page * 10, page * 10 + 10);

  // Group items by price for approved/denied views
  const grouped = useMemo(() => {
    if (tab === 'pending') return [];
    const groups = {};
    displayed.forEach(r => {
      const key = formatCurrency(r.credit_amount);
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [displayed, tab]);

  const toggleGroup = (name) => setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));

  const isPending = tab === 'pending';

  return (
    <Box>
      <Box sx={{ ...frostedCardSx, overflow: 'hidden', '&:hover': { transform: 'none' }, borderTop: '4px solid #D4956A' }}>
        {/* Card header */}
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid rgba(61,74,62,0.06)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, fontSize: '16px', color: '#2D2D2D' }}>
              Product Credits
              {pendingCount > 0 && (
                <Typography component="span" sx={{ color: '#D4956A', fontWeight: 600, fontSize: '14px', ml: 1 }}>
                  · {pendingCount} pending
                </Typography>
              )}
            </Typography>
            {redemptionStats?.pcAmount > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: '18px', color: '#2D2D2D', lineHeight: 1.2 }}>
                    ${redemptionStats.pcAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#5C6B5E', fontSize: '11px' }}>
                    Total Fulfilled
                  </Typography>
                </Box>
                {redemptionStats.totalRedemptionAmount > 0 && (
                  <Box sx={{
                    px: 1.5, py: 0.5, borderRadius: '8px',
                    backgroundColor: 'rgba(212,149,106,0.1)',
                    border: '1px solid rgba(212,149,106,0.2)',
                  }}>
                    <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: '15px', color: '#D4956A', lineHeight: 1.2 }}>
                      {((redemptionStats.pcAmount / redemptionStats.totalRedemptionAmount) * 100).toFixed(0)}%
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#9CA89E', fontSize: '10px', display: 'block', textAlign: 'center' }}>
                      of total
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2, '& .MuiTab-root': { textTransform: 'none', minWidth: 'auto' } }}>
          <Tab label={`Pending (${allData.pending.length})`} value="pending" />
          <Tab label={`Approved (${allData.fulfilled.length})`} value="approved" />
          <Tab label={`Denied (${allData.denied.length})`} value="denied" />
        </Tabs>

        <Box sx={filterBarSx}>
          <TextField size="small" placeholder="Search client..." value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ ...inputSx, minWidth: 180 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#9CA89E' }} /></InputAdornment> }} />
          <TextField size="small" type="date" label="From" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }} sx={{ ...inputSx, width: 150 }} />
          <TextField size="small" type="date" label="To" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }} sx={{ ...inputSx, width: 150 }} />
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
              /* -- Pending: Request Cards -- */
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {paged.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Typography color="text.secondary">No pending product credits</Typography>
                  </Box>
                ) : paged.map((r) => (
                  <Box key={r.id} sx={{
                    p: 2.5,
                    borderRadius: '14px',
                    border: '1px solid rgba(212,149,106,0.15)',
                    borderLeft: '4px solid #D4956A',
                    backgroundColor: 'rgba(212,149,106,0.03)',
                    transition: 'all 0.2s ease',
                    '&:hover': { backgroundColor: 'rgba(212,149,106,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' },
                  }}>
                    {/* Top row: client + date */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: TIER_DOT_COLORS[r.client_tier] || '#6B7A6D', flexShrink: 0 }} />
                        <Box>
                          <Typography sx={{ fontWeight: 600, fontSize: '15px', lineHeight: 1.3 }}>{r.client_name}</Typography>
                          <Typography variant="caption" sx={{ color: '#6B7A6D', textTransform: 'capitalize' }}>{r.client_tier} tier</Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" sx={{ color: '#6B7A6D', fontSize: '13px', whiteSpace: 'nowrap' }}>{formatDate(r.redeemed_at)}</Typography>
                    </Box>

                    {/* Middle: reward + value */}
                    <Box sx={{ mb: 1.5 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '16px', color: '#2D2D2D', mb: 0.5 }}>
                        {r.reward_name || `${formatCurrency(r.credit_amount)} product credit`}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: '20px', color: '#3D4A3E' }}>
                          {formatCurrency(r.credit_amount)}
                        </Typography>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, backgroundColor: 'rgba(61,74,62,0.06)', borderRadius: '6px', px: 1, py: 0.25 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '13px', color: '#3D4A3E' }}>{(r.points_redeemed || 0).toLocaleString()}</Typography>
                          <Typography variant="caption" sx={{ color: '#6B7A6D', fontSize: '10px' }}>pts</Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Actions */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Button size="small" startIcon={<VisibilityIcon sx={{ fontSize: '16px !important' }} />} onClick={() => setViewItem(r)}
                        sx={{ textTransform: 'none', color: '#5C6B5E', fontSize: '13px' }}>View</Button>
                      <Button size="small" variant="outlined" color="success" startIcon={<CheckCircleIcon sx={{ fontSize: '16px !important' }} />}
                        onClick={() => setApproveItem(r)}
                        sx={{ textTransform: 'none', fontSize: '13px', borderRadius: '8px' }}>Approve & Send Code</Button>
                      <Button size="small" variant="outlined" color="error" startIcon={<CancelIcon sx={{ fontSize: '16px !important' }} />}
                        onClick={() => setDenyItem(r)}
                        sx={{ textTransform: 'none', fontSize: '13px', borderRadius: '8px' }}>Deny</Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              /* -- Approved/Denied: Collapsible Dropdowns by Price -- */
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {grouped.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Typography color="text.secondary">No {tab} product credits</Typography>
                  </Box>
                ) : grouped.map(([groupName, items]) => {
                  const isExpanded = !!expandedGroups[groupName];
                  const gPage = groupPages[groupName] || 0;
                  const pagedItems = items.slice(gPage * 10, gPage * 10 + 10);
                  return (
                    <Box key={groupName} sx={{ borderRadius: '12px', border: '1px solid rgba(61,74,62,0.1)', overflow: 'hidden' }}>
                      {/* Collapsible header */}
                      <Box onClick={() => toggleGroup(groupName)} sx={{
                        px: 2, py: 1.25, cursor: 'pointer', userSelect: 'none',
                        backgroundColor: tab === 'approved' ? 'rgba(90,138,122,0.08)' : 'rgba(193,89,46,0.06)',
                        display: 'flex', alignItems: 'center', gap: 1,
                        transition: 'background-color 0.15s ease',
                        '&:hover': { backgroundColor: tab === 'approved' ? 'rgba(90,138,122,0.12)' : 'rgba(193,89,46,0.10)' },
                      }}>
                        {isExpanded
                          ? <KeyboardArrowDownIcon sx={{ fontSize: 20, color: '#6B7A6D' }} />
                          : <KeyboardArrowRightIcon sx={{ fontSize: 20, color: '#6B7A6D' }} />}
                        <Typography sx={{ fontWeight: 600, fontSize: '14px', color: '#2D2D2D', flex: 1 }}>{groupName} Product Credit</Typography>
                        <Chip label={`${items.length}`} size="small" sx={{ height: 22, fontSize: '12px', fontWeight: 600, backgroundColor: 'rgba(61,74,62,0.08)' }} />
                      </Box>
                      {/* Expanded rows + pagination */}
                      {isExpanded && (
                        <>
                          {pagedItems.map((r, idx) => (
                            <Box key={r.id} onClick={() => setViewItem(r)} sx={{
                              px: 2, py: 1.25,
                              display: 'flex', alignItems: 'center', gap: 1.5,
                              cursor: 'pointer',
                              borderTop: '1px solid rgba(61,74,62,0.06)',
                              transition: 'background-color 0.15s ease',
                              '&:hover': { backgroundColor: 'rgba(61,74,62,0.03)' },
                            }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: TIER_DOT_COLORS[r.client_tier] || '#6B7A6D', flexShrink: 0 }} />
                              <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 120 }}>{r.client_name}</Typography>
                              <Typography variant="caption" sx={{ color: '#6B7A6D', textTransform: 'capitalize', minWidth: 60 }}>{r.client_tier}</Typography>
                              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, backgroundColor: 'rgba(61,74,62,0.05)', borderRadius: '6px', px: 0.75, py: 0.15 }}>
                                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '12px', color: '#3D4A3E' }}>{(r.points_redeemed || 0).toLocaleString()}</Typography>
                                <Typography variant="caption" sx={{ color: '#6B7A6D', fontSize: '9px' }}>pts</Typography>
                              </Box>
                              <Typography variant="body2" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, color: '#3D4A3E' }}>{formatCurrency(r.credit_amount)}</Typography>
                              <Typography variant="caption" sx={{ color: '#6B7A6D', ml: 'auto', mr: 1 }}>{formatDate(r.redeemed_at)}</Typography>
                              <StatusChip status={r.status} />
                            </Box>
                          ))}
                          {items.length > 10 && (
                            <TablePagination component="div" count={items.length} page={gPage}
                              onPageChange={(_, p) => setGroupPages(prev => ({ ...prev, [groupName]: p }))}
                              rowsPerPage={10} rowsPerPageOptions={[10]}
                              sx={{ borderTop: '1px solid rgba(61,74,62,0.06)', '& .MuiTablePagination-toolbar': { minHeight: 40 } }} />
                          )}
                        </>
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}

            {isPending && displayed.length > 10 && (
              <TablePagination component="div" count={displayed.length} page={page} onPageChange={(_, p) => setPage(p)}
                rowsPerPage={10} rowsPerPageOptions={[10]} sx={{ borderTop: '1px solid rgba(61,74,62,0.06)' }} />
            )}
          </>
        )}
      </Box>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onClose={() => setViewItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Redemption Details</DialogTitle>
        <DialogContent>
          {viewItem && (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ background: 'rgba(61, 74, 62, 0.04)', borderRadius: '12px', p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{viewItem.client_name}</Typography>
                  <StatusChip status={viewItem.status} />
                </Box>
                <Typography variant="caption" sx={{ color: '#9CA89E', textTransform: 'capitalize' }}>{viewItem.client_tier} tier</Typography>
              </Box>
              {[
                ['Reward', viewItem.reward_name || `${formatCurrency(viewItem.credit_amount)} product credit`],
                ['Points Redeemed', (viewItem.points_redeemed || 0).toLocaleString()],
                ['Credit Value', formatCurrency(viewItem.credit_amount)],
                ['Redeemed At', formatDate(viewItem.redeemed_at)],
                ...(viewItem.fulfilled_at ? [['Approved At', formatDate(viewItem.fulfilled_at)]] : []),
                ...(viewItem.fulfillment_details ? [['Code Sent', viewItem.fulfillment_details]] : []),
                ...(viewItem.denied_reason ? [['Denied Reason', viewItem.denied_reason]] : []),
                ...(viewItem.admin_notes ? [['Admin Notes', viewItem.admin_notes]] : []),
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

      {/* Approve Modal */}
      <Dialog open={!!approveItem} onClose={() => setApproveItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Product Credit</DialogTitle>
        <DialogContent>
          {approveItem && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" sx={{ mb: 2 }}><strong>{approveItem.client_name}</strong> — {approveItem.reward_name || formatCurrency(approveItem.credit_amount)}</Typography>
              <Typography variant="body2" color="info.main" sx={{ mb: 2 }}>This code will be sent to the client's Redemptions Center.</Typography>
              <TextField fullWidth required label="Code to Send to Client" value={approveDetails} onChange={(e) => setApproveDetails(e.target.value)} onPaste={(e) => e.preventDefault()} placeholder="e.g., Product credit code ABC-123" sx={{ mb: 2 }} />
              <TextField fullWidth required label="Confirm Code" value={approveDetailsConfirm} onChange={(e) => setApproveDetailsConfirm(e.target.value)} onPaste={(e) => e.preventDefault()} placeholder="Re-enter the code" error={approveDetailsConfirm.length > 0 && approveDetails !== approveDetailsConfirm} helperText={approveDetailsConfirm.length > 0 && approveDetails !== approveDetailsConfirm ? 'Codes do not match' : ''} sx={{ mb: 2 }} />
              <TextField fullWidth label="Notes (optional)" value={approveNotes} onChange={(e) => setApproveNotes(e.target.value)} multiline rows={2} />
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
              <Typography variant="body2" sx={{ mb: 1 }}><strong>{denyItem.client_name}</strong> — {(denyItem.points_redeemed || 0).toLocaleString()} points</Typography>
              <Typography variant="body2" color="info.main" sx={{ mb: 2 }}>Points will be automatically refunded to the client.</Typography>
              <TextField fullWidth required label="Reason for denial" value={denyReason} onChange={(e) => setDenyReason(e.target.value)} multiline rows={3} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDenyItem(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeny} disabled={!denyReason.trim()}>Deny & Refund Points</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductCreditsTab;
