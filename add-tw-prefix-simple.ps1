#!/usr/bin/env pwsh
# Simple script to add tw- prefix to Tailwind classes

Write-Host "Adding tw- prefix to all className attributes..." -ForegroundColor Cyan
Write-Host ""

# Get all TSX files in landing pages and components
$files = Get-ChildItem -Path "viewer/src" -Include "*.tsx" -Recurse | Where-Object {
    $_.FullName -like "*\landing\*"
}

foreach ($file in $files) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Yellow
    
    $content = Get-Content $file.FullName -Raw
    
    # Replace className=" with className="tw-
    # This adds tw- to the start of every className
    $content = $content -replace 'className="', 'className="tw-'
    
    # Fix double prefixes (tw-tw-)
    $content = $content -replace 'tw-tw-', 'tw-'
    
    # Fix spaces after tw- (tw- flex -> tw-flex tw-)
    $content = $content -replace 'tw-([a-zA-Z0-9\-]+)\s+', 'tw-$1 tw-'
    
    # Remove tw- from the end if it's alone
    $content = $content -replace '\s+tw-"', '"'
    $content = $content -replace 'className="tw-"', 'className=""'
    
    Set-Content -Path $file.FullName -Value $content -NoNewline
    Write-Host "  ✓ Done" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ All files updated!" -ForegroundColor Green
Write-Host ""
Write-Host "Note: Please review the changes manually as some classes" -ForegroundColor Yellow
Write-Host "might need adjustment. Non-Tailwind classes should not have tw- prefix." -ForegroundColor Yellow
