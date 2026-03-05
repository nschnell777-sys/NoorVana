import React from 'react';
import { Snackbar, Alert } from '@mui/material';

const Toast = ({ open, message, severity = 'success', onClose }) => (
  <Snackbar
    open={open}
    autoHideDuration={4000}
    onClose={onClose}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
  >
    <Alert
      onClose={onClose}
      severity={severity}
      variant="filled"
      sx={{
        borderRadius: '12px',
        fontWeight: 500,
        ...(severity === 'success' && {
          backgroundColor: '#5A8A7A'
        }),
        ...(severity === 'error' && {
          backgroundColor: '#C1592E'
        })
      }}
    >
      {message}
    </Alert>
  </Snackbar>
);

export default Toast;
