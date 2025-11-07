/**
 * Report Preview Dialog
 * Full report preview before signing or exporting
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Paper,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  Visibility as PreviewIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Close as CloseIcon
} from '@mui/icons-material';

interface ReportPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  reportData: {
    reportId?: string;
    patientName: string;
    patientID: string;
    modality: string;
    studyDate?: string;
    clinicalHistory: string;
    technique: string;
    findingsText: string;
    impression: string;
    recommendations: string;
    findings: any[];
    anatomicalMarkings: any[];
    keyImages: any[];
    reportStatus: string;
    createdAt?: Date;
    lastSaved?: Date;
  };
  canvasRef?: React.RefObject<HTMLCanvasElement>; // For capturing canvas snapshot
}

const ReportPreviewDialog: React.FC<ReportPreviewDialogProps> = ({
  open,
  onClose,
  reportData,
  canvasRef
}) => {
  const [canvasSnapshot, setCanvasSnapshot] = React.useState<string | null>(null);
  
  // Capture canvas snapshot when dialog opens
  React.useEffect(() => {
    if (open && canvasRef?.current) {
      try {
        const dataUrl = canvasRef.current.toDataURL('image/png');
        setCanvasSnapshot(dataUrl);
      } catch (error) {
        console.error('Failed to capture canvas:', error);
      }
    }
  }, [open, canvasRef]);
  
  const handlePrint = () => {
    window.print();
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <PreviewIcon color="primary" />
            <Typography variant="h6">Report Preview</Typography>
          </Box>
          <Chip 
            label={reportData.reportStatus.toUpperCase()} 
            color={reportData.reportStatus === 'final' ? 'success' : 'default'}
            size="small"
          />
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
          {/* Header */}
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
              Medical Imaging Report
            </Typography>
            {reportData.reportId && (
              <Typography variant="caption" color="text.secondary">
                Report ID: {reportData.reportId}
              </Typography>
            )}
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          {/* Patient Information */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Patient Information
            </Typography>
            <Stack spacing={0.5}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Patient Name:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{reportData.patientName}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Patient ID:</Typography>
                <Typography variant="body2">{reportData.patientID}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Modality:</Typography>
                <Typography variant="body2">{reportData.modality}</Typography>
              </Box>
              {reportData.studyDate && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Study Date:</Typography>
                  <Typography variant="body2">{reportData.studyDate}</Typography>
                </Box>
              )}
            </Stack>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          {/* Clinical History */}
          {reportData.clinicalHistory && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Clinical History
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {reportData.clinicalHistory}
              </Typography>
            </Box>
          )}
          
          {/* Technique */}
          {reportData.technique && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Technique
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {reportData.technique}
              </Typography>
            </Box>
          )}
          
          {/* Structured Findings */}
          {reportData.findings && reportData.findings.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Structured Findings
              </Typography>
              <List dense>
                {reportData.findings.map((finding, index) => (
                  <ListItem key={finding.id || index} sx={{ pl: 0 }}>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {finding.location}
                          </Typography>
                          <Chip 
                            label={finding.severity} 
                            size="small"
                            color={
                              finding.severity === 'critical' ? 'error' :
                              finding.severity === 'severe' ? 'warning' :
                              'default'
                            }
                          />
                          {finding.aiDetected && (
                            <Chip label="AI" size="small" color="info" />
                          )}
                        </Box>
                      }
                      secondary={finding.description}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          
          {/* Findings */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Findings
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {reportData.findingsText || 'No findings documented.'}
            </Typography>
          </Box>
          
          {/* Impression */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Impression
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontWeight: 'bold' }}>
              {reportData.impression || 'No impression documented.'}
            </Typography>
          </Box>
          
          {/* Recommendations */}
          {reportData.recommendations && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Recommendations
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {reportData.recommendations}
              </Typography>
            </Box>
          )}
          
          {/* Anatomical Markings with Visual */}
          {reportData.anatomicalMarkings && reportData.anatomicalMarkings.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Anatomical Markings
              </Typography>
              
              {/* Canvas Snapshot */}
              {canvasSnapshot && (
                <Box sx={{ mb: 2 }}>
                  <Paper elevation={2} sx={{ p: 1, display: 'inline-block' }}>
                    <img 
                      src={canvasSnapshot} 
                      alt="Anatomical diagram with markings"
                      style={{ 
                        maxWidth: '100%', 
                        height: 'auto',
                        border: '1px solid #ddd'
                      }}
                    />
                    <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
                      Anatomical Diagram with Markings
                    </Typography>
                  </Paper>
                </Box>
              )}
              
              {/* Marking Details */}
              <List dense>
                {reportData.anatomicalMarkings.map((marking, index) => (
                  <ListItem key={marking.id || index} sx={{ pl: 0 }}>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box 
                            sx={{ 
                              width: 12, 
                              height: 12, 
                              borderRadius: '50%', 
                              bgcolor: marking.color || '#ff0000',
                              border: 1,
                              borderColor: 'divider'
                            }} 
                          />
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {marking.type.toUpperCase()}: {marking.anatomicalLocation}
                          </Typography>
                        </Box>
                      }
                      secondary={`View: ${marking.view} | Coordinates: (${Math.round(marking.coordinates.x)}, ${Math.round(marking.coordinates.y)})`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          
          {/* Key Images */}
          {reportData.keyImages && reportData.keyImages.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Key Images
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
                {reportData.keyImages.map((image, index) => (
                  <Paper key={image.id || index} elevation={2} sx={{ p: 1 }}>
                    <img 
                      src={image.dataUrl} 
                      alt={image.description || `Key image ${index + 1}`}
                      style={{ 
                        width: '100%', 
                        height: 'auto',
                        border: '1px solid #ddd'
                      }}
                    />
                    {image.description && (
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        {image.description}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" display="block">
                      Image {index + 1} of {reportData.keyImages.length}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Box>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          {/* Footer */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Report Status: {reportData.reportStatus.toUpperCase()}
            </Typography>
            {reportData.lastSaved && (
              <Typography variant="caption" color="text.secondary" display="block">
                Last Saved: {reportData.lastSaved.toLocaleString()}
              </Typography>
            )}
          </Box>
        </Paper>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handlePrint} startIcon={<PrintIcon />}>
          Print
        </Button>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportPreviewDialog;
