import { useEffect, useRef, useState } from 'react';
import { useChat } from './ChatContext';
import { ChatMessage } from './chatTypes';
import { playClick, playHover } from '../sound';

interface ChatPanelProps {
  /** 'game' = panneau ancré à gauche pendant une partie. 'lobby' = fenêtre flottante depuis les menus. */
  variant: 'game' | 'lobby';
  onClose?: () => void;
  /** Si renseigné, la saisie est bloquée et ce message est affiché à la place (ex: spectateur). */
  disabledReason?: string | null;
  /** Bascule automatiquement sur cet onglet quand la valeur change : un id de joueur pour un DM. */
  focusPeerId?: string | null;
  /** Salon de la partie courante, visible seulement pendant un match. */
  gameRoom?: {
    label: string;
    messages: ChatMessage[];
    onSend: (text: string) => void;
  } | null;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function ChatPanel({ variant, onClose, disabledReason, focusPeerId, gameRoom }: ChatPanelProps) {
  const {
    me,
    dmThreads,
    sendDm,
    sendGlobal,
    closeDm,
    markThreadRead,
    globalMessages,
    unavailableReason,
    error,
    clearError,
  } = useChat();

  const [activeTab, setActiveTab] = useState<'global' | string>('global');
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const threads = Object.values(dmThreads);
  const activeThread = activeTab !== 'global' && activeTab !== 'game' ? dmThreads[activeTab] : null;
  const activeMessages =
    activeTab === 'game' ? gameRoom?.messages ?? [] : activeThread ? activeThread.messages : globalMessages;

  const hasGameRoom = Boolean(gameRoom);

  // Demande venue de l'extérieur (ex: bouton "Parler" sous un adversaire) :
  // on bascule directement sur cet onglet de discussion privée.
  useEffect(() => {
    if (focusPeerId) setActiveTab(focusPeerId);
  }, [focusPeerId]);

  useEffect(() => {
    if (hasGameRoom && variant === 'game') {
      setActiveTab('game');
    }
  }, [hasGameRoom, variant]);

  // Si l'onglet actif correspond à une conversation fermée, on revient sur le global.
  useEffect(() => {
    if (activeTab === 'game') {
      if (!hasGameRoom) setActiveTab('global');
      return;
    }
    if (activeTab !== 'global' && !dmThreads[activeTab]) setActiveTab('global');
  }, [activeTab, dmThreads, hasGameRoom]);

  // Ouvrir un fil vaut lecture : on remet son compteur de non-lus à zéro.
  useEffect(() => {
    if (activeThread && activeThread.unread > 0) markThreadRead(activeThread.peerId);
  }, [activeThread, markThreadRead]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [activeMessages.length, activeTab]);

  const canType = !disabledReason && (activeTab === 'global' || activeTab === 'game' || !!activeThread);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    if (activeTab === 'global') {
      sendGlobal(text);
    } else if (activeTab === 'game') {
      gameRoom?.onSend(text);
    } else if (activeThread) {
      sendDm(activeThread.peerId, text);
    }
    setDraft('');
  }

  function inputPlaceholder(): string {
    if (disabledReason) return disabledReason;
    if (activeTab === 'game') return gameRoom ? `Écrire dans ${gameRoom.label}…` : 'Salon de partie indisponible…';
    if (activeTab === 'global') return 'Écrire dans le chat global…';
    if (!activeThread) return unavailableReason;
    return `Écrire à ${activeThread.peerName}…`;
  }

  return (
    <div className={`chat-panel chat-panel--${variant}`}>
      <div className="chat-panel__header">
        <span className="chat-panel__title">💬 Chat</span>
        {onClose && (
          <button className="chat-panel__close" onClick={() => { playClick(); onClose(); }} aria-label="Fermer le chat">
            ✕
          </button>
        )}
      </div>

      <div className="chat-panel__tabs">
        {gameRoom && (
          <button
            className={`chat-panel__tab${activeTab === 'game' ? ' chat-panel__tab--active' : ''}`}
            onMouseEnter={playHover}
            onClick={() => setActiveTab('game')}
            title={gameRoom.label}
          >
            Partie
          </button>
        )}
        <button
          className={`chat-panel__tab${activeTab === 'global' ? ' chat-panel__tab--active' : ''}`}
          onMouseEnter={playHover}
          onClick={() => setActiveTab('global')}
        >
          Global
        </button>
        {threads.map((thread) => (
          <button
            key={thread.peerId}
            className={`chat-panel__tab${activeTab === thread.peerId ? ' chat-panel__tab--active' : ''}`}
            onMouseEnter={playHover}
            onClick={() => setActiveTab(thread.peerId)}
            title={thread.peerName}
          >
            {thread.peerName}
            {thread.unread > 0 && <span className="chat-panel__tab-dot" aria-hidden="true" />}
          </button>
        ))}
      </div>

      {error && (
        <div className="chat-panel__error" onClick={clearError} role="alert">
          {error}
        </div>
      )}

      <div className="chat-panel__messages" ref={scrollRef}>
        {activeMessages.length === 0 && (
          <p className="chat-panel__empty">
            {activeThread || activeTab === 'global' || activeTab === 'game'
              ? 'Aucun message pour l\'instant.'
              : unavailableReason}
          </p>
        )}
        {activeMessages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-panel__message${msg.system ? ' chat-panel__message--system' : ''}${!msg.system && msg.authorId === me.id ? ' chat-panel__message--me' : ''}`}
          >
            {!msg.system && (
              <div className="chat-panel__message-head">
                <span className="chat-panel__message-author">{msg.authorId === me.id ? 'Toi' : msg.authorName}</span>
                <span className="chat-panel__message-time">{formatTime(msg.timestamp)}</span>
              </div>
            )}
            <p className="chat-panel__message-text">{msg.text}</p>
          </div>
        ))}
      </div>

      {activeThread && (
        <button
          className="ghost-btn ghost-btn--small chat-panel__end-dm"
          onMouseEnter={playHover}
          onClick={() => closeDm(activeThread.peerId)}
        >
          Fermer la conversation
        </button>
      )}

      <form className="chat-panel__input-row" onSubmit={handleSend}>
        <input
          type="text"
          className="chat-panel__input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={inputPlaceholder()}
          disabled={!canType}
          maxLength={2000}
        />
        <button type="submit" className="primary-btn primary-btn--small" disabled={!canType || draft.trim().length === 0}>
          Envoyer
        </button>
      </form>
    </div>
  );
}
