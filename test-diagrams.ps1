#!/usr/bin/env pwsh
# Test and manage anatomical diagrams

Write-Host ""
Write-Host "🎨 Anatomical Diagrams Manager" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$diagramsPath = "viewer\public\diagrams"

# Check if diagrams directory exists
if (-not (Test-Path $diagramsPath)) {
    Write-Host "❌ Diagrams directory not found!" -ForegroundColor Red
    Write-Host "Creating directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $diagramsPath -Force | Out-Null
}

# Count diagrams
$svgFiles = Get-ChildItem -Path $diagramsPath -Filter "*.svg" | Where-Object { $_.Name -ne "1.svg" }
$totalDiagrams = $svgFiles.Count

Write-Host "📊 Status:" -ForegroundColor Green
Write-Host "  Total diagrams: $totalDiagrams" -ForegroundColor White
Write-Host ""

# List all diagrams by category
$categories = @{
    "Full Body" = @("fullbody-neutral_frontal.svg", "fullbody-female_frontal.svg");
    "Head and Brain" = @("headbrain-axial.svg", "headbrain-sagittal.svg", "headbrain-coronal.svg");
    "Chest" = @("chest-frontal.svg", "chest-lateral.svg", "chest-axial.svg");
    "Abdomen" = @("abdomen-frontal.svg", "abdomen-quadrants.svg");
    "Spine" = @("spine-lateral.svg", "spine-frontal.svg");
    "Pelvis" = @("pelvis-frontal.svg");
    "Extremities" = @("extremities-shoulder.svg", "extremities-hand.svg", "extremities-knee.svg");
}

$allPresent = $true

foreach ($category in $categories.Keys) {
    Write-Host "📁 $category" -ForegroundColor Cyan
    foreach ($file in $categories[$category]) {
        $filePath = Join-Path $diagramsPath $file
        if (Test-Path $filePath) {
            $size = (Get-Item $filePath).Length
            Write-Host "  ✅ $file ($size bytes)" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $file (missing)" -ForegroundColor Red
            $allPresent = $false
        }
    }
    Write-Host ""
}

# Summary
Write-Host "================================" -ForegroundColor Cyan
if ($allPresent) {
    Write-Host "✅ All diagrams are present!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some diagrams are missing" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To create missing diagrams, run:" -ForegroundColor White
    Write-Host "  node viewer/scripts/create-fallback-diagrams.js" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "🚀 Quick Actions:" -ForegroundColor Cyan
Write-Host "  1. Test diagrams in browser:" -ForegroundColor White
Write-Host "     Start dev server and visit: http://localhost:5173/test-diagrams.html" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Download from Wikimedia:" -ForegroundColor White
Write-Host "     node viewer/scripts/download-anatomical-diagrams.js" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Create fallback diagrams:" -ForegroundColor White
Write-Host "     node viewer/scripts/create-fallback-diagrams.js" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. View in file explorer:" -ForegroundColor White
Write-Host "     explorer $diagramsPath" -ForegroundColor Gray
Write-Host ""
Write-Host "✨ Done!" -ForegroundColor Green
Write-Host ""
