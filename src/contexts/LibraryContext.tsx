'use client';
// ============================================================
// Star Player — Library Context (Songs, Playlists, Search)
// ============================================================
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { SongMeta, Playlist, MoodCategory, Toast, ToastType } from '@/lib/types';
import * as db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

interface LibraryContextValue {
  // Songs
  songs: SongMeta[];
  loading: boolean;
  refreshSongs: () => Promise<void>;

  // Search & Filter
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  moodFilter: MoodCategory | null;
  setMoodFilter: (m: MoodCategory | null) => void;
  filteredSongs: SongMeta[];

  // Playlists
  playlists: Playlist[];
  refreshPlaylists: () => Promise<void>;
  createPlaylist: (name: string, description?: string) => Promise<Playlist>;
  deletePlaylist: (id: string) => Promise<void>;
  addSongsToPlaylist: (playlistId: string, songIds: string[]) => Promise<void>;
  removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
  reorderPlaylistSongs: (playlistId: string, startIndex: number, endIndex: number) => Promise<void>;
  reorderLibrarySongs: (startIndex: number, endIndex: number) => Promise<void>;

  // Import
  importFiles: (files: FileList | File[]) => Promise<void>;
  importing: boolean;
  importProgress: number;

  // Song operations
  deleteSong: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  updateSongMood: (id: string, mood: MoodCategory) => Promise<void>;
  generateLyrics: (id: string) => Promise<void>;
  fetchLyricsSilent: (songId: string, title: string, artist: string) => Promise<void>;

  // Cover art
  getCoverArtUrl: (songId: string) => Promise<string | null>;
  coverArtCache: Map<string, string>;

