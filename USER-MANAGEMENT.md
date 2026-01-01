# User Management Tools - Diversey Dashboard

Professional user management utilities for the Diversey Dashboard Firebase application with full CRUD operations, secure password hashing, and comprehensive audit logging.

## 🎯 Overview

This implementation provides three user management tools:

1. **Standalone Password Reset Tool** (`scripts/reset-passwords.html`)
2. **Standalone Admin Interface** (`user-management.html`)
3. **Integrated Dashboard Module** (in main dashboard)

All tools use SHA-256 password hashing with salt and username for maximum security.

## 📁 Files

- `scripts/reset-passwords.html` - Standalone password reset utility
- `user-management.html` - Standalone admin interface for user management
- `js/auth.js` - Updated with "Gerenciar Usuários" menu item for administrators
- `js/app.js` - Enhanced with integrated user management module

## 🔐 Standalone Password Reset Tool

### Location
`scripts/reset-passwords.html`

### Features
- Reset individual user passwords (admin, gestor)
- Reset all user passwords at once with confirmation
- Real-time feedback with color-coded logs
- Works standalone without dashboard login
- Firebase Realtime Database integration
- SHA-256 password hashing with username-specific salts

### Usage

1. Open `scripts/reset-passwords.html` in a browser
2. Enter your Firebase configuration (JSON format)
3. Click "Connect to Firebase"
4. Choose one of:
   - **Reset Admin Password** - Reset admin user to default
   - **Reset Gestor Password** - Reset gestor user to default
   - **Reset All Passwords** - Reset ALL users (with confirmation)

### Default Passwords
- **admin**: admin123
- **gestor**: gestor123
- **tecnico**: tecnico123

### Security Notes
- Passwords are hashed using: `SHA-256(password + salt + ':' + username)`
- Salt: `diversey_salt_v1`
- Each username has a unique hash even with the same password
- Requires Firebase Realtime Database authentication

## 👥 Standalone Admin Interface

### Location
`user-management.html`

### Features
- List all users with statistics (total, active, disabled)
- Search users by name, username, or email
- Filter by role and status
- Create new users with automatic password generation
- Edit existing users
- Delete users with confirmation
- Reset passwords for any user
- View audit trail (created/updated timestamps and authors)

### Usage

1. Open `user-management.html` in a browser
2. Enter your Firebase configuration (JSON format)
3. Click "Connect to Firebase"
4. View and manage users:
   - Click **Add New User** to create
   - Click **Edit** (pencil icon) to modify
   - Click **Reset Password** (key icon) to reset
   - Click **Delete** (trash icon) to remove

### User Fields
- **Name*** (required)
- **Username*** (required, cannot be changed after creation)
- **Email** (optional)
- **Role*** (required): Administrator, Manager, or Technician
- **Technician ID** (for tecnico role)
- **Disabled** (checkbox)

## 🖥️ Integrated Dashboard Module

### Access
Only visible to administrators in the main dashboard.

### Menu Location
System → **Gerenciar Usuários**

### Features
Same as standalone interface:
- User statistics
- Search and filter
- Full CRUD operations
- Password reset
- Audit logging

### Access Control
- Menu item only appears for administrators
- Frontend check: `Auth.getRole() === 'administrador'`
- Backend check: Firebase RTDB security rules

## 🔒 Security Features

### Password Hashing
All passwords use SHA-256 hashing with username-specific salts:

```javascript
hash = SHA-256(password + 'diversey_salt_v1' + ':' + username)
```

**Example:**
- User: `admin`, Password: `admin123`
- Input: `admin123diversey_salt_v1:admin`
- Hash: `[64-character hex string]`

### Audit Logging
Every user operation is tracked:

| Field | Description |
|-------|-------------|
| `createdAt` | ISO 8601 timestamp of user creation |
| `createdBy` | Username who created the user |
| `updatedAt` | ISO 8601 timestamp of last update |
| `updatedBy` | Username who made the last update |

### Role-Based Access Control (RBAC)
- **Frontend**: Menu visibility and page access checks
- **Backend**: Firebase RTDB security rules enforce admin-only write access
- **Roles**: `administrador`, `gestor`, `tecnico`

### Firebase Security Rules
```json
{
  "data": {
    "diversey_users": {
      ".read": "auth != null",
      "$userId": {
        ".write": "auth != null && root.child('data/diversey_users/' + auth.uid + '/role').val() == 'administrador'"
      }
    }
  }
}
```

## 📊 User Roles

### Administrador (Administrator)
- Full access to all features
- Can manage users
- Can access all CRUD operations
- Can configure system settings

