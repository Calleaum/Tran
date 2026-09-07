import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { CardModel, ServerCard, fromServerCard, toServerCard } from './cards';
import { PlayingCard } from './PlayingCard';
import { DiscardPile } from './DiscardPile';
import { RolesPanel, RankedPlayer } from './RolesPanel';
import { GameMenuOverlay } from './GameMenuOverlay';
import { ChatPanel } from '../chat/ChatPanel';
import { useChat } from '../chat/ChatContext';
import { ChatMessage } from '../chat/chatTypes';
import { getGameSocket } from '../services/socket';
import { playerService } from '../services/api';
import { ApiPlayer } from '../social/socialData';
import { playCardPlay, playPass, playHover, playClick, playGameOver, playSuccess } from '../sound';

// Pli tel qu'il arrive du serveur.
interface ServerPile {
  cards: ServerCard[];
  playedBy: string;
  count: number;
}

// État public renvoyé par `PresidentService.getPublicState` : la main du
// joueur courant, la taille des mains des autres, et rien de plus.
interface PublicState {
  playerIds: string[];
  myHand: ServerCard[];
  handSizes: Record<string, number>;
  currentPile: ServerPile | null;
  lastPiles: ServerPile[];
  passedPlayers: string[];
  currentPlayerId: string | null;
  rankings: string[];
  roundNumber: number;
  phase: 'waiting' | 'exchange' | 'playing' | 'round_end' | 'finished';
  roles: Record<string, string> | null;
  lastCompletedRound: { roundNumber: number; rankings: string[]; titles: Record<string, string> } | null;
  finalRankings: string[];
}

interface GameTableProps {
  gameId: string;
  /** Nom affiché du salon (id court de la partie). */
  roomLabel: string;
  /**
   * `reason` est renseigné quand on quitte suite à un échec (ex : partie
   * introuvable) plutôt qu'un clic volontaire sur "Quitter" — le parent
   * peut alors le réafficher sur l'écran de liste des parties.
   */
  onLeave: (reason?: string) => void;
  /** true si on regarde la partie sans y participer. */
  isSpectator?: boolean;
}

interface SocketAck {
  success?: boolean;
  error?: string;
  game?: {
    id: string;
    name?: string | null;
    playerIds: string[];
    creatorId: string;
    status: string;
    state: PublicState | null;
  };
}

