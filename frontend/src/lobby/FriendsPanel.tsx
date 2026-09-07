import { useState } from 'react';
import { SocialPlayer, STATUS_LABEL } from '../social/socialData';
import { PlayerProfileModal } from '../chat/PlayerProfileModal';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { useChat } from '../chat/ChatContext';
import { playHover, playClick } from '../sound';

interface FriendsPanelProps {
  friends: SocialPlayer[];
  loading: boolean;
  onOpenSocial: () => void;
  onOpenChatWith: (peerId: string, peerName: string) => void;
}

const VISIBLE_COUNT = 5;

export function FriendsPanel({ friends, loading, onOpenSocial, onOpenChatWith }: FriendsPanelProps) {
  const [viewingProfile, setViewingProfile] = useState<SocialPlayer | null>(null);
  const { openDm, dmThreads } = useChat();

  const visibleFriends = friends.slice(0, VISIBLE_COUNT);
  const hasMore = friends.length > VISIBLE_COUNT;

  function talkTo(player: SocialPlayer) {
    if (!dmThreads[player.id]) {
      openDm(player.id, player.name);
    }
    onOpenChatWith(player.id, player.name);
  }

  return (
    <div className="friends-panel">
      <div className="friends-panel__header">
        <span className="friends-panel__title">Amis</span>
        <button
          className="ghost-btn ghost-btn--small"
          onMouseEnter={playHover}
          onClick={() => { playClick(); onOpenSocial(); }}
        >
          Gérer
        </button>
      </div>

      {loading ? (
        <p className="placeholder-note friends-panel__empty">Chargement…</p>
      ) : friends.length === 0 ? (
        <p className="placeholder-note friends-panel__empty">Aucun ami pour l'instant.</p>
      ) : (
        <ul className="friends-panel__list">
          {visibleFriends.map((friend) => (
            <li key={friend.id} className="friends-panel__row">
              <button
                className="friends-panel__identity"
                onMouseEnter={playHover}
                onClick={() => { playClick(); setViewingProfile(friend); }}
              >
                <PlayerAvatar
                  as="span"
                  name={friend.name}
                  avatar={friend.avatar}
                  className={`social-row__avatar social-row__avatar--small social-row__avatar--${friend.status}`}
                />
                <span className="friends-panel__name">{friend.name}</span>
              </button>
              <span className="friends-panel__status" title={STATUS_LABEL[friend.status]}>
                {friend.status === 'online' ? '🟢' : '⚪'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <button className="ghost-btn ghost-btn--small friends-panel__more" onMouseEnter={playHover} onClick={() => { playClick(); onOpenSocial(); }}>
          Voir plus ({friends.length})
        </button>
      )}

      {viewingProfile && (
        <PlayerProfileModal
          player={viewingProfile}
          onClose={() => setViewingProfile(null)}
          onTalk={() => { talkTo(viewingProfile); setViewingProfile(null); }}
        />
      )}
    </div>
  );
}
