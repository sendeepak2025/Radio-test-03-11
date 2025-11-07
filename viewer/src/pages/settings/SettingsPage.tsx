import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import {
  Save as SaveIcon,
  Refresh as ResetIcon,
  Palette as ThemeIcon,
  Visibility as ViewerIcon,
  Description as ReportIcon,
  CloudUpload as ExportIcon,
  Notifications as NotificationIcon,
  Storage as StorageIcon
} from '@mui/icons-material'
import { Helmet } from 'react-helmet-async'
import { MFASettings } from '../../components/settings/MFASettings'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

const SettingsPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'error' | null>(null)
  const [showResetDialog, setShowResetDialog] = useState(false)

  // User Preferences
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('dark')
  const [language, setLanguage] = useState('en')
  const [defaultLayout, setDefaultLayout] = useState('single')
  const [autoSave, setAutoSave] = useState(true)
  const [autoSaveInterval, setAutoSaveInterval] = useState(30)

  // Viewer Settings
  const [defaultWindowLevel, setDefaultWindowLevel] = useState('auto')
  const [measurementUnit, setMeasurementUnit] = useState('cm')
  const [annotationColor, setAnnotationColor] = useState('#ff0000')
  const [showAIOverlay, setShowAIOverlay] = useState(true)
  const [enableGPU, setEnableGPU] = useState(true)

  // Report Settings
  const [institutionName, setInstitutionName] = useState('Medical Imaging Center')
  const [departmentName, setDepartmentName] = useState('Radiology Department')
  const [radiologistName, setRadiologistName] = useState('Dr. Medical Professional')
  const [defaultTemplate, setDefaultTemplate] = useState('chest-xray')
  const [enableMacros, setEnableMacros] = useState(true)

  // Export Settings
  const [defaultExportFormat, setDefaultExportFormat] = useState('pdf')
  const [includeImages, setIncludeImages] = useState(true)
  const [includeSignature, setIncludeSignature] = useState(true)
  const [watermarkEnabled, setWatermarkEnabled] = useState(true)

  // System Settings
  const [backendURL, setBackendURL] = useState('http://localhost:3000')
  const [pacsURL, setPacsURL] = useState('')
  const [cacheSize, setCacheSize] = useState(500)
  const [enableLogging, setEnableLogging] = useState(true)

  // Notification Settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [criticalFindingsAlert, setCriticalFindingsAlert] = useState(true)
  const [reportStatusUpdates, setReportStatusUpdates] = useState(true)
  const [notificationEmail, setNotificationEmail] = useState('')

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('appSettings')
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        if (settings.theme) setTheme(settings.theme)
        if (settings.language) setLanguage(settings.language)
        if (settings.institutionName) setInstitutionName(settings.institutionName)
        if (settings.departmentName) setDepartmentName(settings.departmentName)
        if (settings.radiologistName) setRadiologistName(settings.radiologistName)
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }
  }, [])

  // Save settings
  const handleSave = () => {
    const settings = {
      theme,
      language,
      defaultLayout,
      autoSave,
      autoSaveInterval,
      defaultWindowLevel,
      measurementUnit,
      annotationColor,
      showAIOverlay,
      enableGPU,
      institutionName,
      departmentName,
      radiologistName,
      defaultTemplate,
      enableMacros,
      defaultExportFormat,
      includeImages,
      includeSignature,
      watermarkEnabled,
      backendURL,
      pacsURL,
      cacheSize,
      enableLogging,
      emailNotifications,
      criticalFindingsAlert,
      reportStatusUpdates,
      notificationEmail
    }

    try {
      localStorage.setItem('appSettings', JSON.stringify(settings))
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }

  // Reset to defaults
  const handleReset = () => {
    setTheme('dark')
    setLanguage('en')
    setDefaultLayout('single')
    setAutoSave(true)
    setAutoSaveInterval(30)
    setDefaultWindowLevel('auto')
    setMeasurementUnit('cm')
    setAnnotationColor('#ff0000')
    setShowAIOverlay(true)
    setEnableGPU(true)
    setInstitutionName('Medical Imaging Center')
    setDepartmentName('Radiology Department')
    setRadiologistName('Dr. Medical Professional')
    setDefaultTemplate('chest-xray')
    setEnableMacros(true)
    setDefaultExportFormat('pdf')
    setIncludeImages(true)
    setIncludeSignature(true)
    setWatermarkEnabled(true)
    setBackendURL('http://localhost:3000')
    setPacsURL('')
    setCacheSize(500)
    setEnableLogging(true)
    setEmailNotifications(true)
    setCriticalFindingsAlert(true)
    setReportStatusUpdates(true)
    setNotificationEmail('')
    
    localStorage.removeItem('appSettings')
    setShowResetDialog(false)
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus(null), 3000)
  }

  return (
    <>
      <Helmet>
        <title>Settings - Medical Imaging Viewer</title>
      </Helmet>

      <Box sx={{ width: '100%', height: '100%', bgcolor: '#f5f5f5' }}>
        {/* Header */}
        <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>
                ⚙️ Settings
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                Configure your medical imaging viewer preferences
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<ResetIcon />}
                onClick={() => setShowResetDialog(true)}
                sx={{
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,0.5)',
                  '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                Reset to Defaults
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                sx={{
                  bgcolor: '#4caf50',
                  '&:hover': { bgcolor: '#45a049' }
                }}
              >
                Save Changes
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={currentTab}
            onChange={(e, newValue) => setCurrentTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                minHeight: 64,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600
              }
            }}
          >
            <Tab icon={<ThemeIcon />} label="User Preferences" iconPosition="start" />
            <Tab icon={<ViewerIcon />} label="Viewer Settings" iconPosition="start" />
            <Tab icon={<ReportIcon />} label="Report Settings" iconPosition="start" />
            <Tab icon={<ExportIcon />} label="Export Settings" iconPosition="start" />
            <Tab icon={<StorageIcon />} label="System Settings" iconPosition="start" />
            <Tab icon={<NotificationIcon />} label="Notifications" iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Tab Panels */}
        <Paper>
          {/* User Preferences Tab */}
          <TabPanel value={currentTab} index={0}>
            <Typography variant="h6" sx={{ mb: 3, color: '#667eea', fontWeight: 700 }}>
              👤 User Preferences
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                      🎨 Appearance
                    </Typography>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Theme</InputLabel>
                      <Select value={theme} onChange={(e) => setTheme(e.target.value as any)} label="Theme">
                        <MenuItem value="light">☀️ Light</MenuItem>
                        <MenuItem value="dark">🌙 Dark</MenuItem>
                        <MenuItem value="auto">🔄 Auto (System)</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl fullWidth>
                      <InputLabel>Language</InputLabel>
                      <Select value={language} onChange={(e) => setLanguage(e.target.value)} label="Language">
                        <MenuItem value="en">🇺🇸 English</MenuItem>
                        <MenuItem value="es">🇪🇸 Spanish</MenuItem>
                        <MenuItem value="fr">🇫🇷 French</MenuItem>
                        <MenuItem value="de">🇩🇪 German</MenuItem>
                        <MenuItem value="zh">🇨🇳 Chinese</MenuItem>
                      </Select>
                    </FormControl>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                      📐 Default Layout
                    </Typography>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Viewer Layout</InputLabel>
                      <Select value={defaultLayout} onChange={(e) => setDefaultLayout(e.target.value)} label="Viewer Layout">
                        <MenuItem value="single">Single View</MenuItem>
                        <MenuItem value="2x1">2x1 Grid</MenuItem>
                        <MenuItem value="2x2">2x2 Grid</MenuItem>
                        <MenuItem value="3x3">3x3 Grid</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControlLabel
                      control={<Switch checked={autoSave} onChange={(e) => setAutoSave(e.target.checked)} />}
                      label="Enable Auto-Save"
                    />

                    {autoSave && (
                      <TextField
                        fullWidth
                        type="number"
                        label="Auto-Save Interval (seconds)"
                        value={autoSaveInterval}
                        onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                        sx={{ mt: 2 }}
                        InputProps={{ inputProps: { min: 10, max: 300 } }}
                      />
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <MFASettings />
              </Grid>
            </Grid>
          </TabPanel>

          {/* Viewer Settings Tab */}
          <TabPanel value={currentTab} index={1}>
            <Typography variant="h6" sx={{ mb: 3, color: '#667eea', fontWeight: 700 }}>
              👁️ Viewer Settings
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                      🖼️ Display Settings
                    </Typography>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Default Window/Level</InputLabel>
                      <Select value={defaultWindowLevel} onChange={(e) => setDefaultWindowLevel(e.target.value)} label="Default Window/Level">
                        <MenuItem value="auto">Auto</MenuItem>
                        <MenuItem value="lung">Lung</MenuItem>
                        <MenuItem value="bone">Bone</MenuItem>
                        <MenuItem value="brain">Brain</MenuItem>
                        <MenuItem value="abdomen">Abdomen</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Measurement Unit</InputLabel>
                      <Select value={measurementUnit} onChange={(e) => setMeasurementUnit(e.target.value)} label="Measurement Unit">
                        <MenuItem value="mm">Millimeters (mm)</MenuItem>
                        <MenuItem value="cm">Centimeters (cm)</MenuItem>
                        <MenuItem value="inch">Inches</MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      fullWidth
                      type="color"
                      label="Annotation Color"
                      value={annotationColor}
                      onChange={(e) => setAnnotationColor(e.target.value)}
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                      ⚡ Performance
                    </Typography>
                    <FormControlLabel
                      control={<Switch checked={showAIOverlay} onChange={(e) => setShowAIOverlay(e.target.checked)} />}
                      label="Show AI Overlay by Default"
                    />
                    <FormControlLabel
                      control={<Switch checked={enableGPU} onChange={(e) => setEnableGPU(e.target.checked)} />}
                      label="Enable GPU Acceleration"
                    />
                    <Alert severity="info" sx={{ mt: 2 }}>
                      GPU acceleration improves rendering performance for 3D volumes and large images.
                    </Alert>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Report Settings Tab */}
          <TabPanel value={currentTab} index={2}>
            <Typography variant="h6" sx={{ mb: 3, color: '#667eea', fontWeight: 700 }}>
              📋 Report Settings
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                      🏥 Institution Information
                    </Typography>
                    <TextField
                      fullWidth
                      label="Institution Name"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Department Name"
                      value={departmentName}
                      onChange={(e) => setDepartmentName(e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Default Radiologist Name"
                      value={radiologistName}
                      onChange={(e) => setRadiologistName(e.target.value)}
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                      📝 Report Preferences
                    </Typography>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Default Template</InputLabel>
                      <Select value={defaultTemplate} onChange={(e) => setDefaultTemplate(e.target.value)} label="Default Template">
                        <MenuItem value="chest-xray">Chest X-Ray</MenuItem>
                        <MenuItem value="ct-chest">CT Chest</MenuItem>
                        <MenuItem value="ct-abdomen">CT Abdomen</MenuItem>
                        <MenuItem value="mri-brain">MRI Brain</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControlLabel
                      control={<Switch checked={enableMacros} onChange={(e) => setEnableMacros(e.target.checked)} />}
                      label="Enable Text Macros"
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      Macros allow quick text expansion (e.g., .normal → "No acute abnormalities identified")
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Export Settings Tab */}
          <TabPanel value={currentTab} index={3}>
            <Typography variant="h6" sx={{ mb: 3, color: '#667eea', fontWeight: 700 }}>
              📤 Export Settings
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                      📄 Default Export Options
                    </Typography>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Default Format</InputLabel>
                      <Select value={defaultExportFormat} onChange={(e) => setDefaultExportFormat(e.target.value)} label="Default Format">
                        <MenuItem value="pdf">PDF</MenuItem>
                        <MenuItem value="docx">DOCX (Word)</MenuItem>
                        <MenuItem value="dicom-sr">DICOM SR</MenuItem>
                        <MenuItem value="hl7">HL7</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControlLabel
                      control={<Switch checked={includeImages} onChange={(e) => setIncludeImages(e.target.checked)} />}
                      label="Include Images by Default"
                    />
                    <FormControlLabel
                      control={<Switch checked={includeSignature} onChange={(e) => setIncludeSignature(e.target.checked)} />}
                      label="Include Signature by Default"
                    />
                    <FormControlLabel
                      control={<Switch checked={watermarkEnabled} onChange={(e) => setWatermarkEnabled(e.target.checked)} />}
                      label="Enable Watermarks (DRAFT/FINAL)"
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                      ℹ️ Export Information
                    </Typography>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                        ✅ PDF Export Features:
                      </Typography>
                      <Typography variant="caption" component="div">
                        • Embedded images<br />
                        • Digital signature<br />
                        • Watermarks<br />
                        • Professional formatting
                      </Typography>
                    </Alert>
                    <Alert severity="info">
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                        📋 DOCX Export Features:
                      </Typography>
                      <Typography variant="caption" component="div">
                        • Opens in Microsoft Word<br />
                        • Rich formatting<br />
                        • Editable content<br />
                        • Embedded images
                      </Typography>
                    </Alert>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* System Settings Tab */}
          <TabPanel value={currentTab} index={4}>
            <Typography variant="h6" sx={{ mb: 3, color: '#667eea', fontWeight: 700 }}>
              🔧 System Settings
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                      🌐 Connection Settings
                    </Typography>
                    <TextField
                      fullWidth
                      label="Backend URL"
                      value={backendURL}
                      onChange={(e) => setBackendURL(e.target.value)}
                      sx={{ mb: 2 }}
                      helperText="URL of the backend API server"
                    />
                    <TextField
                      fullWidth
                      label="PACS URL (Optional)"
                      value={pacsURL}
                      onChange={(e) => setPacsURL(e.target.value)}
                      helperText="URL for PACS integration"
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                      💾 Storage & Performance
                    </Typography>
                    <TextField
                      fullWidth
                      type="number"
                      label="Cache Size (MB)"
                      value={cacheSize}
                      onChange={(e) => setCacheSize(Number(e.target.value))}
                      sx={{ mb: 2 }}
                      InputProps={{ inputProps: { min: 100, max: 5000 } }}
                      helperText="Amount of disk space for caching images"
                    />
                    <FormControlLabel
                      control={<Switch checked={enableLogging} onChange={(e) => setEnableLogging(e.target.checked)} />}
                      label="Enable Debug Logging"
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      Logs help diagnose issues but may impact performance
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Alert severity="warning">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    ⚠️ Important: System Settings
                  </Typography>
                  <Typography variant="caption">
                    Changes to connection settings require a page refresh to take effect. Make sure the backend URL is correct before saving.
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Notifications Tab */}
          <TabPanel value={currentTab} index={5}>
            <Typography variant="h6" sx={{ mb: 3, color: '#667eea', fontWeight: 700 }}>
              🔔 Notification Settings
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                      📧 Email Notifications
                    </Typography>
                    <TextField
                      fullWidth
                      type="email"
                      label="Notification Email"
                      value={notificationEmail}
                      onChange={(e) => setNotificationEmail(e.target.value)}
                      sx={{ mb: 2 }}
                      helperText="Email address for receiving notifications"
                    />
                    <FormControlLabel
                      control={<Switch checked={emailNotifications} onChange={(e) => setEmailNotifications(e.target.checked)} />}
                      label="Enable Email Notifications"
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                      ⚠️ Alert Preferences
                    </Typography>
                    <FormControlLabel
                      control={<Switch checked={criticalFindingsAlert} onChange={(e) => setCriticalFindingsAlert(e.target.checked)} />}
                      label="Critical Findings Alerts"
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                      Get immediate alerts for critical findings (pneumothorax, PE, etc.)
                    </Typography>

                    <FormControlLabel
                      control={<Switch checked={reportStatusUpdates} onChange={(e) => setReportStatusUpdates(e.target.checked)} />}
                      label="Report Status Updates"
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Notifications when reports are finalized or require review
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
        </Paper>

        {/* Success/Error Snackbar */}
        <Snackbar
          open={saveStatus !== null}
          autoHideDuration={3000}
          onClose={() => setSaveStatus(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity={saveStatus === 'saved' ? 'success' : 'error'} onClose={() => setSaveStatus(null)}>
            {saveStatus === 'saved' ? '✅ Settings saved successfully!' : '❌ Error saving settings'}
          </Alert>
        </Snackbar>

        {/* Reset Confirmation Dialog */}
        <Dialog open={showResetDialog} onClose={() => setShowResetDialog(false)}>
          <DialogTitle>Reset to Default Settings?</DialogTitle>
          <DialogContent>
            <Typography>
              This will reset all settings to their default values. This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowResetDialog(false)}>Cancel</Button>
            <Button onClick={handleReset} color="error" variant="contained">
              Reset All Settings
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  )
}

export default SettingsPage
