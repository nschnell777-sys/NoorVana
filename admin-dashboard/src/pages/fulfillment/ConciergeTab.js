import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Tabs, Tab, Stepper, Step, StepLabel,
  InputAdornment, TablePagination, Chip
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import { getConciergeRequests, updateConciergeRequest } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusChip from '../../components/StatusChip';
import { frostedCardSx, TIER_DOT_COLORS } from '../../theme';

const STATUS_COLORS = {
  new: 'warning', reviewing: 'info', quoted: 'secondary', approved: 'success',
  declined: 'error', connected: 'primary', completed: 'default'
};
const STATUS_LABELS = {
  new: 'New', reviewing: 'Reviewing', quoted: 'Quoted', approved: 'Approved',
  declined: 'Declined', connected: 'Connected', completed: 'Completed'
};
const TIER_HOURS = { gold: 1, platinum: 3, diamond: 8 };
const WORKFLOW_STEPS = ['New', 'Reviewing', 'Quoted', 'Client Decision', 'Connected', 'Completed'];

const getActiveStep = (status) => {
  const map = { new: 0, reviewing: 1, quoted: 2, approved: 3, declined: 3, connected: 4, completed: 5 };
  return map[status] ?? 0;
};

const getTier = (r) => r.client_tier || r.tier || '';

const filterBarSx = {
  display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap',
  px: 2, py: 1.5, borderBottom: '1px solid rgba(61,74,62,0.06)'
};
const inputSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff' },
  '& .MuiOutlinedInput-input': { py: '7px' }
};

