#!/usr/bin/env pwsh
# Verify Tailwind CSS setup

Write-Host "Verifying Tailwind CSS Setup" -ForegroundColor Cyan
Write-Host ""

Set-Location viewer

Write-Host "Checking Tailwind CSS..." -ForegroundColor Yellow
npm list tailwindcss

Write-Host ""
Write-Host "Checking tailwindcss-animate..." -ForegroundColor Yellow
npm list tailwindcss-animate

Write-Host ""
Write-Host "All packages verified!" -ForegroundColor Green
Write-Host "Now start: npm run dev" -ForegroundColor Cyan

Set-Location ..
