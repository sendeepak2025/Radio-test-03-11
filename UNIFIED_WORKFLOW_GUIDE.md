# Unified Medical Imaging Workflow Guide

## 🎯 Complete Patient-to-Report Workflow

This guide connects all components into a smooth, professional workflow from patient registration to follow-up management.

---

## 📋 Workflow Overview

```
1. PATIENT MANAGEMENT
   ↓
2. STUDY ACQUISITION
   ↓
3. WORKLIST MANAGEMENT
   ↓
4. IMAGE VIEWING & ANALYSIS
   ↓
5. REPORT GENERATION
   ↓
6. FOLLOW-UP TRACKING
   ↓
7. BILLING & EXPORT
```

---

## 1️⃣ PATIENT MANAGEMENT

### Location: `/patients`

### Features:
- ✅ Patient registration and demographics
- ✅ Patient search and filtering
- ✅ Study history per patient
- ✅ DICOM upload for patients
- ✅ Data export (DICOM, JSON, PDF)

### Workflow Actions:
1. **Register New Patient**
   - Click "Add Patient" button
   - Enter demographics (Name, ID, DOB, Gender)
   - Save patient record

2. **View Patient Studies**
   - Click on patient card
   - See all studies for that patient
   - Click study to open in viewer

3. **Upload DICOM Files**
   - Select patient
   - Click "Upload DICOM"
   - Choose files or drag & drop
   - Files automatically linked to patient

### Navigation From Here:
- → **Worklist**: View all pending studies
- → **Viewer**: Open specific study
- → **Follow-ups**: Check patient follow-ups

---

## 2️⃣ STUDY ACQUISITION

### Methods:

#### A. DICOM Upload (Manual)
- From Patients page
- Drag & drop DICOM files
- Automatic metadata extraction

#### B. PACS Integration (Automatic)
- Configure in Connection Manager (`/connection-manager`)
- Studies auto-sync from PACS
- Real-time updates

#### C. Modality Direct Send
- Configure modality to send to your AE Title
- Studies appear automatically
- See `CONNECT_DEVICE_TO_PACS.md`

---

## 3️⃣ WORKLIST MANAGEMENT

### Location: `/worklist`

### Features:
- ✅ Pending studies queue
- ✅ In-progress tracking
- ✅ Completed studies archive
- ✅ Priority management (STAT, Urgent, Routine)
- ✅ Assignment to radiologists
- ✅ Critical findings alerts
- ✅ Real-time statistics

### Workflow Actions:

#### Daily Workflow:
1. **Morning Review**
   ```
   - Open Worklist
   - Check STAT studies (red badges)
   - Review urgent cases (yellow badges)
   - Assign studies to radiologists
   ```

2. **Study Processing**
   ```
   - Click "View" to open study
   - Review images
   - Create measurements/annotations
   - Generate report
   - Mark as complete
   ```

3. **Priority Management**
   ```
   - STAT: Immediate attention (< 1 hour)
   - Urgent: Same day
   - Routine: Normal workflow
   ```

### Status Flow:
```
Pending → In Progress → Completed
   ↓          ↓            ↓
 Assign    Review      Archive
```

### Navigation From Here:
- → **Viewer**: Click "View" button
- → **Reporting**: Click "Create Report"
- → **Follow-ups**: Auto-generated if needed

---

## 4️⃣ IMAGE VIEWING & ANALYSIS

### Location: `/viewer/:studyInstanceUID`

### Features:
- ✅ Multi-series DICOM viewer
- ✅ Window/Level adjustment
- ✅ Zoom, pan, rotate
- ✅ Measurements (length, angle, area)
- ✅ Annotations and markers
- ✅ Cine playback for multi-frame
- ✅ Series comparison
- ✅ AI-powered analysis (optional)

### Workflow Actions:

1. **Open Study**
   - From Worklist: Click "View"
   - From Patients: Click study card
   - Direct URL: `/viewer/{studyUID}`

2. **Review Images**
   - Select series from sidebar
   - Scroll through images
   - Adjust window/level
   - Use cine for dynamic studies

3. **Make Measurements**
   - Click measurement tools
   - Draw on images
   - Measurements auto-saved

4. **AI Analysis** (Optional)
   - Click "AI Analysis" button
   - Get automated findings
   - Review confidence scores
   - Include in report

5. **Create Report**
   - Click "Create Report" button
   - Opens reporting interface
   - Study context pre-filled

### Navigation From Here:
- → **Reporting**: Generate report
- → **Worklist**: Return to queue
- → **Follow-ups**: Schedule follow-up

---

## 5️⃣ REPORT GENERATION

### Location: `/reporting`

### Features:
- ✅ Structured reporting templates
- ✅ Smart template selection
- ✅ Voice dictation support
- ✅ AI-assisted findings
- ✅ Digital signature
- ✅ PDF generation
- ✅ Report versioning
- ✅ Draft and finalized states

