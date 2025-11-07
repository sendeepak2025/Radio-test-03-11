@echo off
echo ========================================
echo   ScanFlow AI Landing Page Startup
echo ========================================
echo.

cd landing-page

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Starting Landing Page...
echo.
echo Landing Page will be available at:
echo   http://localhost:3000
echo.
echo Main Dashboard is at:
echo   http://localhost:5173
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run dev
