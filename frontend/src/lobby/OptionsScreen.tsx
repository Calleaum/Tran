import { useEffect, useState } from 'react';
import {
  getAudioSettings,
  subscribeAudioSettings,
  setEffectsVolume,
  setMusicVolume,
  playHover,
  playClick,
} from '../sound';

interface OptionsScreenProps {
  onBack: () => void;
}

export function OptionsScreen({ onBack }: OptionsScreenProps) {
  const [settings, setSettings] = useState(getAudioSettings());

  useEffect(() => {
    return subscribeAudioSettings(setSettings);
  }, []);

  return (
    <div className="submenu-screen">
      <button className="ghost-btn submenu-back" onMouseEnter={playHover} onClick={onBack}>← Retour au menu</button>
      <h2 className="submenu-title">Options</h2>

      <div className="options-panel">
        <div className="options-panel__row">
          <div className="options-panel__label">
            <span className="options-panel__icon">🔊</span>
            <span>Effets sonores</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(settings.effectsVolume * 100)}
            onChange={(e) => setEffectsVolume(Number(e.target.value) / 100)}
            onMouseUp={() => playClick()}
            className="options-slider"
            aria-label="Volume des effets sonores"
          />
          <span className="options-panel__value">{Math.round(settings.effectsVolume * 100)}%</span>
        </div>

        <div className="options-panel__row">
          <div className="options-panel__label">
            <span className="options-panel__icon">🎵</span>
            <span>Musique</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(settings.musicVolume * 100)}
            onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
            className="options-slider"
            aria-label="Volume de la musique"
          />
          <span className="options-panel__value">{Math.round(settings.musicVolume * 100)}%</span>
        </div>
      </div>

      <p className="placeholder-note">
        Les réglages sont sauvegardés automatiquement sur cet appareil.
      </p>
    </div>
  );
}
