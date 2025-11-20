/**
 * Enhanced Analytics Dashboard Page
 * Integrates heatmaps, funnel charts, scatter plots, and custom report builder
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Assessment as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Description as ReportIcon,
  Speed as SpeedIcon,
  Psychology as AIIcon,
  Refresh as RefreshIcon,
  FileDownload as ExportIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import ApiService from '../../services/ApiService';
import { TATHeatmap } from '../../components/analytics/TATHeatmap';
import { FunnelChart } from '../../components/analytics/FunnelChart';
import { EnhancedScatterPlot } from '../../components/analytics/EnhancedScatterPlot';
import { CustomReportBuilder } from '../../components/analytics/CustomReportBuilder';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export const EnhancedAnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [tabValue, setTabValue] = useState(0);
  const [reportBuilderOpen, setReportBuilderOpen] = useState(false);
  
  const [dateRange, setDateRange] = useState('30');
  const [modality, setModality] = useState('all');
  
  const getDateRange = () => {
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString();
    return { startDate, endDate };
  };

  useEffect(() => {
    loadDashboardData();
  }, [dateRange, modality]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { startDate, endDate } = getDateRange();
      const result = await ApiService.getDashboardAnalytics(startDate, endDate);
      
      if (result.success) {
        setDashboardData({
          ...result.data,
          enhanced: generateEnhancedMockData(),
        });
      } else {
        setError(result.error || 'Failed to load analytics');
      }
    } catch (err: any) {
      console.error('Analytics error:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const generateEnhancedMockData = () => ({
    heatmapData: generateHeatmapData(),
    funnelData: [
      { name: 'Studies Received', value: 1000, color: '#0088FE' },
      { name: 'Reports Created', value: 950, color: '#00C49F' },
      { name: 'Reports Drafted', value: 920, color: '#FFBB28' },
      { name: 'Reports Reviewed', value: 880, color: '#FF8042' },
      { name: 'Reports Signed', value: 850, color: '#8884D8' },
    ],
    scatterData: generateScatterData(),
  });

  const generateHeatmapData = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const data = [];
    for (const day of days) {
      for (let hour = 0; hour < 24; hour++) {
        const value = Math.random() * 60 + 15;
        data.push({ day, hour, value });
      }
    }
    return data;
  };

  const generateScatterData = () => {
    return Array.from({ length: 50 }, (_, i) => ({
      x: Math.random() * 100 + 10,
      y: Math.random() * 50 + 5,
      z: Math.random() * 100,
      name: `Report ${i + 1}`,
    }));
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(dashboardData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveCustomReport = (report: any) => {
    console.log('Saving custom report:', report);
    setReportBuilderOpen(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={handleRefresh} sx={{ mt: 2 }}>Retry</Button>
      </Container>
    );
  }

  if (!dashboardData) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="info">No analytics data available</Alert>
      </Container>
    );
  }

  const { reports, users, templates, performance, ai, enhanced } = dashboardData;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AnalyticsIcon fontSize="large" color="primary" />
            Enhanced Analytics Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last {dateRange} days • Updated {new Date().toLocaleTimeString()}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setReportBuilderOpen(true)}
          >
            Custom Report
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExport}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              label="Date Range"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              size="small"
            >
              <MenuItem value="7">Last 7 days</MenuItem>
              <MenuItem value="30">Last 30 days</MenuItem>
              <MenuItem value="90">Last 90 days</MenuItem>
              <MenuItem value="180">Last 6 months</MenuItem>
              <MenuItem value="365">Last year</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              label="Modality"
              value={modality}
              onChange={(e) => setModality(e.target.value)}
              size="small"
            >
              <MenuItem value="all">All Modalities</MenuItem>
              <MenuItem value="CR">CR (X-Ray)</MenuItem>
              <MenuItem value="CT">CT</MenuItem>
              <MenuItem value="MR">MRI</MenuItem>
              <MenuItem value="US">Ultrasound</MenuItem>
              <MenuItem value="NM">Nuclear Medicine</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Total Reports
                  </Typography>
                  <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold', mt: 1 }}>
                    {reports?.totalReports || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 1 }}>
                    {reports?.signedReports || 0} signed
                  </Typography>
                </Box>
                <ReportIcon sx={{ fontSize: 64, color: 'rgba(255,255,255,0.3)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Avg Turnaround Time
                  </Typography>
                  <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold', mt: 1 }}>
                    {performance?.overall?.averageTAT || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 1 }}>
                    minutes
                  </Typography>
                </Box>
                <SpeedIcon sx={{ fontSize: 64, color: 'rgba(255,255,255,0.3)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Active Users
                  </Typography>
                  <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold', mt: 1 }}>
                    {users?.activeUsersCount || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 1 }}>
                    {users?.totalEvents || 0} events
                  </Typography>
                </Box>
                <PeopleIcon sx={{ fontSize: 64, color: 'rgba(255,255,255,0.3)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    AI Acceptance Rate
                  </Typography>
                  <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold', mt: 1 }}>
                    {ai?.acceptanceRate || 0}%
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 1 }}>
                    {ai?.totalAnalyses || 0} analyses
                  </Typography>
                </Box>
                <AIIcon sx={{ fontSize: 64, color: 'rgba(255,255,255,0.3)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for Different Views */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Overview" />
          <Tab label="Advanced Analytics" />
          <Tab label="Workflow Analysis" />
          <Tab label="Correlation Analysis" />
        </Tabs>
      </Paper>

      {/* Tab Panel 0: Overview */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Reports Over Time */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Reports Over Time
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reports?.reportsOverTime || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="Reports"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Status Breakdown */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Report Status
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Signed', value: reports?.signedReports || 0 },
                      { name: 'Draft', value: reports?.draftReports || 0 },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[0, 1].map((index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab Panel 1: Advanced Analytics */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {/* Heatmap */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Turnaround Time Heatmap (by Day & Hour)
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <TATHeatmap data={enhanced?.heatmapData || []} />
              </Box>
            </Paper>
          </Grid>

          {/* Modality Breakdown */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Reports by Modality
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reports?.modalityBreakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="modality" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#82ca9d" name="Reports" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Top Templates */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Top Templates
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={templates?.topTemplates?.slice(0, 5) || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="templateName" type="category" width={150} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="usageCount" fill="#8884d8" name="Usage Count" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab Panel 2: Workflow Analysis */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          {/* Funnel Chart */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Report Workflow Funnel
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Track report progression through workflow stages
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <FunnelChart data={enhanced?.funnelData || []} />
              </Box>
            </Paper>
          </Grid>

          {/* TAT by Modality */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                TAT by Modality
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={performance?.byModality || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="modality" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgTAT" fill="#ffc658" name="Avg TAT (min)" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab Panel 3: Correlation Analysis */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          {/* Scatter Plot: TAT vs Complexity */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <EnhancedScatterPlot
                data={enhanced?.scatterData || []}
                xLabel="Report Complexity Score"
                yLabel="Turnaround Time (min)"
                title="TAT vs Complexity Correlation"
                color="#8884d8"
              />
            </Paper>
          </Grid>

          {/* Scatter Plot: AI Usage vs Accuracy */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <EnhancedScatterPlot
                data={enhanced?.scatterData || []}
                xLabel="AI Usage Rate (%)"
                yLabel="Report Accuracy (%)"
                title="AI Usage vs Accuracy Correlation"
                color="#82ca9d"
              />
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Custom Report Builder Dialog */}
      <CustomReportBuilder
        open={reportBuilderOpen}
        onClose={() => setReportBuilderOpen(false)}
        onSave={handleSaveCustomReport}
      />
    </Container>
  );
};

export default EnhancedAnalyticsPage;
