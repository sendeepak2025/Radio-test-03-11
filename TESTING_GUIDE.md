# 🧪 Testing Guide - New Reporting System

## ✅ Integration Complete!

The new reporting system is now integrated with your viewer. Here's how to test it:

---

## 🚀 Quick Start Testing

### **Step 1: Start Your Application**

```bash
# Terminal 1: Start backend (if not running)
cd server
npm start

# Terminal 2: Start frontend
cd viewer
npm run dev
```

### **Step 2: Login**

Navigate to: `http://localhost:5173/app/login`

---

## 📍 **Method 1: From Viewer (RECOMMENDED)**

This is the easiest way to test the integration!

### **A. Navigate to a Study**

1. Go to Dashboard: `http://localhost:5173/app/dashboard`
2. Click on any study to open the viewer
3. OR directly: `http://localhost:5173/app/viewer/1.2.3.4.5`

### **B. Create Report from Viewer**

You'll see **TWO** new ways to create reports:

#### **Option 1: Top Bar Button (Primary)**
- Look at the top-right of the viewer
- Click the **"Create Report"** button (blue, prominent)
- ✅ This will open the new reporting system with all study data pre-filled

#### **Option 2: Structured Reporting Tab**
- Click the **"Structured Reporting"** tab in the viewer
- You'll see a beautiful landing page with features
- Click **"Open Reporting Interface"**
- ✅ Opens the new reporting system

---

## 📍 **Method 2: Direct URL (For Testing)**

### **Basic Report**
```
http://localhost:5173/app/reporting?studyUID=1.2.3.4.5&patientID=P001&patientName=John%20Doe&modality=CT
```

### **With Study Description**
```
http://localhost:5173/app/reporting?studyUID=1.2.3.4.5&patientID=P001&patientName=John%20Doe&modality=CT&studyDescription=Chest%20CT%20with%20contrast
```

### **AI-Assisted (if you have AI analysis)**
```
http://localhost:5173/app/reporting?studyUID=1.2.3.4.5&patientID=P001&patientName=John%20Doe&modality=CT&analysisId=ai-123
```

---

## 🧪 **Complete Testing Workflow**

### **1. Open Viewer**
```
http://localhost:5173/app/viewer/1.3.12.2.1107.5.4.3.123456789012345.19950922.121803.6
```

### **2. Click "Create Report" Button**
- Located in top-right corner
- Blue button with document icon
- Should navigate to reporting page

### **3. Select Template**
- You should see template selector
- Select any template (e.g., "Chest CT")
- Click on template card

### **4. Test Report Editor**

#### **Left Panel (Content)**
- ✅ Type in "Clinical History"
- ✅ Type in "Technique"
- ✅ Add a finding (click + button)
- ✅ Type in "Findings"
- ✅ Type in "Impression"
- ✅ Type in "Recommendations"

#### **Right Panel - Anatomical Diagram**
- ✅ Click "Anatomical" tab
- ✅ Select body part (e.g., "Chest")
- ✅ Select view (e.g., "frontal")
- ✅ Click "Point" tool
- ✅ Click on canvas
- ✅ Should create a red dot
- ✅ Should auto-create a finding in left panel

#### **Right Panel - Voice Dictation**
- ✅ Click "Voice" tab
- ✅ Select target field (e.g., "Findings")
- ✅ Click "Start Dictation"
- ✅ Allow microphone permission
- ✅ Speak: "The lungs are clear bilaterally"
- ✅ Should see live transcript
- ✅ Should update findings field

#### **Right Panel - AI Assistant**
- ✅ Click "AI" tab
- ✅ Should show "No AI analysis available" (unless you have analysisId)
- ✅ If you have AI data, suggestions should appear

#### **Right Panel - Export**
- ✅ Click "Export" tab
- ✅ Select format (e.g., "PDF")
- ✅ Click "Export Report"
- ✅ Should download file (or show error if backend not ready)

### **5. Test Auto-Save**
- ✅ Type something in any field
- ✅ Wait 30 seconds
- ✅ Should see "Last saved: [time]" in top bar
- ✅ "Unsaved changes" chip should disappear

### **6. Test Manual Save**
- ✅ Type something
- ✅ Click save icon in top bar
- ✅ Should see success message

---

## 🎯 **What You Should See**

### **Viewer Integration**

```
┌─────────────────────────────────────────────────────────┐
│  [← Back]  Patient Name | ID | Date | [CT]             │
│                                                          │
│  [2D Stack] [OHIF Pro]    [Create Report] [View] [⚙️]  │
└─────────────────────────────────────────────────────────┘
```

### **Reporting Page**

