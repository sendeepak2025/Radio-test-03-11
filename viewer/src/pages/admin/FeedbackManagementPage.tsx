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
  Chip,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  Rating,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Visibility,
  Check,
  Close,
  BugReport,
  Lightbulb,
  RateReview,
  Feedback as FeedbackIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

interface Feedback {
  _id: string;
  type: 'rating' | 'bug' | 'feature' | 'general';
  rating?: number;
  category: string;
  title: string;
  description: string;
  userName: string;
  userEmail: string;
  status: string;
  priority: string;
  createdAt: string;
  metadata?: any;
  adminNotes?: string;
}

interface FeedbackStats {
  byType: Array<{ _id: string; count: number }>;
  byStatus: Array<{ _id: string; count: number }>;
  byPriority: Array<{ _id: string; count: number }>;
  avgRating: Array<{ avg: number }>;
  recent: Array<any>;
}

const FeedbackManagementPage: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchFeedbacks();
    fetchStats();
  }, [filterType, filterStatus, filterPriority]);

  const fetchFeedbacks = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      if (filterStatus) params.append('status', filterStatus);
      if (filterPriority) params.append('priority', filterPriority);

      const response = await fetch(`/api/feedback/list?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFeedbacks(data.feedbacks);
      }
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/feedback/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const updateFeedbackStatus = async (id: string, status: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/feedback/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, adminNotes })
      });

      if (response.ok) {
        fetchFeedbacks();
        fetchStats();
        setDetailsOpen(false);
        setSelectedFeedback(null);
        setAdminNotes('');
      }
    } catch (error) {
      console.error('Error updating feedback:', error);
    }
  };

  const handleViewDetails = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setAdminNotes(feedback.adminNotes || '');
    setDetailsOpen(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'rating': return <RateReview fontSize="small" />;
      case 'bug': return <BugReport fontSize="small" />;
      case 'feature': return <Lightbulb fontSize="small" />;
      default: return <FeedbackIcon fontSize="small" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'error';
      case 'reviewing': return 'warning';
      case 'planned': return 'info';
      case 'in-progress': return 'primary';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Feedback Management
      </Typography>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Feedback
                </Typography>
                <Typography variant="h4">
                  {feedbacks.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Average Rating
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="h4">
                    {stats.avgRating[0]?.avg?.toFixed(1) || 'N/A'}
                  </Typography>
                  {stats.avgRating[0]?.avg && (
                    <Rating value={stats.avgRating[0].avg} readOnly size="small" />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Open Items
                </Typography>
                <Typography variant="h4">
                  {stats.byStatus.find(s => s._id === 'new')?.count || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Bug Reports
                </Typography>
                <Typography variant="h4">
                  {stats.byType.find(t => t._id === 'bug')?.count || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={filterType}
                label="Type"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="rating">Rating</MenuItem>
                <MenuItem value="bug">Bug</MenuItem>
                <MenuItem value="feature">Feature</MenuItem>
                <MenuItem value="general">General</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="new">New</MenuItem>
                <MenuItem value="reviewing">Reviewing</MenuItem>
                <MenuItem value="planned">Planned</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select
                value={filterPriority}
                label="Priority"
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Feedback Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {feedbacks.map((feedback) => (
              <TableRow key={feedback._id}>
                <TableCell>
                  <Chip
                    icon={getTypeIcon(feedback.type)}
                    label={feedback.type}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title={feedback.description}>
                    <Typography noWrap sx={{ maxWidth: 300 }}>
                      {feedback.title}
                    </Typography>
                  </Tooltip>
                  {feedback.type === 'rating' && feedback.rating && (
                    <Rating value={feedback.rating} readOnly size="small" />
                  )}
                </TableCell>
                <TableCell>{feedback.userName}</TableCell>
                <TableCell>
                  <Chip label={feedback.category} size="small" />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={feedback.priority} 
                    size="small"
                    color={getPriorityColor(feedback.priority) as any}
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={feedback.status} 
                    size="small"
                    color={getStatusColor(feedback.status) as any}
                  />
                </TableCell>
                <TableCell>
                  {format(new Date(feedback.createdAt), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleViewDetails(feedback)}
                  >
                    <Visibility fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedFeedback && (
          <>
            <DialogTitle>
              Feedback Details
            </DialogTitle>
            <DialogContent>
              <Box display="flex" flexDirection="column" gap={2} pt={1}>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Type
                  </Typography>
                  <Chip
                    icon={getTypeIcon(selectedFeedback.type)}
                    label={selectedFeedback.type}
                    size="small"
                  />
                </Box>

                {selectedFeedback.type === 'rating' && selectedFeedback.rating && (
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">
                      Rating
                    </Typography>
                    <Rating value={selectedFeedback.rating} readOnly />
                  </Box>
                )}

                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Title
                  </Typography>
                  <Typography>{selectedFeedback.title}</Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Description
                  </Typography>
                  <Typography whiteSpace="pre-wrap">
                    {selectedFeedback.description}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    User
                  </Typography>
                  <Typography>
                    {selectedFeedback.userName} ({selectedFeedback.userEmail})
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Category
                  </Typography>
                  <Chip label={selectedFeedback.category} size="small" />
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Current Status
                  </Typography>
                  <Chip 
                    label={selectedFeedback.status} 
                    color={getStatusColor(selectedFeedback.status) as any}
                  />
                </Box>

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Admin Notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes..."
                />

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Update Status
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {['new', 'reviewing', 'planned', 'in-progress', 'resolved', 'closed'].map((status) => (
                      <Button
                        key={status}
                        variant={selectedFeedback.status === status ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => updateFeedbackStatus(selectedFeedback._id, status)}
                      >
                        {status}
                      </Button>
                    ))}
                  </Box>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default FeedbackManagementPage;
