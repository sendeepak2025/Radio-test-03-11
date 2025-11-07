# 🚀 Production Features - Quick Start Guide

## Overview

You're about to implement 4 critical production features over 5 weeks:
1. **Critical Notification System** - Real-time alerts with escalation
2. **FDA Digital Signatures** - 21 CFR Part 11 compliant signatures
3. **Export System** - DICOM SR, FHIR, PDF exports
4. **Session Management** - Secure authentication with auto-refresh

## 📁 Spec Location

All specification documents are in `.kiro/specs/production-features/`:
- `requirements.md` - Complete requirements with EARS patterns
- `design.md` - Technical architecture and design
- `tasks.md` - 5-week implementation plan

## ✅ What's Already Done

You've already created the frontend utilities:
- ✅ `viewer/src/utils/dicomSRExport.ts`
- ✅ `viewer/src/utils/criticalNotifications.ts`
- ✅ `viewer/src/utils/fdaSignature.ts`
- ✅ `viewer/src/hooks/useSessionManagement.ts`

## 🎯 Week 1: Backend APIs + Database

### Day 1-2: Database Setup

```bash
# 1. Start MongoDB
# Your MongoDB is already running at:
# mongodb+srv://mahitechnocrats:qNfbRMgnCthyu59@cluster1.xqa5iyj.mongodb.net/radiology-final-21-10

# 2. Create database collections
cd server
node scripts/create-production-collections.js
```

**Tasks:**
- [ ] Task 1.1: Create MongoDB collections and indexes
- [ ] Task 1.2: Create Mongoose models

### Day 3-4: Critical Notification Backend

```bash
# Install dependencies
npm install @sendgrid/mail twilio socket.io
```

**Tasks:**
- [ ] Task 2.1: Create notification service
- [ ] Task 2.2: Create email service (SendGrid)
- [ ] Task 2.3: Create SMS service (Twilio)
- [ ] Task 2.4: Create escalation service
- [ ] Task 2.5: Create notification API routes

**Environment Variables to Add:**
```env
# Notification Services
NOTIFICATION_EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_key_here
NOTIFICATION_SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_sid_here
TWILIO_AUTH_TOKEN=your_token_here
TWILIO_PHONE_NUMBER=+1234567890
CRITICAL_NOTIFICATION_EMAILS=admin@hospital.com
```

### Day 5: FDA Signature Backend

```bash
# Generate RSA keys
cd server
mkdir -p keys
openssl genrsa -out keys/signature-private.pem 2048
openssl rsa -in keys/signature-private.pem -pubout -out keys/signature-public.pem
```

**Tasks:**
- [ ] Task 3.1: Create cryptographic service
- [ ] Task 3.2: Create signature service
- [ ] Task 3.3: Create audit service
- [ ] Task 3.4: Create signature API routes

**Environment Variables to Add:**
```env
# FDA Digital Signatures
FDA_SIGNATURE_ALGORITHM=RSA-SHA256
SIGNATURE_KEY_SIZE=2048
SIGNATURE_PRIVATE_KEY_PATH=./keys/signature-private.pem
SIGNATURE_PUBLIC_KEY_PATH=./keys/signature-public.pem
```

### Day 6-7: Export & Session Backend

**Tasks:**
- [ ] Task 4.1-4.5: Export system (DICOM SR, FHIR, PDF)
- [ ] Task 5.1-5.3: Session management
- [ ] Task 6.1-6.3: Environment configuration and testing

**Environment Variables to Add:**
```env
# Session Management
SESSION_TIMEOUT=1800000
SESSION_WARNING_TIME=300000
SESSION_REFRESH_INTERVAL=600000
MAX_CONCURRENT_SESSIONS=3

# Export System
DICOM_SR_TEMPLATE_PATH=./templates/dicom-sr
FHIR_SERVER_URL=http://localhost:8080/fhir
ENABLE_DICOM_SR_EXPORT=true
```