```
┌─────────────────────────────────────────────────────────┐
│  Patient Name | [DRAFT] | [💾 Save] [✓ Sign] [✕]      │
├──────────────────────────┬──────────────────────────────┤
│  LEFT: Content Panel     │  RIGHT: Feature Panels       │
│                          │                              │
│  • Clinical History      │  [📍 Anatomical] [🎤 Voice] │
│  • Technique             │  [🤖 AI] [📥 Export]        │
│  • Findings              │                              │
│  • Impression            │  [Canvas with body diagram]  │
│  • Recommendations       │                              │
└──────────────────────────┴──────────────────────────────┘
```

---

## 🐛 **Troubleshooting**

### **Issue: "Create Report" button not visible**
**Solution:** 
- Make sure you're in the viewer page
- Check if studyData is loaded (look at patient name in header)
- Check browser console for errors

### **Issue: "Study UID is required" error**
**Solution:**
- Make sure you're navigating from viewer (not direct URL)
- OR use direct URL with studyUID parameter

### **Issue: Template selector not showing**
**Solution:**
- This is correct for new reports
- If you see editor directly, you might have reportId in URL

### **Issue: Canvas shows placeholder**
**Solution:**
- This is expected! Canvas shows placeholder text
- Real body diagrams need to be added later
- Marking still works (click to add points)

### **Issue: Voice dictation not working**
**Solution:**
- Use Chrome or Edge browser
- Allow microphone permissions
- Check browser console for errors

### **Issue: Auto-save not working**
**Solution:**
- Check if reportId exists (should be in URL after template selection)
- Check browser console for API errors
- Check if backend is running

---

## 📊 **Expected Behavior**

### **✅ Working Features**
- Navigation from viewer to reporting
- Template selection
- Report content editing
- Anatomical diagram marking (with placeholder)
- Voice dictation (Chrome/Edge)
- Export panel (UI ready, backend needed)
- Auto-save (every 30 seconds)
- Manual save

### **⚠️ Needs Backend**
- Actual template loading (uses mock data)
- Report saving to database
- Export to PDF/DICOM/FHIR
- AI analysis loading
- Existing report loading

### **🚧 Coming Soon**
- Real body diagram images
- Report locking
- Undo/redo
- Keyboard shortcuts

---

## 📝 **Test Checklist**

Copy this and check off as you test:

```
Viewer Integration:
[ ] Can see "Create Report" button in viewer
[ ] Button navigates to reporting page
[ ] Study data is passed correctly
[ ] Patient info shows in reporting page

Template Selection:
[ ] Template selector appears for new reports
[ ] Can select a template
[ ] Creates draft report
[ ] Navigates to editor

Report Editor:
[ ] Left panel shows all fields
[ ] Can type in all fields
[ ] Can add/delete findings
[ ] Right panel shows 4 tabs

Anatomical Diagram:
[ ] Can select body part
[ ] Can select view
[ ] Can select drawing tool
[ ] Can click to mark
[ ] Marking creates finding

Voice Dictation:
[ ] Can select target field
[ ] Can start dictation
[ ] Can see live transcript
[ ] Text updates field

AI Assistant:
[ ] Shows "No AI available" (expected)
[ ] UI is functional

Export:
[ ] Can select format
[ ] Export button works
[ ] Shows appropriate messages

Auto-Save:
[ ] Types trigger "Unsaved changes"
[ ] Auto-saves after 30 seconds
[ ] Shows "Last saved" time

Manual Save:
[ ] Save button works
[ ] Shows success message
[ ] Clears "Unsaved changes"
```

---

## 🎉 **Success Criteria**

You've successfully tested the integration if:

1. ✅ Can navigate from viewer to reporting
2. ✅ Can select a template
3. ✅ Can edit report content
4. ✅ Can mark on anatomical diagram
5. ✅ Can use voice dictation (Chrome/Edge)
6. ✅ Auto-save works
7. ✅ Manual save works

---

## 📞 **Need Help?**

If you encounter issues:

1. **Check browser console** for errors
2. **Check network tab** for failed API calls
3. **Check if backend is running**
4. **Try direct URL** to isolate routing issues
5. **Check TESTING_GUIDE.md** (this file)

---

## 🚀 **Next Steps After Testing**

Once basic testing is complete:

1. **Add real body diagram images**
   - Replace canvas placeholder
   - Add SVG/PNG diagrams for each body part

2. **Connect to backend**
   - Implement template loading API
   - Implement report save API
   - Implement export APIs

3. **Add report locking**
   - Prevent concurrent edits
   - Show "locked by" indicator

4. **Deploy to staging**
   - Test with real data
   - Get user feedback
   - Fix any issues

5. **Deploy to production**
   - Full testing
   - User training
   - Monitor usage

---

**Happy Testing! 🎉**

The new reporting system is ready to test from your viewer!
