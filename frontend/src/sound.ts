// Système audio du jeu : effets sonores courts + musiques de fond en boucle.
// Tous les fichiers sont de vrais mp3 dans /public/sounds/ (servi tel quel
// par Vite). Les réglages de volume (effets / musique) sont persistés en
// localStorage pour survivre à un rechargement de page.

const SOUND_PATHS = {
  hover: '/sounds/Hover V2.mp3',
  click: '/sounds/Click V2.mp3',
  cardPlay: '/sounds/Card Play V2.mp3',
  pass: '/sounds/Pass V2.mp3',
  success: '/sounds/Win V2.mp3',
  gameOver: '/sounds/Game Over V2.mp3',
  writeScore: '/sounds/Write Score V2.mp3',
  acceptFriend: '/sounds/Accept Friends Request V2.mp3',
} as const;

type SoundKey = keyof typeof SOUND_PATHS;

const MUSIC_PATHS = {
  menu: '/sounds/Main Menu Music V2.mp3',
  game: '/sounds/Game Music V2.mp3',
} as const;

type MusicKey = keyof typeof MUSIC_PATHS;

// ---------------------------------------------------------------------
// Réglages de volume (persistés en localStorage)
// ---------------------------------------------------------------------

const STORAGE_KEY = 'president:audio-settings';

interface AudioSettings {
  effectsVolume: number; // 0 à 1
  musicVolume: number; // 0 à 1
}

const DEFAULT_SETTINGS: AudioSettings = {
  effectsVolume: 0.5,
  musicVolume: 0.05,
};

function loadSettings(): AudioSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      effectsVolume: typeof parsed.effectsVolume === 'number' ? parsed.effectsVolume : DEFAULT_SETTINGS.effectsVolume,
      musicVolume: typeof parsed.musicVolume === 'number' ? parsed.musicVolume : DEFAULT_SETTINGS.musicVolume,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

let settings: AudioSettings = loadSettings();
const listeners = new Set<(settings: AudioSettings) => void>();

function persist() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function notify() {
  listeners.forEach((fn) => fn(settings));
}

export function getAudioSettings(): AudioSettings {
  return settings;
}

/** Permet à un composant (écran Options) de réagir en direct aux changements. */
export function subscribeAudioSettings(fn: (settings: AudioSettings) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setEffectsVolume(volume: number) {
  settings = { ...settings, effectsVolume: Math.max(0, Math.min(1, volume)) };
  persist();
  notify();
}

export function setMusicVolume(volume: number) {
  settings = { ...settings, musicVolume: Math.max(0, Math.min(1, volume)) };
  persist();
  applyMusicVolume();
  notify();
}

// ---------------------------------------------------------------------
// Effets sonores courts
// ---------------------------------------------------------------------

// Volume relatif de chaque effet par rapport au curseur "effets" global,
// pour équilibrer un pack de fichiers qui n'ont pas forcément été
// normalisés au même niveau. 1 = volume plein par rapport au réglage.
const RELATIVE_VOLUME: Record<SoundKey, number> = {
  hover: 0.7,
  click: 0.2,
  cardPlay: 1,
  pass: 0.9,
  success: 1,
  gameOver: 1,
  writeScore: 0.85,
  acceptFriend: 0.9,
};

const effectCache = new Map<SoundKey, HTMLAudioElement>();

function getEffectAudio(key: SoundKey): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  let audio = effectCache.get(key);
  if (!audio) {
    audio = new Audio(SOUND_PATHS[key]);
    audio.preload = 'auto';
    effectCache.set(key, audio);
  }
  return audio;
}

function playEffect(key: SoundKey) {
  const audio = getEffectAudio(key);
  if (!audio) return;
  audio.volume = Math.max(0, Math.min(1, settings.effectsVolume * RELATIVE_VOLUME[key]));
  try {
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Lecture bloquée (pas encore d'interaction utilisateur, fichier
      // absent, etc.) : on ignore silencieusement, l'UI ne doit pas planter.
    });
  } catch {
    // Idem, certains navigateurs peuvent lever une exception synchrone.
  }
}

/** Petit tap pour le survol des cartes, boutons et tuiles de menu. */
export function playHover() {
  playEffect('hover');
}

/** Clic net pour valider une action de menu. */
export function playClick() {
  playEffect('click');
}

