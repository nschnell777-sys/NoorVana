import React from 'react';
import { Box, Typography } from '@mui/material';
import { TIER_COLORS, TIER_LABELS } from '../utils/tierConfig';

const shimmerKeyframes = {
  '@keyframes tierShimmer': {
    '0%': { backgroundPosition: '200% 0' },
    '100%': { backgroundPosition: '-200% 0' }
  }
};

const TierBadge = ({ tier, size = 'medium' }) => {
  const colors = TIER_COLORS[tier] || TIER_COLORS.bronze;
  const label = TIER_LABELS[tier] || 'Bronze';

  const sizeStyles = {
    small: { px: 1.5, py: 0.5, fontSize: '11px', minWidth: 60 },
    medium: { px: 2.5, py: 1, fontSize: '13px', minWidth: 80 },
    large: { px: 4, py: 1.5, fontSize: '16px', minWidth: 120 }
  };

  const styles = sizeStyles[size] || sizeStyles.medium;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        fontFamily: '"Outfit", sans-serif',
        fontWeight: 700,
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        color: colors.text,
        boxShadow: `0 2px 12px ${colors.glow}`,
        ...styles,
        ...(colors.shimmer
          ? {
              background: `linear-gradient(110deg, ${colors.bg} 30%, rgba(255,255,255,0.7) 50%, ${colors.bg} 70%)`,
              backgroundSize: '200% 100%',
              animation: 'tierShimmer 3s ease-in-out infinite',
              ...shimmerKeyframes
            }
          : {
              background: `linear-gradient(135deg, ${colors.bg}, ${adjustBrightness(colors.bg, -15)})`
            })
      }}
    >
      <Typography
        sx={{
          fontSize: styles.fontSize,
          fontWeight: 700,
          fontFamily: '"Outfit", sans-serif',
          letterSpacing: '1.5px',
          color: 'inherit'
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};

/**
 * Darkens or lightens a hex color by a percentage.
 */
function adjustBrightness(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

export default TierBadge;
