# Unified Reporting System - Production Release Checklist

## Pre-Merge Requirements

### Code Quality
- [ ] All CI checks passing (typecheck, lint, unit tests, E2E tests)
- [ ] Zero TypeScript errors (`npm run typecheck`)
- [ ] Zero ESLint warnings (`npm run lint`)
- [ ] Test coverage ≥ 80% for reporting modules
- [ ] E2E tests pass locally with both mock and real API modes
- [ ] Performance tests pass (render < 200ms for 1000 findings)
- [ ] Accessibility audit passes (zero violations)

### Security
- [ ] No high/critical npm audit vulnerabilities
- [ ] RBAC enforced: final reports cannot be edited
- [ ] Digital signatures validated and immutable
- [ ] API endpoints require authentication
- [ ] Input validation on all user-submitted content
- [ ] XSS protection verified
- [ ] CSRF tokens implemented

### Documentation
- [ ] API documentation updated
- [ ] User guide updated with new features
- [ ] Deployment guide reviewed
- [ ] Rollback procedures documented
- [ ] Known issues documented

## Staging Deployment

### Pre-Deployment
- [ ] Database backup completed
- [ ] Feature flag `REPORTING_UNIFIED` set to `false` initially
- [ ] Monitoring dashboards configured
- [ ] Alert thresholds set
- [ ] Rollback plan reviewed with team

### Deployment Steps
1. [ ] Deploy backend services
2. [ ] Run database migrations (if any)
3. [ ] Deploy frontend build
4. [ ] Verify health checks pass (`/api/health`)
5. [ ] Smoke test: create, edit, finalize, sign, export report

### Gradual Rollout (Staging)
- [ ] Enable feature flag to 10% of users
- [ ] Monitor for 2 hours:
  - [ ] Error rate < 1%
  - [ ] API response time < 500ms (p95)
  - [ ] No critical errors in logs
  - [ ] User feedback positive
- [ ] Increase to 50% of users
- [ ] Monitor for 4 hours with same criteria
- [ ] Enable for 100% of staging users
- [ ] Monitor for 24 hours

### Rollback Criteria (Staging)
Rollback immediately if:
- Error rate > 5%
- API response time > 2s (p95)
- Critical security issue discovered
- Data corruption detected
- Multiple user complaints about data loss

### Rollback Steps
1. [ ] Set feature flag `REPORTING_UNIFIED` to `false`
2. [ ] Verify users redirected to legacy reporting
3. [ ] Investigate root cause
4. [ ] Document incident
5. [ ] Fix issues before re-attempting

## Production Deployment

### Pre-Production Checklist
- [ ] Staging deployment successful for 24+ hours
- [ ] Zero critical issues in staging
- [ ] Performance metrics meet SLA:
  - [ ] Report creation < 2s
  - [ ] Autosave < 500ms
  - [ ] Finalize < 3s
  - [ ] Sign < 3s
  - [ ] Export PDF < 5s
- [ ] Load testing completed (100 concurrent users)
- [ ] Disaster recovery plan tested
- [ ] Team trained on new system
- [ ] Support documentation ready
- [ ] Communication plan executed (notify users)

### Production Deployment Steps
1. [ ] Schedule maintenance window (if needed)
2. [ ] Notify users of upcoming changes
3. [ ] Create production database backup
4. [ ] Deploy backend services
5. [ ] Run database migrations
6. [ ] Deploy frontend build
7. [ ] Verify health checks pass
8. [ ] Smoke test in production

### Gradual Rollout (Production)
- [ ] Enable feature flag to 5% of users
- [ ] Monitor for 4 hours:
  - [ ] Error rate < 0.5%
  - [ ] API response time < 500ms (p95)
  - [ ] No critical errors
  - [ ] User feedback monitored
- [ ] Increase to 25% of users
- [ ] Monitor for 8 hours
- [ ] Increase to 50% of users
- [ ] Monitor for 12 hours
- [ ] Enable for 100% of users
- [ ] Monitor for 48 hours

### Monitoring Metrics
Track these metrics during rollout:

#### Performance
- API response times (p50, p95, p99)
- Frontend render times
- Database query performance
- Cache hit rates

#### Reliability
- Error rates by endpoint
- Failed autosaves
- Failed finalizations
- Failed signatures
- Failed exports

#### Business Metrics
- Reports created per hour
- Time to finalize (SLA)
- Time to sign (SLA)
- Export success rate
- User adoption rate

#### User Experience
- Page load times
- Time to interactive
- User error rates
- Support ticket volume

### Alert Thresholds
- **Critical**: Error rate > 2%, API response time > 2s (p95)
- **Warning**: Error rate > 1%, API response time > 1s (p95)
- **Info**: New feature usage below expected

