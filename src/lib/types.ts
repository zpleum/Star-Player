// ============================================================
// Star Player — Core Type Definitions
// ============================================================

// --- Mood Classification ---
export type MoodCategory =
  | 'Fun'
  | 'Sad'
  | 'Work'
  | 'Chill'
  | 'Workout';

export const MOOD_CONFIG: Record<MoodCategory, { emoji: string; label: string; gradient: string; color: string }> = {
  'Fun': { emoji: '🎉', label: 'Party', gradient: 'from-orange-500 to-pink-500', color: '#f97316' },
  'Sad': { emoji: '😢', label: 'Sad', gradient: 'from-blue-500 to-indigo-500', color: '#3b82f6' },
  'Work': { emoji: '💼', label: 'Focus', gradient: 'from-emerald-500 to-teal-500', color: '#10b981' },
  'Chill': { emoji: '🌊', label: 'Chill', gradient: 'from-violet-500 to-indigo-500', color: '#8b5cf6' },
  'Workout': { emoji: '🏋️', label: 'Workout', gradient: 'from-red-500 to-orange-500', color: '#ef4444' },
};

export const ALL_MOODS: MoodCategory[] = [
  'Fun',
  'Sad',
  'Work',
  'Chill',
  'Workout',
];

// --- Audio Features ---
export interface AudioFeatures {
  bpm: number;
  energy: number;
  spectralCentroid: number;
  spectralFlatness: number;
  zcr: number;
  loudness: number;
  spectralRolloff: number;
  mfcc: number[];
  perceptualSpread: number;
  perceptualSharpness: number;
}

// --- Lyrics ---
export interface LyricSegment {
  start: number;
  end: number;
  text: string;
}

// --- Song ---
export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds
  coverArt: Blob | null;
  audioData: Blob;
  genre: string;
  year: number | null;
  dateAdded: number; // timestamp
  playCount: number;
  favorite: boolean;
  bpm: number | null;
  mood: MoodCategory | null;
  moodConfidence: number | null; // 0-1
  audioFeatures: AudioFeatures | null;
  analyzed: boolean;
  lyrics?: LyricSegment[];
}

// Song metadata without blobs (for lists/display)
export interface SongMeta {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  genre: string;
  year: number | null;
  dateAdded: number;
  playCount: number;
  favorite: boolean;
  bpm: number | null;
  mood: MoodCategory | null;
  moodConfidence: number | null;
  analyzed: boolean;
  hasCoverArt: boolean;
  hasLyrics?: boolean;
}

// --- Playlist ---
export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverArt: Blob | null;
  songIds: string[];
  dateCreated: number;
  dateModified: number;
}

// --- Player State ---
export type RepeatMode = 'off' | 'one' | 'all';

export interface PlayerState {
  currentSong: SongMeta | null;
  queue: SongMeta[];
  queueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  isFullPlayerOpen: boolean;
}

// --- Equalizer ---
export interface EQBand {
  frequency: number;
  gain: number;
  label: string;
}

export interface EQPreset {
  id: string;
  name: string;
  gains: number[]; // 10 values for 10 bands
  isCustom: boolean;
}

export const DEFAULT_EQ_BANDS: EQBand[] = [
  { frequency: 32, gain: 0, label: '32' },
  { frequency: 64, gain: 0, label: '64' },
  { frequency: 125, gain: 0, label: '125' },
  { frequency: 250, gain: 0, label: '250' },
  { frequency: 500, gain: 0, label: '500' },
  { frequency: 1000, gain: 0, label: '1K' },
  { frequency: 2000, gain: 0, label: '2K' },
  { frequency: 4000, gain: 0, label: '4K' },
  { frequency: 8000, gain: 0, label: '8K' },
  { frequency: 16000, gain: 0, label: '16K' },
];

export const EQ_PRESETS: EQPreset[] = [
  { id: 'flat', name: 'Flat', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], isCustom: false },
  { id: 'rock', name: 'Rock', gains: [5, 4, 3, 1, -1, 1, 3, 4, 5, 5], isCustom: false },
  { id: 'pop', name: 'Pop', gains: [-1, 1, 3, 4, 5, 4, 2, 0, -1, -2], isCustom: false },
  { id: 'jazz', name: 'Jazz', gains: [3, 2, 1, 2, -2, -2, 0, 1, 3, 4], isCustom: false },
  { id: 'classical', name: 'Classical', gains: [4, 3, 2, 1, -1, -1, 0, 2, 3, 4], isCustom: false },
  { id: 'bass-boost', name: 'Bass Boost', gains: [8, 6, 4, 2, 0, 0, 0, 0, 0, 0], isCustom: false },
  { id: 'vocal', name: 'Vocal', gains: [-3, -2, 0, 3, 5, 5, 3, 0, -2, -3], isCustom: false },
  { id: 'electronic', name: 'Electronic', gains: [5, 4, 1, 0, -2, 2, 1, 3, 5, 5], isCustom: false },
];

// --- Visualizer ---
export type VisualizerMode = 'bars' | 'wave' | 'circular';

// --- Settings ---
export interface AppSettings {
  theme: 'dark' | 'light' | 'auto';
  accentColor: string;
  equalizerPresetId: string;
  customEQGains: number[];
  volume: number;
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
  visualizerMode: VisualizerMode;
  viewMode: 'grid' | 'list';
  libraryOrder?: string[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accentColor: '#8b5cf6',
  equalizerPresetId: 'flat',
  customEQGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  volume: 0.8,
  repeatMode: 'off',
  shuffleEnabled: false,
  visualizerMode: 'bars',
  viewMode: 'list',
};

// --- Analysis Status ---
export type AnalysisStatus = 'idle' | 'analyzing' | 'done' | 'error';

export interface AnalysisState {
  status: AnalysisStatus;
  progress: number; // 0-100
  currentSongId: string | null;
  currentSongTitle: string | null;
  totalSongs: number;
  analyzedCount: number;
  error: string | null;
}

// --- Toast ---
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}
