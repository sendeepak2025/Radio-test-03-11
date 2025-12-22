/**
 * Report Versions Panel
 * Full audit trail for report versioning
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
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  History as HistoryIcon,
  Add as AddIcon,
  Edit as EditIcon,
  CheckCircle as SignedIcon,
  Compare as CompareIcon,
  ExpandMore as ExpandIcon,
  Description as DocIcon,
  Warning as AmendIcon,
  Build as CorrectionIcon,
  Verified as VerifiedIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface ReportVersionsPanelProps {
  reportId: string;
  reportStatus: string;
  onVersionCreated?: (version: any) => void;
}

interface ReportVersion {
  _id: string;
  reportId: string;
  version: number;
  versionType: 'original' | 'addendum' | 'amendment' | 'correction' | 'draft';
  signedAt?: string;
  signedByName?: string;
  changeDetails: {
    reason: string;
    summary?: string;
    fieldsChanged?: string[];
    addendumContent?: string;
    diff?: Record<string, { old: string; new: string }>;
  };
  attestations?: Array<{
    attestedByName: string;
    attestedByRole: string;
    attestedAt: string;
    attestationType: string;
  }>;
  contentHash: string;
}

const ReportVersionsPanel: React.FC<ReportVersionsPanelProps> = ({
  reportId,
  reportStatus,
  onVersionCreated
}) => {
  const [versions, setVersions] = useState<ReportVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Addendum dialog
  const [showAddendumDialog, setShowAddendumDialog] = useState(false);
  const [addendumData, setAddendumData] = useState({
    content: '',
    reason: ''
  });
  
  // Amendment dialog
  const [showAmendmentDialog, setShowAmendmentDialog] = useState(false);
  const [amendmentData, setAmendmentData] = useState({
    field: 'impression',
    newValue: '',
    reason: ''
  });
  
  // Compare dialog
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [compareVersions, setCompareVersions] = useState({ v1: 0, v2: 0 });
  const [comparison, setComparison] = useState<any>(null);

  useEffect(() => {
    loadVersions();
  }, [reportId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      const response = await fetch(`/api/report-versions/${reportId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions || []);
      }
    } catch (err: any) {
      console.error('Failed to load versions:', err);
    } finally {
      setLoading(false);
    }
  };

  const createAddendum = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      const response = await fetch(`/api/report-versions/${reportId}/addendum`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(addendumData)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create addendum');
      }
      
      const data = await response.json();
      setVersions([data.version, ...versions]);
      setShowAddendumDialog(false);
      setAddendumData({ content: '', reason: '' });
      
      if (onVersionCreated) {
        onVersionCreated(data.version);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createAmendment = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      const response = await fetch(`/api/report-versions/${reportId}/amendment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          updates: { [amendmentData.field]: amendmentData.newValue },
          reason: amendmentData.reason
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create amendment');
      }
      
      const data = await response.json();
      setVersions([data.version, ...versions]);
      setShowAmendmentDialog(false);
      setAmendmentData({ field: 'impression', newValue: '', reason: '' });
      
      if (onVersionCreated) {
        onVersionCreated(data.version);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadComparison = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      const response = await fetch(
        `/api/report-versions/${reportId}/compare/${compareVersions.v1}/${compareVersions.v2}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        setComparison(data.comparison);
      }
    } catch (err: any) {
      console.error('Failed to load comparison:', err);
    } finally {
      setLoading(false);
    }
  };

  const getVersionIcon = (type: string) => {
    switch (type) {
      case 'original': return <SignedIcon color="success" />;
      case 'addendum': return <AddIcon color="info" />;
      case 'amendment': return <AmendIcon color="warning" />;
      case 'correction': return <CorrectionIcon color="error" />;
      default: return <DocIcon />;
    }
  };

  const getVersionColor = (type: string) => {
    switch (type) {
      case 'original': return 'success';
      case 'addendum': return 'info';
      case 'amendment': return 'warning';
      case 'correction': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not signed';
    return new Date(dateString).toLocaleString();
  };

  const canModify = reportStatus === 'final' || reportStatus === 'amended';

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon color="primary" />
          Version History
        </Typography>
        <Box>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={loadVersions}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {versions.length >= 2 && (
            <Tooltip title="Compare Versions">
              <IconButton size="small" onClick={() => setShowCompareDialog(true)}>
                <CompareIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Action Buttons */}
      {canModify && (
        <Box display="flex" gap={1} mb={2}>
          <Button
            variant="outlined"
            color="info"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setShowAddendumDialog(true)}
          >
            Add Addendum
          </Button>
          <Button
            variant="outlined"
            color="warning"
            size="small"
            startIcon={<EditIcon />}
            onClick={() => setShowAmendmentDialog(true)}
          >
            Amend Report
          </Button>
        </Box>
      )}

      {loading && <CircularProgress size={24} sx={{ display: 'block', mx: 'auto', my: 2 }} />}

      {versions.length === 0 && !loading && (
        <Paper elevation={1} sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
          <HistoryIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            No version history yet. Sign the report to create the first version.
          </Typography>
        </Paper>
      )}

      {/* Version Timeline */}
      {versions.length > 0 && (
        <Box>
          {versions.map((version, index) => (
            <Accordion key={version._id} defaultExpanded={index === 0}>
              <AccordionSummary expandIcon={<ExpandIcon />}>
                <Box display="flex" alignItems="center" gap={2} width="100%">
                  {getVersionIcon(version.versionType)}
                  <Box flex={1}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      Version {version.version}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(version.signedAt)}
                    </Typography>
                  </Box>
                  <Chip 
                    label={version.versionType.toUpperCase()} 
                    color={getVersionColor(version.versionType) as any}
                    size="small"
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  {/* Signed By */}
                  {version.signedByName && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Signed by:</strong> {version.signedByName}
                    </Typography>
                  )}
                  
                  {/* Reason */}
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Reason:</strong> {version.changeDetails.reason}
                  </Typography>
                  
                  {/* Summary */}
                  {version.changeDetails.summary && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Summary:</strong> {version.changeDetails.summary}
                    </Typography>
                  )}
                  
                  {/* Addendum Content */}
                  {version.changeDetails.addendumContent && (
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'info.light', mt: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Addendum Content:
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {version.changeDetails.addendumContent}
                      </Typography>
                    </Paper>
                  )}
                  
                  {/* Fields Changed */}
                  {version.changeDetails.fieldsChanged && version.changeDetails.fieldsChanged.length > 0 && (
                    <Box mt={1}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Fields Changed:
                      </Typography>
                      <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
                        {version.changeDetails.fieldsChanged.map(field => (
                          <Chip key={field} label={field} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  )}
                  
                  {/* Diff */}
                  {version.changeDetails.diff && Object.keys(version.changeDetails.diff).length > 0 && (
                    <Box mt={2}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Changes:
                      </Typography>
                      {Object.entries(version.changeDetails.diff).map(([field, diff]: [string, any]) => (
                        <Paper key={field} elevation={0} sx={{ p: 1, mb: 1, bgcolor: 'grey.100' }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                            {field}:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                            <Box flex={1}>
                              <Typography variant="caption" color="error.main">Old:</Typography>
                              <Typography variant="body2" sx={{ bgcolor: 'error.light', p: 0.5, borderRadius: 1 }}>
                                {diff.old || '(empty)'}
                              </Typography>
                            </Box>
                            <Box flex={1}>
                              <Typography variant="caption" color="success.main">New:</Typography>
                              <Typography variant="body2" sx={{ bgcolor: 'success.light', p: 0.5, borderRadius: 1 }}>
                                {diff.new || '(empty)'}
                              </Typography>
                            </Box>
                          </Box>
                        </Paper>
                      ))}
                    </Box>
                  )}
                  
                  {/* Attestations */}
                  {version.attestations && version.attestations.length > 0 && (
                    <Box mt={2}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Attestations:
                      </Typography>
                      {version.attestations.map((att, i) => (
                        <Box key={i} display="flex" alignItems="center" gap={1}>
                          <VerifiedIcon color="success" fontSize="small" />
                          <Typography variant="body2">
                            {att.attestedByName} ({att.attestedByRole}) - {att.attestationType}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                  
                  {/* Content Hash */}
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                    Content Hash: {version.contentHash?.substring(0, 16)}...
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {/* Addendum Dialog */}
      <Dialog open={showAddendumDialog} onClose={() => setShowAddendumDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AddIcon color="info" />
            Add Addendum
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            An addendum adds new information to a signed report without modifying the original content.
          </Alert>
          
          <TextField
            fullWidth
            label="Reason for Addendum"
            value={addendumData.reason}
            onChange={(e) => setAddendumData({ ...addendumData, reason: e.target.value })}
            required
            sx={{ mb: 2, mt: 1 }}
            placeholder="e.g., Additional clinical information received"
          />
          
          <TextField
            fullWidth
            label="Addendum Content"
            value={addendumData.content}
            onChange={(e) => setAddendumData({ ...addendumData, content: e.target.value })}
            multiline
            rows={6}
            required
            placeholder="Enter the additional information..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddendumDialog(false)}>Cancel</Button>
          <Button 
            variant="contained"
            color="info"
            onClick={createAddendum}
            disabled={!addendumData.content || !addendumData.reason || loading}
          >
            Create Addendum
          </Button>
        </DialogActions>
      </Dialog>

      {/* Amendment Dialog */}
      <Dialog open={showAmendmentDialog} onClose={() => setShowAmendmentDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AmendIcon color="warning" />
            Amend Report
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            An amendment corrects existing content in a signed report. The original content will be preserved in version history.
          </Alert>
          
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Field to Amend</InputLabel>
            <Select
              value={amendmentData.field}
              label="Field to Amend"
              onChange={(e) => setAmendmentData({ ...amendmentData, field: e.target.value })}
            >
              <MenuItem value="clinicalHistory">Clinical History</MenuItem>
              <MenuItem value="technique">Technique</MenuItem>
              <MenuItem value="findingsText">Findings</MenuItem>
              <MenuItem value="impression">Impression</MenuItem>
              <MenuItem value="recommendations">Recommendations</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Reason for Amendment"
            value={amendmentData.reason}
            onChange={(e) => setAmendmentData({ ...amendmentData, reason: e.target.value })}
            required
            sx={{ mb: 2 }}
            placeholder="e.g., Correction of typographical error"
          />
          
          <TextField
            fullWidth
            label="New Value"
            value={amendmentData.newValue}
            onChange={(e) => setAmendmentData({ ...amendmentData, newValue: e.target.value })}
            multiline
            rows={6}
            required
            placeholder="Enter the corrected content..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAmendmentDialog(false)}>Cancel</Button>
          <Button 
            variant="contained"
            color="warning"
            onClick={createAmendment}
            disabled={!amendmentData.newValue || !amendmentData.reason || loading}
          >
            Create Amendment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Compare Dialog */}
      <Dialog open={showCompareDialog} onClose={() => setShowCompareDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CompareIcon color="primary" />
            Compare Versions
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" gap={2} mb={2} mt={1}>
            <FormControl fullWidth>
              <InputLabel>Version 1</InputLabel>
              <Select
                value={compareVersions.v1}
                label="Version 1"
                onChange={(e) => setCompareVersions({ ...compareVersions, v1: Number(e.target.value) })}
              >
                {versions.map(v => (
                  <MenuItem key={v.version} value={v.version}>
                    Version {v.version} ({v.versionType})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Version 2</InputLabel>
              <Select
                value={compareVersions.v2}
                label="Version 2"
                onChange={(e) => setCompareVersions({ ...compareVersions, v2: Number(e.target.value) })}
              >
                {versions.map(v => (
                  <MenuItem key={v.version} value={v.version}>
                    Version {v.version} ({v.versionType})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button 
              variant="contained" 
              onClick={loadComparison}
              disabled={!compareVersions.v1 || !compareVersions.v2 || compareVersions.v1 === compareVersions.v2}
            >
              Compare
            </Button>
          </Box>
          
          {comparison && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Comparing Version {comparison.version1.version} ({comparison.version1.versionType}) 
                with Version {comparison.version2.version} ({comparison.version2.versionType})
              </Typography>
              
              {comparison.fieldsChanged.length === 0 ? (
                <Alert severity="info">No differences found between these versions.</Alert>
              ) : (
                comparison.fieldsChanged.map((field: string) => (
                  <Paper key={field} elevation={1} sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {field}
                    </Typography>
                    <Box display="flex" gap={2}>
                      <Box flex={1}>
                        <Typography variant="caption" color="text.secondary">
                          Version {comparison.version1.version}:
                        </Typography>
                        <Paper elevation={0} sx={{ p: 1, bgcolor: 'grey.100', mt: 0.5 }}>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {comparison.diff[field]?.version1 || '(empty)'}
                          </Typography>
                        </Paper>
                      </Box>
                      <Box flex={1}>
                        <Typography variant="caption" color="text.secondary">
                          Version {comparison.version2.version}:
                        </Typography>
                        <Paper elevation={0} sx={{ p: 1, bgcolor: 'grey.100', mt: 0.5 }}>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {comparison.diff[field]?.version2 || '(empty)'}
                          </Typography>
                        </Paper>
                      </Box>
                    </Box>
                  </Paper>
                ))
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCompareDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportVersionsPanel;
