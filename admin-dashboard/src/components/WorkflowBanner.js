import React from 'react';
import { Box, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const StepNode = ({ label, count, color, icon, isTerminal }) => {
  const hasItems = count > 0;
  const bgColor = hasItems
    ? isTerminal ? 'rgba(193,89,46,0.08)' : `${color}14`
    : 'rgba(61,74,62,0.03)';
  const textColor = hasItems ? (isTerminal ? '#C1592E' : color) : '#9CA89E';
  const borderColor = hasItems
    ? isTerminal ? 'rgba(193,89,46,0.15)' : `${color}25`
    : 'rgba(61,74,62,0.06)';

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 0.75,
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: '20px',
      px: 1.75, py: 0.75,
      transition: 'all 0.2s ease',
    }}>
      {icon && React.cloneElement(icon, {
        sx: { fontSize: 14, color: textColor, opacity: hasItems ? 1 : 0.5 }
      })}
      <Typography variant="caption" sx={{
        fontSize: '12px', color: textColor, fontWeight: 500,
        whiteSpace: 'nowrap', lineHeight: 1,
      }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{
        fontSize: '13px', fontWeight: 700, color: textColor,
        fontFamily: '"Outfit", sans-serif', lineHeight: 1,
      }}>
        {count}
      </Typography>
    </Box>
  );
};

const WorkflowBanner = ({ steps = [], terminalSteps = [] }) => (
  <Box sx={{
    display: 'flex', alignItems: 'center', gap: 0.5,
    flexWrap: 'wrap', mb: 2,
  }}>
    {steps.map((step, i) => (
      <React.Fragment key={step.label}>
        {i > 0 && <ChevronRightIcon sx={{ fontSize: 16, color: '#9CA89E', mx: -0.25 }} />}
        <StepNode {...step} />
      </React.Fragment>
    ))}
    {terminalSteps.length > 0 && (
      <>
        <Box sx={{ flex: 1, minWidth: 16 }} />
        {terminalSteps.map((step) => (
          <StepNode key={step.label} {...step} isTerminal />
        ))}
      </>
    )}
  </Box>
);

export default WorkflowBanner;
