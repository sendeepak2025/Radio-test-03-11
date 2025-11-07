# Test Sign Report API
# Usage: .\test-sign-report.ps1

$reportId = "SR-1762513062006-qgffecxsl"
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OGYyMzFlNzMwMWVkMzk3OWMxNGM1ZDQiLCJ1c2VybmFtZSI6Imhvc3BpdGFsIiwicm9sZXMiOlsiYWRtaW4iLCJyYWRpb2xvZ2lzdCJdLCJwZXJtaXNzaW9ucyI6WyJzdHVkaWVzOnJlYWQiLCJzdHVkaWVzOndyaXRlIiwicGF0aWVudHM6cmVhZCIsInBhdGllbnRzOndyaXRlIiwidXNlcnM6cmVhZCJdLCJob3NwaXRhbElkIjoiNjhmMjMxZTczMDFlZDM5NzljMTRjNWQ0IiwiaWF0IjoxNzYyNTEzMDE5LCJleHAiOjE3NjI1MTQ4MTl9.MKwU0uhvhliblmrDpLbTp_t2GwAVkZDlu6qyONbeTLg"

$body = @{
    signatureData = @{
        signatureText = "Dr. Hospital Admin"
        signatureMeaning = "authored"
        password = "123456"
        signatureImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        timestamp = "2025-11-07T11:00:27.439Z"
    }
    reportContent = @{
        clinicalHistory = "test"
        technique = "test"
        findingsText = "test test test test"
        impression = "test impression"
        recommendations = "test"
    }
} | ConvertTo-Json -Depth 10

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

Write-Host "`n📝 Sending sign request..." -ForegroundColor Cyan
Write-Host "Report ID: $reportId" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod `
        -Uri "http://localhost:3010/api/reports/$reportId/sign" `
        -Method Post `
        -Headers $headers `
        -Body $body
    
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
} catch {
    Write-Host "❌ ERROR!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error Message:" -ForegroundColor Red
    $_.Exception.Message | Write-Host
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Details:" -ForegroundColor Yellow
        $_.ErrorDetails.Message | Write-Host
    }
}

Write-Host ""
Write-Host "Check server logs for more details" -ForegroundColor Gray
