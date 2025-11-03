# 🚀 Deployment Checklist - AI Report Consolidation

## ✅ Pre-Deployment (Do This First!)

### 1. Backup Database
```bash
# Create backup with timestamp
mongodump --uri="$MONGODB_URI" --out=./backup-$(date +%Y%m%d-%H%M%S)

# Verify backup
ls -lh backup-*/
```

### 2. Review Changes
- [ ] Read `CONSOLIDATION_PR_DESCRIPTION.md`
- [ ] Review `TEST_RESULTS.md`
- [ ] Check all 8 modified files
- [ ] Understand rollback procedure

### 3. Test in Staging
```bash
# Deploy to staging
git checkout consolidation-branch
npm install --prefix server
npm install --prefix viewer

# Run migration dry-run
node server/migrate-reports-consolidation.js --dry-run

# Start services
cd server && npm start &
cd viewer && npm run dev &

# Test all three modes
# - Manual report creation
# - AI-assisted report
# - AI-only report
```

---

## 🔧 Deployment Steps

### Step 1: Deploy Backend (15 min)
```bash
# 1. Stop backend
pm2 stop backend

# 2. Pull changes
git pull origin main

# 3. Install dependencies (if needed)
cd server && npm install

# 4. Run migration
node migrate-reports-consolidation.js --dry-run  # Preview
node migrate-reports-consolidation.js            # Execute
node migrate-reports-consolidation.js --verify   # Verify

# 5. Start backend
pm2 start backend
pm2 logs backend --lines 50
```

### Step 2: Verify Backend (5 min)
```bash
# Check health
curl http://localhost:8001/health

# Check AI routing
curl -X POST http://localhost:8001/api/ai/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"studyInstanceUID":"test","frameIndex":0}'

# Check report endpoint
curl http://localhost:8001/api/reports \
  -H "Authorization: Bearer $TOKEN"
```

### Step 3: Deploy Frontend (10 min)
```bash
# 1. Build frontend
cd viewer
npm run build

# 2. Deploy build
# (Copy dist/ to your web server)

# 3. Clear browser cache
# Instruct users to hard refresh (Ctrl+Shift+R)
```

### Step 4: Verify Frontend (5 min)
- [ ] Open application in browser
- [ ] Check console for errors
- [ ] Test report creation (manual mode)
- [ ] Test AI analysis
- [ ] Test mode toggle
- [ ] Test PDF download

---

## 🔍 Post-Deployment Verification

### Immediate Checks (First 30 min)
```bash
# 1. Check logs
pm2 logs backend --lines 100 | grep -i error
tail -f server/logs/audit.log

# 2. Check database
mongo $MONGODB_URI
> db.reports.countDocuments()
> db.reports.find({creationMode: "ai-assisted"}).limit(5)

# 3. Monitor AI calls
tail -f server/logs/access.log | grep "/api/ai/analyze"
```

### Database Verification Queries
```javascript
// Connect to MongoDB
mongo $MONGODB_URI

// 1. Count reports by mode
db.reports.aggregate([
  { $group: { _id: "$creationMode", count: { $sum: 1 } } }
])

// 2. Check provenance
db.reports.find({ "aiProvenance": { $exists: true } }).count()

// 3. Verify migration
db.reports.find().count()  // Should match old count
db.structuredreports.find().count()  // Old collection

// 4. Sample check
db.reports.findOne({ creationMode: "ai-assisted" })
```

### Functional Tests
- [ ] Create manual report
- [ ] Create AI-assisted report
- [ ] Create AI-only report
- [ ] Download PDF
- [ ] Sign report
- [ ] View audit trail

---

## 🚨 Rollback Procedure (If Needed)

### Quick Rollback (5 min)
```bash
# 1. Stop services
pm2 stop all

# 2. Restore database
mongorestore --uri="$MONGODB_URI" --drop ./backup-YYYYMMDD-HHMMSS/

# 3. Revert code
git revert HEAD
git push origin main

# 4. Restart services
pm2 start all
```

### Verify Rollback
```bash
# Check database
mongo $MONGODB_URI
> db.reports.countDocuments()
> db.structuredreports.countDocuments()

# Check application
curl http://localhost:8001/health
```

---

## 📊 Monitoring (First 48 Hours)

### Metrics to Watch
```bash
# 1. Error rate
tail -f server/logs/error.log | grep -c "Error"

# 2. AI call success rate
grep "/api/ai/analyze" server/logs/access.log | \
  awk '{print $9}' | sort | uniq -c

# 3. Report creation by mode
mongo $MONGODB_URI --eval '
  db.reports.aggregate([
    { $match: { createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) } } },
    { $group: { _id: "$creationMode", count: { $sum: 1 } } }
  ])
'

# 4. Response times
tail -f server/logs/access.log | \
  grep "/api/reports" | \
  awk '{print $10}' | \
  awk '{sum+=$1; count++} END {print "Avg:", sum/count, "ms"}'
```

### Alert Thresholds
- ⚠️ Error rate > 5%
- ⚠️ AI call failure > 10%
- ⚠️ Response time > 2000ms
- 🚨 Database connection lost
- 🚨 AI services unavailable

---

## 📞 Support Contacts

### Technical Issues
- **Backend:** @backend-team
- **Frontend:** @frontend-team
- **Database:** @dba-team
- **DevOps:** @devops-team

### Escalation
- **On-Call:** [Phone Number]
- **Slack:** #tech-emergency
- **Email:** tech-support@company.com

---

## ✅ Sign-Off

### Pre-Deployment
- [ ] Database backed up
- [ ] Staging tested
- [ ] Team notified
- [ ] Rollback plan ready

**Signed:** ________________  
**Date:** ________________

### Post-Deployment
- [ ] Backend deployed
- [ ] Frontend deployed
- [ ] Verification complete
- [ ] Monitoring active

**Signed:** ________________  
**Date:** ________________

### 48-Hour Review
- [ ] No critical errors
- [ ] Performance acceptable
- [ ] User feedback positive
- [ ] Ready for cleanup

**Signed:** ________________  
**Date:** ________________

---

## 🎉 Success Criteria

- ✅ Zero downtime deployment
- ✅ All reports migrated successfully
- ✅ No data loss
- ✅ AI routing working
- ✅ Three modes functional
- ✅ PDF generation working
- ✅ No critical errors in 48 hours
- ✅ User acceptance positive

---

**Last Updated:** 2025-10-27  
**Version:** 1.0  
**Status:** Ready for Production