### Gestor (Manager)
- Approve/reject requests
- View all requests and reports
- Cannot manage users
- Cannot modify parts catalog

### Tecnico (Technician)
- Create and view own requests
- Cannot approve requests
- Limited to assigned items
- No administrative access

## 🔧 Configuration

### Firebase Configuration Format
```json
{
  "apiKey": "your-api-key",
  "authDomain": "your-project.firebaseapp.com",
  "databaseURL": "https://your-project.firebaseio.com",
  "projectId": "your-project-id",
  "storageBucket": "your-project.appspot.com",
  "messagingSenderId": "123456789",
  "appId": "your-app-id"
}
```

### Database Structure
```
data/
  diversey_users/
    {username}/
      id: string
      name: string
      username: string
      email: string
      role: string
      passwordHash: string
      disabled: boolean
      tecnicoId: string (optional)
      createdAt: ISO 8601 string
      createdBy: string
      updatedAt: ISO 8601 string
      updatedBy: string
```

## 🧪 Testing

### Manual Testing Checklist

#### Password Reset Tool
- [ ] Connect to Firebase successfully
- [ ] Reset admin password individually
- [ ] Reset gestor password individually
- [ ] Reset all passwords with confirmation
- [ ] Verify log output is clear and accurate
- [ ] Verify passwords work after reset

#### User Management (Standalone)
- [ ] Connect to Firebase successfully
- [ ] View user statistics
- [ ] Search users by name/username/email
- [ ] Filter by role
- [ ] Filter by status (active/disabled)
- [ ] Create new administrator
- [ ] Create new manager
- [ ] Create new technician
- [ ] Edit existing user
- [ ] Disable/enable user
- [ ] Reset user password
- [ ] Delete user with confirmation
- [ ] Verify audit timestamps

#### User Management (Integrated)
- [ ] Menu item only visible to admin
- [ ] Access denied for non-admin users
- [ ] All CRUD operations work
- [ ] Data syncs with Firebase
- [ ] Audit logging works
- [ ] Changes reflect in standalone tool

### Security Testing
- [ ] Non-admin users cannot access user management
- [ ] Password hashes use username-specific salt
- [ ] Audit trail is maintained for all changes
- [ ] Delete confirmation prevents accidents
- [ ] Password reset shows default password to admin
- [ ] Anonymous auth works for standalone tools

## 📝 Implementation Notes

### Password Hashing Consistency
All three tools use the same password hashing algorithm:
- Main dashboard: Uses `Auth.hashPassword()` → `Utils.hashSHA256()`
- Password reset tool: Custom `sha256()` function with same logic
- User management: Uses `Utils.hashSHA256()` directly

### Data Persistence
- **Standalone tools**: Directly interact with Firebase RTDB
- **Integrated module**: Uses `DataManager` for data operations
- **Sync**: Changes in any tool reflect immediately in others

### Best Practices
1. Always reset passwords after creating users
2. Review audit logs regularly
3. Keep Firebase configuration secure
4. Use strong passwords for production
5. Backup user data before bulk operations
6. Test in development before production use

## 🚀 Deployment

### Prerequisites
- Firebase project configured
- Realtime Database enabled
- Authentication enabled (Anonymous auth)
- Security rules deployed

### Steps
1. Deploy security rules to Firebase RTDB
2. Host files on Firebase Hosting or web server
3. Configure CORS if using standalone tools
4. Test with development environment first
5. Update Firebase config in production
6. Train administrators on usage

## 🐛 Troubleshooting

### Connection Issues
- **Error**: "Firebase configuration is empty"
  - **Solution**: Enter valid Firebase config JSON
  
- **Error**: "Connection Failed"
  - **Solution**: Check Firebase project settings and network

### Authentication Issues
- **Error**: "Auth state change error"
  - **Solution**: Enable Anonymous authentication in Firebase Console

### Permission Issues
- **Error**: "Permission denied"
  - **Solution**: Check Firebase security rules and user role

### Data Issues
- **Error**: "No users found"
  - **Solution**: Initialize default users first or check database path

## 📚 Additional Resources

- [Firebase Realtime Database Documentation](https://firebase.google.com/docs/database)
- [Firebase Security Rules](https://firebase.google.com/docs/database/security)
- [SHA-256 Hashing](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest)

## 📄 License

MIT License - Diversey Dashboard

## 👤 Author

Welington Tavares
- Email: wbastostavares@solenis.com
- Phone: 62998124727

## 🔄 Version History

### v1.0.0 (2026-01-01)
- Initial implementation
- Standalone password reset tool
- Standalone admin interface
- Integrated dashboard module
- SHA-256 password hashing with username-specific salts
- Comprehensive audit logging
- Role-based access control
