# Setup DICOM Viewer for CD Burning
# This script downloads and sets up MicroDicom portable viewer

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DICOM Viewer Setup for CD Burning" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$resourcesDir = Join-Path $PSScriptRoot "..\resources"
$viewerDir = Join-Path $resourcesDir "microdicom-portable"
$tempDir = Join-Path $env:TEMP "microdicom-setup"

# MicroDicom download URL (update if needed)
$downloadUrl = "http://www.microdicom.com/downloads/MicroDicom_2023.3_Portable.zip"
$zipFile = Join-Path $tempDir "microdicom.zip"

Write-Host "Step 1: Checking existing installation..." -ForegroundColor Yellow

if (Test-Path $viewerDir) {
    $exePath = Join-Path $viewerDir "MicroDicom.exe"
    if (Test-Path $exePath) {
        Write-Host "  ✓ MicroDicom already installed at: $viewerDir" -ForegroundColor Green
        Write-Host ""
        $response = Read-Host "Do you want to reinstall? (y/N)"
        if ($response -ne "y" -and $response -ne "Y") {
            Write-Host "Setup cancelled." -ForegroundColor Yellow
            exit 0
        }
        Write-Host "  Removing existing installation..." -ForegroundColor Yellow
        Remove-Item -Path $viewerDir -Recurse -Force
    }
}

Write-Host ""
Write-Host "Step 2: Creating directories..." -ForegroundColor Yellow

# Create directories
New-Item -ItemType Directory -Path $resourcesDir -Force | Out-Null
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

Write-Host "  ✓ Directories created" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Downloading MicroDicom..." -ForegroundColor Yellow
Write-Host "  URL: $downloadUrl" -ForegroundColor Gray

try {
    # Try to download
    $webClient = New-Object System.Net.WebClient
    $webClient.DownloadFile($downloadUrl, $zipFile)
    Write-Host "  ✓ Download completed" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Automatic download failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual Setup Required:" -ForegroundColor Yellow
    Write-Host "1. Visit: http://www.microdicom.com/downloads.html" -ForegroundColor White
    Write-Host "2. Download MicroDicom Portable version" -ForegroundColor White
    Write-Host "3. Extract to: $viewerDir" -ForegroundColor White
    Write-Host "4. Ensure MicroDicom.exe is at: $viewerDir\MicroDicom.exe" -ForegroundColor White
    Write-Host ""
    
    # Open browser
    $openBrowser = Read-Host "Open download page in browser? (Y/n)"
    if ($openBrowser -ne "n" -and $openBrowser -ne "N") {
        Start-Process "http://www.microdicom.com/downloads.html"
    }
    
    exit 1
}

Write-Host ""
Write-Host "Step 4: Extracting files..." -ForegroundColor Yellow

try {
    # Extract ZIP
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($zipFile, $viewerDir)
    Write-Host "  ✓ Files extracted" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Extraction failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please extract manually:" -ForegroundColor Yellow
    Write-Host "  From: $zipFile" -ForegroundColor White
    Write-Host "  To: $viewerDir" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "Step 5: Verifying installation..." -ForegroundColor Yellow

$exePath = Join-Path $viewerDir "MicroDicom.exe"
if (Test-Path $exePath) {
    Write-Host "  ✓ MicroDicom.exe found" -ForegroundColor Green
    
    # Get file info
    $fileInfo = Get-Item $exePath
    Write-Host "  Version: $($fileInfo.VersionInfo.FileVersion)" -ForegroundColor Gray
    Write-Host "  Size: $([math]::Round($fileInfo.Length / 1MB, 2)) MB" -ForegroundColor Gray
} else {
    Write-Host "  ✗ MicroDicom.exe not found!" -ForegroundColor Red
    Write-Host "  Expected at: $exePath" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 6: Cleaning up..." -ForegroundColor Yellow

# Remove temp files
Remove-Item -Path $tempDir -Recurse -Force
Write-Host "  ✓ Temporary files removed" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Setup Completed Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "MicroDicom installed at:" -ForegroundColor White
Write-Host "  $viewerDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Test the viewer by running: $exePath" -ForegroundColor White
Write-Host "2. When burning CDs, check 'Include DICOM Viewer Software'" -ForegroundColor White
Write-Host "3. The viewer will be automatically added to burned discs" -ForegroundColor White
Write-Host ""

# Ask to test
$testNow = Read-Host "Launch MicroDicom now to test? (Y/n)"
if ($testNow -ne "n" -and $testNow -ne "N") {
    Write-Host "Launching MicroDicom..." -ForegroundColor Yellow
    Start-Process $exePath
}

Write-Host ""
Write-Host "Setup complete! You can now burn CDs with included viewer." -ForegroundColor Green
