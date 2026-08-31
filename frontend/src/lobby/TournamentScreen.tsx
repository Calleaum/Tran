import { useState } from 'react';
import { CreateTournament } from '../tournament/CreateTournament';
import { BracketBoard } from '../tournament/BracketBoard';
import { BracketState, TournamentPlayer, createTournament, isTournamentOver } from '../tournament/bracket';
import { playHover, playClick } from '../sound';

interface TournamentScreenProps {
  onBack: () => void;
}

type View = 'empty' | 'create' | 'board';

export function TournamentScreen({ onBack }: TournamentScreenProps) {
  const [view, setView] = useState<View>('empty');
  const [bracket, setBracket] = useState<BracketState | null>(null);

  function handleCreate(players: TournamentPlayer[], tableSize: number) {
    playClick();
    setBracket(createTournament(players, tableSize));
    setView('board');
  }

  if (view === 'create') {
    return <CreateTournament onBack={() => setView('empty')} onCreate={handleCreate} />;
  }

  if (view === 'board' && bracket) {
    const over = isTournamentOver(bracket);
    return (
      <div className="submenu-screen submenu-screen--wide">
        <div className="tourney-board-topbar">
          <button className="ghost-btn" onMouseEnter={playHover} onClick={onBack}>← Retour au menu</button>
          <button
            className="ghost-btn"
            onMouseEnter={playHover}
            onClick={() => { playClick(); setBracket(null); setView('empty'); }}
          >
            Nouveau tournoi
          </button>
        </div>
        <h2 className="submenu-title">
          Tournoi — {bracket.playerCount} joueurs, tables de {bracket.tableSize}
        </h2>

        {!over && (
          <p className="placeholder-note tourney-board-action">
            Les tables se rempliront avec les résultats des vraies parties.
            Le tournoi n'a pas encore de module côté serveur : le tableau
            reste donc local à cet écran et n'avance pas tout seul.
          </p>
        )}

        <BracketBoard state={bracket} />
      </div>
    );
  }

  return (
    <div className="submenu-screen">
      <button className="ghost-btn submenu-back" onMouseEnter={playHover} onClick={onBack}>← Retour au menu</button>
      <h2 className="submenu-title">Tournois</h2>

      <div className="empty-state">
        <span className="empty-state__icon">♛</span>
        <p>Aucun tournoi ouvert pour le moment.</p>
        <button
          className="primary-btn"
          onMouseEnter={playHover}
          onClick={() => { playClick(); setView('create'); }}
        >
          Créer un tournoi
        </button>
      </div>

      <p className="placeholder-note">
        Le tableau se construit à partir des joueurs réellement inscrits.
        Les tournois ne sont pas encore persistés côté serveur.
      </p>
    </div>
  );
}
