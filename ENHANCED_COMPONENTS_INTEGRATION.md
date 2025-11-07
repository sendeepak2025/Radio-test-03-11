# Enhanced Components Integration Guide

## Overview

This guide explains how to integrate the production-ready enhanced components into your existing codebase.

## Enhanced Components

### 1. UnifiedReportEditor (Enhanced)

**Location**: `viewer/src/components/reports/UnifiedReportEditor.enhanced.tsx`

**Key Enhancements**:
- ✅ RBAC enforcement (read-only for final reports)
- ✅ Lazy-loaded SignatureDialog
- ✅ Virtualized findings list (>50 items)
- ✅ Comprehensive telemetry
- ✅ Error reporting
- ✅ Accessibility improvements
- ✅ Performance optimizations

**Migration Steps**:

```typescript
// Before (old component)
import { UnifiedReportEditor } from './components/reports/UnifiedReportEditor';

// After (enhanced component)
import { UnifiedReportEditor } from './components/reports/UnifiedReportEditor.enhanced';

// Usage remains the same
<UnifiedReportEditor
  studyInstanceUID={studyUID}
  patientInfo={patientInfo}
  reportId={reportId}
  onReportCreated={handleReportCreated}
  onReportSigned={handleReportSigned}
/>
```

**New Features Available**:

```typescript
// Telemetry is automatically emitted for:
- Editor opened
- Report loaded/created
- Autosave success/failure
- Finalize started/completed
- Sign started/completed
- Addendum added
- Export completed
- AI analysis applied
- Version conflicts

// Access telemetry data:
window.addEventListener('telemetry', (event) => {
  console.log('Telemetry:', event.detail);
});

// Access error reports:
window.addEventListener('reportError', (event) => {
  console.log('Error:', event.detail);
});
```

### 2. TemplateSelectorUnified (Enhanced)

**Location**: `viewer/src/components/reporting/TemplateSelectorUnified.enhanced.tsx`

**Key Enhancements**:
- ✅ Debounced search (250ms)
- ✅ Telemetry for search and selection
- ✅ Performance optimizations
- ✅ Accessibility improvements

**Migration Steps**:

```typescript
// Before
import { TemplateSelectorUnified } from './components/reporting/TemplateSelectorUnified';

// After
import { TemplateSelectorUnified } from './components/reporting/TemplateSelectorUnified.enhanced';

// Usage remains the same
<TemplateSelectorUnified
  templates={templates}
  onSelect={handleTemplateSelect}
  loading={loading}
  error={error}
/>
```

## Utility Functions

### reportingUtils.ts

**Location**: `viewer/src/utils/reportingUtils.ts`

**New Functions**:

```typescript
import {
  telemetryEmit,
  reportError,
  debounce,
  throttle,
  canEditReport,
  canFinalizeReport,
  canSignReport,
  canAddAddendum,
  validateReportContent,
  calculateSLAMetrics,
} from './utils/reportingUtils';

// Emit telemetry event
telemetryEmit('custom.event', { data: 'value' });

// Report error with context
reportError(
  new Error('Something failed'),
  { reportId: '123', action: 'save' },
  'high' // severity: low | medium | high | critical
);

// Debounce function
const debouncedSave = debounce(saveFunction, 500);

// Check permissions
if (canEditReport(reportStatus)) {
  // Allow editing
}

if (canSignReport(reportStatus, userRole)) {
  // Show sign button
}

// Validate report before finalization
const validation = validateReportContent(reportContent);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// Calculate SLA metrics
const metrics = calculateSLAMetrics(report);
console.log('Turnaround time:', metrics.totalTurnaroundTime, 'minutes');
```

## Telemetry System

### Initialize Telemetry

**Location**: `viewer/src/instrumentation/telemetry-listener.ts`

```typescript
import { initializeTelemetry } from './instrumentation/telemetry-listener';

// Auto-initialized on import, or manually:
initializeTelemetry({
  enabled: true,
  endpoint: '/api/telemetry',
  batchSize: 10,
  flushInterval: 30000, // 30 seconds
});
```

### Listen to Telemetry Events

