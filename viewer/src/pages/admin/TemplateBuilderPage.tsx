/**
 * Template Builder Page
 * Allows users to create custom report templates with drag-and-drop UI
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  ArrowBack as BackIcon,
  ArrowForward as ForwardIcon,
  DragIndicator as DragIcon,
  ContentCopy as DuplicateIcon,
  ExpandMore as ExpandMoreIcon,
  Calculate as CalculatorIcon,
  Checklist as ChecklistIcon,
  Straighten as MeasurementIcon,
  Draw as DiagramIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const steps = ['Basic Information', 'Matching Criteria', 'UI Modules', 'Report Sections', 'Review & Save'];

const TemplateBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [presets, setPresets] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<any>({});

  // Template data
  const [templateData, setTemplateData] = useState({
    templateId: '',
    name: '',
    description: '',
    category: 'custom',
    matchingCriteria: {
      modalities: [] as string[],
      bodyParts: [] as string[],
      keywords: [] as string[],
      procedureTypes: [] as string[]
    },
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 40,
      keywordWeight: 5,
      procedureTypeWeight: 5
    },
    uiModules: [] as any[],
    sections: [] as any[],
    isActive: true
  });

  // Dialogs
  const [moduleDialog, setModuleDialog] = useState({ open: false, type: '', editing: null as any });
  const [sectionDialog, setSectionDialog] = useState({ open: false, editing: null as any });

  // Load presets
  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      const response = await axios.get('/api/templates/builder/presets');
      setPresets(response.data.data);
      // Initialize with default sections
      setTemplateData(prev => ({
        ...prev,
        sections: response.data.data.sections || []
      }));
    } catch (error) {
      console.error('Error loading presets:', error);
    }
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: any = {};

    if (step === 0) {
      // Basic Information
      if (!templateData.templateId) newErrors.templateId = 'Template ID is required';
      if (!templateData.name) newErrors.name = 'Template name is required';
      if (!/^[A-Z0-9-]+$/.test(templateData.templateId)) {
        newErrors.templateId = 'Template ID must be uppercase alphanumeric with hyphens only';
      }
    } else if (step === 1) {
      // Matching Criteria
      if (templateData.matchingCriteria.modalities.length === 0) {
        newErrors.modalities = 'At least one modality is required';
      }
    } else if (step === 3) {
      // Report Sections
      if (templateData.sections.length === 0) {
        newErrors.sections = 'At least one report section is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveTemplate = async () => {
    if (!validateStep(activeStep)) return;

    setSaving(true);
    try {
      const response = await axios.post('/api/templates/builder/create', templateData);
      alert('Template created successfully!');
      navigate('/admin/templates');
    } catch (error: any) {
      console.error('Error saving template:', error);
      alert(error.response?.data?.error || 'Error saving template');
    } finally {
      setSaving(false);
    }
  };

  const addModule = (type: string, preset: any) => {
    const newModule = {
      id: `${type}_${Date.now()}`,
      type: type,
      title: preset.name,
      order: templateData.uiModules.length + 1,
      required: false,
      config: { ...preset.config }
    };

    setTemplateData(prev => ({
      ...prev,
      uiModules: [...prev.uiModules, newModule]
    }));
    setModuleDialog({ open: false, type: '', editing: null });
  };

  const deleteModule = (index: number) => {
    setTemplateData(prev => ({
      ...prev,
      uiModules: prev.uiModules.filter((_, i) => i !== index)
    }));
  };

  const addSection = (section: any) => {
    const newSection = {
      id: section.id || `section_${Date.now()}`,
      title: section.title,
      order: templateData.sections.length + 1,
      required: section.required || false,
      content: section.content || ''
    };

    setTemplateData(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
    setSectionDialog({ open: false, editing: null });
  };

  const deleteSection = (index: number) => {
    setTemplateData(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }));
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderBasicInfo();
      case 1:
        return renderMatchingCriteria();
      case 2:
        return renderUIModules();
      case 3:
        return renderSections();
      case 4:
        return renderReview();
      default:
        return null;
    }
  };

  const renderBasicInfo = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Basic Template Information</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Template ID"
            placeholder="e.g., CUSTOM-CHEST-CT-01"
            value={templateData.templateId}
            onChange={(e) => setTemplateData({ ...templateData, templateId: e.target.value.toUpperCase() })}
            error={!!errors.templateId}
            helperText={errors.templateId || 'Uppercase alphanumeric with hyphens'}
            required
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Template Name"
            placeholder="e.g., Custom Chest CT Report"
            value={templateData.name}
            onChange={(e) => setTemplateData({ ...templateData, name: e.target.value })}
            error={!!errors.name}
            helperText={errors.name}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description"
            placeholder="Describe this template and when to use it"
            value={templateData.description}
            onChange={(e) => setTemplateData({ ...templateData, description: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={templateData.category}
              label="Category"
              onChange={(e) => setTemplateData({ ...templateData, category: e.target.value })}
            >
              <MenuItem value="custom">Custom</MenuItem>
              <MenuItem value="radiology">Radiology</MenuItem>
              <MenuItem value="cardiology">Cardiology</MenuItem>
              <MenuItem value="oncology">Oncology</MenuItem>
              <MenuItem value="neurology">Neurology</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Checkbox
                checked={templateData.isActive}
                onChange={(e) => setTemplateData({ ...templateData, isActive: e.target.checked })}
              />
            }
            label="Active (available for use)"
          />
        </Grid>
      </Grid>
    </Box>
  );

  const renderMatchingCriteria = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Matching Criteria</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Define when this template should be automatically suggested
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControl fullWidth error={!!errors.modalities}>
            <InputLabel>Modalities *</InputLabel>
            <Select
              multiple
              value={templateData.matchingCriteria.modalities}
              label="Modalities *"
              onChange={(e) => setTemplateData({
                ...templateData,
                matchingCriteria: { ...templateData.matchingCriteria, modalities: e.target.value as string[] }
              })}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {presets?.modalities.map((mod: string) => (
                <MenuItem key={mod} value={mod}>{mod}</MenuItem>
              ))}
            </Select>
            {errors.modalities && <Typography variant="caption" color="error">{errors.modalities}</Typography>}
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Body Parts</InputLabel>
            <Select
              multiple
              value={templateData.matchingCriteria.bodyParts}
              label="Body Parts"
              onChange={(e) => setTemplateData({
                ...templateData,
                matchingCriteria: { ...templateData.matchingCriteria, bodyParts: e.target.value as string[] }
              })}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {presets?.bodyParts.map((bp: string) => (
                <MenuItem key={bp} value={bp}>{bp}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Procedure Types</InputLabel>
            <Select
              multiple
              value={templateData.matchingCriteria.procedureTypes}
              label="Procedure Types"
              onChange={(e) => setTemplateData({
                ...templateData,
                matchingCriteria: { ...templateData.matchingCriteria, procedureTypes: e.target.value as string[] }
              })}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {presets?.procedureTypes.map((pt: string) => (
                <MenuItem key={pt} value={pt}>{pt}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Keywords (comma separated)"
            placeholder="e.g., nodule, mass, lesion"
            value={templateData.matchingCriteria.keywords.join(', ')}
            onChange={(e) => setTemplateData({
              ...templateData,
              matchingCriteria: {
                ...templateData.matchingCriteria,
                keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
              }
            })}
            helperText="Add keywords to improve template matching"
          />
        </Grid>
      </Grid>
    </Box>
  );

  const renderUIModules = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h6">UI Modules</Typography>
          <Typography variant="body2" color="text.secondary">
            Add specialized tools for data entry and calculations
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setModuleDialog({ open: true, type: '', editing: null })}
        >
          Add Module
        </Button>
      </Box>

      {templateData.uiModules.length === 0 ? (
        <Alert severity="info">No modules added yet. Click "Add Module" to get started.</Alert>
      ) : (
        <Stack spacing={2}>
          {templateData.uiModules.map((module, index) => (
            <Card key={module.id} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <DragIcon color="action" />
                  {module.type === 'calculator' && <CalculatorIcon color="primary" />}
                  {module.type === 'measurements' && <MeasurementIcon color="primary" />}
                  {module.type === 'checklist' && <ChecklistIcon color="primary" />}
                  {module.type === 'diagram' && <DiagramIcon color="primary" />}
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {module.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Type: {module.type} • Order: {module.order} • {module.required ? 'Required' : 'Optional'}
                    </Typography>
                  </Box>
                  <IconButton onClick={() => deleteModule(index)} color="error" size="small">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Module Selection Dialog */}
      <Dialog
        open={moduleDialog.open}
        onClose={() => setModuleDialog({ open: false, type: '', editing: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add UI Module</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Calculator Modules */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" gutterBottom>Calculator Modules</Typography>
            </Grid>
            {presets?.modules.calculator.map((preset: any) => (
              <Grid item xs={12} sm={6} key={preset.id}>
                <Card variant="outlined" sx={{ cursor: 'pointer' }} onClick={() => addModule('calculator', preset)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <CalculatorIcon color="primary" />
                      <Typography variant="subtitle2">{preset.name}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">{preset.description}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}

            {/* Measurement Modules */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>Measurement Modules</Typography>
            </Grid>
            {presets?.modules.measurements.map((preset: any) => (
              <Grid item xs={12} sm={6} key={preset.id}>
                <Card variant="outlined" sx={{ cursor: 'pointer' }} onClick={() => addModule('measurements', preset)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <MeasurementIcon color="primary" />
                      <Typography variant="subtitle2">{preset.name}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">{preset.description}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}

            {/* Checklist Modules */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>Checklist Modules</Typography>
            </Grid>
            {presets?.modules.checklist.map((preset: any) => (
              <Grid item xs={12} sm={6} key={preset.id}>
                <Card variant="outlined" sx={{ cursor: 'pointer' }} onClick={() => addModule('checklist', preset)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <ChecklistIcon color="primary" />
                      <Typography variant="subtitle2">{preset.name}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">{preset.description}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}

            {/* Diagram Modules */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>Diagram Modules</Typography>
            </Grid>
            {presets?.modules.diagram.map((preset: any) => (
              <Grid item xs={12} sm={6} key={preset.id}>
                <Card variant="outlined" sx={{ cursor: 'pointer' }} onClick={() => addModule('diagram', preset)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <DiagramIcon color="primary" />
                      <Typography variant="subtitle2">{preset.name}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">{preset.description}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModuleDialog({ open: false, type: '', editing: null })}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  const renderSections = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h6">Report Sections</Typography>
          <Typography variant="body2" color="text.secondary">
            Define the structure of your report
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setSectionDialog({ open: true, editing: null })}
        >
          Add Section
        </Button>
      </Box>

      {templateData.sections.length === 0 ? (
        <Alert severity="warning">No sections defined. Add at least one section to continue.</Alert>
      ) : (
        <List>
          {templateData.sections.map((section, index) => (
            <React.Fragment key={section.id}>
              <ListItem>
                <ListItemText
                  primary={section.title}
                  secondary={`Order: ${section.order} • ${section.required ? 'Required' : 'Optional'}`}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => deleteSection(index)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
              {index < templateData.sections.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Section Dialog */}
      <Dialog open={sectionDialog.open} onClose={() => setSectionDialog({ open: false, editing: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Add Custom Section</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Section Title"
            placeholder="e.g., Additional Findings"
            sx={{ mt: 2, mb: 2 }}
            onChange={(e) => setSectionDialog(prev => ({ ...prev, editing: { ...prev.editing, title: e.target.value, id: e.target.value.toLowerCase().replace(/\s+/g, '_') } }))}
          />
          <FormControlLabel
            control={<Checkbox onChange={(e) => setSectionDialog(prev => ({ ...prev, editing: { ...prev.editing, required: e.target.checked } }))} />}
            label="Required section"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSectionDialog({ open: false, editing: null })}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (sectionDialog.editing?.title) {
                addSection(sectionDialog.editing);
              }
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  const renderReview = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Review Template</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review your template before saving
      </Typography>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Basic Information</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={6}><Typography variant="body2" color="text.secondary">Template ID:</Typography></Grid>
            <Grid item xs={6}><Typography variant="body2">{templateData.templateId}</Typography></Grid>
            <Grid item xs={6}><Typography variant="body2" color="text.secondary">Name:</Typography></Grid>
            <Grid item xs={6}><Typography variant="body2">{templateData.name}</Typography></Grid>
            <Grid item xs={6}><Typography variant="body2" color="text.secondary">Category:</Typography></Grid>
            <Grid item xs={6}><Typography variant="body2">{templateData.category}</Typography></Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Matching Criteria</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2"><strong>Modalities:</strong> {templateData.matchingCriteria.modalities.join(', ') || 'None'}</Typography>
            <Typography variant="body2"><strong>Body Parts:</strong> {templateData.matchingCriteria.bodyParts.join(', ') || 'None'}</Typography>
            <Typography variant="body2"><strong>Procedure Types:</strong> {templateData.matchingCriteria.procedureTypes.join(', ') || 'None'}</Typography>
            <Typography variant="body2"><strong>Keywords:</strong> {templateData.matchingCriteria.keywords.join(', ') || 'None'}</Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">UI Modules ({templateData.uiModules.length})</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List dense>
            {templateData.uiModules.map((module) => (
              <ListItem key={module.id}>
                <ListItemText primary={module.title} secondary={`Type: ${module.type}`} />
              </ListItem>
            ))}
            {templateData.uiModules.length === 0 && <Typography variant="body2" color="text.secondary">No modules</Typography>}
          </List>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Report Sections ({templateData.sections.length})</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List dense>
            {templateData.sections.map((section) => (
              <ListItem key={section.id}>
                <ListItemText primary={section.title} secondary={section.required ? 'Required' : 'Optional'} />
              </ListItem>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>Template Builder</Typography>
        <Typography variant="body1" color="text.secondary">
          Create custom report templates tailored to your workflow
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ minHeight: 400 }}>
          {renderStepContent(activeStep)}
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            startIcon={<BackIcon />}
            onClick={handleBack}
            disabled={activeStep === 0}
          >
            Back
          </Button>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/admin/templates')}>
              Cancel
            </Button>
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveTemplate}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Template'}
              </Button>
            ) : (
              <Button
                variant="contained"
                endIcon={<ForwardIcon />}
                onClick={handleNext}
              >
                Next
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default TemplateBuilderPage;
