/**
 * Unified Report Editor
 * Single source of truth for report editing
 * Clean architecture with content panel + feature panels
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Badge,
  Chip,
  LinearProgress,
  Alert,
  Snackbar,
  Button
} from '@mui/material';
import {
  Save as SaveIcon,
  CheckCircle as SignIcon,
  Accessibility as AnatomicalIcon,
  Mic as VoiceIcon,
  SmartToy as AIIcon,
  Download as ExportIcon,
  Close as CloseIcon,
  Visibility as PreviewIcon,
  Warning as CriticalIcon,
  History as HistoryIcon,
  School as TraineeIcon,
  Compare as CompareIcon
} from '@mui/icons-material';
import { useReporting } from '../../contexts/ReportingContext';
import { screenshotService } from '../../services/screenshotService';
import ReportContentPanel from './panels/ReportContentPanel';
import AnatomicalDiagramPanel from './panels/AnatomicalDiagramPanel';
import VoiceDictationPanel from './panels/VoiceDictationPanel';
import AIAssistantPanel from './panels/AIAssistantPanel';
import ExportPanel from './panels/ExportPanel';
import CriticalCommunicationPanel from './panels/CriticalCommunicationPanel';
import ReportVersionsPanel from './panels/ReportVersionsPanel';
import PreliminaryWorkflowPanel from './panels/PreliminaryWorkflowPanel';
import ComparisonStudiesPanel from './panels/ComparisonStudiesPanel';
import SignReportDialog, { type SignatureData } from './SignReportDialog';
import ReportPreviewDialog from './ReportPreviewDialog';

interface UnifiedReportEditorProps {
  onClose?: () => void;
}

const UnifiedReportEditor: React.FC<UnifiedReportEditorProps> = ({ onClose }) => {
  const { state, actions } = useReporting();
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showAmendDialog, setShowAmendDialog] = useState(false);
  const [amendReason, setAmendReason] = useState('');
  
  // Check if report is signed/final
  const isSignedReport = state.reportStatus === 'final' || state.reportStatus === 'final_with_addendum';
  
  // Load captured images from screenshotService when editor opens
  useEffect(() => {
    const loadCapturedImages = () => {
      const capturedImages = screenshotService.getCapturedImages();
      if (capturedImages.length > 0 && state.keyImages.length === 0) {
        console.log('📸 Loading captured images from viewer:', capturedImages.length);
        capturedImages.forEach(img => {
          actions.addKeyImage(img);
        });
      }
    };
    
    loadCapturedImages();
  }, []); // Only run once on mount
  
  const handleSave = async () => {
    // If report is signed, show amend dialog instead
    if (isSignedReport) {
      setShowAmendDialog(true);
      return;
    }
    
    try {
      await actions.saveReport();
      setSnackbar({ open: true, message: 'Report saved successfully', severity: 'success' });
    } catch (error: any) {
      if (error.message?.includes('signed')) {
        setShowAmendDialog(true);
        setSnackbar({ open: true, message: 'This report is signed. Create an amended version to make changes.', severity: 'warning' });
      } else {
        setSnackbar({ open: true, message: error.message || 'Failed to save report', severity: 'error' });
      }
    }
  };
  
  const handleAmend = async () => {
    if (!amendReason.trim()) {
      setSnackbar({ open: true, message: 'Please provide a reason for the amendment', severity: 'warning' });
      return;
    }
    
    try {
      const newReportId = await actions.amendReport(amendReason);
      setShowAmendDialog(false);
      setAmendReason('');
      setSnackbar({ open: true, message: 'Amended report created! Redirecting...', severity: 'success' });
      
      // Navigate to the new amended report
      setTimeout(() => {
        const params = new URLSearchParams(window.location.search);
        params.set('reportId', newReportId);
        window.location.href = `${window.location.pathname}?${params.toString()}`;
      }, 1500);
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to create amended report', severity: 'error' });
    }
  };
  
  const handleSign = async (signatureData: SignatureData) => {
    try {
      await actions.signReport(signatureData);
      setSnackbar({ open: true, message: 'Report signed successfully', severity: 'success' });
      setShowSignDialog(false);
    } catch (error: any) {
      throw error; // Re-throw to be handled by dialog
    }
  };
  
  const handlePreview = () => {
    setShowPreviewDialog(true);
  };
  
  return (
    <Box display="flex" flexDirection="column" height="100vh">
      {/* Top Bar */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderRadius: 0
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Box>
            <Box display="flex" alignItems="center" gap={1}>
              <strong>{state.patientInfo.patientName}</strong>
              <Chip label={state.patientInfo.modality} size="small" color="primary" />
              <Chip 
                label={state.reportStatus.toUpperCase()} 
                size="small" 
                color={state.reportStatus === 'final' ? 'success' : state.reportStatus === 'final_with_addendum' ? 'info' : 'default'}
              />
              {isSignedReport && (
                <Chip label="🔒 Signed" size="small" color="success" variant="outlined" />
              )}
            </Box>
            <Box sx={{ fontSize: '0.875rem', color: 'text.secondary', mt: 0.5 }}>
              Patient ID: {state.patientInfo.patientID} | Study: {state.studyInstanceUID.slice(0, 20)}...
            </Box>
          </Box>
        </Box>
        
        <Box display="flex" gap={1} alignItems="center">
          {state.hasUnsavedChanges && !isSignedReport && (
            <Chip label="Unsaved changes" size="small" color="warning" />
          )}
          
          {state.lastSaved && (
            <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              Last saved: {state.lastSaved.toLocaleTimeString()}
            </Box>
          )}
          
          <Tooltip title="Preview Report">
            <Button
              variant="outlined"
              size="small"
              startIcon={<PreviewIcon />}
              onClick={handlePreview}
              sx={{ textTransform: 'none' }}
            >
              Preview
            </Button>
          </Tooltip>
          
          {isSignedReport ? (
            // Show Amend button for signed reports
            <Tooltip title="Create amended version of this signed report">
              <Button
                variant="contained"
                color="warning"
                size="small"
                startIcon={<HistoryIcon />}
                onClick={() => setShowAmendDialog(true)}
                sx={{ textTransform: 'none' }}
              >
                Amend
              </Button>
            </Tooltip>
          ) : (
            // Show Save button for draft reports
            <Tooltip title="Save Report (Ctrl+S)">
              <IconButton 
                color="primary" 
                onClick={handleSave}
                disabled={state.saving || !state.hasUnsavedChanges}
              >
                <Badge color="error" variant="dot" invisible={!state.hasUnsavedChanges}>
                  <SaveIcon />
                </Badge>
              </IconButton>
            </Tooltip>
          )}
          
          <Tooltip title={isSignedReport ? "Report already signed" : "Sign Report"}>
            <span>
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={<SignIcon />}
                onClick={() => setShowSignDialog(true)}
                disabled={isSignedReport}
                sx={{ textTransform: 'none' }}
              >
                {isSignedReport ? 'Signed' : 'Sign'}
              </Button>
            </span>
          </Tooltip>
          
          {onClose && (
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </Paper>
      
      {/* Signed Report Banner */}
      {isSignedReport && (
        <Alert severity="info" sx={{ borderRadius: 0 }}>
          This report has been signed and is now read-only. To make changes, click "Amend" to create a new version.
        </Alert>
      )}
      
      {/* Loading Bar */}
      {(state.loading || state.saving) && <LinearProgress />}
      
      {/* Error Alert */}
      {state.error && (
        <Alert severity="error" onClose={() => actions.updateField('error', '')}>
          {state.error}
        </Alert>
      )}
      
      {/* Amend Dialog */}
      {showAmendDialog && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setShowAmendDialog(false)}
        >
          <Paper
            sx={{ p: 3, maxWidth: 500, width: '90%' }}
            onClick={e => e.stopPropagation()}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <HistoryIcon color="warning" />
                <strong>Amend Signed Report</strong>
              </Box>
              <IconButton size="small" onClick={() => setShowAmendDialog(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              This will create a new draft report based on the signed report. The original signed report will be preserved for audit purposes.
            </Alert>
            
            <Box mb={2}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Reason for Amendment *
              </label>
              <textarea
                value={amendReason}
                onChange={e => setAmendReason(e.target.value)}
                placeholder="Enter the reason for amending this report..."
                style={{
                  width: '100%',
                  minHeight: 100,
                  padding: 12,
                  borderRadius: 4,
                  border: '1px solid #ccc',
                  fontSize: 14,
                  resize: 'vertical'
                }}
              />
            </Box>
            
            <Box display="flex" gap={1} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => setShowAmendDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="contained"
                color="warning"
                onClick={handleAmend}
                disabled={!amendReason.trim() || state.saving}
              >
                {state.saving ? 'Creating...' : 'Create Amended Report'}
              </Button>
            </Box>
          </Paper>
        </Box>
      )}
      
      {/* Main Content Area */}
      <Box display="flex" flex={1} overflow="hidden">
        {/* LEFT: Main Content Editor */}
        <Box 
          flex={2} 
          p={2} 
          overflow="auto"
          sx={{ 
            bgcolor: 'background.default',
            borderRight: 1,
            borderColor: 'divider'
          }}
        >
          <ReportContentPanel />
        </Box>
        
        {/* RIGHT: Feature Panels */}
        <Paper 
          elevation={0}
          sx={{ 
            width: 500, 
            minWidth: 400,
            display: 'flex', 
            flexDirection: 'column',
            bgcolor: 'background.paper'
          }}
        >
          {/* Tab Selector */}
          <Tabs 
            value={state.activePanel} 
            onChange={(_, v) => actions.setActivePanel(v)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              '& .MuiTab-root': {
                minWidth: 'auto',
                px: 1.5,
                fontSize: '0.75rem'
              }
            }}
          >
            <Tab 
              value="anatomical" 
              icon={<AnatomicalIcon />} 
              label="Diagram"
              iconPosition="start"
              sx={{ minHeight: 48 }}
            />
            <Tab 
              value="voice" 
              icon={<VoiceIcon />} 
              label="Voice"
              iconPosition="start"
              sx={{ minHeight: 48 }}
            />
            <Tab 
              value="ai" 
              icon={<AIIcon />} 
              label="AI"
              iconPosition="start"
              sx={{ minHeight: 48 }}
            />
            <Tab 
              value="critical" 
              icon={<CriticalIcon />} 
              label="Alert"
              iconPosition="start"
              sx={{ minHeight: 48 }}
            />
            <Tab 
              value="versions" 
              icon={<HistoryIcon />} 
              label="History"
              iconPosition="start"
              sx={{ minHeight: 48 }}
            />
            <Tab 
              value="preliminary" 
              icon={<TraineeIcon />} 
              label="Trainee"
              iconPosition="start"
              sx={{ minHeight: 48 }}
            />
            <Tab 
              value="compare" 
              icon={<CompareIcon />} 
              label="Compare"
              iconPosition="start"
              sx={{ minHeight: 48 }}
            />
            <Tab 
              value="export" 
              icon={<ExportIcon />} 
              label="Export"
              iconPosition="start"
              sx={{ minHeight: 48 }}
            />
          </Tabs>
          
          {/* Panel Content */}
          <Box flex={1} overflow="auto" p={2}>
            {state.activePanel === 'anatomical' && <AnatomicalDiagramPanel />}
            {state.activePanel === 'voice' && <VoiceDictationPanel />}
            {state.activePanel === 'ai' && <AIAssistantPanel />}
            {state.activePanel === 'critical' && (
              <CriticalCommunicationPanel
                reportId={state.reportId || ''}
                studyInstanceUID={state.studyInstanceUID}
                patientID={state.patientInfo.patientID}
                patientName={state.patientInfo.patientName}
              />
            )}
            {state.activePanel === 'versions' && (
              <ReportVersionsPanel
                reportId={state.reportId || ''}
                reportStatus={state.reportStatus}
              />
            )}
            {state.activePanel === 'preliminary' && (
              <PreliminaryWorkflowPanel
                reportId={state.reportId || ''}
                reportStatus={state.reportStatus}
              />
            )}
            {state.activePanel === 'compare' && (
              <ComparisonStudiesPanel
                reportId={state.reportId || ''}
                studyInstanceUID={state.studyInstanceUID}
                patientID={state.patientInfo.patientID}
                currentModality={state.patientInfo.modality}
              />
            )}
            {state.activePanel === 'export' && <ExportPanel />}
          </Box>
        </Paper>
      </Box>
      
      {/* Snackbar Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity={snackbar.severity} 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      
      {/* Sign Report Dialog */}
      <SignReportDialog
        open={showSignDialog}
        onClose={() => setShowSignDialog(false)}
        onSign={handleSign}
        reportId={state.reportId || ''}
        reportData={{
          patientName: state.patientInfo.patientName,
          patientID: state.patientInfo.patientID,
          modality: state.patientInfo.modality,
          clinicalHistory: state.clinicalHistory,
          technique: state.technique,
          findingsText: state.findingsText,
          impression: state.impression,
          recommendations: state.recommendations,
          findings: state.findings
        }}
      />
      
      {/* Report Preview Dialog */}
      <ReportPreviewDialog
        open={showPreviewDialog}
        onClose={() => setShowPreviewDialog(false)}
        reportData={{
          reportId: state.reportId,
          patientName: state.patientInfo.patientName,
          patientID: state.patientInfo.patientID,
          modality: state.patientInfo.modality,
          studyDate: state.patientInfo.studyDate,
          templateId: state.templateId,
          templateName: state.templateName,
          templateSections: state.selectedTemplate?.sections || [],
          templateUiModules: state.selectedTemplate?.uiModules || [],
          sections: state.sections,
          clinicalHistory: state.clinicalHistory,
          technique: state.technique,
          findingsText: state.findingsText,
          impression: state.impression,
          recommendations: state.recommendations,
          findings: state.findings,
          anatomicalMarkings: state.anatomicalMarkings,
          keyImages: state.keyImages,
          reportStatus: state.reportStatus,
          lastSaved: state.lastSaved,
          signedAt: state.signedAt,
          signedBy: state.signedBy,
          signatureUrl: state.signatureUrl,
          radiologistSignature: state.radiologistSignature
        }}
      />
    </Box>
  );
};

export default UnifiedReportEditor;
