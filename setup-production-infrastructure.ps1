# Production Infrastructure Setup Script for Windows
Write-Host "🏗️ Setting up Production Infrastructure..." -ForegroundColor Cyan
Write-Host ""

# Check if server is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ Backend server is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend server is not running!" -ForegroundColor Red
    Write-Host "Please start the server first: cd server; npm start" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Get credentials
$username = Read-Host "Username"
$password = Read-Host "Password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

# Login and get token
Write-Host "🔐 Logging in..." -ForegroundColor Cyan
$loginBody = @{
    username = $username
    password = $passwordPlain
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json"
    
    $token = $loginResponse.token
    Write-Host "✅ Login successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Login failed! Please check your credentials." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Sync worklist
Write-Host "🔄 Syncing worklist from studies database..." -ForegroundColor Cyan
try {
    $syncResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/worklist/sync" `
        -Method Post `
        -Headers @{ Authorization = "Bearer $token" }
    
    if ($syncResponse.success) {
        Write-Host "✅ Worklist synced successfully!" -ForegroundColor Green
        Write-Host "   - Created: $($syncResponse.created) new worklist items" -ForegroundColor White
        Write-Host "   - Skipped: $($syncResponse.skipped) existing items" -ForegroundColor White
        Write-Host "   - Total studies: $($syncResponse.total)" -ForegroundColor White
    } else {
        Write-Host "⚠️ Worklist sync failed or no studies found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Could not sync worklist: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# Get statistics
Write-Host "📊 Fetching worklist statistics..." -ForegroundColor Cyan
try {
    $statsResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/worklist/stats" `
        -Method Get `
        -Headers @{ Authorization = "Bearer $token" }
    
    if ($statsResponse.success) {
        Write-Host "✅ Worklist Statistics:" -ForegroundColor Green
        Write-Host "   Total: $($statsResponse.statistics.total)" -ForegroundColor White
        Write-Host "   Pending: $($statsResponse.statistics.byStatus.pending)" -ForegroundColor Yellow
        Write-Host "   In Progress: $($statsResponse.statistics.byStatus.inProgress)" -ForegroundColor Cyan
        Write-Host "   Completed: $($statsResponse.statistics.byStatus.completed)" -ForegroundColor Green
        Write-Host "   STAT: $($statsResponse.statistics.byPriority.stat)" -ForegroundColor Red
        Write-Host "   Urgent: $($statsResponse.statistics.byPriority.urgent)" -ForegroundColor Magenta
        Write-Host "   Critical Unnotified: $($statsResponse.statistics.criticalUnnotified)" -ForegroundColor Red
    }
} catch {
    Write-Host "⚠️ Could not fetch statistics: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Production Infrastructure Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Open your browser to: http://localhost:5173/worklist" -ForegroundColor White
Write-Host "2. View the worklist with all your studies" -ForegroundColor White
Write-Host "3. Click 'Start Reading' to begin workflow" -ForegroundColor White
Write-Host "4. Create reports and they'll be saved to database" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation: PRODUCTION_INFRASTRUCTURE_COMPLETE.md" -ForegroundColor Cyan
Write-Host ""
