/**
 * AI Assistant Panel - Enhanced
 * Google Gemini Pro integration for intelligent report assistance
 * 
 * Features:
 * - Findings analysis with suggestions
 * - Auto-generate impression
 * - Critical finding detection
 * - Confidence scores
 * - Loading states and error handling
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Collapse,
  Tooltip,
  LinearProgress,
  Badge,
  Stack,
  AlertTitle,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Psychology as AnalyzeIcon,
  LightbulbOutlined as SuggestionIcon,
  WarningAmber as CriticalIcon,
  CheckCircle as CheckIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  SmartToy as RobotIcon,
  TrendingUp as ConfidenceIcon,
} from '@mui/icons-material';
import ApiService from '../../../services/ApiService';

interface AIAssistantPanelProps {
  reportId: string;
  findingsText?: string;
  impression?: string;
  onApplySuggestion?: (field: string, value: string) => void;
  onApplyImpression?: (impression: string) => void;
}

interface FindingSuggestion {
  text: string;
  type: 'terminology' | 'detail' | 'location' | 'measurement';
}

interface CriticalFinding {
  finding: string;
  severity: number;
  location: string;
  requiresImmediate: boolean;
}

interface AIAnalysisResult {
  findingsAnalysis?: {
    suggestions: string[];
    improvements: string[];
    detectedFindings: Array<{
      name: string;
      location: string;
      severity: string;
    }>;
    confidence: number;
  };
  impressionSuggestion?: {
    impression: string;
    confidence: number;
    alternatives: string[];
  };
  criticalFindings?: {
    criticalFindings: CriticalFinding[];
    hasCritical: boolean;
    requiresNotification: boolean;
    highestSeverity: number;
  };
}

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  reportId,
  findingsText,
  impression,
  onApplySuggestion,
  onApplyImpression,
}) => {
  const [aiAvailable, setAiAvailable] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    suggestions: true,
    impression: true,
    critical: true,
  });
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

  // Check AI service health on mount
  useEffect(() => {
    checkAIHealth();
  }, []);

  const checkAIHealth = async () => {
    setCheckingHealth(true);
    try {
      const result = await ApiService.checkAIHealth();
      setAiAvailable(result.available);
      if (!result.available) {
        setError(result.message || 'AI service not available. Please configure GEMINI_API_KEY.');
      }
    } catch (err: any) {
      console.error('AI health check failed:', err);
      setAiAvailable(false);
      setError('Failed to connect to AI service');
    } finally {
      setCheckingHealth(false);
    }
  };

  const analyzeReport = async () => {
    if (!aiAvailable || !reportId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await ApiService.analyzeReportWithAI(reportId, 'full');
      
      if (result.success) {
        setAnalysis(result.data);
      } else {
        setError(result.error || 'Analysis failed');
      }
    } catch (err: any) {
      console.error('AI analysis error:', err);
      setError(err.message || 'Failed to analyze report');
    } finally {
      setLoading(false);
    }
  };

  const generateImpression = async () => {
    if (!aiAvailable || !reportId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await ApiService.generateImpressionWithAI(reportId);
      
      if (result.success && result.data.impression) {
        setAnalysis(prev => ({
          ...prev,
          impressionSuggestion: result.data,
        }));
      } else {
        setError(result.error || 'Failed to generate impression');
      }
    } catch (err: any) {
      console.error('Impression generation error:', err);
      setError(err.message || 'Failed to generate impression');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyImpression = () => {
    if (analysis?.impressionSuggestion && onApplyImpression) {
      onApplyImpression(analysis.impressionSuggestion.impression);
      setAppliedSuggestions(prev => new Set(prev).add('impression'));
    }
  };

  const handleApplySuggestion = (suggestion: string, index: number) => {
    if (onApplySuggestion) {
      onApplySuggestion('findingsText', suggestion);
      setAppliedSuggestions(prev => new Set(prev).add(`suggestion-${index}`));
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 4) return 'error';
    if (severity >= 3) return 'warning';
    return 'info';
  };

  // Loading state during health check
  if (checkingHealth) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress size={24} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Checking AI service...
        </Typography>
      </Box>
    );
  }

  // AI service not available
  if (!aiAvailable) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <RobotIcon color="disabled" />
          AI Assistant
        </Typography>

        <Alert severity="warning">
          <AlertTitle>AI Service Unavailable</AlertTitle>
          {error || 'AI features require Google Gemini API key configuration.'}
        </Alert>

        <Paper elevation={1} sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
            💡 To Enable AI Features
          </Typography>
          <Typography variant="caption" component="div">
            1. Get API key from https://makersuite.google.com/app/apikey
          </Typography>
          <Typography variant="caption" component="div">
            2. Add GEMINI_API_KEY to server/.env
          </Typography>
          <Typography variant="caption" component="div">
            3. Restart the server
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge badgeContent="AI" color="primary">
            <RobotIcon color="primary" />
          </Badge>
          AI Assistant
        </Typography>
        <Chip 
          icon={<CheckIcon />} 
          label="Active" 
          color="success" 
          size="small" 
        />
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Action Buttons */}
      <Stack spacing={1} sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : <AnalyzeIcon />}
          onClick={analyzeReport}
          disabled={loading || !findingsText}
          fullWidth
          sx={{ 
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            color: 'white',
          }}
        >
          {loading ? 'Analyzing...' : 'Analyze Findings'}
        </Button>

        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <AIIcon />}
          onClick={generateImpression}
          disabled={loading || !findingsText}
          fullWidth
        >
          Generate Impression
        </Button>
      </Stack>

      {!findingsText && (
        <Alert severity="info" icon={<SuggestionIcon />} sx={{ mb: 2 }}>
          Enter findings text to enable AI analysis
        </Alert>
      )}

      {/* Loading Progress */}
      {loading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            AI is analyzing your report...
          </Typography>
        </Box>
      )}

      {/* Critical Findings Alert */}
      {analysis?.criticalFindings?.hasCritical && (
        <Paper 
          elevation={3} 
          sx={{ 
            p: 2, 
            mb: 2, 
            border: 2, 
            borderColor: 'error.main',
            bgcolor: 'error.light',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CriticalIcon color="error" />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'error.dark' }}>
                Critical Findings Detected
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => toggleSection('critical')}>
              {expandedSections.critical ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          <Collapse in={expandedSections.critical}>
            <List dense>
              {analysis.criticalFindings.criticalFindings.map((finding, index) => (
                <ListItem
                  key={index}
                  sx={{
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    mb: 1,
                    border: 1,
                    borderColor: 'error.main',
                  }}
                >
                  <ListItemIcon>
                    <Chip 
                      label={`Severity ${finding.severity}/5`}
                      color={getSeverityColor(finding.severity)}
                      size="small"
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={finding.finding}
                    secondary={
                      <>
                        <Typography variant="caption" component="span">
                          Location: {finding.location}
                        </Typography>
                        {finding.requiresImmediate && (
                          <Chip 
                            label="IMMEDIATE NOTIFICATION REQUIRED" 
                            color="error" 
                            size="small" 
                            sx={{ ml: 1 }}
                          />
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Collapse>
        </Paper>
      )}

      {/* Suggestions Section */}
      {analysis?.findingsAnalysis && (
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SuggestionIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Suggestions
              </Typography>
              <Chip 
                icon={<ConfidenceIcon />}
                label={`${(analysis.findingsAnalysis.confidence * 100).toFixed(0)}% confident`}
                size="small"
                color={getConfidenceColor(analysis.findingsAnalysis.confidence)}
              />
            </Box>
            <IconButton size="small" onClick={() => toggleSection('suggestions')}>
              {expandedSections.suggestions ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          <Collapse in={expandedSections.suggestions}>
            {analysis.findingsAnalysis.suggestions.length > 0 && (
              <>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold', color: 'primary.main' }}>
                  Terminology Improvements
                </Typography>
                <List dense>
                  {analysis.findingsAnalysis.suggestions.map((suggestion, index) => (
                    <ListItem
                      key={index}
                      sx={{ bgcolor: 'background.default', borderRadius: 1, mb: 0.5 }}
                      secondaryAction={
                        !appliedSuggestions.has(`suggestion-${index}`) && (
                          <Tooltip title="Apply suggestion">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleApplySuggestion(suggestion, index)}
                            >
                              <AddIcon />
                            </IconButton>
                          </Tooltip>
                        )
                      }
                    >
                      <ListItemText 
                        primary={suggestion}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                      {appliedSuggestions.has(`suggestion-${index}`) && (
                        <Chip label="Applied" size="small" color="success" sx={{ ml: 1 }} />
                      )}
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {analysis.findingsAnalysis.improvements.length > 0 && (
              <>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold', color: 'info.main' }}>
                  Missing Details
                </Typography>
                <List dense>
                  {analysis.findingsAnalysis.improvements.map((improvement, index) => (
                    <ListItem
                      key={index}
                      sx={{ bgcolor: 'info.light', borderRadius: 1, mb: 0.5 }}
                    >
                      <ListItemIcon>
                        <SuggestionIcon color="info" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={improvement}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {analysis.findingsAnalysis.detectedFindings.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Detected Findings
                </Typography>
                <Stack spacing={1}>
                  {analysis.findingsAnalysis.detectedFindings.map((finding, index) => (
                    <Chip
                      key={index}
                      label={`${finding.name} - ${finding.location} (${finding.severity})`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </>
            )}
          </Collapse>
        </Paper>
      )}

      {/* Impression Suggestion */}
      {analysis?.impressionSuggestion && (
        <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'success.light' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AIIcon color="success" />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                AI Generated Impression
              </Typography>
              <Chip 
                label={`${(analysis.impressionSuggestion.confidence * 100).toFixed(0)}% confident`}
                size="small"
                color={getConfidenceColor(analysis.impressionSuggestion.confidence)}
              />
            </Box>
            <IconButton size="small" onClick={() => toggleSection('impression')}>
              {expandedSections.impression ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          <Collapse in={expandedSections.impression}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                bgcolor: 'background.paper', 
                border: 1, 
                borderColor: 'success.main',
                borderRadius: 1,
                whiteSpace: 'pre-line',
              }}
            >
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {analysis.impressionSuggestion.impression}
              </Typography>
            </Paper>

            <Button
              variant="contained"
              color="success"
              startIcon={<CheckIcon />}
              onClick={handleApplyImpression}
              disabled={appliedSuggestions.has('impression')}
              fullWidth
              sx={{ mt: 2 }}
            >
              {appliedSuggestions.has('impression') ? 'Applied' : 'Apply Impression'}
            </Button>
          </Collapse>
        </Paper>
      )}

      {/* Info Panel */}
      <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.50' }}>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
          💡 About AI Assistant
        </Typography>
        <Typography variant="caption" component="div" color="text.secondary">
          • Powered by Google Gemini Pro
        </Typography>
        <Typography variant="caption" component="div" color="text.secondary">
          • AI analyzes findings and suggests improvements
        </Typography>
        <Typography variant="caption" component="div" color="text.secondary">
          • Review all suggestions before applying
        </Typography>
        <Typography variant="caption" component="div" color="text.secondary">
          • AI is assistive, not diagnostic
        </Typography>
        <Typography variant="caption" component="div" color="text.secondary" sx={{ fontWeight: 'bold', mt: 1 }}>
          ⚠️ Final report is radiologist's responsibility
        </Typography>
      </Paper>
    </Box>
  );
};

export default AIAssistantPanel;
