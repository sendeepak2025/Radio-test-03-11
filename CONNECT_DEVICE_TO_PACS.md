# 🏥 Connect Your Medical Device to PACS

## Easy Guide for Connecting CT, X-Ray, Ultrasound, or Workstation to Orthanc PACS

This guide helps you connect any DICOM device to send images to your Orthanc PACS server.

---

## 📋 What You Need

### Information to Collect:

1. **Your Device Information:**
   - Device IP Address (example: 192.168.1.100)
   - Device AE Title (example: CT_SCANNER_1)
   - Device Type (CT, MRI, X-Ray, etc.)

2. **Your PACS Server Information:**
   - PACS IP Address: `[Your Orthanc Server IP]`
   - PACS DICOM Port: `4242`
   - PACS AE Title: `ORTHANC` or `MAIN_PACS`

---

## 🔍 Step 1: Check Internet/Network Connectivity

### On Your Device/Workstation:

**Windows Command Prompt:**
```cmd
:: Open Command Prompt (Win + R, type 'cmd', press Enter)

:: Test if you have network access
ping google.com

:: Expected: Reply from 142.250.xxx.xxx
:: If you see "Request timed out" - no internet
```

**What to look for:**
- ✅ **Good:** You see "Reply from..." with IP address
- ❌ **Bad:** "Request timed out" or "Destination host unreachable"

---

## 🌐 Step 2: Check Your Device's Network Settings

### Find Your Device IP Address:

**On Windows:**
```cmd
ipconfig

:: Look for "IPv4 Address"
:: Should be something like: 192.168.1.100
```

**On Linux:**
```bash
ifconfig
# or
ip addr show
```

**What you need:**
- IPv4 Address: `192.168.x.x` or `10.x.x.x`
- Subnet Mask: Usually `255.255.255.0`
- Default Gateway: Usually `192.168.1.1` or `192.168.0.1`

---

## 🔧 Step 3: Set Default Gateway (If Needed)

### If No Gateway is Set:

**Windows:**
```cmd
:: Set static IP with gateway
netsh interface ip set address "Ethernet" static 192.168.1.100 255.255.255.0 192.168.1.1

:: For WiFi, replace "Ethernet" with "Wi-Fi"
```

**Set DNS Servers:**
```cmd
:: Set Google DNS
netsh interface ip set dns "Ethernet" static 8.8.8.8
netsh interface ip add dns "Ethernet" 8.8.4.4 index=2
```

---

## 📡 Step 4: Test Connection to PACS Server

### Ping Your PACS Server:

```cmd
:: Replace with your actual PACS IP
ping 192.168.1.50

:: Expected: Reply from 192.168.1.50: bytes=32 time=5ms
```

**Results:**
- ✅ **Success:** You see replies with low time (< 50ms)
- ❌ **Failed:** Request timed out
  - Check: Is PACS IP correct?
  - Check: Are you on the same network?
  - Check: Is firewall blocking?

---

## 🔌 Step 5: Test DICOM Port

### Check if DICOM Port is Open:

**Using PowerShell:**
```powershell
Test-NetConnection -ComputerName 192.168.1.50 -Port 4242
```

**Using Telnet:**
```cmd
:: First enable telnet (run as administrator)
dism /online /Enable-Feature /FeatureName:TelnetClient

:: Then test
telnet 192.168.1.50 4242
```

**Results:**
- ✅ **Success:** Connection established (blank screen or text)
- ❌ **Failed:** "Could not open connection"
  - Check: Is PACS running?
  - Check: Is port 4242 open in firewall?
  - Check: Is DICOM service enabled?

---

## ⚙️ Step 6: Configure Your Device to Send to PACS

### On Your Medical Device/Modality:

Most devices have a DICOM configuration menu. Look for:
- **Settings** → **Network** → **DICOM**
- **Configuration** → **Destinations**
- **System** → **DICOM Nodes**

### Add PACS as Destination:

**Enter these details:**
```
Destination Name: MAIN_PACS (or any name)
AE Title: ORTHANC
Host/IP Address: 192.168.1.50
Port: 4242
```

**Example for Common Devices:**

#### GE Healthcare:
1. Go to Service Mode
2. Select "DICOM Configuration"
3. Add "Remote Node"
4. Enter PACS details
5. Save and exit

