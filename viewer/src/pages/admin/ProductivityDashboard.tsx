/**
 * Productivity Analytics Dashboard
 * Tracks radiologist productivity, modality metrics, and time-of-day analysis
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Paper,
  Typography,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import ApiService from '../../services/ApiService';

export const ProductivityDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [productivityData, setProductivityData] = useState<any>(null);

  useEffect(() => {
    loadProductivityData();
  }, [dateRange]);

  const loadProductivityData = async () => {
    setLoading(true);
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date(
        Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000
      ).toISOString();

      const result = await ApiService.getDashboardAnalytics(startDate, endDate);
      
      if (result.success) {
        setProductivityData(generateMockProductivityData());
      }
    } catch (error) {
      console.error('Failed to load productivity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockProductivityData = () => ({
    radiologists: [
      {
        id: 1,
        name: 'Dr. Smith',
        reportsCompleted: 245,
        avgTAT: 32,
        accuracy: 98.5,
        productivity: 92,
      },
      {
        id: 2,
        name: 'Dr. Johnson',
        reportsCompleted: 198,
        avgTAT: 28,
        accuracy: 99.1,
        productivity: 88,
      },
      {
        id: 3,
        name: 'Dr. Williams',
        reportsCompleted: 312,
        avgTAT: 25,
        accuracy: 97.8,
        productivity: 95,
      },
    ],
    timeOfDay: [
      { hour: '6-8', reports: 12 },
      { hour: '8-10', reports: 45 },
      { hour: '10-12', reports: 67 },
      { hour: '12-14', reports: 38 },
      { hour: '14-16', reports: 72 },
      { hour: '16-18', reports: 54 },
      { hour: '18-20', reports: 23 },
      { hour: '20-22', reports: 8 },
    ],
    modalityBreakdown: [
      { modality: 'CT', reports: 145, avgTAT: 35 },
      { modality: 'MRI', reports: 98, avgTAT: 42 },
      { modality: 'X-Ray', reports: 234, avgTAT: 18 },
      { modality: 'Ultrasound', reports: 67, avgTAT: 25 },
    ],
    weeklyTrend: [
      { week: 'Week 1', reports: 123, avgTAT: 30 },
      { week: 'Week 2', reports: 145, avgTAT: 28 },
      { week: 'Week 3', reports: 167, avgTAT: 26 },
      { week: 'Week 4', reports: 189, avgTAT: 24 },
    ],
    skillRadar: [
      { skill: 'Speed', value: 85 },
      { skill: 'Accuracy', value: 92 },
      { skill: 'Consistency', value: 88 },
      { skill: 'Complexity Handling', value: 78 },
      { skill: 'AI Utilization', value: 75 },
    ],
  });

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  const data = productivityData;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          Productivity Analytics
        </Typography>
        <TextField
          select
          size="small"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          sx={{ width: 150 }}
        >
          <MenuItem value="7">Last 7 days</MenuItem>
          <MenuItem value="30">Last 30 days</MenuItem>
          <MenuItem value="90">Last 90 days</MenuItem>
        </TextField>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Total Reports
                  </Typography>
                  <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold', mt: 1 }}>
                    {data.radiologists.reduce((sum: number, r: any) => sum + r.reportsCompleted, 0)}
                  </Typography>
                </Box>
                <CheckIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Avg Productivity
                  </Typography>
                  <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold', mt: 1 }}>
                    {(data.radiologists.reduce((sum: number, r: any) => sum + r.productivity, 0) / data.radiologists.length).toFixed(0)}%
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Avg TAT
                  </Typography>
                  <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold', mt: 1 }}>
                    {(data.radiologists.reduce((sum: number, r: any) => sum + r.avgTAT, 0) / data.radiologists.length).toFixed(0)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>
                    minutes
                  </Typography>
                </Box>
                <SpeedIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Avg Accuracy
                  </Typography>
                  <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold', mt: 1 }}>
                    {(data.radiologists.reduce((sum: number, r: any) => sum + r.accuracy, 0) / data.radiologists.length).toFixed(1)}%
                  </Typography>
                </Box>
                <ScheduleIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Radiologist Performance Table */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Radiologist Performance
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Radiologist</TableCell>
                    <TableCell align="right">Reports</TableCell>
                    <TableCell align="right">Avg TAT</TableCell>
                    <TableCell align="right">Accuracy</TableCell>
                    <TableCell align="right">Productivity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.radiologists.map((rad: any) => (
                    <TableRow key={rad.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                            {rad.name.substring(4, 5)}
                          </Avatar>
                          {rad.name}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Chip label={rad.reportsCompleted} color="primary" size="small" />
                      </TableCell>
                      <TableCell align="right">{rad.avgTAT} min</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${rad.accuracy}%`}
                          color={rad.accuracy >= 98 ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={rad.productivity}
                            sx={{ width: 80, height: 8, borderRadius: 4 }}
                          />
                          <Typography variant="body2">{rad.productivity}%</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Skills Radar */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Overall Skills Analysis
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={data.skillRadar}>
                <PolarGrid />
                <PolarAngleAxis dataKey="skill" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar
                  name="Performance"
                  dataKey="value"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Time of Day Analysis */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Reports by Time of Day
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.timeOfDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="reports" fill="#82ca9d" name="Reports Completed" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Modality Performance */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Performance by Modality
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.modalityBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="modality" />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="reports" fill="#8884d8" name="Reports" />
                <Bar yAxisId="right" dataKey="avgTAT" fill="#ffc658" name="Avg TAT (min)" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Weekly Trend */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Weekly Performance Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="reports"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Reports"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgTAT"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  name="Avg TAT (min)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProductivityDashboard;
