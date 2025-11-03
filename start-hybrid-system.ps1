# Hybrid Viewer System - Quick Start Script
# Starts both your viewer and OHIF

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Hybrid Viewer System - Quick Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Orthanc is running
Write-Host "1. Checking Orthanc..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8042/system" -Method GET -TimeoutSec 3 -ErrorAction Stop
    Write-Host "   OK Orthanc is running" -ForegroundColor Green
}
catch {
    Write-Host "   ERROR Orthanc is not running!" -ForegroundColor Red
    Write-Host "   Please start Orthanc first" -ForegroundColor Yellow
    exit 1
}

# Start OHIF
Write-Host ""
Write-Host "2. Starting OHIF Viewer..." -ForegroundColor Yellow
Push-Location ohif-viewer
try {
    docker-compose up -d
    Write-Host "   OK OHIF started" -ForegroundColor Green
}
catch {
    Write-Host "   ERROR Failed to start OHIF" -ForegroundColor Red
    Write-Host "   Make sure Docker Desktop is running" -ForegroundColor Yellow
    Pop-Location
    exit 1
}
Pop-Location

# Wait for OHIF to be ready
Write-Host ""
Write-Host "3. Waiting for OHIF to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$ohifReady = $false

while ($attempt -lt $maxAttempts -and -not $ohifReady) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001" -Method GET -TimeoutSec 2 -ErrorAction Stop
        $ohifReady = $true
        Write-Host "   OK OHIF is ready" -ForegroundColor Green
    }
    catch {
        $attempt++
        Write-Host "   Waiting... ($attempt/$maxAttempts)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $ohifReady) {
    Write-Host "   WARNING OHIF took too long to start" -ForegroundColor Yellow
    Write-Host "   It may still be starting up..." -ForegroundColor Yellow
}

# Start your viewer (if not already running)
Write-Host ""
Write-Host "4. Starting your viewer..." -ForegroundColor Yellow
Push-Location viewer
try {
    # Check if already running
    $process = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*viewer*" }
    if ($process) {
        Write-Host "   OK Your viewer is already running" -ForegroundColor Green
    }
    else {
        Write-Host "   Starting development server..." -ForegroundColor Gray
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal
        Write-Host "   OK Your viewer is starting" -ForegroundColor Green
        Write-Host "   Check the new PowerShell window for status" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   WARNING Could not start viewer automatically" -ForegroundColor Yellow
    Write-Host "   Please run 'npm run dev' in the viewer directory" -ForegroundColor Yellow
}
Pop-Location

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  System Status" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "OK Orthanc PACS:     http://localhost:8042" -ForegroundColor Green
Write-Host "OK OHIF Viewer:      http://localhost:3001" -ForegroundColor Green
Write-Host "OK Your Viewer:      http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  How to Use" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Open your viewer:  http://localhost:3000" -ForegroundColor White
Write-Host "2. Open a study" -ForegroundColor White
Write-Host "3. Click 'OHIF Pro' button for advanced features" -ForegroundColor White
Write-Host "4. OHIF opens in new tab with the same study" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to open your viewer..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Open browser
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "Done! Enjoy your hybrid viewer system!" -ForegroundColor Green
Write-Host ""
