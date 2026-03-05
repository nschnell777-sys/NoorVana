import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#3D4A3E',
      light: '#5C6B5E',
      dark: '#2A332B',
      contrastText: '#EFEBE4'
    },
    secondary: {
      main: '#D4956A',
      light: '#E0B18E',
      dark: '#B87A4F',
      contrastText: '#FFFFFF'
    },
    background: {
      default: '#EFEBE4',
      paper: '#FFFFFF'
    },
    text: {
      primary: '#2D2D2D',
      secondary: '#5C6B5E'
    },
    success: {
      main: '#5A8A7A'
    },
    error: {
      main: '#C1592E'
    },
    warning: {
      main: '#D4956A'
    },
    info: {
      main: '#5C6B5E'
    },
    divider: 'rgba(61, 74, 62, 0.12)'
  },
  typography: {
    fontFamily: '"Inter", "Source Sans Pro", "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 600,
      fontSize: '44px',
      lineHeight: 1.15
    },
    h2: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 600,
      fontSize: '34px',
      lineHeight: 1.2
    },
    h3: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 500,
      fontSize: '26px',
      lineHeight: 1.3
    },
    h4: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 500,
      fontSize: '20px',
      lineHeight: 1.35
    },
    h5: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 500,
      fontSize: '18px',
      lineHeight: 1.4
    },
    h6: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 500,
      fontSize: '16px',
      lineHeight: 1.4
    },
    subtitle1: {
      fontSize: '16px',
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '2.5px'
    },
    subtitle2: {
      fontSize: '14px',
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '2px'
    },
    body1: {
      fontSize: '16px',
      fontWeight: 400,
      lineHeight: 1.6
    },
    body2: {
      fontSize: '14px',
      fontWeight: 400,
      lineHeight: 1.5
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '15px',
      letterSpacing: '0.5px'
    },
    caption: {
      fontSize: '12px',
      lineHeight: 1.5
    }
  },
  shape: {
    borderRadius: 12
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#EFEBE4'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          fontSize: '14px',
          fontWeight: 600,
          transition: 'all 0.3s ease'
        },
        contained: {
          backgroundColor: '#1A1A1A',
          color: '#FFFFFF',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          '&:hover': {
            backgroundColor: '#333333',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            transform: 'translateY(-1px)'
          }
        },
        outlined: {
          borderColor: '#3D4A3E',
          color: '#3D4A3E',
          '&:hover': {
            borderColor: '#2A332B',
            backgroundColor: 'rgba(61, 74, 62, 0.04)'
          }
        },
        sizeSmall: {
          padding: '6px 16px',
          fontSize: '13px'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 20px rgba(0,0,0,0.06)'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            transition: 'all 0.3s ease',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#3D4A3E'
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#3D4A3E'
            }
          }
        }
      }
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 600,
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            color: '#5C6B5E',
            backgroundColor: 'rgba(61, 74, 62, 0.04)'
          }
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.2s ease'
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: '0 8px 40px rgba(0,0,0,0.15)'
        }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '14px'
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12
        }
      }
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 5,
          height: 10,
          backgroundColor: 'rgba(61, 74, 62, 0.1)'
        },
        bar: {
          borderRadius: 5
        }
      }
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 12
        }
      }
    }
  }
});

export const frostedCardSx = {
  background: 'rgba(255, 255, 255, 0.75)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  borderRadius: '12px',
  boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: '0 4px 30px rgba(0,0,0,0.1)',
    transform: 'translateY(-2px)'
  }
};

export const CHART_COLORS = {
  primary: '#3D4A3E',
  secondary: '#D4956A',
  tertiary: '#5A8A7A'
};

export const WORKFLOW_COLORS = {
  pending: '#D4956A', fulfilled: '#5A8A7A', denied: '#C1592E',
  claimed: '#D4956A', processing: '#5C6B5E', shipped: '#3D4A3E', delivered: '#5A8A7A',
  new: '#D4956A', reviewing: '#5C6B5E', quoted: '#3D4A3E',
  approved: '#5A8A7A', connected: '#5A8A7A', completed: '#9CA89E', declined: '#C1592E',
};

export const TIER_DOT_COLORS = {
  bronze: '#CD7F32', silver: '#C0C0C0', gold: '#FFD700',
  platinum: '#E5E4E2', diamond: '#B9F2FF',
};

export default theme;
