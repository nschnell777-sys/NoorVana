import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, Alert, CircularProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(145deg, #2A332B 0%, #3D4A3E 50%, #4A5A4C 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative blur circle */}
      <Box
        sx={{
          position: 'absolute',
          top: -80,
          right: -80,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'rgba(212, 149, 106, 0.08)',
          filter: 'blur(60px)'
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -60,
          left: -60,
          width: 250,
          height: 250,
          borderRadius: '50%',
          background: 'rgba(90, 138, 122, 0.06)',
          filter: 'blur(50px)'
        }}
      />

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: '100%',
          maxWidth: 440,
          mx: 2,
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          p: { xs: 4, sm: 5 },
          boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
          position: 'relative',
          zIndex: 1
        }}
      >
        <Typography
          variant="h4"
          align="center"
          sx={{
            fontFamily: '"Outfit", sans-serif',
            fontWeight: 700,
            color: '#EFEBE4',
            mb: 0.5
          }}
        >
          NoorVana Advantage
        </Typography>
        <Typography
          align="center"
          sx={{
            fontSize: '12px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: 'rgba(239, 235, 228, 0.45)',
            mb: 4
          }}
        >
          Admin Dashboard
        </Typography>

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 2,
              borderRadius: '12px',
              backgroundColor: 'rgba(193, 89, 46, 0.15)',
              color: '#EFEBE4',
              '& .MuiAlert-icon': { color: '#D4956A' }
            }}
          >
            {error}
          </Alert>
        )}

        <TextField
          label="Email"
          type="email"
          fullWidth
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{
            mb: 2.5,
            '& .MuiOutlinedInput-root': {
              color: '#EFEBE4',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.15)'
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.3)'
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#D4956A'
              }
            },
            '& .MuiInputLabel-root': {
              color: 'rgba(239, 235, 228, 0.5)',
              '&.Mui-focused': { color: '#D4956A' }
            }
          }}
        />
        <TextField
          label="Password"
          type="password"
          fullWidth
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{
            mb: 3.5,
            '& .MuiOutlinedInput-root': {
              color: '#EFEBE4',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.15)'
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.3)'
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#D4956A'
              }
            },
            '& .MuiInputLabel-root': {
              color: 'rgba(239, 235, 228, 0.5)',
              '&.Mui-focused': { color: '#D4956A' }
            }
          }}
        />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={loading}
          sx={{ py: 1.5 }}
        >
          {loading ? <CircularProgress size={24} sx={{ color: '#EFEBE4' }} /> : 'Sign In'}
        </Button>
      </Box>
    </Box>
  );
};

export default LoginPage;
