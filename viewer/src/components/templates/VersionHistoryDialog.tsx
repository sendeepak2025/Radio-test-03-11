import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Paper,
  Grid
} from '@mui/material';
import {
  History,
  Restore,
  CompareArrows
} from '@mui/icons-material';

interface VersionHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  templateId: string;
  onRestore?: (version: any) => void;
}

export default function VersionHistoryDialog({
  open,
  onClose,
  templateId,
  onRestore
}: VersionHistoryDialogProps) {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<any>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (open && templateId) {
      fetchVersions();
    }
  }, [open, templateId]);

  const fetchVersions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/template-marketplace/templates/${templateId}/versions`,
        { credentials: 'include' }
      );

      if (!response.ok) throw new Error('Failed to fetch version history');

      const data = await response.json();
      setVersions(data.versions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (version: any) => {
    if (!window.confirm(`Restore to version ${version.version}? This will create a new version.`)) {
      return;
    }

    setRestoring(true);
    
    try {
      const response = await fetch(
        `/api/template-marketplace/templates/${templateId}/versions/${version.version}/restore`,
        {
          method: 'POST',
          credentials: 'include'
        }
      );

      if (!response.ok) throw new Error('Failed to restore version');

      const data = await response.json();
      
      if (onRestore) {
        onRestore(data.template);
      }
      
      await fetchVersions();
      setSelectedVersion(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRestoring(false);
    }
  };

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'major':
        return 'error';
      case 'minor':
        return 'warning';
      case 'patch':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <History />
          Version History
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : versions.length === 0 ? (
          <Alert severity="info">No version history available</Alert>
        ) : (
          <List>
            {versions.map((version, index) => (
              <React.Fragment key={version._id}>
                <ListItem
                  alignItems="flex-start"
                  onClick={() => setSelectedVersion(version)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: selectedVersion?._id === version._id ? 'action.selected' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6">
                          Version {version.version}
                        </Typography>
                        
                        <Chip
                          label={version.changeType?.toUpperCase()}
                          size="small"
                          color={getChangeTypeColor(version.changeType)}
                        />
                        
                        {version.isActive && (
                          <Chip label="ACTIVE" size="small" color="success" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {version.changeDescription}
                        </Typography>
                        
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Created by: {version.createdByName}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Date: {new Date(version.createdAt).toLocaleString()}
                            </Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary">
                              Sections: {version.metadata?.totalSections || version.structure?.sections?.length || 0}
                              {' '}
                              ({version.metadata?.requiredSections || 0} required,{' '}
                              {version.metadata?.optionalSections || 0} optional)
                            </Typography>
                          </Grid>
                        </Grid>

                        {version.changeLog && version.changeLog.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" fontWeight="bold" color="text.secondary">
                              Changes:
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>
                              {version.changeLog.slice(0, 3).map((change: any, idx: number) => (
                                <Chip
                                  key={idx}
                                  label={`${change.action}: ${change.section || change.field}`}
                                  size="small"
                                  sx={{ mr: 0.5, mb: 0.5 }}
                                />
                              ))}
                              {version.changeLog.length > 3 && (
                                <Chip
                                  label={`+${version.changeLog.length - 3} more`}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
                
                {index < versions.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}

        {selectedVersion && (
          <Paper sx={{ p: 2, mt: 2, bgcolor: 'action.hover' }}>
            <Typography variant="subtitle2" gutterBottom>
              Selected Version: {selectedVersion.version}
            </Typography>
            
            <Button
              size="small"
              startIcon={<Restore />}
              onClick={() => handleRestore(selectedVersion)}
              disabled={restoring || selectedVersion.isActive}
              sx={{ mt: 1 }}
            >
              {restoring ? 'Restoring...' : 'Restore This Version'}
            </Button>
          </Paper>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
