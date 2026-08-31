import { BracketState, TournamentTable } from './bracket';

interface BracketBoardProps {
  state: BracketState;
}

function TableCard({ table }: { table: TournamentTable }) {
  const played = table.results !== null;
  const displayList = played ? table.results! : table.seats.map((s) => s.player);

  return (
    <div className={`bracket-table${played ? ' bracket-table--played' : ''}`}>
      <div className="bracket-table__header">
        Table {table.tableIndex + 1}
        {table.bracket === 'winners' && table.qualifiedCount > 0 && (
          <span className="bracket-table__qualify"> · {table.qualifiedCount} monte{table.qualifiedCount > 1 ? 'nt' : ''}</span>
        )}
      </div>
      <ul className="bracket-table__seats">
        {displayList.map((player, idx) => {
          const qualifies = table.bracket === 'winners' && played && idx < table.qualifiedCount;
          return (
            <li
              key={player?.id ?? `empty-${idx}`}
              className={[
                'bracket-seat',
                qualifies ? 'bracket-seat--qualified' : '',
                played && !qualifies && table.bracket === 'winners' ? 'bracket-seat--eliminated' : '',
              ].join(' ').trim()}
            >
              <span className="bracket-seat__rank">{played ? idx + 1 : '·'}</span>
              <span className="bracket-seat__name">{player ? player.name : 'En attente…'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RoundColumn({ title, tables }: { title: string; tables: TournamentTable[] }) {
  return (
    <div className="bracket-column">
      <div className="bracket-column__title">{title}</div>
      <div className="bracket-column__tables">
        {tables.map((t) => (
          <TableCard key={t.id} table={t} />
        ))}
      </div>
    </div>
  );
}

function winnersRoundTitle(index: number, total: number) {
  if (index === total - 1) return 'Table finale';
  if (index === total - 2) return 'Demi-tables';
  return `Tour ${index + 1}`;
}

export function BracketBoard({ state }: BracketBoardProps) {
  return (
    <div className="bracket-board">
      <div className="bracket-board__trophy">
        <span className="bracket-board__trophy-icon">🏆</span>
        <span className="bracket-board__trophy-label">
          {state.champion ? (
            <>Président du tournoi : <strong>{state.champion.name}</strong></>
          ) : (
            'Président du tournoi'
          )}
        </span>
      </div>

      <div className="bracket-board__section-label">Tableau des qualifiés</div>
      <div className="bracket-columns">
        {state.winnersRounds.map((round, idx) => (
          <RoundColumn
            key={idx}
            title={winnersRoundTitle(idx, state.winnersRounds.length)}
            tables={round}
          />
        ))}
      </div>

      {state.losersRounds.length > 0 && (
        <>
          <div className="bracket-board__section-label bracket-board__section-label--losers">
            Tableau de repêchage (éliminés d'un tour, entre eux)
          </div>
          <div className="bracket-columns bracket-columns--losers">
            {state.losersRounds.map((round, idx) => (
              <RoundColumn key={idx} title={`Repêchage ${idx + 1}`} tables={round} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