### Workflow Actions:

1. **Create New Report**
   ```
   - From Viewer: Click "Create Report"
   - From Worklist: Click report icon
   - System loads study context
   ```

2. **Select Template**
   ```
   - Smart suggestions based on:
     * Modality (CT, MR, XR, etc.)
     * Body part
     * Study description
   - Or choose manually
   ```

3. **Fill Report Sections**
   ```
   - Clinical History
   - Technique
   - Findings (use voice dictation)
   - Impression
   - Recommendations
   ```

4. **Add Measurements**
   ```
   - Import from viewer
   - Add manually
   - Include images
   ```

5. **Review & Sign**
   ```
   - Preview PDF
   - Add digital signature
   - Finalize report
   ```

6. **Auto Follow-up Detection**
   ```
   - AI analyzes report text
   - Suggests follow-ups if needed
   - Creates follow-up automatically
   ```

### Report States:
- **Draft**: Work in progress
- **Pending Review**: Awaiting approval
- **Finalized**: Signed and locked
- **Amended**: Modified after finalization

### Navigation From Here:
- → **Follow-ups**: If follow-up needed
- → **Worklist**: Mark study complete
- → **Billing**: Generate invoice

---

## 6️⃣ FOLLOW-UP TRACKING

### Location: `/followups`

### Features:
- ✅ AI-powered follow-up generation
- ✅ Automatic overdue detection
- ✅ Scheduled reminders
- ✅ Priority-based tracking
- ✅ Patient notifications
- ✅ Completion tracking
- ✅ Statistics dashboard

### Workflow Actions:

#### Automatic Follow-up Creation:
```
Report finalized
    ↓
AI analyzes findings
    ↓
Detects follow-up need
    ↓
Creates follow-up record
    ↓
Schedules reminder
```

#### Manual Follow-up Creation:
1. Click "Add Follow-up"
2. Select patient and study
3. Set priority and type
4. Choose recommended date
5. Add clinical reason
6. Save

#### Daily Management:
1. **Morning Check**
   - Review overdue (red alerts)
   - Check upcoming (next 7 days)
   - Schedule appointments

2. **Patient Contact**
   - Call/email patients
   - Schedule appointments
   - Update status

3. **Completion**
   - Patient returns for follow-up
   - New study acquired
   - Mark follow-up complete
   - Link to new study

### Follow-up Types:
- **Routine**: Standard follow-up
- **Urgent**: Needs prompt attention
- **Critical**: Immediate follow-up required
- **Recommended**: Optional but advised
- **Optional**: Patient choice

### Automated Reminders:
- **Daily 8 AM**: Check overdue
- **Daily 9 AM**: Send upcoming reminders
- **Configurable**: Email, SMS, system notifications

### Navigation From Here:
- → **Patients**: View patient details
- → **Worklist**: Check if new study arrived
- → **Reporting**: View original report

---

## 7️⃣ BILLING & EXPORT

### Location: `/billing`

### Features:
- ✅ Automatic invoice generation
- ✅ CPT code management
- ✅ Insurance integration
- ✅ Payment tracking
- ✅ Financial reports
- ✅ Data export (multiple formats)

### Workflow Actions:

1. **Generate Invoice**
   - Triggered on report finalization
   - Auto-populated with study details
   - CPT codes based on modality/body part

2. **Process Payment**
   - Record payment method
   - Track payment status
   - Generate receipts

3. **Export Data**
   - Patient data (JSON, PDF)
   - Study data (DICOM, images)
   - Reports (PDF, structured)
   - Billing records (CSV, Excel)

---

## 🔄 Complete Workflow Example

### Scenario: Chest X-Ray with Follow-up

#### Step 1: Patient Arrives
```
Location: /patients
Action: Register patient or search existing
Result: Patient record ready
```

#### Step 2: Study Acquired
```
Method: Modality sends DICOM to PACS
Result: Study appears in worklist
```

#### Step 3: Radiologist Review
```
Location: /worklist
Action: 
  - See new study (STAT priority)
  - Click "View" button
Result: Opens in viewer
```

#### Step 4: Image Analysis
```
Location: /viewer/{studyUID}
Action:
  - Review chest X-ray
  - Measure nodule (8mm)
  - Add annotation
  - Click "Create Report"
Result: Opens reporting interface
```

#### Step 5: Report Creation
```
Location: /reporting
Action:
  - Template: "Chest X-Ray"
  - Findings: "8mm nodule in RUL"
  - Impression: "Recommend follow-up CT in 3 months"
  - Sign report
Result: Report finalized
```

#### Step 6: Auto Follow-up
```
System Action:
  - AI detects "nodule" + "follow-up"
  - Creates follow-up record
  - Priority: 4 (High)
  - Recommended date: +90 days
  - Type: Routine
Result: Follow-up scheduled
```

