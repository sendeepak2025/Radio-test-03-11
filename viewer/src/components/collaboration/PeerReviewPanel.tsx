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
  Chip,
  Card,
  CardContent,
  CardActions,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton
} from '@mui/material';
import {
  RateReview,
  CheckCircle,
  PriorityHigh,
  Send,
  Comment,
  Close,
  Edit
} from '@mui/icons-material';

interface PeerReviewPanelProps {
  reportId: string;
  open: boolean;
  onClose: () => void;
}

interface PeerReview {
  _id: string;
  reportId: string;
  requestedBy: { _id: string; firstName: string; lastName: string };
  reviewer: { _id: string; firstName: string; lastName: string };
  status: 'pending' | 'in-review' | 'approved' | 'changes-requested';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  comments: Array<{
    userId: string;
    userName: string;
    text: string;
    createdAt: string;
  }>;
  createdAt: string;
  completedAt?: string;
}

export default function PeerReviewPanel({ reportId, open, onClose }: PeerReviewPanelProps) {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Request dialog state
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedReviewer, setSelectedReviewer] = useState('');
  const [priority, setPriority] = useState<'urgent' | 'high' | 'normal' | 'low'>('normal');
  const [requestNotes, setRequestNotes] = useState('');
  
  // Reviews state
  const [myRequests, setMyRequests] = useState<PeerReview[]>([]);
  const [assignedToMe, setAssignedToMe] = useState<PeerReview[]>([]);
  const [radiologists, setRadiologists] = useState<any[]>([]);
  
  // Response dialog state
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<PeerReview | null>(null);
  const [responseComment, setResponseComment] = useState('');
  const [responseAction, setResponseAction] = useState<'approve' | 'changes-requested'>('approve');

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [requestsRes, assignedRes, radiologistsRes] = await Promise.all([
        fetch('/api/collaboration/peer-review/my-requests', { credentials: 'include' }),
        fetch('/api/collaboration/peer-review/assigned', { credentials: 'include' }),
        fetch('/api/users?role=radiologist', { credentials: 'include' })
      ]);

      const requestsData = await requestsRes.json();
      const assignedData = await assignedRes.json();
      const radiologistsData = await radiologistsRes.json();

      setMyRequests(requestsData.reviews || []);
      setAssignedToMe(assignedData.reviews || []);
      setRadiologists(radiologistsData.users || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReview = async () => {
    if (!selectedReviewer) {
      setError('Please select a reviewer');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/collaboration/peer-review/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reportId,
          reviewerId: selectedReviewer,
          priority,
          notes: requestNotes
        })
      });

      if (!response.ok) throw new Error('Failed to request peer review');

      await fetchData();
      setRequestDialogOpen(false);
      setSelectedReviewer('');
      setPriority('normal');
      setRequestNotes('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToReview = async () => {
    if (!selectedReview || !responseComment) {
      setError('Please provide a comment');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/collaboration/peer-review/${selectedReview._id}/respond`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            status: responseAction,
            comment: responseComment
          })
        }
      );

      if (!response.ok) throw new Error('Failed to respond to review');

      await fetchData();
      setResponseDialogOpen(false);
      setSelectedReview(null);
      setResponseComment('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'normal': return 'primary';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'changes-requested': return 'warning';
      case 'in-review': return 'info';
      case 'pending': return 'default';
      default: return 'default';
    }
  };

  const renderReviewCard = (review: PeerReview, isAssigned: boolean) => (
    <Card key={review._id} sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {isAssigned
                ? `Review from ${review.requestedBy.firstName} ${review.requestedBy.lastName}`
                : `Review by ${review.reviewer.firstName} ${review.reviewer.lastName}`
              }
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Requested {new Date(review.createdAt).toLocaleDateString()}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={review.priority}
              size="small"
              color={getPriorityColor(review.priority)}
              icon={review.priority === 'urgent' ? <PriorityHigh /> : undefined}
            />
            <Chip
              label={review.status.replace('-', ' ')}
              size="small"
              color={getStatusColor(review.status)}
            />
          </Box>
        </Box>

        {review.comments && review.comments.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Comments:</Typography>
            <List dense>
              {review.comments.map((comment, idx) => (
                <ListItem key={idx}>
                  <ListItemText
                    primary={comment.text}
                    secondary={`${comment.userName} - ${new Date(comment.createdAt).toLocaleString()}`}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </CardContent>

      {isAssigned && review.status === 'pending' && (
        <CardActions>
          <Button
            size="small"
            startIcon={<Edit />}
            onClick={() => {
              setSelectedReview(review);
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
              <RateReview />
              Peer Review
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
                    Request Peer Review
                  </Button>

                  {myRequests.length === 0 ? (
                    <Alert severity="info">No review requests yet</Alert>
                  ) : (
                    myRequests.map(review => renderReviewCard(review, false))
                  )}
                </Box>
              )}

              {tab === 1 && (
                <Box>
                  {assignedToMe.length === 0 ? (
                    <Alert severity="info">No reviews assigned to you</Alert>
                  ) : (
                    assignedToMe.map(review => renderReviewCard(review, true))
                  )}
                </Box>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Request Review Dialog */}
      <Dialog open={requestDialogOpen} onClose={() => setRequestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Peer Review</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Select Reviewer</InputLabel>
            <Select
              value={selectedReviewer}
              label="Select Reviewer"
              onChange={(e) => setSelectedReviewer(e.target.value)}
            >
              {radiologists.map((rad) => (
                <MenuItem key={rad._id} value={rad._id}>
                  {rad.firstName} {rad.lastName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={priority}
              label="Priority"
              onChange={(e) => setPriority(e.target.value as any)}
            >
              <MenuItem value="urgent">Urgent</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Notes (Optional)"
            value={requestNotes}
            onChange={(e) => setRequestNotes(e.target.value)}
            placeholder="Add any specific areas you'd like reviewed..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRequestReview} variant="contained" disabled={loading}>
            Send Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Response Dialog */}
      <Dialog open={responseDialogOpen} onClose={() => setResponseDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Respond to Review</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Action</InputLabel>
            <Select
              value={responseAction}
              label="Action"
              onChange={(e) => setResponseAction(e.target.value as any)}
            >
              <MenuItem value="approve">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle color="success" />
                  Approve
                </Box>
              </MenuItem>
              <MenuItem value="changes-requested">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Edit color="warning" />
                  Request Changes
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Comment"
            value={responseComment}
            onChange={(e) => setResponseComment(e.target.value)}
            placeholder="Add your review comments..."
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResponseDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRespondToReview} variant="contained" disabled={loading}>
            Submit Response
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
