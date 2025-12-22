/**
 * Comparison Studies Panel
 * Link prior studies for comparison in reports
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  CardActions,
  Grid,
  Tabs,
  Tab
} from '@mui/material';
import {
  Compare as CompareIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Description as ReportIcon,
  CalendarToday as DateIcon,
  LocalHospital as ModalityIcon,
  AutoAwesome as SuggestIcon,
  Visibility as ViewIcon,
  Edit as EditIcon
} from '@mui/icons-material';

interface ComparisonStudiesPanelProps {
  reportId: string;
  studyInstanceUID: string;
  patientID: string;
  currentModality: string;
  comparisonStudies?: ComparisonStudy[];
  onComparisonChange?: (studies: ComparisonStudy[]) => void;
  onComparisonTextChange?: (text: string) => void;
}

interface ComparisonStudy {
  studyInstanceUID: string;
  studyDate?: string;
  studyDescription?: string;
  modality?: string;
  reportId?: string;
  comparisonNotes?: string;
  selectedByUser?: boolean;
  autoSuggested?: boolean;
  hasReport?: boolean;
  report?: {
    reportId: string;
    impression?: string;
  };
  relevanceScore?: number;
}

interface PriorReport {
  reportId: string;
  studyDate?: string;
  modality?: string;
  clinicalHistory?: string;
  technique?: string;
  findingsText?: string;
  impression?: string;
  recommendations?: string;
}

const ComparisonStudiesPanel: React.FC<ComparisonStudiesPanelProps> = ({
  reportId,
  studyInstanceUID,
  patientID,
  currentModality,
  comparisonStudies = [],
  onComparisonChange,
  onComparisonTextChange
}) => {
  const [studies, setStudies] = useState<ComparisonStudy[]>(comparisonStudies);
  const [suggestions, setSuggestions] = useState<ComparisonStudy[]>([]);
  const [priorStudies, setPriorStudies] = useState<ComparisonStudy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // Add study dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState<ComparisonStudy | null>(null);
  const [comparisonNotes, setComparisonNotes] = useState('');
  
  // View prior report dialog
  const [showPriorReportDialog, setShowPriorReportDialog] = useState(false);
  const [priorReport, setPriorReport] = useState<PriorReport | null>(null);

  useEffect(() => {
    loadSuggestions();
    loadPriorStudies();
  }, [studyInstanceUID, patientID]);

  useEffect(() => {
    setStudies(comparisonStudies);
  }, [comparisonStudies]);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      const response = await fetch(`/api/comparison-studies/suggest/${studyInstanceUID}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (err: any) {
      console.error('Failed to load suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPriorStudies = async () => {
    try {
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      const response = await fetch(
        `/api/comparison-studies/${patientID}?modality=${currentModality}&excludeStudyUID=${studyInstanceUID}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        setPriorStudies(data.priorStudies || []);
      }
    } catch (err: any) {
      console.error('Failed to load prior studies:', err);
    }
  };

  const addComparisonStudy = async (study: ComparisonStudy, notes: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      const response = await fetch(`/api/comparison-studies/${reportId}/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studyInstanceUID: study.studyInstanceUID,
          studyDate: study.studyDate,
          studyDescription: study.studyDescription,
          modality: study.modality,
          priorReportId: study.reportId || study.report?.reportId,
          comparisonNotes: notes,
          autoSuggested: study.autoSuggested
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add comparison study');
      }
      
      const data = await response.json();
      const newStudies = data.report.comparisonStudies || [];
      setStudies(newStudies);
      
      if (onComparisonChange) {
        onComparisonChange(newStudies);
      }
      
      setShowAddDialog(false);
      setSelectedStudy(null);
      setComparisonNotes('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeComparisonStudy = async (studyUID: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      const response = await fetch(`/api/comparison-studies/${reportId}/remove/${studyUID}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove comparison study');
      }
      
      const data = await response.json();
      const newStudies = data.report.comparisonStudies || [];
      setStudies(newStudies);
      
      if (onComparisonChange) {
        onComparisonChange(newStudies);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const viewPriorReport = async (priorReportId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      const response = await fetch(
        `/api/comparison-studies/${reportId}/prior-report/${priorReportId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        setPriorReport(data.priorReport);
        setShowPriorReportDialog(true);
      }
    } catch (err: any) {
      console.error('Failed to load prior report:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString();
  };

  const isAlreadyAdded = (studyUID: string) => {
    return studies.some(s => s.studyInstanceUID === studyUID);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <CompareIcon color="primary" />
          Comparison Studies
        </Typography>
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={() => { loadSuggestions(); loadPriorStudies(); }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Currently Added Comparisons */}
      {studies.length > 0 && (
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Selected for Comparison ({studies.length})
          </Typography>
          <List dense>
            {studies.map((study) => (
              <ListItem key={study.studyInstanceUID} sx={{ bgcolor: 'action.hover', borderRadius: 1, mb: 0.5 }}>
                <ListItemIcon>
                  <Chip label={study.modality || 'N/A'} size="small" color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={study.studyDescription || 'Study'}
                  secondary={
                    <>
                      {formatDate(study.studyDate)}
                      {study.comparisonNotes && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          Notes: {study.comparisonNotes}
                        </Typography>
                      )}
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  {study.reportId && (
                    <Tooltip title="View Prior Report">
                      <IconButton size="small" onClick={() => viewPriorReport(study.reportId!)}>
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Remove">
                    <IconButton size="small" onClick={() => removeComparisonStudy(study.studyInstanceUID)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Tabs for Suggestions vs All Prior Studies */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
        <Tab 
          label={`Suggested (${suggestions.length})`} 
          icon={<SuggestIcon />} 
          iconPosition="start"
        />
        <Tab 
          label={`All Prior (${priorStudies.length})`} 
          icon={<DateIcon />} 
          iconPosition="start"
        />
      </Tabs>

      {loading && <CircularProgress size={24} sx={{ display: 'block', mx: 'auto', my: 2 }} />}

      {/* Suggested Studies */}
      {activeTab === 0 && (
        <Box>
          {suggestions.length === 0 && !loading && (
            <Paper elevation={1} sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
              <CompareIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No prior studies found for comparison
              </Typography>
            </Paper>
          )}
          
          <Grid container spacing={1}>
            {suggestions.map((study) => (
              <Grid item xs={12} key={study.studyInstanceUID}>
                <Card variant="outlined" sx={{ 
                  opacity: isAlreadyAdded(study.studyInstanceUID) ? 0.5 : 1 
                }}>
                  <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <Box display="flex" justifyContent="space-between" alignItems="start">
                      <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip label={study.modality || 'N/A'} size="small" color="primary" />
                          {study.hasReport && (
                            <Chip label="Has Report" size="small" color="success" variant="outlined" />
                          )}
                          {study.relevanceScore && study.relevanceScore > 10 && (
                            <Chip label="Best Match" size="small" color="warning" />
                          )}
                        </Box>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {study.studyDescription || 'Study'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(study.studyDate)}
                        </Typography>
                        {study.report?.impression && (
                          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                            Prior impression: {study.report.impression.substring(0, 100)}...
                          </Typography>
                        )}
                      </Box>
                      <Box>
                        {isAlreadyAdded(study.studyInstanceUID) ? (
                          <Chip label="Added" size="small" color="success" />
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={() => {
                              setSelectedStudy(study);
                              setShowAddDialog(true);
                            }}
                          >
                            Add
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* All Prior Studies */}
      {activeTab === 1 && (
        <Box>
          {priorStudies.length === 0 && !loading && (
            <Paper elevation={1} sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
              <DateIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No prior studies found for this patient
              </Typography>
            </Paper>
          )}
          
          <List dense>
            {priorStudies.map((study) => (
              <ListItem 
                key={study.studyInstanceUID} 
                sx={{ 
                  border: 1, 
                  borderColor: 'divider', 
                  borderRadius: 1, 
                  mb: 0.5,
                  opacity: isAlreadyAdded(study.studyInstanceUID) ? 0.5 : 1
                }}
              >
                <ListItemIcon>
                  <Chip label={study.modality || 'N/A'} size="small" />
                </ListItemIcon>
                <ListItemText
                  primary={study.studyDescription || 'Study'}
                  secondary={
                    <>
                      {formatDate(study.studyDate)}
                      {study.hasReport && ' • Has Report'}
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  {isAlreadyAdded(study.studyInstanceUID) ? (
                    <Chip label="Added" size="small" color="success" />
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setSelectedStudy(study);
                        setShowAddDialog(true);
                      }}
                    >
                      Add
                    </Button>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Info Panel */}
      <Paper elevation={1} sx={{ p: 2, mt: 2, bgcolor: 'info.light' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          📊 Comparison Studies
        </Typography>
        <Typography variant="caption" component="div">
          • Select prior studies to compare with current examination
        </Typography>
        <Typography variant="caption" component="div">
          • Add notes about changes from prior studies
        </Typography>
        <Typography variant="caption" component="div">
          • View prior reports for side-by-side comparison
        </Typography>
      </Paper>

      {/* Add Comparison Dialog */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CompareIcon color="primary" />
            Add Comparison Study
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedStudy && (
            <Box>
              <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  {selectedStudy.studyDescription || 'Study'}
                </Typography>
                <Box display="flex" gap={1} mt={1}>
                  <Chip label={selectedStudy.modality || 'N/A'} size="small" />
                  <Chip label={formatDate(selectedStudy.studyDate)} size="small" variant="outlined" />
                  {selectedStudy.hasReport && (
                    <Chip label="Has Report" size="small" color="success" />
                  )}
                </Box>
              </Paper>
              
              <TextField
                fullWidth
                label="Comparison Notes"
                value={comparisonNotes}
                onChange={(e) => setComparisonNotes(e.target.value)}
                multiline
                rows={4}
                placeholder="Describe changes from prior study (e.g., 'Nodule unchanged from prior', 'New consolidation not present on prior')"
                helperText="These notes will be added to the Comparison section of your report"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>Cancel</Button>
          <Button 
            variant="contained"
            onClick={() => selectedStudy && addComparisonStudy(selectedStudy, comparisonNotes)}
            disabled={loading}
          >
            Add Comparison
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Prior Report Dialog */}
      <Dialog open={showPriorReportDialog} onClose={() => setShowPriorReportDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <ReportIcon color="primary" />
            Prior Report
          </Box>
        </DialogTitle>
        <DialogContent>
          {priorReport && (
            <Box>
              <Box display="flex" gap={1} mb={2}>
                <Chip label={priorReport.modality || 'N/A'} />
                <Chip label={formatDate(priorReport.studyDate)} variant="outlined" />
              </Box>
              
              {priorReport.clinicalHistory && (
                <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Clinical History</Typography>
                  <Typography variant="body2">{priorReport.clinicalHistory}</Typography>
                </Paper>
              )}
              
              {priorReport.technique && (
                <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Technique</Typography>
                  <Typography variant="body2">{priorReport.technique}</Typography>
                </Paper>
              )}
              
              {priorReport.findingsText && (
                <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Findings</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{priorReport.findingsText}</Typography>
                </Paper>
              )}
              
              {priorReport.impression && (
                <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'primary.light' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Impression</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontWeight: 'bold' }}>
                    {priorReport.impression}
                  </Typography>
                </Paper>
              )}
              
              {priorReport.recommendations && (
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Recommendations</Typography>
                  <Typography variant="body2">{priorReport.recommendations}</Typography>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPriorReportDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ComparisonStudiesPanel;
