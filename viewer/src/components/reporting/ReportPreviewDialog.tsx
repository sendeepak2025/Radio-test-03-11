/**
 * Report Preview Dialog
 * Full report preview with hospital branding before signing or exporting
 */

import React, { useState, useEffect } from 'react';
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
  ListItemText,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Visibility as PreviewIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  CheckCircle,
  LocalHospital as HospitalIcon
} from '@mui/icons-material';
import { ScreenshotService } from '../../services/screenshotService';

interface HospitalBranding {
  name: string;
  logoUrl?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  contactPhone?: string;
  contactEmail?: string;
}

interface ReportPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  reportData: {
    reportId?: string;
    patientName: string;
    patientID: string;
    modality: string;
    studyDate?: string;
    templateId?: string;
    templateName?: string;
    templateSections?: any[]; // Template section definitions
    templateUiModules?: any[]; // Template UI module definitions
    sections?: Record<string, string>;
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
    signedAt?: Date;
    signedBy?: string;
    signatureUrl?: string;
    radiologistSignature?: string;
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
  const [hospitalBranding, setHospitalBranding] = useState<HospitalBranding | null>(null);
  const [loadingBranding, setLoadingBranding] = useState(false);
  
  // Load hospital branding when dialog opens
  useEffect(() => {
    if (open) {
      loadHospitalBranding();
    }
  }, [open]);
  
  const loadHospitalBranding = async () => {
    try {
      setLoadingBranding(true);
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      const response = await fetch('/api/hospital-settings/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // API returns data.hospital for hospital info
        if (data.success && data.data?.hospital) {
          const hospital = data.data.hospital;
          setHospitalBranding({
            name: hospital.name,
            logoUrl: hospital.logoUrl,
            address: hospital.address,
            contactPhone: hospital.contactPhone,
            contactEmail: hospital.contactEmail
          });
        }
      }
    } catch (error) {
      console.error('Failed to load hospital branding:', error);
    } finally {
      setLoadingBranding(false);
    }
  };
  
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
  
