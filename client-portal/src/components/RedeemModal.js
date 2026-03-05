import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  IconButton,
  Slider,
  CircularProgress,
  Fade
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { redeemPoints } from '../services/api';
import { formatPoints, formatCurrency } from '../utils/formatters';
import { REDEMPTION_POINTS_PER_UNIT, REDEMPTION_CREDIT_PER_UNIT } from '../utils/tierConfig';

const RedeemModal = ({ open, onClose, clientId, redeemablePoints, onSuccess }) => {
  const maxUnits = Math.floor(redeemablePoints / REDEMPTION_POINTS_PER_UNIT);
  const [units, setUnits] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const selectedPoints = units * REDEMPTION_POINTS_PER_UNIT;
  const creditAmount = units * REDEMPTION_CREDIT_PER_UNIT;

  const handleClose = () => {
    if (loading) return;
    setUnits(1);
    setError('');
    setSuccess(null);
    onClose();
  };

  const handleRedeem = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await redeemPoints(clientId, selectedPoints);
      setSuccess(data);
      if (onSuccess) onSuccess(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Redemption failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
          overflow: 'hidden'
        }
      }}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(61, 74, 62, 0.6)',
            backdropFilter: 'blur(4px)'
          }
        }
      }}
    >
      <DialogContent sx={{ p: { xs: 3, md: 4 }, position: 'relative' }}>
        <IconButton
          onClick={handleClose}
          sx={{ position: 'absolute', top: 12, right: 12, color: '#5C6B5E' }}
        >
          <CloseIcon />
        </IconButton>

        {success ? (
          <Fade in timeout={500}>
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CheckCircleOutlineIcon
                sx={{ fontSize: 72, color: '#5A8A7A', mb: 2 }}
              />
              <Typography
                variant="h4"
                sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D', mb: 1 }}
              >
                Points Redeemed!
              </Typography>
              <Typography variant="body1" sx={{ color: '#5C6B5E', mb: 3 }}>
                {formatPoints(success.points_redeemed)} points redeemed for{' '}
                {formatCurrency(success.credit_amount)} credit
              </Typography>

              <Box
                sx={{
                  background: 'rgba(61, 74, 62, 0.06)',
                  borderRadius: '12px',
                  p: 3,
                  mb: 3
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ color: '#5C6B5E', mb: 1 }}
                >
                  YOUR VOUCHER CODE
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: '#3D4A3E',
                    letterSpacing: '3px'
                  }}
                >
                  {success.voucher_code}
                </Typography>
              </Box>

              <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 3 }}>
                This voucher will be applied to your next invoice.
              </Typography>

              <Button
                variant="contained"
                onClick={handleClose}
                sx={{ minWidth: 160 }}
              >
                Done
              </Button>
            </Box>
          </Fade>
        ) : (
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontFamily: '"Outfit", sans-serif',
                textAlign: 'center',
                color: '#2D2D2D',
                mb: 0.5,
                pr: 4
              }}
            >
              Redeem Your Points
            </Typography>
            <Typography
              variant="body2"
              sx={{ textAlign: 'center', color: '#5C6B5E', mb: 4 }}
            >
              Available: {formatPoints(redeemablePoints)} redeemable points
            </Typography>

            {/* Increment Controls */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                mb: 2
              }}
            >
              <IconButton
                onClick={() => setUnits(Math.max(1, units - 1))}
                disabled={units <= 1}
                sx={{ color: '#3D4A3E', '&:hover': { color: '#D4956A' } }}
              >
                <RemoveCircleOutlineIcon sx={{ fontSize: 36 }} />
              </IconButton>
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant="h3"
                  sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D' }}
                >
                  {formatPoints(selectedPoints)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#5C6B5E' }}>
                  points
                </Typography>
              </Box>
              <IconButton
                onClick={() => setUnits(Math.min(maxUnits, units + 1))}
                disabled={units >= maxUnits}
                sx={{ color: '#3D4A3E', '&:hover': { color: '#D4956A' } }}
              >
                <AddCircleOutlineIcon sx={{ fontSize: 36 }} />
              </IconButton>
            </Box>

            {/* Slider */}
            {maxUnits > 1 && (
              <Box sx={{ px: 2, mb: 3 }}>
                <Slider
                  value={units}
                  min={1}
                  max={maxUnits}
                  step={1}
                  onChange={(_, val) => setUnits(val)}
                  sx={{
                    color: '#3D4A3E',
                    '& .MuiSlider-thumb': {
                      backgroundColor: '#3D4A3E',
                      '&:hover': { boxShadow: '0 0 0 8px rgba(61, 74, 62, 0.15)' }
                    },
                    '& .MuiSlider-track': {
                      background: 'linear-gradient(90deg, #3D4A3E, #D4956A)'
                    }
                  }}
                />
              </Box>
            )}

            {/* Credit Calculation */}
            <Box
              sx={{
                background: 'rgba(61, 74, 62, 0.06)',
                borderRadius: '12px',
                p: 2.5,
                textAlign: 'center',
                mb: 3
              }}
            >
              <Typography variant="subtitle2" sx={{ color: '#5C6B5E', mb: 0.5 }}>
                CREDIT AMOUNT
              </Typography>
              <Typography
                variant="h3"
                sx={{ fontFamily: '"Outfit", sans-serif', color: '#5A8A7A', fontWeight: 600 }}
              >
                {formatCurrency(creditAmount)}
              </Typography>
              <Typography variant="caption" sx={{ color: '#5C6B5E' }}>
                1,000 points = $5.00 credit
              </Typography>
            </Box>

            {error && (
              <Typography
                variant="body2"
                sx={{
                  color: '#C1592E',
                  textAlign: 'center',
                  mb: 2,
                  p: 1.5,
                  backgroundColor: 'rgba(193, 89, 46, 0.08)',
                  borderRadius: '8px'
                }}
              >
                {error}
              </Typography>
            )}

            <Button
              variant="contained"
              fullWidth
              onClick={handleRedeem}
              disabled={loading || maxUnits < 1}
              sx={{ py: 1.5 }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: '#FFFFFF' }} />
              ) : (
                `Redeem ${formatPoints(selectedPoints)} Points`
              )}
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RedeemModal;
