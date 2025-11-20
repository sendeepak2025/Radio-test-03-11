import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardActions,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  Psychology,
  Send,
  Reply,
  Close
} from '@mui/icons-material';

interface ConsultationPanelProps {
  reportId: string;
  open: boolean;
  onClose: () => void;
}

interface Consultation {
  _id: string;
  reportId: string;
  requestedBy: { _id: string; firstName: string; lastName: string };
  specialist: { _id: string; firstName: string; lastName: string };
  specialistDepartment: string;
  urgency: 'urgent' | 'high' | 'routine';
  clinicalQuestion: string;
  status: 'pending' | 'in-progress' | 'completed';
  opinion?: string;
  recommendations?: string;
  createdAt: string;
  completedAt?: string;
}

export default function ConsultationPanel({ reportId, open, onClose }: ConsultationPanelProps) {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Request dialog
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedSpecialist, setSelectedSpecialist] = useState('');
  const [department, setDepartment] = useState('');
  const [urgency, setUrgency] = useState<'urgent' | 'high' | 'routine'>('routine');
  const [clinicalQuestion, setClinicalQuestion] = useState('');
  
  // Consultations
  const [myRequests, setMyRequests] = useState<Consultation[]>([]);
  const [assignedToMe, setAssignedToMe] = useState<Consultation[]>([]);
  const [specialists, setSpecialists] = useState<any[]>([]);
  
  // Response dialog
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [opinion, setOpinion] = useState('');
  const [recommendations, setRecommendations] = useState('');

  const departments = [
    'Cardiology',
    'Neurology',
    'Oncology',
    'Orthopedics',
    'Pulmonology',
    'Gastroenterology',
    'Urology',
    'Other'
  ];

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [requestsRes, assignedRes, specialistsRes] = await Promise.all([
        fetch('/api/collaboration/consultation/my-requests', { credentials: 'include' }),
        fetch('/api/collaboration/consultation/assigned', { credentials: 'include' }),
        fetch('/api/users?role=specialist', { credentials: 'include' })
      ]);

      const requestsData = await requestsRes.json();
      const assignedData = await assignedRes.json();
      const specialistsData = await specialistsRes.json();

      setMyRequests(requestsData.consultations || []);
      setAssignedToMe(assignedData.consultations || []);
      setSpecialists(specialistsData.users || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestConsultation = async () => {
    if (!selectedSpecialist || !clinicalQuestion) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/collaboration/consultation/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reportId,
          specialistId: selectedSpecialist,
          specialistDepartment: department,
          urgency,
          clinicalQuestion
        })
      });

      if (!response.ok) throw new Error('Failed to request consultation');

      await fetchData();
      setRequestDialogOpen(false);
      setSelectedSpecialist('');
      setDepartment('');
      setClinicalQuestion('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToConsultation = async () => {
    if (!selectedConsultation || !opinion) {
      setError('Please provide your opinion');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/collaboration/consultation/${selectedConsultation._id}/respond`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            opinion,
            recommendations
          })
        }
      );

      if (!response.ok) throw new Error('Failed to respond to consultation');

      await fetchData();
      setResponseDialogOpen(false);
      setSelectedConsultation(null);
      setOpinion('');
      setRecommendations('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'routine': return 'default';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'info';
      case 'pending': return 'default';
      default: return 'default';
    }
  };

  const renderConsultationCard = (consultation: Consultation, isAssigned: boolean) => (
    <Card key={consultation._id} sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            {isAssigned
              ? `Consultation from ${consultation.requestedBy.firstName} ${consultation.requestedBy.lastName}`
              : `Consultation with ${consultation.specialist.firstName} ${consultation.specialist.lastName}`
            }
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={consultation.urgency} size="small" color={getUrgencyColor(consultation.urgency)} />
            <Chip label={consultation.status} size="small" color={getStatusColor(consultation.status)} />
          </Box>
        </Box>

        {consultation.specialistDepartment && (
          <Chip label={consultation.specialistDepartment} size="small" sx={{ mb: 2 }} />
        )}

        <Typography variant="subtitle2" gutterBottom>Clinical Question:</Typography>
        <Typography variant="body2" paragraph>{consultation.clinicalQuestion}</Typography>

        {consultation.opinion && (
          <>
            <Typography variant="subtitle2" gutterBottom>Opinion:</Typography>
            <Typography variant="body2" paragraph>{consultation.opinion}</Typography>
          </>
        )}

        {consultation.recommendations && (
          <>
            <Typography variant="subtitle2" gutterBottom>Recommendations:</Typography>
            <Typography variant="body2" paragraph>{consultation.recommendations}</Typography>
          </>
        )}

        <Typography variant="caption" color="text.secondary">
          Requested {new Date(consultation.createdAt).toLocaleDateString()}
        </Typography>
      </CardContent>

      {isAssigned && consultation.status === 'pending' && (
        <CardActions>
          <Button
            size="small"
            startIcon={<Reply />}
            onClick={() => {
              setSelectedConsultation(consultation);
              setResponseDialogOpen(true);
            }}
          >
            Respond
          </Button>
        </CardActions>
      )}
    </Card>
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Psychology />
              Consultations
            </Box>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tab} onChange={(e, v) => setTab(v)}>
              <Tab label={`My Requests (${myRequests.length})`} />
              <Tab label={`Assigned to Me (${assignedToMe.length})`} />
            </Tabs>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {tab === 0 && (
                <Box>
                  <Button
                    variant="contained"
                    startIcon={<Send />}
                    onClick={() => setRequestDialogOpen(true)}
                    sx={{ mb: 2 }}
                  >
                    Request Consultation
                  </Button>

                  {myRequests.length === 0 ? (
                    <Alert severity="info">No consultation requests yet</Alert>
                  ) : (
                    myRequests.map(consultation => renderConsultationCard(consultation, false))
                  )}
                </Box>
              )}

              {tab === 1 && (
                <Box>
                  {assignedToMe.length === 0 ? (
                    <Alert severity="info">No consultations assigned to you</Alert>
                  ) : (
                    assignedToMe.map(consultation => renderConsultationCard(consultation, true))
                  )}
                </Box>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Request Consultation Dialog */}
      <Dialog open={requestDialogOpen} onClose={() => setRequestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Consultation</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Select Specialist</InputLabel>
            <Select
              value={selectedSpecialist}
              label="Select Specialist"
              onChange={(e) => setSelectedSpecialist(e.target.value)}
            >
              {specialists.map((spec) => (
                <MenuItem key={spec._id} value={spec._id}>
                  {spec.firstName} {spec.lastName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Department</InputLabel>
            <Select
              value={department}
              label="Department"
              onChange={(e) => setDepartment(e.target.value)}
            >
              {departments.map((dept) => (
                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Urgency</InputLabel>
            <Select
              value={urgency}
              label="Urgency"
              onChange={(e) => setUrgency(e.target.value as any)}
            >
              <MenuItem value="urgent">Urgent</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="routine">Routine</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Clinical Question"
            value={clinicalQuestion}
            onChange={(e) => setClinicalQuestion(e.target.value)}
            placeholder="Describe the clinical question requiring specialist input..."
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRequestConsultation} variant="contained" disabled={loading}>
            Send Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Response Dialog */}
      <Dialog open={responseDialogOpen} onClose={() => setResponseDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Provide Consultation</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Your Opinion"
            value={opinion}
            onChange={(e) => setOpinion(e.target.value)}
            placeholder="Provide your expert opinion..."
            required
            sx={{ mt: 2, mb: 2 }}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Recommendations (Optional)"
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            placeholder="Add any recommendations..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResponseDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRespondToConsultation} variant="contained" disabled={loading}>
            Submit Response
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
