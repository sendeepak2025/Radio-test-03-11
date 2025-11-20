@echo off
echo ========================================
echo Seed Specialized Templates to MongoDB Atlas
echo ========================================
echo.
echo Target: MongoDB Atlas (Cluster1)
echo Database: radiology-final-21-10
echo.

cd server

echo Running seed script...
echo This will add 3 specialized templates with UI modules:
echo   - MAMMO-BIRADS-01 (BI-RADS Calculator)
echo   - MRI-SPINE-01 (Spine Checklist)
echo   - CT-CHEST-01 (Nodule Measurements)
echo.

node src/seed/seedEnhancedTemplatesWithModules.js

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Seed failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Verification
echo ========================================
echo.

node check-atlas-templates.js

echo.
pause
