# Unified Reporting System - Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Unified Reporting System to production with proper CI/CD, monitoring, and rollback procedures.

## Prerequisites

- [ ] Node.js 18 or 20 installed
- [ ] npm or yarn package manager
- [ ] Git repository access
- [ ] CI/CD pipeline configured (GitHub Actions)
- [ ] Production environment provisioned
- [ ] Database backup system in place
- [ ] Monitoring tools configured
- [ ] SSL certificates installed

## Architecture

```
┌─────────────────┐
│   Load Balancer │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│ Web 1 │ │ Web 2 │  (Frontend - React/Vite)
└───┬───┘ └──┬────┘
    │        │
    └────┬───┘
         │
┌────────▼────────┐
│   API Gateway   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│ API 1 │ │ API 2 │  (Backend - Node.js/Express)
└───┬───┘ └──┬────┘
    │        │
    └────┬───┘
         │
┌────────▼────────┐
│    Database     │  (MongoDB)
└─────────────────┘
```

## Installation Steps

### 1. Install Dependencies

```bash
# Navigate to viewer directory
cd viewer

# Install dependencies
npm ci

# Install Playwright browsers for E2E tests
npx playwright install --with-deps
```

### 2. Environment Configuration

Create `.env.production` file:

```env
# API Configuration
VITE_API_URL=https://api.yourdomain.com
VITE_API_TIMEOUT=30000

# Feature Flags
VITE_FEATURE_REPORTING_UNIFIED=true
VITE_FEATURE_REPORTING_AI_ANALYSIS=true
VITE_FEATURE_REPORTING_DIGITAL_SIGNATURE=true
VITE_FEATURE_TELEMETRY_ENABLED=true

# Telemetry
VITE_TELEMETRY_ENDPOINT=/api/telemetry

# Security
VITE_ENABLE_HTTPS=true
VITE_CSRF_ENABLED=true

# Performance
VITE_ENABLE_COMPRESSION=true
VITE_ENABLE_CACHING=true
```

### 3. Build Application

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Run unit tests
npm run test:unit

# Run E2E tests
npm run test:e2e

# Build for production
npm run build

# Analyze bundle (optional)
ANALYZE=1 npm run build
```

### 4. Pre-Deployment Verification

```bash
# Preview production build locally
npm run preview

# Run smoke tests
npm run test:e2e -- --grep "smoke"

