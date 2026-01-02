# Deployment and Rollback Guide

## Overview
This document provides step-by-step instructions for deploying and rolling back the Dashboard de Solicitação de Peças application.

## Environments

### Development (dev)
- **Purpose**: Active development and testing
- **URL**: http://localhost:8080 (local) or dev.dashboard-pecas.example.com
- **Data**: Test data only
- **Firebase Project**: solicitacoes-de-pecas-dev

### Staging (staging)
- **Purpose**: Pre-production testing and validation
- **URL**: https://staging.dashboard-pecas.example.com
- **Data**: Copy of production data (sanitized)
- **Firebase Project**: solicitacoes-de-pecas-staging

### Production (prod)
- **Purpose**: Live system for end users
- **URL**: https://dashboard-pecas.example.com
- **Data**: Real production data
- **Firebase Project**: solicitacoes-de-pecas (production)

## Pre-Deployment Checklist

### Code Quality
- [ ] All unit tests pass (`npm test`)
- [ ] Linting passes (`npm run lint:check`)
- [ ] No security vulnerabilities (`npm audit`)
- [ ] Code review completed and approved
- [ ] PR merged to target branch

### Functionality Testing
- [ ] Login flows tested (Admin/Gestor/Técnico)
- [ ] Create request → save draft → submit tested
- [ ] Approve/reject with comment tested
- [ ] Offline sync tested
- [ ] Export functionality tested (PDF/XLS/CSV)

### Data & Configuration
- [ ] Database migrations prepared (if any)
- [ ] Firebase security rules reviewed
- [ ] Environment variables configured
- [ ] Service Worker cache version updated

### Documentation
- [ ] Release notes prepared
- [ ] Breaking changes documented
- [ ] Rollback plan documented

## Deployment Process

### 1. Deploy to Staging

```bash
# 1. Switch to develop branch
git checkout develop
git pull origin develop

# 2. Run tests
npm test
npm run lint:check

# 3. Update service worker version
# Edit service-worker.js and increment CACHE_VERSION

# 4. Commit version bump
git add service-worker.js
git commit -m "chore: bump cache version for staging release"
git push origin develop

# 5. Deploy to Firebase Staging
firebase use staging
firebase deploy --only hosting

# 6. Verify deployment
# Visit staging URL and test critical flows
```

### 2. Deploy to Production

```bash
# 1. Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v1.x.x

# 2. Final testing on staging
# Run complete test suite on staging environment

# 3. Merge to main
git checkout main
git pull origin main
git merge release/v1.x.x

# 4. Create release tag
VERSION=$(date +'%Y.%m.%d')
git tag -a "v${VERSION}" -m "Release v${VERSION}"
git push origin main --tags

# 5. Deploy to Firebase Production
firebase use production
firebase deploy --only hosting

# 6. Verify production deployment
# Check health endpoint
# Test critical user flows
# Monitor error logs for 15 minutes

# 7. Announce deployment
# Notify team via Slack/email
```

## Service Worker Cache Management

### Update Cache Version
When deploying, always increment the cache version in `service-worker.js`:

```javascript
const CACHE_VERSION = 'v5'; // Increment this
```

This forces clients to download new assets.

### Clear Old Caches
The service worker automatically clears old caches during activation:

```javascript
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => !ALL_CACHES.includes(key))
        .map((key) => caches.delete(key)))
    )
  );
});
```

## Rollback Procedures

### When to Rollback
Rollback immediately if:
- Critical functionality is broken
- Data corruption is detected
- Security vulnerability is discovered
- User complaints exceed threshold
- System performance degrades significantly

### Quick Rollback (Firebase Hosting)

```bash
# 1. Check deployment history
firebase hosting:channel:list

# 2. Rollback to previous version
firebase hosting:rollback

# 3. Verify rollback
# Check that previous version is live
# Test critical flows

# 4. Notify team
# Alert team about rollback
# Document reason for rollback
```

### Manual Rollback

```bash
# 1. Identify last good version
git log --oneline -10

# 2. Checkout previous version
git checkout <previous-version-tag>

# 3. Deploy previous version
firebase use production
firebase deploy --only hosting

# 4. Update tracking
git tag -a "v${VERSION}-rollback" -m "Rollback to previous version"
git push origin --tags
```

