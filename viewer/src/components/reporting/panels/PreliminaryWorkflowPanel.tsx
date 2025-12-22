/**
 * Preliminary Workflow Panel
 * Trainee/Attending co-signature workflow
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Alert,
  Chip,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  IconButton,
  Tooltip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText
} from '@mui/material';
import {
  School as TraineeIcon,
  LocalHospital as AttendingIcon,
  CheckCircle as SignedIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Warning as ChangesIcon,
  Done as DoneIcon,
  Schedule as PendingIcon
} from '@mui/icons-material';

interface PreliminaryWorkflowPanelProps {
  reportId: string;
  reportStatus: string;
  onWorkflowUpdate?: (workflow: any) => void;
}

interface WorkflowData {
  trainee?: {
    name: string;
    role: string;
    signedAt: string;
    signatureText: string;
  };
  attending?: {
    name: string;
    credentials: string;
    signedAt: string;
    attestationType: string;
    attestationNotes?: string;
    changesRequired: boolean;
    changesSummary?: string;
  };
  status: string;
  traineeSubmittedAt?: string;
  attendingReviewedAt?: string;
  finalizedAt?: string;
}

const PreliminaryWorkflowPanel: React.FC<PreliminaryWorkflowPanelProps> = ({
  reportId,
  reportStatus,
  onWorkflowUpdate
}) => {
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Trainee sign dialog
  const [showTraineeDialog, setShowTraineeDialog] = useState(false);
  const [traineeData, setTraineeData] = useState({
    signatureText: '',
    role: 'resident'
  });
  
  // Attending attest dialog
  const [showAttendingDialog, setShowAttendingDialog] = useState(false);
  const [attendingData, setAttendingData] = useState({
    signatureText: '',
    attestationType: 'agree',
    attestationNotes: '',
    changesRequired: false,
    changesSummary: ''
  });

  useEffect(() => {
    if (reportId) {
      loadWorkflow();
    }
  }, [reportId]);

  const loadWorkflow = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      const response = await fetch(`/api/preliminary-workflow/${reportId}/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWorkflow(data.workflow);
      }
    } catch (err: any) {
      console.error('Failed to load workflow:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTraineeSign = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      const response = await fetch(`/api/preliminary-workflow/${reportId}/trainee-sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(traineeData)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to sign');
      }
      
      const data = await response.json();
      setWorkflow(data.report.preliminaryWorkflow);
      setShowTraineeDialog(false);
      setTraineeData({ signatureText: '', role: 'resident' });
      
      if (onWorkflowUpdate) {
        onWorkflowUpdate(data.report.preliminaryWorkflow);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendingAttest = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      const response = await fetch(`/api/preliminary-workflow/${reportId}/attending-attest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(attendingData)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to attest');
      }
      
      const data = await response.json();
      setWorkflow(data.report.preliminaryWorkflow);
      setShowAttendingDialog(false);
      setAttendingData({
        signatureText: '',
        attestationType: 'agree',
        attestationNotes: '',
        changesRequired: false,
        changesSummary: ''
      });
      
      if (onWorkflowUpdate) {
        onWorkflowUpdate(data.report.preliminaryWorkflow);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStepStatus = (step: number) => {
    if (!workflow) return 'pending';
    
    switch (step) {
      case 0: // Trainee sign
        return workflow.trainee?.signedAt ? 'completed' : 'pending';
      case 1: // Attending review
        if (workflow.status === 'changes_requested') return 'changes';
        if (workflow.attending?.signedAt) return 'completed';
        if (workflow.trainee?.signedAt) return 'active';
        return 'pending';
      case 2: // Finalized
        return workflow.status === 'finalized' ? 'completed' : 'pending';
      default:
        return 'pending';
    }
  };

  const getActiveStep = () => {
    if (!workflow) return 0;
    if (workflow.status === 'finalized') return 3;
    if (workflow.status === 'changes_requested') return 1;
    if (workflow.attending?.signedAt) return 2;
    if (workflow.trainee?.signedAt) return 1;
    return 0;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  const canTraineeSign = reportStatus === 'draft' && !workflow?.trainee?.signedAt;
  const canAttendingAttest = workflow?.status === 'pending_attending' || workflow?.status === 'changes_requested';

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <TraineeIcon color="primary" />
          Preliminary Workflow
        </Typography>
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={loadWorkflow}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && <CircularProgress size={24} sx={{ display: 'block', mx: 'auto', my: 2 }} />}

      {/* Workflow Status */}
      {workflow?.status && (
        <Box mb={2}>
          <Chip
            label={workflow.status.replace(/_/g, ' ').toUpperCase()}
            color={
              workflow.status === 'finalized' ? 'success' :
              workflow.status === 'changes_requested' ? 'warning' :
              'default'
            }
            icon={
              workflow.status === 'finalized' ? <DoneIcon /> :
              workflow.status === 'changes_requested' ? <ChangesIcon /> :
              <PendingIcon />
            }
          />
        </Box>
      )}

      {/* Workflow Stepper */}
      <Stepper activeStep={getActiveStep()} orientation="vertical">
        {/* Step 1: Trainee Sign */}
        <Step completed={getStepStatus(0) === 'completed'}>
          <StepLabel
            StepIconComponent={() => (
              <Avatar sx={{ 
                width: 32, 
                height: 32, 
                bgcolor: getStepStatus(0) === 'completed' ? 'success.main' : 'grey.400'
              }}>
                <TraineeIcon fontSize="small" />
              </Avatar>
            )}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Trainee Signature
            </Typography>
          </StepLabel>
          <StepContent>
            {workflow?.trainee?.signedAt ? (
              <Paper elevation={1} sx={{ p: 2, bgcolor: 'success.light' }}>
                <Typography variant="body2">
                  <strong>{workflow.trainee.name}</strong> ({workflow.trainee.role})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Signed: {formatDate(workflow.trainee.signedAt)}
                </Typography>
                <Typography variant="body2" sx={{ fontStyle: 'italic', mt: 1 }}>
                  "{workflow.trainee.signatureText}"
                </Typography>
              </Paper>
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Trainee must sign the preliminary report before attending review.
                </Typography>
                {canTraineeSign && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => setShowTraineeDialog(true)}
                  >
                    Sign as Trainee
                  </Button>
                )}
              </Box>
            )}
          </StepContent>
        </Step>

        {/* Step 2: Attending Review */}
        <Step completed={getStepStatus(1) === 'completed'}>
          <StepLabel
            StepIconComponent={() => (
              <Avatar sx={{ 
                width: 32, 
                height: 32, 
                bgcolor: getStepStatus(1) === 'completed' ? 'success.main' : 
                         getStepStatus(1) === 'changes' ? 'warning.main' : 'grey.400'
              }}>
                <AttendingIcon fontSize="small" />
              </Avatar>
            )}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Attending Attestation
            </Typography>
          </StepLabel>
          <StepContent>
            {workflow?.attending?.signedAt ? (
              <Paper elevation={1} sx={{ 
                p: 2, 
                bgcolor: workflow.attending.changesRequired ? 'warning.light' : 'success.light' 
              }}>
                <Typography variant="body2">
                  <strong>{workflow.attending.name}</strong>, {workflow.attending.credentials}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {workflow.attending.attestationType.replace(/_/g, ' ')} - {formatDate(workflow.attending.signedAt)}
                </Typography>
                {workflow.attending.attestationNotes && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Notes: {workflow.attending.attestationNotes}
                  </Typography>
                )}
                {workflow.attending.changesRequired && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Changes requested: {workflow.attending.changesSummary}
                  </Alert>
                )}
              </Paper>
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Attending physician must review and attest the report.
                </Typography>
                {canAttendingAttest && (
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={<SignedIcon />}
                    onClick={() => setShowAttendingDialog(true)}
                  >
                    Attest as Attending
                  </Button>
                )}
              </Box>
            )}
          </StepContent>
        </Step>

        {/* Step 3: Finalized */}
        <Step completed={getStepStatus(2) === 'completed'}>
          <StepLabel
            StepIconComponent={() => (
              <Avatar sx={{ 
                width: 32, 
                height: 32, 
                bgcolor: getStepStatus(2) === 'completed' ? 'success.main' : 'grey.400'
              }}>
                <DoneIcon fontSize="small" />
              </Avatar>
            )}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Report Finalized
            </Typography>
          </StepLabel>
          <StepContent>
            {workflow?.finalizedAt ? (
              <Paper elevation={1} sx={{ p: 2, bgcolor: 'success.light' }}>
                <Typography variant="body2" color="success.dark">
                  Report finalized on {formatDate(workflow.finalizedAt)}
                </Typography>
              </Paper>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Report will be finalized after attending attestation.
              </Typography>
            )}
          </StepContent>
        </Step>
      </Stepper>

      {/* Info Panel */}
      <Paper elevation={1} sx={{ p: 2, mt: 2, bgcolor: 'info.light' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          📋 Preliminary Workflow
        </Typography>
        <Typography variant="caption" component="div">
          • Trainee (resident/fellow) creates and signs preliminary report
        </Typography>
        <Typography variant="caption" component="div">
          • Attending physician reviews and attests
        </Typography>
        <Typography variant="caption" component="div">
          • Attending can request changes if needed
        </Typography>
        <Typography variant="caption" component="div">
          • Report is finalized after attending attestation
        </Typography>
      </Paper>

      {/* Trainee Sign Dialog */}
      <Dialog open={showTraineeDialog} onClose={() => setShowTraineeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <TraineeIcon color="primary" />
            Sign Preliminary Report
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            By signing, you certify this preliminary report is ready for attending review.
          </Alert>
          
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Your Role</InputLabel>
            <Select
              value={traineeData.role}
              label="Your Role"
              onChange={(e) => setTraineeData({ ...traineeData, role: e.target.value })}
            >
              <MenuItem value="resident">Resident</MenuItem>
              <MenuItem value="fellow">Fellow</MenuItem>
              <MenuItem value="medical_student">Medical Student</MenuItem>
              <MenuItem value="pa">Physician Assistant</MenuItem>
              <MenuItem value="np">Nurse Practitioner</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Signature (Type Your Name)"
            value={traineeData.signatureText}
            onChange={(e) => setTraineeData({ ...traineeData, signatureText: e.target.value })}
            required
            placeholder="e.g., John Smith, MD (PGY-3)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTraineeDialog(false)}>Cancel</Button>
          <Button 
            variant="contained"
            onClick={handleTraineeSign}
            disabled={!traineeData.signatureText || loading}
          >
            Sign Preliminary Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* Attending Attest Dialog */}
      <Dialog open={showAttendingDialog} onClose={() => setShowAttendingDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AttendingIcon color="success" />
            Attending Attestation
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Review the preliminary report and provide your attestation.
          </Alert>
          
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Attestation Type</InputLabel>
            <Select
              value={attendingData.attestationType}
              label="Attestation Type"
              onChange={(e) => setAttendingData({ ...attendingData, attestationType: e.target.value })}
            >
              <MenuItem value="agree">I agree with this report</MenuItem>
              <MenuItem value="agree_with_changes">I agree with minor changes</MenuItem>
              <MenuItem value="reviewed">I have reviewed this report</MenuItem>
              <MenuItem value="supervised">I supervised this interpretation</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Signature (Type Your Name)"
            value={attendingData.signatureText}
            onChange={(e) => setAttendingData({ ...attendingData, signatureText: e.target.value })}
            required
            sx={{ mb: 2 }}
            placeholder="e.g., Jane Doe, MD"
          />
          
          <TextField
            fullWidth
            label="Attestation Notes (Optional)"
            value={attendingData.attestationNotes}
            onChange={(e) => setAttendingData({ ...attendingData, attestationNotes: e.target.value })}
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />
          
          <FormControlLabel
            control={
              <Checkbox
                checked={attendingData.changesRequired}
                onChange={(e) => setAttendingData({ ...attendingData, changesRequired: e.target.checked })}
              />
            }
            label="Request changes from trainee"
          />
          
          {attendingData.changesRequired && (
            <TextField
              fullWidth
              label="Changes Required"
              value={attendingData.changesSummary}
              onChange={(e) => setAttendingData({ ...attendingData, changesSummary: e.target.value })}
              multiline
              rows={3}
              required
              sx={{ mt: 1 }}
              placeholder="Describe the changes needed..."
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAttendingDialog(false)}>Cancel</Button>
          <Button 
            variant="contained"
            color={attendingData.changesRequired ? 'warning' : 'success'}
            onClick={handleAttendingAttest}
            disabled={!attendingData.signatureText || (attendingData.changesRequired && !attendingData.changesSummary) || loading}
          >
            {attendingData.changesRequired ? 'Request Changes' : 'Attest & Finalize'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PreliminaryWorkflowPanel;
