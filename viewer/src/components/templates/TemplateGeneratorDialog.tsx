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
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  CircularProgress
} from '@mui/material';
import {
  AutoAwesome,
  Check,
  Preview
} from '@mui/icons-material';

interface TemplateGeneratorDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (template: any) => void;
}

const modalities = ['CT', 'MRI', 'X-Ray', 'Ultrasound', 'Mammography'];

const bodyPartsByModality: Record<string, string[]> = {
  'CT': ['Chest', 'Abdomen', 'Head', 'Spine', 'Pelvis', 'Extremities'],
  'MRI': ['Brain', 'Spine', 'Knee', 'Shoulder', 'Abdomen', 'Pelvis'],
  'X-Ray': ['Chest', 'Abdomen', 'Extremities', 'Spine'],
  'Ultrasound': ['Abdomen', 'Pelvis', 'Vascular', 'Obstetric'],
  'Mammography': ['Breast']
};

export default function TemplateGeneratorDialog({
  open,
  onClose,
  onGenerate
}: TemplateGeneratorDialogProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [templateName, setTemplateName] = useState('');
  const [modality, setModality] = useState('');
  const [bodyPart, setBodyPart] = useState('');
  const [includeTechnique, setIncludeTechnique] = useState(true);
  const [includeComparison, setIncludeComparison] = useState(true);
  const [aiEnhanced, setAiEnhanced] = useState(true);
  
  // Preview state
  const [generatedTemplate, setGeneratedTemplate] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any>(null);

  const steps = ['Configure', 'Preview', 'Confirm'];

  const handleNext = async () => {
    if (activeStep === 0) {
      // Validate inputs
      if (!modality || !bodyPart) {
        setError('Please select modality and body part');
        return;
      }
      
      // Generate preview
      await handleGeneratePreview();
    } else if (activeStep === 1) {
      setActiveStep(2);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setError(null);
  };

  const handleGeneratePreview = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/template-marketplace/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          modality,
          bodyPart,
          includeTechnique,
          includeComparison,
          aiEnhanced
        })
      });

      if (!response.ok) throw new Error('Failed to generate template');

      const data = await response.json();
      setGeneratedTemplate(data.template);
      setSuggestions(data.template.suggestions);
      
      if (data.validation?.warnings?.length > 0) {
        console.warn('Template validation warnings:', data.validation.warnings);
      }
      
      setActiveStep(1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/template-marketplace/generate/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: templateName || `${modality} ${bodyPart} Template`,
          modality,
          bodyPart,
          includeTechnique,
          includeComparison,
          aiEnhanced
        })
      });

      if (!response.ok) throw new Error('Failed to save template');

      const data = await response.json();
      onGenerate(data.template);
      handleClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setTemplateName('');
    setModality('');
    setBodyPart('');
    setGeneratedTemplate(null);
    setSuggestions(null);
    setError(null);
    onClose();
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Template Name (Optional)"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder={`${modality} ${bodyPart} Template`}
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Modality</InputLabel>
              <Select
                value={modality}
                label="Modality"
                onChange={(e) => {
                  setModality(e.target.value);
                  setBodyPart('');
                }}
              >
                {modalities.map((m) => (
                  <MenuItem key={m} value={m}>{m}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }} disabled={!modality}>
              <InputLabel>Body Part</InputLabel>
              <Select
                value={bodyPart}
                label="Body Part"
                onChange={(e) => setBodyPart(e.target.value)}
              >
                {modality && bodyPartsByModality[modality]?.map((bp) => (
                  <MenuItem key={bp} value={bp}>{bp}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Checkbox
                  checked={includeTechnique}
                  onChange={(e) => setIncludeTechnique(e.target.checked)}
                />
              }
              label="Include Technique Section"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={includeComparison}
                  onChange={(e) => setIncludeComparison(e.target.checked)}
                />
              }
              label="Include Comparison Section"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={aiEnhanced}
                  onChange={(e) => setAiEnhanced(e.target.checked)}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AutoAwesome fontSize="small" />
                  AI-Enhanced Template
                </Box>
              }
            />
          </Box>
        );

      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            {generatedTemplate && (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Preview of AI-generated template structure. You can customize it after creation.
                  </Typography>
                </Alert>

                <Typography variant="h6" gutterBottom>
                  Sections ({generatedTemplate.sections?.length})
                </Typography>
                
                <List dense>
                  {generatedTemplate.sections?.map((section: any, idx: number) => (
                    <ListItem key={idx}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {section.title}
                            {section.required && (
                              <Chip label="Required" size="small" color="primary" />
                            )}
                          </Box>
                        }
                        secondary={section.placeholder}
                      />
                    </ListItem>
                  ))}
                </List>

                {suggestions && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      AI Suggestions
                    </Typography>
                    
                    {suggestions.commonPhrases?.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Common Phrases:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                          {suggestions.commonPhrases.map((phrase: string, idx: number) => (
                            <Chip key={idx} label={phrase} size="small" />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {suggestions.criticalFindings?.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" color="error">
                          Critical Findings Checklist:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                          {suggestions.criticalFindings.map((finding: string, idx: number) => (
                            <Chip key={idx} label={finding} size="small" color="error" />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}
              </>
            )}
          </Box>
        );

      case 2:
        return (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Check sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Ready to Create Template
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Template Name: <strong>{templateName || `${modality} ${bodyPart} Template`}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sections: <strong>{generatedTemplate?.sections?.length}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              AI-Enhanced: <strong>{aiEnhanced ? 'Yes' : 'No'}</strong>
            </Typography>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesome />
          AI Template Generator
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
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

        {renderStepContent()}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={loading}>
            Back
          </Button>
        )}
        
        {activeStep < steps.length - 1 ? (
          <Button
            onClick={handleNext}
            variant="contained"
            disabled={loading || !modality || !bodyPart}
            startIcon={loading ? <CircularProgress size={20} /> : <Preview />}
          >
            {loading ? 'Generating...' : activeStep === 0 ? 'Generate Preview' : 'Next'}
          </Button>
        ) : (
          <Button
            onClick={handleConfirm}
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <Check />}
          >
            {loading ? 'Creating...' : 'Create Template'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
