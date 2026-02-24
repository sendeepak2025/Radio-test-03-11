# Fix: "Please insert a blank CD/DVD" (when disc is already there)

## Problem

You get the error "Please insert a blank CD/DVD into the drive and try again" even though a disc is already in the drive.

## Why This Happens

The system detects the disc but considers it "not writable" for one of these reasons:

1. **Disc is finalized** - Session was closed, making it read-only
2. **Disc is full** - No space left for new data
3. **Disc is ROM** - CD-ROM or DVD-ROM (read-only media)
4. **Disc is damaged** - Physical damage or scratches
5. **Wrong media type** - Incompatible format

## Quick Fix

### Step 1: Check Disc Status

Run this diagnostic script:

```powershell
.\check-disc-status.ps1
```

This will tell you:
- Is media present?
- What type of disc is it?
- Is it writable?
- How much space is available?
- Can it be burned?

### Step 2: Solutions Based on Results

#### ✅ If disc is "finalized" or "full":

**Use a blank disc:**
- Remove current disc
- Insert a brand new blank CD-R or DVD-R
- Try burning again

**Or use rewritable media:**
- Use CD-RW or DVD-RW instead
- System will automatically erase and rewrite
- More expensive but reusable

#### ✅ If disc is "ROM" (read-only):

**Wrong media type:**
- You inserted a CD-ROM or DVD-ROM
- These are read-only, cannot be written to
- Use CD-R, CD-RW, DVD-R, or DVD-RW instead

#### ✅ If disc is "damaged":

**Try different disc:**
- Current disc may have scratches or defects
- Use a new disc from a different batch
- Try a different brand

#### ✅ If "no media detected":

**Drive issue:**
- Eject and reinsert disc
- Wait 10 seconds for Windows to recognize it
- Check if disc appears in Windows Explorer
- Try different drive if available

## Recommended Media

### For Testing:
- **CD-RW** (rewritable, ~$1 each)
- **DVD-RW** (rewritable, ~$1.50 each)
- Can be erased and reused many times
- Perfect for testing

### For Production:
- **DVD-R** (write once, ~$0.50 each)
- **DVD+R** (write once, ~$0.50 each)
- More capacity than CD (4.7 GB vs 700 MB)
- Better for medical imaging

### Brands That Work Well:
- Verbatim (best quality)
- Sony
- Maxell
- TDK

### Avoid:
- Generic/no-name brands
- Very cheap discs (<$0.25 each)
- Old discs (>2 years stored)

## Updated Burn Logic

The system now provides better error messages:

```
Before:
❌ "No writable media found in drive"

After:
✅ "Disc is full or finalized. Please use a blank disc."
✅ "Unknown media type. The disc may be damaged."
✅ "No disc found in drive. Please insert a CD or DVD."
```

## Step-by-Step Troubleshooting

### 1. Verify Disc Type

```powershell
# Run diagnostic
.\check-disc-status.ps1

# Look for:
Media Type: CD-R, DVD-R, CD-RW, or DVD-RW ✓
Media Type: CD-ROM or DVD-ROM ✗
```

### 2. Check Free Space

```powershell
# In diagnostic output, look for:
Free Space: 350000 sectors (700 MB) ✓
Free Space: 0 sectors (0 MB) ✗
```

### 3. Test with Known Good Disc

```powershell
# Use a brand new disc
# Preferably rewritable (CD-RW or DVD-RW)
# From a reputable brand
```

### 4. Try Different Drive

```powershell
# If you have multiple drives
# Specify drive letter in UI:
Drive Letter: E
```

## Common Scenarios

### Scenario 1: Used Disc

**Problem:** Disc was previously burned and finalized

**Solution:**
- Use blank disc, OR
- Use CD-RW/DVD-RW (will auto-erase)

### Scenario 2: Multisession Disc

**Problem:** Disc has data but session not closed

**Solution:**
- System should work with ForceOverwrite
- If not, use blank disc

### Scenario 3: Wrong Format

**Problem:** Disc is CD-ROM or DVD-ROM

**Solution:**
- These are manufactured read-only
- Cannot be written to
- Use CD-R or DVD-R instead

### Scenario 4: Drive Issue

**Problem:** Drive not recognizing disc

**Solution:**
```powershell
# 1. Eject disc
# 2. Clean disc with soft cloth
# 3. Clean drive lens (use cleaning disc)
# 4. Reinsert disc
# 5. Wait 10 seconds
# 6. Try again
```

## Prevention

### Best Practices:

1. **Use fresh discs** - Don't reuse old burned discs
2. **Store properly** - Keep in jewel cases, away from heat/sun
3. **Handle carefully** - Hold by edges, don't touch surface
4. **Quality media** - Invest in good brands
5. **Test first** - Use rewritable for testing

### For Production:

1. **Buy in bulk** - Get 50-100 discs at once
2. **Same brand** - Stick with what works
3. **Check expiry** - Media has shelf life (~5 years)
4. **Rotate stock** - Use oldest discs first

## Technical Details

### Media Type Codes:

| Code | Type | Writable | Rewritable |
|------|------|----------|------------|
| 1 | CD-ROM | ❌ | ❌ |
| 2 | CD-R | ✅ | ❌ |
| 3 | CD-RW | ✅ | ✅ |
| 4 | DVD-ROM | ❌ | ❌ |
| 6 | DVD+RW | ✅ | ✅ |
| 7 | DVD+R | ✅ | ❌ |
| 8 | DVD-RW | ✅ | ✅ |
| 9 | DVD-R | ✅ | ❌ |

### IMAPI2 Media States:

- **Blank** - Never written, ready to burn ✅
- **Appendable** - Has data, can add more ✅ (with ForceOverwrite)
- **Complete** - Finalized, read-only ❌
- **Damaged** - Physical errors ❌
- **Unsupported** - Unknown format ❌

## Still Not Working?

### Advanced Troubleshooting:

1. **Check Windows Event Viewer**
   ```
   Event Viewer → Windows Logs → System
   Look for IMAPI errors
   ```

2. **Verify IMAPI2 Service**
   ```powershell
   Get-Service -Name "IMAPI*"
   # Should show "Running"
   ```

3. **Update Drive Firmware**
   - Visit manufacturer website
   - Download latest firmware
   - Follow update instructions

4. **Try Different Computer**
   - Test disc on another PC
   - Confirms if issue is disc or drive

5. **Contact Support**
   - Provide output from `check-disc-status.ps1`
   - Include disc brand and type
   - Describe what you've tried

## Summary

**Quick Checklist:**

- [ ] Run `check-disc-status.ps1`
- [ ] Verify disc is CD-R, DVD-R, CD-RW, or DVD-RW
- [ ] Confirm disc is blank or rewritable
- [ ] Check disc is not damaged
- [ ] Try different disc if needed
- [ ] Use quality brand media
- [ ] Ensure drive is working

**Most Common Fix:**
Just use a brand new blank disc! 90% of issues are from trying to reuse old discs.
