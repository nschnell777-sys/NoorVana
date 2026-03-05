import React from 'react';
import { Chip } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import RedeemOutlinedIcon from '@mui/icons-material/RedeemOutlined';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import FiberNewOutlinedIcon from '@mui/icons-material/FiberNewOutlined';

const STATUS_CONFIG = {
  pending:    { icon: <AccessTimeIcon />,              color: 'warning',  label: 'Pending' },
  fulfilled:  { icon: <CheckCircleOutlineIcon />,      color: 'success',  label: 'Approved' },
  denied:     { icon: <CancelOutlinedIcon />,          color: 'error',    label: 'Denied' },
  claimed:    { icon: <RedeemOutlinedIcon />,           color: 'warning',  label: 'Claimed' },
  processing: { icon: <SettingsOutlinedIcon />,        color: 'info',     label: 'Processing' },
  shipped:    { icon: <LocalShippingOutlinedIcon />,   color: 'primary',  label: 'Shipped' },
  delivered:  { icon: <CheckCircleOutlineIcon />,      color: 'success',  label: 'Delivered' },
  quoted:     { icon: <ThumbUpOutlinedIcon />,         color: 'info',     label: 'Accepted' },
  approved:   { icon: <CheckCircleOutlineIcon />,      color: 'success',  label: 'Confirmed' },
  new:        { icon: <FiberNewOutlinedIcon />,         color: 'warning',  label: 'New' },
  reviewing:  { icon: <SearchOutlinedIcon />,          color: 'info',     label: 'Reviewing' },
  connected:  { icon: <LinkOutlinedIcon />,            color: 'primary',  label: 'Connected' },
  completed:  { icon: <CheckCircleOutlineIcon />,      color: 'default',  label: 'Completed' },
  declined:   { icon: <CancelOutlinedIcon />,          color: 'error',    label: 'Declined' },
};

const StatusChip = ({ status, label: overrideLabel, size = 'small' }) => {
  const config = STATUS_CONFIG[status] || { color: 'default', label: status };
  const icon = config.icon
    ? React.cloneElement(config.icon, { sx: { fontSize: '14px !important' } })
    : undefined;

  return (
    <Chip
      icon={icon}
      label={overrideLabel || config.label}
      size={size}
      color={config.color}
      sx={{ textTransform: 'capitalize', fontSize: '12px', borderRadius: '8px' }}
    />
  );
};

export default StatusChip;
