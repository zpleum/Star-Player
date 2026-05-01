'use client';
// ============================================================
// Star Player — Player Context (Global Audio State)
// ============================================================
import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import type { SongMeta, RepeatMode, MoodCategory, PlayerState } from '@/lib/types';
import { shuffleArray } from '@/lib/utils';
import * as db from '@/lib/db';

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
  | { type: 'SET_EQ_PRESET'; payload: { name: string; gains: number[] } };

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
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(playerReducer, initialState);

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

  // Settings Persistence
  const isInitialLoad = useRef(true);

  // Load settings on mount
  useEffect(() => {
    db.getSettings().then(settings => {
      dispatch({ type: 'SET_VOLUME', payload: settings.volume });
      dispatch({ type: 'SET_REPEAT', payload: settings.repeatMode });
      dispatch({ type: 'SET_SHUFFLE', payload: settings.shuffleEnabled });
      dispatch({ type: 'SET_EQ_PRESET', payload: { name: settings.equalizerPresetId, gains: settings.customEQGains } });
      // Sync volume to actual audio element
      if (audioRef.current) {
        audioRef.current.volume = settings.volume;
      }
    });
  }, []);

  // Always keep audio element volume in sync with state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.volume;
      audioRef.current.muted = state.isMuted;
    }
  }, [state.volume, state.isMuted]);

  // Save settings when they change
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    
    db.getSettings().then(settings => {
      db.saveSettings({
        ...settings,
        volume: state.volume,
        repeatMode: state.repeatMode,
        shuffleEnabled: state.isShuffled,
        equalizerPresetId: state.eqPreset,
        customEQGains: state.eqGains,
      });
    });
  }, [state.volume, state.repeatMode, state.isShuffled, state.eqPreset, state.eqGains]);

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

      // MediaSession API
      if ('mediaSession' in navigator) {
        const coverArt = await db.getSongCoverArt(song.id);
        const artwork: MediaImage[] = [];
        if (coverArt) {
          const artUrl = URL.createObjectURL(coverArt);
          artwork.push({ src: artUrl, sizes: '512x512', type: coverArt.type });
        }
        navigator.mediaSession.metadata = new MediaMetadata({
          title: song.title,
          artist: song.artist,
          album: song.album,
          artwork,
        });
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

  // 🎲 Random play
  const playRandomSong = useCallback(
    (songs: SongMeta[]) => {
      if (songs.length === 0) return;
      const shuffled = shuffleArray(songs);
      playSong(shuffled[0], shuffled, 0);
    },
    [playSong]
  );

  // 🎭 Random by mood
  const playRandomByMood = useCallback(
    (mood: MoodCategory, songs: SongMeta[]) => {
      const moodSongs = songs.filter((s) => s.mood === mood);
      if (moodSongs.length === 0) return;
      const shuffled = shuffleArray(moodSongs);
      playSong(shuffled[0], shuffled, 0);
    },
    [playSong]
  );

  // 🔀 Shuffle by mood
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
  };

  return (
    <PlayerContext.Provider value={value}>
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="auto" />
      {children}
    </PlayerContext.Provider>
  );
}
