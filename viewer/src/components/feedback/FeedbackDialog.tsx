import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Rating,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import {
  BugReport,
  Lightbulb,
  RateReview,
  Feedback as FeedbackIcon
} from '@mui/icons-material';

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`feedback-tabpanel-${index}`}
      aria-labelledby={`feedback-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const FeedbackDialog: React.FC<FeedbackDialogProps> = ({ open, onClose }) => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rating feedback
  const [rating, setRating] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState('');

  // Bug report
  const [bugTitle, setBugTitle] = useState('');
  const [bugDescription, setBugDescription] = useState('');
  const [bugCategory, setBugCategory] = useState('ui');

  // Feature request
  const [featureTitle, setFeatureTitle] = useState('');
  const [featureDescription, setFeatureDescription] = useState('');
  const [featureCategory, setFeatureCategory] = useState('other');

  // General feedback
  const [generalTitle, setGeneralTitle] = useState('');
  const [generalDescription, setGeneralDescription] = useState('');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError(null);
    setSuccess(false);
  };

  const resetForm = () => {
    setRating(0);
    setRatingComment('');
    setBugTitle('');
    setBugDescription('');
    setBugCategory('ui');
    setFeatureTitle('');
    setFeatureDescription('');
    setFeatureCategory('other');
    setGeneralTitle('');
    setGeneralDescription('');
    setSuccess(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    setTabValue(0);
    onClose();
  };

  const getMetadata = () => {
    return {
      browser: navigator.userAgent,
      os: navigator.platform,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      url: window.location.href
    };
  };

  const submitFeedback = async (type: string, data: any) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type,
          ...data,
          metadata: getMetadata()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRatingSubmit = () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    submitFeedback('rating', {
      rating,
      title: `User rating: ${rating} stars`,
      description: ratingComment || 'No additional comments',
      category: 'general'
    });
  };

  const handleBugSubmit = () => {
    if (!bugTitle || !bugDescription) {
      setError('Please fill in all required fields');
      return;
    }
    submitFeedback('bug', {
      title: bugTitle,
      description: bugDescription,
      category: bugCategory
    });
  };

  const handleFeatureSubmit = () => {
    if (!featureTitle || !featureDescription) {
      setError('Please fill in all required fields');
      return;
    }
    submitFeedback('feature', {
      title: featureTitle,
      description: featureDescription,
      category: featureCategory
    });
  };

  const handleGeneralSubmit = () => {
    if (!generalTitle || !generalDescription) {
      setError('Please fill in all required fields');
      return;
    }
    submitFeedback('general', {
      title: generalTitle,
      description: generalDescription,
      category: 'other'
    });
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <FeedbackIcon />
          <Typography variant="h6">Send Feedback</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
          <Tab icon={<RateReview />} label="Rate" />
          <Tab icon={<BugReport />} label="Report Bug" />
          <Tab icon={<Lightbulb />} label="Request Feature" />
          <Tab icon={<FeedbackIcon />} label="General" />
        </Tabs>

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Thank you for your feedback! We appreciate your input.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* Rating Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              How would you rate your experience?
            </Typography>
            <Box display="flex" alignItems="center" gap={2} my={2}>
              <Rating
                value={rating}
                onChange={(event, newValue) => setRating(newValue || 0)}
                size="large"
              />
              {rating > 0 && (
                <Typography variant="body2" color="text.secondary">
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Fair'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'Very Good'}
                  {rating === 5 && 'Excellent'}
                </Typography>
              )}
            </Box>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Additional Comments (Optional)"
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Tell us more about your experience..."
            />
          </Box>
        </TabPanel>

        {/* Bug Report Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box display="flex" flexDirection="column" gap={2}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={bugCategory}
                label="Category"
                onChange={(e) => setBugCategory(e.target.value)}
              >
                <MenuItem value="ui">User Interface</MenuItem>
                <MenuItem value="performance">Performance</MenuItem>
                <MenuItem value="reporting">Reporting</MenuItem>
                <MenuItem value="ai">AI Assistant</MenuItem>
                <MenuItem value="templates">Templates</MenuItem>
                <MenuItem value="analytics">Analytics</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              required
              label="Bug Title"
              value={bugTitle}
              onChange={(e) => setBugTitle(e.target.value)}
              placeholder="Brief description of the issue"
            />

            <TextField
              fullWidth
              required
              multiline
              rows={6}
              label="Bug Description"
              value={bugDescription}
              onChange={(e) => setBugDescription(e.target.value)}
              placeholder="Please describe the bug in detail:&#10;- What were you trying to do?&#10;- What happened?&#10;- What did you expect to happen?&#10;- Steps to reproduce"
            />
          </Box>
        </TabPanel>

        {/* Feature Request Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box display="flex" flexDirection="column" gap={2}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={featureCategory}
                label="Category"
                onChange={(e) => setFeatureCategory(e.target.value)}
              >
                <MenuItem value="ui">User Interface</MenuItem>
                <MenuItem value="performance">Performance</MenuItem>
                <MenuItem value="reporting">Reporting</MenuItem>
                <MenuItem value="ai">AI Assistant</MenuItem>
                <MenuItem value="templates">Templates</MenuItem>
                <MenuItem value="analytics">Analytics</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              required
              label="Feature Title"
              value={featureTitle}
              onChange={(e) => setFeatureTitle(e.target.value)}
              placeholder="Brief description of the feature"
            />

            <TextField
              fullWidth
              required
              multiline
              rows={6}
              label="Feature Description"
              value={featureDescription}
              onChange={(e) => setFeatureDescription(e.target.value)}
              placeholder="Please describe the feature:&#10;- What problem would it solve?&#10;- How would you use it?&#10;- Any examples or references?"
            />
          </Box>
        </TabPanel>

        {/* General Feedback Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              fullWidth
              required
              label="Subject"
              value={generalTitle}
              onChange={(e) => setGeneralTitle(e.target.value)}
              placeholder="Brief subject of your feedback"
            />

            <TextField
              fullWidth
              required
              multiline
              rows={6}
              label="Feedback"
              value={generalDescription}
              onChange={(e) => setGeneralDescription(e.target.value)}
              placeholder="Share your thoughts, suggestions, or comments..."
            />
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            if (tabValue === 0) handleRatingSubmit();
            else if (tabValue === 1) handleBugSubmit();
            else if (tabValue === 2) handleFeatureSubmit();
            else handleGeneralSubmit();
          }}
          disabled={loading || success}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FeedbackDialog;
