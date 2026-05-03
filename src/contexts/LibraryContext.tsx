'use client';
// ============================================================
// Star Player — Library Context (Songs, Playlists, Search)
// ============================================================
import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
  fetchCoverArtSilent: (songId: string, title: string, artist: string) => Promise<void>;

  // Cover art
  getCoverArtUrl: (songId: string) => Promise<string | null>;
  coverArtCache: Map<string, string>;

  // Toast
  toasts: Toast[];
  showToast: (type: ToastType, message: string) => void;
  dismissToast: (id: string) => void;

  // Selection
  isSelectionMode: boolean;
  setSelectionMode: (val: boolean) => void;
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  toggleSelection: (id: string, multi?: boolean, range?: boolean) => void;
  clearSelection: () => void;
  selectAll: (ids: string[]) => void;

  // Global Modals
  isCreatePlaylistModalOpen: boolean;
  openCreatePlaylistModal: () => void;
  closeCreatePlaylistModal: () => void;

  // Global Error Popup
  showErrorPopup: (title: string, message: string, toastOnClose?: string) => void;
  errorModal: { isOpen: boolean; title: string; message: string; toastOnClose?: string };
  closeErrorPopup: () => void;

  // View Mode
  viewMode: 'list' | 'grid';
  setViewMode: (mode: 'list' | 'grid') => void;
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
  const [isSelectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCreatePlaylistModalOpen, setCreatePlaylistModalOpen] = useState(false);
  const [viewMode, setViewModeState] = useState<'list' | 'grid'>('list');
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

  // Global Error Modal
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string; toastOnClose?: string }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const showErrorPopup = useCallback((title: string, message: string, toastOnClose?: string) => {
    setErrorModal({ isOpen: true, title, message, toastOnClose });
  }, []);

  const closeErrorPopup = useCallback(() => {
    const { toastOnClose } = errorModal;
    setErrorModal((prev) => ({ ...prev, isOpen: false }));
    if (toastOnClose) {
      showToast('error', toastOnClose);
    }
  }, [errorModal, showToast]);

  // Selection Logic
  const toggleSelection = useCallback((id: string, multi = false, range = false) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (multi) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      } else {
        if (next.has(id) && next.size === 1) next.clear();
        else {
          next.clear();
          next.add(id);
        }
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selectAll = useCallback((ids: string[]) => setSelectedIds(new Set(ids)), []);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const openCreatePlaylistModal = useCallback(() => setCreatePlaylistModalOpen(true), []);
  const closeCreatePlaylistModal = useCallback(() => setCreatePlaylistModalOpen(false), []);

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
      if (settings.viewMode) setViewModeState(settings.viewMode);
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
  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      const matchesSearch =
        !searchQuery ||
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.album.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMood = !moodFilter || song.mood === moodFilter;
      return matchesSearch && matchesMood;
    });
  }, [songs, searchQuery, moodFilter]);

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
          
          // Try to split filename to get a fallback artist but keep the full title
          const separators = [' - ', ' – ', ' — ', ' -'];
          for (const sep of separators) {
            if (title.includes(sep)) {
              const parts = title.split(sep);
              artist = parts[0].trim();
              // Note: We keep the title as the full filename (without extension) 
              // as requested, so we don't re-assign it here.
              break;
            }
          }
          let album = 'Unknown Album';
          let duration = 0;
          let coverArt: Blob | null = null;

          try {
            const mm = await import('music-metadata-browser');
            const metadata = await mm.parseBlob(file);

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
            source: 'upload' as const,
          };

          await db.addSong(song);

          // Auto-fetch lyrics and cover art in background
          fetchLyricsSilent(songId, title, artist);
          if (!coverArt) {
            fetchCoverArtSilent(songId, title, artist);
          }
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
      showToast('playlist', 'Song deleted');
    },
    [refreshSongs, refreshPlaylists, coverArtCache]
  );

  const toggleFavoriteFn = useCallback(
    async (id: string) => {
      const isFav = await db.toggleFavorite(id);
      await refreshSongs();
      showToast('favorite', isFav ? 'Added to favorites' : 'Removed from favorites');
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
          
          // Auto-identify artist/title if they were unknown
          const song = await db.getSong(songId);
          if (song && (song.artist === 'Unknown Artist' || song.artist === 'YouTube')) {
            const updates: any = {};
            if (data.artist) updates.artist = data.artist;
            if (data.title && (song.title.toLowerCase().includes('track') || song.title.length < 3)) {
               updates.title = data.title;
            }
            
            if (Object.keys(updates).length > 0) {
              await db.updateSongMeta(songId, updates);
              await refreshSongs();
              
              // If metadata improved, try fetching cover art again
              const currentSong = await db.getSong(songId);
              if (currentSong && !currentSong.coverArt) {
                fetchCoverArtSilent(songId, updates.title || song.title, updates.artist || song.artist);
              }
            }
          }
        }
      } catch {
        // Silently ignore — lyrics are optional
      }
    },
    [refreshSongs]
  );

  const fetchCoverArtSilent = useCallback(
    async (songId: string, title: string, artist: string) => {
      try {
        const response = await fetch('/api/cover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, artist }),
        });
        
        if (!response.ok) return;
        const data = await response.json();
        
        if (data.artworkUrl) {
          const imgRes = await fetch(data.artworkUrl);
          if (imgRes.ok) {
            const blob = await imgRes.blob();
            await db.updateSongMeta(songId, { coverArt: blob } as any);
            coverArtCache.delete(songId); // Clear cache to force refresh
            await refreshSongs();
          }
        }
      } catch (err) {
        console.error('Failed to auto-fetch cover art:', err);
      }
    },
    [refreshSongs, coverArtCache]
  );

  const generateLyrics = useCallback(
    async (id: string) => {
      const song = songs.find(s => s.id === id);
      showToast('info', 'Searching for lyrics...');
      try {
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
        showErrorPopup(
          'Lyrics Not Found', 
          error.message || 'The song may not be in the lyrics database yet. Try cleaning the title or artist name manually.',
          `Failed: ${song?.title || 'Unknown Song'}`
        );
        throw error;
      }
    },
    [songs, refreshSongs, showErrorPopup]
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
      showToast('playlist', `Created playlist "${name}"`);
      return playlist;
    },
    [refreshPlaylists]
  );

  const deletePlaylistFn = useCallback(
    async (id: string) => {
      await db.deletePlaylist(id);
      await refreshPlaylists();
      showToast('playlist', 'Playlist deleted');
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
      showToast('playlist', `Added ${newIds.length} song${newIds.length > 1 ? 's' : ''} to playlist`);
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
  
  const setViewMode = useCallback(async (mode: 'list' | 'grid') => {
    setViewModeState(mode);
    const settings = await db.getSettings();
    await db.saveSettings({ ...settings, viewMode: mode });
  }, []);

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
    fetchCoverArtSilent,
    getCoverArtUrl,
    coverArtCache,
    toasts,
    showToast,
    dismissToast,
    showErrorPopup,
    errorModal,
    closeErrorPopup,
    selectedIds,
    setSelectedIds,
    isSelectionMode,
    setSelectionMode,
    toggleSelection,
    clearSelection,
    selectAll,
    isCreatePlaylistModalOpen,
    openCreatePlaylistModal,
    closeCreatePlaylistModal,
    viewMode,
    setViewMode,
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}