  // Toast
  toasts: Toast[];
  showToast: (type: ToastType, message: string) => void;
  dismissToast: (id: string) => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider');
  return ctx;
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [songs, setSongs] = useState<SongMeta[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [moodFilter, setMoodFilter] = useState<MoodCategory | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const coverArtCache = useRef(new Map<string, string>()).current;

  // Toast system
  const showToast = useCallback((type: ToastType, message: string) => {
    const toast: Toast = { id: uuidv4(), type, message, duration: 3000 };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, toast.duration);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const sortSongsByOrder = (songsArray: SongMeta[], orderArray?: string[]) => {
    if (!orderArray || orderArray.length === 0) return songsArray;
    const orderMap = new Map(orderArray.map((id, index) => [id, index]));
    return [...songsArray].sort((a, b) => {
      const idxA = orderMap.get(a.id);
      const idxB = orderMap.get(b.id);
      if (idxA !== undefined && idxB !== undefined) return idxA - idxB;
      if (idxA !== undefined) return -1;
      if (idxB !== undefined) return 1;
      return 0; // maintain relative order for new songs
    });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [songsData, playlistsData, settings] = await Promise.all([
        db.getAllSongsMeta(),
        db.getAllPlaylists(),
        db.getSettings()
      ]);
      setSongs(sortSongsByOrder(songsData, settings.libraryOrder));
      setPlaylists(playlistsData);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
    setLoading(false);
  };

  const refreshSongs = useCallback(async () => {
    const [songsData, settings] = await Promise.all([
      db.getAllSongsMeta(),
      db.getSettings()
    ]);
    setSongs(sortSongsByOrder(songsData, settings.libraryOrder));
  }, []);

  const reorderLibrarySongs = useCallback(async (startIndex: number, endIndex: number) => {
    setSongs(current => {
      const newSongs = [...current];
      const [removed] = newSongs.splice(startIndex, 1);
      newSongs.splice(endIndex, 0, removed);
      
      // Save order to DB
      const newOrder = newSongs.map(s => s.id);
      db.getSettings().then(settings => {
        db.saveSettings({ ...settings, libraryOrder: newOrder });
      });
      
      return newSongs;
    });
  }, []);

  const refreshPlaylists = useCallback(async () => {
    const playlistsData = await db.getAllPlaylists();
    setPlaylists(playlistsData);
  }, []);

  // Filtered songs
  const filteredSongs = songs.filter((song) => {
    const matchesSearch =
      !searchQuery ||
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.album.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMood = !moodFilter || song.mood === moodFilter;
    return matchesSearch && matchesMood;
  });

  // Import files
  const importFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter((f) =>
        ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/m4a', 'audio/mp4', 'audio/x-m4a', 'audio/aac'].includes(f.type) ||
        f.name.match(/\.(mp3|wav|ogg|flac|m4a|aac)$/i)
      );

      if (fileArray.length === 0) {
        showToast('warning', 'No valid audio files selected');
        return;
      }

      setImporting(true);
      setImportProgress(0);

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        try {
          const audioBlob = new Blob([await file.arrayBuffer()], { type: file.type || 'audio/mpeg' });

          // Extract metadata
          let title = file.name.replace(/\.[^/.]+$/, '');
          let artist = 'Unknown Artist';
          let album = 'Unknown Album';
          let duration = 0;
          let coverArt: Blob | null = null;

          try {
            const mm = await import('music-metadata-browser');
            const metadata = await mm.parseBlob(file);
            if (metadata.common.title) title = metadata.common.title;
            if (metadata.common.artist) artist = metadata.common.artist;
            if (metadata.common.album) album = metadata.common.album;
            if (metadata.format.duration) duration = metadata.format.duration;
            if (metadata.common.picture && metadata.common.picture.length > 0) {
              const pic = metadata.common.picture[0];
              coverArt = new Blob([new Uint8Array(pic.data)], { type: pic.format });
            }
          } catch {
            // Metadata extraction failed, use defaults
          }

          // Get duration from audio element if not from metadata
          if (!duration) {
            duration = await getAudioDuration(audioBlob);
          }

          const songId = uuidv4();
          const song = {
            id: songId,
            title,
            artist,
            album,
            duration,
            coverArt,
            audioData: audioBlob,
            genre: '',
            year: null,
            dateAdded: Date.now(),
            playCount: 0,
            favorite: false,
            bpm: null,
            mood: null,
            moodConfidence: null,
            audioFeatures: null,
            analyzed: false,
          };

          await db.addSong(song);

          // Auto-fetch lyrics in background
          fetchLyricsSilent(songId, title, artist);
        } catch (err) {
          console.error(`Failed to import ${file.name}:`, err);
        }

        setImportProgress(Math.round(((i + 1) / fileArray.length) * 100));
      }

      await refreshSongs();
      setImporting(false);
      showToast('success', `Imported ${fileArray.length} song${fileArray.length > 1 ? 's' : ''}`);
    },
    [refreshSongs]
  );

  // Get audio duration from blob
  async function getAudioDuration(blob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(blob);
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration || 0);
        URL.revokeObjectURL(audio.src);
      });
      audio.addEventListener('error', () => {
        resolve(0);
        URL.revokeObjectURL(audio.src);
      });
    });
  }

  // Song operations
  const deleteSongFn = useCallback(
    async (id: string) => {
      await db.deleteSong(id);
      coverArtCache.delete(id);
      await refreshSongs();
      await refreshPlaylists();
      showToast('info', 'Song deleted');
    },
    [refreshSongs, refreshPlaylists, coverArtCache]
  );

  const toggleFavoriteFn = useCallback(
    async (id: string) => {
      const isFav = await db.toggleFavorite(id);
      await refreshSongs();
      showToast('success', isFav ? 'Added to favorites' : 'Removed from favorites');
    },
    [refreshSongs]
  );

  const updateSongMood = useCallback(
    async (id: string, mood: MoodCategory) => {
      await db.updateSongMeta(id, { mood });
      await refreshSongs();
    },
    [refreshSongs]
  );

  // Silent lyrics fetcher — no toasts, used for auto-fetch after import/download
  const fetchLyricsSilent = useCallback(
    async (songId: string, title: string, artist: string) => {
      try {
        const response = await fetch('/api/lyrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, artist }),
        });
        if (!response.ok) return;
        const data = await response.json();
        if (data.lyrics) {
          await db.updateSongLyrics(songId, data.lyrics);
        }
      } catch {
        // Silently ignore — lyrics are optional
      }
    },
    []
  );

  const generateLyrics = useCallback(
    async (id: string) => {
      showToast('info', 'Searching for lyrics...');
      try {
        const song = songs.find(s => s.id === id);
        if (!song) throw new Error('Song not found');

        const response = await fetch('/api/lyrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: song.title,
            artist: song.artist,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate lyrics');
        }

        const data = await response.json();
        if (data.lyrics) {
          await db.updateSongLyrics(id, data.lyrics);
          await refreshSongs();
          showToast('success', 'Lyrics found!');
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (error: any) {
        console.error('Lyrics generation failed:', error);
        showToast('error', error.message || 'Lyrics generation failed');
        throw error;
      }
    },
    [songs, refreshSongs, showToast]
  );

  // Playlist operations
  const createPlaylist = useCallback(
    async (name: string, description = ''): Promise<Playlist> => {
      const playlist: Playlist = {
        id: uuidv4(),
        name,
        description,
        coverArt: null,
        songIds: [],
        dateCreated: Date.now(),
        dateModified: Date.now(),
      };
      await db.addPlaylist(playlist);
      await refreshPlaylists();
      showToast('success', `Created playlist "${name}"`);
      return playlist;
    },
    [refreshPlaylists]
  );

  const deletePlaylistFn = useCallback(
    async (id: string) => {
      await db.deletePlaylist(id);
      await refreshPlaylists();
      showToast('info', 'Playlist deleted');
    },
    [refreshPlaylists]
  );

  const addSongsToPlaylist = useCallback(
    async (playlistId: string, songIds: string[]) => {
      const playlist = await db.getPlaylist(playlistId);
      if (!playlist) return;
      const newIds = songIds.filter((id) => !playlist.songIds.includes(id));
      playlist.songIds = [...playlist.songIds, ...newIds];
      await db.updatePlaylist(playlist);
      await refreshPlaylists();
      showToast('success', `Added ${newIds.length} song${newIds.length > 1 ? 's' : ''} to playlist`);
    },
    [refreshPlaylists]
  );

  const removeSongFromPlaylist = useCallback(
    async (playlistId: string, songId: string) => {
      const playlist = await db.getPlaylist(playlistId);
      if (!playlist) return;
      playlist.songIds = playlist.songIds.filter((id) => id !== songId);
      await db.updatePlaylist(playlist);
      await refreshPlaylists();
    },
    [refreshPlaylists]
  );

  const reorderPlaylistSongs = useCallback(
    async (playlistId: string, startIndex: number, endIndex: number) => {
      const playlist = await db.getPlaylist(playlistId);
      if (!playlist) return;
      
      const newSongIds = Array.from(playlist.songIds);
      const [removed] = newSongIds.splice(startIndex, 1);
      newSongIds.splice(endIndex, 0, removed);
      
      playlist.songIds = newSongIds;
      await db.updatePlaylist(playlist);
      await refreshPlaylists();
    },
    [refreshPlaylists]
  );

  // Cover art cache
  const getCoverArtUrl = useCallback(
    async (songId: string): Promise<string | null> => {
      if (coverArtCache.has(songId)) return coverArtCache.get(songId)!;
      const blob = await db.getSongCoverArt(songId);
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      coverArtCache.set(songId, url);
      return url;
    },
    [coverArtCache]
  );


  const value: LibraryContextValue = {
    songs,
    loading,
    refreshSongs,
    searchQuery,
    setSearchQuery,
    moodFilter,
    setMoodFilter,
    filteredSongs,
    playlists,
    refreshPlaylists,
    createPlaylist,
    deletePlaylist: deletePlaylistFn,
    addSongsToPlaylist,
    removeSongFromPlaylist,
    reorderPlaylistSongs,
    reorderLibrarySongs,
    importFiles,
    importing,
    importProgress,
    deleteSong: deleteSongFn,
    toggleFavorite: toggleFavoriteFn,
    updateSongMood,
    generateLyrics,
    fetchLyricsSilent,
    getCoverArtUrl,
    coverArtCache,
    toasts,
    showToast,
    dismissToast,
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}
