/**
 * Follow-up Creation Dialog
 * Allows users to manually create follow-up recommendations
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Alert,
  Autocomplete,
  RadioGroup,
  FormControlLabel,
  Radio,
  Grid
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface FollowUpCreationDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateFollowUp: (followUp: any) => Promise<void>;
  reportId?: string;
  patientId?: string;
}

const FOLLOW_UP_TYPES = [
  { value: 'imaging', label: 'Imaging Follow-up' },
  { value: 'lab', label: 'Laboratory Tests' },
  { value: 'specialist', label: 'Specialist Consultation' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'other', label: 'Other' }
];

const PRIORITY_LEVELS = [
  { value: 'urgent', label: 'Urgent (24-48 hours)', color: 'error' },
  { value: 'high', label: 'High (1 week)', color: 'warning' },
  { value: 'medium', label: 'Medium (1 month)', color: 'info' },
  { value: 'low', label: 'Low (3-6 months)', color: 'success' }
];

const MODALITY_OPTIONS = [
  'CT', 'MRI', 'Ultrasound', 'X-Ray', 'PET', 'Nuclear Medicine', 
  'Mammography', 'Fluoroscopy', 'Other'
];

const FollowUpCreationDialog: React.FC<FollowUpCreationDialogProps> = ({
  open,
  onClose,
  onCreateFollowUp,
  reportId,
  patientId
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [followUpType, setFollowUpType] = useState('imaging');
  const [priority, setPriority] = useState('medium');
  const [recommendedDate, setRecommendedDate] = useState<Date | null>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  );
  const [modality, setModality] = useState('');
  const [bodyPart, setBodyPart] = useState('');
  const [indication, setIndication] = useState('');
  const [notes, setNotes] = useState('');
  const [specialistType, setSpecialistType] = useState('');

  const handleSubmit = async () => {
    // Validation
    if (!indication.trim()) {
      setError('Indication/reason is required');
      return;
    }

    if (followUpType === 'imaging' && !modality) {
      setError('Modality is required for imaging follow-ups');
      return;
    }

    if (followUpType === 'specialist' && !specialistType.trim()) {
      setError('Specialist type is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const followUpData = {
        reportId,
        patientId,
        type: followUpType,
        priority,
        recommendedDate: recommendedDate?.toISOString(),
        modality: followUpType === 'imaging' ? modality : undefined,
        bodyPart: followUpType === 'imaging' ? bodyPart : undefined,
        indication,
        notes,
        specialistType: followUpType === 'specialist' ? specialistType : undefined,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await onCreateFollowUp(followUpData);
      handleReset();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create follow-up');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFollowUpType('imaging');
    setPriority('medium');
    setRecommendedDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    setModality('');
    setBodyPart('');
    setIndication('');
    setNotes('');
    setSpecialistType('');
    setError(null);
  };

  const renderTypeSpecificFields = () => {
    switch (followUpType) {
      case 'imaging':
        return (
          <>
            <Autocomplete
              options={MODALITY_OPTIONS}
              value={modality}
              onChange={(_, newValue) => setModality(newValue || '')}
              freeSolo
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Modality"
                  required
                  helperText="Select or type imaging modality"
                />
              )}
            />
            <TextField
              fullWidth
              label="Body Part/Region"
              value={bodyPart}
              onChange={(e) => setBodyPart(e.target.value)}
              margin="normal"
              placeholder="e.g., Chest, Abdomen, Brain"
            />
          </>
        );

      case 'specialist':
        return (
          <TextField
            fullWidth
            label="Specialist Type"
            value={specialistType}
            onChange={(e) => setSpecialistType(e.target.value)}
            margin="normal"
            required
            placeholder="e.g., Cardiologist, Pulmonologist, Oncologist"
          />
        );

      case 'lab':
        return (
          <TextField
            fullWidth
            label="Lab Tests Recommended"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            margin="normal"
            multiline
            rows={2}
            placeholder="e.g., CBC, Liver function tests, Tumor markers"
          />
        );

      case 'procedure':
        return (
          <TextField
            fullWidth
            label="Procedure Details"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            margin="normal"
            multiline
            rows={2}
            placeholder="e.g., Biopsy, Bronchoscopy"
          />
        );

      default:
        return null;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Create Follow-up Recommendation</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Follow-up Type</InputLabel>
              <Select
                value={followUpType}
                onChange={(e) => setFollowUpType(e.target.value)}
                label="Follow-up Type"
              >
                {FOLLOW_UP_TYPES.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl component="fieldset" margin="normal" fullWidth>
              <Typography variant="subtitle2" gutterBottom>Priority</Typography>
              <RadioGroup
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {PRIORITY_LEVELS.map(level => (
                  <FormControlLabel
                    key={level.value}
                    value={level.value}
                    control={<Radio />}
                    label={level.label}
                  />
                ))}
              </RadioGroup>
            </FormControl>

            <DatePicker
              label="Recommended Date"
              value={recommendedDate}
              onChange={(newValue) => setRecommendedDate(newValue)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  margin: 'normal'
                }
              }}
            />

            {renderTypeSpecificFields()}

            <TextField
              fullWidth
              label="Indication/Reason"
              value={indication}
              onChange={(e) => setIndication(e.target.value)}
              margin="normal"
              required
              multiline
              rows={3}
              placeholder="Why is this follow-up recommended?"
              helperText="Describe the finding or concern that requires follow-up"
            />

            {followUpType !== 'lab' && followUpType !== 'procedure' && (
              <TextField
                fullWidth
                label="Additional Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                margin="normal"
                multiline
                rows={2}
                placeholder="Any additional instructions or context"
              />
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {loading ? 'Creating...' : 'Create Follow-up'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default FollowUpCreationDialog;
