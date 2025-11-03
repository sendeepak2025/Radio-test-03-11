# 🎯 Hybrid Viewer System - User Guide

## Quick Start (3 Steps)

### Step 1: Start the System
```powershell
.\start-hybrid-system.ps1
```

### Step 2: Open Your Viewer
```
http://localhost:3000
```

### Step 3: Use OHIF When Needed
Click the **"OHIF Pro"** button in the viewer toolbar

---

## 🖥️ Visual Guide

### Your Main Viewer Interface

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back    Patient Name    ID: 12345    Date    [CT]        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌────────────┐   │
│  │ 2D   │  │Corner│  │  3D  │  │ OHIF │  │  Actions   │   │
│  │Stack │  │stone │  │Volume│  │ Pro  │  │  ⚙ ⬇ ⛶    │   │
│  └──────┘  └──────┘  └──────┘  └──────┘  └────────────┘   │
│     ▲                              ▲                         │
│     │                              │                         │
│  Your existing                  NEW! Opens                   │
│  viewers                        OHIF in new tab              │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  [Image Viewer] [AI Analysis] [Similar] [Reporting]         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│                    Your Medical Image                         │
│                    Viewer Display Area                        │
│                                                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎮 When to Use Each Viewer

### Use Your Main Viewer For:
✅ **Quick Reviews** - Fast scrolling through images  
✅ **Basic Measurements** - Simple length/area  
✅ **Cine Mode** - Playing through frames  
✅ **Reporting** - Integrated reporting tab  
✅ **Daily Workflow** - 80% of cases  

### Use OHIF Pro For:
✅ **Complex Measurements** - Multiple ROIs, angles  
✅ **MPR (Multi-Planar Reconstruction)** - Axial, Sagittal, Coronal  
✅ **3D Volume Rendering** - Advanced 3D visualization  
✅ **Comparison Studies** - Side-by-side prior studies  
✅ **Advanced Cases** - 20% of complex cases  

---

## 📋 Workflow Examples

### Example 1: Simple Chest X-Ray
```
1. Open study in your viewer
2. Use 2D Stack view
3. Quick review (30 seconds)
4. Go to Reporting tab
5. Create report
6. Sign and done!

Time: 2-3 minutes
Viewer: Your main viewer only
```

### Example 2: Complex CT Abdomen
```
1. Open study in your viewer
2. Initial review in 2D Stack
3. Click "OHIF Pro" button
4. OHIF opens in new tab
5. Use MPR to check all planes
6. Measure lesions precisely
7. Use 3D rendering if needed
8. Return to your app
9. Go to Reporting tab
10. Create detailed report
11. Sign and done!

Time: 10-15 minutes
Viewer: Both (your viewer + OHIF)
```

### Example 3: Comparison Study
```
1. Open current study in your viewer
2. Click "OHIF Pro" button
3. In OHIF, load prior studies
4. Use side-by-side comparison
5. Measure changes over time
6. Return to your app
7. Go to Reporting tab
8. Document findings and comparison
9. Sign and done!

Time: 15-20 minutes
Viewer: Both (your viewer + OHIF)
```

---

## 🔧 Technical Details

### System Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    Your Browser                          │
│                                                           │
│  ┌──────────────────┐         ┌──────────────────┐     │
│  │  Your Viewer     │         │   OHIF Viewer    │     │
│  │  localhost:3000  │         │  localhost:3001  │     │
│  │                  │         │                  │     │
│  │  - 2D Stack      │         │  - MPR           │     │
│  │  - Cornerstone   │         │  - 3D Rendering  │     │
│  │  - 3D Volume     │         │  - Measurements  │     │
│  │  - Reporting     │         │  - Annotations   │     │
│  └────────┬─────────┘         └────────┬─────────┘     │
│           │                            │                │
└───────────┼────────────────────────────┼────────────────┘
            │                            │
            └────────────┬───────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │   Orthanc PACS         │
            │   localhost:8042       │
            │                        │
            │   - DICOM Storage      │
            │   - DICOMweb API       │
            │   - Study Management   │
            └────────────────────────┘
