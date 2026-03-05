import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Alert, CircularProgress,
  InputAdornment, IconButton
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { validateResetToken, resetPassword } from '../services/api';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setValidating(false);
      return;
    }
    const check = async () => {
      try {
        const { data } = await validateResetToken(token);
        setTokenValid(data.valid);
      } catch {
        setTokenValid(false);
      } finally {
        setValidating(false);
      }
    };
    check();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(password)) { setError('Password must contain at least one uppercase letter.'); return; }
    if (!/[0-9]/.test(password)) { setError('Password must contain at least one number.'); return; }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) { setError('Password must contain at least one special character.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to reset password. Please try again.');
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
    },
    '& .MuiInputAdornment-root': { color: 'rgba(239, 235, 228, 0.5)' }
  };

  const passwordAdornment = (show, setShow) => ({
    endAdornment: (
      <InputAdornment position="end">
        <IconButton onClick={() => setShow(!show)} edge="end" sx={{ color: 'rgba(239, 235, 228, 0.5)' }}>
          {show ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
        </IconButton>
      </InputAdornment>
    )
  });

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
            Set New Password
          </Typography>
          <Typography sx={{ fontSize: '12px', fontWeight: 500, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(239, 235, 228, 0.45)' }}>
            NoorVana Advantage
          </Typography>
        </Box>

        {validating && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress sx={{ color: '#D4956A' }} />
            <Typography variant="body2" sx={{ color: 'rgba(239, 235, 228, 0.5)', mt: 2 }}>
              Validating your reset link...
            </Typography>
          </Box>
        )}

        {!validating && !tokenValid && !success && (
          <>
            <Alert severity="error" sx={{
              mb: 3, borderRadius: '10px',
              backgroundColor: 'rgba(193, 89, 46, 0.15)', color: '#F5B79A',
              border: '1px solid rgba(193, 89, 46, 0.3)',
              '& .MuiAlert-icon': { color: '#E88A5C' }
            }}>
              This reset link is invalid or has expired. Please request a new one.
            </Alert>
            <Button
              fullWidth variant="contained"
              onClick={() => navigate('/forgot-password')}
              sx={{
                py: 1.5, backgroundColor: '#1A1A1A', color: '#FFFFFF', fontSize: '15px', fontWeight: 600,
                '&:hover': { backgroundColor: '#333333' }
              }}
            >
              Request New Reset Link
            </Button>
          </>
        )}

        {!validating && tokenValid && !success && (
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

            <Typography variant="caption" sx={{ color: 'rgba(239, 235, 228, 0.4)', display: 'block', mb: 3, textAlign: 'center' }}>
              Min. 8 characters, 1 uppercase, 1 number, 1 special character
            </Typography>

            <TextField
              fullWidth label="New Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required autoComplete="new-password" autoFocus
              sx={{ mb: 2.5, ...inputSx }}
              InputProps={passwordAdornment(showPassword, setShowPassword)}
            />

            <TextField
              fullWidth label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required autoComplete="new-password"
              sx={{ mb: 3.5, ...inputSx }}
              InputProps={passwordAdornment(showConfirmPassword, setShowConfirmPassword)}
            />

            <Button
              type="submit" variant="contained" fullWidth
              disabled={loading || !password || !confirmPassword}
              sx={{
                py: 1.5, backgroundColor: '#1A1A1A', color: '#FFFFFF', fontSize: '15px', fontWeight: 600,
                '&:hover': { backgroundColor: '#333333' },
                '&.Mui-disabled': { backgroundColor: 'rgba(26, 26, 26, 0.3)', color: 'rgba(255, 255, 255, 0.3)' }
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: '#EFEBE4' }} /> : 'Reset Password'}
            </Button>
          </>
        )}

        {success && (
          <>
            <Alert severity="success" sx={{
              mb: 3, borderRadius: '10px',
              backgroundColor: 'rgba(90, 138, 122, 0.15)', color: '#A8D5C2',
              border: '1px solid rgba(90, 138, 122, 0.3)',
              '& .MuiAlert-icon': { color: '#5A8A7A' }
            }}>
              Your password has been reset successfully!
            </Alert>
            <Button
              fullWidth variant="contained"
              onClick={() => navigate('/login')}
              sx={{
                py: 1.5, backgroundColor: '#1A1A1A', color: '#FFFFFF', fontSize: '15px', fontWeight: 600,
                '&:hover': { backgroundColor: '#333333' }
              }}
            >
              Sign In
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
};

export default ResetPasswordPage;
