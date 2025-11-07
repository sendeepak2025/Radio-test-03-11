@echo off
echo.
echo ========================================
echo    ANATOMICAL DIAGRAMS - QUICK TEST
echo ========================================
echo.

cd viewer

echo [1/3] Checking if diagrams exist...
if exist "public\diagrams\chest-frontal.svg" (
    echo   ✓ Diagrams folder found!
) else (
    echo   ✗ Diagrams folder not found!
    echo   Creating fallback diagrams...
    node scripts\create-fallback-diagrams.js
)

echo.
echo [2/3] Counting diagrams...
for /f %%A in ('dir /b public\diagrams\*.svg ^| find /c /v ""') do set count=%%A
echo   Found %count% SVG diagrams

echo.
echo [3/3] Starting dev server...
echo.
echo ========================================
echo   Opening test page in browser...
echo   URL: http://localhost:5173/test-diagrams.html
echo ========================================
echo.
echo   Press Ctrl+C to stop the server
echo.

timeout /t 3 /nobreak >nul
start http://localhost:5173/test-diagrams.html

npm run dev
