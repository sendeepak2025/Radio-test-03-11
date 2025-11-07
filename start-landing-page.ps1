#!/usr/bin/env pwsh
# Start Landing Page Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ScanFlow AI Landing Page Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to landing page directory
Set-Location landing-page

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

Write-Host "Starting Landing Page..." -ForegroundColor Green
Write-Host ""
Write-Host "Landing Page will be available at:" -ForegroundColor Cyan
Write-Host "  http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Main Dashboard is at:" -ForegroundColor Cyan
Write-Host "  http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the development server
npm run dev
