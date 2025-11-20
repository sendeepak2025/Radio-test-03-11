import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Refresh,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Storage,
  Memory,
  Speed,
  Backup,
  Download
} from '@mui/icons-material';

export default function MonitoringDashboard() {
  const [health, setHealth] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingBackup, setCreatingBackup] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [healthRes, metricsRes, alertsRes, backupsRes] = await Promise.all([
        fetch('/api/monitoring/health', { credentials: 'include' }),
        fetch('/api/monitoring/metrics', { credentials: 'include' }),
        fetch('/api/monitoring/alerts', { credentials: 'include' }),
        fetch('/api/monitoring/backups', { credentials: 'include' })
      ]);

      const [healthData, metricsData, alertsData, backupsData] = await Promise.all([
        healthRes.json(),
        metricsRes.ok ? metricsRes.json() : null,
        alertsRes.ok ? alertsRes.json() : null,
        backupsRes.ok ? backupsRes.json() : null
      ]);

      setHealth(healthData);
      setMetrics(metricsData);
      setAlerts(alertsData?.alerts || []);
      setBackups(backupsData?.backups || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const response = await fetch('/api/monitoring/backups/create', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to create backup');

      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingBackup(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'degraded': return 'warning';
      case 'unhealthy': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle color="success" />;
      case 'warn': return <Warning color="warning" />;
      case 'fail': return <ErrorIcon color="error" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">System Monitoring</Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            startIcon={<Backup />}
            onClick={handleCreateBackup}
            disabled={creatingBackup}
          >
            {creatingBackup ? 'Creating...' : 'Create Backup'}
          </Button>
          <IconButton onClick={fetchData}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Health Status */}
      {health && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Overall Health</Typography>
              <Chip
                label={health.health.status.toUpperCase()}
                color={getStatusColor(health.health.status)}
              />
            </Box>

            <Grid container spacing={2} sx={{ mt: 2 }}>
              {Object.entries(health.health.checks).map(([key, value]: [string, any]) => (
                <Grid item xs={6} sm={3} key={key}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getStatusIcon(value)}
                    <Typography variant="body2">
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Active Alerts</Typography>
            {alerts.map((alert, idx) => (
              <Alert key={idx} severity={alert.severity} sx={{ mb: 1 }}>
                {alert.message}
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Metrics */}
      {metrics && (
        <Grid container spacing={3}>
          {/* System Metrics */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Speed />
                  <Typography variant="h6">System</Typography>
                </Box>

                <Typography variant="body2" color="text.secondary">
                  Uptime: {metrics.system.uptime.formatted}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Platform: {metrics.system.system.platform} ({metrics.system.system.arch})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  CPUs: {metrics.system.system.cpus}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Memory Metrics */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Memory />
                  <Typography variant="h6">Memory</Typography>
                </Box>

                <Typography variant="body2" color="text.secondary">
                  Heap Used: {metrics.system.process.memory.heapUsed.formatted}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Heap Total: {metrics.system.process.memory.heapTotal.formatted}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  RSS: {metrics.system.process.memory.rss.formatted}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Database Metrics */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Storage />
                  <Typography variant="h6">Database</Typography>
                </Box>

                <Typography variant="body2" color="text.secondary">
                  Status: {metrics.database.connected ? 'Connected' : 'Disconnected'}
                </Typography>
                {metrics.database.connected && (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      Collections: {metrics.database.collections}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Data Size: {metrics.database.dataSize.formatted}
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Cache Metrics */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Cache</Typography>

                <Typography variant="body2" color="text.secondary">
                  Hits: {metrics.cache.hits}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Misses: {metrics.cache.misses}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Hit Rate: {(metrics.cache.hitRate * 100).toFixed(1)}%
                </Typography>

                <Box sx={{ mt: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={metrics.cache.hitRate * 100}
                    color={metrics.cache.hitRate > 0.7 ? 'success' : 'warning'}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Backups */}
      {backups.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Recent Backups</Typography>
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Created</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {backups.slice(0, 10).map((backup, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{backup.name}</TableCell>
                      <TableCell>{backup.size}</TableCell>
                      <TableCell>{new Date(backup.created).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
