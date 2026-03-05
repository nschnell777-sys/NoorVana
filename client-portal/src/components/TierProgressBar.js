import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { TIER_COLORS, TIER_LABELS } from '../utils/tierConfig';
import { formatPoints } from '../utils/formatters';
import TierBadge from './TierBadge';

const diamondShimmerKeyframes = {
  '@keyframes diamondShimmer': {
    '0%': { backgroundPosition: '200% 0' },
    '100%': { backgroundPosition: '-200% 0' }
  },
  '@keyframes diamondGlow': {
    '0%, 100%': { filter: 'drop-shadow(0 0 6px rgba(185,242,255,0.4))' },
    '50%': { filter: 'drop-shadow(0 0 14px rgba(185,242,255,0.7))' }
  }
};

const DiamondEmblem = () => (
  <Box
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 52,
      height: 52,
      animation: 'diamondGlow 3s ease-in-out infinite',
      ...diamondShimmerKeyframes
    }}
  >
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="diamondGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E0F9FF" />
          <stop offset="30%" stopColor="#B9F2FF" />
          <stop offset="50%" stopColor="#7DE8FF" />
          <stop offset="75%" stopColor="#B9F2FF" />
          <stop offset="100%" stopColor="#E0F9FF" />
        </linearGradient>
        <linearGradient id="diamondFacetLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(125,232,255,0.6)" />
          <stop offset="100%" stopColor="rgba(185,242,255,0.2)" />
        </linearGradient>
        <linearGradient id="diamondFacetRight" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(224,249,255,0.5)" />
          <stop offset="100%" stopColor="rgba(185,242,255,0.1)" />
        </linearGradient>
        <linearGradient id="diamondTop" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#E0F9FF" />
          <stop offset="100%" stopColor="#7DE8FF" />
        </linearGradient>
      </defs>
      {/* Outer diamond shape */}
      <polygon points="24,3 44,17 24,45 4,17" fill="url(#diamondGrad)" stroke="#7DE8FF" strokeWidth="1" />
      {/* Crown / top band */}
      <polygon points="24,3 44,17 4,17" fill="url(#diamondTop)" opacity="0.5" />
      {/* Left facet */}
      <polygon points="4,17 16,17 24,45" fill="url(#diamondFacetLeft)" />
      {/* Right facet */}
      <polygon points="44,17 32,17 24,45" fill="url(#diamondFacetRight)" />
      {/* Center facet highlight */}
      <polygon points="16,17 24,3 32,17 24,45" fill="rgba(255,255,255,0.15)" />
      {/* Top left facet */}
      <polygon points="4,17 24,3 16,17" fill="rgba(255,255,255,0.2)" />
      {/* Top right facet */}
      <polygon points="44,17 24,3 32,17" fill="rgba(255,255,255,0.08)" />
      {/* Crown line */}
      <line x1="4" y1="17" x2="44" y2="17" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
      {/* Inner facet lines */}
      <line x1="16" y1="17" x2="24" y2="45" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
      <line x1="32" y1="17" x2="24" y2="45" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
      <line x1="16" y1="17" x2="24" y2="3" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
      <line x1="32" y1="17" x2="24" y2="3" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
      {/* Sparkle highlights */}
      <circle cx="20" cy="12" r="1.2" fill="rgba(255,255,255,0.7)" />
      <circle cx="34" cy="20" r="0.8" fill="rgba(255,255,255,0.5)" />
    </svg>
  </Box>
);

const TierProgressBar = ({ currentTier, nextTier, progressPercentage, pointsToNextTier }) => {
  const isMaxTier = !nextTier;
  const isDiamond = currentTier === 'diamond';
  const currentColors = TIER_COLORS[currentTier] || TIER_COLORS.bronze;

  return (
    <Box
      sx={{
        background: isDiamond
          ? 'linear-gradient(135deg, rgba(185,242,255,0.15) 0%, rgba(255,255,255,0.75) 40%, rgba(185,242,255,0.1) 100%)'
          : 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: isDiamond ? '1px solid rgba(185,242,255,0.4)' : '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '12px',
        p: { xs: 2.5, md: 3.5 },
        boxShadow: isDiamond ? '0 2px 24px rgba(185,242,255,0.25)' : '0 2px 20px rgba(0,0,0,0.06)'
      }}
    >
      {isMaxTier ? (
        <Box sx={{ textAlign: 'center' }}>
          {isDiamond ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 1.5 }}>
                <DiamondEmblem />
                <Typography
                  variant="h4"
                  sx={{
                    fontFamily: '"Outfit", sans-serif',
                    fontWeight: 700,
                    color: '#1A1A1A',
                    fontSize: { xs: '18px', md: '22px' }
                  }}
                >
                  You Are a Lifetime Diamond
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#5C6B5E', mb: 2 }}>
                Thank you for your continued loyalty and support of NoorVana.
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="subtitle2" sx={{ color: '#5C6B5E', mb: 1 }}>
                TIER STATUS
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontFamily: '"Outfit", sans-serif', color: '#2D2D2D', mb: 2 }}
              >
                Maximum Tier Achieved
              </Typography>
            </>
          )}
          {!isDiamond && (
            <LinearProgress
              variant="determinate"
              value={100}
              sx={{
                height: 10,
                borderRadius: 5,
                backgroundColor: 'rgba(61, 74, 62, 0.1)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 5,
                  backgroundColor: currentColors.bg,
                  background: `linear-gradient(90deg, ${currentColors.bg}, ${currentColors.bg})`,
                  boxShadow: `0 0 12px ${currentColors.glow}`
                }
              }}
            />
          )}
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <TierBadge tier={currentTier} size="small" />
            </Box>
            <Typography variant="body2" sx={{ color: '#5C6B5E', fontWeight: 500 }}>
              {Math.round(progressPercentage)}% complete
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <TierBadge tier={nextTier} size="small" />
            </Box>
          </Box>

          <LinearProgress
            variant="determinate"
            value={Math.min(progressPercentage, 100)}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: 'rgba(61, 74, 62, 0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
                backgroundColor: currentColors.bg,
                background: `linear-gradient(90deg, ${currentColors.bg}, ${TIER_COLORS[nextTier]?.bg || currentColors.bg})`,
                boxShadow: `0 0 12px ${currentColors.glow}`,
                transition: 'transform 1s ease-in-out'
              }
            }}
          />

          <Typography
            variant="body2"
            sx={{ textAlign: 'center', mt: 1.5, color: '#5C6B5E' }}
          >
            <strong>{formatPoints(pointsToNextTier)}</strong> points to{' '}
            <strong>{TIER_LABELS[nextTier]}</strong>
          </Typography>
        </>
      )}
    </Box>
  );
};

export default TierProgressBar;