# Check bundle size
ls -lh dist/assets/*.js
```

## CI/CD Pipeline

### GitHub Actions Workflow

The CI pipeline (`.github/workflows/ci.yml`) automatically:

1. **Install Dependencies**: `npm ci`
2. **Type Check**: `npm run typecheck`
3. **Lint**: `npm run lint`
4. **Unit Tests**: `npm run test:unit`
5. **E2E Tests**: `npm run test:e2e`
6. **Build**: `npm run build`
7. **Upload Artifacts**: Playwright reports, test results

### Deployment Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: |
          npm run typecheck
          npm run lint
          npm run test:unit
      
      - name: Build
        run: npm run build
        env:
          VITE_API_URL: ${{ secrets.PRODUCTION_API_URL }}
      
      - name: Deploy to S3
        run: aws s3 sync dist/ s3://your-bucket/
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      
      - name: Invalidate CloudFront
        run: aws cloudfront create-invalidation --distribution-id ${{ secrets.CF_DISTRIBUTION_ID }} --paths "/*"
```

## Deployment Strategies

### Blue-Green Deployment

1. Deploy new version to "green" environment
2. Run smoke tests on green
3. Switch traffic from blue to green
4. Keep blue as rollback option for 24h

### Canary Deployment

1. Deploy to 5% of servers
2. Monitor for 2 hours
3. Increase to 25%
4. Monitor for 4 hours
5. Increase to 50%
6. Monitor for 8 hours
7. Deploy to 100%

### Feature Flag Rollout

1. Deploy with feature flag OFF
2. Enable for internal users (1%)
3. Enable for beta users (10%)
4. Enable for all users (100%)

## Monitoring & Observability

### Health Checks

```bash
# API health
curl https://api.yourdomain.com/api/health

# Frontend health
curl https://app.yourdomain.com/health.html
```

### Metrics to Monitor

#### Performance Metrics
- API response time (p50, p95, p99)
- Frontend load time
- Time to interactive
- First contentful paint
- Largest contentful paint

#### Reliability Metrics
- Error rate (%)
- Success rate (%)
- Availability (%)
- Failed requests count

#### Business Metrics
- Reports created per hour
- Average time to finalize
- Average time to sign
- Export success rate
- User adoption rate

### Logging

```javascript
// Structured logging format
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "service": "reporting",
  "event": "report.created",
  "userId": "user-123",
  "reportId": "report-456",
  "duration": 234,
  "metadata": {
    "templateId": "template-789",
    "modality": "CR"
  }
}
```

### Alerting Rules

```yaml
# Critical Alerts (PagerDuty)
- name: High Error Rate
  condition: error_rate > 2%
  duration: 5m
  severity: critical

- name: API Down
  condition: health_check_failed
  duration: 2m
  severity: critical

# Warning Alerts (Slack)
- name: Elevated Error Rate
  condition: error_rate > 1%
  duration: 10m
  severity: warning

- name: Slow Response Time
  condition: p95_response_time > 1s
  duration: 15m
  severity: warning
```

## Rollback Procedures

### Immediate Rollback (< 5 minutes)

```bash
# 1. Disable feature flag
curl -X POST https://api.yourdomain.com/api/admin/flags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"REPORTING_UNIFIED": false}'

# 2. Clear CDN cache
aws cloudfront create-invalidation \
  --distribution-id $CF_DISTRIBUTION_ID \
  --paths "/*"

# 3. Verify rollback
curl https://app.yourdomain.com/api/health
```

### Full Rollback (< 30 minutes)

```bash
# 1. Revert to previous deployment
git revert HEAD
git push origin main

# 2. Trigger deployment pipeline
gh workflow run deploy.yml

# 3. Restore database (if needed)
mongorestore --uri="$MONGO_URI" --archive=backup-$(date +%Y%m%d).gz

# 4. Verify system health
npm run test:e2e -- --grep "smoke"
```

## Security Checklist

- [ ] HTTPS enabled with valid SSL certificate
- [ ] CORS configured correctly
- [ ] CSRF protection enabled
- [ ] Authentication required for all API endpoints
- [ ] Input validation on all user inputs
- [ ] XSS protection headers set
- [ ] Content Security Policy configured
- [ ] Rate limiting enabled
- [ ] SQL injection prevention (parameterized queries)
- [ ] Secrets stored in environment variables
- [ ] Regular security audits scheduled
- [ ] Dependency vulnerability scanning enabled

## Performance Optimization

### Frontend Optimizations

```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'mui': ['@mui/material'],
          'reporting-editor': ['./src/components/reports/UnifiedReportEditor.tsx'],
        },
      },
    },
  },
});
```

### Backend Optimizations

- Enable gzip compression
- Implement Redis caching
- Use database indexes
- Optimize database queries
- Enable connection pooling
- Implement rate limiting

### CDN Configuration

```nginx
# Cache static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Don't cache HTML
location ~* \.html$ {
    expires -1;
    add_header Cache-Control "no-store, no-cache, must-revalidate";
}
```

## Disaster Recovery

### Backup Strategy

- **Database**: Daily full backup, hourly incremental
- **Files**: Daily backup to S3 with versioning
- **Configuration**: Version controlled in Git
- **Retention**: 30 days for daily, 7 days for hourly

### Recovery Procedures

```bash
# 1. Restore database
mongorestore --uri="$MONGO_URI" --archive=backup-latest.gz

# 2. Restore files
aws s3 sync s3://backup-bucket/files/ /var/www/files/

# 3. Restart services
systemctl restart api-server
systemctl restart web-server

# 4. Verify recovery
npm run test:e2e -- --grep "smoke"
```

## Troubleshooting

### Common Issues

#### High Error Rate

```bash
# Check logs
tail -f /var/log/api-server/error.log

# Check database connection
mongo --eval "db.adminCommand('ping')"

# Check API health
curl https://api.yourdomain.com/api/health
```

#### Slow Performance

```bash
# Check database queries
mongo --eval "db.currentOp()"

# Check server resources
top
df -h
free -m

# Check network latency
ping api.yourdomain.com
```

#### Failed Deployments

```bash
# Check CI/CD logs
gh run list --workflow=deploy.yml

# Check deployment status
kubectl get pods
kubectl logs deployment/api-server

# Rollback if needed
kubectl rollout undo deployment/api-server
```

## Support & Escalation

### Escalation Path

1. **Level 1**: On-call engineer (responds within 15 minutes)
2. **Level 2**: Senior engineer (responds within 30 minutes)
3. **Level 3**: Engineering manager (responds within 1 hour)
4. **Level 4**: CTO (responds within 2 hours)

### Contact Information

- **On-Call Engineer**: [Phone/Slack]
- **DevOps Team**: [Slack Channel]
- **Security Team**: [Email/Slack]
- **Product Manager**: [Email/Slack]

## Post-Deployment

### Day 1 Checklist

- [ ] Monitor error rates every hour
- [ ] Review logs for anomalies
- [ ] Check performance metrics
- [ ] Collect user feedback
- [ ] Update status page

### Week 1 Checklist

- [ ] Review all metrics daily
- [ ] Analyze user adoption
- [ ] Address reported issues
- [ ] Optimize based on data
- [ ] Document lessons learned

### Month 1 Checklist

- [ ] Conduct retrospective
- [ ] Update documentation
- [ ] Plan next iteration
- [ ] Review SLA compliance
- [ ] Celebrate success! 🎉

---

**Last Updated**: 2024-01-15
**Version**: 1.0
**Maintained By**: DevOps Team
