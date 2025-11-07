#!/usr/bin/env pwsh
# Fix all landing page imports

Write-Host "Fixing landing page imports..." -ForegroundColor Cyan

$files = Get-ChildItem -Path "viewer/src/components/landing/ui" -Filter "*.tsx" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Fix @/lib/utils imports
    $content = $content -replace 'from "@/lib/utils"', 'from "@/lib/landing/utils"'
    
    # Fix @/components/ui/ imports
    $content = $content -replace 'from "@/components/ui/', 'from "@/components/landing/ui/'
    
    # Fix @/hooks/ imports
    $content = $content -replace 'from "@/hooks/', 'from "@/hooks/landing/'
    
    Set-Content -Path $file.FullName -Value $content -NoNewline
    Write-Host "Fixed: $($file.Name)" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ All imports fixed!" -ForegroundColor Green
