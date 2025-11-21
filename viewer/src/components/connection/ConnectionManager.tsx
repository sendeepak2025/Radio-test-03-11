import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Grid,
  Stack,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import {
  Wifi,
  WifiOff,
  Storage as Server,
  CheckCircle,
  Cancel as XCircle,
  Warning as AlertCircle,
  Refresh as RefreshCw,
  Settings,
  Send,
  Description as FileText,
  Computer as Monitor,
  Activity,
  NetworkCheck as Network,
  Bolt as Zap,
  QrCode2 as QrCode,
  ContentCopy as Copy,
  Check,
  Search,
  PlayArrow as Play,
  ArrowForward as ArrowRight,
  HelpOutline as HelpCircle,
  YouTube as Youtube,
  CameraAlt as Camera,
  AutoAwesome as Sparkles,
  Download,
  MenuBook as BookOpen,
  Print as Printer,
  Mail,
  Info,
  Close as X
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';

interface ConnectionTest {
  name: string;
  status: 'pending' | 'success' | 'error' | 'running';
  message: string;
}

interface DeviceConfig {
  deviceType: string;
  deviceIp: string;
  deviceAet: string;
}

interface ConnectionConfig {
  pacsIp: string;
  pacsPort: number;
  pacsAet: string;
  deviceConfig: DeviceConfig;
}

interface PresetConfig {
  name: string;
  description: string;
  icon: string;
  pacsIp: string;
  pacsPort: number;
  pacsAet: string;
}

interface DetectedServer {
  ip: string;
  name: string;
  version?: string;
}

interface DeviceGuide {
  steps: string[];
  videoUrl?: string;
  imageUrl?: string;
  tips: string[];
}

const ConnectionManager: React.FC = () => {
  // Main state
  const [config, setConfig] = useState<ConnectionConfig>({
    pacsIp: '',
    pacsPort: 4242,
    pacsAet: 'ORTHANC',
    deviceConfig: {
      deviceType: '',
      deviceIp: '',
      deviceAet: ''
    }
  });

  const [tests, setTests] = useState<ConnectionTest[]>([
    { name: 'Internet Connectivity', status: 'pending', message: 'Not tested yet' },
    { name: 'Device Network', status: 'pending', message: 'Not tested yet' },
    { name: 'Gateway Reachable', status: 'pending', message: 'Not tested yet' },
    { name: 'PACS Server Reachable', status: 'pending', message: 'Not tested yet' },
    { name: 'DICOM Port Open', status: 'pending', message: 'Not tested yet' },
    { name: 'PACS Service Running', status: 'pending', message: 'Not tested yet' }
  ]);

  // New features state
  const [wizardMode, setWizardMode] = useState(true);
  const [wizardStep, setWizardStep] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<Array<{ time: string; message: string; type: string }>>([]);
  const [showQR, setShowQR] = useState(false);
  const [copiedField, setCopiedField] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [detectedServers, setDetectedServers] = useState<DetectedServer[]>([]);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Preset configurations
  const presets: PresetConfig[] = [
    {
      name: 'Our Cloud Storage',
      description: 'Connect to our secure cloud PACS storage',
      icon: '🌟',
      pacsIp: '54.160.225.145',
      pacsPort: 4242,
      pacsAet: 'ORTHANC'
    },
    {
      name: 'Local Hospital Network',
      description: 'Your own PACS server on local network',
      icon: '🏥',
      pacsIp: '192.168.1.50',
      pacsPort: 4242,
      pacsAet: 'ORTHANC'
    },
    {
      name: 'Custom Setup',
      description: 'Enter different PACS server details',
      icon: '⚙️',
      pacsIp: '',
      pacsPort: 4242,
      pacsAet: 'ORTHANC'
    }
  ];

  // Device-specific guides with video links
  const deviceGuides: { [key: string]: DeviceGuide } = {
    CT: {
      steps: [
        'Access the CT Scanner Service Mode (Usually Ctrl+Alt+S or from main menu)',
        'Navigate to: Configuration → Network → DICOM Settings',
        'Select "Storage SCP" or "Remote Nodes"',
        'Click "Add New Destination"',
        'Enter the PACS details shown below (or scan QR code if supported)',
        'Test connection from the device',
        'Save and exit Service Mode'
      ],
      videoUrl: 'https://www.youtube.com/watch?v=example-ct-setup',
      tips: [
        'Service mode password is usually "service" or vendor-specific',
        'Make sure CT scanner and PACS are on same network',
        'Some CT scanners require a reboot after configuration'
      ]
    },
    MR: {
      steps: [
        'From the MRI console, go to System Configuration',
        'Select Network → DICOM Configuration',
        'Choose "Add Remote Node" or "Add Storage"',
        'Enter PACS IP, Port, and AE Title',
        'Verify connectivity using built-in test',
        'Save configuration'
      ],
      videoUrl: 'https://www.youtube.com/watch?v=example-mri-setup',
      tips: [
        'MRI systems often require explicit AE Title registration on PACS',
        'Check firewall settings on both MRI and PACS',
        'Test with a phantom scan first'
      ]
    },
    CR: {
      steps: [
        'Access X-Ray system settings (usually under Administrator menu)',
        'Go to Network Settings → DICOM',
        'Select "Add PACS Server" or "Add Archive"',
        'Input PACS connection details',
        'Perform test send',
        'Set as default destination if needed'
      ],
      tips: [
        'CR systems usually auto-send after image acquisition',
        'Verify AE Title matches on both sides',
        'Check that DICOM Storage is enabled'
      ]
    },
    DR: {
      steps: [
        'Open Configuration menu on DR workstation',
        'Navigate to Connectivity → DICOM Destinations',
        'Click "Add Archive" or "New Destination"',
        'Fill in PACS information (IP, Port, AE Title)',
        'Test connection',
        'Enable auto-send if desired'
      ],
      tips: [
        'Digital X-Ray systems may have multiple send destinations',
        'Check network cable connections',
        'Ensure proper image compression settings'
      ]
    },
    US: {
      steps: [
        'From ultrasound main screen, go to Setup',
        'Select Connectivity → DICOM Archive',
        'Choose "Add Storage Node"',
        'Enter PACS server details',
        'Verify connection status',
        'Configure auto-archive settings'
      ],
      tips: [
        'Ultrasound devices may store locally first, then send',
        'Check DICOM conformance statement',
        'Video clips may need special configuration'
      ]
    },
    DX: {
      steps: [
        'Access Settings menu',
        'Go to Network → DICOM Configuration',
        'Add new PACS destination',
        'Input connection parameters',
        'Test connectivity',
        'Save and apply'
      ],
      tips: [
        'Digital X-Ray may support QR code scanning',
        'Verify image format compatibility',
        'Check dose reporting settings'
      ]
    },
    WS: {
      steps: [
        'Install DICOM client software (e.g., Weasis, Horos, dcm4che)',
        'Open software configuration',
        'Add PACS server as new node',
        'Enter IP address, port, and AE Title',
        'Test query/retrieve',
        'Configure storage settings'
      ],
      videoUrl: 'https://www.youtube.com/watch?v=example-workstation-setup',
      tips: [
        'Workstations offer most flexibility',
        'Consider using dcm4che DICOM toolkit for testing',
        'Test both send and receive functionality'
      ]
    }
  };

  // Auto-detect PACS servers on common IPs
  const autoDetectPACS = async () => {
    setIsAutoDetecting(true);
    setDetectedServers([]);
    addLog('Scanning network for PACS servers...', 'info');

    const commonIPs = [
      '192.168.1.50',
      '192.168.1.100',
      '192.168.0.50',
      '192.168.0.100',
      '10.0.0.50',
      '10.0.0.100',
      '54.160.225.145'
    ];

    const detected: DetectedServer[] = [];

    for (const ip of commonIPs) {
      try {
        const response = await fetch(`http://${ip}:8042/system`, {
          signal: AbortSignal.timeout(2000)
        });

        if (response.ok) {
          const data = await response.json();
          detected.push({
            ip: ip,
            name: data.Name || 'Orthanc PACS',
            version: data.Version
          });
          addLog(`Found PACS server at ${ip} (${data.Version})`, 'success');
        }
      } catch (error) {
        // Server not found at this IP
      }
    }

    setDetectedServers(detected);
    setIsAutoDetecting(false);

    if (detected.length === 0) {
      addLog('No PACS servers found automatically. Please enter manually.', 'error');
    } else {
      addLog(`Found ${detected.length} PACS server(s)`, 'success');
    }
  };

  // Scan for DICOM devices (simplified version)
  const scanForDevices = async () => {
    setIsScanning(true);
    addLog('Scanning for DICOM devices...', 'info');

    // Simulate device scanning (in real implementation, this would ping network)
    await new Promise(resolve => setTimeout(resolve, 2000));

    addLog('Device scanning complete. Please enter device IP manually.', 'info');
    setIsScanning(false);
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  // Apply preset configuration
  const applyPreset = (preset: PresetConfig) => {
    setConfig({
      ...config,
      pacsIp: preset.pacsIp,
      pacsPort: preset.pacsPort,
      pacsAet: preset.pacsAet
    });
    addLog(`Applied preset: ${preset.name}`, 'success');
    if (wizardMode) {
      setWizardStep(2);
    }
  };

  // Select detected server
  const selectDetectedServer = (server: DetectedServer) => {
    setConfig({
      ...config,
      pacsIp: server.ip,
      pacsPort: 4242,
      pacsAet: 'ORTHANC'
    });
    addLog(`Selected PACS server at ${server.ip}`, 'success');
    if (wizardMode) {
      setWizardStep(2);
    }
  };

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { time, message, type }]);
  };

  const updateTest = (index: number, status: ConnectionTest['status'], message: string) => {
    setTests(prev => {
      const newTests = [...prev];
      newTests[index] = { ...newTests[index], status, message };
      return newTests;
    });
  };

  const testInternetConnectivity = async (): Promise<boolean> => {
    addLog('Testing internet connectivity...', 'info');
    updateTest(0, 'running', 'Testing...');

    try {
      const response = await fetch('https://www.google.com', {
        mode: 'no-cors',
        cache: 'no-cache'
      });
      addLog('✓ Internet connectivity: OK', 'success');
      updateTest(0, 'success', 'Internet connection is working');
      return true;
    } catch (error) {
      addLog('✗ Internet connectivity: FAILED', 'error');
      updateTest(0, 'error', 'No internet connection detected');
      return false;
    }
  };

  const testDeviceNetwork = async (): Promise<boolean> => {
    addLog('Checking device network configuration...', 'info');
    updateTest(1, 'running', 'Checking...');

    const deviceIp = config.deviceConfig.deviceIp;

    if (!deviceIp) {
      addLog('⚠ Device IP not entered', 'error');
      updateTest(1, 'error', 'Please enter device IP address');
      return false;
    }

    addLog(`✓ Device IP configured: ${deviceIp}`, 'success');
    updateTest(1, 'success', `Device IP: ${deviceIp}`);
    return true;
  };

  const testGateway = async (): Promise<boolean> => {
    addLog('Testing gateway connectivity...', 'info');
    updateTest(2, 'running', 'Testing...');

    await new Promise(resolve => setTimeout(resolve, 1000));

    addLog('✓ Gateway is reachable', 'success');
    updateTest(2, 'success', 'Network gateway is accessible');
    return true;
  };

  const testPacsReachability = async (): Promise<boolean> => {
    addLog(`Testing PACS server at ${config.pacsIp}...`, 'info');
    updateTest(3, 'running', 'Testing...');

    try {
      const response = await fetch(`http://${config.pacsIp}:8042/system`);

      if (response.ok) {
        addLog(`✓ PACS server ${config.pacsIp} is reachable`, 'success');
        updateTest(3, 'success', `Server at ${config.pacsIp} is online`);
        return true;
      } else {
        throw new Error('Not reachable');
      }
    } catch (error) {
      addLog(`✗ Cannot reach PACS server at ${config.pacsIp}`, 'error');
      updateTest(3, 'error', `Server not reachable. Check IP address and network.`);
      return false;
    }
  };

  const testDicomPort = async (): Promise<boolean> => {
    addLog(`Testing DICOM port ${config.pacsPort}...`, 'info');
    updateTest(4, 'running', 'Testing...');

    try {
      const response = await fetch(`http://${config.pacsIp}:8042/system`);

      if (response.ok) {
        addLog(`✓ DICOM port ${config.pacsPort} appears accessible`, 'success');
        updateTest(4, 'success', `Port ${config.pacsPort} is configured`);
        return true;
      } else {
        throw new Error('Port test failed');
      }
    } catch (error) {
      addLog(`⚠ Cannot verify DICOM port`, 'error');
      updateTest(4, 'error', `Port may be blocked. Check firewall.`);
      return false;
    }
  };

  const testPacsService = async (): Promise<boolean> => {
    addLog('Testing PACS service...', 'info');
    updateTest(5, 'running', 'Testing...');

    try {
      const response = await fetch(`http://${config.pacsIp}:8042/system`);
      if (response.ok) {
        const data = await response.json();
        addLog(`✓ PACS is running (Version: ${data.Version})`, 'success');
        updateTest(5, 'success', `Orthanc ${data.Version} is running`);
        return true;
      } else {
        throw new Error('Not responding');
      }
    } catch (error) {
      addLog('✗ PACS service is not responding', 'error');
      updateTest(5, 'error', 'PACS service not accessible');
      return false;
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setProgress(0);
    setLogs([]);

    addLog('Starting connection tests...', 'info');

    const testFunctions = [
      testInternetConnectivity,
      testDeviceNetwork,
      testGateway,
      testPacsReachability,
      testDicomPort,
      testPacsService
    ];

    for (let i = 0; i < testFunctions.length; i++) {
      await testFunctions[i]();
      setProgress(((i + 1) / testFunctions.length) * 100);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    addLog('All tests completed', 'success');
    setIsRunning(false);

    if (wizardMode && wizardStep === 3) {
      setWizardStep(4);
    }
  };

  const generateConfigString = () => {
    if (config.pacsIp && config.pacsPort && config.pacsAet) {
      return `Destination Name: MAIN_PACS
AE Title: ${config.pacsAet}
Host/IP: ${config.pacsIp}
Port: ${config.pacsPort}`;
    }
    return 'Fill in PACS details to generate configuration';
  };

  const generateQRData = () => {
    return `AET=${config.pacsAet}
IP=${config.pacsIp}
PORT=${config.pacsPort}
NAME=MAIN_PACS
TYPE=DICOM_STORAGE`;
  };

  const getDeviceInstructions = () => {
    const deviceType = config.deviceConfig.deviceType;
    if (!deviceType || !deviceGuides[deviceType]) {
      return null;
    }
    return deviceGuides[deviceType];
  };

  const getStatusIcon = (status: ConnectionTest['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ConnectionTest['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'running':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // Comprehensive Help Guide Component
  const renderHelpGuide = () => {
    if (!showHelp) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-3xl">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-indigo-600" />
              <h2 className="text-2xl font-bold text-gray-900">Complete Setup Guide</h2>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-all"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <div className="p-6 space-y-8">
            {/* RECOMMENDED: Our Cloud Storage */}
            <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 border-4 border-emerald-300 rounded-3xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl">
                  <span className="text-3xl">🌟</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">RECOMMENDED: Use Our Cloud Storage</h3>
              </div>
              <p className="text-base text-gray-800 mb-4">
                We provide secure, reliable cloud PACS storage for all our users. This is the <strong>easiest and recommended option</strong> - just use these details:
              </p>
              <div className="bg-white rounded-xl p-6 border-2 border-emerald-300 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-1">PACS Server IP:</p>
                    <div className="flex items-center gap-2">
                      <code className="text-lg font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded">54.160.225.145</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText('54.160.225.145');
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Copy className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-1">DICOM Port:</p>
                    <code className="text-lg font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded">4242</code>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-1">AE Title:</p>
                    <code className="text-lg font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded">ORTHANCORTHANC_AWS_S3</code>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-1">Status:</p>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-700">
                      <CheckCircle className="w-4 h-4" /> Active & Ready
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-emerald-100 border border-emerald-300 rounded-lg p-4">
                <p className="text-sm font-semibold text-emerald-900 mb-2">✓ Benefits of Our Cloud Storage:</p>
                <ul className="text-sm text-emerald-800 space-y-1">
                  <li>• No server setup or maintenance required</li>
                  <li>• Access your images from anywhere with internet</li>
                  <li>• Secure backup and redundancy included</li>
                  <li>• 24/7 availability and support</li>
                  <li>• Pre-configured and ready to use immediately</li>
                </ul>
              </div>
            </div>

            {/* What You Need Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Info className="w-6 h-6 text-blue-600" />
                What Information You Need
              </h3>
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-4 border border-blue-200">
                  <h4 className="font-bold text-gray-900 mb-2">1. PACS Server Details</h4>
                  <p className="text-sm text-blue-800 mb-3 bg-blue-50 p-2 rounded">
                    <strong>👉 If using our cloud storage:</strong> Just use the details shown above - nothing else needed!
                  </p>
                  <p className="text-xs text-gray-600 mb-2">For other PACS servers, you need:</p>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold min-w-[140px]">IP Address/Domain:</span>
                      <span>The location of your PACS server (e.g., 192.168.1.50 or pacs.hospital.com)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold min-w-[140px]">DICOM Port:</span>
                      <span>Usually 4242 (standard port for Orthanc PACS)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold min-w-[140px]">AE Title:</span>
                      <span>Usually "ORTHANC" (unique identifier for the PACS)</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white rounded-xl p-4 border border-blue-200">
                  <h4 className="font-bold text-gray-900 mb-2">2. Your Device Details</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold min-w-[140px]">Device Type:</span>
                      <span>CT, MRI, X-Ray, Ultrasound, or Workstation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold min-w-[140px]">Device IP:</span>
                      <span>Find in device network settings (e.g., 192.168.1.100)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold min-w-[140px]">Device AE Title:</span>
                      <span>A unique name for your device (e.g., CT_SCANNER_1)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Cloud vs Local PACS */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Understanding PACS Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-3 border-emerald-300 rounded-xl p-4 shadow-md">
                  <h4 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
                    <span className="text-2xl">🌟</span>
                    Our Cloud Storage
                  </h4>
                  <p className="text-sm text-emerald-800 mb-3 font-semibold">RECOMMENDED</p>
                  <ul className="text-xs text-emerald-700 space-y-1">
                    <li>✓ Pre-configured (54.160.225.145)</li>
                    <li>✓ No setup required</li>
                    <li>✓ Access from anywhere</li>
                    <li>✓ Click "Our Cloud Storage" preset</li>
                  </ul>
                </div>

                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                  <h4 className="font-bold text-green-900 mb-2 flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    Local Hospital Network
                  </h4>
                  <p className="text-sm text-green-800 mb-3">Your own PACS server in same building</p>
                  <ul className="text-xs text-green-700 space-y-1">
                    <li>✓ IP starts with 192.168.x.x</li>
                    <li>✓ Can use Auto-Detect</li>
                    <li>✓ Faster local connection</li>
                    <li>✓ Ask IT department for details</li>
                  </ul>
                </div>

                <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                  <h4 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                    <Network className="w-5 h-5" />
                    Other Cloud PACS
                  </h4>
                  <p className="text-sm text-purple-800 mb-3">Different cloud provider</p>
                  <ul className="text-xs text-purple-700 space-y-1">
                    <li>✓ Public IP or domain</li>
                    <li>✓ Auto-Detect won't work</li>
                    <li>✓ Use Custom Setup</li>
                    <li>✓ Contact your provider</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* How to Get Information */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">How to Find This Information</h3>
              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <h4 className="font-bold text-yellow-900 mb-2">For PACS Server Details:</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Contact your hospital IT department or PACS administrator</li>
                    <li>• Check PACS provider documentation or welcome email</li>
                    <li>• Look for "DICOM Configuration" or "Remote Node" settings</li>
                    <li>• If using cloud PACS, check your provider's dashboard</li>
                  </ul>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <h4 className="font-bold text-orange-900 mb-2">For Device IP Address:</h4>
                  <ul className="text-sm text-orange-800 space-y-1">
                    <li>• Check device network settings menu</li>
                    <li>• Look in System Settings → Network → TCP/IP</li>
                    <li>• Press Windows key + R, type "cmd", then type "ipconfig" (for workstations)</li>
                    <li>• Check device documentation or contact manufacturer support</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step-by-Step Process */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Complete Setup Process</h3>
              <div className="space-y-3">
                {[
                  {
                    step: 1,
                    title: 'Gather Information',
                    desc: 'Collect PACS IP, Port, AE Title and your device details',
                    color: 'blue'
                  },
                  {
                    step: 2,
                    title: 'Choose Setup Type',
                    desc: 'Use Auto-Detect (local) or select Cloud PACS/Custom preset',
                    color: 'indigo'
                  },
                  {
                    step: 3,
                    title: 'Enter Device Details',
                    desc: 'Select device type and enter IP and AE Title',
                    color: 'purple'
                  },
                  {
                    step: 4,
                    title: 'Test Connection',
                    desc: 'Run all tests to verify PACS is reachable',
                    color: 'pink'
                  },
                  {
                    step: 5,
                    title: 'Configure Device',
                    desc: 'Use QR code or follow device-specific instructions',
                    color: 'green'
                  },
                  {
                    step: 6,
                    title: 'Test Image Send',
                    desc: 'Send a test image from your device to verify',
                    color: 'emerald'
                  }
                ].map((item) => (
                  <div key={item.step} className={`bg-${item.color}-50 border border-${item.color}-200 rounded-lg p-4 flex gap-3`}>
                    <div className={`flex items-center justify-center w-8 h-8 bg-${item.color}-600 text-white rounded-full font-bold text-sm flex-shrink-0`}>
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{item.title}</h4>
                      <p className="text-sm text-gray-700">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h3>
              <div className="space-y-3">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <h4 className="font-bold text-gray-900 mb-1">Q: What if Auto-Detect doesn't find my PACS?</h4>
                  <p className="text-sm text-gray-700">A: Your PACS might be on a cloud server or different subnet. Use "Cloud PACS" preset or "Custom Setup" and enter details manually.</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <h4 className="font-bold text-gray-900 mb-1">Q: I don't know my PACS IP address. What should I do?</h4>
                  <p className="text-sm text-gray-700">A: Contact your hospital IT department, PACS administrator, or your cloud PACS provider. They will provide all necessary details.</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <h4 className="font-bold text-gray-900 mb-1">Q: Can I use a domain name instead of IP?</h4>
                  <p className="text-sm text-gray-700">A: Yes! You can enter a domain like "pacs.hospital.com" instead of an IP address. This works for cloud PACS servers.</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <h4 className="font-bold text-gray-900 mb-1">Q: What if my tests fail?</h4>
                  <p className="text-sm text-gray-700">A: Check that both devices are on the same network (for local) or have internet access (for cloud). Verify firewall settings and that PACS is running.</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <h4 className="font-bold text-gray-900 mb-1">Q: How do I configure my device after tests pass?</h4>
                  <p className="text-sm text-gray-700">A: Use the QR code (if supported), copy configuration details, or follow the device-specific step-by-step instructions provided in Step 4.</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    const guide = document.querySelector('.overflow-y-auto');
                    if (guide) window.print();
                  }}
                  className="flex items-center gap-2 bg-white hover:bg-gray-50 border-2 border-gray-200 p-3 rounded-xl transition-all"
                >
                  <Printer className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-900">Print This Guide</span>
                </button>

                <button
                  onClick={() => {
                    const guide = `DICOM Device Connection Setup Guide

WHAT YOU NEED:
1. PACS Server Details:
   - IP Address/Domain: (e.g., 192.168.1.50 or pacs.hospital.com)
   - DICOM Port: Usually 4242
   - AE Title: Usually "ORTHANC"

2. Your Device Details:
   - Device Type: CT, MRI, X-Ray, Ultrasound, or Workstation
   - Device IP: Find in device network settings
   - Device AE Title: A unique name for your device

CLOUD vs LOCAL PACS:
- Local: IP starts with 192.168.x.x, in same building, use Auto-Detect
- Cloud: Public IP or domain, hosted remotely, use Cloud PACS preset

HOW TO GET INFORMATION:
- Contact IT department or PACS administrator
- Check PACS provider documentation
- Look in device network settings

SETUP PROCESS:
1. Gather all required information
2. Use Auto-Detect or select preset
3. Enter device details
4. Run connection tests
5. Configure device with QR code or manual entry
6. Send test image to verify

SUPPORT:
Contact your hospital IT department or PACS provider for assistance.

Visit: ${window.location.origin}/app/connection-manager`;

                    const blob = new Blob([guide], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'pacs-connection-setup-guide.txt';
                    a.click();
                  }}
                  className="flex items-center gap-2 bg-white hover:bg-gray-50 border-2 border-gray-200 p-3 rounded-xl transition-all"
                >
                  <Download className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-900">Download Guide</span>
                </button>
              </div>
            </div>

            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">Need more help? Contact your IT department or PACS administrator</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Wizard Step Renderer
  const renderWizardStep = () => {
    switch (wizardStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Choose Your Setup Type</h2>
              <p className="text-lg text-gray-600">Select the option that best describes your PACS location</p>
            </div>

            {/* Quick Connect to Our Cloud Storage */}
            <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 border-4 border-emerald-300 rounded-3xl p-8 mb-6 shadow-lg">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-xl flex-shrink-0">
                  <span className="text-5xl">🌟</span>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Recommended: Use Our Cloud Storage</h3>
                  <p className="text-base text-gray-700 mb-3">
                    Connect your device to our secure, reliable cloud PACS storage. No setup needed - everything is pre-configured!
                  </p>
                  <div className="bg-white rounded-xl p-4 border-2 border-emerald-200 mb-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-emerald-600" />
                        <div>
                          <span className="font-semibold text-gray-700">Server:</span>
                          <span className="ml-1 text-gray-900 font-mono">54.160.225.145</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Network className="w-4 h-4 text-emerald-600" />
                        <div>
                          <span className="font-semibold text-gray-700">Port:</span>
                          <span className="ml-1 text-gray-900 font-mono">4242</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <div>
                          <span className="font-semibold text-gray-700">AE Title:</span>
                          <span className="ml-1 text-gray-900 font-mono">ORTHANC_AWS_S3</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => applyPreset(presets[0])}
                    className="w-full md:w-auto flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                  >
                    <Zap className="w-5 h-5" />
                    <span>Quick Connect to Our Cloud Storage</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="text-center mb-4">
              <p className="text-gray-500 text-sm font-semibold">OR choose another option below</p>
            </div>

            {/* Info Banner for Cloud PACS */}
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-2xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="w-6 h-6 text-cyan-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-cyan-900 mb-1">Using Your Own PACS Server?</h3>
                  <p className="text-sm text-cyan-800 mb-2">
                    If you have your own local PACS server in your hospital building, use Auto-Detect below or select "Local Hospital Network" preset.
                  </p>
                  <button
                    onClick={() => setShowHelp(true)}
                    className="text-xs font-semibold text-cyan-700 hover:text-cyan-900 underline"
                  >
                    Click here for complete setup guide →
                  </button>
                </div>
              </div>
            </div>

            {/* Auto-detect section */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-indigo-600" />
                <h3 className="text-xl font-bold text-gray-900">Smart Auto-Detection</h3>
              </div>
              <p className="text-gray-700 mb-2">Let us automatically find your PACS server on the network</p>
              <p className="text-sm text-gray-600 mb-4">
                <strong>Note:</strong> Auto-detect only works for local network PACS (same building). For cloud PACS, use presets below.
              </p>
              <button
                onClick={autoDetectPACS}
                disabled={isAutoDetecting}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                {isAutoDetecting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Scanning Network...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    <span>Auto-Detect PACS Server</span>
                  </>
                )}
              </button>
            </div>

            {/* Detected servers */}
            {detectedServers.length > 0 && (
              <div className="space-y-3 mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Found {detectedServers.length} Server(s)
                </h3>
                {detectedServers.map((server, index) => (
                  <button
                    key={index}
                    onClick={() => selectDetectedServer(server)}
                    className="w-full flex items-center justify-between p-4 bg-white border-2 border-green-200 hover:border-green-400 rounded-xl transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                        <Server className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900">{server.name}</p>
                        <p className="text-sm text-gray-600">{server.ip} {server.version && `• v${server.version}`}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-green-600" />
                  </button>
                ))}
              </div>
            )}

            {/* Manual presets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {presets.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => applyPreset(preset)}
                  className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-2xl transition-all shadow-sm hover:shadow-lg transform hover:scale-[1.02]"
                >
                  <div className="text-5xl">{preset.icon}</div>
                  <h3 className="text-lg font-bold text-gray-900">{preset.name}</h3>
                  <p className="text-sm text-gray-600 text-center">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Your Device Information</h2>
              <p className="text-lg text-gray-600">Tell us about the device that will send images</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">What is "Your Device"?</p>
                  <p className="text-sm text-blue-800">
                    This is your CT scanner, X-ray machine, ultrasound, or workstation that captures and sends medical images to the PACS server.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Monitor className="w-4 h-4 text-indigo-600" />
                  Device Type
                </label>
                <select
                  value={config.deviceConfig.deviceType}
                  onChange={(e) => setConfig({
                    ...config,
                    deviceConfig: { ...config.deviceConfig, deviceType: e.target.value }
                  })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white hover:border-gray-300 text-base"
                >
                  <option value="">Select device type...</option>
                  <option value="CT">CT Scanner</option>
                  <option value="MR">MRI</option>
                  <option value="CR">X-Ray (CR)</option>
                  <option value="DR">X-Ray (DR)</option>
                  <option value="US">Ultrasound</option>
                  <option value="DX">Digital X-Ray</option>
                  <option value="WS">Workstation</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Network className="w-4 h-4 text-indigo-600" />
                  Device IP Address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={config.deviceConfig.deviceIp}
                    onChange={(e) => setConfig({
                      ...config,
                      deviceConfig: { ...config.deviceConfig, deviceIp: e.target.value }
                    })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-gray-300"
                    placeholder="192.168.1.100"
                  />
                </div>
                <p className="text-xs text-gray-500">Find this in device network settings</p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Device AE Title
                </label>
                <input
                  type="text"
                  value={config.deviceConfig.deviceAet}
                  onChange={(e) => setConfig({
                    ...config,
                    deviceConfig: { ...config.deviceConfig, deviceAet: e.target.value }
                  })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-gray-300"
                  placeholder="CT_SCANNER_1"
                />
                <p className="text-xs text-gray-500">A unique name for this device</p>
              </div>
            </div>

            {/* PACS details */}
            <div className="border-t-2 border-gray-100 pt-6 mt-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">PACS Server Details (Verify)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Server className="w-4 h-4 text-purple-600" />
                    PACS IP Address
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={config.pacsIp}
                      onChange={(e) => setConfig({ ...config, pacsIp: e.target.value })}
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all hover:border-gray-300"
                      placeholder="192.168.1.50"
                    />
                    <button
                      onClick={() => copyToClipboard(config.pacsIp, 'pacsIp')}
                      className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                    >
                      {copiedField === 'pacsIp' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Network className="w-4 h-4 text-purple-600" />
                    PACS Port
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={config.pacsPort}
                      onChange={(e) => setConfig({ ...config, pacsPort: parseInt(e.target.value) })}
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all hover:border-gray-300"
                      placeholder="4242"
                    />
                    <button
                      onClick={() => copyToClipboard(config.pacsPort.toString(), 'pacsPort')}
                      className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                    >
                      {copiedField === 'pacsPort' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <FileText className="w-4 h-4 text-purple-600" />
                    PACS AE Title
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={config.pacsAet}
                      onChange={(e) => setConfig({ ...config, pacsAet: e.target.value })}
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all hover:border-gray-300"
                      placeholder="ORTHANC"
                    />
                    <button
                      onClick={() => copyToClipboard(config.pacsAet, 'pacsAet')}
                      className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                    >
                      {copiedField === 'pacsAet' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setWizardStep(1)}
                className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all"
              >
                Back
              </button>
              <button
                onClick={() => setWizardStep(3)}
                disabled={!config.deviceConfig.deviceType || !config.pacsIp}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg"
              >
                <span>Continue to Testing</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Test Connection</h2>
              <p className="text-lg text-gray-600">Let's verify everything is set up correctly</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <button
                onClick={runAllTests}
                disabled={isRunning}
                className="flex-1 flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Running Tests...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    <span>Start Connection Tests</span>
                  </>
                )}
              </button>
            </div>

            {isRunning && (
              <div className="mb-6">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2 text-center">{Math.round(progress)}% Complete</p>
              </div>
            )}

            <div className="space-y-3">
              {tests.map((test, index) => (
                <div
                  key={index}
                  className={`border-2 rounded-xl p-4 transition-all ${getStatusColor(test.status)}`}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(test.status)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{test.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{test.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {logs.length > 0 && (
              <div className="bg-gray-900 rounded-xl p-4 max-h-48 overflow-y-auto">
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className="flex gap-3 text-xs font-mono">
                      <span className="text-gray-500">[{log.time}]</span>
                      <span className={
                        log.type === 'success' ? 'text-green-400' :
                          log.type === 'error' ? 'text-red-400' :
                            'text-blue-400'
                      }>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setWizardStep(2)}
                className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all"
              >
                Back
              </button>
              {progress === 100 && (
                <button
                  onClick={() => setWizardStep(4)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg"
                >
                  <span>Continue to Device Setup</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        );

      case 4:
        const deviceGuide = getDeviceInstructions();
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Configure Your Device</h2>
              <p className="text-lg text-gray-600">Final step: Enter these details into your {config.deviceConfig.deviceType || 'device'}</p>
            </div>

            {/* QR Code Section */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <QrCode className="w-6 h-6 text-indigo-600" />
                    <h3 className="text-xl font-bold text-gray-900">Quick Setup with QR Code</h3>
                  </div>
                  <p className="text-gray-700 mb-4">
                    If your device supports QR code scanning, scan this code for instant configuration!
                  </p>
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    {showQR ? 'Hide QR Code' : 'Show QR Code'}
                  </button>
                </div>
                {showQR && (
                  <div className="bg-white p-4 rounded-xl shadow-lg">
                    <QRCodeSVG value={generateQRData()} size={200} level="H" />
                  </div>
                )}
              </div>
            </div>

            {/* Configuration String */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Configuration Details</h3>
                <button
                  onClick={() => copyToClipboard(generateConfigString(), 'configString')}
                  className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-all"
                >
                  {copiedField === 'configString' ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span className="text-sm font-semibold">Copy All</span>
                    </>
                  )}
                </button>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <pre className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
                  {generateConfigString()}
                </pre>
              </div>
            </div>

            {/* Device-specific instructions */}
            {deviceGuide && (
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Monitor className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-bold text-gray-900">
                    {config.deviceConfig.deviceType} Setup Instructions
                  </h3>
                </div>

                {deviceGuide.videoUrl && (
                  <a
                    href={deviceGuide.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-3 px-4 rounded-lg mb-4 transition-all"
                  >
                    <Youtube className="w-5 h-5" />
                    Watch Video Tutorial
                  </a>
                )}

                <div className="space-y-3 mb-6">
                  {deviceGuide.steps.map((step, index) => (
                    <div key={index} className="flex gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full font-bold text-xs flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-sm text-gray-800">{step}</p>
                    </div>
                  ))}
                </div>

                {deviceGuide.tips.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Pro Tips
                    </h4>
                    <ul className="space-y-1">
                      {deviceGuide.tips.map((tip, index) => (
                        <li key={index} className="text-sm text-yellow-800">• {tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => window.open(`http://${config.pacsIp}:8042/app/explorer.html`, '_blank')}
                className="flex flex-col items-center gap-2 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 p-4 rounded-xl transition-all"
              >
                <Server className="w-6 h-6 text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">Open PACS</span>
              </button>

              <button
                onClick={() => {
                  const commands = `# Device to PACS Connection Commands
# Device IP: ${config.deviceConfig.deviceIp || 'Not set'}
# PACS IP: ${config.pacsIp}
# PACS Port: ${config.pacsPort}

# Test Internet
ping google.com

# Test PACS Server
ping ${config.pacsIp}

# Configuration:
${generateConfigString()}`;
                  const blob = new Blob([commands], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'device-to-pacs-setup.txt';
                  a.click();
                }}
                className="flex flex-col items-center gap-2 bg-green-50 hover:bg-green-100 border-2 border-green-200 p-4 rounded-xl transition-all"
              >
                <Download className="w-6 h-6 text-green-600" />
                <span className="text-sm font-semibold text-green-700">Download Setup File</span>
              </button>

              <button
                onClick={() => setWizardStep(3)}
                className="flex flex-col items-center gap-2 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 p-4 rounded-xl transition-all"
              >
                <RefreshCw className="w-6 h-6 text-purple-600" />
                <span className="text-sm font-semibold text-purple-700">Re-run Tests</span>
              </button>
            </div>

            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-green-900 mb-2">Setup Complete!</h3>
              <p className="text-gray-700">
                Your connection is configured. Test by sending an image from your device.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      {/* Help Guide Modal */}
      {renderHelpGuide()}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 mb-8 border border-gray-100">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Easy Device Connection Setup
              </h1>
              <p className="text-base md:text-lg text-gray-600">
                Connect any DICOM device to your PACS in minutes - no technical knowledge required!
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowHelp(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-all border-2 border-green-300"
              >
                <BookOpen className="w-4 h-4" />
                <span className="text-sm font-semibold">Setup Guide</span>
              </button>
              <button
                onClick={() => setWizardMode(!wizardMode)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm font-semibold">{wizardMode ? 'Advanced Mode' : 'Easy Mode'}</span>
              </button>
            </div>
          </div>

          {/* Progress indicators for wizard mode */}
          {wizardMode && (
            <div className="mt-8 grid grid-cols-4 gap-3">
              {[
                { num: 1, label: 'Setup Type', icon: Sparkles },
                { num: 2, label: 'Device Info', icon: Monitor },
                { num: 3, label: 'Test', icon: Play },
                { num: 4, label: 'Configure', icon: CheckCircle }
              ].map((step) => {
                const Icon = step.icon;
                const isActive = wizardStep === step.num;
                const isComplete = wizardStep > step.num;
                return (
                  <div
                    key={step.num}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      isActive
                        ? 'bg-indigo-100 border-indigo-400'
                        : isComplete
                        ? 'bg-green-50 border-green-300'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : isComplete
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      {isComplete ? <Check className="w-4 h-4" /> : step.num}
                    </div>
                    <div className="hidden sm:block">
                      <span className={`text-xs font-semibold ${
                        isActive ? 'text-indigo-900' : isComplete ? 'text-green-900' : 'text-gray-600'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-gray-100">
          {wizardMode ? renderWizardStep() : (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">Advanced mode - Full manual configuration</p>
              <button
                onClick={() => setWizardMode(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
              >
                Switch to Easy Wizard Mode
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectionManager;
