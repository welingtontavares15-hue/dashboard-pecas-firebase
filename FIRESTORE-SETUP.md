# Firestore Setup (passo a passo rápido)

1. Firebase Console → **Build → Firestore Database**
2. Criar banco (modo Production é ok; regras você ajusta depois)
3. Em **Authentication → Sign-in method**:
   - Ativar **Anonymous**
4. Em **Firestore → Rules**:
   - Cole as regras do arquivo `FIRESTORE-RULES.md`
5. Abrir no navegador:
   - `firebase-healthcheck.html` e validar status **OK**

Pronto. O sistema já sincroniza via Firestore.
