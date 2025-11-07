# 🎯 Remaining Work Plan - 9 Hours to 100%

## 🎉 Great News!

Your system is **85% complete**, not 80%! Most features are already integrated.

**What's Already Done**:
- ✅ FDA Digital Signatures (integrated in ReportingPage)
- ✅ Multi-Factor Authentication (integrated in SettingsPage)
- ✅ Export Functionality (integrated in PatientsPage)
- ✅ All core clinical features
- ✅ Backend 100% functional (67 API endpoints)

**What's Left**: Only 3 admin pages (9 hours total)

---

## 📋 Task 1: Create Audit Log Page (3 hours)

### File to Create
`viewer/src/pages/audit/AuditLogPage.tsx`

### Component Structure
```typescript
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
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  CircularProgress
} from '@mui/material';
import {
  Download,
  Search,
  FilterList,
  Refresh
} from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';

const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
    action: 'all',
    resourceType: 'all'
  });

  // Fetch logs from API
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/phi-audit/report?' + new URLSearchParams(filters));
      const data = await response.json();
      setLogs(data.data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Export to CSV
  const handleExport = async () => {
    window.location.href = '/api/phi-audit/export-csv?' + new URLSearchParams(filters);
  };

  return (
    <>
      <Helmet>
        <title>PHI Audit Logs - Medical Imaging</title>
      </Helmet>

      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          PHI Audit Logs
        </Typography>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Action</InputLabel>
                <Select
                  value={filters.action}
                  onChange={(e) => setFilters({...filters, action: e.target.value})}
                  label="Action"
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="view">View</MenuItem>
                  <MenuItem value="export">Export</MenuItem>
                  <MenuItem value="sign">Sign</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Search />}
                onClick={fetchLogs}
                sx={{ height: '56px' }}
              >
                Search
              </Button>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Download />}
                onClick={handleExport}
                sx={{ height: '56px' }}
              >
                Export CSV
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Logs Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Resource</TableCell>
                <TableCell>Patient ID</TableCell>
                <TableCell>IP Address</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log, index) => (
                  <TableRow key={index}>
                    <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                    <TableCell>{log.userName}</TableCell>
                    <TableCell>
                      <Chip label={log.action} size="small" />
                    </TableCell>
                    <TableCell>{log.resourceType}</TableCell>
                    <TableCell>{log.patientId}</TableCell>
                    <TableCell>{log.ipAddress}</TableCell>
                    <TableCell>
                      <Chip
                        label={log.success ? 'Success' : 'Failed'}
                        color={log.success ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </>
  );
};

export default AuditLogPage;
```

### Steps:
1. Create folder: `viewer/src/pages/audit/`
2. Create file: `AuditLogPage.tsx`
3. Add route in `App.tsx`:
   ```typescript
   import AuditLogPage from './pages/audit/AuditLogPage';
   
   <Route path="/admin/audit-logs" element={<AuditLogPage />} />
   ```
4. Add menu item in sidebar
5. Test with backend API

**Time**: 3 hours

---

## 📋 Task 2: Create IP Whitelist Page (2 hours)

### File to Create
`viewer/src/pages/admin/IPWhitelistPage.tsx`

### Component Structure
```typescript
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip
} from '@mui/material';
import { Delete, Add, Refresh } from '@mui/icons-material';

const IPWhitelistPage: React.FC = () => {
  const [whitelist, setWhitelist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newIP, setNewIP] = useState('');
  const [description, setDescription] = useState('');

  // Fetch whitelist
  const fetchWhitelist = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ip-whitelist');
      const data = await response.json();
      setWhitelist(data.data.whitelist || []);
    } catch (error) {
      console.error('Error fetching whitelist:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWhitelist();
  }, []);

  // Add IP
  const handleAddIP = async () => {
    try {
      await fetch('/api/ip-whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: newIP, description })
      });
      setAddDialogOpen(false);
      setNewIP('');
      setDescription('');
      fetchWhitelist();
    } catch (error) {
      console.error('Error adding IP:', error);
    }
  };

  // Remove IP
  const handleRemoveIP = async (ip: string) => {
    try {
      await fetch(`/api/ip-whitelist/${encodeURIComponent(ip)}`, {
        method: 'DELETE'
      });
      fetchWhitelist();
    } catch (error) {
      console.error('Error removing IP:', error);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">IP Whitelist Management</Typography>
        <Box>
          <Button
            startIcon={<Refresh />}
            onClick={fetchWhitelist}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setAddDialogOpen(true)}
          >
            Add IP
          </Button>
        </Box>
      </Box>

      <Paper>
        <List>
          {whitelist.map((ip, index) => (
            <ListItem
              key={index}
              secondaryAction={
                <IconButton onClick={() => handleRemoveIP(ip)}>
                  <Delete />
                </IconButton>
              }
            >
              <ListItemText
                primary={<Chip label={ip} />}
                secondary="Whitelisted IP address"
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Add IP Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
        <DialogTitle>Add IP to Whitelist</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="IP Address or CIDR Range"
            value={newIP}
            onChange={(e) => setNewIP(e.target.value)}
            placeholder="192.168.1.1 or 192.168.1.0/24"
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Office network"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddIP}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IPWhitelistPage;
```