```typescript
// In your app initialization
window.addEventListener('telemetry', (event) => {
  const { event: eventName, payload, timestamp, userId } = event.detail;
  
  // Send to your analytics service
  analytics.track(eventName, payload);
});

window.addEventListener('reportError', (event) => {
  const { error, context, severity } = event.detail;
  
  // Send to error tracking service (e.g., Sentry)
  Sentry.captureException(error, {
    level: severity,
    extra: context,
  });
});
```

## Feature Flags

### Configure Feature Flags

**Location**: `viewer/src/config/flags.ts`

```typescript
import { FLAGS, isFeatureEnabled, setFeatureFlag } from './config/flags';

// Check if feature is enabled
if (isFeatureEnabled('REPORTING_UNIFIED')) {
  // Show unified reporting UI
}

// Override in development (for testing)
if (import.meta.env.DEV) {
  setFeatureFlag('REPORTING_AI_ANALYSIS', false);
}

// Environment variable override
// .env.local:
// VITE_FEATURE_REPORTING_UNIFIED=true
// VITE_FEATURE_REPORTING_AI_ANALYSIS=false
```

### Available Feature Flags

```typescript
REPORTING_UNIFIED              // Main unified reporting system
REPORTING_AI_ANALYSIS          // AI-powered analysis
REPORTING_VOICE_DICTATION      // Voice input
REPORTING_SMART_TEMPLATES      // Smart template selection
REPORTING_EXPORT_PDF           // PDF export
REPORTING_EXPORT_DOCX          // DOCX export
REPORTING_DIGITAL_SIGNATURE    // Digital signatures
REPORTING_ADDENDUM             // Addendum support
REPORTING_PRIOR_AUTH           // Prior authorization
REPORTING_FOLLOWUP             // Follow-up tracking
PERFORMANCE_MONITORING         // Performance metrics
TELEMETRY_ENABLED              // Telemetry system
```

## Health Checks

### Use Health Check System

**Location**: `viewer/src/health/healthcheck.ts`

```typescript
import { 
  reportingHealth, 
  quickHealthCheck,
  HealthMonitor 
} from './health/healthcheck';

// Quick health check
const isHealthy = await quickHealthCheck();
if (!isHealthy) {
  console.warn('System unhealthy');
}

// Detailed health check
const health = await reportingHealth();
console.log('Health status:', health.ok);
console.log('Details:', health.details);
console.log('Duration:', health.duration, 'ms');

// Continuous monitoring
const monitor = new HealthMonitor(60000); // Check every 60s
monitor.onHealthChange((result) => {
  if (!result.ok) {
    alert('System health degraded!');
  }
});
monitor.start();

// Stop monitoring
monitor.stop();
```

## E2E Testing with Mocks

### Use Mock Server

**Location**: `e2e/server-mocks.ts`

```typescript
import { test } from '@playwright/test';
import { mockReportingRoutes, resetMockData } from './server-mocks';

test.beforeEach(async ({ page }) => {
  resetMockData();
  
  // Enable mocks
  if (process.env.PW_USE_MOCK === '1') {
    await mockReportingRoutes(page);
  }
  
  await page.goto('/reports');
});

test('should create report', async ({ page }) => {
  // Test with mocked API
  await page.click('[data-testid="create-report"]');
  // ...
});
```

### Run Tests

```bash
# With mocks (fast, deterministic)
PW_USE_MOCK=1 npm run test:e2e

# With real API (integration test)
npm run test:e2e

# Specific test
npm run test:e2e -- --grep "should create report"

# With UI
npm run test:e2e:ui
```

## Performance Testing

### Run Performance Tests

```bash
# Run all performance tests
npm run test:performance

# Run specific performance test
npm run test -- UnifiedReportEditor.perf.test.ts
```

### Add Custom Performance Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('MyComponent - Performance', () => {
  it('should render quickly', () => {
    const startTime = performance.now();
    
    // Render component
    render(<MyComponent data={largeDataset} />);
    
    const renderTime = performance.now() - startTime;
    expect(renderTime).toBeLessThan(200); // 200ms threshold
  });
});
```

## Accessibility Testing

### Run Accessibility Tests

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('should be accessible', async ({ page }) => {
  await page.goto('/reports');
  
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  
  expect(results.violations).toEqual([]);
});
```

