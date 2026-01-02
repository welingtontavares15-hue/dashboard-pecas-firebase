# Firebase Console Configuration Checklist

## Required Steps in Firebase Console

### 1. Enable Anonymous Authentication

**CRITICAL**: This is required for the app to work with current database rules.

1. Go to **Firebase Console**: https://console.firebase.google.com/
2. Select project: **solicitacoes-de-pecas**
3. Navigate to **Authentication** > **Sign-in method**
4. Click on **Anonymous** provider
5. Toggle **Enable** switch to ON
6. Click **Save**

### 2. Verify Realtime Database Rules

1. In Firebase Console, go to **Realtime Database** > **Rules**
2. Verify rules match the following:

```json
{
  "rules": {
    "data": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

3. If rules are different, update them and click **Publish**

### 3. Verify Database URL

Confirm the database URL is: `https://solicitacoes-de-pecas-default-rtdb.firebaseio.com`

If the database doesn't exist:
1. Go to **Realtime Database** section
2. Click **Create Database**
3. Choose location: **us-central1** (or your preferred region)
4. Start in **locked mode** (we'll set custom rules)
5. Apply the rules from step 2

## Testing the Configuration

### Option 1: Web-based Healthcheck
1. Start a local web server:
   ```bash
   npx http-server -p 8080
   ```
2. Open: http://localhost:8080/firebase-healthcheck.html
3. Check all tests pass (green checkmarks)

### Option 2: Application Console
1. Open the main application in browser
2. Open Developer Tools (F12) → Console tab
3. Look for these success messages:
   - ✅ Firebase initialized successfully
   - ✅ Firebase authenticated successfully (anonymous)
   - ✅ CloudStorage initialized with Firebase and authenticated
   - ✅ Firebase connection status: Connected

## Common Issues

### PERMISSION_DENIED Error
**Cause**: Anonymous Authentication not enabled or rules are too restrictive

**Solution**: 
- Enable Anonymous Authentication (see step 1 above)
- Verify rules allow `auth != null` (see step 2 above)
- Wait 1-2 minutes for Firebase to propagate changes

### Authentication Timeout
**Cause**: Anonymous provider not enabled or network issues

**Solution**:
- Confirm Anonymous Authentication is enabled
- Check internet connection
- Clear browser cache and try again

### "Firebase not available" Error
**Cause**: Firebase SDK not loaded or configuration error

**Solution**:
- Check that Firebase SDK scripts are loading (Network tab in DevTools)
- Verify Firebase configuration in `js/firebase-init.js` matches project

## Security Considerations

### Current Setup (Development/Staging)
- Uses **Anonymous Authentication**
- Anyone with internet can access the database
- Suitable for testing and development
- **NOT recommended for production with sensitive data**

### Recommended for Production
Replace Anonymous Authentication with proper user authentication:

1. **Email/Password Authentication**
   - Managed user accounts
   - Password reset capabilities
   - Email verification

2. **Google Sign-In**
   - OAuth2-based authentication
   - No password management needed
   - Easier for users

3. **Enhanced Security Rules**
   ```json
   {
     "rules": {
       "data": {
         "diversey_users": {
           ".read": "auth != null",
           ".write": "auth != null && (
             data.child(auth.uid).child('role').val() == 'administrador'
           )"
         },
         "diversey_solicitacoes": {
           ".read": "auth != null",
           ".write": "auth != null"
         }
       }
     }
   }
   ```

## Monitoring and Alerts

### Set Up Usage Alerts
1. In Firebase Console, go to **Usage and billing**
2. Set up alerts for:
   - Database reads/writes
   - Storage usage
   - Authentication attempts
   - Bandwidth

### Enable Firebase Analytics
1. Go to **Analytics** section
2. Enable analytics for usage insights
3. Monitor active users and feature usage

## Backup and Recovery

### Enable Automatic Backups
1. Upgrade to Blaze (pay-as-you-go) plan if needed
2. Set up daily automated backups
3. Test backup restoration in staging environment

### Manual Backup (Emergency)
1. Go to **Realtime Database** > **Data** tab
2. Click **⋮** menu > **Export JSON**
3. Save backup file securely
4. Store in version control or secure cloud storage

## Support Resources

- **Firebase Documentation**: https://firebase.google.com/docs
- **Realtime Database Guide**: https://firebase.google.com/docs/database
- **Authentication Guide**: https://firebase.google.com/docs/auth
- **Security Rules**: https://firebase.google.com/docs/database/security

## Verification Checklist

Before deploying to production:

- [ ] Anonymous Authentication enabled
- [ ] Database rules configured and tested
- [ ] Healthcheck passes all tests
- [ ] Application can read/write data
- [ ] Usage alerts configured
- [ ] Backup strategy in place
- [ ] Security rules reviewed for production use
- [ ] Migration plan from Anonymous to proper auth (if needed)