/** Bruit de carte posée sur la table. */
export function playCardPlay() {
  playEffect('cardPlay');
}

/** Son pour "passer son tour". */
export function playPass() {
  playEffect('pass');
}

/** Jingle court pour une victoire / qualification dans le bracket. */
export function playSuccess() {
  playEffect('success');
}

/** Son joué quand LE joueur (nous) termine dernier — "Trouduc". */
export function playGameOver() {
  playEffect('gameOver');
}

/** Petit son quand un score/rôle s'affiche (fin de manche, classement). */
export function playWriteScore() {
  playEffect('writeScore');
}

/** Notification quand une demande d'ami est acceptée. */
export function playAcceptFriend() {
  playEffect('acceptFriend');
}

// ---------------------------------------------------------------------
// Musique de fond avec fondu croisé entre pistes
// ---------------------------------------------------------------------

const musicCache = new Map<MusicKey, HTMLAudioElement>();
let currentMusicKey: MusicKey | null = null;
let fadeTimer: number | null = null;

function getMusicAudio(key: MusicKey): HTMLAudioElement {
  let audio = musicCache.get(key);
  if (!audio) {
    audio = new Audio(MUSIC_PATHS[key]);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
    musicCache.set(key, audio);
  }
  return audio;
}

function applyMusicVolume() {
  // Remet le volume de la piste actuellement audible au niveau réglé par
  // l'utilisateur (utile quand on bouge le curseur pendant qu'une musique
  // joue déjà, en dehors de toute transition en cours).
  if (currentMusicKey && fadeTimer === null) {
    const audio = musicCache.get(currentMusicKey);
    if (audio) audio.volume = settings.musicVolume;
  }
}

const FADE_DURATION_MS = 900;
const FADE_STEPS = 24;

function fadeAudio(audio: HTMLAudioElement, from: number, to: number, onDone?: () => void) {
  const stepTime = FADE_DURATION_MS / FADE_STEPS;
  let step = 0;
  const tick = () => {
    step++;
    const progress = step / FADE_STEPS;
    audio.volume = Math.max(0, Math.min(1, from + (to - from) * progress));
    if (step < FADE_STEPS) {
      window.setTimeout(tick, stepTime);
    } else {
      onDone?.();
    }
  };
  window.setTimeout(tick, stepTime);
}

/**
 * Joue une musique de fond en boucle, avec un fondu enchaîné : la piste
 * actuelle (s'il y en a une) descend en volume pendant que la nouvelle
 * monte, puis l'ancienne est mise en pause. Rien ne se passe si la piste
 * demandée est déjà celle en cours.
 */
export function playMusic(key: MusicKey) {
  if (typeof window === 'undefined') return;
  if (currentMusicKey === key) return;

  const previousKey = currentMusicKey;
  const previousAudio = previousKey ? musicCache.get(previousKey) ?? null : null;
  const nextAudio = getMusicAudio(key);

  currentMusicKey = key;

  nextAudio.volume = 0;
  nextAudio.currentTime = 0;
  void nextAudio.play().catch(() => {
    // Lecture auto bloquée tant qu'il n'y a pas eu d'interaction : la
    // musique démarrera dès le premier clic grâce à resumeMusicIfNeeded().
  });

  fadeAudio(nextAudio, 0, settings.musicVolume);

  if (previousAudio) {
    fadeAudio(previousAudio, previousAudio.volume, 0, () => {
      previousAudio.pause();
    });
  }
}

/** Coupe toute musique de fond avec un fondu, sans en relancer une autre. */
export function stopMusic() {
  if (!currentMusicKey) return;
  const audio = musicCache.get(currentMusicKey);
  currentMusicKey = null;
  if (audio) {
    fadeAudio(audio, audio.volume, 0, () => audio.pause());
  }
}

/**
 * À appeler sur la première interaction utilisateur (clic, touche) si la
 * musique n'a pas pu démarrer automatiquement à cause des restrictions
 * des navigateurs sur la lecture audio sans interaction préalable.
 */
export function resumeMusicIfNeeded() {
  if (!currentMusicKey) return;
  const audio = musicCache.get(currentMusicKey);
  if (audio && audio.paused) {
    void audio.play().catch(() => {});
  }
}

export type { MusicKey };
