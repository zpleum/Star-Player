'use client';
// ============================================================
// Star Player — Player Context (Global Audio State)
// ============================================================
import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { MOOD_CONFIG, type SongMeta, type RepeatMode, type MoodCategory, type PlayerState } from '@/lib/types';
import { shuffleArray } from '@/lib/utils';
import * as db from '@/lib/db';
import { Capacitor } from '@capacitor/core';
import { CapacitorMusicControls } from 'capacitor-music-controls-plugin';
import { LocalNotifications } from '@capacitor/local-notifications';

// ---- Actions ----
type PlayerAction =
  | { type: 'SET_SONG'; payload: SongMeta }
  | { type: 'SET_QUEUE'; payload: { queue: SongMeta[]; index: number } }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SET_TIME'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'SET_REPEAT'; payload: RepeatMode }
  | { type: 'TOGGLE_SHUFFLE' }
  | { type: 'SET_SHUFFLE'; payload: boolean }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'SET_FULL_PLAYER'; payload: boolean }
  | { type: 'ADD_TO_QUEUE'; payload: SongMeta[] }
  | { type: 'REMOVE_FROM_QUEUE'; payload: number }
  | { type: 'CLEAR_QUEUE' }
  | { type: 'REORDER_QUEUE'; payload: { from: number; to: number } }
  | { type: 'SET_EQ_BAND'; payload: { index: number; value: number } }
  | { type: 'SET_EQ_PRESET'; payload: { name: string; gains: number[] } }
  | { type: 'SET_ACCENT_COLORS'; payload: { 
      c1: string; c2: string; c3: string; c4: string; c5: string;
      accentPositions: { x: string; y: string }[];
    } }
  | { type: 'RANDOMIZE_POSITIONS' }
  | { type: 'RANDOMIZE_COLORS' }
  | { type: 'TOGGLE_DYNAMIC_BACKGROUND' };

const initialState: PlayerState & { eqGains: number[]; eqPreset: string } = {
  currentSong: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  repeatMode: 'off',
  isShuffled: false,
  isFullPlayerOpen: false,
  accentColor: '#8b5cf6',
  accentColor2: '#ec4899',
  accentColor3: '#6366f1',
  accentColor4: '#10b981',
  accentColor5: '#f59e0b',
  accentPositions: [
    { x: '0%', y: '0%' },
    { x: '100%', y: '0%' },
    { x: '50%', y: '100%' },
    { x: '100%', y: '100%' },
    { x: '50%', y: '0%' }
  ],
  dynamicBackgroundEnabled: true,
  eqGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  eqPreset: 'Flat',
};

