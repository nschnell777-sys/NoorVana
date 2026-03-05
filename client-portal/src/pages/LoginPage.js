import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../context/AuthContext';
import { clientRegister } from '../services/api';

const LoginPage = () => {
  const { login, complete2FALogin, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Mode: 'login', 'register', or '2fa'
  const [mode, setMode] = useState('login');

  // Shared state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Register-specific state
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  // 2FA state
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);

      // Check if 2FA is required
      if (result.requires_2fa) {
        setTempToken(result.temp_token);
        setMode('2fa');
        setLoading(false);
        return;
      }

      const dest = result?.client?.setup_completed === false ? '/setup' : '/dashboard';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await complete2FALogin(tempToken, twoFactorCode);
      const dest = result?.client?.setup_completed === false ? '/setup' : '/dashboard';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number.');
      return;
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      setError('Password must contain at least one special character.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await clientRegister(email, password);
      // Auto-login after registration
      localStorage.setItem('client_token', data.token);
      localStorage.setItem('client_data', JSON.stringify(data.client));
      localStorage.setItem('client_loginTime', Date.now().toString());
      setRegisterSuccess(true);
      setTimeout(() => {
        window.location.href = '/setup';
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setRegisterSuccess(false);
    setTwoFactorCode('');
    setTempToken('');
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
        onSubmit={mode === '2fa' ? handle2FAVerify : mode === 'login' ? handleLogin : handleRegister}
        sx={{
          width: '100%', maxWidth: 440,
          background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '16px',
          p: { xs: 4, sm: 5 }, boxShadow: '0 8px 40px rgba(0,0,0,0.3)'
        }}
      >
        {/* Title */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h2" sx={{
            fontFamily: '"Outfit", sans-serif', fontWeight: 600, color: '#EFEBE4',
            fontSize: { xs: '28px', sm: '32px' }, lineHeight: 1.2, mb: 1
          }}>
            NoorVana Advantage
          </Typography>
          <Typography sx={{ fontSize: '12px', fontWeight: 500, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(239, 235, 228, 0.45)' }}>
            {mode === '2fa' ? 'Two-Factor Authentication' : mode === 'login' ? 'Your Rewards Portal' : 'Set Up Your Account'}
          </Typography>
        </Box>

        {/* Success message for registration */}
        {registerSuccess && (
          <Alert severity="success" sx={{
            mb: 3, borderRadius: '10px',
            backgroundColor: 'rgba(90, 138, 122, 0.15)', color: '#A8D5C2',
            border: '1px solid rgba(90, 138, 122, 0.3)',
            '& .MuiAlert-icon': { color: '#5A8A7A' }
          }}>
            Account created! Redirecting to your dashboard...
          </Alert>
        )}

        {/* Error */}
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

        {/* 2FA Verification Step */}
        {mode === '2fa' && (
          <>
            <Typography variant="body2" sx={{ color: 'rgba(239, 235, 228, 0.7)', mb: 3, textAlign: 'center' }}>
              Enter the 6-digit code from your authenticator app to continue.
            </Typography>

            <TextField
              fullWidth
              label="Authentication Code"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\s/g, ''))}
              required
              autoFocus
              autoComplete="one-time-code"
              inputProps={{ maxLength: 10 }}
              sx={{ mb: 1.5, ...inputSx }}
            />

            <Typography variant="caption" sx={{ color: 'rgba(239, 235, 228, 0.35)', display: 'block', mb: 3, textAlign: 'center' }}>
              Lost your phone? Enter a recovery code instead.
            </Typography>

            <Button
              type="submit" variant="contained" fullWidth
              disabled={loading || !twoFactorCode}
              sx={{
                py: 1.5, backgroundColor: '#1A1A1A', color: '#FFFFFF', fontSize: '15px', fontWeight: 600,
                '&:hover': { backgroundColor: '#333333' },
                '&.Mui-disabled': { backgroundColor: 'rgba(26, 26, 26, 0.3)', color: 'rgba(255, 255, 255, 0.3)' }
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: '#EFEBE4' }} /> : 'Verify'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Box
                component="span"
                onClick={() => switchMode('login')}
                sx={{ color: 'rgba(239, 235, 228, 0.5)', cursor: 'pointer', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: 0.5, '&:hover': { color: '#D4956A' } }}
              >
                <ArrowBackIcon sx={{ fontSize: 16 }} /> Back to Sign In
              </Box>
            </Box>
          </>
        )}

        {/* Login / Register Forms */}
        {mode !== '2fa' && (
          <>
            {/* Email */}
            <TextField
              fullWidth label="Email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email" autoFocus
              sx={{ mb: 2.5, ...inputSx }}
            />

            {/* Password */}
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              sx={{ mb: mode === 'register' ? 2.5 : 1, ...inputSx }}
              InputProps={passwordAdornment(showPassword, setShowPassword)}
            />

            {/* Forgot Password link (login mode only) */}
            {mode === 'login' && (
              <Box sx={{ textAlign: 'right', mb: 2.5 }}>
                <Box
                  component="span"
                  onClick={() => navigate('/forgot-password')}
                  sx={{ color: '#D4956A', cursor: 'pointer', fontSize: '13px', '&:hover': { textDecoration: 'underline' } }}
                >
                  Forgot Password?
                </Box>
              </Box>
            )}

            {/* Confirm Password (register only) */}
            {mode === 'register' && (
              <TextField
                fullWidth
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                sx={{ mb: 3.5, ...inputSx }}
                InputProps={passwordAdornment(showConfirmPassword, setShowConfirmPassword)}
              />
            )}

            {/* Submit */}
            <Button
              type="submit" variant="contained" fullWidth
              disabled={loading || !email || !password || (mode === 'register' && !confirmPassword) || registerSuccess}
              sx={{
                py: 1.5, backgroundColor: '#1A1A1A', color: '#FFFFFF', fontSize: '15px', fontWeight: 600,
                '&:hover': { backgroundColor: '#333333' },
                '&.Mui-disabled': { backgroundColor: 'rgba(26, 26, 26, 0.3)', color: 'rgba(255, 255, 255, 0.3)' }
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: '#EFEBE4' }} />
              ) : mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>

            {/* Toggle link */}
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              {mode === 'login' ? (
                <Typography variant="body2" sx={{ color: 'rgba(239, 235, 228, 0.5)' }}>
                  New here?{' '}
                  <Box
                    component="span"
                    onClick={() => switchMode('register')}
                    sx={{ color: '#D4956A', cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
                  >
                    Set Up Account
                  </Box>
                </Typography>
              ) : (
                <Typography variant="body2" sx={{ color: 'rgba(239, 235, 228, 0.5)' }}>
                  Already have an account?{' '}
                  <Box
                    component="span"
                    onClick={() => switchMode('login')}
                    sx={{ color: '#D4956A', cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
                  >
                    Sign In
                  </Box>
                </Typography>
              )}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default LoginPage;
