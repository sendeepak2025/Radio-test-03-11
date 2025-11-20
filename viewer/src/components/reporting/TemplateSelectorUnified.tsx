/**
 * 📋 TEMPLATE SELECTOR
 * Fetches templates, suggests best match, creates draft on selection
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  InputAdornment
} from '@mui/material';
import {
  Search as SearchIcon,
  ArrowBack as BackIcon,
  AutoAwesome as SuggestIcon
} from '@mui/icons-material';
import { reportsApi } from '../../services/ReportsApi';
import { toast, toastError, telemetryEmit } from '../../utils/reportingUtils';
import type { ReportTemplate } from '../../types/reporting';

interface TemplateSelectorProps {
  studyUID: string;
  patientInfo?: {
    patientID?: string;
    patientName?: string;
    modality?: string;
    studyDescription?: string;
  };
  onTemplateSelect: (templateId: string, reportId: string) => void;
  onBack?: () => void;
}

export const TemplateSelectorUnified: React.FC<TemplateSelectorProps> = ({
  studyUID,
  patientInfo,
  onTemplateSelect,
  onBack
}) => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalityFilter, setModalityFilter] = useState<string>('all');
  const [suggestedTemplate, setSuggestedTemplate] = useState<ReportTemplate | null>(null);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Get primary modality from template (handles both old and new schema)
   */
  const getPrimaryModality = (template: ReportTemplate): string | undefined => {
    // New schema: matchingCriteria.modalities array
    if (template.matchingCriteria?.modalities?.length > 0) {
      return template.matchingCriteria.modalities[0];
    }
    // Legacy schema: single modality field
    return template.modality;
  };

  /**
   * Check if template matches modality (handles array or single value)
   */
  const templateMatchesModality = (template: ReportTemplate, modality: string): boolean => {
    if (template.matchingCriteria?.modalities) {
      return template.matchingCriteria.modalities.includes(modality);
    }
    return template.modality === modality;
  };

  /**
   * Get template ID (handles both old and new schema)
   */
  const getTemplateId = (template: ReportTemplate): string => {
    return template.templateId || template.id || template._id || 'unknown';
  };

  /**
   * Initialize sections from template structure
   */
  const initializeSectionsFromTemplate = (template: ReportTemplate): Record<string, string> => {
    const sections: Record<string, string> = {};
    
    console.log('🔧 Initializing sections from template:', template.name);
    console.log('   Template sections:', template.sections);
    
    if (!template.sections || !Array.isArray(template.sections)) {
      console.warn('⚠️ Template has no sections array');
      return sections;
    }
    
    // Sort sections by order
    const sortedSections = [...template.sections].sort((a, b) => 
      (a.order || 0) - (b.order || 0)
    );
    
    console.log('   Sorted sections:', sortedSections.length);
    
    // Initialize each section with placeholder or default content
    sortedSections.forEach(section => {
      const sectionId = section.id;
      const content = section.defaultContent || section.placeholder || '';
      sections[sectionId] = content;
      console.log(`   - ${sectionId}: ${content.substring(0, 50)}...`);
    });
    
    console.log('✅ Initialized sections:', Object.keys(sections));
    return sections;
  };

  // ============================================================================
  // LOAD TEMPLATES
  // ============================================================================

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📋 Loading templates from /api/reports/templates...');
      
      try {
        const response = await reportsApi.getTemplates();
        
        console.log('✅ Templates loaded:', response.templates?.length || 0);
        
        if (response.templates && response.templates.length > 0) {
          setTemplates(response.templates);
          
          // Auto-suggest template if we have modality
          if (patientInfo?.modality) {
            suggestBestTemplate();
          }
          
          telemetryEmit('reporting.templates.loaded', { count: response.templates.length });
          return;
        }
      } catch (apiErr) {
        console.warn('⚠️ API failed:', apiErr);
        setError('Failed to load templates from API');
        setTemplates([]);
      }

      // No fallback templates - real backend required
      console.log('📋 No templates loaded. Please ensure backend is running.');
      
    } catch (err: any) {
      console.error('❌ Error loading templates:', err);
      setError('Failed to load templates');
      toastError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // ✅ TEMPLATE FIX: Helper to parse body part from study description
  const parseBodyPart = (studyDescription?: string): string | undefined => {
    if (!studyDescription) return undefined;
    
    const desc = studyDescription.toLowerCase();
    
    // Map common terms to body parts
    if (desc.includes('head') || desc.includes('brain') || desc.includes('skull')) return 'Head/Brain';
    if (desc.includes('chest') || desc.includes('thorax') || desc.includes('lung')) return 'Chest';
    if (desc.includes('abdomen') || desc.includes('pelvis') || desc.includes('abdominal')) return 'Abdomen/Pelvis';
    if (desc.includes('spine') || desc.includes('cervical') || desc.includes('lumbar')) return 'Spine';
    if (desc.includes('extremity') || desc.includes('arm') || desc.includes('leg')) return 'Extremity';
    if (desc.includes('cardiac') || desc.includes('heart')) return 'Cardiac';
    
    return undefined;
  };

  // ✅ TEMPLATE FIX: Deterministic scoring function
  const scoreTemplate = (
    tpl: ReportTemplate,
    context: {
      modality?: string;
      bodyPart?: string;
      studyDescription?: string;
      aiDetections?: any[];
    }
  ): number => {
    let score = 0;
    
    // +5 exact modality match
    if (context.modality && templateMatchesModality(tpl, context.modality)) {
      score += 5;
    }
    
    // -3 if modality mismatches
    if (context.modality && !templateMatchesModality(tpl, context.modality)) {
      score -= 3;
    }
    
    // +3 bodyPart match
    if (context.bodyPart && tpl.category?.includes(context.bodyPart)) {
      score += 3;
    }
    
    // +2 if template keywords appear in studyDescription
    if (context.studyDescription && tpl.name) {
      const desc = context.studyDescription.toLowerCase();
      const templateName = tpl.name.toLowerCase();
      const templateDesc = (tpl.description || '').toLowerCase();
      
      if (desc.includes(templateName) || templateName.includes(desc.split(' ')[0])) {
        score += 2;
      }
      
      if (templateDesc && desc.includes(templateDesc)) {
        score += 1;
      }
    }
    
    // +2 if AI detections align with template taxonomy
    if (context.aiDetections && context.aiDetections.length > 0) {
      const detectionTypes = context.aiDetections.map(d => d.type?.toLowerCase() || '');
      const templateName = tpl.name.toLowerCase();
      
      // Check for alignment
      if (detectionTypes.some(type => 
        type.includes('lung') || type.includes('nodule') || type.includes('pneumonia')
      ) && templateName.includes('chest')) {
        score += 2;
      }
      
      if (detectionTypes.some(type => 
        type.includes('brain') || type.includes('hemorrhage') || type.includes('stroke')
      ) && templateName.includes('head')) {
        score += 2;
      }
    }
    
    return score;
  };

  const suggestBestTemplate = async () => {
    try {
      // ✅ TEMPLATE FIX: Parse body part from study description
      const bodyPart = parseBodyPart(patientInfo?.studyDescription);
      
      // ✅ TEMPLATE FIX: Score all templates deterministically
      const scoredTemplates = templates.map(tpl => ({
        template: tpl,
        score: scoreTemplate(tpl, {
          modality: patientInfo?.modality,
          bodyPart,
          studyDescription: patientInfo?.studyDescription,
          aiDetections: [] // Will be populated if AI data available
        })
      }));
      
      // ✅ TEMPLATE FIX: Sort by best score
      scoredTemplates.sort((a, b) => b.score - a.score);
      
      // ✅ TEMPLATE FIX: Only suggest if score is positive
      if (scoredTemplates.length > 0 && scoredTemplates[0].score > 0) {
        setSuggestedTemplate(scoredTemplates[0].template);
        telemetryEmit('reporting.template.suggested', {
          templateId: scoredTemplates[0].template.id,
          matchScore: scoredTemplates[0].score
        });
      }
    } catch (err) {
      console.error('❌ Error suggesting template:', err);
      // Non-critical, don't show error to user
    }
  };

  // ============================================================================
  // CREATE DRAFT
  // ============================================================================

  // ✅ TEMPLATE FIX: Handle template selection with definitive state
  const handleTemplateClick = async (template: ReportTemplate) => {
    try {
      const templateId = getTemplateId(template);
      setCreating(templateId);
      setError(null);

      console.log('📝 Creating draft with template:', templateId);
      console.log('   Template Name:', template.name);
      console.log('   Study UID:', studyUID);
      console.log('   Patient Info:', patientInfo);

      // ✅ TEMPLATE FIX: Initialize sections from template structure
      const initialSections = initializeSectionsFromTemplate(template);
      console.log('   Initialized sections:', Object.keys(initialSections));
      console.log('   Section details:', initialSections);
      
      const reportData = {
        studyInstanceUID: studyUID,
        patientID: patientInfo?.patientID || 'Unknown',
        patientName: patientInfo?.patientName,
        modality: patientInfo?.modality,
        templateId: templateId,
        templateName: template.name,
        sections: initialSections, // ✅ TEMPLATE FIX: Pre-filled sections
        findings: [],
        measurements: [],
        annotations: [],
        keyImages: [],
        reportStatus: 'draft',
        version: 1,
        creationMode: 'manual'
      };
      
      console.log('📤 Sending report data:', reportData);
      
      const response = await reportsApi.upsert(reportData);

      const createdReport = response.report || response.data;
      
      if (!createdReport || !createdReport.reportId) {
        throw new Error('Failed to create draft report - no reportId returned');
      }

      console.log('✅ Draft created successfully:', createdReport.reportId);
      toast('Draft report created');

      telemetryEmit('reporting.draft.created', {
        reportId: createdReport.reportId,
        templateId: templateId
      });

      // Navigate with templateId in URL
      onTemplateSelect(templateId, createdReport.reportId);

    } catch (err: any) {
      console.error('❌ Error creating draft:', err);
      console.error('   URL: POST /api/reports');
      console.error('   Status:', err.response?.status);
      console.error('   Response:', err.response?.data);
      console.error('   Message:', err.message);
      console.error('   Stack:', err.stack);
      
      const errorMsg = err.message || 'Failed to create draft report';
      setError(`${errorMsg} — Check console for details`);
      toastError('Failed to create draft report');
    } finally {
      setCreating(null);
    }
  };

  // ============================================================================
  // FILTERING
  // ============================================================================

  const filteredTemplates = templates.filter(template => {
    // Modality filter
    if (modalityFilter !== 'all' && !templateMatchesModality(template, modalityFilter)) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        template.name.toLowerCase().includes(query) ||
        template.category?.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Get unique modalities for filter
  const modalities = ['all', ...Array.from(new Set(
    templates.flatMap(t => 
      t.matchingCriteria?.modalities || (t.modality ? [t.modality] : [])
    )
  ))].filter(Boolean);

  // ============================================================================
  // RENDER
  // ============================================================================

  // F) Loading spinner with message
  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px" gap={2}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading templates...
        </Typography>
      </Box>
    );
  }

  // E) Fail-safe: Show error prominently if no templates
  if (!loading && templates.length === 0 && !error) {
    return (
      <Box sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5">Select Report Template</Typography>
          {onBack && (
            <Button startIcon={<BackIcon />} onClick={onBack}>
              Back
            </Button>
          )}
        </Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            ❌ No templates available
          </Typography>
          <Typography variant="body2">
            Check backend connection or permissions. Templates should be available at:
            <code style={{ display: 'block', marginTop: 8 }}>
              GET /api/reports/templates
            </code>
          </Typography>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={loadTemplates}
            sx={{ mt: 2 }}
          >
            Retry
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Select Report Template</Typography>
        {onBack && (
          <Button startIcon={<BackIcon />} onClick={onBack}>
            Back
          </Button>
        )}
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
          <Button 
            variant="outlined" 
            size="small" 
            onClick={loadTemplates}
            sx={{ mt: 1 }}
          >
            Retry
          </Button>
        </Alert>
      )}

      {/* Suggested Template */}
      {suggestedTemplate && (
        <Alert
          severity="info"
          icon={<SuggestIcon />}
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => handleTemplateClick(suggestedTemplate)}
              disabled={creating === suggestedTemplate.id}
            >
              {creating === suggestedTemplate.id ? 'Creating...' : 'Use This'}
            </Button>
          }
        >
          <strong>Suggested:</strong> {suggestedTemplate.name} - {suggestedTemplate.description}
        </Alert>
      )}

      {/* Filters */}
      <Box display="flex" gap={2} mb={3}>
        <TextField
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />

        <Box display="flex" gap={1}>
          {modalities.map(modality => (
            <Chip
              key={modality}
              label={modality.toUpperCase()}
              onClick={() => setModalityFilter(modality)}
              color={modalityFilter === modality ? 'primary' : 'default'}
              variant={modalityFilter === modality ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      </Box>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Alert severity="info">
          No templates found. Try adjusting your filters.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {filteredTemplates.map(template => (
            <Grid item xs={12} sm={6} md={4} key={getTemplateId(template)}>
              <Card
                sx={{
                  cursor: creating === getTemplateId(template) ? 'wait' : 'pointer',
                  opacity: creating === getTemplateId(template) ? 0.6 : 1,
                  '&:hover': {
                    boxShadow: 6,
                    transform: creating === getTemplateId(template) ? 'none' : 'translateY(-2px)'
                  },
                  transition: 'all 0.2s'
                }}
                onClick={() => !creating && handleTemplateClick(template)}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                    <Typography variant="h6" component="div">
                      {template.name}
                    </Typography>
                    {getPrimaryModality(template) && (
                      <Chip label={getPrimaryModality(template)} size="small" color="primary" />
                    )}
                  </Box>

                  {template.category && (
                    <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                      {template.category}
                    </Typography>
                  )}

                  {template.description && (
                    <Typography variant="body2" color="text.secondary">
                      {template.description}
                    </Typography>
                  )}

                  {template.sections && (
                    <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                      {template.sections.length} sections
                    </Typography>
                  )}

                  {creating === getTemplateId(template) && (
                    <Box display="flex" alignItems="center" gap={1} mt={2}>
                      <CircularProgress size={16} />
                      <Typography variant="caption">Creating draft...</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default TemplateSelectorUnified;