#### Siemens:
1. Open "System Configuration"
2. Go to "Network" → "DICOM"
3. Add "Storage SCP"
4. Enter PACS details
5. Apply changes

#### Philips:
1. Access "Configuration"
2. Select "Connectivity"
3. Add "DICOM Destination"
4. Enter PACS details
5. Save configuration

---

## 🧪 Step 7: Test DICOM Connection (C-ECHO)

### From Your Device:

Most devices have a "Test Connection" or "DICOM Echo" button.

**What it does:**
- Sends a DICOM C-ECHO request
- Verifies PACS is reachable
- Confirms DICOM communication works

**Expected Result:**
- ✅ "Echo Successful" or "Connection OK"
- ❌ "Echo Failed" - see troubleshooting below

### Using Command Line (If Available):

**Using DCMTK:**
```cmd
echoscu -aet YOUR_DEVICE_AET -aec ORTHANC 192.168.1.50 4242
```

**Expected Output:**
```
I: Requesting Association
I: Association Accepted
I: Sending Echo Request
I: Received Echo Response (Success)
```

---

## 📤 Step 8: Send Test Image

### From Your Device:

1. **Acquire a test image** (or use existing study)
2. **Select the study**
3. **Choose "Send" or "Export"**
4. **Select your PACS destination** (MAIN_PACS)
5. **Click "Send"**

### Verify on PACS:

**Check Orthanc Web Interface:**
```
1. Open browser: http://[PACS-IP]:8042
2. You should see the study appear
3. Click to view details
```

---

## ✅ Step 9: Verify Data Received

### On PACS Server:

**Using Web Interface:**
```
http://192.168.1.50:8042/app/explorer.html

Look for:
- Patient name
- Study date
- Modality type
- Number of images
```

**Using Command Line:**
```cmd
curl http://192.168.1.50:8042/patients
```

**Expected:**
- You should see your test patient/study
- Images should be viewable
- Metadata should be correct

---

## 🔧 Troubleshooting

### Problem 1: Cannot Ping PACS Server

**Possible Causes:**
- Wrong IP address
- Not on same network
- Firewall blocking
- PACS server is down

**Solutions:**
```cmd
:: Verify your network
ipconfig

:: Check gateway
ping 192.168.1.1

:: Check if on same subnet
:: Your IP: 192.168.1.100
:: PACS IP: 192.168.1.50
:: Should be same first 3 numbers
```

---

### Problem 2: DICOM Port Not Accessible

**Possible Causes:**
- Firewall blocking port 4242
- PACS DICOM service not running
- Wrong port number

**Solutions:**

**On PACS Server (Windows):**
```cmd
:: Check if Orthanc is running
curl http://localhost:8042/system

:: Add firewall rule
netsh advfirewall firewall add rule name="DICOM 4242" dir=in action=allow protocol=TCP localport=4242

:: Restart Orthanc
net stop orthanc
net start orthanc
```

---

### Problem 3: DICOM Echo Fails

**Possible Causes:**
- Wrong AE Title
- PACS not accepting connections
- Network issue

**Solutions:**

**Check PACS Configuration:**
```cmd
:: Check if PACS accepts any AE Title
curl http://192.168.1.50:8042/system

:: Check DICOM configuration
:: Look in orthanc.json for:
"DicomCheckCalledAet": false  (should allow any AET)
```

**Verify AE Titles Match:**
- Your device AET: `CT_SCANNER_1`
- PACS expects: Any (or specific AET)

---

### Problem 4: Images Not Appearing

**Possible Causes:**
- Transfer failed
- Wrong PACS destination
- Storage full

**Solutions:**

**Check PACS Logs:**
```cmd
:: On PACS server
curl http://localhost:8042/changes

:: Check storage space
curl http://localhost:8042/statistics
```

**Resend Images:**
1. Check device send queue
2. Retry failed transfers
3. Verify PACS is receiving

---

## 📊 Complete Connection Test Script

### Save as `test-device-to-pacs.bat`:

