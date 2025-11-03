import React, { useState } from 'react'
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel
} from '@mui/material'
import {
  Sync as SyncIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon
} from '@mui/icons-material'
import axios from 'axios'

interface SyncOHIFButtonProps {
  reportId: string
  studyInstanceUID: string
  onSyncComplete?: (data: {
    measurementsAdded: number
    findingsAdded: number
  }) => void
  disabled?: boolean
}

export const SyncOHIFButton: React.FC<SyncOHIFButtonProps> = ({
  reportId,
  studyInstanceUID,
  onSyncComplete,
  disabled
}) => {
  const [open, setOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [syncResult, setSyncResult] = useState<{
    measurementsAdded: number
    findingsAdded: number
    annotationsAdded: number
  } | null>(null)
  const [mergeStrategy, setMergeStrategy] = useState<'append' | 'replace'>('append')

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await axios.post(
        `/api/reports/${reportId}/sync-dicom-sr`,
        {
          studyInstanceUID,
          mergeStrategy
        }
      )

      if (response.data.success) {
        setSuccess(true)
        setSyncResult(response.data.data)
        onSyncComplete?.(response.data.data)

        // Auto-close after 2 seconds on success
        setTimeout(() => {
          setOpen(false)
          setSuccess(false)
        }, 2000)
      } else {
        setError(response.data.error || 'Sync failed')
      }
    } catch (err: any) {
      console.error('Sync error:', err)
      setError(err.response?.data?.error || 'Failed to sync OHIF data')
    } finally {
      setSyncing(false)
    }
  }

  const handleClose = () => {
    if (!syncing) {
      setOpen(false)
      setError(null)
      setSuccess(false)
    }
  }

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<SyncIcon />}
        onClick={() => setOpen(true)}
        disabled={disabled}
        size="small"
      >
        Import from OHIF
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <SyncIcon />
            Sync OHIF Measurements
          </Box>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && syncResult && (
            <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Successfully synced OHIF data!
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary={`${syncResult.measurementsAdded} measurements imported`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary={`${syncResult.findingsAdded} findings imported`}
                  />
                </ListItem>
                {syncResult.annotationsAdded > 0 && (
                  <ListItem>
                    <ListItemText 
                      primary={`${syncResult.annotationsAdded} annotations imported`}
                    />
                  </ListItem>
                )}
              </List>
            </Alert>
          )}

          {!success && (
            <>
              <Typography variant="body2" color="text.secondary" paragraph>
                This will import measurements, findings, and annotations from OHIF viewer
                (stored as DICOM SR in Orthanc) into this report.
              </Typography>

              <Alert severity="info" icon={<WarningIcon />} sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Make sure you've completed all measurements in OHIF before syncing.
                </Typography>
              </Alert>

              <FormControl component="fieldset" sx={{ mt: 2 }}>
                <FormLabel component="legend">Merge Strategy</FormLabel>
                <RadioGroup
                  value={mergeStrategy}
                  onChange={(e) => setMergeStrategy(e.target.value as 'append' | 'replace')}
                >
                  <FormControlLabel
                    value="append"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body2">
                          <strong>Append</strong> - Add to existing data
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Keeps current measurements and adds new ones from OHIF
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="replace"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body2">
                          <strong>Replace</strong> - Overwrite existing data
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Removes current measurements and replaces with OHIF data
                        </Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={syncing}>
            {success ? 'Close' : 'Cancel'}
          </Button>
          {!success && (
            <Button
              onClick={handleSync}
              variant="contained"
              disabled={syncing}
              startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
            >
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  )
}
