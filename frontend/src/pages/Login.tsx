import { useState } from 'react';
import { authService } from '../services/authService';
import { playHover, playClick } from '../sound';
import '../styles/Auth.css';

interface LoginProps {
  onSuccess: (user: any) => void;
  onRegisterClick: () => void;
  onPrivacyClick: () => void;
  onTermsClick: () => void;
}

export function Login({ onSuccess, onRegisterClick, onPrivacyClick, onTermsClick }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authService.login(email, password);
      playClick();
      onSuccess(result.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Connexion impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <span className="auth-card__suits">♠ ♥ ♣ ♦</span>
        <h1 className="auth-card__title">Bon retour</h1>
        <p className="auth-card__subtitle">Connecte-toi pour rejoindre la table</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className="auth-input"
              type="email"
              placeholder="ton@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Mot de passe</label>
            <input
              id="login-password"
              className="auth-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="auth-error">⚠ {error}</p>}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
            onMouseEnter={playHover}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="auth-divider">
          <span>ou</span>
        </div>

        <button
          type="button"
          className="auth-submit auth-submit--42"
          onMouseEnter={playHover}
          onClick={() => { playClick(); authService.redirectToFortyTwoLogin(); }}
        >
          Se connecter avec 42
        </button>

        <p className="auth-switch">
          Pas encore de compte ?{' '}
          <button
            type="button"
            className="auth-switch__link"
            onMouseEnter={playHover}
            onClick={() => { playClick(); onRegisterClick(); }}
          >
            Créer un compte
          </button>
        </p>

        <p className="auth-switch">
          <button
            type="button"
            className="auth-switch__link"
            onMouseEnter={playHover}
            onClick={() => { playClick(); onPrivacyClick(); }}
          >
            Politique de confidentialité
          </button>
          {' · '}
          <button
            type="button"
            className="auth-switch__link"
            onMouseEnter={playHover}
            onClick={() => { playClick(); onTermsClick(); }}
          >
            Conditions d'utilisation
          </button>
        </p>
      </div>
    </div>
  );
}
