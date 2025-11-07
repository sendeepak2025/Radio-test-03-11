#!/usr/bin/env pwsh
# Fix Tailwind CSS version issue with legacy peer deps

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fixing Tailwind CSS Version" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location viewer

Write-Host "Uninstalling Tailwind CSS v4..." -ForegroundColor Yellow
npm uninstall tailwindcss --legacy-peer-deps

Write-Host ""
Write-Host "Installing Tailwind CSS v3 (compatible version)..." -ForegroundColor Yellow
npm install -D tailwindcss@^3.4.1 postcss@^8.4.35 autoprefixer@^10.4.17 --legacy-peer-deps

Write-Host ""
Write-Host "✅ Tailwind CSS v3 installed!" -ForegroundColor Green
Write-Host ""
Write-Host "Now you can start the app:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""

Set-Location ..
