# Documentation Cleanup Script
# Organizes 300+ documentation files into a clean structure

Write-Host "`n🧹 Starting Documentation Cleanup...`n" -ForegroundColor Cyan

# Create directories
Write-Host "📁 Creating directory structure..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "docs/current" | Out-Null
New-Item -ItemType Directory -Force -Path "docs/archive" | Out-Null
New-Item -ItemType Directory -Force -Path "docs/features/signatures" | Out-Null
New-Item -ItemType Directory -Force -Path "docs/features/billing" | Out-Null
New-Item -ItemType Directory -Force -Path "docs/features/ai" | Out-Null
New-Item -ItemType Directory -Force -Path "docs/features/deployment" | Out-Null
New-Item -ItemType Directory -Force -Path "docs/features/reporting" | Out-Null
New-Item -ItemType Directory -Force -Path "docs/features/admin" | Out-Null

# Move essential docs to current
Write-Host "`n📋 Moving essential documentation..." -ForegroundColor Yellow
$essentialDocs = @(
    "README.md",
    "00_START_HERE.md",
    "BACKEND_IMPLEMENTATION_GUIDE.md",
    "IMPLEMENTATION_CHECKLIST.md",
    "VISUAL_INTEGRATION_GUIDE.md",
    "CLEANUP_DOCUMENTATION.md"
)

$movedCount = 0
foreach ($doc in $essentialDocs) {
    if (Test-Path $doc) {
        Copy-Item $doc "docs/current/" -Force
        Write-Host "  ✅ $doc" -ForegroundColor Green
        $movedCount++
    }
}

# Move feature-specific docs
Write-Host "`n🎯 Moving feature-specific documentation..." -ForegroundColor Yellow
$featureDocs = @{
    "FDA_SIGNATURE_INTEGRATION_GUIDE.md" = "docs/features/signatures/"
    "SIGNATURE_UPLOAD_FIX.md" = "docs/features/signatures/"
    "NEW_UI_SIGNATURE_CANVAS.md" = "docs/features/signatures/"
    
    "BILLING_SYSTEM_GUIDE.md" = "docs/features/billing/"
    "BILLING_SYSTEM_COMPLETE.md" = "docs/features/billing/"
    "BILLING_QUICK_START.md" = "docs/features/billing/"
    "BILLING_FRONTEND_INTEGRATION.md" = "docs/features/billing/"
    "README_BILLING.md" = "docs/features/billing/"
    
    "AI_ANALYSIS_SETUP_GUIDE.md" = "docs/features/ai/"
    "AI_SYSTEM_READY.md" = "docs/features/ai/"
    "HOW_TO_USE_AI_ANALYSIS.md" = "docs/features/ai/"
    "README_AI_SETUP.md" = "docs/features/ai/"
    "HUGGINGFACE_AI_SETUP.md" = "docs/features/ai/"
    
    "AWS_DEPLOYMENT_GUIDE.md" = "docs/features/deployment/"
    "DEPLOYMENT_CHECKLIST.md" = "docs/features/deployment/"
    "PRODUCTION_DEPLOYMENT_CHECKLIST.md" = "docs/features/deployment/"
    "VPS_UPGRADE_GUIDE.md" = "docs/features/deployment/"
    
    "PROFESSIONAL_REPORTING_SYSTEM_COMPLETE.md" = "docs/features/reporting/"
    "STRUCTURED_REPORTING_GUIDE.md" = "docs/features/reporting/"
    "UNIFIED_REPORT_EDITOR_GUIDE.md" = "docs/features/reporting/"
    
    "SUPER_ADMIN_SETUP_GUIDE.md" = "docs/features/admin/"
    "ADMIN_FEATURES_SUMMARY.md" = "docs/features/admin/"
    "USER_MANAGEMENT_AUDIT.md" = "docs/features/admin/"
}

$featureCount = 0
foreach ($doc in $featureDocs.Keys) {
    if (Test-Path $doc) {
        Copy-Item $doc $featureDocs[$doc] -Force
        Write-Host "  ✅ $doc" -ForegroundColor Green
        $featureCount++
    }
}

