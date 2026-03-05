import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingSpinner = ({ message = 'Loading...' }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 200, gap: 2 }}>
    <CircularProgress size={44} thickness={3} sx={{ color: '#3D4A3E' }} />
    <Typography variant="body2" sx={{ color: '#5C6B5E', letterSpacing: '1px' }}>
      {message}
    </Typography>
  </Box>
);

export default LoadingSpinner;
