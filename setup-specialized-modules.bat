@echo off
echo ========================================
echo Specialized Reporting Modules Setup
echo ========================================
echo.

REM Check if MongoDB is running
tasklist | findstr /i "mongod.exe" > nul
if %errorlevel% equ 0 (
    echo [OK] MongoDB is running
) else (
    echo [ERROR] MongoDB is NOT running!
    echo.
    echo Please start MongoDB first:
    echo   Option 1: net start MongoDB
    echo   Option 2: Start MongoDB Compass
    echo   Option 3: docker run -d -p 27017:27017 mongo:7.0
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Step 1: Seeding Templates to Database
echo ========================================
cd server

echo Running seed script...
node src/seed/seedEnhancedTemplatesWithModules.js

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Seed script failed!
    echo Check that MongoDB connection is correct in .env file
    pause
    exit /b 1
)

echo.
echo ========================================
echo Step 2: Verification
echo ========================================

echo Checking if templates were created...
node -e "const m=require('mongoose');const RT=require('./src/models/ReportTemplate');m.connect('mongodb://localhost:27017/radiology').then(()=>RT.countDocuments()).then(c=>{console.log('Templates in database:',c);if(c<3){console.log('[WARNING] Expected at least 3 templates');process.exit(1);}else{console.log('[OK] Templates seeded successfully');}}).then(()=>process.exit(0)).catch(e=>{console.error('[ERROR]',e.message);process.exit(1)})"

if %errorlevel% neq 0 (
    echo [ERROR] Verification failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Start backend: cd server ^&^& npm start
echo   2. Start frontend: cd viewer ^&^& npm run dev
echo   3. Create Mammography report (Modality: MG, Body Part: BREAST)
echo   4. You should see BI-RADS Calculator at the top!
echo.
echo Templates created:
echo   - MAMMO-BIRADS-01 (Mammography BI-RADS)
echo   - MRI-SPINE-01 (MRI Spine Assessment)
echo   - CT-CHEST-01 (CT Chest Nodules)
echo.
pause
