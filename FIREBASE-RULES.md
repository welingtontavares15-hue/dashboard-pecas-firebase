# Firebase Security Rules Reference

## Overview
This document provides Firebase Realtime Database security rules for the Dashboard de Solicitação de Peças application, implementing minimum privilege principle and RBAC.

## Security Principles
1. **Minimum Privilege**: Users can only access what they need
2. **Server-side Validation**: All critical validations happen on the server
3. **No Client-side Trust**: Never trust client data without validation
4. **Audit Trail**: All changes are logged with user and timestamp

## User Roles
- **admin**: Full access to all data
- **gestor**: Can view all requests, approve/reject in their region
- **tecnico**: Can create and view their own requests only

## Security Rules Template

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    
    "requests": {
      ".indexOn": ["status", "createdAt", "tecnicoId", "region"],
      
      "$requestId": {
        ".read": "auth != null && (
          root.child('users/' + auth.uid + '/role').val() === 'administrador' ||
          root.child('users/' + auth.uid + '/role').val() === 'gestor' ||
          (root.child('users/' + auth.uid + '/role').val() === 'tecnico' && 
           data.child('tecnicoId').val() === auth.uid)
        )",
        
        ".write": "auth != null && (
          root.child('users/' + auth.uid + '/role').val() === 'administrador' ||
          (root.child('users/' + auth.uid + '/role').val() === 'gestor' && 
           (newData.child('status').val() === 'aprovada' || 
            newData.child('status').val() === 'rejeitada' ||
            newData.child('status').val() === 'em-transito' ||
            newData.child('status').val() === 'entregue' ||
            newData.child('status').val() === 'finalizada')) ||
          (root.child('users/' + auth.uid + '/role').val() === 'tecnico' && 
           data.child('tecnicoId').val() === auth.uid &&
           (newData.child('status').val() === 'rascunho' || 
            newData.child('status').val() === 'pendente'))
        )",
        
        ".validate": "newData.hasChildren(['numero', 'tecnicoId', 'tecnicoNome', 'status', 'createdAt', 'audit'])",
        
        "audit": {
          "version": {
            ".validate": "newData.isNumber() && newData.val() === (data.val() || 0) + 1"
          },
          "lastUpdatedBy": {
            ".validate": "newData.isString()"
          },
          "lastUpdatedAt": {
            ".validate": "newData.isNumber() && newData.val() === now"
          }
        }
      }
    },
    
    "users": {
      ".indexOn": ["username", "role", "region"],
      
      "$userId": {
        ".read": "auth != null && (
          root.child('users/' + auth.uid + '/role').val() === 'administrador' ||
          root.child('users/' + auth.uid + '/role').val() === 'gestor' ||
          auth.uid === $userId
        )",
        
        ".write": "auth != null && root.child('users/' + auth.uid + '/role').val() === 'administrador'",
        
        ".validate": "newData.hasChildren(['id', 'username', 'name', 'role', 'email'])"
      }
    },
    
    "parts": {
      ".indexOn": ["codigo", "categoria", "status"],
      
      ".read": "auth != null",
      
      "$partId": {
        ".write": "auth != null && root.child('users/' + auth.uid + '/role').val() === 'administrador'"
      }
    },
    
    "suppliers": {
      ".indexOn": ["cnpj", "status"],
      
      ".read": "auth != null && (
        root.child('users/' + auth.uid + '/role').val() === 'administrador' ||
        root.child('users/' + auth.uid + '/role').val() === 'gestor'
      )",
      
      "$supplierId": {
        ".write": "auth != null && root.child('users/' + auth.uid + '/role').val() === 'administrador'"
      }
    },
    
    "reports": {
      ".read": "auth != null && (
        root.child('users/' + auth.uid + '/role').val() === 'administrador' ||
        root.child('users/' + auth.uid + '/role').val() === 'gestor'
      )",
      
      ".write": "auth != null && root.child('users/' + auth.uid + '/role').val() === 'administrador'"
    },
    
    "settings": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('users/' + auth.uid + '/role').val() === 'administrador'"
    },
    
    "counters": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

## Rule Explanations

### Request Rules
- **Read**: Admin can read all, Gestor can read all, Técnico can only read their own
- **Write**: 
  - Admin: Full access
  - Gestor: Can change status to approved/rejected/in-transit/delivered/finalized
  - Técnico: Can only change their own requests to draft/pending
- **Validation**: Ensures required fields are present
- **Audit**: Version must increment by 1, timestamp must be current

### User Rules
- **Read**: Admin and Gestor can read all users, Técnico can only read themselves
- **Write**: Only Admin can modify users
- **Validation**: Required fields must be present

### Parts Rules
- **Read**: All authenticated users can read
- **Write**: Only Admin can modify

### Supplier Rules
- **Read**: Admin and Gestor only
- **Write**: Only Admin

### Reports Rules
- **Read**: Admin and Gestor only
- **Write**: Only Admin (auto-generated)

### Settings Rules
- **Read**: All authenticated users
- **Write**: Only Admin

### Counters Rules
- **Read/Write**: All authenticated users (for sequential number generation)

## Testing Rules

