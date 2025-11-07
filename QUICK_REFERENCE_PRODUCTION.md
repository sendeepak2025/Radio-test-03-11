# 🚀 Production Release - Quick Reference Card

## Essential Commands

### Development
```bash
npm run dev              # Start dev server
npm run typecheck        # Type check
npm run lint             # Lint code
npm run test:unit        # Unit tests
npm run test:e2e         # E2E tests
```

### Pre-Deployment
```bash
npm ci                   # Clean install
npm run typecheck        # Verify types
npm run lint             # Verify quality
npm run test:unit        # Run unit tests
PW_USE_MOCK=1 npm run test:e2e  # Run E2E with mocks
npm run build            # Build for production
```

### Deployment
```bash
npm run preview          # Preview build
git push origin main     # Trigger CI/CD
```

### Monitoring
```bash
curl https://api.yourdomain.com/api/health  # Health check
tail -f /var/log/api-server/error.log       # View logs
```

---

## Feature Flags

```typescript
REPORTING_UNIFIED              // Main toggle
REPORTING_AI_ANALYSIS          // AI features
REPORTING_DIGITAL_SIGNATURE    // Signatures
TELEMETRY_ENABLED              // Monitoring
```

**Toggle via env**: `VITE_FEATURE_REPORTING_UNIFIED=true`

---

## Rollout Strategy

```
Staging:  10% → 50% → 100% (Week 1)
Prod:     5% → 25% → 50% → 100% (Week 2-3)
Monitor:  Continuously for 48h after 100%
```

---

## Rollback (< 5 min)

```bash
# 1. Disable feature flag
curl -X POST /api/admin/flags -d '{"REPORTING_UNIFIED": false}'

# 2. Clear cache
aws cloudfront create-invalidation --distribution-id $ID --paths "/*"

# 3. Verify
curl https://app.yourdomain.com/api/health
```

---

## Key Metrics

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error Rate | >2% | Rollback |
| Response Time | >2s (p95) | Investigate |
| Uptime | <99.9% | Alert |

---

## Files Changed

### New Files (15)
```
.github/workflows/ci.yml
playwright.config.ts
e2e/server-mocks.ts
e2e/reporting.spec.ts
viewer/src/utils/reportingUtils.ts
viewer/src/instrumentation/telemetry-listener.ts
viewer/src/config/flags.ts
viewer/src/health/healthcheck.ts
viewer/src/components/reports/UnifiedReportEditor.enhanced.tsx
viewer/src/components/reporting/TemplateSelectorUnified.enhanced.tsx
+ 5 test files
```

### Modified Files (2)
```
viewer/package.json (scripts + deps)
viewer/vite.config.ts (bundle analyzer)
```

---

## Documentation

- `RELEASE_CHECKLIST.md` - Release procedures
- `PRODUCTION_DEPLOYMENT_GUIDE.md` - Full deployment guide
- `PRODUCTION_READINESS_SUMMARY.md` - Executive summary
- `ENHANCED_COMPONENTS_INTEGRATION.md` - Integration guide
- `_PRODUCTION_RELEASE_COMPLETE.md` - This release summary

---

## Support Contacts

- **On-Call**: [Phone/Slack]
- **DevOps**: [Slack Channel]
- **Security**: [Email]
- **PM**: [Email]

---

## Emergency Procedures

### High Error Rate
1. Check logs: `tail -f /var/log/api-server/error.log`
2. Check health: `curl /api/health`
3. If >2%: Execute rollback
4. Notify team

### System Down
1. Check services: `systemctl status api-server`
2. Check database: `mongo --eval "db.adminCommand('ping')"`
3. Restart if needed: `systemctl restart api-server`
4. If not resolved in 5min: Execute rollback

### Data Issue
1. Stop writes immediately
2. Assess impact
3. Restore from backup if needed
4. Notify security team

---

## Success Criteria

✅ Error rate < 0.5%
✅ Response time < 500ms (p95)
✅ 99.9% uptime
✅ 80%+ user adoption (2 weeks)
✅ Zero data loss
✅ Zero security incidents

---

## Next Steps

1. ✅ Review this card
2. ✅ Read `RELEASE_CHECKLIST.md`
3. ✅ Run pre-deployment checks
4. ✅ Deploy to staging
5. ✅ Monitor for 24h
6. ✅ Deploy to production
7. ✅ Celebrate! 🎉

---

**Version**: 1.0
**Status**: ✅ READY
**Date**: 2024-01-15