#### Step 7: Follow-up Management
```
Location: /followups
Action:
  - Review follow-up
  - Contact patient
  - Schedule appointment
  - Update status: "Scheduled"
Result: Patient appointment set
```

#### Step 8: Patient Returns (3 months later)
```
Location: /worklist
Action:
  - New CT study arrives
  - Linked to follow-up
  - Review and compare
  - Create new report
  - Mark follow-up complete
Result: Workflow complete
```

#### Step 9: Billing
```
Location: /billing
Action:
  - Invoice generated for both studies
  - Payment processed
  - Records exported
Result: Financial cycle complete
```

---

## 🎨 Navigation Quick Reference

### Main Menu Structure:
```
📊 Dashboard       - Overview and statistics
👥 Patients        - Patient management
📋 Worklist        - Study queue
📅 Follow-ups      - Follow-up tracking
🔍 Viewer          - Image viewing (context-based)
📝 Reporting       - Report generation (context-based)
💰 Billing         - Financial management
⚙️  Settings       - System configuration
```

### Context-Based Navigation:
- **From Patients** → Worklist, Viewer, Follow-ups
- **From Worklist** → Viewer, Reporting, Follow-ups
- **From Viewer** → Reporting, Worklist
- **From Reporting** → Follow-ups, Worklist, Billing
- **From Follow-ups** → Patients, Worklist, Viewer

---

## 🔔 Notifications & Alerts

### Real-time Alerts:
1. **STAT Studies**: Immediate notification
2. **Critical Findings**: Alert radiologist
3. **Overdue Follow-ups**: Daily reminder
4. **Upcoming Follow-ups**: 7-day advance notice
5. **Report Pending**: Unsigned reports alert

### Notification Channels:
- 🔔 In-app notifications
- 📧 Email alerts
- 📱 SMS (configurable)
- 🖥️ Desktop notifications

---

## 📊 Dashboard Integration

### Location: `/dashboard`

### Widgets:
1. **Worklist Summary**
   - Pending: X studies
   - In Progress: Y studies
   - STAT: Z studies

2. **Follow-up Status**
   - Overdue: X patients
   - Upcoming: Y patients
   - Completion rate: Z%

3. **Recent Activity**
   - Last 10 reports
   - Recent studies
   - System events

4. **Performance Metrics**
   - Average turnaround time
   - Reports per day
   - Follow-up compliance

---

## 🔐 Role-Based Workflows

### Radiologist:
```
Dashboard → Worklist → Viewer → Reporting → Follow-ups
```

### Technologist:
```
Patients → Upload Studies → Worklist (view only)
```

### Administrator:
```
Dashboard → All modules → Settings → Billing
```

### Referring Physician:
```
Patients → View Reports → Follow-ups (read only)
```

---

## 🚀 Quick Start Checklist

### Daily Workflow:
- [ ] Check Dashboard for overview
- [ ] Review Worklist for STAT/Urgent studies
- [ ] Process pending studies
- [ ] Generate reports
- [ ] Check follow-ups (overdue/upcoming)
- [ ] Review billing/invoices

### Weekly Tasks:
- [ ] Review completion rates
- [ ] Check follow-up compliance
- [ ] Export financial reports
- [ ] System maintenance

### Monthly Tasks:
- [ ] Performance analytics
- [ ] Quality assurance review
- [ ] Billing reconciliation
- [ ] System updates

---

## 🛠️ Troubleshooting

### Study Not Appearing:
1. Check PACS connection (`/connection-manager`)
2. Verify modality configuration
3. Check Orthanc logs
4. Refresh worklist

### Report Not Saving:
1. Check network connection
2. Verify authentication token
3. Check browser console
4. Try draft save first

### Follow-up Not Created:
1. Verify report contains follow-up keywords
2. Check AI confidence threshold
3. Review automation logs
4. Create manually if needed

---

## 📚 Related Documentation

- `FOLLOWUP_SYSTEM_GUIDE.md` - Detailed follow-up documentation
- `WORKLIST_FEATURE.md` - Worklist features and usage
- `PROFESSIONAL_REPORTING_SYSTEM_COMPLETE.md` - Reporting system
- `CONNECT_DEVICE_TO_PACS.md` - PACS integration
- `ENHANCED_PATIENTS_GUIDE.md` - Patient management

---

## 🎯 Success Metrics

### Efficiency:
- ⏱️ Average report turnaround: < 24 hours
- 📊 Worklist completion rate: > 95%
- 🎯 Follow-up compliance: > 90%

### Quality:
- ✅ Report accuracy: > 99%
- 🔍 Critical findings detection: 100%
- 📝 Template usage: > 80%

### Patient Care:
- 📅 Follow-up scheduling: < 48 hours
- 🔔 Overdue alerts: 0 missed
- 💬 Patient communication: Timely

---

**Status**: ✅ Complete Unified Workflow
**Last Updated**: October 28, 2025
**Version**: 1.0
