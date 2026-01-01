# Firebase Password Reset Tool

## Overview

This standalone HTML tool allows you to reset user passwords in the Diversey Dashboard Firebase Realtime Database without requiring login access to the main system.

## Location

`scripts/reset-passwords.html`

## Usage

### 1. Open the Tool

Open `scripts/reset-passwords.html` in any modern web browser (Chrome, Firefox, Edge, Safari).

### 2. Configure Firebase

Paste your Firebase configuration JSON into the textarea. The configuration must include:

```json
{
  "apiKey": "your-api-key",
  "authDomain": "your-project.firebaseapp.com",
  "databaseURL": "https://your-project-default-rtdb.firebaseio.com",
  "projectId": "your-project-id",
  "storageBucket": "your-project.appspot.com",
  "messagingSenderId": "123456789",
  "appId": "your-app-id"
}
```

**Important:** The `databaseURL` field is required for Realtime Database operations.

### 3. Reset Passwords

You have four options:

- **👑 Reset Administrador** - Resets passwords for all users with role `administrador` to `admin123`
- **👔 Reset Gestor** - Resets passwords for all users with role `gestor` to `gestor123`
- **🔧 Reset Tecnico** - Resets passwords for all users with role `tecnico` to `tecnico123`
- **🔄 Reset All Passwords** - Resets passwords for all users in the database

### 4. Monitor Progress

The tool displays real-time logs showing:
- Connection status
- Users being processed
- Success/failure for each operation
- Password hashes generated
- Summary statistics

## Default Passwords

| Role | Default Password |
|------|-----------------|
| administrador | admin123 |
| gestor | gestor123 |
| tecnico | tecnico123 |

## Technical Details

### Database Path

The tool reads and writes to: `data/diversey_users`

### User Structure

Each user record contains:
- `id` - Unique user identifier
- `username` - User's login username
- `passwordHash` - SHA-256 hash with salt
- `role` - User role (administrador, gestor, tecnico)
- `name` - Display name
- `email` - Email address
- `updatedAt` - Timestamp of last update

### Password Hashing

Passwords are hashed using SHA-256 with a salt pattern:
```
Hash = SHA256(password + "diversey_salt_v1:" + username)
```

Example:
- Username: `admin`
- Password: `admin123`
- Salt pattern: `diversey_salt_v1:admin`
- Result: SHA256(`admin123` + `diversey_salt_v1:admin`)

### Authentication

The tool uses Firebase Anonymous Authentication to satisfy the Realtime Database security rules which require `auth != null`.

## Security Notes

1. **Secure the Tool**: This file should only be accessible to administrators
2. **Private Configuration**: Never commit real Firebase configuration to version control
3. **Use HTTPS**: When hosting, always use HTTPS to protect credentials in transit
4. **Audit Trail**: All operations are logged in the browser console
5. **Limited Access**: Firebase security rules restrict write access based on authentication

## Troubleshooting

### "Connection Failed"
- Verify Firebase configuration is correct
- Check that `databaseURL` is included
- Ensure Firebase project has Realtime Database enabled
- Verify Anonymous Authentication is enabled in Firebase Console

### "No users found in database"
- Check database path is `data/diversey_users`
- Verify users exist in Firebase Console
- Ensure Anonymous Auth has read permissions

### "Failed to reset password"
- Check Firebase security rules allow write access
- Verify user structure matches expected format
- Check browser console for detailed error messages

## Support

For issues or questions, contact the system administrator or refer to the main repository documentation.
