import React, { useState } from 'react';
import {
  Box,
  Toolbar,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import {
  GetApp,
  Edit,
  PersonAdd,
  Close,
  CheckCircle
} from '@mui/icons-material';

interface BatchToolbarProps {
  selectedCount: number;
  selectedIds: string[];
  onClearSelection: () => void;
  onRefresh?: () => void;
}

export default function BatchToolbar({
  selectedCount,
  selectedIds,
  onClearSelection,
  onRefresh
}: BatchToolbarProps) {
  const [operation, setOperation] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Status change dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  
  // Assignment dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [radiologistId, setRadiologistId] = useState('');
  
  // Job tracking
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [jobState, setJobState] = useState<string | null>(null);

  const handleExportPDF = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/batch-operations/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reportIds: selectedIds,
          format: 'zip'
        })
      });

      if (!response.ok) throw new Error('Failed to queue batch export');

      const data = await response.json();
      setJobId(data.jobId);
      setSuccess(`Export queued for ${selectedCount} reports. Job ID: ${data.jobId}`);
      
      // Start polling job status
      pollJobStatus(data.jobId);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async () => {
    if (!newStatus) {
      setError('Please select a status');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/batch-operations/status/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reportIds: selectedIds,
          newStatus
        })
      });

      if (!response.ok) throw new Error('Failed to queue status change');

      const data = await response.json();
      setJobId(data.jobId);
      setSuccess(`Status change queued for ${selectedCount} reports`);
      setStatusDialogOpen(false);
      
      pollJobStatus(data.jobId);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!radiologistId) {
      setError('Please select a radiologist');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/batch-operations/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reportIds: selectedIds,
          radiologistId
        })
      });

      if (!response.ok) throw new Error('Failed to queue assignment');

      const data = await response.json();
      setJobId(data.jobId);
      setSuccess(`Assignment queued for ${selectedCount} reports`);
      setAssignDialogOpen(false);
      
      pollJobStatus(data.jobId);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/batch-operations/jobs/${jobId}`, {
          credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to get job status');

        const data = await response.json();
        setJobState(data.state);
        setProgress(data.progress || 0);

        if (data.state === 'completed') {
          clearInterval(interval);
          setSuccess('Operation completed successfully!');
          
          // If it's an export, provide download link
          if (data.result?.downloadUrl) {
            const downloadLink = data.result.downloadUrl;
            window.location.href = downloadLink;
          }
          
          if (onRefresh) {
            setTimeout(() => {
              onRefresh();
              onClearSelection();
            }, 1000);
          }
        } else if (data.state === 'failed') {
          clearInterval(interval);
          setError('Operation failed');
        }
      } catch (err: any) {
        console.error('Error polling job status:', err);
        clearInterval(interval);
      }
    }, 2000); // Poll every 2 seconds
  };

  const handleOperationChange = (value: string) => {
    setOperation(value);
    
    switch (value) {
      case 'export':
        handleExportPDF();
        break;
      case 'status':
        setStatusDialogOpen(true);
        break;
      case 'assign':
        setAssignDialogOpen(true);
        break;
    }
    
    setOperation('');
  };

  return (
    <>
      <Toolbar
        sx={{
          pl: { sm: 2 },
          pr: { xs: 1, sm: 1 },
          bgcolor: 'primary.main',
          color: 'white',
          display: selectedCount > 0 ? 'flex' : 'none',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={`${selectedCount} selected`}
            color="secondary"
            onDelete={onClearSelection}
            deleteIcon={<Close />}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel sx={{ color: 'white' }}>Batch Action</InputLabel>
            <Select
              value={operation}
              label="Batch Action"
              onChange={(e) => handleOperationChange(e.target.value)}
              disabled={loading}
              sx={{ 
                color: 'white',
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                '.MuiSvgIcon-root': { color: 'white' }
              }}
            >
              <MenuItem value="export">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GetApp />
                  Export as PDF
                </Box>
              </MenuItem>
              <MenuItem value="status">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Edit />
                  Change Status
                </Box>
              </MenuItem>
              <MenuItem value="assign">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonAdd />
                  Assign to Radiologist
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          {loading && <CircularProgress size={24} sx={{ color: 'white' }} />}
        </Box>
      </Toolbar>

      {(jobState === 'active' || jobState === 'waiting') && (
        <Box sx={{ width: '100%', p: 2 }}>
          <LinearProgress variant="determinate" value={progress} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Box>{jobState === 'active' ? 'Processing...' : 'Waiting...'}</Box>
            <Box>{Math.round(progress)}%</Box>
          </Box>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ m: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}>
        <DialogTitle>Change Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>New Status</InputLabel>
            <Select
              value={newStatus}
              label="New Status"
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="in-progress">In Progress</MenuItem>
              <MenuItem value="final">Final</MenuItem>
              <MenuItem value="signed">Signed</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleChangeStatus} variant="contained" disabled={loading}>
            {loading ? 'Processing...' : 'Change Status'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)}>
        <DialogTitle>Assign to Radiologist</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Radiologist ID"
            value={radiologistId}
            onChange={(e) => setRadiologistId(e.target.value)}
            sx={{ mt: 2 }}
            helperText="Enter the radiologist's user ID"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAssign} variant="contained" disabled={loading}>
            {loading ? 'Processing...' : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
