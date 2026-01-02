import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { initializeFirebase } from './services/firebase/init';
import { useAuthStore } from './stores/authStore';
import { Login } from './pages/Login';
import './App.css';

// Initialize Firebase on app load
initializeFirebase();

function App() {
  const { initializeAuth, user } = useAuthStore();

  // Initialize auth from session on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/" 
          element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} 
        />
        <Route
          path="/dashboard"
          element={
            user ? (
              <div className="placeholder-page">
                <h1>Dashboard</h1>
                <p>Em construção...</p>
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/minhas-solicitacoes"
          element={
            user ? (
              <div className="placeholder-page">
                <h1>Minhas Solicitações</h1>
                <p>Em construção...</p>
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