### Using Firebase Console
1. Go to Firebase Console
2. Select project: SEU_PROJETO
3. Navigate to Realtime Database → Rules
4. Click "Rules Playground"
5. Test different scenarios with different user roles

### Test Cases

#### Test 1: Técnico Reading Own Request
```
Location: /requests/REQ-20241226-0001
Read: true
Auth: { uid: 'tech-001', role: 'tecnico' }
Data: { tecnicoId: 'tech-001' }
Expected: Allow
```

#### Test 2: Técnico Reading Other's Request
```
Location: /requests/REQ-20241226-0002
Read: true
Auth: { uid: 'tech-001', role: 'tecnico' }
Data: { tecnicoId: 'tech-002' }
Expected: Deny
```

#### Test 3: Gestor Approving Request
```
Location: /requests/REQ-20241226-0001
Write: { status: 'aprovada', approvedAt: 1703606400000 }
Auth: { uid: 'gestor-001', role: 'gestor' }
Expected: Allow
```

#### Test 4: Técnico Approving Request
```
Location: /requests/REQ-20241226-0001
Write: { status: 'aprovada' }
Auth: { uid: 'tech-001', role: 'tecnico' }
Expected: Deny
```

## Cloud Functions for Server-side Logic

### Generate Sequential Number
```javascript
exports.generateSequential = functions.database
  .ref('/requests/{requestId}')
  .onCreate(async (snapshot, context) => {
    const data = snapshot.val();
    if (data.numero) return; // Already has number
    
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const counterRef = admin.database().ref(`/counters/${date}`);
    
    const transaction = await counterRef.transaction(current => {
      return (current || 0) + 1;
    });
    
    const seq = String(transaction.snapshot.val()).padStart(4, '0');
    const numero = `REQ-${date}-${seq}`;
    
    await snapshot.ref.update({ numero });
  });
```

### Calculate Totals
```javascript
exports.calculateTotals = functions.database
  .ref('/requests/{requestId}/itens')
  .onWrite(async (change, context) => {
    const itens = change.after.val();
    if (!itens) return;
    
    const total = Object.values(itens).reduce((sum, item) => {
      return sum + (item.quantidade * item.valorUnitario || 0);
    }, 0);
    
    await change.after.ref.parent.child('totals').update({
      amount: total,
      itemsCount: Object.keys(itens).length,
      currency: 'BRL',
      calculatedAt: admin.database.ServerValue.TIMESTAMP
    });
  });
```

### Validate Status Changes
```javascript
exports.validateStatusChange = functions.database
  .ref('/requests/{requestId}/status')
  .onUpdate(async (change, context) => {
    const before = change.before.val();
    const after = change.after.val();
    
    // Valid transitions
    const validTransitions = {
      'rascunho': ['pendente'],
      'pendente': ['aprovada', 'rejeitada'],
      'aprovada': ['em-transito'],
      'em-transito': ['entregue'],
      'entregue': ['finalizada']
    };
    
    if (!validTransitions[before]?.includes(after)) {
      // Log invalid transition
      await admin.database().ref('/logs/invalid-transitions').push({
        requestId: context.params.requestId,
        from: before,
        to: after,
        timestamp: admin.database.ServerValue.TIMESTAMP
      });
      
      // Revert change
      await change.after.ref.set(before);
    }
  });
```

## Deployment

### Deploy Rules
```bash
# Deploy security rules only
firebase deploy --only database

# Deploy everything
firebase deploy
```

### Rollback Rules
```bash
# View rule history
firebase database:rules:list

# Rollback to previous version
firebase database:rules:rollback
```

## Monitoring

### Check Rule Usage
1. Go to Firebase Console
2. Realtime Database → Usage
3. Monitor read/write operations
4. Check for denied operations

### Security Alerts
Set up alerts for:
- High number of denied operations
- Unusual access patterns
- Failed authentication attempts
- Rate limit violations

## Best Practices

1. **Always Test in Staging**: Never deploy rules directly to production
2. **Use Version Control**: Keep rules in git repository
3. **Document Changes**: Add comments explaining complex rules
4. **Monitor Regularly**: Check logs for denied operations
5. **Principle of Least Privilege**: Grant minimum necessary permissions
6. **Validate Everything**: Don't trust client data
7. **Use Server Timestamp**: Always use `admin.database.ServerValue.TIMESTAMP`
8. **Index Wisely**: Add indexes for frequently queried fields

## Common Issues

### Issue: Rules too restrictive
**Solution**: Check auth state, verify role in database, test in Rules Playground

### Issue: Version mismatch in audit
**Solution**: Implement optimistic concurrency, handle conflicts gracefully

### Issue: Slow queries
**Solution**: Add appropriate indexes, avoid deep nesting

### Issue: Denied writes
**Solution**: Check user role, verify required fields, check status transition validity

## References
- [Firebase Security Rules Documentation](https://firebase.google.com/docs/database/security)
- [Firebase Security Rules Language](https://firebase.google.com/docs/rules/rules-language)
- [Best Practices](https://firebase.google.com/docs/database/security/best-practices)

---

**Last Updated**: 2024-12-26  
**Version**: 1.0
