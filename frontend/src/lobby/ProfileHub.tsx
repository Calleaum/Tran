import { useEffect, useRef, useState } from 'react';
import { xpService, playerService, resolveAvatarUrl } from '../services/api';

interface ProfileHubProps {
  userId: string;
  username: string;
  avatar?: string | null;
  onAvatarChange?: (avatar: string) => void;
}

// Renvoyé par `GET /xp/me` (XpService.getProfile).
interface XpProfile {
  xp: number;
  level: number;
  badges: string[];
  xpIntoLevel: number;
  xpForNextLevel: number;
}

export function ProfileHub({ userId, username, avatar, onAvatarChange }: ProfileHubProps) {
  const [profile, setProfile] = useState<XpProfile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    xpService
      .getMine()
      .then((data) => { if (!cancelled) setProfile(data as XpProfile); })
      .catch(() => { if (!cancelled) setProfile(null); });
    return () => { cancelled = true; };
  }, []);

  const xpPercent = profile
    ? Math.min(100, Math.round((profile.xpIntoLevel / profile.xpForNextLevel) * 100))
    : 0;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet de re-choisir le même fichier plus tard
    if (!file) return;

    setUploadError(null);
    setUploading(true);
    try {
      const updated = await playerService.uploadAvatar(userId, file);
      onAvatarChange?.(updated.avatar);
    } catch (err: any) {
      setUploadError(err.response?.data?.message || "Envoi de la photo impossible");
    } finally {
      setUploading(false);
    }
  };

  const avatarUrl = resolveAvatarUrl(avatar);

  return (
    <div className="profile-hub">
      <div className="profile-hub__avatar-wrap">
        <button
          type="button"
          className="profile-hub__avatar profile-hub__avatar--editable"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Changer de photo de profil"
        >
          {avatarUrl ? (
            <img className="profile-hub__avatar-img" src={avatarUrl} alt={username} />
          ) : (
            username.charAt(0).toUpperCase()
          )}
          <span className="profile-hub__avatar-edit">{uploading ? '…' : '✎'}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="profile-hub__avatar-input"
          onChange={handleFileChange}
        />
      </div>

      {uploadError && <p className="profile-hub__avatar-error">{uploadError}</p>}

      <div className="profile-hub__name">{username}</div>
      <div className="profile-hub__rank">
        {profile ? `Niveau ${profile.level}` : 'Niveau —'}
      </div>

      <div className="profile-hub__xp-bar">
        <div className="profile-hub__xp-fill" style={{ width: `${xpPercent}%` }} />
      </div>
      <div className="profile-hub__xp-label">
        {profile ? `${profile.xpIntoLevel} / ${profile.xpForNextLevel} XP` : '— XP'}
      </div>

      {profile && profile.badges.length > 0 && (
        <div className="profile-hub__awards">
          {profile.badges.map((badge) => (
            <span key={badge} className="profile-hub__award" title={badge}>{badge}</span>
          ))}
        </div>
      )}
    </div>
  );
}
