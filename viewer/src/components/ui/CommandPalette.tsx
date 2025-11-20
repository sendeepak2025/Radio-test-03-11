import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Chip,
  InputAdornment,
} from '@mui/material';
import {
  Dashboard,
  Description,
  CalendarToday,
  Analytics,
  People,
  Settings,
  Add,
  Save,
  Print,
  Search,
  Feedback,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
  shortcut?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const commands: Command[] = useMemo(
    () => [
      // Navigation
      {
        id: 'nav-dashboard',
        label: 'Go to Dashboard',
        icon: <Dashboard />,
        action: () => {
          navigate('/app/dashboard');
          onClose();
        },
        keywords: ['home', 'dashboard', 'overview'],
        shortcut: 'G then D',
      },
      {
        id: 'nav-worklist',
        label: 'Go to Worklist',
        icon: <Description />,
        action: () => {
          navigate('/app/worklist');
          onClose();
        },
        keywords: ['worklist', 'studies', 'queue'],
        shortcut: 'G then W',
      },
      {
        id: 'nav-reports',
        label: 'Go to Reports',
        icon: <Description />,
        action: () => {
          navigate('/app/reporting');
          onClose();
        },
        keywords: ['reports', 'reporting'],
        shortcut: 'G then R',
      },
      {
        id: 'nav-followup',
        label: 'Go to Follow-up',
        icon: <CalendarToday />,
        action: () => {
          navigate('/app/follow-up');
          onClose();
        },
        keywords: ['followup', 'follow-up', 'calendar'],
        shortcut: 'G then F',
      },
      {
        id: 'nav-analytics',
        label: 'Go to Analytics',
        icon: <Analytics />,
        action: () => {
          navigate('/app/analytics');
          onClose();
        },
        keywords: ['analytics', 'stats', 'metrics'],
        shortcut: 'G then A',
      },
      {
        id: 'nav-users',
        label: 'Go to Users',
        icon: <People />,
        action: () => {
          navigate('/app/users');
          onClose();
        },
        keywords: ['users', 'team', 'staff'],
      },
      {
        id: 'nav-settings',
        label: 'Go to Settings',
        icon: <Settings />,
        action: () => {
          navigate('/app/settings');
          onClose();
        },
        keywords: ['settings', 'preferences', 'config'],
      },
      // Actions
      {
        id: 'action-new-report',
        label: 'Create New Report',
        icon: <Add />,
        action: () => {
          navigate('/app/reporting');
          onClose();
        },
        keywords: ['new', 'create', 'report'],
        shortcut: 'Ctrl + N',
      },
      {
        id: 'action-search',
        label: 'Search Reports',
        icon: <Search />,
        action: () => {
          navigate('/app/reporting');
          onClose();
        },
        keywords: ['search', 'find'],
        shortcut: '/',
      },
      {
        id: 'action-feedback',
        label: 'Send Feedback',
        icon: <Feedback />,
        action: () => {
          // Trigger feedback dialog (would need to be implemented)
          onClose();
        },
        keywords: ['feedback', 'bug', 'suggestion'],
      },
    ],
    [navigate, onClose]
  );

  const filteredCommands = useMemo(() => {
    if (!search) return commands;

    const searchLower = search.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(searchLower) ||
        cmd.description?.toLowerCase().includes(searchLower) ||
        cmd.keywords?.some((kw) => kw.toLowerCase().includes(searchLower))
    );
  }, [search, commands]);

  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === 'Enter' && filteredCommands[selectedIndex]) {
      event.preventDefault();
      filteredCommands[selectedIndex].action();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          position: 'fixed',
          top: '20%',
          m: 0,
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box>
          <TextField
            fullWidth
            autoFocus
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  border: 'none',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 0,
                },
              },
            }}
          />

          <List sx={{ maxHeight: 400, overflow: 'auto', p: 0 }}>
            {filteredCommands.length === 0 && (
              <Box p={3} textAlign="center">
                <Typography variant="body2" color="text.secondary">
                  No commands found
                </Typography>
              </Box>
            )}

            {filteredCommands.map((command, index) => (
              <ListItem key={command.id} disablePadding>
                <ListItemButton
                  selected={index === selectedIndex}
                  onClick={() => command.action()}
                  sx={{
                    py: 1.5,
                    '&.Mui-selected': {
                      backgroundColor: 'action.selected',
                    },
                  }}
                >
                  <ListItemIcon>{command.icon}</ListItemIcon>
                  <ListItemText
                    primary={command.label}
                    secondary={command.description}
                  />
                  {command.shortcut && (
                    <Chip
                      label={command.shortcut}
                      size="small"
                      variant="outlined"
                      sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          {filteredCommands.length > 0 && (
            <Box
              sx={{
                p: 1.5,
                borderTop: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                gap: 2,
                fontSize: '0.75rem',
                color: 'text.secondary',
              }}
            >
              <Box display="flex" gap={0.5} alignItems="center">
                <Chip label="↑↓" size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                <Typography variant="caption">Navigate</Typography>
              </Box>
              <Box display="flex" gap={0.5} alignItems="center">
                <Chip label="Enter" size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                <Typography variant="caption">Select</Typography>
              </Box>
              <Box display="flex" gap={0.5} alignItems="center">
                <Chip label="Esc" size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                <Typography variant="caption">Close</Typography>
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default CommandPalette;
