import '../styles/Auth.css';
import '../styles/Privacy.css';

interface TermsPageProps {
  onBack: () => void;
}

export function TermsPage({ onBack }: TermsPageProps) {
  return (
    <div className="auth-screen">
      <div className="auth-card privacy-card">
        <span className="auth-card__suits">♠ ♥ ♣ ♦</span>
        <h1 className="auth-card__title">Conditions d'utilisation</h1>
        <p className="auth-card__subtitle">Dernière mise à jour : août 2026</p>

        <div className="privacy-content">
          <section>
            <h2>1. Objet</h2>
            <p>
              Les présentes conditions régissent l'accès et l'utilisation de
              l'application (le "Site"), une plateforme de jeu du Président
              en ligne avec fonctionnalités sociales (amis, chat, classement,
              tournois). En créant un compte, vous acceptez ces conditions.
            </p>
          </section>

          <section>
            <h2>2. Accès au service</h2>
            <p>
              L'accès à la plupart des fonctionnalités nécessite la création
              d'un compte (email, nom d'utilisateur, mot de passe). Vous êtes
              responsable de la confidentialité de vos identifiants et de
              toute activité effectuée depuis votre compte.
            </p>
          </section>

          <section>
            <h2>3. Comportement des utilisateurs</h2>
            <p>
              Vous vous engagez à utiliser le chat, les parties et les
              fonctionnalités sociales de manière respectueuse : pas de
              harcèlement, de propos haineux, de triche ou de tentative de
              contournement des mesures de sécurité du Site. Tout compte
              utilisé en violation de ces règles peut être suspendu ou
              supprimé.
            </p>
          </section>

          <section>
            <h2>4. Contenu utilisateur</h2>
            <p>
              Vous restez responsable des messages et informations que vous
              publiez (profil, chat). Le Site ne modère pas systématiquement
              ce contenu avant publication, mais se réserve le droit de
              supprimer tout contenu contraire à ces conditions.
            </p>
          </section>

          <section>
            <h2>5. Disponibilité du service</h2>
            <p>
              Le Site est fourni dans le cadre d'un projet éducatif, "en
              l'état" et sans garantie de disponibilité continue. Des
              interruptions pour maintenance ou mise à jour peuvent survenir
              sans préavis.
            </p>
          </section>

          <section>
            <h2>6. Résiliation</h2>
            <p>
              Vous pouvez cesser d'utiliser le Site et demander la
              suppression de votre compte à tout moment. Le Site peut
              suspendre ou supprimer un compte en cas de non-respect de ces
              conditions.
            </p>
          </section>

          <section>
            <h2>7. Données personnelles</h2>
            <p>
              Le traitement de vos données personnelles est détaillé dans
              notre Politique de confidentialité, qui fait partie intégrante
              de ces conditions.
            </p>
          </section>

          <section>
            <h2>8. Contact</h2>
            <p>
              Pour toute question relative à ces conditions, contactez
              l'équipe du projet via l'adresse indiquée dans les paramètres
              du compte ou le dépôt du projet.
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
