# Test Script: Upload DICOM and Verify Worklist Creation
# Run this AFTER restarting the server

$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OGYyMzFlNzMwMWVkMzk3OWMxNGM1ZDQiLCJ1c2VybmFtZSI6Imhvc3BpdGFsIiwicm9sZXMiOlsiYWRtaW4iLCJyYWRpb2xvZ2lzdCJdLCJwZXJtaXNzaW9ucyI6WyJzdHVkaWVzOnJlYWQiLCJzdHVkaWVzOndyaXRlIiwicGF0aWVudHM6cmVhZCIsInBhdGllbnRzOndyaXRlIiwidXNlcnM6cmVhZCJdLCJob3NwaXRhbElkIjoiNjhmMjMxZTczMDFlZDM5NzljMTRjNWQ0IiwiaWF0IjoxNzYyNDMxNDY2LCJleHAiOjE3NjI0MzMyNjZ9.fLgffs_UGWQZ-9uOKlCf62iZdjAkQF7qDfd9uJSw3oQ"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "WORKLIST UPLOAD TEST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check server is running
Write-Host "Step 1: Checking server..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8001/health" -ErrorAction Stop
    Write-Host "✅ Server is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is NOT running! Please start the server first." -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Check worklist BEFORE upload
Write-Host "Step 2: Checking worklist BEFORE upload..." -ForegroundColor Yellow
try {
    $before = Invoke-RestMethod -Uri "http://localhost:8001/api/worklist/debug" -Headers @{Authorization="Bearer $token"}
    Write-Host "   Total items: $($before.debug.counts.total)" -ForegroundColor White
    Write-Host "   Matching hospitalId: $($before.debug.counts.matchingHospitalId)" -ForegroundColor White
} catch {
    Write-Host "❌ Failed to check worklist: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Step 3: Upload DICOM file
Write-Host "Step 3: Uploading DICOM file..." -ForegroundColor Yellow
try {
    $uploadResult = curl.exe -X POST "http://localhost:8001/api/dicom/upload" `
        -H "Authorization: Bearer $token" `
        -F "file=@testupload.dcm" 2>&1 | ConvertFrom-Json
    
    if ($uploadResult.success) {
        Write-Host "✅ Upload successful!" -ForegroundColor Green
        Write-Host "   Study UID: $($uploadResult.data.studyInstanceUID)" -ForegroundColor White
        Write-Host "   Patient ID: $($uploadResult.data.patientID)" -ForegroundColor White
        Write-Host "   Patient Name: $($uploadResult.data.patientName)" -ForegroundColor White
    } else {
        Write-Host "❌ Upload failed: $($uploadResult.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Upload error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Wait a moment for database write
Write-Host "Step 4: Waiting for database write..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
Write-Host ""

# Step 5: Check worklist AFTER upload
Write-Host "Step 5: Checking worklist AFTER upload..." -ForegroundColor Yellow
try {
    $after = Invoke-RestMethod -Uri "http://localhost:8001/api/worklist/debug" -Headers @{Authorization="Bearer $token"}
    Write-Host "   Total items: $($after.debug.counts.total)" -ForegroundColor White
    Write-Host "   Matching hospitalId: $($after.debug.counts.matchingHospitalId)" -ForegroundColor White
    
    if ($after.debug.counts.total -gt $before.debug.counts.total) {
        Write-Host "✅ SUCCESS! Worklist item was created!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Worklist Item Details:" -ForegroundColor Cyan
        $item = $after.debug.allItems[0]
        Write-Host "   Study UID: $($item.studyInstanceUID)" -ForegroundColor White
        Write-Host "   Patient ID: $($item.patientID)" -ForegroundColor White
        Write-Host "   Hospital ID: $($item.hospitalId)" -ForegroundColor White
        Write-Host "   Status: $($item.status)" -ForegroundColor White
        Write-Host "   Report Status: $($item.reportStatus)" -ForegroundColor White
    } else {
        Write-Host "❌ FAILED! Worklist item was NOT created!" -ForegroundColor Red
        Write-Host "   This means the server hasn't been restarted with the new code." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to check worklist: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Step 6: Check worklist via main endpoint
Write-Host "Step 6: Checking main worklist endpoint..." -ForegroundColor Yellow
try {
    $worklist = Invoke-RestMethod -Uri "http://localhost:8001/api/worklist" -Headers @{Authorization="Bearer $token"}
    Write-Host "   Items in worklist: $($worklist.count)" -ForegroundColor White
    
    if ($worklist.count -gt 0) {
        Write-Host "✅ Worklist is populated!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Worklist is empty (might be filtered by date)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to check worklist: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
