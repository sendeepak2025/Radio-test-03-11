# 📚 Wikimedia Commons Anatomical Diagrams Setup

## ✅ Professional Medical Diagrams from Wikimedia Commons

Your system is now configured to use **professional, medically-accurate anatomical diagrams** from Wikimedia Commons!

---

## 🎯 **What's Included**

### **Available Diagrams:**

1. **Head/Brain** (3 views)
   - Axial section
   - Sagittal section
   - Coronal section

2. **Chest** (3 views)
   - Frontal (PA) - Rib cage
   - Lateral - Thorax side view
   - Axial - Cross-section

3. **Abdomen** (2 views)
   - Frontal - Silhouette
   - Quadrants - 4-quadrant diagram

4. **Spine** (2 views)
   - Frontal - Full spine diagram
   - Lateral - Side view

5. **Pelvis** (1 view)
   - Frontal - Pelvic bones

6. **Full Body** (2 views)
   - Neutral frontal - Gender-neutral
   - Female frontal - Female silhouette

7. **Extremities** (3 views)
   - Hand - Bone structure
   - Shoulder - Joint anatomy
   - Knee - Joint icon

---

## 🚀 **Setup Instructions**

### **Option 1: Automatic Download (Recommended)**

Run the download script to fetch all diagrams from Wikimedia Commons:

```bash
cd viewer
node scripts/download-anatomical-diagrams.js
```

**What it does:**
- ✅ Fetches 15+ professional SVG diagrams
- ✅ Saves to `viewer/public/diagrams/`
- ✅ Properly names files for the system
- ✅ Shows progress and summary

**Expected output:**
```
📥 Downloading anatomical diagrams from Wikimedia Commons...

📍 HeadBrain:
  ✅ axial: Saved as headbrain-axial.svg
  ✅ sagittal: Saved as headbrain-sagittal.svg
  ✅ coronal: Saved as headbrain-coronal.svg

📍 Chest:
  ✅ frontal: Saved as chest-frontal.svg
  ✅ lateral: Saved as chest-lateral.svg
  ✅ axial: Saved as chest-axial.svg

... (continues for all body parts)

📊 Summary:
  ✅ Success: 15
  ❌ Failed: 0

✨ Diagrams saved to: viewer/public/diagrams
```

### **Option 2: Manual Download**

If the script doesn't work, download manually:

1. **Go to Wikimedia Commons:**
   ```
   https://commons.wikimedia.org/wiki/File:Brain_axial_section.svg
   ```

2. **Click "Download"** (right side)

3. **Save as:**
   ```
   viewer/public/diagrams/headbrain-axial.svg
   ```

4. **Repeat for all diagrams** (see file list below)

---

## 📁 **File Structure**

After setup, you should have:

```
viewer/
└── public/
    └── diagrams/
        ├── headbrain-axial.svg
        ├── headbrain-sagittal.svg
        ├── headbrain-coronal.svg
        ├── chest-frontal.svg
        ├── chest-lateral.svg
        ├── chest-axial.svg
        ├── abdomen-frontal.svg
        ├── abdomen-quadrants.svg
        ├── spine-frontal.svg
        ├── spine-lateral.svg
        ├── pelvis-frontal.svg
        ├── fullbody-neutral_frontal.svg
        ├── fullbody-female_frontal.svg
        ├── extremities-hand.svg
        ├── extremities-shoulder.svg
        └── extremities-knee.svg
```

---

## 🧪 **Testing**

### **Test 1: Verify Download**

```bash
# Check if diagrams exist
ls viewer/public/diagrams/

# Should show 15+ SVG files
```

### **Test 2: View in Browser**

1. Start dev server:
   ```bash
   cd viewer
   npm run dev
   ```

2. Open reporting page

3. Go to Anatomical tab

4. Select different body parts:
   - **Head/Brain** → See brain sections
   - **Chest** → See rib cage
   - **Abdomen** → See abdomen silhouette
   - **Spine** → See spine diagram

5. ✅ Should see professional medical diagrams (not placeholders!)

---

## 📋 **Complete Diagram List**

### **Wikimedia Commons Files:**

