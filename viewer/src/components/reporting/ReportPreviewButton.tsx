/**
 * Report Preview Button
 * Reusable button to preview any report
 */

import React, { useState } from 'react';
import { IconButton, Tooltip, CircularProgress } from '@mui/material';
import { Visibility as PreviewIcon } from '@mui/icons-material';
import ReportPreviewDialog from './ReportPreviewDialog';
import { reportsApi } from '../../services/ReportsApi';

interface ReportPreviewButtonProps {
  reportId: string;
  size?: 'small' | 'medium' | 'large';
  tooltip?: string;
}

export const ReportPreviewButton: React.FC<ReportPreviewButtonProps> = ({
  reportId,
  size = 'small',
  tooltip = 'Preview Report'
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await reportsApi.get(reportId);
      const report = response.report;
      
      // Fetch template if templateId exists
      let templateSections = [];
      if (report.templateId) {
        try {
          const templateResponse = await reportsApi.getTemplate(report.templateId);
          templateSections = templateResponse.data?.sections || [];
        } catch (err) {
          console.warn('Failed to fetch template:', err);
        }
      }
      
      // Transform report data for preview dialog
      setReportData({
        reportId: report.reportId || report._id,
        patientName: report.patientName,
        patientID: report.patientID,
        modality: report.modality,
        studyDate: report.studyDate,
        templateId: report.templateId,
        templateName: report.templateName,
        templateSections: templateSections,
        sections: report.sections || {},
        clinicalHistory: report.clinicalHistory || '',
        technique: report.technique || '',
        findingsText: report.findingsText || report.findings || '',
        impression: report.impression || '',
        recommendations: report.recommendations || '',
        findings: report.findings || [],
        anatomicalMarkings: report.anatomicalMarkings || [],
        keyImages: report.keyImages || [],
        reportStatus: report.reportStatus || 'draft',
        createdAt: report.createdAt,
        lastSaved: report.updatedAt,
        signedAt: report.signedAt,
        signedBy: report.radiologistName,
        signatureUrl: report.radiologistSignatureUrl,
        radiologistSignature: report.radiologistSignature
      });
      
      setOpen(true);
    } catch (err: any) {
      console.error('Failed to load report:', err);
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Tooltip title={error || tooltip}>
        <span>
          <IconButton
            size={size}
            onClick={handlePreview}
            disabled={loading}
            color="primary"
          >
            {loading ? <CircularProgress size={20} /> : <PreviewIcon fontSize={size} />}
          </IconButton>
        </span>
      </Tooltip>

      {reportData && (
        <ReportPreviewDialog
          open={open}
          onClose={() => setOpen(false)}
          reportData={reportData}
        />
      )}
    </>
  );
};

export default ReportPreviewButton;
