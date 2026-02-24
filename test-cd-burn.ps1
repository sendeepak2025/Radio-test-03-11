# Test CD Burn Functionality
# This script tests if IMAPI2 COM objects are available and if a CD/DVD burner is detected

Write-Host "Testing CD Burn Prerequisites..." -ForegroundColor Cyan
Write-Host ""

try {
    # Test 1: Check if IMAPI2 is available
    Write-Host "[1/4] Checking IMAPI2 availability..." -ForegroundColor Yellow
    $discMaster = New-Object -ComObject IMAPI2.MsftDiscMaster2
    Write-Host "  ✓ IMAPI2 is available" -ForegroundColor Green
    
    # Test 2: Check for CD/DVD burners
    Write-Host "[2/4] Detecting CD/DVD burners..." -ForegroundColor Yellow
    if ($discMaster.Count -eq 0) {
        Write-Host "  ✗ No CD/DVD burner found on this system" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ Found $($discMaster.Count) CD/DVD burner(s)" -ForegroundColor Green
    
    # Test 3: List available drives
    Write-Host "[3/4] Listing available drives..." -ForegroundColor Yellow
    for ($i = 0; $i -lt $discMaster.Count; $i++) {
        $recorder = New-Object -ComObject IMAPI2.MsftDiscRecorder2
        $recorder.InitializeDiscRecorder($discMaster.Item($i))
        
        Write-Host "  Drive $($i + 1):" -ForegroundColor Cyan
        Write-Host "    Product ID: $($recorder.ProductId)" -ForegroundColor White
        Write-Host "    Vendor ID: $($recorder.VendorId)" -ForegroundColor White
        
        $volumePaths = $recorder.VolumePathNames
        if ($volumePaths.Count -gt 0) {
            Write-Host "    Drive Letters: $($volumePaths -join ', ')" -ForegroundColor White
        } else {
            Write-Host "    Drive Letters: None" -ForegroundColor White
        }
        
        # Check if media is present
        $format = New-Object -ComObject IMAPI2.MsftDiscFormat2Data
        $format.Recorder = $recorder
        
        if ($format.IsRecorderSupported($recorder)) {
            Write-Host "    Supports burning: Yes" -ForegroundColor Green
            
            if ($format.IsCurrentMediaSupported($recorder)) {
                Write-Host "    Writable media present: Yes" -ForegroundColor Green
            } else {
                Write-Host "    Writable media present: No (insert blank CD/DVD)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "    Supports burning: No" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    # Test 4: Check ADODB for ZIP burning
    Write-Host "[4/4] Checking ADODB Stream availability..." -ForegroundColor Yellow
    $adodb = New-Object -ComObject ADODB.Stream
    Write-Host "  ✓ ADODB Stream is available" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "All prerequisites are met! CD burning should work." -ForegroundColor Green
    Write-Host ""
    Write-Host "Note: Make sure to insert a blank CD/DVD before attempting to burn." -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "CD burning may not work on this system." -ForegroundColor Red
    exit 1
}
