import { useEffect, useState } from 'react';
import { xpService } from '../services/api';

interface ProfileHubProps {
  username: string;
}

// Renvoyé par `GET /xp/me` (XpService.getProfile).
interface XpProfile {
  xp: number;
  level: number;
  badges: string[];
  xpIntoLevel: number;
  xpForNextLevel: number;
}

export function ProfileHub({ username }: ProfileHubProps) {
  const [profile, setProfile] = useState<XpProfile | null>(null);

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

  return (
    <div className="profile-hub">
      <div className="profile-hub__avatar-wrap">
        <div className="profile-hub__avatar">{username.charAt(0).toUpperCase()}</div>
      </div>

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
