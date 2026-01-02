# Firestore Rules (mínimo para funcionar)

> Objetivo: permitir que o sistema sincronize dados entre dispositivos usando **Auth anônimo** (request.auth != null).
> Depois você pode endurecer por role.

Cole em **Firebase Console → Firestore Database → Rules**:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Documentos do app (CloudStorage): data/{key}
    match /data/{key} {
      allow read, write: if request.auth != null;
    }

    // Healthcheck opcional
    match /healthcheck/{docId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Observações
- Se você deixar `allow read, write: if true;` funciona, mas é inseguro.
- O app usa **Firebase Auth anônimo** só para satisfazer as regras e sincronizar.
