@echo off
REM ========================================
REM Quick Connection Test
REM Tests PACS connectivity
REM ========================================

echo.
echo ========================================
echo   PACS Connection Test
echo ========================================
echo.

REM Get PACS configuration
set /p PACS_IP="Enter PACS Server IP (default: 192.168.1.50): " || set PACS_IP=192.168.1.50
set /p PACS_PORT="Enter DICOM Port (default: 4242): " || set PACS_PORT=4242
set /p PACS_AET="Enter PACS AE Title (default: MAIN_PACS): " || set PACS_AET=MAIN_PACS

echo.
echo Testing with:
echo - PACS IP: %PACS_IP%
echo - Port: %PACS_PORT%
echo - AE Title: %PACS_AET%
echo.
echo ========================================
echo.

REM Test 1: Internet
echo [1/5] Testing Internet Connectivity...
ping -n 2 google.com >nul 2>&1
if %errorlevel% equ 0 (
    echo [PASS] Internet is working
) else (
    echo [FAIL] No internet connection
)
echo.

REM Test 2: PACS Server
echo [2/5] Testing PACS Server Reachability...
ping -n 2 %PACS_IP% >nul 2>&1
if %errorlevel% equ 0 (
    echo [PASS] PACS server %PACS_IP% is reachable
) else (
    echo [FAIL] Cannot reach PACS server
    echo Check: IP address, network connection, firewall
)
echo.

REM Test 3: DICOM Port
echo [3/5] Testing DICOM Port...
powershell -Command "Test-NetConnection -ComputerName %PACS_IP% -Port %PACS_PORT% -InformationLevel Quiet" >nul 2>&1
if %errorlevel% equ 0 (
    echo [PASS] DICOM port %PACS_PORT% is open
) else (
    echo [FAIL] DICOM port is closed or blocked
    echo Check: Firewall settings, PACS service status
)
echo.

REM Test 4: Orthanc Service
echo [4/5] Testing Orthanc Service...
curl -s http://localhost:8042/system >nul 2>&1
if %errorlevel% equ 0 (
    echo [PASS] Orthanc is running
    for /f "tokens=*" %%a in ('curl -s http://localhost:8042/system ^| findstr "Version"') do echo %%a
) else (
    echo [FAIL] Orthanc is not running
    echo Run: net start orthanc
)
echo.

REM Test 5: DICOM Echo
echo [5/5] Testing DICOM Echo...
curl -s -X POST http://localhost:8042/modalities/%PACS_AET%/echo >nul 2>&1
if %errorlevel% equ 0 (
    echo [PASS] DICOM Echo successful
    echo Connection to PACS is working!
) else (
    echo [FAIL] DICOM Echo failed
    echo Check: PACS configuration in Orthanc
    echo Run: curl -X POST http://localhost:8042/modalities/%PACS_AET%/echo
)
echo.

echo ========================================
echo Test Complete
echo ========================================
echo.
echo If all tests passed, you can send images to PACS
echo If any test failed, see troubleshooting guide
echo.
echo For detailed help:
echo - Open connection-manager-standalone.html
echo - Or visit http://localhost:5173/connection-manager
echo.
pause
