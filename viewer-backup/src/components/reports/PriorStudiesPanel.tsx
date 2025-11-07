import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid
} from '@mui/material'
import {
  History as HistoryIcon,
  Visibility as ViewIcon,
  Compare as CompareIcon,
  Description as ReportIcon
} from '@mui/icons-material'

interface PriorReport {
  reportId: string
  studyInstanceUID: string
  studyDate: string
  modality: string
  studyDescription: string
  findings: string
  impression: string
  finalizedAt: string
  finalizedBy: {
    username: string
  }
}

interface PriorStudiesPanelProps {
  patientID: string
  currentStudyUID?: string
}

const PriorStudiesPanel: React.FC<PriorStudiesPanelProps> = ({ patientID, currentStudyUID }) => {
  const [priorReports, setPriorReports] = useState<PriorReport[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedReport, setSelectedReport] = useState<PriorReport | null>(null)
  const [viewDialog, setViewDialog] = useState(false)

  useEffect(() => {
    if (patientID) {
      fetchPriorReports()
    }
  }, [patientID])

  const fetchPriorReports = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/reports/patient/${patientID}?limit=10`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      })
      const data = await response.json()
      
      if (data.success) {
        // Filter out current study
        const filtered = data.reports.filter(
          (r: PriorReport) => r.studyInstanceUID !== currentStudyUID
        )
        setPriorReports(filtered)
      }
    } catch (error) {
      console.error('Failed to fetch prior reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewReport = (report: PriorReport) => {
    setSelectedReport(report)
    setViewDialog(true)
  }

  const handleCompareStudy = (report: PriorReport) => {
    // Open study in new tab for comparison
    window.open(`/viewer/${report.studyInstanceUID}`, '_blank')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (priorReports.length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No prior studies found for this patient
      </Alert>
    )
  }

  return (
    <Box>
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon />
          <Typography variant="h6">
            Prior Studies ({priorReports.length})
          </Typography>
        </Box>
      </Box>

      <List sx={{ maxHeight: 600, overflow: 'auto' }}>
        {priorReports.map((report, index) => (
          <React.Fragment key={report.reportId}>
            {index > 0 && <Divider />}
            <ListItem
              secondaryAction={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => handleViewReport(report)}
                  >
                    View
                  </Button>
                  <Button
                    size="small"
                    startIcon={<CompareIcon />}
                    onClick={() => handleCompareStudy(report)}
                  >
                    Compare
                  </Button>
                </Box>
              }
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {formatDate(report.studyDate)}
                    </Typography>
                    <Chip label={report.modality} size="small" />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {report.studyDescription}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Reported by {report.finalizedBy?.username} on {formatDate(report.finalizedAt)}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          </React.Fragment>
        ))}
      </List>

      {/* View Report Dialog */}
      <Dialog
        open={viewDialog}
        onClose={() => setViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReportIcon />
            Prior Study Report - {selectedReport && formatDate(selectedReport.studyDate)}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Chip label={selectedReport.modality} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {selectedReport.studyDescription}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Findings
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                      {selectedReport.findings || 'No findings recorded'}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Impression
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                      {selectedReport.impression || 'No impression recorded'}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Finalized by {selectedReport.finalizedBy?.username} on {formatDate(selectedReport.finalizedAt)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>Close</Button>
          <Button
            variant="contained"
            startIcon={<CompareIcon />}
            onClick={() => {
              if (selectedReport) handleCompareStudy(selectedReport)
              setViewDialog(false)
            }}
          >
            Open for Comparison
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default PriorStudiesPanel
