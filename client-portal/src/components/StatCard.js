import React from 'react';
import { Box, Typography } from '@mui/material';

const StatCard = ({ icon, label, value, subtext, children, sx = {}, iconSx }) => (
  <Box
    sx={{
      background: 'rgba(255, 255, 255, 0.75)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      borderRadius: '12px',
      p: { xs: 2.5, md: 3.5 },
      textAlign: 'center',
      boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
      transition: 'all 0.3s ease',
      '&:hover': {
        boxShadow: '0 4px 30px rgba(0,0,0,0.1)',
        transform: 'translateY(-2px)'
      },
      ...sx
    }}
  >
    {icon && (
      <Box sx={{ mb: 1.5, color: '#D4956A', fontSize: 32, ...(iconSx || {}) }}>
        {icon}
      </Box>
    )}
    <Typography
      variant="subtitle2"
      sx={{
        color: '#5C6B5E',
        mb: 1,
        fontSize: '12px',
        letterSpacing: '2px',
        textTransform: 'uppercase'
      }}
    >
      {label}
    </Typography>
    {value && (
      <Typography
        variant="h4"
        sx={{
          fontFamily: '"Outfit", sans-serif',
          fontWeight: 700,
          color: '#2D2D2D',
          mb: 0.5
        }}
      >
        {value}
      </Typography>
    )}
    {children}
    {subtext && (
      <Typography variant="caption" sx={{ color: '#5C6B5E', mt: 0.5, display: 'block' }}>
        {subtext}
      </Typography>
    )}
  </Box>
);

export default StatCard;
