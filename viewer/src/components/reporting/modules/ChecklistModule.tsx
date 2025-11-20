import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  TextField,
  Chip,
  Stack
} from '@mui/material';

interface ChecklistItem {
  id: string;
  label: string;
  status?: string;
  notes?: string;
}

interface ChecklistModuleProps {
  config?: {
    items?: string[];
    title?: string;
    statusOptions?: string[];
    columns?: string[];
    type?: 'spine' | 'joint' | 'custom';
  };
  value?: ChecklistItem[];
  onChange?: (items: ChecklistItem[]) => void;
  required?: boolean;
}

export const ChecklistModule: React.FC<ChecklistModuleProps> = ({
  config = {},
  value = [],
  onChange,
  required = false
}) => {
  const {
    items = ['L1', 'L2', 'L3', 'L4', 'L5', 'S1'],
    title = 'Assessment Checklist',
    statusOptions = ['Normal', 'Abnormal', 'Degenerative', 'Not Visualized'],
    columns = ['Item', 'Status', 'Findings'],
    type = 'custom'
  } = config;

  const initializeItems = (): ChecklistItem[] => {
    if (value && value.length > 0) return value;
    return items.map((item) => {
      // Handle both string and object formats for backward compatibility
      if (typeof item === 'string') {
        return {
          id: item,
          label: item,
          status: '',
          notes: ''
        };
      } else if (typeof item === 'object' && item !== null) {
        // Handle object format: {id, label, checked} or {id, label, status, notes}
        return {
          id: (item as any).id || String(item),
          label: (item as any).label || String(item),
          status: (item as any).status || '',
          notes: (item as any).notes || ''
        };
      }
      // Fallback
      return {
        id: String(item),
        label: String(item),
        status: '',
        notes: ''
      };
    });
  };

  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(initializeItems());

  useEffect(() => {
    if (value && value.length > 0) {
      setChecklistItems(value);
    }
  }, [value]);

  const handleStatusChange = (id: string, status: string) => {
    const updated = checklistItems.map(item =>
      item.id === id ? { ...item, status } : item
    );
    setChecklistItems(updated);
    onChange?.(updated);
  };

  const handleNotesChange = (id: string, notes: string) => {
    const updated = checklistItems.map(item =>
      item.id === id ? { ...item, notes } : item
    );
    setChecklistItems(updated);
    onChange?.(updated);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Normal':
        return 'success';
      case 'Abnormal':
        return 'error';
      case 'Degenerative':
        return 'warning';
      case 'Not Visualized':
        return 'default';
      default:
        return 'default';
    }
  };

  const getCompletionStats = () => {
    const completed = checklistItems.filter(item => item.status !== '').length;
    const total = checklistItems.length;
    const abnormal = checklistItems.filter(item => item.status === 'Abnormal').length;
    return { completed, total, abnormal };
  };

  const stats = getCompletionStats();

  return (
    <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0' }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
          {title} {required && <span style={{ color: 'red' }}>*</span>}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Chip
            label={`${stats.completed}/${stats.total} Completed`}
            size="small"
            color={stats.completed === stats.total ? 'success' : 'default'}
          />
          {stats.abnormal > 0 && (
            <Chip
              label={`${stats.abnormal} Abnormal`}
              size="small"
              color="error"
            />
          )}
        </Stack>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col} sx={{ fontWeight: 600, bgcolor: '#f5f5f5' }}>
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {checklistItems.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell sx={{ fontWeight: 500, width: '15%' }}>
                  {item.label}
                </TableCell>
                <TableCell sx={{ width: '25%' }}>
                  <Select
                    fullWidth
                    size="small"
                    value={item.status || ''}
                    onChange={(e) => handleStatusChange(item.id, e.target.value)}
                    displayEmpty
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="">
                      <em>Select status</em>
                    </MenuItem>
                    {statusOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell sx={{ width: '60%' }}>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    maxRows={2}
                    value={item.notes || ''}
                    onChange={(e) => handleNotesChange(item.id, e.target.value)}
                    placeholder="Enter findings or notes"
                    disabled={!item.status}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {type === 'spine' && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          Tip: Assess each vertebral level for alignment, disc height, and degenerative changes.
        </Typography>
      )}
    </Paper>
  );
};

export default ChecklistModule;