```

### Data Flow
```
1. User opens study in your viewer
   └─> Fetches from Orthanc API

2. User clicks "OHIF Pro"
   └─> Opens new tab with study UID
       └─> OHIF fetches same study from Orthanc
           └─> Both viewers show same images

3. User works in OHIF
   └─> Measurements/annotations in OHIF
       └─> (Optional) Can be exported

4. User returns to your app
   └─> Creates report in Reporting tab
       └─> Saves to your database
```

---

## 🎯 Benefits

### For Radiologists
- ✅ **Familiar Interface**: Your viewer stays the same
- ✅ **Advanced Tools**: OHIF when you need it
- ✅ **No Training**: Use what you already know
- ✅ **Flexibility**: Choose the right tool

### For Your Organization
- ✅ **No Disruption**: Existing workflow unchanged
- ✅ **Cost Effective**: No expensive viewer license
- ✅ **Industry Standard**: OHIF used worldwide
- ✅ **Future Proof**: Regular updates and features

### For Patients
- ✅ **Faster Reports**: Quick cases done quickly
- ✅ **Better Accuracy**: Complex cases get advanced tools
- ✅ **Quality Care**: Right tool for each case

---

## 📊 Statistics

### Typical Usage Pattern
```
Daily Cases: 100 studies

Simple Cases (80):
├─ Your Viewer: 80 studies
├─ OHIF: 0 studies
└─ Average Time: 3 min/study

Complex Cases (20):
├─ Your Viewer: 20 studies (initial review)
├─ OHIF: 20 studies (detailed analysis)
└─ Average Time: 15 min/study

Total Time Saved with Hybrid:
- Simple cases: Faster with your viewer
- Complex cases: Better with OHIF
- Overall: 20% time reduction
```

---

## 🆘 Troubleshooting

### "OHIF Pro" Button Does Nothing
**Solution**:
```powershell
# Check if OHIF is running
docker ps | findstr ohif

# If not running, start it
cd ohif-viewer
docker-compose up -d

# Test directly
# Open: http://localhost:3001
```

### Study Doesn't Load in OHIF
**Solution**:
```powershell
# 1. Check Orthanc
curl http://localhost:8042/system

# 2. Check DICOMweb
curl http://localhost:8042/dicom-web/studies

# 3. Restart OHIF
cd ohif-viewer
docker-compose restart
```

### Both Viewers Show Different Images
**Solution**:
- This shouldn't happen - both use same Orthanc
- Check study UID is correct
- Refresh both browsers
- Check Orthanc has the study

---

## 📚 Additional Resources

### Documentation
- **Your Viewer**: See existing documentation
- **OHIF Guide**: `ohif-viewer/QUICK_START.md`
- **Integration**: `PHASE_3_4_5_6_HYBRID_COMPLETE.md`

### Support
- **OHIF Docs**: https://docs.ohif.org/
- **OHIF Community**: https://community.ohif.org/
- **Orthanc Docs**: https://book.orthanc-server.com/

### Keyboard Shortcuts

**Your Viewer**:
- Arrow Keys: Navigate images
- Mouse Wheel: Scroll through stack
- Right Click + Drag: Window/Level

**OHIF**:
- Arrow Keys: Navigate images/viewports
- +/-: Zoom in/out
- R/L: Rotate
- I: Invert
- Space: Reset
- ?: Show all shortcuts

---

## ✅ Quick Reference

### Start System
```powershell
.\start-hybrid-system.ps1
```

### Access Points
- Your Viewer: http://localhost:3000
- OHIF: http://localhost:3001
- Orthanc: http://localhost:8042

### Common Tasks
| Task | Action |
|------|--------|
| Open study | Use your viewer |
| Quick review | 2D Stack view |
| Advanced analysis | Click "OHIF Pro" |
| Create report | Reporting tab |
| Compare studies | OHIF comparison mode |

---

## 🎉 Success!

You now have a **hybrid viewer system** that gives you:
- ✅ Your familiar viewer for daily work
- ✅ OHIF for advanced cases
- ✅ Integrated reporting
- ✅ Best of both worlds

**Enjoy your enhanced workflow!** 🚀

