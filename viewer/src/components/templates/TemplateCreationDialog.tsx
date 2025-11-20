/**
 * Template Creation Dialog
 * Allows admins to create new report templates from scratch
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
  Stepper,
  Step,
  StepLabel,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  Autocomplete,
  FormControlLabel,
  Checkbox,
  Grid,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator,
  ArrowUpward,
  ArrowDownward
} from '@mui/icons-material';
import type { ReportTemplate } from '../../types/reporting';

interface TemplateCreationDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateTemplate: (template: Partial<ReportTemplate>) => Promise<void>;
}

interface TemplateSection {
  id: string;
  title: string;
  order: number;
  required: boolean;
  defaultContent: string;
  placeholder: string;
}

const TEMPLATE_CATEGORIES = [
  'radiology',
  'cardiology',
  'neurology',
  'orthopedics',
  'general'
];

const COMMON_MODALITIES = [
  'CR', 'DX', 'CT', 'MR', 'MRI', 'US', 'XA', 'RF', 
  'MG', 'DM', 'PT', 'NM', 'OT'
];

const COMMON_BODY_PARTS = [
  'HEAD', 'BRAIN', 'SKULL', 'NECK', 'SPINE', 
  'CHEST', 'THORAX', 'LUNG', 'HEART', 'ABDOMEN', 
  'PELVIS', 'EXTREMITY', 'ARM', 'LEG', 'HAND', 'FOOT'
];

const PROCEDURE_TYPES = [
  'diagnostic', 'interventional', 'screening', 'follow-up'
];

const DEFAULT_SECTIONS: TemplateSection[] = [
  {
    id: 'clinical-indication',
    title: 'Clinical Indication',
    order: 1,
    required: true,
    defaultContent: '',
    placeholder: 'Clinical indication for examination'
  },
  {
    id: 'technique',
    title: 'Technique',
    order: 2,
    required: true,
    defaultContent: '',
    placeholder: 'Technique and parameters used'
  },
  {
    id: 'findings',
    title: 'Findings',
    order: 3,
    required: true,
    defaultContent: '',
    placeholder: 'Detailed findings'
  },
  {
    id: 'impression',
    title: 'Impression',
    order: 4,
    required: true,
    defaultContent: '',
    placeholder: 'Summary and clinical significance'
  }
];

const TemplateCreationDialog: React.FC<TemplateCreationDialogProps> = ({
  open,
  onClose,
  onCreateTemplate
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basic Information
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('radiology');
  const [priority, setPriority] = useState<number>(50);

  // Step 2: Matching Criteria
  const [selectedModalities, setSelectedModalities] = useState<string[]>([]);
  const [selectedBodyParts, setSelectedBodyParts] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [selectedProcedureTypes, setSelectedProcedureTypes] = useState<string[]>(['diagnostic']);

  // Step 3: Sections
  const [sections, setSections] = useState<TemplateSection[]>(DEFAULT_SECTIONS);
  const [newSectionTitle, setNewSectionTitle] = useState('');

  // Step 4: Advanced Settings
  const [aiEnabled, setAiEnabled] = useState(true);
  const [customizable, setCustomizable] = useState(true);

  const steps = ['Basic Info', 'Matching Criteria', 'Sections', 'Review'];

  const handleNext = () => {
    if (activeStep === 0 && !validateBasicInfo()) return;
    if (activeStep === 1 && !validateMatchingCriteria()) return;
    
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const validateBasicInfo = (): boolean => {
    if (!name.trim()) {
      setError('Template name is required');
      return false;
    }
    if (name.length < 3) {
      setError('Template name must be at least 3 characters');
      return false;
    }
    setError(null);
    return true;
  };

  const validateMatchingCriteria = (): boolean => {
    if (selectedModalities.length === 0) {
      setError('At least one modality must be selected');
      return false;
    }
    if (selectedBodyParts.length === 0) {
      setError('At least one body part must be selected');
      return false;
    }
    setError(null);
    return true;
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim().toLowerCase())) {
      setKeywords([...keywords, keywordInput.trim().toLowerCase()]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) return;

    const newSection: TemplateSection = {
      id: newSectionTitle.toLowerCase().replace(/\s+/g, '-'),
      title: newSectionTitle,
      order: sections.length + 1,
      required: false,
      defaultContent: '',
      placeholder: ''
    };

    setSections([...sections, newSection]);
    setNewSectionTitle('');
  };

  const handleRemoveSection = (index: number) => {
    const newSections = sections.filter((_, i) => i !== index);
    // Reorder
    newSections.forEach((section, i) => {
      section.order = i + 1;
    });
    setSections(newSections);
  };

  const handleMoveSectionUp = (index: number) => {
    if (index === 0) return;
    const newSections = [...sections];
    [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
    newSections.forEach((section, i) => {
      section.order = i + 1;
    });
    setSections(newSections);
  };

  const handleMoveSectionDown = (index: number) => {
    if (index === sections.length - 1) return;
    const newSections = [...sections];
    [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    newSections.forEach((section, i) => {
      section.order = i + 1;
    });
    setSections(newSections);
  };

  const handleUpdateSection = (index: number, field: keyof TemplateSection, value: any) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], [field]: value };
    setSections(newSections);
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);

    try {
      const template: Partial<ReportTemplate> = {
        name,
        description,
        category,
        priority,
        matchingCriteria: {
          modalities: selectedModalities,
          bodyParts: selectedBodyParts,
          keywords,
          procedureTypes: selectedProcedureTypes
        },
        matchingWeights: {
          modalityWeight: 50,
          bodyPartWeight: 30,
          keywordWeight: 5,
          procedureTypeWeight: 15
        },
        sections: sections.map(s => ({
          id: s.id,
          title: s.title,
          order: s.order,
          required: s.required,
          defaultContent: s.defaultContent,
          placeholder: s.placeholder
        })),
        aiIntegration: {
          enabled: aiEnabled,
          autoFillFields: [],
          suggestedFindings: []
        },
        customizable,
        active: true,
        version: '1.0'
      };

      await onCreateTemplate(template);
      handleReset();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setName('');
    setDescription('');
    setCategory('radiology');
    setPriority(50);
    setSelectedModalities([]);
    setSelectedBodyParts([]);
    setKeywords([]);
    setSelectedProcedureTypes(['diagnostic']);
    setSections(DEFAULT_SECTIONS);
    setAiEnabled(true);
    setCustomizable(true);
    setError(null);
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Basic Information</Typography>
            <TextField
              fullWidth
              label="Template Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
              required
              helperText="e.g., CT Chest Report, MRI Brain Protocol"
            />
            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              margin="normal"
              multiline
              rows={2}
              helperText="Brief description of when to use this template"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Category</InputLabel>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                label="Category"
              >
                {TEMPLATE_CATEGORIES.map(cat => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Priority"
              type="number"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              margin="normal"
              helperText="Higher priority templates are suggested first (0-100)"
              inputProps={{ min: 0, max: 100 }}
            />
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Matching Criteria</Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Define when this template should be automatically suggested
            </Typography>

            <Autocomplete
              multiple
              options={COMMON_MODALITIES}
              value={selectedModalities}
              onChange={(_, newValue) => setSelectedModalities(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Modalities" margin="normal" required />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip label={option} {...getTagProps({ index })} size="small" />
                ))
              }
            />

            <Autocomplete
              multiple
              freeSolo
              options={COMMON_BODY_PARTS}
              value={selectedBodyParts}
              onChange={(_, newValue) => setSelectedBodyParts(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Body Parts" margin="normal" required />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip label={option} {...getTagProps({ index })} size="small" />
                ))
              }
            />

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Keywords</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  size="small"
                  placeholder="Add keyword"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                />
                <Button onClick={handleAddKeyword} variant="outlined" size="small">
                  Add
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {keywords.map(keyword => (
                  <Chip
                    key={keyword}
                    label={keyword}
                    onDelete={() => handleRemoveKeyword(keyword)}
                    size="small"
                  />
                ))}
              </Box>
            </Box>

            <Autocomplete
              multiple
              options={PROCEDURE_TYPES}
              value={selectedProcedureTypes}
              onChange={(_, newValue) => setSelectedProcedureTypes(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Procedure Types" margin="normal" />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip label={option} {...getTagProps({ index })} size="small" />
                ))
              }
            />
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Template Sections</Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Define the structure of your report template
            </Typography>

            <List>
              {sections.map((section, index) => (
                <ListItem key={section.id} sx={{ border: 1, borderColor: 'divider', mb: 1, borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                    <DragIndicator color="disabled" />
                    <Typography variant="body2" sx={{ minWidth: 30 }}>
                      {section.order}
                    </Typography>
                  </Box>
                  <ListItemText
                    primary={
                      <TextField
                        size="small"
                        value={section.title}
                        onChange={(e) => handleUpdateSection(index, 'title', e.target.value)}
                        sx={{ mb: 1 }}
                      />
                    }
                    secondary={
                      <Box>
                        <TextField
                          size="small"
                          fullWidth
                          placeholder="Placeholder text"
                          value={section.placeholder}
                          onChange={(e) => handleUpdateSection(index, 'placeholder', e.target.value)}
                          sx={{ mb: 1 }}
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={section.required}
                              onChange={(e) => handleUpdateSection(index, 'required', e.target.checked)}
                              size="small"
                            />
                          }
                          label="Required"
                        />
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton size="small" onClick={() => handleMoveSectionUp(index)} disabled={index === 0}>
                      <ArrowUpward fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleMoveSectionDown(index)} disabled={index === sections.length - 1}>
                      <ArrowDownward fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleRemoveSection(index)} disabled={sections.length <= 2}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>

            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <TextField
                size="small"
                placeholder="New section title"
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddSection()}
              />
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddSection}
                disabled={!newSectionTitle.trim()}
              >
                Add Section
              </Button>
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Review & Create</Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Basic Information</Typography>
                <Typography><strong>Name:</strong> {name}</Typography>
                <Typography><strong>Category:</strong> {category}</Typography>
                <Typography><strong>Priority:</strong> {priority}</Typography>
                {description && <Typography><strong>Description:</strong> {description}</Typography>}
              </Grid>

              <Grid item xs={12}>
                <Divider />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Matching Criteria</Typography>
                <Typography><strong>Modalities:</strong> {selectedModalities.join(', ')}</Typography>
                <Typography><strong>Body Parts:</strong> {selectedBodyParts.join(', ')}</Typography>
                {keywords.length > 0 && (
                  <Typography><strong>Keywords:</strong> {keywords.join(', ')}</Typography>
                )}
                <Typography><strong>Procedure Types:</strong> {selectedProcedureTypes.join(', ')}</Typography>
              </Grid>

              <Grid item xs={12}>
                <Divider />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Sections ({sections.length})</Typography>
                <List dense>
                  {sections.map(section => (
                    <ListItem key={section.id}>
                      <ListItemText
                        primary={`${section.order}. ${section.title}${section.required ? ' *' : ''}`}
                        secondary={section.placeholder}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>

              <Grid item xs={12}>
                <Divider />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={<Checkbox checked={aiEnabled} onChange={(e) => setAiEnabled(e.target.checked)} />}
                  label="Enable AI integration"
                />
                <FormControlLabel
                  control={<Checkbox checked={customizable} onChange={(e) => setCustomizable(e.target.checked)} />}
                  label="Allow customization"
                />
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { minHeight: '70vh' } }}
    >
      <DialogTitle>Create New Template</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ pt: 3, pb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 2, mb: 2 }}>
          {renderStepContent(activeStep)}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={loading}>
            Back
          </Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button onClick={handleNext} variant="contained">
            Next
          </Button>
        ) : (
          <Button onClick={handleCreate} variant="contained" disabled={loading}>
            {loading ? 'Creating...' : 'Create Template'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TemplateCreationDialog;