## 📝 How to Execute Tasks

### Using Kiro Specs

1. **Open the tasks file:**
   ```
   .kiro/specs/production-features/tasks.md
   ```

2. **Click "Start task" next to any task item**

3. **Kiro will:**
   - Read the requirements and design
   - Implement the task
   - Mark it as complete
   - Stop for your review

4. **Review and continue:**
   - Check the implementation
   - Test the functionality
   - Ask Kiro to continue to the next task

### Manual Execution

If you prefer to implement manually:

1. Read the task description in `tasks.md`
2. Review the design in `design.md`
3. Check the requirements in `requirements.md`
4. Implement the code
5. Test the functionality
6. Mark the task as complete

## 🧪 Testing Each Week

### Week 1 Testing

```bash
# Test notification API
curl -X POST http://localhost:8001/api/notifications/critical \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "type": "critical_finding",
    "severity": "critical",
    "title": "Critical Finding Detected",
    "message": "Large mass detected in right lung",
    "patientId": "12345",
    "studyId": "study-123"
  }'

# Test signature API
curl -X POST http://localhost:8001/api/signatures/sign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "reportId": "report-123",
    "meaning": "author",
    "password": "your_password"
  }'

# Test export API
curl -X POST http://localhost:8001/api/reports/report-123/export/pdf \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test session API
curl -X POST http://localhost:8001/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

## 📊 Progress Tracking

### Week 1 Checklist

- [ ] Database collections created
- [ ] Notification service working
- [ ] Email notifications sending
- [ ] SMS notifications sending
- [ ] Escalation workflow working
- [ ] Signature generation working
- [ ] Signature verification working
- [ ] Audit trail logging
- [ ] DICOM SR export working
- [ ] FHIR export working
- [ ] PDF export working
- [ ] Session management working
- [ ] Token refresh working
- [ ] All APIs tested

### Success Metrics

- ✅ All API endpoints return 200/201 for valid requests
- ✅ Notifications delivered within 5 seconds
- ✅ Signatures verify successfully
- ✅ Exports generate valid files
- ✅ Sessions timeout correctly
- ✅ Tokens refresh automatically

## 🆘 Troubleshooting

### Common Issues

**1. MongoDB Connection Failed**
```bash
# Check connection string in server/.env
MONGODB_URI=mongodb+srv://...
```

**2. SendGrid/Twilio Not Working**
```bash
# Verify API keys are correct
# Check account status
# Test with simple API call
```

**3. Signature Keys Not Found**
```bash
# Regenerate keys
cd server
openssl genrsa -out keys/signature-private.pem 2048
openssl rsa -in keys/signature-private.pem -pubout -out keys/signature-public.pem
```

**4. Export Fails**
```bash
# Check report exists
# Verify report has required fields
# Check export service logs
```

## 📚 Reference Documents

- **Requirements**: `.kiro/specs/production-features/requirements.md`
- **Design**: `.kiro/specs/production-features/design.md`
- **Tasks**: `.kiro/specs/production-features/tasks.md`
- **Frontend Status**: `FRONTEND_STATUS_REPORT.md`
- **Complete Remaining**: `COMPLETE_REMAINING_TASKS.md`

## 🎯 Next Steps

1. **Start with Task 1.1** - Create database collections
2. **Work through Week 1 tasks sequentially**
3. **Test each feature as you complete it**
4. **Move to Week 2 once all Week 1 tasks are done**

## 💡 Tips

- **One task at a time**: Focus on completing one task fully before moving to the next
- **Test frequently**: Test each API endpoint as you build it
- **Use Postman**: Create a Postman collection for all API endpoints
- **Check logs**: Monitor server logs for errors
- **Ask for help**: Use Kiro to help with any task

## 🚀 Ready to Start?

Open `.kiro/specs/production-features/tasks.md` and click "Start task" on Task 1.1!

Good luck! 🎉