## CI/CD Integration

### GitHub Actions

The CI pipeline automatically runs on every PR:

```yaml
# .github/workflows/ci.yml
- Typecheck
- Lint
- Unit tests
- E2E tests (with mocks)
- Upload test reports
```

### Local Pre-commit Checks

```bash
# Run all checks before committing
npm run typecheck && \
npm run lint && \
npm run test:unit && \
PW_USE_MOCK=1 npm run test:e2e
```

## Migration Checklist

### Step 1: Update Dependencies

```bash
cd viewer
npm install @playwright/test@latest
npm install @axe-core/playwright
npm install vite-plugin-bundle-analyzer --save-dev
```

### Step 2: Replace Components

- [ ] Replace `UnifiedReportEditor` with enhanced version
- [ ] Replace `TemplateSelectorUnified` with enhanced version
- [ ] Update imports in all files

### Step 3: Add Telemetry

- [ ] Import telemetry listener in main app file
- [ ] Add telemetry event listeners
- [ ] Configure telemetry endpoint

### Step 4: Configure Feature Flags

- [ ] Set up environment variables
- [ ] Configure feature flags for your environment
- [ ] Test flag toggling

### Step 5: Set Up Health Checks

- [ ] Add health check endpoint to backend
- [ ] Initialize health monitor
- [ ] Set up alerting

### Step 6: Update Tests

- [ ] Add E2E tests using mock server
- [ ] Add performance tests
- [ ] Add accessibility tests
- [ ] Update CI configuration

### Step 7: Documentation

- [ ] Update team documentation
- [ ] Train team on new features
- [ ] Update runbooks

## Troubleshooting

### Telemetry Not Working

```typescript
// Check if telemetry is enabled
import { FLAGS } from './config/flags';
console.log('Telemetry enabled:', FLAGS.TELEMETRY_ENABLED);

// Check for event listeners
window.dispatchEvent(new CustomEvent('telemetry', {
  detail: { event: 'test', payload: {} }
}));
```

### Feature Flags Not Working

```typescript
// Check environment variables
console.log('Env vars:', import.meta.env);

// Check flag values
import { FLAGS } from './config/flags';
console.log('Flags:', FLAGS);
```

### Health Checks Failing

```bash
# Test health endpoint
curl http://localhost:5173/api/health

# Check browser console
# Open DevTools → Console → Look for health check errors
```

### E2E Tests Failing

```bash
# Run with UI to debug
npm run test:e2e:ui

# Check if mocks are enabled
echo $PW_USE_MOCK

# View test report
npx playwright show-report
```

## Best Practices

### 1. Always Use Telemetry

```typescript
// Good: Track important events
telemetryEmit('report.created', { reportId, templateId });

// Bad: No tracking
createReport(data);
```

### 2. Handle Errors Properly

```typescript
// Good: Report errors with context
try {
  await saveReport(data);
} catch (error) {
  reportError(error, { reportId, action: 'save' }, 'high');
  throw error;
}

// Bad: Silent failure
try {
  await saveReport(data);
} catch (error) {
  // Nothing
}
```

### 3. Use Feature Flags

```typescript
// Good: Feature flag controlled
if (isFeatureEnabled('REPORTING_AI_ANALYSIS')) {
  showAIButton();
}

// Bad: Hard-coded feature
showAIButton();
```

### 4. Check Permissions

```typescript
// Good: Check before showing UI
if (canSignReport(status, userRole)) {
  <Button onClick={handleSign}>Sign</Button>
}

// Bad: Show to everyone
<Button onClick={handleSign}>Sign</Button>
```

### 5. Optimize Performance

```typescript
// Good: Debounced search
const debouncedSearch = debounce(searchFunction, 250);

// Bad: Search on every keystroke
onChange={(e) => searchFunction(e.target.value)}
```

## Support

For questions or issues:
- Check documentation in `/docs`
- Review test examples in `/e2e`
- Contact DevOps team
- Create GitHub issue

---

**Last Updated**: 2024-01-15
**Version**: 1.0