function playerReducer(
  state: PlayerState & { eqGains: number[]; eqPreset: string },
  action: PlayerAction
): PlayerState & { eqGains: number[]; eqPreset: string } {
  switch (action.type) {
    case 'SET_SONG':
      return { ...state, currentSong: action.payload, currentTime: 0, duration: 0 };
    case 'SET_QUEUE':
      return { ...state, queue: action.payload.queue, queueIndex: action.payload.index };
    case 'PLAY':
      return { ...state, isPlaying: true };
    case 'PAUSE':
      return { ...state, isPlaying: false };
    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying };
    case 'SET_TIME':
      return { ...state, currentTime: action.payload };
    case 'SET_DURATION':
      return { ...state, duration: action.payload };
    case 'SET_VOLUME':
      return { ...state, volume: action.payload, isMuted: action.payload === 0 };
    case 'TOGGLE_MUTE':
      return { ...state, isMuted: !state.isMuted };
    case 'SET_REPEAT':
      return { ...state, repeatMode: action.payload };
    case 'TOGGLE_SHUFFLE':
      return { ...state, isShuffled: !state.isShuffled };
    case 'SET_SHUFFLE':
      return { ...state, isShuffled: action.payload };
    case 'SET_FULL_PLAYER':
      return { ...state, isFullPlayerOpen: action.payload };
    case 'NEXT': {
      const nextIndex = state.queueIndex + 1;
      if (nextIndex < state.queue.length) {
        return {
          ...state,
          queueIndex: nextIndex,
          currentSong: state.queue[nextIndex],
          currentTime: 0,
        };
      }
      if (state.repeatMode === 'all' && state.queue.length > 0) {
        return { ...state, queueIndex: 0, currentSong: state.queue[0], currentTime: 0 };
      }
      return { ...state, isPlaying: false };
    }
    case 'PREV': {
      if (state.currentTime > 3) {
        return { ...state, currentTime: 0 };
      }
      const prevIndex = state.queueIndex - 1;
      if (prevIndex >= 0) {
        return {
          ...state,
          queueIndex: prevIndex,
          currentSong: state.queue[prevIndex],
          currentTime: 0,
        };
      }
      return { ...state, currentTime: 0 };
    }
    case 'ADD_TO_QUEUE':
      return { ...state, queue: [...state.queue, ...action.payload] };
    case 'REMOVE_FROM_QUEUE': {
      const newQueue = state.queue.filter((_, i) => i !== action.payload);
      let newIndex = state.queueIndex;
      if (action.payload < state.queueIndex) newIndex--;
      if (action.payload === state.queueIndex) {
        return {
          ...state,
          queue: newQueue,
          queueIndex: newIndex,
          currentSong: newQueue[newIndex] || null,
        };
      }
      return { ...state, queue: newQueue, queueIndex: newIndex };
    }
    case 'CLEAR_QUEUE':
      return { ...state, queue: [], queueIndex: -1, currentSong: null, isPlaying: false };
    case 'REORDER_QUEUE': {
      const q = [...state.queue];
      const [moved] = q.splice(action.payload.from, 1);
      q.splice(action.payload.to, 0, moved);
      let idx = state.queueIndex;
      if (action.payload.from === idx) idx = action.payload.to;
      else if (action.payload.from < idx && action.payload.to >= idx) idx--;
      else if (action.payload.from > idx && action.payload.to <= idx) idx++;
      return { ...state, queue: q, queueIndex: idx };
    }
    case 'SET_EQ_BAND': {
      const newGains = [...state.eqGains];
      newGains[action.payload.index] = action.payload.value;
      return { ...state, eqGains: newGains, eqPreset: 'Custom' };
    }
    case 'SET_EQ_PRESET':
      return { ...state, eqPreset: action.payload.name, eqGains: action.payload.gains };
    case 'SET_ACCENT_COLORS':
      return { 
        ...state, 
        accentColor: action.payload.c1, 
        accentColor2: action.payload.c2, 
        accentColor3: action.payload.c3,
        accentColor4: action.payload.c4,
        accentColor5: action.payload.c5,
        accentPositions: action.payload.accentPositions
      };
    case 'RANDOMIZE_POSITIONS':
      return {
        ...state,
        accentPositions: Array.from({ length: 5 }, () => ({
          x: `${Math.random() * 100}%`,
          y: `${Math.random() * 100}%`
        }))
      };
    case 'RANDOMIZE_COLORS': {
      // Generate a random base hue
      const baseHue = Math.floor(Math.random() * 360);
      const generateColor = (hueOffset: number, sat: number, light: number) => 
        `hsl(${(baseHue + hueOffset) % 360}, ${sat}%, ${light}%)`;
      
      return {
        ...state,
        accentColor: generateColor(0, 70, 60),
        accentColor2: generateColor(40, 65, 55),
        accentColor3: generateColor(80, 60, 50),
        accentColor4: generateColor(160, 75, 45),
        accentColor5: generateColor(280, 60, 55),
        accentPositions: Array.from({ length: 5 }, () => ({
          x: `${Math.random() * 100}%`,
          y: `${Math.random() * 100}%`
        }))
      };
    }
    case 'TOGGLE_DYNAMIC_BACKGROUND':
      return { ...state, dynamicBackgroundEnabled: !state.dynamicBackgroundEnabled };
    default:
      return state;
  }
}

// ---- Context ----
interface PlayerContextValue {
  state: PlayerState & { eqGains: number[]; eqPreset: string };
  audioRef: React.RefObject<HTMLAudioElement | null>;
  audioContextRef: React.RefObject<AudioContext | null>;
  analyserRef: React.RefObject<AnalyserNode | null>;
  sourceRef: React.RefObject<MediaElementAudioSourceNode | null>;