### Rollback Criteria (Production)
Rollback immediately if:
- Error rate > 2%
- API response time > 3s (p95)
- Critical security vulnerability
- Data loss or corruption
- System unavailable for > 5 minutes
- Multiple high-priority support tickets

### Post-Deployment
- [ ] Monitor metrics for 48 hours
- [ ] Review error logs daily
- [ ] Collect user feedback
- [ ] Document lessons learned
- [ ] Update runbooks based on issues
- [ ] Schedule retrospective meeting

## Success Criteria

### Technical
- [ ] 99.9% uptime during rollout
- [ ] Error rate < 0.5%
- [ ] API response time < 500ms (p95)
- [ ] Zero data loss incidents
- [ ] Zero security incidents

### Business
- [ ] 80%+ user adoption within 2 weeks
- [ ] Report creation time reduced by 30%
- [ ] User satisfaction score > 4/5
- [ ] Support ticket volume stable or decreased

### Compliance
- [ ] HIPAA compliance maintained
- [ ] Audit logs functioning correctly
- [ ] Digital signatures legally valid
- [ ] Data retention policies enforced

## Rollback Plan

### Immediate Rollback (< 5 minutes)
1. Set feature flag `REPORTING_UNIFIED=false`
2. Clear CDN cache
3. Verify users on legacy system
4. Monitor for stability

### Full Rollback (< 30 minutes)
1. Revert frontend deployment
2. Revert backend deployment
3. Restore database from backup (if needed)
4. Verify system functionality
5. Communicate with users

## Communication Plan

### Pre-Launch
- [ ] Email to all users (1 week before)
- [ ] In-app notification (3 days before)
- [ ] Training sessions scheduled
- [ ] Documentation published

### During Rollout
- [ ] Status page updated
- [ ] Support team briefed
- [ ] Escalation path defined
- [ ] Real-time monitoring dashboard shared

### Post-Launch
- [ ] Success announcement
- [ ] Feedback survey sent
- [ ] Feature highlights shared
- [ ] Thank you to team

## Emergency Contacts

- **On-Call Engineer**: [Contact Info]
- **Product Manager**: [Contact Info]
- **DevOps Lead**: [Contact Info]
- **Security Team**: [Contact Info]
- **Support Lead**: [Contact Info]

## Notes

- This checklist should be reviewed and updated after each deployment
- All checkboxes must be completed before proceeding to next phase
- Document any deviations from this checklist
- Keep stakeholders informed throughout the process

---

## Post-Release Hardening Notes

### Security & Compliance
- Security audit runs automatically in CI (`.github/workflows/security.yml`)
- PII redaction implemented in `viewer/src/utils/redaction.ts`
- Secrets policy documented in `config/secrets-policy.md`
- Run manual audit: `npm run security:audit`

### Performance & Resilience
- Load testing with K6: `npm run test:load`
- Autosave has exponential backoff (1s→30s) with ±20% jitter
- Offline detection pauses autosave, resumes on reconnect
- Chaos tests verify data preservation: `npm run chaos`

### Observability
- Metrics system in `viewer/src/observability/metrics.ts`
- SLOs documented in `docs/SLOs.md`
- Alert rules in `ops/alerts.yaml`
- Register external collector via `window.__METRICS_COLLECTOR`

### Accessibility
- A11y tests: `npm run test:a11y`
- WCAG 2.1 AA compliance verified
- All interactive elements have accessible names
- Keyboard navigation and screen reader support

### Legacy Cleanup
- Kill switch flags: `REPORTING_UNIFIED_ONLY`, `REPORTING_LEGACY_KILL_DATE`
- Detection script: `bash scripts/migration/remove-legacy.sh`
- Warnings logged when legacy modules requested after kill date

### Export Validation
- DICOM SR and FHIR schemas in `viewer/src/validation/`
- Validation runs before JSON/FHIR exports
- User warned if export data invalid

### Release Hygiene
- Smoke test matrix: `docs/SMOKE_TEST_MATRIX.md`
- Rollback procedures: `docs/ROLLBACK.md`
- 4-level rollback (feature flag, frontend, backend, database)
- Brownout switch for gradual traffic reduction

### Assumptions
1. K6 installed for load testing (`brew install k6` or `choco install k6`)
2. Metrics collector integration handled by monitoring team
3. Alert routing configured in ops infrastructure
4. Database backups automated and tested
5. CDN cache invalidation credentials available
6. PagerDuty/Slack webhooks configured

---

**Last Updated**: 2024-01-15
**Version**: 2.0
**Owner**: Engineering Team
