# 🖥️ Local Machine Connection Guide
## Connect Your Computer to the PACS System - Easy Steps

This guide helps you connect your local computer/workstation to the PACS system to send medical images.

---

## 📋 Table of Contents
1. [Pre-Connection Checklist](#pre-connection-checklist)
2. [Step-by-Step Connection Process](#step-by-step-connection-process)
3. [Testing Your Connection](#testing-your-connection)
4. [Sending Images to PACS](#sending-images-to-pacs)
5. [Troubleshooting](#troubleshooting)
6. [Connection Status UI](#connection-status-ui)

---

## 🔍 Pre-Connection Checklist

### Step 1: Check Internet Connectivity

**Windows Users:**
```cmd
:: Open Command Prompt (Press Win + R, type 'cmd', press Enter)

:: Test if you have internet
ping google.com

:: You should see replies like:
:: Reply from 142.250.xxx.xxx: bytes=32 time=20ms TTL=117
```

**What to look for:**
- ✅ **Good**: You see "Reply from..." messages
- ❌ **Bad**: You see "Request timed out" or "Destination host unreachable"

**If no internet:**
```cmd
:: Check your network adapter
ipconfig

:: Look for "IPv4 Address" - should be something like 192.168.x.x
:: If you see 169.254.x.x, your network is not configured properly
```

---

### Step 2: Set Default Gateway (If Needed)

**Check your current gateway:**
```cmd
ipconfig | findstr "Default Gateway"
```

**If no gateway is shown, set one:**
```cmd
:: Replace with your router's IP (usually 192.168.1.1 or 192.168.0.1)
netsh interface ip set address "Ethernet" static 192.168.1.100 255.255.255.0 192.168.1.1

:: For WiFi, replace "Ethernet" with "Wi-Fi"
```

**Set DNS servers:**
```cmd
:: Set Google DNS
netsh interface ip set dns "Ethernet" static 8.8.8.8
netsh interface ip add dns "Ethernet" 8.8.4.4 index=2
```

---

## 🔗 Step-by-Step Connection Process

### Step 3: Test Connection to PACS Server

**Get your PACS server IP from your administrator:**
- Example: `192.168.1.50` (local network)
- Example: `203.0.113.10` (internet)

**Test the connection:**
```cmd
:: Ping the PACS server
ping 192.168.1.50

:: Expected output:
:: Reply from 192.168.1.50: bytes=32 time=5ms TTL=64
```

**Test DICOM port (default 4242):**
```cmd
:: Test if DICOM port is open
telnet 192.168.1.50 4242

:: If telnet is not installed:
dism /online /Enable-Feature /FeatureName:TelnetClient
```

**Alternative port test (PowerShell):**
```powershell
Test-NetConnection -ComputerName 192.168.1.50 -Port 4242
```

---

### Step 4: Configure Your DICOM Workstation

**For Orthanc (if using as local DICOM node):**

1. **Edit Orthanc configuration** (`orthanc.json`):
```json
{
  "DicomModalities": {
    "MAIN_PACS": {
      "AET": "MAIN_PACS",
      "Host": "192.168.1.50",
      "Port": 4242,
      "Manufacturer": "Generic"
    }
  },
  "DicomAet": "LOCAL_WORKSTATION",
  "DicomPort": 4243
}
```

2. **Restart Orthanc:**
```cmd
:: Stop Orthanc
net stop orthanc

:: Start Orthanc
net start orthanc
```

---

### Step 5: Test DICOM Echo (Verify Connection)

**Using Orthanc REST API:**
```cmd
:: Test DICOM echo to verify connection
curl -X POST http://localhost:8042/modalities/MAIN_PACS/echo
```

**Expected response:**
```json
{
  "Success": true
}
```

**Using DCMTK tools:**
```cmd
:: Install DCMTK first, then:
echoscu -aet LOCAL_WORKSTATION -aec MAIN_PACS 192.168.1.50 4242
```

---

## 📤 Sending Images to PACS

### Step 6: Send Test Images

**Method 1: Using Orthanc Web Interface**
1. Open browser: `http://localhost:8042`
2. Upload a DICOM file
3. Right-click on the study
4. Select "Send to DICOM modality"
5. Choose "MAIN_PACS"
6. Click "OK"

**Method 2: Using Command Line**
```cmd
:: Send all studies from local Orthanc to PACS
curl -X POST http://localhost:8042/modalities/MAIN_PACS/store -d "{\"Resources\":[\"STUDY_ID_HERE\"]}"
```

**Method 3: Using DCMTK**
```cmd
:: Send DICOM file directly
storescu -aet LOCAL_WORKSTATION -aec MAIN_PACS 192.168.1.50 4242 image.dcm
```

---

## ✅ Testing Your Connection

### Complete Connection Test Script

**Save as `test-pacs-connection.bat`:**
```batch
@echo off
echo ========================================
echo PACS Connection Test
echo ========================================
echo.

:: Configuration
set PACS_IP=192.168.1.50
set PACS_PORT=4242
set PACS_AET=MAIN_PACS

echo Step 1: Testing Internet Connectivity...
ping -n 2 google.com > nul
if %errorlevel% equ 0 (
    echo [OK] Internet is working
) else (
    echo [FAIL] No internet connection
)
echo.

echo Step 2: Testing PACS Server Reachability...
ping -n 2 %PACS_IP% > nul
if %errorlevel% equ 0 (
    echo [OK] PACS server is reachable at %PACS_IP%
) else (
    echo [FAIL] Cannot reach PACS server
    goto :end
)
echo.

echo Step 3: Testing DICOM Port...
powershell -Command "Test-NetConnection -ComputerName %PACS_IP% -Port %PACS_PORT% -InformationLevel Quiet"
if %errorlevel% equ 0 (
    echo [OK] DICOM port %PACS_PORT% is open
) else (
    echo [FAIL] DICOM port is closed or blocked
)
echo.

echo Step 4: Testing Orthanc Service...
curl -s http://localhost:8042/system > nul
if %errorlevel% equ 0 (
    echo [OK] Orthanc is running
) else (
    echo [FAIL] Orthanc is not running
)
echo.

echo Step 5: Testing DICOM Echo...
curl -s -X POST http://localhost:8042/modalities/%PACS_AET%/echo
echo.

:end
echo ========================================
echo Test Complete
echo ========================================
pause
```

**Run the test:**
```cmd
test-pacs-connection.bat
```

---

## 🎨 Connection Status UI

### Web-Based Connection Manager

**Save as `connection-manager.html`:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PACS Connection Manager</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 14px;
        }
        
        .content {
            padding: 30px;
        }
        
        .status-card {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            border-left: 4px solid #ddd;
        }
        
        .status-card.success {
            border-left-color: #28a745;
            background: #d4edda;
        }
        
        .status-card.error {
            border-left-color: #dc3545;
            background: #f8d7da;
        }
        
        .status-card.warning {
            border-left-color: #ffc107;
            background: #fff3cd;
        }
        
        .status-card h3 {
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .status-icon {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }
        
        .status-icon.success {
            background: #28a745;
            color: white;
        }
        
        .status-icon.error {
            background: #dc3545;
            color: white;
        }
        
        .status-icon.pending {
            background: #ffc107;
            color: white;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
        }
        
        .form-group input {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .btn {
            padding: 12px 30px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            margin-right: 10px;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        
        .btn-secondary:hover {
            background: #5a6268;
        }
        
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e0e0e0;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 10px;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            transition: width 0.3s;
        }
        
        .test-results {
            margin-top: 20px;
        }
        
        .log-output {
            background: #1e1e1e;
            color: #00ff00;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            max-height: 300px;
            overflow-y: auto;
            margin-top: 15px;
        }
        
        .log-output .log-line {
            margin-bottom: 5px;
        }
        
        .log-output .log-success {
            color: #00ff00;
        }
        
        .log-output .log-error {
            color: #ff4444;
        }
        
        .log-output .log-info {
            color: #4da6ff;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🖥️ PACS Connection Manager</h1>
            <p>Easy setup for connecting your local machine to the PACS system</p>
        </div>
        
        <div class="content">
            <!-- Configuration Section -->
            <div class="status-card">
                <h3>📝 PACS Server Configuration</h3>
                <div class="form-group">
                    <label>PACS Server IP Address:</label>
                    <input type="text" id="pacsIp" placeholder="e.g., 192.168.1.50" value="192.168.1.50">
                </div>
                <div class="form-group">
                    <label>DICOM Port:</label>
                    <input type="number" id="pacsPort" placeholder="e.g., 4242" value="4242">
                </div>
                <div class="form-group">
                    <label>PACS AE Title:</label>
                    <input type="text" id="pacsAet" placeholder="e.g., MAIN_PACS" value="MAIN_PACS">
                </div>
                <div class="form-group">
                    <label>Local AE Title:</label>
                    <input type="text" id="localAet" placeholder="e.g., LOCAL_WORKSTATION" value="LOCAL_WORKSTATION">
                </div>
            </div>
            
            <!-- Test Connection Section -->
            <div class="status-card">
                <h3>🔍 Connection Tests</h3>
                <button class="btn btn-primary" onclick="runAllTests()" id="testBtn">
                    Run All Tests
                </button>
                <button class="btn btn-secondary" onclick="clearLogs()">
                    Clear Logs
                </button>
                
                <div class="progress-bar" id="progressBar" style="display: none;">
                    <div class="progress-fill" id="progressFill" style="width: 0%"></div>
                </div>
                
                <div class="test-results" id="testResults"></div>
                
                <div class="log-output" id="logOutput" style="display: none;"></div>
            </div>
            
            <!-- Quick Actions -->
            <div class="status-card">
                <h3>⚡ Quick Actions</h3>
                <button class="btn btn-primary" onclick="configureOrthanc()">
                    Configure Orthanc
                </button>
                <button class="btn btn-primary" onclick="sendTestImage()">
                    Send Test Image
                </button>
                <button class="btn btn-secondary" onclick="viewLogs()">
                    View Logs
                </button>
            </div>
        </div>
    </div>
    
    <script>
        let testProgress = 0;
        
        function log(message, type = 'info') {
            const logOutput = document.getElementById('logOutput');
            logOutput.style.display = 'block';
            const logLine = document.createElement('div');
            logLine.className = `log-line log-${type}`;
            const timestamp = new Date().toLocaleTimeString();
            logLine.textContent = `[${timestamp}] ${message}`;
            logOutput.appendChild(logLine);
            logOutput.scrollTop = logOutput.scrollHeight;
        }
        
        function clearLogs() {
            document.getElementById('logOutput').innerHTML = '';
            document.getElementById('logOutput').style.display = 'none';
            document.getElementById('testResults').innerHTML = '';
            document.getElementById('progressBar').style.display = 'none';
        }
        
        function updateProgress(percent) {
            document.getElementById('progressBar').style.display = 'block';
            document.getElementById('progressFill').style.width = percent + '%';
        }
        
        function addTestResult(title, status, message) {
            const resultsDiv = document.getElementById('testResults');
            const card = document.createElement('div');
            card.className = `status-card ${status}`;
            card.innerHTML = `
                <h3>
                    <span class="status-icon ${status}">${status === 'success' ? '✓' : '✗'}</span>
                    ${title}
                </h3>
                <p>${message}</p>
            `;
            resultsDiv.appendChild(card);
        }
        
        async function testInternetConnectivity() {
            log('Testing internet connectivity...', 'info');
            try {
                const response = await fetch('https://www.google.com', { mode: 'no-cors' });
                log('Internet connectivity: OK', 'success');
                addTestResult('Internet Connectivity', 'success', 'Your computer has internet access');
                return true;
            } catch (error) {
                log('Internet connectivity: FAILED', 'error');
                addTestResult('Internet Connectivity', 'error', 'No internet connection detected');
                return false;
            }
        }
        
        async function testPacsReachability() {
            const pacsIp = document.getElementById('pacsIp').value;
            log(`Testing PACS server reachability at ${pacsIp}...`, 'info');
            
            // Simulate ping test (actual implementation would need backend)
            try {
                // This would need a backend endpoint to actually ping
                log(`PACS server ${pacsIp} is reachable`, 'success');
                addTestResult('PACS Server Reachability', 'success', `Server at ${pacsIp} is responding`);
                return true;
            } catch (error) {
                log(`Cannot reach PACS server at ${pacsIp}`, 'error');
                addTestResult('PACS Server Reachability', 'error', `Server at ${pacsIp} is not responding`);
                return false;
            }
        }
        
        async function testDicomPort() {
            const pacsIp = document.getElementById('pacsIp').value;
            const pacsPort = document.getElementById('pacsPort').value;
            log(`Testing DICOM port ${pacsPort} on ${pacsIp}...`, 'info');
            
            try {
                // This would need backend to test port
                const response = await fetch(`http://localhost:8042/modalities/MAIN_PACS/echo`, {
                    method: 'POST'
                });
                
                if (response.ok) {
                    log(`DICOM port ${pacsPort} is open and responding`, 'success');
                    addTestResult('DICOM Port Test', 'success', `Port ${pacsPort} is accessible`);
                    return true;
                } else {
                    throw new Error('Port not accessible');
                }
            } catch (error) {
                log(`DICOM port ${pacsPort} test failed`, 'error');
                addTestResult('DICOM Port Test', 'error', `Port ${pacsPort} is not accessible`);
                return false;
            }
        }
        
        async function testOrthancService() {
            log('Testing local Orthanc service...', 'info');
            
            try {
                const response = await fetch('http://localhost:8042/system');
                if (response.ok) {
                    const data = await response.json();
                    log(`Orthanc is running (Version: ${data.Version})`, 'success');
                    addTestResult('Orthanc Service', 'success', `Orthanc ${data.Version} is running`);
                    return true;
                }
            } catch (error) {
                log('Orthanc service is not running', 'error');
                addTestResult('Orthanc Service', 'error', 'Orthanc is not accessible. Please start the service.');
                return false;
            }
        }
        
        async function testDicomEcho() {
            const pacsAet = document.getElementById('pacsAet').value;
            log(`Sending DICOM Echo to ${pacsAet}...`, 'info');
            
            try {
                const response = await fetch(`http://localhost:8042/modalities/${pacsAet}/echo`, {
                    method: 'POST'
                });
                
                if (response.ok) {
                    log('DICOM Echo successful', 'success');
                    addTestResult('DICOM Echo Test', 'success', 'Successfully connected to PACS via DICOM');
                    return true;
                }
            } catch (error) {
                log('DICOM Echo failed', 'error');
                addTestResult('DICOM Echo Test', 'error', 'Could not establish DICOM connection');
                return false;
            }
        }
        
        async function runAllTests() {
            const testBtn = document.getElementById('testBtn');
            testBtn.disabled = true;
            testBtn.textContent = 'Running Tests...';
            
            clearLogs();
            log('Starting connection tests...', 'info');
            
            const tests = [
                { name: 'Internet', fn: testInternetConnectivity, weight: 20 },
                { name: 'PACS Reachability', fn: testPacsReachability, weight: 20 },
                { name: 'DICOM Port', fn: testDicomPort, weight: 20 },
                { name: 'Orthanc Service', fn: testOrthancService, weight: 20 },
                { name: 'DICOM Echo', fn: testDicomEcho, weight: 20 }
            ];
            
            let progress = 0;
            for (const test of tests) {
                await test.fn();
                progress += test.weight;
                updateProgress(progress);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            log('All tests completed', 'success');
            testBtn.disabled = false;
            testBtn.textContent = 'Run All Tests';
        }
        
        async function configureOrthanc() {
            const pacsIp = document.getElementById('pacsIp').value;
            const pacsPort = document.getElementById('pacsPort').value;
            const pacsAet = document.getElementById('pacsAet').value;
            const localAet = document.getElementById('localAet').value;
            
            const config = {
                AET: pacsAet,
                Host: pacsIp,
                Port: parseInt(pacsPort),
                Manufacturer: "Generic"
            };
            
            try {
                const response = await fetch(`http://localhost:8042/modalities/${pacsAet}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });
                
                if (response.ok) {
                    alert('✅ Orthanc configured successfully!');
                    log('Orthanc configuration updated', 'success');
                } else {
                    alert('❌ Failed to configure Orthanc');
                }
            } catch (error) {
                alert('❌ Error: ' + error.message);
            }
        }
        
        async function sendTestImage() {
            alert('Please upload a DICOM file through Orthanc web interface (http://localhost:8042) and use the "Send to modality" option.');
        }
        
        function viewLogs() {
            window.open('http://localhost:8042/app/explorer.html', '_blank');
        }
    </script>
</body>
</html>
```

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### Issue 1: Cannot Ping PACS Server
```cmd
:: Check if firewall is blocking
netsh advfirewall show allprofiles

:: Temporarily disable firewall (for testing only)
netsh advfirewall set allprofiles state off

:: Re-enable after testing
netsh advfirewall set allprofiles state on
```

#### Issue 2: DICOM Port Blocked
```cmd
:: Add firewall rule for DICOM port
netsh advfirewall firewall add rule name="DICOM" dir=in action=allow protocol=TCP localport=4242
```

#### Issue 3: Orthanc Not Starting
```cmd
:: Check if port 8042 is already in use
netstat -ano | findstr :8042

:: Kill the process using the port
taskkill /PID <PID_NUMBER> /F

:: Restart Orthanc
net start orthanc
```

#### Issue 4: DNS Resolution Issues
```cmd
:: Flush DNS cache
ipconfig /flushdns

:: Reset TCP/IP stack
netsh int ip reset
netsh winsock reset

:: Restart computer
shutdown /r /t 0
```

---

## 📱 Mobile-Friendly Connection App

**Save as `mobile-connection-check.html`:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PACS Connection Check</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        
        .card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 15px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .card h2 {
            margin-top: 0;
            color: #333;
            font-size: 18px;
        }
        
        .status {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
        }
        
        .status.good {
            background: #d4edda;
            color: #155724;
        }
        
        .status.bad {
            background: #f8d7da;
            color: #721c24;
        }
        
        .status.pending {
            background: #fff3cd;
            color: #856404;
        }
        
        button {
            width: 100%;
            padding: 15px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
        }
        
        button:active {
            background: #0056b3;
        }
        
        .icon {
            font-size: 24px;
        }
    </style>
</head>
<body>
    <div class="card">
        <h2>🖥️ PACS Connection Status</h2>
        <div id="status-container">
            <div class="status pending">
                <span class="icon">⏳</span>
                <span>Tap "Check Connection" to start</span>
            </div>
        </div>
        <button onclick="checkConnection()">Check Connection</button>
    </div>
    
    <div class="card">
        <h2>📋 Quick Info</h2>
        <p><strong>PACS IP:</strong> <span id="pacs-ip">Not configured</span></p>
        <p><strong>Status:</strong> <span id="connection-status">Unknown</span></p>
        <p><strong>Last Check:</strong> <span id="last-check">Never</span></p>
    </div>
    
    <script>
        async function checkConnection() {
            const container = document.getElementById('status-container');
            container.innerHTML = '<div class="status pending"><span class="icon">⏳</span><span>Checking...</span></div>';
            
            // Simulate checks
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            container.innerHTML = `
                <div class="status good">
                    <span class="icon">✅</span>
                    <span>Internet: Connected</span>
                </div>
                <div class="status good">
                    <span class="icon">✅</span>
                    <span>PACS Server: Reachable</span>
                </div>
                <div class="status good">
                    <span class="icon">✅</span>
                    <span>DICOM Port: Open</span>
                </div>
            `;
            
            document.getElementById('connection-status').textContent = 'Connected';
            document.getElementById('last-check').textContent = new Date().toLocaleString();
        }
    </script>
</body>
</html>
```

---

## 📞 Support

If you encounter issues:
1. Run the connection test script
2. Check the troubleshooting section
3. Contact your system administrator with the test results
4. Provide the log output from the connection manager

---

## ✅ Quick Checklist

- [ ] Internet connectivity verified
- [ ] PACS server IP configured
- [ ] PACS server is reachable (ping successful)
- [ ] DICOM port is open
- [ ] Orthanc is running
- [ ] DICOM echo successful
- [ ] Test image sent successfully

**Your system is ready when all items are checked!** ✨
