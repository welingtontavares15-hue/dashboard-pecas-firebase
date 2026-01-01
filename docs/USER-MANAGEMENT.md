# 📚 User Management Guide

## Overview

This guide explains how to use the User Management tools in the Diversey Dashboard system. The system provides comprehensive tools for managing user accounts, resetting passwords, and maintaining system security.

## 🔐 Password Reset Tool

### Standalone Password Reset

The standalone password reset tool (`scripts/reset-user-passwords.html`) allows administrators to quickly reset user passwords when needed.

#### Features:
- Reset individual admin password
- Reset individual gestor password
- Reset all users at once (admin, gestor, and técnicos)
- Real-time logging of operations
- Secure SHA-256 password hashing

#### How to Use:

1. **Open the Tool**
   - Navigate to: `scripts/reset-user-passwords.html` in your browser
   - Or access it directly from the file system

2. **Reset Admin Password**
   - Click "Resetar Admin" button
   - Default credentials will be: `admin` / `admin123`
   - Check the log for confirmation

3. **Reset Gestor Password**
   - Click "Resetar Gestor" button
   - Default credentials will be: `gestor` / `gestor123`
   - Check the log for confirmation

4. **Reset All Users**
   - Click "Resetar TODOS" button
   - Confirm the action in the dialog
   - All users will be reset to their default passwords:
     - Admin: `admin123`
     - Gestor: `gestor123`
     - Técnico: `tecnico123`

#### Default Password Hashes:

The tool uses pre-computed SHA-256 hashes for security:
- `admin123`: `240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9`
- `gestor123`: `8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918`
- `tecnico123`: `ee26b0dd4af7e749aa1a8ee3c10ae9923f618980772e473f8819a5d4940e0db2`

#### Security Notes:
- ⚠️ This tool should only be used by system administrators
- ⚠️ All password resets are logged with timestamp
- ⚠️ Users should change their passwords immediately after reset
- ⚠️ Keep this tool secure and limit access

---

## 👥 User Management Interface

### Accessing the Interface

1. Login as an administrator
2. Navigate to the sidebar menu
3. Click on "Gerenciar Usuários" (User Management)

### Dashboard Overview

The user management dashboard provides:

#### Statistics Cards:
- **Total Users**: Active users in the system
- **Administrators**: Count of admin users
- **Gestores**: Count of manager users
- **Técnicos**: Count of technician users

#### Filters:
- **Profile Filter**: Filter by role (admin, gestor, técnico)
- **Status Filter**: Filter by active/inactive status
- **Search**: Search by name, username, or email

---

## 📝 Managing Users

### Creating a New User

1. Click the "Novo Usuário" (New User) button
2. Fill in the required information:
   - **Username**: Alphanumeric, underscores, and hyphens only (required)
   - **Full Name**: User's complete name (required)
   - **Email**: Optional but recommended
   - **Profile**: Select role (administrador, gestor, or técnico)
   - **Password**: Minimum 6 characters (required)

3. Optional: Click "Gerar Senha Segura" to generate a secure password
4. Click "Salvar" to create the user

#### Password Generation:
- The system can generate secure 12-character passwords
- Generated passwords include uppercase, lowercase, numbers, and special characters
- Copy the generated password immediately and share securely with the user

### Editing an Existing User

1. Find the user in the table
2. Click the edit icon (✏️) in the Actions column
3. Modify the desired fields
4. Leave password blank to keep the current password
5. Click "Salvar" to save changes

#### Audit Information:
When editing, you'll see:
- Created by: Who created the user
- Created at: When the user was created
- Last update: When the user was last modified
- Updated by: Who made the last modification

### Resetting a User's Password

1. Find the user in the table
2. Click the key icon (🔑) in the Actions column
3. Enter the new password (minimum 6 characters)
4. Confirm the action
5. Share the new password securely with the user

### Activating/Deactivating Users

1. Find the user in the table
2. Click the check/ban icon in the Actions column
3. Confirm the action
4. Deactivated users cannot log in but are retained in the system

### Deleting Users

1. Find the user in the table
2. Click the trash icon (🗑️) in the Actions column
3. Confirm the deletion
4. This is a soft delete - the user is marked as disabled

⚠️ **Important Notes:**
- You cannot delete the last administrator
- You cannot delete or deactivate your own account
- Deleted users are marked as disabled, not permanently removed

---

## 🔒 Security Features

### Password Policy

- **Minimum Length**: 6 characters
- **Hashing**: All passwords are hashed using SHA-256 with salt
- **Never Stored**: Plain text passwords are never stored in the database
- **Change on First Use**: Users should change default passwords immediately

### Username Requirements

- Alphanumeric characters only (a-z, A-Z, 0-9)
- Underscores (_) and hyphens (-) allowed
- No spaces or special characters
- Case-insensitive (converted to lowercase)

### Role-Based Access Control (RBAC)

