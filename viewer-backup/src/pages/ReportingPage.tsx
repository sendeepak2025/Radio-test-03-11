/**
 * Medical Reporting Page
 * Production-ready structured reporting system for radiology
 * Route: /reporting
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
  Chip
} from '@mui/material';
import {
  Description as ReportIcon,
  Home as HomeIcon,
  ArrowBack as BackIcon,
  CheckCircle as CompleteIcon
} from '@mui/icons-material';
import { ProductionReportEditor } from '@/components/reports';

interface ReportingPageProps {
  // Optional: can be passed from router
  studyInstanceUID?: string;
  analysisId?: string;
}

const ReportingPage: React.FC<ReportingPageProps> = (props) => {
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studyUID, setStudyUID] = useState<string>('');
  const [analysisId, setAnalysisId] = useState<string | undefined>(undefined);
  const [reportId, setReportId] = useState<string | undefined>(undefined);
  const [patientInfo, setPatientInfo] = useState<any>(null);
  const [reportCreated, setReportCreated] = useState(false);

  /**
   * Initialize from URL parameters or props
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlAnalysisId = params.get('analysisId');
    const urlStudyUID = params.get('studyUID');
    const urlReportId = params.get('reportId');
    const urlPatientID = params.get('patientID');
    const urlPatientName = params.get('patientName');
    const urlModality = params.get('modality');

    console.log('📋 Reporting Page initialized with:', {
      urlAnalysisId,
      urlStudyUID,
      urlReportId,
      urlPatientID,
      urlPatientName,
      urlModality
    });

    // Set study UID (required)
    const finalStudyUID = props.studyInstanceUID || urlStudyUID;
    if (!finalStudyUID) {
      setError('Study UID is required. Please navigate from a study viewer.');
      setLoading(false);
      return;
    }
    setStudyUID(finalStudyUID);

    // Set analysis ID (optional - for AI-assisted reports)
    const finalAnalysisId = props.analysisId || urlAnalysisId || undefined;
    setAnalysisId(finalAnalysisId);

    // Set report ID (optional - for editing existing reports)
    setReportId(urlReportId || undefined);

    // Set patient info from URL params
    if (urlPatientID || urlPatientName || urlModality) {
      setPatientInfo({
        patientID: urlPatientID || 'Unknown',
        patientName: urlPatientName || 'Unknown Patient',
        modality: urlModality || 'CT'
      });
    }

    setLoading(false);
  }, [props.studyInstanceUID, props.analysisId]);

  /**
   * Handle navigation back
   */
  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  /**
   * Handle report created
   */
  const handleReportCreated = (newReportId: string) => {
    console.log('✅ Report created:', newReportId);
    setReportId(newReportId);
    setReportCreated(true);
  };

  /**
   * Handle report signed
   */
  const handleReportSigned = () => {
    console.log('✅ Report signed and finalized!');
    setReportCreated(true);

    // Show success message
    setTimeout(() => {
      if (confirm('Report signed successfully! Would you like to return to the study viewer?')) {
        handleBack();
      }
    }, 500);
  };

  /**
   * Loading state
   */
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="background.default"
      >
        <CircularProgress />
      </Box>
    );
  }

  /**
   * Error state
   */
  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="background.default"
        p={3}
      >
        <Alert severity="error" sx={{ mb: 3, maxWidth: 600 }}>
          <Typography variant="h6" gutterBottom>
            Unable to Load Reporting Page
          </Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
        <Button variant="contained" startIcon={<BackIcon />} onClick={handleBack}>
          Go Back
        </Button>
      </Box>
    );
  }

  /**
   * Main reporting interface
   */
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <Paper
        elevation={2}
        sx={{
          p: 2,
          borderRadius: 0,
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center">
          {/* Breadcrumbs */}
          <Box>
            <Breadcrumbs aria-label="breadcrumb">
              <Link
                color="inherit"
                href="/"
                sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              >
                <HomeIcon sx={{ mr: 0.5 }} fontSize="small" />
                Home
              </Link>
              <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
                <ReportIcon sx={{ mr: 0.5 }} fontSize="small" />
                Medical Reporting
              </Typography>
            </Breadcrumbs>

            <Box display="flex" alignItems="center" gap={1} mt={1}>
              <Typography variant="h6">
                {reportId ? 'Edit Report' : analysisId ? 'AI-Assisted Report' : 'Create Report'}
              </Typography>
              {analysisId && (
                <Chip
                  label="AI Analysis Available"
                  color="primary"
                  size="small"
                  icon={<CompleteIcon />}
                />
              )}
              {reportCreated && (
                <Chip label="Report Created" color="success" size="small" />
              )}
            </Box>
          </Box>

          {/* Actions */}
          <Button variant="outlined" startIcon={<BackIcon />} onClick={handleBack}>
            Back to Study
          </Button>
        </Box>
      </Paper>

      {/* Report Editor */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <ProductionReportEditor
          studyInstanceUID={studyUID}
          patientInfo={patientInfo || {
            patientID: 'Unknown',
            patientName: 'Unknown Patient',
            modality: 'CT'
          }}
          analysisId={analysisId}
          reportId={reportId}
          onReportCreated={handleReportCreated}
          onReportSigned={handleReportSigned}
          onClose={handleBack}
        />
      </Box>
    </Box>
  );
};

export default ReportingPage;
