/**
 * Export Panel
 * Enhanced multi-format report export with hospital branding options
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  Switch,
  Collapse,
  IconButton,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  PictureAsPdf as PDFIcon,
  Description as TextIcon,
  Code as JSONIcon,
  LocalHospital as FHIRIcon,
  MedicalServices as DICOMIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  CheckCircle as SuccessIcon,
  Image as ImageIcon
} from '@mui/icons-material';
import { useReporting } from '../../../contexts/ReportingContext';

interface ExportFormat {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  endpoint: string;
  mimeType: string;
  extension: string;
  requiresFinal?: boolean;
}

const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: 'pdf',
    name: 'PDF Report',
    description: 'Professional PDF with hospital branding and letterhead',
    icon: <PDFIcon color="error" />,
    endpoint: '/pdf',
    mimeType: 'application/pdf',
    extension: 'pdf'
  },
  {
    id: 'txt',
    name: 'Plain Text',
    description: 'Simple text format for copying to EMR/EHR',
    icon: <TextIcon color="action" />,
    endpoint: '/export/txt',
    mimeType: 'text/plain',
    extension: 'txt'
  },
  {
    id: 'json',
    name: 'JSON Data',
    description: 'Structured data format for integration',
    icon: <JSONIcon color="primary" />,
    endpoint: '/export',
    mimeType: 'application/json',
    extension: 'json'
  },
  {
    id: 'dicom-sr',
    name: 'DICOM SR',
    description: 'DICOM Structured Report for PACS',
    icon: <DICOMIcon color="secondary" />,
    endpoint: '/export/dicom-sr',
    mimeType: 'application/json',
    extension: 'dcm.json',
    requiresFinal: true
  },
  {
    id: 'fhir',
    name: 'FHIR R4 Bundle',
    description: 'HL7 FHIR DiagnosticReport for EHR interoperability',
    icon: <FHIRIcon color="success" />,
    endpoint: '/export/fhir',
    mimeType: 'application/fhir+json',
    extension: 'fhir.json'
  }
];

const ExportPanel: React.FC = () => {
  const { state } = useReporting();
  const [selectedFormat, setSelectedFormat] = useState<string>('pdf');
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  
  // Export options
  const [includeImages, setIncludeImages] = useState(true);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [includeBranding, setIncludeBranding] = useState(true);

  const handleExport = async () => {
    if (!state.reportId) {
      setError('Cannot export: No report ID. Please save the report first.');
      return;
    }
    
    const format = EXPORT_FORMATS.find(f => f.id === selectedFormat);
    if (!format) {
      setError('Invalid export format');
      return;
    }
    
    // Check if format requires final status
    if (format.requiresFinal && state.reportStatus !== 'final') {
      setError(`${format.name} export requires a finalized report. Please sign the report first.`);
      return;
    }
    
    setExporting(true);
    setExportProgress(10);
    setError(null);
    setSuccess(null);
    
    try {
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      // Build query params for options
      const params = new URLSearchParams();
      if (includeImages) params.append('includeImages', 'true');
      if (includeSignature) params.append('includeSignature', 'true');
      if (includeBranding) params.append('includeBranding', 'true');
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      setExportProgress(30);
      
      const response = await fetch(`/api/reports/${state.reportId}${format.endpoint}${queryString}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setExportProgress(70);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Export failed: ${response.statusText}`);
      }
      
      // Handle different response types
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${state.reportId}.${format.extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setExportProgress(100);
      setSuccess(`Report exported successfully as ${format.name}`);
      
      // Reset progress after delay
      setTimeout(() => setExportProgress(0), 2000);
      
    } catch (err: any) {
      console.error('Export failed:', err);
      setError(err.message);
      setExportProgress(0);
    } finally {
      setExporting(false);
    }
  };
  
  const handlePrint = () => {
    window.print();
  };
  
  const selectedFormatInfo = EXPORT_FORMATS.find(f => f.id === selectedFormat);
  
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DownloadIcon color="primary" />
          Export Report
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }} 
          onClose={() => setSuccess(null)}
          icon={<SuccessIcon />}
        >
          {success}
        </Alert>
      )}
      
      {/* Report Status */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Report Status
            </Typography>
            <Box display="flex" gap={1} alignItems="center" mt={0.5}>
              <Chip 
                label={state.reportStatus.toUpperCase()} 
                size="small"
                color={state.reportStatus === 'final' ? 'success' : 'warning'}
              />
              {state.reportId && (
                <Typography variant="caption" color="text.secondary">
                  ID: {state.reportId.slice(0, 15)}...
                </Typography>
              )}
            </Box>
          </Box>
          <Tooltip title="Print Report">
            <IconButton onClick={handlePrint} color="primary">
              <PrintIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        {state.reportStatus !== 'final' && (
          <Alert severity="info" sx={{ mt: 1 }} icon={false}>
            <Typography variant="caption">
              💡 Sign the report for official exports (DICOM SR, certified PDF)
            </Typography>
          </Alert>
        )}
      </Paper>

      {/* Format Selection */}
      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
        Select Export Format
      </Typography>
      
      <FormControl component="fieldset" fullWidth>
        <RadioGroup
          value={selectedFormat}
          onChange={(e) => setSelectedFormat(e.target.value)}
        >
          <List dense disablePadding>
            {EXPORT_FORMATS.map((format) => {
              const isDisabled = format.requiresFinal && state.reportStatus !== 'final';
              
              return (
                <ListItem
                  key={format.id}
                  button
                  onClick={() => !isDisabled && setSelectedFormat(format.id)}
                  disabled={isDisabled}
                  sx={{
                    border: 1,
                    borderColor: selectedFormat === format.id ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: selectedFormat === format.id ? 'action.selected' : 'background.default',
                    opacity: isDisabled ? 0.5 : 1
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Radio
                      checked={selectedFormat === format.id}
                      value={format.id}
                      disabled={isDisabled}
                      size="small"
                    />
                  </ListItemIcon>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {format.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" sx={{ fontWeight: selectedFormat === format.id ? 'bold' : 'normal' }}>
                          {format.name}
                        </Typography>
                        {format.requiresFinal && (
                          <Chip label="Requires Sign" size="small" variant="outlined" color="warning" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {format.description}
                      </Typography>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </RadioGroup>
      </FormControl>
      
      {/* Export Options */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 1.5, 
          mt: 2, 
          border: 1, 
          borderColor: 'divider',
          borderRadius: 1
        }}
      >
        <Box 
          display="flex" 
          justifyContent="space-between" 
          alignItems="center"
          sx={{ cursor: 'pointer' }}
          onClick={() => setShowOptions(!showOptions)}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <SettingsIcon fontSize="small" color="action" />
            <Typography variant="subtitle2">Export Options</Typography>
          </Box>
          {showOptions ? <CollapseIcon /> : <ExpandIcon />}
        </Box>
        
        <Collapse in={showOptions}>
          <Box mt={2}>
            <FormControlLabel
              control={
                <Switch 
                  checked={includeBranding} 
                  onChange={(e) => setIncludeBranding(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="body2">Include hospital branding</Typography>
              }
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={includeImages} 
                  onChange={(e) => setIncludeImages(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="body2">Include key images</Typography>
              }
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={includeSignature} 
                  onChange={(e) => setIncludeSignature(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="body2">Include digital signature</Typography>
              }
            />
          </Box>
        </Collapse>
      </Paper>
      
      {/* Progress Bar */}
      {exportProgress > 0 && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress variant="determinate" value={exportProgress} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {exportProgress < 100 ? 'Generating export...' : 'Complete!'}
          </Typography>
        </Box>
      )}
      
      {/* Export Button */}
      <Button
        variant="contained"
        color="primary"
        fullWidth
        size="large"
        startIcon={exporting ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
        onClick={handleExport}
        disabled={exporting || !state.reportId}
        sx={{ mt: 2 }}
      >
        {exporting ? 'Exporting...' : `Export as ${selectedFormatInfo?.name || 'PDF'}`}
      </Button>
      
      <Divider sx={{ my: 2 }} />
      
      {/* Quick Actions */}
      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
        Quick Actions
      </Typography>
      <Box display="flex" gap={1} flexWrap="wrap">
        <Button
          variant="outlined"
          size="small"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
        >
          Print
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<EmailIcon />}
          disabled
        >
          Email
        </Button>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      {/* Export Info */}
      <Paper elevation={1} sx={{ p: 2, bgcolor: 'info.light' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          📄 Export Guide
        </Typography>
        <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
          • <strong>PDF:</strong> Best for printing, sharing, and archival
        </Typography>
        <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
          • <strong>DICOM SR:</strong> For PACS integration (requires signed report)
        </Typography>
        <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
          • <strong>FHIR:</strong> For EHR/EMR interoperability (Epic, Cerner)
        </Typography>
        <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
          • <strong>JSON:</strong> For data processing and custom integrations
        </Typography>
        <Typography variant="caption" component="div">
          • <strong>Text:</strong> For quick copy/paste to other systems
        </Typography>
      </Paper>
    </Box>
  );
};

export default ExportPanel;
