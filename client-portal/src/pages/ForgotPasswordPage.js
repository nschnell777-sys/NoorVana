import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, Alert, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { forgotPassword } from '../services/api';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      borderRadius: '12px',
      color: '#EFEBE4',
      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)', transition: 'all 0.3s ease' },
      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.4)' },
      '&.Mui-focused fieldset': { borderColor: '#D4956A' }
    },
    '& .MuiInputLabel-root': {
      color: 'rgba(239, 235, 228, 0.5)',
      '&.Mui-focused': { color: '#D4956A' }
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(145deg, #2A332B 0%, #3D4A3E 40%, #4A5A4C 100%)', px: 2
    }}>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: '100%', maxWidth: 440,
          background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '16px',
          p: { xs: 4, sm: 5 }, boxShadow: '0 8px 40px rgba(0,0,0,0.3)'
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h2" sx={{
            fontFamily: '"Outfit", sans-serif', fontWeight: 600, color: '#EFEBE4',
            fontSize: { xs: '28px', sm: '32px' }, lineHeight: 1.2, mb: 1
          }}>
            Reset Password
          </Typography>
          <Typography sx={{ fontSize: '12px', fontWeight: 500, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(239, 235, 228, 0.45)' }}>
            NoorVana Advantage
          </Typography>
        </Box>

        {sent ? (
          <>
            <Alert severity="success" sx={{
              mb: 3, borderRadius: '10px',
              backgroundColor: 'rgba(90, 138, 122, 0.15)', color: '#A8D5C2',
              border: '1px solid rgba(90, 138, 122, 0.3)',
              '& .MuiAlert-icon': { color: '#5A8A7A' }
            }}>
              If an account exists with that email, we've sent a password reset link. Please check your inbox.
            </Alert>
            <Button
              fullWidth variant="contained"
              onClick={() => navigate('/login')}
              sx={{
                py: 1.5, backgroundColor: '#1A1A1A', color: '#FFFFFF', fontSize: '15px', fontWeight: 600,
                '&:hover': { backgroundColor: '#333333' }
              }}
            >
              Back to Sign In
            </Button>
          </>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{
                mb: 3, borderRadius: '10px',
                backgroundColor: 'rgba(193, 89, 46, 0.15)', color: '#F5B79A',
                border: '1px solid rgba(193, 89, 46, 0.3)',
                '& .MuiAlert-icon': { color: '#E88A5C' }
              }}>
                {error}
              </Alert>
            )}

            <Typography variant="body2" sx={{ color: 'rgba(239, 235, 228, 0.7)', mb: 3, textAlign: 'center' }}>
              Enter your email address and we'll send you a link to reset your password.
            </Typography>

            <TextField
              fullWidth label="Email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email" autoFocus
              sx={{ mb: 3.5, ...inputSx }}
            />

            <Button
              type="submit" variant="contained" fullWidth
              disabled={loading || !email}
              sx={{
                py: 1.5, backgroundColor: '#1A1A1A', color: '#FFFFFF', fontSize: '15px', fontWeight: 600,
                '&:hover': { backgroundColor: '#333333' },
                '&.Mui-disabled': { backgroundColor: 'rgba(26, 26, 26, 0.3)', color: 'rgba(255, 255, 255, 0.3)' }
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: '#EFEBE4' }} /> : 'Send Reset Link'}
            </Button>
          </>
        )}

        {!sent && (
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Box
              component="span"
              onClick={() => navigate('/login')}
              sx={{ color: 'rgba(239, 235, 228, 0.5)', cursor: 'pointer', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: 0.5, '&:hover': { color: '#D4956A' } }}
            >
              <ArrowBackIcon sx={{ fontSize: 16 }} /> Back to Sign In
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ForgotPasswordPage;
