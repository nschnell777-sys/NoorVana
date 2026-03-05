import React from 'react';
import { Box, Typography } from '@mui/material';

const StatCardsRow = ({ stats = [] }) => (
  <Box sx={{
    display: 'flex', gap: 1.5, px: 2, py: 1.5,
    borderBottom: '1px solid rgba(61,74,62,0.06)',
    flexWrap: 'wrap',
  }}>
    {stats.map((s) => (
      <Box key={s.label} sx={{
        flex: 1, minWidth: 100,
        background: 'rgba(255,255,255,0.5)',
        border: '1px solid rgba(61,74,62,0.06)',
        borderRadius: '10px',
        px: 2, py: 1.25,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Typography variant="caption" sx={{
          fontSize: '10px', textTransform: 'uppercase',
          letterSpacing: '0.5px', fontWeight: 600, color: '#5C6B5E',
        }}>
          {s.label}
        </Typography>
        <Typography sx={{
          fontSize: '18px', fontWeight: 700,
          fontFamily: '"Outfit", sans-serif',
          color: s.value === 0 || s.value === '$0.00' ? '#9CA89E' : (s.color || '#3D4A3E'),
          lineHeight: 1,
        }}>
          {s.value}
        </Typography>
      </Box>
    ))}
  </Box>
);

export default StatCardsRow;