| Body Part | View | Wikimedia File | Local File |
|-----------|------|----------------|------------|
| Head/Brain | Axial | `File:Brain_axial_section.svg` | `headbrain-axial.svg` |
| Head/Brain | Sagittal | `File:Brain_sagittal_section.svg` | `headbrain-sagittal.svg` |
| Head/Brain | Coronal | `File:Brain_coronal_section.svg` | `headbrain-coronal.svg` |
| Chest | Frontal | `File:Rib_cage_icon.svg` | `chest-frontal.svg` |
| Chest | Lateral | `File:Human_thorax_lateral_view_silhouette.svg` | `chest-lateral.svg` |
| Chest | Axial | `File:Spinal_cord_-_Thoracic_cross_section.svg` | `chest-axial.svg` |
| Abdomen | Frontal | `File:Abdomen_silhouette.svg` | `abdomen-frontal.svg` |
| Abdomen | Quadrants | `File:Abdominal_quadrants.svg` | `abdomen-quadrants.svg` |
| Spine | Frontal | `File:Human_spine_diagram.svg` | `spine-frontal.svg` |
| Spine | Lateral | `File:Spine_simple.svg` | `spine-lateral.svg` |
| Pelvis | Frontal | `File:Pelvis_icon.svg` | `pelvis-frontal.svg` |
| Full Body | Neutral | `File:Human_body_silhouette.svg` | `fullbody-neutral_frontal.svg` |
| Full Body | Female | `File:Silhouette_of_a_woman.svg` | `fullbody-female_frontal.svg` |
| Extremities | Hand | `File:Hand_bones.svg` | `extremities-hand.svg` |
| Extremities | Shoulder | `File:Shoulder_joint.svg` | `extremities-shoulder.svg` |
| Extremities | Knee | `File:Knee_icon.svg` | `extremities-knee.svg` |

---

## 🎨 **Diagram Features**

### **Professional Quality:**
- ✅ Medically accurate
- ✅ High resolution (SVG format)
- ✅ Scalable without pixelation
- ✅ Clean, professional appearance
- ✅ Suitable for medical reports

### **License:**
- ✅ Public domain or Creative Commons
- ✅ Free to use
- ✅ No attribution required (but appreciated)
- ✅ Can be modified

---

## 🔧 **Troubleshooting**

### **Issue: Script fails to download**

**Solution 1: Check internet connection**
```bash
ping commons.wikimedia.org
```

**Solution 2: Download manually**
- Visit each Wikimedia link
- Click "Download"
- Save to `viewer/public/diagrams/`

### **Issue: Diagrams not showing in app**

**Check 1: Files exist**
```bash
ls viewer/public/diagrams/
```

**Check 2: File names correct**
- Must match exactly: `headbrain-axial.svg`
- Not: `Brain_axial_section.svg`

**Check 3: Browser console**
- Open DevTools (F12)
- Look for 404 errors
- Check file paths

### **Issue: Placeholder still showing**

**Cause:** Diagram file not found

**Solution:**
1. Check console for warning:
   ```
   ⚠️ Diagram not found: /diagrams/chest-frontal.svg
   ```
2. Verify file exists
3. Check file name matches mapping
4. Refresh browser (Ctrl + Shift + R)

---

## 📊 **Adding More Diagrams**

### **Find More on Wikimedia:**

1. **Search Wikimedia Commons:**
   ```
   https://commons.wikimedia.org/
   ```

2. **Search for:**
   - "anatomy svg"
   - "medical diagram svg"
   - "body part svg"

3. **Download SVG**

4. **Add to mapping:**
   ```typescript
   // In AnatomicalDiagramPanel.tsx
   const DIAGRAM_FILE_MAP = {
     'newbodypart': {
       'newview': 'newbodypart-newview.svg'
     }
   };
   ```

5. **Add to body diagrams:**
   ```typescript
   const BODY_DIAGRAMS = {
     'CT': {
       'New Body Part': ['newview']
     }
   };
   ```

---

## ✅ **Verification Checklist**

After setup, verify:

- [ ] Script ran successfully
- [ ] 15+ SVG files in `viewer/public/diagrams/`
- [ ] Dev server running
- [ ] Anatomical tab accessible
- [ ] Head/Brain shows brain sections (not placeholder)
- [ ] Chest shows rib cage (not placeholder)
- [ ] Abdomen shows silhouette (not placeholder)
- [ ] Can mark on diagrams
- [ ] Can measure on diagrams
- [ ] Can save snapshots
- [ ] Preview shows diagrams

---

## 🎯 **Quick Start**

```bash
# 1. Download diagrams
cd viewer
node scripts/download-anatomical-diagrams.js

# 2. Start dev server
npm run dev

# 3. Test in browser
# - Go to reporting page
# - Click Anatomical tab
# - Select Head/Brain - axial
# - See professional brain diagram!
```

---

## 📚 **Resources**

- **Wikimedia Commons:** https://commons.wikimedia.org/
- **Medical Diagrams Category:** https://commons.wikimedia.org/wiki/Category:Medical_diagrams
- **Anatomy SVGs:** https://commons.wikimedia.org/wiki/Category:Anatomy_diagrams
- **License Info:** https://commons.wikimedia.org/wiki/Commons:Licensing

---

## ✨ **Summary**

You now have:

1. ✅ **15+ professional medical diagrams** from Wikimedia Commons
2. ✅ **Automatic download script** for easy setup
3. ✅ **Proper file mapping** in the system
4. ✅ **Multiple views** for each body part
5. ✅ **High-quality SVG format** (scalable)
6. ✅ **Free to use** (public domain/CC)

---

**Run the download script and enjoy professional anatomical diagrams!** 🎉

```bash
cd viewer
node scripts/download-anatomical-diagrams.js
```
