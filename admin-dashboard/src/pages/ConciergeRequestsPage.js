import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Card, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Tabs, Tab, Stepper, Step, StepLabel
} from '@mui/material';
import { getConciergeRequests, updateConciergeRequest } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import TierBadge from '../components/TierBadge';
import Toast from '../components/Toast';

const STATUS_COLORS = {
  new: 'warning',
  reviewing: 'info',
  quoted: 'secondary',
  approved: 'success',
  declined: 'error',
  connected: 'primary',
  completed: 'default'
};

const STATUS_LABELS = {
  new: 'New',
  reviewing: 'Reviewing',
  quoted: 'Quoted',
  approved: 'Approved',
  declined: 'Declined',
  connected: 'Connected',
  completed: 'Completed'
};

const TIER_HOURS = { gold: 1, platinum: 3, diamond: 8 };

const WORKFLOW_STEPS = ['New', 'Reviewing', 'Quoted', 'Client Decision', 'Connected', 'Completed'];

const getActiveStep = (status) => {
  const map = { new: 0, reviewing: 1, quoted: 2, approved: 3, declined: 3, connected: 4, completed: 5 };
  return map[status] ?? 0;
};

/** Resolve the client's current tier (prefer joined client_tier, fall back to request tier) */
const getTier = (r) => r.client_tier || r.tier || '';

const ConciergeRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [editItem, setEditItem] = useState(null);
  const [editQuotedHours, setEditQuotedHours] = useState('');
  const [editAppointment, setEditAppointment] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getConciergeRequests();
      setRequests(res.data.requests || []);
    } catch (err) {
      console.error('Failed to load concierge requests', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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
        case 'start_review':
          payload.status = 'reviewing';
          break;
        case 'send_quote':
          payload.status = 'quoted';
          payload.quoted_hours = parseFloat(editQuotedHours);
          break;
        case 'mark_connected':
          payload.status = 'connected';
          if (editAppointment) payload.appointment_date = editAppointment;
          break;
        case 'mark_complete':
          payload.status = 'completed';
          break;
        case 'save_notes':
          break;
        default:
          break;
      }

      await updateConciergeRequest(editItem.id, payload);
      setToast({ open: true, message: 'Request updated successfully', severity: 'success' });
      setEditItem(null);
      fetchData();
    } catch (err) {
      setToast({
        open: true,
        message: err.response?.data?.error?.message || 'Failed to update',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '-';

  const filteredRequests = statusFilter === 'all'
    ? requests
    : requests.filter((r) => r.status === statusFilter);

  const countByStatus = (s) => requests.filter((r) => r.status === s).length;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Concierge Requests</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage VIP concierge service requests from Gold+ clients
      </Typography>

      {/* Status filter tabs */}
      <Tabs
        value={statusFilter}
        onChange={(_, v) => setStatusFilter(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, '& .MuiTab-root': { textTransform: 'none', minWidth: 'auto' } }}
      >
        <Tab label={`All (${requests.length})`} value="all" />
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

      <Card>
        {loading ? <LoadingSpinner /> : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Tier</TableCell>
                  <TableCell>Request</TableCell>
                  <TableCell align="right">Hours</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {statusFilter === 'all' ? 'No concierge requests yet' : `No ${statusFilter} requests`}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredRequests.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{formatDate(r.created_at)}</TableCell>
                    <TableCell>{r.client_name}</TableCell>
                    <TableCell><TierBadge tier={getTier(r)} size="small" /></TableCell>
                    <TableCell>
                      <Typography variant="body2">{r.request_type || 'General'}</Typography>
                      {r.details && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.details}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {r.quoted_hours
                        ? `${r.hours_allocated || 0} / ${r.quoted_hours} quoted`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_LABELS[r.status] || r.status}
                        size="small"
                        color={STATUS_COLORS[r.status] || 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button size="small" onClick={() => openEdit(r)}>
                        {['completed', 'declined'].includes(r.status) ? 'View' : 'Manage'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Workflow Dialog */}
      <Dialog open={!!editItem} onClose={() => setEditItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {['completed', 'declined'].includes(editItem?.status) ? 'View Request' : 'Manage Request'}
        </DialogTitle>
        <DialogContent>
          {editItem && (
            <Box sx={{ pt: 1 }}>
              {/* Workflow stepper */}
              <Stepper
                activeStep={getActiveStep(editItem.status)}
                alternativeLabel
                sx={{ mb: 3 }}
              >
                {WORKFLOW_STEPS.map((label, idx) => {
                  const isDeclined = editItem.status === 'declined' && idx === 3;
                  return (
                    <Step key={label} completed={idx < getActiveStep(editItem.status)}>
                      <StepLabel
                        error={isDeclined}
                        sx={isDeclined ? { '& .MuiStepLabel-label': { color: '#D32F2F' } } : {}}
                      >
                        {isDeclined ? 'Declined' : label}
                      </StepLabel>
                    </Step>
                  );
                })}
              </Stepper>

              {/* Request details */}
              <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(61, 74, 62, 0.04)', borderRadius: '12px' }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>{editItem.client_name}</strong> — {editItem.client_email}
                </Typography>
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

              {/* Status-specific action area */}
              {editItem.status === 'new' && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Review this request</Typography>
                  <TextField
                    fullWidth
                    label="Admin Notes"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    multiline
                    rows={3}
                    placeholder="Add notes before starting review..."
                    sx={{ mb: 2 }}
                  />
                </Box>
              )}

              {editItem.status === 'reviewing' && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Send a quote to the client</Typography>
                  <TextField
                    fullWidth
                    label="Quoted Hours"
                    type="number"
                    inputProps={{ step: 0.5, min: 0.5, max: TIER_HOURS[getTier(editItem)] || 99 }}
                    value={editQuotedHours}
                    onChange={(e) => setEditQuotedHours(e.target.value)}
                    helperText={`Client's tier allows ${TIER_HOURS[getTier(editItem)] || 0} total concierge hours`}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Admin Notes"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    multiline
                    rows={3}
                    sx={{ mb: 2 }}
                  />
                </Box>
              )}

              {editItem.status === 'quoted' && (
                <Box sx={{ p: 2, bgcolor: 'rgba(212, 149, 106, 0.08)', borderRadius: '12px', mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Quote sent: {editItem.quoted_hours} hour{parseFloat(editItem.quoted_hours) !== 1 ? 's' : ''}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Waiting for client to approve or decline...
                  </Typography>
                </Box>
              )}

              {editItem.status === 'approved' && (
                <Box>
                  <Box sx={{ p: 2, bgcolor: 'rgba(90, 138, 122, 0.05)', borderRadius: 1, mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#5A8A7A' }}>
                      Client approved — {editItem.hours_allocated} hr{parseFloat(editItem.hours_allocated) !== 1 ? 's' : ''} allocated
                    </Typography>
                  </Box>
                  <TextField
                    fullWidth
                    label="Appointment Date/Time"
                    value={editAppointment}
                    onChange={(e) => setEditAppointment(e.target.value)}
                    placeholder="e.g., March 5, 2026 at 10:00 AM"
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Admin Notes"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    multiline
                    rows={3}
                    sx={{ mb: 2 }}
                  />
                </Box>
              )}

              {editItem.status === 'declined' && (
                <Box sx={{ p: 2, bgcolor: 'rgba(211, 47, 47, 0.05)', borderRadius: 1, mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#D32F2F' }}>
                    Client declined this quote
                  </Typography>
                  {editItem.decline_reason && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Reason: {editItem.decline_reason}
                    </Typography>
                  )}
                  {editItem.client_response_at && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Declined on {new Date(editItem.client_response_at).toLocaleDateString()}
                    </Typography>
                  )}
                </Box>
              )}

              {editItem.status === 'connected' && (
                <Box>
                  <Box sx={{ p: 2, bgcolor: 'rgba(90, 138, 122, 0.08)', borderRadius: '12px', mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#3D4A3E' }}>
                      Client connected with concierge
                    </Typography>
                    {editItem.appointment_date && (
                      <Typography variant="body2" color="text.secondary">
                        Appointment: {editItem.appointment_date}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      Hours: {editItem.hours_allocated}
                    </Typography>
                  </Box>
                  <TextField
                    fullWidth
                    label="Admin Notes"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    multiline
                    rows={3}
                    sx={{ mb: 2 }}
                  />
                </Box>
              )}

              {editItem.status === 'completed' && (
                <Box sx={{ p: 2, bgcolor: 'rgba(90, 138, 122, 0.05)', borderRadius: 1, mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#5A8A7A' }}>
                    Service completed
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Hours used: {editItem.hours_allocated}
                  </Typography>
                  {editItem.appointment_date && (
                    <Typography variant="body2" color="text.secondary">
                      Appointment: {editItem.appointment_date}
                    </Typography>
                  )}
                  {editItem.admin_notes && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Notes: {editItem.admin_notes}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditItem(null)}>Close</Button>

          {editItem?.status === 'new' && (
            <Button
              variant="contained"
              onClick={() => handleAction('start_review')}
              disabled={saving}
            >
              Start Review
            </Button>
          )}

          {editItem?.status === 'reviewing' && (
            <Button
              variant="contained"
              onClick={() => handleAction('send_quote')}
              disabled={saving || !editQuotedHours || parseFloat(editQuotedHours) <= 0}
            >
              Send Quote
            </Button>
          )}

          {editItem?.status === 'approved' && (
            <Button
              variant="contained"
              onClick={() => handleAction('mark_connected')}
              disabled={saving}
            >
              Mark Connected
            </Button>
          )}

          {editItem?.status === 'connected' && (
            <Button
              variant="contained"
              onClick={() => handleAction('mark_complete')}
              disabled={saving}
            >
              Mark Complete
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Toast open={toast.open} message={toast.message} severity={toast.severity}
        onClose={() => setToast(t => ({ ...t, open: false }))} />
    </Box>
  );
};

export default ConciergeRequestsPage;