const ConciergeTab = ({ showToast, onCountChange }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('new');
  const [editItem, setEditItem] = useState(null);
  const [editQuotedHours, setEditQuotedHours] = useState('');
  const [editAppointment, setEditAppointment] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [page, setPage] = useState(0);

  // Filtering
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getConciergeRequests();
      const data = res.data.requests || [];
      setRequests(data);
      onCountChange(data.filter(r => ['new', 'reviewing', 'quoted', 'approved', 'connected'].includes(r.status)).length);
    } catch (err) {
      console.error('Failed to load concierge requests', err);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(0); }, [statusFilter, search, dateFrom, dateTo]);

  const openEdit = (req) => {
    setEditItem(req);
    setEditQuotedHours(req.quoted_hours || '');
    setEditAppointment(req.appointment_date || '');
    setEditNotes(req.admin_notes || '');
  };

  const handleAction = async (action) => {
    setSaving(true);
    try {
      const payload = { admin_notes: editNotes };
      switch (action) {
        case 'start_review': payload.status = 'reviewing'; break;
        case 'send_quote': payload.status = 'quoted'; payload.quoted_hours = parseFloat(editQuotedHours); break;
        case 'mark_connected': payload.status = 'connected'; if (editAppointment) payload.appointment_date = editAppointment; break;
        case 'mark_complete': payload.status = 'completed'; break;
        default: break;
      }
      await updateConciergeRequest(editItem.id, payload);
      showToast('Request updated successfully', 'success');
      setEditItem(null);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to update', 'error');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '-';
  const countByStatus = (s) => requests.filter((r) => r.status === s).length;

  const displayed = useMemo(() => {
    let items = requests.filter((r) => r.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(r => (r.client_name || '').toLowerCase().includes(q) || (r.request_type || '').toLowerCase().includes(q));
    }
    if (dateFrom) items = items.filter(r => r.created_at >= dateFrom);
    if (dateTo) items = items.filter(r => r.created_at <= dateTo + 'T23:59:59');

    items.sort((a, b) => {
      const av = a.created_at || '';
      const bv = b.created_at || '';
      return bv.localeCompare(av); // newest first
    });
    return items;
  }, [requests, statusFilter, search, dateFrom, dateTo]);

  const paged = displayed.slice(page * 10, page * 10 + 10);

  const grouped = useMemo(() => {
    if (statusFilter !== 'completed' && statusFilter !== 'declined') return [];
    const groups = {};
    displayed.forEach(r => {
      const key = r.request_type || 'General';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [displayed, statusFilter]);

  const isGrouped = statusFilter === 'completed' || statusFilter === 'declined';

  return (
    <Box>
      <Box sx={{ ...frostedCardSx, overflow: 'hidden', '&:hover': { transform: 'none' }, borderTop: '4px solid #3D4A3E' }}>
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid rgba(61,74,62,0.06)' }}>
          <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, fontSize: '16px', color: '#2D2D2D' }}>
            Concierge Hours
            {countByStatus('new') > 0 && (
              <Typography component="span" sx={{ color: '#D4956A', fontWeight: 600, fontSize: '14px', ml: 1 }}>
                · {countByStatus('new')} new
              </Typography>
            )}
            {countByStatus('reviewing') > 0 && (
              <Typography component="span" sx={{ color: '#D4956A', fontWeight: 600, fontSize: '14px', ml: 1 }}>
                · {countByStatus('reviewing')} reviewing
              </Typography>
            )}
            {countByStatus('quoted') > 0 && (
              <Typography component="span" sx={{ color: '#D4956A', fontWeight: 600, fontSize: '14px', ml: 1 }}>
                · {countByStatus('quoted')} quoted
              </Typography>
            )}
            {countByStatus('approved') > 0 && (
              <Typography component="span" sx={{ color: '#D4956A', fontWeight: 600, fontSize: '14px', ml: 1 }}>
                · {countByStatus('approved')} approved
              </Typography>
            )}
            {countByStatus('connected') > 0 && (
              <Typography component="span" sx={{ color: '#D4956A', fontWeight: 600, fontSize: '14px', ml: 1 }}>
                · {countByStatus('connected')} connected
              </Typography>
            )}
          </Typography>
        </Box>

        <Tabs
          value={statusFilter}
          onChange={(_, v) => setStatusFilter(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2, '& .MuiTab-root': { textTransform: 'none', minWidth: 'auto' } }}
        >
          <Tab label={`New (${countByStatus('new')})`} value="new" />
          <Tab label={`Reviewing (${countByStatus('reviewing')})`} value="reviewing" />
          <Tab label={`Quoted (${countByStatus('quoted')})`} value="quoted" />
          <Tab label={`Approved (${countByStatus('approved')})`} value="approved" />
          <Tab label={`Connected (${countByStatus('connected')})`} value="connected" />
          <Tab label={`Completed (${countByStatus('completed')})`} value="completed" />
          {countByStatus('declined') > 0 && (
            <Tab label={`Declined (${countByStatus('declined')})`} value="declined" />
          )}
        </Tabs>

        {/* Filter bar */}
        <Box sx={filterBarSx}>
          <TextField
            size="small" placeholder="Search client or request..." value={search}
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
              /* -- Completed/Declined: Grouped by request_type -- */
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {grouped.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Typography color="text.secondary">No {statusFilter} requests</Typography>
                  </Box>
                ) : grouped.map(([groupName, items]) => (
                  <Box key={groupName} sx={{ borderRadius: '12px', border: '1px solid rgba(61,74,62,0.1)', overflow: 'hidden' }}>
                    <Box sx={{
                      px: 2, py: 1.25,
                      backgroundColor: statusFilter === 'completed' ? 'rgba(90,138,122,0.08)' : 'rgba(193,89,46,0.06)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '14px', color: '#2D2D2D' }}>{groupName}</Typography>
                      <Chip label={`${items.length}`} size="small" sx={{ height: 22, fontSize: '12px', fontWeight: 600, backgroundColor: 'rgba(61,74,62,0.08)' }} />
                    </Box>
                    {items.map((r, idx) => (
                      <Box key={r.id} onClick={() => setViewItem(r)} sx={{
                        px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.5,
                        cursor: 'pointer', borderTop: idx > 0 ? '1px solid rgba(61,74,62,0.06)' : 'none',
                        transition: 'background-color 0.15s ease', '&:hover': { backgroundColor: 'rgba(61,74,62,0.03)' },
                      }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: TIER_DOT_COLORS[getTier(r)] || '#6B7A6D', flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 120 }}>{r.client_name}</Typography>
                        <Typography variant="caption" sx={{ color: '#6B7A6D', textTransform: 'capitalize', minWidth: 60 }}>{getTier(r)}</Typography>
                        {r.quoted_hours && (
                          <Typography variant="caption" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, color: '#3D4A3E' }}>
                            {r.hours_allocated || 0}/{r.quoted_hours} hrs
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ color: '#6B7A6D', ml: 'auto', mr: 1 }}>{formatDate(r.created_at)}</Typography>
                        <StatusChip status={r.status} label={STATUS_LABELS[r.status]} />
                      </Box>
                    ))}
                  </Box>
                ))}
              </Box>
            ) : (
              /* -- Active statuses (new, reviewing, quoted, approved, connected): Rich Cards -- */
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {paged.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      {`No ${statusFilter} requests`}
                    </Typography>
                  </Box>
                ) : paged.map((r) => (
                  <Box key={r.id} sx={{
                    p: 2.5, borderRadius: '14px',
                    border: '1px solid rgba(61,74,62,0.15)',
                    borderLeft: '4px solid #3D4A3E',
                    backgroundColor: 'rgba(61,74,62,0.03)',
                    transition: 'all 0.2s ease',
                    '&:hover': { backgroundColor: 'rgba(61,74,62,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' },
                  }}>
                    {/* Top: client + date */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: TIER_DOT_COLORS[getTier(r)] || '#6B7A6D', flexShrink: 0 }} />
                        <Box>
                          <Typography sx={{ fontWeight: 600, fontSize: '15px', lineHeight: 1.3 }}>{r.client_name}</Typography>
                          <Typography variant="caption" sx={{ color: '#6B7A6D', textTransform: 'capitalize' }}>{getTier(r)} tier</Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" sx={{ color: '#6B7A6D', fontSize: '13px', whiteSpace: 'nowrap' }}>{formatDate(r.created_at)}</Typography>
                    </Box>

                    {/* Middle: request type + details + status */}
                    <Box sx={{ mb: 1.5 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '16px', color: '#2D2D2D', mb: 0.5 }}>
                        {r.request_type || 'General'}
                      </Typography>
                      {r.details && (
                        <Typography variant="body2" color="text.secondary" sx={{
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                          overflow: 'hidden', mb: 0.75, fontSize: '13px', lineHeight: 1.5,
                        }}>
                          {r.details}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                        <StatusChip status={r.status} label={STATUS_LABELS[r.status]} />
                        {r.quoted_hours && (
                          <Typography variant="body2" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, fontSize: '14px', color: '#3D4A3E' }}>
                            {r.hours_allocated || 0} / {r.quoted_hours} hrs
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Actions */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Button size="small" startIcon={<VisibilityIcon sx={{ fontSize: '16px !important' }} />} onClick={() => setViewItem(r)}
                        sx={{ textTransform: 'none', color: '#5C6B5E', fontSize: '13px' }}>View</Button>
                      {!['completed', 'declined'].includes(r.status) && (
                        <Button size="small" variant="outlined" onClick={() => openEdit(r)}
                          sx={{ textTransform: 'none', fontSize: '13px', borderRadius: '8px', borderColor: '#3D4A3E', color: '#3D4A3E' }}>Manage</Button>
                      )}
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
        <DialogTitle>Concierge Request Details</DialogTitle>
        <DialogContent>
          {viewItem && (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ background: 'rgba(61, 74, 62, 0.04)', borderRadius: '12px', p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{viewItem.client_name}</Typography>
                  <StatusChip status={viewItem.status} label={STATUS_LABELS[viewItem.status]} />
                </Box>
                <Typography variant="caption" sx={{ color: '#9CA89E', textTransform: 'capitalize' }}>{getTier(viewItem)} tier</Typography>
              </Box>
              {[
                ['Request Type', viewItem.request_type || 'General'],
                ['Details', viewItem.details || '-'],
                ['Requested At', formatDate(viewItem.created_at)],
                ...(viewItem.preferred_date ? [['Preferred Date', viewItem.preferred_date]] : []),
                ...(viewItem.quoted_hours ? [['Quoted Hours', viewItem.quoted_hours]] : []),
                ...(viewItem.hours_allocated ? [['Hours Allocated', viewItem.hours_allocated]] : []),
                ...(viewItem.appointment_date ? [['Appointment', viewItem.appointment_date]] : []),
                ...(viewItem.admin_notes ? [['Admin Notes', viewItem.admin_notes]] : []),
                ...(viewItem.decline_reason ? [['Decline Reason', viewItem.decline_reason]] : []),
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

      {/* Workflow Dialog */}
      <Dialog open={!!editItem} onClose={() => setEditItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {['completed', 'declined'].includes(editItem?.status) ? 'View Request' : 'Manage Request'}
        </DialogTitle>
        <DialogContent>
          {editItem && (
            <Box sx={{ pt: 1 }}>
              <Stepper activeStep={getActiveStep(editItem.status)} alternativeLabel sx={{ mb: 3 }}>
                {WORKFLOW_STEPS.map((label, idx) => {
                  const isDeclined = editItem.status === 'declined' && idx === 3;
                  return (
                    <Step key={label} completed={idx < getActiveStep(editItem.status)}>
                      <StepLabel error={isDeclined} sx={isDeclined ? { '& .MuiStepLabel-label': { color: '#D32F2F' } } : {}}>
                        {isDeclined ? 'Declined' : label}
                      </StepLabel>
                    </Step>
                  );
                })}
              </Stepper>

              <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(61, 74, 62, 0.04)', borderRadius: '12px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2">
                    <strong>{editItem.client_name}</strong> — {editItem.client_email}
                  </Typography>
                  <StatusChip status={editItem.status} label={STATUS_LABELS[editItem.status]} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Tier: {getTier(editItem).charAt(0).toUpperCase() + getTier(editItem).slice(1)} ({TIER_HOURS[getTier(editItem)] || 0} total hours)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Request: {editItem.request_type || 'General'}
                </Typography>
                {editItem.preferred_date && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Preferred Date: {editItem.preferred_date}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  Details: {editItem.details || 'No details provided'}
                </Typography>
              </Box>

              {editItem.status === 'new' && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Review this request</Typography>
                  <TextField fullWidth label="Admin Notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} multiline rows={3} placeholder="Add notes before starting review..." sx={{ mb: 2 }} />
                </Box>
              )}

              {editItem.status === 'reviewing' && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Send a quote to the client</Typography>
                  <TextField fullWidth label="Quoted Hours" type="number" inputProps={{ step: 0.5, min: 0.5, max: TIER_HOURS[getTier(editItem)] || 99 }} value={editQuotedHours} onChange={(e) => setEditQuotedHours(e.target.value)} helperText={`Client's tier allows ${TIER_HOURS[getTier(editItem)] || 0} total concierge hours`} sx={{ mb: 2 }} />
                  <TextField fullWidth label="Admin Notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} multiline rows={3} sx={{ mb: 2 }} />
                </Box>
              )}

              {editItem.status === 'quoted' && (
                <Box sx={{ p: 2, bgcolor: 'rgba(212, 149, 106, 0.08)', borderRadius: '12px', mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Quote sent: {editItem.quoted_hours} hour{parseFloat(editItem.quoted_hours) !== 1 ? 's' : ''}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Waiting for client to approve or decline...</Typography>
                </Box>
              )}

              {editItem.status === 'approved' && (
                <Box>
                  <Box sx={{ p: 2, bgcolor: 'rgba(90, 138, 122, 0.05)', borderRadius: 1, mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#5A8A7A' }}>
                      Client approved — {editItem.hours_allocated} hr{parseFloat(editItem.hours_allocated) !== 1 ? 's' : ''} allocated
                    </Typography>
                  </Box>
                  <TextField fullWidth label="Appointment Date/Time" value={editAppointment} onChange={(e) => setEditAppointment(e.target.value)} placeholder="e.g., March 5, 2026 at 10:00 AM" sx={{ mb: 2 }} />
                  <TextField fullWidth label="Admin Notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} multiline rows={3} sx={{ mb: 2 }} />
                </Box>
              )}

              {editItem.status === 'declined' && (
                <Box sx={{ p: 2, bgcolor: 'rgba(211, 47, 47, 0.05)', borderRadius: 1, mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#D32F2F' }}>Client declined this quote</Typography>
                  {editItem.decline_reason && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Reason: {editItem.decline_reason}</Typography>}
                  {editItem.client_response_at && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>Declined on {new Date(editItem.client_response_at).toLocaleDateString()}</Typography>}
                </Box>
              )}

              {editItem.status === 'connected' && (
                <Box>
                  <Box sx={{ p: 2, bgcolor: 'rgba(90, 138, 122, 0.08)', borderRadius: '12px', mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#3D4A3E' }}>Client connected with concierge</Typography>
                    {editItem.appointment_date && <Typography variant="body2" color="text.secondary">Appointment: {editItem.appointment_date}</Typography>}
                    <Typography variant="body2" color="text.secondary">Hours: {editItem.hours_allocated}</Typography>
                  </Box>
                  <TextField fullWidth label="Admin Notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} multiline rows={3} sx={{ mb: 2 }} />
                </Box>
              )}

              {editItem.status === 'completed' && (
                <Box sx={{ p: 2, bgcolor: 'rgba(90, 138, 122, 0.05)', borderRadius: 1, mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#5A8A7A' }}>Service completed</Typography>
                  <Typography variant="body2" color="text.secondary">Hours used: {editItem.hours_allocated}</Typography>
                  {editItem.appointment_date && <Typography variant="body2" color="text.secondary">Appointment: {editItem.appointment_date}</Typography>}
                  {editItem.admin_notes && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Notes: {editItem.admin_notes}</Typography>}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditItem(null)}>Close</Button>
          {editItem?.status === 'new' && <Button variant="contained" onClick={() => handleAction('start_review')} disabled={saving}>Start Review</Button>}
          {editItem?.status === 'reviewing' && <Button variant="contained" onClick={() => handleAction('send_quote')} disabled={saving || !editQuotedHours || parseFloat(editQuotedHours) <= 0}>Send Quote</Button>}
          {editItem?.status === 'approved' && <Button variant="contained" onClick={() => handleAction('mark_connected')} disabled={saving}>Mark Connected</Button>}
          {editItem?.status === 'connected' && <Button variant="contained" onClick={() => handleAction('mark_complete')} disabled={saving}>Mark Complete</Button>}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConciergeTab;
