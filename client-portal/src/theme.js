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
      fontFamily: '"Inter", "Source Sans Pro", sans-serif',
      fontSize: '16px',
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '2.5px'
    },
    subtitle2: {
      fontFamily: '"Inter", "Source Sans Pro", sans-serif',
      fontSize: '14px',
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '2px'
    },
    body1: {
      fontFamily: '"Inter", "Source Sans Pro", sans-serif',
      fontSize: '16px',
      fontWeight: 400,
      lineHeight: 1.6
    },
    body2: {
      fontFamily: '"Inter", "Source Sans Pro", sans-serif',
      fontSize: '14px',
      fontWeight: 400,
      lineHeight: 1.5
    },
    button: {
      fontFamily: '"Inter", "Source Sans Pro", sans-serif',
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '15px',
      letterSpacing: '0.5px'
    },
    caption: {
      fontFamily: '"Inter", "Source Sans Pro", sans-serif',
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
          padding: '12px 32px',
          fontSize: '15px',
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
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          color: '#5C6B5E'
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
    }
  }
});

export default theme;
