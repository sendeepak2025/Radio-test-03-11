/**
 * Critical Communication Panel
 * ACR Practice Parameter compliant critical findings communication
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  FormControlLabel,
  Checkbox,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Warning as CriticalIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  CheckCircle as AckIcon,
  Schedule as TimeIcon,
  Person as PersonIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  TrendingUp as EscalateIcon
} from '@mui/icons-material';

interface CriticalCommunicationPanelProps {
  reportId: string;
  studyInstanceUID: string;
  patientID: string;
  patientName: string;
  onCommunicationCreated?: (communication: any) => void;
}

interface CommunicationAttempt {
  attemptNumber: number;
  timestamp: string;
  method: string;
  recipientName: string;
  recipientRole?: string;
  outcome: string;
  notes?: string;
}

interface CriticalCommunication {
  _id: string;
  reportId: string;
  finding: {
    description: string;
    location?: string;
    severity: string;
  };
  status: string;
  findingIdentifiedAt: string;
  acknowledgedAt?: string;
  attempts: CommunicationAttempt[];
  acknowledgment?: {
    acknowledgedBy: string;
    method: string;
    readBackConfirmed: boolean;
  };
  compliance?: {
    withinTimeLimit: boolean;
    timeLimitMinutes: number;
  };
  timeToAcknowledgment?: number;
}

const CriticalCommunicationPanel: React.FC<CriticalCommunicationPanelProps> = ({
  reportId,
  studyInstanceUID,
  patientID,
  patientName,
  onCommunicationCreated
}) => {
  const [communications, setCommunications] = useState<CriticalCommunication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New communication dialog
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newFinding, setNewFinding] = useState({
    description: '',
    location: '',
    severity: 'critical' as 'critical' | 'urgent' | 'significant'
  });
  
  // Attempt dialog
  const [showAttemptDialog, setShowAttemptDialog] = useState(false);
  const [selectedComm, setSelectedComm] = useState<CriticalCommunication | null>(null);
  const [attemptData, setAttemptData] = useState({
    method: 'phone',
    recipientName: '',
    recipientRole: '',
    recipientPhone: '',
    outcome: 'reached',
    notes: ''
  });
  
  // Acknowledgment dialog
  const [showAckDialog, setShowAckDialog] = useState(false);
  const [ackData, setAckData] = useState({
    acknowledgedBy: '',
    acknowledgedByRole: '',
    method: 'verbal',
    readBackConfirmed: false,
    verbatimReadBack: '',
    notes: ''
  });

  useEffect(() => {
    loadCommunications();
  }, [reportId]);

  const loadCommunications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      const response = await fetch(`/api/critical-communications/report/${reportId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCommunications(data.communications || []);
      }
    } catch (err: any) {
      console.error('Failed to load communications:', err);
    } finally {
      setLoading(false);
    }
  };

  const createCommunication = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      const response = await fetch('/api/critical-communications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reportId,
          studyInstanceUID,
          patientID,
          patientName,
          finding: newFinding
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create communication');
      }
      
      const data = await response.json();
      setCommunications([data.communication, ...communications]);
      setShowNewDialog(false);
      setNewFinding({ description: '', location: '', severity: 'critical' });
      
      if (onCommunicationCreated) {
        onCommunicationCreated(data.communication);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const recordAttempt = async () => {
    if (!selectedComm) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      const response = await fetch(`/api/critical-communications/${selectedComm._id}/attempt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(attemptData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to record attempt');
      }
      
      const data = await response.json();
      setCommunications(communications.map(c => 
        c._id === selectedComm._id ? data.communication : c
      ));
      setShowAttemptDialog(false);
      setAttemptData({
        method: 'phone',
        recipientName: '',
        recipientRole: '',
        recipientPhone: '',
        outcome: 'reached',
        notes: ''
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const recordAcknowledgment = async () => {
    if (!selectedComm) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      const response = await fetch(`/api/critical-communications/${selectedComm._id}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(ackData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to record acknowledgment');
      }
      
      const data = await response.json();
      setCommunications(communications.map(c => 
        c._id === selectedComm._id ? data.communication : c
      ));
      setShowAckDialog(false);
      setAckData({
        acknowledgedBy: '',
        acknowledgedByRole: '',
        method: 'verbal',
        readBackConfirmed: false,
        verbatimReadBack: '',
        notes: ''
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'acknowledged': return 'success';
      case 'in_progress': return 'warning';
      case 'escalated': return 'error';
      case 'pending': return 'default';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'urgent': return 'warning';
      case 'significant': return 'info';
      default: return 'default';
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <CriticalIcon color="error" />
          Critical Communications
        </Typography>
        <Box>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={loadCommunications}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setShowNewDialog(true)}
          >
            New Critical Finding
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && <CircularProgress size={24} sx={{ display: 'block', mx: 'auto', my: 2 }} />}

      {communications.length === 0 && !loading && (
        <Paper elevation={1} sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
          <CriticalIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            No critical findings to communicate
          </Typography>
        </Paper>
      )}

      {communications.map((comm) => (
        <Paper key={comm._id} elevation={2} sx={{ p: 2, mb: 2, border: 2, borderColor: `${getSeverityColor(comm.finding.severity)}.main` }}>
          <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                {comm.finding.description}
              </Typography>
              {comm.finding.location && (
                <Typography variant="body2" color="text.secondary">
                  Location: {comm.finding.location}
                </Typography>
              )}
            </Box>
            <Box display="flex" gap={1}>
              <Chip 
                label={comm.finding.severity.toUpperCase()} 
                color={getSeverityColor(comm.finding.severity) as any}
                size="small"
              />
              <Chip 
                label={comm.status.toUpperCase()} 
                color={getStatusColor(comm.status) as any}
                size="small"
              />
            </Box>
          </Box>

          <Divider sx={{ my: 1 }} />

          {/* Timeline */}
          <Box sx={{ fontSize: '0.875rem' }}>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <TimeIcon fontSize="small" color="action" />
              <Typography variant="body2">
                Identified: {formatTime(comm.findingIdentifiedAt)}
              </Typography>
            </Box>
            
            {comm.attempts.length > 0 && (
              <Box ml={3}>
                <Typography variant="caption" color="text.secondary">
                  {comm.attempts.length} attempt(s)
                </Typography>
              </Box>
            )}
            
            {comm.acknowledgedAt && (
              <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                <AckIcon fontSize="small" color="success" />
                <Typography variant="body2" color="success.main">
                  Acknowledged: {formatTime(comm.acknowledgedAt)}
                  {comm.timeToAcknowledgment && ` (${comm.timeToAcknowledgment} min)`}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Compliance Status */}
          {comm.compliance && (
            <Box mt={1}>
              <Chip
                label={comm.compliance.withinTimeLimit ? 'Within Time Limit' : 'EXCEEDED TIME LIMIT'}
                color={comm.compliance.withinTimeLimit ? 'success' : 'error'}
                size="small"
                icon={<TimeIcon />}
              />
            </Box>
          )}

          {/* Actions */}
          {comm.status !== 'acknowledged' && (
            <Box display="flex" gap={1} mt={2}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PhoneIcon />}
                onClick={() => {
                  setSelectedComm(comm);
                  setShowAttemptDialog(true);
                }}
              >
                Record Attempt
              </Button>
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<AckIcon />}
                onClick={() => {
                  setSelectedComm(comm);
                  setShowAckDialog(true);
                }}
              >
                Record Acknowledgment
              </Button>
            </Box>
          )}
        </Paper>
      ))}

      {/* New Communication Dialog */}
      <Dialog open={showNewDialog} onClose={() => setShowNewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CriticalIcon color="error" />
            Report Critical Finding
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Critical findings require immediate verbal communication per ACR guidelines.
          </Alert>
          
          <TextField
            fullWidth
            label="Finding Description"
            value={newFinding.description}
            onChange={(e) => setNewFinding({ ...newFinding, description: e.target.value })}
            multiline
            rows={3}
            required
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Anatomical Location"
            value={newFinding.location}
            onChange={(e) => setNewFinding({ ...newFinding, location: e.target.value })}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth>
            <InputLabel>Severity</InputLabel>
            <Select
              value={newFinding.severity}
              label="Severity"
              onChange={(e) => setNewFinding({ ...newFinding, severity: e.target.value as any })}
            >
              <MenuItem value="critical">Critical (Communicate within 60 min)</MenuItem>
              <MenuItem value="urgent">Urgent (Communicate within 4 hours)</MenuItem>
              <MenuItem value="significant">Significant (Communicate within 24 hours)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={createCommunication}
            disabled={!newFinding.description || loading}
          >
            Create & Start Communication
          </Button>
        </DialogActions>
      </Dialog>

      {/* Record Attempt Dialog */}
      <Dialog open={showAttemptDialog} onClose={() => setShowAttemptDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Communication Attempt</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Method</InputLabel>
            <Select
              value={attemptData.method}
              label="Method"
              onChange={(e) => setAttemptData({ ...attemptData, method: e.target.value })}
            >
              <MenuItem value="phone">Phone Call</MenuItem>
              <MenuItem value="page">Page</MenuItem>
              <MenuItem value="secure_message">Secure Message</MenuItem>
              <MenuItem value="in_person">In Person</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Recipient Name"
            value={attemptData.recipientName}
            onChange={(e) => setAttemptData({ ...attemptData, recipientName: e.target.value })}
            required
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Recipient Role"
            value={attemptData.recipientRole}
            onChange={(e) => setAttemptData({ ...attemptData, recipientRole: e.target.value })}
            placeholder="e.g., Attending, Resident, Nurse"
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Outcome</InputLabel>
            <Select
              value={attemptData.outcome}
              label="Outcome"
              onChange={(e) => setAttemptData({ ...attemptData, outcome: e.target.value })}
            >
              <MenuItem value="reached">Reached - Spoke Directly</MenuItem>
              <MenuItem value="voicemail">Left Voicemail</MenuItem>
              <MenuItem value="no_answer">No Answer</MenuItem>
              <MenuItem value="busy">Line Busy</MenuItem>
              <MenuItem value="callback_requested">Callback Requested</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Notes"
            value={attemptData.notes}
            onChange={(e) => setAttemptData({ ...attemptData, notes: e.target.value })}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAttemptDialog(false)}>Cancel</Button>
          <Button 
            variant="contained"
            onClick={recordAttempt}
            disabled={!attemptData.recipientName || loading}
          >
            Record Attempt
          </Button>
        </DialogActions>
      </Dialog>

      {/* Record Acknowledgment Dialog */}
      <Dialog open={showAckDialog} onClose={() => setShowAckDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AckIcon color="success" />
            Record Acknowledgment
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            ACR requires documentation of verbal communication with read-back confirmation.
          </Alert>
          
          <TextField
            fullWidth
            label="Acknowledged By (Name)"
            value={ackData.acknowledgedBy}
            onChange={(e) => setAckData({ ...ackData, acknowledgedBy: e.target.value })}
            required
            sx={{ mb: 2, mt: 1 }}
          />
          
          <TextField
            fullWidth
            label="Role"
            value={ackData.acknowledgedByRole}
            onChange={(e) => setAckData({ ...ackData, acknowledgedByRole: e.target.value })}
            placeholder="e.g., Attending Physician"
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Acknowledgment Method</InputLabel>
            <Select
              value={ackData.method}
              label="Acknowledgment Method"
              onChange={(e) => setAckData({ ...ackData, method: e.target.value })}
            >
              <MenuItem value="verbal">Verbal Confirmation</MenuItem>
              <MenuItem value="read_back">Read-Back Confirmation</MenuItem>
              <MenuItem value="electronic">Electronic Acknowledgment</MenuItem>
            </Select>
          </FormControl>
          
          <FormControlLabel
            control={
              <Checkbox
                checked={ackData.readBackConfirmed}
                onChange={(e) => setAckData({ ...ackData, readBackConfirmed: e.target.checked })}
              />
            }
            label="Read-back confirmed (ACR recommended)"
            sx={{ mb: 2 }}
          />
          
          {ackData.readBackConfirmed && (
            <TextField
              fullWidth
              label="Verbatim Read-Back"
              value={ackData.verbatimReadBack}
              onChange={(e) => setAckData({ ...ackData, verbatimReadBack: e.target.value })}
              multiline
              rows={2}
              placeholder="Document what was read back..."
              sx={{ mb: 2 }}
            />
          )}
          
          <TextField
            fullWidth
            label="Additional Notes"
            value={ackData.notes}
            onChange={(e) => setAckData({ ...ackData, notes: e.target.value })}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAckDialog(false)}>Cancel</Button>
          <Button 
            variant="contained"
            color="success"
            onClick={recordAcknowledgment}
            disabled={!ackData.acknowledgedBy || loading}
          >
            Confirm Acknowledgment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CriticalCommunicationPanel;