```batch
@echo off
echo ========================================
echo Device to PACS Connection Test
echo ========================================
echo.

set /p DEVICE_IP="Enter your device IP (default: 192.168.1.100): " || set DEVICE_IP=192.168.1.100
set /p PACS_IP="Enter PACS IP (default: 192.168.1.50): " || set PACS_IP=192.168.1.50
set /p PACS_PORT="Enter PACS port (default: 4242): " || set PACS_PORT=4242

echo.
echo Testing with:
echo - Device IP: %DEVICE_IP%
echo - PACS IP: %PACS_IP%
echo - PACS Port: %PACS_PORT%
echo.

echo [1/6] Testing Internet...
ping -n 2 google.com >nul 2>&1
if %errorlevel% equ 0 (
    echo [PASS] Internet is working
) else (
    echo [FAIL] No internet connection
)

echo.
echo [2/6] Checking Device Network...
ipconfig | findstr "IPv4"
echo.

echo [3/6] Testing Gateway...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "Default Gateway"') do (
    set GATEWAY=%%a
    ping -n 1 %%a >nul 2>&1
    if !errorlevel! equ 0 (
        echo [PASS] Gateway %%a is reachable
    ) else (
        echo [FAIL] Cannot reach gateway
    )
)

echo.
echo [4/6] Testing PACS Server...
ping -n 2 %PACS_IP% >nul 2>&1
if %errorlevel% equ 0 (
    echo [PASS] PACS server %PACS_IP% is reachable
) else (
    echo [FAIL] Cannot reach PACS server
    echo Check: IP address, network, firewall
)

echo.
echo [5/6] Testing DICOM Port...
powershell -Command "Test-NetConnection -ComputerName %PACS_IP% -Port %PACS_PORT% -InformationLevel Quiet" >nul 2>&1
if %errorlevel% equ 0 (
    echo [PASS] DICOM port %PACS_PORT% is open
) else (
    echo [FAIL] DICOM port is closed or blocked
)

echo.
echo [6/6] Testing PACS Service...
curl -s http://%PACS_IP%:8042/system >nul 2>&1
if %errorlevel% equ 0 (
    echo [PASS] PACS service is running
) else (
    echo [WARN] Cannot access PACS web interface
)

echo.
echo ========================================
echo Test Complete
echo ========================================
echo.
echo If all tests passed:
echo 1. Configure your device with PACS details
echo 2. Run DICOM Echo test from device
echo 3. Send a test image
echo.
pause
```

---

## 📱 Quick Setup Checklist

### Pre-Connection:
- [ ] Device has network connection
- [ ] Device has IP address
- [ ] Can ping gateway
- [ ] Can ping PACS server
- [ ] DICOM port is accessible

### Configuration:
- [ ] PACS IP entered correctly
- [ ] PACS port is 4242
- [ ] PACS AE Title entered
- [ ] Device AE Title set
- [ ] Configuration saved

### Testing:
- [ ] DICOM Echo successful
- [ ] Test image sent
- [ ] Image appears in PACS
- [ ] Image is viewable
- [ ] Metadata is correct

---

## 🎯 Common Device Types

### CT Scanner:
- Usually has built-in DICOM send
- Configure in service/admin mode
- Test with phantom scan

### X-Ray:
- May need workstation for DICOM
- Configure destination in system settings
- Test with calibration image

### Ultrasound:
- DICOM send in export menu
- May need to enable DICOM first
- Test with saved study

### MRI:
- DICOM configured in system settings
- May need Siemens/GE specific setup
- Test with localizer images

### CR/DR:
- Configure in acquisition workstation
- Set PACS as auto-send destination
- Test with test plate

---

## 📞 Support Information

### When Calling IT Support, Have Ready:
1. Device type and model
2. Device IP address
3. PACS IP address
4. Error messages (take photos)
5. Results of connection tests

### Information to Provide:
- Can you ping PACS? (Yes/No)
- Can you access PACS web interface? (Yes/No)
- Does DICOM Echo work? (Yes/No)
- What error message do you see?

---

## 🎓 Training Checklist

### For Device Operators:
- [ ] Understand network basics
- [ ] Know device IP address
- [ ] Know PACS IP address
- [ ] Can run connection tests
- [ ] Can send images
- [ ] Know who to call for help

### For IT Staff:
- [ ] Can configure device DICOM
- [ ] Can troubleshoot network
- [ ] Can check PACS logs
- [ ] Can verify image receipt
- [ ] Can fix common issues

---

## ✨ Success Indicators

**You're successful when:**
✅ Device can ping PACS
✅ DICOM Echo returns success
✅ Test image sends successfully
✅ Image appears in PACS within seconds
✅ Image is viewable and correct
✅ Routine images send automatically

---

**Keep this guide at your device workstation!** 📋
