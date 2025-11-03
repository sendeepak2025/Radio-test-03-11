@echo off
REM ========================================
REM PACS Connection Manager Setup
REM Easy setup for connecting to PACS
REM ========================================

echo.
echo ========================================
echo   PACS Connection Manager Setup
echo ========================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Not running as administrator
    echo Some features may not work properly
    echo.
    echo Right-click this file and select "Run as administrator"
    echo.
    pause
)

echo Step 1: Checking Prerequisites...
echo.

REM Check if Orthanc is installed
echo Checking for Orthanc...
sc query orthanc >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Orthanc service found
) else (
    echo [WARNING] Orthanc service not found
    echo Please install Orthanc first
    echo Download from: https://www.orthanc-server.com/download.php
    echo.
)

REM Check if Orthanc is running
echo Checking if Orthanc is running...
curl -s http://localhost:8042/system >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Orthanc is running
) else (
    echo [INFO] Orthanc is not running
    echo Attempting to start Orthanc...
    net start orthanc >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK] Orthanc started successfully
    ) else (
        echo [WARNING] Could not start Orthanc
        echo Please start it manually
    )
)

echo.
echo Step 2: Checking Network Connectivity...
echo.

REM Test internet connection
echo Testing internet connection...
ping -n 1 google.com >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Internet connection is working
) else (
    echo [WARNING] No internet connection
    echo Please check your network settings
)

echo.
echo Step 3: Firewall Configuration...
echo.

REM Add firewall rules
echo Adding firewall rules for DICOM and Orthanc...
netsh advfirewall firewall show rule name="DICOM Port 4242" >nul 2>&1
if %errorlevel% neq 0 (
    echo Adding DICOM port rule...
    netsh advfirewall firewall add rule name="DICOM Port 4242" dir=in action=allow protocol=TCP localport=4242 >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK] DICOM port rule added
    ) else (
        echo [WARNING] Could not add DICOM port rule
    )
) else (
    echo [OK] DICOM port rule already exists
)

netsh advfirewall firewall show rule name="Orthanc Web 8042" >nul 2>&1
if %errorlevel% neq 0 (
    echo Adding Orthanc web port rule...
    netsh advfirewall firewall add rule name="Orthanc Web 8042" dir=in action=allow protocol=TCP localport=8042 >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK] Orthanc web port rule added
    ) else (
        echo [WARNING] Could not add Orthanc web port rule
    )
) else (
    echo [OK] Orthanc web port rule already exists
)

echo.
echo Step 4: Opening Connection Manager...
echo.

REM Check if standalone HTML exists
if exist "connection-manager-standalone.html" (
    echo Opening connection manager in browser...
    start connection-manager-standalone.html
    echo [OK] Connection manager opened
) else (
    echo [INFO] Standalone HTML not found
    echo Opening web application...
    start http://localhost:5173/connection-manager
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next Steps:
echo 1. Enter your PACS server details
echo 2. Click "Save Configuration"
echo 3. Click "Run All Tests"
echo 4. Verify all tests pass (green checkmarks)
echo.
echo For help, see:
echo - LOCAL_MACHINE_CONNECTION_GUIDE.md
echo - EASY_CONNECTION_SETUP.md
echo - CONNECTION_QUICK_REFERENCE.md
echo.
echo ========================================
pause
