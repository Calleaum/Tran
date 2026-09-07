import '../styles/Auth.css';
import '../styles/Privacy.css';

interface PrivacyPageProps {
  onBack: () => void;
}

export function PrivacyPage({ onBack }: PrivacyPageProps) {
  return (
    <div className="auth-screen">
      <div className="auth-card privacy-card">
        <span className="auth-card__suits">♠ ♥ ♣ ♦</span>
        <h1 className="auth-card__title">Politique de confidentialité</h1>
        <p className="auth-card__subtitle">Dernière mise à jour : août 2026</p>

        <div className="privacy-content">
          <section>
            <h2>1. Données collectées</h2>
            <p>
              Pour créer un compte et jouer, nous collectons : votre adresse
              email, votre nom d'utilisateur, un mot de passe (stocké de
              façon chiffrée, jamais en clair) et, si vous le renseignez, un
              avatar. En jouant, l'application enregistre également vos
              statistiques de partie (historique, XP, classement) et vos
              interactions sociales (amis, blocages, messages privés).
            </p>
          </section>

          <section>
            <h2>2. Finalité du traitement</h2>
            <p>
              Ces données servent uniquement au fonctionnement du site :
              authentification, affichage de votre profil et de vos
              statistiques, matchmaking, chat entre joueurs et classement.
              Elles ne sont ni vendues ni transmises à des tiers.
            </p>
          </section>

          <section>
            <h2>3. Cookies et stockage local</h2>
            <p>
              L'application n'utilise pas de cookies publicitaires. Un jeton
              de connexion (JWT) est conservé dans le stockage local de votre
              navigateur afin de maintenir votre session ; il est supprimé à
              la déconnexion.
            </p>
          </section>

          <section>
            <h2>4. Sécurité</h2>
            <p>
              Toutes les communications entre votre navigateur et nos
              serveurs (site et API) sont chiffrées via HTTPS/WSS. Les mots
              de passe sont hachés avant d'être stockés.
            </p>
          </section>

          <section>
            <h2>5. Durée de conservation</h2>
            <p>
              Vos données sont conservées tant que votre compte est actif.
              Vous pouvez demander la suppression de votre compte et des
              données associées à tout moment.
            </p>
          </section>

          <section>
            <h2>6. Vos droits</h2>
            <p>
              Conformément au RGPD, vous disposez d'un droit d'accès, de
              rectification et de suppression de vos données. Pour exercer
              ces droits, contactez l'équipe du projet via l'adresse indiquée
              dans les paramètres du compte ou le dépôt du projet.
            </p>
          </section>
        </div>

        <button type="button" className="auth-switch__link privacy-back" onClick={onBack}>
          ← Retour
        </button>
      </div>
    </div>
  );
}
