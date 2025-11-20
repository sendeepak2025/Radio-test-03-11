@echo off
echo ========================================
echo Diagnostic Check for Specialized Modules
echo ========================================
echo.

echo [1/5] Checking if MongoDB is running...
tasklist | findstr /i "mongod.exe" > nul
if %errorlevel% equ 0 (
    echo     ✅ MongoDB is running
) else (
    echo     ❌ MongoDB is NOT running
    echo     Fix: net start MongoDB
)
echo.

echo [2/5] Checking MongoDB connection...
cd server
node -e "require('mongoose').connect('mongodb://localhost:27017/radiology').then(()=>{console.log('    ✅ MongoDB connection successful');process.exit(0)}).catch(e=>{console.log('    ❌ MongoDB connection failed:',e.message);process.exit(1)})" 2>nul
if %errorlevel% neq 0 (
    echo     ❌ Cannot connect to MongoDB
    echo     Fix: Check MongoDB is running on port 27017
)
echo.

echo [3/5] Checking templates in database...
node -e "const m=require('mongoose');const RT=require('./src/models/ReportTemplate');m.connect('mongodb://localhost:27017/radiology').then(()=>RT.countDocuments()).then(c=>{console.log('    Templates found:',c);if(c>=3){console.log('    ✅ Templates are seeded');}else{console.log('    ❌ Templates NOT seeded (found:'+c+', expected: 3+)');}}).then(()=>process.exit(0)).catch(e=>{console.log('    ❌ Error checking templates:',e.message);process.exit(1)})" 2>nul
echo.

echo [4/5] Checking specialized templates...
node -e "const m=require('mongoose');const RT=require('./src/models/ReportTemplate');m.connect('mongodb://localhost:27017/radiology').then(()=>RT.find({templateId:{$in:['MAMMO-BIRADS-01','MRI-SPINE-01','CT-CHEST-01']}})).then(t=>{console.log('    Specialized templates:');t.forEach(x=>{console.log('      -',x.templateId,'(',x.name,')');if(x.uiModules && x.uiModules.length>0){console.log('        ✅ Has',x.uiModules.length,'UI modules');}else{console.log('        ❌ Missing uiModules');}});}).then(()=>process.exit(0)).catch(e=>{console.log('    ❌ Error:',e.message);process.exit(1)})" 2>nul
echo.

echo [5/5] Checking backend server...
curl -s http://localhost:3000/api/reports/templates > nul 2>&1
if %errorlevel% equ 0 (
    echo     ✅ Backend server is running
    curl -s http://localhost:3000/api/reports/templates > temp_templates.json
    node -e "const fs=require('fs');try{const d=JSON.parse(fs.readFileSync('temp_templates.json','utf8'));console.log('    ✅ API returns',d.templates?.length||0,'templates');}catch(e){console.log('    ❌ API error:',e.message)}" 2>nul
    del temp_templates.json 2>nul
) else (
    echo     ❌ Backend server is NOT running
    echo     Fix: cd server ^&^& npm start
)
echo.

echo ========================================
echo Summary
echo ========================================
echo.
echo If all checks pass (✅), the specialized modules should work.
echo If any check fails (❌), follow the fix instructions above.
echo.
echo Next: Run setup-specialized-modules.bat to seed templates
echo.
pause