# Move all remaining .md files to archive
Write-Host "`n📦 Archiving remaining documentation..." -ForegroundColor Yellow
$archivedCount = 0
Get-ChildItem -Filter "*.md" | Where-Object { 
    $_.Name -ne "README.md" -and 
    -not $_.FullName.Contains("docs\") 
} | ForEach-Object {
    Copy-Item $_.FullName "docs/archive/" -Force
    Write-Host "  📦 $($_.Name)" -ForegroundColor Gray
    $archivedCount++
}

# Delete .txt duplicates
Write-Host "`n🗑️  Removing duplicate .txt files..." -ForegroundColor Yellow
$txtFiles = @(
    "SYSTEM_STATUS.txt",
    "START_HERE.txt",
    "AI_QUICK_REFERENCE.txt",
    "AI_QUICK_START.txt",
    "EVERYTHING_WORKING.txt",
    "AI_INTEGRATION_COMPLETE.txt"
)

$deletedCount = 0
foreach ($txt in $txtFiles) {
    if (Test-Path $txt) {
        Remove-Item $txt -Force
        Write-Host "  🗑️  $txt" -ForegroundColor Red
        $deletedCount++
    }
}

# Create index file
Write-Host "`n📝 Creating documentation index..." -ForegroundColor Yellow
$indexContent = @"
# 📚 Documentation Index

## 🎯 Essential Documentation

Located in ``docs/current/``:

1. **README.md** - Project overview and setup
2. **00_START_HERE.md** - Quick start guide
3. **BACKEND_IMPLEMENTATION_GUIDE.md** - Complete backend API reference (67 endpoints)
4. **IMPLEMENTATION_CHECKLIST.md** - Week-by-week implementation tasks
5. **VISUAL_INTEGRATION_GUIDE.md** - UI mockups and user flows
6. **CLEANUP_DOCUMENTATION.md** - This cleanup guide

## 🎯 Feature Documentation

Located in ``docs/features/``:

### Signatures (``docs/features/signatures/``)
- FDA_SIGNATURE_INTEGRATION_GUIDE.md
- SIGNATURE_UPLOAD_FIX.md
- NEW_UI_SIGNATURE_CANVAS.md

### Billing (``docs/features/billing/``)
- BILLING_SYSTEM_GUIDE.md
- BILLING_SYSTEM_COMPLETE.md
- BILLING_QUICK_START.md

### AI Analysis (``docs/features/ai/``)
- AI_ANALYSIS_SETUP_GUIDE.md
- AI_SYSTEM_READY.md
- HOW_TO_USE_AI_ANALYSIS.md

### Deployment (``docs/features/deployment/``)
- AWS_DEPLOYMENT_GUIDE.md
- DEPLOYMENT_CHECKLIST.md
- PRODUCTION_DEPLOYMENT_CHECKLIST.md

### Reporting (``docs/features/reporting/``)
- PROFESSIONAL_REPORTING_SYSTEM_COMPLETE.md
- STRUCTURED_REPORTING_GUIDE.md
- UNIFIED_REPORT_EDITOR_GUIDE.md

### Admin (``docs/features/admin/``)
- SUPER_ADMIN_SETUP_GUIDE.md
- ADMIN_FEATURES_SUMMARY.md
- USER_MANAGEMENT_AUDIT.md

## 📦 Archived Documentation

Located in ``docs/archive/``:
- All historical and duplicate documentation
- Can be safely deleted if not needed

## 🚀 Quick Links

- **Start Here**: [00_START_HERE.md](current/00_START_HERE.md)
- **Backend APIs**: [BACKEND_IMPLEMENTATION_GUIDE.md](current/BACKEND_IMPLEMENTATION_GUIDE.md)
- **Implementation Tasks**: [IMPLEMENTATION_CHECKLIST.md](current/IMPLEMENTATION_CHECKLIST.md)

---

**Last Updated**: $(Get-Date -Format "yyyy-MM-dd HH:mm")
"@

Set-Content -Path "docs/DOCUMENTATION_INDEX.md" -Value $indexContent

# Summary
Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "`n✅ Documentation Cleanup Complete!`n" -ForegroundColor Green
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "  ✅ Essential docs moved: $movedCount" -ForegroundColor Green
Write-Host "  🎯 Feature docs organized: $featureCount" -ForegroundColor Green
Write-Host "  📦 Files archived: $archivedCount" -ForegroundColor Yellow
Write-Host "  🗑️  Duplicates removed: $deletedCount" -ForegroundColor Red
Write-Host "`n📁 New Structure:" -ForegroundColor Cyan
Write-Host "  docs/current/        - Essential documentation" -ForegroundColor White
Write-Host "  docs/features/       - Feature-specific guides" -ForegroundColor White
Write-Host "  docs/archive/        - Historical documentation" -ForegroundColor White
Write-Host "`n📝 See docs/DOCUMENTATION_INDEX.md for complete index" -ForegroundColor Yellow
Write-Host "`n" + ("=" * 60) + "`n" -ForegroundColor Cyan
