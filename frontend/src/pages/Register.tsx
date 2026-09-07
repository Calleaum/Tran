import { useState } from 'react';
import { authService } from '../services/authService';
import { playHover, playClick } from '../sound';
import '../styles/Auth.css';

interface RegisterProps {
  onSuccess: (user: any) => void;
  onLoginClick: () => void;
  onPrivacyClick: () => void;
  onTermsClick: () => void;
}

export function Register({ onSuccess, onLoginClick, onPrivacyClick, onTermsClick }: RegisterProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.register(email, username, password);
      playClick();
      onSuccess(result.user);
    } catch (err: any) {
      setError(err.response?.data?.message || "L'inscription a échoué");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <span className="auth-card__suits">♠ ♥ ♣ ♦</span>
        <h1 className="auth-card__title">Rejoindre la table</h1>
        <p className="auth-card__subtitle">Crée ton compte pour jouer au Président</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              className="auth-input"
              type="email"
              placeholder="ton@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="register-username">Pseudo</label>
            <input
              id="register-username"
              className="auth-input"
              type="text"
              placeholder="TonPseudo"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="register-password">Mot de passe</label>
            <input
              id="register-password"
              className="auth-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="register-confirm">Confirmer le mot de passe</label>
            <input
              id="register-confirm"
              className="auth-input"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? 'Création du compte...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="auth-switch">
          Déjà un compte ?{' '}
          <button
            type="button"
            className="auth-switch__link"
            onMouseEnter={playHover}
            onClick={() => { playClick(); onLoginClick(); }}
          >
            Se connecter
          </button>
        </p>

        <p className="auth-switch auth-switch--small">
          En créant un compte, tu acceptes notre{' '}
          <button
            type="button"
            className="auth-switch__link"
            onMouseEnter={playHover}
            onClick={() => { playClick(); onPrivacyClick(); }}
          >
            politique de confidentialité
          </button>
          {' '}et nos{' '}
          <button
            type="button"
            className="auth-switch__link"
            onMouseEnter={playHover}
            onClick={() => { playClick(); onTermsClick(); }}
          >
            conditions d'utilisation
          </button>
          .
        </p>
      </div>
    </div>
  );
}
