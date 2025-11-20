import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
  useTheme,
} from '@mui/material';
import { Keyboard } from '@mui/icons-material';
import { getShortcutCategories } from '../../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

const KeyboardShortcutsDialog: React.FC<KeyboardShortcutsDialogProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const categories = getShortcutCategories();

  const renderShortcutKey = (key: string) => {
    const keys = key.split('+');
    return (
      <Box display="flex" gap={0.5} alignItems="center">
        {keys.map((k, index) => (
          <React.Fragment key={index}>
            <Chip
              label={k}
              size="small"
              sx={{
                fontFamily: 'monospace',
                fontWeight: 600,
                minWidth: 32,
                height: 24,
                fontSize: '0.75rem',
              }}
            />
            {index < keys.length - 1 && <Typography variant="caption">+</Typography>}
          </React.Fragment>
        ))}
      </Box>
    );
  };

  const renderCategory = (title: string, shortcuts: any[]) => (
    <Box key={title} mb={3}>
      <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600 }}>
        {title}
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableBody>
            {shortcuts.map((shortcut, index) => (
              <TableRow key={index}>
                <TableCell sx={{ width: '40%' }}>
                  {renderShortcutKey(shortcut.key)}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{shortcut.description}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Keyboard />
          <Typography variant="h6">Keyboard Shortcuts</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box>
          {renderCategory('Navigation', categories.navigation)}
          {renderCategory('Actions', categories.actions)}
          {renderCategory('Editing', categories.editing)}
          {renderCategory('Quick Navigation', categories.navigation2)}
          {renderCategory('General', categories.general)}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box
          sx={{
            p: 2,
            backgroundColor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
            borderRadius: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            <strong>Tip:</strong> Press <Chip label="?" size="small" sx={{ mx: 0.5 }} /> or{' '}
            <Chip label="Shift" size="small" sx={{ mx: 0.5 }} /> +{' '}
            <Chip label="?" size="small" sx={{ mx: 0.5 }} /> anytime to view this dialog.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default KeyboardShortcutsDialog;
