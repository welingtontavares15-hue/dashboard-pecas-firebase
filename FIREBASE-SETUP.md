# Firebase Realtime Database - Setup Guide

## Overview

## Configuração no Front-end

Edite o arquivo `js/firebase-config.js` e cole o objeto `firebaseConfig` do seu app Web no Firebase Console **ou** injete um objeto `window.__ENV.firebaseConfig` gerado no deploy (recomendado para separar credenciais do bundle).


This application uses **Firebase Realtime Database** for cloud data synchronization. Anonymous Authentication is allowed only in non‑production environments (or when you explicitly set `window.FIREBASE_ALLOW_ANONYMOUS = true` before loading the app).

## Firebase Configuration

### Project Details
- **Project ID**: SEU_PROJETO
- **Project Number**: 782693023312
- **Database URL**: https://SEU_PROJETO-default-rtdb.firebaseio.com
- **App ID**: 1:782693023312:web:f22340c11c8c96cd4e9b55

### Database Structure
```
/data
  /diversey_users         → User accounts
  /diversey_tecnicos      → Technicians
  /diversey_fornecedores  → Suppliers
  /diversey_pecas         → Parts catalog
  /diversey_solicitacoes  → Requests/Solicitations
  /diversey_settings      → Application settings
  /healthcheck            → Connection test data
```

## Security Rules

### Current Rules (Firebase Console)
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

These rules require authentication for all read and write operations under `/data`.

## Authentication

Anonymous sign-in is **disabled by default in production**. In development or staging, enable the Anonymous provider in Firebase Console and, if needed, set `window.FIREBASE_ALLOW_ANONYMOUS = true` before loading the scripts. In production use an authenticated provider (for example, email/password or custom token).

## Environment Variables (Optional)

At runtime, you can inject the Firebase config via:

```html
<script>
  window.__ENV = {
    firebaseConfig: {
      apiKey: 'SUA_API_KEY',
      authDomain: 'SEU_PROJETO.firebaseapp.com',
      databaseURL: 'https://SEU_PROJETO-default-rtdb.firebaseio.com',
      projectId: 'SEU_PROJETO',
      storageBucket: 'SEU_PROJETO.firebasestorage.app',
      messagingSenderId: '782693023312',
      appId: '1:782693023312:web:f22340c11c8c96cd4e9b55'
    }
  };
</script>
```

If `window.__ENV.firebaseConfig` is not provided, the fallback inside `js/firebase-config.js` will be used.

## Testing Firebase Connection

### Option 1: Healthcheck HTML Page
Open `firebase-healthcheck.html` in your browser to run automated tests:

```bash
# Start a local web server
npx http-server -p 8080

# Open in browser
open http://localhost:8080/firebase-healthcheck.html
```

This page will test:
- ✅ Firebase SDK loading
- ✅ App initialization
- ✅ Anonymous authentication
- ✅ Database connection
- ✅ Write to `/data/healthcheck`
- ✅ Read from `/data/healthcheck`

### Option 2: Browser Console
1. Open the application in a browser
2. Open Developer Tools (F12)
3. Check the Console tab for these messages:

```
✓ Firebase initialized successfully
✓ Firebase authenticated successfully (anonymous)
✓ CloudStorage initialized with Firebase and authenticated
✓ Firebase connection status: Connected
```

### Option 3: Node.js Script
Run the healthcheck script for environment information:

```bash
node healthcheck.js
```

## Troubleshooting

### Permission Denied Errors

**Symptom**: `PERMISSION_DENIED` errors in console

**Solutions**:
1. Ensure Anonymous Authentication is enabled in Firebase Console
2. Verify rules in **Firebase Console** > **Realtime Database** > **Rules**
3. Check that rules match the configuration above
4. Wait a few seconds after enabling Anonymous Auth for changes to propagate

### Connection Timeout

**Symptom**: Firebase initialization times out

**Solutions**:
1. Check internet connection
2. Verify Firebase project is active (not deleted)
3. Check browser console for CORS or network errors
4. Try clearing browser cache and reloading

### Authentication Failed

**Symptom**: Authentication never completes

**Solutions**:
1. Enable Anonymous Authentication in Firebase Console
2. Check API key is correct in `firebase-init.js`
3. Verify project ID matches your Firebase project
4. Check Firebase project hasn't reached quota limits

## Security Best Practices

### ⚠️ NEVER COMMIT CREDENTIALS

Add these to `.gitignore`:
```
# Firebase service account keys (if using server-side)
serviceAccountKey.json
*-firebase-adminsdk-*.json

# Environment files
.env
.env.local
.env.*.local
```

### Production Considerations

For production deployment:

1. **Use Custom Authentication**: Replace anonymous auth with proper user authentication
2. **Implement Security Rules**: Add more restrictive rules based on user roles
3. **Enable App Check**: Protect against unauthorized clients
4. **Monitor Usage**: Set up Firebase usage alerts and quotas
5. **Regular Backups**: Configure automated database backups

### Recommended Production Rules

```json
{
  "rules": {
    "data": {
      "diversey_users": {
        ".read": "auth != null",
        ".write": "auth != null && (
          root.child('data/diversey_users').child(auth.uid).child('role').val() === 'administrador' ||
          root.child('data/diversey_users').child(auth.uid).child('role').val() === 'gestor'
        )"
      },
      "diversey_solicitacoes": {
        ".read": "auth != null",
        ".write": "auth != null"
      },
      "healthcheck": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

## Module Architecture

### `firebase-init.js`
Centralized Firebase initialization module:
- Prevents duplicate initialization
- Manages authentication lifecycle
- Provides unified database reference access
- Handles connection state monitoring

### `storage.js`
Cloud storage wrapper using Firebase v9 SDK:
- Automatic anonymous authentication
- Real-time data synchronization
- Online-only mode (requires connection)
- Session-based caching via DataManager

### `data.js`
Data management layer:
- Session cache for in-memory data
- Integration with CloudStorage
- Offline detection and blocking
- Automatic sync on reconnection

## Migration Notes

### From Firebase v8 to v9

The application has been updated from Firebase JavaScript SDK v8 (namespace) to v9 (modular):

**Old (v8)**:
```javascript
firebase.initializeApp(config);
const db = firebase.database();
db.ref('data/key').set(value);
```

**New (v9)**:
```javascript
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';

const app = initializeApp(config);
const db = getDatabase(app);
set(ref(db, 'data/key'), value);
```

Benefits:
- Smaller bundle size (tree-shaking)
- Better TypeScript support
- Modern ES modules
- Improved performance

## Support

For issues with Firebase connectivity:

1. Check `firebase-healthcheck.html` test results
2. Review browser console for error messages
3. Verify Firebase Console configuration
4. Consult Firebase documentation: https://firebase.google.com/docs/database

## Additional Resources

- [Firebase Realtime Database Documentation](https://firebase.google.com/docs/database)
- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Firebase Security Rules Documentation](https://firebase.google.com/docs/database/security)
- [Firebase JavaScript SDK v9 Migration Guide](https://firebase.google.com/docs/web/modular-upgrade)