#### Administrator (administrador):
- Full system access
- Can manage all users
- Can access all features
- Cannot delete the last admin account

#### Manager (gestor):
- View-only access to most features
- Can approve/reject requests
- Cannot manage users (except viewing)

#### Technician (técnico):
- Can create and view their own requests
- Limited dashboard access
- Cannot access administrative features

### Audit Logging

All user management actions are logged:
- User creation
- User updates
- Password resets
- Status changes (activate/deactivate)
- Deletions

Logs include:
- Action performed
- Who performed the action
- Timestamp
- Changes made (before/after)

---

## 📤 Exporting User Data

### Export to CSV

1. Click the "Exportar" (Export) button
2. A CSV file will be downloaded with user information
3. File includes: ID, Username, Name, Email, Role, Status, Created date

### CSV Format:
```csv
"ID","Username","Nome","Email","Perfil","Status","Criado em"
"user_123","john.doe","John Doe","john@example.com","tecnico","Ativo","01/01/2024 10:00:00"
```

---

## 🔧 Troubleshooting

### Common Issues

#### Cannot Create User - "Username already exists"
- **Solution**: Choose a different username. Usernames must be unique.

#### Cannot Delete User - "Cannot remove last administrator"
- **Solution**: Create another administrator first, then delete the user.

#### Password Reset Not Working
- **Solution**: 
  1. Ensure minimum 6 characters
  2. Try the standalone reset tool if the interface fails
  3. Check browser console for errors

#### User Cannot Login After Creation
- **Possible Causes**:
  1. User account is disabled - check status
  2. Wrong password - use the reset tool
  3. Firebase sync delay - wait a moment and try again

#### "Permission Denied" Error
- **Solution**: Only administrators can access user management. Verify your role.

### Firebase Connection Issues

If the system cannot connect to Firebase:
1. Check internet connection
2. Verify Firebase configuration in `js/firebase-init.js`
3. Ensure Firebase Realtime Database rules allow authenticated access
4. Check browser console for specific errors

---

## 📊 Best Practices

### Password Management

1. **Use Strong Passwords**
   - Use the password generator for maximum security
   - Minimum 12 characters recommended
   - Include mix of characters

2. **Regular Updates**
   - Encourage users to change passwords regularly
   - Reset passwords for inactive accounts
   - Change default passwords immediately

3. **Secure Distribution**
   - Never send passwords via email
   - Use secure channels (encrypted messaging)
   - Consider one-time passwords

### User Account Management

1. **Principle of Least Privilege**
   - Assign the minimum role needed
   - Most users should be técnicos
   - Limit administrator accounts

2. **Regular Audits**
   - Review user list monthly
   - Deactivate unused accounts
   - Verify role assignments

3. **Documentation**
   - Keep records of who has which access
   - Document password resets
   - Note account deactivations

### System Administration

1. **Backup Administrators**
   - Always maintain at least 2 active admins
   - Never leave system with only 1 admin

2. **Emergency Access**
   - Keep the standalone reset tool accessible
   - Document emergency procedures
   - Test recovery procedures

3. **Monitoring**
   - Check audit logs regularly
   - Watch for unusual activity
   - Review failed login attempts

---

## 🆘 Support

### Getting Help

If you encounter issues not covered in this guide:

1. **Check Logs**: Review browser console for errors
2. **Test Reset Tool**: Try the standalone password reset tool
3. **Firebase Console**: Check Firebase console for database issues
4. **Contact Admin**: Reach out to the system administrator

### Technical Support Checklist

When reporting issues, provide:
- [ ] Browser and version
- [ ] Steps to reproduce the issue
- [ ] Error messages from console
- [ ] Screenshot of the problem
- [ ] User role and permissions
- [ ] Recent actions performed

---

## 📋 Quick Reference

### Keyboard Shortcuts

- **ESC**: Close modals
- **Ctrl/Cmd + F**: Focus search (when in filters)

### Status Indicators

- 🟢 **Green**: Active user
- ⚪ **Gray**: Inactive/Disabled user

### Action Icons

- ✏️ **Edit**: Modify user details
- 🔑 **Key**: Reset password
- ✓/🚫 **Check/Ban**: Toggle active status
- 🗑️ **Trash**: Delete user

### Default Credentials (After Reset)

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Gestor | gestor | gestor123 |
| Técnico | (varies) | tecnico123 |

---

## 🔄 Version History

### Version 1.0 (Current)
- Initial release of user management system
- Standalone password reset tool
- Full CRUD operations for users
- Audit logging
- CSV export functionality
- Role-based access control

---

## 📝 Notes

- All timestamps are in local browser timezone
- Password hashes use SHA-256 with application-specific salt
- User data is stored in Firebase Realtime Database
- Changes sync across all connected devices
- Offline functionality is limited to viewing cached data

---

**Last Updated**: January 2026  
**Version**: 1.0  
**Maintained By**: Diversey System Administrators
