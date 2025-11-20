# 🔧 ADMIN GUIDE: Radiology Reporting System
**Administrative & Configuration Guide**

**Version:** 1.0  
**Last Updated:** 2025-11-18

---

## 📋 TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [User Management](#user-management)
3. [Template Management](#template-management)
4. [Analytics & Reporting](#analytics--reporting)
5. [System Configuration](#system-configuration)
6. [Backup & Recovery](#backup--recovery)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Security & Compliance](#security--compliance)
9. [Troubleshooting](#troubleshooting)

---

## 🏥 SYSTEM OVERVIEW

### System Architecture

```
┌─────────────────┐
│   Web Browser   │
│  (Frontend)     │
└────────┬────────┘
         │ HTTPS
┌────────▼────────┐
│   Node.js API   │
│  (Backend)      │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    │         │          │          │
┌───▼───┐ ┌──▼──┐  ┌────▼────┐ ┌──▼────┐
│MongoDB│ │PACS │  │ Gemini  │ │Storage│
│       │ │     │  │   AI    │ │ (S3)  │
└───────┘ └─────┘  └─────────┘ └───────┘
```

### Key Components

**Frontend (React + TypeScript):**
- Port: 3011
- Framework: Vite + React 18
- UI: Material-UI (MUI)

**Backend (Node.js + Express):**
- Port: 8001
- Runtime: Node.js 18+
- Database: MongoDB Atlas

**External Services:**
- PACS: Orthanc (DICOM storage)
- AI: Google Gemini Pro
- Storage: AWS S3 (signatures, logos)

---

## 👥 USER MANAGEMENT

### User Roles

| Role | Permissions |
|------|-------------|
| **Super Admin** | Full system access, user management, system config |
| **Admin** | Hospital management, user creation, analytics |
| **Radiologist** | Create/sign reports, view analytics |
| **Clinician** | View reports only |
| **Technologist** | Upload studies, create worklist items |

### Creating Users

#### Via Admin Panel

1. Log in as Admin/Super Admin
2. Go to **Admin → Users**
3. Click **"Create New User"**
4. Fill user details:
   ```
   Username: jsmith
   Email: jsmith@hospital.com
   First Name: John
   Last Name: Smith
   Role: radiologist
   Hospital: General Hospital
   ```
5. Set initial password
6. Click **"Create User"**
7. User receives welcome email with login credentials

#### Via API

```bash
POST /api/users
Content-Type: application/json
Authorization: Bearer <admin-token>

{
  "username": "jsmith",
  "email": "jsmith@hospital.com",
  "firstName": "John",
  "lastName": "Smith",
  "roles": ["radiologist"],
  "hospitalId": "HOSP001",
  "password": "TempPass123!"
}
```

### Managing Users

#### Update User Info

1. Go to **Admin → Users**
2. Find user in list
3. Click **"Edit"**
4. Update details
5. Click **"Save Changes"**

#### Deactivate User

1. Go to **Admin → Users**
2. Find user
3. Click **"Deactivate"**
4. Confirm action
5. User can no longer log in

#### Reset Password

1. Go to **Admin → Users**
2. Find user
3. Click **"Reset Password"**
4. Choose method:
   - **Send reset email** (recommended)
   - **Set new password manually**
5. User receives reset link via email

### Bulk User Operations

#### Import Users (CSV)

1. Go to **Admin → Users → Import**
2. Download CSV template
3. Fill template:
   ```csv
   username,email,firstName,lastName,role,hospitalId
   jsmith,jsmith@hospital.com,John,Smith,radiologist,HOSP001
   mjones,mjones@hospital.com,Mary,Jones,radiologist,HOSP001
   ```
4. Upload CSV file
5. Review import preview
6. Click **"Import Users"**

---

## 📋 TEMPLATE MANAGEMENT

### Template System

Templates provide standardized report structures for different exam types.

### Creating Templates

#### Basic Template

1. Go to **Admin → Templates**
2. Click **"Create New Template"**
3. Fill basic info:
   ```
   Name: CT Head Without Contrast
   Modality: CT
   Body Part: Head
   Specialty: Neuroradiology
   ```

4. Add matching criteria:
   ```
   Keywords: head, brain, skull, CT head
   Procedure Codes: 70450, 70460
   ```

5. Define sections:
   ```markdown
   ## Clinical Information
   [Clinical history and indication]

   ## Technique
   Non-contrast CT scan of the head was performed with axial images.

   ## Findings

   **Brain Parenchyma:**
   - [Findings]

   **Ventricles and Cisterns:**
   - [Findings]

   **Extra-axial Spaces:**
   - [Findings]

   **Calvarium and Skull Base:**
   - [Findings]

   ## Impression
   [Summary and diagnosis]

   ## Recommendations
   [Follow-up recommendations]
   ```

6. Add common findings (optional):
   ```
   - No acute intracranial abnormality
   - No hemorrhage, mass effect, or midline shift
   - Ventricles and sulci normal for age
   - No extra-axial fluid collection
   ```

7. Click **"Save Template"**

### Advanced Template Features

#### Conditional Sections

Show/hide sections based on findings:

```javascript
{
  "section": "Follow-up Recommendations",
  "showIf": {
    "field": "findings",
    "contains": ["mass", "lesion", "abnormality"]
  }
}
```

#### Auto-fill Fields

```javascript
{
  "field": "technique",
  "autoFill": true,
  "value": "{{modality}} scan of {{bodyPart}} performed {{contrast}}"
}
```

### Template Analytics

View template usage statistics:

1. Go to **Admin → Templates**
2. Click **"Analytics"**
3. View:
   - Most used templates
   - Template selection accuracy
   - Average report completion time per template
   - User satisfaction ratings

---

## 📊 ANALYTICS & REPORTING

### Access Levels

**Super Admin:** All hospitals  
**Admin:** Their hospital only  
**Radiologist:** Their own metrics

### Available Dashboards

#### 1. Standard Analytics (`/admin/analytics`)

**Summary Cards:**
- Total reports
- Average turnaround time
- Active users
- AI acceptance rate

**Charts:**
- Reports over time
- Reports by modality
- Report status breakdown
- Template usage
- User activity

#### 2. Enhanced Analytics (`/admin/enhanced-analytics`)

**Advanced Visualizations:**
- TAT heatmap (day × hour)
- Workflow funnel chart
- Correlation scatter plots
- Custom report builder

**Tabs:**
- Overview
- Advanced Analytics
- Workflow Analysis
- Correlation Analysis

#### 3. Productivity Dashboard (`/admin/productivity`)

**Metrics:**
- Radiologist performance table
- Skills radar chart
- Time-of-day analysis
- Modality performance
- Weekly trends

### Custom Reports

#### Creating Custom Reports

1. Go to Enhanced Analytics
2. Click **"Custom Report"**
3. Select metrics:
   - Total reports
   - Signed reports
   - Average TAT
   - AI usage
   - Critical findings
4. Choose visualization
5. Add filters
6. Name and save report

#### Scheduled Reports

**Email Digest (Future Feature):**
```javascript
{
  "name": "Weekly Performance Report",
  "schedule": "every Monday at 8:00 AM",
  "recipients": ["admin@hospital.com"],
  "metrics": ["reports", "tat", "quality"],
  "format": "PDF"
}
```

### Exporting Data

**Available Formats:**
- JSON - Raw data
- CSV - Spreadsheet compatible
- PDF - Printable report

**Export Methods:**
1. **Manual Export:**
   - Click "Export" button
   - Choose format
   - Download file

2. **API Export:**
   ```bash
   GET /api/analytics/export?format=json&startDate=2025-01-01&endDate=2025-12-31
   Authorization: Bearer <admin-token>
   ```

---

## ⚙️ SYSTEM CONFIGURATION

### Environment Variables

#### Required Variables

```bash
# server/.env

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db-name

# Authentication
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRATION=1h
REFRESH_TOKEN_EXPIRATION=7d

# Encryption
ENCRYPTION_KEY=your-encryption-key-32-chars

# PACS Connection
ORTHANC_URL=http://pacs.hospital.com:8042
ORTHANC_USERNAME=orthanc
ORTHANC_PASSWORD=orthanc-password

# API Keys
GEMINI_API_KEY=your-google-gemini-api-key

# File Storage
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=radiology-files
AWS_REGION=us-east-1

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@hospital.com
SMTP_PASSWORD=email-password

# Security (Production)
NODE_ENV=production
IP_WHITELIST=192.168.1.0/24,10.0.0.0/8
CORS_ORIGINS=https://radiology.hospital.com
```

#### Optional Variables

```bash
# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log

# Performance
MAX_UPLOAD_SIZE=100MB
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=15min

# Features
ENABLE_VOICE_DICTATION=true
ENABLE_AI_FEATURES=true
ENABLE_TELEMETRY=true

# Notifications
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890
```

### Application Configuration

#### Feature Flags

Control features via `/public/flags.json`:

```json
{
  "ai": {
    "enabled": true,
    "provider": "gemini",
    "features": {
      "findingsAnalysis": true,
      "impressionGeneration": true,
      "criticalFindingDetection": true
    }
  },
  "reporting": {
    "unifiedReporting": true,
    "legacyReporting": false,
    "voiceDictation": true
  },
  "analytics": {
    "telemetry": true,
    "realTimeUpdates": false
  }
}
```

#### Hospital Configuration

```javascript
// Database: hospitals collection
{
  hospitalId: "HOSP001",
  name: "General Hospital",
  contactEmail: "admin@generalhospital.com",
  contactPhone: "+1-555-0100",
  
  // Subscription
  subscription: {
    plan: "enterprise",
    maxUsers: 100,
    maxStorage: 1000, // GB
    features: {
      aiAnalysis: true,
      advancedReporting: true,
      customBranding: true
    }
  },
  
  // Settings
  settings: {
    requireMFA: false,
    dataRetentionDays: 2555, // 7 years
    autoBackup: true
  },
  
  // Branding
  logoUrl: "https://s3.amazonaws.com/logos/hosp001.png",
  primaryColor: "#1976d2",
  secondaryColor: "#dc004e"
}
```

---

## 💾 BACKUP & RECOVERY

### Automated Backups

#### MongoDB Backups

**Schedule:** Daily at 2:00 AM UTC

**Retention:**
- Daily backups: 7 days
- Weekly backups: 4 weeks
- Monthly backups: 12 months

**Location:** AWS S3 bucket `radiology-backups/mongodb/`

**Verification:** Automatic restore test weekly

#### File Storage Backups

**Includes:**
- Digital signatures
- Hospital logos
- Report attachments
- Export files

**Location:** AWS S3 with versioning enabled

### Manual Backup

#### Database Backup

```bash
# Connect to server
ssh admin@radiology-server.com

# Run backup script
cd /opt/radiology
./scripts/backup-database.sh

# Backup location
/backups/mongodb/manual_backup_2025-11-18.gz
```

#### Export All Data

```bash
# Via API
curl -X GET "https://api.hospital.com/api/admin/export-all" \
  -H "Authorization: Bearer <admin-token>" \
  -o full_backup_2025-11-18.zip
```

### Disaster Recovery

#### Recovery Point Objective (RPO)
**Target:** 24 hours  
**Actual:** 1 hour (via point-in-time recovery)

#### Recovery Time Objective (RTO)
**Target:** 4 hours  
**Actual:** 2 hours (tested monthly)

#### Recovery Procedure

**Step 1: Assess Damage**
- Identify what was lost
- Determine recovery point needed

**Step 2: Notify Stakeholders**
- Email: disaster-recovery@hospital.com
- Phone: Emergency hotline

**Step 3: Restore from Backup**

```bash
# Restore database
./scripts/restore-database.sh /backups/mongodb/backup_2025-11-18.gz

# Restore files
aws s3 sync s3://radiology-backups/files/ ./uploads/

# Restart services
pm2 restart all
```

**Step 4: Verify Recovery**
- Check database connectivity
- Test user login
- Verify report access
- Confirm PACS connection

**Step 5: Resume Operations**
- Notify users system is back online
- Monitor for issues
- Document incident

---

## 🔍 MONITORING & MAINTENANCE

### Health Checks

#### Automatic Monitoring

**Endpoints:**
- `/api/health` - Basic health check
- `/api/reports/health` - Reporting system health
- `/api/health/detailed` - Full system status

**Monitored Services:**
- Database connection
- PACS connectivity
- AI API availability
- File storage access
- Memory usage
- CPU usage

#### Manual Health Check

```bash
curl https://api.hospital.com/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-18T12:00:00Z",
  "uptime": 864000,
  "services": {
    "database": "connected",
    "pacs": "connected",
    "ai": "available",
    "storage": "available"
  }
}
```

### Performance Monitoring

#### Key Metrics

| Metric | Target | Alert If |
|--------|--------|----------|
| API Response Time | <500ms | >2000ms |
| Database Query Time | <100ms | >500ms |
| Error Rate | <0.1% | >1% |
| CPU Usage | <70% | >90% |
| Memory Usage | <80% | >95% |
| Disk Space | >20% free | <10% free |

#### Monitoring Tools

**APM (Application Performance Monitoring):**
- Tool: PM2 (built-in)
- Dashboard: `pm2 monit`
- Logs: `pm2 logs`

**Database Monitoring:**
- MongoDB Atlas built-in monitoring
- Slow query alerts
- Connection pool monitoring

### Maintenance Windows

**Scheduled Maintenance:**
- **When:** First Sunday of each month, 2:00 AM - 6:00 AM
- **Duration:** 4 hours maximum
- **Notification:** 7 days advance notice

**Emergency Maintenance:**
- Critical security patches
- System failures
- Data corruption issues

**Maintenance Checklist:**
- [ ] Notify users 7 days in advance
- [ ] Backup all data
- [ ] Update documentation
- [ ] Test in staging environment
- [ ] Deploy to production
- [ ] Verify all systems operational
- [ ] Monitor for 24 hours post-deployment

---

## 🔒 SECURITY & COMPLIANCE

### Security Best Practices

#### Password Policy

**Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Not previously used (last 5 passwords)
- Expires every 90 days

**Configuration:**
```javascript
// server/config/security.js
passwordPolicy: {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  expirationDays: 90,
  historyCount: 5
}
```

#### Access Control

**IP Whitelisting (Production):**
```bash
# server/.env
IP_WHITELIST=192.168.1.0/24,10.0.0.0/8,hospital-vpn-ip
```

**Role-Based Access Control (RBAC):**
- Enforced at API level
- Checked on every request
- Logged in audit trail

#### Session Management

**Settings:**
- Session timeout: 60 minutes idle
- Maximum session duration: 8 hours
- Automatic logout on window close: Optional
- Multi-device login: Allowed

### Compliance

#### HIPAA Compliance

**Required Features:**
- ✅ Audit logging (all PHI access)
- ✅ Encryption at rest (database)
- ✅ Encryption in transit (HTTPS)
- ✅ Access controls (RBAC)
- ✅ Data retention (7 years minimum)
- ✅ Secure disposal (automated cleanup)

**Audit Trail:**
- All report access logged
- User login/logout tracked
- PHI exports monitored
- Failed access attempts recorded

**PHI Access Log:**
```javascript
{
  timestamp: "2025-11-18T12:00:00Z",
  userId: "user123",
  userName: "Dr. Smith",
  action: "view_report",
  resourceType: "report",
  resourceId: "report456",
  patientId: "patient789",
  success: true,
  ipAddress: "192.168.1.100"
}
```

#### GDPR Compliance

**Patient Rights:**
- Right to access (export patient data)
- Right to erasure (data anonymization)
- Right to portability (export in standard format)

**Data Processing:**
```bash
# Export patient data
POST /api/patients/:id/export

# Anonymize patient data
POST /api/patients/:id/anonymize

# Delete patient data (after retention period)
DELETE /api/patients/:id/gdpr-delete
```

### Security Audit

**Quarterly Security Review:**
- [ ] Review user access logs
- [ ] Check for suspicious activity
- [ ] Update security patches
- [ ] Test backup recovery
- [ ] Review compliance checklist
- [ ] Update security documentation

---

## 🔧 TROUBLESHOOTING

### Common Issues

#### Issue: System Slow Performance

**Symptoms:**
- Pages load slowly
- API timeouts
- Users complaining

**Diagnosis:**
```bash
# Check system resources
pm2 monit

# Check database performance
# Login to MongoDB Atlas → Performance tab

# Check PACS connectivity
curl http://pacs-server:8042/system
```

**Solutions:**
1. Restart services: `pm2 restart all`
2. Clear cache: `pm2 flush`
3. Check database indexes
4. Scale horizontally (add more servers)

#### Issue: Users Can't Log In

**Symptoms:**
- "Invalid credentials" error
- Session expired messages

**Diagnosis:**
```bash
# Check authentication service
curl https://api.hospital.com/api/auth/health

# Check database connection
# MongoDB Atlas → Metrics

# Review auth logs
pm2 logs | grep "auth"
```

**Solutions:**
1. Verify credentials in database
2. Reset user password
3. Check JWT secret hasn't changed
4. Clear user session: `DELETE /api/auth/sessions/:userId`

#### Issue: AI Features Not Working

**Symptoms:**
- "AI service unavailable"
- No AI suggestions appearing

**Diagnosis:**
```bash
# Check GEMINI_API_KEY
echo $GEMINI_API_KEY

# Test AI endpoint
curl https://api.hospital.com/api/reports/ai/health
```

**Solutions:**
1. Verify GEMINI_API_KEY in .env
2. Check API quota (Google Cloud Console)
3. Restart backend: `pm2 restart api`

---

## 📞 SUPPORT & ESCALATION

### Support Tiers

**Tier 1: Help Desk**
- Email: helpdesk@hospital.com
- Phone: (555) 123-4567
- Hours: 8 AM - 6 PM (Mon-Fri)
- Response: 4 hours

**Tier 2: Technical Support**
- Email: techsupport@hospital.com
- Phone: (555) 765-4321
- Hours: 24/7
- Response: 2 hours

**Tier 3: Engineering**
- Email: engineering@hospital.com
- Phone: (555) 911-HELP (emergency only)
- Hours: On-call 24/7
- Response: 1 hour (critical issues)

### Escalation Path

1. **User → Help Desk** (password resets, how-to questions)
2. **Help Desk → Technical Support** (system errors, bugs)
3. **Technical Support → Engineering** (critical failures, security incidents)

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-18  
**Next Review:** 2026-01-18

**Questions?** Contact: admin@hospital.com

---

© 2025 Radiology Reporting System. All rights reserved.
