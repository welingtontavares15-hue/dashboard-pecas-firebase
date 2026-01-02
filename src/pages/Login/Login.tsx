/**
 * Login Page Component
 * 
 * Handles user authentication with username/password
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import './Login.css';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const { user, loading, error, login, clearError } = useAuthStore();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const defaultPage = user.role === 'tecnico' ? '/minhas-solicitacoes' : '/dashboard';
      navigate(defaultPage);
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(username, password);
    } catch (err) {
      // Error is handled by the store
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <i className="fas fa-tools"></i>
          <h1>Diversey</h1>
          <div className="login-slogan">A Solenis Company</div>
          <p>Dashboard de Solicitações de Peças</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Usuário</label>
            <input
              type="text"
              id="username"
              className="form-control"
              placeholder="Digite seu usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                className="form-control"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                disabled={loading}
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Entrando...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i> Entrar
              </>
            )}
          </button>

          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          )}
        </form>

        <div className="demo-info">
          <p><strong>Versão oficial:</strong></p>
          <p>O ambiente está pronto para uso em produção. Solicite suas credenciais ao administrador responsável.</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
            <i className="fas fa-info-circle"></i> Dados sincronizados via Firebase para garantir estabilidade e suporte.
          </p>
        </div>
      </div>
    </div>
  );
};
