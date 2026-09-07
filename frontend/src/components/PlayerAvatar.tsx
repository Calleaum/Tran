import { resolveAvatarUrl } from '../services/api';

interface PlayerAvatarProps {
  name: string;
  avatar?: string | null;
  /** Classe(s) portée(s) par le conteneur (taille, statut, etc.) — inchangées par ce composant. */
  className: string;
  /** Élément racine à rendre : 'div' par défaut, 'span' pour les usages inline existants. */
  as?: 'div' | 'span';
}

// Composant partagé par tous les écrans qui affichent un avatar de joueur
// (amis, demandes, suggestions, bloqués, sélection de tournoi...) : affiche
// la vraie photo si disponible, sinon retombe sur l'initiale du pseudo.
export function PlayerAvatar({ name, avatar, className, as = 'div' }: PlayerAvatarProps) {
  const url = resolveAvatarUrl(avatar);
  const Tag = as;

  return (
    <Tag className={className}>
      {url ? <img className="avatar-img" src={url} alt={name} /> : name.charAt(0).toUpperCase()}
    </Tag>
  );
}
