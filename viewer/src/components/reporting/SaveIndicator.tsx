import React from 'react';
import { Box, Typography, Tooltip, CircularProgress } from '@mui/material';
import {
  CloudDone,
  CloudOff,
  CloudQueue,
  Error as ErrorIcon,
  Schedule
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

interface SaveIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  isOffline: boolean;
  error: string | null;
  retryCount?: number;
}

export const SaveIndicator: React.FC<SaveIndicatorProps> = ({
  isSaving,
  lastSaved,
  hasUnsavedChanges,
  isOffline,
  error,
  retryCount = 0
}) => {
  // Determine state and styling
  const getState = () => {
    if (isOffline) {
      return {
        icon: <CloudOff sx={{ fontSize: 16 }} />,
        text: 'Offline',
        color: '#9CA3AF',
        tooltip: 'You are offline. Changes will be saved when reconnected.'
      };
    }

    if (error) {
      return {
        icon: <ErrorIcon sx={{ fontSize: 16 }} />,
        text: retryCount > 0 ? `Save failed (retry ${retryCount})` : 'Save failed',
        color: '#EF4444',
        tooltip: error
      };
    }

    if (isSaving) {
      return {
        icon: <CircularProgress size={14} thickness={5} />,
        text: 'Saving...',
        color: '#3B82F6',
        tooltip: 'Saving your changes'
      };
    }

    if (hasUnsavedChanges) {
      return {
        icon: <CloudQueue sx={{ fontSize: 16 }} />,
        text: 'Unsaved changes',
        color: '#F59E0B',
        tooltip: 'You have unsaved changes. They will be saved automatically.'
      };
    }

    if (lastSaved) {
      const timeAgo = formatDistanceToNow(lastSaved, { addSuffix: true });
      return {
        icon: <CloudDone sx={{ fontSize: 16 }} />,
        text: `Saved ${timeAgo}`,
        color: '#10B981',
        tooltip: `Last saved: ${lastSaved.toLocaleString()}`
      };
    }

    return {
      icon: <Schedule sx={{ fontSize: 16 }} />,
      text: 'Not saved',
      color: '#6B7280',
      tooltip: 'No saves yet'
    };
  };

  const state = getState();

  return (
    <Tooltip title={state.tooltip} arrow placement="bottom">
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.5,
          py: 0.5,
          borderRadius: 1,
          bgcolor: 'grey.50',
          border: '1px solid',
          borderColor: 'grey.200',
          cursor: 'default',
          transition: 'all 0.2s',
          '&:hover': {
            bgcolor: 'grey.100'
          }
        }}
      >
        <Box sx={{ color: state.color, display: 'flex', alignItems: 'center' }}>
          {state.icon}
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: state.color,
            fontWeight: 500,
            fontSize: '0.75rem',
            userSelect: 'none'
          }}
        >
          {state.text}
        </Typography>
      </Box>
    </Tooltip>
  );
};

export default SaveIndicator;
