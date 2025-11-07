# 🛡️ Post-Release Hardening - Quick Reference

## Essential Commands

```bash
# Security
npm run security:audit        # Run security audit

# Testing
npm run test:a11y            # Accessibility tests
npm run test:load            # K6 load tests
npm run chaos                # Chaos engineering tests

# Migration
bash scripts/migration/remove-legacy.sh  # Check legacy code
```

## Key Features

### 🔒 Security
- **PII Redaction**: Emails, phones, MRN, SSN auto-redacted
- **Secrets Detection**: Pre-commit hooks + CI checks
- **Audit**: Daily scans, CVE tracking, license compliance

### ⚡ Performance
- **Load Testing**: K6 tests up to 500 VUs
- **Backoff**: Exponential (1s→30s) with jitter
- **Offline**: Auto-pause/resume on network changes
- **Chaos**: Tests for 500 errors, timeouts, slow responses

### 📊 Observability
- **Metrics**: counter(), gauge(), histogram()
- **SLOs**: Autosave 99.5%, latency <800ms
- **Alerts**: Fast/moderate/slow burn rates
- **Dashboards**: Grafana-ready queries

### ♿ Accessibility
- **WCAG 2.1 AA**: Full compliance
- **Keyboard**: Complete navigation support
- **Screen Reader**: Aria labels, live regions
- **i18n**: Localization scaffolding

### 🔄 Rollback
1. **Feature Flag** (< 2 min): Toggle REPORTING_UNIFIED
2. **Frontend** (< 10 min): Revert deployment
3. **Backend** (< 15 min): kubectl rollout undo
4. **Database** (< 30 min): Restore from backup

## SLO Targets

| Metric | Target | Window |
|--------|--------|--------|
| Autosave Success | ≥99.5% | 5 min |
| Autosave Latency | <800ms p50 | 5 min |
| Finalize Success | ≥99.9% | 1 hour |
| Sign Success | ≥99.9% | 1 hour |
| Editor Crash | <0.1% | 24 hours |
| API Availability | ≥99.9% | 1 hour |

## Alert Thresholds

| Alert | Condition | Action |
|-------|-----------|--------|
| Critical | Error rate >2% | Page immediately |
| Warning | Error rate >1% | Notify Slack |
| Fast Burn | 10x error budget | Page + investigate |
| Moderate Burn | 3x error budget | Investigate in 1h |

## Feature Flags

```env
VITE_FEATURE_REPORTING_UNIFIED=true
VITE_FEATURE_REPORTING_UNIFIED_ONLY=false
VITE_FEATURE_REPORTING_LEGACY_KILL_DATE=2024-12-31
VITE_FEATURE_TELEMETRY_ENABLED=true
```

## Metrics Integration

```typescript
// Register external collector
window.__METRICS_COLLECTOR = {
  collect(metric) { /* Send to Datadog/Prometheus */ },
  flush() { /* Flush buffer */ }
};

// Emit metrics
import { counter, histogram } from './observability/metrics';
counter('autosave.attempt', { reportId });
histogram('autosave.latency', duration, { status: 'success' });
```

## PII Redaction

```typescript
import { redactPII } from './utils/redaction';

// Redact before logging
console.log(redactPII(userInput));

// Redact before telemetry
telemetryEmit('event', { data: redactPII(data) });
```

## Export Validation

```typescript
import { validateExport } from './validation/validateExport';

const result = validateExport('fhir', data);
if (!result.valid) {
  toastError(formatValidationErrors(result.errors));
}
```

## Emergency Contacts

- **On-Call**: [PagerDuty]
- **Security**: security@example.com
- **DevOps**: #devops-alerts
- **SRE**: #sre-team

## Documentation

- **Security**: `config/secrets-policy.md`
- **SLOs**: `docs/SLOs.md`
- **Alerts**: `ops/alerts.yaml`
- **Rollback**: `docs/ROLLBACK.md`
- **Smoke Tests**: `docs/SMOKE_TEST_MATRIX.md`

---

**Version**: 2.0
**Last Updated**: 2024-01-15