### Post-Rollback Actions
1. Document the issue that caused rollback
2. Create hotfix branch from previous version
3. Fix the issue
4. Test thoroughly
5. Deploy hotfix following standard process

## Database Rollback

### Firebase Realtime Database

```bash
# 1. Access Firebase Console
# https://console.firebase.google.com

# 2. Navigate to Realtime Database
# Select project → Database → Realtime Database

# 3. Restore from backup
# Import backup JSON file

# Note: This overwrites current data
# Coordinate with team before restoring
```

### IndexedDB (Client-side)
IndexedDB is local to each user's browser. No server-side rollback needed.
Users can clear their local cache:
1. Visit clear-cache.html
2. Or use browser DevTools → Application → Clear Storage

## Monitoring Post-Deployment

### Immediate Monitoring (First 15 minutes)
- [ ] Check error logs in Firebase Console
- [ ] Monitor user login success rate
- [ ] Verify critical API calls succeed
- [ ] Check service worker activation
- [ ] Monitor page load times

### Short-term Monitoring (First 24 hours)
- [ ] Review user feedback
- [ ] Check error rate trends
- [ ] Monitor database performance
- [ ] Review audit logs for anomalies

### Long-term Monitoring (First week)
- [ ] Analyze usage patterns
- [ ] Review performance metrics
- [ ] Check for memory leaks
- [ ] Validate data integrity

## Emergency Contacts

### Technical Team
- **Technical Lead**: [Name] - [Email] - [Phone]
- **DevOps**: [Name] - [Email] - [Phone]
- **On-Call Engineer**: [Rotation] - [Contact Method]

### Escalation Path
1. First contact: On-call engineer
2. Second contact: Technical lead
3. Third contact: Engineering manager

## Common Issues and Solutions

### Issue: Service Worker Not Updating
**Symptoms**: Users see old version after deployment

**Solution**:
1. Check CACHE_VERSION was incremented
2. Force service worker update:
   ```javascript
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(reg => reg.update());
   });
   ```
3. Instruct users to hard refresh (Ctrl+Shift+R)

### Issue: Firebase Connection Failed
**Symptoms**: Data not syncing, offline mode active

**Solution**:
1. Check Firebase Console for service status
2. Verify Firebase configuration in storage.js
3. Check browser console for specific errors
4. System falls back to localStorage automatically

### Issue: Authentication Failures
**Symptoms**: Users cannot log in

**Solution**:
1. Check rate limiting (clear with clear-cache.html)
2. Verify user data in Firebase
3. Check password hashing is working
4. Review browser console for errors

### Issue: Export Functions Failing
**Symptoms**: PDF/Excel export not working

**Solution**:
1. Check external library CDN availability
2. Verify browser console for loading errors
3. Test in different browser
4. Check for popup blockers

## Release Notes Template

```markdown
## Release vYYYY.MM.DD

### New Features
- Feature 1 description
- Feature 2 description

### Improvements
- Improvement 1
- Improvement 2

### Bug Fixes
- Bug fix 1
- Bug fix 2

### Breaking Changes
- None

### Migration Notes
- Any special steps needed for this release

### Known Issues
- Known issue 1 (with workaround if available)

### Testing
- All critical flows tested
- Unit tests: X passed
- Integration tests: Y passed
```

## Backup and Recovery

### Daily Backups
Firebase automatically creates daily backups.

### Manual Backup
```bash
# Export Firebase data
firebase database:get / > backup-$(date +%Y%m%d).json

# Store backup securely
# Upload to secure cloud storage
```

### Recovery Test
- [ ] Monthly: Test backup restoration in staging
- [ ] Quarterly: Full disaster recovery drill
- [ ] Document time to recover (RTO)
- [ ] Document acceptable data loss (RPO)

## Version Control Best Practices

### Branch Strategy
- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Individual features
- `hotfix/*`: Critical fixes for production
- `release/*`: Release preparation

### Commit Messages
Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `chore:` Maintenance
- `docs:` Documentation
- `refactor:` Code refactoring
- `test:` Test updates
- `perf:` Performance improvement

## Last Updated
2024-12-26