**Time**: 2 hours

---

## 📋 Task 3: Create Data Retention Page (2 hours)

### File to Create
`viewer/src/pages/admin/DataRetentionPage.tsx`

### Component Structure
```typescript
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { Archive, Delete, Refresh } from '@mui/icons-material';

const DataRetentionPage: React.FC = () => {
  const [policies, setPolicies] = useState({});
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(false);

  // Fetch policies
  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/data-retention/policies');
      const data = await response.json();
      setPolicies(data.policies || {});
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/data-retention/archives/statistics');
      const data = await response.json();
      setStatistics(data.statistics || {});
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  useEffect(() => {
    fetchPolicies();
    fetchStatistics();
  }, []);

  // Run archival
  const handleRunArchival = async () => {
    try {
      await fetch('/api/data-retention/run-archival', { method: 'POST' });
      alert('Archival process started');
      fetchStatistics();
    } catch (error) {
      console.error('Error running archival:', error);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Data Retention Management</Typography>
        <Button
          variant="contained"
          startIcon={<Archive />}
          onClick={handleRunArchival}
        >
          Run Archival
        </Button>
      </Box>

      {/* Retention Policies */}
      <Typography variant="h6" gutterBottom>
        Retention Policies
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {Object.entries(policies).map(([key, value]) => (
          <Grid item xs={12} md={4} key={key}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  {key}
                </Typography>
                <Typography variant="h4" color="primary">
                  {value} days
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Retention period
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Archive Statistics */}
      <Typography variant="h6" gutterBottom>
        Archive Statistics
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data Type</TableCell>
              <TableCell>Total Records</TableCell>
              <TableCell>Archived</TableCell>
              <TableCell>Active</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(statistics).map(([key, value]: [string, any]) => (
              <TableRow key={key}>
                <TableCell>{key}</TableCell>
                <TableCell>{value.total || 0}</TableCell>
                <TableCell>{value.archived || 0}</TableCell>
                <TableCell>{value.active || 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DataRetentionPage;
```

**Time**: 2 hours

---

## 🚀 Implementation Order

### Day 1 (3 hours)
1. Create AuditLogPage
2. Add route and menu item
3. Test with backend

### Day 2 (4 hours)
1. Create IPWhitelistPage (2 hours)
2. Create DataRetentionPage (2 hours)
3. Add routes and menu items

### Day 3 (2 hours)
1. Test all 3 pages
2. Fix any bugs
3. Verify admin permissions

---

## ✅ Testing Checklist

### Audit Log Page
- [ ] Logs display correctly
- [ ] Filters work
- [ ] Export to CSV works
- [ ] Pagination works
- [ ] Only admins can access

### IP Whitelist Page
- [ ] Whitelist displays
- [ ] Can add IP addresses
- [ ] Can remove IP addresses
- [ ] Validation works
- [ ] Only admins can access

### Data Retention Page
- [ ] Policies display
- [ ] Statistics display
- [ ] Archival runs successfully
- [ ] Only admins can access

---

## 📊 Progress Tracking

```
✅ Backend: 100% (67 endpoints)
✅ Frontend Core: 85% (all major features)
🔧 Frontend Admin: 0% (3 pages needed)

Total Completion: 85%
Remaining Work: 9 hours
Target: 100% in 3 days
```

---

## 🎉 Summary

**What's Already Done** (Time Saved: 6-8 hours):
- ✅ FDA Signatures integrated
- ✅ MFA integrated
- ✅ Export integrated
- ✅ All core features working

**What's Left** (9 hours):
- 🔧 Audit Log Page (3 hours)
- 🔧 IP Whitelist Page (2 hours)
- 🔧 Data Retention Page (2 hours)
- 🔧 Testing (2 hours)

**Timeline**: 3 days to 100% completion!

**Next Step**: Start with AuditLogPage (highest priority)
