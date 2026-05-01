// ============================================================
// Star Player — IndexedDB Database Layer
// ============================================================
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Song, SongMeta, Playlist, AppSettings, DEFAULT_SETTINGS } from './types';

interface StarPlayerDB extends DBSchema {
  songs: {
    key: string;
    value: Song;
    indexes: {
      'by-title': string;
      'by-artist': string;
      'by-dateAdded': number;
      'by-mood': string;
      'by-favorite': number;
    };
  };
  playlists: {
    key: string;
    value: Playlist;
    indexes: {
      'by-dateCreated': number;
    };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
}

const DB_NAME = 'star-player-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<StarPlayerDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<StarPlayerDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<StarPlayerDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Songs store
      const songStore = db.createObjectStore('songs', { keyPath: 'id' });
      songStore.createIndex('by-title', 'title');
      songStore.createIndex('by-artist', 'artist');
      songStore.createIndex('by-dateAdded', 'dateAdded');
      songStore.createIndex('by-mood', 'mood');
      songStore.createIndex('by-favorite', 'favorite');

      // Playlists store
      const playlistStore = db.createObjectStore('playlists', { keyPath: 'id' });
      playlistStore.createIndex('by-dateCreated', 'dateCreated');

      // Settings store
      db.createObjectStore('settings');
    },
  });

  return dbInstance;
}

// ---- Song CRUD ----

export async function addSong(song: Song): Promise<void> {
  const db = await getDB();
  await db.put('songs', song);
}

export async function getSong(id: string): Promise<Song | undefined> {
  const db = await getDB();
  return db.get('songs', id);
}

export async function deleteSong(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('songs', id);
  // Also remove from all playlists
  const playlists = await getAllPlaylists();
  for (const pl of playlists) {
    if (pl.songIds.includes(id)) {
      pl.songIds = pl.songIds.filter((sid) => sid !== id);
      await updatePlaylist(pl);
    }
  }
}

export async function getAllSongsMeta(): Promise<SongMeta[]> {
  const db = await getDB();
  const songs = await db.getAll('songs');
  return songs.map(songToMeta);
}

export async function getSongAudioData(id: string): Promise<Blob | undefined> {
  const db = await getDB();
  const song = await db.get('songs', id);
  return song?.audioData;
}

export async function getSongCoverArt(id: string): Promise<Blob | null | undefined> {
  const db = await getDB();
  const song = await db.get('songs', id);
  return song?.coverArt;
}

export async function updateSongMeta(
  id: string,
  updates: Partial<Omit<Song, 'id' | 'audioData' | 'coverArt'>>
): Promise<void> {
  const db = await getDB();
  const song = await db.get('songs', id);
  if (!song) return;
  const updatedSong = { ...song, ...updates };
  await db.put('songs', updatedSong);
}

export async function toggleFavorite(id: string): Promise<boolean> {
  const db = await getDB();
  const song = await db.get('songs', id);
  if (!song) return false;
  song.favorite = !song.favorite;
  await db.put('songs', song);
  return song.favorite;
}

export async function incrementPlayCount(id: string): Promise<void> {
  const db = await getDB();
  const song = await db.get('songs', id);
  if (!song) return;
  song.playCount += 1;
  await db.put('songs', song);
}

export async function getUnanalyzedSongs(): Promise<SongMeta[]> {
  const db = await getDB();
  const songs = await db.getAll('songs');
  return songs.filter((s) => !s.analyzed).map(songToMeta);
}

export async function updateSongAnalysis(
  id: string,
  analysis: {
    bpm: number;
    mood: Song['mood'];
    moodConfidence: number;
    audioFeatures: Song['audioFeatures'];
  }
): Promise<void> {
  const db = await getDB();
  const song = await db.get('songs', id);
  if (!song) return;
  song.bpm = analysis.bpm;
  song.mood = analysis.mood;
  song.moodConfidence = analysis.moodConfidence;
  song.audioFeatures = analysis.audioFeatures;
  song.analyzed = true;
  await db.put('songs', song);
}

export async function updateSongLyrics(id: string, lyrics: import('./types').LyricSegment[]): Promise<void> {
  const db = await getDB();
  const song = await db.get('songs', id);
  if (!song) return;
  song.lyrics = lyrics;
  await db.put('songs', song);
}

// ---- Playlist CRUD ----

export async function addPlaylist(playlist: Playlist): Promise<void> {
  const db = await getDB();
  await db.put('playlists', playlist);
}

export async function getPlaylist(id: string): Promise<Playlist | undefined> {
  const db = await getDB();
  return db.get('playlists', id);
}

export async function getAllPlaylists(): Promise<Playlist[]> {
  const db = await getDB();
  return db.getAll('playlists');
}

export async function updatePlaylist(playlist: Playlist): Promise<void> {
  const db = await getDB();
  playlist.dateModified = Date.now();
  await db.put('playlists', playlist);
}

export async function deletePlaylist(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('playlists', id);
}

// ---- Settings ----

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const settings = await db.get('settings', 'app');
  if (!settings) {
    const { DEFAULT_SETTINGS } = await import('./types');
    return { ...DEFAULT_SETTINGS };
  }
  return settings;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', settings, 'app');
}

// ---- Helpers ----

function songToMeta(song: Song): SongMeta {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    album: song.album,
    duration: song.duration,
    genre: song.genre,
    year: song.year,
    dateAdded: song.dateAdded,
    playCount: song.playCount,
    favorite: song.favorite,
    bpm: song.bpm,
    mood: song.mood,
    moodConfidence: song.moodConfidence,
    analyzed: song.analyzed,
    hasCoverArt: song.coverArt !== null,
    hasLyrics: !!song.lyrics && song.lyrics.length > 0,
  };
}

export async function getStorageEstimate(): Promise<{ usage: number; quota: number }> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return { usage: estimate.usage || 0, quota: estimate.quota || 0 };
  }
  return { usage: 0, quota: 0 };
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await db.clear('songs');
  await db.clear('playlists');
  await db.clear('settings');
}
