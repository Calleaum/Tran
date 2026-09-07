import { useEffect } from 'react';
import { playHover, playClick, playAcceptFriend } from '../sound';
import { SocialPlayer, STATUS_LABEL } from '../social/socialData';
import { useSocial } from '../social/useSocial';
import { useChat } from '../chat/ChatContext';
import { PlayerAvatar } from '../components/PlayerAvatar';

interface SocialScreenProps {
  user: { id: string; username: string; email: string; avatar?: string | null };
  onBack: () => void;
}

export function SocialScreen({ user, onBack }: SocialScreenProps) {
  const social = useSocial(user.id);
  const { openDm, dmThreads, blockPlayer, unblockPlayer, blockedPlayers, isOnline } = useChat();

  // La présence arrive par le socket : on rafraîchit l'affichage des amis
  // avec l'état en ligne le plus récent connu du contexte de chat.
  const friends: SocialPlayer[] = social.friends.map((f) => ({
    ...f,
    status: isOnline(f.id) || f.status === 'online' ? 'online' : 'offline',
  }));

  useEffect(() => {
    if (social.error) {
      const timer = window.setTimeout(() => social.clearError(), 4000);
      return () => window.clearTimeout(timer);
    }
  }, [social]);

  async function handleBlock(player: SocialPlayer) {
    await blockPlayer(player.id, player.name);
    await social.reload();
  }

  async function handleUnblock(playerId: string) {
    await unblockPlayer(playerId);
    await social.reload();
  }

  async function handleAccept(requestId: string) {
    playAcceptFriend();
    await social.acceptRequest(requestId);
  }

  return (
    <div className="submenu-screen submenu-screen--wide">
      <button className="ghost-btn submenu-back" onMouseEnter={playHover} onClick={onBack}>← Retour au menu</button>
      <h2 className="submenu-title">Social</h2>

      <div className="profile-card">
        <PlayerAvatar name={user.username} avatar={user.avatar} className="profile-card__avatar" />
        <div className="profile-card__info">
          <span className="profile-card__name">{user.username}</span>
          <span className="profile-card__email">{user.email}</span>
        </div>
      </div>

      {social.error && <p className="form-error">{social.error}</p>}
      {social.loading && <p className="placeholder-note">Chargement…</p>}

      <div className="social-columns">
        <div className="social-column">
          <h3 className="social-column__title">Mes amis ({friends.length})</h3>
          {!social.loading && friends.length === 0 && (
            <p className="placeholder-note">Tu n'as pas encore d'amis ajoutés.</p>
          )}
          <ul className="social-list">
            {friends.map((friend) => (
              <li key={friend.id} className="social-row">
                <PlayerAvatar
                  name={friend.name}
                  avatar={friend.avatar}
                  className={`social-row__avatar social-row__avatar--${friend.status}`}
                />
                <div className="social-row__info">
                  <span className="social-row__name">{friend.name}</span>
                  <span className="social-row__status">{STATUS_LABEL[friend.status]}</span>
                </div>
                <div className="social-row__actions">
                  <button
                    className="ghost-btn ghost-btn--small"
                    onMouseEnter={playHover}
                    onClick={() => openDm(friend.id, friend.name)}
                  >
                    {dmThreads[friend.id] ? 'Discuter' : 'Parler'}
                  </button>
                  <button
                    className="ghost-btn ghost-btn--small ghost-btn--danger"
                    onMouseEnter={playHover}
                    onClick={() => handleBlock(friend)}
                  >
                    Bloquer
                  </button>
                  <button
                    className="ghost-btn ghost-btn--small"
                    onMouseEnter={playHover}
                    onClick={() => { playClick(); void social.removeFriend(friend.id); }}
                  >
                    Retirer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="social-column">
          <h3 className="social-column__title">Demandes reçues ({social.incoming.length})</h3>
          {social.incoming.length === 0 ? (
            <p className="placeholder-note">Aucune demande en attente.</p>
          ) : (
            <ul className="social-list">
              {social.incoming.map(({ requestId, player }) => (
                <li key={requestId} className="social-row">
                  <PlayerAvatar
                    name={player.name}
                    avatar={player.avatar}
                    className="social-row__avatar social-row__avatar--offline"
                  />
                  <div className="social-row__info">
                    <span className="social-row__name">{player.name}</span>
                    <span className="social-row__status">Souhaite t'ajouter</span>
                  </div>
                  <div className="social-row__actions">
                    <button
                      className="primary-btn primary-btn--small"
                      onMouseEnter={playHover}
                      onClick={() => void handleAccept(requestId)}
                    >
                      Accepter
                    </button>
                    <button
                      className="ghost-btn ghost-btn--small"
                      onMouseEnter={playHover}
                      onClick={() => { playClick(); void social.declineRequest(requestId); }}
                    >
                      Refuser
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <h3 className="social-column__title">Joueurs à ajouter</h3>
          {social.suggestions.length === 0 ? (
            <p className="placeholder-note">Aucun autre joueur inscrit pour le moment.</p>
          ) : (
            <ul className="social-list">
              {social.suggestions.map((player) => (
                <li key={player.id} className="social-row">
                  <PlayerAvatar
                    name={player.name}
                    avatar={player.avatar}
                    className="social-row__avatar social-row__avatar--offline"
                  />
                  <div className="social-row__info">
                    <span className="social-row__name">{player.name}</span>
                    <span className="social-row__status">Joueur inscrit</span>
                  </div>
                  <div className="social-row__actions">
                    <button
                      className="primary-btn primary-btn--small"
                      onMouseEnter={playHover}
                      onClick={() => { playClick(); void social.sendRequest(player.id); }}
                    >
                      Ajouter
                    </button>
                    <button
                      className="ghost-btn ghost-btn--small ghost-btn--danger"
                      onMouseEnter={playHover}
                      onClick={() => void handleBlock(player)}
                    >
                      Bloquer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {social.outgoing.length > 0 && (
        <div className="social-column">
          <h3 className="social-column__title">Demandes envoyées ({social.outgoing.length})</h3>
          <ul className="social-list">
            {social.outgoing.map(({ requestId, player }) => (
              <li key={requestId} className="social-row">
                <PlayerAvatar
                  name={player.name}
                  avatar={player.avatar}
                  className="social-row__avatar social-row__avatar--offline"
                />
                <div className="social-row__info">
                  <span className="social-row__name">{player.name}</span>
                  <span className="social-row__status">En attente de sa réponse</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="social-column social-column--blocked">
        <h3 className="social-column__title">Joueurs bloqués ({blockedPlayers.length})</h3>
        {blockedPlayers.length === 0 ? (
          <p className="placeholder-note">Tu n'as bloqué personne pour le moment.</p>
        ) : (
          <ul className="social-list">
            {blockedPlayers.map((player) => (
              <li key={player.id} className="social-row social-row--blocked">
                <PlayerAvatar
                  name={player.name}
                  avatar={player.avatar}
                  className="social-row__avatar social-row__avatar--offline"
                />
                <div className="social-row__info">
                  <span className="social-row__name">{player.name}</span>
                  <span className="social-row__status">Bloqué — ne peut plus te parler</span>
                </div>
                <button
                  className="ghost-btn ghost-btn--small"
                  onMouseEnter={playHover}
                  onClick={() => void handleUnblock(player.id)}
                >
                  Débloquer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