export function GameTable({ gameId, roomLabel, onLeave, isSpectator = false }: GameTableProps) {
  const [state, setState] = useState<PublicState | null>(null);
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string>('Connexion à la partie…');
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatFocusPeerId, setChatFocusPeerId] = useState<string | null>(null);
  const [activeOpponent, setActiveOpponent] = useState<string | null>(null);
  const [gameMessages, setGameMessages] = useState<ChatMessage[]>([]);
  const [roomName, setRoomName] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const { me, openDm, dmThreads, isBlocked, setIsSpectating } = useChat();

  // Refs "miroir" pour pouvoir lire la valeur à jour dans le cleanup de
  // l'effet de démontage ci-dessous, sans ajouter ces valeurs à ses
  // dépendances (on ne veut PAS que cet effet se redéclenche à chaque
  // changement de gameId/isSpectator — seulement au vrai démontage).
  const gameIdRef = useRef(gameId);
  const isSpectatorRef = useRef(isSpectator);
  const hasLeftRef = useRef(false);
  gameIdRef.current = gameId;
  isSpectatorRef.current = isSpectator;

  useEffect(() => {
    setIsSpectating(isSpectator);
    return () => setIsSpectating(false);
  }, [isSpectator, setIsSpectating]);

  // Noms des joueurs : le serveur ne transmet que des ids dans l'état de jeu.
  // `names` est tenu à jour via `namesRef` pour pouvoir vérifier, dans les
  // handlers socket, si un id vient d'apparaître sans provoquer de nouvel
  // effet à chaque changement de `names`.
  const namesRef = useRef<Record<string, string>>({});
  namesRef.current = names;

  const refreshNames = useCallback(() => {
    let cancelled = false;
    playerService
      .getAll()
      .then((data) => {
        if (cancelled) return;
        const players = data as ApiPlayer[];
        setNames(Object.fromEntries(players.map((p) => [p.id, p.username])));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => refreshNames(), [refreshNames]);

  // Filet de sécurité : si un id de joueur (dans la partie ou la salle
  // d'attente) n'a pas encore de pseudo connu — typiquement un compte créé
  // après le chargement initial de `names` — on rafraîchit la liste.
  useEffect(() => {
    const allIds = new Set([...(state?.playerIds ?? []), ...playerIds]);
    const hasUnknown = Array.from(allIds).some(
      (id) => id !== me.id && !(id in namesRef.current),
    );
    if (hasUnknown) refreshNames();
  }, [state?.playerIds, playerIds, me.id, refreshNames]);

  const nameOf = useCallback(
    (userId: string) => (userId === me.id ? me.name : names[userId] ?? userId.slice(0, 8)),
    [me.id, me.name, names],
  );

  // ─── Socket de jeu ─────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getGameSocket();
    socketRef.current = socket;

    socket.emit('president:join_room', { gameId }, (ack: SocketAck) => {
      if (!ack?.success) {
        // On n'a jamais vraiment rejoint cette partie (elle est peut-être
        // introuvable, supprimée, ou héritée d'une session précédente,
        // voir ACTIVE_ROOM_KEY dans pages/Games.tsx) : pas la peine
        // d'émettre `president:leave` au démontage, et surtout on ne
        // laisse pas l'utilisateur coincé ici sans aucun bouton — on
        // repart vers la liste des parties avec le message d'erreur.
        hasLeftRef.current = true;
        onLeave(ack?.error ?? 'Impossible de rejoindre cette partie.');
        return;
      }
      setPlayerIds(ack.game?.playerIds ?? []);
      setState(ack.game?.state ?? null);
      setRoomName(ack.game?.name ?? null);
      setMessage(
        ack.game?.state
          ? 'Partie en cours.'
          : isSpectator
            ? 'Tu regardes ce salon — la partie n\'a pas encore démarré.'
            : 'En attente du démarrage de la partie.',
      );
    });

    const onStarted = (data: { gameId: string; state: PublicState }) => {
      if (data.gameId !== gameId) return;
      setState(data.state);
      setMessage('La partie commence !');
    };
    const onStateUpdated = (data: { gameId: string; state: PublicState; events?: string[] }) => {
      if (data.gameId !== gameId) return;
      setState(data.state);
      setSelected(new Set());
      if (data.events?.length) setMessage(data.events.join(' · '));
    };
    const onPlayerJoined = (data: { playerIds: string[] }) => {
      setPlayerIds(data.playerIds);
      // Le nouveau joueur peut avoir un compte créé après le premier
      // chargement de `names` : on rafraîchit pour récupérer son pseudo.
      refreshNames();
    };
    const onPlayerLeft = (data: { gameId: string; playerIds: string[] }) => {
      if (data.gameId !== gameId) return;
      setPlayerIds(data.playerIds);
    };
    const onGameMessage = (data: { gameId: string; userId: string; content: string; createdAt: string }) => {
      if (data.gameId !== gameId) return;
      const authorName = nameOf(data.userId);
      setGameMessages((prev) => [
        ...prev,
        {
          id: `${data.gameId}:${data.createdAt}:${data.userId}`,
          authorId: data.userId,
          authorName,
          text: data.content,
          timestamp: new Date(data.createdAt).getTime(),
        },
      ]);
    };
    const onFinished = (data: { gameId: string; finalRankings: string[]; titles: Record<string, string>; status?: string; endedByLeave?: boolean }) => {
      if (data.gameId !== gameId) return;
      const myTitle = data.titles[me.id];
      if (myTitle) {
        setMessage(`Partie terminée — tu finis ${myTitle}.`);
        if (myTitle === 'Président' || myTitle === 'Vice-président') playSuccess();
        else playGameOver();
      } else {
        setMessage('Partie terminée.');
      }

      if (data.status === 'cancelled' || data.endedByLeave) {
        onLeave();
      }
    };

    socket.on('president:game_started', onStarted);
    socket.on('president:state_updated', onStateUpdated);
    socket.on('president:player_joined', onPlayerJoined);
    socket.on('president:player_left', onPlayerLeft);
    socket.on('president:chat:message', onGameMessage);
    socket.on('president:game_finished', onFinished);

    return () => {
      socket.off('president:game_started', onStarted);
      socket.off('president:state_updated', onStateUpdated);
      socket.off('president:player_joined', onPlayerJoined);
      socket.off('president:player_left', onPlayerLeft);
      socket.off('president:chat:message', onGameMessage);
      socket.off('president:game_finished', onFinished);
    };
  }, [gameId, isSpectator, me.id, nameOf, refreshNames]);

  // ─── Données dérivées de l'état serveur ────────────────────────────────

  const hand: CardModel[] = useMemo(
    () => (state?.myHand ?? []).map(fromServerCard).sort((a, b) => a.rank - b.rank),
    [state],
  );

  const seatedIds = state?.playerIds ?? playerIds;
  const opponents = seatedIds
    .filter((id) => id !== me.id)
    .map((id) => ({
      id,
      name: nameOf(id),
      cardCount: state?.handSizes?.[id] ?? 0,
      isTurn: state?.currentPlayerId === id,
      passed: (state?.passedPlayers ?? []).includes(id),
      finished: (state?.rankings ?? []).includes(id),
    }));

  // Le tas affiché : les derniers plis conservés par le serveur, puis le pli en cours.
  const plays: CardModel[][] = useMemo(() => {
    if (!state) return [];
    const piles = [...(state.lastPiles ?? []), ...(state.currentPile ? [state.currentPile] : [])];
    return piles.map((pile) => pile.cards.map(fromServerCard));
  }, [state]);

  const previousRanking: RankedPlayer[] = useMemo(() => {
    const rankings = state?.lastCompletedRound?.rankings ?? [];
    return rankings.map((id) => ({ id, name: nameOf(id), isMe: id === me.id }));
  }, [state, nameOf, me.id]);

  const myTurn = !isSpectator && state?.currentPlayerId === me.id;
  const meFinished = (state?.rankings ?? []).includes(me.id);
  const selectedCards = hand.filter((c) => selected.has(c.id));
  const currentPile = state?.currentPile ?? null;

  function toggleSelect(card: CardModel) {
    if (isSpectator || !myTurn || meFinished) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(card.id)) next.delete(card.id);
      else next.add(card.id);
      return next;
    });
  }

  // La validité du coup est tranchée par le serveur (PresidentRulesService) :
  // on n'en refait pas une copie approximative côté client.
  function playCards() {
    if (isSpectator || !myTurn || selectedCards.length === 0) return;
    socketRef.current?.emit(
      'president:play',
      { gameId, cards: selectedCards.map(toServerCard) },
      (ack: SocketAck) => {
        if (ack?.success) playCardPlay();
        else setMessage(ack?.error ?? 'Coup refusé.');
      },
    );
  }

  function passTurn() {
    if (isSpectator || !myTurn || meFinished) return;
    socketRef.current?.emit('president:pass', { gameId }, (ack: SocketAck) => {
      if (ack?.success) playPass();
      else setMessage(ack?.error ?? 'Impossible de passer.');
    });
  }

  function startGame() {
    socketRef.current?.emit('president:start', { gameId }, (ack: SocketAck) => {
      if (ack?.success) playClick();
      else setMessage(ack?.error ?? 'Impossible de démarrer la partie.');
    });
  }

  function leaveGame() {
    socketRef.current?.emit('president:leave', { gameId }, (ack: SocketAck) => {
      if (ack?.success) {
        hasLeftRef.current = true;
        onLeave();
      } else {
        setMessage(ack?.error ?? 'Impossible de quitter la partie.');
      }
    });
  }

  // ─── Quitter la partie si on navigue ailleurs sans cliquer "Quitter" ────
  // Le socket de jeu est un singleton partagé par toute l'app (voir
  // services/socket.ts) : naviguer vers un autre écran (Accueil, Social...)
  // démonte GameTable SANS déconnecter le socket. Sans ce cleanup, le
  // backend ne serait jamais informé du départ : le joueur resterait dans
  // `state.playerIds`, garderait sa main, et bloquerait la partie si c'est
  // son tour. On ne le fait pas pour les spectateurs (jamais assis à la
  // table) ni si `leaveGame()` a déjà été appelé explicitement (idempotent
  // côté backend de toute façon, mais on évite l'appel réseau superflu).
  //
  // ⚠️ En dev, <React.StrictMode> (main.tsx) monte/démonte/remonte chaque
  // composant pour détecter les effets impurs. Ce cleanup s'exécute donc
  // une fois "pour de faux" juste après le montage, ce qui nous ferait
  // quitter la partie qu'on vient à peine de rejoindre. On retarde l'appel
  // réseau d'un tick et on l'annule si le composant se "remonte"
  // immédiatement (le remount StrictMode arrive dans le même flush,
  // avant que le setTimeout ne se déclenche) — un vrai démontage, lui,
  // ne sera jamais suivi d'un remount, donc l'appel part bien.
  const pendingLeaveTimeout = useRef<number | null>(null);
  useEffect(() => {
    if (pendingLeaveTimeout.current !== null) {
      window.clearTimeout(pendingLeaveTimeout.current);
      pendingLeaveTimeout.current = null;
    }
    return () => {
      if (isSpectatorRef.current || hasLeftRef.current) return;
      const socket = socketRef.current;
      const gameId = gameIdRef.current;
      pendingLeaveTimeout.current = window.setTimeout(() => {
        socket?.emit('president:leave', { gameId });
        pendingLeaveTimeout.current = null;
      }, 0);
    };
  }, []);

  function sendGameMessage(text: string) {
    const content = text.trim();
    if (!content) return;
    socketRef.current?.emit('president:chat:send', { gameId, content }, (ack: SocketAck) => {
      if (!ack?.success) setMessage(ack?.error ?? 'Impossible d\'envoyer le message.');
    });
  }

  function requestTalkTo(opponentId: string, opponentName: string) {
    if (isBlocked(opponentId)) return;
    if (!dmThreads[opponentId]) openDm(opponentId, opponentName);
    setChatFocusPeerId(opponentId);
  }

  const notStarted = !state || state.phase === 'waiting';

  return (
    <div className={`table-screen table-screen--with-panel table-screen--with-chat${isSpectator ? ' table-screen--spectator' : ''}`}>
      <div className="table-topbar">
        <button
          className="ghost-btn table-menu-btn"
          onClick={() => { playClick(); setMenuOpen(true); }}
          onMouseEnter={playHover}
          aria-label="Ouvrir le menu de partie"
        >
          ☰ Menu
        </button>
        <div className="table-room-name">
          Salon : <strong>{roomName || roomLabel}</strong>
          {isSpectator && <span className="spectator-tag">👁 Spectateur</span>}
        </div>
        <div className="table-status">{message}</div>
      </div>

      <div className="table-layout">
        <ChatPanel
          variant="game"
          focusPeerId={chatFocusPeerId}
          disabledReason={isSpectator ? 'Les spectateurs ne peuvent pas parler dans le chat.' : null}
          gameRoom={{
            label: `Salon de la partie ${roomName || roomLabel}`,
            messages: gameMessages,
            onSend: sendGameMessage,
          }}
        />

        <div className="table-felt">
          <div className="opponents-row">
            {opponents.length === 0 && (
              <p className="placeholder-note">Aucun autre joueur dans le salon pour l'instant.</p>
            )}
            {opponents.map((op) => (
              <div
                key={op.id}
                className={`opponent-frame${op.isTurn ? ' opponent-frame--turn' : ''}${activeOpponent === op.id ? ' opponent-frame--hover' : ''}`}
                onMouseEnter={() => setActiveOpponent(op.id)}
                onMouseLeave={() => setActiveOpponent(null)}
              >
                <div className="opponent__avatar">{op.name.charAt(0)}</div>
                <div className="opponent__info">
                  <span className="opponent__name">{op.name}</span>
                  <span className="opponent__count">
                    {op.cardCount} cartes{op.passed ? ' · passé' : ''}{op.finished ? ' · fini' : ''}
                  </span>
                </div>
                <div className="opponent__mini-hand" aria-hidden="true">
                  {Array.from({ length: Math.min(op.cardCount, 6) }).map((_, i) => (
                    <div
                      key={i}
                      className="pcard pcard--back pcard--tiny"
                      style={{ transform: `translateX(${i * -10}px) rotate(${(i - 2.5) * 4}deg)` }}
                    />
                  ))}
                </div>
                {!isBlocked(op.id) && (
                  <button
                    className="opponent__talk-btn"
                    onMouseEnter={playHover}
                    onClick={() => requestTalkTo(op.id, op.name)}
                  >
                    {dmThreads[op.id] ? '💬 Discuter' : '💬 Parler'}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="table-center">
            <DiscardPile plays={plays} />
          </div>

          <div className="table-rules-hint">
            {isSpectator ? (
              <span>Tu observes la table sans pouvoir y jouer.</span>
            ) : notStarted ? (
              <span>En attente du démarrage — le créateur de la partie lance la manche.</span>
            ) : meFinished ? (
              <span>Tu as fini ta main — en attente de la fin de la manche…</span>
            ) : currentPile ? (
              <span>À battre : {currentPile.count} carte(s) posée(s) par {nameOf(currentPile.playedBy)}</span>
            ) : (
              <span>Le tas est vide — pose n'importe quelle combinaison</span>
            )}
          </div>
        </div>

        <RolesPanel ranking={previousRanking} roundNumber={state?.roundNumber ?? 1} />
      </div>

      {isSpectator ? (
        <div className="hand-area hand-area--spectator">
          <p className="placeholder-note">
            Tu es en mode spectateur : tu vois la table en direct mais tu ne peux ni jouer de carte ni parler dans le chat.
          </p>
        </div>
      ) : (
        <div className="hand-area">
          {notStarted ? (
            <div className="hand-actions">
              <button className="primary-btn" onMouseEnter={playHover} onClick={startGame}>
                Démarrer la partie
              </button>
            </div>
          ) : (
            <>
              <div className="hand-cards">
                {hand.map((card, i) => (
                  <PlayingCard
                    key={card.id}
                    card={card}
                    selected={selected.has(card.id)}
                    disabled={!myTurn || meFinished}
                    onClick={() => toggleSelect(card)}
                    style={{
                      zIndex: i,
                      marginLeft: i === 0 ? 0 : -34,
                      transform: selected.has(card.id) ? 'translateY(-18px)' : undefined,
                    }}
                  />
                ))}
              </div>

              <div className="hand-actions">
                <button
                  className="ghost-btn"
                  onClick={passTurn}
                  onMouseEnter={playHover}
                  disabled={!myTurn || meFinished}
                >
                  Passer
                </button>
                <button
                  className="primary-btn"
                  onClick={playCards}
                  onMouseEnter={() => { if (myTurn && !meFinished && selectedCards.length > 0) playHover(); }}
                  disabled={!myTurn || meFinished || selectedCards.length === 0}
                >
                  Jouer {selectedCards.length > 0 ? `(${selectedCards.length})` : ''}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {menuOpen && (
        <GameMenuOverlay
          onClose={() => setMenuOpen(false)}
          onLeaveGame={leaveGame}
        />
      )}
    </div>
  );
}
