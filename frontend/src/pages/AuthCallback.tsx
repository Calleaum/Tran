import { useEffect, useRef, useState } from 'react';
import { authService } from '../services/authService';

interface AuthCallbackProps {
  onSuccess: () => void;
  onFailure: () => void;
}

// Page de retour du flux OAuth 42 : le backend nous redirige ici avec soit
// ?token=... (succès), soit rien (échec, voir auth.controller.ts). On stocke
// le token puis on laisse App.tsx rafraîchir l'utilisateur et naviguer.
export function AuthCallback({ onSuccess, onFailure }: AuthCallbackProps) {
  const [error, setError] = useState(false);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setError(true);
      onFailure();
      return;
    }

    authService.completeFortyTwoLogin(token);
    onSuccess();
  }, [onSuccess, onFailure]);

  return (
    <div className="app-loading">
      <span className="app-loading__suit">♠</span>
      <p>{error ? 'Connexion 42 impossible, redirection...' : 'Connexion en cours...'}</p>
    </div>
  );
}
