#!/usr/bin/env pwsh
# Clean install of Tailwind CSS v3

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Clean Install Tailwind CSS v3" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location viewer

Write-Host "Step 1: Removing node_modules..." -ForegroundColor Yellow
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Write-Host "  ✓ Done" -ForegroundColor Green

Write-Host ""
Write-Host "Step 2: Removing package-lock.json..." -ForegroundColor Yellow
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
Write-Host "  ✓ Done" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Installing all dependencies..." -ForegroundColor Yellow
npm install --force

Write-Host ""
Write-Host "Step 4: Installing Tailwind CSS v3..." -ForegroundColor Yellow
npm install tailwindcss@3.4.1 postcss@8.4.35 autoprefixer@10.4.17 --save-dev --force

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Clean install complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Now start the app:" -ForegroundColor Cyan
Write-Host "  cd viewer" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""

Set-Location ..