  playSong: (song: SongMeta, queue?: SongMeta[], index?: number) => void;
  playQueue: (queue: SongMeta[], startIndex?: number) => void;
  togglePlay: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  setFullPlayer: (open: boolean) => void;
  addToQueue: (songs: SongMeta[]) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  reorderQueue: (from: number, to: number) => void;
  playRandomSong: (songs: SongMeta[]) => void;
  playRandomByMood: (mood: MoodCategory, songs: SongMeta[]) => void;
  shuffleByMood: (mood: MoodCategory, songs: SongMeta[]) => void;
  
  setEqBand: (index: number, value: number) => void;
  setEqPreset: (name: string, gains: number[]) => void;
  setAccentColor: (color: string | { c1: string; c2: string; c3: string; c4: string; c5: string }) => void;
  toggleDynamicBackground: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const pathname = usePathname();

  // Randomize orbs on navigation
  useEffect(() => {
    if (!state.currentSong) {
      dispatch({ type: 'RANDOMIZE_COLORS' });
    } else {
      dispatch({ type: 'RANDOMIZE_POSITIONS' });
    }
  }, [pathname, !!state.currentSong]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const eqFiltersRef = useRef<BiquadFilterNode[]>([]);

  // Initialize AudioContext lazily on first user interaction
  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    if (!analyserRef.current && audioContextRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.connect(audioContextRef.current.destination);
    }
    if (!sourceRef.current && audioRef.current && audioContextRef.current && analyserRef.current) {
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      
      // Create Equalizer bands (10-band)
      const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
      eqFiltersRef.current = frequencies.map((freq, i) => {
        const filter = audioContextRef.current!.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1;
        filter.gain.value = state.eqGains[i] || 0;
        return filter;
      });

      // Routing: source -> eq[0] -> ... -> eq[9] -> analyser
      sourceRef.current.connect(eqFiltersRef.current[0]);
      for (let i = 0; i < eqFiltersRef.current.length - 1; i++) {
        eqFiltersRef.current[i].connect(eqFiltersRef.current[i + 1]);
      }
      eqFiltersRef.current[eqFiltersRef.current.length - 1].connect(analyserRef.current);
    }
  }, [state.eqGains]);

  // Sync EQ gains from state to audio nodes
  useEffect(() => {
    if (eqFiltersRef.current.length > 0) {
      state.eqGains.forEach((gain, i) => {
        if (eqFiltersRef.current[i]) {
          eqFiltersRef.current[i].gain.value = gain;
        }
      });
    }
  }, [state.eqGains]);

  // Dynamic Theme Color Injection
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--accent', state.accentColor);
      root.style.setProperty('--accent-2', state.accentColor2);
      root.style.setProperty('--accent-3', state.accentColor3);
      root.style.setProperty('--accent-4', state.accentColor4);
      root.style.setProperty('--accent-5', state.accentColor5);
      
      if (state.accentPositions && Array.isArray(state.accentPositions)) {
        state.accentPositions.forEach((pos, i) => {
          root.style.setProperty(`--accent-pos-${i+1}-x`, pos.x);
          root.style.setProperty(`--accent-pos-${i+1}-y`, pos.y);
        });
      }

      root.setAttribute('data-dynamic-bg', state.dynamicBackgroundEnabled.toString());

      // Calculate derived colors from primary accent
      if (state.accentColor.startsWith('#')) {
        const hex = state.accentColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        // Calculate contrast color for text on accent background
        // Using relative luminance formula
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const accentForeground = luminance > 0.6 ? '#000000' : '#ffffff';
        root.style.setProperty('--accent-foreground', accentForeground);
        root.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);

        const darken = (c: number) => Math.max(0, Math.floor(c * 0.85));
        const darkerHex = `#${darken(r).toString(16).padStart(2, '0')}${darken(g).toString(16).padStart(2, '0')}${darken(b).toString(16).padStart(2, '0')}`;
        root.style.setProperty('--accent-hover', darkerHex);

        const toBg = (c: number) => Math.max(6, Math.floor(c * 0.1)); 
        const bgHex = `#${toBg(r).toString(16).padStart(2, '0')}${toBg(g).toString(16).padStart(2, '0')}${toBg(b).toString(16).padStart(2, '0')}`;
        root.style.setProperty('--background', bgHex);

        const toSurface = (c: number) => Math.max(8, Math.floor(c * 0.08));
        const sr = toSurface(r), sg = toSurface(g), sb = toSurface(b);
        const surfaceHex = `#${sr.toString(16).padStart(2, '0')}${sg.toString(16).padStart(2, '0')}${sb.toString(16).padStart(2, '0')}`;
        root.style.setProperty('--surface', surfaceHex);
        root.style.setProperty('--surface-rgb', `${sr}, ${sg}, ${sb}`);
        
        const toSurfaceHover = (c: number) => Math.max(18, Math.floor(c * 0.22));
        const surfaceHoverHex = `#${toSurfaceHover(r).toString(16).padStart(2, '0')}${toSurfaceHover(g).toString(16).padStart(2, '0')}${toSurfaceHover(b).toString(16).padStart(2, '0')}`;
        root.style.setProperty('--surface-hover', surfaceHoverHex);

        const toBorder = (c: number) => Math.max(24, Math.floor(c * 0.28));
        const borderHex = `#${toBorder(r).toString(16).padStart(2, '0')}${toBorder(g).toString(16).padStart(2, '0')}${toBorder(b).toString(16).padStart(2, '0')}`;
        root.style.setProperty('--border-color', borderHex);
      }
    }
  }, [state.accentColor, state.accentColor2, state.accentColor3, state.accentColor4, state.accentColor5, state.accentPositions]);

  // Always keep audio element volume in sync with state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.volume;
      audioRef.current.muted = state.isMuted;
    }
  }, [state.volume, state.isMuted]);

  // Settings Persistence & Initial Randomization
  const isInitialLoad = useRef(true);

  // Load settings and randomize orbs on mount
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      
      // 1. Randomize accents on first mount (Client side only to avoid hydration mismatch)
      const accentPositions = Array.from({ length: 5 }, () => ({
        x: `${Math.random() * 100}%`,
        y: `${Math.random() * 100}%`
      }));
      dispatch({ type: 'SET_ACCENT_COLORS', payload: { 
        c1: state.accentColor, 
        c2: state.accentColor2, 
        c3: state.accentColor3, 
        c4: state.accentColor4, 
        c5: state.accentColor5, 
        accentPositions 
      } });

      // 2. Load settings from DB
      db.getSettings().then(settings => {
        dispatch({ type: 'SET_VOLUME', payload: settings.volume });
        dispatch({ type: 'SET_REPEAT', payload: settings.repeatMode });
        dispatch({ type: 'SET_SHUFFLE', payload: settings.shuffleEnabled });
        dispatch({ type: 'SET_EQ_PRESET', payload: { name: settings.equalizerPresetId, gains: settings.customEQGains } });
        if (settings.dynamicBackgroundEnabled !== undefined) {
          if (settings.dynamicBackgroundEnabled !== state.dynamicBackgroundEnabled) {
            dispatch({ type: 'TOGGLE_DYNAMIC_BACKGROUND' });
          }
        }
        if (audioRef.current) {
          audioRef.current.volume = settings.volume;
        }
      });

      // 3. Persistent Notification Permission Request on Native (Android 13+)
      if (Capacitor.isNativePlatform()) {
        const requestNotificationPerms = async () => {
          try {
            const perm = await LocalNotifications.checkPermissions();
            if (perm.display !== 'granted') {
              // Ask every time on startup if not granted
              await LocalNotifications.requestPermissions();
            }
          } catch (err) {
            console.error('Initial permission check err:', err);
          }
        };
        requestNotificationPerms();
      }
    }
  }, []);

  // Centralized Native Music Controls & MediaSession Metadata Sync
  useEffect(() => {
    if (!state.currentSong) return;

    const syncControls = async () => {
      const song = state.currentSong!;
      
      // 1. Web MediaSession Metadata
      if ('mediaSession' in navigator) {
        let artwork: MediaImage[] = [];
        const coverArtBlob = await db.getSongCoverArt(song.id);
        if (coverArtBlob) {
          const coverUrl = URL.createObjectURL(coverArtBlob);
          artwork = [{ src: coverUrl, sizes: '512x512', type: coverArtBlob.type }];
        }
        navigator.mediaSession.metadata = new MediaMetadata({
          title: song.title,
          artist: song.artist,
          album: song.album || '',
          artwork,
        });
      }

      // 2. Native Music Controls
      if (Capacitor.isNativePlatform()) {
        try {
          // Check permissions first
          const perm = await LocalNotifications.checkPermissions();
          if (perm.display !== 'granted') {
            await LocalNotifications.requestPermissions();
          }

          // Get cover art as Base64 for native
          let coverUrlForNative = 'https://placehold.co/600x600/000000/444444/png?text=Star+Player';
          const coverArtBlob = await db.getSongCoverArt(song.id);
          if (coverArtBlob) {
            coverUrlForNative = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(coverArtBlob);
            });
          }

          // Create/Update controls
          // Note: The native create method handles destroying the previous instance
          await CapacitorMusicControls.create({
            track: song.title,
            artist: song.artist,
            album: song.album || '',
            cover: coverUrlForNative,
            hasPrev: true,
            hasNext: true,
            hasClose: true,
            dismissable: true,
            ticker: `Now playing ${song.title}`,
            isPlaying: state.isPlaying,
            playIcon: '',
            pauseIcon: '',
            prevIcon: '',
            nextIcon: '',
            closeIcon: '',
            notificationIcon: ''
          });
        } catch (err) {
          console.error('Error syncing native music controls:', err);
        }
      }
    };

    syncControls();
  }, [state.currentSong?.id]);

  // Sync playback state (play/pause) with native music controls
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      try {
        CapacitorMusicControls.updateIsPlaying({ isPlaying: state.isPlaying });
      } catch (err) {
        console.error('Error updating music controls status:', err);
      }
    }
  }, [state.isPlaying]);

  // Save settings when they change
  useEffect(() => {
    // We don't save on the very first load to avoid overwriting with defaults
    // But we need another way to detect if we've finished loading
    // For now, simple save logic
    if (!isInitialLoad.current) {
      db.getSettings().then(current => {
        db.saveSettings({
          ...current,
          volume: state.volume,
          repeatMode: state.repeatMode,
          shuffleEnabled: state.isShuffled,
          equalizerPresetId: state.eqPreset,
          customEQGains: state.eqGains,
          dynamicBackgroundEnabled: state.dynamicBackgroundEnabled
        });
      });
    }
  }, [state.volume, state.repeatMode, state.isShuffled, state.eqPreset, state.eqGains, state.dynamicBackgroundEnabled]);

  // Load and play audio for a song
  const loadSong = useCallback(
    async (song: SongMeta) => {
      const audioData = await db.getSongAudioData(song.id);
      if (!audioData || !audioRef.current) return;

      // Cleanup previous URL
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);

      const url = URL.createObjectURL(audioData);
      audioUrlRef.current = url;
      audioRef.current.src = url;
      audioRef.current.load();

      ensureAudioContext();

      try {
        await audioRef.current.play();
        dispatch({ type: 'PLAY' });
      } catch {
        // autoplay may be blocked
      }

      // Update play count
      db.incrementPlayCount(song.id);

      // MediaSession API & Cover Art
      if ('mediaSession' in navigator || song.hasCoverArt) {
        const coverArtBlob = await db.getSongCoverArt(song.id);
        const artwork: MediaImage[] = [];
        
        if (coverArtBlob) {
          const coverUrlForWeb = URL.createObjectURL(coverArtBlob);
          artwork.push({ src: coverUrlForWeb, sizes: '512x512', type: coverArtBlob.type });
        }

        if ('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: song.title,
            artist: song.artist,
            album: song.album,
            artwork,
          });
        }
      }

      // Extract accent color from cover art
      if (song.hasCoverArt) {
        const coverArt = await db.getSongCoverArt(song.id);
        if (coverArt) {
          const url = URL.createObjectURL(coverArt);
          const img = new Image();
          img.src = url;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            canvas.width = 64; 
            canvas.height = 64;
            ctx.drawImage(img, 0, 0, 64, 64);
            
            const data = ctx.getImageData(0, 0, 64, 64).data;
            
            const extractFromRegion = (xStart: number, yStart: number, size: number) => {
              let r = 0, g = 0, b = 0, count = 0;
              for (let y = yStart; y < yStart + size; y++) {
                for (let x = xStart; x < xStart + size; x++) {
                  const i = (y * 64 + x) * 4;
                  const sr = data[i], sg = data[i+1], sb = data[i+2];
                  const brightness = (sr + sg + sb) / 3;
                  const saturation = Math.max(sr, sg, sb) - Math.min(sr, sg, sb);
                  if (brightness > 30 && brightness < 230 && saturation > 20) {
                    r += sr; g += sg; b += sb; count++;
                  }
                }
              }
              if (count > 0) {
                return `#${Math.floor(r/count).toString(16).padStart(2, '0')}${Math.floor(g/count).toString(16).padStart(2, '0')}${Math.floor(b/count).toString(16).padStart(2, '0')}`;
              }
              return null;
            };

            const c1 = extractFromRegion(16, 16, 32) || (song.mood ? MOOD_CONFIG[song.mood].color : '#8b5cf6');
            const c2 = extractFromRegion(0, 0, 32) || c1;
            const c3 = extractFromRegion(32, 32, 32) || c1;
            const c4 = extractFromRegion(32, 0, 32) || c2;
            const c5 = extractFromRegion(0, 32, 32) || c3;

            const accentPositions = Array.from({ length: 5 }, () => ({
              x: `${Math.random() * 100}%`,
              y: `${Math.random() * 100}%`
            }));

            dispatch({ type: 'SET_ACCENT_COLORS', payload: { c1, c2, c3, c4, c5, accentPositions } });
            URL.revokeObjectURL(url);
          };
        }
      } else if (song.mood) {
        const c1 = MOOD_CONFIG[song.mood].color;
        const accentPositions = [
          { x: `${Math.random() * 80}%`, y: `${Math.random() * 80}%` },
          { x: `${Math.random() * 80 + 20}%`, y: `${Math.random() * 80 + 20}%` },
          { x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%` }
        ];
        dispatch({ type: 'SET_ACCENT_COLORS', payload: { c1, c2: c1, c3: c1, c4: c1, c5: c1, accentPositions } });
      } else {
        const accentPositions = [
          { x: '10%', y: '10%' },
          { x: '90%', y: '90%' },
          { x: '80%', y: '20%' }
        ];
        dispatch({ type: 'SET_ACCENT_COLORS', payload: { c1: '#8b5cf6', c2: '#ec4899', c3: '#6366f1', c4: '#10b981', c5: '#f59e0b', accentPositions } });
      }
    },
    [ensureAudioContext]
  );

  // ---- Public Methods ----

  const playSong = useCallback(
    (song: SongMeta, queue?: SongMeta[], index?: number) => {
      // If clicking the currently playing song, toggle play/pause instead of restarting
      if (state.currentSong?.id === song.id) {
        if (!audioRef.current) return;
        ensureAudioContext();
        if (state.isPlaying) {
          audioRef.current.pause();
          dispatch({ type: 'PAUSE' });
        } else {
          audioRef.current.play().then(() => dispatch({ type: 'PLAY' })).catch(() => {});
        }
        return;
      }

      dispatch({ type: 'SET_SONG', payload: song });
      if (queue) {
        dispatch({ type: 'SET_QUEUE', payload: { queue, index: index ?? 0 } });
      }
      loadSong(song);
    },
    [state.currentSong?.id, state.isPlaying, ensureAudioContext, loadSong]
  );

  const playQueue = useCallback(
    (queue: SongMeta[], startIndex = 0) => {
      if (queue.length === 0) return;
      const song = queue[startIndex];
      dispatch({ type: 'SET_SONG', payload: song });
      dispatch({ type: 'SET_QUEUE', payload: { queue, index: startIndex } });
      loadSong(song);
    },
    [loadSong]
  );

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    ensureAudioContext();
    if (state.isPlaying) {
      audioRef.current.pause();
      dispatch({ type: 'PAUSE' });
    } else {
      audioRef.current.play().then(() => dispatch({ type: 'PLAY' })).catch(() => {});
    }
  }, [state.isPlaying, ensureAudioContext]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    dispatch({ type: 'PAUSE' });
  }, []);

  const next = useCallback(() => {
    const nextIndex = state.queueIndex + 1;
    if (nextIndex < state.queue.length) {
      const song = state.queue[nextIndex];
      dispatch({ type: 'NEXT' });
      loadSong(song);
    } else if (state.repeatMode === 'all' && state.queue.length > 0) {
      const song = state.queue[0];
      dispatch({ type: 'NEXT' });
      loadSong(song);
    } else {
      dispatch({ type: 'PAUSE' });
    }
  }, [state.queueIndex, state.queue, state.repeatMode, loadSong]);

  const prev = useCallback(() => {
    if (state.currentTime > 3 && audioRef.current) {
      audioRef.current.currentTime = 0;
      dispatch({ type: 'SET_TIME', payload: 0 });
      return;
    }
    const prevIndex = state.queueIndex - 1;
    if (prevIndex >= 0) {
      const song = state.queue[prevIndex];
      dispatch({ type: 'PREV' });
      loadSong(song);
    } else if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, [state.currentTime, state.queueIndex, state.queue, loadSong]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      dispatch({ type: 'SET_TIME', payload: time });
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    if (audioRef.current) audioRef.current.volume = v;
    dispatch({ type: 'SET_VOLUME', payload: v });
  }, []);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !state.isMuted;
    }
    dispatch({ type: 'TOGGLE_MUTE' });
  }, [state.isMuted]);

  const cycleRepeat = useCallback(() => {
    const modes: RepeatMode[] = ['off', 'one', 'all'];
    const currentIdx = modes.indexOf(state.repeatMode);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    dispatch({ type: 'SET_REPEAT', payload: nextMode });
  }, [state.repeatMode]);

  const toggleShuffle = useCallback(() => {
    dispatch({ type: 'TOGGLE_SHUFFLE' });
    if (!state.isShuffled && state.queue.length > 0) {
      const current = state.queue[state.queueIndex];
      const rest = state.queue.filter((_, i) => i !== state.queueIndex);
      const shuffled = [current, ...shuffleArray(rest)];
      dispatch({ type: 'SET_QUEUE', payload: { queue: shuffled, index: 0 } });
    }
  }, [state.isShuffled, state.queue, state.queueIndex]);

  const setFullPlayer = useCallback((open: boolean) => {
    dispatch({ type: 'SET_FULL_PLAYER', payload: open });
  }, []);

  const addToQueue = useCallback((songs: SongMeta[]) => {
    dispatch({ type: 'ADD_TO_QUEUE', payload: songs });
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_FROM_QUEUE', payload: index });
  }, []);

  const clearQueue = useCallback(() => {
    dispatch({ type: 'CLEAR_QUEUE' });
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, []);

  const reorderQueue = useCallback((from: number, to: number) => {
    dispatch({ type: 'REORDER_QUEUE', payload: { from, to } });
  }, []);

  // Random play
  const playRandomSong = useCallback(
    (songs: SongMeta[]) => {
      if (songs.length === 0) return;
      const shuffled = shuffleArray(songs);
      playSong(shuffled[0], shuffled, 0);
    },
    [playSong]
  );

  // Random by mood
  const playRandomByMood = useCallback(
    (mood: MoodCategory, songs: SongMeta[]) => {
      const moodSongs = songs.filter((s) => s.mood === mood);
      if (moodSongs.length === 0) return;
      const shuffled = shuffleArray(moodSongs);
      playSong(shuffled[0], shuffled, 0);
    },
    [playSong]
  );

  // Shuffle by mood
  const shuffleByMood = useCallback(
    (mood: MoodCategory, songs: SongMeta[]) => {
      const moodSongs = songs.filter((s) => s.mood === mood);
      if (moodSongs.length === 0) return;
      playQueue(shuffleArray(moodSongs), 0);
    },
    [playQueue]
  );

  // Equalizer controls
  const setEqBand = useCallback((index: number, value: number) => {
    dispatch({ type: 'SET_EQ_BAND', payload: { index, value } });
  }, []);

  const setEqPreset = useCallback((name: string, gains: number[]) => {
    dispatch({ type: 'SET_EQ_PRESET', payload: { name, gains } });
  }, []);

  const setAccentColor = useCallback((color: string | { c1: string; c2: string; c3: string; c4: string; c5: string }) => {
    const accentPositions = Array.from({ length: 5 }, () => ({
      x: `${Math.random() * 100}%`,
      y: `${Math.random() * 100}%`
    }));
    if (typeof color === 'string') {
      dispatch({ type: 'SET_ACCENT_COLORS', payload: { c1: color, c2: color, c3: color, c4: color, c5: color, accentPositions } });
    } else {
      dispatch({ type: 'SET_ACCENT_COLORS', payload: { ...color, accentPositions } });
    }
  }, []);

  const toggleDynamicBackground = useCallback(() => {
    dispatch({ type: 'TOGGLE_DYNAMIC_BACKGROUND' });
  }, []);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => dispatch({ type: 'SET_TIME', payload: audio.currentTime });
    const onDurationChange = () => dispatch({ type: 'SET_DURATION', payload: audio.duration });
    const onEnded = () => {
      if (state.repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else {
        next();
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
    };
  }, [state.repeatMode, next]);

  // MediaSession controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', togglePlay);
    navigator.mediaSession.setActionHandler('pause', pause);
    navigator.mediaSession.setActionHandler('previoustrack', prev);
    navigator.mediaSession.setActionHandler('nexttrack', next);
  }, [togglePlay, pause, prev, next]);

  // CapacitorMusicControls Event Listeners & State Sync
  const controlsHandlersRef = useRef({ next, prev, pause, play: () => { if (audioRef.current) { audioRef.current.play().then(() => dispatch({ type: 'PLAY' })).catch(() => {}); } }, togglePlay });

  useEffect(() => {
    controlsHandlersRef.current = { next, prev, pause, play: () => { if (audioRef.current) { audioRef.current.play().then(() => dispatch({ type: 'PLAY' })).catch(() => {}); } }, togglePlay };
  }, [next, prev, pause, togglePlay]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    let listener: any = null;

    const handleAction = (message: string) => {
      const handlers = controlsHandlersRef.current;
      if (message === 'music-controls-next') {
        handlers.next();
      } else if (message === 'music-controls-previous') {
        handlers.prev();
      } else if (message === 'music-controls-pause') {
        handlers.pause();
      } else if (message === 'music-controls-play') {
        handlers.play();
      } else if (message === 'music-controls-destroy') {
        handlers.pause();
      } else if (message === 'music-controls-media-button-play-pause') {
        handlers.togglePlay();
      }
    };

    const setupListener = async () => {
      try {
        // iOS / Standard Listener
        listener = await CapacitorMusicControls.addListener('controlsNotification', (event: any) => {
          handleAction(event.message);
        });
      } catch (err) {
        console.error('Failed to add listener for CapacitorMusicControls:', err);
      }
    };

    // Android 13+ Workaround (Document Event Listener)
    const handleDocumentEvent = (event: any) => {
      if (event && event.message) {
        handleAction(event.message);
      }
    };
    document.addEventListener('controlsNotification', handleDocumentEvent);

    setupListener();

    return () => {
      if (listener) {
        listener.remove();
      }
      document.removeEventListener('controlsNotification', handleDocumentEvent);
    };
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      try {
        CapacitorMusicControls.updateIsPlaying({ isPlaying: state.isPlaying });
      } catch (e) {}
    }
  }, [state.isPlaying]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          seek(Math.min(state.duration, state.currentTime + 5));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seek(Math.max(0, state.currentTime - 5));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, state.volume + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, state.volume - 0.05));
          break;
        case 'KeyM':
          toggleMute();
          break;
        case 'KeyN':
          next();
          break;
        case 'KeyP':
          prev();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlay, seek, setVolume, toggleMute, next, prev, state.duration, state.currentTime, state.volume]);

  const value: PlayerContextValue = {
    state,
    audioRef,
    audioContextRef,
    analyserRef,
    sourceRef,
    playSong,
    playQueue,
    togglePlay,
    pause,
    next,
    prev,
    seek,
    setVolume,
    toggleMute,
    cycleRepeat,
    toggleShuffle,
    setFullPlayer,
    addToQueue,
    removeFromQueue,
    clearQueue,
    reorderQueue,
    playRandomSong,
    playRandomByMood,
    shuffleByMood,
    setEqBand,
    setEqPreset,
    setAccentColor,
    toggleDynamicBackground,
  };

  return (
    <PlayerContext.Provider value={value}>
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="auto" />
      {children}
    </PlayerContext.Provider>
  );
}
