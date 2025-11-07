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
  Chip,
  Divider
} from '@mui/material';
import {
  Description as ReportIcon,
  Home as HomeIcon,
  ArrowBack as BackIcon,
  CheckCircle as CompleteIcon
} from '@mui/icons-material';
import StructuredReporting from '../components/reporting/StructuredReportingUnified';
import { telemetryEmit } from '../utils/reportingUtils';
import type { CreationMode } from '../types/reporting';
import { ProductionReportEditor } from '@/components/reports';
import AdvancedReportingHub from '../components/reporting/AdvancedReportingHub';
import { SignatureButton } from '../components/signatures/SignatureButton';
import { SignatureStatus } from '../components/signatures/SignatureStatus';
import { ReportExportMenu } from '../components/reporting/ReportExportMenu';

interface ReportingPageProps {
  // Optional: can be passed from router
  studyInstanceUID?: string;
  analysisId?: string;
  mode?: CreationMode;
}

const ReportingPage: React.FC<ReportingPageProps> = (props) => {
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studyUID, setStudyUID] = useState<string>('');
  const [reportId, setReportId] = useState<string | undefined>(undefined);
  const [analysisId, setAnalysisId] = useState<string | undefined>(undefined);
  const [initialMode, setInitialMode] = useState<CreationMode | undefined>(undefined);
  const [patientInfo, setPatientInfo] = useState<any>(null);

  /**
   * Initialize from URL parameters or props
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlReportId = params.get('reportId');
    const urlAnalysisId = params.get('analysisId');
    const urlStudyUID = params.get('studyUID') || params.get('studyInstanceUID');
    const urlMode = params.get('mode') as CreationMode | null;
    const urlPatientID = params.get('patientID');
    const urlPatientName = params.get('patientName');
    const urlModality = params.get('modality');

    console.log('📋 Reporting Page initialized with:', {
      urlReportId,
      urlAnalysisId,
      urlStudyUID,
      urlMode,
      urlPatientID,
      urlPatientName,
      urlModality,
      allParams: Object.fromEntries(params.entries())
    });

    // D) Early null check - Set study UID (required)
    const finalStudyUID = props.studyInstanceUID || urlStudyUID;
    if (!finalStudyUID) {
      console.error('❌ Missing studyUID parameter');
      console.error('   URL params:', Object.fromEntries(params.entries()));
      console.error('   Props:', { studyInstanceUID: props.studyInstanceUID });
      console.error('   Expected: /reporting?studyUID=xxx or /reporting?studyInstanceUID=xxx');
      setError('Study UID is required. Please navigate from a study viewer or provide studyUID parameter in the URL.');
      setLoading(false);
      return;
    }
    
    console.log('✅ Study UID found:', finalStudyUID);
    setStudyUID(finalStudyUID);

    // Set report ID (optional - for viewing/editing existing report)
    if (urlReportId) {
      console.log('✅ Report ID found:', urlReportId);
      setReportId(urlReportId);
    }

    // Set analysis ID (optional - for AI-assisted reports)
    const finalAnalysisId = props.analysisId || urlAnalysisId || undefined;
    setAnalysisId(finalAnalysisId);

    // Set mode (optional - determines initial workflow step)
    const finalMode = props.mode || urlMode || undefined;
    setInitialMode(finalMode);

    // Set patient info from URL params or fetch from API
    const loadPatientInfo = async () => {
      if (urlPatientID || urlPatientName || urlModality) {
        setPatientInfo({
          patientID: urlPatientID || 'Unknown',
          patientName: urlPatientName || 'Unknown Patient',
          modality: urlModality || 'CT',
          studyDescription: params.get('studyDescription') || undefined
        });
      } else {
        // Fetch study data from API if not provided in URL
        try {
          const response = await fetch(`/api/studies/${finalStudyUID}`);
          if (response.ok) {
            const studyData = await response.json();
            setPatientInfo({
              patientID: studyData.patientID || studyData.PatientID || 'Unknown',
              patientName: studyData.patientName || studyData.PatientName || 'Unknown Patient',
              modality: studyData.modality || studyData.Modality || 'CT',
              studyDescription: studyData.studyDescription || studyData.StudyDescription || undefined
            });
            console.log('✅ Loaded patient info from API:', studyData);
          }
        } catch (error) {
          console.error('❌ Failed to load study data:', error);
          // Use defaults if API fails
          setPatientInfo({
            patientID: 'Unknown',
            patientName: 'Unknown Patient',
            modality: 'CT'
          });
        }
      }
    };

    loadPatientInfo().then(() => {
      // Emit telemetry
      telemetryEmit('reporting.impl=unified', {
        studyUID: finalStudyUID,
        hasAnalysisId: !!finalAnalysisId,
        mode: finalMode
      });

      // Log initialization summary
      console.log('📋 ReportingPage Initialized:', {
        studyUID: finalStudyUID,
        analysisId: finalAnalysisId,
        mode: finalMode,
        patientInfo
      });

      setLoading(false);
    });
  }, [props.studyInstanceUID, props.analysisId, props.mode]);

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
                {analysisId ? 'AI-Assisted Report' : 'Create Report'}
              </Typography>
              {analysisId && (
                <Chip
                  label="AI Analysis Available"
                  color="primary"
                  size="small"
                  icon={<CompleteIcon />}
                />
              )}
            </Box>
          </Box>

          {/* Actions */}
          <Button variant="outlined" startIcon={<BackIcon />} onClick={handleBack}>
            Back to Study
          </Button>
        </Box>
      </Paper>

      {/* Advanced Reporting Hub */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <AdvancedReportingHub
          reportData={{
            studyInstanceUID: studyUID,
            findings: '',
            impression: '',
            analysisId
          }}
          patientInfo={patientInfo || {
            patientID: 'Unknown',
            patientName: 'Unknown Patient',
            modality: 'CT'
          }}
          studyInfo={{
            studyInstanceUID: studyUID,
            studyDate: new Date().toISOString()
          }}
          onReportUpdate={(data) => console.log('Report updated:', data)}
        />
        
        {/* Original Production Report Editor */}
        <Box sx={{ mt: 3 }}>
          <ProductionReportEditor
            studyInstanceUID={studyUID}
            patientInfo={patientInfo || {
              patientID: 'Unknown',
              patientName: 'Unknown Patient',
              modality: 'CT'
            }}
            analysisId={analysisId}
            reportId={reportId}
            onReportCreated={()=>console.log("Report created")}
            onReportSigned={()=>console.log("Report signed")}
            onClose={handleBack}
          />
        </Box>

        {/* FDA Digital Signatures Section */}
        {reportId && (
          <Paper sx={{ p: 3, mt: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Digital Signatures & Export</Typography>
              <Box display="flex" gap={1}>
                <ReportExportMenu 
                  reportId={reportId}
                  onExportComplete={() => {
                    console.log('Report exported successfully!')
                  }}
                />
                <SignatureButton 
                  reportId={reportId}
                  onSigned={() => {
                    alert('Report signed successfully!')
                    // Refresh signature status
                    window.location.reload()
                  }}
                />
              </Box>
            </Box>
            
            <SignatureStatus reportId={reportId} />
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default ReportingPage;
