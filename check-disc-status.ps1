# Check Disc Status
# This script provides detailed information about the disc in your CD/DVD drive

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CD/DVD Disc Status Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    # Initialize disc master
    Write-Host "[1/5] Initializing disc master..." -ForegroundColor Yellow
    $discMaster = New-Object -ComObject IMAPI2.MsftDiscMaster2
    
    if ($discMaster.Count -eq 0) {
        Write-Host "  ✗ No CD/DVD burner found" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "  ✓ Found $($discMaster.Count) burner(s)" -ForegroundColor Green
    Write-Host ""
    
    # Check each recorder
    for ($i = 0; $i -lt $discMaster.Count; $i++) {
        Write-Host "[2/5] Checking Recorder $($i + 1)..." -ForegroundColor Yellow
        
        $recorder = New-Object -ComObject IMAPI2.MsftDiscRecorder2
        $recorder.InitializeDiscRecorder($discMaster.Item($i))
        
        Write-Host "  Product: $($recorder.ProductId)" -ForegroundColor White
        Write-Host "  Vendor: $($recorder.VendorId)" -ForegroundColor White
        Write-Host "  Revision: $($recorder.ProductRevision)" -ForegroundColor White
        
        $volumePaths = $recorder.VolumePathNames
        if ($volumePaths.Count -gt 0) {
            Write-Host "  Drive Letters: $($volumePaths -join ', ')" -ForegroundColor White
        }
        Write-Host ""
        
        # Check media presence
        Write-Host "[3/5] Checking Media Presence..." -ForegroundColor Yellow
        
        try {
            $mediaPresent = $recorder.MediaPresent
            
            if ($mediaPresent) {
                Write-Host "  ✓ Media is present" -ForegroundColor Green
            } else {
                Write-Host "  ✗ No media in drive" -ForegroundColor Red
                Write-Host "  → Please insert a disc and run this script again" -ForegroundColor Yellow
                continue
            }
        } catch {
            Write-Host "  ✗ Cannot detect media: $($_.Exception.Message)" -ForegroundColor Red
            continue
        }
        Write-Host ""
        
        # Get media details
        Write-Host "[4/5] Getting Media Details..." -ForegroundColor Yellow
        
        try {
            $mediaType = $recorder.CurrentMediaType
            $physicalMediaType = $recorder.CurrentPhysicalMediaType
            
            # Media type codes
            $mediaTypeNames = @{
                0 = "Unknown"
                1 = "CD-ROM"
                2 = "CD-R"
                3 = "CD-RW"
                4 = "DVD-ROM"
                5 = "DVD-RAM"
                6 = "DVD+RW"
                7 = "DVD+R"
                8 = "DVD-RW"
                9 = "DVD-R"
                10 = "DVD+R DL"
                11 = "DVD-R DL"
                12 = "BD-ROM"
                13 = "BD-R"
                14 = "BD-RE"
            }
            
            $mediaTypeName = if ($mediaTypeNames.ContainsKey($mediaType)) {
                $mediaTypeNames[$mediaType]
            } else {
                "Unknown ($mediaType)"
            }
            
            Write-Host "  Media Type: $mediaTypeName" -ForegroundColor White
            Write-Host "  Physical Type Code: $physicalMediaType" -ForegroundColor White
            
            # Check if it's writable
            $isWritable = $mediaType -in @(2, 3, 6, 7, 8, 9, 10, 11, 13, 14)
            if ($isWritable) {
                Write-Host "  ✓ Media is writable" -ForegroundColor Green
            } else {
                Write-Host "  ✗ Media is read-only (ROM)" -ForegroundColor Red
            }
            
        } catch {
            Write-Host "  ✗ Cannot get media details: $($_.Exception.Message)" -ForegroundColor Red
        }
        Write-Host ""
        
        # Check burn capability
        Write-Host "[5/5] Checking Burn Capability..." -ForegroundColor Yellow
        
        try {
            $format = New-Object -ComObject IMAPI2.MsftDiscFormat2Data
            $format.Recorder = $recorder
            $format.ForceOverwrite = $true
            
            # Check if recorder supports burning
            if ($format.IsRecorderSupported($recorder)) {
                Write-Host "  ✓ Recorder supports data burning" -ForegroundColor Green
            } else {
                Write-Host "  ✗ Recorder does not support data burning" -ForegroundColor Red
            }
            
            # Check if current media is supported
            if ($format.IsCurrentMediaSupported($recorder)) {
                Write-Host "  ✓ Current media is supported for burning" -ForegroundColor Green
            } else {
                Write-Host "  ✗ Current media is NOT supported for burning" -ForegroundColor Red
                Write-Host "  → Possible reasons:" -ForegroundColor Yellow
                Write-Host "     - Disc is finalized (closed session)" -ForegroundColor Gray
                Write-Host "     - Disc is full" -ForegroundColor Gray
                Write-Host "     - Disc is read-only (CD-ROM, DVD-ROM)" -ForegroundColor Gray
                Write-Host "     - Disc is damaged or incompatible" -ForegroundColor Gray
            }
            
            # Get free space
            try {
                $freeSpace = $format.FreeSectorsOnMedia
                $freeMB = [math]::Round($freeSpace * 2048 / 1MB, 2)
                
                Write-Host "  Free Space: $freeSpace sectors ($freeMB MB)" -ForegroundColor White
                
                if ($freeSpace -gt 0) {
                    Write-Host "  ✓ Disc has available space" -ForegroundColor Green
                } else {
                    Write-Host "  ✗ Disc is full or finalized" -ForegroundColor Red
                }
            } catch {
                Write-Host "  ✗ Cannot determine free space: $($_.Exception.Message)" -ForegroundColor Red
            }
            
        } catch {
            Write-Host "  ✗ Cannot check burn capability: $($_.Exception.Message)" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Recommendations:" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "For successful burning, you need:" -ForegroundColor White
    Write-Host "  ✓ Writable media (CD-R, CD-RW, DVD-R, DVD-RW, DVD+R, DVD+RW)" -ForegroundColor Gray
    Write-Host "  ✓ Blank or rewritable disc with available space" -ForegroundColor Gray
    Write-Host "  ✓ Disc not finalized/closed" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "If you see errors:" -ForegroundColor Yellow
    Write-Host "  1. Try a different disc (preferably blank)" -ForegroundColor White
    Write-Host "  2. Use rewritable media (CD-RW, DVD-RW) for testing" -ForegroundColor White
    Write-Host "  3. Ensure disc is not write-protected" -ForegroundColor White
    Write-Host "  4. Clean the disc and drive" -ForegroundColor White
    Write-Host "  5. Try a different brand of media" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "This could mean:" -ForegroundColor Yellow
    Write-Host "  - No CD/DVD drive installed" -ForegroundColor White
    Write-Host "  - Drive is not recognized by Windows" -ForegroundColor White
    Write-Host "  - IMAPI2 service is not running" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "Check complete!" -ForegroundColor Green
