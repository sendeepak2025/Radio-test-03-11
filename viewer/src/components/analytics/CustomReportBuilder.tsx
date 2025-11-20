/**
 * Custom Report Builder Component
 * Allows users to create custom analytics reports
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  ShowChart as LineChartIcon,
  BubbleChart as ScatterIcon,
} from '@mui/icons-material';

interface MetricOption {
  id: string;
  name: string;
  category: string;
}

interface VisualizationType {
  id: string;
  name: string;
  icon: React.ReactNode;
}

interface FilterOption {
  field: string;
  operator: string;
  value: string;
}

interface CustomReport {
  name: string;
  metrics: string[];
  visualizationType: string;
  filters: FilterOption[];
  dateRange: string;
}

const metricsOptions: MetricOption[] = [
  { id: 'totalReports', name: 'Total Reports', category: 'Reports' },
  { id: 'signedReports', name: 'Signed Reports', category: 'Reports' },
  { id: 'draftReports', name: 'Draft Reports', category: 'Reports' },
  { id: 'avgTAT', name: 'Average Turnaround Time', category: 'Performance' },
  { id: 'medianTAT', name: 'Median Turnaround Time', category: 'Performance' },
  { id: 'activeUsers', name: 'Active Users', category: 'Users' },
  { id: 'totalSessions', name: 'Total Sessions', category: 'Users' },
  { id: 'aiUsage', name: 'AI Usage Count', category: 'AI' },
  { id: 'aiAcceptance', name: 'AI Acceptance Rate', category: 'AI' },
  { id: 'criticalFindings', name: 'Critical Findings', category: 'Quality' },
  { id: 'addendumRate', name: 'Addendum Rate', category: 'Quality' },
  { id: 'templateUsage', name: 'Template Usage', category: 'Templates' },
];

const visualizationTypes: VisualizationType[] = [
  { id: 'bar', name: 'Bar Chart', icon: <BarChartIcon /> },
  { id: 'line', name: 'Line Chart', icon: <LineChartIcon /> },
  { id: 'pie', name: 'Pie Chart', icon: <PieChartIcon /> },
  { id: 'scatter', name: 'Scatter Plot', icon: <ScatterIcon /> },
];

interface CustomReportBuilderProps {
  onSave: (report: CustomReport) => void;
  onClose: () => void;
  open: boolean;
}

export const CustomReportBuilder: React.FC<CustomReportBuilderProps> = ({
  onSave,
  onClose,
  open,
}) => {
  const [reportName, setReportName] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [selectedVisualization, setSelectedVisualization] = useState('bar');
  const [filters, setFilters] = useState<FilterOption[]>([]);
  const [dateRange, setDateRange] = useState('30');

  const handleMetricToggle = (metricId: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metricId)
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  const handleAddFilter = () => {
    setFilters(prev => [...prev, { field: 'modality', operator: 'equals', value: '' }]);
  };

  const handleRemoveFilter = (index: number) => {
    setFilters(prev => prev.filter((_, i) => i !== index));
  };

  const handleFilterChange = (index: number, field: keyof FilterOption, value: string) => {
    setFilters(prev =>
      prev.map((filter, i) =>
        i === index ? { ...filter, [field]: value } : filter
      )
    );
  };

  const handleSave = () => {
    const report: CustomReport = {
      name: reportName,
      metrics: selectedMetrics,
      visualizationType: selectedVisualization,
      filters,
      dateRange,
    };
    onSave(report);
    handleReset();
  };

  const handleReset = () => {
    setReportName('');
    setSelectedMetrics([]);
    setSelectedVisualization('bar');
    setFilters([]);
    setDateRange('30');
  };

  const groupedMetrics = metricsOptions.reduce((acc, metric) => {
    if (!acc[metric.category]) {
      acc[metric.category] = [];
    }
    acc[metric.category].push(metric);
    return acc;
  }, {} as Record<string, MetricOption[]>);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Custom Report Builder</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Report Name */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Report Name"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder="e.g., Monthly Performance Summary"
            />
          </Grid>

          {/* Date Range */}
          <Grid item xs={12}>
            <TextField
              select
              fullWidth
              label="Date Range"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <MenuItem value="7">Last 7 days</MenuItem>
              <MenuItem value="30">Last 30 days</MenuItem>
              <MenuItem value="90">Last 90 days</MenuItem>
              <MenuItem value="180">Last 6 months</MenuItem>
              <MenuItem value="365">Last year</MenuItem>
            </TextField>
          </Grid>

          {/* Metrics Selection */}
          <Grid item xs={12}>
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend">Select Metrics</FormLabel>
              <Box sx={{ mt: 2 }}>
                {Object.entries(groupedMetrics).map(([category, metrics]) => (
                  <Box key={category} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      {category}
                    </Typography>
                    <FormGroup>
                      {metrics.map(metric => (
                        <FormControlLabel
                          key={metric.id}
                          control={
                            <Checkbox
                              checked={selectedMetrics.includes(metric.id)}
                              onChange={() => handleMetricToggle(metric.id)}
                            />
                          }
                          label={metric.name}
                        />
                      ))}
                    </FormGroup>
                  </Box>
                ))}
              </Box>
            </FormControl>
          </Grid>

          {/* Visualization Type */}
          <Grid item xs={12}>
            <FormLabel component="legend">Visualization Type</FormLabel>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {visualizationTypes.map(viz => (
                <Grid item xs={6} sm={3} key={viz.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: 2,
                      borderColor: selectedVisualization === viz.id ? 'primary.main' : 'transparent',
                      '&:hover': { borderColor: 'primary.light' },
                    }}
                    onClick={() => setSelectedVisualization(viz.id)}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      {viz.icon}
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {viz.name}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Filters */}
          <Grid item xs={12}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <FormLabel>Filters</FormLabel>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddFilter}
              >
                Add Filter
              </Button>
            </Box>
            {filters.map((filter, index) => (
              <Paper key={index} sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={3}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={filter.field}
                      onChange={(e) => handleFilterChange(index, 'field', e.target.value)}
                    >
                      <MenuItem value="modality">Modality</MenuItem>
                      <MenuItem value="status">Status</MenuItem>
                      <MenuItem value="user">User</MenuItem>
                      <MenuItem value="template">Template</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={filter.operator}
                      onChange={(e) => handleFilterChange(index, 'operator', e.target.value)}
                    >
                      <MenuItem value="equals">Equals</MenuItem>
                      <MenuItem value="contains">Contains</MenuItem>
                      <MenuItem value="greater">Greater than</MenuItem>
                      <MenuItem value="less">Less than</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={5}>
                    <TextField
                      fullWidth
                      size="small"
                      value={filter.value}
                      onChange={(e) => handleFilterChange(index, 'value', e.target.value)}
                      placeholder="Value"
                    />
                  </Grid>
                  <Grid item xs={1}>
                    <IconButton size="small" onClick={() => handleRemoveFilter(index)}>
                      <CloseIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Grid>

          {/* Preview */}
          {selectedMetrics.length > 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Selected Metrics:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedMetrics.map(metricId => {
                    const metric = metricsOptions.find(m => m.id === metricId);
                    return (
                      <Chip
                        key={metricId}
                        label={metric?.name}
                        onDelete={() => handleMetricToggle(metricId)}
                        color="primary"
                        size="small"
                      />
                    );
                  })}
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleReset}>Reset</Button>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!reportName || selectedMetrics.length === 0}
          startIcon={<SaveIcon />}
        >
          Save Report
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomReportBuilder;
