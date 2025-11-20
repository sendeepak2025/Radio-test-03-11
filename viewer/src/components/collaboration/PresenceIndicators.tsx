import React from 'react';
import {
  Box,
  Avatar,
  AvatarGroup,
  Tooltip,
  Chip,
  Badge,
  Paper,
  Typography,
  Fade
} from '@mui/material';
import {
  Visibility,
  Edit,
  MoreHoriz
} from '@mui/icons-material';

interface ActiveUser {
  userId: string;
  name: string;
  avatar?: string;
  cursor?: { x: number; y: number; fieldId?: string };
  activity: 'viewing' | 'editing' | 'idle';
  lastActivity: Date;
}

interface PresenceIndicatorsProps {
  activeUsers: ActiveUser[];
  maxDisplay?: number;
  showCursors?: boolean;
  currentUserId?: string;
}

const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
];

function getUserColor(userId: string): string {
  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

function getActivityIcon(activity: string) {
  switch (activity) {
    case 'viewing':
      return <Visibility fontSize="small" />;
    case 'editing':
      return <Edit fontSize="small" />;
    case 'idle':
      return <MoreHoriz fontSize="small" />;
    default:
      return null;
  }
}

function getActivityColor(activity: string) {
  switch (activity) {
    case 'viewing':
      return 'primary';
    case 'editing':
      return 'success';
    case 'idle':
      return 'default';
    default:
      return 'default';
  }
}

function RemoteCursor({ user }: { user: ActiveUser }) {
  if (!user.cursor) return null;

  const color = getUserColor(user.userId);

  return (
    <Fade in={true}>
      <Box
        sx={{
          position: 'fixed',
          left: user.cursor.x,
          top: user.cursor.y,
          pointerEvents: 'none',
          zIndex: 9999,
          transition: 'all 0.1s ease-out'
        }}
      >
        {/* Cursor pointer */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={color}
          style={{ transform: 'translate(-2px, -2px)' }}
        >
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        </svg>

        {/* User name label */}
        <Paper
          elevation={2}
          sx={{
            position: 'absolute',
            top: 24,
            left: 4,
            px: 1,
            py: 0.5,
            bgcolor: color,
            color: 'white',
            fontSize: '0.75rem',
            whiteSpace: 'nowrap',
            borderRadius: 1
          }}
        >
          {user.name}
        </Paper>
      </Box>
    </Fade>
  );
}

export default function PresenceIndicators({
  activeUsers,
  maxDisplay = 5,
  showCursors = true,
  currentUserId
}: PresenceIndicatorsProps) {
  // Filter out current user
  const otherUsers = activeUsers.filter(u => u.userId !== currentUserId);
  const displayUsers = otherUsers.slice(0, maxDisplay);
  const hiddenCount = Math.max(0, otherUsers.length - maxDisplay);

  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <>
      {/* Avatar group in header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AvatarGroup max={maxDisplay} spacing="small">
          {displayUsers.map((user) => (
            <Tooltip
              key={user.userId}
              title={
                <Box>
                  <Typography variant="body2" fontWeight="bold">
                    {user.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    {getActivityIcon(user.activity)}
                    <Typography variant="caption">
                      {user.activity}
                    </Typography>
                  </Box>
                </Box>
              }
            >
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                variant="dot"
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: user.activity === 'editing' ? 'success.main' : 
                             user.activity === 'viewing' ? 'primary.main' : 'grey.400',
                    boxShadow: '0 0 0 2px white'
                  }
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: getUserColor(user.userId),
                    fontSize: '0.875rem'
                  }}
                  src={user.avatar}
                >
                  {user.name.charAt(0).toUpperCase()}
                </Avatar>
              </Badge>
            </Tooltip>
          ))}
        </AvatarGroup>

        {hiddenCount > 0 && (
          <Chip
            label={`+${hiddenCount}`}
            size="small"
            variant="outlined"
          />
        )}
      </Box>

      {/* Remote cursors */}
      {showCursors && otherUsers.map((user) => (
        <RemoteCursor key={user.userId} user={user} />
      ))}
    </>
  );
}

// Typing indicator component
export function TypingIndicator({ users }: { users: string[] }) {
  if (users.length === 0) return null;

  const text = users.length === 1
    ? `${users[0]} is typing...`
    : users.length === 2
    ? `${users[0]} and ${users[1]} are typing...`
    : `${users[0]} and ${users.length - 1} others are typing...`;

  return (
    <Fade in={true}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            '& > div': {
              width: 6,
              height: 6,
              bgcolor: 'primary.main',
              borderRadius: '50%',
              animation: 'typing 1.4s infinite ease-in-out',
              '&:nth-of-type(1)': { animationDelay: '0s' },
              '&:nth-of-type(2)': { animationDelay: '0.2s' },
              '&:nth-of-type(3)': { animationDelay: '0.4s' }
            },
            '@keyframes typing': {
              '0%, 60%, 100%': { opacity: 0.3, transform: 'scale(0.8)' },
              '30%': { opacity: 1, transform: 'scale(1)' }
            }
          }}
        >
          <div />
          <div />
          <div />
        </Box>
        <Typography variant="caption" color="text.secondary">
          {text}
        </Typography>
      </Box>
    </Fade>
  );
}

// Field lock indicator
export function FieldLockIndicator({ userName }: { userName: string }) {
  return (
    <Chip
      icon={<Edit />}
      label={`${userName} is editing`}
      size="small"
      color="warning"
      variant="outlined"
    />
  );
}
