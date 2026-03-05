import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, FormControlLabel, Checkbox, Alert,
  CircularProgress, Box
} from '@mui/material';
import { adjustPoints } from '../services/api';

const PointAdjustmentModal = ({ open, onClose, clientId, onSuccess }) => {
  const [points, setPoints] = useState('');
  const [adjustLifetime, setAdjustLifetime] = useState(true);
  const [adjustRedeemable, setAdjustRedeemable] = useState(true);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!points || isNaN(points)) {
      setError('Enter a valid point amount');
      return;
    }
    if (reason.trim().length < 10) {
      setError('Reason must be at least 10 characters');
      return;
    }
    if (!adjustLifetime && !adjustRedeemable) {
      setError('Select at least one point bucket to adjust');
      return;
    }

    setLoading(true);
    try {
      const pointsNum = parseInt(points, 10);
      await adjustPoints(clientId, {
        adjustment_type: pointsNum >= 0 ? 'add' : 'subtract',
        points: Math.abs(pointsNum),
        reason: reason.trim(),
        adjust_lifetime: adjustLifetime,
        adjust_redeemable: adjustRedeemable
      });
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to adjust points');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPoints('');
    setReason('');
    setAdjustLifetime(true);
    setAdjustRedeemable(true);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Adjust Points</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          label="Points (negative to subtract)"
          type="number"
          fullWidth
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          sx={{ mt: 1, mb: 2 }}
        />
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={<Checkbox checked={adjustLifetime} onChange={(e) => setAdjustLifetime(e.target.checked)} />}
            label="Apply to lifetime points"
          />
          <FormControlLabel
            control={<Checkbox checked={adjustRedeemable} onChange={(e) => setAdjustRedeemable(e.target.checked)} />}
            label="Apply to redeemable points"
          />
        </Box>
        <TextField
          label="Reason (required, min 10 chars)"
          multiline
          rows={3}
          fullWidth
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PointAdjustmentModal;
