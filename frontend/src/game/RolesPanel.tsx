export type RoleId = 'president' | 'vice-president' | 'neutral' | 'vice-trouduc' | 'trouduc';

export interface RankedPlayer {
  id: string;
  name: string;
  isMe: boolean;
}

interface RolesPanelProps {
  // Classement de la manche précédente, du meilleur (Président) au pire
  // (Trouduc). Vide tant qu'aucune manche n'a été terminée (ex: tour 1).
  ranking: RankedPlayer[];
  roundNumber: number;
}

// Libellés affichés du meilleur au moins bon rang. Le nombre de rôles
// nommés dépend du nombre de joueurs ; au-delà, les joueurs du milieu
// restent "Neutre".
function roleLabelFor(index: number, total: number): string {
  if (index === 0) return 'Président';
  if (index === total - 1 && total > 1) return 'Trouduc';
  if (index === 1 && total >= 4) return 'Vice-Président';
  if (index === total - 2 && total >= 4) return 'Vice-Trouduc';
  return 'Neutre';
}

function roleClassFor(index: number, total: number): string {
  if (index === 0) return 'roles-panel__row--president';
  if (index === total - 1 && total > 1) return 'roles-panel__row--trouduc';
  if (index === 1 && total >= 4) return 'roles-panel__row--vice-president';
  if (index === total - 2 && total >= 4) return 'roles-panel__row--vice-trouduc';
  return '';
}

export function RolesPanel({ ranking, roundNumber }: RolesPanelProps) {
  return (
    <aside className="roles-panel">
      <div className="roles-panel__header">
        <span className="roles-panel__title">Manche {roundNumber}</span>
        <span className="roles-panel__subtitle">Classement précédent</span>
      </div>

      {ranking.length === 0 ? (
        <div className="roles-panel__empty">
          Personne n'a encore de rôle — c'est la première manche !
        </div>
      ) : (
        <ul className="roles-panel__list">
          {ranking.map((player, idx) => (
            <li
              key={player.id}
              className={`roles-panel__row ${roleClassFor(idx, ranking.length)}${player.isMe ? ' roles-panel__row--me' : ''}`}
            >
              <span className="roles-panel__rank">{idx + 1}</span>
              <div className="roles-panel__info">
                <span className="roles-panel__name">{player.name}{player.isMe ? ' (toi)' : ''}</span>
                <span className="roles-panel__role">{roleLabelFor(idx, ranking.length)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