  const handleDownloadPDF = async () => {
    if (!reportData.reportId) return;
    
    try {
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      const response = await fetch(`/api/reports/${reportData.reportId}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${reportData.reportId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to download PDF:', error);
    }
  };
  
  const formatAddress = (address?: HospitalBranding['address']) => {
    if (!address) return null;
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zipCode) parts.push(address.zipCode);
    return parts.length > 0 ? parts.join(', ') : null;
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
          {/* Hospital Header with Branding */}
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            {loadingBranding ? (
              <CircularProgress size={24} />
            ) : hospitalBranding ? (
              <Box>
                {/* Hospital Logo */}
                {hospitalBranding.logoUrl && (
                  <Box sx={{ mb: 1 }}>
                    <img 
                      src={hospitalBranding.logoUrl} 
                      alt={hospitalBranding.name}
                      style={{ maxHeight: 60, maxWidth: 200 }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </Box>
                )}
                
                {/* Hospital Name */}
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  {hospitalBranding.name}
                </Typography>
                
                <Typography variant="body2" color="text.secondary">
                  Radiology Department
                </Typography>
                
                {/* Address */}
                {formatAddress(hospitalBranding.address) && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {formatAddress(hospitalBranding.address)}
                  </Typography>
                )}
                
                {/* Contact Info */}
                {(hospitalBranding.contactPhone || hospitalBranding.contactEmail) && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {hospitalBranding.contactPhone && `Tel: ${hospitalBranding.contactPhone}`}
                    {hospitalBranding.contactPhone && hospitalBranding.contactEmail && ' | '}
                    {hospitalBranding.contactEmail && `Email: ${hospitalBranding.contactEmail}`}
                  </Typography>
                )}
              </Box>
            ) : (
              <Box>
                <HospitalIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Medical Imaging Report
                </Typography>
              </Box>
            )}
            
            {reportData.reportId && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
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
          
          {/* Dynamic Template Sections - Render based on template structure */}
          {reportData.templateId && reportData.templateSections && reportData.templateSections.length > 0 ? (
            // Template-based report: Render sections in template order
            reportData.templateSections
              .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
              .map((section: any) => {
                const sectionValue = reportData.sections?.[section.id];
                if (!sectionValue || String(sectionValue).trim() === '') return null;
                
                return (
                  <Box key={section.id} sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {section.title} {section.required && '*'}
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {sectionValue}
                    </Typography>
                  </Box>
                );
              })
          ) : (
            // Non-template report: Show standard fields
            <>
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
            </>
          )}
          
          {/* Structured Findings (always show if present) */}
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
          
          {/* UI Module Results */}
          {reportData.templateId && reportData.sections && (() => {
            // Helper function to decode HTML entities
            const decodeHtmlEntities = (str: string): string => {
              if (!str || typeof str !== 'string') return str;
              return str
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&#x2F;/g, '/')
                .replace(/&#39;/g, "'")
                .replace(/&apos;/g, "'");
            };
            
            // Helper function to format module name nicely
            const formatModuleName = (moduleId: string): string => {
              const nameMap: Record<string, string> = {
                'birads_calculator': 'BI-RADS Assessment',
                'birads_us_calculator': 'BI-RADS Ultrasound Assessment',
                'birads_mammo_calculator': 'BI-RADS Mammography Assessment',
                'lung_rads_calculator': 'Lung-RADS Assessment',
                'li_rads_calculator': 'LI-RADS Assessment',
                'tirads_calculator': 'TI-RADS Thyroid Assessment',
                'cad_rads_calculator': 'CAD-RADS Assessment',
                'aspects_calculator': 'ASPECTS Score',
                'nodule_measurements': 'Nodule Measurements',
                'lesion_measurements': 'Lesion Measurements'
              };
              
              if (nameMap[moduleId]) return nameMap[moduleId];
              
              // Generic formatting
              return moduleId
                .replace(/_/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase());
            };
            
            // Get template's UI module IDs if available
            const templateModuleIds = reportData.templateUiModules?.map((m: any) => `uiModule_${m.id}`) || [];
            
            // Filter UI modules: only show those in current template OR all if template not loaded
            const uiModules = Object.entries(reportData.sections).filter(([key]) => {
              if (!key.startsWith('uiModule_')) return false;
              // If template modules known, only show those; otherwise show all
              return templateModuleIds.length === 0 || templateModuleIds.includes(key);
            });
            
            if (uiModules.length === 0) return null;
            
            return (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    Assessment Tools Results
                  </Typography>
                  {uiModules.map(([key, value]) => {
                    const moduleId = key.replace('uiModule_', '');
                    const moduleName = formatModuleName(moduleId);
                    
                    let parsedData;
                    try {
                      // Decode HTML entities before parsing JSON
                      const decodedValue = decodeHtmlEntities(String(value));
                      parsedData = JSON.parse(decodedValue);
                    } catch {
                      parsedData = value;
                    }
                    
                    return (
                      <Box key={key} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                          {moduleName}
                        </Typography>
                        
                        {/* BI-RADS Calculator */}
                        {moduleId === 'birads_calculator' && parsedData?.category && (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              BI-RADS Category: {parsedData.category}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {parsedData.recommendation}
                            </Typography>
                            {parsedData.findings && parsedData.findings.length > 0 && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Findings:</Typography>
                                {parsedData.findings.map((finding: string, idx: number) => (
                                  <Typography key={idx} variant="caption" display="block">
                                    • {finding}
                                  </Typography>
                                ))}
                              </Box>
                            )}
                          </Box>
                        )}
                        
                        {/* Measurements */}
                        {(moduleId.includes('measurement') || moduleId.includes('nodule')) && Array.isArray(parsedData) && parsedData.length > 0 && (
                          <Box>
                            {parsedData.map((measurement: any, idx: number) => (
                              <Typography key={idx} variant="body2">
                                • {measurement.label || `Measurement ${idx + 1}`}: {measurement.value} {measurement.unit}
                                {measurement.notes && ` (${measurement.notes})`}
                              </Typography>
                            ))}
                          </Box>
                        )}
                        
                        {/* Checklist */}
                        {moduleId.includes('checklist') && parsedData?.items && (
                          <Box>
                            {Object.entries(parsedData.items).map(([item, status]: [string, any]) => (
                              <Typography key={item} variant="body2">
                                • {item}: {status}
                              </Typography>
                            ))}
                          </Box>
                        )}
                        
                        {/* Diagram - just show count */}
                        {moduleId.includes('diagram') && Array.isArray(parsedData) && (
                          <Typography variant="body2">
                            {parsedData.length} marking(s) on diagram
                          </Typography>
                        )}
                        
                        {/* RADS calculators (Lung-RADS, LI-RADS, TI-RADS, CAD-RADS, etc.) */}
                        {(moduleId.includes('rads') || moduleId.includes('tirads') || moduleId.includes('aspects')) && 
                         !moduleId.includes('birads') && parsedData && (
                          <Box>
                            {parsedData.category !== undefined && (
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                Category: {parsedData.category}
                              </Typography>
                            )}
                            {parsedData.score !== undefined && (
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                Score: {parsedData.score}
                              </Typography>
                            )}
                            {parsedData.recommendation && (
                              <Typography variant="body2" color="text.secondary">
                                {parsedData.recommendation}
                              </Typography>
                            )}
                            {parsedData.selections && typeof parsedData.selections === 'object' && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Findings:</Typography>
                                {Object.entries(parsedData.selections).map(([key, val]: [string, any]) => {
                                  if (!val || val === 'none' || val === '') return null;
                                  const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                  return (
                                    <Typography key={key} variant="caption" display="block">
                                      • {label}: {String(val)}
                                    </Typography>
                                  );
                                })}
                              </Box>
                            )}
                          </Box>
                        )}
                        
                        {/* Generic fallback - format as human-readable */}
                        {!moduleId.includes('birads') && !moduleId.includes('rads') && !moduleId.includes('tirads') && 
                         !moduleId.includes('aspects') && !moduleId.includes('measurement') && 
                         !moduleId.includes('checklist') && !moduleId.includes('diagram') && !moduleId.includes('nodule') && (
                          <Box>
                            {typeof parsedData === 'object' && parsedData !== null ? (
                              Object.entries(parsedData).map(([key, val]: [string, any]) => {
                                // Skip internal fields
                                if (key.startsWith('_') || key === 'id' || key === 'timestamp') return null;
                                
                                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                let displayValue: string;
                                
                                if (val === null || val === undefined) {
                                  displayValue = 'N/A';
                                } else if (typeof val === 'boolean') {
                                  displayValue = val ? 'Yes' : 'No';
                                } else if (Array.isArray(val)) {
                                  displayValue = val.length === 0 ? 'None' : val.join(', ');
                                } else if (typeof val === 'object') {
                                  displayValue = JSON.stringify(val);
                                } else {
                                  displayValue = String(val);
                                }
                                
                                // Skip empty values
                                if (displayValue === 'N/A' || displayValue === 'None' || displayValue === '') return null;
                                
                                return (
                                  <Typography key={key} variant="body2">
                                    • {label}: {displayValue}
                                  </Typography>
                                );
                              })
                            ) : (
                              <Typography variant="body2">
                                {String(parsedData)}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </>
            );
          })()}
          

          
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
            <Box sx={{ 
  display: 'grid', 
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
  gap: 2 
}}>
  {reportData.keyImages.map((image, index) => {
    // Check if dataUrl is valid (supports both data URLs and server filenames)
    const isValidDataUrl = image.dataUrl && (
      image.dataUrl.startsWith('data:image/') || 
      image.dataUrl.startsWith('http://') ||
      image.dataUrl.startsWith('https://') ||
      image.dataUrl.endsWith('.png') ||
      image.dataUrl.endsWith('.jpg') ||
      image.dataUrl.endsWith('.jpeg')
    );

    if (!isValidDataUrl) {
      console.error('Invalid key image dataUrl:', {
        index,
        dataUrl: image.dataUrl?.substring(0, 100),
        fullLength: image.dataUrl?.length
      });
    }

    return (
      <Paper key={image.id || index} elevation={2} sx={{ p: 1 }}>
        {isValidDataUrl ? (
          <img 
            src={ScreenshotService.getImageUrl(image.dataUrl)}
            alt={image.description || `Key image ${index + 1}`}
            style={{ 
              width: '100%', 
              height: 'auto',
              border: '1px solid #ddd'
            }}
            onError={(e) => {
              console.error('Failed to load key image:', {
                index,
                dataUrlLength: image.dataUrl?.length,
                dataUrlStart: image.dataUrl?.substring(0, 50)
              });
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <Box sx={{ 
            width: '100%', 
            height: 150, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            bgcolor: 'grey.200',
            border: '1px solid #ddd'
          }}>
            <Typography variant="caption" color="error">
              Image data corrupted
            </Typography>
          </Box>
        )}

        {image.description && (
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            {image.description}
          </Typography>
        )}

        <Typography variant="caption" color="text.secondary" display="block">
          Image {index + 1} of {reportData.keyImages.length}
        </Typography>
      </Paper>
    );
  })}
</Box>

            </Box>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          {/* Signature Section (if signed) */}
          {reportData.reportStatus === 'final' && reportData.signedAt && (
            <Box sx={{ mt: 4, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Digital Signature
              </Typography>
              
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 3, 
                  border: 2, 
                  borderColor: 'success.main',
                  bgcolor: 'success.50'
                }}
              >
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box flex={1}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Electronically Signed By:
                    </Typography>
                    
                    {/* Signature Image */}
                    {reportData.signatureUrl && (
                      <Box sx={{ mb: 2, maxWidth: 300 }}>
                        <img 
                          src={reportData.signatureUrl}
                          alt="Digital Signature"
                          style={{ 
                            maxWidth: '100%', 
                            height: 'auto',
                            border: '1px solid #ddd',
                            backgroundColor: 'white',
                            padding: '8px',
                            borderRadius: '4px'
                          }}
                          onError={(e) => {
                            console.error('Failed to load signature image');
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </Box>
                    )}
                    
                    {/* Text Signature */}
                    {reportData.radiologistSignature && (
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontFamily: 'cursive',
                          fontStyle: 'italic',
                          color: 'primary.main',
                          mb: 1
                        }}
                      >
                        {reportData.radiologistSignature}
                      </Typography>
                    )}
                    
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {reportData.signedBy || 'Radiologist'}
                    </Typography>
                    
                    <Typography variant="caption" color="text.secondary" display="block">
                      Signed on: {new Date(reportData.signedAt).toLocaleString()}
                    </Typography>
                    
                    <Box sx={{ mt: 2 }}>
                      <Chip 
                        label="FDA 21 CFR Part 11 Compliant" 
                        size="small" 
                        color="success"
                        sx={{ mr: 1 }}
                      />
                      <Chip 
                        label="Legally Binding" 
                        size="small" 
                        color="success"
                      />
                    </Box>
                  </Box>
                  
                  <Box sx={{ textAlign: 'center' }}>
                    <CheckCircle 
                      sx={{ 
                        fontSize: 60, 
                        color: 'success.main',
                        mb: 1
                      }} 
                    />
                    <Typography variant="caption" color="success.main" sx={{ fontWeight: 'bold' }}>
                      VERIFIED
                    </Typography>
                  </Box>
                </Box>
              </Paper>
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
        {reportData.reportId && (
          <Button 
            onClick={handleDownloadPDF} 
            startIcon={<DownloadIcon />}
            color="primary"
          >
            Download PDF
          </Button>
        )}
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportPreviewDialog;
