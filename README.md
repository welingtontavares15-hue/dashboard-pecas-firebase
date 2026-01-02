# Dashboard de Solicitações de Peças - Diversey

> Modern PWA for parts requisition management with real-time Firebase synchronization

**Version 2.0** - Complete rewrite with React, TypeScript, and modern tooling

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or 20+
- npm or yarn
- Modern web browser

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

The app will be available at `http://localhost:5173`.

---

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build optimized production bundle |
| `npm test` | Run tests with Vitest |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript type checking |

---

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **Routing**: React Router v6
- **Database**: Firebase Realtime Database v11
- **Authentication**: Firebase Auth + Custom User DB
- **Testing**: Vitest + React Testing Library
- **CI/CD**: GitHub Actions

---

## 🔐 Authentication

The application uses custom authentication built on Firebase:

1. Firebase Anonymous Auth (required for RTDB rules)
2. Custom User Database with SHA-256 password hashing
3. Role-Based Access Control: `administrador`, `gestor`, `tecnico`

---

## 🔥 Firebase Configuration

Create `.env.local`:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

---

## 🚢 Deployment

```bash
npm run build
firebase deploy --only hosting
```

---

## 📝 License

MIT License

**Developed for Diversey - A Solenis Company**
