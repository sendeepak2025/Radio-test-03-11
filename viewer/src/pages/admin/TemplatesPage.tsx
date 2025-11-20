/**
 * Templates Management Page
 * Manage report templates with CRUD operations
 * Route: /admin/templates
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab
} from '@mui/material';
import {
  Edit,
  Delete,
  FileCopy,
  Add,
  Refresh,
  Visibility,
  BarChart,
  CheckCircle,
  Cancel
} from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';
import { reportsApi } from '../../services/ReportsApi';
import type { ReportTemplate } from '../../types/reporting';
import TemplateCreationDialog from '../../components/templates/TemplateCreationDialog';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const TemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [cloneName, setCloneName] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch templates
  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await reportsApi.getTemplates(false); // Get all templates
      setTemplates(response.templates || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Handle view template
  const handleView = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setViewDialogOpen(true);
  };

  // Handle clone template
  const handleCloneClick = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setCloneName(`${template.name} (Copy)`);
    setCloneDialogOpen(true);
  };

  const handleCloneConfirm = async () => {
    if (!selectedTemplate) return;

    try {
      await reportsApi.cloneTemplate(selectedTemplate.templateId, cloneName);
      setSuccess(`Template "${selectedTemplate.name}" cloned successfully`);
      setCloneDialogOpen(false);
      setCloneName('');
      fetchTemplates();
    } catch (err: any) {
      setError(err.message || 'Failed to clone template');
    }
  };

  // Handle delete template
  const handleDeleteClick = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTemplate) return;

    try {
      await reportsApi.deleteTemplate(selectedTemplate.templateId);
      setSuccess(`Template "${selectedTemplate.name}" deleted successfully`);
      setDeleteDialogOpen(false);
      fetchTemplates();
    } catch (err: any) {
      setError(err.message || 'Failed to delete template');
    }
  };

  // Handle create template
  const handleCreateTemplate = async (template: Partial<ReportTemplate>) => {
    try {
      await reportsApi.createTemplate(template);
      setSuccess(`Template "${template.name}" created successfully`);
      setCreateDialogOpen(false);
      fetchTemplates();
    } catch (err: any) {
      setError(err.message || 'Failed to create template');
      throw err; // Re-throw to let dialog handle it
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchQuery === '' || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.category.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === 0) return matchesSearch; // All
    if (activeTab === 1) return matchesSearch && template.active; // Active
    if (activeTab === 2) return matchesSearch && !template.active; // Inactive
    if (activeTab === 3) return matchesSearch && template.isDefault; // Default
    if (activeTab === 4) return matchesSearch && !template.isDefault; // Custom

    return matchesSearch;
  });

  return (
    <Box sx={{ p: 3 }}>
      <Helmet>
        <title>Templates Management - Radiology Platform</title>
      </Helmet>

      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Report Templates
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchTemplates}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
            disabled={loading}
          >
            Create Template
          </Button>
        </Stack>
      </Stack>

      {/* Alert Messages */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Templates
              </Typography>
              <Typography variant="h4">{templates.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active
              </Typography>
              <Typography variant="h4">
                {templates.filter(t => t.active).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Default
              </Typography>
              <Typography variant="h4">
                {templates.filter(t => t.isDefault).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Custom
              </Typography>
              <Typography variant="h4">
                {templates.filter(t => !t.isDefault).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`All (${templates.length})`} />
          <Tab label={`Active (${templates.filter(t => t.active).length})`} />
          <Tab label={`Inactive (${templates.filter(t => !t.active).length})`} />
          <Tab label={`Default (${templates.filter(t => t.isDefault).length})`} />
          <Tab label={`Custom (${templates.filter(t => !t.isDefault).length})`} />
        </Tabs>
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            placeholder="Search templates by name, description, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
          />
        </Box>
      </Paper>

      {/* Templates Table */}
      <Paper>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Modality</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Sections</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="textSecondary" py={4}>
                        No templates found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTemplates.map((template) => (
                    <TableRow key={template.templateId} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {template.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {template.templateId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={template.category} size="small" />
                      </TableCell>
                      <TableCell>
                        {template.matchingCriteria.modalities.slice(0, 2).join(', ')}
                        {template.matchingCriteria.modalities.length > 2 && ' +'}
                      </TableCell>
                      <TableCell>{template.priority || 0}</TableCell>
                      <TableCell>
                        {template.active ? (
                          <Chip icon={<CheckCircle />} label="Active" color="success" size="small" />
                        ) : (
                          <Chip icon={<Cancel />} label="Inactive" color="default" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        {template.isDefault ? (
                          <Chip label="Default" color="primary" size="small" />
                        ) : (
                          <Chip label="Custom" color="secondary" size="small" />
                        )}
                      </TableCell>
                      <TableCell>{template.sections.length}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => handleView(template)}>
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Template">
                          <IconButton size="small" disabled>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Clone Template">
                          <IconButton size="small" onClick={() => handleCloneClick(template)}>
                            <FileCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Template">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(template)}
                            disabled={template.isDefault}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Stats">
                          <IconButton size="small" disabled>
                            <BarChart fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* View Template Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Template Details</DialogTitle>
        <DialogContent>
          {selectedTemplate && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>{selectedTemplate.name}</Typography>
                  <Typography color="textSecondary" gutterBottom>
                    {selectedTemplate.description}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Template ID</Typography>
                  <Typography variant="body1">{selectedTemplate.templateId}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Category</Typography>
                  <Typography variant="body1">{selectedTemplate.category}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Priority</Typography>
                  <Typography variant="body1">{selectedTemplate.priority || 0}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Version</Typography>
                  <Typography variant="body1">{selectedTemplate.version || '1.0'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>Modalities</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {selectedTemplate.matchingCriteria.modalities.map(mod => (
                      <Chip key={mod} label={mod} size="small" />
                    ))}
                  </Stack>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>Body Parts</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {selectedTemplate.matchingCriteria.bodyParts.map(bp => (
                      <Chip key={bp} label={bp} size="small" />
                    ))}
                  </Stack>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>Sections ({selectedTemplate.sections.length})</Typography>
                  {selectedTemplate.sections.map(section => (
                    <Box key={section.id} sx={{ mb: 1 }}>
                      <Typography variant="body2">
                        {section.order}. {section.title} {section.required && '*'}
                      </Typography>
                    </Box>
                  ))}
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Clone Template Dialog */}
      <Dialog open={cloneDialogOpen} onClose={() => setCloneDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Clone Template</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Clone template: <strong>{selectedTemplate?.name}</strong>
          </Typography>
          <TextField
            fullWidth
            label="New Template Name"
            value={cloneName}
            onChange={(e) => setCloneName(e.target.value)}
            margin="normal"
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloneDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCloneConfirm} variant="contained" disabled={!cloneName.trim()}>
            Clone
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Template Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm">
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete template: <strong>{selectedTemplate?.name}</strong>?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            This will deactivate the template. Reports using this template will not be affected.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Template Dialog */}
      <TemplateCreationDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreateTemplate={handleCreateTemplate}
      />
    </Box>
  );
};

export default TemplatesPage;
